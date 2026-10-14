// CORE — automated problem discovery by snapshot comparison (Phase 10). Pure and deterministic.
// Compares the published (baseline) snapshot of a city with a newer one fetched by the scheduler and reports only what
// changed on designated safety networks: new or ended works records on designated segments, newer crash data that changes
// segment counts. Signals are deduplicated by a stable key and prioritised by the segment's recorded injury crashes;
// they are hypotheses for triage, not findings. Record ids are public administrative identifiers (no personal data).
(function (root) {
  'use strict';
  const CT = typeof require === 'function' ? require('./civ-tools.js') : root.CORE_CIV_TOOLS;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
  function diff(base, cur) {
    if (base.city !== cur.city) throw new Error('villes différentes');
    const city = cur.city, signals = [], nhOf = cnn => { const h = cur.hin.get(cnn) || base.hin.get(cnn); if (!h) return null; for (const [nh, g] of cur.nh) if (CT.inGeom(h.mid, g)) return nh; return null; };
    const active = cx => { const m = new Map(); for (const p of CT.planned(cx, cx.data.permits.features)) if (cx.hin.has(p.properties.cnn)) m.set(p.properties.record_id, p.properties.cnn); return m; };
    const a0 = active(base), a1 = active(cur), byCnn = new Map();
    for (const [id, cnn] of a1) if (!a0.has(id)) { if (!byCnn.has(cnn)) byCnn.set(cnn, { added: [], ended: [] }); byCnn.get(cnn).added.push(id); }
    for (const [id, cnn] of a0) if (!a1.has(id)) { if (!byCnn.has(cnn)) byCnn.set(cnn, { added: [], ended: [] }); byCnn.get(cnn).ended.push(id); }
    for (const [cnn, ch] of byCnn) {
      const cr = cur.crashes.get(cnn) || [], n = cr.reduce((s, r) => s + r.n, 0), sev = cr.filter(r => /Severe|Fatal/.test(r.severity)).reduce((s, r) => s + r.n, 0), h = cur.hin.get(cnn);
      if (ch.added.length) signals.push({ kind: 'new-works-on-designated-segment', city, nhood: nhOf(cnn), segment: cnn, street: h ? h.street : null, records: ch.added.sort(), crashes: n, severe: sev, priority: sev * 3 + Math.min(n, 30) / 3 + ch.added.length, workflow: 'safety-works', key: `${city}|new-works|${cnn}|${hash(ch.added.sort().join(','))}` });
      if (ch.ended.length) signals.push({ kind: 'works-no-longer-active', city, nhood: nhOf(cnn), segment: cnn, street: h ? h.street : null, records: ch.ended.sort(), crashes: n, severe: sev, priority: 0.5, workflow: 'safety-works', key: `${city}|ended-works|${cnn}|${hash(ch.ended.sort().join(','))}` });
    }
    const w0 = base.data['crashes-agg'].window, w1 = cur.data['crashes-agg'].window;
    if (w1.to !== w0.to) { const changed = [...cur.hin.keys()].filter(c => (cur.crashes.get(c) || []).reduce((s, r) => s + r.n, 0) !== (base.crashes.get(c) || []).reduce((s, r) => s + r.n, 0));
      signals.push({ kind: 'crash-data-updated', city, nhood: null, segment: null, records: [], window: { before: w0, after: w1 }, segmentsChanged: changed.length, priority: 2, workflow: 'safety-works', key: `${city}|crash-window|${w1.to}` }); }
    const seen = new Set(), out = signals.filter(s => !seen.has(s.key) && seen.add(s.key)).sort((a, b) => b.priority - a.priority || a.key.localeCompare(b.key));
    return { city, baseline: base.manifest.generated_at, current: cur.manifest.generated_at, signals: out, totals: { added: out.filter(s => s.kind === 'new-works-on-designated-segment').reduce((n, s) => n + s.records.length, 0), ended: out.filter(s => s.kind === 'works-no-longer-active').reduce((n, s) => n + s.records.length, 0), crashWindowChanged: w1.to !== w0.to } };
  }
  const D = { diff, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.CORE_CIV_DISCOVERY = D;
})(typeof globalThis !== 'undefined' ? globalThis : this);
