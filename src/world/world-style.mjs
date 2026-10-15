// CORE World — map style: CORE's holographic Earth (same colours and sources as index.html) plus the "reveal" layers
// that show the realistic appearance around a human avatar. Rendering never changes data: the realistic look is a
// paint state driven by distance to the avatar, over the same OpenStreetMap geometry and the same CORE records.
// Keep the holographic part in sync with index.html until the two pages share one style module (design debt, DESIGN.md).
export const COLORS = { CYAN: '#78e8ff', CYAN_DIM: '#2f8fb8', VOID: '#02050b', LAND: '#10233a', SEA: '#02070f' };
const { CYAN, CYAN_DIM, VOID, LAND, SEA } = COLORS;
const name = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name'], ''];
const roadW = k => ['interpolate', ['exponential', 1.6], ['zoom'], 5, 0.3 * k, 12, 1 * k, 16, 4 * k, 19, 14 * k, 22, 110 * k];
// Zoom must stay the top-level input; the class factor lives inside each stop.
const CLASS_K = ['case', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]], 1.3, ['in', ['get', 'class'], ['literal', ['path', 'track', 'service']]], 0.45, 1];
const roadByClass = k => ['interpolate', ['exponential', 1.6], ['zoom'], 12, ['*', 1 * k, CLASS_K], 16, ['*', 4 * k, CLASS_K], 19, ['*', 14 * k, CLASS_K], 22, ['*', 110 * k, CLASS_K]];
const MAJOR = ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false];
const H = ['max', 0, ['number', ['get', 'render_height'], 8]];
const HOLO = ['interpolate', ['linear'], H, 0, '#1a2b40', 15, '#203a57', 40, '#285b80', 100, '#378bb7', 180, '#6cc6e8', 260, '#bdeeff'];
// Realistic material palette: neutral façade tones (stone, brick, concrete, painted stucco), varied by feature id.
// It is a material convention, not the real colour of each building (no facade imagery is used).
const REAL = ['match', ['%', ['coalesce', ['id'], 0], 5], 0, '#b9b2a6', 1, '#a2685a', 2, '#c9c4bb', 3, '#8f8b85', '#d8cdb8'];
const REVEAL = ['coalesce', ['feature-state', 'reveal'], 0];
const EMPTY = { type: 'FeatureCollection', features: [] };

export function worldStyle({ trees = EMPTY, sidewalks = EMPTY, problem = EMPTY } = {}) {
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      reveal: { type: 'geojson', data: EMPTY },
      trees: { type: 'geojson', data: trees },
      sidewalks: { type: 'geojson', data: sidewalks },
      problem: { type: 'geojson', data: problem },
    },
    sky: { 'sky-color': '#03122a', 'horizon-color': '#0a3a66', 'fog-color': '#020611', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.1, 'fog-ground-blend': 0, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.22, 5, 0.15, 8, 0] },
    light: { anchor: 'map', position: [1.4, 210, 35], color: '#dcecff', intensity: 0.45 },
    layers: [
      { id: 'void', type: 'background', paint: { 'background-color': LAND } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'farmland']]], paint: { 'fill-color': '#0d2b28', 'fill-opacity': 0.7 } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': SEA } },
      { id: 'parks-city', type: 'fill', source: 'omt', 'source-layer': 'park', minzoom: 11, paint: { 'fill-color': '#123a2f', 'fill-opacity': 0.55 } },
      { id: 'coast', type: 'line', source: 'omt', 'source-layer': 'water', paint: { 'line-color': CYAN, 'line-opacity': 0.35, 'line-width': 1.2 } },
      // Realistic ground inside the radius (pavement tone), drawn under roads and buildings.
      { id: 'reveal-ground', type: 'fill', source: 'reveal', filter: ['==', ['get', 'part'], 'disc'], paint: { 'fill-color': '#6d6a66', 'fill-opacity': 0.92 } },
      { id: 'road-glow', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['!=', ['get', 'class'], 'rail'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': CYAN, 'line-opacity': ['case', MAJOR, 0.1, 0], 'line-blur': 4, 'line-width': roadW(2.4) } },
      { id: 'road', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['!=', ['get', 'class'], 'rail'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['case', MAJOR, '#5fcfee', CYAN_DIM], 'line-opacity': ['case', MAJOR, 0.7, 0.38], 'line-width': roadW(0.9) } },
      // Realistic asphalt for road features within the radius (filter updated as the avatar moves).
      { id: 'reveal-road', type: 'line', source: 'reveal', filter: ['==', ['get', 'part'], 'road'], layout: { 'line-cap': 'butt', 'line-join': 'round' }, paint: { 'line-color': '#34373b', 'line-width': roadByClass(0.9) } },
      { id: 'reveal-marking', type: 'line', source: 'reveal', filter: ['all', ['==', ['get', 'part'], 'road'], ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'minor']]]], paint: { 'line-color': '#e9e4d6', 'line-width': 1.2, 'line-dasharray': [4, 6] } },
      // CORE corridor sidewalk records (DataSF 2014 study) are stored on the street centreline, so they stay a data trace:
      // drawing them as pavement would invent their position.
      { id: 'sidewalk-holo', type: 'line', source: 'sidewalks', paint: { 'line-color': CYAN, 'line-opacity': 0.35, 'line-width': 1.5, 'line-dasharray': [2, 2] } },
      { id: 'problem-line', type: 'line', source: 'problem', paint: { 'line-color': '#ffb84d', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 3, 20, 10], 'line-opacity': 0.9 } },
      { id: 'footprint', type: 'line', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'line-color': CYAN, 'line-opacity': 0.22, 'line-width': 0.6 } },
      { id: 'building', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 13, paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], REVEAL, 0, HOLO, 1, REAL],
        'fill-extrusion-height': H, 'fill-extrusion-base': ['min', H, ['max', 0, ['number', ['get', 'render_min_height'], 0]]],
        'fill-extrusion-opacity': 0.92, 'fill-extrusion-vertical-gradient': true } },
      // Street trees (SF inventory): canopy discs inside the radius (size is a display convention), cyan points outside.
      { id: 'tree-holo', type: 'circle', source: 'trees', minzoom: 15, filter: ['!=', ['get', 'near'], true], paint: { 'circle-color': '#7ee787', 'circle-opacity': 0.55, 'circle-radius': 2.2 } },
      { id: 'tree-real', type: 'circle', source: 'trees', filter: ['==', ['get', 'near'], true], paint: { 'circle-color': '#3f6b35', 'circle-stroke-color': '#2c4a26', 'circle-stroke-width': 2, 'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 17, 6, 22, 190], 'circle-pitch-alignment': 'map', 'circle-opacity': 0.95 } },
      // Transition band: a soft holographic ring where reality fades back into the CORE world.
      { id: 'reveal-band', type: 'line', source: 'reveal', filter: ['==', ['get', 'part'], 'band'], paint: { 'line-color': CYAN, 'line-width': ['interpolate', ['exponential', 2], ['zoom'], 16, 3, 22, 60], 'line-blur': ['interpolate', ['exponential', 2], ['zoom'], 16, 3, 22, 50], 'line-opacity': 0.55 } },
      { id: 'street-name', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 15, layout: { 'symbol-placement': 'line', 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'symbol-spacing': 420, 'text-padding': 6 }, paint: { 'text-color': '#8fd8f0', 'text-halo-color': VOID, 'text-halo-width': 1.5 } },
    ],
  };
}
