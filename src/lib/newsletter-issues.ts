// Every issue of The River Report on the site, newest first (T-132). The
// /newsletter archive, the sitemap, the confirm page and each issue's own page
// read their title, description and dates from here, so an issue's details
// live in one place. An issue's dateModified is the content date kept beside
// its page, which owns it. src/lib/newsletter-issues.test.ts fails when an
// issue folder has no entry here.
//
// subject and preheader are the email's, never rendered on the archive page.
// They are kept here for the send flow (T-115), since the draft they came
// from is deleted once the issue is published.

import { CONTENT_DATE as ISSUE_2026_12_MODIFIED } from "@/app/newsletter/2026-12/content-date";

export type NewsletterIssue = {
  // The folder under src/app/newsletter/, and the last part of the URL: the
  // issue's year and month.
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  subject: string;
  preheader: string;
};

export const NEWSLETTER_ISSUES: NewsletterIssue[] = [
  {
    slug: "2026-12",
    title: "The River Report: December 2026",
    description:
      "Ozaukee sold more homes in October while Washington County prices climbed. Plus the Firemen's Park vote. Anthony Stolp's monthly local market newsletter.",
    datePublished: "2026-11-27",
    dateModified: ISSUE_2026_12_MODIFIED,
    subject: "Ozaukee sold more homes in October. Washington County sold fewer.",
    preheader: "Plus the $2 million Firemen's Park vote, and what Cedarburg looks like heading into winter.",
  },
];

export const newsletterIssuePath = (slug: string) => `/newsletter/${slug}`;

export function getNewsletterIssue(slug: string): NewsletterIssue {
  const issue = NEWSLETTER_ISSUES.find((i) => i.slug === slug);
  if (!issue) throw new Error(`No entry in src/lib/newsletter-issues.ts for /newsletter/${slug}`);
  return issue;
}
