// Build the thanks.io postcard payload from the freshly fetched Lofty lead.
//
// The address is re-read from Lofty rather than passed through the URL: a link in an email
// is user-editable, and this step spends money and puts a licensed real estate advertisement
// in someone's mailbox. Never trust the query string for anything but the lead id.
//
// Contract (verified against docs.thanks.io, not from memory):
//   POST https://api.thanks.io/api/v2/send/postcard   Authorization: Bearer <token>
//   recipients[]: { name, address, address2, city, province, postal_code, country }
//   plus: message, size ("4x6"|"6x9"|"6x11"), and front_image_url OR image_template_id
//   NOTE the recipient field is `province`, not `state`. The return-address override does
//   use `return_state`. That asymmetry is thanks.io's, not a typo here.
const cfg = $('Mailer Config').first().json;
const auth = $('Verify, Cap & Dedup').first().json;
const resp = $json || {};
const lead = resp.lead || resp;

const page = (title, body, color) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font:16px/1.5 -apple-system,system-ui,Segoe UI,Arial,sans-serif;background:#f6f8fa;margin:0;padding:48px 20px;color:#1f2328"><div style="max-width:460px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 24px;box-shadow:0 1px 4px rgba(0,0,0,.08)"><h1 style="margin:0 0 10px;font-size:20px;color:${color}">${title}</h1><p style="margin:0;color:#57606a">${body}</p></div></body></html>`;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const deny = (title, body, color) => [{ json: { ok: false, leadId: auth.leadId, html: page(title, body, color || '#cf222e') } }];

if (!lead || !lead.leadId) return deny('Lead not found', 'Lofty did not return that lead, so nothing was sent.');

const attr = (name) => {
  const a = (lead.customAttributes || []).find(x => x.attributeName === name);
  const v = a && a.value;
  return v == null || String(v).trim() === '' ? null : String(v).trim();
};

// Wis. Stat. 452.136 requires the firm name exactly as printed on the license, clearly shown
// as a business and not a private party. Until that exact string is confirmed (issue #40)
// this must not mail: every piece carries AJ's license.
const firm = String(cfg.firmNameAsLicensed || '');
if (!firm || /PUT_|YOUR_|CONFIRM/i.test(firm)) {
  return deny('Firm name not confirmed',
    'firmNameAsLicensed is still a placeholder. Wisconsin requires the firm name exactly as printed on the license on every piece of advertising, so nothing was sent. Resolve issue #40 first.',
    '#9a6700');
}

const street = attr('Owner Street Address') || lead.streetAddress;
const city = attr('Owner City') || lead.city;
const zip = attr('Owner Zip') || lead.zipCode;
const state = attr('Owner State') || lead.state || 'WI';
if (!street || !city || !zip) {
  return deny('No mailing address', 'This lead has no complete mailing address on file, so nothing was sent and you were not charged.', '#9a6700');
}

// AJ holds a Wisconsin license only. Soliciting a listing outside it is practising real
// estate where he is not licensed, so refuse independently of the triage filter. The digest
// only surfaces WI leads, but this webhook re-fetches by id and a link can be old or edited,
// so the licensed-state boundary is enforced here too rather than assumed upstream. The
// live feed genuinely carries out-of-state records (seen: De Witt, IA).
const licensed = String(cfg.licensedState || 'WI').toUpperCase();
if (String(state).toUpperCase() !== licensed) {
  return deny('Outside your licensed state',
    `That property is in ${esc(state)} and you are licensed in ${esc(licensed)}. Nothing was sent. Soliciting a listing outside your licensed state is not something this workflow will do.`,
    '#cf222e');
}

const first = (lead.firstName || (attr('Owner Name 1') || '').split(' ')[0] || '').trim();
const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || attr('Owner Name 1') || 'Homeowner';
const greeting = first ? `Hi ${first},` : 'Hello,';

// Fixed, reviewed copy. Deliberately NOT model-generated: 452.136 bars advertising a
// property the firm holds no listing on, and these listings have expired so nobody holds
// them. The card solicits nothing and never describes the house as being for sale.
//
// Positioning is researched, not improvised. See docs/research/expired-listing-messaging.md.
// The short version: an expired seller may hear from five agents the same morning and has
// heard the standard opener "fifty times", so any card that asks for the listing is
// indistinguishable from the pile. NAR puts honesty and trustworthiness as the second most
// cited reason sellers choose an agent, so the differentiator is refusing the ask and
// offering the honest read instead. The "not writing to ask for the listing" line is the
// whole strategy and must stay in the second sentence, before they stop reading.
//
// The card OFFERS the diagnosis, it never contains it. Telling someone in writing that their
// home was overpriced, unsolicited, reads as an insult rather than help.
// House style: no em dashes, educate rather than advise, never give legal or tax advice.
const message = [
  greeting,
  `Your ${city} home came off the market without selling. I am not writing to ask for the listing.`,
  `I looked at what it was priced against and what actually sold near it. Say the word and I will send it. No charge, whether you list again this year, next year or never.`,
  `Or tell me what you were trying to do. I would rather hear that.`,
  ``,
  // Firm name rides on the NAME line, not buried at the bottom: 452.136(2)(b) requires it
  // clear and conspicuous. The card design must carry it too; a handwritten signature block
  // alone does not satisfy "conspicuous". The licensee line is NAR Article 12, which requires
  // AJ's status as a real estate professional to be readily apparent. Wisconsin itself does
  // not require the salesperson's name; NAR does.
  `${cfg.agentName || 'Anthony Stolp'}, ${firm}`,
  `${cfg.agentPhone || ''}`,
  `WI licensed real estate salesperson ${cfg.agentLicense || ''}`.trim()
].filter(l => l !== null && l !== undefined).join('\n');

const recipient = {
  name: fullName,
  address: street,
  city: city,
  province: state,      // thanks.io names the recipient state field `province`
  postal_code: String(zip).slice(0, 10),
  country: 'US'
};

const payload = {
  recipients: [recipient],
  message,
  size: cfg.postcardSize || '4x6',
  front_image_url: cfg.postcardFrontImageUrl,
  // Default TRUE in config. A preview renders the card and returns image urls WITHOUT
  // mailing or charging, so the whole path can be exercised safely. Flipping this to false
  // is the deliberate act that makes this workflow start spending money.
  preview: String(cfg.previewOnly) !== 'false'
};
// Handwriting. thanks.io's differentiator is a handwriting-style render rather than obvious
// bulk print, which lifts the odds the card is opened at all. AJ chose this deliberately,
// including the realism effect. All three are optional: leave a field blank and thanks.io
// applies its own default.
//
// handwriting_style_id is an integer and thanks.io publishes NO list of valid ids and no
// endpoint to fetch them, so the value has to come from their dashboard or from support.
// Left blank it falls back to their default style rather than erroring.
const hwStyle = parseInt(cfg.handwritingStyleId, 10);
if (Number.isFinite(hwStyle) && hwStyle > 0) payload.handwriting_style_id = hwStyle;
if (cfg.handwritingColor && !/PUT_|YOUR_/.test(String(cfg.handwritingColor))) payload.handwriting_color = String(cfg.handwritingColor).trim();
if (String(cfg.handwritingRealism) === 'true') payload.handwriting_realism = true;

// Drives response measurement. docs/research/direct-mail-costs-and-compliance.md §6.5:
// every piece should land on a tracked destination, and the site's /n/[token] offline
// attribution mints anthonystolp_vid and resolves offline context. Without this the
// response rate is guessed rather than measured. Optional: omitted if unset.
if (cfg.qrcodeUrl && !/PUT_|YOUR_/.test(String(cfg.qrcodeUrl))) payload.qrcode_url = cfg.qrcodeUrl;
if (cfg.returnName) {
  payload.return_name = cfg.returnName;
  payload.return_address = cfg.returnAddress;
  payload.return_city = cfg.returnCity;
  payload.return_state = cfg.returnState;
  payload.return_postal_code = cfg.returnPostalCode;
}
if (!payload.front_image_url || /PUT_|YOUR_/.test(String(payload.front_image_url))) {
  return deny('No postcard front image', 'postcardFrontImageUrl is still a placeholder, so nothing was sent. Set the front image in the Mailer Config node.', '#9a6700');
}

return [{ json: { ok: true, leadId: auth.leadId, weekStart: auth.weekStart, weekCount: auth.weekCount, cap: auth.cap, recipientName: fullName, mailTo: `${street}, ${city}, ${state} ${zip}`, preview: payload.preview, payload } }];
