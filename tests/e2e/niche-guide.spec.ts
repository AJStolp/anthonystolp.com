import { test, expect, type Page } from "@playwright/test";

// A city page with body copy keeps its city treatment; only a page marked
// is_guide gets the guide treatment (Article schema, "Common questions", the
// legal and tax disclaimer).
//
// These read fixture rows from src/lib/niche-page-fixtures.ts, which only the
// local dev server serves. The live rows are AJ's content and can change under
// the test, and the page reads them server side where Playwright cannot
// intercept. The fixtures prove the rendering branch on is_guide, not that the
// database returns is_guide.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL);

const DISCLAIMER = /not legal or tax advice/i;

async function schemaTypes(page: Page): Promise<string[]> {
  const scripts = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return scripts.flatMap((s) => {
    const doc = JSON.parse(s) as { "@graph"?: { "@type": string }[] };
    return (doc["@graph"] ?? []).map((n) => n["@type"]);
  });
}

test.describe("Niche pages: city page with body vs guide", () => {
  test.skip(!isLocal, "fixture rows are served by the local dev server only");

  test("city page with body renders its body and none of the guide treatment", async ({
    page,
  }) => {
    const res = await page.goto("/search/e2e-fixture-city");
    expect(res?.status()).toBe(200);

    const main = page.locator("main");
    await expect(
      main.getByRole("heading", { level: 2, name: "Fixture city body heading" }),
    ).toBeVisible();
    await expect(main.getByText("Fixture city body paragraph.")).toBeVisible();
    await expect(
      main.getByRole("heading", { level: 2, name: "Fixture city second heading" }),
    ).toBeVisible();

    // Body sits between the button and the market snapshot, and the FAQ
    // heading is the city one.
    const h2s = (await main.locator("h2").allTextContents()).map((t) => t.trim());
    expect(h2s.slice(0, 4)).toEqual([
      "Fixture city body heading",
      "Fixture city second heading",
      "Cedarburg market snapshot",
      "Cedarburg questions, answered",
    ]);
    const buttonBeforeBody = await main
      .getByRole("button", { name: /see active listings/i })
      .evaluate((btn) => {
        const h = [...document.querySelectorAll("main h2")].find(
          (e) => e.textContent?.trim() === "Fixture city body heading",
        );
        return Boolean(
          h && btn.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      });
    expect(buttonBeforeBody).toBe(true);

    await expect(main.getByRole("heading", { name: "Common questions" })).toHaveCount(0);
    await expect(main.getByText(DISCLAIMER)).toHaveCount(0);

    const types = await schemaTypes(page);
    expect(types).toContain("RealEstateAgent");
    expect(types).toContain("FAQPage");
    expect(types).not.toContain("Article");
  });

  test("guide page keeps Article schema, Common questions and the disclaimer", async ({
    page,
  }) => {
    const res = await page.goto("/search/e2e-fixture-guide");
    expect(res?.status()).toBe(200);

    const main = page.locator("main");
    await expect(
      main.getByRole("heading", { level: 2, name: "Fixture guide body heading" }),
    ).toBeVisible();
    await expect(main.getByText("Fixture guide body paragraph.")).toBeVisible();

    await expect(
      main.getByRole("heading", { level: 2, name: "Common questions" }),
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { name: /questions, answered/i }),
    ).toHaveCount(0);
    await expect(main.getByText("Fixture guide question?")).toBeVisible();
    await expect(main.getByText(DISCLAIMER)).toBeVisible();

    const types = await schemaTypes(page);
    expect(types).toContain("Article");
    expect(types).toContain("RealEstateAgent");
    expect(types).toContain("FAQPage");
  });
});
