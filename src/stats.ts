import { promises as fs } from "node:fs";
import { csvLogPath } from "./config.js";

type SessionRow = {
  sessionId: string;
  endedAt: string;
  vote: "up" | "down";
  messageCount: number;
  requestCount: number;
  models: string[];
  providers: string[];
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
};

export type ModelStats = {
  model: string;
  sessionCount: number;
  totalCostUsd: number;
  avgCostUsdPerSession: number;
  totalTokens: number;
  avgTotalTokensPerSession: number;
  votesUp: number;
  votesDown: number;
  voteUpPct: number;
  costPerUpvoteUsd: number | null;
};

export type StatsSummary = {
  sessionCount: number;
  totalCostUsd: number;
  totalTokens: number;
  avgTotalTokensPerSession: number;
  votesUp: number;
  votesDown: number;
  voteUpPct: number;
  byModel: ModelStats[];
};

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // skip; \n handles the line break
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

async function readSessionRows(): Promise<SessionRow[]> {
  let content: string;
  try {
    content = await fs.readFile(csvLogPath, "utf8");
  } catch {
    return [];
  }

  const rows = parseCsv(content);
  if (rows.length <= 1) return [];

  const [, ...dataRows] = rows;

  return dataRows.map((cols) => ({
    sessionId: cols[0] ?? "",
    endedAt: cols[1] ?? "",
    vote: cols[2] === "down" ? "down" : "up",
    messageCount: Number(cols[3]) || 0,
    requestCount: Number(cols[4]) || 0,
    models: cols[5] ? cols[5].split(";").filter(Boolean) : [],
    providers: cols[6] ? cols[6].split(";").filter(Boolean) : [],
    inputTokens: Number(cols[7]) || 0,
    outputTokens: Number(cols[8]) || 0,
    totalTokens: Number(cols[9]) || 0,
    totalCostUsd: Number(cols[10]) || 0,
  }));
}

export async function computeStats(): Promise<StatsSummary> {
  const sessions = await readSessionRows();

  const modelMap = new Map<
    string,
    { sessionCount: number; totalCostUsd: number; totalTokens: number; votesUp: number; votesDown: number }
  >();

  let totalCostUsd = 0;
  let totalTokens = 0;
  let votesUp = 0;
  let votesDown = 0;

  for (const session of sessions) {
    totalCostUsd += session.totalCostUsd;
    totalTokens += session.totalTokens;
    if (session.vote === "up") votesUp++;
    else votesDown++;

    const models = session.models.length > 0 ? session.models : ["(unknown)"];
    for (const model of models) {
      const entry = modelMap.get(model) ?? {
        sessionCount: 0,
        totalCostUsd: 0,
        totalTokens: 0,
        votesUp: 0,
        votesDown: 0,
      };
      entry.sessionCount += 1;
      entry.totalCostUsd += session.totalCostUsd;
      entry.totalTokens += session.totalTokens;
      if (session.vote === "up") entry.votesUp += 1;
      else entry.votesDown += 1;
      modelMap.set(model, entry);
    }
  }

  const byModel: ModelStats[] = Array.from(modelMap.entries())
    .map(([model, entry]) => {
      const voteTotal = entry.votesUp + entry.votesDown;
      return {
        model,
        sessionCount: entry.sessionCount,
        totalCostUsd: entry.totalCostUsd,
        avgCostUsdPerSession: entry.sessionCount > 0 ? entry.totalCostUsd / entry.sessionCount : 0,
        totalTokens: entry.totalTokens,
        avgTotalTokensPerSession: entry.sessionCount > 0 ? entry.totalTokens / entry.sessionCount : 0,
        votesUp: entry.votesUp,
        votesDown: entry.votesDown,
        voteUpPct: voteTotal > 0 ? (entry.votesUp / voteTotal) * 100 : 0,
        costPerUpvoteUsd: entry.votesUp > 0 ? entry.totalCostUsd / entry.votesUp : null,
      };
    })
    .sort((a, b) => b.sessionCount - a.sessionCount);

  const voteTotal = votesUp + votesDown;

  return {
    sessionCount: sessions.length,
    totalCostUsd,
    totalTokens,
    avgTotalTokensPerSession: sessions.length > 0 ? totalTokens / sessions.length : 0,
    votesUp,
    votesDown,
    voteUpPct: voteTotal > 0 ? (votesUp / voteTotal) * 100 : 0,
    byModel,
  };
}
