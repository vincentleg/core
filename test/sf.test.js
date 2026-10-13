const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const SF = require('../src/sf-data');
const W = require('../src/sf-world');

const DIR = path.join(__dirname, '..', 'data', 'sf');
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const load = file => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));

test('normalization removes personal contact columns and keeps organisations', () => {
  const row = { permit_number: '26EXC-1', permit_type: 'Excavation', status: 'ACTIVE', streetname: 'FOLSOM ST', cnn: '5678000', agent: 'Utility Co',
    agentphone: '415-000-0000', contact: 'A Person', inspector: 'B Person', planchecker: 'C Person', latitude: '37.77', longitude: '-122.41', approved_date: '2026-01-02T00:00:00.000' };
  const f = SF.permitFeature(row);
  assert.equal(f.properties.agent, 'Utility Co');
  assert.equal(SF.hasPII(f), false);
  for (const k of ['agentphone', 'contact', 'inspector', 'planchecker']) assert.ok(!(k in SF.stripPII(row)));
  assert.equal(f.properties.approved, '2026-01-02');
  assert.equal(f.properties.record_id, '26EXC-1@5678000');
  assert.equal(SF.hasPII({ a: [{ b: { Contact: 'x' } }] }), true);
  for (const org of ['Pacific Gas & Electric', 'CableCom', 'Mitchell Engineering. Inc.', 'San Francisco Water Department', 'Zayo Group', 'MODUS, INC', 'Golden State Utility Co.']) assert.equal(SF.organisation(org), org);
  const redacted = SF.permitFeature({ ...row, permit_purpose: 'Call 415-555-0134 or (628) 555-0199, mail jane.doe@example.org' }).properties.purpose;
  assert.equal(redacted, 'Call [téléphone masqué] or [téléphone masqué], mail [courriel masqué]');
  assert.equal(SF.hasPII({ purpose: 'reach me at a.b@c.io' }), true);
  assert.equal(SF.hasPII({ purpose: 'WO#03.X, 1200 FOLSOM ST' }), false);
  const person = SF.permitFeature({ ...row, agent: 'Jane Doe' });
  assert.equal(person.properties.agent, null);
  assert.equal(person.properties.agent_masked, true);
});

test('records without usable geometry or identifier are dropped, never invented', () => {
  const base = { permit_number: 'P', streetname: 'FOLSOM ST', cnn: '1' };
  assert.equal(SF.permitFeature({ ...base }), null);
  assert.equal(SF.permitFeature({ ...base, latitude: '0', longitude: '0' }), null);
  assert.equal(SF.permitFeature({ ...base, latitude: 'NaN', longitude: '-122.4' }), null);
  assert.equal(SF.permitFeature({ streetname: 'FOLSOM ST', latitude: '37.77', longitude: '-122.41' }), null);
  assert.deepEqual(SF.permitFeature({ ...base, point: { type: 'Point', coordinates: [-122.41, 37.77] } }).geometry.coordinates, [-122.41, 37.77]);
  const { features, dropped } = SF.collect([{ ...base }, { ...base, latitude: '37.7', longitude: '-122.4' }], SF.permitFeature);
  assert.equal(features.length, 1); assert.equal(dropped, 1);
  assert.equal(SF.closureFeature({ objectid: '1', street: 'FOLSOM ST' }), null);
  assert.equal(SF.moratoriumFeature({ id: '1', cnn: '9' }, new Map()), null);
});

test('corridor chain follows CNN topology and refuses an incomplete chain', () => {
  const seg = (cnn, f, t, fn, tn) => ({ cnn, streetname: 'FOLSOM ST', f_st: f, t_st: t, f_node_cnn: fn, t_node_cnn: tn, active: true, line: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } });
  const rows = [seg('1', '01ST ST', '02ND ST', 'a', 'b'), seg('2', '02ND ST', 'X', 'b', 'c'), seg('3', 'X', '11TH ST', 'c', 'd'), seg('4', '11TH ST', '12TH ST', 'd', 'e')];
  assert.deepEqual(SF.corridorSegments(rows, 'FOLSOM ST', '02ND ST', '11TH ST').map(r => r.cnn), ['2', '3']);
  assert.deepEqual(SF.corridorSegments(rows.filter(r => r.cnn !== '3'), 'FOLSOM ST', '02ND ST', '11TH ST'), []);
});

test('committed snapshot matches its manifest checksums, counts and provenance', () => {
  assert.ok(Date.parse(manifest.generated_at));
  assert.deepEqual(manifest.removed_columns, SF.PII_COLUMNS);
  assert.equal(manifest.datasets.length, 6);
  for (const d of manifest.datasets) {
    const text = fs.readFileSync(path.join(DIR, d.file), 'utf8');
    assert.equal(crypto.createHash('sha256').update(text).digest('hex'), d.sha256, d.file);
    const fc = JSON.parse(text);
    assert.equal(fc.features.length, d.features, d.file);
    assert.match(d.page, /^https:\/\/data\.sf\.gov\/d\/[a-z0-9]{4}-[a-z0-9]{4}$/);
    assert.match(d.request, /^https:\/\/data\.sf\.gov\/resource\//);
    assert.match(d.raw_sha256, /^[0-9a-f]{64}$/);
    assert.ok(Date.parse(d.retrieved_at));
    assert.match(d.license.name, /PDDL/);
    assert.equal(SF.hasPII(fc), false, `${d.file} contains a personal column`);
    const ids = fc.features.map(f => f.properties.record_id);
    assert.ok(ids.every(Boolean), `${d.file} has records without id`);
    assert.equal(new Set(ids).size, ids.length, `${d.file} has duplicate record ids`);
  }
});

test('snapshot records stay inside the Folsom/Howard corridor and carry real dates', () => {
  const corridor = load('corridor.geojson').features;
  assert.ok(corridor.length >= 20);
  assert.deepEqual([...new Set(corridor.map(f => f.properties.street))].sort(), ['FOLSOM ST', 'HOWARD ST']);
  const cnn = new Set(corridor.flatMap(f => [f.properties.cnn, f.properties.f_node_cnn, f.properties.t_node_cnn]));
  const permits = load('permits.geojson').features;
  assert.ok(permits.length > 0);
  for (const f of permits) {
    assert.ok(cnn.has(f.properties.cnn), `permit outside corridor: ${f.properties.record_id}`);
    assert.ok(SF.WORK_PERMIT_TYPES.includes(f.properties.permit_type));
    assert.ok(f.properties.approved >= SF.CORRIDOR.since);
    const [x, y] = f.geometry.coordinates;
    assert.ok(x > -122.43 && x < -122.38 && y > 37.76 && y < 37.80, 'permit point outside SoMa');
  }
  for (const f of load('moratoria.geojson').features) assert.ok(f.properties.start && f.properties.end && f.properties.start <= f.properties.end);
});

test('Golden Gate model sits on OSM tower positions with published dimensions', () => {
  const G = W.GOLDEN_GATE, gg = W.goldenGate();
  const spacing = W.distance(G.southTower, G.northTower);
  assert.ok(Math.abs(spacing - G.dims.mainSpan) < 15, `OSM tower spacing ${spacing} vs 1280 m`);
  const legs = gg.features.filter(f => f.properties.part === 'tower-leg');
  assert.equal(legs.length, 8);
  assert.equal(Math.max(...gg.features.map(f => f.properties.height)), G.dims.towerAboveWater);
  const deck = gg.features.find(f => f.properties.part === 'deck');
  assert.equal(deck.properties.height, G.dims.clearance);
  // each tower's legs centre within 10 m of the OSM tower centroid
  for (const tower of [G.southTower, G.northTower]) {
    const near = legs.filter(f => W.distance(f.geometry.coordinates[0][0], tower) < 40);
    assert.equal(near.length, 4);
    const pts = near.flatMap(f => f.geometry.coordinates[0].slice(0, 4));
    const c = [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
    assert.ok(W.distance(c, tower) < 10);
  }
  const counts = gg.features.reduce((m, f) => (m[f.properties.part] = (m[f.properties.part] || 0) + 1, m), {});
  assert.ok(counts['main-cable'] > 100 && counts.suspender > 100);
  assert.ok(gg.features.length < 1500, 'keep landmark geometry light');
  for (const f of gg.features) {
    const p = f.properties;
    assert.ok(Number.isFinite(p.base) && Number.isFinite(p.height) && p.base >= 0 && p.height > p.base, p.part);
    assert.equal(p.model, 'procedural');
  }
});

test('landmarks are labelled procedural or OSM and replacement zones only catch their own buildings', () => {
  assert.deepEqual(W.LANDMARKS.map(l => l.id).sort(), ['city-hall', 'coit', 'ferry-building', 'golden-gate', 'salesforce', 'transamerica']);
  for (const l of W.LANDMARKS) { assert.ok(['procedural', 'osm'].includes(l.model)); assert.ok(l.sources.length && l.provenance); }
  const zones = W.replacementZones();
  const poly = (c, h, min = 0) => ({ geometry: { type: 'Polygon', coordinates: [[[c[0] - 1e-4, c[1] - 1e-4], [c[0] + 1e-4, c[1] - 1e-4], [c[0] + 1e-4, c[1] + 1e-4], [c[0] - 1e-4, c[1] + 1e-4], [c[0] - 1e-4, c[1] - 1e-4]]] }, properties: { render_height: h, render_min_height: min } });
  assert.equal(W.replacedBy(poly(W.GOLDEN_GATE.southTower, 225, 195), zones).landmark, 'golden-gate');
  assert.equal(W.replacedBy(poly([-122.4770, 37.8106], 15, 0), zones), null); // Fort Point stays
  assert.equal(W.replacedBy(poly([-122.40279, 37.79517], 215), zones).landmark, 'transamerica');
  assert.equal(W.replacedBy(poly([-122.40279, 37.79517], 20), zones), null);
  assert.equal(W.replacedBy(poly([-122.3965, 37.7900], 326), zones).landmark, 'salesforce');
  assert.equal(W.replacedBy(poly([-122.3935, 37.7955], 83), zones), null); // Ferry Building untouched
  const all = W.landmarkModels();
  assert.ok(all.features.some(f => f.properties.landmark === 'transamerica') && all.features.some(f => f.properties.landmark === 'salesforce'));
});

test('San Francisco navigation targets are inside the city and searchable', () => {
  for (const p of W.PLACES) {
    const [x, y] = p.view.center;
    assert.ok(x > -122.53 && x < -122.35 && y > 37.70 && y < 37.84, p.id);
    assert.ok(p.view.zoom >= 13 && p.view.zoom <= 17, `${p.id} zoom shows buildings`);
    assert.ok(p.aliases.length > 0);
  }
  assert.equal(new Set(W.PLACES.map(p => p.id)).size, W.PLACES.length);
});
