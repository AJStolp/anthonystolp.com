# Direct mail pipeline: architecture and campaign inventory

**Written** 2026-08-14. **Status:** decided, not built. Supersedes nothing; this is the first
document that states where contact data lives.

Cost, postage, list sourcing and the Wisconsin compliance floor are **not** restated here. They
live in `docs/research/direct-mail-costs-and-compliance.md` and that document owns them. Messaging
strategy for the expired-listing campaign lives in `docs/research/expired-listing-messaging.md`.

---

## The decision

**Supabase owns identity. thanks.io owns discovery.**

Contacts AJ knows — website leads, Lofty leads, past clients, attorneys — live in Supabase and are
pushed to thanks.io per send. thanks.io is a printer, not a CRM. The mailing list there is a
by-product of a send, not the record.

Contacts AJ does *not* know — the 80 households around a house that just closed — are discovered
inside thanks.io by **Neighbor Blast**, because that capability rests on property and owner data we
would otherwise have to buy.

### Why the split, rather than picking one side

Neighbor Blast resolves an address into its nearest N households with mailing addresses, filterable
by absentee ownership, equity band, life stage and likelihood to move. `farm_targets` was designed to
hold exactly that shape of row and has **never had a populator**, because sourcing it was always the
expensive part. Rebuilding it to avoid vendor lock-in would mean buying a property data feed to
replace a capability already included in the per-piece price. That is not a good trade.

Everything else is the opposite trade. A contact AJ has earned is the durable asset of the business,
and it must survive changing mail vendors, leaving Lofty, or both. Those rows belong in a database he
controls.

The dividing question for any future campaign: **did we already have this person's name?** Yes means
Supabase drives. No means discovery, and today that means thanks.io.

### What makes the asset portable

`funnel_leads` is the lead record. `link_tokens` plus `/n/[token]` is the attribution thread, and it
is vendor-neutral by construction: a QR token minted for a postcard resolves the same way whether the
postcard came from thanks.io, Lob or a home printer. Per-recipient attribution is the part competitors
cannot copy and the part that survives every vendor swap, so it stays in Supabase unconditionally.

---

## What already exists

Verified against the schema on 2026-08-14, not assumed.

| Table | Holds | State |
|---|---|---|
| `funnel_leads` | every website capture, with UTM, referrer, visitor stitch | live, in use |
| `link_tokens` | QR/short-link tokens, same-origin enforced | live, in use |
| `tracking_events` | visitor events, backfilled with `lead_id` on submit | live, in use |
| `sold_listings` | MLS id, address, lat/lng, sold price and date, beds/baths/sqft | **schema only, no rows** |
| `farm_targets` | neighbours of a sold listing: owner name, mailing address, validated flag, `distance_m`, `qr_token`, status lifecycle, `skip_reason` | **schema only, no populator** |
| `farm_outreach` | per-recipient send log: channel, provider, provider id | **schema only; providers enumerated as lob/postgrid/resend, thanks.io absent** |
| `market_reports`, `market_stats` | monthly Redfin-derived stats and Claude-drafted reports | live; cron, two-pass validation, email delivery |

The farming trio is a just-sold engine that was designed and never wired. It predates the thanks.io
account and assumed Lob or PostGrid. Adding thanks.io as a `provider` value is a smaller job than the
tables imply.

## What is missing

- **Lofty leads never reach Supabase.** The website pushes leads *into* Lofty as a side effect of
  `POST /api/lead`. Nothing comes back. The expired-listing pond being triaged in n8n exists only
  inside a system AJ does not own, which is the leak that motivated this document.
- **No `provider` adapter for thanks.io** in `farm_outreach`.
- **No date-of-birth anywhere.** `funnel_leads` has no such column and a website form is not a
  plausible way to collect one. The birthday campaign is downstream of solving that and is sequenced
  last for this reason.
- **No image template for anything real.** The thanks.io account holds one stock birthday card.

---

## Campaign inventory

| Campaign | List source | Mechanism | Format | Blocked on |
|---|---|---|---|---|
| **Recently sold** | thanks.io discovery | Neighbor Blast, 80 nearest | 6x9 postcard, $1.65 = ~$132 | firm name (#40), card art |
| **Market report** | Supabase `funnel_leads` | existing cron pipeline, new print channel | postcard | channel adapter |
| **Attorney referral** | Supabase, hand-built | days-after-recipient-added | notecard, $3.04 | list does not exist; firm name |
| **Expired listing** | Lofty pond via n8n | one-tap button, already built | **windowless letter, $2.56** | funded thanks.io credits |
| **Birthday** | Supabase | On Recipient's Birthday | card | **no DOB data source** |
| **Just listed** | n/a | n/a | n/a | arsenal only, not being run |

AJ has stated more campaigns are coming. The table is the place to add them.

### Notes that change the build

**Recently sold is the heavy-use campaign**, per AJ, not a one-off for 521. Build it as a repeatable
motion keyed on a closing, not as a single send.

**Neighbor Blast fires N days after an address is added to a list**, minimum 1. So the operational
step on closing day is "add the address", and the mail follows automatically. For 521: add on
September 4, lands September 5.

**Neighbor Blast can auto-render the target property's Google Street View** onto the card. If the
render is acceptable this removes the MLS photo-rights question entirely, which is the third open item
on #40. Confirm with a real render before relying on it.

**The expired piece is a windowless letter, not a notecard.** AJ wants no exterior artwork, and that
single requirement decides the product: a notecard REQUIRES `front_image_url` or `image_template_id`,
while both letter endpoints fall back to a blank background when neither is given. Windowless rather
than windowed because the envelope carries a handwritten address and a real stamp, and a window reads
as a bill before it is opened. $2.56 against the notecard's $3.04. The attorney campaign below still
says notecard and has not been revisited against the same constraint.

**Just listed is explicitly not being run.** The design exists in the thanks.io gallery and is worth
copying into the account so it is there if wanted. Do not build automation for it.

---

## Compliance floor

Owned by `direct-mail-costs-and-compliance.md` §4. Two points restated only because they gate every
campaign in the table above:

- **Every piece needs Epique's firm name exactly as licensed in Wisconsin**, clearly and conspicuously,
  indicating a business and not a private party (452.136(2)). **Answered 2026-08-27: `Epique Realty`**,
  per AJ, and now set in the mailer config. Issue **#40** stays open for the branding and photo-rights
  halves. Note `src/lib/agent-profile.ts` still says `"ExSell Experts at Epique Realty"`; the mail
  piece uses the firm alone and the two cannot both be the licensed string.
- **452.136(3) does not restrict 521 Alta Loma.** AJ was the listing agent, so (3)(a) is satisfied and
  no consent letter is needed. It *does* restrict any property he did not list. See the correction
  banner at §4.3 of the research doc.

Do not source the firm name from thanks.io's `%YOUR_COMPANY%` merge token. It resolves from an
editable dashboard field; 452.136(2)(a) wants the name exactly as licensed, so it must be explicit
and auditable.

---

## Non-goals

- Not replacing Lofty. It stays as CRM and dialer. The goal is that leaving it later costs a
  migration, not the database.
- Not building a neighbour-data source to replace Neighbor Blast.
- Not a monthly subscription. thanks.io stays pay-as-you-go until volume justifies otherwise; the
  break-even is roughly 136 postcards or 49 notecards a month on the $49 plan.
- Not autonomous sending. Every send stays behind an explicit human action until there is a track
  record.
