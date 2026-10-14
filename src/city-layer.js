// CORE — study-area layers of operational cities beyond the San Francisco pilot (Phase 10). Draws only verified,
// published snapshot data (src/cities.js → studyArea.dataDir): neighbourhood outlines, designated safety corridors
// coloured by recorded injury collisions per km and per year, works records, and (New York) measured pedestrian ramps
// that exceed a declared threshold. Loaded lazily when the camera comes near the city. Every popup names its source,
// retrieval date and nature; nothing here is a field observation or a prediction.
(function () {
  'use strict';
  const G = globalThis;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { map: null, loaded: new Map(), loading: new Map() };
  const near = (map, c) => { const m = map.getCenter(); return map.getZoom() >= 10 && Math.abs(m.lng - c[0]) < 0.6 && Math.abs(m.lat - c[1]) < 0.45; };
  const getJSON = async u => { const r = await fetch(u); if (!r.ok) throw new Error(`${u} ${r.status}`); return r.json(); };
  const RAMP_RULES = [['pente > 8,33 %', p => p.running_slope_pct !== null && p.running_slope_pct > 8.33], ['dévers > 2 %', p => p.cross_slope_pct !== null && p.cross_slope_pct > 2], ['stagnation d’eau', p => /yes/i.test(p.ponding || '')], ['obstacle sur la rampe', p => p.obstacles_ramp && !/none/i.test(p.obstacles_ramp)], ['obstacle sur le palier', p => p.obstacles_landing && !/none/i.test(p.obstacles_landing)], ['bande d’éveil absente', p => /missing/i.test(p.warning_surface || '')]];

  async function load(city) {
    if (S.loaded.has(city.id) || S.loading.has(city.id)) return; const dir = city.studyArea.dataDir, map = S.map;
    const job = (async () => {
      const [man, nh, hin, agg, works] = await Promise.all(['manifest', 'neighborhoods', 'hin', 'crashes-agg', 'permits'].map(f => getJSON(`${dir}/${f}.json`)));
      const when = f => { const d = man.datasets.find(x => x.file === `${f}.json`); return d ? String(d.retrieved_at).slice(0, 10) : '—'; }, years = 5;
      const by = new Map(); for (const r of agg.rows) { const o = by.get(r.cnn) || { n: 0, fatal: 0, ped: 0 }; o.n += r.n; if (/Fatal/.test(r.severity)) o.fatal += r.n; if (/Pedestrian/.test(r.group || '')) o.ped += r.n; by.set(r.cnn, o); }
      const id = k => `city-${city.id}-${k}`;
      map.addSource(id('nh'), { type: 'geojson', data: nh });
      map.addLayer({ id: id('nh-line'), type: 'line', source: id('nh'), minzoom: 10, paint: { 'line-color': '#9fe3ff', 'line-width': 1.4, 'line-dasharray': [2, 1.5], 'line-opacity': 0.75 } });
      // One label per neighbourhood, at the vertex mean of its largest ring (multi-part areas would repeat labels).
      const ringArea = r => Math.abs(r.reduce((a, p, i) => a + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0));
      const labelPt = g => { const rings = (g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates]).map(p => p[0]).sort((a, b) => ringArea(b) - ringArea(a)), r = rings[0]; return [r.reduce((a, p) => a + p[0], 0) / r.length, r.reduce((a, p) => a + p[1], 0) / r.length]; };
      map.addSource(id('nh-pt'), { type: 'geojson', data: { type: 'FeatureCollection', features: nh.features.map(f => ({ type: 'Feature', geometry: { type: 'Point', coordinates: labelPt(f.geometry) }, properties: { nhood: f.properties.nhood } })) } });
      map.addLayer({ id: id('nh-label'), type: 'symbol', source: id('nh-pt'), minzoom: 11, maxzoom: 15, layout: { 'text-field': ['concat', ['get', 'nhood'], '\nzone d’étude CORE'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 }, paint: { 'text-color': '#cfefff', 'text-halo-color': '#06121c', 'text-halo-width': 1.4 } });
      const lines = { type: 'FeatureCollection', features: hin.features.map(f => { const c = by.get(f.properties.cnn) || { n: 0, fatal: 0, ped: 0 }, km = f.properties.length_mi * 1.609344; return { ...f, properties: { ...f.properties, n: c.n, fatal: c.fatal, ped: c.ped, rate: km > 0 ? +(c.n / km / years).toFixed(1) : 0, km: +km.toFixed(2) } }; }) };
      map.addSource(id('hin'), { type: 'geojson', data: lines });
      map.addLayer({ id: id('hin'), type: 'line', source: id('hin'), minzoom: 11, paint: { 'line-color': ['interpolate', ['linear'], ['get', 'rate'], 0, '#2f6f8f', 20, '#ffb84d', 60, '#ff4d6d'], 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 16, 6], 'line-opacity': 0.9 } });
      map.addSource(id('works'), { type: 'geojson', data: works });
      map.addLayer({ id: id('works'), type: 'circle', source: id('works'), minzoom: 14, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 2.5, 17, 6], 'circle-color': ['match', ['get', 'status_class'], 'active', '#ff5cd6', '#8a6d85'], 'circle-stroke-color': '#06121c', 'circle-stroke-width': 0.8 } });
      const L = city.labels, pop = (e, html) => new maplibregl.Popup({ offset: 10, maxWidth: '320px' }).setLngLat(e.lngLat).setHTML(html).addTo(map);
      map.on('click', id('hin'), e => { const p = e.features[0].properties; pop(e, `<b>${esc(p.street || p.cnn)}</b><br>${esc(L.hinShort)} · ${esc(p.nhood || '')} · ${p.km} km<br>${p.n} ${esc(L.crashes)} sur 5 ans (${agg.window.from} → ${agg.window.to}) · ${p.fatal} mortelle(s) · ${p.ped} avec piéton blessé ou tué<br>${p.rate} par km et par an<br><span class="hint">Source : ${esc(city.sources.crashes.title)} et ${esc(city.sources.hin.title)}, collectés le ${when('crashes-agg')} ; agrégats seulement ; rattachement spatial à 20 m par CORE. Désignation administrative, pas une mesure du risque actuel.</span>`); });
      map.on('click', id('works'), e => { const p = e.features[0].properties; pop(e, `<b>${esc(p.permit_type || 'Travaux')}</b><br>${esc(p.street)}${p.cross_street_1 ? ` entre ${esc(p.cross_street_1)} et ${esc(p.cross_street_2 || '')}` : ''}<br>${esc(p.start || '?')} → ${esc(p.end || '?')} · ${esc(p.status)}<br><span class="hint">Source : ${esc(city.sources.works.title)}, collecté le ${when('permits')}. ${esc(L.works)} : autorisation, pas preuve d’exécution.</span>`); });
      for (const l of [id('hin'), id('works')]) { map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer'; }); map.on('mouseleave', l, () => { map.getCanvas().style.cursor = ''; }); }
      // Ramps: large file, fetched only once the viewer zooms in.
      const ramps = async () => {
        if (S.loaded.get(city.id).ramps || !man.datasets.some(d => d.file === 'ramps.json') || map.getZoom() < 15) return; S.loaded.get(city.id).ramps = true;
        const r = await getJSON(`${dir}/ramps.json`), flagged = r.features.map(f => ({ ...f, properties: { ...f.properties, issues: RAMP_RULES.filter(([, t]) => t(f.properties)).map(([k]) => k).join(' ; ') } })).filter(f => f.properties.issues);
        map.addSource(id('ramps'), { type: 'geojson', data: { type: 'FeatureCollection', features: flagged } });
        map.addLayer({ id: id('ramps'), type: 'circle', source: id('ramps'), minzoom: 15, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 2, 18, 5], 'circle-color': '#f0b72f', 'circle-stroke-color': '#06121c', 'circle-stroke-width': 0.6 } });
        map.on('click', id('ramps'), e => { const p = e.features[0].properties; pop(e, `<b>Rampe ${esc(p.record_id)}</b> — ${esc(p.street)} / ${esc(p.cross)}<br>Seuils déclarés dépassés : ${esc(p.issues)}<br>Pente ${p.running_slope_pct ?? '?'} % · dévers ${p.cross_slope_pct ?? '?'} % · relevé le ${esc(p.surveyed || '?')}<br><span class="hint">Source : ${esc(city.sources.ramps.title)} (NYC DOT), collecté le ${when('ramps')}. Seuils déclarés par CORE ; pas un contrôle de conformité légale ; l’état actuel peut différer.</span>`); });
      };
      S.loaded.set(city.id, { ramps: false, rampsLoader: ramps, generated: String(man.generated_at).slice(0, 16).replace('T', ' ') + ' UTC', counts: { corridors: hin.features.length, works: works.features.length } }); ramps(); context();
    })().catch(e => { console.warn('city layer', city.id, e.message); }).finally(() => S.loading.delete(city.id));
    S.loading.set(city.id, job); return job;
  }
  // Header context: the city in view (or « Terre ») and, outside San Francisco, that city's snapshot date.
  function context() {
    const C = G.CORE_CITIES, mark = document.querySelector('.mark small'), meta = document.getElementById('navmeta'); if (!C || !mark) return;
    const c = S.map.getZoom() >= 9 ? C.operational().find(x => near(S.map, x.center)) : null; mark.textContent = c ? c.name : S.map.getZoom() < 5 ? 'Terre' : '—';
    if (meta && c && c.id !== 'san-francisco' && S.loaded.has(c.id)) { if (!meta.dataset.sf) meta.dataset.sf = meta.textContent; meta.textContent = `${c.name} — instantané ${S.loaded.get(c.id).generated} (NYC Open Data, OSM)`; }
    else if (meta && meta.dataset.sf) { meta.textContent = meta.dataset.sf; delete meta.dataset.sf; }
  }
  function check() { const C = G.CORE_CITIES; if (!C || !S.map) return; context(); for (const c of C.operational().filter(x => x.studyLayer)) { if (!S.loaded.has(c.id) && near(S.map, c.center)) load(c); else if (S.loaded.has(c.id)) S.loaded.get(c.id).rampsLoader(); } }
  function init(map) { S.map = map; map.on('moveend', check); check(); }
  G.CORE_CITY_LAYER = { init, load, check, state: S };
})();
