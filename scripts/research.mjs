import fs from 'node:fs';
import { createRequire } from 'node:module';
import { researchDemo } from './lib/research-demo.mjs';
import { createResearchRunner } from './lib/research-runner.mjs';
const R = createRequire(import.meta.url)('../src/research.js'), args = process.argv.slice(2);
try {
if (args.includes('--question')) {
  const file = args[args.indexOf('--question') + 1]; if (!file || fs.statSync(file).size > 8192) throw Error('Bounded JSON question required');
  const runner = createResearchRunner({ memoryFile: '.core-local/research-phase13.sqlite' });
  try {
    const result = await runner.execute(JSON.parse(fs.readFileSync(file)));
    let interpretation;
    if (args.includes('--ollama')) { const { interpretResearch } = await import('./lib/research-ollama.mjs'); interpretation = await interpretResearch(result.bundle); }
    console.log(JSON.stringify({ ...result, interpretation }, null, 2));
  } finally { runner.close(); }
} else {
  const demo = await researchDemo({ memoryFile: '.core-local/research-phase13.sqlite' });
  if (args.includes('--record')) {
    fs.mkdirSync('data/research', { recursive: true }); fs.writeFileSync('data/research/phase13-demo.json', JSON.stringify(demo, null, 2) + '\n');
    fs.writeFileSync('data/research/phase13-report.md', R.report(demo.traffic) + '\n' + R.report(demo.energy));
  }
  console.log(JSON.stringify({ recorded: args.includes('--record'), traffic: demo.traffic.fingerprint, energy: demo.energy.fingerprint, historyVerified: demo.historyVerified, modelCalls: 0 }));
}
} catch { console.error('BLOCKED: invalid question, source, authority or memory; payload withheld.'); process.exitCode = 1; }
