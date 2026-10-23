// Reproducible, dated snapshot of PUBLIC San Francisco housing records for the V7.2 flagship mission
// "Housing affordability and urban resilience". node scripts/housing-snapshot.mjs [outDir=data/sf-housing]
// Node built-ins only. Sources (licences verified in each dataset's metadata on 2026-10-15, FD09):
//   • DataSF aaxw-2cb8 MOHCD Affordable Housing Pipeline — ODC-PDDL (project points: units, status, neighbourhood)
//   • DataSF xdht-4php Housing Production 2005–present — Public Domain U.S. Government (AGGREGATED by year / neighbourhood)
//   • DataSF 5cei-gny5 Eviction Notices — ODC-PDDL (AGGREGATED counts by year / neighbourhood only: no address, no record)
//   • (U.S. Census Bureau ACS was planned for rent burden, but its API now requires a key: not used — see gaps.)
// Raw API responses are hashed, never stored. Sponsors, owners and addresses are not kept.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const outDir = process.argv[2] || 'data/sf-housing';
const UA = 'CORE-housing-snapshot/1.0 (+https://github.com/vincentleg/core)';
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const PDDL = { name: 'ODC Public Domain Dedication and License (PDDL)', url: 'https://opendatacommons.org/licenses/pddl/1-0/' };
const USGOV = { name: 'Public Domain U.S. Government', url: 'https://data.sf.gov/d/xdht-4php' };

async function get(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }), body = await res.text();
    if (res.ok) return { url, json: JSON.parse(body), raw_sha256: sha256(body), retrieved_at: new Date().toISOString() };
    if (attempt >= 3) throw Error(`${url}: HTTP ${res.status} ${body.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 2000 * attempt));
  }
}
const soql = (id, q) => get(`https://data.sf.gov/resource/${id}.json?$query=${encodeURIComponent(q)}`);
fs.mkdirSync(outDir, { recursive: true });
const datasets = [];
const write = (file, meta, fetched, data, note) => {
  const text = JSON.stringify(data) + '\n'; fs.writeFileSync(path.join(outDir, file), text);
  datasets.push({ file, ...meta, request: fetched.url, retrieved_at: fetched.retrieved_at, raw_sha256: fetched.raw_sha256, sha256: sha256(text), note });
};

// 1. Affordable housing pipeline: one point per project, no sponsor/owner/address.
const pipe = await soql('aaxw-2cb8', 'SELECT project_id, project_status, construction_status, city_analysis_neighborhood, supervisor_district, housing_tenure, project_type, general_housing_program, total_project_units, mohcd_affordable_units, estimated_construction_completion, latitude, longitude LIMIT 5000');
const features = pipe.json.filter(r => r.latitude && r.longitude).map(r => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [Number(r.longitude), Number(r.latitude)] }, properties: {
  id: r.project_id, status: r.project_status || null, construction: r.construction_status || null, neighborhood: r.city_analysis_neighborhood || null, district: r.supervisor_district || null,
  tenure: r.housing_tenure || null, type: r.project_type || null, program: r.general_housing_program || null, units: Number(r.total_project_units) || 0, affordable: Number(r.mohcd_affordable_units) || 0,
  completion: r.estimated_construction_completion ? r.estimated_construction_completion.slice(0, 10) : null } }));
write('pipeline.geojson', { id: 'aaxw-2cb8', title: 'MOHCD Affordable Housing Pipeline', provider: 'Mayor’s Office of Housing and Community Development', page: 'https://data.sf.gov/d/aaxw-2cb8', license: PDDL, raw_rows: pipe.json.length, features: features.length },
  pipe, { type: 'FeatureCollection', features }, 'Pipeline = projects in planning, construction or completed under MOHCD programmes; status and completion dates are the department’s estimates.');

// 2. Housing production, aggregated.
const prodY = await soql('xdht-4php', "SELECT date_extract_y(first_completion_date) AS year, sum(net_units_completed) AS net_units, sum(affordable_units) AS affordable_units, count(*) AS permits WHERE first_completion_date IS NOT NULL GROUP BY year ORDER BY year LIMIT 100");
write('production-by-year.json', { id: 'xdht-4php', title: 'Housing Production 2005–present (aggregated by completion year)', provider: 'San Francisco Planning Department', page: 'https://data.sf.gov/d/xdht-4php', license: USGOV },
  prodY, prodY.json.map(r => ({ year: Number(r.year), net_units: Number(r.net_units) || 0, affordable_units: Number(r.affordable_units) || 0, permits: Number(r.permits) || 0 })), 'Net units completed; affordable units as reported (some are estimates per the source’s affordable_is_estimate flag).');
const prodN = await soql('xdht-4php', "SELECT analysis_neighborhood AS neighborhood, sum(net_units_completed) AS net_units, sum(affordable_units) AS affordable_units WHERE first_completion_date >= '2015-01-01' GROUP BY neighborhood ORDER BY net_units DESC LIMIT 100");
write('production-by-neighborhood.json', { id: 'xdht-4php', title: 'Housing Production by analysis neighbourhood, completions since 2015', provider: 'San Francisco Planning Department', page: 'https://data.sf.gov/d/xdht-4php', license: USGOV },
  prodN, prodN.json.map(r => ({ neighborhood: r.neighborhood || '(non renseigné)', net_units: Number(r.net_units) || 0, affordable_units: Number(r.affordable_units) || 0 })), 'Completions since 2015-01-01, summed by the source’s analysis_neighborhood field.');

// 3. Eviction notices: counts only.
const evY = await soql('5cei-gny5', "SELECT date_extract_y(file_date) AS year, count(*) AS notices, sum(case(ellis_act_withdrawal, 1, true, 0)) AS ellis, sum(case(owner_move_in, 1, true, 0)) AS omi WHERE file_date >= '2015-01-01' GROUP BY year ORDER BY year LIMIT 100");
const evN = await soql('5cei-gny5', "SELECT neighborhood, count(*) AS notices WHERE file_date >= '2020-01-01' GROUP BY neighborhood ORDER BY notices DESC LIMIT 100");
write('evictions-agg.json', { id: '5cei-gny5', title: 'Eviction Notices — aggregated counts (no record-level data kept)', provider: 'San Francisco Rent Board', page: 'https://data.sf.gov/d/5cei-gny5', license: PDDL },
  { url: evY.url + ' + ' + evN.url, retrieved_at: evY.retrieved_at, raw_sha256: sha256(evY.raw_sha256 + evN.raw_sha256) },
  { byYear: evY.json.map(r => ({ year: Number(r.year), notices: Number(r.notices) || 0, ellis: Number(r.ellis) || 0, owner_move_in: Number(r.omi) || 0 })), byNeighborhood2020: evN.json.map(r => ({ neighborhood: r.neighborhood || '(non renseigné)', notices: Number(r.notices) || 0 })) },
  'A notice filed with the Rent Board is not an eviction carried out; counts depend on filing practice.');

// 5. Analysis neighbourhood boundaries (all 41; already registered in data/sf9 for the study area), geometry simplified
//    (~10 m) and rounded to keep the file small. Used to place agents' virtual posts and to aggregate by neighbourhood.
const nb = await soql('j2bu-swwd', 'SELECT nhood, the_geom LIMIT 100');
const dp = (pts, tol) => { if (pts.length < 4) return pts; let i0 = 0, dmax = 0; const [a, b] = [pts[0], pts.at(-1)];
  for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-12, d = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / L; if (d > dmax) { dmax = d; i0 = i; } }
  return dmax > tol ? [...dp(pts.slice(0, i0 + 1), tol).slice(0, -1), ...dp(pts.slice(i0), tol)] : [a, b]; };
// Rings: Douglas–Peucker at 1e-4° (~10 m), rounded to 5 decimals; a ring keeps at least 4 points.
const ring = c => { // closed ring: split at the vertex farthest from the first, simplify both halves
  let k = 1, far = 0; for (let i = 1; i < c.length - 1; i++) { const d = Math.hypot(c[i][0] - c[0][0], c[i][1] - c[0][1]); if (d > far) { far = d; k = i; } }
  return [...dp(c.slice(0, k + 1), 1e-4).slice(0, -1), ...dp(c.slice(k), 1e-4)]; };
const round = p => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5];
const r5 = c => typeof c[0][0] === 'number' ? (r => r.length >= 4 ? r : c.map(round))(ring(c).map(round)) : c.map(r5);
write('neighborhoods.geojson', { id: 'j2bu-swwd', title: 'Analysis Neighborhoods', provider: 'City and County of San Francisco', page: 'https://data.sf.gov/d/j2bu-swwd', license: PDDL, features: nb.json.length },
  nb, { type: 'FeatureCollection', features: nb.json.map(r => ({ type: 'Feature', geometry: { type: r.the_geom.type, coordinates: r5(r.the_geom.coordinates) }, properties: { nhood: r.nhood } })) }, 'Boundaries used for aggregation and agent posts only.');

// 4. Census ACS (rent burden, median rent and income) is NOT fetched: on 2026-10-15 the Census Data API redirected
//    keyless requests to missing_key.html, and CORE uses no API key or account. Recorded as a gap in the manifest.
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ generated_at: new Date().toISOString(), generator: 'scripts/housing-snapshot.mjs', purpose: 'V7.2 flagship mission: San Francisco housing affordability and urban resilience', datasets,
  privacy: 'No names, sponsors, owners, addresses or record-level eviction data are stored.',
  gaps: [{ topic: 'rent burden, median rent, household income', source: 'U.S. Census Bureau ACS 5-year (api.census.gov)', reason: 'API redirected keyless requests to missing_key.html on 2026-10-15; CORE uses no API key without founder approval' }] }, null, 1) + '\n');
console.log(datasets.map(d => `${d.file} ${d.features ?? ''} ${d.sha256.slice(0, 12)}`).join('\n'));
