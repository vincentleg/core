// CORE — scientific decision dossier (Phase 5). Assembled deterministically from a cognitive mission record and,
// optionally, a simulation run. Every quantitative line carries its source: an evidence id (E#, produced by code over
// public data) or a computation fingerprint (re-verifiable). Model text is labelled as model interpretation.
// validate() re-checks that every number in the dossier comes from a cited evidence item or a simulation output.
(function (root) {
  'use strict';
  const isNode = typeof require === 'function' && typeof module !== 'undefined';
  const LLM = isNode ? require('./llm.js') : root.CORE_LLM;
  const SIMS = isNode ? require('./sim-sidewalk.js') : root.CORE_SIM_SIDEWALK;
  const SEM = isNode ? require('./semantic.js') : root.CORE_SEMANTIC;
  const short = id => String(id || '').split('.').pop();
  const EPI = { observed: 'observé', reported: 'rapporté', derived: 'dérivé', hypothesis: 'hypothèse', simulated: 'simulé (modèle déterministe)' };

  function build(mc, { simulation = null } = {}) {
    if (!mc || !mc.evidence) throw new TypeError('mission invalide');
    const live = (mc.board || []).filter(b => !b.supersededBy), ev = id => mc.evidence.find(e => e.id === id);
    const cited = [...new Set(live.flatMap(b => b.cites))].map(ev).filter(Boolean);
    const observations = mc.evidence.filter(e => ['observed', 'reported', 'derived'].includes(e.epistemic) && !/^knowledge/.test(e.topic));
    const d = {
      version: 'core-decision-dossier-v1', mission: mc.id, mode: mc.mode || 'deep', model: mc.model ? `${mc.model.provider}:${mc.model.name}` : null,
      execution: mc.recorded ? `exécution réelle enregistrée le ${String(mc.recorded.at).slice(0, 16).replace('T', ' ')} (${mc.recorded.by})` : 'exécution dans cette session',
      issue: { question: mc.target.question, location: mc.target.label || mc.target.segment || 'corridor Folsom / Howard', event: mc.target.item || null },
      dates: { snapshot: mc.brief && mc.brief.sources.snapshot, feedUpdate: mc.brief && mc.brief.sources.feedUpdate, knowledge: mc.brief && mc.brief.sources.knowledge },
      observations: observations.slice(0, 14).map(e => ({ id: e.id, nature: EPI[e.epistemic] || e.epistemic, text: e.claim, source: (e.evidence || []).slice(0, 3).map(r => r.url || r.ref) })),
      specialists: [...new Set([...(mc.agents || [])])].map(a => ({ id: a, role: short(a), statements: live.filter(b => b.agent === a).length })),
      evidenceConsulted: { total: mc.evidence.length, cited: cited.length, byNature: mc.evidence.reduce((m, e) => (m[e.epistemic] = (m[e.epistemic] || 0) + 1, m), {}) },
      hypotheses: live.filter(b => b.kind === 'hypothesis').map(b => ({ id: b.id, by: short(b.agent), text: b.statement, cites: b.cites, label: 'interprétation du modèle — validée contre les preuves, non autoritative' })),
      interpretations: live.filter(b => b.kind === 'interpretation').map(b => ({ id: b.id, by: short(b.agent), text: b.statement, cites: b.cites, label: 'interprétation du modèle — validée contre les preuves, non autoritative' })),
      disagreements: (mc.disagreements || []).map(x => ({ id: x.id, between: x.between.map(short), about: x.about, text: x.statement, resolved: x.resolved, cites: x.cites })),
      simulations: [
        ...mc.evidence.filter(e => e.epistemic === 'simulated').map(e => ({ id: e.id, text: e.claim, tool: e.tool })),
        ...(simulation ? [{ id: `SIM:${simulation.fingerprint}`, text: `${SIMS.MODEL.id} v${SIMS.MODEL.version} (${SIMS.MODEL.status}, non calibré) — ${simulation.totals.additional_positions} emplacements, ${simulation.totals.plantable_now} plantables maintenant, ${simulation.totals.deferred_for_works} reportés, ${simulation.totals.not_accessible_with_basin} tronçons sans cheminement suffisant ; paramètres ${JSON.stringify(simulation.params)}`, fingerprint: simulation.fingerprint }] : []),
      ],
      assumptions: [...((mc.brief && mc.brief.assumptions) || []), ...(simulation ? SIMS.MODEL.assumptions : [])],
      uncertainty: [...((mc.brief && mc.brief.uncertainty) || []), ...(mc.abstentions || []).map(a => `${short(a.agent)} s’abstient : ${a.reason}`)],
      risks: live.filter(b => b.kind === 'concern').map(b => ({ id: b.id, by: short(b.agent), text: b.statement, cites: b.cites })),
      missingEvidence: [...(mc.requests || []).filter(q => q.status !== 'fulfilled').map(q => `${q.need} (${q.status === 'unfulfillable' ? 'aucune source CORE' : q.status})`), ...((mc.brief && mc.brief.missingData) || []), ...(simulation ? SIMS.MODEL.neededForOperationalUse : []), ...(mc.unavailable || []).map(u => `${u.role} : ${u.gap}`)].filter((x, i, a) => a.indexOf(x) === i),
      nextSteps: mc.decision && mc.decision.state === 'ÉLIGIBLE À LA REVUE HUMAINE' ? ['Revue humaine de la note ; vérification de terrain avant toute action.'] : ['Obtenir les preuves manquantes listées ci-dessus avant toute conclusion.', 'Revue humaine obligatoire ; aucune action n’est autorisée par CORE.'],
      decision: mc.decision ? { state: mc.decision.state, reason: mc.decision.reason, authorizes: false, checks: mc.decision.checks.map(c => ({ id: c.id, pass: c.pass })) } : null,
      humanReview: 'Revue humaine obligatoire. CORE ne décide, n’autorise ni n’exécute rien ; les interprétations du modèle ne sont pas des faits établis.',
      rejectedModelOutputs: (mc.rejected || []).length,
      performance: mc.metrics ? { wallMs: mc.metrics.wallMs, modelCalls: mc.metrics.modelCalls, tokens: mc.metrics.promptTokens + mc.metrics.outputTokens } : null,
    };
    d.validation = validate(d, mc, simulation);
    return d;
  }

  // Every number written in a model-authored or quantitative line must appear in its cited evidence or simulation output.
  function validate(d, mc, simulation) {
    const ev = id => mc.evidence.find(e => e.id === id), problems = [];
    for (const group of ['hypotheses', 'interpretations', 'risks', 'disagreements']) for (const x of d[group]) {
      const src = (x.cites || []).map(ev).filter(Boolean).map(e => e.claim).join(' ');
      if (!x.cites || !x.cites.length || x.cites.some(c => !ev(c))) problems.push(`${x.id} : citation invalide`);
      const nums = LLM.unsupportedNumbers(String(x.text).replace(/\b[EARDQ]\d+\b/g, ''), src); if (nums.length) problems.push(`${x.id} : nombres sans source (${nums.join(', ')})`);
      const sem = SEM.check(x.text, { kind: group === 'hypotheses' ? 'hypothesis' : group === 'risks' || group === 'disagreements' ? 'concern' : 'interpretation', evidence: (x.cites || []).map(ev).filter(Boolean), target: { label: mc.target.label || '' }, places: mc.places || [] });
      if (sem) problems.push(`${x.id} : [${sem.class}] ${sem.reason}`);
    }
    for (const s of d.simulations) if (s.fingerprint && simulation && s.fingerprint !== simulation.fingerprint) problems.push(`${s.id} : empreinte incohérente`);
    return { pass: problems.length === 0, problems, rule: 'Chaque nombre provient d’une preuve citée (E#) ou d’un calcul à empreinte vérifiable ; contrôles sémantiques (sens, unité, portée, modèle/mesure, date, lieu, causalité) appliqués — sur les preuves typées seulement pour le sens et l’unité.' };
  }

  function toMarkdown(d) {
    const L = [], li = a => a.forEach(x => L.push(`- ${x}`));
    L.push(`# Dossier de décision — ${d.issue.question}`, '', `Mission \`${d.mission}\` · mode ${d.mode} · modèle ${d.model || 'aucun'} · ${d.execution}`, '', `**Lieu :** ${d.issue.location}  `, `**Sources :** instantané ${d.dates.snapshot || '—'}, veille ${d.dates.feedUpdate || '—'}, connaissances ${d.dates.knowledge || '—'}`, '');
    L.push('## Observations vérifiées'); li(d.observations.map(o => `${o.id} (${o.nature}) ${o.text}`));
    L.push('', '## Spécialistes'); li(d.specialists.map(s => `${s.role} — ${s.statements} énoncé(s) retenu(s)`));
    L.push('', '## Hypothèses (interprétations du modèle, non autoritatives)'); li(d.hypotheses.map(h => `${h.id} ${h.by} : ${h.text} [${h.cites.join(', ')}]`));
    L.push('', '## Interprétations (modèle, validées)'); li(d.interpretations.map(h => `${h.id} ${h.by} : ${h.text} [${h.cites.join(', ')}]`));
    L.push('', '## Désaccords'); li(d.disagreements.map(x => `${x.id} ${x.between.join(' vs ')} sur ${x.about} : ${x.text} (${x.resolved ? 'résolu' : 'non résolu'})`));
    L.push('', '## Simulations (calculs déterministes)'); li(d.simulations.map(s => `${s.id} ${s.text}`));
    L.push('', '## Hypothèses de modélisation'); li(d.assumptions);
    L.push('', '## Incertitudes'); li(d.uncertainty);
    L.push('', '## Risques et réserves'); li(d.risks.map(r => `${r.id} ${r.by} : ${r.text}`));
    L.push('', '## Preuves manquantes'); li(d.missingEvidence);
    L.push('', '## Prochaines étapes'); li(d.nextSteps);
    if (d.decision) { L.push('', `## Passerelle : ${d.decision.state}`, '', d.decision.reason, '', `authorizes: false`); }
    L.push('', '## Revue humaine', '', d.humanReview, '', `_Validation du dossier : ${d.validation.pass ? 'conforme' : 'NON conforme — ' + d.validation.problems.join(' ; ')}. ${d.validation.rule}_`);
    return L.join('\n') + '\n';
  }

  const DOSSIER = { build, validate, toMarkdown };
  if (typeof module !== 'undefined' && module.exports) module.exports = DOSSIER; else root.CORE_DOSSIER = DOSSIER;
})(typeof globalThis !== 'undefined' ? globalThis : this);
