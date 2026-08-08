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

// NEXT_PUBLIC_HOME_VALUE_ENABLED is inlined at build time, so the value in
// .env.local does not reliably describe the server the suite is pointed at:
// it can be overridden on the dev command, and production is built
// separately. Reading the env var here would therefore be a guess.
//
// Probe the running server instead. Nav renders href="/home-value" only when
// the flag is on (src/components/Nav.tsx) — with it off the Sell link points
// at the contact fallback — so its presence on "/" is an exact signal.
export default async function globalSetup(config: FullConfig) {
  loadEnvLocal();

  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  let live = false;
  try {
    const res = await fetch(baseURL);
    live = (await res.text()).includes('href="/home-value"');
  } catch {
    // Server unreachable. Leave it off: the flag-gated tests skip, and every
    // other test fails loudly on its own, which is the signal we want.
  }

  process.env.HOME_VALUE_LIVE = live ? "true" : "false";
  console.log(
    `[global-setup] home-value funnel is ${live ? "ON" : "OFF"} at ${baseURL}`,
  );
}
