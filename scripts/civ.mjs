// CORE civilisation runtime — CLI (local only).
//   node scripts/civ.mjs run [--model] [--concurrency N] [--record]   discover problems, run missions autonomously to human review
//   node scripts/civ.mjs status                                         missions, states, memory chain
//   node scripts/civ.mjs decide <missionId> --reviewer human:<name> --decision approve|reject|needs-evidence [--note "…"] [--record]
//   node scripts/civ.mjs record                                         publish recordings (still needs a human commit)
//   node scripts/civ.mjs stop | resume --reviewer human:<name>          emergency stop shared with the supervisor
import fs from 'node:fs';
import { createRuntime, STOP } from './lib/civ-runtime.mjs';
import { createInterpreter } from './lib/civ-llm.mjs';
const args = process.argv.slice(2), cmd = args[0] || 'status', opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
if (cmd === 'stop') { fs.mkdirSync('.core-local', { recursive: true }); fs.writeFileSync(STOP, JSON.stringify({ at: new Date().toISOString(), reason: opt('--reason') || 'arrêt manuel' })); console.log('STOP written: running missions stop at their next stage.'); process.exit(0); }
if (cmd === 'resume') { if (!/^human:[A-Za-z0-9._-]{2,40}$/.test(opt('--reviewer') || '')) { console.error('human reviewer required'); process.exit(1); } fs.rmSync(STOP, { force: true }); console.log('stop lifted by', opt('--reviewer')); process.exit(0); }
const llm = args.includes('--model') ? await createInterpreter() : null;
if (llm && !llm.available) console.log('Ollama unavailable: model-assisted interpretation skipped.');
const rt = await createRuntime({ llm: llm && llm.available ? llm : null, onEvent: ev => { if (ev.kind === 'stage') console.log(`${ev.at} ${ev.mission} → ${ev.data.stage}`); } });
if (cmd === 'run') {
  const r = await rt.runAll({ concurrency: Math.min(4, +(opt('--concurrency') || 2)) });
  if (r.refused) { console.error(r.refused); process.exit(1); }
  for (const m of r.missions) console.log(`${m.id}: ${m.state} · ${m.decision ? m.decision.state : '—'} · ${m.metrics.subtasks} sous-tâches, ${m.metrics.messages} messages, ${m.metrics.modelCalls} appel(s) modèle`);
  console.log(JSON.stringify(r.metrics));
  if (args.includes('--record')) { fs.mkdirSync('data/civ', { recursive: true }); fs.writeFileSync('data/civ/run-metrics.json', JSON.stringify({ ...r.metrics, at: new Date().toISOString(), missions: r.missions.length }, null, 1) + '\n'); console.log(rt.record()); }
} else if (cmd === 'decide') { const m = rt.decide(args[1], opt('--reviewer'), opt('--decision'), opt('--note') || ''); console.log(m.id, m.state); if (args.includes('--record')) console.log(rt.record()); }
else if (cmd === 'record') console.log(rt.record());
else { for (const m of rt.missions()) console.log(m.id, m.state, m.decision ? m.decision.state : ''); console.log('memory chain', JSON.stringify(rt.memory.verify())); }
rt.memory.close();
