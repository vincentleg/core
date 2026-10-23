// Approximate distance is only for discovery around the map centre, never evidence or a coverage claim.
export function nearbyMissions(missions, [lon, lat], km = 2) {
  return missions.filter(m => {
    if (!m.center) return false;
    const dx = (m.center[0] - lon) * 111.32 * Math.cos(lat * Math.PI / 180);
    const dy = (m.center[1] - lat) * 111.32;
    return Math.hypot(dx, dy) <= km;
  });
}
