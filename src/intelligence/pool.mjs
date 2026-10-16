// CORE V8 — shared reasoning pool. The 508 registered agents do NOT each run a model: they share a small, bounded pool
// of local-model workers (default 1) through a priority queue. Idle agents consume nothing.
// Every job is a typed task with a JSON schema; the model's answer must parse, match the schema, cite only existing
// findings and pass the semantic verifier (no new numbers, dates, legal status or overclaims). Results are PROPOSALS:
// they are recorded with their provenance and can never modify findings, evidence, secrets or decisions.
// Budgets: per-job timeout, one retry, max output tokens, max jobs per hour, max queue length.
import { verify } from './verifier.mjs';

export const KINDS = {
  gaps: { label: 'Identifier les preuves manquantes', schema: { type: 'object', required: ['questions'], properties: { questions: { type: 'array', maxItems: 4, items: { type: 'object', required: ['question', 'why', 'needs', 'related'], properties: { question: { type: 'string', maxLength: 240 }, why: { type: 'string', maxLength: 240 }, needs: { type: 'string', enum: ['data', 'method', 'review', 'local-knowledge'] }, related: { type: 'array', items: { type: 'string' } } } } } } } },
  hypothesis: { label: 'Proposer une hypothèse testable', schema: { type: 'object', required: ['hypotheses'], properties: { hypotheses: { type: 'array', maxItems: 2, items: { type: 'object', required: ['title', 'statement', 'supports', 'test', 'falsifiedIf'], properties: { title: { type: 'string', maxLength: 90 }, statement: { type: 'string', maxLength: 320 }, supports: { type: 'array', minItems: 1, items: { type: 'string' } }, test: { type: 'string', maxLength: 240 }, falsifiedIf: { type: 'string', maxLength: 240 } } } } } } },
  critique: { label: 'Contester une hypothèse', schema: { type: 'object', required: ['objections'], properties: { objections: { type: 'array', maxItems: 3, items: { type: 'object', required: ['text', 'kind'], properties: { text: { type: 'string', maxLength: 260 }, kind: { type: 'string', enum: ['data', 'method', 'causality', 'equity', 'other'] } } } } } } },
  synthesis: { label: 'Synthèse pour un rapport', schema: { type: 'object', required: ['summary', 'established', 'uncertain'], properties: { summary: { type: 'string', maxLength: 700 }, established: { type: 'array', items: { type: 'string' } }, uncertain: { type: 'array', items: { type: 'string' } } } } },
};

// Minimal JSON-schema check for the subset used above.
export function checkSchema(v, s, path = '$') {
  const err = [];
  if (s.type === 'object') { if (!v || typeof v !== 'object' || Array.isArray(v)) return [`${path}: objet attendu`]; for (const k of s.required || []) if (!(k in v)) err.push(`${path}.${k}: manquant`); for (const [k, ps] of Object.entries(s.properties || {})) if (k in v) err.push(...checkSchema(v[k], ps, `${path}.${k}`)); }
  else if (s.type === 'array') { if (!Array.isArray(v)) return [`${path}: tableau attendu`]; if (s.maxItems != null && v.length > s.maxItems) err.push(`${path}: plus de ${s.maxItems} éléments`); if (s.minItems != null && v.length < s.minItems) err.push(`${path}: moins de ${s.minItems} élément(s)`); v.forEach((x, i) => err.push(...checkSchema(x, s.items, `${path}[${i}]`))); }
  else if (s.type === 'string') { if (typeof v !== 'string') return [`${path}: texte attendu`]; if (s.maxLength && v.length > s.maxLength) err.push(`${path}: trop long`); if (s.enum && !s.enum.includes(v)) err.push(`${path}: valeur hors liste`); }
  return err;
}

// Prompt: findings numbered by id; the model may only cite these ids; text constraints mirror the verifier.
export function prompt(kind, { mission, findings, hypothesis = null }) {
  const ev = findings.map(f => `- ${f.id} [${f.status}] ${f.claim}`).join('\n');
  const rules = 'Réponds en français, en JSON conforme au schéma. Cite uniquement les identifiants de constats fournis. N’invente aucun chiffre, aucune date, aucun statut juridique (norme, loi, obligatoire) et n’affirme aucune certitude, cause prouvée, danger ou validation. Une hypothèse reste une hypothèse.';
  const task = { gaps: 'Quelles questions de recherche manquent pour avancer ? Indique pour chacune ce qu’il faudrait (données, méthode, revue, connaissance locale).',
    hypothesis: 'Propose au plus deux hypothèses testables, différentes de celles déjà listées, chacune appuyée sur au moins un constat cité, avec un test et une condition de réfutation.',
    critique: `Conteste cette hypothèse comme un relecteur sceptique : « ${hypothesis?.title} — ${hypothesis?.statement} ». Objections de données, de méthode, de causalité ou d’équité.`,
    synthesis: 'Rédige une synthèse prudente pour un décideur : ce qui est établi (identifiants), ce qui reste incertain (identifiants).' }[kind];
  return [{ role: 'system', content: `Tu es un agent de recherche de CORE. ${rules}` }, { role: 'user', content: `Mission : ${mission.title}\nQuestion : ${mission.question}\nHypothèses déjà ouvertes : ${(mission.hypotheses || []).map(h => `${h.id} ${h.title}`).join(' ; ') || 'aucune'}\nConstats :\n${ev}\n\nTâche : ${task}` }];
}

// Validation of a parsed answer against the mission's findings.
export function validate(kind, out, findings) {
  const issues = checkSchema(out, KINDS[kind].schema), ids = new Set(findings.map(f => f.id));
  const texts = [];
  if (kind === 'gaps') for (const q of out.questions || []) { for (const r of q.related || []) if (!ids.has(r)) issues.push(`constat inexistant : ${r}`); texts.push(q.question, q.why); }
  if (kind === 'hypothesis') for (const h of out.hypotheses || []) { for (const r of h.supports || []) if (!ids.has(r)) issues.push(`constat inexistant : ${r}`); texts.push(h.statement, h.test, h.falsifiedIf); }
  if (kind === 'critique') for (const o of out.objections || []) texts.push(o.text);
  if (kind === 'synthesis') { for (const r of [...(out.established || []), ...(out.uncertain || [])]) if (!ids.has(r)) issues.push(`constat inexistant : ${r}`); texts.push(out.summary); }
  const ev = findings.filter(f => f.status !== 'gap').map(f => ({ text: f.claim, record: f.id }));
  for (const t of texts.filter(Boolean)) { const v = verify(t, ev, { requireCitation: false }); for (const i of v.issues) issues.push(`${i.code} : ${i.detail}`); }
  return { ok: issues.length === 0, issues: [...new Set(issues)].slice(0, 8) };
}

export function createPool({ generate, workers = 1, timeoutMs = 120000, maxPerHour = 40, maxQueue = 12, numPredict = 500, now = () => Date.now() } = {}) {
  const queue = [], ledger = [], running = new Set(); let stopped = false;
  const recent = () => ledger.filter(e => now() - e.startedAt < 3600e3).length;
  function submit(job) { // job: { id, kind, agent, mission, findings, hypothesis?, priority (0 = person waiting, 1 = mission) }
    if (stopped) return Promise.reject(Error('pool arrêté'));
    if (queue.length >= maxQueue) return Promise.reject(Error('file pleine : tâche refusée (budget)'));
    return new Promise((resolve, reject) => { queue.push({ ...job, resolve, reject }); queue.sort((a, b) => (a.priority ?? 1) - (b.priority ?? 1)); pump(); });
  }
  async function pump() {
    while (!stopped && running.size < workers && queue.length) {
      if (recent() >= maxPerHour) { const j = queue.shift(); j.reject(Error('budget horaire atteint')); continue; }
      const job = queue.shift(); running.add(job); exec(job).finally(() => { running.delete(job); pump(); });
    }
  }
  async function exec(job) {
    const entry = { id: job.id, kind: job.kind, agent: job.agent, mission: job.mission.id, evidence: job.findings.map(f => f.id), startedAt: now(), attempts: 0, status: 'running' };
    ledger.push(entry);
    for (let attempt = 1; attempt <= 2; attempt++) {
      entry.attempts = attempt; const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const r = await generate(prompt(job.kind, job), { schema: KINDS[job.kind].schema, signal: ctl.signal, numPredict });
        clearTimeout(timer); entry.ms = now() - entry.startedAt; entry.tokens = r.tokens ?? null; entry.model = r.model ?? null;
        let out; try { out = JSON.parse(r.text); } catch { entry.issues = ['réponse non JSON']; continue; }
        const v = validate(job.kind, out, job.findings); entry.issues = v.issues;
        if (v.ok) { entry.status = 'validé'; entry.output = out; job.resolve({ ok: true, output: out, entry }); return; }
        if (attempt === 2) { entry.status = 'rejeté'; entry.output = out; job.resolve({ ok: false, output: out, issues: v.issues, entry }); return; }
      } catch (e) { clearTimeout(timer); entry.issues = [e.name === 'AbortError' ? 'délai dépassé' : e.message]; if (attempt === 2) { entry.status = 'échec'; job.resolve({ ok: false, issues: entry.issues, entry }); return; } }
    }
    entry.status = 'rejeté'; job.resolve({ ok: false, issues: entry.issues, entry });
  }
  const stop = () => { stopped = true; for (const j of queue.splice(0)) j.reject(Error('pool arrêté')); };
  return { submit, stop, ledger, get queued() { return queue.length; }, get running() { return running.size; }, workers, budget: { timeoutMs, maxPerHour, maxQueue, numPredict } };
}

// Ollama structured-output generator (local only: 127.0.0.1). Returns { text, tokens, model }.
export function ollamaJSON({ model, endpoint = 'http://127.0.0.1:11434', fetchImpl = (...a) => fetch(...a) } = {}) {
  return async (messages, { schema, signal, numPredict }) => {
    const r = await fetchImpl(`${endpoint}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal, body: JSON.stringify({ model, messages, stream: false, think: false, format: schema, options: { temperature: 0.2, num_predict: numPredict } }) });
    if (!r.ok) throw Error(`modèle local : HTTP ${r.status}`);
    const j = await r.json(); return { text: j.message?.content || '', tokens: j.eval_count ?? null, model };
  };
}
