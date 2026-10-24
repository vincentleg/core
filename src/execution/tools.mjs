// CORE R28 — strict tool registry for supervised agent execution. A tool is a pure handler over approved, already
// loaded bundled resources; it has no fetch, storage, DOM, shell or file-system access. Permissions are explicit:
// everything not listed as allowed is denied, and a denied or unknown tool is recorded as such, never run.
// The only non-deterministic tool (reason.hypotheses) calls an injected local-model function; without one, it reports
// "unavailable" and nothing replaces it. Every call returns a record of inputs, outputs, status, resources read and
// provenance; the engine (engine.mjs) stamps time, digests and agent identity.
import { compare, VERSION as SIM_VERSION, REFERENCE as SIM_REFERENCE } from '../urban/model.mjs';
import { calibrationReadiness, modelSource } from '../urban/tasks.mjs';
import { buildMission, WORK_FILE } from '../earth/mission-intel.mjs';
import { checkSchema } from '../intelligence/pool.mjs';
import { verify } from '../intelligence/verifier.mjs';

export const CATALOG_FILE = 'data/urban/catalog.json';
// Bundled, published resources a tool may read. Nothing else is reachable (no private, local or network path).
export const APPROVED_RESOURCES = Object.freeze([CATALOG_FILE, WORK_FILE]);
export const PERMISSIONS = Object.freeze({
  'read-bundled': { allowed: true, label: 'Read authorized bundled geographic data' },
  'read-records': { allowed: true, label: 'Inspect recorded investigations' },
  'compute-local': { allowed: true, label: 'Run the exploratory simulator in this browser' },
  compare: { allowed: true, label: 'Compare evidence and assumptions' },
  'report-local': { allowed: true, label: 'Produce a local investigation report' },
  'local-model': { allowed: 'conditional', label: 'Draft hypotheses with a local model on this computer, if one runs' },
  network: { allowed: false, label: 'Unapproved network access' },
  shell: { allowed: false, label: 'Arbitrary shell commands' },
  filesystem: { allowed: false, label: 'File-system access outside approved resources' },
  communication: { allowed: false, label: 'External communications' },
  publish: { allowed: false, label: 'Changes to public scientific records' },
  'real-world': { allowed: false, label: 'Real-world actions' }
});
// Provenance classes of everything an execution produces. Recorded model claims are hypotheses at best.
export const KINDS = Object.freeze(['source-evidence', 'recorded-observation', 'user-assumption', 'computed-output', 'model-hypothesis', 'unverified-claim']);
export const MAX_SWEEP = 9;

const r1 = x => Math.round(x * 10) / 10;
const segmentOf = (catalog, id) => catalog?.segments?.find(s => s.id === id) || null;
const fail = msg => { throw Error(msg); };

// Each handler: (input, { read, board, generate, signal }) → { output, findings?, requirements?, disagreements?, reasoning? }.
// `board` is the read-only shared evidence: prior findings and task outputs (frozen by the engine).
const TOOLS = {
  'geo.segment': { permission: 'read-bundled', reads: [CATALOG_FILE], title: 'Read the mapped approach and its source authorization',
    run({ segment }, { read }) {
      const catalog = read(CATALOG_FILE), s = segmentOf(catalog, segment) || fail(`Unknown mapped approach ${segment}`);
      const src = modelSource(catalog, s) || fail('Dataset reuse authorization unverified; the simulator is blocked for this approach');
      return { output: { segment: s.id, label: s.label, lengthM: s.lengthM, center: s.center, source: { id: src.id, url: src.url, license: src.license.name, retrieved: src.retrieved, sha256: src.sha256 } },
        findings: [{ kind: 'source-evidence', text: `${s.label}: mapped approach ${s.id}, ${r1(s.lengthM)} m, from ${src.id} (${src.license.name}, retrieved ${src.retrieved}, SHA-256 ${src.sha256.slice(0, 12)}…).`, refs: [`${CATALOG_FILE}#segment:${s.id}`, src.url], uncertainty: 'Geometry only: no traffic count, signal timing or current congestion comes with it.' }] };
    } },
  'records.inspect': { permission: 'read-records', reads: [WORK_FILE, CATALOG_FILE], title: 'Inspect the recorded investigation of this mission',
    run({ segment }, { read }) {
      const work = read(WORK_FILE), catalog = read(CATALOG_FILE), ctx = buildMission({ work, readiness: calibrationReadiness(catalog, segmentOf(catalog, segment)) }) || fail('Recorded investigation unreadable');
      const findings = ctx.findings.filter(f => f.kind === 'source').map(f => ({ kind: 'source-evidence', text: `Recorded ${f.id}: ${f.summary}`, refs: [f.ref, ...(f.source?.url ? [f.source.url] : [])], uncertainty: f.checked ? 'Provenance checked by the recorded validation step.' : 'Provenance not checked by the recorded validation step.', recorded: true }));
      findings.push(...ctx.findings.filter(f => f.kind === 'observation' || f.kind === 'computed').map(f => ({ kind: 'recorded-observation', text: `Recorded ${f.id} (${f.tool}, run ${ctx.run.id.slice(0, 8)}): ${f.summary}`, refs: [f.ref], uncertainty: f.kind === 'computed' ? 'A recorded computation, not a measurement; re-checked below.' : f.limits, recorded: true })));
      // Recorded claims are model-generated text from a past run: hypotheses when cited and unflagged, otherwise unverified.
      for (const c of ctx.claims) findings.push({ kind: c.status === 'cited' ? 'model-hypothesis' : 'unverified-claim', text: `Recorded claim ${c.id} (${c.status}): ${c.text}`, refs: [c.ref, ...c.cites.map(id => `${WORK_FILE}#${id}`)], uncertainty: c.notes.join(' ') || 'Written by a language model in a recorded run; not checked against observations.', recorded: true });
      return { output: { run: ctx.run.id, recorded: ctx.run.recorded, claims: ctx.claims.length, conflicts: ctx.conflicts.map(x => ({ id: x.id, kind: x.kind, standing: x.standing })), questions: ctx.questions.map(q => ({ id: q.id, text: q.text, status: q.status })), computed: ctx.findings.find(f => f.kind === 'computed')?.id || null },
        findings, disagreements: ctx.conflicts.map(x => ({ subject: `${x.kind}: ${x.subject}`, positions: x.positions.map(p => ({ agent: p.agent, ref: p.ref, says: p.says })), standing: `${x.standing} (recorded run)`, recorded: true })) };
    } },
  'evidence.readiness': { permission: 'read-bundled', reads: [CATALOG_FILE], title: 'Check calibration readiness of the simulator for this approach',
    run({ segment }, { read }) {
      const catalog = read(CATALOG_FILE), r = calibrationReadiness(catalog, segmentOf(catalog, segment) || fail(`Unknown mapped approach ${segment}`));
      return { output: { met: r.checklist.filter(x => x.status === 'met').map(x => x.id), outstanding: r.outstanding?.length ?? r.checklist.filter(x => x.status !== 'met').length, calibrated: r.calibrated, predictiveAccuracyValidated: r.predictiveAccuracyValidated },
        findings: r.checklist.filter(x => x.status === 'met').map(x => ({ kind: 'source-evidence', text: `Readiness met: ${x.label}.`, refs: ['src/urban/tasks.mjs#calibrationReadiness'], uncertainty: x.evidence })),
        requirements: r.checklist.filter(x => x.status !== 'met').map(x => ({ id: x.id, label: x.label, status: x.status, evidence: x.evidence, next: x.next })) };
    } },
  'sim.compare': { permission: 'compute-local', reads: [CATALOG_FILE], title: 'Run the exploratory transport simulator on declared assumptions',
    run({ segment, scenarios }, { read }) {
      const catalog = read(CATALOG_FILE), s = segmentOf(catalog, segment) || fail(`Unknown mapped approach ${segment}`);
      if (!modelSource(catalog, s)) fail('Dataset reuse authorization unverified; simulator blocked');
      const result = compare({ scenarios }, s), base = result.rows[0];
      return { output: { model: SIM_VERSION, reference: SIM_REFERENCE, segment: s.id, result, calibrated: false },
        findings: [
          ...scenarios.map(x => ({ kind: 'user-assumption', text: `Assumed for “${x.name}”: demand ${x.parameters.demand} veh/h, ${x.parameters.lanes} lanes, saturation ${x.parameters.saturation} veh/h/lane, green ${Math.round(x.parameters.green * 100)} % of a ${x.parameters.cycle} s cycle, ${x.parameters.seconds} s horizon.`, refs: ['plan:assumptions'], uncertainty: 'Declared assumption; no observed count or signal timing supports it.' })),
          ...result.rows.map(r => ({ kind: 'computed-output', text: `${r.name}: modelled delay ${r1(r.metrics.accruedDelayPerArrivalS)} s per arrival, throughput ${Math.round(r.metrics.throughputVph)} veh/h, max queue ${r1(r.metrics.maxQueue)} veh${r.index ? ` (${r.delta.accruedDelayS >= 0 ? '+' : ''}${r1(r.delta.accruedDelayS)} s vs ${base.name})` : ''}; demand ×0.8/×1.2 gives ${r.sensitivityDelayS.map(r1).join(' / ')} s.`, refs: [`${SIM_VERSION}#${s.id}`], uncertainty: 'Uncalibrated fluid queue at one approach: no turns, spillback, transit or pedestrians.', metric: { name: r.name, delayS: r.metrics.accruedDelayPerArrivalS, deltaS: r.delta.accruedDelayS } }))
        ] };
    } },
  'sim.sweep': { permission: 'compute-local', reads: [CATALOG_FILE], title: 'Test how the modelled effect depends on unobserved demand',
    run({ segment, baseline, variant, demands }, { read }) {
      const catalog = read(CATALOG_FILE), s = segmentOf(catalog, segment) || fail(`Unknown mapped approach ${segment}`);
      if (!modelSource(catalog, s)) fail('Dataset reuse authorization unverified; simulator blocked');
      if (!Array.isArray(demands) || !demands.length || demands.length > MAX_SWEEP) fail(`Sweep 1–${MAX_SWEEP} demand levels`);
      const rows = demands.map(d => { const r = compare({ scenarios: [{ name: 'baseline', parameters: { ...baseline, demand: d } }, { name: 'variant', parameters: { ...variant, demand: d } }] }, s).rows;
        return { demand: d, baselineDelayS: r[0].metrics.accruedDelayPerArrivalS, variantDelayS: r[1].metrics.accruedDelayPerArrivalS, deltaS: r[1].delta.accruedDelayS, baselineUtilization: r[0].metrics.utilization, storageExceeded: r.some(x => x.metrics.exceedsApproxStorage) }; });
      const d = rows.map(r => r.deltaS), lo = Math.min(...d), hi = Math.max(...d);
      return { output: { model: SIM_VERSION, segment: s.id, rows, range: [lo, hi] },
        findings: [{ kind: 'computed-output', text: `Across assumed demand ${demands[0]}–${demands.at(-1)} veh/h, the variant changes modelled delay by ${r1(lo)} to ${r1(hi)} s per arrival; baseline utilization ${rows[0].baselineUtilization.toFixed(2)}–${rows.at(-1).baselineUtilization.toFixed(2)}${rows.some(r => r.storageExceeded) ? '; approximate storage exceeded at some levels' : ''}.`, refs: [`${SIM_VERSION}#${s.id}`], uncertainty: 'The size of the modelled effect depends on demand, which no authorized count measures.', metric: { range: [lo, hi] } }] };
    } },
  'evidence.compare': { permission: 'compare', reads: [WORK_FILE, CATALOG_FILE], title: 'Compare computed outputs with recorded claims, assumptions and readiness',
    run({ segment }, { read, board }) {
      const work = read(WORK_FILE), catalog = read(CATALOG_FILE), s = segmentOf(catalog, segment) || fail(`Unknown mapped approach ${segment}`);
      const rec = work.run.findings.find(f => f.tool === 'calculate_scenarios'), findings = [], disagreements = [];
      // 1. Reproduce the recorded computation with the current simulator; a mismatch is reported, never smoothed over.
      let reproduced = null;
      if (rec?.output?.request && rec.output.segment === s.id) {
        const again = compare(rec.output.request, s).rows.map(r => r.metrics.accruedDelayPerArrivalS), was = rec.output.result.rows.map(r => r.metrics.accruedDelayPerArrivalS);
        reproduced = again.length === was.length && again.every((v, i) => Math.abs(v - was[i]) < 1e-9);
        findings.push({ kind: 'computed-output', text: `Recomputed recorded ${rec.id} with ${SIM_VERSION}: ${reproduced ? 'identical' : 'different'} delays (${again.map(r1).join(', ')} s vs recorded ${was.map(r1).join(', ')} s).`, refs: [`${WORK_FILE}#${rec.id}`], uncertainty: 'Reproduction checks the computation, not its realism.' });
      }
      // 2. Every simulator input is an assumption unless an observed source supports it; readiness says none does yet.
      const req = board.requirements, missingObs = req.some(x => x.id === 'measurements' && x.status !== 'met'), uncal = req.some(x => x.id === 'calibration' && x.status !== 'met');
      const cmp = board.outputs['sim.compare']?.at(-1), sweep = board.outputs['sim.sweep']?.at(-1);
      if (cmp) { const best = cmp.result.best, row = best != null ? cmp.result.rows[best] : null;
        const sa = board.findings.find(f => f.tool === 'sim.compare' && f.kind === 'computed-output' && f.metric?.name === row?.name);
        if (row && (missingObs || uncal)) disagreements.push({ subject: 'Is the lower modelled delay evidence for a real-world change?', positions: [
          { agent: sa?.agent || null, ref: sa?.id || null, says: `Under the declared assumptions “${row.name}” has the lowest modelled delay (${cmp.result.verdict}).` },
          { agent: null, ref: 'readiness', says: `${[missingObs && 'No observed traffic measurements', uncal && 'no calibration dataset'].filter(Boolean).join('; ')}: the model's ranking is not evidence of a real effect.` }], standing: 'unresolved: needs authorized measurements, calibration and human review' }); }
      if (sweep) { const [lo, hi] = sweep.range, sw = board.findings.find(f => f.tool === 'sim.sweep');
        const fragile = hi - lo > Math.max(1, Math.abs(lo + hi) / 2);
        findings.push({ kind: 'computed-output', text: fragile ? `The modelled effect is assumption-sensitive: it spans ${r1(lo)} to ${r1(hi)} s per arrival across the demand sweep, more than its own mid-range value.` : `The modelled effect is comparatively stable across the demand sweep (${r1(lo)} to ${r1(hi)} s per arrival).`, refs: sw ? [sw.id] : [], uncertainty: 'Robustness within one uncalibrated model is not external validity.' });
        if (fragile && cmp) { const sa = board.findings.find(f => f.tool === 'sim.compare' && f.metric?.deltaS);
          disagreements.push({ subject: 'How large is the green-time effect?', positions: [{ agent: sa?.agent || null, ref: sa?.id || null, says: `At the assumed demand: ${r1(sa?.metric?.deltaS ?? 0)} s per arrival.` }, { agent: sw?.agent || null, ref: sw?.id || null, says: `Across plausible demand: ${r1(lo)} to ${r1(hi)} s per arrival.` }], standing: 'unresolved: depends on unobserved demand' }); } }
      // 3. Recorded claims that the records themselves flag stay unverified and are listed for review, not repeated as fact.
      const unverified = board.findings.filter(f => f.kind === 'unverified-claim');
      return { output: { reproduced, recordedComputation: rec?.id || null, unverifiedRecordedClaims: unverified.length, assumptionsWithoutObservation: missingObs ? (cmp ? Object.keys(cmp.result.rows[0].parameters) : []) : [] }, findings, disagreements };
    } },
  'reason.hypotheses': { permission: 'local-model', reads: [], title: 'Draft testable hypotheses with the local model (if available)', optional: true,
    async run({ objective }, { board, generate, signal }) {
      if (!generate) return { unavailable: 'Local AI reasoning is unavailable: no local model runtime is reachable from this page. Deterministic tools ran without it; nothing replaces the model step.' };
      const allowed = board.findings.filter(f => ['computed-output', 'source-evidence', 'user-assumption'].includes(f.kind) && !f.recorded);
      const schema = { type: 'object', required: ['hypotheses'], properties: { hypotheses: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'object', required: ['text', 'cites', 'test'], properties: { text: { type: 'string', maxLength: 300 }, cites: { type: 'array', minItems: 1, items: { type: 'string' } }, test: { type: 'string', maxLength: 240 } } } } } };
      const r = await generate([{ role: 'system', content: 'You are a sceptical research planner in CORE. Answer in English as JSON matching the schema. Use only the evidence lines given and cite their ids exactly. Invent no number, date, source or measurement. Every statement is a hypothesis to test, never a conclusion.' },
        { role: 'user', content: `Objective: ${objective}\nEvidence (computed in this execution, uncalibrated):\n${allowed.map(f => `- ${f.id} [${f.kind}] ${f.text}`).join('\n')}\nUnresolved requirements: ${board.requirements.map(x => x.label).join('; ')}\nTask: propose at most 3 testable hypotheses that explain or challenge these outputs, each with the observation that would test it.` }],
        { schema, signal, numPredict: 500 });
      let out; try { out = JSON.parse(r.text); } catch { fail('model answer is not JSON'); }
      const ids = new Set(allowed.map(f => f.id)), issues = checkSchema(out, schema);
      const evidence = allowed.map(f => ({ text: f.text, record: f.id }));
      for (const [i, h] of (out.hypotheses || []).entries()) { const bad = h.cites.filter(c => !ids.has(c)); if (bad.length) issues.push(`hypothesis ${i + 1}: unknown id(s) ${bad.join(', ')}`);
        issues.push(...verify(h.text, evidence, { requireCitation: false }).issues.map(x => `hypothesis ${i + 1}: ${x.code} · ${x.detail}`)); }
      if (issues.length) fail(`model output rejected by validation: ${issues.slice(0, 4).join('; ')}`);
      return { output: { model: r.model, tokens: r.tokens ?? null, hypotheses: out.hypotheses }, reasoning: { model: r.model },
        findings: out.hypotheses.map(h => ({ kind: 'model-hypothesis', text: h.text, refs: h.cites, uncertainty: `Model-generated; untested. Test: ${h.test}` })) };
    } },
  'report.compose': { permission: 'report-local', reads: [], title: 'Compose the local investigation report for human review',
    run({ objective }, { board }) {
      const by = Object.fromEntries(KINDS.map(k => [k, board.findings.filter(f => f.kind === k).map(f => f.id)]));
      const cmp = board.outputs['sim.compare']?.at(-1), sweep = board.outputs['sim.sweep']?.at(-1);
      const conclusions = [];
      if (cmp) conclusions.push({ text: `Within the uncalibrated exploratory model: ${cmp.result.verdict}${cmp.result.best != null ? ` (“${cmp.result.rows[cmp.result.best].name}”)` : ''}.`, basis: board.findings.filter(f => f.tool === 'sim.compare' && f.kind === 'computed-output').map(f => f.id) });
      if (sweep) conclusions.push({ text: `The modelled effect ranges ${r1(sweep.range[0])} to ${r1(sweep.range[1])} s per arrival across assumed demand; its real size is unknown without counts.`, basis: board.findings.filter(f => f.tool === 'sim.sweep').map(f => f.id) });
      conclusions.push({ text: `${board.requirements.length} scientific requirement(s) remain unresolved before any real-world claim: ${board.requirements.map(x => x.label).join('; ')}.`, basis: [] });
      return { output: { objective, findingsByKind: by, conclusions: conclusions.map(c => ({ ...c, status: 'proposed — awaiting human review' })) } };
    } },
  // Registered only to be refused: requests for these are recorded as denied.
  'net.fetch': { permission: 'network', title: 'Fetch a URL' },
  'shell.exec': { permission: 'shell', title: 'Run a shell command' },
  'fs.read': { permission: 'filesystem', title: 'Read an arbitrary file' },
  'comms.send': { permission: 'communication', title: 'Send a message outside CORE' },
  'records.publish': { permission: 'publish', title: 'Change a public scientific record' },
  'world.act': { permission: 'real-world', title: 'Act in the real world' }
};

// `resources`: { path: parsedJSON } for APPROVED_RESOURCES the host loaded; `generate`: a local-model function or null.
export function createRegistry({ resources = {}, generate = null } = {}) {
  const tools = Object.fromEntries(Object.entries(TOOLS).map(([id, t]) => [id, Object.freeze({ id, ...t })]));
  const permitted = t => { const p = PERMISSIONS[t?.permission]; return !!t?.run && (p?.allowed === true || (p?.allowed === 'conditional')); };
  const describe = id => { const t = tools[id]; return t ? { id, title: t.title, permission: t.permission, allowed: permitted(t), reads: t.reads || [], optional: !!t.optional } : null; };
  // Runs one tool. Never throws: errors, denials and unavailability come back as a status.
  async function call(id, input, { board, signal } = {}) {
    const t = tools[id], base = { tool: id, permission: t?.permission || null, input, resources: [], output: null, error: null };
    if (!t) return { ...base, status: 'denied', error: `Unknown tool ${id}: denied by default` };
    if (!permitted(t)) return { ...base, status: 'denied', error: `${PERMISSIONS[t.permission].label}: denied by policy` };
    const read = path => { if (!APPROVED_RESOURCES.includes(path) || !t.reads.includes(path)) throw Object.assign(Error(`Resource ${path} is not approved for ${id}`), { denied: true });
      if (!(path in resources) || resources[path] == null) throw Error(`Approved resource ${path} is not loaded`); base.resources.push(path); return resources[path]; };
    try {
      const r = await t.run(structuredClone(input), { read, board, generate, signal });
      if (r.unavailable) return { ...base, status: 'unavailable', error: r.unavailable };
      return { ...base, status: 'ok', output: r.output, findings: r.findings || [], requirements: r.requirements || [], disagreements: r.disagreements || [], reasoning: r.reasoning || null, executor: t.permission === 'local-model' ? 'local-model' : 'deterministic' };
    } catch (e) { return { ...base, status: e.denied ? 'denied' : signal?.aborted ? 'cancelled' : 'error', error: String(e.message || e), executor: t.permission === 'local-model' ? 'local-model' : 'deterministic' }; }
  }
  return { call, describe, list: () => Object.keys(tools).map(describe), modelAvailable: !!generate };
}
