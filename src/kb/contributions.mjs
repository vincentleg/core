// CORE Knowledge — human contributions as CANDIDATES (V6). Nothing submitted here ever enters verified knowledge
// automatically. Pipeline: submitted → validated → quarantine → provenance-review → classified → conflict-check →
// human-review-required → (approved | rejected). The prototype has no authenticated human reviewer, so no candidate can
// reach "approved"; a SIMULATED reviewer role can annotate, and is labelled as such everywhere. Submitted URLs are never fetched.
import { screen } from '../world/safety.mjs';

export const TYPES = { 'research-link': 'Lien de recherche', news: 'Article de presse', publication: 'Publication scientifique', observation: 'Observation locale', correction: 'Correction', 'new-problem': 'Nouveau problème', solution: 'Solution possible', 'technical-idea': 'Idée technique' };
// How each type is classified epistemically before any review (reuses the evidence vocabulary of docs/DESIGN.md).
export const CLASS = { 'research-link': 'source signalée (non lue par CORE)', news: 'événement rapporté', publication: 'preuve scientifique candidate', observation: 'observation rapportée', correction: 'affirmation contestée', 'new-problem': 'hypothèse de problème', solution: 'solution proposée', 'technical-idea': 'solution proposée' };
export const STATES = { submitted: 'Soumise', validated: 'Entrée validée', quarantine: 'Quarantaine', 'provenance-review': 'Revue de provenance', classified: 'Classée', 'conflict-check': 'Vérification des conflits', 'human-review-required': 'Revue humaine requise', 'reviewed-simulated': 'Annotée par un relecteur SIMULÉ (aucune personne réelle)', approved: 'Approuvée', rejected: 'Rejetée (motif publié)' };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validateUrl(u) {
  if (!u) return { ok: true, value: null };
  let url; try { url = new URL(String(u)); } catch { return { ok: false, error: 'adresse invalide' }; }
  if (url.protocol !== 'https:') return { ok: false, error: 'seules les adresses https sont acceptées' };
  if (url.username || url.password) return { ok: false, error: 'pas d’identifiants dans une adresse' };
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|0\.0\.0\.0)/i.test(url.hostname) || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) return { ok: false, error: 'adresses locales ou IP non acceptées' };
  if (String(u).length > 500) return { ok: false, error: 'adresse trop longue' };
  return { ok: true, value: url.href };
}

export function submit(form, { id, at = new Date().toISOString(), author = 'local' } = {}) {
  const errors = [];
  if (!TYPES[form.type]) errors.push('type inconnu');
  const sc = screen(form.claim, { history: [] });
  if (!sc.ok) errors.push(sc.message);
  const claim = sc.ok ? sc.text : '';
  if (sc.ok && (claim.length < 20 || claim.length > 1000)) errors.push('affirmation de 20 à 1 000 caractères');
  const url = validateUrl(form.url); if (!url.ok) errors.push(url.error);
  if (['publication', 'research-link', 'news'].includes(form.type) && !url.value) errors.push('une source https est requise pour ce type');
  if (form.publishedOn && (!ISO.test(form.publishedOn) || form.publishedOn > at.slice(0, 10))) errors.push('date de publication invalide ou future');
  const ev = form.evidence ? screen(form.evidence, { history: [] }) : { ok: true, text: '', notes: [] };
  if (!ev.ok) errors.push(ev.message);
  if (!['pseudonym', 'anonymous'].includes(form.attribution || 'pseudonym')) errors.push('attribution inconnue');
  if (!['private', 'reviewers'].includes(form.visibility || 'private')) errors.push('visibilité inconnue');
  if (errors.length) return { ok: false, errors };
  const c = { id, at, author, type: form.type, claim, url: url.value, publishedOn: form.publishedOn || null, topic: String(form.topic || '').slice(0, 60),
    problemId: form.problemId || null, place: form.place ? String(form.place).slice(0, 120) : null, evidence: ev.text || '', attribution: form.attribution || 'pseudonym', visibility: form.visibility || 'private',
    notes: [...sc.notes, ...(ev.notes || [])], state: 'submitted', history: [{ to: 'submitted', by: 'auteur', at }], corrections: [], conflicts: [], class: null };
  return { ok: true, value: c };
}

// Automatic, deterministic steps. Numbers in the claim are compared with the cited problem's recorded metrics.
export function process(c, ix, { at = new Date().toISOString() } = {}) {
  const x = structuredClone(c), step = (to, by, note) => { x.state = to; x.history.push({ to, by, at, ...(note ? { note } : {}) }); };
  step('validated', 'système', 'formats, longueurs, adresse https, filtrage de sécurité');
  step('quarantine', 'système', 'isolée de la connaissance vérifiée ; rien n’est publié');
  step('provenance-review', 'système', x.url ? `source déclarée : ${new URL(x.url).hostname} (non consultée automatiquement)` : 'aucune source : observation ou proposition personnelle');
  x.class = CLASS[x.type]; step('classified', 'système', x.class);
  const p = x.problemId && ix?.problems.find(q => q.id === x.problemId);
  if (x.problemId && !p) x.conflicts.push({ kind: 'unknown-problem', detail: `problème inconnu : ${x.problemId}` });
  if (p?.metrics) for (const m of x.claim.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:ft|pieds?|feet)\b/gi)) {
    const v = Number(m[1].replace(',', '.'));
    if (p.metrics.width_ft != null && Math.abs(v - p.metrics.width_ft) > 1e-9 && Math.abs(v - (p.metrics.min_ft ?? NaN)) > 1e-9)
      x.conflicts.push({ kind: 'measurement', record: p.id, recorded: `${p.metrics.width_ft} ft (étude 2014)`, claimed: `${v} ft`, detail: 'La valeur affirmée diffère de la mesure enregistrée. Ce n’est pas une erreur en soi : la mesure enregistrée date de 2014.' });
  }
  step('conflict-check', 'système', x.conflicts.length ? `${x.conflicts.length} conflit(s) avec les enregistrements` : 'aucun conflit détecté avec les enregistrements cités');
  step('human-review-required', 'système', 'une personne compétente et identifiée doit relire avant toute intégration');
  return x;
}

// Reviews. Only an authenticated human reviewer may approve or reject; none exists in this prototype.
export const REVIEWERS = [];
export function review(c, { role, decision, reason = '', at = new Date().toISOString() }) {
  if (c.state !== 'human-review-required' && c.state !== 'reviewed-simulated') return { ok: false, error: `revue impossible à l’état « ${STATES[c.state]} »` };
  if (role === 'simulated-reviewer') {
    if (decision !== 'annotate') return { ok: false, error: 'un relecteur simulé peut seulement annoter : il ne peut ni approuver ni rejeter' };
    if (reason.trim().length < 10) return { ok: false, error: 'une annotation doit être motivée' };
    const x = structuredClone(c); x.state = 'reviewed-simulated'; x.history.push({ to: 'reviewed-simulated', by: 'relecteur SIMULÉ (démonstration)', at, note: reason.slice(0, 500) }); return { ok: true, value: x };
  }
  if (role === 'human-reviewer') {
    if (!REVIEWERS.length) return { ok: false, error: 'aucun relecteur humain authentifié n’existe : la contribution reste en attente' };
  }
  return { ok: false, error: 'rôle de revue inconnu' };
}
// The author may correct before review; every correction is kept.
export function correct(c, { claim, actor, at = new Date().toISOString() }) {
  if (actor !== c.author) return { ok: false, error: 'seul l’auteur corrige sa contribution' };
  if (['approved', 'rejected'].includes(c.state)) return { ok: false, error: 'contribution close' };
  const sc = screen(claim, { history: [] }); if (!sc.ok) return { ok: false, error: sc.message };
  const x = structuredClone(c); x.corrections.push({ at, before: x.claim }); x.claim = sc.text; x.state = 'submitted'; x.history.push({ to: 'submitted', by: 'auteur', at, note: 'correction' }); x.conflicts = []; return { ok: true, value: x };
}
