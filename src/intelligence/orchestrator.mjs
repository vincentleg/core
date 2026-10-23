// CORE Intelligence — provider-agnostic orchestration (V7).
//   question → intent & privacy checks → authorised evidence retrieval (CORE Knowledge, integrity-anchored)
//   → reasoning by a provider (deterministic by default; optional LOCAL model) → claim verification (verifier.mjs)
//   → uncertainty disclosure → answer, labelled with what produced it.
// A model never approves findings, authorises interventions or invents outcomes; if its text fails verification it is
// discarded and the deterministic, cited answer is shown instead, with the reasons.
import { LANGUAGE_NAME } from '../i18n/i18n.mjs';
import { ask } from '../kb/knowledge.mjs';
import { verify, privacyCheck } from './verifier.mjs';
import { T, lang } from '../i18n/i18n.mjs';
import { ptext } from '../earth/problem-view.mjs';
import { PUBLIC } from '../env.mjs';

const PV = (en, fr) => ({ get label() { return T(en[0], fr[0]); }, get kind() { return T(en[1], fr[1]); } });
export const PROVIDERS = {
  deterministic: { id: 'deterministic', ...PV(['Deterministic (CORE Knowledge)', 'Registry retrieval + rules. Not a language model.'], ['Déterministe (CORE Knowledge)', 'Recherche dans les registres + règles. Pas un modèle de langage.']), local: true, generative: false, default: true },
  ollama: { id: 'ollama', ...PV(['Local model (Ollama, experimental)', 'Language model running on this computer, constrained to the evidence and then verified.'], ['Modèle local (Ollama, expérimental)', 'Modèle de langage exécuté sur cet ordinateur, contraint aux preuves puis vérifié.']), local: true, generative: true, endpoint: 'http://127.0.0.1:11434' },
  remote: { id: 'remote', ...PV(['Remote model', 'No approved remote provider: disabled (founder decision required, key never in the browser).'], ['Modèle distant', 'Aucun fournisseur distant approuvé : désactivé (décision du fondateur requise, clé jamais dans le navigateur).']), local: false, generative: true, disabled: true },
};

// Prompt: evidence only, numbered; the model must cite [n], keep statuses and say what is unknown.
export function buildPrompt(question, evidence, problem, limits = []) {
  const fr = lang() === 'fr';
  const ev = evidence.map((e, i) => `[${i + 1}] (${e.status || (fr ? 'statut inconnu' : 'unknown status')}; source ${e.record}) ${e.text}`).join('\n');
  const lim = limits.length ? `\n${fr ? 'Limites connues (à respecter, ne pas citer comme des faits)' : 'Known limits (respect them, do not cite them as facts)'} :\n${limits.map(l => `- ${l}`).join('\n')}` : '';
  if (!fr) return [
    { role: 'system', content: 'You are a CORE agent. Answer in ' + LANGUAGE_NAME[lang()] + ', in 2 to 4 sentences, ONLY from the numbered evidence. Cite every fact with [n]. Add no number, no date and no legal status (standard, law, compliant…) that is not in the evidence. Never say that something is proven, validated, dangerous or current unless the evidence says so. A design-plan “minimum” is neither a standard nor an obligation: do not say “required” or “mandatory”. End with what remains unknown.' },
    { role: 'user', content: `Problem: ${problem ? `${ptext(problem.title, 'en')} (${problem.place})` : '—'}\nEvidence:\n${ev}${lim}\n\nQuestion: ${question}` },
  ];
  return [
    { role: 'system', content: 'Tu es un agent de CORE. Réponds en français, en 2 à 4 phrases, UNIQUEMENT à partir des preuves numérotées. Cite chaque fait avec [n]. N’ajoute aucun chiffre, aucune date, aucun statut juridique (norme, loi, conforme…) qui ne figure pas dans les preuves. Ne dis jamais que quelque chose est prouvé, validé, dangereux ou actuel si les preuves ne le disent pas. Un « minimum » de plan de conception n’est ni une norme, ni une obligation : ne dis pas « requis » ou « exigé ». Termine par ce qui reste inconnu.' },
    { role: 'user', content: `Problème : ${problem ? `${problem.title} (${problem.place})` : '—'}\nPreuves :\n${ev}${lim}\n\nQuestion : ${question}` },
  ];
}

// Local model through Ollama's HTTP API on 127.0.0.1 only. Streams tokens to onToken. Never called unless the person
// switched the provider on; no data leaves the machine.
export async function ollamaAvailable({ fetchImpl = fetch, endpoint = PROVIDERS.ollama.endpoint } = {}) {
  if (PUBLIC) return { ok: false, models: [], public: true }; // the public site never probes a visitor's machine
  try { const r = await fetchImpl(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(1500) }); if (!r.ok) return { ok: false, models: [] }; const j = await r.json(); return { ok: true, models: (j.models || []).map(m => m.name) }; }
  catch { return { ok: false, models: [] }; }
}
export async function ollamaGenerate(messages, { model, onToken = () => {}, fetchImpl = fetch, endpoint = PROVIDERS.ollama.endpoint, signal } = {}) {
  if (PUBLIC) throw Error(T('local model disabled on the public site', 'modèle local désactivé sur le site public'));
  const r = await fetchImpl(`${endpoint}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal, body: JSON.stringify({ model, messages, stream: true, think: false, options: { temperature: 0.1, num_predict: 260 } }) });
  if (!r.ok || !r.body) throw Error(T(`local model unavailable (HTTP ${r.status})`, `modèle local indisponible (HTTP ${r.status})`));
  const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '', out = '';
  for (;;) {
    const { value, done } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); let i;
    while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; const j = JSON.parse(line); const t = j.message?.content || ''; if (t) { out += t; onToken(t, out); } }
  }
  return out.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// The pipeline. Returns a typed result the UI renders; `generate` is injectable for tests.
export async function answer(question, { ix, problem = null, provider = 'deterministic', model = null, onToken, generate = ollamaGenerate, history = [] } = {}) {
  const t0 = Date.now(), trace = [];
  const k = await ask(question, ix, { history }); trace.push(['retrieval', k.kind]);
  if (k.kind === 'refusal') return { kind: 'refusal', text: `CORE Knowledge refuse : ${k.refusal.reason}`, refusal: k.refusal, provider: 'deterministic', trace };
  const evidence = k.claims.map(c => ({ text: c.text, status: c.status, record: c.citations?.[0]?.record || '', citations: c.citations }));
  const base = { kind: 'evidence', claims: k.claims, citations: k.claims.flatMap(c => c.citations), statuses: k.claims.map(c => c.status), uncertainty: k.uncertainty, refusal: k.refusal || null };
  const P = PROVIDERS[provider] || PROVIDERS.deterministic;
  if (!P.generative || P.disabled) return { ...base, text: k.claims.map(c => c.text).join('\n'), provider: 'deterministic', trace, ms: Date.now() - t0 };
  const pc = privacyCheck(question); trace.push(['privacy', pc.ok]);
  if (!pc.ok) return { ...base, text: k.claims.map(c => c.text).join('\n'), provider: 'deterministic', fallback: pc.reason, trace, ms: Date.now() - t0 };
  let draft = '';
  try { draft = await generate(buildPrompt(question, evidence, problem, k.uncertainty || []), { model, onToken }); }
  catch (e) { return { ...base, text: k.claims.map(c => c.text).join('\n'), provider: 'deterministic', fallback: T(`local model unavailable: ${e.message}`, `modèle local indisponible : ${e.message}`), trace, ms: Date.now() - t0 }; }
  const v = verify(draft, evidence); trace.push(['verify', v.ok]);
  if (!v.ok) return { ...base, text: k.claims.map(c => c.text).join('\n'), provider: 'deterministic', rejected: { draft, issues: v.issues, model }, trace, ms: Date.now() - t0 };
  return { ...base, text: draft, provider: 'ollama', model, verified: true, evidenceText: evidence, trace, ms: Date.now() - t0 };
}
