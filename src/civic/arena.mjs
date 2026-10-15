// CORE Arena — one FICTIONAL tournament with published rules, roles, independent judging and no public voting
// (V4 prototype). A tournament result recognises a proposal; it never validates science or authorises any action.
export const ROLES = { spectator: 'Spectateur', 'spectator-voter': 'Spectateur-votant', participant: 'Participant', judge: 'Juge' };
export const CHALLENGE = {
  id: 'arena-fictional-001', fictional: true,
  label: 'DÉFI FICTIF — aucun lieu, aucune donnée et aucun résultat réels',
  title: 'Rafraîchir une cour d’école à Ville-Exemple pendant les vagues de chaleur',
  statement: 'Ville-Exemple (ville imaginaire) dispose d’une cour d’école de 1 200 m², asphaltée, sans ombre. Proposez une amélioration réalisable en un été, avec un budget fictif de 40 000 €.',
  rules: [
    'Une proposition par participant, 1 500 caractères au plus, rédigée par le participant.',
    'Au moins trois juges indépendants ; un juge ne peut pas être participant ni collaborateur d’un participant.',
    'Chaque juge note seul, sans voir les autres notes, sur cinq critères de 0 à 4, avec une justification par critère.',
    'Résultat : médiane des totaux des juges ; égalité départagée par la médiane du critère « preuves », sinon ex aequo.',
    'Toutes les fiches de juges sont publiées à la clôture. Contestation possible pendant 7 jours auprès d’un humain.',
    'Pas de vote public dans ce prototype. Le classement ne vaut ni validation scientifique ni autorisation d’agir.',
  ],
  criteria: [['evidence', 'Preuves et hypothèses explicites'], ['feasibility', 'Faisabilité (budget, délai)'], ['equity', 'Équité et accessibilité'], ['risks', 'Risques identifiés'], ['measurement', 'Mesure de l’effet prévue']],
  publicVoting: false,
};

export function newTournament(ch = CHALLENGE) { return { challenge: ch, phase: 'registration', entrants: {}, submissions: {}, sheets: {}, results: null }; }
export function register(t, { who, role, conflicts = [] }) {
  if (t.phase !== 'registration') return { ok: false, error: 'inscriptions closes' };
  if (!ROLES[role]) return { ok: false, error: 'rôle inconnu' };
  if (role === 'spectator-voter' && !t.challenge.publicVoting) return { ok: false, error: 'vote public désactivé : intégrité du vote non encore garantie (identité, anti-Sybil, modération)' };
  if (t.entrants[who]) return { ok: false, error: 'déjà inscrit (un seul rôle par personne)' };
  if (role === 'judge' && conflicts.some(c => t.entrants[c]?.role === 'participant')) return { ok: false, error: 'conflit d’intérêts déclaré avec un participant' };
  return { ok: true, value: { ...t, entrants: { ...t.entrants, [who]: { role, conflicts } } } };
}
export function submit(t, { who, text }) {
  if (t.entrants[who]?.role !== 'participant') return { ok: false, error: 'seuls les participants soumettent' };
  const s = String(text ?? '').trim(); if (s.length < 50 || s.length > 1500) return { ok: false, error: 'proposition de 50 à 1 500 caractères' };
  if (t.submissions[who]) return { ok: false, error: 'une seule proposition par participant' };
  return { ok: true, value: { ...t, submissions: { ...t.submissions, [who]: { text: s } } } };
}
export function close(t, phase) { const order = ['registration', 'submission', 'judging', 'closed']; return order.indexOf(phase) === order.indexOf(t.phase) + 1 ? { ok: true, value: { ...t, phase } } : { ok: false, error: `phase ${t.phase} → ${phase} interdite` }; }
export function judge(t, { who, entry, scores, notes }) {
  const j = t.entrants[who];
  if (j?.role !== 'judge') return { ok: false, error: 'seuls les juges notent' };
  if (t.phase !== 'judging') return { ok: false, error: 'notation hors phase de jugement' };
  if (j.conflicts.includes(entry)) return { ok: false, error: 'conflit d’intérêts : ce juge ne note pas cette proposition' };
  if (!t.submissions[entry]) return { ok: false, error: 'proposition inconnue' };
  for (const [id, label] of t.challenge.criteria) {
    if (!Number.isInteger(scores[id]) || scores[id] < 0 || scores[id] > 4) return { ok: false, error: `note 0–4 requise : « ${label} »` };
    if (String(notes?.[id] ?? '').trim().length < 10) return { ok: false, error: `justification requise : « ${label} »` };
  }
  return { ok: true, value: { ...t, sheets: { ...t.sheets, [`${who}→${entry}`]: { judge: who, entry, scores, notes } } } };
}
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// Sheets stay sealed until the tournament closes; then everything is published.
export function visibleSheets(t, viewer) { return t.phase === 'closed' ? Object.values(t.sheets) : Object.values(t.sheets).filter(s => s.judge === viewer); }
export function results(t) {
  if (t.phase !== 'closed') return { ok: false, error: 'résultats publiés seulement à la clôture' };
  const judges = Object.entries(t.entrants).filter(([, e]) => e.role === 'judge').map(([w]) => w);
  if (judges.length < 3) return { ok: false, error: 'au moins trois juges requis' };
  const rows = Object.keys(t.submissions).map(entry => {
    const sheets = Object.values(t.sheets).filter(s => s.entry === entry);
    if (sheets.length < 3) return { entry, complete: false };
    return { entry, complete: true, judges: sheets.length, total: median(sheets.map(s => Object.values(s.scores).reduce((a, b) => a + b, 0))), evidence: median(sheets.map(s => s.scores.evidence)) };
  });
  const done = rows.filter(r => r.complete).sort((a, b) => b.total - a.total || b.evidence - a.evidence);
  let rank = 0; done.forEach((r, i) => { if (i === 0 || r.total !== done[i - 1].total || r.evidence !== done[i - 1].evidence) rank = i + 1; r.rank = rank; });
  return { ok: true, value: { fictional: t.challenge.fictional, authorizes: false, scientificValidation: false, ranking: done, incomplete: rows.filter(r => !r.complete).map(r => r.entry), sheets: Object.values(t.sheets) } };
}
