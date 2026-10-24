// CORE R27 — mission intelligence over recorded work. A deterministic orchestration written in code, not AI reasoning:
// it reads the published local-model investigation (data/intelligence/work.json) and the calibration-readiness
// checklist (src/urban/tasks.mjs), assigns each recorded task to a responsibility, types every finding and claim by
// provenance, derives dependencies from citations, detects conflicts the records themselves support, and lists open
// questions and candidate next actions. It never runs an agent, invents a finding, computes consensus or a vote,
// changes a recorded claim, or approves anything: human review stays mandatory. Pure: no DOM, storage or network.
export const WORK_FILE = 'data/intelligence/work.json', READINESS_SOURCE = 'src/urban/tasks.mjs · calibrationReadiness';
export const MISSION = 'mission.sf.mobility';
// Responsibilities for the San Francisco mobility mission, filled by the recorded roles of existing agent identities.
export const LANES = Object.freeze([
  { id: 'context', roles: ['geography'] },
  { id: 'evidence', roles: ['discovery', 'evidence'] },
  { id: 'scenario', roles: ['quantitative'] },
  { id: 'risk', roles: ['reviewer'] },
  { id: 'review', roles: ['planner', 'reporter'] }
]);
// Which responsibility would act on each open calibration-readiness item.
const READINESS_LANE = { geometry: 'context', spatial: 'context', measurements: 'evidence', temporal: 'evidence', authorization: 'evidence', calibration: 'scenario', holdout: 'scenario', review: 'review' };
// Provenance classes. Every recorded claim is a model-generated hypothesis; checks below say what the records support.
export const KINDS = Object.freeze(['source', 'observation', 'computed', 'hypothesis', 'user', 'missing']);
export const STATUS = Object.freeze(['recorded', 'blocked', 'awaiting-human']);
const norm = s => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const cut = (s, n = 200) => { s = String(s ?? ''); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };

function classifyFinding(f, checked) {
  const o = f.output || {}, base = { id: f.id, ref: `${WORK_FILE}#${f.id}`, agent: f.agent, task: f.task, tool: f.tool, at: f.at || null };
  if (f.tool === 'retrieve_source') return { ...base, kind: 'source', checked: checked.has(f.id), source: { publisher: o.publisher, url: o.url, license: o.license?.name || null, retrieved: o.retrieved || null, sha256: o.sha256 || null }, summary: `${o.source}: ${o.coverage || ''}`.trim(), limits: o.limitations || null };
  if (f.tool === 'geographic_context') { const b = o.boundarySource || {};
    return { ...base, kind: 'source', checked: checked.has(f.id), source: { publisher: b.publisher, url: b.url, license: b.license || null, retrieved: b.retrieved || null, sha256: null }, summary: `${(o.municipalities || []).length} municipal boundaries; ${(o.mappedApproaches || []).length} mapped approaches (${[...new Set((o.mappedApproaches || []).map(a => a.source))].join(', ')})`, limits: [b.limitations, o.simulationScope].filter(Boolean).join(' ') }; }
  if (f.tool === 'discover_sources') return { ...base, kind: 'observation', summary: `Catalog search listed ${(o.sources || []).length} source(s): ${(o.sources || []).map(s => s.id).join(', ')}`, limits: 'A catalog listing; it cannot establish that evidence outside the catalog is absent.' };
  if (f.tool === 'validate_evidence') return { ...base, kind: 'observation', summary: `Checked ${(o.checked || []).map(c => `${c.id} (provenance ${c.provenanceComplete ? 'complete' : 'incomplete'})`).join(', ')}; missing: ${(o.missing || []).join(', ')}`, limits: o.meaning || null, missing: o.missing || [] };
  if (f.tool === 'calculate_scenarios') { const rows = o.result?.rows || [];
    return { ...base, kind: 'computed', calibrated: o.calibrated === true, model: o.model, segment: o.segment, summary: rows.map(r => `${r.name}: delay ${r.metrics.accruedDelayPerArrivalS.toFixed(1)} s/arrival, throughput ${Math.round(r.metrics.throughputVph)} veh/h`).join(' · '), limits: [o.inputs, [].concat(o.limits || []).join(' '), o.impact].filter(Boolean).join(' '), rows }; }
  return { ...base, kind: 'observation', summary: f.tool || 'recorded tool output', limits: null };
}
// Numbers a claim states, compared with the values the cited computation actually produced (rounded to 0.5).
function checkNumbers(text, computed) {
  if (!computed) return null;
  const row = computed.rows.at(-1), base = computed.rows[0];
  if (!row || !base) return null;
  const known = [Math.abs(row.delta.accruedDelayS), Math.abs(row.delta.throughputVph), Math.abs(row.delta.maxQueue), Math.abs(row.parameters.green - base.parameters.green) * 100];
  const stated = (String(text).match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(n => String(n) !== String(computed.segment));
  if (!stated.length) return null;
  const matched = stated.filter(n => known.some(k => Math.abs(k - n) <= 0.5));
  return { stated, matched, unmatched: stated.filter(n => !matched.includes(n)) };
}

// `work`: the parsed published record; `readiness`: calibrationReadiness(...) for the modelled segment, or null when the
// catalog could not be loaded (readiness-derived items are then reported unavailable, never assumed met).
export function buildMission({ work, readiness = null } = {}) {
  const run = work?.run; if (!run?.tasks?.length) return null;
  const log = [], step = (id, detail) => log.push({ step: log.length + 1, id, detail });
  step('load', `Read run ${run.id} from ${WORK_FILE} (recorded ${work.recorded}; ${work.availability}).`);
  const taskIndex = new Map(run.tasks.map((t, i) => [t.id, i]));
  const laneOf = role => LANES.find(l => l.roles.includes(role))?.id || null;
  // Findings, with provenance checks recorded by validate_evidence.
  const checked = new Set((run.findings || []).filter(f => f.tool === 'validate_evidence').flatMap(f => (f.output?.checked || []).filter(c => c.provenanceComplete).map(c => c.id)));
  const findings = (run.findings || []).map(f => ({ ...classifyFinding(f, checked), lane: laneOf(run.tasks[taskIndex.get(f.task)]?.role), step: taskIndex.get(f.task) }));
  const byFinding = new Map(findings.map(f => [f.id, f]));
  step('findings', `Indexed ${findings.length} findings: ${KINDS.map(k => [k, findings.filter(f => f.kind === k).length]).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ')}. Provenance checked by a recorded validation: ${[...checked].join(', ') || 'none'}.`);
  // Location evidence: mapped approaches and the municipality that publishes their source.
  const geo = (run.findings || []).find(f => f.tool === 'geographic_context')?.output, approaches = new Map((geo?.mappedApproaches || []).map(a => [a.id, a]));
  const towns = (geo?.municipalities || []).map(m => m.name);
  const sourcePlace = src => { const pub = (run.findings || []).flatMap(f => [f.output, ...(f.output?.sources || [])]).find(o => o?.id === src || o?.source === src)?.publisher || ''; return towns.find(t => pub.includes(t)) || null; };
  const computed = findings.find(f => f.kind === 'computed') || null;
  // Claims: one entry per recorded statement, never edited; identical statements are grouped, not counted as agreement.
  const flags = new Map((work.narrativeFlags || []).map(f => [norm(f.text), f.reason]));
  const claims = [], conflicts = [];
  run.tasks.forEach((t, i) => (t.output?.claims || []).forEach((c, j) => {
    const refs = (c.cites || []).map(id => byFinding.get(id)).filter(Boolean), basis = [...new Set(refs.map(f => f.kind))];
    const claim = { id: `T${i}.C${j}`, ref: `${WORK_FILE}#task:${i}/claim:${j}`, agent: t.agent, lane: laneOf(t.role), step: i, text: c.text, cites: c.cites || [], kind: 'hypothesis', basis, status: refs.length ? 'cited' : 'uncited', notes: [] };
    const flag = flags.get(norm(c.text)); if (flag) { claim.status = 'unverified'; claim.notes.push(flag); }
    for (const [sid, a] of approaches) if (c.text.includes(sid)) { const placed = towns.find(n => new RegExp(`\\bin ${n}\\b`).test(c.text)), real = sourcePlace(a.source);
      if (placed && real && placed !== real) { claim.status = 'contradicted'; claim.notes.push(`${sid} (${a.label}) is a mapped approach from ${a.source}, published by ${real}.`);
        conflicts.push({ id: `X${conflicts.length + 1}`, kind: 'location', subject: sid, positions: [{ ref: claim.id, agent: t.agent, says: `${sid} is in ${placed}` }, { ref: geo ? (run.findings.find(f => f.tool === 'geographic_context').id) : null, agent: null, says: `${sid} is mapped in ${real} (${a.source})` }], standing: 'recorded evidence contradicts the claim', resolved: false }); } }
    if (refs.some(f => f.kind === 'computed') && claim.status === 'cited') { const n = checkNumbers(c.text, computed); if (n) { claim.numbers = n; if (n.unmatched.length) { claim.status = 'unverified'; claim.notes.push(`Stated numbers ${n.unmatched.join(', ')} do not match ${computed.id}.`); } } }
    claims.push(claim);
  }));
  const groups = new Map(); for (const c of claims) { const k = norm(c.text); groups.set(k, [...(groups.get(k) || []), c]); }
  for (const c of claims) c.statedBy = [...new Set(groups.get(norm(c.text)).map(x => x.agent))];
  for (const [text, reason] of flags) { const same = claims.filter(c => norm(c.text) === text); if (same.length) conflicts.push({ id: `X${conflicts.length + 1}`, kind: 'verification', subject: same[0].id, positions: [{ ref: same[0].id, agent: same[0].agent, says: cut(same[0].text, 160) }, { ref: `${WORK_FILE}#narrativeFlags`, agent: null, says: reason }], standing: 'recorded verification flags the claim as unsupported', resolved: false }); }
  const counts = Object.fromEntries(['cited', 'uncited', 'unverified', 'contradicted'].map(s => [s, claims.filter(c => c.status === s).length]));
  step('claims', `Read ${claims.length} recorded claims (${groups.size} distinct texts). Status: ${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', ')}. Every claim stays a model-generated hypothesis; identical texts from agents sharing one model run are grouped and not treated as independent corroboration.`);
  const numbered = claims.filter(c => c.numbers);
  if (numbered.length) step('numbers', `Compared numbers in ${numbered.length} claims citing ${computed.id} with its computed rows: ${numbered.filter(c => !c.numbers.unmatched.length).length} match within 0.5.`);
  // Next steps the agents proposed: a real-world pilot versus "evidence before any intervention", with the calibration gate.
  const outstanding = readiness ? readiness.checklist.filter(x => x.status !== 'met') : null;
  const proposals = run.tasks.map((t, i) => ({ i, t, next: t.output?.next || '' }));
  const pilots = proposals.filter(p => /\bpilot\b/i.test(p.next)), cautious = proposals.filter(p => !/\bpilot\b/i.test(p.next) && /\bbefore\b/i.test(p.next));
  if (pilots.length && (outstanding?.length || cautious.length)) conflicts.push({ id: `X${conflicts.length + 1}`, kind: 'next-step', subject: 'next', positions: [...pilots.map(p => ({ ref: `T${p.i}.next`, agent: p.t.agent, says: p.next })), ...cautious.map(p => ({ ref: `T${p.i}.next`, agent: p.t.agent, says: p.next })), ...(outstanding ? [{ ref: 'readiness', agent: null, says: `${outstanding.length} of ${readiness.checklist.length} calibration-readiness items are not met.` }] : [])], standing: 'agents disagree on the next step; the calibration gate is open', resolved: false });
  step('conflicts', `Detected ${conflicts.length} conflict(s) supported by the records (${conflicts.map(c => c.kind).join(', ') || 'none'}). None is resolved by code; people decide.`);
  // Responsibilities: owners, recorded steps, findings produced and cited; dependencies derived from citations.
  const lanes = LANES.map(l => {
    const steps = run.tasks.map((t, i) => ({ t, i })).filter(x => l.roles.includes(x.t.role));
    const produced = findings.filter(f => f.lane === l.id).map(f => f.id);
    const cites = [...new Set(steps.flatMap(x => (x.t.output?.claims || []).flatMap(c => c.cites || [])))];
    const dependsOn = [...new Set(cites.map(id => byFinding.get(id)?.lane).filter(d => d && d !== l.id))];
    return { id: l.id, owners: [...new Set(steps.map(x => x.t.agent))], steps: steps.map(x => ({ ref: `T${x.i}`, role: x.t.role, agent: x.t.agent, status: x.t.status, started: x.t.started || null, completed: x.t.completed || null })), produced, cites, dependsOn };
  });
  step('lanes', `Mapped ${run.tasks.length} recorded tasks to ${lanes.length} responsibilities by recorded role; dependencies derived from which findings each responsibility's claims cite.`);
  // Open questions: readiness items not met, recorded gaps and recorded uncertainty statements.
  const questions = [];
  if (outstanding) for (const x of outstanding) questions.push({ id: `R:${x.id}`, kind: 'missing', lane: READINESS_LANE[x.id] || 'review', text: x.label, detail: x.next || null, status: x.status, source: `${READINESS_SOURCE} · ${x.evidence}` });
  const gaps = [...new Set(findings.flatMap(f => f.missing || []))];
  gaps.forEach((g, k) => questions.push({ id: `G${k + 1}`, kind: 'missing', lane: 'evidence', text: g, detail: null, status: 'missing', source: `${findings.filter(f => f.missing?.includes(g)).map(f => f.id).join(', ')} (recorded validation)` }));
  const seenU = new Set();
  run.tasks.forEach((t, i) => (t.output?.uncertainty || []).forEach((u, j) => { if (seenU.has(norm(u))) return; seenU.add(norm(u)); questions.push({ id: `U${i}.${j}`, kind: 'hypothesis', lane: laneOf(t.role), text: u, detail: null, status: 'open', source: `${WORK_FILE}#task:${i}/uncertainty:${j} (model-generated)` }); }));
  // Candidate next actions: from readiness (blocked on authorized data or awaiting a human), never executed by code.
  const actions = (outstanding || []).map(x => ({ id: `A:${x.id}`, lane: READINESS_LANE[x.id] || 'review', question: `R:${x.id}`, text: x.next, status: x.id === 'review' ? 'awaiting-human' : 'blocked', why: x.evidence, source: READINESS_SOURCE }));
  for (const l of lanes) { const mine = actions.filter(a => a.lane === l.id), open = conflicts.some(c => c.positions.some(p => l.owners.includes(p.agent)));
    l.status = mine.some(a => a.status === 'blocked') ? 'blocked' : mine.length || (l.id === 'risk' && conflicts.length) || open ? 'awaiting-human' : 'recorded'; }
  step('actions', readiness ? `Derived ${actions.length} candidate next actions from calibration readiness (${['met', 'missing', 'unverified'].map(s => `${readiness.checklist.filter(x => x.status === s).length} ${s}`).join(', ')}): ${actions.filter(a => a.status === 'blocked').length} blocked on authorized data, ${actions.filter(a => a.status === 'awaiting-human').length} awaiting a human.` : 'Calibration readiness unavailable (catalog not loaded): no readiness-derived action is listed and none is assumed met.');
  step('review', `No consensus, vote, approval or real-world authorization computed. Recorded human review: ${work.humanReview || 'not recorded'}.`);
  const question = run.question || '';
  return {
    mission: MISSION, run: { id: run.id, question, created: run.created, completed: run.completed, recorded: work.recorded, provider: work.provider ? `${work.provider.id}/${work.provider.model}` : null, availability: work.availability, verification: work.verification || null, humanReview: work.humanReview || null },
    segment: computed?.segment ? { id: computed.segment, ...(approaches.get(computed.segment) || {}), place: sourcePlace(approaches.get(computed.segment)?.source) } : null,
    readiness: readiness ? { met: readiness.checklist.filter(x => x.status === 'met').length, total: readiness.checklist.length, calibrated: readiness.calibrated === true } : null,
    lanes, findings, claims, conflicts, questions, actions, log,
    executing: false, approved: false
  };
}
export const laneOf = (ctx, agent) => ctx?.lanes.find(l => l.owners.includes(agent)) || null;
// What an agent previously examined, from recorded steps and events only; `current` is never execution here.
export function memory(ctx, work, agent) {
  const lane = laneOf(ctx, agent); if (!lane) return null;
  const tasks = work.run.tasks.map((t, i) => ({ t, i })).filter(x => x.t.agent === agent);
  const events = (work.events || []).filter(e => e.agent === agent && ['tool_completed', 'tool_rejected', 'delegation'].includes(e.kind)).map(e => ({ ref: `${WORK_FILE}#event:${e.id}`, kind: e.kind, tool: e.tool || null, at: e.at || null }));
  return {
    agent, lane: lane.id, current: 'not executing',
    history: tasks.map(({ t, i }) => ({ ref: `${WORK_FILE}#task:${i}`, role: t.role, goal: t.goal || null, status: t.status, started: t.started || null, completed: t.completed || null, proposedNext: t.output?.next || null })),
    events, findings: ctx.findings.filter(f => f.agent === agent).map(f => f.id),
    questions: ctx.questions.filter(q => q.lane === lane.id).map(q => q.id),
    next: ctx.actions.find(a => a.lane === lane.id && a.status === 'blocked') || ctx.actions.find(a => a.lane === lane.id) || null
  };
}
// Mission items a person can respond to. The link is a snapshot of public record text taken when the contribution is
// written; it says what the contribution addresses, never that an agent analysed it.
export function linkTarget(ctx, ref) {
  if (!ctx || typeof ref !== 'string') return null;
  const f = ctx.findings.find(x => x.id === ref), c = ctx.claims.find(x => x.id === ref), x = ctx.conflicts.find(y => y.id === ref), q = ctx.questions.find(y => y.id === ref), a = ctx.actions.find(y => y.id === ref);
  const hit = f ? { kind: 'finding', lane: f.lane, text: f.summary } : c ? { kind: 'claim', lane: c.lane, text: c.text } : x ? { kind: 'conflict', lane: 'risk', text: x.positions.map(p => p.says).join(' / ') } : q ? { kind: 'question', lane: q.lane, text: q.detail ? `${q.text}: ${q.detail}` : q.text } : a ? { kind: 'action', lane: a.lane, text: a.text } : null;
  if (!hit) return null;
  return { mission: ctx.mission, ref, kind: hit.kind, lane: hit.lane, owners: ctx.lanes.find(l => l.id === hit.lane)?.owners || [], text: cut(hit.text), run: ctx.run.id, analysedByAgents: false };
}
// Accepts only a well-formed link snapshot (bounded strings); anything else is dropped.
export function cleanLink(v) {
  const s = (x, n) => typeof x === 'string' && x.length <= n ? x : null;
  if (!v || typeof v !== 'object' || !s(v.mission, 80) || !s(v.ref, 40) || !['finding', 'claim', 'conflict', 'question', 'action'].includes(v.kind)) return null;
  return { mission: v.mission, ref: v.ref, kind: v.kind, lane: s(v.lane, 20), owners: Array.isArray(v.owners) ? v.owners.filter(o => s(o, 80)).slice(0, 4) : [], text: s(v.text, 200) || '', run: s(v.run, 80), analysedByAgents: false };
}
