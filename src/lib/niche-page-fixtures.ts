import type { NichePageRow } from "./niche-pages";

// Fixture rows for the /search/[slug] Playwright tests. Those pages read
// niche_pages on the server, where Playwright cannot intercept, and the live
// rows are content AJ edits, so a test cannot rely on what they say.
//
// Served only by `next dev` (NODE_ENV "development"), and only through
// getActiveBySlug, so they never reach a production build, the sitemap or the
// directory links. The gate is NODE_ENV rather than an env var set by the
// Playwright config because the suite reuses an already running `bun dev`,
// which would not have that var.
const STAMP = "2026-01-01T00:00:00.000Z";

const FIXTURES: NichePageRow[] = [
  {
    slug: "e2e-fixture-city",
    title: "E2E fixture: city page with body",
    h1: "E2E fixture city page",
    intent: "buy",
    geo: "Cedarburg, WI",
    filters: null,
    hero_copy: null,
    body: "## Fixture city body heading\n\nFixture city body paragraph.\n\n## Fixture city second heading\n\nSecond fixture paragraph.",
    faqs: null,
    is_guide: false,
    og_image: null,
    meta_desc: null,
    active: true,
    agent_id: null,
    created_at: STAMP,
    updated_at: STAMP,
  },
  {
    slug: "e2e-fixture-guide",
    title: "E2E fixture: guide page",
    h1: "E2E fixture guide page",
    intent: "sell",
    geo: "Wisconsin",
    filters: null,
    hero_copy: null,
    body: "## Fixture guide body heading\n\nFixture guide body paragraph.",
    faqs: [{ q: "Fixture guide question?", a: "Fixture guide answer." }],
    is_guide: true,
    og_image: null,
    meta_desc: null,
    active: true,
    agent_id: null,
    created_at: STAMP,
    updated_at: STAMP,
  },
];

export function getFixturePage(slug: string): NichePageRow | null {
  if (process.env.NODE_ENV !== "development") return null;
  return FIXTURES.find((f) => f.slug === slug) ?? null;
}
