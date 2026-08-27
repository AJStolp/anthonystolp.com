// Parse Claude's JSON, drop SKIPs, sort by score desc, merge back the property facts.
//
// NOTE ON SUPPRESSION: everything that reaches this node is committed to the seen-set by
// "Mark Emailed Seen" after a successful send, so a lead dropped here is dropped for good.
// That is deliberate for tier SKIP (own-brokerage listings and uncontactable records — they
// will never become workable). Everything else is passed through and the DIGEST decides what
// to render, so a merely-weak lead is still counted and never silently vanishes.
const resp = $json;
const text = (resp.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
const clean = text.replace(/```json|```/g, '').trim();
let parsed;
try {
  parsed = JSON.parse(clean);
} catch (e) {
  throw new Error('Claude did not return valid JSON: ' + e.message + ' :: ' + clean.slice(0, 500));
}
if (!Array.isArray(parsed)) throw new Error('Expected a JSON array from Claude, got: ' + clean.slice(0, 200));

const raw = $('Filter & Shape').first().json.rawById || {};
const today = $now.toFormat('yyyy-LL-dd');

const skipped = parsed.filter(p => String(p.tier || '').toUpperCase() === 'SKIP').length;
if (skipped) console.log(`Dropped ${skipped} SKIP leads (own brokerage / uncontactable)`);

let kept = parsed.filter(p => String(p.tier || '').toUpperCase() !== 'SKIP');

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
    // Carried so the digest can suppress the tel:/mailto: links entirely. A do-not-contact
    // lead that still renders a tappable phone number is one distracted thumb away from a
    // call that should never have happened.
    mail_only: !!r.mail_only,
    mail_only_reason: r.mail_only_reason || '',
    lead_id: String(r.lead_id),
    location: r.location || '',
    phone: r.phone || '',
    email: r.email || ''
  }};
});
