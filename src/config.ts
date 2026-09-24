import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultCsvDir = path.join(__dirname, "../data");

const csvDir = process.env.CSV_LOG_DIR
  ? path.resolve(process.cwd(), process.env.CSV_LOG_DIR)
  : defaultCsvDir;

export const csvLogPath = path.join(csvDir, "session-log.csv");
