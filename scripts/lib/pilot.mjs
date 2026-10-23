// Preparation only: measured observations, synthetic fixtures and efficacy are separate claims.
import crypto from 'node:crypto';
export const payloadHash = rows => crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const date = s => {
  if (typeof s !== 'string' || !/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(s) || !Number.isFinite(Date.parse(s))) return false;
  const [year, month, day] = s.slice(0, 10).split('-').map(Number);
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
};
const https = s => { try { const u = new URL(s); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } };
export function validateCounts(pkg, { allowSynthetic = false } = {}) {
  const issues = [], m = pkg?.manifest, rows = pkg?.rows;
  if (!m || !Array.isArray(rows) || !rows.length || rows.length > 100000) return { state: 'BLOCKED', issues: ['Missing manifest or bounded observations'], authorizesRealWorld: false };
  const allowed = (o, fields) => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).every(k => fields.includes(k));
  if (!allowed(pkg, ['manifest', 'rows']) || !allowed(m, ['version', 'id', 'kind', 'corridor', 'sourceUrl', 'retrievedAt', 'rights', 'payloadSha256']) || !allowed(m.rights, ['status', 'license', 'evidenceUrl', 'checkedAt', 'attribution'])) issues.push('Unexpected package metadata: privacy/schema gate');
  if (m.version !== 1 || !/^[a-z0-9-]{2,80}$/.test(m.id || '') || !https(m.sourceUrl) || !date(m.retrievedAt) || Date.parse(m.retrievedAt) > Date.now() + 300000 || !m.corridor) issues.push('Invalid provenance');
  if (!['measured', 'synthetic-fixture'].includes(m.kind) || (m.kind !== 'measured' && !allowSynthetic)) issues.push('Measured data required; fixtures are not observations');
  if (m.rights?.status !== 'VERIFIED' || !['ODC-PDDL-1.0', 'CC0-1.0', 'CC-BY-4.0', 'CORE-SYNTHETIC-FIXTURE'].includes(m.rights?.license) || !https(m.rights?.evidenceUrl) || !date(m.rights?.checkedAt)) issues.push('Reuse rights unverified');
  if (Date.parse(m.rights?.checkedAt) > Date.now() + 300000) issues.push('Future rights verification');
  if (m.kind === 'measured' && m.rights?.license === 'CORE-SYNTHETIC-FIXTURE') issues.push('Fixture license cannot authorize measured data');
  if (m.rights?.license === 'CC-BY-4.0' && (typeof m.rights.attribution !== 'string' || !m.rights.attribution.trim())) issues.push('Required attribution missing');
  if (!/^[a-f0-9]{64}$/.test(m.payloadSha256 || '') || m.payloadSha256 !== payloadHash(rows)) issues.push('Observation checksum mismatch');
  const keys = new Set(), intervals = new Map(), fields = new Set(['start', 'end', 'site', 'direction', 'mode', 'sourceId', 'corridor', 'count', 'unit']);
  for (const r of rows) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) { issues.push('Invalid observation object'); continue; }
    if (Object.keys(r).some(k => !fields.has(k))) issues.push('Unexpected observation fields: privacy/schema gate');
    const k = [r.start, r.end, r.site, r.direction, r.mode].join('|');
    if (keys.has(k)) issues.push('Duplicate observation'); keys.add(k);
    if (!date(r.start) || !date(r.end) || Date.parse(r.end) <= Date.parse(r.start) || Date.parse(r.end) - Date.parse(r.start) > 86400000 || Date.parse(r.end) > Date.parse(m.retrievedAt)) issues.push('Invalid observation interval');
    if (r.sourceId !== m.id || r.corridor !== m.corridor || !/^[A-Za-z0-9_-]{1,80}$/.test(r.site || '') || !['NB', 'SB', 'EB', 'WB', 'BOTH'].includes(r.direction) || !['motor_vehicle', 'bicycle', 'pedestrian'].includes(r.mode) || !Number.isSafeInteger(r.count) || r.count < 0 || r.unit !== 'count') issues.push('Invalid observation, unit or scope');
    const group = [r.site, r.direction, r.mode].join('|');
    if (!intervals.has(group)) intervals.set(group, []);
    intervals.get(group).push([Date.parse(r.start), Date.parse(r.end)]);
  }
  for (const group of intervals.values()) { group.sort((a, b) => a[0] - b[0]); for (let i = 1; i < group.length; i++) if (group[i][0] < group[i - 1][1]) issues.push('Overlapping observation intervals'); }
  return { state: issues.length ? 'BLOCKED' : 'VALIDATED_INPUT', kind: m.kind, rows: rows.length, issues: [...new Set(issues)], calibrated: false, independentReview: false, authorizesRealWorld: false };
}
export function compareCounts(observed, predicted) {
  if (!Array.isArray(observed) || !observed.length || !Array.isArray(predicted) || observed.length !== predicted.length || [...observed, ...predicted].some(x => !Number.isFinite(x) || x < 0)) throw Error('Aligned nonnegative finite counts required');
  const total = observed.reduce((a, b) => a + b, 0);
  if (!total) throw Error('Zero observed denominator: WAPE is not evaluable');
  const error = observed.reduce((s, x, i) => s + Math.abs(x - predicted[i]), 0);
  if (!Number.isFinite(total) || !Number.isFinite(error)) throw Error('Numeric overflow');
  return { n: observed.length, mae: error / observed.length, wape: error / total, efficacyValidated: false };
}
// Phase 14 scaffolding: preregistered day split, sealed holdout, training-days mean baseline, frozen models.
// Leakage is prevented by construction: partition() never returns holdout rows, predictions are hashed before
// evaluateHoldout() opens them, and every result stays uncalibrated/unreviewed until a human reviewer says otherwise.
const sha = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const DAY = /^\d{4}-\d{2}-\d{2}$/, dayOf = r => r.start.slice(0, 10);
const slot = r => [r.site, r.direction, r.mode, r.start.slice(11, 16), Date.parse(r.end) - Date.parse(r.start)].join('|');
export function preregister({ id, calibration, validation = [], holdout, thresholds = null }) {
  const days = [...calibration, ...validation, ...holdout];
  if (!/^[a-z0-9-]{2,80}$/.test(id || '') || !calibration?.length || !holdout?.length || days.some(d => !DAY.test(d) || !Number.isFinite(Date.parse(d)))) throw Error('Protocol needs an id, calibration and holdout days (YYYY-MM-DD)');
  if (new Set(days).size !== days.length) throw Error('Protocol days must be disjoint');
  if ([...calibration, ...validation].some(d => d >= [...holdout].sort()[0])) throw Error('Holdout days must follow every calibration/validation day');
  if (thresholds !== null && (!thresholds || typeof thresholds !== 'object' || Object.keys(thresholds).some(k => !['maxWape', 'maxAbsBias'].includes(k)) || Object.values(thresholds).some(x => !Number.isFinite(x) || x <= 0))) throw Error('Thresholds: positive maxWape/maxAbsBias ratios or null');
  const protocol = { version: 1, id, calibration: [...calibration].sort(), validation: [...validation].sort(), holdout: [...holdout].sort(), thresholds, metrics: ['mae', 'wape', 'biasByDirection'], unit: 'site|direction|mode|start-time|duration' };
  return { ...protocol, protocolSha256: sha(protocol) };
}
const checkProtocol = p => { const { protocolSha256, ...rest } = p || {}; if (!protocolSha256 || sha(rest) !== protocolSha256) throw Error('Protocol altered after preregistration'); return p; };
export function partition(pkg, protocol, { allowSynthetic = false } = {}) {
  checkProtocol(protocol);
  const v = validateCounts(pkg, { allowSynthetic }); if (v.state !== 'VALIDATED_INPUT') return { state: 'BLOCKED', issues: v.issues };
  const of = new Map([...protocol.calibration.map(d => [d, 'calibration']), ...protocol.validation.map(d => [d, 'validation']), ...protocol.holdout.map(d => [d, 'holdout'])]);
  const out = { calibration: [], validation: [], holdout: [] }, unassigned = new Set();
  for (const r of pkg.rows) { const s = of.get(dayOf(r)); if (s) out[s].push(r); else unassigned.add(dayOf(r)); }
  if (unassigned.size) return { state: 'BLOCKED', issues: [`Rows on days outside the protocol: ${[...unassigned].sort().join(', ')}`] };
  if (Object.values(out).some((rows, i) => i !== 1 && !rows.length)) return { state: 'BLOCKED', issues: ['Calibration and holdout must both contain observations'] };
  return { state: 'PARTITIONED', protocolSha256: protocol.protocolSha256, kind: v.kind, calibration: out.calibration, validation: out.validation,
    holdout: { sealed: true, rows: out.holdout.length, commitment: sha(out.holdout) }, calibrated: false, independentReview: false, authorizesRealWorld: false };
}
export function meanBaseline(calibrationRows) {
  const acc = new Map();
  for (const r of calibrationRows) { const k = slot(r), a = acc.get(k) || [0, 0]; acc.set(k, [a[0] + r.count, a[1] + 1]); }
  return { kind: 'training-days-mean', table: Object.fromEntries([...acc].sort().map(([k, [s, n]]) => [k, s / n])) };
}
export function freeze(model, parts) {
  if (parts?.state !== 'PARTITIONED' || !model || typeof model.kind !== 'string' || !model.table || typeof model.table !== 'object') throw Error('Freeze needs a partition and a {kind, table} model');
  return { protocolSha256: parts.protocolSha256, holdoutCommitment: parts.holdout.commitment, modelSha256: sha(model), model };
}
export function evaluateHoldout(pkg, protocol, frozen, { allowSynthetic = false } = {}) {
  checkProtocol(protocol);
  const parts = partition(pkg, protocol, { allowSynthetic }); if (parts.state !== 'PARTITIONED') return parts;
  if (!Array.isArray(frozen) || !frozen.length || !frozen.some(f => f?.model?.kind === 'training-days-mean')) throw Error('A frozen training-days-mean baseline must be evaluated with any candidate');
  const holdout = pkg.rows.filter(r => protocol.holdout.includes(dayOf(r)));
  if (sha(holdout) !== parts.holdout.commitment) throw Error('Holdout commitment mismatch');
  const results = frozen.map(f => {
    if (f.protocolSha256 !== protocol.protocolSha256 || f.holdoutCommitment !== parts.holdout.commitment || sha(f.model) !== f.modelSha256) throw Error('Model was not frozen against this protocol and sealed holdout');
    const missing = holdout.filter(r => !Number.isFinite(f.model.table[slot(r)]));
    if (missing.length) return { kind: f.model.kind, modelSha256: f.modelSha256, state: 'NOT_EVALUABLE', reason: `${missing.length} holdout slots without a prediction (never treated as zero)` };
    let m; try { m = compareCounts(holdout.map(r => r.count), holdout.map(r => f.model.table[slot(r)])); } catch (e) { return { kind: f.model.kind, modelSha256: f.modelSha256, state: 'NOT_EVALUABLE', reason: e.message }; }
    const bias = {}; for (const d of new Set(holdout.map(r => r.direction))) { const rs = holdout.filter(r => r.direction === d), y = rs.reduce((s, r) => s + r.count, 0); bias[d] = y ? rs.reduce((s, r) => s + f.model.table[slot(r)] - r.count, 0) / y : null; }
    const t = protocol.thresholds, verdict = !t ? 'NO_PREREGISTERED_THRESHOLD' : (t.maxWape === undefined || m.wape <= t.maxWape) && (t.maxAbsBias === undefined || Object.values(bias).every(b => b !== null && Math.abs(b) <= t.maxAbsBias)) ? 'WITHIN_THRESHOLDS' : 'FAILED_THRESHOLDS';
    return { kind: f.model.kind, modelSha256: f.modelSha256, state: 'EVALUATED', n: m.n, mae: m.mae, wape: m.wape, biasByDirection: bias, verdict };
  });
  return { state: 'HOLDOUT_OPENED', protocolSha256: protocol.protocolSha256, holdoutCommitment: parts.holdout.commitment, kind: parts.kind, results,
    note: 'Record this result append-only; a revised model needs a new protocol and a new holdout.', calibrated: false, independentReview: false, efficacyValidated: false, authorizesRealWorld: false };
}
