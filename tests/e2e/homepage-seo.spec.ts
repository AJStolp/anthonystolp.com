import { test, expect, type APIRequestContext } from "@playwright/test";

// What a crawler sees: the raw server HTML, before any client JS runs. Every
// check here reads the response body of a plain GET, so a tag that only
// appears after hydration does not count.

const SITE_URL = "https://anthonystolp.com";
const AGENT_ID = `${SITE_URL}/#agent`;
// A city page that exists in niche_pages. The test fails rather than skips if
// the row is missing, because then the schema check has nothing to check.
const CITY_PAGE = "/search/cedarburg-homes-for-sale";

async function html(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path);
  expect(res.status(), `GET ${path}`).toBe(200);
  return res.text();
}

// Next escapes attribute values, so compare against the decoded text.
function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function meta(doc: string, attr: "name" | "property", key: string): string[] {
  const re = new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`, "g");
  return [...doc.matchAll(re)].map((m) => decode(m[1]));
}

function jsonLdBlocks(doc: string): string[] {
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  return [...doc.matchAll(re)].map((m) => m[1]);
}

type Node = Record<string, unknown>;

function graphOf(blocks: string[]): Node[] {
  return blocks.flatMap((b) => {
    const parsed = JSON.parse(b) as Node;
    return Array.isArray(parsed["@graph"]) ? (parsed["@graph"] as Node[]) : [parsed];
  });
}

test.describe("Homepage targets Cedarburg and Ozaukee County", () => {
  test("title is the Cedarburg and Ozaukee County title", async ({ request }) => {
    const doc = await html(request, "/");
    const titles = [...doc.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
    expect(titles).toEqual(["Cedarburg and Ozaukee County Realtor · Anthony Stolp"]);
  });

  test("meta description is the new copy and under 160 characters", async ({ request }) => {
    const doc = await html(request, "/");
    const [description, ...extra] = meta(doc, "name", "description");
    expect(extra).toEqual([]);
    expect(description).toBe(
      "Buying or selling in Cedarburg, Mequon, Grafton, or anywhere in Ozaukee County? Straight answers, real local comps, and a free home value from Anthony Stolp.",
    );
    expect(description.length).toBeLessThan(160);
  });

  test("social title, description and image alt name Cedarburg and Ozaukee County", async ({ request }) => {
    const doc = await html(request, "/");
    const socialTitle = "Anthony Stolp · Cedarburg and Ozaukee County Realtor";
    const socialDescription =
      "Straight answers, real local comps, and a free home value for Cedarburg, Mequon, Grafton, Port Washington, and the rest of Ozaukee County.";
    expect(meta(doc, "property", "og:title")).toEqual([socialTitle]);
    expect(meta(doc, "name", "twitter:title")).toEqual([socialTitle]);
    expect(meta(doc, "property", "og:description")).toEqual([socialDescription]);
    expect(meta(doc, "name", "twitter:description")).toEqual([socialDescription]);
    // OG_IMAGES still spread, so a share still carries the generated card.
    expect(meta(doc, "property", "og:image")[0]).toMatch(/\/opengraph-image/);
    expect(meta(doc, "property", "og:image:alt")).toEqual([
      "Anthony Stolp · Cedarburg and Ozaukee County Realtor · Find where you belong.",
    ]);
  });

  test("there is exactly one h1", async ({ request }) => {
    const doc = await html(request, "/");
    expect(doc.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  });

  test("the h1 names Cedarburg and Ozaukee County", async ({ request }) => {
    const doc = await html(request, "/");
    const inner = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(doc)?.[1] ?? "";
    const text = decode(inner.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    expect(text).toBe("Your partner for Cedarburg and Ozaukee County real estate.");
  });

  test("homepage JSON-LD parses and the agent lists the six towns ahead of the counties", async ({ request }) => {
    const blocks = jsonLdBlocks(await html(request, "/"));
    expect(blocks.length).toBeGreaterThan(0);
    const graph = graphOf(blocks);
    const agent = graph.find((n) => n["@id"] === AGENT_ID);
    expect(agent?.["@type"]).toBe("RealEstateAgent");
    const areas = (agent?.areaServed ?? []) as Node[];
    expect(areas.slice(0, 6)).toEqual(
      ["Cedarburg", "Mequon", "Thiensville", "Grafton", "Port Washington", "Saukville"].map(
        (town) => ({ "@type": "City", name: `${town}, Wisconsin` }),
      ),
    );
    // The wider service area stays, led by Ozaukee.
    expect(areas.slice(6).map((a) => a.name)).toEqual([
      "Ozaukee County, Wisconsin",
      "Washington County, Wisconsin",
      "Waukesha County, Wisconsin",
      "Sheboygan County, Wisconsin",
      "Milwaukee County, Wisconsin",
    ]);
  });

  test("city page JSON-LD parses and refers to the homepage agent instead of declaring its own", async ({ request }) => {
    const blocks = jsonLdBlocks(await html(request, CITY_PAGE));
    expect(blocks.length).toBeGreaterThan(0);
    const graph = graphOf(blocks);
    // Exactly one agent node, and it is a bare typed reference to the homepage
    // entity: no second agent with details of its own.
    expect(graph.filter((n) => n["@type"] === "RealEstateAgent")).toEqual([
      { "@type": "RealEstateAgent", "@id": AGENT_ID },
    ]);
  });
});
