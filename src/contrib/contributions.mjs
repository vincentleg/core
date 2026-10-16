// CORE V8 — human participation. "I noticed something" → an idea → CORE structures it → the person chooses to keep it
// private or share it → agents evaluate it → the person follows its progress.
// Everything here is deterministic code: structuring is a reformatting of the person's own words plus links to the
// mission's existing findings; evaluation checks FORM (sources, unsupported numbers, overclaims, personal data,
// relation to the evidence), never truth. Nothing is accepted automatically and no human reviewer exists yet.
import { verify, privacyCheck } from '../intelligence/verifier.mjs';

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const STOP = new Set('about after avant avec cette comme dans depuis entre leurs notre nous parce pendant plus pour quand sans sont their there these this those which while would could should being where avoir faire peut tres aussi encore autre autres moins mieux juste street streets'.split(' '));
const STOP3 = new Set('les des une the and sur par est pas qui que aux ces son ses leur dans avec pour from with that this are was has have not but all can its our you they them mais plus tout entre matin soir cause peut etre ont sont aussi tres bien fait faire dit elle ils nous vous comme quand dont cet cette fois jour jours year years more than into over only some such also very been were what when your their'.split(' '));
const terms = s => new Set(norm(s).match(/[a-z0-9]{3,}/g)?.filter(w => !STOP.has(w) && !STOP3.has(w)) || []);
export const KINDS = { observation: 'Observation', hypothesis: 'Hypothèse', evidence: 'Preuve (avec sa source)', question: 'Question de recherche', challenge: 'Contestation' };
export const STAGES = [['noted', 'Noté'], ['structured', 'Structuré par CORE'], ['private', 'Gardé en privé (coffre chiffré)'], ['shared', 'Partagé (avec votre consentement)'], ['review', 'En revue par les agents'], ['evaluated', 'Évalué (forme, pas le fond)'], ['human', 'En attente de revue humaine']];

// Findings of a mission whose wording shares at least two significant terms with the text (or that are cited by id).
export function related(text, findings) {
  const t = terms(text), ids = new Set((String(text).match(/\b[a-z][\w.-]*\b/gi) || []));
  return findings.filter(f => f.status !== 'gap').map(f => ({ f, n: [...terms(f.claim)].filter(w => t.has(w)).length + (ids.has(f.id) ? 3 : 0) })).filter(x => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 4).map(x => x.f.id);
}
// Guess of the contribution type from the person's wording (they can change it).
export function guessKind(text) {
  const t = norm(text);
  if (/https?:\/\//.test(text) || /\b(source|donnees|data|dataset|rapport|report)\b/.test(t)) return 'evidence';
  if (/\?\s*$|^(pourquoi|comment|est-ce|why|how|what|does|is there)\b/.test(t.trim())) return 'question';
  if (/\b(peut-etre|pourrait|hypothese|maybe|might|could|perhaps|i think|je pense)\b/.test(t)) return 'hypothesis';
  if (/\b(faux|errone|pas d accord|disagree|wrong|incorrect|conteste)\b/.test(t)) return 'challenge';
  return 'observation';
}
// Structure free text: title, type, mission, related findings, and what is still missing. The text itself is kept as written.
export function structure(text, { missions = [], findingsOf = () => [], suggest = () => null, place = null } = {}) {
  const body = String(text || '').trim().slice(0, 1000); if (!body) return null;
  const first = body.split(/(?<=[.!?;])\s|\n/)[0].trim().replace(/[;,]$/, ''), title = (first.length > 110 ? first.slice(0, 107).trimEnd() + '…' : first);
  const kind = guessKind(body), mission = suggest(body) || null, rel = mission ? related(body, findingsOf(mission)) : [];
  const missing = [];
  if (kind === 'evidence' && !/https:\/\//.test(body)) missing.push('Indiquez la source (lien https vers la donnée ou le document).');
  if (!place && !/\b(street|st|avenue|ave|rue|folsom|howard|mission|soma|\d+(th|st|nd|rd))\b/i.test(body)) missing.push('Où l’avez-vous remarqué ? Un lieu précis aide les agents.');
  if (!/\b(quand|when|depuis|since|today|aujourd|hier|yesterday|matin|soir|morning|evening|\d{4})\b/i.test(body)) missing.push('Quand ? Une date ou un moment de la journée.');
  if (!mission) missing.push('Aucune mission ne correspond clairement : elle sera gardée comme piste.');
  const priv = privacyCheck(body);
  return { title, kind, text: body, mission, related: rel, missing, place, privacy: priv.ok ? null : priv.reason };
}

// Deterministic evaluation of a SHARED contribution against the mission's evidence. Returns the outcome shown to the person.
export function evaluate(input, findings) {
  const text = `${input.title}. ${input.text}`, rel = related(text, findings), checks = [];
  const priv = privacyCheck(text); if (!priv.ok) checks.push({ code: 'privacy', detail: 'possibles données personnelles : la contribution reste retenue' });
  const hasSource = /https:\/\/\S+/.test(input.text);
  if (input.kind === 'evidence' && !hasSource) checks.push({ code: 'source', detail: 'une preuve doit indiquer sa source (lien https)' });
  const ev = findings.filter(f => f.status !== 'gap').map(f => ({ text: f.claim, record: f.id }));
  const v = verify(text, ev, { requireCitation: false });
  if (v.issues.some(i => /number|chiffre|nombre/i.test(i.code + i.detail)) && !hasSource) checks.push({ code: 'numbers', detail: 'des chiffres ne figurent dans aucun constat : ils devront être sourcés' });
  if (v.issues.some(i => /overclaim|status|certitude|statut/i.test(i.code + i.detail))) checks.push({ code: 'overclaim', detail: 'formulation trop affirmative (certitude, cause ou statut juridique) : à reformuler en hypothèse' });
  const outcome = checks.some(c => c.code === 'privacy') ? 'held-privacy' : checks.some(c => c.code === 'source') ? 'needs-source'
    : !rel.length ? 'lead' : checks.length ? 'to-reformulate' : 'to-investigate';
  const OUT = { 'held-privacy': 'Retenue : possibles données personnelles', 'needs-source': 'Source requise avant examen', lead: 'Sans lien avec les constats actuels : gardée comme piste', 'to-reformulate': 'Liée aux constats ; à reformuler avant examen', 'to-investigate': 'Liée aux constats : ajoutée aux pistes à examiner (non validée)' };
  return { outcome, label: OUT[outcome], related: rel, checks, method: 'contrôle automatique de forme (code déterministe) ; aucun jugement sur le fond, aucune validation' };
}

// Stage of a contribution for the tracker.
export function stageOf(h) { return h.evaluation ? (h.evaluation.outcome === 'to-investigate' ? 'human' : 'evaluated') : h.state === 'en revue' ? 'review' : 'shared'; }
