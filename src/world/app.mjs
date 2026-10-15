// CORE World — V3 vertical slice (local prototype). One place (Folsom St, San Francisco), one real agent from the
// registry, one real recorded problem. The holographic world stays the agents' world; around the human avatar the same
// geometry is painted with realistic materials. Nothing is transmitted: contributions stay in this browser.
import * as maplibregl from '../../assets/vendor/maplibre-gl-6.11.2/maplibre-gl.mjs';
import { worldStyle } from './world-style.mjs';
import { PRESETS, PALETTE, HAIR, humanSVG, agentSVG } from './avatars.mjs';
import { step, distance, distanceToGeometry, circle, toLocal, clipToCircle } from './geo.mjs';
import { screen } from './safety.mjs';
import { reply } from './dialogue.mjs';
import { draft, transition, STATES, PROTOTYPE_LIMIT } from './contributions.mjs';
import { check as geoCheck } from './geo-policy.mjs';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https:\/\//i.test(String(u || '')) ? u : '#');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const STORE = 'core.world.v1', PROBLEM_ID = 'sidewalk-below-bsp-min:5665000', AGENT_ID = 'core.san-francisco.public-space.sidewalks';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };
const save = v => { try { localStorage.setItem(STORE, JSON.stringify(v)); return true; } catch { return false; } };

const S = {
  mode: 'intro', cam: 'third', pos: null, heading: 0, radius: 10, band: 6, quality: 'high', keys: new Set(), joy: { x: 0, y: 0 },
  last: 0, frames: [], roads: [], roadParts: 0, revealMs: [], revealed: new Map(), buildings: [], cachePos: null, lastReveal: null, lastRevealAt: 0,
  profile: load(), chat: [], chatTimes: [], tab: 'agent', data: null, map: null, nearAgent: false, blocked: 0,
};

// ---------- data (published CORE records only) ----------
async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw Error(`${u} : HTTP ${r.status}`); return r.json(); }
async function loadData() {
  const [problems, agents, sidewalks, trees, corridor] = await Promise.all(['data/problems/registry.json', 'data/agents/registry.json', 'data/sf/sidewalks.geojson', 'data/sf/street-trees.geojson', 'data/sf/corridor.geojson'].map(getJSON));
  const problem = problems.problems.find(p => p.id === PROBLEM_ID), agent = agents.agents.find(a => a.id === AGENT_ID);
  if (!problem || !agent) throw Error('enregistrement du problème ou de l’agent introuvable');
  const seg = corridor.features.find(f => f.properties.cnn === problem.segment);
  const walk = sidewalks.features.find(f => f.properties.cnn === problem.segment);
  const [a, b] = seg.geometry.coordinates, mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const along = (Math.atan2(...toLocal(a, b)) * 180 / Math.PI + 360) % 360; // bearing a → b
  const agentPos = step(mid, (along + 90) % 360, 9), spawn = step(step(mid, (along + 180) % 360, 28), (along + 90) % 360, 9);
  const near = trees.features.filter(f => distance(f.geometry.coordinates, mid) < 400);
  const others = problems.problems.filter(p => (p.assignedAgents || []).includes(AGENT_ID));
  return { problem, agent, sidewalk: walk && walk.properties, segment: seg, mid, along, agentPos, spawn, others,
    trees: { type: 'FeatureCollection', features: near.map(f => ({ ...f, properties: { id: f.properties.treeid, species: f.properties.species, near: false } })) },
    sidewalks: { type: 'FeatureCollection', features: sidewalks.features }, problemFC: { type: 'FeatureCollection', features: [seg] } };
}

// ---------- map ----------
function makeMap(d) {
  const map = new maplibregl.Map({ container: 'map', style: worldStyle({ trees: d.trees, sidewalks: d.sidewalks, problem: d.problemFC }), center: d.mid, zoom: 15.5, pitch: 55, bearing: d.along, maxPitch: 89, attributionControl: { compact: true, customAttribution: 'CORE World (prototype) · DataSF : arbres, trottoirs (2014), tronçons' } });
  map.keyboard.disable();
  // A rejected style must never fail silently (it would leave an empty world): show it.
  map.on('error', e => { if (!map.isStyleLoaded() && !/tile|fetch|Failed to load/i.test(String(e.error && e.error.message))) { $('fatal').hidden = false; $('fatal').textContent = `Style cartographique invalide : ${String(e.error && e.error.message).slice(0, 200)}`; } });
  const el = document.createElement('button'); el.type = 'button'; el.className = 'agent-mk'; el.setAttribute('aria-label', `Agent ${d.agent.code}, ${d.agent.role}`);
  el.innerHTML = agentSVG({ code: d.agent.code }) + `<span class="nm">${esc(d.agent.code)} · agent</span>`;
  el.addEventListener('click', () => openPanel('agent'));
  new maplibregl.Marker({ element: el, anchor: 'bottom', pitchAlignment: 'viewport', rotationAlignment: 'viewport' }).setLngLat(d.agentPos).addTo(map);
  // New tiles mark the building cache stale; it is rebuilt at most once per second (tiles stream continuously).
  map.on('sourcedata', e => { if (e.sourceId === 'omt' && e.isSourceLoaded) S.cacheStale = true; });
  map.on('rotate', e => { if (e.originalEvent && S.mode === 'avatar' && S.cam === 'third') S.heading = map.getBearing(); });
  return map;
}

// ---------- reveal: realistic appearance within the radius ----------
function refreshBuildings() {
  const seen = new Map();
  for (const f of S.map.querySourceFeatures('omt', { sourceLayer: 'building' })) {
    if (f.id == null) continue; const g = f.geometry, c0 = g.type === 'Polygon' ? g.coordinates[0][0] : g.type === 'MultiPolygon' ? g.coordinates[0][0][0] : null;
    if (!c0 || Math.abs(c0[0] - S.pos[0]) > 0.004 || Math.abs(c0[1] - S.pos[1]) > 0.003) continue; // ~330 m box: skip far buildings before exact distance
    const d = distanceToGeometry(S.pos, g);
    if (d > 250) continue; const prev = seen.get(f.id);
    seen.set(f.id, prev ? { id: f.id, geoms: [...prev.geoms, g], h: prev.h } : { id: f.id, geoms: [g], h: Number(f.properties.render_height) || 8 });
  }
  S.buildings = [...seen.values()];
  S.roads = S.map.querySourceFeatures('omt', { sourceLayer: 'transportation' }).filter(f => f.properties.class !== 'rail' && /LineString/.test(f.geometry.type) && distanceToGeometry(S.pos, f.geometry) < 250).map(f => ({ cls: f.properties.class, geometry: f.geometry }));
  S.cachePos = S.pos;
}
function updateReveal(force = false) {
  const map = S.map; if (!map || !S.pos || !map.getSource('reveal')) return;
  const moved = S.lastReveal ? distance(S.lastReveal, S.pos) : Infinity;
  if (!force && moved < 0.4) return;
  const t0 = performance.now();
  const now = performance.now();
  if (!S.cachePos || distance(S.cachePos, S.pos) > 60 || (S.cacheStale && now - (S.cacheAt || 0) > 1000)) { refreshBuildings(); S.cacheStale = false; S.cacheAt = now; }
  const r = S.radius, band = S.quality === 'low' ? 0.01 : S.band, pt = { type: 'Point', coordinates: S.pos };
  const roads = r > 0 ? S.roads.flatMap(f => clipToCircle(f.geometry, S.pos, r).map(c => ({ type: 'Feature', properties: { part: 'road', class: f.cls }, geometry: { type: 'LineString', coordinates: c } }))) : [];
  map.getSource('reveal').setData({ type: 'FeatureCollection', features: r > 0 ? [
    { type: 'Feature', properties: { part: 'disc' }, geometry: circle(S.pos, r) }, ...roads,
    ...(S.quality === 'low' ? [] : [{ type: 'Feature', properties: { part: 'band' }, geometry: circle(S.pos, r + band / 2) }])] : [] });
  S.roadParts = roads.length;
  if (S.quality !== 'low') { const src = map.getSource('trees'), fc = S.data.trees; let changed = false;
    for (const f of fc.features) { const n = r > 0 && distance(f.geometry.coordinates, S.pos) < r + 2; if (n !== f.properties.near) { f.properties.near = n; changed = true; } }
    if (changed) src.setData(fc); }
  let n = 0;
  for (const b of S.buildings) {
    const d = Math.min(...b.geoms.map(g => distanceToGeometry(S.pos, g)));
    const v = r <= 0 ? 0 : d <= r ? 1 : d >= r + band ? 0 : Math.round((1 - (d - r) / band) * 20) / 20;
    if (v > 0) n++;
    if ((S.revealed.get(b.id) || 0) !== v) { map.setFeatureState({ source: 'omt', sourceLayer: 'building', id: b.id }, { reveal: v }); if (v) S.revealed.set(b.id, v); else S.revealed.delete(b.id); }
  }
  S.revealCount = n; S.lastReveal = S.pos; S.revealMs.push(performance.now() - t0); if (S.revealMs.length > 200) S.revealMs.shift();
}
const blocked = p => S.buildings.some(b => b.h > 2 && b.geoms.some(g => distanceToGeometry(p, g) === 0));

// ---------- avatar ----------
let avatarMarker = null;
function placeAvatar() {
  const a = { ...PRESETS.find(p => p.id === S.profile.avatar?.preset) || PRESETS[0], ...(S.profile.avatar?.top ? { top: S.profile.avatar.top } : {}), ...(S.profile.avatar?.hair ? { hair: S.profile.avatar.hair } : {}) };
  const el = document.createElement('div'); el.className = 'avatar-mk';
  el.innerHTML = humanSVG(a, { title: `Votre avatar ${S.profile.avatar?.name || a.name}` }) + `<span class="nm">${esc(S.profile.avatar?.name || a.name)} · humain</span>`;
  avatarMarker = new maplibregl.Marker({ element: el, anchor: 'bottom', pitchAlignment: 'viewport', rotationAlignment: 'viewport' }).setLngLat(S.pos).addTo(S.map);
}
function camera() {
  const map = S.map;
  if (S.cam === 'first') { const o = map.calculateCameraOptionsFromCameraLngLatAltRotation({ lng: S.pos[0], lat: S.pos[1] }, 1.7, S.heading, 86); map.jumpTo(o); }
  else map.jumpTo({ center: S.pos, bearing: S.heading, pitch: 72, zoom: S.zoom || 19.6 });
}
function frame(t) {
  const dt = S.last ? Math.min(0.1, (t - S.last) / 1000) : 0; S.last = t;
  if (dt) { S.frames.push(dt * 1000); if (S.frames.length > 300) S.frames.shift(); }
  if (S.mode === 'avatar') {
    const k = S.keys, fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - S.joy.y + (S.auto ? 1 : 0);
    const turn = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + S.joy.x;
    S.heading = (S.heading + turn * 90 * dt + 360) % 360;
    const moving = Math.abs(fwd) > 0.05;
    if (moving) {
      const next = step(S.pos, S.heading, Math.max(-1, Math.min(1, fwd)) * (k.has('ShiftLeft') || k.has('ShiftRight') ? 3.2 : 1.4) * dt);
      const rule = geoCheck(next, 'navigation');
      if (!rule.allowed) toast(`Déplacement refusé : ${rule.reason}`);
      else if (blocked(next)) { if (++S.blocked % 30 === 1) toast('Un bâtiment bloque le passage.'); }
      else S.pos = next;
    }
    avatarMarker.setLngLat(S.pos); avatarMarker.getElement().classList.toggle('walking', moving && !reduced());
    avatarMarker.getElement().style.visibility = S.cam === 'first' ? 'hidden' : 'visible';
    camera(); updateReveal();
    const near = distance(S.pos, S.data.agentPos) < 10;
    if (near !== S.nearAgent) { S.nearAgent = near; $('talk').disabled = !near; if (near) toast(`${S.data.agent.code} est à portée : appuyez sur E pour lui parler.`); }
  }
  if (t - (S.perfAt || 0) > 500) { S.perfAt = t; perf(); }
  requestAnimationFrame(frame);
}
function stats(a) { const s = [...a].sort((x, y) => x - y); return s.length ? { p50: s[Math.floor(s.length / 2)], p95: s[Math.floor(s.length * 0.95)], mean: s.reduce((x, y) => x + y, 0) / s.length } : { p50: 0, p95: 0, mean: 0 }; }
function perf() { const f = stats(S.frames), r = stats(S.revealMs); $('perf').textContent = `${f.mean ? (1000 / f.mean).toFixed(0) : '–'} ips · p95 ${f.p95.toFixed(1)} ms · révélation ${r.mean.toFixed(1)} ms · ${S.revealCount || 0} bâtiment(s) réaliste(s)`; }

// ---------- onboarding ----------
let pick = { preset: S.profile.avatar?.preset || PRESETS[0].id, top: S.profile.avatar?.top || null, hair: S.profile.avatar?.hair || null, name: S.profile.avatar?.name || '' };
function renderChooser() {
  $('presets').innerHTML = PRESETS.map(p => `<button type="button" class="preset" role="radio" aria-checked="${p.id === pick.preset}" data-preset="${p.id}">${humanSVG({ ...p, ...(pick.top && p.id === pick.preset ? { top: pick.top } : {}), ...(pick.hair && p.id === pick.preset ? { hair: pick.hair } : {}) })}<span>${esc(p.name)}</span></button>`).join('');
  $('tops').innerHTML = PALETTE.map(c => `<button type="button" class="swatch" role="radio" aria-checked="${c === (pick.top || PRESETS.find(p => p.id === pick.preset).top)}" aria-label="Couleur ${c}" data-top="${c}" style="background:${c}"></button>`).join('');
  $('hair').innerHTML = HAIR.map(h => `<option value="${h}" ${h === (pick.hair || PRESETS.find(p => p.id === pick.preset).hair) ? 'selected' : ''}>${{ short: 'Courte', long: 'Longue', bun: 'Chignon', curly: 'Bouclée', scarf: 'Foulard' }[h]}</option>`).join('');
  $('display-name').value = pick.name;
  $('presets').querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { pick = { ...pick, preset: b.dataset.preset, top: null, hair: null }; renderChooser(); $('presets').querySelector(`[data-preset="${pick.preset}"]`).focus(); });
  $('tops').querySelectorAll('[data-top]').forEach(b => b.onclick = () => { pick.top = b.dataset.top; renderChooser(); });
  $('hair').onchange = e => { pick.hair = e.target.value; renderChooser(); };
}
function show(id) { for (const s of ['intro', 'choose']) $(s).hidden = s !== id; document.body.className = id || 'world'; if (id) $(id).querySelector('button, input')?.focus(); }
let compact = null;
async function enterWorld() {
  pick.name = $('display-name').value.replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 24);
  S.profile.avatar = { ...pick }; save(S.profile);
  show(null); S.mode = 'transition'; S.pos = S.data.spawn; S.heading = (S.data.along + 0) % 360;
  if (blocked(S.pos)) S.pos = step(S.data.mid, (S.data.along + 180) % 360, 28);
  const target = { center: S.pos, bearing: S.heading, pitch: 72, zoom: 19.6 };
  if (reduced()) S.map.jumpTo(target); else { S.map.jumpTo({ center: S.pos, zoom: 13, pitch: 30, bearing: 0 }); const done = new Promise(r => { S.map.once('moveend', r); setTimeout(r, 6000); }); S.map.flyTo({ ...target, duration: 3500, essential: false }); await done; S.map.jumpTo(target); }
  S.map.dragPan.disable(); placeAvatar(); refreshBuildings(); updateReveal(true);
  S.mode = 'avatar'; $('hud').hidden = false; $('map').focus();
  compact?.(); toast(`Bienvenue. L’agent ${S.data.agent.code} travaille à quelques mètres, devant vous. ${matchMedia('(pointer: coarse)').matches ? 'Avancez avec le joystick.' : 'Avancez avec W ou ↑.'}`);
}
function noAvatar() {
  show(null); S.mode = 'map'; $('hud').hidden = false; $('cam').hidden = true; $('radius').closest('label').hidden = true; $('talk').disabled = false; $('help').textContent = 'Mode sans avatar : la carte se manipule normalement (glisser, molette, clavier). Toutes les informations sont dans le panneau.';
  S.map.keyboard.enable(); S.map.jumpTo({ center: S.data.mid, zoom: 17.5, pitch: 55, bearing: S.data.along }); openPanel('problem');
}

// ---------- panel: agent, problem, conversation, contributions ----------
function openPanel(tab = S.tab) { S.tab = tab; $('world-panel').hidden = false; renderPanel(); $('world-panel').focus(); }
function closePanel() { $('world-panel').hidden = true; S.chat = []; $('map').focus(); } // conversation memory ends with the panel
function renderPanel() {
  const { agent, problem, sidewalk, others } = S.data, inv = problem.investigation || {};
  document.querySelectorAll('.tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === S.tab)));
  $('panel-title').textContent = { agent: agent.code, problem: 'Problème enregistré', chat: `Conversation · ${agent.code}`, contribute: 'Contribuer', mine: 'Mes contributions' }[S.tab];
  const B = $('panel-body');
  if (S.tab === 'agent') B.innerHTML = `
    <p><b>${esc(agent.role)}</b><br><span class="fine">${esc(agent.specialization)}</span></p>
    <dl class="kv"><dt>Identifiant</dt><dd><code>${esc(agent.id)}</code></dd><dt>Périmètre</dt><dd>${esc(agent.scope.area)}</dd>
      <dt>Statut</dt><dd>${esc(agent.status)} · exécution ${esc(agent.executionMode === 'deterministic' ? 'à règles (déterministe), sans modèle de langage' : agent.executionMode)}</dd>
      <dt>Permission</dt><dd>${esc(agent.permission)} (analyse seulement ; aucune action réelle)</dd>
      <dt>Investigation</dt><dd>${esc(inv.task || '—')} · ${esc(inv.label || '—')}</dd>
      <dt>Problèmes assignés</dt><dd>${others.length} dans le registre (dont celui-ci)</dd>
      <dt>Preuves</dt><dd>${problem.evidence.length} enregistrement(s) DataSF</dd><dt>Propositions</dt><dd>${problem.interventions.length || 'aucune enregistrée'}</dd>
      <dt>Simulations</dt><dd>aucune liée à ce problème</dd><dt>Revue</dt><dd><span class="badge info">${esc(inv.decision || '—')}</span></dd><dt>Résultats vérifiés</dt><dd>aucun</dd></dl>
    <p class="fine">${esc(agent.disclaimer)} La position affichée est un poste virtuel près du problème : les agents n’ont pas de présence physique.</p>
    <div class="row2"><button type="button" data-go="chat">Parler</button><button type="button" data-go="problem">Voir le problème</button></div>`;
  if (S.tab === 'problem') { const stg = [['Identification', true], ['Localisation', true], ['Source de détection', true], ['Preuves', problem.evidence.length > 0], ['Confiance et limites', true], ['Causes possibles', false], ['Solutions proposées', problem.interventions.length > 0], ['Alternatives', false], ['Simulation', false], ['Revue', !!inv.decision], ['Autorisation', false], ['Mise en œuvre', false], ['Mesure du résultat', false], ['Suivi', false]];
    B.innerHTML = `<p><span class="badge observed">OBSERVÉ</span> <b>${esc(problem.title)}</b></p>
    <p>${esc(problem.place)} — ${esc(problem.statement)}</p>
    <dl class="kv"><dt>Mesure</dt><dd>${esc(sidewalk ? `${sidewalk.width_ft} ft (côtés : ${sidewalk.side}) ; minimum ${sidewalk.min_width_ft} ft, recommandé ${sidewalk.recommended_ft} ft, classe ${sidewalk.class}` : '—')}</dd>
      <dt>Gravité</dt><dd>${esc(problem.severity.level)} — ${esc(problem.severity.basis)} <span class="badge approx">${esc(problem.severity.method)}</span></dd>
      <dt>Confiance</dt><dd>${esc(problem.confidence)}</dd><dt>Limite</dt><dd>${esc(problem.caveat)}</dd>
      <dt>Détection</dt><dd>règle déterministe sur l’instantané du ${esc(problem.asOf.slice(0, 10))}</dd>
      <dt>Revue</dt><dd><span class="badge info">${esc(inv.decision || '—')}</span> · ${esc(problem.humanDecision)}</dd></dl>
    <h3>Preuves</h3><ul>${problem.evidence.map(e => `<li><a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener noreferrer">${esc(e.ref)}</a></li>`).join('')}</ul>
    <h3>Étapes du parcours scientifique</h3><ol class="stages">${stg.map(([l, ok]) => `<li class="${ok ? 'yes' : 'no'}"><b>${ok ? '✓' : '·'}</b>${esc(l)}${ok ? '' : ' — non atteint'}</li>`).join('')}</ol>
    <p class="fine">Aucune étape manquante n’est complétée par CORE : « non atteint » signifie qu’aucun enregistrement n’existe.</p>
    <div class="row2"><button type="button" data-go="contribute">Contribuer</button><button type="button" data-go="chat">Interroger l’agent</button></div>
    <p><a href="commons.html?tab=vault&amp;problem=${encodeURIComponent(PROBLEM_ID)}">Développer une idée en privé (coffre chiffré, CORE Commons) →</a></p>`; }
  if (S.tab === 'chat') {
    B.innerHTML = `<p class="fine">Réponses déterministes construites à partir des enregistrements (aucune IA générative). Conversation privée, non enregistrée, effacée à la fermeture du panneau.</p>
    <div class="chat" id="chat-log" aria-live="polite">${S.chat.map(m => `<div class="msg ${m.who}">${esc(m.text)}${m.note ? `<small>${esc(m.note)}</small>` : ''}</div>`).join('') || `<div class="msg agent">Bonjour. Je suis ${esc(agent.code)}. Que voulez-vous savoir sur ce trottoir ?<small>réponse déterministe · règles CORE</small></div>`}</div>
    <div class="chips">${['Que fais-tu ?', 'Quel est le problème ?', 'Quelles preuves ?', 'Quel statut ?', 'Une solution ?', 'Comment contribuer ?'].map(q => `<button type="button" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <form class="row2" id="chat-form"><label class="sr-only" for="chat-in">Votre message</label><input id="chat-in" maxlength="500" autocomplete="off" placeholder="Votre question (500 caractères)"><button type="submit">Envoyer</button></form>`;
    $('chat-form').onsubmit = e => { e.preventDefault(); ask($('chat-in').value); };
    B.querySelectorAll('[data-ask]').forEach(b => b.onclick = () => ask(b.dataset.ask));
    const log = $('chat-log'); log.scrollTop = log.scrollHeight;
  }
  if (S.tab === 'contribute') { B.innerHTML = `<p>Votre contribution porte sur : <b>${esc(problem.title)}</b> (${esc(problem.place)}).</p>
    <form id="contrib-form" class="custom"><label class="row">Type <select id="c-kind"><option value="observation">Observation de terrain</option><option value="idea">Idée de solution</option><option value="evidence-suggestion">Source de preuve à vérifier</option><option value="criticism">Critique ou désaccord</option></select></label>
      <label for="c-text">Texte</label><textarea id="c-text" maxlength="500" placeholder="Sans nom, adresse ni contact."></textarea>
      <button type="submit" class="primary">Soumettre</button></form>
    <p class="fine">Prototype : la contribution est enregistrée <b>dans ce navigateur seulement</b>. Elle n’est ni transmise, ni modérée, ni revue ; aucune étape au-delà de « ${esc(STATES[PROTOTYPE_LIMIT].label)} » n’existe encore. Ni votes ni abonnement ne peuvent la faire avancer.</p>`;
    $('contrib-form').onsubmit = e => { e.preventDefault(); contribute($('c-kind').value, $('c-text').value); }; }
  if (S.tab === 'mine') { const list = S.profile.contributions || [];
    B.innerHTML = list.length ? list.map(c => `<div class="contrib"><b>${esc(STATES[c.state].label)}</b> · ${esc({ observation: 'observation', idea: 'idée', 'evidence-suggestion': 'source de preuve', criticism: 'critique' }[c.kind])} · ${esc(c.createdAt.slice(0, 16).replace('T', ' '))} UTC
      <p>${esc(c.text)}</p><p class="fine">Problème : ${esc(c.problemId)} · portée : locale · historique : ${c.history.map(h => `${esc(STATES[h.to].label)} (${esc(h.actor)})`).join(' → ')}</p>
      <button type="button" class="ghost small" data-del="${esc(c.id)}">Supprimer</button></div>`).join('') + '<p class="fine">Aucune contribution n’a été considérée par un agent ni revue : il n’existe pas encore de canal de revue.</p>'
      : '<p class="fine">Aucune contribution dans ce navigateur.</p>';
    B.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.profile.contributions = list.filter(c => c.id !== b.dataset.del); save(S.profile); renderPanel(); }); }
  B.querySelectorAll('[data-go]').forEach(b => b.onclick = () => openPanel(b.dataset.go));
}
function ask(text) {
  const r = screen(text, { history: S.chatTimes });
  if (!r.ok) { S.chat.push({ who: 'sys', text: r.message }); renderPanel(); return; }
  S.chatTimes.push(Date.now());
  S.chat.push({ who: 'me', text: r.text }); for (const n of r.notes) S.chat.push({ who: 'sys', text: n });
  const a = reply(r.text, S.data); S.chat.push({ who: 'agent', text: a.text, note: `réponse déterministe · règles CORE${a.sources.length ? ' · sources : ' + a.sources.join(', ') : ''}` });
  renderPanel(); $('chat-in')?.focus();
}
function contribute(kind, text) {
  const r = screen(text, { history: [] });
  if (!r.ok) { toast(r.message); return; }
  const c = draft({ id: `c-${Date.now().toString(36)}`, problemId: PROBLEM_ID, kind, text: r.text });
  const s = transition(c, 'submitted', { actor: 'author' }); if (!s.ok) { toast(s.error); return; }
  S.profile.contributions = [s.value, ...(S.profile.contributions || [])].slice(0, 50);
  toast(save(S.profile) ? 'Contribution enregistrée dans ce navigateur (non transmise).' : 'Stockage local indisponible : contribution non enregistrée.');
  if (r.notes.length) toast(r.notes.join(' '));
  openPanel('mine');
}

// ---------- controls ----------
let toastTimer;
function toast(t) { $('toast').textContent = t; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').textContent = ''; }, 5000); }
const MOVE = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (e.key === 'Escape') { if (!$('world-panel').hidden) closePanel(); return; }
  if (typing || S.mode !== 'avatar') return;
  const code = { KeyZ: 'KeyW', KeyQ: 'KeyA' }[e.code] || e.code; // AZERTY
  if (MOVE.includes(code)) { S.keys.add(code); if (code.startsWith('Arrow')) e.preventDefault(); }
  if (code === 'KeyC') toggleCam();
  if (code === 'KeyE' && S.nearAgent) openPanel('chat');
});
addEventListener('keyup', e => { const code = { KeyZ: 'KeyW', KeyQ: 'KeyA' }[e.code] || e.code; S.keys.delete(code); });
addEventListener('blur', () => S.keys.clear());
function toggleCam() { S.cam = S.cam === 'third' ? 'first' : 'third'; $('cam').textContent = `Vue : ${S.cam === 'third' ? '3e' : '1re'} personne`; $('cam').setAttribute('aria-pressed', String(S.cam === 'first')); }
function joystick() {
  const pad = $('joy'), knob = pad.querySelector('.knob'); let id = null;
  const set = e => { const r = pad.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2), m = Math.min(1, Math.hypot(x, y)) / (Math.hypot(x, y) || 1);
    S.joy = { x: x * m, y: y * m }; knob.style.transform = `translate(${x * m * 40}px, ${y * m * 40}px)`; };
  pad.addEventListener('pointerdown', e => { id = e.pointerId; pad.setPointerCapture(id); set(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === id) set(e); });
  const end = () => { id = null; S.joy = { x: 0, y: 0 }; knob.style.transform = ''; };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
}

// ---------- benchmark hook (used by scripts/world-audit.mjs; local measurement only) ----------
async function bench({ radius = 10, ms = 4000, quality = 'high' } = {}) {
  S.radius = radius; S.quality = quality; S.frames = []; S.revealMs = []; S.pos = S.data.spawn; S.heading = S.data.along; S.revealed.forEach((_, id) => S.map.setFeatureState({ source: 'omt', sourceLayer: 'building', id }, { reveal: 0 })); S.revealed.clear(); S.cachePos = null; updateReveal(true);
  S.auto = true; await new Promise(r => setTimeout(r, ms)); S.auto = false;
  const f = stats(S.frames), r = stats(S.revealMs);
  return { radius, quality, frames: S.frames.length, fps: f.mean ? 1000 / f.mean : 0, frameP50: f.p50, frameP95: f.p95, revealMean: r.mean, revealP95: r.p95, revealed: S.revealCount };
}

// ---------- start ----------
async function start() {
  try { S.data = await loadData(); } catch (e) { $('fatal').hidden = false; $('fatal').textContent = `Données CORE indisponibles (${e.message}). Aucune information n’est affichée sans ses enregistrements.`; return; }
  try { S.map = makeMap(S.data); } catch (e) { $('fatal').hidden = false; $('fatal').textContent = 'Carte indisponible : WebGL2 requis. Le panneau d’information reste accessible.'; $('hud').hidden = false; return; }
  S.map.on('error', e => { if (/tile|fetch|load/i.test(String(e.error && e.error.message))) toast('Une source cartographique est indisponible ; affichage potentiellement incomplet.'); });
  $('enter').onclick = () => { renderChooser(); show('choose'); };
  $('back').onclick = () => show('intro');
  // Start when the style is usable: the map need not be idle (tiles keep streaming as the avatar moves).
  const ready = () => S.map.isStyleLoaded() ? Promise.resolve() : new Promise(r => { S.map.once('idle', r); setTimeout(r, 4000); });
  $('confirm').onclick = () => ready().then(enterWorld);
  $('no-avatar').onclick = () => ready().then(noAvatar);
  $('cam').onclick = toggleCam; $('talk').onclick = () => openPanel('chat'); $('open-panel').onclick = () => openPanel(S.tab);
  $('goto').onclick = () => { const p = step(S.data.agentPos, (S.data.along + 180) % 360, 6), rule = geoCheck(p, 'navigation'); if (!rule.allowed) return toast(rule.reason);
    if (S.mode === 'avatar') { S.pos = p; S.heading = S.data.along; updateReveal(true); } else S.map.jumpTo({ center: S.data.mid, zoom: 18, pitch: 60 }); toast('Vous êtes devant le tronçon Folsom St, 5e → Falmouth.'); };
  $('radius').oninput = e => { S.radius = Number(e.target.value); $('r-val').textContent = S.radius; updateReveal(true); };
  $('quality').onchange = e => { S.quality = e.target.value; if (S.quality === 'low') { S.data.trees.features.forEach(f => { f.properties.near = false; }); S.map.getSource('trees').setData(S.data.trees); } updateReveal(true); };
  $('panel-close').onclick = closePanel;
  document.querySelectorAll('.tabs [data-tab]').forEach(b => b.onclick = () => openPanel(b.dataset.tab));
  // Phones and touch devices start in the economical rendering mode (battery, GPU); the choice stays changeable.
  if (matchMedia('(pointer: coarse), (max-width: 700px)').matches) { S.quality = 'low'; $('quality').value = 'low'; }
  compact = () => document.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  S.map.once('load', compact); S.map.once('idle', compact);
  $('map').tabIndex = 0; joystick(); requestAnimationFrame(frame); show('intro');
  globalThis.CORE_WORLD = { state: S, bench, enterWorld: () => (pick = { ...pick }, enterWorld()), noAvatar, toggleCam, openPanel, ask, contribute, updateReveal };
}
start();
