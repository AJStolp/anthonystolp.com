import { beforeEach, describe, expect, mock, test } from "bun:test";

// T-092: the sitemap gave nine core pages the build time as lastmod, so all
// nine shared one timestamp. Each now carries the content date kept beside
// its page, and a property page its listing's own edit time.
//
// The two lookups the sitemap makes are replaced so the test controls what
// the listings say. Bun's module mocks last for the whole run, so every other
// export stays the real one for the test files that run after this.
// The content dates are imported from the files beside each page, the same
// files the sitemap reads.
let listings: { slug: string; updated_at: string | null }[] = [];
let pages: { slug: string; active: boolean; updated_at: string }[] = [];

const realProperties = await import("@/lib/properties");
const realNichePages = await import("@/lib/niche-pages");
const serveTestData = () => {
  mock.module("@/lib/properties", () => ({
    ...realProperties,
    getPublicPages: async () => listings,
  }));
  mock.module("@/lib/niche-pages", () => ({
    ...realNichePages,
    listAll: async () => pages,
  }));
};
serveTestData();

const { default: sitemap } = await import("./sitemap");

const CORE: [path: string, file: string][] = [
  ["/", "./content-date"],
  ["/buy", "./buy/content-date"],
  ["/home-value", "./home-value/content-date"],
  ["/about", "./about/content-date"],
  ["/northwoods", "./northwoods/content-date"],
  ["/privacy", "./privacy/content-date"],
  ["/terms", "./terms/content-date"],
  ["/fair-housing", "./fair-housing/content-date"],
  ["/blog/cedarburg-market-nov-2026", "./blog/cedarburg-market-nov-2026/content-date"],
];

const SITE = "https://anthonystolp.com";

function entry(entries: Awaited<ReturnType<typeof sitemap>>, path: string) {
  const found = entries.find((e) => e.url === `${SITE}${path}`);
  expect(found, `${path} is in the sitemap`).toBeDefined();
  return found!;
}

beforeEach(() => {
  listings = [];
  pages = [];
});

describe("sitemap lastModified", () => {
  test("each core page carries the content date kept beside it, not the build time", async () => {
    const started = Date.now();
    const entries = await sitemap();
    for (const [path, file] of CORE) {
      const { CONTENT_DATE } = (await import(file)) as { CONTENT_DATE: string };
      expect(CONTENT_DATE, `${file} is a calendar date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const modified = entry(entries, path).lastModified;
      expect(modified, path).toBe(CONTENT_DATE);
      expect(Math.abs(Date.parse(String(modified)) - started), `${path} is not now`).toBeGreaterThan(60_000);
    }
  });

  test("a property page uses its listing's own updated time", async () => {
    listings = [
      { slug: "521-alta-loma", updated_at: "2026-10-03T15:20:00.000Z" },
      { slug: "100-other-street", updated_at: "2026-09-01T08:00:00.000Z" },
    ];
    const entries = await sitemap();
    expect(entry(entries, "/property/521-alta-loma").lastModified).toEqual(
      new Date("2026-10-03T15:20:00.000Z"),
    );
    expect(entry(entries, "/property/100-other-street").lastModified).toEqual(
      new Date("2026-09-01T08:00:00.000Z"),
    );
  });

  test("a listing with no usable updated time gets no lastmod rather than the build time", async () => {
    listings = [
      { slug: "no-time", updated_at: null },
      { slug: "bad-time", updated_at: "not a date" },
    ];
    const entries = await sitemap();
    expect(entry(entries, "/property/no-time").lastModified).toBeUndefined();
    expect(entry(entries, "/property/bad-time").lastModified).toBeUndefined();
  });

  test("the property and niche lookups failing still leaves every core page", async () => {
    const down = async () => {
      throw new Error("Supabase down");
    };
    mock.module("@/lib/properties", () => ({ ...realProperties, getPublicPages: down }));
    mock.module("@/lib/niche-pages", () => ({ ...realNichePages, listAll: down }));
    try {
      const entries = await sitemap();
      expect(entries.map((e) => e.url).sort()).toEqual(
        CORE.map(([p]) => `${SITE}${p}`).sort(),
      );
    } finally {
      serveTestData();
    }
  });
});
