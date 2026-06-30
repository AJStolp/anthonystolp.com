// Filter, bucket, shape, and build the Anthropic request body.
// Anti-redundancy: drop already-seen ids (committed post-send; once-only dedup), non-WI,
// far-from-area (zip prefix), no-contact, unreachable (Do Not Contact / dead stage), and
// claimed-by-others. The stage=New Leads query already excludes the dead graveyard, so no
// date floor is needed — the seen-set guarantees each lead is triaged exactly once.
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
const inferType = l => {
  const sell = !!(l.houseToSell || l.sellingTimeFrame);
  const buy = !!(l.buyHouse || l.buyingTimeFrame);
  if (sell && buy) return 'buyer+seller';
  if (sell) return 'seller';
  if (buy) return 'buyer';
  return 'unknown';
};
const priceRange = l => { const q = l.leadInquiry || {}; if (q.priceMin || q.priceMax) return `${q.priceMin || '?'} - ${q.priceMax || '?'}`; return null; };

const shape = (l, bucket) => ({
  lead_id: String(l.leadId),
  name: `${l.firstName || ''} ${l.lastName || ''}`.trim() || '(no name)',
  type: inferType(l),
  source: l.source || null,
  status: l.stage || null,
  created_at: l.createTime || null,
  last_touch: l.lastTouch || l.lastVisit || null,
  lead_score_lofty: typeof l.score === 'number' ? l.score : null,
  location: [l.city, l.state, l.zipCode].filter(Boolean).join(', ') || null,
  price_range: priceRange(l),
  first_time_buyer: !!l.fthb,
  pre_qualified: !!l.preQual,
  buying_timeframe: l.buyingTimeFrame || null,
  selling_timeframe: l.sellingTimeFrame || null,
  has_phone: !!phone(l),
  has_email: !!email(l),
  activity_summary: l.lastVisit ? `last website visit ${l.lastVisit}` : 'no tracked website activity'
});

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
  rawById[x.shaped.lead_id] = { bucket: x.bucket, type: x.shaped.type, location: x.shaped.location, phone: x.phone, email: x.email };
  return x.shaped;
});

const SYSTEM = [
  'You are a lead triage assistant for Anthony Stolp, a residential real estate agent based in',
  'Ozaukee County, Wisconsin. He actively works Ozaukee County and north Milwaukee County, and will',
  'consider adjacent Washington and Waukesha County. Each run you score and rank leads from his Lofty',
  'pond so he knows which to CLAIM and call first. He has very little time, so be decisive.',
  '',
  'You receive a JSON array of leads. Some are unclaimed pond leads he could claim, some are leads he',
  'already works. Score each lead on its own merits.',
  '',
  'Score each lead on:',
  '- Geography (HARD signal): leads in/near Ozaukee + north Milwaukee County are workable. Score down',
  '  leads far from there for drive time (e.g. Elkhorn, Fontana, Madison, Green Bay, far western/northern',
  '  WI), and call it out in `why`. Use the city/zip in `location`.',
  '- Intent & readiness: pre_qualified, a concrete buying/selling timeframe, a defined price_range, a',
  '  real Lofty lead_score, and recent activity all rank higher. Passive/cold leads rank lower.',
  '- Type: seller leads are high value (a listing is a listing). Ready, financed buyers are high value.',
  '- Recency: fresher created_at / last_touch scores higher.',
  '- Contactability: has_phone and has_email beat missing contact info.',
  '',
  'These pond leads are mostly cold imports with thin, similar data. Do NOT dump them all into one tier.',
  'Rank them RELATIVE to each other for CLAIM PRIORITY and use a real spread: A for the clear best handful',
  'to call today, B for solid maybes, C for weak/skip. Always surface a usable A/B set worth acting on.',
  '',
  'Respond with ONLY a JSON array, no preamble, no markdown, no code fences. Each element:',
  '{',
  '  "lead_id": "string (echo back exactly as received)",',
  '  "name": "string",',
  '  "tier": "A | B | C",',
  '  "score": 0-100,',
  '  "why": "one or two sentences on what makes this lead worth or not worth acting on now, incl. geography",',
  '  "best_channel": "text | call | email",',
  '  "suggested_action": "the single next step (e.g. claim + first touch, or skip / leave in pond, or the next call)",',
  '  "call_opener": "one natural opening line he can say or text, specific to this lead"',
  '}',
  'Sort the array by score, highest first.'
].join('\n');

const anthropicBody = {
  model: cfg.model,
  max_tokens: 8192,
  system: SYSTEM,
  messages: [{ role: 'user', content: JSON.stringify(batch) }]
};

return [{ json: { batch, rawById, anthropicBody, count: batch.length, pondCount: cappedPond.length, pipelineCount: mine.length } }];
