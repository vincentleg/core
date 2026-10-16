// CORE World — Living Earth (V7). Four connected scales on one map: Planet → Region → City → Human.
// Real geography first; CORE's data layer (recorded problems, the studied corridor) on top; detailed street-level
// rendering only near the person. Nothing is transmitted: the avatar and journey stay in this browser.
import * as maplibregl from '../../assets/vendor/maplibre-gl-6.11.2/maplibre-gl.mjs';
import { livingEarthStyle } from './style.mjs';
import { problemHTML, humanPlace, STATUS_FR, esc } from './problem-view.mjs';
import * as CFG from './avatar-config.mjs';
import * as NAV from '../shell/nav.mjs';
import * as J from '../shell/journey.mjs';
import { icon } from '../ui/icons.mjs';
import * as CIV from '../civilization/client.mjs';
import { PLACES } from '../civilization/missions.mjs';
import { createAgentLayer } from './agents-layer.mjs';
import * as CP from './civ-panels.mjs';

const $ = id => document.getElementById(id);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const FLAGSHIP = 'sidewalk-below-bsp-min:5665000', AGENT_ID = 'core.san-francisco.public-space.sidewalks', FLAGSHIP_MISSION = 'mission.sf.housing-resilience';
const SF = [-122.4, 37.776];
const toast = msg => { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3200); };
const lowDevice = () => (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || matchMedia('(pointer: coarse)').matches;
const S = { map: null, data: null, scale: 'planet', mode: 'map', sel: null, quality: ['high', 'balanced', 'low'].includes(new URLSearchParams(location.search).get('quality')) ? new URLSearchParams(location.search).get('quality') : lowDevice() ? 'balanced' : 'high', three: null, scene: null, keys: new Set(), joy: { x: 0, y: 0 }, heading: 0, cam: 'third', pos: null, nearAgent: false, spinning: false, frames: [], ready: false, humanReady: false, buildings: 0 };
NAV.render($('core-nav'), { active: 'world' });

// ---------- data: published CORE records only ----------
const getJSON = async u => { const r = await fetch(u); if (!r.ok) throw Error(`${u} : HTTP ${r.status}`); return r.json(); };
async function loadData() {
  const [problems, agents, sidewalks, trees, corridor] = await Promise.all(['data/problems/registry.json', 'data/agents/registry.json', 'data/sf/sidewalks.geojson', 'data/sf/street-trees.geojson', 'data/sf/corridor.geojson'].map(getJSON));
  const segs = new Map(corridor.features.map(f => [f.properties.cnn, f]));
  const RANK = ['observed', 'potential-risk', 'hypothesis', 'simulated'], bySeg = new Map();
  for (const p of problems.problems) { const f = p.segment && segs.get(p.segment); if (!f) continue; const [a, b] = f.geometry.coordinates;
    const e = bySeg.get(p.segment) || { coord: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], along: (Math.atan2((b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), b[1] - a[1]) * 180 / Math.PI + 360) % 360, items: [] }; e.items.push(p); bySeg.set(p.segment, e); }
  for (const e of bySeg.values()) e.items.sort((x, y) => RANK.indexOf(x.status) - RANK.indexOf(y.status) || (x.id === FLAGSHIP ? -1 : 0));
  const markers = { type: 'FeatureCollection', features: [...bySeg.entries()].map(([segment, e]) => ({ type: 'Feature', id: Number(segment), geometry: { type: 'Point', coordinates: e.coord }, properties: { segment, count: e.items.length, status: e.items[0].status } })) };
  return { problems: problems.problems, byId: new Map(problems.problems.map(p => [p.id, p])), bySeg, markers, corridor, segs, agent: agents.agents.find(a => a.id === AGENT_ID),
    sidewalks: new Map(sidewalks.features.map(f => [f.properties.cnn, f.properties])), trees: trees.features };
}

// ---------- map ----------
function makeMap(d) {
  const terrain = S.quality === 'high';
  const map = new maplibregl.Map({ container: 'map', style: livingEarthStyle({ markers: d.markers, corridor: d.corridor, terrain }), center: [-104, 32], zoom: 1.75, pitch: 0, maxPitch: 85, maxZoom: 23, attributionControl: false, fadeDuration: 150, canvasContextAttributes: { antialias: true } });
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'CORE · DataSF (trottoirs 2014, arbres, tronçons)' }), 'bottom-left');
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.on('error', e => { const msg = String(e.error?.message || ''); if (!map.isStyleLoaded() && !/tile|fetch|Failed to load|NetworkError|AbortError/i.test(msg)) { $('fatal').hidden = false; $('fatal').textContent = `Carte indisponible : ${msg.slice(0, 200)}`; } });
  map.on('click', 'markers', e => { const f = e.features[0]; if (f) focusSegment(f.properties.segment, { open: true }); });
  map.on('mouseenter', 'markers', () => { map.getCanvas().style.cursor = 'pointer'; }); map.on('mouseleave', 'markers', () => { map.getCanvas().style.cursor = ''; });
  for (const ev of ['mousedown', 'touchstart', 'wheel']) map.on(ev, () => { S.spinning = false; });
  map.on('zoomend', syncScale); map.on('moveend', syncScale);
  return map;
}
function spin() {
  if (reduced()) return; S.spinning = true;
  const step = () => { if (!S.spinning || S.mode !== 'map' || S.map.getZoom() > 3) { S.spinning = false; return; } const c = S.map.getCenter(); S.map.jumpTo({ center: [c.lng + 0.06, c.lat] }); requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
// ---------- scales ----------
const SCALES = [['planet', 'Planète', 'globe'], ['region', 'Région', 'mountain'], ['city', 'Ville', 'building'], ['human', 'Humain', 'walk']];
function renderScales() {
  $('ea-scales').innerHTML = SCALES.map(([id, l, ic]) => `<button type="button" data-scale="${id}" aria-pressed="${S.scale === id}">${icon(ic, 16)}<span>${l}</span></button>`).join('');
  $('ea-scales').querySelectorAll('button').forEach(b => b.onclick = () => goScale(b.dataset.scale));
}
function syncScale() { if (S.mode === 'human') return; const z = S.map.getZoom(), s = z < 5 ? 'planet' : z < 12 ? 'region' : 'city'; if (s !== S.scale) { S.scale = s; renderScales(); } }
const fly = (o, ms = 3200) => new Promise(r => { if (reduced()) { S.map.jumpTo(o); return r(); } S.map.once('moveend', r); S.map.flyTo({ ...o, duration: ms, essential: false, curve: 1.5 }); setTimeout(r, ms + 2500); });
async function goScale(s) {
  S.spinning = false; if (S.mode === 'human' && s !== 'human') leaveHuman();
  if (s === 'planet') await fly({ center: [-110, 30], zoom: 1.65, pitch: 0, bearing: 0 }, 3000);
  if (s === 'region') await fly({ center: [-122.33, 37.72], zoom: 9.6, pitch: 50, bearing: -18 }, 3000);
  if (s === 'city') { const e = S.data.bySeg.get(S.data.byId.get(S.sel || FLAGSHIP).segment); await fly({ center: e.coord, zoom: 15.6, pitch: 62, bearing: e.along - 30 }, 3000); }
  if (s === 'human') return enterHuman();
  S.scale = s; renderScales();
}

// ---------- discovery: panel, list, search ----------
function focusSegment(segment, { open = true, instant = false } = {}) {
  const e = S.data.bySeg.get(segment); if (!e) return;
  S.sel = e.items[0].id; S.map.getSource('focus').setData({ type: 'FeatureCollection', features: [S.data.segs.get(segment)] });
  const target = { center: e.coord, zoom: Math.max(S.map.getZoom(), 16.4), pitch: 62, bearing: e.along - 30 };
  if (S.mode !== 'human') (instant || reduced() ? S.map.jumpTo(target) : S.map.easeTo({ ...target, duration: 1600 }));
  if (open) openPanel(e.items[0].id);
}
function openPanel(id) {
  const p = S.data.byId.get(id); if (!p) return; S.sel = id;
  const j = J.read(), e = S.data.bySeg.get(p.segment);
  $('ea-panel-body').innerHTML = problemHTML(p, { sidewalk: S.data.sidewalks.get(p.segment), journey: j.problemId === id ? j : null, count: e?.items.length || 1 })
    + (e && e.items.length > 1 ? `<div class="pp-sec"><h3>Sur ce même tronçon</h3><ul class="pp-others">${e.items.filter(x => x.id !== id).map(x => `<li><button type="button" class="ghost small" data-open="${esc(x.id)}"><span class="le-badge" data-s="${esc(x.status)}">${esc(STATUS_FR[x.status])}</span> ${esc(x.title)}</button></li>`).join('')}</ul></div>` : '');
  $('ea-panel-body').querySelectorAll('[data-open]').forEach(b => b.onclick = () => openPanel(b.dataset.open));
  $('ea-panel').hidden = false; $('ea-panel').classList.remove('le-enter'); void $('ea-panel').offsetWidth; $('ea-panel').classList.add('le-enter');
  $('ea-human').hidden = p.id !== FLAGSHIP || S.mode === 'human';
  $('ea-panel').focus({ preventScroll: true });
  J.mark('world', { problemId: id }); history.replaceState(null, '', `#problem=${encodeURIComponent(id)}`);
}
function renderList() {
  const items = [...S.data.bySeg.entries()].map(([seg, e]) => ({ seg, p: e.items[0], n: e.items.length }));
  $('ea-list-ul').innerHTML = items.map(({ seg, p, n }) => `<li><button type="button" data-seg="${esc(seg)}"><span class="le-badge" data-s="${esc(p.status)}">${esc(STATUS_FR[p.status])}</span><span><b>${esc(p.title)}</b><br><span class="fine">${esc(humanPlace(p.place))}${n > 1 ? ` · ${n} problèmes` : ''}</span></span></button></li>`).join('');
  $('ea-list-ul').querySelectorAll('[data-seg]').forEach(b => b.onclick = () => { focusSegment(b.dataset.seg); });
  $('ea-ql').innerHTML = items.map(({ p }) => `<option value="${esc(humanPlace(p.place))}">`).join('');
}
function search(q) {
  const t = q.trim().toLowerCase(); if (!t) return;
  const hit = S.data.problems.find(p => humanPlace(p.place).toLowerCase().includes(t) || p.title.toLowerCase().includes(t) || p.place.toLowerCase().includes(t));
  if (hit && S.data.bySeg.has(hit.segment)) { if (S.scale === 'planet' || S.scale === 'region') S.map.jumpTo({ center: S.data.bySeg.get(hit.segment).coord, zoom: 15, pitch: 55 }); focusSegment(hit.segment); }
  else toast('Aucun problème enregistré ne correspond. La recherche porte sur les registres CORE (pas de géocodage externe).');
}

// ---------- journey start ----------
async function start() {
  S.spinning = false; $('ea-hero').classList.add('out'); $('ea-vignette').classList.add('out'); setTimeout(() => { $('ea-hero').hidden = true; }, 600);
  S.map.setPadding({ left: 0, right: 0, top: 0, bottom: 0 });
  $('ea-scales').hidden = false; $('ea-tools').hidden = false; $('ea-legend').hidden = false;
  await fly({ center: [-122.42, 37.77], zoom: 10.3, pitch: 45, bearing: -15 }, 4200);
  S.scale = 'region'; renderScales();
  await fly({ center: PLACES.somaField, zoom: 16.4, pitch: 62, bearing: -40 }, 3600);
  S.scale = 'city'; renderScales();
  if (S.layer) { setLayer('hybrid'); showMission(FLAGSHIP_MISSION); }
  toast('Une mission de recherche est en cours ici : logement abordable et résilience. Passez en couche « Agents » pour voir la civilisation.');
}

// ---------- human scale ----------
let lib = null;
async function enterHuman() {
  if (S.mode === 'human') return;
  if (S.quality === 'low') { toast('Qualité « Économe » : la vue 3D à hauteur humaine est désactivée. Tout reste accessible via la liste et les panneaux.'); return; }
  $('ea-human').disabled = true; $('ea-human').textContent = 'Chargement de la scène…';
  try {
    lib = lib || await Promise.all([import('./scene3d.mjs'), import('./avatar3d.mjs'), import('./agents3d.mjs')]);
    const [{ createScene3D, toLngLat, toLocal }, AV, A3] = lib;
    const p = S.data.byId.get(FLAGSHIP), e = S.data.bySeg.get(p.segment);
    const origin = e.coord, alongRad = e.along * Math.PI / 180;
    if (!S.scene) {
      S.scene = createScene3D(maplibregl, { origin, quality: S.quality === 'high' ? 'high' : 'balanced' });
      S.map.addLayer(S.scene.layer, 'marker-halo');
      S.scene.state.altitude = S.map.queryTerrainElevation?.(origin) || 0;
      S.scene.setTrees(S.data.trees.filter(t => Math.hypot((t.geometry.coordinates[0] - origin[0]) * 88000, (t.geometry.coordinates[1] - origin[1]) * 111000) < 420));
      S.crowd = A3.createCrowd(S.scene, S.quality === 'high' ? 'high' : 'balanced'); S.toLocal = ll => toLocal(origin, ll);
    }
    const me = CFG.load(); S.me = me;
    const avatar = await AV.buildAvatar(me.appearance); S.scene.setAvatar(avatar); S.avatar = avatar;
    const back = [-Math.sin(alongRad) * 26 + Math.cos(alongRad) * 11, Math.cos(alongRad) * 26 + Math.sin(alongRad) * 11];
    S.pos = back; S.heading = e.along; avatar.root.position.set(back[0], 0, back[1]); avatar.root.rotation.y = Math.PI - S.heading * Math.PI / 180;
    S.toLngLat = (x, z) => toLngLat(origin, x, z);
    S.mode = 'human'; S.scale = 'human'; renderScales();
    $('ea-hud').hidden = false; $('ea-panel').hidden = true; $('ea-human').hidden = true;
    $('ea-me').innerHTML = `<i style="${CFG.chipStyle(me.appearance)}"></i><b>${esc(me.identity.pseudonym || 'Vous')}</b>`;
    $('ea-hint').textContent = matchMedia('(pointer: coarse)').matches ? 'Joystick pour marcher · approchez un agent pour lui parler' : 'W/↑ avancer · A/D tourner · Maj courir · C vue · E parler à l’agent le plus proche';
    if (S.layer && S.layer.mode === 'real') setLayer('hybrid');
    S.map.keyboard.disable(); S.map.dragPan.disable();
    // Street level is flat SoMa: relief is switched off here (the 3D layer would otherwise sit under the terrain mesh).
    S.savedTerrain = S.map.getTerrain?.() || null; if (S.savedTerrain) S.map.setTerrain(null); S.scene.state.altitude = 0;
    await fly(camFor(), 2600);
    S.buildings = S.scene.refreshBuildings(); S.humanReady = true;
    S.scene.state.onFrame = tick; J.mark('world', { problemId: FLAGSHIP });
    toast('Vous êtes sur Folsom Street, dans SoMa. Les agents de la mission « logement et résilience » travaillent autour de vous.');
  } catch (err) {
    console.error(err); toast(`La vue 3D n’a pas pu démarrer (${err.message}). La carte et les panneaux restent disponibles.`);
  } finally { $('ea-human').disabled = false; $('ea-human').textContent = 'Descendre à hauteur humaine'; }
}
function leaveHuman() {
  if (S.mode !== 'human') return; S.mode = 'map'; S.humanReady = false; $('ea-hud').hidden = true; if (S.savedTerrain) S.map.setTerrain(S.savedTerrain); S.scene.setAvatar(null); S.scene.refreshBuildings(0); S.scene.state.onFrame = null;
  S.map.keyboard.enable(); S.map.dragPan.enable(); S.avatar = null; for (const m of S.plates?.values() || []) m.remove(); S.plates?.clear();
}
function camFor() {
  const ll = S.toLngLat(S.pos[0], S.pos[1]);
  return S.cam === 'first' ? { center: ll, zoom: 23, pitch: 85, bearing: S.heading } : { center: ll, zoom: 21.7, pitch: 74, bearing: S.heading };
}
function tick(dt) {
  if (S.mode !== 'human' || !S.humanReady) return;
  S.frames.push(dt); if (S.frames.length > 240) S.frames.shift();
  const k = S.keys, fwd = (k.has('w') || k.has('z') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0) - S.joy.y;
  const turn = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('q') || k.has('arrowleft') ? 1 : 0) + S.joy.x;
  const run = k.has('shift');
  if (turn) S.heading = (S.heading + turn * 85 * dt + 360) % 360;
  if (Math.abs(fwd) > 0.05) {
    const sp = (run ? 3.4 : 1.45) * Math.sign(fwd) * Math.min(1, Math.abs(fwd)), b = S.heading * Math.PI / 180;
    const nx = S.pos[0] + Math.sin(b) * sp * dt, nz = S.pos[1] - Math.cos(b) * sp * dt;
    if (!S.scene.blocked?.(nx, nz)) S.pos = [nx, nz];
    S.avatar.play(run ? 'Jog_Fwd_Loop' : 'Walk_Loop', 0.25);
  } else S.avatar.play(S.nearAgent ? 'Idle_Talking_Loop' : 'Idle_Loop', 0.4);
  S.avatar.root.position.set(S.pos[0], 0, S.pos[1]); S.avatar.root.rotation.y = Math.PI - S.heading * Math.PI / 180;
  if (S.avatar.model) S.avatar.model.visible = S.cam !== 'first';
  S.crowd?.update(dt, reduced());
  const nb = S.layer?.mode !== 'real' ? S.crowd?.nearest(S.pos) : null, near = nb && nb.d < 4.5 ? nb.id : null;
  if (near !== S.nearAgent) { S.nearAgent = near; $('ea-talk').disabled = !near; const a = near && S.civ.byId.get(near);
    $('ea-talk').textContent = a ? `Parler à ${a.code} (E)` : 'Parler à un agent (E)'; if (a) toast(`${a.code} — ${a.role} : ${S.civ.activity(near).label}. (E pour ouvrir sa fiche)`); }
  S.map.jumpTo(camFor());
}

// ---------- wiring ----------
function wire() {
  $('ea-start').onclick = start;
  $('ea-how').onclick = () => { const h = $('ea-howto'); h.hidden = !h.hidden; $('ea-how').setAttribute('aria-expanded', String(!h.hidden)); };
  $('ea-human').onclick = () => goScale('human');
  $('ea-up').onclick = async () => { leaveHuman(); await goScale('city'); openPanel(FLAGSHIP); };
  $('ea-cam').onclick = () => { S.cam = S.cam === 'third' ? 'first' : 'third'; $('ea-cam').textContent = `Vue : ${S.cam === 'third' ? '3e' : '1re'} personne`; $('ea-cam').setAttribute('aria-pressed', String(S.cam === 'first')); };
  $('ea-talk').onclick = () => { if (S.nearAgent) showAgent(S.nearAgent); };
  $('ea-quality').value = S.quality;
  $('ea-quality').onchange = e => { const before = S.quality; S.quality = e.target.value;
    if ((before === 'high') !== (S.quality === 'high')) toast('Le relief s’active ou se désactive au prochain chargement de la page (qualité « Haute » seulement).'); if (S.scene) { S.scene.setQuality(S.quality === 'high' ? 'high' : 'balanced'); if (S.quality === 'low') { $('ea-up').click(); } else S.buildings = S.scene.refreshBuildings(); } };
  $('ea-list-btn').onclick = () => { const l = $('ea-list'); l.hidden = !l.hidden; $('ea-list-btn').setAttribute('aria-expanded', String(!l.hidden)); if (!l.hidden) { if (!$('ea-hero').hidden) start(); l.focus(); } };
  $('ea-about-btn').onclick = () => { const a = $('ea-about'); a.hidden = !a.hidden; $('ea-about-btn').setAttribute('aria-expanded', String(!a.hidden)); };
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { $(b.dataset.close).hidden = true; });
  $('ea-q').addEventListener('change', e => search(e.target.value)); $('ea-q').addEventListener('keydown', e => { if (e.key === 'Enter') search(e.target.value); });
  addEventListener('keydown', e => {
    if (e.target.closest?.('input, textarea, select')) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { for (const id of ['ea-about', 'ea-list', 'ea-panel']) if (!$(id).hidden) { $(id).hidden = true; return; } }
    if (S.mode !== 'human') return;
    if (k === 'c') $('ea-cam').click(); else if (k === 'e' && S.nearAgent) $('ea-talk').click(); else { S.keys.add(k === 'shift' ? 'shift' : k); if (k.startsWith('arrow')) e.preventDefault(); }
  });
  addEventListener('keyup', e => S.keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => S.keys.clear());
  // Touch joystick.
  const joy = $('ea-joy'), knob = joy.querySelector('i'); let jid = null;
  joy.addEventListener('pointerdown', e => { jid = e.pointerId; joy.setPointerCapture(jid); });
  joy.addEventListener('pointermove', e => { if (e.pointerId !== jid) return; const r = joy.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2), l = Math.max(1, Math.hypot(x, y)); S.joy = { x: x / l, y: y / l }; knob.style.transform = `translate(${S.joy.x * 30}px, ${S.joy.y * 30}px)`; });
  const end = () => { jid = null; S.joy = { x: 0, y: 0 }; knob.style.transform = ''; }; joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
}

// ---------- civilisation (V7.2): layers, panels, crowd ----------
const LAYER_KEY = 'core.world.layer';
function setLayer(m) {
  if (!S.layer) return; S.layer.setMode(m); try { localStorage.setItem(LAYER_KEY, m); } catch {}
  document.querySelectorAll('#ea-layers [data-layer]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.layer === m)));
  if (S.crowd) S.crowd.visible = m !== 'real';
  const g = S.scene?.world?.getObjectByName('core-agents'); if (g) g.visible = m !== 'real';
  for (const mk of S.plates?.values() || []) mk.getElement().hidden = m === 'real';
  document.body.dataset.layer = m;
}
function panel(kind, id, html) {
  S.panelKind = { kind, id }; $('ea-panel-body').innerHTML = html; $('ea-panel').hidden = false; $('ea-human').hidden = true;
  $('ea-panel').classList.remove('le-enter'); void $('ea-panel').offsetWidth; $('ea-panel').classList.add('le-enter');
}
const showAgent = id => panel('agent', id, CP.agentHTML(S.civ, id));
const showMission = id => panel('mission', id, CP.missionHTML(S.civ, id));
const showActivity = () => panel('activity', null, CP.activityHTML(S.civ, CIV.state()));
const showEvent = seq => panel('event', seq, CP.eventHTML(S.civ, seq));
const showHierarchy = () => panel('hierarchy', null, CP.hierarchyHTML(S.civ));
function refreshPanel() {
  const k = S.panelKind; if (!k || $('ea-panel').hidden || $('ea-panel').contains(document.activeElement) && document.activeElement.tagName === 'BUTTON') return;
  const top = $('ea-panel').scrollTop;
  if (k.kind === 'agent') $('ea-panel-body').innerHTML = CP.agentHTML(S.civ, k.id); else if (k.kind === 'mission') $('ea-panel-body').innerHTML = CP.missionHTML(S.civ, k.id); else if (k.kind === 'activity') $('ea-panel-body').innerHTML = CP.activityHTML(S.civ, CIV.state()); else if (k.kind === 'hierarchy') $('ea-panel-body').innerHTML = CP.hierarchyHTML(S.civ);
  $('ea-panel').scrollTop = top;
}
function civTick() {
  const R = S.civ; if (!R) return; S.layer?.update();
  if (S.follow && S.mode !== 'human') S.map.easeTo({ center: R.posOf(S.follow), duration: 240 });
  if (S.mode === 'human' && S.crowd && S.toLocal) {
    const list = S.layer.agents.map(a => { const [x, z] = S.toLocal(R.posOf(a.id)), act = R.activity(a.id); return { id: a.id, x, z, state: act.state, dept: a.department, body: a.id.length % 2 ? 'f' : 'm' }; });
    const c = S.crowd.sync(list, S.pos); S.crowdCounts = c;
    // Nameplates for the near agents (DOM, at most 12).
    S.plates ||= new Map(); const want = new Set();
    const close = list.map(a => ({ a, d: Math.hypot(a.x - S.pos[0], a.z - S.pos[1]) })).filter(x => x.d < 25).sort((x, y) => x.d - y.d).slice(0, 6).map(x => x.a);
    const SHORT = { working: 'au travail', inspecting: 'vérifie', meeting: 'en réunion', travelling: 'en route', returning: 'en route', idle: 'inactif' };
    for (const a of close) { want.add(a.id); let mk = S.plates.get(a.id);
      const ag = R.byId.get(a.id), html = `<span class="le-agent-id">${esc(ag.code)}</span><span class="fine">${esc(SHORT[a.state] || a.state)}</span>`;
      if (!mk) { const el = document.createElement('button'); el.type = 'button'; el.className = 'ea-agent-tag'; el.onclick = () => showAgent(a.id); mk = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -96] }).setLngLat(R.posOf(a.id)).addTo(S.map); S.plates.set(a.id, mk); }
      const dd = Math.max(1, Math.hypot(a.x - S.pos[0], a.z - S.pos[1])); mk.setOffset([0, -Math.min(300, Math.max(40, 1900 / dd))]);
      mk.getElement().innerHTML = html; mk.setLngLat(R.posOf(a.id)); mk.getElement().hidden = S.layer.mode === 'real'; mk.getElement().title = `${ag.role} — ${R.activity(a.id).label}`; }
    for (const [id, mk] of S.plates) if (!want.has(id)) { mk.remove(); S.plates.delete(id); }
  }
  const now = performance.now(); if (now - (S.lastPanel || 0) > 2000) { S.lastPanel = now; refreshPanel(); }
}
async function startCivilisation() {
  try {
    const R = await CIV.start(); S.civ = R;
    S.layer = createAgentLayer(S.map, { runtime: R, onAgent: showAgent, onHub: showAgent, onNetwork: id => { if (id === 'san-francisco') showHierarchy(); else panel('network', id, `<header class="pp-head"><h2 id="pp-title">New York</h2></header><p>Des missions inter-villes ont été <b>enregistrées</b> en Phase 10 (relecture). Le registre d’agents de New York n’est pas chargé dans cette version : aucune activité n’y est montrée comme réelle.</p>`); } });
    const h = new URLSearchParams(location.hash.slice(1)); let m = h.get('layer'); try { m ||= localStorage.getItem(LAYER_KEY); } catch {}
    setLayer(['real', 'agents', 'hybrid'].includes(m) ? m : 'real');
    CIV.onChange(civTick);
    if (h.get('mission') && R.M.has(h.get('mission'))) { $('ea-hero').hidden = true; $('ea-vignette').hidden = true; $('ea-scales').hidden = false; $('ea-tools').hidden = false; $('ea-legend').hidden = false; S.map.jumpTo({ center: PLACES.somaField, zoom: 16.2, pitch: 60, bearing: -40 }); S.scale = 'city'; renderScales(); if (S.layer.mode === 'real') setLayer('hybrid'); showMission(h.get('mission')); }
    if (h.get('agent') && R.byId.has(h.get('agent'))) { $('ea-hero').hidden = true; $('ea-vignette').hidden = true; S.map.jumpTo({ center: R.posOf(h.get('agent')), zoom: 17, pitch: 60 }); if (S.layer.mode === 'real') setLayer('hybrid'); showAgent(h.get('agent')); }
    S.civReady = true;
  } catch (e) { console.error(e); toast(`Civilisation CORE indisponible : ${e.message}`); }
}
function wireCiv() {
  document.querySelectorAll('#ea-layers [data-layer]').forEach(b => b.onclick = () => setLayer(b.dataset.layer));
  $('ea-activity-btn').onclick = () => { if (S.civ) { if (S.layer.mode === 'real') setLayer('hybrid'); showActivity(); } };
  $('ea-panel-body').addEventListener('click', e => {
    const t = e.target.closest('[data-mission],[data-agent],[data-ev],[data-follow],[data-follow-mission],[data-speed],[data-hierarchy],[data-reason]'); if (!t) return;
    if (t.matches('a[href^="dialogue.html"]')) return; e.preventDefault();
    if (t.dataset.reason) { CIV.enableReasoning(t.dataset.reason === 'on').then(() => showActivity()); showActivity(); } else if (t.dataset.hierarchy) showHierarchy(); else if (t.dataset.mission) showMission(t.dataset.mission); else if (t.dataset.agent) showAgent(t.dataset.agent); else if (t.dataset.ev) showEvent(t.dataset.ev);
    else if (t.dataset.follow) { S.follow = S.follow === t.dataset.follow ? null : t.dataset.follow; toast(S.follow ? 'La caméra suit cet agent (cliquez « Suivre » à nouveau pour arrêter).' : 'Suivi arrêté.'); }
    else if (t.dataset.followMission) { try { const f = JSON.parse(localStorage.getItem('core.follow.v1') || '{}'); f.mission = t.dataset.followMission; f.title = S.civ.M.get(t.dataset.followMission)?.title; localStorage.setItem('core.follow.v1', JSON.stringify(f)); } catch {} J.mark('world', { problemId: t.dataset.followMission }); toast('Mission suivie : elle apparaît dans Mon CORE.'); }
    else if (t.dataset.speed) { const x = Number(t.dataset.speed); if (!x) CIV.setPaused(!CIV.state().paused); else { CIV.setPaused(false); CIV.setSpeed(x); } showActivity(); }
  });
}

// ---------- boot ----------
(async () => {
  try { S.data = await loadData(); } catch (e) { $('fatal').hidden = false; $('fatal').textContent = `Registres CORE indisponibles : ${e.message}`; return; }
  S.map = makeMap(S.data); wire(); wireCiv(); renderScales(); renderList();
  S.map.on('load', () => {
    S.ready = true; const h = new URLSearchParams(location.hash.slice(1)); startCivilisation();
    if (h.get('problem') && S.data.byId.has(h.get('problem'))) {
      $('ea-hero').hidden = true; $('ea-vignette').hidden = true; $('ea-scales').hidden = false; $('ea-tools').hidden = false; $('ea-legend').hidden = false;
      const p = S.data.byId.get(h.get('problem')); S.map.jumpTo({ center: S.data.bySeg.get(p.segment)?.coord || SF, zoom: 16.4, pitch: 62, bearing: (S.data.bySeg.get(p.segment)?.along || 0) - 30 }); S.scale = 'city'; renderScales();
      focusSegment(p.segment, { open: false, instant: true }); openPanel(p.id);
    } else if (location.hash === '#enter') {
      $('ea-hero').hidden = true; $('ea-vignette').hidden = true; $('ea-scales').hidden = false; $('ea-tools').hidden = false; $('ea-legend').hidden = false;
      const e = S.data.bySeg.get(S.data.byId.get(FLAGSHIP).segment); S.map.jumpTo({ center: e.coord, zoom: 16.2, pitch: 60, bearing: e.along - 30 });
      focusSegment(e.items[0].segment, { open: false, instant: true }); S.map.once('idle', () => goScale('human'));
    } else { if (innerWidth > 860) S.map.setPadding({ left: Math.min(760, innerWidth * 0.48), right: 0, top: 0, bottom: 0 }); spin(); }
  });
})();
globalThis.CORE_EARTH = { state: S, goScale, openPanel, focusSegment, enterHuman, start, setLayer, showAgent, showMission, showActivity, showEvent, showHierarchy, civ: () => S.civ, get fps() { const f = S.frames; return f.length ? f.length / f.reduce((a, b) => a + b, 0) : 0; } };
