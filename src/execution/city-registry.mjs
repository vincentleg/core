// Coordinates outside San Francisco are navigation anchors, not study boundaries or scientific evidence.
export const CITIES = Object.freeze({
  'san-francisco': {
    id: 'san-francisco', name: { en: 'San Francisco', fr: 'San Francisco' }, country: { en: 'United States', fr: 'États-Unis' }, center: [-122.4194, 37.7749], bbox: [-122.52, 37.70, -122.35, 37.84],
    readiness: 'operational', data: 'authorized-bundled', validation: 'awaiting-independent-review',
    missionIds: ['mission.sf.mobility', 'mission.sf.housing-resilience'], agents: 'assigned in the published mission specifications',
    evidence: ['docs/DATA_SOURCES.md', 'data/urban/catalog.json', 'data/sf-housing/manifest.json'],
    boundaries: { resource: 'data/sf-housing/neighborhoods.geojson', manifest: 'data/sf-housing/manifest.json', file: 'neighborhoods.geojson', key: 'nhood', id: 'j2bu-swwd', title: 'Analysis Neighborhoods', unit: 'analysis neighbourhood' }
  },
  oakland: {
    id: 'oakland', name: { en: 'Oakland', fr: 'Oakland' }, country: { en: 'United States', fr: 'États-Unis' }, center: [-122.2711, 37.8044], readiness: 'exploratory', data: 'not-authorized', validation: 'not-started',
    missionIds: ['mission.oakland.signal-timing'], agents: 'none', evidence: ['src/execution/missions.mjs#OAKLAND_MOBILITY'],
    limitation: { en: 'A blocked transfer question is documented. No authorized Oakland geometry, counts or signal plans are bundled; no agent can run here.', fr: 'Une question de transfert bloquée est documentée. Aucune géométrie, aucun comptage ni plan de feux autorisé d’Oakland n’est intégré ; aucun agent ne peut y agir.' }
  },
  'new-york': {
    id: 'new-york', name: { en: 'New York', fr: 'New York' }, country: { en: 'United States', fr: 'États-Unis' }, center: [-74.006, 40.7128], readiness: 'unavailable', data: 'none-authorized', validation: 'not-started', missionIds: [], agents: 'none', evidence: ['src/voice/actions.mjs#PLACES'],
    limitation: { en: 'Geographic exploration only. No authorized local dataset or runnable city mission is bundled.', fr: 'Exploration géographique seulement. Aucun jeu local autorisé ni mission urbaine exécutable n’est intégré.' }
  },
  paris: {
    id: 'paris', name: { en: 'Paris', fr: 'Paris' }, country: { en: 'France', fr: 'France' }, center: [2.3522, 48.8566], readiness: 'unavailable', data: 'none-authorized', validation: 'not-started', missionIds: [], agents: 'none', evidence: [],
    limitation: { en: 'Navigation coordinate only. No authorized local dataset or runnable city mission is bundled.', fr: 'Coordonnée de navigation seulement. Aucun jeu local autorisé ni mission urbaine exécutable n’est intégré.' }
  },
  nairobi: {
    id: 'nairobi', name: { en: 'Nairobi', fr: 'Nairobi' }, country: { en: 'Kenya', fr: 'Kenya' }, center: [36.8219, -1.2921], readiness: 'unavailable', data: 'none-authorized', validation: 'not-started', missionIds: [], agents: 'none', evidence: [],
    limitation: { en: 'Navigation coordinate only. No authorized local dataset or runnable city mission is bundled.', fr: 'Coordonnée de navigation seulement. Aucun jeu local autorisé ni mission urbaine exécutable n’est intégré.' }
  },
  tokyo: {
    id: 'tokyo', name: { en: 'Tokyo', fr: 'Tokyo' }, country: { en: 'Japan', fr: 'Japon' }, center: [139.6917, 35.6895], readiness: 'unavailable', data: 'none-authorized', validation: 'not-started', missionIds: [], agents: 'none', evidence: [],
    limitation: { en: 'Navigation coordinate only. No authorized local dataset or runnable city mission is bundled.', fr: 'Coordonnée de navigation seulement. Aucun jeu local autorisé ni mission urbaine exécutable n’est intégré.' }
  }
});
export const cityForMission = missionId => Object.values(CITIES).find(city => city.missionIds.includes(missionId)) || null;
