// CORE V9 — run a real multi-agent investigation with the local model (Ollama, loopback only) and print the trace.
//   node scripts/investigate.mjs --mission mission.sf.mobility --question "Why are buses slow on Folsom?" [--model qwen3:8b] [--out file.json]
// Without a running local model the model steps are reported as unavailable (deterministic steps still run).
import fs from 'node:fs';
import { FILES } from '../src/civilization/analyses.mjs';
import { buildMissions } from '../src/civilization/missions.mjs';
import { investigate } from '../src/intelligence/investigate.mjs';
import { ollamaJSON } from '../src/intelligence/pool.mjs';
const a = process.argv.slice(2), arg = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const D = {}; for (const [k, p] of Object.entries(FILES)) D[k] = JSON.parse(fs.readFileSync(p, 'utf8'));
const reg = JSON.parse(fs.readFileSync('data/agents/sf-civilization.json', 'utf8')), missions = buildMissions(D, reg);
const mission = missions.find(m => m.id === arg('--mission', 'mission.sf.mobility')); if (!mission) { console.error('unknown mission'); process.exit(1); }
const model = arg('--model', 'qwen3:8b'), endpoint = 'http://127.0.0.1:11434';
let generate = null; try { const r = await fetch(`${endpoint}/api/tags`); if (r.ok && (await r.json()).models?.some(m => m.name === model)) generate = ollamaJSON({ model, endpoint }); } catch {}
const pick = role => reg.agents.find(x => x.team === `team.${mission.coordinator.split('.')[2]}` && x.teamRole === role)?.id;
const agents = { coordinator: mission.coordinator, evidence: pick('source-verifier') || pick('researcher'), analyst: pick('scientific-analyst'), simulation: reg.agents.find(x => x.team === 'team.simulation' && x.teamRole === 'simulation-engineer')?.id, critic: reg.agents.find(x => x.team === 'team.safety' && x.teamRole === 'skeptical-reviewer')?.id, synthesis: pick('report-author') };
const res = await investigate({ mission, question: arg('--question', 'What could reduce bus delays on Folsom Street, and how sure can we be?'), mobility: D.mobility, generate, agents, onStep: s => console.error(`[${s.role}] ${s.provenance} → ${s.status}${s.ms ? ` (${(s.ms / 1000).toFixed(1)} s)` : ''}${s.issues?.length ? ` — ${s.issues.join('; ').slice(0, 160)}` : ''}`) });
if (a.includes('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ runtime: res.runtime, model: res.model, seconds: Math.round(res.ms / 1000), answer: res.answer, steps: res.steps.map(s => [s.role, s.provenance, s.status]) }, null, 1));
