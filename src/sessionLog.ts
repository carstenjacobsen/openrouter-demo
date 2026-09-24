import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, "../data/session-log.csv");

const CSV_HEADER =
  "session_id,ended_at,vote,message_count,request_count,models_used,providers_used,input_tokens,output_tokens,total_tokens,total_cost_usd";

export type SessionLogRow = {
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

function csvField(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function appendSessionRow(row: SessionLogRow): Promise<void> {
  await fs.mkdir(path.dirname(csvPath), { recursive: true });

  let fileExists = true;
  try {
    await fs.access(csvPath);
  } catch {
    fileExists = false;
  }

  const line = [
    row.sessionId,
    row.endedAt,
    row.vote,
    row.messageCount,
    row.requestCount,
    row.models.join(";"),
    row.providers.join(";"),
    row.inputTokens,
    row.outputTokens,
    row.totalTokens,
    row.totalCostUsd.toFixed(6),
  ]
    .map(csvField)
    .join(",");

  const content = fileExists ? `${line}\n` : `${CSV_HEADER}\n${line}\n`;
  await fs.appendFile(csvPath, content, "utf8");
}
