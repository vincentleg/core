// CORE V7.2 — browser client for the civilisation runtime. One writer per browser (Web Locks): the first open CORE page
// runs the engine; other pages read the saved state and refresh when it changes. The clock advances only while a page
// runs it (4 Hz, paused when the tab is hidden), at ×1 by default; the person can pause or accelerate. State is saved to
// localStorage (core.civ.v72: registry-level identities are public; the log holds no private content unless a person
// explicitly consents to share a contribution with a mission).
import * as A from './analyses.mjs';
import { buildMissions } from './missions.mjs';
import { createRuntime, VERSION } from './runtime.mjs';
import { createPool, ollamaJSON } from '../intelligence/pool.mjs';
import { ollamaAvailable } from '../intelligence/orchestrator.mjs';
export const KEY = 'core.civ.v72';
const listeners = new Set();
let R = null, pool = null, poolInfo = { state: 'off' }, writer = false, timer = 0, speed = 1, paused = false, lastSave = 0, ready = null;
// One retry on a network error only (local static servers sometimes drop a connection on a cold load).
const getJSON = async u => { const r = await fetch(u).catch(() => new Promise(ok => setTimeout(ok, 400)).then(() => fetch(u))); if (!r.ok) throw Error(`${u} : HTTP ${r.status}`); return r.json(); };
const store = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: v => { try { localStorage.setItem(KEY, v); return true; } catch { return false; } } };
const notify = () => listeners.forEach(f => { try { f(R); } catch (e) { console.error(e); } });
export const onChange = f => { listeners.add(f); return () => listeners.delete(f); };
export const state = () => ({ writer, speed, paused, version: VERSION, reasoning: { ...poolInfo, queued: pool?.queued ?? 0, running: pool?.running ?? 0, workers: pool?.workers ?? 0, ledger: pool?.ledger?.length ?? 0, budget: pool?.budget } });
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
    // A local background worker (scripts/civ-worker.mjs) may have advanced the same civilisation: resume from it when
    // its checkpoint is further along (local development server only; the file never exists on a public site).
    try { const w = await fetch('.core-local/civ/state.json', { cache: 'no-store' }); if (w.ok) { const txt = await w.text(), clk = JSON.parse(txt).clock; if (clk > R.S.clock && R.restore(txt)) R.S.fromWorker = true; } } catch {}
    const run = () => {
      writer = true; let last = performance.now();
      timer = setInterval(() => { const now = performance.now(), dt = Math.min(1, (now - last) / 1000); last = now;
        if (paused || document.hidden) return; R.step(dt * speed); feedPool(); if (now - lastSave > 5000) save(); notify(); }, 250);
      addEventListener('pagehide', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
      if (pref().missions) enableReasoning(true);
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
// V8 — shared local reasoning. Only after the person switches it on (preference core.intelligence.v1.missions); Ollama is
// then contacted on 127.0.0.1 only. One worker, bounded queue and hourly budget (src/intelligence/pool.mjs).
const PREF = 'core.intelligence.v1';
const pref = () => { try { return JSON.parse(localStorage.getItem(PREF)) || {}; } catch { return {}; } };
export async function enableReasoning(on) {
  const p = pref(); p.missions = !!on; try { localStorage.setItem(PREF, JSON.stringify(p)); } catch {}
  if (!on) { pool?.stop(); pool = null; poolInfo = { state: 'off' }; R?.setReasoning(false); notify(); return poolInfo; }
  poolInfo = { state: 'detecting' }; notify();
  const a = await ollamaAvailable();
  if (!a.ok || !a.models.length) { poolInfo = { state: 'unavailable', reason: 'aucun modèle local détecté (Ollama doit tourner sur cet ordinateur)' }; R?.setReasoning(false); notify(); return poolInfo; }
  const model = a.models.includes(p.model) ? p.model : a.models[0];
  pool = createPool({ generate: ollamaJSON({ model }), workers: 1 }); poolInfo = { state: 'on', model }; R?.setReasoning(writer); notify(); return poolInfo;
}
function feedPool() {
  if (!pool || !writer) return;
  for (const j of R.pendingJobs()) { if (pool.running + pool.queued >= pool.workers) break;
    const m = R.M.get(j.mission); R.markJobRunning(j.id);
    pool.submit({ id: j.id, kind: j.kind, agent: j.agent, mission: m, findings: m.findings, hypothesis: j.target, priority: 1 })
      .then(res => { R.completeJob(j.id, res); save(); notify(); }, err => { R.completeJob(j.id, { ok: false, issues: [err.message] }); notify(); }); }
}
export const ledger = () => pool?.ledger || [];
// Human contributions reach the mission through the writer tab (the only one allowed to change the log). A reader page
// sends the request on a BroadcastChannel and waits for the writer's acknowledgement; consent is checked on both sides.
const BC = typeof BroadcastChannel === 'function' ? new BroadcastChannel('core-civ') : null;
const waiting = new Map();
BC?.addEventListener('message', e => { const m = e.data || {};
  if (m.type === 'submit' && writer && R) { let res; try { res = { ok: true, input: R.submitHumanInput(m.mission, m.input) }; save(); notify(); } catch (err) { res = { ok: false, error: err.message }; } BC.postMessage({ type: 'ack', id: m.id, ...res }); }
  if (m.type === 'ack' && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } });
export async function submit(mission, input) {
  if (!input?.consent) throw Error('consentement explicite requis');
  await ready;
  if (writer) { const h = R.submitHumanInput(mission, input); save(); notify(); return h; }
  if (!BC) throw Error('aucun canal vers le moteur');
  const id = Math.random().toString(36).slice(2);
  const r = await new Promise((res, rej) => { waiting.set(id, res); BC.postMessage({ type: 'submit', id, mission, input }); setTimeout(() => { if (waiting.delete(id)) rej(Error('le moteur (onglet CORE World) ne répond pas')); }, 4000); });
  if (!r.ok) throw Error(r.error); return r.input;
}
