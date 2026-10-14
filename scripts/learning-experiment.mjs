// Phase 9 learning experiment — measured before/after on IDENTICAL tasks, fresh memory, recorded.
//   node scripts/learning-experiment.mjs [--no-model]   → data/civ/experiments/learning.json
// A. Procedural learning (deterministic, leads): Tenderloin safety-works with empty memory (before) → learn from the
//    Mission mission (failures → verified, independently reviewed, approved procedures) → same Tenderloin task (after).
// B. Model lessons (local qwen3:8b, temperature 0, fixed seed): test tasks run without lessons (before); a training task
//    produces validator rejections → approved lessons; the same test tasks run with those lessons (after).
//    Only the approved lessons differ between before and after. Nothing here touches the published memory.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { loadEnv } from './lib/core-env.mjs';
import { createInterpreter } from './lib/civ-llm.mjs';
const require = createRequire(import.meta.url);
const CT = require('../src/civ-tools.js'), E = require('../src/civ-engine.js'), MEM = require('../src/civ-memory.js');
const { env, registry } = loadEnv(), manifest = JSON.parse(fs.readFileSync('data/sf9/manifest.json', 'utf8')), data = {};
for (const d of manifest.datasets) data[d.file.replace('.json', '')] = JSON.parse(fs.readFileSync(`data/sf9/${d.file}`, 'utf8'));
const cx = CT.context({ manifest, data }), out = { version: 'core-learning-experiment-v1', at: new Date().toISOString(), snapshot: manifest.generated_at, procedural: null, model: null };
const pick = m => ({ subtasks: m.metrics.subtasks, toolCalls: m.metrics.toolCalls, failed: m.metrics.failed, skipped: m.subtasks.filter(s => s.state === 'skipped').length, messages: m.metrics.messages, acceptedFindings: m.findings.length, decision: m.decision && m.decision.state, proceduresApplied: m.learning.proceduresApplied });

// A. Procedural learning.
{ const mem = MEM.open(':memory:'), eng = E.createEngine({ registry, cx, env, memory: mem });
  const before = await eng.run('safety-works', 'Tenderloin', { resume: false });
  const fresh = MEM.open(':memory:'), eng2 = E.createEngine({ registry, cx, env, memory: fresh });
  const train = await eng2.run('safety-works', 'Mission', { resume: false });
  const after = await eng2.run('safety-works', 'Tenderloin', { resume: false });
  out.procedural = { agent: 'core.san-francisco.mobility.lead', task: 'safety-works / Tenderloin (identique avant et après)', training: { task: 'safety-works / Mission', proceduresLearned: fresh.entries({ kind: 'procedure' }).map(e => ({ id: e.id, statement: e.statement, status: e.status, history: e.history })) },
    before: pick(before), after: pick(after), sameFindings: JSON.stringify(before.findings.map(f => f.claim)) === JSON.stringify(after.findings.map(f => f.claim)) };
  console.log('procedural before', JSON.stringify(out.procedural.before), '\nafter', JSON.stringify(out.procedural.after), 'same findings:', out.procedural.sameFindings); }

// B. Model lessons.
if (!process.argv.includes('--no-model')) {
  const llm = await createInterpreter();
  if (!llm.available) out.model = { skipped: 'Ollama indisponible' };
  else {
    const TEST = [['safety-works', 'Mission'], ['flood-works', 'Mission'], ['safety-works', 'Tenderloin']], TRAIN = ['safety-works', 'South of Market'];
    const runOne = async (mem, w, nh, learn = true) => { const eng = E.createEngine({ registry, cx, env, memory: mem, llm, learn }); const m = await eng.run(w, nh, { resume: false }); return { task: `${w} / ${nh}`, lessonsUsed: m.model.lessonsUsed.length, accepted: m.model.accepted.map(a => a.statement), rejected: m.model.rejected.map(r => ({ statement: r.statement, reason: r.reason })), usage: m.model.usage }; };
    const before = []; for (const [w, nh] of TEST) before.push(await runOne(MEM.open(':memory:'), w, nh, false));
    const mem = MEM.open(':memory:'); const train = await runOne(mem, ...TRAIN);
    const lessons = mem.entries({ kind: 'lesson', status: 'approved' }).map(e => ({ id: e.id, statement: e.statement, history: e.history }));
    // Test phase: memory frozen (learn:false) so every test task sees exactly the same approved lessons.
    const after = []; for (const [w, nh] of TEST) after.push(await runOne(mem, w, nh, false));
    const rate = list => { const a = list.reduce((n, r) => n + r.accepted.length, 0), r = list.reduce((n, x) => n + x.rejected.length, 0); return { statements: a + r, rejected: r, rejectionRate: a + r ? +(r / (a + r)).toFixed(3) : null }; };
    out.model = { agentNote: 'interprètes assistés par modèle de chaque workflow (accessibility-analyst, environmental-analyst)', model: llm.model, settings: 'temperature 0, seed fixe (src/llm.js)', training: train, lessons, before, after, summary: { before: rate(before), after: rate(after) } };
    console.log('model before', JSON.stringify(out.model.summary.before), 'after', JSON.stringify(out.model.summary.after), 'lessons', lessons.length);
  }
}
fs.mkdirSync('data/civ/experiments', { recursive: true }); const label = (process.argv.find(a => a.startsWith('--label=')) || '--label=v2-quoted-shared-lessons').slice(8); out.label = label;
fs.writeFileSync(`data/civ/experiments/learning-${label}.json`, JSON.stringify(out, null, 1) + '\n');
console.log('written', `data/civ/experiments/learning-${label}.json`);
