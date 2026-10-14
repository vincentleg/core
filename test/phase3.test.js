const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const C = require('../src/coord');
const ORG = require('../src/org');
const KN = require('../src/knowledge');
const F = require('../src/feeds');
const T = require('../src/tools');
const M = require('../src/missions');
const L = require('../src/llm');
const EV = require('../src/evals');

const ROOT = path.join(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function makeEnv(verifiedOverride) {
  const manifest = read('data/sf/manifest.json'), data = {}, verified = {};
  for (const d of manifest.datasets) { const t = fs.readFileSync(path.join(ROOT, 'data/sf', d.file), 'utf8'), k = d.file.replace(/\.geojson$/, ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'mismatch'; }
  const feedState = read('data/feeds/state.json');
  return { ctx: C.buildContext({ manifest, data, verified: { ...verified, ...(verifiedOverride || {}) } }), feeds: read('data/feeds/items.json'), feedState, feedHealth: feedState.health,
    knowledge: KN.load(read('data/knowledge/library.json')), now: '2026-10-13T23:00:00Z' };
}
const env = makeEnv();
const registry = ORG.buildRegistry();
const sug = key => env.feedState.suggestions.find(s => s.key.startsWith(key));

test('registry: persistent identities, honest execution modes, no credentials', () => {
  const c = ORG.counts(registry), file = read('data/agents/registry.json');
  assert.equal(c.registered, registry.agents.length);
  assert.equal(new Set(registry.agents.map(a => a.id)).size, c.registered, 'unique ids');
  assert.deepEqual(file.agents.map(a => a.id), registry.agents.map(a => a.id), 'persisted registry matches code');
  assert.equal(c.departments, 28); assert.equal(c.llm, 5); // Phase 4: model-assisted specialists (need a local model at run time)
  assert.ok(c.executable >= 10 && c.unavailable >= 10);
  for (const a of registry.agents) {
    for (const k of ['id', 'scope', 'department', 'role', 'specialization', 'competencies', 'knowledge', 'tools', 'permission', 'supervisor', 'executionMode', 'missionHistory', 'evaluationHistory', 'knowledgeVersion', 'status', 'budget']) assert.ok(k in a, `${a.id} has ${k}`);
    assert.ok(Object.isFrozen(a)); assert.ok(ORG.PERMISSIONS.includes(a.permission));
    assert.doesNotMatch(a.role, /\b(PE|licensed|certified|diplômé|agréé)\b/i, 'no invented credentials');
    if (a.executionMode === 'deterministic') assert.ok(a.tools.every(t => T.TOOLS[t] || ['evidence.verify', 'adversarial.review', 'decision.gateway', 'mission.plan'].includes(t)), `${a.id} tools exist`);
    if (a.executionMode === 'unavailable') { assert.equal(a.tools.length, 0); assert.ok(a.gap); }
  }
  assert.ok(ORG.canUse(registry.agents.find(a => a.tools.includes('works.windows')), 'works.windows', 'analyze'));
  assert.equal(ORG.canUse(registry.agents.find(a => a.tools.includes('knowledge.retrieve')), 'knowledge.retrieve', 'review'), false, 'no elevation');
});

test('knowledge: retrieval, freshness, contradictions, human-only approval', () => {
  const K = KN.load(read('data/knowledge/library.json'));
  assert.equal(KN.retrieve(K, 'tree removal notice')[0].id, 'k-tree-removals');
  assert.ok(KN.retrieve(K, 'zzzz qqqq').length === 0);
  const f = KN.freshness(K.lib.documents.find(d => d.id === 'k-building-permits'), '2026-11-01T00:00:00Z'); assert.equal(f.stale, true);
  const c = KN.contradictions(KN.docClaims(K)); const gg = c.find(x => x.key === 'golden-gate-main-span-m');
  assert.equal(gg.status, 'compatible within tolerance');
  assert.equal(KN.contradictions([{ key: 'k', value: true, doc: 'a' }, { key: 'k', value: false, doc: 'b' }])[0].status, 'conflict');
  const p = KN.propose(K, { docId: 'k-street-trees', proposedBy: 'core.san-francisco.forestry.street-trees', change: { text: 'zqxjrefresh inventory' }, reason: 'new inventory' });
  assert.throws(() => KN.review(K, p.id, 'core.san-francisco.manager', 'approve'), /humain/);
  assert.equal(KN.retrieve(K, 'zqxjrefresh').length, 0, 'pending proposals are invisible to agents');
  const v0 = K.lib.documents.find(d => d.id === 'k-street-trees').version;
  KN.review(K, p.id, 'human:reviewer', 'approve'); assert.equal(K.lib.documents.find(d => d.id === 'k-street-trees').version, v0 + 1); assert.equal(KN.retrieve(K, 'zqxjrefresh')[0].id, 'k-street-trees');
  const s = KN.propose(K, { docId: 'k-neutrality', proposedBy: 'core.san-francisco.manager', change: { permission: 'govern' }, reason: 'more power' });
  assert.equal(KN.review(K, s.id, 'human:reviewer', 'approve').status, 'rejected', 'agents cannot change their rules or permissions');
});

test('city intelligence: normalization, verification, classification, dedupe and change detection', () => {
  const rss = '<rss><channel><item><title>Street tree planting &amp; sidewalk repair</title><link>https://sfpublicworks.org/a</link><guid>a</guid><pubDate>Mon, 12 Oct 2026 10:00:00 +0000</pubDate><description><![CDATA[<p>Trees</p>]]></description></item></channel></rss>';
  const it = F.itemsFrom('rss-publicworks', rss)[0];
  assert.equal(it.kind, 'announcement'); assert.equal(it.verification.status, 'official-source'); assert.ok(it.domains.includes('nature'));
  assert.equal(it.published, '2026-10-12T10:00:00.000Z');
  const q = F.itemsFrom('usgs-quakes', { features: [{ id: 'x1', properties: { mag: 3.4, place: 'near SF', time: Date.parse('2026-10-01'), status: 'automatic', magType: 'ml', url: 'https://earthquake.usgs.gov/earthquakes/eventpage/x1' }, geometry: { coordinates: [-122.3, 37.8, 8] } }] })[0];
  assert.equal(q.kind, 'observation'); assert.match(q.summary, /révisable/);
  const fake = { ...it, url: 'https://example.com/x' }; assert.equal(F.verify(fake).status, 'unverified');
  const dup = F.itemsFrom('datasf-building', [{ permit_number: 'P1', status: 'filed', filed_date: '2026-10-01', location: { type: 'Point', coordinates: [-122.41, 37.77] }, description: 'a' }, { permit_number: 'P1', status: 'filed', filed_date: '2026-10-01', location: { type: 'Point', coordinates: [-122.41, 37.77] }, description: 'b' }]);
  assert.equal(dup.length, 1); assert.equal(dup[0].kind, 'proposal');
  const store = { items: [] };
  assert.deepEqual(F.merge(store, [it], 't1'), { added: 1, changed: 0, unchanged: 0 });
  assert.deepEqual(F.merge(store, [it], 't2'), { added: 0, changed: 0, unchanged: 1 });
  const changed = { ...it, summary: 'changed', hash: 'other' };
  assert.deepEqual(F.merge(store, [changed], 't3'), { added: 0, changed: 1, unchanged: 0 });
  assert.equal(store.items[0].revision, 2); assert.equal(store.items[0].first_seen, 't1');
  const leg = F.itemsFrom('legistar', [{ MatterId: 9, MatterGuid: 'g', MatterTypeName: 'Ordinance', MatterFile: '1', MatterTitle: 'Planning Code', MatterStatusName: 'Passed', MatterIntroDate: '2026-10-01T00:00:00' }])[0];
  assert.equal(leg.kind, 'approved-decision'); assert.equal(F.suggest(leg, env.ctx), null, 'civic items never auto-trigger missions');
});

test('city intelligence store: real items with source, dates and verification; rate limits respected', () => {
  const items = env.feeds.items, state = env.feedState;
  assert.ok(items.length > 50);
  for (const i of items) { assert.ok(i.source && i.url && i.retrieved_at && i.first_seen && F.KINDS.includes(i.kind)); assert.ok(i.verification && i.verification.status); }
  assert.ok(new Set(F.SOURCES.map(s => s.id).filter(id => items.some(i => i.source === id))).size >= 6, 'several distinct sources');
  assert.equal(new Set(items.map(i => i.id)).size, items.length, 'deduplicated');
  assert.doesNotMatch(JSON.stringify(items), /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, 'no personal emails in the feed store');
  assert.equal(F.itemsFrom('rss-sfpuc', '<rss><channel><item><title>Award a.b@sfwater.org 415-555-0100</title><link>https://sfpuc.gov/x</link><guid>x</guid><pubDate>Mon, 12 Oct 2026 10:00:00 +0000</pubDate></item></channel></rss>')[0].title, 'Award [contact masqué] [téléphone masqué]');
  assert.ok(state.lastSuccessfulUpdate && state.health.length === F.SOURCES.length && /manuelle|GitHub Actions|surveillance/.test(state.scheduler), 'the scheduler actually used is stated');
  const now = Date.parse(state.lastSuccessfulUpdate);
  assert.equal(F.dueSources({ items, sources: state.sources }, now + 60000).length, 0, 'no source re-requested within its interval');
  assert.equal(F.dueSources({ items, sources: state.sources }, now + 61 * 60000).length, F.SOURCES.filter(s => s.enabled !== false && s.minIntervalMin <= 60).length, 'hourly sources due after an hour; retired and daily sources are not');
  assert.ok(state.health.some(h => /stale/.test(h.freshness)), 'stale official sources are reported, not hidden');
});

test('event → graph link → mission suggestion → specialists → sourced conclusion → gateway', async () => {
  const s = sug('corridor:7056000'); assert.ok(s, 'real feed item produced a mission suggestion');
  const item = env.feeds.items.find(i => i.id === s.item);
  assert.equal(F.linkToCorridor(item, env.ctx).segment, '7056000');
  const m = M.newMission({ type: 'suggestion', suggestion: s }, env);
  await M.run(m, env, { registry });
  assert.ok(m.tasks.length >= 8 && m.tasks.every(t => t.state === 'succeeded'));
  assert.ok(m.plan.specialists.every(x => registry.agents.find(a => a.id === x.agent).executionMode === 'deterministic'));
  assert.ok(m.findings.every(f => T.EPISTEMIC.includes(f.epistemic) && f.evidence.length > 0));
  assert.ok(m.verification.every(v => v.resolved === v.evidence), 'every evidence reference resolves');
  assert.ok(m.conclusion.statements.every(st => st.cites.length && st.cites.every(i => m.findings[i])), 'manager adds no uncited facts');
  assert.equal(m.decision.state, 'ÉLIGIBLE À LA REVUE HUMAINE'); assert.equal(m.decision.authorizes, false);
  assert.equal(M.recompute(m.origin, env, registry).fingerprint, m.fingerprint, 'reproducible');
  const recorded = read('data/missions/index.json').missions.find(x => x.origin === 'corridor:7056000');
  assert.equal(recorded.fingerprint, m.fingerprint, 'matches the recorded Node mission');
  const logStates = m.log.filter(l => l.kind === 'mission').map(l => l.state);
  assert.deepEqual(logStates.slice(0, 4), ['planning', 'assigned', 'running', 'reviewing']);
});

test('seismic event mission concludes honestly with missing structural data', async () => {
  const m = M.newMission({ type: 'suggestion', suggestion: sug('seismic') }, env);
  await M.run(m, env, { registry });
  assert.ok(m.tasks.some(t => t.tool === 'resilience.quake-context'));
  assert.ok(m.findings.some(f => f.limitation));
  assert.equal(m.decision.state, 'PREUVES SUPPLÉMENTAIRES REQUISES');
});

test('orchestration: permission denial, timeout, retries and cancellation', async () => {
  const R = ORG.buildRegistry(); let calls = 0;
  T.TOOLS['test.slow'] = { permission: 'analyze', applies: () => true, run: () => new Promise(r => setTimeout(() => r({ records: 0, findings: [] }), 300)) };
  T.TOOLS['test.flaky'] = { permission: 'analyze', applies: () => true, run: () => { calls++; if (calls === 1) throw new Error('transient'); return { records: 0, findings: [] }; } };
  T.TOOLS['test.privileged'] = { permission: 'govern', applies: () => true, run: () => ({ records: 0, findings: [] }) };
  try {
    R.agents.push(Object.freeze({ ...R.agents.find(a => a.department === 'data-science' && a.executionMode === 'deterministic'), id: 'test.slow', tools: ['test.slow'] }),
      Object.freeze({ ...R.agents.find(a => a.department === 'data-science' && a.executionMode === 'deterministic'), id: 'test.flaky', tools: ['test.flaky'] }),
      Object.freeze({ ...R.agents.find(a => a.department === 'data-science' && a.executionMode === 'deterministic'), id: 'test.priv', tools: ['test.privileged'], permission: 'analyze' }));
    const m = M.newMission({ type: 'question', text: 'test' }, env, { timeoutMs: 100, retries: 1 });
    await M.run(m, env, { registry: R });
    const st = id => m.tasks.find(t => t.agent === id);
    assert.equal(st('test.slow').state, 'timed-out'); assert.equal(st('test.slow').attempts, 2);
    assert.equal(st('test.flaky').state, 'succeeded'); assert.equal(st('test.flaky').attempts, 2);
    assert.equal(st('test.priv').state, 'denied');
    assert.notEqual(m.decision.state, 'ÉLIGIBLE À LA REVUE HUMAINE', 'failed tasks prevent eligibility');
    const c = M.newMission({ type: 'question', text: 'cancel me' }, env, { timeoutMs: 1000 });
    const p = M.run(c, env, { registry: R }); M.cancel(c); await p;
    assert.equal(c.state, 'cancelled'); assert.ok(c.tasks.every(t => ['cancelled', 'succeeded'].includes(t.state)));
  } finally { delete T.TOOLS['test.slow']; delete T.TOOLS['test.flaky']; delete T.TOOLS['test.privileged']; }
});

test('mission gateway fails closed on tampering and unvalidated model claims', async () => {
  const m = M.newMission({ type: 'suggestion', suggestion: sug('corridor:7056000') }, env); await M.run(m, env, { registry });
  const tamper = f => { const x = JSON.parse(JSON.stringify(m)); f(x); return M.issueMissionDecision(x, env, registry); };
  assert.equal(tamper(x => { x.findings[0].claim = 'invented'; }).state, 'REJETÉ');
  assert.equal(tamper(x => { x.findings[0].evidence = [{ type: 'record', ref: 'permits:FAKE@1' }]; x.fingerprint = M.recompute(x.origin, env, registry).fingerprint; }).state, 'REJETÉ');
  assert.equal(tamper(x => { x.llm = { validated: false }; }).state, 'REJETÉ');
  assert.equal(tamper(x => { x.conclusion = null; }).state, 'REJETÉ');
  const unverified = makeEnv({ permits: 'mismatch' });
  assert.equal(M.issueMissionDecision(m, unverified, registry).state, 'REJETÉ');
});

test('LLM interface: validator rejects uncited or fabricated claims; no provider is reachable here', async () => {
  const findings = [{ claim: '4 fenêtres d’excavation de 3 organisations.' }, { claim: '18 arbres inventoriés.' }];
  const ok = L.validate('Quatre fenêtres sont observées [0]. Il y a 18 arbres [1].', findings);
  assert.equal(ok.validated, true);
  const bad = L.validate('Il y a 25 arbres [1]. Les travaux causent des dommages. Voir [7].', findings);
  assert.equal(bad.validated, false); assert.equal(bad.rejected.length, 3);
  const r = await L.probe(L.PROVIDERS.ollama, { fetchImpl: () => Promise.reject(new Error('refused')), timeoutMs: 50 });
  assert.equal(r.available, false);
  assert.match(L.prompt({ findings }), /n'ajoute aucun chiffre/);
});

test('competency evaluations pass and are persisted with knowledge version', () => {
  const live = EV.evaluate(env, registry, { date: '2026-10-13' });
  assert.ok(live.length >= 14 && live.every(r => r.pass), live.filter(r => !r.pass).map(r => r.case).join(', '));
  const file = read('data/agents/evaluations.json');
  assert.equal(file.results.length, live.length); assert.ok(file.results.every(r => r.knowledgeVersion && r.agent));
});
