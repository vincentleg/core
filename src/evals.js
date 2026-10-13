// CORE — competency evaluations (Phase 3). Each executable agent is evaluated on deterministic cases with
// checkable expectations. "Self-improvement" in CORE means: a knowledge or tool change is approved by a
// human and these scores are re-measured — never autonomous self-modification.
(function (root) {
  'use strict';
  const isNode = typeof require === 'function' && typeof module !== 'undefined';
  const C = isNode ? require('./coord.js') : root.CORE_COORD;
  const ORG = isNode ? require('./org.js') : root.CORE_ORG;
  const T = isNode ? require('./tools.js') : root.CORE_TOOLS;
  const F = isNode ? require('./feeds.js') : root.CORE_FEEDS;
  const KN = isNode ? require('./knowledge.js') : root.CORE_KNOWLEDGE;
  const CI = isNode ? require('./city-agents.js') : root.CORE_CITY;

  function cases(env) {
    const seg = '7056000', mid = (() => { const c = env.ctx.segments.get(seg).geometry.coordinates; return c[Math.floor(c.length / 2)]; })();
    const fixtureItem = { id: 'fixture:quake', source: 'usgs-quakes', url: 'https://earthquake.usgs.gov/', title: 'fixture', geo: { type: 'Point', coordinates: [-122.2, 37.8] }, data: { mag: 3.1, status: 'reviewed', depth_km: 5 }, verification: { status: 'official-source' } };
    const resolves = out => out.findings.every(f => f.evidence.length && f.evidence.every(e => T.resolve(env, e)));
    return [
      { tool: 'works.windows', label: 'fenêtres = recalcul du moteur de coordination', run: () => { const o = T.TOOLS['works.windows'].run(env, { segment: seg }); return resolves(o) && o.findings[0].value === C.analyseGroup(env.ctx, seg, C.DEFAULTS).planning.length; } },
      { tool: 'works.telecom', label: 'seuls des titulaires classés télécoms', run: () => { const o = T.TOOLS['works.telecom'].run(env, { segment: seg }); return o.findings[0].evidence.every(e => { const id = e.ref.split(':').slice(1).join(':'); const f = env.ctx.data.permits.features.find(x => x.properties.record_id === id); return f && T.TELECOM.test(f.properties.agent); }); } },
      { tool: 'trees.near-works', label: 'preuves vérifiables, distances ≤ rayon', run: () => { const o = T.TOOLS['trees.near-works'].run(env, { segment: seg }); return resolves(o) && o.findings[0].epistemic === 'derived'; } },
      { tool: 'buildings.frontage', label: 'rappelle la limite du statut « issued »', run: () => { const o = T.TOOLS['buildings.frontage'].run(env, { segment: seg }); return resolves(o) && o.findings.some(f => f.evidence.some(e => e.ref === 'k-dbi-issued-status')); } },
      { tool: 'energy.benchmarks', label: 'données déclarées marquées « reported »', run: () => { const o = T.TOOLS['energy.benchmarks'].run(env, { segment: seg }); return resolves(o) && o.findings.every(f => f.epistemic === 'reported'); } },
      { tool: 'public-space.sidewalks', label: 'largeur issue de l’étude 2014', run: () => { const o = T.TOOLS['public-space.sidewalks'].run(env, { segment: seg }); return /2014/.test(o.findings[0].claim); } },
      { tool: 'resilience.quake-context', label: 'distance exacte et limite structurelle', run: () => { const e2 = { ...env, feeds: { items: [fixtureItem] } }; const o = T.TOOLS['resilience.quake-context'].run(e2, { item: 'fixture:quake', type: 'seismic-context' }); const exp = Math.round(Math.min(...[...env.ctx.segments.values()].map(s => C.distanceToGeometry(fixtureItem.geo.coordinates, s.geometry))) / 1000); return o.findings[1].value === exp && o.findings.some(f => f.limitation); } },
      { tool: 'resilience.weather-alerts', label: 'alertes = prévisions (« reported »)', run: () => T.TOOLS['resilience.weather-alerts'].run(env, {}).findings.every(f => f.epistemic === 'reported') },
      { tool: 'civic.legislation', label: 'aucun classement ni jugement politique', run: () => { const o = T.TOOLS['civic.legislation'].run(env, { segment: seg }); return !/meilleur|pire|bon|mauvais|soutien|oppos/i.test(o.findings[0].claim); } },
      { tool: 'graph.link', label: 'un point au milieu du tronçon y est rattaché', run: () => { const e2 = { ...env, feeds: { items: [{ id: 'fixture:pt', title: 'fixture', url: 'https://data.sf.gov', geo: { type: 'Point', coordinates: mid }, data: {}, verification: { status: 'official-source' } }] } }; return T.TOOLS['graph.link'].run(e2, { item: 'fixture:pt' }).findings[0].value === seg; } },
      { tool: 'scenario.investigate', label: 'même décision que la passerelle inter-domaines', run: () => { const o = T.TOOLS['scenario.investigate'].run(env, { segment: seg }); return o.decision.state === CI.run(env.ctx, { segment: seg }).result.decision.state; } },
      { tool: 'knowledge.retrieve', label: 'retrouve la note sur les avis d’abattage', run: () => KN.retrieve(env.knowledge, 'tree removal notice', { limit: 3 }).some(h => h.id === 'k-tree-removals') },
      { tool: 'evidence.verify', label: 'rejette une preuve fabriquée', run: () => !T.resolve(env, { type: 'record', ref: 'permits:FAKE@1' }) && !T.resolve(env, { type: 'knowledge', ref: 'k-nope' }) },
      { tool: 'adversarial.review', label: 'détecte une contradiction entre spécialistes', run: () => T.disagreements([{ topic: 'trees', claim: 'a', agent: 'x' }, { topic: 'n', claim: 'b', agent: 'y', contradicts: 'trees' }]).length === 1 },
    ];
  }
  function evaluate(env, registry, { date = new Date().toISOString().slice(0, 10) } = {}) {
    const libVersion = `${env.knowledge.lib.version}@${KN.approved(env.knowledge).map(d => `${d.id}:${d.version}`).join(',').length}`;
    const byTool = ORG.index(registry).byTool;
    return cases(env).map(c => { let pass = false, error = null; try { pass = !!c.run(); } catch (e) { error = e.message; }
      return { agent: (byTool.get(c.tool) || [{ id: null }])[0].id, tool: c.tool, case: c.label, pass, error, date, knowledgeVersion: libVersion }; });
  }

  const EVALS = { cases, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = EVALS; else root.CORE_EVALS = EVALS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
