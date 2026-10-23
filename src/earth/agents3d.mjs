// CORE World V7.2 — the agent crowd at human scale. Positions and activities come from the civilisation runtime; this
// module only draws them: near agents (≤ 60 m, at most 12) as animated holographic humanoids whose animation follows
// their real activity (walk = travelling, talk = meeting, interact = inspecting/working, idle = no task); farther agents
// (≤ 350 m, at most 220) as instanced holograms in an idle pose. Distances are measured from the person's avatar.
import * as THREE from '../../assets/vendor/three-0.186.1/core3d.min.mjs';
import { buildHologram, bakedHologramGeometry, hologramMaterial, HOLO_TIME } from './avatar3d.mjs';
// Budgets per quality: high = 12 animated + 220 instanced within 350 m; balanced (phones, low memory) = 6 + 40 within 160 m.
export const BUDGETS = { high: { near: 60, far: 350, nearMax: 12, farMax: 220 }, balanced: { near: 45, far: 160, nearMax: 6, farMax: 40 } };
const COLOR = { housing: '#62d8f2', climate: '#7fdcaa', social: '#f0b45c', inequality: '#f0b45c', research: '#b9a2ff', 'data-science': '#b9a2ff', ethics: '#f29ad0', safety: '#f29ad0', simulation: '#9fb8ff' };
export const colorFor = dept => COLOR[dept] || '#62d8f2';
const CLIP = { travelling: 'Walk_Loop', returning: 'Walk_Loop', meeting: 'Idle_Talking_Loop', inspecting: 'Interact', working: 'Idle_Talking_Loop', idle: 'Idle_Loop' };

export function createCrowd(scene, quality = 'high') {
  const { near: NEAR, far: FAR, nearMax: NEAR_MAX, farMax: FAR_MAX } = BUDGETS[quality] || BUDGETS.high;
  const group = new THREE.Group(); group.name = 'core-agents'; scene.world.add(group);
  const near = new Map(), pending = new Set(), cur = new Map(); let inst = null, ready = false, t = 0;
  Promise.all([bakedHologramGeometry('f'), bakedHologramGeometry('m')]).then(([gf, gm]) => {
    inst = [gf, gm].map(g => { const m = new THREE.InstancedMesh(g, hologramMaterial('#62d8f2', { skinned: false }), FAR_MAX); m.count = 0; m.frustumCulled = false; m.renderOrder = 2; group.add(m); return m; }); ready = true; });
  const tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  // list: [{ id, x, z, state, dept, body, code }], me: [x, z] of the person's avatar
  function sync(list, me) {
    const withD = list.map(a => ({ ...a, d: Math.hypot(a.x - me[0], a.z - me[1]) })).filter(a => a.d < FAR).sort((a, b) => a.d - b.d);
    const wantNear = new Set(withD.slice(0, NEAR_MAX).filter(a => a.d < NEAR).map(a => a.id)), inRange = new Set(withD.map(a => a.id));
    for (const id of [...cur.keys()]) if (!inRange.has(id)) cur.delete(id);
    for (const [id, h] of near) if (!wantNear.has(id)) { group.remove(h.root); near.delete(id); }
    for (const a of withD) {
      const c = cur.get(a.id) || { x: a.x, z: a.z, h: 0 }; c.tx = a.x; c.tz = a.z; c.state = a.state; cur.set(a.id, c);
      if (wantNear.has(a.id) && !near.has(a.id) && !pending.has(a.id)) { pending.add(a.id);
        buildHologram({ body: a.body, color: colorFor(a.dept) }).then(h => { pending.delete(a.id); if (!wantNear.has(a.id)) return; h.root.userData.id = a.id; near.set(a.id, h); group.add(h.root); }); }
    }
    const far = withD.filter(a => !wantNear.has(a.id)).slice(0, FAR_MAX);
    if (ready) { const counts = [0, 0]; for (const a of far) { const k = a.body === 'm' ? 1 : 0, c = cur.get(a.id); q.setFromAxisAngle(up, c.h); tmp.compose(new THREE.Vector3(c.x, 0, c.z), q, one); inst[k].setMatrixAt(counts[k]++, tmp); }
      inst.forEach((m, k) => { m.count = counts[k]; m.instanceMatrix.needsUpdate = true; }); }
    return { near: wantNear.size, far: far.length };
  }
  function update(dt, reduced) {
    t += dt; HOLO_TIME.value = reduced ? 0 : t;
    for (const [id, c] of cur) { const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz); if (d > 0.02) { const k = Math.min(1, dt * 2.2); c.x += dx * k; c.z += dz * k; c.h = Math.atan2(dx, dz); } }
    for (const [id, h] of near) { const c = cur.get(id); if (!c) continue; h.root.position.set(c.x, 0, c.z); h.root.rotation.y = c.h; h.play(CLIP[c.state] || 'Idle_Loop'); h.update(reduced ? 0 : dt, reduced ? 0 : t); }
  }
  const nearest = me => { let best = null; for (const [id, c] of cur) { const d = Math.hypot(c.x - me[0], c.z - me[1]); if (!best || d < best.d) best = { id, d }; } return best; };
  return { sync, update, nearest, get counts() { return { near: near.size, total: cur.size }; } };
}
