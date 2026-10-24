'use strict';
// R28 supervised execution engine: authorized versus denied tools, real execution versus recorded replay, task
// dependencies and failures, cancellation and recovery, limits, evidence provenance, scientific uncertainty,
// optional local-model reasoning with validation, human-review gating and browser-local privacy.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const json = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const EP = import('../src/execution/engine.mjs'), TP = import('../src/execution/tools.mjs');
const WORK = json('data/intelligence/work.json'), CAT = json('data/urban/catalog.json'), REG = json('data/agents/sf-civilization.json');
const RES = { 'data/urban/catalog.json': CAT, 'data/intelligence/work.json': WORK };
const OBJ = 'Would more green time on the mapped Folsom approach reduce delay, and what evidence is missing?';
const clockFrom = (start = Date.UTC(2026, 9, 23, 12)) => { let t = start; return () => new Date(t += 5); };
const run = async (opts = {}, planOpts = {}) => { const E = await EP, x = E.createExecution(E.planSF({ work: WORK, objective: OBJ, ...planOpts }), { resources: RES, clock: clockFrom(), ...opts }); return { x, r: await x.start() }; };
// A stand-in local model returning a fixed answer, used only to test validation and gating; never shipped.
const fakeModel = text => async () => ({ text: typeof text === 'function' ? text() : text, tokens: 1, model: 'test-model' });

test('only the declared local tools are allowed; everything else is denied and recorded', async () => {
  const { createRegistry, PERMISSIONS, APPROVED_RESOURCES } = await TP, reg = createRegistry({ resources: RES });
  const allowed = reg.list().filter(t => t.allowed).map(t => t.id).sort();
  assert.deepEqual(allowed, ['evidence.compare', 'evidence.readiness', 'geo.segment', 'reason.hypotheses', 'records.inspect', 'report.compose', 'sim.compare', 'sim.sweep']);
  for (const id of ['net.fetch', 'shell.exec', 'fs.read', 'comms.send', 'records.publish', 'world.act', 'eval', 'anything']) {
    const c = await reg.call(id, { url: 'https://example.org', cmd: 'rm -rf /' }); assert.equal(c.status, 'denied', id); assert.equal(c.output, null); assert.match(c.error, /denied/); }
  for (const p of ['network', 'shell', 'filesystem', 'communication', 'publish', 'real-world']) assert.equal(PERMISSIONS[p].allowed, false);
  assert.deepEqual(APPROVED_RESOURCES, ['data/urban/catalog.json', 'data/intelligence/work.json']);
  const E = await EP, plan = E.planSF({ work: WORK, objective: OBJ }); plan.tasks[0].tool = 'net.fetch';
  assert.throws(() => E.createExecution(plan, { resources: RES }), /Plan rejected: T1: tool net.fetch is denied \(network\)/);
  assert.throws(() => E.planSF({ work: WORK, objective: ' ' }), /explicit objective/);
});

test('a new local execution is distinct from the recorded run and fully traced', async () => {
  const { r } = await run(), { r: r2 } = await run();
  assert.equal(r.mode, 'local-execution'); assert.equal(r.status, 'completed'); assert.equal(r.complete, true);
  assert.notEqual(r.execution, WORK.run.id); assert.notEqual(r.execution, r2.execution); assert.equal(r.reads.recordedRun, WORK.run.id);
  assert.equal(r.startedAt, '2026-10-23T12:00:00.010Z', 'timestamps come from the real (here injected) clock, never the recorded run');
  assert.deepEqual(r.tasks.map(t => `${t.id}:${t.status}`), ['T1:done', 'T2:done', 'T3:done', 'T4:done', 'T5:done', 'T6:done', 'T7:unavailable', 'T8:done']);
  assert.equal(r.calls.length, 8);
  for (const c of r.calls) { assert.match(c.inputDigest, /^[a-f0-9]{64}$/); assert.match(c.outputDigest, /^[a-f0-9]{64}$/); assert.equal(c.provenance.execution, r.execution); assert.ok(Number.isFinite(Date.parse(c.startedAt)) && c.ms >= 0); assert.ok(c.resources.every(p => RES[p])); }
  // New computations are produced by this execution and reproduce the recorded F8 numbers deterministically.
  const mine = r.findings.filter(f => f.kind === 'computed-output');
  assert.ok(mine.length >= 4 && mine.every(f => f.origin === 'this-execution' && f.ref === `exec:${r.execution}#call:${f.call}`));
  assert.ok(mine.some(f => /Recomputed recorded F8 .* identical delays/.test(f.text)));
  assert.deepEqual(mine.map(f => f.text), r2.findings.filter(f => f.kind === 'computed-output').map(f => f.text));
  assert.ok(r.findings.filter(f => f.tool === 'records.inspect').every(f => f.origin === 'recorded-run'), 'recorded items are never relabelled as new work');
  // Tasks are owned by the agent identities of the recorded investigation and registered in CORE.
  const ids = new Set(REG.agents.map(a => a.id)), lanes = Object.fromEntries(r.tasks.map(t => [t.id, t.agent]));
  assert.ok(r.tasks.every(t => ids.has(t.agent)));
  assert.equal(lanes.T4, WORK.run.tasks.find(t => t.role === 'quantitative').agent); assert.equal(lanes.T6, WORK.run.tasks.find(t => t.role === 'reviewer').agent);
  const E = await EP; assert.deepEqual(E.memoryOf(r, lanes.T4).tasks.map(t => t.id), ['T4', 'T5']); assert.equal(E.memoryOf(r, lanes.T4).recordedRun, WORK.run.id);
});

test('every finding is typed by provenance and computed outputs keep their uncertainty', async () => {
  const { KINDS } = await TP, { r } = await run();
  assert.deepEqual(KINDS, ['source-evidence', 'recorded-observation', 'user-assumption', 'computed-output', 'model-hypothesis', 'unverified-claim']);
  for (const f of r.findings) { assert.ok(KINDS.includes(f.kind), f.kind); assert.ok(f.agent && f.task && f.call && f.ref && f.at && Array.isArray(f.refs)); }
  assert.ok(r.findings.filter(f => ['computed-output', 'user-assumption'].includes(f.kind)).every(f => f.uncertainty));
  assert.equal(r.findingsByKind['user-assumption'].thisExecution, 2); assert.equal(r.findingsByKind['model-hypothesis'].thisExecution, 0, 'no model ran, so no new hypothesis');
  assert.equal(r.findingsByKind['unverified-claim'].recordedRun, 4);
  assert.ok(['measurements', 'calibration', 'holdout', 'review'].every(id => r.requirements.some(q => q.id === id)));
  const fresh = r.disagreements.filter(d => !d.recorded);
  assert.deepEqual(fresh.map(d => d.subject), ['Is the lower modelled delay evidence for a real-world change?', 'How large is the green-time effect?']);
  assert.ok(fresh.every(d => d.positions.length === 2 && !d.resolved && /unresolved/.test(d.standing)));
  assert.ok(r.conclusions.length && r.conclusions.every(c => c.status === 'proposed — awaiting human review'));
  assert.ok(!r.conclusions.some(c => /\b(proven|validated|guaranteed|we recommend)\b/i.test(c.text)));
  assert.equal(r.reasoning.status, 'unavailable'); assert.match(r.reasoning.reason, /no local model runtime/i);
});

test('dependencies: a failed task blocks its dependants, others continue; optional model failure does not block', async () => {
  const E = await EP, x = E.createExecution(E.planSF({ work: WORK, objective: OBJ }), { resources: { 'data/urban/catalog.json': CAT }, clock: clockFrom() });
  const r = await x.start();
  assert.deepEqual(r.tasks.map(t => `${t.id}:${t.status}`), ['T1:done', 'T2:failed', 'T3:done', 'T4:done', 'T5:done', 'T6:blocked', 'T7:blocked', 'T8:blocked']);
  assert.match(r.tasks[1].error, /not loaded/); assert.match(r.tasks[5].error, /T2 failed/); assert.equal(r.status, 'completed-with-failures'); assert.equal(r.complete, false);
  // The model answers with an invented finding id: validation rejects it; the report is still composed.
  const { r: r2 } = await run({ generate: fakeModel(JSON.stringify({ hypotheses: [{ text: 'Delay falls by 40 s.', cites: ['E999'], test: 'Count cars.' }] })) });
  assert.equal(r2.tasks.find(t => t.id === 'T7').status, 'failed'); assert.match(r2.tasks.find(t => t.id === 'T7').error, /rejected by validation: .*unknown id/);
  assert.equal(r2.tasks.find(t => t.id === 'T8').status, 'done'); assert.equal(r2.reasoning.status, 'failed'); assert.equal(r2.findingsByKind['model-hypothesis'].thisExecution, 0);
});

test('a validated local-model answer becomes labelled hypotheses, never conclusions', async () => {
  let ids; const gen = async (messages) => { ids = [...messages[1].content.matchAll(/- (E\d+) \[computed-output\]/g)].map(m => m[1]);
    return { text: JSON.stringify({ hypotheses: [{ text: 'The modelled delay difference may shrink when demand is low.', cites: [ids[0]], test: 'Authorized approach counts by hour.' }] }), tokens: 9, model: 'test-model' }; };
  const { r } = await run({ generate: gen });
  assert.equal(r.reasoning.status, 'active'); assert.equal(r.reasoning.model, 'test-model');
  const h = r.findings.filter(f => f.kind === 'model-hypothesis' && f.origin === 'this-execution');
  assert.equal(h.length, 1); assert.match(h[0].uncertainty, /^Model-generated; untested/); assert.equal(r.calls.find(c => c.tool === 'reason.hypotheses').provenance.executor, 'local-model');
  assert.ok(!r.conclusions.some(c => c.basis.includes(h[0].id)), 'hypotheses never become conclusions');
});

test('pause, cancel, model timeout, limits and recovery', async () => {
  const E = await EP, events = [];
  const x = E.createExecution(E.planSF({ work: WORK, objective: OBJ }), { resources: RES, stepMode: true, onEvent: e => events.push(e.type) });
  const done = x.start(); while (x.state.status !== 'paused') await new Promise(r => setTimeout(r, 1));
  assert.deepEqual(x.state.tasks.map(t => t.status).slice(0, 2), ['done', 'queued']);
  x.resume(); while (x.state.tasks[1].status !== 'done' || x.state.status !== 'paused') await new Promise(r => setTimeout(r, 1));
  x.cancel(); const r = await done;
  assert.equal(r.status, 'cancelled'); assert.equal(r.complete, false); assert.equal(r.calls.length, 2);
  assert.ok(r.tasks.slice(2).every(t => t.status === 'cancelled')); assert.ok(events.includes('paused') && events.includes('resumed') && events.includes('cancel-requested'));
  // Recovery: rerun the cancelled remainder in the same execution.
  x.setStepMode(false); const r2 = await x.retry(); assert.equal(r2.status, 'completed'); assert.equal(r2.calls.length, 8); assert.equal(r2.execution, r.execution);
  // Cancel during a long local-model call aborts it.
  const slow = (_, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(Object.assign(Error('aborted'), { name: 'AbortError' }))));
  const y = E.createExecution(E.planSF({ work: WORK, objective: OBJ }), { resources: RES, generate: slow }); const p = y.start();
  while (y.state.tasks.find(t => t.id === 'T7').status !== 'running') await new Promise(r => setTimeout(r, 1));
  y.cancel(); const r3 = await p; assert.equal(r3.status, 'cancelled'); assert.equal(r3.tasks.find(t => t.id === 'T7').status, 'cancelled'); assert.equal(r3.tasks.find(t => t.id === 'T8').status, 'cancelled');
  // A model that exceeds its time limit fails (optional), and the report is still composed.
  const plan = E.planSF({ work: WORK, objective: OBJ }); plan.limits.modelTimeoutMs = 20;
  const r4 = await E.createExecution(plan, { resources: RES, generate: slow }).start();
  assert.equal(r4.tasks.find(t => t.id === 'T7').status, 'failed'); assert.match(r4.tasks.find(t => t.id === 'T7').error, /exceeded 20 ms/); assert.equal(r4.status, 'completed');
  // Tool-call limit stops the run and says why.
  const lim = E.planSF({ work: WORK, objective: OBJ }); lim.limits.maxToolCalls = 3;
  const r5 = await E.createExecution(lim, { resources: RES }).start();
  assert.equal(r5.status, 'limit-exceeded'); assert.equal(r5.calls.length, 3); assert.match(r5.stopReason, /tool-call limit/);
  const big = E.planSF({ work: WORK, objective: OBJ }); big.limits.maxTasks = 3; assert.throws(() => E.createExecution(big, { resources: RES }), /limit 3/);
});

test('human review gates acceptance and external action; reports are tamper-evident', async () => {
  const E = await EP, { r } = await run();
  for (const a of ['accept-conclusions', 'propose-external-action', 'publish', 'share', 'deploy']) assert.equal(E.gate(r, a).allowed, false, a);
  assert.deepEqual([r.review.status, r.review.accepted, r.externalActions.allowed, r.externalActions.proposed.length], ['awaiting-human-review', false, false, 0]);
  assert.equal((await E.verifyReport(JSON.parse(JSON.stringify(r)))).execution, r.execution);
  const forged = { ...structuredClone(r), review: { status: 'approved-by-human', accepted: true, decidedBy: 'engine' } };
  await assert.rejects(E.verifyReport(forged), /digest mismatch/);
  const t = structuredClone(r); t.findings[0].text = 'altered'; await assert.rejects(E.verifyReport(t), /digest mismatch/);
});

test('browser-local privacy: no network, storage or code execution inside the engine', async () => {
  const src = ['src/execution/engine.mjs', 'src/execution/tools.mjs'].map(f => fs.readFileSync(f, 'utf8')).join('\n');
  for (const bad of [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /localStorage/, /sessionStorage/, /indexedDB/, /\beval\s*\(/, /new Function/, /import\s*\(/, /child_process/, /node:fs/, /navigator\./, /document\./]) assert.doesNotMatch(src, bad, String(bad));
  const real = globalThis.fetch; let calls = 0; globalThis.fetch = () => { calls++; throw Error('network used'); };
  try { const { r } = await run(); assert.equal(r.status, 'completed'); } finally { globalThis.fetch = real; }
  assert.equal(calls, 0);
  const E = await EP, m = new Map(), st = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }, { r } = await run();
  assert.ok(E.saveReport(r, st).ok); assert.deepEqual([...m.keys()], ['core.executions.v1']); assert.equal(E.listReports(st)[0].execution, r.execution);
  assert.equal(E.saveReport(r, { getItem: () => null, setItem: () => { throw Error('quota'); } }).ok, false);
});
