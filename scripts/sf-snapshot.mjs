// Reproducible, dated snapshot of public San Francisco street-work records for the Folsom/Howard pilot.
// node scripts/sf-snapshot.mjs [outDir=data/sf]
// Node built-ins only. Fetches DataSF (data.sf.gov, ODC-PDDL), drops personal contact columns,
// keeps only corridor records, writes GeoJSON + manifest.json with URLs, timestamps and SHA-256 checksums.
// Raw API responses are hashed but not stored.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SF = require('../src/sf-data.js');
const outDir = process.argv[2] || 'data/sf';
const API = 'https://data.sf.gov/resource';
const LICENSE = { name: 'ODC Public Domain Dedication and License (PDDL)', url: 'https://opendatacommons.org/licenses/pddl/1-0/' };
const UA = 'CORE-sf-snapshot/1.0 (+https://github.com/vincentleg/core)';
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const quote = xs => xs.map(x => `'${String(x).replace(/'/g, "''")}'`).join(',');

async function soql(id, query) {
  const url = `${API}/${id}.json?$query=${encodeURIComponent(query)}`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    const body = await res.text();
    if (res.ok) {
      const rows = JSON.parse(body);
      if (!Array.isArray(rows)) throw Error(`${id}: unexpected response`);
      return { url, rows, raw_sha256: sha256(body), retrieved_at: new Date().toISOString() };
    }
    if (attempt >= 3) throw Error(`${id}: HTTP ${res.status} ${body.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 2000 * attempt));
  }
}

const datasets = [];
function write(name, meta, fetched, features, dropped, note) {
  if (SF.hasPII(features)) throw Error(`${name}: personal column survived normalization`);
  const geojson = JSON.stringify({ type: 'FeatureCollection', features }) + '\n';
  fs.writeFileSync(path.join(outDir, `${name}.geojson`), geojson);
  datasets.push({
    file: `${name}.geojson`, id: meta.id, title: meta.title, provider: meta.provider, page: `https://data.sf.gov/d/${meta.id}`,
    request: fetched.url, retrieved_at: fetched.retrieved_at, raw_rows: fetched.rows.length, raw_sha256: fetched.raw_sha256,
    features: features.length, dropped_without_geometry: dropped, sha256: sha256(geojson), license: LICENSE, kind: meta.kind, note,
  });
  console.log(`${name}: ${features.length} features (${dropped} dropped without geometry) from ${fetched.rows.length} rows`);
}

fs.mkdirSync(outDir, { recursive: true });
const { streets, from, to, since } = SF.CORRIDOR;

// 1. Corridor geometry: centerline segments between 2nd and 11th, by CNN chain.
const streetsMeta = { id: '3psu-pn9h', title: 'Streets – Active and Retired', provider: 'City and County of San Francisco (DPW Basemap)', kind: 'administrative geometry' };
const streetRows = await soql(streetsMeta.id, `SELECT cnn, streetname, f_st, t_st, f_node_cnn, t_node_cnn, active, oneway, classcode, line WHERE streetname in (${quote(streets)}) AND active = true LIMIT 2000`);
const segments = streets.flatMap(s => {
  const chain = SF.corridorSegments(streetRows.rows, s, from, to);
  if (!chain.length) throw Error(`Corridor chain not found for ${s} ${from}→${to}`);
  return chain.map(SF.segmentFeature);
});
write('corridor', streetsMeta, streetRows, segments, 0, `${streets.join(' and ')} centerline segments from ${from} to ${to}, selected by following CNN node topology.`);
const segCnn = new Set(segments.map(f => f.properties.cnn));
const nodeCnn = new Set(segments.flatMap(f => [f.properties.f_node_cnn, f.properties.t_node_cnn]));
const corridorCnn = [...new Set([...segCnn, ...nodeCnn])];
const segByCnn = new Map(segments.map(f => [f.properties.cnn, f]));

// 2. Intersections on the corridor (CNN nodes).
const ixMeta = { id: 'gmfx-8h6i', title: 'Street Intersections', provider: 'City and County of San Francisco', kind: 'administrative geometry' };
const ixRows = await soql(ixMeta.id, `SELECT cnn, st_name, st_type, the_geom WHERE cnn in (${quote([...nodeCnn])}) LIMIT 5000`);
const byNode = new Map();
for (const r of ixRows.rows) {
  if (!r.the_geom || r.the_geom.type !== 'Point') continue;
  const e = byNode.get(r.cnn) || { geometry: r.the_geom, names: new Set() };
  e.names.add(`${r.st_name} ${r.st_type || ''}`.trim()); byNode.set(r.cnn, e);
}
const intersections = [...byNode].map(([cnn, e]) => ({ type: 'Feature', geometry: e.geometry, properties: { kind: 'intersection', record_id: SF.cnnId(cnn), cnn: SF.cnnId(cnn), name: [...e.names].sort().join(' / ') } }));
write('intersections', ixMeta, ixRows, intersections, nodeCnn.size - intersections.length, 'One feature per CNN node; names joined from one row per street.');

// 3. Street-use permits for street works on corridor segments and intersections since the window start.
const puMeta = { id: 'b6tj-gt35', title: 'Street-Use Permits', provider: 'San Francisco Public Works', kind: 'administrative record (permit issued, not proof of work performed)' };
const puRows = await soql(puMeta.id, `SELECT permit_number, permit_type, status, streetname, cross_street_1, cross_street_2, cnn, agent, permit_purpose, approved_date, permit_start_date, permit_end_date, latitude, longitude WHERE permit_type in (${quote(SF.WORK_PERMIT_TYPES)}) AND cnn in (${quote(corridorCnn)}) AND approved_date >= '${since}' ORDER BY approved_date DESC LIMIT 20000`);
const permits = SF.collect(puRows.rows, SF.permitFeature);
write('permits', puMeta, puRows, permits.features, permits.dropped, `Permit types ${SF.WORK_PERMIT_TYPES.join(', ')}; approved on or after ${since}; agent organisation kept, personal contact columns removed.`);

// 4. Large utility excavation permits (Dig Once program).
const lgMeta = { id: 'i926-ujnc', title: 'Large Utility Excavation Permits', provider: 'San Francisco Public Works', kind: 'administrative record (permit issued, not proof of work performed)' };
const lgRows = await soql(lgMeta.id, `SELECT permit_number, permit_status, street_name, cross_street_1, cross_street_2, cnn, agent, permit_purpose, permit_reason, permit_start_date, permit_end_date, latitude, longitude WHERE cnn in (${quote(corridorCnn)}) LIMIT 5000`);
const large = SF.collect(lgRows.rows, SF.largePermitFeature);
write('large-excavations', lgMeta, lgRows, large.features, large.dropped, 'Permits ≥1,000 sq ft, active/approved plus those ended within the last year (dataset definition).');

// 5. Current paving moratoria.
const moMeta = { id: '5wbp-dwzt', title: 'Utility Excavation Moratorium Streets', provider: 'San Francisco Public Works', kind: 'administrative record (current moratoria only)' };
const moRows = await soql(moMeta.id, `SELECT id, cnn, streetname, limits, effectivedate, expirationdate, jobordernum, latitude, longitude WHERE cnn in (${quote(corridorCnn)}) LIMIT 5000`);
const mor = SF.collect(moRows.rows, SF.moratoriumFeature, segByCnn);
write('moratoria', moMeta, moRows, mor.features, mor.dropped, 'Segments paved within the last 5 years; geometry joined from corridor segments by CNN when available.');

// 6. SFMTA temporary street closures.
const clMeta = { id: '8x25-yybr', title: 'Temporary Street Closures', provider: 'SFMTA', kind: 'administrative record (SFMTA-permitted closures only)' };
const clRows = await soql(clMeta.id, `SELECT objectid, case_num, case_name, type, status, street, from_st, to_st, cnn, veh_imp, start_date, end_date, start_dt, end_dt, info, shape WHERE cnn in (${quote(corridorCnn)}) LIMIT 5000`);
const clo = SF.collect(clRows.rows, SF.closureFeature);
write('closures', clMeta, clRows, clo.features, clo.dropped, 'Excludes closures managed by other departments (dataset definition).');

const manifest = {
  generated_at: new Date().toISOString(), generator: 'scripts/sf-snapshot.mjs', corridor: SF.CORRIDOR,
  removed_columns: SF.PII_COLUMNS, caveat: 'Public administrative records. A permit is not proof that excavation occurred; counts include planned capital projects.',
  datasets,
};
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest written:', path.join(outDir, 'manifest.json'));
