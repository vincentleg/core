// CORE World V8 — agents on the ground. The runtime keeps abstract positions (posts, evidence points, straight-line
// moves); this layer only changes how they are DRAWN: on the validated OSM pedestrian network (data/osm/walk-network.json,
// ODbL — walkways whose sampled points cross no building footprint, largest connected component).
//  • A standing agent is drawn on a network node near its runtime position; agents sharing a spot are spread over
//    neighbouring nodes (deterministic, by id), so nobody stands inside a building or on top of another agent.
//  • A moving agent follows the shortest network path between its two spots (binary-heap Dijkstra, cached per move).
//  • Outside the network's coverage (> 45 m from a mapped walkway), the runtime position is drawn unchanged.
// Deterministic and presentation-only: findings, timing and the event log are not affected.
const SNAP = 45;

export async function createGround(R, { url = 'data/osm/walk-network.json', raw = null } = {}) {
  if (!globalThis.CORE_POPULATION) await import('../agent-population.js');
  const POP = globalThis.CORE_POPULATION;
  const net = POP.network(raw || await (await fetch(url)).json());
  const spots = new Map(), routes = new Map(), stat = { routed: 0, offNetwork: 0, failed: 0 };
  const slot = id => { let h = 7; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return Math.abs(h) % 9; };
  // Network node index for (agent, runtime point), or -1 off-network.
  function node(id, p) {
    const key = `${id}|${p[0].toFixed(6)},${p[1].toFixed(6)}`; let s = spots.get(key);
    if (s === undefined) { const n = net.nearest(p); s = n.i < 0 || n.d > SNAP ? -1 : net.nearest(net.spread(p, slot(id))).i; if (spots.size > 6000) spots.clear(); spots.set(key, s); }
    return s;
  }
  function path(id, mv) {
    const key = `${id}|${mv.t0}`; let r = routes.get(key);
    if (r === undefined) {
      r = null; const a = node(id, mv.from), b = node(id, mv.to);
      if (a >= 0 && b >= 0) { const sp = a === b ? { nodes: [a] } : net.shortest(a, b);
        if (sp) { const c = sp.nodes.map(i => net.nodes[i]), cum = [0]; for (let i = 1; i < c.length; i++) cum.push(cum[i - 1] + POP.dist(c[i - 1], c[i])); r = { c, cum, L: cum[cum.length - 1] }; stat.routed++; } else stat.failed++; }
      else stat.offNetwork++;
      if (routes.size > 3000) routes.clear(); routes.set(key, r);
    }
    return r;
  }
  function along(r, d) {
    if (r.c.length === 1 || d <= 0) return r.c[0]; if (d >= r.L) return r.c[r.c.length - 1];
    let lo = 0, hi = r.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.cum[m] <= d) lo = m; else hi = m; }
    const k = (d - r.cum[lo]) / Math.max(1e-9, r.cum[hi] - r.cum[lo]), a = r.c[lo], b = r.c[hi]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }
  function pos(id) {
    const mv = R.S.move[id], p = R.posOf(id);
    if (!mv || R.S.clock >= mv.t1) { const s = node(id, p); return s < 0 ? p : net.nodes[s]; }
    const r = path(id, mv); if (!r) return p;
    const k = Math.max(0, Math.min(1, (R.S.clock - mv.t0) / (mv.t1 - mv.t0))), e = k * k * (3 - 2 * k);
    return along(r, e * r.L);
  }
  // Heading (degrees, compass) of a moving agent along its path; null when standing.
  function heading(id) {
    const mv = R.S.move[id]; if (!mv || R.S.clock >= mv.t1) return null; const r = path(id, mv); if (!r || r.L < 0.5) return null;
    const k = Math.max(0, Math.min(1, (R.S.clock - mv.t0) / (mv.t1 - mv.t0))), e = k * k * (3 - 2 * k), a = along(r, e * r.L), b = along(r, Math.min(r.L, e * r.L + 1));
    return (Math.atan2((b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), b[1] - a[1]) * 180 / Math.PI + 360) % 360;
  }
  return { pos, heading, net, stat, nearestWalk: p => net.nearest(p) };
}
