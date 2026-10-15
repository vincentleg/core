// Scientific review over the existing city tools. No inference, traffic prediction or real-world control.
(function (root) {
  'use strict';
  const CT = typeof module !== 'undefined' && module.exports ? require('./civ-tools.js') : root.CORE_CIV_TOOLS;
  const VERSION = 'core-science-v1';
  const stable = x => JSON.stringify(x, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
  const hash = async text => [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(x => x.toString(16).padStart(2, '0')).join('');
  const round = n => +n.toFixed(1);
  const PREFIX = 'core.san-francisco.';
  const ROLES = { planner: PREFIX + 'mobility.lead', verifier: PREFIX + 'research.evidence-verifier', critic: PREFIX + 'safety.adversarial-reviewer', gateway: PREFIX + 'governance.gateway' };
  // Shared scientific council trace: role policies, never independent empirical validation.
  function council(registry, events) {
    if (!Array.isArray(events) || events.length < 4 || events.length > 8) throw Error('Conseil hors limites');
    const permissions = { proposal: 'propose', counterproposal: 'analyze', dissent: 'review', 'evidence-review': 'review', revision: 'propose' }, seen = new Set();
    for (const e of events) {
      const agent = registry?.agents?.find(a => a.id === e.agent);
      if (!agent || agent.permission !== permissions[e.kind] || seen.has(e.id) || !e.claim || e.claim.length > 1600 || !e.evidence?.length || e.evidence.length > 30 || e.respondsTo && !seen.has(e.respondsTo)) throw Error('Conseil : rôle, preuve ou fil invalide');
      if (e.kind === 'dissent' && e.agent !== ROLES.critic || e.kind === 'evidence-review' && e.agent !== ROLES.verifier) throw Error('Conseil : revue attribuée au mauvais rôle');
      seen.add(e.id);
    }
    if (!['proposal', 'dissent', 'evidence-review', 'revision'].every(k => events.some(e => e.kind === k))) throw Error('Conseil incomplet');
    return events;
  }
  function parameters(p = {}) {
    const v = { horizon: p.horizon ?? 120, topN: p.topN ?? 5, coordination: p.coordination ?? 0.5, weight: p.weight ?? 'all' };
    if (![60, 120, 180].includes(v.horizon) || ![3, 5, 10].includes(v.topN) || ![0, 0.25, 0.5, 0.75, 1].includes(v.coordination) || !['all', 'severe'].includes(v.weight)) throw Error('Paramètres hors limites');
    return v;
  }
  function analyse(cx, p) {
    const base = CT.TOOLS['decision.interventions'].run(cx, { nhood: 'Tenderloin', ...p });
    if (!base.analysis.rows.length || !(base.analysis.e0 > 0)) throw Error('Référence vide : aucune comparaison valide');
    const [i0, , i2, i3] = base.analysis.options;
    return { baseline: i0.exposure, rows: base.analysis.rows, options: [
      { id: 'I0', label: 'Calendrier autorisé', exposure: i0.exposure, displaced: 0, eligible: true, meaning: 'Référence administrative ; exécution non observée.' },
      { id: 'I2', label: 'Coordination partielle des occupations', exposure: round(i0.exposure - p.coordination * (i0.exposure - i2.exposure)), displaced: 0, eligible: true, meaning: 'Hypothèse : seule la fraction déclarée des chevauchements est mutualisable ; aucun effet sur les accidents prédit.' },
      { id: 'I3', label: 'Report des travaux non urgents', exposure: i3.exposure, displaced: round(i0.exposure - i3.exposure), eligible: false, meaning: 'Charge déplacée hors horizon, pas supprimée. Faisabilité et capacité de rattrapage inconnues : option non recommandable.' },
    ], affectedPermits: { I2: i2.permitsAffected, I3: i3.permitsAffected }, quality: base.quality };
  }
  function debate(cx, registry, result, p) {
    const lookup = id => registry.agents.find(a => a.id === id);
    for (const id of Object.values(ROLES)) if (!lookup(id)) throw Error('Agent manquant : ' + id);
    const works = registry.agents.find(a => a.id.startsWith(PREFIX) && a.tools.includes('works.area-windows') && a.executionMode === 'deterministic');
    if (!works || !['review', 'govern'].includes(lookup(ROLES.verifier).permission) || lookup(ROLES.gateway).permission !== 'govern' || lookup(ROLES.critic).permission !== 'review' || lookup(ROLES.planner).permission !== 'propose') throw Error('Rôles ou permissions incompatibles');
    const refs = result.rows.slice(0, 5).flatMap(r => [{ type: 'record', dataset: 'hin', ref: 'hin:' + r.cnn }, { type: 'record', dataset: 'crashes-agg', ref: 'crashes-agg:' + r.cnn }]);
    const permitRefs = result.rows.flatMap(r => [...(cx.permits.get(r.cnn) || [])].map(x => ({ type: 'record', dataset: 'study-permits', ref: 'study-permits:' + x.properties.record_id }))).slice(0, 10);
    const [i0, i2, i3] = result.options;
    const event = (id, agent, kind, claim, evidence, respondsTo = null) => ({ id, agent, kind, claim, epistemic: 'modeled', evidence, respondsTo });
    // Executable role policies: ranking, feasibility challenge and revision depend on the current computed results.
    const proposed = [...result.options.slice(1)].sort((a, b) => a.exposure - b.exposure || a.id.localeCompare(b.id))[0];
    return council(registry, [
      event('D1', ROLES.planner, 'proposal', `Hypothèse modélisée : l’option ${proposed.id} minimise l’indice dans l’horizon (${proposed.exposure}, référence ${i0.exposure}). Examiner cette proposition.`, refs),
      event('D2', works.id, 'counterproposal', `Hypothèse modélisée : I2 concerne ${result.affectedPermits.I2} permis ; comparer une mutualisation partielle (${p.coordination * 100} %) à la mutualisation totale supposée en Phase 10.`, permitRefs, 'D1'),
      event('D3', ROLES.critic, 'dissent', `Objection modélisée : I3 déplace ${i3.displaced} unités hors horizon ; le total conservé est ${round(i3.exposure + i3.displaced)}. Aucune capacité de rattrapage ni réduction causale d’accidents n’est établie.`, refs, 'D1'),
      event('D4', ROLES.verifier, 'evidence-review', `Revue modélisée : ${refs.length + permitRefs.length} références doivent résoudre ; données datées du ${cx.asOf}, accidents jusqu’au ${cx.data['crashes-agg'].window.to}. Permis autorisés ≠ travaux observés.`, [...refs, ...permitRefs], 'D3'),
      event('D5', ROLES.planner, 'revision', `Révision modélisée : ${i2.exposure < i0.exposure ? 'I2 mérite une étude de faisabilité' : 'conserver I0 ; aucun avantage d’indice pour I2 sous ces hypothèses'}. Retirer I3 des options recommandables ; conserver l’objection D3 et sa charge déplacée.`, [...refs, ...permitRefs], 'D3'),
    ]);
  }
  async function inputs(bundle) {
    if (!bundle || !bundle.manifest || !bundle.raw || !bundle.registry || !bundle.mission) throw Error('Entrées ou preuves manquantes');
    const { manifest, raw, registry, mission } = bundle;
    if (!Number.isFinite(Date.parse(manifest.generated_at)) || manifest.city && manifest.city !== 'san-francisco') throw Error('Ville ou date non valide');
    const required = ['neighborhoods', 'hin', 'crashes-agg', 'permits'];
    const data = {}, sources = [];
    for (const key of required) {
      const d = manifest.datasets.find(d => d.file === key + '.json');
      if (!d || typeof raw[key] !== 'string' || !/^[a-f0-9]{64}$/.test(d.sha256) || await hash(raw[key]) !== d.sha256 || !Number.isFinite(Date.parse(d.retrieved_at)) || !/^https:\/\/data\.sf\.gov\//.test(d.page) || !d.provider || !d.note || !/PDDL/.test(d.license?.name || '')) throw Error('Preuve, provenance ou empreinte invalide : ' + key);
      data[key] = JSON.parse(raw[key]);
      sources.push({ dataset: key, provider: d.provider, url: d.page, retrievedAt: d.retrieved_at, sha256: d.sha256, kind: d.kind, modifications: d.note, licence: d.license.name });
    }
    if (!data['crashes-agg'].rows.every(r => Number.isFinite(r.n) && r.n >= 0) || !Number.isFinite(Date.parse(data['crashes-agg'].window?.to))) throw Error('Comptages ou période invalides');
    if (!data.hin.features.every(f => Number.isFinite(f.properties.length_mi) && f.properties.length_mi > 0)) throw Error('Longueur non valide');
    const cx = CT.context({ manifest, data, city: 'san-francisco' });
    if (!cx.nh.has('Tenderloin') || !data.permits.features.every(f => Number.isFinite(CT.window(cx, f).s) && Number.isFinite(CT.window(cx, f).e) && CT.window(cx, f).e >= CT.window(cx, f).s)) throw Error('Zone ou calendrier invalide');
    if (mission.workflow !== 'decision-safety-works' || mission.city !== 'san-francisco' || mission.nhood !== 'Tenderloin' || mission.state !== 'HUMAN_REVIEW' || !mission.review?.recommendation?.ok || !mission.decisionAnalysis || mission.model?.calls !== 0) throw Error('Mission source non vérifiable');
    const expected = CT.TOOLS['decision.interventions'].run(cx, { nhood: 'Tenderloin' });
    if (stable(expected.analysis.options) !== stable(mission.decisionAnalysis.options) || stable(expected.sensitivity) !== stable(mission.decisionAnalysis.sensitivity)) throw Error('Mission source non reproductible');
    return { cx, sources, registry, mission };
  }
  async function run(bundle, requested = {}) {
    const { cx, sources, registry, mission } = await inputs(bundle), p = parameters(requested), result = analyse(cx, p), discussion = debate(cx, registry, result, p);
    for (const e of discussion) if (!e.evidence.length || e.evidence.some(r => !CT.resolve(cx, r))) throw Error('Référence de débat manquante');
    const reviewed = CT.review(cx, discussion.map(e => ({ ...e, topic: 'scientific' })), null);
    if (reviewed.rejected.length) throw Error('Revue des preuves rejetée');
    const sensitivity = [];
    for (const horizon of [60, 120, 180]) for (const weight of ['all', 'severe']) for (const coordination of [0, 0.5, 1]) {
      const a = analyse(cx, { ...p, horizon, weight, coordination }); sensitivity.push({ horizon, weight, coordination, baseline: a.baseline, coordinated: a.options[1].exposure, displaced: a.options[2].displaced });
    }
    const dossier = { version: VERSION, city: 'san-francisco', neighborhood: 'Tenderloin', sourceMission: mission.id, sourceMissionSha256: await hash(stable(mission)), snapshot: cx.manifest.generated_at,
      objective: 'Comparer la charge administrative de travaux sur le réseau HIN ; préparer une expérience de coordination, sans prédire le trafic ni les accidents.',
      metric: 'Indice exploratoire = accidents déclarés / km / an (5 ans) × jours-permis autorisés ; unités conventionnelles, pas des accidents attendus.',
      parameters: p, sources, result, discussion, sensitivity, dissent: ['D3'], modelCalls: 0,
      recommendation: { option: result.options[1].exposure < result.baseline ? 'I2' : 'I0', kind: 'Étude de faisabilité uniquement', excluded: ['I3'], constraints: ['Urgences préservées', 'Aucun report recommandé sans capacité de rattrapage vérifiée', 'Aucune mise en œuvre sans autorisation humaine'] },
      assumptions: ['Association descriptive, pas de lien causal calibré.', 'La coordination mutualisable est une hypothèse, pas une mesure.', 'Un report déplace la charge ; il ne démontre aucun bénéfice durable.', 'Les fenêtres autorisées ne prouvent ni exécution ni occupation réelle.', 'Aucun débit, délai de trafic, coût ou gain réel n’est mesuré.'],
      validation: ['Faire confirmer par les services les permis, urgences, contraintes de réseaux et compatibilités de travaux.', 'Préenregistrer un protocole : occupation réelle en jours, accessibilité piétonne et délais de circulation ; seuils fixés par les ingénieurs avant mesure.', 'Mesurer une référence et des sites témoins comparables ; relever les facteurs de confusion et la saisonnalité.', 'Pilote autorisé par humains uniquement ; audits accessibilité et sécurité, critères d’arrêt, suivi de charge après horizon.', 'Publier résultats nuls/négatifs, intervalles d’incertitude et données agrégées ; aucune attribution causale sans protocole adapté.'],
      gate: { state: 'HUMAN_REVIEW', authorizes: false, implementation: 'BLOCKED', implementationIssues: ['Faisabilité administrative et technique non vérifiée', 'Effets réels non calibrés ; validation de terrain et autorisation humaine requises'], by: ROLES.gateway, checks: ['sources-hashed', 'references-resolved', 'source-mission-recomputed', 'bounded-sensitivity', 'dissent-preserved', 'displacement-explicit'] } };
    dossier.fingerprint = await hash(stable(dossier)); return dossier;
  }
  async function verify(bundle, dossier) {
    try {
      const expected = await run(bundle, dossier?.parameters);
      if (stable(expected) !== stable(dossier)) throw Error('Dossier altéré ou résultat non reproductible');
      return { state: 'HUMAN_REVIEW', authorizes: false, fingerprint: expected.fingerprint, issues: [] };
    } catch (e) { return { state: 'BLOCKED', authorizes: false, issues: [e.message] }; }
  }
  const api = { VERSION, ROLES, council, parameters, stable, hash, run, verify };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CORE_SCIENCE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
