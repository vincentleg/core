// New York study-area snapshot (Phase 10): Chinatown-Two Bridges, Lower East Side, East Village (Manhattan).
//   node scripts/nyc-snapshot.mjs [outDir=data/nyc]
// NYC Open Data (no use restriction under the NYC Open Data Law; attribution of source, version and modifications given
// here). Output schema = the SF study-area schema (data/sf9) so the same tools run in both cities:
//   neighborhoods · hin (VZV Priority Corridors, id = hash of geometry) · crashes-agg (COUNTS ONLY: collisions with ≥ 1
//   injured or killed, assigned to the nearest corridor within 20 m; property-damage-only collisions excluded to match
//   SF's injury-only dataset) · permits (DOT street closures for construction; not permits; no holder) · ramps (measured).
// Privacy: collision rows are fetched with location and counts only (no collision id, vehicles, factors or times) and are
// aggregated before writing; raw responses are hashed, never stored.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const outDir = process.argv[2] || 'data/nyc', API = 'https://data.cityofnewyork.us/resource', UA = 'CORE-nyc-snapshot/1.0 (+https://github.com/vincentleg/core)';
const LICENCE = { name: 'NYC Open Data Law (Local Law 11 of 2012, as amended by Local Law 251 of 2017): no restrictions on use; attribution of source, version and modifications', url: 'https://opendata.cityofnewyork.us/overview/' };
const NEIGHBORHOODS = ['Chinatown-Two Bridges', 'Lower East Side', 'East Village'];
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex'), quote = xs => xs.map(x => `'${String(x).replace(/'/g, "''")}'`).join(',');
async function soql(id, params) {
  const u = new URL(`${API}/${id}.json`); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  for (let attempt = 1; ; attempt++) { const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } }), body = await r.text();
    if (r.ok) { const rows = JSON.parse(body); if (!Array.isArray(rows)) throw Error(`${id}: unexpected response`); return { url: u.toString(), rows, raw_sha256: sha256(body), retrieved_at: new Date().toISOString() }; }
    if (attempt >= 3) throw Error(`${id}: HTTP ${r.status} ${body.slice(0, 200)}`); await new Promise(x => setTimeout(x, 2000 * attempt)); }
}
const datasets = [];
function write(name, meta, fetched, data, note) {
  const text = JSON.stringify(data) + '\n'; fs.writeFileSync(path.join(outDir, `${name}.json`), text);
  const req = Array.isArray(fetched) ? fetched : [fetched];
  datasets.push({ file: `${name}.json`, id: meta.id, title: meta.title, provider: meta.provider, page: `https://data.cityofnewyork.us/d/${meta.id}`, request: req.map(f => f.url).join(' ; '), retrieved_at: req[0].retrieved_at, raw_rows: req.reduce((n, f) => n + f.rows.length, 0), raw_sha256: req.map(f => f.raw_sha256).join(','), sha256: sha256(text), license: LICENCE, kind: meta.kind, note });
  console.log(`${name}: ${req.reduce((n, f) => n + f.rows.length, 0)} rows`);
}
const R = 6371008.8, rad = x => x * Math.PI / 180;
const local = (p, o) => [(p[0] - o[0]) * rad(1) * R * Math.cos(rad(o[1])), (p[1] - o[1]) * rad(1) * R];
function distToLine(p, coords) { let best = Infinity; for (let i = 1; i < coords.length; i++) { const a = local(coords[i - 1], p), b = local(coords[i], p), d = [b[0] - a[0], b[1] - a[1]], L = d[0] * d[0] + d[1] * d[1], t = L ? Math.max(0, Math.min(1, -(a[0] * d[0] + a[1] * d[1]) / L)) : 0; best = Math.min(best, Math.hypot(a[0] + t * d[0], a[1] + t * d[1])); } return best; }
const inRing = (p, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const inGeom = (p, g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).some(poly => inRing(p, poly[0]) && !poly.slice(1).some(h => inRing(p, h)));
const lineLenM = g => (g.type === 'MultiLineString' ? g.coordinates : [g.coordinates]).reduce((s, c) => s + c.slice(1).reduce((n, q, i) => n + Math.hypot(...local(q, c[i])), 0), 0);
fs.mkdirSync(outDir, { recursive: true });

// 1. Neighbourhoods (2020 NTAs).
const nhMeta = { id: '9nt8-h7nd', title: '2020 Neighborhood Tabulation Areas (NTAs)', provider: 'NYC Department of City Planning', kind: 'administrative geometry' };
const nh = await soql(nhMeta.id, { $select: 'ntaname, the_geom', $where: `ntaname in (${quote(NEIGHBORHOODS)})` });
if (nh.rows.length !== NEIGHBORHOODS.length) throw Error('NTAs missing');
const nhoods = { type: 'FeatureCollection', features: nh.rows.map(r => ({ type: 'Feature', geometry: r.the_geom, properties: { nhood: r.ntaname } })) };
write('neighborhoods', nhMeta, nh, nhoods, NEIGHBORHOODS.join(', '));
const all = nhoods.features.flatMap(f => f.geometry.coordinates.flat(2)), bbox = [Math.min(...all.map(p => p[0])), Math.min(...all.map(p => p[1])), Math.max(...all.map(p => p[0])), Math.max(...all.map(p => p[1]))].map(v => +v.toFixed(5));
const nhoodOf = p => (nhoods.features.find(f => inGeom(p, f.geometry)) || { properties: {} }).properties.nhood || null;

// 2. Vision Zero priority corridors (stable id from geometry; no street names in the source).
const hinMeta = { id: '36nr-7fbp', title: 'VZV Priority Corridors', provider: 'NYC Department of Transportation (Vision Zero View)', kind: 'administrative designation (NYC DOT method, differs from the SF High Injury Network)' };
// within_box() returns nothing on this dataset (geometry not spatially indexed): fetch all (≈ 200 rows) and filter here.
const hinAll = await soql(hinMeta.id, { $select: 'the_geom', $limit: '5000' }), inBox = p => p[0] >= bbox[0] && p[0] <= bbox[2] && p[1] >= bbox[1] && p[1] <= bbox[3];
const hin = { ...hinAll, rows: hinAll.rows.filter(r => r.the_geom && (r.the_geom.type === 'MultiLineString' ? r.the_geom.coordinates.flat() : r.the_geom.coordinates).some(inBox)) };
// NYC corridors are whole streets reaching beyond the study area: split each into per-NTA pieces (sub-segments whose
// midpoint lies in the NTA), so lengths, rates and neighbourhood membership only count the study area.
const ABBR = { 'Chinatown-Two Bridges': 'CT', 'Lower East Side': 'LES', 'East Village': 'EV' };
const hinFc = { type: 'FeatureCollection', features: hin.rows.flatMap(r => { const g = r.the_geom, lines = g.type === 'MultiLineString' ? g.coordinates : [g.coordinates], c = lines.flat(), base = `pc-${sha256(JSON.stringify([c[0], c[c.length - 1]])).slice(0, 10)}`;
  return nhoods.features.map(nf => { const parts = []; for (const ln of lines) { let cur = []; for (let i = 1; i < ln.length; i++) { const m = [(ln[i - 1][0] + ln[i][0]) / 2, (ln[i - 1][1] + ln[i][1]) / 2]; if (inGeom(m, nf.geometry)) { if (!cur.length) cur.push(ln[i - 1]); cur.push(ln[i]); } else if (cur.length) { parts.push(cur); cur = []; } } if (cur.length) parts.push(cur); }
    if (!parts.length) return null; const geom = { type: 'MultiLineString', coordinates: parts };
    return { type: 'Feature', geometry: geom, properties: { cnn: `${base}:${ABBR[nf.properties.nhood]}`, corridor: base, nhood: nf.properties.nhood, street: null, length_mi: +(lineLenM(geom) / 1609.344).toFixed(4) } }; }).filter(Boolean); }) };
// (written after the collisions, which provide the derived street names)
const corridorOf = (p, nhd = null) => { let best = null, bd = 20; for (const f of hinFc.features) { if (nhd && f.properties.nhood !== nhd) continue; const d = Math.min(...(f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates]).map(c => distToLine(p, c))); if (d <= bd) { bd = d; best = f.properties.cnn; } } return best; };

// 3. Collisions with ≥ 1 injured or killed, five years ending at the dataset's latest date; aggregated.
const crMeta = { id: 'h9gi-nx95', title: 'Motor Vehicle Collisions - Crashes', provider: 'NYC Police Department (NYPD)', kind: 'police-reported collisions (aggregated by CORE)' };
const maxDate = (await soql(crMeta.id, { $select: 'max(crash_date) AS d' })).rows[0].d.slice(0, 10), from = `${+maxDate.slice(0, 4) - 5}-${maxDate.slice(5)}`;
const pages = []; for (let off = 0; ; off += 50000) { const p = await soql(crMeta.id, { $select: 'latitude, longitude, on_street_name, number_of_persons_injured, number_of_persons_killed, number_of_pedestrians_injured, number_of_pedestrians_killed', $where: `crash_date > '${from}' AND crash_date <= '${maxDate}T23:59:59' AND latitude between ${bbox[1]} and ${bbox[3]} AND longitude between ${bbox[0]} and ${bbox[2]} AND (number_of_persons_injured > 0 OR number_of_persons_killed > 0)`, $limit: '50000', $offset: String(off), $order: ':id' }); pages.push(p); if (p.rows.length < 50000) break; }
const agg = new Map(), names = new Map(); let outside = 0, unassigned = 0;
for (const r of pages.flatMap(p => p.rows)) { const pt = [+r.longitude, +r.latitude], nhd = nhoodOf(pt); if (!nhd) { outside++; continue; } const cnn = corridorOf(pt, nhd); if (!cnn) { unassigned++; continue; }
  const killed = +r.number_of_persons_killed || 0, sev = killed > 0 ? 'Fatal' : 'Injury (unspecified severity)', grp = (+r.number_of_pedestrians_injured || 0) + (+r.number_of_pedestrians_killed || 0) > 0 ? 'Vehicle-Pedestrian' : 'Other (no pedestrian casualty)';
  if (r.on_street_name) { const m = names.get(cnn) || new Map(), nm = r.on_street_name.trim().toUpperCase(); m.set(nm, (m.get(nm) || 0) + 1); names.set(cnn, m); }
  const k = [cnn, nhd, sev, grp].join('|'); const e = agg.get(k) || { cnn, nhood: nhd, severity: sev, group: grp, n: 0, killed: 0 }; e.n++; e.killed += killed; agg.set(k, e); }
for (const f of hinFc.features) { const m = names.get(f.properties.cnn); if (m) { f.properties.street = [...m].sort((a, b) => b[1] - a[1])[0][0]; f.properties.street_basis = 'nom de rue le plus fréquent des collisions rattachées (déduit par CORE)'; } }
write('hin', hinMeta, hin, hinFc, `Corridors intersecting the study bbox ${bbox.join(',')}, split into per-NTA pieces (id = hash of the corridor's first/last vertex + NTA); length = in-NTA length (geodesic); street name derived from attached collisions.`);
write('crashes-agg', crMeta, pages, { window: { from, to: maxDate }, assignment: 'nearest VZV priority corridor within 20 m; collisions farther than 20 m from any corridor are not counted', excluded: { outsideStudyArea: outside, unassignedOver20m: unassigned }, rows: [...agg.values()] }, `Collisions with ≥ 1 injured or killed, ${from} → ${maxDate}; counts only.`);

// 4. Street closures for construction (DOT), active or upcoming.
const wkMeta = { id: 'i6b5-j7bu', title: 'Street Closures due to Construction Activities by Block', provider: 'NYC Department of Transportation', kind: 'authorised street closures for construction (not permits; no holder recorded)' };
const wk = await soql(wkMeta.id, { $select: 'the_geom, segmentid, onstreetname, fromstreetname, tostreetname, work_start_date, work_end_date, uniqueid, purpose', $where: `borough_code = 'M' AND work_end_date >= '2026-01-01' AND within_box(the_geom, ${bbox[3]}, ${bbox[0]}, ${bbox[1]}, ${bbox[2]})`, $limit: '20000' });
const permits = { type: 'FeatureCollection', features: wk.rows.filter(r => r.the_geom).map(r => { const c = (r.the_geom.type === 'MultiLineString' ? r.the_geom.coordinates.flat() : r.the_geom.coordinates), mid = c[Math.floor(c.length / 2)];
  return { type: 'Feature', geometry: { type: 'Point', coordinates: mid }, properties: { kind: 'closure', record_id: `${String(r.uniqueid).slice(0, 16)}@${r.segmentid}`, permit_type: r.purpose || 'closure', status: 'AUTHORISED', status_class: 'active', street: r.onstreetname, cross_street_1: r.fromstreetname, cross_street_2: r.tostreetname, cnn: corridorOf(mid, nhoodOf(mid)) || `lion:${r.segmentid}`, agent: null, start: String(r.work_start_date).slice(0, 10), end: String(r.work_end_date).slice(0, 10), approved: null } }; }) };
write('permits', wkMeta, wk, permits, 'Closures by block; geometry midpoint; cnn = corridor id when within 20 m of a priority corridor, else LION segment id.');

// 5. Pedestrian ramps (measured survey).
const rpMeta = { id: 'ufzp-rrqu', title: 'Pedestrian Ramp Locations', provider: 'NYC Department of Transportation', kind: 'survey of pedestrian ramps (measurements dated per ramp)' };
const rp = await soql(rpMeta.id, { $select: 'the_geom, rampid, cornerid, stname1, stname2, geocyclora, ramp_running_slope_total, ramp_cross_slope, lnd_width, lnd_length, lnd_cross_slope, ponding, obstacles_ramp, obstacles_landing, dws_conditions', $where: `within_box(the_geom, ${bbox[3]}, ${bbox[0]}, ${bbox[1]}, ${bbox[2]})`, $limit: '20000' });
const num = v => { const n = +v; return Number.isFinite(n) && n < 900 ? n : null; }; // 999 = not measured
const ramps = { type: 'FeatureCollection', features: rp.rows.filter(r => r.the_geom && nhoodOf(r.the_geom.coordinates)).map(r => ({ type: 'Feature', geometry: r.the_geom, properties: { record_id: String(r.rampid), corner: r.cornerid, street: r.stname1 || null, cross: r.stname2 || null, surveyed: r.geocyclora ? String(r.geocyclora).slice(0, 10) : null, running_slope_pct: num(r.ramp_running_slope_total), cross_slope_pct: num(r.ramp_cross_slope), landing_width: num(r.lnd_width), landing_length: num(r.lnd_length), landing_cross_slope_pct: num(r.lnd_cross_slope), ponding: r.ponding || null, obstacles_ramp: r.obstacles_ramp || null, obstacles_landing: r.obstacles_landing || null, warning_surface: r.dws_conditions || null } })) };
write('ramps', rpMeta, rp, ramps, 'Ramps inside the three NTAs; 999 = not measured (null). Units: slopes in percent; landing dimensions as published (assumed inches, see data dictionary).');

const manifest = { version: 'core-civ-snapshot-v1', city: 'new-york', generated_at: new Date().toISOString(), study_area: { neighborhoods: NEIGHBORHOODS, bbox }, by: 'scripts/nyc-snapshot.mjs', datasets };
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log('manifest written', bbox, `collisions: ${outside} outside the NTAs, ${unassigned} > 20 m from a corridor`);
