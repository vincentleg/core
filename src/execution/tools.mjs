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
// R30: SF housing snapshot (scripts/housing-snapshot.mjs; licences checked in docs/v7/V7_2_RESUME.md, manifest with
// URLs, retrieval dates and SHA-256). Eviction counts are deliberately not approved: no mission needs them.
export const HOUSING = Object.freeze({ manifest: 'data/sf-housing/manifest.json', pipeline: 'data/sf-housing/pipeline.geojson', byYear: 'data/sf-housing/production-by-year.json', byNeighborhood: 'data/sf-housing/production-by-neighborhood.json' });
// Bundled, published resources a tool may read. Fixed in code: a mission specification can cite these, never add to them.
export const APPROVED_RESOURCES = Object.freeze([CATALOG_FILE, WORK_FILE, HOUSING.manifest, HOUSING.pipeline, HOUSING.byYear, HOUSING.byNeighborhood]);
export const ALLOWED_LICENSES = Object.freeze(['ODC Public Domain Dedication and License (PDDL)', 'Public Domain U.S. Government']);
export const PERMISSIONS = Object.freeze({
  'read-bundled': { allowed: true, label: 'Read authorized bundled geographic data' },
  'read-records': { allowed: true, label: 'Inspect recorded investigations' },
  'compute-local': { allowed: true, label: 'Run exploratory computations (simulator, aggregations) in this browser' },
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

// Each handler: (input, { read, hash, board, generate, signal }) → { output, findings?, requirements?, disagreements?, conclusions?, reasoning? }.
// `conclusions` are proposals based on the findings of the same call; the engine links them and keeps them unaccepted.
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
        ], conclusions: [{ text: `Within the uncalibrated exploratory model: ${result.verdict}${result.best != null ? ` (“${result.rows[result.best].name}”)` : ''}.`, basis: 'computed-output' }] };
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
        findings: [{ kind: 'computed-output', text: `Across assumed demand ${demands[0]}–${demands.at(-1)} veh/h, the variant changes modelled delay by ${r1(lo)} to ${r1(hi)} s per arrival; baseline utilization ${rows[0].baselineUtilization.toFixed(2)}–${rows.at(-1).baselineUtilization.toFixed(2)}${rows.some(r => r.storageExceeded) ? '; approximate storage exceeded at some levels' : ''}.`, refs: [`${SIM_VERSION}#${s.id}`], uncertainty: 'The size of the modelled effect depends on demand, which no authorized count measures.', metric: { range: [lo, hi] } }],
        conclusions: [{ text: `The modelled effect ranges ${r1(lo)} to ${r1(hi)} s per arrival across assumed demand; its real size is unknown without counts.`, basis: 'computed-output' }] };
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
      const conclusions = [...board.conclusions.map(c => ({ text: c.text, basis: c.basis }))];
      if (board.requirements.length) conclusions.push({ text: `${board.requirements.length} scientific requirement(s) remain unresolved before any real-world claim: ${board.requirements.map(x => x.label).join('; ')}.`, basis: [] });
      return { output: { objective, findingsByKind: by, conclusions: conclusions.map(c => ({ ...c, status: 'proposed — awaiting human review' })) } };
    } },
  // R30 — San Francisco housing: deterministic aggregation of the bundled snapshot; no individual record leaves the data.
  'housing.sources': { permission: 'read-bundled', reads: [HOUSING.manifest, HOUSING.pipeline, HOUSING.byYear, HOUSING.byNeighborhood], title: 'Check the housing snapshot: licences, dates and checksums',
    run(_, { read, hash }) {
      const m = read(HOUSING.manifest), files = { [HOUSING.pipeline]: 'pipeline.geojson', [HOUSING.byYear]: 'production-by-year.json', [HOUSING.byNeighborhood]: 'production-by-neighborhood.json' }, findings = [], checked = [];
      for (const [path, file] of Object.entries(files)) {
        const d = (m.datasets || []).find(x => x.file === file) || fail(`${file} is not in the snapshot manifest`);
        if (!ALLOWED_LICENSES.includes(d.license?.name)) fail(`${file}: licence ${d.license?.name || 'unknown'} is not an approved reuse licence`);
        if (!/^[0-9a-f]{64}$/.test(d.sha256 || '') || !Number.isFinite(Date.parse(d.retrieved_at))) fail(`${file}: checksum or retrieval date missing`);
        read(path); const h = hash(path); if (h && h !== d.sha256) fail(`${file}: checksum mismatch with the manifest`);
        checked.push({ file, id: d.id, sha256: d.sha256, verified: h === d.sha256 });
        findings.push({ kind: 'source-evidence', text: `${d.title} (${d.provider}, ${d.id}, ${d.license.name}, retrieved ${d.retrieved_at.slice(0, 10)}): ${h ? 'checksum verified in this run' : 'checksum not checked in this run'}.`, refs: [path, d.page || `https://data.sf.gov/d/${d.id}`], uncertainty: d.note || null });
      }
      return { output: { generatedAt: m.generated_at, checked, gaps: m.gaps || [] }, findings,
        requirements: (m.gaps || []).map((g, i) => ({ id: `gap-${i + 1}`, label: `Missing from the snapshot: ${g.topic}`, status: 'missing', evidence: `${HOUSING.manifest}: ${g.reason}`, next: `Obtain ${g.topic} from an authorized source (${g.source}) without new keys or accounts unless the founder approves.` })) };
    } },
  'housing.pipeline': { permission: 'compute-local', reads: [HOUSING.pipeline], title: 'Aggregate the affordable-housing pipeline by neighbourhood',
    run({ top = 3 }, { read }) {
      if (!Number.isInteger(top) || top < 1 || top > 10) fail('top must be 1–10');
      const fs = read(HOUSING.pipeline).features || [], by = new Map(), status = {};
      for (const f of fs) { const p = f.properties || {}, n = p.neighborhood || 'unknown', a = by.get(n) || { neighborhood: n, projects: 0, units: 0, affordable: 0 };
        a.projects++; a.units += +p.units || 0; a.affordable += +p.affordable || 0; by.set(n, a); status[p.status || 'unknown'] = (status[p.status || 'unknown'] || 0) + 1; }
      const rows = [...by.values()].sort((x, y) => y.affordable - x.affordable), total = rows.reduce((s, r) => s + r.affordable, 0), units = rows.reduce((s, r) => s + r.units, 0);
      const head = rows.slice(0, top), share = total ? head.reduce((s, r) => s + r.affordable, 0) / total : 0, undated = fs.filter(f => !f.properties?.completion).length;
      return { output: { projects: fs.length, units, affordable: total, status, top: head, share, undated, rows },
        findings: [{ kind: 'computed-output', text: `Pipeline snapshot: ${fs.length} projects, ${units} units of which ${total} affordable; ${Math.round(share * 1000) / 10} % of affordable units are in ${top} neighbourhood(s): ${head.map(r => `${r.neighborhood} (${r.affordable})`).join(', ')}.`, refs: [HOUSING.pipeline], uncertainty: 'Status and completion dates are the department’s estimates; a pipeline project is not a completed home.', metric: { top: head.map(r => r.neighborhood), share } },
          { kind: 'computed-output', text: `${undated} of ${fs.length} pipeline projects have no estimated completion date; status counts: ${Object.entries(status).map(([k, v]) => `${k} ${v}`).join(', ')}.`, refs: [HOUSING.pipeline], uncertainty: 'Missing dates limit any timing claim.' }],
        conclusions: [{ text: `In the bundled pipeline snapshot, affordable units are concentrated: ${Math.round(share * 1000) / 10} % in ${head.map(r => r.neighborhood).join(', ')}. This describes planned projects, not need or delivery.`, basis: 'computed-output' }] };
    } },
  'housing.production': { permission: 'compute-local', reads: [HOUSING.byYear, HOUSING.byNeighborhood, HOUSING.manifest], title: 'Summarise reported completions over time and by neighbourhood',
    run({ window = 5, top = 3 }, { read }) {
      if (!Number.isInteger(window) || window < 2 || window > 10 || !Number.isInteger(top) || top < 1 || top > 10) fail('window must be 2–10 years and top 1–10');
      const partial = new Date(read(HOUSING.manifest).generated_at).getUTCFullYear(), years = read(HOUSING.byYear).filter(y => y.year < partial).sort((a, b) => a.year - b.year);
      if (years.length < 2 * window) fail(`Fewer than ${2 * window} complete years of completions`);
      const recent = years.slice(-window), before = years.slice(-2 * window, -window), sum = (a, k) => a.reduce((s, y) => s + (+y[k] || 0), 0);
      const change = sum(before, 'net_units') ? (sum(recent, 'net_units') - sum(before, 'net_units')) / sum(before, 'net_units') : null;
      const nb = [...read(HOUSING.byNeighborhood)].sort((a, b) => b.affordable_units - a.affordable_units), totalA = nb.reduce((s, r) => s + (+r.affordable_units || 0), 0), head = nb.slice(0, top);
      const share = totalA ? head.reduce((s, r) => s + r.affordable_units, 0) / totalA : 0, span = w => `${w[0].year}–${w.at(-1).year}`;
      return { output: { partialYearExcluded: partial, recent: span(recent), before: span(before), netRecent: sum(recent, 'net_units'), netBefore: sum(before, 'net_units'), change, affordableRecent: sum(recent, 'affordable_units'), top: head, share },
        findings: [{ kind: 'computed-output', text: `Reported net completions ${span(before)}: ${sum(before, 'net_units')}; ${span(recent)}: ${sum(recent, 'net_units')} (${change == null ? 'no change computable' : `${change > 0 ? '+' : ''}${Math.round(change * 1000) / 10} %`}); ${sum(recent, 'affordable_units')} affordable in ${span(recent)}. ${partial} excluded as incomplete.`, refs: [HOUSING.byYear], uncertainty: 'Completions as reported by the source; some affordable counts are its estimates.' },
          { kind: 'computed-output', text: `Affordable completions since 2015: ${Math.round(share * 1000) / 10} % in ${head.map(r => `${r.neighborhood} (${r.affordable_units})`).join(', ')}.`, refs: [HOUSING.byNeighborhood], uncertainty: 'Aggregated by the source’s analysis neighbourhood; not a measure of need.', metric: { top: head.map(r => r.neighborhood), share } }],
        conclusions: [{ text: `Reported completions changed ${change == null ? 'by an amount that cannot be computed' : `${change > 0 ? '+' : ''}${Math.round(change * 1000) / 10} %`} between ${span(before)} and ${span(recent)}; this is a description of reported counts, not an explanation.`, basis: 'computed-output' }] };
    } },
  'housing.compare': { permission: 'compare', reads: [], title: 'Compare planned affordable units with recent affordable completions',
    run(_, { board }) {
      const pipe = board.outputs['housing.pipeline']?.at(-1) || fail('Pipeline aggregation unavailable'), prod = board.outputs['housing.production']?.at(-1) || fail('Production summary unavailable');
      const pf = board.findings.find(f => f.tool === 'housing.pipeline' && f.metric), nf = board.findings.find(f => f.tool === 'housing.production' && f.metric);
      const A = pipe.top.map(r => r.neighborhood), B = prod.top.map(r => r.neighborhood), overlap = A.filter(n => B.includes(n));
      const findings = [{ kind: 'computed-output', text: `${overlap.length} of ${A.length} neighbourhoods with the most planned affordable units are also among the ${B.length} with the most affordable completions since 2015${overlap.length ? ` (${overlap.join(', ')})` : ''}.`, refs: [pf?.id, nf?.id].filter(Boolean), uncertainty: 'Rank overlap of two administrative snapshots; it says nothing about need, cost or displacement.' }];
      const disagreements = [];
      if (overlap.length < A.length) disagreements.push({ subject: 'Does the affordable pipeline follow where affordable housing was recently completed?', positions: [{ agent: pf?.agent || null, ref: pf?.id || null, says: `Planned affordable units concentrate in ${A.join(', ')}.` }, { agent: nf?.agent || null, ref: nf?.id || null, says: `Recent affordable completions concentrate in ${B.join(', ')}.` }], standing: 'unresolved: two snapshots, different stages; neither establishes where need is greatest' });
      const gap = board.requirements.find(q => q.id.startsWith('gap-'));
      if (gap) disagreements.push({ subject: 'Does concentration show where affordable housing is most needed?', positions: [{ agent: pf?.agent || null, ref: pf?.id || null, says: `${Math.round(pipe.share * 1000) / 10} % of planned affordable units are in ${A.length} neighbourhood(s).` }, { agent: null, ref: HOUSING.manifest, says: gap.label }], standing: 'unresolved: need cannot be assessed without rent-burden and income data' });
      return { output: { overlap, pipelineTop: A, completionsTop: B }, findings, disagreements };
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
// `hashes`: { path: SHA-256 of the bytes the host loaded } for resources whose checksum the host computed.
export function createRegistry({ resources = {}, hashes = {}, generate = null } = {}) {
  const tools = Object.fromEntries(Object.entries(TOOLS).map(([id, t]) => [id, Object.freeze({ id, ...t })]));
  const permitted = t => { const p = PERMISSIONS[t?.permission]; return !!t?.run && (p?.allowed === true || (p?.allowed === 'conditional')); };
  const describe = id => { const t = tools[id]; return t ? { id, title: t.title, permission: t.permission, allowed: permitted(t), reads: t.reads || [], optional: !!t.optional } : null; };
  // Runs one tool. Never throws: errors, denials and unavailability come back as a status.
  async function call(id, input, { board, signal } = {}) {
    const t = tools[id], base = { tool: id, permission: t?.permission || null, input, resources: [], output: null, error: null };
    if (!t) return { ...base, status: 'denied', error: `Unknown tool ${id}: denied by default` };
    if (!permitted(t)) return { ...base, status: 'denied', error: `${PERMISSIONS[t.permission].label}: denied by policy` };
    const read = path => { if (!APPROVED_RESOURCES.includes(path) || !t.reads.includes(path)) throw Object.assign(Error(`Resource ${path} is not approved for ${id}`), { denied: true });
      if (!(path in resources) || resources[path] == null) throw Error(`Approved resource ${path} is not loaded`); if (!base.resources.includes(path)) base.resources.push(path); return resources[path]; };
    const hash = path => (t.reads.includes(path) && /^[0-9a-f]{64}$/.test(hashes[path] || '') ? hashes[path] : null);
    try {
      const r = await t.run(structuredClone(input), { read, hash, board, generate, signal });
      if (r.unavailable) return { ...base, status: 'unavailable', error: r.unavailable };
      return { ...base, status: 'ok', output: r.output, findings: r.findings || [], requirements: r.requirements || [], disagreements: r.disagreements || [], conclusions: r.conclusions || [], reasoning: r.reasoning || null, executor: t.permission === 'local-model' ? 'local-model' : 'deterministic' };
    } catch (e) { return { ...base, status: e.denied ? 'denied' : signal?.aborted ? 'cancelled' : 'error', error: String(e.message || e), executor: t.permission === 'local-model' ? 'local-model' : 'deterministic' }; }
  }
  return { call, describe, list: () => Object.keys(tools).map(describe), modelAvailable: !!generate };
}
