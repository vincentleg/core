// CORE World — contribution lifecycle (V3 prototype). Labels reuse the existing gateway vocabulary
// (PREUVES SUPPLÉMENTAIRES REQUISES, ÉLIGIBLE À LA REVUE HUMAINE, REJETÉ) instead of creating parallel approval states.
// Who may move a contribution is part of the rule: agents propose and check, humans decide, nobody buys a transition.
export const STATES = {
  draft: { label: 'Brouillon', by: ['author'] },
  submitted: { label: 'Soumise', by: ['author'] },
  'awaiting-moderation': { label: 'En attente de modération', by: ['system'] },
  'evidence-review': { label: 'Revue des preuves', by: ['moderator'] },
  'needs-evidence': { label: 'PREUVES SUPPLÉMENTAIRES REQUISES', by: ['agent', 'reviewer'] },
  'scientific-review': { label: 'Revue scientifique', by: ['agent', 'reviewer'] },
  'eligible-human-decision': { label: 'ÉLIGIBLE À LA REVUE HUMAINE', by: ['agent', 'reviewer'] },
  'accepted-for-study': { label: 'Retenue pour étude', by: ['human-decider'] },
  rejected: { label: 'REJETÉ (avec motif)', by: ['moderator', 'reviewer', 'human-decider'], needsReason: true },
  'authorized-implementation': { label: 'Mise en œuvre autorisée', by: ['authenticated-authority'] },
  implemented: { label: 'Mise en œuvre', by: ['authenticated-authority'], needsEvidence: true },
  'outcome-measuring': { label: 'Résultat en cours de mesure', by: ['reviewer'] },
  'outcome-verified': { label: 'Résultat vérifié', by: ['independent-reviewer'], needsEvidence: true },
};
const NEXT = {
  draft: ['submitted'], submitted: ['awaiting-moderation'], 'awaiting-moderation': ['evidence-review', 'rejected'],
  'evidence-review': ['needs-evidence', 'scientific-review', 'rejected'], 'needs-evidence': ['evidence-review', 'rejected'],
  'scientific-review': ['needs-evidence', 'eligible-human-decision', 'rejected'],
  'eligible-human-decision': ['accepted-for-study', 'rejected'], 'accepted-for-study': ['authorized-implementation', 'rejected'],
  'authorized-implementation': ['implemented'], implemented: ['outcome-measuring'], 'outcome-measuring': ['outcome-verified'],
  rejected: [], 'outcome-verified': [],
};
// The prototype has no server, no moderation and no reviewers: a contribution can only be drafted and submitted locally.
export const PROTOTYPE_LIMIT = 'submitted';
const FORBIDDEN_BASES = ['votes', 'popularity', 'payment', 'subscription', 'cosmetic'];

export function transition(c, to, { actor, reason = '', evidence = [], basis = null, at = new Date().toISOString(), prototype = true } = {}) {
  const s = STATES[to];
  if (!s) return { ok: false, error: `état inconnu : ${to}` };
  if (!(NEXT[c.state] || []).includes(to)) return { ok: false, error: `transition interdite : ${c.state} → ${to}` };
  if (!s.by.includes(actor)) return { ok: false, error: `${actor} ne peut pas faire passer une contribution à « ${s.label} »` };
  if (basis && FORBIDDEN_BASES.includes(basis)) return { ok: false, error: `${basis} ne peut pas faire avancer une contribution` };
  if (s.needsReason && reason.trim().length < 10) return { ok: false, error: 'un rejet exige un motif explicite' };
  if (s.needsEvidence && !evidence.length) return { ok: false, error: 'cette étape exige des preuves liées' };
  if (prototype && Object.keys(NEXT).indexOf(to) > Object.keys(NEXT).indexOf(PROTOTYPE_LIMIT))
    return { ok: false, error: 'prototype local : aucune modération ni revue n’existe encore ; rien au-delà de « Soumise »' };
  return { ok: true, value: { ...c, state: to, history: [...(c.history || []), { from: c.state, to, actor, at, reason: reason || undefined }] } };
}

export function draft({ id, problemId, kind, text, author = 'local', at = new Date().toISOString() }) {
  if (!['observation', 'idea', 'evidence-suggestion', 'criticism'].includes(kind)) throw Error('type de contribution inconnu');
  return { id, problemId, kind, text, author, state: 'draft', createdAt: at, scope: 'local-only', history: [] };
}
