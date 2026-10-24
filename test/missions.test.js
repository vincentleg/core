'use strict';
// R30 geographic mission engine: specification validation (a specification cannot grant itself tools, resources or
// permissions, nor drop human review), generic planning, SF mobility compatibility, the second (housing) mission
// with checksum and missing-data states, the blocked Oakland specification, and saved-report provenance and gating.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), crypto = require('node:crypto');
const json = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const MP = import('../src/execution/missions.mjs'), EP = import('../src/execution/engine.mjs'), SP = import('../src/execution/saved.mjs');
const WORK = json('data/intelligence/work.json'), CAT = json('data/urban/catalog.json'), IDS = new Set(json('data/agents/sf-civilization.json').agents.map(a => a.id));
const load = paths => { const resources = {}, hashes = {}; for (const p of paths) { const b = fs.readFileSync(p); resources[p] = JSON.parse(b); hashes[p] = crypto.createHash('sha256').update(b).digest('hex'); } return { resources, hashes }; };
const housing = async (opts = {}) => { const M = await MP, E = await EP, { resources, hashes } = load(M.SF_HOUSING.evidence.map(e => e.resource));
  return E.createExecution(E.planMission(M.SF_HOUSING, { objective: M.SF_HOUSING.objective.en, agentIds: IDS, ...(opts.plan || {}) }), { resources: { ...resources, ...(opts.resources || {}) }, hashes: { ...hashes, ...(opts.hashes || {}) }, generate: opts.generate || null }).start(); };

test('the bundled specifications are valid, with registered agents', async () => {
  const M = await MP;
  for (const s of M.SPECS) assert.deepEqual(M.validateSpec(s, { agentIds: IDS }), [], s.id);
  assert.deepEqual(M.SPECS.map(s => [s.id, s.status]), [['mission.sf.mobility', 'executable'], ['mission.sf.housing-resilience', 'executable'], ['mission.oakland.signal-timing', 'blocked']]);
});

test('a specification cannot grant itself permissions, tools or resources, or skip human review', async () => {
  const M = await MP, base = M.SF_HOUSING, bad = (patch, re) => { const s = structuredClone(base); patch(s); const issues = M.validateSpec(s, { agentIds: IDS }); assert.ok(issues.some(i => re.test(i)), `${re} in ${issues.join(' | ')}`); };
  bad(s => { s.permissions = { network: true }; }, /unknown field “permissions”/);
  bad(s => { s.tasks[0].permission = 'network'; }, /task H1: unknown field “permission”/);
  bad(s => { s.tasks[0].tool = 'net.fetch'; }, /tool net.fetch is denied \(network\)/);
  bad(s => { s.tasks[0].tool = 'shell.exec'; }, /denied \(shell\)/);
  bad(s => { s.tasks[0].tool = 'custom.tool'; }, /unknown tool custom.tool/);
  bad(s => { s.evidence[0].resource = 'data/sf-housing/evictions-agg.json'; }, /not an approved bundled resource/);
  bad(s => { s.evidence[0].resource = '../../.env'; }, /not an approved bundled resource/);
  bad(s => { s.evidence = s.evidence.filter(e => e.resource !== 'data/sf-housing/pipeline.geojson'); }, /reads data\/sf-housing\/pipeline.geojson, which the specification does not cite/);
  bad(s => { s.evidence[0].license = 'All rights reserved'; }, /licence not approved/);
  bad(s => { s.review.required = false; }, /human review must be required/);
  bad(s => { s.review.autoApprove = true; }, /human review must be required/);
  bad(s => { s.tasks[1].optional = true; }, /only the local-model step may be optional/);
  bad(s => { s.agents.quality.agent = 'core.invented.agent'; }, /not a registered identity/);
  bad(s => { s.tasks[3].deps = ['H9']; }, /unknown dependency H9/);
  bad(s => { s.place.center = [10, 10]; }, /bounding box containing it/);
  bad(s => { s.type = 'anything'; }, /unknown mission type/);
  bad(s => { s.tasks = Array.from({ length: 11 }, (_, i) => ({ ...s.tasks[0], id: `X${i}` })); }, /1–10 tasks required/);
  const E = await EP, cyc = structuredClone(base); cyc.tasks[1].deps = ['H4'];
  assert.throws(() => E.createExecution(E.planMission(cyc, { objective: 'x' }), {}), /Dependency cycle/);
  assert.throws(() => E.planMission({ ...base, permissions: { network: true } }, { objective: 'x' }), /Specification rejected/);
});

test('the SF mobility mission is unchanged: same tasks, agents, inputs and results as R28', async () => {
  const E = await EP, M = await MP, plan = E.planSF({ work: WORK, objective: 'q' });
  assert.deepEqual(plan.tasks.map(t => [t.id, t.tool, t.deps.join(',')]), [['T1', 'geo.segment', ''], ['T2', 'records.inspect', ''], ['T3', 'evidence.readiness', 'T1'], ['T4', 'sim.compare', 'T1'], ['T5', 'sim.sweep', 'T1'], ['T6', 'evidence.compare', 'T2,T3,T4,T5'], ['T7', 'reason.hypotheses', 'T6'], ['T8', 'report.compose', 'T6,T7']]);
  const roles = { T1: 'geography', T2: 'discovery', T3: 'evidence', T4: 'quantitative', T5: 'quantitative', T6: 'reviewer', T7: 'planner', T8: 'reporter' };
  for (const t of plan.tasks) assert.equal(t.agent, WORK.run.tasks.find(x => x.role === roles[t.id]).agent, t.id);
  assert.deepEqual(plan.tasks[3].input.scenarios, WORK.run.findings.find(f => f.tool === 'calculate_scenarios').output.request.scenarios, 'defaults to the recorded run’s scenarios');
  assert.equal(plan.mission, 'mission.sf.mobility'); assert.equal(plan.recordedRun, WORK.run.id); assert.equal(plan.spec.id, M.SF_MOBILITY.id);
  const typed = E.planMission(M.SF_MOBILITY, { work: WORK, objective: 'q', values: { demand: 1200, green0: 40, green1: 60 } });
  assert.deepEqual(typed.tasks[3].input.scenarios.map(s => [s.parameters.demand, s.parameters.green]), [[1200, 0.4], [1200, 0.6]]);
  assert.deepEqual(typed.inputs.map(i => [i.id, i.value]), [['demand', 1200], ['green0', 40], ['green1', 60]]);
  const noModel = E.planSF({ work: WORK, objective: 'q', useModel: false }); assert.deepEqual(noModel.tasks.at(-1).deps, ['T6']); assert.ok(!noModel.tasks.some(t => t.id === 'T7'));
  const r = await E.createExecution(plan, { resources: { 'data/urban/catalog.json': CAT, 'data/intelligence/work.json': WORK } }).start();
  assert.equal(r.status, 'completed'); assert.equal(r.spec.id, 'mission.sf.mobility');
  assert.ok(r.conclusions.find(c => /uncalibrated exploratory model/.test(c.text)).basis.length === 2, 'conclusion linked to the two sim.compare computed outputs');
});

test('housing mission executes on the bundled snapshot with verified checksums and typed findings', async () => {
  const r = await housing();
  assert.equal(r.status, 'completed'); assert.equal(r.mission, 'mission.sf.housing-resilience'); assert.equal(r.reads.recordedRun, null);
  assert.deepEqual(r.tasks.map(t => `${t.id}:${t.status}`), ['H1:done', 'H2:done', 'H3:done', 'H4:done', 'H5:unavailable', 'H6:done']);
  assert.deepEqual(r.tasks.map(t => t.agent), ['core.san-francisco.data-science.quality.002', 'core.san-francisco.housing.pipeline.002', 'core.san-francisco.housing.production.001', 'core.san-francisco.ethics.fairness.002', 'core.san-francisco.housing.lead', 'core.san-francisco.housing.lead']);
  assert.equal(r.findings.filter(f => f.kind === 'source-evidence' && /checksum verified in this run/.test(f.text)).length, 3);
  const text = r.findings.map(f => f.text).join('\n');
  assert.match(text, /190 projects, 27009 units of which 10100 affordable; 41\.5 %/); assert.match(text, /\(-38\.2 %\)/); assert.match(text, /2026 excluded as incomplete/);
  assert.ok(r.findings.filter(f => f.kind === 'computed-output').every(f => f.uncertainty));
  assert.deepEqual(r.requirements.map(q => q.id), ['need', 'dates', 'review', 'gap-1']); assert.ok(r.requirements.slice(0, 3).every(q => q.raisedBy === 'mission specification'));
  assert.deepEqual(r.disagreements.map(d => d.subject), ['Does the affordable pipeline follow where affordable housing was recently completed?', 'Does concentration show where affordable housing is most needed?']);
  assert.ok(r.conclusions.every(c => c.status === 'proposed — awaiting human review') && !r.conclusions.some(c => /\b(proves?|validated|recommend|causes?)\b/i.test(c.text)));
  assert.ok(!r.calls.some(c => c.resources.includes('data/sf-housing/evictions-agg.json')), 'eviction notices are never read');
  assert.deepEqual(r.spec, { id: 'mission.sf.housing-resilience', version: 1, type: 'housing-distribution', category: 'housing', place: 'San Francisco (41 analysis neighbourhoods)', limitations: r.spec.limitations, review: r.spec.review });
  const r2 = await housing({ plan: { values: { top: 5, window: 3 } } });
  assert.match(r2.findings.find(f => f.tool === 'housing.pipeline').text, /in 5 neighbourhood\(s\)/); assert.match(r2.findings.find(f => f.tool === 'housing.production').text, /2020–2022: .*2023–2025/);
});

test('missing data, altered files and unavailable tools are reported, never worked around', async () => {
  const M = await MP, bad = await housing({ hashes: { 'data/sf-housing/pipeline.geojson': '0'.repeat(64) } });
  assert.equal(bad.tasks[0].status, 'failed'); assert.match(bad.tasks[0].error, /checksum mismatch/); assert.ok(bad.tasks.slice(1, 4).every(t => t.status === 'blocked'));
  assert.equal(bad.status, 'completed-with-failures'); assert.equal(bad.findings.filter(f => f.kind === 'computed-output').length, 0);
  const miss = await housing({ resources: { 'data/sf-housing/production-by-year.json': null } });
  assert.equal(miss.tasks[0].status, 'failed'); assert.match(miss.tasks[0].error, /production-by-year\.json is not loaded/); assert.deepEqual(miss.tasks.slice(1, 4).map(t => t.status), ['blocked', 'blocked', 'blocked']);
  assert.deepEqual(M.availability(M.SF_HOUSING, {}).missing.length, 4); assert.equal(M.availability(M.SF_HOUSING, {}).status, 'missing-data');
  const { resources } = load(M.SF_HOUSING.evidence.map(e => e.resource)); assert.equal(M.availability(M.SF_HOUSING, resources).status, 'available');
  const E = await EP; assert.throws(() => E.planMission(M.SF_HOUSING, { objective: 'x', values: { top: 99 } }), /top must be 1–10/); assert.throws(() => E.planMission(M.SF_HOUSING, { objective: 'x', values: { demand: 900 } }), /Unknown input demand/);
  const forged = structuredClone(M.SF_HOUSING); forged.tasks[1].input = { top: 99 };
  assert.equal(E.planMission(forged, { objective: 'x' }).tasks[1].input.top, 3, 'the mission type binds tool inputs; a specification cannot override them');
  const { createRegistry } = await import('../src/execution/tools.mjs'); assert.match((await createRegistry({ resources }).call('housing.pipeline', { top: 99 })).error, /top must be 1–10/, 'and the tool bounds its own input');
});

test('the Oakland specification is listed but blocked: no plan, no tool call', async () => {
  const M = await MP, E = await EP;
  assert.equal(M.availability(M.OAKLAND_MOBILITY).status, 'blocked'); assert.match(M.availability(M.OAKLAND_MOBILITY).reason, /No authorized Oakland street geometry/);
  assert.throws(() => E.planMission(M.OAKLAND_MOBILITY, { objective: 'x' }), /not executable: No authorized Oakland/);
  assert.ok(M.validateSpec({ ...M.OAKLAND_MOBILITY, tasks: M.SF_MOBILITY.tasks }).some(i => /blocked specification cannot declare tasks/.test(i)));
});

test('saved housing investigation keeps mission, class and provenance; review stays gated', async () => {
  const S = await SP, E = await EP, m = new Map(), st = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  const r = await housing(); assert.ok(S.saveReport(r, st).ok); const back = S.listReports(st)[0];
  await S.verifyReport(back); assert.equal(S.executionClass(back), 'deterministic');
  const ref = S.investigationRef(back);
  assert.equal(ref.mission, 'mission.sf.housing-resilience'); assert.equal(ref.recordedRun, null); assert.ok(ref.findings.every(f => f.ref.startsWith(`exec:${r.execution}#call:`)));
  assert.deepEqual([ref.validated, ref.approved], [false, false]);
  for (const a of ['accept-conclusions', 'propose-external-action', 'publish']) assert.equal(E.gate(back, a).allowed, false);
  const hyp = async msgs => { const id = /- (E\d+) \[computed-output\]/.exec(msgs[1].content)[1]; return { text: JSON.stringify({ hypotheses: [{ text: 'Pipeline concentration may reflect where large sites were available.', cites: [id], test: 'Site inventory by neighbourhood.' }] }), model: 'test-model' }; };
  const ai = await housing({ generate: hyp }); assert.equal(S.executionClass(ai), 'local-model'); assert.equal(ai.tasks.find(t => t.id === 'H5').status, 'done');
});
