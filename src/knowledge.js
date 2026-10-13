// CORE — knowledge architecture (Phase 3): source registry, versioned documents, retrieval, freshness,
// contradiction detection, confidence/limitations and a human-only update approval workflow.
// Agents read approved documents only; no agent can approve a change or alter its own rules.
(function (root) {
  'use strict';
  const DAY = 86400000;
  const tokens = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(t => t.length > 2);

  function load(lib) {
    if (!lib || !Array.isArray(lib.documents) || !Array.isArray(lib.sources)) throw new TypeError('bibliothèque invalide');
    const sources = new Map(lib.sources.map(s => [s.id, s]));
    for (const d of lib.documents) {
      if (!d.id || !sources.has(d.source) || !d.url || !d.retrieved_at || !Number.isInteger(d.version)) throw new TypeError(`document invalide : ${d.id}`);
    }
    return { lib, sources };
  }
  const approved = K => K.lib.documents.filter(d => d.status === 'approved');

  function freshness(doc, nowIso) {
    const age = Math.floor((Date.parse(nowIso) - Date.parse(doc.retrieved_at)) / DAY);
    return { ageDays: age, staleAfterDays: doc.stale_after_days, stale: age > doc.stale_after_days };
  }

  // TF-IDF retrieval over approved documents, optionally restricted to an agent's knowledge collection.
  function retrieve(K, query, { allowed = null, limit = 5, now = new Date().toISOString() } = {}) {
    const docs = approved(K).filter(d => !allowed || allowed.includes(d.id));
    const q = tokens(query); if (!q.length) return [];
    const df = new Map(); const tf = docs.map(d => { const t = tokens(`${d.title} ${d.text} ${d.topics.join(' ')}`); const m = new Map(); for (const x of t) m.set(x, (m.get(x) || 0) + 1); for (const x of new Set(t)) df.set(x, (df.get(x) || 0) + 1); return { d, m, n: t.length }; });
    const N = docs.length;
    return tf.map(({ d, m, n }) => ({ d, score: q.reduce((s, w) => s + (m.has(w) ? (m.get(w) / n) * Math.log(1 + N / df.get(w)) : 0), 0) }))
      .filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.d.id.localeCompare(b.d.id)).slice(0, limit)
      .map(({ d, score }) => ({ id: d.id, title: d.title, url: d.url, source: K.sources.get(d.source).name, license: K.sources.get(d.source).license, version: d.version, score: +score.toFixed(4), confidence: d.confidence, limitations: d.limitations, freshness: freshness(d, now) }));
  }

  // Contradictions: claims with the same key and different values (numeric claims compared with tolerance).
  function contradictions(claimList) {
    const by = new Map(); for (const c of claimList) { if (!by.has(c.key)) by.set(c.key, []); by.get(c.key).push(c); }
    const out = [];
    for (const [key, cs] of by) for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i], b = cs[j];
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        const rel = Math.abs(a.value - b.value) / Math.max(Math.abs(a.value), Math.abs(b.value), 1e-9), tol = Math.max(a.tolerance || 0, b.tolerance || 0);
        if (rel > 0) out.push({ key, a: a.doc, b: b.doc, values: [a.value, b.value], relative: +rel.toFixed(4), status: rel <= tol ? 'compatible within tolerance' : 'conflict' });
      } else if (a.value !== b.value) out.push({ key, a: a.doc, b: b.doc, values: [a.value, b.value], status: 'conflict' });
    }
    return out;
  }
  const docClaims = K => approved(K).flatMap(d => (d.claims || []).map(c => ({ ...c, doc: d.id })));

  // Update workflow: agents may propose; only a human reviewer can approve, which creates a new version.
  function propose(K, { docId, proposedBy, change, reason }) {
    if (!proposedBy || !change || !reason) throw new TypeError('proposition incomplète');
    const p = { id: `prop-${K.lib.proposals.length + 1}`, docId, proposedBy, change, reason, status: 'pending', created: new Date().toISOString() };
    K.lib.proposals.push(p); return p;
  }
  function review(K, proposalId, reviewer, decision) {
    if (typeof reviewer !== 'string' || !reviewer.startsWith('human:')) throw new Error('seul un relecteur humain peut approuver ou rejeter');
    const p = K.lib.proposals.find(x => x.id === proposalId); if (!p || p.status !== 'pending') throw new Error('proposition introuvable ou déjà traitée');
    if (/permission|safety|gateway|rule/i.test(JSON.stringify(p.change)) && p.proposedBy.startsWith('core.')) { p.status = 'rejected'; p.reviewer = reviewer; p.note = 'Un agent ne peut pas modifier ses règles de sûreté ou ses permissions.'; return p; }
    p.status = decision === 'approve' ? 'approved' : 'rejected'; p.reviewer = reviewer; p.reviewed = new Date().toISOString();
    if (p.status === 'approved') {
      const d = K.lib.documents.find(x => x.id === p.docId);
      if (d) { Object.assign(d, p.change, { version: d.version + 1, status: 'approved' }); } else { K.lib.documents.push({ ...p.change, id: p.docId, version: 1, status: 'approved' }); }
    }
    return p;
  }

  const KNOW = { load, retrieve, freshness, contradictions, docClaims, propose, review, approved, tokens };
  if (typeof module !== 'undefined' && module.exports) module.exports = KNOW; else root.CORE_KNOWLEDGE = KNOW;
})(typeof globalThis !== 'undefined' ? globalThis : this);
