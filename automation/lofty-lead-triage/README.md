# Lofty Lead-Pond Triage (n8n)

n8n workflow that runs **every 15 minutes**, pulls fresh, workable leads from your Lofty
pond + your claimed pipeline, has Claude score and rank them (geography weighted hard), and
emails a decision-ready **"claim now / work your pipeline"** digest.

**One-tap claim.** Each pond lead card has a **Claim now** button that assigns the lead to
you in Lofty (`POST /v1.0/leads/{id}/assignment`) and drops it into your pipeline — no app
or login round-trip, just a "Claimed ✓" page. Cards also keep an **Open in Lofty** button
to view the full record. See [Claim now button (one-tap)](#claim-now-button-one-tap).

Import files: `lofty-lead-triage-daily.json` + `lofty-claim-webhook.json`

---

## What it does (flow)

```
Schedule (every 15 min, America/Chicago)
  -> Config (Set: ids, model, sheet, recipient)
  -> Read Watermark (passthrough of config; dedup is a seen-id set, see below)
  -> Lofty GET /v1.0/leads?stage=New Leads&sort=CreateTime&desc=true   (pond)
  -> Lofty GET /v1.0/leads?assignedUserId=<you>&sort=CreateTime&desc=true (pipeline)
  -> Filter & Shape (drop already-seen / non-WI / no-contact / claimed-by-others;
                     build the Anthropic request)        --> empty? stops here, no email
  -> Anthropic POST /v1/messages (score + triage, strict JSON)
  -> Parse & Sort
  -> Build Digest Email -> Send (Resend) -> Mark Emailed Seen (commit seen-ids)
  -> [disabled] Write Note back to Lofty
```

### Anti-redundancy (by design — nothing runs on stale/empty data)
- **Seen-id dedup:** the lead ids already emailed are stored as a set in n8n workflow
  static data, and committed **only after a successful send** (`Mark Emailed Seen`). Each
  run skips ids already in the set, so a lead is triaged **once**, when it
  first appears. Because the set is committed post-send, a failed run or a per-run cap
  overflow never makes a lead silently disappear — it's just retried next run. The set is
  bounded to the most recent 3000 ids.
- **No email on empty runs:** if there's nothing new, the workflow stops before Anthropic
  — no wasted model call, no noise email. (Midday/evening only ping you when there's
  something to claim.)
- **Server-side filtering:** the pond is queried with `stage=New Leads` so the dead bulk
  (`Do Not Contact`, `Closed`, `Archived` — most of the 5,408-lead pond) never comes back.
- **Region pre-filter:** the pond is fed statewide bulk imports (a single 100-lead dump can
  span Eau Claire to Green Bay). Only WI leads in your drivable zip prefixes reach Claude,
  so you don't pay to C-tier a lead 3 hours away. Observed: a 100-lead dump → 84 in-WI → 32
  drivable.
- **Bounded model call:** `max_tokens` 8192 + `maxPerRun` cap so a giant import can't
  truncate the JSON response.
- **Pipeline only once a day** (first successful run at/after 07:00, tracked by a
  `pipelineEmailedDate` flag in static data and committed post-send) so the 15-min cadence
  doesn't re-email your claimed book every half hour. Fresh pond leads still go out as soon
  as they appear.

---

## One-time setup

### 1. Create n8n credentials

| Credential | Type | Field | Value |
|---|---|---|---|
| **Lofty API** | HTTP Header Auth | `Authorization` | `token <YOUR_LOFTY_API_KEY>` |
| **Anthropic API** | HTTP Header Auth | `x-api-key` | `<YOUR_ANTHROPIC_API_KEY>` |
| **Google Sheets account** | Google Sheets OAuth2 | — | reuse your connected Google account |
| **Gmail account** | Gmail OAuth2 | — | reuse your connected Google account |

Generate the Lofty key at **Settings → Integrations → API** in Lofty. Keys are
`THIRD_PARTY_OPERATION` scoped to your seat. **Never** put a raw key in a node body — it
lives only in the credential. Set an expiration and rotate before it lapses.

After importing the workflow, open each HTTP/Sheets/Gmail node and re-select the matching
credential (the import ships placeholder credential IDs).

### 2. Fill the **Config** node

| Field | Default | Notes |
|---|---|---|
| `pondId` | `1004768` | Your "WI Leads" pond (verified). |
| `myUserId` | `844773616097576` | Your numeric Lofty user id (from your API key's JWT). |
| `pondStage` | `New Leads` | Exact stage name (case-sensitive; "New" 404s). |
| `nearZipPrefixes` | `530,531,532,534` | Drivable-region pre-filter: only WI leads whose zip starts with one of these reach Claude. `530`/`531`/`532`/`534` = SE Wisconsin (Ozaukee, Milwaukee, Washington, Waukesha, Racine, Kenosha, Walworth). Far-WI dumps (Madison `537`, Green Bay `541`, Wausau `544`, Eau Claire `547`…) are dropped. Leave blank to disable and let Claude rank everything. |
| `maxPerRun` | `50` | Hard cap on pond leads per run (newest kept) so a bulk import can't truncate the model output. Logged when hit. |
| `model` | `claude-sonnet-4-6` | Change here to swap models — not hardcoded in the request body. |
| `firstRunSinceDate` | `2026-06-25T00:00:00GMT` | "Since" floor — only leads created after this are ever considered (keeps old graveyard imports out). Dedup of already-emailed leads is handled separately by the seen-id set. |
| `sheetId` | `PUT_YOUR_GOOGLE_SHEET_ID_HERE` | The spreadsheet's ID (from its URL). **Required.** |
| `sheetTab` | `Triage` | Tab name. Create the tab with the header row below. |
| `digestTo` | `anthony.stolp@gmail.com` | Where the digest is emailed. |
| `claimBaseUrl` | `https://n8n.unchonk.com/webhook` | Your n8n webhook base (no trailing slash); pre-filled with your instance. The Claim now button links to `${claimBaseUrl}/lofty-claim`. |
| `claimAssignee` | `PUT_YOUR_LOFTY_ACCOUNT_EMAIL_HERE` | The Lofty **account** the lead gets assigned to — your Lofty login email (the assign endpoint takes an account, not the numeric `myUserId`). |
| `claimSecret` | `PUT_A_LONG_RANDOM_SECRET_HERE` | Shared secret in the Claim now link (`&t=`). **Must be identical** to `claimSecret` in the `lofty-claim-webhook` workflow's Claim Config node. The **Claim now button stays hidden until this is set** to a real value (avoids a dead/unauthorized link); Open in Lofty still shows meanwhile. |

### 3. Prepare the Google Sheet

Create a tab named `Triage` (or whatever you set) with this header row, in order:

```
date | tier | score | name | type | bucket | why | best_channel | suggested_action | call_opener | lead_id | location | lofty_link
```

### 4. Schedule / timezone

The trigger fires **every 15 minutes** (cron `*/15 * * * *`) in the workflow timezone,
**America/Chicago**. Speed-to-lead matters in real estate, and an empty run is cheap — no
new leads means no email and no Anthropic call, and each lead is still triaged only once.
Change the cadence in the **Schedule Every 15 Min** node. The once-daily pipeline reminder
is gated separately in code (first run at/after 07:00), so it doesn't fire on every run.

---

## Testing (do in order)

1. **Auth smoke test** (already verified, re-run if the key changes):
   ```
   curl -s -i "https://api.lofty.com/v1.0/team-features/lead-ponds" \
     -H "Content-Type: application/json" -H "Authorization: token <KEY>"
   curl -s -i "https://api.lofty.com/v1.0/leads?limit=5&sort=CreateTime&desc=true" \
     -H "Content-Type: application/json" -H "Authorization: token <KEY>"
   ```
   Expect HTTP 200, a pond array, and a `leads` array with `pondId` populated. A
   `{"code":200100,...}` body = the key is permission-gated on your seat.

2. **Manual run, write-back OFF** (it ships OFF): set `firstRunSinceDate` ~30 days back,
   execute the workflow once. Confirm: only in-WI New-Leads appear, far-WI leads (e.g.
   Elkhorn) rank low, pond vs pipeline buckets are right, the Sheet gets rows, and the
   digest email reads cleanly.

3. **Enable the schedule** once a manual run is clean. Run again with nothing new and
   confirm **no email** is sent.

4. **Optional: note write-back.** Enable the **Write Note to Lofty (optional, OFF)** node
   to POST `{leadId, content, isPin:false}` to `/v1.0/notes` for each triaged lead (score
   + why land on the lead in Lofty). It is disabled by default. If you only want notes on
   A/B leads, add a Filter node before it.

---

## Exact Lofty endpoints / params used (verified against the live spec + your key)

- `GET /v1.0/team-features/lead-ponds` — discover ponds (returns `id`, `pondName`,
  `pondOwnerId`, `agentIds`). Used for the smoke test; your pond is `1004768` "WI Leads".
- `GET /v1.0/leads` — params used: `stage`, `assignedUserId`, `sort=CreateTime`,
  `desc=true`, `limit=100`. Response: `{ _metadata, leads[] }`. **No date filter and no
  pond filter exist** — `sort=CreateTime desc` + the since-floor replace them; the pond is
  reachable because pond leads carry `pondId`.
- `POST /v1.0/notes` — body `{ leadId, content, isPin }` (all required), returns
  `{ noteId }`. Used only by the optional, disabled write-back node.
- `POST /v1.0/leads/{leadId}/assignment` — claim/assign a lead. Body is an **array**:
  `[{ "role": "Agent", "assignee": "<lofty account>" }]`; returns the `leadId`. Used by the
  Claim now button (separate `lofty-claim-webhook` workflow). **Auth caveat:** the developer
  docs show this endpoint expecting `Authorization: Bearer …`, while the rest of this
  workflow authenticates with the legacy `Authorization: token …` header. The webhook reuses
  the same **Lofty API** credential — **test one claim first** (see below); if it 401s, make
  a second header-auth credential with `Authorization: Bearer <token>` and point the Assign
  node at it.

### Known limits / deliberate scope cuts
- **Single page (100 leads) per run.** Steady-state new-lead counts are far below 100, so
  this is safe. The only edge is the first backlog run: it captures the **100 newest** New
  Leads, which is plenty to start. (Add HTTP-node pagination later if you ever need a
  deeper one-time sweep.)
- **No per-lead activities call.** The `GET /v1.0/leads/{id}/activities` endpoint returns
  empty for these aggregated pond leads (verified on a live New Lead), so calling it per
  lead would be a wasted request every run. Intent is scored from the fields already in the
  List Leads response (`buyHouse`, `houseToSell`, `fthb`, `preQual`, buy/sell timeframes,
  `score`, `lastVisit`, `source`). Re-add the loop in phase 2 if pond leads start carrying
  activity.
- **Lead IDs are JSON numbers ≈ 1.1e15** — under JS's safe-integer limit, so standard
  parsing is fine and IDs are coerced to strings for display. Revisit only if Lofty ever
  issues IDs above ~9.0e15.
- **Claiming is one-tap, not zero-tap.** The Claim now button assigns the lead via
  `POST /v1.0/leads/{id}/assignment`, but you still tap it per lead — there's no auto-claim
  (deliberate: you decide which to take). Re-engagement is still a phase-2 item.

---

## Claim now button (one-tap)

Each pond lead in the digest carries a **Claim now** button (next to **Open in Lofty**).
Tapping it — from your phone, in the email — assigns that lead to you in Lofty and it lands
in your pipeline, with no website login and no app handoff, just a "Claimed ✓" page.

**Architecture (two workflows):**
```
Triage digest email  --(Claim now link: GET {claimBaseUrl}/lofty-claim?lead_id=…&t=secret)-->
  lofty-claim-webhook:
    Claim Webhook (GET)        respond mode = "responseNode"
      -> Claim Config (Set: claimAssignee, claimSecret)
      -> Verify & Authorize    (token must match claimSecret; lead_id must be numeric)
      -> IF Token OK
           true  -> Lofty: Assign Lead (POST …/assignment, neverError) -> Build Result HTML
           false ------------------------------------------------------------> Respond
      -> Respond (text/html confirmation page)
```

**Why a second workflow:** email buttons can only issue a GET. The button hits an n8n
**webhook** that does the assign server-side and returns a confirmation page. n8n must be
publicly reachable for the tap to arrive — yours is (self-hosted on EC2), so the production
webhook URL is `https://<your-ec2-host>/webhook/lofty-claim`.

**Setup:**
1. Import `lofty-claim-webhook.json`. Open **Lofty: Assign Lead** and re-select the
   **Lofty API** credential (import ships a placeholder id).
2. In **Claim Config**, set `claimAssignee` (your Lofty login email) and `claimSecret`.
3. In the triage workflow's **Config**, set `claimBaseUrl` to your n8n webhook base and
   `claimSecret` to the **same** value as step 2. Mismatched secrets = every claim is
   rejected as "Not authorized."
4. **Activate** the claim webhook workflow (the production webhook URL only works while the
   workflow is active).

**Security:** the only guard is the shared `claimSecret` in the link's `&t=` param — enough
for a personal, non-guessable link. Anyone with the full link can claim that lead, so don't
post it publicly. Rotate `claimSecret` in both workflows if a link leaks.

**Test before trusting it (do this once):**
1. With the webhook workflow active, grab a real unclaimed pond `lead_id` and open
   `https://<host>/webhook/lofty-claim?lead_id=<id>&t=<claimSecret>` in a browser.
2. Expect a green **Claimed ✓** page, and the lead to appear in your Lofty pipeline.
3. If you get **Claim failed** with a 401-ish code, it's the auth caveat above — switch the
   Assign node to a `Bearer` credential and retry.
4. Confirm a wrong/missing `t=` returns **Not authorized** (no assignment happens).

---

## Files
- `lofty-lead-triage-daily.json` — importable n8n workflow (triage + digest, every 15 min).
- `lofty-claim-webhook.json` — importable n8n workflow handling the Claim now button.
- `README.md` — this file.
