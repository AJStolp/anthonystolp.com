// Authorize a postcard send, then check the two guards that stop it costing money:
// the never-mail-twice set and the weekly piece cap. Nothing is committed here. State is
// written only after thanks.io confirms the send (see mailer-record-sent.js), so a rejected
// or failed send never burns a lead or a slot.
//
// Dedup deliberately lives in THIS workflow, not the digest. n8n static data is per-workflow
// and the triage workflow cannot read it, so the button in the email always renders and this
// node is the authority. Tapping twice is harmless.
const cfg = $('Mailer Config').first().json;
const q = ($('Mail Webhook').first().json.query) || {};
const leadId = String(q.lead_id || '').trim();
const token = String(q.t || '');

const page = (title, body, color) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font:16px/1.5 -apple-system,system-ui,Segoe UI,Arial,sans-serif;background:#f6f8fa;margin:0;padding:48px 20px;color:#1f2328"><div style="max-width:460px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 24px;box-shadow:0 1px 4px rgba(0,0,0,.08)"><h1 style="margin:0 0 10px;font-size:20px;color:${color}">${title}</h1><p style="margin:0;color:#57606a">${body}</p></div></body></html>`;

const deny = (title, body, color) => [{ json: { ok: false, leadId, html: page(title, body, color || '#cf222e') } }];

// A placeholder secret means the workflow was imported but never configured. Refuse rather
// than authorize against a well-known string.
const secret = String(cfg.mailSecret || '');
if (!secret || /PUT_|YOUR_/.test(secret)) {
  return deny('Not configured', 'This mailer workflow has no mailSecret set. Fill in the Mailer Config node before using the Send postcard button.', '#9a6700');
}
if (!leadId || !/^\d+$/.test(leadId)) return deny('Bad request', 'That link is missing a valid lead id.');
if (token !== secret) return deny('Not authorized', 'That link is not valid. Use the Send postcard button in the digest email.');

const sd = $getWorkflowStaticData('global');

// Never mail the same owner twice.
const mailed = new Set(Array.isArray(sd.mailedLeadIds) ? sd.mailedLeadIds : []);
if (mailed.has(leadId)) {
  return deny('Already mailed', 'A postcard has already gone out to this owner. Nothing was sent and you were not charged.', '#57606a');
}

// Rolling weekly cap. Because every send is approved by hand, this is a blast-radius limit
// rather than a rationing mechanism: it stops a bug or a stuck finger from mailing the whole
// pond. Hitting it does NOT consume the lead, so it can simply be sent next week.
const CAP = Math.max(1, Number(cfg.weeklyMailCap || 15));
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const nowMs = Date.parse($now.toISO());
let weekStart = Number(sd.mailWeekStart || 0);
let weekCount = Number(sd.mailWeekCount || 0);
if (!weekStart || (nowMs - weekStart) >= WEEK_MS) { weekStart = nowMs; weekCount = 0; }

if (weekCount >= CAP) {
  const resumes = new Date(weekStart + WEEK_MS).toISOString().slice(0, 10);
  return deny('Weekly cap reached',
    `You have sent ${weekCount} of ${CAP} postcards this week. Nothing was sent and you were not charged. This lead is untouched, so you can send it after the cap resets on ${resumes}.`,
    '#9a6700');
}

// Carry the (possibly rolled over) window forward so the record step does not recompute it.
return [{ json: { ok: true, leadId, weekStart, weekCount, cap: CAP } }];
