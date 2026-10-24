// CORE R31 — city intelligence: a deterministic comparison of a city's missions and of the agent investigations a
// person saved. Code, not AI, and not a new agent run. Missions are linked only through a shared, authorized
// geographic identifier (SF Analysis Neighborhoods, j2bu-swwd): point-in-polygon for mapped geometry, exact name keys
// for data aggregated by neighbourhood. Every statement says its basis: "observed" (geometry or bundled source
// data), "recorded" (published recorded run), "computed" (a saved local execution), "missing" (a declared or
// detected gap) or "hypothesis" (an opportunity to investigate; never a finding). No causal relationship between
// missions is ever stated. Pure: no DOM, storage or network; the host passes loaded resources and verified reports.
import { SPECS, availability } from './missions.mjs';
import { HOUSING, CATALOG_FILE } from './tools.mjs';
import { WORK_FILE } from '../earth/mission-intel.mjs';
import { digest, executionClass, modelOf, CITY_VERSION } from './saved.mjs';
import { CITIES } from './city-registry.mjs';

export { CITIES } from './city-registry.mjs';
export const CITY_RESOURCES = Object.freeze([CATALOG_FILE, WORK_FILE, HOUSING.manifest, HOUSING.pipeline, HOUSING.byYear, HOUSING.byNeighborhood, HOUSING.neighborhoods]);
export const citySpecs = cityId => { const c = CITIES[cityId]; return c ? SPECS.filter(s => c.missionIds.includes(s.id)) : []; };
export const cityAgents = cityId => citySpecs(cityId).flatMap(spec => Object.entries(spec.agents || {}).map(([role, assignment]) => ({ mission: spec.id, role, ...assignment })));

// Ray casting on (Multi)Polygon rings, holes included.
function inRing(p, ring) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) inside = !inside; } return inside; }
const inPolygon = (p, rings) => inRing(p, rings[0]) && !rings.slice(1).some(h => inRing(p, h));
export function neighbourhoodOf(point, boundaries, key = 'nhood') {
  for (const f of boundaries?.features || []) { const g = f.geometry, polys = g?.type === 'Polygon' ? [g.coordinates] : g?.type === 'MultiPolygon' ? g.coordinates : [];
    if (polys.some(r => inPolygon(point, r))) return f.properties?.[key] ?? null; }
  return null;
}
// How each mission type touches the shared geography. Code per type; the specification cannot change it.
const LINKS = {
  'mobility-signal-timing': (spec, R, nb) => {
    const segId = spec.tasks.find(t => t.tool === 'geo.segment')?.input?.segment, seg = R[CATALOG_FILE]?.segments?.find(s => s.id === segId);
    if (!seg) return { neighborhoods: [], method: `Mapped approach ${segId} not loaded`, basis: 'missing' };
    const hits = (seg.coordinates || [seg.center]).map(p => ({ p, n: neighbourhoodOf(p, nb) }));
    return { neighborhoods: [...new Set(hits.map(h => h.n).filter(Boolean))], points: hits.map(h => h.p), unmatched: hits.filter(h => !h.n).length, method: `Point-in-polygon of the ${hits.length} endpoints of mapped approach ${segId} (${seg.label}) on the analysis-neighbourhood boundaries`, basis: 'observed', ref: `${CATALOG_FILE}#segment:${segId}` };
  },
  'housing-distribution': (spec, R, nb) => {
    const names = new Set((nb?.features || []).map(f => f.properties?.nhood)), used = new Set([...(R[HOUSING.pipeline]?.features || []).map(f => f.properties?.neighborhood), ...(R[HOUSING.byNeighborhood] || []).map(r => r.neighborhood)].filter(Boolean));
    if (!used.size) return { neighborhoods: [], method: 'Housing snapshot not loaded', basis: 'missing' };
    const matched = [...used].filter(n => names.has(n));
    return { neighborhoods: matched, unmatched: used.size - matched.length, method: `Records keyed by the source’s analysis-neighbourhood name: ${matched.length} of ${used.size} names match the boundary file exactly`, basis: 'observed', ref: `${HOUSING.pipeline}; ${HOUSING.byNeighborhood}` };
  }
};
const rowFor = (R, n) => { const fs = (R[HOUSING.pipeline]?.features || []).filter(f => f.properties?.neighborhood === n), pr = (R[HOUSING.byNeighborhood] || []).find(r => r.neighborhood === n);
  return { projects: fs.length, units: fs.reduce((s, f) => s + (+f.properties.units || 0), 0), affordable: fs.reduce((s, f) => s + (+f.properties.affordable || 0), 0), completed: pr ? pr.net_units : null, completedAffordable: pr ? pr.affordable_units : null }; };
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

// `resources`: loaded bundled files; `hashes`: SHA-256 of their bytes; `reports`: saved, already verified reports;
// `now`: ISO time used only for evidence ages.
export function cityContext({ cityId = 'san-francisco', resources: R = {}, hashes = {}, reports = [], now = new Date().toISOString() } = {}) {
  const city = CITIES[cityId]; if (!city) throw Error(`Unknown city ${cityId}`);
  if (!city.boundaries) {
    const missions = citySpecs(cityId).map(spec => ({ id: spec.id, title: spec.title, status: spec.status, availability: 'blocked', availabilityReason: spec.blocker, place: spec.place, evidence: [], agents: [], limitations: spec.limitations, report: null }));
    return { city: { id: city.id, name: city.name, center: city.center, country: city.country }, readiness: city.readiness,
      boundary: { loaded: false, checksum: 'not available' }, missions, overlaps: [], facts: [], shared: [], publishers: [], sharedGaps: [], conflicts: [], disagreements: [], contributions: [], opportunities: [],
      log: [{ step: 1, id: 'availability', detail: `${city.name.en}: ${city.readiness}; no authorized local boundary or executable mission.` }],
      review: { required: true, status: 'not-ready', by: 'Independent scientific review is required before any city finding can be claimed.' } };
  }
  const log = [], step = (id, detail) => log.push({ step: log.length + 1, id, detail }), B = city.boundaries, nb = R[B.resource];
  const bm = (R[B.manifest]?.datasets || []).find(d => d.file === B.file), bh = hashes[B.resource];
  const boundary = { id: B.id, title: B.title, resource: B.resource, loaded: !!nb, features: nb?.features?.length || 0, license: bm?.license?.name || null, retrieved: bm?.retrieved_at || null, checksum: !nb ? 'not loaded' : !bm ? 'no manifest entry' : !bh ? 'not checked' : bh === bm.sha256 ? 'verified' : 'mismatch' };
  step('boundaries', `${B.title} (${B.id}): ${boundary.features} areas, checksum ${boundary.checksum}.`);
  const usable = boundary.loaded && boundary.checksum !== 'mismatch';
  // Missions in the city, with the latest saved investigation of each (reports are verified by the caller).
  const missions = citySpecs(cityId).map(spec => {
    const av = availability(spec, R), report = reports.filter(r => r.mission === spec.id).sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))[0] || null;
    const link = usable && LINKS[spec.type] ? LINKS[spec.type](spec, R, nb) : { neighborhoods: [], method: usable ? `No geographic link defined for ${spec.type}` : `Boundaries ${boundary.checksum}: no geographic link computed`, basis: 'missing' };
    const dates = (spec.evidence || []).map(e => e.retrieved).filter(d => Number.isFinite(Date.parse(d))).sort();
    const requirements = report ? report.requirements.map(q => ({ id: q.id, label: q.label, status: q.status, basis: 'missing', from: 'saved-run', ref: `exec:${report.execution}` })) : (spec.requirements || []).map(q => ({ id: q.id, label: q.label, status: q.status, basis: 'missing', from: 'specification', ref: `${spec.id} specification` }));
    return { id: spec.id, title: spec.title, category: spec.category, type: spec.type, status: spec.status, availability: av.status, availabilityReason: av.reason, place: spec.place,
      evidence: (spec.evidence || []).map(e => ({ id: e.id, title: e.title, publisher: e.publisher, license: e.license, retrieved: e.retrieved, resource: e.resource })),
      oldest: dates[0] || null, newest: dates.at(-1) || null, oldestAgeDays: dates[0] ? days(dates[0], now) : null, limitations: spec.limitations, requirements, link,
      report: report ? { execution: report.execution, digest: report.digest, class: executionClass(report), model: modelOf(report), status: report.status, endedAt: report.endedAt, findings: report.findings.filter(f => f.origin === 'this-execution').length } : null };
  });
  step('missions', `${missions.length} mission(s) in ${city.name.en}: ${missions.map(m => `${m.id} (${m.availability}${m.report ? `, saved run ${m.report.execution.slice(0, 8)}` : ', no saved run'})`).join('; ')}.`);
  // Overlaps: shared analysis neighbourhoods (observed geometry or name keys).
  const byN = new Map(); for (const m of missions) for (const n of m.link.neighborhoods) byN.set(n, [...(byN.get(n) || []), m.id]);
  const overlaps = [...byN].filter(([, ms]) => ms.length > 1).map(([n, ms]) => ({ neighborhood: n, missions: ms, basis: 'observed', how: ms.map(id => missions.find(m => m.id === id).link.method) }));
  step('overlaps', overlaps.length ? `Shared ${B.unit}(s): ${overlaps.map(o => o.neighborhood).join(', ')}.` : `No ${B.unit} is shared by two missions.`);
  // Observed facts where missions overlap: bundled source data for the area, and saved computed results that apply to it.
  const facts = []; const housing = missions.find(m => m.type === 'housing-distribution'), mobility = missions.find(m => m.type === 'mobility-signal-timing');
  for (const o of overlaps) {
    if (housing && R[HOUSING.pipeline]) { const r = rowFor(R, o.neighborhood);
      facts.push({ neighborhood: o.neighborhood, mission: housing.id, basis: 'observed', text: `${o.neighborhood}: ${r.projects} pipeline project(s), ${r.units} planned units of which ${r.affordable} affordable; ${r.completed ?? 'no'} net units completed since 2015 (${r.completedAffordable ?? 'n/a'} affordable).`, refs: [HOUSING.pipeline, HOUSING.byNeighborhood] }); }
    const mrep = mobility && reports.filter(r => r.mission === mobility.id).sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))[0];
    if (mrep && mobility.link.neighborhoods.includes(o.neighborhood)) for (const f of mrep.findings.filter(f => f.tool === 'sim.compare' && f.kind === 'computed-output'))
      facts.push({ neighborhood: o.neighborhood, mission: mobility.id, basis: 'computed', agent: f.agent, text: f.text, refs: [f.ref], uncertainty: f.uncertainty });
  }
  // Shared evidence: the same bundled file or dataset id cited by two missions. Same publisher is context, not shared evidence.
  const cite = new Map(); for (const m of missions) for (const e of m.evidence) for (const k of [e.resource, e.id]) cite.set(k, [...new Set([...(cite.get(k) || []), m.id])]);
  const shared = [...cite].filter(([, ms]) => ms.length > 1).map(([k, ms]) => ({ evidence: k, missions: ms, basis: 'observed' }));
  const publishers = [...new Set(missions.flatMap(m => m.evidence.map(e => e.publisher)))];
  // Shared unresolved requirements (same requirement id in two missions).
  const reqBy = new Map(); for (const m of missions) for (const q of m.requirements) reqBy.set(q.id, [...(reqBy.get(q.id) || []), { mission: m.id, label: q.label, status: q.status }]);
  const sharedGaps = [...reqBy].filter(([, xs]) => new Set(xs.map(x => x.mission)).size > 1).map(([id, xs]) => ({ id, missions: xs.map(x => x.mission), labels: [...new Set(xs.map(x => x.label))], basis: 'missing' }));
  step('evidence', `${shared.length} shared evidence item(s); ${publishers.length} publisher(s); ${sharedGaps.length} unresolved requirement(s) shared by missions.`);
  // Conflicts genuinely present: geography inconsistent with boundaries, saved results that no longer match the bundled data,
  // and recorded or executed disagreements (carried with their owners, never resolved here).
  const conflicts = [];
  for (const m of missions) { if (m.link.basis === 'observed' && m.link.unmatched) conflicts.push({ kind: 'geography', missions: [m.id], says: `${m.link.unmatched} location(s) of ${m.id} fall in no ${B.unit} or use an unknown name`, basis: 'observed' });
    if (usable && !neighbourhoodOf(m.place.center, nb) && m.type !== 'housing-distribution') conflicts.push({ kind: 'geography', missions: [m.id], says: `The declared centre of ${m.id} is outside every ${B.unit}`, basis: 'observed' }); }
  const hrep = housing && reports.filter(r => r.mission === housing.id).sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))[0];
  const saved = hrep?.calls.find(c => c.tool === 'housing.pipeline' && c.status === 'ok')?.output;
  if (saved && R[HOUSING.pipeline]) for (const row of saved.rows || []) { const now2 = rowFor(R, row.neighborhood);
    if (now2.affordable !== row.affordable || now2.projects !== row.projects) conflicts.push({ kind: 'stale-result', missions: [housing.id], says: `Saved run ${hrep.execution.slice(0, 8)} recorded ${row.affordable} affordable units in ${row.neighborhood}; the bundled data now gives ${now2.affordable}`, basis: 'computed' }); }
  const disagreements = reports.filter(r => missions.some(m => m.report?.execution === r.execution)).flatMap(r => r.disagreements.map(d => ({ mission: r.mission, execution: r.execution, id: d.id, subject: d.subject, recorded: !!d.recorded, positions: d.positions, standing: d.standing })));
  step('conflicts', `${conflicts.length} cross-mission conflict(s) detected; ${disagreements.length} disagreement(s) carried from saved investigations, unresolved.`);
  // Agent contributions: who produced what, where; recorded-run authors from the published record, executed findings from saved runs.
  const contributions = new Map(), add = (agent, x) => { if (!agent) return; const c = contributions.get(agent) || { agent, items: [] }; c.items.push(x); contributions.set(agent, c); };
  for (const f of R[WORK_FILE]?.run?.findings || []) add(f.agent, { mission: mobility?.id || null, origin: 'recorded-run', ref: `${WORK_FILE}#${f.id}`, tool: f.tool, basis: 'recorded' });
  for (const m of missions) { const r = reports.find(x => x.execution === m.report?.execution); for (const f of r?.findings.filter(f => f.origin === 'this-execution') || []) add(f.agent, { mission: m.id, origin: 'this-execution', ref: f.ref, id: f.id, kind: f.kind, basis: f.kind === 'model-hypothesis' ? 'hypothesis' : 'computed' }); }
  for (const d of disagreements) for (const p of d.positions) if (p.agent) add(p.agent, { mission: d.mission, origin: d.recorded ? 'recorded-run' : 'this-execution', ref: `exec:${d.execution}#${d.id}`, disagreement: d.subject, basis: d.recorded ? 'recorded' : 'computed' });
  // Opportunities: questions worth investigating. Hypotheses by construction; each names the evidence it would need.
  const opportunities = [];
  for (const o of overlaps) { const need = [...new Set(o.missions.flatMap(id => missions.find(m => m.id === id).requirements.filter(q => q.status !== 'met').map(q => q.label)))];
    opportunities.push({ basis: 'hypothesis', neighborhood: o.neighborhood, missions: o.missions, text: `Both missions concern ${o.neighborhood}. Whether planned or completed housing there relates to traffic on the modelled approach is untested: no bundled evidence links the two datasets, and no causal claim can be made.`, needs: need.slice(0, 6) }); }
  for (const m of missions) if (!m.report && m.availability === 'available') opportunities.push({ basis: 'hypothesis', missions: [m.id], text: `No saved investigation of ${m.id}: run and save it to include executed findings in this comparison.`, needs: [] });
  for (const m of missions) if (m.availability !== 'available') opportunities.push({ basis: 'missing', missions: [m.id], text: `${m.id} cannot run here: ${m.availabilityReason}`, needs: [] });
  for (const g of sharedGaps) opportunities.push({ basis: 'hypothesis', missions: g.missions, text: `The same unresolved requirement (${g.labels.join(' / ')}) blocks ${g.missions.length} missions; addressing it once may serve both.`, needs: g.labels });
  step('opportunities', `${opportunities.length} opportunity(ies) listed as hypotheses or gaps, none as findings.`);
  step('review', 'No relationship between missions is asserted beyond co-location; nothing is accepted or approved; human review required.');
  return { city: { id: city.id, name: city.name, center: city.center, bbox: city.bbox }, boundary, missions, overlaps, facts, shared, publishers, sharedGaps, conflicts, disagreements,
    contributions: [...contributions.values()], opportunities, log, review: { required: true, status: 'awaiting-human-review', by: 'A qualified independent reviewer chosen by the person; CORE sends nothing.' } };
}
// A savable, tamper-evident summary. Links each mission to its saved investigation by id and digest.
export async function citySummary(ctx, { id = crypto.randomUUID(), at = new Date().toISOString() } = {}) {
  const s = { kind: 'core-city-summary', version: CITY_VERSION, mode: 'deterministic-comparison', id, createdAt: at, city: ctx.city, boundary: ctx.boundary,
    missions: ctx.missions.map(m => ({ id: m.id, title: m.title, category: m.category, availability: m.availability, neighborhoods: m.link.neighborhoods.length, linkMethod: m.link.method, oldest: m.oldest, newest: m.newest, report: m.report, requirements: m.requirements, limitations: m.limitations })),
    overlaps: ctx.overlaps, facts: ctx.facts, shared: ctx.shared, sharedGaps: ctx.sharedGaps, conflicts: ctx.conflicts, disagreements: ctx.disagreements.map(d => ({ mission: d.mission, execution: d.execution, id: d.id, subject: d.subject, recorded: d.recorded, owners: d.positions.map(p => p.agent).filter(Boolean), standing: d.standing })),
    contributions: ctx.contributions.map(c => ({ agent: c.agent, missions: [...new Set(c.items.map(i => i.mission).filter(Boolean))], recorded: c.items.filter(i => i.origin === 'recorded-run').length, executed: c.items.filter(i => i.origin === 'this-execution').length, refs: c.items.map(i => i.ref).slice(0, 20) })),
    opportunities: ctx.opportunities, log: ctx.log, review: { ...ctx.review, accepted: false }, validated: false, approved: false };
  s.digest = await digest(s); return s;
}
