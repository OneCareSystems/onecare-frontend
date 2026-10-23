// Writes the chips as JSON for the Python QA suite (qa/data/chips.json). Run: npm run export-chips
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CHIPS } from "../src/components/chatbot/chips.js";

const target =
  process.argv[2] ??
  fileURLToPath(
    new URL("../../onecare-chatbot/qa/data/chips.json", import.meta.url),
  );
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(DEFAULT_CHIPS, null, 2) + "\n", "utf-8");
console.log(`chips written to ${target}`);
