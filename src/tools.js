// CORE — executable specialist tools (Phase 3). Each tool is deterministic code over the verified snapshot,
// the City Intelligence store and the approved knowledge library. A tool returns typed findings:
// epistemic ∈ observed | reported | derived | hypothesis | simulated — each with resolvable evidence refs.
// Tools never act on the world; permission levels are enforced by the orchestrator before execution.
(function (root) {
  'use strict';
  const isNode = typeof require === 'function' && typeof module !== 'undefined';
  const C = isNode ? require('./coord.js') : root.CORE_COORD;
  const CI = isNode ? require('./city-agents.js') : root.CORE_CITY;
  const GR = isNode ? require('./graph.js') : root.CORE_GRAPH;
  const F = isNode ? require('./feeds.js') : root.CORE_FEEDS;
  const KN = isNode ? require('./knowledge.js') : root.CORE_KNOWLEDGE;

  const EPISTEMIC = ['observed', 'reported', 'derived', 'hypothesis', 'simulated'];
  // Declared classification (not a legal fact): organisations whose names indicate telecommunications.
  const TELECOM = /(pacific bell|at&t|cablecom|zayo|astound|level 3|itg communications|phase 3 communications|bay area lightworks|exaro|verizon|comcast|crown castle|mci)/i;
  const rec = (ctx, dataset, id) => ({ type: 'record', dataset, ref: `${dataset}:${id}`, url: ctx.datasets[dataset] ? `https://data.sf.gov/d/${ctx.datasets[dataset].id}` : null });
  const finding = (topic, claim, epistemic, evidence, extra = {}) => ({ topic, claim, epistemic, evidence, ...extra });
  // An absence claim ("0 trees within the radius") is supported by the verified dataset that was queried.
  const orDataset = (list, ctx, dataset) => list.length ? list : [{ type: 'dataset', ref: dataset, url: ctx.datasets[dataset] ? `https://data.sf.gov/d/${ctx.datasets[dataset].id}` : null }];
  const segName = (ctx, seg) => { const s = ctx.segments.get(seg); return s ? `${s.properties.street} ${s.properties.from} → ${s.properties.to}` : seg; };

  const TOOLS = {
    'works.windows': { permission: 'analyze', applies: m => !!m.segment, run(env, m) {
      const g = C.analyseGroup(env.ctx, m.segment, C.DEFAULTS), orgs = [...new Set(g.planning.map(w => w.agent).filter(Boolean))].sort();
      const review = C.reviewBasis(g.planning, g.env, C.DEFAULTS);
      return { records: g.records.length, findings: [
        finding('works', `${g.planning.length} fenêtre(s) d’excavation en cours ou à venir sur ${segName(env.ctx, m.segment)} (${orgs.join(', ') || 'aucune organisation'}).`, 'observed', orDataset(g.planning.map(w => rec(env.ctx, 'permits', w.record_id)), env.ctx, 'permits'), { value: g.planning.length }),
        finding('works-overlap', `${review.pairs.length} chevauchement(s) entre organisations dans les ${C.DEFAULTS.horizonDays} j.`, 'derived', orDataset(review.pairs.flatMap(p => [rec(env.ctx, 'permits', p.a), rec(env.ctx, 'permits', p.b)]), env.ctx, 'permits'), { value: review.pairs.length }),
      ] };
    } },
    'works.telecom': { permission: 'analyze', applies: m => !!m.segment, run(env, m) {
      const g = C.analyseGroup(env.ctx, m.segment, C.DEFAULTS), tel = g.planning.filter(w => w.agent && TELECOM.test(w.agent));
      return { records: g.planning.length, findings: [finding('telecom', `${tel.length} fenêtre(s) de titulaires classés télécoms (classement déclaré par nom) : ${[...new Set(tel.map(w => w.agent))].join(', ') || 'aucune'}.`, 'derived', orDataset(tel.map(w => rec(env.ctx, 'permits', w.record_id)), env.ctx, 'permits'), { value: tel.length })] };
    } },
    'trees.near-works': { permission: 'analyze', applies: m => !!m.segment, run(env, m) {
      const G = GR.buildCityGraph(env.ctx, CI.DEFAULTS), b = CI.blockSignals(env.ctx, G, m.segment, CI.DEFAULTS);
      const noticed = b.exposed.filter(t => !b.exposedNet.includes(t));
      const out = [finding('trees', `${b.trees.length} arbre(s) inventorié(s) sur le tronçon ; ${b.exposed.length} à ≤ ${CI.DEFAULTS.treeBufferM} m d’un point de permis d’excavation (indicateur de proximité).`, 'derived', orDataset(b.exposed.map(t => rec(env.ctx, 'street-trees', t.record_id)), env.ctx, 'street-trees'), { value: b.exposed.length })];
      if (noticed.length) out.push(finding('trees', `${noticed.length} de ces arbres ont un avis d’abattage : la relation est contredite pour eux.`, 'observed', noticed.map(t => rec(env.ctx, 'street-trees', t.record_id)), { value: noticed.length, contradicts: 'trees' }));
      return { records: b.trees.length, findings: out };
    } },
    'buildings.frontage': { permission: 'analyze', applies: m => !!m.segment, run(env, m) {
      const G = GR.buildCityGraph(env.ctx, CI.DEFAULTS), b = CI.blockSignals(env.ctx, G, m.segment, CI.DEFAULTS);
      const interior = b.recent.filter(e => /interior|bathroom|kitchen|sign|re-?roof/i.test(e.props.description || ''));
      const out = [finding('buildings', `${b.recent.length} permis de construire récent(s) (≤ ${CI.DEFAULTS.buildingRecencyDays} j) au front du tronçon ; ${b.buildingPermits.length} au total.`, 'derived', orDataset(b.recent.map(e => rec(env.ctx, 'building-permits', e.props.permit_number)), env.ctx, 'building-permits'), { value: b.recent.length })];
      if (interior.length) out.push(finding('buildings', `${interior.length} semblent intérieurs ou d’enseigne : lien avec le trottoir incertain.`, 'derived', interior.map(e => rec(env.ctx, 'building-permits', e.props.permit_number)), { value: interior.length, contradicts: 'buildings' }));
      out.push(finding('buildings', 'Le statut DBI « issued » n’indique pas un chantier en cours (connaissance approuvée k-dbi-issued-status).', 'reported', [{ type: 'knowledge', ref: 'k-dbi-issued-status' }]));
      return { records: b.buildingPermits.length, findings: out };
    } },
    'energy.benchmarks': { permission: 'analyze', applies: m => !!m.segment, run(env, m) {
      const G = GR.buildCityGraph(env.ctx, CI.DEFAULTS), b = CI.blockSignals(env.ctx, G, m.segment, CI.DEFAULTS);
      return { records: b.energy.length, findings: [finding('energy', `${b.energy.length} bâtiment(s) avec bilan énergétique déclaré à proximité (contexte ; aucun modèle d’économie).`, 'reported', orDataset(b.energy.map(e => rec(env.ctx, 'energy-benchmarks', e.provenance.record_id)), env.ctx, 'energy-benchmarks'), { value: b.energy.length })] };
    } },
    'public-space.sidewalks': { permission: 'analyze', applies: m => !!m.segment, run(env, m) {
      const G = GR.buildCityGraph(env.ctx, CI.DEFAULTS), b = CI.blockSignals(env.ctx, G, m.segment, CI.DEFAULTS);
      return { records: b.sidewalks.length, findings: [finding('public-space', `Trottoir : ${b.sidewalks.map(s => `${s.props.width_ft} pi (${s.props.side})`).join(', ') || 'non renseigné'} (étude 2014) ; ${b.parks.length} parc(s) proche(s).`, 'observed', orDataset(b.sidewalks.map(s => rec(env.ctx, 'sidewalks', s.provenance.record_id)), env.ctx, 'sidewalks'), { value: b.sidewalks.length ? b.sidewalks[0].props.width_ft : null })] };
    } },
    'resilience.quake-context': { permission: 'analyze', applies: m => m.type === 'seismic-context', run(env, m) {
      const it = env.feeds.items.find(i => i.id === m.item); if (!it) throw new Error('évènement introuvable');
      const corridorKm = Math.min(...[...env.ctx.segments.values()].map(s => C.distanceToGeometry(it.geo.coordinates, s.geometry))) / 1000;
      return { records: 1, findings: [
        finding('seismic', `${it.title} (${it.data.status === 'automatic' ? 'solution automatique, révisable' : 'revue'}), profondeur ${it.data.depth_km} km.`, 'observed', [{ type: 'feed', ref: it.id, url: it.url }], { value: it.data.mag }),
        finding('seismic', `Distance au corridor Folsom/Howard : ${Math.round(corridorKm)} km.`, 'derived', [{ type: 'feed', ref: it.id, url: it.url }, rec(env.ctx, 'corridor', [...env.ctx.segments.keys()][0])], { value: Math.round(corridorKm) }),
        finding('seismic', 'Aucune donnée structurelle, géotechnique ou d’inspection : aucun impact ne peut être évalué.', 'reported', [{ type: 'knowledge', ref: 'k-no-structural-data' }], { limitation: true }),
      ] };
    } },
    'resilience.weather-alerts': { permission: 'analyze', applies: m => m.type === 'seismic-context' || m.type === 'weather-alert-context' || !!m.segment, run(env) {
      const alerts = env.feeds.items.filter(i => i.source === 'nws-alerts'), st = (env.feedState.sources || {})['nws-alerts'] || {};
      // The collection time is metadata (asOf), not part of the claim: a refresh without new alerts must not change the mission identity.
      return { records: alerts.length, findings: [finding('weather', alerts.length ? `${alerts.length} alerte(s) NWS active(s) pour la zone CAZ006.` : st.lastSuccess ? 'Aucune alerte NWS active pour la zone CAZ006 à la dernière collecte.' : 'Alertes NWS jamais collectées.', 'reported', [{ type: 'feed-source', ref: 'nws-alerts', url: 'https://api.weather.gov/alerts/active?zone=CAZ006' }], { value: alerts.length, asOf: st.lastSuccess || null })] };
    } },
    'civic.legislation': { permission: 'analyze', applies: () => true, run(env, m) {
      const items = env.feeds.items.filter(i => i.source === 'legistar'), h = (env.feedHealth || []).find(x => x.id === 'legistar');
      const words = m.segment ? [env.ctx.segments.get(m.segment).properties.street.split(' ')[0]] : [];
      const hits = items.filter(i => words.some(w => new RegExp(`\\b${w}\\b`, 'i').test(i.title)));
      const status = !h ? 'état inconnu' : /retired/.test(h.freshness) ? 'retirée de la collecte (API figée depuis 2020)' : /stale/.test(h.freshness) ? 'périmée' : 'à jour'; // categorical: no day counts in claims
      return { records: items.length, findings: [finding('civic', `${hits.length} dossier(s) Legistar mentionnant ${words.join(', ') || 'la cible'} parmi ${items.length} récupéré(s) ; source publique ${status} (métadonnées seules, aucune évaluation politique).`, 'reported', [{ type: 'feed-source', ref: 'legistar', url: 'https://sfbos.org/legislation' }], { value: hits.length, limitation: !!(h && /stale|retired/.test(h.freshness)) })] };
    } },
    'graph.link': { permission: 'analyze', applies: m => !!m.item, run(env, m) {
      const it = env.feeds.items.find(i => i.id === m.item); if (!it) throw new Error('élément introuvable');
      const link = F.linkToCorridor(it, env.ctx);
      return { records: 1, findings: [finding('graph', link ? `L’élément « ${it.title} » est rattaché au tronçon ${segName(env.ctx, link.segment)} (${link.basis}) ; son point publié est à ${link.distance_m} m de l’axe du tronçon.` : `L’élément « ${it.title} » n’est pas géolocalisé sur le corridor.`, link && /observed/.test(link.basis) ? 'observed' : 'derived', [{ type: 'feed', ref: it.id, url: it.url }], { value: link ? link.segment : null, link })] };
    } },
    'scenario.investigate': { permission: 'analyze', applies: m => !!m.segment, run(env, m) {
      const runRes = CI.run(env.ctx, { segment: m.segment }), r = runRes.result;
      if (!r.brief) return { records: 0, findings: [finding('scenario', `Pas d’investigation inter-domaines sur ${segName(env.ctx, m.segment)} : ${r.decision.reason}`, 'derived', [rec(env.ctx, 'corridor', m.segment)], { value: null, decision: r.decision.state })], brief: null, decision: r.decision };
      const ev = Object.fromEntries(r.brief.evaluation.results.map(e => [e.id, e.metrics]));
      return { records: runRes.events.length, brief: r.brief, decision: r.decision, findings: [
        finding('scenario', `Alternatives évaluées (modèles déterministes) : épisodes d’exposition R0 ${ev.R0.exposureEpisodes}, R1 ${ev.R1.exposureEpisodes}, R2 ${ev.R2.exposureEpisodes} ; complétude des preuves R1 ${Math.round(ev.R1.evidenceCompleteness * 100)} %.`, 'simulated', [rec(env.ctx, 'corridor', m.segment)], { value: r.brief.recommendedAction.alternative }),
        finding('scenario', `Hypothèse : ${r.brief.hypothesis.text}`, 'hypothesis', r.brief.hypothesis.claims.flatMap(c => c.support.slice(0, 3).map(s => ({ type: 'graph', ref: s }))), { value: r.decision.state }),
      ] };
    } },
    'knowledge.retrieve': { permission: 'read', applies: () => true, run(env, m, agent) {
      const hits = KN.retrieve(env.knowledge, m.question, { allowed: null, limit: 4, now: env.now });
      if (!hits.length) return { records: 0, findings: [finding('knowledge', 'Aucun document approuvé ne correspond à la question.', 'reported', [{ type: 'knowledge-library', ref: env.knowledge.lib.version }])] };
      return { records: hits.length, findings: hits.map(h => finding('knowledge', `${h.title} — ${h.source} (v${h.version}, ${h.freshness.stale ? 'à actualiser' : 'à jour'}) ; limites : ${h.limitations || 'non précisées'}.`, 'reported', [{ type: 'knowledge', ref: h.id, url: h.url }], { value: h.score })) };
    } },
    // ---- Phase 4 tools (called by model-assisted agents; deterministic code, the model only chooses arguments) ----
    'planning.records': { permission: 'analyze', applies: () => true, run(env, m) {
      const all = env.feeds.items.filter(i => i.source === 'datasf-planning'), street = m.segment ? env.ctx.segments.get(m.segment).properties.street.split(' ')[0].toUpperCase() : null;
      const hits = street ? all.filter(i => i.data.corridor_street === street) : all;
      const byStatus = {}; for (const i of hits) byStatus[i.data.status] = (byStatus[i.data.status] || 0) + 1;
      return { records: all.length, findings: [finding('urbanism', street ? `${hits.length} dossier(s) de projet Planning ouverts en 30 j avec une adresse sur ${street} ST (${Object.entries(byStatus).map(([k, v]) => `${v} ${k}`).join(', ') || 'aucun'}) parmi ${all.length} à l’échelle de la ville ; adresses non géocodées, rattachement à la rue seulement.` : `${all.length} dossier(s) de projet Planning ouverts en 30 j à l’échelle de la ville.`,
        'reported', hits.length ? hits.slice(0, 8).map(i => ({ type: 'feed', ref: i.id, url: i.url })) : [{ type: 'feed-source', ref: 'datasf-planning', url: 'https://data.sf.gov/d/qvu5-m3a2' }], { value: hits.length, limitation: true })] };
    } },
    'air.quality': { permission: 'analyze', applies: () => true, run(env) {
      const it = env.feeds.items.filter(i => i.source === 'openmeteo-aq').sort((a, b) => String(b.published).localeCompare(String(a.published)))[0];
      if (!it) return { records: 0, findings: [finding('air', 'Aucune valeur de qualité de l’air collectée.', 'reported', [{ type: 'feed-source', ref: 'openmeteo-aq', url: 'https://open-meteo.com/en/docs/air-quality-api' }], { limitation: true })] };
      return { records: 1, findings: [finding('air', `Qualité de l’air modélisée (CAMS via Open-Meteo, ${it.published.slice(0, 16)} UTC) : US AQI ${it.data.us_aqi}, PM2,5 ${it.data.pm2_5} µg/m³ ; valeur de modèle, pas une mesure.`, 'reported', [{ type: 'feed', ref: it.id, url: it.url }], { value: it.data.us_aqi, limitation: true })] };
    } },
    'grid.mix': { permission: 'analyze', applies: () => true, run(env) {
      const it = env.feeds.items.filter(i => i.source === 'caiso-fuelmix').sort((a, b) => String(b.published).localeCompare(String(a.published)))[0];
      if (!it) return { records: 0, findings: [finding('energy', 'Aucune donnée CAISO collectée.', 'reported', [{ type: 'feed-source', ref: 'caiso-fuelmix', url: 'https://www.caiso.com/todays-outlook' }], { limitation: true })] };
      return { records: 1, findings: [finding('energy', `Réseau CAISO (Californie, ${it.data.time} heure du Pacifique) : ${it.data.renewables_pct} % de renouvelables hors grande hydraulique sur ${it.data.total_mw} MW ; échelle de l’État, pas de San Francisco.`, 'reported', [{ type: 'feed', ref: it.id, url: it.url }], { value: it.data.renewables_pct, limitation: true })] };
    } },
    // Role-scoped retrieval: an agent only searches its own approved knowledge collection; every hit is citable.
    'knowledge.search': { permission: 'read', applies: () => true, run(env, m, agent, args = {}) {
      const query = String(args.query || m.question || '').slice(0, 200), hits = KN.retrieve(env.knowledge, query, { allowed: agent ? KN.collectionIds(env.knowledge, agent) : null, limit: 3, now: env.now });
      if (!hits.length) return { records: 0, gap: { agent: agent && agent.id, query }, findings: [finding('knowledge', `Aucun document de la collection de l’agent ne répond à « ${query} » (lacune de connaissances).`, 'reported', [{ type: 'knowledge-library', ref: env.knowledge.lib.version }], { limitation: true, gap: true })] };
      return { records: hits.length, findings: hits.map(h => finding('knowledge', `${h.title} (v${h.version}, ${h.source}, licence ${h.license}, récupéré ${h.retrieved_at.slice(0, 10)}${h.freshness.stale ? ', à actualiser' : ''}) : ${h.excerpt}`, 'reported', [{ type: 'knowledge', ref: h.id, url: h.url }], { value: h.score })) };
    } },
    // The reviewer checks evidence ids from the mission's shared register (supplied by the orchestrator).
    'evidence.check': { permission: 'review', applies: () => true, run(env, m, agent, args = {}) {
      const ids = (Array.isArray(args.ids) ? args.ids : []).slice(0, 12).map(String), reg = m.evidenceIndex || new Map();
      return { records: ids.length, findings: ids.map(id => { const f = reg.get(id); if (!f) return finding('verification', `${id} : identifiant inconnu dans le registre de la mission.`, 'derived', [{ type: 'knowledge-library', ref: env.knowledge.lib.version }], { value: false });
        const ok = f.evidence.filter(e => resolve(env, e)).length; return finding('verification', `${id} : ${ok}/${f.evidence.length} référence(s) vérifiée(s) contre les données vérifiées ; statut épistémique « ${f.epistemic} ».`, 'derived', f.evidence, { value: ok === f.evidence.length }); }) };
    } },
    // Scenario evaluation with agent-proposed parameters: bounded to the validated domain, recomputed by the
    // deterministic cross-domain investigation. A model can propose values; it never produces the numbers.
    'scenario.evaluate': { permission: 'analyze', applies: m => !!m.segment, run(env, m, agent, args = {}) {
      const params = {};
      for (const [k, v] of Object.entries(args.params || {})) {
        const b = SCENARIO_BOUNDS[k]; if (!b) throw new Error(`paramètre non pris en charge : ${k}`);
        const x = Number(v); if (!Number.isFinite(x) || x < b[0] || x > b[1]) throw new Error(`${k}=${v} hors du domaine validé [${b[0]}, ${b[1]}]`);
        params[k] = Math.round(x);
      }
      const runRes = CI.run(env.ctx, { segment: m.segment, ...params }), r = runRes.result, p = { ...CI.DEFAULTS, ...params };
      if (!r.brief) return { records: 0, params, decision: r.decision, findings: [finding('scenario', `Paramètres ${JSON.stringify(params)} : pas d’investigation inter-domaines (${r.decision.reason})`, 'simulated', [rec(env.ctx, 'corridor', m.segment)], { value: r.decision.state })] };
      const ev = Object.fromEntries(r.brief.evaluation.results.map(e => [e.id, e.metrics]));
      return { records: runRes.events.length, params, brief: r.brief, decision: r.decision, findings: [finding('scenario', `Recalcul déterministe (rayon arbres ${p.treeBufferM} m, horizon ${p.horizonDays} j, report ${p.investigationDays} j) : épisodes d’exposition R0 ${ev.R0.exposureEpisodes}, R1 ${ev.R1.exposureEpisodes}, R2 ${ev.R2.exposureEpisodes} ; arbres à ≤ rayon ${ev.R0.treesWithinBuffer} ; recommandation ${r.brief.recommendedAction.alternative} ; passerelle ${r.decision.state}.`,
        'simulated', [rec(env.ctx, 'corridor', m.segment)], { value: r.brief.recommendedAction.alternative, params })] };
    } },
  };
  const SCENARIO_BOUNDS = { treeBufferM: [5, 30], frontageM: [20, 80], horizonDays: [30, 120], investigationDays: [7, 60], buildingRecencyDays: [90, 730] };

  // Independent verification: every evidence reference must resolve against the verified inputs.
  function resolve(env, e) {
    if (e.type === 'record') { const [ds, ...rest] = e.ref.split(':'); const id = rest.join(':'); const fc = env.ctx.data[ds]; return !!(fc && env.ctx.datasets[ds] && env.ctx.datasets[ds].verified === 'ok' && fc.features.some(f => f.properties.record_id === id)); }
    if (e.type === 'feed') { const it = env.feeds.items.find(i => i.id === e.ref); return !!(it && F.TRUSTED.includes(it.verification.status)); }
    if (e.type === 'feed-source') return F.SOURCES.some(s => s.id === e.ref);
    if (e.type === 'dataset') return !!(env.ctx.datasets[e.ref] && env.ctx.datasets[e.ref].verified === 'ok');
    if (e.type === 'knowledge') return KN.approved(env.knowledge).some(d => d.id === e.ref);
    if (e.type === 'knowledge-library') return e.ref === env.knowledge.lib.version;
    if (e.type === 'graph') return typeof e.ref === 'string' && e.ref.includes(':');
    return false;
  }
  function verifyFindings(env, findings) {
    return findings.map(f => ({ claim: f.claim, agent: f.agent, epistemic: f.epistemic, typeOk: EPISTEMIC.includes(f.epistemic), evidence: f.evidence.length, resolved: f.evidence.filter(e => resolve(env, e)).length }));
  }
  // Disagreement detection: a finding explicitly contradicting another topic, or a scenario hypothesis whose
  // supporting topics are weakened by another specialist.
  function disagreements(findings) {
    const out = [];
    for (const f of findings.filter(x => x.contradicts)) {
      const others = findings.filter(x => x.topic === f.contradicts && !x.contradicts && x.agent !== f.agent);
      for (const o of others) out.push({ between: [o.agent, f.agent], topic: f.contradicts, a: o.claim, b: f.claim });
      if (!others.length) out.push({ between: [f.agent], topic: f.contradicts, a: null, b: f.claim });
    }
    return out;
  }

  const TOOLSET = { EPISTEMIC, TELECOM, TOOLS, SCENARIO_BOUNDS, resolve, verifyFindings, disagreements };
  if (typeof module !== 'undefined' && module.exports) module.exports = TOOLSET; else root.CORE_TOOLS = TOOLSET;
})(typeof globalThis !== 'undefined' ? globalThis : this);
