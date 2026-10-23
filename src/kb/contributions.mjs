// CORE Knowledge — human contributions as CANDIDATES (V6). Nothing submitted here ever enters verified knowledge
// automatically. Pipeline: submitted → validated → quarantine → provenance-review → classified → conflict-check →
// human-review-required → (approved | rejected). The prototype has no authenticated human reviewer, so no candidate can
// reach "approved"; a SIMULATED reviewer role can annotate, and is labelled as such everywhere. Submitted URLs are never fetched.
import { screen } from '../world/safety.mjs';
import { T, BL } from '../i18n/i18n.mjs';

export const TYPES = BL({ 'research-link': ['Research link', 'Lien de recherche'], news: ['News article', 'Article de presse'], publication: ['Scientific publication', 'Publication scientifique'], observation: ['Local observation', 'Observation locale'], correction: ['Correction', 'Correction'], 'new-problem': ['New problem', 'Nouveau problème'], solution: ['Possible solution', 'Solution possible'], 'technical-idea': ['Technical idea', 'Idée technique'] });
// How each type is classified epistemically before any review (reuses the evidence vocabulary of docs/DESIGN.md).
export const CLASS = BL({ 'research-link': ['reported source (not read by CORE)', 'source signalée (non lue par CORE)'], news: ['reported event', 'événement rapporté'], publication: ['candidate scientific evidence', 'preuve scientifique candidate'], observation: ['reported observation', 'observation rapportée'], correction: ['contested claim', 'affirmation contestée'], 'new-problem': ['problem hypothesis', 'hypothèse de problème'], solution: ['proposed solution', 'solution proposée'], 'technical-idea': ['proposed solution', 'solution proposée'] });
export const STATES = BL({ submitted: ['Submitted', 'Soumise'], validated: ['Input validated', 'Entrée validée'], quarantine: ['Quarantine', 'Quarantaine'], 'provenance-review': ['Provenance review', 'Revue de provenance'], classified: ['Classified', 'Classée'], 'conflict-check': ['Conflict check', 'Vérification des conflits'], 'human-review-required': ['Human review required', 'Revue humaine requise'], 'reviewed-simulated': ['Annotated by a SIMULATED reviewer (no real person)', 'Annotée par un relecteur SIMULÉ (aucune personne réelle)'], approved: ['Approved', 'Approuvée'], rejected: ['Rejected (reason published)', 'Rejetée (motif publié)'] });
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validateUrl(u) {
  if (!u) return { ok: true, value: null };
  let url; try { url = new URL(String(u)); } catch { return { ok: false, error: T('invalid address', 'adresse invalide') }; }
  if (url.protocol !== 'https:') return { ok: false, error: T('only https addresses are accepted', 'seules les adresses https sont acceptées') };
  if (url.username || url.password) return { ok: false, error: T('no credentials in an address', 'pas d’identifiants dans une adresse') };
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|0\.0\.0\.0)/i.test(url.hostname) || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) return { ok: false, error: T('local or IP addresses are not accepted', 'adresses locales ou IP non acceptées') };
  if (String(u).length > 500) return { ok: false, error: T('address too long', 'adresse trop longue') };
  return { ok: true, value: url.href };
}

export function submit(form, { id, at = new Date().toISOString(), author = 'local' } = {}) {
  const errors = [];
  if (!TYPES[form.type]) errors.push(T('unknown type', 'type inconnu'));
  const sc = screen(form.claim, { history: [] });
  if (!sc.ok) errors.push(sc.message);
  const claim = sc.ok ? sc.text : '';
  if (sc.ok && (claim.length < 20 || claim.length > 1000)) errors.push(T('claim of 20 to 1,000 characters', 'affirmation de 20 à 1 000 caractères'));
  const url = validateUrl(form.url); if (!url.ok) errors.push(url.error);
  if (['publication', 'research-link', 'news'].includes(form.type) && !url.value) errors.push(T('an https source is required for this type', 'une source https est requise pour ce type'));
  if (form.publishedOn && (!ISO.test(form.publishedOn) || form.publishedOn > at.slice(0, 10))) errors.push(T('invalid or future publication date', 'date de publication invalide ou future'));
  const ev = form.evidence ? screen(form.evidence, { history: [] }) : { ok: true, text: '', notes: [] };
  if (!ev.ok) errors.push(ev.message);
  if (!['pseudonym', 'anonymous'].includes(form.attribution || 'pseudonym')) errors.push(T('unknown attribution', 'attribution inconnue'));
  if (!['private', 'reviewers'].includes(form.visibility || 'private')) errors.push(T('unknown visibility', 'visibilité inconnue'));
  if (errors.length) return { ok: false, errors };
  const c = { id, at, author, type: form.type, claim, url: url.value, publishedOn: form.publishedOn || null, topic: String(form.topic || '').slice(0, 60),
    problemId: form.problemId || null, place: form.place ? String(form.place).slice(0, 120) : null, evidence: ev.text || '', attribution: form.attribution || 'pseudonym', visibility: form.visibility || 'private',
    notes: [...sc.notes, ...(ev.notes || [])], state: 'submitted', history: [{ to: 'submitted', by: T('author', 'auteur'), at }], corrections: [], conflicts: [], class: null };
  return { ok: true, value: c };
}

// Automatic, deterministic steps. Numbers in the claim are compared with the cited problem's recorded metrics.
export function process(c, ix, { at = new Date().toISOString() } = {}) {
  const x = structuredClone(c), step = (to, by, note) => { x.state = to; x.history.push({ to, by, at, ...(note ? { note } : {}) }); };
  step('validated', T('system', 'système'), T('formats, lengths, https address, safety screening', 'formats, longueurs, adresse https, filtrage de sécurité'));
  step('quarantine', T('system', 'système'), T('isolated from verified knowledge; nothing is published', 'isolée de la connaissance vérifiée ; rien n’est publié'));
  step('provenance-review', T('system', 'système'), x.url ? T(`declared source: ${new URL(x.url).hostname} (not fetched automatically)`, `source déclarée : ${new URL(x.url).hostname} (non consultée automatiquement)`) : T('no source: personal observation or proposal', 'aucune source : observation ou proposition personnelle'));
  x.class = CLASS[x.type]; step('classified', T('system', 'système'), x.class);
  const p = x.problemId && ix?.problems.find(q => q.id === x.problemId);
  if (x.problemId && !p) x.conflicts.push({ kind: 'unknown-problem', detail: T(`unknown problem: ${x.problemId}`, `problème inconnu : ${x.problemId}`) });
  if (p?.metrics) for (const m of x.claim.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:ft|pieds?|feet)\b/gi)) {
    const v = Number(m[1].replace(',', '.'));
    if (p.metrics.width_ft != null && Math.abs(v - p.metrics.width_ft) > 1e-9 && Math.abs(v - (p.metrics.min_ft ?? NaN)) > 1e-9)
      x.conflicts.push({ kind: 'measurement', record: p.id, recorded: T(`${p.metrics.width_ft} ft (2014 survey)`, `${p.metrics.width_ft} ft (étude 2014)`), claimed: `${v} ft`, detail: T('The claimed value differs from the recorded measurement. This is not an error in itself: the recorded measurement dates from 2014.', 'La valeur affirmée diffère de la mesure enregistrée. Ce n’est pas une erreur en soi : la mesure enregistrée date de 2014.') });
  }
  step('conflict-check', T('system', 'système'), x.conflicts.length ? T(`${x.conflicts.length} conflict(s) with the records`, `${x.conflicts.length} conflit(s) avec les enregistrements`) : T('no conflict detected with the cited records', 'aucun conflit détecté avec les enregistrements cités'));
  step('human-review-required', T('system', 'système'), T('a competent, identified person must review before any integration', 'une personne compétente et identifiée doit relire avant toute intégration'));
  return x;
}

// Reviews. Only an authenticated human reviewer may approve or reject; none exists in this prototype.
export const REVIEWERS = [];
export function review(c, { role, decision, reason = '', at = new Date().toISOString() }) {
  if (c.state !== 'human-review-required' && c.state !== 'reviewed-simulated') return { ok: false, error: T(`review impossible in state “${STATES[c.state]}”`, `revue impossible à l’état « ${STATES[c.state]} »`) };
  if (role === 'simulated-reviewer') {
    if (decision !== 'annotate') return { ok: false, error: T('a simulated reviewer can only annotate: it can neither approve nor reject', 'un relecteur simulé peut seulement annoter : il ne peut ni approuver ni rejeter') };
    if (reason.trim().length < 10) return { ok: false, error: T('an annotation must give a reason', 'une annotation doit être motivée') };
    const x = structuredClone(c); x.state = 'reviewed-simulated'; x.history.push({ to: 'reviewed-simulated', by: T('SIMULATED reviewer (demonstration)', 'relecteur SIMULÉ (démonstration)'), at, note: reason.slice(0, 500) }); return { ok: true, value: x };
  }
  if (role === 'human-reviewer') {
    if (!REVIEWERS.length) return { ok: false, error: T('no authenticated human reviewer exists: the contribution stays pending', 'aucun relecteur humain authentifié n’existe : la contribution reste en attente') };
  }
  return { ok: false, error: T('unknown review role', 'rôle de revue inconnu') };
}
// The author may correct before review; every correction is kept.
export function correct(c, { claim, actor, at = new Date().toISOString() }) {
  if (actor !== c.author) return { ok: false, error: T('only the author corrects their contribution', 'seul l’auteur corrige sa contribution') };
  if (['approved', 'rejected'].includes(c.state)) return { ok: false, error: T('contribution closed', 'contribution close') };
  const sc = screen(claim, { history: [] }); if (!sc.ok) return { ok: false, error: sc.message };
  const x = structuredClone(c); x.corrections.push({ at, before: x.claim }); x.claim = sc.text; x.state = 'submitted'; x.history.push({ to: 'submitted', by: T('author', 'auteur'), at, note: 'correction' }); x.conflicts = []; return { ok: true, value: x };
}
