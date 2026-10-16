// CORE Living Earth — street-scale 3D layer (V7), rendered inside MapLibre as a custom layer with a shared depth buffer.
// What it draws, and what each thing is:
//  • buildings within a radius of the focus: REAL OpenStreetMap footprints and heights, with PROCEDURAL façades
//    (floors, windows, ground-floor glazing, roof parapets) — a visual convention, not imagery of the real building;
//  • street trees at their REAL DataSF inventory positions; crown size follows the recorded trunk-diameter class
//    (approximate), species shape is generic;
//  • the human avatar (Quaternius CC0 body, CORE clothing) and the CORE agent (non-human by design);
//  • sunlight with real-time shadows (a fixed late-afternoon sun: an artistic choice, not the current sky).
import * as THREE from '../../assets/vendor/three-0.186.1/core3d.min.mjs';

const M_LAT = 110574, M_LON = lat => 111320 * Math.cos(lat * Math.PI / 180);
export const toLocal = (o, [lng, lat]) => [(lng - o[0]) * M_LON(o[1]), -(lat - o[1]) * M_LAT]; // x east, z south (metres)
export const toLngLat = (o, x, z) => [o[0] + x / M_LON(o[1]), o[1] - z / M_LAT];
const hash = n => { let x = (n | 0) * 2654435761 >>> 0; x ^= x >>> 15; return (x % 1000) / 1000; };

// ---------- procedural façade material ----------
// Per-vertex: uv = (metres along the wall, metres above ground); aStyle = family (0 stone, 1 brick, 2 concrete, 3 glass tower, 4 stucco).
const FAMILY = [[0.72, 0.66, 0.56], [0.55, 0.33, 0.27], [0.62, 0.62, 0.60], [0.30, 0.40, 0.48], [0.80, 0.74, 0.64]];
function facadeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0.0, vertexColors: true });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aWall; attribute float aStyle; attribute float aSeed; varying vec2 vWall; varying float vStyle; varying float vSeed; varying float vRoof;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWall = aWall; vStyle = aStyle; vSeed = aSeed; vRoof = step(0.5, abs(normal.y));');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec2 vWall; varying float vStyle; varying float vSeed; varying float vRoof;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      float glass = 0.0, lit = 0.0;
      if (vRoof < 0.5) {
        bool tower = vStyle > 2.5 && vStyle < 3.5;
        float floorH = tower ? 3.8 : 3.4, ground = tower ? 5.5 : 4.6;
        float bayW = tower ? 1.6 : (vStyle < 1.5 ? 2.6 : 3.0);
        vec2 cell = vec2(vWall.x / bayW, (vWall.y - ground) / floorH);
        vec2 f = fract(cell); vec2 id = floor(cell);
        if (vWall.y < ground) {
          // Ground floor: tall glazing between piers.
          float pier = step(0.12, fract(vWall.x / 4.2)) * step(fract(vWall.x / 4.2), 0.88);
          glass = pier * step(0.45, vWall.y) * step(vWall.y, ground - 0.6);
        } else if (tower) {
          glass = step(0.06, f.x) * step(f.x, 0.94) * step(0.08, f.y);
        } else {
          glass = step(0.22, f.x) * step(f.x, 0.78) * step(0.22, f.y) * step(f.y, 0.86);
          // Cornice band every few floors, darker sill line.
          diffuseColor.rgb *= 1.0 - 0.18 * step(0.94, f.y);
        }
        lit = glass * step(0.93, h21(id + vSeed * 31.0)) * step(0.0, vWall.y - ground);
        vec3 glassCol = mix(vec3(0.06, 0.10, 0.15), vec3(0.18, 0.27, 0.36), clamp(vWall.y / 120.0, 0.0, 1.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, glassCol, glass);
        roughnessFactor = mix(roughnessFactor, 0.08, glass);
        // Subtle weathering and storey variation so walls are never flat.
        diffuseColor.rgb *= 0.94 + 0.06 * h21(vec2(floor(vWall.y / 3.4), vSeed));
      } else {
        diffuseColor.rgb *= 0.78;
      }`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n      metalnessFactor = mix(metalnessFactor, 0.55, glass);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n      totalEmissiveRadiance += vec3(1.0, 0.8, 0.55) * lit * 0.35;');
  };
  m.customProgramCacheKey = () => 'core-facade';
  return m;
}

// ---------- buildings from vector tiles ----------
function buildingGeometry(features, origin) {
  const pos = [], nor = [], wall = [], style = [], seed = [], col = [], idx = [];
  let vi = 0;
  const push = (p, n, w, s, sd, c) => { pos.push(...p); nor.push(...n); wall.push(...w); style.push(s); seed.push(sd); col.push(...c); return vi++; };
  for (const f of features) {
    const h = Math.max(3, Number(f.properties.render_height) || 8), base = Math.min(h - 1, Math.max(0, Number(f.properties.render_min_height) || 0));
    const r = hash(f.id ?? 0), fam = h > 55 ? 3 : r < 0.3 ? 0 : r < 0.5 ? 1 : r < 0.75 ? 2 : 4;
    const c = FAMILY[fam].map(v => v * (0.9 + 0.2 * hash((f.id ?? 0) + 7)));
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
    for (const poly of polys) {
      const rings = poly.map(ring => ring.map(p => toLocal(origin, p)));
      // Walls (every ring, outer and holes), with metres-along-wall for the façade grid.
      for (const ring of rings) {
        let along = 0;
        for (let i = 0; i < ring.length - 1; i++) {
          const [x1, z1] = ring[i], [x2, z2] = ring[i + 1], len = Math.hypot(x2 - x1, z2 - z1); if (len < 0.05) continue;
          const nx = (z2 - z1) / len, nz = -(x2 - x1) / len; // outward for clockwise-in-screen rings; DoubleSide covers the rest
          const a = push([x1, base, z1], [nx, 0, nz], [along, base], fam, r, c), b = push([x2, base, z2], [nx, 0, nz], [along + len, base], fam, r, c);
          const cc = push([x2, h, z2], [nx, 0, nz], [along + len, h], fam, r, c), d = push([x1, h, z1], [nx, 0, nz], [along, h], fam, r, c);
          idx.push(a, b, cc, a, cc, d); along += len;
        }
      }
      // Roof.
      const outer = rings[0].slice(0, -1).map(([x, z]) => new THREE.Vector2(x, z)), holes = rings.slice(1).map(r2 => r2.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, z)));
      if (outer.length < 3) continue;
      const tris = THREE.ShapeUtils.triangulateShape(outer, holes), all = [...outer, ...holes.flat()], start = vi;
      for (const v of all) push([v.x, h, v.y], [0, 1, 0], [0, h], fam, r, c);
      for (const t of tris) idx.push(start + t[0], start + t[2], start + t[1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aWall', new THREE.Float32BufferAttribute(wall, 2)); g.setAttribute('aStyle', new THREE.Float32BufferAttribute(style, 1));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeBoundingSphere(); return g;
}

// ---------- trees (instanced) ----------
function treeMeshes(trees, origin) {
  // Crown: a cluster of smooth lobes (no faceting), darker underneath, with a leafy bump texture.
  const lobes = [], rnd = (i) => hash(i * 7919) - 0.5;
  for (let i = 0; i < 7; i++) { const r = i ? 0.55 + 0.15 * hash(i * 31) : 0.8, g = new THREE.SphereGeometry(r, 18, 12); g.translate(i ? rnd(i) * 1.1 : 0, i ? 0.15 + rnd(i + 9) * 0.6 : 0, i ? rnd(i + 3) * 1.1 : 0); lobes.push(g); }
  const crownGeo = THREE.mergeGeometries(lobes), p = crownGeo.attributes.position, shade = [];
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); shade.push(...[0.62, 0.62, 0.62].map(v => v + 0.38 * Math.min(1, Math.max(0, (y + 0.7) / 1.4)))); }
  crownGeo.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
  const leafC = document.createElement('canvas'); leafC.width = leafC.height = 128; const lg = leafC.getContext('2d');
  for (let i = 0; i < 900; i++) { lg.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.8})`; lg.beginPath(); lg.ellipse(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 3, 1 + Math.random() * 2, Math.random() * 3, 0, 7); lg.fill(); }
  const leaf = new THREE.CanvasTexture(leafC); leaf.wrapS = leaf.wrapT = THREE.RepeatWrapping; leaf.repeat.set(3, 3);
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.82, bumpMap: leaf, bumpScale: 2.2 }), trees.length);
  const trunkGeo = new THREE.CylinderGeometry(0.09, 0.14, 1, 7); trunkGeo.translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 1 }), trees.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  let k = 0;
  trees.forEach((t, i) => {
    const [x, z] = toLocal(origin, t.geometry.coordinates), dbh = Math.max(1, Number(t.properties.dbh_range) || 2), s = Math.min(1.6, 0.6 + dbh * 0.18), r = hash(Number(t.properties.treeid) || i);
    const trunkH = 2.2 + s * 1.4, rad = 1.1 + s * 1.1;
    m.compose(new THREE.Vector3(x, 0, z), q.identity(), new THREE.Vector3(s, trunkH + rad * 0.3, s)); trunks.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(x, trunkH + rad * 0.55, z), q.setFromEuler(new THREE.Euler(0, r * 6.28, 0)), new THREE.Vector3(rad, rad * (0.85 + r * 0.25), rad));
    crowns.setMatrixAt(k, m); crowns.setColorAt(k, c.setHSL(0.22 + r * 0.1, 0.32 + r * 0.18, 0.26 + r * 0.08)); k++;
  });
  crowns.count = k; [crowns, trunks].forEach(o => { o.castShadow = true; o.receiveShadow = true; o.instanceMatrix.needsUpdate = true; });
  return [trunks, crowns];
}

// Environment for reflections: a simple late-afternoon sky dome (gradient), so glass reflects sky, not a room.
function skyScene() {
  const sc = new THREE.Scene(), g = new THREE.SphereGeometry(100, 32, 16), c = [], p = g.attributes.position;
  const top = new THREE.Color('#5d8fc4'), hor = new THREE.Color('#f1d9b8'), gnd = new THREE.Color('#5a554e');
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 100, col = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(gnd, Math.min(1, -y * 4)); c.push(col.r, col.g, col.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  sc.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 7, 6) })); sunDisc.position.set(-60, 55, 45); sc.add(sunDisc);
  return sc;
}

// ---------- the layer ----------
export function createScene3D(maplibregl, { origin, quality = 'high' }) {
  const S = { origin, altitude: 0, quality, buildings: null, trees: null, detailIds: new Set(), avatar: null, agent: null, frame: 0, ms: [], onFrame: null };
  const scene = new THREE.Scene(), camera = new THREE.Camera(), clock = new THREE.Clock();
  const sun = new THREE.DirectionalLight('#fff0dc', 2.6), hemi = new THREE.HemisphereLight('#c7dcf2', '#4a4038', 1.1);
  sun.position.set(-160, 220, 140); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target, hemi);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShadowMaterial({ opacity: 0.32 })); ground.rotation.x = -Math.PI / 2; ground.position.y = 0.05; ground.receiveShadow = true; scene.add(ground);
  const world = new THREE.Group(); scene.add(world);
  let renderer = null, map = null;
  const layer = {
    id: 'core-3d', type: 'custom', renderingMode: '3d',
    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
      renderer.shadowMap.enabled = S.quality === 'high'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      sun.castShadow = S.quality === 'high'; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
      Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 10, far: 700 }); sun.shadow.camera.updateProjectionMatrix();
      scene.environment = new THREE.PMREMGenerator(renderer).fromScene(skyScene(), 0.02).texture; scene.environmentIntensity = 0.9;
    },
    render(gl, args) {
      const t0 = performance.now();
      if (map.getZoom() < 15) return; // street-scale only: nothing to draw from far away
      const mc = maplibregl.MercatorCoordinate.fromLngLat(S.origin, S.altitude), s = mc.meterInMercatorCoordinateUnits();
      const model = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      camera.projectionMatrix = new THREE.Matrix4().fromArray(args.defaultProjectionData?.mainMatrix || args.modelViewProjectionMatrix).multiply(model);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
      S.avatar?.update(dt); S.agent?.userData.tick?.(t); S.onFrame?.(dt);
      // Keep the shadow frustum around the focus (the avatar when present).
      const fx = S.avatar ? S.avatar.root.position.x : 0, fz = S.avatar ? S.avatar.root.position.z : 0;
      sun.position.set(fx - 160, 220, fz + 140); sun.target.position.set(fx, 0, fz); sun.target.updateMatrixWorld(); ground.position.set(fx, 0.05, fz);
      renderer.resetState(); renderer.setViewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.render(scene, camera);
      map.triggerRepaint();
      S.ms.push(performance.now() - t0); if (S.ms.length > 120) S.ms.shift();
    },
  };

  // Replace MapLibre's extrusions near the focus with detailed buildings (same footprints and heights).
  function refreshBuildings(radius = S.quality === 'high' ? 260 : 0) {
    if (!map) return 0;
    for (const id of S.detailIds) map.setFeatureState({ source: 'omt', sourceLayer: 'building', id }, { detail: false });
    S.detailIds.clear();
    if (S.buildings) { world.remove(S.buildings); S.buildings.geometry.dispose(); S.buildings = null; }
    if (!radius) return 0;
    const seen = new Map();
    for (const f of map.querySourceFeatures('omt', { sourceLayer: 'building' })) {
      if (f.id == null || !/Polygon/.test(f.geometry.type)) continue;
      const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
      const [x, z] = toLocal(S.origin, ring[0]); if (Math.hypot(x - (S.avatar?.root.position.x || 0), z - (S.avatar?.root.position.z || 0)) > radius) continue;
      const k = `${f.id}`; if (!seen.has(k)) seen.set(k, []); seen.get(k).push(f);
    }
    // Tiles split buildings at their edges: keep every piece of a building (pieces abut, so the result is continuous).
    const feats = [...seen.values()].flatMap(parts => { const key = new Set(); return parts.filter(p => { const s2 = JSON.stringify(p.geometry.coordinates).slice(0, 200); if (key.has(s2)) return false; key.add(s2); return true; }); });
    const geo = buildingGeometry(feats, S.origin);
    const mesh = new THREE.Mesh(geo, facadeMaterial()); mesh.material.side = THREE.DoubleSide; mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'core-buildings';
    world.add(mesh); S.buildings = mesh;
    for (const k of seen.keys()) { const id = Number(k); map.setFeatureState({ source: 'omt', sourceLayer: 'building', id }, { detail: true }); S.detailIds.add(id); }
    map.triggerRepaint(); return seen.size;
  }
  function setTrees(features) { if (S.trees) S.trees.forEach(o => world.remove(o)); S.trees = treeMeshes(features, S.origin); S.trees.forEach(o => world.add(o)); }
  function setAvatar(a) { if (S.avatar) world.remove(S.avatar.root); S.avatar = a; if (a) world.add(a.root); }
  function setAgent(g, at) { if (S.agent) world.remove(S.agent); S.agent = g; if (g) { g.position.set(at[0], 0, at[1]); world.add(g); } }
  function setQuality(q) { S.quality = q; if (renderer) { renderer.shadowMap.enabled = q === 'high'; sun.castShadow = q === 'high'; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); } }
  return { layer, state: S, refreshBuildings, setTrees, setAvatar, setAgent, setQuality, THREE };
}
