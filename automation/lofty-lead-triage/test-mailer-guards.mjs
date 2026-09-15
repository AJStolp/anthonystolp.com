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
  agentPhone: '(262) 483-7932', agentLicense: '#114204-94',
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
// The listing-status guard was removed once copy v3 stopped asserting anything about the
// listing. These assert the removal, so a silent reintroduction shows up as a failure, and
// they sit next to the copy tests that make the removal SAFE ("never mentions the market at
// all", "never says the word listing"). If those ever fail, this guard has to come back.
is('FSBO now mails', build(GOOD, auth, FSBO_LEAD).ok, true);
is('unknown status now mails', build(GOOD, auth, NO_STATUS).ok, true);
is('canceled still mails', build(GOOD, auth, CANCELED_LEAD).ok, true);
is('FSBO letter makes no listing claim', /listing|came off the market/i.test(build(GOOD, auth, FSBO_LEAD).payload.message), false);

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
// The license NUMBER was deliberately dropped for warmth: 452.136(2) requires the FIRM name
// clearly and conspicuously, not the individual licensee's number. The firm name is the part
// that is legally load-bearing, so that is what is asserted.
is('message carries the licensed firm name', built.payload.message.includes('Epique Realty LLC'), true);
is('license number no longer present', built.payload.message.includes('#114204-94'), false);
is('message has no em dashes', /—/.test(built.payload.message), false);

// --- the approval gate --------------------------------------------------------------------
// AJ wants eyes on every letter before it mails, until the pipeline is proven. Three inputs
// decide whether money moves and ALL must say send: previewOnly off, and either approval off
// or the reader confirmed.
const ARMED = { ...GOOD, previewOnly: 'false' };          // dry-run switch OFF, can spend
const authC = (q) => verify(ARMED, { lead_id: '111', t: GOOD.mailSecret, ...q });

is('decline commits nothing and says so', title(verify(ARMED, { lead_id: '111', t: GOOD.mailSecret, decline: '1' }).html), 'Left alone');
// ok:false is what routes it down the IF Authorized false branch straight to Respond,
// skipping Lofty, thanks.io and every commit.
is('decline short-circuits to the response', verify(ARMED, { lead_id: '111', t: GOOD.mailSecret, decline: '1' }).ok, false);
is('confirm flag reaches the auth', authC({ confirm: '1' }).confirmed, true);
is('no confirm flag means unconfirmed', authC({}).confirmed, false);

const unconfirmed = build(ARMED, authC({}), WI_LEAD);
is('first tap is a preview, not a send', unconfirmed.payload.preview, true);
is('first tap is flagged as awaiting approval', unconfirmed.awaitingApproval, true);

const confirmed = build(ARMED, authC({ confirm: '1' }), WI_LEAD);
is('confirmed tap really sends', confirmed.payload.preview, false);
is('confirmed tap is not awaiting approval', confirmed.awaitingApproval, false);

// Turning the gate off restores the pre-approval behaviour: one tap mails.
const noGate = build({ ...ARMED, requireApproval: 'false' }, authC({}), WI_LEAD);
is('gate off means one tap mails', noGate.payload.preview, false);

// previewOnly overrides everything. Confirming while in dry-run must NOT send.
const dryRunConfirmed = build(GOOD, authC({ confirm: '1' }), WI_LEAD);
is('previewOnly overrides a confirm', dryRunConfirmed.payload.preview, true);
is('dry run is not an approval prompt', dryRunConfirmed.awaitingApproval, false);

// The approval page must offer the next step and must commit nothing.
const PREVIEW_RESP = { data: { previews: ['https://example.com/p1.png'] } };
sd = {};
const approvalPage = call('mailer-record-sent.js',
  ctx(ARMED, { lead_id: '111', t: GOOD.mailSecret }, { 'Build Letter': unconfirmed }, PREVIEW_RESP));
is('approval page shown', title(approvalPage.html), 'Ready to mail. Have a look first.');
is('approval page renders the letter', approvalPage.html.includes('https://example.com/p1.png'), true);
is('approval page offers Mail it', approvalPage.html.includes('&confirm=1'), true);
is('approval page offers a decline', approvalPage.html.includes('&decline=1'), true);
is('approval link is relative, no host', /href="\?lead_id=/.test(approvalPage.html), true);
is('approval commits no send', sd.mailedLeadIds, undefined);
is('approval commits no count', sd.mailWeekCount, undefined);

// --- per-lead slots. v4 uses two: the first name and the city. -----------------------------
const lead = (o) => ({ ...WI_LEAD, customAttributes: ca({ 'Owner City': o.city || 'Milwaukee',
  'Owner Zip': '53210', 'Owner State': 'WI', Status: 'Expired', 'Owner Street Address': o.street,
  'Owner Occupied': o.occ === undefined ? 'Y' : o.occ,
  ...(o.beds ? { Bedrooms: String(o.beds) } : {}), ...(o.type ? { 'Property Type': o.type } : {}),
  ...(o.price ? { Price: String(o.price) } : {}) }) });
const msg = (o) => build(GOOD, auth, lead(o)).payload.message;

is('city comes off the record', msg({ street: '1633 Spruce St', city: 'Grafton' }).includes('I work the Grafton area'), true);
is('city varies per lead', msg({ street: '149 Hickory Dr', city: 'Delafield' }).includes('I work the Delafield area'), true);

// The street slot was removed in v4. It only ever fired for owner-occupied records, because
// Owner Street Address is the OWNER's mailing address and for an absentee owner that is not
// the house that expired. v4 names no street, so the hazard cannot recur.
is('never names a street', /Spruce St|Hickory Dr|N 58th St/.test(msg({ street: '1633 Spruce St' })), false);
is('absentee owner is no longer a hazard', msg({ street: '2855 N 58th St', occ: 'N' }).includes('N 58th St'), false);

// --- v4, AJ's own copy. These assert what it must and must not say. -------------------------
const M = msg({ street: '6209 N Berkeley Blvd', city: 'Whitefish Bay', price: 1095000 });
is('never narrates the failure back', /without selling/i.test(M), false);
is('never recites their list price', /\$[0-9]/.test(M), false);
is('never says the word listing', /listing/i.test(M), false);
is('never negates an unmade ask', /I am not writing/i.test(M), false);
is('never mentions the market coming off', /came off the market/i.test(M), false);
is('introduces himself', M.includes("thought I'd introduce myself the old-fashioned way"), true);
// The data is not the product, the interpretation is. This is the line that distinguishes him
// from Zillow and it is the whole reason v4 beats v3.
is('sells interpretation, not data', M.includes("What's harder is figuring out what those numbers actually mean"), true);
is('names the real market forces', M.includes('rates, inventory'), true);
is('invites a text, not just a call', M.includes('just text or call me'), true);
is('uses the mobile number', M.includes('(262) 483-7932'), true);
is('firm name on its own line', M.includes('\nExsell Experts | Epique Realty\n') || M.includes('Epique Realty LLC'), true);
is('city not repeated in both sentences', (msg({ street: '2855 N 58th St', occ: 'N' }).match(/Milwaukee/g) || []).length, 1);
is('no time claim is made', /this year|last year|recently|earlier/i.test(M.split('whether you ever sell')[0]), false);
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
