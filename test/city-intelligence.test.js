'use strict';
// R31 city intelligence: geographic linking through authorized analysis-neighbourhood boundaries, typed provenance
// (observed / recorded / computed / missing / hypothesis), no causal statements, compatibility with both missions,
// conflict detection only when present, local persistence of city summaries and human-review gating.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), crypto = require('node:crypto');
const CP = import('../src/execution/city.mjs'), EP = import('../src/execution/engine.mjs'), MP = import('../src/execution/missions.mjs'), SP = import('../src/execution/saved.mjs');
const loadAll = async () => { const C = await CP, resources = {}, hashes = {}; for (const p of C.CITY_RESOURCES) { const b = fs.readFileSync(p); resources[p] = JSON.parse(b); hashes[p] = crypto.createHash('sha256').update(b).digest('hex'); } return { resources, hashes }; };
const runs = async ({ resources, hashes }) => { const E = await EP, M = await MP;
  return [await E.createExecution(E.planSF({ work: resources['data/intelligence/work.json'], objective: 'q' }), { resources }).start(), await E.createExecution(E.planMission(M.SF_HOUSING, { objective: 'q' }), { resources, hashes }).start()]; };
const memStore = () => { const m = new Map(); return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const CAUSAL = /\b(causes?|caused by|leads? to|results? in|because of|drives?|increases traffic|reduces traffic)\b/i;

test('missions are linked through the authorized analysis-neighbourhood boundaries', async () => {
  const C = await CP, R = await loadAll(), ctx = C.cityContext({ ...R, reports: [] });
  assert.deepEqual(C.citySpecs('san-francisco').map(s => s.id), ['mission.sf.mobility', 'mission.sf.housing-resilience'], 'Oakland is not a San Francisco mission');
  assert.equal(ctx.boundary.checksum, 'verified'); assert.equal(ctx.boundary.features, 41); assert.equal(ctx.boundary.license, 'ODC Public Domain Dedication and License (PDDL)');
  const nb = R.resources['data/sf-housing/neighborhoods.geojson'];
  assert.equal(C.neighbourhoodOf([-122.396705178, 37.785542131], nb), 'Financial District/South Beach'); assert.equal(C.neighbourhoodOf([-122.6, 37.75], nb), null, 'the ocean is in no neighbourhood');
  const [mob, hou] = ctx.missions;
  assert.deepEqual(mob.link.neighborhoods, ['Financial District/South Beach']); assert.match(mob.link.method, /Point-in-polygon of the 2 endpoints of mapped approach 5660000/);
  assert.equal(hou.link.neighborhoods.length, 39); assert.equal(hou.link.unmatched, 0); assert.match(hou.link.method, /39 of 39 names match/);
  assert.deepEqual(ctx.overlaps.map(o => [o.neighborhood, o.missions, o.basis]), [['Financial District/South Beach', ['mission.sf.mobility', 'mission.sf.housing-resilience'], 'observed']]);
});

test('without boundaries, or with altered boundaries, no geographic link is claimed', async () => {
  const C = await CP, R = await loadAll();
  const none = C.cityContext({ resources: { ...R.resources, 'data/sf-housing/neighborhoods.geojson': null }, hashes: R.hashes });
  assert.equal(none.boundary.checksum, 'not loaded'); assert.deepEqual(none.overlaps, []); assert.ok(none.missions.every(m => m.link.basis === 'missing'));
  const bad = C.cityContext({ resources: R.resources, hashes: { ...R.hashes, 'data/sf-housing/neighborhoods.geojson': '0'.repeat(64) } });
  assert.equal(bad.boundary.checksum, 'mismatch'); assert.deepEqual(bad.overlaps, []); assert.equal(bad.facts.length, 0);
});

test('every statement is typed; relationships stay hypotheses and nothing is causal', async () => {
  const C = await CP, R = await loadAll(), [sf, h] = await runs(R), ctx = C.cityContext({ ...R, reports: [sf, h] });
  assert.ok(ctx.facts.length >= 2 && ctx.facts.every(f => ['observed', 'computed'].includes(f.basis) && f.refs.length));
  assert.match(ctx.facts.find(f => f.basis === 'observed').text, /^Financial District\/South Beach: 12 pipeline project\(s\), 3166 planned units of which 1358 affordable; 5784 net units completed since 2015 \(1244 affordable\)\.$/);
  assert.ok(ctx.facts.filter(f => f.basis === 'computed').every(f => f.refs[0].startsWith(`exec:${sf.execution}#call:`) && f.agent && f.uncertainty));
  assert.ok(ctx.opportunities.length && ctx.opportunities.every(o => ['hypothesis', 'missing'].includes(o.basis)));
  const link = ctx.opportunities.find(o => o.neighborhood); assert.match(link.text, /is untested: no bundled evidence links the two datasets, and no causal claim can be made/); assert.ok(link.needs.includes('Observed traffic measurements'));
  for (const t of [...ctx.facts.map(f => f.text), ...ctx.opportunities.map(o => o.text.replace('no causal claim', ''))]) assert.doesNotMatch(t, CAUSAL, t);
  assert.deepEqual(ctx.shared, [], 'the missions cite no common evidence file or dataset'); assert.deepEqual(ctx.sharedGaps.map(g => g.id), ['review']);
  assert.deepEqual(ctx.conflicts, [], 'no conflict is invented when none is present');
  assert.equal(ctx.review.status, 'awaiting-human-review');
});

test('agents keep ownership; recorded and executed contributions and disagreements are told apart', async () => {
  const C = await CP, R = await loadAll(), [sf, h] = await runs(R), ctx = C.cityContext({ ...R, reports: [sf, h] }), work = R.resources['data/intelligence/work.json'];
  const by = id => ctx.contributions.find(c => c.agent === id);
  for (const f of work.run.findings) assert.ok(by(f.agent).items.some(i => i.origin === 'recorded-run' && i.ref === `data/intelligence/work.json#${f.id}`), f.id);
  assert.ok(by('core.san-francisco.housing.pipeline.002').items.every(i => i.mission === 'mission.sf.housing-resilience' && i.origin === 'this-execution'));
  for (const f of [...sf.findings, ...h.findings].filter(f => f.origin === 'this-execution')) assert.ok(by(f.agent).items.some(i => i.ref === f.ref), f.ref);
  assert.equal(ctx.disagreements.length, sf.disagreements.length + h.disagreements.length);
  assert.ok(ctx.disagreements.every(d => d.execution && d.mission && d.positions.length >= 2 && /unresolved|recorded/.test(d.standing)));
  assert.ok(ctx.disagreements.some(d => d.recorded) && ctx.disagreements.some(d => !d.recorded));
});

test('compatible with partial state: no saved runs, one mission only, stale results detected', async () => {
  const C = await CP, R = await loadAll(), [sf, h] = await runs(R);
  const empty = C.cityContext({ ...R, reports: [] });
  assert.ok(empty.missions.every(m => !m.report)); assert.equal(empty.opportunities.filter(o => /No saved investigation of/.test(o.text)).length, 2);
  assert.deepEqual(empty.missions[1].requirements.map(q => [q.id, q.basis, q.from]), [['need', 'missing', 'specification'], ['dates', 'missing', 'specification'], ['review', 'missing', 'specification']]);
  assert.ok(C.cityContext({ ...R, reports: [sf, h] }).missions.every(m => m.requirements.every(q => q.basis === 'missing' && q.from === 'saved-run')), 'unmet requirements are gaps, never computed outputs');
  const one = C.cityContext({ ...R, reports: [sf] }); assert.equal(one.missions[0].report.execution, sf.execution); assert.equal(one.missions[1].report, null);
  const stale = structuredClone(h), row = stale.calls.find(c => c.tool === 'housing.pipeline').output.rows.find(r => r.neighborhood === 'Mission'); row.affordable += 7;
  const s = C.cityContext({ ...R, reports: [sf, stale] });
  assert.deepEqual(s.conflicts.map(c => c.kind), ['stale-result']); assert.match(s.conflicts[0].says, /recorded 1307 affordable units in Mission; the bundled data now gives 1300/);
});

test('city summaries persist locally, verify on reload and reference their investigations', async () => {
  const C = await CP, S = await SP, R = await loadAll(), [sf, h] = await runs(R), st = memStore();
  const sum = await C.citySummary(C.cityContext({ ...R, reports: [sf, h] }), { id: 'city-1', at: '2026-10-23T12:00:00Z' });
  await S.verifyCitySummary(JSON.parse(JSON.stringify(sum)));
  assert.deepEqual(sum.missions.map(m => m.report.execution), [sf.execution, h.execution]); assert.equal(sum.missions[0].report.digest, sf.digest);
  assert.deepEqual(S.saveCitySummary(sum, st), { ok: true }); assert.deepEqual(S.saveCitySummary(sum, st), { ok: true, already: true });
  assert.equal(S.listCitySummaries(st)[0].id, 'city-1'); assert.deepEqual([...st.m.keys()], ['core.city.v1']);
  const t = structuredClone(sum); t.opportunities[0].text = 'Housing causes traffic.'; await assert.rejects(S.verifyCitySummary(t), /digest mismatch/);
  const forged = structuredClone(sum); forged.approved = true; const { digest, ...rest } = forged; forged.digest = await S.digest(rest);
  await assert.rejects(S.verifyCitySummary(forged), /validation or approval code cannot grant/);
  const full = memStore(); full.setItem(S.CITY_KEY, JSON.stringify(Array.from({ length: S.MAX_CITY }, (_, i) => ({ ...sum, id: `c${i}` }))));
  assert.match(S.saveCitySummary({ ...sum, id: 'new' }, full).reason, /already saved; delete one/);
  assert.equal(S.deleteCitySummary('city-1', st), true); assert.equal(S.listCitySummaries(st).length, 0);
});

test('review request: existing lifecycle carries the city summary; nothing validated or approved', async () => {
  const C = await CP, S = await SP, R = await loadAll(), [sf, h] = await runs(R), STORE = await import('../src/contrib/store.mjs'), LC = await import('../src/contrib/lifecycle.mjs'), st = memStore();
  const sum = await C.citySummary(C.cityContext({ ...R, reports: [sf, h] }), { id: 'city-2' }), ref = S.cityRef(sum);
  assert.deepEqual(ref.investigations.map(i => i.execution), [sf.execution, h.execution]); assert.deepEqual([ref.validated, ref.approved], [false, false]);
  const e = STORE.save({ kind: 'question', title: 'City summary', text: 'Review the comparison.', mission: 'mission.sf.mobility', city: { ...ref, approved: true } }, st);
  assert.equal(STORE.list(st)[0].city.approved, false); assert.equal(STORE.list(st)[0].city.investigations.length, 2);
  const ev = S.cityLifecycleEvidence(ref); assert.deepEqual(ev.map(x => x.kind), ['recorded-agent-work', 'simulation', 'simulation']); assert.ok(ev[1].ref === `exec:${sf.execution}` && ev[0].source.includes(sum.digest));
  const LIFE = LC.createLifecycle(), owner = STORE.localOwner(st);
  const rec = await LIFE.create({ id: e.id, owner, mission: e.mission, reason: 'Draft from a saved city summary', evidence: [{ kind: 'user-claim', ref: e.id, source: 'this browser' }, ...ev] });
  await assert.rejects(LIFE.transition(rec, { id: owner, role: 'owner', mode: 'demonstration' }, 'RECOMMENDED', { reason: 'self' }), /not allowed|cannot set/);
  const p = LC.reviewPacket(rec, STORE.list(st)[0], { verification: await LIFE.verify(rec), cityCheck: { ok: true } });
  assert.equal(p.citySummary.id, 'city-2'); assert.equal(p.citySummary.digest, sum.digest); assert.equal(p.citySummary.summaryCheck.ok, true);
  assert.match(p.citySummary.meaning, /Relationships between missions are hypotheses; nothing is causal, validated, approved or decided/); assert.equal(p.agentInvestigation, null); assert.equal(p.lifecycle.state, 'DRAFT');
});
