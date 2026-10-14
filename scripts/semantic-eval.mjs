// Phase 5 adversarial semantic evaluation: runs the deterministic validator (citations, numbers, decision language
// and src/semantic.js) on test/fixtures/semantic-cases.json and reports per-class results.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const COG = require('../src/cognitive.js');
const set = process.argv.includes('--holdout') ? 'semantic-holdout' : 'semantic-cases', fx = JSON.parse(fs.readFileSync(`test/fixtures/${set}.json`, 'utf8'));
const mc = { evidence: Object.entries(fx.evidence).map(([id, e]) => ({ id, ...e })), target: { ...fx.target, segment: '7051000' } };
const rows = fx.cases.map(c => { const why = COG.checkStatement(mc, c.statement, c.cites, c.kind || 'interpretation'); const verdict = why ? 'reject' : 'accept'; return { ...c, verdict, why, pass: verdict === c.expect && (!c.class || (why && why.startsWith(`[${c.class}]`)) || c.expect === 'accept') }; });
const byClass = {}; for (const r of rows) { const k = r.expect === 'accept' ? 'valid statements' : r.class; const b = byClass[k] = byClass[k] || { cases: 0, correct: 0 }; b.cases++; if (r.pass) b.correct++; }
const out = { date: new Date().toISOString().slice(0, 10), cases: rows.length, correct: rows.filter(r => r.pass).length, byClass, failures: rows.filter(r => !r.pass).map(r => ({ id: r.id, expect: r.expect, got: r.verdict, why: r.why })) };
console.log(JSON.stringify(out, null, 1));
if (process.argv.includes('--write')) fs.writeFileSync('docs/PHASE_5_SEMANTIC_RESULTS.json', JSON.stringify(out, null, 1) + '\n');
process.exit(out.failures.length ? 1 : 0);
