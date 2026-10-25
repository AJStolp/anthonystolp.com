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
// A lead that says "do not contact" is not the same as a lead that is worthless. Physical mail
// is not a channel the do-not-call registry governs, and a card is refusable in a way a ringing
// phone is not. So a do-not-contact signal DEMOTES a lead to mail-only rather than dropping it,
// and only the true graveyard stages are dropped outright. See reachable() below, which is
// defined after attr() because the remarks check needs it.
const DEAD_STAGES = new Set(['Closed', 'Archived', 'Trash']);
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

// --- do-not-contact detection, and the mail-only demotion ---------------------------------
// Where a DNC actually shows up on a +plus record, in descending order of reliability:
//   1. the Lofty stage,
//   2. the per-phone DNC custom attributes. They exist as columns and were empty on every
//      record inspected on 2026-08-27, so they can confirm a DNC but never rule one out,
//   3. all three cannot* flags set together,
//   4. the previous agent's own words in the MLS remarks. Observed live on a $949k Delafield
//      expired: "Do not contact Sellers Taken off market for reasons and will be relisting
//      soon." Nothing structured carried that signal. The remarks were the only place it
//      existed, and the lead was receiving automated email until a human happened to read them.
// (4) is why this check is worth having at all.
const DNC_ATTRS = [
  'Contact 1 Phone 1 DNC', 'Contact 1 Phone 2 DNC', 'Contact 1 Phone 3 DNC', 'Contact 1 Phone 4 DNC',
  'Contact 2 Phone 1 DNC', 'Contact 2 Phone 2 DNC', 'Contact 2 Phone 3 DNC',
  'Basic Phone 1 DNC', 'Basic Phone 2 DNC'
];
const DNC_TRUTHY = new Set(['y', 'yes', 'true', '1', 'dnc']);
const DNC_REMARKS = /\bdo\s*not\s*(contact|call|solicit|disturb|phone)\b/i;

// Returns a short human-readable reason, or null when there is no do-not-contact signal.
const dncReason = (l) => {
  if (String(l.stage || '') === 'Do Not Contact') return 'Lofty stage is Do Not Contact';
  const flagged = DNC_ATTRS.find(n => DNC_TRUTHY.has(String(attr(l, n) || '').toLowerCase()));
  if (flagged) return `${flagged} is set`;
  if (l.cannotCall && l.cannotEmail && l.cannotText) return 'every contact channel is disabled on the record';
  if (DNC_REMARKS.test(String(attr(l, 'Remarks') || ''))) return 'the listing remarks ask that the seller not be contacted';
  return null;
};

// Kept, but mail only. A do-not-contact with no mailing address has no remaining route, so it
// is the one case that still drops.
const reachable = (l) => {
  if (DEAD_STAGES.has(String(l.stage || ''))) return false;
  if (dncReason(l)) return !!mailAddress(l);
  return !(l.cannotCall && l.cannotEmail && l.cannotText);
};

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
    // When set, this lead may be written to and must not be called, emailed or texted.
    mail_only: !!dncReason(l),
    mail_only_reason: dncReason(l),
    work_emails_suppressed: workEmailsSuppressed(l),
    lofty_score: typeof l.score === 'number' ? l.score : null,
    added_to_pond: l.createTime || null
  };
};

// POND: unseen, in WI, in drivable region, contactable, reachable, still unclaimed.
const pondNew = pond
  .filter(l => l.assignedUserId === -1 && isWI(l) && nearZip(l) && hasContact(l) && reachable(l) && !seen.has(String(l.leadId)))
  .map((l, i) => ({ shaped: shape(l, 'pond', i), bucket: 'pond', lead_id: String(l.leadId), phone: phone(l), email: email(l) }));

// PIPELINE: leads already claimed by me. Once per day only (first successful run at/after
// 7am), so the 30-min cadence doesn't re-email the whole book every half hour. The
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
const batch = all.map(x => {
  rawById[String(x.shaped.ref)] = {
    lead_id: x.lead_id,
    bucket: x.bucket,
    location: x.shaped.location,
    phone: x.phone,
    email: x.email,
    mail_address: x.shaped.mail_address,
    mail_only: x.shaped.mail_only,
    mail_only_reason: x.shaped.mail_only_reason,
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
  '- work_emails_suppressed counts addresses dropped for being workplace or school domains.',
  '  Anthony never contacts people at work. If it is >0 and has_email is false, the lead is',
  '  mail-only no matter how many addresses the record appears to carry.',
  '- mailable matters: mail is Anthony\'s primary channel. A lead with no mailing address is much',
  '  less useful even if otherwise good.',
  '- mail_only is absolute. When it is true the record carries a do-not-contact signal, given in',
  '  mail_only_reason. Write outreach_angle for a letter and nothing else. Never suggest calling,',
  '  emailing or texting that person, never phrase the angle as an opener or a conversation, and',
  '  do not treat the flag as a reason to score them low. A do-not-contact seller with real equity',
  '  is still a good letter, and the tier should reflect the property, not the channel.',
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
  'Tiers: A = clearly worth a personal letter and a follow-up call, unless mail_only is true, in',
  'which case A means the letter alone is worth writing. B = worth including in the next mailer',
  'batch. C = low priority, leave it. SKIP = not to be approached at all (see hard skip rules).',
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
