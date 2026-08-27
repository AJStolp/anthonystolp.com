// Guard tests for the lofty-mailer-webhook node bodies.
//
// This workflow spends real money and puts a licensed real estate advertisement in a
// stranger's mailbox, so every refusal path is covered here. thanks.io is never called:
// the node bodies are loaded from nodes/*.js and driven with stubbed n8n globals.
//
//   node automation/lofty-lead-triage/test-mailer-guards.mjs
//
// Fixtures are inline and minimal on purpose, so this runs with no network and no scratch
// files. Shapes are copied from real Lofty GET /v1.0/leads/{id} responses.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NODES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'nodes');

const ca = (o) => Object.entries(o).map(([attributeName, value]) => ({ attributeName, attributeType: 'text', value }));
const WI_LEAD = {
  leadId: 1148505260225236, firstName: 'Dustin', lastName: 'Barilani',
  state: 'WI', city: 'Osseo', zipCode: '54758', streetAddress: 'W15081 County Road Ee',
  customAttributes: ca({ 'Owner Street Address': 'W15081 County Road Ee', 'Owner City': 'Osseo',
    'Owner Zip': '54758', 'Owner State': 'WI', 'Owner Name 1': 'Dustin Barilani', Status: 'Expired' }),
};
const IA_LEAD = { ...WI_LEAD, leadId: 1148505260350217, state: 'IA', city: 'De Witt',
  customAttributes: ca({ 'Owner Street Address': '2828 274th St', 'Owner City': 'De Witt',
    'Owner Zip': '52742', 'Owner State': 'IA', Status: 'Expired' }) };
const FSBO_LEAD = { ...WI_LEAD, customAttributes: ca({ 'Owner Street Address': '3246 S 86th St',
  'Owner City': 'Milwaukee', 'Owner Zip': '53227', 'Owner State': 'WI', Status: 'FSBO' }) };
const CANCELED_LEAD = { ...WI_LEAD, customAttributes: ca({ 'Owner Street Address': '166 N 91st Pl',
  'Owner City': 'Milwaukee', 'Owner Zip': '53226', 'Owner State': 'WI', Status: 'Canceled' }) };
const NO_STATUS = { ...WI_LEAD, customAttributes: ca({ 'Owner Street Address': '166 N 91st Pl',
  'Owner City': 'Milwaukee', 'Owner Zip': '53226', 'Owner State': 'WI' }) };
const NO_ADDR = { ...WI_LEAD, streetAddress: '', city: '', zipCode: '', customAttributes: ca({ Status: 'Expired' }) };

const GOOD = { mailSecret: 's3cr3t-long-random', weeklyMailCap: '3', previewOnly: 'true',
  firmNameAsLicensed: 'Epique Realty LLC', licensedState: 'WI', agentName: 'Anthony Stolp',
  agentPhone: '(262) 885-3310', agentLicense: '#114204-94',
  returnName: 'Anthony Stolp', returnAddress: 'N88W6327 Willowbrooke Dr',
  returnCity: 'Cedarburg', returnState: 'WI', returnPostalCode: '53012',
  handwritingColor: 'blue', handwritingRealism: 'true', handwritingStyleId: '' };

let sd = {};
const load = (f) => new Function('$', '$now', '$getWorkflowStaticData', '$json', 'console',
  fs.readFileSync(path.join(NODES, f), 'utf8'));
const ctx = (cfg, query, nodes = {}, json = {}, nowMs = Date.parse('2026-08-12T12:00:00Z')) => ({
  $: (n) => ({ first: () => ({ json: { 'Mailer Config': cfg, 'Mail Webhook': { query }, ...nodes }[n] }) }),
  $now: { toISO: () => new Date(nowMs).toISOString() }, $json: json });
const call = (f, c) => load(f)(c.$, c.$now, () => sd, c.$json, { log() {} })[0].json;

const verify = (cfg, query, nowMs) => call('mailer-verify-and-cap.js', ctx(cfg, query, {}, {}, nowMs));
const build = (cfg, auth, lead) => call('mailer-build-letter.js', ctx(cfg, {}, { 'Verify, Cap & Dedup': auth }, { lead }));
const record = (built, resp) => call('mailer-record-sent.js', ctx(GOOD, {}, { 'Build Letter': built }, resp));
const title = (h) => (String(h).match(/<h1[^>]*>([^<]*)</) || [])[1] || '(none)';

let pass = 0, fail = 0;
const is = (label, got, want) => { const ok = String(got) === String(want); ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(44)} ${ok ? '' : `got ${got}, wanted ${want}`}`); };

is('placeholder secret refuses', title(verify({ ...GOOD, mailSecret: 'PUT_A_LONG_RANDOM_SECRET_HERE' }, { lead_id: '1', t: 'x' }).html), 'Not configured');
is('wrong token refuses', title(verify(GOOD, { lead_id: '1', t: 'nope' }).html), 'Not authorized');
is('missing lead id refuses', title(verify(GOOD, { t: GOOD.mailSecret }).html), 'Bad request');
is('non-numeric lead id refuses', title(verify(GOOD, { lead_id: '../etc', t: GOOD.mailSecret }).html), 'Bad request');

const auth = verify(GOOD, { lead_id: '111', t: GOOD.mailSecret });
is('valid token authorizes', auth.ok, true);
is('unconfirmed firm name blocks', title(build({ ...GOOD, firmNameAsLicensed: 'PUT_FIRM_NAME_EXACTLY_AS_ON_LICENSE_CONFIRM_ISSUE_40' }, auth, WI_LEAD).html), 'Firm name not confirmed');
is('out-of-state lead blocks', title(build(GOOD, auth, IA_LEAD).html), 'Outside your licensed state');
is('lead with no address blocks', title(build(GOOD, auth, NO_ADDR).html), 'No mailing address');
// The letter asserts the home came off the market without selling. That is false of an FSBO,
// which is still actively for sale, and 2 of the 11 live pond leads on 2026-08-27 were FSBO.
is('FSBO blocks, copy would be false', title(build(GOOD, auth, FSBO_LEAD).html), 'Wrong listing status for this letter');
is('unknown status blocks', title(build(GOOD, auth, NO_STATUS).html), 'Wrong listing status for this letter');
is('canceled is allowed', build(GOOD, auth, CANCELED_LEAD).ok, true);

const built = build(GOOD, auth, WI_LEAD);
is('good WI lead builds', built.ok, true);
// A letter has no size field and needs no artwork. thanks.io supplies a blank background,
// which is the whole reason this is a letter rather than the notecard the spec first named:
// a notecard REQUIRES front_image_url or image_template_id and AJ wants no front image.
is('no size field on a letter', 'size' in built.payload, false);
is('no front image by default', 'front_image_url' in built.payload, false);
is('front image included when set', 'front_image_url' in build({ ...GOOD, frontImageUrl: 'https://example.com/f.jpg' }, auth, WI_LEAD).payload, true);
is('placeholder front image omitted', 'front_image_url' in build({ ...GOOD, frontImageUrl: 'PUT_A_PUBLIC_HTTPS_IMAGE_URL_HERE' }, auth, WI_LEAD).payload, false);
is('return address on the envelope', built.payload.return_postal_code, '53012');
is('return uses return_state not province', built.payload.return_state, 'WI');
is('preview defaults ON', built.preview, true);
is('recipient uses province not state', 'province' in built.payload.recipients[0], true);
is('message carries licensed firm name', built.payload.message.includes('Epique Realty LLC'), true);
is('message carries license number', built.payload.message.includes('#114204-94'), true);
is('message has no em dashes', /—/.test(built.payload.message), false);

// --- per-lead slots. Every address below is a real one from the 2026-08-27 pond. ------------
const lead = (o) => ({ ...WI_LEAD, customAttributes: ca({ 'Owner City': o.city || 'Milwaukee',
  'Owner Zip': '53210', 'Owner State': 'WI', Status: 'Expired', 'Owner Street Address': o.street,
  ...(o.beds ? { Bedrooms: String(o.beds) } : {}), ...(o.type ? { 'Property Type': o.type } : {}),
  ...(o.price ? { Price: String(o.price) } : {}) }) });
const msg = (o) => build(GOOD, auth, lead(o)).payload.message;

is('street number dropped', msg({ street: '1633 Spruce St', beds: 4 }).includes('4 bedroom on Spruce St'), true);
is('WI grid address handled', msg({ street: 'W2830 County Road D', type: 'Other' }).includes('lot on County Road D'), true);
is('WI alphanumeric grid handled', msg({ street: 'N88W6327 Willowbrooke Dr', beds: 3 }).includes('3 bedroom on Willowbrooke Dr'), true);
is('apt suffix dropped', msg({ street: '2076 Chateau Ct Apt 203d', type: 'Condominium' }).includes('condo on Chateau Ct'), true);
is('directional kept', msg({ street: '6209 N Berkeley Blvd', beds: 4 }).includes('4 bedroom on N Berkeley Blvd'), true);
is('multi-family named', msg({ street: '2855 N 58th St', type: 'Multi-Family' }).includes('multi-family on N 58th St'), true);
is('no beds no type falls back to home', msg({ street: '149 Hickory Dr' }).includes('home on Hickory Dr'), true);
is('unparseable street falls back to city', msg({ street: '12345', city: 'Delafield', beds: 2 }).includes('Delafield 2 bedroom'), true);
is('list price appears', msg({ street: '1633 Spruce St', beds: 4, price: 449900 }).includes('priced against at $449,900'), true);
is('no price, sentence still true', msg({ street: '1633 Spruce St', beds: 4 }).includes('what it was priced against and what actually sold'), true);
// Lofty carries source-feed casing. "SEAN JOCHIMS" was live in the pond on 2026-08-27, and
// "Hi SEAN," on a handwritten letter is worse than no greeting at all.
const named = (f, o) => build(GOOD, auth, { ...lead(o || { street: '1633 Spruce St', beds: 4 }), firstName: f }).payload.message;
is('all-caps name normalised', named('SEAN').startsWith('Hi Sean,'), true);
is('lowercase name normalised', named('robert').startsWith('Hi Robert,'), true);
is('mixed case left alone', named('McDonald').startsWith('Hi McDonald,'), true);
is('hyphenated caps normalised', named('JEAN-LUC').startsWith('Hi Jean-Luc,'), true);
is('apostrophe caps normalised', named("O'BRIEN").startsWith("Hi O'Brien,"), true);
is('still refuses the listing in sentence two', msg({ street: '1633 Spruce St', beds: 4 }).includes('I am not writing to ask for the listing'), true);
is('message does not advertise the property', /for sale|listed at|asking/i.test(built.payload.message), false);

// Handwriting: opt-in, and blank fields must fall through to thanks.io's own defaults rather
// than sending an empty or NaN value, since there is no published list of valid style ids.
is('handwriting realism on when enabled', built.payload.handwriting_realism, true);
is('handwriting color passed through', built.payload.handwriting_color, 'blue');
const noStyle = build({ ...GOOD, handwritingStyleId: '' }, auth, WI_LEAD);
is('blank style id omitted entirely', 'handwriting_style_id' in noStyle.payload, false);
const withStyle = build({ ...GOOD, handwritingStyleId: '4' }, auth, WI_LEAD);
is('style id coerced to integer', withStyle.payload.handwriting_style_id, 4);
const hwOff = build({ ...GOOD, handwritingRealism: 'false' }, auth, WI_LEAD);
is('realism omitted when disabled', 'handwriting_realism' in hwOff.payload, false);

sd = {}; record(built, { data: { previews: ['https://x/p.png'] } });
is('preview commits no send', (sd.mailedLeadIds || []).length, 0);
is('preview commits no count', sd.mailWeekCount || 0, 0);

sd = {}; const live = { ...built, preview: false };
is('vendor error renders', title(record(live, { message: 'Insufficient credits' }).html), 'Not sent');
is('vendor error commits nothing', (sd.mailedLeadIds || []).length, 0);

sd = {};
for (let i = 1; i <= 3; i++) {
  const a = verify(GOOD, { lead_id: String(1000 + i), t: GOOD.mailSecret });
  record({ ...build(GOOD, a, WI_LEAD), leadId: a.leadId, preview: false }, { id: 900 + i });
}
is('three sends counted', sd.mailWeekCount, 3);
is('three leads marked mailed', sd.mailedLeadIds.length, 3);
is('repeat tap blocked', title(verify(GOOD, { lead_id: '1001', t: GOOD.mailSecret }).html), 'Already mailed');
is('cap blocks next lead', title(verify(GOOD, { lead_id: '9999', t: GOOD.mailSecret }).html), 'Weekly cap reached');
is('cap denial commits nothing', sd.mailWeekCount, 3);

const rolled = verify(GOOD, { lead_id: '9999', t: GOOD.mailSecret }, Date.parse('2026-08-20T12:00:00Z'));
is('new week authorizes again', rolled.ok, true);
is('rolled counter resets', rolled.weekCount, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
