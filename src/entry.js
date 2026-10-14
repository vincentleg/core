// CORE — opening experience (Phase 7). Natural Earth (NASA Blue Marble via GIBS) in space with the CORE wordmark;
// ENTER CORE fades the natural imagery into the holographic CORE Earth, reveals a digital network (graticule),
// then flies to North America and San Francisco. Skippable at any moment, instant with reduced motion,
// shortened on small or low-power devices, and bypassed with #app in the URL.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const S = { map: null, entered: false, anim: 0 };
  const NET = (() => { const f = []; for (let lon = -180; lon < 180; lon += 20) f.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: Array.from({ length: 33 }, (_, i) => [lon, -80 + i * 5]) }, properties: {} });
    for (let lat = -60; lat <= 60; lat += 20) f.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat]) }, properties: {} }); return { type: 'FeatureCollection', features: f }; })();
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const light = () => innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4;
  const HOLO = { coast: 'line-opacity', border: 'line-opacity', place: 'text-opacity' };

  function setLanding(on) {
    const map = S.map;
    map.setPaintProperty('natural-earth', 'raster-opacity', on ? 1 : 0);
    if (map.getLayer('core-net')) map.setPaintProperty('core-net', 'line-opacity', on ? 0 : 0.22);
    for (const [id, prop] of Object.entries(HOLO)) if (map.getLayer(id)) { if (on) { S.saved = S.saved || {}; S.saved[id] = map.getPaintProperty(id, prop); map.setPaintProperty(id, prop, id === 'place' ? 0 : 0.15); } else if (S.saved && S.saved[id] !== undefined) map.setPaintProperty(id, prop, S.saved[id]); }
    map.setPadding({ top: 0, left: 0, right: 0, bottom: on ? Math.round(innerHeight * 0.3) : 0 }); // lift the planet above the landing text
    for (const id of ['cov-halo', 'cov-dot', 'cov-label']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'none' : 'visible');
  }
  // Animate the natural → digital transformation (raster fades out, network fades in).
  function morph(ms) {
    const map = S.map, t0 = performance.now(); cancelAnimationFrame(S.anim);
    const step = () => { const p = ms ? Math.min(1, (performance.now() - t0) / ms) : 1, e = p * p * (3 - 2 * p);
      map.setPaintProperty('natural-earth', 'raster-opacity', 1 - e); if (map.getLayer('core-net')) map.setPaintProperty('core-net', 'line-opacity', 0.22 * e);
      if (p < 1) S.anim = requestAnimationFrame(step); else setLanding(false); };
    S.anim = requestAnimationFrame(step);
  }
  function reveal() { document.body.classList.remove('landing'); const l = $('landing'); if (l) { l.classList.add('gone'); setTimeout(() => { l.hidden = true; }, 700); } S.entered = true; try { sessionStorage.setItem('core.entered', '1'); } catch (_) { /* optional */ } }
  function enter() {
    if (S.entered) return; const map = S.map, quick = reduced(), k = light() ? 0.55 : 1;
    reveal();
    if (quick) { setLanding(false); map.jumpTo({ center: [-122.418, 37.782], zoom: 12.6, pitch: 50, bearing: -20 }); return afterArrival(); }
    morph(2400 * k);
    map.flyTo({ center: [-116, 37], zoom: 3.4, pitch: 0, bearing: 0, duration: 2600 * k, essential: true });
    map.once('moveend', () => { if (!S.entered) return; map.flyTo({ center: [-122.418, 37.782], zoom: 12.6, pitch: 52, bearing: -20, duration: 5200 * k, curve: 1.5, essential: true, padding: G.CORE_LAYOUT ? G.CORE_LAYOUT.padding() : undefined }); map.once('moveend', afterArrival); });
  }
  function skip() { if (S.entered) return; reveal(); cancelAnimationFrame(S.anim); setLanding(false); S.map.jumpTo({ center: [-122.418, 37.782], zoom: 12.6, pitch: 50, bearing: -20 }); afterArrival(); }
  function afterArrival() { if (G.CORE_AGENTS_WORLD) G.CORE_AGENTS_WORLD.arrive(); }

  function init({ map }) {
    S.map = map;
    if (!map.getSource('core-net')) { map.addSource('core-net', { type: 'geojson', data: NET }); map.addLayer({ id: 'core-net', type: 'line', source: 'core-net', maxzoom: 7, paint: { 'line-color': '#5cc8ff', 'line-width': 0.6, 'line-opacity': 0 } }, map.getLayer('coast') ? 'coast' : undefined); }
    let skipLanding = /(^|[#&])app\b/.test(location.hash);
    try { skipLanding = skipLanding || sessionStorage.getItem('core.entered') === '1'; } catch (_) { /* optional */ }
    if (skipLanding) { const l = $('landing'); if (l) l.hidden = true; document.body.classList.remove('landing'); S.entered = true; setLanding(false); return; }
    setLanding(true);
    $('enter-core').addEventListener('click', enter); $('landing-skip').addEventListener('click', skip);
    document.addEventListener('keydown', e => { if (S.entered) return; if (e.key === 'Enter') enter(); else if (e.key === 'Escape') skip(); });
    $('enter-core').focus({ preventScroll: true });
  }
  G.CORE_ENTRY = { init, enter, skip, state: S };
})();
