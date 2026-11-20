import { expect, test, type APIRequestContext } from "@playwright/test";

// Google finds pages by following links in the HTML it fetches, and on
// 2026-11-19 nothing it fetched linked to a city page or a seller guide, so
// only the homepage was indexed (T-043). These tests read the server HTML
// through the request fixture, which runs no JavaScript, because that is the
// HTML a crawler reads.
//
// The 18 slugs are written out here rather than imported from
// src/lib/communities.ts on purpose. They were checked against the live
// sitemap on 2026-11-20. Importing the list would let a dropped or misspelled
// entry change the expectation along with the bug.
const TOWNS: [slug: string, name: string][] = [
  ["cedarburg", "Cedarburg"],
  ["mequon", "Mequon"],
  ["thiensville", "Thiensville"],
  ["grafton", "Grafton"],
  ["port-washington", "Port Washington"],
  ["saukville", "Saukville"],
  ["ozaukee-county", "Ozaukee County"],
];
const CITY_PAGES = TOWNS.flatMap(([t]) => [
  `/search/${t}-homes-for-sale`,
  `/search/${t}-home-value`,
]);
const GUIDES = [
  "/search/selling-a-house-during-divorce-wisconsin",
  "/search/selling-an-inherited-house-wisconsin",
  "/search/selling-before-foreclosure-wisconsin",
  "/search/downsizing-in-wisconsin",
];
const CEDARBURG = "/search/cedarburg-homes-for-sale";

async function serverHtml(request: APIRequestContext, path: string) {
  const res = await request.get(path, { maxRedirects: 0 });
  expect(res.status(), `${path} status`).toBe(200);
  return res.text();
}

// Anchor attributes only. The RSC payload carries the same paths escaped
// inside script tags, which this pattern does not match.
function hrefs(html: string): Set<string> {
  return new Set(
    [...html.matchAll(/<a\b[^>]*\shref="([^"#?]+)/g)].map((m) => m[1]),
  );
}

test("the home page server HTML links to every city page and guide, and each returns 200", async ({
  request,
}) => {
  // One dev compile of /search/[slug] plus 18 Supabase backed renders.
  test.setTimeout(180_000);

  const html = await serverHtml(request, "/");
  const links = hrefs(html);
  const search = [...links].filter((h) => h.startsWith("/search/"));

  for (const path of [...CITY_PAGES, ...GUIDES]) {
    expect(links, `home page links to ${path}`).toContain(path);
  }
  expect(search.length).toBeGreaterThanOrEqual(18);

  // The anchor text is what tells Google what the page is about, so the
  // ticket fixes it as "{Town} homes for sale" and "{Town} home values".
  // Read only the Communities section: the footer carries the same links with
  // the same text and would otherwise pass this for it. React separates
  // adjacent text nodes with <!-- --> in server HTML.
  const start = html.indexOf('<section id="communities"');
  expect(start, "home page has a Communities section").toBeGreaterThan(-1);
  const anchors = html
    .slice(start, html.indexOf("</section>", start))
    .replace(/<!-- -->/g, "");
  for (const [slug, name] of TOWNS) {
    for (const [suffix, text] of [
      ["homes-for-sale", `${name} homes for sale`],
      ["home-value", `${name} home values`],
    ]) {
      const anchor = new RegExp(`<a\\b[^>]*href="/search/${slug}-${suffix}"[^>]*>${text}</a>`);
      expect(anchors, `"${text}" links to /search/${slug}-${suffix}`).toMatch(anchor);
    }
  }

  const statuses = await Promise.all(
    search.map(async (path) => {
      const res = await request.get(path, { maxRedirects: 0 });
      return [path, res.status()] as const;
    }),
  );
  expect(statuses.filter(([, s]) => s !== 200)).toEqual([]);
});

test("a city page links to every other city page, the guides, /buy and /about, with one skip link, main and h1", async ({
  request,
  page,
}) => {
  const links = hrefs(await serverHtml(request, CEDARBURG));
  const expected = [
    ...CITY_PAGES.filter((p) => p !== CEDARBURG),
    ...GUIDES,
    "/buy",
    "/about",
  ];
  for (const path of expected) {
    expect(links, `${CEDARBURG} links to ${path}`).toContain(path);
  }

  await page.goto(CEDARBURG);
  await expect(page.locator('a.skip-link[href="#main"]')).toHaveCount(1);
  await expect(page.locator("main#main")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
});

test("at 375px the home page community grid is one column", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const cards = page.locator("#communities li");
  await expect(cards).toHaveCount(TOWNS.length);

  const lefts = await cards.evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().left)),
  );
  expect(new Set(lefts).size, `card left edges: ${lefts.join(", ")}`).toBe(1);
});
