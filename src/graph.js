// CORE — San Francisco city knowledge graph (Phase 2D). Lightweight, local, deterministic.
// Entities have stable ids, provenance and geometry references. Every relationship states its basis and why
// it exists. Bases: observed (a field in the source record), derived (geographic computation), rule
// (deterministic rule over observed values), hypothesis (requires verification). No causality is inferred.
(function (root) {
  'use strict';
  const C = (typeof require === 'function' && typeof module !== 'undefined') ? require('./coord.js') : root.CORE_COORD;
  const BASES = ['observed', 'derived', 'rule', 'hypothesis'];
  const TYPES = ['LOCATED_IN', 'INTERSECTS', 'NEAR', 'AFFECTS', 'DEPENDS_ON', 'OVERLAPS_IN_TIME', 'ASSOCIATED_WITH', 'SUPPORTED_BY', 'CONTRADICTED_BY', 'REQUIRES_REVIEW'];

  function createGraph() {
    const entities = new Map(), relations = [], index = new Map();
    const g = {
      entities, relations,
      addEntity(id, type, props, provenance) { if (!entities.has(id)) entities.set(id, { id, type, props: props || {}, provenance: provenance || null }); return entities.get(id); },
      relate(type, from, to, basis, why, extra = {}) {
        if (!TYPES.includes(type)) throw TypeError(`relation inconnue ${type}`);
        if (!BASES.includes(basis)) throw TypeError(`base inconnue ${basis}`);
        if (!entities.has(from) || !entities.has(to)) throw TypeError(`entité inconnue ${entities.has(from) ? to : from}`);
        if (!why) throw TypeError('une relation doit expliquer pourquoi elle existe');
        if (type === 'AFFECTS' && basis !== 'hypothesis') throw TypeError('AFFECTS ne peut être qu’une hypothèse (pas de causalité déduite)');
        const r = { id: `${type}:${from}->${to}`, type, from, to, basis, why, ...extra };
        relations.push(r);
        for (const k of [from, to]) { if (!index.has(k)) index.set(k, []); index.get(k).push(r); }
        return r;
      },
      of(id, type) { return (index.get(id) || []).filter(r => !type || r.type === type); },
      neighbours(id, type) { return g.of(id, type).map(r => r.from === id ? r.to : r.from); },
      stats() { const by = {}; for (const r of relations) { const k = `${r.type}/${r.basis}`; by[k] = (by[k] || 0) + 1; } return { entities: entities.size, relations: relations.length, by }; },
      toJSON() { return { entities: [...entities.values()], relations }; },
    };
    return g;
  }

  const prov = (ctx, dataset, recordId, field) => ({ dataset, dataset_id: ctx.datasets[dataset] ? ctx.datasets[dataset].id : null, record_id: recordId, field: field || null, snapshot: ctx.asOf });
  const feats = (ctx, k) => (ctx.data[k] ? ctx.data[k].features : []);
  const near = (g, geom, m) => C.distanceToGeometry(g.coordinates, geom) <= m;

  // Build the corridor graph from the verified snapshot (ctx from CORE_COORD.buildContext). Parameters are explicit.
  function buildCityGraph(ctx, p) {
    const G = createGraph();
    for (const [cnn, f] of ctx.segments) G.addEntity(`segment:${cnn}`, 'StreetSegment', { cnn, street: f.properties.street, from: f.properties.from, to: f.properties.to }, prov(ctx, 'corridor', cnn));
    for (const [cnn, f] of ctx.nodes) G.addEntity(`location:${cnn}`, 'Location', { cnn, name: f.properties.name }, prov(ctx, 'intersections', cnn));
    for (const [cnn, f] of ctx.segments) for (const n of [f.properties.f_node_cnn, f.properties.t_node_cnn])
      if (ctx.nodes.has(n)) G.relate('INTERSECTS', `segment:${cnn}`, `location:${n}`, 'observed', 'Nœud CNN de début/fin du tronçon (axes DPW).');
    const placeOf = cnn => ctx.segments.has(cnn) ? `segment:${cnn}` : ctx.nodes.has(cnn) ? `location:${cnn}` : null;

    for (const f of feats(ctx, 'permits')) {
      const q = f.properties, id = `permit:${q.record_id}`, at = placeOf(q.cnn); if (!at) continue;
      G.addEntity(id, 'Permit', { permit_number: q.permit_number, type: q.permit_type, status: q.status, start: q.start, end: q.end, agent: q.agent }, prov(ctx, 'permits', q.record_id));
      G.relate('LOCATED_IN', id, at, 'observed', `Champ CNN ${q.cnn} du permis de voirie.`);
      if (q.agent) { const o = `organization:${q.agent}`; G.addEntity(o, 'Organization', { name: q.agent }, prov(ctx, 'permits', q.record_id, 'agent')); G.relate('ASSOCIATED_WITH', id, o, 'observed', 'Titulaire déclaré du permis.'); }
    }
    for (const k of ['closures', 'moratoria']) for (const f of feats(ctx, k)) {
      const q = f.properties, id = `${k === 'closures' ? 'event' : 'observation'}:${k}:${q.record_id}`, at = placeOf(q.cnn); if (!at) continue;
      G.addEntity(id, k === 'closures' ? 'Event' : 'Observation', { ...q }, prov(ctx, k, q.record_id));
      G.relate('LOCATED_IN', id, at, 'observed', `Champ CNN ${q.cnn} (${k === 'closures' ? 'fermeture SFMTA' : 'moratoire de chaussée'}).`);
    }
    for (const f of feats(ctx, 'street-trees')) {
      const q = f.properties, id = `tree:${q.treeid}`, at = placeOf(q.cnn);
      G.addEntity(id, 'Tree', { species: q.species, legal_status: q.legal_status, site: q.site, dbh_range: q.dbh_range, planted: q.planted, coords: f.geometry.coordinates }, prov(ctx, 'street-trees', q.record_id));
      if (at) G.relate('LOCATED_IN', id, at, 'observed', `Champ CNN ${q.cnn} de l’inventaire des arbres.`);
    }
    for (const f of feats(ctx, 'tree-removals')) {
      const q = f.properties, id = `event:tree-removal:${q.record_id}`;
      G.addEntity(id, 'Event', { notice: q.notice, posted: q.posted, site: q.site }, prov(ctx, 'tree-removals', q.record_id));
      if (G.entities.has(`tree:${q.treeid}`)) G.relate('ASSOCIATED_WITH', id, `tree:${q.treeid}`, 'observed', `Avis d’abattage pour l’arbre ${q.treeid} (même identifiant).`, { valid_from: q.posted });
    }
    for (const f of feats(ctx, 'sidewalks')) {
      const q = f.properties, id = `asset:sidewalk:${q.record_id}`, at = placeOf(q.cnn);
      G.addEntity(id, 'InfrastructureAsset', { kind: 'sidewalk', width_ft: q.width_ft, min_width_ft: q.min_width_ft, side: q.side, year: 2014 }, prov(ctx, 'sidewalks', q.record_id));
      if (at) G.relate('LOCATED_IN', id, at, 'observed', `Largeur de trottoir rattachée au CNN ${q.cnn} (étude 2014).`);
    }
    const recentFrom = ctx.asOfN - p.buildingRecencyDays;
    for (const f of feats(ctx, 'building-permits')) {
      const q = f.properties, id = `building-permit:${q.permit_number}`;
      G.addEntity(id, 'Permit', { domain: 'buildings', permit_number: q.permit_number, type: q.type, status: q.status, filed: q.filed, issued: q.issued, completed: q.completed, address: q.address, parcel: q.parcel, description: q.description,
        recent: !q.completed && ['filed', 'approved', 'issued', 'reinstated', 'plancheck'].includes(q.status) && [q.filed, q.issued].some(d => d && C.dn(d) >= recentFrom), coords: f.geometry.coordinates }, prov(ctx, 'building-permits', q.record_id));
      if (q.parcel) { const pid = `parcel:${q.parcel}`; G.addEntity(pid, 'Parcel', { parcel: q.parcel }, prov(ctx, 'building-permits', q.record_id, 'block/lot')); G.relate('LOCATED_IN', id, pid, 'observed', `Bloc/lot ${q.parcel} du permis DBI.`); }
      for (const [cnn, s] of ctx.segments) if (near(f.geometry, s.geometry, p.frontageM)) G.relate('NEAR', id, `segment:${cnn}`, 'derived', `Point du permis à ≤ ${p.frontageM} m de l’axe du tronçon (géocodage à l’adresse).`, { distance_m: Math.round(C.distanceToGeometry(f.geometry.coordinates, s.geometry)) });
    }
    for (const f of feats(ctx, 'energy-benchmarks')) {
      const q = f.properties, id = `building:${q.parcel}`;
      G.addEntity(id, 'Building', { name: q.name, address: q.address, property_type: q.property_type, floor_area_sqft: q.floor_area_sqft, energy_year: q.year, site_eui: q.site_eui, ghg_tco2e: q.ghg_tco2e, energy_star: q.energy_star, benchmark_status: q.status, coords: f.geometry.coordinates }, prov(ctx, 'energy-benchmarks', q.record_id));
      const pid = `parcel:${q.parcel}`; G.addEntity(pid, 'Parcel', { parcel: q.parcel }, prov(ctx, 'energy-benchmarks', q.record_id, 'parcel_number'));
      G.relate('LOCATED_IN', id, pid, 'observed', `Numéro de parcelle ${q.parcel} du bilan énergétique.`);
      for (const [cnn, s] of ctx.segments) if (near(f.geometry, s.geometry, p.frontageM + 20)) G.relate('NEAR', id, `segment:${cnn}`, 'derived', `Bâtiment déclaré à ≤ ${p.frontageM + 20} m de l’axe du tronçon.`, { distance_m: Math.round(C.distanceToGeometry(f.geometry.coordinates, s.geometry)) });
    }
    for (const f of feats(ctx, 'parks')) {
      const q = f.properties, id = `park:${q.record_id}`;
      G.addEntity(id, 'Park', { name: q.name, type: q.type, acres: q.acres }, prov(ctx, 'parks', q.record_id));
      for (const [cnn, s] of ctx.segments) if (near(f.geometry, s.geometry, 120)) G.relate('NEAR', id, `segment:${cnn}`, 'derived', 'Centroïde du parc à ≤ 120 m de l’axe du tronçon.', { distance_m: Math.round(C.distanceToGeometry(f.geometry.coordinates, s.geometry)) });
    }
    return G;
  }

  // City Intelligence items become Event entities; links to corridor segments are observed (CNN field) or
  // derived (distance). Items without coordinates stay unlinked: nothing is geolocated by guesswork.
  function linkFeedItems(G, items, ctx, linkFn) {
    let linked = 0;
    for (const it of items) {
      const id = `event:feed:${it.id}`;
      G.addEntity(id, 'Event', { title: it.title, kind: it.kind, published: it.published, source: it.source, verification: it.verification.status }, { dataset: `feed:${it.source}`, record_id: it.id, url: it.url, retrieved_at: it.retrieved_at || null });
      const l = linkFn(it, ctx);
      if (l && G.entities.has(`segment:${l.segment}`)) { G.relate(/observed/.test(l.basis) ? 'LOCATED_IN' : 'NEAR', id, `segment:${l.segment}`, /observed/.test(l.basis) ? 'observed' : 'derived', `Élément de veille rattaché au tronçon (${l.basis}, ${l.distance_m} m).`, { distance_m: l.distance_m }); linked++; }
    }
    return linked;
  }

  const GRAPH = { BASES, TYPES, createGraph, buildCityGraph, linkFeedItems };
  if (typeof module !== 'undefined' && module.exports) module.exports = GRAPH; else root.CORE_GRAPH = GRAPH;
})(typeof globalThis !== 'undefined' ? globalThis : this);
