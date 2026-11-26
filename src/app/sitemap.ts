import type { MetadataRoute } from "next";
import { listAll } from "@/lib/niche-pages";
import { getPublicPages } from "@/lib/properties";
import { CONTENT_DATE as HOME_DATE } from "./content-date";
import { CONTENT_DATE as BUY_DATE } from "./buy/content-date";
import { CONTENT_DATE as HOME_VALUE_DATE } from "./home-value/content-date";
import { CONTENT_DATE as ABOUT_DATE } from "./about/content-date";
import { CONTENT_DATE as NORTHWOODS_DATE } from "./northwoods/content-date";
import { CONTENT_DATE as PRIVACY_DATE } from "./privacy/content-date";
import { CONTENT_DATE as TERMS_DATE } from "./terms/content-date";
import { CONTENT_DATE as FAIR_HOUSING_DATE } from "./fair-housing/content-date";

const SITE_URL = "https://anthonystolp.com";

// Re-generate hourly so pages added via the admin UI surface in the sitemap
// without waiting for a redeploy (sitemap routes are statically cached otherwise).
export const revalidate = 3600;

// A listing's own edit time, or no lastmod at all. Never the build time: a
// date every page shares tells a crawler nothing about which one changed.
function listingModified(updatedAt: string | null | undefined): Date | undefined {
  const t = updatedAt ? Date.parse(updatedAt) : NaN;
  return Number.isNaN(t) ? undefined : new Date(t);
}

// Each fixed page's lastmod is the content date kept beside that page.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const niche = await listAll().catch(() => []);
  const nicheEntries: MetadataRoute.Sitemap = niche
    .filter((p) => p.active)
    .map((p) => ({
      url: `${SITE_URL}/search/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const properties = await getPublicPages().catch(() => []);
  const propertyEntries: MetadataRoute.Sitemap = properties.map((p) => ({
    url: `${SITE_URL}/property/${p.slug}`,
    lastModified: listingModified(p.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const homeValueEntry: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/home-value`,
      lastModified: HOME_VALUE_DATE,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: HOME_DATE,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/buy`,
      lastModified: BUY_DATE,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...homeValueEntry,
    {
      url: `${SITE_URL}/about`,
      lastModified: ABOUT_DATE,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/northwoods`,
      lastModified: NORTHWOODS_DATE,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...nicheEntries,
    ...propertyEntries,
    {
      url: `${SITE_URL}/privacy`,
      lastModified: PRIVACY_DATE,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: TERMS_DATE,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/fair-housing`,
      lastModified: FAIR_HOUSING_DATE,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
