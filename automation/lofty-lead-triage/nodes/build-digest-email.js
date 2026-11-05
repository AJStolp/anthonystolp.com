// Build one scannable HTML digest, property-first.
//
// These are expired / canceled / FSBO listing records, not website inquiries, so the card
// leads with the HOUSE (what it listed for, who failed to sell it, how long they've owned it)
// rather than a call opener. Nothing here implies urgency: the listings died weeks or months
// ago and they keep. A/B leads get a full card; C leads are counted but not rendered, so the
// inbox stays short without anything disappearing silently.
const items = $input.all().map(i => i.json); // already sorted by score desc, SKIPs removed
const cfg = $('Read Config').first().json; // for the per-lead Send postcard link
const date = (items[0] && items[0].date) || $now.toFormat('yyyy-LL-dd');
const pond = items.filter(i => i.bucket === 'pond');
const pipe = items.filter(i => i.bucket === 'pipeline');
const shortlist = pond.filter(i => i.tier === 'A' || i.tier === 'B');
const rest = pond.filter(i => i.tier !== 'A' && i.tier !== 'B');

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const color = t => t === 'A' ? '#1a7f37' : t === 'B' ? '#9a6700' : '#6e7781';
const money = n => (n == null || n === '') ? null : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtPhone = p => { const d = String(p || '').replace(/\D/g, ''); if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`; if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`; return p || ''; };
// A or B pond leads were already claimed by "Pick Claims" before this node ran, so the card
// says how that went. Claimed is his now: open it. Taken means another agent got there
// first, and Lofty will show it as Illegal Access, so there is nothing to tap. Failed keeps
// Lofty's words and offers Claim in Lofty, where Claim Lead Now can be tried by hand.
const openBtn = i => `<a href="https://crm.lofty.com/admin/home/detail?leadId=${esc(i.lead_id)}" style="display:inline-block;background:#0969da;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:5px 12px;border-radius:5px;margin-right:6px">Open in Lofty &rarr;</a>`;
const claimBtn = i => `<a href="https://crm.lofty.com/admin/home/detail?leadId=${esc(i.lead_id)}" style="display:inline-block;background:#1a7f37;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;padding:5px 12px;border-radius:5px;margin-right:6px">Claim in Lofty &rarr;</a>`;
const pill = (bg, text) => `<span style="display:inline-block;background:${bg};color:#ffffff;font-weight:700;font-size:13px;padding:5px 12px;border-radius:5px;margin-right:6px">${text}</span>`;
const claimRow = i => {
  if (i.claim === 'claimed') return pill('#1a7f37', 'Claimed for you &#10003;') + openBtn(i);
  if (i.claim === 'taken') return pill('#6e7781', 'Taken by another agent first');
  if (i.claim === 'failed') return pill('#9a6700', `Auto claim failed: ${esc(i.claim_note)}`) + claimBtn(i);
  return i.bucket === 'pond' ? claimBtn(i) : openBtn(i);
};

// One-tap postcard, handled by the companion lofty-mailer-webhook workflow. It does not
// render until that workflow is deployed and configured. Shown for any lead with a mailing
// address, including A tier: AJ works A by phone, but there is no reason to withhold the
// option.
//
// Dedup and the weekly cap are enforced by the WEBHOOK, not here. n8n static data is
// per-workflow, so this workflow cannot know what has already been mailed. Tapping an
// already-mailed lead is harmless and returns an "already mailed" page. A lead another
// agent claimed is theirs to work, so it gets no postcard button.
const mailBtn = i => (i.mail_address && i.claim !== 'taken' && cfg.mailBaseUrl && cfg.mailSecret && !/PUT_|YOUR_/.test(String(cfg.mailBaseUrl)) && !/PUT_|YOUR_/.test(String(cfg.mailSecret)))
  ? `<a href="${cfg.mailBaseUrl}/lofty-mail?lead_id=${encodeURIComponent(i.lead_id)}&t=${encodeURIComponent(cfg.mailSecret || '')}" style="display:inline-block;background:#6639ba;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;padding:5px 12px;border-radius:5px;margin-right:6px">Send postcard &rarr;</a>`
  : '';

// One line of hard property facts, only the parts we actually have.
const facts = i => {
  const f = [];
  const bb = [i.bedrooms ? `${i.bedrooms}bd` : null, i.bathrooms ? `${String(i.bathrooms).replace(/\.0$/, '')}ba` : null].filter(Boolean).join('/');
  if (bb) f.push(bb);
  if (i.square_feet) f.push(`${Number(i.square_feet).toLocaleString('en-US')} sqft`);
  if (i.year_built) f.push(`built ${i.year_built}`);
  if (i.owner_occupied === 'Y') f.push('owner-occupied');
  else if (i.owner_occupied === 'N') f.push('absentee owner');
  if (i.years_owned != null) f.push(`owned ${i.years_owned} yrs`);
  if (i.equity_estimate != null && i.equity_estimate > 0) f.push(`~${money(i.equity_estimate)} equity`);
  return f.join(' &middot; ');
};

const card = i => {
  const c = [];
  if (i.phone) c.push(`<a href="tel:${esc(String(i.phone).replace(/\D/g, ''))}" style="color:#0969da;text-decoration:none">${esc(fmtPhone(i.phone))}</a>`);
  if (i.email) c.push(`<a href="mailto:${esc(i.email)}" style="color:#0969da;text-decoration:none">${esc(i.email)}</a>`);
  const price = money(i.list_price);
  const factLine = facts(i);
  return `<div style="margin:0 0 12px;padding:11px 13px;border-left:4px solid ${color(i.tier)};background:#f6f8fa;border-radius:4px">`
    + `<div><span style="display:inline-block;background:${color(i.tier)};color:#ffffff;font-weight:700;font-size:13px;padding:2px 9px;border-radius:11px">${esc(i.tier)} ${esc(i.score)}</span>`
    + ` &nbsp;<strong>${esc(i.headline || i.name)}</strong></div>`
    + `<div style="margin:4px 0 2px;font-size:13px;color:#57606a">`
    + `${esc(i.name)}${i.mail_address ? ` &middot; ${esc(i.mail_address)}` : ` &middot; ${esc(i.location)}`}</div>`
    + (factLine ? `<div style="margin:2px 0;font-size:13px;color:#57606a">${factLine}</div>` : '')
    + `<div style="margin:2px 0;font-size:13px;color:#57606a">`
    + `${esc(i.listing_status || 'Listing')}${price ? ` at ${price}` : ''}`
    + `${i.list_office ? ` &middot; listed by ${esc(i.list_office)}` : ''}`
    + `${i.mls_number ? ` &middot; MLS ${esc(i.mls_number)}` : ''}</div>`
    + (i.why_approachable ? `<div style="margin:7px 0 3px;font-size:13px;color:#1f2328"><strong>Why it's fair game:</strong> ${esc(i.why_approachable)}</div>` : '')
    + (i.assessment ? `<div style="margin:3px 0">${esc(i.assessment)}</div>` : '')
    + (i.outreach_angle ? `<div style="margin:3px 0;font-size:13px"><strong>Angle:</strong> ${esc(i.outreach_angle)}</div>` : '')
    + (i.confidence ? `<div style="margin:3px 0;font-size:12px;color:#8c959f">confidence: ${esc(i.confidence)}</div>` : '')
    + (c.length ? `<div style="margin:5px 0;font-size:13px">${c.join(' &middot; ')}</div>` : `<div style="margin:5px 0;font-size:13px;color:#8c959f">no phone or email on file</div>`)
    + `<div style="margin:8px 0 1px">${claimRow(i)}${mailBtn(i)}</div>`
    + `</div>`;
};

const section = (title, arr) => arr.length ? `<h2 style="font:600 16px system-ui;margin:18px 0 8px">${title} (${arr.length})</h2>` + arr.map(card).join('') : '';

// Weak leads are counted, not rendered. They were still triaged exactly once.
const restLine = rest.length
  ? `<p style="margin:10px 0 0;font-size:13px;color:#8c959f">${rest.length} more triaged and set aside as low priority. They were reviewed, not lost.</p>`
  : '';

// Lead with what the auto claim did, since that is what changed in Lofty. Without any claim
// results (claimAssignee unset) this falls back to the plain count.
const claimCount = k => shortlist.filter(i => i.claim === k).length;
const claimParts = [
  claimCount('claimed') && `${claimCount('claimed')} claimed for you`,
  claimCount('taken') && `${claimCount('taken')} taken first`,
  claimCount('failed') && `${claimCount('failed')} claim failed`
].filter(Boolean);
const summary = claimParts.length ? claimParts : [`${shortlist.length} worth a letter`];

const headline = shortlist.length
  ? `${summary.join(' &middot; ')} &middot; ${pond.length} reviewed &middot; ${esc(date)}`
  : `Nothing worth your time in this batch &middot; ${pond.length} reviewed &middot; ${esc(date)}`;

const html = `<div style="font:14px/1.5 system-ui,Segoe UI,Arial,sans-serif;max-width:680px;color:#1f2328">`
  + `<p style="margin:0 0 6px;color:#57606a">${headline}</p>`
  + section('Worth a letter', shortlist)
  + restLine
  + section('Your pipeline', pipe)
  + `<p style="color:#8c959f;font-size:12px;margin-top:18px">Expired, canceled and FSBO listings from the Lofty &ldquo;WI Leads&rdquo; pond, reviewed by Claude. These are public listing records, not website inquiries. Tiers are relative priority within this batch &mdash; nothing here is time-sensitive.</p>`
  + `</div>`;

const subject = shortlist.length
  ? `Lead review · ${date} · ${summary.join(' · ')}`
  : `Lead review · ${date} · nothing worth your time (${pond.length} reviewed)`;
return [{ json: { subject, html } }];
