import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BLOG_POSTS, formatPostDate, getBlogPost } from "./blog-posts";

// T-111: the /blog index, footer and sitemap list posts from BLOG_POSTS, so a
// post page with no entry would be reachable only by its URL. These read the
// folders on disk, the same ones Next routes, and compare them with the list.
const BLOG_DIR = join(import.meta.dir, "..", "app", "blog");

function postFolders(): string[] {
  return readdirSync(BLOG_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(BLOG_DIR, d.name, "page.tsx")))
    .map((d) => d.name)
    .sort();
}

describe("BLOG_POSTS", () => {
  test("every post folder with a page.tsx has an entry", () => {
    const slugs = new Set(BLOG_POSTS.map((p) => p.slug));
    const missing = postFolders().filter((f) => !slugs.has(f));
    expect(missing, "post folders with no entry in src/lib/blog-posts.ts").toEqual([]);
  });

  test("every entry has a post folder with a page.tsx", () => {
    const folders = new Set(postFolders());
    const orphans = BLOG_POSTS.map((p) => p.slug).filter((s) => !folders.has(s));
    expect(orphans, "entries with no src/app/blog/<slug>/page.tsx").toEqual([]);
  });

  test("is newest first", () => {
    const dates = BLOG_POSTS.map((p) => p.datePublished);
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  test("getBlogPost finds an entry by slug and throws for one that is not listed", () => {
    expect(getBlogPost("cedarburg-market-nov-2026").title).toBe(
      "Cedarburg Market Update: November 2026",
    );
    expect(() => getBlogPost("no-such-post")).toThrow("No entry in src/lib/blog-posts.ts");
  });
});

describe("formatPostDate", () => {
  test("writes the date out", () => {
    expect(formatPostDate("2026-11-26")).toBe("November 26, 2026");
  });

  // A date read in a time zone behind UTC lands on the day before. The first
  // of a month shows it as the previous month, and of January the previous year.
  // Bun applies a TZ change at runtime, so this holds whatever zone the
  // machine running the suite is in.
  test("does not move the date in a time zone behind UTC", () => {
    const tz = process.env.TZ;
    process.env.TZ = "America/Chicago";
    try {
      expect(formatPostDate("2027-01-01")).toBe("January 1, 2027");
    } finally {
      if (tz === undefined) delete process.env.TZ;
      else process.env.TZ = tz;
    }
  });
});
