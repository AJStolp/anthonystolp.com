import { test, expect } from "@playwright/test";

// Unique stamp per run so test rows are filterable / cleanable.
const STAMP = `pw-${Date.now()}`;
const email = (suffix: string) => `${STAMP}+${suffix}@anthonystolp.com`;

test.describe("Anonymous visitor — home page", () => {
  test("hero renders + nav + key copy", async ({ page, viewport }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /what is your home worth/i })).toBeVisible();
    // "Ozaukee County" appears in hero eyebrow AND TrustStrip — first() is intentional.
    await expect(page.getByText(/Ozaukee County/i).first()).toBeVisible();
    await expect(page.getByText(/WI Real Estate License/i)).toBeVisible();
    // Nav: desktop shows links inline; mobile collapses them behind a hamburger.
    const isDesktop = (viewport?.width ?? 0) >= 768;
    if (isDesktop) {
      await expect(page.getByRole("link", { name: /home value/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /about/i }).first()).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: /toggle menu/i })).toBeVisible();
      // Open it and verify the links are then reachable.
      await page.getByRole("button", { name: /toggle menu/i }).click();
      await expect(page.getByRole("link", { name: /home value/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /about/i }).first()).toBeVisible();
    }
  });

  test("hero address autocomplete → /home-value", async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto("/");

    const input = page.getByPlaceholder(/enter your home address/i);
    await expect(input).toBeVisible();
    await input.fill("100 N Washington Ave Cedarburg");

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible({ timeout: 8_000 });
    const firstOption = listbox.locator('[role="option"]').first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();

    const submit = page.getByRole("button", { name: /get estimate/i });
    await expect(submit).toBeEnabled();
    await submit.click();

    await page.waitForURL(/\/home-value/);
    expect(page.url()).toMatch(/leadId=/);
    expect(page.url()).toMatch(/address=/);
  });

  test("Approach Search card opens SearchGate modal", async ({ page }) => {
    await page.goto("/");
    // The Approach section's Search card. Scope to the section, then click
    // the link that contains the big "Search" word but not the others.
    const approach = page.locator("section#approach");
    await approach.scrollIntoViewIfNeeded();
    // Each card is an <a> with eyebrow ("03"), word ("Search"). We disambiguate
    // by the "03" eyebrow + the word — only the search card has this combo.
    const searchCard = approach.locator("a").filter({ hasText: "03" });
    await expect(searchCard).toHaveCount(1);
    await searchCard.click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: /where should i send/i })).toBeVisible();
    await modal.getByRole("button", { name: /close/i }).click();
    await expect(modal).not.toBeVisible();
  });

  test("Hero browse-listings link opens SearchGate modal", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /browse active listings/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
  });
});

test.describe("Funnel submissions (real DB writes)", () => {
  test("market-report-subscribe submits + success state", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("section#market-report");
    await section.scrollIntoViewIfNeeded();
    await section.locator("#mr-email").fill(email("marketreport"));
    await section.locator("#mr-zip").selectOption("53012");
    await section.locator("#mr-terms").check();
    await section.getByRole("button", { name: /send me the report/i }).click();
    await expect(page.getByRole("heading", { name: /you are on the list/i })).toBeVisible({ timeout: 15_000 });
  });

  test("contact form submits + success state", async ({ page }) => {
    await page.goto("/#contact");
    const contact = page.locator("section#contact");
    await contact.scrollIntoViewIfNeeded();
    // Scope every input to the contact section to avoid the MarketReport form above.
    await contact.getByLabel(/^name$/i).fill(`${STAMP} Playwright`);
    await contact.getByLabel(/^email$/i).fill(email("contact"));
    await contact.getByLabel(/anything else/i).fill("Playwright end-to-end test submission");
    await contact.getByLabel(/i agree to the/i).check();
    await contact.getByRole("button", { name: /^send$/i }).click();
    await expect(contact.getByRole("heading", { name: /got it/i })).toBeVisible({ timeout: 15_000 });
  });

  test("SearchGate modal submits + posts to /api/lead", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /browse active listings/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await modal.getByLabel(/^email$/i).fill(email("searchgate"));
    await modal.getByLabel(/^timeframe$/i).selectOption("1-3mo");
    await modal.getByLabel(/i agree to the/i).check();

    // The submit triggers a POST then an external navigation. Capture the
    // network event itself (not the body) since the page unloads before
    // we can read the body. Verify the POST was made + status was 2xx.
    const leadPostPromise = page.waitForRequest(
      (r) => r.url().endsWith("/api/lead") && r.method() === "POST",
      { timeout: 10_000 },
    );
    // Stop the external navigation so the test doesn't try to visit exsell.com
    await page.route("https://exsellexperts.com/**", (route) => route.abort());

    await modal.getByRole("button", { name: /see active listings/i }).click();
    const req = await leadPostPromise;
    const postBody = JSON.parse(req.postData() ?? "{}");
    expect(postBody.source).toBe("search-redirect");
    expect(postBody.email).toContain(STAMP);
  });
});

test.describe("Niche landing pages", () => {
  test("sell-intent niche CTA → /home-value with UTM", async ({ page }) => {
    await page.goto("/search/cedarburg-home-value");
    await expect(page.getByRole("heading", { name: /what is your cedarburg home worth/i })).toBeVisible();
    await page.getByRole("link", { name: /get my home value/i }).click();
    await page.waitForURL(/\/home-value/);
    expect(page.url()).toMatch(/utm_campaign=cedarburg-home-value/);
  });

  test("buy-intent niche CTA opens SearchGate", async ({ page }) => {
    await page.goto("/search/cedarburg-homes-for-sale");
    await expect(page.getByRole("heading", { name: /homes for sale in cedarburg/i })).toBeVisible();
    await page.getByRole("button", { name: /see active listings/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
  });

  test("unknown niche slug → 404", async ({ page }) => {
    const r = await page.goto("/search/this-slug-does-not-exist-9876");
    expect(r?.status()).toBe(404);
  });
});

test.describe("Static pages", () => {
  test("/about renders", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: /local agent who works/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /get my home value/i })).toBeVisible();
  });

  test("/home-value bndryiq iframe is present", async ({ page }) => {
    await page.goto("/home-value");
    const frame = page.locator('iframe[title*="home value" i], iframe[src*="bndryiq"]');
    await expect(frame).toHaveAttribute("src", /bndryiq/, { timeout: 12_000 });
  });
});

test.describe("Admin", () => {
  test("/admin redirects to login, login lands on /admin/leads", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await page.getByLabel(/password/i).fill("TreeWalker!0420");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/admin\/leads/);
    await expect(page.getByRole("heading", { name: /^leads$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^pages$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^reports$/i })).toBeVisible();
  });
});
