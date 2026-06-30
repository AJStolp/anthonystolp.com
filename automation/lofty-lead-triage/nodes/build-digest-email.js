// Build one scannable HTML digest: every lead as a card with tap-to-call contact.
const items = $input.all().map(i => i.json); // already sorted by score desc
const cfg = $('Read Config').first().json; // for the per-lead Claim now link
const date = (items[0] && items[0].date) || $now.toFormat('yyyy-LL-dd');
const pond = items.filter(i => i.bucket === 'pond');
const pipe = items.filter(i => i.bucket === 'pipeline');
const claim = pond.filter(i => i.tier === 'A' || i.tier === 'B').length;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const color = t => t === 'A' ? '#1a7f37' : t === 'B' ? '#9a6700' : '#6e7781';
const fmtPhone = p => { const d = String(p || '').replace(/\D/g, ''); if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`; if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`; return p || ''; };
const claimBtn = i => (i.bucket === 'pond' && cfg.claimBaseUrl && cfg.claimSecret && !/PUT_|YOUR_/.test(String(cfg.claimBaseUrl)) && !/PUT_|YOUR_/.test(String(cfg.claimSecret)))
  ? `<div style="margin:8px 0 1px"><a href="${cfg.claimBaseUrl}/lofty-claim?lead_id=${encodeURIComponent(i.lead_id)}&t=${encodeURIComponent(cfg.claimSecret || '')}" style="display:inline-block;background:#1a7f37;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;padding:5px 12px;border-radius:5px">Claim now &rarr;</a></div>`
  : '';
const card = i => {
  const c = [];
  if (i.phone) c.push(`<a href="tel:${esc(String(i.phone).replace(/\D/g, ''))}" style="color:#0969da;text-decoration:none">${esc(fmtPhone(i.phone))}</a>`);
  if (i.email) c.push(`<a href="mailto:${esc(i.email)}" style="color:#0969da;text-decoration:none">${esc(i.email)}</a>`);
  return `<div style="margin:0 0 10px;padding:10px 12px;border-left:4px solid ${color(i.tier)};background:#f6f8fa;border-radius:4px">`
    + `<div><span style="display:inline-block;background:${color(i.tier)};color:#ffffff;font-weight:700;font-size:13px;padding:2px 9px;border-radius:11px">${esc(i.tier)} ${esc(i.score)}</span> &nbsp;<strong>${esc(i.name)}</strong> <span style="color:#57606a">&middot; ${esc(i.location)} &middot; ${esc(i.type)}</span></div>`
    + (c.length ? `<div style="margin:3px 0;font-size:13px">${c.join(' &middot; ')}</div>` : `<div style="margin:3px 0;font-size:13px;color:#8c959f">no contact on file</div>`)
    + `<div style="margin:3px 0">${esc(i.why)}</div>`
    + `<div style="font-size:13px"><strong>Opener:</strong> &ldquo;${esc(i.call_opener)}&rdquo; <span style="color:#8c959f">(${esc(i.best_channel)})</span></div>`
    + claimBtn(i)
    + `<div style="margin:6px 0 1px"><a href="https://crm.lofty.com/admin/home/detail?leadId=${esc(i.lead_id)}" style="display:inline-block;background:#0969da;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:5px 12px;border-radius:5px">Open in Lofty &rarr;</a></div>`
    + `</div>`;
};
const section = (title, arr) => arr.length ? `<h2 style="font:600 16px system-ui;margin:18px 0 8px">${title} (${arr.length})</h2>` + arr.map(card).join('') : '';
const html = `<div style="font:14px/1.5 system-ui,Segoe UI,Arial,sans-serif;max-width:680px;color:#1f2328">`
  + `<p style="margin:0 0 6px;color:#57606a">${pond.length} pond leads &middot; ${claim} worth claiming first &middot; ${esc(date)}</p>`
  + section('Claim now: pond leads', pond)
  + section('Work your pipeline', pipe)
  + `<p style="color:#8c959f;font-size:12px;margin-top:18px">Lofty pond &ldquo;WI Leads&rdquo; &middot; ranked by Claude. Tiers are relative priority within this batch.</p>`
  + `</div>`;
const subject = `Lead triage · ${date} · ${pond.length} pond leads, ${claim} to claim first`;
return [{ json: { subject, html } }];
