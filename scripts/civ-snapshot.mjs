// Study-area snapshot for Phase 9 cross-domain workflows (SoMa, Mission, Tenderloin).
//   node scripts/civ-snapshot.mjs [outDir=data/sf9]
// DataSF only (ODC-PDDL). Node built-ins. Writes GeoJSON/JSON + manifest.json (request URL, retrieval time, raw and
// file SHA-256). Privacy: injury crashes are fetched ONLY as counts aggregated by street segment, neighbourhood,
// severity and pedestrian involvement — never case ids, officer ids, party details, exact times or points.
// Street-use permits keep organisation holders only (src/sf-data.js), as in the corridor snapshot.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SF = require('../src/sf-data.js');
const outDir = process.argv[2] || 'data/sf9';
const API = 'https://data.sf.gov/resource', UA = 'CORE-civ-snapshot/1.0 (+https://github.com/vincentleg/core)';
const LICENSE = { name: 'ODC Public Domain Dedication and License (PDDL)', url: 'https://opendatacommons.org/licenses/pddl/1-0/' };
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
export const NEIGHBORHOODS = ['South of Market', 'Mission', 'Tenderloin'];
const CRASH_WINDOW = { from: '2021-09-01', to: '2026-08-31' }; // five full years ending at the dataset's latest month (checked 2026-10-14)
async function soql(id, query) {
  const url = `${API}/${id}.json?$query=${encodeURIComponent(query)}`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }); const body = await res.text();
    if (res.ok) { const rows = JSON.parse(body); if (!Array.isArray(rows)) throw Error(`${id}: unexpected response`); return { url, rows, raw_sha256: sha256(body), retrieved_at: new Date().toISOString() }; }
    if (attempt >= 3) throw Error(`${id}: HTTP ${res.status} ${body.slice(0, 200)}`); await new Promise(r => setTimeout(r, 2000 * attempt));
  }
}
const quote = xs => xs.map(x => `'${String(x).replace(/'/g, "''")}'`).join(',');
const datasets = [];
function write(name, meta, fetched, data, note) {
  if (SF.hasPII(data)) throw Error(`${name}: personal column survived normalization`);
  const text = JSON.stringify(data) + '\n'; fs.writeFileSync(path.join(outDir, `${name}.json`), text);
  datasets.push({ file: `${name}.json`, id: meta.id, title: meta.title, provider: meta.provider, page: `https://data.sf.gov/d/${meta.id}`, request: fetched.url, retrieved_at: fetched.retrieved_at, raw_rows: fetched.rows.length, raw_sha256: fetched.raw_sha256, sha256: sha256(text), license: LICENSE, kind: meta.kind, note });
  console.log(`${name}: ${fetched.rows.length} rows`);
}
// Sutherland–Hodgman clip of a ring to an axis-aligned box (the study-area bounding box).
function clipRing(ring, [w, s, e, n]) {
  const edges = [[p => p[0] >= w, (a, b) => [w, a[1] + (b[1] - a[1]) * (w - a[0]) / (b[0] - a[0])]], [p => p[0] <= e, (a, b) => [e, a[1] + (b[1] - a[1]) * (e - a[0]) / (b[0] - a[0])]],
    [p => p[1] >= s, (a, b) => [a[0] + (b[0] - a[0]) * (s - a[1]) / (b[1] - a[1]), s]], [p => p[1] <= n, (a, b) => [a[0] + (b[0] - a[0]) * (n - a[1]) / (b[1] - a[1]), n]]];
  let out = ring;
  for (const [inside, cut] of edges) { const src = out; out = []; for (let i = 0; i < src.length; i++) { const cur = src[i], prev = src[(i + src.length - 1) % src.length];
    if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); } else if (inside(prev)) out.push(cut(prev, cur)); } if (!out.length) break; }
  return out.length >= 3 ? [...out, out[0]].map(p => [+p[0].toFixed(6), +p[1].toFixed(6)]) : null;
}
fs.mkdirSync(outDir, { recursive: true });

// 1. Study-area neighbourhoods (official Analysis Neighborhoods).
const nhMeta = { id: 'j2bu-swwd', title: 'Analysis Neighborhoods', provider: 'City and County of San Francisco (DataSF)', kind: 'administrative geometry' };
const nh = await soql(nhMeta.id, `SELECT nhood, the_geom WHERE nhood in (${quote(NEIGHBORHOODS)}) LIMIT 10`);
if (nh.rows.length !== NEIGHBORHOODS.length) throw Error('neighbourhoods missing');
const nhoods = { type: 'FeatureCollection', features: nh.rows.map(r => ({ type: 'Feature', geometry: r.the_geom, properties: { nhood: r.nhood } })) };
write('neighborhoods', nhMeta, nh, nhoods, `${NEIGHBORHOODS.join(', ')}.`);
const all = nhoods.features.flatMap(f => f.geometry.coordinates.flat(2)), bbox = [Math.min(...all.map(p => p[0])), Math.min(...all.map(p => p[1])), Math.max(...all.map(p => p[0])), Math.max(...all.map(p => p[1]))].map(v => +v.toFixed(5));

// 2. 2024 High Injury Network segments intersecting the study bbox.
const hinMeta = { id: 'enwt-3u8m', title: '2024 High Injury Network', provider: 'SFMTA / SF Department of Public Health (Vision Zero SF)', kind: 'administrative designation (corridors with a high share of severe and fatal injuries)' };
const hin = await soql(hinMeta.id, `SELECT cnn_sgmt_pkey, full_street_name, corrected_length_miles, geom WHERE within_box(geom, ${bbox[3]}, ${bbox[0]}, ${bbox[1]}, ${bbox[2]}) LIMIT 5000`);
const hinFc = { type: 'FeatureCollection', features: hin.rows.filter(r => r.geom).map(r => ({ type: 'Feature', geometry: r.geom, properties: { cnn: SF.cnnId(r.cnn_sgmt_pkey), street: r.full_street_name, length_mi: +r.corrected_length_miles } })) };
write('hin', hinMeta, hin, hinFc, `Segments whose geometry intersects the study bbox ${bbox.join(',')}.`);

// 3. Injury crashes, AGGREGATED (counts only).
const crMeta = { id: 'ubvf-ztfx', title: 'Traffic Crashes Resulting in Injury', provider: 'SF Department of Public Health / SFPD (TIMS geocoded)', kind: 'administrative record of reported injury crashes (aggregated by CORE)' };
const cr = await soql(crMeta.id, `SELECT cnn_sgmt_fkey, analysis_neighborhood, collision_severity, dph_col_grp_description, count(*) AS n, sum(number_killed) AS killed WHERE collision_date >= '${CRASH_WINDOW.from}' AND collision_date <= '${CRASH_WINDOW.to}T23:59:59' AND analysis_neighborhood in (${quote(NEIGHBORHOODS)}) GROUP BY cnn_sgmt_fkey, analysis_neighborhood, collision_severity, dph_col_grp_description LIMIT 50000`);
const crashes = { window: CRASH_WINDOW, rows: cr.rows.map(r => ({ cnn: r.cnn_sgmt_fkey ? SF.cnnId(r.cnn_sgmt_fkey) : null, nhood: r.analysis_neighborhood, severity: r.collision_severity, group: r.dph_col_grp_description || null, n: +r.n, killed: +(r.killed || 0) })) };
write('crashes-agg', crMeta, cr, crashes, `Counts grouped by segment, neighbourhood, severity and collision group, ${CRASH_WINDOW.from} → ${CRASH_WINDOW.to}. No case-level data stored.`);

// 4. 100-year storm flood risk zone (SFPUC, 2022), clipped to the study bbox.
const flMeta = { id: 'jzu3-4yxp', title: '100-Year Storm Flood Risk Zone (July 2022)', provider: 'San Francisco Public Utilities Commission (SFPUC)', kind: 'modeled hazard zone (not observed flooding)' };
const fl = await soql(flMeta.id, `SELECT the_geom, data_as_of LIMIT 5`);
const polys = fl.rows.flatMap(r => r.the_geom.type === 'MultiPolygon' ? r.the_geom.coordinates : [r.the_geom.coordinates]).map(p => clipRing(p[0], bbox)).filter(Boolean); // outer rings; holes are dropped (documented)
write('flood-zone', flMeta, fl, { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: polys.map(r => [r]) }, properties: { data_as_of: fl.rows[0].data_as_of, clipped_to: bbox, holes: 'dropped' } }] }, 'Outer rings clipped to the study bbox; interior holes dropped (slight over-estimate of the zone, stated in the workflow).');

// 5. Street-use permits for street works in the study bbox (organisation holders only).
const puMeta = { id: 'b6tj-gt35', title: 'Street-Use Permits', provider: 'San Francisco Public Works', kind: 'administrative record (permit issued, not proof of work performed)' };
const since = '2026-01-01';
const pu = await soql(puMeta.id, `SELECT permit_number, permit_type, status, streetname, cross_street_1, cross_street_2, cnn, agent, permit_purpose, approved_date, permit_start_date, permit_end_date, latitude, longitude WHERE permit_type in (${quote(SF.WORK_PERMIT_TYPES)}) AND approved_date >= '${since}' AND latitude between ${bbox[1]} and ${bbox[3]} AND longitude between ${bbox[0]} and ${bbox[2]} LIMIT 20000`);
const permits = SF.collect(pu.rows, SF.permitFeature);
write('permits', puMeta, pu, { type: 'FeatureCollection', features: permits.features, dropped: permits.dropped }, `Types ${SF.WORK_PERMIT_TYPES.join(', ')}, approved since ${since}, inside the study bbox; agent organisation kept, personal contacts removed.`);

const manifest = { version: 'core-civ-snapshot-v1', generated_at: new Date().toISOString(), study_area: { neighborhoods: NEIGHBORHOODS, bbox }, by: 'scripts/civ-snapshot.mjs', datasets };
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log('manifest written', bbox);
