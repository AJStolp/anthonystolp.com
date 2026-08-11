# Is geofencing a real lead channel for a solo agent in Ozaukee County?

Research note resolving issue #31, under the winter lead-gen map (#27). Compiled 2026-08-05.

**Evidence labels used throughout.** `[PRIMARY]` government, trade association, or a platform's own technical documentation. `[INDEPENDENT]` benchmark study with disclosed sample and method, published by a party not selling the thing measured. `[VENDOR]` published by a party that sells it, or a marketing blog. `[DERIVED]` arithmetic performed here from the cited inputs, not an observed result.

---

## 1. Verdict

**Geofencing is a product sold to agents because it demos well. It is not a viable primary lead channel for a solo agent in Ozaukee County, and the version most agents actually buy is not the thing being demoed.**

The four numbers that carry the verdict:

1. **36 cents.** Of every dollar entering a demand-side platform, only 36 cents reaches a consumer as a viewable, non-fraudulent, non made-for-advertising impression. 29% goes to ad-tech transaction fees, 35% to non-viewable, non-measurable, invalid, and MFA inventory. Agency and reseller fees were explicitly outside that study's scope, so the real figure for a small buyer going through a reseller is lower. `[INDEPENDENT]` ANA Programmatic Media Supply Chain Transparency Study, $123M of spend, 35.5B impressions, 21 marketers, Sept 2022 to Jan 2023.
2. **60% to 80% reseller markup.** Simpli.fi static inventory is roughly $5.00 CPM bought direct. The same inventory retails at $8.00 on the one published rate card in the category and around $9.00 through the reseller channel. The vendor side says this out loud: El Toro's CEO describes the white-label model as letting service providers "aggregate volume and get wholesale pricing that they can mark up to retail levels," creating "the opportunity for a double-digit margin." `[VENDOR, self-admitted]`
3. **4% and 2%.** Per NAR's 2025 Profile of Home Buyers and Sellers, 4% of sellers found their agent through a website and 2% hired an agent who sent them direct mail. **66% hired a referral or an agent they had used before.** There is no survey category at all for "saw an ad."
4. **Zero.** Of roughly fifteen vendors checked, exactly one publishes a rate card, and **not one publishes a contract length or a setup fee.** In a category where the buyer cannot see the price, the price is not what constrains the seller.

The honest qualifier. The arithmetic does not say geofencing produces no leads. Modelled on independent benchmarks it lands around $93 to $217 per raw web lead (section 3), which is in the same zone as Google search at roughly $87 to $103. The verdict is negative for four other reasons. The lead is a banner click rather than a search-intent lead, and no independent cost-per-lead benchmark for geofencing exists anywhere. The measurable minimum commitment is $1,500 to $2,500 a month against a database that cannot absorb or nurture what it would produce. The legal surface is the one part of digital advertising that has drawn active FTC enforcement, and the highest-exposure variant is the one being upsold. And the same money buys a materially better instrument in this specific county, which section 9 works through.

---

## 2. Three different products sold under one word

"Geofencing" as pitched to agents collapses three distinct things with different mechanics, costs, and legal exposure. Anyone selling it will happily demo the first and sell you the second or third.

### (a) Real-time geofence, mobile display and video

Draw a polygon on a map. Collect Mobile Advertising IDs of devices seen inside it. Serve display or video ads to those devices. This is the demo: a map, a shape, a competitor's open house inside the shape.

Published CPMs, all `[VENDOR]`, from the only public rate card in the category:

| Format | Direct to platform | Retail |
|---|---|---|
| Static display | around $5.00 | $8.00 published, around $9.00 reseller channel, $12.00 at larger shops |
| Video | | $15.00 to $17.00, up to $25.00 |
| OTT / CTV | | $25.00 to $60.00 |

Source: https://propellant.media/geofencing-marketing-costs-prices/

The comparison that matters. WordStream's independent benchmark gives real estate **display CPC of $0.75 at 1.08% display CTR**, which back-solves to roughly an **$8 CPM on plain, untargeted display**. Geofenced display at $8 to $9 retail is priced at par with ordinary display. The premium is over the $5 wholesale, not over the market. You are not paying for precision, you are paying for the person who drew the polygon.

### (b) Address-level and household targeting

Two genuinely different techniques get sold under one phrase, and the distinction decides the legal exposure.

**True IP targeting** (El Toro's product). Upload postal addresses, a mapping system appends an IP address to each household, ads serve to that IP. El Toro claims "38+ points of data to match an IP to a household with 95% accuracy." `[VENDOR]`

**"Addressable geofencing"** (what most resellers sell under that name) is not IP at all. It is polygon geofencing at parcel scale: "The addresses are then matched against plat line data to collect the exact physical location, size and shape of the individually matched addresses. The system then geo-fences each matched address." Claimed match rate "up to 90%," devices retargeted "for up to 30 days after they have left address." `[VENDOR]`

Be skeptical of both match-rate claims. El Toro's 95% describes the accuracy of matches it makes, not the share of your list it can match. "Up to 90%" carries an "up to." **No independently verified match rate for either product exists.** Nobody publishes the denominator.

Cost: no vendor publishes a price per thousand addresses. It is sold on CPM, bundled into a higher monthly tier. Propellant folds addressable into its $5,000/month tier at the same $8.00 CPM.

This is also the highest-exposure product, because it is the one that resolves a device or an IP to a specific private home. The FTC's Mobilewalla order specifically reaches data "that reveals the identity of an individual's private home." See section 7.

### (c) Geofence retargeting and geo-conquesting

Capture MAIDs seen inside a polygon historically, serve to them later. Lookback windows run 7 to 30 days commonly, some vendors offer 5 days to 6 months. Pricing is not differentiated. It is the same CPM as (a), and no vendor charges separately for the lookback.

The measurement trap lives here. Retargeting is scored on view-through attribution with wide windows, which systematically credits the ad for conversions that would have happened anyway. A 30-day view-through window against a broad reach buy means almost anyone who converts technically saw an ad. That is what makes retargeting demo beautifully and audit badly.

It is also the product the FTC actions bear on most directly, because a historical location audience is by construction a record of where identifiable devices have been.

---

## 3. Minimum viable spend, derived

Working from the independent benchmarks only.

**Inputs** `[INDEPENDENT]`. WordStream, 14,197 US accounts, more than $200M in Google Ads spend:
- Google Display Network average CTR, all industries: **0.46%**
- Real estate display CTR: **1.08%**
- Real estate display conversion rate: **0.80%**

A caveat that has to be stated plainly: **this data is from 2018 and there is no refreshed independent equivalent.** LocaliQ, WordStream's successor, no longer tracks display CTR. Any "2026 display benchmark" circulating is extrapolated or fabricated. One widely-linked page citing a "WordStream Display Industry Benchmarks Q1 2026" is citing a report that does not exist.

**Impressions required per lead** `[DERIVED]`:

```
Pessimistic (all-industry CTR):  1 / (0.0046 x 0.0080) = 27,174 impressions per lead
Optimistic (real estate CTR):    1 / (0.0108 x 0.0080) = 11,574 impressions per lead
```

**At the $8.00 published retail CPM:**

```
27,174 impressions x $0.008 = $217 per lead
11,574 impressions x $0.008 =  $93 per lead
```

**The monthly floor is set by vendor minimums, not by the math.** The math would let you buy one lead for $93. No vendor will sell you that.

| Entry point | Monthly | Impressions at $8 CPM | Modelled leads/mo |
|---|---|---|---|
| Propellant direct minimum | $1,000 media | 125,000 | 4.6 to 10.8 |
| Propellant test package | $1,500/mo for 3 months, $4,500 committed | 187,500 | 6.9 to 16.2 |
| Propellant "Growth" tier | $2,500 | 312,500 | 11.5 to 27 |
| Simpli.fi direct | $10,000 to $20,000 | | not reachable at this budget |

**So the practical monthly floor is $1,000 to $2,500, with a realistic first commitment of $4,500 across a three-month test.** That is the number section 9 spends elsewhere.

Two cautions on the model. It assumes the entire budget is media with zero management fee, which the rate card does not confirm. And it applies GDN-derived CTR to open-exchange programmatic inventory, which per the ANA study is 35% non-viewable, non-measurable, invalid, or MFA. Stacking the two published figures: an $8.00 retail CPM implies roughly $5.00 actually enters a DSP, of which 36% survives as a reachable impression, so **around $1.80 of every $8.00 reaches a real viewable impression, roughly 22 cents on the dollar.** `[DERIVED from two cited figures, not a measured result.]`

That also reframes the vendor's favourite stat. The widely-quoted **7.5% geofencing CTR is Reveal Mobile's own benchmark research**, a geofencing vendor measuring geofencing, against an independent GDN average of 0.46%. A 16x CTR lift over the market average is not a precision effect. On inventory that is 21% MFA by impression volume, an abnormally high CTR is a symptom, not a win.

### The audience-scale problem specific to a county this size

Ozaukee has 93,956 people in 39,300 households, 29,576 of them owner-occupied. `[PRIMARY, ACS 2024 1-year]`

At the Growth tier you are buying 312,500 impressions a month. Even under the fantasy of perfect targeting of every owner-occupied household in the entire county, that is **10.6 impressions per household per month**. In practice a 20 to 25 location geofence set in a county this small captures a device pool in the low thousands, which pushes monthly frequency per device into the dozens. You either blow out frequency against a tiny pool or you loosen the fences until it stops being geofencing.

And only **3.8% of owner households transact in a year** (section 5). A geofence cannot detect intent. Roughly 96% of every impression lands on someone who will not move for years.

The renter pool, which is what you would fence apartment complexes for on the buyer side, is **9,724 households county-wide**. That is the entire addressable base for the most-pitched real estate geofencing play, in a county that is 75.3% owner-occupied.

---

## 4. Head to head on the same dollars

Holding spend at the **$2,500/month Growth tier, $30,000/year**, in a county of 93,956 people.

| | Geofencing | Google Ads search | EDDM direct mail |
|---|---|---|---|
| Unit cost | $8.00 CPM | $3.22 CPC | $0.358 per piece delivered |
| Independent CPL | **none exists** | **$102.51** (13,474 US campaigns, Apr 2025 to Mar 2026) | see below |
| Modelled CPL | $93 to $217 `[DERIVED]` | $87 to $103 | $36 to $143 per response |
| What $30,000/yr buys | 3.75M impressions | roughly 292 leads | **83,800 pieces** |
| Intent signal | none, proximity only | high, the user typed the query | none, but physical and durable |
| Attribution | view-through, inflates | click and conversion | trackable via QR or unique URL |

Note the WordStream search figures do not reconcile internally: $3.22 CPC divided by 3.70% conversion rate is $87.03, not the reported $102.51, because each metric is an independently computed median. Treat $87 to $103 as the band rather than quoting $102.51 as precise.

**Direct mail cost basis** `[PRIMARY for postage, VENDOR list price for print]`:

```
USPS EDDM Retail postage       $0.260 per piece   (post July 12 2026 price change, +4.8%)
Printing, 6.5x9 at 5,000       $0.098 per piece   (published list price, single source)
                               -----------------
Delivered cost                 $0.358 per piece
5,000-piece drop               $1,791
```

| Response rate | Responses per 5,000 | Cost per response |
|---|---|---|
| 2.0% | 100 | $17.91 |
| 1.0%, realistic ceiling for saturation mail | 50 | $35.82 |
| 0.5% | 25 | $71.64 |
| 0.25%, realistic floor | 12.5 | $143.28 |

An honesty check on the mail side. The famous **4.9% prospect-list response rate from the ANA/DMA Response Rate Report describes a targeted, addressed mailing to a purchased list.** EDDM is unaddressed saturation mail to every door on a carrier route. Applying 4.9% to EDDM overstates results by roughly an order of magnitude. The 0.25% to 1% band above is the defensible one. Even so, **EDDM beats Google search's $102.51 CPL at any response rate above 0.349%**, which sits inside that band.

The comparison that actually decides it is not cost per lead, it is what the money physically buys:

> **$30,000/year of geofencing buys 3.75 million anonymous, largely non-viewable, unattributable impressions.**
> **The same $30,000 buys 83,800 delivered mail pieces. That is every one of the 8,002 households in 53012 Cedarburg, ten times a year. Or all 35,559 households across the six farm ZIPs, 2.4 times.**

`[DERIVED]` from $30,000 / $0.358 and the ACS household counts in section 5.

### Meta lookalikes, in a county this size

Meta is not a live comparison here, and the reason has nothing to do with budget. Under the Housing special ad category the targeting is stripped to the point where a neighborhood-level campaign is not constructible, and standard lookalike audiences are unavailable at any seed size. See sections 7 and 8.

---

## 5. The county, as a denominator

`[PRIMARY]` ACS 2024 1-year estimates and the GMAR / Metro MLS year-end release.

| Metric | Value | Source |
|---|---|---|
| Population | 93,956 | ACS 2024 1-yr, B01003 |
| Households | 39,300 | ACS 2024 1-yr, B11001 |
| Owner-occupied | 29,576 (75.3%) | ACS 2024 1-yr, B25003 |
| Renter-occupied | 9,724 | ACS 2024 1-yr, B25003 |
| Median household income | $99,621 | ACS 2024 1-yr, B19013 |
| Median owner-occupied value | $433,700 | ACS 2024 1-yr, B25077 |
| Closed sales, 2025 | 1,114, down 0.9% YoY | GMAR / Metro MLS year-end, 2026-01-14 |
| **Average** sale price, 2025 | $556,596, up 3.6% | GMAR / Metro MLS year-end, 2026-01-14 |

Note the price series is **averages, not medians**. Do not conflate the $556,596 average sale price with the $433,700 ACS median owner-occupied value. They measure different things about different populations.

**Turnover** `[DERIVED]`: 1,114 / 29,576 = **3.77% of owner households per year**, roughly 1 in 27. Those 1,114 sales represent up to 2,228 commission sides.

**Farm ZIPs** `[PRIMARY, ACS 2024 5-year ZCTAs]`. ZCTAs approximate but do not equal USPS ZIPs, and USPS carrier routes, which is what EDDM actually targets, differ from both.

| ZCTA | Area | Households | Median HH income | Median home value |
|---|---|---|---|---|
| 53012 | Cedarburg | 8,002 | $96,090 | $422,700 |
| 53092 | Mequon | 8,460 | $128,156 | $473,300 |
| 53097 | Mequon / Thiensville | 2,489 | $135,929 | $499,800 |
| 53024 | Grafton | 8,273 | $92,390 | $366,300 |
| 53074 | Port Washington | 5,958 | $79,423 | $296,600 |
| 53080 | Saukville | 2,377 | $80,360 | $313,500 |
| | **Total** | **35,559** | | |

35,559 households, 90% of the county.

### Break-even, which is more useful than a folklore conversion rate

A significant negative finding. The commonly cited 0.4% to 1.2% internet-lead-to-close conversion rate **cannot be traced to any primary study.** NAR's research hub publishes no such statistic. It circulates as blog quoting blog with no locatable sample or methodology. Treat it as folklore. Inverting the question produces something defensible instead:

```
GCI per side at 2.5% of $556,596   = $13,915
Google Ads CPL                      =    $102.51
Leads affordable per closing        =    135.7
Break-even lead-to-close rate       =     0.74%
```

**Paid search breaks even at a 0.74% lead-to-close rate, gross, before splits, before management fees.** That sits inside the folklore band, which is the point. Whether or not the band is real, paid search at this price point is a break-even-to-marginal channel that only works if conversion lands at the top of the range. Geofencing, modelled at $93 to $217 with a weaker intent signal, is the same channel with worse odds and no independent benchmark to check it against.

By contrast a 5,000-piece EDDM drop at $1,791 needs **one closing per 5,000 pieces, 0.02% of pieces**, to return roughly 7.8x gross.

**Unfilled gap:** no credible source for an average commission rate per side was obtainable. The 2.5% above is a stated assumption, not a citation. Epique Realty's flat-fee model means agent-retained GCI is closer to gross than a traditional split implies, but the current fee schedule was not verified.

---

## 6. Vendor landscape, and whether a developer can just run it himself

### What the market looks like when you ask it for a price

| Vendor | Minimum monthly | Contract | Setup fee | Pricing public? |
|---|---|---|---|---|
| Propellant Media, direct | $1,000 media, or $1,500/mo test for 3 months | not disclosed | not disclosed | **yes, full rate card** |
| Propellant, white-label channel | $500 media per client | not disclosed | not disclosed | yes |
| Simpli.fi, direct | $10,000 to $20,000 | not disclosed | not disclosed | no, sales-gated |
| Choozle | $99/mo platform fee, geofencing reportedly needs more than $5,000/mo | not disclosed | not disclosed | partial |
| StackAdapt | no stated minimum, no lock-in | none stated | "no hidden tech fees" | no, tiers named without dollars |
| The Trade Desk | $100K to $1M per quarter for a direct seat | sales relationship required | | no |
| GroundTruth Ads Manager | self-serve, "no contracts, no friction, no barriers to entry" | none | | no dollar figures |
| El Toro | CPM-based, not disclosed | not disclosed | not disclosed | no |
| AdCellerant, Bullseye Local | white-label channel only | | | **no** |
| Real Geeks, BoomTown, Ylopo | **none of them sell geofencing as a discrete product**, these are CRM, IDX, and lead-gen | | | partial |
| SharpSpring Ads | product effectively gone, became Constant Contact Lead Gen and CRM, itself discontinued | | | not applicable |

**One rate card in the whole category. Zero published contract lengths. Zero published setup fees.** That is the finding. A category where the buyer cannot see the price is a category priced on what the buyer will tolerate.

Worth flagging separately: **the platforms an agent already knows, Real Geeks, BoomTown, Ylopo, do not sell this.** If geofencing were a load-bearing real estate channel, the real estate lead-gen vendors would have productised it. They have not.

### Can a technically capable operator self-serve around the middleman?

The answer is a qualified no, and the reason is not the one you would expect.

**Google Ads.** Location targeting supports countries, regions, cities, **postal codes**, and radius, with a **minimum radius of 1 km**. "Presence" targets users physically in the location; "presence or interest" also catches people who have shown interest in it. Google notes it "only permits targeting for locations that adhere to minimum privacy thresholds where minimum area and minimum user counts are met." **No polygon targeting. Circles and administrative boundaries only.**

**DV360.** Supports region including postal code, points of interest by lat/long, business chain, and proximity lists. "The minimum radius is 1 KM. A radius must encompass a population of at least 1,000 people to meet the privacy standards." **DV360 does not document custom polygon targeting or geofencing at all.** Only radial. And DV360 is partner-gated in practice rather than open self-serve.

**This is the key technical finding: the polygon capability the resellers sell genuinely does not exist in Google's stack.** They are not simply marking up something self-serve. To draw a shape around a competitor's open house you have to buy through someone with a geofencing DSP, which means paying the markup, which means accepting the ANA waterfall on top of it.

**Meta.** Under the Housing special ad category, ZIP targeting is removed and the radius floor is forced to 15 miles. Neighborhood targeting is not available at all. See sections 7 and 8.

**Genuinely low-minimum self-serve DSPs.** StackAdapt has no minimum and no lock-in, and its self-serve tier is open to "independent marketers and lean organizations with programmatic experience," but **polygon targeting is not mentioned anywhere in its published plans**, and a third-party estimate puts its fee at roughly 15% of media spend or a CPM markup. GroundTruth Ads Manager is the closest to an answer, advertising "zero barriers to entry, no rigid long-term contracts" with proximity targeting, location-based audiences of past visitors, and competitive conquesting, but publishes no pricing and does not confirm polygon capability publicly. Choozle's $99/mo platform fee does not reach geofencing. Simpli.fi's self-serve tier is sales-gated, and G2 reviewers report "markups on ad spend that significantly exceeded what was initially discussed."

**Net.** Self-serve gets you radius targeting on Google, which is a weaker product than what is being sold, and gets you nothing usable on Meta because of the housing category. The genuinely differentiated capability, drawn polygons and address-level fences, is only purchasable through a reseller, at a 60% to 80% media markup, stacked on a supply chain that returns 36 cents on the dollar. The one honest self-serve path, GroundTruth, still will not quote a price in public.

---

## 7. Legal and policy constraints

*Pending. See section 10.*

---

## 8. The database problem, and whether it disqualifies audience-based paid channels

**It does. Twice over, for independent reasons.**

**First, on size.** Meta's own developer documentation states the hard floor: *"Origin audiences must have at least 100 members,"* with at least 100 from a single country. `[PRIMARY]` https://developers.facebook.com/docs/marketing-api/audiences/guides/lookalike-audiences/

The database is under 50 people. **A lookalike audience cannot be created at all.** This is not a quality problem or a performance problem, it is a hard technical floor the seed does not clear.

Clearing it would not be enough either. The same documentation recommends *"200 or more members who converted."* Meta's consumer-facing guidance is widely reported to recommend 1,000 to 5,000. Under 50 total contacts, only some of whom are past clients, is roughly one order of magnitude short of the technical minimum and two orders short of the recommendation.

**Second, on category.** Real estate advertising falls under Meta's **Housing special ad category**, a consequence of the 2022 DOJ and HUD settlement over discriminatory ad delivery. Under that category, standard lookalike audiences are unavailable regardless of seed size, ZIP code targeting is removed, age and gender and detailed demographic targeting are removed, and the minimum location radius is forced to 15 miles in the US against a 1 mile normal minimum. A 15 mile radius centred on Cedarburg covers most of the north side of metropolitan Milwaukee. **Neighborhood-level Meta targeting for housing is not constructible.** The lever the entire "Meta lookalikes" strategy depends on does not exist in this category.

*Sourcing caveat: Meta's Business Help Center pages are JavaScript-rendered and could not be retrieved as primary text. The 15 mile figure is consistent across multiple independent practitioner sources and traces to the HUD settlement, but confirm it in Ads Manager before relying on it operationally.*

**Third, and this outlasts the other two.** Retargeting requires site traffic volume and lookalikes require a seed. Both are downstream of an audience the business does not have yet. Buying paid reach before the audience exists is paying full retail for the least efficient possible version of the channel. **The correct sequencing is to build the seed first.** Every dollar spent on a seed-dependent channel before the seed exists is spent at the worst price that channel will ever offer.

The 5,408-lead Lofty pond is the obvious latent seed asset, and is worth evaluating on exactly this basis: not as a calling list, but as the only audience file in the business large enough to clear a platform minimum. That evaluation belongs in its own ticket.

---

## 9. If not this, then what

The counterfactual is not "spend nothing." It is that the same $1,500 to $2,500 a month buys a strictly better instrument in this county.

**The single number that should drive the winter plan.** NAR's 2025 Profile of Home Buyers and Sellers, on how sellers found their agent:

| How sellers found their agent | Share |
|---|---|
| Referred by friend, neighbor, or relative | 37% |
| Used an agent they had worked with previously | 29% |
| Responded to direct personal outreach from an agent | 5% |
| Found through a website | **4%** |
| Referred by another agent or broker | 4% |
| Met at an open house | 3% |
| **Hired an agent who sent direct mail** | **2%** |
| Contact info from a For Sale or Open House sign | 2% |
| Walked into or called an office | 2% |
| Employer or relocation referral | 1% |

**66% is referral plus repeat. There is no line item for "saw an ad."**

*Sourcing caveat: the full breakdown sits behind NAR's paid report. These figures come from BAM's reporting of the 2025 Profile. The headline 66% and the 91% agent-usage figure are confirmed against NAR's own materials. The line-by-line breakdown should be verified against the purchased report before it is quoted publicly.*

Ranked, with the comparison that justifies each:

**1. Geographic farm by mail, at real saturation depth.** $30,000/year buys 83,800 EDDM pieces, or every household in Cedarburg ten times over. Against a county where 3.8% of owner households transact annually, saturating one 8,000-household ZIP means appearing in front of roughly 300 transacting households every year, repeatedly, with a physical object. Direct mail's median ROI is reported at 112% against 93% for paid search and 89% for online display. At $1,791 per 5,000-piece drop, one closing per drop returns roughly 7.8x gross. The realistic first commitment is one ZIP, monthly, for twelve months, roughly $1,800/month. That is the same order as the geofencing minimum, buying an instrument that ends up on a kitchen counter instead of 22 cents on the dollar of open-exchange impressions.

Operational constraints to design around: EDDM Retail caps at 5,000 pieces per ZIP per day and requires a *flat*, so a 6x9 card is likely too small to qualify and 6.5x9 is the standard size. Verify against the DMM before designing. 53012 Cedarburg at 8,002 households needs two mailing days or a permit.

**2. Systematise referral and repeat, which is 66% of the market and currently unserved.** The database being under 50 is the binding constraint on the entire business, and it is the same constraint that kills the paid audience channels. Anything that grows it compounds. Anything that does not, does not. The September 4 closing is the first referral asset the business has ever had, and it is worth more than $30,000 of impressions.

**3. Google search, small and metered, as the only paid channel carrying a real intent signal.** $102.51 CPL, 0.74% break-even lead-to-close. Genuinely marginal, but marginal on measurable clicks against typed queries rather than on view-through credit for banner impressions. If any paid dollar goes anywhere this winter, it goes here, capped, and it is judged on closings rather than on leads.

**4. Not geofencing.** Not at a $1,500 to $2,500/month minimum, not at 22 cents of the dollar reaching a viewable impression, not with zero independent CPL benchmark, not with an active FTC enforcement surface underneath the data supply, and not into a business with no capacity to nurture the leads it would produce.

**Revisit condition.** Geofencing becomes worth re-examining only if all three become true: the database clears 1,000 contacts, so audience-based targeting stops being a technical impossibility; there is listing inventory worth conquesting around, so the polygons have something to point at; and there is a nurture system that will not drop a display-sourced lead. None of the three is true today.

---

## 10. Open gaps

1. **Legal and policy section is unwritten.** Pending the FTC enforcement, sensitive-location, state privacy law, Google and Meta housing policy, NAR Article 12, and Wisconsin REEB advertising research.
2. **Average commission rate per side.** No credible accessible source. The ROI arithmetic rests on a stated 2.5% assumption.
3. **Zillow Premier Agent and Realtor.com per-lead cost.** No public rate card exists. Priced per ZIP by a sales rep.
4. **Lead-to-close conversion rate.** Appears to be unsourceable folklore. The break-even inversion in section 5 is the honest substitute.
5. **Meta's 15 mile housing radius minimum and the lookalike recommendation range.** Business Help Center not machine-retrievable. Confirm in Ads Manager.
6. **Post-2018 independent display CTR benchmark.** None exists. The 0.46% figure is the last defensible one.
7. **EDDM flat-size eligibility** for a 6x9 piece. Likely disqualifying. Verify against the DMM.
8. **Second printer quote.** Only one published list price was accessible.
9. **Setup fees and contract lengths** for every geofencing vendor. Not published by any of them. Would require sales calls.

---

## 11. Sources

**Market and demographic**
- ACS 2024 1-year, Ozaukee County, tables B01003, B11001, B25003, B25077, B19013, via https://censusreporter.org/profiles/05000US55089-ozaukee-county-wi/
- ACS 2024 5-year ZCTA profiles, https://censusreporter.org/profiles/86000US53012-53012/ and equivalents
- GMAR / Metro MLS year-end housing statistics, 2026-01-14, https://gmar.com/wp-content/uploads/2026/01/12-31-2025-Housing-Statistics-PR-AI-Assisted.pdf
- Wisconsin REALTORS Association, December 2025 report, https://www.wra.org/HSRDec2025/

**Benchmarks**
- WordStream / LocaliQ 2026 Google Ads Benchmarks, https://www.wordstream.com/blog/2026-google-ads-benchmarks
- WordStream Google Ads industry benchmarks, display data, https://www.wordstream.com/blog/ws/2016/02/29/google-adwords-industry-benchmarks
- ANA Programmatic Media Supply Chain Transparency Study, complete report, Dec 2023, https://www.adslot.com/wp-content/uploads/2023/12/ana-programmatic-media-supply-chain-transparency-study.pdf
- MarTech coverage of the ANA study, https://martech.org/ana-study-finds-25-of-programmatic-ad-dollars-are-wasted/
- Marketing Dive coverage of the ANA study, https://www.marketingdive.com/news/ana-programmatic-advertising-report-MFA-crackdown/701705/
- Digiday, ANA programmatic transparency audit, https://digiday.com/marketing/the-rundown-the-anas-latest-programmatic-transparency-audit-confirms-many-open-secrets/
- Adalytics, ad tech supply fees, https://adalytics.io/blog/adtech-supply-fees
- NAR 2025 Profile of Home Buyers and Sellers, https://www.nar.realtor/news/real-estate-news/nar-2025-profile-of-home-buyers-sellers-reveals-market-extremes
- NAR top-10 takeaways, https://www.nar.realtor/blogs/economists-outlook/top-10-takeaways-from-nars-2025-profile-of-home-buyers-and-sellers
- Agent-selection breakdown as reported by BAM, https://nowbam.com/how-home-buyers-and-sellers-find-their-agents-in-2025/
- Printing Impressions on ANA Response Rate Report 2024 figures, https://www.piworld.com/post/revisiting-response-rates-why-direct-mails-roi-keeps-rising/

**Direct mail**
- USPS Every Door Direct Mail, https://www.usps.com/business/every-door-direct-mail.htm
- USPS July 2026 price change announcement, https://about.usps.com/newsroom/national-releases/2026/0409-usps-recommends-new-prices-for-july.htm
- Costello Print Shop 6.5x9 EDDM list price, https://costelloprintshop.com/sacramento/marketing-materials/every-door-direct-mail-postcards/6-5x9-eddm-postcards/

**Vendors and platforms**
- Propellant Media geofencing costs and prices, https://propellant.media/geofencing-marketing-costs-prices/
- Propellant Media small business pricing, https://propellant.media/small-business-pricing-package/
- Propellant Media addressable geofencing, https://propellant.media/addressable-geo-fencing/
- Propellant Media vendor roundup, https://propellant.media/geofencing-marketing-company-providers/
- El Toro IP targeting, https://eltoro.com/ip-targeting/
- Keypoint Intelligence / InfoTrends, "Adding Value to Direct Mail Through IP Targeting," July 2017, https://eltoro.com/wp-content/uploads/2017/07/IP-Value-with-Direct-Mail.pdf
- Google Ads Help, geographic targeting, https://support.google.com/google-ads/answer/1722043
- Google DV360 API, geography targeting, https://developers.google.com/display-video/api/guides/concepts/targeting/geography
- Meta Marketing API, lookalike audiences, https://developers.facebook.com/docs/marketing-api/audiences/guides/lookalike-audiences/
- Meta Marketing API, custom audiences, https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences/
- StackAdapt plans, https://www.stackadapt.com/plans-and-packages
- GroundTruth self-serve, https://www.groundtruth.com/solutions/self-serve/
- Simpli.fi Pro Self-Service, https://simpli.fi/pro-self-service
- Meta Special Ad Category real estate compliance, secondary, https://walledgardenhq.com/meta-special-ad-category-real-estate-compliance
