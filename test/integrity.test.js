const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine');
const fixture = E.stressTest([E.greenWave(90, 0.6)])[0];
const copy = () => structuredClone(fixture);
function blocked(value, world) {
  const permit = E.issuePermit(value, world);
  assert.equal(permit.state, 'BLOQUÉ');
  assert.equal(permit.plan, null);
  assert.equal(permit.gainNominal, null);
  assert.deepEqual(permit.tests, []);
  assert.doesNotThrow(() => JSON.stringify(permit));
}

for (const bad of [NaN, Infinity, -Infinity, undefined, null, '0', -1]) {
  test(`invalid numeric evidence fails closed: ${String(bad)}`, () => {
    for (const key of ['base', 'plan', 'ratio']) { const st = copy(); st.rows[0][key] = bad; blocked(st); }
    // A negative nominal gain is legitimate only if consistent with degradation.
    for (const key of ['gain', 'worstRatio']) { const st = copy(); st[key] = bad; blocked(st); }
    for (const key of ['C', 'g', 'o']) { const st = copy(); if (key === 'C') st.plan.C = bad; else st.plan[key][0] = bad; blocked(st); }
  });
}

test('missing, sparse, duplicate and unknown stress cases fail closed', () => {
  for (const value of [undefined, null, {}, [], 0, 'result']) blocked(value);
  for (const key of ['plan', 'dependencies', 'rows', 'worst', 'worstRatio', 'gain']) { const st = copy(); delete st[key]; blocked(st); }
  for (const change of [
    st => st.rows.pop(), st => st.rows.push(st.rows[0]), st => { delete st.rows[0]; },
    st => { st.rows[1] = st.rows[0]; }, st => { st.rows[0].caseId = 99; },
    st => { st.rows[0].twists = ['unknown']; }, st => { st.rows[0].label = 'invented'; },
    st => { st.rows[0].base = 0; }, st => { st.rows[0].plan = 2701; },
    st => { st.rows[0].ratio += 0.1; }, st => { st.worstRatio += 0.1; },
    st => { st.gain = 0.99; }, st => { st.worst = st.rows.find(r => r.ratio !== st.worstRatio); },
    st => { st.plan.g = new Array(5); }, st => { st.plan.g[0] = st.plan.C; },
    st => { st.plan.o[0] = st.plan.C; }, st => { st.plan.C = 0; },
  ]) { const st = copy(); change(st); blocked(st); }
});

test('unknown, malformed and stale dependencies cannot authorize', () => {
  for (const d of [null, [], {}, { model: 'unknown', twists: [] }, { model: 'core-point-queue-v0' },
    { model: 'core-point-queue-v0', twists: ['unknown'] },
    { model: 'core-point-queue-v0', twists: ['pluie', 'pluie'] },
    { model: 'core-point-queue-v0', twists: [], missingSensor: null }]) {
    const st = copy(); st.dependencies = d; blocked(st);
  }
  const st = copy(); st.dependencies.twists = ['evenement']; blocked(st);
  blocked(copy(), { twists: ['evenement'] });
  blocked(copy(), null);
  blocked(copy(), { label: NaN });
  blocked({ get plan() { throw Error('bad accessor'); } });
});

test('scenario and plan mutations do not leak between simulations', () => {
  const sc = E.makeScenario(['chantier']), other = E.makeScenario(['chantier']), plan = E.basePlan();
  const sim = new E.Sim(plan, sc);
  sc.closed[0].i = 0; sc.gen.EB[0] = 0; plan.g[0] = 20;
  assert.equal(E.TWISTS.chantier.closed.i, 3);
  assert.equal(other.closed[0].i, 3);
  assert.equal(sim.plan.g[0], 42);
  assert.deepEqual(sim.run(), E.evaluate(E.basePlan(), other));
});

test('invalid scenarios reject before evaluation', () => {
  assert.throws(() => E.makeScenario(['unknown']), TypeError);
  assert.throws(() => E.makeScenario([], { closed: [{ i: -1, dir: 'EB' }] }), TypeError);
  for (const change of [sc => { sc.headway = NaN; }, sc => { sc.headway = 0; },
    sc => { sc.gen.EB[0] = Infinity; }, sc => { sc.gen.N[0][0] = -1; },
    sc => { sc.gen.EB = [10, 1]; }, sc => { sc.gen.S = []; }]) {
    const sc = E.makeScenario(); change(sc); assert.throws(() => E.evaluate(E.basePlan(), sc), TypeError);
  }
});

test('budgets, empty candidates and cancellation are bounded', async () => {
  for (const budget of [0, -1, NaN, Infinity, 1.5, 5001]) await assert.rejects(E.searchPlans({ budget, scenario: E.makeScenario() }), TypeError);
  await assert.rejects(E.robustRefine({ candidates: [] }), TypeError);
  await assert.rejects(E.robustRefine({ candidates: [E.basePlan()], budget: Infinity }), TypeError);
  const abort = new AbortController(); abort.abort();
  await assert.rejects(E.searchPlans({ budget: 1, scenario: E.makeScenario(), signal: abort.signal }), { name: 'AbortError' });
  const during = new AbortController();
  await assert.rejects(E.searchPlans({ budget: 2, scenario: E.makeScenario(), signal: during.signal, onProgress: () => during.abort() }), { name: 'AbortError' });
});

test('valid evidence retains deterministic statuses and exported plans are isolated', () => {
  const st = copy(); const p = E.issuePermit(st);
  assert.deepEqual(p, E.issuePermit(st));
  assert.notEqual(p.plan, null);
  p.plan.g[0] = -1;
  assert.equal(st.plan.g[0], fixture.plan.g[0]);
  const stress = E.stressTest([E.basePlan()], ['evenement'])[0];
  assert.equal(E.issuePermit(stress, { twists: ['evenement'] }).state, 'BLOQUÉ');
  assert.notEqual(E.issuePermit(stress).plan, null); // Valid but no improvement.
});

test('evidence is bound to its plan: swapped plans and fabricated consistent numbers fail closed', () => {
  const swapped = copy(); swapped.plan.o[1] = (swapped.plan.o[1] + 1) % swapped.plan.C; blocked(swapped);
  const fabricated = copy();
  fabricated.rows.forEach(r => { r.plan *= 0.5; r.ratio = r.plan / r.base; });
  fabricated.worst = structuredClone(fabricated.rows.reduce((a, b) => b.ratio > a.ratio ? b : a));
  fabricated.worstRatio = fabricated.worst.ratio; fabricated.gain = 1 - fabricated.rows[0].ratio;
  blocked(fabricated);
  const rebased = copy(); rebased.dependencies.twists = ['pluie']; blocked(rebased);
});
