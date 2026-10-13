// CORE — optional local language-model interface (Phase 3). Provider-independent, local-only, free.
// Status on the founder's Mac (2026-10-13): NO runtime installed (no Ollama, llama.cpp server, LM Studio, MLX),
// so no language model is operational. Deterministic tools and gateways stay authoritative in every case:
// a model may only draft prose that cites existing findings; the validator rejects anything else.
(function (root) {
  'use strict';
  const PROVIDERS = {
    none: { id: 'none', kind: 'none', label: 'Aucun modèle de langage (règles déterministes uniquement)' },
    ollama: { id: 'ollama', kind: 'llm', label: 'Ollama (local)', baseUrl: 'http://127.0.0.1:11434', probePath: '/api/tags', model: 'qwen2.5:7b-instruct' },
    'openai-compatible-local': { id: 'openai-compatible-local', kind: 'llm', label: 'Serveur local compatible OpenAI (llama.cpp server, LM Studio)', baseUrl: 'http://127.0.0.1:8080', probePath: '/v1/models', model: 'local' },
  };

  async function probe(provider, { timeoutMs = 1500, fetchImpl = globalThis.fetch } = {}) {
    if (!provider || provider.kind !== 'llm') return { available: false, reason: 'aucun fournisseur' };
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), timeoutMs);
    try { const r = await fetchImpl(provider.baseUrl + provider.probePath, { signal: ctl && ctl.signal }); clearTimeout(t); return r.ok ? { available: true, reason: 'joignable' } : { available: false, reason: `HTTP ${r.status}` }; }
    catch (e) { clearTimeout(t); return { available: false, reason: 'non joignable (aucun serveur local)' }; }
  }

  function prompt(mission) {
    const facts = mission.findings.map((f, i) => `[${i}] (${f.epistemic}) ${f.claim}`).join('\n');
    return `Tu rédiges une synthèse pour une revue humaine. Règles : n'utilise QUE les constats numérotés ci-dessous ; chaque phrase doit citer au moins un constat entre crochets, par exemple [2] ; n'ajoute aucun chiffre, lieu, nom ou causalité absents des constats cités ; distingue observé, rapporté, dérivé, hypothèse et simulé ; n'émets aucune recommandation d'action physique ou politique.\n\nConstats :\n${facts}\n\nSynthèse (3 à 5 phrases) :`;
  }
  async function draft(provider, mission, { fetchImpl = globalThis.fetch, timeoutMs = 60000 } = {}) {
    const p = prompt(mission), ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), timeoutMs);
    try {
      let text;
      if (provider.id === 'ollama') { const r = await fetchImpl(`${provider.baseUrl}/api/generate`, { method: 'POST', signal: ctl && ctl.signal, body: JSON.stringify({ model: provider.model, prompt: p, stream: false, options: { temperature: 0 } }) }); text = (await r.json()).response; }
      else { const r = await fetchImpl(`${provider.baseUrl}/v1/chat/completions`, { method: 'POST', signal: ctl && ctl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: provider.model, temperature: 0, messages: [{ role: 'user', content: p }] }) }); text = (await r.json()).choices[0].message.content; }
      return validate(text, mission.findings, provider);
    } finally { clearTimeout(t); }
  }

  // Validator: every sentence must cite existing findings; every number in a sentence must appear in a cited finding.
  function validate(text, findings, provider = PROVIDERS.none) {
    const sentences = String(text || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    const accepted = [], rejected = [];
    for (const s of sentences) {
      const cites = [...s.matchAll(/\[(\d+)\]/g)].map(m => +m[1]);
      const nums = (s.replace(/\[\d+\]/g, '').match(/\d+(?:[.,]\d+)?/g) || []).map(n => n.replace(',', '.'));
      const sourceText = cites.map(i => findings[i] ? findings[i].claim : '').join(' ').replace(/,/g, '.');
      if (!cites.length) { rejected.push({ sentence: s, reason: 'aucune citation' }); continue; }
      if (cites.some(i => !findings[i])) { rejected.push({ sentence: s, reason: 'citation inexistante' }); continue; }
      const unsupported = nums.filter(n => !sourceText.includes(n));
      if (unsupported.length) { rejected.push({ sentence: s, reason: `chiffres non sourcés : ${unsupported.join(', ')}` }); continue; }
      accepted.push({ sentence: s, cites });
    }
    return { provider: provider.id, accepted, rejected, validated: rejected.length === 0 && accepted.length > 0, label: 'Brouillon de modèle de langage — validé contre les constats ; non autoritatif' };
  }

  const LLM = { PROVIDERS, probe, prompt, draft, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = LLM; else root.CORE_LLM = LLM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
