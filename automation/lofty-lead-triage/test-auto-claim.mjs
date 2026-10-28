// Tests for auto claim: which leads get claimed, how Lofty's answers are read, and what the
// digest then says.
//
// Lofty is never called: the node bodies are loaded from nodes/*.js and driven with stubbed
// n8n globals, the same way test-mailer-guards.mjs does it.
//
//   node automation/lofty-lead-triage/test-auto-claim.mjs
//
// The claim responses are the real ones seen on 2026-10-28: {leadId} when a claim lands,
// {"message":"no authority"} when another agent already took the lead.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NODES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'nodes');
const load = (f) => new Function('$', '$input', '$now', 'console', fs.readFileSync(path.join(NODES, f), 'utf8'));
const quiet = { log() {} };
const now = { toFormat: () => '2026-10-28' };
const items = (arr) => arr.map(json => ({ json }));
// `$` stub: node name -> array of json items; isExecuted is true for any node present.
const dollar = (nodes) => (n) => ({
  first: () => ({ json: (nodes[n] || [{}])[0] }),
  all: () => items(nodes[n] || []),
  isExecuted: n in nodes,
});

const CFG = { claimAssignee: 'aj@example.com' };
const lead = (id, bucket, tier, extra = {}) => ({ lead_id: id, bucket, tier, score: 80, name: `Lead ${id}`, date: '2026-10-28', ...extra });
const SCORED = [
  lead('1', 'pond', 'A'), lead('2', 'pond', 'B'), lead('3', 'pond', 'B'),
  lead('4', 'pond', 'C'), lead('5', 'pipeline', 'A'),
];

const pick = (cfg, scored) => load('pick-claims.js')(dollar({ 'Read Config': [cfg] }), { all: () => items(scored) }, now, quiet).map(i => i.json);
const merge = (scored, picked, responses) => load('merge-claims.js')(
  dollar({ 'Parse & Sort': scored, 'Pick Claims': picked, ...(responses ? { 'Lofty: Claim Lead': responses } : {}) }),
  null, now, quiet).map(i => i.json);
const digest = (merged) => load('build-digest-email.js')(dollar({ 'Read Config': [CFG] }), { all: () => items(merged) }, now, quiet)[0].json;

let pass = 0, fail = 0;
const is = (label, got, want) => { const ok = String(got) === String(want); if (ok) { pass++; } else { fail++; }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(48)} ${ok ? '' : `got ${got}, wanted ${want}`}`); };

// Pick Claims
const picked = pick(CFG, SCORED);
is('picks pond A and B only', picked.map(p => p.lead_id).join(','), '1,2,3');
is('carries the assignee', picked[0].assignee, 'aj@example.com');
is('never picks pipeline or C', picked.some(p => p.lead_id === '4' || p.lead_id === '5'), false);
is('placeholder assignee picks nothing', pick({ claimAssignee: 'PUT_YOUR_LOFTY_ACCOUNT_EMAIL_HERE' }, SCORED).length, 0);
is('blank assignee picks nothing', pick({}, SCORED).length, 0);

// Merge Claims
const merged = merge(SCORED, picked, [{ leadId: 1 }, { message: 'no authority' }, { code: 401, message: 'token expired' }]);
const by = Object.fromEntries(merged.map(m => [m.lead_id, m]));
is('every scored lead passes through', merged.length, SCORED.length);
is('{leadId} reads as claimed', by['1'].claim, 'claimed');
is('no authority reads as taken', by['2'].claim, 'taken');
is('anything else reads as failed', by['3'].claim, 'failed');
is('failure keeps Lofty\'s words', by['3'].claim_note, 'token expired');
is('C lead untouched', 'claim' in by['4'], false);
is('pipeline lead untouched', 'claim' in by['5'], false);

const none = merge(SCORED, [{}], null);
is('no picks: every lead passes, none marked', none.filter(m => 'claim' in m).length, 0);
const missing = merge(SCORED, picked, [{ leadId: 1 }]);
is('missing response reads as failed', missing.find(m => m.lead_id === '2').claim, 'failed');

// Digest
const d = digest(merged);
is('subject leads with claim results', d.subject, 'Lead review · 2026-10-28 · 1 claimed for you · 1 taken first · 1 claim failed');
is('claimed card says so', d.html.includes('Claimed for you'), true);
is('taken card says so', d.html.includes('Taken by another agent first'), true);
is('failed card shows the reason', d.html.includes('Auto claim failed: token expired'), true);
is('failed card offers Claim in Lofty', (d.html.match(/Claim in Lofty/g) || []).length, 1);
is('pipeline card offers Open in Lofty', (d.html.match(/Open in Lofty/g) || []).length, 2);
is('no claim webhook link', /lofty-claim/.test(d.html), false);
is('no results falls back to plain count', digest(none).subject, 'Lead review · 2026-10-28 · 3 worth a letter');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
