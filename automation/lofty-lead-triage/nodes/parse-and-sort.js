// Parse Claude's JSON, drop SKIPs, sort by score desc, merge back the property facts.
//
// NOTE ON SUPPRESSION: "Mark Emailed Seen" commits the leads this node OUTPUTS, after a
// successful send. A SKIP (own brokerage, or no way to reach them) never becomes workable and
// is never shown, so it does not wait for a send: a pond SKIP is committed to the seen-set
// HERE. Before that, a SKIP went back to Claude on every run, and a batch of nothing but SKIPs
// ended the run with nothing committed at all (anthonystolp T-023). Everything else is passed
// through and the DIGEST decides what to render, so a merely-weak lead is still counted and
// never silently vanishes.
const shaped = $('Filter & Shape').first().json;
const raw = shaped.rawById || {};
const today = $now.toFormat('yyyy-LL-dd');

// anthonystolp T-041: on a "cached" run every lead already had a stored rating, Claude was not
// called, and this node is reached straight from "IF Needs Claude". There is no reply to read.
let parsed = [];
if (shaped.route !== 'cached') {
  const resp = $json;
  const text = (resp.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  // The prompt asks for a bare array, but a reply can still open with a line of reasoning
  // (2026-11-02, execution 14346: "I need to check each lead's geography...") and fail the whole
  // run. Read from the first [ to the last ], so text around the array is ignored.
  const stripped = text.replace(/```json|```/g, '');
  const start = stripped.indexOf('['), end = stripped.lastIndexOf(']');
  const clean = (start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped).trim();
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    throw new Error('Claude did not return valid JSON: ' + e.message + ' :: ' + clean.slice(0, 500));
  }
  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array from Claude, got: ' + clean.slice(0, 200));
}

// Store every pipeline rating Claude just gave, SKIP included, against the fingerprint Filter &
// Shape computed, so tomorrow the same lead is not paid for again unless its facts change.
const fresh = parsed.filter(p => { const r = raw[String(p.ref)]; return r && r.bucket === 'pipeline' && r.fp; });
if (fresh.length) {
  const sdR = $getWorkflowStaticData('global');
  const ratings = sdR.pipelineRatings && typeof sdR.pipelineRatings === 'object' ? sdR.pipelineRatings : {};
  fresh.forEach(p => { const { ref, ...rating } = p; const r = raw[String(ref)]; ratings[r.lead_id] = { fp: r.fp, rating, ratedOn: today }; });
  sdR.pipelineRatings = ratings;
}
// Stored ratings join the fresh ones and go through everything below exactly as if Claude had
// just returned them.
parsed = [...parsed, ...(Array.isArray(shaped.cached) ? shaped.cached : [])];

const isSkip = p => String(p.tier || '').toUpperCase() === 'SKIP';
const skipped = parsed.filter(isSkip);
// Only pond leads live in the seen-set; pipeline leads are reminders, re-sent once a day.
// A SKIP whose ref cannot be joined has no lead id to commit, so it is retried like any orphan.
const skipIds = skipped.map(p => raw[String(p.ref)]).filter(r => r && r.bucket === 'pond').map(r => String(r.lead_id));
if (skipIds.length) {
  const sd = $getWorkflowStaticData('global');
  const seen = new Set(Array.isArray(sd.seenLeadIds) ? sd.seenLeadIds : []);
  skipIds.forEach(id => seen.add(id));
  // 3000 is also the cap in "Mark Emailed Seen". Change one, change both, or a run with a SKIP
  // trims the set to the smaller size and the oldest leads go back to Claude.
  sd.seenLeadIds = [...seen].slice(-3000);
  // A SKIP is permanent, so keep a record of which ids it suppressed: a wrong SKIP is found in
  // skipLog (workflow static data, saved by every production run) and its id taken back out of
  // seenLeadIds by hand. The console line below is not that record: a production Code node only
  // reaches n8n's stdout when the instance sets CODE_ENABLE_STDOUT=true, which is off by default.
  // Bounded to the most recent 500 runs that marked a SKIP.
  const skipLog = Array.isArray(sd.skipLog) ? sd.skipLog : [];
  sd.skipLog = [...skipLog, { date: today, ids: skipIds }].slice(-500);
}
if (skipped.length) console.log(`Dropped ${skipped.length} SKIP leads (own brokerage / uncontactable); marked seen: ${skipIds.join(', ') || 'none'}`);

let kept = parsed.filter(p => !isSkip(p));

// Join on the short `ref` we handed the model, never on leadId: it mangles long numeric ids
// when echoing them (seen live: a 16-digit id came back as 10 digits). A row we cannot join
// has no property data, no working Claim/Lofty link and no bucket, so it would render in
// NEITHER digest section and vanish. Drop it loudly instead. Because it never reaches this
// node's output, "Mark Emailed Seen" does not commit it, so the lead is retried next run
// rather than lost.
const orphans = kept.filter(p => !raw[String(p.ref)]);
if (orphans.length) console.log(`WARNING: ${orphans.length} scored lead(s) had an unresolvable ref and were skipped; they stay un-seen and will be retried. refs: ${orphans.map(o => o.ref).join(', ')}`);
kept = kept.filter(p => !!raw[String(p.ref)]);

kept.sort((a, b) => (b.score || 0) - (a.score || 0));

// The pipeline reminder goes out once a day: "Mark Emailed Seen" sets pipelineEmailedDate after
// the send. When Claude SKIPs every pipeline lead it was given, nothing reaches the digest, no
// send happens, and the same leads went back to Claude on every run until midnight
// (anthonystolp T-030). There is nothing to wait for, so mark today done here.
const pipelineSent = Object.values(raw).some(r => r.bucket === 'pipeline');
if (pipelineSent && !kept.some(p => raw[String(p.ref)].bucket === 'pipeline')) {
  $getWorkflowStaticData('global').pipelineEmailedDate = today;
}

// Nothing to send means the run ends here, and it ended well: clear the failure count that
// Filter & Shape raised before calling Claude (anthonystolp T-041). A run with something to send
// is cleared by "Mark Emailed Seen", after the send.
if (!kept.length) $getWorkflowStaticData('global').claudeGuard = { failures: 0 };

return kept.map(p => {
  const r = raw[String(p.ref)];
  return { json: {
    date: today,
    tier: p.tier || '',
    score: p.score != null ? p.score : '',
    name: p.name || '',
    bucket: r.bucket || '',
    // Claude's read on the lead
    headline: p.headline || '',
    why_approachable: p.why_approachable || '',
    assessment: p.assessment || '',
    outreach_angle: p.outreach_angle || '',
    confidence: p.confidence || '',
    // Property facts, carried through from Filter & Shape so the digest can show them
    listing_status: r.listing_status || '',
    list_price: r.list_price || null,
    bedrooms: r.bedrooms || null,
    bathrooms: r.bathrooms || null,
    square_feet: r.square_feet || null,
    year_built: r.year_built || null,
    owner_occupied: r.owner_occupied || '',
    years_owned: r.years_owned != null ? r.years_owned : null,
    equity_estimate: r.equity_estimate != null ? r.equity_estimate : null,
    list_office: r.list_office || '',
    mls_number: r.mls_number || '',
    mail_address: r.mail_address || '',
    lead_id: String(r.lead_id),
    location: r.location || '',
    phone: r.phone || '',
    email: r.email || ''
  }};
});
