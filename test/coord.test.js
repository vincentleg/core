const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const C = require('../src/coord');
const E = require('../src/engine');

const DIR = path.join(__dirname, '..', 'data', 'sf');
function snapshot() {
  const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8')), data = {}, verified = {};
  for (const d of manifest.datasets) {
    const text = fs.readFileSync(path.join(DIR, d.file), 'utf8'), key = d.file.replace(/\.geojson$/, '');
    data[key] = JSON.parse(text); verified[key] = crypto.createHash('sha256').update(text).digest('hex') === d.sha256 ? 'ok' : 'mismatch';
  }
  return { manifest, data, verified };
}
const real = snapshot();
const ctx = C.buildContext(real);
const runA = C.run(ctx);
const clone = x => JSON.parse(JSON.stringify(x));
const readyId = () => Object.entries(runA.result.decisions).find(([, d]) => d.decision.state === 'PRÊT POUR REVUE HUMAINE')[0];
const proposal = () => clone(runA.result.decisions[readyId()].proposal);
const blocked = (p, c = ctx) => { const d = C.issueCoordinationProposal(p, c); assert.equal(d.state, 'BLOQUÉ'); assert.equal(d.recommendation, null); assert.equal(d.authorizes, false); return d; };

test('temporal primitives: inclusive overlap and contiguous union', () => {
  assert.equal(C.overlap({ s: 1, e: 10 }, { s: 10, e: 20 }), 1);
  assert.equal(C.overlap({ s: 1, e: 9 }, { s: 10, e: 20 }), 0);
  assert.deepEqual(C.mergeIntervals([{ s: 10, e: 12 }, { s: 1, e: 3 }, { s: 4, e: 5 }, { s: 8, e: 9 }]), [{ s: 1, e: 5 }, { s: 8, e: 12 }]);
  assert.equal(C.ds(C.dn('2026-10-13')), '2026-10-13');
});

test('spatial checks use CNN topology and geometry distance', () => {
  const seg = '7051000', cnns = C.groupCnns(ctx, seg);
  assert.equal(cnns.length, 3);
  assert.ok(cnns.every(c => ctx.segments.has(c) || ctx.nodes.has(c)));
  const line = ctx.segments.get(seg).geometry;
  assert.ok(C.distanceToGeometry(line.coordinates[0], line) < 1);
  assert.ok(C.distanceToGeometry([line.coordinates[0][0] + 0.01, line.coordinates[0][1]], line) > 500);
  const { records, excluded } = C.groupRecords(ctx, seg, C.DEFAULTS);
  assert.ok(records.length > 0);
  assert.equal(new Set(records.map(r => r.permit_number)).size, records.length, 'one record per permit number in a group');
  for (const e of excluded) assert.ok(e.reasons.length);
});

test('agents process real records deterministically and reproducibly', () => {
  const runB = C.run(C.buildContext(snapshot()));
  assert.equal(runA.result.fingerprint, runB.result.fingerprint);
  assert.equal(C.traceFingerprint(runA.events), C.traceFingerprint(runB.events));
  assert.ok(runA.events.length > 50);
  const agents = new Set(runA.events.map(e => e.agent));
  for (const a of C.AGENTS) assert.ok(agents.has(a.id), `agent ${a.id} emitted events`);
  assert.ok(runA.events.every(e => e.kind === 'deterministic' && Number.isInteger(e.seq) && typeof e.text === 'string'));
  assert.deepEqual(runA.events.map(e => e.seq), runA.events.map((_, i) => i + 1));
  const f = runA.result.findings;
  assert.ok(f.some(x => x.type === 'opportunity') && f.some(x => x.type === 'overlap'));
  for (const x of f) {
    assert.ok(ctx.segments.has(x.seg));
    for (const id of x.records) assert.ok(ctx.byRecord.has(`permits:${id}`), `finding cites a real record ${id}`);
    assert.ok(x.evidence && x.evidence.method && x.evidence.snapshot.date === ctx.asOf);
  }
});

test('trace replay is the same event sequence and re-execution verifies it', () => {
  const t = C.trace(runA.events);
  assert.ok(t.every(e => !('result' in e)));
  assert.equal(C.traceFingerprint(t), C.traceFingerprint(runA.events));
  const replayed = JSON.parse(JSON.stringify(t));
  assert.equal(C.fingerprint(replayed), C.traceFingerprint(C.run(ctx).events));
});

test('scenarios respect declared constraints and never move fixed permits', () => {
  for (const [, a] of Object.entries(runA.result.analyses)) {
    const base = a.base;
    for (const s of a.result.scenarios) {
      if (s.id === 'S0') { assert.ok(s.windows.every(w => w.shift === 0)); continue; }
      if (s.violations.length) continue;
      for (const w of s.windows) {
        const o = base.find(b => b.record_id === w.record_id);
        assert.equal(C.dn(w.end) - C.dn(w.start), o.e - o.s, 'duration preserved');
        if (o.fixed.length) assert.equal(w.shift, 0, 'fixed permit unchanged');
        assert.ok(Math.abs(w.shift) <= C.DEFAULTS.maxShiftDays);
        if (w.shift) assert.ok(C.dn(w.start) >= ctx.asOfN + C.DEFAULTS.leadDays);
      }
    }
    assert.equal(a.result.scenarios.length, 5);
  }
});

test('scenario generator on a synthetic fixture: overlap removal, shared window, closure avoidance', () => {
  const d = C.dn('2026-10-13'), opts = { ...C.DEFAULTS };
  const W = (id, agent, s, len, fixed = []) => ({ record_id: id, permit_number: id, agent, cnn: '1', type: 'Excavation', status: 'APPROVED', start: C.ds(d + s), end: C.ds(d + s + len - 1), s: d + s, e: d + s + len - 1, dur: len, fixed });
  const base = [W('A', 'Org A', 10, 10, ['actif']), W('B', 'Org B', 15, 10)];
  const env = { asOfN: d, closures: [{ record_id: 'c', cnn: '1', s: d + 30, e: d + 33 }], moratoria: [], programmeDays: 90, programmeInOccupation: false };
  const s3 = C.scenario('S3', base, env, opts), b3 = s3.find(w => w.record_id === 'B');
  assert.equal(b3.s, d + 20, 'S3 moves B just after A');
  assert.equal(C.evaluate(s3, env).overlapPairs, 0);
  const s2 = C.scenario('S2', base, env, opts);
  assert.equal(C.evaluate(s2, env).overlapDays, 10, 'S2 aligns B with A');
  const late = [W('A', 'Org A', 10, 10, ['actif']), W('B', 'Org B', 28, 5)];
  const s4 = C.scenario('S4', late, env, opts);
  assert.equal(C.evaluate(s4, env).closureConflictDays, 0);
  assert.ok(C.evaluate(late, env).closureConflictDays > 0);
  const res = C.evaluateScenarios(late, env, opts);
  assert.ok(res.recommended, 'a closure-avoiding reschedule dominates the baseline');
  assert.equal(C.violations(late, [{ ...late[0], s: late[0].s + 1, e: late[0].e + 1 }, late[1]], env, opts).length, 1, 'moving a fixed permit is a violation');
});

test('coordination gateway: valid real proposal is ready for human review, never an authorization', () => {
  const d = C.issueCoordinationProposal(proposal(), ctx);
  assert.equal(d.state, 'PRÊT POUR REVUE HUMAINE');
  assert.equal(d.authorizes, false);
  assert.match(d.humanReview, /Revue humaine obligatoire/);
  assert.match(d.humanReview, /n’autorise ni n’applique/);
  assert.ok(d.checks.every(c => c.pass));
  assert.ok(d.conditions.length >= 5);
  const fragile = Object.values(runA.result.decisions).find(x => x.decision.state === 'SUSPENDU');
  if (fragile) assert.ok(fragile.decision.checks.some(c => c.id === 'robust' && !c.pass));
});

test('coordination gateway blocks missing, unverifiable, altered or inconsistent evidence', () => {
  for (const bad of [null, undefined, {}, 'x', 42, []]) blocked(bad);
  const del = proposal(); delete del.evidence; blocked(del);
  const extra = proposal(); extra.signedBy = 'agent'; blocked(extra);
  const unknownSeg = proposal(); unknownSeg.finding.seg = '999'; blocked(unknownSeg);
  const missingRec = proposal(); missingRec.evidence.records[0].record_id = 'NOPE@1'; blocked(missingRec);
  const date = proposal(); date.evidence.records[0].end = '2099-01-01'; blocked(date);
  const swapped = proposal(); swapped.evidence.records[0].start = swapped.evidence.records[0].end; swapped.evidence.records[0].end = '2020-01-01'; blocked(swapped);
  const org = proposal(); org.evidence.records[0].agent = 'Someone Else LLC'; blocked(org);
  const sha = proposal(); sha.evidence.snapshot.datasets.permits.sha256 = '0'.repeat(64); blocked(sha);
  const unverified = C.buildContext({ ...real, verified: { ...real.verified, permits: 'mismatch' } });
  blocked(proposal(), unverified);
  const geo = proposal(); geo.evidence.records[0].cnn = '5660000'; blocked(geo);
  const metric = proposal(); metric.baseline.overlapPairs += 1; blocked(metric);
  const mode = proposal(); mode.mode = 'reschedule'; blocked(mode);
  const sched = proposal(); sched.scenario = { id: 'S1', windows: [], metrics: {} }; blocked(sched);
  const adv = proposal(); adv.adversarial = adv.adversarial.map(r => ({ ...r, pass: !r.pass })); blocked(adv);
  const params = proposal(); params.params.maxShiftDays = -5; blocked(params);
});

test('coordination gateway blocks schedule changes that violate constraints or recomputation', () => {
  // Build a reschedule proposal on a fixture context where a closure-avoiding scenario dominates.
  const fx = clone(real.data), asOf = real.manifest.generated_at.slice(0, 10), d = C.dn(asOf);
  const seg = fx.corridor.features[0], node = seg.properties.f_node_cnn, pt = seg.geometry.coordinates[0];
  const mk = (n, agent, s, len, status = 'APPROVED') => ({ type: 'Feature', geometry: { type: 'Point', coordinates: pt }, properties: { kind: 'permit', record_id: `${n}@${node}`, permit_number: n, permit_type: 'Excavation', status, status_class: 'active', street: 'X', cnn: node, agent, start: C.ds(d + s), end: C.ds(d + s + len - 1) } });
  fx.permits.features = [mk('FX-1', 'Org A', 10, 10, 'ACTIVE'), mk('FX-2', 'Org B', 28, 5)];
  fx.closures.features = [{ type: 'Feature', geometry: seg.geometry, properties: { record_id: 'CL1', cnn: seg.properties.cnn, case_name: 'Event', status: 'Permitted', start: C.ds(d + 30), end: C.ds(d + 33) } }];
  const fctx = C.buildContext({ manifest: real.manifest, data: fx, verified: real.verified });
  const r = C.run(fctx), id = `opportunity:${seg.properties.cnn}`, dec = r.result.decisions[id];
  assert.ok(dec, 'fixture produces an opportunity');
  assert.equal(dec.proposal.mode, 'reschedule');
  assert.ok(['PRÊT POUR REVUE HUMAINE', 'SUSPENDU'].includes(dec.decision.state));
  assert.equal(dec.decision.recommendation.type, 'reschedule');
  const viol = clone(dec.proposal); const mw = viol.scenario.windows.find(w => w.shift); mw.start = C.ds(C.dn(mw.start) + 60); mw.end = C.ds(C.dn(mw.end) + 60);
  const v = blocked(viol, fctx); assert.ok(v.checks.some(c => c.id === 'constraints' && !c.pass));
  const fixedMoved = clone(dec.proposal); const fw = fixedMoved.scenario.windows.find(w => w.fixed.length); fw.start = C.ds(C.dn(fw.start) + 1); fw.end = C.ds(C.dn(fw.end) + 1); blocked(fixedMoved, fctx);
  const tampered = clone(dec.proposal); tampered.scenario.metrics.closureConflictDays = 0; tampered.scenario.metrics.overlapDays = 999; blocked(tampered, fctx);
});

test('existing traffic permit gateway is unchanged', () => {
  const st = E.stressTest([E.greenWave(90, 0.6)])[0];
  assert.equal(E.issuePermit(st).state, 'PRÊT POUR SIGNATURE');
  assert.equal(typeof E.issueCoordinationProposal, 'undefined');
});
