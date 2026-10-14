// Run and record a model-assisted (cognitive) mission with the local model (Phase 4).
//   node scripts/cognitive.mjs                      newest verified corridor event (default)
//   node scripts/cognitive.mjs --item <feedItemId>  a specific City Intelligence item
//   node scripts/cognitive.mjs --suggestion <key>   a recorded mission suggestion (e.g. corridor:7056000)
// Requires a local Ollama server with qwen3:8b (node scripts/llm-check.mjs). Never falls back to canned output.
// Writes data/missions/cognitive/<id>.json and data/missions/cognitive/index.json, with measured resource usage.
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../src/coord.js'), ORG = require('../src/org.js'), KN = require('../src/knowledge.js'), F = require('../src/feeds.js'), LLM = require('../src/llm.js'), COG = require('../src/cognitive.js');

const manifest = JSON.parse(fs.readFileSync('data/sf/manifest.json', 'utf8')), data = {}, verified = {};
for (const d of manifest.datasets) { const t = fs.readFileSync(`data/sf/${d.file}`, 'utf8'), k = d.file.replace('.geojson', ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'mismatch'; }
const feedState = JSON.parse(fs.readFileSync('data/feeds/state.json', 'utf8'));
const env = { ctx: C.buildContext({ manifest, data, verified }), feeds: JSON.parse(fs.readFileSync('data/feeds/items.json', 'utf8')), feedState, feedHealth: feedState.health,
  knowledge: KN.load(JSON.parse(fs.readFileSync('data/knowledge/library.json', 'utf8'))), now: new Date().toISOString() };
const registry = ORG.buildRegistry(), args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

const probe = await LLM.probe(LLM.PROVIDERS.ollama);
if (!probe.available) { console.error(`Modèle local indisponible : ${probe.reason}. Voir node scripts/llm-check.mjs. Aucune réponse simulée n’est produite.`); process.exit(2); }

let origin;
if (opt('--item')) origin = { type: 'item', item: opt('--item') };
else if (opt('--suggestion')) origin = { type: 'suggestion', suggestion: feedState.suggestions.find(s => s.key === opt('--suggestion')) };
else {
  const corridorSources = ['datasf-street-use', 'datasf-building', 'datasf-tree-removals', 'datasf-closures'];
  const latest = env.feeds.items.filter(i => corridorSources.includes(i.source) && F.TRUSTED.includes(i.verification.status) && F.linkToCorridor(i, env.ctx))
    .sort((a, b) => String(b.published).localeCompare(String(a.published)) || a.id.localeCompare(b.id))[0];
  origin = { type: 'item', item: latest.id };
}
if (origin.type === 'suggestion' && !origin.suggestion) { console.error('suggestion inconnue'); process.exit(1); }

// Resource sampling: the Ollama server and runner processes (CPU %, resident memory) once per second.
const pids = () => { try { return execFileSync('pgrep', ['-f', '(ollama serve|ollama runner|ollama\/llama-server)'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean); } catch (_) { return []; } };
const samples = [];
const sampler = setInterval(() => { const p = pids(); if (!p.length) return; try { const rows = execFileSync('ps', ['-o', 'pid=,%cpu=,rss=', '-p', p.join(',')], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } }).trim().split('\n').map(l => l.trim().split(/\s+/).map(Number)); samples.push({ t: Date.now(), cpu: rows.reduce((n, r) => n + r[1], 0), rssMB: Math.round(rows.reduce((n, r) => n + r[2], 0) / 1024) }); } catch (_) { /* process ended */ } }, 1000);
const cpu0 = process.cpuUsage(), t0 = Date.now();

const mc = COG.newCognitive(origin, env);
console.log(`${mc.id} — ${mc.target.question}`);
await COG.run(mc, env, { registry, onEvent: e => { if (['stage', 'tool-call', 'report', 'route', 'mission'].includes(e.kind)) console.log(`  [${e.kind}] ${e.agent ? e.agent.split('.').pop() + ' · ' : ''}${e.text}`); } });
clearInterval(sampler);
const cpu = process.cpuUsage(cpu0), wall = Date.now() - t0;
const resources = { machine: { cpu: os.cpus()[0].model, cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30) }, model: mc.model,
  ollama: samples.length ? { samples: samples.length, peakRssMB: Math.max(...samples.map(s => s.rssMB)), meanCpuPct: Math.round(samples.reduce((n, s) => n + s.cpu, 0) / samples.length), peakCpuPct: Math.round(Math.max(...samples.map(s => s.cpu))) } : null,
  node: { cpuUserMs: Math.round(cpu.user / 1000), cpuSystemMs: Math.round(cpu.system / 1000), rssMB: Math.round(process.memoryUsage().rss / 2 ** 20) }, wallMs: wall };
const { opts, cancelled, ...record } = mc;
record.recorded = { by: 'scripts/cognitive.mjs (Node, live local model)', at: env.now, snapshot: manifest.generated_at, feedUpdate: feedState.lastSuccessfulUpdate, knowledge: env.knowledge.lib.version, resources };
fs.mkdirSync('data/missions/cognitive', { recursive: true });
const file = `data/missions/cognitive/${mc.id.replace(':', '-')}.json`;
fs.writeFileSync(file, JSON.stringify(record, null, 1) + '\n');
const idxFile = 'data/missions/cognitive/index.json', idx = fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, 'utf8')) : { version: 'core-cognitive-index-v1', missions: [] };
idx.missions = idx.missions.filter(m => m.id !== mc.id);
idx.missions.unshift({ id: mc.id, question: mc.target.question, item: mc.target.item, segment: mc.target.segment, state: mc.state, decision: mc.decision && mc.decision.state, agents: mc.agents, model: `${mc.model.provider}:${mc.model.name}`, recorded_at: env.now,
  metrics: { wallMs: mc.metrics.wallMs, modelCalls: mc.metrics.modelCalls, toolCalls: mc.metrics.toolCalls, promptTokens: mc.metrics.promptTokens, outputTokens: mc.metrics.outputTokens, accepted: mc.board.length, rejected: mc.rejected.length, disagreements: mc.disagreements.length, requests: mc.requests.length } });
fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1) + '\n');
console.log(`\n${mc.state} — ${mc.decision ? mc.decision.state : ''}\nmodèle ${mc.metrics.modelCalls} appels, ${mc.metrics.promptTokens}+${mc.metrics.outputTokens} jetons, ${mc.metrics.tokensPerSecond} jetons/s ; outils ${mc.metrics.toolCalls} (refusés ${mc.metrics.deniedToolCalls}, cache ${mc.metrics.cachedToolCalls}) ; énoncés acceptés ${mc.board.length}, rejetés ${mc.rejected.length}\nressources ${JSON.stringify(resources.ollama)} ; durée ${Math.round(wall / 1000)} s → ${file}`);
