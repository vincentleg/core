// Optional dependency-free audit against an isolated browser you start yourself.
// Chrome (CDP):          node scripts/browser-audit.mjs 9222 /tmp/core-chrome
// Firefox (WebDriver BiDi): node scripts/browser-audit.mjs 9223 /tmp/core-firefox bidi
// Serve this repository on localhost:8000 first. Never use a personal browser profile.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
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
// Positive render checks wait (at most 20 s) for slow renderers, e.g. software WebGL in headless Firefox; they still fail if nothing draws.
const rendered = expression => until(expression, 80).then(() => true, () => false);
const shot = async name => fs.writeFileSync(`${output}-${name}.png`, Buffer.from(await capture(), 'base64'));
const check = (name, value) => { assert.ok(value, name); results.push(name); console.log('PASS', name); };
try {
  if (bidi) {
    await call('session.new', { capabilities: {} });
    context = (await call('browsingContext.create', { type: 'tab' })).context;
    await call('session.subscribe', { events: ['log.entryAdded'] });
    // Audit the files on disk, never a cached copy (network.setCacheBehavior needs Firefox 133+; older builds: use a fresh profile).
    await call('network.setCacheBehavior', { cacheBehavior: 'bypass' }).catch(() => console.log('NOTE cache bypass unsupported by this Firefox; use a fresh profile per run'));
  } else { await call('Page.enable'); await call('Runtime.enable'); await call('Log.enable'); await call('Network.enable'); await call('Network.setCacheDisabled', { cacheDisabled: true }); }
  await viewport(1440, 1000, false);
  // ---- Phase 7: opening experience (natural Earth, wordmark, ENTER CORE, skip) ----
  await navigate('http://localhost:8000/');
  await until('!!(window.CORE_ENTRY && CORE_ENTRY.state.map && __CORE_MAP.loaded())', 240); await pause(1500);
  check('landing shows the CORE wordmark, tagline and ENTER CORE over the natural Earth', await evaluate(`!document.querySelector('#landing').hidden && document.body.classList.contains('landing') && document.querySelector('#enter-core').textContent.trim() === 'ENTER CORE' && /Creation of Reborn Earth/i.test(document.querySelector('#landing').textContent) && __CORE_MAP.getPaintProperty('natural-earth', 'raster-opacity') === 1 && /NASA/.test(document.querySelector('.landing-credit').textContent)`));
  await shot('landing');
  await evaluate(`document.querySelector('#enter-core').click(); 0`); await pause(1200);
  check('ENTER CORE starts the transition (imagery fading, interface revealed)', await evaluate(`!document.body.classList.contains('landing') && __CORE_MAP.getPaintProperty('natural-earth', 'raster-opacity') < 1`));
  await until(`(c => Math.abs(c.lng + 122.418) < 0.05 && Math.abs(c.lat - 37.782) < 0.05)(__CORE_MAP.getCenter()) && !__CORE_MAP.isMoving()`, 200);
  check('the flight ends over San Francisco with the holographic style', await evaluate(`__CORE_MAP.getZoom() > 12 && __CORE_MAP.getPaintProperty('natural-earth', 'raster-opacity') === 0`));
  await shot('entered');
  await navigate('http://localhost:8000/#app');
  await until('document.querySelector("#l-buildings") && !document.querySelector("#l-buildings").disabled', 240);
  check('direct access (#app) skips the landing', await evaluate(`document.querySelector('#landing').hidden && !document.body.classList.contains('landing')`));
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
  for (const q of ['Paris', 'New York', '37.7873, -122.3985', '999, 999', '<script>invalid</script>']) {
    await evaluate(`document.querySelector('#q').value=${JSON.stringify(q)};document.querySelector('#search').requestSubmit()`); await pause(q.startsWith('999') || q.startsWith('<') ? 50 : 8000);
    check(`local search: ${q}`, await evaluate(`document.querySelector('#msg').textContent.includes(${JSON.stringify(q === 'Paris' ? 'Navigation seulement' : q === 'New York' ? 'zone d’étude opérationnelle' : q.startsWith('37') ? 'Coordonnées' : 'Adresses indisponibles')})`));
  }
  await evaluate('document.querySelector("#sources").open = true'); await shot('sources');

  // ---- San Francisco world (Phase 2B) ----
  const sfBounds = '(c => c.lng > -122.53 && c.lng < -122.35 && c.lat > 37.69 && c.lat < 37.84)(__CORE_MAP.getCenter())';
  await evaluate('document.querySelector("#sources").open = false; document.querySelector("[data-go=globe]").click()'); await pause(7500);
  await evaluate('document.querySelector("[data-go=sf]").click()'); await pause(10500);
  check('SF cinematic fly-to arrives over San Francisco', await evaluate(`${sfBounds} && Math.abs(__CORE_MAP.getZoom() - 14.1) < 0.2 && __CORE_MAP.getPitch() > 60`));
  check('SF buildings, streets and water rendered', await rendered(`['building', 'road', 'water'].every(l => __CORE_MAP.queryRenderedFeatures({ layers: [l] }).length > 0)`));
  check('procedural Salesforce/Transamerica rendered', await rendered(`(s => s.has('salesforce') && s.has('transamerica'))(new Set(__CORE_MAP.queryRenderedFeatures({ layers: ['sf-landmarks-3d'] }).map(f => f.properties.landmark)))`));
  check('terrain shading active at city zoom', await evaluate(`__CORE_MAP.getLayoutProperty('hillshade', 'visibility') === 'visible' && __CORE_MAP.isSourceLoaded('hill')`));
  await evaluate(`document.querySelector('#sf-place').value = 'golden-gate'; document.querySelector('#sf-place').dispatchEvent(new Event('change'))`); await pause(7000);
  await shot('golden-gate');
  check('Golden Gate towers rendered at OSM tower positions', await evaluate(`(() => {
    const W = CORE_SF_WORLD, legs = __CORE_MAP.queryRenderedFeatures({ layers: ['sf-landmarks-3d'] }).filter(f => f.properties.part === 'tower-leg');
    const near = t => legs.some(f => W.distance(f.geometry.coordinates[0][0], t) < 30);
    return near(W.GOLDEN_GATE.southTower) && near(W.GOLDEN_GATE.northTower);
  })()`));
  check('Golden Gate cables and suspenders rendered', await rendered(`(p => p.has('main-cable') && p.has('suspender') && p.has('deck'))(new Set(__CORE_MAP.queryRenderedFeatures({ layers: ['sf-landmarks-3d'] }).map(f => f.properties.part)))`));
  check('replaced OSM bridge towers hidden', await evaluate(`(() => { const z = CORE_SF_WORLD.replacementZones(); return !__CORE_MAP.queryRenderedFeatures({ layers: ['building'] }).some(f => CORE_SF_WORLD.replacedBy(f, z)); })()`));
  await evaluate(`document.querySelector('#q').value = 'golden gate'; document.querySelector('#search').requestSubmit()`); await pause(300);
  check('local search finds SF landmark', await evaluate(`document.querySelector('#msg').textContent.includes('Golden Gate')`));
  await evaluate('document.querySelector("#pilot-real").click()'); await pause(7500);
  await until('!!CORE_SF_VIEW.state.data', 120);
  check('pilot panel opens with dated snapshot', await evaluate(`!document.querySelector('#sf-panel').hidden && /Instantané du \\d{4}-\\d{2}-\\d{2}/.test(document.querySelector('#sf-fresh').textContent)`));
  check('snapshot SHA-256 verified in browser', await evaluate(`Object.values(CORE_SF_VIEW.state.verified).length === CORE_SF_VIEW.state.manifest.datasets.length && Object.values(CORE_SF_VIEW.state.verified).every(v => v === 'ok')`));
  check('parsed record counts match manifest', await evaluate(`CORE_SF_VIEW.state.manifest.datasets.every(d => CORE_SF_VIEW.state.data[CORE_SF_VIEW.DATA.find(x => x.file === d.file).key].features.length === d.features)`));
  check('permit records rendered on corridor', await rendered(`__CORE_MAP.queryRenderedFeatures({ layers: ['sf-permits'] }).length > 20`));
  await evaluate(`(i => { i.checked = false; i.dispatchEvent(new Event('change')); })(document.querySelector('[data-group=permits]'))`);
  check('layer switch hides permits', await evaluate(`__CORE_MAP.getLayoutProperty('sf-permits', 'visibility') === 'none'`));
  await evaluate(`(i => { i.checked = true; i.dispatchEvent(new Event('change')); })(document.querySelector('[data-group=permits]'))`);
  await evaluate(`(s => { s.value = 'active'; s.dispatchEvent(new Event('change')); })(document.querySelector('#sf-status'))`);
  check('status filter recounts permits', await evaluate(`+document.querySelector('[data-count=permits]').textContent === CORE_SF_VIEW.state.data.permits.features.filter(f => f.properties.status_class === 'active').length`));
  await evaluate(`(s => { s.value = 'all'; s.dispatchEvent(new Event('change')); })(document.querySelector('#sf-status'))`); await pause(1200);
  // Phase 6: permit symbols appear from zoom 14.5 (density layer below) — zoom in before selecting a record.
  await evaluate(`__CORE_MAP.jumpTo({ zoom: 15.6 }); new Promise(r => { __CORE_MAP.once('idle', () => r(0)); setTimeout(() => r(0), 5000); })`); await pause(800);
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
  check('record selection shows observed record with provenance', clicked && await evaluate(`(t => t.includes('OBSERVÉ') && t.includes('Provenance') && t.includes('fichier intact') && t.includes('pas une preuve'))(document.querySelector('#sf-inspect').innerText)`));
  check('record links to DataSF dataset and API record', await evaluate(`(a => a.some(h => /^https:\\/\\/data\\.sf\\.gov\\/d\\//.test(h)) && a.some(h => /^https:\\/\\/data\\.sf\\.gov\\/resource\\/b6tj-gt35\\.json\\?permit_number=/.test(h)))([...document.querySelectorAll('#sf-inspect a')].map(a => a.href))`));
  check('source attribution lists DataSF, OSM and procedural models', await evaluate(`(t => t.includes('DataSF') && t.includes('OpenStreetMap') && t.includes('Modèles procéduraux'))(document.querySelector('.maplibregl-ctrl-attrib').textContent)`));
  check('synthetic demo stays labelled separately', await evaluate(`document.querySelector('#pilot-btn').textContent.includes('synthétique')`));

  // ---- Phase 2C agent workspace ----
  const COORD = createRequire(import.meta.url)('../src/coord.js');
  const snap = (() => { const m = JSON.parse(fs.readFileSync('data/sf/manifest.json', 'utf8')), data = {}, verified = {};
    for (const d of m.datasets) { const t = fs.readFileSync(`data/sf/${d.file}`, 'utf8'), k = d.file.replace('.geojson', ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'x'; }
    return COORD.run(COORD.buildContext({ manifest: m, data, verified })); })();
  await evaluate(`document.querySelector('#tab-agents').click(); (s => { s.value = '450'; s.dispatchEvent(new Event('change')); })(document.querySelector('#cw-speed')); document.querySelector('#cw-run').click(); 0`);
  await pause(2500);
  check('agents run live with labelled real execution', await evaluate(`CORE_COORD_VIEW.state.mode === 'running' && document.querySelector('#cw-status').textContent.includes('EXÉCUTION RÉELLE') && document.querySelectorAll('#cw-log li').length > 0`));
  check('map follows the segment being inspected', await evaluate(`(async () => (await __CORE_MAP.getSource('coord-scan').getData()).features.length > 0 || __CORE_MAP.querySourceFeatures('coord-scan').length > 0)()`));
  await evaluate(`document.querySelector('#cw-pause').click(); 0`); await pause(600);
  const n1 = await evaluate('CORE_COORD_VIEW.state.events.length'); await pause(1500);
  check('pause stops execution', n1 === await evaluate('CORE_COORD_VIEW.state.events.length') && await evaluate(`document.querySelector('#cw-status').textContent.includes('EN PAUSE')`));
  await evaluate(`(s => { s.value = '0'; s.dispatchEvent(new Event('change')); })(document.querySelector('#cw-speed')); document.querySelector('#cw-pause').click(); 0`);
  await until(`CORE_COORD_VIEW.state.mode === 'done'`, 240);
  check('browser run matches independent Node run (events and fingerprint)', await evaluate(`CORE_COORD_VIEW.state.events.length`) === snap.events.length && await evaluate(`CORE_COORD_VIEW.state.result.fingerprint`) === snap.result.fingerprint);
  check('all six agent roles executed', await evaluate(`['discovery','evidence','scenario','evaluation','adversarial','gateway'].every(a => CORE_COORD_VIEW.state.events.some(e => e.agent === a))`));
  check('findings highlighted on the map', await rendered(`__CORE_MAP.queryRenderedFeatures({ layers: ['coord-findings-line'] }).length > 0`));
  const top = snap.result.findings.find(f => f.type === 'opportunity');
  await evaluate(`document.querySelector('[data-f="${top.id}"]').click(); 0`); await pause(2600);
  check('selecting a finding moves the camera to its street segment', await evaluate(`(() => { const g = CORE_COORD_VIEW.state.ctx.segments.get('${top.seg}').geometry.coordinates, c = __CORE_MAP.getCenter(), m = g[Math.floor(g.length / 2)]; return Math.hypot(c.lng - m[0], c.lat - m[1]) < 0.004 && __CORE_MAP.getZoom() > 15.5; })()`));
  check('finding permits highlighted by organisation', await rendered(`__CORE_MAP.queryRenderedFeatures({ layers: ['coord-points-circle'] }).length >= 2`));
  check('five scenarios evaluated and compared', await evaluate(`document.querySelectorAll('#cw-detail [data-s]').length === 5 && !!document.querySelector('#cw-detail table.metrics') && !!document.querySelector('#cw-detail svg.gantt')`));
  await evaluate(`document.querySelector('#cw-detail [data-s="S1"]').click(); 0`); await pause(500);
  check('selecting a scenario updates metrics and map', await evaluate(`(async () => document.querySelector('#cw-detail table.metrics thead').textContent.includes('S1') && (await __CORE_MAP.getSource('coord-points').getData()).features.some(f => f.properties.moved) === CORE_COORD_VIEW.state.result.analyses['${top.id}'].result.scenarios.find(s => s.id === 'S1').windows.some(w => w.shift !== 0))()`));
  check('decision requires human review and authorizes nothing', await evaluate(`(t => t.includes('Revue humaine obligatoire') && t.includes('n’autorise ni n’applique'))(document.querySelector('#cw-detail .decision').textContent) && CORE_COORD_VIEW.state.result.decisions['${top.id}'].decision.authorizes === false`));
  check('decision state matches Node gateway', await evaluate(`CORE_COORD_VIEW.state.result.decisions['${top.id}'].decision.state`) === snap.result.decisions[top.id].decision.state);
  check('metrics provenance and assumptions shown', await evaluate(`(t => t.includes('HYPOTHÉTIQUE') && t.includes('DÉRIVÉ DES DATES OBSERVÉES') && t.includes('Aucun coût'))(document.querySelector('#cw-detail').textContent)`));
  await evaluate(`document.querySelector('#cw-detail [data-inspect]').click(); 0`); await pause(500);
  check('evidence opens the source record with provenance', await evaluate(`!document.querySelector('#sf-body-records').hidden && document.querySelector('#sf-inspect').textContent.includes('Provenance')`));
  await evaluate(`document.querySelector('#tab-agents').click(); document.querySelector('#cw-replay').click(); 0`); await pause(800);
  check('replay is clearly labelled', await evaluate(`CORE_COORD_VIEW.state.mode === 'replay' && document.querySelector('#cw-status').textContent.includes('REJEU') && document.querySelector('#cw-log li .ev-op').textContent.startsWith('rejeu')`));
  await until(`CORE_COORD_VIEW.state.mode === 'done'`, 400);
  check('replay verified against re-execution', await evaluate(`CORE_COORD_VIEW.state.replayCheck === true`));
  await shot('agents');

  // ---- Phase 2D multidomain city intelligence ----
  const CITY = createRequire(import.meta.url)('../src/city-agents.js');
  const cityNode = (() => { const m = JSON.parse(fs.readFileSync('data/sf/manifest.json', 'utf8')), data = {}, verified = {};
    for (const d of m.datasets) { const t = fs.readFileSync(`data/sf/${d.file}`, 'utf8'), k = d.file.replace('.geojson', ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'x'; }
    return CITY.run(COORD.buildContext({ manifest: m, data, verified })); })();
  await evaluate(`document.querySelector('#themes').open = true; (i => { i.checked = true; i.dispatchEvent(new Event('change')); })(document.querySelector('[data-theme=energy]')); 0`); await pause(1500);
  check('thematic layers list every domain with status', await evaluate(`document.querySelectorAll('#th-list [data-theme]').length === 7 && document.querySelector('[data-theme=society]').disabled && document.querySelector('#th-list').textContent.includes('candidat')`));
  check('energy, nature and building layers render real records', await rendered(`['city-energy', 'city-trees'].every(l => __CORE_MAP.queryRenderedFeatures({ layers: [l] }).length > 0) && (__CORE_MAP.queryRenderedFeatures({ layers: ['city-bp', 'city-bp-cluster'] }).length > 0)`));
  await evaluate(`(i => { i.checked = false; i.dispatchEvent(new Event('change')); })(document.querySelector('[data-theme=nature]')); 0`); await pause(300);
  check('theme toggle hides its layers', await evaluate(`__CORE_MAP.getLayoutProperty('city-trees', 'visibility') === 'none'`));
  await evaluate(`(i => { i.checked = true; i.dispatchEvent(new Event('change')); })(document.querySelector('[data-theme=nature]')); 0`);
  const bpAll = await evaluate(`(async () => { CORE_CITY_VIEW.state.period = 'all'; CORE_CITY_VIEW.syncThemes(); return (await __CORE_MAP.getSource('city-bp-src').getData()).features.length; })()`);
  const bpRecent = await evaluate(`(async () => { (s => { s.value = 'recent'; s.dispatchEvent(new Event('change')); })(document.querySelector('#th-period')); return (await __CORE_MAP.getSource('city-bp-src').getData()).features.length; })()`);
  check('time filter changes displayed building permits', bpRecent < bpAll && bpRecent > 0);
  await evaluate(`document.querySelector('#tab-city').click(); (s => { s.value = '0'; s.dispatchEvent(new Event('change')); })(document.querySelector('#ci-speed')); document.querySelector('#ci-run').click(); 0`);
  await until(`CORE_CITY_VIEW.state.mode === 'done'`, 400);
  check('investigation in browser equals independent Node run', await evaluate(`CORE_CITY_VIEW.state.result.fingerprint`) === cityNode.result.fingerprint && await evaluate(`CORE_CITY_VIEW.state.events.length`) === cityNode.events.length);
  check('eight roles executed with real events', await evaluate(`['discovery','evidence','crossdomain','scenario','evaluation','adversarial','synthesis','gateway'].every(a => CORE_CITY_VIEW.state.events.some(e => e.agent === a))`));
  await pause(2200);
  check('map shows the discovered block, works, trees and relations', await rendered(`__CORE_MAP.queryRenderedFeatures({ layers: ['ci-block-line'] }).length > 0 && new Set(__CORE_MAP.queryRenderedFeatures({ layers: ['ci-points-circle'] }).map(f => f.properties.role)).size >= 3`));
  check('decision brief has all required sections', await evaluate(`(t => ['Action recommandée', 'Alternatives évaluées', 'Preuves', 'Observation, dérivation', 'Graphe de connaissances', 'Revue adversariale', 'Incertitudes', 'Passerelle de décision humaine', 'Aucune action physique'].every(x => t.includes(x)))(document.querySelector('#ci-brief').textContent)`));
  check('gateway state matches Node and never authorizes', await evaluate(`CORE_CITY_VIEW.state.result.decision.state`) === cityNode.result.decision.state && await evaluate(`CORE_CITY_VIEW.state.result.decision.authorizes === false`));
  await evaluate(`document.querySelector('#ci-brief [data-alt="R1"]').click(); 0`); await pause(300);
  check('selecting an alternative updates metrics', await evaluate(`document.querySelector('#ci-brief table.metrics thead').textContent.includes('R1') && document.querySelector('#ci-brief').textContent.includes('Preuves manquantes pour R1')`));
  await evaluate(`document.querySelector('#ci-export').click(); 0`); await pause(300);
  check('decision brief JSON export is valid and complete', await evaluate(`(j => j.brief && j.decision && j.fingerprint === CORE_CITY_VIEW.state.result.fingerprint && Array.isArray(j.trace) && j.trace.length === CORE_CITY_VIEW.state.events.length)(JSON.parse(CORE_CITY_VIEW.state.lastExport))`));
  const fpBefore = await evaluate('CORE_CITY_VIEW.state.result.fingerprint');
  await evaluate(`(b => { b.value = '20'; b.dispatchEvent(new Event('input')); })(document.querySelector('#ci-buffer')); 0`); await pause(1500);
  await until(`CORE_CITY_VIEW.state.mode === 'done' && CORE_CITY_VIEW.state.params.treeBufferM === 20`, 400);
  check('changing a parameter genuinely recomputes', await evaluate('CORE_CITY_VIEW.state.result.fingerprint') !== fpBefore && await evaluate(`document.querySelector('#ci-brief').textContent.includes('≤ 20 m')`));
  await evaluate(`(b => { b.value = '12'; b.dispatchEvent(new Event('input')); })(document.querySelector('#ci-buffer')); 0`); await pause(1500); await until(`CORE_CITY_VIEW.state.mode === 'done' && CORE_CITY_VIEW.state.params.treeBufferM === 12`, 400);
  await shot('investigation');
  // Phase 6: Demo 2.0 replaces the earlier text-heavy guides.
  await evaluate(`CORE_DEMO.go(8); 0`); await pause(3000);
  check('guided demo (9 steps, Phase 10) reaches the human-oversight step with real data and no authorization', await evaluate(`(el => !!el && !el.hidden && el.textContent.includes('9 / 9') && /aucune autorisation/i.test(el.textContent) && CORE_DEMO.STEPS.length === 9)(document.querySelector('#demo2'))`));
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); 0`);
  check('Escape closes the demonstration', await evaluate(`document.querySelector('#demo2').hidden && !document.body.classList.contains('demo-on')`));
  check('dock starts compact (world first)', await evaluate(`document.body.classList.contains('console-min') && getComputedStyle(document.querySelector('#console-body')).display === 'none' && document.querySelector('.console').getBoundingClientRect().height < 320`));
  await evaluate(`document.querySelector('#console-toggle').click(); 0`);
  check('dock expands on demand', await evaluate(`!document.body.classList.contains('console-min') && getComputedStyle(document.querySelector('#console-body')).display !== 'none'`));
  await evaluate(`document.querySelector('#console-toggle').click(); 0`);
  check('console can be collapsed to free the map', await evaluate(`document.body.classList.contains('console-min') && getComputedStyle(document.querySelector('#console-body')).display === 'none'`));
  await evaluate(`document.querySelector('#console-toggle').click(); 0`);

  // ---- Phase 3: professional platform, City Intelligence, agents, missions, camera ----
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); 0`); await until('!!(window.CORE_PLATFORM && CORE_PLATFORM.state.ready)', 120);
  check('navigation has five sections; earlier views stay reachable', await evaluate(`[...document.querySelectorAll('#appnav [data-sec]')].map(b => b.dataset.sec).join() === 'world,civ,intel,missions,evidence' && ['agents','problems','activity','sims','decisions','data','health','demo'].every(k => document.querySelector('#legacy-sec [data-sec=' + k + ']'))`));
  await evaluate(`document.querySelector('[data-sec=intel]').click(); 0`); await pause(1500);
  check('city intelligence lists real official items with dates and verification', await evaluate(`document.querySelectorAll('#in-list li').length > 20 && document.querySelector('#ws-body').textContent.includes('source officielle') && document.querySelector('#ws-body').textContent.includes('Planification indépendante du navigateur')`));
  const refreshed = await evaluate(`CORE_PLATFORM.refresh(true).then(r => r.checked.length)`);
  check('browser refresh queries only CORS-capable, active sources', refreshed === await evaluate(`CORE_FEEDS.SOURCES.filter(s => s.browser && s.enabled !== false).length`) && refreshed >= 6);
  check('browser refresh is rate-limited', await evaluate(`CORE_PLATFORM.refresh(false).then(r => r.checked.length === 0)`));
  check('source health shows stale official sources', await evaluate(`document.querySelector('[data-sec=intel]').click(); new Promise(r => setTimeout(r, 800)).then(() => /périmées/.test(document.querySelector('#ws-body').textContent))`));
  await evaluate(`document.querySelector('[data-sec=agents]').click(); 0`); await pause(800);
  check('organization chart shows real counts (registered, executable, unavailable)', await evaluate(`(t => t.includes('profils enregistrés') && t.includes('exécutables') && t.includes('indisponibles'))(document.querySelector('#ws-body').textContent) && document.querySelectorAll('#ws-body .org details').length >= 28`));
  await evaluate(`document.querySelector('[data-agent="core.san-francisco.forestry.street-trees"]').click(); 0`); await pause(300);
  check('agent profile shows identity, permission, knowledge, evaluations and history', await evaluate(`(t => ['Permission', 'Superviseur', 'Mode d’exécution', 'Budget', 'Collection de connaissances', 'Évaluations', 'Historique de missions', 'aucune qualification'].every(x => t.includes(x)))(document.querySelector('#ag-profile').textContent)`));
  const nodeMission = JSON.parse(fs.readFileSync('data/missions/index.json', 'utf8')).missions.find(m => m.origin === 'corridor:7056000');
  await evaluate(`document.querySelector('[data-sec=intel]').click(); 0`); await pause(800);
  await evaluate(`document.querySelector('[data-launch="corridor:7056000"]').click(); 0`);
  await until(`CORE_PLATFORM.state.current && !!CORE_PLATFORM.state.current.decision`, 240);
  check('feed event becomes a mission executed by specialists in the browser', await evaluate(`(m => m.tasks.length >= 8 && m.tasks.every(t => t.state === 'succeeded') && m.state === 'needs-human-review')(CORE_PLATFORM.state.current)`));
  check('browser mission equals the recorded Node mission (fingerprint)', await evaluate(`CORE_PLATFORM.state.current.fingerprint`) === nodeMission.fingerprint);
  check('mission workspace shows real tasks, findings and the gateway', await evaluate(`(t => t.includes('EXÉCUTION RÉELLE') && t.includes('Constats partagés') && t.includes('Passerelle de mission') && t.includes('Revue humaine obligatoire'))(document.querySelector('#ws-body').textContent)`));
  // The camera may still be flying to the target: rendered() waits (bounded) for it to draw.
  check('mission target highlighted on the map', await rendered(`__CORE_MAP.queryRenderedFeatures({ layers: ['pf-target-line'] }).length > 0`));
  const cancelled = await evaluate(`(async () => { const run = CORE_PLATFORM.launch({ type: 'question', text: 'Annulation de test', segment: '7051000' });
    await new Promise(r => { const t = setInterval(() => { const m = CORE_PLATFORM.state.current; if (m && m.target.question === 'Annulation de test') { clearInterval(t); CORE_MISSIONS.cancel(m); r(); } }, 0); });
    const m = await run; return m.state + ':' + m.tasks.filter(t => t.state === 'cancelled').length; })()`);
  check('mission cancellation works', /^cancelled:[1-9]/.test(cancelled));
  await evaluate(`document.querySelector('[data-sec=decisions]').click(); 0`); await pause(500);
  check('decisions view lists gateway outcomes without authorizations', await evaluate(`document.querySelectorAll('#ws-body tbody tr').length >= 2 && document.querySelector('#ws-body').textContent.includes('authorizes: false')`));
  await evaluate(`document.querySelector('[data-sec=data]').click(); 0`); await pause(1200);
  check('data view shows verified snapshots, knowledge and contradictions', await evaluate(`(t => t.includes('vérifié') && t.includes('Bibliothèque de connaissances') && t.includes('golden-gate-main-span-m'))(document.querySelector('#ws-body').textContent)`));
  await evaluate(`document.querySelector('[data-sec=sims]').click(); 0`); await pause(400);
  check('simulation view marks unavailable models', await evaluate(`(t => t.includes('indisponible') && t.includes('opérationnel'))(document.querySelector('#ws-body').textContent)`));
  await evaluate(`document.querySelector('[data-sec=world]').click(); CORE_CAMERA.stopOrbit(); __CORE_MAP.jumpTo({ bearing: 0 }); 0`);
  const b0 = await evaluate('__CORE_MAP.getBearing()');
  await evaluate(`document.querySelector('[data-cam=orbit]').click(); 0`); await pause(2000);
  const b1 = await evaluate('__CORE_MAP.getBearing()');
  check('360° orbit rotates the camera continuously', Math.abs(b1 - b0) > 5);
  await evaluate(`__CORE_MAP.fire('mousedown', { originalEvent: new MouseEvent('mousedown') }); 0`); await pause(300);
  check('a user gesture stops the orbit', await evaluate('!CORE_CAMERA.state.orbit'));
  const b2 = await evaluate('__CORE_MAP.getBearing()');
  await evaluate(`document.body.focus(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' })); 0`); await pause(700);
  check('keyboard rotation (E)', Math.abs((await evaluate('__CORE_MAP.getBearing()')) - b2) > 5);
  await evaluate(`document.querySelector('[data-cam=reset]').click(); 0`); await pause(700);
  check('reset view returns north-up', Math.abs(await evaluate('__CORE_MAP.getBearing()')) < 0.5);
  await evaluate(`document.querySelector('[data-cam=help]').click(); 0`);
  check('navigation help documents trackpad, keyboard and 6-DoF limits', await evaluate(`!document.querySelector('#cam-help').hidden && /6 degrés de liberté/.test(document.querySelector('#cam-help').textContent)`));
  await evaluate(`document.querySelector('[data-cam=help]').click(); 0`);
  await shot('platform');

  // ---- Phase 4: model-assisted agents, evaluated learning, living City Intelligence, human review ----
  await evaluate(`document.querySelector('[data-sec=agents]').click(); 0`); await pause(1500);
  check('agents view reports the model-assisted specialists and the actual model status', await evaluate(`(t => t.includes('assistés par modèle') && /qwen3:8b|non joignable|absent/.test(t))(document.querySelector('#ws-body').textContent)`));
  await evaluate(`document.querySelector('[data-agent="core.san-francisco.housing.urban-planning-analyst"]').click(); 0`); await pause(300);
  check('model-assisted profile shows model, role-scoped collection, knowledge evaluation and learning history', await evaluate(`(t => ['Modèle', 'Collection de connaissances', 'Évaluation des connaissances du rôle', 'Apprentissage contrôlé', 'ajouté par apprentissage approuvé'].every(x => t.includes(x)))(document.querySelector('#ag-profile').textContent)`));
  const cogIndex = fs.existsSync('data/missions/cognitive/index.json') ? JSON.parse(fs.readFileSync('data/missions/cognitive/index.json', 'utf8')) : null;
  if (cogIndex && cogIndex.missions.length) {
    await evaluate(`document.querySelector('[data-sec=missions]').click(); 0`); await pause(800);
    await evaluate(`document.querySelector('#ms-tab-cog').click(); 0`); await pause(500);
    await evaluate(`document.querySelector('[data-cogrec]').click(); 0`); await until(`!!CORE_PLATFORM.state.cogCurrent && !!document.querySelector('.decision')`, 120);
    check('recorded live-model collaboration shows tool calls, validated model outputs and the gateway', await evaluate(`(t => t.includes('MISSION ENREGISTRÉE — exécution réelle du modèle local') && t.includes('Appels d’outils — calcul déterministe') && t.includes('Interprétations du modèle — validées') && t.includes('Passerelle cognitive'))(document.querySelector('#ws-body').textContent)`));
    // Re-verification uses the committed feed snapshot. If the scheduler has refreshed the feeds since the mission was
    // recorded, the gateway must flag the changed inputs (recompute check) instead of silently accepting the record.
    check('browser re-runs the cognitive gateway on the recorded mission (same decision, or inputs-changed detected)', await evaluate(`(async () => { const sv = CORE_SF_VIEW; await sv.loadData(); const mc = CORE_PLATFORM.state.cogCurrent; const items = await (await fetch('data/feeds/items.json', { cache: 'no-cache' })).json(), st = await (await fetch('data/feeds/state.json', { cache: 'no-cache' })).json();
      const e = { ctx: CORE_COORD.buildContext({ manifest: sv.state.manifest, data: sv.state.data, verified: sv.state.verified }), feeds: items, feedState: st, knowledge: CORE_PLATFORM.state.K, now: new Date().toISOString() };
      const d = CORE_COGNITIVE.issueCognitiveDecision(mc, e, CORE_PLATFORM.state.registry); const same = st.lastSuccessfulUpdate === mc.recorded.feedUpdate;
      return same ? d.state === mc.decision.state : (d.state === mc.decision.state || d.checks.some(c => c.id === 'recompute' && !c.pass)); })()`));
  }
  await evaluate(`document.querySelector('[data-sec=intel]').click(); 0`); await pause(1200);
  check('city intelligence separates statistics, predictions and announcements and shows confidence limits', await evaluate(`(t => t.includes('Statistique agrégée') && t.includes('confiance') && t.includes('retirée'))(document.querySelector('#ws-body').textContent)`));
  check('scheduler status names the browser-independent workflow', await evaluate(`document.querySelector('#ws-body').textContent.includes('city-feed.yml')`));
  await evaluate(`document.querySelector('[data-sec=data]').click(); 0`); await pause(1200);
  check('data view lists learning proposals with before/after evaluation and human approval', await evaluate(`(t => t.includes('Apprentissage contrôlé') && t.includes('human:founder') && /→ 100 %/.test(t))(document.querySelector('#ws-body').textContent)`));
  await evaluate(`document.querySelector('[data-sec=decisions]').click(); 0`); await pause(500);
  check('decisions view offers a local-only human review record', await evaluate(`!!document.querySelector('[data-human]') && document.querySelector('#ws-body').textContent.includes('uniquement dans ce navigateur')`));
  await shot('phase4');

  // ---- Phase 6: world-first layout, marker density, spatial simulation, visible agent activity, demo 2.0 ----
  await evaluate(`CORE_DEMO.stop(); document.querySelector('[data-sec=world]').click(); 0`); await pause(300);
  check('coverage layer: San Francisco and New York operational (Phase 10), others navigation only', await evaluate(`(s => s.filter(c => c.status === 'operational').map(c => c.name).join() === 'San Francisco,New York' && s.length === 4)(CORE_MAPSTYLE.COVERAGE)`) && await evaluate(`!!__CORE_MAP.getLayer('cov-label')`));
  check('record markers appear by zoom and a density layer aggregates segments below', await evaluate(`['sf-permits', 'city-trees', 'sf-moratoria-point'].every(id => !__CORE_MAP.getLayer(id) || __CORE_MAP.getLayer(id).minzoom >= 14) && !!__CORE_MAP.getLayer('core-density') && __CORE_MAP.getLayer('core-density').maxzoom <= 14.5`));
  check('layers popover holds a legend with visibility zooms', await evaluate(`(t => t.includes('Légende') && t.includes('zoom ≥ 14,5'))(document.querySelector('#map-legend').textContent)`));
  await evaluate(`__CORE_MAP.jumpTo({ center: [-122.4065, 37.7795], zoom: 15, pitch: 50, bearing: -44 }); document.querySelector('[data-sec=sims]').click(); 0`); await pause(3000);
  check('simulation is drawn on the map per block with an exploratory badge', await evaluate(`(async () => (d => d.features.some(f => f.properties.kind === 'block') && d.features.some(f => f.properties.kind === 'label') && !document.querySelector('#sim-badge').hidden)(await __CORE_MAP.getSource('pf-sim').getData()))()`));
  check('record markers are hidden while the simulation is shown', await evaluate(`__CORE_MAP.getLayoutProperty('sf-permits', 'visibility') === 'none'`));
  await evaluate(`(s => { s.value = 'A2'; s.dispatchEvent(new Event('change')); })(document.querySelector('#sm-compare')); 0`); await pause(1500);
  check('scenario comparison maps per-block differences', await evaluate(`(async () => (d => d.features.some(f => f.properties.dstatus === 'up') && d.features.some(f => f.properties.dstatus === 'down'))(await __CORE_MAP.getSource('pf-sim').getData()))()`));
  check('inspector shifts the camera focus (padding)', await evaluate(`__CORE_MAP.getPadding().right > 0`));
  await evaluate(`(s => { s.value = 'none'; s.dispatchEvent(new Event('change')); })(document.querySelector('#sm-compare')); document.querySelector('[data-sec=agents]').click(); 0`); await pause(1500);
  check('leaving the simulation restores record markers', await evaluate(`__CORE_MAP.getLayoutProperty('sf-permits', 'visibility') !== 'none' && document.querySelector('#sim-badge').hidden`));
  await evaluate(`document.querySelector('[data-agfilter=llm]').click(); 0`); await pause(600);
  check('agent filter shows only model-assisted specialists', await evaluate(`[...document.querySelectorAll('#ws-body .org [data-agent]')].filter(b => !b.dataset.agent.endsWith('.lead') && !/manager|gateway/.test(b.dataset.agent)).every(b => /analyst|reviewer/.test(b.dataset.agent))`));
  await evaluate(`document.querySelector('[data-agent="core.san-francisco.public-space.accessibility-analyst"]').click(); 0`); await pause(400);
  check('agent profile shows recorded contributions and authorized sources', await evaluate(`(t => t.includes('Contributions dans les missions enregistrées') && t.includes('énoncé(s) accepté(s)') && t.includes('Sources de données autorisées'))(document.querySelector('#ag-profile').textContent)`));
  await evaluate(`document.querySelector('[data-agfilter=all]').click(); document.querySelector('[data-sec=missions]').click(); 0`); await pause(800);
  await until(`!!document.querySelector('#ms-tab-cog')`, 60); await evaluate(`document.querySelector('#ms-tab-cog').click(); 0`); await pause(400);
  await evaluate(`window.__mgid = document.querySelector('[data-cogrec]').dataset.cogrec; document.querySelector('[data-cogrec]').click(); 0`); await until(`CORE_PLATFORM.state.cogCurrent && CORE_PLATFORM.state.cogCurrent.id === window.__mgid && !!document.querySelector('.mgraph')`, 80); await pause(300);
  check('mission graph is built from recorded events only', await evaluate(`(mc => CORE_MISSION_GRAPH.events(mc).filter(e => e.agent).every(e => e.kind === 'dispute' || mc.log.some(l => l.t === e.t && l.agent === e.agent)) && document.querySelectorAll('.mgraph .mk').length > 5)(CORE_PLATFORM.state.cogCurrent)`));
  await evaluate(`document.querySelector('[data-mg-replay]').click(); 0`); await pause(600);
  check('replay is labelled as a recording and calls no model', await evaluate(`/relecture/.test(document.querySelector('[data-mg-now]').textContent)`));
  await evaluate(`CORE_DEMO.go(0); 0`); await pause(1500); await evaluate(`document.querySelector('#d2-next').click(); 0`); await pause(1500);
  check('demo 2.0 steps forward with a one-sentence takeaway', await evaluate(`(el => el.textContent.includes('2 / 9') && el.querySelector('.d2-take').textContent.length > 40 && el.querySelector('.d2-take').textContent.length < 260)(document.querySelector('#demo2'))`));
  await evaluate(`document.querySelector('#d2-exit').click(); 0`);
  check('dates and scope are labelled (collection vs source dates)', await evaluate(`document.querySelector('#navmeta').textContent.includes('collect') && /UTC/.test(document.querySelector('#navmeta').textContent)`));
  await shot('phase6');
  // ---- Phase 7: civilisation, avatars, replay, problems, scheduler, health, camera ----
  await evaluate(`CORE_PLATFORM.show('sims'); 0`); await pause(300);
  check('sub-views highlight their group and show sub-tabs', await evaluate(`document.querySelector('#appnav [data-sec=missions]').getAttribute('aria-selected') === 'true' && [...document.querySelectorAll('#ws-tabs [data-sub]')].map(b => b.dataset.sub).join() === 'missions,sims,decisions'`));
  await evaluate(`CORE_PLATFORM.show('world'); CORE_CAMERA.view('mission'); 0`); await pause(4500);
  await evaluate(`CORE_AGENTS_WORLD.startReplay().then(() => 0)`); await pause(500);
  check('replay is labelled as a recorded execution, movements as representation', await evaluate(`(t => /RELECTURE/.test(t) && /exécution réelle enregistrée/.test(t) && /pas une inspection physique/.test(t))(document.querySelector('#theatre').textContent)`));
  check('replay drives exactly the recorded participants; every other agent is dimmed', await evaluate(`(rp => { const ids = [...CORE_MOTION.state.agents.values()].filter(a => a.mode === 'replay').map(a => a.agent.id).sort(); return ids.join() === [...rp.plan.agents].sort().join() && [...CORE_MOTION.state.dimOthers].sort().join() === ids.join() && rp.plan.agents.every(id => rp.plan.mc.log.some(l => l.agent === id)); })(CORE_AGENTS_WORLD.state.replay)`));
  check('avatar states come from recorded event kinds; routes are finite', await evaluate(`(rp => rp.plan.steps.every(s => ['tool-call','model-call','report','route'].includes(s.kind) && rp.plan.mc.log.some(l => l.t === s.t && l.agent === s.agent)) && rp.plan.steps.filter(s => s.path).every(s => isFinite(s.path.length) && s.path.coords.length >= 2))(CORE_AGENTS_WORLD.state.replay)`));
  check('structured messages carry sender, recipient, mission, evidence, result and decision', await evaluate(`(rp => rp.plan.messages.length > 0 && rp.plan.messages.every(m => m.from && m.to && m.mission === rp.plan.mc.id && Array.isArray(m.evidence) && m.result !== undefined && m.decision))(CORE_AGENTS_WORLD.state.replay)`));
  await evaluate(`CORE_AGENTS_WORLD.play(false); CORE_AGENTS_WORLD.seek(9000); 0`); await pause(300); await shot('replay');
  check('agents act during the replay (non-idle states at a recorded moment)', await evaluate(`[...CORE_AGENTS_WORLD.state.avatars.values()].some(a => a.visible && a.state !== 'idle')`));
  await evaluate(`__CORE_MAP.jumpTo({ zoom: 11 }); 0`); await pause(300);
  check('level of detail: no articulated avatars at district zoom, zone aggregates instead', await rendered(`document.querySelectorAll('.agent-av').length === 0 && __CORE_MAP.queryRenderedFeatures({ layers: ['pop-zone-area'] }).length > 0`));
  await evaluate(`CORE_AGENTS_WORLD.follow('core.san-francisco.public-space.accessibility-analyst'); 0`); await pause(1200);
  check('agent-follow camera centres on the agent', await evaluate(`CORE_MOTION.state.follow === 'core.san-francisco.public-space.accessibility-analyst' && __CORE_MAP.getZoom() >= 16`));
  await evaluate(`CORE_AGENTS_WORLD.follow('core.san-francisco.public-space.accessibility-analyst'); CORE_AGENTS_WORLD.select('core.san-francisco.public-space.accessibility-analyst'); 0`); await pause(1500);
  check('agent profile card: machine ID, eight tabs (memory added in Phase 9), replay stated as recorded', await evaluate(`(el => !el.hidden && el.dataset.agent === 'core.san-francisco.public-space.accessibility-analyst' && /CORE-PUB-\\d{4}/.test(el.textContent) && el.querySelectorAll('.pc-tabs [data-tab]').length === 8 && /relecture/.test(el.textContent))(document.querySelector('#agent-card'))`));
  await evaluate(`CORE_PLATFORM.show('agents'); 0`); await pause(1200);
  check('civilisation dashboard counts come from data (registered, executable, running, recorded)', await evaluate(`(t => t.includes(CORE_PLATFORM.state.counts.registered + 'profilsenregistrés') && t.includes((CORE_PLATFORM.state.counts.executable + CORE_PLATFORM.state.counts.llm) + 'exécutables') && /0encoursd’exécution/.test(t) && /0résultatsvérifiés/.test(t) && /98problèmesnonrésolus/.test(t))(document.querySelector('#civ-truth').textContent.replace(/\\s+/g, ''))`));
  await evaluate(`CORE_AGENTS_WORLD.stopReplay(); CORE_PLATFORM.show('problems'); 0`); await pause(1500);
  check('problems registry: four knowledge statuses, evidence links, explicit gaps', await evaluate(`(R => R && R.problems.every(p => ['observed','potential-risk','hypothesis','simulated'].includes(p.status)) && R.gaps.length > 0 && document.querySelectorAll('#ws-body .problems .item').length > 0 && /Absence de données ≠ absence de problème/.test(document.querySelector('#ws-body').textContent))(CORE_CIV.state.problems)`));
  // ---- Phase 8: full population, clicks, walking, cards, problems, live honesty, privacy ----
  await evaluate(`CORE_PLATFORM.show('world'); CORE_AGENT_PROFILE.close(); CORE_MOTION.setFilter('all'); __CORE_MAP.jumpTo({ center: [-122.4065, 37.7795], zoom: 14.4, pitch: 50, bearing: -40 }); 0`); await pause(2500);
  check('all registered profiles (82 in Phase 10) are discoverable in the world and in the population bar', await evaluate(`(c => c.total === CORE_PLATFORM.state.counts.registered && c.total === 82 && c.shown === c.total && /Tous \\(82\\)/.test(document.querySelector('#pop-bar').textContent))(CORE_MOTION.counts())`));
  check('agents are spread in two dimensions across 13 virtual zones (not a line) — San Francisco population', await evaluate(`(() => { const P = [...CORE_MOTION.state.agents.values()].filter(a => a.city === 'san-francisco').map(a => a.pos), n = P.length, mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n;
    let a = 0, b = 0, c = 0; for (const p of P) { const x = (p[0] - mx) * Math.cos(37.78 * Math.PI / 180), y = p[1] - my; a += x * x; b += x * y; c += y * y; } const t = (a + c) / 2, d = Math.sqrt(((a - c) / 2) ** 2 + b * b);
    return Math.sqrt((t - d) / (t + d)) > 0.25 && new Set([...CORE_MOTION.state.agents.values()].filter(x => x.city === 'san-francisco').map(x => x.zone.id)).size === 13; })()`));
  check('WebGL figures: clicking a rendered figure opens that agent’s own profile', await evaluate(`(async () => { const m = __CORE_MAP, f = m.queryRenderedFeatures({ layers: ['pop-agent-icon'] })[0]; if (!f) return false; const p = m.project(f.geometry.coordinates), r = m.getCanvas().getBoundingClientRect();
    m.fire('click', { point: p, lngLat: m.unproject(p), originalEvent: new MouseEvent('click', { clientX: r.left + p.x, clientY: r.top + p.y }) }); await new Promise(x => setTimeout(x, 1200)); return document.querySelector('#agent-card').dataset.agent === f.properties.id; })()`));
  await evaluate(`CORE_AGENT_PROFILE.close(); __CORE_MAP.jumpTo({ center: [-122.4040, 37.7805], zoom: 16.4, pitch: 55, bearing: -30 }); 0`); await pause(2500);
  check('every rendered articulated avatar opens its own profile (no dead click)', await evaluate(`(async () => { const ids = [...document.querySelectorAll('.agent-av')].map(b => b.dataset.agent); if (ids.length < 10) return false; for (const id of ids) { const b = document.querySelector('.agent-av[data-agent="' + id + '"]'); if (!b) continue; b.click(); await new Promise(x => setTimeout(x, 350)); if (document.querySelector('#agent-card').dataset.agent !== id) return false; } return true; })()`));
  check('agents move only for a recorded reason: travellers follow the validated network, everyone else stays at their post', await evaluate(`(async () => { if (!CORE_ACTIVITY.state.playing) CORE_ACTIVITY.start(); for (let i = 0; i < 40 && ![...CORE_MOTION.state.agents.values()].some(a => a.path); i++) await new Promise(x => setTimeout(x, 250));
    const all = [...CORE_MOTION.state.agents.values()], movers = all.filter(a => a.path), K = new Map(), keys = a => { if (!K.has(a.net)) K.set(a.net, new Set(a.net.nodes.map(n => n.join()))); return K.get(a.net); }; // Phase 10: each agent's own city network
    const atPost = all.filter(a => a.mode === 'post' && !a.path).every(a => a.pos.join() === a.net.nodes[a.post].join());
    return movers.length > 0 && movers.every(a => a.mode === 'travel' && a.note && a.path.coords.every(c => keys(a).has(c.join()))) && atPost && /ACTIVITÉ ENREGISTRÉE/.test(document.querySelector('#pop-bar').textContent); })()`));
  check('walking cycle animates the limbs of a travelling avatar', await evaluate(`(async () => { const a = [...CORE_MOTION.state.agents.values()].find(x => x.path); if (!a) return false; __CORE_MAP.jumpTo({ center: a.pos, zoom: 16.8 }); await new Promise(x => setTimeout(x, 900)); const el = document.querySelector('.agent-av[data-agent="' + a.agent.id + '"]'); const leg = el && el.querySelector('.leg.l'); return !!leg && el.dataset.state === 'walking' && getComputedStyle(leg).animationName === 'av-swing'; })()`));
  await evaluate(`CORE_AGENT_PROFILE.open('core.san-francisco.public-space.accessibility-analyst', 'org').then(() => 0)`); await pause(800);
  check('profile navigation: collaborator → its own profile; problem → agents → agent', await evaluate(`(async () => { const b = document.querySelector('#agent-card [data-open-agent]'), id = b.dataset.openAgent; b.click(); await new Promise(x => setTimeout(x, 1200)); if (document.querySelector('#agent-card').dataset.agent !== id) return false;
    await CORE_AGENT_PROFILE.open('core.san-francisco.public-space.accessibility-analyst', 'mission'); document.querySelector('#agent-card [data-open-problem]').click(); await new Promise(x => setTimeout(x, 900)); const pc = document.querySelector('#problem-card'); const a = pc.querySelector('[data-open-agent]'); if (!a) return false; const aid = a.dataset.openAgent; a.click(); await new Promise(x => setTimeout(x, 1200)); return document.querySelector('#agent-card').dataset.agent === aid; })()`));
  check('follow mode keeps the agent centred and returns to the previous camera', await evaluate(`(async () => { CORE_AGENT_PROFILE.close(); const z0 = __CORE_MAP.getZoom(), id = 'core.san-francisco.forestry.street-trees'; CORE_MOTION.follow(id); await new Promise(x => setTimeout(x, 3500)); const A = CORE_MOTION.state.agents.get(id), c = __CORE_MAP.getCenter(), d = CORE_POPULATION.dist(A.pos, [c.lng, c.lat]); CORE_MOTION.unfollow(true); await new Promise(x => setTimeout(x, 1600)); return d < 25 && Math.abs(__CORE_MAP.getZoom() - z0) < 0.2; })()`));
  check('problems on the map: rendered, clickable, card lists assigned agents and investigation', await evaluate(`(async () => { await CORE_PROBLEMS_VIEW.show(true); __CORE_MAP.jumpTo({ center: [-122.4065, 37.7795], zoom: 15, pitch: 0, bearing: 0 }); await new Promise(x => setTimeout(x, 1500)); const f = __CORE_MAP.queryRenderedFeatures({ layers: ['problems-pt'] })[0]; if (!f) return false; const p = __CORE_MAP.project(f.geometry.coordinates);
    __CORE_MAP.fire('click', { point: p, lngLat: __CORE_MAP.unproject(p), originalEvent: new MouseEvent('click') }); await new Promise(x => setTimeout(x, 900)); const pc = document.querySelector('#problem-card'); CORE_PROBLEMS_VIEW.show(false); return pc.dataset.problem === f.properties.id && /Investigation/.test(pc.textContent) && /Agents assignés/.test(pc.textContent); })()`));
  check('no agent is reported running without a live source (public mode or no local supervisor)', await evaluate(`(c => (c.byStatus.executing || 0) === 0 && (c.byStatus.queued || 0) === 0 && c.live === 0)(CORE_MOTION.counts())`));
  check('privacy: fonts self-hosted (no Google request), privacy notice linked', await evaluate(`!performance.getEntriesByType('resource').some(r => /fonts\\.(googleapis|gstatic)/.test(r.name)) && !!document.querySelector('a[href="privacy.html"]') && document.fonts.check('12px "IBM Plex Sans"')`));
  // ---- Phase 9: activity layer, occlusion, memory, demo honesty ----
  check('activity feed replays recorded messages only, labelled RELECTURE', await evaluate(`(() => { const S = CORE_ACTIVITY.state, m = S.current; return S.missions.length >= 4 && !!m && S.feed.length > 0 && S.feed.every(f => f.label === 'RELECTURE' && S.missions.some(x => x.messages.some(y => y.purpose === f.purpose))); })()`));
  check('occlusion: an agent behind a tall building is hidden, one in front is not', await evaluate(`(async () => { __CORE_MAP.jumpTo({ center: [-122.3965, 37.7895], zoom: 16.2, pitch: 60, bearing: 0 }); await new Promise(x => setTimeout(x, 4000)); CORE_MOTION.occlusion(); const m = __CORE_MAP, { cam, alt } = CORE_MOTION.camera(), B = CORE_MOTION.state.bld, f = B.list.filter(b => b.h > 100).sort((a, b) => b.h - a.h)[0]; if (!f) return false;
    const c = [(f.bb[0] + f.bb[2]) / 2, (f.bb[1] + f.bb[3]) / 2], d = [c[0] - cam[0], c[1] - cam[1]];
    const behind = [c[0] + d[0] * 0.08, c[1] + d[1] * 0.08], front = [c[0] - d[0] * 0.3, c[1] - d[1] * 0.3], realBehind = CORE_MOTION.occludedAt(cam, alt, behind);
    // The "front" point may sit behind other towers depending on which tiles are loaded, so the property is checked against this tower alone.
    const only = { list: [f], grid: new Map(), CELL: B.CELL }; for (let x = Math.floor(f.bb[0] / B.CELL); x <= Math.floor(f.bb[2] / B.CELL); x++) for (let y = Math.floor(f.bb[1] / B.CELL); y <= Math.floor(f.bb[3] / B.CELL); y++) only.grid.set(x + ',' + y, [0]);
    const saved = CORE_MOTION.state.bld; CORE_MOTION.state.bld = only; try { return realBehind === true && CORE_MOTION.occludedAt(cam, alt, behind) === true && CORE_MOTION.occludedAt(cam, alt, front) === false; } finally { CORE_MOTION.state.bld = saved; } })()`));
  await evaluate(`CORE_AGENT_PROFILE.open('core.san-francisco.mobility.lead', 'memory').then(() => 0)`); await pause(800);
  check('agent memory tab shows identity, knowledge, episodes and institutional memory from the published export', await evaluate(`(t => /Identité \\(version/.test(t) && /Épisodes \\([1-9]/.test(t) && /Mémoire institutionnelle liée \\([1-9]/.test(t) && /approved/.test(t))(document.querySelector('#agent-card').textContent)`));
  await evaluate(`CORE_AGENT_PROFILE.close(); CORE_DEMO.go(8); 0`); await pause(1500);
  check('demo ends on the real human-review state (no invented decision)', await evaluate(`(t => /ÉLIGIBLE À LA REVUE HUMAINE|PREUVES SUPPLÉMENTAIRES|RÉSULTAT NÉGATIF/.test(t) && (/Aucune décision humaine n’a encore été prise/.test(t) || /Décision humaine : /.test(t)))(document.querySelector('#demo2').textContent)`));
  await evaluate(`CORE_DEMO.stop(); 0`);
  check('no third-party code CDN request (MapLibre self-hosted)', await evaluate(`!performance.getEntriesByType('resource').some(r => /unpkg|jsdelivr|googleapis|gstatic/.test(r.name))`));
  check('scheduler: only humans approve, emergency stop rejects new jobs, audit chain verifies', await evaluate(`(() => { const q = CORE_SCHEDULER.create(); const j = q.enqueue({ label: 'x', requiresApproval: true, run: async () => 1 }); const a = q.approve(j.id, 'core.san-francisco.manager'); q.emergencyStop('audit'); const r = q.enqueue({ label: 'y', run: async () => 1 }); return !a && r.ok === false && q.verify().ok && q.snapshot().counts.stopped === 1; })()`));
  // ---------- Phase 10: second city, per-city motion, multi-city replay, cities view ----------
  const NYB = '[-74.0016, 40.7055, -73.9640, 40.7345]';
  await evaluate(`CORE_PLATFORM.show('world'); document.querySelector('[data-go=nyc]').click(); 0`); await pause(10500);
  check('New York: flight, study-area layers and header context', await evaluate(`(m => Math.abs(m.getCenter().lng + 73.986) < 0.02 && !!m.getLayer('city-new-york-hin') && !!m.getLayer('city-new-york-works') && !!m.getLayer('city-new-york-nh-label') && document.querySelector('.mark small').textContent === 'New York')(__CORE_MAP)`));
  check('per-city motion: New York agents posted on the New York network only, San Francisco agents never in New York', await evaluate(`(async () => { await CORE_MOTION.ensure(); const b = ${NYB}, inNY = p => p[0] > b[0] && p[0] < b[2] && p[1] > b[1] && p[1] < b[3], all = [...CORE_MOTION.state.agents.values()], ny = all.filter(a => a.city === 'new-york');
    return ny.length === 12 && ny.every(a => a.net === CORE_MOTION.state.nets['new-york'].net && inNY(a.net.nodes[a.post])) && all.filter(a => a.city === 'san-francisco').every(a => !inNY(a.net.nodes[a.post])); })()`));
  await evaluate(`CORE_ACTIVITY.stop(); CORE_ACTIVITY.state.speed = 1; (async () => { await CORE_ACTIVITY.load(); const m = CORE_ACTIVITY.state.missions.find(x => /new-york:ramps-works:east-village/.test(x.id)); CORE_ACTIVITY.playOnly(m.id); })(); 0`);
  await until(`[...CORE_MOTION.state.agents.values()].some(a => a.path && a.city === 'new-york')`, 60);
  check('New York replay: specialists walk on New York sidewalks to the cited evidence (and no San Francisco agent enters New York)', await evaluate(`(b => { const inNY = p => p[0] > b[0] && p[0] < b[2] && p[1] > b[1] && p[1] < b[3], mv = [...CORE_MOTION.state.agents.values()].filter(a => a.path), ny = mv.filter(a => a.city === 'new-york'); return ny.length > 0 && ny.every(a => a.path.coords.every(inNY)) && mv.filter(a => a.city !== 'new-york').every(a => !a.path.coords.some(inNY)); })(${NYB})`));
  await shot('phase10-nyc-replay'); await evaluate(`CORE_ACTIVITY.stop(); 0`);
  await evaluate(`CORE_PLATFORM.show('cities'); 0`); await pause(2500);
  check('cities view: two operational cities, comparability verdicts, decision options I0–I3, discovery report', await evaluate(`(t => /2\s*villes opérationnelles/.test(t) && /non comparable/.test(t) && ['I0 —', 'I1 —', 'I2 —', 'I3 —'].every(x => t.includes(x)) && /Sensibilité : 18 combinaisons/.test(t) && /Découverte automatique/.test(t) && /Aucune couverture planétaire/.test(t))(document.querySelector('#ws-body').textContent)`));
  await shot('phase10-cities');
  await evaluate(`CORE_PLATFORM.show('world'); (async () => { await CORE_ACTIVITY.load(); const w = CORE_ACTIVITY.state.missions.find(x => x.id.startsWith('world:')); CORE_ACTIVITY.state.follow = false; CORE_ACTIVITY.playOnly(w.id); })(); 0`); await pause(2500);
  check('cross-city replay draws the labelled San Francisco ↔ New York arc', await evaluate(`(async s => { const d = s && await s.getData(); return !!(d && d.features && d.features.length === 1 && /San Francisco ↔ New York/.test(d.features[0].properties.label)); })(__CORE_MAP.getSource('civ-arc'))`) || await evaluate(`__CORE_MAP.querySourceFeatures('civ-arc').length > 0`));
  await evaluate(`CORE_ACTIVITY.stop(); CORE_ACTIVITY.state.follow = true; 0`);
  check('the page never contacts NYC Open Data (published snapshot only); a model endpoint only in local mode', await evaluate(`!performance.getEntriesByType('resource').some(r => /cityofnewyork/.test(r.name) || (!CORE_PLATFORM.state.local && /11434/.test(r.name)))`));
  await evaluate(`CORE_PLATFORM.show('health'); 0`); await pause(4000);
  check('data health: snapshot integrity, cron slots vs observed runs, trigger type, data age (or explicit unavailability)', await evaluate(`(t => t.includes('fichier intact') && ((/créneaux cron prévus/.test(t) && /déclencheur/.test(t) && /âge de la veille/.test(t)) || /Historique indisponible/.test(t)))(document.querySelector('#ws-body').textContent)`));
  await evaluate(`CORE_PLATFORM.show('world'); CORE_CAMERA.view('street'); 0`); await pause(4200);
  check('camera presets stay within readable limits (pitch ≤ 75°)', await evaluate(`__CORE_MAP.getMaxPitch() === 75 && __CORE_MAP.getPitch() <= 75 && __CORE_MAP.getZoom() > 16.5`));
  check('content security policy is declared', await evaluate(`!!document.querySelector('meta[http-equiv="Content-Security-Policy"]')`));
  // Layout guard: visible floating panels never overlap (inspector > Explorer > Activity > Population bar).
  const overlaps = `(() => { const vis = el => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && !el.hidden && r.width > 0 && r.height > 0 ? r : null; };
    const items = ['.console', '.layers', '.pop-bar', '.activity', '#sf-panel', '#ws', '.agent-card', '.cam', '#appnav'].flatMap(s => [...document.querySelectorAll(s)].map(el => [s, vis(el)])).filter(x => x[1]), out = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const a = items[i][1], b = items[j][1]; if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) out.push(items[i][0] + ' x ' + items[j][0]); }
    return out.join(', '); })()`;
  { const o = await evaluate(overlaps); if (o) console.log('overlaps:', o); check('desktop: city panel, Explorer, layers, population and activity do not overlap', o === ''); }
  await evaluate('document.querySelector("#sf-close").click()');
  await viewport(820, 1180, false); await pause(400);
  { const o = await evaluate(overlaps); if (o) console.log('overlaps:', o); check('tablet: floating panels do not overlap', o === ''); }
  await viewport(390, 844, true); await pause(300);
  check('mobile map fits viewport', await evaluate('document.documentElement.scrollWidth <= innerWidth'));
  { const o = await evaluate(overlaps); if (o) console.log('overlaps:', o); check('mobile: floating panels do not overlap', o === ''); }
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
