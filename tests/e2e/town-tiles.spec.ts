import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Locator, type Page } from "@playwright/test";

// T-094: "[Town] homes for sale now" on the seven /search/*-homes-for-sale
// pages. The page's own town is one big tile, its neighbors smaller tiles
// under it, and every tile is a plain link to that town's live search on
// exsellexperts.com with utm_term=town_tiles. No tile carries a home count.
//
// The searches and the neighbors are written out here rather than read from
// the code, so a wrong entry in the code cannot also be the expectation.
//
// /api/track and /api/lead are always stubbed in the browser tests: `next dev`
// reads .env.local, which is the live Supabase. Events are proven by the
// stubbed request.

const SEARCH_PATH: Record<string, string> = {
  cedarburg: "/properties/city-Cedarburg,%20WI/",
  mequon: "/properties/city-Mequon,%20WI/",
  thiensville: "/properties/place-Thiensville,%20WI/",
  grafton: "/properties/city-Grafton,%20WI/",
  "port-washington": "/properties/city-Port%20Washington,%20WI/",
  saukville: "/properties/city-Saukville,%20WI/",
  "ozaukee-county": "/properties/county-Ozaukee,%20WI/",
};

const NAME: Record<string, string> = {
  cedarburg: "Cedarburg",
  mequon: "Mequon",
  thiensville: "Thiensville",
  grafton: "Grafton",
  "port-washington": "Port Washington",
  saukville: "Saukville",
  "ozaukee-county": "Ozaukee County",
};

// Each page's own town first, then its neighbors in the order shown.
const PAGES: [town: string, neighbors: string[]][] = [
  ["cedarburg", ["grafton", "mequon", "thiensville"]],
  ["mequon", ["thiensville", "cedarburg", "grafton"]],
  ["thiensville", ["mequon", "cedarburg", "grafton"]],
  ["grafton", ["cedarburg", "saukville", "port-washington"]],
  ["port-washington", ["saukville", "grafton", "cedarburg"]],
  ["saukville", ["port-washington", "grafton", "cedarburg"]],
  [
    "ozaukee-county",
    ["cedarburg", "mequon", "thiensville", "grafton", "port-washington", "saukville"],
  ],
];

// Pages that must not get tiles: every home value page and the four guides.
const NO_TILES = [
  ...Object.keys(NAME).map((t) => `/search/${t}-home-value`),
  "/search/selling-a-house-during-divorce-wisconsin",
  "/search/selling-an-inherited-house-wisconsin",
  "/search/selling-before-foreclosure-wisconsin",
  "/search/downsizing-in-wisconsin",
];

const COUNT_COPY = /[0-9,]+ active homes?|as of [A-Z][a-z]{2} [0-9]/;

const count = (html: string, s: string) => html.split(s).length - 1;

function expectSearch(href: string | null, town: string) {
  const url = new URL(href ?? "");
  expect(url.origin).toBe("https://exsellexperts.com");
  expect(url.pathname).toBe(SEARCH_PATH[town]);
  expect(url.searchParams.get("listingType")).toBe("Residential");
  expect(url.searchParams.get("status")).toBe("Active");
  expect(url.searchParams.get("utm_content")).toBe(town);
  expect(url.searchParams.getAll("utm_term")).toEqual(["town_tiles"]);
}

function tiles(page: Page): Locator {
  return page.locator('section[aria-labelledby="town-tiles-heading"]');
}

// The tile link around a town's h3.
function tile(section: Locator, name: string): Locator {
  return section
    .locator("a")
    .filter({ has: section.page().getByRole("heading", { name, exact: true, level: 3 }) });
}

type Sent = { event: string; properties?: Record<string, unknown> };

// Stubs every write, and records each /api/track body as it arrives.
async function stubWrites(page: Page) {
  const sent: Sent[] = [];
  await page.route("**/api/track", (route) => {
    sent.push(JSON.parse(route.request().postData() ?? "{}"));
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/lead", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }),
  );
  await page.route("https://www.googletagmanager.com/**", (r) => r.abort());
  await page.route("https://connect.facebook.net/**", (r) => r.abort());
  await page.route("https://exsellexperts.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/html", body: "<title>search</title>" }),
  );
  return (event: string) => sent.filter((s) => s.event === event).map((s) => s.properties);
}

// TrackingInit's page_view goes out from an effect, so once it has reached
// the stub the page has hydrated and the click handlers are attached.
async function gotoHydrated(page: Page, path: string) {
  const pageView = page.waitForRequest((r) => r.url().endsWith("/api/track"));
  await page.goto(path);
  await pageView;
}

test.describe("Town tiles, in the server HTML", () => {
  for (const [town, neighbors] of PAGES) {
    test(`${town}: one heading, ${neighbors.length + 1} tile links, and the rest as T-088 left it`, async ({
      request,
    }) => {
      const html = await (await request.get(`/search/${town}-homes-for-sale`)).text();
      // Counted in the whole response, so a copy in the RSC payload counts too.
      expect(count(html, `${NAME[town]} homes for sale now`)).toBe(1);
      expect(count(html, "utm_term=town_tiles")).toBe(neighbors.length + 1);
      expect(html).not.toMatch(COUNT_COPY);
      // The hero button keeps its own placement, and the alert card its id.
      expect(count(html, "utm_term=town_page")).toBe(1);
      expect(count(html, 'id="alerts"')).toBe(1);
    });
  }

  for (const path of NO_TILES) {
    test(`${path} has no town tiles`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(count(html, "utm_term=town_tiles")).toBe(0);
      expect(html).not.toContain("homes for sale now");
      expect(html).not.toContain("town-tiles-heading");
    });
  }
});

test.describe("Town tiles, with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  for (const [town, neighbors] of PAGES) {
    test(`${town}: its own town big, then ${neighbors.join(", ")}`, async ({ page }) => {
      await page.goto(`/search/${town}-homes-for-sale`);
      const section = tiles(page);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(section.getByRole("heading", { level: 2 })).toHaveText(
        `${NAME[town]} homes for sale now`,
      );
      // Above the first content section: no other h2 on the page comes first.
      await expect(page.locator("main h2").first()).toHaveAttribute("id", "town-tiles-heading");

      const order = [town, ...neighbors];
      await expect(section.getByRole("heading", { level: 3 })).toHaveText(
        order.map((t) => NAME[t]),
      );
      const links = section.locator("a");
      await expect(links).toHaveCount(order.length);
      for (let i = 0; i < order.length; i++) {
        const link = links.nth(i);
        expectSearch(await link.getAttribute("href"), order[i]);
        await expect(link).toHaveText(new RegExp(`^${NAME[order[i]]}\\s*See homes$`));
        await expect(link.locator("img")).toHaveCount(0);
      }

      // One big tile, then the smaller ones under it.
      const big = (await links.nth(0).boundingBox())!;
      const small = (await links.nth(1).boundingBox())!;
      expect(big.width).toBeGreaterThan(small.width * 1.8);
      expect(small.y).toBeGreaterThan(big.y + big.height - 1);
    });
  }
});

test.describe("Town tiles, with JavaScript on", () => {
  test("has no axe violations in the section", async ({ page }) => {
    await stubWrites(page);
    await page.goto("/search/cedarburg-homes-for-sale");
    const results = await new AxeBuilder({ page })
      .include('section[aria-labelledby="town-tiles-heading"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  for (const [path, town] of [
    ["/search/cedarburg-homes-for-sale", "grafton"],
    ["/search/ozaukee-county-homes-for-sale", "ozaukee-county"],
  ] as const) {
    test(`a click on ${NAME[town]} on ${path} sends search_outbound and still opens the search`, async ({
      page,
    }) => {
      const sent = await stubWrites(page);
      await gotoHydrated(page, path);
      const link = tile(tiles(page), NAME[town]);
      await link.scrollIntoViewIfNeeded();
      await link.click();
      // The click was not stopped: the browser went to the search.
      await page.waitForURL((u) => u.origin === "https://exsellexperts.com");
      expectSearch(page.url(), town);
      await expect
        .poll(() => sent("search_outbound"))
        .toEqual([{ town, source: "direct", placement: "town_tiles" }]);
    });
  }
});
