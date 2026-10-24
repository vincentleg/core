'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const REG = import('../src/execution/city-registry.mjs'), CITY = import('../src/execution/city.mjs'), MISSIONS = import('../src/execution/missions.mjs'), ENGINE = import('../src/execution/engine.mjs'), SAVED = import('../src/execution/saved.mjs');

test('only San Francisco has operational city intelligence; other cities cannot acquire SF evidence', async () => {
  const { CITIES, cityForMission } = await REG, C = await CITY;
  assert.equal(Object.keys(CITIES).length, 6);
  assert.deepEqual(Object.values(CITIES).filter(c => c.readiness === 'operational').map(c => c.id), ['san-francisco']);
  assert.deepEqual(C.citySpecs('san-francisco').map(m => m.id), CITIES['san-francisco'].missionIds);
  assert.ok(C.cityAgents('san-francisco').some(a => a.agent === 'core.san-francisco.housing.pipeline.002'));
  assert.ok(C.cityAgents('san-francisco').some(a => a.recordedRole === 'geography'));
  assert.equal(cityForMission('mission.oakland.signal-timing').id, 'oakland');
  assert.equal(cityForMission('mission.unknown.test'), null);
  for (const city of Object.values(CITIES).filter(c => c.id !== 'san-francisco')) {
    assert.equal(city.boundaries, undefined);
    assert.equal(city.agents, 'none');
    assert.deepEqual(C.cityAgents(city.id), []);
    const ctx = C.cityContext({ cityId: city.id, resources: { 'data/intelligence/work.json': { run: { findings: [{ agent: 'fake' }] } } } });
    assert.equal(ctx.readiness, city.readiness);
    assert.equal(ctx.boundary.loaded, false);
    assert.deepEqual(ctx.facts, []); assert.deepEqual(ctx.overlaps, []); assert.deepEqual(ctx.contributions, []);
    assert.ok(ctx.missions.every(m => m.availability === 'blocked' && m.report === null));
  }
});

test('city context is carried by known mission plans and references without changing older records', async () => {
  const E = await ENGINE, M = await MISSIONS, S = await SAVED;
  const plan = E.planMission(M.SF_HOUSING, { objective: 'Compare evidence' });
  assert.equal(plan.city, 'san-francisco');
  assert.throws(() => E.planMission(M.OAKLAND_MOBILITY, { objective: 'Try Oakland' }), /not executable/);
  const ref = S.cleanRef({ execution: 'one', digest: 'a'.repeat(64), mission: 'mission.sf.mobility', city: 'oakland', class: 'deterministic', mode: 'local-execution' });
  assert.equal(ref.city, null, 'a foreign city claim cannot be attached to an older report');
  assert.equal(S.cleanRef({ ...ref, city: 'san-francisco' }).city, 'san-francisco');
});
