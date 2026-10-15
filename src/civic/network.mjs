// CORE Expert Network and Communities — local prototype with FICTIONAL people (V6). No real person is represented or
// contacted; no institution is named; nothing is published. Review requests live inside the encrypted vault (they may
// contain private idea text). An expert's opinion is advice, never validation; the author records their own decision.
import { screen } from '../world/safety.mjs';

export const FICTION = 'FICTIF — personne et organisation inventées pour la démonstration ; aucune vérification, aucun contact réel';
export const EXPERTS = [
  { id: 'xp-a', name: 'Expert·e fictif·ve A', field: 'Urbanisme et espace public', tags: ['accessibilité', 'trottoir', 'espace public', 'piéton'], affiliation: 'Atelier d’urbanisme fictif', languages: ['fr', 'en'], verification: 'synthetic', coi: [] },
  { id: 'xp-b', name: 'Expert·e fictif·ve B', field: 'Génie civil et voirie', tags: ['infrastructure', 'chaussée', 'travaux', 'réseaux', 'trottoir'], affiliation: 'Bureau d’études fictif', languages: ['en'], verification: 'synthetic', coi: ['entreprise de travaux de voirie (fictive)'] },
  { id: 'xp-c', name: 'Expert·e fictif·ve C', field: 'Mesure et statistique urbaine', tags: ['mesure', 'comptage', 'statistique', 'méthode', 'piéton'], affiliation: 'Laboratoire fictif', languages: ['fr'], verification: 'synthetic', coi: [] },
  { id: 'xp-d', name: 'Expert·e fictif·ve D', field: 'Arboriculture urbaine', tags: ['arbre', 'nature', 'plantation', 'environnement'], affiliation: 'Collectif fictif', languages: ['en', 'es'], verification: 'synthetic', coi: [] },
];
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Matching by declared topics only (no prestige, no popularity), with the reason shown.
export function match(text, { domain = null } = {}) {
  const t = norm(text);
  return EXPERTS.map(x => { const hits = x.tags.filter(tag => t.includes(norm(tag)) || norm(domain || '') === norm(tag) || (domain === 'accessibility' && tag === 'accessibilité') || (domain === 'infrastructure' && tag === 'infrastructure'));
    return { expert: x, hits, why: hits.length ? `sujets en commun : ${hits.join(', ')}` : 'aucun sujet en commun' }; }).filter(m => m.hits.length).sort((a, b) => b.hits.length - a.hits.length);
}
export const SHARE = { summary: 'Titre et problème seulement', version: 'Version complète choisie' };
// The request snapshot contains only what the author chose to share; it is stored inside the (encrypted) idea.
export function request(idea, { expertId, share, version, message = '', conflicts = '', confirmed = false, at = new Date().toISOString() }) {
  const x = EXPERTS.find(e => e.id === expertId); if (!x) return { ok: false, error: 'expert inconnu' };
  if (!confirmed) return { ok: false, error: 'confirmez ce que vous partagez avant de préparer la demande' };
  if (!SHARE[share]) return { ok: false, error: 'choix de partage inconnu' };
  const v = idea.versions.find(y => y.n === Number(version)) || idea.versions.at(-1); if (!v) return { ok: false, error: 'aucune version' };
  const m = screen(message || 'Pouvez-vous relire cette proposition ?', { history: [] }); if (!m.ok) return { ok: false, error: m.message };
  const coi = x.coi.length ? { declared: x.coi, note: 'conflit d’intérêts déclaré par l’expert (fictif) : son avis serait signalé comme tel' } : null;
  const snapshot = share === 'summary' ? { title: v.title, problem: v.problem } : { title: v.title, problem: v.problem, solution: v.solution, evidence: v.evidence, hash: v.hash };
  const r = { id: `rq-${Date.parse(at).toString(36)}`, expertId, expert: x.name, fictional: true, at, version: v.n, share, snapshot, message: m.text, authorConflicts: String(conflicts).slice(0, 300), coi, state: 'prepared', history: [{ to: 'prepared', at }] };
  return { ok: true, value: { ...idea, reviewRequests: [...(idea.reviewRequests || []), r] } };
}
// A fictional expert "answers" with rule-based questions drawn from the dossier's missing evidence — clearly labelled.
export function fictionalResponse(idea, requestId, { missing = [], at = new Date().toISOString() } = {}) {
  const rs = idea.reviewRequests || [], i = rs.findIndex(r => r.id === requestId); if (i < 0) return { ok: false, error: 'demande inconnue' };
  const r = rs[i]; if (r.state !== 'prepared') return { ok: false, error: 'demande déjà traitée' };
  const qs = missing.length ? missing.map(m => `Pouvez-vous apporter : ${m.label.charAt(0).toLowerCase() + m.label.slice(1)} ?`) : ['Quelle mesure actuelle confirme que le problème existe encore ?'];
  const response = { kind: 'fictional', label: 'AVIS FICTIF généré par règles — ni revue réelle, ni validation, ni approbation', text: `Avant tout avis sur le fond, il manque des éléments.\n${qs.map(q => `• ${q}`).join('\n')}${r.coi ? `\n(Conflit d’intérêts déclaré : ${r.coi.declared.join(', ')}.)` : ''}`, at };
  const next = { ...r, state: 'answered-fictional', response, history: [...r.history, { to: 'answered-fictional', at }] };
  return { ok: true, value: { ...idea, reviewRequests: rs.map((x, k) => k === i ? next : x) } };
}
// The author decides what to do with the advice; this is a human decision record, not a validation.
export const DECISIONS = { accept: 'Je retiens ces remarques', partial: 'Je retiens une partie', disagree: 'Je ne suis pas d’accord (motif)', later: 'À reprendre plus tard' };
export function decide(idea, requestId, { decision, reason = '', actor, at = new Date().toISOString() }) {
  if (actor !== idea.owner) return { ok: false, error: 'seul l’auteur décide' };
  if (!DECISIONS[decision]) return { ok: false, error: 'décision inconnue' };
  if (decision === 'disagree' && reason.trim().length < 10) return { ok: false, error: 'un désaccord se motive' };
  const rs = idea.reviewRequests || [], i = rs.findIndex(r => r.id === requestId); if (i < 0) return { ok: false, error: 'demande inconnue' };
  const r = { ...rs[i], authorDecision: { decision, label: DECISIONS[decision], reason: reason.slice(0, 500), at, scope: 'décision de l’auteur sur son idée — n’engage personne d’autre' } };
  return { ok: true, value: { ...idea, reviewRequests: rs.map((x, k) => k === i ? r : x) } };
}

// ---------- Communities (fictional members, real evidence references) ----------
export const COMMUNITIES = [
  { id: 'cm-folsom', kind: 'problème', name: 'Trottoir de Folsom, 5e → Falmouth', problemId: 'sidewalk-below-bsp-min:5665000', adultsOnly: true,
    rules: ['Parler des faits et des idées, jamais des personnes.', 'Citer une source pour toute affirmation de fait.', 'Aucune donnée personnelle, aucune adresse privée.', 'Le désaccord argumenté est bienvenu ; l’insulte est retirée.'],
    members: [['m1', 'Membre fictif 1', 'modérateur·rice'], ['m2', 'Membre fictif 2', 'membre'], ['m3', 'Membre fictif 3', 'membre']],
    threads: [
      { id: 't1', title: 'La mesure de 2014 est-elle encore valable ?', posts: [
        { id: 'p1', by: 'm2', text: 'Le registre indique 10 ft en 2014 (sidewalks:8562). Quelqu’un a-t-il une mesure récente ?', evidence: ['sidewalks:8562'] },
        { id: 'p2', by: 'm3', text: 'Je propose un protocole de mesure commun avant de discuter des solutions : même endroit, même outil, photo datée.', evidence: [] }] },
      { id: 't2', title: 'Élargir ou déplacer le mobilier ?', posts: [
        { id: 'p3', by: 'm1', text: 'Deux approches s’opposent ; aucune n’a de mesure d’effet. Comparons-les dans l’Arène plutôt que de voter.', evidence: [] }] }] },
  { id: 'cm-access', kind: 'thématique', name: 'Accessibilité des rues', adultsOnly: true, rules: ['Mêmes règles que toute communauté CORE.'], members: [['m4', 'Membre fictif 4', 'membre']], threads: [] },
  { id: 'cm-soma', kind: 'géographique', name: 'SoMa, San Francisco', adultsOnly: true, rules: ['Pas de localisation précise de personnes.'], members: [['m5', 'Membre fictif 5', 'membre']], threads: [] },
  { id: 'cm-measure', kind: 'recherche', name: 'Mesure urbaine ouverte', adultsOnly: true, rules: ['Méthodes publiées avant les résultats.'], members: [['m6', 'Membre fictif 6', 'membre']], threads: [] },
  { id: 'cm-project', kind: 'projet', name: 'Projet : relevé citoyen des trottoirs', adultsOnly: true, rules: ['Toute action sur la voie publique demande l’autorisation de la ville.'], members: [['m2', 'Membre fictif 2', 'porteur·se'], ['m6', 'Membre fictif 6', 'membre']], threads: [] },
];
export const MOD = { visible: 'Visible', reported: 'Signalé', 'under-review': 'En modération (simulée)', removed: 'Retiré (motif publié)', kept: 'Maintenu (motif publié)', appealed: 'Contesté — en attente d’un humain' };
// A draft stays local: there is no publication channel in this prototype.
export function draftPost(community, { thread, text, at = new Date().toISOString() }) {
  if (!COMMUNITIES.some(c => c.id === community)) return { ok: false, error: 'communauté inconnue' };
  const s = screen(text, { history: [] }); if (!s.ok) return { ok: false, error: s.message };
  if (s.text.length < 10) return { ok: false, error: 'message trop court' };
  return { ok: true, value: { id: `dp-${Date.parse(at).toString(36)}`, community, thread: thread || null, text: s.text, notes: s.notes, at, state: 'draft-local', label: 'brouillon local — non publié, personne ne le voit' } };
}
// Reporting and moderation states; the simulated moderator can only apply published rules, and appeals go to a human.
export function report(post, { reason, at = new Date().toISOString() }) {
  if (String(reason || '').trim().length < 5) return { ok: false, error: 'motif de signalement requis' };
  return { ok: true, value: { ...post, mod: { state: 'reported', reason: reason.slice(0, 200), history: [{ to: 'reported', at }] } } };
}
export function moderate(post, { rule, outcome, at = new Date().toISOString() }) {
  if (post.mod?.state !== 'reported') return { ok: false, error: 'rien à modérer' };
  if (!['removed', 'kept'].includes(outcome)) return { ok: false, error: 'issue inconnue' };
  if (!rule) return { ok: false, error: 'une décision de modération cite la règle appliquée' };
  return { ok: true, value: { ...post, mod: { ...post.mod, state: outcome, rule, by: 'modération SIMULÉE (démonstration)', history: [...post.mod.history, { to: 'under-review', at }, { to: outcome, at }] } } };
}
export function appeal(post, { reason, at = new Date().toISOString() }) {
  if (!['removed', 'kept'].includes(post.mod?.state)) return { ok: false, error: 'seule une décision de modération se conteste' };
  if (String(reason || '').trim().length < 10) return { ok: false, error: 'motif de contestation requis' };
  return { ok: true, value: { ...post, mod: { ...post.mod, state: 'appealed', appeal: reason.slice(0, 300), history: [...post.mod.history, { to: 'appealed', at }] } } };
}
