// Phase 9 tests: organisation classes, autonomous engine (hierarchy, delegation, gates, budgets, recovery),
// memory promotion, measured learning, recorded missions integrity, pedestrian routes vs buildings in three
// neighbourhoods, local control centre security, privacy/CSP.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const ROOT = path.join(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const ORG = require('../src/org.js'), CT = require('../src/civ-tools.js'), E = require('../src/civ-engine.js'), MEM = require('../src/civ-memory.js'), POP = require('../src/agent-population.js');
const C = require('../src/coord.js'), KN = require('../src/knowledge.js');
function corridorEnv() {
  const manifest = read('data/sf/manifest.json'), data = {}, verified = {};
  for (const d of manifest.datasets) { const t = fs.readFileSync(path.join(ROOT, 'data/sf', d.file), 'utf8'), k = d.file.replace('.geojson', ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'mismatch'; }
  const feedState = read('data/feeds/state.json');
  return { ctx: C.buildContext({ manifest, data, verified }), feeds: read('data/feeds/items.json'), feedState, feedHealth: feedState.health, knowledge: KN.load(read('data/knowledge/library.json')), now: '2026-10-14T00:00:00Z' };
}
function studyCx() {
  const manifest = read('data/sf9/manifest.json'), data = {};
  for (const d of manifest.datasets) { const t = fs.readFileSync(path.join(ROOT, 'data/sf9', d.file), 'utf8'); assert.equal(crypto.createHash('sha256').update(t).digest('hex'), d.sha256, `${d.file} checksum`); data[d.file.replace('.json', '')] = JSON.parse(t); }
  return CT.context({ manifest, data });
}
const env = corridorEnv(), cx = studyCx(), registry = ORG.buildRegistry();
const quiet = fn => { const w = process.emitWarning; process.emitWarning = () => {}; try { return fn(); } finally { process.emitWarning = w; } };

test('organisation: five honest classes summing to 68; new executable profiles have real tools', () => {
  // Phase 10: the published registry is the world registry (68 San Francisco profiles + 14 Phase 10 profiles; see phase10.test.js).
  const op = read('data/agents/operational.json'), c = op.counts;
  assert.equal(op.agents.filter(a => registry.agents.some(x => x.id === a.id)).length, 68); assert.ok(op.agents.slice(0, 68).every((a, i) => a.id === registry.agents[i].id && a.code === registry.agents[i].code)); assert.equal(Object.values(c).reduce((a, b) => a + b, 0), op.agents.length);
  const counts = ORG.counts(registry); assert.equal(counts.executable, 19); assert.equal(counts.llm, 7); assert.equal(counts.unavailable, 13);
  for (const k of ['safety.crash-profile', 'flood.exposure', 'data.freshness', 'works.area-windows']) assert.ok(CT.TOOLS[k], k);
  for (const a of op.agents.filter(a => a.class === 'opérationnel autonome')) assert.ok(a.pastMissions.civ > 0, `${a.code} operational only with recorded autonomous work`);
  for (const a of op.agents.filter(a => a.class === 'enregistré, non implémenté')) assert.equal(a.capabilities.length, 0);
  for (const a of op.agents) { assert.match(a.memoryNamespace, /^mem:CORE-[A-Z]{3}-\d{4}$/); assert.ok(a.requiredApprovals.length); }
});

test('engine: hierarchy delegates through leads, gates hold, no self-approval, emergency stop, budgets', async () => {
  const memory = quiet(() => MEM.open(':memory:')), eng = E.createEngine({ registry, cx, env, memory });
  const m = await eng.run('safety-works', 'Tenderloin', { resume: false });
  assert.deepEqual(m.stages.map(s => s.stage), ['DISCOVERED', 'TRIAGED', 'ASSIGNED', 'INVESTIGATING', 'CROSS_DOMAIN_REVIEW', 'EVIDENCE_VALIDATION', 'PROPOSED_DECISION', 'HUMAN_REVIEW']);
  assert.equal(m.owner, 'core.san-francisco.mobility.lead');
  const first = m.messages.slice(0, 2); assert.equal(first[0].from, 'core.global.coordinator'); assert.equal(first[1].from, 'core.san-francisco.manager');
  // Cross-department work goes through the other department's lead (request → delegate).
  const works = m.subtasks.find(s => s.tool === 'works.area-windows'); assert.equal(works.via, 'core.san-francisco.civil.lead');
  assert.ok(m.messages.some(x => x.type === 'request' && x.to === 'core.san-francisco.civil.lead') && m.messages.some(x => x.type === 'delegate' && x.from === 'core.san-francisco.civil.lead' && x.to === works.agent));
  assert.ok(m.messages.every(x => x.mission === m.id && x.from && x.to && x.at && x.type && x.purpose));
  assert.ok(m.messages.some(x => x.type === 'challenge' && x.from === 'core.san-francisco.research.evidence-verifier'));
  assert.equal(m.decision.authorizes, 'rien — décision humaine requise');
  assert.throws(() => eng.humanDecision(m, 'core.san-francisco.mobility.lead', 'approve'), /humain/);
  eng.humanDecision(m, 'human:test-reviewer', 'needs-evidence', 'test'); assert.equal(m.state, 'NEEDS_MORE_EVIDENCE');
  assert.ok(m.subtasks.length <= E.LIMITS.maxSubtasks && m.subtasks.every(s => s.depth <= E.LIMITS.maxDepth));
  assert.equal(new Set(m.subtasks.map(s => s.key)).size, m.subtasks.length, 'no duplicate work');
  eng.stopAll(); const s = await eng.run('flood-works', 'Mission', { resume: false }); assert.equal(s.state, 'CANCELLED');
  assert.equal(eng.resetStop('core.agent'), false); assert.equal(eng.resetStop('human:test'), true);
  assert.deepEqual(eng.discoverAll().map(p => p.priority), eng.discoverAll().map(p => p.priority).slice().sort((a, b) => b - a), 'priority queue');
});

test('engine: recovery after a simulated crash resumes from the checkpoint and reaches the same result; reruns are idempotent', async () => {
  const memory = quiet(() => MEM.open(':memory:'));
  await assert.rejects(E.createEngine({ registry, cx, env, memory, learn: false }).run('flood-works', 'South of Market', { crashAfter: 'INVESTIGATING' }), /arrêt simulé/);
  assert.equal(memory.loadCheckpoint('civ:flood-works:south-of-market@' + cx.asOf).stage, 'INVESTIGATING');
  const resumed = await E.createEngine({ registry, cx, env, memory, learn: false }).run('flood-works', 'South of Market');
  assert.equal(resumed.resumedFrom, 'INVESTIGATING'); assert.equal(resumed.state, 'HUMAN_REVIEW');
  const fresh = await E.createEngine({ registry, cx, env, memory: quiet(() => MEM.open(':memory:')), learn: false }).run('flood-works', 'South of Market');
  assert.deepEqual(resumed.findings.map(f => f.claim), fresh.findings.map(f => f.claim));
  const again = await E.createEngine({ registry, cx, env, memory, learn: false }).run('flood-works', 'South of Market');
  assert.equal(again.messages.length, resumed.messages.length, 'a finished mission is not re-executed');
});

test('memory: four layers, promotion workflow, human-only world findings, tamper-evident chain', () => {
  const m = quiet(() => MEM.open(':memory:'));
  m.putIdentity('a', 'v1', { code: 'CORE-X' }); m.putKnowledge('a', [{ id: 'k1', version: 2 }]); m.addEpisode({ agent: 'a', mission: 'x', workflow: 'w', role: 'specialist' });
  assert.equal(m.identity('a').code, 'CORE-X'); assert.equal(m.knowledge('a').length, 1); assert.equal(m.episodes('a').length, 1);
  const p = m.propose({ kind: 'procedure', workflow: 'w', statement: 's', origin: 'a', basis: 'deterministic-records' });
  assert.throws(() => m.transition(p.id, 'reviewed', 'b')); m.transition(p.id, 'verified', 'b'); assert.throws(() => m.transition(p.id, 'reviewed', 'a'), /autre agent/);
  m.transition(p.id, 'reviewed', 'b'); m.transition(p.id, 'approved', 'b');
  const f = m.propose({ kind: 'finding', workflow: 'w', statement: 'fact', origin: 'a' }); m.transition(f.id, 'verified', 'b'); m.transition(f.id, 'reviewed', 'c');
  assert.throws(() => m.transition(f.id, 'approved', 'c'), /humain/); m.transition(f.id, 'approved', 'human:founder');
  const l = m.propose({ kind: 'lesson', workflow: null, statement: 'no basis', origin: 'a' }); m.transition(l.id, 'verified', 'b'); m.transition(l.id, 'reviewed', 'c'); assert.throws(() => m.transition(l.id, 'approved', 'c'), /déterministes/);
  assert.ok(m.verify().ok);
  const pub = read('data/memory/export.json'); assert.ok(pub.chain.ok); assert.ok(pub.institutional.every(e => e.kind !== 'finding' || e.status !== 'approved' || e.history.some(h => /^human:/.test(h.by))));
});

test('learning: measured improvement on an identical task (procedural) and honest model-lesson records', () => {
  const v3 = read('data/civ/experiments/learning-v3-frozen-lessons-fixed-validator.json'), p = v3.procedural;
  assert.ok(p.before.failed > 0 && p.after.failed === 0 && p.after.toolCalls < p.before.toolCalls && p.sameFindings && p.after.proceduresApplied.length > 0);
  assert.ok(p.training.proceduresLearned.every(e => e.status === 'approved' && e.history.map(h => h.status).join() === 'candidate,verified,reviewed,approved'));
  for (const f of ['learning-v1-generic-lessons.json', 'learning-v2-quoted-shared-lessons.json', 'learning-v3-frozen-lessons-fixed-validator.json']) {
    const x = read(`data/civ/experiments/${f}`); if (!x.model || x.model.skipped) continue;
    for (const k of ['before', 'after']) { const n = x.model[k].reduce((s, t) => s + t.rejected.length, 0), tot = x.model[k].reduce((s, t) => s + t.rejected.length + t.accepted.length, 0); assert.equal(n, x.model.summary[k].rejected); assert.equal(tot, x.model.summary[k].statements); }
  }
  assert.ok(v3.model.after.every(t => t.lessonsUsed === v3.model.lessons.length), 'v3: identical lessons for every test task');
});

test('recorded autonomous missions: participants exist, permissions hold, evidence resolves, model statements re-validate', () => {
  const idx = read('data/civ/index.json'); assert.ok(idx.missions.length >= 4 && new Set(idx.missions.map(m => m.workflow)).size >= 2);
  const byId = new Map(registry.agents.map(a => [a.id, a]));
  for (const e of idx.missions.filter(e => (e.city || 'san-francisco') === 'san-francisco' && e.scope !== 'world')) { // other cities and world missions: phase10.test.js
    const m = read(`data/civ/missions/${e.file || e.id.replace(/[:@]/g, '-') + '.json'}`);
    assert.ok(['HUMAN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_MORE_EVIDENCE'].includes(m.state));
    for (const x of m.messages) for (const id of [x.from, x.to]) assert.ok(byId.has(id) || id === 'human' || /^human:/.test(id), id);
    for (const s of m.subtasks) { const def = CT.TOOLS[s.tool] || require('../src/tools.js').TOOLS[s.tool]; assert.ok(ORG.canUse(byId.get(s.agent), s.tool, def.permission), `${s.code} → ${s.tool}`); }
    const extra = r => r.type === 'knowledge' || r.type === 'dataset' || r.type === 'feed' || r.type === 'feed-source' || (r.type === 'record' && (env.ctx.byRecord.has(r.ref) || (([ds, ...id]) => !!(env.ctx.data[ds] && env.ctx.data[ds].features.some(f => String(f.properties.record_id) === id.join(':'))))(String(r.ref).split(':'))));
    const rv = CT.review(cx, m.findings, m.recommendation, extra); assert.equal(rv.rejected.length, 0, `${m.id}: accepted findings still resolve`);
    const F = m.findings.slice(0, 8).map((f, i) => ({ id: `F${i + 1}`, claim: f.claim, values: f.values }));
    for (const a of m.model.accepted) assert.ok(E.validateStatement(a, F).ok, a.statement); for (const r of m.model.rejected) assert.equal(E.validateStatement(r, F).ok, false);
    assert.ok(!m.human || /^human:/.test(m.human.reviewer));
  }
});

test('pedestrian routes never cross building footprints (three neighbourhoods, seeded routes)', () => {
  const w = read('data/osm/walk-network.json'), net = POP.network(w), sample = read('data/osm/buildings-sample.json');
  assert.equal(w.source.licence, 'ODbL 1.0'); assert.ok(w.validation.edges_removed_crossing_buildings > 0);
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
  assert.ok(net.route(net.nodes[0], net.nodes[net.nodes.length - 1]), 'single connected network');
  const r = net.route([-122.4123, 37.7756], [-122.4245, 37.7640]); assert.ok(r.coords.every(c => net.nodes.some(n => n[0] === c[0] && n[1] === c[1])), 'no off-network legs');
});

test('local control centre: loopback only, token, host and origin checks, allowlisted actions, human decisions', async () => {
  const port = 18000 + Math.floor(Math.random() * 1000), child = spawn(process.execPath, ['scripts/control-server.mjs', '--port', String(port)], { cwd: ROOT, env: { ...process.env, NODE_NO_WARNINGS: '1' } });
  let out = ''; child.stdout.on('data', d => { out += d; }); child.stderr.on('data', () => {});
  try {
    for (let i = 0; i < 100 && !/#token=/.test(out); i++) await new Promise(r => setTimeout(r, 100));
    const token = out.match(/#token=([a-f0-9]+)/)[1], base = `http://127.0.0.1:${port}`;
    const req = (p, opt = {}) => fetch(base + p, opt).then(async r => ({ status: r.status, body: await r.text() }));
    assert.equal((await req('/api/status')).status, 401);
    assert.equal((await req('/api/status', { headers: { 'X-Core-Token': token } })).status, 200);
    assert.equal((await req('/api/status', { headers: { 'X-Core-Token': token, Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await req('/../../etc/passwd')).status, 404); assert.equal((await req('/data/sf/manifest.json')).status, 404);
    assert.equal((await req('/api/mission?id=../../x', { headers: { 'X-Core-Token': token } })).status, 400);
    assert.equal((await req('/api/decide', { method: 'POST', headers: { 'X-Core-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'civ:safety-works:mission@2026-10-14', reviewer: 'core.agent', decision: 'approve' }) })).status, 400);
    assert.equal((await req('/api/shell', { method: 'POST', headers: { 'X-Core-Token': token } })).status, 404);
    const host = await new Promise(ok => { const r = require('node:http').request({ host: '127.0.0.1', port, path: '/api/status', headers: { Host: 'attacker.example', 'X-Core-Token': token } }, res => ok(res.statusCode)); r.end(); }); assert.equal(host, 421);
    assert.equal((await req('/control.html')).status, 200);
  } finally { child.kill(); }
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'scripts/control-server.mjs'), 'utf8'), /child_process|exec\(|spawn\(|eval\(/);
});

test('privacy and supply chain: MapLibre self-hosted and SRI-verified, no third-party code CDN', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /unpkg\.com|jsdelivr|fonts\.googleapis/);
  for (const [f, h] of [['maplibre-gl.js', '58glfsJ+cxARGnts6etFXqTluJx24YUgVY1WQxNLIfLkwT7yJfBORU1dKLD/YFTG'], ['maplibre-gl.css', 'gNYNsUmuZqDYiT3gbirWTV5K7rt71RoveS/yXAaU09d4ZUmeDVTD3XoqB6uJAIFR']]) {
    assert.equal(crypto.createHash('sha384').update(fs.readFileSync(path.join(ROOT, 'assets/vendor/maplibre-gl-5.7.3', f))).digest('base64'), h); assert.ok(html.includes(`integrity="sha384-${h}"`)); }
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/vendor/maplibre-gl-5.7.3/LICENSE.txt')));
  const ctl = fs.readFileSync(path.join(ROOT, 'control.html'), 'utf8'); assert.match(ctl, /noindex/); assert.match(ctl, /local/i);
  const P = require('../src/data-policy.js'); for (const k of ['dataset:crashes-agg', 'dataset:hin', 'dataset:flood-zone', 'dataset:neighborhoods']) assert.equal(P.get(k).status, 'eligible');
  const crashes = read('data/sf9/crashes-agg.json'); assert.ok(crashes.rows.every(r => Object.keys(r).sort().join() === 'cnn,group,killed,n,nhood,severity'), 'aggregates only');
});
