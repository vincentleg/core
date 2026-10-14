// CORE — provider-independent local language-model adapter (Phase 3 interface, Phase 4 implementation).
// Local, free, open-weight only: Ollama (default qwen3:8b) or any OpenAI-compatible local server.
// Bounded context, output and time; tool calling and JSON-schema structured outputs; typed errors.
// A model never computes numbers, never decides and never bypasses the deterministic gateways: its outputs
// are validated against evidence produced by deterministic tools (src/cognitive.js).
(function (root) {
  'use strict';
  const PROVIDERS = {
    none: { id: 'none', kind: 'none', label: 'Aucun modèle de langage (règles déterministes uniquement)' },
    ollama: { id: 'ollama', kind: 'llm', label: 'Ollama (local)', baseUrl: 'http://127.0.0.1:11434', probePath: '/api/tags', model: 'qwen3:8b', license: 'Apache-2.0 (Qwen3)' },
    'openai-compatible-local': { id: 'openai-compatible-local', kind: 'llm', label: 'Serveur local compatible OpenAI (llama.cpp server, LM Studio)', baseUrl: 'http://127.0.0.1:8080', probePath: '/v1/models', model: 'local' },
  };
  const LIMITS = { maxContextChars: 26000, maxToolResultChars: 3600, maxOutputTokens: 900, numCtx: 12288, timeoutMs: 180000, temperature: 0, seed: 20261013 };

  class LLMError extends Error { constructor(code, message) { super(message); this.code = code; } }

  // Local-only: refuse any non-loopback endpoint (no data leaves the machine, no paid API can be reached).
  function assertLocal(provider) {
    const h = new URL(provider.baseUrl).hostname;
    if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(h)) throw new LLMError('not-local', `fournisseur non local refusé : ${h}`);
  }
  async function timed(fetchImpl, url, init, timeoutMs, signal) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), timeoutMs);
    const onAbort = () => ctl && ctl.abort(); if (signal) signal.addEventListener('abort', onAbort, { once: true });
    try { return await fetchImpl(url, { ...init, signal: ctl && ctl.signal }); }
    catch (e) { if (signal && signal.aborted) throw new LLMError('cancelled', 'annulé'); if (e && e.name === 'AbortError') throw new LLMError('timeout', `délai dépassé (${timeoutMs} ms)`); throw new LLMError('unavailable', `serveur local non joignable (${e && e.message})`); }
    finally { clearTimeout(t); if (signal) signal.removeEventListener('abort', onAbort); }
  }

  async function probe(provider, { timeoutMs = 1500, fetchImpl = globalThis.fetch } = {}) {
    if (!provider || provider.kind !== 'llm') return { available: false, reason: 'aucun fournisseur', provider: provider && provider.id };
    try {
      assertLocal(provider);
      const r = await timed(fetchImpl, provider.baseUrl + provider.probePath, {}, timeoutMs);
      if (!r.ok) return { available: false, reason: `HTTP ${r.status}`, provider: provider.id };
      const j = await r.json().catch(() => ({}));
      const models = provider.id === 'ollama' ? (j.models || []).map(m => ({ name: m.name, sizeBytes: m.size, family: m.details && m.details.family, parameters: m.details && m.details.parameter_size, quantization: m.details && m.details.quantization_level })) : (j.data || []).map(m => ({ name: m.id }));
      const present = models.some(m => m.name === provider.model || provider.id !== 'ollama');
      return { available: present, reachable: true, reason: present ? 'modèle local disponible' : `serveur joignable, modèle ${provider.model} absent`, provider: provider.id, model: provider.model, models };
    } catch (e) { return { available: false, reachable: false, reason: e.code === 'not-local' ? e.message : 'non joignable (aucun serveur local)', provider: provider.id }; }
  }

  // Bounded context: tool results are truncated, then the oldest tool results are elided until the
  // conversation fits. The system and first user message are always kept.
  function boundMessages(messages, limits = LIMITS) {
    const out = messages.map(m => m.role === 'tool' && m.content.length > limits.maxToolResultChars ? { ...m, content: m.content.slice(0, limits.maxToolResultChars) + '…[tronqué]' } : m);
    let size = out.reduce((n, m) => n + (m.content || '').length, 0);
    for (let i = 2; i < out.length && size > limits.maxContextChars; i++) if (out[i].role === 'tool' && !out[i].elided) { size -= out[i].content.length - 40; out[i] = { ...out[i], content: '[résultat ancien retiré pour tenir dans le contexte]', elided: true }; }
    return { messages: out.map(({ elided, ...m }) => m), chars: Math.min(size, out.reduce((n, m) => n + (m.content || '').length, 0)) };
  }

  // One chat turn. tools: [{ name, description, parameters }]; schema: JSON schema for structured output.
  async function chat(provider, { messages, tools = null, schema = null, fetchImpl = globalThis.fetch, timeoutMs = LIMITS.timeoutMs, signal = null, limits = LIMITS } = {}) {
    if (!provider || provider.kind !== 'llm') throw new LLMError('unavailable', 'aucun fournisseur de modèle');
    assertLocal(provider);
    const bounded = boundMessages(messages, limits), t0 = Date.now();
    let r, j;
    if (provider.id === 'ollama') {
      const body = { model: provider.model, messages: bounded.messages, stream: false, think: false, keep_alive: '15m',
        options: { temperature: limits.temperature, seed: limits.seed, num_ctx: limits.numCtx, num_predict: limits.maxOutputTokens } };
      if (tools) body.tools = tools.map(t => ({ type: 'function', function: t }));
      if (schema) body.format = schema;
      r = await timed(fetchImpl, `${provider.baseUrl}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, timeoutMs, signal);
      if (!r.ok) throw new LLMError(r.status === 404 ? 'model-missing' : 'http', `HTTP ${r.status} ${await r.text().catch(() => '')}`.slice(0, 300));
      j = await r.json();
      const msg = j.message || {};
      return { content: msg.content || '', toolCalls: (msg.tool_calls || []).map(c => ({ name: c.function.name, arguments: typeof c.function.arguments === 'string' ? safeJSON(c.function.arguments) : c.function.arguments || {} })),
        usage: { promptTokens: j.prompt_eval_count || 0, outputTokens: j.eval_count || 0, totalMs: Math.round((j.total_duration || 0) / 1e6) || Date.now() - t0, loadMs: Math.round((j.load_duration || 0) / 1e6), promptMs: Math.round((j.prompt_eval_duration || 0) / 1e6), evalMs: Math.round((j.eval_duration || 0) / 1e6), contextChars: bounded.chars },
        model: j.model || provider.model, doneReason: j.done_reason || null };
    }
    const body = { model: provider.model, temperature: limits.temperature, seed: limits.seed, max_tokens: limits.maxOutputTokens, messages: bounded.messages.map(m => m.role === 'tool' ? { role: 'tool', content: m.content, tool_call_id: m.tool_call_id || m.name } : m) };
    if (tools) body.tools = tools.map(t => ({ type: 'function', function: t }));
    if (schema) body.response_format = { type: 'json_schema', json_schema: { name: 'core_report', schema } };
    r = await timed(fetchImpl, `${provider.baseUrl}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, timeoutMs, signal);
    if (!r.ok) throw new LLMError('http', `HTTP ${r.status}`);
    j = await r.json(); const msg = (j.choices && j.choices[0] && j.choices[0].message) || {};
    return { content: msg.content || '', toolCalls: (msg.tool_calls || []).map(c => ({ name: c.function.name, arguments: safeJSON(c.function.arguments) || {} })),
      usage: { promptTokens: (j.usage && j.usage.prompt_tokens) || 0, outputTokens: (j.usage && j.usage.completion_tokens) || 0, totalMs: Date.now() - t0, contextChars: bounded.chars }, model: j.model || provider.model, doneReason: j.choices && j.choices[0] && j.choices[0].finish_reason };
  }
  function safeJSON(s) { try { return JSON.parse(s); } catch (_) { return null; } }
  // Structured output must parse and match the schema's required keys; otherwise it is rejected, never repaired by guessing.
  function parseStructured(content, schema) {
    const j = safeJSON(String(content || '').trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
    if (!j || typeof j !== 'object') throw new LLMError('invalid-output', 'sortie structurée illisible (JSON invalide)');
    for (const k of (schema && schema.required) || []) if (!(k in j)) throw new LLMError('invalid-output', `champ requis absent : ${k}`);
    return j;
  }

  // ---- Phase 3 compatibility: prose draft validated against numbered findings ----
  function prompt(mission) {
    const facts = mission.findings.map((f, i) => `[${i}] (${f.epistemic}) ${f.claim}`).join('\n');
    return `Tu rédiges une synthèse pour une revue humaine. Règles : n'utilise QUE les constats numérotés ci-dessous ; chaque phrase doit citer au moins un constat entre crochets, par exemple [2] ; n'ajoute aucun chiffre, lieu, nom ou causalité absents des constats cités ; distingue observé, rapporté, dérivé, hypothèse et simulé ; n'émets aucune recommandation d'action physique ou politique.\n\nConstats :\n${facts}\n\nSynthèse (3 à 5 phrases) :`;
  }
  async function draft(provider, mission, opts = {}) {
    const r = await chat(provider, { messages: [{ role: 'user', content: prompt(mission) }], ...opts });
    return validate(r.content, mission.findings, provider);
  }
  // Numbers in a sentence must appear in the cited source text (decimal comma/point normalized).
  const numbersIn = s => (String(s).replace(/\[[^\]]*\]/g, '').match(/\d+(?:[.,]\d+)?/g) || []).map(n => n.replace(',', '.'));
  function unsupportedNumbers(sentence, sourceText) { const src = String(sourceText).replace(/(\d),(\d)/g, '$1.$2'); return numbersIn(sentence).filter(n => !new RegExp(`(^|[^0-9.])${n.replace('.', '\\.')}($|[^0-9])`).test(src)); }
  function validate(text, findings, provider = PROVIDERS.none) {
    const sentences = String(text || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    const accepted = [], rejected = [];
    for (const s of sentences) {
      const cites = [...s.matchAll(/\[(\d+)\]/g)].map(m => +m[1]);
      const sourceText = cites.map(i => findings[i] ? findings[i].claim : '').join(' ');
      if (!cites.length) { rejected.push({ sentence: s, reason: 'aucune citation' }); continue; }
      if (cites.some(i => !findings[i])) { rejected.push({ sentence: s, reason: 'citation inexistante' }); continue; }
      const unsupported = unsupportedNumbers(s, sourceText);
      if (unsupported.length) { rejected.push({ sentence: s, reason: `chiffres non sourcés : ${unsupported.join(', ')}` }); continue; }
      accepted.push({ sentence: s, cites });
    }
    return { provider: provider.id, accepted, rejected, validated: rejected.length === 0 && accepted.length > 0, label: 'Brouillon de modèle de langage — validé contre les constats ; non autoritatif' };
  }

  const LLM = { PROVIDERS, LIMITS, LLMError, probe, chat, boundMessages, parseStructured, prompt, draft, validate, unsupportedNumbers, numbersIn, assertLocal };
  if (typeof module !== 'undefined' && module.exports) module.exports = LLM; else root.CORE_LLM = LLM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
