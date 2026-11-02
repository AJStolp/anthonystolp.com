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
is('no County goes to Claude to judge', cities(mixed), 'Hayward,Ripon');

is('a blank list keeps every county', run({ ...cfg, counties: '' }, outside).batch.length, 6);

// What Claude is told.
const system = run(cfg, eight).anthropicBody.system;
is('prompt names all eight counties', ['Ozaukee', 'Washington', 'Sheboygan', 'Milwaukee', 'Fond du Lac', 'Manitowoc', 'Calumet', 'Waukesha'].every(c => system.includes(c)), true);
is('prompt weights them equally', /all equally/.test(system), true);
is('prompt skips outside the eight', /outside the eight counties/.test(system), true);

// The workflow file carries the same territory and code.
const wf = JSON.parse(fs.readFileSync(path.join(DIR, 'lofty-lead-triage-daily.json'), 'utf8'));
const node = (n) => wf.nodes.find(x => x.name === n);
const cfgField = (n) => node('Config').parameters.assignments.assignments.find(a => a.name === n);
is('Config carries the eight counties', cfgField('counties')?.value, COUNTIES);
is('Config no longer has nearZipPrefixes', cfgField('nearZipPrefixes'), undefined);
is('workflow Filter & Shape matches the node file', node('Filter & Shape').parameters.jsCode === src, true);

// 2026-10-30: two runs claimed 5 and 3 leads, then Send Digest failed on
// "Paired item data for item from node 'Merge Claims' is unavailable". `.item` needs pairing
// that Merge Claims cannot give once more than one claim ran; `.first()` needs none.
is('Send Digest reads Config without item pairing', /\$\('Config'\)\.item/.test(node('Send Digest (Resend)').parameters.jsonBody), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
