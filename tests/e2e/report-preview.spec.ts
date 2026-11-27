import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

// The admin report editor's Preview tab renders whatever is in the HTML tab.
// This renders the real preview component into a blank page, so it needs no
// admin login and no market_reports row. If the report's onerror handler ever
// runs, it stamps the admin page's title; a sandboxed frame must not let it.
const HOSTILE_REPORT =
  `<p>Cedarburg median sale price held at $512,000.</p>` +
  `<img src="x" onerror="(window.top || window).document.title='XSS'">`;

// Playwright rewrites JSX in imported .tsx files for component testing, so the
// component is server rendered by bun in a child process instead.
function renderPreview(html: string): string {
  const editor = resolve(__dirname, "../../src/components/admin/ReportEditor.tsx");
  return execFileSync(
    "bun",
    [
      "--eval",
      `import { createElement } from "react";
       import { renderToStaticMarkup } from "react-dom/server";
       import { ReportPreview } from ${JSON.stringify(editor)};
       process.stdout.write(renderToStaticMarkup(createElement(ReportPreview, { html: process.env.REPORT_HTML })));`,
    ],
    { encoding: "utf8", env: { ...process.env, REPORT_HTML: html } },
  );
}

test("a report with an img onerror handler previews inert", async ({ page }) => {
  await page.setContent(
    `<!doctype html><title>admin</title><body>${renderPreview(HOSTILE_REPORT)}</body>`,
  );

  // Wait until the broken image has failed to load, in whichever document it
  // ended up in, so its onerror handler has had its chance to run.
  await expect
    .poll(async () => {
      const done = await Promise.all(
        page.frames().map((f) =>
          f.evaluate(() => {
            const img = document.querySelector('img[src="x"]');
            return img instanceof HTMLImageElement && img.complete;
          }),
        ),
      );
      return done.includes(true);
    })
    .toBe(true);
  await page.waitForTimeout(250);
  expect(await page.title()).toBe("admin");

  // The report is really shown, image and all, so an empty stub cannot pass.
  const frame = page.frameLocator('iframe[title="Report preview"]');
  await expect(frame.getByText("Cedarburg median sale price held at $512,000.")).toBeVisible();
  await expect(frame.locator('img[src="x"]')).toHaveCount(1);
});
