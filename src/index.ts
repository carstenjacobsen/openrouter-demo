import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { streamText, type ModelMessage } from "ai";
import { model, modelId } from "./model.js";

const messages: ModelMessage[] = [];

const rl = createInterface({ input: stdin, output: stdout });

console.log(`OpenRouter chatbot (model: ${modelId})`);
console.log('Type your message and press Enter. Type "exit" to quit.\n');

async function chatLoop(): Promise<void> {
  while (true) {
    const userInput = await rl.question("You: ");

    if (userInput.trim().toLowerCase() === "exit") {
      break;
    }
    if (userInput.trim() === "") {
      continue;
    }

    messages.push({ role: "user", content: userInput });

    stdout.write("Bot: ");
    const result = streamText({ model, messages });

    let assistantReply = "";
    for await (const chunk of result.textStream) {
      assistantReply += chunk;
      stdout.write(chunk);
    }
    stdout.write("\n\n");

    messages.push({ role: "assistant", content: assistantReply });
  }

  rl.close();
  console.log("Goodbye!");
}

chatLoop().catch((error) => {
  console.error("Chat loop failed:", error);
  process.exit(1);
});
