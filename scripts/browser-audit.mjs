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
  check('snapshot SHA-256 verified in browser', await evaluate(`Object.values(CORE_SF_VIEW.state.verified).length === CORE_SF_VIEW.state.manifest.datasets.length && Object.values(CORE_SF_VIEW.state.verified).every(v => v === 'ok')`));
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

  // ---- Phase 2C agent workspace ----
  const COORD = createRequire(import.meta.url)('../src/coord.js');
  const snap = (() => { const m = JSON.parse(fs.readFileSync('data/sf/manifest.json', 'utf8')), data = {}, verified = {};
    for (const d of m.datasets) { const t = fs.readFileSync(`data/sf/${d.file}`, 'utf8'), k = d.file.replace('.geojson', ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'x'; }
    return COORD.run(COORD.buildContext({ manifest: m, data, verified })); })();
  await evaluate(`document.querySelector('#tab-agents').click(); (s => { s.value = '450'; s.dispatchEvent(new Event('change')); })(document.querySelector('#cw-speed')); document.querySelector('#cw-run').click(); 0`);
  await pause(2500);
  check('agents run live with labelled real execution', await evaluate(`CORE_COORD_VIEW.state.mode === 'running' && document.querySelector('#cw-status').textContent.includes('EXÉCUTION RÉELLE') && document.querySelectorAll('#cw-log li').length > 0`));
  check('map follows the segment being inspected', await evaluate(`__CORE_MAP.getSource('coord-scan')._data.features.length > 0 || __CORE_MAP.querySourceFeatures('coord-scan').length > 0`));
  await evaluate(`document.querySelector('#cw-pause').click(); 0`); await pause(600);
  const n1 = await evaluate('CORE_COORD_VIEW.state.events.length'); await pause(1500);
  check('pause stops execution', n1 === await evaluate('CORE_COORD_VIEW.state.events.length') && await evaluate(`document.querySelector('#cw-status').textContent.includes('EN PAUSE')`));
  await evaluate(`(s => { s.value = '0'; s.dispatchEvent(new Event('change')); })(document.querySelector('#cw-speed')); document.querySelector('#cw-pause').click(); 0`);
  await until(`CORE_COORD_VIEW.state.mode === 'done'`, 240);
  check('browser run matches independent Node run (events and fingerprint)', await evaluate(`CORE_COORD_VIEW.state.events.length`) === snap.events.length && await evaluate(`CORE_COORD_VIEW.state.result.fingerprint`) === snap.result.fingerprint);
  check('all six agent roles executed', await evaluate(`['discovery','evidence','scenario','evaluation','adversarial','gateway'].every(a => CORE_COORD_VIEW.state.events.some(e => e.agent === a))`));
  check('findings highlighted on the map', await evaluate(`__CORE_MAP.queryRenderedFeatures({ layers: ['coord-findings-line'] }).length > 0`));
  const top = snap.result.findings.find(f => f.type === 'opportunity');
  await evaluate(`document.querySelector('[data-f="${top.id}"]').click(); 0`); await pause(2600);
  check('selecting a finding moves the camera to its street segment', await evaluate(`(() => { const g = CORE_COORD_VIEW.state.ctx.segments.get('${top.seg}').geometry.coordinates, c = __CORE_MAP.getCenter(), m = g[Math.floor(g.length / 2)]; return Math.hypot(c.lng - m[0], c.lat - m[1]) < 0.004 && __CORE_MAP.getZoom() > 15.5; })()`));
  check('finding permits highlighted by organisation', await evaluate(`__CORE_MAP.queryRenderedFeatures({ layers: ['coord-points-circle'] }).length >= 2`));
  check('five scenarios evaluated and compared', await evaluate(`document.querySelectorAll('#cw-detail [data-s]').length === 5 && !!document.querySelector('#cw-detail table.metrics') && !!document.querySelector('#cw-detail svg.gantt')`));
  await evaluate(`document.querySelector('#cw-detail [data-s="S1"]').click(); 0`); await pause(500);
  check('selecting a scenario updates metrics and map', await evaluate(`document.querySelector('#cw-detail table.metrics thead').textContent.includes('S1') && __CORE_MAP.getSource('coord-points')._data.features.some(f => f.properties.moved) === CORE_COORD_VIEW.state.result.analyses['${top.id}'].result.scenarios.find(s => s.id === 'S1').windows.some(w => w.shift !== 0)`));
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
  check('energy, nature and building layers render real records', await evaluate(`['city-energy', 'city-trees'].every(l => __CORE_MAP.queryRenderedFeatures({ layers: [l] }).length > 0) && (__CORE_MAP.queryRenderedFeatures({ layers: ['city-bp', 'city-bp-cluster'] }).length > 0)`));
  await evaluate(`(i => { i.checked = false; i.dispatchEvent(new Event('change')); })(document.querySelector('[data-theme=nature]')); 0`); await pause(300);
  check('theme toggle hides its layers', await evaluate(`__CORE_MAP.getLayoutProperty('city-trees', 'visibility') === 'none'`));
  await evaluate(`(i => { i.checked = true; i.dispatchEvent(new Event('change')); })(document.querySelector('[data-theme=nature]')); 0`);
  const bpAll = await evaluate(`CORE_CITY_VIEW.state.period = 'all'; CORE_CITY_VIEW.syncThemes(); __CORE_MAP.getSource('city-bp-src')._data.features.length`);
  const bpRecent = await evaluate(`(s => { s.value = 'recent'; s.dispatchEvent(new Event('change')); })(document.querySelector('#th-period')); __CORE_MAP.getSource('city-bp-src')._data.features.length`);
  check('time filter changes displayed building permits', bpRecent < bpAll && bpRecent > 0);
  await evaluate(`document.querySelector('#tab-city').click(); (s => { s.value = '0'; s.dispatchEvent(new Event('change')); })(document.querySelector('#ci-speed')); document.querySelector('#ci-run').click(); 0`);
  await until(`CORE_CITY_VIEW.state.mode === 'done'`, 400);
  check('investigation in browser equals independent Node run', await evaluate(`CORE_CITY_VIEW.state.result.fingerprint`) === cityNode.result.fingerprint && await evaluate(`CORE_CITY_VIEW.state.events.length`) === cityNode.events.length);
  check('eight roles executed with real events', await evaluate(`['discovery','evidence','crossdomain','scenario','evaluation','adversarial','synthesis','gateway'].every(a => CORE_CITY_VIEW.state.events.some(e => e.agent === a))`));
  await pause(2200);
  check('map shows the discovered block, works, trees and relations', await evaluate(`__CORE_MAP.queryRenderedFeatures({ layers: ['ci-block-line'] }).length > 0 && new Set(__CORE_MAP.queryRenderedFeatures({ layers: ['ci-points-circle'] }).map(f => f.properties.role)).size >= 3`));
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
  await evaluate(`CORE_CITY_VIEW.guide(8); 0`); await pause(2000);
  check('guided demo drives real investigation steps', await evaluate(`!document.querySelector('#guide').hidden && document.querySelector('#guide-title').textContent.includes('9/9') && document.querySelector('#guide-text').textContent.includes('CORE n’exécute rien')`));
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); 0`);
  check('Escape closes the guide', await evaluate(`document.querySelector('#guide').hidden`));
  await evaluate(`document.querySelector('#console-toggle').click(); 0`);
  check('console can be collapsed to free the map', await evaluate(`document.body.classList.contains('console-min') && getComputedStyle(document.querySelector('#console-body')).display === 'none'`));
  await evaluate(`document.querySelector('#console-toggle').click(); 0`);

  // ---- Phase 3: professional platform, City Intelligence, agents, missions, camera ----
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); 0`); await until('!!(window.CORE_PLATFORM && CORE_PLATFORM.state.ready)', 120);
  check('navigation exposes the platform sections (incl. guided demo)', await evaluate(`[...document.querySelectorAll('#appnav [data-sec]')].map(b => b.dataset.sec).join() === 'world,demo,intel,agents,missions,sims,decisions,data'`));
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
  check('mission target highlighted on the map', await evaluate(`__CORE_MAP.queryRenderedFeatures({ layers: ['pf-target-line'] }).length > 0`));
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
