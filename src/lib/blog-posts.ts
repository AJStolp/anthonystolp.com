// Every post under /blog, newest first. The /blog index, the footer, the
// sitemap and each post's own page read their title, description and dates
// from here, so a post's details live in one place. A post's dateModified is
// the content date kept beside its page (the T-092 pattern), which owns it.
// src/lib/blog-posts.test.ts fails when a post folder has no entry here.

import { CONTENT_DATE as CEDARBURG_NOV_2026_MODIFIED } from "@/app/blog/cedarburg-market-nov-2026/content-date";

export type BlogPost = {
  // The folder under src/app/blog/, and the last part of the URL.
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  // The link text in the footer's "Market updates" list.
  footerLabel: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "cedarburg-market-nov-2026",
    title: "Cedarburg Market Update: November 2026",
    description:
      "Cedarburg still favors sellers, but buyers have more listings than a year ago. Anthony Stolp breaks down October and November 2026 market numbers.",
    datePublished: "2026-11-26",
    dateModified: CEDARBURG_NOV_2026_MODIFIED,
    footerLabel: "Cedarburg market, November 2026",
  },
];

export const blogPostPath = (slug: string) => `/blog/${slug}`;

export function getBlogPost(slug: string): BlogPost {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) throw new Error(`No entry in src/lib/blog-posts.ts for /blog/${slug}`);
  return post;
}

// "2026-11-26" → "November 26, 2026". Read as UTC so a reader's time zone
// cannot move the date back a day.
export function formatPostDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
