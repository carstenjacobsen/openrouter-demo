import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";
import { streamText, type ModelMessage, type ProviderMetadata } from "ai";
import { model, modelId } from "./model.js";
import { appendSessionRow } from "./sessionLog.js";
import { computeStats } from "./stats.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");

const port = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());
app.use(express.static(publicDir));

type SessionStats = {
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  models: Set<string>;
  providers: Set<string>;
};

const sessionStats = new Map<string, SessionStats>();

function extractOpenRouterUsage(providerMetadata: ProviderMetadata | undefined): {
  cost: number;
  provider: string | undefined;
} {
  const meta = providerMetadata?.openrouter as Record<string, unknown> | undefined;
  if (!meta) return { cost: 0, provider: undefined };

  const usage = meta.usage as Record<string, unknown> | undefined;
  const cost = typeof usage?.cost === "number" ? usage.cost : 0;
  const provider = typeof meta.provider === "string" ? meta.provider : undefined;

  return { cost, provider };
}

app.get("/api/model", (_req: Request, res: Response) => {
  res.json({ model: modelId });
});

app.get("/api/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await computeStats();
    res.json(stats);
  } catch (error) {
    console.error("Failed to compute stats:", error);
    res.status(500).json({ error: "Failed to compute stats" });
  }
});

app.get("/stats", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, "stats.html"));
});

app.post("/api/chat", async (req: Request, res: Response) => {
  const history = req.body?.messages;
  const sessionId = req.body?.session_id;

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    res.status(400).json({ error: "session_id is required" });
    return;
  }
  if (!Array.isArray(history) || history.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const messages: ModelMessage[] = history;

  try {
    const result = streamText({
      model,
      system: "You are a helpful, concise assistant.",
      messages,
      providerOptions: {
        openrouter: {
          session_id: sessionId,
          usage: { include: true },
        },
      },
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    for await (const chunk of result.textStream) {
      res.write(chunk);
    }
    res.end();

    const [usage, finalStep] = await Promise.all([result.usage, result.finalStep]);
    const { cost, provider } = extractOpenRouterUsage(finalStep.providerMetadata);
    const modelUsed = finalStep.response.modelId;

    const stats = sessionStats.get(sessionId) ?? {
      requestCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      models: new Set<string>(),
      providers: new Set<string>(),
    };
    stats.requestCount += 1;
    stats.inputTokens += usage.inputTokens ?? 0;
    stats.outputTokens += usage.outputTokens ?? 0;
    stats.totalTokens += usage.totalTokens ?? 0;
    stats.costUsd += cost;
    stats.models.add(modelUsed);
    if (provider) stats.providers.add(provider);
    sessionStats.set(sessionId, stats);

    console.log(
      `[chat] session=${sessionId} call#${stats.requestCount} model=${modelUsed} provider=${provider ?? "?"} ` +
        `cost=$${cost.toFixed(6)} tokens(in=${usage.inputTokens ?? 0} out=${usage.outputTokens ?? 0} total=${usage.totalTokens ?? 0}) ` +
        `sessionTotal(cost=$${stats.costUsd.toFixed(6)} tokens=${stats.totalTokens})`
    );
  } catch (error) {
    console.error("Chat request failed:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate a response" });
    } else {
      res.end();
    }
  }
});

app.post("/api/feedback", async (req: Request, res: Response) => {
  const { rating, messageCount, session_id: sessionId } = req.body ?? {};

  if (rating !== "up" && rating !== "down") {
    res.status(400).json({ error: 'rating must be "up" or "down"' });
    return;
  }
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    res.status(400).json({ error: "session_id is required" });
    return;
  }

  const stats = sessionStats.get(sessionId);

  try {
    await appendSessionRow({
      sessionId,
      endedAt: new Date().toISOString(),
      vote: rating,
      messageCount: typeof messageCount === "number" ? messageCount : 0,
      requestCount: stats?.requestCount ?? 0,
      models: stats ? Array.from(stats.models) : [],
      providers: stats ? Array.from(stats.providers) : [],
      inputTokens: stats?.inputTokens ?? 0,
      outputTokens: stats?.outputTokens ?? 0,
      totalTokens: stats?.totalTokens ?? 0,
      totalCostUsd: stats?.costUsd ?? 0,
    });

    console.log(
      `[session] session=${sessionId} ended rating=${rating} messages=${messageCount ?? "?"} ` +
        `requests=${stats?.requestCount ?? 0} cost=$${(stats?.costUsd ?? 0).toFixed(6)} ` +
        `models=${stats ? Array.from(stats.models).join(";") : ""} logged to CSV`
    );
  } catch (error) {
    console.error("Failed to write session CSV row:", error);
  }

  sessionStats.delete(sessionId);

  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`OpenRouter chat UI running at http://localhost:${port} (model: ${modelId})`);
});
