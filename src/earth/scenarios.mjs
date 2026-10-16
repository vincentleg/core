// CORE World V8 — reversible scenario layer + traffic replay. The real geography is never modified: each scenario is
// an overlay (geometry patch + recorded SUMO results) that can be shown, compared and removed.
//  • Lane changes come from data/mobility/geometry.json (the real Folsom lanes that the scenario re-allocates).
//  • Vehicles come from RECORDED SUMO traces (seed 1, 240 simulated seconds from minute 10), replayed ×12 = 20 s.
//  • Metrics, statuses and verdicts come from data/mobility/results.json (5 seeds, 95 % intervals). UNCALIBRATED.
// The animation is a playback of model output; it is not itself a simulation and proves nothing about the real street.
const EMPTY = { type: 'FeatureCollection', features: [] };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const STATUS = { // never green for "proven": the best a model can reach here is "promising — human review required"
  baseline: ['Référence modélisée', 'info'], unsupported: ['Non étayé par le modèle', 'simulated'], 'promising-uncalibrated': ['Prometteur · non calibré · revue humaine requise', 'observed'],
  'trade-off-uncalibrated': ['Compromis · revue humaine requise', 'potential-risk'], reviewed: ['Revu indépendamment', 'info'],
};
export const PRIMITIVES = { A: { kind: 'bus-lane', label: 'Voie réservée bus (proposée)', color: '#e5534b' }, B: { kind: 'signal-timing', label: 'Feux actionnés (scénario)', color: '#f0b45c' }, C: { kind: 'bike-lane', label: 'Voie cyclable protégée (proposée)', color: '#b9a2ff' }, D: { kind: 'demand', label: 'Hypothèse de demande (aucune géométrie)', color: '#93a5bd' } };

export async function loadMobility() {
  const get = async u => { const r = await fetch(u); if (!r.ok) throw Error(`${u} : HTTP ${r.status}`); return r.json(); };
  const [results, manifest, geometry] = await Promise.all(['data/mobility/results.json', 'data/mobility/manifest.json', 'data/mobility/geometry.json'].map(get));
  const traces = {}; return { results, manifest, geometry, trace: async id => (traces[id] ||= await get(`data/mobility/trace-${id}.json`)) };
}

export function createScenarioLayer(map, data) {
  const before = map.getLayer('marker-halo') ? 'marker-halo' : undefined;
  map.addSource('scn-lanes', { type: 'geojson', data: EMPTY }); map.addSource('scn-signals', { type: 'geojson', data: EMPTY }); map.addSource('scn-vehicles', { type: 'geojson', data: EMPTY });
  const Z = (...s) => ['interpolate', ['exponential', 2], ['zoom'], ...s];
  map.addLayer({ id: 'scn-lanes', type: 'line', source: 'scn-lanes', layout: { 'line-cap': 'butt', visibility: 'none' }, paint: { 'line-color': ['get', 'color'], 'line-opacity': 0.8, 'line-width': Z(14, 2, 16, 5, 17, 9, 20, 46, 22, 180) } }, before);
  map.addLayer({ id: 'scn-lanes-label', type: 'symbol', source: 'scn-lanes', minzoom: 16, layout: { 'symbol-placement': 'line', 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'symbol-spacing': 260, visibility: 'none' }, paint: { 'text-color': '#ffffff', 'text-halo-color': ['get', 'color'], 'text-halo-width': 2 } });
  map.addLayer({ id: 'scn-signals', type: 'circle', source: 'scn-signals', layout: { visibility: 'none' }, paint: { 'circle-radius': Z(14, 3, 18, 9), 'circle-color': ['case', ['get', 'actuated'], '#f0b45c', '#1c2a3d'], 'circle-stroke-color': ['case', ['get', 'confirmedByDataSF'], '#ffffff', '#93a5bd'], 'circle-stroke-width': 1.5, 'circle-pitch-alignment': 'map' } });
  map.addLayer({ id: 'scn-vehicles', type: 'circle', source: 'scn-vehicles', maxzoom: 19.5, layout: { visibility: 'none' }, paint: { 'circle-radius': Z(14, ['case', ['get', 'bus'], 3, 1.8], 17, ['case', ['get', 'bus'], 5.5, 3.2], 19, ['case', ['get', 'bus'], 10, 6]), 'circle-color': ['case', ['get', 'bus'], '#62d8f2', '#eef3f8'], 'circle-stroke-color': '#06101d', 'circle-stroke-width': 0.6 } });
  const ids = ['scn-lanes', 'scn-lanes-label', 'scn-signals', 'scn-vehicles'];
  const S = { on: false, scenario: 'S0', trace: null, playing: false, t0: 0, speed: 12, raf: 0, frame: 0, onFrame: null, vehicles: [] };
  function geometryFor(id) {
    const P = PRIMITIVES[id], lanes = P && ['bus-lane', 'bike-lane'].includes(P.kind) ? data.geometry.folsomRightLanes.features.map(f => ({ ...f, properties: { ...f.properties, color: P.color, label: P.label } })) : [];
    map.getSource('scn-lanes').setData({ type: 'FeatureCollection', features: lanes });
    map.getSource('scn-signals').setData({ type: 'FeatureCollection', features: data.geometry.signals.features.map(f => ({ ...f, properties: { ...f.properties, actuated: id === 'B' } })) });
  }
  async function show(id) {
    stop(); S.scenario = id; S.on = true; for (const l of ids) map.setLayoutProperty(l, 'visibility', 'visible');
    geometryFor(id); S.trace = await data.trace(id).catch(() => null); S.frame = 0; render(0);
  }
  function hide() { S.on = false; stop(); for (const l of ids) map.setLayoutProperty(l, 'visibility', 'none'); S.vehicles = []; S.onFrame?.([]); }
  // Interpolated vehicle positions at fractional frame f.
  function at(f) {
    const tr = S.trace; if (!tr) return [];
    const i = Math.max(0, Math.min(tr.frames.length - 1, Math.floor(f))), k = f - i, a = tr.frames[i], b = tr.frames[Math.min(tr.frames.length - 1, i + 1)], nb = new Map(b.map(v => [v[0], v]));
    return a.map(v => { const w = nb.get(v[0]); return w ? [v[0], v[1] + (w[1] - v[1]) * k, v[2] + (w[2] - v[2]) * k, w[3], v[4]] : v; });
  }
  function render(f) {
    S.frame = f; const vs = at(f); S.vehicles = vs;
    map.getSource('scn-vehicles').setData({ type: 'FeatureCollection', features: vs.map(v => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [v[1], v[2]] }, properties: { bus: v[4] === 1 } })) });
    S.onFrame?.(vs, f);
  }
  function play() {
    if (!S.trace) return; stop(); S.playing = true; const n = S.trace.frames.length - 1, start = performance.now() - (S.frame / n) * (n * S.trace.step / S.speed) * 1000;
    const loop = now => { if (!S.playing) return; const f = ((now - start) / 1000) * S.speed / S.trace.step; if (f >= n) { render(n); S.playing = false; S.onEnd?.(); return; } render(f); S.raf = requestAnimationFrame(loop); };
    S.raf = requestAnimationFrame(loop);
  }
  function stop() { S.playing = false; cancelAnimationFrame(S.raf); }
  return { state: S, show, hide, play, stop, render, get duration() { return S.trace ? (S.trace.frames.length - 1) * S.trace.step / S.speed : 0; } };
}

export function panelHTML(data, cur, playing) {
  const R = data.results, M = data.manifest, sc = R.scenarios;
  const row = (k, label, unit) => `<tr><th>${label}</th>${sc.map(x => { const s = x.summary[k], c = x.comparison?.[k]; return `<td class="${x.id === cur ? 'cur' : ''}">${Math.round(s.mean)}${unit} <span class="fine">± ${Math.round(s.ci95 ?? 0)}</span>${c ? `<br><span class="${c.beyondNoise ? (c.delta < 0 ? 'better' : 'worse') : 'fine'}">${c.pct > 0 ? '+' : ''}${c.pct} %${c.beyondNoise ? '' : ' (bruit)'}</span>` : ''}</td>`; }).join('')}</tr>`;
  const x = sc.find(s => s.id === cur), st = STATUS[cur === 'S0' ? 'baseline' : x.status] || [x.status, 'info'];
  return `<header class="pp-head"><p class="le-eyebrow">Simulation · mobilité SoMa · modèle non calibré</p><h2 id="pp-title">${esc(x.label)}</h2>
    <div class="le-row"><span class="le-badge" data-s="${st[1]}">${esc(st[0])}</span></div><p class="pp-lede">${esc(x.change)}</p></header>
    <nav class="scn-tabs" role="tablist" aria-label="Scénarios">${sc.map(s => `<button type="button" role="tab" data-scn="${esc(s.id)}" aria-selected="${s.id === cur}">${s.id === 'S0' ? 'Référence' : esc(s.id)}</button>`).join('')}</nav>
    <div class="le-row"><button type="button" class="primary small" data-scn-play="1">${playing ? 'Pause' : '▶ Rejouer 20 s'}</button><button type="button" class="ghost small" data-scn-off="1">Retirer de la carte</button><span class="fine">Trace enregistrée (graine 1, minutes 10 à 14, lecture ×12) — une relecture, pas une simulation en direct.</span></div>
    <div class="pp-sec"><h3>Pourquoi ce résultat</h3><p>${esc(x.explanation)}</p></div>
    <div class="pp-sec"><h3>Comparer (moyenne sur ${M.seeds.length} graines ± intervalle 95 %)</h3><div class="scn-table"><table class="tbl"><thead><tr><th></th>${sc.map(s => `<th class="${s.id === cur ? 'cur' : ''}">${s.id === 'S0' ? 'Réf.' : esc(s.id)}</th>`).join('')}</tr></thead><tbody>
      ${row('carDelay', 'Retard voiture', ' s')}${row('busTravelTime', 'Temps bus', ' s')}${row('co2kg', 'CO2 estimé', ' kg')}${row('meanHalting', 'Véhicules à l’arrêt', '')}${row('busTrips', 'Bus arrivés (sur 5 partis)', '')}</tbody></table></div>
      <p class="fine">Un écart « (bruit) » est plus petit que la variation entre graines : il ne compte pas. Le temps bus ne compte que les bus arrivés : quand des bus restent bloqués, il sous-estime le problème.</p></div>
    <div class="pp-unc"><b>Ce que ce modèle ne sait pas</b>${M.synthetic.map(t => `<p>${esc(t)}</p>`).join('')}<p><b>${esc(M.calibration)}</b></p></div>
    <div class="pp-sec"><h3>Recherche de scénarios</h3><p class="fine">${R.search.generated} configurations générées · ${R.search.rejected.length} rejetée(s) par contrainte (${esc(R.search.rejected.map(r => r.reason).join(' '))}) · ${R.search.simulated.length} simulées (3 graines) · ${R.search.simulated.filter(s => s.pareto).length} sur le front de Pareto · ${Math.round(M.computeSeconds + (M.searchComputeSeconds || 0))} s de calcul SUMO enregistré. Aucun modèle de substitution n’est utilisé.</p></div>
    <div class="pp-sec"><h3>Verdict</h3><p>${esc(R.verdict)}</p></div>
    <details class="pp-adv"><summary>Reproduire</summary><p class="fine">${esc(M.engine)} · réseau ${M.network.edges} tronçons · ${M.network.signalsInModel} feux (${M.network.signalsMatchedWithin35m} confirmés par DataSF)</p><p><code>${esc(M.reproduce)}</code></p></details>`;
}

// Street level: the same recorded vehicles as instanced boxes (cars 4.4 m, buses 12 m) in the three.js scene.
// SUMO angles are compass degrees (0 = north, clockwise); local frame: x east, −z north.
export function createTraffic3D(scene, toLocal, max = 160) {
  const { THREE, world } = scene, group = new THREE.Group(); group.name = 'core-traffic'; world.add(group);
  const mk = (l, w, h, color) => { const g = new THREE.BoxGeometry(w, h, l); g.translate(0, h / 2, 0); const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.2 }), max); m.count = 0; m.frustumCulled = false; group.add(m); return m; };
  const cars = mk(4.4, 1.8, 1.5, '#d9e2ec'), buses = mk(12, 2.6, 3.1, '#3fb8d6'), o = new THREE.Object3D();
  function update(vs) {
    let c = 0, b = 0;
    for (const v of vs) { const [x, z] = toLocal([v[1], v[2]]); if (Math.hypot(x, z) > 600) continue; const bus = v[4] === 1, m = bus ? buses : cars, i = bus ? b++ : c++; if (i >= max) continue;
      o.position.set(x, 0, z); o.rotation.set(0, -v[3] * Math.PI / 180, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
    cars.count = Math.min(c, max); buses.count = Math.min(b, max); cars.instanceMatrix.needsUpdate = buses.instanceMatrix.needsUpdate = true;
  }
  return { group, update, dispose() { world.remove(group); for (const m of [cars, buses]) { m.geometry.dispose(); m.material.dispose(); } } };
}
