// CORE Arena — one FICTIONAL tournament with published rules, roles, independent judging and no public voting
// (V4 prototype). A tournament result recognises a proposal; it never validates science or authorises any action.
import { T, L } from '../i18n/i18n.mjs';
const B = (en, fr) => ({ en, fr });
export const ROLES = { spectator: B('Spectator', 'Spectateur'), 'spectator-voter': B('Spectator-voter', 'Spectateur-votant'), participant: B('Participant', 'Participant'), judge: B('Judge', 'Juge') };
export const CHALLENGE = {
  id: 'arena-fictional-001', fictional: true,
  label: B('FICTIONAL CHALLENGE, no real place, data or result', 'DÉFI FICTIF : aucun lieu, aucune donnée et aucun résultat réels'),
  title: B('Cooling a schoolyard in Example Town during heatwaves', 'Rafraîchir une cour d’école à Ville-Exemple pendant les vagues de chaleur'),
  statement: B('Example Town (an imaginary town) has a 1,200 m² schoolyard, asphalted, without shade. Propose an improvement that can be done in one summer, with a fictional budget of €40,000.', 'Ville-Exemple (ville imaginaire) dispose d’une cour d’école de 1 200 m², asphaltée, sans ombre. Proposez une amélioration réalisable en un été, avec un budget fictif de 40 000 €.'),
  rules: [
    B('One proposal per participant, at most 1,500 characters, written by the participant.', 'Une proposition par participant, 1 500 caractères au plus, rédigée par le participant.'),
    B('At least three independent judges; a judge may not be a participant or a participant’s collaborator.', 'Au moins trois juges indépendants ; un juge ne peut pas être participant ni collaborateur d’un participant.'),
    B('Each judge scores alone, without seeing other scores, on five criteria from 0 to 4, with a justification per criterion.', 'Chaque juge note seul, sans voir les autres notes, sur cinq critères de 0 à 4, avec une justification par critère.'),
    B('Result: median of the judges’ totals; ties broken by the median of the “evidence” criterion, otherwise joint ranking.', 'Résultat : médiane des totaux des juges ; égalité départagée par la médiane du critère « preuves », sinon ex aequo.'),
    B('All judge sheets are published at closing. A contest can be raised with a human within 7 days.', 'Toutes les fiches de juges sont publiées à la clôture. Contestation possible pendant 7 jours auprès d’un humain.'),
    B('No public voting in this prototype. The ranking is neither a scientific validation nor an authorisation to act.', 'Pas de vote public dans ce prototype. Le classement ne vaut ni validation scientifique ni autorisation d’agir.'),
  ],
  criteria: [['evidence', B('Evidence and explicit assumptions', 'Preuves et hypothèses explicites')], ['feasibility', B('Feasibility (budget, time)', 'Faisabilité (budget, délai)')], ['equity', B('Equity and accessibility', 'Équité et accessibilité')], ['risks', B('Identified risks', 'Risques identifiés')], ['measurement', B('Planned measurement of the effect', 'Mesure de l’effet prévue')]],
  publicVoting: false,
};

export function newTournament(ch = CHALLENGE) { return { challenge: ch, phase: 'registration', entrants: {}, submissions: {}, sheets: {}, results: null }; }
export function register(t, { who, role, conflicts = [] }) {
  if (t.phase !== 'registration') return { ok: false, error: T('registration closed', 'inscriptions closes') };
  if (!ROLES[role]) return { ok: false, error: T('unknown role', 'rôle inconnu') };
  if (role === 'spectator-voter' && !t.challenge.publicVoting) return { ok: false, error: T('public voting disabled: vote integrity not yet guaranteed (identity, anti-Sybil, moderation)', 'vote public désactivé : intégrité du vote non encore garantie (identité, anti-Sybil, modération)') };
  if (t.entrants[who]) return { ok: false, error: T('already registered (one role per person)', 'déjà inscrit (un seul rôle par personne)') };
  if (role === 'judge' && conflicts.some(c => t.entrants[c]?.role === 'participant')) return { ok: false, error: T('declared conflict of interest with a participant', 'conflit d’intérêts déclaré avec un participant') };
  return { ok: true, value: { ...t, entrants: { ...t.entrants, [who]: { role, conflicts } } } };
}
export function submit(t, { who, text }) {
  if (t.entrants[who]?.role !== 'participant') return { ok: false, error: T('only participants submit', 'seuls les participants soumettent') };
  const s = String(text ?? '').trim(); if (s.length < 50 || s.length > 1500) return { ok: false, error: T('proposal of 50 to 1,500 characters', 'proposition de 50 à 1 500 caractères') };
  if (t.submissions[who]) return { ok: false, error: T('one proposal per participant', 'une seule proposition par participant') };
  return { ok: true, value: { ...t, submissions: { ...t.submissions, [who]: { text: s } } } };
}
export function close(t, phase) { const order = ['registration', 'submission', 'judging', 'closed']; return order.indexOf(phase) === order.indexOf(t.phase) + 1 ? { ok: true, value: { ...t, phase } } : { ok: false, error: T(`phase ${t.phase} → ${phase} not allowed`, `phase ${t.phase} → ${phase} interdite`) }; }
export function judge(t, { who, entry, scores, notes }) {
  const j = t.entrants[who];
  if (j?.role !== 'judge') return { ok: false, error: T('only judges score', 'seuls les juges notent') };
  if (t.phase !== 'judging') return { ok: false, error: T('scoring outside the judging phase', 'notation hors phase de jugement') };
  if (j.conflicts.includes(entry)) return { ok: false, error: T('conflict of interest: this judge does not score this proposal', 'conflit d’intérêts : ce juge ne note pas cette proposition') };
  if (!t.submissions[entry]) return { ok: false, error: T('unknown proposal', 'proposition inconnue') };
  for (const [id, label] of t.challenge.criteria) {
    if (!Number.isInteger(scores[id]) || scores[id] < 0 || scores[id] > 4) return { ok: false, error: T(`score 0–4 required: “${L(label)}”`, `note 0–4 requise : « ${L(label)} »`) };
    if (String(notes?.[id] ?? '').trim().length < 10) return { ok: false, error: T(`justification required: “${L(label)}”`, `justification requise : « ${L(label)} »`) };
  }
  return { ok: true, value: { ...t, sheets: { ...t.sheets, [`${who}→${entry}`]: { judge: who, entry, scores, notes } } } };
}
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// Sheets stay sealed until the tournament closes; then everything is published.
export function visibleSheets(t, viewer) { return t.phase === 'closed' ? Object.values(t.sheets) : Object.values(t.sheets).filter(s => s.judge === viewer); }
export function results(t) {
  if (t.phase !== 'closed') return { ok: false, error: T('results published only at closing', 'résultats publiés seulement à la clôture') };
  const judges = Object.entries(t.entrants).filter(([, e]) => e.role === 'judge').map(([w]) => w);
  if (judges.length < 3) return { ok: false, error: T('at least three judges required', 'au moins trois juges requis') };
  const rows = Object.keys(t.submissions).map(entry => {
    const sheets = Object.values(t.sheets).filter(s => s.entry === entry);
    if (sheets.length < 3) return { entry, complete: false };
    return { entry, complete: true, judges: sheets.length, total: median(sheets.map(s => Object.values(s.scores).reduce((a, b) => a + b, 0))), evidence: median(sheets.map(s => s.scores.evidence)) };
  });
  const done = rows.filter(r => r.complete).sort((a, b) => b.total - a.total || b.evidence - a.evidence);
  let rank = 0; done.forEach((r, i) => { if (i === 0 || r.total !== done[i - 1].total || r.evidence !== done[i - 1].evidence) rank = i + 1; r.rank = rank; });
  return { ok: true, value: { fictional: t.challenge.fictional, authorizes: false, scientificValidation: false, ranking: done, incomplete: rows.filter(r => !r.complete).map(r => r.entry), sheets: Object.values(t.sheets) } };
}
