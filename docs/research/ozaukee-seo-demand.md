# Ozaukee County SEO demand: what can actually be won

Research resolving issue #32, against the map in issue #27.

Date: 2026-08-05. Researcher: agent. Status: findings, not a decision.

---

## Verdict, up front

**SEO is a spring-and-beyond investment. It should not compete for winter hours.**

The single fact that decides it: `anthonystolp.com` was registered **2026-05-13**, verified against Verisign RDAP. The domain is **84 days old**. Nothing this domain does between now and March changes its ranking position for a commercial term, because the constraint is not content quality, it is domain history and links, and neither can be manufactured on a winter timeline.

The secondary fact that decides it: the demand is genuinely tiny. Ozaukee County recorded roughly **1,114 total home sales in 2025** across every agent, every brokerage, every price point. That is about 93 transactions a month county-wide. There is no keyword in this county worth six months of winter effort.

There is one real exception, and it is not a keyword. See "The one thing worth doing now" below.

---

## Method, and what I could not do

**I did not have access to a paid keyword tool.** No Ahrefs, no Semrush, no Google Keyword Planner for this market. I will not invent volumes.

The Google Ads MCP connection was checked and is **not AJ's real estate account**. The one accessible customer (`8386239992`) runs campaigns named "unChonk Search EN", a text-to-speech product, and its search terms are all "text to speech" and "read aloud". The second account (`5075270564`) returns a permissions error. So there is **no first-party keyword or impression data available for real estate in this market**. If AJ has Google Search Console on the domain, that is the single highest-value data source not yet consulted, and it is free.

What I used instead, and its confidence:

| Source | What it proves | Confidence |
|---|---|---|
| Google Suggest API (`suggestqueries.google.com`), queried directly, ~40 probes | Which queries clear Google's internal popularity floor, and which do not. **Ordinal, not cardinal.** | High for existence, none for magnitude |
| Wisconsin REALTORS / GMAR county sales counts | Hard ceiling on transaction intent | High |
| US Census / population reviews for town and county population | Denominator for per-town allocation | High |
| Verisign RDAP for domain age | Exact registration date | Certain |
| Direct fetch of the live site, sitemap, and page bodies | What exists today and how thin it is | Certain |
| Google Search Central spam and AI-features documentation | Google's stated policy, quoted verbatim with last-updated dates | Certain as to what Google claims |
| Published studies: Ahrefs, Semrush, Pew Research | Ranking timelines and AI Overview behavior, with sample sizes and dates | Moderate, and they disagree with each other where noted |

No paid backlink or keyword tool (Ahrefs, Semrush, Moz) was accessible. Every number below is either directly measured, quoted from a primary document, or explicitly labeled as derived.

**On Google Suggest as evidence.** Google only returns autocomplete suggestions for queries that clear an internal popularity threshold. So a suggestion returning results proves nonzero real demand. A suggestion returning **nothing** is genuine negative evidence that the query is below that floor. It cannot tell you whether a term gets 90 or 900 searches. It can tell you, reliably, that a term is not a thing people type. That distinction carries most of this report.

---

## 1. The demand, honestly

### The ceiling

Ozaukee County, 2025: **1,114 home sales**, median sale price $556,596. County population 95,027, about 39,504 households. That is a **2.8% annual turnover rate**.

Allocating those 1,114 sales across the farm towns by population share. **This allocation is derived, not measured**, and real distribution will skew toward Mequon on price and toward Grafton and Saukville on volume:

| Town | Population | Derived annual sales | Derived sales per month |
|---|---|---|---|
| Mequon (53092, 53097) | 25,143 | ~295 | ~25 |
| Cedarburg (53012) | 13,416 | ~157 | ~13 |
| Grafton (53024) | 13,068 | ~154 | ~13 |
| Port Washington (53074) | 12,720 | ~149 | ~12 |
| Saukville (53080) | 4,562 | ~54 | **~4.5** |

Read the Saukville row and let it land. A page targeting "Saukville homes for sale" is competing for search traffic attached to roughly **four and a half transactions a month, shared across every agent in the county**. Ranking first for it, if that were even achievable, would be worth a fraction of one deal a year.

Cross-check on inventory: a spot check of Cedarburg listings across portals showed **25 to 52 active homes** depending on the source. A whole town's inventory fits on one screen.

### What Google Suggest says actually exists

Queries where Google returns suggestions, meaning **real demand exists**:

| Query stem | Suggestions returned | Note |
|---|---|---|
| `cedarburg homes` | 10, deep | Includes `cedarburg homes for sale zillow` |
| `mequon homes for sale` | 10, deep | Includes `zillow`, `shorewest`, and `coming soon` |
| `port washington wi homes` | 10 | Includes `zillow` |
| `grafton wi homes` | 7 | |
| `saukville homes for sale` | 4, thin | |
| `what is my home worth` | 10 | **Every single one brand-modified**: zillow, redfin, realtor.com, chase, calculator |
| `ozaukee county property tax` | 10 | **All lookup intent**: search, records, bill, portal |
| `wisconsin offer to purchase` | 10, deep | Statewide process, form-seeking |
| `selling a house in wisconsin` | 6 | Mostly tax questions, plus FSBO paperwork |
| `wisconsin seller disclosure` | 6 | Statewide process |
| `port washington data center` | 10, deep | **See section 6** |

Queries returning **zero suggestions**, meaning demand is below Google's floor:

- `what is my home worth cedarburg`: **nothing**
- `home value mequon`: **nothing**
- `sell my house cedarburg`: **nothing**
- `cedarburg housing market`: **nothing**
- `cedarburg real estate agent`: **nothing**
- `realtor near me cedarburg`: **nothing**
- `best realtor in ozaukee`: **nothing**
- `moving to cedarburg`: **nothing**
- `best neighborhoods in mequon`: **nothing**
- `cedarburg vs mequon`: **nothing**
- `will the data center affect property values`: **nothing**
- `ozaukee county home prices`: three suggestions, two of which redirect to **sales tax rate**

That block is the most important data in this report. **The entire standard local-agent SEO playbook returns nothing here.** "Moving to X", "best neighborhoods in X", "X vs Y", "X housing market", "X real estate agent", "what is my home worth in X". None of them are queries people type in this county. They are queries SEO blog posts tell agents to target.

### Two demand traps

**Trap 1: home value intent is real but brand-owned.** `what is my home worth` returns ten suggestions and every one appends a brand or a tool: zillow, redfin, realtor.com, chase, calculator, by address. Home-value intent in this county is enormous relative to everything else, and it is expressed as a **navigational query to a competitor**. A searcher typing "what is my home worth zillow" cannot be intercepted by ranking. The home value funnel is a good asset. SEO is not how it gets fed.

**Trap 2: "Ozaukee County real estate" does not mean real estate.** Six of the ten suggestions under that stem are `tax lookup`, `tax records`, `real estate taxes`, `tax parcel`, `tax portal`, `tax bills`. People typing that phrase are trying to find their property tax bill on the county website. A page ranking for it would capture traffic with **zero commercial value**. The same pattern holds for school district queries: `mequon thiensville school` returns ten suggestions and all ten are administrative, calendar, jobs, supply list, staff directory. Nobody searching those is buying a house.

---

## 2. Who holds page one

For buyer-inventory terms, the answer is total and uniform. An unfiltered search for Cedarburg homes for sale returned, in order: **RE/MAX, Zillow, Homes.com, Coldwell Banker, Shorewest, Shorewest again, Homes.com again, Coldwell Banker Realty, Redfin**. Nine of nine results were national portals or large brokerages. **Zero independent agent sites appeared at any position.**

Method caveat: this is a search-API result set, which is a close proxy for the organic SERP but not a literal screenshot of one, and it carries no personalization or local-pack context. For a claim this lopsided, nine of nine, the proxy is good enough. For a marginal call it would not be.

This is structural, not incidental. These sites have the listing data, the domain authority, the crawl frequency, and a page for every city in America. Autocomplete confirms users have internalized it: `cedarburg homes for sale zillow` and `shorewest mequon homes for sale` are themselves suggested queries. Users are not searching for a page, they are searching for a **destination they already trust**.

**Terms the portals do not defend.** This is the deliverable, and the list is short:

1. **Wisconsin-specific transaction process and life-event content.** `wisconsin offer to purchase`, `wisconsin seller disclosure`, `selling a house in wisconsin`, and the situational cluster around divorce, inheritance, foreclosure, and downsizing. Portals publish generic national explainers. They do not publish Wisconsin-form-specific, Wisconsin-statute-aware content, because it does not scale to 50 states profitably. These SERPs contain law firms, the Wisconsin REALTORS Association, state agencies, and blogs, not Zillow.

2. **Hyper-local civic and news events.** The Port Washington data center. See section 6. Portals have no mechanism to cover a local zoning referendum.

3. **A single specific listing AJ has.** `/property/521-alta-loma` type pages, and `cedarburg open houses` which returned only three thin suggestions. Tiny volume, but a term where a real page about a real property genuinely competes.

Everything else on page one belongs to companies with a thousand times this domain's authority, permanently.

---

## 3. Intent split, and why it is worse than it looks

Splitting the measurable demand:

| Intent class | Share of local query demand | Can AJ serve it on his domain? |
|---|---|---|
| Buyer browsing inventory | **Dominant.** Every town stem's real-estate suggestions are "homes for sale", "houses for sale", "property for sale", "homes for rent" | **No.** No IDX on the domain. Broker hosts IDX at exsellexperts.com/anthony-stolp/ |
| Seller researching value | Real, but **brand-anchored to Zillow/Redfin** and **absent at town level** | Yes, the home value funnel serves it well, but SEO cannot deliver the traffic |
| Hiring an agent | **Effectively zero.** `cedarburg real estate agent`, `realtor near me cedarburg`, `best realtor in ozaukee` all return nothing. `mequon realtor` returns three, one of which is `shorewest realtors mequon` | Yes, but there is nothing to serve |
| Process and life-event, statewide | Real and steady | **Yes, and this is the match** |
| Civic and tax lookup | Real and high, **commercially worthless** | Irrelevant |

The intent split lands in the worst possible configuration for this site. **The intent with the most volume is the one intent the domain structurally cannot serve.** Buyers want to browse listings. The domain has no listings. That is not a content problem to be fixed with better copy, it is a missing product.

Note also: `anthony stolp` as a brand query returns only two suggestions, and one of them is `anthony stolp insurance`, a different person. Brand demand is currently zero and the name is contaminated by another entity.

---

## 4. What is built today, and the doorway-page problem

The live sitemap has **25 URLs**: 18 under `/search/`, 1 `/property/`, and 6 static pages. **Zero blog posts. `/blog` returns 404.** The evergreen post backlog has shipped nothing, so the 18 `/search/` pages are the entire content footprint.

Indexation looks partial. A `site:` query through DuckDuckGo's HTML endpoint, which is Bing-backed, surfaced only **7 URLs**. Google `site:` through the search API returned nothing usable. Both signals are weak and a null is not proof, but nothing suggests full indexation. Search Console would settle it in a minute.

The 18 pages fall into three families.

**Family A, seven geo buy pages** (`cedarburg-homes-for-sale`, `mequon-`, `grafton-`, `port-washington-`, `saukville-`, `thiensville-`, `ozaukee-county-`).

Measured directly: `mequon-homes-for-sale` is **315 words**, `cedarburg-homes-for-sale` is **322 words**, including navigation and footer. Neither shows any property listings. The Cedarburg opening copy promises "Browse active listings, get alerts when new ones hit MLS". The page cannot deliver that.

The hard measurement that matters: comparing the two pages sentence by sentence, **10 of Mequon's 18 body sentences are byte-identical to Cedarburg's, accounting for 44% of its body text.** Identical across pages, verbatim:

> "Tell me your budget and must haves and I will send live listings that actually fit, not whatever is trending."
> "When listings are tight, good homes go quickly, so being ready to move matters."

Unique content per city page amounts to roughly **150 to 180 words**, and most of that uniqueness is the Redfin stat block, meaning numbers rather than prose.

This is the highest-risk asset on the site, for three converging reasons:

- It targets the **most portal-dominated SERP class**, which it will never win.
- It targets the **one intent the site cannot fulfill**, so even traffic that arrived would bounce.
- It matches Google's documented spam policy on two of four criteria.

Google renamed the policy to **"Doorway abuse"** (Search Central spam policies, last updated **2026-05-15**). Verbatim, the criteria that match:

> "Having multiple domain names or pages targeted at specific regions or cities that funnel users to one page"
> "Creating substantially similar pages that are closer to search results than a clearly defined, browseable hierarchy"

Fourteen pages targeted at specific cities that funnel users to `/#contact` is a literal reading of the first. The 44% byte-identical measurement supports the second. The same document defines **"scaled content abuse"** as "many pages... generated for the primary purpose of manipulating search rankings and not helping users."

There are genuine mitigations and they should be stated: each page carries real, unique Redfin market data, the pages are cross-linked and browseable rather than orphaned, and there is no cloaking or redirect trickery. Google's actual test is whether the intermediate page is "not as useful as the final destination". A page with real local market stats has a defensible answer to that. A page with three name-swapped FAQs and copy promising listings it does not have does not.

Note also that real estate is **YMYL**. Google's helpful content guidance (last updated 2025-12-10) states trust is the most important E-E-A-T factor "particularly for Your Money or Your Life topics affecting health, finances, or safety". The bar here is higher than for a general-interest site.

**The prior constraint noted in the ticket, to avoid anything resembling doorway pages, is not a future risk to design around. It is already partly incurred.**

**Family B, seven geo home-value pages** (`cedarburg-home-value`, `mequon-`, `grafton-`, `port-washington-`, `saukville-`, `thiensville-`, `ozaukee-county-`). Same templated-grid structure. These target terms Google Suggest says **do not exist**: `what is my home worth cedarburg` and `home value mequon` both return nothing. Same duplication risk as Family A, with even less demand behind it.

**Family C, four Wisconsin life-event pages** (`selling-a-house-during-divorce-wisconsin`, `selling-an-inherited-house-wisconsin`, `selling-before-foreclosure-wisconsin`, `downsizing-in-wisconsin`).

Measured directly: `selling-an-inherited-house-wisconsin` is **795 words** across **8 distinct H2 sections**, with only **2% text overlap** with the city pages. It covers Wisconsin's informal probate track, the absence of state inheritance and estate tax, and stepped-up basis, carries substantive FAQs, and correctly defers legal questions to an attorney and tax questions to a CPA, which matches the standing copy rule.

**Family C is two and a half times the depth of Family A, targets non-portal SERPs, addresses seller intent the site can actually serve, and is statewide so the addressable pool is not capped at a town of 13,000.** The good pages are already built. They are outnumbered fourteen to four by the pages that are not.

**One thing the site does genuinely well, worth not breaking.** The technical foundation is above average for a solo-agent site. Niche pages carry `RealEstateAgent`, `RealEstateOrganization`, `BreadcrumbList`, `FAQPage` with proper `Question`/`Answer` pairs, and `PostalAddress`. The inherited-house page adds `Article` and `Person`. The homepage adds `WebSite`, `EducationalOccupationalCredential` for the license, and five `AdministrativeArea` nodes. Canonical is correct. `robots.txt` is permissive and places **no restrictions on AI crawlers**, which is the right posture. The problem with this site is not craft. It is age, links, and fourteen pages of duplicated prose.

---

## 5. Time to rank

**Answer: 12 to 18 months for anything commercial. Long-tail statewide terms are plausible in 6 to 12 months. Nothing lands this winter, at any effort level.**

The reasoning, in order of weight:

1. **Domain age: registered 2026-05-13** (Verisign RDAP). The domain is **84 days old**, registered for one year only. Ranking correlates strongly with accumulated history and links, and a brand-new domain in a commercial vertical has neither. This is not a variable that content moves.

2. **The measured distribution is brutal for new pages.** Ahrefs, published 2025-05-15, studying 1.3M random US keywords: the average #1 ranking page in Google is **5 years old**; **72.9% of top-10 pages are more than 3 years old**; and **only 1.74% of newly published pages rank in the top 10 within a year** (the same post cites 6.11% under a narrower filter, and I report both because the source disagrees with itself). Of pages that did break into the top 10, most took **61 to 182 days**. On competition specifically, Ahrefs found **94% of pages never ranked for high-volume keywords at all**, while low-volume rankings were "more evenly distributed".

3. **Backlink profile: effectively zero.** A phrase search for the domain surfaced no referencing page anywhere. Confirmed specifically: **exsellexperts.com/anthony-stolp/ links to Facebook, X, LinkedIn, Instagram, and Google Maps, and to zero external sites otherwise. It does not link to anthonystolp.com.** That is a free, topically perfect link being left on the table.

4. **Competition tier.** The buyer terms are held by Zillow, Redfin, Realtor.com, Homes.com, and RE/MAX. The authority gap is orders of magnitude, not increments.

5. **Content depth.** Fourteen of eighteen pages are ~320-word templated variants at 44% duplication. Under the helpful content framing, that inventory more likely suppresses the site's overall assessment than lifts it.

**On the "Google sandbox".** The widely repeated "3 to 9 month sandbox period" has **no primary source**. It is practitioner folklore. Google's actual position, from John Mueller in office hours: "we don't really have this traditional sandbox that a lot of SEOs used to be talking about in the years past." His framing is that search engines need time to confirm site quality, not that a penalty timer runs. The defensible version of the claim is the Ahrefs distribution above, which is measured rather than asserted.

Realistic bands:

| Target | Realistic time from today | Confidence |
|---|---|---|
| Wisconsin life-event terms (divorce, inherited, foreclosure, downsizing) | **6 to 12 months**, and only with real depth and some links | Moderate |
| A specific active listing address or open house | **Days to weeks** | High |
| A live local news event with almost no competition | **Weeks**, if published early | Moderate |
| Town-level "homes for sale" | **Never**, in any practical sense | High |
| Town-level "home value" | Fast to rank, because demand is zero. **Worthless.** | High |
| `mequon realtor` and agent-hire terms | Irrelevant, demand does not exist | High |

The honest summary: the fastest thing SEO can do for this site is rank a page about a house AJ is actually selling. Everything else is a spring problem.

---

## 6. The one thing worth doing now: the Port Washington data center

This is the single genuine finding that cuts against the verdict, and it is not really an SEO play, it is a local authority play that happens to rank.

`port washington data center` returns **ten deep autocomplete suggestions**: location, map, address, size, jobs, project, **water usage**, cost, **protest**. The question-form stem `does the port washington data center` returns **ten full natural-language questions**: how much it costs, where it will be located, when it will be completed, how big it will be, how much water it will use, how much power it will use, how many people it will employ, whether it is being built, **stop the port washington data center**, and did it get approved.

Note that `port washington wi data center` appears in autocomplete **above** `port washington wi homes for sale`. In one of AJ's six farm zips, the data center is a bigger search topic than housing.

Context, which is fully public: this is the Vantage "Lighthouse" campus, the Midwest anchor of the Stargate initiative, over $15 billion, about 672 acres of former farmland, roughly a gigawatt, completion targeted 2028, over 1,000 long-term jobs, and the largest single private investment in Wisconsin history. Cloverleaf assembled more than 1,900 acres from over 100 properties through a shell entity before the purpose was public. Land sold at up to $59,000 an acre, about 17 times assessed fair market value. Port Washington voters have already passed a referendum driven by concerns about the project.

Why this matters for this specific ticket:

- **Zillow, Redfin, and Realtor.com cannot and will not cover it.** They have no mechanism for local civic news. The competition is Ozaukee Press, WPR, Wisconsin Watch, and Urban Milwaukee, which are news outlets, not lead-generating competitors.
- **The question-form autocomplete is the shape AI answer engines consume.** Ten natural-language questions with no authoritative real-estate-side answer. Note the double edge: this is informational long-tail content, the profile Semrush found most likely to trigger an AI Overview, so a share of the value will be captured as a zero-click answer rather than a visit. That is acceptable here, because the payoff being sought is local authority and news links, not raw sessions.
- **The housing angle is completely unclaimed.** `will the data center affect property values` returns **nothing**, and `port washington data center home` returns **nothing**. Nobody has connected the biggest economic event in county history to what it does to house prices. That is a real, empty, defensible position.
- **It fits the stated content constraint.** The map says the content bet is drone, imagery, and data-driven visual storytelling, and that AJ does not appear on camera. A 672-acre construction site ten minutes from his farm is the best drone subject in the county.

The honest caveat, stated plainly: **the people asking these questions are not currently buying or selling houses.** They are neighbors, opponents, and job seekers. This does not convert like a home-value lead. What it buys is local authority, links from actual news outlets, and a reason for the county to know his name, which is worth more to a database of under 50 people than any keyword on this list.

---

## 7. AI answer engines

The intuitive answer here is wrong, and the data says so.

### Real estate is the least AI-absorbed category measured

Semrush, originally published March 2025 and refreshed through November 2025, analyzing 10M+ keywords plus Datos clickstream data: AI Overviews triggered on **6.49% of queries in January 2025, peaked at 24.61% in July, and settled at 15.69% in November 2025**. Broken out by industry as of November 2025, the highest saturation was Science at 25.96%, Computers and Electronics at 17.92%, People and Society at 17.29%.

**"Real Estate, Shopping, and Arts and Entertainment showed lowest rates (under 3%)."** Semrush attributes this to local search intent, which routes to maps and the local pack rather than to a generated summary.

So the honest answer to "is AI already absorbing this query class" is: **mostly no, and less than almost any other vertical.** The buyer-inventory and agent-hire queries that dominate this county are local-intent queries. Nobody asks an answer engine to show them 40 houses with photos and floor plans. Those searchers open a portal app.

### But the two page families face two different threat models

Semrush also found that AI-Overview-prone queries skew long-tail: nearly 60% sit in the 21 to 60 keyword-difficulty band, and nearly 60% have **100 or fewer monthly searches**. By intent as of October 2025, informational queries were 57.1% of AI Overview triggers.

That is precisely the profile of **Family C**, the Wisconsin life-event pages, and of the data center question cluster. So:

- **Family A and B (geo pages)** face almost no AI Overview risk, because real estate local intent triggers them under 3% of the time. Classic ranking and the local pack still decide those, and the portals still win them.
- **Family C (informational, statewide, low-volume, mid-difficulty)** is the profile most likely to trigger an AI Overview. It is simultaneously the fastest-ranking content for a new domain and the most click-taxed once it ranks.

**Treating both families identically is the strategic mistake.** They fail for opposite reasons.

### What the click tax actually costs, where it applies

Two credible studies, and they disagree, which is worth holding.

Pew Research Center, published 2025-07-22. 900 US adults on a tracked panel, browsing March 2025, 68,879 unique Google searches of which 12,593 produced AI summaries. Users clicked a traditional result on **8% of visits when an AI summary was present versus 15% when it was not**, and clicked a link inside the summary on **1% of all visits**. Sessions ended on 26% of pages with a summary versus 16% without.

Ahrefs, published 2025-04-17. 300,000 keywords, using aggregated Google Search Console data, comparing desktop position-one CTR March 2024 to March 2025: AI Overview presence correlated with a **34.5% lower average clickthrough rate**.

Pew's implied drop, 15% to 8%, is roughly a 47% relative fall, steeper than Ahrefs' 34.5%. They are not measuring the same thing. Ahrefs uses first-party Google data but only informational keywords at position one; Pew uses a behaviorally complete panel that is small once segmented, and **Pew does not break out local or real estate queries at all**. Neither study speaks directly to realtor queries. **I found no study that does.** Any claim about how AI search specifically treats real estate queries, including any inference in this document, is unevidenced.

### What citation requires that ranking does not

The most useful finding here is a negative one: **nobody publishes the criteria.**

Google Search Central, "AI features and your website", last updated 2025-12-10, states it plainly:

> "There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary."
> "You don't need to create new machine readable files, AI text files, or markup to appear in these features. There's also no special schema.org structured data that you need to add."

The only stated prerequisite is that a page be indexed and eligible for a snippet. Hold the tension: this is authoritative on what Google claims, and Google has an incentive to discourage a separate optimization industry. It is not necessarily a complete description of the system.

OpenAI documents its crawlers (OAI-SearchBot, GPTBot, ChatGPT-User) and Anthropic documents its own (ClaudeBot, Claude-User, Claude-SearchBot). **Neither publishes any criteria for how sources are selected or ranked for citation.** The silence is the finding. Every "GEO best practice" listicle asserting otherwise is inferring from correlation, not reading documentation.

**`llms.txt` is an unadopted convention, not a standard, and should not be built.** Google's John Mueller has stated publicly that no AI system currently uses it, comparing it to the deprecated keywords meta tag. Ahrefs measured it across 137,210 domains (study dated 2026-06-15): **97% of llms.txt files received zero requests**, AI bots were only 19.5% of what traffic there was, and **zero AI bots probed for non-existent llms.txt files**, meaning they only fetch when explicitly directed. The site's missing `/llms.txt` costs it nothing.

What is left, once the folklore is stripped out, is a mechanism Google does document: **query fan-out**, issuing multiple sub-queries and pulling from a diverse link set. That implies pages answering **specific sub-questions directly** have more surface area than pages answering one broad head term. The `FAQPage` schema already on these pages is consistent with that shape. "Consistent with" is inference, not evidence, and I am labelling it as such.

The one genuinely defensible asymmetry: classic ranking rewards accumulated domain authority and link equity, which an 84-day-old domain cannot have. Citation, whatever its mechanism, cannot be purely authority-driven, because answer engines routinely cite obscure sources when those sources hold a fact that exists nowhere else. **That is the only lever available here, and it argues for original local data rather than for restating what Zillow already publishes.**

### Where the evidence is thin, stated plainly

I have **no sourced position** on whether schema markup causally increases AI citation (Google explicitly says no special schema is needed, industry claims otherwise, no controlled study found), on the correlation strength between classic rankings and AI citations, or on whether entity signals matter more for AI answers than for ranking. Treat this whole section as directionally sound, not as a specification, and treat anyone selling AEO services against it as selling something undocumented.

---

## 8. Ranked winnable terms

Ranked by expected value inside a six-month horizon, which is a combination of achievability, real demand, and whether the site can serve the intent. Volume columns are **ordinal from Google Suggest**, not measured, and are labeled as such.

| # | Term or cluster | Demand signal | Portal-defended? | Site can serve it? | Time to rank | Verdict |
|---|---|---|---|---|---|---|
| 1 | **Port Washington data center, housing and land angle** | 10 deep suggestions on the topic, **zero on the housing angle** | **No.** News outlets only | Yes, fully | Weeks | **Build now.** Only genuinely open position |
| 2 | **Selling an inherited house in Wisconsin** | Real, statewide | No | Yes, feeds home value funnel | 6-12 mo | **Already built. Deepen it** |
| 3 | **Selling a house during divorce in Wisconsin** | Real, statewide | No | Yes | 6-12 mo | **Already built. Deepen it** |
| 4 | Selling before foreclosure in Wisconsin | Real, statewide | No | Yes | 6-12 mo | Already built, keep |
| 5 | Downsizing in Wisconsin | Real, statewide | No | Yes | 6-12 mo | Already built, keep |
| 6 | Wisconsin Offer to Purchase, explained | 10 deep suggestions | No | Yes, educational only | 6-12 mo | Add, with care. Much of the intent is FSBO |
| 7 | Wisconsin seller disclosure report | 6 suggestions | No | Yes, educational only | 6-12 mo | Add |
| 8 | Specific listing addresses, `/property/[slug]` | Tiny but perfectly matched | No | Yes | Days | Keep doing this |
| 9 | `cedarburg open houses` and town open house terms | 3 thin suggestions | No | Yes, system exists | Weeks | Low volume, near-zero cost. Keep |

Terms 2 through 5 already exist and need depth and links, not new pages. **The correct move is not to build more pages. It is to build fewer, better ones.**

---

## 9. Stop-chasing list

Explicitly, with the reason:

| Stop chasing | Why |
|---|---|
| `[town] homes for sale`, all seven towns | Portals hold 9 of 9 results. Site has no IDX and cannot serve the intent. Unwinnable and unservable |
| `[town] home value`, all seven towns | Google Suggest returns **nothing** for these. The demand does not exist |
| `what is my home worth [town]` | **Zero suggestions.** The real query is `what is my home worth zillow`, which is navigational to a competitor |
| `mequon realtor`, `cedarburg real estate agent`, `best realtor in ozaukee` | Two of three return **nothing**. Agent-hire search demand does not exist in this county |
| `ozaukee county real estate` | 6 of 10 suggestions are property **tax lookup**. Commercially worthless traffic |
| `[town] school district` content | All 10 suggestions are administrative: calendar, jobs, supply list. Not buyers |
| `moving to [town]`, `best neighborhoods in [town]`, `[town] vs [town]` | **All return zero.** The standard agent-SEO content playbook has no demand behind it here |
| `[town] housing market`, `ozaukee county home prices` | Zero and near-zero. **The market report pipeline is an email asset, not an SEO asset** |
| Building any more templated geo pages | Compounds existing doorway-pattern risk for terms already established as unwinnable or empty |

---

## 10. Recommendation

One recommendation, with the reasoning.

**Treat SEO as a spring channel. Spend winter hours elsewhere. Do exactly three small SEO things now, none of which needs a ranking to pay off.**

1. **Get the link from the broker page.** Verified: exsellexperts.com/anthony-stolp/ links out to Facebook, X, LinkedIn, Instagram, and Google Maps, and to no other external site. It does not link to anthonystolp.com. It is one email, it is free, it is topically perfect, and it is the highest-value single action available. Do it this week.

2. **Publish the data center housing piece.** Not for the ranking. For the drone footage, the local-news links, the reason to be the person in the county who has actually done the analysis, and the fact that the position is empty. This is the only place where original data creates something no portal or AI can source elsewhere.

3. **Fix the doorway exposure before it compounds.** Fourteen templated geo pages at 44% duplication, targeting terms that are either unwinnable or have zero demand, carry real downside and no upside. Either differentiate them properly or collapse them into a few substantive pages, and point buyer-inventory intent at the broker's IDX where it can actually be served. This removes a risk rather than chasing a gain. It is a decision for AJ, not a change to make unilaterally, and it should become its own issue.

Explicitly **not** recommended: writing an `llms.txt`, adding schema for AI citation, or buying AEO services. The evidence says the first is unused, the second is disclaimed by Google itself, and the third is sold against undocumented criteria.

Everything else waits for spring. When spring comes, the leverage is Family C, not Family A: statewide life-event and Wisconsin-process content is the only class here that ranks fast for a new domain, avoids the portals, and serves an intent the site can actually fulfill. Zero blog posts have shipped, so that is entirely upside rather than rework.

**The binding constraint named in the map, a database under 50 people, is not a constraint SEO can relieve on any timeline that matters this winter.**

---

## Open questions

- **Google Search Console access.** Free, first-party, and the one source that would replace most of the inference in this document with measurement: real impressions, real queries, real indexation. Not consulted, and it should be before any further SEO decision.
- **Actual indexation.** Only ~7 of 25 URLs surfaced in a Bing-backed `site:` check and Google returned nothing usable. Weak signals both. Search Console settles it.
- Whether the county-level 1,114 sales figure is WRA or GMAR sourced. It appeared in reporting; the WRA December 2025 release itself publishes state and regional totals, not county detail. The order of magnitude is not in doubt.
- Whether consolidating the geo pages would cost anything currently ranking. Search Console answers this in minutes.
- Whether epiquerealty.com links to the domain. Unverified, search budget exhausted.
