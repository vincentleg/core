// Phase 6 tests (presentation logic that can run in Node; browser behaviour is in scripts/browser-audit.mjs).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
require('../src/mission-graph.js'); require('../src/map-style.js'); require('../src/demo.js');
const MG = globalThis.CORE_MISSION_GRAPH, MS = globalThis.CORE_MAPSTYLE, DEMO = globalThis.CORE_DEMO;

test('mission graph uses only recorded events; disputes match recorded disagreements', () => {
  for (const m of read('data/missions/cognitive/index.json').missions) {
    const mc = read(`data/missions/cognitive/${m.id.replace(':', '-')}.json`), ev = MG.events(mc);
    for (const e of ev.filter(x => x.agent && x.kind !== 'dispute')) assert.ok(mc.log.some(l => l.t === e.t && l.agent === e.agent), `${m.id}: event at ${e.t} not in log`);
    const disputes = ev.filter(e => e.kind === 'dispute');
    assert.ok(disputes.length <= (mc.disagreements || []).length);
    for (const d of disputes) assert.ok(mc.disagreements.some(x => x.between[1] === d.agent && x.between[0] === d.to));
    const reports = ev.filter(e => e.kind === 'report'); assert.equal(reports.reduce((n, r) => n + r.rejected, 0) <= (mc.rejected || []).length, true);
    assert.match(MG.render(mc), /Fil d’exécution enregistré/);
  }
});

test('coverage states only San Francisco as operational; markers stay inspectable at their zoom', () => {
  assert.deepEqual(MS.COVERAGE.filter(c => c.status === 'operational').map(c => c.name), ['San Francisco']);
  assert.ok(MS.COVERAGE.filter(c => c.status !== 'operational').every(c => /Navigation seulement/.test(c.label)));
  for (const [id, [minz]] of Object.entries(MS.TUNE)) assert.ok(minz <= 16, `${id} must remain visible at street zoom`);
});

test('demo 2.0: nine steps, one takeaway each, recorded vs live stated', () => {
  assert.equal(DEMO.STEPS.length, 9);
  assert.deepEqual(DEMO.STEPS.map(s => s.t), ['Le monde', 'La ville', 'Le problème', 'Les agents', 'La découverte', 'Les preuves', 'Les alternatives', 'La remise en question', 'La décision']);
  const src = fs.readFileSync(path.join(ROOT, 'src/demo.js'), 'utf8');
  assert.match(src, /enregistrée/); assert.match(src, /Aucune autorisation/); assert.match(src, /Indisponible ici : le modèle en direct/);
  assert.doesNotMatch(src, /tonnes|CO2|économies de|\$\d/i, 'no fabricated benefit figures');
});

test('layout and camera: padding never interrupts flights; intro spin cannot override camera moves', () => {
  const ms = fs.readFileSync(path.join(ROOT, 'src/map-style.js'), 'utf8'), html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(ms, /if \(map\.isMoving\(\)\) \{ map\.once\('moveend', sync\)/);
  assert.match(html, /map\.on\('movestart', e => \{ if \(!e\.coreSpin\) stop\(\); \}\)/);
  assert.match(html, /<body class="console-min( landing)?">/, 'world-first: compact dock by default');
});
