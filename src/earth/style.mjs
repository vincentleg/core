// CORE Living Earth — map style (V7). One continuous style from planet to street:
//  • planet: globe projection, NASA GIBS Blue Marble imagery (public domain, NASA open data policy) and atmosphere;
//  • region: real relief from public-domain elevation (USGS 3DEP/SRTM via the AWS Terrain Tiles open dataset);
//  • city: OpenStreetMap vector tiles (OpenFreeMap, ODbL data) as a calm midnight model with lit architecture;
//  • street: neutral pavement and asphalt; detailed buildings, trees and people are drawn by the 3D layer (scene3d.mjs).
// The holographic data layer (problems, corridor) sits on top of real geography; it never replaces it.
// Sources, terms and attribution: docs/v7/TOOLING_AND_COSTS.md and docs/DATA_SOURCES.md.
export const HOSTS = ['https://tiles.openfreemap.org', 'https://gibs.earthdata.nasa.gov', 'https://s3.amazonaws.com'];
export const STATUS_COLORS = { observed: '#62d8f2', 'potential-risk': '#f0b45c', hypothesis: '#b9a2ff', simulated: '#93a5bd' };
const EMPTY = { type: 'FeatureCollection', features: [] };
const Z = (...stops) => ['interpolate', ['linear'], ['zoom'], ...stops];
const ZE = (...stops) => ['interpolate', ['exponential', 1.6], ['zoom'], ...stops];
const name = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name'], ''];
const H = ['max', 0, ['number', ['get', 'render_height'], 8]];
const HMIN = ['min', H, ['max', 0, ['number', ['get', 'render_min_height'], 0]]];
const MAJOR = ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false];
const MID = ['match', ['get', 'class'], ['secondary', 'tertiary'], true, false];
// Façade tones: a material convention (limestone, sandstone, concrete, brick, glass-tint), varied by id — not each
// building's real colour (no façade imagery is used).
const STONE = ['match', ['%', ['coalesce', ['id'], 0], 6], 0, '#d9cdb8', 1, '#c4b49b', 2, '#b9b4ab', 3, '#a8786a', 4, '#cfc6b6', '#9fa7ad'];
const NIGHT = '#1f3d60';
const STATUS = ['match', ['get', 'status'], 'observed', STATUS_COLORS.observed, 'potential-risk', STATUS_COLORS['potential-risk'], 'hypothesis', STATUS_COLORS.hypothesis, STATUS_COLORS.simulated];

export function livingEarthStyle({ markers = EMPTY, corridor = EMPTY, focus = EMPTY, terrain = true } = {}) {
  const style = {
    version: 8,
    projection: { type: Z(9, 'vertical-perspective', 11, 'mercator') },
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sky: {
      'sky-color': '#0a2a52', 'horizon-color': '#9cc3e0', 'fog-color': '#aac6dc', 'sky-horizon-blend': 0.55, 'horizon-fog-blend': 0.7, 'fog-ground-blend': Z(12, 0.85, 17, 0.35),
      'atmosphere-blend': Z(0, 1, 6, 0.9, 9, 0),
    },
    light: { anchor: 'map', position: [1.35, 235, 38], color: '#fff2e0', intensity: 0.42 },
    ...(terrain ? { terrain: { source: 'dem', exaggeration: 1 } } : {}),
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      bluemarble: { type: 'raster', tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'], tileSize: 256, maxzoom: 8, attribution: 'NASA GIBS (Blue Marble imagery)' },
      dem: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 12, attribution: 'USGS 3DEP/SRTM (relief) via AWS Terrain Tiles' },
      markers: { type: 'geojson', data: markers }, corridor: { type: 'geojson', data: corridor }, focus: { type: 'geojson', data: focus },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': Z(5, '#0b1f36', 11, '#0e1d31', 15, '#1a2638', 17, '#5d5c59', 18.5, '#8f8b84') } },
      { id: 'imagery', type: 'raster', source: 'bluemarble', maxzoom: 11, paint: { 'raster-opacity': Z(7, 1, 10.5, 0), 'raster-saturation': -0.15, 'raster-contrast': 0.08, 'raster-brightness-max': 0.92, 'raster-fade-duration': 200 } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', minzoom: 7, paint: { 'fill-color': Z(8, '#0a2742', 14, '#0b2c4a', 18, '#163f5e'), 'fill-opacity': Z(7, 0, 9, 1) } },
      { id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover', minzoom: 8, filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'farmland', 'scrub']]], paint: { 'fill-color': Z(10, '#14352f', 17, '#4d6b45'), 'fill-opacity': Z(8, 0, 10, 0.55, 17, 0.85) } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', minzoom: 10, filter: ['in', ['get', 'class'], ['literal', ['park', 'nature_reserve', 'national_park', 'garden']]], paint: { 'fill-color': Z(11, '#173c33', 17, '#4b6b44'), 'fill-opacity': 0.75 } },
      { id: 'hillshade', type: 'hillshade', source: 'dem', minzoom: 7, maxzoom: 16, paint: { 'hillshade-shadow-color': '#04101e', 'hillshade-highlight-color': '#5d86a6', 'hillshade-accent-color': '#0b2038', 'hillshade-exaggeration': Z(8, 0.6, 14, 0.35, 16, 0.1), 'hillshade-illumination-direction': 315 } },
      { id: 'road-case', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: ['!=', ['get', 'class'], 'rail'], layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': Z(14, '#0e1a2b', 17, '#5b5d60'), 'line-width': ZE(12, ['case', MAJOR, 2, 0.8], 16, ['case', MAJOR, 10, MID, 8, 4.5], 19, ['case', MAJOR, 42, MID, 34, 20], 22, ['case', MAJOR, 330, MID, 260, 150]) } },
      { id: 'road', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 9, filter: ['!=', ['get', 'class'], 'rail'], layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': Z(11, ['case', MAJOR, '#3f6a93', '#26496d'], 15, ['case', MAJOR, '#45658a', '#2f4a68'], 17, '#2c2f34'), 'line-opacity': Z(9, 0.6, 12, 0.95),
          'line-width': ZE(9, ['case', MAJOR, 1, 0.3], 16, ['case', MAJOR, 8, MID, 6.5, 3.5], 19, ['case', MAJOR, 38, MID, 30, 17], 22, ['case', MAJOR, 300, MID, 235, 135]) } },
      { id: 'road-lane', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 17.5, filter: ['all', ['!=', ['get', 'class'], 'rail'], ['any', MAJOR, MID]], paint: { 'line-color': '#e8e1cf', 'line-opacity': 0.75, 'line-width': ZE(17.5, 0.6, 22, 6), 'line-dasharray': [5, 7] } },
      { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: ['==', ['get', 'class'], 'rail'], paint: { 'line-color': '#4a5a70', 'line-width': 1, 'line-dasharray': [3, 3] } },
      // CORE data layer: the studied corridor (holographic, so it reads as data, not as pavement).
      { id: 'corridor-glow', type: 'line', source: 'corridor', minzoom: 12, paint: { 'line-color': '#62d8f2', 'line-blur': 6, 'line-width': ZE(12, 4, 17, 18), 'line-opacity': Z(12, 0.25, 17, 0.12) } },
      { id: 'corridor', type: 'line', source: 'corridor', minzoom: 12, paint: { 'line-color': '#9be9fa', 'line-width': ZE(12, 1, 17, 2.4), 'line-opacity': 0.55, 'line-dasharray': [2, 2] } },
      { id: 'focus-line', type: 'line', source: 'focus', minzoom: 13, paint: { 'line-color': '#f0b45c', 'line-width': ZE(13, 3, 18, 10, 22, 26), 'line-opacity': Z(13, 0.85, 18.5, 0.85, 20, 0.35), 'line-blur': Z(13, 1, 20, 8) } },
      { id: 'building', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 13, paint: {
        'fill-extrusion-color': Z(14.5, NIGHT, 16.5, STONE),
        'fill-extrusion-height': ['case', ['boolean', ['feature-state', 'detail'], false], 0, H], 'fill-extrusion-base': ['case', ['boolean', ['feature-state', 'detail'], false], 0, HMIN],
        'fill-extrusion-opacity': Z(13, 0, 13.6, 0.94), 'fill-extrusion-vertical-gradient': true } },
      // Problems: one marker per recorded segment, coloured by the strongest evidence status; a soft halo pulses.
      { id: 'marker-halo', type: 'circle', source: 'markers', minzoom: 11, paint: { 'circle-radius': Z(11, 8, 17, 22), 'circle-color': STATUS, 'circle-opacity': 0.18, 'circle-blur': 0.6, 'circle-pitch-alignment': 'viewport' } },
      { id: 'markers', type: 'circle', source: 'markers', minzoom: 11, paint: { 'circle-radius': Z(11, 3.5, 17, 8), 'circle-color': STATUS, 'circle-stroke-color': '#06101d', 'circle-stroke-width': 2, 'circle-pitch-alignment': 'viewport' } },
      { id: 'markers-count', type: 'symbol', source: 'markers', minzoom: 15.5, layout: { 'text-field': ['to-string', ['get', 'count']], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#06101d' } },
      { id: 'place-city', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 4, maxzoom: 13, filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]], layout: { 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': Z(4, 11, 10, 15), 'text-letter-spacing': 0.08, 'text-transform': 'uppercase' }, paint: { 'text-color': '#e7eef6', 'text-halo-color': '#04101e', 'text-halo-width': 1.4, 'text-opacity': Z(4, 0.75, 12, 0.9, 13, 0) } },
      { id: 'place-hood', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 12, maxzoom: 15.5, filter: ['in', ['get', 'class'], ['literal', ['suburb', 'quarter', 'neighbourhood']]], layout: { 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': 11.5, 'text-letter-spacing': 0.12, 'text-transform': 'uppercase' }, paint: { 'text-color': '#a9c1d8', 'text-halo-color': '#04101e', 'text-halo-width': 1.2 } },
      { id: 'street-name', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 15, maxzoom: 19.5, layout: { 'symbol-placement': 'line', 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': Z(15, 10.5, 19, 13), 'symbol-spacing': 380, 'text-padding': 8 }, paint: { 'text-color': Z(15, '#cfdbe8', 17, '#f4efe4'), 'text-halo-color': Z(15, '#04101e', 17, '#1d1f22'), 'text-halo-width': 1.4 } },
    ],
  };
  // Relief costs ~6 MB of elevation tiles per visit: only in "Haute" quality. Without it nothing is requested from the DEM host.
  if (!terrain) { delete style.sources.dem; style.layers = style.layers.filter(l => l.source !== 'dem'); }
  return style;
}
