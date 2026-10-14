// Phase 8 tests: population and status honesty, pedestrian routing, task queue state machine, recorded operations
// (re-executed), supervisor safety, problem ↔ agent links, registry immutability, privacy/CSP, refresh slots.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const src = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const POP = require('../src/agent-population.js'), ORG = require('../src/org.js'), TQ = require('../src/task-queue.js');
const C = require('../src/coord.js'), M = require('../src/missions.js'), KN = require('../src/knowledge.js');
const reg = ORG.buildRegistry();
const facts = () => POP.facts({ cogIndex: read('data/missions/cognitive/index.json'), detIndex: read('data/missions/index.json'), operations: read('data/operations/log.json') });

test('population: every registered profile is placed in one of 13 virtual zones with an honest status', () => {
  assert.equal(POP.ZONES.length, 13);
  for (const d of reg.departments) assert.ok(POP.ZONES.some(z => z.depts.includes(d.id)), `department ${d.id} has a zone`);
  const f = facts(), st = new Map(reg.agents.map(a => [a.id, POP.status(a, f)]));
  assert.equal(st.size, 68);
  assert.ok([...st.values()].every(s => Object.keys(POP.STATUS).includes(s)));
  assert.equal([...st.values()].filter(s => s === 'executing' || s === 'queued').length, 0, 'nothing runs without a live source');
  for (const a of reg.agents) { if (st.get(a.id) === 'recorded') assert.ok(f.recorded.has(a.id)); if (a.executionMode === 'coordination-only') assert.notEqual(st.get(a.id), 'available'); }
  const of = k => POP.filter(reg, a => st.get(a.id), k).length;
  assert.equal(of('all'), 68); assert.equal(of('executable'), 26, '24 in Phase 8 + 2 implemented in Phase 9'); assert.equal(of('active'), 0);
  const lead = reg.agents.find(a => a.id === 'core.san-francisco.forestry.lead'), team = POP.filter(reg, a => st.get(a.id), `team:${lead.id}`);
  assert.ok(team.some(a => a.id === lead.id) && team.every(a => a.id === lead.id || a.supervisor === lead.id));
  const live = POP.facts({ live: { running: [{ agents: ['core.san-francisco.civil.works-coordination'] }], queued: ['core.san-francisco.telecom.telecom-works'] } });
  assert.equal(POP.status(reg.agents.find(a => a.id === 'core.san-francisco.civil.works-coordination'), live), 'executing');
  assert.equal(POP.status(reg.agents.find(a => a.id === 'core.san-francisco.telecom.telecom-works'), live), 'queued');
  const r1 = POP.prng('CORE-PUB-0049'), r2 = POP.prng('CORE-PUB-0049'); assert.deepEqual([r1(), r1(), r1()], [r2(), r2(), r2()]);
});

test('pedestrian network: OSM ODbL snapshot, connected, routes stay on mapped pedestrian ways', () => {
  const w = POP.decode(read('data/osm/walk-network.json')); // Phase 9: compact v2 encoding, three neighbourhoods
  assert.equal(w.source.licence, 'ODbL 1.0'); assert.match(w.source.attribution, /OpenStreetMap contributors/);
  assert.deepEqual(w.kinds, ['sidewalk', 'crossing', 'footway', 'pedestrian', 'path', 'living_street']); assert.ok(w.validation.edges_removed_crossing_buildings >= 0);
  assert.ok(w.nodes.length > 5000 && w.edges.every(([a, b, k]) => a < w.nodes.length && b < w.nodes.length && k < w.kinds.length));
  const net = POP.network(w), nodeKeys = new Set(w.nodes.map(n => n.join()));
  const r = net.route([-122.4123, 37.7756], [-122.3965, 37.7855]);
  assert.ok(r && r.length > 1000 && r.length < 4000);
  const inner = r.coords.slice(1, -1); assert.ok(inner.every(c => nodeKeys.has(c.join())), 'every intermediate point is a network node');
  const z1 = POP.zoneLayout(net, [-122.4065, 37.7795]), z2 = POP.zoneLayout(net, [-122.4065, 37.7795]);
  assert.deepEqual(z1.map(z => z.anchor), z2.map(z => z.anchor)); assert.ok(z1.every(z => z.nodes.length > 0));
});

test('task queue: legal transitions only, idempotent intake, resumable, human-only completion, emergency stop, tamper-evident', () => {
  let t = 0; const clock = () => new Date(Date.UTC(2026, 9, 14, 12, 0, t++)).toISOString();
  const q = TQ.create(null, { clock });
  const a = q.intake({ key: 'k1', kind: 'segment-investigation', title: 'x' });
  assert.equal(q.intake({ key: 'k1', kind: 'segment-investigation', title: 'x' }).duplicate, true);
  assert.throws(() => q.start(a.id), /transition interdite/);
  q.classify(a.id, { domains: ['infrastructure'], evidenceRequired: ['permits'] }); q.assign(a.id, [{ id: 'x', code: 'CORE-CIV-0031', tool: 'works.windows' }]); q.start(a.id);
  const resumed = TQ.create(q.toJSON(), { clock }); assert.equal(resumed.get(a.id).state, 'assigned', 'running after a restart goes back to assigned');
  q.finish(a.id, { gateway: 'ok', decision: 'ÉLIGIBLE', summary: 's' }); assert.equal(q.get(a.id).state, 'awaiting-human');
  assert.equal(q.approve(a.id, 'core.san-francisco.manager'), false); assert.equal(q.approve(a.id, 'human:founder'), true); assert.equal(q.get(a.id).state, 'completed');
  assert.equal(q.intake({ key: 'm', kind: 'x', title: 'm', requiresModel: true }).reason, 'model-not-allowed');
  const b = q.intake({ key: 'k2', kind: 'x', title: 'y' }); q.emergencyStop('test'); assert.equal(q.get(b.id).state, 'cancelled');
  assert.equal(q.intake({ key: 'k3', kind: 'x', title: 'z' }).reason, 'emergency-stop'); assert.equal(q.reset('agent'), false); assert.equal(q.reset('human:founder'), true);
  assert.ok(q.verify().ok); const bad = q.toJSON(); bad.events[2].detail = 'rewritten'; assert.equal(TQ.create(bad).verify().ok, false);
});

test('recorded operations: chain verifies and a re-executed mission reproduces its recorded fingerprint', async t => {
  const ops = read('data/operations/log.json'); assert.ok(TQ.create(ops).verify().ok); assert.equal(ops.chain.head, TQ.create(ops).verify().head);
  assert.ok(ops.tasks.length > 0 && ops.tasks.every(t => t.agents.every(a => reg.agents.some(r => r.id === a.id && r.code === a.code))));
  const manifest = read('data/sf/manifest.json'), data = {}, verified = {};
  for (const d of manifest.datasets) { const tx = src(`data/sf/${d.file}`), k = d.file.replace('.geojson', ''); data[k] = JSON.parse(tx); verified[k] = crypto.createHash('sha256').update(tx).digest('hex') === d.sha256 ? 'ok' : 'mismatch'; }
  if (manifest.generated_at !== ops.snapshot) { t.skip('snapshot newer than the recorded operations: re-record with node scripts/supervisor.mjs run --fresh --record'); return; }
  const feedState = read('data/feeds/state.json'), env = { ctx: C.buildContext({ manifest, data, verified }), feeds: read('data/feeds/items.json'), feedState, feedHealth: feedState.health, knowledge: KN.load(read('data/knowledge/library.json')), now: new Date().toISOString() };
  const probs = read('data/problems/registry.json').problems, task = ops.tasks.find(t => t.result);
  const ps = probs.filter(p => task.problems.includes(p.id)), text = `Investigation des problèmes enregistrés : ${[...new Set(ps.map(p => p.title))].join(' ; ')}`.slice(0, 300);
  const m = M.newMission({ type: 'question', text, segment: task.scope.segment }, env); await M.run(m, env, { registry: reg });
  assert.equal(m.id, task.result.mission); assert.equal(m.fingerprint, task.result.fingerprint);
});

test('supervisor and agents cannot escalate: no shell, no network, bounded writes, frozen registry, human gates', () => {
  const s = src('scripts/supervisor.mjs');
  assert.doesNotMatch(s, /child_process|\bexec\(|spawn\(|eval\(|new Function/);
  assert.match(s, /globalThis\.fetch = \(\) => Promise\.reject/);
  for (const m of s.matchAll(/fs\.(writeFileSync|renameSync|rmSync|mkdirSync)\(([^,)]+)/g)) assert.match(m[2], /QF|LIVE|STOP|LOCK|DIR|data\/operations|`\$\{DIR\}/, `write target ${m[2]}`);
  const a = reg.agents.find(x => x.executionMode === 'deterministic');
  assert.ok(Object.isFrozen(a)); assert.throws(() => { 'use strict'; a.permission = 'govern'; }, TypeError);
  assert.equal(TQ.LIMITS.maxModelCalls, 0, 'the supervisor never calls a model by default');
  assert.ok(TQ.HUMAN.test('human:founder') && !TQ.HUMAN.test('core.agent') && !TQ.HUMAN.test('human:'));
});

test('problems: severity rule, investigation from recorded operations, agents both ways', () => {
  const R = read('data/problems/registry.json'), ops = read('data/operations/log.json');
  for (const p of R.problems) {
    assert.ok(p.severity && p.severity.level && p.severity.basis); assert.ok(p.investigation && p.investigation.label);
    assert.ok(p.assignedAgents.every(id => reg.agents.some(a => a.id === id)));
    if (p.investigation.task) { const t = ops.tasks.find(x => x.id === p.investigation.task); assert.ok(t && t.problems.includes(p.id) && t.state === p.investigation.state); }
    assert.equal(p.humanDecision, 'aucune décision humaine enregistrée');
    assert.ok(p.related.every(r => R.problems.some(o => o.id === r && o.segment === p.segment)));
  }
  assert.ok(R.problems.filter(p => p.status === 'hypothesis' && !p.segment).every(p => p.investigation.state === 'no-tool'));
});

test('privacy and CSP: no Google Fonts, self-hosted OFL fonts, privacy notice without scripts, refresh slot arithmetic', () => {
  const html = src('index.html'), corridor = src('corridor.html'), privacy = src('privacy.html');
  for (const h of [html, corridor, privacy]) assert.doesNotMatch(h, /fonts\.googleapis|fonts\.gstatic/);
  assert.match(html, /font-src 'self'/); assert.match(html, /href="privacy\.html"/);
  for (const f of ['oxanium-500.woff2', 'ibm-plex-sans-400.woff2', 'ibm-plex-mono-400.woff2', 'ibm-plex-mono-500.woff2', 'OFL-oxanium.txt', 'OFL-ibmplexsans.txt', 'OFL-ibmplexmono.txt']) assert.ok(fs.existsSync(path.join(ROOT, 'assets/fonts', f)), f);
  assert.doesNotMatch(privacy, /<script/); assert.match(privacy, /Content-Security-Policy/); assert.match(privacy, /ne revendique aucune conformité/);
  const fn = new Function(`return ${src('src/civ.js').match(/function expectedSlots[\s\S]*?return n; \}/)[0]}`)();
  assert.equal(fn('2026-10-14T01:24:16Z', '2026-10-14T14:00:00Z'), 4); assert.equal(fn('2026-10-14T03:17:30Z', '2026-10-14T06:17:00Z'), 1);
  const P = require('../src/data-policy.js'); assert.equal(P.get('dataset:osm-walk-network').status, 'eligible');
});
