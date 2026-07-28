# CLAUDE.md

Factual state and boundaries for this repo. **Procedures live in skills, not here.** The working rules live in `~/.claude/CLAUDE.md` and are not restated here.

Package manager and framework version rules live in `@AGENTS.md`, which is partly generated. Do not copy its contents here.

If this file disagrees with the code, the code is right. Fix this file in the same PR that proves it wrong.

---

## What this is

`anthonystolp.com`: a single agent real estate lead generation funnel. Next.js 16 App Router on Vercel. Public marketing pages feed one lead endpoint; an admin area behind a password gate manages leads, CMS driven pages, listings, and AI drafted market reports.

Single tenant by design, with the seam kept local. Live site with live ad spend pointed at it.

## Commands

```bash
bun dev                 # :3000
bun run build           # production build; this is also the typecheck
bun run start           # serve the build

bunx playwright test                            # e2e — dev server must ALREADY be running
bunx playwright test -g "hero renders"          # single test by title
bunx playwright test --project=chromium-mobile  # one viewport; desktop + mobile both run by default

bunx supabase db execute --file supabase/migrations/00NN_x.sql   # apply a migration
```

No lint script, no ESLint or Prettier config. Type checking happens through `bun run build`.

`playwright.config.ts` has no `webServer`, so it will not start the server for you, and it runs serialized at `workers: 1`.

## Architecture

### Auth: two independent gates

`src/proxy.ts` is Next 16's middleware equivalent, **not** `middleware.ts`. It gates `/admin/*` and `/api/admin/*` on an HMAC signed cookie.

Every admin route handler *additionally* calls `requireAdmin(req)` from `src/lib/admin-auth.ts` as defense in depth. **New admin routes must keep doing this** rather than relying on the proxy alone. Session crypto uses Web Crypto so the same module runs on edge and Node.

### Supabase is service role only

`getSupabase()` (`src/lib/supabase-server.ts`) is a lazy singleton on `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses RLS**. Never import it from a client component.

Lazy construction is deliberate: Vercel builds run without env vars, so a module load time client would break the build. SSG and ISR helpers (`niche-pages.ts`, `properties.ts`) wrap it in `trySupabase()`, which returns `null` and yields empty results at build time instead of failing. Admin write paths call `getSupabase()` directly and are allowed to throw.

### One lead endpoint, many funnels

`POST /api/lead` is the single ingestion point for every capture surface: contact form, home value, search gate, market report subscribe, open house sign in.

- The zod schema is **intentionally permissive**. Each funnel enforces its own UX requirements client side; the server requires only what produces a useful row plus an email. **Adding a funnel means adding optional fields, not a new endpoint.**
- `funnelStep: "address-only" | "completed"` supports two step capture. Passing `leadId` updates an existing row, but only when `visitorId` also matches, so a guessable UUID cannot drive an unbounded update.
- **Email is the durable channel.** Supabase write failures are logged and do not block the send. Only a failed email returns non 2xx.
- Side effects run in `after()` or unawaited promises so they never block the response: AI draft via Claude, Lofty push, n8n webhook, tracking backfill, farm loop close. Keep them that way.
- Public POST endpoints run `runLeadDefenses()` from `src/lib/bot-defense.ts`: origin allowlist, honeypot (`hp_company`, which trips a **silent 200**), and a Supabase RPC rate limiter with an in memory sliding window fallback.

### Visitor identity thread

An anonymous visitor is stitched to a lead by `visitorId`:

`/n/[token]` (offline QR, postcard, card redirect) mints `anthonystolp_vid` and `anthonystolp_token` → `src/lib/track.ts` sends every event to `/api/track` with that id → on lead submit, prior `tracking_events` rows are backfilled with the new `lead_id`, and the token's `context` resolves offline attribution.

`/n/[token]` and `createToken()` both enforce same origin targets to prevent open redirects.

### Single tenant seam

`src/lib/agent-profile.ts` hardcodes the profile: contact info, license, target zips, brand voice rules for Claude prompts, preferred lender. `getAgentProfile()` returns it for any id, and every row carries `agent_id` from `DEFAULT_AGENT_ID`.

The multi tenant swap is meant to be local to that one file. **Keep passing or deriving `agent_id` rather than reading the constant everywhere.**

### CMS driven pages

`niche_pages` → `/search/[slug]` and `properties` → `/property/[slug]`. Both ISR via `revalidate` plus `generateStaticParams`, edited through `/admin`, with zod schemas defined alongside the data access in `src/lib/niche-pages.ts` and `src/lib/properties.ts`. New rows appear after revalidation, not instantly.

### Market report pipeline

Monthly Vercel cron (`vercel.json` → `/api/cron/market-reports`, verified by `CRON_SECRET`, `maxDuration = 300`):

1. Stream Redfin's multi GB national zip file, aborting early once target zips are found
2. Upsert `market_stats`, idempotent on zip plus month
3. Claude drafts
4. **Two pass safety**: deterministic `validateDraft` plus Claude `factCheckDraft` against source stats

Both passes must succeed for `status: "ready"`; otherwise `"draft"` for human inspection. Sending is gated behind manual approval in `/admin/reports` unless `AUTO_SEND=true`. Outbound marketing email goes through `applyComplianceFooter()` for the CAN-SPAM address and unsubscribe headers.

## Hard constraints

- **`track.ts` event names are wired into live Google Ads and Meta conversion configs.** Renaming one silently breaks conversion tracking with no error anywhere. `home_value_lead`, `search_gate_view`, and the rest are external contracts, not internal identifiers.
- **CSP lives in `next.config.ts`.** Any new third party script, image host, or API endpoint must be added there or it is blocked in production only.
- **Feature flags are `NEXT_PUBLIC_*`, inlined at build time**, default OFF (`src/lib/feature-flags.ts`). Flipping one requires a redeploy, not an env change.
- **Tailwind v4 with no config file.** Design tokens are declared in the `@theme` block of `src/app/globals.css`: `cream`, `ink`, `accent`, `sky-*`, `--font-display`, `--font-sans`.
- **Env vars are documented inline in `.env.local.example`.** Read it before adding one.

## Deploy

Push to `main` deploys to Vercel. **Merge is release**, and this site takes live traffic and live ad spend.

Migrations are separate and manual: `bunx supabase db execute`. A merge that assumes new schema will break production until it is applied, so apply first.

Feature flag changes need a redeploy because they are inlined at build time.

## Documentation pointers

Read the pointer. Do not paste whole files into context.

| Need | Go to |
|---|---|
| Package manager and Next 16 rules | `AGENTS.md` (partly generated, do not duplicate here) |
| Next 16 API changes | `node_modules/next/dist/docs/` — read before writing, training data is stale |
| Domain terms | `CONTEXT.md` (root) |
| Why a choice was made | `docs/adr/`, one decision per numbered file |
| What to work on next | GitHub Issues via `gh`. See `docs/agents/issue-tracker.md` |
| Triage vocabulary | `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md` |
| Env vars | `.env.local.example` |

**GitHub Issues is the only backlog.** No parallel to do file, no next step list inside a doc. Found something worth fixing and not fixing it now? `gh issue create`.

**No living state file.** Session state is produced on demand by `/handoff` into `docs/handoffs/`, gitignored and disposable, deleted once consumed. Nothing describing "where we are" is ever committed.

## Agent skills

Capabilities live in `.claude/skills/`. This file supplies state and boundaries; skills supply procedure. Route by intent, or run `/ask-matt`:

| Situation | Skill |
|---|---|
| Request is vague or the plan has unresolved branches | `/grill-me`, or `/grill-with-docs` when domain terms are involved |
| Something is broken | `/diagnosing-bugs` (reproduce → hypothesise → instrument → fix → regression test) |
| Building or fixing in code | `/tdd` |
| Turning a conversation into work | `/to-spec`, then `/to-tickets` |
| Picking up or moving work | `/triage` |
| Before committing | `/code-review` |
| Ending a session or nearing a context limit | `/handoff` |

If a procedure written here ever contradicts a skill, the skill wins and the paragraph gets deleted from this file.

---

## Boundaries

### 1. Definition of done, and the commit gate

Done means the acceptance criteria are verified, not that it compiles.

There is no linter here, so the gate is: `bun run build` passes (it is the typecheck), the diffstat has been read, and the change has been observed doing what it claims. The commit body carries one evidence line:

```
Verified: submitted home-value form on local dev, row appears in
/admin/leads with visitorId stitched, Resend email received
Closes #23
```

No evidence line, no commit. An agent may commit; an agent may not close an issue.

**Push to main deploys to production**, and production is a live funnel with paid traffic pointed at it. Treat every merge as a release and never merge one you have not exercised.

### 2. Submit the funnel, do not just render it

This site's job is capturing leads, and every failure that matters is invisible from the page. A form that renders perfectly can drop the row, skip the email, lose the `visitorId` stitch, or trip the honeypot and return a **silent 200** that looks exactly like success.

Run `bun dev`, submit through the actual surface you changed, then confirm all three: the row in `/admin/leads`, the Resend email arriving, and the `visitorId` carried through. Read the browser console and the network tab, since a CSP violation is the usual cause of "the code is right but nothing happens," and it only appears in production unless you check.

Triggers: anything under `src/app/`, any capture surface, `/api/lead`, `/api/track`, `src/lib/track.ts`, `bot-defense.ts`, CSP or `next.config.ts`, and any criterion phrased as "it looks right" or "the user sees."

Skip when there is nothing to see: pure helpers, migration SQL, docs. If you cannot run the funnel, say so and name what went unverified. Never upgrade "compiles" to "works."

### 3. Branch and PR workflow

Always branch off main: `git checkout main && git pull && git checkout -b feat/...`. Never commit to main directly.

Prefixes are `feat/`, `fix/`, `chore/`, `docs/`. A branch is not a storage location: if work is worth keeping and is not landing this week, it becomes an issue and the branch is deleted.

### 4. Do not describe other repos here

Anything about how another repo works internally goes in that repo's CLAUDE.md and is referenced from here by pointer only. A copied fact cannot be kept honest.

### 5. Playwright against production writes real data

`PLAYWRIGHT_BASE_URL=https://anthonystolp.com bunx playwright test` **creates real `funnel_leads` rows and sends real Resend emails.** Those rows land in the same table the business runs on and the emails go to real inboxes.

Do not point the suite at production without asking. If it has been run against prod, delete the test rows from `/admin/leads` in the same session, before the context is lost.

### 6. Conversion event names are external contracts

Renaming anything in `src/lib/track.ts` breaks live Google Ads and Meta conversion tracking silently: no error, no failing test, just attribution going to zero and ad spend optimizing against nothing.

Treat those strings as frozen. If one genuinely must change, it changes in the ad platform configs first and that is an ADR, not a refactor.

### 7. Keep the single tenant seam in one file

Read `agent_id` from the row or the parameter, never from `DEFAULT_AGENT_ID`, outside `src/lib/agent-profile.ts`. Every constant read outside that file is one more edit standing between here and multi tenant.
