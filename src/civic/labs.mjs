// CORE Labs — deterministic, explainable proposal review (V4 prototype). A checklist with reasons and suggestions,
// NOT a score and NOT a scientific judgement. It reads only the version the author has allowed it to read.
import { T } from '../i18n/i18n.mjs';
export const METHOD = { id: 'core-labs-checklist', version: '0.1.0', kind: { en: 'deterministic rules (no language model)', fr: 'règles déterministes (aucun modèle de langage)' } };
// English for each criterion (label, note when present, note when missing); stored reviews keep their French text and
// are shown in the selected language through label() / note() by criterion id.
const EN = { problem: ['Problem definition', 'The problem is located and described in enough detail.', 'Say where the problem happens, for whom, and since when.'],
  evidence: ['Evidence', 'The proposal cites a source or a record.', 'Add a verifiable source (link, dataset, CORE record).'],
  coherence: ['Logical coherence', 'The solution explains how it acts on the problem.', 'Explain the mechanism: why would this solution reduce the problem?'],
  feasibility: ['Feasibility and constraints', 'The proposal addresses cost, time or constraints.', 'Give an order of magnitude for cost and time, and the permissions needed.'],
  alternatives: ['Alternatives', 'At least one alternative is considered.', 'Compare with at least one other approach, including “do nothing”.'],
  risks: ['Risks and side effects', 'Risks are identified.', 'Who could be disadvantaged? Which side effects should be watched?'],
  testing: ['Test method', 'A way to check the effect is proposed.', 'How would we know it worked? Propose an indicator and a before/after comparison.'],
  simulation: ['Fit for simulation', 'The proposal involves a quantity a model could estimate.', 'Simulation only applies when a measurable quantity is involved; otherwise a field study fits better.'] };
const FR_OF = {}; // id → [label, yes, no] in French, filled below
export const label = i => ({ en: EN[i.id]?.[0] ?? i.label, fr: FR_OF[i.id]?.[0] ?? i.label });
export const note = i => ({ en: EN[i.id]?.[i.status === 'present' ? 1 : 2] ?? i.note, fr: i.note });
const LIMITS = { en: 'Rule-based checklist: it detects the presence of elements, not their accuracy. It is not a grade, a scientific validation or a novelty opinion.', fr: 'Liste de contrôle par règles : détecte la présence d’éléments, pas leur exactitude. Ce n’est ni une note, ni une validation scientifique, ni un avis de nouveauté.' };
export const limitsText = l => (l === LIMITS.fr || !l ? LIMITS : { en: l, fr: l });
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

for (const [id, label, , yes, no] of CRITERIA) FR_OF[id] = [label, yes, no];
export function review(idea, { at = new Date().toISOString(), recent = [] } = {}) {
  if (idea.permissions?.labsAnalysis !== true) return { ok: false, error: T('analysis not allowed by the author', 'analyse non autorisée par l’auteur') };
  const v = idea.versions.at(-1); if (!v) return { ok: false, error: T('no version', 'aucune version') };
  // Throttle: quality over volume. At most 5 reviews per idea per day; a near-identical version gets no new review.
  if (recent.filter(r => r.idea === idea.id && Date.parse(at) - Date.parse(r.at) < 86400000).length >= 5) return { ok: false, error: T('limit of 5 analyses a day for this idea: improve the proposal before asking again', 'limite de 5 analyses par jour pour cette idée : améliorez la proposition avant de redemander') };
  const prior = idea.versions.at(-2);
  if (prior && jaccard(prior.problem + prior.solution, v.problem + v.solution) > 0.9 && idea.reviews.some(r => r.version === prior.n)) return { ok: false, error: T('version almost identical to the previous one, already analysed', 'version presque identique à la précédente déjà analysée') };
  const items = CRITERIA.map(([id, label, test, yes, no]) => ({ id, label, status: test(v) ? 'present' : 'missing', note: test(v) ? yes : no }));
  return { ok: true, value: { method: METHOD, idea: idea.id, version: v.n, hash: v.hash, at, items,
    limits: LIMITS.fr } };
}
export function contest(idea, { reviewIndex, reason, actor, at = new Date().toISOString() }) {
  if (actor !== idea.owner) return { ok: false, error: T('only the author can contest in this prototype', 'seul l’auteur conteste dans ce prototype') };
  if (String(reason ?? '').trim().length < 15) return { ok: false, error: T('reason too short', 'motif de contestation trop court') };
  if (!idea.reviews[reviewIndex]) return { ok: false, error: T('unknown analysis', 'analyse inconnue') };
  return { ok: true, value: { ...idea, contests: [...idea.contests, { reviewIndex, reason: String(reason).slice(0, 1000), at, status: T('waiting for a human (no reviewer in this prototype)', 'en attente d’un humain (aucun relecteur dans ce prototype)') }] } };
}

// ---------- V6: from idea to a review-ready research dossier (deterministic; never a validation) ----------
const lines = (t, re) => String(t || '').split('\n').map(x => x.trim()).filter(x => re.test(x)).map(x => x.replace(re, '').replace(/^[-•]\s*/, '').trim()).filter(Boolean);
function listUnder(text, header) { const m = String(text || '').split(new RegExp(`\\n${header} :\\n`))[1]; return m ? m.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2)) : []; }
export const DOSSIER_LEVELS = { draft: 'Brouillon', incomplete: 'Incomplet', ready: 'Prêt à être relu : NON validé' };
const LEVELS_EN = { draft: 'Draft', incomplete: 'Incomplete', ready: 'Ready for review, NOT validated' };

// problem: the CORE problem record (or null); sidewalk: the sidewalk dataset record for that segment (or null).
export function dossier(idea, { problem = null, sidewalk = null } = {}) {
  const v = idea.versions.at(-1); if (!v) throw Error(T('no version', 'aucune version'));
  const d = idea.dialogueDraft || {};
  const pick = (k, h) => (d[k] && d[k].length ? d[k] : listUnder(v.solution, h));
  const assumptions = pick('assumptions', 'Hypothèses'), constraints = pick('constraints', 'Contraintes'), alternatives = pick('alternatives', 'Alternatives'), risks = pick('risks', 'Risques'), tests = pick('tests', 'Tests');
  const proposal = d.proposal || v.solution.split('\n')[0], mechanism = d.mechanism || lines(v.solution, /^Mécanisme supposé :\s*/)[0] || '';
  const evidence = [...(problem ? problem.evidence.map(e => ({ ref: e.ref, url: e.url, basis: problem.status })) : []),
    ...String(v.evidence || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => ({ ref: l.split(' ')[0], url: (l.match(/https:\/\/\S+/) || [null])[0], basis: T('cited by the author', 'cité par l’auteur') }))]
    .filter((e, i, a) => a.findIndex(x => x.ref === e.ref) === i);
  // Deterministic calculation only where the inputs are recorded measurements.
  let calculation = { available: false, note: T('No validated simulation exists for this type of problem: no result is computed.', 'Aucune simulation validée n’existe pour ce type de problème : aucun résultat n’est calculé.') };
  if (problem?.metrics?.width_ft != null && problem.metrics.min_ft != null) {
    const w = problem.metrics.width_ft, min = problem.metrics.min_ft, rec = sidewalk?.recommended_ft ?? null, m = ft => Math.round(ft * 0.3048 * 100) / 100;
    calculation = { available: true, kind: T('arithmetic on recorded values', 'arithmétique sur valeurs enregistrées'), inputs: { width_ft: w, min_ft: min, ...(rec != null ? { recommended_ft: rec } : {}) },
      result: { toMinimum_ft: min - w, toMinimum_m: m(min - w), ...(rec != null ? { toRecommended_ft: rec - w, toRecommended_m: m(rec - w) } : {}) },
      note: T(`Gap computed on the 2014 measurement (${w} ft): to recompute with a current measurement. A geometric gap says nothing about actual use or feasibility.`, `Écart calculé sur la mesure de 2014 (${w} ft) : à recalculer avec une mesure actuelle. Un écart géométrique ne dit rien de l’usage réel ni de la faisabilité.`) };
  }
  const missing = [];
  if (problem && /2014/.test(problem.caveat || '')) missing.push({ id: 'current-measure', label: T('Current width measurement (the survey dates from 2014)', 'Mesure actuelle de la largeur (le relevé date de 2014)') });
  if (!tests.some(t => /compt|debit|débit|pieton|piéton/i.test(t))) missing.push({ id: 'usage', label: T('Usage data (counts of pedestrians, wheelchairs, strollers): no CORE dataset contains them', 'Données d’usage (comptages de piétons, fauteuils, poussettes) : aucun jeu de données CORE ne les contient') });
  if (!constraints.some(c => /\d/.test(c) && /cout|coût|budget|\$|€|dollar|euro/i.test(c))) missing.push({ id: 'cost', label: T('A costed estimate', 'Estimation de coût chiffrée') });
  if (!constraints.some(c => /permis|autoris|ville|sfmta|dpw/i.test(c))) missing.push({ id: 'authority', label: T('Competent authority and permissions needed', 'Autorité compétente et autorisations nécessaires') });
  if (!alternatives.length) missing.push({ id: 'alternatives', label: T('At least one alternative, including “do nothing”', 'Au moins une alternative, dont « ne rien faire »') });
  if (!mechanism) missing.push({ id: 'mechanism', label: T('Mechanism: why the proposal would reduce the problem', 'Mécanisme : pourquoi la proposition réduirait le problème') });
  if (!tests.length) missing.push({ id: 'tests', label: T('Before/after measurement method', 'Méthode de mesure avant/après') });
  const level = !proposal || !mechanism ? 'draft' : missing.length ? 'incomplete' : 'ready';
  return {
    method: { ...METHOD, part: 'dossier' }, idea: idea.id, version: v.n, hash: v.hash, level, levelLabel: T(LEVELS_EN[level], DOSSIER_LEVELS[level]),
    problemStatement: problem ? T(`${problem.title} · ${problem.place}. ${problem.statement} (status: ${problem.status}).`, `${problem.title} · ${problem.place}. ${problem.statement} (statut : ${problem.status}).`) : v.problem,
    hypothesis: T(`If “${proposal}” is implemented${mechanism ? `, then ${mechanism.replace(/^(afin de|pour que|parce que|car|so that|because)\s*/i, '')}` : ''}${tests.length ? `; this would be checked by: ${tests[0]}` : '; (verification method to define)'}.`, `Si l’on met en œuvre « ${proposal} »${mechanism ? `, alors ${mechanism.replace(/^(afin de|pour que|parce que|car)\s*/i, '')}` : ''}${tests.length ? ` ; cela se vérifierait par : ${tests[0]}` : ' ; (méthode de vérification à définir)'}.`),
    assumptions, evidence, alternatives: alternatives.length ? alternatives : [T('to specify (including “do nothing”)', 'à préciser (dont « ne rien faire »)')], risks: risks.length ? risks : [T('to identify', 'à identifier')], constraints,
    validationPlan: [T(`Dated baseline measurement before any intervention${problem ? ` on ${problem.place}` : ''}`, `Mesure de référence datée avant toute intervention${problem ? ` sur ${problem.place}` : ''}`), ...(tests.length ? tests : [T('Indicator and measurement method to define', 'Indicateur et méthode de mesure à définir')]), T('Pre-register success and failure thresholds before measuring (FD07)', 'Préenregistrer seuils de succès et d’échec avant la mesure (FD07)'), T('Review by a competent, independent person', 'Relecture par une personne compétente et indépendante')],
    prototypePlan: [T('Reversible mock-up or temporary marking, if the competent authority allows it', 'Maquette ou marquage temporaire réversible, si l’autorité compétente l’autorise'), T('Limited duration and scope, compared with a control segment', 'Durée et périmètre limités, comparés à un tronçon témoin'), T('Immediate stop if an identified risk materialises', 'Arrêt immédiat si un risque identifié se réalise')],
    successMetrics: tests.length ? tests.map(t => T(`Measured improvement in: ${t}`, `Amélioration mesurée de : ${t}`)) : [T('to define before any measurement', 'à définir avant toute mesure')],
    failureCriteria: [T('No measurable difference with the control segment', 'Aucune différence mesurable avec le tronçon témoin'), T('An identified risk materialises (accessibility, safety, residents)', 'Un risque identifié se réalise (accessibilité, sécurité, riverains)'), T('The current measurement shows the problem no longer exists', 'La mesure actuelle montre que le problème n’existe plus')],
    calculation, missingEvidence: missing,
    disclaimer: T('Dossier structured by deterministic rules: it organises the proposal and its gaps. It is neither a scientific validation, nor a recommendation, nor an authorisation.', 'Dossier structuré par règles déterministes : il organise la proposition et ses manques. Il ne constitue ni une validation scientifique, ni une recommandation, ni une autorisation.'),
  };
}
export function dossierMarkdown(x) {
  const L = (h, a) => [`## ${h}`, ...a.map(i => `- ${typeof i === 'string' ? i : i.label || `${i.ref}${i.url ? ` (${i.url})` : ''} · ${i.basis}`}`), ''];
  return [T(`# CORE Labs dossier: idea ${x.idea}, version ${x.version}`, `# Dossier CORE Labs : idée ${x.idea}, version ${x.version}`), '', T(`Level: ${x.levelLabel}. ${x.disclaimer}`, `Niveau : ${x.levelLabel}. ${x.disclaimer}`), T(`Version fingerprint: ${x.hash}`, `Empreinte de la version : ${x.hash}`), '', T('## Problem', '## Problème'), x.problemStatement, '', T('## Testable hypothesis', '## Hypothèse testable'), x.hypothesis, '',
    ...L(T('Underlying assumptions', 'Hypothèses sous-jacentes'), x.assumptions), ...L(T('Evidence', 'Preuves'), x.evidence), ...L(T('Alternatives', 'Alternatives'), x.alternatives), ...L(T('Risks', 'Risques'), x.risks), ...L(T('Validation plan', 'Plan de validation'), x.validationPlan), ...L(T('Prototype plan', 'Plan de prototype'), x.prototypePlan),
    ...L(T('Success indicators', 'Indicateurs de succès'), x.successMetrics), ...L(T('Failure criteria', 'Critères d’échec'), x.failureCriteria), T('## Calculation', '## Calcul'), x.calculation.available ? `${JSON.stringify(x.calculation.result)} · ${x.calculation.note}` : x.calculation.note, '', ...L(T('Missing evidence', 'Preuves manquantes'), x.missingEvidence)].join('\n');
}
