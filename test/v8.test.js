// CORE V8 — Civilization Intelligence: scenario layer honesty, recorded mobility outputs, traces.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8'), json = p => JSON.parse(read(p)), imp = p => import(path.join(ROOT, p));
const mobility = () => ({ results: json('data/mobility/results.json'), manifest: json('data/mobility/manifest.json'), geometry: json('data/mobility/geometry.json') });

test('scenarios: every scenario renders with its status, uncertainty, verdict and replay label; nothing reads as proven', async () => {
  const SC = await imp('src/earth/scenarios.mjs'), D = mobility();
  for (const s of D.results.scenarios) {
    const h = SC.panelHTML(D, s.id, false);
    assert.match(h, /modèle non calibré/); assert.match(h, /Ce que ce modèle ne sait pas/); assert.match(h, /une relecture, pas une simulation en direct/);
    assert.ok(h.includes('Verdict') && h.includes('Retirer de la carte'));
    assert.doesNotMatch(h, /prouvé|recommandé :|validé|vérifié dans la réalité/i);
  }
  for (const [k, [label, tone]] of Object.entries(SC.STATUS)) { assert.notEqual(tone, 'ok', `${k} must not use the "proven" green`); assert.doesNotMatch(label, /prouvé|validé/i); }
  assert.match(SC.STATUS['promising-uncalibrated'][0], /revue humaine requise/);
  for (const p of Object.values(SC.PRIMITIVES)) assert.doesNotMatch(p.color, /^#(2|3)[0-9a-f]c[0-9a-f]{3}$|green/i);
});

test('scenarios: statuses and verdict follow the recorded numbers (beyond-noise rule), never the other way round', () => {
  const R = json('data/mobility/results.json');
  for (const s of R.scenarios.filter(x => x.id !== 'S0')) {
    const worse = Object.entries(s.comparison).filter(([, c]) => c.beyondNoise && c.delta > 0).map(([k]) => k);
    if (worse.includes('carDelay') || worse.includes('busTravelTime')) assert.equal(s.status, 'unsupported', s.id);
    if (s.status === 'promising-uncalibrated') assert.ok(!worse.length && s.improves.length, s.id);
  }
  assert.match(R.verdict, /non calibré/); assert.match(R.verdict, /revue humaine/);
  assert.equal(R.search.generated, R.search.rejected.length + R.search.simulated.length);
});

test('traces: one per scenario, bounded, same window and step, ids stable, coordinates inside the study area', () => {
  const M = json('data/mobility/manifest.json'), ids = json('data/mobility/results.json').scenarios.map(s => s.id);
  for (const id of ids) {
    const t = json(`data/mobility/trace-${id}.json`); assert.equal(t.scenario, id); assert.equal(t.start, 600); assert.equal(t.step, 2); assert.equal(t.frames.length, 121);
    for (const f of t.frames) { assert.ok(f.length <= 200); for (const v of f) { assert.equal(v.length, 5); assert.ok(v[1] > -122.42 && v[1] < -122.39 && v[2] > 37.77 && v[2] < 37.79); assert.ok(v[4] === 0 || v[4] === 1); } }
  }
  assert.ok(M.calibration && M.synthetic.length && M.reproduce && M.blockers.length);
});

test('world: the scenario layer is reachable from the mobility mission and by link, and is reversible', () => {
  const app = read('src/earth/app.mjs'), panels = read('src/earth/civ-panels.mjs'), miss = read('src/civilization/missions.mjs');
  assert.match(panels, /data-sim="S0"/); assert.match(miss, /simulation: 'SUMO 1\.27\.1/);
  assert.match(app, /h\.get\('sim'\)/); assert.match(app, /function hideSimulation/); assert.match(app, /data-scn-off/);
});
