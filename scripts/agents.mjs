// Persist the agent registry, competency evaluations and recorded missions (Phase 3).
//   node scripts/agents.mjs              registry + evaluations + missions for current feed suggestions
//   node scripts/agents.mjs --question "…" --segment 7056000   also record a question-driven mission
// Outputs: data/agents/registry.json, data/agents/evaluations.json, data/missions/<id>.json, data/missions/index.json
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../src/coord.js'), ORG = require('../src/org.js'), M = require('../src/missions.js'), KN = require('../src/knowledge.js'), EV = require('../src/evals.js');

const manifest = JSON.parse(fs.readFileSync('data/sf/manifest.json', 'utf8')), data = {}, verified = {};
for (const d of manifest.datasets) { const t = fs.readFileSync(`data/sf/${d.file}`, 'utf8'), k = d.file.replace('.geojson', ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'mismatch'; }
const feedState = JSON.parse(fs.readFileSync('data/feeds/state.json', 'utf8'));
const env = { ctx: C.buildContext({ manifest, data, verified }), feeds: JSON.parse(fs.readFileSync('data/feeds/items.json', 'utf8')), feedState, feedHealth: feedState.health,
  knowledge: KN.load(JSON.parse(fs.readFileSync('data/knowledge/library.json', 'utf8'))), now: new Date().toISOString() };
const registry = ORG.buildRegistry();
fs.mkdirSync('data/agents', { recursive: true }); fs.mkdirSync('data/missions', { recursive: true });
fs.writeFileSync('data/agents/registry.json', JSON.stringify({ ...registry, generated_at: env.now, counts: ORG.counts(registry) }, null, 1) + '\n');
const evals = EV.evaluate(env, registry);
fs.writeFileSync('data/agents/evaluations.json', JSON.stringify({ version: 'core-agent-evals-v1', generated_at: env.now, results: evals }, null, 1) + '\n');
console.log(`registry: ${JSON.stringify(ORG.counts(registry))}; evaluations ${evals.filter(e => e.pass).length}/${evals.length} passed`);

const args = process.argv.slice(2), qi = args.indexOf('--question'), si = args.indexOf('--segment');
const origins = feedState.suggestions.map(s => ({ type: 'suggestion', suggestion: s }));
if (qi >= 0) origins.push({ type: 'question', text: args[qi + 1], segment: si >= 0 ? args[si + 1] : undefined });
const index = [];
for (const origin of origins) {
  const m = M.newMission(origin, env); const t = Date.now(); await M.run(m, env, { registry });
  const { opts, cancelled, ...record } = m;
  record.recorded = { by: 'scripts/agents.mjs (Node)', at: env.now, wallMs: Date.now() - t, snapshot: manifest.generated_at, feedUpdate: feedState.lastSuccessfulUpdate };
  fs.writeFileSync(`data/missions/${m.id.replace(':', '-')}.json`, JSON.stringify(record, null, 1) + '\n');
  index.push({ id: m.id, origin: origin.type === 'suggestion' ? origin.suggestion.key : `question: ${origin.text}`, state: m.state, decision: m.decision.state, fingerprint: m.fingerprint, agents: m.plan.specialists.length, agentIds: [m.plan.manager, ...m.plan.specialists.map(s => s.agent), m.plan.verifier, m.plan.reviewer, m.plan.gateway].filter(Boolean), ms: record.recorded.wallMs });
  console.log(`${m.id} ${index.at(-1).origin} → ${m.state} (${m.decision.state}) ${record.recorded.wallMs} ms`);
}
fs.writeFileSync('data/missions/index.json', JSON.stringify({ version: 'core-missions-index-v1', recorded_at: env.now, missions: index }, null, 1) + '\n');
