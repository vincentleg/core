// CORE avatar studio (V7): a lit 3D stage and a creator panel. Everything stays in this browser (core.avatar.v2).
import * as THREE from '../../assets/vendor/three-0.186.1/core3d.min.mjs';
import * as CFG from './avatar-config.mjs';
import { buildAvatar } from './avatar3d.mjs';
import * as NAV from '../shell/nav.mjs';
import { T, onLang } from '../i18n/i18n.mjs';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const toast = m => { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); };
NAV.render($('core-nav'), { active: 'avatar' });
const state = CFG.load();

// ---------- stage ----------
const canvas = $('st-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new THREE.RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50); camera.position.set(0, 1.05, 4.9);
const key = new THREE.DirectionalLight('#fff4e6', 2.4); key.position.set(2.2, 3.6, 2.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2.2, bottom: -0.2, near: 0.5, far: 10 }); scene.add(key);
const rim = new THREE.DirectionalLight('#7fd8ff', 1.6); rim.position.set(-2.5, 2.4, -2.8); scene.add(rim);
const fill = new THREE.HemisphereLight('#bcd7ff', '#2a2420', 0.6); scene.add(fill);
const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 96), new THREE.MeshStandardMaterial({ color: '#0f2036', roughness: 0.55, metalness: 0.1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(1.38, 1.42, 128), new THREE.MeshBasicMaterial({ color: '#62d8f2', transparent: true, opacity: 0.45 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; scene.add(ring);
const holder = new THREE.Group(); scene.add(holder);
let avatar = null, building = 0, yaw = -0.35, yawV = 0, mode = 'Idle_Loop';
function resize() { const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
camera.lookAt(0, 0.86, 0);

async function rebuild() {
  const id = ++building; const a = await buildAvatar(state.appearance).catch(e => { $('st-loading').textContent = T(`Model unavailable: ${e.message}`, `Modèle indisponible : ${e.message}`); return null; });
  if (!a || id !== building) return;
  if (avatar) { holder.remove(avatar.root); avatar.dispose(); }
  avatar = a; holder.add(a.root); a.play(mode, 0); $('st-loading').hidden = true; globalThis.CORE_STUDIO.ready = true;
}
let drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, yaw }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (drag) { yaw = drag.yaw + (e.clientX - drag.x) * 0.01; } });
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.tabIndex = 0; canvas.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') yaw -= 0.2; if (e.key === 'ArrowRight') yaw += 0.2; });
$('st-rot-l').onclick = () => { yaw -= Math.PI / 4; }; $('st-rot-r').onclick = () => { yaw += Math.PI / 4; };
for (const [btn, clip] of [['st-pose', 'Walk_Loop'], ['st-talk', 'Idle_Talking_Loop']]) $(btn).onclick = () => {
  const on = $(btn).getAttribute('aria-pressed') !== 'true'; for (const b of ['st-pose', 'st-talk']) $(b).setAttribute('aria-pressed', 'false');
  $(btn).setAttribute('aria-pressed', String(on)); mode = on ? clip : 'Idle_Loop'; avatar?.play(mode); };
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  if (!drag && !reduced) yaw += dt * 0.12; holder.rotation.y += (yaw - holder.rotation.y) * Math.min(1, dt * 8);
  avatar?.update(reduced && mode === 'Idle_Loop' ? 0 : dt); renderer.render(scene, camera);
});

// ---------- creator panel ----------
const radio = (el, items, cur, onPick, render) => {
  el.innerHTML = items.map(([v, label, extra]) => `<button type="button" role="radio" aria-checked="${v === cur}" data-v="${esc(v)}" ${extra || ''}>${render ? render(v, label) : esc(label)}</button>`).join('');
  el.querySelectorAll('button').forEach(b => b.onclick = () => onPick(b.dataset.v));
};
const swatches = (el, colors, cur, onPick, labels) => radio(el, colors.map((c, i) => [c, labels?.[i] || c, `style="background:${c}" aria-label="${esc(labels?.[i] || T(`Colour ${c}`, `Couleur ${c}`))}"`]), cur, onPick, () => '');
function panel() {
  const a = state.appearance, set = patch => { state.appearance = CFG.normalize({ ...a, ...patch, preset: patch.preset ?? null }); panel(); rebuild(); };
  radio($('st-presets'), CFG.PRESETS.map(p => [p.id, p.label, `style="${CFG.chipStyle(p)}"`]), a.preset, id => { state.appearance = CFG.normalize({ ...CFG.PRESETS.find(p => p.id === id) }); panel(); rebuild(); }, (v, l) => `<i aria-hidden="true"></i>${esc(l)}`);
  radio($('st-body'), CFG.BODIES, a.body, v => set({ body: v }));
  swatches($('st-skin'), CFG.SKINS.map(s => s.id), a.skin, v => set({ skin: v }), CFG.SKINS.map(s => T(`${s.label} skin tone`, `Teint ${s.label.toLowerCase()}`)));
  $('st-skin').querySelectorAll('button').forEach((b, i) => { b.style.background = skinChip(CFG.SKINS[i]); });
  radio($('st-hair'), CFG.HAIRS, a.hair, v => set({ hair: v }));
  swatches($('st-hairc'), CFG.HAIR_COLORS, a.hairColor, v => set({ hairColor: v }));
  $('st-beard-l').hidden = a.body !== 'm'; $('st-beard').checked = a.beard; $('st-beard').onchange = e => set({ beard: e.target.checked });
  radio($('st-top'), CFG.TOPS, a.top, v => set({ top: v })); swatches($('st-topc'), CFG.TOP_COLORS, a.topColor, v => set({ topColor: v }));
  radio($('st-bottom'), CFG.BOTTOMS, a.bottom, v => set({ bottom: v })); swatches($('st-bottomc'), CFG.BOTTOM_COLORS, a.bottomColor, v => set({ bottomColor: v }));
  swatches($('st-shoes'), CFG.SHOE_COLORS, a.shoes, v => set({ shoes: v }));
  identity();
}
// Chip colour approximating base scan × tint (display only).
function skinChip(s) { const base = s.base === 'dark' ? [150, 102, 74] : [236, 200, 170], t = [1, 3, 5].map(i => parseInt(s.tint.slice(i, i + 2), 16) / 255); return `rgb(${base.map((c, i) => Math.round(c * t[i])).join(',')})`; }
function identity() {
  const n = state.identity.pseudonym, a = state.appearance;
  $('st-id').innerHTML = `<i style="--skin:${skinChip(CFG.SKINS.find(s => s.id === a.skin))};--top:${esc(a.topColor)}" aria-hidden="true"></i><div><b>${esc(n || T('Visitor without a pseudonym', 'Visiteur·se sans pseudonyme'))}</b><span>${T('Human · local contributor · no status, no rank', 'Humain · contributeur·rice local·e · aucun statut, aucun rang')}</span></div>`;
}
$('st-name').value = state.identity.pseudonym;
$('st-name').addEventListener('input', e => { state.identity.pseudonym = e.target.value; identity(); });
$('st-save').onclick = () => toast(CFG.save(state) ? T('Avatar saved in this browser.', 'Avatar enregistré dans ce navigateur.') : T('Storage unavailable: nothing was saved.', 'Stockage indisponible : rien n’a été enregistré.'));
$('st-enter').onclick = () => { CFG.save(state); location.href = 'world.html#enter'; };
panel(); rebuild();
onLang(() => panel());
globalThis.CORE_STUDIO = { state, ready: false, get clip() { return avatar?.clip; }, renderer };
