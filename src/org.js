// CORE — agent organization and registry (Phase 3).
// Hierarchy: global coordination → city organization → departments → specialist agents → independent
// verification and governance. A profile is an identity with declared competencies, allowed tools and a
// permission level; it is NOT a running model. Only profiles whose tools exist in src/tools.js are executable.
// Role labels describe intended competencies, never professional licences or legal qualifications.
(function (root) {
  'use strict';
  const REGISTRY_VERSION = 'core-agent-registry-v1';
  const PERMISSIONS = ['read', 'analyze', 'propose', 'review', 'govern']; // ascending; never self-elevated
  const DISCLAIMER = 'Libellé de compétence visée ; aucune qualification professionnelle, licence ou habilitation légale.';

  // department id, name, CORE domains it serves
  const DEPARTMENTS = [
    ['architecture', 'Architecture et design urbain', ['buildings', 'public_space']], ['civil', 'Génie civil', ['infrastructure']],
    ['electrical', 'Génie électrique', ['energy', 'infrastructure']], ['energy', 'Systèmes énergétiques', ['energy']],
    ['building-systems', 'Systèmes du bâtiment', ['buildings', 'energy']], ['mechanical', 'Génie mécanique', ['buildings']],
    ['water', 'Eau et assainissement', ['infrastructure']], ['mobility', 'Transports et mobilité', ['infrastructure', 'events', 'mobility']],
    ['transit', 'Transports publics', ['infrastructure', 'mobility']], ['ecology', 'Écologie et biodiversité', ['nature']],
    ['forestry', 'Foresterie urbaine', ['nature']], ['environmental', 'Génie environnemental', ['nature', 'climate']],
    ['climate', 'Climat et résilience', ['events', 'nature', 'climate', 'emergency']], ['geotech', 'Géologie et géotechnique', ['infrastructure', 'emergency']],
    ['housing', 'Logement et usage des sols', ['buildings']], ['health', 'Santé publique', ['society', 'health']],
    ['economics', 'Économie et finances', ['society', 'economy']], ['administration', 'Administration publique', ['events', 'administration']],
    ['regulatory', 'Recherche réglementaire et juridique', ['events', 'administration']], ['social', 'Sciences sociales et impacts communautaires', ['society', 'culture']],
    ['public-space', 'Espace public et accessibilité', ['public_space']], ['digital', 'Infrastructures numériques', ['infrastructure']],
    ['telecom', 'Télécommunications', ['infrastructure']], ['cybersecurity', 'Cybersécurité', ['infrastructure']],
    ['data-science', 'Science des données', []], ['simulation', 'Simulation et modélisation', []],
    ['research', 'Recherche et vérification des preuves', []], ['safety', 'Sûreté et revue adversariale', []],
  ].map(([id, name, domains]) => ({ id, name, domains }));

  // Specialists. tools: ids from src/tools.js. A specialist without tools is registered but unavailable.
  const SPECIALISTS = [
    { key: 'works-coordination', dept: 'civil', role: 'Analyste de coordination des travaux de voirie', spec: 'Fenêtres de permis d’excavation, chevauchements, contraintes de planification', tools: ['works.windows', 'works.area-windows'], perm: 'analyze', knowledge: ['k-street-use-permits', 'k-coordination-method'] },
    { key: 'telecom-works', dept: 'telecom', role: 'Analyste des travaux de télécommunications', spec: 'Permis d’opérateurs télécoms sur la voirie (classement déclaré des titulaires)', tools: ['works.telecom'], perm: 'analyze', knowledge: ['k-street-use-permits'] },
    { key: 'street-trees', dept: 'forestry', role: 'Spécialiste des arbres d’alignement', spec: 'Inventaire des arbres, avis d’abattage, proximité des travaux', tools: ['trees.near-works'], perm: 'analyze', knowledge: ['k-street-trees', 'k-tree-removals', 'k-proximity-indicator'] },
    { key: 'building-permits', dept: 'housing', role: 'Analyste des permis de construire', spec: 'Activité DBI au front des tronçons ; limites du statut « issued »', tools: ['buildings.frontage'], perm: 'analyze', knowledge: ['k-building-permits', 'k-dbi-issued-status'] },
    { key: 'energy-benchmarks', dept: 'energy', role: 'Analyste des bilans énergétiques déclarés', spec: 'Rapports de l’ordonnance sur la performance énergétique des bâtiments existants', tools: ['energy.benchmarks'], perm: 'analyze', knowledge: ['k-energy-ordinance'] },
    { key: 'sidewalks', dept: 'public-space', role: 'Analyste espace public et trottoirs', spec: 'Largeurs de trottoir (étude 2014), parcs proches', tools: ['public-space.sidewalks'], perm: 'analyze', knowledge: ['k-sidewalk-widths'] },
    { key: 'seismic-context', dept: 'climate', role: 'Analyste du contexte sismique', spec: 'Séismes USGS proches et actifs du corridor (sans données structurelles)', tools: ['resilience.quake-context'], perm: 'analyze', knowledge: ['k-usgs-feed', 'k-no-structural-data'] },
    { key: 'weather-alerts', dept: 'climate', role: 'Analyste des alertes météorologiques', spec: 'Alertes NWS actives pour San Francisco (prévisions, non observations)', tools: ['resilience.weather-alerts'], perm: 'analyze', knowledge: ['k-nws-alerts'] },
    { key: 'civic-records', dept: 'administration', role: 'Analyste des dossiers municipaux', spec: 'Législation du Board of Supervisors (Legistar) : type, statut, dates, sans jugement politique', tools: ['civic.legislation'], perm: 'analyze', knowledge: ['k-legistar', 'k-neutrality'] },
    { key: 'graph-linker', dept: 'data-science', role: 'Analyste de liaison du graphe', spec: 'Géolocalisation des évènements et liaison au graphe de connaissances', tools: ['graph.link'], perm: 'analyze', knowledge: ['k-graph-bases'] },
    { key: 'scenario-evaluator', dept: 'simulation', role: 'Évaluateur de scénarios', spec: 'Investigation inter-domaines déterministe et alternatives R0–R2', tools: ['scenario.investigate'], perm: 'analyze', knowledge: ['k-coordination-method', 'k-proximity-indicator'] },
    { key: 'knowledge-research', dept: 'regulatory', role: 'Chargé de recherche documentaire', spec: 'Recherche dans la bibliothèque de connaissances approuvée', tools: ['knowledge.retrieve'], perm: 'read', knowledge: ['k-coordination-method', 'k-neutrality'] },
    { key: 'evidence-verifier', dept: 'research', role: 'Vérificateur de preuves', spec: 'Sommes SHA-256, existence des enregistrements, dates, statut des sources', tools: ['evidence.verify', 'data.freshness'], perm: 'review', knowledge: ['k-provenance'], independent: true },
    { key: 'adversarial-reviewer', dept: 'safety', role: 'Réviseur adversarial', spec: 'Désaccords, sensibilités, preuves manquantes', tools: ['adversarial.review'], perm: 'review', knowledge: ['k-proximity-indicator', 'k-dbi-issued-status'], independent: true },
    // Phase 4 — model-assisted specialists: a local open-weight model (Ollama) chooses which permitted deterministic
    // tools to call and writes structured interpretations that are validated against the returned evidence.
    // They run only while a local model is reachable; otherwise they are reported as unavailable.
    { key: 'urban-planning-analyst', dept: 'housing', mode: 'llm', role: 'Analyste en urbanisme (assisté par modèle)', spec: 'Projets Planning, permis de construire, espace public et travaux au front d’un tronçon', tools: ['planning.records', 'buildings.frontage', 'public-space.sidewalks', 'works.windows', 'knowledge.search'], perm: 'analyze', knowledge: ['k-building-permits', 'k-dbi-issued-status', 'k-sidewalk-widths', 'k-coordination-method', 'k-provenance'] },
    { key: 'environmental-analyst', dept: 'environmental', mode: 'llm', role: 'Analyste environnemental (assisté par modèle)', spec: 'Arbres d’alignement, qualité de l’air modélisée, alertes météo, proximité des travaux', tools: ['trees.near-works', 'air.quality', 'resilience.weather-alerts', 'knowledge.search'], perm: 'analyze', knowledge: ['k-street-trees', 'k-tree-removals', 'k-proximity-indicator', 'k-air-quality-model', 'k-nws-alerts'] },
    { key: 'energy-infrastructure-analyst', dept: 'energy', mode: 'llm', role: 'Analyste énergie et infrastructures (assisté par modèle)', spec: 'Bilans énergétiques déclarés, mix du réseau CAISO, travaux d’excavation et télécoms', tools: ['energy.benchmarks', 'grid.mix', 'works.windows', 'works.telecom', 'knowledge.search'], perm: 'analyze', knowledge: ['k-energy-ordinance', 'k-caiso-outlook', 'k-street-use-permits', 'k-coordination-method'] },
    { key: 'scenario-analyst', dept: 'simulation', mode: 'llm', role: 'Analyste de scénarios (assisté par modèle)', spec: 'Propose des paramètres bornés ; seuls les modèles déterministes validés calculent', tools: ['scenario.evaluate', 'sim.sidewalk-capacity', 'knowledge.search'], perm: 'analyze', knowledge: ['k-coordination-method', 'k-proximity-indicator', 'k-simulation-integrity'] },
    // Phase 5: accessibility and urban forestry specialists (sidewalk × tree simulation) and a deterministic data-eligibility reviewer.
    { key: 'accessibility-analyst', dept: 'public-space', mode: 'llm', role: 'Analyste accessibilité et espace public (assisté par modèle)', spec: 'Largeurs de trottoir, cheminement piéton accessible, classes Better Streets Plan, contraintes d’aménagement', tools: ['public-space.sidewalks', 'sim.sidewalk-capacity', 'buildings.frontage', 'knowledge.search'], perm: 'analyze', knowledge: ['k-sidewalk-widths', 'k-simulation-integrity', 'k-provenance'] },
    { key: 'urban-forestry-analyst', dept: 'forestry', mode: 'llm', role: 'Analyste en foresterie urbaine (assisté par modèle)', spec: 'Inventaire des arbres, fosses, emplacements de plantation, avis d’abattage, coordination avec les travaux', tools: ['trees.near-works', 'sim.sidewalk-capacity', 'works.windows', 'knowledge.search'], perm: 'analyze', knowledge: ['k-street-trees', 'k-tree-removals', 'k-proximity-indicator', 'k-simulation-integrity'] },
    { key: 'data-policy-reviewer', dept: 'cybersecurity', role: 'Réviseur d’éligibilité des données et de vie privée', spec: 'Vérifie que chaque preuve provient d’une source éligible de la politique de données (licence, sensibilité, usage permis)', tools: ['policy.check'], perm: 'review', knowledge: ['k-provenance'], independent: true },
    { key: 'evidence-reviewer', dept: 'research', mode: 'llm', role: 'Réviseur de preuves indépendant (assisté par modèle)', spec: 'Contrôle les interprétations des autres agents contre le registre de preuves', tools: ['evidence.check', 'knowledge.search'], perm: 'review', knowledge: ['k-provenance', 'k-proximity-indicator', 'k-dbi-issued-status', 'k-simulation-integrity'], independent: true },
    // Registered but not executable: no tool and/or no data yet. Shown as unavailable, never as active.
    { key: 'geotechnical', dept: 'geotech', role: 'Ingénieur géotechnique (compétence visée)', spec: 'Sols, liquéfaction', tools: [], perm: 'analyze', knowledge: [], gap: 'Aucune donnée de sol ou de sous-sol intégrée.' },
    { key: 'grid', dept: 'electrical', role: 'Ingénieur réseau électrique (compétence visée)', spec: 'Réseau de distribution', tools: [], perm: 'analyze', knowledge: [], gap: 'Aucune donnée de réseau électrique publique intégrée.' },
    { key: 'water-network', dept: 'water', role: 'Analyste risque d’inondation et eaux pluviales', spec: 'Zone de risque de tempête centennale (SFPUC 2022, modélisée) croisée avec les travaux de voirie ; aucune donnée de réseau d’eau souterrain', tools: ['flood.exposure'], perm: 'analyze', knowledge: [] },
    { key: 'transit-planner', dept: 'transit', role: 'Planificateur de transports publics (compétence visée)', spec: 'Lignes Muni', tools: [], perm: 'analyze', knowledge: [], gap: 'GTFS non intégré.' },
    { key: 'traffic', dept: 'mobility', role: 'Analyste sécurité routière', spec: 'Accidents avec blessés agrégés par tronçon (5 ans) sur le réseau à forte accidentalité (HIN 2024) ; pas de comptages de trafic ni de plans de feux', tools: ['safety.crash-profile'], perm: 'analyze', knowledge: [] },
    { key: 'biodiversity', dept: 'ecology', role: 'Écologue (compétence visée)', spec: 'Biodiversité', tools: [], perm: 'analyze', knowledge: [], gap: 'Aucune donnée de biodiversité intégrée.' },
    { key: 'air-quality', dept: 'environmental', role: 'Analyste qualité de l’air (compétence visée)', spec: 'Exposition aux polluants', tools: [], perm: 'analyze', knowledge: [], gap: 'APEZ identifié mais non intégré ; aucune mesure.' },
    { key: 'urban-design', dept: 'architecture', role: 'Urbaniste-concepteur (compétence visée)', spec: 'Formes urbaines', tools: [], perm: 'analyze', knowledge: [], gap: 'Pas d’outil de conception.' },
    { key: 'mechanical-systems', dept: 'mechanical', role: 'Ingénieur mécanique (compétence visée)', spec: 'CVC', tools: [], perm: 'analyze', knowledge: [], gap: 'Aucune donnée d’équipements.' },
    { key: 'building-systems-eng', dept: 'building-systems', role: 'Ingénieur systèmes du bâtiment (compétence visée)', spec: 'Enveloppe, systèmes', tools: [], perm: 'analyze', knowledge: [], gap: 'Seuls les bilans déclarés sont disponibles.' },
    { key: 'public-health', dept: 'health', role: 'Analyste santé publique (compétence visée)', spec: 'Indicateurs environnementaux de santé', tools: [], perm: 'analyze', knowledge: [], gap: 'Aucun indicateur agrégé intégré.' },
    { key: 'economist', dept: 'economics', role: 'Économiste urbain (compétence visée)', spec: 'Coûts, financement', tools: [], perm: 'analyze', knowledge: [], gap: 'Aucune donnée de coût ; aucune estimation produite.' },
    { key: 'community-impacts', dept: 'social', role: 'Analyste des impacts communautaires (compétence visée)', spec: 'Équité, données agrégées', tools: [], perm: 'analyze', knowledge: [], gap: 'Aucune donnée sociale intégrée ; jamais de données individuelles.' },
    { key: 'digital-infra', dept: 'digital', role: 'Analyste infrastructures numériques (compétence visée)', spec: 'Réseaux numériques', tools: [], perm: 'analyze', knowledge: [], gap: 'Aucune donnée intégrée.' },
    { key: 'cyber', dept: 'cybersecurity', role: 'Analyste cybersécurité (compétence visée)', spec: 'Sécurité des systèmes', tools: [], perm: 'analyze', knowledge: [], gap: 'Hors périmètre des données publiques actuelles.' },
  ];

  const BUDGET = { maxTasks: 4, maxMs: 4000, maxRecords: 20000 };
  const DEPT_CODE = { architecture: 'ARC', civil: 'CIV', electrical: 'ELC', energy: 'ENG', 'building-systems': 'BLD', mechanical: 'MEC', water: 'WAT', mobility: 'TRF', transit: 'TRN', ecology: 'ECO',
    forestry: 'FOR', environmental: 'ENV', climate: 'CLI', geotech: 'GEO', housing: 'HSG', health: 'HLT', economics: 'ECN', administration: 'ADM', regulatory: 'REG', social: 'SOC',
    'public-space': 'PUB', digital: 'DIG', telecom: 'TEL', cybersecurity: 'SEC', 'data-science': 'DAT', simulation: 'SIM', research: 'RES', safety: 'SAF' };

  function buildRegistry(city = { id: 'san-francisco', name: 'San Francisco', scope: 'Folsom/Howard 2nd–11th (corridor laboratoire)' }) {
    const agents = [];
    const add = a => { agents.push(Object.freeze({ disclaimer: DISCLAIMER, missionHistory: [], evaluationHistory: [], knowledgeVersion: null, budget: BUDGET, ...a })); };
    add({ id: 'core.global.coordinator', scope: { level: 'global' }, department: null, role: 'Coordination globale CORE', specialization: 'Routage des villes et politiques communes', competencies: [], knowledge: ['k-neutrality', 'k-provenance'], tools: [], permission: 'govern', supervisor: null, executionMode: 'coordination-only', status: 'registered' });
    add({ id: `core.${city.id}.manager`, scope: { level: 'city', city: city.id, area: city.scope }, department: null, role: `Coordination de la ville — ${city.name}`, specialization: 'Planification de missions, recrutement, synthèse (sans autorité factuelle supérieure)', competencies: [{ id: 'mission-planning', basis: 'declared' }], knowledge: ['k-neutrality', 'k-provenance'], tools: ['mission.plan'], permission: 'propose', supervisor: 'core.global.coordinator', executionMode: 'deterministic', status: 'available' });
    for (const d of DEPARTMENTS) add({ id: `core.${city.id}.${d.id}.lead`, scope: { level: 'department', city: city.id }, department: d.id, role: `Direction — ${d.name}`, specialization: `Coordination du département ; domaines ${d.domains.join(', ') || 'transverses'}`, competencies: [], knowledge: [], tools: [], permission: 'propose', supervisor: `core.${city.id}.manager`, executionMode: 'coordination-only', status: 'registered' });
    for (const s of SPECIALISTS) add({ id: `core.${city.id}.${s.dept}.${s.key}`, scope: { level: 'specialist', city: city.id, area: city.scope }, department: s.dept, role: s.role, specialization: s.spec,
      competencies: s.tools.map(t => ({ id: t, basis: 'declared' })), knowledge: s.knowledge, tools: s.tools, permission: s.perm, supervisor: `core.${city.id}.${s.dept}.lead`,
      executionMode: s.mode === 'llm' ? 'llm' : s.tools.length ? 'deterministic' : 'unavailable', status: s.mode === 'llm' ? 'requires-local-model' : s.tools.length ? 'available' : 'unavailable', independent: !!s.independent, gap: s.gap || null,
      model: s.mode === 'llm' ? { provider: 'ollama', name: 'qwen3:8b', role: 'choix des outils et interprétation structurée ; jamais de calcul numérique ni de décision' } : null });
    add({ id: `core.${city.id}.governance.gateway`, scope: { level: 'governance', city: city.id }, department: 'safety', role: 'Passerelle de décision (gouvernance indépendante)', specialization: 'Recalcul déterministe, échec fermé, revue humaine obligatoire', competencies: [], knowledge: ['k-provenance'], tools: ['decision.gateway'], permission: 'govern', supervisor: null, executionMode: 'deterministic', status: 'available', independent: true });
    // Phase 7: stable machine identifiers (CORE-<DEPT>-<NNNN>), deterministic from department and registry order.
    const out = agents.map((a, i) => Object.freeze({ ...a, code: `CORE-${DEPT_CODE[a.department] || (a.scope.level === 'global' ? 'CMD' : a.scope.level === 'city' ? 'CTY' : a.scope.level === 'governance' ? 'GOV' : 'GEN')}-${String(i + 1).padStart(4, '0')}` }));
    return { version: REGISTRY_VERSION, city, departments: DEPARTMENTS, agents: out };
  }

  // Indexes make lookups O(1) whatever the number of profiles (designed for thousands per city).
  function index(registry) {
    const byId = new Map(), byDept = new Map(), byTool = new Map(), byDomain = new Map();
    const deptDomains = new Map(registry.departments.map(d => [d.id, d.domains]));
    for (const a of registry.agents) {
      byId.set(a.id, a);
      if (a.department) { if (!byDept.has(a.department)) byDept.set(a.department, []); byDept.get(a.department).push(a); }
      for (const t of a.tools) { if (!byTool.has(t)) byTool.set(t, []); byTool.get(t).push(a); }
      for (const dom of deptDomains.get(a.department) || []) { if (!byDomain.has(dom)) byDomain.set(dom, []); byDomain.get(dom).push(a); }
    }
    return { byId, byDept, byTool, byDomain };
  }
  function counts(registry) {
    const a = registry.agents;
    return { registered: a.length, executable: a.filter(x => x.executionMode === 'deterministic').length, coordinationOnly: a.filter(x => x.executionMode === 'coordination-only').length,
      unavailable: a.filter(x => x.executionMode === 'unavailable').length, departments: registry.departments.length, llm: a.filter(x => x.executionMode === 'llm').length };
  }
  const canUse = (agent, tool, required) => agent.tools.includes(tool) && PERMISSIONS.indexOf(agent.permission) >= PERMISSIONS.indexOf(required);

  const ORG = { REGISTRY_VERSION, PERMISSIONS, DISCLAIMER, DEPARTMENTS, DEPT_CODE, SPECIALISTS, buildRegistry, index, counts, canUse };
  if (typeof module !== 'undefined' && module.exports) module.exports = ORG; else root.CORE_ORG = ORG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
