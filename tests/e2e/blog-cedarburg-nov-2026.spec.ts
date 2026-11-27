import { test, expect, type APIRequestContext } from "@playwright/test";
import { CONTENT_DATE } from "../../src/app/blog/cedarburg-market-nov-2026/content-date";

// T-105: the Cedarburg November 2026 market update was written as a draft but
// had no page, so /blog/cedarburg-market-nov-2026 was a 404. Every check reads
// the raw server HTML through the request fixture, which is what a crawler and
// the ticket's curl checks read. No browser runs and no JavaScript executes,
// so nothing here can reach /api/lead or /api/track.

const SITE_URL = "https://anthonystolp.com";
const AGENT_ID = `${SITE_URL}/#agent`;
const PATH = "/blog/cedarburg-market-nov-2026";
const URL = `${SITE_URL}${PATH}`;
const TITLE = "Cedarburg Market Update: November 2026";
const DESCRIPTION =
  "Cedarburg still favors sellers, but buyers have more listings than a year ago. Anthony Stolp breaks down October and November 2026 market numbers.";

// The draft is deleted in the same change that publishes it, so its figures
// and section headings are written out here. Each one was in the draft's body;
// a figure mistyped or dropped while copying it into the page fails the test.
const FIGURES = [
  "$499,900", "6.11%", "15.26%", "56 active listings", "35.90%", "26.19%",
  "31 days", "40.91%", "98% of asking", "1.53%", "$508,000",
  "November 5, 2026", "27 new listings", "40 homes", "2.5 months", "1.47 months",
  "$497,950", "$576,390", "24 days", "99.59%", "102.02%", "16 sales",
  "October 31, 2026", "$558,988", "6.4%",
  "released November 19", "$475,000", "2.3%", "$485,950", "Sales were 97, compared with 98",
  "held at 3.8", "$505,000", "5.2%", "$479,900", "1,043", "11.8%", "933",
  "November 13, 2026", "103 October sales", "8.4% from 95", "150 listings", "23.0% from 122",
  "$374,030", "1.4%", "2.6 months", "98.2%", "7.33%", "6.25%",
];
const SOURCES = [
  "Realtor.com's Cedarburg key indicators",
  "Dillon Kanitz-Reed of Coldwell Banker Realty",
  "Metro MLS statistics for Cedarburg",
  "Zillow's Home Value Index",
  "Wisconsin REALTORS Association October 2026 report",
  "Greater Milwaukee Association of REALTORS",
  "Metro MLS Monthly Metrics",
  "The WRA's Tom Larson",
];
const HEADINGS = [
  "What the numbers say",
  "What it means for sellers",
  "What it means for buyers",
  "A note on winter timing",
  "How I can help",
];

async function html(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path, { maxRedirects: 0 });
  expect(res.status(), `GET ${path}`).toBe(200);
  return res.text();
}

// Next escapes attribute values and text, so compare against the decoded text.
function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// The visible text of the <article>, tags and React's text separators removed.
function articleText(doc: string): string {
  const m = /<article\b[^>]*>([\s\S]*?)<\/article>/.exec(doc);
  expect(m, "the page has an <article>").not.toBeNull();
  return decode(m![1].replace(/<!-- -->/g, "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ");
}

function articleHrefs(doc: string): string[] {
  const m = /<article\b[^>]*>([\s\S]*?)<\/article>/.exec(doc);
  return [...(m?.[1] ?? "").matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((x) => x[1]);
}

function meta(doc: string, attr: "name" | "property", key: string): string[] {
  const re = new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`, "g");
  return [...doc.matchAll(re)].map((m) => decode(m[1]));
}

type Node = Record<string, unknown>;

function graph(doc: string): Node[] {
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  return [...doc.matchAll(re)].flatMap((m) => {
    const parsed = JSON.parse(m[1]) as Node;
    return Array.isArray(parsed["@graph"]) ? (parsed["@graph"] as Node[]) : [parsed];
  });
}

test.describe("Cedarburg November 2026 market update", () => {
  test("renders the draft's body and none of its notes or frontmatter", async ({ request }) => {
    const doc = await html(request, PATH);
    expect(doc).not.toContain("Notes for Claude");
    expect(doc).not.toContain("CONFIRM");
    expect(doc).not.toContain("target_path");
    expect(doc).not.toContain("Suggested internal links");

    const text = articleText(doc);
    expect(text).toContain("I'm Anthony Stolp, a Realtor with ExSell Experts | Epique Realty.");
    expect(text).toContain(
      "tell you what is wrong with a house before I tell you what is right.",
    );
    for (const f of [...FIGURES, ...SOURCES]) expect(text, f).toContain(f);

    const h2s = [...doc.matchAll(/<h2\b[^>]*>([^<]*)<\/h2>/g)].map((m) => decode(m[1]));
    expect(h2s.filter((h) => HEADINGS.includes(h))).toEqual(HEADINGS);
  });

  test("has one h1, the title, and no en or em dashes", async ({ request }) => {
    const doc = await html(request, PATH);
    const h1s = [...doc.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => decode(m[1]));
    expect(h1s).toEqual([TITLE]);
    const titles = [...doc.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
    expect(titles).toEqual([`${TITLE} · Anthony Stolp`]);
    expect(titles[0].length).toBeLessThanOrEqual(60);
    expect(doc).not.toMatch(/[–—]/);
  });

  test("description, canonical and social image", async ({ request }) => {
    const doc = await html(request, PATH);
    expect(meta(doc, "name", "description")).toEqual([DESCRIPTION]);
    expect(meta(doc, "property", "og:description")).toEqual([DESCRIPTION]);
    expect(meta(doc, "property", "og:url")).toEqual([URL]);
    const canonical = [...doc.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
    expect(canonical).toEqual([URL]);
    const [image] = meta(doc, "property", "og:image");
    expect(image, "og:image").toMatch(/^https:\/\/anthonystolp\.com\/opengraph-image/);
  });

  test("the phone number and the three internal links are real links", async ({ request }) => {
    const doc = await html(request, PATH);
    const hrefs = articleHrefs(doc);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/search/cedarburg-homes-for-sale",
        "/home-value",
        "/buy",
        "tel:+12624837932",
      ]),
    );
    expect(articleText(doc)).toContain("call or text me at (262) 483-7932.");
    for (const path of ["/search/cedarburg-homes-for-sale", "/home-value", "/buy"]) {
      await html(request, path);
    }
  });

  test("JSON-LD is an Article whose author is the #agent reference, with no reviews", async ({
    request,
  }) => {
    const doc = await html(request, PATH);
    const nodes = graph(doc);
    const articles = nodes.filter((n) => n["@type"] === "Article");
    expect(articles).toHaveLength(1);
    const [a] = articles;
    expect(a.headline).toBe(TITLE);
    expect(a.datePublished).toBe("2026-11-26");
    expect(a.dateModified).toBe(CONTENT_DATE);
    expect(a.mainEntityOfPage).toBe(URL);
    expect(a.author).toEqual({ "@type": "RealEstateAgent", "@id": AGENT_ID });
    expect((a.about as Node[]).map((p) => p.name)).toEqual(["Cedarburg, WI", "Ozaukee County, WI"]);

    const all = JSON.stringify(nodes);
    expect(all).not.toContain('"Review"');
    expect(all).not.toContain("aggregateRating");
  });

  test("the sitemap lists the page once, with its content date", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    const found = [
      ...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g),
    ].filter((m) => m[1] === URL);
    expect(found).toHaveLength(1);
    expect(found[0][2]).toBe(CONTENT_DATE);
  });
});
