// Filter, bucket, shape, and build the Anthropic request body.
// Anti-redundancy: drop already-seen ids (committed post-send; once-only dedup), non-WI,
// far-from-area (zip prefix), no-contact, unreachable (Do Not Contact / dead stage), and
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
// so a failed run or the per-run cap never makes a lead silently disappear.

const phone = l => Array.isArray(l.phones) && l.phones.length ? l.phones[0] : null;
const email = l => Array.isArray(l.emails) && l.emails.length ? l.emails[0] : null;
const hasContact = l => !!(phone(l) || email(l));
const DEAD_STAGES = new Set(['Do Not Contact', 'Closed', 'Archived', 'Trash']);
const reachable = l => !DEAD_STAGES.has(String(l.stage || '')) && !(l.cannotCall && l.cannotEmail && l.cannotText);
const isWI = l => String(l.state || '').toUpperCase() === 'WI';
const nearPrefixes = String(cfg.nearZipPrefixes || '').split(',').map(s => s.trim()).filter(Boolean);
const nearZip = l => { if (!nearPrefixes.length) return true; const z = String(l.zipCode || '').slice(0, 3); return z ? nearPrefixes.includes(z) : true; };

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
const mailAddress = (l) => {
  const street = attr(l, 'Owner Street Address') || l.streetAddress;
  const city = attr(l, 'Owner City') || l.city;
  const zip = attr(l, 'Owner Zip') || l.zipCode;
  const st = attr(l, 'Owner State') || l.state;
  return street && city && zip ? `${street}, ${city}, ${st || 'WI'} ${zip}` : null;
};

const shape = (l, bucket) => {
  const addr = mailAddress(l);
  return {
    lead_id: String(l.leadId),
    name: `${l.firstName || ''} ${l.lastName || ''}`.trim() || attr(l, 'Owner Name 1') || '(no name)',
    // What kind of record: Expired | Canceled | FSBO. Drives the whole conversation.
    listing_status: attr(l, 'Status') || null,
    mail_address: addr,
    mailable: !!addr,
    county: attr(l, 'County') || null,
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
    lofty_score: typeof l.score === 'number' ? l.score : null,
    added_to_pond: l.createTime || null
  };
};

// POND: unseen, in WI, in drivable region, contactable, reachable, still unclaimed.
const pondNew = pond
  .filter(l => l.assignedUserId === -1 && isWI(l) && nearZip(l) && hasContact(l) && reachable(l) && !seen.has(String(l.leadId)))
  .map(l => ({ shaped: shape(l, 'pond'), bucket: 'pond', phone: phone(l), email: email(l) }));

// PIPELINE: leads already claimed by me. Once per day only (first successful run at/after
// 7am), so the 30-min cadence doesn't re-email the whole book every half hour. The
// pipelineEmailedDate flag is committed only after a successful send (see "Mark Emailed Seen").
const todayStr = $now.toFormat('yyyy-LL-dd');
let mine = [];
if (hour >= 7 && sd.pipelineEmailedDate !== todayStr) {
  mine = pipe
    .filter(l => String(l.assignedUserId) === String(cfg.myUserId) && reachable(l))
    .map(l => ({ shaped: shape(l, 'pipeline'), bucket: 'pipeline', phone: phone(l), email: email(l) }));
}

// Safety cap so a giant bulk import can't truncate the model output. pondNew is already
// newest-first; keep the newest N. Pipeline is always kept (small).
const MAX = Number(cfg.maxPerRun || 50);
let cappedPond = pondNew;
if (pondNew.length > MAX) { cappedPond = pondNew.slice(0, MAX); console.log(`Capped pond ${pondNew.length} -> ${MAX} (newest kept)`); }

const all = [...cappedPond, ...mine];
if (!all.length) return []; // nothing new -> no email, no Anthropic call

const rawById = {};
const batch = all.map(x => {
  rawById[x.shaped.lead_id] = {
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
  return x.shaped;
});

const SYSTEM = [
  'You triage seller prospects for Anthony Stolp, a residential real estate agent based in',
  'Ozaukee County, Wisconsin (ExSell Experts / Epique Realty). He works Ozaukee County and north',
  'Milwaukee County, and will consider adjacent Washington and Waukesha County.',
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
  '- Geography (HARD signal): Ozaukee County (Cedarburg, Mequon, Grafton, Port Washington,',
  '  Saukville, Thiensville) and the north Milwaukee suburbs are best. Milwaukee city proper is',
  '  workable but a different market. Score down anything far away (Madison, Green Bay, Eau Claire,',
  '  La Crosse, far northern/western WI) and say so in the reasoning.',
  '- owner_occupied "Y" means a resident who tried to move and failed — the strongest signal here.',
  '  "N" is an absentee owner or investor: a colder, more transactional conversation. Rank it lower',
  '  unless the numbers are compelling.',
  '- years_owned and equity_estimate together say whether they CAN move. Long tenure plus real',
  '  equity is a seller with options. Little or negative equity often explains why it did not sell.',
  '- list_price against estimated_value / assessed_value hints at overpricing, the most common',
  '  reason a listing dies. A list price well above estimated value is a specific, useful angle.',
  '- listing_remarks is the previous agent\'s own marketing copy. Read it for what the house is and',
  '  how it was sold. Thin or careless remarks suggest weak marketing, which is an opening.',
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
  '  "lead_id": "string (echo back exactly as received)",',
  '  "name": "string",',
  '  "tier": "A | B | C | SKIP",',
  '  "score": 0-100,',
  '  "why_approachable": "one plain sentence stating the public facts that make contact reasonable',
  '     — what they listed at, with whom, and that it did not sell. Facts only, no persuasion.",',
  '  "headline": "the property in under 12 words, e.g. \'3bd/2ba Grafton ranch, listed $329k, owned 11 yrs\'",',
  '  "assessment": "two or three sentences on what this owner\'s situation likely is and why the',
  '     listing probably failed. Name the evidence. Say plainly when you are inferring.",',
  '  "outreach_angle": "what to lead with in a letter or call, specific to this property.",',
  '  "confidence": "high | medium | low — how much the available data actually supports the above"',
  '}',
  'Sort the array by score, highest first.'
].join('\n');

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

return [{ json: { batch, rawById, anthropicBody, count: batch.length, pondCount: cappedPond.length, pipelineCount: mine.length } }];
