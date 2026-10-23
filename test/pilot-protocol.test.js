// Phase 14 readiness scaffolding on invented counts only: no SF measurement, no calibration claim.
const test = require('node:test'), assert = require('node:assert/strict');
const days = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09'];
async function fixture(P, counts = [100, 110, 90, 105, 120]) {
  const rows = [];
  days.forEach((d, i) => ['07:00', '07:15'].forEach((t, j) => rows.push({ start: `${d}T${t}:00-08:00`, end: `${d}T07:${j ? '30' : '15'}:00-08:00`, site: 'S1', direction: 'WB', mode: 'motor_vehicle', sourceId: 'core-synthetic', corridor: 'SYNTHETIC-NOT-SF', count: counts[i] + j * 10, unit: 'count' })));
  return { manifest: { version: 1, id: 'core-synthetic', kind: 'synthetic-fixture', corridor: 'SYNTHETIC-NOT-SF', sourceUrl: 'https://github.com/vincentleg/core', retrievedAt: '2026-10-14T00:00:00Z', rights: { status: 'VERIFIED', license: 'CORE-SYNTHETIC-FIXTURE', evidenceUrl: 'https://github.com/vincentleg/core', checkedAt: '2026-10-14T00:00:00Z' }, payloadSha256: P.payloadHash(rows) }, rows };
}
const plan = { id: 'synthetic-protocol', calibration: days.slice(0, 3), validation: [days[3]], holdout: [days[4]], thresholds: { maxWape: 0.2, maxAbsBias: 0.2 } };

test('pilot protocol: preregistration is hashed, disjoint and temporally ordered', async () => {
  const P = await import('../scripts/lib/pilot.mjs'), p = P.preregister(plan);
  assert.match(p.protocolSha256, /^[a-f0-9]{64}$/);
  assert.throws(() => P.preregister({ ...plan, validation: [days[0]] }), /disjoint/);
  assert.throws(() => P.preregister({ ...plan, calibration: [days[4]], holdout: [days[0]] }), /follow/);
  assert.throws(() => P.preregister({ ...plan, thresholds: { maxWape: -1 } }), /Thresholds/);
  const pkg = await fixture(P);
  assert.throws(() => P.partition(pkg, { ...p, thresholds: { maxWape: 0.9 } }, { allowSynthetic: true }), /altered/);
});

test('pilot protocol: partition never returns holdout rows and blocks unplanned days or fixtures by default', async () => {
  const P = await import('../scripts/lib/pilot.mjs'), p = P.preregister(plan), pkg = await fixture(P);
  assert.equal(P.partition(pkg, p).state, 'BLOCKED', 'synthetic fixture refused without explicit flag');
  const parts = P.partition(pkg, p, { allowSynthetic: true });
  assert.equal(parts.state, 'PARTITIONED'); assert.equal(parts.calibration.length, 6); assert.equal(parts.validation.length, 2);
  assert.deepEqual(Object.keys(parts.holdout).sort(), ['commitment', 'rows', 'sealed']); assert.equal(parts.holdout.rows, 2);
  assert.ok(!JSON.stringify(parts).includes(days[4]), 'no holdout row leaks through the partition');
  assert.equal(parts.calibrated, false); assert.equal(parts.authorizesRealWorld, false);
  const short = P.preregister({ ...plan, calibration: days.slice(0, 2) });
  assert.match(P.partition(pkg, short, { allowSynthetic: true }).issues[0], /outside the protocol/);
});

test('pilot protocol: frozen baseline is evaluated once against the sealed holdout; tampering and gaps fail closed', async () => {
  const P = await import('../scripts/lib/pilot.mjs'), p = P.preregister(plan), pkg = await fixture(P), parts = P.partition(pkg, p, { allowSynthetic: true });
  const base = P.meanBaseline(parts.calibration);
  assert.equal(base.table['S1|WB|motor_vehicle|07:00|900000'], 100, 'mean of calibration days only');
  const frozen = P.freeze(base, parts), r = P.evaluateHoldout(pkg, p, [frozen], { allowSynthetic: true });
  assert.equal(r.state, 'HOLDOUT_OPENED'); assert.equal(r.results[0].state, 'EVALUATED');
  assert.equal(r.results[0].mae, 20); assert.ok(Math.abs(r.results[0].wape - 40 / 250) < 1e-12);
  assert.equal(r.results[0].verdict, 'WITHIN_THRESHOLDS'); assert.equal(r.efficacyValidated, false); assert.equal(r.independentReview, false);
  const bad = await fixture(P, [100, 110, 90, 105, 400]), badParts = P.partition(bad, p, { allowSynthetic: true });
  assert.equal(P.evaluateHoldout(bad, p, [P.freeze(P.meanBaseline(badParts.calibration), badParts)], { allowSynthetic: true }).results[0].verdict, 'FAILED_THRESHOLDS', 'negative result reported, not hidden');
  assert.throws(() => P.evaluateHoldout(pkg, p, [{ ...frozen, model: { ...base, table: { ...base.table, x: 1 } } }], { allowSynthetic: true }), /frozen/);
  assert.throws(() => P.evaluateHoldout(bad, p, [frozen], { allowSynthetic: true }), /frozen/, 'model frozen on other data');
  assert.throws(() => P.evaluateHoldout(pkg, p, [P.freeze({ kind: 'candidate', table: base.table }, parts)], { allowSynthetic: true }), /baseline/);
  const gap = P.freeze({ kind: 'training-days-mean', table: { 'S1|WB|motor_vehicle|07:00|900000': 100 } }, parts);
  assert.equal(P.evaluateHoldout(pkg, p, [gap], { allowSynthetic: true }).results[0].state, 'NOT_EVALUABLE', 'missing prediction is never zero');
  const none = P.preregister({ ...plan, thresholds: null });
  const np = P.partition(pkg, none, { allowSynthetic: true });
  assert.equal(P.evaluateHoldout(pkg, none, [P.freeze(P.meanBaseline(np.calibration), np)], { allowSynthetic: true }).results[0].verdict, 'NO_PREREGISTERED_THRESHOLD');
});
