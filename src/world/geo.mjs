// CORE World — geographic coordinates for avatar-scale movement (V3 prototype).
// WGS84 longitude/latitude stay the single source of truth for every record. Movement and distance tests run in a
// local East-North-Up tangent plane (metres) anchored at an origin that is re-anchored when the avatar travels far,
// so float error never accumulates: positions are stored as lng/lat, never as accumulated metre offsets.
const R = 6378137; // WGS84 equatorial radius (m)
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;

// Local tangent plane: exact enough (< 1 cm error) within a few kilometres of the origin.
export function toLocal(origin, p) {
  const [lng0, lat0] = origin, [lng, lat] = p;
  return [rad(lng - lng0) * R * Math.cos(rad(lat0)), rad(lat - lat0) * R];
}
export function fromLocal(origin, [x, y]) {
  const [lng0, lat0] = origin;
  return [lng0 + deg(x / (R * Math.cos(rad(lat0)))), lat0 + deg(y / R)];
}
// Great-circle distance in metres (haversine).
export function distance(a, b) {
  const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
// Move `metres` along compass `bearing` (degrees clockwise from north). Computed from the current point every step.
export function step(p, bearing, metres) {
  const o = p, [x, y] = [Math.sin(rad(bearing)) * metres, Math.cos(rad(bearing)) * metres];
  return fromLocal(o, [x, y]);
}
// Ray casting on a polygon ring given in local metres.
export function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const segDist = ([px, py], [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
// Distance in metres from point p to a GeoJSON Polygon/MultiPolygon/LineString geometry (0 when inside a polygon).
export function distanceToGeometry(p, geometry) {
  const loc = c => toLocal(p, c), P = [0, 0];
  const lines = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.type === 'MultiLineString' ? geometry.coordinates
    : geometry.type === 'Polygon' ? geometry.coordinates : geometry.type === 'MultiPolygon' ? geometry.coordinates.flat() : [];
  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    for (const poly of polys) { const [outer, ...holes] = poly.map(r => r.map(loc)); if (inRing(P, outer) && !holes.some(h => inRing(P, h))) return 0; }
  }
  let best = Infinity;
  for (const line of lines) { const pts = line.map(loc); for (let i = 1; i < pts.length; i++) best = Math.min(best, segDist(P, pts[i - 1], pts[i])); }
  return best;
}
// Re-anchoring rule for the rendering origin: keep it within `limit` metres of the avatar.
export function maybeReanchor(origin, p, limit = 1000) { return distance(origin, p) > limit ? [p[0], p[1]] : origin; }
// A circle polygon (GeoJSON) of `metres` radius, used for the realistic ground disc and the transition band.
export function circle(center, metres, n = 48) {
  const ring = []; for (let i = 0; i <= n; i++) ring.push(fromLocal(center, [Math.sin(2 * Math.PI * i / n) * metres, Math.cos(2 * Math.PI * i / n) * metres]));
  return { type: 'Polygon', coordinates: [ring] };
}
