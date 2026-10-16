// CORE avatar renderer (V7). Base bodies, hair and animations: Quaternius "Universal Base Characters" and "Universal
// Animation Library" (CC0 1.0, assets/avatars/LICENSE-*.txt). Clothing is CORE's own: fitted garment shells generated
// at runtime from the body's skin weights (each garment = the body triangles bound to its bones, pushed out along the
// normal and given a fabric material), so garments follow every animation without extra assets.
import * as THREE from '../../assets/vendor/three-0.186.1/core3d.min.mjs';
import { SKINS } from './avatar-config.mjs';
const A = 'assets/avatars/';
const loader = new THREE.GLTFLoader(), cache = new Map();
const get = url => { if (!cache.has(url)) cache.set(url, loader.loadAsync(url)); return cache.get(url); };
export const preload = () => Promise.all(['body-f.glb', 'body-m.glb', 'hair-kit.glb', 'skin-kit.glb', 'anim.glb'].map(f => get(A + f)));
export const TARGET_HEIGHT = 1.74; // metres: an average adult, so the avatar reads at true scale in the city

// Bone → body region, used to cut garments out of the body mesh.
const REGION = n => /^Head$|^neck/.test(n) ? 'head' : /^spine_0[23]$|^clavicle/.test(n) ? 'chest' : n === 'spine_01' ? 'belly' : n === 'pelvis' ? 'hips'
  : /^upperarm/.test(n) ? 'upperarm' : /^lowerarm/.test(n) ? 'forearm' : /^(hand|index|middle|ring|pinky|thumb)/.test(n) ? 'hand'
  : /^thigh/.test(n) ? 'thigh' : /^calf/.test(n) ? 'calf' : /^(foot|ball)/.test(n) ? 'foot' : 'other';
const GARMENTS = { // t: thickness in metres; cutLow: horizontal hem as a fraction of body height (bind pose: arms are unaffected)
  tee: [{ regions: ['chest', 'belly', 'hips', 'upperarm'], t: 0.012, fabric: 'jersey', cutLow: 0.54 }],
  knit: [{ regions: ['chest', 'belly', 'hips', 'upperarm', 'forearm'], t: 0.013, fabric: 'knit', cutLow: 0.535 }],
  jacket: [{ regions: ['chest', 'belly', 'hips', 'upperarm', 'forearm'], t: 0.022, fabric: 'twill', cutTop: 0.865, cutLow: 0.535, placket: true }],
  jeans: [{ regions: ['hips', 'thigh', 'calf'], t: 0.015, fabric: 'denim', loose: 1 }],
  chino: [{ regions: ['hips', 'thigh', 'calf'], t: 0.015, fabric: 'twill', loose: 1 }],
  shorts: [{ regions: ['hips', 'thigh'], t: 0.012, fabric: 'twill', cutLow: 0.4, loose: 1 }],
  shoes: [{ regions: ['foot'], t: 0.016, fabric: 'leather', withCalfBelow: 0.085, sole: true }],
};

// Procedural fabric relief (canvas, no image files): fine weave or knit ribs as a bump map.
const fabricTex = new Map();
function fabric(kind) {
  if (fabricTex.has(kind)) return fabricTex.get(kind);
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), img = g.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const n = Math.random() * 0.25;
    const v = kind === 'denim' ? 0.5 + 0.35 * Math.sin((x + y) * 0.9) + n : kind === 'knit' ? 0.5 + 0.4 * Math.sin(x * 0.8) * Math.cos(y * 0.4) + n : kind === 'twill' ? 0.5 + 0.25 * Math.sin((x * 2 + y) * 0.7) + n : 0.5 + n;
    const i = (y * 128 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v * 255)); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(kind === 'knit' ? 10 : 16, kind === 'knit' ? 10 : 16);
  fabricTex.set(kind, t); return t;
}
const ROUGH = { jersey: 0.9, knit: 0.95, denim: 0.85, twill: 0.8, leather: 0.45 };

// Welded adjacency (UV seams share positions, so they must move together) for smoothing.
function weld(geo) {
  const pos = geo.attributes.position, n = pos.count, key = new Map(), id = new Int32Array(n);
  for (let v = 0; v < n; v++) { const k = `${Math.round(pos.getX(v) * 1e4)},${Math.round(pos.getY(v) * 1e4)},${Math.round(pos.getZ(v) * 1e4)}`; if (!key.has(k)) key.set(k, key.size); id[v] = key.get(k); }
  const m = key.size, nb = Array.from({ length: m }, () => new Set()), idx = geo.index.array;
  for (let i = 0; i < idx.length; i += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) nb[id[idx[i + a]]].add(id[idx[i + b]]);
  return { id, m, nb: nb.map(x => [...x]) };
}
const smoothCache = new WeakMap();
// Taubin smoothing (λ/μ, no shrinkage): cloth drapes over anatomy instead of following every muscle.
function smoothed(geo) {
  if (smoothCache.has(geo)) return smoothCache.get(geo);
  const { id, m, nb } = weld(geo), pos = geo.attributes.position, P = new Float32Array(m * 3);
  for (let v = 0; v < pos.count; v++) { P[id[v] * 3] = pos.getX(v); P[id[v] * 3 + 1] = pos.getY(v); P[id[v] * 3 + 2] = pos.getZ(v); }
  const T = new Float32Array(m * 3);
  for (let it = 0; it < 36; it++) for (const f of [0.5, -0.53]) {
    for (let i = 0; i < m; i++) { const ns = nb[i]; if (!ns.length) { T.set(P.subarray(i * 3, i * 3 + 3), i * 3); continue; } let x = 0, y = 0, z = 0; for (const j of ns) { x += P[j * 3]; y += P[j * 3 + 1]; z += P[j * 3 + 2]; } const k = ns.length;
      T[i * 3] = P[i * 3] + f * (x / k - P[i * 3]); T[i * 3 + 1] = P[i * 3 + 1] + f * (y / k - P[i * 3 + 1]); T[i * 3 + 2] = P[i * 3 + 2] + f * (z / k - P[i * 3 + 2]); }
    P.set(T);
  }
  const out = { id, P }; smoothCache.set(geo, out); return out;
}

function garmentMesh(body, spec, color) {
  const src = body.geometry, bones = body.skeleton.bones.map(b => REGION(b.name));
  const si = src.attributes.skinIndex, sw = src.attributes.skinWeight, pos = src.attributes.position, nor = src.attributes.normal, n = pos.count;
  const want = new Set(spec.regions), cover = new Float32Array(n);
  src.computeBoundingBox(); const minY = src.boundingBox.min.y, h = src.boundingBox.max.y - minY;
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let v = 0; v < n; v++) {
    let s = 0; for (let k = 0; k < 4; k++) if (want.has(bones[si.getComponent(v, k)])) s += sw.getComponent(v, k);
    const y = (pos.getY(v) - minY) / h;
    if (spec.withCalfBelow) s = Math.max(s, 1 - ss(spec.withCalfBelow - 0.02, spec.withCalfBelow + 0.02, y));
    if (spec.cutLow) s *= ss(spec.cutLow - 0.02, spec.cutLow + 0.02, y);
    if (spec.cutTop) s *= 1 - ss(spec.cutTop - 0.01, spec.cutTop + 0.01, y);
    cover[v] = s;
  }
  // Keep only triangles that touch the garment; the exact hem is the 0.5 isoline of `cover`, cut per pixel.
  const idx = src.index.array, keep = [];
  for (let i = 0; i < idx.length; i += 3) if (cover[idx[i]] > 0.5 || cover[idx[i + 1]] > 0.5 || cover[idx[i + 2]] > 0.5) keep.push(idx[i], idx[i + 1], idx[i + 2]);
  const geo = src.clone(); geo.setIndex(keep); geo.setAttribute('cover', new THREE.BufferAttribute(cover, 1));
  const { id, P } = smoothed(src), u = body.userData.unit, p = geo.attributes.position, t = spec.t / u;
  for (let v = 0; v < n; v++) { const j = id[v] * 3; p.setXYZ(v, P[j] + nor.getX(v) * t, P[j + 1] + nor.getY(v) * t, P[j + 2] + nor.getZ(v) * t); }
  p.needsUpdate = true; geo.computeBoundingSphere();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: ROUGH[spec.fabric], metalness: 0, bumpMap: fabric(spec.fabric), bumpScale: spec.fabric === 'leather' ? 0.2 : 0.5, sheen: spec.fabric === 'leather' ? 0 : 0.5, sheenRoughness: 0.8, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.3), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uPlacket = { value: spec.placket ? 0.007 / u : 0 }; sh.uniforms.uSole = { value: spec.sole ? minY + 0.018 * h : -1e9 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float cover;\nvarying float vCover;\nvarying vec3 vLocal;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCover = cover; vLocal = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCover;\nvarying vec3 vLocal;\nuniform float uPlacket;\nuniform float uSole;').replace('void main() {', 'void main() {\n  if (vCover < 0.5) discard;')
      // A darker front placket (zip line) makes the jacket read as a jacket; local X is the body's left-right axis.
      .replace('#include <color_fragment>', '#include <color_fragment>\n  if (uPlacket > 0.0 && abs(vLocal.x) < uPlacket && vLocal.z > 0.0) diffuseColor.rgb *= 0.45;\n  if (vLocal.y < uSole) diffuseColor.rgb = vec3(0.92, 0.9, 0.86) * (diffuseColor.r > 0.6 ? 0.25 : 1.0);');
  };
  mat.customProgramCacheKey = () => 'core-garment';
  const m = new THREE.SkinnedMesh(geo, mat); m.name = `garment-${spec.fabric}`; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
  m.customDepthMaterial = undefined;
  m.bind(body.skeleton, body.bindMatrix); return m;
}

function rebindHair(kit, name, body, color) {
  const src = kit.scenes.flatMap(s => { const o = []; s.traverse(x => { if (x.isSkinnedMesh && (x.name === name || x.parent?.name === name)) o.push(x); }); return o; })[0];
  if (!src) return null;
  // GLTFLoader makes repeated node names unique ("pelvis_3"): map each hair bone back to the body bone it copies.
  const byName = new Map(body.skeleton.bones.map(b => [b.name, b])), find = nm => byName.get(nm) || byName.get(nm.replace(/_\d+$/, ''));
  const bones = src.skeleton.bones.map(b => find(b.name)); if (bones.some(b => !b)) return null;
  const skel = new THREE.Skeleton(bones, src.skeleton.boneInverses);
  const mat = src.material.clone(); mat.color = new THREE.Color(color); mat.roughness = 0.6; mat.side = THREE.DoubleSide; mat.alphaTest = mat.alphaTest || 0;
  const m = new THREE.SkinnedMesh(src.geometry, mat); m.name = `hair-${name}`; m.castShadow = true; m.frustumCulled = false;
  m.bind(skel, src.bindMatrix); return m;
}

export async function buildAvatar(app) {
  const [gl, kit, skins, anim] = await Promise.all([get(`${A}body-${app.body}.glb`), get(`${A}hair-kit.glb`), get(`${A}skin-kit.glb`), get(`${A}anim.glb`)]);
  const root = new THREE.Group(); root.name = 'core-avatar';
  const model = THREE.cloneSkinned(gl.scene); root.add(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model), unitScale = TARGET_HEIGHT / (box.max.y - box.min.y);
  model.scale.setScalar(unitScale); model.position.y = -box.min.y * unitScale;
  let body = null; model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (/Superhero/.test(o.material?.name || '')) body = o; } });
  if (!body) throw Error('corps introuvable dans le modèle');
  // Unit of the body's local space in metres after scaling: the world scale of the body mesh.
  model.updateMatrixWorld(true); body.userData.unit = body.getWorldScale(new THREE.Vector3()).y;
  // Skin tone: base scan (light/dark) × tint.
  const tone = SKINS.find(s => s.id === app.skin) || SKINS[0], skinMat = body.material.clone();
  let alt = null; skins.scene.traverse(o => { if (o.isMesh && o.material?.name === `skin-${app.body}-${tone.base}`) alt = o.material.map; });
  if (alt) { alt.colorSpace = THREE.SRGBColorSpace; alt.flipY = false; skinMat.map = alt; }
  skinMat.color = new THREE.Color(tone.tint); skinMat.roughness = 0.62; body.material = skinMat;
  // Garments (CORE-made), hair and optional beard (Quaternius CC0).
  const parent = body.parent, add = m => m && parent.add(m);
  for (const g of [...GARMENTS[app.top], ...GARMENTS[app.bottom], ...GARMENTS.shoes]) {
    const color = g.regions.includes('foot') ? app.shoes : g.regions.includes('thigh') || (g.regions.includes('hips') && !g.regions.includes('chest')) ? app.bottomColor : g.inner ? '#e9e5dc' : app.topColor;
    add(garmentMesh(body, g, color));
  }
  if (app.hair !== 'none') add(rebindHair(kit, app.hair, body, app.hairColor));
  if (app.beard) add(rebindHair(kit, 'Hair_Beard', body, app.hairColor));
  // Animation: one mixer, named clips, smooth cross-fades.
  const mixer = new THREE.AnimationMixer(model), actions = Object.fromEntries(anim.animations.map(c => [c.name, mixer.clipAction(c)]));
  let current = null;
  const play = (name, fade = 0.35) => { const a = actions[name]; if (!a || a === current) return; a.reset().setEffectiveWeight(1).fadeIn(fade).play(); current?.fadeOut(fade); current = a; };
  play('Idle_Loop', 0);
  return { root, model, body, mixer, actions, play, update: dt => mixer.update(dt), get clip() { return current?.getClip().name; },
    dispose() { root.traverse(o => { if (o.isMesh && /garment|hair/.test(o.name)) { o.geometry !== body.geometry && /garment/.test(o.name) && o.geometry.dispose(); o.material.dispose(); } }); } };
}

// CORE agent: deliberately non-human — a luminous core inside two orbits and a ground ring. Never mistaken for a person.
export function buildAgent(color = '#62d8f2') {
  const g = new THREE.Group(); g.name = 'core-agent';
  const glow = new THREE.MeshStandardMaterial({ color: '#0b2a40', emissive: new THREE.Color(color), emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.2 });
  const shell = new THREE.MeshPhysicalMaterial({ color: '#a8ecff', transmission: 0.6, roughness: 0.15, thickness: 0.3, transparent: true, opacity: 0.55 });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), glow); core.position.y = 1.35; g.add(core);
  const hull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 2), shell); hull.position.y = 1.35; g.add(hull);
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.012, 8, 96), ringMat); r1.position.y = 1.35; r1.rotation.x = Math.PI / 2.4; g.add(r1);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.01, 8, 96), ringMat); r2.position.y = 1.35; r2.rotation.y = Math.PI / 2; g.add(r2);
  const base = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); base.rotation.x = -Math.PI / 2; base.position.y = 0.02; g.add(base);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 1.1, 12, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })); beam.position.y = 0.6; g.add(beam);
  const light = new THREE.PointLight(color, 1.2, 6, 2); light.position.y = 1.35; g.add(light);
  g.userData.tick = t => { core.rotation.y = t * 0.8; hull.rotation.y = -t * 0.3; r1.rotation.z = t * 0.6; r2.rotation.x = t * 0.45; const b = 1 + Math.sin(t * 2) * 0.04; core.scale.setScalar(b); g.children.forEach(c => { if (c !== base && c !== beam) c.position.y = 1.35 + Math.sin(t * 1.3) * 0.05; }); };
  return g;
}

// ---------- CORE agents as holographic humanoids (V7.2) ----------
// Same CC0 bodies and animations as people, rendered as light: translucent cyan body, bright Fresnel rim, slow scanlines
// and a floating role marker. Unmistakably synthetic at every distance; never clothed or textured like a person.
const holoMats = new Map();
export const HOLO_TIME = { value: 0 };
export function hologramMaterial(color = '#62d8f2', { skinned = true } = {}) {
  const key = `${color}|${skinned}`; if (holoMats.has(key)) return holoMats.get(key);
  const m = new THREE.MeshStandardMaterial({ color: '#2a6f93', emissive: new THREE.Color(color), emissiveIntensity: 0.9, roughness: 0.4, metalness: 0, transparent: true, depthWrite: true });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = HOLO_TIME; sh.uniforms.uHolo = { value: new THREE.Color(color) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHoloY;').replace('#include <project_vertex>', '#include <project_vertex>\nvHoloY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHoloY;\nuniform float uTime;\nuniform vec3 uHolo;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
        float scan = 0.72 + 0.28 * smoothstep(0.35, 0.65, fract(vHoloY * 7.0 - uTime * 0.6));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uHolo * 0.8, 0.55) + uHolo * fres * 1.4;
        gl_FragColor.a = clamp((0.55 + fres * 0.45) * scan, 0.0, 0.96);`);
  };
  m.customProgramCacheKey = () => `core-holo-${skinned}`;
  holoMats.set(key, m); return m;
}
const roleMarker = color => { const g = new THREE.Group(); const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 6), new THREE.MeshBasicMaterial({ color })); hex.rotation.x = Math.PI / 2; g.add(hex);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })); g.add(ring); g.position.y = 2.05; g.name = 'role-marker'; return g; };
export async function buildHologram({ body = 'f', color = '#62d8f2' } = {}) {
  const [gl, anim] = await Promise.all([get(`${A}body-${body}.glb`), get(`${A}anim.glb`)]);
  const root = new THREE.Group(), model = THREE.cloneSkinned(gl.scene); root.add(model); model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model), k = TARGET_HEIGHT / (box.max.y - box.min.y); model.scale.setScalar(k); model.position.y = -box.min.y * k;
  model.traverse(o => { if (o.isMesh) { o.material = hologramMaterial(color); o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = 2; } });
  const marker = roleMarker(color); root.add(marker);
  const mixer = new THREE.AnimationMixer(model), actions = Object.fromEntries(anim.animations.map(c => [c.name, mixer.clipAction(c)])); let cur = null;
  const play = (n, f = 0.35) => { const a = actions[n]; if (!a || a === cur) return; a.reset().fadeIn(f).play(); cur?.fadeOut(f); cur = a; };
  play('Idle_Loop', 0);
  return { root, model, mixer, play, marker, update: (dt, t) => { mixer.update(dt); marker.rotation.z = t * 0.8; marker.position.y = 2.05 + Math.sin(t * 2) * 0.03; }, get clip() { return cur?.getClip().name; } };
}
// Distant agents: one body baked in its idle pose (CPU skinning once), drawn instanced with the hologram material.
const baked = new Map();
export async function bakedHologramGeometry(body = 'f') {
  if (baked.has(body)) return baked.get(body);
  const [gl, anim] = await Promise.all([get(`${A}body-${body}.glb`), get(`${A}anim.glb`)]);
  const model = THREE.cloneSkinned(gl.scene), mixer = new THREE.AnimationMixer(model), idle = anim.animations.find(c => c.name === 'Idle_Loop');
  if (idle) { mixer.clipAction(idle).play(); mixer.update(0.5); }
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model), k = TARGET_HEIGHT / (box.max.y - box.min.y), parts = [];
  model.traverse(o => { if (!o.isSkinnedMesh || !/Superhero/.test(o.material?.name || '')) return; o.skeleton.update();
    const g = new THREE.BufferGeometry(), n = o.geometry.attributes.position.count, pos = new Float32Array(n * 3), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); pos.set([v.x * k, (v.y - box.min.y) * k, v.z * k], i * 3); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(o.geometry.index); g.computeVertexNormals(); parts.push(g); });
  const geo = parts[0]; baked.set(body, geo); return geo;
}
