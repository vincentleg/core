// Exploratory energy accounting, never a human-worth score or evidence of field efficacy.
import { createRequire } from 'node:module';
const KNOW = createRequire(import.meta.url)('../../src/knowledge.js');
const positive = x => { if (!Number.isFinite(x) || x <= 0) throw Error('Positive finite SI quantity required'); return x; };
export const averagePower = (joules, seconds) => positive(positive(joules) / positive(seconds));
export const saganIndex = watts => (Math.log10(positive(watts)) - 6) / 10;
export function energyScenario(ej, days) {
  const watts = averagePower(positive(ej) * 1e18, positive(days) * 86400);
  return { energyEJ: ej, days, averageWatts: watts, index: saganIndex(watts), convention: 'Sagan interpolation; total energy supply proxy, not useful work', civilizationRank: null, efficacyValidated: false, authorizesRealWorld: false };
}
export function validateResearch(catalog, { now = new Date().toISOString().slice(0, 10) } = {}) {
  const issues = [], ids = new Set();
  const day = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s && s <= now;
  const url = s => { try { const u = new URL(s); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } };
  if (!day(now) || catalog?.version !== 1 || !Array.isArray(catalog.sources) || !catalog.sources.length || !Array.isArray(catalog.claims) || !catalog.claims.length) return { state: 'BLOCKED', issues: ['Invalid research catalog'], independentlyVerified: false };
  for (const s of catalog.sources) {
    if (!s || !/^[a-z0-9-]+$/.test(s.id || '') || ids.has(s.id) || !url(s.url) || !s.citation || !s.locator || !day(s.checkedOn) || !['primary', 'institutional', 'primary-bibliography-only'].includes(s.evidence) || !Number.isInteger(s.reviewAfterDays) || s.reviewAfterDays < 1) issues.push('Invalid source provenance');
    if (s) ids.add(s.id);
    if (s && day(s.checkedOn) && Date.parse(now) - Date.parse(s.checkedOn) > s.reviewAfterDays * 86400000) issues.push('Source review overdue');
  }
  const claims = new Set();
  for (const c of catalog.claims) {
    if (!c || !c.id || claims.has(c.id) || !c.text || !c.limitations || !['established', 'reported-historical', 'hypothesis', 'proposal', 'speculative'].includes(c.kind) || !Array.isArray(c.sources) || !c.sources.length || c.sources.some(id => !ids.has(id))) issues.push('Invalid claim or unresolved citation');
    if (c) claims.add(c.id);
  }
  return { state: issues.length ? 'BLOCKED' : 'VALIDATED_PROVENANCE', issues: [...new Set(issues)], sources: ids.size, claims: claims.size, independentlyVerified: false };
}
export function researchKnowledge(catalog, options) {
  if (validateResearch(catalog, options).state !== 'VALIDATED_PROVENANCE') throw Error('Research provenance blocked');
  return KNOW.load({
    sources: catalog.sources.map(s => ({ id: s.id, name: s.citation, url: s.url, license: s.redistribution })),
    documents: catalog.claims.map(c => {
      const s = catalog.sources.find(s => s.id === c.sources[0]);
      return { id: `research-${c.id}`, source: s.id, url: s.url, retrieved_at: s.checkedOn, version: 1, status: 'approved', stale_after_days: s.reviewAfterDays, title: c.id, topics: ['civilization', c.kind], text: c.text, confidence: c.kind, limitations: c.limitations, references: c.sources };
    })
  }); // Separate curated collection; never rewrites agents, permissions or recorded mission knowledge.
}
