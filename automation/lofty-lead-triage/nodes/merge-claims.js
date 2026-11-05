// Put each claim result back on its lead, so the digest can say what happened.
//
// Lofty answers POST /v1.0/leads/{id}/assignment with the lead id when the claim lands, and
// with {"message":"no authority"} when the lead is no longer in the pond: another agent
// claimed it first. Opening such a lead afterwards shows "Illegal Access". Anything else is
// a real failure and keeps Lofty's words for the digest.
//
// The claim node runs once per picked lead and returns one response per input, in order,
// so responses pair with picks by position. Every Parse & Sort item passes through; only
// claimed-for leads gain `claim` and `claim_note`.
const items = $('Parse & Sort').all().map(i => i.json);
const picked = $('Pick Claims').all().map(i => i.json).filter(p => p.lead_id);
const responses = picked.length && $('Lofty: Claim Lead').isExecuted
  ? $('Lofty: Claim Lead').all().map(i => i.json || {})
  : [];

const outcome = (r) => {
  if (r && r.leadId) return { claim: 'claimed', claim_note: '' };
  const msg = String((r && (r.message || r.code || (r.error && r.error.message) || r.data)) || 'no response from Lofty');
  if (/^no authority$/i.test(msg.trim())) return { claim: 'taken', claim_note: '' };
  return { claim: 'failed', claim_note: msg.slice(0, 200) };
};

const byLead = {};
picked.forEach((p, k) => { byLead[p.lead_id] = outcome(responses[k]); });

const counts = Object.values(byLead).reduce((c, o) => (c[o.claim] = (c[o.claim] || 0) + 1, c), {});
if (picked.length) console.log(`Auto claim: ${JSON.stringify(counts)}`);

return items.map(i => ({ json: byLead[String(i.lead_id)] ? { ...i, ...byLead[String(i.lead_id)] } : i }));
