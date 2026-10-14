// Reproducible performance / density audit (Phase 6). Headless Chrome via CDP (port 9222).
//   node scripts/perf-audit.mjs [url] [out.json]
// Measures: time to platform ready, transferred bytes and request count, JS heap after GC, frames per second during
// a 4 s camera orbit at the corridor (headless = software rendering: compare runs, not absolute values), number of
// circle markers rendered in the corridor view, and sidewalk simulation recompute time in the browser.
import fs from 'node:fs';
const url = process.argv[2] || 'http://localhost:8000/', out = process.argv[3];
const tab = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let n = 0, bytes = 0, requests = 0; const pend = new Map(), errors = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) pend.get(m.id)?.(m); else if (m.method === 'Network.loadingFinished') { bytes += m.params.encodedDataLength; requests++; } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text); });
const call = (method, params = {}) => new Promise(r => { const id = ++n; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => (await call('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable'); await call('Network.setCacheDisabled', { cacheDisabled: true }); await call('Performance.enable'); await call('HeapProfiler.enable');
await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const t0 = Date.now(); await call('Page.navigate', { url });
for (let i = 0; i < 200 && !(await ev('!!(window.CORE_PLATFORM && CORE_PLATFORM.state.ready)')); i++) await new Promise(r => setTimeout(r, 100));
const readyMs = Date.now() - t0;
await new Promise(r => setTimeout(r, 4000)); const loadBytes = bytes, loadRequests = requests;
await ev(`(document.querySelector('#pilot-real') || { click() {} }).click(); 0`); await new Promise(r => setTimeout(r, 9000));
await ev(`__CORE_MAP.jumpTo({ center: [-122.4065, 37.7795], zoom: 15.6, pitch: 55, bearing: -44 }); new Promise(r => __CORE_MAP.once('idle', r))`);
await new Promise(r => setTimeout(r, 3000));
const circles = await ev(`(() => { const ls = __CORE_MAP.getStyle().layers.filter(l => l.type === 'circle' && __CORE_MAP.getLayoutProperty(l.id, 'visibility') !== 'none').map(l => l.id); const f = __CORE_MAP.queryRenderedFeatures({ layers: ls }); const by = {}; for (const x of f) by[x.layer.id] = (by[x.layer.id] || 0) + 1; return { total: f.length, byLayer: by }; })()`);
const overview = await ev(`(async () => { __CORE_MAP.jumpTo({ zoom: 14 }); await new Promise(r => __CORE_MAP.once('idle', () => r(0))); await new Promise(r => setTimeout(r, 1500)); const ls = __CORE_MAP.getStyle().layers.filter(l => l.type === 'circle' && __CORE_MAP.getLayoutProperty(l.id, 'visibility') !== 'none').map(l => l.id); const n = __CORE_MAP.queryRenderedFeatures({ layers: ls }).length; __CORE_MAP.jumpTo({ zoom: 15.6 }); await new Promise(r => __CORE_MAP.once('idle', () => r(0))); return n; })()`);
const fps = await ev(`new Promise(r => { let frames = 0; const t = performance.now(); const tick = () => { frames++; if (performance.now() - t < 4000) requestAnimationFrame(tick); else r(+(frames / ((performance.now() - t) / 1000)).toFixed(1)); }; __CORE_MAP.easeTo({ bearing: __CORE_MAP.getBearing() + 120, duration: 4000, easing: x => x }); requestAnimationFrame(tick); })`);
const sim = await ev(`(async () => { if (!window.CORE_SIM_SIDEWALK) return null; const sv = CORE_SF_VIEW; await sv.loadData(); const ctx = CORE_COORD.buildContext({ manifest: sv.state.manifest, data: sv.state.data, verified: sv.state.verified }); const t = performance.now(); for (let i = 0; i < 5; i++) CORE_SIM_SIDEWALK.run(ctx, { spacingFt: 20 + i }); return +((performance.now() - t) / 5).toFixed(1); })()`);
await call('HeapProfiler.collectGarbage'); const heap = Math.round((await call('Performance.getMetrics')).result.metrics.find(x => x.name === 'JSHeapUsedSize').value / 1048576);
const result = { url, date: new Date().toISOString(), viewport: '1440x900', readyMs, loadKB: Math.round(loadBytes / 1024), loadRequests, heapMB: heap, orbitFps: fps, corridorCircles: circles, overviewCirclesZ14: overview, simRunMs: sim, uncaughtErrors: errors };
console.log(JSON.stringify(result, null, 1)); if (out) fs.writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
ws.close(); await fetch(`http://127.0.0.1:9222/json/close/${tab.id}`);
