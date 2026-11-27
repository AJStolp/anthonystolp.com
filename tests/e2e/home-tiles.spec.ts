import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Locator, type Page } from "@playwright/test";

// T-089: "Homes for sale now", the town tiles right under the homepage hero.
// Every tile is a plain link to the town's live search on exsellexperts.com,
// and no tile carries a home count.
//
// The searches are written out here rather than read from listing-search.ts,
// so a wrong key in the code cannot also be the expectation.
//
// /api/track and /api/lead are always stubbed: `next dev` reads .env.local,
// which is the live Supabase. Events are proven by the stubbed request.

const SEARCH: Record<string, { pathname: string; listingType: "Residential" | "Land" }> = {
  cedarburg: { pathname: "/properties/city-Cedarburg,%20WI/", listingType: "Residential" },
  mequon: { pathname: "/properties/city-Mequon,%20WI/", listingType: "Residential" },
  thiensville: { pathname: "/properties/place-Thiensville,%20WI/", listingType: "Residential" },
  grafton: { pathname: "/properties/city-Grafton,%20WI/", listingType: "Residential" },
  "port-washington": { pathname: "/properties/city-Port%20Washington,%20WI/", listingType: "Residential" },
  saukville: { pathname: "/properties/city-Saukville,%20WI/", listingType: "Residential" },
  "ozaukee-county": { pathname: "/properties/county-Ozaukee,%20WI/", listingType: "Residential" },
  "marinette-homes": { pathname: "/properties/county-Marinette,%20WI/", listingType: "Residential" },
  "marinette-land": { pathname: "/properties/county-Marinette,%20WI/", listingType: "Land" },
};

const TOWNS: [key: string, name: string][] = [
  ["cedarburg", "Cedarburg"],
  ["mequon", "Mequon"],
  ["thiensville", "Thiensville"],
  ["grafton", "Grafton"],
  ["port-washington", "Port Washington"],
  ["saukville", "Saukville"],
  ["ozaukee-county", "Ozaukee County"],
];

// The alert dropdown: the tiles' seven, then the three Washington County towns
// (T-106), which have no homepage tile.
const ALERT_TOWNS = [...TOWNS.map(([, name]) => name), "West Bend", "Hartford", "Germantown"];

const COUNT_COPY = /[0-9,]+ active homes?|as of [A-Z][a-z]{2} [0-9]/;

function expectSearch(href: string | null, key: string) {
  const url = new URL(href ?? "");
  expect(url.origin).toBe("https://exsellexperts.com");
  expect(url.pathname).toBe(SEARCH[key].pathname);
  expect(url.searchParams.get("listingType")).toBe(SEARCH[key].listingType);
  expect(url.searchParams.get("status")).toBe("Active");
  expect(url.searchParams.get("utm_content")).toBe(key);
  expect(url.searchParams.getAll("utm_term")).toEqual(["home_tiles"]);
}

// The tile link around a town's h3.
function tile(homes: Locator, name: string) {
  return homes
    .locator("a")
    .filter({ has: homes.page().getByRole("heading", { name, exact: true, level: 3 }) });
}

type Sent = { event: string; properties?: Record<string, unknown> };

// Stubs every write, and records each /api/track and /api/lead body as it
// arrives. The lead stub answers as a real sign up does, accepted.
async function stubWrites(page: Page) {
  const sent: Sent[] = [];
  const leads: Record<string, unknown>[] = [];
  await page.route("**/api/track", (route) => {
    sent.push(JSON.parse(route.request().postData() ?? "{}"));
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/lead", (route) => {
    leads.push(JSON.parse(route.request().postData() ?? "{}"));
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"ok":true,"accepted":true}',
    });
  });
  await page.route("https://www.googletagmanager.com/**", (r) => r.abort());
  await page.route("https://connect.facebook.net/**", (r) => r.abort());
  await page.route("https://exsellexperts.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/html", body: "<title>search</title>" }),
  );
  const named = (event: string) =>
    sent.filter((s) => s.event === event).map((s) => s.properties);
  return Object.assign(named, { leads });
}

// TrackingInit's page_view goes out from an effect, so once it has reached
// the stub the page has hydrated and the click handlers are attached.
async function gotoHydrated(page: Page, path: string) {
  const pageView = page.waitForRequest((r) => r.url().endsWith("/api/track"));
  await page.goto(path);
  await pageView;
}

test.describe("Homes for sale now, in the server HTML", () => {
  test("has the one #homes, every tile link, and no count", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html.match(/id="homes"/g)).toHaveLength(1);
    expect(html).toContain("Homes for sale now");
    expect(html).toContain("Every active home on the MLS, no sign up needed. Pick a town.");
    expect(html.match(/utm_term=home_tiles/g)?.length).toBeGreaterThanOrEqual(9);
    expect(html).not.toMatch(COUNT_COPY);
    expect(html).toContain('href="#homes"');
  });
});

test.describe("Homes for sale now, with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("sits right under the hero, towns in order, each one link to its search", async ({ page }) => {
    await page.goto("/");
    const homes = page.locator("section#homes");
    // The first section after the hero, and the hero's h1 is the only one.
    await expect(page.locator("main > section").nth(1)).toHaveAttribute("id", "homes");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(homes.getByRole("heading", { level: 2 }).first()).toHaveText("Homes for sale now");
    await expect(homes.getByRole("heading", { level: 3 })).toHaveText([
      ...TOWNS.map(([, name]) => name),
      "Northwoods",
    ]);

    for (const [key, name] of TOWNS) {
      const link = tile(homes, name);
      await expect(link).toHaveCount(1);
      expectSearch(await link.getAttribute("href"), key);
      await expect(link).toHaveText(new RegExp(`^${name}\\s*See homes$`));
      // The photo slot is a color block, not an image.
      await expect(link.locator("img")).toHaveCount(0);
    }
  });

  test("Ozaukee County runs the full width under the six towns", async ({ page }) => {
    await page.goto("/");
    const homes = page.locator("section#homes");
    const county = (await tile(homes, "Ozaukee County").boundingBox())!;
    const cedarburg = (await tile(homes, "Cedarburg").boundingBox())!;
    const saukville = (await tile(homes, "Saukville").boundingBox())!;
    expect(county.y).toBeGreaterThan(saukville.y + saukville.height - 1);
    expect(county.width).toBeGreaterThan(cedarburg.width * 1.8);
  });

  test("each buyer guide sits under its tile, outside the tile's link", async ({ page }) => {
    await page.goto("/");
    const homes = page.locator("section#homes");
    for (const [key, name] of TOWNS) {
      const guide = homes.getByRole("link", { name: `${name} buyer guide`, exact: true });
      await expect(guide).toHaveAttribute("href", `/search/${key}-homes-for-sale`);
      await expect(guide.locator("xpath=ancestor::a")).toHaveCount(0);
      const below = (await guide.boundingBox())!;
      const above = (await tile(homes, name).boundingBox())!;
      expect(below.y).toBeGreaterThanOrEqual(above.y + above.height - 1);
    }
  });

  test("the Northwoods tile has homes and cabins, land, and the guide", async ({ page }) => {
    await page.goto("/");
    const homes = page.locator("section#homes");
    await expect(homes.getByText("Homes, cabins and land in Marinette County", { exact: true })).toHaveCount(1);
    expectSearch(
      await homes.getByRole("link", { name: "See homes and cabins", exact: true }).getAttribute("href"),
      "marinette-homes",
    );
    expectSearch(
      await homes.getByRole("link", { name: "See land", exact: true }).getAttribute("href"),
      "marinette-land",
    );
    await expect(homes.getByRole("link", { name: "Northwoods guide", exact: true })).toHaveAttribute(
      "href",
      "/northwoods",
    );
  });

  test("ends with the alert line and today's alert card", async ({ page }) => {
    await page.goto("/");
    const homes = page.locator("section#homes");
    await expect(
      homes.getByText("Want new listings in your town sent to you first?", { exact: true }),
    ).toHaveCount(1);
    await expect(
      homes.getByRole("heading", { name: "Get new Ozaukee County listings first", level: 2 }),
    ).toHaveCount(1);
  });
});

test.describe("Homes for sale now, with JavaScript on", () => {
  test("has no axe violations in the section", async ({ page }) => {
    await stubWrites(page);
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .include("#homes")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  for (const [key, name] of [
    ["cedarburg", "Cedarburg"],
    ["ozaukee-county", "Ozaukee County"],
  ] as const) {
    test(`a click on ${name} sends search_outbound and still opens the search`, async ({ page }) => {
      const sent = await stubWrites(page);
      await gotoHydrated(page, "/");
      const link = tile(page.locator("section#homes"), name);
      await link.scrollIntoViewIfNeeded();
      await link.click();
      // The click was not stopped: the browser went to the search.
      await page.waitForURL((u) => u.origin === "https://exsellexperts.com");
      expectSearch(page.url(), key);
      await expect
        .poll(() => sent("search_outbound"))
        .toEqual([{ town: key, source: "direct", placement: "home_tiles" }]);
    });
  }

  test("a click on See land sends search_outbound and opens the land search", async ({ page }) => {
    const sent = await stubWrites(page);
    await gotoHydrated(page, "/");
    const link = page.locator("section#homes").getByRole("link", { name: "See land", exact: true });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await page.waitForURL((u) => u.origin === "https://exsellexperts.com");
    expectSearch(page.url(), "marinette-land");
    await expect
      .poll(() => sent("search_outbound"))
      .toEqual([{ town: "marinette-land", source: "direct", placement: "home_tiles" }]);
  });

  test("home_tiles_view is sent once a page view, however often the section scrolls by", async ({ page }) => {
    const sent = await stubWrites(page);
    await gotoHydrated(page, "/");
    const homes = page.locator("section#homes");
    await homes.scrollIntoViewIfNeeded();
    await expect.poll(() => sent("home_tiles_view")).toEqual([{ page_path: "/" }]);

    // Away and back, twice.
    for (let i = 0; i < 2; i++) {
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await homes.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }
    expect(sent("home_tiles_view")).toHaveLength(1);

    // A new page view counts again.
    await gotoHydrated(page, "/");
    await page.locator("section#homes").scrollIntoViewIfNeeded();
    await expect.poll(() => sent("home_tiles_view").length).toBe(2);
  });
});

test.describe("The hero's See homes for sale button", () => {
  // Samples the scroll position on every frame after the click, until it has
  // held still for 60 frames. A fixed frame count is not a fixed time:
  // headless Chromium draws 120 frames a second, so 120 frames was one second
  // and the glide takes nearly two, and whether the test read the end or the
  // middle came down to when expect.poll looked. The cap stops a glide that
  // never settles from sampling forever.
  async function scrollPath(page: Page) {
    await stubWrites(page);
    await gotoHydrated(page, "/");
    await page.evaluate(() => {
      const w = window as unknown as { __ys: number[]; __done: boolean };
      w.__ys = [];
      w.__done = false;
      let still = 0;
      const tick = () => {
        const y = window.scrollY;
        still = w.__ys.length > 0 && y === w.__ys[w.__ys.length - 1] ? still + 1 : 0;
        w.__ys.push(y);
        if (still >= 60 || w.__ys.length >= 900) w.__done = true;
        else requestAnimationFrame(tick);
      };
      document
        .querySelector('a[href="#homes"]')!
        .addEventListener("click", () => requestAnimationFrame(tick));
    });
    await page
      .locator("section")
      .filter({ has: page.locator("h1") })
      .getByRole("link", { name: "See homes for sale", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __done: boolean }).__done))
      .toBe(true);
    const ys = await page.evaluate(() => (window as unknown as { __ys: number[] }).__ys);
    const top = await page.locator("section#homes").evaluate((el) => el.getBoundingClientRect().top);
    return { ys, top };
  }

  test("glides to the tiles and stops under the fixed nav", async ({ page }) => {
    const { ys, top } = await scrollPath(page);
    const end = ys[ys.length - 1];
    expect(end).toBeGreaterThan(0);
    expect(Math.abs(top - 80)).toBeLessThan(4);
    // Several frames on the way, and never a jump past and back.
    expect(new Set(ys.filter((y) => y > 0 && y < end - 1)).size).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1]);
  });

  test("jumps instead, for a visitor who asks for less motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { ys, top } = await scrollPath(page);
    const end = ys[ys.length - 1];
    expect(Math.abs(top - 80)).toBeLessThan(4);
    expect(ys.filter((y) => y > 0 && y < end - 1)).toEqual([]);
  });
});

// T-095: the homepage alert card asks which town; a town page's card does not.
test.describe("The homepage listing alert", () => {
  test("has a Town dropdown on the homepage, and none on a town page", async ({ request }) => {
    const home = await (await request.get("/")).text();
    expect(home).toContain(">Choose a town</option>");
    const town = await (await request.get("/search/cedarburg-homes-for-sale")).text();
    expect(town).toContain("Get new Cedarburg listings first");
    expect(town).not.toContain("Choose a town");
  });

  test.describe("with JavaScript off", () => {
    test.use({ javaScriptEnabled: false });

    test("the dropdown is labelled Town and lists the ten towns in order", async ({ page }) => {
      await page.goto("/");
      const select = page.locator("section#homes").getByLabel("Town", { exact: true });
      await expect(select).toHaveCount(1);
      await expect(select.locator("option")).toHaveText([
        "Choose a town",
        ...ALERT_TOWNS,
      ]);
    });
  });

  test("signs up for the town picked, Grafton, and sends listing_alert_lead with it", async ({ page }) => {
    const sent = await stubWrites(page);
    await gotoHydrated(page, "/");
    const card = page
      .locator("section#homes")
      .getByRole("region", { name: "Get new Ozaukee County listings first" });
    await card.scrollIntoViewIfNeeded();
    await card.getByLabel("Town", { exact: true }).selectOption("Grafton");
    await card.getByLabel("First name").fill("Jamie");
    await card.getByLabel("Last name").fill("Rivera");
    await card.getByLabel("Email").fill("buyer@example.com");
    await card.getByLabel(/I agree to the/).check();
    await card.getByRole("button", { name: "Get Ozaukee County listings" }).click();

    await expect(card.getByRole("status")).toContainText(
      "You're set. I'll set up your Grafton alert myself",
    );
    expect(sent.leads).toHaveLength(1);
    expect(sent.leads[0]).toMatchObject({
      source: "listing-alert",
      firstName: "Jamie",
      lastName: "Rivera",
      email: "buyer@example.com",
      town: "Grafton",
      termsConsent: true,
    });
    await expect.poll(() => sent("listing_alert_lead")).toEqual([{ town: "Grafton", page_path: "/" }]);
  });

  test("sends nothing until a town is picked, and says so on the dropdown", async ({ page }) => {
    const sent = await stubWrites(page);
    await gotoHydrated(page, "/");
    const card = page
      .locator("section#homes")
      .getByRole("region", { name: "Get new Ozaukee County listings first" });
    await card.scrollIntoViewIfNeeded();
    await card.getByLabel("First name").fill("Jamie");
    await card.getByLabel("Last name").fill("Rivera");
    await card.getByLabel("Email").fill("buyer@example.com");
    await card.getByLabel(/I agree to the/).check();
    await card.getByRole("button", { name: "Get Ozaukee County listings" }).click();

    const select = card.getByLabel("Town", { exact: true });
    await expect(card.getByRole("alert")).toHaveText("Choose a town");
    await expect(select).toHaveAttribute("aria-invalid", "true");
    const errorId = await card.getByRole("alert").getAttribute("id");
    await expect(select).toHaveAttribute("aria-describedby", errorId!);
    await expect(card.getByRole("status")).toBeEmpty();
    expect(sent.leads).toHaveLength(0);
    expect(sent("listing_alert_lead")).toEqual([]);
  });
});
