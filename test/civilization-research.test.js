const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const catalog = () => JSON.parse(fs.readFileSync('data/research/civilization.json'));
test('energy accounting preserves SI units, leap-year duration and logarithmic convention', async () => {
  const R = await import('../scripts/lib/civilization-research.mjs');
  assert.equal(R.averagePower(3600, 3600), 1);
  assert.equal(R.saganIndex(1e16), 1); assert.equal(R.saganIndex(1e26), 2); assert.equal(R.saganIndex(1e36), 3);
  const r = R.energyScenario(592, 366);
  assert.ok(Math.abs(r.averageWatts / 1e12 - 18.72090669905) < 1e-10);
  assert.ok(r.index > 0.72 && r.index < 0.74); assert.equal(r.civilizationRank, null); assert.equal(r.efficacyValidated, false); assert.equal(r.authorizesRealWorld, false);
  for (const x of [0, -1, NaN, Infinity, '592']) assert.throws(() => R.energyScenario(x, 366));
  assert.throws(() => R.energyScenario(Number.MAX_VALUE, 366));
});
test('research provenance fails closed for missing references, duplicates, stale reviews and invalid dates', async () => {
  const { validateResearch } = await import('../scripts/lib/civilization-research.mjs');
  const now = '2026-10-15'; assert.equal(validateResearch(catalog(), { now }).state, 'VALIDATED_PROVENANCE');
  for (const mutation of [c => c.claims[0].sources.push('missing'), c => c.sources.push(c.sources[0]), c => c.sources[0].checkedOn = '2026-02-30', c => c.sources[0].checkedOn = '2030-01-01', c => c.sources[0].url = 'http://example.invalid', c => c.claims[0].kind = 'verified-impact', c => delete c.claims[0].limitations]) {
    const c = catalog(); mutation(c); assert.equal(validateResearch(c, { now }).state, 'BLOCKED');
  }
  assert.equal(validateResearch(catalog(), { now: '2040-01-01' }).state, 'BLOCKED');
});
test('research uses existing read-only knowledge retrieval without changing agent collections', async () => {
  const R = await import('../scripts/lib/civilization-research.mjs'), KNOW = require('../src/knowledge.js');
  const k = R.researchKnowledge(catalog(), { now: '2026-10-15' });
  const hits = KNOW.retrieve(k, 'waste heat', { now: '2026-10-15' });
  assert.ok(hits.some(h => h.id === 'research-thermodynamics' && h.limitations && h.citation));
  assert.equal(k.lib.collections, undefined);
  const bad = catalog(); bad.claims[0].sources = ['missing']; assert.throws(() => R.researchKnowledge(bad));
});
