// CORE — San Francisco world geometry (Phase 2B).
// Procedural landmark models rendered as MapLibre fill-extrusions: no new dependency, works with the globe.
// Models are APPROXIMATE: published dimensions + OpenStreetMap positions, not survey geometry.
(function (root) {
  'use strict';

  const R = 6371008.8, RAD = Math.PI / 180;
  const OSM = '© OpenStreetMap contributors (ODbL)';

  // Local metric frame: `along` follows the bearing from origin, `across` is 90° clockwise.
  function frame(origin, bearingDeg) {
    const b = bearingDeg * RAD, cosLat = Math.cos(origin[1] * RAD);
    const ux = Math.sin(b), uy = Math.cos(b); // unit vector east/north
    return (along, across) => {
      const east = along * ux + across * uy, north = along * uy - across * ux;
      return [origin[0] + east / (R * cosLat * RAD), origin[1] + north / (R * RAD)];
    };
  }
  function distance(a, b) {
    const x = (b[0] - a[0]) * RAD * Math.cos((a[1] + b[1]) / 2 * RAD), y = (b[1] - a[1]) * RAD;
    return Math.hypot(x, y) * R;
  }
  function bearing(a, b) {
    const x = (b[0] - a[0]) * Math.cos((a[1] + b[1]) / 2 * RAD), y = b[1] - a[1];
    return Math.atan2(x, y) / RAD;
  }
  // Axis-aligned box in a local frame → closed polygon ring.
  function box(to, a0, a1, c0, c1) {
    const ring = [to(a0, c0), to(a1, c0), to(a1, c1), to(a0, c1)];
    return [[...ring, ring[0]]];
  }
  const part = (polygon, base, height, color, name, extra = {}) => ({
    type: 'Feature', geometry: { type: 'Polygon', coordinates: polygon },
    properties: { base: +base.toFixed(2), height: +height.toFixed(2), color, part: name, ...extra },
  });

  // ---------- Golden Gate Bridge ----------
  // Dimensions: Golden Gate Bridge Highway & Transportation District, "Design & Construction Stats".
  // Tower positions: OpenStreetMap building:part centroids of the south and north towers (2026-10-13).
  const GOLDEN_GATE = {
    name: 'Golden Gate Bridge',
    dims: { mainSpan: 1280, sideSpan: 343, towerAboveWater: 227, clearance: 67, deckWidth: 27, cableDiameter: 0.92, suspenderSpacing: 15.24 },
    southTower: [-122.477889, 37.814014],
    northTower: [-122.479232, 37.825503],
    color: '#c0362c', // "International Orange", approximate sRGB
    sources: [
      'https://www.goldengate.org/bridge/history-research/statistics-data/design-construction-stats/',
      'https://www.openstreetmap.org/relation/21407754',
    ],
  };

  function goldenGate(opts = {}) {
    const G = GOLDEN_GATE, d = G.dims;
    const cableWidth = opts.cableWidth || 3.2;     // drawn ~3.5× real diameter for legibility (documented)
    const suspenderWidth = opts.suspenderWidth || 1.1;
    const step = opts.cableStep || 8;
    const to = frame(G.southTower, bearing(G.southTower, G.northTower));
    const measured = distance(G.southTower, G.northTower);
    const s = measured / d.mainSpan;                // keep both towers on their OSM positions
    const A0 = -d.sideSpan * s, T1 = 0, T2 = d.mainSpan * s, A1 = T2 + d.sideSpan * s;
    const deckTop = d.clearance, deckBase = deckTop - 7.6, half = d.deckWidth / 2;
    const cableTop = d.towerAboveWater - 4, cableLow = deckTop + 4, anchorZ = deckTop + 2;
    const cableZ = a => {
      if (a <= T1) { const u = (a - A0) / (T1 - A0); return anchorZ + (cableTop - anchorZ) * u - 18 * Math.sin(Math.PI * u); }
      if (a >= T2) { const u = (A1 - a) / (A1 - T2); return anchorZ + (cableTop - anchorZ) * u - 18 * Math.sin(Math.PI * u); }
      const u = (a - T1) / (T2 - T1); return cableLow + (cableTop - cableLow) * (2 * u - 1) ** 2;
    };
    const f = [], C = G.color, meta = { model: 'procedural', landmark: 'golden-gate' };

    // Deck (stiffening truss + roadway) and anchorages
    f.push(part(box(to, A0, A1, -half, half), deckBase, deckTop, C, 'deck', meta));
    for (const [a0, a1] of [[A0 - 60, A0], [A1, A1 + 60]]) f.push(part(box(to, a0, a1, -half - 8, half + 8), 0, anchorZ + 6, '#8d939b', 'anchorage', meta));

    // Towers: two legs stepping in, portal struts, pier base
    const legX = half + 3.5;
    for (const t of [T1, T2]) {
      f.push(part(box(to, t - 24, t + 24, -legX - 14, legX + 14), 0, 14, '#8d939b', 'pier', meta));
      for (const side of [-1, 1]) {
        const c = side * legX;
        f.push(part(box(to, t - 6, t + 6, c - 5.5, c + 5.5), 14, 120, C, 'tower-leg', meta));
        f.push(part(box(to, t - 5, t + 5, c - 4.5, c + 4.5), 120, d.towerAboveWater, C, 'tower-leg', meta));
      }
      for (const [z0, z1] of [[44, 52], [118, 125], [158, 164], [194, 200], [d.towerAboveWater - 10, d.towerAboveWater]])
        f.push(part(box(to, t - 3.5, t + 3.5, -legX, legX), z0, z1, C, 'tower-strut', meta));
    }

    // Main cables: stepped segments whose vertical extent spans the curve over each step (continuous silhouette)
    for (const side of [-1, 1]) {
      const c = side * (half + 0.5);
      for (let a = A0; a < A1 - 1e-6; a += step) {
        const b = Math.min(a + step, A1), z0 = cableZ(a), z1 = cableZ(b);
        f.push(part(box(to, a, b, c - cableWidth / 2, c + cableWidth / 2), Math.min(z0, z1) - cableWidth / 2, Math.max(z0, z1) + cableWidth / 2, C, 'main-cable', meta));
      }
      // Vertical suspenders at the published 50 ft spacing, from deck to cable
      for (const [from, toA] of [[A0, T1], [T1, T2], [T2, A1]]) {
        const n = Math.floor((toA - from) / (d.suspenderSpacing * s));
        for (let i = 1; i < n; i++) {
          const a = from + i * (toA - from) / n, top = cableZ(a);
          if (top - deckTop < 2) continue;
          f.push(part(box(to, a - suspenderWidth / 2, a + suspenderWidth / 2, c - suspenderWidth / 2, c + suspenderWidth / 2), deckTop, top, C, 'suspender', meta));
        }
      }
    }
    return { type: 'FeatureCollection', features: f, properties: { measuredTowerSpacing: measured, scale: s } };
  }

  // ---------- Other landmarks ----------
  // Footprints from OpenStreetMap (ODbL); heights from OSM tags. Silhouettes are procedural approximations.
  const TRANSAMERICA_FOOTPRINT = [[-122.4031399, 37.7953705], [-122.4030423, 37.7948854], [-122.4024317, 37.7949621], [-122.4025293, 37.7954472], [-122.4031399, 37.7953705]];
  const SALESFORCE_CENTER = [-122.3969188, 37.7897747];

  const centroid = ring => { const pts = ring.slice(0, -1); return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]; };
  const scaleRing = (ring, c, k) => ring.map(p => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]);
  function circle(c, radius, n = 28) {
    const to = frame(c, 0), ring = [];
    for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n; ring.push(to(radius * Math.cos(t), radius * Math.sin(t))); }
    return [[...ring, ring[0]]];
  }
  // Rounded square (Salesforce Tower plan, approximate)
  function roundedSquare(c, halfSide, radius, n = 6) {
    const to = frame(c, 0), ring = [], k = halfSide - radius; // frame(c, 0): along = north, across = east
    for (const [ex, ny, a0] of [[k, k, 0], [-k, k, 90], [-k, -k, 180], [k, -k, 270]])
      for (let i = 0; i <= n; i++) { const t = (a0 + 90 * i / n) * RAD; ring.push(to(ny + radius * Math.sin(t), ex + radius * Math.cos(t))); }
    return [[...ring, ring[0]]];
  }

  function transamerica() {
    const c = centroid(TRANSAMERICA_FOOTPRINT), f = [], meta = { model: 'procedural', landmark: 'transamerica' };
    const occupied = 212, total = 260, tiers = 18;
    for (let i = 0; i < tiers; i++) {
      const z0 = occupied * i / tiers, z1 = occupied * (i + 1) / tiers, k = 1 - 0.78 * (i + 0.5) / tiers;
      f.push(part([scaleRing(TRANSAMERICA_FOOTPRINT, c, k)], z0, z1, '#d9dde2', 'pyramid', meta));
    }
    for (let i = 0; i < 6; i++) { // spire
      const z0 = occupied + (total - occupied) * i / 6, z1 = occupied + (total - occupied) * (i + 1) / 6;
      f.push(part([scaleRing(TRANSAMERICA_FOOTPRINT, c, 0.2 * (1 - i / 6) + 0.01)], z0, z1, '#e8ebee', 'spire', meta));
    }
    return f;
  }

  function salesforce() {
    const f = [], meta = { model: 'procedural', landmark: 'salesforce' };
    const tiers = [[0, 200, 1.0], [200, 250, 0.97], [250, 280, 0.93], [280, 300, 0.89], [300, 326, 0.84]];
    for (const [z0, z1, k] of tiers) f.push(part(roundedSquare(SALESFORCE_CENTER, 27 * k, 9 * k), z0, z1, z1 > 300 ? '#9fb7c9' : '#c9d6df', z1 > 300 ? 'crown' : 'shaft', meta));
    return f;
  }

  const LANDMARKS = [
    { id: 'golden-gate', name: 'Golden Gate Bridge', center: [-122.4786, 37.8197], model: 'procedural', height: 227,
      provenance: 'Modèle procédural CORE : dimensions publiées (GGBHTD) + positions des pylônes OSM. Câbles épaissis pour la lisibilité.', sources: GOLDEN_GATE.sources },
    { id: 'salesforce', name: 'Salesforce Tower', center: SALESFORCE_CENTER, model: 'procedural', height: 326, osmId: 431972186,
      provenance: 'Silhouette procédurale (plan arrondi, couronne) à la position OSM ; hauteur OSM 326 m.', sources: ['https://www.openstreetmap.org/way/431972186'] },
    { id: 'transamerica', name: 'Transamerica Pyramid', center: centroid(TRANSAMERICA_FOOTPRINT), model: 'procedural', height: 260, osmId: 24222973,
      provenance: 'Pyramide procédurale sur l’emprise OSM ; hauteur OSM 260 m, toit pyramidal.', sources: ['https://www.openstreetmap.org/way/24222973'] },
    { id: 'ferry-building', name: 'Ferry Building', center: [-122.3935, 37.7955], model: 'osm', height: 83,
      provenance: 'Géométrie OpenStreetMap (parties de bâtiment cartographiées, tour de l’horloge). Non relevée par CORE.', sources: ['https://www.openstreetmap.org/way/558731934'] },
    { id: 'coit', name: 'Coit Tower', center: [-122.4058, 37.8024], model: 'osm', height: 64,
      provenance: 'Géométrie et hauteur OpenStreetMap (64 m). Colline non relevée sans relief 3D.', sources: ['https://www.openstreetmap.org/way/28824850'] },
    { id: 'city-hall', name: 'San Francisco City Hall', center: [-122.4193, 37.7793], model: 'osm', height: 30,
      provenance: 'Géométrie OpenStreetMap (parties de bâtiment). Le dôme dépend de la cartographie OSM disponible.', sources: ['https://www.openstreetmap.org/relation/7261820'] },
  ];

  function landmarkModels() {
    const gg = goldenGate();
    return { type: 'FeatureCollection', features: [...gg.features, ...transamerica(), ...salesforce()] };
  }

  // OSM building features replaced by procedural models are detected at runtime inside these zones
  // (OpenMapTiles feature ids do not follow one fixed OSM-id encoding). Criteria keep nearby unrelated
  // low buildings such as Fort Point (base 0 m, 15 m high).
  function replacementZones() {
    const G = GOLDEN_GATE, d = G.dims, to = frame(G.southTower, bearing(G.southTower, G.northTower));
    const s = distance(G.southTower, G.northTower) / d.mainSpan;
    return [
      { landmark: 'golden-gate', ring: box(to, -d.sideSpan * s - 70, (d.mainSpan + d.sideSpan) * s + 70, -45, 45)[0], test: p => (+p.render_min_height || 0) >= 5 || (+p.render_height || 0) >= 20 },
      { landmark: 'transamerica', ring: circle(centroid(TRANSAMERICA_FOOTPRINT), 45)[0], test: p => (+p.render_height || 0) >= 60 },
      { landmark: 'salesforce', ring: circle(SALESFORCE_CENTER, 45)[0], test: p => (+p.render_height || 0) >= 100 },
    ];
  }
  function inRing(pt, ring) { // ray casting
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // Returns the zone a building feature belongs to (by its first-ring centroid), or null.
  function replacedBy(feature, zones) {
    const g = feature.geometry; if (!g) return null;
    const ring = g.type === 'Polygon' ? g.coordinates[0] : g.type === 'MultiPolygon' ? g.coordinates[0][0] : null;
    if (!ring || ring.length < 3) return null;
    const c = [ring.reduce((a, p) => a + p[0], 0) / ring.length, ring.reduce((a, p) => a + p[1], 0) / ring.length];
    return zones.find(z => inRing(c, z.ring) && z.test(feature.properties || {})) || null;
  }

  // Indicative navigation targets (not survey points).
  const PLACES = [
    { id: 'sf', name: 'San Francisco', aliases: ['san francisco', 'sf'], view: { center: [-122.4005, 37.7880], zoom: 14.1, pitch: 66, bearing: -28 } },
    { id: 'pilot', name: 'Pilote Folsom / Howard', aliases: ['folsom', 'howard', 'soma', 'pilote', 'pilot'], view: { center: [-122.4058, 37.7792], zoom: 14.75, pitch: 52, bearing: -44 } },
    { id: 'golden-gate', name: 'Golden Gate Bridge', aliases: ['golden gate', 'golden gate bridge', 'pont'], view: { center: [-122.4772, 37.8185], zoom: 14.05, pitch: 64, bearing: -58 } },
    { id: 'fidi', name: 'Financial District', aliases: ['financial district', 'fidi', 'downtown', 'transamerica', 'salesforce'], view: { center: [-122.3990, 37.7920], zoom: 15.3, pitch: 62, bearing: -52 } },
    { id: 'embarcadero', name: 'Embarcadero · Ferry Building', aliases: ['embarcadero', 'ferry building', 'ferry'], view: { center: [-122.3925, 37.7960], zoom: 16.2, pitch: 60, bearing: -110 } },
    { id: 'north-beach', name: 'North Beach · Coit Tower', aliases: ['north beach', 'coit', 'coit tower', 'telegraph hill'], view: { center: [-122.4065, 37.8010], zoom: 16, pitch: 58, bearing: 10 } },
    { id: 'civic-center', name: 'Civic Center · City Hall', aliases: ['civic center', 'city hall', 'hotel de ville'], view: { center: [-122.4185, 37.7785], zoom: 16.4, pitch: 55, bearing: 15 } },
    { id: 'mission', name: 'Mission', aliases: ['mission', 'mission district'], view: { center: [-122.4170, 37.7600], zoom: 14.8, pitch: 50, bearing: 0 } },
    { id: 'twin-peaks', name: 'Twin Peaks', aliases: ['twin peaks'], view: { center: [-122.4470, 37.7530], zoom: 13.8, pitch: 60, bearing: 70 } },
    { id: 'presidio', name: 'Presidio', aliases: ['presidio'], view: { center: [-122.4660, 37.7990], zoom: 14, pitch: 55, bearing: -20 } },
    { id: 'gg-park', name: 'Golden Gate Park', aliases: ['golden gate park', 'park'], view: { center: [-122.4700, 37.7690], zoom: 13.8, pitch: 50, bearing: 0 } },
  ];

  const W = { OSM, GOLDEN_GATE, LANDMARKS, PLACES, frame, distance, bearing, goldenGate, transamerica, salesforce, landmarkModels, replacementZones, inRing, replacedBy };
  if (typeof module !== 'undefined' && module.exports) module.exports = W; else root.CORE_SF_WORLD = W;
})(typeof globalThis !== 'undefined' ? globalThis : this);
