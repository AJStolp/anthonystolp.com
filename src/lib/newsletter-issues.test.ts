import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { NEWSLETTER_ISSUES, getNewsletterIssue } from "./newsletter-issues";

// T-132: the /newsletter archive, the sitemap and the confirm page list issues
// from NEWSLETTER_ISSUES, so an issue page with no entry would be reachable
// only by its URL. An issue folder is named for its month, which keeps
// /newsletter/confirmed, the other folder there, out of the comparison.
const NEWSLETTER_DIR = join(import.meta.dir, "..", "app", "newsletter");

function issueFolders(): string[] {
  return readdirSync(NEWSLETTER_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}$/.test(d.name))
    .filter((d) => existsSync(join(NEWSLETTER_DIR, d.name, "page.tsx")))
    .map((d) => d.name)
    .sort();
}

describe("NEWSLETTER_ISSUES", () => {
  test("every issue folder with a page.tsx has an entry, and every entry a folder", () => {
    expect(NEWSLETTER_ISSUES.map((i) => i.slug).sort()).toEqual(issueFolders());
  });

  test("is newest first, by month and by publish date", () => {
    const slugs = NEWSLETTER_ISSUES.map((i) => i.slug);
    expect(slugs).toEqual([...slugs].sort().reverse());
    const dates = NEWSLETTER_ISSUES.map((i) => i.datePublished);
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  test("each description fits a search snippet and has no en or em dash", () => {
    for (const i of NEWSLETTER_ISSUES) {
      expect(i.description.length, i.slug).toBeLessThanOrEqual(160);
      expect(`${i.title} ${i.description} ${i.subject} ${i.preheader}`).not.toMatch(/[–—]/);
    }
  });

  test("getNewsletterIssue finds an entry by slug and throws for one that is not listed", () => {
    expect(getNewsletterIssue("2026-12").title).toBe("The River Report: December 2026");
    expect(() => getNewsletterIssue("1999-01")).toThrow("No entry in src/lib/newsletter-issues.ts");
  });
});
