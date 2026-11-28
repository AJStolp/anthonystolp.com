import { test, expect, type APIRequestContext } from "@playwright/test";
import { CONTENT_DATE as ISSUE_DATE } from "../../src/app/newsletter/2026-12/content-date";

// T-132: Issue 1 of The River Report at /newsletter/2026-12, and the archive at
// /newsletter. Every check reads the raw server HTML through the request
// fixture, which is what a crawler reads. No browser runs and no JavaScript
// executes, so nothing here can reach /api/lead or /api/track.

const SITE_URL = "https://anthonystolp.com";
const AGENT_ID = `${SITE_URL}/#agent`;
const ISSUE = "/newsletter/2026-12";
const ISSUE_URL = `${SITE_URL}${ISSUE}`;
const ARCHIVE = "/newsletter";
const ARCHIVE_URL = `${SITE_URL}${ARCHIVE}`;
const TITLE = "The River Report: December 2026";
const DESCRIPTION =
  "Ozaukee sold more homes in October while Washington County prices climbed. Plus the Firemen's Park vote. Anthony Stolp's monthly local market newsletter.";

// The draft is deleted in the same change that publishes it, so its figures
// are written out here. A figure mistyped or dropped while copying it into the
// page fails the test.
const FIGURES = [
  "103 homes", "up 8.4% from 95", "fell 3.5%",
  "$2 million", "about 16 acres", "39 acre site", "Monday, Nov. 30", "Wednesday, Dec. 2",
  "about another $3 million", "Ozaukee Press, Nov. 24, 2026",
  "$420,000", "up 10.5% from $380,000", "139 from 156", "3.6 months", "$419,500, up 8.1%",
  "GMAR counted 103 Ozaukee sales and WRA counted 97",
  "56 homes for sale", "up 26%", "$499,900", "about 15%", "31 days", "98% of asking",
  "7.33%", "6.25%", "(98% of asking, not 102%)", "within 24 hours",
];
const TABLE_CELLS = [
  "Homes sold", "103", "95", "up 8.4%",
  "Listings", "150", "122", "up 23.0%",
  "Median sale price", "$475,000", "$485,950", "down 2.3%",
  "Months of inventory", "3.8", "no change",
  "Median, year to date", "$505,000", "$479,900", "up 5.2%",
];
const HEADINGS = [
  "Around the two counties",
  "The numbers",
  "One thing to do this month",
  "Your street",
  "Sources",
];
const SOURCE_LINKS = [
  "https://gmar.com/wp-content/uploads/2026/11/10-31-2026-Housing-Statistics-PR.pdf",
  "https://www.wra.org/media/afwd3hf0/wisconsin_housing_report_october_2026.pdf",
  "https://www.ozaukeepress.com/content/officials-back-plan-buy-park-add-fairgrounds",
  "https://www.realtor.com/realestateandhomes-search/Cedarburg_WI/overview",
];
const INTERNAL_LINKS = [
  "/search/west-bend-homes-for-sale",
  "/search/hartford-homes-for-sale",
  "/search/germantown-homes-for-sale",
  "/search/cedarburg-homes-for-sale",
  "/blog/cedarburg-market-nov-2026",
  "/home-value",
];

async function html(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path, { maxRedirects: 0 });
  expect(res.status(), `GET ${path}`).toBe(200);
  return res.text();
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function article(doc: string): string {
  const m = /<article\b[^>]*>([\s\S]*?)<\/article>\s*<\/main>/.exec(doc);
  expect(m, "the page has an <article>").not.toBeNull();
  return m![1];
}

function text(fragment: string): string {
  return decode(fragment.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
}

function anchors(fragment: string): { href: string; attrs: string }[] {
  return [...fragment.matchAll(/<a\b([^>]*)\shref="([^"]+)"([^>]*)>/g)].map((m) => ({
    href: decode(m[2]),
    attrs: `${m[1]} ${m[3]}`,
  }));
}

function h1s(doc: string): string[] {
  return [...doc.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => text(m[1]).trim());
}

function canonicals(doc: string): string[] {
  return [...doc.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
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

test.describe("/newsletter/2026-12", () => {
  test("renders the draft's body and none of its email only parts or notes", async ({ request }) => {
    const doc = await html(request, ISSUE);
    for (const leftover of [
      "Notes for Claude", "target_path", "EMAIL ONLY", "Subject:", "Preheader:",
      "Ozaukee sold more homes in October. Washington County sold fewer.",
      "Plus the $2 million Firemen's Park vote, and what Cedarburg looks like heading into winter.",
    ]) {
      expect(decode(doc), leftover).not.toContain(leftover);
    }
    // The email puts a subscriber's zip section under an h2 "Your zip: ...".
    // The signup card's "Your zip (optional)" field is not one.
    const h2Text = [...doc.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => text(m[1]).trim());
    expect(h2Text.filter((h) => h.startsWith("Your zip"))).toEqual([]);
    const body = text(article(doc));
    expect(body).toContain("Hi, I'm Anthony Stolp. Welcome to the first issue of The River Report.");
    expect(body).toContain("Talk soon, Anthony");
    for (const f of FIGURES) expect(body, f).toContain(f);
    const h2s = [...doc.matchAll(/<h2\b[^>]*>([^<]*)<\/h2>/g)].map((m) => decode(m[1]));
    expect(h2s.filter((h) => HEADINGS.includes(h))).toEqual(HEADINGS);
  });

  test("has one h1, the title, and no en or em dashes", async ({ request }) => {
    const doc = await html(request, ISSUE);
    expect(h1s(doc)).toEqual([TITLE]);
    const titles = [...doc.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
    expect(titles).toEqual([`${TITLE} · Anthony Stolp`]);
    expect(doc).not.toMatch(/[–—]/);
  });

  test("description, self canonical and social image", async ({ request }) => {
    const doc = await html(request, ISSUE);
    expect(meta(doc, "name", "description")).toEqual([DESCRIPTION]);
    expect(meta(doc, "property", "og:url")).toEqual([ISSUE_URL]);
    expect(canonicals(doc)).toEqual([ISSUE_URL]);
    const [image] = meta(doc, "property", "og:image");
    expect(image, "og:image").toMatch(/^https:\/\/anthonystolp\.com\/opengraph-image/);
  });

  test("the Ozaukee numbers are a real table with a caption", async ({ request }) => {
    const doc = article(await html(request, ISSUE));
    const m = /<table\b[^>]*>([\s\S]*?)<\/table>/.exec(doc);
    expect(m, "the page has a <table>").not.toBeNull();
    const table = m![1];
    expect(text(/<caption\b[^>]*>([\s\S]*?)<\/caption>/.exec(table)?.[1] ?? "").trim()).toBe(
      "Ozaukee County, October 2026",
    );
    const cells = [...table.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => text(c[1]).trim());
    for (const c of TABLE_CELLS) expect(cells, c).toContain(c);
  });

  test("sources are visible links, and the internal links resolve", async ({ request }) => {
    const doc = article(await html(request, ISSUE));
    const hrefs = anchors(doc).map((a) => a.href);
    expect(hrefs).toEqual(expect.arrayContaining([...SOURCE_LINKS, ...INTERNAL_LINKS, ARCHIVE]));
    for (const path of INTERNAL_LINKS) await html(request, path);
  });

  test("the street text and call links come from the phone helpers with their placements", async ({
    request,
  }) => {
    const links = anchors(article(await html(request, ISSUE)));
    const sms = links.filter((a) => a.attrs.includes('data-placement="newsletter_street_sms"'));
    const call = links.filter((a) => a.attrs.includes('data-placement="newsletter_street_call"'));
    expect(sms.map((a) => a.href)).toEqual(["sms:+12624837932?&body=Hi%20Anthony%2C%20my%20street%20is%20"]);
    expect(call.map((a) => a.href)).toEqual(["tel:+12624837932"]);
  });

  test("JSON-LD is an Article and a breadcrumb, with no reviews", async ({ request }) => {
    const nodes = graph(await html(request, ISSUE));
    const [a, ...more] = nodes.filter((n) => n["@type"] === "Article");
    expect(more).toHaveLength(0);
    expect(a.headline).toBe(TITLE);
    expect(a.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(a.dateModified).toBe(ISSUE_DATE);
    expect(a.mainEntityOfPage).toBe(ISSUE_URL);
    expect(a.author).toEqual({ "@type": "RealEstateAgent", "@id": AGENT_ID });
    expect((a.about as Node[]).map((p) => p.name)).toEqual(["Ozaukee County, WI", "Washington County, WI"]);

    const crumbs = nodes.find((n) => n["@type"] === "BreadcrumbList");
    expect((crumbs?.itemListElement as Node[]).map((i) => [i.name, i.item])).toEqual([
      ["Home", SITE_URL],
      ["Newsletter", ARCHIVE_URL],
      ["December 2026", ISSUE_URL],
    ]);
    const all = JSON.stringify(nodes);
    expect(all).not.toContain('"Review"');
    expect(all).not.toContain("aggregateRating");
  });
});

test.describe("/newsletter", () => {
  test("has one h1, a self canonical, the signup card before the issues, and links the issue", async ({
    request,
  }) => {
    const doc = await html(request, ARCHIVE);
    expect(h1s(doc)).toEqual(["The River Report"]);
    expect(canonicals(doc)).toEqual([ARCHIVE_URL]);
    expect(doc).not.toMatch(/[–—]/);
    const signup = doc.indexOf("Send me The River Report");
    const issueLink = doc.indexOf(`href="${ISSUE}"`);
    expect(signup, "the signup card").toBeGreaterThan(-1);
    expect(issueLink, "a link to the December issue").toBeGreaterThan(signup);
    expect(decode(doc)).toContain(TITLE);
  });
});

test("the sitemap lists /newsletter and the issue once each, and not the confirm page", async ({
  request,
}) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const locs = [
    ...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g),
  ];
  const issue = locs.filter((m) => m[1] === ISSUE_URL);
  expect(issue).toHaveLength(1);
  expect(issue[0][2]).toBe(ISSUE_DATE);
  expect(locs.filter((m) => m[1] === ARCHIVE_URL)).toHaveLength(1);
  expect(xml).not.toContain("/newsletter/confirmed");
});
