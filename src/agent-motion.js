// CORE — agent motion and population rendering (Phase 8).
// Every registered profile is discoverable. Three motion sources, always labelled:
//   • illustrative — seeded walks on mapped OSM pedestrian ways inside the agent's VIRTUAL working zone
//     (visualisation only: no research, no visit, no work is implied);
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
      const walk = await (await fetch('data/osm/walk-network.json')).json();
      S.walk = walk; S.net = POP().network(walk); S.zones = POP().zoneLayout(S.net, [-122.4065, 37.7795]);
      S.ops = P.operations || null; S.reg = P.registry; S.facts = POP().facts({ cogIndex: P.cogIndex, detIndex: P.recorded, operations: P.operations });
      for (const a of P.registry.agents) {
        const zid = POP().zoneOf(a), zone = S.zones.find(z => z.id === zid), rnd = POP().prng(a.code), node = zone.nodes[Math.floor(rnd() * zone.nodes.length)];
        S.agents.set(a.id, { agent: a, zone, rnd, pos: S.net.nodes[node], node, path: null, along: 0, pause: rnd() * 6000, mode: 'illustrative', state: 'idle', note: '', heading: 1, visible: false, st: POP().status(a, S.facts), f: 0 });
      }
      addIcons(); layers(); setFilter(S.filter); S.ready = true; loop(); pollLive();
      return true;
    })();
    return S.loading;
  }
  const statusOf = a => (S.agents.get(a.id) || {}).st || POP().status(a, S.facts);
  function setFilter(f) {
    S.filter = f; const list = POP().filter(S.reg, statusOf, f); S.shown = new Set(list.map(a => a.id));
    for (const A of S.agents.values()) A.visible = S.shown.has(A.agent.id) || A.mode !== 'illustrative';
    zonesData(); geo(true); domSync(true);
    document.dispatchEvent(new CustomEvent('core:population', { detail: { filter: f, shown: S.shown.size } }));
    return S.shown.size;
  }
  function refreshStatus() { const P = G.CORE_PLATFORM.state; S.facts = POP().facts({ cogIndex: P.cogIndex, detIndex: P.recorded, operations: P.operations, live: S.live, sessionRunning: P.missions.flatMap(m => m.tasks.filter(t => t.state === 'running').map(t => t.agent)) }); for (const A of S.agents.values()) A.st = POP().status(A.agent, S.facts); }
  function zonesData() {
    const short = { governance: 'Gouvernance', mobility: 'Mobilité', infrastructure: 'Infrastructures', environment: 'Environnement', energy: 'Énergie', 'public-safety': 'Risques', accessibility: 'Accessibilité', planning: 'Urbanisme', 'public-health': 'Santé', water: 'Eau', climate: 'Climat', verification: 'Vérification', review: 'Revue' };
    S.map.getSource('pop-zones').setData({ type: 'FeatureCollection', features: S.zones.map(z => ({ type: 'Feature', geometry: { type: 'Point', coordinates: z.anchor }, properties: { id: z.id, name: z.name, short: short[z.id], n: [...S.agents.values()].filter(A => A.visible && A.zone.id === z.id).length } })) });
  }

  // ---------- motion ----------
  function nextLeg(A) {
    const z = A.zone, target = z.nodes[Math.floor(A.rnd() * z.nodes.length)];
    const sp = S.net.shortest(A.node, target); if (!sp || sp.nodes.length < 2) { A.pause = 3000; return; }
    const coords = sp.nodes.map(i => S.net.nodes[i]); A.path = { coords, cum: coords.map((c, i) => i ? 0 : 0) }; let acc = 0; A.path.cum = coords.map((c, i) => (acc += i ? POP().dist(coords[i - 1], c) : 0));
    A.path.len = acc; A.along = 0; A.target = target; A.state = 'walking'; A.departed = performance.now();
  }
  function advance(A, dt) {
    if (A.mode !== 'illustrative' || reduced()) return;
    if (A.pause > 0) { A.pause -= dt; if (A.pause <= 0) nextLeg(A); return; }
    if (!A.path) { nextLeg(A); return; }
    A.along += WALK * SPEED * dt / 1000; const p = A.path;
    if (A.along >= p.len) { A.pos = p.coords[p.coords.length - 1]; A.node = A.target; A.path = null; A.state = 'idle'; A.pause = 2500 + A.rnd() * 6000; A.arrived = performance.now(); return; }
    let i = 1; while (i < p.cum.length - 1 && p.cum[i] < A.along) i++;
    const seg = p.cum[i] - p.cum[i - 1] || 1, t = (A.along - p.cum[i - 1]) / seg, a = p.coords[i - 1], b = p.coords[i];
    A.pos = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; A.dir = [b[0] - a[0], b[1] - a[1]];
    A.f = Math.floor(A.along / 0.9) % 2;
  }
  function loop() {
    cancelAnimationFrame(S.raf);
    const tick = now => {
      const dt = Math.min(100, now - (S.last || now)); S.last = now; S.frames++;
      const z = S.map.getZoom();
      if (z >= ZOOM_ZONES || S.follow) for (const A of S.agents.values()) if (A.visible) advance(A, dt);
      if (z >= ZOOM_ZONES && now - S.lastGeo > (z >= ZOOM_DOM ? 250 : 110)) { geo(); S.lastGeo = now; }
      if (z >= ZOOM_DOM) domFrame(); else if (S.dom.size) domSync(true);
      followFrame();
      if (!document.hidden) S.raf = requestAnimationFrame(tick);
    };
    S.raf = requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.ready) { S.last = 0; loop(); } });

  function geo() {
    const src = S.map.getSource('pop-agents'); if (!src) return;
    const feats = []; for (const A of S.agents.values()) { if (!A.visible || S.dom.has(A.agent.id)) continue; feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: A.pos }, properties: { id: A.agent.id, code: A.agent.code, st: A.st, f: A.state === 'walking' ? A.f : 0, sel: A.agent.id === S.selected ? 1 : 0, dim: S.dimOthers && !S.dimOthers.has(A.agent.id) ? 1 : 0 } }); }
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
    const want = [...S.agents.values()].filter(A => A.visible && inView(A.pos)).sort((x, y) => (y.agent.id === S.selected) - (x.agent.id === S.selected) || (y.mode !== 'illustrative') - (x.mode !== 'illustrative') || POP().dist(x.pos, [centre.lng, centre.lat]) - POP().dist(y.pos, [centre.lng, centre.lat])).slice(0, cap);
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
      el.classList.toggle('arrive', !!A.arrived && now - A.arrived < 600); el.style.setProperty('--c', COLORS[A.st] || '#8fe0ff');
      el.title = `${A.agent.code} · ${MODE_FR[A.mode]}${A.note ? ` — ${A.note}` : ''}`;
    }
  }
  const MODE_FR = { illustrative: 'déplacement illustratif (visualisation, aucun travail)', replay: 'relecture d’une mission enregistrée', live: 'exécution locale réelle' };

  // ---------- replay / live drivers ----------
  function drive(id, { pos, state, note, dir }) { const A = S.agents.get(id); if (!A) return; if (A.mode === 'illustrative') { A.path = null; } A.mode = A.mode === 'live' ? 'live' : 'replay'; if (dir) A.dir = dir; else if (A.pos && pos && (A.pos[0] !== pos[0] || A.pos[1] !== pos[1])) A.dir = [pos[0] - A.pos[0], pos[1] - A.pos[1]]; A.pos = pos; A.state = state; A.note = note || ''; A.visible = true; A.f = Math.floor(performance.now() / 280) % 2; }
  function release(id) { const A = S.agents.get(id); if (!A || A.mode === 'illustrative') return; A.mode = 'illustrative'; A.note = ''; A.state = 'idle'; A.pause = 1500; const n = S.net.nearest(A.pos); A.node = n.i; A.pos = S.net.nodes[n.i]; A.visible = S.shown.has(id); }
  function dim(ids) { S.dimOthers = ids ? new Set(ids) : null; geo(); }
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
    map.on('moveend', () => { if (S.ready) domSync(); });
  }
  function counts() { const c = {}; for (const A of S.agents.values()) c[A.st] = (c[A.st] || 0) + 1; return { total: S.agents.size, shown: S.shown.size, byStatus: c, dom: S.dom.size, live: [...S.agents.values()].filter(A => A.mode === 'live').length, replay: [...S.agents.values()].filter(A => A.mode === 'replay').length }; }
  G.CORE_MOTION = { init, ensure, setFilter, select, follow, unfollow, drive, release, dim, refreshStatus, counts, pollLive, state: S, COLORS, MODE_FR, ZOOM_DOM, ZOOM_ZONES, SPEED };
})();
