// CORE — agent workspace (Phase 2C, browser only).
// Drives the deterministic pipeline in src/coord.js step by step: every line shown is an event actually
// yielded by the running code. Display pacing only slows the presentation; replay is labelled as such.
(function () {
  'use strict';
  const C = globalThis.CORE_COORD, SFV = () => globalThis.CORE_SF_VIEW;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TYPE = {
    opportunity: { label: 'Opportunité de coordination', color: '#ffb84d' }, closure: { label: 'Conflit avec fermeture', color: '#ff5cd6' },
    overlap: { label: 'Chevauchement entre organisations', color: '#78e8ff' }, moratorium: { label: 'Début pendant moratoire', color: '#7ee0a0' },
    repeated: { label: 'Travaux répétés', color: '#aa8cff' },
  };
  const ORG_COLORS = ['#ffb84d', '#78e8ff', '#ff5cd6', '#7ee0a0', '#aa8cff', '#ffd38a', '#9fb7c9'];
  const STATE_CLASS = { 'PRÊT POUR REVUE HUMAINE': 'info', SUSPENDU: 'warn', BLOQUÉ: 'fail' };

  const W = {
    map: null, ctx: null, gen: null, events: [], result: null, mode: 'idle', // idle | running | done | replay
    paused: false, speed: 140, startedAt: null, selected: null, scenario: null, replayIndex: 0, nodeCheck: null, filter: 'all',
  };

  // ---------- Map layers ----------
  function ensureLayers() {
    const map = W.map;
    if (map.getSource('coord-scan')) return;
    const empty = { type: 'FeatureCollection', features: [] };
    for (const id of ['coord-scan', 'coord-findings', 'coord-focus', 'coord-points']) map.addSource(id, { type: 'geojson', data: empty });
    const before = map.getLayer('sf-landmarks-3d') ? 'sf-landmarks-3d' : undefined;
    map.addLayer({ id: 'coord-findings-line', type: 'line', source: 'coord-findings', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 17, 12], 'line-opacity': 0.55 } }, before);
    map.addLayer({ id: 'coord-scan-line', type: 'line', source: 'coord-scan', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 5, 17, 18], 'line-opacity': 0.55, 'line-blur': 2 } }, before);
    map.addLayer({ id: 'coord-focus-line', type: 'line', source: 'coord-focus', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ffb84d', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 17, 14] } }, before);
    map.addLayer({ id: 'coord-points-circle', type: 'circle', source: 'coord-points', paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 6, 17, 13], 'circle-color': ['get', 'color'], 'circle-stroke-color': ['case', ['get', 'moved'], '#ffffff', '#02050b'], 'circle-stroke-width': ['case', ['get', 'moved'], 3, 1.5] } }, before);
    map.addLayer({ id: 'coord-points-label', type: 'symbol', source: 'coord-points', minzoom: 14.5, layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-allow-overlap': false },
      paint: { 'text-color': '#e3f6ff', 'text-halo-color': '#02050b', 'text-halo-width': 1.6 } });
  }
  const segFeature = (cnn, props = {}) => { const g = W.ctx && (W.ctx.segments.get(cnn) || W.ctx.nodes.get(cnn)); return g ? { type: 'Feature', geometry: g.geometry, properties: { cnn, ...props } } : null; };
  function setScan(cnns) { const src = W.map.getSource('coord-scan'); if (src) src.setData({ type: 'FeatureCollection', features: (cnns || []).map(c => segFeature(c)).filter(f => f && f.geometry.type === 'LineString') }); }
  function drawFindings() {
    const by = new Map(), order = ['opportunity', 'closure', 'overlap', 'moratorium', 'repeated'];
    for (const f of W.result.findings) { if (W.filter !== 'all' && f.type !== W.filter) continue; const cur = by.get(f.seg); if (!cur || order.indexOf(f.type) < order.indexOf(cur)) by.set(f.seg, f.type); }
    W.map.getSource('coord-findings').setData({ type: 'FeatureCollection', features: [...by].map(([seg, t]) => segFeature(seg, { type: t, color: TYPE[t].color })).filter(Boolean) });
  }

  // ---------- Run / pause / replay ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function gate() { while (W.paused) await sleep(80); }

  async function start() {
    if (W.mode === 'running' || W.mode === 'replay') return;
    const sv = SFV(); await sv.loadData();
    ensureLayers();
    W.ctx = C.buildContext({ manifest: sv.state.manifest, data: sv.state.data, verified: sv.state.verified });
    W.events = []; W.result = null; W.selected = null; W.scenario = null; W.paused = false; W.mode = 'running'; W.startedAt = new Date();
    $('cw-log').innerHTML = ''; $('cw-findings').innerHTML = ''; $('cw-detail').innerHTML = ''; renderRoster(); renderStatus();
    W.map.getSource('coord-findings').setData({ type: 'FeatureCollection', features: [] }); setFocus(null);
    const gen = C.pipeline(W.ctx);
    for (;;) {
      await gate();
      const { value, done } = gen.next(); // real execution step
      if (done) break;
      W.events.push(value);
      if (value.result) W.result = value.result;
      showEvent(value, false);
      if (W.speed) await sleep(W.speed); else if (W.events.length % 25 === 0) await sleep(0);
    }
    W.mode = 'done'; setScan([]); renderStatus(); renderRoster(); afterRun();
  }

  async function replay() {
    if (!W.events.length || W.mode === 'running' || W.mode === 'replay') return;
    W.mode = 'replay'; W.paused = false; $('cw-log').innerHTML = ''; renderStatus(); renderRoster();
    for (const e of C.trace(W.events)) { await gate(); showEvent(e, true); await sleep(Math.max(W.speed, 40)); }
    // Replay integrity: an independent re-execution must yield the same trace fingerprint.
    const again = C.run(W.ctx);
    W.replayCheck = C.traceFingerprint(again.events) === C.traceFingerprint(W.events);
    W.mode = 'done'; setScan([]); renderStatus(); renderRoster();
  }

  function togglePause() { if (W.mode !== 'running' && W.mode !== 'replay') return; W.paused = !W.paused; renderStatus(); }

  // ---------- Activity rendering ----------
  const AGENT_NAMES = Object.fromEntries(C.AGENTS.map(a => [a.id, a.name]).concat([['system', 'Système']]));
  function showEvent(e, isReplay) {
    const li = document.createElement('li');
    li.className = `ev ${e.status || 'ok'}`; li.dataset.agent = e.agent;
    li.innerHTML = `<span class="ev-agent a-${esc(e.agent)}">${esc(AGENT_NAMES[e.agent] || e.agent)}</span><span class="ev-op">${isReplay ? 'rejeu · ' : ''}#${e.seq} ${esc(e.op)}${e.kind === 'deterministic' ? ' · déterministe' : ''}</span><span class="ev-text">${esc(e.text)}</span>`;
    if (e.cnn && e.cnn.length) { li.tabIndex = 0; li.title = 'Afficher sur la carte'; li.addEventListener('click', () => focusCnns(e.cnn)); }
    const log = $('cw-log'); log.appendChild(li);
    while (log.children.length > 400) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
    if (e.cnn) setScan(e.cnn);
    W.current = e; renderRoster(); renderStatus();
  }
  function renderRoster() {
    const done = new Set(W.events.map(e => e.agent)), cur = W.current && W.current.agent;
    $('cw-roster').innerHTML = C.AGENTS.map(a => {
      const st = (W.mode === 'running' || W.mode === 'replay') && cur === a.id ? 'running' : done.has(a.id) && (W.mode === 'done' || W.events.some(e => e.agent !== a.id && C.AGENTS.findIndex(x => x.id === e.agent) > C.AGENTS.findIndex(x => x.id === a.id))) ? 'done' : 'idle';
      const fails = W.events.filter(e => e.agent === a.id && e.status === 'fail').length;
      return `<li class="ag ${st}"><b>${esc(a.name)}</b><span>${st === 'running' ? 'en cours' : st === 'done' ? 'terminé' : 'en attente'}${fails ? ` · ${fails} échec(s)` : ''}</span><i>règles déterministes</i></li>`;
    }).join('');
  }
  function renderStatus() {
    const n = W.events.length, el = $('cw-status');
    const label = W.mode === 'replay' ? '<b class="replay">REJEU</b> d’une trace enregistrée — aucun calcul relancé pendant l’affichage'
      : W.mode === 'running' ? '<b class="live">EXÉCUTION RÉELLE</b> du pipeline déterministe' : W.mode === 'done' ? 'Exécution terminée' : 'Prêt — les agents lisent l’instantané DataSF chargé';
    el.innerHTML = `${label}${W.paused ? ' · <b class="warn">EN PAUSE</b>' : ''} · ${n} évènement(s)${W.result ? ` · empreinte <code>${W.result.fingerprint}</code>` : ''}${W.replayCheck !== undefined && W.mode === 'done' ? ` · réexécution ${W.replayCheck ? '<span class="ok">identique</span>' : '<span class="warn">différente</span>'}` : ''}${W.speed ? ` · affichage ralenti à ${W.speed} ms/étape` : ''}`;
    $('cw-run').disabled = W.mode === 'running' || W.mode === 'replay';
    $('cw-pause').disabled = !(W.mode === 'running' || W.mode === 'replay');
    $('cw-pause').textContent = W.paused ? 'Reprendre' : 'Pause';
    $('cw-replay').disabled = !(W.mode === 'done' && W.events.length);
  }

  // ---------- Findings ----------
  function afterRun() {
    drawFindings(); renderFindings();
    const top = W.result.findings.find(f => f.type === 'opportunity');
    if (top && !W.selected) $('cw-findings').querySelector(`[data-f="${CSS.escape(top.id)}"]`)?.classList.add('suggest');
  }
  function renderFindings() {
    const fs = W.result.findings.filter(f => W.filter === 'all' || f.type === W.filter);
    const counts = W.result.findings.reduce((m, f) => (m[f.type] = (m[f.type] || 0) + 1, m), {});
    $('cw-findings').innerHTML = `<div class="chips">${['all', ...Object.keys(TYPE)].map(t => `<button type="button" class="chip ${W.filter === t ? 'on' : ''}" data-ft="${t}">${t === 'all' ? `Tous (${W.result.findings.length})` : `${esc(TYPE[t].label)} (${counts[t] || 0})`}</button>`).join('')}</div>
      <ol class="findings">${fs.map(f => { const d = W.result.decisions[f.id]; return `<li><button type="button" data-f="${esc(f.id)}" class="${W.selected === f.id ? 'sel' : ''}">
        <i style="background:${TYPE[f.type].color}"></i><b>${esc(f.street)} ${esc(f.from)} → ${esc(f.to)}</b><span>${esc(f.title)} · ${f.records.length} enregistrement(s)${f.evidence && !f.evidence.valid ? ' · preuves incomplètes' : ''}</span>${d ? `<em class="${STATE_CLASS[d.decision.state]}">${esc(d.decision.state)}</em>` : ''}<small>potentiel — à vérifier</small></button></li>`; }).join('')}</ol>`;
    $('cw-findings').querySelectorAll('[data-ft]').forEach(b => b.addEventListener('click', () => { W.filter = b.dataset.ft; renderFindings(); drawFindings(); }));
    $('cw-findings').querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => selectFinding(b.dataset.f)));
  }

  function orgColor(org) { const orgs = [...new Set(W.ctx.data.permits.features.map(f => f.properties.agent).filter(Boolean))].sort(); return org ? ORG_COLORS[orgs.indexOf(org) % ORG_COLORS.length] : '#8fb1c6'; }
  function shortOrg(o) { return o ? o.replace(/,?\s*(Inc\.?|LLC|Company|Co\.)$/i, '').replace(/Pacific Gas & Electric/, 'PG&E').replace(/Pacific Bell Telephone/, 'Pacific Bell') : 'titulaire masqué'; }

  function setFocus(f, windows) {
    const lines = f ? C.groupCnns(W.ctx, f.seg).map(c => segFeature(c)).filter(x => x && x.geometry.type === 'LineString') : [];
    W.map.getSource('coord-focus').setData({ type: 'FeatureCollection', features: lines });
    const pts = [];
    if (f) for (const id of f.records) {
      const h = W.ctx.byRecord.get(`permits:${id}`); if (!h) continue;
      const p = h.feature.properties, w = windows && windows.find(x => x.record_id === id);
      pts.push({ type: 'Feature', geometry: h.feature.geometry, properties: { record_id: id, color: orgColor(p.agent), moved: !!(w && w.shift), label: `${shortOrg(p.agent)} · ${p.permit_number}${w && w.shift ? ` (${w.shift > 0 ? '+' : ''}${w.shift} j)` : ''}` } });
    }
    W.map.getSource('coord-points').setData({ type: 'FeatureCollection', features: pts });
  }
  function boundsOf(cnns, extra = []) {
    let b = null; const add = c => { b = b ? [[Math.min(b[0][0], c[0]), Math.min(b[0][1], c[1])], [Math.max(b[1][0], c[0]), Math.max(b[1][1], c[1])]] : [[c[0], c[1]], [c[0], c[1]]]; };
    for (const c of cnns) { const f = segFeature(c); if (!f) continue; const g = f.geometry; (g.type === 'Point' ? [g.coordinates] : g.coordinates).forEach(add); }
    extra.forEach(add); return b;
  }
  const padding = () => innerWidth > 900 ? { top: 70, bottom: 70, left: 400, right: 500 } : { top: 40, bottom: Math.round(innerHeight * 0.5), left: 30, right: 30 };
  // MapLibre adds fitBounds padding to the map's current padding (set by earlier flights): pass only the difference.
  function focusCnns(cnns, extra) {
    const b = boundsOf(cnns, extra); if (!b) return;
    const want = padding(), cur = W.map.getPadding(), pad = {};
    for (const k of ['top', 'bottom', 'left', 'right']) pad[k] = Math.max(0, want[k] - (cur[k] || 0));
    W.map.fitBounds(b, { padding: pad, maxZoom: 17.2, pitch: 55, bearing: -44, duration: 1600 });
  }

  function selectFinding(id) {
    const f = W.result.findings.find(x => x.id === id); if (!f) return;
    W.selected = id; const a = W.result.analyses[id];
    W.scenario = a && a.result ? (a.result.recommended || 'S0') : null;
    renderFindings(); renderDetail();
    const pts = f.records.map(r => W.ctx.byRecord.get(`permits:${r}`)).filter(Boolean).map(h => h.feature.geometry.coordinates);
    focusCnns(C.groupCnns(W.ctx, f.seg), pts);
    setFocus(f, a && a.result ? a.result.scenarios.find(s => s.id === W.scenario).windows : null);
  }
  function selectScenario(sid) {
    W.scenario = sid; const a = W.result.analyses[W.selected], f = W.result.findings.find(x => x.id === W.selected);
    renderDetail(); setFocus(f, a.result.scenarios.find(s => s.id === sid).windows);
  }

  // ---------- Detail: scenarios, evidence, decision ----------
  const METRIC_ROWS = [
    ['occupationWindows', 'Fenêtres d’occupation distinctes', 'Intervalles disjoints de l’union des fenêtres (hors permis-programmes)'],
    ['occupiedDays', 'Jours d’occupation (union)', 'Longueur de l’union des fenêtres (hors permis-programmes)'],
    ['overlapPairs', 'Paires en chevauchement (organisations ≠)', 'Paires de permis d’organisations différentes dont les fenêtres se recouvrent'],
    ['overlapDays', 'Jours de chevauchement', 'Somme des recouvrements inclusifs des paires'],
    ['organisations', 'Organisations', 'Titulaires distincts identifiés (masqués exclus)'],
    ['segments', 'CNN concernés', 'Tronçons et intersections distincts des permis'],
    ['closureConflictDays', 'Jours en conflit avec fermeture SFMTA', 'Recouvrement des fenêtres avec les fermetures du groupe'],
    ['moratoriumStarts', 'Débuts pendant moratoire', 'Débuts de fenêtre compris dans un moratoire en vigueur'],
    ['moved', 'Permis déplacés', 'Hypothèse de scénario'], ['totalShift', 'Décalage total (j)', 'Somme des |décalages|'],
  ];
  function renderDetail() {
    const f = W.result.findings.find(x => x.id === W.selected); if (!f) { $('cw-detail').innerHTML = ''; return; }
    const a = W.result.analyses[f.id], dec = W.result.decisions[f.id];
    let html = `<h3>${esc(f.street)} ${esc(f.from)} → ${esc(f.to)}</h3><p class="badge observed">${esc(TYPE[f.type].label.toUpperCase())} · POTENTIEL</p>
      <p class="hint">${esc(f.evidence.method)}</p>${f.caveat ? `<p class="caveat">${esc(f.caveat)}</p>` : ''}
      <p class="hint">Statuts administratifs uniquement : aucun enregistrement ne prouve des travaux réalisés.</p>`;
    if (a && a.result) {
      const res = a.result, sc = res.scenarios.find(s => s.id === W.scenario);
      html += `<h4>Laboratoire de scénarios</h4><div class="scen-cards">${res.scenarios.map(s => `<button type="button" class="scen ${s.id === W.scenario ? 'on' : ''}" data-s="${s.id}">
        <b>${s.id} · ${esc(s.name)}</b><span class="badge ${s.kind === 'observed' ? 'observed' : 'approx'}">${s.kind === 'observed' ? 'DÉRIVÉ DES DATES OBSERVÉES' : 'HYPOTHÉTIQUE'}</span>
        <small>${s.applicable ? `${s.metrics.occupationWindows} fenêtre(s) · ${s.metrics.overlapPairs} chevauch. · ${s.metrics.closureConflictDays} j fermeture · ${s.violations.length} violation(s)` : 'non applicable (aucune fermeture)'}${s.improves ? ' · domine la référence' : ''}${res.recommended === s.id ? ' · RETENU' : ''}</small></button>`).join('')}</div>
        <table class="metrics"><thead><tr><th>Métrique</th><th>S0 réf.</th><th>${esc(W.scenario)}</th></tr></thead><tbody>${METRIC_ROWS.map(([k, l, t]) => `<tr title="${esc(t)}"><th>${esc(l)}</th><td>${res.baseline[k] ?? 0}</td><td class="${sc.metrics[k] < (res.baseline[k] ?? 0) ? 'down' : sc.metrics[k] > (res.baseline[k] ?? 0) ? 'up' : ''}">${sc.metrics[k] ?? 0}</td></tr>`).join('')}</tbody></table>
        ${sc.violations.length ? `<p class="caveat">Violations : ${sc.violations.map(esc).join(' ; ')}</p>` : ''}
        <p class="hint">Métriques déterministes calculées sur les dates de permis (observées) ; les scénarios S1–S4 sont hypothétiques. Aucun coût, émission, trafic ni volume d’excavation n’est estimé.</p>
        ${gantt(sc, res)}`;
    } else if (f.type === 'opportunity') html += '<p class="caveat">Preuves incomplètes : aucun scénario généré.</p>';
    else html += '<p class="hint">Constat informatif : aucun permis déplaçable dans l’horizon, pas de laboratoire de scénarios.</p>';
    html += evidenceHtml(f, a);
    if (dec) html += decisionHtml(dec);
    $('cw-detail').innerHTML = html;
    $('cw-detail').querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => selectScenario(b.dataset.s)));
    $('cw-detail').querySelectorAll('[data-inspect]').forEach(b => b.addEventListener('click', () => SFV().inspect('permits', b.dataset.inspect)));
    const ex = $('cw-export'); if (ex) ex.addEventListener('click', () => exportDossier(f.id));
  }

  function gantt(sc, res) {
    const asOf = W.ctx.asOfN, lo = asOf - 30, hi = asOf + 100, span = hi - lo, Wd = 400, rowH = 18, left = 120;
    const x = d => left + Math.max(0, Math.min(span, d - lo)) / span * (Wd - left - 6);
    const base = new Map(res.scenarios[0].windows.map(w => [w.record_id, w]));
    const rows = sc.windows.map((w, i) => {
      const b = base.get(w.record_id), y = 20 + i * rowH, s0 = C.dn(b.start), e0 = C.dn(b.end), s1 = C.dn(w.start), e1 = C.dn(w.end), col = orgColor(w.agent);
      return `<text x="4" y="${y + 12}" class="gl">${esc(shortOrg(w.agent)).slice(0, 16)} ${esc(w.permit_number.slice(-5))}</text>
        <rect x="${x(s0)}" y="${y + 2}" width="${Math.max(2, x(e0 + 1) - x(s0))}" height="${rowH - 6}" fill="none" stroke="${col}" stroke-dasharray="3 2" opacity="0.7"/>
        <rect x="${x(s1)}" y="${y + 5}" width="${Math.max(2, x(e1 + 1) - x(s1))}" height="${rowH - 12}" fill="${col}" opacity="${w.fixed && w.fixed.length ? 0.55 : 0.95}"/>
        ${w.fixed && w.fixed.length ? `<text x="${Wd - 4}" y="${y + 12}" class="gl" text-anchor="end">fixe</text>` : w.shift ? `<text x="${Wd - 4}" y="${y + 12}" class="gl mv" text-anchor="end">${w.shift > 0 ? '+' : ''}${w.shift} j</text>` : ''}`;
    }).join('');
    const H = 26 + sc.windows.length * rowH;
    const closures = W.ctx.data.closures.features.filter(c => C.groupCnns(W.ctx, W.result.findings.find(f => f.id === W.selected).seg).includes(c.properties.cnn))
      .map(c => `<rect x="${x(C.dn(c.properties.start))}" y="16" width="${Math.max(2, x(C.dn(c.properties.end) + 1) - x(C.dn(c.properties.start)))}" height="${H - 18}" fill="#ff5cd6" opacity="0.18"><title>${esc(c.properties.case_name)} (${esc(c.properties.status)})</title></rect>`).join('');
    const tick = d => `<line x1="${x(d)}" x2="${x(d)}" y1="14" y2="${H}" class="gt"/><text x="${x(d) + 2}" y="11" class="gl">${C.ds(d).slice(5)}</text>`;
    return `<svg class="gantt" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="Calendrier des fenêtres de permis, référence en pointillés, scénario plein">
      ${closures}${[lo, asOf, asOf + 30, asOf + 60, asOf + 90].map(tick).join('')}<line x1="${x(asOf)}" x2="${x(asOf)}" y1="14" y2="${H}" stroke="#78e8ff"/>${rows}</svg>
      <p class="hint">Pointillés : fenêtre de référence · plein : ${esc(sc.id)} · rose : fermetures SFMTA · ligne cyan : date de l’instantané. Fenêtres hors de [−30 j, +100 j] tronquées.</p>`;
  }

  function evidenceHtml(f, a) {
    const ev = f.evidence, snap = ev.snapshot;
    return `<details class="evid" open><summary>Preuves et méthode (pourquoi CORE propose ceci)</summary>
      <p><b>Instantané :</b> ${esc(snap.generated_at)} · ${Object.entries(snap.datasets).filter(([, d]) => d).map(([k, d]) => `${esc(k)} <code>${esc(d.sha256.slice(0, 10))}…</code> ${d.verified === 'ok' ? '<span class="ok">vérifié</span>' : '<span class="warn">non vérifié</span>'}`).join(' · ')}</p>
      <p><b>Paramètres :</b> ${Object.entries(W.result.opts).map(([k, v]) => `${esc(k)} = ${esc(v)}`).join(' · ')}</p>
      <ul class="checks">${ev.checks.map(c => `<li class="${c.pass ? 'ok' : 'warn'}">${c.pass ? '✓' : '✗'} ${esc(c.label)}</li>`).join('')}</ul>
      <table class="rec"><thead><tr><th>Permis</th><th>Titulaire</th><th>Fenêtre</th><th>Statut</th><th></th></tr></thead><tbody>${ev.records.map(r => r.missing ? `<tr><td colspan="5" class="warn">${esc(r.record_id)} absent</td></tr>` : `<tr>
        <td><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.permit_number)}</a></td><td>${esc(shortOrg(r.agent))}</td><td>${esc(r.start)} → ${esc(r.end)}</td><td>${esc(r.status)}${(() => { const w = a && a.base && a.base.find(x => x.record_id === r.record_id); return w && w.fixed.length ? ` · fixe (${esc(w.fixed.join(', '))})` : ''; })()}</td>
        <td><button type="button" class="ghost small" data-inspect="${esc(r.record_id)}">Inspecter</button></td></tr>`).join('')}</tbody></table>
      ${a && a.result && a.result.review.pairs.length ? `<p><b>Chevauchements dans l’horizon :</b> ${a.result.review.pairs.map(p => `${esc(shortOrg(p.orgs[0]))} × ${esc(shortOrg(p.orgs[1]))} ${esc(p.from)} → ${esc(p.to)} (${p.days} j)`).join(' ; ')}</p>` : ''}
      ${a && a.adversarial ? `<p><b>Tests adversariaux :</b></p><ul class="checks">${a.adversarial.map(r => `<li class="${r.pass ? 'ok' : 'warn'}">${r.pass ? '✓' : '✗'} ${esc(r.id)} ${esc(r.label)} — ${esc(r.reason)}</li>`).join('')}</ul>` : ''}
    </details>`;
  }

  function decisionHtml(dec) {
    const d = dec.decision;
    return `<section class="decision"><h4>Passerelle de coordination</h4><p class="state ${STATE_CLASS[d.state]}">${esc(d.state)}</p><p>${esc(d.reason)}</p>
      <ul class="checks">${d.checks.map(c => `<li class="${c.pass ? 'ok' : 'warn'}">${c.pass ? '✓' : '✗'} ${esc(c.label)}${c.detail ? ` — ${esc(c.detail)}` : ''}</li>`).join('')}</ul>
      ${d.conditions.length ? `<details><summary>Conditions et hypothèses (${d.conditions.length})</summary><ul>${d.conditions.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details>` : ''}
      <p class="caveat">${esc(d.humanReview)}</p>
      <button type="button" class="ghost small" id="cw-export">Exporter le dossier (JSON)</button></section>`;
  }

  function exportDossier(id) {
    const dec = W.result.decisions[id];
    const blob = new Blob([JSON.stringify({ generator: 'CORE coordination gateway (deterministic)', snapshot: W.ctx.manifest.generated_at, resultFingerprint: W.result.fingerprint, traceFingerprint: C.traceFingerprint(W.events), proposal: dec.proposal, decision: dec.decision }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `core-coordination-${id.replace(':', '-')}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    W.lastExport = id;
  }

  function init({ map }) {
    W.map = map;
    $('cw-run').addEventListener('click', start);
    $('cw-pause').addEventListener('click', togglePause);
    $('cw-replay').addEventListener('click', replay);
    $('cw-speed').addEventListener('change', e => { W.speed = +e.target.value; renderStatus(); });
    W.speed = +$('cw-speed').value; renderRoster(); renderStatus();
  }

  globalThis.CORE_COORD_VIEW = { init, start, replay, togglePause, selectFinding, selectScenario, exportDossier, state: W };
})();
