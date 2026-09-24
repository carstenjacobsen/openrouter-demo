import "dotenv/config";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey || apiKey === "your-openrouter-api-key-here") {
  console.error(
    "Missing OPENROUTER_API_KEY. Set it in the .env file before running the chatbot."
  );
  process.exit(1);
}

export const modelId = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

const openrouter = createOpenRouter({ apiKey });
export const model = openrouter.chat(modelId);
