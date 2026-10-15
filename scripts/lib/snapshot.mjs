// Shared Node snapshot reader. Integrity is mandatory; historical replay never implies current validity.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const DAY = 86400000;
export function loadSnapshot(directory, { mode = 'replay', policies = {}, now = new Date().toISOString() } = {}) {
  if (!['replay', 'current'].includes(mode) || !Number.isFinite(Date.parse(now))) throw Error('Invalid snapshot mode or clock');
  const root = fs.realpathSync(directory), manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const validDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)) && Date.parse(v) <= Date.parse(now) + 300000;
  if (!validDate(manifest.generated_at) || !Array.isArray(manifest.datasets) || !manifest.datasets.length) throw Error('Invalid snapshot manifest/date');
  const data = {}, verified = {}, entries = [], seen = new Set(), ids = new Set(), keys = new Set();
  for (const d of manifest.datasets) {
    if (!/^[A-Za-z0-9_-]+\.(?:geo)?json$/.test(d.file || '') || seen.has(d.file) || !/^[a-f0-9]{64}$/.test(d.sha256 || '') || !validDate(d.retrieved_at)) throw Error('Invalid snapshot entry');
    const key = d.file.replace(/\.(?:geo)?json$/, '');
    if (typeof d.id !== 'string' || !d.id || ids.has(d.id) || keys.has(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw Error('Invalid or duplicate snapshot identity');
    seen.add(d.file); ids.add(d.id); keys.add(key);
    const filename = fs.realpathSync(path.join(root, d.file));
    if (!filename.startsWith(root + path.sep) || fs.statSync(filename).size > 8 * 1024 * 1024) throw Error('Snapshot file outside boundary or too large');
    const bytes = fs.readFileSync(filename);
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== d.sha256) throw Error('Snapshot checksum mismatch: ' + d.file);
    verified[key] = 'ok'; data[key] = JSON.parse(bytes.toString('utf8'));
    const budget = policies[d.id]?.freshnessDays ?? null, ageDays = Math.max(0, (Date.parse(now) - Date.parse(d.retrieved_at)) / DAY);
    const status = Number.isFinite(budget) && budget >= 0 ? (ageDays <= budget ? 'fresh' : 'stale') : 'unclassified';
    entries.push({ file: d.file, retrievedAt: d.retrieved_at, ageDays: +ageDays.toFixed(2), budgetDays: budget, status });
  }
  const freshness = { mode, checkedAt: now, snapshotAt: manifest.generated_at, currentEligible: entries.every(e => e.status === 'fresh'), entries };
  if (mode === 'current' && !freshness.currentEligible) throw Error('Current-data analysis blocked: stale or unclassified snapshot sources');
  return { manifest, data, verified, freshness };
}
