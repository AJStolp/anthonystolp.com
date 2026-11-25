import { test, expect } from "@playwright/test";

// Unique stamp per run so test rows are filterable / cleanable.
const STAMP = `pw-${Date.now()}`;
const email = (suffix: string) => `${STAMP}+${suffix}@anthonystolp.com`;

// Two groups reach production when .env.local holds the live keys: "Funnel
// submissions" posts real leads (Supabase rows, Resend mail, Lofty leads),
// and "Conversion events" fires the live GA4 tag. A plain `bun run test:e2e`
// must never do that, whoever runs it: on 2026-11-20 the factory's builder ran
// the suite in its worktree and wrote 24 leads (T-054; T-010 before it). They
// run only when a person sets E2E_ALLOW_PRODUCTION_WRITES=1 on purpose. The QA
// lanes' --grep-invert in headspace's gates.yml stays as a second guard.
const PRODUCTION_WRITES = process.env.E2E_ALLOW_PRODUCTION_WRITES === "1";
const NEEDS_PRODUCTION_WRITES =
  "reaches production; set E2E_ALLOW_PRODUCTION_WRITES=1 to run it on purpose";

test.describe("Anonymous visitor — home page", () => {
  test("hero renders + nav + key copy", async ({ page, viewport }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /your partner for cedarburg and ozaukee county real estate/i,
      }),
    ).toBeVisible();
    // "Ozaukee County" appears in hero eyebrow AND TrustStrip — first() is intentional.
    await expect(page.getByText(/Ozaukee County/i).first()).toBeVisible();
    await expect(page.getByText(/WI Real Estate License/i)).toBeVisible();
    // Nav: desktop shows links inline; mobile collapses them behind a hamburger.
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

  test("the hero shows Anthony's headshot with his name and brokerage", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("section").filter({ has: page.locator("h1") });
    const photo = hero.getByRole("img", { name: "Anthony Stolp, Realtor" });
    await expect(photo).toBeVisible();
    await expect(hero.locator("figcaption")).toHaveText(/Anthony Stolp, Realtor\s*ExSell Experts \| Epique Realty/);
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

  test("the hero's home value button goes to /home-value", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /what's my home worth/i }).click();
    await page.waitForURL(/\/home-value$/);
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
    await expect(modal.getByRole("heading", { name: /want new listings sent to you first/i })).toBeVisible();
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

// Anthony's cell has to be in the HTML the server sends, not added later by
// hydration, so these run with JavaScript off. The office line stays beside it.
test.describe("Anonymous visitor — call or text Anthony", () => {
  test.use({ javaScriptEnabled: false });

  const CELL_HREF = "tel:+12624837932";
  const CELL_TEXT = "Call or text Anthony: (262) 483-7932";
  const OFFICE_HREF = "tel:+12628853310";

  test("the hero links Anthony's cell in the server HTML", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("section").filter({ has: page.locator("h1") });
    await expect(hero).toHaveCount(1);
    const cell = hero.locator(`a[href="${CELL_HREF}"]`);
    await expect(cell).toHaveCount(1);
    await expect(cell).toHaveText(CELL_TEXT);
  });

  test("the footer links Anthony's cell in the server HTML", async ({ page }) => {
    await page.goto("/");
    const cell = page.locator(`footer a[href="${CELL_HREF}"]`);
    await expect(cell).toHaveCount(1);
    await expect(cell).toHaveText(CELL_TEXT);
  });

  test("the footer still links the office line", async ({ page }) => {
    await page.goto("/");
    const office = page.locator(`footer a[href="${OFFICE_HREF}"]`);
    await expect(office).toHaveCount(1);
    await expect(office).toHaveText("Office: (262) 885-3310");
  });
});

// The texting number is registered to Anthony alone, so every consent names
// him and no one else (AJ, 2026-11-20). A team or second name in any of these
// is a compliance risk on every submission.
test.describe("Text consent names Anthony Stolp only", () => {
  for (const path of ["/", "/northwoods", "/privacy", "/terms"]) {
    test(`${path} names Anthony Stolp and no team`, async ({ page }) => {
      await page.goto(path);
      const text = await page.locator("main, body").first().innerText();
      expect(text).toMatch(/messages from Anthony Stolp (regarding|by checking)/);
      expect(text).not.toMatch(/ExSell Experts team|Anthony Stolp and/);
    });
  }

  test("the homepage contact intro links the cell", async ({ page }) => {
    await page.goto("/");
    const intro = page.locator("#contact p", { hasText: "not a call center" });
    await expect(intro).toHaveCount(1);
    await expect(intro.locator('a[href="tel:+12624837932"]')).toHaveText("(262) 483-7932");
  });
});

// Google cuts a title off at about 60 characters (T-066).
test.describe("Titles fit in a search result", () => {
  for (const path of [
    "/northwoods",
    "/search/selling-a-house-during-divorce-wisconsin",
    "/search/selling-an-inherited-house-wisconsin",
    "/search/selling-before-foreclosure-wisconsin",
    "/search/downsizing-in-wisconsin",
  ]) {
    test(`${path} has a title of 60 characters or fewer, naming Anthony once`, async ({ page }) => {
      await page.goto(path);
      const title = await page.title();
      expect(title.length).toBeLessThanOrEqual(60);
      expect(title.match(/Anthony Stolp/g) ?? []).toHaveLength(1);
    });
  }
});

test.describe("Wording AJ chose", () => {
  test("About's one team line uses the brokerage with the pipe", async ({ page }) => {
    await page.goto("/about");
    await expect(
      page.getByText("I have the ExSell Experts | Epique Realty team behind me when I need backup, but you work with me."),
    ).toBeVisible();
  });

  test("Thiensville's snapshot names the zip it describes", async ({ page }) => {
    await page.goto("/search/thiensville-homes-for-sale");
    const heading = page.getByRole("heading", { name: "Thiensville and Mequon (53092) market snapshot" });
    test.skip((await heading.count()) === 0 && !(await page.getByText("market snapshot").count()), "no snapshot without market data");
    await expect(heading).toBeVisible();
    await expect(page.getByText(/covers Thiensville and much of Mequon, not the village alone/)).toBeVisible();
  });
});

test.describe("Look AJ chose", () => {
  for (const path of ["/", "/about", "/home-value"]) {
    test(`${path} sits on a white background, not cream`, async ({ page }) => {
      await page.goto(path);
      const body = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(body).toBe("rgb(255, 255, 255)");
      const main = await page.evaluate(() => getComputedStyle(document.querySelector("main") ?? document.body).backgroundColor);
      expect(["rgb(255, 255, 255)", "rgba(0, 0, 0, 0)"]).toContain(main);
    });
  }
});

test.describe("Funnel submissions (real DB writes)", () => {
  test.skip(!PRODUCTION_WRITES, NEEDS_PRODUCTION_WRITES);

  test("market-report-subscribe submits + success state", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("section#market-report");
    await section.scrollIntoViewIfNeeded();
    await section.locator("#mr-email").fill(email("marketreport"));
    await section.locator("#mr-zip").selectOption("53012");
    await section.locator("#mr-terms").check();
    await section.getByRole("button", { name: /send me the report/i }).click();
    await expect(page.getByRole("heading", { name: /you're on the list/i })).toBeVisible({ timeout: 15_000 });
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
  test("a home value city page's address box carries the address and UTM to /home-value", async ({ page }) => {
    await page.goto("/search/cedarburg-home-value");
    await expect(page.getByRole("heading", { name: /what is my cedarburg home worth/i })).toBeVisible();
    const address = page.getByLabel("Your home address");
    await expect(address).toHaveAttribute("placeholder", "Your Cedarburg address");
    await address.fill("123 Main St Cedarburg");
    await page.getByRole("button", { name: /ask for my home value/i }).click();
    await page.waitForURL(/\/home-value\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("address")).toBe("123 Main St Cedarburg");
    expect(url.searchParams.get("utm_source")).toBe("niche");
    expect(url.searchParams.get("utm_campaign")).toBe("cedarburg-home-value");
  });

  test("buy-intent niche CTA opens SearchGate", async ({ page }) => {
    await page.goto("/search/cedarburg-homes-for-sale");
    await expect(page.getByRole("heading", { name: /homes for sale in cedarburg/i })).toBeVisible();
    await page.getByRole("button", { name: /see active listings/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
  });

  test("buy-intent niche gate names the town", async ({ page }) => {
    await page.goto("/search/cedarburg-homes-for-sale");
    await page.getByRole("button", { name: /see active listings/i }).click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /want new cedarburg listings sent to you first/i }),
    ).toBeVisible();
  });

  test("unknown niche slug → 404", async ({ page }) => {
    const r = await page.goto("/search/this-slug-does-not-exist-9876");
    expect(r?.status()).toBe(404);
  });
});

// The listings gate offers a way past it with no email. Each test clicks skip
// and checks where the visitor went, that no lead was posted, and that the skip
// reached dataLayer, which is how it gets compared against search_gate_lead.
test.describe("Listings gate skip", () => {
  type Pushed = { name: unknown; props: Record<string, unknown> | undefined };

  // Runs without the live tags: gtag.js and the Meta pixel are blocked, and a
  // stand-in gtag pushes onto dataLayer exactly as the snippet in Pixels.tsx
  // does. Each push is also reported to the test, because the skip navigates
  // away and the page's own dataLayer goes with it.
  async function openGate(page: import("@playwright/test").Page, path: string, opener: RegExp) {
    const pushed: Pushed[] = [];
    await page.exposeFunction("__pwDataLayerPush", (entry: Pushed) => {
      pushed.push(entry);
    });
    await page.addInitScript(() => {
      const w = window as unknown as {
        dataLayer: unknown[];
        gtag: (...args: unknown[]) => void;
        __pwDataLayerPush: (entry: unknown) => void;
      };
      const layer: unknown[] = [];
      layer.push = (...entries: unknown[]) => {
        for (const entry of entries) {
          const args = entry as ArrayLike<unknown>;
          w.__pwDataLayerPush({ name: args[1], props: args[2] });
        }
        return Array.prototype.push.apply(layer, entries);
      };
      w.dataLayer = layer;
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer.push(arguments);
      };
    });
    await page.route("https://www.googletagmanager.com/**", (r) => r.abort());
    await page.route("https://connect.facebook.net/**", (r) => r.abort());
    await page.route("**/api/track", (r) => r.fulfill({ status: 204 }));

    let leadPosted = false;
    await page.route("**/api/lead", (r) => {
      leadPosted = true;
      return r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.route("https://exsellexperts.com/**", (r) => r.abort());

    await page.goto(path);
    await page.getByRole("button", { name: opener }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    return { modal, pushed, leadPosted: () => leadPosted };
  }

  async function skip(page: import("@playwright/test").Page, modal: import("@playwright/test").Locator) {
    const outbound = page.waitForRequest((r) => r.url().startsWith("https://exsellexperts.com/"), {
      timeout: 10_000,
    });
    await modal.getByRole("button", { name: /skip, just show me listings/i }).click();
    return new URL((await outbound).url());
  }

  test("from a city page, skip goes to that town's search with no email", async ({ page }) => {
    const gate = await openGate(page, "/search/cedarburg-homes-for-sale", /see active listings/i);
    await expect(
      gate.modal.getByRole("heading", { name: /want new cedarburg listings sent to you first/i }),
    ).toBeVisible();

    const landed = await skip(page, gate.modal);
    expect(landed.pathname).toBe("/properties/city-Cedarburg,%20WI/");
    expect(landed.searchParams.get("status")).toBe("Active");
    expect(landed.searchParams.get("utm_campaign")).toBe("town-search");
    expect(landed.searchParams.get("utm_content")).toBe("cedarburg");
    expect(gate.leadPosted()).toBe(false);
    await expect
      .poll(() => gate.pushed.find((e) => e.name === "search_gate_skip")?.props)
      .toMatchObject({
        niche_slug: "cedarburg-homes-for-sale",
        town: "cedarburg",
        destination: "town_search",
      });
    await expect
      .poll(() => gate.pushed.find((e) => e.name === "search_outbound")?.props)
      .toMatchObject({ town: "cedarburg", source: "gate_skip" });
  });

  test("after a skip, the button goes straight to the listings", async ({ page }) => {
    const gate = await openGate(page, "/search/mequon-homes-for-sale", /see active listings/i);
    await skip(page, gate.modal);

    await page.goto("/search/grafton-homes-for-sale");
    const outbound = page.waitForRequest((r) => r.url().startsWith("https://exsellexperts.com/"));
    await page.getByRole("button", { name: /see active listings/i }).click();
    const landed = new URL((await outbound).url());
    expect(landed.pathname).toBe("/properties/city-Grafton,%20WI/");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect
      .poll(() => gate.pushed.filter((e) => e.name === "search_outbound").at(-1)?.props)
      .toMatchObject({ town: "grafton", source: "direct" });
  });

  test("closing the gate is remembered too", async ({ page }) => {
    const gate = await openGate(page, "/search/saukville-homes-for-sale", /see active listings/i);
    await gate.modal.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const outbound = page.waitForRequest((r) => r.url().startsWith("https://exsellexperts.com/"));
    await page.getByRole("button", { name: /see active listings/i }).click();
    expect(new URL((await outbound).url()).pathname).toBe("/properties/city-Saukville,%20WI/");
  });

  test("from the homepage hero, skip goes to the Ozaukee County search", async ({ page }) => {
    const gate = await openGate(page, "/", /browse active listings/i);
    await expect(gate.modal.getByRole("heading", { name: /want new listings sent to you first/i })).toBeVisible();

    const landed = await skip(page, gate.modal);
    expect(landed.pathname).toBe("/properties/county-Ozaukee,%20WI/");
    expect(landed.searchParams.get("utm_campaign")).toBe("town-search");
    expect(landed.searchParams.get("utm_content")).toBe("ozaukee-county");
    expect(gate.leadPosted()).toBe(false);
    await expect
      .poll(() => gate.pushed.find((e) => e.name === "search_gate_skip")?.props)
      .toMatchObject({ town: "ozaukee-county", destination: "town_search" });
  });

  test("/buy has no one town, so it opens the Ozaukee County search", async ({ page }) => {
    const gate = await openGate(page, "/buy", /see active listings/i);
    const landed = await skip(page, gate.modal);
    expect(landed.pathname).toBe("/properties/county-Ozaukee,%20WI/");
  });

  test("Northwoods offers Marinette County homes and land as separate searches", async ({ page }) => {
    const homes = await openGate(page, "/northwoods", /see homes and cabins/i);
    const toHomes = await skip(page, homes.modal);
    expect(toHomes.pathname).toBe("/properties/county-Marinette,%20WI/");
    expect(toHomes.searchParams.get("listingType")).toBe("Residential");
    expect(toHomes.searchParams.get("utm_content")).toBe("marinette-homes");

    // The skip is remembered, so the land button goes straight through.
    await page.goto("/northwoods");
    const outbound = page.waitForRequest((r) => r.url().startsWith("https://exsellexperts.com/"));
    await page.getByRole("button", { name: /^see land/i }).click();
    const toLand = new URL((await outbound).url());
    expect(toLand.pathname).toBe("/properties/county-Marinette,%20WI/");
    expect(toLand.searchParams.get("listingType")).toBe("Land");
    expect(toLand.searchParams.get("utm_content")).toBe("marinette-land");
  });
});

test.describe("Static pages", () => {
  test("/about renders", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: /local agent who works/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /ask for my home value/i })).toBeVisible();
    // The page promises only what is live: a value prepared by hand, not an
    // instant one, and no address-aware search.
    const main = page.locator("main");
    await expect(main).toContainText(
      "A free home value, personally prepared within 24 hours",
    );
    await expect(main).not.toContainText(/instant/i);
    await expect(main).not.toContainText(/address-aware/i);
  });

  // bndryiq's estimate is hidden until it is ready (AJ, 2026-11-20), so the
  // page asks for the address itself and promises a range within 24 hours.
  test("/home-value asks for the address, with no bndryiq frame", async ({ page }) => {
    const res = await page.goto("/home-value");
    expect(res?.status()).toBe(200);
    await expect(page.getByLabel(/home address/i)).toHaveValue("");
    await expect(page.locator('iframe[src*="bndryiq"]')).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/instant/i);
    await expect(page.getByRole("button", { name: /ask for my home value/i })).toBeVisible();
  });

  test("/home-value starts the form with an address typed elsewhere", async ({ page }) => {
    await page.goto("/home-value?address=123%20Main%20St%20Cedarburg&utm_campaign=test");
    await expect(page.getByLabel(/home address/i)).toHaveValue("123 Main St Cedarburg");
  });

  test("/home-value refuses a send without an address", async ({ page }) => {
    let posted = false;
    await page.route("**/api/lead", (r) => { posted = true; return r.abort(); });
    await page.goto("/home-value");
    await page.getByLabel(/^name$/i).fill("No Address");
    await page.getByLabel(/^email$/i).fill("no-address@example.com");
    await page.getByLabel(/i agree to the terms/i).check();
    await page.getByRole("button", { name: /ask for my home value/i }).click();
    await expect(page.getByText("Add the address so I can pull the right sales.")).toBeVisible();
    expect(posted).toBe(false);
  });

  // v4 handoff (2026-11-20): a seller who never opens the timeframe list was
  // filed as "Just curious". Now the list starts on "Pick one" and must be
  // answered.
  test("/home-value starts the timeframe on Pick one and refuses a send without one", async ({ page }) => {
    let posted = false;
    await page.route("**/api/lead", (r) => { posted = true; return r.abort(); });
    await page.goto("/home-value");
    const timeframe = page.getByLabel("Thinking about selling");
    await expect(timeframe).toHaveValue("");
    await expect(timeframe.locator("option").first()).toHaveText("Pick one");
    await expect(timeframe.locator("option").nth(1)).toHaveText("1 to 3 months");
    await page.getByLabel(/home address/i).fill("123 Main St Cedarburg");
    await page.getByLabel(/^name$/i).fill("No Timeframe");
    await page.getByLabel(/^email$/i).fill("no-timeframe@example.com");
    await page.getByLabel(/i agree to the terms/i).check();
    await page.getByRole("button", { name: /ask for my home value/i }).click();
    await expect(page.getByText("Pick a timeframe so I know how soon to reach out.")).toBeVisible();
    await expect(timeframe).toHaveAttribute("aria-invalid", "true");
    expect(posted).toBe(false);
  });

  test("/home-value sends the timeframe the seller picked", async ({ page }) => {
    let body: Record<string, unknown> = {};
    await page.route("**/api/lead", async (r) => {
      body = JSON.parse(r.request().postData() ?? "{}");
      await r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.goto("/home-value");
    await page.getByLabel(/home address/i).fill("123 Main St Cedarburg");
    await page.getByLabel(/^name$/i).fill("Picked Timeframe");
    await page.getByLabel(/^email$/i).fill("picked-timeframe@example.com");
    await page.getByLabel("Thinking about selling").selectOption("1-3mo");
    await page.getByLabel(/i agree to the terms/i).check();
    await page.getByRole("button", { name: /ask for my home value/i }).click();
    await expect(page.getByText(/I'll personally email you an honest range/)).toBeVisible();
    expect(body.timeframe).toBe("1-3mo");
    expect(body.source).toBe("home-value");
  });

  // Google listed /home-value as unknown: its server HTML held only the nav
  // and footer. The heading and intro now ship in that HTML.
  test("/home-value's heading, intro and area are in the server HTML", async ({ request }) => {
    const html = await (await request.get("/home-value")).text();
    expect(html).toMatch(/<h1[^>]*>What&#x27;s your<br\/>home worth\?<\/h1>/);
    expect(html).toContain("No algorithm guess, no pressure.");
    expect(html).toContain("Free home value for Cedarburg, Ozaukee County, and nearby Washington County");
    expect(html).toContain("Hartford, Germantown, Jackson, and Slinger");
    expect(html).toContain(
      '<meta name="description" content="Free home value for Cedarburg, Ozaukee County, and nearby Washington County. An honest range from Anthony Stolp, sent within 24 hours."/>',
    );
    expect(html).not.toMatch(/southeast Wisconsin/i);
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
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
        page.getByRole("heading", { name: /you're on the list/i }),
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
  test.skip(!PRODUCTION_WRITES, NEEDS_PRODUCTION_WRITES);

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
          page.getByRole("heading", { name: /you're on the list/i }),
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
