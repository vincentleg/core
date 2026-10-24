'use strict';
// R29 saved agent investigations: explicit browser-local persistence, execution class derived from the call log
// (recorded / deterministic / local model), integrity on reload, bounded references, and the existing My CORE
// lifecycle and review request carrying the investigation without turning it into a validated finding or a decision.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const json = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const EP = import('../src/execution/engine.mjs'), SP = import('../src/execution/saved.mjs'), STP = import('../src/contrib/store.mjs'), LCP = import('../src/contrib/lifecycle.mjs');
const WORK = json('data/intelligence/work.json'), CAT = json('data/urban/catalog.json');
const RES = { 'data/urban/catalog.json': CAT, 'data/intelligence/work.json': WORK };
const OBJ = 'Would more green time on the mapped Folsom approach reduce delay, and what evidence is missing?';
const memStore = () => { const m = new Map(); return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const hypo = async messages => { const id = /- (E\d+) \[computed-output\]/.exec(messages[1].content)[1];
  return { text: JSON.stringify({ hypotheses: [{ text: 'The modelled difference may shrink at low demand.', cites: [id], test: 'Authorized hourly counts.' }] }), tokens: 5, model: 'test-model' }; };
const run = async (opts = {}) => { const E = await EP; return E.createExecution(E.planSF({ work: WORK, objective: OBJ }), { resources: RES, ...opts }).start(); };

test('saving is explicit, bounded, deduplicated and survives a reload of storage', async () => {
  const S = await SP, st = memStore(), r = await run();
  assert.equal(S.listReports(st).length, 0, 'nothing is stored until saved');
  assert.deepEqual(S.saveReport(r, st, '2026-10-23T13:00:00Z'), { ok: true });
  assert.deepEqual(S.saveReport(r, st), { ok: true, already: true });
  const reloaded = JSON.parse(st.m.get('core.executions.v1'));
  assert.equal(reloaded.length, 1); assert.equal(reloaded[0].savedAt, '2026-10-23T13:00:00Z');
  const back = S.listReports(st)[0];
  assert.equal(back.execution, r.execution); assert.equal(back.mission, 'mission.sf.mobility'); assert.equal(back.mode, 'local-execution');
  assert.ok(back.agents.length >= 6 && back.findings.every(f => f.origin && f.ref && f.at) && back.requirements.length === 7 && /^[0-9a-f]{64}$/.test(back.digest));
  await S.verifyReport(back);
  // Incomplete or foreign reports are refused; the limit refuses rather than evicting.
  for (const status of ['cancelled', 'limit-exceeded', 'running']) assert.equal(S.saveReport({ ...r, status }, memStore()).ok, false);
  assert.equal(S.saveReport({ ...r, mode: 'recorded' }, memStore()).ok, false);
  const full = memStore(); full.setItem(S.STORE_KEY, JSON.stringify(Array.from({ length: S.MAX_SAVED }, (_, i) => ({ savedAt: 'x', report: { ...r, execution: `e${i}` } }))));
  assert.match(S.saveReport(r, full).reason, /already saved; delete one/); assert.equal(S.listReports(full).length, S.MAX_SAVED);
  // Delete removes only that report; R28-format entries (bare reports) are still readable.
  assert.equal(S.deleteReport(r.execution, st), true); assert.equal(S.listReports(st).length, 0); assert.equal(S.deleteReport('nope', st), false);
  const legacy = memStore(); legacy.setItem(S.STORE_KEY, JSON.stringify([r])); assert.equal(S.savedEntries(legacy)[0].savedAt, r.endedAt);
  assert.equal(S.saveReport(r, { getItem: () => null, setItem: () => { throw Error('quota'); } }).ok, false);
});

test('execution class comes from the call log: deterministic, local model, never a forged label', async () => {
  const S = await SP, det = await run(), ai = await run({ generate: hypo });
  assert.equal(S.executionClass(det), 'deterministic'); assert.equal(S.modelOf(det), null);
  assert.equal(S.executionClass(ai), 'local-model'); assert.equal(S.modelOf(ai), 'test-model');
  const forged = structuredClone(det); forged.reasoning = { status: 'active', model: 'qwen3:8b' };
  assert.equal(S.executionClass(forged), 'deterministic', 'a reasoning label without a successful model call does not count');
  const rejected = await run({ generate: async () => ({ text: '{"hypotheses":[{"text":"x","cites":["E999"],"test":"y"}]}', model: 'test-model' }) });
  assert.equal(S.executionClass(rejected), 'deterministic', 'a model answer rejected by validation does not count');
  assert.ok(S.CLASSES.includes('recorded'));
  assert.equal(S.cleanRef({ ...S.investigationRef(det), class: 'recorded' }), null, 'the recorded investigation is never stored as a saved run');
});

test('integrity: altered or self-approving saved reports are rejected on reload', async () => {
  const S = await SP, r = await run(), st = memStore(); S.saveReport(r, st);
  const raw = JSON.parse(st.m.get(S.STORE_KEY)); raw[0].report.findings.find(f => f.kind === 'computed-output').text = 'Delay falls by 40 s (measured).';
  st.setItem(S.STORE_KEY, JSON.stringify(raw)); await assert.rejects(S.verifyReport(S.listReports(st)[0]), /digest mismatch/);
  const approved = structuredClone(r); approved.review = { status: 'approved-by-human', accepted: true, decidedBy: 'me' };
  const { digest, ...rest } = approved; approved.digest = await S.digest(rest);
  await assert.rejects(S.verifyReport(approved), /approval code cannot grant/);
});

test('reference: identity, digest and evidence refs only; never validated or approved', async () => {
  const S = await SP, r = await run({ generate: hypo }), ref = S.investigationRef(r);
  assert.deepEqual([ref.execution, ref.digest, ref.mission, ref.class, ref.model, ref.recordedRun, ref.validated, ref.approved], [r.execution, r.digest, 'mission.sf.mobility', 'local-model', 'test-model', WORK.run.id, false, false]);
  assert.ok(ref.findings.length && ref.findings.every(f => f.ref.startsWith(`exec:${r.execution}#call:`)), 'only findings produced by this execution, with their call reference');
  assert.ok(ref.findings.some(f => f.kind === 'model-hypothesis') && ref.findings.some(f => f.kind === 'computed-output'));
  assert.deepEqual(ref.disagreements, ['Is the lower modelled delay evidence for a real-world change?', 'How large is the green-time effect?']);
  assert.equal(JSON.stringify(ref).includes('text'), false, 'no finding text is copied into the reference');
  const forged = S.cleanRef({ ...ref, validated: true, approved: true, findings: Array(500).fill(ref.findings[0]) });
  assert.equal(forged.validated, false); assert.equal(forged.approved, false); assert.equal(forged.findings.length, S.LIMITS.findings);
  assert.equal(S.cleanRef({ ...ref, digest: 'abc' }), null); assert.equal(S.cleanRef({ ...ref, mode: 'replay' }), null);
});

test('My CORE review request: the existing lifecycle carries the investigation; requirements stay missing', async () => {
  const S = await SP, STORE = await STP, LC = await LCP, st = memStore(), r = await run();
  const ref = S.investigationRef(r), e = STORE.save({ kind: 'hypothesis', title: `Agent investigation ${r.execution.slice(0, 8)}`, text: OBJ, mission: r.mission, investigation: { ...ref, validated: true } }, st);
  assert.equal(STORE.list(st)[0].investigation.execution, r.execution); assert.equal(STORE.list(st)[0].investigation.validated, false);
  const owner = STORE.localOwner(st), LIFE = LC.createLifecycle();
  const rec = await LIFE.create({ id: e.id, owner, mission: e.mission, reason: 'Draft from a saved agent investigation', evidence: [{ kind: 'user-claim', ref: e.id, source: 'this browser' }, ...S.lifecycleEvidence(e.investigation)] });
  assert.equal(rec.state, 'DRAFT'); assert.ok(rec.events[0].evidence.some(x => x.kind === 'simulation' && x.ref === `exec:${r.execution}` && x.source.includes(r.digest)));
  assert.deepEqual(LC.missing(rec).map(n => n.id), ['counts', 'signals', 'calibration', 'independent'], 'a saved investigation satisfies no scientific requirement');
  await assert.rejects(LIFE.transition(rec, { id: owner, role: 'owner', mode: 'demonstration' }, 'RECOMMENDED', { reason: 'self-approval' }), /not allowed|cannot set/);
  const packet = LC.reviewPacket(rec, STORE.list(st)[0], { verification: await LIFE.verify(rec), investigationCheck: { ok: true } });
  assert.equal(packet.format, 'core.review-request.v1'); assert.equal(packet.lifecycle.state, 'DRAFT');
  assert.equal(packet.agentInvestigation.execution, r.execution); assert.equal(packet.agentInvestigation.digest, r.digest); assert.equal(packet.agentInvestigation.class, 'deterministic');
  assert.deepEqual([packet.agentInvestigation.validated, packet.agentInvestigation.approved, packet.agentInvestigation.reportCheck.ok], [false, false, true]);
  assert.match(packet.agentInvestigation.meaning, /Not scientifically validated, not approved, not a decision/); assert.match(packet.notice, /has not transmitted, reviewed, validated or endorsed/);
  const plain = LC.reviewPacket(rec, { ...STORE.list(st)[0], investigation: null }, { verification: await LIFE.verify(rec) }); assert.equal(plain.agentInvestigation, null);
  const E = await EP; assert.equal(E.gate(r, 'accept-conclusions').allowed, false);
});

test('browser-local only: saved investigations touch no network and only the core.* storage keys', async () => {
  const src = ['src/execution/saved.mjs', 'src/contrib/store.mjs'].map(f => fs.readFileSync(f, 'utf8')).join('\n');
  for (const bad of [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /sendBeacon/, /indexedDB/]) assert.doesNotMatch(src, bad, String(bad));
  const S = await SP, STORE = await STP, st = memStore(), r = await run();
  S.saveReport(r, st); STORE.save({ kind: 'hypothesis', title: 't', text: 'x', mission: r.mission, investigation: S.investigationRef(r) }, st); STORE.localOwner(st);
  assert.deepEqual([...st.m.keys()].sort(), ['core.contrib.v1', 'core.executions.v1', 'core.lifecycle.v1']);
});
