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
  const rows = ratios.map((ratio, i) => ({ label: `Fixture ${i}`, base: 100, plan: ratio * 100, ratio }));
  const worst = rows.reduce((a, b) => a.ratio > b.ratio ? a : b);
  return { plan: E.basePlan(), rows, worst, worstRatio: worst.ratio, gain: 1 - rows[0].ratio };
}

test('permit states enforce degradation and gain thresholds on valid evidence', () => {
  assert.equal(E.issuePermit(evidence([0.9, 1.01])).state, 'SUSPENDU');
  assert.equal(E.issuePermit(evidence([0.96, 1])).state, 'BLOQUÉ');
  const ready = E.issuePermit(evidence([0.9, 1]));
  assert.equal(ready.state, 'PRÊT POUR SIGNATURE');
  assert.match(ready.signature, /signature humaine obligatoire/);
  assert.match(ready.signature, /CORE n’applique rien/);
  assert.match(ready.hypotheses.join(' '), /synthétique, non calibrée/);
  assert.deepEqual(ready, E.issuePermit(evidence([0.9, 1])));
});

test('stress cases compare a plan against the same reference demand', () => {
  const result = E.stressTest([E.basePlan()], ['evenement'])[0];
  assert.equal(result.rows.length, E.STRESS.length);
  assert.ok(result.rows.every(r => r.ratio === 1));
  assert.equal(E.issuePermit(result).state, 'BLOQUÉ');
});
