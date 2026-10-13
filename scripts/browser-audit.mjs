// Optional dependency-free audit against an isolated browser you start yourself.
// Chrome (CDP):          node scripts/browser-audit.mjs 9222 /tmp/core-chrome
// Firefox (WebDriver BiDi): node scripts/browser-audit.mjs 9223 /tmp/core-firefox bidi
// Serve this repository on localhost:8000 first. Never use a personal browser profile.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const port = Number(process.argv[2] || 9222), output = process.argv[3] || '/tmp/core-browser', bidi = process.argv[4] === 'bidi';
let wsUrl;
if (bidi) wsUrl = `ws://127.0.0.1:${port}/session`;
else {
  // A fresh tab keeps errors buffered by earlier pages out of this audit; fall back to an existing page.
  let target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(r => r.ok ? r.json() : null).catch(() => null);
  if (!target?.webSocketDebuggerUrl) target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(p => p.type === 'page');
  assert.ok(target, 'Browser page required');
  wsUrl = target.webSocketDebuggerUrl;
}
const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let next = 0; const pending = new Map(), log = [], results = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id) { const p = pending.get(m.id); if (!p) return; clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error) + ' ' + (m.message || ''))) : p.resolve(m.result); }
  else if (['Runtime.exceptionThrown', 'Log.entryAdded', 'Runtime.consoleAPICalled', 'log.entryAdded'].includes(m.method)) log.push(m);
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++next; const timer = setTimeout(() => { pending.delete(id); reject(Error(`Timeout: ${method}`)); }, 45000);
  pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
});
// Protocol adapter: identical audit steps over CDP (Chrome) or WebDriver BiDi (Firefox).
let context;
const evaluate = async expression => {
  if (bidi) {
    const r = await call('script.evaluate', { expression, target: { context }, awaitPromise: true, resultOwnership: 'none' });
    if (r.type === 'exception') throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
  const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const viewport = (width, height, mobile) => bidi ? call('browsingContext.setViewport', { context, viewport: { width, height } }) : call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
const navigate = url => bidi ? call('browsingContext.navigate', { context, url, wait: 'complete' }) : call('Page.navigate', { url });
const capture = async () => (await call(bidi ? 'browsingContext.captureScreenshot' : 'Page.captureScreenshot', bidi ? { context } : { format: 'png' })).data;
const uncaught = () => log.filter(m => m.method === 'Runtime.exceptionThrown' || (m.method === 'log.entryAdded' && m.params.type === 'javascript'));
const pause = ms => new Promise(r => setTimeout(r, ms));
const until = async (expression, tries = 60) => { for (let i = 0; i < tries; i++) { try { if (await evaluate(expression)) return; } catch (error) { if (!/context|navigation|frame|discarded/i.test(error.message || '')) throw error; } await pause(250); } throw Error(`Condition failed: ${expression}`); };
const shot = async name => fs.writeFileSync(`${output}-${name}.png`, Buffer.from(await capture(), 'base64'));
const check = (name, value) => { assert.ok(value, name); results.push(name); console.log('PASS', name); };
try {
  if (bidi) {
    await call('session.new', { capabilities: {} });
    context = (await call('browsingContext.create', { type: 'tab' })).context;
    await call('session.subscribe', { events: ['log.entryAdded'] });
  } else { await call('Page.enable'); await call('Runtime.enable'); await call('Log.enable'); }
  await viewport(1440, 1000, false);
  await navigate('http://localhost:8000/');
  await until('document.querySelector("#l-buildings") && !document.querySelector("#l-buildings").disabled', 240);
  await pause(1800); await shot('globe');
  check('globe loaded', await evaluate('!!document.querySelector(".maplibregl-canvas")'));
  await evaluate('document.querySelector("#l-relief").click()'); await pause(1500);
  check('terrain toggles at globe zoom', await evaluate('document.querySelector("#l-relief").getAttribute("aria-pressed") === "true"'));
  await evaluate('document.querySelector("#l-relief").click()'); await pause(500);
  for (const city of ['sf', 'paris', 'tokyo']) {
    await evaluate(`document.querySelector('[data-go=${city}]').click()`); await pause(8000);
    check(`city ${city}`, await evaluate('document.querySelector("#zoom").textContent.startsWith("16")'));
  }
  await shot('city');
  await evaluate('document.querySelector("#l-buildings").click()');
  check('building layer off', await evaluate('document.querySelector("#l-buildings").getAttribute("aria-pressed") === "false"'));
  await evaluate('document.querySelector("#l-buildings").click();document.querySelector("#l-relief").click()'); await pause(2000);
  check('terrain activated', await evaluate('document.querySelector("#l-relief").getAttribute("aria-pressed") === "true"'));
  await shot('terrain'); await evaluate('document.querySelector("#l-trame").click()');
  check('terrain off / map restored', await evaluate('document.querySelector("#l-relief").getAttribute("aria-pressed") === "false"'));
  check('unverified imagery disabled', await evaluate('document.querySelector("#l-sat").disabled'));
  for (const q of ['Paris', '37.7873, -122.3985', '999, 999', '<script>invalid</script>']) {
    await evaluate(`document.querySelector('#q').value=${JSON.stringify(q)};document.querySelector('#search').requestSubmit()`); await pause(q.startsWith('999') || q.startsWith('<') ? 50 : 8000);
    check(`local search: ${q}`, await evaluate(`document.querySelector('#msg').textContent.includes(${JSON.stringify(q === 'Paris' ? 'Lieu pilote' : q.startsWith('37') ? 'Coordonnées' : 'Adresses indisponibles')})`));
  }
  await evaluate('document.querySelector("#sources").open = true'); await shot('sources');
  await viewport(390, 844, true); await pause(300);
  check('mobile map fits viewport', await evaluate('document.documentElement.scrollWidth <= innerWidth'));
  await shot('mobile-map');
  await evaluate('document.querySelector("#pilot-btn").click()');
  await pause(700); if (!bidi) { await call('Runtime.disable'); await call('Runtime.enable'); }
  await until('!!globalThis.__CORE_APP'); await evaluate('__CORE_APP.dive()'); await until('__CORE_APP.S.mode === "city"'); await pause(1800);
  check('mobile corridor fits viewport', await evaluate('document.documentElement.scrollWidth <= innerWidth'));
  await shot('mobile-corridor');
  await viewport(1440, 1000, false);
  await evaluate('globalThis.auditRun = __CORE_APP.runAgents();document.querySelector("#btn-cancel").click()');
  await until('!__CORE_APP.S.running');
  check('cancel blocks permit and restores controls', await evaluate('__CORE_APP.S.permit.state === "BLOQUÉ" && !document.querySelector("#btn-run").disabled'));
  await evaluate('globalThis.auditRun = __CORE_APP.runAgents(); 0'); await until('!__CORE_APP.S.running', 960);
  check('full agents generate ready proposal', await evaluate('__CORE_APP.S.permit.state === "PRÊT POUR SIGNATURE" && __CORE_APP.S.sims === 3030'));
  await shot('ready');
  await evaluate('__CORE_APP.toggleTwist("evenement")');
  check('concert suspends permit', await evaluate('__CORE_APP.S.permit.state === "SUSPENDU"'));
  await shot('suspended');
  await evaluate('__CORE_APP.toggleTwist("evenement")');
  check('removing concert restores ready state', await evaluate('__CORE_APP.S.permit.state === "PRÊT POUR SIGNATURE"'));
  await evaluate('__CORE_APP.toggleTwist("chantier")');
  check('roadwork dependency follows scenario', await evaluate('__CORE_APP.S.permit.dependencies.twists.includes("chantier")'));
  await evaluate('document.querySelector("#btn-pause").click()'); const before = await evaluate('document.querySelector("#m-served").textContent'); await pause(400);
  check('pause holds simulated traffic', before === await evaluate('document.querySelector("#m-served").textContent'));
  await evaluate('document.querySelector("#btn-pause").click();document.querySelector("#seg-base").click();document.querySelector("#seg-prop").click()');
  check('plan comparison controls', await evaluate('__CORE_APP.S.shown === "proposal"'));
  await evaluate('globalThis.savedSearch = CORE.searchPlans;CORE.searchPlans = async () => { throw Error("INJECTED_AUDIT_FAILURE"); };globalThis.auditRun = __CORE_APP.runAgents(); 0'); await until('!__CORE_APP.S.running');
  check('failed run blocks stale permit and recovers UI', await evaluate('__CORE_APP.S.proposal === null && __CORE_APP.S.permit.state === "BLOQUÉ" && !document.querySelector("#btn-run").disabled'));
  await evaluate('CORE.searchPlans = savedSearch');
  check('no uncaught JavaScript errors', uncaught().length === 0);
} finally {
  fs.writeFileSync(`${output}.json`, JSON.stringify({ results, log }, null, 2));
  console.log('RESULTS', results.length, 'log saved to', `${output}.json`);
  if (bidi) await call('session.end').catch(() => {});
  ws.close();
}
