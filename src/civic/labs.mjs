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
