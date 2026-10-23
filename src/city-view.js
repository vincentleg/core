// CORE — city intelligence UI (Phase 2D): thematic domain layers, multidomain investigation workspace,
// Decision Brief, synchronized map, guided demo. Every agent line is an event yielded by src/city-agents.js.
(function () {
  'use strict';
  const D = globalThis.CORE_DOMAINS, CI = globalThis.CORE_CITY, C = globalThis.CORE_COORD, SFV = () => globalThis.CORE_SF_VIEW;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STATUS_LABEL = { working: 'données réelles', partial: 'partiel', candidate: 'candidat', unavailable: 'indisponible' };
  const STATE_CLASS = { 'ÉLIGIBLE À LA REVUE HUMAINE': 'info', 'PREUVES SUPPLÉMENTAIRES REQUISES': 'warn', REJETÉ: 'fail' };
  const BASIS_LABEL = { observed: 'OBSERVÉ', derived: 'DÉRIVÉ (géographie)', rule: 'RÈGLE', hypothesis: 'HYPOTHÈSE' };

  const V = { map: null, ctx: null, events: [], result: null, mode: 'idle', paused: false, speed: 120, alt: null, period: 'recent', themes: { infrastructure: true, buildings: true, nature: true, energy: false, public_space: false, events: true } };

  // ---------- Thematic layers ----------
  const THEME_LAYERS = {
    infrastructure: ['sf-corridor-glow', 'sf-corridor', 'sf-intersections', 'sf-permits', 'sf-large', 'sf-moratoria-line', 'sf-moratoria-point'],
    buildings: ['city-bp', 'city-bp-cluster', 'city-bp-count'],
    nature: ['city-trees', 'city-parks'],
    energy: ['city-energy'],
    public_space: ['city-sidewalks'],
    events: ['sf-closures-line', 'sf-closures-point', 'city-removals'],
  };
  function addThemeLayers() {
    const map = V.map, S = SFV().state;
    if (map.getLayer('city-trees') || !S.data) return;
    const before = map.getLayer('sf-landmarks-3d') ? 'sf-landmarks-3d' : undefined, col = id => D.domain(id).color;
    map.addSource('city-bp-src', { type: 'geojson', data: bpData(), cluster: true, clusterRadius: 34, clusterMaxZoom: 16, attribution: '<a href="https://data.sf.gov">DataSF</a> (ODC-PDDL)' });
    map.addLayer({ id: 'city-sidewalks', type: 'line', source: 'sf-sidewalks', paint: { 'line-color': col('public_space'), 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 17, 5], 'line-opacity': 0.6, 'line-offset': ['interpolate', ['linear'], ['zoom'], 13, 4, 17, 14] } }, before);
    map.addLayer({ id: 'city-parks', type: 'circle', source: 'sf-parks', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 17, 22], 'circle-color': 'rgba(126,224,160,0.15)', 'circle-stroke-color': col('nature'), 'circle-stroke-width': 1.5 } }, before);
    map.addLayer({ id: 'city-trees', type: 'circle', source: 'sf-street-trees', minzoom: 13, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 1.6, 17, 4.5], 'circle-color': col('nature'), 'circle-opacity': 0.85 } }, before);
    map.addLayer({ id: 'city-removals', type: 'circle', source: 'sf-tree-removals', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 4, 17, 9], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#ff7b7b', 'circle-stroke-width': 2 } }, before);
    map.addLayer({ id: 'city-energy', type: 'circle', source: 'sf-energy-benchmarks', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 8], 'circle-color': col('energy'), 'circle-opacity': 0.75, 'circle-stroke-color': '#02050b', 'circle-stroke-width': 1 } }, before);
    map.addLayer({ id: 'city-bp-cluster', type: 'circle', source: 'city-bp-src', filter: ['has', 'point_count'], paint: { 'circle-radius': ['step', ['get', 'point_count'], 10, 10, 14, 30, 18], 'circle-color': 'rgba(255,211,138,0.25)', 'circle-stroke-color': col('buildings'), 'circle-stroke-width': 1.5 } }, before);
    map.addLayer({ id: 'city-bp-count', type: 'symbol', source: 'city-bp-src', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 }, paint: { 'text-color': '#ffd38a' } });
    map.addLayer({ id: 'city-bp', type: 'circle', source: 'city-bp-src', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 7], 'circle-color': col('buildings'), 'circle-stroke-color': '#02050b', 'circle-stroke-width': 1 } }, before);
    map.on('click', 'city-bp-cluster', e => { const f = e.features[0]; map.getSource('city-bp-src').getClusterExpansionZoom(f.properties.cluster_id).then(z => map.easeTo({ center: f.geometry.coordinates, zoom: z, duration: reduced ? 0 : 600 })).catch(() => {}); });
    syncThemes();
  }
  function bpData() {
    const S = SFV().state, asOfN = C.dn(String(S.manifest.generated_at).slice(0, 10));
    const keep = f => { const p = f.properties; if (V.period === 'all') return true; const active = !p.completed && ['filed', 'approved', 'issued', 'reinstated', 'plancheck'].includes(p.status);
      if (V.period === 'active') return active; return active && [p.filed, p.issued].some(d => d && C.dn(d) >= asOfN - 365); };
    return { type: 'FeatureCollection', features: S.data['building-permits'].features.filter(keep) };
  }
  function syncThemes() {
    for (const [d, layers] of Object.entries(THEME_LAYERS)) for (const l of layers) if (V.map.getLayer(l)) V.map.setLayoutProperty(l, 'visibility', V.themes[d] ? 'visible' : 'none');
    const src = V.map.getSource('city-bp-src'); if (src) src.setData(bpData());
    const S = SFV().state;
    if (V.map.getLayer('sf-permits')) V.map.setFilter('sf-permits', V.period === 'all' ? null : ['==', ['get', 'status_class'], 'active']);
    $('th-count').textContent = S.data ? `${bpData().features.length} permis de bâtiment affichés · ${S.data['street-trees'].features.length} arbres · ${S.data['energy-benchmarks'].features.length} bilans énergie` : '';
  }
  function renderThemes() {
    $('th-list').innerHTML = D.DOMAINS.map(d => {
      const usable = ['working', 'partial'].includes(d.status) && THEME_LAYERS[d.id];
      return `<li><label class="${usable ? '' : 'off'}" title="${esc(d.scope)} — Lacunes : ${esc(d.gaps)}"><input type="checkbox" data-theme="${d.id}" ${usable && V.themes[d.id] ? 'checked' : ''} ${usable ? '' : 'disabled'}>
        <i style="background:${d.color}"></i><span>${esc(d.name)}</span><em class="st-${d.status}">${esc(STATUS_LABEL[d.status])}</em></label></li>`;
    }).join('');
    $('th-list').querySelectorAll('[data-theme]').forEach(i => i.addEventListener('change', async () => { V.themes[i.dataset.theme] = i.checked; await ensureData(); syncThemes(); }));
  }
  async function ensureData() { await SFV().loadData(); addThemeLayers(); }

  // ---------- Investigation run ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const params = () => ({ treeBufferM: +$('ci-buffer').value, buildingRecencyDays: +$('ci-recency').value, horizonDays: +$('ci-horizon').value });
  async function start() {
    if (V.mode === 'running' || V.mode === 'replay') return;
    await ensureData(); ensureLayers();
    const sv = SFV(); V.ctx = C.buildContext({ manifest: sv.state.manifest, data: sv.state.data, verified: sv.state.verified });
    V.events = []; V.result = null; V.mode = 'running'; V.paused = false; V.params = params();
    $('ci-log').innerHTML = ''; $('ci-brief').innerHTML = ''; renderRoster(); renderStatus();
    const gen = CI.investigate(V.ctx, V.params);
    for (;;) {
      while (V.paused) await sleep(80);
      const n = gen.next(); // real execution step
      if (n.done) { V.result = n.value; break; }
      V.events.push(n.value); show(n.value, false);
      if (V.speed) await sleep(V.speed); else if (V.events.length % 20 === 0) await sleep(0);
    }
    V.mode = 'done'; setScan([]); renderStatus(); renderRoster(); renderBrief(); focusBlock();
  }
  async function replay() {
    if (!V.events.length || V.mode !== 'done') return;
    V.mode = 'replay'; $('ci-log').innerHTML = ''; renderStatus();
    for (const e of V.events) { while (V.paused) await sleep(80); show(e, true); await sleep(Math.max(V.speed, 40)); }
    const again = CI.run(V.ctx, V.params); V.replayCheck = again.result.fingerprint === V.result.fingerprint;
    V.mode = 'done'; setScan([]); renderStatus(); renderRoster();
  }
  let recomputeTimer = null;
  function paramChanged() {
    $('ci-buffer-v').textContent = `${$('ci-buffer').value} m`; $('ci-recency-v').textContent = `${$('ci-recency').value} j`; $('ci-horizon-v').textContent = `${$('ci-horizon').value} j`;
    if (V.mode !== 'done') return;
    clearTimeout(recomputeTimer); recomputeTimer = setTimeout(() => { const sp = V.speed; V.speed = 0; $('ci-speed').value = '0'; V.mode = 'idle'; start().then(() => { V.speed = sp; }); }, 250);
  }

  const ROLE_NAME = Object.fromEntries(CI.ROLES.map(r => [r.id, r.name]).concat([['system', 'Système']]));
  function show(e, isReplay) {
    const li = document.createElement('li'); li.className = `ev ${e.status || 'ok'}`;
    li.innerHTML = `<span class="ev-agent r-${esc(e.agent)}">${esc(ROLE_NAME[e.agent] || e.agent)}</span><span class="ev-op">${isReplay ? 'rejeu · ' : ''}#${e.seq} ${esc(e.op)} · déterministe</span><span class="ev-text">${esc(e.text)}</span>`;
    const log = $('ci-log'); log.appendChild(li); log.scrollTop = log.scrollHeight;
    if (e.cnn) setScan(e.cnn); V.current = e; renderRoster(); renderStatus();
  }
  function renderRoster() {
    const seen = new Set(V.events.map(e => e.agent)), cur = V.current && V.current.agent, idx = id => CI.ROLES.findIndex(r => r.id === id);
    $('ci-roster').innerHTML = CI.ROLES.map(r => { const st = (V.mode === 'running' || V.mode === 'replay') && cur === r.id ? 'running' : seen.has(r.id) && (V.mode === 'done' || idx(cur) > idx(r.id)) ? 'done' : 'idle';
      return `<li class="ag ${st}"><b>${esc(r.name)}</b><span>${st === 'running' ? 'en cours' : st === 'done' ? 'terminé' : 'en attente'}</span></li>`; }).join('');
  }
  function renderStatus() {
    const lbl = V.mode === 'replay' ? '<b class="replay">REJEU</b> d’une exécution enregistrée' : V.mode === 'running' ? '<b class="live">EXÉCUTION RÉELLE</b>' : V.mode === 'done' ? 'Investigation terminée' : 'Prêt';
    $('ci-status').innerHTML = `${lbl}${V.paused ? ' · <b class="warn">EN PAUSE</b>' : ''} · ${V.events.length} évènement(s)${V.result && V.result.fingerprint ? ` · empreinte <code>${V.result.fingerprint}</code>` : ''}${V.replayCheck !== undefined && V.mode === 'done' ? ` · réexécution ${V.replayCheck ? '<span class="ok">identique</span>' : '<span class="warn">différente</span>'}` : ''}`;
    $('ci-run').disabled = V.mode === 'running' || V.mode === 'replay'; $('ci-pause').disabled = !(V.mode === 'running' || V.mode === 'replay'); $('ci-pause').textContent = V.paused ? 'Reprendre' : 'Pause'; $('ci-replay').disabled = V.mode !== 'done';
  }

  // ---------- Map synchronisation ----------
  function ensureLayers() {
    const map = V.map; if (map.getSource('ci-scan')) return;
    const empty = { type: 'FeatureCollection', features: [] }, before = map.getLayer('sf-landmarks-3d') ? 'sf-landmarks-3d' : undefined;
    for (const id of ['ci-scan', 'ci-block', 'ci-links', 'ci-points']) map.addSource(id, { type: 'geojson', data: empty });
    map.addLayer({ id: 'ci-scan-line', type: 'line', source: 'ci-scan', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 5, 17, 18], 'line-opacity': 0.5, 'line-blur': 2 } }, before);
    map.addLayer({ id: 'ci-block-line', type: 'line', source: 'ci-block', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ffb84d', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 17, 16], 'line-opacity': 0.8 } }, before);
    map.addLayer({ id: 'ci-links-line', type: 'line', source: 'ci-links', paint: { 'line-color': '#7ee0a0', 'line-width': 1.6, 'line-dasharray': [2, 1.5] } }, before);
    map.addLayer({ id: 'ci-points-circle', type: 'circle', source: 'ci-points', paint: { 'circle-radius': ['match', ['get', 'role'], 'tree', 6, 'excavation', 9, 7], 'circle-color': ['match', ['get', 'role'], 'tree', '#7ee0a0', 'excavation', '#ffb84d', 'building', '#ffd38a', 'energy', '#ffb84d', '#e3f6ff'],
      'circle-opacity': ['match', ['get', 'role'], 'energy', 0.5, 0.95], 'circle-stroke-color': ['case', ['get', 'moved'], '#ffffff', '#02050b'], 'circle-stroke-width': ['case', ['get', 'moved'], 3, 1.5] } }, before);
    map.addLayer({ id: 'ci-points-label', type: 'symbol', source: 'ci-points', minzoom: 15.5, layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 10.5, 'text-offset': [0, 1.3], 'text-anchor': 'top' }, paint: { 'text-color': '#e3f6ff', 'text-halo-color': '#02050b', 'text-halo-width': 1.6 } });
  }
  const segF = cnn => { const g = V.ctx && (V.ctx.segments.get(cnn) || V.ctx.nodes.get(cnn)); return g ? { type: 'Feature', geometry: g.geometry, properties: {} } : null; };
  function setScan(cnns) { const s = V.map.getSource('ci-scan'); if (s) s.setData({ type: 'FeatureCollection', features: (cnns || []).map(segF).filter(f => f && f.geometry.type === 'LineString') }); }
  function drawBlock() {
    const r = V.result; if (!r || !r.block) return;
    const b = r.block, alt = r.alternatives.find(a => a.id === V.alt) || r.alternatives[0], shift = new Map(alt.windows.map(w => [w.record_id, w.shift]));
    V.map.getSource('ci-block').setData({ type: 'FeatureCollection', features: [segF(b.seg)].filter(Boolean) });
    const pts = [], links = [];
    for (const w of b.works) pts.push({ type: 'Feature', geometry: { type: 'Point', coordinates: w.coords }, properties: { role: 'excavation', moved: !!shift.get(w.record_id), label: `${(w.agent || 'titulaire masqué').replace(/,?\s*(Inc\.?|Company)$/i, '')} · ${w.permit_number}${shift.get(w.record_id) ? ` (+${shift.get(w.record_id)} j)` : ''}` } });
    for (const t of b.exposed) { pts.push({ type: 'Feature', geometry: { type: 'Point', coordinates: t.coords }, properties: { role: 'tree', moved: false, label: `arbre ${t.id}` } });
      for (const w of b.works) if (C.distanceToGeometry(w.coords, { type: 'Point', coordinates: t.coords }) <= V.params.treeBufferM) links.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [w.coords, t.coords] }, properties: {} }); }
    for (const e of b.recent) pts.push({ type: 'Feature', geometry: { type: 'Point', coordinates: e.props.coords }, properties: { role: 'building', moved: false, label: `permis ${e.props.permit_number}` } });
    for (const e of b.energy) pts.push({ type: 'Feature', geometry: { type: 'Point', coordinates: e.props.coords }, properties: { role: 'energy', moved: false, label: e.props.name || e.props.address || 'bilan énergie' } });
    V.map.getSource('ci-points').setData({ type: 'FeatureCollection', features: pts }); V.map.getSource('ci-links').setData({ type: 'FeatureCollection', features: links });
  }
  function focusBlock() {
    const r = V.result; if (!r || !r.block) return;
    drawBlock();
    const cs = [...V.ctx.segments.get(r.block.seg).geometry.coordinates, ...r.block.works.map(w => w.coords), ...r.block.exposed.map(t => t.coords)];
    const bb = cs.reduce((a, c) => [[Math.min(a[0][0], c[0]), Math.min(a[0][1], c[1])], [Math.max(a[1][0], c[0]), Math.max(a[1][1], c[1])]], [[Infinity, Infinity], [-Infinity, -Infinity]]);
    const want = innerWidth > 900 ? { top: 70, bottom: 70, left: 400, right: 500 } : { top: 40, bottom: Math.round(innerHeight * 0.5), left: 30, right: 30 }, cur = V.map.getPadding(), pad = {};
    for (const k of Object.keys(want)) pad[k] = Math.max(0, want[k] - (cur[k] || 0));
    V.map.fitBounds(bb, { padding: pad, maxZoom: 17.4, pitch: 55, bearing: -44, duration: reduced ? 0 : 1600 });
  }

  // ---------- Decision Brief ----------
  const METRICS = [['excavationPermits', 'Permis d’excavation'], ['organisations', 'Organisations'], ['occupationWindows', 'Fenêtres d’occupation'], ['overlapPairs', 'Chevauchements inter-organisations'], ['treesWithinBuffer', 'Arbres dans le rayon'], ['permitTreePairs', 'Paires permis–arbre'], ['exposureEpisodes', 'Épisodes d’exposition (indicateur)'], ['recentBuildingPermits', 'Permis de bâtiment récents'], ['delayDays', 'Report total (j)'], ['violations', 'Violations de contrainte'], ['evidenceCompleteness', 'Complétude des preuves']];
  function renderBrief() {
    const r = V.result, el = $('ci-brief');
    if (!r.brief) { el.innerHTML = `<p class="caveat">${esc(r.decision.state)} — ${esc(r.decision.reason)}</p>`; return; }
    const b = r.brief, d = r.decision; V.alt = V.alt && r.alternatives.some(a => a.id === V.alt) ? V.alt : b.recommendedAction.alternative;
    const evals = Object.fromEntries(b.evaluation.results.map(e => [e.id, e])), cur = evals[V.alt], ref = evals.R0;
    const rel = r.graph.relations.filter(x => x.from === r.hypothesis.id || x.to === `segment:${r.block.seg}` || (x.type === 'NEAR' && x.from.startsWith('tree:') && r.block.exposed.some(t => `tree:${t.id}` === x.from)));
    el.innerHTML = `
      <section class="brief-head"><p class="state ${STATE_CLASS[d.state]}">${esc(d.state)}</p><h3>${esc(b.location.street)} ${esc(b.location.from)} → ${esc(b.location.to)}</h3>
        <p>${esc(b.discovered)}</p><p class="chips">${b.domains.map(x => `<span class="chip on" style="border-color:${D.domain(x).color}">${esc(D.domain(x).name)}</span>`).join('')}</p>
        <p class="hint">${esc(b.whyItMatters)}</p></section>
      <h4>Action recommandée</h4><p><b>${esc(b.recommendedAction.alternative)}</b> — ${esc(b.recommendedAction.summary)}</p><p class="caveat">${esc(b.humanApproval)}</p>
      <h4>Alternatives évaluées</h4><div class="scen-cards">${b.alternatives.map(a => `<button type="button" class="scen ${a.id === V.alt ? 'on' : ''}" data-alt="${a.id}"><b>${a.id} · ${esc(a.name)}</b>
        <span class="badge ${a.kind === 'observed-derived' ? 'observed' : 'approx'}">${a.kind === 'observed-derived' ? 'RÉFÉRENCE (DATES OBSERVÉES)' : 'HYPOTHÉTIQUE'}</span><small>${esc((b.ranking.find(x => x.id === a.id) || {}).why || '')}</small></button>`).join('')}</div>
      <table class="metrics"><thead><tr><th>Métrique</th><th>R0</th><th>${esc(V.alt)}</th></tr></thead><tbody>${METRICS.map(([k, l]) => { const a = ref.metrics[k], c = cur.metrics[k]; const fmt = v => k === 'evidenceCompleteness' ? Math.round(v * 100) + ' %' : v;
        return `<tr><th>${esc(l)}</th><td>${fmt(a)}</td><td class="${c < a ? 'down' : c > a ? 'up' : ''}">${fmt(c)}</td></tr>`; }).join('')}</tbody></table>
      ${cur.missingEvidence.length ? `<p class="caveat">Preuves manquantes pour ${esc(V.alt)} : ${cur.missingEvidence.map(esc).join(', ')}.</p>` : ''}
      <p class="hint">${esc(cur.notes)} ${esc(b.evaluation.method)}</p>
      <details open><summary>Preuves (${b.evidence.excavations.length} excavations, ${b.evidence.trees.length} arbres, ${b.evidence.buildingPermitsTotal} permis de bâtiment, ${b.evidence.energyBuildings.length} bilans énergie)</summary>
        <table class="rec"><tbody>${b.evidence.excavations.map(x => `<tr><td><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.permit)}</a></td><td>${esc(x.organisation || 'masqué')}</td><td>${esc(x.start)} → ${esc(x.end)}</td><td><button type="button" class="ghost small" data-insp="permits|${esc(x.record_id)}">Inspecter</button></td></tr>`).join('')}
        ${b.evidence.trees.map(x => `<tr><td><a href="${esc(x.url)}" target="_blank" rel="noopener">arbre ${esc(x.treeid)}</a></td><td colspan="2">${esc(x.species || '')} · ${esc(x.legal_status || '')}</td><td><button type="button" class="ghost small" data-insp="street-trees|${esc(x.treeid)}">Inspecter</button></td></tr>`).join('')}
        ${b.evidence.buildingPermits.map(x => `<tr><td><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.permit)}</a></td><td>${esc(x.type)} · ${esc(x.status)}</td><td>${esc(x.filed || '')}</td><td><button type="button" class="ghost small" data-insp="building-permits|${esc(x.permit)}">Inspecter</button></td></tr>`).join('')}</tbody></table>
        <p class="hint">Énergie (contexte, déclaré) : ${b.evidence.energyBuildings.map(e => `${esc(e.name || e.address)} — ${e.site_eui ?? 'n.d.'} kBtu/pi² (${esc(e.benchmark_status || '')})`).join(' ; ') || 'aucun'}. Trottoir (2014) : ${b.evidence.sidewalks.map(s => `${s.width_ft} pi (${esc(s.side)})`).join(', ') || 'n.d.'}.</p></details>
      <details><summary>Observation, dérivation, règle, hypothèse</summary>${Object.entries(b.observationVsInference).map(([k, v]) => `<p><span class="badge ${k === 'observed' ? 'observed' : k === 'hypothesis' ? 'synthetic' : 'approx'}">${esc(BASIS_LABEL[k])}</span> ${v.map(esc).join(' ; ')}</p>`).join('')}
        <p><b>Revendications testables :</b></p><ul>${b.hypothesis.claims.map(c => `<li>${esc(c.id)} [${esc(BASIS_LABEL[c.basis])}] ${esc(c.text)}</li>`).join('')}</ul>
        <p><b>Contradictions / limites :</b> ${b.contradictions.map(c => esc(c.text)).join(' ') || 'aucune trouvée'}</p></details>
      <details><summary>Graphe de connaissances (${rel.length} relations locales sur ${r.graph.relations.length})</summary><table class="rec"><tbody>${rel.slice(0, 40).map(x => `<tr><td>${esc(x.type)}</td><td><span class="badge ${x.basis === 'observed' ? 'observed' : x.basis === 'hypothesis' ? 'synthetic' : 'approx'}">${esc(BASIS_LABEL[x.basis])}</span></td><td>${esc(x.from)} → ${esc(x.to)}<br><small>${esc(x.why)}</small></td></tr>`).join('')}</tbody></table></details>
      <details><summary>Revue adversariale (${b.adversarial.filter(a => a.pass).length}/${b.adversarial.length} tenues)</summary><ul class="checks">${b.adversarial.map(a => `<li class="${a.pass ? 'ok' : 'warn'}">${a.pass ? '✓' : '✗'} ${esc(a.id)} ${esc(a.label)} — ${esc(a.detail)}</li>`).join('')}</ul></details>
      <details><summary>Incertitudes, manques, contraintes, parties prenantes</summary><p><b>Incertitudes :</b> ${b.uncertainty.map(esc).join(' ')}</p><p><b>Données manquantes :</b> ${b.missingData.map(esc).join(' ; ')}</p>
        <p><b>Contraintes :</b> ${b.constraints.map(esc).join(' ; ')}</p><p><b>Parties prenantes :</b> ${b.stakeholders.map(esc).join(' ; ')}</p><p><b>Conclusion invalidée si :</b> ${b.invalidatedIf.map(esc).join(' ')}</p></details>
      <section class="decision"><h4>Passerelle de décision humaine</h4><p class="state ${STATE_CLASS[d.state]}">${esc(d.state)}</p><p>${esc(d.reason)}</p>
        <ul class="checks">${d.checks.map(c => `<li class="${c.pass ? 'ok' : 'warn'}">${c.pass ? '✓' : '✗'} ${esc(c.label)}${c.detail ? ` — ${esc(c.detail)}` : ''}</li>`).join('')}</ul>
        <p class="caveat">Aucune action physique n’est exécutée. ${esc(b.humanApproval)}</p><button type="button" class="ghost small" id="ci-export">Exporter la note de décision (JSON)</button></section>`;
    el.querySelectorAll('[data-alt]').forEach(x => x.addEventListener('click', () => { V.alt = x.dataset.alt; renderBrief(); drawBlock(); }));
    el.querySelectorAll('[data-insp]').forEach(x => x.addEventListener('click', () => { const [ds, id] = x.dataset.insp.split('|'); SFV().inspect(ds, id); }));
    $('ci-export').addEventListener('click', exportBrief);
  }
  function exportBrief() {
    const r = V.result, sub = r.graph.relations.filter(x => x.from === r.hypothesis.id || x.to === `segment:${r.block.seg}`);
    const json = JSON.stringify({ generator: 'CORE city intelligence (deterministic, no language model)', fingerprint: r.fingerprint, params: V.params, brief: r.brief, decision: r.decision, graph: { relations: sub }, trace: V.events.map(({ cnn, ...e }) => e) }, null, 2);
    V.lastExport = json;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = `core-decision-brief-${r.block.seg}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Guided demo (real actions, user-paced) ----------
  const STEPS = [
    { t: 'Terre', d: 'CORE : une Terre numérique où des agents à règles testent des hypothèses sur des données publiques vérifiées.', go: () => document.querySelector('[data-go=globe]').click() },
    { t: 'San Francisco', d: 'Ville laboratoire : rues et bâtiments OSM, repères 3D labellisés (procédural ou OSM).', go: () => document.querySelector('[data-go=sf]').click() },
    { t: 'Domaines', d: 'Thèmes : infrastructure, bâtiments, nature, énergie, espace public, évènements — chacun avec son statut de données réel.', go: async () => { for (const k of ['infrastructure', 'buildings', 'nature', 'events']) V.themes[k] = true; renderThemes(); await ensureData(); syncThemes(); $('themes').open = true; SFV().openPilot(); } },
    { t: 'Investigation', d: 'Huit rôles déterministes s’exécutent réellement sur les registres DataSF (aucun modèle de langage).', go: () => { SFV().selectTab('city'); V.speed = 120; $('ci-speed').value = '120'; start(); }, wait: () => V.mode === 'done' },
    { t: 'Découverte', d: 'Un tronçon réunit excavations de plusieurs organisations, arbres d’alignement proches et permis de bâtiment récents.', go: () => { focusBlock(); $('ci-brief').scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); } },
    { t: 'Preuves', d: 'Chaque élément renvoie à son enregistrement source, sa date d’instantané et sa nature (observé, dérivé, règle, hypothèse).', go: () => { const e = document.querySelector('#ci-brief details'); if (e) { e.open = true; e.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); } } },
    { t: 'Alternatives', d: 'Référence, intervention coordonnée, différer et investiguer : comparées avec des modèles déterministes ; essayez le rayon autour des arbres.', go: () => { V.alt = 'R1'; renderBrief(); drawBlock(); document.querySelector('#ci-brief .scen-cards').scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); } },
    { t: 'Revue adversariale', d: 'Sept perturbations testent la relation ; les sensibilités sont affichées, pas cachées.', go: () => { const ds = [...document.querySelectorAll('#ci-brief details')]; const a = ds.find(x => x.textContent.startsWith('Revue adversariale')); if (a) { a.open = true; a.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); } } },
    { t: 'Décision humaine', d: 'La passerelle recalcule tout ; elle propose une revue humaine ou exige des preuves. CORE n’exécute rien.', go: () => { V.alt = V.result.brief.recommendedAction.alternative; renderBrief(); drawBlock(); document.querySelector('#ci-brief .decision').scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); } },
  ];
  let step = -1;
  async function guide(i) {
    step = Math.max(0, Math.min(STEPS.length - 1, i)); const s = STEPS[step];
    $('guide').hidden = false; $('guide-title').textContent = `Étape ${step + 1}/${STEPS.length} · ${s.t}`; $('guide-text').textContent = s.d;
    $('guide-prev').disabled = step === 0; $('guide-next').textContent = step === STEPS.length - 1 ? 'Terminer' : 'Suivant';
    await s.go();
    if (s.wait) { $('guide-next').disabled = true; while (!s.wait()) await sleep(200); }
    $('guide-next').disabled = false;
  }

  function init({ map }) {
    V.map = map; renderThemes(); renderRoster(); renderStatus();
    $('th-period').addEventListener('change', e => { V.period = e.target.value; syncThemes(); });
    $('ci-run').addEventListener('click', start);
    $('ci-pause').addEventListener('click', () => { if (V.mode === 'running' || V.mode === 'replay') { V.paused = !V.paused; renderStatus(); } });
    $('ci-replay').addEventListener('click', replay);
    $('ci-speed').addEventListener('change', e => { V.speed = +e.target.value; });
    for (const id of ['ci-buffer', 'ci-recency', 'ci-horizon']) $(id).addEventListener('input', paramChanged);
    $('demo-guided').addEventListener('click', () => guide(0));
    $('guide-next').addEventListener('click', () => { if (step >= STEPS.length - 1) { $('guide').hidden = true; step = -1; } else guide(step + 1); });
    $('guide-prev').addEventListener('click', () => guide(step - 1));
    $('guide-quit').addEventListener('click', () => { $('guide').hidden = true; step = -1; });
    $('console-toggle').addEventListener('click', () => { const c = document.body.classList.toggle('console-min'); $('console-toggle').setAttribute('aria-expanded', String(!c)); $('console-toggle').textContent = c ? 'Déplier' : 'Réduire'; });
    document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!$('guide').hidden) { $('guide').hidden = true; step = -1; } else if (!$('sf-panel').hidden) SFV().closePanel(); });
    map.on('moveend', () => { if (map.getZoom() >= 11 && SFV().state.data) addThemeLayers(); });
    paramChanged();
  }

  globalThis.CORE_CITY_VIEW = { init, start, replay, guide, renderBrief, state: V, syncThemes, ensureData };
})();
