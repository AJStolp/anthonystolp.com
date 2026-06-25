# Lofty Lead-Pond Triage (n8n)

Daily-x3 n8n workflow that pulls fresh, workable leads from your Lofty pond + your
claimed pipeline, has Claude score and rank them (geography weighted hard), and emails a
decision-ready **"claim now / work your pipeline"** digest. Also appends every triaged
lead to a Google Sheet as a running log.

**Claiming stays manual** — the Lofty API exposes no claim endpoint. The digest tells you
which to claim; you tap claim in Lofty.

Import file: `lofty-lead-triage-daily.json`

---

## What it does (flow)

```
Schedule (07:00, 12:00, 17:00 America/Chicago)
  -> Config (Set: ids, model, sheet, recipient)
  -> Read Watermark (only triage leads newer than last run)
  -> Lofty GET /v1.0/leads?stage=New Leads&sort=CreateTime&desc=true   (pond)
  -> Lofty GET /v1.0/leads?assignedUserId=<you>&sort=CreateTime&desc=true (pipeline)
  -> Filter & Shape (drop non-WI / no-contact / claimed-by-others; advance watermark;
                     build the Anthropic request)        --> empty? stops here, no email
  -> Anthropic POST /v1/messages (score + triage, strict JSON)
  -> Parse & Sort
  -> Append to Sheet  +  Build Digest Email -> Send (Gmail)
  -> [disabled] Write Note back to Lofty
```

### Anti-redundancy (by design — nothing runs on stale/empty data)
- **Watermark dedup:** the newest `createTime` already seen is stored in n8n workflow
  static data. Each of the 3 daily runs only triages leads *newer* than that, so a lead
  is triaged **once**, when it first appears. No repeats across runs.
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
- **Pipeline only in the morning run** (before 11:00) so your claimed book isn't re-emailed
  3x/day.

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
| `firstRunSinceDate` | `2026-05-25T00:00:00GMT` | Seeds the watermark for the **very first run** so it surfaces a ~30-day backlog. Ignored after the first run (the stored watermark takes over). |
| `sheetId` | `PUT_YOUR_GOOGLE_SHEET_ID_HERE` | The spreadsheet's ID (from its URL). **Required.** |
| `sheetTab` | `Triage` | Tab name. Create the tab with the header row below. |
| `digestTo` | `anthony.stolp@gmail.com` | Where the digest is emailed. |

### 3. Prepare the Google Sheet

Create a tab named `Triage` (or whatever you set) with this header row, in order:

```
date | tier | score | name | type | bucket | why | best_channel | suggested_action | call_opener | lead_id | location | lofty_link
```

### 4. Schedule / timezone

Three cron triggers fire at **07:00, 12:00, 17:00** in the workflow timezone, which is set
to **America/Chicago** in the workflow settings. Change times in the **Schedule 3x Daily**
node (cron `0 7,12,17 * * *`).

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
  pond filter exist** — `sort=CreateTime desc` + the watermark replace them; the pond is
  reachable because pond leads carry `pondId`.
- `POST /v1.0/notes` — body `{ leadId, content, isPin }` (all required), returns
  `{ noteId }`. Used only by the optional, disabled write-back node.

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
- **Claiming and re-engagement are not automated** (no claim endpoint; watermark triages
  each lead once). Both are phase-2 items.

---

## Files
- `lofty-lead-triage-daily.json` — importable n8n workflow.
- `README.md` — this file.
