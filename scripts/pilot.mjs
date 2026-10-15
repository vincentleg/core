import fs from 'node:fs';
import { validateCounts } from './lib/pilot.mjs';
const args = process.argv.slice(2), file = args[args.indexOf('--check') + 1];
let pkg;
try {
  if (!args.includes('--check') || !file || fs.statSync(file).size > 8 * 1024 * 1024) throw Error();
  pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch {
  console.error('BLOCKED: readable JSON package required (8 MiB max); payload withheld. Usage: --check <file> [--synthetic-fixture]'); process.exit(1);
}
const result = validateCounts(pkg, { allowSynthetic: args.includes('--synthetic-fixture') });
console.log(JSON.stringify(result, null, 2)); process.exitCode = result.state === 'VALIDATED_INPUT' ? 0 : 1;
