// Phase 13: offline research workflow over the existing scientific council. No network or action tools.
(function (root) {
  'use strict';
  const SCI = typeof module !== 'undefined' && module.exports ? require('./science.js') : root.CORE_SCIENCE;
  const VERSION = 'core-research-v1';
  const PINS = Object.freeze({
    counts: 'def41e8fd99bbc5c76c2ace8161f4e560544f76c99efb1c69c50f6e96e092169',
    countsFile: 'a5bd5a8c272b1874396b00001d037627433e6355e2b9c5a012ff1d7b3047723f',
    catalog: 'f8d62c3b765081b8680aabdec23c7d2356b167a65a228cea3a6e1bc975aecbd0',
  });
  const object = (v, keys) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(k => keys.includes(k));
  function question(q) {
    if (!object(q, ['version', 'id', 'domain', 'action', 'parameters', 'contribution']) || q.version !== 1 || !/^[a-z0-9-]{2,60}$/.test(q.id || '') || !['synthetic-traffic', 'historical-energy'].includes(q.domain) || q.action !== 'research') throw Error('Question structurée invalide ou action interdite');
    const p = q.parameters;
    if (!object(p, ['factor']) || ![0.8, 1, 1.2].includes(p.factor)) throw Error('Paramètre hors limites');
    if (q.contribution && (!object(q.contribution, ['id', 'revision']) || !/^contribution-[a-z0-9-]{1,50}$/.test(q.contribution.id || '') || !Number.isInteger(q.contribution.revision) || q.contribution.revision < 1 || q.contribution.revision > 32 || q.domain !== 'synthetic-traffic')) throw Error('Lien contribution invalide');
    return JSON.parse(JSON.stringify(q));
  }
  function queue(arrivals, capacity, factor = 1) {
    if (!Array.isArray(arrivals) || !arrivals.length || arrivals.length > 24 || arrivals.some(n => !Number.isSafeInteger(n) || n < 0 || n > 1000) || ![12, 15, 18].includes(capacity) || ![0.8, 1, 1.2].includes(factor)) throw Error('File synthétique hors limites');
    let terminal = 0; const bins = arrivals.map(n => terminal = Math.max(0, terminal + n * factor - capacity));
    return { sum: bins.reduce((a, b) => a + b, 0), terminal, peak: Math.max(...bins), bins };
  }
  const positive = x => { if (!Number.isFinite(x) || x <= 0) throw Error('Positive finite SI quantity required'); return x; };
  const averagePower = (j, s) => positive(positive(j) / positive(s));
  const saganIndex = w => (Math.log10(positive(w)) - 6) / 10;
  function energyScenario(ej, days) {
    const watts = averagePower(positive(ej) * 1e18, positive(days) * 86400);
    return { energyEJ: ej, days, averageWatts: watts, index: saganIndex(watts), convention: 'Sagan interpolation; total energy supply proxy, not useful work', civilizationRank: null, efficacyValidated: false, authorizesRealWorld: false };
  }
  async function run(input, requested) {
    const q = question(requested);
    if (!input || typeof input.countsRaw !== 'string' || typeof input.catalogRaw !== 'string' || input.countsRaw.length > 65536 || input.catalogRaw.length > 65536) throw Error('Sources locales bornées requises');
    if (await SCI.hash(input.catalogRaw) !== PINS.catalog) throw Error('Atlas : empreinte non autorisée');
    if (await SCI.hash(input.countsRaw) !== PINS.countsFile) throw Error('Fixture : empreinte non autorisée');
    const counts = JSON.parse(input.countsRaw), catalog = JSON.parse(input.catalogRaw);
    if (await SCI.hash(JSON.stringify(counts.rows)) !== PINS.counts || counts.manifest?.kind !== 'synthetic-fixture' || counts.manifest?.rights?.license !== 'CORE-SYNTHETIC-FIXTURE' || counts.rows.some(r => r.unit !== 'count' || r.corridor !== 'SYNTHETIC-NOT-SF' || r.sourceId !== 'core-synthetic')) throw Error('Fixture synthétique altérée');
    const energy = catalog.claims.find(c => c.id === 'humanity-historical'), src = catalog.sources.find(s => s.id === 'ei-2025');
    if (!energy?.text.includes('592 EJ') || !energy.sources.includes(src?.id)) throw Error('Valeur énergétique non traçable');
    const gateway = input.registry?.agents?.find(a => a.id === SCI.ROLES.gateway);
    if (gateway?.permission !== 'govern' || gateway.executionMode !== 'deterministic') throw Error('Passerelle absente ou rôle invalide');
    const traffic = q.domain === 'synthetic-traffic', arrivals = counts.rows.map(r => r.count);
    const sources = traffic ? [{ id: 'synthetic-counts', kind: 'synthetic-fixture', url: 'test/fixtures/pilot-synthetic.json', sha256: PINS.counts, hashScope: 'JSON.stringify(rows)', rights: 'CORE-SYNTHETIC-FIXTURE', observedAt: null, warning: 'Invented counts, not measured Howard traffic.' }]
      : catalog.sources.filter(s => ['ei-2025', 'si', 'wright-2023', 'boundaries-2023', 'undp', 'cramer-2021', 'sagan-1973'].includes(s.id)).map(s => ({ id: s.id, kind: s.id === 'ei-2025' ? 'reported-historical' : 'research-reference', url: s.url, citation: s.citation, checkedOn: s.checkedOn, reviewAfterDays: s.reviewAfterDays, sha256: PINS.catalog, hashScope: 'catalog bytes, not remote source authenticity', rights: s.redistribution, locator: s.locator }));
    const options = traffic ? [12, 15, 18].map((capacity, i) => ({ id: ['baseline', 'capacity-15', 'capacity-18'][i], label: ['Capacité 12 / intervalle', 'Capacité 15 / intervalle', 'Capacité 18 / intervalle'][i], capacity, ...queue(arrivals, capacity, q.parameters.factor) }))
      : [1, 0.9, 1.1].map((f, i) => ({ id: ['baseline', 'demand-minus-10', 'supply-plus-10'][i], label: [q.parameters.factor === 1 ? 'Fourniture totale 2024' : 'Référence 2024 × facteur hypothétique', 'Hypothèse −10 % à services inconnus', 'Hypothèse +10 % à impacts inconnus'][i], ...energyScenario(592 * f * q.parameters.factor, 366) }));
    const sensitivity = [0.8, 1, 1.2].map(factor => ({ factor, interpretation: 'assumed stress factor; not confidence interval', options: traffic ? [12, 15, 18].map(capacity => ({ capacity, ...queue(arrivals, capacity, factor) })) : [1, 0.9, 1.1].map(f => energyScenario(592 * f * factor, 366)) }));
    const hypotheses = traffic ? ['H1 : une capacité abstraite accrue réduit la file dans ce modèle.', 'H2 : une hypothèse de demande différente ou des contraintes omises peuvent annuler la pertinence pratique.'] : ['H1 : à durée fixe, la puissance moyenne varie avec la fourniture énergétique.', 'H2 : augmenter K ne démontre aucun progrès humain ; réduire la consommation ne garantit pas les mêmes services.'];
    const objection = traffic ? 'Capacités inventées : aucune configuration de feux, faisabilité, sécurité, délai ou observation terrain ne les valide. La file terminale reste visible ; horizon de deux intervalles seulement.' : 'Fourniture totale ≠ électricité ou exergie. Plus de watts ne démontre ni paix, ni bien-être, ni soutenabilité ; les services rendus et impacts écologiques manquent.';
    const planner = traffic ? SCI.ROLES.planner : 'core.san-francisco.energy.lead';
    const event = (id, agent, kind, claim, respondsTo = null) => ({ id, agent, kind, claim, epistemic: traffic ? 'synthetic-model' : 'derived-historical-scenario', evidence: sources.map(s => s.id), respondsTo });
    const discussion = SCI.council(input.registry, [
      event('R1', planner, 'proposal', traffic ? 'Comparer deux capacités hypothétiques au baseline, avec la même demande et le même horizon.' : 'Comparer le baseline énergétique historique à deux variations hypothétiques, en unités SI.'),
      event('R2', SCI.ROLES.critic, 'dissent', objection, 'R1'),
      event('R3', SCI.ROLES.verifier, 'evidence-review', traffic ? 'Fixture locale identifiée par empreinte ; témoignage synthétique et non corroboré. Pas de calibration.' : '592 EJ concerne 2024 ; année bissextile de 366 jours. Atlas daté ; le passage original Sagan reste partiellement vérifié.', 'R2'),
      event('R4', planner, 'revision', 'Conserver les trois scénarios et l’objection R2. Retirer toute recommandation de mise en œuvre ; demander données, contraintes et revue indépendante.', 'R2'),
    ]);
    if (discussion.some(e => e.evidence.some(id => !sources.some(s => s.id === id)))) throw Error('Citation non résolue');
    const body = { version: VERSION, question: q, title: traffic ? 'Howard 6th–7th : expérience de file entièrement synthétique' : 'Énergie et civilisation : que signifie un changement de puissance ?', runtime: 'deterministic-offline-policy-agents', modelCalls: 0, sources, hypotheses, options, sensitivity, discussion, dissent: ['R2'],
      units: traffic ? 'Somme des files en fin d’intervalle ; unités synthétiques, ni délai ni accidents' : 'EJ par année 2024 ; W moyens = J/s ; K = (log10(P/W) − 6)/10',
      limitations: [objection, 'Reproductibilité et contrôles de provenance ≠ validation indépendante ou causalité.', 'Sensibilités hypothétiques, pas intervalles de confiance.', 'Aucun bénéfice réel, adoption municipale ou autorisation terrain.'],
      gate: { state: 'RESEARCH_REVIEW_ONLY', by: SCI.ROLES.gateway, reproducible: true, calibrated: false, independentReview: false, authorizesRealWorld: false, implementation: 'BLOCKED', checks: ['question-schema', 'pinned-local-inputs', 'role-policies', 'bounded-calculation', 'dissent-preserved'] } };
    return { ...body, fingerprint: await SCI.hash(SCI.stable(body)) };
  }
  async function verify(input, q, bundle) {
    try { const expected = await run(input, q); if (SCI.stable(expected) !== SCI.stable(bundle)) throw Error('Résultat altéré ou non reproductible'); return { state: 'RESEARCH_REVIEW_ONLY', authorizesRealWorld: false, fingerprint: expected.fingerprint }; }
    catch (e) { return { state: 'BLOCKED', authorizesRealWorld: false, issue: e.message }; }
  }
  function report(b) { return `# ${b.title}\n\nMode : ${b.runtime}. ${b.units}.\n\n${b.hypotheses.join('\n\n')}\n\n## Comparaison\n\n${b.options.map(o => `${o.label}: ${'sum' in o ? o.sum + ' ; file terminale ' + o.terminal : o.averageWatts + ' W ; K=' + o.index}`).join('\n\n')}\n\n## Objections et révision\n\n${b.discussion.map(e => `${e.agent} (${e.kind}): ${e.claim}`).join('\n\n')}\n\n## Sources\n\n${b.sources.map(s => `${s.id}: ${s.citation || 'Fixture CORE synthétique'}; ${s.url}; revue ${s.checkedOn || 'fixture sans observation réelle'}; ${s.sha256} (${s.hashScope}); ${s.rights}`).join('\n\n')}\n\n## Limites\n\n${b.limitations.join('\n\n')}\n\nEmpreinte: ${b.fingerprint}\n\nMise en œuvre: BLOCKED. Aucune action réelle autorisée.\n`; }
  const api = { VERSION, PINS, question, queue, averagePower, saganIndex, energyScenario, run, verify, report };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CORE_RESEARCH = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
