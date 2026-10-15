// CORE Arena — structured debate (V6). A FICTIONAL debate about a REAL recorded problem: two fictional proposals plus,
// optionally, the user's own summary. Arguments cite recorded evidence or are flagged "non sourcé"; counterarguments
// attach to what they contest; unresolved disagreements are computed, not voted. Nothing here validates a proposal.
import { screen } from '../world/safety.mjs';

export const DEBATE = {
  id: 'debate-folsom-001', fictional: true, problemId: 'sidewalk-below-bsp-min:5665000',
  label: 'DÉBAT FICTIF sur un problème réel enregistré — participants, arguments et jugements de démonstration',
  question: 'Comment rendre praticable le trottoir de Folsom St entre la 5e et Falmouth St ?',
  proposals: [
    { id: 'pa', by: 'Participant·e fictif·ve 1', title: 'Élargir le trottoir de 2 ft', summary: 'Prendre 2 ft sur la chaussée pour atteindre le minimum de 12 ft.' },
    { id: 'pb', by: 'Participant·e fictif·ve 2', title: 'Dégager le cheminement', summary: 'Déplacer mobilier et obstacles pour libérer la largeur existante sans travaux de chaussée.' },
  ],
  args: [
    { id: 'a1', target: 'pa', kind: 'argument', by: 'Participant·e fictif·ve 1', text: 'Le relevé de 2014 indique 10 ft pour un minimum de 12 ft : l’écart est de 2 ft.', evidence: ['sidewalks:8562'] },
    { id: 'a2', target: 'a1', kind: 'counter', by: 'Participant·e fictif·ve 2', text: 'Ce relevé a plus de dix ans ; la largeur actuelle est inconnue.', evidence: ['sidewalks:8562'] },
    { id: 'a3', target: 'pb', kind: 'argument', by: 'Participant·e fictif·ve 2', text: 'Dégager le cheminement coûte moins cher qu’une reprise de chaussée.', evidence: [] },
    { id: 'a4', target: 'a3', kind: 'evidence-request', by: 'Participant·e fictif·ve 1', text: 'Quelle estimation de coût soutient cette affirmation ?', evidence: [] },
  ],
};
export const KINDS = { argument: 'Argument', counter: 'Contre-argument', 'evidence-request': 'Demande de preuve', rebuttal: 'Réponse' };

export function addArgument(debate, { target, kind, text, evidence = [], by = 'vous', records, at = new Date().toISOString() }) {
  if (!KINDS[kind]) return { ok: false, error: 'type d’argument inconnu' };
  const all = [...debate.proposals, ...debate.args];
  if (!all.some(x => x.id === target)) return { ok: false, error: 'cible inconnue' };
  if (kind !== 'argument' && debate.proposals.some(p => p.id === target)) return { ok: false, error: 'un contre-argument, une réponse ou une demande vise un argument' };
  if (kind === 'argument' && !debate.proposals.some(p => p.id === target)) return { ok: false, error: 'un argument soutient une proposition' };
  const s = screen(text, { history: [] }); if (!s.ok) return { ok: false, error: s.message };
  if (s.text.length < 15) return { ok: false, error: 'argument trop court' };
  const bad = evidence.filter(e => !records?.has(e)); if (bad.length) return { ok: false, error: `preuve inconnue : ${bad.join(', ')} (citez un enregistrement CORE existant)` };
  return { ok: true, value: { ...debate, args: [...debate.args, { id: `u${Date.parse(at).toString(36)}`, target, kind, by, text: s.text, evidence, at }] } };
}
export function addProposal(debate, { title, summary, at = new Date().toISOString() }) {
  const t = screen(title, { history: [] }), s = screen(summary, { history: [] });
  if (!t.ok || !s.ok) return { ok: false, error: (t.ok ? s : t).message };
  if (debate.proposals.some(p => p.by === 'vous')) return { ok: false, error: 'une proposition par participant' };
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
    explanation: [`${a.unresolved.length} objection(s) ou demande(s) de preuve sans réponse.`, `${a.unsourced.length} argument(s) sans source.`,
      ...a.perProposal.map(p => `« ${p.title} » : ${p.arguments} argument(s), ${p.sourced} sourcé(s), ${p.open} objection(s) ouverte(s).`),
      'Aucune proposition n’est déclarée gagnante : un débat ne remplace ni une mesure, ni une revue, ni une décision humaine.'] };
}
