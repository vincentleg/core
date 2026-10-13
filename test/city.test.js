const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const C = require('../src/coord');
const D = require('../src/domains');
const GR = require('../src/graph');
const SIM = require('../src/simulation');
const CI = require('../src/city-agents');
const SF = require('../src/sf-data');

const DIR = path.join(__dirname, '..', 'data', 'sf');
function snapshot() {
  const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8')), data = {}, verified = {};
  for (const d of manifest.datasets) { const t = fs.readFileSync(path.join(DIR, d.file), 'utf8'), k = d.file.replace(/\.geojson$/, ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'mismatch'; }
  return { manifest, data, verified };
}
const real = snapshot();
const ctx = C.buildContext(real);
const runA = CI.run(ctx);
const clone = x => JSON.parse(JSON.stringify(x));

test('domain registry exposes every domain with an honest status', () => {
  for (const id of ['infrastructure', 'buildings', 'nature', 'energy', 'public_space', 'society', 'events']) assert.ok(D.domain(id), id);
  assert.equal(D.domain('society').status, 'candidate');
  for (const d of D.DOMAINS) assert.ok(['working', 'partial', 'candidate', 'unavailable'].includes(d.status) && d.gaps && d.scope);
  for (const s of D.DATASETS) { assert.ok(D.domain(s.domain), s.key); assert.match(s.id, /^[a-z0-9]{4}-[a-z0-9]{4}$/); assert.ok(s.schema && s.normalize && s.dedupe); }
});

test('schema validation rejects missing and malformed values without inventing data', () => {
  const trees = D.dataset('street-trees');
  assert.deepEqual(D.validate({ treeid: '1', latitude: '37.7', longitude: '-122.4' }, trees.schema), []);
  assert.ok(D.validate({ treeid: '', latitude: 'x', longitude: '-122.4' }, trees.schema).length === 2);
  const res = D.normalizeRows(trees, [{ treeid: '1', latitude: '37.7', longitude: '-122.4', cnn: '05664000' }, { treeid: '1', latitude: '37.7', longitude: '-122.4' }, { treeid: '2', latitude: '0', longitude: '0' }, { treeid: '3' }]);
  assert.equal(res.features.length, 1); assert.equal(res.duplicates, 1);
  assert.equal(res.features[0].properties.cnn, '5664000', 'zero-padded CNN normalized');
  assert.equal(Object.values(res.rejected).reduce((a, b) => a + b, 0), 2);
  const bp = D.normalizeRows(D.dataset('building-permits'), [{ permit_number: 'P1', status: 'issued', location: { type: 'Point', coordinates: [-122.41, 37.77] }, description: 'call 415-555-0101 or a.b@example.org', block: '3727', lot: '012' }]);
  assert.equal(bp.features[0].properties.parcel, '3727/012');
  assert.equal(SF.hasPII(bp.features), false);
  assert.match(bp.features[0].properties.description, /\[téléphone masqué\].*\[courriel masqué\]/);
});

test('new real domains are present in the verified snapshot with provenance', () => {
  for (const k of ['street-trees', 'tree-removals', 'building-permits', 'energy-benchmarks', 'parks', 'sidewalks']) {
    const m = real.manifest.datasets.find(d => d.file === `${k}.geojson`);
    assert.ok(m && real.verified[k] === 'ok', k);
    assert.ok(m.domain && m.retrieved_at && m.request.startsWith('https://data.sf.gov/resource/') && m.license.name.includes('PDDL'));
    assert.ok(real.data[k].features.length > 0, `${k} has records`);
    assert.equal(SF.hasPII(real.data[k]), false, `${k} has no contact data`);
  }
  assert.ok(real.data['street-trees'].features.every(f => ctx.segments.has(f.properties.cnn)), 'trees selected by corridor CNN');
});

test('knowledge graph: explained relationships, provenance, no causal shortcut', () => {
  const G = GR.buildCityGraph(ctx, CI.DEFAULTS);
  const st = G.stats();
  assert.ok(st.entities > 1000 && st.relations > 1000);
  for (const r of G.relations) { assert.ok(r.why && GR.BASES.includes(r.basis) && GR.TYPES.includes(r.type)); }
  assert.ok(G.relations.filter(r => r.type === 'NEAR').every(r => r.basis === 'derived' && Number.isFinite(r.distance_m)));
  const tree = [...G.entities.values()].find(e => e.type === 'Tree');
  assert.equal(tree.provenance.dataset, 'street-trees'); assert.equal(tree.provenance.snapshot, ctx.asOf);
  const g = GR.createGraph(); g.addEntity('a', 'X'); g.addEntity('b', 'Y');
  assert.throws(() => g.relate('AFFECTS', 'a', 'b', 'derived', 'proximity'), /hypothèse/);
  assert.throws(() => g.relate('NEAR', 'a', 'b', 'derived', ''), /pourquoi/);
  assert.throws(() => g.relate('NEAR', 'a', 'zz', 'derived', 'x'), /inconnue/);
  assert.ok(G.relations.some(r => r.type === 'ASSOCIATED_WITH' && r.from.startsWith('building:') === false && r.to.startsWith('tree:')), 'removal notices linked to trees by id');
});

test('simulation interface: honest models, reproducible outputs, unavailable domains refused', () => {
  assert.equal(SIM.run('energy-model', {}).status, 'unavailable');
  assert.equal(SIM.run('ecology-model', {}).status, 'unavailable');
  assert.throws(() => SIM.run('nope', {}), /inconnu/);
  const d = C.dn('2026-10-13');
  const w = [{ record_id: 'a', coords: [-122.41, 37.77], s: d, e: d + 9 }, { record_id: 'b', coords: [-122.41, 37.77], s: d + 5, e: d + 12 }];
  const t = [{ id: 't1', coords: [-122.41005, 37.77] }, { id: 't2', coords: [-122.42, 37.77] }];
  const r = SIM.run('tree-proximity-exposure-v1', { windows: w, trees: t, distanceM: 10 });
  assert.equal(r.outputs.uniqueTrees, 1); assert.equal(r.outputs.permitTreePairs, 2); assert.equal(r.outputs.exposureEpisodes, 1); assert.equal(r.calibrated, false);
  assert.equal(r.inputs_digest, SIM.run('tree-proximity-exposure-v1', { windows: w, trees: t, distanceM: 10 }).inputs_digest);
});

test('investigation is real, reproducible and cross-domain', () => {
  const runB = CI.run(C.buildContext(snapshot()));
  assert.equal(runA.result.fingerprint, runB.result.fingerprint);
  assert.deepEqual(runA.events.map(e => e.text), runB.events.map(e => e.text));
  assert.deepEqual([...new Set(runA.events.map(e => e.agent))].filter(a => a !== 'system'), CI.ROLES.map(r => r.id));
  const b = runA.result.brief;
  for (const d of ['infrastructure', 'nature', 'buildings']) assert.ok(b.domains.includes(d));
  assert.ok(ctx.segments.has(b.location.segment_cnn));
  for (const e of b.evidence.excavations) assert.ok(ctx.byRecord.has(`permits:${e.record_id}`));
  for (const t of b.evidence.trees) assert.ok(real.data['street-trees'].features.some(f => f.properties.treeid === t.treeid));
  assert.equal(b.hypothesis.claims.length, 3);
  assert.ok(b.hypothesis.claims.every(c => c.support.length > 0));
});

test('three alternatives evaluated; recommendation follows evidence availability', () => {
  const b = runA.result.brief, ev = Object.fromEntries(b.evaluation.results.map(e => [e.id, e]));
  assert.deepEqual(b.alternatives.map(a => a.id), ['R0', 'R1', 'R2']);
  assert.ok(ev.R1.metrics.evidenceCompleteness < 1 && ev.R1.missingEvidence.length > 0);
  assert.equal(ev.R2.metrics.evidenceCompleteness, 1);
  assert.equal(b.recommendedAction.alternative, 'R2');
  for (const r of Object.values(ev)) assert.equal(r.metrics.violations, 0);
  assert.ok(b.ranking.every(x => x.why.length > 10));
  assert.ok(ev.R1.metrics.exposureEpisodes <= ev.R0.metrics.exposureEpisodes);
  for (const k of ['discovered', 'whyItMatters', 'missingData', 'stakeholders', 'invalidatedIf', 'humanApproval']) assert.ok(b[k] && b[k].length, k);
});

test('parameters genuinely recompute the investigation', () => {
  const wide = CI.run(ctx, { treeBufferM: 20 });
  assert.notEqual(wide.result.fingerprint, runA.result.fingerprint);
  assert.ok(wide.result.block.exposed.length >= runA.result.block.exposed.length);
  const none = CI.run(ctx, { treeBufferM: 1 });
  assert.equal(none.result.brief, null);
  assert.equal(none.result.decision.state, CI.STATES.REJECT);
});

test('contradictory evidence lowers ranking and is reported', () => {
  const G = GR.buildCityGraph(ctx, CI.DEFAULTS);
  const blocks = [...ctx.segments.keys()].map(s => CI.blockSignals(ctx, G, s, CI.DEFAULTS));
  const withNotice = blocks.filter(b => b.exposed.length > b.exposedNet.length);
  for (const b of withNotice) assert.ok(b.exposedNet.length < b.exposed.length);
  assert.ok(runA.result.adversarial.some(a => a.id === 'P6'));
});

test('human decision gateway: eligible only after recomputation; never authorizes', () => {
  const d = CI.issueCityDecision(runA.result.brief, ctx);
  assert.equal(d.state, runA.result.decision.state);
  assert.equal(d.authorizes, false);
  assert.ok([CI.STATES.ELIGIBLE, CI.STATES.MORE].includes(d.state));
  assert.match(runA.result.brief.humanApproval, /Revue humaine obligatoire/);
  const exported = JSON.parse(JSON.stringify({ brief: runA.result.brief }));
  assert.equal(CI.issueCityDecision(exported.brief, ctx).state, d.state, 'JSON export round-trips');
});

test('gateway fails closed on missing, altered or unverifiable evidence', () => {
  const rej = b => { const d = CI.issueCityDecision(b, ctx); assert.equal(d.state, CI.STATES.REJECT); assert.equal(d.authorizes, false); };
  for (const x of [null, undefined, {}, [], 'x']) rej(x);
  const tweak = f => { const b = clone(runA.result.brief); f(b); return b; };
  rej(tweak(b => { delete b.evidence; }));
  rej(tweak(b => { b.extra = 1; }));
  rej(tweak(b => { b.location.segment_cnn = '999'; }));
  rej(tweak(b => { b.evidence.excavations[0].end = '2000-01-01'; }));
  rej(tweak(b => { b.evidence.trees.push({ treeid: 'FAKE' }); }));
  rej(tweak(b => { b.evaluation.results[0].metrics.exposureEpisodes = 0; }));
  rej(tweak(b => { b.adversarial[0].pass = !b.adversarial[0].pass; }));
  rej(tweak(b => { b.recommendedAction.alternative = 'R1'; }));
  rej(tweak(b => { b.snapshot.datasets['street-trees'].sha256 = '0'.repeat(64); }));
  rej(tweak(b => { b.domains = ['infrastructure']; }));
  rej(tweak(b => { b.params.treeBufferM = -1; }));
  const unverified = C.buildContext({ ...real, verified: { ...real.verified, 'street-trees': 'mismatch' } });
  assert.equal(CI.issueCityDecision(runA.result.brief, unverified).state, CI.STATES.REJECT);
});

test('model-provider interface accepts only well-formed providers; none is registered', () => {
  assert.equal(CI.providers.length, 0);
  assert.throws(() => CI.registerProvider({ id: 'x' }), /invalide/);
});
