// Local deterministic scientific mission; reuses the existing runtime, STOP and SQLite checkpoints.
// node scripts/science.mjs [--record] [--verify]
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createRuntime, STOP } from './lib/civ-runtime.mjs';
const require = createRequire(import.meta.url), SCI = require('../src/science.js');
const path = 'data/science/sf-traffic.json', args = process.argv.slice(2);
if (fs.existsSync(STOP)) { console.error('BLOCKED: arrêt d’urgence actif'); process.exit(1); }
const rt = await createRuntime({ memoryFile: '.core-local/science.sqlite', snapshotMode: args.includes('--current-data') ? 'current' : 'replay' });
console.log(args.includes('--current-data') ? 'Current-data freshness gate enabled.' : 'Historical snapshot execution: not a current-data validity claim.');
try {
  const mission = await rt.runFocused('city', { city: 'san-francisco', workflow: 'decision-safety-works', nhood: 'Tenderloin' });
  if (mission.refused) throw Error(mission.refused);
  const manifest = rt.manifests['san-francisco'], raw = {};
  for (const key of ['neighborhoods', 'hin', 'crashes-agg', 'permits']) raw[key] = fs.readFileSync('data/sf9/' + key + '.json', 'utf8');
  const bundle = { manifest, raw, registry: rt.registry, mission };
  if (args.includes('--verify')) {
    const saved = JSON.parse(fs.readFileSync(path, 'utf8'));
    // Mission timestamps differ across fresh local runs; verify the recorded source mission independently.
    const gate = await SCI.verify({ ...bundle, mission: saved.sourceMission }, saved.dossier);
    if (gate.state !== 'HUMAN_REVIEW') throw Error(gate.issues.join('; '));
    console.log('PASS: recorded scientific dossier reproduced, no authorization');
  } else {
    const dossier = await SCI.run(bundle), gate = await SCI.verify(bundle, dossier);
    if (gate.state !== 'HUMAN_REVIEW') throw Error(gate.issues.join('; '));
    rt.memory.checkpoint('science:sf-traffic', gate.state, dossier);
    if (args.includes('--record')) { fs.mkdirSync('data/science', { recursive: true }); fs.writeFileSync(path, JSON.stringify({ version: SCI.VERSION, recordedAt: new Date().toISOString(), mode: 'recorded-deterministic-agents', modelCalls: 0, sourceMission: mission, dossier }, null, 1) + '\n'); }
    console.log(JSON.stringify({ state: gate.state, modelCalls: 0, debates: dossier.discussion.length, sensitivity: dossier.sensitivity.length, baseline: dossier.result.baseline, fingerprint: dossier.fingerprint, recorded: args.includes('--record') }));
  }
} finally { rt.memory.close(); }
