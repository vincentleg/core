// CORE Dialogue — multi-turn, source-grounded collaboration engine (V6). Deterministic: guided reasoning rules plus
// CORE Knowledge retrieval. It is NOT a general-purpose language model and says so. Provider-independent: a future model
// adapter would plug in as `rephrase`, behind the same safety screen and the Knowledge validator.
// Every agent turn is typed: 'evidence' (cited, from Knowledge), 'reasoning' (the agent's guided questions/challenges,
// no new facts), or 'system' (refusals, consent, tool boundaries).
import { screen } from '../world/safety.mjs';
import { ask } from '../kb/knowledge.mjs';
import { T, lang } from '../i18n/i18n.mjs';
import { isCrisis, crisisMessage } from '../intelligence/core/safety.mjs';
import { ptext } from '../earth/problem-view.mjs';

export const ENGINE = { id: 'core-dialogue', version: '7.0.0', get kind() { return T('rule-guided reasoning + CORE Knowledge retrieval (no language model)', 'raisonnement guidé par règles + recherche CORE Knowledge (aucun modèle de langage)'); } };
const PH = [
  ['situation', ['Your situation', 'Votre situation'], ['Tell me what you noticed or what brings you here, without personal data.', 'Racontez ce que vous avez constaté ou ce qui vous amène, sans données personnelles.']],
  ['problem', ['The problem', 'Le problème'], ['In one or two sentences: what is the problem, where, and for whom?', 'En une ou deux phrases : quel est le problème, où, et pour qui ?']],
  ['proposal', ['Your idea', 'Votre idée'], ['What improvement do you propose?', 'Quelle amélioration proposez-vous ?']],
  ['mechanism', ['The mechanism', 'Le mécanisme'], ['Why would this idea reduce the problem? Explain the assumed cause-and-effect link.', 'Pourquoi cette idée réduirait-elle le problème ? Expliquez le lien de cause à effet supposé.']],
  ['assumptions', ['Assumptions', 'Hypothèses'], ['What does your idea rely on without evidence today? List your assumptions.', 'Sur quoi votre idée repose-t-elle sans preuve aujourd’hui ? Listez vos hypothèses.']],
  ['constraints', ['Constraints', 'Contraintes'], ['Which constraints: cost, time, permits, available space, underground networks?', 'Quelles contraintes : coût, délai, autorisations, espace disponible, réseaux souterrains ?']],
  ['alternatives', ['Alternatives', 'Alternatives'], ['What other approaches, including doing nothing? Why yours rather than them?', 'Quelles autres approches, y compris ne rien faire ? Pourquoi la vôtre plutôt qu’elles ?']],
  ['risks', ['Risks', 'Risques'], ['Who could be disadvantaged? Which side effects should be watched?', 'Qui pourrait être pénalisé ? Quels effets indésirables faudrait-il surveiller ?']],
  ['tests', ['Test', 'Tester'], ['How would we know it works? Which measurement, before/after, over what period?', 'Comment saurait-on que cela marche ? Quelle mesure, avant/après, sur quelle durée ?']],
  ['pathway', ['Next', 'Suite'], ['Do you want to carry this as a citizen initiative, a research project, a nonprofit or a company?', 'Voulez-vous porter cela comme initiative citoyenne, projet de recherche, association ou entreprise ?']],
];
// Read in the current language at access time ([id, label, prompt]); ids never change.
export const PHASES = new Proxy(PH, { get: (o, k) => (typeof k === 'string' && /^\d+$/.test(k) && o[k] ? [o[k][0], T(...o[k][1]), T(...o[k][2])] : o[k]) });
const PHASE_IDS = PHASES.map(p => p[0]);
const FIELD = { situation: 'situation', problem: 'problem', proposal: 'proposal', mechanism: 'mechanism', assumptions: 'assumptions', constraints: 'constraints', alternatives: 'alternatives', risks: 'risks', tests: 'tests', pathway: 'pathway' };
const LIST_FIELDS = new Set(['assumptions', 'constraints', 'alternatives', 'risks', 'tests']);
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019`\u00b4]/g, "'");

// Tools the agent may use, and under which conditions. Anything else is refused.
const TL = (en, fr) => ({ get label() { return T(en, fr); } });
export const TOOLS = {
  'knowledge.ask': { ...TL('Consult CORE Knowledge (public registries)', 'Consulter CORE Knowledge (registres publics)'), requires: [] },
  'vault.save': { ...TL('Save to your encrypted vault', 'Enregistrer dans votre coffre chiffré'), requires: ['consent.vault', 'vault.unlocked'] },
  'labs.review': { ...TL('CORE Labs analysis of an idea', 'Analyse CORE Labs d’une idée'), requires: ['idea.labsPermission'] },
  'expert.request': { ...TL('Prepare a review request (fictional)', 'Préparer une demande de revue (fictive)'), requires: ['user.confirmed'] },
};
export function toolAllowed(name, ctx = {}) {
  const t = TOOLS[name];
  if (!t) return { ok: false, reason: T(`tool not allowed: ${name}`, `outil non autorisé : ${name}`) };
  const missing = t.requires.filter(r => !ctx[r]);
  return missing.length ? { ok: false, reason: T(`missing conditions: ${missing.join(', ')}`, `conditions manquantes : ${missing.join(', ')}`) } : { ok: true };
}

export function newSession({ id, problem = null, at = new Date().toISOString() }) {
  const s = { id, engine: ENGINE, problemId: problem?.id ?? null, startedAt: at, phase: 'situation', turns: [], consent: { persist: false, vault: false },
    draft: { situation: '', problem: problem ? `${ptext(problem.title)} · ${problem.place}` : '', proposal: '', mechanism: '', assumptions: [], constraints: [], alternatives: [], risks: [], tests: [], pathway: '' }, evidence: [] };
  const intro = problem ? T(`I am a CORE collaboration agent. We are working on a recorded problem: “${ptext(problem.title)}” (${problem.place}). I will help you clarify and test your idea; I validate nothing and I cite my sources.`, `Je suis un agent CORE de collaboration. Nous travaillons sur un problème enregistré : « ${problem.title} » (${problem.place}). Je vous aiderai à clarifier et à éprouver votre idée ; je ne valide rien et je cite mes sources.`)
    : T('I am a CORE collaboration agent. I will help you clarify and test your idea; I validate nothing and I cite my sources.', 'Je suis un agent CORE de collaboration. Je vous aiderai à clarifier et à éprouver votre idée ; je ne valide rien et je cite mes sources.');
  s.turns.push({ role: 'agent', kind: 'reasoning', text: `${intro}\n${problem ? PHASES[2][2] : PHASES[0][2]}`, at });
  if (problem) s.phase = 'proposal';
  return s;
}

const QUESTION = /\?\s*$|^(que sait|qu'est-ce|quel|quelle|quels|quelles|combien|pourquoi|comment|ou |est-ce|what|why|how|which)\b/;
const CERTAIN = /\b(c'est (sur|certain|evident|prouve)|forcement|toujours|jamais|garanti|100 ?%|sans aucun doute|tout le monde sait|obviously|guaranteed|certainly|definitely|always|never|of course|everyone knows|it is (sure|certain|proven))\b/;
const MECH = /\b(parce que|car|afin de|pour que|donc|ce qui|grace a|because|so that|since|therefore|which means|thanks to|in order to)\b/;
const COST = /\b(cout|budget|euros?|dollars?|\$|€|prix|financ|cost|price|fund)/;
const TIME = /\b(mois|semaines?|jours?|ans?|annee|delai|duree|months?|weeks?|days?|years?|duration|period)\b/;
const PERMIT = /\b(permis|autoris|ville|mairie|sfmta|reglement|dpw|public works|permit|authori[sz]|city|council|regulation)/;
const MEASURE = /\b(mesur|compter|comptage|indicateur|avant|apres|comparer|largeur|temps|debit|enquete|measur|count|indicator|before|after|compare|width|time|flow|survey)/;
const PATHS = [['civic', /\b(citoyen|ville|mairie|quartier|petition|civique|municipal|citizen|city|neighbo|civic)/, ['Citizen initiative', 'Initiative citoyenne'], ['Entry point: city services and neighbourhood associations. You need up-to-date evidence (a new measurement) and a clear public file. No authorisation is obtained through CORE.', 'Point d’entrée : les services de la ville et les associations de quartier. Il faut une preuve à jour (nouvelle mesure) et un dossier public clair. Aucune autorisation n’est obtenue via CORE.']],
  ['research', /\b(recherche|universit|etude|publication|thes|labo|research|study|lab)/, ['Research project', 'Projet de recherche'], ['Entry point: a preregistered protocol, a measurement method, an independent reviewer. CORE Labs helps structure the file; it does not replace peer review.', 'Point d’entrée : un protocole préenregistré, une méthode de mesure, un relecteur indépendant. CORE Labs aide à structurer le dossier ; il ne remplace pas une revue par les pairs.']],
  ['nonprofit', /\b(association|benevol|ong|nonprofit|collectif|volunteer|ngo|collective)/, ['Nonprofit', 'Association'], ['Entry point: a mission, governance, volunteers and funding; evidence of impact is measured, not declared.', 'Point d’entrée : une mission, une gouvernance, des bénévoles et un financement ; la preuve d’impact se mesure, elle ne se déclare pas.']],
  ['startup', /\b(entreprise|startup|start-up|produit|vendre|client|marche|company|product|sell|customer|market)/, ['Company', 'Entreprise'], ['Entry point: a customer who pays for a real problem, a cost model, regulation. First check that the problem still exists (2014 measurement).', 'Point d’entrée : un client qui paie pour un problème réel, un modèle de coûts, une réglementation. Vérifiez d’abord que le problème existe encore (mesure de 2014).']]];

function challenges(phase, text, session, problem) {
  const t = norm(text), out = [];
  if (CERTAIN.test(t)) out.push(T('You state this with certainty. On what evidence? CORE records do not support asserting more than what they measure.', 'Vous l’affirmez avec certitude. Sur quelle preuve ? Les enregistrements CORE ne permettent pas d’affirmer davantage que ce qu’ils mesurent.'));
  if (phase === 'proposal' && !MECH.test(t)) out.push(T('Your idea does not yet say how it acts on the problem: that is the next question.', 'Votre idée ne dit pas encore comment elle agit sur le problème : c’est la prochaine question.'));
  if (phase === 'mechanism' && !MECH.test(t)) out.push(T('I see no explicit cause-and-effect link (“because”, “so that”…). Without a mechanism, we will not know what to measure.', 'Je ne vois pas de lien de cause à effet explicite (« parce que », « afin de »…). Sans mécanisme, on ne saura pas quoi mesurer.'));
  if (phase === 'constraints' && !COST.test(t)) out.push(T('No cost is mentioned: even an order of magnitude helps compare the options.', 'Aucun coût n’est mentionné : même un ordre de grandeur aide à comparer les options.'));
  if (phase === 'constraints' && !PERMIT.test(t)) out.push(T('Permits matter: who must approve a change to public space?', 'Les autorisations comptent : qui doit approuver une modification de l’espace public ?'));
  if (phase === 'alternatives' && !/\b(rien|statu quo|ne rien faire|nothing|status quo|do nothing)\b/.test(t)) out.push(T('Also compare with “doing nothing”: it is the baseline of any evaluation.', 'Comparez aussi avec « ne rien faire » : c’est la référence de toute évaluation.'));
  if (phase === 'tests' && !MEASURE.test(t)) out.push(T('I see no measurement. Which quantity would you count, and compared with what?', 'Je ne vois pas de mesure. Quelle grandeur compteriez-vous, et comparée à quoi ?'));
  if (phase === 'tests' && !TIME.test(t)) out.push(T('Over what period would you measure? A one-off measurement can mislead.', 'Sur quelle durée mesureriez-vous ? Une mesure ponctuelle peut tromper.'));
  if (problem && /trottoir|sidewalk/.test(norm(problem.title)) && /\b(elargi|plus large|widen|wider)/.test(t)) {
    const m = problem.metrics; if (m?.width_ft && m?.min_ft) out.push(T(`Recorded reference: ${m.width_ft} ft measured in 2014 against a minimum of ${m.min_ft} ft. The measurement is more than ten years old: your idea should start by checking the current width.`, `Repère enregistré : ${m.width_ft} ft mesurés en 2014 pour un minimum de ${m.min_ft} ft. La mesure a plus de dix ans : votre idée devrait commencer par vérifier la largeur actuelle.`));
  }
  return out;
}

function nextPhase(session) {
  const i = PHASE_IDS.indexOf(session.phase);
  for (let k = i + 1; k < PHASE_IDS.length; k++) { const f = FIELD[PHASE_IDS[k]], v = session.draft[f]; if (!v || (Array.isArray(v) && !v.length)) return PHASE_IDS[k]; }
  return 'review';
}
export function missing(session) {
  return PHASES.filter(([id]) => { const v = session.draft[FIELD[id]]; return !v || (Array.isArray(v) && !v.length); }).map(([id, label]) => ({ id, label }));
}

// One user turn → updated session (pure; returns a new object). `ix` is a CORE Knowledge index, `problem` the record.
// `answerer` (optional): an async (question) => result in the shape of the V7 orchestrator (src/intelligence/), used for
// factual questions instead of Knowledge directly; it must return Knowledge claims and may add a verified model wording.
export async function turn(session, input, { ix, problem = null, at = new Date().toISOString(), history = [], answerer = null } = {}) {
  const s = structuredClone(session);
  const sc = screen(input, { history });
  // Keep sensitive crisis wording out of the session, saved vault and exports.
  if (isCrisis(input)) { s.turns.push({ role: 'agent', kind: 'system', text: crisisMessage(lang()), at }); return s; }
  if (!sc.ok) { s.turns.push({ role: 'agent', kind: 'system', text: sc.message, at }); return s; }
  s.turns.push({ role: 'user', kind: 'message', text: sc.text, at });
  for (const n of sc.notes) s.turns.push({ role: 'agent', kind: 'system', text: n, at });
  const t = norm(sc.text);
  // Factual questions go to Knowledge (the only source of facts); the agent never answers them from its own rules.
  if (QUESTION.test(t) && ix) {
    // Only deictic questions (« ce trottoir », « ici ») are about the current problem; anything else is asked as written.
    const q = problem && /\b(ce|cet|cette|ces|ici|this|here)\b/.test(t) && !/folsom|howard/.test(t) ? `${sc.text} ${problem.place}` : sc.text;
    const a = answerer ? await answerer(q) : await ask(q, ix, { history: [] });
    if (a.kind === 'refusal') s.turns.push({ role: 'agent', kind: 'system', text: T(`CORE Knowledge refuses: ${a.refusal.reason}`, `CORE Knowledge refuse : ${a.refusal.reason}`), at, refusal: a.refusal.code });
    else {
      const gen = a.provider ? { provider: a.provider, ...(a.model ? { model: a.model } : {}), ...(a.verified ? { verified: true } : {}), ...(a.rejected ? { rejected: { issues: a.rejected.issues, model: a.rejected.model } } : {}), ...(a.fallback ? { fallback: a.fallback } : {}) } : {};
      s.turns.push({ role: 'agent', kind: 'evidence', text: a.text ?? a.claims.map(c => c.text).join('\n'), claims: a.claims.map(c => c.text), citations: a.claims.flatMap(c => c.citations), statuses: a.claims.map(c => c.status), uncertainty: a.uncertainty, at, ...gen, ...(a.refusal ? { refusal: a.refusal.code, caveat: a.refusal.reason } : {}) });
      for (const c of a.claims.flatMap(c => c.citations)) if (!s.evidence.some(e => e.record === c.record)) s.evidence.push({ record: c.record, source: c.source, url: c.url ?? null, integrity: c.integrity });
    }
    s.turns.push({ role: 'agent', kind: 'reasoning', text: `${T('Back to your idea.', 'Revenons à votre idée.')} ${PHASES.find(p => p[0] === s.phase)?.[2] || T('Do you want to save this work?', 'Voulez-vous enregistrer ce travail ?')}`, at });
    return s;
  }
  // Content for the current phase.
  const phase = s.phase === 'review' ? 'proposal' : s.phase, f = FIELD[phase];
  if (LIST_FIELDS.has(f)) s.draft[f] = [...s.draft[f], ...sc.text.split(/\s*(?:;|\n|•| - )\s*/).map(x => x.trim()).filter(x => x.length > 2)].slice(0, 12);
  else s.draft[f] = s.draft[f] && phase === 'situation' ? `${s.draft[f]} ${sc.text}` : sc.text;
  if (phase === 'pathway') { const p = PATHS.find(([, re]) => re.test(t)); s.draft.pathway = p ? T(...p[2]) : sc.text; if (p) s.turns.push({ role: 'agent', kind: 'reasoning', text: `${T(...p[2])} · ${T(...p[3])}`, at }); }
  const ch = challenges(phase, sc.text, s, problem);
  const label = PHASES.find(p => p[0] === phase)[1];
  s.phase = nextPhase({ ...s, phase });
  const next = s.phase === 'review' ? T('Every section has a first draft. You can save the idea to your vault, request a CORE Labs analysis, or go back to a section.', 'Toutes les rubriques ont un premier contenu. Vous pouvez enregistrer l’idée dans votre coffre, demander une analyse CORE Labs, ou revenir sur une rubrique.') : PHASES.find(p => p[0] === s.phase)[2];
  s.turns.push({ role: 'agent', kind: ch.length ? 'challenge' : 'reasoning', text: `${T(`Noted in “${label}”.`, `Noté dans « ${label} ».`)}${ch.length ? '\n' + ch.map(c => `• ${c}`).join('\n') : ''}\n${next}`, at });
  return s;
}

export function goTo(session, phase) {
  if (!PHASE_IDS.includes(phase)) throw Error(T('unknown section', 'rubrique inconnue'));
  const s = structuredClone(session); s.phase = phase;
  s.turns.push({ role: 'agent', kind: 'reasoning', text: PHASES.find(p => p[0] === phase)[2], at: new Date().toISOString() }); return s;
}

// The draft as an Idea Vault version (problem + solution + evidence), for vault.addVersion.
export function toIdea(session, { title } = {}) {
  const d = session.draft, L = (h, a) => a.length ? `\n${h} :\n${a.map(x => `- ${x}`).join('\n')}` : '';
  return {
    title: String(title || d.proposal || d.problem || T('Idea', 'Idée')).slice(0, 120),
    problem: [d.problem, d.situation && `${T('Observation', 'Constat')} : ${d.situation}`].filter(Boolean).join('\n') || T('(to be specified)', '(à préciser)'),
    solution: [d.proposal, d.mechanism && `${T('Assumed mechanism', 'Mécanisme supposé')} : ${d.mechanism}`].filter(Boolean).join('\n') + L(T('Assumptions', 'Hypothèses'), d.assumptions) + L(T('Constraints', 'Contraintes'), d.constraints) + L('Alternatives', d.alternatives) + L(T('Risks', 'Risques'), d.risks) + L('Tests', d.tests) + (d.pathway ? `\n${T('Intended next step', 'Suite envisagée')} : ${d.pathway}` : ''),
    evidence: session.evidence.map(e => `${e.record}${e.url ? ` ${e.url}` : ''}`).join('\n'),
    problemId: session.problemId,
  };
}

export function exportMarkdown(session) {
  const kind = { evidence: T('Evidence (CORE Knowledge, cited)', 'Preuve (CORE Knowledge, citée)'), reasoning: T('Guided reasoning (agent)', 'Raisonnement guidé (agent)'), challenge: T('Objection (agent)', 'Objection (agent)'), system: T('System', 'Système'), message: T('You', 'Vous') };
  return [`# ${T('CORE Dialogue session', 'Session CORE Dialogue')} ${session.id}`, '', T(`Engine: ${ENGINE.id} ${ENGINE.version} · ${ENGINE.kind}. This document is not a scientific validation.`, `Moteur : ${ENGINE.id} ${ENGINE.version} · ${ENGINE.kind}. Ce document n’est pas une validation scientifique.`), T(`Problem: ${session.problemId || '—'} · started: ${session.startedAt}`, `Problème : ${session.problemId || '—'} · début : ${session.startedAt}`), '',
    ...session.turns.map(t => `**${kind[t.kind] || t.kind}** · ${t.text}${t.citations?.length ? `\n  Sources : ${[...new Set(t.citations.map(c => c.record))].join(', ')}` : ''}`), '', `## ${T('Draft', 'Brouillon')}`,
    ...Object.entries(session.draft).map(([k, v]) => `- ${k} : ${Array.isArray(v) ? v.join(' ; ') : v || '—'}`)].join('\n');
}
