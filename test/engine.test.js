const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');

test('seeded scenarios and evaluation are reproducible without mutating inputs', () => {
  const sc = E.makeScenario(['pointe', 'pluie']);
  const p = E.basePlan();
  const before = JSON.stringify({ sc, p });
  assert.deepEqual(sc, E.makeScenario(['pointe', 'pluie']));
  assert.notDeepEqual(sc.gen, E.makeScenario(['aleas']).gen);
  const first = E.evaluate(p, sc);
  assert.deepEqual(first, E.evaluate(p, sc));
  assert.equal(JSON.stringify({ sc, p }), before);
  for (const key of ['avgDelay', 'artTT', 'crossDelay', 'unserved', 'vehicles']) {
    assert.ok(Number.isFinite(first[key]) && first[key] >= 0, key);
  }
  assert.ok(first.vehicles > 0);
});

test('bounded builder/adversary orchestration repeats with fixed seeds', async () => {
  const options = { budget: 12, scenario: E.makeScenario() };
  const a = await E.searchPlans(options), b = await E.searchPlans(options);
  assert.deepEqual(a, b);
  assert.equal(a.ranked.length, 12);
  const candidates = a.ranked.slice(0, 2).map(r => r.plan);
  const refined = await E.robustRefine({ candidates, budget: 2 });
  assert.deepEqual(refined, await E.robustRefine({ candidates, budget: 2 }));
  assert.equal(refined.sims, 4 * E.STRESS.length);
  assert.ok(refined.ranked[0].worstRatio <= E.stressTest(candidates)[0].worstRatio);
  for (const { plan } of refined.ranked) {
    for (let i = 0; i < plan.g.length; i++) {
      assert.ok(plan.g[i] >= E.CORRIDOR.minArtGreen);
      assert.ok(plan.C - plan.g[i] - 2 * E.CORRIDOR.lost >= E.CORRIDOR.minCrossGreen);
    }
  }
});

function evidence(ratios) {
  const result = E.stressTest([E.basePlan()])[0];
  result.rows.forEach((r, i) => { r.ratio = ratios[i] ?? ratios[ratios.length - 1]; r.base = 100; r.plan = r.ratio * 100; });
  result.worst = result.rows.reduce((a, b) => b.ratio > a.ratio ? b : a);
  result.worstRatio = result.worst.ratio;
  result.gain = 1 - result.rows[0].ratio;
  return result;
}

test('permit thresholds: degradation suspends, small gain blocks, otherwise ready', () => {
  assert.equal(E.permitState(evidence([0.9, 1.01])).state, 'SUSPENDU');
  assert.equal(E.permitState(evidence([0.96, 1])).state, 'BLOQUÉ');
  assert.equal(E.permitState(evidence([0.9, 1])).state, 'PRÊT POUR SIGNATURE');
  // The same numbers were never produced by the engine for this plan: the gateway refuses them.
  assert.equal(E.issuePermit(evidence([0.9, 1])).state, 'BLOQUÉ');
});

test('engine-produced evidence keeps deterministic ready permits with mandatory human signature', () => {
  const ready = E.issuePermit(E.stressTest([E.greenWave(90, 0.6)])[0]);
  assert.equal(ready.state, 'PRÊT POUR SIGNATURE');
  assert.match(ready.signature, /signature humaine obligatoire/);
  assert.match(ready.signature, /CORE n’applique rien/);
  assert.match(ready.hypotheses.join(' '), /synthétique, non calibrée/);
  assert.deepEqual(ready, E.issuePermit(E.stressTest([E.greenWave(90, 0.6)])[0]));
});

test('stress cases compare a plan against the same reference demand', () => {
  const result = E.stressTest([E.basePlan()], ['evenement'])[0];
  assert.equal(result.rows.length, E.STRESS.length);
  assert.ok(result.rows.every(r => r.ratio === 1));
  assert.equal(E.issuePermit(result).state, 'BLOQUÉ');
});
