// CORE — San Francisco view: landmarks, Folsom/Howard public records, record inspector (browser only).
// Data are dated snapshots in data/sf (see manifest.json). Nothing here is synthetic; models are labelled approximate.
(function () {
  'use strict';
  const W = globalThis.CORE_SF_WORLD;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SF_BOUNDS = [-122.53, 37.69, -122.35, 37.84];
  const DATA = [
    { key: 'corridor', file: 'corridor.geojson', label: 'Tronçons Folsom / Howard (2nd → 11th)', recordKey: 'cnn' },
    { key: 'intersections', file: 'intersections.geojson', label: 'Intersections', recordKey: 'cnn' },
    { key: 'permits', file: 'permits.geojson', label: 'Permis de travaux de voirie', recordKey: 'permit_number' },
    { key: 'large-excavations', file: 'large-excavations.geojson', label: 'Grandes excavations (≥ 1 000 pi²)', recordKey: 'permit_number' },
    { key: 'moratoria', file: 'moratoria.geojson', label: 'Moratoires de chaussée (5 ans)', recordKey: 'id' },
    { key: 'closures', file: 'closures.geojson', label: 'Fermetures temporaires SFMTA', recordKey: 'objectid' },
  ];
  // Toggleable groups → map layers
  const GROUPS = [
    { id: 'corridor', label: 'Tronçons du corridor', swatch: '#78e8ff', layers: ['sf-corridor-glow', 'sf-corridor', 'sf-intersections'], data: ['corridor', 'intersections'] },
    { id: 'permits', label: 'Permis de travaux (2021 →)', swatch: '#ffb84d', layers: ['sf-permits'], data: ['permits'] },
    { id: 'large', label: 'Grandes excavations', swatch: '#ffd38a', layers: ['sf-large'], data: ['large-excavations'] },
    { id: 'moratoria', label: 'Moratoires de chaussée', swatch: '#7ee0a0', layers: ['sf-moratoria-line', 'sf-moratoria-point'], data: ['moratoria'] },
    { id: 'closures', label: 'Fermetures temporaires', swatch: '#ff5cd6', layers: ['sf-closures-line', 'sf-closures-point'], data: ['closures'] },
  ];
  const CLICKABLE = ['sf-permits', 'sf-large', 'sf-closures-line', 'sf-closures-point', 'sf-moratoria-line', 'sf-moratoria-point', 'sf-intersections', 'sf-corridor', 'sf-landmarks-3d', 'sf-landmark-labels'];

  const S = { map: null, msg: () => {}, fly: null, landmarks: false, data: null, manifest: null, verified: {}, filters: { street: 'all', status: 'all' }, selection: [], selected: null, groups: {}, open: false };

  function inSF(map) { const c = map.getCenter(); return c.lng > SF_BOUNDS[0] && c.lng < SF_BOUNDS[2] && c.lat > SF_BOUNDS[1] && c.lat < SF_BOUNDS[3]; }

  // ---------- Landmarks (lazy) ----------
  function addLandmarks() {
    if (S.landmarks) return; S.landmarks = true;
    const map = S.map;
    map.addSource('sf-landmarks', { type: 'geojson', data: W.landmarkModels(), tolerance: 0, attribution: 'Modèles procéduraux CORE (dimensions publiées GGBHTD, emprises OSM)' });
    map.addLayer({ id: 'sf-landmarks-3d', type: 'fill-extrusion', source: 'sf-landmarks', minzoom: 10, paint: {
      'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-opacity': 0.96 } });
    map.addSource('sf-landmark-points', { type: 'geojson', data: { type: 'FeatureCollection', features: W.LANDMARKS.map(l => ({ type: 'Feature', geometry: { type: 'Point', coordinates: l.center }, properties: { id: l.id, name: l.name, model: l.model, label: `${l.name}\n${l.model === 'procedural' ? 'modèle procédural' : 'géométrie OSM'}` } })) } });
    map.addLayer({ id: 'sf-landmark-labels', type: 'symbol', source: 'sf-landmark-points', minzoom: 12, layout: {
      'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, -1.2], 'text-anchor': 'bottom', 'text-allow-overlap': false },
      paint: { 'text-color': '#ffd38a', 'text-halo-color': '#02050b', 'text-halo-width': 1.6 } });
  }

  // With 3D relief on, fill-extrusions sit on the terrain surface, which includes Bay bathymetry
  // (≈ −130 m × exaggeration under the Golden Gate). Bridge parts are offset by the terrain value at their
  // centroid so the model keeps its published heights above water. Buildings on land are left untouched.
  let terrainFixed = null;
  function compensateTerrain() {
    const map = S.map, src = map.getSource('sf-landmarks'); if (!src) return;
    const terrain = map.getTerrain && map.getTerrain();
    if (!terrain) { if (terrainFixed !== false) { src.setData(W.landmarkModels()); terrainFixed = false; } return; }
    const fc = W.landmarkModels(); let missing = 0;
    for (const f of fc.features) {
      if (f.properties.landmark !== 'golden-gate') continue;
      const ring = f.geometry.coordinates[0], c = [ring.reduce((a, p) => a + p[0], 0) / ring.length, ring.reduce((a, p) => a + p[1], 0) / ring.length];
      const e = map.queryTerrainElevation(c);
      if (e === null || e === undefined || !Number.isFinite(e)) { missing++; continue; }
      f.properties.base = Math.max(0, f.properties.base - e); f.properties.height = Math.max(f.properties.base + 0.5, f.properties.height - e);
    }
    src.setData(fc); terrainFixed = missing === 0;
  }

  // Hide OSM building parts that a procedural landmark replaces (runtime detection, see sf-world.js).
  const replaced = new Set(); let zones = null, pending = false;
  function hideReplaced() {
    if (pending) return; pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const map = S.map; if (map.getZoom() < 12.5 || !inSF(map) || !map.getLayer('building')) return;
      zones = zones || W.replacementZones();
      const before = replaced.size;
      for (const f of map.querySourceFeatures('omt', { sourceLayer: 'building' })) if (f.id !== undefined && !replaced.has(f.id) && W.replacedBy(f, zones)) replaced.add(f.id);
      if (replaced.size !== before) map.setFilter('building', ['!', ['in', ['id'], ['literal', [...replaced]]]]);
    });
  }

  // ---------- Public records (lazy, checksum-verified) ----------
  async function sha256Hex(text) {
    if (!globalThis.crypto || !crypto.subtle) return null;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let loading = null;
  function loadData() {
    if (loading) return loading;
    loading = (async () => {
      const manifest = await (await fetch('data/sf/manifest.json', { cache: 'no-cache' })).json();
      const data = {};
      await Promise.all(DATA.map(async d => {
        const meta = manifest.datasets.find(m => m.file === d.file);
        if (!meta) throw Error(`manifest entry missing: ${d.file}`);
        const text = await (await fetch(`data/sf/${d.file}`, { cache: 'no-cache' })).text();
        const hash = await sha256Hex(text);
        S.verified[d.key] = hash === null ? 'unverifiable' : hash === meta.sha256 ? 'ok' : 'mismatch';
        const fc = JSON.parse(text);
        fc.features.forEach((f, i) => { f.id = i; f.properties.dataset = d.key; });
        data[d.key] = fc;
      }));
      S.manifest = manifest; S.data = data;
      addDataLayers(); renderPanel(); applyFilters();
      const bad = Object.entries(S.verified).filter(([, v]) => v === 'mismatch').map(([k]) => k);
      if (bad.length) S.msg(`Instantané altéré (${bad.join(', ')}) : vérifier data/sf.`);
      return data;
    })().catch(err => { loading = null; console.warn(err); S.msg('Données publiques San Francisco indisponibles (instantané non chargé).'); throw err; });
    return loading;
  }

  function addDataLayers() {
    const map = S.map, attr = '<a href="https://data.sf.gov">DataSF</a> (ODC-PDDL)';
    for (const d of DATA) map.addSource(`sf-${d.key}`, { type: 'geojson', data: S.data[d.key], attribution: attr });
    map.addSource('sf-selected', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const before = map.getLayer('sf-landmarks-3d') ? 'sf-landmarks-3d' : undefined;
    const add = l => map.addLayer(l, before);
    add({ id: 'sf-corridor-glow', type: 'line', source: 'sf-corridor', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#78e8ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 4, 16, 18], 'line-opacity': 0.18, 'line-blur': 4 } });
    add({ id: 'sf-corridor', type: 'line', source: 'sf-corridor', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#78e8ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 16, 4] } });
    add({ id: 'sf-moratoria-line', type: 'line', source: 'sf-moratoria', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#7ee0a0', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 17, 7], 'line-dasharray': [1.5, 1.2], 'line-offset': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 9] } });
    add({ id: 'sf-moratoria-point', type: 'circle', source: 'sf-moratoria', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 8], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#7ee0a0', 'circle-stroke-width': 2 } });
    add({ id: 'sf-closures-line', type: 'line', source: 'sf-closures', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#ff5cd6', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 17, 6], 'line-offset': ['interpolate', ['linear'], ['zoom'], 13, -3, 17, -9] } });
    add({ id: 'sf-closures-point', type: 'circle', source: 'sf-closures', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#ff5cd6' } });
    add({ id: 'sf-intersections', type: 'circle', source: 'sf-intersections', minzoom: 14, paint: { 'circle-radius': 2.5, 'circle-color': '#e3f6ff', 'circle-opacity': 0.8 } });
    add({ id: 'sf-permits', type: 'circle', source: 'sf-permits', paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 2.5, 17, 7],
      'circle-color': ['match', ['get', 'status_class'], 'active', '#ffb84d', 'ended', '#8a7350', '#c98f3a'],
      'circle-opacity': ['match', ['get', 'status_class'], 'ended', 0.7, 0.95],
      'circle-stroke-color': ['case', ['==', ['get', 'project'], 'streetscape'], '#e3f6ff', '#02050b'], 'circle-stroke-width': ['case', ['==', ['get', 'project'], 'streetscape'], 1.6, 0.8] } });
    add({ id: 'sf-large', type: 'circle', source: 'sf-large-excavations', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 17, 15], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#ffd38a', 'circle-stroke-width': 2.2 } });
    add({ id: 'sf-selected-line', type: 'line', source: 'sf-selected', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.9 } });
    add({ id: 'sf-selected-point', type: 'circle', source: 'sf-selected', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 13, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } });
    for (const g of GROUPS) S.groups[g.id] = S.groups[g.id] ?? true;
    syncGroupVisibility();
  }

  function syncGroupVisibility() {
    if (!S.data) return;
    for (const g of GROUPS) for (const l of g.layers) if (S.map.getLayer(l)) S.map.setLayoutProperty(l, 'visibility', S.groups[g.id] ? 'visible' : 'none');
  }

  function filterExpr() {
    const all = [];
    if (S.filters.street !== 'all') all.push(['any', ['==', ['get', 'street'], S.filters.street], ['==', ['get', 'cross_street_1'], S.filters.street]]);
    if (S.filters.status !== 'all') all.push(['==', ['get', 'status_class'], S.filters.status]);
    return all.length ? ['all', ...all] : null;
  }
  function matches(f) {
    const p = f.properties;
    if (S.filters.street !== 'all' && p.street !== S.filters.street && p.cross_street_1 !== S.filters.street) return false;
    if (S.filters.status !== 'all' && p.status_class !== undefined && p.status_class !== S.filters.status) return false;
    return true;
  }
  function applyFilters() {
    if (!S.data) return;
    const e = filterExpr();
    for (const l of ['sf-permits', 'sf-large']) S.map.setFilter(l, e);
    const streetOnly = S.filters.street === 'all' ? null : ['==', ['get', 'street'], S.filters.street];
    S.map.setFilter('sf-corridor', streetOnly); S.map.setFilter('sf-corridor-glow', streetOnly);
    renderCounts();
  }

  // ---------- Panel ----------
  const fmtDate = iso => iso ? iso.replace('T', ' ').slice(0, 16) + ' UTC' : '—';
  const ageDays = iso => Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  function datasetOf(key) { return S.manifest.datasets.find(m => m.file === DATA.find(d => d.key === key).file); }

  function renderPanel() {
    const m = S.manifest; if (!m) return;
    const age = ageDays(m.generated_at);
    $('sf-fresh').innerHTML = `Instantané du <b>${esc(fmtDate(m.generated_at))}</b> · ${age} j · ${Object.values(S.verified).every(v => v === 'ok') ? '<span class="ok">sommes SHA-256 vérifiées</span>' : '<span class="warn">sommes non vérifiées</span>'}`;
    $('sf-fresh').classList.toggle('stale', age > 30);
    $('sf-groups').innerHTML = GROUPS.map(g => `<label class="grp"><input type="checkbox" data-group="${g.id}" ${S.groups[g.id] ? 'checked' : ''}><i style="background:${g.swatch}"></i><span>${esc(g.label)}</span><b data-count="${g.id}">0</b></label>`).join('');
    $('sf-groups').querySelectorAll('input').forEach(i => i.addEventListener('change', () => { S.groups[i.dataset.group] = i.checked; syncGroupVisibility(); }));
    $('sf-sources').innerHTML = m.datasets.map(d => `<li><a href="${esc(d.page)}" target="_blank" rel="noopener">${esc(d.title)}</a> <span>(${esc(d.id)}) · ${d.features} élém. · ${esc(d.provider)} · ${S.verified[DATA.find(x => x.file === d.file).key] === 'ok' ? '✓' : '?'}</span></li>`).join('');
  }
  function renderCounts() {
    for (const g of GROUPS) {
      const n = g.data.filter(k => k !== 'intersections').reduce((s, k) => s + S.data[k].features.filter(matches).length, 0);
      const el = document.querySelector(`[data-count="${g.id}"]`); if (el) el.textContent = n;
    }
  }

  const FIELD_LABELS = { permit_number: 'Permis', permit_type: 'Type', status: 'Statut', street: 'Rue', cross_street_1: 'Entre', cross_street_2: 'et', cnn: 'CNN (tronçon/nœud)',
    agent: 'Titulaire (organisation)', agent_masked: 'Titulaire masqué', purpose: 'Objet déclaré', reason: 'Motif', approved: 'Approuvé le', start: 'Début', end: 'Fin', project: 'Projet', limits: 'Limites', job_order: 'Ordre de travail',
    case_num: 'Dossier', case_name: 'Nom du dossier', type: 'Type', impact: 'Impact véhicules', info: 'Information', from: 'De', to: 'À', name: 'Nom', oneway: 'Sens unique', classcode: 'Classe', geometry_source: 'Géométrie' };
  const API_FIELD = { permits: 'permit_number', 'large-excavations': 'permit_number', moratoria: 'id', closures: 'objectid', corridor: 'cnn', intersections: 'cnn' };

  function recordLink(f) {
    const ds = datasetOf(f.properties.dataset), key = API_FIELD[f.properties.dataset];
    const value = f.properties.dataset === 'permits' || f.properties.dataset === 'large-excavations' ? f.properties.permit_number : f.properties.dataset === 'closures' ? f.properties.record_id : f.properties.dataset === 'moratoria' ? f.properties.record_id : f.properties.cnn;
    return `https://data.sf.gov/resource/${ds.id}.json?${key}=${encodeURIComponent(value)}`;
  }
  const KIND_NOTE = {
    permits: 'Permis délivré : ce n’est pas une preuve que l’excavation a eu lieu.', 'large-excavations': 'Permis délivré : ce n’est pas une preuve que l’excavation a eu lieu.',
    moratoria: 'Moratoire en vigueur (le jeu ne liste que les moratoires actuels). Des dérogations peuvent exister.', closures: 'Fermeture autorisée par la SFMTA uniquement.',
    corridor: 'Géométrie administrative (axe de voirie DPW).', intersections: 'Nœud du réseau de voirie (CNN).' };

  function showList(features, lngLat) {
    S.selection = features; S.selected = null;
    setSelected(features);
    const el = $('sf-inspect');
    if (!features.length) { el.innerHTML = '<p class="hint">Aucun enregistrement à cet endroit.</p>'; return; }
    el.innerHTML = `<p class="hint">${features.length} enregistrement${features.length > 1 ? 's' : ''} à cet endroit${lngLat ? ` (${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)})` : ''}.</p><ol class="rec-list">` +
      features.map((f, i) => { const p = f.properties; return `<li><button type="button" data-rec="${i}"><b>${esc(p.permit_number || p.case_name || p.limits || p.name || p.street || p.record_id)}</b><span>${esc([p.permit_type || p.type || p.kind, p.status, p.start && `${p.start} → ${p.end || '…'}`].filter(Boolean).join(' · '))}</span></button></li>`; }).join('') + '</ol>';
    el.querySelectorAll('[data-rec]').forEach(b => b.addEventListener('click', () => showRecord(S.selection[+b.dataset.rec])));
    if (features.length === 1) showRecord(features[0]);
  }

  function showRecord(f) {
    S.selected = f; setSelected([f]);
    const p = f.properties;
    if (p.dataset === 'landmark') return showLandmark(p.id);
    const ds = datasetOf(p.dataset), v = S.verified[p.dataset];
    const rows = Object.entries(FIELD_LABELS).filter(([k]) => p[k] !== null && p[k] !== undefined && p[k] !== '').map(([k, l]) => `<tr><th>${esc(l)}</th><td>${esc(p[k])}</td></tr>`).join('');
    $('sf-inspect').innerHTML = `${S.selection.length > 1 ? '<button type="button" class="ghost small" id="sf-back">← Liste</button>' : ''}
      <h3>${esc(p.permit_number || p.case_name || p.limits || p.name || p.street)}</h3>
      <p class="badge observed">OBSERVÉ · registre public</p>
      <table class="rec">${rows}</table>
      <p class="caveat">${esc(KIND_NOTE[p.dataset])}</p>
      <div class="prov"><b>Provenance</b>
        <div>Jeu : <a href="${esc(ds.page)}" target="_blank" rel="noopener">${esc(ds.title)}</a> (${esc(ds.id)}) · ${esc(ds.provider)}</div>
        <div>Enregistrement : <a href="${esc(recordLink(f))}" target="_blank" rel="noopener">requête API DataSF</a></div>
        <div>Récupéré : ${esc(fmtDate(ds.retrieved_at))} · licence <a href="${esc(ds.license.url)}" target="_blank" rel="noopener">${esc(ds.license.name)}</a></div>
        <div>SHA-256 : <code>${esc(ds.sha256.slice(0, 16))}…</code> ${v === 'ok' ? '<span class="ok">vérifié</span>' : v === 'mismatch' ? '<span class="warn">ne correspond pas</span>' : '<span class="warn">non vérifiable ici</span>'}</div>
        <div class="muted">${esc(ds.kind)}</div>
      </div>`;
    const back = $('sf-back'); if (back) back.addEventListener('click', () => showList(S.selection));
  }

  function showLandmark(id) {
    const l = W.LANDMARKS.find(x => x.id === id); if (!l) return;
    S.selected = { properties: { dataset: 'landmark', id } };
    $('sf-inspect').innerHTML = `<h3>${esc(l.name)}</h3>
      <p class="badge ${l.model === 'procedural' ? 'approx' : 'observed'}">${l.model === 'procedural' ? 'APPROXIMATIF · modèle procédural CORE' : 'CARTOGRAPHIE OSM · non relevée par CORE'}</p>
      <p>${esc(l.provenance)}</p><p>Hauteur utilisée : ${l.height} m.</p>
      <div class="prov"><b>Sources</b>${l.sources.map(s => `<div><a href="${esc(s)}" target="_blank" rel="noopener">${esc(s.replace(/^https:\/\//, ''))}</a></div>`).join('')}<div>© OpenStreetMap contributors (ODbL)</div></div>`;
  }

  function setSelected(features) {
    const src = S.map.getSource('sf-selected');
    if (src) src.setData({ type: 'FeatureCollection', features: features.filter(f => f.geometry).map(f => ({ type: 'Feature', geometry: f.geometry, properties: {} })) });
  }

  function onClick(e) {
    const layers = CLICKABLE.filter(l => S.map.getLayer(l) && S.map.getLayoutProperty(l, 'visibility') !== 'none');
    const box = [[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]];
    const hits = S.map.queryRenderedFeatures(box, { layers });
    const land = hits.find(h => h.layer.id === 'sf-landmarks-3d' || h.layer.id === 'sf-landmark-labels');
    const recs = []; const seen = new Set();
    for (const h of hits) {
      const ds = h.properties.dataset; if (!ds || !S.data) continue;
      const f = S.data[ds].features[h.id]; const k = ds + ':' + h.id;
      if (f && !seen.has(k)) { seen.add(k); recs.push(f); }
    }
    const order = ['permits', 'large-excavations', 'closures', 'moratoria', 'intersections', 'corridor'];
    recs.sort((a, b) => order.indexOf(a.properties.dataset) - order.indexOf(b.properties.dataset) || String(b.properties.approved || '').localeCompare(String(a.properties.approved || '')));
    if (!recs.length && !land) return;
    openPanel();
    if (recs.length) showList(recs, e.lngLat);
    else showLandmark(land.properties.id || land.properties.landmark);
  }

  function selectTab(name) {
    for (const t of ['records', 'agents']) { $(`tab-${t}`).setAttribute('aria-selected', String(t === name)); $(`sf-body-${t}`).hidden = t !== name; }
    document.body.classList.toggle('agents-wide', name === 'agents');
  }
  // Open one record in the inspector (used by the agent workspace evidence table).
  function inspect(dataset, recordId) {
    openPanel(); selectTab('records');
    const f = S.data && S.data[dataset] && S.data[dataset].features.find(x => x.properties.record_id === recordId);
    if (f) { S.selection = [f]; showRecord(f); }
    return !!f;
  }

  function openPanel() {
    S.open = true; $('sf-panel').hidden = false; document.body.classList.add('sf-open');
    loadData().catch(() => {});
  }
  function closePanel() { S.open = false; $('sf-panel').hidden = true; document.body.classList.remove('sf-open', 'agents-wide'); }

  // Keep the target in the free space between the console and the data panel.
  function padded(view) {
    if (!S.open) return view;
    return { ...view, padding: innerWidth > 900 ? { top: 40, bottom: 60, left: 380, right: 400 } : { top: 0, bottom: Math.round(innerHeight * 0.45), left: 0, right: 0 } };
  }

  function openPilot() {
    openPanel();
    const place = W.PLACES.find(p => p.id === 'pilot');
    S.fly(padded(place.view), 5200);
  }

  function init({ map, msg, fly }) {
    Object.assign(S, { map, msg, fly });
    const sel = $('sf-place');
    sel.innerHTML = '<option value="">Aller à un quartier ou repère…</option>' + W.PLACES.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    sel.addEventListener('change', () => { const p = W.PLACES.find(x => x.id === sel.value); if (!p) return; if (p.id === 'pilot') openPilot(); else S.fly(padded(p.view), p.id === 'sf' ? 8000 : 4500); sel.value = ''; });
    $('pilot-real').addEventListener('click', openPilot);
    $('sf-close').addEventListener('click', closePanel);
    $('tab-records').addEventListener('click', () => selectTab('records'));
    $('tab-agents').addEventListener('click', () => { openPanel(); selectTab('agents'); });
    $('sf-street').addEventListener('change', e => { S.filters.street = e.target.value; applyFilters(); });
    $('sf-status').addEventListener('change', e => { S.filters.status = e.target.value; applyFilters(); });
    const near = () => { const z = map.getZoom(); if (z >= 9.5 && inSF(map)) { addLandmarks(); if (z >= 11) loadData().catch(() => {}); } };
    map.on('moveend', near); near();
    map.on('sourcedata', e => { if (e.sourceId === 'omt' && e.isSourceLoaded) hideReplaced(); });
    map.on('moveend', hideReplaced);
    map.on('terrain', () => { terrainFixed = null; map.once('idle', compensateTerrain); });
    map.on('idle', () => { if (S.landmarks && map.getTerrain() && terrainFixed !== true && map.getZoom() > 11) compensateTerrain(); });
    map.on('click', onClick);
    for (const l of CLICKABLE) { map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer'; }); map.on('mouseleave', l, () => { map.getCanvas().style.cursor = ''; }); }
  }

  // Local search over San Francisco places and landmarks (no network).
  function search(q) {
    const p = W.PLACES.find(x => x.aliases.includes(q)) || W.PLACES.find(x => x.aliases.some(a => a.length > 3 && (q.includes(a) || a.includes(q))));
    if (!p) return false;
    if (p.id === 'pilot') openPilot(); else S.fly(padded(p.view), p.id === 'sf' ? 8000 : 4500);
    return p;
  }

  globalThis.CORE_SF_VIEW = { init, search, openPilot, openPanel, closePanel, selectTab, inspect, loadData, addLandmarks, replaced, state: S, GROUPS, DATA };
})();
