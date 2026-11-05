// Which scored leads to claim right now: pond leads Claude rated A or B.
//
// The WI Leads pond is shared by every Epique agent in the state, and the good leads go
// within the hour (2026-10-28: all three A and B leads from the 6:15 digest were taken by
// 7:30). Waiting for AJ to tap a button loses them, so the workflow claims them itself, the
// moment they are scored, before the digest is built.
//
// Nothing is capped: AJ chose to take every A and B lead. Returning no items is normal;
// this node has "Always Output Data" on, so the IF after it still runs and sends the
// digest down the no-claims branch.
const cfg = $('Read Config').first().json;
const assignee = String(cfg.claimAssignee || '').trim();
if (!assignee || /PUT_|YOUR_/.test(assignee)) {
  console.log('claimAssignee is not set; auto claim skipped');
  return [];
}
return $input.all()
  .map(i => i.json)
  .filter(i => i.bucket === 'pond' && (i.tier === 'A' || i.tier === 'B'))
  .map(i => ({ json: { lead_id: String(i.lead_id), assignee } }));
