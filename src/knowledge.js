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

  // Bilingual query expansion (questions are French, most source documentation is English). Code-level
  // retrieval aid only: documents are unchanged. Accents are already stripped by tokens().
  const FR_EN = { arbre: ['tree'], arbres: ['tree', 'trees'], abattage: ['removal'], avis: ['notice', 'notices'], permis: ['permit', 'permits'], chantier: ['construction', 'work'],
    travaux: ['work', 'works', 'excavation'], trottoir: ['sidewalk'], trottoirs: ['sidewalk', 'sidewalks'], bilan: ['benchmark'], bilans: ['benchmark', 'benchmarks'], energetique: ['energy'], energetiques: ['energy'],
    declare: ['reported', 'self'], declares: ['reported', 'self'], mesure: ['measured', 'measurement'], mesures: ['measured', 'measurement'], batiment: ['building'], batiments: ['building', 'buildings'],
    air: ['air'], qualite: ['quality'], capteur: ['sensor'], modele: ['model', 'modelled'], reseau: ['grid'], electrique: ['electricity', 'grid'], zone: ['area'], unite: ['megawatts', 'mw'],
    seisme: ['earthquake'], alerte: ['alert'], alertes: ['alerts'], prevision: ['forecast'], dossier: ['record'], dossiers: ['records', 'record'], projet: ['project'], projets: ['projects'],
    frequence: ['updated', 'nightly'], jour: ['updated', 'daily'], parametres: ['parameters'], scenarios: ['scenario'], chiffres: ['numbers'], calcule: ['computes', 'produce'], statut: ['status'], prouve: ['proof', 'indicates'] };
  const expand = q => [...new Set(q.flatMap(t => [t, ...(FR_EN[t] || [])]))];

  // TF-IDF retrieval over approved documents, optionally restricted to an agent's knowledge collection.
  function retrieve(K, query, { allowed = null, limit = 5, now = new Date().toISOString() } = {}) {
    const docs = approved(K).filter(d => !allowed || allowed.includes(d.id));
    const q = expand(tokens(query)); if (!q.length) return [];
    const df = new Map(); const tf = docs.map(d => { const t = tokens(`${d.title} ${d.text} ${d.topics.join(' ')}`); const m = new Map(); for (const x of t) m.set(x, (m.get(x) || 0) + 1); for (const x of new Set(t)) df.set(x, (df.get(x) || 0) + 1); return { d, m, n: t.length }; });
    const N = docs.length;
    return tf.map(({ d, m, n }) => ({ d, score: q.reduce((s, w) => s + (m.has(w) ? (m.get(w) / n) * Math.log(1 + N / df.get(w)) : 0), 0) }))
      .filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.d.id.localeCompare(b.d.id)).slice(0, limit)
      .map(({ d, score }) => ({ id: d.id, title: d.title, url: d.url, source: K.sources.get(d.source).name, license: K.sources.get(d.source).license, version: d.version, retrieved_at: d.retrieved_at, excerpt: String(d.text).slice(0, 320), score: +score.toFixed(4), confidence: d.confidence, limitations: d.limitations, freshness: freshness(d, now), citation: `${d.id}@v${d.version}` }));
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
  function propose(K, { docId, proposedBy, change, reason, ...extra }) {
    if (!proposedBy || !change || !reason) throw new TypeError('proposition incomplète');
    const p = { id: `prop-${K.lib.proposals.length + 1}`, docId, proposedBy, change, reason, ...extra, status: 'pending', created: new Date().toISOString() };
    K.lib.proposals.push(p); return p;
  }
  function review(K, proposalId, reviewer, decision) {
    if (typeof reviewer !== 'string' || !reviewer.startsWith('human:')) throw new Error('seul un relecteur humain peut approuver ou rejeter');
    const p = K.lib.proposals.find(x => x.id === proposalId); if (!p || p.status !== 'pending') throw new Error('proposition introuvable ou déjà traitée');
    // An agent may never change permissions, tools or execution modes, nor edit a safety-policy document.
    const touchesControls = Object.keys(p.change).some(k => /permission|tools|executionMode|status|safety|gateway|rule/i.test(k)) || SAFETY_DOCS.includes(p.docId);
    if (touchesControls && p.proposedBy.startsWith('core.')) { p.status = 'rejected'; p.reviewer = reviewer; p.note = 'Un agent ne peut pas modifier ses règles de sûreté ou ses permissions.'; return p; }
    p.status = decision === 'approve' ? 'approved' : 'rejected'; p.reviewer = reviewer; p.reviewed = new Date().toISOString();
    if (p.status === 'approved') { if (p.newSource) addSource(K, p.newSource); applyChange(K, p.docId, p.change, { by: reviewer, proposal: p.id }); for (const a of p.collections || []) addToCollection(K, a, p.docId); }
    return p;
  }
  // Every version is kept: applying a change snapshots the previous content into the document history.
  function applyChange(K, docId, change, meta) {
    const d = K.lib.documents.find(x => x.id === docId), at = new Date().toISOString();
    if (d) { const { history = [], ...prev } = d; Object.assign(d, change, { version: d.version + 1, status: 'approved', history: [...history, { ...prev, replaced_at: at, replaced_by: meta }] }); return d; }
    const n = { ...change, id: docId, version: 1, status: 'approved', history: [], created: { at, ...meta } }; K.lib.documents.push(n); return n;
  }
  // Rollback (human only): restores an earlier version's content as a NEW version, keeping the audit trail.
  function rollback(K, docId, toVersion, reviewer) {
    if (typeof reviewer !== 'string' || !reviewer.startsWith('human:')) throw new Error('seul un relecteur humain peut restaurer une version');
    const d = K.lib.documents.find(x => x.id === docId); if (!d) throw new Error('document introuvable');
    const old = (d.history || []).find(h => h.version === toVersion); if (!old) throw new Error(`version ${toVersion} introuvable`);
    const { version, replaced_at, replaced_by, history, ...content } = old;
    return applyChange(K, docId, content, { by: reviewer, rollbackTo: toVersion });
  }
  // Role-specific collections: the profile's knowledge list plus documents a human approved for that agent
  // (lib.collections). Membership grants reading only; it never changes permissions or tools.
  const collectionIds = (K, agent) => [...new Set([...(agent.knowledge || []), ...((K.lib.collections || {})[agent.id] || [])])];
  const collection = (K, agent) => approved(K).filter(d => collectionIds(K, agent).includes(d.id));
  function addToCollection(K, agentId, docId) { K.lib.collections = K.lib.collections || {}; const c = K.lib.collections[agentId] = K.lib.collections[agentId] || []; if (!c.includes(docId)) c.push(docId); }
  const SAFETY_DOCS = ['k-neutrality', 'k-provenance', 'k-simulation-integrity'];
  function addSource(K, src) { if (!src || !src.id || !src.url || !src.license) throw new TypeError('source invalide'); if (!K.sources.has(src.id)) { K.lib.sources.push(src); K.sources.set(src.id, src); } }

  const KNOW = { load, retrieve, freshness, contradictions, docClaims, propose, review, rollback, applyChange, collection, collectionIds, addToCollection, addSource, approved, tokens, SAFETY_DOCS };
  if (typeof module !== 'undefined' && module.exports) module.exports = KNOW; else root.CORE_KNOWLEDGE = KNOW;
})(typeof globalThis !== 'undefined' ? globalThis : this);
