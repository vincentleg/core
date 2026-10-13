// CORE — professional platform shell (Phase 3): navigation, City Intelligence, Agents, Missions, Simulations,
// Decisions, Data & Evidence. Everything shown comes from real modules and data files; recorded runs are
// labelled as recorded; unavailable capabilities are labelled as unavailable.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KIND = { observation: 'Observation', 'public-notice': 'Avis public', proposal: 'Proposition', 'approved-decision': 'Décision approuvée', 'ongoing-project': 'Projet en cours', 'completed-work': 'Travaux terminés', prediction: 'Prévision', announcement: 'Annonce', opinion: 'Opinion' };
  const EPI = { observed: ['Observé', 'ok'], reported: ['Rapporté', 'info'], derived: ['Dérivé', 'info'], hypothesis: ['Hypothèse', 'warn'], simulated: ['Simulé', 'warn'] };
  const DEC = { 'ÉLIGIBLE À LA REVUE HUMAINE': 'ok', 'PREUVES SUPPLÉMENTAIRES REQUISES': 'warn', REJETÉ: 'fail', 'PRÊT POUR REVUE HUMAINE': 'ok', SUSPENDU: 'warn', BLOQUÉ: 'fail' };
  const MS_STATE = { 'needs-human-review': 'ok', 'needs-evidence': 'warn', rejected: 'fail', failed: 'fail', cancelled: 'warn', running: 'info', reviewing: 'info', planning: 'info', assigned: 'info', received: 'info', concluded: 'ok' };
  const LS = 'core.feeds.browser.v1';
  const P = { map: null, fly: null, sec: 'world', registry: null, counts: null, evals: null, K: null, store: { items: [] }, state: null, browser: { sources: {}, intervalMin: 15, timer: null, next: null }, missions: [], recorded: null, current: null, filter: { kind: 'all', domain: 'all', corridor: false }, llm: null, selectedAgent: null };

  const getJSON = u => fetch(u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw Error(`${u}: HTTP ${r.status}`); return r.json(); });
  const fmt = iso => iso ? String(iso).replace('T', ' ').slice(0, 16) : '—';
  const pill = (txt, cls = '') => `<span class="pill ${cls}">${esc(txt)}</span>`;

  async function env() {
    const sv = G.CORE_SF_VIEW; await sv.loadData();
    if (!P.ctx || P.ctxManifest !== sv.state.manifest) { P.ctx = G.CORE_COORD.buildContext({ manifest: sv.state.manifest, data: sv.state.data, verified: sv.state.verified }); P.ctxManifest = sv.state.manifest; }
    return { ctx: P.ctx, feeds: P.store, feedState: P.state, feedHealth: G.CORE_FEEDS.health({ items: P.store.items, sources: { ...P.state.sources, ...P.browser.sources } }, new Date().toISOString()), knowledge: P.K, now: new Date().toISOString() };
  }

  // ---------- Navigation ----------
  const TITLES = { intel: 'Intelligence urbaine — San Francisco', agents: 'Organisation des agents', missions: 'Missions', sims: 'Simulations et modèles', decisions: 'Décisions (revue humaine)', data: 'Données et preuves' };
  function show(sec) {
    P.sec = sec;
    document.querySelectorAll('#appnav [data-sec]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sec === sec)));
    if (sec === 'world') { $('ws').hidden = true; document.body.classList.remove('ws-open'); return; }
    G.CORE_SF_VIEW.closePanel();
    $('ws').hidden = false; document.body.classList.add('ws-open'); $('ws-title').textContent = TITLES[sec];
    ({ intel: renderIntel, agents: renderAgents, missions: renderMissions, sims: renderSims, decisions: renderDecisions, data: renderData })[sec]();
  }

  // ---------- City Intelligence ----------
  function persistBrowser() { try { localStorage.setItem(LS, JSON.stringify({ items: P.store.items.filter(i => i.browser_retrieved), sources: P.browser.sources, intervalMin: P.browser.intervalMin })); } catch (_) { /* storage unavailable */ } }
  function restoreBrowser() {
    try { const s = JSON.parse(localStorage.getItem(LS) || 'null'); if (!s) return; P.browser.sources = s.sources || {}; P.browser.intervalMin = s.intervalMin ?? 15; G.CORE_FEEDS.merge(P.store, s.items || [], s.items && s.items[0] ? s.items[0].retrieved_at : new Date().toISOString()); } catch (_) { /* ignore */ }
  }
  async function refresh(force = false) {
    const F = G.CORE_FEEDS, now = new Date(), merged = { items: P.store.items, sources: { ...P.state.sources, ...P.browser.sources } };
    const due = (force ? F.SOURCES.filter(s => s.browser) : F.dueSources(merged, now.getTime(), true));
    const cnns = [...(await env()).ctx.segments.keys()]; const res = { added: 0, changed: 0, failed: [], checked: due.map(s => s.id) };
    for (const s of due) {
      const st = P.browser.sources[s.id] = P.browser.sources[s.id] || {}; st.lastAttempt = now.toISOString();
      try {
        const req = F.request(s.id, { now, corridorCnns: cnns }), r = await fetch(req.url, { headers: { Accept: 'application/json, application/geo+json' } });
        if (!r.ok) throw Error(`HTTP ${r.status}`);
        const items = F.itemsFrom(s.id, await r.text()).map(i => ({ ...i, browser_retrieved: true }));
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
      <p class="hint">Dernière collecte complète (Node) : <b>${fmt(P.state.lastSuccessfulUpdate)}</b> — ${esc(P.state.scheduler)}. Actualisation navigateur des sources compatibles (DataSF, USGS, NWS) : ${P.browser.intervalMin ? `toutes les ${P.browser.intervalMin} min <b>tant que l’application est ouverte</b> — prochaine ${fmt(P.browser.next)}` : 'désactivée'}${P.lastRefresh ? ` · dernière ${fmt(P.lastRefresh.at)} (+${P.lastRefresh.added} nouveaux, ${P.lastRefresh.changed} modifiés, ${P.lastRefresh.failed.length} échec(s))` : ''}. Aucun planificateur de fond n’est installé.</p>
      <div class="toolbar"><button type="button" class="ghost small" id="in-refresh">Actualiser maintenant (sources navigateur)</button>
        <select id="in-interval" aria-label="Fréquence d’actualisation navigateur">${[0, 15, 30, 60].map(m => `<option value="${m}" ${m === P.browser.intervalMin ? 'selected' : ''}>${m ? `Toutes les ${m} min` : 'Actualisation automatique désactivée'}</option>`).join('')}</select></div>
      <details><summary>État des sources (${health.length}) et lacunes</summary><table class="tbl"><thead><tr><th>Source</th><th>Éléments</th><th>Fraîcheur</th><th>Accès</th><th>État</th></tr></thead><tbody>${health.map(h => `<tr><td>${esc(h.name)}</td><td>${h.items}</td><td>${esc(h.freshness)}</td><td>${h.browser ? 'Node + navigateur' : 'Node seulement'}</td><td>${h.lastError ? pill('échec', 'fail') : h.lastSuccess ? pill('ok', 'ok') : pill('jamais', 'warn')}</td></tr>`).join('')}</tbody></table>
        <ul>${(P.state.coverageGaps || []).map(g => `<li>${esc(g)}</li>`).join('')}</ul></details>
      ${sugg.length ? `<h3 style="margin:4px 0;font-size:13px">Missions suggérées</h3><ul class="list">${sugg.slice(0, 8).map(s => `<li class="item"><span class="t">${esc(s.reason)}</span><span class="m">${pill(s.type, 'info')} ${pill(`détectée (${s.origin})`)} ${esc(fmt(s.created))}</span><button type="button" class="small" data-launch="${esc(s.key)}">Lancer la mission</button></li>`).join('')}</ul>` : ''}
      <div class="toolbar"><select id="in-kind" aria-label="Type d’élément"><option value="all">Tous les types</option>${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <select id="in-domain" aria-label="Domaine"><option value="all">Tous les domaines</option>${domains.map(d => `<option ${f.domain === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
        <label class="hint"><input type="checkbox" id="in-corridor" ${f.corridor ? 'checked' : ''}> corridor seulement</label></div>
      <ul class="list" id="in-list">${items.slice(0, 80).map(i => { const l = F.linkToCorridor(i, e.ctx);
        return `<li class="item"><span class="t"><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a></span><span>${esc(i.summary)}</span>
        <span class="m">${pill(KIND[i.kind] || i.kind, i.kind === 'observation' ? 'ok' : i.kind === 'prediction' ? 'warn' : 'info')} ${pill(i.verification.status === 'official-source' ? 'source officielle' : 'non vérifiée', i.verification.status === 'official-source' ? 'ok' : 'fail')}
        <span>${esc(i.publisher)}</span><span>publié ${esc(fmt(i.published))}</span><span>récupéré ${esc(fmt(i.retrieved_at))}${i.revision > 1 ? ` · révision ${i.revision}` : ''}</span><span>${i.domains.map(esc).join(', ')}</span>
        ${l ? pill(`tronçon ${l.segment} (${l.basis})`, 'info') : i.geo ? pill('géolocalisé hors corridor') : pill('non géolocalisé')}</span>
        ${i.geo && i.geo.type === 'Point' ? `<button type="button" class="ghost small" data-geo="${esc(i.id)}">Voir sur la carte</button>` : ''}</li>`; }).join('')}</ul>
      <p class="hint">${items.length > 80 ? `${items.length - 80} élément(s) supplémentaires non affichés. ` : ''}Les éléments civiques sont attribués à leur source officielle et classés par type et statut uniquement, sans évaluation politique.</p>`;
    $('in-refresh').onclick = () => refresh(true);
    $('in-interval').onchange = ev => { P.browser.intervalMin = +ev.target.value; persistBrowser(); schedule(); renderIntel(); };
    $('in-kind').onchange = ev => { P.filter.kind = ev.target.value; renderIntel(); };
    $('in-domain').onchange = ev => { P.filter.domain = ev.target.value; renderIntel(); };
    $('in-corridor').onchange = ev => { P.filter.corridor = ev.target.checked; renderIntel(); };
    $('ws-body').querySelectorAll('[data-geo]').forEach(b => b.onclick = () => { const it = P.store.items.find(i => i.id === b.dataset.geo); highlight({ point: it.geo.coordinates }); P.fly({ center: it.geo.coordinates, zoom: it.source === 'usgs-quakes' ? 9 : 16.5, pitch: it.source === 'usgs-quakes' ? 0 : 55, bearing: -44 }, 3500); G.CORE_CAMERA.focus(it.geo.coordinates); });
    $('ws-body').querySelectorAll('[data-launch]').forEach(b => b.onclick = () => { const s = suggestions(e).find(x => x.key === b.dataset.launch); show('missions'); launch({ type: 'suggestion', suggestion: missionSuggestion(s) }); });
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
  async function renderAgents() {
    const R = P.registry, c = P.counts, running = P.missions.reduce((n, m) => n + m.tasks.filter(t => t.state === 'running').length, 0);
    const byDept = new Map(R.departments.map(d => [d.id, []])); for (const a of R.agents) if (a.department && byDept.has(a.department) && !a.id.endsWith('.lead')) byDept.get(a.department).push(a);
    const st = a => a.executionMode === 'deterministic' ? pill('exécutable', 'ok') : a.executionMode === 'unavailable' ? pill('indisponible', 'fail') : pill('coordination', 'info');
    $('ws-body').innerHTML = `
      <div class="kpis"><div class="kpi"><b>${c.registered}</b><span>profils enregistrés</span></div><div class="kpi"><b>${c.executable}</b><span>exécutables (règles)</span></div><div class="kpi"><b>${c.coordinationOnly}</b><span>coordination seule</span></div><div class="kpi"><b>${c.unavailable}</b><span>indisponibles</span></div><div class="kpi"><b>${G.CORE_MISSIONS.DEFAULT_OPTS.concurrency}</b><span>exécutions simultanées max.</span></div><div class="kpi"><b>${running}</b><span>tâches actives maintenant</span></div></div>
      <p class="hint">Modèle de langage : <b>${esc(P.llm ? (P.llm.available ? 'serveur local joignable' : P.llm.reason) : 'non testé')}</b> — aucun agent n’utilise de LLM dans cette version ; voir <code>node scripts/llm-check.mjs</code>. ${esc(G.CORE_ORG.DISCLAIMER)}</p>
      <div class="org"><b>Coordination globale CORE</b> → <button type="button" class="agentbtn" data-agent="core.san-francisco.manager">Coordination San Francisco</button>
        ${R.departments.map(d => `<details ${byDept.get(d.id).some(a => a.executionMode === 'deterministic') ? 'open' : ''}><summary>${esc(d.name)} <span class="hint">(${byDept.get(d.id).length})</span></summary>
          <button type="button" class="agentbtn" data-agent="core.san-francisco.${d.id}.lead">Direction — ${esc(d.name)}</button> ${pill('coordination', 'info')}<br>
          ${byDept.get(d.id).map(a => `<button type="button" class="agentbtn" data-agent="${esc(a.id)}">${esc(a.role)}</button> ${st(a)}${a.independent ? ' ' + pill('indépendant') : ''}<br>`).join('')}</details>`).join('')}
        <details open><summary>Vérification et gouvernance indépendantes</summary><button type="button" class="agentbtn" data-agent="core.san-francisco.governance.gateway">Passerelle de décision</button> ${pill('exécutable', 'ok')}</details></div>
      <div id="ag-profile"></div>`;
    $('ws-body').querySelectorAll('[data-agent]').forEach(b => b.onclick = () => profile(b.dataset.agent));
    if (P.selectedAgent) profile(P.selectedAgent);
  }
  function profile(id) {
    P.selectedAgent = id;
    const a = P.registry.agents.find(x => x.id === id); if (!a) return;
    const hist = [...(P.recorded ? P.recorded.missions.filter(m => (m.agentIds || []).includes(id)).map(m => ({ id: m.id, origin: m.origin, decision: m.decision, how: 'enregistrée (Node)' })) : []),
      ...P.missions.filter(m => m.plan && [m.plan.manager, ...m.plan.specialists.map(s => s.agent), m.plan.verifier, m.plan.reviewer, m.plan.gateway].includes(id)).map(m => ({ id: m.id, origin: m.target.question, decision: m.decision ? m.decision.state : m.state, how: 'session (navigateur)' }))];
    const ev = (P.liveEvals || P.evals.results).filter(r => r.agent === id), docs = G.CORE_KNOWLEDGE.approved(P.K).filter(d => a.knowledge.includes(d.id));
    $('ag-profile').innerHTML = `<div class="item"><span class="t">${esc(a.role)}</span><span class="m"><code>${esc(a.id)}</code></span>
      <table class="tbl"><tbody>
      <tr><th>Portée</th><td>${esc(Object.values(a.scope).join(' · '))}</td></tr><tr><th>Département</th><td>${esc(a.department || '—')}</td></tr>
      <tr><th>Spécialisation</th><td>${esc(a.specialization)}</td></tr><tr><th>Compétences</th><td>${a.competencies.map(c => `${esc(c.id)} (${esc(c.basis === 'declared' ? 'déclarée' : c.basis)})`).join(', ') || '—'}</td></tr>
      <tr><th>Outils autorisés</th><td>${a.tools.map(esc).join(', ') || 'aucun'}</td></tr><tr><th>Permission</th><td>${esc(a.permission)} (non modifiable par l’agent)</td></tr>
      <tr><th>Superviseur</th><td>${esc(a.supervisor || '—')}</td></tr><tr><th>Mode d’exécution</th><td>${esc(a.executionMode)}${a.gap ? ` — ${esc(a.gap)}` : ''}</td></tr>
      <tr><th>Statut</th><td>${esc(a.status)}</td></tr><tr><th>Budget</th><td>${a.budget.maxTasks} tâches · ${a.budget.maxMs} ms · ${a.budget.maxRecords} enregistrements</td></tr>
      <tr><th>Version des connaissances</th><td>${esc(P.K.lib.version)} — ${docs.length} document(s) approuvé(s)</td></tr></tbody></table>
      <b>Connaissances</b><ul>${docs.map(d => { const fr = G.CORE_KNOWLEDGE.freshness(d, new Date().toISOString()); return `<li><a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.title)}</a> v${d.version} · ${fr.stale ? pill('à actualiser', 'warn') : pill('à jour', 'ok')} · confiance : ${esc(d.confidence)} · limites : ${esc(d.limitations || '—')}</li>`; }).join('') || '<li>aucune</li>'}</ul>
      <b>Évaluations</b> ${ev.length ? `<ul>${ev.map(r => `<li>${r.pass ? pill('réussie', 'ok') : pill('échec', 'fail')} ${esc(r.case)} — ${esc(r.date)}</li>`).join('')}</ul>` : '<span class="hint">aucune (pas d’outil exécutable)</span>'}
      ${a.executionMode === 'deterministic' ? '<button type="button" class="ghost small" id="ag-reeval">Réévaluer maintenant</button>' : ''}
      <b>Historique de missions</b> ${hist.length ? `<ul>${hist.slice(0, 12).map(h => `<li>${pill(h.how)} ${esc(h.origin)} — ${esc(h.decision)}</li>`).join('')}</ul>` : '<span class="hint">aucune</span>'}
      <p class="hint">${esc(a.disclaimer)}</p></div>`;
    const rb = $('ag-reeval'); if (rb) rb.onclick = async () => { P.liveEvals = G.CORE_EVALS.evaluate(await env(), P.registry); profile(id); };
  }

  // ---------- Missions ----------
  async function launch(origin) {
    const e = await env(), M = G.CORE_MISSIONS, m = M.newMission(origin, e);
    P.missions.unshift(m); P.missions.length = Math.min(P.missions.length, 20); P.current = m; P.view = 'live'; // bounded session history
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
    $('ws-body').innerHTML = `
      <div class="toolbar"><input type="text" id="ms-q" aria-label="Question" placeholder="Question pour l’organisation (ex. travaux et arbres sur Howard)" value="${esc(P.lastQ || '')}">
        <select id="ms-seg" aria-label="Tronçon"><option value="">Sans tronçon</option>${segs.map(([c, f]) => `<option value="${c}" ${P.lastSeg === c ? 'selected' : ''}>${esc(f.properties.street)} ${esc(f.properties.from)} → ${esc(f.properties.to)}</option>`).join('')}</select>
        <button type="button" class="small" id="ms-go">Lancer</button></div>
      <details ${cur ? '' : 'open'}><summary>Suggestions issues de la veille (${sugg.length}) et missions enregistrées (${P.recorded ? P.recorded.missions.length : 0})</summary><ul class="list">
        ${sugg.map(s => `<li class="item"><span>${esc(s.reason)}</span><span class="m">${pill(s.type, 'info')}</span><button type="button" class="small" data-launch="${esc(s.key)}">Lancer</button></li>`).join('')}
        ${(P.recorded ? P.recorded.missions : []).map(m => `<li class="item"><span>${esc(m.origin)}</span><span class="m">${pill('enregistrée')} ${pill(m.decision, DEC[m.decision])} ${m.agents} spécialistes · ${m.ms} ms</span><button type="button" class="ghost small" data-rec="${esc(m.id)}">Ouvrir</button></li>`).join('')}</ul></details>
      ${cur ? missionHtml(cur, P.view === 'recorded') : '<p class="hint">Lancez une mission : le gestionnaire de la ville identifie les domaines, recrute les spécialistes exécutables et la passerelle recalcule tout.</p>'}`;
    $('ms-go').onclick = () => { P.lastQ = $('ms-q').value; P.lastSeg = $('ms-seg').value; if (!P.lastQ.trim()) return; launch({ type: 'question', text: P.lastQ, segment: P.lastSeg || undefined }); };
    $('ws-body').querySelectorAll('[data-launch]').forEach(b => b.onclick = () => launch({ type: 'suggestion', suggestion: missionSuggestion(sugg.find(x => x.key === b.dataset.launch)) }));
    $('ws-body').querySelectorAll('[data-rec]').forEach(b => b.onclick = async () => { P.recordedMission = await getJSON(`data/missions/${b.dataset.rec.replace(':', '-')}.json`); P.view = 'recorded'; P.rerunCheck = null; if (P.recordedMission.target.segment) highlight({ segment: P.recordedMission.target.segment }); renderMissions(); });
    $('ws-body').querySelectorAll('[data-agentlink]').forEach(b => b.onclick = () => { P.selectedAgent = b.dataset.agentlink; show('agents'); });
    const c = $('ms-cancel'); if (c) c.onclick = () => G.CORE_MISSIONS.cancel(P.current);
    const x = $('ms-export'); if (x) x.onclick = () => { const { opts, ...rec } = P.current; const blob = new Blob([JSON.stringify(rec, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${P.current.id.replace(':', '-')}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); P.lastMissionExport = rec; };
    const rr = $('ms-rerun'); if (rr) rr.onclick = async () => { const rec = P.recordedMission; const m = await launch(rec.origin); P.rerunCheck = m.fingerprint === rec.fingerprint ? pill('empreinte identique à l’enregistrement', 'ok') : pill('empreinte différente (instantané ou veille modifiés)', 'warn'); P.view = 'recorded'; renderMissions(); };
  }

  // ---------- Simulations, Decisions, Data ----------
  function renderSims() {
    const M = G.CORE_SIM.MODELS;
    $('ws-body').innerHTML = `<table class="tbl"><thead><tr><th>Modèle</th><th>Domaine</th><th>Nature</th><th>Statut</th></tr></thead><tbody>${Object.entries(M).map(([id, m]) => `<tr><td><code>${esc(id)}</code><br><span class="hint">${esc(m.note)}</span></td><td>${esc(m.domain)}</td><td>${esc(m.kind || '—')}</td><td>${m.status === 'working' ? pill('opérationnel', 'ok') : m.status === 'unavailable' ? pill('indisponible', 'fail') : pill(m.status, 'warn')}</td></tr>`).join('')}</tbody></table>
      <div class="toolbar"><button type="button" class="ghost small" id="sm-coord">Coordination des travaux (S0–S4)</button><button type="button" class="ghost small" id="sm-city">Investigation inter-domaines (R0–R2)</button><a class="pill info" href="corridor.html">Démo de trafic synthétique (non calibrée)</a></div>
      <p class="hint">Aucun modèle physique, énergétique, écologique ni de trafic réel n’est calibré ; ces domaines sont déclarés indisponibles plutôt que simulés.</p>`;
    $('sm-coord').onclick = () => { show('world'); G.CORE_SF_VIEW.openPanel(); G.CORE_SF_VIEW.selectTab('agents'); };
    $('sm-city').onclick = () => { show('world'); G.CORE_SF_VIEW.openPanel(); G.CORE_SF_VIEW.selectTab('city'); };
  }
  function renderDecisions() {
    const rows = [];
    for (const m of P.missions) if (m.decision) rows.push({ what: m.target.question, state: m.decision.state, how: 'mission (session)', id: m.id });
    for (const m of P.recorded ? P.recorded.missions : []) rows.push({ what: m.origin, state: m.decision, how: 'mission enregistrée', id: m.id });
    const ci = G.CORE_CITY_VIEW && G.CORE_CITY_VIEW.state.result; if (ci && ci.decision) rows.push({ what: `Investigation inter-domaines ${ci.brief ? `${ci.brief.location.street} ${ci.brief.location.from} → ${ci.brief.location.to}` : ''}`, state: ci.decision.state, how: 'issueCityDecision' });
    const co = G.CORE_COORD_VIEW && G.CORE_COORD_VIEW.state.result; if (co) for (const [k, d] of Object.entries(co.decisions || {})) rows.push({ what: `Coordination ${k}`, state: d.decision.state, how: 'issueCoordinationProposal' });
    $('ws-body').innerHTML = `<p class="hint">Toutes les passerelles échouent fermées et n’autorisent rien (<code>authorizes: false</code>). Une décision ne devient « approuvée par un humain » qu’en dehors de CORE ; aucune n’est enregistrée ici.</p>
      <table class="tbl"><thead><tr><th>Objet</th><th>Passerelle</th><th>État</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.what)}</td><td>${esc(r.how)}</td><td>${pill(r.state, DEC[r.state] || '')}</td></tr>`).join('') || '<tr><td colspan="3">Aucune décision encore produite dans cette session.</td></tr>'}</tbody></table>`;
  }
  async function renderData() {
    const sv = G.CORE_SF_VIEW; await sv.loadData();
    const man = sv.state.manifest, KN = G.CORE_KNOWLEDGE, contra = KN.contradictions(KN.docClaims(P.K));
    $('ws-body').innerHTML = `<h3 style="margin:0;font-size:13px">Instantanés vérifiés (${man.datasets.length})</h3>
      <table class="tbl"><thead><tr><th>Jeu</th><th>Enr.</th><th>Récupéré</th><th>SHA-256</th></tr></thead><tbody>${man.datasets.map(d => { const k = d.file.replace('.geojson', ''); return `<tr><td><a href="${esc(d.page)}" target="_blank" rel="noopener">${esc(d.title)}</a></td><td>${d.features}</td><td>${esc(fmt(d.retrieved_at))}</td><td>${sv.state.verified[k] === 'ok' ? pill('vérifié', 'ok') : pill(sv.state.verified[k] || '?', 'warn')}</td></tr>`; }).join('')}</tbody></table>
      <button type="button" class="ghost small" id="dt-inspect">Ouvrir l’inspecteur des registres</button>
      <h3 style="margin:0;font-size:13px">Bibliothèque de connaissances (${KN.approved(P.K).length} documents approuvés, ${P.K.lib.proposals.length} proposition(s))</h3>
      <table class="tbl"><thead><tr><th>Document</th><th>Source</th><th>v</th><th>Fraîcheur</th></tr></thead><tbody>${KN.approved(P.K).map(d => { const fr = KN.freshness(d, new Date().toISOString()); return `<tr><td><a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.title)}</a><br><span class="hint">${esc(d.confidence)}${d.limitations ? ' · ' + esc(d.limitations) : ''}</span></td><td>${esc(P.K.sources.get(d.source).name)}<br><span class="hint">${esc(P.K.sources.get(d.source).license)}</span></td><td>${d.version}</td><td>${fr.stale ? pill('à actualiser', 'warn') : pill(`${fr.ageDays} j`, 'ok')}</td></tr>`; }).join('')}</tbody></table>
      <p><b>Contradictions détectées :</b> ${contra.map(c => `${esc(c.key)} : ${c.values.join(' vs ')} (${esc(c.a)} / ${esc(c.b)}) — ${pill(c.status, c.status === 'conflict' ? 'fail' : 'ok')}`).join(' ; ') || 'aucune'}</p>
      <p class="hint">Mises à jour : un agent peut proposer, seul un relecteur humain (<code>human:…</code>) approuve ; une proposition touchant aux règles de sûreté ou permissions d’un agent est rejetée.</p>`;
    $('dt-inspect').onclick = () => { show('world'); sv.openPanel(); sv.selectTab('records'); };
  }

  function updateMeta() {
    const sv = G.CORE_SF_VIEW.state;
    $('navmeta').textContent = `Instantané ${sv.manifest ? fmt(sv.manifest.generated_at) : '…'} · veille ${fmt(P.state ? P.state.lastSuccessfulUpdate : null)}${P.lastRefresh ? ` · navigateur ${fmt(P.lastRefresh.at)}` : ''}`;
  }

  async function init({ map, fly }) {
    P.map = map; P.fly = fly;
    P.registry = G.CORE_ORG.buildRegistry(); P.counts = G.CORE_ORG.counts(P.registry);
    const [evals, lib, items, state, recorded] = await Promise.all([getJSON('data/agents/evaluations.json'), getJSON('data/knowledge/library.json'), getJSON('data/feeds/items.json'), getJSON('data/feeds/state.json'), getJSON('data/missions/index.json').catch(() => null)]);
    P.evals = evals; P.K = G.CORE_KNOWLEDGE.load(lib); P.store = { items: items.items }; P.state = state; P.recorded = recorded;
    restoreBrowser(); schedule();
    document.querySelectorAll('#appnav [data-sec]').forEach(b => b.addEventListener('click', () => show(b.dataset.sec)));
    $('ws-close').onclick = () => show('world');
    new MutationObserver(() => { if (!$('sf-panel').hidden && !$('ws').hidden) { $('ws').hidden = true; document.body.classList.remove('ws-open'); document.querySelectorAll('#appnav [data-sec]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sec === 'world'))); P.sec = 'world'; } }).observe($('sf-panel'), { attributes: true, attributeFilter: ['hidden'] });
    G.CORE_LLM.probe(G.CORE_LLM.PROVIDERS.ollama).then(r => { P.llm = r; });
    G.CORE_SF_VIEW.loadData().then(updateMeta).catch(() => {}); updateMeta();
    P.ready = true;
  }

  G.CORE_PLATFORM = { init, show, launch, refresh, state: P };
})();
