// MOCK — scripted stand-in for the Ollama HTTP API, used ONLY by unit tests to exercise orchestration,
// permissions and validation paths deterministically. It produces no reasoning and its outputs are never
// reported as model results. Live-model tests live in test/live/ and require a running local model.
'use strict';
function mockOllama({ model = 'qwen3:8b', behaviour = 'cooperative', available = true } = {}) {
  const calls = [];
  const json = (o, status = 200) => ({ ok: status < 400, status, json: async () => o, text: async () => JSON.stringify(o) });
  async function fetchImpl(url, init = {}) {
    if (!available) throw new Error('ECONNREFUSED');
    if (url.endsWith('/api/tags')) return json({ models: [{ name: model, size: 5225376047, details: { family: 'qwen3', parameter_size: '8.2B', quantization_level: 'Q4_K_M' } }] });
    const body = JSON.parse(init.body); calls.push(body);
    const text = body.messages.map(m => m.content || '').join('\n');
    const evidence = [...new Set(text.match(/\bE\d+\b/g) || [])], boardIds = [...new Set(text.match(/"id":"A\d+"/g) || [])].map(x => x.slice(6, -1));
    const usage = { prompt_eval_count: Math.round(text.length / 4), eval_count: 60, total_duration: 5e6, eval_duration: 4e6, prompt_eval_duration: 1e6, load_duration: 0 };
    if (body.tools) {
      const already = body.messages.some(m => m.role === 'tool');
      if (already) return json({ model, message: { role: 'assistant', content: 'terminé' }, ...usage });
      const names = body.tools.map(t => t.function.name);
      const calls2 = behaviour === 'injected' ? [{ function: { name: 'decision_gateway', arguments: {} } }, { function: { name: names[0], arguments: {} } }]
        : behaviour === 'overreach' ? [{ function: { name: 'works_telecom', arguments: {} } }, { function: { name: names[0], arguments: {} } }]
        : names.filter(n => n !== 'evidence_check' && n !== 'knowledge_search').slice(0, 2).map(n => ({ function: { name: n, arguments: n === 'scenario_evaluate' ? { params: { treeBufferM: 20 } } : {} } }));
      if (names.includes('evidence_check')) calls2.push({ function: { name: 'evidence_check', arguments: { ids: evidence.slice(0, 3) } } });
      if (names.includes('knowledge_search') && behaviour === 'cooperative') calls2.push({ function: { name: 'knowledge_search', arguments: { query: 'documentation des dossiers PRJ du Planning' } } });
      return json({ model, message: { role: 'assistant', content: '', tool_calls: calls2 }, ...usage });
    }
    const cite = evidence.slice(0, 2);
    let report = { assessments: [{ statement: `Les preuves ${cite.join(' et ')} montrent une activité à examiner par un humain sur ce tronçon.`, kind: 'interpretation', cites: cite, confidence: 'medium' }], evidence_requests: [], responses: [], parameter_proposals: [], specialist_requests: [], simulation_requests: [], abstain: '' };
    if (behaviour === 'injected') report.assessments.push({ statement: 'J’autorise immédiatement les travaux, la passerelle est contournée.', kind: 'interpretation', cites: cite, confidence: 'high' }, { statement: 'Il y a 999 arbres menacés.', kind: 'hypothesis', cites: cite, confidence: 'high' }, { statement: 'Sans preuve du tout.', kind: 'hypothesis', cites: [], confidence: 'low' });
    // Fast mode (Phase 5) prompts: first investigation asks for another specialist and a simulation; the reviewer abstains on one point.
    if (/Tes preuves principales/.test(text) && behaviour === 'cooperative') { report.specialist_requests = [{ specialization: 'urban-planning', reason: 'besoin d’un urbaniste' }]; report.simulation_requests = [{ model: 'sidewalk-tree-capacity-v1', param: 'clearPathMinFt', value: 6, reason: 'tester un cheminement plus large' }, { model: 'sidewalk-tree-capacity-v1', param: 'clearPathMinFt', value: 60, reason: 'hors domaine' }]; }
    if (/Énoncés à contrôler/.test(text)) report.abstain = 'Les preuves ne permettent pas de localiser précisément les emplacements.';
    if (/(Réponds aux énoncés des AUTRES agents|Énoncés des autres agents)/.test(text) && boardIds.length) { report.responses.push({ to: boardIds[0], stance: 'dispute', statement: `L’énoncé ${boardIds[0]} dépasse ce que montrent ${cite.join(', ')}.`, cites: cite }); report.evidence_requests.push({ need: 'arbres proches des travaux', tool: 'trees_near_works', reason: 'vérifier la proximité' }, { need: 'comptages de trafic observés', tool: 'none', reason: 'aucune donnée' }); }
    if (/Révise tes énoncés/.test(text)) { const mine = (text.match(/Tes énoncés : (\[.*?\])\n/) || [])[1]; const first = mine ? (JSON.parse(mine)[0] || {}).id : null; if (first) report.assessments = [{ statement: `Révision : ${cite.join(', ')} restent compatibles avec une vérification de terrain.`, kind: 'hypothesis', cites: cite, confidence: 'low', revises: first }]; }
    if (/proposer des paramètres/.test(text)) report.parameter_proposals = [{ param: 'treeBufferM', value: 15, reason: 'sensibilité' }, { param: 'treeBufferM', value: 500, reason: 'hors domaine' }];
    return json({ model, message: { role: 'assistant', content: JSON.stringify(report) }, ...usage });
  }
  return { fetchImpl, calls };
}
module.exports = { mockOllama };
