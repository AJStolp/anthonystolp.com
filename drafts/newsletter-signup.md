---
title: "Newsletter signup: The River Report"
slug: newsletter-signup
keywords: [ozaukee county real estate newsletter, washington county wi real estate newsletter, cedarburg market updates, monthly zip code market report]
summary: "Signup component copy, placements, the text your street CTA, and confirm and welcome emails for The River Report, Anthony Stolp's single monthly email. It replaces the homepage monthly zip code report signup."
target_path: src/components/NewsletterSignup.tsx
---

# Newsletter signup: The River Report

The River Report is the one monthly email from anthonystolp.com. It replaces the homepage "A short monthly report on your zip code" signup. Subscribers who pick a zip get a short section on their zip at the top of each issue.

One component with two layouts: a **full card** for pages and a **compact row** for the footer.

## Full card (homepage, blog index, blog posts, /home-value, newsletter archive)

**Eyebrow:** Monthly newsletter

**Heading:** The River Report

**Body:**
Once a month I send a short email on what's actually happening in Ozaukee and Washington County real estate. A little local news, the numbers that matter, and a quick read on your own zip code if you pick one. Every number has a source. No daily blasts, no sales pitch.

**Fields:**

- Email (required). Label: "Email"
- First name (optional). Label: "First name (optional)"
- Zip (optional select). Label: "Your zip (optional)". First option "Pick a zip for your local numbers". Then the same 12 zips the current form offers: Cedarburg (53012), Mequon / Thiensville (53092), Mequon (53097), Grafton (53024), Port Washington (53074), Saukville (53080), West Bend (53090), West Bend (53095), Hartford (53027), Germantown (53022), Jackson (53037), Slinger (53086)

**Consent line (checkbox, required):**
Send me The River Report once a month. I agree to the Terms and Privacy Policy. Unsubscribe any time.

("Terms" links to /terms and "Privacy Policy" links to /privacy.)

**Button:** Send me The River Report

**After submit (double opt-in):**

> **Almost done. Check your email.**
> I just sent a confirm link to {email}. Click it and you're on the list. The River Report goes out the first Tuesday of the month.
> Don't see it? Check promotions or spam, or text me at (262) 483-7932.

**Error copy:**

- Bad email: "That email doesn't look right. Mind checking it?"
- No consent: "Check the box so I know it's OK to email you."
- Server error: "Something went wrong on my end. Try again, or text me at (262) 483-7932."

## Compact row (footer, every page)

**Text:** The River Report: Ozaukee and Washington County real estate, once a month.

**Field:** Email (placeholder "Your email")

**Consent (checkbox, small):** Send me the monthly newsletter. Terms and Privacy. Unsubscribe any time.

**Button:** Sign up

**After submit:** "Check your email for a confirm link."

## Text your street CTA

Put this under the full card, at the end of every blog post and newsletter issue, and on the archive page.

**Heading:** Curious what your neighbors sold for?

**Body:** Text me your street and I'll send what nearby homes sold for. No forms, no spam, just the numbers.

**Buttons:**

- "Text me your street": `sms:+12624837932?&body=Hi%20Anthony%2C%20my%20street%20is%20` (prefilled "Hi Anthony, my street is ")
- "Call (262) 483-7932": `tel:+12624837932`

**Small line under the buttons:** Or get a free home value, personally prepared within 24 hours. (links to /home-value)

## Placements

| Page | Where | Layout |
|---|---|---|
| `/` | Replaces the current MarketReportSubscribe section, same spot, keeps `id="market-report"` | Full card |
| `/blog` | After "Latest posts," before "Have a question about your home or your town?" | Full card, then street CTA |
| Every blog post (starting with `/blog/cedarburg-market-nov-2026`) | After the last section ("How I can help") | Full card, then street CTA |
| `/home-value` | Below the FAQ, above the footer. Never above the home value form. | Full card |
| Footer (site wide) | Above the legal links | Compact row |
| `/newsletter` and each issue page | Top of the archive, end of each issue | Full card, then street CTA |

## Confirm email (double opt-in)

**From:** Anthony Stolp <anthony@news.anthonystolp.com>
**Subject:** Confirm your River Report signup
**Preheader:** One click and you're in.

> Hi {first name or "there"},
>
> Thanks for signing up for The River Report. Click below to confirm and you'll get the next issue the first Tuesday of the month.
>
> [Confirm my signup]
>
> If you didn't sign up, ignore this and you won't hear from me.
>
> Anthony Stolp
> ExSell Experts | Epique Realty
> (262) 483-7932

## Welcome email (after confirm)

**Subject:** You're on the list
**Preheader:** What to expect, plus one thing I can do for you right now.

> Hi {first name or "there"},
>
> You're in. Once a month you'll get a short read on Ozaukee and Washington County real estate: local news, the real numbers with sources, and a quick read on your zip if you picked one.
>
> One thing I can do for you today: text me your street at (262) 483-7932 and I'll send what nearby homes sold for. Or if you want an actual number for your place, here's my free home value: https://anthonystolp.com/home-value
>
> Talk soon,
> Anthony
>
> Anthony Stolp, Realtor, ExSell Experts | Epique Realty. I'm a local agent backed by a strong team, and you always work with me.

## Confirm landing page (`/newsletter/confirmed`)

**H1:** You're on the list.
**Body:** The River Report goes out the first Tuesday of the month. While you're here, see the latest issue, read the Cedarburg market update, or get a free home value. Questions? Call or text me at (262) 483-7932.

<!--
Notes for Claude Code

Full build spec (merge, sending, migration, acceptance checks): /home/box/shared/real-estate/handoffs/river-report-handoff-2026-11-27.md

Decided (Anthony, Nov 27)
- The name is final: The River Report. Keep it in one constant (NEWSLETTER_NAME).
- It merges with the monthly zip code report. One email, one list, one unsubscribe. This component replaces src/components/MarketReportSubscribe.tsx on the homepage (keep the section id="market-report").
- CAN-SPAM address is the Germantown office already in agent.mailingAddress, applied through applyComplianceFooter().

Build
- New client component src/components/NewsletterSignup.tsx, variant="card" | "compact". Copy above. The compact row has no zip field.
- Reuse the MarketReportSubscribe patterns: zod validation, Honeypot, captureAttribution(), getOrCreateVisitorId(), and gate the track event on `accepted`, since the honeypot also answers 200.
- Track: keep firing market_report_lead on accepted (so the existing GA4 setup keeps counting), with { zip, placement }. Add newsletter_view once per page view (IntersectionObserver, like listing_alert_view), mirrored to gtag and fbq.
- Street CTA: telHref and smsHref from src/lib/phone.ts, data-placement newsletter_street_sms and newsletter_street_call.
- No arrow glyphs on the new buttons. No em dashes anywhere.

Pipeline (no second lead path, no second list)
- POST to /api/lead with source "market-report-subscribe" (unchanged, because the cron, /api/admin/reports/[id]/send and /api/unsubscribe all filter funnel_leads on it), funnelStep "completed", intent "exploring", email, firstName (optional), postalCode (optional for this source), termsConsent, hp_company, visitorId, attribution, and landingPage/placement.
- Relabel the source in sourceLabel ("Market report subscriber" today) to "River Report signup". postalCode is already optional in the /api/lead schema. Today this source is not pushed to Lofty (only open house, home value, listing and contact sources are). Leave that as is unless Anthony asks.
- The list is funnel_leads in Supabase. No Resend segment or topic needed.
- Double opt-in for new signups: new nullable column newsletter_confirmed_at. After insert, send the confirm email (in after() or try/catch so a Resend hiccup never fails the lead). Confirm route /api/newsletter/confirm?lid=...&t=... with an HMAC token like unsubscribeToken(); it sets newsletter_confirmed_at for every market-report-subscribe row with that email, sends the welcome email, and redirects to /newsletter/confirmed.
- Signing up again with an email that is already confirmed: no new confirm email, same success state. If the email had unsubscribed, a fresh signup clears unsubscribed_at only after the new confirm click.

Env vars (names only; Anthony sets values in Vercel)
- RESEND_API_KEY: already set.
- NEWSLETTER_FROM_EMAIL: new, anthony@news.anthonystolp.com. Valid only after news.anthonystolp.com is verified in Resend. Until then, fail closed: save the lead, skip the confirm email, log a warning. Never fall back to the root domain for newsletter mail.
- Confirm link signing: reuse UNSUBSCRIBE_SECRET (falls back to CRON_SECRET). Never ship a default secret.

SMS
- The street CTA is a text the visitor starts. No SMS marketing, auto texting, or text consent language here.

Tests
- Unit: source label, postalCode optional for this source, HMAC confirm token pass and fail, confirm sets newsletter_confirmed_at.
- Playwright (stub /api/lead, /api/track and Resend): card and compact render on the listed pages, homepage shows one signup (the old MarketReportSubscribe is gone), consent required, success shows "Check your email," sms and tel links correct, /home-value still shows the home value form above the card.
- Publish this draft by deleting drafts/newsletter-signup.md in the same change (drafts/README.md step 5).
-->
