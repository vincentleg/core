// Multidomain snapshot for the Folsom/Howard city laboratory (Phase 2D).
// node scripts/city-snapshot.mjs [outDir=data/sf]
// Uses the dataset registry in src/domains.js. Bounded queries only (corridor CNNs, bounding box, recent
// periods), schema validation, deduplication, PII scrubbing, distance filter to the corridor frontage.
// Merges entries into data/sf/manifest.json (keeps the Phase 2B datasets). On any fetch failure the previous
// files stay untouched: nothing is replaced by synthetic data.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const D = require('../src/domains.js');
const C = require('../src/coord.js');
const outDir = process.argv[2] || 'data/sf';
const API = 'https://data.sf.gov/resource';
const UA = 'CORE-city-snapshot/1.0 (+https://github.com/vincentleg/core)';
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const quote = xs => xs.map(x => `'${String(x).replace(/'/g, "''")}'`).join(',');
const BBOX = { n: 37.7895, s: 37.7700, w: -122.4190, e: -122.3945 }; // envelope of the 2nd–11th Folsom/Howard corridor + margin

async function soql(id, query) {
  const url = `${API}/${id}.json?$query=${encodeURIComponent(query)}`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }), body = await res.text();
    if (res.ok) { const rows = JSON.parse(body); if (!Array.isArray(rows)) throw Error(`${id}: unexpected response`); return { url, rows, raw_sha256: sha256(body), retrieved_at: new Date().toISOString() }; }
    if (attempt >= 3) throw Error(`${id}: HTTP ${res.status} ${body.slice(0, 160)}`);
    await new Promise(r => setTimeout(r, 2000 * attempt));
  }
}
async function soqlChunks(id, build, values, size = 120) {
  const parts = []; for (let i = 0; i < values.length; i += size) parts.push(await soql(id, build(values.slice(i, i + size))));
  return { url: parts.map(p => p.url).join(' | '), rows: parts.flatMap(p => p.rows), raw_sha256: sha256(parts.map(p => p.raw_sha256).join('')), retrieved_at: parts.length ? parts[parts.length - 1].retrieved_at : new Date().toISOString() };
}

const manifestPath = path.join(outDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const corridor = JSON.parse(fs.readFileSync(path.join(outDir, 'corridor.geojson'), 'utf8')).features;
const segCnn = corridor.map(f => f.properties.cnn);
const padded = segCnn.flatMap(c => [c, c.padStart(8, '0')]);
const asOf = new Date().toISOString().slice(0, 10);
const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
const nearCorridor = (g, m) => corridor.some(f => C.distanceToGeometry(g.coordinates, f.geometry) <= m);

const plans = {
  'street-trees': () => soql('tkzw-k3nq', `SELECT treeid, species, legalstatus, siteinfo, planttype, dbhrange, plotsize, planteddate, cnn, onstreet, crossstreet, latitude, longitude WHERE cnn in (${quote(padded)}) LIMIT 20000`),
  'tree-removals': async ctx => soqlChunks('qrwx-q4gg', ids => `SELECT treeid, postedtype, posteddate, description, species, location, lat, long WHERE treeid in (${quote(ids)}) LIMIT 5000`, ctx.treeIds),
  'building-permits': () => soql('i98e-djp9', `SELECT permit_number, permit_type_definition, status, filed_date, issued_date, completed_date, status_date, block, lot, street_number, street_name, street_suffix, description, existing_use, proposed_use, estimated_cost, proposed_units, existing_units, location, primary_address_flag WHERE within_box(location, ${BBOX.n}, ${BBOX.w}, ${BBOX.s}, ${BBOX.e}) AND (status in ('filed','approved','issued','reinstated','plancheck','suspend') OR completed_date >= '${yearAgo}') AND filed_date >= '2016-01-01' ORDER BY filed_date DESC LIMIT 20000`),
  'energy-benchmarks': () => soql('96ck-qcfe', `SELECT parcel_number, building_name, building_address, property_type, floor_area, benchmark_year, benchmark_status, site_eui, source_eui, total_ghg_emissions, energy_star_score, year_built, energy_audit_status, energy_audit_due_date, point WHERE within_box(point, ${BBOX.n}, ${BBOX.w}, ${BBOX.s}, ${BBOX.e}) AND benchmark_year = (SELECT max(benchmark_year)) LIMIT 5000`).catch(() =>
    soql('96ck-qcfe', `SELECT parcel_number, building_name, building_address, property_type, floor_area, benchmark_year, benchmark_status, site_eui, source_eui, total_ghg_emissions, energy_star_score, year_built, energy_audit_status, energy_audit_due_date, point WHERE within_box(point, ${BBOX.n}, ${BBOX.w}, ${BBOX.s}, ${BBOX.e}) ORDER BY benchmark_year DESC LIMIT 5000`)),
  parks: () => soql('gtr9-ntp6', `SELECT property_id, objectid, property_name, propertytype, acres, address, latitude, longitude LIMIT 5000`),
  sidewalks: () => soql('4g86-grxu', `SELECT objectid, cnn, street, side, sidewalk_f, width_min, width_reco, class, shape WHERE cnn in (${quote(padded)}) LIMIT 5000`),
};
// Post-filters keep only what relates to the corridor (frontage distance in metres).
const post = {
  'building-permits': fs => fs.filter(f => nearCorridor(f.geometry, 40)),
  'energy-benchmarks': fs => { const latest = Math.max(...fs.map(f => f.properties.year || 0)); return fs.filter(f => f.properties.year === latest && nearCorridor(f.geometry, 60)); },
  parks: fs => fs.filter(f => nearCorridor(f.geometry, 200)),
};

const ctx = {};
let failures = 0;
for (const spec of D.DATASETS) {
  try {
    const fetched = await plans[spec.key](ctx);
    let rows = fetched.rows;
    if (spec.key === 'building-permits') { // one row per permit: prefer the primary address
      const byPermit = new Map(); for (const r of rows) { const k = r.permit_number; if (!byPermit.has(k) || r.primary_address_flag === 'Y') byPermit.set(k, r); } rows = [...byPermit.values()];
    }
    const res = D.normalizeRows(spec, rows);
    const features = post[spec.key] ? post[spec.key](res.features) : res.features;
    if (spec.key === 'street-trees') ctx.treeIds = features.map(f => f.properties.treeid);
    const geojson = JSON.stringify({ type: 'FeatureCollection', features }) + '\n', file = `${spec.key}.geojson`;
    const prev = manifest.datasets.find(d => d.file === file);
    fs.writeFileSync(path.join(outDir, file), geojson);
    const entry = { file, id: spec.id, title: spec.title, provider: spec.provider, domain: spec.domain, page: `https://data.sf.gov/d/${spec.id}`, request: fetched.url, retrieved_at: fetched.retrieved_at,
      raw_rows: fetched.rows.length, raw_sha256: fetched.raw_sha256, features: features.length, rejected: res.rejected, duplicates: res.duplicates, outside_corridor: res.features.length - features.length,
      sha256: sha256(geojson), license: D.LICENSE, kind: spec.kind, update_frequency: spec.updates, changed_since_previous: prev ? prev.sha256 !== sha256(geojson) : null,
      note: `Bounded corridor query; schema ${Object.keys(spec.schema).join(', ')}; dedupe ${spec.dedupe}.` };
    manifest.datasets = manifest.datasets.filter(d => d.file !== file).concat(entry);
    console.log(`${spec.key}: ${features.length} features (raw ${fetched.rows.length}, rejected ${Object.values(res.rejected).reduce((a, b) => a + b, 0)}, duplicates ${res.duplicates}, outside ${entry.outside_corridor})${prev ? (entry.changed_since_previous ? ' — changed' : ' — unchanged') : ' — new'}`);
  } catch (err) { failures++; console.error(`${spec.key}: FAILED (${err.message}) — previous snapshot kept`); }
}
manifest.city_snapshot_at = new Date().toISOString();
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest updated (${manifest.datasets.length} datasets)${failures ? `, ${failures} failure(s)` : ''}; as of ${asOf}`);
if (failures) process.exitCode = 1;
