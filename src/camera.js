// CORE — 3D camera navigation (Phase 3). MapLibre's camera is target-centred: bearing (0–360°),
// pitch (≤ 85°), zoom and pan around a centre point. There is no roll and no free 6-DoF flight; this module
// adds rotate / tilt / zoom / north / reset / orbit controls and keyboard shortcuts on top of MapLibre's own
// mouse, trackpad and touch handlers.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const S = { map: null, reduced: false, orbit: false, raf: 0, last: 0, degPerSec: 12 };

  function stopOrbit() {
    if (!S.orbit) return;
    S.orbit = false; cancelAnimationFrame(S.raf); S.raf = 0;
    const b = document.querySelector('[data-cam="orbit"]'); if (b) b.setAttribute('aria-pressed', 'false');
  }
  function startOrbit(center) {
    if (S.reduced) { rotate(90); return; } // reduced motion: a single step instead of continuous motion
    S.map.fire('mousedown'); // stops the intro spin (index.html listens for this)
    if (center) S.map.jumpTo({ center });
    S.orbit = true; S.last = performance.now();
    document.querySelector('[data-cam="orbit"]').setAttribute('aria-pressed', 'true');
    const tick = now => {
      if (!S.orbit) return;
      const dt = Math.min(100, now - S.last); S.last = now;
      S.map.setBearing((S.map.getBearing() + S.degPerSec * dt / 1000) % 360);
      S.raf = requestAnimationFrame(tick);
    };
    S.raf = requestAnimationFrame(tick);
  }
  const ease = opts => S.map.easeTo({ ...opts, duration: S.reduced ? 0 : 450 });
  function rotate(deg) { stopOrbit(); ease({ bearing: S.map.getBearing() + deg }); }
  function tilt(deg) { stopOrbit(); ease({ pitch: Math.max(0, Math.min(85, S.map.getPitch() + deg)) }); }
  function zoom(d) { stopOrbit(); ease({ zoom: S.map.getZoom() + d }); }
  function pan(dx, dy) { stopOrbit(); S.map.panBy([dx, dy], { duration: S.reduced ? 0 : 250 }); }
  function north() { stopOrbit(); ease({ bearing: 0 }); }
  function reset() { stopOrbit(); ease({ bearing: 0, pitch: S.map.getZoom() > 12 ? 55 : 0 }); }

  const ACTIONS = { rotl: () => rotate(-20), rotr: () => rotate(20), tiltu: () => tilt(10), tiltd: () => tilt(-10), zin: () => zoom(0.6), zout: () => zoom(-0.6), north, reset,
    orbit: () => (S.orbit ? stopOrbit() : startOrbit(S.focus || null)), help: () => { const h = $('cam-help'), b = document.querySelector('[data-cam="help"]'); h.hidden = !h.hidden; b.setAttribute('aria-expanded', String(!h.hidden)); } };
  const KEYS = { q: () => rotate(-20), e: () => rotate(20), r: () => tilt(10), f: () => tilt(-10), w: () => pan(0, -120), s: () => pan(0, 120), a: () => pan(-120, 0), d: () => pan(120, 0), '+': () => zoom(0.6), '=': () => zoom(0.6), '-': () => zoom(-0.6), o: ACTIONS.orbit, n: north, 0: reset };

  function init({ map, reduced }) {
    S.map = map; S.reduced = !!reduced;
    document.querySelectorAll('[data-cam]').forEach(b => b.addEventListener('click', () => ACTIONS[b.dataset.cam]()));
    // Any direct user gesture stops the orbit (no fight between user and animation).
    for (const ev of ['mousedown', 'touchstart', 'wheel', 'dragstart']) map.on(ev, e => { if (e.originalEvent) stopOrbit(); });
    document.addEventListener('keydown', e => {
      const t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if ('+=-'.includes(k) && t && t.closest && t.closest('#map')) return; // MapLibre's own keyboard handler zooms here
      if (KEYS[k]) { KEYS[k](); e.preventDefault(); }
    });
  }
  // Orbit around a selected location (used by the platform when a record, item or landmark is selected).
  function focus(lngLat) { S.focus = lngLat || null; }

  globalThis.CORE_CAMERA = { init, rotate, tilt, zoom, pan, north, reset, startOrbit, stopOrbit, focus, state: S };
})();
