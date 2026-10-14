// Pedestrian network snapshot for the San Francisco pilot area (Phase 8).
//   node scripts/osm-walk.mjs                 fetch from the public Overpass API (one request) and write data/osm/walk-network.json
//   node scripts/osm-walk.mjs --input raw.json  rebuild from a saved Overpass response
// Source: OpenStreetMap contributors, ODbL 1.0. Only mapped pedestrian ways are kept (sidewalks, crossings,
// footways, pedestrian streets, paths, living streets); indoor ways, building passages and private/no-access ways
// are excluded so routes never cross buildings. Only geometry and the way kind are stored (no names, no other tags).
// The output is a derived database published under ODbL with attribution (see docs/PHASE_8_SECURITY_REVIEW.md).
import fs from 'node:fs';
import crypto from 'node:crypto';
const BBOX = [37.7695, -122.4205, 37.7905, -122.3895]; // south, west, north, east — SoMa around Folsom / Howard 2nd → 11th
const QUERY = `[out:json][timeout:60];way["highway"~"^(footway|pedestrian|path|living_street)$"](${BBOX.join(',')});out geom;`;
const args = process.argv.slice(2), inputAt = args.indexOf('--input');
let raw;
if (inputAt >= 0) raw = fs.readFileSync(args[inputAt + 1], 'utf8');
else {
  const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'User-Agent': 'CORE-prototype (https://github.com/vincentleg/core)', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(QUERY) });
  raw = await r.text(); if (!r.ok || raw[0] !== '{') { console.error('Overpass unavailable; nothing written.', r.status); process.exit(1); }
}
const osm = JSON.parse(raw);
const KINDS = ['sidewalk', 'crossing', 'footway', 'pedestrian', 'path', 'living_street'];
const kindOf = t => t.highway === 'footway' ? (t.footway === 'sidewalk' ? 'sidewalk' : t.footway === 'crossing' ? 'crossing' : 'footway') : t.highway;
const keep = w => KINDS.includes(w.tags.highway) || w.tags.highway === 'footway'
  ? !(w.tags.indoor && w.tags.indoor !== 'no') && w.tags.tunnel !== 'building_passage' && !['private', 'no'].includes(w.tags.access) && w.tags.footway !== 'access_aisle' && (!w.tags.level || /^0(;|$)/.test(w.tags.level))
  : false;
const nodes = [], index = new Map(), edges = [];
const node = p => { const k = `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`; if (!index.has(k)) { index.set(k, nodes.length); nodes.push([+p.lon.toFixed(6), +p.lat.toFixed(6)]); } return index.get(k); };
let ways = 0;
for (const w of osm.elements.filter(e => e.type === 'way' && e.geometry && keep(e))) { ways++; const k = KINDS.indexOf(kindOf(w.tags)); for (let i = 1; i < w.geometry.length; i++) { const a = node(w.geometry[i - 1]), b = node(w.geometry[i]); if (a !== b) edges.push([a, b, k]); } }
// Keep the largest connected component only (isolated fragments cannot be reached on foot in this network).
const adj = nodes.map(() => []); for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
const comp = new Int32Array(nodes.length).fill(-1); let best = -1, bestSize = 0;
for (let s = 0, c = 0; s < nodes.length; s++) { if (comp[s] >= 0) continue; let size = 0; const st = [s]; comp[s] = c; while (st.length) { const x = st.pop(); size++; for (const y of adj[x]) if (comp[y] < 0) { comp[y] = c; st.push(y); } } if (size > bestSize) { bestSize = size; best = c; } c++; }
const remap = new Map(); const outNodes = []; nodes.forEach((n, i) => { if (comp[i] === best) { remap.set(i, outNodes.length); outNodes.push(n); } });
const outEdges = edges.filter(([a]) => comp[a] === best).map(([a, b, k]) => [remap.get(a), remap.get(b), k]);
const out = { version: 'core-walk-network-v1', source: { name: 'OpenStreetMap (Overpass API)', licence: 'ODbL 1.0', attribution: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright', query: QUERY, osm_base: osm.osm3s && osm.osm3s.timestamp_osm_base, retrieved_at: new Date().toISOString(), raw_sha256: crypto.createHash('sha256').update(raw).digest('hex') },
  scope: 'Pedestrian ways mapped in OSM around Folsom / Howard (2nd → 11th St), San Francisco; largest connected component', kinds: KINDS, stats: { ways, nodes: outNodes.length, edges: outEdges.length, dropped_nodes: nodes.length - outNodes.length },
  caveat: 'Mapped geometry, not a field survey: width, surface, curb ramps and obstructions are unknown; accessibility is not asserted.', nodes: outNodes, edges: outEdges };
fs.mkdirSync('data/osm', { recursive: true }); fs.writeFileSync('data/osm/walk-network.json', JSON.stringify(out));
console.log(`data/osm/walk-network.json: ${ways} ways → ${outNodes.length} nodes, ${outEdges.length} edges (dropped ${nodes.length - outNodes.length} nodes outside the main component)`);
