// CORE Labs — deterministic, explainable proposal review (V4 prototype). A checklist with reasons and suggestions,
// NOT a score and NOT a scientific judgement. It reads only the version the author has allowed it to read.
export const METHOD = { id: 'core-labs-checklist', version: '0.1.0', kind: 'deterministic rules (no language model)' };
const has = (t, re) => re.test(t);
const words = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{4,}/g) || [];
const jaccard = (a, b) => { const A = new Set(words(a)), B = new Set(words(b)); const i = [...A].filter(x => B.has(x)).length; return A.size + B.size ? i / (A.size + B.size - i) : 1; };

const CRITERIA = [
  ['problem', 'Définition du problème', v => v.problem.length >= 80 && has(v.problem, /\b(où|lieu|rue|tronçon|quartier|ville|segment|site|where|street|block)\b|\d/i),
    'Le problème est situé et décrit avec assez de détail.', 'Précisez où se produit le problème, pour qui, et depuis quand.'],
  ['evidence', 'Preuves', v => has(v.evidence + ' ' + v.problem, /https?:\/\/|\b(source|relev|mesur|donnée|registre|dataset|étude|study)\b/i) || !!v.problemId,
    'La proposition cite une source ou un enregistrement.', 'Ajoutez une source vérifiable (lien, jeu de données, enregistrement CORE).'],
  ['coherence', 'Cohérence logique', v => has(v.solution, /\b(parce que|car|afin de|donc|pour que|because|so that|therefore|ce qui)\b/i),
    'La solution explique comment elle agit sur le problème.', 'Expliquez le mécanisme : pourquoi cette solution réduirait-elle le problème ?'],
  ['feasibility', 'Faisabilité et contraintes', v => has(v.solution, /\b(co[uû]t|budget|délai|mois|semaine|contrainte|permis|autoris|réglement|cost|weeks|permit)\b/i),
    'La proposition aborde coût, délai ou contraintes.', 'Indiquez un ordre de grandeur de coût, de délai et les autorisations nécessaires.'],
  ['alternatives', 'Alternatives', v => has(v.solution, /\b(alternative|sinon|autre option|ou bien|instead|plutôt que|comparé)\b/i),
    'Au moins une alternative est envisagée.', 'Comparez avec au moins une autre approche, y compris « ne rien faire ».'],
  ['risks', 'Risques et effets indésirables', v => has(v.solution, /\b(risque|effet indésirable|inconvénient|impact négatif|risk|downside|attention)\b/i),
    'Des risques sont identifiés.', 'Qui pourrait être pénalisé ? Quels effets indésirables surveiller ?'],
  ['testing', 'Méthode de test', v => has(v.solution, /\b(test|pilote|mesur|indicateur|avant[ /-]après|compar|expériment|pilot|measure)\b/i),
    'Une façon de vérifier l’effet est proposée.', 'Comment saurait-on que cela a marché ? Proposez un indicateur et une comparaison avant/après.'],
  ['simulation', 'Adéquation à la simulation', v => has(v.solution, /\b(trafic|débit|flux|énergie|charge|largeur|temps de parcours|flow|load)\b/i),
    'La proposition contient une grandeur qu’un modèle pourrait estimer.', 'Une simulation ne s’applique que si une grandeur mesurable est en jeu ; sinon une étude de terrain est plus adaptée.'],
];

export function review(idea, { at = new Date().toISOString(), recent = [] } = {}) {
  if (idea.permissions?.labsAnalysis !== true) return { ok: false, error: 'analyse non autorisée par l’auteur' };
  const v = idea.versions.at(-1); if (!v) return { ok: false, error: 'aucune version' };
  // Throttle: quality over volume. At most 5 reviews per idea per day; a near-identical version gets no new review.
  if (recent.filter(r => r.idea === idea.id && Date.parse(at) - Date.parse(r.at) < 86400000).length >= 5) return { ok: false, error: 'limite de 5 analyses par jour pour cette idée : améliorez la proposition avant de redemander' };
  const prior = idea.versions.at(-2);
  if (prior && jaccard(prior.problem + prior.solution, v.problem + v.solution) > 0.9 && idea.reviews.some(r => r.version === prior.n)) return { ok: false, error: 'version presque identique à la précédente déjà analysée' };
  const items = CRITERIA.map(([id, label, test, yes, no]) => ({ id, label, status: test(v) ? 'present' : 'missing', note: test(v) ? yes : no }));
  return { ok: true, value: { method: METHOD, idea: idea.id, version: v.n, hash: v.hash, at, items,
    limits: 'Liste de contrôle par règles : détecte la présence d’éléments, pas leur exactitude. Ce n’est ni une note, ni une validation scientifique, ni un avis de nouveauté.' } };
}
export function contest(idea, { reviewIndex, reason, actor, at = new Date().toISOString() }) {
  if (actor !== idea.owner) return { ok: false, error: 'seul l’auteur conteste dans ce prototype' };
  if (String(reason ?? '').trim().length < 15) return { ok: false, error: 'motif de contestation trop court' };
  if (!idea.reviews[reviewIndex]) return { ok: false, error: 'analyse inconnue' };
  return { ok: true, value: { ...idea, contests: [...idea.contests, { reviewIndex, reason: String(reason).slice(0, 1000), at, status: 'en attente d’un humain (aucun relecteur dans ce prototype)' }] } };
}

// ---------- V6: from idea to a review-ready research dossier (deterministic; never a validation) ----------
const lines = (t, re) => String(t || '').split('\n').map(x => x.trim()).filter(x => re.test(x)).map(x => x.replace(re, '').replace(/^[-•]\s*/, '').trim()).filter(Boolean);
function listUnder(text, header) { const m = String(text || '').split(new RegExp(`\\n${header} :\\n`))[1]; return m ? m.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2)) : []; }
export const DOSSIER_LEVELS = { draft: 'Brouillon', incomplete: 'Incomplet', ready: 'Prêt à être relu — NON validé' };

// problem: the CORE problem record (or null); sidewalk: the sidewalk dataset record for that segment (or null).
export function dossier(idea, { problem = null, sidewalk = null } = {}) {
  const v = idea.versions.at(-1); if (!v) throw Error('aucune version');
  const d = idea.dialogueDraft || {};
  const pick = (k, h) => (d[k] && d[k].length ? d[k] : listUnder(v.solution, h));
  const assumptions = pick('assumptions', 'Hypothèses'), constraints = pick('constraints', 'Contraintes'), alternatives = pick('alternatives', 'Alternatives'), risks = pick('risks', 'Risques'), tests = pick('tests', 'Tests');
  const proposal = d.proposal || v.solution.split('\n')[0], mechanism = d.mechanism || lines(v.solution, /^Mécanisme supposé :\s*/)[0] || '';
  const evidence = [...(problem ? problem.evidence.map(e => ({ ref: e.ref, url: e.url, basis: problem.status })) : []),
    ...String(v.evidence || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => ({ ref: l.split(' ')[0], url: (l.match(/https:\/\/\S+/) || [null])[0], basis: 'cité par l’auteur' }))]
    .filter((e, i, a) => a.findIndex(x => x.ref === e.ref) === i);
  // Deterministic calculation only where the inputs are recorded measurements.
  let calculation = { available: false, note: 'Aucune simulation validée n’existe pour ce type de problème : aucun résultat n’est calculé.' };
  if (problem?.metrics?.width_ft != null && problem.metrics.min_ft != null) {
    const w = problem.metrics.width_ft, min = problem.metrics.min_ft, rec = sidewalk?.recommended_ft ?? null, m = ft => Math.round(ft * 0.3048 * 100) / 100;
    calculation = { available: true, kind: 'arithmétique sur valeurs enregistrées', inputs: { width_ft: w, min_ft: min, ...(rec != null ? { recommended_ft: rec } : {}) },
      result: { toMinimum_ft: min - w, toMinimum_m: m(min - w), ...(rec != null ? { toRecommended_ft: rec - w, toRecommended_m: m(rec - w) } : {}) },
      note: `Écart calculé sur la mesure de 2014 (${w} ft) : à recalculer avec une mesure actuelle. Un écart géométrique ne dit rien de l’usage réel ni de la faisabilité.` };
  }
  const missing = [];
  if (problem && /2014/.test(problem.caveat || '')) missing.push({ id: 'current-measure', label: 'Mesure actuelle de la largeur (le relevé date de 2014)' });
  if (!tests.some(t => /compt|debit|débit|pieton|piéton/i.test(t))) missing.push({ id: 'usage', label: 'Données d’usage (comptages de piétons, fauteuils, poussettes) : aucun jeu de données CORE ne les contient' });
  if (!constraints.some(c => /\d/.test(c) && /cout|coût|budget|\$|€|dollar|euro/i.test(c))) missing.push({ id: 'cost', label: 'Estimation de coût chiffrée' });
  if (!constraints.some(c => /permis|autoris|ville|sfmta|dpw/i.test(c))) missing.push({ id: 'authority', label: 'Autorité compétente et autorisations nécessaires' });
  if (!alternatives.length) missing.push({ id: 'alternatives', label: 'Au moins une alternative, dont « ne rien faire »' });
  if (!mechanism) missing.push({ id: 'mechanism', label: 'Mécanisme : pourquoi la proposition réduirait le problème' });
  if (!tests.length) missing.push({ id: 'tests', label: 'Méthode de mesure avant/après' });
  const level = !proposal || !mechanism ? 'draft' : missing.length ? 'incomplete' : 'ready';
  return {
    method: { ...METHOD, part: 'dossier' }, idea: idea.id, version: v.n, hash: v.hash, level, levelLabel: DOSSIER_LEVELS[level],
    problemStatement: problem ? `${problem.title} — ${problem.place}. ${problem.statement} (statut : ${problem.status}).` : v.problem,
    hypothesis: `Si l’on met en œuvre « ${proposal} »${mechanism ? `, alors ${mechanism.replace(/^(afin de|pour que|parce que|car)\s*/i, '')}` : ''}${tests.length ? ` ; cela se vérifierait par : ${tests[0]}` : ' ; (méthode de vérification à définir)'}.`,
    assumptions, evidence, alternatives: alternatives.length ? alternatives : ['à préciser (dont « ne rien faire »)'], risks: risks.length ? risks : ['à identifier'], constraints,
    validationPlan: [`Mesure de référence datée avant toute intervention${problem ? ` sur ${problem.place}` : ''}`, ...(tests.length ? tests : ['Indicateur et méthode de mesure à définir']), 'Préenregistrer seuils de succès et d’échec avant la mesure (FD07)', 'Relecture par une personne compétente et indépendante'],
    prototypePlan: ['Maquette ou marquage temporaire réversible, si l’autorité compétente l’autorise', 'Durée et périmètre limités, comparés à un tronçon témoin', 'Arrêt immédiat si un risque identifié se réalise'],
    successMetrics: tests.length ? tests.map(t => `Amélioration mesurée de : ${t}`) : ['à définir avant toute mesure'],
    failureCriteria: ['Aucune différence mesurable avec le tronçon témoin', 'Un risque identifié se réalise (accessibilité, sécurité, riverains)', 'La mesure actuelle montre que le problème n’existe plus'],
    calculation, missingEvidence: missing,
    disclaimer: 'Dossier structuré par règles déterministes : il organise la proposition et ses manques. Il ne constitue ni une validation scientifique, ni une recommandation, ni une autorisation.',
  };
}
export function dossierMarkdown(x) {
  const L = (h, a) => [`## ${h}`, ...a.map(i => `- ${typeof i === 'string' ? i : i.label || `${i.ref}${i.url ? ` (${i.url})` : ''} — ${i.basis}`}`), ''];
  return [`# Dossier CORE Labs — idée ${x.idea}, version ${x.version}`, '', `Niveau : ${x.levelLabel}. ${x.disclaimer}`, `Empreinte de la version : ${x.hash}`, '', '## Problème', x.problemStatement, '', '## Hypothèse testable', x.hypothesis, '',
    ...L('Hypothèses sous-jacentes', x.assumptions), ...L('Preuves', x.evidence), ...L('Alternatives', x.alternatives), ...L('Risques', x.risks), ...L('Plan de validation', x.validationPlan), ...L('Plan de prototype', x.prototypePlan),
    ...L('Indicateurs de succès', x.successMetrics), ...L('Critères d’échec', x.failureCriteria), '## Calcul', x.calculation.available ? `${JSON.stringify(x.calculation.result)} — ${x.calculation.note}` : x.calculation.note, '', ...L('Preuves manquantes', x.missingEvidence)].join('\n');
}
