// CORE — sidewalk accessibility × street-tree planting capacity (Phase 5). EXPLORATORY, UNCALIBRATED.
// Question: on each corridor block, how many additional street-tree positions could fit while keeping an
// accessible pedestrian through-zone, and where should planting wait for scheduled excavation windows?
// Domains: public space, accessibility, urban forestry, works coordination. Public data only (DataSF, ODC-PDDL).
// It computes geometric capacity under declared assumptions. It does NOT estimate canopy, heat, carbon,
// stormwater, health or economic benefits, and it knows nothing about underground utilities, driveways, soil
// volume or current (post-2014) sidewalk widths — those are listed as the evidence needed for operational use.
(function (root) {
  'use strict';
  const isNode = typeof require === 'function' && typeof module !== 'undefined';
  const C = isNode ? require('./coord.js') : root.CORE_COORD;

  const FT = 0.3048;
  const MODEL = {
    id: 'sidewalk-tree-capacity-v1', version: '1.0.0', status: 'exploratory', calibrated: false,
    domains: ['public_space', 'accessibility', 'nature', 'infrastructure'],
    scope: 'Corridor Folsom / Howard, 2nd → 11th St (44 blocks), San Francisco',
    inputs: [
      { dataset: 'sidewalks', id: '4g86-grxu', use: 'largeur de trottoir mesurée (2014), largeurs minimale et recommandée de la classe Better Streets Plan, côté' },
      { dataset: 'street-trees', id: 'tkzw-k3nq', use: 'arbres existants par CNN (souches = emplacements de replantation)' },
      { dataset: 'permits', id: 'b6tj-gt35', use: 'fenêtres d’excavation planifiées (report de plantation)' },
      { dataset: 'corridor', id: '3psu-pn9h', use: 'géométrie des tronçons (longueur)' },
    ],
    units: { width: 'ft (pieds, unité de la source)', length: 'm et ft', positions: 'nombre d’emplacements', time: 'jours' },
    params: {
      basinWidthFt: { value: 3, min: 3, max: 6, unit: 'ft', basis: 'Taille de fosse la plus fréquente dans l’inventaire du corridor (3x3, observée) ; des fosses plus larges favorisent la santé des arbres (hypothèse).' },
      clearPathMinFt: { value: 4, min: 4, max: 8, unit: 'ft', basis: 'Minimum du cheminement piéton accessible : 4 ft (1,2 m) selon les règles PROWAG du US Access Board (2023) ; valeurs plus élevées = objectifs de politique.' },
      spacingFt: { value: 25, min: 15, max: 40, unit: 'ft', basis: 'Hypothèse d’espacement entre arbres (pas de règle unique ; à confirmer avec SF Public Works).' },
      usableFrontageShare: { value: 0.6, min: 0.3, max: 0.9, unit: 'fraction', basis: 'Hypothèse : part du linéaire libre d’entrées charretières, coins, arrêts et réseaux (aucune donnée disponible).' },
      avoidWorksDays: { value: 120, min: 0, max: 365, unit: 'jours', basis: 'Horizon pendant lequel une fenêtre d’excavation planifiée fait reporter la plantation (règle de coordination déclarée).' },
    },
    assumptions: [
      'La fosse d’arbre est placée dans la bande de mobilier côté bordure ; le cheminement restant = largeur du trottoir − largeur de la fosse.',
      'La largeur 2014 s’applique à tout le tronçon et à chaque côté indiqué (« Both » = deux côtés).',
      'Les souches (« Stump ») sont des emplacements de replantation, pas des arbres vivants.',
      'Le point publié d’un permis représente le tronçon de son CNN ; le tracé réel de la tranchée est inconnu.',
    ],
    applicability: 'Indicateur de capacité géométrique pour prioriser des relevés de terrain. Inapplicable à une décision de plantation sans relevé des réseaux souterrains, entrées charretières, volume de sol et largeurs actuelles.',
    neededForOperationalUse: ['Relevé actuel des largeurs et obstacles du trottoir', 'Plans des réseaux souterrains (accès autorisé requis)', 'Inventaire des entrées charretières et arrêts', 'Volume de sol disponible par fosse', 'Validation par SF Public Works (Bureau of Urban Forestry)'],
    notComputed: ['canopée', 'îlot de chaleur', 'carbone', 'eaux pluviales', 'santé', 'valeur économique'],
  };
  const ALTERNATIVES = {
    A0: { label: 'Statu quo (aucune plantation)', params: null },
    A1: { label: 'Plantation à capacité, fosses de 3 ft', params: { basinWidthFt: 3, avoidWorksDays: 0 } },
    A2: { label: 'Fosses de 5 ft (santé des arbres) avec un cheminement cible de 6 ft (confort, objectif de politique)', params: { basinWidthFt: 5, clearPathMinFt: 6, avoidWorksDays: 0 } },
    A3: { label: 'Fosses de 3 ft, plantation reportée là où des travaux sont planifiés', params: { basinWidthFt: 3 } },
  };

  function lengthM(g) {
    const R = 6371008.8, rad = x => x * Math.PI / 180, lines = g.type === 'MultiLineString' ? g.coordinates : [g.coordinates]; let L = 0;
    for (const line of lines) for (let i = 1; i < line.length; i++) { const [a, b] = [line[i - 1], line[i]]; const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2; L += 2 * R * Math.asin(Math.sqrt(h)); }
    return L;
  }
  function validate(params) {
    const p = {}, errors = [];
    for (const [k, d] of Object.entries(MODEL.params)) {
      const v = params && params[k] !== undefined ? Number(params[k]) : d.value;
      if (!Number.isFinite(v) || v < d.min || v > d.max) errors.push(`${k}=${params[k]} hors du domaine [${d.min}, ${d.max}] ${d.unit}`); else p[k] = v;
    }
    for (const k of Object.keys(params || {})) if (!MODEL.params[k]) errors.push(`paramètre inconnu : ${k}`);
    return { p, errors };
  }

  // Deterministic run. Every output row keeps the record ids it was computed from.
  function run(ctx, params = {}, { plant = true } = {}) {
    const { p, errors } = validate(params);
    if (errors.length) throw new RangeError(errors.join(' ; '));
    const sidewalks = new Map(ctx.data.sidewalks.features.map(f => [String(f.properties.cnn), f]));
    const trees = new Map(); for (const f of ctx.data['street-trees'].features) { const k = String(parseInt(f.properties.cnn, 10)); if (!trees.has(k)) trees.set(k, []); trees.get(k).push(f); }
    const rows = [];
    for (const [cnn, seg] of ctx.segments) {
      const sw = sidewalks.get(cnn); if (!sw) continue;
      const s = sw.properties, sides = s.side === 'Both' ? 2 : 1, len = lengthM(seg.geometry), lenFt = len / FT;
      const all = trees.get(cnn) || [], stumps = all.filter(t => /stump/i.test(t.properties.species)), living = all.length - stumps.length;
      const through = s.width_ft - p.basinWidthFt, accessible = through >= p.clearPathMinFt;
      const capacity = Math.floor(lenFt * p.usableFrontageShare / p.spacingFt) * sides;
      const additional = plant && accessible ? Math.max(0, capacity - living) : 0;
      const g = C.analyseGroup(ctx, cnn, C.DEFAULTS), hi = ctx.asOfN + p.avoidWorksDays;
      const works = p.avoidWorksDays > 0 ? g.planning.filter(w => w.cnn === cnn && w.s <= hi && w.e >= ctx.asOfN) : [];
      const deferred = works.length ? additional : 0;
      rows.push({ cnn, street: seg.properties.street, from: seg.properties.from, to: seg.properties.to, length_m: Math.round(len), sides,
        width_ft: s.width_ft, bsp_class: s.class, bsp_min_ft: s.min_width_ft, bsp_recommended_ft: s.recommended_ft,
        below_bsp_min: s.width_ft < s.min_width_ft, below_bsp_recommended: s.width_ft < s.recommended_ft,
        through_zone_ft: +through.toFixed(1), accessible, living_trees: living, stumps: stumps.length, capacity_positions: capacity,
        additional_positions: additional, deferred_for_works: deferred, plantable_now: additional - deferred, works: works.map(w => w.record_id),
        sources: { sidewalk: `sidewalks:${s.record_id}`, trees: all.map(t => `street-trees:${t.properties.record_id}`), permits: works.map(w => `permits:${w.record_id}`) } });
    }
    const sum = k => rows.reduce((n, r) => n + (typeof r[k] === 'boolean' ? +r[k] : r[k]), 0);
    const totals = { blocks: rows.length, below_bsp_min: sum('below_bsp_min'), below_bsp_recommended: sum('below_bsp_recommended'), not_accessible_with_basin: rows.filter(r => !r.accessible).length,
      living_trees: sum('living_trees'), stumps: sum('stumps'), additional_positions: sum('additional_positions'), deferred_for_works: sum('deferred_for_works'), plantable_now: sum('plantable_now') };
    const out = { model: MODEL.id, version: MODEL.version, status: MODEL.status, calibrated: false, snapshot: ctx.asOf, params: p, totals, rows };
    out.fingerprint = C.fingerprint({ model: MODEL.id, version: MODEL.version, snapshot: ctx.asOf, params: p, totals, rows: rows.map(r => [r.cnn, r.additional_positions, r.deferred_for_works, r.accessible]) });
    return out;
  }

  function alternatives(ctx, base = {}) {
    return Object.entries(ALTERNATIVES).map(([id, a]) => { const r = run(ctx, { ...base, ...(a.params || {}) }, { plant: !!a.params }); return { id, label: a.label, params: r.params, totals: r.totals, fingerprint: r.fingerprint }; });
  }
  // One-at-a-time sensitivity: each parameter at its bounds, others at the given values.
  function sensitivity(ctx, base = {}) {
    const ref = run(ctx, base);
    return { reference: ref.totals, params: Object.entries(MODEL.params).map(([k, d]) => {
      const lo = run(ctx, { ...base, [k]: d.min }).totals, hi = run(ctx, { ...base, [k]: d.max }).totals;
      return { param: k, unit: d.unit, low: d.min, high: d.max, additional: [lo.additional_positions, hi.additional_positions], plantable_now: [lo.plantable_now, hi.plantable_now], not_accessible: [lo.not_accessible_with_basin, hi.not_accessible_with_basin] };
    }) };
  }
  // Gateway: an output is accepted only if it recomputes identically from the snapshot and parameters.
  function verify(ctx, result) {
    try { const again = run(ctx, result.params); return { pass: again.fingerprint === result.fingerprint, fingerprint: again.fingerprint }; }
    catch (e) { return { pass: false, error: e.message }; }
  }

  const SIM2 = { MODEL, ALTERNATIVES, run, alternatives, sensitivity, verify, validate, lengthM };
  if (typeof module !== 'undefined' && module.exports) module.exports = SIM2; else root.CORE_SIM_SIDEWALK = SIM2;
})(typeof globalThis !== 'undefined' ? globalThis : this);
