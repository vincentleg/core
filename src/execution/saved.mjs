// CORE R29 — saved agent investigations, without loading the engine: browser-local persistence, integrity checks and
// references. Shared by the Earth page, My CORE, the contribution store and the review packet. The execution class is derived from the call log, never from a label:
// "local-model" only if a local-model tool call succeeded and produced hypotheses; otherwise "deterministic". The
// published recorded investigation is a third class ("recorded") and is never stored here. A reference built from a
// report is a bounded snapshot (identity, digest, evidence refs); it always says not validated and not approved.
export const VERSION = 'core-exec-1';
export async function digest(value) { const b = new TextEncoder().encode(JSON.stringify(value ?? null)); return [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map(x => x.toString(16).padStart(2, '0')).join(''); }
export async function verifyReport(rep) {
  if (rep?.kind !== 'core-investigation-report' || rep.version !== VERSION || rep.mode !== 'local-execution') throw Error('Unknown report');
  const { digest: d, ...rest } = rep; if (await digest(rest) !== d) throw Error('Report digest mismatch: altered or incomplete');
  if (rep.review?.accepted !== false || rep.externalActions?.allowed !== false) throw Error('Report claims an approval code cannot grant');
  return rep;
}
// Browser-local persistence, only in the Storage object passed in. Saving is an explicit act; nothing is evicted silently.
export const STORE_KEY = 'core.executions.v1', MAX_SAVED = 20, SAVABLE = Object.freeze(['completed', 'completed-with-failures']);
const readSaved = st => { try { const v = JSON.parse(st.getItem(STORE_KEY)); return Array.isArray(v) ? v.map(x => (x?.report ? x : x?.kind === 'core-investigation-report' ? { savedAt: x.endedAt, report: x } : null)).filter(Boolean) : []; } catch { return []; } };
const writeSaved = (all, st) => { try { st.setItem(STORE_KEY, JSON.stringify(all)); return true; } catch { return false; } };
export const savedEntries = st => readSaved(st);
export const listReports = st => readSaved(st).map(e => e.report);
export function saveReport(rep, st, at = new Date().toISOString()) {
  if (rep?.mode !== 'local-execution' || !SAVABLE.includes(rep.status)) return { ok: false, reason: 'Only a finished local execution can be saved.' };
  const all = readSaved(st); if (all.some(e => e.report.execution === rep.execution)) return { ok: true, already: true };
  if (all.length >= MAX_SAVED) return { ok: false, reason: `${MAX_SAVED} investigations are already saved; delete one in My CORE first.` };
  all.push({ savedAt: at, report: rep }); return writeSaved(all, st) ? { ok: true } : { ok: false, reason: 'Browser storage unavailable or full.' };
}
export function deleteReport(id, st) { const all = readSaved(st), rest = all.filter(e => e.report.execution !== id); return rest.length < all.length && writeSaved(rest, st); }

export const CLASSES = Object.freeze(['recorded', 'deterministic', 'local-model']);
export const LIMITS = Object.freeze({ findings: 60, requirements: 12, disagreements: 12 });
const s = (x, n) => (typeof x === 'string' && x.length <= n ? x : null);
const HEX64 = /^[0-9a-f]{64}$/;

export function executionClass(rep) {
  const call = (rep?.calls || []).find(c => c.tool === 'reason.hypotheses' && c.status === 'ok' && c.provenance?.executor === 'local-model');
  const made = (rep?.findings || []).some(f => f.kind === 'model-hypothesis' && f.origin === 'this-execution' && f.tool === 'reason.hypotheses');
  return call && made && rep.reasoning?.status === 'active' ? 'local-model' : 'deterministic';
}
export const modelOf = rep => (executionClass(rep) === 'local-model' ? s(rep.reasoning.model, 80) : null);

// Snapshot kept with a contribution: identity, integrity and evidence references, not the report body.
export function investigationRef(rep) {
  return cleanRef({
    execution: rep.execution, digest: rep.digest, mission: rep.mission, class: executionClass(rep), model: modelOf(rep), mode: rep.mode, status: rep.status,
    startedAt: rep.startedAt, endedAt: rep.endedAt, recordedRun: rep.reads?.recordedRun ?? null, objective: rep.objective,
    agents: (rep.agents || []).map(a => a.agent),
    findings: (rep.findings || []).filter(f => f.origin === 'this-execution').map(f => ({ id: f.id, kind: f.kind, agent: f.agent, ref: f.ref })),
    requirements: (rep.requirements || []).map(q => q.id), disagreements: (rep.disagreements || []).filter(d => !d.recorded).map(d => d.subject)
  });
}
// Accepts only a well-formed, bounded snapshot; validation and approval flags are forced off whatever the input says.
export function cleanRef(v) {
  if (!v || typeof v !== 'object' || !s(v.execution, 64) || !HEX64.test(v.digest || '') || !s(v.mission, 80) || !['deterministic', 'local-model'].includes(v.class) || v.mode !== 'local-execution') return null;
  const at = x => (s(x, 40) && Number.isFinite(Date.parse(x)) ? x : null), list = (a, n, f) => (Array.isArray(a) ? a.slice(0, n).map(f).filter(Boolean) : []);
  return {
    execution: v.execution, digest: v.digest, mission: v.mission, class: v.class, model: v.class === 'local-model' ? s(v.model, 80) : null, mode: 'local-execution',
    status: s(v.status, 30), startedAt: at(v.startedAt), endedAt: at(v.endedAt), recordedRun: s(v.recordedRun, 64), objective: s(v.objective, 600) || '',
    agents: list(v.agents, 10, a => s(a, 80)),
    findings: list(v.findings, LIMITS.findings, f => (f && s(f.id, 8) && s(f.kind, 30) ? { id: f.id, kind: f.kind, agent: s(f.agent, 80), ref: s(f.ref, 120) } : null)),
    requirements: list(v.requirements, LIMITS.requirements, q => s(q, 40)), disagreements: list(v.disagreements, LIMITS.disagreements, d => s(d, 160)),
    validated: false, approved: false
  };
}
// Evidence items for the contribution's lifecycle record (src/contrib/lifecycle.mjs). Kind "simulation" without a
// `need`: it documents what was computed and never satisfies the mission's calibration or review requirements.
export function lifecycleEvidence(ref) {
  const r = cleanRef(ref); if (!r) return [];
  return [{ kind: 'simulation', ref: `exec:${r.execution}`, source: `local ${r.class === 'local-model' ? 'execution with a local AI model' : 'deterministic execution'} in this browser · report SHA-256 ${r.digest}` },
    ...(r.recordedRun ? [{ kind: 'recorded-agent-work', ref: `data/intelligence/work.json#run:${r.recordedRun}`, source: 'recorded investigation read by the execution, not re-run' }] : [])];
}

// R31 — city-level summaries (src/execution/city.mjs): deterministic comparisons of missions and of saved agent
// investigations. Stored only in this browser, explicitly; verified by digest; never validated or approved.
export const CITY_VERSION = 'core-city-1', CITY_KEY = 'core.city.v1', MAX_CITY = 10;
export async function verifyCitySummary(sum) {
  if (sum?.kind !== 'core-city-summary' || sum.version !== CITY_VERSION || sum.mode !== 'deterministic-comparison') throw Error('Unknown city summary');
  const { digest: d, ...rest } = sum; if (await digest(rest) !== d) throw Error('City summary digest mismatch: altered or incomplete');
  if (sum.review?.accepted !== false || sum.validated !== false || sum.approved !== false) throw Error('City summary claims a validation or approval code cannot grant');
  return sum;
}
const readCity = st => { try { const v = JSON.parse(st.getItem(CITY_KEY)); return Array.isArray(v) ? v.filter(x => x?.kind === 'core-city-summary') : []; } catch { return []; } };
export const listCitySummaries = st => readCity(st);
export function saveCitySummary(sum, st) {
  const all = readCity(st); if (all.some(x => x.id === sum.id)) return { ok: true, already: true };
  if (all.length >= MAX_CITY) return { ok: false, reason: `${MAX_CITY} city summaries are already saved; delete one in My CORE first.` };
  all.push(sum); try { st.setItem(CITY_KEY, JSON.stringify(all)); return { ok: true }; } catch { return { ok: false, reason: 'Browser storage unavailable or full.' }; }
}
export function deleteCitySummary(id, st) { const all = readCity(st), rest = all.filter(x => x.id !== id); if (rest.length === all.length) return false; try { st.setItem(CITY_KEY, JSON.stringify(rest)); return true; } catch { return false; } }
// Reference kept with a contribution: summary identity and digest plus the investigations it compared.
export function cityRef(sum) { return cleanCityRef({ id: sum.id, digest: sum.digest, city: sum.city.id, createdAt: sum.createdAt, missions: sum.missions.map(m => m.id), investigations: sum.missions.filter(m => m.report).map(m => ({ execution: m.report.execution, digest: m.report.digest, mission: m.id })) }); }
export function cleanCityRef(v) {
  if (!v || typeof v !== 'object' || !s(v.id, 64) || !HEX64.test(v.digest || '') || !s(v.city, 40)) return null;
  return { id: v.id, digest: v.digest, city: v.city, createdAt: s(v.createdAt, 40), missions: (Array.isArray(v.missions) ? v.missions : []).slice(0, 8).map(m => s(m, 80)).filter(Boolean),
    investigations: (Array.isArray(v.investigations) ? v.investigations : []).slice(0, 6).map(i => (i && s(i.execution, 64) && HEX64.test(i.digest || '') ? { execution: i.execution, digest: i.digest, mission: s(i.mission, 80) } : null)).filter(Boolean),
    validated: false, approved: false };
}
// Lifecycle evidence for a city summary: the comparison itself (a compilation of agent work) and each investigation.
export function cityLifecycleEvidence(ref) {
  const r = cleanCityRef(ref); if (!r) return [];
  return [{ kind: 'recorded-agent-work', ref: `city:${r.id}`, source: `local city summary (deterministic comparison of missions and saved investigations) · SHA-256 ${r.digest}` },
    ...r.investigations.map(i => ({ kind: 'simulation', ref: `exec:${i.execution}`, source: `saved investigation of ${i.mission} · report SHA-256 ${i.digest}` }))];
}
