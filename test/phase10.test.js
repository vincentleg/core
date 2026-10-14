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

// A newer snapshot derived from the published one (test only): one added works record on the most injured designated
// segment, one ended record, one extra crash on that segment and a later crash window, one day later.
function newerCx(city) {
  const base = cxs[city], data = JSON.parse(JSON.stringify(base.data)), manifest = JSON.parse(JSON.stringify(base.manifest));
  const top = CT.TOOLS['safety.crash-profile'].run(base, { nhood: city === 'new-york' ? 'East Village' : 'Tenderloin' }).rows[0].cnn;
  const tmpl = data.permits.features.find(p => p.properties.cnn === top) || data.permits.features[0], day = new Date(Date.parse(manifest.generated_at) + 864e5);
  data.permits.features.push({ ...tmpl, properties: { ...tmpl.properties, record_id: 'TEST-NEW-1', cnn: top, status_class: 'active', start: day.toISOString().slice(0, 10), end: new Date(+day + 20 * 864e5).toISOString().slice(0, 10), approved: day.toISOString().slice(0, 10) } });
  const active = CT.planned(base, data.permits.features).filter(p => base.hin.has(p.properties.cnn) && p.properties.record_id !== 'TEST-NEW-1'); const gone = active[0].properties.record_id;
  data.permits.features = data.permits.features.filter(p => p.properties.record_id !== gone);
  const row = data['crashes-agg'].rows.find(r => r.cnn === top); row.n += 1; data['crashes-agg'].window.to = new Date(Date.parse(data['crashes-agg'].window.to) + 864e5).toISOString().slice(0, 10);
  manifest.generated_at = day.toISOString(); for (const d of manifest.datasets) d.retrieved_at = day.toISOString();
  return { cx: CT.context({ manifest, data, city }), top, gone };
}

test('discovery: snapshot comparison finds new and ended works on designated segments and newer crash data; dedupes; prioritises', () => {
  const D = require('../src/civ-discovery.js');
  for (const city of ['san-francisco', 'new-york']) {
    assert.equal(D.diff(cxs[city], cxs[city]).signals.length, 0, 'no change → no signal');
    const { cx, top, gone } = newerCx(city), d = D.diff(cxs[city], cx), kinds = d.signals.map(s => s.kind);
    const add = d.signals.find(s => s.kind === 'new-works-on-designated-segment'); assert.ok(add && add.segment === top && add.records.includes('TEST-NEW-1') && add.nhood, city);
    assert.ok(d.signals.some(s => s.kind === 'works-no-longer-active' && s.records.includes(gone))); assert.ok(kinds.includes('crash-data-updated'));
    assert.equal(new Set(d.signals.map(s => s.key)).size, d.signals.length); assert.equal(d.signals[0].kind, 'new-works-on-designated-segment', 'highest priority first');
    assert.deepEqual(D.diff(cxs[city], cx).signals.map(s => s.key), d.signals.map(s => s.key), 'deterministic keys');
  }
});

test('memory: a newer snapshot supersedes older findings (kept, linked) and records changed values as conflicts', async () => {
  const mem = MEM.open(':memory:'), reg = ORG.buildWorld();
  const m1 = await E.createEngine({ city: 'new-york', registry: reg, cx: cxs['new-york'], memory: mem }).run('safety-works', 'East Village');
  const before = mem.entries({ kind: 'finding', workflow: 'safety-works' }).filter(e => e.mission === m1.id); assert.ok(before.length && before.every(e => e.status === 'reviewed'));
  const { cx } = newerCx('new-york'), m2 = await E.createEngine({ city: 'new-york', registry: reg, cx, memory: mem }).run('safety-works', 'East Village');
  assert.notEqual(m2.id, m1.id); const after = mem.entries({ kind: 'finding', workflow: 'safety-works' });
  const sup = after.filter(e => e.mission === m1.id && e.status === 'superseded'); assert.ok(sup.length > 0, 'older finding superseded');
  for (const e of sup) { const h = e.history[e.history.length - 1]; assert.equal(h.by, 'core.new-york.research.evidence-verifier'); assert.match(h.note, /instantané/); }
  assert.ok(after.some(e => e.mission === m2.id && (e.body.supersedes || []).length), 'successor linked');
  assert.ok(m2.conflicts.length > 0 && mem.conflicts().length > 0, 'changed values recorded as conflicts'); assert.equal(mem.verify().ok, true);
  assert.throws(() => mem.transition(sup[0].id, 'approved', 'human:x'), /interdite/);
});

test('persistent scheduler: queue survives a crash (running items resumed), budgets bounded, no published file written without --publish', () => {
  const { spawnSync } = require('node:child_process'), { DatabaseSync } = require('node:sqlite'), id = `t${process.pid}`, qf = `.core-local/test-q-${id}.sqlite`, mf = `.core-local/test-m-${id}.sqlite`;
  fs.mkdirSync(path.join(ROOT, '.core-local'), { recursive: true });
  try {
    const db = new DatabaseSync(path.join(ROOT, qf));
    db.exec("CREATE TABLE queue (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE, kind TEXT, city TEXT, payload TEXT, priority REAL, status TEXT, attempts INTEGER DEFAULT 0, created TEXT, updated TEXT, result TEXT); CREATE TABLE log (n INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, kind TEXT, detail TEXT);");
    db.prepare("INSERT INTO queue (key, kind, city, payload, priority, status, attempts, created, updated) VALUES (?, 'investigate', 'new-york', ?, 9999, 'running', 1, 'x', 'x')").run('investigate|crashed', JSON.stringify({ city: 'new-york', workflow: 'ramps-works', nhood: 'Chinatown-Two Bridges' })); db.close();
    const before = fs.statSync(path.join(ROOT, 'data/civ/index.json')).mtimeMs;
    const r = spawnSync(process.execPath, ['scripts/civd.mjs', '--once', '--queue', qf, '--memory', mf, '--max-missions', '2'], { cwd: ROOT, encoding: 'utf8', timeout: 180000 });
    if (fs.existsSync(path.join(ROOT, '.core-local/STOP'))) return; // emergency stop active on this machine: the scheduler must do nothing
    assert.equal(r.status, 0, r.stderr); const out = JSON.parse(r.stdout.slice(r.stdout.indexOf('{\n')));
    assert.equal(out.recovered, 1); assert.ok(out.discovered >= 5); assert.ok(Array.isArray(out.ran) && out.ran.length <= 2 && out.ran.some(x => /chinatown/.test(x)), 'crashed item resumed first (highest priority)');
    const db2 = new DatabaseSync(path.join(ROOT, qf)); const st = db2.prepare("SELECT status FROM queue WHERE key = 'investigate|crashed'").get().status; db2.close(); assert.equal(st, 'awaiting-human');
    assert.equal(fs.statSync(path.join(ROOT, 'data/civ/index.json')).mtimeMs, before, 'publication stays explicit');
  } finally { for (const f of [qf, mf]) for (const x of ['', '-wal', '-shm']) fs.rmSync(path.join(ROOT, f + x), { force: true }); }
});

test('control centre (Phase 10 actions): allowlisted cities and neighbourhoods, emergency stop, human-only decisions, no process spawning', async () => {
  const { spawn } = require('node:child_process'), id = `c${process.pid}`, mf = `.core-local/test-cm-${id}.sqlite`, qf = `.core-local/test-cq-${id}.sqlite`;
  const port = 19000 + Math.floor(Math.random() * 900), child = spawn(process.execPath, ['scripts/control-server.mjs', '--port', String(port), '--memory', mf, '--queue', qf], { cwd: ROOT, env: { ...process.env, NODE_NO_WARNINGS: '1' } });
  let out = ''; child.stdout.on('data', d => { out += d; }); child.stderr.on('data', () => {});
  try {
    for (let i = 0; i < 150 && !/#token=/.test(out); i++) await new Promise(r => setTimeout(r, 100));
    const token = out.match(/#token=([a-f0-9]+)/)[1], H = { 'X-Core-Token': token, 'Content-Type': 'application/json' };
    const post = (p, b) => fetch(`http://127.0.0.1:${port}${p}`, { method: 'POST', headers: H, body: JSON.stringify(b) }).then(async r => ({ status: r.status, body: await r.json() }));
    const st = await (await fetch(`http://127.0.0.1:${port}/api/status`, { headers: H })).json();
    assert.deepEqual(st.cities.map(c => c.id), ['san-francisco', 'new-york']); assert.ok(st.cities.every(c => c.sources.length >= 4)); assert.match(st.resources.cost, /^0 \$/);
    assert.equal((await post('/api/world', { pairs: [['new-york', 'East Village'], ['new-york', 'Lower East Side']] })).status, 400, 'two different cities required');
    assert.equal((await post('/api/world', { pairs: [['paris', 'X'], ['new-york', 'East Village']] })).status, 400, 'navigation-only city refused');
    assert.equal((await post('/api/decision', { city: 'new-york', nhood: 'East Village' })).status, 400, 'workflow not available in that city');
    assert.equal((await post('/api/decision', { city: 'san-francisco', nhood: '../../etc' })).status, 400);
    assert.equal((await post('/api/discover', { fetch: true })).status, 400, 'collection stays a CLI action');
    assert.equal((await post('/api/world', { pairs: [['san-francisco', 'Mission'], ['new-york', 'Chinatown-Two Bridges']] })).status, 202);
    let s2; for (let i = 0; i < 100; i++) { s2 = await (await fetch(`http://127.0.0.1:${port}/api/status`, { headers: H })).json(); if (!s2.busy) break; await new Promise(r => setTimeout(r, 200)); }
    const w = s2.missions.find(m => m.id.startsWith('world:') && /mission@/.test(m.id) && /chinatown/.test(m.id)); assert.ok(w && w.state === 'HUMAN_REVIEW');
    assert.equal((await post('/api/decide', { id: w.id, reviewer: 'core.global.director.road-safety', decision: 'approve' })).status, 400, 'agents cannot decide');
    assert.equal((await post('/api/decide', { id: w.id, reviewer: 'human:test', decision: 'needs-evidence' })).body.state, 'NEEDS_MORE_EVIDENCE');
    if (!fs.existsSync(path.join(ROOT, '.core-local/STOP'))) { await post('/api/stop', {}); assert.equal((await post('/api/decision', { city: 'san-francisco', nhood: 'Mission' })).status, 423); assert.equal((await post('/api/resume', { reviewer: 'nobody' })).status, 400); await post('/api/resume', { reviewer: 'human:test' }); }
  } finally { child.kill(); for (const f of [mf, qf]) for (const x of ['', '-wal', '-shm']) fs.rmSync(path.join(ROOT, f + x), { force: true }); }
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'scripts/control-server.mjs'), 'utf8'), /child_process|spawn\(|exec\(|eval\(/);
});
