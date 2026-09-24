const messagesEl = document.getElementById("messages");
let emptyStateEl = document.getElementById("empty-state");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const modelBadge = document.getElementById("model-badge");
const endChatBtn = document.getElementById("end-chat-btn");
const feedbackModal = document.getElementById("feedback-modal");
const thumbUpBtn = document.getElementById("thumb-up");
const thumbDownBtn = document.getElementById("thumb-down");
const modalCancelBtn = document.getElementById("modal-cancel");
const modalConfirmBtn = document.getElementById("modal-confirm");

const history = [];
let selectedRating = null;
let chatEnded = false;
let sessionId = crypto.randomUUID();

fetch("/api/model")
  .then((res) => res.json())
  .then((data) => {
    modelBadge.textContent = data.model;
  })
  .catch(() => {
    modelBadge.textContent = "";
  });

function renderMessage(role, content) {
  emptyStateEl?.remove();
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = content;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function setBusy(busy) {
  sendBtn.disabled = busy || chatEnded;
  input.disabled = busy || chatEnded;
}

async function sendMessage(text) {
  if (chatEnded) return;

  history.push({ role: "user", content: text });
  renderMessage("user", text);

  setBusy(true);
  const assistantEl = renderMessage("assistant", "");
  assistantEl.classList.add("pending");
  let assistantText = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, messages: history }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      assistantText += decoder.decode(value, { stream: true });
      assistantEl.textContent = assistantText;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    history.push({ role: "assistant", content: assistantText });
  } catch (error) {
    console.error(error);
    assistantEl.textContent = "Sorry, something went wrong getting a response.";
  } finally {
    assistantEl.classList.remove("pending");
    setBusy(false);
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  input.style.height = "auto";
  sendMessage(text);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight}px`;
});

function openModal() {
  selectedRating = null;
  thumbUpBtn.classList.remove("selected");
  thumbDownBtn.classList.remove("selected");
  thumbUpBtn.setAttribute("aria-pressed", "false");
  thumbDownBtn.setAttribute("aria-pressed", "false");
  modalConfirmBtn.disabled = true;
  feedbackModal.classList.remove("hidden");
}

function closeModal() {
  feedbackModal.classList.add("hidden");
}

function selectRating(rating) {
  selectedRating = rating;
  thumbUpBtn.classList.toggle("selected", rating === "up");
  thumbDownBtn.classList.toggle("selected", rating === "down");
  thumbUpBtn.setAttribute("aria-pressed", String(rating === "up"));
  thumbDownBtn.setAttribute("aria-pressed", String(rating === "down"));
  modalConfirmBtn.disabled = false;
}

function showEndedState() {
  chatEnded = true;
  messagesEl.innerHTML = "";

  const banner = document.createElement("div");
  banner.className = "ended-banner";

  const message = document.createElement("p");
  message.textContent = "Chat ended. Thanks for your feedback!";
  banner.appendChild(message);

  const newChatBtn = document.createElement("button");
  newChatBtn.type = "button";
  newChatBtn.className = "btn-primary";
  newChatBtn.textContent = "Start New Chat";
  newChatBtn.addEventListener("click", resetChat);
  banner.appendChild(newChatBtn);

  messagesEl.appendChild(banner);

  input.disabled = true;
  sendBtn.disabled = true;
  input.placeholder = "Chat ended";
  endChatBtn.disabled = true;
}

function resetChat() {
  chatEnded = false;
  sessionId = crypto.randomUUID();
  history.length = 0;
  messagesEl.innerHTML = "";

  emptyStateEl = document.createElement("div");
  emptyStateEl.className = "empty-state";
  emptyStateEl.id = "empty-state";
  emptyStateEl.textContent = "Say hello to start the conversation.";
  messagesEl.appendChild(emptyStateEl);

  input.disabled = false;
  sendBtn.disabled = false;
  input.placeholder = "Type a message...";
  endChatBtn.disabled = false;
  input.focus();
}

async function endChat(rating) {
  closeModal();

  try {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, rating, messageCount: history.length }),
    });
  } catch (error) {
    console.error("Failed to submit feedback:", error);
  }

  showEndedState();
}

endChatBtn.addEventListener("click", () => {
  if (chatEnded) return;
  openModal();
});

thumbUpBtn.addEventListener("click", () => selectRating("up"));
thumbDownBtn.addEventListener("click", () => selectRating("down"));

modalCancelBtn.addEventListener("click", closeModal);

modalConfirmBtn.addEventListener("click", () => {
  if (!selectedRating) return;
  endChat(selectedRating);
});

feedbackModal.addEventListener("click", (event) => {
  if (event.target === feedbackModal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !feedbackModal.classList.contains("hidden")) {
    closeModal();
  }
});
