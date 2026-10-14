// CORE — map presentation layer (Phase 6): planetary coverage, marker density control, record density by segment,
// legend, hover states and layout-aware camera padding. Presentation only: no record is removed — every record stays
// inspectable at its visibility zoom and in the records panel; the coverage layer states exactly what is operational.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);

  // Operational coverage (Phase 10: src/cities.js) — San Francisco and New York study areas. Other cities are navigation
  // destinations without data or agents.
  const COVERAGE = [
    { name: 'San Francisco', status: 'operational', label: 'San Francisco\nPilote opérationnel', lon: -122.4194, lat: 37.7749 },
    { name: 'New York', status: 'operational', label: 'New York\nZone d’étude opérationnelle', lon: -73.9880, lat: 40.7195 },
    { name: 'Paris', status: 'navigation', label: 'Paris\nNavigation seulement', lon: 2.3522, lat: 48.8566 },
    { name: 'Tokyo', status: 'navigation', label: 'Tokyo\nNavigation seulement', lon: 139.6917, lat: 35.6895 },
  ];
  // Marker density: [minzoom, radius at z13, radius at z17, extra paint]. Values only change presentation.
  const TUNE = {
    'sf-permits': [14.5, 2, 5.5, { 'circle-stroke-width': 0.6 }], 'sf-large': [14, 3.5, 8, { 'circle-stroke-width': 1.6 }],
    'sf-moratoria-point': [15, 2.5, 6, { 'circle-stroke-width': 1.5 }], 'sf-closures-point': [14.5, 3, 6, {}], 'sf-intersections': [16, 2, 2.5, {}],
    'city-trees': [15.5, 1.4, 3.6, { 'circle-opacity': 0.75 }], 'city-removals': [15, 3, 7, { 'circle-stroke-width': 1.6 }],
    'city-energy': [14.5, 2.5, 6, {}], 'city-bp': [14.5, 2.5, 6, {}], 'city-parks': [12, 5, 16, { 'circle-stroke-width': 1.2 }],
  };
  const LEGEND = [
    ['line', '#78e8ff', 'Corridor Folsom / Howard (44 tronçons)', 'toujours'],
    ['line', 'linear-gradient(90deg,#2f6f8f,#ffb84d)', 'Densité de registres par tronçon', 'zoom < 14,5'],
    ['dot', '#ffb84d', 'Permis de voirie (DataSF)', 'zoom ≥ 14,5'],
    ['ring', '#ffd38a', 'Grandes excavations', 'zoom ≥ 14'],
    ['ring', '#7ee0a0', 'Moratoires de chaussée', 'zoom ≥ 15'],
    ['dot', '#ff5cd6', 'Fermetures temporaires (SFMTA)', 'zoom ≥ 14,5'],
    ['dot', '#7ee0a0', 'Arbres d’alignement (inventaire)', 'zoom ≥ 15,5'],
    ['ring', '#ff7b7b', 'Avis d’abattage', 'zoom ≥ 15'],
    ['dot', '#ffd38a', 'Permis de construire (groupés < 16)', 'zoom ≥ 13'],
    ['line', '#3fb950', 'Simulation : plantable / à reporter / insuffisant', 'vue Simulations'],
  ];
  const S = { map: null, tuned: new Set(), density: false };

  function coverage(map) {
    if (map.getSource('core-coverage')) return;
    map.addSource('core-coverage', { type: 'geojson', data: { type: 'FeatureCollection', features: COVERAGE.map(c => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lon, c.lat] }, properties: c })) } });
    map.addLayer({ id: 'cov-halo', type: 'circle', source: 'core-coverage', maxzoom: 9, filter: ['==', ['get', 'status'], 'operational'], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 14, 8, 30], 'circle-color': '#78e8ff', 'circle-opacity': 0.16, 'circle-blur': 0.6 } });
    map.addLayer({ id: 'cov-dot', type: 'circle', source: 'core-coverage', maxzoom: 9, paint: { 'circle-radius': ['match', ['get', 'status'], 'operational', 5, 3], 'circle-color': ['match', ['get', 'status'], 'operational', '#78e8ff', '#5b6b7b'], 'circle-stroke-color': '#02050b', 'circle-stroke-width': 1.5 } });
    map.addLayer({ id: 'cov-label', type: 'symbol', source: 'core-coverage', maxzoom: 9, layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': ['match', ['get', 'status'], 'operational', 12.5, 10.5], 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-allow-overlap': true }, paint: { 'text-color': ['match', ['get', 'status'], 'operational', '#bfefff', '#7d8b99'], 'text-halo-color': '#02050b', 'text-halo-width': 1.4 } });
  }
  function tune(map) {
    for (const [id, [minz, r0, r1, extra]] of Object.entries(TUNE)) {
      if (S.tuned.has(id) || !map.getLayer(id)) continue;
      map.setLayerZoomRange(id, minz, 24);
      map.setPaintProperty(id, 'circle-radius', ['interpolate', ['linear'], ['zoom'], 13, r0, 17, r1]);
      for (const [k, v] of Object.entries(extra)) map.setPaintProperty(id, k, v);
      S.tuned.add(id);
      map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; }); map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
    }
    if (map.getLayer('city-bp-cluster') && !S.tuned.has('city-bp-cluster')) { map.setPaintProperty('city-bp-cluster', 'circle-radius', ['step', ['get', 'point_count'], 8, 10, 11, 30, 14]); map.setPaintProperty('city-bp-cluster', 'circle-stroke-width', 1); map.setPaintProperty('city-bp-cluster', 'circle-color', 'rgba(255,211,138,0.16)'); S.tuned.add('city-bp-cluster'); }
  }
  // Record density per corridor segment (counts of the records each segment holds, by CNN). Shown when individual
  // markers are hidden, so the corridor never looks empty and no symbol overlaps at low zoom.
  function density(map) {
    const sv = G.CORE_SF_VIEW; if (S.density || !sv || !sv.state.data || !map.getSource('sf-corridor')) return;
    const d = sv.state.data, count = new Map();
    for (const k of ['permits', 'large-excavations', 'moratoria', 'closures']) for (const f of (d[k] || { features: [] }).features) { const c = String(parseInt(f.properties.cnn, 10)); count.set(c, (count.get(c) || 0) + 1); }
    const feats = d.corridor.features.map(f => ({ type: 'Feature', geometry: f.geometry, properties: { cnn: f.properties.cnn, records: count.get(String(parseInt(f.properties.cnn, 10))) || 0 } }));
    map.addSource('core-density', { type: 'geojson', data: { type: 'FeatureCollection', features: feats } });
    map.addLayer({ id: 'core-density', type: 'line', source: 'core-density', minzoom: 10, maxzoom: 14.5, layout: { 'line-cap': 'round' }, paint: {
      'line-width': ['interpolate', ['linear'], ['get', 'records'], 0, 3, 10, 6, 40, 11], 'line-opacity': 0.85,
      'line-color': ['interpolate', ['linear'], ['get', 'records'], 0, '#2f6f8f', 10, '#c98f3a', 40, '#ffb84d'] } }, map.getLayer('sf-corridor') ? 'sf-corridor' : undefined);
    S.density = true; S.densityMax = Math.max(...feats.map(f => f.properties.records));
    legend();
  }
  function legend() {
    const el = $('map-legend'); if (!el) return;
    const sw = ([kind, color]) => `<i class="${kind === 'line' ? 'line' : ''}" style="background:${kind === 'ring' ? 'transparent' : color};${kind === 'ring' ? `border:2px solid ${color};` : ''}"></i>`;
    el.innerHTML = `<b>Légende</b><ul>${LEGEND.map(l => `<li>${sw(l)}<span>${l[2]} <small>${l[3]}</small></span></li>`).join('')}</ul><p class="hint">Les symboles apparaissent selon le zoom pour éviter les superpositions ; chaque registre reste inspectable (clic) et listé dans le panneau des registres.${S.density ? ` Densité max. : ${S.densityMax} registres sur un tronçon.` : ''}</p>`;
  }

  // Layout-aware camera: the focus point stays in the visible part of the map when an inspector is open.
  const panelOpen = () => ['ws', 'sf-panel'].some(id => $(id) && !$(id).hidden);
  const LAYOUT = {
    padding() { const w = innerWidth; if (w <= 640) return { top: 0, bottom: panelOpen() ? Math.round(innerHeight * 0.5) : 0, left: 0, right: 0 }; return { top: 0, bottom: 0, left: 0, right: panelOpen() ? Math.min(420, w - 32) + 24 : 0 }; },
  };
  function watchPanels(map) {
    let last = JSON.stringify(LAYOUT.padding());
    // Never interrupt a camera flight: when the map is moving, apply the new padding once it stops.
    const sync = () => { const p = LAYOUT.padding(), k = JSON.stringify(p); if (k === last) return; if (map.isMoving()) { map.once('moveend', sync); return; } last = k; map.easeTo({ padding: p, duration: S.reduced ? 0 : 500 }); };
    const mo = new MutationObserver(sync); for (const id of ['ws', 'sf-panel']) if ($(id)) mo.observe($(id), { attributes: true, attributeFilter: ['hidden'] });
    addEventListener('resize', sync);
  }

  function init({ map, reduced }) {
    S.map = map; S.reduced = reduced;
    coverage(map); legend(); watchPanels(map);
    // The compact attribution starts collapsed (its ⓘ button still opens all credits).
    map.once('idle', () => { const a = document.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact'); if (a) a.classList.remove('maplibregl-compact-show'); });
    const tick = () => { tune(map); density(map); if (G.CORE_PLATFORM && G.CORE_PLATFORM.simEnforce) G.CORE_PLATFORM.simEnforce(); };
    map.on('idle', tick); map.on('sourcedata', e => { if (e.isSourceLoaded) tick(); });
  }
  G.CORE_LAYOUT = LAYOUT;
  G.CORE_MAPSTYLE = { init, state: S, COVERAGE, TUNE };
})();
