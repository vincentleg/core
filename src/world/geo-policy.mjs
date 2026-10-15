// CORE World — policy-driven geographic restrictions (V3 prototype).
// Restrictions are data, not hard-coded places: each entry names its legal or licensing basis and which channels it
// applies to. The published list is EMPTY: CORE has not yet reviewed any jurisdiction's rules, and no place is listed
// by guesswork. Enforcement points: navigation (move/teleport), agent tools, data access, public visualization.
export const CHANNELS = ['navigation', 'agent-tools', 'data-access', 'visualization', 'simulation'];
export const RESTRICTIONS = []; // { id, basis, reviewedBy, reviewedAt, channels: [...], polygon: GeoJSON Polygon }

import { inRing, toLocal } from './geo.mjs';
const inside = (p, polygon) => { const [outer, ...holes] = polygon.coordinates.map(r => r.map(c => toLocal(p, c))); return inRing([0, 0], outer) && !holes.some(h => inRing([0, 0], h)); };

// Returns { allowed, restriction? } for a point on a channel. Unknown channels are refused (fail closed).
export function check(p, channel, list = RESTRICTIONS) {
  if (!CHANNELS.includes(channel)) return { allowed: false, reason: `canal inconnu : ${channel}` };
  for (const r of list) {
    if (!r.basis || !r.reviewedAt) return { allowed: false, reason: `restriction ${r.id} sans base juridique revue : refus par prudence` };
    if (r.channels.includes(channel) && inside(p, r.polygon)) return { allowed: false, restriction: r.id, reason: `zone restreinte (${r.basis})` };
  }
  return { allowed: true };
}
