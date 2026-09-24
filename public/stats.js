const loadingEl = document.getElementById("stats-loading");
const emptyEl = document.getElementById("stats-empty");
const contentEl = document.getElementById("stats-content");
const summaryCardsEl = document.getElementById("summary-cards");
const tableHeadRowEl = document.getElementById("stats-table-head-row");
const tableBodyEl = document.getElementById("stats-table-body");

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatCost(value) {
  return currencyFormatter.format(value);
}

function formatTokens(value) {
  return numberFormatter.format(value);
}

function renderSummaryCards(stats) {
  const cards = [
    { label: "Sessions", value: numberFormatter.format(stats.sessionCount) },
    { label: "Total Cost", value: formatCost(stats.totalCostUsd) },
    { label: "Total Tokens", value: formatTokens(stats.totalTokens) },
    { label: "Avg Tokens / Session", value: formatTokens(stats.avgTotalTokensPerSession) },
    { label: "Votes Up", value: `${stats.voteUpPct.toFixed(0)}%` },
  ];

  summaryCardsEl.innerHTML = "";
  for (const card of cards) {
    const el = document.createElement("div");
    el.className = "summary-card";
    el.innerHTML = `<div class="summary-card-label">${card.label}</div><div class="summary-card-value">${card.value}</div>`;
    summaryCardsEl.appendChild(el);
  }
}

const MODEL_METRICS = [
  { label: "Sessions", format: (m) => numberFormatter.format(m.sessionCount) },
  { label: "Total Cost", format: (m) => formatCost(m.totalCostUsd) },
  { label: "Avg Cost / Session", format: (m) => formatCost(m.avgCostUsdPerSession) },
  { label: "Total Tokens", format: (m) => formatTokens(m.totalTokens) },
  { label: "Avg Tokens / Session", format: (m) => formatTokens(m.avgTotalTokensPerSession) },
  {
    label: "Votes Up %",
    format: (m) => `${m.voteUpPct.toFixed(0)}% (${m.votesUp}/${m.votesUp + m.votesDown})`,
  },
  {
    label: "Cost / Upvote",
    format: (m) => (m.costPerUpvoteUsd === null ? "—" : formatCost(m.costPerUpvoteUsd)),
  },
];

function renderModelTable(byModel) {
  tableHeadRowEl.innerHTML = "";
  tableBodyEl.innerHTML = "";

  const cornerTh = document.createElement("th");
  cornerTh.textContent = "Metric";
  cornerTh.className = "metric-label";
  tableHeadRowEl.appendChild(cornerTh);

  for (const row of byModel) {
    const th = document.createElement("th");
    th.textContent = row.model;
    tableHeadRowEl.appendChild(th);
  }

  for (const metric of MODEL_METRICS) {
    const tr = document.createElement("tr");

    const labelTd = document.createElement("td");
    labelTd.textContent = metric.label;
    labelTd.className = "metric-label";
    tr.appendChild(labelTd);

    for (const row of byModel) {
      const td = document.createElement("td");
      td.textContent = metric.format(row);
      tr.appendChild(td);
    }

    tableBodyEl.appendChild(tr);
  }
}

async function loadStats() {
  try {
    const response = await fetch("/api/stats");
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    const stats = await response.json();

    loadingEl.classList.add("hidden");

    if (stats.sessionCount === 0) {
      emptyEl.classList.remove("hidden");
      return;
    }

    renderSummaryCards(stats);
    renderModelTable(stats.byModel);
    contentEl.classList.remove("hidden");
  } catch (error) {
    console.error(error);
    loadingEl.textContent = "Failed to load stats.";
  }
}

loadStats();
