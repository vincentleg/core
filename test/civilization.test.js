// CORE V7.2 — agent civilisation: registry, analyses, runtime, team routing. Pure Node, deterministic.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8'), imp = p => import(path.join(ROOT, p));
const reg = JSON.parse(read('data/agents/sf-civilization.json'));
let cache;
async function env() {
  if (cache) return cache;
  const A = await imp('src/civilization/analyses.mjs'), MS = await imp('src/civilization/missions.mjs'), R = await imp('src/civilization/runtime.mjs');
  const D = {}; for (const [k, p] of Object.entries(A.FILES)) D[k] = JSON.parse(read(p));
  const mk = () => R.createRuntime({ registry: reg, missions: MS.buildMissions(D, reg, { today: '2026-10-16T00:00:00Z' }) });
  return (cache = { A, MS, R, D, mk });
}
const run = (rt, s) => { for (let i = 0; i < s; i++) rt.step(1); return rt; };

test('registry: ≥ 500 distinct San Francisco agents, five levels, every supervisor and council resolves', () => {
  const sf = reg.agents.filter(a => a.city === 'san-francisco'), ids = new Set(reg.agents.map(a => a.id));
  assert.ok(sf.length >= 500, `${sf.length}`); assert.equal(ids.size, reg.agents.length);
  assert.equal(new Set(reg.agents.map(a => a.name)).size, reg.agents.length, 'distinct names');
  for (const l of ['global', 'assembly', 'council', 'city', 'team-lead', 'agent']) assert.ok(reg.agents.some(a => a.level === l), l);
  for (const a of reg.agents) { if (a.supervisor) assert.ok(ids.has(a.supervisor), `${a.id} → ${a.supervisor}`); for (const c of a.councils || []) assert.ok(ids.has(c), c); }
  for (const c of reg.agents.filter(a => a.level === 'council')) for (const m of c.members) assert.ok(ids.has(m), m);
  assert.equal(reg.agents.filter(a => a.origin === 'registry-v1').length, 68, 'all Phase 3 profiles kept');
  const v1 = JSON.parse(read('data/agents/registry.json'));
  for (const a of v1.agents) { const b = reg.agents.find(x => x.id === a.id); assert.ok(b, a.id); assert.equal(b.code, a.code); assert.deepEqual(b.tools, a.tools); }
  assert.ok(reg.agents.every(a => a.permission !== 'approve' && !/approve|authoris/i.test((a.capabilities || []).join(' '))), 'no agent can approve or authorise');
  assert.match(reg.honesty, /No agent is an independent reasoning model/);
});

test('analyses: housing findings are recomputed from the dated snapshot and carry sources and limits', async () => {
  const { A, D } = await env(), h = A.housing(D), f = id => h.findings.find(x => x.id === id);
  const yrs = D.prodYear.filter(r => r.year >= 2016 && r.year <= 2025), mean = a => a.reduce((s, r) => s + r.net_units, 0) / a.length;
  const e = mean(yrs.filter(r => r.year <= 2020)), l = mean(yrs.filter(r => r.year >= 2021));
  assert.equal(f('h.production-trend').value, +((l - e) / e).toFixed(3));
  assert.equal(f('h.pipeline').value, D.pipeline.features.filter(x => !/Completed/i.test(x.properties.status || '')).reduce((s, x) => s + x.properties.affordable, 0));
  for (const x of h.findings) { assert.ok(x.limits, x.id); if (x.status !== 'gap') { assert.ok(x.source?.retrieved, x.id); assert.ok(/\d/.test(x.claim), x.id); } }
  assert.ok(h.findings.some(x => x.id === 'g.rent-burden' && x.status === 'gap'), 'missing rent data is declared, never estimated');
  assert.equal(h.hypotheses.length, 3); assert.ok(h.dissent.length >= 3);
  assert.doesNotMatch(JSON.stringify(h), /prouvé|démontré|validé par/i);
  const ev = JSON.parse(read('data/sf-housing/evictions-agg.json')); assert.ok(!('address' in (ev.byYear[0] || {})) && !JSON.stringify(ev).includes('eviction_id'), 'eviction data aggregated only');
});

test('runtime: deterministic, hash-chained, recoverable without duplicates', async () => {
  const { mk } = await env(), a = run(mk(), 600), b = run(mk(), 600);
  assert.equal(a.S.hash, b.S.hash); assert.ok(a.verify());
  const c = mk(); assert.ok(c.restore(a.serialize())); assert.equal(c.S.integrity, 'ok');
  run(a, 200); run(c, 200); assert.equal(a.S.hash, c.S.hash, 'a restored runtime continues exactly like the original');
  const seqs = a.S.events.map(e => e.seq); assert.equal(new Set(seqs).size, seqs.length);
  const tampered = JSON.parse(a.serialize()); tampered.events[5].text = 'falsifié'; const d = mk(); d.restore(JSON.stringify(tampered)); assert.equal(d.S.integrity, 'rompue');
});

test('runtime: the flagship mission moves through the scientific stages, fails honestly where data is missing, and stops at human review', async () => {
  const { mk } = await env(), r = run(mk(), 700), m = 'mission.sf.housing-resilience', ms = r.S.missions[m];
  assert.equal(ms.status, 'awaiting-human');
  const plan = r.M.get(m).plan;
  for (const s of ['OBSERVE', 'FORMULATE', 'RETRIEVE', 'ANALYZE', 'REQUEST_REVIEW', 'COLLABORATE', 'HYPOTHESES', 'SIMULATE', 'CRITIQUE', 'REVISE', 'DOSSIER', 'HUMAN_REVIEW'])
    assert.ok(plan.some(t => t.stage === s && ['done', 'failed'].includes(ms.tasks[t.id].state)), s);
  assert.ok(r.S.events.some(e => e.mission === m && e.kind === 'stage' && e.stage === 'MONITOR'), 'monitoring after the dossier');
  assert.equal(ms.tasks['get-rent'].state, 'failed'); assert.match(ms.tasks['get-rent'].reason, /clé/);
  const types = new Set(r.S.events.filter(e => e.mission === m && e.kind === 'message').map(e => e.type));
  for (const t of ['request', 'evidence', 'analysis', 'challenge', 'alternative', 'review-request', 'review', 'dossier-update', 'escalate']) assert.ok(types.has(t), t);
  assert.ok(!r.S.events.some(e => /RECOMMENDATION/.test(e.stage || '')), 'no recommendation without a human');
  const msgs = r.S.events.filter(e => e.kind === 'message'); assert.ok(msgs.every(e => r.byId.has(e.from) || e.from === 'human:local'));
});

test('runtime: bounded concurrency, real audits, many distinct agents, honest idle state', async () => {
  const { mk } = await env(), r = mk(); let max = 0; for (let i = 0; i < 900; i++) { r.step(1); max = Math.max(max, Object.keys(r.S.busy).length); }
  assert.ok(max > 30 && max <= 140, `${max}`);
  const worked = new Set(r.S.events.flatMap(e => e.agents || [])); assert.ok(worked.size >= 150, `${worked.size}`);
  const au = r.S.missions['mission.sf.housing-resilience'].audits['pipeline-dates']; assert.ok(au.checked > 0 && Object.keys(au.tallies).length + Object.keys(au.lastTallies || {}).length > 0);
  const idle = r.agents.find(a => a.city === 'san-francisco' && !r.S.busy[a.id] && a.level === 'agent'); assert.match(r.activity(idle.id).label, /inactif|regagne/);
  assert.equal(r.S.missions['mission.sf.water'].status, 'gap', 'a team without data does no fabricated work');
});

test('runtime: cancellation frees agents; human contributions require consent and are triaged, never auto-accepted', async () => {
  const { mk } = await env(), r = run(mk(), 60);
  assert.throws(() => r.submitHumanInput('mission.sf.housing-resilience', { kind: 'hypothesis', title: 'x', text: 'y' }), /consentement/);
  const h = r.submitHumanInput('mission.sf.housing-resilience', { kind: 'hypothesis', title: 'Densifier près des transports', text: 'texte', consent: true });
  run(r, 30); assert.equal(h.state, 'en revue'); assert.ok(r.S.events.some(e => e.type === 'human-input') && r.S.events.some(e => e.type === 'review-request' && /aucune validation automatique/.test(e.text)));
  assert.ok(r.cancel('mission.sf.energy-benchmarks', 'test')); assert.equal(r.S.missions['mission.sf.energy-benchmarks'].status, 'cancelled');
  assert.ok(!Object.values(r.S.busy).some(k => k.startsWith('mission.sf.energy-benchmarks#')));
});

test('team dialogue routing (pure): answers cite findings, causal questions add the reviewer, unknown topics are refused', async () => {
  const { mk } = await env(), m = mk().M.get('mission.sf.housing-resilience');
  const src = read('src/dialogue/team.mjs');
  const TOPICS = eval('(' + src.match(/export const TOPICS = (\[[\s\S]*?\n\]);/)[1] + ')');
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hits = q => TOPICS.filter(([re]) => re.test(norm(q))).flatMap(([, ids]) => ids).filter(id => m.findings.some(f => f.id === id));
  assert.ok(hits('Les nouveaux logements sont-ils exposés aux inondations ?').includes('h.flood-exposure'));
  assert.ok(hits('Les loyers sont-ils trop chers ?').includes('g.rent-burden'), 'rent questions reach the declared gap, not an invented number');
  assert.deepEqual(hits('Quel temps fera-t-il demain ?'), []);
  assert.match(src, /Je ne réponds pas sans preuve/); assert.match(src, /if \(!\$\('tm-consent'\)\.checked\)/);
});

test('V8 reasoning cycles: only when enabled, role-assigned, validated results become labelled proposals, never findings; jobs expire', async () => {
  const { mk } = await env(), r = run(mk(), 400), m = 'mission.sf.mobility';
  assert.equal(r.pendingJobs().length, 0, 'no model work unless the person switches reasoning on');
  r.setReasoning(true); run(r, 5);
  const jobs = r.pendingJobs(); assert.ok(jobs.length >= 2, `${jobs.length}`);
  const j = jobs.find(x => x.mission === m); assert.equal(j.kind, 'gaps'); assert.equal(r.byId.get(j.agent).teamRole, 'researcher');
  assert.match(r.activity(j.agent).label, /modèle local/);
  const before = JSON.stringify(r.M.get(m).findings);
  r.markJobRunning(j.id); r.completeJob(j.id, { ok: true, output: { questions: [{ question: 'Q ?', why: 'w', needs: 'data', related: ['g.counts'] }] }, entry: { ms: 10, tokens: 20, model: 'test' } });
  assert.equal(JSON.stringify(r.M.get(m).findings), before, 'a proposal never modifies findings');
  const ev = r.S.events.filter(e => e.type === 'model-proposal'); assert.ok(ev.length && ev.at(-1).model === true && ev.at(-1).validated === true);
  assert.ok(!r.S.busy[j.agent]); run(r, 60);
  const next = r.pendingJobs().find(x => x.mission === m); assert.equal(next.kind, 'hypothesis');
  r.completeJob(next.id, { ok: false, issues: ['number : nombre absent des preuves : 42'] });
  assert.equal(r.S.missions[m].modelWork.at(-1).status, 'rejeté');
  run(r, 3700); assert.ok(Object.values(r.S.jobs).some(x => x.state === 'expired'), 'unanswered jobs expire and free their agent');
  assert.ok(Object.values(r.S.jobs).filter(x => ['pending', 'running'].includes(x.state)).length <= 2, 'bounded outstanding jobs');
});
test('V8 hierarchy: geographic directors between global coordination and the city; explicit team roles everywhere', () => {
  const by = id => reg.agents.find(a => a.id === id);
  assert.equal(by('core.san-francisco.manager').supervisor, 'core.director.bay-area'); assert.equal(by('core.director.bay-area').supervisor, 'core.director.north-america'); assert.equal(by('core.director.north-america').supervisor, 'core.global.coordinator');
  for (const r of ['coordinator', 'researcher', 'data-investigator', 'scientific-analyst', 'simulation-engineer', 'optimization', 'skeptical-reviewer', 'source-verifier', 'safety-ethics', 'facilitator', 'report-author']) assert.ok(reg.agents.some(a => a.teamRole === r), r);
  assert.ok(reg.agents.every(a => a.teamRole));
});
test('V8 reasoning pool: schema and evidence validation, retry, budget, ledger', async () => {
  const P = await imp('src/intelligence/pool.mjs'), { mk } = await env(), m = mk().M.get('mission.sf.housing-resilience');
  let calls = 0; const answers = ['pas du json', JSON.stringify({ hypotheses: [{ title: 'T', statement: 'Le pipeline compte 10 100 logements abordables.', supports: ['h.pipeline'], test: 't', falsifiedIf: 'f' }] })];
  const pool = P.createPool({ generate: async () => ({ text: answers[Math.min(calls++, 1)], tokens: 5, model: 'test' }) });
  const ok = await pool.submit({ id: 'a', kind: 'hypothesis', agent: 'x', mission: m, findings: m.findings });
  assert.equal(ok.ok, true); assert.equal(ok.entry.attempts, 2, 'one retry after a non-JSON answer');
  const bad = P.createPool({ generate: async () => ({ text: JSON.stringify({ hypotheses: [{ title: 'T', statement: 'Il est prouvé que 99 % des loyers ont doublé.', supports: ['h.inexistant'], test: 't', falsifiedIf: 'f' }] }) }) });
  const r = await bad.submit({ id: 'b', kind: 'hypothesis', agent: 'x', mission: m, findings: m.findings });
  assert.equal(r.ok, false); assert.ok(r.issues.some(i => /inexistant/.test(i)) && r.issues.some(i => /number|overclaim/.test(i)));
  const tiny = P.createPool({ generate: async () => ({ text: '{}' }), maxPerHour: 1 }); await tiny.submit({ id: 'c', kind: 'gaps', agent: 'x', mission: m, findings: m.findings });
  await assert.rejects(tiny.submit({ id: 'd', kind: 'gaps', agent: 'x', mission: m, findings: m.findings }), /budget/);
  assert.equal(pool.ledger.length, 1); assert.deepEqual(Object.keys(pool.ledger[0]).filter(k => ['agent', 'mission', 'evidence', 'attempts', 'status'].includes(k)).sort(), ['agent', 'attempts', 'evidence', 'mission', 'status']);
});
