// Phase 7 tests: machine IDs, bounded scheduler, problems registry, truthful replay, CSP and entry experience.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const ORG = require('../src/org.js'), SCHED = require('../src/scheduler.js'), C = require('../src/coord.js'), POLICY = require('../src/data-policy.js');
globalThis.CORE_COORD = C; require('../src/agents-world.js'); const AW = globalThis.CORE_AGENTS_WORLD;
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function snapshot() {
  const manifest = read('data/sf/manifest.json'), data = {}, verified = {};
  for (const d of manifest.datasets) { const t = fs.readFileSync(path.join(ROOT, 'data/sf', d.file), 'utf8'), k = d.file.replace('.geojson', ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'mismatch'; }
  return C.buildContext({ manifest, data, verified });
}

test('machine IDs: unique, CORE-<DEPT>-<NNNN>, deterministic, persisted in the registry', () => {
  const a = ORG.buildRegistry(), b = ORG.buildRegistry();
  assert.deepEqual(a.agents.map(x => x.code), b.agents.map(x => x.code));
  assert.equal(new Set(a.agents.map(x => x.code)).size, a.agents.length);
  for (const x of a.agents) assert.match(x.code, /^CORE-[A-Z]{3}-\d{4}$/);
  for (const d of ORG.DEPARTMENTS) assert.ok(ORG.DEPT_CODE[d.id], `department ${d.id} has a code`);
  assert.deepEqual(read('data/agents/registry.json').agents.map(x => x.code), a.agents.map(x => x.code));
});

test('scheduler: SHA-256 chain, human-only approval, bounded retries, time budget, queue limit, emergency stop', async () => {
  for (const s of ['', 'abc', 'é'.repeat(300)]) assert.equal(SCHED.sha256(s), crypto.createHash('sha256').update(s).digest('hex'));
  const q = SCHED.create({ maxQueued: 3, maxMsPerJob: 50 });
  let tries = 0;
  q.enqueue({ label: 'ok', run: async () => 'done' });
  q.enqueue({ label: 'flaky', run: async () => { tries++; throw new Error('boom'); } });
  q.enqueue({ label: 'slow', run: () => new Promise(r => setTimeout(r, 200)) });
  assert.equal(q.enqueue({ label: 'overflow', run: async () => 1 }).reason, 'queue-full');
  const s = await q.drain();
  assert.equal(tries, SCHED.LIMITS.maxAttempts, 'retries are bounded');
  assert.equal(s.counts.completed, 1); assert.equal(s.counts.failed, 2);
  assert.match(s.jobs.find(j => j.label === 'slow').error, /budget de temps/);
  const g = SCHED.create(), j = g.enqueue({ label: 'gated', requiresApproval: true, run: async () => 1 });
  assert.equal(g.approve(j.id, 'core.san-francisco.manager'), false, 'an agent cannot approve');
  assert.equal(g.snapshot().jobs[0].state, 'awaiting-approval');
  assert.equal(g.approve(j.id, 'human:reviewer'), true);
  g.emergencyStop('test'); assert.equal(g.snapshot().jobs[0].state, 'stopped');
  assert.equal(g.enqueue({ label: 'after', run: async () => 1 }).ok, false);
  assert.equal(g.reset('core.agent'), false); assert.equal(g.reset('human:reviewer'), true);
  assert.ok(g.verify().ok); g.log[1].detail = 'edited'; assert.equal(g.verify().ok, false, 'tampering breaks the chain');
});

test('problems registry: derived from the verified snapshot, typed knowledge, no invented measurements', () => {
  const R = read('data/problems/registry.json'), ctx = snapshot();
  assert.ok(Object.values(ctx.datasets).every(d => d.verified === 'ok'));
  const STATUSES = ['observed', 'potential-risk', 'hypothesis', 'simulated'];
  const counts = {}; for (const p of R.problems) { assert.ok(STATUSES.includes(p.status), p.id); counts[p.status] = (counts[p.status] || 0) + 1; }
  assert.deepEqual(counts, R.counts);
  for (const p of R.problems.filter(x => x.status !== 'hypothesis')) {
    assert.ok(p.evidence.length > 0, `${p.id} cites evidence`);
    for (const e of p.evidence) { const [k, id] = e.ref.split(':'); if (k === 'sidewalks') assert.ok(ctx.data.sidewalks.features.some(f => String(f.properties.record_id) === id), e.ref); }
  }
  for (const p of R.problems.filter(x => x.status === 'observed')) { const f = ctx.data.sidewalks.features.find(x => `sidewalks:${x.properties.record_id}` === p.evidence[0].ref).properties; assert.ok(f.width_ft < f.min_width_ft); assert.ok(p.statement.includes(`${f.width_ft} ft`)); }
  for (const p of R.problems.filter(x => x.status === 'simulated')) assert.match(p.statement, /non calibré/);
  for (const p of R.problems.filter(x => x.status === 'hypothesis')) assert.equal(p.evidence.length, 0);
  assert.ok(R.gaps.every(g => g.status === 'no-evidence-integrated'));
  assert.equal(R.fingerprint, C.fingerprint({ snapshot: R.snapshot, problems: R.problems.map(p => [p.id, p.status]) }));
});

test('replay: strict recorded order, states from recorded events, routes on the corridor network, derived messages', () => {
  const ctx = snapshot(), reg = ORG.buildRegistry();
  globalThis.CORE_PLATFORM = { state: { store: { items: read('data/feeds/items.json').items } } };
  Object.assign(AW.state, { ctx, data: ctx.data, reg: ORG.index(reg), net: AW.buildNet(ctx) });
  AW.state.hub = [...AW.state.net.nodes.values()][0];
  const segCoords = new Set([...ctx.segments.values()].flatMap(f => (f.geometry.type === 'MultiLineString' ? f.geometry.coordinates.flat() : f.geometry.coordinates).map(c => c.join())));
  for (const m of read('data/missions/cognitive/index.json').missions) {
    const mc = read(`data/missions/cognitive/${m.id.replace(':', '-')}.json`), plan = AW._buildReplay(mc, ctx);
    let prevT = -1;
    for (const s of plan.steps) {
      assert.ok(mc.log.some(l => l.t === s.t && l.agent === s.agent && l.kind === s.kind), `${m.id}: step not in log`);
      assert.ok(plan.steps.filter(x => x.t < s.t - 50).every(x => x.start <= s.start), 'display order follows the recorded order');
      assert.ok(s.t >= prevT, 'recorded timestamps are non-decreasing'); prevT = s.t;
      if (s.path) { const inner = s.path.coords.slice(1, -1); if (!s.path.approx) assert.ok(inner.every(c => segCoords.has(c.join())), 'non-approximate routes follow street geometry'); }
    }
    assert.ok(plan.agents.every(id => mc.agents.includes(id) || mc.log.some(l => l.agent === id)));
    const groups = ['investigation', 'deliberation', 'revision', 'scenario', 'review'].reduce((n, b) => n + new Set(mc.board.filter(x => x.phase === b).map(x => x.agent)).size, 0);
    assert.equal(plan.messages.length, groups + (mc.responses || []).length + (mc.specialistRequests || []).length + (mc.requests || []).length + (mc.decision ? 1 : 0));
    assert.ok(plan.messages.every(x => x.mission === mc.id));
    assert.ok(plan.links.length <= (mc.disagreements || []).length);
  }
});

test('CSP and subresource integrity: declared, current, quarantined sources blocked', () => {
  const r = spawnSync(process.execPath, ['scripts/csp.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.doesNotMatch(csp, /open-meteo|unsafe-eval/); assert.match(csp, /object-src 'none'/);
  const plat = fs.readFileSync(path.join(ROOT, 'src/platform.js'), 'utf8');
  assert.match(plat, /href="\$\{esc\(safeUrl\(i\.url\)\)\}"/, 'external feed links are scheme-checked');
  for (const m of html.matchAll(/<(script|link)[^>]+unpkg\.com[^>]*>/g)) assert.match(m[0], /integrity="sha384-[A-Za-z0-9+/=]+" crossorigin="anonymous"/);
});

test('entry experience: ENTER CORE, original brand assets, NASA imagery declared in the data policy', () => {
  assert.match(html, />ENTER CORE</); assert.doesNotMatch(html, /Enter the Grid/i);
  assert.match(html, /Creation of Reborn Earth/);
  for (const f of ['core-wordmark.svg', 'core-mark.svg', 'core-lockup.svg']) { const svg = fs.readFileSync(path.join(ROOT, 'assets/brand', f), 'utf8'); assert.match(svg, /^<svg /); assert.doesNotMatch(svg, /<script|href=|xlink/i); }
  const gibs = POLICY.get('display:nasa-gibs-blue-marble'); assert.equal(gibs.status, 'eligible'); assert.match(gibs.attribution, /NASA GIBS/);
  assert.match(html, /gibs\.earthdata\.nasa\.gov\/wmts\/epsg3857\/best\/BlueMarble_ShadedRelief_Bathymetry/);
  assert.deepEqual([...html.matchAll(/<button type="button" role="tab" data-sec="(\w+)"/g)].map(m => m[1]), ['world', 'civ', 'intel', 'missions', 'evidence']);
});
