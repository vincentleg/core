// CORE V8 — prototype vehicle at street level (V to get in or out). A game-style toy, NOT a traffic simulation: simple
// kinematics (acceleration, braking, speed-dependent steering), capped at 9 m/s, stopped by building footprints and agents.
export const LIMITS = { max: 9, reverse: 3, accel: 3.2, brake: 7, drag: 1.6, steer: 70 };

export function createVehicle(scene) {
  const { THREE, world } = scene, g = new THREE.Group(); g.name = 'core-vehicle';
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.2), mat('#e9eef4')); body.position.y = 0.55;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.0), mat('#0b1426')); cabin.position.set(0, 1.2, -0.2);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.08, 4.22), new THREE.MeshBasicMaterial({ color: '#62d8f2' })); stripe.position.y = 0.72;
  const wheelG = new THREE.CylinderGeometry(0.34, 0.34, 0.25, 16); wheelG.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.9, -1.35], [0.9, -1.35], [-0.9, 1.35], [0.9, 1.35]]) { const w = new THREE.Mesh(wheelG, mat('#1c2a3d')); w.position.set(x, 0.34, z); g.add(w); }
  g.add(body, cabin, stripe); g.visible = false; world.add(g);
  const V = { on: false, speed: 0, heading: 0, pos: [0, 0], bumped: 0 };
  // One step. input: { fwd: −1..1, turn: −1..1 }; blocked(x, z, pad) and nearAgent(x, z) → distance.
  function step(dt, { fwd, turn }, blocked, nearAgent) {
    const L = LIMITS;
    if (fwd > 0.05) V.speed = Math.min(L.max, V.speed + (V.speed < 0 ? L.brake : L.accel) * fwd * dt);
    else if (fwd < -0.05) V.speed = Math.max(-L.reverse, V.speed + (V.speed > 0 ? -L.brake : -L.accel) * -fwd * dt);
    else V.speed -= Math.sign(V.speed) * Math.min(Math.abs(V.speed), L.drag * dt);
    if (Math.abs(V.speed) > 0.2) V.heading = (V.heading + turn * L.steer * dt * Math.min(1, Math.abs(V.speed) / 3) * Math.sign(V.speed) + 360) % 360;
    const b = V.heading * Math.PI / 180, nx = V.pos[0] + Math.sin(b) * V.speed * dt, nz = V.pos[1] - Math.cos(b) * V.speed * dt;
    const nose = [nx + Math.sin(b) * 2 * Math.sign(V.speed || 1), nz - Math.cos(b) * 2 * Math.sign(V.speed || 1)];
    if (blocked(nx, nz, 1.0) || blocked(nose[0], nose[1], 0.4) || nearAgent(nose[0], nose[1]) < 1.2) { V.speed = 0; V.bumped++; }
    else V.pos = [nx, nz];
    g.position.set(V.pos[0], 0, V.pos[1]); g.rotation.y = -b; // model faces −z (north) at heading 0
    return V;
  }
  function enter(pos, heading) { V.on = true; V.pos = [...pos]; V.heading = heading; V.speed = 0; g.visible = true; g.position.set(pos[0], 0, pos[1]); g.rotation.y = -heading * Math.PI / 180; }
  function exit() { V.on = false; V.speed = 0; g.visible = false; return { pos: [V.pos[0] + Math.cos(V.heading * Math.PI / 180) * 1.8, V.pos[1] + Math.sin(V.heading * Math.PI / 180) * 1.8], heading: V.heading }; }
  return { state: V, step, enter, exit, group: g };
}
