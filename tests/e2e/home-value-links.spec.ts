import { createClient } from "@supabase/supabase-js";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { CONTENT_DATE as HOME } from "../../src/app/content-date";
import { CONTENT_DATE as BUY } from "../../src/app/buy/content-date";
import { CONTENT_DATE as HOME_VALUE } from "../../src/app/home-value/content-date";
import { CONTENT_DATE as ABOUT } from "../../src/app/about/content-date";
import { CONTENT_DATE as NORTHWOODS } from "../../src/app/northwoods/content-date";
import { CONTENT_DATE as PRIVACY } from "../../src/app/privacy/content-date";
import { CONTENT_DATE as TERMS } from "../../src/app/terms/content-date";
import { CONTENT_DATE as FAIR_HOUSING } from "../../src/app/fair-housing/content-date";

// T-092: the town pages, the four seller guides and /buy each carry one
// sentence in their copy that links to /home-value, and the sitemap gives the
// nine core pages their own lastmod instead of one shared build time.
//
// The pages are read as server HTML through the request fixture, the HTML a
// crawler reads. Script tags are cut first, because the RSC payload repeats
// the same copy, and React's <!-- --> separators between text nodes go too.
// The towns and guides are written out rather than imported, so a page
// missing from the code cannot also drop out of the expectation.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL);

const TOWNS: [slug: string, sentence: string][] = [
  ["cedarburg", "Selling a Cedarburg home before you buy?"],
  ["mequon", "Selling a Mequon home before you buy?"],
  ["thiensville", "Selling a Thiensville home before you buy?"],
  ["grafton", "Selling a Grafton home before you buy?"],
  ["port-washington", "Selling a Port Washington home before you buy?"],
  ["saukville", "Selling a Saukville home before you buy?"],
  ["ozaukee-county", "Selling an Ozaukee County home before you buy?"],
];
const GUIDES = [
  "/search/selling-a-house-during-divorce-wisconsin",
  "/search/selling-an-inherited-house-wisconsin",
  "/search/selling-before-foreclosure-wisconsin",
  "/search/downsizing-in-wisconsin",
];

const TOWN_LINK = '<a class="[^"]*" href="/home-value">See what your home is worth</a>.';
const GUIDE =
  'Want a straight number before you decide anything\\? <a class="[^"]*" href="/home-value">Get my free home value</a>, personally prepared within 24 hours.';
const BUY_LINE =
  'Need to sell first\\? <a class="[^"]*" href="/home-value">Find out what your home is worth</a>.';

async function copy(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path, { maxRedirects: 0 });
  expect(res.status(), `${path} status`).toBe(200);
  return (await res.text())
    .replace(/<script\b[\s\S]*?<\/script>/g, "")
    .replace(/<!-- -->/g, "");
}

const count = (html: string, pattern: string) =>
  (html.match(new RegExp(pattern, "g")) ?? []).length;

const townLine = (sentence: string) => `${sentence.replace("?", "\\?")} ${TOWN_LINK}`;
const ANY_TOWN_LINE = `Selling an? [A-Z][A-Za-z ]+ home before you buy\\? ${TOWN_LINK}`;

test.describe("The home value sentence, in the server HTML", () => {
  for (const [town, sentence] of TOWNS) {
    test(`/search/${town}-homes-for-sale has the town sentence once, linking to /home-value`, async ({
      request,
    }) => {
      const html = await copy(request, `/search/${town}-homes-for-sale`);
      expect(count(html, townLine(sentence))).toBe(1);
      expect(count(html, ANY_TOWN_LINE)).toBe(1);
      expect(count(html, GUIDE)).toBe(0);
      // It follows the listing alert card, and the FAQ follows it.
      const at = html.search(new RegExp(townLine(sentence)));
      expect(html.indexOf('id="alerts"')).toBeLessThan(at);
      expect(html.indexOf("questions, answered")).toBeGreaterThan(at);
    });

    test(`/search/${town}-home-value has neither sentence`, async ({ request }) => {
      const html = await copy(request, `/search/${town}-home-value`);
      expect(count(html, ANY_TOWN_LINE)).toBe(0);
      expect(count(html, GUIDE)).toBe(0);
    });
  }

  for (const path of GUIDES) {
    test(`${path} has the guide sentence once, at the end of its first section`, async ({
      request,
    }) => {
      const html = await copy(request, path);
      expect(count(html, GUIDE)).toBe(1);
      expect(count(html, ANY_TOWN_LINE)).toBe(0);
      // A guide's first section may be an intro with no heading, so at most
      // one heading comes before it, and the next one is still the body's,
      // not the market snapshot or the questions that follow the body.
      const at = html.search(new RegExp(GUIDE));
      const h2s = [...html.matchAll(/<h2\b[^>]*>([^<]*)<\/h2>/g)];
      expect(h2s.filter((m) => m.index! < at).length).toBeLessThanOrEqual(1);
      const next = h2s.find((m) => m.index! > at)?.[1];
      expect(next, "a body section follows").toBeDefined();
      expect(next).not.toMatch(/Common questions|market snapshot/);
    });
  }

  test("/buy has the sell first sentence once, after the buyer questions", async ({
    request,
  }) => {
    const html = await copy(request, "/buy");
    expect(count(html, BUY_LINE)).toBe(1);
    const at = html.search(new RegExp(BUY_LINE));
    expect(html.indexOf("Buyer questions, answered")).toBeLessThan(at);
    expect(html.indexOf("<footer")).toBeGreaterThan(at);
  });

  test("/about's Ask for my home value button points at /home-value", async ({
    request,
  }) => {
    const html = await copy(request, "/about");
    expect(html).toMatch(/<a [^>]*href="\/home-value"[^>]*><span>Ask for my home value<\/span>/);
  });
});

test.describe("The home value sentence, on fixture pages", () => {
  test.skip(!isLocal, "fixture rows are served by the local dev server only");

  test("a city page with body gets the town sentence after the alert card, and no guide sentence", async ({
    request,
  }) => {
    const html = await copy(request, "/search/e2e-fixture-city");
    const at = html.search(new RegExp(townLine("Selling a Cedarburg home before you buy?")));
    expect(at).toBeGreaterThan(-1);
    expect(html.indexOf('id="alerts"')).toBeLessThan(at);
    expect(html.indexOf("Cedarburg questions, answered")).toBeGreaterThan(at);
    expect(count(html, GUIDE)).toBe(0);
  });

  test("a guide gets the guide sentence after its first section, not at the end of the body", async ({
    request,
  }) => {
    const html = await copy(request, "/search/e2e-fixture-guide");
    const at = html.search(new RegExp(GUIDE));
    expect(at).toBeGreaterThan(html.indexOf("Fixture guide body paragraph."));
    expect(at).toBeLessThan(html.indexOf("Fixture guide second heading"));
    expect(count(html, GUIDE)).toBe(1);
    expect(count(html, ANY_TOWN_LINE)).toBe(0);
  });
});

test.describe("Sitemap lastmod", () => {
  const CORE: [path: string, date: string][] = [
    ["/", HOME],
    ["/buy", BUY],
    ["/home-value", HOME_VALUE],
    ["/about", ABOUT],
    ["/northwoods", NORTHWOODS],
    ["/privacy", PRIVACY],
    ["/terms", TERMS],
    ["/fair-housing", FAIR_HOUSING],
  ];

  async function entries(request: APIRequestContext) {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    return new Map(
      [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)].map(
        (m) => [new URL(m[1]).pathname, m[2]] as const,
      ),
    );
  }

  test("keeps 27 or more URLs, with no lastmod shared by nine of them", async ({ request }) => {
    const map = await entries(request);
    expect(map.size).toBeGreaterThanOrEqual(27);
    const ties = new Map<string, number>();
    for (const d of map.values()) if (d) ties.set(d, (ties.get(d) ?? 0) + 1);
    expect(Math.max(...ties.values())).toBeLessThan(9);
  });

  test("each core page's lastmod is the content date beside it", async ({ request }) => {
    const map = await entries(request);
    for (const [path, date] of CORE) {
      expect(map.get(path), path).toBe(date);
    }
  });

  test("each property page's lastmod is its listing's updated time", async ({ request }) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(!url || !key, "needs the Supabase env from .env.local to read the listings");
    const { data, error } = await createClient(url!, key!)
      .from("properties")
      .select("slug,updated_at")
      .in("status", ["coming_soon", "active", "pending", "sold"]);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);

    const map = await entries(request);
    for (const row of data!) {
      const lastmod = map.get(`/property/${row.slug}`);
      expect(lastmod, row.slug).toBeDefined();
      expect(Date.parse(lastmod!), row.slug).toBe(Date.parse(row.updated_at));
    }
  });
});
