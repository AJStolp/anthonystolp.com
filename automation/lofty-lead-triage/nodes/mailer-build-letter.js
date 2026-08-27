// Build the thanks.io windowless-letter payload from the freshly fetched Lofty lead.
//
// The address is re-read from Lofty rather than passed through the URL: a link in an email
// is user-editable, and this step spends money and puts a licensed real estate advertisement
// in someone's mailbox. Never trust the query string for anything but the lead id.
//
// Contract (verified against docs.thanks.io, not from memory):
//   POST https://api.thanks.io/api/v2/send/windowlessletter   Authorization: Bearer <token>
//   recipients[]: { name, address, address2, city, province, postal_code, country }
//   plus: message. There is no `size` field on a letter, and artwork is OPTIONAL: thanks.io
//   documents that "if neither image_template_id nor front_image_url is specified, a blank
//   background will be used". That is why this is a letter and not the notecard the spec
//   originally called for. A notecard REQUIRES front_image_url or image_template_id, and AJ
//   does not want a front image at all. $2.56 a piece, real stamp and handwritten envelope.
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
    'firmNameAsLicensed is still a placeholder. Wisconsin requires the firm name exactly as printed on the license on every piece of advertising, so nothing was sent. See issue #40.',
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

// The copy below states, as fact, that the home came off the market without selling. That is
// true of an Expired or Canceled record and FALSE of an FSBO, which is still actively for sale
// by its owner. The live pond carries both: of 11 New Leads on 2026-08-27, 8 were Expired and
// 2 were FSBO. Mailing an FSBO this letter puts a false statement on a piece carrying AJ's
// license, so refuse rather than send. Lifting this means writing FSBO copy, not widening the
// list of allowed statuses.
const LETTER_STATUSES = new Set(['expired', 'canceled', 'cancelled', 'withdrawn']);
const listingStatus = attr('Status');
if (!LETTER_STATUSES.has(String(listingStatus || '').toLowerCase())) {
  return deny('Wrong listing status for this letter',
    `This letter says the home came off the market without selling, and this record is ${esc(listingStatus || 'of unknown status')}. That would be a false statement on a piece carrying your license, so nothing was sent. Expired, canceled and withdrawn records only until there is FSBO copy.`,
    '#9a6700');
}

// Lofty stores some names exactly as the source feed had them, which includes ALL CAPS
// ("SEAN JOCHIMS" in the 2026-08-27 pond). A handwritten letter that opens "Hi SEAN," shouts
// at the reader and is worse than no personalisation at all. Normalise only when the token is
// entirely one case, so McDonald, DeAngelo and O'Brien survive untouched.
const properCase = (w) => {
  const t = String(w || '').trim();
  if (!t) return t;
  // Already mixed case means a human wrote it that way: McDonald, DeAngelo, van Dyke. Leave it.
  if (t !== t.toUpperCase() && t !== t.toLowerCase()) return t;
  return t.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (m, p, c) => p + c.toUpperCase());
};
const first = properCase((lead.firstName || (attr('Owner Name 1') || '').split(' ')[0] || '').trim());
const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || attr('Owner Name 1') || 'Homeowner';
const greeting = first ? `Hi ${first},` : 'Hello,';

// Fixed, reviewed copy. Deliberately NOT model-generated: 452.136 bars advertising a
// property the firm holds no listing on, and these listings have expired so nobody holds
// them. The letter solicits nothing and never describes the house as being for sale.
//
// Positioning is researched, not improvised. See docs/research/expired-listing-messaging.md.
// The short version: an expired seller may hear from five agents the same morning and has
// heard the standard opener "fifty times", so any piece that asks for the listing is
// indistinguishable from the pile. NAR puts honesty and trustworthiness as the second most
// cited reason sellers choose an agent, so the differentiator is refusing the ask and
// offering the honest read instead. The "not writing to ask for the listing" line is the
// whole strategy and must stay in the second sentence, before they stop reading.
//
// The letter OFFERS the diagnosis, it never contains it. Telling someone in writing that their
// home was overpriced, unsolicited, reads as an insult rather than help.
// House style: no em dashes, educate rather than advise, never give legal or tax advice.
// Signature lines stay tight (single newlines); prose paragraphs are separated by BLANK
// lines. Verified against a real thanks.io preview render: joining everything with single
// newlines produced one dense unreadable block. The handwriting engine honours \n\n as a
// paragraph break, and the difference in legibility is large.
const signature = [
  `${cfg.agentName || 'Anthony Stolp'}, ${firm}`,
  `${cfg.agentPhone || ''}`,
  `WI licensed real estate salesperson ${cfg.agentLicense || ''}`.trim()
].filter(Boolean).join('\n');

// --- per-lead detail, built from DETERMINISTIC SLOTS, never from a model -------------------
// AJ asked that the letter be drafted off each lead's own information. It is, from the record
// only. Not from a model: 452.136 bars advertising a property the firm holds no listing on,
// and a reviewed skeleton cannot drift across that line while generated copy can. Every slot
// below is a public fact already on the Lofty record, and every one degrades to a shorter true
// sentence when its datum is missing. Nothing is inferred, and nothing is said that the record
// does not carry.
//
// Two slots only. The point is to prove someone actually looked, and a letter that recites six
// fields reads like a file being read aloud, which is the opposite of the effect wanted.

// "2855 N 58th St" -> "N 58th St". Wisconsin's grid addresses ("W2830 County Road D",
// "N88W6327 Willowbrooke Dr") put digits inside the leading token, so the rule is "drop the
// first token if it contains a digit" rather than "drop leading digits". Unit suffixes are
// dropped too: nobody writes "your condo on Chateau Ct Apt 203d".
const streetName = (raw) => {
  let t = String(raw || '').trim().split(/\s+/);
  if (t.length > 1 && /\d/.test(t[0])) t = t.slice(1);
  const unit = t.findIndex(w => /^(apt|unit|ste|suite|#|lot)$/i.test(w) || /^#/.test(w));
  if (unit > 0) t = t.slice(0, unit);
  const out = t.join(' ').trim();
  return out && /[a-z]/i.test(out) ? out : null;
};

// What to call the place. Falls all the way back to "home", which is true of anything.
const beds = parseInt(attr('Bedrooms'), 10);
const ptype = String(attr('Property Type') || '').toLowerCase();
const descriptor =
  ptype.includes('condo') ? 'condo'
  : ptype.includes('multi') ? 'multi-family'
  : (ptype.includes('other') && !(beds > 0)) ? 'lot'
  : (beds > 0) ? `${beds} bedroom`
  : 'home';

const streetLabel = streetName(street);
const subject = streetLabel ? `${descriptor} on ${streetLabel}` : `${city} ${descriptor}`;

// List price, formatted plainly. Public, already advertised by the previous office, and the
// single fact that most shows the letter is not a mail merge. Omitted entirely if absent.
const priceNum = Number(String(attr('Price') || '').replace(/[^0-9.]/g, ''));
const listedAt = Number.isFinite(priceNum) && priceNum > 0
  ? '$' + Math.round(priceNum).toLocaleString('en-US')
  : null;

const looked = listedAt
  ? `I looked at what it was priced against at ${listedAt} and what actually sold nearby. Say the word and I will send that. No charge, whether you list again this year, next year or never.`
  : `I looked at what it was priced against and what actually sold near it. Say the word and I will send that. No charge, whether you list again this year, next year or never.`;

const message = [
  greeting,
  `Your ${subject} came off the market without selling. I am not writing to ask for the listing.`,
  looked,
  `Or tell me what you were trying to do. I would rather hear that.`,
  signature
].join('\n\n');

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

// font_size is 'auto' | 'small' | 'medium' | 'large' and is only honoured on AI-type fonts
// (style ids 101+). Verified on a live preview: 'auto' sizes this message large enough that
// it crowds the edges, while 'small' fits with clean margins on all four sides.
if (['auto', 'small', 'medium', 'large'].includes(String(cfg.fontSize))) payload.font_size = String(cfg.fontSize);

// handwriting_realism does NOT just add texture. It fabricates human imperfections, and on a
// live render it produced a struck-through word ("came off off the market") to simulate the
// writer correcting themselves. On a letter whose whole premise is being straight with the
// reader, a manufactured mistake is the wrong kind of authenticity, and it reads as sloppiness
// rather than warmth. Off by default; still togglable. Only applies to AI fonts either way.
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
// Artwork is optional on a letter and AJ deliberately wants none: a blank background reads
// as correspondence rather than advertising, which is the entire premise of this piece.
// Left unset, thanks.io supplies the blank background itself. Set frontImageUrl only if that
// decision is reversed; it is never a blocker.
if (cfg.frontImageUrl && !/PUT_|YOUR_/.test(String(cfg.frontImageUrl))) payload.front_image_url = String(cfg.frontImageUrl).trim();

return [{ json: { ok: true, leadId: auth.leadId, weekStart: auth.weekStart, weekCount: auth.weekCount, cap: auth.cap, recipientName: fullName, mailTo: `${street}, ${city}, ${state} ${zip}`, preview: payload.preview, payload } }];
