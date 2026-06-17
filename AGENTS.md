<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# anthonystolp.com

Lead-generation site for Anthony Stolp, a solo realtor at ExSell Experts at Epique Realty serving Ozaukee County and the Greater Milwaukee area. Goal: capture buyer/seller leads, then hand off to AJ. Deployed on Vercel — **`main` is production**.

## Stack

Next.js 16 (App Router, code in `src/app`), React 19, Tailwind, GSAP + Lenis (scroll animations). Backend is **Supabase** (accessed server-side with the service-role key — never client-side). Email via **Resend**. Home valuations via an embedded **bndryiq** iframe. Maps via Mapbox. Package manager is **bun**.

## Core systems

- **Niche SEO pages** — `/search/[slug]`, data-driven from Supabase `niche_pages`, managed in `/admin`. ISR (`revalidate = 3600`), enriched with Redfin market data + JSON-LD (Breadcrumb / RealEstateAgent / FAQ). Lib: `src/lib/niche-pages.ts`, `src/lib/market-data/`.
- **Funnels** — `/buy` (buyer hub), `/home-value` (seller, flag-gated), homepage self-routes by intent. Lead capture → `src/app/api/lead/route.ts` → Resend + n8n webhook.
- **Market reports** — cron (`src/app/api/cron/market-reports/`) emails subscribers; CAN-SPAM compliant (`src/lib/email-compliance.ts`).
- **Measurement** — `src/components/Pixels.tsx` renders GA4 / Google Ads / Meta pixel, all env-gated. Funnel events flow through `src/lib/track.ts` (mirrored to `window.gtag`). GA4 is live (`G-1032NNNCV7`); Search Console verified as a DNS domain property.
- **Admin** — cookie-auth (`src/lib/admin-auth.ts`), niche-page CMS + lead inbox + report editor. All admin routes are `noindex`.

## Conventions (the non-obvious stuff)

- **Copy: NO em dashes.** Use periods or commas. Brand voice rules live in `src/lib/agent-profile.ts` (`voiceNotes`): calm, honest, first-person "I", no fluff.
- **Feature flags** — `src/lib/feature-flags.ts`, `NEXT_PUBLIC_*`, inlined at build, **default OFF**. Production opts features in.
- **Branch workflow** — feature branch + PR. `main` auto-deploys to Vercel prod, so **do not commit to `main` unless AJ says so**.
- **Single-tenant by design** — `src/lib/agent-profile.ts` hardcodes AJ's profile (name, phone, license, address). A v2 `agents` table is planned for multi-tenant; consumers already pass `agent_id`.
- **OG images** — `metadataBase` is set in `src/app/layout.tsx`. Next replaces the `openGraph` object per route segment (not deep-merged), so any page with its own `openGraph` must spread `OG_IMAGES` from `src/lib/og.ts` to keep a social image.
- **Supabase at build** — env vars may be absent on preview builds; `trySupabase()` returns empty rather than failing the build, with real data filling in at runtime/ISR.

## Accessibility standards

The site is built to be accessible — match these patterns, don't regress them:

- **One `<h1>` per page**, semantic heading order. Use `sr-only` for a visually-hidden but crawlable/announced heading (e.g. `/home-value`).
- **Page shell**: a `.skip-link` to `#main` and exactly one `<main id="main">` per page.
- **Forms**: every input has a `<label htmlFor>`; convey state with `aria-invalid`, `aria-required`, and `aria-describedby` pointing at the error node. Validation/status messages use `role="alert"` / `role="status"` with `aria-live`.
- **Interactive widgets** use full ARIA: comboboxes (`role="combobox"` + `listbox`/`option`, `aria-expanded`, `aria-controls`, `aria-selected`), dialogs (`role="dialog"` + `aria-modal`).
- **Images**: descriptive `alt` for meaningful images, `alt=""` for decorative ones (e.g. background art).
- **Focus**: a global `:focus-visible` outline lives in `globals.css` — never strip focus rings.
- **Motion**: GSAP + Lenis animations should respect `prefers-reduced-motion`. (Currently a gap — not yet wired; honor it in new animation work and retrofit when touching `LenisProvider`/GSAP.)

## Security standards

- **Secrets are server-only.** Only `NEXT_PUBLIC_*` reaches the client, and those must be non-sensitive (analytics IDs, public map token). The Supabase **service-role** key is server-only via `src/lib/supabase-server.ts` — never import it into a client component.
- **Validate every external input at the boundary with zod** before use — API route bodies and lib parsers both do this. No raw `request.json()` straight into the DB.
- **Public form endpoints** (lead, track) run through `src/lib/bot-defense.ts`: honeypot field (`Honeypot.tsx`), origin check, and rate limiting.
- **Admin** is cookie-authed (`src/lib/admin-auth.ts`); all admin routes are `noindex`. **Cron** is gated by a `CRON_SECRET` header. **Signed links** (unsubscribe, tokens) use HMAC + `timingSafeEqual` (`src/lib/email-compliance.ts`, `src/lib/link-tokens.ts`) — compare with constant-time, never `===`.
- **`dangerouslySetInnerHTML`** is allowed only for `JSON.stringify`'d JSON-LD and trusted admin-authored content. Never pass user/lead input to it.

## Syntax & TypeScript patterns

- **`strict: true`**, and the codebase has **zero `any`** — keep it that way; type precisely. Import path alias is `@/*`.
- **`import type { … }`** for type-only imports.
- **Server Components by default.** Add `"use client"` only for interactivity/hooks (~16 of 39 components). Keep data fetching and secrets on the server.
- **Naming**: components are `PascalCase.tsx` in `src/components/`; libs are `kebab-case.ts` in `src/lib/`.
- **Metadata** via an exported `metadata` object or `generateMetadata` (see the `OG_IMAGES` note above). **Styling** is Tailwind utilities only (no CSS modules); `cream`/`ink` design tokens come from CSS variables.

## Env

See `.env.local.example` for the full list and what each key gates.
