# What Google actually shows: closing the SERP gap in the Ozaukee demand study

Addendum to `ozaukee-seo-demand.md`. Date: 2026-08-11. Researcher: agent.
Status: measurements, and one finding that reorders that study's recommendation.

---

## Why this exists

The demand study named one gap as its largest and said it was cheap to close:

> **AI Overviews, featured snippets, People Also Ask, and local pack presence on all 25 queries.** Unverified, because Google serves a JavaScript-only shell to a scraper [...] This is the largest single gap in the report and it is **cheap to close with one real browser session**. It matters most for the agent-hire queries, where a local pack would change the recommendation from on-site content to Google Business Profile.

This closes it with a real browser session against live google.com, logged out of nothing and rendering normally. Everything below is **directly observed**, not inferred. Screenshots were taken at observation time.

Scope: four decision-relevant queries, not all 25. These four were chosen because each one changes a recommendation.

---

## 1. The local pack is real, and it is above the fold

Query: `best realtor ozaukee county`

A **Places block with a map occupies the entire above-the-fold**, ahead of every organic result. The first organic listing (FastExpert) sits below it. Google also applied a "Top rated" refinement chip on its own.

The three packed businesses, with review counts:

| Business | Rating | Reviews | Location |
|---|---|---|---|
| Keller Williams Realty \| House-To-Home Team | 5.0 | 106 | Cedarburg |
| Zoeller Team, Michelle Vogds & Jennifer… | 5.0 | 43 | Cedarburg |
| Realty Executives Integrity | 4.9 | 233 | Cedarburg |

**The study's inference was correct.** For agent-hire intent, the Google Business Profile is a higher-leverage asset than any page on this domain. That was labeled "unverified but likely." It is now measured.

## 2. anthonystolp has no Google Business Profile

This is the finding that matters most, and it was not anticipated by the study.

**Observation A.** On Google Maps, `Anthony Stolp real estate Cedarburg WI` returns Stephanie Morano Long / RE-MAX United (5.0, 15), Scott W. Campbell Real Estate Group (5.0, 5), Keller Williams House-To-Home (5.0, 106), and Shorewest Cedarburg Grafton (3.0, 4). **There is no Anthony Stolp listing in the results at all.**

**Observation B.** The branded query `anthony stolp realtor cedarburg` returns **no knowledge panel and no Places block**, despite Google localising the query to Cedarburg, WI and offering local refinement chips. For a local service business, a branded search almost always surfaces the profile. Its absence on a branded query is strong evidence the profile does not exist, is unverified, or is not published.

So the highest-leverage lever section 1 just confirmed is **currently unavailable**. It is not a matter of optimising the profile. There is nothing to optimise.

This is now filed as its own issue. Note that any prior plan to run the profile as a Cedarburg service-area business was a decision about how to set it up, not evidence that it was ever created.

## 3. The competitive bar is reviews, and it is knowable

106, 43, 233, 15, 5, 4. The pack is not won by content or domain age, both of which are this domain's binding constraints. It is won by proximity, category, and review volume, none of which depend on the site being 84 days old.

That makes it the rare SEO lever that works **now** rather than in spring, which is exactly the filter the study's section 10 applied.

## 4. AI Overview owns the winnable content family

Query: `selling an inherited house in wisconsin` — item 3 on the study's ranked winnable list.

An **AI Overview occupies the full above-the-fold**, with a "Show more" expander. The first organic result (Clever Real Estate / listwithclever.com) appears only below it.

Cited sources visible without expanding: `estateplanningpeople.com`, **Cheng Real Estate Group**, plus 5 more collapsed.

Two consequences, pointing opposite ways:

- **Against:** ranking #1 organically for this family is worth materially less than the study's time-to-rank table implies, because position 1 is below an answer that satisfies the query.
- **For:** one of the cited sources is a **real estate agency site**. Citation by the AI Overview is demonstrably achievable for this query family by a business of this type. It is a different objective than ranking, and on this evidence a more attainable one.

The study explicitly declined to recommend `llms.txt`, AI-citation schema, or AEO services, and nothing here contradicts that. What it does establish is that the life-event content family is worth deepening for *citation*, and that success should be measured by appearing in the AI Overview, not only by organic position.

## 5. People Also Ask gives the page structure for free

Same query. PAA returned:

- Do I have to pay capital gains if I sell an inherited house?
- What to do when selling an inherited property?
- How much does it cost to transfer a deed in Wisconsin?

These are Google stating what it believes the unmet sub-intents are. They are the H2s for deepening the existing 795-word inherited-house page toward the study's measured 2,200 to 3,000 word bar. No keyword tool required.

The third one is a Wisconsin-specific procedural question, which is the intersection the study identified as winnable: statewide, portal-free, and servable. It must educate rather than advise, and route specifics to an attorney.

## 6. The broker page outranks the owned domain on a branded query

`anthony stolp realtor cedarburg`, organic order:

1. `exsellexperts.com/anthony-stolp`
2. `anthonystolp.com`
3. `exsellexperts.com/our-team`
4. `anthonystolp.com/buy`
5. Zillow

The broker's page outranks the owned domain for AJ's own name, and per issue #42 that page does not link back. Every branded search sends the higher-ranked result to a page that captures the visitor and does not pass authority onward. This strengthens the study's recommendation 1 rather than changing it.

---

## What this changes

The study's recommendation 2 was "claim the agent-review directory profiles." That still holds, but it is now second. **Creating and verifying the Google Business Profile comes first**, because section 1 shows the pack outranks every directory result the directories were being claimed for, and section 2 shows the profile does not exist.

Revised order of the winter actions, keeping the study's own filter of "must work at 84 days of domain age":

1. **Create and verify the Google Business Profile**, then begin accumulating reviews. Works immediately, independent of domain age, and is the block that sits above everything else on agent-hire queries.
2. Get the link from the broker page. Unchanged, still one email.
3. Claim the agent-review directory profiles. Unchanged in kind, demoted in order.
4. Publish the data center housing piece. Unchanged.
5. Fix the doorway exposure. Unchanged, still AJ's decision.

Deepening the life-event pages moves from "spring, for ranking" to "spring, for AI Overview citation," with PAA supplying the structure.

## Still open

- The remaining 21 queries were not observed. The four here were chosen because each changes a decision; the rest would refine rather than redirect.
- **Google Search Console access** remains the largest unclosed gap, per issue #51. Nothing here replaces it. This addendum measures what Google *shows*; Search Console measures what this site *gets*.
- Whether the absent profile is unverified versus never created. Only AJ can see that, and the distinction changes how long step 1 takes.
- AI Overview presence on the other life-event terms (divorce, foreclosure, downsizing) is untested and assumed similar. Worth confirming before investing in all four.
