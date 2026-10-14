// CORE — agent population model (Phase 8). Pure functions shared by the browser and Node tests:
//  • ZONES: 13 virtual working domains (organisational, never real offices) covering all 28 departments;
//  • status(): one honest primary status per profile from real data (live local run, queue, recorded work,
//    executability) — an avatar never implies work by itself;
//  • filters for the population control; a seeded PRNG so illustrative motion is reproducible;
//  • the OSM pedestrian network (data/osm/walk-network.json) with a binary-heap Dijkstra and a grid index.
(function (root) {
  'use strict';
  const ZONES = [
    { id: 'governance', name: 'Gouvernance et coordination', depts: ['administration', 'regulatory', 'economics'] },
    { id: 'mobility', name: 'Mobilité urbaine', depts: ['mobility', 'transit'] },
    { id: 'infrastructure', name: 'Infrastructures', depts: ['civil', 'telecom', 'digital'] },
    { id: 'environment', name: 'Environnement', depts: ['ecology', 'forestry', 'environmental'] },
    { id: 'energy', name: 'Énergie et bâtiments', depts: ['energy', 'electrical', 'building-systems', 'mechanical'] },
    { id: 'public-safety', name: 'Analyse des risques et sécurité publique', depts: ['geotech', 'cybersecurity'] },
    { id: 'accessibility', name: 'Accessibilité et espace public', depts: ['public-space'] },
    { id: 'planning', name: 'Urbanisme et logement', depts: ['architecture', 'housing'] },
    { id: 'public-health', name: 'Santé publique et société', depts: ['health', 'social'] },
    { id: 'water', name: 'Eau', depts: ['water'] },
    { id: 'climate', name: 'Climat et résilience', depts: ['climate'] },
    { id: 'verification', name: 'Vérification des données', depts: ['data-science', 'research'] },
    { id: 'review', name: 'Revue scientifique et simulation', depts: ['safety', 'simulation'] },
  ];
  const zoneOf = a => a.scope.level === 'global' || a.scope.level === 'city' || a.scope.level === 'governance' ? 'governance' : (ZONES.find(z => z.depts.includes(a.department)) || ZONES[0]).id;

  // Primary status, most specific first. `facts` comes from loaded data only.
  const STATUS = {
    executing: 'en cours d’exécution (réelle)', queued: 'en file d’attente (réelle)', recorded: 'a participé à des missions enregistrées',
    available: 'exécutable, sans travail enregistré', 'available-local': 'exécutable avec le modèle local uniquement', coordination: 'profil de coordination (non exécutable)', unavailable: 'indisponible (donnée ou outil manquant)',
  };
  function status(a, facts) {
    if (facts.executing.has(a.id)) return 'executing';
    if (facts.queued.has(a.id)) return 'queued';
    if (facts.recorded.has(a.id)) return 'recorded';
    if (a.executionMode === 'deterministic') return 'available';
    if (a.executionMode === 'llm') return 'available-local';
    return a.executionMode === 'coordination-only' ? 'coordination' : 'unavailable';
  }
  // facts: { executing:Set, queued:Set, recorded:Set } built from live/local data, recorded missions and operations.
  function facts({ cogIndex, detIndex, operations, live, sessionRunning = [] }) {
    const recorded = new Set([...(cogIndex ? cogIndex.missions.flatMap(m => m.agents) : []), ...(detIndex ? detIndex.missions.flatMap(m => m.agentIds || []) : []),
      ...(operations ? operations.tasks.filter(t => t.result).flatMap(t => t.agents.map(a => a.id)) : [])]);
    const executing = new Set([...sessionRunning, ...(live && live.running ? live.running.flatMap(r => r.agents) : [])]);
    const queued = new Set(live && live.queued ? live.queued : []);
    return { recorded, executing, queued };
  }
  const FILTERS = {
    all: () => true, executable: a => a.executionMode === 'deterministic' || a.executionMode === 'llm',
    recorded: (a, st) => st === 'recorded' || st === 'executing' || st === 'queued', active: (a, st) => st === 'executing' || st === 'queued',
  };
  function filter(registry, statusOf, f) {
    if (FILTERS[f]) return registry.agents.filter(a => FILTERS[f](a, statusOf(a)));
    const [k, v] = String(f).split(':');
    if (k === 'zone') return registry.agents.filter(a => zoneOf(a) === v);
    if (k === 'dept') return registry.agents.filter(a => a.department === v && !a.id.endsWith('.lead') || a.id === `core.${registry.city.id}.${v}.lead`);
    if (k === 'team') { const lead = registry.agents.find(a => a.id === v); return lead ? registry.agents.filter(a => a.id === v || a.supervisor === v) : []; }
    return [];
  }
  // Mulberry32 seeded by a string: illustrative motion is identical on every run.
  function prng(seed) { let h = 1779033703 ^ seed.length; for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- Pedestrian network ----------
  const R = 6371008.8, rad = x => x * Math.PI / 180;
  const dist = (a, b) => { const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  function network(walk) {
    const n = walk.nodes.length, adj = Array.from({ length: n }, () => []);
    for (const [a, b, k] of walk.edges) { const d = dist(walk.nodes[a], walk.nodes[b]); adj[a].push([b, d, k]); adj[b].push([a, d, k]); }
    const CELL = 0.0015, grid = new Map(), key = (x, y) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
    walk.nodes.forEach((p, i) => { const k = key(p[0], p[1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
    function nearest(c) { let best = -1, bd = Infinity; const cx = Math.floor(c[0] / CELL), cy = Math.floor(c[1] / CELL);
      for (let r = 0; r < 6 && best < 0; r++) for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (const i of grid.get(`${x},${y}`) || []) { const d = dist(c, walk.nodes[i]); if (d < bd) { bd = d; best = i; } }
      return { i: best, d: bd }; }
    function shortest(s, t) {
      const D = new Float64Array(n).fill(Infinity), P = new Int32Array(n).fill(-1), heap = [[0, s]]; D[s] = 0;
      const push = x => { heap.push(x); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r2 = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r2 < heap.length && heap[r2][0] < heap[m][0]) m = r2; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
      while (heap.length) { const [d, u] = pop(); if (u === t) break; if (d > D[u]) continue; for (const [v, w] of adj[u]) if (d + w < D[v]) { D[v] = d + w; P[v] = u; push([D[v], v]); } }
      if (!isFinite(D[t])) return null; const path = []; for (let v = t; v >= 0; v = P[v]) path.unshift(v); return { nodes: path, length: D[t] };
    }
    // Route between two coordinates; endpoints farther than 30 m from the network are flagged approximate.
    function route(from, to) {
      const a = nearest(from), b = nearest(to); if (a.i < 0 || b.i < 0) return null; const sp = shortest(a.i, b.i); if (!sp) return null;
      const coords = sp.nodes.map(i => walk.nodes[i]); if (a.d > 2) coords.unshift(from); if (b.d > 2) coords.push(to);
      return { coords, length: sp.length + a.d + b.d, approx: a.d > 30 || b.d > 30, kinds: [...new Set(sp.nodes.slice(1).map((v, i) => (adj[sp.nodes[i]].find(e => e[0] === v) || [0, 0, 0])[2]).map(k => walk.kinds[k]))] };
    }
    return { nodes: walk.nodes, adj, nearest, shortest, route };
  }
  // Deterministic zone territories: anchors by farthest-point sampling over nodes near the corridor, Voronoi cells.
  function zoneLayout(net, centre, radiusM = 900) {
    const cand = []; net.nodes.forEach((p, i) => { if (dist(p, centre) <= radiusM && i % 3 === 0) cand.push(i); });
    const anchors = [net.nearest(centre).i]; const dmin = new Float64Array(cand.length).fill(Infinity);
    while (anchors.length < ZONES.length) { const last = net.nodes[anchors[anchors.length - 1]]; let bi = -1, bd = -1;
      cand.forEach((c, k) => { dmin[k] = Math.min(dmin[k], dist(net.nodes[c], last)); if (dmin[k] > bd) { bd = dmin[k]; bi = c; } }); anchors.push(bi); }
    const members = ZONES.map(() => []);
    for (const c of cand) { let bz = 0, bd = Infinity; anchors.forEach((a, z) => { const d = dist(net.nodes[c], net.nodes[a]); if (d < bd) { bd = d; bz = z; } }); members[bz].push(c); }
    return ZONES.map((z, k) => ({ ...z, anchor: net.nodes[anchors[k]], anchorNode: anchors[k], nodes: members[k] }));
  }
  const POP = { ZONES, STATUS, zoneOf, status, facts, filter, FILTERS, prng, dist, network, zoneLayout };
  if (typeof module !== 'undefined' && module.exports) module.exports = POP; else root.CORE_POPULATION = POP;
})(typeof globalThis !== 'undefined' ? globalThis : this);
