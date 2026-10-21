// CORE World — the parallel Earth. Four connected scales on one map: Planet → Region → City → Street.
// Real geography first (Real Earth); the parallel research civilisation of software agents on top (CORE World); both
// together (Hybrid View). Missions, evidence, recorded simulations, contributions and the guided demo are reached from
// here. Nothing is transmitted: avatar, journey, contributions and investigations stay in this browser. English by
// default; every visible string is English/French (src/i18n), and the page re-renders when the language changes.
import { PUBLIC } from '../env.mjs';
import { STREET_LEVEL } from '../features.mjs';
import * as maplibregl from '../../assets/vendor/maplibre-gl-6.11.2/maplibre-gl.mjs';
import { livingEarthStyle } from './style.mjs';
import { problemHTML, humanPlace, statusLabel, ptext, esc } from './problem-view.mjs';
import * as CFG from './avatar-config.mjs';
import * as NAV from '../shell/nav.mjs';
import * as J from '../shell/journey.mjs';
import { icon } from '../ui/icons.mjs';
import * as CIV from '../civilization/client.mjs';
import { PLACES, CATEGORY, DOMAINS } from '../civilization/missions.mjs';
import { createAgentLayer } from './agents-layer.mjs';
import * as CP from './civ-panels.mjs';
import * as SCN from './scenarios.mjs';
import { createGround } from './ground.mjs';
import { createUrban } from '../urban/app.mjs';
import { createVehicle } from './vehicle.mjs';
import { PLACES as VPLACES, suggestMission } from '../voice/actions.mjs';
import * as CONTRIB from '../contrib/contributions.mjs';
import * as STORE from '../contrib/store.mjs';
import { ollamaJSON } from '../intelligence/pool.mjs';
import { T, L, AT, lang, onLang, num } from '../i18n/i18n.mjs';

const $ = id => document.getElementById(id);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const FLAGSHIP = 'sidewalk-below-bsp-min:5665000', FLAGSHIP_MISSION = 'mission.sf.mobility';
const SF = [-122.4, 37.776];
const toast = msg => { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => { t.classList.remove('on'); t.textContent = ''; }, 3600); }; // the CSS shows any non-empty toast
const lowDevice = () => (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || matchMedia('(pointer: coarse)').matches;
const qp = new URLSearchParams(location.search).get('quality');
const S = { map: null, data: null, scale: 'planet', mode: 'map', sel: null, quality: ['high', 'balanced', 'low'].includes(qp) ? qp : lowDevice() ? 'balanced' : 'high', scene: null, keys: new Set(), joy: { x: 0, y: 0 }, heading: 0, cam: 'third', pos: null, nearAgent: false, spinning: false, frames: [], ready: false, humanReady: false, buildings: 0 };
NAV.render($('core-nav'), { active: 'world' });

// ---------- data: published CORE records only ----------
const getJSON = async u => { const r = await fetch(u); if (!r.ok) throw Error(`${u} : HTTP ${r.status}`); return r.json(); };
async function loadData() {
  const [problems, sidewalks, trees, corridor] = await Promise.all(['data/problems/registry.json', 'data/sf/sidewalks.geojson', 'data/sf/street-trees.geojson', 'data/sf/corridor.geojson'].map(getJSON));
  const segs = new Map(corridor.features.map(f => [f.properties.cnn, f]));
  const RANK = ['observed', 'potential-risk', 'hypothesis', 'simulated'], bySeg = new Map();
  for (const p of problems.problems) { const f = p.segment && segs.get(p.segment); if (!f) continue; const [a, b] = f.geometry.coordinates;
    const e = bySeg.get(p.segment) || { coord: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], along: (Math.atan2((b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), b[1] - a[1]) * 180 / Math.PI + 360) % 360, items: [] }; e.items.push(p); bySeg.set(p.segment, e); }
  for (const e of bySeg.values()) e.items.sort((x, y) => RANK.indexOf(x.status) - RANK.indexOf(y.status) || (x.id === FLAGSHIP ? -1 : 0));
  const markers = { type: 'FeatureCollection', features: [...bySeg.entries()].map(([segment, e]) => ({ type: 'Feature', id: Number(segment), geometry: { type: 'Point', coordinates: e.coord }, properties: { segment, count: e.items.length, status: e.items[0].status } })) };
  return { problems: problems.problems, byId: new Map(problems.problems.map(p => [p.id, p])), bySeg, markers, corridor, segs,
    sidewalks: new Map(sidewalks.features.map(f => [f.properties.cnn, f.properties])), trees: trees.features };
}

// ---------- map ----------
function makeMap(d) {
  const terrain = S.quality === 'high';
  const map = new maplibregl.Map({ container: 'map', style: livingEarthStyle({ markers: d.markers, corridor: d.corridor, terrain }), center: [-104, 32], zoom: 1.75, pitch: 0, maxPitch: 85, maxZoom: 23, attributionControl: false, fadeDuration: 150, canvasContextAttributes: { antialias: true } });
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'CORE · DataSF · EIA · SUMO' }), 'bottom-left');
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.on('error', e => { const msg = String(e.error?.message || ''); if (!map.isStyleLoaded() && !/tile|fetch|Failed to load|NetworkError|AbortError/i.test(msg)) { $('fatal').hidden = false; $('fatal').textContent = `${T('Map unavailable', 'Carte indisponible')}: ${msg.slice(0, 200)}`; } });
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
const SCALES = [['planet', ['Planet', 'Planète'], 'globe'], ['region', ['Region', 'Région'], 'mountain'], ['city', ['City', 'Ville'], 'building'], ['human', ['Street', 'Rue'], 'walk']].filter(([id]) => STREET_LEVEL || id !== 'human');
function renderScales() {
  $('ea-scales').innerHTML = SCALES.map(([id, l, ic]) => `<button type="button" data-scale="${id}" aria-pressed="${S.scale === id}">${icon(ic, 16)}<span>${esc(T(...l))}</span></button>`).join('');
  $('ea-scales').querySelectorAll('button').forEach(b => b.onclick = () => goScale(b.dataset.scale));
}
function syncScale() { if (S.mode === 'human') return; const z = S.map.getZoom(), s = z < 5 ? 'planet' : z < 12 ? 'region' : 'city'; if (s !== S.scale) { S.scale = s; renderScales(); } }
const fly = (o, ms = 3200) => new Promise(r => { if (reduced()) { S.map.jumpTo(o); return r(); } S.map.once('moveend', r); S.map.flyTo({ ...o, duration: ms, essential: false, curve: 1.5 }); setTimeout(r, ms + 2500); });
async function goScale(s) {
  S.spinning = false; if (S.mode === 'human' && s !== 'human') leaveHuman();
  if (s === 'planet') await fly({ center: [-110, 30], zoom: 1.65, pitch: 0, bearing: 0 }, 3000);
  if (s === 'region') await fly({ center: [-122.33, 37.72], zoom: 9.6, pitch: 50, bearing: -18 }, 3000);
  if (s === 'city') await fly({ center: PLACES.somaField, zoom: 15.6, pitch: 60, bearing: -40 }, 3000);
  if (s === 'human') return enterHuman();
  S.scale = s; renderScales();
}

// ---------- recorded problems: panel, list ----------
function focusSegment(segment, { open = true, instant = false } = {}) {
  const e = S.data.bySeg.get(segment); if (!e) return;
  S.sel = e.items[0].id; S.map.getSource('focus').setData({ type: 'FeatureCollection', features: [S.data.segs.get(segment)] });
  const target = { center: e.coord, zoom: Math.max(S.map.getZoom(), 16.4), pitch: 62, bearing: e.along - 30 };
  if (S.mode !== 'human') (instant || reduced() ? S.map.jumpTo(target) : S.map.easeTo({ ...target, duration: 1600 }));
  if (open) openPanel(e.items[0].id);
}
const problemPanel = id => { const p = S.data.byId.get(id), j = J.read(), e = S.data.bySeg.get(p.segment);
  return problemHTML(p, { sidewalk: S.data.sidewalks.get(p.segment), journey: j.problemId === id ? j : null, count: e?.items.length || 1 })
    + (e && e.items.length > 1 ? `<div class="pp-sec"><h3>${T('On this same segment', 'Sur ce même tronçon')}</h3><ul class="pp-others">${e.items.filter(x => x.id !== id).map(x => `<li><button type="button" class="ghost small" data-open="${esc(x.id)}"><span class="le-badge" data-s="${esc(x.status)}">${esc(statusLabel(x.status))}</span> ${esc(ptext(x.title))}</button></li>`).join('')}</ul></div>` : ''); };
function openPanel(id) {
  const p = S.data.byId.get(id); if (!p) return; S.sel = id;
  panel('problem', id, problemPanel(id)); $('ea-human').hidden = !STREET_LEVEL || p.id !== FLAGSHIP || S.mode === 'human';
  $('ea-panel').focus({ preventScroll: true });
  J.mark('world', { problemId: id }); history.replaceState(null, '', `#problem=${encodeURIComponent(id)}`);
}
function renderList() {
  const items = [...S.data.bySeg.entries()].map(([seg, e]) => ({ seg, p: e.items[0], n: e.items.length }));
  $('ea-list-ul').innerHTML = items.map(({ seg, p, n }) => `<li><button type="button" data-seg="${esc(seg)}"><span class="le-badge" data-s="${esc(p.status)}">${esc(statusLabel(p.status))}</span><span><b>${esc(ptext(p.title))}</b><br><span class="fine">${esc(humanPlace(p.place))}${n > 1 ? ` · ${T(`${n} problems`, `${n} problèmes`)}` : ''}</span></span></button></li>`).join('');
  $('ea-list-ul').querySelectorAll('[data-seg]').forEach(b => b.onclick = () => { focusSegment(b.dataset.seg); });
  const opts = [...Object.values(VPLACES).map(p => p.label), ...(S.civ ? [...S.civ.M.values()].map(m => L(m.title)) : []), ...items.map(({ p }) => humanPlace(p.place))];
  $('ea-ql').innerHTML = [...new Set(opts)].map(o => `<option value="${esc(o)}">`).join('');
}
// Search across places, missions, agents (by code) and recorded problems — all local, no external geocoding.
function search(q) {
  const t = q.trim().toLowerCase(); if (!t) return;
  const place = Object.entries(VPLACES).find(([k, p]) => p.label.toLowerCase().includes(t) || k.includes(t));
  if (place) { const [, P] = place; return P.scale ? (revealMap(), goScale(P.scale)) : flyTo(P.at, P.zoom); }
  const R = S.civ, mission = R && [...R.M.values()].find(m => L(m.title, 'en').toLowerCase().includes(t) || L(m.title, 'fr').toLowerCase().includes(t));
  if (mission) return openMission(mission.id);
  const agent = R && R.agents.find(a => a.code.toLowerCase() === t || a.code.toLowerCase().endsWith(t));
  if (agent) return followAgent(agent.id);
  const hit = S.data.problems.find(p => humanPlace(p.place).toLowerCase().includes(t) || ptext(p.title).toLowerCase().includes(t) || p.place.toLowerCase().includes(t));
  if (hit && S.data.bySeg.has(hit.segment)) { if (S.scale === 'planet' || S.scale === 'region') S.map.jumpTo({ center: S.data.bySeg.get(hit.segment).coord, zoom: 15, pitch: 55 }); return focusSegment(hit.segment); }
  toast(T('Nothing matches in CORE’s places, missions, agents or recorded problems (no external geocoding).', 'Rien ne correspond dans les lieux, missions, agents ou problèmes enregistrés de CORE (pas de géocodage externe).'));
}

// ---------- journey start ----------
// Explorer: the whole Earth under the CORE Intelligence bar, waiting for the person. No destination, agent,
// investigation or microphone is chosen on their behalf; the guided tour and deep links remain separate entry points.
function enterExplorer() { document.body.classList.add('ea-explore'); document.dispatchEvent(new CustomEvent('core:explore')); }
async function start() {
  S.spinning = false; $('ea-hero').classList.add('out'); $('ea-vignette').classList.add('out'); setTimeout(() => { $('ea-hero').hidden = true; }, 600);
  S.map.setPadding({ left: 0, right: 0, top: 0, bottom: 0 });
  $('ea-scales').hidden = false; $('ea-tools').hidden = false; $('ea-legend').hidden = false;
  enterExplorer();
  await fly({ center: [S.map.getCenter().lng, 22], zoom: innerWidth < 700 ? 1.05 : 1.65, pitch: 0, bearing: 0 }, 1100);
  S.scale = 'planet'; renderScales();
}

// Relief is switched off while the 3D layer is in use (street level, traffic replay): SoMa is flat and the 3D layer
// would otherwise sit under the terrain mesh. Restored when no reason remains.
const terrainOff = new Set();
function terrain(reason, off) {
  if (off) { if (!terrainOff.size) { S.savedTerrain = S.map.getTerrain?.() || null; if (S.savedTerrain) S.map.setTerrain(null); } terrainOff.add(reason); }
  else { terrainOff.delete(reason); if (!terrainOff.size && S.savedTerrain) { S.map.setTerrain(S.savedTerrain); S.savedTerrain = null; } }
}
// ---------- 3D scene (shared by street level and city-scale traffic) ----------
let lib = null;
async function ensureScene() {
  lib = lib || await Promise.all([import('./scene3d.mjs'), import('./avatar3d.mjs'), import('./agents3d.mjs')]);
  const [{ createScene3D, toLngLat, toLocal }, , A3] = lib;
  if (!S.scene) {
    const e = S.data.bySeg.get(S.data.byId.get(FLAGSHIP).segment), origin = e.coord;
    S.scene = createScene3D(maplibregl, { origin, quality: S.quality === 'high' ? 'high' : 'balanced' });
    S.map.addLayer(S.scene.layer, 'marker-halo'); S.scene.state.altitude = 0;
    S.scene.setTrees(S.data.trees.filter(t => Math.hypot((t.geometry.coordinates[0] - origin[0]) * 88000, (t.geometry.coordinates[1] - origin[1]) * 111000) < 420));
    S.crowd = A3.createCrowd(S.scene, S.quality === 'high' ? 'high' : 'balanced'); S.toLocal = ll => toLocal(origin, ll); S.toLngLat = (x, z) => toLngLat(origin, x, z);
  }
  return S.scene;
}
const hint = () => (matchMedia('(pointer: coarse)').matches ? T('Joystick to walk · come close to an agent to talk', 'Joystick pour marcher · approchez un agent pour lui parler') : T('W/↑ walk · A/D turn · Shift run · Space jump · V vehicle · C view · E talk to the nearest agent', 'W/↑ avancer · A/D tourner · Maj courir · Espace sauter · V véhicule · C vue · E parler à l’agent le plus proche'));
const camLabel = () => (S.cam === 'third' ? T('View: 3rd person', 'Vue : 3e personne') : T('View: 1st person', 'Vue : 1re personne'));
const talkLabel = () => { const a = S.nearAgent && S.civ?.byId.get(S.nearAgent); return a ? T(`Talk to ${a.code} (E)`, `Parler à ${a.code} (E)`) : T('Talk to an agent (E)', 'Parler à un agent (E)'); };
async function enterHuman() {
  if (S.mode === 'human' || !STREET_LEVEL) return; // street level is dormant in the Earth-first product (src/features.mjs)
  if (S.quality === 'low') { toast(T('“Light” quality: the street-level 3D view is off. Everything stays available through the panels.', 'Qualité « Économe » : la vue 3D à hauteur humaine est désactivée. Tout reste accessible via les panneaux.')); return; }
  $('ea-human').disabled = true; $('ea-human').textContent = T('Loading the scene…', 'Chargement de la scène…');
  try {
    await ensureScene(); const AV = lib[1];
    const e = S.data.bySeg.get(S.data.byId.get(FLAGSHIP).segment), alongRad = e.along * Math.PI / 180;
    const me = CFG.load(); S.me = me;
    const avatar = await AV.buildAvatar(me.appearance); S.scene.setAvatar(avatar); S.avatar = avatar;
    const back = [-Math.sin(alongRad) * 26 + Math.cos(alongRad) * 11, Math.cos(alongRad) * 26 + Math.sin(alongRad) * 11];
    S.pos = back; S.heading = e.along; avatar.root.position.set(back[0], 0, back[1]); avatar.root.rotation.y = Math.PI - S.heading * Math.PI / 180;
    S.mode = 'human'; S.scale = 'human'; renderScales();
    $('ea-hud').hidden = false; $('ea-panel').hidden = true; $('ea-human').hidden = true;
    $('ea-me').innerHTML = `<i style="${CFG.chipStyle(me.appearance)}"></i><b>${esc(me.identity.pseudonym || T('You', 'Vous'))}</b>`;
    $('ea-hint').textContent = hint(); $('ea-cam').textContent = camLabel(); $('ea-talk').textContent = talkLabel();
    if (S.layer && S.layer.mode === 'real') setLayer('hybrid');
    S.map.keyboard.disable(); S.map.dragPan.disable();
    terrain('human', true);
    await fly(camFor(), 2600);
    S.buildings = S.scene.refreshBuildings(); S.humanReady = true;
    S.scene.state.onFrame = tick; J.mark('world', { problemId: FLAGSHIP });
    toast(T('You are on Folsom Street, in SoMa. The holograms around you are CORE software agents at work, not people.', 'Vous êtes sur Folsom Street, dans SoMa. Les hologrammes autour de vous sont des agents logiciels CORE au travail, pas des personnes.'));
  } catch (err) {
    console.error(err); toast(T(`The 3D view could not start (${err.message}). The map and panels remain available.`, `La vue 3D n’a pas pu démarrer (${err.message}). La carte et les panneaux restent disponibles.`));
  } finally { $('ea-human').disabled = false; $('ea-human').textContent = T('Walk at street level', 'Descendre à hauteur humaine'); }
}
function toggleCar() {
  if (S.mode !== 'human' || !S.humanReady) return;
  S.car ||= createVehicle(S.scene);
  if (!S.car.state.on) { S.car.enter(S.pos, S.heading); toast(T('Prototype vehicle (V to get out): a demonstration toy, not a traffic simulation. Buildings and agents stop it.', 'Véhicule prototype (V pour descendre) : un jouet de démonstration, pas une simulation de trafic. Bâtiments et agents l’arrêtent.')); }
  else { const o = S.car.exit(); if (!S.scene.blocked(o.pos[0], o.pos[1])) S.pos = o.pos; S.heading = o.heading; S.avatar.root.visible = true; }
}
function leaveHuman() {
  if (S.car?.state.on) toggleCar();
  if (S.mode !== 'human') return; S.mode = 'map'; S.humanReady = false; $('ea-hud').hidden = true; terrain('human', false); S.scene.setAvatar(null); S.scene.refreshBuildings(0); S.scene.state.onFrame = null;
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
  if (S.car?.state.on) {
    S.car.step(dt, { fwd, turn }, (x, z, pad) => S.scene.blocked(x, z, pad), (x, z) => (S.layer?.mode !== 'real' ? S.crowd?.nearest([x, z])?.d : null) ?? 99);
    S.pos = [...S.car.state.pos]; S.heading = S.car.state.heading; S.avatar.root.visible = false; S.crowd?.update(dt, reduced());
    S.map.jumpTo({ center: S.toLngLat(S.pos[0], S.pos[1]), zoom: 20.4, pitch: 72, bearing: S.heading }); return;
  }
  if (turn) S.heading = (S.heading + turn * 85 * dt + 360) % 360;
  if (Math.abs(fwd) > 0.05) {
    const sp = (run ? 3.4 : 1.45) * Math.sign(fwd) * Math.min(1, Math.abs(fwd)), b = S.heading * Math.PI / 180;
    const nx = S.pos[0] + Math.sin(b) * sp * dt, nz = S.pos[1] - Math.cos(b) * sp * dt;
    const other = S.layer?.mode !== 'real' ? S.crowd?.nearest([nx, nz]) : null, bump = other && other.d < 0.7 && other.d < (S.crowd.nearest(S.pos)?.d ?? 9);
    if (!S.scene.blocked?.(nx, nz) && !bump) S.pos = [nx, nz];
    S.avatar.play(run ? 'Jog_Fwd_Loop' : 'Walk_Loop', 0.25);
  } else S.avatar.play(S.nearAgent ? 'Idle_Talking_Loop' : 'Idle_Loop', 0.4);
  if (S.jump != null) { S.jump += dt; if (S.jump > 0.62) S.jump = null; }
  const hop = S.jump != null ? 4 * 0.42 * (S.jump / 0.62) * (1 - S.jump / 0.62) : 0; // ballistic arc; the CC0 clip set has no jump animation
  S.avatar.root.position.set(S.pos[0], hop, S.pos[1]); S.avatar.root.rotation.y = Math.PI - S.heading * Math.PI / 180;
  if (S.avatar.model) S.avatar.model.visible = S.cam !== 'first';
  S.crowd?.update(dt, reduced());
  const nb = S.layer?.mode !== 'real' ? S.crowd?.nearest(S.pos) : null, near = nb && (nb.d < 6 || (nb.id === S.nearAgent && nb.d < 12)) ? nb.id : null;
  if (near !== S.nearAgent) { S.nearAgent = near; $('ea-talk').disabled = !near; $('ea-talk').textContent = talkLabel(); const a = near && S.civ.byId.get(near);
    if (a) toast(`${a.code} · ${AT(a, 'role')}: ${L(S.civ.activity(near).label)}. ${T('(E to open its card)', '(E pour ouvrir sa fiche)')}`); }
  S.map.jumpTo(camFor());
}

// ---------- wiring ----------
function wire() {
  $('ea-start').onclick = start;
  // The skip link targets a button hidden behind the hero: open the problem list directly (keyboard, no 3D needed).
  document.querySelector('a.skip')?.addEventListener('click', e => { e.preventDefault(); showProblems(); if (!$('ea-panel').hidden) $('ea-panel').focus(); });
  $('ea-human').onclick = () => goScale('human');
  $('ea-up').onclick = async () => { leaveHuman(); await goScale('city'); openMission(FLAGSHIP_MISSION); };
  $('ea-cam').onclick = () => { S.cam = S.cam === 'third' ? 'first' : 'third'; $('ea-cam').textContent = camLabel(); $('ea-cam').setAttribute('aria-pressed', String(S.cam === 'first')); };
  $('ea-talk').onclick = () => { if (S.nearAgent) showAgent(S.nearAgent); };
  $('ea-quality').value = S.quality;
  $('ea-quality').onchange = e => { const before = S.quality; S.quality = e.target.value;
    if ((before === 'high') !== (S.quality === 'high')) toast(T('Relief turns on or off at the next page load (“High” quality only).', 'Le relief s’active ou se désactive au prochain chargement de la page (qualité « Haute » seulement).')); if (S.scene) { S.scene.setQuality(S.quality === 'high' ? 'high' : 'balanced'); if (S.quality === 'low') { $('ea-up').click(); } else if (S.mode === 'human') S.buildings = S.scene.refreshBuildings(); } };
  $('ea-noticed-btn').onclick = () => { revealMap(); showContribute(); };
  $('ea-problems-btn').onclick = () => { if (!$('ea-hero').hidden) revealMap(); showProblems(); };
  $('ea-layer-help').onclick = () => { const v = $('ea-layer-intro'); if (v.hidden) layerIntro(S.layer?.mode || 'real', true); else { v.hidden = true; $('ea-layer-help').setAttribute('aria-expanded', 'false'); } };
  // What works today: working / experimental / long-term vision, for anyone seeing CORE for the first time (also #status).
  $('ea-status-btn').onclick = () => { const a = $('ea-status'); a.hidden = !a.hidden; $('ea-status-btn').setAttribute('aria-expanded', String(!a.hidden)); if (!a.hidden) a.focus(); };
  $('ea-about-btn').onclick = () => { const a = $('ea-about'); a.hidden = !a.hidden; $('ea-about-btn').setAttribute('aria-expanded', String(!a.hidden)); };
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { $(b.dataset.close).hidden = true; });
  $('ea-demo-choice').addEventListener('click', e => { const b = e.target.closest('[data-demo-mode]'); if (!b) return; $('ea-demo-choice').hidden = true; if (b.dataset.demoMode !== 'exit') launchDemo(b.dataset.demoMode); else S.demoReturn?.focus?.(); });
  $('ea-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (globalThis.CORE_INTELLIGENCE) globalThis.CORE_INTELLIGENCE.submit(e.target.value); else search(e.target.value); } });
  addEventListener('keydown', e => {
    if (e.target.closest?.('input, textarea, select')) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { for (const id of ['ea-demo-choice', 'ea-status', 'ea-layer-intro', 'ea-about', 'ea-list', 'ea-panel']) if (!$(id).hidden) { $(id).hidden = true; return; } }
    if (S.mode !== 'human') return;
    if (k === 'c') $('ea-cam').click(); else if (k === 'v') toggleCar(); else if (k === 'e' && S.nearAgent && !S.car?.state.on) $('ea-talk').click(); else if (k === ' ') { e.preventDefault(); if (S.jump == null && !reduced()) S.jump = 0; } else { S.keys.add(k === 'shift' ? 'shift' : k); if (k.startsWith('arrow')) e.preventDefault(); }
  });
  addEventListener('keyup', e => S.keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => S.keys.clear());
  const joy = $('ea-joy'), knob = joy.querySelector('i'); let jid = null;
  joy.addEventListener('pointerdown', e => { jid = e.pointerId; joy.setPointerCapture(jid); });
  joy.addEventListener('pointermove', e => { if (e.pointerId !== jid) return; const r = joy.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2), l = Math.max(1, Math.hypot(x, y)); S.joy = { x: x / l, y: y / l }; knob.style.transform = `translate(${S.joy.x * 30}px, ${S.joy.y * 30}px)`; });
  const end = () => { jid = null; S.joy = { x: 0, y: 0 }; knob.style.transform = ''; }; joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
}

// ---------- Real Earth / CORE World / Hybrid View ----------
const LAYER_KEY = 'core.world.layer', INTRO_KEY = 'core.layerintro.v1';
const LAYER_TEXT = {
  real: [['Real Earth', 'Terre réelle'], ['The physical planet: real geography, public data and the problems recorded from it. Markers are coloured by level of evidence: observed, potential risk, hypothesis.', 'La planète physique : géographie réelle, données publiques et problèmes enregistrés à partir d’elles. Les marqueurs sont colorés selon le niveau de preuve : observé, risque potentiel, hypothèse.']],
  agents: [['CORE World', 'Monde CORE'], ['The parallel research civilisation: holographic software agents (not people), their teams, mission centres and the work flowing between them. Bright = assigned to a task; dim = idle. It is a working environment, not a second physical city.', 'La civilisation de recherche parallèle : des agents logiciels holographiques (pas des personnes), leurs équipes, leurs centres de mission et le travail qui circule entre eux. Lumineux = affecté à une tâche ; sombre = inactif. C’est un environnement de travail, pas une seconde ville physique.']],
  hybrid: [['Hybrid View', 'Vue hybride'], ['Both together: see where the agents work on physical-world problems, at the evidence, around Folsom Street, in virtual meeting points.', 'Les deux ensemble : voyez où les agents travaillent sur des problèmes du monde physique : près des preuves, autour de Folsom Street, à des points de réunion virtuels.']] };
function layerIntro(m, force = false) {
  let seen = []; try { seen = JSON.parse(localStorage.getItem(INTRO_KEY) || '[]'); } catch {}
  if (!force && seen.includes(m)) return;
  const [title, text] = LAYER_TEXT[m], v = $('ea-layer-intro');
  v.innerHTML = `<b>${esc(T(...title))}</b><p>${esc(T(...text))}</p><button type="button" class="ghost small" data-intro-ok>${T('Got it', 'Compris')}</button>`;
  v.hidden = false; $('ea-layer-help').setAttribute('aria-expanded', 'true');
  v.querySelector('[data-intro-ok]').onclick = () => { v.hidden = true; $('ea-layer-help').setAttribute('aria-expanded', 'false'); };
  try { localStorage.setItem(INTRO_KEY, JSON.stringify([...new Set([...seen, m])])); } catch {}
  clearTimeout(layerIntro.t); if (!force) layerIntro.t = setTimeout(() => { v.hidden = true; }, 9000);
}
function setLayer(m, { intro = true } = {}) {
  if (!S.layer) return; const prev = S.layer.mode; S.layer.setMode(m); try { localStorage.setItem(LAYER_KEY, m); } catch {}
  document.querySelectorAll('#ea-layers [data-layer]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.layer === m)));
  if (S.crowd) S.crowd.visible = m !== 'real';
  const g = S.scene?.world?.getObjectByName('core-agents'); if (g) g.visible = m !== 'real';
  for (const mk of S.plates?.values() || []) mk.getElement().hidden = m === 'real';
  if (S.urban) for (const id of ['civ-agents', 'civ-agents-glow', 'civ-agents-label', 'civ-links']) if (S.map.getLayer(id)) S.map.setLayoutProperty(id, 'visibility', 'none');
  document.body.dataset.layer = m;
  if (intro && prev !== m && !S.demo?.state.running) layerIntro(m);
}

// ---------- panels ----------
function panel(kind, id, html) {
  const same = S.panelKind?.kind === kind && S.panelKind?.id === id; S.panelKind = { kind, id }; $('ea-panel-body').innerHTML = html; if (!same) $('ea-panel').scrollTop = 0; $('ea-panel').hidden = false; $('ea-human').hidden = kind !== 'problem' || id !== FLAGSHIP || S.mode === 'human';
  $('ea-panel').classList.remove('le-enter'); void $('ea-panel').offsetWidth; $('ea-panel').classList.add('le-enter');
}
const showAgent = id => S.urban?.catalog.agents.some(a => a.id === id) ? S.urban.agent(id) : panel('agent', id, CP.agentHTML(S.civ, id));
const showMission = id => panel('mission', id, (id === FLAGSHIP_MISSION ? `<button type="button" class="primary" data-urban="workbench">${T('Run an editable transport model', 'Exécuter un modèle de transport modifiable')}</button>` : '') + CP.missionHTML(S.civ, id));
const showActivity = () => panel('activity', null, CP.activityHTML(S.civ, CIV.state()));
const showEvent = seq => panel('event', seq, CP.eventHTML(S.civ, seq));
const showHierarchy = () => panel('hierarchy', null, CP.hierarchyHTML(S.civ));
const showTeam = id => panel('team', id, CP.teamHTML(S.civ, id));
async function openMission(id) {
  const m = S.civ?.M.get(id); if (!m) return; revealMap(); if (S.layer?.mode === 'real') setLayer('hybrid');
  showMission(id); history.replaceState(null, '', `#mission=${encodeURIComponent(id)}`);
  if (m.center && S.mode !== 'human') { const cam = { center: m.center, zoom: 15.6, pitch: 58, bearing: -40, padding: sidePad() }; reduced() ? S.map.jumpTo(cam) : S.map.easeTo({ ...cam, duration: 1400 }); }
}
const sidePad = () => ({ left: 0, top: 0, bottom: 0, right: innerWidth > 860 ? Math.min(480, innerWidth * 0.36) : 0 });

// Problems & missions: every domain CORE covers, with its maturity, in one place.
function problemsHTML() {
  const R = S.civ, all = [...R.M.values()], ORDER = ['active', 'exploratory', 'demo', 'planned'];
  const byDomain = Object.keys(DOMAINS).map(d => [d, all.filter(m => m.domain === d || (d === 'climate' && m.id === 'mission.sf.housing-resilience'))]).filter(([, ms]) => ms.length);
  const counts = ORDER.map(c => [c, all.filter(m => (m.category || 'exploratory') === c).length]);
  return `<header class="pp-head"><p class="le-eyebrow">${T('Problem intelligence · San Francisco', 'Intelligence des problèmes · San Francisco')}</p><h2 id="pp-title">${T('Problems & missions', 'Problèmes et missions')}</h2>
    <p class="pp-lede">${T('Each mission is one real problem, investigated by a team of CORE agents on dated public data. Choose one to see the evidence, the agents’ work and how you can help.', 'Chaque mission est un problème réel, examiné par une équipe d’agents CORE sur des données publiques datées. Choisissez-en une pour voir les preuves, le travail des agents et comment vous pouvez aider.')}</p>
    <p class="fine">${counts.map(([c, n]) => `${n} · ${E(CATEGORY[c])}`).join(': ')}. ${T('San Francisco is the first city: the same method is designed for any place with open data.', 'San Francisco est la première ville : la même méthode est conçue pour tout lieu doté de données ouvertes.')}</p></header>
    ${byDomain.map(([d, ms]) => `<div class="pp-sec cv-domain"><h3>${E(DOMAINS[d])}</h3><ul class="cv-mlist">${ms.sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category)).map(m => { const st = R.S.missions[m.id];
      return `<li><button type="button" class="cv-mbtn" data-mission="${esc(m.id)}"><span class="le-badge cv-cat" data-cat="${esc(m.category || 'exploratory')}">${E(CATEGORY[m.category || 'exploratory'])}</span><b>${m.flagship ? '★ ' : ''}${E(m.title)}</b><span class="fine">${E(m.why || m.question)}</span><span class="fine">${m.findings.filter(f => f.status !== 'gap').length} ${T('findings', 'constats')} · ${m.findings.filter(f => f.status === 'gap').length} ${T('gaps', 'lacunes')} · ${m.simulation ? T('recorded simulation', 'simulation enregistrée') : T('no simulation', 'pas de simulation')} · ${esc(CP.stage(st.stage))}</span></button></li>`; }).join('')}</ul></div>`).join('')}
    <div class="pp-sec"><p><button type="button" class="small" data-activity="1">${T('See all agent activity', 'Voir toute l’activité des agents')}</button> <button type="button" class="small" data-hierarchy="1">${T('How the agents are organised', 'Organisation des agents')}</button></p></div>`;
}
const E = x => esc(L(x));
function showProblems() { if (!S.civ) return toast(T('The CORE civilisation is still loading…', 'La civilisation CORE se charge encore…')); revealMap(); if (S.layer?.mode === 'real') setLayer('hybrid'); panel('problems', null, problemsHTML()); history.replaceState(null, '', '#problems'); }

// ---------- recorded SUMO scenarios (reversible overlay) ----------
// One fixed camera for every scenario, so before/after line up; close enough for the 3D cars and buses to read.
const SIM_CAM = { center: [-122.4050, 37.7790], zoom: 18.0, pitch: 62, bearing: 48 };
async function showSimulation(id = 'S0', { camera = true } = {}) {
  try {
    S.mob ||= await SCN.loadMobility();
    if (!S.mob.results.scenarios.some(x => x.id === id)) id = 'S0';
    if (!S.scn) {
      S.scn = SCN.createScenarioLayer(S.map, S.mob);
      if (S.quality !== 'low') { await ensureScene(); S.traffic = SCN.createTraffic3D(S.scene, S.toLocal); }
      S.scn.state.onFrame = vs => { S.trafficCounts = S.traffic?.update(vs); };
      S.scn.state.onEnd = () => { if (S.panelKind?.kind === 'simulation') renderSimulation(); };
    }
    if (S.traffic) { S.traffic.group.visible = true; terrain('traffic', true); }
    await S.scn.show(id); renderSimulation();
    if (camera && S.mode !== 'human') { revealMap(); const cam = { ...SIM_CAM, padding: sidePad() }; reduced() ? S.map.jumpTo(cam) : S.map.easeTo({ ...cam, duration: 1400 }); S.scale = 'city'; renderScales(); }
    history.replaceState(null, '', `#sim=${encodeURIComponent(id)}`);
  } catch (e) { console.error(e); toast(T(`Simulation unavailable: ${e.message}`, `Simulation indisponible : ${e.message}`)); }
}
const renderSimulation = () => panel('simulation', S.scn.state.scenario, SCN.panelHTML(S.mob, S.scn.state.scenario, S.scn.state.playing));
async function playSimulation(id = 'S0') { await showSimulation(id); S.scn?.render(0); S.scn?.play(); renderSimulation(); }
function hideSimulation({ quiet = false } = {}) { S.scn?.hide(); S.traffic?.update([]); terrain('traffic', false); $('ea-panel').hidden = true; history.replaceState(null, '', location.pathname + location.search); if (!quiet) toast(T('Scenario removed: the map shows the real street again.', 'Scénario retiré : la carte montre de nouveau la rue réelle.')); }
function revealMap() { S.spinning = false; $('ea-hero').hidden = true; $('ea-vignette').hidden = true; $('ea-scales').hidden = false; $('ea-tools').hidden = false; $('ea-legend').hidden = false; S.map.setPadding({ left: 0, right: 0, top: 0, bottom: 0 }); enterExplorer(); }
async function flyTo(center, zoom) { if (S.mode === 'human') leaveHuman(); revealMap(); await fly({ center, zoom, pitch: zoom > 14 ? 58 : 40, bearing: -30 }, 2600); syncScale(); }
function followAgent(id) { if (!S.civ?.byId.has(id)) return; revealMap(); if (S.layer?.mode === 'real') setLayer('hybrid'); S.follow = id; S.map.jumpTo({ center: posOf(id), zoom: Math.max(S.map.getZoom(), 17), pitch: 60 }); showAgent(id); }

// ---------- ask the research team (real multi-agent investigation) ----------
const ROLE_NAME = { coordinator: ['Coordinator', 'Coordination'], evidence: ['Evidence researcher', 'Recherche de preuves'], analyst: ['Domain analyst', 'Analyse du domaine'], simulation: ['Simulation specialist', 'Spécialiste de la simulation'], critic: ['Scientific critic', 'Critique scientifique'], synthesis: ['Synthesis', 'Synthèse'] };
const PROV = s => s.provenance === 'local-model' ? T(`local model${s.model ? ` (${s.model})` : ''}`, `modèle local${s.model ? ` (${s.model})` : ''}`) : s.tool === 'verifier' ? T('deterministic verifier', 'vérificateur déterministe') : T('deterministic tool', 'outil déterministe');
const SSTAT = { validated: ['validated', 'validé'], rejected: ['rejected by validation', 'écarté par la validation'], unavailable: ['not run: local model unavailable', 'non exécuté : modèle local indisponible'], done: ['done', 'fait'], 'not-applicable': ['not applicable', 'sans objet'], passed: ['no issue found', 'aucun problème trouvé'], flagged: ['issues flagged', 'problèmes signalés'], skipped: ['skipped (no analysis)', 'ignoré (pas d’analyse)'] };
function stepHTML(s) {
  const o = s.output || {}, a = s.agent && S.civ?.byId.get(s.agent);
  const body = s.status === 'unavailable' ? '' : s.role === 'coordinator' ? (o.subquestions || []).map(q => esc(q.question)).join('<br>')
    : s.role === 'evidence' ? `${(o.findings || []).map(f => `<b>${esc(f.id)}</b>`).join(', ')}${o.gaps?.length ? ` · ${T('gaps', 'lacunes')}: ${o.gaps.map(g => esc(g.id)).join(', ')}` : ''}`
    : s.role === 'simulation' ? (o.scenarios ? o.scenarios.map(x => `${esc(x.id)}: ${T('car', 'voiture')} ${x.carDelay[0]}±${x.carDelay[1]} s, ${T('bus', 'bus')} ${x.busTravelTime[0]}±${x.busTravelTime[1]} s`).join(' · ') : esc(T('No simulation exists for this mission.', 'Aucune simulation n’existe pour cette mission.')))
    : s.role === 'analyst' ? (o.points || []).map(p => `${esc(p.text)} <span class="fine">[${p.cites.map(esc).join(', ')}]</span>`).join('<br>')
    : s.role === 'critic' && s.tool === 'verifier' ? ((o.issues || []).map(esc).join('<br>') || esc(T('No unsupported number, overclaim or within-noise effect found.', 'Aucun chiffre non étayé, affirmation excessive ni effet dans le bruit trouvé.')))
    : s.role === 'critic' ? (o.objections || []).map(x => `<i>${esc(x.kind)}</i> · ${esc(x.text)}`).join('<br>')
    : esc(o.summary || '');
  return `<li class="inv-step" data-status="${esc(s.status)}"><div class="inv-h"><b>${esc(T(...ROLE_NAME[s.role]))}${s.tool === 'verifier' ? ` · ${T('verifier', 'vérificateur')}` : ''}</b><span class="le-badge" data-s="${s.provenance === 'local-model' ? 'local-model' : 'info'}">${esc(PROV(s))}</span><span class="fine">${esc(T(...(SSTAT[s.status] || [s.status, s.status])))}${s.ms ? ` · ${(s.ms / 1000).toFixed(1)} s` : ''}</span></div>
    ${a ? `<span class="fine">${T('Agent', 'Agent')} <a href="#" data-agent="${esc(a.id)}">${esc(a.code)}</a> · ${esc(AT(a, 'role'))}</span>` : ''}${body ? `<div class="inv-b">${body}</div>` : ''}${s.issues?.length && s.status !== 'unavailable' ? `<p class="fine cmp-err">${s.issues.map(esc).join('; ')}</p>` : ''}</li>`;
}
// Public site: no live model. A real run recorded on a local computer (scripts/investigate.mjs --out) can be replayed.
const RECORDED = { 'mission.sf.mobility': 'data/investigations/mobility-folsom.json' };
const UNAVAIL = () => (PUBLIC ? T('Local AI reasoning is unavailable on this public site: live inference runs only on a computer with a local model. Recorded research and deterministic tools remain accessible.', 'Le raisonnement local par IA est indisponible sur ce site public : l’inférence en direct ne fonctionne que sur un ordinateur doté d’un modèle local. La recherche enregistrée et les outils déterministes restent accessibles.')
  : T('Local AI reasoning is unavailable. Recorded research and deterministic tools remain accessible.', 'Le raisonnement local par IA est indisponible. La recherche enregistrée et les outils déterministes restent accessibles.'));
const answerHTML = a => `<div class="pp-sec inv-answer"><h3>${T('Draft answer: unreviewed, written by the local model', 'Réponse provisoire : non revue, écrite par le modèle local')}</h3><p>${esc(a.summary)}</p><p class="fine">${T('Established (finding ids)', 'Établi (identifiants de constats)')}: ${a.established.map(esc).join(', ') || '—'}<br>${T('Uncertain', 'Incertain')}: ${a.uncertain.map(esc).join(' · ') || '—'}</p></div>`;
async function showRecorded(mid) {
  const url = RECORDED[mid]; if (!url) return;
  try { const r = await fetch(url); if (!r.ok) throw Error(`HTTP ${r.status}`); const rec = await r.json();
    $('inv-state').textContent = T(`Recorded run, replayed: produced on ${rec.startedAt.slice(0, 10)} by ${rec.model} on a local computer in ${Math.round(rec.ms / 1000)} s. This is a replay, not live inference.`, `Exécution enregistrée, rejouée : produite le ${rec.startedAt.slice(0, 10)} par ${rec.model} sur un ordinateur local en ${Math.round(rec.ms / 1000)} s. C’est une relecture, pas une inférence en direct.`);
    $('inv-q').value = rec.question; $('inv-steps').innerHTML = rec.steps.map(stepHTML).join('');
    $('inv-out').innerHTML = rec.answer ? answerHTML(rec.answer) : ''; S.recordedInvestigation = { mission: mid, steps: rec.steps.length, model: rec.model };
  } catch (err) { $('inv-state').textContent = `${T('Recorded run unavailable', 'Exécution enregistrée indisponible')}: ${err.message}`; }
}
function showInvestigate(mid, preset = '') {
  const m = S.civ?.M.get(mid); if (!m) return;
  const SUGG = mid === 'mission.sf.mobility' ? [T('What could reduce bus delays on Folsom Street, and how sure can we be?', 'Qu’est-ce qui pourrait réduire les retards des bus sur Folsom Street, et avec quelle certitude ?'), T('Why did the bus lane perform badly in the model?', 'Pourquoi la voie bus a-t-elle mal fonctionné dans le modèle ?')]
    : mid === 'mission.sf.housing-resilience' ? [T('Are affordable housing projects being built in flood-risk areas?', 'Des logements abordables sont-ils construits en zone inondable ?'), T('What evidence is missing to explain displacement pressure?', 'Quelles preuves manquent pour expliquer la pression de déplacement ?')] : [T('What is established and what is still unknown?', 'Qu’est-ce qui est établi et qu’est-ce qui reste inconnu ?')];
  panel('investigate', mid, `<header class="pp-head"><p class="le-eyebrow">${T('Ask the research team', 'Poser une question à l’équipe')}</p><h2 id="pp-title">${E(m.title)}</h2>
    <p class="fine">${T('Six roles work on your question: a coordinator, an evidence researcher, a domain analyst, a simulation specialist, a scientific critic and a synthesis agent. Four use the local language model on this computer (if one runs, ~1 minute); the others are deterministic tools. Model text is in English and is never accepted without validation. Your question stays in this browser.', 'Six rôles travaillent sur votre question : coordination, recherche de preuves, analyse du domaine, spécialiste de la simulation, critique scientifique et synthèse. Quatre utilisent le modèle de langage local de cet ordinateur (s’il tourne, ~1 minute) ; les autres sont des outils déterministes. Le texte du modèle est en anglais et n’est jamais accepté sans validation. Votre question reste dans ce navigateur.')}</p></header>
    <form class="form" id="inv-form"><label>${T('Your question', 'Votre question')} <textarea id="inv-q" maxlength="300" required>${esc(preset || SUGG[0])}</textarea></label>
      <div class="le-row">${SUGG.map(q => `<button type="button" class="ghost small" data-inv-sugg>${esc(q)}</button>`).join('')}</div>
      <div class="le-row"><button type="submit" class="primary">${T('Run the investigation', 'Lancer l’investigation')}</button>${RECORDED[mid] ? `<button type="button" data-inv-rec>${T('View a recorded run', 'Voir une exécution enregistrée')}</button>` : ''}</div></form>
    <p class="fine" id="inv-state" role="status"></p><ol class="inv-steps" id="inv-steps"></ol><div id="inv-out"></div>
    <p><a href="#" data-mission="${esc(mid)}">← ${T('Back to the mission', 'Retour à la mission')}</a></p>`);
  $('ea-panel-body').querySelectorAll('[data-inv-sugg]').forEach(b => b.onclick = () => { $('inv-q').value = b.textContent; });
  $('ea-panel-body').querySelector('[data-inv-rec]')?.addEventListener('click', () => showRecorded(mid));
  $('inv-form').onsubmit = async e => { e.preventDefault(); const q = $('inv-q').value.trim(); if (!q || S.investigating) return;
    S.investigating = true; const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; $('inv-steps').innerHTML = ''; $('inv-out').innerHTML = '';
    const model = await CIV.localModel().catch(() => null);
    $('inv-state').textContent = model ? T(`Local model ${model} found on this computer. Working… (this can take about a minute)`, `Modèle local ${model} trouvé sur cet ordinateur. Travail en cours… (environ une minute)`) : UNAVAIL();
    try {
      const res = await CIV.runInvestigation(mid, q, s => { const li = document.createElement('div'); li.innerHTML = stepHTML(s); $('inv-steps')?.append(li.firstElementChild); });
      S.lastInvestigation = res;
      $('inv-state').textContent = res.runtime === 'unavailable' ? UNAVAIL() : T(`Done in ${Math.round(res.ms / 1000)} s with ${res.model}. Each step is recorded in the mission log.`, `Terminé en ${Math.round(res.ms / 1000)} s avec ${res.model}. Chaque étape est enregistrée dans le journal de la mission.`);
      $('inv-out').innerHTML = res.answer ? answerHTML(res.answer)
        : `<div class="pp-unc"><b>${T('No validated answer', 'Aucune réponse validée')}</b><p>${res.runtime === 'unavailable' && PUBLIC ? esc(T('This public site never runs a language model and never contacts your computer. The evidence and simulation steps above ran in your browser; use “View a recorded run” to replay a real local-model investigation.', 'Ce site public n’exécute jamais de modèle de langage et ne contacte jamais votre ordinateur. Les étapes de preuves et de simulation ci-dessus ont fonctionné dans votre navigateur ; utilisez « Voir une exécution enregistrée » pour rejouer une vraie investigation par modèle local.')) : res.runtime === 'unavailable' ? esc(T('To enable local reasoning, install Ollama and run: ollama pull qwen3:8b (about 5 GB, free, runs on this computer). The evidence and simulation steps above ran without it.', 'Pour activer le raisonnement local, installez Ollama puis lancez : ollama pull qwen3:8b (environ 5 Go, gratuit, sur cet ordinateur). Les étapes de preuves et de simulation ci-dessus ont fonctionné sans lui.')) : esc(T('A model step was rejected by validation: CORE shows no answer rather than an unchecked one.', 'Une étape du modèle a été écartée par la validation : CORE n’affiche aucune réponse plutôt qu’une réponse non vérifiée.'))}</p></div>`;
    } catch (err) { $('inv-state').textContent = `${T('Investigation failed', 'Échec de l’investigation')}: ${err.message}`; }
    finally { S.investigating = false; btn.disabled = false; } };
}

// ---------- contribute: observe → (structure) → edit → keep private / share with consent ----------
function showContribute(mid = null) {
  const R = S.civ; if (!R) return toast(T('The CORE civilisation is still loading…', 'La civilisation CORE se charge encore…'));
  const missions = [...R.M.values()].map(m => ({ id: m.id, title: m.title })), place = S.map.getZoom() >= 15 ? S.map.getCenter().toArray().map(x => +x.toFixed(5)) : null;
  panel('contribute', mid, `<header class="pp-head"><p class="le-eyebrow">${T('Contribute', 'Contribuer')}</p><h2 id="pp-title">${T('I noticed something', 'J’ai remarqué quelque chose')}</h2>
    <p class="pp-lede">${T('Describe what you have seen, in your own words. CORE can help structure it; you then decide whether it stays private or is shared with a mission.', 'Décrivez ce que vous avez vu, avec vos mots. CORE peut vous aider à le structurer ; vous décidez ensuite s’il reste privé ou s’il est partagé avec une mission.')}</p></header>
    <form class="form" id="nt-form"><label>${T('Mission', 'Mission')} <select id="nt-m0"><option value="">${T('Let CORE suggest one', 'Laisser CORE en suggérer une')}</option>${missions.map(x => `<option value="${esc(x.id)}"${x.id === mid ? ' selected' : ''}>${E(x.title)}</option>`).join('')}</select></label>
      <label>${T('What I noticed', 'Ce que j’ai remarqué')} <textarea id="nt-text" maxlength="1000" required placeholder="${esc(T('E.g. In the morning, buses get stuck on Folsom between 5th and 6th; maybe because of cars turning right.', 'Ex. : Le matin, les bus restent bloqués sur Folsom entre la 5th et la 6th ; peut-être à cause des voitures qui tournent à droite.'))}"></textarea></label>
      <p class="fine">${place ? T(`Place: the map centre (${place[1]}, ${place[0]}) will be attached.`, `Lieu : le centre de la carte (${place[1]}, ${place[0]}) sera joint.`) : T('Zoom into the place you mean to attach it.', 'Zoomez sur le lieu concerné pour le joindre.')}</p>
      <div class="le-row"><button type="submit" class="primary" data-mode="det">${T('Structure it', 'Le structurer')}</button><button type="button" id="nt-model" data-mode="model">${T('Structure with the local model', 'Structurer avec le modèle local')}</button></div></form>
    <p class="fine" id="nt-state" role="status">${T('Nothing is stored or sent at this step.', 'Rien n’est enregistré ni envoyé à cette étape.')}</p><div id="nt-out"></div>`);
  const run = async useModel => {
    const text = $('nt-text').value.trim(); if (!text) return $('nt-text').focus();
    const chosen = $('nt-m0').value || null;
    let st = CONTRIB.structure(text, { missions, findingsOf: id => R.M.get(id)?.findings || [], suggest: t => chosen || suggestMission(t, missions), place }); if (!st) return;
    st.structuredBy = 'deterministic';
    if (useModel) { $('nt-state').textContent = T('Asking the local model…', 'Interrogation du modèle local…'); const model = await CIV.localModel().catch(() => null);
      if (!model) $('nt-state').textContent = T('Local AI reasoning is unavailable: deterministic structuring was used.', 'Raisonnement local indisponible : structuration déterministe utilisée.');
      else { try { st = await CONTRIB.structureWithModel(text, { generate: ollamaJSON({ model }), missions, base: st }); if (chosen) st.mission = chosen; } catch (err) { st.modelIssue = err.message; } } }
    renderStructured(st, missions);
  };
  $('nt-form').onsubmit = e => { e.preventDefault(); run(false); };
  $('nt-model').onclick = () => run(true);
}
function renderStructured(st, missions) {
  const R = S.civ, m = st.mission && R.M.get(st.mission);
  $('nt-state').textContent = st.structuredBy === 'local-model' ? T(`Structured by the local model (${st.model}); your text is kept exactly as written. Check every field.`, `Structuré par le modèle local (${st.model}) ; votre texte est conservé tel quel. Vérifiez chaque champ.`) : T(`Structured by deterministic rules (keyword matching, not AI)${st.modelIssue ? `, the model’s answer was not usable (${st.modelIssue})` : ''}. Check every field.`, `Structuré par des règles déterministes (mots-clés, pas d’IA)${st.modelIssue ? `, la réponse du modèle était inutilisable (${st.modelIssue})` : ''}. Vérifiez chaque champ.`);
  $('nt-out').innerHTML = `<div class="pp-sec"><h3>${T('Review and edit', 'Relire et modifier')}</h3><form class="form" id="nt-next">
    <label>${T('Type', 'Type')} <select id="nt-kind">${Object.entries(CONTRIB.KINDS).map(([k, l]) => `<option value="${k}"${k === st.kind ? ' selected' : ''}>${E(l)}</option>`).join('')}</select></label>
    <label>${T('Title', 'Titre')} <input id="nt-title" maxlength="120" value="${esc(st.title)}"></label>
    <label>${T('Text', 'Texte')} <textarea id="nt-body" maxlength="1000">${esc(st.text)}</textarea></label>
    <label>${T('Mission', 'Mission')} <select id="nt-mission">${missions.map(x => `<option value="${esc(x.id)}"${x.id === st.mission ? ' selected' : ''}>${E(x.title)}</option>`).join('')}</select></label>
    ${st.related.length && m ? `<p class="fine">${T('Related findings', 'Constats liés')}: ${st.related.map(id => `<b>${esc(id)}</b> · ${esc(L(m.findings.find(f => f.id === id)?.claim || '').slice(0, 120))}`).join(' · ')}</p>` : `<p class="fine">${T('No existing finding is linked yet.', 'Aucun constat existant n’est lié pour l’instant.')}</p>`}
    ${st.missing.length ? `<div class="pp-unc"><b>${T('What would help', 'Ce qui aiderait')}</b>${st.missing.map(x => `<p>${E(x)}</p>`).join('')}</div>` : ''}
    ${st.privacy ? `<p class="cmp-err">${E(st.privacy)}</p>` : ''}
    <div class="le-row"><button type="button" id="nt-private">${T('Keep private', 'Garder privé')}</button><button type="button" class="primary" id="nt-share-ask">${T('Share with the mission…', 'Partager avec la mission…')}</button></div>
    <div id="nt-confirm" class="nt-confirm" hidden><p>${T('Sharing adds this title and text to the mission’s contribution queue in this browser. Agents will check its form (sources, numbers, personal data, links to the evidence); nothing is accepted automatically, nothing is published, and CORE has no shared server: nobody else will see it.', 'Partager ajoute ce titre et ce texte à la file des contributions de la mission, dans ce navigateur. Les agents vérifieront sa forme (sources, chiffres, données personnelles, liens avec les preuves) ; rien n’est accepté automatiquement, rien n’est publié, et CORE n’a pas de serveur partagé : personne d’autre ne le verra.')}</p>
      <label class="inline"><input type="checkbox" id="nt-consent"> ${T('I understand and choose to share it with this mission.', 'Je comprends et je choisis de le partager avec cette mission.')}</label>
      <div class="le-row"><button type="button" class="primary" id="nt-share">${T('Confirm sharing', 'Confirmer le partage')}</button><button type="button" class="ghost" id="nt-cancel">${T('Cancel', 'Annuler')}</button></div></div></form></div><div id="nt-done"></div>`;
  const val = () => ({ kind: $('nt-kind').value, title: $('nt-title').value.trim(), text: $('nt-body').value.trim() + (st.place ? `\n(${T('Place', 'Lieu')}: ${st.place[1]}, ${st.place[0]})` : ''), mission: $('nt-mission').value, place: st.place, structuredBy: st.structuredBy });
  const done = (html) => { $('nt-done').innerHTML = html; $('nt-done').scrollIntoView({ block: 'nearest' }); };
  $('nt-private').onclick = () => { const v = val(); if (!v.title || !v.text) return toast(T('Give a title and a text.', 'Donnez un titre et un texte.')); const e = STORE.save({ ...v, state: 'private', id: S.draftId }); S.draftId = e.id;
    done(`<p class="nt-ok">${T('Kept private: stored only in this browser (not encrypted, not shared). You can share it later from My CORE.', 'Gardé en privé : enregistré seulement dans ce navigateur (non chiffré, non partagé). Vous pourrez le partager plus tard depuis Mon CORE.')} <a href="me.html#contributions">${T('My contributions', 'Mes contributions')}</a> · <a href="dialogue.html">${T('Encrypted Idea Vault', 'Coffre à idées chiffré')}</a></p>`); };
  $('nt-share-ask').onclick = () => { $('nt-confirm').hidden = false; $('nt-consent').focus(); };
  $('nt-cancel').onclick = () => { $('nt-confirm').hidden = true; };
  $('nt-share').onclick = async () => { const v = val(); if (!v.title || !v.text) return toast(T('Give a title and a text.', 'Donnez un titre et un texte.'));
    if (!$('nt-consent').checked) return toast(T('Nothing is shared without your explicit choice: tick the box first.', 'Rien n’est partagé sans votre choix explicite : cochez d’abord la case.'));
    if (st.privacy && CONTRIB.structure(v.text, {}).privacy) return toast(T('Possible personal data: remove it before sharing.', 'Données personnelles possibles : retirez-les avant de partager.'));
    try { const h = await CIV.submit(v.mission, { kind: v.kind, title: v.title, text: v.text, consent: true }); const e = STORE.save({ ...v, state: 'shared', id: S.draftId, sharedAs: { mission: v.mission, id: h.id } }); S.draftId = null;
      try { const f = JSON.parse(localStorage.getItem('core.follow.v1') || '{}'); f.mission = v.mission; f.inputs = [...(f.inputs || []), { mission: v.mission, title: h.title, at: new Date().toISOString() }].slice(-20); localStorage.setItem('core.follow.v1', JSON.stringify(f)); } catch {}
      J.mark('world', { problemId: v.mission });
      done(`<p class="nt-ok">${T(`Shared with the mission as “${esc(h.title)}”. It is now in the mission’s contribution queue; the agents will check its form within about a minute of engine time.`, `Partagé avec la mission sous le titre « ${esc(h.title)} ». Il est dans la file des contributions de la mission ; les agents vérifieront sa forme en environ une minute de temps moteur.`)}</p><p><button type="button" class="small" data-mission="${esc(v.mission)}">${T('See it in the mission', 'Le voir dans la mission')}</button> <a class="btn small" href="me.html#contributions">${T('My contributions', 'Mes contributions')}</a></p>`);
      void e;
    } catch (err) { toast(err.message); } };
}

function refreshPanel(force = false) {
  const k = S.panelKind; if (!k || $('ea-panel').hidden) return;
  if (!force && $('ea-panel').contains(document.activeElement) && ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  const top = $('ea-panel').scrollTop, B = $('ea-panel-body');
  if (k.kind === 'agent') B.innerHTML = CP.agentHTML(S.civ, k.id); else if (k.kind === 'mission') B.innerHTML = CP.missionHTML(S.civ, k.id); else if (k.kind === 'activity') B.innerHTML = CP.activityHTML(S.civ, CIV.state());
  else if (k.kind === 'hierarchy') B.innerHTML = CP.hierarchyHTML(S.civ); else if (k.kind === 'team') B.innerHTML = CP.teamHTML(S.civ, k.id); else if (k.kind === 'problems' && force) B.innerHTML = problemsHTML();
  else if (force && k.kind === 'problem') B.innerHTML = problemPanel(k.id); else if (force && k.kind === 'simulation') return void renderSimulation(); else if (force && k.kind === 'event') B.innerHTML = CP.eventHTML(S.civ, k.id);
  else if (force && k.kind === 'contribute') return void showContribute(k.id); else if (force && k.kind === 'investigate' && !S.investigating) return void showInvestigate(k.id);
  $('ea-panel').scrollTop = top;
}
const posOf = id => S.ground ? S.ground.pos(id) : S.civ.posOf(id); // drawn on the validated pedestrian network
function civTick() {
  const R = S.civ; if (!R) return; if (!S.urban) S.layer?.update();
  if (S.follow && S.mode !== 'human') S.map.easeTo({ center: posOf(S.follow), duration: 240 });
  if (S.mode === 'human' && S.crowd && S.toLocal) {
    const list = S.layer.agents.map(a => { const [x, z] = S.toLocal(posOf(a.id)), act = R.activity(a.id); return { id: a.id, x, z, state: act.state, dept: a.department, body: a.id.length % 2 ? 'f' : 'm' }; });
    const c = S.crowd.sync(list, S.pos); S.crowdCounts = c;
    S.plates ||= new Map(); const want = new Set();
    const close = list.map(a => ({ a, d: Math.hypot(a.x - S.pos[0], a.z - S.pos[1]) })).filter(x => x.d < 25).sort((x, y) => x.d - y.d).slice(0, 6).map(x => x.a);
    for (const a of close) { want.add(a.id); let mk = S.plates.get(a.id);
      const ag = R.byId.get(a.id), html = `<span class="le-agent-id">${esc(ag.code)}</span><span class="fine">${esc(CP.stateLabel(a.state))}</span>`;
      if (!mk) { const el = document.createElement('button'); el.type = 'button'; el.className = 'ea-agent-tag'; el.onclick = () => showAgent(a.id); mk = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -96] }).setLngLat(posOf(a.id)).addTo(S.map); S.plates.set(a.id, mk); }
      const dd = Math.max(1, Math.hypot(a.x - S.pos[0], a.z - S.pos[1])); mk.setOffset([0, -Math.min(300, Math.max(40, 1900 / dd))]);
      mk.getElement().innerHTML = html; mk.setLngLat(posOf(a.id)); mk.getElement().hidden = S.layer.mode === 'real'; mk.getElement().title = `${AT(ag, 'role')} · ${L(R.activity(a.id).label)}`; }
    for (const [id, mk] of S.plates) if (!want.has(id)) { mk.remove(); S.plates.delete(id); }
  }
  const now = performance.now(); if (now - (S.lastPanel || 0) > 2000) { S.lastPanel = now; refreshPanel(); }
}
async function startCivilisation() {
  try {
    const R = await CIV.start(); S.civ = R; renderList();
    if (STREET_LEVEL) createGround(R).then(g => { S.ground = g; }).catch(e => console.warn('pedestrian network unavailable', e));
    S.layer = createAgentLayer(S.map, { runtime: R, pos: posOf, onAgent: showAgent, onHub: showAgent, onNetwork: id => { if (id === 'san-francisco') showHierarchy(); else panel('network', id, `<header class="pp-head"><h2 id="pp-title">New York</h2></header><p>${T('Cross-city missions were <b>recorded</b> in Phase 10 (replay). New York’s agent registry is not loaded in this version: no activity there is shown as real.', 'Des missions inter-villes ont été <b>enregistrées</b> en Phase 10 (relecture). Le registre d’agents de New York n’est pas chargé dans cette version : aucune activité n’y est montrée comme réelle.')}</p>`); } });
    S.layer.relabel(lang());
    const h = new URLSearchParams(location.hash.slice(1)); let m = h.get('layer'); try { m ||= localStorage.getItem(LAYER_KEY); } catch {}
    setLayer(['real', 'agents', 'hybrid'].includes(m) ? m : 'real', { intro: false });
    CIV.onChange(civTick);
    if (h.get('mission') && R.M.has(h.get('mission'))) { revealMap(); S.map.jumpTo({ center: R.M.get(h.get('mission')).center || PLACES.somaField, zoom: 15.8, pitch: 58, bearing: -40 }); S.scale = 'city'; renderScales(); if (S.layer.mode === 'real') setLayer('hybrid', { intro: false }); showMission(h.get('mission')); }
    if (h.has('problems')) { revealMap(); S.map.jumpTo({ center: PLACES.somaField, zoom: 14.6, pitch: 50, bearing: -30 }); S.scale = 'city'; renderScales(); showProblems(); }
    if (h.get('team') && R.M.has(h.get('team'))) { revealMap(); showTeam(h.get('team')); }
    if (h.get('investigate') && R.M.has(h.get('investigate'))) { revealMap(); showInvestigate(h.get('investigate')); }
    if (h.has('contribute')) { revealMap(); showContribute(R.M.has(h.get('contribute')) ? h.get('contribute') : null); }
    if (h.get('sim')) (h.get('play') ? playSimulation : showSimulation)(h.get('sim'));
    if (h.get('follow') && R.byId.has(h.get('agent'))) followAgent(h.get('agent'));
    else if (h.get('agent') && R.byId.has(h.get('agent'))) { revealMap(); S.map.jumpTo({ center: posOf(h.get('agent')), zoom: 17, pitch: 60 }); if (S.layer.mode === 'real') setLayer('hybrid', { intro: false }); showAgent(h.get('agent')); }
    S.civReady = true;
  } catch (e) { console.error(e); toast(T(`CORE civilisation unavailable: ${e.message}`, `Civilisation CORE indisponible : ${e.message}`)); }
}
function wireCiv() {
  document.querySelectorAll('#ea-layers [data-layer]').forEach(b => b.onclick = () => setLayer(b.dataset.layer));
  $('ea-panel-body').addEventListener('click', e => {
    const t = e.target.closest('[data-mission],[data-agent],[data-ev],[data-follow],[data-follow-mission],[data-speed],[data-hierarchy],[data-reason],[data-sim],[data-scn],[data-scn-play],[data-scn-off],[data-team],[data-investigate],[data-contribute],[data-activity],[data-open]'); if (!t) return;
    if (t.matches('a[href^="dialogue.html"], a[href^="report.html"], a[href^="me.html"]')) return; e.preventDefault();
    if (t.dataset.open) return void openPanel(t.dataset.open);
    if (t.dataset.sim) return void showSimulation(t.dataset.sim);
    if (t.dataset.scn) return void showSimulation(t.dataset.scn, { camera: false });
    if (t.dataset.scnPlay) { if (S.scn.state.playing) S.scn.stop(); else { if (S.scn.state.frame >= (S.scn.state.trace?.frames.length || 1) - 1) S.scn.render(0); S.scn.play(); } return void renderSimulation(); }
    if (t.dataset.scnOff) return void hideSimulation();
    if (t.dataset.team) return void showTeam(t.dataset.team);
    if (t.dataset.investigate) return void showInvestigate(t.dataset.investigate);
    if (t.dataset.contribute) return void showContribute(t.dataset.contribute);
    if (t.dataset.activity) return void showActivity();
    if (t.dataset.reason) { CIV.enableReasoning(t.dataset.reason === 'on').then(() => showActivity()); showActivity(); } else if (t.dataset.hierarchy) showHierarchy(); else if (t.dataset.mission) openMission(t.dataset.mission); else if (t.dataset.agent) showAgent(t.dataset.agent); else if (t.dataset.ev) showEvent(t.dataset.ev);
    else if (t.dataset.follow) { S.follow = S.follow === t.dataset.follow ? null : t.dataset.follow; toast(S.follow ? T('The camera follows this agent (click “Follow” again to stop).', 'La caméra suit cet agent (cliquez « Suivre » à nouveau pour arrêter).') : T('Stopped following.', 'Suivi arrêté.')); }
    else if (t.dataset.followMission) { try { const f = JSON.parse(localStorage.getItem('core.follow.v1') || '{}'); f.mission = t.dataset.followMission; f.title = L(S.civ.M.get(t.dataset.followMission)?.title); localStorage.setItem('core.follow.v1', JSON.stringify(f)); } catch {} J.mark('world', { problemId: t.dataset.followMission }); toast(T('Mission followed: it appears in My CORE.', 'Mission suivie : elle apparaît dans Mon CORE.')); }
    else if (t.dataset.speed) { const x = Number(t.dataset.speed); if (!x) CIV.setPaused(!CIV.state().paused); else { CIV.setPaused(false); CIV.setSpeed(x); } showActivity(); }
  });
}

// ---------- guided demo ----------
let pendingDestination = null;
async function openPublicDestination(kind) {
  if (kind === 'demo') return openDemoChoice();
  if (!S.urbanReady) { pendingDestination = kind; toast(T('Loading city data… your view will open automatically.', 'Chargement… la vue s’ouvrira automatiquement.')); return; }
  try {
    const urban = await S.urbanReady;
    if (kind === 'investigations') urban.investigations();
    else if (kind === 'city') { await S.civLoading; if (!S.civReady) throw Error('City research unavailable'); revealMap(); S.map.jumpTo({ center: PLACES.somaField, zoom: 15.8, pitch: 50 }); showMission('mission.sf.mobility'); }
  } catch (e) { toast(e.message); }
}
async function openDemoChoice() { return globalThis.CORE_DEMO.request(); }
addEventListener('hashchange', () => {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.has('demo')) openDemoChoice();
  else if (h.has('investigations')) openPublicDestination('investigations');
  else if (h.get('mission') === 'mission.sf.mobility') openPublicDestination('city');
});
async function launchDemo(mode) { return openDemoChoice(); }

// ---------- language changes: re-render everything visible ----------
onLang(() => {
  renderScales(); if (S.civ) renderList();
  if (S.mode === 'human') { $('ea-hint').textContent = hint(); $('ea-cam').textContent = camLabel(); $('ea-talk').textContent = talkLabel(); }
  if (!$('ea-human').disabled) $('ea-human').textContent = T('Walk at street level', 'Descendre à hauteur humaine');
  if (S.scn?.state.on) { const id = S.scn.state.scenario; S.scn.show(id); }
  S.layer?.relabel(lang()); refreshPanel(true); S.demo?.relabel?.(); S.urban?.relabel();
});

// ---------- boot ----------
(async () => {
  try { S.data = await loadData(); } catch (e) { globalThis.CORE_DEMO.fail(e); $('fatal').hidden = false; $('fatal').textContent = `${T('CORE records unavailable', 'Registres CORE indisponibles')}: ${e.message}`; return; }
  S.map = makeMap(S.data); wire(); wireCiv(); renderScales(); renderList();
  $('ea-human').textContent = T('Walk at street level', 'Descendre à hauteur humaine');
  if (!STREET_LEVEL) document.querySelector('.ea-human').style.display = 'none'; // street walk + avatar link: dormant
  S.map.on('load', () => {
    S.ready = true;
    S.urbanReady = createUrban(globalThis.CORE_EARTH, { display: (html, kind) => panel(kind, null, html), reveal: revealMap }).then(u => { S.urban = u; return u; });
    globalThis.CORE_DEMO.ready(async () => (await S.urbanReady).demo());
    S.urbanReady.catch(e => { console.error('Living City unavailable:', e); globalThis.CORE_DEMO.fail(e); toast(T('Living City unavailable; existing research remains accessible.', 'Ville vivante indisponible ; les recherches existantes restent accessibles.')); });
    const h = new URLSearchParams(location.hash.slice(1)); S.civLoading = startCivilisation();
    if (pendingDestination || h.has('demo') || h.has('investigations')) { const target = pendingDestination || (h.has('demo') ? 'demo' : 'investigations'); pendingDestination = null; openPublicDestination(target);
    } else if (h.get('problem') && S.data.byId.has(h.get('problem'))) {
      revealMap(); const p = S.data.byId.get(h.get('problem')); S.map.jumpTo({ center: S.data.bySeg.get(p.segment)?.coord || SF, zoom: 16.4, pitch: 62, bearing: (S.data.bySeg.get(p.segment)?.along || 0) - 30 }); S.scale = 'city'; renderScales();
      focusSegment(p.segment, { open: false, instant: true }); openPanel(p.id);
    } else if (location.hash === '#status') { $('ea-status').hidden = false; $('ea-status-btn').setAttribute('aria-expanded', 'true'); spin();
    } else if (location.hash === '#enter') {
      revealMap(); const e = S.data.bySeg.get(S.data.byId.get(FLAGSHIP).segment); S.map.jumpTo({ center: e.coord, zoom: 16.2, pitch: 60, bearing: e.along - 30 });
      focusSegment(e.items[0].segment, { open: false, instant: true }); if (STREET_LEVEL) S.map.once('idle', () => goScale('human'));
    } else if (VPLACES[h.get('place')]) { const P = VPLACES[h.get('place')]; if (P.scale) { revealMap(); goScale(P.scale); } else flyTo(P.at, P.zoom);
    } else if (!['sim', 'mission', 'problems', 'agent', 'team', 'investigate', 'contribute'].some(k => h.has(k))) { if (innerWidth > 860) S.map.setPadding({ left: Math.min(760, innerWidth * 0.48), right: 0, top: 0, bottom: 0 }); spin(); }
  });
})();
globalThis.CORE_EARTH = { state: S, goScale, openPanel, focusSegment, enterHuman, leaveHuman, start, get exploring() { return document.body.classList.contains('ea-explore'); }, setLayer, showAgent, showMission, openMission, showActivity, showEvent, showHierarchy, showTeam, showProblems, showInvestigate, showContribute, showNoticed: showContribute, showSimulation, hideSimulation, playSimulation, revealMap, toggleCar, flyTo, followAgent, openDemoChoice, launchDemo, ensureScene, civ: () => S.civ, get fps() { const f = S.frames; return f.length ? f.length / f.reduce((a, b) => a + b, 0) : 0; } };
