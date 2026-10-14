// CORE — controlled, evaluated learning (Phase 4).
// gap → authorized source → credibility & relevance validation → proposal → evaluation before/after →
// human approval for important changes → promotion (new version, history kept) → rollback possible.
// No agent can approve, change its own permissions or tools, or fetch from an unregistered source.
(function (root) {
  'use strict';
  const isNode = typeof require === 'function' && typeof module !== 'undefined';
  const KN = isNode ? require('./knowledge.js') : root.CORE_KNOWLEDGE;
  const F = isNode ? require('./feeds.js') : root.CORE_FEEDS;

  // Authorized machine-readable sources for knowledge acquisition. Anything else is refused.
  const AUTHORIZED = [
    { id: 'datasf-metadata', host: 'data.sf.gov', source: 'src-datasf', describe: 'Métadonnées officielles des jeux DataSF (description, licence, attribution, date de mise à jour)', url: id => `https://data.sf.gov/api/views/${encodeURIComponent(id)}.json` },
  ];
  // Datasets each tool depends on: the basis for coverage gaps (a tool without documentation in the
  // calling agent's collection is a knowledge gap).
  const TOOL_DATASETS = {
    'planning.records': { datasf: 'qvu5-m3a2', feed: 'datasf-planning' }, 'air.quality': { feed: 'openmeteo-aq', doc: 'k-air-quality-model' },
    'grid.mix': { feed: 'caiso-fuelmix', doc: 'k-caiso-outlook' }, 'scenario.evaluate': { doc: 'k-simulation-integrity' },
  };
  // Knowledge competency cases per role (checkable: the expected document must be retrieved in the top 3).
  const KNOWLEDGE_EVALS = [
    { agent: 'urban-planning-analyst', question: 'Que représente un dossier PRJ du Planning Department et à quelle fréquence le jeu est-il mis à jour ?', expect: 'qvu5-m3a2' },
    { agent: 'urban-planning-analyst', question: 'Le statut issued d’un permis DBI prouve-t-il un chantier en cours ?', expect: 'k-dbi-issued-status' },
    { agent: 'environmental-analyst', question: 'La qualité de l’air affichée est-elle une mesure de capteur ou un modèle CAMS ?', expect: 'k-air-quality-model' },
    { agent: 'environmental-analyst', question: 'Un avis d’abattage confirme-t-il que l’arbre a été abattu ?', expect: 'k-tree-removals' },
    { agent: 'energy-infrastructure-analyst', question: 'Quelle zone couvre le mix de production CAISO et en quelle unité ?', expect: 'k-caiso-outlook' },
    { agent: 'energy-infrastructure-analyst', question: 'Les bilans énergétiques des bâtiments sont-ils déclarés ou mesurés par la ville ?', expect: 'k-energy-ordinance' },
    { agent: 'scenario-analyst', question: 'Quels paramètres un agent peut-il proposer et qui calcule les résultats des scénarios ?', expect: 'k-simulation-integrity' },
    { agent: 'evidence-reviewer', question: 'Un modèle de langage peut-il produire des chiffres de simulation ?', expect: 'k-simulation-integrity' },
  ];

  const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const agentByKey = (registry, key) => registry.agents.find(a => a.id.endsWith(`.${key}`));

  // ---------- 1. Gaps ----------
  function identifyGaps({ registry, K, missions = [] }) {
    const gaps = [];
    for (const a of registry.agents.filter(x => x.executionMode === 'llm' || x.executionMode === 'deterministic')) {
      const coll = KN.collection(K, a);
      for (const t of a.tools) {
        const dep = TOOL_DATASETS[t]; if (!dep) continue;
        const covered = coll.some(d => (dep.doc && d.id === dep.doc) || (dep.datasf && String(d.url).includes(dep.datasf)));
        if (!covered) gaps.push({ kind: 'coverage', agent: a.id, tool: t, dataset: dep.datasf || null, feed: dep.feed || null, doc: dep.doc || null, text: `${a.role} utilise ${t} sans documentation de la source dans sa collection.` });
      }
    }
    for (const m of missions) for (const g of (m.cognitive && m.cognitive.knowledgeGaps) || []) gaps.push({ kind: 'retrieval', agent: g.agent, query: g.query, mission: m.id, text: `Recherche sans résultat : « ${g.query} ».` });
    const seen = new Set(); return gaps.filter(g => { const k = `${g.kind}|${g.agent}|${g.tool || g.query}`; return !seen.has(k) && seen.add(k); });
  }

  // ---------- 2. Retrieval from an authorized source ----------
  async function retrieveCandidate(gap, { fetchImpl = globalThis.fetch, now = new Date().toISOString() } = {}) {
    if (!gap.dataset) return { ok: false, reason: 'Aucune source autorisée lisible par machine pour cette lacune : rédaction humaine requise.' };
    const src = AUTHORIZED[0], url = src.url(gap.dataset);
    const r = await fetchImpl(url, { headers: { Accept: 'application/json' } }); if (!r.ok) return { ok: false, reason: `HTTP ${r.status}`, url };
    const j = await r.json(), desc = strip(j.description);
    const summary = desc.replace(/\b(D\.|HOW TO USE THIS DATASET|Want to map).*/i, '').slice(0, 700);
    return { ok: true, url, provenance: { authorizedSource: src.id, fetched: url, fetched_at: now, attribution: j.attribution || null, license: (j.license && j.license.name) || null, rowsUpdatedAt: j.rowsUpdatedAt ? new Date(j.rowsUpdatedAt * 1000).toISOString() : null },
      doc: { source: src.source, title: `${j.name} — documentation officielle du jeu (${gap.dataset})`, url: `https://data.sf.gov/d/${gap.dataset}`, retrieved_at: now.slice(0, 10), stale_after_days: 365,
        topics: [...new Set(KN.tokens(`${j.name} ${gap.tool || ''}`))].slice(0, 8), text: summary, claims: [], confidence: 'documentation officielle du producteur',
        limitations: (F.SOURCES.find(s => s.id === gap.feed) || { confidence: [null, 'Non précisées.'] }).confidence[1] } };
  }

  // ---------- 3. Validation: credibility + relevance + novelty ----------
  function validateCandidate(K, gap, cand) {
    const checks = [], add = (id, label, pass, detail) => checks.push({ id, label, pass: !!pass, detail: detail || null });
    let host = null; try { host = new URL(cand.provenance.fetched).host; } catch (_) { /* invalid */ }
    add('authorized-source', 'source autorisée et enregistrée', AUTHORIZED.some(a => a.host === host), host);
    add('license', 'licence déclarée par le producteur', !!cand.provenance.license, cand.provenance.license);
    add('attribution', 'producteur identifié', !!cand.provenance.attribution, cand.provenance.attribution);
    add('dated', 'date de mise à jour connue', !!cand.provenance.rowsUpdatedAt, cand.provenance.rowsUpdatedAt);
    const q = new Set(KN.tokens(`${gap.text} ${gap.query || ''} ${gap.tool || ''} ${gap.dataset || ''}`)), t = new Set(KN.tokens(`${cand.doc.title} ${cand.doc.text}`));
    const overlap = [...q].filter(x => t.has(x)); add('relevance', 'pertinence (termes communs avec la lacune, ou identifiant du jeu)', overlap.length >= 2 || String(cand.doc.url).includes(gap.dataset || '#'), overlap.slice(0, 6).join(', '));
    add('novel', 'pas de doublon dans la bibliothèque', !K.lib.documents.some(d => d.url === cand.doc.url && d.status === 'approved'));
    add('non-empty', 'contenu exploitable', cand.doc.text.length >= 80, `${cand.doc.text.length} caractères`);
    return { pass: checks.every(c => c.pass), checks };
  }

  // Important = new document, or changed text/claims/limitations. Minor = freshness refresh with identical content.
  function importance(K, docId, change) {
    const d = K.lib.documents.find(x => x.id === docId);
    if (!d) return 'important';
    const same = ['text', 'claims', 'limitations', 'title', 'url'].every(k => change[k] === undefined || JSON.stringify(change[k]) === JSON.stringify(d[k]));
    return same ? 'minor' : 'important';
  }

  // ---------- 4. Evaluation before / after (deterministic retrieval competency) ----------
  function evaluateRole(K, registry, key) {
    const a = agentByKey(registry, key), cases = KNOWLEDGE_EVALS.filter(c => c.agent === key);
    const results = cases.map(c => { const hits = KN.retrieve(K, c.question, { allowed: KN.collectionIds(K, a), limit: 3 }); return { question: c.question, expect: c.expect, pass: hits.some(h => h.id === c.expect || String(h.url).includes(c.expect)), got: hits.map(h => h.id) }; });
    return { agent: a.id, score: cases.length ? results.filter(r => r.pass).length / cases.length : null, results, libraryVersion: K.lib.version };
  }
  const clone = K => KN.load(JSON.parse(JSON.stringify(K.lib)));
  function stagedEvaluation(K, registry, proposal) {
    const keys = [...new Set((proposal.collections || []).map(id => id.split('.').pop()))];
    const after = clone(K); if (proposal.newSource) KN.addSource(after, proposal.newSource); KN.applyChange(after, proposal.docId, proposal.change, { by: 'staging', proposal: proposal.id }); for (const a of proposal.collections || []) KN.addToCollection(after, a, proposal.docId);
    return keys.map(k => ({ agent: k, before: evaluateRole(K, registry, k), after: evaluateRole(after, registry, k) }));
  }

  // ---------- 5. Proposal (never self-approved) ----------
  function proposeLearning(K, registry, { gap, docId, change, provenance, collections, proposedBy, validation, newSource = null }) {
    const imp = importance(K, docId, change);
    const p = KN.propose(K, { docId, proposedBy, change, reason: gap.text, gap, provenance, collections, validation, newSource, importance: imp, requiresHumanApproval: imp === 'important' });
    p.evaluation = stagedEvaluation(K, registry, p);
    return p;
  }
  // Minor changes may be promoted without a human, still versioned and reversible; important ones never.
  function promoteMinor(K, proposalId) {
    const p = K.lib.proposals.find(x => x.id === proposalId);
    if (!p || p.status !== 'pending') throw new Error('proposition introuvable ou déjà traitée');
    if (p.importance !== 'minor') throw new Error('changement important : approbation humaine requise');
    KN.applyChange(K, p.docId, p.change, { by: 'auto:minor-refresh', proposal: p.id }); p.status = 'approved'; p.reviewer = 'auto:minor-refresh'; return p;
  }

  const LEARN = { AUTHORIZED, TOOL_DATASETS, KNOWLEDGE_EVALS, identifyGaps, retrieveCandidate, validateCandidate, importance, evaluateRole, stagedEvaluation, proposeLearning, promoteMinor };
  if (typeof module !== 'undefined' && module.exports) module.exports = LEARN; else root.CORE_LEARNING = LEARN;
})(typeof globalThis !== 'undefined' ? globalThis : this);
