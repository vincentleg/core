// CORE — domain and dataset registry (Phase 2D, city intelligence foundation).
// One place declares every domain CORE knows about, which real datasets back it, and how raw rows become
// normalized features. Domains without integrated data are listed honestly as candidate or unavailable.
(function (root) {
  'use strict';
  const SF = (typeof require === 'function' && typeof module !== 'undefined') ? require('./sf-data.js') : root.CORE_SF_DATA;

  // status: working (integrated real data) | partial (some real data, major gaps) | candidate (sources identified, not integrated) | unavailable
  const DOMAINS = [
    { id: 'infrastructure', name: 'Infrastructure urbaine', color: '#78e8ff', status: 'working', scope: 'Voirie, intersections, permis de voirie, fermetures, moratoires (corridor Folsom/Howard).', gaps: 'Pas de réseaux souterrains, de comptages ni de plans de feux.' },
    { id: 'buildings', name: 'Bâtiments et logement', color: '#ffd38a', status: 'working', scope: 'Permis de construire DBI au front du corridor ; volumes 3D OSM ; repères.', gaps: 'Pas d’occupation, pas d’état des bâtiments ; emprises DataSF LiDAR non intégrées.' },
    { id: 'nature', name: 'Nature et environnement', color: '#7ee0a0', status: 'partial', scope: 'Arbres d’alignement (inventaire), avis d’abattage, parcs Rec & Parks.', gaps: 'Pas de canopée, biodiversité, chaleur ni qualité de l’air intégrées (APEZ, HAQR candidats).' },
    { id: 'energy', name: 'Énergie', color: '#ffb84d', status: 'partial', scope: 'Bilans énergétiques déclarés (Existing Buildings Energy Performance Ordinance).', gaps: 'Pas de réseau électrique, production, stockage ni consommation mesurée en temps réel.' },
    { id: 'public_space', name: 'Espaces publics et sol', color: '#aa8cff', status: 'partial', scope: 'Largeurs de trottoir (étude 2014), parcs à proximité.', gaps: 'Largeurs de 2014 ; pas de cheminements ni d’accessibilité mesurés.' },
    { id: 'society', name: 'Société et communautés', color: '#ff8fa3', status: 'candidate', scope: 'Quartiers d’analyse (j2bu-swwd) identifiés.', gaps: 'Aucune donnée démographique intégrée ; seulement des agrégats publics à l’avenir, jamais de données individuelles.' },
    { id: 'events', name: 'Évènements et décisions', color: '#ff5cd6', status: 'partial', scope: 'Fermetures SFMTA, avis publics d’abattage d’arbres.', gaps: 'Pas d’actualités ni de décisions municipales ; une actualité serait une piste à vérifier.' },
  ];

  const LICENSE = { name: 'ODC Public Domain Dedication and License (PDDL)', url: 'https://opendatacommons.org/licenses/pddl/1-0/' };
  const num = v => { const n = Number(v); return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n; };
  const day = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
  const txt = v => (v === null || v === undefined ? null : String(v).trim() || null);
  const point = (lon, lat) => { const x = num(lon), y = num(lat); return x !== null && y !== null && !(x === 0 && y === 0) && Math.abs(y) <= 90 && Math.abs(x) <= 180 ? { type: 'Point', coordinates: [x, y] } : null; };

  // Each dataset: identity + provenance + schema (required fields and types) + normalizer. Normalizers return null to drop.
  const DATASETS = [
    { key: 'street-trees', id: 'tkzw-k3nq', domain: 'nature', title: 'San Francisco Street Tree Inventory', provider: 'San Francisco Public Works', updates: 'Daily',
      kind: 'observed inventory (asset register)', geometry: 'point', temporal: 'planteddate (often missing)', dedupe: 'treeid',
      schema: { treeid: 'string', latitude: 'number', longitude: 'number' },
      normalize: r => { const g = point(r.longitude, r.latitude); if (!g || !txt(r.treeid)) return null;
        return { geometry: g, properties: { kind: 'tree', record_id: txt(r.treeid), treeid: txt(r.treeid), species: txt(r.species), legal_status: txt(r.legalstatus), site: txt(r.siteinfo), plant_type: txt(r.planttype), dbh_range: txt(r.dbhrange), plot_size: txt(r.plotsize), planted: day(r.planteddate), cnn: SF.cnnId(r.cnn), on_street: txt(r.onstreet), cross_street: txt(r.crossstreet) } }; } },
    { key: 'tree-removals', id: 'qrwx-q4gg', domain: 'nature', also: ['events'], title: 'Street Tree Removal Notifications', provider: 'San Francisco Public Works', updates: 'Daily',
      kind: 'public notice (administrative)', geometry: 'point', temporal: 'posteddate', dedupe: 'treeid+posteddate',
      schema: { treeid: 'string', posteddate: 'date' },
      normalize: r => { const g = point(r.long, r.lat); if (!g || !txt(r.treeid) || !day(r.posteddate)) return null;
        return { geometry: g, properties: { kind: 'tree_removal', record_id: `${txt(r.treeid)}@${day(r.posteddate)}`, treeid: txt(r.treeid), notice: txt(r.postedtype), posted: day(r.posteddate), site: SF.scrub(r.description), species: txt(r.species), location: txt(r.location) } }; } },
    { key: 'building-permits', id: 'i98e-djp9', domain: 'buildings', title: 'Building Permits', provider: 'Department of Building Inspection', updates: 'Multiple times per hour',
      kind: 'administrative record (permit, not proof of construction)', geometry: 'point', temporal: 'filed/issued/completed dates', dedupe: 'permit_number (primary address)',
      schema: { permit_number: 'string', status: 'string', location: 'point' },
      normalize: r => { const g = r.location && r.location.type === 'Point' ? point(r.location.coordinates[0], r.location.coordinates[1]) : null; if (!g || !txt(r.permit_number)) return null;
        const block = txt(r.block), lot = txt(r.lot);
        return { geometry: g, properties: { kind: 'building_permit', record_id: txt(r.permit_number), permit_number: txt(r.permit_number), type: txt(r.permit_type_definition), status: txt(r.status),
          filed: day(r.filed_date), issued: day(r.issued_date), completed: day(r.completed_date), status_date: day(r.status_date), parcel: block && lot ? `${block}/${lot}` : null,
          address: [txt(r.street_number), txt(r.street_name), txt(r.street_suffix)].filter(Boolean).join(' ') || null, description: SF.scrub(r.description),
          existing_use: txt(r.existing_use), proposed_use: txt(r.proposed_use), estimated_cost: num(r.estimated_cost), proposed_units: num(r.proposed_units), existing_units: num(r.existing_units) } }; } },
    { key: 'energy-benchmarks', id: '96ck-qcfe', domain: 'energy', also: ['buildings'], title: 'Existing Buildings Energy Performance Ordinance Report', provider: 'SF Environment', updates: 'Monthly',
      kind: 'self-reported annual benchmark (Energy Star Portfolio Manager)', geometry: 'point', temporal: 'benchmark_year', dedupe: 'parcel_number+benchmark_year',
      schema: { parcel_number: 'string', benchmark_year: 'string', point: 'point' },
      normalize: r => { const g = r.point && r.point.type === 'Point' ? point(r.point.coordinates[0], r.point.coordinates[1]) : null; if (!g || !txt(r.parcel_number)) return null;
        return { geometry: g, properties: { kind: 'energy_benchmark', record_id: `${txt(r.parcel_number)}@${txt(r.benchmark_year)}`, parcel: txt(r.parcel_number), name: txt(r.building_name), address: txt(r.building_address),
          property_type: txt(r.property_type), floor_area_sqft: num(r.floor_area), year: num(r.benchmark_year), status: txt(r.benchmark_status), site_eui: num(r.site_eui), source_eui: num(r.source_eui),
          ghg_tco2e: num(r.total_ghg_emissions), energy_star: num(r.energy_star_score), year_built: num(r.year_built), audit_status: txt(r.energy_audit_status), audit_due: day(r.energy_audit_due_date) } }; } },
    { key: 'parks', id: 'gtr9-ntp6', domain: 'nature', also: ['public_space'], title: 'Recreation and Parks Properties', provider: 'Recreation and Parks Department', updates: 'Weekly',
      kind: 'administrative asset register', geometry: 'point (property centroid)', temporal: 'none', dedupe: 'property_id',
      schema: { property_name: 'string', latitude: 'number', longitude: 'number' },
      normalize: r => { const g = point(r.longitude, r.latitude); if (!g || !txt(r.property_name)) return null;
        return { geometry: g, properties: { kind: 'park', record_id: txt(r.property_id) || txt(r.objectid) || txt(r.property_name), name: txt(r.property_name), type: txt(r.propertytype), acres: num(r.acres), address: txt(r.address) } }; } },
    { key: 'sidewalks', id: '4g86-grxu', domain: 'public_space', title: 'Sidewalk Widths (2014)', provider: 'SFMTA (AECOM 2014 study)', updates: 'As needed (2014 study)',
      kind: 'measured in a 2014 study, joined to centerlines', geometry: 'line', temporal: '2014', dedupe: 'objectid',
      schema: { cnn: 'string' },
      normalize: r => { if (!txt(r.cnn) || !r.shape) return null; const g = r.shape.type === 'MultiLineString' && r.shape.coordinates.length === 1 ? { type: 'LineString', coordinates: r.shape.coordinates[0] } : r.shape;
        return { geometry: g, properties: { kind: 'sidewalk', record_id: txt(r.objectid) || `${SF.cnnId(r.cnn)}-${txt(r.side)}`, cnn: SF.cnnId(r.cnn), street: txt(r.street), side: txt(r.side), width_ft: num(r.sidewalk_f), min_width_ft: num(r.width_min), recommended_ft: num(r.width_reco), class: txt(r.class) } }; } },
  ];

  // Schema validation of a raw row: returns a list of problems (empty = valid).
  function validate(row, schema) {
    const out = [];
    for (const [k, t] of Object.entries(schema)) {
      const v = row[k];
      if (v === null || v === undefined || v === '') { out.push(`${k} manquant`); continue; }
      if (t === 'number' && num(v) === null) out.push(`${k} non numérique`);
      if (t === 'date' && !day(v)) out.push(`${k} date invalide`);
      if (t === 'point' && !(v && v.type === 'Point' && Array.isArray(v.coordinates))) out.push(`${k} géométrie invalide`);
    }
    return out;
  }
  // Normalize raw rows with validation and deduplication; never invents values.
  function normalizeRows(spec, rows) {
    const seen = new Set(), features = [], rejected = {}; let duplicates = 0;
    for (const row of rows) {
      const problems = validate(row, spec.schema);
      const f = problems.length ? null : spec.normalize(row);
      if (!f) { const k = problems[0] || 'géométrie ou identifiant inutilisable'; rejected[k] = (rejected[k] || 0) + 1; continue; }
      if (seen.has(f.properties.record_id)) { duplicates++; continue; }
      seen.add(f.properties.record_id); features.push({ type: 'Feature', geometry: f.geometry, properties: f.properties });
    }
    if (SF.hasPII(features)) throw Error(`${spec.key}: personal data survived normalization`);
    return { features, rejected, duplicates };
  }

  const D = { DOMAINS, DATASETS, LICENSE, validate, normalizeRows, domain: id => DOMAINS.find(d => d.id === id), dataset: key => DATASETS.find(d => d.key === key) };
  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.CORE_DOMAINS = D;
})(typeof globalThis !== 'undefined' ? globalThis : this);
