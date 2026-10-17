// CORE Knowledge V5.1 — cited answers from CORE's own verified public records (local, deterministic, no model).
// Every answer is built only from allowlisted public files, cites record ids, file fingerprints and dataset integrity,
// states scientific status and uncertainty, and is re-validated before it is returned (fail closed). It refuses
// private data, out-of-scope advice, unsupported claims and questions that no record answers.
import { screen } from '../world/safety.mjs';
import { T } from '../i18n/i18n.mjs';
import { ptext } from '../earth/problem-view.mjs';

export const METHOD = { id: 'core-knowledge', version: '5.1.0', kind: 'deterministic retrieval over allowlisted public records (no language model)' };
// The ONLY files this module may read. Private stores (.core-local, browser storage, vault) are never reachable.
export const SOURCES = { anchors: 'data/integrity/anchors.json', problems: 'data/problems/registry.json', agents: 'data/agents/registry.json', manifest: 'data/sf/manifest.json', sidewalks: 'data/sf/sidewalks.geojson', permits: 'data/sf/permits.geojson' };
// Independent anchoring: data/integrity/anchors.json is written offline by scripts/anchor-data.mjs and committed; its own
// SHA-256 is pinned here, in reviewed code. Tampering with a registry therefore requires changing the data, the anchors file
// and this constant together. A hash computed at load is only ever compared to these references, never trusted alone.
export const ANCHORS_SHA256 = 'a8d9c30037cdc5ac651d9532ed7e3d7df12cdccafe3bc8a4dcd87d03aa2ac9c5';
const ALLOWED = new Set(Object.values(SOURCES));
export function assertAllowed(p) {
  if (typeof p !== 'string' || !ALLOWED.has(p)) throw Error(T(`source not allowed: ${String(p).slice(0, 80)}`, `source non autorisée : ${String(p).slice(0, 80)}`));
  return p;
}
const STATUS_BI = {
  observed: ['OBSERVED — read directly from a public registry', 'OBSERVÉ — lu directement dans un registre public'], 'potential-risk': ['POTENTIAL RISK — pattern detected by a rule, not confirmed', 'RISQUE POTENTIEL — motif détecté par une règle, non confirmé'],
  hypothesis: ['HYPOTHESIS — open question without evidence', 'HYPOTHÈSE — question ouverte sans preuve'], simulated: ['SIMULATED — output of an uncalibrated model', 'SIMULÉ — sortie d’un modèle non calibré'],
  'dataset-record': ['RECORD — row of a public dataset', 'ENREGISTREMENT — ligne d’un jeu de données public'], count: ['COUNT — computed on the registry', 'COMPTE — calculé sur le registre'], 'agent-record': ['PROFILE — agent registry', 'PROFIL — registre des agents'],
};
// Read in the current language at access time; keys stay the scientific statuses.
export const STATUS = new Proxy(STATUS_BI, { get: (o, k) => (o[k] ? T(...o[k]) : undefined) });
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const sha256 = async s => hex(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const toks = s => norm(s).replace(/(\d+)(st|nd|rd|th|e|eme)\b/g, '$1').match(/[a-z]{4,}|\d+/g) || [];

// load(path) → file text. Files are hashed as loaded; SF datasets are checked against the manifest's SHA-256.
export async function buildIndex(load) {
  const files = {};
  for (const [k, p] of Object.entries(SOURCES)) { const text = await load(assertAllowed(p)); files[k] = { path: p, sha256: await sha256(text), json: JSON.parse(text) }; }
  // Chain: pinned constant → anchors file → registries and SF manifest → SF dataset files.
  const anchorsTrusted = files.anchors.sha256 === ANCHORS_SHA256;
  files.anchors.integrity = anchorsTrusted ? 'verified' : 'MISMATCH';
  for (const k of ['problems', 'agents', 'manifest']) files[k].integrity = anchorsTrusted && files.anchors.json.files.some(f => f.path === SOURCES[k] && f.sha256 === files[k].sha256) ? 'verified' : 'MISMATCH';
  const man = files.manifest.json;
  for (const k of ['sidewalks', 'permits']) {
    const d = man.datasets.find(x => x.file === SOURCES[k].split('/').pop());
    files[k].integrity = files.manifest.integrity === 'verified' && d && d.sha256 === files[k].sha256 ? 'verified' : 'MISMATCH';
    files[k].meta = d ? { id: d.id, title: d.title, provider: d.provider, page: d.page, retrieved_at: d.retrieved_at, license: d.license?.name } : null;
  }
  const records = new Map();
  for (const f of files.sidewalks.json.features) records.set(`sidewalks:${f.properties.record_id}`, f.properties);
  for (const f of files.permits.json.features) records.set(`permits:${f.properties.record_id}`, f.properties);
  return { files, problems: files.problems.json.problems, agents: files.agents.json.agents, records, builtAt: new Date().toISOString() };
}

const cite = (ix, key, record, url) => ({ source: ix.files[key].path, record, ...(url ? { url } : {}), fileSha256: ix.files[key].sha256, integrity: ix.files[key].integrity });
const refusal = (question, code, reason, extra = {}) => ({ kind: 'refusal', question, method: METHOD, refusal: { code, reason }, claims: [], uncertainty: [], ...extra });

const PRIVATE = /\b(coffre|vault|idee[s]? priv|private idea|e-?mail address|phone number|personal data|private (conversation|memory)|mot de passe|password|phrase secrete|passphrase|cookie|session|core-local|sqlite|localstorage|profil de|adresse e?-?mail|telephone de|conversation[s]? priv|memoire priv|donnees personnelles)/;
const ADVICE = /\b(medic|sante|maladie|diagnost|traitement|avocat|juridique|proces|investir|bourse|impot|health|disease|treatment|lawyer|legal|lawsuit|invest|stock market|tax)/;
const CLAIM = /\b(cause[nt]?|caus(es|ed|ing)|dangerous|deadly|effective|resolved|fixed|repaired|approved|authori[sz]ed|guaranteed|compliant|provoque|prouve|demontre|dangereu|mortel|accident|efficace|resolu|repare|valide|approuve|autorise|garanti|certain|safe|sans danger|securise|conforme)/;
const COUNT = /\b(combien|nombre|how many|total)\b/;
const AGENT = /\b(agents?|qui s'occupe|qui analyse|responsable|who (handles|analy[sz]es|works on)|responsible)\b/;
const EVIDENCE = /\b(preuve|source|donnee|mesure|releve|evidence|comment le sait|proof|data|measure|survey|how do we know)/;
const DOMAIN = { accessibility: /trottoir|sidewalk|accessib|largeur|pieton|width|pedestrian/, infrastructure: /travaux|chantier|permis|moratoire|fermeture|chaussee|excavation|works|construction|permit|closure|roadway/, nature: /arbre|plantation|vegetal|tree/ };
const STREETS = ['folsom', 'howard'];

function match(ix, q) {
  const t = toks(q), street = STREETS.filter(s => t.includes(s)), nums = t.filter(x => /^\d+$/.test(x)).map(x => x.replace(/^0+(?=\d)/, ''));
  const dom = Object.entries(DOMAIN).filter(([, re]) => re.test(q)).map(([d]) => d);
  const direct = ix.problems.filter(p => norm(q).includes(norm(p.id)));
  if (direct.length) return direct;
  if (!street.length && !dom.length) return [];
  return ix.problems.filter(p => {
    const hay = norm(`${p.place} ${p.title} ${p.segment ?? ''}`).replace(/(\d+)(st|nd|rd|th)\b/g, '$1').replace(/\b0+(\d)/g, '$1');
    return (!street.length || street.some(s => hay.includes(s))) && (!dom.length || dom.includes(p.domain)) && (!nums.length || nums.every(n => new RegExp(`\\b${n}\\b`).test(hay)));
  });
}
const uncertaintyOf = (ix, p) => [p.caveat && ptext(p.caveat), p.confidence && T(`Confidence: ${p.confidence}.`, `Confiance : ${p.confidence}.`), T(`Snapshot of ${String(p.asOf).slice(0, 10)}.`, `Instantané du ${String(p.asOf).slice(0, 10)}.`)].filter(Boolean);
function problemClaim(ix, p) {
  return { text: `${ptext(p.title)} — ${p.place}. ${ptext(p.statement)}`, status: p.status, citations: [cite(ix, 'problems', p.id), ...p.evidence.slice(0, 3).map(e => cite(ix, e.ref.split(':')[0] === 'sidewalks' ? 'sidewalks' : 'permits', e.ref, e.url))] };
}

export async function ask(question, ix, { history = [] } = {}) {
  const s = screen(question, { history });
  if (!s.ok) return refusal(String(question ?? '').slice(0, 200), `input-${s.refusal}`, s.message);
  // Markup is never meaningful in a question: strip it before matching (the UI escapes everything it displays).
  const text = s.text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(), q = norm(text), notes = [...s.notes];
  let out;
  if (PRIVATE.test(q)) out = refusal(s.text, 'private-data', T('CORE Knowledge only reads public registries. Private ideas, profiles, conversations, passwords and local data are not accessible to it.', 'CORE Knowledge ne lit que des registres publics. Les idées privées, profils, conversations, mots de passe et données locales ne lui sont pas accessibles.'));
  else if (ADVICE.test(q)) out = refusal(s.text, 'out-of-scope', T('Out of scope: CORE Knowledge gives no medical, legal or financial advice. Consult a professional.', 'Hors du périmètre : CORE Knowledge ne donne ni avis médical, ni juridique, ni financier. Consultez un professionnel.'));
  else {
    const found = match(ix, text);
    if (COUNT.test(q) && !found.length) {
      const by = Object.fromEntries(['observed', 'potential-risk', 'hypothesis', 'simulated'].map(k => [k, ix.problems.filter(p => p.status === k).length]));
      out = { kind: 'answer', question: s.text, method: METHOD, claims: [{ text: T(`The registry holds ${ix.problems.length} problems: ${by.observed} observed, ${by['potential-risk']} potential risks, ${by.hypothesis} hypotheses, ${by.simulated} simulated.`, `Le registre contient ${ix.problems.length} problèmes : ${by.observed} observés, ${by['potential-risk']} risques potentiels, ${by.hypothesis} hypothèses, ${by.simulated} simulés.`), status: 'count', citations: [cite(ix, 'problems', '*')] }],
        uncertainty: [T('A recorded problem is not a problem confirmed on the ground; an activity count is not an impact.', 'Un problème enregistré n’est pas un problème confirmé sur le terrain ; un compte d’activité n’est pas un impact.')] };
    } else if (!found.length) out = refusal(s.text, 'no-record', T('No CORE record matches this question. CORE does not answer without evidence. The registry covers the Folsom / Howard corridor in San Francisco.', 'Aucun enregistrement CORE ne correspond à cette question. CORE ne répond pas sans preuve. Le registre couvre le corridor Folsom / Howard à San Francisco.'));
    else if (CLAIM.test(q)) {
      const p = found[0];
      out = { kind: 'answer', question: s.text, method: METHOD, claims: [problemClaim(ix, p)],
        refusal: { code: 'unsupported-claim', reason: T(`No record supports asserting a cause, a danger, an effectiveness, a resolution or an approval. What is recorded has the status “${STATUS[p.status]}”; human decision: ${ptext(p.humanDecision) || 'none'}.`, `Aucun enregistrement ne permet d’affirmer une cause, un danger, une efficacité, une résolution ou une approbation. Ce qui est enregistré a le statut « ${STATUS[p.status]} » ; décision humaine : ${p.humanDecision || 'aucune'}.`) },
        uncertainty: uncertaintyOf(ix, p) };
    } else if (AGENT.test(q)) {
      const p = found[0], ag = (p.assignedAgents || []).map(id => ix.agents.find(a => a.id === id)).filter(Boolean).slice(0, 5);
      out = ag.length ? { kind: 'answer', question: s.text, method: METHOD, claims: [problemClaim(ix, p), ...ag.map(a => ({ text: T(`${a.code} — ${a.en?.role || a.role} (execution: ${a.executionMode}, permission: ${a.permission}).`, `${a.code} — ${a.role} (exécution : ${a.executionMode}, permission : ${a.permission}).`), status: 'agent-record', citations: [cite(ix, 'agents', a.id)] }))], uncertainty: [T('An assignment is work routing, not a verified competence (“declared competence”).', 'Une affectation est un routage de travail, pas une compétence vérifiée (« compétence déclarée »).')] }
        : refusal(s.text, 'no-record', T('No agent is registered for this problem.', 'Aucun agent n’est enregistré pour ce problème.'));
    } else if (EVIDENCE.test(q)) {
      const p = found[0], recs = p.evidence.map(e => [e, ix.records.get(e.ref)]).filter(([, r]) => r);
      const recClaims = recs.slice(0, 3).map(([e, r]) => { const k = e.ref.split(':')[0], f = ix.files[k];
        const text = k === 'sidewalks' ? T(`Survey ${r.record_id}: ${r.width_ft} ft (sides: ${r.side}), minimum ${r.min_width_ft} ft, class ${r.class}.`, `Relevé ${r.record_id} : ${r.width_ft} ft (côtés : ${r.side}), minimum ${r.min_width_ft} ft, classe ${r.class}.`) : T(`Permit ${r.permit_number}: ${r.permit_type}, status ${r.status}.`, `Permis ${r.permit_number} : ${r.permit_type}, statut ${r.status}.`);
        return { text: `${text} ${T(`Source: ${f.meta.title} (${f.meta.provider}), retrieved ${f.meta.retrieved_at.slice(0, 10)}, licence ${f.meta.license}.`, `Source : ${f.meta.title} (${f.meta.provider}), récupéré le ${f.meta.retrieved_at.slice(0, 10)}, licence ${f.meta.license}.`)}`, status: 'dataset-record', citations: [cite(ix, k, e.ref, f.meta.page)] }; });
      out = recClaims.length ? { kind: 'answer', question: s.text, method: METHOD, claims: [problemClaim(ix, p), ...recClaims], uncertainty: [...uncertaintyOf(ix, p), ...recs.slice(0, 3).map(([e]) => ix.files[e.ref.split(':')[0]].integrity === 'verified' ? T(`Integrity of file ${e.ref.split(':')[0]} verified (SHA-256 = manifest); this does not prove the source is accurate.`, `Intégrité du fichier ${e.ref.split(':')[0]} vérifiée (SHA-256 = manifeste) ; cela ne prouve pas l’exactitude de la source.`) : T(`WARNING: file ${e.ref.split(':')[0]} does not match the manifest.`, `ATTENTION : le fichier ${e.ref.split(':')[0]} ne correspond pas au manifeste.`))] }
        : refusal(s.text, 'no-evidence', T(`The problem “${ptext(p.title)}” has no recorded evidence (status: ${STATUS[p.status]}).`, `Le problème « ${p.title} » n’a aucune preuve enregistrée (statut : ${STATUS[p.status]}).`));
    } else {
      const shown = found.slice(0, 5);
      out = { kind: 'answer', question: s.text, method: METHOD, claims: shown.map(p => problemClaim(ix, p)), uncertainty: [...new Set(shown.flatMap(p => uncertaintyOf(ix, p)))], ...(found.length > 5 ? { more: found.length - 5 } : {}) };
    }
  }
  out.notes = notes;
  // Integrity gate: any citation of a dataset whose file does not match the manifest blocks the answer.
  if (out.kind === 'answer' && out.claims.some(c => c.citations.some(x => x.integrity === 'MISMATCH')))
    return refusal(s.text, 'integrity', T('A source file no longer matches its recorded fingerprint: answer blocked until checked.', 'Un fichier source ne correspond plus à son empreinte enregistrée : réponse bloquée jusqu’à vérification.'), { notes });
  const v = validate(out, ix);
  return v.ok ? out : refusal(s.text, 'validation', T(`Answer blocked by validation: ${v.problems[0]}`, `Réponse bloquée par la validation : ${v.problems[0]}`), { notes });
}

// Re-checks an answer against the index: every claim cited, every cited record exists, every number in a claim
// appears in a cited record, statuses are known. A fabricated or edited claim fails.
export function validate(a, ix) {
  const problems = [];
  if (a.kind === 'refusal') return a.claims.length ? { ok: false, problems: [T('a refused answer contains no claim', 'une réponse refusée ne contient aucune affirmation')] } : { ok: true, problems };
  if (!a.claims.length) problems.push(T('answer without a claim', 'réponse sans affirmation'));
  for (const c of a.claims) {
    if (!STATUS[c.status]) problems.push(T(`unknown status: ${c.status}`, `statut inconnu : ${c.status}`));
    if (!c.citations?.length) { problems.push(T('claim without a citation', 'affirmation sans citation')); continue; }
    const sources = [];
    for (const x of c.citations) {
      if (!ALLOWED.has(x.source)) problems.push(T(`source not on the allowlist: ${x.source}`, `source hors liste : ${x.source}`));
      const fileKey = Object.entries(SOURCES).find(([, p]) => p === x.source)?.[0];
      if (fileKey && ix.files[fileKey].sha256 !== x.fileSha256) problems.push(T(`inconsistent file fingerprint: ${x.source}`, `empreinte de fichier incohérente : ${x.source}`));
      const rec = x.record === '*' ? ix.problems : x.source === SOURCES.problems ? ix.problems.find(p => p.id === x.record) : x.source === SOURCES.agents ? ix.agents.find(g => g.id === x.record) : ix.records.get(x.record);
      if (!rec) problems.push(T(`record not found: ${x.record}`, `enregistrement introuvable : ${x.record}`)); else sources.push(JSON.stringify(rec));
      if (x.url && !/^https:\/\//.test(x.url)) problems.push(T('non-https link', 'lien non https'));
    }
    const hay = sources.join(' ') + (c.status === 'count' ? ` ${ix.problems.length} ${['observed', 'potential-risk', 'hypothesis', 'simulated'].map(k => ix.problems.filter(p => p.status === k).length).join(' ')}` : '') + ' ' + c.citations.map(x => JSON.stringify(Object.values(ix.files).find(f => f.path === x.source)?.meta || '')).join(' ');
    // Exact number tokens only (hashes removed), so "6" cannot hide inside "2026" or a fingerprint.
    const NUM = /(?<![0-9a-z.])\d+(?:[.,]\d+)?(?![0-9a-z])/gi; // a number stands alone: not inside an id, hash or word
    const numbers = new Set((hay.replace(/(\d)T(\d)/g, '$1 $2').match(NUM) || []).map(n => String(Number(n.replace(',', '.')))));
    for (const n of String(c.text).match(NUM) || []) if (!numbers.has(String(Number(n.replace(',', '.'))))) problems.push(T(`unsourced number: ${n}`, `nombre non sourcé : ${n}`));
  }
  return { ok: !problems.length, problems };
}
