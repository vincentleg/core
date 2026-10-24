// CORE R28 — bounded, supervised execution of a geographic mission by specialised agents. Code, not AI, orchestrates:
// a plan of tasks (one tool each, owned by a recorded agent identity, with dependencies) runs sequentially in this
// browser (or Node), one tool call at a time, inside explicit limits. The engine records every call (inputs, outputs,
// status, resources, SHA-256 digests, real timestamps), types every finding by provenance, keeps agents' findings and
// disagreements separate, and produces an inspectable report whose conclusions stay proposals: accepting them, or
// proposing any external action, is gated on a human review this code cannot grant. No network, storage or DOM here;
// the host supplies loaded resources, an optional local-model function and (for persistence) a Storage object.
import { createRegistry, KINDS, APPROVED_RESOURCES } from './tools.mjs';
import { WORK_FILE } from '../earth/mission-intel.mjs';
import { VERSION, digest } from './saved.mjs';
import { SF_MOBILITY, TYPES, validateSpec } from './missions.mjs';
import { cityForMission } from './city-registry.mjs';
export { VERSION, digest, verifyReport, saveReport, listReports, deleteReport, savedEntries, STORE_KEY, MAX_SAVED, executionClass, investigationRef } from './saved.mjs';

export const LIMITS = Object.freeze({ maxTasks: 10, maxToolCalls: 14, maxRuntimeMs: 240000, maxRecordBytes: 400000, modelTimeoutMs: 120000 });
export const TERMINAL = Object.freeze(['done', 'failed', 'blocked', 'denied', 'unavailable', 'cancelled']);
export const SF_SEGMENT = '5660000';

const SETTLED_OK = t => t.status === 'done' || (t.optional && ['unavailable', 'failed', 'denied'].includes(t.status));
const bytes = v => new TextEncoder().encode(JSON.stringify(v ?? null)).length;
const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };

// Agent identities of the recorded SF investigation, by recorded role (kept for R28 callers).
export function agentsFrom(work) {
  const tasks = work?.run?.tasks || [], pick = role => tasks.find(t => t.role === role)?.agent || null;
  return { context: pick('geography'), discovery: pick('discovery'), evidence: pick('evidence'), scenario: pick('quantitative'), risk: pick('reviewer'), planner: pick('planner'), review: pick('reporter') };
}
// R30: a plan derived from a validated mission specification. `values` are the mission type's bounded inputs;
// `agentIds` (Set) checks explicit identities against the registry; `work` resolves recorded roles.
export function planMission(spec, { work = null, objective, values = {}, assumptions = null, demands, useModel = true, agentIds = null } = {}) {
  if (typeof objective !== 'string' || !objective.trim() || objective.length > 600) throw Error('An explicit objective (1–600 characters) is required');
  const issues = validateSpec(spec, { agentIds }); if (issues.length) throw Error(`Specification rejected: ${issues.join('; ')}`);
  if (spec.status !== 'executable') throw Error(`Mission ${spec.id} is not executable: ${spec.blocker}`);
  const type = TYPES[spec.type];
  for (const [k, v] of Object.entries(values)) { const d = type.inputs.find(i => i.id === k); if (!d) throw Error(`Unknown input ${k} for ${spec.type}`); if (!Number.isFinite(v) || v < d.min || v > d.max || Math.round((v - d.min) / d.step) * d.step + d.min !== v) throw Error(`${k} must be ${d.min}–${d.max} in steps of ${d.step}`); }
  const bound = type.bind(spec, values, { work, assumptions, ...(demands ? { demands } : {}) });
  const agentOf = k => { const a = spec.agents[k]; return a.agent || work?.run?.tasks?.find(t => t.role === a.recordedRole)?.agent || null; };
  const dropped = new Set(useModel ? [] : spec.tasks.filter(t => t.optional).map(t => t.id));
  const tasks = spec.tasks.filter(t => !dropped.has(t.id)).map(t => ({ id: t.id, lane: t.lane, agent: agentOf(t.by), tool: t.tool,
    input: { ...structuredClone(t.input), ...(bound.byTool?.[t.tool] || {}), ...(['reason.hypotheses', 'report.compose'].includes(t.tool) ? { objective: objective.trim() } : {}) },
    deps: t.deps.filter(d => !dropped.has(d)), goal: t.goal, ...(t.optional ? { optional: true } : {}) }));
  const resources = [...new Set(spec.evidence.map(e => e.resource))];
  return { version: VERSION, mission: spec.id, city: cityForMission(spec.id)?.id || null, spec: { id: spec.id, version: spec.version, type: spec.type, category: spec.category, title: spec.title, place: spec.place, evidence: spec.evidence, limitations: spec.limitations, review: spec.review },
    objective: objective.trim(), resources, recordedRun: resources.includes(WORK_FILE) ? work?.run?.id || null : null,
    inputs: type.inputs.map(i => ({ ...i, value: bound.values[i.id] ?? i.default })), note: bound.note, assumptions: bound.assumptions, tasks, limits: { ...LIMITS },
    requirements: (spec.requirements || []).map(q => ({ ...q, evidence: q.evidence || `${spec.id} specification v${spec.version}`, declared: true })) };
}
// The San Francisco mobility plan (R28 signature). `assumptions` are the user's declared simulator inputs, baseline first.
export const planSF = ({ work, objective, assumptions = null, demands, useModel = true, values = {} } = {}) => planMission(SF_MOBILITY, { work, objective, assumptions, demands, useModel, values });
// Static checks before authorization: bounded size, known agents, acyclic dependencies, every tool permitted.
export function checkPlan(plan, registry) {
  const issues = [], ids = new Set(plan?.tasks?.map(t => t.id));
  if (!plan?.tasks?.length) return ['Empty plan'];
  if (plan.tasks.length > (plan.limits?.maxTasks ?? LIMITS.maxTasks)) issues.push(`Plan has ${plan.tasks.length} tasks; limit ${plan.limits.maxTasks}`);
  if (ids.size !== plan.tasks.length) issues.push('Duplicate task ids');
  for (const r of plan.resources || []) if (!APPROVED_RESOURCES.includes(r)) issues.push(`Resource ${r} is not approved`);
  for (const t of plan.tasks) { const d = registry.describe(t.tool);
    if (!d) issues.push(`${t.id}: unknown tool ${t.tool}`); else if (!d.allowed) issues.push(`${t.id}: tool ${t.tool} is denied (${d.permission})`);
    if (!t.agent) issues.push(`${t.id}: no recorded agent fills the ${t.lane} responsibility`);
    for (const d of t.deps) if (!ids.has(d)) issues.push(`${t.id}: unknown dependency ${d}`); }
  const seen = new Set(), visiting = new Set(), byId = new Map(plan.tasks.map(t => [t.id, t]));
  const cyc = id => { if (seen.has(id)) return false; if (visiting.has(id)) return true; visiting.add(id); const c = (byId.get(id)?.deps || []).some(cyc); visiting.delete(id); seen.add(id); return c; };
  if (plan.tasks.some(t => cyc(t.id))) issues.push('Dependency cycle');
  return issues;
}

// host: { resources, generate, clock, onEvent, stepMode, idOf }. Returns a controller; nothing runs before start().
export function createExecution(plan, { resources = {}, hashes = {}, generate = null, clock = () => new Date(), onEvent = () => {}, stepMode = false, idOf = () => crypto.randomUUID() } = {}) {
  const registry = createRegistry({ resources, hashes, generate });
  const issues = checkPlan(plan, registry); if (issues.length) throw Error(`Plan rejected: ${issues.join('; ')}`);
  const limits = { ...LIMITS, ...plan.limits }, iso = () => clock().toISOString(), ms = () => clock().getTime();
  const ex = { id: idOf(), version: VERSION, mode: 'local-execution', mission: plan.mission, objective: plan.objective, recordedRun: plan.recordedRun, plan: structuredClone(plan), limits,
    status: 'planned', createdAt: iso(), startedAt: null, endedAt: null, authorizedAt: null,
    tasks: plan.tasks.map(t => ({ ...structuredClone(t), status: 'queued', startedAt: null, endedAt: null, calls: [], error: null })),
    calls: [], findings: [], requirements: structuredClone(plan.requirements || []).map(q => ({ ...q, raisedBy: 'mission specification', task: null })), disagreements: [], conclusions: [], log: [], reasoning: { status: generate ? 'pending' : 'unavailable', model: null, reason: generate ? null : 'No local model runtime reachable from this page; deterministic tools only.' }, stopReason: null };
  const outputs = {}; let step = stepMode, paused = false, wake = null, ctl = null, t0 = 0, recordBytes = 0;
  const emit = (type, extra = {}) => { const e = { seq: ex.log.length + 1, at: iso(), type, ...extra }; ex.log.push(e); onEvent(e, ex); };
  const board = () => deepFreeze(structuredClone({ findings: ex.findings, requirements: ex.requirements, disagreements: ex.disagreements, conclusions: ex.conclusions, outputs }));
  const overLimit = () => ex.calls.length >= limits.maxToolCalls ? `tool-call limit (${limits.maxToolCalls})` : ms() - t0 > limits.maxRuntimeMs ? `runtime limit (${limits.maxRuntimeMs} ms)` : recordBytes > limits.maxRecordBytes ? `record-size limit (${limits.maxRecordBytes} bytes)` : null;
  const next = () => ex.tasks.find(t => t.status === 'queued' && t.deps.every(d => TERMINAL.includes(ex.tasks.find(x => x.id === d).status)));
  const yieldTurn = () => new Promise(r => setTimeout(r, 0));

  async function runTask(t) {
    const blocking = t.deps.map(d => ex.tasks.find(x => x.id === d)).filter(d => !SETTLED_OK(d));
    if (blocking.length) { t.status = 'blocked'; t.error = `Dependency not satisfied: ${blocking.map(d => `${d.id} ${d.status}`).join(', ')}`; emit('task-blocked', { task: t.id, error: t.error }); return; }
    t.status = 'running'; t.startedAt = iso(); emit('task-started', { task: t.id, agent: t.agent, tool: t.tool });
    let timedOut = false; ctl = new AbortController(); const timer = registry.describe(t.tool).permission === 'local-model' ? setTimeout(() => { timedOut = true; ctl.abort(); }, limits.modelTimeoutMs) : null;
    const began = ms(), r = await registry.call(t.tool, t.input, { board: board(), signal: ctl.signal }); clearTimeout(timer); ctl = null;
    if (timedOut && r.status === 'cancelled') Object.assign(r, { status: 'error', error: `Local model exceeded ${limits.modelTimeoutMs} ms` });
    const call = { seq: ex.calls.length + 1, task: t.id, agent: t.agent, tool: t.tool, permission: r.permission, status: r.status, input: t.input, output: r.output, error: r.error, resources: r.resources,
      startedAt: new Date(began).toISOString(), endedAt: iso(), ms: ms() - began, provenance: { execution: ex.id, engine: VERSION, executor: r.executor || null, mode: 'local-execution' } };
    call.inputDigest = await digest(call.input); call.outputDigest = await digest(call.output);
    ex.calls.push(call); t.calls.push(call.seq); recordBytes += bytes(call);
    if (r.status === 'ok') {
      (outputs[t.tool] ||= []).push(r.output);
      for (const f of r.findings) { if (!KINDS.includes(f.kind)) continue; ex.findings.push({ id: `E${ex.findings.length + 1}`, ...f, origin: f.recorded ? 'recorded-run' : 'this-execution', agent: t.agent, task: t.id, tool: t.tool, call: call.seq, ref: `exec:${ex.id}#call:${call.seq}`, at: call.endedAt }); }
      for (const q of r.requirements) if (!ex.requirements.some(x => x.id === q.id)) ex.requirements.push({ ...q, raisedBy: t.agent, task: t.id });
      const own = new Set(ex.findings.filter(f => f.call === call.seq).map(f => f.id));
      for (const c of r.conclusions) ex.conclusions.push({ text: c.text, basis: ex.findings.filter(f => own.has(f.id) && (!c.basis || f.kind === c.basis)).map(f => f.id), task: t.id, agent: t.agent });
      for (const d of r.disagreements) ex.disagreements.push({ id: `D${ex.disagreements.length + 1}`, ...d, task: t.id, raisedBy: t.agent, resolved: false });
      if (r.reasoning) ex.reasoning = { status: 'active', model: r.reasoning.model, reason: 'Hypotheses drafted by a local model and validated by code (schema, citations, verifier).' };
      t.status = 'done';
    } else {
      t.status = r.status === 'error' ? 'failed' : r.status; t.error = r.error;
      if (registry.describe(t.tool).permission === 'local-model') ex.reasoning = { status: r.status === 'unavailable' ? 'unavailable' : 'failed', model: null, reason: r.error };
    }
    t.endedAt = iso(); emit(`task-${t.status}`, { task: t.id, agent: t.agent, tool: t.tool, call: call.seq, error: t.error });
  }
  async function loop() {
    while (true) {
      if (ex.status === 'cancelled') break;
      if (paused) { ex.status = 'paused'; emit('paused'); await new Promise(r => { wake = r; }); wake = null; if (ex.status === 'cancelled') break; ex.status = 'running'; emit('resumed'); }
      const lim = overLimit(); if (lim) { ex.stopReason = lim; ex.status = 'limit-exceeded'; emit('limit-exceeded', { limit: lim }); break; }
      const t = next(); if (!t) break;
      await runTask(t); await yieldTurn();
      if (step && ex.status === 'running' && next()) paused = true;
    }
    for (const t of ex.tasks) if (t.status === 'queued' || t.status === 'running') { t.status = 'cancelled'; t.error = ex.stopReason || 'Execution stopped'; }
    if (ex.status === 'running') ex.status = ex.tasks.every(t => SETTLED_OK(t)) ? 'completed' : 'completed-with-failures';
    ex.endedAt = iso(); emit('ended', { status: ex.status });
    ex.report = await report(ex); return ex.report;
  }
  let running = null;
  return {
    get state() { return ex; }, registry,
    start() { if (running) return running; ex.status = 'running'; ex.authorizedAt = ex.startedAt = iso(); t0 = ms(); emit('authorized', { by: 'person in this browser', scope: 'bounded local analysis' }); return (running = loop()); },
    pause() { if (ex.status === 'running') { paused = true; emit('pause-requested'); } },
    resume() { if (ex.status === 'paused' || paused) { paused = false; wake?.(); } },
    setStepMode(v) { step = !!v; },
    cancel(reason = 'Cancelled by the person supervising') { if (['completed', 'completed-with-failures', 'cancelled', 'limit-exceeded'].includes(ex.status)) return; ex.stopReason = reason; ex.status = 'cancelled'; emit('cancel-requested', { reason }); ctl?.abort(); paused = false; wake?.(); },
    // Recovery: requeue failed tasks and everything blocked or cancelled behind them, then run again.
    async retry() { if (!['completed-with-failures', 'cancelled', 'limit-exceeded'].includes(ex.status)) return ex.report;
      for (const t of ex.tasks) if (['failed', 'blocked', 'cancelled'].includes(t.status)) { t.status = 'queued'; t.error = null; }
      ex.status = 'running'; ex.stopReason = null; t0 = ms(); emit('retry'); running = loop(); return running; }
  };
}

// The report: inspectable, typed, linked to the recorded run it read, and never accepted by code.
export async function report(ex) {
  const composed = ex.calls.filter(c => c.tool === 'report.compose' && c.status === 'ok').at(-1)?.output || null;
  const r = { kind: 'core-investigation-report', version: VERSION, mode: 'local-execution', execution: ex.id, mission: ex.mission, spec: ex.plan.spec ? { id: ex.plan.spec.id, version: ex.plan.spec.version, type: ex.plan.spec.type, category: ex.plan.spec.category, place: ex.plan.spec.place.label, limitations: ex.plan.spec.limitations, review: ex.plan.spec.review } : null, objective: ex.objective, status: ex.status, complete: ex.status === 'completed' && !!composed,
    createdAt: ex.createdAt, authorizedAt: ex.authorizedAt, startedAt: ex.startedAt, endedAt: ex.endedAt, stopReason: ex.stopReason,
    reads: { recordedRun: ex.recordedRun, resources: [...new Set(ex.calls.flatMap(c => c.resources))] },
    reasoning: ex.reasoning, limits: ex.limits,
    agents: [...new Set(ex.tasks.map(t => t.agent))].map(a => ({ agent: a, tasks: ex.tasks.filter(t => t.agent === a).map(t => ({ id: t.id, tool: t.tool, status: t.status })), findings: ex.findings.filter(f => f.agent === a).map(f => f.id) })),
    tasks: ex.tasks.map(({ id, lane, agent, tool, deps, status, startedAt, endedAt, calls, error, goal, optional }) => ({ id, lane, agent, tool, deps, status, startedAt, endedAt, calls, error, goal, optional: !!optional })),
    calls: ex.calls, findings: ex.findings, findingsByKind: Object.fromEntries(KINDS.map(k => [k, { thisExecution: ex.findings.filter(f => f.kind === k && f.origin === 'this-execution').length, recordedRun: ex.findings.filter(f => f.kind === k && f.origin === 'recorded-run').length }])),
    disagreements: ex.disagreements, requirements: ex.requirements,
    conclusions: composed?.conclusions || [],
    review: { status: 'awaiting-human-review', accepted: false, decidedBy: null, note: 'Code cannot accept conclusions. A person reviews this report outside the engine.' },
    externalActions: { allowed: false, proposed: [], reason: 'Bounded local analysis only. Any external action needs human review and authorization; none is proposed by code.' },
    log: ex.log };
  r.digest = await digest(r); return r;
}
// Human-review gate. This phase has no path that sets an approval, so everything beyond local analysis is refused.
export function gate(rep, action) {
  const known = ['accept-conclusions', 'propose-external-action', 'publish', 'share'];
  if (!known.includes(action)) return { allowed: false, reason: `Unknown action ${action}: denied by default` };
  if (rep?.review?.accepted === true && rep.review.decidedBy && rep.review.status === 'approved-by-human') return { allowed: action === 'accept-conclusions', reason: action === 'accept-conclusions' ? 'Accepted by a recorded human decision' : 'External steps need separate human authorization' };
  return { allowed: false, reason: 'Human review required: this report is awaiting review and its conclusions are proposals.' };
}
// What each agent did in an execution, linked to the recorded run it read.
export const memoryOf = (rep, agent) => { const a = rep.agents.find(x => x.agent === agent); return a ? { agent, execution: rep.execution, at: rep.endedAt, tasks: a.tasks, findings: a.findings, recordedRun: rep.reads.recordedRun, source: 'local-execution' } : null; };
