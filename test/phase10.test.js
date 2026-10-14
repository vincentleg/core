// Phase 10 tests: world registry (SF codes unchanged, NYC only with implemented tools), city-aware tools (SF wording
// unchanged), New York missions run by New York agents, decision intelligence (baseline + 3 interventions, sensitivity,
// evidence quality, review, human checkpoint), cross-city mission (memory reuse, comparability, restart recovery),
// NYC privacy (aggregates only), NYC pedestrian routes vs buildings, recorded Phase 10 missions integrity.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const ORG = require('../src/org.js'), CT = require('../src/civ-tools.js'), E = require('../src/civ-engine.js'), MEM = require('../src/civ-memory.js'), POP = require('../src/agent-population.js');
const WD = require('../src/civ-world.js'), CITIES = require('../src/cities.js'), T = require('../src/tools.js'), P = require('../src/data-policy.js');
function cxOf(city) {
  const dir = CITIES.get(city).studyArea.dataDir, manifest = read(`${dir}/manifest.json`), data = {};
  for (const d of manifest.datasets) { const t = fs.readFileSync(path.join(ROOT, dir, d.file), 'utf8'); assert.equal(crypto.createHash('sha256').update(t).digest('hex'), d.sha256, `${d.file} checksum`); data[d.file.replace('.json', '')] = JSON.parse(t); }
  return CT.context({ manifest, data, city });
}
const cxs = { 'san-francisco': cxOf('san-francisco'), 'new-york': cxOf('new-york') };
const tmpDb = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'core10-')), 'm.sqlite');

test('world registry: San Francisco codes unchanged, New York only with implemented tools, unique codes', () => {
  const sf = ORG.buildRegistry(), w = ORG.buildWorld();
  assert.equal(sf.agents.length, 68); assert.equal(w.agents.length, 82);
  sf.agents.forEach((a, i) => { assert.equal(w.agents[i].id, a.id); assert.equal(w.agents[i].code, a.code); });
  assert.equal(new Set(w.agents.map(a => a.code)).size, 82); assert.equal(new Set(w.agents.map(a => a.id)).size, 82);
  const known = new Set([...Object.keys(CT.TOOLS), ...Object.keys(T.TOOLS), ...Object.keys(WD.TOOLS), 'mission.plan', 'decision.gateway', 'adversarial.review']);
  for (const a of w.agents.slice(68)) { for (const t of a.tools) assert.ok(known.has(t), `${a.id}: ${t} implemented`); assert.notEqual(a.executionMode, 'llm'); if (a.supervisor) assert.ok(w.agents.some(x => x.id === a.supervisor)); }
  assert.ok(w.agents.filter(a => a.scope.city === 'new-york').every(a => a.executionMode !== 'unavailable'), 'no decorative New York profile');
  assert.deepEqual(CITIES.operational().map(c => c.id), ['san-francisco', 'new-york']);
});

test('city-aware tools: San Francisco wording unchanged; New York states its own definitions', () => {
  const sf = CT.TOOLS['safety.crash-profile'].run(cxs['san-francisco'], { nhood: 'Tenderloin' }).findings[0].claim;
  assert.match(sf, /tronçon\(s\) du réseau HIN 2024 ; \d+ avec au moins un accident avec blessé déclaré sur 5 ans \(\d+ accidents, dont \d+ graves ou mortels\)/);
  const ny = CT.TOOLS['safety.crash-profile'].run(cxs['new-york'], { nhood: 'East Village' });
  assert.match(ny.findings[0].claim, /corridor prioritaire Vision Zero/); assert.doesNotMatch(ny.findings[0].claim, /HIN/);
  assert.match(ny.assumptions[0], /20 m/);
  const r = CT.TOOLS['accessibility.ramps'].run(cxs['new-york'], { nhood: 'Lower East Side' });
  assert.ok(r.rows.length > 0 && r.rows.every(x => x.issues.length > 0));
  for (const x of r.rows.slice(0, 20)) assert.ok(CT.resolve(cxs['new-york'], { dataset: 'ramps', ref: `ramps:${x.id}` }));
  assert.equal(CT.resolve(cxs['new-york'], { dataset: 'ramps', ref: 'ramps:does-not-exist' }), false);
});

test('New York missions: run by New York agents only, through leads, to human review; unavailable workflows refused', async () => {
  const reg = ORG.buildWorld(), ny = E.createEngine({ city: 'new-york', registry: reg, cx: cxs['new-york'], memory: MEM.open(':memory:') });
  assert.throws(() => ny.newMission('flood-works', 'East Village'), /non disponible/);
  assert.throws(() => E.createEngine({ city: 'paris', registry: reg, cx: cxs['new-york'] }), /non opérationnelle/);
  const found = ny.discoverAll(); assert.ok(found.length >= 2 && found.every(p => p.city === 'new-york'));
  for (const [w, nh] of [['safety-works', 'East Village'], ['ramps-works', 'Lower East Side']]) {
    const m = await ny.run(w, nh, { resume: false });
    assert.equal(m.state, 'HUMAN_REVIEW'); assert.match(m.id, /^civ:new-york:/);
    assert.ok(m.subtasks.length >= 2 && m.subtasks.every(s => s.agent.startsWith('core.new-york.')), 'only New York specialists');
    assert.ok(m.subtasks.filter(s => s.state === 'succeeded').length >= 2); assert.ok(m.subtasks.every(s => s.state !== 'failed'));
    assert.ok(m.messages.some(x => x.to === 'core.new-york.civil.lead'), 'cross-department request through the civil lead');
    assert.equal(m.model.calls, 0); assert.match(m.recommendation.text, /NYC DOT/); assert.doesNotMatch(m.recommendation.text, /SFMTA|SF Public Works/);
  }
});

test('decision intelligence: baseline + 3 interventions, sensitivity, evidence quality, review, human checkpoint', async () => {
  const mem = MEM.open(':memory:'), sf = E.createEngine({ city: 'san-francisco', registry: ORG.buildWorld(), cx: cxs['san-francisco'], memory: mem });
  const m = await sf.run('decision-safety-works', 'Tenderloin', { resume: false }), d = m.decisionAnalysis;
  assert.equal(m.state, 'HUMAN_REVIEW'); assert.deepEqual(d.options.map(o => o.id), ['I0', 'I1', 'I2', 'I3']);
  assert.equal(d.options[0].change, 0); assert.ok(d.options.slice(2).every(o => o.exposure <= d.options[0].exposure));
  assert.equal(d.sensitivity.length, 18); assert.ok(d.quality.length >= 4 && d.quality.every(q => /^[A-C]$/.test(q.grade)));
  const dec = m.findings.filter(f => f.topic === 'decision'); assert.ok(dec.length >= 5 && dec.every(f => f.epistemic === 'modeled' && /modélis/.test(f.claim)), 'modelled outputs say so');
  assert.equal(m.rejected.length, 0); assert.ok(m.review.recommendation.ok); assert.match(m.recommendation.text, /non calibré/); assert.match(m.recommendation.text, /aucun coût/);
  assert.ok(m.subtasks.some(s => s.tool === 'decision.interventions' && s.agent === 'core.san-francisco.simulation.scenario-evaluator'));
  assert.throws(() => sf.humanDecision(m, 'agent:x', 'approve'), /humain/);
  assert.equal(sf.humanDecision(m, 'human:test', 'needs-evidence').state, 'NEEDS_MORE_EVIDENCE');
  // Independence: the reviewer rejects a modelled figure that does not say it is modelled.
  assert.equal(CT.review(cxs['san-francisco'], [{ claim: 'indice 5', epistemic: 'modeled', evidence: [{ dataset: 'neighborhoods', ref: 'neighborhoods:Tenderloin' }] }], null).rejected.length, 1);
});

test('cross-city mission: director → both cities → methodology review → human; reuses memory; survives a restart', async () => {
  const db = tmpDb(), reg = ORG.buildWorld();
  let mem = MEM.open(db);
  await E.createEngine({ city: 'san-francisco', registry: reg, cx: cxs['san-francisco'], memory: mem }).run('safety-works', 'Tenderloin');
  await E.createEngine({ city: 'new-york', registry: reg, cx: cxs['new-york'], memory: mem }).run('safety-works', 'East Village');
  const pairs = [['san-francisco', 'Tenderloin'], ['new-york', 'East Village']];
  await assert.rejects(WD.createWorld({ registry: reg, cxs, memory: mem }).compare(pairs, { crashAfter: 'INVESTIGATING' }), /arrêt simulé/);
  mem.close(); mem = MEM.open(db); // new process: same file
  const m = await WD.createWorld({ registry: reg, cxs, memory: mem }).compare(pairs);
  assert.equal(m.state, 'HUMAN_REVIEW'); assert.equal(m.resumedFrom, 'INVESTIGATING');
  assert.equal(m.subtasks.filter(s => s.tool === 'safety.crash-profile').length, 2, 'no duplicated work after resume');
  assert.ok(m.memoryReused.length > 0 && m.memoryReused.every(e => ['verified', 'reviewed', 'approved'].includes(e.status)));
  assert.ok(m.messages.some(x => x.from === WD.DIRECTOR && x.to === 'core.new-york.mobility.lead') && m.messages.some(x => x.from === WD.DIRECTOR && x.to === 'core.san-francisco.mobility.lead'));
  assert.ok(m.subtasks.some(s => s.agent === WD.METHOD && s.tool === 'comparability.review'));
  const sev = m.comparability.find(c => /graves/.test(c.metric)); assert.equal(sev.verdict, 'non comparable');
  assert.ok(m.comparability.some(c => /^non comparable/.test(c.verdict) && /Réseau désigné/.test(c.metric)));
  assert.ok(m.findings.every(f => f.evidence.length) && m.rejected.length === 0);
  assert.doesNotMatch(m.recommendation.text, /plus sûre que|moins sûre que/); assert.equal(mem.verify().ok, true);
  const again = await WD.createWorld({ registry: reg, cxs, memory: mem }).compare(pairs); assert.equal(again.messages.length, m.messages.length, 'idempotent');
  const w2 = WD.createWorld({ registry: reg, cxs, memory: MEM.open(':memory:') }); w2.stopAll();
  assert.equal((await w2.compare(pairs, { resume: false })).state, 'CANCELLED');
  mem.close();
});

test('New York privacy and policy: aggregates only, no collision identifiers, sources eligible with attribution', () => {
  const agg = read('data/nyc/crashes-agg.json');
  for (const r of agg.rows) assert.deepEqual(Object.keys(r).sort(), ['cnn', 'group', 'killed', 'n', 'nhood', 'severity']);
  const raw = fs.readFileSync(path.join(ROOT, 'data/nyc/crashes-agg.json'), 'utf8'); assert.doesNotMatch(raw, /collision_id|vehicle_type|contributing_factor|crash_time/i);
  for (const k of ['nyc-neighborhoods', 'nyc-priority-corridors', 'nyc-collisions-agg', 'nyc-street-closures', 'nyc-pedestrian-ramps']) { const e = P.get(`dataset:${k}`); assert.equal(e.status, 'eligible'); assert.match(e.attribution, /NYC Open Data/); }
});

test('New York pedestrian routes never cross building footprints (three neighbourhoods, seeded routes)', () => {
  const w = read('data/osm/nyc-walk-network.json'), net = POP.network(w), sample = read('data/osm/nyc-buildings-sample.json');
  assert.equal(w.city, 'new-york'); assert.equal(w.source.licence, 'ODbL 1.0'); assert.ok(w.validation.edges_removed_crossing_buildings > 0);
  const inRing = (p, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  let checked = 0;
  for (const [area, { bbox, buildings }] of Object.entries(sample.areas)) {
    const inside = p => p[0] >= bbox[0] && p[0] <= bbox[2] && p[1] >= bbox[1] && p[1] <= bbox[3], nodes = net.nodes.map((p, i) => [p, i]).filter(([p]) => inside(p)).map(([, i]) => i);
    assert.ok(nodes.length > 50, `${area}: network present`); const rnd = POP.prng(area);
    for (let k = 0; k < 25; k++) {
      const a = net.nodes[nodes[Math.floor(rnd() * nodes.length)]], b = net.nodes[nodes[Math.floor(rnd() * nodes.length)]], r = net.route(a, b); if (!r) continue;
      for (let i = 1; i < r.coords.length; i++) { const p = r.coords[i - 1], q = r.coords[i], n = Math.max(2, Math.ceil(POP.dist(p, q))); for (let s = 1; s < n; s++) { const x = [p[0] + (q[0] - p[0]) * s / n, p[1] + (q[1] - p[1]) * s / n]; if (inside(x)) assert.ok(!buildings.some(bd => inRing(x, bd)), `${area}: route point inside a building at ${x}`); } }
      checked++;
    }
  }
  assert.ok(checked >= 60);
});

test('recorded Phase 10 missions: files exist, participants registered, evidence resolves in the right city', () => {
  const idx = read('data/civ/index.json'), reg = ORG.buildWorld(), ids = new Set(reg.agents.map(a => a.id));
  assert.ok(idx.missions.some(m => m.city === 'new-york')); assert.ok(idx.missions.some(m => m.scope === 'world'));
  for (const e of idx.missions) {
    const m = read(`data/civ/missions/${e.file}`); assert.equal(m.id, e.id);
    for (const p of e.participants) assert.ok(ids.has(p), p);
    for (const f of m.findings) for (const r of f.evidence) { const city = r.city || f.city || e.city || 'san-francisco'; if (r.dataset === 'dataset' || r.dataset === 'flood-zone' || /^(feed|kb|seg|doc)/.test(r.dataset || '')) continue; if (city === 'san-francisco' && e.workflow !== 'decision-safety-works' && !['hin', 'crashes-agg', 'study-permits', 'neighborhoods', 'ramps'].includes(r.dataset)) continue; assert.ok(CT.resolve(cxs[city], r), `${e.id}: ${r.ref}`); }
  }
});
