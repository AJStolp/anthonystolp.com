import { test, expect, type APIRequestContext } from "@playwright/test";

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

  test("unknown niche slug → 404", async ({ page }) => {
    const r = await page.goto("/search/this-slug-does-not-exist-9876");
    expect(r?.status()).toBe(404);
  });
});

// T-088: every listings button is a plain link straight to the AgentFire
// search, with no email gate in front of it. Each row is one button: the page,
// its text, the search it opens and the utm_term that names where it sits.
const LISTING_LINKS: {
  path: string;
  text: string;
  pathname: string;
  listingType: "Residential" | "Land";
  key: string;
  term: string;
}[] = [
  { path: "/", text: "Browse listings", pathname: "/properties/county-Ozaukee,%20WI/", listingType: "Residential", key: "ozaukee-county", term: "hero" },
  { path: "/buy", text: "See Ozaukee County homes for sale", pathname: "/properties/county-Ozaukee,%20WI/", listingType: "Residential", key: "ozaukee-county", term: "buy" },
  ...(
    [
      ["cedarburg", "Cedarburg", "city-Cedarburg"],
      ["mequon", "Mequon", "city-Mequon"],
      ["thiensville", "Thiensville", "place-Thiensville"],
      ["grafton", "Grafton", "city-Grafton"],
      ["port-washington", "Port Washington", "city-Port%20Washington"],
      ["saukville", "Saukville", "city-Saukville"],
      ["ozaukee-county", "Ozaukee County", "county-Ozaukee"],
    ] as const
  ).map(([key, town, place]) => ({
    path: `/search/${key}-homes-for-sale`,
    text: `See all ${town} homes for sale`,
    pathname: `/properties/${place},%20WI/`,
    listingType: "Residential" as const,
    key,
    term: "town_page",
  })),
  { path: "/northwoods", text: "Search Northwoods land", pathname: "/properties/county-Marinette,%20WI/", listingType: "Land", key: "marinette-land", term: "northwoods" },
  { path: "/northwoods", text: "See Northwoods homes and cabins", pathname: "/properties/county-Marinette,%20WI/", listingType: "Residential", key: "marinette-homes", term: "northwoods" },
  { path: "/northwoods", text: "See Northwoods land", pathname: "/properties/county-Marinette,%20WI/", listingType: "Land", key: "marinette-land", term: "northwoods" },
];

// The homepage's "03 Search" card is one link around the whole card, so its
// name is all of the card's text; it is found by its call to action instead.
function listingLink(page: import("@playwright/test").Page, row: (typeof LISTING_LINKS)[number]) {
  return row.text === "Browse listings"
    ? page.locator("section#approach a").filter({ hasText: row.text })
    : page.getByRole("link", { name: row.text, exact: true });
}

function expectListingSearch(href: string | null, row: (typeof LISTING_LINKS)[number]) {
  const url = new URL(href ?? "");
  expect(url.origin).toBe("https://exsellexperts.com");
  expect(url.pathname).toBe(row.pathname);
  expect(url.searchParams.get("listingType")).toBe(row.listingType);
  expect(url.searchParams.get("status")).toBe("Active");
  expect(url.searchParams.get("utm_source")).toBe("anthonystolp");
  expect(url.searchParams.get("utm_medium")).toBe("referral");
  expect(url.searchParams.get("utm_campaign")).toBe("town-search");
  expect(url.searchParams.get("utm_content")).toBe(row.key);
  expect(url.searchParams.get("utm_term")).toBe(row.term);
}

// With JavaScript off, what is on the page is the server HTML: the link has to
// be there, point at the search, and work.
test.describe("Listings links work with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  for (const row of LISTING_LINKS) {
    test(`${row.path} "${row.text}" goes straight to the ${row.key} search`, async ({ page }) => {
      await page.route("https://exsellexperts.com/**", (r) => r.abort());
      await page.goto(row.path);
      const link = listingLink(page, row);
      await expect(link).toHaveCount(1);
      expectListingSearch(await link.getAttribute("href"), row);
      // Same tab.
      expect(await link.getAttribute("target")).toBeNull();

      const outbound = page.waitForRequest((r) => r.url().startsWith("https://exsellexperts.com/"));
      await link.click();
      expectListingSearch((await outbound).url(), row);
    });
  }

  test("the homepage hero button goes to the town tiles on the same page", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("section").filter({ has: page.locator("h1") });
    const link = hero.getByRole("link", { name: "See homes for sale", exact: true });
    await expect(link).toHaveAttribute("href", "#homes");
    const target = page.locator("#homes");
    await expect(target).toHaveCount(1);
    await expect(target.getByRole("heading", { name: "Homes for sale now", level: 2 })).toHaveCount(1);
    await expect(target.getByRole("heading", { name: "Cedarburg", level: 3 })).toHaveCount(1);
  });

  for (const [path, line] of [
    ["/search/cedarburg-homes-for-sale", "Want new Cedarburg listings sent to you first? Get alerts"],
    ["/search/thiensville-homes-for-sale", "Want new Thiensville listings sent to you first? Get alerts"],
    ["/northwoods", "Want new listings sent to you first? Get alerts"],
    ["/buy", "Want new listings sent to you first? Get alerts"],
  ] as const) {
    test(`${path} offers alerts under the button, pointing at its one alerts block`, async ({ page }) => {
      await page.goto(path);
      const lines = page.getByText(line, { exact: true });
      await expect(lines.first()).toBeVisible();
      for (const get of await lines.getByRole("link", { name: "Get alerts" }).all()) {
        await expect(get).toHaveAttribute("href", "#alerts");
      }
      await expect(page.locator('[id="alerts"]')).toHaveCount(1);
    });
  }

  test("a town page's alerts target is its listing alert card", async ({ page }) => {
    await page.goto("/search/cedarburg-homes-for-sale");
    await expect(
      page.locator("#alerts").getByRole("heading", { name: "Get new Cedarburg listings first" }),
    ).toHaveCount(1);
    // The second card stays, without the id.
    await expect(page.getByRole("heading", { name: "Get new Cedarburg listings first" })).toHaveCount(2);
  });

  test("/northwoods offers alerts under both sets of listing buttons", async ({ page }) => {
    await page.goto("/northwoods");
    await expect(page.getByText("Want new listings sent to you first? Get alerts", { exact: true })).toHaveCount(2);
    await expect(page.locator("#alerts").getByRole("heading", { name: /Find your place\s*up north\./ })).toHaveCount(1);
  });
});

// T-103: /buy has its own alert card, so "Get alerts" no longer leaves the
// page. JavaScript is on here, as for a real visitor, so the card hydrates.
test.describe("/buy's own alert card", () => {
  let leadPosts = 0;
  let trackEvents: string[] = [];
  test.beforeEach(async ({ page }) => {
    leadPosts = 0;
    trackEvents = [];
    await page.route("**/api/track", (r) => {
      trackEvents.push(JSON.parse(r.request().postData() ?? "{}").event);
      return r.fulfill({ status: 204 });
    });
    await page.route("**/api/lead", (r) => {
      leadPosts += 1;
      return r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"accepted":true}' });
    });
  });

  test("Get alerts scrolls to the card on /buy and the URL stays /buy#alerts", async ({ page }) => {
    await page.goto("/buy");
    const line = page.getByText("Want new listings sent to you first? Get alerts", { exact: true });
    await expect(line).toHaveCount(1);
    await line.getByRole("link", { name: "Get alerts" }).click();
    await page.waitForURL(/\/buy#alerts$/);
    expect(new URL(page.url()).pathname).toBe("/buy");
    const target = page.locator("#alerts");
    await expect(target).toHaveCount(1);
    await expect(
      target.getByRole("heading", { name: "Get new Ozaukee County listings first" }),
    ).toHaveCount(1);
    // scroll-mt-20 puts the card 80px under the top of the window.
    await expect
      .poll(() => target.evaluate((el) => Math.round(el.getBoundingClientRect().top)))
      .toBe(80);
  });

  test("the card's Town dropdown lists the homepage's seven towns in order", async ({ page }) => {
    await page.goto("/buy");
    const select = page.locator("#alerts").getByLabel("Town", { exact: true });
    await expect(select.locator("option")).toHaveText([
      "Choose a town",
      "Cedarburg",
      "Mequon",
      "Thiensville",
      "Grafton",
      "Port Washington",
      "Saukville",
      "Ozaukee County",
    ]);
  });

  test("submitting without a town shows Choose a town and posts no lead", async ({ page }) => {
    await page.goto("/buy");
    const card = page.locator("#alerts");
    // The card's own view event means it has hydrated, so the click below
    // reaches react-hook-form rather than a native form submit.
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => trackEvents).toContain("listing_alert_view");
    await card.getByLabel("First name").fill("Jamie");
    await card.getByLabel("Last name").fill("Rivera");
    await card.getByLabel("Email").fill("buyer@example.com");
    await card.getByLabel(/I agree to the/).check();
    await card.getByRole("button", { name: "Get Ozaukee County listings" }).click();
    await expect(card.getByRole("alert")).toHaveText("Choose a town");
    expect(leadPosts).toBe(0);
  });
});

// With JavaScript on, the click goes straight through, no dialog ever opens,
// and search_outbound reaches dataLayer with where the link sits.
test.describe("Listings links record the click and never gate it", () => {
  type Pushed = { name: unknown; props: Record<string, unknown> | undefined };

  // Runs without the live tags: gtag.js and the Meta pixel are blocked, and a
  // stand-in gtag pushes onto dataLayer exactly as the snippet in Pixels.tsx
  // does. Each push is also reported to the test, because the click navigates
  // away and the page's own dataLayer goes with it.
  async function watchClicks(page: import("@playwright/test").Page, opts: { gtagThrows?: boolean } = {}) {
    const pushed: Pushed[] = [];
    await page.exposeFunction("__pwDataLayerPush", (entry: Pushed) => {
      pushed.push(entry);
    });
    await page.addInitScript((gtagThrows: boolean) => {
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
        if (gtagThrows) throw new Error("tag manager broke");
      };
    }, opts.gtagThrows ?? false);
    await page.route("https://www.googletagmanager.com/**", (r) => r.abort());
    await page.route("https://connect.facebook.net/**", (r) => r.abort());
    await page.route("**/api/track", (r) => r.fulfill({ status: 204 }));
    let leadPosted = false;
    await page.route("**/api/lead", (r) => {
      leadPosted = true;
      return r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.route("https://exsellexperts.com/**", (r) => r.abort());
    return { pushed, leadPosted: () => leadPosted };
  }

  // TrackingInit's page_view goes out from an effect, which runs only once the
  // page has hydrated, so after it the links' click handlers are attached.
  async function gotoHydrated(page: import("@playwright/test").Page, path: string) {
    const pageView = page.waitForRequest((r) => r.url().endsWith("/api/track"));
    await page.goto(path);
    await pageView;
  }

  for (const row of LISTING_LINKS) {
    test(`${row.path} "${row.text}" fires search_outbound and opens no dialog`, async ({ page }) => {
      const watch = await watchClicks(page);
      await gotoHydrated(page, row.path);
      const link = listingLink(page, row);
      await link.scrollIntoViewIfNeeded();

      const outbound = page.waitForRequest((r) => r.url().startsWith("https://exsellexperts.com/"), {
        timeout: 10_000,
      });
      await link.click();
      expectListingSearch((await outbound).url(), row);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(watch.leadPosted()).toBe(false);
      await expect
        .poll(() => watch.pushed.filter((e) => e.name === "search_outbound").map((e) => e.props))
        .toEqual([{ town: row.key, source: "direct", placement: row.term }]);
      const gateEvents = watch.pushed.filter((e) => String(e.name).startsWith("search_gate_"));
      expect(gateEvents).toEqual([]);
    });
  }

  test("a tracking error does not stop the link", async ({ page }) => {
    const watch = await watchClicks(page, { gtagThrows: true });
    await gotoHydrated(page, "/search/grafton-homes-for-sale");
    const link = page.getByRole("link", { name: "See all Grafton homes for sale", exact: true });
    const outbound = page.waitForRequest((r) => r.url().startsWith("https://exsellexperts.com/"), {
      timeout: 10_000,
    });
    await link.click();
    expect(new URL((await outbound).url()).pathname).toBe("/properties/city-Grafton,%20WI/");
    await expect.poll(() => watch.pushed.some((e) => e.name === "search_outbound")).toBe(true);
  });

  test("the key the old gate left in localStorage is cleared", async ({ page }) => {
    await page.goto("/about");
    await page.evaluate(() => localStorage.setItem("as_gate_seen", String(Date.now() + 1e9)));
    await page.goto("/");
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("as_gate_seen")))
      .toBeNull();
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

  // T-104: Google only allows FAQ markup for questions shown on the page, so
  // /home-value shows these three, word for word, and its JSON-LD says the same.
  const HOME_VALUE_FAQS = [
    {
      q: "Is the home value really free?",
      a: "Yes. No cost and no obligation. You get a price range and the nearby sales I based it on.",
    },
    {
      q: "How is this different from an online estimate?",
      a: "Online estimates are an algorithm guessing from public records. I look at what actually sold near you, plus the condition and updates you tell me about, and I send a range with the reasons behind it.",
    },
    {
      q: "Do I have to list with you?",
      a: "No. Use the number however you want. If you ever want to talk about selling, call or text me at (262) 483-7932.",
    },
  ];

  type GraphNode = {
    "@type": string;
    mainEntity?: { name: string; acceptedAnswer: { text: string } }[];
  };

  async function serverGraph(request: APIRequestContext) {
    const html = await (await request.get("/home-value")).text();
    const blocks = [
      ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
    ];
    return blocks.flatMap((b) => (JSON.parse(b[1])["@graph"] ?? []) as GraphNode[]);
  }

  test("/home-value's server HTML carries FAQPage beside its other schema", async ({ request }) => {
    const graph = await serverGraph(request);
    expect(graph.map((n) => n["@type"]).sort()).toEqual([
      "BreadcrumbList",
      "FAQPage",
      "RealEstateAgent",
      "RealEstateOrganization",
      "Service",
      "WebPage",
    ]);
    const faq = graph.find((n) => n["@type"] === "FAQPage");
    expect(
      faq?.mainEntity?.map((m) => ({ q: m.name, a: m.acceptedAnswer.text })),
    ).toEqual(HOME_VALUE_FAQS);
  });

  test("/home-value shows the same three questions above the footer, with the cell linked", async ({
    page,
    request,
  }) => {
    await page.route("**/api/track", (r) => r.fulfill({ status: 204 }));
    await page.route("**/api/lead", (r) => r.abort());
    const graph = await serverGraph(request);
    const faq = graph.find((n) => n["@type"] === "FAQPage");

    await page.goto("/home-value");
    const section = page.locator("#faq");
    await expect(section.getByRole("heading", { level: 2 })).toHaveText("Questions");
    const questions = section.getByRole("heading", { level: 3 });
    await expect(questions).toHaveText(HOME_VALUE_FAQS.map((f) => f.q));
    const answers = section.locator("h3 + p");
    await expect(answers).toHaveCount(3);
    for (const [i, f] of HOME_VALUE_FAQS.entries()) {
      // Each visible pair is exactly what the JSON-LD says.
      expect(await questions.nth(i).textContent()).toBe(faq?.mainEntity?.[i].name);
      expect((await answers.nth(i).textContent())?.trim()).toBe(f.a);
      expect((await answers.nth(i).textContent())?.trim()).toBe(
        faq?.mainEntity?.[i].acceptedAnswer.text,
      );
    }

    const cell = answers.nth(2).locator('a[href="tel:+12624837932"]');
    await expect(cell).toHaveText("(262) 483-7932");

    // One h1 for the page, and the questions come after it and before the footer.
    await expect(page.locator("h1")).toHaveCount(1);
    const order = await section.evaluate((s) => {
      const h1 = document.querySelector("h1")!;
      const footer = document.querySelector("footer")!;
      return {
        afterH1: Boolean(h1.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING),
        beforeFooter: Boolean(s.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    });
    expect(order).toEqual({ afterH1: true, beforeFooter: true });
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
