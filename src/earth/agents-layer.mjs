// CORE World V7.2 — Agent Earth overlay. The same geography in three modes:
//  • real    — the V7 Living Earth, unchanged;
//  • agents  — the computational layer: the base map is restyled as a hologram and the civilisation becomes visible
//              (agents, team hubs, collaboration links, mission zones, the planet-scale network);
//  • hybrid  — the real Earth with the agents on top.
// Positions and states come only from the civilisation runtime (src/civilization/runtime.mjs).
import { T, translate } from '../i18n/i18n.mjs';
const EMPTY = { type: 'FeatureCollection', features: [] };
export const STATE_COLORS = { working: '#62d8f2', inspecting: '#7fdcaa', meeting: '#b9a2ff', travelling: '#cfe8f5', reasoning: '#f29ad0', returning: '#7d93ab', idle: '#5f86ad' };
const STATE_EXPR = ['match', ['get', 'state'], ...Object.entries(STATE_COLORS).flat(), '#5f86ad'];
const Z = (...s) => ['interpolate', ['linear'], ['zoom'], ...s];
// Agent mode restyle: paint values swapped in agents mode and restored for real/hybrid.
const HOLO = {
  bg: ['background-color', '#020a16'], imagery: ['raster-saturation', -1], water: ['fill-color', '#04182c'], landcover: ['fill-opacity', 0.12], park: ['fill-opacity', 0.12],
  'road-case': ['line-color', '#071a2c'], road: ['line-color', '#1e5a7d'], building: ['fill-extrusion-color', '#123a5c'], 'road-lane': ['line-opacity', 0],
};
const arc = (a, b, n = 64) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, lng = a[0] + (b[0] - a[0]) * t, lat = a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * 6; return [lng, lat]; });

export function createAgentLayer(map, { runtime, onAgent, onHub, onNetwork, pos = null }) {
  const R = runtime, saved = {}; let mode = 'real', recorded = new Set();
  const sf = R.agents.filter(a => a.city === 'san-francisco' && a.post && !['council', 'assembly', 'global'].includes(a.level));
  map.addSource('civ-agents', { type: 'geojson', data: EMPTY });
  map.addSource('civ-links', { type: 'geojson', data: EMPTY });
  map.addSource('civ-hubs', { type: 'geojson', data: { type: 'FeatureCollection', features: R.agents.filter(a => a.level === 'team-lead' && a.post).map(a => ({ type: 'Feature', geometry: { type: 'Point', coordinates: a.post }, properties: { id: a.id, team: a.teamName || a.team, team_en: a.en?.teamName || a.teamName || a.team, dept: a.department } })) } });
  const nyc = [-73.985, 40.722], sfc = [-122.42, 37.765];
  map.addSource('civ-net', { type: 'geojson', data: { type: 'FeatureCollection', features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: sfc }, properties: { kind: 'city', status: 'active', label: `San Francisco · ${R.agents.filter(a => a.city === 'san-francisco').length} agents enregistrés`, label_en: `San Francisco · ${R.agents.filter(a => a.city === 'san-francisco').length} registered agents`, id: 'san-francisco' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: nyc }, properties: { kind: 'city', status: 'partial', label: 'New York · missions enregistrées (registre non chargé)', label_en: 'New York · recorded missions (registry not loaded)', id: 'new-york' } },
    { type: 'Feature', geometry: { type: 'LineString', coordinates: arc(sfc, nyc) }, properties: { kind: 'link', label: 'Enquête inter-villes enregistrée (Phase 10)', label_en: 'Recorded cross-city investigation (Phase 10)' } }] } });
  const before = map.getLayer('marker-halo') ? 'marker-halo' : undefined;
  const L = [
    { id: 'civ-net-link', type: 'line', source: 'civ-net', maxzoom: 8, filter: ['==', ['get', 'kind'], 'link'], paint: { 'line-color': '#9fb8ff', 'line-width': 1.6, 'line-dasharray': [2, 2], 'line-opacity': 0.8 } },
    { id: 'civ-net-glow', type: 'circle', source: 'civ-net', maxzoom: 9, filter: ['==', ['get', 'kind'], 'city'], paint: { 'circle-radius': ['case', ['==', ['get', 'status'], 'active'], 26, 12], 'circle-color': ['case', ['==', ['get', 'status'], 'active'], '#62d8f2', '#b9a2ff'], 'circle-opacity': 0.25, 'circle-blur': 0.7 } },
    { id: 'civ-net-city', type: 'circle', source: 'civ-net', maxzoom: 9, filter: ['==', ['get', 'kind'], 'city'], paint: { 'circle-radius': ['case', ['==', ['get', 'status'], 'active'], 9, 5], 'circle-color': ['case', ['==', ['get', 'status'], 'active'], '#62d8f2', 'transparent'], 'circle-stroke-color': ['case', ['==', ['get', 'status'], 'active'], '#e8fbff', '#b9a2ff'], 'circle-stroke-width': 2 } },
    { id: 'civ-net-label', type: 'symbol', source: 'civ-net', maxzoom: 9, filter: ['==', ['get', 'kind'], 'city'], layout: { 'text-field': ['get', 'label_en'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-offset': [0, 1.6], 'text-anchor': 'top' }, paint: { 'text-color': '#dff6ff', 'text-halo-color': '#020a16', 'text-halo-width': 1.4 } },
    { id: 'civ-links', type: 'line', source: 'civ-links', minzoom: 11, paint: { 'line-color': ['match', ['get', 'kind'], 'meeting', '#b9a2ff', '#62d8f2'], 'line-width': Z(11, 0.6, 17, 1.6), 'line-opacity': 0.55, 'line-dasharray': [1.5, 1.5] } },
    { id: 'civ-hubs', type: 'circle', source: 'civ-hubs', minzoom: 10.5, paint: { 'circle-radius': Z(11, 4, 16, 9), 'circle-color': 'transparent', 'circle-stroke-color': '#62d8f2', 'circle-stroke-width': 1.4, 'circle-stroke-opacity': 0.8 } },
    { id: 'civ-hubs-label', type: 'symbol', source: 'civ-hubs', minzoom: 13.5, maxzoom: 19, layout: { 'text-field': ['concat', 'Virtual hub · ', ['get', 'team_en']], 'text-font': ['Noto Sans Regular'], 'text-size': 10.5, 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-optional': true }, paint: { 'text-color': '#9fe7f8', 'text-halo-color': '#020a16', 'text-halo-width': 1.2 } },
    { id: 'civ-agents-glow', type: 'circle', source: 'civ-agents', minzoom: 9.5, filter: ['!=', ['get', 'state'], 'idle'], paint: { 'circle-radius': Z(10, 3, 15, 7, 18, 12), 'circle-color': STATE_EXPR, 'circle-opacity': 0.25, 'circle-blur': 0.8, 'circle-pitch-alignment': 'viewport' } },
    // Gold ring: identity with published recorded work (data/intelligence, data/urban, data/civ); motion stays a replay.
    { id: 'civ-agents-rec', type: 'circle', source: 'civ-agents', minzoom: 9.5, maxzoom: 19.2, filter: ['==', ['get', 'rec'], true], paint: { 'circle-radius': Z(10, 4, 13, 6, 15, 8, 17, 10), 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#f2d36b', 'circle-stroke-width': 1.6, 'circle-stroke-opacity': 0.9, 'circle-pitch-alignment': 'map' } },
    { id: 'civ-agents', type: 'circle', source: 'civ-agents', minzoom: 9.5, maxzoom: 19.2, paint: { 'circle-radius': Z(10, 2, 13, 3, 15, 4, 17, 5.5), 'circle-color': STATE_EXPR, 'circle-opacity': ['case', ['==', ['get', 'state'], 'idle'], 0.42, 1], 'circle-stroke-color': ['case', ['==', ['get', 'state'], 'idle'], '#8aa3bd', '#020a16'], 'circle-stroke-width': Z(13, 0, 15, 1), 'circle-pitch-alignment': 'viewport' } }, // idle: dimmed, outlined (inactive)
    { id: 'civ-agents-label', type: 'symbol', source: 'civ-agents', minzoom: 16.3, maxzoom: 19.2, filter: ['!=', ['get', 'state'], 'idle'], layout: { 'text-field': ['get', 'code'], 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true }, paint: { 'text-color': '#c9f3ff', 'text-halo-color': '#020a16', 'text-halo-width': 1.2 } },
  ];
  for (const l of L) map.addLayer({ ...l, layout: { ...(l.layout || {}), visibility: 'none' } }, before);
  const ids = L.map(l => l.id);
  map.on('click', 'civ-agents', e => { const f = e.features[0]; if (f) onAgent?.(f.properties.id); });
  map.on('click', 'civ-hubs', e => { const f = e.features[0]; if (f) onHub?.(f.properties.id); });
  map.on('click', 'civ-net-city', e => { const f = e.features[0]; if (f) onNetwork?.(f.properties.id); });
  for (const id of ['civ-agents', 'civ-hubs', 'civ-net-city']) { map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; }); map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; }); }

  function update() {
    if (mode === 'real') return;
    const feats = [], links = [], groups = new Map();
    for (const a of sf) {
      const p = (pos || R.posOf)(a.id), act = R.activity(a.id);
      feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: { id: a.id, code: a.code, state: act.state, rec: recorded.has(a.id) } });
      if (act.task && act.state !== 'travelling') { const k = `${act.mission}#${act.task}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
    }
    for (const [k, pts] of groups) if (pts.length > 1) for (let i = 1; i < pts.length; i++) links.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [pts[0], pts[i]] }, properties: { kind: k.includes('session') || k.includes('#frame') || k.includes('#dossier') ? 'meeting' : 'work' } });
    map.getSource('civ-agents')?.setData({ type: 'FeatureCollection', features: feats });
    map.getSource('civ-links')?.setData({ type: 'FeatureCollection', features: links });
  }
  function setMode(m) {
    mode = m;
    for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', m === 'real' ? 'none' : 'visible');
    for (const [layer, [prop, val]] of Object.entries(HOLO)) {
      if (!map.getLayer(layer)) continue;
      if (!(layer in saved)) saved[layer] = map.getPaintProperty(layer, prop);
      map.setPaintProperty(layer, prop, m === 'agents' ? val : saved[layer]);
    }
    update();
  }
  // Language of the map labels (English by default).
  // Other languages translate the English label of each feature (values read from the sources built above).
  const values = (src, prop) => [...new Set((map.getSource(src)?.serialize?.().data?.features || []).map(f => f.properties[prop]).filter(Boolean))];
  const local = (src, prop, code) => { const v = values(src, prop); return v.length ? ['match', ['get', prop], ...v.flatMap(x => [x, translate(x, code)]), ['get', prop]] : ['get', prop]; };
  function relabel(code) {
    if (map.getLayer('civ-hubs-label')) map.setLayoutProperty('civ-hubs-label', 'text-field', code === 'fr' ? ['concat', 'Pôle virtuel · ', ['get', 'team']] : ['concat', T('Virtual hub · ', 'Pôle virtuel · ', code), code === 'en' ? ['get', 'team_en'] : local('civ-hubs', 'team_en', code)]);
    if (map.getLayer('civ-net-label')) map.setLayoutProperty('civ-net-label', 'text-field', code === 'fr' ? ['get', 'label'] : code === 'en' ? ['get', 'label_en'] : local('civ-net', 'label_en', code));
  }
  function setRecorded(ids) { recorded = new Set(ids); update(); }
  return { setMode, update, relabel, setRecorded, get mode() { return mode; }, agents: sf };
}
