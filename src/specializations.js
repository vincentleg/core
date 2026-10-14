// CORE — professional specializations and task routing (Phase 5).
// Separates: specialization (what a professional field covers) ≠ agent profile (identity, permissions, budget)
// ≠ runtime (model-assisted / deterministic / none) ≠ knowledge (approved collection) ≠ tools ≠ evaluations.
// A specialization is executable only through a real runtime; the others are listed with the evidence gap that
// prevents execution. Nothing here inflates the registry: each executable entry points to an existing profile.
(function (root) {
  'use strict';
  const isNode = typeof require === 'function' && typeof module !== 'undefined';
  const F = isNode ? require('./feeds.js') : root.CORE_FEEDS;

  const DOMAINS = [
    ['urban-planning', 'Urbanisme et architecture'], ['civil-structural', 'Génie civil et structures'], ['mobility', 'Transports et mobilité'],
    ['energy', 'Énergie et systèmes électriques'], ['water', 'Eau et assainissement'], ['environment-climate', 'Environnement et climat'],
    ['forestry-biodiversity', 'Biodiversité et foresterie urbaine'], ['building-science', 'Science du bâtiment'], ['housing-land-use', 'Logement et usage des sols'],
    ['health-accessibility', 'Santé publique et accessibilité'], ['economics-finance', 'Économie et finances publiques'], ['administration-regulation', 'Administration publique et réglementation'],
    ['emergency', 'Gestion des urgences'], ['geospatial', 'Analyse géospatiale'], ['data-science', 'Science des données et simulation'],
    ['scientific-validation', 'Validation scientifique'], ['privacy-ethics-security', 'Vie privée, éthique et sécurité'],
  ].map(([id, name]) => ({ id, name }));

  // runtime.kind: 'model-assisted' (local model chooses/words, code computes) | 'deterministic' | 'none'.
  // profile: the registry profile key that executes it. topics: routing vocabulary (normalised, FR/EN).
  const SPECS = [
    { id: 'urban-planning', domain: 'urban-planning', title: 'Urbanisme opérationnel', topics: ['urbanism', 'buildings', 'planning', 'projet', 'zonage', 'permis', 'facade', 'front', 'amenagement'], runtime: 'model-assisted', profile: 'urban-planning-analyst', canRequest: ['accessibility', 'urban-forestry', 'works-coordination'] },
    { id: 'accessibility', domain: 'health-accessibility', title: 'Accessibilité et espace public', topics: ['public_space', 'accessibility', 'trottoir', 'sidewalk', 'cheminement', 'pieton', 'pedestrian', 'accessible', 'ada'], runtime: 'model-assisted', profile: 'accessibility-analyst', canRequest: ['urban-planning', 'urban-forestry'] },
    { id: 'urban-forestry', domain: 'forestry-biodiversity', title: 'Foresterie urbaine', topics: ['nature', 'arbre', 'arbres', 'tree', 'trees', 'plantation', 'canopee', 'fosse', 'abattage'], runtime: 'model-assisted', profile: 'urban-forestry-analyst', canRequest: ['accessibility', 'environment'] },
    { id: 'environment', domain: 'environment-climate', title: 'Environnement et climat', topics: ['environment', 'climate', 'air', 'pollution', 'meteo', 'weather', 'chaleur', 'heat'], runtime: 'model-assisted', profile: 'environmental-analyst', canRequest: ['urban-forestry'] },
    { id: 'energy-infrastructure', domain: 'energy', title: 'Énergie et infrastructures', topics: ['energy', 'infrastructure', 'reseau', 'grid', 'electric', 'telecom', 'excavation', 'travaux', 'works'], runtime: 'model-assisted', profile: 'energy-infrastructure-analyst', canRequest: ['works-coordination'] },
    { id: 'scenario-analysis', domain: 'data-science', title: 'Analyse de scénarios et simulation', topics: ['scenario', 'simulation', 'alternative', 'sensibilite', 'parametre'], runtime: 'model-assisted', profile: 'scenario-analyst', canRequest: [] },
    { id: 'evidence-review', domain: 'scientific-validation', title: 'Revue indépendante des preuves', topics: [], runtime: 'model-assisted', profile: 'evidence-reviewer', canRequest: [], mandatory: true },
    { id: 'works-coordination', domain: 'civil-structural', title: 'Coordination des travaux de voirie', topics: ['excavation', 'travaux', 'permis', 'chaussee'], runtime: 'deterministic', profile: 'works-coordination' },
    { id: 'telecom-works', domain: 'energy', title: 'Travaux télécoms', topics: ['telecom'], runtime: 'deterministic', profile: 'telecom-works' },
    { id: 'building-permits', domain: 'housing-land-use', title: 'Permis de construire', topics: ['buildings', 'permis de construire'], runtime: 'deterministic', profile: 'building-permits' },
    { id: 'energy-benchmarks', domain: 'building-science', title: 'Bilans énergétiques déclarés', topics: ['energy', 'benchmark'], runtime: 'deterministic', profile: 'energy-benchmarks' },
    { id: 'sidewalk-data', domain: 'health-accessibility', title: 'Données de trottoir', topics: ['sidewalk', 'trottoir'], runtime: 'deterministic', profile: 'sidewalks' },
    { id: 'seismic', domain: 'emergency', title: 'Contexte sismique', topics: ['emergency', 'seisme', 'earthquake'], runtime: 'deterministic', profile: 'seismic-context' },
    { id: 'weather-alerts', domain: 'emergency', title: 'Alertes météorologiques', topics: ['climate', 'alerte', 'weather'], runtime: 'deterministic', profile: 'weather-alerts' },
    { id: 'civic-records', domain: 'administration-regulation', title: 'Dossiers municipaux', topics: ['administration', 'legislation'], runtime: 'deterministic', profile: 'civic-records' },
    { id: 'geolinking', domain: 'geospatial', title: 'Liaison géospatiale', topics: [], runtime: 'deterministic', profile: 'graph-linker' },
    { id: 'evidence-verification', domain: 'scientific-validation', title: 'Vérification des références', topics: [], runtime: 'deterministic', profile: 'evidence-verifier' },
    { id: 'data-eligibility', domain: 'privacy-ethics-security', title: 'Éligibilité des données et vie privée', topics: [], runtime: 'deterministic', profile: 'data-policy-reviewer', mandatory: true },
    // Not executable: no public data or no validated tool. Listed so missions can report what is missing.
    { id: 'structural', domain: 'civil-structural', title: 'Ingénierie structurelle', topics: ['structure', 'pont', 'batiment'], runtime: 'none', gap: 'Aucune donnée structurelle ou d’inspection publique intégrée.' },
    { id: 'geotechnical', domain: 'civil-structural', title: 'Géotechnique', topics: ['sol', 'liquefaction', 'seisme'], runtime: 'none', gap: 'Aucune donnée de sol intégrée.' },
    { id: 'traffic', domain: 'mobility', title: 'Ingénierie du trafic', topics: ['mobility', 'trafic', 'traffic'], runtime: 'none', gap: 'Pas de comptages ni de plans de feux observés.' },
    { id: 'transit', domain: 'mobility', title: 'Transports publics', topics: ['mobility', 'transit', 'muni', 'bus'], runtime: 'none', gap: 'GTFS non intégré ; alertes Muni sous clé d’API.' },
    { id: 'water-network', domain: 'water', title: 'Réseaux d’eau et d’assainissement', topics: ['water', 'eau', 'sewer'], runtime: 'none', gap: 'Plans de réseaux non publics (exclus par la politique de données).' },
    { id: 'grid', domain: 'energy', title: 'Réseau de distribution électrique', topics: ['grid', 'reseau electrique'], runtime: 'none', gap: 'Données de réseau non publiques ; seul le mix CAISO (échelle de l’État) est disponible.' },
    { id: 'building-energy-model', domain: 'building-science', title: 'Modélisation énergétique des bâtiments', topics: ['energy'], runtime: 'none', gap: 'Aucun modèle énergétique validé ; bilans déclarés uniquement.' },
    { id: 'ecology', domain: 'forestry-biodiversity', title: 'Écologie urbaine', topics: ['nature', 'biodiversite'], runtime: 'none', gap: 'Aucune donnée de biodiversité intégrée.' },
    { id: 'air-measurement', domain: 'environment-climate', title: 'Mesure de la qualité de l’air', topics: ['air', 'pollution'], runtime: 'none', gap: 'Aucune mesure de capteur intégrée ; la source modélisée est en quarantaine.' },
    { id: 'housing-economics', domain: 'housing-land-use', title: 'Économie du logement', topics: ['housing', 'logement'], runtime: 'none', gap: 'Aucune donnée de marché intégrée.' },
    { id: 'public-finance', domain: 'economics-finance', title: 'Finances publiques', topics: ['economy', 'budget', 'cout'], runtime: 'none', gap: 'Aucune donnée de coût : aucune estimation n’est produite.' },
    { id: 'epidemiology', domain: 'health-accessibility', title: 'Santé publique', topics: ['health', 'sante'], runtime: 'none', gap: 'Aucun indicateur de santé agrégé intégré.' },
    { id: 'emergency-planning', domain: 'emergency', title: 'Planification des urgences', topics: ['emergency', 'urgence'], runtime: 'none', gap: 'Flux du Department of Emergency Management vide.' },
    { id: 'regulatory-law', domain: 'administration-regulation', title: 'Droit de l’urbanisme', topics: ['administration', 'reglement'], runtime: 'none', gap: 'API législative figée depuis 2020.' },
  ];

  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Routing: score executable model-assisted specializations by the mission's domains and question vocabulary,
  // keep the best (budgeted) team, always add the mandatory reviewers, and report relevant non-executable fields.
  function route(target, { maxTeam = 3, modelAvailable = true } = {}) {
    const words = norm(`${target.question || ''} ${(target.domains || []).join(' ')}`), domains = new Set(target.domains || []);
    if (target.segment) ['infrastructure', 'nature', 'buildings', 'public_space', 'urbanism'].forEach(d => domains.add(d));
    if (target.type === 'corridor-planning') ['public_space', 'nature', 'accessibility'].forEach(d => domains.add(d));
    const score = s => s.topics.reduce((n, t) => n + (domains.has(t) ? 2 : 0) + (words.includes(norm(t)) ? 3 : 0), 0);
    const scored = SPECS.filter(s => s.runtime === 'model-assisted' && !s.mandatory && s.id !== 'scenario-analysis').map(s => ({ spec: s, score: score(s) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.spec.id.localeCompare(b.spec.id));
    // Relevance floor: a specialist joins only if it scores at least half of the best match (avoids off-topic agents).
    const top = scored.length ? scored[0].score : 0, team = modelAvailable ? scored.filter(x => x.score * 2 >= top).slice(0, maxTeam) : [];
    const wantsScenario = !!target.segment || target.type === 'corridor-planning' || /scenario|simul|alternative/.test(words);
    const gaps = SPECS.filter(s => s.runtime === 'none' && score(s) > 0).map(s => ({ id: s.id, title: s.title, gap: s.gap }));
    return { team: team.map(x => ({ id: x.spec.id, profile: x.spec.profile, score: x.score, why: x.spec.topics.filter(t => domains.has(t) || words.includes(norm(t))) })),
      scenario: modelAvailable && wantsScenario ? 'scenario-analysis' : null, reviewers: ['evidence-review', 'data-eligibility'], deterministic: SPECS.filter(s => s.runtime === 'deterministic' && score(s) > 0).map(s => s.id), gaps,
      considered: scored.length, rule: `≤ ${maxTeam} spécialistes assistés par modèle choisis par score de domaines et de vocabulaire ; réviseurs obligatoires ajoutés.` };
  }
  const byId = id => SPECS.find(s => s.id === id) || null;
  function counts() { const c = { domains: DOMAINS.length, specializations: SPECS.length }; for (const k of ['model-assisted', 'deterministic', 'none']) c[k] = SPECS.filter(s => s.runtime === k).length; c.domainsWithExecutable = new Set(SPECS.filter(s => s.runtime !== 'none').map(s => s.domain)).size; return c; }

  const SPZ = { DOMAINS, SPECS, route, byId, counts };
  if (typeof module !== 'undefined' && module.exports) module.exports = SPZ; else root.CORE_SPECIALIZATIONS = SPZ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
