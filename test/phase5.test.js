// Phase 5 tests. Deterministic components are tested directly. Model behaviour comes from the labelled MOCK in
// test/helpers/mock-ollama.js; live-model tests are in test/live/ and recorded live runs are checked as data.
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
const COG = require('../src/cognitive');
const SEM = require('../src/semantic');
const SIM = require('../src/sim-sidewalk');
const SPZ = require('../src/specializations');
const POLICY = require('../src/data-policy');
const DOS = require('../src/dossier');
const { mockOllama } = require('./helpers/mock-ollama');

const ROOT = path.join(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function makeEnv() {
  const manifest = read('data/sf/manifest.json'), data = {}, verified = {};
  for (const d of manifest.datasets) { const t = fs.readFileSync(path.join(ROOT, 'data/sf', d.file), 'utf8'), k = d.file.replace(/\.geojson$/, ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'mismatch'; }
  const feedState = read('data/feeds/state.json');
  return { ctx: C.buildContext({ manifest, data, verified }), feeds: read('data/feeds/items.json'), feedState, feedHealth: feedState.health, knowledge: KN.load(read('data/knowledge/library.json')), now: '2026-10-14T03:00:00Z' };
}
const env = makeEnv(), registry = ORG.buildRegistry();
const PLANNING = 'Où le corridor Folsom / Howard peut-il accueillir des arbres d’alignement supplémentaires sans réduire le cheminement piéton accessible, et lesquels faut-il reporter à cause des travaux planifiés ?';

test('semantic validation: tuned set and held-out set (deterministic validator)', () => {
  for (const file of ['semantic-cases', 'semantic-holdout']) {
    const fx = read(`test/fixtures/${file}.json`), mc = { evidence: Object.entries(fx.evidence).map(([id, e]) => ({ id, ...e })), target: { ...fx.target } };
    for (const c of fx.cases) {
      const why = COG.checkStatement(mc, c.statement, c.cites, c.kind || 'interpretation');
      assert.equal(why ? 'reject' : 'accept', c.expect, `${file}/${c.id}: ${why}`);
      if (c.expect === 'reject' && c.class) assert.ok(why.startsWith(`[${c.class}]`), `${file}/${c.id}: expected ${c.class}, got ${why}`);
    }
  }
});

test('semantic validation catches the real Phase 4 error (distance read as depth) without flagging identifiers', () => {
  const e1 = { id: 'E1', claim: 'L’élément « Excavation 26EXC-05114 — HOWARD ST (08TH ST / 09TH ST) » est rattaché au tronçon HOWARD ST 08TH ST → 09TH ST ; son point publié est à 17 m de l’axe du tronçon.', quantities: [{ value: 17, unit: 'm', quantity: 'distance', meaning: 'distance au point publié' }] };
  const e2 = { id: 'E2', claim: '8 chevauchement(s) entre organisations.', quantities: [{ value: 8, unit: 'count', quantity: 'count', meaning: 'paires' }] };
  const mc = { evidence: [e1, e2], target: { label: 'HOWARD ST 08TH ST → 09TH ST' }, places: ['Excavation 26EXC-05114 — HOWARD ST (08TH ST / 09TH ST)'] };
  assert.match(COG.checkStatement(mc, 'L’excavation 26EXC-05114 concerne le tronçon, avec une profondeur de 17 m de l’axe du tronçon (E1).', ['E1']), /^\[meaning\]/);
  assert.equal(COG.checkStatement(mc, 'L’excavation 26EXC-05114 est liée au tronçon HOWARD ST 08TH ST → 09TH ST, à 17 m de l’axe (E1).', ['E1', 'E2']), null);
  assert.match(COG.checkStatement(mc, 'L’excavation affecte le tronçon (E1).', ['E1']), /^\[causal\]/);
});

test('simulation sidewalk-tree-capacity-v1: deterministic, bounded, reproducible, sourced', () => {
  const a = SIM.run(env.ctx), b = SIM.run(env.ctx);
  assert.equal(a.fingerprint, b.fingerprint); assert.ok(SIM.verify(env.ctx, a).pass);
  assert.equal(a.totals.blocks, 44); assert.equal(a.totals.below_bsp_min, 18, 'observed 2014 widths below BSP minimum');
  assert.equal(a.totals.plantable_now + a.totals.deferred_for_works, a.totals.additional_positions);
  assert.throws(() => SIM.run(env.ctx, { clearPathMinFt: 60 }), /hors du domaine/); assert.throws(() => SIM.run(env.ctx, { roots: 1 }), /inconnu/);
  const wider = SIM.run(env.ctx, { clearPathMinFt: 8 }); assert.ok(wider.totals.not_accessible_with_basin > a.totals.not_accessible_with_basin && wider.totals.additional_positions < a.totals.additional_positions);
  const s = SIM.sensitivity(env.ctx).params.find(x => x.param === 'spacingFt'); assert.ok(s.additional[0] > s.additional[1], 'closer spacing → more positions');
  const alt = Object.fromEntries(SIM.alternatives(env.ctx).map(x => [x.id, x.totals]));
  assert.equal(alt.A0.additional_positions, 0); assert.ok(alt.A2.not_accessible_with_basin > alt.A1.not_accessible_with_basin); assert.ok(alt.A3.plantable_now < alt.A1.plantable_now);
  for (const r of a.rows) { assert.ok(T.resolve(env, { type: 'record', ref: r.sources.sidewalk })); for (const p of r.sources.permits) assert.ok(T.resolve(env, { type: 'record', ref: p })); }
  const tamper = { ...a, params: { ...a.params, spacingFt: 20 } }; assert.equal(SIM.verify(env.ctx, tamper).pass, false);
  assert.deepEqual(SIM.MODEL.notComputed.includes('carbone') && SIM.MODEL.calibrated, false, 'no benefits computed, not calibrated');
});

test('data policy: every source is registered; ineligible sources are never collected or accepted as evidence', () => {
  for (const d of read('data/sf/manifest.json').datasets) assert.ok(POLICY.eligible(`dataset:${d.file.replace('.geojson', '')}`), d.file);
  for (const s of F.SOURCES) assert.ok(POLICY.get(`feed:${s.id}`), s.id);
  for (const s of env.knowledge.lib.sources) assert.ok(POLICY.eligible(`knowledge:${s.id}`), s.id);
  for (const [k, e] of Object.entries(POLICY.ENTRIES)) for (const f of ['publisher', 'url', 'licence', 'access', 'sensitivity', 'redistribution', 'verified', 'allowedUse', 'status']) assert.ok(e[f] !== undefined, `${k}.${f}`);
  assert.equal(POLICY.get('feed:openmeteo-aq').status, 'quarantined');
  assert.ok(!F.dueSources({ items: [], sources: {} }, Date.now()).some(s => s.id === 'openmeteo-aq'));
  assert.equal(env.feeds.items.filter(i => i.source === 'openmeteo-aq').length, 0, 'quarantined items are not published');
  assert.equal(POLICY.checkEvidence([{ type: 'feed-source', ref: 'openmeteo-aq' }], env).pass, false);
  assert.ok(POLICY.checkEvidence([{ type: 'record', ref: 'sidewalks:8557' }, { type: 'feed-source', ref: 'usgs-quakes' }], env).pass);
  for (const k of Object.keys(POLICY.ENTRIES).filter(k => k.startsWith('excluded:'))) assert.equal(POLICY.get(k).status, 'excluded');
  assert.doesNotMatch(decodeURIComponent(F.request('datasf-311-soma').url), /address|status_notes|media_url|service_request_id/);
});

test('organization: specializations map to real runtimes; routing assembles a small relevant team', () => {
  const k = SPZ.counts(); assert.equal(k.domains, 17); assert.equal(k['model-assisted'], registry.agents.filter(a => a.executionMode === 'llm').length);
  for (const s of SPZ.SPECS.filter(s => s.runtime !== 'none')) assert.ok(registry.agents.some(a => a.id.endsWith(`.${s.profile}`)), `${s.id} → ${s.profile}`);
  for (const s of SPZ.SPECS.filter(s => s.runtime === 'none')) assert.ok(s.gap, s.id);
  const r = SPZ.route({ type: 'corridor-planning', question: PLANNING, domains: [] });
  assert.deepEqual(r.team.map(t => t.id), ['accessibility', 'urban-forestry']); assert.equal(r.scenario, 'scenario-analysis');
  assert.ok(!r.team.some(t => t.id === 'energy-infrastructure'), 'relevance floor excludes off-topic specialists');
  assert.deepEqual(r.reviewers, ['evidence-review', 'data-eligibility']);
  assert.equal(SPZ.route({ type: 'corridor-planning', question: PLANNING }, { modelAvailable: false }).team.length, 0);
});

test('fast mode (mock): bounded calls, no duplicate evidence, specialist and simulation requests, abstention, gateway on simulation', async () => {
  const mock = mockOllama({ behaviour: 'cooperative' }), mc = COG.newCognitive({ type: 'corridor-planning', text: PLANNING }, env);
  await COG.run(mc, env, { registry, fetchImpl: mock.fetchImpl });
  assert.equal(mc.mode, 'fast'); assert.ok(mc.modelCalls.length <= 12, `${mc.modelCalls.length} calls`);
  assert.ok(mc.modelCalls.every(c => !c.toolsOffered.length), 'tools are routed deterministically in fast mode');
  const claims = mc.evidence.map(e => e.claim); assert.equal(new Set(claims).size, claims.length, 'a repeated computation is not registered twice');
  assert.ok(mc.specialistRequests.some(q => q.status === 'added'), 'requested specialist added'); assert.ok(mc.agents.some(a => a.endsWith('urban-planning-analyst')));
  assert.ok(mc.simRequests.some(q => q.status === 'computed' && q.evidence.length), 'simulation request recomputed deterministically');
  assert.ok(mc.rejected.some(r => r.item === 'simulation-request' && /hors du domaine/.test(r.reason)));
  assert.ok(mc.abstentions.length >= 1);
  assert.ok(mc.toolCalls.some(t => t.tool === 'policy.check' && t.state === 'ok'));
  assert.ok(mc.decision.checks.some(c => c.id === 'simulation' && c.pass));
  assert.equal(COG.issueCognitiveDecision(mc, env, registry).state, mc.decision.state); assert.equal(mc.decision.authorizes, false);
});

test('model-response cache: identical requests are served from the cache and labelled', async () => {
  const store = new Map(), cache = { get: k => store.get(k), set: (k, v) => store.set(k, v) };
  const run = async () => { const mock = mockOllama({ behaviour: 'cooperative' }), mc = COG.newCognitive({ type: 'corridor-planning', text: PLANNING }, env); await COG.run(mc, env, { registry, fetchImpl: mock.fetchImpl, cache }); return { mc, mock }; };
  const first = await run(), second = await run();
  assert.ok(first.mc.modelCalls.every(c => !c.cached)); assert.ok(second.mc.modelCalls.every(c => c.cached));
  assert.equal(second.mock.calls.length, 0, 'no request reached the model'); assert.equal(second.mc.decision.state, first.mc.decision.state);
});

test('recorded live missions (real qwen3:8b runs): validated outputs, gateway consistency, dossiers', () => {
  const idx = read('data/missions/cognitive/index.json');
  const fast = idx.missions.filter(m => m.mode === 'fast'); assert.ok(fast.length >= 2);
  for (const m of fast) {
    const rec = read(`data/missions/cognitive/${m.id.replace(':', '-')}.json`);
    assert.equal(rec.model.name, 'qwen3:8b'); assert.ok(rec.metrics.modelCalls >= 6 && rec.metrics.modelCalls <= 14);
    assert.ok(rec.modelCalls.every(c => c.ok && !c.cached), 'recorded as real, uncached model calls');
    assert.ok(rec.board.every(b => b.validated)); assert.equal(rec.decision.authorizes, false);
    const d = DOS.build(rec, { simulation: rec.target.type === 'corridor-planning' ? SIM.run(env.ctx) : null });
    assert.ok(d.observations.length > 0 && d.missingEvidence.length > 0); assert.match(DOS.toMarkdown(d), /## Preuves manquantes/);
  }
  const phase4 = read('data/missions/cognitive/cognitive-13f3c2ad6fb1.json');
  assert.equal(DOS.build(phase4).validation.pass, false, 'Phase 4 record with the depth error is flagged by the dossier validator');
});

test('public site never probes a local model endpoint; scheduler and deployment keep least privilege', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/platform.js'), 'utf8');
  assert.match(src, /if \(P\.local\) G\.CORE_LLM\.probe/); assert.match(src, /location\.hostname/);
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/city-feed.yml'), 'utf8');
  assert.match(wf, /permissions:\s*\n\s*contents: write/); assert.doesNotMatch(wf, /secrets\.|OLLAMA|api[_-]?key/i);
  assert.match(wf, /uses: actions\/checkout@[0-9a-f]{40}/);
  assert.ok(fs.existsSync(path.join(ROOT, '.nojekyll')), 'static site served as-is');
});
