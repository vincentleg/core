// CORE V8 — world energy use for the progress dashboard (Kardashev metric), from the U.S. EIA International Energy Data.
//   node scripts/progress-energy.mjs --fetch                 download https://api.eia.gov/bulk/INTL.zip (no key) into the
//                                                            work directory (CORE_PROGRESS_WORK, default .core-local/progress)
//   node scripts/progress-energy.mjs --input <INTL.zip>      rebuild from a saved bulk file
// Terms (checked 2026-10-16, https://www.eia.gov/about/copyrights_reuse.php): U.S. government publications are in the
// public domain; data may be used and distributed with an acknowledgment including the publication date. Every series
// kept here carries copyright "None" and source "EIA" in the bulk file (checked by this script; any other value aborts).
// Output data/progress/energy.json: only the World series (total and by source), quadrillion Btu per year.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2), WORK = process.env.CORE_PROGRESS_WORK || '.core-local/progress', URL_ = 'https://api.eia.gov/bulk/INTL.zip';
let zip = args.includes('--input') ? args[args.indexOf('--input') + 1] : path.join(WORK, 'INTL.zip');
if (args.includes('--fetch')) { fs.mkdirSync(WORK, { recursive: true }); execFileSync('curl', ['-sS', '-L', '--fail', '--max-time', '600', '-A', 'CORE-prototype (https://github.com/vincentleg/core)', '-o', zip, URL_], { stdio: 'inherit' }); }
if (!fs.existsSync(zip)) { console.error(`missing ${zip}: run with --fetch or --input`); process.exit(1); }
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
const txt = execFileSync('unzip', ['-p', zip, 'INTL.txt'], { maxBuffer: 512 * 1024 * 1024 }).toString('utf8');
const WANT = { 'INTL.44-2-WORL-QBTU.A': 'total', 'INTL.4411-2-WORL-QBTU.A': 'coal', 'INTL.4413-2-WORL-QBTU.A': 'naturalGas', 'INTL.4415-2-WORL-QBTU.A': 'petroleum', 'INTL.4417-2-WORL-QBTU.A': 'nuclear', 'INTL.4418-2-WORL-QBTU.A': 'renewablesAndOther' };
const series = {};
for (const line of txt.split('\n')) {
  if (!line.includes('"series_id"')) continue; const o = JSON.parse(line); const k = WANT[o.series_id]; if (!k) continue;
  if (o.copyright !== 'None' || !/^EIA\b/.test(o.source || '')) throw Error(`${o.series_id}: copyright "${o.copyright}", source "${o.source}" — not the public-domain EIA terms; stopping (FD09)`);
  if (o.units !== 'quadrillion Btu') throw Error(`${o.series_id}: unexpected units ${o.units}`);
  series[k] = { id: o.series_id, name: o.name, lastUpdated: o.last_updated, values: Object.fromEntries(o.data.filter(([, v]) => typeof v === 'number').map(([y, v]) => [y, +v.toFixed(3)]).sort()) };
}
for (const k of Object.values(WANT)) if (!series[k]) throw Error(`series ${k} missing from the bulk file`);
const out = {
  version: 'core-progress-energy-v1', generated: new Date().toISOString().slice(0, 10),
  source: { name: 'U.S. Energy Information Administration (EIA), International Energy Data (bulk INTL)', url: URL_, publisher: 'U.S. Energy Information Administration', published: series.total.lastUpdated.slice(0, 10), sha256 },
  terms: { status: 'public domain (U.S. government work)', url: 'https://www.eia.gov/about/copyrights_reuse.php', checked: '2026-10-16', acknowledgment: `Source: U.S. Energy Information Administration (${series.total.lastUpdated.slice(0, 7)})`, seriesCopyright: 'None (every series used)' },
  units: 'quadrillion Btu per year', conversion: { joulesPerQuadBtu: 1.055056e18, secondsPerYear: 31557600 },
  caveats: ['EIA estimates; the most recent years are revised as statistics arrive.', 'Primary-energy accounting for nuclear and non-combustible renewables depends on the method (EIA documents its own convention); other publishers report different totals.', 'Traditional, non-commercial biomass may be partly missing.'],
  series,
};
fs.mkdirSync('data/progress', { recursive: true }); fs.writeFileSync('data/progress/energy.json', JSON.stringify(out) + '\n');
console.log(`data/progress/energy.json: ${Object.keys(series.total.values).length} years, last ${Object.keys(series.total.values).at(-1)} = ${Object.values(series.total.values).at(-1)} quad Btu`);
