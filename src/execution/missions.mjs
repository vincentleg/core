// CORE R30 — geographic mission specifications for supervised execution. A specification is data: where, what
// question, which authorized evidence, which agent identities, which registered tools in which order, what is known to
// be missing and who must review. It grants nothing: tools and their permissions come only from the code registry
// (tools.mjs), readable files only from its code allow-list, and every unknown field is rejected. A mission "type" is
// code that turns the person's inputs into tool inputs. Specifications marked "blocked" are listed honestly and
// cannot be planned. Pure: no DOM, storage or network.
import { createRegistry, APPROVED_RESOURCES, ALLOWED_LICENSES, CATALOG_FILE, HOUSING } from './tools.mjs';
import { WORK_FILE } from '../earth/mission-intel.mjs';
import { DEFAULT } from '../urban/model.mjs';

export const CATEGORIES = Object.freeze(['mobility', 'housing', 'climate', 'health', 'energy', 'other']);
export const MAX_TASKS = 10;
const SPEC_KEYS = ['id', 'version', 'type', 'status', 'title', 'category', 'objective', 'place', 'evidence', 'agents', 'tasks', 'limitations', 'review', 'requirements', 'blocker'];
const TASK_KEYS = ['id', 'lane', 'by', 'tool', 'input', 'deps', 'optional', 'goal'];
const AGENT_KEYS = ['agent', 'recordedRole', 'label'];
const EVIDENCE_KEYS = ['id', 'title', 'publisher', 'license', 'url', 'retrieved', 'resource', 'documentation'];
// CORE's own published records (recorded runs, snapshot manifests) are cited as such, not as third-party datasets.
export const CORE_RECORD = 'CORE published record (this repository)';
const LANES = ['context', 'evidence', 'scenario', 'analysis', 'risk', 'review'];
const pair = (en, fr) => ({ en, fr });

// Mission types: user-editable inputs (bounded) and how they become tool inputs. Code, not specification data.
export const TYPES = {
  'mobility-signal-timing': {
    inputs: [{ id: 'demand', label: pair('Demand, veh/h', 'Demande, véh/h'), min: 100, max: 3000, step: 50, default: DEFAULT.demand },
      { id: 'green0', label: pair('Baseline green, %', 'Vert de référence, %'), min: 10, max: 85, step: 1, default: Math.round(DEFAULT.green * 100) },
      { id: 'green1', label: pair('Variant green, %', 'Vert de la variante, %'), min: 10, max: 85, step: 1, default: Math.round(DEFAULT.green * 100) + 10 }],
    // `assumptions` (explicit scenarios) wins; otherwise the recorded run's scenarios, otherwise the numeric inputs.
    bind(spec, values, { work, assumptions = null, demands = [600, 750, 900, 1050, 1200, 1350, 1500] }) {
      const seg = spec.tasks.find(t => t.tool === 'geo.segment').input.segment, rec = work?.run?.findings?.find(f => f.tool === 'calculate_scenarios')?.output?.request?.scenarios;
      const typed = ['demand', 'green0', 'green1'].some(k => values[k] != null), v = { demand: DEFAULT.demand, green0: 45, green1: 55, ...values };
      const scenarios = assumptions || (!typed && rec) || [{ name: 'Baseline (assumed)', parameters: { ...DEFAULT, demand: v.demand, green: v.green0 / 100 } }, { name: `Variant: green ${v.green1} %`, parameters: { ...DEFAULT, demand: v.demand, green: v.green1 / 100 } }];
      const b = scenarios[0].parameters;
      return { inputs: { segment: seg, scenarios }, byTool: { 'sim.compare': { segment: seg, scenarios }, 'sim.sweep': { segment: seg, baseline: b, variant: scenarios.at(-1).parameters, demands } },
        values: { demand: b.demand, green0: Math.round(b.green * 100), green1: Math.round(scenarios.at(-1).parameters.green * 100) }, assumptions: scenarios,
        note: `Other inputs: ${b.lanes} lanes, saturation ${b.saturation} veh/h/lane, ${b.cycle} s cycle, ${b.seconds} s horizon. Demand sweep: ${demands.join(', ')} veh/h.` };
    }
  },
  'housing-distribution': {
    inputs: [{ id: 'top', label: pair('Neighbourhoods compared', 'Quartiers comparés'), min: 1, max: 10, step: 1, default: 3 },
      { id: 'window', label: pair('Comparison window, years', 'Fenêtre de comparaison, années'), min: 2, max: 10, step: 1, default: 5 }],
    bind(spec, values) {
      const v = { top: 3, window: 5, ...values };
      return { byTool: { 'housing.pipeline': { top: v.top }, 'housing.production': { top: v.top, window: v.window } }, values: v, assumptions: null,
        note: 'No simulation: counts and shares computed from the bundled snapshot. Eviction notices are not used.' };
    }
  }
};

// The San Francisco mobility mission (R28), now as a specification. Agent identities come from the recorded run.
export const SF_MOBILITY = {
  id: 'mission.sf.mobility', version: 1, type: 'mobility-signal-timing', status: 'executable', category: 'mobility',
  title: pair('Folsom Street signal timing (San Francisco)', 'Temps de feux sur Folsom Street (San Francisco)'),
  objective: pair('Would a ten-point green-time increase on the mapped Folsom Street approach reduce modelled delay, how robust is that to unknown demand, and what evidence is missing before any real-world claim?', 'Une hausse de dix points du temps de vert sur l’approche cartographiée de Folsom Street réduirait-elle le retard modélisé, avec quelle robustesse face à une demande inconnue, et quelles preuves manquent avant toute affirmation réelle ?'),
  place: { label: 'Folsom St: 2nd St → Hawthorne St, San Francisco', center: [-122.3974, 37.7855], bbox: [-122.42, 37.77, -122.38, 37.80] },
  evidence: [
    { id: 'sf-streets', title: 'Streets – Active and Retired (3psu-pn9h), in the urban model catalog', publisher: 'City and County of San Francisco (DPW Basemap)', license: 'ODC Public Domain Dedication and License (PDDL)', url: 'https://data.sf.gov/d/3psu-pn9h', retrieved: '2026-10-13T18:25:17.891Z', resource: CATALOG_FILE, documentation: 'docs/DATA_SOURCES.md; data/urban/catalog.json (source SHA-256)' },
    { id: 'recorded-investigation', title: 'Recorded local-model investigation of this mission', publisher: 'CORE', license: CORE_RECORD, retrieved: '2026-10-19T00:38:06.485Z', resource: WORK_FILE, documentation: 'data/intelligence/work.json (recorded, provider, verification)' }
  ],
  agents: { context: { recordedRole: 'geography' }, discovery: { recordedRole: 'discovery' }, evidence: { recordedRole: 'evidence' }, scenario: { recordedRole: 'quantitative' }, risk: { recordedRole: 'reviewer' }, planner: { recordedRole: 'planner' }, review: { recordedRole: 'reporter' } },
  tasks: [
    { id: 'T1', lane: 'context', by: 'context', tool: 'geo.segment', input: { segment: '5660000' }, deps: [], goal: 'Confirm the mapped approach and that its source is authorized for modelling.' },
    { id: 'T2', lane: 'evidence', by: 'discovery', tool: 'records.inspect', input: { segment: '5660000' }, deps: [], goal: 'Read what the recorded investigation established, claimed and left open.' },
    { id: 'T3', lane: 'evidence', by: 'evidence', tool: 'evidence.readiness', input: { segment: '5660000' }, deps: ['T1'], goal: 'List the scientific requirements still unmet for this approach.' },
    { id: 'T4', lane: 'scenario', by: 'scenario', tool: 'sim.compare', input: {}, deps: ['T1'], goal: 'Run the exploratory simulator on the declared assumptions.' },
    { id: 'T5', lane: 'scenario', by: 'scenario', tool: 'sim.sweep', input: {}, deps: ['T1'], goal: 'Test whether the modelled effect survives the unknown demand.' },
    { id: 'T6', lane: 'risk', by: 'risk', tool: 'evidence.compare', input: { segment: '5660000' }, deps: ['T2', 'T3', 'T4', 'T5'], goal: 'Compare computed outputs with recorded claims, assumptions and readiness.' },
    { id: 'T7', lane: 'review', by: 'planner', tool: 'reason.hypotheses', input: {}, deps: ['T6'], optional: true, goal: 'Draft testable hypotheses (local model only; otherwise unavailable).' },
    { id: 'T8', lane: 'review', by: 'review', tool: 'report.compose', input: {}, deps: ['T6', 'T7'], goal: 'Compose the report and hand it to human review.' }
  ],
  limitations: ['Uncalibrated fluid queue at one approach: no turns, spillback, transit or pedestrians.', 'Demand and signal timing are assumptions: no authorized counts or signal plans are bundled.', 'Results are exploratory computations, not predictions or measured effects.'],
  review: { required: true, by: 'A qualified independent reviewer chosen by the person; CORE sends nothing.' },
  requirements: []
};
// R30 second mission: where San Francisco's affordable-housing pipeline is concentrated, compared with reported
// completions. Bundled DataSF snapshot only (PDDL / U.S. Government public domain, checksums in the manifest).
export const SF_HOUSING = {
  id: 'mission.sf.housing-resilience', version: 1, type: 'housing-distribution', status: 'executable', category: 'housing',
  title: pair('Affordable-housing pipeline distribution (San Francisco)', 'Répartition du pipeline de logements abordables (San Francisco)'),
  objective: pair('Where are planned affordable units in San Francisco concentrated, does that follow where affordable housing was recently completed, and what evidence is missing before saying anything about need?', 'Où se concentrent les logements abordables prévus à San Francisco, cela suit-il les achèvements récents de logements abordables, et quelles preuves manquent avant de parler de besoin ?'),
  place: { label: 'San Francisco (41 analysis neighbourhoods)', center: [-122.4135, 37.7765], bbox: [-122.52, 37.70, -122.35, 37.84] },
  evidence: [
    { id: 'aaxw-2cb8', title: 'MOHCD Affordable Housing Pipeline', publisher: 'Mayor’s Office of Housing and Community Development', license: 'ODC Public Domain Dedication and License (PDDL)', url: 'https://data.sf.gov/d/aaxw-2cb8', retrieved: '2026-10-16T04:44:10.309Z', resource: HOUSING.pipeline, documentation: 'data/sf-housing/manifest.json; docs/v7/V7_2_RESUME.md' },
    { id: 'xdht-4php-year', title: 'Housing Production 2005–present, by completion year', publisher: 'San Francisco Planning Department', license: 'Public Domain U.S. Government', url: 'https://data.sf.gov/d/xdht-4php', retrieved: '2026-10-16T04:44:10.465Z', resource: HOUSING.byYear, documentation: 'docs/DATA_SOURCES.md (xdht-4php)' },
    { id: 'xdht-4php-neighborhood', title: 'Housing Production by analysis neighbourhood, since 2015', publisher: 'San Francisco Planning Department', license: 'Public Domain U.S. Government', url: 'https://data.sf.gov/d/xdht-4php', retrieved: '2026-10-16T04:44:10.609Z', resource: HOUSING.byNeighborhood, documentation: 'docs/DATA_SOURCES.md (xdht-4php)' },
    { id: 'sf-housing-manifest', title: 'Snapshot manifest: URLs, retrieval dates, SHA-256, privacy and gaps', publisher: 'CORE (scripts/housing-snapshot.mjs)', license: CORE_RECORD, retrieved: '2026-10-16T04:44:11.627Z', resource: HOUSING.manifest, documentation: 'data/sf-housing/manifest.json' }
  ],
  agents: { quality: { agent: 'core.san-francisco.data-science.quality.002' }, pipeline: { agent: 'core.san-francisco.housing.pipeline.002' }, production: { agent: 'core.san-francisco.housing.production.001' }, fairness: { agent: 'core.san-francisco.ethics.fairness.002' }, lead: { agent: 'core.san-francisco.housing.lead' } },
  tasks: [
    { id: 'H1', lane: 'context', by: 'quality', tool: 'housing.sources', input: {}, deps: [], goal: 'Check licences, retrieval dates and checksums of the bundled snapshot; list declared gaps.' },
    { id: 'H2', lane: 'analysis', by: 'pipeline', tool: 'housing.pipeline', input: {}, deps: ['H1'], goal: 'Aggregate planned affordable units by neighbourhood.' },
    { id: 'H3', lane: 'analysis', by: 'production', tool: 'housing.production', input: {}, deps: ['H1'], goal: 'Summarise reported completions over time and by neighbourhood.' },
    { id: 'H4', lane: 'risk', by: 'fairness', tool: 'housing.compare', input: {}, deps: ['H2', 'H3'], goal: 'Compare the two distributions and state what they cannot show.' },
    { id: 'H5', lane: 'review', by: 'lead', tool: 'reason.hypotheses', input: {}, deps: ['H4'], optional: true, goal: 'Draft testable hypotheses (local model only; otherwise unavailable).' },
    { id: 'H6', lane: 'review', by: 'lead', tool: 'report.compose', input: {}, deps: ['H4', 'H5'], goal: 'Compose the report and hand it to human review.' }
  ],
  limitations: ['Pipeline status and completion dates are the department’s estimates; planned units are not homes delivered.', 'Completions are reported counts; some affordable counts are estimates by the source.', 'Neither dataset measures need, affordability, rent burden or displacement; no causal claim is possible.', 'Eviction notices are bundled but deliberately not used by this mission.'],
  review: { required: true, by: 'A qualified independent reviewer (housing policy or planning) chosen by the person; CORE sends nothing.' },
  requirements: [
    { id: 'need', label: 'Housing need and affordability measures by neighbourhood', status: 'missing', next: 'Identify an authorized, keyless source of need measures and document its reuse terms before ingestion.' },
    { id: 'dates', label: 'Verified completion dates for pipeline projects', status: 'unverified', next: 'Compare pipeline estimates with later completion records before using them for timing.' },
    { id: 'review', label: 'Independent review', status: 'missing', next: 'Arrange a qualified independent review of method, sources and wording.' }
  ]
};
// Listed so the gap is visible: the recorded SF run asked what Oakland would need. Nothing for Oakland is bundled.
export const OAKLAND_MOBILITY = {
  id: 'mission.oakland.signal-timing', version: 1, type: 'mobility-signal-timing', status: 'blocked', category: 'mobility',
  title: pair('Signal timing transfer to Oakland', 'Transfert du temps de feux à Oakland'),
  objective: pair('Could the San Francisco exploratory approach be applied to an Oakland approach?', 'L’approche exploratoire de San Francisco pourrait-elle s’appliquer à une approche d’Oakland ?'),
  place: { label: 'Oakland, California', center: [-122.2711, 37.8044], bbox: [-122.36, 37.70, -122.11, 37.89] },
  blocker: 'No authorized Oakland street geometry, traffic counts or signal plans are bundled, and none may be retrieved without documented reuse rights (FD09). Not executable.',
  evidence: [], agents: {}, tasks: [],
  limitations: ['No Oakland evidence is bundled.'], review: { required: true, by: 'A qualified independent reviewer.' }, requirements: [{ id: 'oakland-geometry', label: 'Authorized Oakland approach geometry, counts and signal plans', status: 'missing', next: 'Find official Oakland sources and verify reuse rights before any retrieval.' }]
};
export const SPECS = Object.freeze([SF_MOBILITY, SF_HOUSING, OAKLAND_MOBILITY]);
export const specFor = id => SPECS.find(s => s.id === id) || null;

const isText = (x, n) => typeof x === 'string' && x.trim() && x.length <= n;
const unknown = (o, keys, where) => Object.keys(o || {}).filter(k => !keys.includes(k)).map(k => `${where}: unknown field “${k}” (a mission specification cannot add permissions, tools or resources)`);
// Returns a list of issues; empty means valid. `agentIds`: registered identities (Set) to check explicit agents against.
export function validateSpec(spec, { agentIds = null } = {}) {
  const reg = createRegistry(), issues = [];
  if (!spec || typeof spec !== 'object') return ['Specification missing'];
  issues.push(...unknown(spec, SPEC_KEYS, 'specification'));
  if (!/^mission\.[a-z0-9-]+\.[a-z0-9-]+$/.test(spec.id || '')) issues.push('id must look like mission.<place>.<topic>');
  if (!Number.isInteger(spec.version) || spec.version < 1) issues.push('version must be a positive integer');
  if (!CATEGORIES.includes(spec.category)) issues.push(`category must be one of ${CATEGORIES.join(', ')}`);
  if (!['executable', 'blocked'].includes(spec.status)) issues.push('status must be executable or blocked');
  if (!TYPES[spec.type]) issues.push(`unknown mission type ${spec.type}`);
  for (const k of ['title', 'objective']) if (!isText(spec[k]?.en, 600) || !isText(spec[k]?.fr, 600)) issues.push(`${k} needs English and French text`);
  const p = spec.place, okLL = c => Array.isArray(c) && c.length === 2 && c[0] >= -180 && c[0] <= 180 && c[1] >= -90 && c[1] <= 90;
  if (!p || !isText(p.label, 120) || !okLL(p.center) || !Array.isArray(p.bbox) || p.bbox.length !== 4 || !(p.bbox[0] < p.bbox[2] && p.bbox[1] < p.bbox[3]) || p.center[0] < p.bbox[0] || p.center[0] > p.bbox[2] || p.center[1] < p.bbox[1] || p.center[1] > p.bbox[3]) issues.push('place needs a label, a valid centre and a bounding box containing it');
  if (!Array.isArray(spec.limitations) || !spec.limitations.length) issues.push('at least one scientific limitation is required');
  if (spec.review?.required !== true || !isText(spec.review?.by, 200) || Object.keys(spec.review).some(k => !['required', 'by'].includes(k))) issues.push('human review must be required and say who reviews');
  for (const q of spec.requirements || []) if (!isText(q.id, 40) || !isText(q.label, 200) || !['missing', 'unverified'].includes(q.status)) issues.push(`requirement ${q?.id}: needs id, label and status missing/unverified`);
  if (spec.status === 'blocked') { if (!isText(spec.blocker, 400)) issues.push('a blocked specification must state its blocker'); if (spec.tasks?.length) issues.push('a blocked specification cannot declare tasks'); return issues; }
  // Evidence: only allow-listed bundled files under approved licences.
  const cited = new Set();
  for (const e of spec.evidence || []) { issues.push(...unknown(e, EVIDENCE_KEYS, `evidence ${e.id}`));
    if (!APPROVED_RESOURCES.includes(e.resource)) issues.push(`evidence ${e.id}: ${e.resource} is not an approved bundled resource`); else cited.add(e.resource);
    const core = e.license === CORE_RECORD;
    if (!core && !ALLOWED_LICENSES.includes(e.license)) issues.push(`evidence ${e.id}: licence not approved`);
    if ((!core && !/^https:\/\//.test(e.url || '')) || !Number.isFinite(Date.parse(e.retrieved)) || !isText(e.documentation, 200)) issues.push(`evidence ${e.id}: needs an https source (third-party data), a retrieval date and its rights documentation`); }
  for (const [k, a] of Object.entries(spec.agents || {})) { issues.push(...unknown(a, AGENT_KEYS, `agent ${k}`));
    if (!!a.agent === !!a.recordedRole) issues.push(`agent ${k}: give exactly one of agent or recordedRole`);
    if (a.agent && agentIds && !agentIds.has(a.agent)) issues.push(`agent ${k}: ${a.agent} is not a registered identity`); }
  const tasks = spec.tasks || [], ids = new Set(tasks.map(t => t.id));
  if (!tasks.length || tasks.length > MAX_TASKS) issues.push(`1–${MAX_TASKS} tasks required`);
  if (ids.size !== tasks.length) issues.push('duplicate task ids');
  for (const t of tasks) { issues.push(...unknown(t, TASK_KEYS, `task ${t.id}`));
    const d = reg.describe(t.tool);
    if (!d) issues.push(`task ${t.id}: unknown tool ${t.tool}`); else if (!d.allowed) issues.push(`task ${t.id}: tool ${t.tool} is denied (${d.permission})`);
    else for (const r of d.reads) if (!cited.has(r)) issues.push(`task ${t.id}: ${t.tool} reads ${r}, which the specification does not cite as evidence`);
    if (!LANES.includes(t.lane)) issues.push(`task ${t.id}: unknown lane ${t.lane}`);
    if (!spec.agents?.[t.by]) issues.push(`task ${t.id}: no agent ${t.by}`);
    for (const x of t.deps || []) if (!ids.has(x)) issues.push(`task ${t.id}: unknown dependency ${x}`);
    if (t.optional && d && d.permission !== 'local-model') issues.push(`task ${t.id}: only the local-model step may be optional`); }
  return issues;
}
// Which execution is possible right now: blocked by specification, missing data, or available.
export function availability(spec, resources = {}) {
  if (spec.status === 'blocked') return { status: 'blocked', reason: spec.blocker, missing: [] };
  const missing = [...new Set((spec.evidence || []).map(e => e.resource))].filter(r => resources[r] == null);
  return missing.length ? { status: 'missing-data', reason: `Not loaded: ${missing.join(', ')}`, missing } : { status: 'available', reason: null, missing: [] };
}
