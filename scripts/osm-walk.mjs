// Pedestrian network for the Phase 9 study area (SoMa, Mission, Tenderloin), validated against building footprints.
//   node scripts/osm-walk.mjs                                  fetch pedestrian ways + buildings from Overpass (tiled), write
//   node scripts/osm-walk.mjs --input walk.json --buildings b1.json b2.json …   rebuild from saved Overpass responses
// Source: OpenStreetMap contributors, ODbL 1.0. Kept: sidewalks, crossings, footways, pedestrian streets, paths, living
// streets; dropped: indoor ways, building passages, private/no-access ways, non-ground levels. Validation: any edge with a
// sampled point strictly inside a building footprint is REMOVED (open "roof" canopies excepted, stated), then only the
// largest connected component is kept, so routes cannot cross buildings or jump between disconnected fragments.
// Outputs: data/osm/walk-network.json (compact: integer micro-degrees) and data/osm/buildings-sample.json (three
// test areas, one per neighbourhood, for automated route-vs-building tests). Only geometry and the way kind are stored.
import fs from 'node:fs';
import crypto from 'node:crypto';
const man = JSON.parse(fs.readFileSync('data/sf9/manifest.json', 'utf8')), [W, S, E, N] = man.study_area.bbox;
const UA = { 'User-Agent': 'CORE-prototype (https://github.com/vincentleg/core)', 'Content-Type': 'application/x-www-form-urlencoded' };
const args = process.argv.slice(2), at = k => args.indexOf(k);
async function overpass(q) { const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: UA, body: 'data=' + encodeURIComponent(q) }); const t = await r.text(); if (!r.ok || t[0] !== '{') throw Error(`Overpass unavailable (${r.status})`); return t; }
const WALK_Q = `[out:json][timeout:120];way["highway"~"^(footway|pedestrian|path|living_street)$"](${S},${W},${N},${E});out geom;`;
let walkRaw, bldRaws;
if (at('--input') >= 0) { walkRaw = fs.readFileSync(args[at('--input') + 1], 'utf8'); bldRaws = args.slice(at('--buildings') + 1).filter(a => !a.startsWith('--')).map(f => fs.readFileSync(f, 'utf8')); }
else { walkRaw = await overpass(WALK_Q); const my = (S + N) / 2, mx = (W + E) / 2; bldRaws = []; for (const b of [[S, W, my, mx], [S, mx, my, E], [my, W, N, mx], [my, mx, N, E]]) bldRaws.push(await overpass(`[out:json][timeout:180];way["building"](${b.join(',')});out geom;`)); }
const osm = JSON.parse(walkRaw);
const KINDS = ['sidewalk', 'crossing', 'footway', 'pedestrian', 'path', 'living_street'];
const kindOf = t => t.highway === 'footway' ? (t.footway === 'sidewalk' ? 'sidewalk' : t.footway === 'crossing' ? 'crossing' : 'footway') : t.highway;
const keep = w => (KINDS.includes(w.tags.highway) || w.tags.highway === 'footway') && !(w.tags.indoor && w.tags.indoor !== 'no') && w.tags.tunnel !== 'building_passage' && w.tags.covered !== 'yes' && !['private', 'no'].includes(w.tags.access) && w.tags.footway !== 'access_aisle' && (!w.tags.level || /^0(;|$)/.test(w.tags.level));

// Buildings (closed ways). Grid index of polygon bounding boxes.
const seen = new Set(), buildings = [];
for (const raw of bldRaws) for (const e of JSON.parse(raw).elements) { if (e.type !== 'way' || !e.geometry || seen.has(e.id)) continue; seen.add(e.id); if (e.tags.building === 'roof' || e.geometry.length < 4) continue;
  const ring = e.geometry.map(p => [p.lon, p.lat]); const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]); buildings.push({ ring, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }); }
const CELL = 0.002, grid = new Map(), gk = (x, y) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
buildings.forEach((b, i) => { for (let x = Math.floor(b.bb[0] / CELL); x <= Math.floor(b.bb[2] / CELL); x++) for (let y = Math.floor(b.bb[1] / CELL); y <= Math.floor(b.bb[3] / CELL); y++) { const k = `${x},${y}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); } });
const inRing = (p, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const insideBuilding = p => (grid.get(gk(p[0], p[1])) || []).some(i => { const b = buildings[i]; return p[0] >= b.bb[0] && p[0] <= b.bb[2] && p[1] >= b.bb[1] && p[1] <= b.bb[3] && inRing(p, b.ring); });
const M = 111320, dist = (a, b) => Math.hypot((b[0] - a[0]) * M * Math.cos(37.77 * Math.PI / 180), (b[1] - a[1]) * M);
// Samples every ~1 m strictly between the endpoints (endpoints may touch a facade where a door or ramp is mapped).
const crosses = (a, b) => { const n = Math.max(2, Math.ceil(dist(a, b))); for (let s = 1; s < n; s++) { const t = s / n; if (insideBuilding([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) return true; } return false; };

const nodes = [], index = new Map(), edges = []; let ways = 0, removed = 0;
const node = p => { const k = `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`; if (!index.has(k)) { index.set(k, nodes.length); nodes.push([+p.lon.toFixed(6), +p.lat.toFixed(6)]); } return index.get(k); };
for (const w of osm.elements.filter(e => e.type === 'way' && e.geometry && keep(e))) { ways++; const k = KINDS.indexOf(kindOf(w.tags));
  for (let i = 1; i < w.geometry.length; i++) { const a = node(w.geometry[i - 1]), b = node(w.geometry[i]); if (a === b) continue; if (crosses(nodes[a], nodes[b])) { removed++; continue; } edges.push([a, b, k]); } }
const adj = nodes.map(() => []); for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
const comp = new Int32Array(nodes.length).fill(-1); let best = -1, bestSize = 0;
for (let s = 0, c = 0; s < nodes.length; s++) { if (comp[s] >= 0 || !adj[s].length) continue; let size = 0; const st = [s]; comp[s] = c; while (st.length) { const x = st.pop(); size++; for (const y of adj[x]) if (comp[y] < 0) { comp[y] = c; st.push(y); } } if (size > bestSize) { bestSize = size; best = c; } c++; }
const remap = new Map(), outNodes = []; nodes.forEach((n, i) => { if (comp[i] === best) { remap.set(i, outNodes.length); outNodes.push(n); } });
const outEdges = edges.filter(([a]) => comp[a] === best).map(([a, b, k]) => [remap.get(a), remap.get(b), k]);
const base = [Math.round(W * 1e6), Math.round(S * 1e6)];
const out = { version: 'core-walk-network-v2', encoding: 'n: flat [x,y] integers = round(deg*1e6) - base; e: flat [a,b,kind]', base,
  source: { name: 'OpenStreetMap (Overpass API)', licence: 'ODbL 1.0', attribution: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright', query: WALK_Q, osm_base: osm.osm3s && osm.osm3s.timestamp_osm_base, retrieved_at: new Date().toISOString(), raw_sha256: crypto.createHash('sha256').update(walkRaw).digest('hex') },
  scope: `Pedestrian ways mapped in OSM in the study bbox ${[W, S, E, N].join(',')} (${man.study_area.neighborhoods.join(', ')}); largest connected component`,
  validation: { buildings: buildings.length, edges_removed_crossing_buildings: removed, sampling: '≈ 1 m along each edge, endpoints excluded', exception: 'building=roof canopies are not obstacles' },
  kinds: KINDS, stats: { ways, nodes: outNodes.length, edges: outEdges.length, dropped_nodes: nodes.length - outNodes.length },
  caveat: 'Mapped geometry, not a field survey: width, surface, curb ramps and obstructions are unknown; accessibility is not asserted.',
  n: outNodes.flatMap(p => [Math.round(p[0] * 1e6) - base[0], Math.round(p[1] * 1e6) - base[1]]), e: outEdges.flat() };
fs.mkdirSync('data/osm', { recursive: true }); fs.writeFileSync('data/osm/walk-network.json', JSON.stringify(out));
// Building sample for tests: three 400 m boxes, one per neighbourhood.
const AREAS = { soma: [-122.4110, 37.7750, -122.4060, 37.7785], mission: [-122.4245, 37.7630, -122.4195, 37.7665], tenderloin: [-122.4150, 37.7825, -122.4100, 37.7860] };
const sample = Object.fromEntries(Object.entries(AREAS).map(([k, [w, s, e, n]]) => [k, { bbox: [w, s, e, n], buildings: buildings.filter(b => b.bb[2] >= w && b.bb[0] <= e && b.bb[3] >= s && b.bb[1] <= n).map(b => b.ring.map(p => [+p[0].toFixed(6), +p[1].toFixed(6)])) }]));
fs.writeFileSync('data/osm/buildings-sample.json', JSON.stringify({ version: 'core-buildings-sample-v1', source: out.source.attribution + ' (ODbL 1.0), OSM building footprints', osm_base: JSON.parse(bldRaws[0]).osm3s.timestamp_osm_base, areas: sample }));
console.log(`walk network: ${ways} ways → ${outNodes.length} nodes, ${outEdges.length} edges; ${removed} edge(s) removed for crossing one of ${buildings.length} buildings; sample ${Object.entries(sample).map(([k, v]) => `${k}:${v.buildings.length}`).join(' ')}`);
