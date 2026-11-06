// Tests for the triage's token guardrails (anthonystolp T-041): a pipeline lead is re-rated only
// when what Claude would see has changed, and after three failed runs Claude is held back and AJ
// is emailed once.
//
// Filter & Shape and Parse & Sort are loaded from nodes/ and driven with stubbed n8n globals, as
// test-territory.mjs does. Nothing is called.
//
//   node automation/lofty-lead-triage/test-token-guards.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const filterSrc = fs.readFileSync(path.join(DIR, 'nodes', 'filter-and-shape.js'), 'utf8');
const parseSrc = fs.readFileSync(path.join(DIR, 'nodes', 'parse-and-sort.js'), 'utf8');
const wf = JSON.parse(fs.readFileSync(path.join(DIR, 'lofty-lead-triage-daily.json'), 'utf8'));
const node = (n) => wf.nodes.find(x => x.name === n);
const quiet = { log() {} };

const ME = '844773616097576';
const T0 = Date.parse('2026-11-07T13:00:00Z');
const HOUR = 3600 * 1000;
const at = (ms, day = new Date(ms).toISOString().slice(0, 10)) => ({ hour: 8, toMillis: () => ms, toFormat: () => day });
const cfg = (over = {}) => ({ counties: 'Ozaukee,Milwaukee', maxPerRun: 25, model: 'claude-sonnet-4-6', myUserId: ME, ...over });

const attrs = (o) => Object.entries(o).map(([attributeName, value]) => ({ attributeName, attributeType: 'text', value }));
const mineLead = (id, price = '329000') => ({
  leadId: id, assignedUserId: ME, state: 'WI', city: 'Grafton', zipCode: '53024', stage: 'Contacted',
  phones: ['4145550100'], emails: [],
  customAttributes: attrs({ County: 'OZAUKEE', Status: 'Expired', Price: price, 'Owner Occupied': 'Y' }),
});
const pondLead = (id) => ({
  leadId: id, assignedUserId: -1, state: 'WI', city: 'Mequon', zipCode: '53092', stage: 'New Leads',
  phones: ['4145550101'], emails: [], customAttributes: attrs({ County: 'OZAUKEE', Status: 'Expired' }),
});

// One Filter & Shape run. Returns its single item's json, or null when it returned nothing.
const filter = (sd, { pond = [], pipe = [], now = at(T0), config = cfg() } = {}) => {
  const nodes = { 'Read Config': config, 'Lofty: Pond New Leads': { leads: pond }, 'Lofty: My Pipeline': { leads: pipe } };
  const $ = (n) => ({ first: () => ({ json: nodes[n] || {} }) });
  const out = new Function('$', '$getWorkflowStaticData', '$now', 'console', filterSrc)($, () => sd, now, quiet);
  return out.length ? out[0].json : null;
};
// Mark Emailed Seen, the last step of a run that sent a digest.
const markSeen = (sd, rows, now = at(T0)) => new Function('$', '$getWorkflowStaticData', '$now', node('Mark Emailed Seen').parameters.jsCode)(
  () => ({ all: () => rows.map(json => ({ json })) }), () => sd, now);
// One Parse & Sort run after that Filter & Shape output, then the send when it has rows, as a
// live run that gets through does. `reply` is Claude's array, or null for a run that never
// called Claude.
const parse = (sd, shaped, reply, now = at(T0)) => {
  const rows = new Function('$', '$json', '$now', '$getWorkflowStaticData', 'console', parseSrc)(
    (n) => ({ first: () => ({ json: n === 'Filter & Shape' ? shaped : {} }) }),
    reply == null ? shaped : { content: [{ type: 'text', text: JSON.stringify(reply) }] },
    now, () => sd, quiet).map(i => i.json);
  if (rows.length) markSeen(sd, rows, now);
  return rows;
};
const rate = (shaped, tier = 'B') => shaped.batch.map(s => ({ ref: s.ref, name: s.name, tier, score: 60, headline: `rated ${s.ref}` }));
const nextDay = (sd) => { delete sd.pipelineEmailedDate; return sd; };

let pass = 0, fail = 0;
const is = (label, got, want) => { const ok = String(got) === String(want); if (ok) { pass++; } else { fail++; }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${ok ? '' : `got ${got}, wanted ${want}`}`); };

// --- 1. Pipeline ratings are reused until the lead changes --------------------------------
{
  const sd = {};
  const pipe = [mineLead(1), mineLead(2)];
  const day1 = filter(sd, { pipe });
  is('cold store: every pipeline lead goes to Claude', `${day1.route}|${day1.batch.length}|${day1.cached.length}`, 'claude|2|0');
  parse(sd, day1, rate(day1));
  is('Parse & Sort stores each pipeline rating', Object.keys(sd.pipelineRatings).sort().join(), '1,2');
  is('...with the fingerprint and the day', !!sd.pipelineRatings['1'].fp && sd.pipelineRatings['1'].ratedOn, '2026-11-07');
  is('...without the per-run ref', 'ref' in sd.pipelineRatings['1'].rating, false);

  const day2 = filter(nextDay(sd), { pipe, now: at(T0 + 24 * HOUR) });
  is('unchanged leads: no Claude call, both reused', `${day2.route}|${day2.batch.length}|${day2.cached.length}`, 'cached|0|2');
  const rows = parse(sd, day2, null, at(T0 + 24 * HOUR));
  is('a cached run still produces the digest rows', rows.map(r => `${r.lead_id}:${r.tier}`).sort().join(), '1:B,2:B');
  is('...carrying the stored headline', rows.every(r => /^rated /.test(r.headline)), true);
  is('...and a cached run leaves the stored day alone', sd.pipelineRatings['1'].ratedOn, '2026-11-07');

  const day3 = filter(nextDay(sd), { pipe: [mineLead(1, '299000'), mineLead(2)], now: at(T0 + 48 * HOUR) });
  is('a changed price re-rates that lead only', `${day3.route}|${day3.batch.length}|${day3.cached.length}`, 'claude|1|1');
  is('...and it is the changed one', day3.rawById[String(day3.batch[0].ref)].lead_id, '1');
  const rows3 = parse(sd, day3, rate(day3, 'A'), at(T0 + 48 * HOUR));
  is('fresh and cached ratings reach the digest together', rows3.map(r => `${r.lead_id}:${r.tier}`).sort().join(), '1:A,2:B');

  const day4 = filter(nextDay(sd), { pipe: [mineLead(1, '299000'), mineLead(2)], now: at(T0 + 72 * HOUR), config: cfg({ model: 'claude-sonnet-5-5' }) });
  is('a new model re-rates every lead', `${day4.batch.length}|${day4.cached.length}`, '2|0');
  const day5 = filter(nextDay(sd), { pipe: [mineLead(1, '299000'), mineLead(2)], now: at(T0 + 72 * HOUR), config: cfg({ counties: 'Ozaukee' }) });
  is('a changed prompt re-rates every lead', `${day5.batch.length}|${day5.cached.length}`, '2|0');

  filter(nextDay(sd), { pipe: [mineLead(2)], now: at(T0 + 96 * HOUR) });
  is('a lead that left the pipeline is forgotten', Object.keys(sd.pipelineRatings).join(), '2');
  filter(nextDay(sd), { pipe: [], now: at(T0 + 96 * HOUR) });
  is('an empty pipeline read forgets nothing', Object.keys(sd.pipelineRatings).join(), '2');
}
{
  const sd = {};
  const d1 = filter(sd, { pipe: [mineLead(7)] });
  parse(sd, d1, rate(d1, 'SKIP'));
  is('a pipeline SKIP is stored too', sd.pipelineRatings['7']?.rating.tier, 'SKIP');
  const d2 = filter(nextDay(sd), { pipe: [mineLead(7)], now: at(T0 + 24 * HOUR) });
  is('...so it is not paid for again tomorrow', `${d2.route}|${d2.batch.length}`, 'cached|0');
  is('...and the cached SKIP still marks the pipeline done', parse(sd, d2, null).length + '|' + sd.pipelineEmailedDate, '0|2026-11-07');
}
{
  const sd = {};
  const d1 = filter(sd, { pipe: [mineLead(1)] });
  parse(sd, d1, rate(d1));
  const d2 = filter(nextDay(sd), { pond: [pondLead(50)], pipe: [mineLead(1)], now: at(T0 + 24 * HOUR) });
  is('a new pond lead goes to Claude, the pipeline does not', `${d2.route}|${d2.batch.map(s => d2.rawById[s.ref].bucket).join()}|${d2.cached.length}`, 'claude|pond|1');
  parse(sd, d2, rate(d2), at(T0 + 24 * HOUR));
  is('nothing new and no pipeline due: the run stops', filter(sd, { pond: [pondLead(50)], pipe: [mineLead(1)], now: at(T0 + 25 * HOUR) }), 'null');
}

// --- 2. Three failures, then a hold and one email ---------------------------------------
{
  const sd = {};
  const pond = [pondLead(60)];
  for (let i = 0; i < 3; i++) filter(sd, { pond, now: at(T0 + i * 5 * 60 * 1000) });
  is('each attempt counts until a run gets through', sd.claudeGuard.failures, 3);
  const held = filter(sd, { pond, now: at(T0 + 15 * 60 * 1000) });
  is('the fourth run does not call Claude', held.route, 'alert');
  is('...it emails AJ instead', /3 failed runs in a row/.test(held.subject) && /stopped calling Claude/.test(held.html), true);
  is('...and the hold did not count as an attempt', sd.claudeGuard.failures, 3);
  is('the next held run is silent', filter(sd, { pond, now: at(T0 + 20 * 60 * 1000) }), 'null');
  const probe = filter(sd, { pond, now: at(T0 + 10 * 60 * 1000 + 6 * HOUR + 1000) });
  is('six hours after the last attempt, Claude is tried once', `${probe.route}|${sd.claudeGuard.failures}`, 'claude|4');
  is('...and a failed probe holds again without a second email', filter(sd, { pond, now: at(T0 + 7 * HOUR) }), 'null');

  const ok = filter(sd, { pond, now: at(T0 + 13 * HOUR) });
  parse(sd, ok, rate(ok, 'SKIP'), at(T0 + 13 * HOUR));
  is('a run with nothing to send clears the count', sd.claudeGuard.failures, 0);
  is('...and the alert can fire again next time', sd.claudeGuard.alertedAt, undefined);
}
{
  const sd = { claudeGuard: { failures: 2, lastTryAt: '2026-11-07T12:00:00.000Z' } };
  const d = filter(sd, { pipe: [] , pond: [] });
  is('a run with nothing to rate leaves the count alone', `${d}|${sd.claudeGuard.failures}`, 'null|2');
}
{
  const sd = { claudeGuard: { failures: 3, lastTryAt: new Date(T0).toISOString(), alertedAt: 'x' } };
  const d1 = filter(sd, { pipe: [mineLead(1)] });
  is('a held guard holds a pipeline re-rate too', d1, 'null');
}
{
  // Mark Emailed Seen is the reset after a send.
  const sd = { claudeGuard: { failures: 2, lastTryAt: 'x', alertedAt: 'y' } };
  markSeen(sd, [{ bucket: 'pond', lead_id: '60' }]);
  is('Mark Emailed Seen clears the count after a send', JSON.stringify(sd.claudeGuard), '{"failures":0}');
  const failed = {};
  const d = filter(failed, { pond: [pondLead(61)] });
  new Function('$', '$json', '$now', '$getWorkflowStaticData', 'console', parseSrc)(
    (n) => ({ first: () => ({ json: n === 'Filter & Shape' ? d : {} }) }), { content: [{ type: 'text', text: '[{"ref":0,"tier":"B"}]' }] },
    at(T0), () => failed, quiet);
  is('rows awaiting a send that never happens keep the count up', failed.claudeGuard.failures, 1);
}

// --- 3. The record of each run that needed Claude -----------------------------------------
{
  const sd = {};
  const d1 = filter(sd, { pipe: [mineLead(1), mineLead(2)] });
  parse(sd, d1, rate(d1));
  filter(nextDay(sd), { pipe: [mineLead(1), mineLead(2)], now: at(T0 + 24 * HOUR) });
  is('claudeLog records a call and a cached day', JSON.stringify(sd.claudeLog.map(e => [e.called, e.pond, e.pipelineRated, e.pipelineCached])), '[[true,0,2,0],[false,0,0,2]]');
  const big = { claudeLog: Array.from({ length: 200 }, (_, i) => ({ at: String(i) })) };
  filter(big, { pond: [pondLead(70)] });
  is('claudeLog stays bounded at 200, newest kept', `${big.claudeLog.length}|${big.claudeLog.at(-1).pond}`, '200|1');
}

// --- The workflow file carries the code and the routes ------------------------------------
{
  const next = (from, out = 0) => (wf.connections[from]?.main?.[out] || []).map(c => c.node).join();
  is('workflow Filter & Shape matches the node file', node('Filter & Shape').parameters.jsCode === filterSrc, true);
  is('workflow Parse & Sort matches the node file', node('Parse & Sort').parameters.jsCode === parseSrc, true);
  is('Filter & Shape goes to IF Alert', next('Filter & Shape'), 'IF Alert');
  is('an alert goes to Send Alert', next('IF Alert', 0), 'Send Alert (Resend)');
  is('anything else goes to IF Needs Claude', next('IF Alert', 1), 'IF Needs Claude');
  is('a claude run goes through Anthropic', next('IF Needs Claude', 0), 'Anthropic: Score & Triage');
  is('a cached run goes straight to Parse & Sort', next('IF Needs Claude', 1), 'Parse & Sort');
  is('Send Alert ends there', next('Send Alert (Resend)'), '');
  is('IF Alert tests the alert route', node('IF Alert').parameters.conditions.conditions[0].leftValue, "={{ $json.route === 'alert' }}");
  is('IF Needs Claude tests the claude route', node('IF Needs Claude').parameters.conditions.conditions[0].leftValue, "={{ $json.route === 'claude' }}");
  is('Send Alert sends the alert subject and body to digestTo', /digestTo/.test(node('Send Alert (Resend)').parameters.jsonBody) && /\$json\.subject/.test(node('Send Alert (Resend)').parameters.jsonBody), true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
