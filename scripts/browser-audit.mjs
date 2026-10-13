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
// Firefox BiDi reports browser network messages (e.g. a failed cross-origin tile request) as type "javascript"
// without a stack; those are network failures handled by the page, reported separately, not uncaught exceptions.
const networkMessage = m => m.method === 'log.entryAdded' && m.params.type === 'javascript' && !(m.params.stackTrace?.callFrames?.length) && /Cross-Origin Request|requête multiorigine|CORS|NetworkError/i.test(m.params.text || '');
const uncaught = () => log.filter(m => m.method === 'Runtime.exceptionThrown' || (m.method === 'log.entryAdded' && m.params.type === 'javascript' && !networkMessage(m)));
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
    await evaluate(`document.querySelector('[data-go=${city}]').click()`); await pause(city === 'sf' ? 10500 : 8000);
    check(`city ${city}`, await evaluate(`document.querySelector("#zoom").textContent.startsWith(${JSON.stringify(city === 'sf' ? '14' : '16')})`));
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

  // ---- San Francisco world (Phase 2B) ----
  const sfBounds = '(c => c.lng > -122.53 && c.lng < -122.35 && c.lat > 37.69 && c.lat < 37.84)(__CORE_MAP.getCenter())';
  await evaluate('document.querySelector("#sources").open = false; document.querySelector("[data-go=globe]").click()'); await pause(7500);
  await evaluate('document.querySelector("[data-go=sf]").click()'); await pause(10500);
  check('SF cinematic fly-to arrives over San Francisco', await evaluate(`${sfBounds} && Math.abs(__CORE_MAP.getZoom() - 14.1) < 0.2 && __CORE_MAP.getPitch() > 60`));
  check('SF buildings, streets and water rendered', await evaluate(`['building', 'road', 'water'].every(l => __CORE_MAP.queryRenderedFeatures({ layers: [l] }).length > 0)`));
  check('procedural Salesforce/Transamerica rendered', await evaluate(`(s => s.has('salesforce') && s.has('transamerica'))(new Set(__CORE_MAP.queryRenderedFeatures({ layers: ['sf-landmarks-3d'] }).map(f => f.properties.landmark)))`));
  check('terrain shading active at city zoom', await evaluate(`__CORE_MAP.getLayoutProperty('hillshade', 'visibility') === 'visible' && __CORE_MAP.isSourceLoaded('hill')`));
  await evaluate(`document.querySelector('#sf-place').value = 'golden-gate'; document.querySelector('#sf-place').dispatchEvent(new Event('change'))`); await pause(7000);
  await shot('golden-gate');
  check('Golden Gate towers rendered at OSM tower positions', await evaluate(`(() => {
    const W = CORE_SF_WORLD, legs = __CORE_MAP.queryRenderedFeatures({ layers: ['sf-landmarks-3d'] }).filter(f => f.properties.part === 'tower-leg');
    const near = t => legs.some(f => W.distance(f.geometry.coordinates[0][0], t) < 30);
    return near(W.GOLDEN_GATE.southTower) && near(W.GOLDEN_GATE.northTower);
  })()`));
  check('Golden Gate cables and suspenders rendered', await evaluate(`(p => p.has('main-cable') && p.has('suspender') && p.has('deck'))(new Set(__CORE_MAP.queryRenderedFeatures({ layers: ['sf-landmarks-3d'] }).map(f => f.properties.part)))`));
  check('replaced OSM bridge towers hidden', await evaluate(`(() => { const z = CORE_SF_WORLD.replacementZones(); return !__CORE_MAP.queryRenderedFeatures({ layers: ['building'] }).some(f => CORE_SF_WORLD.replacedBy(f, z)); })()`));
  await evaluate(`document.querySelector('#q').value = 'golden gate'; document.querySelector('#search').requestSubmit()`); await pause(300);
  check('local search finds SF landmark', await evaluate(`document.querySelector('#msg').textContent.includes('Golden Gate')`));
  await evaluate('document.querySelector("#pilot-real").click()'); await pause(7500);
  await until('!!CORE_SF_VIEW.state.data', 120);
  check('pilot panel opens with dated snapshot', await evaluate(`!document.querySelector('#sf-panel').hidden && /Instantané du \\d{4}-\\d{2}-\\d{2}/.test(document.querySelector('#sf-fresh').textContent)`));
  check('snapshot SHA-256 verified in browser', await evaluate(`Object.values(CORE_SF_VIEW.state.verified).length === 6 && Object.values(CORE_SF_VIEW.state.verified).every(v => v === 'ok')`));
  check('parsed record counts match manifest', await evaluate(`CORE_SF_VIEW.state.manifest.datasets.every(d => CORE_SF_VIEW.state.data[CORE_SF_VIEW.DATA.find(x => x.file === d.file).key].features.length === d.features)`));
  check('permit records rendered on corridor', await evaluate(`__CORE_MAP.queryRenderedFeatures({ layers: ['sf-permits'] }).length > 20`));
  await evaluate(`(i => { i.checked = false; i.dispatchEvent(new Event('change')); })(document.querySelector('[data-group=permits]'))`);
  check('layer switch hides permits', await evaluate(`__CORE_MAP.getLayoutProperty('sf-permits', 'visibility') === 'none'`));
  await evaluate(`(i => { i.checked = true; i.dispatchEvent(new Event('change')); })(document.querySelector('[data-group=permits]'))`);
  await evaluate(`(s => { s.value = 'active'; s.dispatchEvent(new Event('change')); })(document.querySelector('#sf-status'))`);
  check('status filter recounts permits', await evaluate(`+document.querySelector('[data-count=permits]').textContent === CORE_SF_VIEW.state.data.permits.features.filter(f => f.properties.status_class === 'active').length`));
  await evaluate(`(s => { s.value = 'all'; s.dispatchEvent(new Event('change')); })(document.querySelector('#sf-status'))`); await pause(1200);
  const clicked = await evaluate(`(() => {
    const m = __CORE_MAP, c = m.getCanvas(), r = c.getBoundingClientRect(), panel = document.querySelector('#sf-panel').getBoundingClientRect();
    const f = m.queryRenderedFeatures({ layers: ['sf-permits'] }).map(f => m.project(f.geometry.coordinates)).find(p => p.x > 30 && p.y > 30 && p.x < r.width - 30 && p.y < r.height - 30 && document.elementFromPoint(r.left + p.x, r.top + p.y) === c);
    if (!f) return false;
    const opt = { clientX: r.left + f.x, clientY: r.top + f.y, bubbles: true, cancelable: true, button: 0 };
    c.dispatchEvent(new MouseEvent('mousedown', opt)); c.dispatchEvent(new MouseEvent('mouseup', opt)); c.dispatchEvent(new MouseEvent('click', opt));
    return true;
  })()`); await pause(600);
  await evaluate(`document.querySelector('[data-rec]') && document.querySelector('[data-rec]').click(); 0`); await pause(300);
  await shot('record');
  check('record selection shows observed record with provenance', clicked && await evaluate(`(t => t.includes('OBSERVÉ') && t.includes('Provenance') && t.includes('vérifié') && t.includes('pas une preuve'))(document.querySelector('#sf-inspect').innerText)`));
  check('record links to DataSF dataset and API record', await evaluate(`(a => a.some(h => /^https:\\/\\/data\\.sf\\.gov\\/d\\//.test(h)) && a.some(h => /^https:\\/\\/data\\.sf\\.gov\\/resource\\/b6tj-gt35\\.json\\?permit_number=/.test(h)))([...document.querySelectorAll('#sf-inspect a')].map(a => a.href))`));
  check('source attribution lists DataSF, OSM and procedural models', await evaluate(`(t => t.includes('DataSF') && t.includes('OpenStreetMap') && t.includes('Modèles procéduraux'))(document.querySelector('.maplibregl-ctrl-attrib').textContent)`));
  check('synthetic demo stays labelled separately', await evaluate(`document.querySelector('#pilot-btn').textContent.includes('synthétique')`));
  await evaluate('document.querySelector("#sf-close").click()');
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
  const network = log.filter(networkMessage).length; if (network) console.log('NOTE', network, 'browser network failure message(s) (handled by the map, not exceptions)');
  check('no uncaught JavaScript errors', uncaught().length === 0);
} finally {
  fs.writeFileSync(`${output}.json`, JSON.stringify({ results, log }, null, 2));
  console.log('RESULTS', results.length, 'log saved to', `${output}.json`);
  if (bidi) await call('session.end').catch(() => {});
  ws.close();
}
