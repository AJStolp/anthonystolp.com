// Interpret the thanks.io response and commit state ONLY on a real send.
//
// Three outcomes are deliberately kept apart:
//   error   -> nothing committed, so the lead can be retried and no slot is burned
//   preview -> nothing committed, because no mail left the building and nothing was charged
//   sent    -> commit mailedLeadIds + the weekly counter
// This mirrors "Mark Emailed Seen" in the triage workflow, which likewise commits only after
// a successful send.
const built = $('Build Postcard').first().json;
const resp = $json || {};

const page = (title, body, color, extra) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font:16px/1.5 -apple-system,system-ui,Segoe UI,Arial,sans-serif;background:#f6f8fa;margin:0;padding:48px 20px;color:#1f2328"><div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 24px;box-shadow:0 1px 4px rgba(0,0,0,.08)"><h1 style="margin:0 0 10px;font-size:20px;color:${color}">${title}</h1><p style="margin:0 0 8px;color:#57606a">${body}</p>${extra || ''}</div></body></html>`;

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The HTTP node runs with neverError, so a vendor rejection arrives as a body rather than a
// failed execution. thanks.io returns {message} on 400/403/500.
const failed = !!resp.message && !resp.id && !(resp.data && resp.data.previews);
if (failed) {
  return [{ json: { html: page('Not sent', `thanks.io rejected the request: ${esc(resp.message)}. Nothing was charged and this lead is untouched, so you can try again.`, '#cf222e') } }];
}

if (built.preview) {
  const previews = (resp.data && Array.isArray(resp.data.previews)) ? resp.data.previews : [];
  const imgs = previews.map(u => `<img src="${esc(u)}" alt="postcard preview" style="max-width:100%;border:1px solid #d0d7de;border-radius:6px;margin:8px 0">`).join('');
  return [{ json: { html: page('Preview only, nothing mailed',
    `This is what would go to ${esc(built.recipientName)} at ${esc(built.mailTo)}. No postcard was sent and you were not charged. Set previewOnly to false in the Mailer Config node when you are ready to mail for real.`,
    '#0969da', imgs) } }];
}

// Real send. Commit both guards now that thanks.io has accepted it.
const sd = $getWorkflowStaticData('global');
const mailed = new Set(Array.isArray(sd.mailedLeadIds) ? sd.mailedLeadIds : []);
mailed.add(String(built.leadId));
sd.mailedLeadIds = [...mailed].slice(-5000);
sd.mailWeekStart = built.weekStart;
sd.mailWeekCount = Number(built.weekCount || 0) + 1;

const remaining = Math.max(0, built.cap - sd.mailWeekCount);
return [{ json: { html: page('Postcard on its way',
  `Sending to ${esc(built.recipientName)} at ${esc(built.mailTo)}. That is ${sd.mailWeekCount} of ${built.cap} this week, ${remaining} left.`,
  '#1a7f37',
  `<p style="margin:8px 0 0;color:#8c959f;font-size:13px">thanks.io order ${esc(resp.id || 'accepted')}. This owner will not be mailed again.</p>`) }}];
