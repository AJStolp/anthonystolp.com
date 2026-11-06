// Filter, bucket, shape, and build the Anthropic request body.
// Anti-redundancy: drop already-seen ids (once-only dedup; see below for when an id is committed), non-WI,
// outside AJ's counties, no-contact, unreachable (Do Not Contact / dead stage), and
// claimed-by-others. The stage=New Leads query already excludes the dead graveyard, so no
// date floor is needed — the seen-set guarantees each lead is triaged exactly once.
//
// The pond is now fed almost entirely by "my +plus leads" (expired / canceled / FSBO
// listing records), NOT website inquiries. Those records carry none of Lofty's intent
// fields — buyingTimeFrame, sellingTimeFrame, houseToSell, preQual, fthb and leadInquiry
// are empty on 100% of them, and lastVisit is a 1970 epoch placeholder. Scoring on those
// fields produced confident-looking nonsense. Everything worth judging lives in
// customAttributes instead, so that is what we shape and send.
const cfg = $('Read Config').first().json;

const sd = $getWorkflowStaticData('global');
const seen = new Set(Array.isArray(sd.seenLeadIds) ? sd.seenLeadIds : []);
const hour = $now.hour; // workflow tz (America/Chicago)

const pondResp = $('Lofty: Pond New Leads').first().json || {};
const pipeResp = $('Lofty: My Pipeline').first().json || {};
const pond = Array.isArray(pondResp.leads) ? pondResp.leads : [];
const pipe = Array.isArray(pipeResp.leads) ? pipeResp.leads : [];

// Graceful handling of permission errors (e.g. code 200100) — leads arrays just stay empty.
if (pondResp.code || pondResp.message) console.log('Pond response note:', pondResp.code, pondResp.message);

// Dedup state (seen ids) is committed AFTER a successful send (see "Mark Emailed Seen"),
// so a failed run or the per-run cap never makes a lead silently disappear. The exception is
// a pond SKIP, which "Parse & Sort" commits itself because it is never shown.

const mailAddress = (l) => {
  const street = attr(l, 'Owner Street Address') || l.streetAddress;
  const city = attr(l, 'Owner City') || l.city;
  const zip = attr(l, 'Owner Zip') || l.zipCode;
  const st = attr(l, 'Owner State') || l.state;
  return street && city && zip ? `${street}, ${city}, ${st || 'WI'} ${zip}` : null;
};

const phone = l => Array.isArray(l.phones) && l.phones.length ? l.phones[0] : null;

// These are skip-traced addresses, so a lead often carries several. Roughly 1 in 7 is a
// WORKPLACE or SCHOOL address (seen live: ashleyfurniture.com, essentiahealth.org,
// rwbaird.com, uwec.edu, and a k12.wi.us school district). Contacting someone's employer
// inbox about their failed home sale is the worst possible first impression, so only a
// personal address is ever surfaced as a contact. Allowlist rather than blocklist: an
// unrecognised domain is treated as work, because a false positive just means we mail
// them instead, while a false negative means emailing someone's boss's server.
const CONSUMER_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'rocketmail.com', 'yahoo.co.uk',
  'hotmail.com', 'outlook.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com',
  'mac.com', 'protonmail.com', 'proton.me', 'juno.com', 'netzero.net', 'earthlink.net',
  'webtv.net', 'comcast.net', 'att.net', 'sbcglobal.net', 'ameritech.net', 'charter.net',
  'spectrum.net', 'verizon.net', 'bellsouth.net', 'cox.net', 'frontier.com', 'centurytel.net',
  'mchsi.com', 'tds.net', 'wi.rr.com', 'new.rr.com', 'milwpc.com', 'execpc.com', 'core.com',
  'wispark.com', 'bright.net', 'gmx.com', 'mail.com', 'zoho.com', 'fastmail.com'
]);
const emailDomain = e => { const d = String(e || '').split('@')[1]; return d ? d.toLowerCase().trim() : null; };
const isPersonalEmail = e => { const d = emailDomain(e); return !!d && CONSUMER_EMAIL_DOMAINS.has(d); };
const email = l => (Array.isArray(l.emails) ? l.emails : []).find(isPersonalEmail) || null;
const workEmailsSuppressed = l => (Array.isArray(l.emails) ? l.emails : []).filter(e => e && !isPersonalEmail(e)).length;

// Mail is the primary channel now, so a lead with a good mailing address is workable even
// with no phone and no personal email. Gate on any usable route, not just phone/email.
const hasContact = l => !!(phone(l) || email(l) || mailAddress(l));
const DEAD_STAGES = new Set(['Do Not Contact', 'Closed', 'Archived', 'Trash']);
const reachable = l => !DEAD_STAGES.has(String(l.stage || '')) && !(l.cannotCall && l.cannotEmail && l.cannotText);
const isWI = l => String(l.state || '').toUpperCase() === 'WI';
// AJ's territory: a lead is in it when its County attribute OR its 5 digit zip names one of the
// Config counties. Lofty writes County in mixed case ("DANE", "Juneau").
//
// County alone is not enough (anthonystolp T-039). From 2026-11-02 to 2026-11-06 it dropped
// every lead in the busiest part of the territory: 15 of the 100 newest pond leads had no
// County, six of them in Milwaukee and Glendale, and a Mequon (53092) lead came labeled
// JEFFERSON. Not one reached the digest. So the zip is checked too, against ZIP_COUNTY below.
//
// Zip prefixes cut across county lines (542 is Manitowoc but 534 is Racine), so the table is
// by full zip, built from the Census 2020 ZCTA to county relationship file
// (tab20_zcta520_county20_natl.txt): a zip belongs to the county holding most of its land, and
// is listed only when at least half its land is in the eight counties. Waterford (53185, 99%
// Racine) and Brownsville (53006, 74% Dodge) are therefore out. The table covers the eight
// counties only: a county added to Config is matched by its County attribute until it is added
// here. A lead with neither a matching County nor a listed zip is dropped; sending those to
// Claude to place does not work, as the first run that tried it failed on Claude's reply.
//
// The same list names the counties in the prompt below, so the filter and what Claude is told
// cannot drift apart. An empty list is a broken Config, not "everywhere": the prompt tells
// Claude location does not matter, and an A or B lead is claimed in Lofty automatically.
const countyNames = String(cfg.counties || '').split(',').map(c => c.trim()).filter(Boolean);
if (!countyNames.length) throw new Error('Config counties is empty. Set the territory before the triage runs.');
const normCounty = c => String(c || '').trim().toUpperCase().replace(/ COUNTY$/, '');
const counties = new Set(countyNames.map(normCounty));
const ZIP_COUNTY = Object.fromEntries(Object.entries({
  'CALUMET':
    '53014 53061 53088 54110 54123 54129 54160 54169 54952',
  'FOND DU LAC':
    '53010 53019 53049 53057 53065 53079 53919 53931 53963 54932 54935 54937 54971 54974 ' +
    '54979',
  'MANITOWOC':
    '53015 53042 53063 54207 54214 54215 54220 54227 54228 54230 54232 54241 54245 54247',
  'MILWAUKEE':
    '53110 53129 53130 53132 53154 53172 53202 53203 53204 53205 53206 53207 53208 53209 ' +
    '53210 53211 53212 53213 53214 53215 53216 53217 53218 53219 53220 53221 53222 53223 ' +
    '53224 53225 53226 53227 53228 53233 53235 53295',
  'OZAUKEE':
    '53004 53012 53021 53024 53074 53080 53092 53097',
  'SHEBOYGAN':
    '53001 53011 53013 53020 53023 53031 53044 53070 53073 53075 53081 53083 53085 53093',
  'WASHINGTON':
    '53002 53017 53022 53027 53033 53037 53040 53076 53086 53090 53095',
  'WAUKESHA':
    '53005 53007 53018 53029 53045 53046 53051 53058 53066 53069 53072 53089 53103 53118 ' +
    '53119 53122 53127 53146 53149 53150 53151 53153 53183 53186 53188 53189',
}).flatMap(([county, zips]) => zips.split(' ').map(z => [z, county])));
// The property's zip, not the owner's: an absentee owner's mailing zip says nothing about
// where the house is.
const zipCounty = l => ZIP_COUNTY[(String(l.zipCode || '').match(/^\d{5}/) || [])[0]] || null;
// The territory county a lead belongs to, or null. A wrong County that is still one of the
// eight wins over the zip; it is in the territory either way.
const territoryCounty = l => {
  const c = normCounty(attr(l, 'County'));
  if (counties.has(c)) return c;
  const z = zipCounty(l);
  return z && counties.has(z) ? z : null;
};
const inTerritory = l => territoryCounty(l) !== null;

// --- customAttributes: where every real signal on a +plus lead actually lives -------------
// Shape is [{attributeName, attributeType, value}]. Values are strings, and "0" / "" are
// used as nulls (e.g. Square Feet "0", Assessed Value "0"), so coerce carefully.
const attr = (l, name) => {
  const a = (l.customAttributes || []).find(x => x.attributeName === name);
  const v = a && a.value;
  return v == null || String(v).trim() === '' ? null : String(v).trim();
};
const num = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };
const int = (v) => { const n = num(v); return n == null ? null : Math.round(n); };

// Sale Date is ISO ("2022-01-25"); Last Ownership Transfer Date is US ("01/25/2022 12:00 AM").
const parseOwnDate = (s) => {
  if (!s) return null;
  const iso = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);
  const us = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (us) return new Date(`${us[3]}-${us[1]}-${us[2]}T00:00:00Z`);
  return null;
};
const yearsOwned = (l) => {
  const d = parseOwnDate(attr(l, 'Sale Date')) || parseOwnDate(attr(l, 'Last Ownership Transfer Date'));
  if (!d || isNaN(d)) return null;
  const y = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return y > 0 && y < 120 ? Math.round(y * 10) / 10 : null;
};
// Rough equity: what it is worth now minus what they paid. Null unless both are real.
const equity = (l) => {
  const now = num(attr(l, 'Estimated Value')) || num(attr(l, 'Assessed Value'));
  const paid = num(attr(l, 'Sale Amount'));
  return now && paid ? Math.round(now - paid) : null;
};

const shape = (l, bucket, ref) => {
  const addr = mailAddress(l);
  return {
    // Short join key. Do NOT send the real 16-digit leadId to the model: it mangles long
    // numeric ids when echoing them back (seen live: a 16-digit id returned as 10 digits),
    // which breaks the join and makes the lead vanish from the digest entirely.
    ref,
    name: `${l.firstName || ''} ${l.lastName || ''}`.trim() || attr(l, 'Owner Name 1') || '(no name)',
    // What kind of record: Expired | Canceled | FSBO. Drives the whole conversation.
    listing_status: attr(l, 'Status') || null,
    mail_address: addr,
    mailable: !!addr,
    // The territory county when there is one, so Claude never sees Mequon labeled JEFFERSON.
    county: territoryCounty(l) || attr(l, 'County') || null,
    location: [l.city, l.state, l.zipCode].filter(Boolean).join(', ') || null,
    // Money
    list_price: int(attr(l, 'Price')),
    estimated_value: int(attr(l, 'Estimated Value')),
    assessed_value: int(attr(l, 'Assessed Value')),
    last_sale_amount: int(attr(l, 'Sale Amount')),
    last_sale_date: attr(l, 'Sale Date') || attr(l, 'Last Ownership Transfer Date') || null,
    years_owned: yearsOwned(l),
    equity_estimate: equity(l),
    // The house
    property_type: attr(l, 'Property Type') || null,
    bedrooms: int(attr(l, 'Bedrooms')),
    bathrooms: attr(l, 'Bathrooms') || null,
    square_feet: int(attr(l, 'Square Feet')),
    year_built: int(attr(l, 'Year Built')),
    acreage: attr(l, 'Acreage') || null,
    // Owner-occupied "Y" means someone actually lives there and tried to move.
    owner_occupied: attr(l, 'Owner Occupied') || null,
    co_owner: attr(l, 'Owner Name 2') || null,
    // Who failed to sell it, and how it was marketed.
    list_agent: attr(l, 'List Agent') || null,
    list_office: attr(l, 'List Office') || null,
    mls_number: attr(l, 'MLS Number') || null,
    listing_remarks: (attr(l, 'Remarks') || '').slice(0, 400) || null,
    // Reachability
    has_phone: !!phone(l),
    has_email: !!email(l),
    work_emails_suppressed: workEmailsSuppressed(l),
    lofty_score: typeof l.score === 'number' ? l.score : null,
    added_to_pond: l.createTime || null
  };
};

// POND: unseen, in WI, in AJ's counties, contactable, reachable, still unclaimed.
const pondNew = pond
  .filter(l => l.assignedUserId === -1 && isWI(l) && inTerritory(l) && hasContact(l) && reachable(l) && !seen.has(String(l.leadId)))
  .map((l, i) => ({ shaped: shape(l, 'pond', i), bucket: 'pond', lead_id: String(l.leadId), phone: phone(l), email: email(l) }));

// PIPELINE: leads already claimed by me. Once per day only (first successful run at/after
// 7am), so the 5-min cadence doesn't re-email the whole book every run. The
// pipelineEmailedDate flag is committed only after a successful send (see "Mark Emailed Seen").
const todayStr = $now.toFormat('yyyy-LL-dd');
let mine = [];
if (hour >= 7 && sd.pipelineEmailedDate !== todayStr) {
  mine = pipe
    .filter(l => String(l.assignedUserId) === String(cfg.myUserId) && reachable(l))
    .map((l, i) => ({ shaped: shape(l, 'pipeline', 100000 + i), bucket: 'pipeline', lead_id: String(l.leadId), phone: phone(l), email: email(l) }));
}

// Safety cap so a giant bulk import can't truncate the model output. pondNew is already
// newest-first; keep the newest N. Pipeline is always kept (small).
const MAX = Number(cfg.maxPerRun || 50);
let cappedPond = pondNew;
if (pondNew.length > MAX) { cappedPond = pondNew.slice(0, MAX); console.log(`Capped pond ${pondNew.length} -> ${MAX} (newest kept)`); }

const all = [...cappedPond, ...mine];
if (!all.length) return []; // nothing new -> no email, no Anthropic call

const rawById = {};
all.forEach(x => {
  rawById[String(x.shaped.ref)] = {
    lead_id: x.lead_id,
    bucket: x.bucket,
    location: x.shaped.location,
    phone: x.phone,
    email: x.email,
    mail_address: x.shaped.mail_address,
    listing_status: x.shaped.listing_status,
    list_price: x.shaped.list_price,
    bedrooms: x.shaped.bedrooms,
    bathrooms: x.shaped.bathrooms,
    square_feet: x.shaped.square_feet,
    year_built: x.shaped.year_built,
    owner_occupied: x.shaped.owner_occupied,
    years_owned: x.shaped.years_owned,
    equity_estimate: x.shaped.equity_estimate,
    list_office: x.shaped.list_office,
    mls_number: x.shaped.mls_number
  };
});

const SYSTEM = [
  'You triage seller prospects for Anthony Stolp, a residential real estate agent based in',
  `Ozaukee County, Wisconsin (ExSell Experts / Epique Realty). He works these ${countyNames.length} counties, all equally:`,
  `${countyNames.slice(0, -1).join(', ')}${countyNames.length > 1 ? ' and ' : ''}${countyNames[countyNames.length - 1]}.`,
  '',
  'These are NOT website inquiries. They are public listing records: homes that were listed for',
  'sale and did not sell. `listing_status` is Expired (the listing agreement ran out), Canceled',
  '(withdrawn early), or FSBO (owner selling without an agent). These owners publicly tried to',
  'sell and currently have no agent working for them. There is no inquiry, no form fill, and no',
  'website activity to reason about — do not invent any.',
  '',
  'THERE IS NO URGENCY. These listings expired weeks or months ago. Never imply the lead is hot,',
  'time-sensitive, or must be contacted today. Anthony has another job and works these on his own',
  'schedule. Rank by which are WORTH his time, not by which are most urgent.',
  '',
  'Score each lead on the evidence actually present:',
  '- Geography: every lead you are given is already inside those counties. Location does not',
  '  change the score: two leads in different counties are judged on the same evidence.',
  '- owner_occupied "Y" means a resident who tried to move and failed — the strongest signal here.',
  '  "N" is an absentee owner or investor: a colder, more transactional conversation. Rank it lower',
  '  unless the numbers are compelling.',
  '- years_owned and equity_estimate together say whether they CAN move. Long tenure plus real',
  '  equity is a seller with options. Little or negative equity often explains why it did not sell.',
  '- list_price against estimated_value / assessed_value hints at overpricing, the most common',
  '  reason a listing dies. A list price well above estimated value is a specific, useful angle.',
  '- listing_remarks is the previous agent\'s own marketing copy. Read it for what the house is and',
  '  how it was sold. Thin or careless remarks suggest weak marketing, which is an opening.',
  '- work_emails_suppressed counts addresses dropped for being workplace or school domains.',
  '  Anthony never contacts people at work. If it is >0 and has_email is false, the lead is',
  '  mail-only no matter how many addresses the record appears to carry.',
  '- mailable matters: mail is Anthony\'s primary channel. A lead with no mailing address is much',
  '  less useful even if otherwise good.',
  '- lofty_score is Lofty\'s own number. It clusters narrowly and means little — use it only to',
  '  break ties, never as a primary driver.',
  '',
  'HARD SKIP: if list_office is Epique Realty or ExSell (any spelling), set tier "SKIP" — that is',
  'his own brokerage and soliciting it is off limits. Also set "SKIP" for anything with no mailing',
  'address AND no phone AND no email.',
  '',
  'BE HONEST, DO NOT MANUFACTURE A SPREAD. If a batch is genuinely mediocre, say so by scoring it',
  'low. It is correct and useful for a run to contain zero A leads. Never inflate a tier to fill a',
  'quota, and never state a fact that is not in the data you were given. If a field is null, treat',
  'it as unknown and say "unknown" rather than guessing.',
  '',
  'Write plainly. No em dashes, no rhetorical flourish, no sales language. Use periods and commas.',
  'Anthony reads these on a phone between other work, so lead with the fact that matters most.',
  '',
  'Tiers: A = clearly worth a personal letter and a follow-up call. B = worth including in the next',
  'mailer batch. C = low priority, leave it. SKIP = do not contact (see hard skip rules).',
  '',
  'Respond with ONLY a JSON array, no preamble, no markdown, no code fences. Each element:',
  '{',
  '  "ref": integer (echo back the ref you were given, exactly. This is how the lead is',
  '     identified. Never invent, shorten or renumber it.),',
  '  "name": "string",',
  '  "tier": "A | B | C | SKIP",',
  '  "score": 0-100,',
  '  "why_approachable": "one plain sentence stating the public facts that make contact reasonable',
  '     what they listed at, with whom, and that it did not sell. Facts only, no persuasion.",',
  '  "headline": "the property in under 12 words, e.g. \'3bd/2ba Grafton ranch, listed $329k, owned 11 yrs\'",',
  '  "assessment": "two or three sentences on what this owner\'s situation likely is and why the',
  '     listing probably failed. Name the evidence. Say plainly when you are inferring.",',
  '  "outreach_angle": "what to lead with in a letter or call, specific to this property.",',
  '  "confidence": "high | medium | low — how much the available data actually supports the above"',
  '}',
  'Sort the array by score, highest first.'
].join('\n');

// --- Token guardrails (anthonystolp T-041) ------------------------------------------------
const nowMs = typeof $now.toMillis === 'function' ? $now.toMillis() : Date.now();
const nowIso = new Date(nowMs).toISOString();

// 1. A pipeline lead is re-rated only when what Claude would see has changed. Claude rates a
// pipeline lead on property facts alone (shape above), which almost never change, so before this
// the same ~40 leads went to Claude every morning for the same answers. The fingerprint is the
// shaped lead without `ref` (a per-run join key) and `years_owned` (it drifts with the calendar),
// plus the model and the prompt: change either and every lead is re-rated once, as it should be.
// The rating Claude returns is stored by Parse & Sort in pipelineRatings, keyed by lead id.
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const promptKey = fnv(`${cfg.model}\n${SYSTEM}`);
const fingerprint = (s) => { const { ref, years_owned, ...facts } = s; return fnv(`${promptKey}\n${JSON.stringify(facts)}`); };
const ratings = sd.pipelineRatings && typeof sd.pipelineRatings === 'object' ? sd.pipelineRatings : {};
// Forget leads that have left the pipeline, so the store holds only the current book. Only on a
// pipeline run and only when Lofty returned a pipeline: an empty or failed read prunes nothing.
if (mine.length && pipe.length) {
  const current = new Set(pipe.map(l => String(l.leadId)));
  Object.keys(ratings).forEach(id => { if (!current.has(id)) delete ratings[id]; });
  sd.pipelineRatings = ratings;
}
const batch = [];
const cached = [];
all.forEach(x => {
  if (x.bucket !== 'pipeline') { batch.push(x.shaped); return; }
  const fp = fingerprint(x.shaped);
  rawById[String(x.shaped.ref)].fp = fp;
  const hit = ratings[x.lead_id];
  if (hit && hit.fp === fp && hit.rating) cached.push({ ...hit.rating, ref: x.shaped.ref });
  else batch.push(x.shaped);
});
const needsClaude = batch.length > 0;
const pondInBatch = batch.filter(s => rawById[String(s.ref)].bucket === 'pond').length;
const logCall = (called) => {
  const log = Array.isArray(sd.claudeLog) ? sd.claudeLog : [];
  sd.claudeLog = [...log, { at: nowIso, called, pond: pondInBatch, pipelineRated: batch.length - pondInBatch, pipelineCached: cached.length }].slice(-200);
};

// 2. After three failed runs in a row, Claude is tried at most once every 6 hours until a run
// gets through. A run that fails anywhere after the Claude call (Claude's reply, a claim, the
// send) marks nothing seen, so before this the next run paid Claude for the same leads again,
// every 5 minutes, and nobody was told. The count goes up HERE, before the call, because n8n
// saves static data on a failed production run too (n8n 2.20.6,
// execution-lifecycle-hooks.ts); it goes back to 0 only where a run ends well: Mark Emailed
// Seen after the send, and Parse & Sort when there is nothing to send.
const MAX_FAILURES = 3;
const HOLD_MS = 6 * 60 * 60 * 1000;
const guard = sd.claudeGuard && typeof sd.claudeGuard === 'object' ? sd.claudeGuard : { failures: 0 };
if (needsClaude) {
  const lastTry = guard.lastTryAt ? Date.parse(guard.lastTryAt) : 0;
  if ((guard.failures || 0) >= MAX_FAILURES && nowMs - lastTry < HOLD_MS) {
    if (guard.alertedAt) return []; // held, and AJ has already been told
    guard.alertedAt = nowIso;
    sd.claudeGuard = guard;
    const resume = new Date(lastTry + HOLD_MS).toISOString();
    const subject = `Lead triage paused: ${guard.failures} failed runs in a row`;
    const html = [
      `<p>The Lofty lead triage has failed ${guard.failures} runs in a row after calling Claude, so it has stopped calling Claude to avoid paying for the same leads again.</p>`,
      `<p>Last attempt: ${guard.lastTryAt}. It tries once more at ${resume} (UTC), then every 6 hours until a run gets through. No new leads are lost: nothing is marked seen until a digest is sent.</p>`,
      '<p>Failed runs are kept in n8n under Executions for lofty-lead-triage-daily. This email is sent once per pause.</p>'
    ].join('\n');
    return [{ json: { route: 'alert', subject, html } }];
  }
  guard.failures = (guard.failures || 0) + 1;
  guard.lastTryAt = nowIso;
  sd.claudeGuard = guard;
}
logCall(needsClaude);

// Output runs ~300 tokens per lead (headline + why_approachable + assessment + angle),
// so 50 leads is ~15k. Generous headroom here so a verbose batch can never truncate the
// JSON and blow up Parse & Sort. The real constraint is n8n's HTTP timeout, not this cap:
// keep cfg.maxPerRun at 25 or below so a run finishes in ~2 minutes. Leads over the cap
// are not lost, they are simply triaged on the next run.
const anthropicBody = {
  model: cfg.model,
  max_tokens: 32000,
  system: SYSTEM,
  messages: [{ role: 'user', content: JSON.stringify(batch) }]
};

// route: "claude" goes through Anthropic to Parse & Sort; "cached" (every lead has a stored
// rating) goes straight to Parse & Sort, so the daily pipeline digest still goes out.
return [{ json: { route: needsClaude ? 'claude' : 'cached', batch, cached, rawById, anthropicBody, count: batch.length, pondCount: cappedPond.length, pipelineCount: mine.length, cachedCount: cached.length } }];
