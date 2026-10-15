// CORE — agent motion and population rendering (Phase 8).
// Every registered profile is discoverable. Phase 9: agents stay at their virtual post unless a source gives them a
// reason to move — no random wandering. Motion sources, always labelled:
//   • recorded activity — trips driven by recorded autonomous missions (src/civ-activity.js): to the cited evidence
//     location and back, on the validated pedestrian network (OSM walkways that cross no building footprint);
//   • replay — positions driven by agents-world.js from a recorded mission log;
//   • live — on the founder's machine only, agents of tasks the local supervisor is actually running
//     (.core-local/live.json, never fetched on the public site).
// Rendering by zoom: < 13.5 zone aggregates; 13.5–15.8 WebGL figures; ≥ 15.8 articulated DOM avatars for agents
// in view (capped). The loop pauses when the tab is hidden; reduced motion freezes positions.
(function () {
  'use strict';
  const G = globalThis, POP = () => G.CORE_POPULATION;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COLORS = { executing: '#ffd166', queued: '#f0b72f', recorded: '#5cc8ff', available: '#9fe3ff', 'available-local': '#b49cff', coordination: '#9aa8b8', unavailable: '#61707f' };
  const ZOOM_ZONES = 13.5, ZOOM_DOM = 15.8, SPEED = 4, WALK = 1.4; // display speed ×4, disclosed
  const lowEnd = () => innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const S = { map: null, ready: false, agents: new Map(), filter: 'all', shown: new Set(), dom: new Map(), selected: null, follow: null, prevCam: null, raf: 0, last: 0, lastGeo: 0, live: null, liveTimer: 0, dimOthers: null, frames: 0 };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- icons (canvas-drawn holographic figures, two walking frames per status colour) ----------
  function figure(color, frame) {
    const c = document.createElement('canvas'); c.width = 36; c.height = 56; const g = c.getContext('2d');
    const halo = g.createRadialGradient(18, 50, 1, 18, 50, 14); halo.addColorStop(0, color + '88'); halo.addColorStop(1, color + '00'); g.fillStyle = halo; g.fillRect(0, 36, 36, 20);
    g.strokeStyle = color; g.fillStyle = color + '55'; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.arc(18, 9, 5, 0, 2 * Math.PI); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(12, 17); g.quadraticCurveTo(18, 15, 24, 17); g.lineTo(22.5, 33); g.quadraticCurveTo(18, 35, 13.5, 33); g.closePath(); g.fill(); g.stroke();
    const s = frame ? 5 : 1.5;
    g.beginPath(); g.moveTo(12, 18); g.lineTo(12 - s * 0.6, 31); g.moveTo(24, 18); g.lineTo(24 + s * 0.6, 31); g.moveTo(15.5, 33); g.lineTo(15.5 - s, 50); g.moveTo(20.5, 33); g.lineTo(20.5 + s, 50); g.stroke();
    return g.getImageData(0, 0, 36, 56);
  }
  function addIcons() { for (const [st, col] of Object.entries(COLORS)) for (const f of [0, 1]) { const id = `core-agent-${st}-${f}`; if (!S.map.hasImage(id)) S.map.addImage(id, figure(col, f), { pixelRatio: 2 }); } }

  // ---------- layers ----------
  function layers() {
    const map = S.map, empty = { type: 'FeatureCollection', features: [] };
    if (map.getSource('pop-agents')) return;
    map.addSource('pop-agents', { type: 'geojson', data: empty });
    map.addSource('pop-zones', { type: 'geojson', data: empty });
    map.addLayer({ id: 'pop-zone-area', type: 'circle', source: 'pop-zones', minzoom: 11, maxzoom: ZOOM_ZONES, paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'n'], 0, 10, 10, 26], 'circle-color': 'rgba(92,200,255,0.16)', 'circle-stroke-color': '#5cc8ff', 'circle-stroke-width': 1, 'circle-stroke-opacity': 0.8 } });
    map.addLayer({ id: 'pop-zone-label', type: 'symbol', source: 'pop-zones', minzoom: 11, maxzoom: ZOOM_ZONES, layout: { 'text-field': ['concat', ['to-string', ['get', 'n']], '\n', ['get', 'short']], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-allow-overlap': true }, paint: { 'text-color': '#dff4ff', 'text-halo-color': '#02050b', 'text-halo-width': 1.4 } });
    map.addLayer({ id: 'pop-zone-name', type: 'symbol', source: 'pop-zones', minzoom: ZOOM_ZONES, maxzoom: 15.6, layout: { 'text-field': ['concat', 'Zone virtuelle · ', ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 10.5, 'text-offset': [0, -3], 'text-optional': true }, paint: { 'text-color': '#8fc9e8', 'text-halo-color': '#02050b', 'text-halo-width': 1.2, 'text-opacity': 0.75 } });
    map.addLayer({ id: 'pop-agent-sel', type: 'circle', source: 'pop-agents', minzoom: ZOOM_ZONES, filter: ['==', ['get', 'sel'], 1], paint: { 'circle-radius': 14, 'circle-color': 'rgba(240,183,47,0.18)', 'circle-stroke-color': '#f0b72f', 'circle-stroke-width': 2, 'circle-pitch-alignment': 'map' } });
    map.addLayer({ id: 'pop-agent-icon', type: 'symbol', source: 'pop-agents', minzoom: ZOOM_ZONES, layout: { 'icon-image': ['concat', 'core-agent-', ['get', 'st'], '-', ['to-string', ['get', 'f']]], 'icon-size': ['interpolate', ['linear'], ['zoom'], 13.5, 0.55, 16, 1, 18, 1.5], 'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      'text-field': ['step', ['zoom'], '', 15, ['get', 'code']], 'text-font': ['Noto Sans Regular'], 'text-size': 9.5, 'text-anchor': 'top', 'text-offset': [0, 0.3], 'text-optional': true }, paint: { 'icon-opacity': ['case', ['==', ['get', 'dim'], 1], 0.25, 1], 'text-color': '#bfe9ff', 'text-halo-color': '#02050b', 'text-halo-width': 1.2 } });
    map.on('click', 'pop-agent-icon', e => { const f = e.features && e.features[0]; if (f) select(f.properties.id); });
    map.on('click', 'pop-zone-area', e => { const f = e.features && e.features[0]; if (f) map.easeTo({ center: f.geometry.coordinates, zoom: 15.2, duration: reduced() ? 0 : 1200 }); });
    for (const l of ['pop-agent-icon', 'pop-zone-area']) { map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer'; }); map.on('mouseleave', l, () => { map.getCanvas().style.cursor = ''; }); }
  }

  // ---------- population ----------
  async function ensure() {
    if (S.ready) return true; if (S.loading) return S.loading;
    S.loading = (async () => {
      const P = G.CORE_PLATFORM.state; if (!P.registry) return false; if (P.opsReady) await P.opsReady;
      // Phase 10: one validated pedestrian network and one set of virtual zones per operational city. Each agent has
      // its post in its own city (global roles keep their San Francisco posts) and only ever walks on that city's network.
      const CITIES = G.CORE_CITIES ? G.CORE_CITIES.operational() : [{ id: 'san-francisco', studyArea: { walkNetwork: 'data/osm/walk-network.json' }, motion: { centre: [-122.4120, 37.7700], radiusM: 2300 } }];
      S.nets = {}; S.zones = [];
      for (const c of CITIES) { const w = await (await fetch(c.studyArea.walkNetwork)).json(), net = POP().network(w), zs = POP().zoneLayout(net, c.motion.centre, c.motion.radiusM).map(z => ({ ...z, city: c.id, key: `${c.id}:${z.id}` })); S.nets[c.id] = { walk: w, net, zones: zs }; S.zones.push(...zs); }
      S.walk = S.nets['san-francisco'].walk; S.net = S.nets['san-francisco'].net; // corridor replays (agents-world.js) stay in San Francisco
      S.ops = P.operations || null; S.reg = P.registry; S.facts = POP().facts({ cogIndex: P.cogIndex, detIndex: P.recorded, operations: P.operations, civ: P.civIndex && P.civIndex.missions });
      // Posts: one distinct, valid pedestrian node per agent inside its virtual zone (never inside a building).
      const used = new Set();
      for (const a of P.registry.agents) {
        const city = S.nets[a.scope.city] ? a.scope.city : 'san-francisco', net = S.nets[city].net, zid = POP().zoneOf(a), zone = S.nets[city].zones.find(z => z.id === zid), rnd = POP().prng(a.code); let node;
        for (let k = 0; k < 50; k++) { node = zone.nodes[Math.floor(rnd() * zone.nodes.length)]; if (!used.has(node)) break; } used.add(node);
        S.agents.set(a.id, { agent: a, city, net, zone, rnd, post: node, pos: net.nodes[node], node, path: null, along: 0, mode: 'post', state: 'idle', note: '', visible: false, st: POP().status(a, S.facts), f: 0 });
      }
      addIcons(); layers(); setFilter(S.filter); S.ready = true; loop(); pollLive();
      return true;
    })();
    return S.loading;
  }
  const statusOf = a => (S.agents.get(a.id) || {}).st || POP().status(a, S.facts);
  function setFilter(f) {
    S.filter = f; const list = POP().filter(S.reg, statusOf, f); S.shown = new Set(list.map(a => a.id));
    for (const A of S.agents.values()) A.visible = S.shown.has(A.agent.id) || A.mode !== 'post';
    zonesData(); geo(true); domSync(true);
    document.dispatchEvent(new CustomEvent('core:population', { detail: { filter: f, shown: S.shown.size } }));
    return S.shown.size;
  }
  function refreshStatus() { const P = G.CORE_PLATFORM.state; S.facts = POP().facts({ cogIndex: P.cogIndex, detIndex: P.recorded, operations: P.operations, civ: P.civIndex && P.civIndex.missions, live: S.live, sessionRunning: P.missions.flatMap(m => m.tasks.filter(t => t.state === 'running').map(t => t.agent)) }); for (const A of S.agents.values()) A.st = POP().status(A.agent, S.facts); S.dirty = true; }
  function zonesData() {
    const short = { governance: 'Gouvernance', mobility: 'Mobilité', infrastructure: 'Infrastructures', environment: 'Environnement', energy: 'Énergie', 'public-safety': 'Risques', accessibility: 'Accessibilité', planning: 'Urbanisme', 'public-health': 'Santé', water: 'Eau', climate: 'Climat', verification: 'Vérification', review: 'Revue' };
    S.map.getSource('pop-zones').setData({ type: 'FeatureCollection', features: S.zones.map(z => ({ type: 'Feature', geometry: { type: 'Point', coordinates: z.anchor }, properties: { id: z.id, city: z.city, name: z.name, short: short[z.id], n: [...S.agents.values()].filter(A => A.visible && A.zone === z).length } })).filter(f => f.properties.n > 0) });
  }

  // ---------- motion: agents move only for a reason (recorded activity, replay, live task, return to post) ----------
  // go(): walk on the validated pedestrian network to a target (snapped to the nearest walkway node, never a straight
  // line through a block), then call onArrive. Display speed: ×SPEED walking pace, disclosed in the interface.
  function go(id, target, { purpose = '', state = 'walking', mode = 'travel', onArrive = null, durationMs = null } = {}) {
    const A = S.agents.get(id); if (!A) return false;
    const net = A.net, from = net.nearest(A.pos).i, to = net.nearest(target).i, sp = net.shortest(from, to);
    if (!sp) { A.note = 'aucun itinéraire piéton cartographié : déplacement non animé'; return false; }
    const coords = sp.nodes.map(i => net.nodes[i]); let acc = 0; const cum = coords.map((c, i) => (acc += i ? POP().dist(coords[i - 1], c) : 0));
    // Optional fixed display duration (replays of recorded activity): the acceleration over a 1.4 m/s walk is stated.
    A.speedMps = durationMs ? Math.max(WALK, acc / (durationMs / 1000)) : WALK * SPEED;
    const factor = Math.round(A.speedMps / WALK);
    A.path = { coords, cum, len: acc }; A.along = 0; A.target = to; A.mode = mode; A.state = coords.length > 1 ? state : 'idle'; A.note = `${purpose}${coords.length > 1 ? ` · ${Math.round(acc)} m sur les trottoirs validés, affichage accéléré ×${factor}` : ''}`; A.onArrive = onArrive; A.visible = true; A.departed = performance.now();
    if (coords.length < 2) { A.path = null; if (onArrive) onArrive(A); }
    return true;
  }
  function advance(A, dt) {
    if (!A.path) return;
    if (reduced()) A.along = A.path.len; else A.along += (A.speedMps || WALK * SPEED) * dt / 1000;
    const p = A.path;
    if (A.along >= p.len) { A.pos = p.coords[p.coords.length - 1]; A.node = A.target; A.path = null; A.state = 'idle'; A.arrived = performance.now(); const cb = A.onArrive; A.onArrive = null; if (cb) cb(A); return; }
    let i = 1; while (i < p.cum.length - 1 && p.cum[i] < A.along) i++;
    const seg = p.cum[i] - p.cum[i - 1] || 1, t = (A.along - p.cum[i - 1]) / seg, a = p.coords[i - 1], b = p.coords[i];
    A.pos = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; A.dir = [b[0] - a[0], b[1] - a[1]];
    A.f = Math.floor(A.along / 0.9) % 2;
  }
  function toPost(id, note = 'retour au poste virtuel', durationMs = null) { const A = S.agents.get(id); if (!A) return; go(id, A.net.nodes[A.post], { purpose: note, mode: 'travel', durationMs, onArrive: B => { B.mode = 'post'; B.state = 'idle'; B.note = ''; } }); }
  // Occlusion (exact geometry): an agent is hidden when the 3D segment from the camera to its head (1.7 m) passes
  // through a building prism (rendered OSM footprint × render_height). MapLibre's own query only covers footprints.
  const RAD = Math.PI / 180;
  function buildingIndex() {
    const m = S.map, list = [], grid = new Map(), CELL = 0.001;
    let feats = []; try { feats = m.querySourceFeatures('omt', { sourceLayer: 'building' }); } catch (_) { /* style without OSM buildings */ }
    for (const f of feats) { const h = +f.properties.render_height || 0; if (h < 3) continue;
      for (const poly of f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : []) { const r = poly[0]; const xs = r.map(p => p[0]), ys = r.map(p => p[1]), b = { r, h, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }, k = list.push(b) - 1;
        for (let x = Math.floor(b.bb[0] / CELL); x <= Math.floor(b.bb[2] / CELL); x++) for (let y = Math.floor(b.bb[1] / CELL); y <= Math.floor(b.bb[3] / CELL); y++) { const key = `${x},${y}`; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(k); } } }
    S.bld = { list, grid, CELL };
  }
  const segX = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], s2 = [d[0] - c[0], d[1] - c[1]], den = r[0] * s2[1] - r[1] * s2[0]; if (!den) return null; const t = ((c[0] - a[0]) * s2[1] - (c[1] - a[1]) * s2[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den; return t > 0 && t < 1 && u >= 0 && u <= 1 ? t : null; };
  function occludedAt(cam, alt, P) {
    const { list, grid, CELL } = S.bld, seen = new Set(), k = Math.cos(P[1] * RAD);
    const x0 = Math.min(cam[0], P[0]), x1 = Math.max(cam[0], P[0]), y0 = Math.min(cam[1], P[1]), y1 = Math.max(cam[1], P[1]);
    if ((x1 - x0) / CELL * (y1 - y0) / CELL > 4000) return false; // camera too far: skip (aggregates or figures at that zoom)
    for (let x = Math.floor(x0 / CELL); x <= Math.floor(x1 / CELL); x++) for (let y = Math.floor(y0 / CELL); y <= Math.floor(y1 / CELL); y++) for (const i of grid.get(`${x},${y}`) || []) {
      if (seen.has(i)) continue; seen.add(i); const b = list[i]; if (b.bb[2] < x0 || b.bb[0] > x1 || b.bb[3] < y0 || b.bb[1] > y1) continue;
      for (let e = 1; e < b.r.length; e++) { const t = segX(cam, P, b.r[e - 1], b.r[e]); if (t === null) continue; const rayH = alt + (1.7 - alt) * t; if (b.h >= rayH) return true; }
    }
    void k; return false;
  }
  // MapLibre 6 removed map.transform: derive the camera ground position and altitude (m) from public state
  // (centre, zoom, pitch, bearing, vertical field of view). Terrain elevation is ignored, as for the illustrative occlusion.
  function camera() {
    const m = S.map, c = m.getCenter(), pitch = m.getPitch(), mpp = 40075016.686 * Math.cos(c.lat * RAD) / (512 * 2 ** m.getZoom());
    const fov = (m.getVerticalFieldOfView ? m.getVerticalFieldOfView() : 36.87) * RAD, dpx = 0.5 / Math.tan(fov / 2) * m.getCanvas().clientHeight;
    const back = dpx * mpp * Math.sin(pitch * RAD), br = m.getBearing() * RAD;
    return { cam: [c.lng - back * Math.sin(br) / (111320 * Math.cos(c.lat * RAD)), c.lat - back * Math.cos(br) / 110540], alt: dpx * mpp * Math.cos(pitch * RAD) };
  }
  function occlusion() {
    const m = S.map, pitch = m.getPitch();
    if (pitch < 20 || m.getZoom() < ZOOM_ZONES) { for (const A of S.agents.values()) { if (A.occ) S.dirty = true; A.occ = false; } return; }
    const t = performance.now(); if (!S.bld || S.bldAt !== S.moveSeq || (!S.bld.list.length && t - (S.bldTime || 0) > 1000)) { buildingIndex(); S.bldAt = S.moveSeq; S.bldTime = t; }
    const { cam, alt } = camera();
    const b = m.getBounds();
    for (const A of S.agents.values()) { const o = A.visible && A.pos[0] > b.getWest() && A.pos[0] < b.getEast() && A.pos[1] > b.getSouth() && A.pos[1] < b.getNorth() ? occludedAt(cam, alt, A.pos) : false; if (o !== A.occ) S.dirty = true; A.occ = o; }
  }
  function loop() {
    cancelAnimationFrame(S.raf);
    const tick = now => {
      const dt = Math.min(100, now - (S.last || now)); S.last = now; S.frames++;
      const z = S.map.getZoom();
      if (z >= ZOOM_ZONES || S.follow) for (const A of S.agents.values()) advance(A, dt); else for (const A of S.agents.values()) if (A.path) { A.along = A.path.len; advance(A, 0); }
      if (now - (S.lastOcc || 0) > 500) { occlusion(); S.lastOcc = now; }
      // Only push the source when something changed (moving agents or a flagged change): an idle map stops rendering.
      if (z >= ZOOM_ZONES && (S.dirty || [...S.agents.values()].some(a => a.path)) && now - S.lastGeo > (z >= ZOOM_DOM ? 250 : 110)) { geo(); S.lastGeo = now; S.dirty = false; }
      if (z >= ZOOM_DOM) domFrame(); else if (S.dom.size) domSync(true);
      followFrame();
      if (!document.hidden) S.raf = requestAnimationFrame(tick);
    };
    S.raf = requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.ready) { S.last = 0; loop(); } });

  function geo() {
    const src = S.map.getSource('pop-agents'); if (!src) return;
    const feats = []; for (const A of S.agents.values()) { if (!A.visible || S.dom.has(A.agent.id)) continue; feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: A.pos }, properties: { id: A.agent.id, code: A.agent.code, st: A.st, f: A.state === 'walking' ? A.f : 0, sel: A.agent.id === S.selected ? 1 : 0, dim: (S.dimOthers && !S.dimOthers.has(A.agent.id)) || A.occ ? 1 : 0 } }); }
    src.setData({ type: 'FeatureCollection', features: feats });
  }

  // ---------- DOM avatars (near zoom, in view, capped) ----------
  const AVATAR = `<svg viewBox="-18 -54 36 64" aria-hidden="true"><ellipse class="halo" cx="0" cy="6" rx="13" ry="4"/><g class="fig"><g class="body"><circle class="head" cx="0" cy="-42" r="5.2"/><rect class="neck" x="-1.3" y="-37.5" width="2.6" height="3" rx="1"/>
    <path class="torso" d="M-7 -34 Q0 -36.5 7 -34 L5.2 -15 Q0 -13 -5.2 -15 Z"/><path class="core" d="M0 -31 L0 -19"/>
    <g class="arm l"><line x1="-7" y1="-33" x2="-9.5" y2="-19"/><circle cx="-9.5" cy="-18" r="1.4"/></g><g class="arm r"><line x1="7" y1="-33" x2="9.5" y2="-19"/><circle cx="9.5" cy="-18" r="1.4"/></g>
    <g class="leg l"><line x1="-2.6" y1="-15" x2="-3.4" y2="3"/><line class="foot" x1="-3.4" y1="3.5" x2="-0.6" y2="3.5"/></g><g class="leg r"><line x1="2.6" y1="-15" x2="3.4" y2="3"/><line class="foot" x1="3.4" y1="3.5" x2="6.2" y2="3.5"/></g></g></g>
    <circle class="scan" cx="0" cy="6" r="4"/><line class="beam" x1="0" y1="-50" x2="0" y2="-66"/></svg>`;
  function domEl(A) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'agent-av'; el.dataset.agent = A.agent.id;
    el.style.setProperty('--c', COLORS[A.st] || '#8fe0ff'); el.setAttribute('aria-label', `${A.agent.code} — ${A.agent.role}`);
    el.innerHTML = AVATAR + `<span class="tag">${esc(A.agent.code)}</span>`;
    el.addEventListener('click', ev => { ev.stopPropagation(); select(A.agent.id); });
    return { el, marker: new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(A.pos).addTo(S.map) };
  }
  function domSync(clear) {
    const map = S.map, z = map.getZoom();
    if (clear || z < ZOOM_DOM) { for (const [id, d] of S.dom) { d.marker.remove(); S.dom.delete(id); } if (clear && z >= ZOOM_DOM) S.domAt = 0; else return; }
    const b = map.getBounds(), pad = 0.0006, inView = c => c[0] > b.getWest() - pad && c[0] < b.getEast() + pad && c[1] > b.getSouth() - pad && c[1] < b.getNorth() + pad;
    const cap = lowEnd() ? 20 : 40, centre = map.getCenter();
    const want = [...S.agents.values()].filter(A => A.visible && inView(A.pos)).sort((x, y) => (y.agent.id === S.selected) - (x.agent.id === S.selected) || (y.mode !== 'post') - (x.mode !== 'post') || POP().dist(x.pos, [centre.lng, centre.lat]) - POP().dist(y.pos, [centre.lng, centre.lat])).slice(0, cap);
    const ids = new Set(want.map(A => A.agent.id));
    for (const [id, d] of S.dom) if (!ids.has(id)) { d.marker.remove(); S.dom.delete(id); }
    for (const A of want) if (!S.dom.has(A.agent.id)) S.dom.set(A.agent.id, domEl(A));
    S.capped = [...S.agents.values()].filter(A => A.visible && inView(A.pos)).length > cap;
    geo();
  }
  function domFrame() {
    const now = performance.now(); if (!S.domAt || now - S.domAt > 600) { domSync(); S.domAt = now; }
    for (const [id, d] of S.dom) {
      const A = S.agents.get(id); d.marker.setLngLat(A.pos);
      const el = d.el; if (el.dataset.state !== A.state) el.dataset.state = A.state;
      if (A.dir) { const left = A.dir[0] < 0; if (left !== (el.dataset.face === 'l')) el.dataset.face = left ? 'l' : 'r'; }
      el.dataset.mode = A.mode; el.classList.toggle('selected', id === S.selected); el.classList.toggle('dim', !!(S.dimOthers && !S.dimOthers.has(id)));
      el.classList.toggle('arrive', !!A.arrived && now - A.arrived < 600); el.classList.toggle('occluded', !!A.occ); el.style.setProperty('--c', COLORS[A.st] || '#8fe0ff');
      el.title = `${A.agent.code} · ${MODE_FR[A.mode]}${A.note ? ` — ${A.note}` : ''}`;
    }
  }
  const MODE_FR = { post: 'au poste virtuel — aucune activité en cours (position de rattachement illustrative)', travel: 'déplacement motivé par une mission enregistrée (relecture)', work: 'travail enregistré sur le lieu de la preuve (relecture)', coordinate: 'coordination enregistrée (relecture)', replay: 'relecture d’une mission enregistrée', live: 'exécution locale réelle' };

  // ---------- replay / live drivers ----------
  function drive(id, { pos, state, note, dir }) { const A = S.agents.get(id); if (!A) return; S.dirty = true; A.path = null; A.mode = A.mode === 'live' ? 'live' : 'replay'; if (dir) A.dir = dir; else if (A.pos && pos && (A.pos[0] !== pos[0] || A.pos[1] !== pos[1])) A.dir = [pos[0] - A.pos[0], pos[1] - A.pos[1]]; A.pos = pos; A.state = state; A.note = note || ''; A.visible = true; A.f = Math.floor(performance.now() / 280) % 2; }
  function release(id) { const A = S.agents.get(id); if (!A || A.mode === 'post') return; const n = A.net.nearest(A.pos); A.node = n.i; A.pos = A.net.nodes[n.i]; A.visible = S.shown.has(id); toPost(id); }
  function dim(ids) { S.dimOthers = ids ? new Set(ids) : null; S.dirty = true; geo(); }
  // Live local execution: poll the supervisor status written on this machine (localhost only).
  async function pollLive() {
    clearTimeout(S.liveTimer); if (!G.CORE_PLATFORM.state.local) return;
    try { const r = await fetch('.core-local/live.json', { cache: 'no-store' }); S.live = r.ok ? await r.json() : null; } catch (_) { S.live = null; }
    const running = S.live && !S.live.stopped && Date.now() - Date.parse(S.live.updated) < 120000 ? S.live.running || [] : [];
    const ids = new Set(running.flatMap(r => r.agents));
    for (const A of S.agents.values()) if (A.mode === 'live' && !ids.has(A.agent.id)) { A.mode = 'replay'; release(A.agent.id); }
    for (const r of running) { const f = G.CORE_SF_VIEW.state.data && G.CORE_SF_VIEW.state.data.corridor.features.find(x => String(x.properties.cnn) === String(r.segment)); if (!f) continue;
      const c = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates.flat() : f.geometry.coordinates, mid = c[Math.floor(c.length / 2)];
      r.agents.forEach((id, i) => { const A = S.agents.get(id); if (!A) return; A.mode = 'live'; A.pos = [mid[0] + 0.00005 * Math.cos(i * 2.4), mid[1] + 0.00004 * Math.sin(i * 2.4)]; A.state = 'investigating'; A.note = `${r.task} : ${r.title}`; A.visible = true; }); }
    refreshStatus(); S.liveTimer = setTimeout(pollLive, 4000);
  }

  // ---------- selection and follow ----------
  function select(id, { open = true } = {}) {
    S.selected = id; geo(); domSync();
    if (open && G.CORE_AGENT_PROFILE) G.CORE_AGENT_PROFILE.open(id);
  }
  function follow(id) {
    const A = S.agents.get(id); if (!A) return false;
    if (S.follow === id) { unfollow(true); return false; }
    if (!S.follow) { const m = S.map; S.prevCam = { center: m.getCenter(), zoom: m.getZoom(), pitch: m.getPitch(), bearing: m.getBearing() }; }
    S.follow = id; A.visible = true; S.map.easeTo({ center: A.pos, zoom: Math.max(16.6, Math.min(17.4, S.map.getZoom())), pitch: 55, duration: reduced() ? 0 : 1100 });
    document.body.classList.add('following'); return true;
  }
  function unfollow(back) { S.follow = null; document.body.classList.remove('following'); if (back && S.prevCam) S.map.easeTo({ ...S.prevCam, duration: reduced() ? 0 : 1100 }); S.prevCam = null; }
  function followFrame() {
    if (!S.follow || S.map.isMoving()) return; const A = S.agents.get(S.follow); if (!A) return;
    const c = S.map.getCenter(), k = reduced() ? 1 : 0.12; S.map.jumpTo({ center: [c.lng + (A.pos[0] - c.lng) * k, c.lat + (A.pos[1] - c.lat) * k] });
    if (S.map.getPitch() > 60) S.map.jumpTo({ pitch: 60 }); // keep the agent visible over low buildings, no ground-level clipping
  }
  function init({ map }) {
    S.map = map;
    for (const ev of ['dragstart', 'wheel']) map.on(ev, e => { if (e.originalEvent && S.follow) unfollow(false); });
    map.on('moveend', () => { S.moveSeq = (S.moveSeq || 0) + 1; if (S.ready) domSync(); });
    map.on('idle', () => { S.moveSeq = (S.moveSeq || 0) + 1; }); // tiles finished loading: rebuild the building index
  }
  function counts() { const c = {}; for (const A of S.agents.values()) c[A.st] = (c[A.st] || 0) + 1; return { total: S.agents.size, shown: S.shown.size, byStatus: c, dom: S.dom.size, live: [...S.agents.values()].filter(A => A.mode === 'live').length, replay: [...S.agents.values()].filter(A => A.mode === 'replay').length }; }
  G.CORE_MOTION = { init, ensure, go, toPost, occlusion, occludedAt, camera, setFilter, select, follow, unfollow, drive, release, dim, refreshStatus, counts, pollLive, state: S, COLORS, MODE_FR, ZOOM_DOM, ZOOM_ZONES, SPEED };
})();
