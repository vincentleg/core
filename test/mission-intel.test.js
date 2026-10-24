'use strict';
// R27 mission intelligence: deterministic orchestration over the recorded SF mobility investigation. Identities and
// responsibilities, provenance and uncertainty labels, task dependencies and conflicts, recorded versus unavailable
// status, contribution links, human-review gating and browser-local privacy.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const json = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const MIP = import('../src/earth/mission-intel.mjs'), MVP = import('../src/earth/mission-intel-view.mjs');
const WORK = json('data/intelligence/work.json'), CAT = json('data/urban/catalog.json'), REG = json('data/agents/sf-civilization.json');
const ctxOf = async (work = WORK, ready = true) => {
  const MI = await MIP, { calibrationReadiness } = await import('../src/urban/tasks.mjs');
  return MI.buildMission({ work, readiness: ready ? calibrationReadiness(CAT, CAT.segments.find(s => s.id === '5660000')) : null });
};
const memStore = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('every responsibility is owned by registered agent identities that did the recorded tasks', async () => {
  const ctx = await ctxOf(), ids = new Set(REG.agents.map(a => a.id));
  assert.deepEqual(ctx.lanes.map(l => l.id), ['context', 'evidence', 'scenario', 'risk', 'review']);
  const owned = ctx.lanes.flatMap(l => l.steps.map(s => s.ref));
  assert.deepEqual(owned.sort(), WORK.run.tasks.map((_, i) => `T${i}`).sort(), 'each recorded task belongs to exactly one responsibility');
  for (const l of ctx.lanes) for (const o of l.owners) { assert.ok(ids.has(o), o); assert.ok(WORK.run.tasks.some(t => t.agent === o && l.steps.some(s => s.agent === o))); }
  assert.deepEqual(ctx.lanes.find(l => l.id === 'scenario').produced, ['F6', 'F7', 'F8']);
  assert.equal(ctx.mission, 'mission.sf.mobility'); assert.equal(ctx.run.id, WORK.run.id);
  assert.equal(ctx.segment.id, '5660000'); assert.equal(ctx.segment.place, 'San Francisco');
});

test('findings and claims carry provenance labels; nothing is promoted from assumption to fact', async () => {
  const ctx = await ctxOf(), F = Object.fromEntries(ctx.findings.map(f => [f.id, f]));
  assert.equal(F.F2.kind, 'source'); assert.equal(F.F2.checked, true); assert.match(F.F2.source.sha256, /^[0-9a-f]{64}$/);
  assert.equal(F.F6.kind, 'source'); assert.equal(F.F6.checked, false, 'no recorded validation checked F6');
  assert.equal(F.F8.kind, 'computed'); assert.equal(F.F8.calibrated, false); assert.match(F.F8.limits, /assumptions/);
  for (const id of ['F1', 'F3', 'F4', 'F5']) assert.equal(F[id].kind, 'observation');
  assert.equal(ctx.claims.length, WORK.run.tasks.reduce((n, t) => n + (t.output?.claims || []).length, 0));
  assert.ok(ctx.claims.every(c => c.kind === 'hypothesis'), 'every recorded claim stays a model-generated hypothesis');
  assert.ok(ctx.claims.every(c => ['cited', 'uncited', 'unverified', 'contradicted'].includes(c.status)));
  const byId = Object.fromEntries(ctx.claims.map(c => [c.id, c]));
  assert.equal(byId['T5.C0'].status, 'contradicted'); assert.match(byId['T5.C0'].notes[0], /published by San Francisco/);
  for (const f of WORK.narrativeFlags) assert.ok(ctx.claims.filter(c => c.text === f.text).every(c => c.status === 'unverified'));
  const numeric = ctx.claims.filter(c => c.numbers); assert.equal(numeric.length, 5); assert.ok(numeric.every(c => c.numbers.unmatched.length === 0 && c.numbers.matched.includes(6) && c.numbers.matched.includes(9)));
  for (const c of ctx.claims) { const [, i, j] = /^T(\d+)\.C(\d+)$/.exec(c.id); assert.equal(c.text, WORK.run.tasks[i].output.claims[j].text, 'recorded text is never edited'); }
  // A claim whose numbers do not match the computation is downgraded, not trusted.
  const bent = structuredClone(WORK); bent.run.tasks[3].output.claims[0].text = bent.run.tasks[3].output.claims[0].text.replace('6 seconds', '60 seconds');
  const c2 = (await ctxOf(bent)).claims.find(c => c.id === 'T3.C0'); assert.equal(c2.status, 'unverified'); assert.deepEqual(c2.numbers.unmatched, [60]);
});

test('building the mission does not mutate the published record', async () => {
  const copy = structuredClone(WORK); await ctxOf(copy); assert.deepEqual(copy, WORK);
});

test('collaboration: citation-derived dependencies, record-supported conflicts, blocked and awaiting tasks, no consensus', async () => {
  const ctx = await ctxOf(), lane = id => ctx.lanes.find(l => l.id === id);
  assert.deepEqual(lane('scenario').dependsOn, ['evidence']); assert.deepEqual(lane('evidence').dependsOn, []);
  assert.deepEqual(lane('risk').dependsOn.sort(), ['evidence', 'scenario']);
  assert.deepEqual(ctx.conflicts.map(c => c.kind), ['location', 'verification', 'verification', 'next-step']);
  const loc = ctx.conflicts[0]; assert.deepEqual(loc.positions.map(p => p.ref), ['T5.C0', 'F6']);
  const next = ctx.conflicts.at(-1); assert.ok(next.positions.some(p => /pilot/i.test(p.says)) && next.positions.some(p => /before/i.test(p.says)) && next.positions.some(p => p.ref === 'readiness'));
  assert.ok(ctx.conflicts.every(c => c.resolved === false));
  assert.equal(lane('evidence').status, 'blocked'); assert.equal(lane('scenario').status, 'blocked'); assert.equal(lane('review').status, 'awaiting-human'); assert.equal(lane('risk').status, 'awaiting-human');
  assert.deepEqual(ctx.actions.map(a => a.status).sort(), ['awaiting-human', ...Array(6).fill('blocked')]);
  assert.equal(ctx.readiness.met, 1); assert.equal(ctx.approved, false); assert.equal(ctx.executing, false);
  assert.doesNotMatch(JSON.stringify(ctx), /"(consensus|vote|votes|approvedBy)"/);
  assert.deepEqual(ctx.log.map(l => l.id), ['load', 'findings', 'claims', 'numbers', 'conflicts', 'lanes', 'actions', 'review']);
  assert.match(ctx.log.at(-1).detail, /No consensus, vote, approval/);
});

test('agent memory references recorded steps and events only and says it is not executing', async () => {
  const MI = await MIP, ctx = await ctxOf(), m = MI.memory(ctx, WORK, 'core.san-francisco.housing.lead');
  assert.equal(m.current, 'not executing'); assert.equal(m.lane, 'scenario');
  assert.deepEqual(m.history.map(h => h.ref), ['data/intelligence/work.json#task:3']);
  const ev = WORK.events.filter(e => e.agent === 'core.san-francisco.housing.lead' && ['tool_completed', 'tool_rejected', 'delegation'].includes(e.kind));
  assert.deepEqual(m.events.map(e => e.ref), ev.map(e => `data/intelligence/work.json#event:${e.id}`));
  assert.ok(m.events.every((e, i) => e.at === ev[i].at));
  assert.deepEqual(m.findings, ['F6', 'F7', 'F8']); assert.equal(m.next.id, 'A:calibration');
  assert.equal(MI.memory(ctx, WORK, REG.agents.find(a => !WORK.run.tasks.some(t => t.agent === a.id)).id), null, 'no memory is invented for an agent without recorded work');
});

test('recorded versus unavailable: missing readiness or records are labelled, never assumed', async () => {
  const MI = await MIP, MV = await MVP, ctx = await ctxOf(WORK, false);
  assert.equal(ctx.readiness, null); assert.equal(ctx.actions.length, 0); assert.ok(ctx.questions.every(q => !q.id.startsWith('R:')));
  assert.match(ctx.log.find(l => l.id === 'actions').detail, /unavailable .* none is assumed met/);
  const h = MV.missionHTML(ctx); assert.match(h, /its items are unavailable, not met/); assert.match(h, /Unavailable: calibration readiness not loaded/);
  assert.equal(MI.buildMission({ work: null }), null); assert.match(MV.missionHTML(null), /No recorded investigation is available/);
  const AR = await import('../src/earth/agent-records.mjs'), ix = AR.buildIndex({ registry: REG.agents, work: WORK });
  for (const l of ctx.lanes) for (const o of l.owners) assert.equal(AR.executionClass(ix, o, 'working'), 'recorded', 'never live');
  const full = MV.missionHTML(await ctxOf());
  assert.match(full, /no agent is running/); assert.match(full, /rule-based code, not autonomous AI reasoning/);
  assert.equal(MV.agentBriefHTML(await ctxOf(), WORK, 'core.nobody'), '');
});

test('the agent brief and mission view expose identity, provenance, journey actions and escape record text', async () => {
  const MV = await MVP, ctx = await ctxOf();
  const b = MV.agentBriefHTML(ctx, WORK, 'core.san-francisco.geotech.lead');
  for (const s of ['Geographic context and infrastructure', 'Blocked: authorized data missing', 'Recorded role', 'Depends on', 'Open questions', 'Proposed next action', 'Related agents', 'recorded memory', 'data-intel="mission.sf.mobility"']) assert.ok(b.includes(s), s);
  assert.equal((b.match(/class="primary/g) || []).length, 1, 'one primary action');
  const h = MV.missionHTML(ctx, { needs: ['Independent expert review'], segmentCenter: [-122.39, 37.78] });
  for (const s of ['Problem definition', 'Geographic context', 'Available evidence', 'Hypotheses', 'Analysis and simulator outputs', 'Uncertainties and conflicts', 'Candidate next actions', 'Human review requirements']) assert.ok(h.includes(s), s);
  for (const s of ['data-urban="workbench"', 'data-intel-fly="-122.39,37.78"', 'data-contribute="mission.sf.mobility" data-relates="R:measurements"', 'data-relates="X1"', 'href="me.html#contributions"', 'Human review is mandatory', 'How this summary was assembled']) assert.ok(h.includes(s), s);
  const evil = structuredClone(WORK); evil.run.question = '<img src=x onerror=alert(1)>'; evil.run.tasks[0].output.claims[0].text = '<script>x</script>';
  const e = MV.missionHTML(await ctxOf(evil)); assert.doesNotMatch(e, /<img src=x|<script>x/);
});

test('contributions link to a mission item by snapshot, stay browser-local and are never "analysed"', async () => {
  const MI = await MIP, ctx = await ctxOf(), STORE = await import('../src/contrib/store.mjs'), LC = await import('../src/contrib/lifecycle.mjs');
  const link = MI.linkTarget(ctx, 'R:measurements');
  assert.deepEqual([link.kind, link.lane, link.analysedByAgents, link.run], ['question', 'evidence', false, WORK.run.id]);
  assert.deepEqual(link.owners, ['core.san-francisco.regulatory.lead', 'core.san-francisco.climate.lead']);
  assert.equal(MI.linkTarget(ctx, 'nope'), null); assert.equal(MI.linkTarget(null, 'R:measurements'), null);
  assert.equal(MI.linkTarget(ctx, 'X1').kind, 'conflict'); assert.equal(MI.linkTarget(ctx, 'F8').kind, 'finding');
  assert.equal(MI.cleanLink({ ...link, kind: 'approval' }), null); assert.equal(MI.cleanLink({ ...link, analysedByAgents: true }).analysedByAgents, false);
  const st = memStore(), text = 'Buses queue at Folsom and 5th each morning.';
  const e = STORE.save({ kind: 'observation', title: 'Bus queue', text, mission: 'mission.sf.mobility', relates: link }, st);
  assert.deepEqual(e.relates, MI.cleanLink(link)); assert.equal(e.state, 'private');
  assert.equal(STORE.list(st)[0].relates.ref, 'R:measurements');
  assert.equal(STORE.save({ kind: 'observation', title: 'x', text: 'y', relates: { evil: 1 } }, st).relates, null);
  // The review request carries the link for the same mission only, and the lifecycle state is unchanged.
  const owner = STORE.localOwner(st), L = LC.createLifecycle(), rec = await L.create({ id: e.id, owner, mission: e.mission, reason: 'test', evidence: [{ kind: 'user-claim', ref: e.id, source: 'this browser' }] });
  const p = LC.reviewPacket(rec, e, { verification: await L.verify(rec), related: null });
  assert.equal(p.contribution.relatesTo.ref, 'R:measurements'); assert.equal(p.contribution.relatesTo.analysedByAgents, false); assert.equal(p.lifecycle.state, rec.state);
  assert.equal(LC.reviewPacket(rec, { ...e, relates: { ...link, mission: 'mission.sf.housing' } }, { verification: null }).contribution.relatesTo, null);
  assert.ok(!JSON.stringify(link).includes(text), 'the public link never holds the contribution text');
});

test('human review stays mandatory: the owner cannot approve, and a link changes no recorded finding', async () => {
  const LC = await import('../src/contrib/lifecycle.mjs'), L = LC.createLifecycle();
  const rec = await L.create({ id: 'c1', owner: 'local.a', mission: 'mission.sf.mobility', reason: 'test', evidence: [{ kind: 'user-claim', ref: 'c1', source: 'this browser' }] });
  const sub = await L.transition(rec, { id: 'local.a', role: 'owner', mode: 'demonstration' }, 'SUBMITTED', { reason: 'x', consent: { review: true } });
  for (const to of ['UNDER_REVIEW', 'RECOMMENDED', 'APPROVED_FOR_TRANSMISSION']) await assert.rejects(L.transition(sub, { id: 'local.a', role: 'owner', mode: 'demonstration' }, to, { reason: 'x' }));
  await assert.rejects(L.transition(sub, { id: 'r1', role: 'reviewer', mode: 'authenticated' }, 'UNDER_REVIEW', { reason: 'x' }), 'no verifier in the browser');
  const before = JSON.stringify((await ctxOf()).findings); (await MIP).linkTarget(await ctxOf(), 'F8'); assert.equal(JSON.stringify((await ctxOf()).findings), before);
});

test('privacy and wiring: pure modules, published files, Earth journey hooks', async () => {
  for (const f of ['src/earth/mission-intel.mjs', 'src/earth/mission-intel-view.mjs']) {
    const src = fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(src, /\.core-local|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|ollama|enableReasoning|CIV\.submit/, f);
  }
  const { FILES } = await import('../scripts/public-manifest.mjs');
  for (const f of ['src/earth/mission-intel.mjs', 'src/earth/mission-intel-view.mjs']) assert.ok(FILES.includes(f), `${f} is published`);
  const app = fs.readFileSync('src/earth/app.mjs', 'utf8');
  assert.match(app, /\[data-intel\],\[data-intel-fly\],\[data-mi-jump\]/); assert.match(app, /showContribute\(t\.dataset\.contribute, t\.dataset\.relates \|\| null\)/);
  assert.match(app, /intelBrief\(id\)/); assert.match(app, /h\.get\('intel'\) === MI\.MISSION/);
  assert.match(fs.readFileSync('src/me/me.mjs', 'utf8'), /MV\.linkHTML\(e\.relates\?\.mission === r\.mission/);
  const { execFileSync } = require('node:child_process');
  for (const f of ['src/earth/app.mjs', 'src/me/me.mjs', 'src/earth/mission-intel.mjs', 'src/earth/mission-intel-view.mjs', 'src/contrib/store.mjs', 'src/contrib/lifecycle.mjs']) execFileSync(process.execPath, ['--check', f]);
});
