// CORE — city configuration registry (Phase 10). One declarative entry per city; every subsystem (snapshot,
// tools, engine, agents, map, movement, demo) reads its city from here instead of assuming San Francisco.
// status: 'operational' (verified data, executable agents, recorded investigations) | 'navigation' (map only).
// Only facts verified on 2026-10-14 are recorded; anything not integrated is listed under `unavailable`.
(function (root) {
  'use strict';
  const CITIES = {
    'san-francisco': {
      id: 'san-francisco', short: 'SF', name: 'San Francisco', country: 'US', status: 'operational', since: 'Phase 2B',
      center: [-122.418, 37.774], view: { center: [-122.413, 37.775], zoom: 13, pitch: 50, bearing: -20 },
      crs: 'WGS84 (EPSG:4326) ; sources DataSF en WGS84', timezone: 'America/Los_Angeles',
      portal: { kind: 'socrata', domain: 'data.sf.gov', licence: 'ODC Public Domain Dedication and License (PDDL)', licenceUrl: 'https://opendatacommons.org/licenses/pddl/1-0/', commercialUse: 'oui (PDDL)', attribution: 'Courtoisie : « DataSF »' },
      studyArea: { neighborhoods: ['South of Market', 'Mission', 'Tenderloin'], dataDir: 'data/sf9', walkNetwork: 'data/osm/walk-network.json', buildingsSample: 'data/osm/buildings-sample.json' },
      corridor: { label: 'corridor Folsom / Howard', dataDir: 'data/sf' },
      motion: { centre: [-122.4120, 37.7700], radiusM: 2300 }, // virtual posts (organisational zones), on the validated network
      labels: { hin: 'réseau HIN 2024 (Vision Zero SF)', hinShort: 'HIN', crashes: 'accidents avec blessés déclarés (TIMS, SFPD/DPH)', works: 'permis de voirie approuvés (SF Public Works)', worksShort: 'permis' },
      domains: { 'road-safety': 'operational', 'street-works': 'operational', flood: 'operational (zone modélisée)', accessibility: 'operational (corridor)', trees: 'operational (corridor)' },
      missionTypes: ['safety-works', 'flood-works', 'decision-safety-works'],
      sources: {
        neighborhoods: { id: 'j2bu-swwd', title: 'Analysis Neighborhoods', freshnessDays: 3650 },
        hin: { id: 'enwt-3u8m', title: '2024 High Injury Network', freshnessDays: 1100, nature: 'désignation administrative (corridors à forte part de blessés graves et mortels)' },
        crashes: { id: 'ubvf-ztfx', title: 'Traffic Crashes Resulting in Injury', freshnessDays: 120, nature: 'accidents avec blessés déclarés ; gravité classée (douleur, visible, grave, mortel)' },
        works: { id: 'b6tj-gt35', title: 'Street-Use Permits', freshnessDays: 7, nature: 'permis approuvés (pas une preuve d’exécution)' },
        flood: { id: 'jzu3-4yxp', title: '100-Year Storm Flood Risk Zone (July 2022)', freshnessDays: 3650, nature: 'zone de risque modélisée (pas une inondation observée)' },
      },
      agentPrefix: 'core.san-francisco', jurisdiction: 'Analyse interne seulement ; aucune autorité sur la ville de San Francisco ni ses services.',
      simulation: { 'sidewalk-tree-capacity-v1': 'exploratoire non calibré (corridor)', 'safety-works-exposure-v1': 'exploratoire non calibré (zone d’étude)' },
      unavailable: ['réseaux souterrains', 'comptages de trafic', 'coûts', 'données de santé individuelles'],
    },
    'new-york': {
      id: 'new-york', short: 'NYC', name: 'New York', country: 'US', status: 'operational', since: 'Phase 10',
      center: [-73.9855, 40.7180], view: { center: [-73.9860, 40.7195], zoom: 14, pitch: 50, bearing: 29 },
      crs: 'WGS84 (EPSG:4326) ; sources NYC Open Data en WGS84', timezone: 'America/New_York',
      portal: { kind: 'socrata', domain: 'data.cityofnewyork.us', licence: 'NYC Open Data Law (Local Law 11 of 2012, amended by Local Law 251 of 2017): public data sets without restrictions on their use; the City may require attribution of source, version and modifications', licenceUrl: 'https://opendata.cityofnewyork.us/overview/', commercialUse: 'oui selon la loi (aucune restriction d’usage) ; texte codifié non relu directement (accès refusé), à confirmer', attribution: 'Source : NYC Open Data (service producteur), date de collecte et modifications CORE indiquées' },
      studyArea: { neighborhoods: ['Chinatown-Two Bridges', 'Lower East Side', 'East Village'], dataDir: 'data/nyc', walkNetwork: 'data/osm/nyc-walk-network.json', buildingsSample: 'data/osm/nyc-buildings-sample.json' },
      corridor: null,
      motion: { centre: [-73.9880, 40.7195], radiusM: 1300 }, studyLayer: true, // src/city-layer.js
      labels: { hin: 'corridors prioritaires Vision Zero (NYC DOT)', hinShort: 'corridor prioritaire', crashes: 'collisions avec blessés ou tués (NYPD MV-104AN)', works: 'fermetures de rue pour travaux (NYC DOT)', worksShort: 'fermetures' },
      domains: { 'road-safety': 'operational', 'street-works': 'operational (fermetures, pas les permis)', accessibility: 'operational (rampes piétonnes mesurées)', flood: 'non intégré (cartes de ruissellement fournies seulement en fichier)' },
      missionTypes: ['safety-works', 'ramps-works'],
      sources: {
        neighborhoods: { id: '9nt8-h7nd', title: '2020 Neighborhood Tabulation Areas (NTAs)', freshnessDays: 3650 },
        hin: { id: '36nr-7fbp', title: 'VZV Priority Corridors', freshnessDays: 1100, nature: 'désignation administrative (méthode NYC DOT, différente du HIN de SF)' },
        crashes: { id: 'h9gi-nx95', title: 'Motor Vehicle Collisions - Crashes', freshnessDays: 120, nature: 'collisions déclarées par la police ; nombre de blessés et de tués, sans classe de gravité' },
        works: { id: 'i6b5-j7bu', title: 'Street Closures due to Construction Activities by Block', freshnessDays: 7, nature: 'fermetures de rue autorisées pour travaux (pas les permis ; pas de titulaire)' },
        ramps: { id: 'ufzp-rrqu', title: 'Pedestrian Ramp Locations', freshnessDays: 3650, nature: 'relevé de rampes (pentes, paliers, obstacles) daté par rampe' },
      },
      agentPrefix: 'core.new-york', jurisdiction: 'Analyse interne seulement ; aucune autorité sur la ville de New York ni ses services.',
      simulation: { 'safety-works-exposure-v1': 'exploratoire non calibré' },
      unavailable: ['zones d’inondation tabulaires', 'permis de voirie géolocalisés', 'arbres (recensement 2015 non intégré)', 'coûts'],
    },
    paris: { id: 'paris', name: 'Paris', status: 'navigation', center: [2.3522, 48.8566], unavailable: ['aucune donnée ni aucun agent intégré'] },
    tokyo: { id: 'tokyo', name: 'Tokyo', status: 'navigation', center: [139.6917, 35.6895], unavailable: ['aucune donnée ni aucun agent intégré'] },
  };
  const operational = () => Object.values(CITIES).filter(c => c.status === 'operational');
  const byNhood = nh => operational().find(c => c.studyArea.neighborhoods.includes(nh)) || null;
  const CTY = { CITIES, operational, byNhood, get: id => CITIES[id] || null };
  if (typeof module !== 'undefined' && module.exports) module.exports = CTY; else root.CORE_CITIES = CTY;
})(typeof globalThis !== 'undefined' ? globalThis : this);
