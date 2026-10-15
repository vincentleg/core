// Bounded native-memory experiment; no model, plugin installation or token-savings extrapolation.
import fs from 'node:fs';
import { createResearchRunner } from './lib/research-runner.mjs';
const runner = createResearchRunner();
try {
  const question = { version: 1, id: 'experiment-energy', domain: 'historical-energy', action: 'research', parameters: { factor: 1 } };
  const start = performance.now(), first = await runner.execute(question), firstMs = performance.now() - start, events = runner.memory.verify().events;
  const next = performance.now(), second = await runner.execute(question), secondMs = performance.now() - next;
  const result = { mode: 'two local executions; no LLM; timings are one sample, not benchmark guarantees', firstMs, secondMs, firstWrites: first.writes, secondWrites: second.writes, firstEvents: events, secondEvents: runner.memory.verify().events, sameFingerprint: first.bundle.fingerprint === second.bundle.fingerprint, catalogChars: runner.inputs.catalogRaw.length, retrievedExcerptChars: (first.retrieved || []).reduce((s, d) => s + d.excerpt.length, 0), retrievedDocuments: first.retrieved.length, tokenSavings: 'NOT_MEASURED', rssMiB: Math.round(process.memoryUsage().rss / 1048576) };
  if (process.argv.includes('--record')) fs.writeFileSync('data/research/tooling-experiment.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally { runner.close(); }
