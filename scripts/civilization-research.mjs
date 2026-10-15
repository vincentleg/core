import fs from 'node:fs';
import { createRequire } from 'node:module';
import { energyScenario, validateResearch, researchKnowledge } from './lib/civilization-research.mjs';
const catalog = JSON.parse(fs.readFileSync(new URL('../data/research/civilization.json', import.meta.url)));
const validation = validateResearch(catalog);
const queryIndex = process.argv.indexOf('--query'), query = queryIndex >= 0 ? process.argv[queryIndex + 1] : null;
const retrieval = query && validation.state === 'VALIDATED_PROVENANCE' ? createRequire(import.meta.url)('../src/knowledge.js').retrieve(researchKnowledge(catalog), query, { limit: 3 }) : undefined;
console.log(JSON.stringify({ validation, historical2024: energyScenario(592, 366), sensitivityAssumptions: [0.9, 1.1].map(f => energyScenario(592 * f, 366)), sensitivityIsConfidenceInterval: false, humanProgressScore: null, retrieval }, null, 2));
process.exitCode = validation.state === 'VALIDATED_PROVENANCE' ? 0 : 1;
