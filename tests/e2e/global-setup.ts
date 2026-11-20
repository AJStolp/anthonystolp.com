import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FullConfig } from "@playwright/test";

// Playwright does not read .env.local the way Next does, so tests that need a
// secret would otherwise have to hardcode it. Load the file here instead and
// never let a credential into the repo. Real env vars win, so CI can inject
// them without a file present.
function loadEnvLocal() {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return; // No file (CI). Whatever is already in the environment stands.
  }
  for (const line of raw.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, rest] = m;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rest.trim().replace(/^["']|["']$/g, "");
  }
}

export default async function globalSetup(_config: FullConfig) {
  loadEnvLocal();
}
