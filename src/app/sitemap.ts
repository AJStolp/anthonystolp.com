import type { MetadataRoute } from "next";
import { listAll } from "@/lib/niche-pages";
import { getPublicSlugs } from "@/lib/properties";
import { HOME_VALUE_ENABLED } from "@/lib/feature-flags";

const SITE_URL = "https://anthonystolp.com";

// Re-generate hourly so pages added via the admin UI surface in the sitemap
// without waiting for a redeploy (sitemap routes are statically cached otherwise).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const niche = await listAll().catch(() => []);
  const nicheEntries: MetadataRoute.Sitemap = niche
    .filter((p) => p.active)
    .map((p) => ({
      url: `${SITE_URL}/search/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const propertySlugs = await getPublicSlugs().catch(() => []);
  const propertyEntries: MetadataRoute.Sitemap = propertySlugs.map((slug) => ({
    url: `${SITE_URL}/property/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const homeValueEntry: MetadataRoute.Sitemap = HOME_VALUE_ENABLED
    ? [
        {
          url: `${SITE_URL}/home-value`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.9,
        },
      ]
    : [];

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/buy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...homeValueEntry,
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...nicheEntries,
    ...propertyEntries,
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/fair-housing`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
