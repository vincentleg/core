// Optional Chrome-only (CDP) negative-path audit: blocked engine/tiles, rapid map toggles,
// background tab during agents and clipboard fallback. Dependency-free; isolated browser only.
// node scripts/browser-negative-audit.mjs 9222 /tmp/core-chrome-negative
import fs from 'node:fs';
import assert from 'node:assert/strict';
const port = Number(process.argv[2] || 9222), output = process.argv[3] || '/tmp/core-browser-negative';
const results = [], log = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
const check = (name, value) => { assert.ok(value, name); results.push(name); console.log('PASS', name); };

// Each scenario gets a fresh tab so blocked URLs and buffered errors never leak between scenarios.
async function tab(blocked = []) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let next = 0; const pending = new Map(), errors = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id) { const p = pending.get(m.id); if (!p) return; clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') { errors.push(m); log.push(m); }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++next; const timer = setTimeout(() => { pending.delete(id); reject(Error(`Timeout: ${method}`)); }, 45000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const until = async (expression, tries = 120) => { for (let i = 0; i < tries; i++) { try { if (await evaluate(expression)) return; } catch (error) { if (!/context|navigation/i.test(error.message)) throw error; } await pause(250); } throw Error(`Condition failed: ${expression}`); };
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  if (blocked.length) await call('Network.setBlockedURLs', { urls: blocked });
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const close = async () => { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {}); };
  return { call, evaluate, until, errors, close };
}

try {
  // 1. Map engine unavailable: honest message, corridor stays reachable.
  let t = await tab(['*maplibre-gl-5.7.3/maplibre-gl.js*']); // Phase 9: MapLibre is self-hosted
  await t.call('Page.navigate', { url: 'http://localhost:8000/' }); await t.until('document.readyState === "complete"'); await pause(500);
  check('engine blocked shows message', await t.evaluate('document.querySelector("#msg").textContent.includes("Impossible de charger le moteur")'));
  await t.evaluate('document.querySelector("#pilot-btn").click()'); await t.until('location.pathname.endsWith("corridor.html") && !!globalThis.__CORE_APP');
  check('corridor reachable without map engine', true);
  check('engine blocked: no uncaught errors', t.errors.length === 0); await t.close();

  // 2. Vector tiles and terrain unavailable: status warns of incomplete data, no crash.
  t = await tab(['*tiles.openfreemap.org*', '*elevation-tiles-prod*']);
  await t.call('Page.navigate', { url: 'http://localhost:8000/' }); await t.until('/indisponible/.test(document.querySelector("#msg").textContent)');
  check('blocked tiles show unavailable-source message', true);
  check('blocked tiles: no uncaught errors', t.errors.length === 0); await t.close();

  // 3. Rapid terrain/building toggles during flights.
  t = await tab();
  await t.call('Page.navigate', { url: 'http://localhost:8000/' }); await t.until('!document.querySelector("#l-relief").disabled');
  for (const go of ['sf', 'paris', 'globe', 'tokyo']) {
    await t.evaluate(`document.querySelector('[data-go=${go}]').click()`);
    for (let i = 0; i < 6; i++) { await t.evaluate('document.querySelector("#l-relief").click();document.querySelector("#l-buildings").click()'); await pause(150); }
    await pause(1500);
  }
  await t.evaluate('document.querySelector("#l-trame").click()'); await pause(3000);
  check('rapid toggles leave terrain off', await t.evaluate('document.querySelector("#l-relief").getAttribute("aria-pressed") === "false"'));
  check('rapid toggles: no uncaught errors', t.errors.length === 0); await t.close();

  // 4. Hidden tab aborts agents; 5. clipboard failure shows selectable JSON.
  t = await tab();
  await t.call('Page.navigate', { url: 'http://localhost:8000/corridor.html' }); await t.until('!!globalThis.__CORE_APP');
  await t.evaluate('__CORE_APP.dive()'); await t.until('__CORE_APP.S.mode === "city"');
  await t.evaluate(`globalThis.auditRun = __CORE_APP.runAgents(); setTimeout(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }, 300); 0`);
  await t.until('!__CORE_APP.S.running');
  check('hidden tab aborts agents and blocks permit', await t.evaluate('__CORE_APP.S.permit.state === "BLOQUÉ" && __CORE_APP.S.proposal === null'));
  await t.evaluate(`delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); 0`);
  const before = await t.evaluate('document.querySelector("#m-served").textContent'); await pause(1200);
  check('visible tab resumes simulation', before !== await t.evaluate('document.querySelector("#m-served").textContent'));
  await t.evaluate('globalThis.auditRun = __CORE_APP.runAgents(); 0'); await t.until('!__CORE_APP.S.running', 960);
  check('ready proposal after resume', await t.evaluate('__CORE_APP.S.permit.state === "PRÊT POUR SIGNATURE"'));
  await t.evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(Error('denied')) } }); document.querySelector('#btn-copy').click(); 0`); await pause(200);
  check('clipboard failure shows selectable permit JSON', await t.evaluate('!document.querySelector("#permit-json").hidden && JSON.parse(document.querySelector("#permit-json").value).state === "PRÊT POUR SIGNATURE"'));
  check('corridor negative paths: no uncaught errors', t.errors.length === 0); await t.close();
} finally {
  fs.writeFileSync(`${output}.json`, JSON.stringify({ results, log }, null, 2));
  console.log('RESULTS', results.length, 'log saved to', `${output}.json`);
}
