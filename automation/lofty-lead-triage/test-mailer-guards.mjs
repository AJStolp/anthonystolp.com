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
const NO_ADDR = { ...WI_LEAD, streetAddress: '', city: '', zipCode: '', customAttributes: ca({ Status: 'Expired' }) };

const GOOD = { mailSecret: 's3cr3t-long-random', weeklyMailCap: '3', previewOnly: 'true',
  firmNameAsLicensed: 'Epique Realty LLC', licensedState: 'WI', agentName: 'Anthony Stolp',
  agentPhone: '(262) 885-3310', agentLicense: '#114204-94', postcardSize: '4x6',
  postcardFrontImageUrl: 'https://example.com/front.jpg',
  handwritingColor: 'blue', handwritingRealism: 'true', handwritingStyleId: '' };

let sd = {};
const load = (f) => new Function('$', '$now', '$getWorkflowStaticData', '$json', 'console',
  fs.readFileSync(path.join(NODES, f), 'utf8'));
const ctx = (cfg, query, nodes = {}, json = {}, nowMs = Date.parse('2026-08-12T12:00:00Z')) => ({
  $: (n) => ({ first: () => ({ json: { 'Mailer Config': cfg, 'Mail Webhook': { query }, ...nodes }[n] }) }),
  $now: { toISO: () => new Date(nowMs).toISOString() }, $json: json });
const call = (f, c) => load(f)(c.$, c.$now, () => sd, c.$json, { log() {} })[0].json;

const verify = (cfg, query, nowMs) => call('mailer-verify-and-cap.js', ctx(cfg, query, {}, {}, nowMs));
const build = (cfg, auth, lead) => call('mailer-build-postcard.js', ctx(cfg, {}, { 'Verify, Cap & Dedup': auth }, { lead }));
const record = (built, resp) => call('mailer-record-sent.js', ctx(GOOD, {}, { 'Build Postcard': built }, resp));
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
is('placeholder front image blocks', title(build({ ...GOOD, postcardFrontImageUrl: 'PUT_A_PUBLIC_HTTPS_IMAGE_URL_HERE' }, auth, WI_LEAD).html), 'No postcard front image');

const built = build(GOOD, auth, WI_LEAD);
is('good WI lead builds', built.ok, true);
is('preview defaults ON', built.preview, true);
is('recipient uses province not state', 'province' in built.payload.recipients[0], true);
is('message carries licensed firm name', built.payload.message.includes('Epique Realty LLC'), true);
is('message carries license number', built.payload.message.includes('#114204-94'), true);
is('message has no em dashes', /—/.test(built.payload.message), false);
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
