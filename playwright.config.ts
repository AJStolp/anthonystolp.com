import { defineConfig, devices } from "@playwright/test";

// The suite starts its own dev server when one is not already up, so
// `bun run test:e2e` works from nothing. If you already have `bun dev` running
// it reuses that rather than fighting it for port 3000.
//
// It deliberately starts nothing when pointed at another server: a run against
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
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL);

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
  // Only for a local target. See the note at the top.
  webServer: isLocal
    ? {
        command: "bun run dev",
        url: baseURL,
        reuseExistingServer: true,
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
