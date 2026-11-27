---
title: "Newsletter signup: The River Report"
slug: newsletter-signup
keywords: [ozaukee county real estate newsletter, washington county wi real estate newsletter, cedarburg market updates, local housing market email]
summary: "Signup component copy, placements, the text your street CTA, and confirm and welcome emails for The River Report, Anthony Stolp's monthly Ozaukee and Washington County newsletter."
target_path: src/components/NewsletterSignup.tsx
---

# Newsletter signup: The River Report

One component with two layouts: a **full card** for pages and a **compact row** for the footer. The name "The River Report" is the recommended pick and still needs Anthony's OK. Keep the name in one constant so it's easy to change.

## Full card (blog index, blog posts, /home-value, newsletter archive)

**Eyebrow:** Monthly newsletter

**Heading:** The River Report

**Body:**
Once a month I send a short email on what's actually happening in Ozaukee and Washington County real estate. A little local news, the numbers that matter, and what they mean for your house. Every number has a source. No daily blasts, no sales pitch.

**Fields:**

- Email (required). Label: "Email"
- First name (optional). Label: "First name (optional)"
- Town (optional select). Label: "Your town (optional)". Options: Cedarburg, Mequon, Thiensville, Grafton, Port Washington, Saukville, West Bend, Hartford, Germantown, Jackson, Slinger, Somewhere else nearby

**Consent line (checkbox, required):**
Send me The River Report once a month. I agree to the Terms and Privacy Policy. Unsubscribe any time.

("Terms" links to /terms and "Privacy Policy" links to /privacy, same as the other forms.)

**Button:** Send me the newsletter

**After submit (double opt-in, so this is the "check your email" state):**

> **Almost done. Check your email.**
> I just sent a confirm link to {email}. Click it and you're on the list. The next issue goes out the first Tuesday of the month.
> Don't see it? Check promotions or spam, or text me at (262) 483-7932.

**Error copy:**

- Bad email: "That email doesn't look right. Mind checking it?"
- No consent: "Check the box so I know it's OK to email you."
- Server error: "Something went wrong on my end. Try again, or text me at (262) 483-7932."

## Compact row (footer, every page)

**Text:** The River Report: Ozaukee and Washington County real estate, once a month.

**Field:** Email (placeholder "Your email")

**Consent (small, under the field, checkbox):** Send me the monthly newsletter. Terms and Privacy. Unsubscribe any time.

**Button:** Sign up

**After submit:** "Check your email for a confirm link."

## Text your street CTA

Use under the full card, at the end of every blog post and newsletter issue, and on the archive page.

**Heading:** Curious what your neighbors sold for?

**Body:** Text me your street and I'll send what nearby homes sold for. No forms, no spam, just the numbers.

**Buttons:**

- "Text me your street" links to `sms:+12624837932?&body=Hi%20Anthony%2C%20my%20street%20is%20` (prefilled: "Hi Anthony, my street is ")
- "Call (262) 483-7932" links to `tel:+12624837932`

**Small line under the buttons:** Or get a free home value, personally prepared within 24 hours. (links to /home-value)

## Placements

| Page | Where | Layout |
|---|---|---|
| `/blog` | After "Latest posts," before "Have a question about your home or your town?" | Full card, then street CTA |
| Every blog post (starting with `/blog/cedarburg-market-nov-2026`) | After the last section ("How I can help") | Full card, then street CTA |
| `/home-value` | Below the FAQ, above the footer. Never above the home value form, so it doesn't compete with the main lead. | Full card |
| Footer (site wide) | Above the legal links | Compact row |
| `/newsletter` archive and each issue page | Top of the archive, end of each issue | Full card, then street CTA |

## Confirm email (double opt-in)

**From:** Anthony Stolp <anthony@news.anthonystolp.com>
**Subject:** Confirm your River Report signup
**Preheader:** One click and you're in.

> Hi {first name or "there"},
>
> Thanks for signing up for The River Report. Click below to confirm and I'll send the next issue the first Tuesday of the month.
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
> You're in. Once a month you'll get a short read on Ozaukee and Washington County real estate: local news, the real numbers with sources, and what they mean for your house.
>
> One thing I can do for you today: text me your street at (262) 483-7932 and I'll send what nearby homes sold for. Or if you want an actual number for your place, here's my free home value: https://anthonystolp.com/home-value
>
> Talk soon,
> Anthony
>
> Anthony Stolp, Realtor, ExSell Experts | Epique Realty. I'm a local agent backed by a strong team, and you always work with me.

## Confirm landing page (`/newsletter/confirmed`)

**H1:** You're on the list.
**Body:** The next River Report goes out the first Tuesday of the month. While you're here, see the latest issue, read the Cedarburg market update, or get a free home value. Questions? Call or text me at (262) 483-7932.

<!--
Notes for Claude Code

Build
- New client component src/components/NewsletterSignup.tsx with variant="card" | "compact". Copy is above. Keep the name in one constant (for example NEWSLETTER_NAME = "The River Report") so Anthony can rename it in one place.
- Reuse the patterns in src/components/MarketReportSubscribe.tsx: zod validation, Honeypot, captureAttribution(), getOrCreateVisitorId(), and gate the track event on `accepted`, since the honeypot also answers 200.
- New typed track events: newsletter_view (once per page view, IntersectionObserver, like listing_alert_view) and newsletter_lead (on accepted). Add both to the track switch so they mirror to gtag and fbq like market_report_lead.
- Street CTA links: tel:+12624837932 and sms:+12624837932?&body=... Use telHref and smsHref from src/lib/phone.ts, with data-placement values such as newsletter_street_sms and newsletter_street_call so ContactClickTracking records them.
- No arrow glyphs on the new buttons. No em dashes anywhere.

Pipeline (do not build a second lead path)
- POST to the existing /api/lead with source: "newsletter", funnelStep: "completed", intent: "exploring", email, firstName (optional), town (optional), termsConsent, hp_company, visitorId and attribution.
- In src/app/api/lead/route.ts add "newsletter" to sourceLabel ("Newsletter signup"). Check how "market-report-subscribe" reaches Lofty (createLoftyLead / contact-leads.ts) and route "newsletter" the same way, tagged "Newsletter" so Anthony can filter.
- After the Supabase insert, add the contact to Resend (contacts API) in the River Report segment, NOT yet subscribed to the newsletter topic, then send the confirm email. Wrap this in after() or a try/catch so a Resend hiccup never fails the lead.
- Confirm route: /api/newsletter/confirm?lid=...&t=... with an HMAC token, same approach as unsubscribeToken() in src/lib/email-compliance.ts. On success, mark the contact subscribed in Resend, set a newsletter_confirmed_at on the lead row (new nullable column), send the welcome email, and redirect to /newsletter/confirmed.
- Unsubscribes: Broadcasts use Resend's unsubscribe link and topic. Add a webhook (contact.updated) or a nightly sync so the Supabase lead shows unsubscribed too.

Env vars (names only; do not invent values, Anthony adds them in Vercel)
- RESEND_API_KEY: already set.
- RESEND_NEWSLETTER_SEGMENT_ID: new. Create the segment in Resend first.
- RESEND_NEWSLETTER_TOPIC_ID: new, if topics are used for opt out.
- NEWSLETTER_FROM_EMAIL: new, e.g. anthony@news.anthonystolp.com. Only valid after news.anthonystolp.com is verified in Resend. Until then, fail closed: keep the signup storing leads, but skip the confirm email and log a warning. Don't fall back to the root domain for marketing mail.
- Confirm link signing: reuse UNSUBSCRIBE_SECRET (falls back to CRON_SECRET) or add NEWSLETTER_CONFIRM_SECRET. Never ship a default secret in production.
- If any of these are missing in production, the form still saves the lead and returns accepted, and logs which var is missing. Note them in the PR.

Open decisions (do not guess)
- The name is a recommendation until Anthony approves it.
- The homepage MarketReportSubscribe (source market-report-subscribe, monthly zip report via /api/cron/market-reports) overlaps with this. Do not remove or migrate it until Anthony decides whether to fold it into The River Report. If he says yes, the zip becomes an optional field here, and existing subscribers move to the segment only if they opted in (they did, with the terms checkbox), with a one-time notice email.
- CAN-SPAM address: applyComplianceFooter() already uses agent.mailingAddress (the Germantown office). Use that same helper or value for newsletter footers. Anthony is confirming the address.
- SMS: the street CTA is a text the visitor starts themselves. Do not add any SMS marketing, auto texting, or text consent language here.

Tests
- Unit: newsletter source label, Lofty routing for "newsletter", HMAC confirm token pass and fail.
- Playwright (stub /api/lead, /api/track and Resend): card and compact render on the listed pages, consent required, the success state shows "Check your email," the sms and tel links are correct, and /home-value still shows the home value form above the newsletter card.
- Publish this draft by deleting drafts/newsletter-signup.md in the same change (drafts/README.md step 5).
-->
