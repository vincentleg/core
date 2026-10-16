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
const both = x => (x && typeof x === 'object' ? `${x.en ?? ''} ${x.fr ?? ''}` : x ?? ''), en = x => (x && typeof x === 'object' ? x.en ?? '' : x ?? '');
const B = (e, f) => ({ en: e, fr: f });
export const KINDS = { observation: B('Observation', 'Observation'), hypothesis: B('Hypothesis', 'Hypothèse'), evidence: B('Evidence (with its source)', 'Preuve (avec sa source)'), question: B('Research question', 'Question de recherche'), challenge: B('Challenge', 'Contestation') };
export const STAGES = [['noted', B('Noted', 'Noté')], ['structured', B('Structured by CORE', 'Structuré par CORE')], ['private', B('Kept private (on this device)', 'Gardé en privé (sur cet appareil)')], ['shared', B('Shared with the mission (with your consent)', 'Partagé avec la mission (avec votre consentement)')], ['review', B('In review by the agents', 'En revue par les agents')], ['evaluated', B('Evaluated (form, not substance)', 'Évalué (forme, pas le fond)')], ['human', B('Awaiting human review', 'En attente de revue humaine')]];

// Findings of a mission whose wording shares at least two significant terms with the text (or that are cited by id).
export function related(text, findings) {
  const t = terms(text), ids = new Set((String(text).match(/\b[a-z][\w.-]*\b/gi) || []));
  return findings.filter(f => f.status !== 'gap').map(f => ({ f, n: [...terms(both(f.claim))].filter(w => t.has(w)).length + (ids.has(f.id) ? 3 : 0) })).filter(x => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 4).map(x => x.f.id);
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
  if (kind === 'evidence' && !/https:\/\//.test(body)) missing.push(B('Give the source (an https link to the data or document).', 'Indiquez la source (lien https vers la donnée ou le document).'));
  if (!place && !/\b(street|st|avenue|ave|rue|folsom|howard|mission|soma|\d+(th|st|nd|rd))\b/i.test(body)) missing.push(B('Where did you notice it? A precise place helps the agents.', 'Où l’avez-vous remarqué ? Un lieu précis aide les agents.'));
  if (!/\b(quand|when|depuis|since|today|aujourd|hier|yesterday|matin|soir|morning|evening|\d{4})\b/i.test(body)) missing.push(B('When? A date or a time of day.', 'Quand ? Une date ou un moment de la journée.'));
  if (!mission) missing.push(B('No mission clearly matches: it will be kept as a lead.', 'Aucune mission ne correspond clairement : elle sera gardée comme piste.'));
  const priv = privacyCheck(body);
  return { title, kind, text: body, mission, related: rel, missing, place, privacy: priv.ok ? null : B('Possible personal data detected (e-mail, phone, home address or password). Remove it before sharing.', 'Données personnelles possibles détectées (e-mail, téléphone, adresse personnelle ou mot de passe). Retirez-les avant de partager.') };
}

// Deterministic evaluation of a SHARED contribution against the mission's evidence. Returns the outcome shown to the person.
export function evaluate(input, findings) {
  const text = `${input.title}. ${input.text}`, rel = related(text, findings), checks = [];
  const priv = privacyCheck(text); if (!priv.ok) checks.push({ code: 'privacy', detail: B('possible personal data: the contribution is held back', 'possibles données personnelles : la contribution reste retenue') });
  const hasSource = /https:\/\/\S+/.test(input.text);
  if (input.kind === 'evidence' && !hasSource) checks.push({ code: 'source', detail: B('evidence must give its source (https link)', 'une preuve doit indiquer sa source (lien https)') });
  const ev = findings.filter(f => f.status !== 'gap').map(f => ({ text: both(f.claim), record: f.id }));
  const v = verify(text, ev, { requireCitation: false });
  if (v.issues.some(i => /number|chiffre|nombre/i.test(i.code + i.detail)) && !hasSource) checks.push({ code: 'numbers', detail: B('some numbers appear in no finding: they will need a source', 'des chiffres ne figurent dans aucun constat : ils devront être sourcés') });
  if (v.issues.some(i => /overclaim|status|certitude|statut/i.test(i.code + i.detail))) checks.push({ code: 'overclaim', detail: B('wording too assertive (certainty, cause or legal status): rephrase as a hypothesis', 'formulation trop affirmative (certitude, cause ou statut juridique) : à reformuler en hypothèse') });
  const outcome = checks.some(c => c.code === 'privacy') ? 'held-privacy' : checks.some(c => c.code === 'source') ? 'needs-source'
    : !rel.length ? 'lead' : checks.length ? 'to-reformulate' : 'to-investigate';
  const OUT = { 'held-privacy': B('Held back: possible personal data', 'Retenue : possibles données personnelles'), 'needs-source': B('Source required before review', 'Source requise avant examen'), lead: B('Not linked to current findings: kept as a lead', 'Sans lien avec les constats actuels : gardée comme piste'), 'to-reformulate': B('Linked to findings; to be rephrased before review', 'Liée aux constats ; à reformuler avant examen'), 'to-investigate': B('Linked to findings: added to the leads to examine (not validated)', 'Liée aux constats : ajoutée aux pistes à examiner (non validée)') };
  return { outcome, label: OUT[outcome], related: rel, checks, method: B('automatic form check (deterministic code); no judgement on substance, no validation', 'contrôle automatique de forme (code déterministe) ; aucun jugement sur le fond, aucune validation') };
}

// Stage of a contribution for the tracker.
export function stageOf(h) { return h.evaluation ? (h.evaluation.outcome === 'to-investigate' ? 'human' : 'evaluated') : h.state === 'en revue' ? 'review' : 'shared'; }

// V9 — optional semantic structuring by the local model (only when one runs on this computer and the person asks).
// The person's text is kept as written; the model may only propose a title, a type and a mission from the given list.
// Output is schema-checked; anything invalid falls back to the deterministic structure, and the UI says which was used.
export const STRUCT_SCHEMA = { type: 'object', required: ['title', 'kind', 'mission'], properties: { title: { type: 'string', maxLength: 110 }, kind: { type: 'string', enum: ['observation', 'hypothesis', 'evidence', 'question', 'challenge'] }, mission: { type: 'string' }, missing: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 160 } } } };
export async function structureWithModel(text, { generate, missions, base }) {
  const msg = [{ role: 'system', content: 'You help a member of the public file an observation with a CORE research mission. Answer in English as JSON matching the schema. Do not add facts. Propose a short neutral title, the type of contribution, the most relevant mission id from the list (or "none"), and up to 3 short questions about what is missing (place, time, source).' },
    { role: 'user', content: `Missions:\n${missions.map(m => `- ${m.id}: ${typeof m.title === 'object' ? m.title.en : m.title}`).join('\n')}\n\nText:\n${String(text).slice(0, 1000)}` }];
  const r = await generate(msg, { schema: STRUCT_SCHEMA, numPredict: 300 });
  let o; try { o = JSON.parse(r.text); } catch { return { ...base, structuredBy: 'deterministic', modelIssue: 'not JSON' }; }
  const ids = new Set(missions.map(m => m.id));
  if (typeof o.title !== 'string' || !o.title.trim() || !KINDS[o.kind]) return { ...base, structuredBy: 'deterministic', modelIssue: 'invalid fields' };
  return { ...base, title: o.title.trim().slice(0, 110), kind: o.kind, mission: ids.has(o.mission) ? o.mission : base.mission, missing: [...(o.missing || []).slice(0, 3).map(q => ({ en: q, fr: `${q} (question du modèle, en anglais)` })), ...base.missing.filter(m => base.privacy || /source|https/i.test(m.en))].slice(0, 4), structuredBy: 'local-model', model: r.model };
}
