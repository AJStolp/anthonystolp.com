import { createHash } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

// The suite always starts its own dev server, on a port worked out from this
// worktree's absolute path: 3100 plus a hash of the path. Two worktrees get two
// ports, so a run in one can never land on the other's `bun dev` on 3000 and
// grade that worktree's pages against this branch. It never reuses a
// server it finds: if the port is already taken, Playwright stops with
// "already used" instead of testing whatever answers there. That includes your
// own `bun dev`; stop it, or point PLAYWRIGHT_BASE_URL at it on purpose.
//
// The port is put in process.env so Playwright's worker processes, which load
// this file again, read the same number rather than working it out afresh.
//
// It deliberately starts nothing when PLAYWRIGHT_BASE_URL is set: a run against
// production must talk to production, and quietly booting a local Next beside
// it would be the worst of both.
//
// To run against production:
//   PLAYWRIGHT_BASE_URL=https://anthonystolp.com bunx playwright test
// Production runs will create real funnel_leads rows + send real Resend
// notification emails. Delete the test rows from /admin/leads afterward.
//
// The admin login test spends 2 of the 5 attempts that /api/admin/login
// allows per IP per 15 minutes (src/app/api/admin/login/route.ts). Running
// the whole suite more than twice inside that window trips the limiter and
// that one test fails with "Too many requests" — brute-force protection
// working, not a regression. Wait out the window, or use
// `--grep-invert "admin redirects"` while iterating on other tests.
function worktreePort(dir: string): number {
  return 3100 + (createHash("sha256").update(dir).digest().readUInt32BE(0) % 900);
}

process.env.PLAYWRIGHT_E2E_PORT ??= String(worktreePort(__dirname));
const port = Number(process.env.PLAYWRIGHT_E2E_PORT);
const ownServer = process.env.PLAYWRIGHT_BASE_URL === undefined;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Detects whether the home-value funnel is live on the target server, so the
  // flag-gated tests skip rather than fail. See tests/e2e/global-setup.ts.
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,             // dev server is shared; serialize
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  // Only when PLAYWRIGHT_BASE_URL is unset. See the note at the top.
  webServer: ownServer
    ? {
        command: "bun run dev",
        url: baseURL,
        env: { PORT: String(port) },
        reuseExistingServer: false,
        // A cold Next dev server compiles on first request, and this suite's
        // first request is its slowest.
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
      }
    : undefined,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 8_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
