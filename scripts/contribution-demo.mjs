import fs from 'node:fs';
import { runContributionDemo } from './lib/contribution-demo.mjs';
const args = process.argv.slice(2);
if (args.some(a => a !== '--persist')) throw Error('Usage: node scripts/contribution-demo.mjs [--persist]');
const memoryFile = args.includes('--persist') ? '.core-local/contributions-demo.sqlite' : ':memory:';
if (memoryFile !== ':memory:' && fs.existsSync(memoryFile)) throw Error('Existing demo database preserved; choose the in-memory demo instead.');
console.log(JSON.stringify(runContributionDemo({ memoryFile }), null, 2));
