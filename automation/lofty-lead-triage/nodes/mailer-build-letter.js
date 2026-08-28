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

// LISTING-STATUS GUARD REMOVED 2026-08-28, deliberately, with AJ's approval. It existed
// because copy v1 and v2 stated as fact that the home came off the market without selling.
// That is true of an Expired or Canceled record and FALSE of an FSBO, which is still actively
// for sale, so mailing an FSBO would have put a false statement on a piece carrying AJ's
// license. Of 11 New Leads on 2026-08-27, 8 were Expired and 2 were FSBO.
//
// Copy v3 asserts NOTHING about the listing. It is an introduction, an offer of the monthly
// numbers, and an open door, all of which are equally true of an expired seller, an FSBO, and
// a homeowner who never listed at all. The guard therefore no longer prevents anything.
//
// THE PRECONDITION IS ENFORCED BY TEST, NOT BY COMMENT. `test-mailer-guards.mjs` asserts the
// message never mentions the market and never says "listing". If a future edit reintroduces a
// status-dependent claim, those tests fail, and THAT is the signal to put this guard back.
// Do not reintroduce such a claim without also reinstating the guard.

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

// --- per-lead detail, built from DETERMINISTIC SLOTS, never from a model -------------------
// AJ asked that the letter be drafted off each lead's own information. It is, from the record
// only. Not from a model: 452.136 bars advertising a property the firm holds no listing on,
// and a reviewed skeleton cannot drift across that line while generated copy can. Every slot
// below is a public fact already on the Lofty record, and every one degrades to a shorter true
// sentence when its datum is missing.
//
// The LIST PRICE slot was removed in the 2026-08-28 rewrite. Reciting a reader's own asking
// price back to them proved someone had looked, at the cost of reading like a pulled report.

// "2855 N 58th St" -> "N 58th St". Wisconsin's grid addresses ("W2830 County Road D",
// "N88W6327 Willowbrooke Dr") put digits inside the leading token, so the rule is "drop the
// first token if it contains a digit" rather than "drop leading digits". Unit suffixes are
// dropped too: nobody writes "your place on Chateau Ct Apt 203d".
const streetName = (raw) => {
  let t = String(raw || '').trim().split(/\s+/);
  if (t.length > 1 && /\d/.test(t[0])) t = t.slice(1);
  const unit = t.findIndex(w => /^(apt|unit|ste|suite|#|lot)$/i.test(w) || /^#/.test(w));
  if (unit > 0) t = t.slice(0, unit);
  const out = t.join(' ').trim();
  return out && /[a-z]/i.test(out) ? out : null;
};

// Only name the street when the owner actually LIVES at the property. `Owner Street Address`
// is the owner's mailing address, which for an absentee owner is not the house that expired.
// Live example from the 2026-08-27 pond: Robert Tally is Owner Occupied "N", mails to 2855 N
// 58th St, and the expired listing's own remarks describe 3022 N 6th St. Naming the mailing
// street would have told him his place on the wrong street came off the market. Absentee
// owners get the city, which is true either way.
const ownerOccupied = String(attr('Owner Occupied') || '').toUpperCase() === 'Y';
const streetLabel = ownerOccupied ? streetName(street) : null;

// Fixed, reviewed copy. Deliberately NOT model-generated: 452.136 bars advertising a
// property the firm holds no listing on, and these listings have expired so nobody holds
// them. The letter solicits nothing and never describes the house as being for sale.
//
// REWRITTEN AGAIN 2026-08-28. Two prior versions are recorded here because both failed the
// same way and the failure is easy to reintroduce:
//
//   v1  "Your home came off the market WITHOUT SELLING. I am not writing to ask for the
//       listing." Narrated the reader's failure to them, then negated an ask they had not
//       made. Also recited their own asking price back at them.
//   v2  Softened to "came off the market. I am not writing about that." Same disease. A
//       negation cannot un-plant a word, and opening by refusing something the reader never
//       raised is a strange way to introduce yourself.
//
// v3 drops the frame entirely. It does not mention the expired listing at all, because there
// is no way to raise it that does not read as "I pulled a report on you". What is left is an
// INTRODUCTION from someone who works the area, an offer of the monthly numbers, and an open
// door. AJ's brief: it should read like meeting a neighbour, and like help is available if
// wanted.
//
// The offer is REAL and not a pretext. The site already runs a monthly market report per zip
// (Redfin-derived stats, Claude-drafted, two-pass validated, delivered by Resend, see
// /api/cron/market-reports). "Say the word" describes a thing that exists, which is the whole
// difference between a resource offer and a lead magnet.
//
// House style: no em dashes, educate rather than advise, never give legal or tax advice.
// Signature lines stay tight (single newlines); prose paragraphs are separated by BLANK
// lines. Verified against a real thanks.io preview render: joining everything with single
// newlines produced one dense unreadable block. The handwriting engine honours \n\n as a
// paragraph break, and the difference in legibility is large.
//
// The license number line was dropped for warmth. 452.136(2) requires advertising to carry
// the FIRM name clearly and conspicuously; it does not require the individual licensee's
// number. The firm name stays and is non-negotiable. Put the number back by adding it to the
// signature array if AJ prefers it.
const signature = [
  `${cfg.agentName || 'Anthony Stolp'}, ${firm}`,
  `${cfg.agentPhone || ''}`
].filter(Boolean).join('\n');

// Where he works, at the most neighbourly scale the record supports. Owner-occupied records
// get "your part of Whitefish Bay, around N Berkeley Blvd"; absentee owners get the city
// alone, because their mailing street is not the neighbourhood in question.
const patch = streetLabel
  ? `your part of ${city}, around ${streetLabel},`
  : `the ${city} area,`;

const message = [
  greeting,
  `I am ${(cfg.agentName || 'Anthony Stolp').split(' ')[0]}. I work ${patch} and I wanted to introduce myself.`,
  `Every month I put together what actually sold nearby, what it closed at and how long it took. If you would like a copy, just say the word. It is free, and it keeps coming whether you ever sell or not.`,
  `And if you ever want help with anything on the house, I am here for that too. Whenever that is, or never. No pressure either way.`,
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
// (style ids 101+). 'small' was chosen when this was a 4x6 POSTCARD, where 'auto' crowded the
// edges. That reasoning does not survive the move to a letter: an 8.5x11 page is roughly eight
// times the area, and 'small' on it would look lost. Re-verified 2026-08-27 on a real
// thanks.io render of the actual copy at 'auto': the message fills the top two thirds of the
// page with clean margins on all four sides and no collision with either fold line.
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
