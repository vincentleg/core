// CORE Expert Network and Communities — local prototype with FICTIONAL people (V6). No real person is represented or
// contacted; no institution is named; nothing is published. Review requests live inside the encrypted vault (they may
// contain private idea text). An expert's opinion is advice, never validation; the author records their own decision.
import { screen } from '../world/safety.mjs';
import { T, L } from '../i18n/i18n.mjs';
const B = (en, fr) => ({ en, fr });

export const FICTION = B('FICTIONAL — person and organisation invented for the demonstration; no verification, no real contact', 'FICTIF — personne et organisation inventées pour la démonstration ; aucune vérification, aucun contact réel');
export const EXPERTS = [
  { id: 'xp-a', name: B('Fictional expert A', 'Expert·e fictif·ve A'), field: B('Urban planning and public space', 'Urbanisme et espace public'), tags: ['accessibilité', 'trottoir', 'espace public', 'piéton', 'accessibility', 'sidewalk', 'public space', 'pedestrian'], affiliation: B('Fictional planning studio', 'Atelier d’urbanisme fictif'), languages: ['fr', 'en'], verification: 'synthetic', coi: [] },
  { id: 'xp-b', name: B('Fictional expert B', 'Expert·e fictif·ve B'), field: B('Civil engineering and roads', 'Génie civil et voirie'), tags: ['infrastructure', 'chaussée', 'travaux', 'réseaux', 'trottoir', 'roadway', 'works', 'utilities', 'sidewalk'], affiliation: B('Fictional engineering office', 'Bureau d’études fictif'), languages: ['en'], verification: 'synthetic', coi: [B('road-works company (fictional)', 'entreprise de travaux de voirie (fictive)')] },
  { id: 'xp-c', name: B('Fictional expert C', 'Expert·e fictif·ve C'), field: B('Urban measurement and statistics', 'Mesure et statistique urbaine'), tags: ['mesure', 'comptage', 'statistique', 'méthode', 'piéton', 'measurement', 'count', 'statistics', 'method', 'pedestrian'], affiliation: B('Fictional laboratory', 'Laboratoire fictif'), languages: ['fr'], verification: 'synthetic', coi: [] },
  { id: 'xp-d', name: B('Fictional expert D', 'Expert·e fictif·ve D'), field: B('Urban arboriculture', 'Arboriculture urbaine'), tags: ['arbre', 'nature', 'plantation', 'environnement', 'tree', 'planting', 'environment'], affiliation: B('Fictional collective', 'Collectif fictif'), languages: ['en', 'es'], verification: 'synthetic', coi: [] },
];
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Matching by declared topics only (no prestige, no popularity), with the reason shown.
export function match(text, { domain = null } = {}) {
  const t = norm(text);
  return EXPERTS.map(x => { const hits = x.tags.filter(tag => t.includes(norm(tag)) || norm(domain || '') === norm(tag) || (domain === 'accessibility' && tag === 'accessibilité') || (domain === 'infrastructure' && tag === 'infrastructure'));
    return { expert: x, hits, why: hits.length ? T(`topics in common: ${hits.join(', ')}`, `sujets en commun : ${hits.join(', ')}`) : T('no topic in common', 'aucun sujet en commun') }; }).filter(m => m.hits.length).sort((a, b) => b.hits.length - a.hits.length);
}
export const SHARE = { summary: B('Title and problem only', 'Titre et problème seulement'), version: B('Chosen full version', 'Version complète choisie') };
// The request snapshot contains only what the author chose to share; it is stored inside the (encrypted) idea.
export function request(idea, { expertId, share, version, message = '', conflicts = '', confirmed = false, at = new Date().toISOString() }) {
  const x = EXPERTS.find(e => e.id === expertId); if (!x) return { ok: false, error: T('unknown expert', 'expert inconnu') };
  if (!confirmed) return { ok: false, error: T('confirm what you share before preparing the request', 'confirmez ce que vous partagez avant de préparer la demande') };
  if (!SHARE[share]) return { ok: false, error: T('unknown sharing choice', 'choix de partage inconnu') };
  const v = idea.versions.find(y => y.n === Number(version)) || idea.versions.at(-1); if (!v) return { ok: false, error: T('no version', 'aucune version') };
  const m = screen(message || T('Could you review this proposal?', 'Pouvez-vous relire cette proposition ?'), { history: [] }); if (!m.ok) return { ok: false, error: m.message };
  const coi = x.coi.length ? { declared: x.coi.map(c => L(c)), note: T('conflict of interest declared by the (fictional) expert: their opinion would be flagged as such', 'conflit d’intérêts déclaré par l’expert (fictif) : son avis serait signalé comme tel') } : null;
  const snapshot = share === 'summary' ? { title: v.title, problem: v.problem } : { title: v.title, problem: v.problem, solution: v.solution, evidence: v.evidence, hash: v.hash };
  const r = { id: `rq-${Date.parse(at).toString(36)}`, expertId, expert: L(x.name), fictional: true, at, version: v.n, share, snapshot, message: m.text, authorConflicts: String(conflicts).slice(0, 300), coi, state: 'prepared', history: [{ to: 'prepared', at }] };
  return { ok: true, value: { ...idea, reviewRequests: [...(idea.reviewRequests || []), r] } };
}
// A fictional expert "answers" with rule-based questions drawn from the dossier's missing evidence — clearly labelled.
export function fictionalResponse(idea, requestId, { missing = [], at = new Date().toISOString() } = {}) {
  const rs = idea.reviewRequests || [], i = rs.findIndex(r => r.id === requestId); if (i < 0) return { ok: false, error: T('unknown request', 'demande inconnue') };
  const r = rs[i]; if (r.state !== 'prepared') return { ok: false, error: T('request already handled', 'demande déjà traitée') };
  const qs = missing.length ? missing.map(m => T(`Could you provide: ${m.label.charAt(0).toLowerCase() + m.label.slice(1)}?`, `Pouvez-vous apporter : ${m.label.charAt(0).toLowerCase() + m.label.slice(1)} ?`)) : [T('Which current measurement confirms that the problem still exists?', 'Quelle mesure actuelle confirme que le problème existe encore ?')];
  const response = { kind: 'fictional', label: T('FICTIONAL OPINION generated by rules — not a real review, not a validation, not an approval', 'AVIS FICTIF généré par règles — ni revue réelle, ni validation, ni approbation'), text: `${T('Before any opinion on substance, elements are missing.', 'Avant tout avis sur le fond, il manque des éléments.')}\n${qs.map(q => `• ${q}`).join('\n')}${r.coi ? `\n(${T(`Declared conflict of interest: ${r.coi.declared.join(', ')}.`, `Conflit d’intérêts déclaré : ${r.coi.declared.join(', ')}.`)})` : ''}`, at };
  const next = { ...r, state: 'answered-fictional', response, history: [...r.history, { to: 'answered-fictional', at }] };
  return { ok: true, value: { ...idea, reviewRequests: rs.map((x, k) => k === i ? next : x) } };
}
// The author decides what to do with the advice; this is a human decision record, not a validation.
export const DECISIONS = { accept: B('I take these remarks on board', 'Je retiens ces remarques'), partial: B('I take part of them', 'Je retiens une partie'), disagree: B('I disagree (reason)', 'Je ne suis pas d’accord (motif)'), later: B('To revisit later', 'À reprendre plus tard') };
export function decide(idea, requestId, { decision, reason = '', actor, at = new Date().toISOString() }) {
  if (actor !== idea.owner) return { ok: false, error: T('only the author decides', 'seul l’auteur décide') };
  if (!DECISIONS[decision]) return { ok: false, error: T('unknown decision', 'décision inconnue') };
  if (decision === 'disagree' && reason.trim().length < 10) return { ok: false, error: T('a disagreement needs a reason', 'un désaccord se motive') };
  const rs = idea.reviewRequests || [], i = rs.findIndex(r => r.id === requestId); if (i < 0) return { ok: false, error: T('unknown request', 'demande inconnue') };
  const r = { ...rs[i], authorDecision: { decision, label: L(DECISIONS[decision]), reason: reason.slice(0, 500), at, scope: T('the author’s decision about their idea — binds nobody else', 'décision de l’auteur sur son idée — n’engage personne d’autre') } };
  return { ok: true, value: { ...idea, reviewRequests: rs.map((x, k) => k === i ? r : x) } };
}

// ---------- Communities (fictional members, real evidence references) ----------
export const COMMUNITIES = [
  { id: 'cm-folsom', kind: B('problem', 'problème'), name: B('Folsom sidewalk, 5th → Falmouth', 'Trottoir de Folsom, 5e → Falmouth'), problemId: 'sidewalk-below-bsp-min:5665000', adultsOnly: true,
    rules: [B('Talk about facts and ideas, never about people.', 'Parler des faits et des idées, jamais des personnes.'), B('Cite a source for any statement of fact.', 'Citer une source pour toute affirmation de fait.'), B('No personal data, no private address.', 'Aucune donnée personnelle, aucune adresse privée.'), B('Reasoned disagreement is welcome; insults are removed.', 'Le désaccord argumenté est bienvenu ; l’insulte est retirée.')],
    members: [['m1', B('Fictional member 1', 'Membre fictif 1'), B('moderator', 'modérateur·rice')], ['m2', B('Fictional member 2', 'Membre fictif 2'), B('member', 'membre')], ['m3', B('Fictional member 3', 'Membre fictif 3'), B('member', 'membre')]],
    threads: [
      { id: 't1', title: B('Is the 2014 measurement still valid?', 'La mesure de 2014 est-elle encore valable ?'), posts: [
        { id: 'p1', by: 'm2', text: B('The registry says 10 ft in 2014 (sidewalks:8562). Does anyone have a recent measurement?', 'Le registre indique 10 ft en 2014 (sidewalks:8562). Quelqu’un a-t-il une mesure récente ?'), evidence: ['sidewalks:8562'] },
        { id: 'p2', by: 'm3', text: B('I propose a shared measurement protocol before discussing solutions: same place, same tool, dated photo.', 'Je propose un protocole de mesure commun avant de discuter des solutions : même endroit, même outil, photo datée.'), evidence: [] }] },
      { id: 't2', title: B('Widen it or move the street furniture?', 'Élargir ou déplacer le mobilier ?'), posts: [
        { id: 'p3', by: 'm1', text: B('Two approaches compete; neither has a measured effect. Let us compare them in the Arena rather than vote.', 'Deux approches s’opposent ; aucune n’a de mesure d’effet. Comparons-les dans l’Arène plutôt que de voter.'), evidence: [] }] }] },
  { id: 'cm-access', kind: B('thematic', 'thématique'), name: B('Street accessibility', 'Accessibilité des rues'), adultsOnly: true, rules: [B('Same rules as every CORE community.', 'Mêmes règles que toute communauté CORE.')], members: [['m4', B('Fictional member 4', 'Membre fictif 4'), B('member', 'membre')]], threads: [] },
  { id: 'cm-soma', kind: B('geographic', 'géographique'), name: B('SoMa, San Francisco', 'SoMa, San Francisco'), adultsOnly: true, rules: [B('No precise location of people.', 'Pas de localisation précise de personnes.')], members: [['m5', B('Fictional member 5', 'Membre fictif 5'), B('member', 'membre')]], threads: [] },
  { id: 'cm-measure', kind: B('research', 'recherche'), name: B('Open urban measurement', 'Mesure urbaine ouverte'), adultsOnly: true, rules: [B('Methods published before results.', 'Méthodes publiées avant les résultats.')], members: [['m6', B('Fictional member 6', 'Membre fictif 6'), B('member', 'membre')]], threads: [] },
  { id: 'cm-project', kind: B('project', 'projet'), name: B('Project: citizen sidewalk survey', 'Projet : relevé citoyen des trottoirs'), adultsOnly: true, rules: [B('Any action on the public road requires the city’s permission.', 'Toute action sur la voie publique demande l’autorisation de la ville.')], members: [['m2', B('Fictional member 2', 'Membre fictif 2'), B('lead', 'porteur·se')], ['m6', B('Fictional member 6', 'Membre fictif 6'), B('member', 'membre')]], threads: [] },
];
export const MOD = { visible: B('Visible', 'Visible'), reported: B('Reported', 'Signalé'), 'under-review': B('In (simulated) moderation', 'En modération (simulée)'), removed: B('Removed (reason published)', 'Retiré (motif publié)'), kept: B('Kept (reason published)', 'Maintenu (motif publié)'), appealed: B('Appealed — waiting for a human', 'Contesté — en attente d’un humain') };
// A draft stays local: there is no publication channel in this prototype.
export function draftPost(community, { thread, text, at = new Date().toISOString() }) {
  if (!COMMUNITIES.some(c => c.id === community)) return { ok: false, error: T('unknown community', 'communauté inconnue') };
  const s = screen(text, { history: [] }); if (!s.ok) return { ok: false, error: s.message };
  if (s.text.length < 10) return { ok: false, error: T('message too short', 'message trop court') };
  return { ok: true, value: { id: `dp-${Date.parse(at).toString(36)}`, community, thread: thread || null, text: s.text, notes: s.notes, at, state: 'draft-local', label: T('local draft — not published, nobody sees it', 'brouillon local — non publié, personne ne le voit') } };
}
// Reporting and moderation states; the simulated moderator can only apply published rules, and appeals go to a human.
export function report(post, { reason, at = new Date().toISOString() }) {
  if (String(reason || '').trim().length < 5) return { ok: false, error: T('reason for the report required', 'motif de signalement requis') };
  return { ok: true, value: { ...post, mod: { state: 'reported', reason: reason.slice(0, 200), history: [{ to: 'reported', at }] } } };
}
export function moderate(post, { rule, outcome, at = new Date().toISOString() }) {
  if (post.mod?.state !== 'reported') return { ok: false, error: T('nothing to moderate', 'rien à modérer') };
  if (!['removed', 'kept'].includes(outcome)) return { ok: false, error: T('unknown outcome', 'issue inconnue') };
  if (!rule) return { ok: false, error: T('a moderation decision cites the rule applied', 'une décision de modération cite la règle appliquée') };
  return { ok: true, value: { ...post, mod: { ...post.mod, state: outcome, rule, by: T('SIMULATED moderation (demonstration)', 'modération SIMULÉE (démonstration)'), history: [...post.mod.history, { to: 'under-review', at }, { to: outcome, at }] } } };
}
export function appeal(post, { reason, at = new Date().toISOString() }) {
  if (!['removed', 'kept'].includes(post.mod?.state)) return { ok: false, error: T('only a moderation decision can be appealed', 'seule une décision de modération se conteste') };
  if (String(reason || '').trim().length < 10) return { ok: false, error: T('reason for the appeal required', 'motif de contestation requis') };
  return { ok: true, value: { ...post, mod: { ...post.mod, state: 'appealed', appeal: reason.slice(0, 300), history: [...post.mod.history, { to: 'appealed', at }] } } };
}
