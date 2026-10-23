// CORE V8 — optional local background worker for the agent civilisation. Runs the SAME runtime as the browser
// (src/civilization/runtime.mjs) headless, with the shared reasoning pool (local Ollama on 127.0.0.1, opt-in flag),
// and writes a durable checkpoint the browser can resume from (.core-local/civ/state.json, never committed).
//   node scripts/civ-worker.mjs [--minutes 30] [--speed 1] [--reasoning] [--model qwen3:8b]
// Budgets: wall-clock limit (--minutes, default 30, max 240), one model worker, the pool's hourly budget; it stops
// cleanly on SIGINT/SIGTERM or when a budget is exhausted. No network access other than the loopback model.
import fs from 'node:fs'; import path from 'node:path';
import { FILES } from '../src/civilization/analyses.mjs';
import { buildMissions } from '../src/civilization/missions.mjs';
import { createRuntime } from '../src/civilization/runtime.mjs';
import { createPool, ollamaJSON } from '../src/intelligence/pool.mjs';
import { ollamaAvailable } from '../src/intelligence/orchestrator.mjs';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const MIN = Math.min(240, Number(arg('--minutes', 30))), SPEED = Math.min(16, Number(arg('--speed', 1))), REASON = process.argv.includes('--reasoning');
const DIR = '.core-local/civ', OUT = path.join(DIR, 'state.json'), LOG = path.join(DIR, 'worker.json');
fs.mkdirSync(DIR, { recursive: true });
const D = {}; for (const [k, p] of Object.entries(FILES)) D[k] = JSON.parse(fs.readFileSync(p, 'utf8'));
const reg = JSON.parse(fs.readFileSync('data/agents/sf-civilization.json', 'utf8'));
const R = createRuntime({ registry: reg, missions: buildMissions(D, reg, { today: new Date().toISOString() }), keepEvents: 1200 });
if (fs.existsSync(OUT)) console.log('reprise du point de contrôle :', R.restore(fs.readFileSync(OUT, 'utf8')) ? `t = ${R.S.clock.toFixed(0)} s` : 'incompatible, départ à zéro');
let pool = null;
if (REASON) { const a = await ollamaAvailable(); if (a.ok && a.models.length) { const model = arg('--model', a.models[0]); pool = createPool({ generate: ollamaJSON({ model }), workers: 1 }); R.setReasoning(true); console.log('raisonnement local :', model); } else console.log('raisonnement demandé mais aucun modèle local détecté : moteur déterministe seul'); }
const save = () => { fs.writeFileSync(OUT + '.tmp', R.serialize()); fs.renameSync(OUT + '.tmp', OUT); fs.writeFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), clock: R.S.clock, summary: R.summary(), ledger: pool?.ledger.slice(-20) || [], speed: SPEED, reasoning: !!pool }, null, 1)); };
let stop = false; const end = Date.now() + MIN * 60e3;
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { stop = true; });
console.log(`travailleur CORE : ${MIN} min max, vitesse ×${SPEED}. Ctrl+C pour arrêter proprement.`);
let lastSave = Date.now();
while (!stop && Date.now() < end) {
  R.step(0.25 * SPEED);
  if (pool) for (const j of R.pendingJobs()) { if (pool.running + pool.queued >= pool.workers) break; const m = R.M.get(j.mission); R.markJobRunning(j.id);
    pool.submit({ id: j.id, kind: j.kind, agent: j.agent, mission: m, findings: m.findings, hypothesis: j.target }).then(res => R.completeJob(j.id, res), err => R.completeJob(j.id, { ok: false, issues: [err.message] })); }
  if (Date.now() - lastSave > 10e3) { save(); lastSave = Date.now(); }
  await new Promise(r => setTimeout(r, 250));
}
pool?.stop(); save(); console.log('arrêt propre', JSON.stringify(R.summary().jobs), `t = ${R.S.clock.toFixed(0)} s`); process.exit(0);
