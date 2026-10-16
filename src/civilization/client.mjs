// CORE V7.2 — browser client for the civilisation runtime. One writer per browser (Web Locks): the first open CORE page
// runs the engine; other pages read the saved state and refresh when it changes. The clock advances only while a page
// runs it (4 Hz, paused when the tab is hidden), at ×1 by default; the person can pause or accelerate. State is saved to
// localStorage (core.civ.v72: registry-level identities are public; the log holds no private content unless a person
// explicitly consents to share a contribution with a mission).
import * as A from './analyses.mjs';
import { buildMissions } from './missions.mjs';
import { createRuntime, VERSION } from './runtime.mjs';
export const KEY = 'core.civ.v72';
const listeners = new Set();
let R = null, writer = false, timer = 0, speed = 1, paused = false, lastSave = 0, ready = null;
const getJSON = async u => { const r = await fetch(u); if (!r.ok) throw Error(`${u} : HTTP ${r.status}`); return r.json(); };
const store = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: v => { try { localStorage.setItem(KEY, v); return true; } catch { return false; } } };
const notify = () => listeners.forEach(f => { try { f(R); } catch (e) { console.error(e); } });
export const onChange = f => { listeners.add(f); return () => listeners.delete(f); };
export const state = () => ({ writer, speed, paused, version: VERSION });
export function setSpeed(x) { speed = x; notify(); }
export function setPaused(p) { paused = p; notify(); }
function save() { if (!writer || !R) return; store.set(R.serialize()); lastSave = performance.now(); }
export function saveNow() { save(); }

export function start() {
  if (ready) return ready;
  ready = (async () => {
    const D = {}; await Promise.all(Object.entries(A.FILES).map(async ([k, u]) => { D[k] = await getJSON(u); }));
    const reg = await getJSON('data/agents/sf-civilization.json');
    R = createRuntime({ registry: reg, missions: buildMissions(D, reg, { today: new Date().toISOString() }), keepEvents: 1200 });
    const saved = store.get(); if (saved) R.restore(saved);
    const run = () => {
      writer = true; let last = performance.now();
      timer = setInterval(() => { const now = performance.now(), dt = Math.min(1, (now - last) / 1000); last = now;
        if (paused || document.hidden) return; R.step(dt * speed); if (now - lastSave > 5000) save(); notify(); }, 250);
      addEventListener('pagehide', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
      return new Promise(() => {}); // hold the lock while this page lives
    };
    if (navigator.locks?.request) navigator.locks.request('core-civ-runtime', { ifAvailable: true }, lock => lock ? run() : null);
    else run();
    // Readers follow the writer through storage events.
    addEventListener('storage', e => { if (e.key === KEY && !writer && e.newValue) { R.restore(e.newValue); notify(); } });
    setTimeout(notify, 0);
    return R;
  })();
  return ready;
}
export const runtime = () => R;
