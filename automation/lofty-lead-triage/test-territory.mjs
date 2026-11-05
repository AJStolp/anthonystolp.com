// Tests for AJ's territory: which pond leads reach Claude, and what Claude is told.
//
// Filter & Shape is loaded from nodes/filter-and-shape.js and driven with stubbed n8n
// globals, as test-auto-claim.mjs does. Nothing is called.
//
//   node automation/lofty-lead-triage/test-territory.mjs
//
// County values are spelled the way Lofty sent them on 2026-11-02: mostly upper case, some
// title case, and about 1 in 12 missing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(DIR, 'nodes', 'filter-and-shape.js'), 'utf8');
const load = new Function('$', '$getWorkflowStaticData', '$now', 'console', src);
const quiet = { log() {} };
const now = { hour: 6, toFormat: () => '2026-11-02' };

const COUNTIES = 'Ozaukee,Washington,Sheboygan,Milwaukee,Fond du Lac,Manitowoc,Calumet,Waukesha';
let nextId = 1;
const lead = (county, city) => ({
  leadId: nextId++, assignedUserId: -1, state: 'WI', city, zipCode: '53000', stage: 'New Leads',
  phones: ['4145550100'], emails: [],
  customAttributes: county == null ? [] : [{ attributeName: 'County', attributeType: 'text', value: county }],
});

const run = (cfg, pond) => {
  const nodes = { 'Read Config': [cfg], 'Lofty: Pond New Leads': [{ leads: pond }], 'Lofty: My Pipeline': [{ leads: [] }] };
  const $ = (n) => ({ first: () => ({ json: (nodes[n] || [{}])[0] }) });
  // An empty batch returns no items at all, which is how the run stops before Claude.
  const out = load($, () => ({}), now, quiet);
  return out.length ? out[0].json : { batch: [] };
};
const cities = (out) => out.batch.map(b => b.location.split(',')[0]).sort().join(',');

let pass = 0, fail = 0;
const is = (label, got, want) => { const ok = String(got) === String(want); if (ok) { pass++; } else { fail++; }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${ok ? '' : `got ${got}, wanted ${want}`}`); };

const cfg = { counties: COUNTIES, maxPerRun: 50, model: 'test' };

// Each of the eight counties gets through, whatever its case.
const eight = [
  lead('OZAUKEE', 'Grafton'), lead('Washington', 'West Bend'), lead('SHEBOYGAN', 'Plymouth'),
  lead('MILWAUKEE', 'Milwaukee'), lead('FOND DU LAC', 'Fond du Lac'), lead('Manitowoc', 'Manitowoc'),
  lead('calumet', 'Chilton'), lead('Waukesha County', 'Oconomowoc'),
];
is('all eight counties reach Claude', run(cfg, eight).batch.length, 8);

// The counties the old zip filter let in, and some it never did.
const outside = [
  lead('RACINE', 'Waterford'), lead('Kenosha', 'Kenosha'), lead('WALWORTH', 'Elkhorn'),
  lead('DANE', 'Madison'), lead('DODGE', 'Beaver Dam'), lead('JEFFERSON', 'Watertown'),
];
is('Racine, Kenosha, Walworth and others are dropped', run(cfg, outside).batch.length, 0);

const mixed = run(cfg, [lead('FOND DU LAC', 'Ripon'), lead('RACINE', 'Burlington'), lead(null, 'Hayward')]);
is('no County is dropped', cities(mixed), 'Ripon');

const threw = (f) => { try { f(); return 'ran'; } catch { return 'threw'; } };
is('a blank list stops the run', threw(() => run({ ...cfg, counties: '' }, eight)), 'threw');
is('"Waukesha County" in Config matches', run({ ...cfg, counties: 'Waukesha County' }, eight).batch.length, 1);

// What Claude is told.
const system = run(cfg, eight).anthropicBody.system;
is('prompt names all eight counties', ['Ozaukee', 'Washington', 'Sheboygan', 'Milwaukee', 'Fond du Lac', 'Manitowoc', 'Calumet', 'Waukesha'].every(c => system.includes(c)), true);
is('prompt weights them equally', /all equally/.test(system), true);
is('prompt lists them as the Config gives them', /Fond du Lac, Manitowoc, Calumet and Waukesha\./.test(system), true);
const two = run({ ...cfg, counties: 'Ozaukee,Sheboygan' }, eight).anthropicBody.system;
is('prompt follows a changed list', /these 2 counties, all equally:\nOzaukee and Sheboygan\./.test(two) && !two.includes('Manitowoc'), true);

// The workflow file carries the same territory and code.
const wf = JSON.parse(fs.readFileSync(path.join(DIR, 'lofty-lead-triage-daily.json'), 'utf8'));
const node = (n) => wf.nodes.find(x => x.name === n);
const cfgField = (n) => node('Config').parameters.assignments.assignments.find(a => a.name === n);
is('Config carries the eight counties', cfgField('counties')?.value, COUNTIES);
is('Config no longer has nearZipPrefixes', cfgField('nearZipPrefixes'), undefined);
is('workflow Filter & Shape matches the node file', node('Filter & Shape').parameters.jsCode === src, true);
const parseSrc = fs.readFileSync(path.join(DIR, 'nodes', 'parse-and-sort.js'), 'utf8');
is('workflow Parse & Sort matches the node file', node('Parse & Sort').parameters.jsCode === parseSrc, true);

// 2026-11-02, execution 14346: Claude opened with a paragraph of reasoning, then a fenced
// array, and Parse & Sort threw on the whole run.
const RAW = { 4: { bucket: 'pond', lead_id: '44' }, 5: { bucket: 'pond', lead_id: '55' }, 100000: { bucket: 'pipeline', lead_id: '99' } };
const parse = (text, sd = {}, rawById = RAW) => new Function('$', '$json', '$now', '$getWorkflowStaticData', 'console', parseSrc)(
  (n) => ({ first: () => ({ json: n === 'Filter & Shape' ? { rawById } : {} }) }),
  { content: [{ type: 'text', text }] }, { toFormat: () => '2026-11-02' }, () => sd, quiet).map(i => i.json);
const reply = '[{"ref":4,"name":"Andrew Sullivan","tier":"B","score":61}]';
is('bare array parses', parse(reply).map(p => p.tier).join(), 'B');
is('reasoning before a fenced array parses', parse('I need to check each lead.\n\n```json\n' + reply + '\n```').map(p => p.name).join(), 'Andrew Sullivan');
// anthonystolp T-023: a SKIP never reached Mark Emailed Seen, so it went back to Claude every
// run, and a batch of only SKIPs returned [] and committed nothing.
const onlySkip = {};
is('a batch of only SKIPs still outputs nothing', parse('[{"ref":5,"tier":"SKIP"}]', onlySkip).length, 0);
is('...but the SKIP is marked seen', (onlySkip.seenLeadIds || []).join(), '55');
const mixedSd = { seenLeadIds: ['11'] };
const mixedOut = parse('[{"ref":4,"tier":"B","score":61},{"ref":5,"tier":"skip"},{"ref":100000,"tier":"SKIP"}]', mixedSd);
is('a B beside a SKIP is still output, unseen', mixedOut.map(p => p.lead_id).join() + '|' + mixedSd.seenLeadIds.includes('44'), '44|false');
is('only the pond SKIP joins the seen-set', mixedSd.seenLeadIds.join(), '11,55');
const orphanSd = {};
parse('[{"ref":7,"tier":"SKIP"}]', orphanSd);
is('a SKIP with an unknown ref commits nothing', orphanSd.seenLeadIds, undefined);
const fullSd = { seenLeadIds: Array.from({ length: 3000 }, (_, i) => String(i + 1000)) };
parse('[{"ref":5,"tier":"SKIP"}]', fullSd);
is('the seen-set stays bounded at 3000, newest kept', fullSd.seenLeadIds.length + '|' + fullSd.seenLeadIds.at(-1), '3000|55');
const noSkipSd = {};
parse(reply, noSkipSd);
is('a run with no SKIP leaves the seen-set alone', noSkipSd.seenLeadIds, undefined);
// anthonystolp T-030: a pipeline batch Claude SKIPs entirely reached nothing, so
// pipelineEmailedDate was never set and the same pipeline went back to Claude all day.
const pipeSkipSd = {};
is('an all-SKIP pipeline marks today done', parse('[{"ref":100000,"tier":"SKIP"}]', pipeSkipSd, { 100000: RAW[100000] }).length + '|' + pipeSkipSd.pipelineEmailedDate, '0|2026-11-02');
const pipeShownSd = {};
parse('[{"ref":100000,"tier":"B","score":50}]', pipeShownSd);
is('a pipeline lead that is shown waits for the send', pipeShownSd.pipelineEmailedDate, undefined);
const pondOnlySd = {};
parse('[{"ref":5,"tier":"SKIP"}]', pondOnlySd, { 5: RAW[5] });
is('a pond-only run leaves the pipeline date alone', pondOnlySd.pipelineEmailedDate, undefined);
is('a reply with no array still fails the run', (() => { try { parse('no leads today'); return 'parsed'; } catch { return 'threw'; } })(), 'threw');

// 2026-10-30: two runs claimed 5 and 3 leads, then Send Digest failed on
// "Paired item data for item from node 'Merge Claims' is unavailable". `.item` needs pairing
// that Merge Claims cannot give once more than one claim ran; `.first()` needs none.
const body = node('Send Digest (Resend)').parameters.jsonBody;
is('Send Digest reads Config without item pairing', /\$\(["']Config["']\)\.item/.test(body), false);
is('Send Digest reads Config with .first()', body.includes("$('Config').first().json.digestTo"), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
