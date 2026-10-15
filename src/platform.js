// CORE — professional platform shell (Phase 3): navigation, City Intelligence, Agents, Missions, Simulations,
// Decisions, Data & Evidence. Everything shown comes from real modules and data files; recorded runs are
// labelled as recorded; unavailable capabilities are labelled as unavailable.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Links from external feeds and documents: only https URLs become clickable (defence in depth with the CSP).
  const safeUrl = u => (/^https:\/\//i.test(String(u || '')) ? u : '#');
  const KIND = { observation: 'Observation', statistic: 'Statistique agrégée', 'public-notice': 'Avis public', proposal: 'Proposition', 'approved-decision': 'Décision approuvée', 'ongoing-project': 'Projet en cours', 'completed-work': 'Travaux terminés', prediction: 'Prévision / modèle', announcement: 'Annonce d’agence', commentary: 'Commentaire', opinion: 'Opinion', allegation: 'Allégation (non établie)' };
  const EPI = { observed: ['Observé', 'ok'], reported: ['Rapporté', 'info'], derived: ['Dérivé', 'info'], hypothesis: ['Hypothèse', 'warn'], simulated: ['Simulé', 'warn'] };
  const DEC = { 'ÉLIGIBLE À LA REVUE HUMAINE': 'ok', 'PREUVES SUPPLÉMENTAIRES REQUISES': 'warn', REJETÉ: 'fail', 'PRÊT POUR REVUE HUMAINE': 'ok', SUSPENDU: 'warn', BLOQUÉ: 'fail' };
  const MS_STATE = { 'needs-human-review': 'ok', 'needs-evidence': 'warn', rejected: 'fail', failed: 'fail', cancelled: 'warn', running: 'info', reviewing: 'info', planning: 'info', assigned: 'info', received: 'info', concluded: 'ok' };
  const LS = 'core.feeds.browser.v1';
  const P = { map: null, fly: null, sec: 'world', registry: null, counts: null, evals: null, K: null, store: { items: [] }, state: null, browser: { sources: {}, intervalMin: 15, timer: null, next: null }, missions: [], recorded: null, current: null, filter: { kind: 'all', domain: 'all', corridor: false }, llm: null, selectedAgent: null };

  const getJSON = u => fetch(u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw Error(`${u}: HTTP ${r.status}`); return r.json(); });
  const fmt = iso => iso ? `${String(iso).replace('T', ' ').slice(0, 16)}${/T\d\d:\d\d/.test(String(iso)) ? ' UTC' : ''}` : '—';
  const pill = (txt, cls = '') => `<span class="pill ${cls}">${esc(txt)}</span>`;

  async function env() {
    const sv = G.CORE_SF_VIEW; await sv.loadData();
    if (!P.ctx || P.ctxManifest !== sv.state.manifest) { P.ctx = G.CORE_COORD.buildContext({ manifest: sv.state.manifest, data: sv.state.data, verified: sv.state.verified }); P.ctxManifest = sv.state.manifest; }
    return { ctx: P.ctx, feeds: P.store, feedState: P.state, feedHealth: G.CORE_FEEDS.health({ items: P.store.items, sources: { ...P.state.sources, ...P.browser.sources } }, new Date().toISOString()), knowledge: P.K, now: new Date().toISOString() };
  }

  // ---------- Navigation ----------
  const TITLES = { science: 'Intelligence scientifique — laboratoire de décision', demo: 'Démonstration guidée', cities: 'Villes, enquêtes inter-villes et aide à la décision', problems: 'Problèmes du monde — San Francisco', activity: 'Activité de la civilisation', health: 'Santé des données', intel: 'Intelligence urbaine — San Francisco', agents: 'Organisation des agents', missions: 'Missions', sims: 'Simulations et modèles', decisions: 'Décisions (revue humaine)', data: 'Données et preuves' };
  // Phase 7: five navigation groups; every earlier view stays reachable as a sub-tab.
  const GROUPS = { world: ['world'], civ: ['agents', 'science', 'cities', 'problems', 'activity'], intel: ['intel'], missions: ['missions', 'sims', 'decisions'], evidence: ['data', 'health'] };
  const SUB = { science: 'Science & décisions', agents: 'Organisation', cities: 'Villes & enquêtes', problems: 'Problèmes du monde', activity: 'Activité', missions: 'Missions', sims: 'Simulations', decisions: 'Décisions', data: 'Données & preuves', health: 'Santé des données' };
  const groupOf = sec => Object.keys(GROUPS).find(g => GROUPS[g].includes(sec)) || sec;
  function show(sec) {
    if (GROUPS[sec] && sec !== 'world') sec = GROUPS[sec][0];
    P.sec = sec;
    if (sec !== 'sims' && P.map && P.map.getLayer && P.map.getLayer('pf-sim-line')) simVisible(false);
    const grp = groupOf(sec);
    document.querySelectorAll('#appnav [data-sec]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sec === grp)));
    if (sec === 'demo') { if (G.CORE_DEMO) G.CORE_DEMO.go(0); return; }
    if (sec === 'world') { $('ws').hidden = true; document.body.classList.remove('ws-open'); return; }
    G.CORE_SF_VIEW.closePanel();
    $('ws').hidden = false; document.body.classList.add('ws-open'); $('ws-title').textContent = TITLES[sec];
    const tabs = $('ws-tabs'); if (tabs) { const subs = GROUPS[grp] || []; tabs.innerHTML = subs.length > 1 ? subs.map(k => `<button type="button" role="tab" data-sub="${k}" aria-selected="${k === sec}">${esc(SUB[k])}</button>`).join('') : ''; tabs.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => show(b.dataset.sub)); }
    ({ science: () => G.CORE_SCIENCE_VIEW.render($('ws-body')), demo: renderDemo, cities: () => G.CORE_CITIES_VIEW && G.CORE_CITIES_VIEW.render($('ws-body')), problems: renderProblems, activity: renderActivity, health: renderHealth, intel: renderIntel, agents: renderAgents, missions: renderMissions, sims: renderSims, decisions: renderDecisions, data: renderData })[sec]();
  }

  // ---------- City Intelligence ----------
  function persistBrowser() { try { localStorage.setItem(LS, JSON.stringify({ items: P.store.items.filter(i => i.browser_retrieved), sources: P.browser.sources, intervalMin: P.browser.intervalMin })); } catch (_) { /* storage unavailable */ } }
  function restoreBrowser() {
    try { const s = JSON.parse(localStorage.getItem(LS) || 'null'); if (!s) return; P.browser.sources = s.sources || {}; P.browser.intervalMin = s.intervalMin ?? 15; G.CORE_FEEDS.merge(P.store, s.items || [], s.items && s.items[0] ? s.items[0].retrieved_at : new Date().toISOString()); } catch (_) { /* ignore */ }
  }
  async function refresh(force = false) {
    const F = G.CORE_FEEDS, now = new Date(), merged = { items: P.store.items, sources: { ...P.state.sources, ...P.browser.sources } };
    const eligible = s => s.enabled !== false && (!G.CORE_DATA_POLICY || G.CORE_DATA_POLICY.eligible(`feed:${s.id}`)); // data policy (Phase 5)
    const due = (force ? F.SOURCES.filter(s => s.browser) : F.dueSources(merged, now.getTime(), true)).filter(eligible);
    const cnns = [...(await env()).ctx.segments.keys()]; const res = { added: 0, changed: 0, failed: [], checked: due.map(s => s.id) };
    for (const s of due) {
      const st = P.browser.sources[s.id] = P.browser.sources[s.id] || {}; st.lastAttempt = now.toISOString();
      try {
        const req = F.request(s.id, { now, corridorCnns: cnns }), r = await fetch(req.url, { headers: { Accept: 'application/json, application/geo+json' } });
        if (!r.ok) throw Error(`HTTP ${r.status}`);
        const items = F.itemsFrom(s.id, await r.text(), req.opts).map(i => ({ ...i, browser_retrieved: true }));
        const m = F.merge(P.store, items, now.toISOString()); res.added += m.added; res.changed += m.changed;
        Object.assign(st, { lastSuccess: now.toISOString(), lastError: null, lastCount: items.length, lastAdded: m.added, lastChanged: m.changed, via: 'navigateur' });
      } catch (e) { st.lastError = String(e.message || e); res.failed.push(s.id); }
    }
    P.lastRefresh = { at: now.toISOString(), ...res }; persistBrowser(); schedule(); if (P.sec === 'intel') renderIntel(); updateMeta(); return res;
  }
  function schedule() {
    clearTimeout(P.browser.timer); P.browser.next = null;
    if (!P.browser.intervalMin) return;
    P.browser.next = new Date(Date.now() + P.browser.intervalMin * 60000).toISOString();
    P.browser.timer = setTimeout(() => refresh(false), P.browser.intervalMin * 60000);
  }
  // Display-only fields (detection origin) must never enter the mission input: they would change its identity.
  const missionSuggestion = s => { const { origin: _shownOrigin, ...rest } = s; return rest; };
  function suggestions(e) {
    const F = G.CORE_FEEDS, keys = new Set(), out = [];
    for (const s of P.state.suggestions || []) { keys.add(s.key); out.push({ ...s, origin: 'Node' }); }
    for (const it of P.store.items.filter(i => i.browser_retrieved)) { const s = F.suggest(it, e.ctx); if (s && !keys.has(s.key)) { keys.add(s.key); out.push({ ...s, origin: 'navigateur', created: it.retrieved_at }); } }
    return out;
  }
  async function renderIntel() {
    const e = await env(), F = G.CORE_FEEDS, health = e.feedHealth, sugg = suggestions(e);
    const linked = (() => { const g = G.CORE_GRAPH.createGraph(); for (const [cnn, s] of e.ctx.segments) g.addEntity(`segment:${cnn}`, 'StreetSegment', {}, null); return G.CORE_GRAPH.linkFeedItems(g, P.store.items, e.ctx, (i, c) => F.linkToCorridor(i, c)); })();
    const f = P.filter, items = P.store.items.filter(i => (f.kind === 'all' || i.kind === f.kind) && (f.domain === 'all' || i.domains.includes(f.domain)) && (!f.corridor || F.linkToCorridor(i, e.ctx)));
    const domains = [...new Set(P.store.items.flatMap(i => i.domains))].sort();
    const ok = health.filter(h => h.ok).length, stale = health.filter(h => /stale/.test(h.freshness)).length;
    $('ws-body').innerHTML = `
      <div class="kpis"><div class="kpi"><b>${P.store.items.length}</b><span>éléments indexés</span></div><div class="kpi"><b>${ok}/${health.length}</b><span>sources joignables</span></div><div class="kpi"><b>${stale}</b><span>sources périmées</span></div><div class="kpi"><b>${linked}</b><span>liés au corridor (graphe)</span></div><div class="kpi"><b>${sugg.length}</b><span>missions suggérées</span></div></div>
      <p class="hint">Dernière collecte complète : <b>${fmt(P.state.lastSuccessfulUpdate)}</b> par ${P.state.lastRun && P.state.lastRun.runner ? (P.state.lastRun.runner.kind === 'github-actions' ? `GitHub Actions${P.state.lastRun.runner.runUrl ? ` (<a href="${esc(P.state.lastRun.runner.runUrl)}" target="_blank" rel="noopener">exécution</a>)` : ''}` : esc(P.state.lastRun.runner.kind)) : 'Node'} — ${esc(P.state.scheduler)}. Planification indépendante du navigateur : <code>.github/workflows/city-feed.yml</code> (cron toutes les 3 h ; ${P.state.lastRun && P.state.lastRun.runner && P.state.lastRun.runner.event === 'schedule' ? 'dernière exécution déclenchée par le planificateur' : '<b>dernière exécution déclenchée manuellement</b> — une exécution planifiée automatique n’a pas encore été observée'} ; horaires GitHub non garantis). Actualisation navigateur des sources compatibles (DataSF, USGS, NWS) : ${P.browser.intervalMin ? `toutes les ${P.browser.intervalMin} min <b>tant que l’application est ouverte</b> — prochaine ${fmt(P.browser.next)}` : 'désactivée'}${P.lastRefresh ? ` · dernière ${fmt(P.lastRefresh.at)} (+${P.lastRefresh.added} nouveaux, ${P.lastRefresh.changed} modifiés, ${P.lastRefresh.failed.length} échec(s))` : ''}.</p>
      <div class="toolbar"><button type="button" class="ghost small" id="in-refresh">Actualiser maintenant (sources navigateur)</button>
        <select id="in-interval" aria-label="Fréquence d’actualisation navigateur">${[0, 15, 30, 60].map(m => `<option value="${m}" ${m === P.browser.intervalMin ? 'selected' : ''}>${m ? `Toutes les ${m} min` : 'Actualisation automatique désactivée'}</option>`).join('')}</select></div>
      <details><summary>État des sources (${health.length}) et lacunes</summary><table class="tbl"><thead><tr><th>Source</th><th>Éléments</th><th>Fraîcheur</th><th>Accès · intervalle</th><th>Confiance</th><th>État</th></tr></thead><tbody>${health.map(h => `<tr><td>${esc(h.name)}${h.retired ? `<br><span class="hint">${esc(h.retired)}</span>` : ''}</td><td>${h.items}</td><td>${esc(h.freshness)}</td><td>${h.browser ? 'Node + navigateur' : 'Node seulement'} · ${h.minIntervalMin} min</td><td>${h.confidence ? `${esc(h.confidence.level)}<br><span class="hint">${esc(h.confidence.limitations)}</span>` : '—'}</td><td>${h.enabled === false ? pill('retirée', 'warn') : h.lastError ? pill('échec', 'fail') : h.lastSuccess ? pill('ok', 'ok') : pill('jamais', 'warn')}</td></tr>`).join('')}</tbody></table>
        <ul>${(P.state.coverageGaps || []).map(g => `<li>${esc(g)}</li>`).join('')}</ul></details>
      ${sugg.length ? `<h3 style="margin:4px 0;font-size:13px">Missions suggérées</h3><ul class="list">${sugg.slice(0, 8).map(s => `<li class="item"><span class="t">${esc(s.reason)}</span><span class="m">${pill(s.type, 'info')} ${pill(`détectée (${s.origin})`)} ${esc(fmt(s.created))}</span><button type="button" class="small" data-launch="${esc(s.key)}">Lancer la mission</button></li>`).join('')}</ul>` : ''}
      <div class="toolbar"><select id="in-kind" aria-label="Type d’élément"><option value="all">Tous les types</option>${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <select id="in-domain" aria-label="Domaine"><option value="all">Tous les domaines</option>${domains.map(d => `<option ${f.domain === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
        <label class="hint"><input type="checkbox" id="in-corridor" ${f.corridor ? 'checked' : ''}> corridor seulement</label></div>
      <ul class="list" id="in-list">${items.slice(0, 80).map(i => { const l = F.linkToCorridor(i, e.ctx);
        return `<li class="item"><span class="t"><a href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener">${esc(i.title)}</a></span><span>${esc(i.summary)}</span>
        <span class="m">${pill(KIND[i.kind] || i.kind, i.kind === 'observation' || i.kind === 'statistic' ? 'ok' : ['prediction', 'commentary', 'opinion', 'allegation'].includes(i.kind) ? 'warn' : 'info')} ${pill(i.verification.status === 'official-source' ? 'source officielle' : i.verification.status === 'registered-open-data' ? 'données ouvertes enregistrées' : 'non vérifiée', F.TRUSTED.includes(i.verification.status) ? 'ok' : 'fail')} ${i.confidence ? `<span title="${esc(i.confidence.limitations)}">confiance ${esc(i.confidence.level)} — ${esc(i.confidence.limitations)}</span>` : ''}
        <span>${esc(i.publisher)}</span><span>publié par la source ${esc(fmt(i.published))}</span>${i.data && i.data.start ? `<span>période prévue ${esc(i.data.start)} → ${esc(i.data.end || '?')}</span>` : ''}<span>collecté par CORE ${esc(fmt(i.retrieved_at))}${i.revision > 1 ? ` · révision ${i.revision}` : ''}</span><span>${i.domains.map(esc).join(', ')}</span>
        ${l ? pill(`tronçon ${l.segment} (${l.basis})`, 'info') : i.geo ? pill('géolocalisé hors corridor') : pill('non géolocalisé')}</span>
        ${i.geo && i.geo.type === 'Point' ? `<button type="button" class="ghost small" data-geo="${esc(i.id)}">Voir sur la carte</button>` : ''}${F.TRUSTED.includes(i.verification.status) ? ` <button type="button" class="ghost small" data-investigate="${esc(i.id)}">Investiguer</button>` : ''}</li>`; }).join('')}</ul>
      <p class="hint">${items.length > 80 ? `${items.length - 80} élément(s) supplémentaires non affichés. ` : ''}Les éléments civiques sont attribués à leur source officielle et classés par type et statut uniquement, sans évaluation politique.</p>`;
    $('in-refresh').onclick = () => refresh(true);
    $('in-interval').onchange = ev => { P.browser.intervalMin = +ev.target.value; persistBrowser(); schedule(); renderIntel(); };
    $('in-kind').onchange = ev => { P.filter.kind = ev.target.value; renderIntel(); };
    $('in-domain').onchange = ev => { P.filter.domain = ev.target.value; renderIntel(); };
    $('in-corridor').onchange = ev => { P.filter.corridor = ev.target.checked; renderIntel(); };
    $('ws-body').querySelectorAll('[data-geo]').forEach(b => b.onclick = () => { const it = P.store.items.find(i => i.id === b.dataset.geo); highlight({ point: it.geo.coordinates }); P.fly({ center: it.geo.coordinates, zoom: it.source === 'usgs-quakes' ? 9 : 16.5, pitch: it.source === 'usgs-quakes' ? 0 : 55, bearing: -44 }, 3500); G.CORE_CAMERA.focus(it.geo.coordinates); });
    $('ws-body').querySelectorAll('[data-launch]').forEach(b => b.onclick = () => { const s = suggestions(e).find(x => x.key === b.dataset.launch); show('missions'); launch({ type: 'suggestion', suggestion: missionSuggestion(s) }); });
    $('ws-body').querySelectorAll('[data-investigate]').forEach(b => b.onclick = () => { P.pendingOrigin = { type: 'item', item: b.dataset.investigate }; show('missions'); launch(P.pendingOrigin); });
  }

  // ---------- Map highlight for items and missions ----------
  function highlight({ segment, point, points = [] }) {
    const map = P.map;
    if (!map.getSource('pf-target')) {
      map.addSource('pf-target', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'pf-target-line', type: 'line', source: 'pf-target', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round' }, paint: { 'line-color': '#e3b341', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 17, 14], 'line-opacity': 0.85 } });
      map.addLayer({ id: 'pf-target-point', type: 'circle', source: 'pf-target', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 17, 12], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#e3b341', 'circle-stroke-width': 3 } });
    }
    const fs = [];
    if (segment && P.ctx && P.ctx.segments.get(segment)) fs.push({ type: 'Feature', geometry: P.ctx.segments.get(segment).geometry, properties: {} });
    for (const p of [point, ...points].filter(Boolean)) fs.push({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} });
    map.getSource('pf-target').setData({ type: 'FeatureCollection', features: fs });
  }

  // ---------- Agents ----------
  // Recorded model-assisted missions, loaded once to show each agent's real contributions.
  async function cogRecords() { if (P.cogRecords || !P.cogIndex) return P.cogRecords || []; P.cogRecords = (await Promise.all(P.cogIndex.missions.map(m => getJSON(`data/missions/cognitive/${m.id.replace(':', '-')}.json`).catch(() => null)))).filter(Boolean); return P.cogRecords; }
  const TOOL_SOURCES = { 'works.windows': 'permits', 'works.telecom': 'permits', 'trees.near-works': 'street-trees', 'buildings.frontage': 'building-permits', 'energy.benchmarks': 'energy-benchmarks', 'public-space.sidewalks': 'sidewalks', 'sim.sidewalk-capacity': 'sidewalks', 'planning.records': 'datasf-planning (feed)', 'grid.mix': 'caiso-fuelmix (feed)', 'air.quality': 'openmeteo-aq (en quarantaine)', 'resilience.quake-context': 'usgs-quakes (feed)', 'resilience.weather-alerts': 'nws-alerts (feed)', 'civic.legislation': 'legistar (historique)', 'graph.link': 'veille + corridor', 'knowledge.search': 'bibliothèque de connaissances', 'knowledge.retrieve': 'bibliothèque de connaissances', 'scenario.investigate': 'instantané complet', 'scenario.evaluate': 'instantané complet', 'policy.check': 'politique de données', 'evidence.check': 'registre de preuves' };
  async function renderAgents() {
    await cogRecords(); if (G.CORE_PROBLEMS_VIEW) await G.CORE_PROBLEMS_VIEW.load().catch(() => null);
    if (P.sec !== 'agents') return; // the visitor left during the async load: never overwrite another view
    const R = P.registry, c = P.counts, running = P.missions.reduce((n, m) => n + m.tasks.filter(t => t.state === 'running').length, 0);
    const F = P.agentFilter || 'all', keep = a => F === 'all' || (F === 'deterministic' && a.executionMode === 'deterministic') || (F === 'llm' && a.executionMode === 'llm') || (F === 'unavailable' && a.executionMode === 'unavailable');
    const byDept = new Map(R.departments.map(d => [d.id, []])); for (const a of R.agents) if (a.department && byDept.has(a.department) && !a.id.endsWith('.lead') && keep(a)) byDept.get(a.department).push(a);
    const st = a => a.executionMode === 'deterministic' ? pill('exécutable (règles)', 'ok') : a.executionMode === 'llm' ? (P.llm && P.llm.available ? pill('assisté par modèle local — disponible', 'ok') : pill('assisté par modèle — modèle indisponible', 'warn')) : a.executionMode === 'unavailable' ? pill('indisponible', 'fail') : pill('coordination', 'info');
    const cogCount = id => (P.cogIndex ? P.cogIndex.missions.filter(m => m.agents.includes(id)).length : 0);
    const AW = G.CORE_AGENTS_WORLD, recPart = new Set([...(P.cogIndex ? P.cogIndex.missions.flatMap(m => m.agents) : []), ...(P.recorded ? P.recorded.missions.flatMap(m => m.agentIds || []) : []), ...(P.operations ? P.operations.tasks.filter(t => t.result).flatMap(t => t.agents.map(a => a.id)) : [])]), replaying = !!(AW && AW.state.replay);
    $('ws-body').innerHTML = `
      <div class="civ-truth" id="civ-truth"><b>Tableau de bord de la civilisation (données chargées)</b>${(() => { const ops = P.operations, live = G.CORE_MOTION && G.CORE_MOTION.state.live, liveRun = live && !live.stopped ? (live.running || []).length : 0, queued = live && live.counts ? (live.counts.intake || 0) + (live.counts.classified || 0) + (live.counts.assigned || 0) : 0, probs = G.CORE_CIV && G.CORE_CIV.state.problems;
        return `<div class="kpis"><div class="kpi"><b>${c.registered}</b><span>profils enregistrés</span></div><div class="kpi"><b>${c.executable + c.llm}</b><span>exécutables (${c.executable} règles · ${c.llm} modèle)</span></div><div class="kpi"><b>${running + liveRun}</b><span>en cours d’exécution${P.local ? '' : ' (site public : aucune)'}</span></div>
          <div class="kpi"><b>${queued}</b><span>tâches en file (superviseur local)</span></div><div class="kpi"><b>${(P.cogIndex ? P.cogIndex.missions.length : 0) + (P.recorded ? P.recorded.missions.length : 0) + (ops ? ops.tasks.filter(t => t.result).length : 0)}</b><span>missions / opérations enregistrées</span></div><div class="kpi"><b>${recPart.size}</b><span>agents avec travail enregistré</span></div>
          <div class="kpi"><b>${G.CORE_POPULATION ? G.CORE_POPULATION.ZONES.length : 0}</b><span>domaines de travail virtuels</span></div><div class="kpi"><b>0</b><span>résultats vérifiés sur le terrain</span></div><div class="kpi"><b>${probs ? probs.problems.length : '…'}</b><span>problèmes non résolus (aucune décision humaine)</span></div></div>`; })()}
        <p class="hint">Avatars : ${replaying ? 'participants d’une <b>relecture</b> enregistrée ; les autres sont atténués' : 'toute la population, déplacements <b>illustratifs</b> dans des zones virtuelles'} — voir la barre « Population » sur la carte.</p>
        <div class="toolbar"><select id="civ-mission" aria-label="Mission enregistrée à relire">${(P.cogIndex ? P.cogIndex.missions : []).map(m => `<option value="${esc(m.id)}">${esc(m.mode === 'fast' ? 'rapide' : 'approfondie')} · ${esc(m.question.slice(0, 70))}${m.question.length > 70 ? '…' : ''}</option>`).join('')}</select><button type="button" class="small" id="civ-replay">Relire dans le monde</button></div></div>
      <div class="kpis"><div class="kpi"><b>${c.registered}</b><span>profils enregistrés</span></div><div class="kpi"><b>${c.executable}</b><span>exécutables (règles)</span></div><div class="kpi"><b>${c.llm}</b><span>assistés par modèle (${P.llm && P.llm.available ? 'modèle disponible' : 'modèle indisponible'})</span></div><div class="kpi"><b>${c.coordinationOnly}</b><span>coordination seule</span></div><div class="kpi"><b>${c.unavailable}</b><span>indisponibles</span></div><div class="kpi"><b>${G.CORE_MISSIONS.DEFAULT_OPTS.concurrency}</b><span>exécutions simultanées max.</span></div><div class="kpi"><b>${running}</b><span>tâches actives maintenant</span></div></div>
      <p class="hint">Modèle de langage local : <b>${esc(P.llm ? (P.llm.available ? `${P.llm.model} disponible (Ollama, ${(P.llm.models.find(m => m.name === P.llm.model) || {}).parameters || '?'} paramètres, ${(P.llm.models.find(m => m.name === P.llm.model) || {}).quantization || '?'})` : P.llm.reason) : 'test en cours')}</b>. Il choisit des outils autorisés et rédige des interprétations validées ; il ne calcule aucun chiffre et ne décide rien. ${c.executable} agents à règles fonctionnent sans modèle. Mise en place : <code>node scripts/llm-check.mjs</code>. ${esc(G.CORE_ORG.DISCLAIMER)}</p>
      ${P.cogIndex && P.cogIndex.missions.length ? `<p class="hint">Collaborations enregistrées (modèle réel) : ${P.cogIndex.missions.length} mission(s) — ${P.cogIndex.missions.slice(0, 3).map(m => `${esc(m.question)} → ${esc(m.decision)} (${m.metrics.modelCalls} appels au modèle, ${m.metrics.toolCalls} outils)`).join(' ; ')}</p>` : ''}
      ${G.CORE_SPECIALIZATIONS ? (() => { const SZ = G.CORE_SPECIALIZATIONS, k = SZ.counts(); return `<details><summary>Spécialisations professionnelles : ${k.specializations} dans ${k.domains} domaines — ${k['model-assisted']} assistées par modèle, ${k.deterministic} à règles, ${k.none} non exécutables</summary><p class="hint">Une spécialisation n’est exécutable que par un runtime réel ; les autres sont listées avec la preuve manquante. Le routage d’une mission choisit au plus 3 spécialistes assistés par modèle et ajoute les réviseurs obligatoires.</p><table class="tbl"><thead><tr><th>Domaine</th><th>Spécialisations</th></tr></thead><tbody>${SZ.DOMAINS.map(d => `<tr><td>${esc(d.name)}</td><td>${SZ.SPECS.filter(x => x.domain === d.id).map(x => `${esc(x.title)} ${x.runtime === 'model-assisted' ? pill('modèle', 'ok') : x.runtime === 'deterministic' ? pill('règles', 'info') : pill('non exécutable', 'warn')}${x.gap ? ` <span class="hint">${esc(x.gap)}</span>` : ''}`).join('<br>') || '—'}</td></tr>`).join('')}</tbody></table></details>`; })() : ''}
      <details class="explain"><summary>Comment fonctionnent les agents CORE</summary><ul>
        <li><b>Agents à règles</b> (${c.executable}) : du code déterministe exécute un outil sur des données publiques vérifiées ; le résultat est reproductible.</li>
        <li><b>Agents assistés par modèle</b> (${c.llm}) : un modèle local open-weight (qwen3:8b via Ollama) choisit ou interprète des preuves produites par les outils ; il ne calcule aucun chiffre. Disponible seulement sur une machine avec Ollama ; ce site public montre des exécutions réelles <b>enregistrées</b>.</li>
        <li><b>Validation</b> : chaque énoncé du modèle doit citer des preuves, n’utiliser que leurs nombres avec leur sens (unité, portée, date) ; sinon il est rejeté et reste visible comme rejet.</li>
        <li><b>Passerelle</b> : recalcul de chaque outil et revalidation de chaque énoncé ; le modèle ne peut que rendre la décision plus prudente.</li>
        <li><b>Revue humaine</b> obligatoire ; aucun agent n’autorise ni n’exécute d’action réelle. Les mises à jour de connaissances sont proposées puis approuvées par un humain.</li>
        <li><b>Profils non exécutables</b> : ${c.coordinationOnly} de coordination et ${c.unavailable} indisponibles (donnée ou outil manquant) — ce ne sont pas des agents autonomes.</li></ul></details>
      <div class="toolbar" role="group" aria-label="Filtrer par statut">${[['all', 'Tous'], ['llm', `Assistés par modèle (${c.llm})`], ['deterministic', `À règles (${c.executable})`], ['unavailable', `Indisponibles (${c.unavailable})`]].map(([k, l]) => `<button type="button" class="small ${F === k ? '' : 'ghost'}" data-agfilter="${k}" aria-pressed="${F === k}">${esc(l)}</button>`).join('')}</div>
      ${(() => { const by = id => R.agents.find(a => a.id === id) || {}, gl = by('core.global.coordinator'), gw = by('core.san-francisco.governance.gateway'), mg = by('core.san-francisco.manager'), leads = R.agents.filter(a => a.id.endsWith('.lead')), sp = R.agents.filter(a => a.scope.level === 'specialist'), spx = sp.filter(a => a.executionMode === 'deterministic' || a.executionMode === 'llm'), perms = l => [...new Set(l.map(a => a.permission))].join(' · ');
        return `<table class="tbl hier"><thead><tr><th>Niveau</th><th>Profils</th><th>Permission</th><th>Ce qu’il fait réellement</th></tr></thead><tbody>
        <tr><td>CORE Command</td><td><code>${esc(gl.code)}</code> coordination globale (non exécutable) · <code>${esc(gw.code)}</code> passerelle (exécutable)</td><td>${esc(perms([gl, gw]))}</td><td>Politiques communes ; la passerelle recalcule tout et peut seulement rendre une décision plus prudente. Aucune autorisation réelle.</td></tr>
        <tr><td>Coordinateur de mission</td><td><code>${esc(mg.code)}</code> coordination San Francisco (exécutable)</td><td>${esc(mg.permission)}</td><td>Routage déterministe des missions vers les spécialistes ; aucune décision.</td></tr>
        <tr><td>Directions de domaine</td><td>${leads.length} directions (non exécutables)</td><td>${esc(perms(leads))}</td><td>Profils de coordination.</td></tr>
        <tr><td>Spécialistes</td><td>${spx.length} exécutables sur ${sp.length}</td><td>${esc(perms(sp))}</td><td>Exécutent des outils autorisés ; les assistés par modèle interprètent, sans calculer.</td></tr></tbody></table>`; })()}
      <p class="hint">Les permissions sont fixées dans le registre ; un agent ne peut jamais les élever. Les directions de département sont des profils de coordination, pas des agents exécutables.</p>
      <div class="org"><b>Coordination globale CORE</b> → <button type="button" class="agentbtn" data-agent="core.san-francisco.manager">Coordination San Francisco</button>
        ${R.departments.filter(d => F === 'all' || byDept.get(d.id).length).map(d => `<details ${F !== 'all' || byDept.get(d.id).some(a => a.executionMode === 'llm') ? 'open' : ''}><summary>${esc(d.name)} <span class="hint">(${byDept.get(d.id).length})</span></summary>
          <button type="button" class="agentbtn" data-agent="core.san-francisco.${d.id}.lead">Direction — ${esc(d.name)}</button> ${pill('coordination', 'info')}<br>
          ${byDept.get(d.id).map(a => `<button type="button" class="agentbtn" data-agent="${esc(a.id)}">${esc(a.role)}</button> ${st(a)}${a.independent ? ' ' + pill('indépendant') : ''}${cogCount(a.id) ? ` <span class="hint">${cogCount(a.id)} collaboration(s)</span>` : ''}<br>`).join('')}</details>`).join('')}
        <details open><summary>Vérification et gouvernance indépendantes</summary><button type="button" class="agentbtn" data-agent="core.san-francisco.governance.gateway">Passerelle de décision</button> ${pill('exécutable', 'ok')}</details></div>
      <div id="ag-profile"></div>`;
    $('ws-body').querySelectorAll('[data-agent]').forEach(b => b.onclick = () => profile(b.dataset.agent));
    $('ws-body').querySelectorAll('[data-agfilter]').forEach(b => b.onclick = () => { P.agentFilter = b.dataset.agfilter; renderAgents(); });
    $('civ-replay').onclick = async () => { const id = $('civ-mission').value; show('world'); if (AW) { if (G.CORE_CAMERA) G.CORE_CAMERA.view('mission'); await AW.startReplay(m => m.id === id); } };
    if (P.selectedAgent) profile(P.selectedAgent);
  }
  // Phase 7: open an agent dossier from the world (avatar click) or anywhere else.
  // Phase 8: any agent opens its own floating profile card; the Organisation dossier stays available from that card.
  function openAgent(id) { P.selectedAgent = id; if (G.CORE_AGENT_PROFILE) G.CORE_AGENT_PROFILE.open(id); else if (P.sec === 'agents' && $('ag-profile')) profile(id); else show('agents'); }
  function openAgentDossier(id) { P.selectedAgent = id; if (P.sec === 'agents' && $('ag-profile')) profile(id); else show('agents'); }
  function profile(id) {
    P.selectedAgent = id;
    const a = P.registry.agents.find(x => x.id === id); if (!a) return;
    const hist = [...(P.recorded ? P.recorded.missions.filter(m => (m.agentIds || []).includes(id)).map(m => ({ id: m.id, origin: m.origin, decision: m.decision, how: 'enregistrée (Node)' })) : []),
      ...P.missions.filter(m => m.plan && [m.plan.manager, ...m.plan.specialists.map(s => s.agent), m.plan.verifier, m.plan.reviewer, m.plan.gateway].includes(id)).map(m => ({ id: m.id, origin: m.target.question, decision: m.decision ? m.decision.state : m.state, how: 'session (navigateur)' }))];
    const KN = G.CORE_KNOWLEDGE, ev = (P.liveEvals || P.evals.results).filter(r => r.agent === id), docs = KN.collection(P.K, a);
    // Real contributions in recorded model-assisted missions (deterministic tool calls are counted for every agent).
    const contrib = (P.cogRecords || []).map(r => { const calls = r.toolCalls.filter(t => t.agent === id && t.state === 'ok'), ev2 = r.evidence.filter(e => e.agent === id), acc = r.board.filter(b => b.agent === id), rej = (r.rejected || []).filter(x => x.agent === id), dOut = (r.disagreements || []).filter(d => d.between[1] === id), dIn = (r.disagreements || []).filter(d => d.between[0] === id);
      return { id: r.id, mode: r.mode, q: r.target.question, calls: calls.length, tools: [...new Set(calls.map(t => t.tool))], evidence: ev2.length, acc, rej, dOut, dIn, peers: [...new Set([...dOut.map(d => d.between[0]), ...dIn.map(d => d.between[1])])] }; }).filter(x => x.calls || x.acc.length || x.rej.length || x.dOut.length || x.dIn.length);
    const props = P.K.lib.proposals.filter(p => (p.collections || []).includes(id) || p.proposedBy === id);
    const kEval = a.executionMode === 'llm' && G.CORE_LEARNING ? G.CORE_LEARNING.evaluateRole(P.K, P.registry, id.split('.').pop()) : null;
    if (P.cogIndex) for (const m of P.cogIndex.missions.filter(x => x.agents.includes(id))) hist.push({ id: m.id, origin: m.question, decision: m.decision, how: `collaboration avec modèle réel (${m.model})` });
    const AW = G.CORE_AGENTS_WORLD, av = AW && AW.state.avatars.get(id), rp = AW && AW.state.replay;
    const now = av && av.visible ? `${rp && rp.plan.agents.includes(id) ? pill('relecture', 'info') : pill('en attente', 'info')} ${esc(AW.STATE_FR[av.state] || av.state)}${av.note ? ` — <span class="hint">${esc(av.note)}</span>` : ''}` : `${pill('inactif')} aucune exécution en cours${a.executionMode === 'llm' && !P.local ? ' (site public : le modèle ne s’exécute pas ici)' : ''}`;
    const sup = []; for (let x = a; x && x.supervisor; x = P.registry.agents.find(y => y.id === x.supervisor)) { const y = P.registry.agents.find(z => z.id === x.supervisor); if (!y || sup.includes(y)) break; sup.push(y); }
    $('ag-profile').innerHTML = `<div class="item dossier-agent"><span class="t"><code class="mid">${esc(a.code)}</code> ${esc(a.role)}</span><span class="m"><code>${esc(a.id)}</code></span>
      <h4>Travail actuel</h4><p>${now}${av && av.visible ? ` <button type="button" class="ghost small" id="ag-follow">${AW.state.follow === id ? 'Arrêter de suivre' : 'Suivre dans le monde'}</button>` : ''}</p>
      <h4>Responsabilité</h4><p class="hint">Rend compte à : ${sup.length ? sup.map(y => `<code>${esc(y.code)}</code> ${esc(y.role)}`).join(' → ') : 'aucun (sommet)'} · décisions : passerelle déterministe puis revue humaine · permission <b>${esc(a.permission)}</b>, non modifiable par l’agent.</p>
      <h4>Identité</h4>
      <table class="tbl"><tbody>
      <tr><th>Portée</th><td>${esc(Object.values(a.scope).join(' · '))}</td></tr><tr><th>Département</th><td>${esc(a.department || '—')}</td></tr>
      <tr><th>Spécialisation</th><td>${esc(a.specialization)}</td></tr><tr><th>Compétences</th><td>${a.competencies.map(c => `${esc(c.id)} (${esc(c.basis === 'declared' ? 'déclarée' : c.basis)})`).join(', ') || '—'}</td></tr>
      <tr><th>Outils autorisés</th><td>${a.tools.map(esc).join(', ') || 'aucun'}</td></tr><tr><th>Permission</th><td>${esc(a.permission)} (non modifiable par l’agent)</td></tr>
      <tr><th>Superviseur</th><td>${esc(a.supervisor || '—')}</td></tr><tr><th>Mode d’exécution</th><td>${esc(a.executionMode)}${a.gap ? ` — ${esc(a.gap)}` : ''}</td></tr>
      <tr><th>Statut</th><td>${esc(a.status)}</td></tr>${a.model ? `<tr><th>Modèle</th><td>${esc(a.model.provider)} · ${esc(a.model.name)} — ${P.llm && P.llm.available ? pill('disponible', 'ok') : pill('indisponible', 'warn')}<br><span class="hint">${esc(a.model.role)}</span></td></tr>` : ''}<tr><th>Budget</th><td>${a.budget.maxTasks} tâches · ${a.budget.maxMs} ms · ${a.budget.maxRecords} enregistrements</td></tr>
      <tr><th>Version des connaissances</th><td>${esc(P.K.lib.version)} — collection de ${docs.length} document(s) approuvé(s)</td></tr></tbody></table>
      <h4>Connaissances</h4><b>Collection de connaissances</b><ul>${docs.map(d => { const fr = KN.freshness(d, new Date().toISOString()), src = P.K.sources.get(d.source) || {}; return `<li><a href="${esc(safeUrl(d.url))}" target="_blank" rel="noopener">${esc(d.title)}</a> v${d.version}${d.history && d.history.length ? ` (${d.history.length} version(s) antérieure(s))` : ''} · ${esc(src.name || d.source)} · licence ${esc(src.license || '?')} · récupéré ${esc(d.retrieved_at)} · ${fr.stale ? pill('à actualiser', 'warn') : pill('à jour', 'ok')} · confiance : ${esc(d.confidence)} · limites : ${esc(d.limitations || '—')}${a.knowledge.includes(d.id) ? '' : ' ' + pill('ajouté par apprentissage approuvé', 'info')}</li>`; }).join('') || '<li>aucune</li>'}</ul>
      ${kEval ? `<b>Évaluation des connaissances du rôle</b> ${pill(`${Math.round(kEval.score * 100)} %`, kEval.score === 1 ? 'ok' : 'warn')}<ul>${kEval.results.map(r => `<li>${r.pass ? pill('réussie', 'ok') : pill('échec', 'fail')} ${esc(r.question)}</li>`).join('')}</ul>` : ''}
      ${props.length ? `<b>Apprentissage contrôlé</b><ul>${props.map(p => `<li>${pill(p.status, p.status === 'approved' ? 'ok' : p.status === 'pending' ? 'warn' : 'fail')} ${esc(p.docId)} — ${esc(p.reason)} · proposé par ${esc(p.proposedBy)}${p.reviewer ? ` · décidé par ${esc(p.reviewer)}` : ''}${(p.evaluation || []).filter(x => id.endsWith(x.agent)).map(x => ` · évaluation ${Math.round(x.before.score * 100)} % → ${Math.round(x.after.score * 100)} %`).join('')}</li>`).join('')}</ul>` : ''}
      <b>Sources de données autorisées (via ses outils)</b> <span class="hint">${[...new Set(a.tools.map(t => TOOL_SOURCES[t]).filter(Boolean))].map(esc).join(' · ') || 'aucune'}</span><br>
      <h4>Historique</h4><b>Contributions dans les missions enregistrées</b> ${contrib.length ? `<ul>${contrib.map(x => `<li>${pill(x.mode === 'deep' ? 'mode approfondi' : 'mode rapide')} ${esc(x.q.slice(0, 90))}… — ${x.calls} appel(s) d’outils (${x.tools.map(esc).join(', ') || '—'}), ${x.evidence} preuve(s) produite(s), ${pill(`${x.acc.length} énoncé(s) accepté(s)`, 'ok')} ${x.rej.length ? pill(`${x.rej.length} rejeté(s)`, 'fail') : ''}${x.dOut.length ? ` · ${x.dOut.length} désaccord(s) émis` : ''}${x.dIn.length ? ` · ${x.dIn.length} reçu(s)` : ''}${x.peers.length ? ` · avec ${x.peers.map(p => esc(p.split('.').pop())).join(', ')}` : ''}
        ${x.acc.length ? `<details><summary>Énoncés acceptés (${x.acc.length})</summary><ul>${x.acc.slice(0, 6).map(b => `<li>${esc(b.statement)} <span class="hint">[${b.cites.map(esc).join(', ')}]</span></li>`).join('')}</ul></details>` : ''}${x.rej.length ? `<details><summary>Sorties rejetées (${x.rej.length})</summary><ul>${x.rej.slice(0, 6).map(r => `<li>${esc((r.statement || r.item).slice(0, 140))} — ${pill(r.reason.slice(0, 90), 'fail')}</li>`).join('')}</ul></details>` : ''}</li>`).join('')}</ul>` : '<span class="hint">aucune contribution enregistrée</span>'}<br>
      <b>Évaluations</b> ${ev.length ? `<ul>${ev.map(r => `<li>${r.pass ? pill('réussie', 'ok') : pill('échec', 'fail')} ${esc(r.case)} — ${esc(r.date)}</li>`).join('')}</ul>` : '<span class="hint">aucune (pas d’outil exécutable)</span>'}
      ${a.executionMode === 'deterministic' ? '<button type="button" class="ghost small" id="ag-reeval">Réévaluer maintenant</button>' : ''}
      <b>Historique de missions</b> ${hist.length ? `<ul>${hist.slice(0, 12).map(h => `<li>${pill(h.how)} ${esc(h.origin)} — ${esc(h.decision)}</li>`).join('')}</ul>` : '<span class="hint">aucune</span>'}
      <p class="hint">${esc(a.disclaimer)}</p></div>`;
    const fb = $('ag-follow'); if (fb) fb.onclick = () => { show('world'); AW.follow(id); };
    const rb = $('ag-reeval'); if (rb) rb.onclick = async () => { P.liveEvals = G.CORE_EVALS.evaluate(await env(), P.registry); profile(id); };
  }

  // ---------- Missions ----------
  async function launch(origin) {
    const e = await env(), M = G.CORE_MISSIONS, m = M.newMission(origin, e);
    P.missions.unshift(m); P.missions.length = Math.min(P.missions.length, 20); P.current = m; P.view = 'live'; P.msTab = 'det'; // a rule-based mission is shown in its own tab // bounded session history
    if (m.target.segment) { highlight({ segment: m.target.segment }); const c = P.ctx.segments.get(m.target.segment).geometry.coordinates; P.fly({ center: c[Math.floor(c.length / 2)], zoom: 16.4, pitch: 55, bearing: -44 }, 3000); G.CORE_CAMERA.focus(c[Math.floor(c.length / 2)]); }
    let pending = false; const tick = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; if (P.sec === 'missions' && P.current === m) renderMissions(); }); };
    renderMissions();
    await M.run(m, e, { registry: P.registry, onEvent: tick });
    if (P.sec === 'missions' && P.current === m) renderMissions();
    try { localStorage.setItem('core.missions.v1', JSON.stringify(P.missions.slice(0, 10).map(x => ({ id: x.id, state: x.state, decision: x.decision && x.decision.state, fingerprint: x.fingerprint, at: new Date().toISOString() })))); } catch (_) { /* optional */ }
    return m;
  }
  function missionHtml(m, recorded) {
    const segs = [...(P.ctx ? P.ctx.segments.keys() : [])];
    return `<div class="item">${recorded ? pill('MISSION ENREGISTRÉE — journal enregistré (Node), non réexécutée dans ce navigateur', 'warn') : pill('EXÉCUTION RÉELLE dans ce navigateur', 'ok')}
      <span class="t">${esc(m.target.question)}</span><span class="m">${pill(m.state, MS_STATE[m.state] || '')} <code>${esc(m.id)}</code> ${m.fingerprint ? `empreinte <code>${esc(m.fingerprint)}</code>` : ''} ${m.plan ? `· domaines ${m.plan.domains.map(esc).join(', ')}` : ''}</span>
      ${!recorded && ['running', 'assigned', 'planning'].includes(m.state) ? '<button type="button" class="ghost small" id="ms-cancel">Annuler la mission</button>' : ''}
      ${recorded ? `<button type="button" class="ghost small" id="ms-rerun">Réexécuter en direct et comparer</button>${P.rerunCheck ? ` ${P.rerunCheck}` : ''}` : ''}</div>
      ${m.plan ? `<details open><summary>Tâches (${m.tasks.length}) — concurrence ${G.CORE_MISSIONS.DEFAULT_OPTS.concurrency}, délai ${G.CORE_MISSIONS.DEFAULT_OPTS.timeoutMs} ms, ${G.CORE_MISSIONS.DEFAULT_OPTS.retries} reprise</summary><table class="tbl"><thead><tr><th>Agent</th><th>Outil</th><th>État</th><th>Essais</th><th>ms</th><th>Enr.</th></tr></thead><tbody>
        ${m.tasks.map(t => `<tr><td><button type="button" class="agentbtn" data-agentlink="${esc(t.agent)}">${esc(t.agent.split('.').slice(2).join('.'))}</button></td><td>${esc(t.tool)}</td><td>${pill(t.state, t.state === 'succeeded' ? 'ok' : t.state === 'running' ? 'info' : ['failed', 'timed-out', 'denied'].includes(t.state) ? 'fail' : 'warn')}</td><td>${t.attempts ?? '—'}</td><td>${t.ms ?? '—'}</td><td>${t.records ?? '—'}</td></tr>`).join('')}</tbody></table>
        ${m.plan.unavailable.length ? `<p class="hint">Profils pertinents indisponibles : ${m.plan.unavailable.map(u => `${esc(u.role)} (${esc(u.gap)})`).join(' ; ')}</p>` : ''}</details>` : ''}
      ${m.findings.length ? `<details open><summary>Constats partagés (${m.findings.length})</summary><ul class="list">${m.findings.map((f, i) => `<li class="item"><span>[${i}] ${esc(f.claim)}</span><span class="m">${pill(EPI[f.epistemic][0], EPI[f.epistemic][1])} ${esc(f.agent.split('.').pop())} · preuves : ${f.evidence.map(ev => ev.url ? `<a href="${esc(ev.url)}" target="_blank" rel="noopener">${esc(ev.ref)}</a>` : esc(ev.ref)).slice(0, 4).join(', ')}${f.evidence.length > 4 ? ` +${f.evidence.length - 4}` : ''}</span></li>`).join('')}</ul></details>` : ''}
      ${m.conclusion ? `<details open><summary>Désaccords, revue adversariale, conclusion</summary>
        <p><b>Désaccords :</b> ${m.disagreements.length ? m.disagreements.map(d => `${esc(d.topic)} — ${esc(d.b)}`).join(' ; ') : 'aucun'}</p>
        <p><b>Revue adversariale :</b> ${m.adversarial.sensitivities.length ? `sensibilités : ${m.adversarial.sensitivities.map(esc).join(' ; ')}. ` : ''}${m.adversarial.missing.length ? `manques : ${m.adversarial.missing.map(esc).join(' ; ')}. ` : ''}${m.adversarial.limitations.map(esc).join(' ')}${m.adversarial.failedTasks.length ? ` Tâches non abouties : ${m.adversarial.failedTasks.map(esc).join(', ')}.` : ''}</p>
        <ul>${m.conclusion.statements.map(s => `<li>${esc(s.text)} <span class="hint">[${s.cites.join(', ')}] ${s.epistemic.map(x => EPI[x][0]).join(' / ')}</span></li>`).join('')}</ul>
        <p><b>Action suivante :</b> ${esc(m.conclusion.nextAction)}</p></details>` : ''}
      ${m.decision ? `<section class="decision"><b>Passerelle de mission</b> ${pill(m.decision.state, DEC[m.decision.state])}<p>${esc(m.decision.reason)}</p><ul class="checks">${m.decision.checks.map(c => `<li class="${c.pass ? 'ok' : 'warn'}">${c.pass ? '✓' : '✗'} ${esc(c.label)}${c.detail ? ` — ${esc(c.detail)}` : ''}</li>`).join('')}</ul><p class="caveat">${esc(m.conclusion.humanReview)}</p>
        ${recorded ? '' : '<button type="button" class="ghost small" id="ms-export">Exporter la mission (JSON)</button>'}</section>` : ''}
      <details><summary>Journal (${m.log.length} évènements${recorded ? ', enregistré' : ''})</summary><ol class="activity">${m.log.map(l => `<li class="ev"><span class="ev-agent">${esc((l.agent || 'mission').split('.').pop())}</span><span class="ev-op">#${l.seq} +${l.t} ms ${esc(l.kind)}${l.state ? ' · ' + esc(l.state) : ''}</span><span class="ev-text">${esc(l.text)}</span></li>`).join('')}</ol></details>`;
  }
  async function renderMissions() {
    const e = await env(), sugg = suggestions(e), segs = [...e.ctx.segments.entries()];
    const cur = P.view === 'recorded' ? P.recordedMission : P.current;
    const detHtml = `
      <div class="toolbar"><input type="text" id="ms-q" aria-label="Question" placeholder="Question pour l’organisation (ex. travaux et arbres sur Howard)" value="${esc(P.lastQ || '')}">
        <select id="ms-seg" aria-label="Tronçon"><option value="">Sans tronçon</option>${segs.map(([c, f]) => `<option value="${c}" ${P.lastSeg === c ? 'selected' : ''}>${esc(f.properties.street)} ${esc(f.properties.from)} → ${esc(f.properties.to)}</option>`).join('')}</select>
        <button type="button" class="small" id="ms-go">Lancer</button></div>
      <details ${cur ? '' : 'open'}><summary>Suggestions issues de la veille (${sugg.length}) et missions enregistrées (${P.recorded ? P.recorded.missions.length : 0})</summary><ul class="list">
        ${sugg.map(s => `<li class="item"><span>${esc(s.reason)}</span><span class="m">${pill(s.type, 'info')}</span><button type="button" class="small" data-launch="${esc(s.key)}">Lancer</button></li>`).join('')}
        ${(P.recorded ? P.recorded.missions : []).map(m => `<li class="item"><span>${esc(m.origin)}</span><span class="m">${pill('enregistrée')} ${pill(m.decision, DEC[m.decision])} ${m.agents} spécialistes · ${m.ms} ms</span><button type="button" class="ghost small" data-rec="${esc(m.id)}">Ouvrir</button></li>`).join('')}</ul></details>
      ${cur ? missionHtml(cur, P.view === 'recorded') : '<p class="hint">Lancez une mission : le gestionnaire de la ville identifie les domaines, recrute les spécialistes exécutables et la passerelle recalcule tout.</p>'}`;
    $('ws-body').innerHTML = `
      <div class="toolbar seg-tabs" role="tablist"><button type="button" role="tab" class="small ${P.msTab !== 'cog' ? '' : 'ghost'}" id="ms-tab-det" aria-selected="${P.msTab !== 'cog'}">Mission à règles (déterministe)</button><button type="button" role="tab" class="small ${P.msTab === 'cog' ? '' : 'ghost'}" id="ms-tab-cog" aria-selected="${P.msTab === 'cog'}">Collaboration assistée par modèle${P.cogIndex ? ` (${P.cogIndex.missions.length} enregistrée(s))` : ''}</button></div>
      ${P.msTab === 'cog' ? cognitiveHtml(cur) : detHtml}`;
    if ($('ms-go')) $('ms-go').onclick = () => { P.lastQ = $('ms-q').value; P.lastSeg = $('ms-seg').value; if (!P.lastQ.trim()) return; launch({ type: 'question', text: P.lastQ, segment: P.lastSeg || undefined }); };
    $('ws-body').querySelectorAll('[data-launch]').forEach(b => b.onclick = () => launch({ type: 'suggestion', suggestion: missionSuggestion(sugg.find(x => x.key === b.dataset.launch)) }));
    $('ws-body').querySelectorAll('[data-rec]').forEach(b => b.onclick = async () => { P.recordedMission = await getJSON(`data/missions/${b.dataset.rec.replace(':', '-')}.json`); P.view = 'recorded'; P.rerunCheck = null; if (P.recordedMission.target.segment) highlight({ segment: P.recordedMission.target.segment }); renderMissions(); });
    $('ws-body').querySelectorAll('[data-agentlink]').forEach(b => b.onclick = () => { P.selectedAgent = b.dataset.agentlink; show('agents'); });
    const c = $('ms-cancel'); if (c) c.onclick = () => G.CORE_MISSIONS.cancel(P.current);
    const x = $('ms-export'); if (x) x.onclick = () => { const { opts, ...rec } = P.current; const blob = new Blob([JSON.stringify(rec, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${P.current.id.replace(':', '-')}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); P.lastMissionExport = rec; };
    $('ms-tab-det').onclick = () => { P.msTab = 'det'; renderMissions(); };
    $('ms-tab-cog').onclick = () => { P.msTab = 'cog'; renderMissions(); };
    const cg = $('cg-launch'); if (cg) cg.onclick = () => launchCognitive(cur ? cur.origin : null);
    const cc = $('cg-cancel'); if (cc) cc.onclick = () => G.CORE_COGNITIVE.cancel(P.cogCurrent);
    if (P.cogCurrent && P.msTab === 'cog' && G.CORE_MISSION_GRAPH) G.CORE_MISSION_GRAPH.bind($('ws-body'), P.cogCurrent, { reduced: matchMedia('(prefers-reduced-motion: reduce)').matches });
    const cd = $('cg-dossier'); if (cd) cd.onclick = () => openDossier(P.cogCurrent);
    $('ws-body').querySelectorAll('[data-cogrec]').forEach(b => b.onclick = async () => { P.cogCurrent = await getJSON(`data/missions/cognitive/${b.dataset.cogrec.replace(':', '-')}.json`); P.cogRecorded = true; if (P.cogCurrent.target.segment) highlight({ segment: P.cogCurrent.target.segment }); renderMissions(); });
    const rr = $('ms-rerun'); if (rr) rr.onclick = async () => { const rec = P.recordedMission; const m = await launch(rec.origin); P.rerunCheck = m.fingerprint === rec.fingerprint ? pill('empreinte identique à l’enregistrement', 'ok') : pill('empreinte différente (instantané ou veille modifiés)', 'warn'); P.view = 'recorded'; renderMissions(); };
  }

  // ---------- Decision dossier (Phase 5) ----------
  async function openDossier(mc) {
    const e = await env(), D = G.CORE_DOSSIER, sim = mc.target.type === 'corridor-planning' ? G.CORE_SIM_SIDEWALK.run(e.ctx, P.simParams || {}) : null, d = D.build(mc, { simulation: sim });
    P.dossier = d; P.msTab = 'cog';
    if (P.sec !== 'missions') { // open the inspector without the asynchronous Missions render that would overwrite the dossier
      P.sec = 'missions'; document.querySelectorAll('#appnav [data-sec]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sec === 'missions')));
      G.CORE_SF_VIEW.closePanel(); if (P.map.getLayer('pf-sim-line')) simVisible(false); $('ws').hidden = false; document.body.classList.add('ws-open'); $('ws-title').textContent = 'Dossier de décision';
    }
    const li = (a, f = x => esc(x)) => a.length ? `<ul>${a.map(x => `<li>${f(x)}</li>`).join('')}</ul>` : '<p class="hint">Aucun.</p>';
    const tag = x => `${pill('interprétation du modèle', 'warn')} <b>${esc(x.id)}</b> ${esc(x.by)} : ${esc(x.text)} <span class="hint">[${x.cites.map(esc).join(', ')}]</span>`;
    $('ws-body').innerHTML = `<div class="toolbar"><button type="button" class="ghost small" id="dz-back">← Retour à la mission</button><button type="button" class="ghost small" id="dz-md">Exporter (Markdown)</button><button type="button" class="ghost small" id="dz-json">Exporter (JSON)</button></div>
      <div class="item"><span class="t">Dossier de décision — ${esc(d.issue.question)}</span><span class="m">${esc(d.execution)} · mode ${esc(d.mode)} · ${esc(d.model || '')}</span>
        <span class="m">Lieu : ${esc(d.issue.location)} · instantané ${esc(d.dates.snapshot || '—')} · veille ${esc(fmt(d.dates.feedUpdate))} · ${d.validation.pass ? pill('dossier conforme aux contrôles', 'ok') : pill(`${d.validation.problems.length} problème(s) de validation`, 'fail')}</span></div>
      ${d.decision ? `<section class="decision"><b>Passerelle</b> ${pill(d.decision.state, DEC[d.decision.state])}<p>${esc(d.decision.reason)}</p><p class="caveat">${esc(d.humanReview)}</p></section>` : ''}
      <details open><summary>1. Observations vérifiées (${d.observations.length}) — calculées par du code sur des données publiques</summary>${li(d.observations, o => `<b>${esc(o.id)}</b> (${esc(o.nature)}) ${esc(o.text)}`)}</details>
      <details open><summary>2. Spécialistes (${d.specialists.length}) et preuves consultées (${d.evidenceConsulted.total}, dont ${d.evidenceConsulted.cited} citées)</summary>${li(d.specialists, x => `${esc(x.role)} — ${x.statements} énoncé(s) retenu(s)`)}</details>
      <details open><summary>3. Hypothèses concurrentes (${d.hypotheses.length})</summary>${li(d.hypotheses, tag)}</details>
      <details><summary>4. Interprétations (${d.interpretations.length})</summary>${li(d.interpretations, tag)}</details>
      <details open><summary>5. Désaccords entre spécialistes (${d.disagreements.length})</summary>${li(d.disagreements, x => `<b>${esc(x.id)}</b> ${esc(x.between.join(' vs '))} sur ${esc(x.about)} : ${esc(x.text)} ${pill(x.resolved ? 'résolu' : 'non résolu', x.resolved ? 'ok' : 'warn')}`)}</details>
      <details open><summary>6. Simulations (calculs déterministes reproductibles)</summary>${li(d.simulations, x => `<b>${esc(x.id)}</b> ${esc(x.text)}`)}</details>
      <details><summary>7. Hypothèses de modélisation et incertitudes</summary>${li([...d.assumptions, ...d.uncertainty])}</details>
      <details open><summary>8. Risques et réserves (${d.risks.length})</summary>${li(d.risks, x => `${tag({ ...x, by: x.by })}`)}</details>
      <details open><summary>9. Preuves manquantes (${d.missingEvidence.length})</summary>${li(d.missingEvidence)}</details>
      <details open><summary>10. Prochaines étapes et revue humaine</summary>${li(d.nextSteps)}<p class="hint">${esc(d.validation.rule)}${d.validation.problems.length ? ` Problèmes : ${d.validation.problems.map(esc).join(' ; ')}` : ''}</p></details>`;
    const dl = (txt, type, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
    $('dz-back').onclick = () => renderMissions();
    $('dz-md').onclick = () => dl(D.toMarkdown(d), 'text/markdown', `dossier-${d.mission.replace(/[:]/g, '-')}.md`);
    $('dz-json').onclick = () => dl(JSON.stringify(d, null, 2), 'application/json', `dossier-${d.mission.replace(/[:]/g, '-')}.json`);
  }

  // ---------- Guided investor demonstration (Phase 5): every step calls the real components ----------
  const DEMO = [
    { t: 'La ville', d: 'Carte 3D réelle de San Francisco (OpenStreetMap, relief) et corridor Folsom / Howard où CORE intègre les données publiques de DataSF.', run: () => { show('world'); P.fly({ center: [-122.4065, 37.7795], zoom: 15.2, pitch: 60, bearing: -44 }, 3500); } },
    { t: 'Un évènement réel détecté', d: 'La veille urbaine collecte des sources officielles (actualisation planifiée par GitHub Actions). Ici, les éléments rattachés au corridor, avec date, source, confiance et limites.', run: () => { P.filter.corridor = true; show('intel'); } },
    { t: 'Une équipe de spécialistes assemblée', d: 'Pour le permis d’excavation 26EXC-05114 (Howard 8e–9e), le routage choisit les spécialités pertinentes. Exécution réelle du modèle local qwen3:8b, enregistrée.', run: () => openRecorded(m => m.item === 'datasf-street-use:26EXC-05114@7051000' && m.mode === 'fast') },
    { t: 'Preuves, désaccords, rejets', d: 'Chaque chiffre vient d’un outil déterministe (E#). Les interprétations du modèle sont validées (sens, unités, portée, causalité) ; les sorties rejetées sont visibles.', run: () => openRecorded(m => m.item === 'datasf-street-use:26EXC-05114@7051000' && m.mode === 'fast', '.list') },
    { t: 'Nouvelle question : arbres et accessibilité', d: 'Investigation pluridisciplinaire : où planter sans réduire le cheminement piéton accessible, et quoi reporter à cause des travaux ? Exécution réelle enregistrée.', run: () => openRecorded(m => m.mode === 'fast' && /cheminement/.test(m.question)) },
    { t: 'Simulation interactive', d: 'Modèle exploratoire non calibré exécuté dans votre navigateur. Changez le cheminement minimal ou l’espacement : les résultats, la carte et la sensibilité se recalculent.', run: () => { show('sims'); P.fly({ center: [-122.4065, 37.7795], zoom: 14.6, pitch: 45, bearing: -44 }, 2500); } },
    { t: 'Dossier de décision', d: 'Observations, hypothèses, désaccords, simulations, incertitudes, preuves manquantes et revue humaine — exportable.', run: async () => { const m = await loadRecorded(x => x.mode === 'fast' && /cheminement/.test(x.question)); if (m) openDossier(m); } },
    { t: 'Ce qui est réel', d: 'Sur ce site public : données publiques réelles, calculs déterministes exécutés dans le navigateur, missions du modèle enregistrées lors d’exécutions réelles. L’exécution en direct du modèle nécessite Ollama local. Rien n’est autorisé ni exécuté dans le monde réel.', run: () => show('agents') },
  ];
  async function loadRecorded(pred) { const m = P.cogIndex && P.cogIndex.missions.find(pred); if (!m) return null; const rec = await getJSON(`data/missions/cognitive/${m.id.replace(':', '-')}.json`); return rec; }
  async function openRecorded(pred, scrollSel) { const rec = await loadRecorded(pred); if (!rec) return; P.cogCurrent = rec; P.cogRecorded = true; P.msTab = 'cog'; show('missions'); if (rec.target.segment) highlight({ segment: rec.target.segment }); if (scrollSel) setTimeout(() => { const el = [...document.querySelectorAll('#ws-body details')].find(x => /Interprétations du modèle/.test(x.textContent)); if (el) el.scrollIntoView(); }, 300); }
  function renderDemo() {
    const i = P.demoStep || 0;
    $('ws-body').innerHTML = `<p class="hint">Démonstration en ${DEMO.length} étapes. Chaque étape ouvre de vrais composants de CORE ; rien n’est animé artificiellement. ${P.local ? '' : 'Site public : missions du modèle enregistrées, calculs exécutés dans le navigateur.'}</p>
      ${DEMO.map((s, k) => `<div class="demo-step ${k === i ? 'now' : ''}"><b>${k + 1}. ${esc(s.t)}</b><p>${esc(s.d)}</p><button type="button" class="small ${k === i ? '' : 'ghost'}" data-step="${k}">${k === i ? 'Ouvrir cette étape' : 'Aller à cette étape'}</button></div>`).join('')}`;
    $('ws-body').querySelectorAll('[data-step]').forEach(b => b.onclick = async () => { const k = +b.dataset.step; P.demoStep = Math.min(k + 1, DEMO.length - 1); await DEMO[k].run(); });
  }

  // ---------- Model-assisted collaboration (Phase 4) ----------
  function cognitiveHtml(cur) {
    const ok = P.llm && P.llm.available, running = P.cogCurrent && P.cogCurrent.state === 'running' && !P.cogRecorded;
    const list = P.cogIndex && P.cogIndex.missions.length ? `<ul class="list">${P.cogIndex.missions.map(m => `<li class="item"><span>${esc(m.question)}</span><span class="m">${pill('enregistrée — exécution réelle du modèle')} ${pill(m.mode === 'deep' ? 'approfondi' : 'rapide')} ${pill(m.decision, DEC[m.decision])} ${m.metrics.modelCalls} appels au modèle · ${m.metrics.toolCalls} outils · ${m.metrics.accepted} acceptés / ${m.metrics.rejected} rejetés · ${Math.round(m.metrics.wallMs / 1000)} s · ${esc(fmt(m.recorded_at))}</span><button type="button" class="ghost small" data-cogrec="${esc(m.id)}">Ouvrir</button></li>`).join('')}</ul>` : '<p class="hint">Aucune collaboration enregistrée.</p>';
    return `<p class="hint">Spécialistes choisis par routage ; le modèle local interprète des preuves produites par du code ; la passerelle recalcule tout. Modèle : ${ok ? pill(`${P.llm.model} disponible`, 'ok') : pill(P.llm && P.llm.public ? 'site public : exécutions enregistrées uniquement' : P.llm ? P.llm.reason : 'non testé', 'warn')}
      ${ok ? ` <button type="button" class="small" id="cg-launch" ${!cur || running ? 'disabled' : ''}>${cur ? 'Approfondir la mission à règles avec le modèle' : 'Lancez d’abord une mission à règles'}</button>` : ''}</p>
      ${P.cogCurrent ? G.CORE_COG_VIEW.render(P.cogCurrent, { recorded: !!P.cogRecorded }) : ''}
      <details ${P.cogCurrent ? '' : 'open'}><summary>Collaborations enregistrées (${P.cogIndex ? P.cogIndex.missions.length : 0})</summary>${list}</details>`;
  }
  async function launchCognitive(origin) {
    if (!origin) return;
    const e = await env(), C = G.CORE_COGNITIVE, mc = C.newCognitive(origin, e);
    P.cogCurrent = mc; P.cogRecorded = false; P.msTab = 'cog';
    let pending = false; const tick = () => { if (pending) return; pending = true; setTimeout(() => { pending = false; if (P.sec === 'missions' && P.cogCurrent === mc) renderMissions(); }, 250); };
    renderMissions();
    await C.run(mc, e, { registry: P.registry, onEvent: tick });
    if (P.sec === 'missions' && P.cogCurrent === mc) renderMissions();
    return mc;
  }

  // ---------- Simulations, Decisions, Data ----------
  async function renderProblems() { if (G.CORE_CIV) return G.CORE_CIV.renderProblems($('ws-body'), await env()); $('ws-body').innerHTML = '<p class="hint">Module indisponible.</p>'; }
  async function renderActivity() { if (G.CORE_CIV) return G.CORE_CIV.renderActivity($('ws-body'), await env()); $('ws-body').innerHTML = '<p class="hint">Module indisponible.</p>'; }
  async function renderHealth() { if (G.CORE_CIV) return G.CORE_CIV.renderHealth($('ws-body'), await env()); $('ws-body').innerHTML = '<p class="hint">Module indisponible.</p>'; }

  // ---------- Simulations (Phase 5: interactive, reproducible, browser-executed) ----------
  // Spatial view of the simulation. Positions are aggregated PER BLOCK (the model computes counts, not tree
  // coordinates): a band whose width scales with plantable positions, a "+N" label at the block midpoint, and the
  // permit points that cause a deferral. Compare mode maps the difference between two scenarios.
  const midpoint = g => { const c = g.type === 'MultiLineString' ? g.coordinates.flat() : g.coordinates; return c[Math.floor(c.length / 2)]; };
  function simFeatures(rows, base) {
    const out = [];
    for (const r of rows) {
      const g = P.ctx.segments.get(r.cnn).geometry, b = base ? base.get(r.cnn) : null, delta = b ? r.plantable_now - b.plantable_now : null;
      const status = !r.accessible ? 'blocked' : r.deferred_for_works ? 'deferred' : r.plantable_now ? 'plantable' : 'full';
      out.push({ type: 'Feature', geometry: g, properties: { kind: 'block', status, plantable: r.plantable_now, deferred: r.deferred_for_works, delta, dstatus: delta === null ? 'none' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'same' } });
      const label = base ? (delta ? `${delta > 0 ? '+' : '−'}${Math.abs(delta)}` : '') : (r.plantable_now ? `+${r.plantable_now}` : r.deferred_for_works ? `⏸${r.deferred_for_works}` : !r.accessible ? '✕' : '');
      if (label) out.push({ type: 'Feature', geometry: { type: 'Point', coordinates: midpoint(g) }, properties: { kind: 'label', label, status: base ? (delta > 0 ? 'up' : 'down') : status } });
    }
    if (!base) { const permits = new Map(P.ctx.data.permits.features.map(f => [f.properties.record_id, f])); for (const r of rows) for (const id of r.works) { const f = permits.get(id); if (f && f.geometry) out.push({ type: 'Feature', geometry: f.geometry, properties: { kind: 'works', label: f.properties.permit_number || id } }); } }
    return { type: 'FeatureCollection', features: out };
  }
  function simLayer(rows, base = null) {
    const map = P.map, data = simFeatures(rows, base);
    if (!map.getSource('pf-sim')) {
      map.addSource('pf-sim', { type: 'geojson', data });
      const isBlock = ['==', ['get', 'kind'], 'block'];
      map.addLayer({ id: 'pf-sim-line', type: 'line', source: 'pf-sim', filter: isBlock, layout: { 'line-cap': 'round' }, paint: { 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 17, 6], 'line-opacity': 0.9,
        'line-color': ['case', ['!=', ['get', 'dstatus'], 'none'], ['match', ['get', 'dstatus'], 'up', '#3fb950', 'down', '#f85149', '#6e7681'], ['match', ['get', 'status'], 'plantable', '#3fb950', 'deferred', '#e3b341', 'blocked', '#f85149', '#6e7681']] } });
      map.addLayer({ id: 'pf-sim-band', type: 'line', source: 'pf-sim', filter: ['all', isBlock, ['>', ['get', 'plantable'], 0], ['==', ['get', 'dstatus'], 'none']], paint: { 'line-color': '#3fb950', 'line-opacity': 0.28, 'line-blur': 2,
        'line-width': ['interpolate', ['linear'], ['get', 'plantable'], 1, 6, 10, 18], 'line-offset': ['interpolate', ['linear'], ['zoom'], 13, 6, 17, 18] } });
      map.addLayer({ id: 'pf-sim-defer', type: 'line', source: 'pf-sim', filter: ['all', isBlock, ['>', ['get', 'deferred'], 0], ['==', ['get', 'dstatus'], 'none']], paint: { 'line-color': '#e3b341', 'line-width': 3, 'line-dasharray': [1, 1.5], 'line-offset': ['interpolate', ['linear'], ['zoom'], 13, -6, 17, -18] } });
      map.addLayer({ id: 'pf-sim-works', type: 'circle', source: 'pf-sim', minzoom: 13.5, filter: ['==', ['get', 'kind'], 'works'], paint: { 'circle-radius': 4, 'circle-color': '#e3b341', 'circle-stroke-color': '#0d1117', 'circle-stroke-width': 1 } });
      map.addLayer({ id: 'pf-sim-label', type: 'symbol', source: 'pf-sim', minzoom: 13, filter: ['==', ['get', 'kind'], 'label'], layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-allow-overlap': false },
        paint: { 'text-color': ['match', ['get', 'status'], 'plantable', '#7ee787', 'up', '#7ee787', 'deferred', '#e3b341', 'down', '#ff7b72', 'blocked', '#ff7b72', '#c9d1d9'], 'text-halo-color': '#0d1117', 'text-halo-width': 1.6 } });
    } else map.getSource('pf-sim').setData(data);
    simVisible(true);
  }
  // While a simulation is displayed, record markers are hidden (and restored exactly as they were) so the scenario reads clearly.
  const RECORD_LAYERS = ['sf-permits', 'sf-large', 'sf-moratoria-point', 'sf-closures-point', 'city-bp', 'city-bp-cluster', 'city-bp-count', 'city-removals', 'city-energy', 'city-trees', 'core-density'];
  // Record layers created after the overlay was shown (data loaded later) are hidden too, and restored with the others.
  function simEnforce() { const map = P.map; if (!P.simHidden || !map) return; for (const id of RECORD_LAYERS) { if (!map.getLayer(id)) continue; if (!(id in P.simHidden)) P.simHidden[id] = map.getLayoutProperty(id, 'visibility') || 'visible'; if (map.getLayoutProperty(id, 'visibility') !== 'none') map.setLayoutProperty(id, 'visibility', 'none'); } }
  function simVisible(on) {
    const map = P.map;
    if (on && !P.simHidden) { P.simHidden = {}; for (const id of RECORD_LAYERS) if (map.getLayer(id)) { P.simHidden[id] = map.getLayoutProperty(id, 'visibility') || 'visible'; map.setLayoutProperty(id, 'visibility', 'none'); } }
    if (!on && P.simHidden) { for (const [id, v] of Object.entries(P.simHidden)) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v); P.simHidden = null; }
    for (const id of ['pf-sim-line', 'pf-sim-band', 'pf-sim-defer', 'pf-sim-works', 'pf-sim-label']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    const b = $('sim-badge'); if (b) b.hidden = !on;
  }
  async function renderSims() {
    const e = await env(), S = G.CORE_SIM_SIDEWALK, M = G.CORE_SIM.MODELS, md = S.MODEL;
    if (P.sec !== 'sims') return; // the user left while data loaded: do not draw the overlay over another view
    P.simParams = P.simParams || Object.fromEntries(Object.entries(md.params).map(([k, d]) => [k, d.value]));
    let r, err = null; try { r = S.run(e.ctx, P.simParams); } catch (x) { err = x.message; }
    P.simResult = r;
    const alt = r ? S.alternatives(e.ctx, P.simParams) : [], sens = r ? S.sensitivity(e.ctx, P.simParams) : null, t = r && r.totals;
    $('ws-body').innerHTML = `
      <div class="item"><span class="t">${esc(md.id)} v${esc(md.version)} — trottoirs accessibles × capacité de plantation × travaux</span>
        <span class="m">${pill('exploratoire, non calibré', 'warn')} ${pill('exécuté dans ce navigateur', 'ok')} instantané ${esc(e.ctx.asOf)} · ${esc(md.scope)}</span>
        <span class="hint">Calcule des emplacements géométriquement possibles sous hypothèses déclarées. Ne calcule pas : ${md.notComputed.map(esc).join(', ')}.</span></div>
      <div class="simgrid">${Object.entries(md.params).map(([k, d]) => `<label class="simparam"><span>${esc(k)} = <b id="sv-${k}">${P.simParams[k]}</b> ${esc(d.unit)}</span>
        <input type="range" data-param="${k}" min="${d.min}" max="${d.max}" step="${d.unit === 'fraction' ? 0.05 : d.unit === 'jours' ? 15 : 1}" value="${P.simParams[k]}" aria-label="${esc(k)}"><span class="hint">${esc(d.basis)}</span></label>`).join('')}
        <div class="toolbar"><button type="button" class="ghost small" id="sm-reset">Valeurs par défaut</button><button type="button" class="ghost small" id="sm-verify">Revérifier (recalcul)</button><button type="button" class="ghost small" id="sm-export">Exporter (JSON)</button><span id="sm-verified" class="hint"></span></div></div>
      ${err ? `<p class="caveat">${esc(err)}</p>` : `
      <div class="kpis"><div class="kpi"><b>${t.plantable_now}</b><span>emplacements plantables maintenant (modèle)</span></div><div class="kpi"><b>${t.deferred_for_works}</b><span>à reporter pour travaux planifiés</span></div><div class="kpi"><b>${t.not_accessible_with_basin}</b><span>tronçons sans cheminement suffisant</span></div><div class="kpi"><b>${t.below_bsp_min}/${t.blocks}</b><span>trottoirs sous le minimum BSP (observé, 2014)</span></div><div class="kpi"><b>${t.living_trees}</b><span>arbres vivants inventoriés</span></div></div>
      <div class="toolbar"><label class="hint" for="sm-compare">Carte :</label><select id="sm-compare" aria-label="Comparer la carte à une alternative"><option value="none" ${!P.simCompare || P.simCompare === 'none' ? 'selected' : ''}>Scénario courant (bandes = emplacements par tronçon)</option>${Object.entries(G.CORE_SIM_SIDEWALK.ALTERNATIVES).map(([k, a]) => `<option value="${k}" ${P.simCompare === k ? 'selected' : ''}>Différence : paramètres courants vs ${k} — ${esc(a.label)}</option>`).join('')}</select></div>
      <p class="hint">Les emplacements sont des <b>comptes par tronçon</b> (le modèle ne localise pas d’arbres) : bande verte = plantables maintenant, tirets ambre = reportés à cause des permis affichés en points ambre, rouge = cheminement insuffisant. En mode différence : vert/rouge = plus/moins d’emplacements que l’alternative.</p>
      <p class="hint">Empreinte <code id="sm-fp">${esc(r.fingerprint)}</code> — mêmes données et paramètres ⇒ même résultat. Carte : ${pill('plantable', 'ok')} ${pill('à reporter', 'warn')} ${pill('cheminement insuffisant', 'fail')} gris = capacité atteinte.</p>
      <details open><summary>Alternatives (recalculées avec les paramètres actuels)</summary><table class="tbl"><thead><tr><th>Alternative</th><th>Plantables maintenant</th><th>Total</th><th>Reportés</th><th>Tronçons insuffisants</th></tr></thead><tbody>${alt.map(a => `<tr><td><b>${esc(a.id)}</b> ${esc(G.CORE_SIM_SIDEWALK.ALTERNATIVES[a.id].label)}</td><td>${a.totals.plantable_now}</td><td>${a.totals.additional_positions}</td><td>${a.totals.deferred_for_works}</td><td>${a.totals.not_accessible_with_basin}</td></tr>`).join('')}</tbody></table></details>
      <details open><summary>Sensibilité (un paramètre à la fois, bornes du domaine)</summary><table class="tbl"><thead><tr><th>Paramètre</th><th>Bornes</th><th>Emplacements</th><th>Plantables maintenant</th><th>Tronçons insuffisants</th></tr></thead><tbody>${sens.params.map(x => `<tr><td>${esc(x.param)}</td><td>${x.low}–${x.high} ${esc(x.unit)}</td><td>${x.additional.join(' → ')}</td><td>${x.plantable_now.join(' → ')}</td><td>${x.not_accessible.join(' → ')}</td></tr>`).join('')}</tbody></table>
        <p class="hint">L’espacement et la part de linéaire utilisable dominent l’incertitude : le résultat est un ordre de grandeur pour prioriser des relevés, pas une capacité de plantation.</p></details>
      <details><summary>Tronçons (${r.rows.length}) — chaque ligne cite ses enregistrements sources</summary><table class="tbl"><thead><tr><th>Tronçon</th><th>Trottoir (2014)</th><th>Classe BSP min/reco</th><th>Arbres</th><th>+ plantables / reportés</th></tr></thead><tbody>${r.rows.map(x => `<tr><td>${esc(x.street)} ${esc(x.from)} → ${esc(x.to)}<br><span class="hint">${x.length_m} m · ${esc(x.sources.sidewalk)}</span></td><td>${x.width_ft} ft${x.below_bsp_min ? ' ' + pill('< min', 'warn') : ''}</td><td>${esc(x.bsp_class)} ${x.bsp_min_ft}/${x.bsp_recommended_ft} ft</td><td>${x.living_trees}${x.stumps ? ` (+${x.stumps} souche)` : ''}</td><td>${x.plantable_now} / ${x.deferred_for_works}${!x.accessible ? ' ' + pill('cheminement', 'fail') : ''}</td></tr>`).join('')}</tbody></table></details>
      <details><summary>Hypothèses, limites et preuves nécessaires pour un usage opérationnel</summary><ul>${md.assumptions.map(a => `<li>${esc(a)}</li>`).join('')}</ul><p>${esc(md.applicability)}</p><ul>${md.neededForOperationalUse.map(a => `<li>${esc(a)}</li>`).join('')}</ul><p class="hint">Entrées : ${md.inputs.map(i => `<a href="https://data.sf.gov/d/${esc(i.id)}" target="_blank" rel="noopener">${esc(i.dataset)}</a>`).join(', ')} (ODC-PDDL).</p></details>`}
      <h3 style="margin:10px 0 4px;font-size:13px">Registre des modèles</h3>
      <table class="tbl"><thead><tr><th>Modèle</th><th>Domaine</th><th>Nature</th><th>Statut</th></tr></thead><tbody>${Object.entries(M).map(([id, m]) => `<tr><td><code>${esc(id)}</code><br><span class="hint">${esc(m.note)}</span></td><td>${esc(m.domain)}</td><td>${esc(m.kind || '—')}</td><td>${m.status === 'working' ? pill('opérationnel', 'ok') : m.status === 'unavailable' ? pill('indisponible', 'fail') : pill(m.status, 'warn')}</td></tr>`).join('')}</tbody></table>
      <div class="toolbar"><button type="button" class="ghost small" id="sm-coord">Coordination des travaux (S0–S4)</button><button type="button" class="ghost small" id="sm-city">Investigation inter-domaines (R0–R2)</button><a class="pill info" href="corridor.html">Démo de trafic synthétique (non calibrée)</a></div>`;
    if (r) { const cmp = P.simCompare && P.simCompare !== 'none' ? S.run(e.ctx, { ...P.simParams, ...(S.ALTERNATIVES[P.simCompare].params || {}) }, { plant: !!S.ALTERNATIVES[P.simCompare].params }) : null; simLayer(r.rows, cmp ? new Map(cmp.rows.map(x => [x.cnn, x])) : null); }
    let pend = null;
    $('ws-body').querySelectorAll('[data-param]').forEach(inp => inp.oninput = () => { P.simParams[inp.dataset.param] = Number(inp.value); $(`sv-${inp.dataset.param}`).textContent = inp.value; clearTimeout(pend); pend = setTimeout(renderSims, 180); });
    $('sm-reset').onclick = () => { P.simParams = null; renderSims(); };
    if ($('sm-compare')) $('sm-compare').onchange = ev => { P.simCompare = ev.target.value; renderSims(); };
    $('sm-verify').onclick = () => { const v = S.verify(e.ctx, P.simResult); $('sm-verified').innerHTML = v.pass ? pill(`recalcul identique (${v.fingerprint})`, 'ok') : pill(`échec : ${v.error || v.fingerprint}`, 'fail'); };
    $('sm-export').onclick = () => { const blob = new Blob([JSON.stringify({ model: md, result: P.simResult }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${md.id}-${P.simResult.fingerprint}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
    $('sm-coord').onclick = () => { show('world'); G.CORE_SF_VIEW.openPanel(); G.CORE_SF_VIEW.selectTab('agents'); };
    $('sm-city').onclick = () => { show('world'); G.CORE_SF_VIEW.openPanel(); G.CORE_SF_VIEW.selectTab('city'); };
  }
  function renderDecisions() {
    const rows = [];
    for (const m of P.missions) if (m.decision) rows.push({ what: m.target.question, state: m.decision.state, how: 'mission (session)', id: m.id });
    for (const m of P.recorded ? P.recorded.missions : []) rows.push({ what: m.origin, state: m.decision, how: 'mission enregistrée', id: m.id });
    const ci = G.CORE_CITY_VIEW && G.CORE_CITY_VIEW.state.result; if (ci && ci.decision) rows.push({ what: `Investigation inter-domaines ${ci.brief ? `${ci.brief.location.street} ${ci.brief.location.from} → ${ci.brief.location.to}` : ''}`, state: ci.decision.state, how: 'issueCityDecision' });
    const co = G.CORE_COORD_VIEW && G.CORE_COORD_VIEW.state.result; if (co) for (const [k, d] of Object.entries(co.decisions || {})) rows.push({ what: `Coordination ${k}`, state: d.decision.state, how: 'issueCoordinationProposal' });
    if (P.cogCurrent && P.cogCurrent.decision && !P.cogRecorded) rows.push({ what: P.cogCurrent.target.question, state: P.cogCurrent.decision.state, how: 'collaboration assistée par modèle (session)', id: P.cogCurrent.id });
    for (const m of P.cogIndex ? P.cogIndex.missions : []) if (m.decision) rows.push({ what: m.question, state: m.decision, how: `collaboration enregistrée (${m.model})`, id: m.id });
    const human = humanDecisions();
    $('ws-body').innerHTML = `<p class="hint">Toutes les passerelles échouent fermées et n’autorisent rien (<code>authorizes: false</code>). Une revue humaine peut être notée ci-dessous : elle est <b>enregistrée uniquement dans ce navigateur</b>, n’est transmise à personne et n’a aucun effet sur le monde réel.</p>
      <table class="tbl"><thead><tr><th>Objet</th><th>Passerelle</th><th>État</th><th>Revue humaine (locale)</th></tr></thead><tbody>${rows.map(r => { const h = r.id && human[r.id]; return `<tr><td>${esc(r.what)}</td><td>${esc(r.how)}</td><td>${pill(r.state, DEC[r.state] || '')}</td><td>${h ? `${pill(h.decision, 'info')} <span class="hint">${esc(h.note || '')} · ${esc(fmt(h.at))}</span>` : r.id ? `<select data-human="${esc(r.id)}" aria-label="Revue humaine"><option value="">Noter une revue…</option><option>Vérification de terrain demandée</option><option>Preuves supplémentaires demandées</option><option>Classé sans suite</option></select>` : '—'}</td></tr>`; }).join('') || '<tr><td colspan="4">Aucune décision encore produite dans cette session.</td></tr>'}</tbody></table>`;
    $('ws-body').querySelectorAll('[data-human]').forEach(sel => sel.onchange = () => { if (!sel.value) return; const note = prompt('Note (facultative) :') || ''; const all = humanDecisions(); all[sel.dataset.human] = { decision: sel.value, note: note.slice(0, 200), at: new Date().toISOString(), scope: 'local-browser-only' }; try { localStorage.setItem('core.human-decisions.v1', JSON.stringify(all)); } catch (_) { /* storage unavailable */ } renderDecisions(); });
  }
  function humanDecisions() { try { return JSON.parse(localStorage.getItem('core.human-decisions.v1') || '{}'); } catch (_) { return {}; } }
  async function renderData() {
    const sv = G.CORE_SF_VIEW; await sv.loadData();
    const man = sv.state.manifest, KN = G.CORE_KNOWLEDGE, contra = KN.contradictions(KN.docClaims(P.K));
    $('ws-body').innerHTML = `<h3 style="margin:0;font-size:13px">Instantanés (${man.datasets.length})</h3><p class="hint">« Fichier intact » : la somme SHA-256 prouve que le fichier publié est identique à la collecte ; elle ne prouve ni l’exactitude ni l’actualité de la source. Dates : <b>récupéré</b> = collecte par CORE ; les registres gardent leurs propres dates (approbation, début et fin prévus).</p>
      <table class="tbl"><thead><tr><th>Jeu</th><th>Enr.</th><th>Récupéré</th><th>SHA-256</th></tr></thead><tbody>${man.datasets.map(d => { const k = d.file.replace('.geojson', ''); return `<tr><td><a href="${esc(d.page)}" target="_blank" rel="noopener">${esc(d.title)}</a></td><td>${d.features}</td><td>${esc(fmt(d.retrieved_at))}</td><td>${sv.state.verified[k] === 'ok' ? pill('fichier intact (SHA-256)', 'ok') : pill(sv.state.verified[k] || '?', 'warn')}</td></tr>`; }).join('')}</tbody></table>
      <button type="button" class="ghost small" id="dt-inspect">Ouvrir l’inspecteur des registres</button>
      <h3 style="margin:0;font-size:13px">Bibliothèque de connaissances (${KN.approved(P.K).length} documents approuvés, ${P.K.lib.proposals.length} proposition(s))</h3>
      <table class="tbl"><thead><tr><th>Document</th><th>Source</th><th>v</th><th>Fraîcheur</th></tr></thead><tbody>${KN.approved(P.K).map(d => { const fr = KN.freshness(d, new Date().toISOString()); return `<tr><td><a href="${esc(safeUrl(d.url))}" target="_blank" rel="noopener">${esc(d.title)}</a><br><span class="hint">${esc(d.confidence)}${d.limitations ? ' · ' + esc(d.limitations) : ''}</span></td><td>${esc(P.K.sources.get(d.source).name)}<br><span class="hint">${esc(P.K.sources.get(d.source).license)}</span></td><td>${d.version}</td><td>${fr.stale ? pill('à actualiser', 'warn') : pill(`${fr.ageDays} j`, 'ok')}</td></tr>`; }).join('')}</tbody></table>
      <p><b>Contradictions détectées :</b> ${contra.map(c => `${esc(c.key)} : ${c.values.join(' vs ')} (${esc(c.a)} / ${esc(c.b)}) — ${pill(c.status, c.status === 'conflict' ? 'fail' : 'ok')}`).join(' ; ') || 'aucune'}</p>
      <p class="hint">Mises à jour : un agent peut proposer, seul un relecteur humain (<code>human:…</code>) approuve ; une proposition touchant aux règles de sûreté ou permissions d’un agent est rejetée. Chaque version est conservée et restaurable (<code>node scripts/learn.mjs --rollback</code>).</p>
      ${G.CORE_DATA_POLICY ? (() => { const E = Object.entries(G.CORE_DATA_POLICY.ENTRIES); return `<h3 style="margin:0;font-size:13px">Politique d’éligibilité des données (${E.filter(([, x]) => x.status === 'eligible').length} éligibles, ${E.filter(([, x]) => x.status === 'quarantined').length} en quarantaine, ${E.filter(([, x]) => x.status === 'excluded').length} exclues — vérifiée ${esc(G.CORE_DATA_POLICY.VERIFIED)})</h3><details><summary>Détail par source</summary><table class="tbl"><thead><tr><th>Source</th><th>Licence / base d’usage</th><th>Usage commercial · attribution</th><th>Sensibilité</th><th>Usage permis · portée</th><th>Statut</th></tr></thead><tbody>${E.map(([k, x]) => `<tr><td><code>${esc(k)}</code><br>${esc(x.publisher)}</td><td>${esc(x.licence)}</td><td>${esc(x.commercialUse)}<br><span class="hint">${esc(x.attribution)}</span></td><td>${esc(x.sensitivity)}</td><td>${esc(x.allowedUse)}<br><span class="hint">${esc(x.scope)} · ${esc(x.retention)}</span>${x.notes ? `<br><span class="hint">${esc(x.notes)}</span>` : ''}</td><td>${pill(x.status, x.status === 'eligible' ? 'ok' : x.status === 'quarantined' ? 'warn' : 'fail')}</td></tr>`).join('')}</tbody></table></details>`; })() : ''}
      <h3 style="margin:0;font-size:13px">Apprentissage contrôlé (${P.K.lib.proposals.length} proposition(s))</h3>
      <table class="tbl"><thead><tr><th>Proposition</th><th>Origine</th><th>Évaluation avant → après</th><th>Décision</th></tr></thead><tbody>${P.K.lib.proposals.map(p => `<tr><td>${esc(p.id)} · ${esc(p.docId)}<br><span class="hint">${esc(p.reason)}</span></td><td>${esc(p.proposedBy)}${p.provenance && p.provenance.fetched ? `<br><a href="${esc(p.provenance.fetched)}" target="_blank" rel="noopener">source autorisée</a> · ${esc(p.provenance.license || '')}` : ''}${p.validation ? `<br>${p.validation.checks.map(c => pill(c.id, c.pass ? 'ok' : 'fail')).join(' ')}` : ''}</td><td>${(p.evaluation || []).map(x => `${esc(x.agent)} : ${Math.round(x.before.score * 100)} % → ${Math.round(x.after.score * 100)} %`).join('<br>')}</td><td>${pill(p.status, p.status === 'approved' ? 'ok' : p.status === 'pending' ? 'warn' : 'fail')}${p.importance ? ` ${pill(p.importance)}` : ''}${p.reviewer ? `<br>${esc(p.reviewer)}` : ''}</td></tr>`).join('') || '<tr><td colspan="4">Aucune.</td></tr>'}</tbody></table>`;
    $('dt-inspect').onclick = () => { show('world'); sv.openPanel(); sv.selectTab('records'); };
  }

  function updateMeta() {
    const sv = G.CORE_SF_VIEW.state;
    const age = P.state && P.state.lastSuccessfulUpdate ? (Date.now() - Date.parse(P.state.lastSuccessfulUpdate)) / 3600e3 : null;
    $('navmeta').classList.toggle('stale', age !== null && age > 6);
    $('navmeta').textContent = `${age !== null && age > 6 ? `⚠ veille âgée de ${Math.round(age)} h · ` : ''}Registres collectés ${sv.manifest ? fmt(sv.manifest.generated_at) : '…'} · veille collectée ${fmt(P.state ? P.state.lastSuccessfulUpdate : null)}${P.lastRefresh ? ` · navigateur ${fmt(P.lastRefresh.at)}` : ''}`;
    $('navmeta').title = 'Dates de collecte par CORE (UTC). Chaque registre garde ses propres dates (publication, approbation, début et fin prévus).';
  }

  async function init({ map, fly }) {
    P.map = map; P.fly = fly; P.envFn = env;
    // Phase 10: the world registry (San Francisco 68 profiles unchanged + New York + global roles).
    P.registry = G.CORE_ORG.buildWorld ? G.CORE_ORG.buildWorld() : G.CORE_ORG.buildRegistry(); P.counts = G.CORE_ORG.counts(P.registry);
    const [evals, lib, items, state, recorded, cogIndex] = await Promise.all([getJSON('data/agents/evaluations.json'), getJSON('data/knowledge/library.json'), getJSON('data/feeds/items.json'), getJSON('data/feeds/state.json'), getJSON('data/missions/index.json').catch(() => null), getJSON('data/missions/cognitive/index.json').catch(() => null)]);
    P.opsReady = Promise.all([getJSON('data/operations/log.json').then(o => { P.operations = o; }).catch(() => { P.operations = null; }), getJSON('data/civ/index.json').then(o => { P.civIndex = o; }).catch(() => { P.civIndex = null; }), getJSON('data/memory/export.json').then(o => { P.memoryExport = o; }).catch(() => { P.memoryExport = null; })]);
    P.evals = evals; P.K = G.CORE_KNOWLEDGE.load(lib); P.store = { items: items.items }; P.state = state; P.recorded = recorded; P.cogIndex = cogIndex;
    restoreBrowser(); schedule();
    document.querySelectorAll('#appnav [data-sec], #legacy-sec [data-sec]').forEach(b => b.addEventListener('click', () => show(b.dataset.sec)));
    $('ws-close').onclick = () => show('world');
    new MutationObserver(() => { if (!$('sf-panel').hidden && !$('ws').hidden) { $('ws').hidden = true; document.body.classList.remove('ws-open'); document.querySelectorAll('#appnav [data-sec]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sec === 'world'))); P.sec = 'world'; } }).observe($('sf-panel'), { attributes: true, attributeFilter: ['hidden'] });
    // Public mode: on the public site the page never tries to reach any localhost model endpoint.
    P.local = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname);
    if (P.local) G.CORE_LLM.probe(G.CORE_LLM.PROVIDERS.ollama).then(r => { P.llm = r; });
    else { P.llm = { available: false, public: true, reason: 'site public : l’analyse assistée par modèle s’exécute uniquement sur une machine avec Ollama local (les missions affichées sont des exécutions réelles enregistrées)' }; if (!localStorage.getItem(LS)) { P.browser.intervalMin = 0; schedule(); } }
    document.body.classList.toggle('public-site', !P.local);
    G.CORE_SF_VIEW.loadData().then(updateMeta).catch(() => {}); updateMeta();
    if (G.CORE_DEMO) G.CORE_DEMO.init();
    P.ready = true;
  }

  G.CORE_PLATFORM = { init, show, launch, refresh, state: P, openRecorded, openDossier, loadRecorded, simEnforce, openAgent, openAgentDossier, cogRecords, TOOL_SOURCES, getJSON };
})();
