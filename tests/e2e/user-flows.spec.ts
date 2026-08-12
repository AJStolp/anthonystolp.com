import { test, expect } from "@playwright/test";

// Unique stamp per run so test rows are filterable / cleanable.
const STAMP = `pw-${Date.now()}`;
const email = (suffix: string) => `${STAMP}+${suffix}@anthonystolp.com`;

// Set by tests/e2e/global-setup.ts, which probes the running server rather
// than trusting .env.local — the flag is inlined at build time, so only the
// server can say whether the home-value funnel is actually live.
const HOME_VALUE_LIVE = process.env.HOME_VALUE_LIVE === "true";
const NEEDS_HOME_VALUE =
  "home-value funnel is flagged off on this server (NEXT_PUBLIC_HOME_VALUE_ENABLED)";

test.describe("Anonymous visitor — home page", () => {
  test("hero renders + nav + key copy", async ({ page, viewport }) => {
    await page.goto("/");
    // The hero headline swaps with the flag; both branches must render.
    await expect(
      page.getByRole("heading", {
        name: HOME_VALUE_LIVE
          ? /what is your home worth/i
          : /your partner for wisconsin real estate/i,
      }),
    ).toBeVisible();
    // "Ozaukee County" appears in hero eyebrow AND TrustStrip — first() is intentional.
    await expect(page.getByText(/Ozaukee County/i).first()).toBeVisible();
    await expect(page.getByText(/WI Real Estate License/i)).toBeVisible();
    // Nav: desktop shows links inline; mobile collapses them behind a hamburger.
    // The Sell link is always labelled "Sell" — only its href moves with the
    // flag — so match the label, not the destination.
    const isDesktop = (viewport?.width ?? 0) >= 768;
    if (isDesktop) {
      await expect(page.getByRole("link", { name: /^sell$/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /about/i }).first()).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: /toggle menu/i })).toBeVisible();
      // Open it and verify the links are then reachable.
      await page.getByRole("button", { name: /toggle menu/i }).click();
      await expect(page.getByRole("link", { name: /^sell$/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /about/i }).first()).toBeVisible();
    }
  });

  test("hero featured card links to the newest result", async ({ page }) => {
    await page.goto("/");
    const card = page.locator('a[href^="/property/"]').first();
    await expect(card).toBeVisible();
    // The floating panel carries the status and the call to action.
    await expect(card.getByText(/sale pending|sold/i).first()).toBeVisible();
    await expect(card.getByText(/see the listing/i)).toBeVisible();
    await card.click();
    await page.waitForURL(/\/property\//);
  });

  test("hero address autocomplete → /home-value", async ({ page }) => {
    test.skip(!HOME_VALUE_LIVE, NEEDS_HOME_VALUE);
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
    test.skip(!HOME_VALUE_LIVE, NEEDS_HOME_VALUE);
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
    test.skip(!HOME_VALUE_LIVE, NEEDS_HOME_VALUE);
    await page.goto("/home-value");
    const frame = page.locator('iframe[title*="home value" i], iframe[src*="bndryiq"]');
    await expect(frame).toHaveAttribute("src", /bndryiq/, { timeout: 12_000 });
  });
});

test.describe("Admin", () => {
  test("/admin redirects to login, login lands on /admin/leads", async ({ page }) => {
    // Never hardcode the admin password here — this repo is public. It comes
    // from ADMIN_PASSWORD, loaded by tests/e2e/global-setup.ts.
    const password = process.env.ADMIN_PASSWORD;
    test.skip(!password, "ADMIN_PASSWORD is not set in the environment");

    await page.goto("/admin");
    await page.waitForURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/admin\/leads/);
    await expect(page.getByRole("heading", { name: /^leads$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^pages$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^reports$/i })).toBeVisible();
  });
});

test.describe("Paid-click attribution", () => {
  // These assert the client payload only: /api/lead is stubbed so the suite can
  // exercise the ad landing path repeatedly without writing rows or sending mail.

  // page.goto resolves on the load event, which can precede hydration — and the
  // cookie is written by an effect. Wait for the write itself rather than the
  // navigation, or a cold dev-server compile races the assertion.
  async function landOnAd(page: import("@playwright/test").Page, url: string) {
    await page.goto(url);
    await expect
      .poll(() => page.evaluate(() => document.cookie.includes("anthonystolp_attr")), {
        timeout: 15_000,
      })
      .toBe(true);
  }
  // Stub /api/lead and hand back the POST body the surface actually sent.
  async function captureLeadPost(
    page: import("@playwright/test").Page,
    submit: () => Promise<void>,
  ) {
    let body: Record<string, unknown> = {};
    await page.route("**/api/lead", async (route) => {
      body = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, leadId: "00000000-0000-0000-0000-000000000000" }),
      });
    });
    await submit();
    return body;
  }

  async function submitContact(page: import("@playwright/test").Page) {
    const contact = page.locator("section#contact");
    await contact.scrollIntoViewIfNeeded();
    await contact.getByLabel(/^name$/i).fill(`${STAMP} Playwright`);
    await contact.getByLabel(/^email$/i).fill(email("click"));
    await contact.getByLabel(/i agree to the/i).check();
    await contact.getByRole("button", { name: /^send$/i }).click();
    await expect(contact.getByRole("heading", { name: /got it/i })).toBeVisible({
      timeout: 15_000,
    });
  }

  const submitContactAndCaptureBody = (page: import("@playwright/test").Page) =>
    captureLeadPost(page, () => submitContact(page));

  test("gclid survives navigation away from the landing page", async ({ page }) => {
    await landOnAd(page, "/?gclid=pw-click-1&utm_source=google&utm_medium=cpc");
    // Leave the landing page: the query string is gone from here on, which is
    // exactly the case that used to drop attribution entirely.
    await page.goto("/about");
    await page.goto("/#contact");

    const body = await submitContactAndCaptureBody(page);
    expect(body.click).toMatchObject({ gclid: "pw-click-1" });
    expect(body.utm).toMatchObject({ source: "google", medium: "cpc" });
    expect(body.visitorId).toBeTruthy();
    // The landing page is preserved, not overwritten by the converting page.
    expect(body.landingPage).toContain("gclid=pw-click-1");
  });

  test("a later clean page load does not clear the stored click", async ({ page }) => {
    await landOnAd(page, "/?gclid=pw-click-2");
    await page.goto("/");

    const body = await submitContactAndCaptureBody(page);
    expect(body.click).toMatchObject({ gclid: "pw-click-2" });
  });

  test("a newer click overwrites the stored one", async ({ page }) => {
    await landOnAd(page, "/?gclid=pw-click-old&utm_campaign=old");
    await landOnAd(page, "/?gclid=pw-click-new&utm_campaign=new");

    const body = await submitContactAndCaptureBody(page);
    // Last touch: Google credits the most recent click, so the stored id yields.
    expect(body.click).toMatchObject({ gclid: "pw-click-new" });
    expect(body.utm).toMatchObject({ campaign: "new" });
  });

  test("non-Google click ids are captured too", async ({ page }) => {
    await landOnAd(page, "/?msclkid=pw-bing-1");
    await page.goto("/#contact");
    expect((await submitContactAndCaptureBody(page)).click).toMatchObject({
      msclkid: "pw-bing-1",
    });
  });

  // Per-surface coverage. The helper lives in one file, but each funnel builds
  // its own POST body, so each has to be checked separately — #54 was exactly
  // this class of bug, where three surfaces silently dropped visitorId.

  test("market-report subscribe carries click id + visitorId", async ({ page }) => {
    await landOnAd(page, "/?gclid=pw-surface-mr");
    await page.goto("/about");
    await page.goto("/");

    const body = await captureLeadPost(page, async () => {
      const section = page.locator("section#market-report");
      await section.scrollIntoViewIfNeeded();
      await section.locator("#mr-email").fill(email("surface-mr"));
      await section.locator("#mr-zip").selectOption("53012");
      await section.locator("#mr-terms").check();
      await section.getByRole("button", { name: /send me the report/i }).click();
      await expect(
        page.getByRole("heading", { name: /you are on the list/i }),
      ).toBeVisible({ timeout: 15_000 });
    });
    expect(body.click).toMatchObject({ gclid: "pw-surface-mr" });
    expect(body.visitorId).toBeTruthy();
  });

  test("SearchGate carries click id + visitorId", async ({ page }) => {
    await landOnAd(page, "/?gclid=pw-surface-sg");
    await page.goto("/about");
    await page.goto("/");
    // Submitting navigates off-site; stop that so the test stays local.
    await page.route("https://exsellexperts.com/**", (route) => route.abort());

    const body = await captureLeadPost(page, async () => {
      await page.getByRole("button", { name: /browse active listings/i }).click();
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible();
      await modal.getByLabel(/^email$/i).fill(email("surface-sg"));
      await modal.getByLabel(/^timeframe$/i).selectOption("1-3mo");
      await modal.getByLabel(/i agree to the/i).check();
      // The page unloads on success, so wait for the request rather than a
      // success state that may never paint.
      const posted = page.waitForRequest(
        (r) => r.url().endsWith("/api/lead") && r.method() === "POST",
        { timeout: 10_000 },
      );
      await modal.getByRole("button", { name: /see active listings/i }).click();
      await posted;
    });
    expect(body.click).toMatchObject({ gclid: "pw-surface-sg" });
    expect(body.visitorId).toBeTruthy();
  });

  test("open-house sign-in carries click id + visitorId", async ({ page }) => {
    await landOnAd(page, "/?gclid=pw-surface-oh");
    await page.goto("/property/521-alta-loma");

    // The sign-in form only renders for coming_soon/active listings; pending and
    // sold swap it for a sell CTA. With no active listing in the table there is
    // nothing to sign into, so this surface stays honestly unproven rather than
    // being faked with a throwaway listing on a live site.
    const signIn = page.getByRole("button", { name: /^sign in$/i });
    test.skip(
      (await signIn.count()) === 0,
      "no active listing on the site to sign in to",
    );

    const body = await captureLeadPost(page, async () => {
      await page.getByLabel(/^name$/i).fill(`${STAMP} Playwright`);
      await page.getByLabel(/^email$/i).fill(email("surface-oh"));
      await page.getByLabel(/i agree to the/i).check();
      await signIn.click();
      await expect(
        page.getByRole("heading", { name: /thanks for stopping by/i }),
      ).toBeVisible({ timeout: 15_000 });
    });
    expect(body.click).toMatchObject({ gclid: "pw-surface-oh" });
    expect(body.visitorId).toBeTruthy();
  });
});

test.describe("Conversion events", () => {
  // track.ts hands funnel events to window.gtag, which pushes them onto
  // dataLayer. That push is the only path by which a lead becomes a conversion
  // in GA4 / Google Ads, so assert on dataLayer rather than on the POST.

  async function submitWithStubbedLead(
    page: import("@playwright/test").Page,
    body: Record<string, unknown>,
    submit: () => Promise<void>,
  ) {
    await page.route("**/api/lead", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      }),
    );
    await submit();
  }

  async function conversionEvents(page: import("@playwright/test").Page) {
    return page.evaluate(() =>
      (((window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []) as unknown[])
        .map((entry) => (entry as Record<number, unknown>)[1])
        .filter((name): name is string => typeof name === "string"),
    );
  }

  async function submitContactForm(page: import("@playwright/test").Page) {
    const contact = page.locator("section#contact");
    await contact.scrollIntoViewIfNeeded();
    await contact.getByLabel(/^name$/i).fill(`${STAMP} Playwright`);
    await contact.getByLabel(/^email$/i).fill(email("conv"));
    await contact.getByLabel(/i agree to the/i).check();
    await contact.getByRole("button", { name: /^send$/i }).click();
    await expect(contact.getByRole("heading", { name: /got it/i })).toBeVisible({
      timeout: 15_000,
    });
  }

  test("contact form fires contact_form_lead", async ({ page }) => {
    await page.goto("/#contact");
    // gtag only loads when NEXT_PUBLIC_GA4_ID is set; without it there is no
    // dataLayer to assert against and the event is silently dropped by design.
    await expect
      .poll(() => page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag), {
        timeout: 15_000,
      })
      .toBe("function");

    await submitWithStubbedLead(
      page,
      { ok: true, leadId: "00000000-0000-0000-0000-000000000000", accepted: true },
      () => submitContactForm(page),
    );
    expect(await conversionEvents(page)).toContain("contact_form_lead");
  });

  test("market-report subscribe fires market_report_lead", async ({ page }) => {
    await page.goto("/");
    await expect
      .poll(() => page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag), {
        timeout: 15_000,
      })
      .toBe("function");

    await submitWithStubbedLead(
      page,
      { ok: true, leadId: "00000000-0000-0000-0000-000000000000", accepted: true },
      async () => {
        const section = page.locator("section#market-report");
        await section.scrollIntoViewIfNeeded();
        await section.locator("#mr-email").fill(email("conv-mr"));
        await section.locator("#mr-zip").selectOption("53012");
        await section.locator("#mr-terms").check();
        await section.getByRole("button", { name: /send me the report/i }).click();
        await expect(
          page.getByRole("heading", { name: /you are on the list/i }),
        ).toBeVisible({ timeout: 15_000 });
      },
    );
    expect(await conversionEvents(page)).toContain("market_report_lead");
  });

  test("the honeypot's silent 200 fires no conversion", async ({ page }) => {
    await page.goto("/#contact");
    await expect
      .poll(() => page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag), {
        timeout: 15_000,
      })
      .toBe("function");

    // Exactly what src/lib/bot-defense.ts returns on a trip: a bare ok, no
    // `accepted`. The form still shows success — that is the point of the trap —
    // but a bot must never land in the conversion data Smart Bidding learns from.
    await submitWithStubbedLead(page, { ok: true }, () => submitContactForm(page));
    expect(await conversionEvents(page)).not.toContain("contact_form_lead");
  });
});
