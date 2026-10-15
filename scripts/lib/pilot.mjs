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
