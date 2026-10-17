// CORE V9 — a multi-agent investigation of one question about one mission, run for real.
// Six roles, performed by a small pool of local inference (one worker) plus deterministic tools:
//   1. Coordinator          (local model)   decomposes the question into ≤ 3 sub-questions;
//   2. Evidence researcher  (deterministic) retrieves the mission findings relevant to the question (term overlap);
//   3. Domain analyst       (local model)   answers, citing ONLY retrieved finding ids;
//   4. Simulation specialist(deterministic) reads the recorded SUMO metrics (a model never produces a measurement);
//   5. Scientific critic    (local model + verifier) challenges the analysis; the verifier checks numbers/overclaims;
//   6. Synthesis            (local model)   writes a traceable draft (established vs uncertain, by id), validated.
// Every step records: role, agent identity, provenance ('local-model' | 'deterministic'), inputs, output, duration,
// validation issues. If the local runtime is unavailable, model steps are marked unavailable — never replaced by canned
// text. Prompts and model outputs are in English; the UI says so.
import { checkSchema } from './pool.mjs';
import { verify } from './verifier.mjs';
const en = x => (x && typeof x === 'object' ? x.en ?? '' : x ?? '');
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const STOP = new Set('what which where when does have from with that this they there their about into would could should these those than then them were been being also more most such only very much many some will just your ours what how why are the and for not but can its was has'.split(' '));
const terms = s => new Set((norm(s).match(/[a-z0-9]{3,}/g) || []).filter(w => !STOP.has(w)));
export const ROLES = [
  ['coordinator', 'Coordinator', 'Coordination'], ['evidence', 'Evidence researcher', 'Recherche de preuves'], ['analyst', 'Domain analyst', 'Analyse du domaine'],
  ['simulation', 'Simulation specialist', 'Spécialiste de la simulation'], ['critic', 'Scientific critic', 'Critique scientifique'], ['synthesis', 'Synthesis', 'Synthèse'],
];
const SCHEMA = {
  plan: { type: 'object', required: ['subquestions'], properties: { subquestions: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'object', required: ['question'], properties: { question: { type: 'string', maxLength: 200 } } } } } },
  analysis: { type: 'object', required: ['points'], properties: { points: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'object', required: ['text', 'cites'], properties: { text: { type: 'string', maxLength: 320 }, cites: { type: 'array', minItems: 1, items: { type: 'string' } } } } } } },
  critique: { type: 'object', required: ['objections'], properties: { objections: { type: 'array', maxItems: 3, items: { type: 'object', required: ['text', 'kind'], properties: { text: { type: 'string', maxLength: 260 }, kind: { type: 'string', enum: ['data', 'method', 'causality', 'equity', 'other'] } } } } } },
  synthesis: { type: 'object', required: ['summary', 'established', 'uncertain'], properties: { summary: { type: 'string', maxLength: 700 }, established: { type: 'array', items: { type: 'string' } }, uncertain: { type: 'array', items: { type: 'string' } } } },
};
const RULES = 'Answer in English, as JSON matching the schema. Use only the findings provided and cite their identifiers exactly. Invent no number, date, citation, measurement or legal status. Do not claim certainty, proof, validation or a proven cause. A hypothesis remains a hypothesis.';

// Deterministic retrieval: findings ranked by shared significant terms with the question (+ every gap of the mission).
export function retrieve(question, findings, k = 6) {
  const q = terms(question);
  const scored = findings.filter(f => f.status !== 'gap').map(f => ({ f, n: [...terms(`${en(f.claim)} ${f.id}`)].filter(w => q.has(w)).length })).sort((a, b) => b.n - a.n);
  const hits = scored.filter(x => x.n > 0).slice(0, k).map(x => x.f), base = hits.length ? hits : scored.slice(0, Math.min(k, 4)).map(x => x.f);
  return { findings: base, gaps: findings.filter(f => f.status === 'gap'), method: hits.length ? 'term-overlap' : 'no-overlap-fallback' };
}
// Deterministic reading of the recorded simulation (if the mission has one).
export function simulationFacts(mobility) {
  if (!mobility) return null;
  return mobility.scenarios.map(s => ({ id: s.id, status: s.status || 'baseline', carDelay: [Math.round(s.summary.carDelay.mean), Math.round(s.summary.carDelay.ci95)], busTravelTime: [Math.round(s.summary.busTravelTime.mean), Math.round(s.summary.busTravelTime.ci95)], co2kg: [Math.round(s.summary.co2kg.mean), Math.round(s.summary.co2kg.ci95)], vsBaseline: s.comparison ? Object.fromEntries(Object.entries(s.comparison).map(([k, c]) => [k, `${c.pct > 0 ? '+' : ''}${c.pct}%${c.beyondNoise ? '' : ' (within noise)'}`])) : null }));
}
const cites = (out, ids) => { const bad = []; const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { for (const c of v.cites || []) if (!ids.has(c)) bad.push(c); Object.values(v).forEach(x => typeof x === 'object' && walk(x)); } }; walk(out); return bad; };

// generate: (messages, { schema, signal, numPredict }) → { text, tokens, model }. agents: role → registry agent id.
export async function investigate({ mission, question, mobility = null, generate = null, agents = {}, timeoutMs = 150000, now = () => Date.now(), onStep = () => {} }) {
  const steps = [], t0 = now(), mtitle = en(mission.title), ids = new Set(mission.findings.map(f => f.id));
  const record = s => { steps.push(s); onStep(s); return s; };
  let available = !!generate;
  async function model(role, schema, user) {
    const st = { role, agent: agents[role] || null, provenance: 'local-model', inputs: [], output: null, issues: [], startedAt: now() };
    if (!available) return record({ ...st, status: 'unavailable', issues: ['Local AI reasoning is unavailable.'] });
    for (let attempt = 1; attempt <= 2; attempt++) {
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const r = await generate([{ role: 'system', content: `You are the ${ROLES.find(x => x[0] === role)[1]} of a CORE research team. ${RULES}` }, { role: 'user', content: user }], { schema, signal: ctl.signal, numPredict: 600 });
        clearTimeout(tm); st.model = r.model; st.tokens = r.tokens;
        let out; try { out = JSON.parse(r.text); } catch { st.issues = ['answer is not JSON']; continue; }
        const issues = checkSchema(out, schema); const bad = cites(out, ids); if (bad.length) issues.push(`unknown finding id(s): ${[...new Set(bad)].join(', ')}`);
        st.output = out; st.issues = issues; st.attempts = attempt;
        if (!issues.length) return record({ ...st, status: 'validated', ms: now() - st.startedAt });
      } catch (e) { clearTimeout(tm); st.issues = [e.name === 'AbortError' ? 'timed out' : String(e.message || e)]; if (/fetch|ECONNREFUSED|Failed|NetworkError|HTTP/i.test(st.issues[0])) { available = false; return record({ ...st, status: 'unavailable', ms: now() - st.startedAt }); } }
    }
    return record({ ...st, status: 'rejected', ms: now() - st.startedAt });
  }
  // 1. Coordinator
  const plan = await model('coordinator', SCHEMA.plan, `Mission: ${mtitle}\nMission question: ${en(mission.question)}\nVisitor question: ${question}\nTask: split the visitor question into at most 3 precise sub-questions that the mission's evidence could address.`);
  const subs = plan.status === 'validated' ? plan.output.subquestions.map(s => s.question) : [question];
  // 2. Evidence researcher (deterministic)
  const ret = retrieve(`${question} ${subs.join(' ')}`, mission.findings);
  const evStep = record({ role: 'evidence', agent: agents.evidence || null, provenance: 'deterministic', status: 'done', inputs: [...ids], output: { findings: ret.findings.map(f => ({ id: f.id, status: f.status, claim: en(f.claim), source: f.source?.title || null, retrieved: f.source?.retrieved || null })), gaps: ret.gaps.map(f => ({ id: f.id, claim: en(f.claim) })), method: ret.method }, issues: [], ms: 0 });
  const evText = ret.findings.map(f => `- ${f.id} [${f.status}] ${en(f.claim)}`).join('\n'), gapText = ret.gaps.map(f => `- ${f.id} [gap] ${en(f.claim)}`).join('\n');
  // 4. Simulation specialist (deterministic; run before the analyst so the analyst can cite the recorded runs)
  const facts = mission.simulation ? simulationFacts(mobility) : null;
  record({ role: 'simulation', agent: agents.simulation || null, provenance: 'deterministic', status: facts ? 'done' : 'not-applicable', inputs: facts ? ['data/mobility/results.json'] : [], output: facts ? { scenarios: facts, note: 'Recorded SUMO runs (5 seeds, mean ± 95% interval); synthetic demand; uncalibrated.' } : { note: 'No simulation exists for this mission.' }, issues: [], ms: 0 });
  // 3. Domain analyst
  const simText = facts ? `\nRecorded simulation (uncalibrated; cite the finding ids m.scenario-* or m.baseline, never invent numbers):\n${facts.map(s => `- ${s.id}: car delay ${s.carDelay[0]}±${s.carDelay[1]} s, bus ${s.busTravelTime[0]}±${s.busTravelTime[1]} s, status ${s.status}`).join('\n')}` : '';
  const analysis = await model('analyst', SCHEMA.analysis, `Mission: ${mtitle}\nVisitor question: ${question}\nSub-questions:\n${subs.map(s => `- ${s}`).join('\n')}\nFindings (cite these ids):\n${evText}\nKnown gaps:\n${gapText}${simText}\nTask: answer with at most 4 points, each citing at least one finding id from the list above.`);
  // 5. Scientific critic (model) + verifier (deterministic)
  const points = analysis.status === 'validated' ? analysis.output.points : [];
  const evidence = mission.findings.filter(f => f.status !== 'gap').map(f => ({ text: en(f.claim), record: f.id }));
  const vIssues = points.flatMap((p, i) => verify(p.text, evidence, { requireCitation: false }).issues.map(x => `point ${i + 1}: ${x.code} · ${x.detail}`));
  // Simulation guard: a difference smaller than the seed-to-seed variation must not be presented as an effect.
  if (facts) points.forEach((p, i) => { for (const sc of facts) { if (!sc.vsBaseline || !p.cites.includes(`m.scenario-${sc.id}`)) continue;
    for (const [k, v] of Object.entries(sc.vsBaseline)) { if (!/within noise/.test(v)) continue; const pct = Math.abs(parseFloat(v)); if (Number.isFinite(pct) && new RegExp(`\\b${String(pct).replace('.', '\\.')}\\s*%`).test(p.text) && !/noise|bruit|not significant|within/i.test(p.text))
      vIssues.push(`point ${i + 1}: noise: scenario ${sc.id} ${k} change (${v}) is within seed noise but is presented as an effect`); } } });
  record({ role: 'critic', agent: agents.critic || null, provenance: 'deterministic', tool: 'verifier', status: points.length ? (vIssues.length ? 'flagged' : 'passed') : 'skipped', inputs: points.map((_, i) => `point ${i + 1}`), output: { issues: vIssues }, issues: [], ms: 0 });
  const critique = points.length ? await model('critic', SCHEMA.critique, `Analysis to challenge:\n${points.map((p, i) => `${i + 1}. ${p.text} [${p.cites.join(', ')}]`).join('\n')}\nKnown gaps:\n${gapText}\nTask: as a sceptical reviewer, raise at most 3 objections about data, method, causality or equity.`) : null;
  // 6. Synthesis
  const synthesis = points.length ? await model('synthesis', SCHEMA.synthesis, `Question: ${question}\nAnalysis:\n${points.map((p, i) => `${i + 1}. ${p.text} [${p.cites.join(', ')}]`).join('\n')}\nObjections:\n${(critique?.output?.objections || []).map(o => `- (${o.kind}) ${o.text}`).join('\n') || '- none'}\nVerifier issues:\n${vIssues.join('\n') || '- none'}\nFindings ids available: ${[...ids].join(', ')}\nTask: write a careful summary for a decision-maker; list in "established" only finding ids that are established, and in "uncertain" the finding ids or short phrases that remain uncertain.`) : null;
  if (synthesis?.status === 'validated') { const bad = [...synthesis.output.established].filter(x => !ids.has(x)); const sv = verify(synthesis.output.summary, evidence, { requireCitation: false }).issues.map(x => `${x.code} · ${x.detail}`);
    if (bad.length || sv.length) { synthesis.status = 'rejected'; synthesis.issues = [...bad.map(b => `“established” cites unknown id ${b}`), ...sv]; } }
  const modelSteps = steps.filter(s => s.provenance === 'local-model');
  return { question, mission: mission.id, startedAt: new Date(t0).toISOString(), ms: now() - t0, steps,
    runtime: modelSteps.every(s => s.status === 'unavailable') ? 'unavailable' : 'local-model', model: modelSteps.find(s => s.model)?.model || null,
    answer: synthesis?.status === 'validated' ? synthesis.output : null, evidence: evStep.output.findings.map(f => f.id) };
}
