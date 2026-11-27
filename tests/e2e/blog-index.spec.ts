import { test, expect, type APIRequestContext } from "@playwright/test";
import { CONTENT_DATE as INDEX_DATE } from "../../src/app/blog/content-date";
import { CONTENT_DATE as POST_DATE } from "../../src/app/blog/cedarburg-market-nov-2026/content-date";

// T-111: /blog was a 404 above the one market post. Every check reads the raw
// server HTML through the request fixture, which is what a crawler and the
// ticket's curl checks read. No browser runs and no JavaScript executes, so
// nothing here can reach /api/lead or /api/track.
//
// The draft is deleted in the change that publishes it, so its copy is
// written out here, along with the one post's card as it should read.

const SITE_URL = "https://anthonystolp.com";
const AGENT_ID = `${SITE_URL}/#agent`;
const PATH = "/blog";
const URL = `${SITE_URL}${PATH}`;
const TITLE = "Cedarburg and Ozaukee Real Estate Blog · Anthony Stolp";
const DESCRIPTION =
  "Local market updates and practical buying and selling guides for Cedarburg, Ozaukee County and nearby Washington County, WI, from Anthony Stolp.";
const H1 = "Cedarburg and Ozaukee County Real Estate Blog";
const INTRO = [
  "Straight talk on the local market. I post monthly market updates and simple guides for buyers and sellers in Cedarburg, Mequon, Grafton, Port Washington, Saukville, Thiensville, and nearby Washington County towns like West Bend, Hartford, and Germantown.",
  "Every number comes from local sources like Metro MLS and the Wisconsin REALTORS Association, and I explain what it actually means for you, whether you're thinking about selling this spring or just watching prices.",
];
const CLOSING =
  "Call or text me at (262) 483-7932, or get a free home value estimate. I'm a local agent with ExSell Experts | Epique Realty, backed by a strong team when you need it.";
const POST = {
  path: "/blog/cedarburg-market-nov-2026",
  title: "Cedarburg Market Update: November 2026",
  date: "November 26, 2026",
  datePublished: "2026-11-26",
  description:
    "Cedarburg still favors sellers, but buyers have more listings than a year ago. Anthony Stolp breaks down October and November 2026 market numbers.",
};

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

// The visible text of <main>, tags, scripts and React's text separators removed.
function mainText(doc: string): string {
  const m = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(doc);
  expect(m, "the page has a <main>").not.toBeNull();
  return decode(
    m![1]
      .replace(/<script\b[\s\S]*?<\/script>/g, "")
      .replace(/<!-- -->/g, "")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .replace(/ ([,.])/g, "$1");
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

test.describe("/blog index", () => {
  test("title, description, canonical and social image", async ({ request }) => {
    const doc = await html(request, PATH);
    const titles = [...doc.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
    expect(titles).toEqual([TITLE]);
    expect(titles[0]).toHaveLength(54);
    expect(meta(doc, "name", "description")).toEqual([DESCRIPTION]);
    expect(DESCRIPTION).toHaveLength(144);
    expect(meta(doc, "property", "og:description")).toEqual([DESCRIPTION]);
    expect(meta(doc, "property", "og:url")).toEqual([URL]);
    const canonical = [...doc.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
    expect(canonical).toEqual([URL]);
    const [image] = meta(doc, "property", "og:image");
    expect(image, "og:image").toMatch(/^https:\/\/anthonystolp\.com\/opengraph-image/);
  });

  test("one h1, the draft's intro and closing word for word, and none of its notes", async ({
    request,
  }) => {
    const doc = await html(request, PATH);
    const h1s = [...doc.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => decode(m[1]));
    expect(h1s).toEqual([H1]);
    const h2s = [...doc.matchAll(/<h2\b[^>]*>([^<]*)<\/h2>/g)].map((m) => decode(m[1]));
    expect(h2s).toEqual(
      expect.arrayContaining(["Latest posts", "Have a question about your home or your town?"]),
    );

    const text = mainText(doc);
    for (const p of [...INTRO, CLOSING]) expect(text).toContain(p);

    expect(doc).not.toContain("Notes for Claude");
    expect(doc).not.toContain("target_path");
    expect(doc).not.toContain("[Post list renders here]");
    expect(doc).not.toMatch(/[–—]/);
    // The footer's decorative arrows predate this page; the rule is the copy's.
    expect(text).not.toContain("→");
  });

  test("the closing paragraph's phone number and home value link are real links", async ({
    request,
  }) => {
    const doc = (await html(request, PATH)).replace(/<!-- -->/g, "");
    expect(doc).toMatch(/<a\b[^>]*href="tel:\+12624837932"[^>]*>\(262\) 483-7932<\/a>/);
    expect(doc).toMatch(/<a\b[^>]*href="\/home-value"[^>]*>get a free home value estimate<\/a>/);
  });

  test("the post is a card: its title links to it, then its date written out and its description", async ({
    request,
  }) => {
    const doc = (await html(request, PATH)).replace(/<!-- -->/g, "");
    const cards = [...doc.matchAll(/<li\b[^>]*>\s*<article\b[^>]*>([\s\S]*?)<\/article>/g)].map(
      (m) => m[1],
    );
    expect(cards).toHaveLength(1);
    const [card] = cards;
    expect(card).toMatch(
      new RegExp(`<h3\\b[^>]*><a\\b[^>]*href="${POST.path}"[^>]*>${POST.title}</a></h3>`),
    );
    expect(card).toContain(`<time dateTime="${POST.datePublished}">${POST.date}</time>`);
    expect(decode(card)).toContain(POST.description);
    await html(request, POST.path);
  });

  test("JSON-LD is a Blog listing the post as a BlogPosting, and a breadcrumb", async ({
    request,
  }) => {
    const nodes = graph(await html(request, PATH));
    expect(nodes.map((n) => n["@type"]).sort()).toEqual(["Blog", "BreadcrumbList"]);

    const blog = nodes.find((n) => n["@type"] === "Blog")!;
    expect(blog["@id"]).toBe(`${URL}#blog`);
    expect(blog.url).toBe(URL);
    expect(blog.name).toBe(H1);
    expect(blog.description).toBe(DESCRIPTION);
    expect(blog.author).toEqual({ "@type": "RealEstateAgent", "@id": AGENT_ID });
    expect(blog.publisher).toEqual({ "@type": "RealEstateAgent", "@id": AGENT_ID });
    expect(blog.blogPost).toEqual([
      {
        "@type": "BlogPosting",
        headline: POST.title,
        url: `${SITE_URL}${POST.path}`,
        datePublished: POST.datePublished,
        description: POST.description,
      },
    ]);

    const crumbs = nodes.find((n) => n["@type"] === "BreadcrumbList")!;
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: URL },
    ]);

    const all = JSON.stringify(nodes);
    expect(all).not.toContain('"Review"');
    expect(all).not.toContain("aggregateRating");
  });

  test("the sitemap lists /blog and the post once each, /blog with the later date", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    const urls = [
      ...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g),
    ];
    const index = urls.filter((m) => m[1] === URL);
    expect(index).toHaveLength(1);
    const later = [INDEX_DATE, POST.datePublished].sort().at(-1);
    expect(index[0][2]).toBe(later);
    const post = urls.filter((m) => m[1] === `${SITE_URL}${POST.path}`);
    expect(post).toHaveLength(1);
    expect(post[0][2]).toBe(POST_DATE);
  });

  test("the footer lists the post and ends with an All posts link to /blog", async ({
    request,
  }) => {
    for (const path of ["/", PATH, POST.path]) {
      const doc = (await html(request, path)).replace(/<!-- -->/g, "");
      const nav = /<nav aria-label="Market updates">([\s\S]*?)<\/nav>/.exec(doc);
      expect(nav, `${path} has the Market updates list`).not.toBeNull();
      const links = [...nav![1].matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map(
        (m) => [m[1], m[2]],
      );
      expect(links, path).toEqual([
        [POST.path, "Cedarburg market, November 2026"],
        ["/blog", "All posts"],
      ]);
    }
  });
});
