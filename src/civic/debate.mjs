// CORE Arena — structured debate (V6). A FICTIONAL debate about a REAL recorded problem: two fictional proposals plus,
// optionally, the user's own summary. Arguments cite recorded evidence or are flagged "non sourcé"; counterarguments
// attach to what they contest; unresolved disagreements are computed, not voted. Nothing here validates a proposal.
import { screen } from '../world/safety.mjs';

import { T, L } from '../i18n/i18n.mjs';
const B = (en, fr) => ({ en, fr });
const P1 = B('Fictional participant 1', 'Participant·e fictif·ve 1'), P2 = B('Fictional participant 2', 'Participant·e fictif·ve 2');
export const DEBATE = {
  id: 'debate-folsom-001', fictional: true, problemId: 'sidewalk-below-bsp-min:5665000',
  label: B('FICTIONAL DEBATE about a real recorded problem — demonstration participants, arguments and judgements', 'DÉBAT FICTIF sur un problème réel enregistré — participants, arguments et jugements de démonstration'),
  question: B('How can the Folsom St sidewalk between 5th and Falmouth St be made usable?', 'Comment rendre praticable le trottoir de Folsom St entre la 5e et Falmouth St ?'),
  proposals: [
    { id: 'pa', by: P1, title: B('Widen the sidewalk by 2 ft', 'Élargir le trottoir de 2 ft'), summary: B('Take 2 ft from the roadway to reach the 12 ft minimum.', 'Prendre 2 ft sur la chaussée pour atteindre le minimum de 12 ft.') },
    { id: 'pb', by: P2, title: B('Clear the walking path', 'Dégager le cheminement'), summary: B('Move street furniture and obstacles to free the existing width without roadway works.', 'Déplacer mobilier et obstacles pour libérer la largeur existante sans travaux de chaussée.') },
  ],
  args: [
    { id: 'a1', target: 'pa', kind: 'argument', by: P1, text: B('The 2014 survey says 10 ft against a 12 ft minimum: the gap is 2 ft.', 'Le relevé de 2014 indique 10 ft pour un minimum de 12 ft : l’écart est de 2 ft.'), evidence: ['sidewalks:8562'] },
    { id: 'a2', target: 'a1', kind: 'counter', by: P2, text: B('That survey is more than ten years old; the current width is unknown.', 'Ce relevé a plus de dix ans ; la largeur actuelle est inconnue.'), evidence: ['sidewalks:8562'] },
    { id: 'a3', target: 'pb', kind: 'argument', by: P2, text: B('Clearing the path costs less than rebuilding the roadway.', 'Dégager le cheminement coûte moins cher qu’une reprise de chaussée.'), evidence: [] },
    { id: 'a4', target: 'a3', kind: 'evidence-request', by: P1, text: B('Which cost estimate supports this claim?', 'Quelle estimation de coût soutient cette affirmation ?'), evidence: [] },
  ],
};
export const KINDS = { argument: B('Argument', 'Argument'), counter: B('Counter-argument', 'Contre-argument'), 'evidence-request': B('Evidence request', 'Demande de preuve'), rebuttal: B('Reply', 'Réponse') };

export function addArgument(debate, { target, kind, text, evidence = [], by = 'vous', records, at = new Date().toISOString() }) {
  if (!KINDS[kind]) return { ok: false, error: T('unknown argument type', 'type d’argument inconnu') };
  const all = [...debate.proposals, ...debate.args];
  if (!all.some(x => x.id === target)) return { ok: false, error: T('unknown target', 'cible inconnue') };
  if (kind !== 'argument' && debate.proposals.some(p => p.id === target)) return { ok: false, error: T('a counter-argument, reply or request targets an argument', 'un contre-argument, une réponse ou une demande vise un argument') };
  if (kind === 'argument' && !debate.proposals.some(p => p.id === target)) return { ok: false, error: T('an argument supports a proposal', 'un argument soutient une proposition') };
  const s = screen(text, { history: [] }); if (!s.ok) return { ok: false, error: s.message };
  if (s.text.length < 15) return { ok: false, error: T('argument too short', 'argument trop court') };
  const bad = evidence.filter(e => !records?.has(e)); if (bad.length) return { ok: false, error: T(`unknown evidence: ${bad.join(', ')} (cite an existing CORE record)`, `preuve inconnue : ${bad.join(', ')} (citez un enregistrement CORE existant)`) };
  return { ok: true, value: { ...debate, args: [...debate.args, { id: `u${Date.parse(at).toString(36)}`, target, kind, by, text: s.text, evidence, at }] } };
}
export function addProposal(debate, { title, summary, at = new Date().toISOString() }) {
  const t = screen(title, { history: [] }), s = screen(summary, { history: [] });
  if (!t.ok || !s.ok) return { ok: false, error: (t.ok ? s : t).message };
  if (debate.proposals.some(p => p.by === 'vous')) return { ok: false, error: T('one proposal per participant', 'une proposition par participant') };
  return { ok: true, value: { ...debate, proposals: [...debate.proposals, { id: `pu${Date.parse(at).toString(36)}`, by: 'vous', title: t.text.slice(0, 80), summary: s.text.slice(0, 400) }] } };
}
// Unresolved: a counter or evidence request with no reply from the contested side. Unsourced: an argument with no evidence.
export function analyse(debate) {
  const replies = id => debate.args.filter(a => a.target === id && a.kind === 'rebuttal');
  const unresolved = debate.args.filter(a => (a.kind === 'counter' || a.kind === 'evidence-request') && !replies(a.id).length);
  const unsourced = debate.args.filter(a => a.kind === 'argument' && !a.evidence.length);
  return { unresolved, unsourced, perProposal: debate.proposals.map(p => { const own = debate.args.filter(a => a.target === p.id); const ids = new Set(own.map(a => a.id));
    return { id: p.id, title: p.title, arguments: own.length, sourced: own.filter(a => a.evidence.length).length, open: unresolved.filter(u => ids.has(u.target)).length }; }) };
}
export function outcome(debate) {
  const a = analyse(debate);
  return { fictional: true, authorizes: false, scientificValidation: false, winner: null,
    explanation: [T(`${a.unresolved.length} objection(s) or evidence request(s) without a reply.`, `${a.unresolved.length} objection(s) ou demande(s) de preuve sans réponse.`), T(`${a.unsourced.length} argument(s) without a source.`, `${a.unsourced.length} argument(s) sans source.`),
      ...a.perProposal.map(p => T(`“${L(p.title)}”: ${p.arguments} argument(s), ${p.sourced} sourced, ${p.open} open objection(s).`, `« ${L(p.title)} » : ${p.arguments} argument(s), ${p.sourced} sourcé(s), ${p.open} objection(s) ouverte(s).`)),
      T('No proposal is declared the winner: a debate replaces neither a measurement, nor a review, nor a human decision.', 'Aucune proposition n’est déclarée gagnante : un débat ne remplace ni une mesure, ni une revue, ni une décision humaine.')] };
}
