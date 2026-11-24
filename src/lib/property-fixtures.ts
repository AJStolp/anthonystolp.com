import type { PropertyRow } from "./properties";

// A fixture listing for the /property/[slug] Playwright tests, the way
// niche-page-fixtures.ts serves town pages. The only live listing is sold, and
// a test cannot rely on what AJ puts in production, so Save this home and the
// tour line on an active listing are tested against this one (T-078).
//
// Served only by `next dev` (NODE_ENV "development") and only through
// getPublicBySlug, so it never reaches a production build, the sitemap or the
// homepage results.
const STAMP = "2026-01-01T00:00:00.000Z";

const FIXTURES: PropertyRow[] = [
  {
    slug: "e2e-fixture-active",
    status: "active",
    address: "100 Fixture Lane",
    city: "Cedarburg",
    state: "WI",
    postal_code: "53012",
    price: 450000,
    beds: 3,
    baths: 2,
    sqft: 1800,
    description: "Fixture listing for end to end tests.",
    photo_url: null,
    open_house_at: null,
    open_house_end: null,
    lender_name: null,
    lender_photo_url: null,
    lender_contact: null,
    agent_id: null,
    created_at: STAMP,
    updated_at: STAMP,
  },
];

export function getFixtureProperty(slug: string): PropertyRow | null {
  if (process.env.NODE_ENV !== "development") return null;
  return FIXTURES.find((f) => f.slug === slug) ?? null;
}
