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
// A copy, not the namespace: mock.module patches the namespace in place, so
// spreading it after a mock would put the mock back rather than the real list.
const realBlogPosts = { ...(await import("@/lib/blog-posts")) };
const realIssues = { ...(await import("@/lib/newsletter-issues")) };
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
  ["/newsletter/2026-12", "./newsletter/2026-12/content-date"],
];

const SITE = "https://anthonystolp.com";

// /blog and /newsletter are in the sitemap too, but their lastmod is worked
// out rather than read from one file, so they have their own tests below.
const BLOG_INDEX = "/blog";
const NEWSLETTER_INDEX = "/newsletter";

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
        [...CORE.map(([p]) => p), BLOG_INDEX, NEWSLETTER_INDEX].map((p) => `${SITE}${p}`).sort(),
      );
    } finally {
      serveTestData();
    }
  });
});

// T-111: posts come from BLOG_POSTS, and /blog carries the later of its own
// content date and its newest post's publish date. The list is replaced for
// each test, then put back for the tests that run after.
describe("sitemap blog entries", () => {
  const post = (slug: string, datePublished: string, dateModified = datePublished) => ({
    slug,
    title: slug,
    description: slug,
    datePublished,
    dateModified,
    footerLabel: slug,
  });
  const serve = (posts: ReturnType<typeof post>[]) =>
    mock.module("@/lib/blog-posts", () => ({ ...realBlogPosts, BLOG_POSTS: posts }));
  const restore = () => mock.module("@/lib/blog-posts", () => realBlogPosts);

  test("every post in the list is in the sitemap with its own modified date", async () => {
    serve([post("second-post", "2027-02-01", "2027-02-03"), post("first-post", "2027-01-05")]);
    try {
      const entries = await sitemap();
      expect(entry(entries, "/blog/second-post").lastModified).toBe("2027-02-03");
      expect(entry(entries, "/blog/first-post").lastModified).toBe("2027-01-05");
      const blogUrls = entries.map((e) => e.url).filter((u) => u.startsWith(`${SITE}/blog/`));
      expect(blogUrls.sort()).toEqual([`${SITE}/blog/first-post`, `${SITE}/blog/second-post`]);
    } finally {
      restore();
    }
  });

  test("/blog takes the newest post's publish date when it is later than its own", async () => {
    serve([post("newer", "2099-03-04"), post("older", "2000-01-01")]);
    try {
      expect(entry(await sitemap(), BLOG_INDEX).lastModified).toBe("2099-03-04");
    } finally {
      restore();
    }
  });

  test("/blog keeps its own content date when every post is older", async () => {
    const { CONTENT_DATE } = await import("./blog/content-date");
    serve([post("old", "2000-01-01")]);
    try {
      expect(entry(await sitemap(), BLOG_INDEX).lastModified).toBe(CONTENT_DATE);
    } finally {
      restore();
    }
  });

  test("with the real list, /blog and each post are listed once", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    for (const p of [BLOG_INDEX, ...realBlogPosts.BLOG_POSTS.map((x) => `/blog/${x.slug}`)]) {
      expect(urls.filter((u) => u === `${SITE}${p}`), p).toHaveLength(1);
    }
  });
});

// T-132: issues come from NEWSLETTER_ISSUES, and /newsletter carries the later
// of its own content date and its newest issue's publish date, as /blog does.
describe("sitemap newsletter entries", () => {
  const issue = (slug: string, datePublished: string, dateModified = datePublished) => ({
    slug,
    title: slug,
    description: slug,
    datePublished,
    dateModified,
    subject: slug,
    preheader: slug,
  });
  const serve = (issues: ReturnType<typeof issue>[]) =>
    mock.module("@/lib/newsletter-issues", () => ({ ...realIssues, NEWSLETTER_ISSUES: issues }));
  const restore = () => mock.module("@/lib/newsletter-issues", () => realIssues);

  test("every issue in the list is in the sitemap with its own modified date", async () => {
    serve([issue("2027-02", "2027-02-02", "2027-02-05"), issue("2027-01", "2027-01-05")]);
    try {
      const entries = await sitemap();
      expect(entry(entries, "/newsletter/2027-02").lastModified).toBe("2027-02-05");
      expect(entry(entries, "/newsletter/2027-01").lastModified).toBe("2027-01-05");
      const urls = entries.map((e) => e.url).filter((u) => u.startsWith(`${SITE}/newsletter/`));
      expect(urls.sort()).toEqual([`${SITE}/newsletter/2027-01`, `${SITE}/newsletter/2027-02`]);
    } finally {
      restore();
    }
  });

  test("/newsletter takes the newest issue's publish date when it is later than its own", async () => {
    serve([issue("2099-03", "2099-03-04"), issue("2000-01", "2000-01-01")]);
    try {
      expect(entry(await sitemap(), NEWSLETTER_INDEX).lastModified).toBe("2099-03-04");
    } finally {
      restore();
    }
  });

  test("/newsletter keeps its own content date when every issue is older", async () => {
    const { CONTENT_DATE } = await import("./newsletter/content-date");
    serve([issue("2000-01", "2000-01-01")]);
    try {
      expect(entry(await sitemap(), NEWSLETTER_INDEX).lastModified).toBe(CONTENT_DATE);
    } finally {
      restore();
    }
  });

  test("with the real list, /newsletter and each issue are listed once, and /newsletter/confirmed is not", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    for (const p of [NEWSLETTER_INDEX, ...realIssues.NEWSLETTER_ISSUES.map((x) => `/newsletter/${x.slug}`)]) {
      expect(urls.filter((u) => u === `${SITE}${p}`), p).toHaveLength(1);
    }
    expect(urls).not.toContain(`${SITE}/newsletter/confirmed`);
  });
});
