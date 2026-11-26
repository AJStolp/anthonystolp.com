---
title: "Washington County niche pages batch (West Bend, Hartford, Germantown)"
slug: washington-county-pages-readme
keywords: [washington county, west bend, hartford, germantown, niche pages]
summary: "Batch handoff for six Washington County town drafts on the dev branch, including every [CONFIRM] item for Anthony and the code changes Claude must make before the pages can ship."
target_path: niche_pages  # handoff only; not a site page
---

# Washington County pages: batch handoff

Draft date: Thursday, Nov 26, 2026 (America/Chicago). These are Markdown drafts only, on the `dev` branch, under `drafts/`. Do not merge them to `main` as files, and do not paste them into production paths until Anthony clears the `[CONFIRM]` items and Claude creates the CMS rows plus the code updates below.

The six pages are not hand-built routes. They are `niche_pages` rows rendered by `src/app/search/[slug]/page.tsx`. Copy is written to match the live Cedarburg and Mequon structure: a short `hero_copy`, a `body` with two H2s (`What to know about {Town}` / `How I work with {Town} buyers` on buy pages, and `What moves value in {Town}` / `How I prepare your {Town} home value` on value pages), plus custom `faqs`. Template H2s (market snapshot, listing alerts, questions, keep exploring) must not be added to the body. The phone line after the hero is already injected by the template; it is also repeated naturally in the how-I-work and FAQ CTAs.

Voice: first person as Anthony, casual but professional, ExSell Experts | Epique Realty (pipe format), local agent backed by a strong team, single contact at (262) 483-7932. No em dashes. Hyphens only in dictionary hyphenated words. NAP is left neutral: these drafts do not say he is based in Cedarburg or Germantown.

## Draft files

| Page | Path | Slug | Geo | Intent | Words (hero + body + FAQs) | Meta chars |
|---|---|---|---|---|---:|---:|
| West Bend homes for sale | `drafts/west-bend-homes-for-sale.md` | `west-bend-homes-for-sale` | `West Bend, WI` | buy | ~1,177 | 129 |
| West Bend home value | `drafts/west-bend-home-value.md` | `west-bend-home-value` | `West Bend, WI` | sell | ~942 | 139 |
| Hartford homes for sale | `drafts/hartford-homes-for-sale.md` | `hartford-homes-for-sale` | `Hartford, WI` | buy | ~1,105 | 147 |
| Hartford home value | `drafts/hartford-home-value.md` | `hartford-home-value` | `Hartford, WI` | sell | ~896 | 138 |
| Germantown homes for sale | `drafts/germantown-homes-for-sale.md` | `germantown-homes-for-sale` | `Germantown, WI` | buy | ~1,009 | 151 |
| Germantown home value | `drafts/germantown-home-value.md` | `germantown-home-value` | `Germantown, WI` | sell | ~856 | 140 |

Titles follow the live pattern and include WI. H1s also include WI (`Homes for sale in Hartford, WI` and `What is my Germantown, WI home worth?`), which is a deliberate departure from the current Ozaukee H1s, because Hartford and Germantown are ambiguous city names and the brief asked for WI in titles and H1s.

Create each row in `/admin` or with a fresh insert (`active: true`, `is_guide: false`, `geo` strings exactly as in the table). Do not re-run `supabase/seed_niche_pages.sql`. That seed covers only the 14 Ozaukee pages, uses `ON CONFLICT DO NOTHING`, and has stale titles and H1s.

Do not submit a sitemap or request indexing unless Anthony asks. The live sitemap is generated from active pages.

## Code changes Claude must make before these URLs can ship

Without these, homepage and footer links will 404, and the market snapshot H2 will be omitted.

1. `src/lib/communities.ts` (`COMMUNITIES`). Add:

   - `{ name: "West Bend", slug: "west-bend", zip: "53090 · 53095" }`
   - `{ name: "Hartford", slug: "hartford", zip: "53027" }`
   - `{ name: "Germantown", slug: "germantown", zip: "53022" }`

   Today's array is the Ozaukee set plus the county. Adding these three in the same list will mix Washington County towns into that grid. Prefer a "Washington County" cluster on the homepage, and replace the existing "Also serving Washington County…" line with real links. `tests/e2e/internal-links.spec.ts` expects every `COMMUNITIES` slug to 200, so the six `niche_pages` rows must exist and be active before that test will pass.

2. `src/lib/market-data/geo-stats.ts` (`GEO_ZIPS` and `ZIP_AREA`):

   - `"West Bend, WI": ["53090", "53095"]` with a `ZIP_AREA` note that Redfin reports two zips covering the city and some surrounding area, not the city limits alone.
   - `"Hartford, WI": ["53027"]` with a `ZIP_AREA` note that 53027 extends into the Town of Hartford and nearby areas.
   - `"Germantown, WI": ["53022"]`. Confirm whether that zip is wider than the village and add a `ZIP_AREA` note if it is.

   `geo` on the CMS rows must match these keys exactly, or `getGeoSnapshot()` returns null and the snapshot block is omitted.

3. Market-report cron zip list. Already done, no change required for the four town zips. `src/lib/agent-profile.ts` `targetZips` already includes `53090`, `53095`, `53027`, and `53022` (plus Jackson `53037` and Slinger `53086`). `src/app/api/cron/market-reports/route.ts` `ZIP_LABELS` already labels those zips. Confirm that `market_stats` rows actually exist for the four zips after the latest Redfin ingest; if a zip is missing, the snapshot will still omit.

4. Optional: add West Bend, Hartford, and the Village of Germantown to `areaServed` in `src/lib/json-ld.ts`. Washington County is already listed as an `AdministrativeArea`. Do not change `addressLocality` (Cedarburg on the agent, Germantown on the brokerage) as part of this work. That is the open NAP question for Anthony.

5. Optional: add the four zips to `ZIP_CHOICES` in `src/components/MarketReportSubscribe.tsx` if subscribers should be able to pick them in the UI. The cron will only draft a report for a zip that already has subscribers.

6. Optional later: add Washington County examples to the seller guides (`/search/selling-a-house-during-divorce-wisconsin`, `/search/selling-an-inherited-house-wisconsin`, `/search/selling-before-foreclosure-wisconsin`, `/search/downsizing-in-wisconsin`) and add town links on `/buy` and `/home-value`, which already mention Washington County in body copy. A county rollup page was not in scope.

7. After publish, re-inspect the six URLs in Search Console and add them to the ranking baseline. This handoff does not do that.

Schema on the pages themselves is already handled by the template when `is_guide` is false: BreadcrumbList, a RealEstateAgent `@id` reference to `https://anthonystolp.com/#agent`, and FAQPage from the custom `faqs`. Do not add Review or aggregateRating. Do not add a second LocalBusiness entity for the Germantown office.

## [CONFIRM] list for Anthony

None of the following is stated as fact in the drafts. Each appears as a `[CONFIRM: …]` tag in the copy. Strip the tag if the answer is no, or replace it with approved wording before publish.

### All three towns

- Current property tax rate or a short tax context he is willing to state. Drafts point buyers and sellers to the current bill and the Washington County treasurer, and do not invent a rate.
- City or village sewer vs septic or well on the edge of town, and whether that should be part of the buyer or pricing conversation.
- Typical commute times he actually quotes (downtown Milwaukee vs Menomonee Falls, Germantown, Grafton, or other workplaces). Drafts name corridors (Highway 41 / 45, I-41, County Line Road) but do not state minutes. Do not use the City of West Bend's "30 minutes north of Milwaukee" as a door-to-door time.

### West Bend

- Whether the West Bend School District plan to combine East and West High School as West Bend High School beginning with the 2027 to 2028 school year (and the Silverbrook Intermediate and Badger Middle School grade changes) is still current, and how he wants that phrased for buyers and sellers. The plan is taken from the district's published about page, but it is flagged until he approves the wording.
- Which lakes he actually works, and which of Little Cedar, Big Cedar, Silver, and Wallace Lake are in the city vs nearby. Also which lakes or trail locations should be used as value factors.
- Which neighborhoods or subdivisions, if any, he wants named (Villa Park and Prairie Meadow appeared in listing copy or keyword research). Drafts do not name them.
- Any lake or acreage examples he wants used in the "will buyers pay more" FAQ.

### Hartford

- Exact city vs town boundary guidance he uses with buyers, and any shorthand he wants in the FAQs.
- Current municipal boundaries around Pike Lake before any specific street is described as city or town.
- Whether a small Dodge County remnant of the city should be mentioned at all. Drafts leave it out pending a yes.
- How he talks about Hartford Jt. #1 / the School District of Hartford (K-8) vs Hartford Union High School, including any effect on pricing. The two-system structure is already in the copy as a verified fact; the pricing paragraph is flagged.
- Named subdivisions or builders he is comfortable citing (Copper Trails, Fairway Meadows, and similar names appeared in listings and may be dated).
- Whether to call out condo communities such as Bridlewood or Hartford Square, including senior condo inventory, on the buy page and in seller conversations.
- Whether Holy Hill (Town of Erin, near Hartford) should be used as a buyer landmark. It is not used as fact in the draft.

### Germantown

- Which elementary feeders he wants named. Germantown High School and Kennedy Middle School are mentioned as names that commonly appear on listings; elementaries are flagged.
- Named subdivisions he wants used (Shadowwood, Pilgrim Heights, Meadow Creek Crossing, Blackstone Creek, and Riversbend appeared in listings or keyword ideas). Drafts do not publish those names as fact.
- HOA frequency, typical lot size range, and how he wants subdivision or HOA homes compared with older ranches in the value FAQ.
- How he talks about Germantown vs Menomonee Falls, Richfield, and Mequon (school and tax line questions are likely).
- Whether the ExSell Experts | Epique Realty office in Germantown can be described as a place clients meet him. This is tied to the open NAP question below. These drafts do not say he is based in Germantown or in Cedarburg, and they do not treat the office as a second LocalBusiness on the page.

### Open NAP question (do not resolve in this batch)

The site still mixes two bases: agent schema in `src/lib/json-ld.ts` uses Cedarburg, WI as `addressLocality`, and brokerage schema, footer, and `/about` present Germantown as the head office. Leave that decision to Anthony. Do not "fix" schema addresses in passing. Once he chooses, the Germantown office can be mentioned in body copy on the Germantown pages only.

## Sourced stats used in the drafts

No city median, inventory count, or tax rate was invented. Official November 2026 closings were not out when this was written. City sold and listing figures are from Realtor.com key indicators as of November 2026 (charts on those pages run through October 2026). County closed-sale figures are from the Wisconsin REALTORS Association October 2026 report, released November 19, 2026 (PDF: https://www.wra.org/media/afwd3hf0/wisconsin_housing_report_october_2026.pdf). The template market snapshot, once `GEO_ZIPS` is wired and Redfin rows exist, will carry the site's own dated Redfin figures and should remain the primary "what do homes cost" reference.

### Washington County (WRA, October 2026, released Nov 19, 2026)

- October median sale price $420,000, vs $380,000 in October 2025 (+10.5%).
- October sales 139, vs 156 (−10.9%).
- Months of inventory 3.6, unchanged from October 2025.
- Year to date through October: median $419,500, vs $387,900 (+8.1%); sales 1,469, vs 1,467 (+0.1%).
- WRA average days on market (67 vs 64) was not used in the copy, because that series is not directly comparable to the site's Redfin snapshot.

### West Bend (Realtor.com, key indicators as of November 2026)

- Median listing $387,400 (down 3.13% from the prior month, down 8.29% from a year earlier).
- Median sold $350,000 (down 0.07% from the prior month, up 9.19% from a year earlier).
- $212 per sq ft.
- Active listings 159 (down 9.02% / 31.48%). This count was not used in the body, because Realtor.com geography can be wider than the city limits.
- Median days on market 39 (up 8.33% / 21.88%).
- Sale to list about 100% in November 2026.
- Zip 53095: median listing $409,900, median days on market 39.
- Zip 53090: median listing $368,450, median days on market 40.

### Hartford (Realtor.com, key indicators as of November 2026)

- Median listing $434,900 (down 3.33% from the prior month, up 13% from a year earlier).
- Median days on market 37.
- Sale to list about 100%.
- Zip 53027: median listing $439,900, median days on market 39.
- Median sold $290,000 (down 19.78% from the prior month, down 18.99% from a year earlier) was **not** used in the live copy. It sits far below the listing median and the county median and may be a thin or mixed sample. Leave it out unless Anthony reviews it.

### Germantown (Realtor.com, key indicators as of November 2026)

- Median listing $499,450 (up 0.09% from the prior month, up 1.95% from a year earlier).
- Median sold $500,000 (down 12.85% from the prior month, up 2.89% from a year earlier).
- Active listings 84 (not used in the body, same geography caution).
- Median days on market 34 (up 13.33% from the prior month, down 8.11% from a year earlier).
- Sale to list about 101%.
- Zip 53022: median listing $472,500, median days on market 39.

### Other sourced local facts (not market stats)

- West Bend: county seat; 2020 Census population 31,752 and Census Bureau July 1, 2025 estimate 32,268 (QuickFacts). City site: Milwaukee River, Kettle Moraine, historic downtown, about 1,200 acres of parks. West Bend School District (NCES, 5,365 students in 2024-25) and the district's published high school combination plan. Zips 53090 and 53095.
- Hartford: City of Hartford 2020 Census 15,626 and July 1, 2025 estimate 16,005 (QuickFacts); Wisconsin DOA Jan 1, 2025 estimate 15,941. Town of Hartford reports 3,353 residents and is home to Pike Lake. Two school systems: School District of Hartford / Hartford Jt. #1 (Lincoln and Rossman to Central Middle) and Hartford Union High School. Zip 53027.
- Germantown: Village of Germantown, 2020 Census 20,917 and July 1, 2025 estimate 21,050 (QuickFacts). Germantown School District. Zip 53022. I-41 / 45 and County Line Road as the corridor and county line. W and N grid addresses.

Redfin city housing-market pages were not used. Zillow home-value pages returned 403 from this environment, so no ZHVI figures appear in the drafts.

## Notes for Claude (this file)

This README is a handoff, not a niche page. Do not create a `niche_pages` row for it. After Anthony answers the `[CONFIRM]` list, strip or replace those tags in the six drafts, then create the six CMS rows and ship the code changes above. Keep all work on `dev` until review. Never push these drafts to `main` or into `src/app/` as standalone routes.
