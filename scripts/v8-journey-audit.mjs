// CORE V8 — Civilization Intelligence journey (Chromium CDP): shell and languages, companion, recorded simulation layer,
// agents on walkways, agent card, street-level movement and vehicle, « I noticed something » → consented share →
// evaluation → Mon CORE, progress, report, manifesto, guided demo; plus XSS, privacy, network and error checks.
//   CORE_BASE=http://127.0.0.1:8017/ node scripts/v8-journey-audit.mjs <cdp-port> <out-prefix> [w h]
import fs from 'node:fs';
import assert from 'node:assert/strict';
const CORE_BASE = process.env.CORE_BASE || 'http://localhost:8000/';
const [port, out = '/tmp/core-v8', W = '1440', H = '900'] = process.argv.slice(2);
const SELF = CORE_BASE.replace(/^https?:\/\/|\/.*$/g, ''), ALLOWED = [SELF, 'tiles.openfreemap.org', 'gibs.earthdata.nasa.gov', 's3.amazonaws.com'];
const XSS = '<img src=x onerror="window.__pwned=1">', phone = +W < 700;
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let n = 0; const pend = new Map(), errors = [], hosts = new Set(), methods = new Set(), results = [], metrics = {};
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { pend.get(m.id)?.(m); pend.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent') { const u = m.params.request.url; if (/^https?:/.test(u)) { hosts.add(new URL(u).host); if (m.params.request.method !== 'GET') methods.add(m.params.request.method + ' ' + u); } } });
const call = (method, params = {}) => new Promise((res, rej) => { const id = ++n; const t = setTimeout(() => rej(Error('timeout ' + method)), 120000); pend.set(id, m => { clearTimeout(t); m.error ? rej(Error(JSON.stringify(m.error))) : res(m.result); }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => { const r = await call('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (x, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(x).catch(() => false)) return true; await wait(250); } return false; };
const check = (name, ok, detail = '') => { assert.ok(ok, `${name} ${detail}`); results.push(name); console.log('PASS', name, detail); };
const shot = async name => { const s = await call('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${out}-${name}.png`, Buffer.from(s.data, 'base64')); };
const go = async (url, ready) => { await ev('window.__stale = true, 1').catch(() => 0); await call('Page.navigate', { url: CORE_BASE + url }); assert.ok(await until(`!window.__stale && ${ready}`, 60000), `load ${url}`); };
const W_READY = '!!globalThis.CORE_EARTH && CORE_EARTH.state.civReady';
const cmd = async text => { await ev(`(async () => { if (!document.querySelector('dialog.cmp[open]')) document.querySelector('[data-companion]').click(); for (let i = 0; i < 40 && !document.querySelector('dialog.cmp input'); i++) await new Promise(r => setTimeout(r, 100)); const i = document.querySelector('dialog.cmp input'); i.value = ${JSON.stringify(text)}; document.querySelector('[data-cmp-form]').requestSubmit(); return 1; })()`); await wait(1500); return ev(`document.querySelector('[data-cmp-out]')?.textContent || ''`); };
try {
  for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) await call(m);
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: phone });
  await go('world.html', '!!globalThis.CORE_EARTH'); await ev('localStorage.clear(), sessionStorage.clear(), 1');
  const t0 = Date.now(); await go('world.html', W_READY); metrics.readyMs = Date.now() - t0;
  // 1. Shell
  check('1. English by default; four destinations Explore / Create / Together / My CORE', await ev(`document.documentElement.lang === 'en' && [...document.querySelectorAll('.le-nav a')].map(a => a.textContent.trim()).join('|') === 'Explore|Create|Together|My CORE'`), `${metrics.readyMs} ms`);
  check('   discreet access: companion, language, Progress, Manifesto, Experience CORE, TRUST', await ev(`!!document.querySelector('[data-companion]') && document.querySelector('[data-lang]').options.length === 10 && ['progress.html', 'manifesto.html', 'demo.html', 'commons.html#trust'].every(h => document.querySelector('.bar a[href="' + h + '"]'))`));
  await ev(`(s => { s.value = 'ar'; s.dispatchEvent(new Event('change')); return 1; })(document.querySelector('[data-lang]'))`); await wait(400);
  check('2. Arabic: right-to-left, translated shell, English fallback elsewhere', await ev(`document.documentElement.dir === 'rtl' && document.documentElement.lang === 'ar' && document.querySelector('.le-nav a').textContent.trim() === 'استكشف'`));
  await shot('01-rtl');
  await ev(`(s => { s.value = 'en'; s.dispatchEvent(new Event('change')); return 1; })(document.querySelector('[data-lang]'))`); await wait(300);
  // 3. Companion
  await ev(`import('/src/civilization/client.mjs').then(m => m.setSpeed(16)), 1`);
  const said = await cmd('play the traffic signal simulation');
  check('3. companion: text command → typed action (recorded simulation B plays)', /Replaying the recorded simulation \(B\)/.test(said) && await until(`CORE_EARTH.state.panelKind?.kind === 'simulation' && CORE_EARTH.state.scn.state.playing`, 8000), said);
  check('   voice is on-device only: no microphone without on-device recognition; nothing listening', await ev(`(m => !!m && m.hidden !== false || !!document.querySelector('[data-cmp-live][hidden]'))(document.querySelector('[data-cmp-mic]'))`));
  const del = await cmd('delete all my data');
  check('   share / delete are never performed by the companion (explicit page action required)', /Nothing has been deleted/.test(del) && await ev(`!!document.querySelector('[data-cmp-out] a[href="commons.html#trust"]')`));
  const xs = await cmd(XSS + ' go to soma'); await wait(4000);
  check('   injected markup in a command is inert', !(await ev('!!window.__pwned')), xs.slice(0, 60));
  await ev(`document.querySelector('dialog.cmp')?.close(), 1`);
  // 4. Simulation layer
  await ev(`CORE_EARTH.showSimulation('A').then(() => 1)`); await wait(2600);
  const lanes = await ev(`CORE_EARTH.state.map.getSource('scn-lanes').serialize().data.features.map(f => f.properties.color)`);
  check('4. scenario A overlays the real Folsom lanes (bus lane in red, never green)', lanes.length > 0 && lanes.every(c => c === '#e5534b'), `${lanes.length} segments`);
  check('   panel: uncalibrated, status, 95 % intervals, model limits, verdict, replay label', await ev(`(t => /modèle non calibré/.test(t) && /Non étayé par le modèle/.test(t) && /intervalle 95/.test(t) && /Ce que ce modèle ne sait pas/.test(t) && /Verdict/.test(t) && /une relecture, pas une simulation en direct/.test(t))(document.getElementById('ea-panel-body').textContent)`));
  const cam = await ev('JSON.stringify(CORE_EARTH.state.map.getCenter())'); await ev(`document.querySelector('[data-scn=B]').click(), 1`); await wait(1200);
  check('   before/after aligned: switching scenario keeps the same camera; B shows actuated signals', cam === await ev('JSON.stringify(CORE_EARTH.state.map.getCenter())') && await ev(`CORE_EARTH.state.map.getSource('scn-signals').serialize().data.features.some(f => f.properties.actuated)`));
  await ev(`document.querySelector('[data-scn-play]').click(), 1`); await wait(4000);
  const f = await ev('CORE_EARTH.state.scn.state.frame'); metrics.replayFramesIn4s = Math.round(f);
  check('   20-second replay of recorded vehicles advances (×12)', f > 15 && f < 35 && await ev(`CORE_EARTH.state.scn.state.vehicles.length > 20`), `frame ${f.toFixed(1)}`);
  await shot('02-simulation');
  await ev(`document.querySelector('[data-scn-off]').click(), 1`); await wait(500);
  check('   reversible: removing the scenario restores the real street', await ev(`CORE_EARTH.state.map.getLayoutProperty('scn-lanes', 'visibility') === 'none' && !CORE_EARTH.state.scn.state.on`));
  // 5. Mission → simulation and report links
  await ev(`CORE_EARTH.showMission('mission.sf.mobility'), 1`); await wait(500);
  check('5. mobility mission links to its simulation and its report', await ev(`!!document.querySelector('#ea-panel-body [data-sim]') && !!document.querySelector('#ea-panel-body a[href="report.html#mission=mission.sf.mobility"]')`));
  // 6. Street level
  if (!phone) {
    await ev(`CORE_EARTH.setLayer('hybrid'), 1`); await ev(`CORE_EARTH.enterHuman().then(() => 1)`);
    assert.ok(await until(`CORE_EARTH.state.mode === 'human' && CORE_EARTH.state.humanReady && !!CORE_EARTH.state.ground`, 60000), 'human mode'); await wait(4000);
    const g = await ev(`(S => { let n = 0, inB = 0; for (const a of S.layer.agents) { const [x, z] = S.toLocal(S.ground.pos(a.id)); if (Math.hypot(x - S.pos[0], z - S.pos[1]) > 250) continue; n++; if (S.scene.blocked(x, z, 0)) inB++; } return { n, inB }; })(CORE_EARTH.state)`);
    check('6. street level: agents stand on mapped walkways, none inside a building', g.n > 0 && g.inB === 0, JSON.stringify(g));
    await ev(`(S => { const nb = S.crowd.nearest(S.pos), [x, z] = S.toLocal(S.ground.pos(nb.id)); S.pos = [x + 1.2, z + 1.2]; })(CORE_EARTH.state), 1`);
    check('   near an agent, talk becomes available', await until(`!document.getElementById('ea-talk').disabled`, 8000));
    await ev(`document.getElementById('ea-talk').click(), 1`); await wait(800);
    check('   card order: who I am → what I work on → what I found → talk → (simulation)', await ev(`(b => { const t = b.textContent, i = [/Je suis CORE-/, /Ce sur quoi je travaille/, /Ce que j’ai trouvé/, /Me parler/].map(r => t.search(r)); return i.every(x => x >= 0) && i.every((x, k) => !k || x > i[k - 1]); })(document.getElementById('ea-panel-body'))`));
    await ev(`dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })), 1`); await wait(200);
    check('   jump (Space) lifts the avatar', await ev(`CORE_EARTH.state.avatar.root.position.y > 0.05`));
    await ev(`dispatchEvent(new KeyboardEvent('keydown', { key: 'v' })), dispatchEvent(new KeyboardEvent('keydown', { key: 'w' })), 1`); await wait(5000);
    const car = await ev(`(S => ({ on: S.car.state.on, sp: S.car.state.speed, inB: S.scene.blocked(S.pos[0], S.pos[1], 0) }))(CORE_EARTH.state)`);
    await ev(`dispatchEvent(new KeyboardEvent('keyup', { key: 'w' })), dispatchEvent(new KeyboardEvent('keydown', { key: 'v' })), 1`); await wait(300);
    check('   prototype vehicle: drives, never inside a footprint, and you can get out', car.on && car.sp <= 9 && !car.inB && await ev('!CORE_EARTH.state.car.state.on && CORE_EARTH.state.avatar.root.visible'), JSON.stringify(car));
    metrics.streetFps = await ev('Math.round(CORE_EARTH.fps)'); await shot('03-street');
    await ev(`CORE_EARTH.goScale('city').then(() => 1)`);
  }
  // 7. Participation
  await ev(`document.getElementById('ea-noticed-btn').click(), 1`); await wait(300);
  await ev(`(() => { document.getElementById('nt-text').value = ${JSON.stringify('Le matin, les bus restent bloqués sur Folsom entre la 5th et la 6th ; peut-être à cause des voitures. ' + XSS)}; document.getElementById('nt-form').requestSubmit(); return 1; })()`); await wait(300);
  check('7. « I noticed something »: CORE structures it (type, mission, related findings) and nothing is shared yet', await ev(`document.getElementById('nt-mission').value === 'mission.sf.mobility' && document.getElementById('nt-kind').value === 'hypothesis'`) && await ev(`Object.values(JSON.parse(localStorage.getItem('core.civ.v72') || '{"missions":{}}').missions || {}).every(m => !(m.humanInputs || []).length)`));
  await ev(`document.getElementById('nt-next').requestSubmit(), 1`);
  assert.ok(await until(`!!document.getElementById('tm-title') && document.getElementById('tm-title').value.length > 10`, 30000), 'dialogue prefilled');
  check('   the team dialogue opens pre-filled; consent box unchecked', await ev(`/bus restent bloqués/.test(document.getElementById('tm-text').value) && !document.getElementById('tm-consent').checked`));
  await ev(`document.getElementById('tm-form').requestSubmit(), 1`); await wait(400);
  check('   without consent nothing is shared', await ev(`Object.values(JSON.parse(localStorage.getItem('core.civ.v72') || '{"missions":{}}').missions || {}).every(m => !(m.humanInputs || []).length)`));
  await ev(`document.getElementById('tm-consent').checked = true, document.getElementById('tm-form').requestSubmit(), 1`);
  check('   with consent it is shared with the mission council', await until(`Object.values(JSON.parse(localStorage.getItem('core.civ.v72') || '{}').missions || {}).some(m => (m.humanInputs || []).length)`, 15000));
  await go('world.html', W_READY); await ev(`import('/src/civilization/client.mjs').then(m => m.setSpeed(16)), 1`);
  check('   agents triage then evaluate it (form only, never accepted)', await until(`Object.values(CORE_EARTH.civ().S.missions).some(m => m.humanInputs.some(h => h.evaluation))`, 90000));
  await wait(2500);
  await go('me.html#contributions', '!!globalThis.CORE_ME');
  check('8. My CORE tracks the contribution through its stages, with the evaluation', await until(`(t => /Mes contributions/.test(t) && /bus restent bloqués/.test(t) && /contrôle automatique de forme/.test(t))(document.getElementById('contributions')?.textContent || '')`, 8000));
  await shot('04-me');
  // 9. Progress, report, manifesto
  await go('progress.html', '!!globalThis.CORE_PROGRESS');
  const pr = await ev('JSON.stringify({ d: CORE_PROGRESS.dims?.map(d => [d.id, d.value]), k: CORE_PROGRESS.K?.K })');
  check('9. progress: separate dimensions; verified impact 0 even with simulations; Kardashev ≈ 0.73 with formula and source', /\["impact",0\]/.test(pr) && /"simulation",4/.test(pr) && /"k":0\.73/.test(pr) && await ev(`(t => /K = \\(log10 P − 6\\) \\/ 10/.test(t) && /U\\.S\\. Energy Information Administration/.test(t))(document.body.textContent)`), pr.slice(0, 160));
  await shot('05-progress');
  await go('report.html#mission=mission.sf.mobility', '!!globalThis.CORE_REPORT');
  check('10. report: 20 sections, a proposal for consideration, uncertainty and limits', await ev(`CORE_REPORT.sections === 20 && document.querySelectorAll('.rp-sec').length === 20 && /Proposition soumise à examen/.test(document.getElementById('s1').textContent) && /Impact réel vérifié : aucun/.test(document.getElementById('s20').textContent)`));
  await go('manifesto.html', '!!globalThis.CORE_MANIFESTO');
  check('11. manifesto: ten principles, ends on the CORE line', await ev(`CORE_MANIFESTO.principles === 10 && /A parallel world to help humanity improve the real one\\./.test(document.querySelector('.mf-sign').textContent)`));
  // 12. Demo
  await go('demo.html', '!!globalThis.CORE_EARTH && !!document.querySelector(".demo")');
  await ev(`document.querySelector('.demo [data-d=start]').click(), 1`); await wait(2500);
  check('12. Experience CORE: 12 acts with pause, next and exit', await ev(`/1 of 12/.test(document.querySelector('.demo').textContent) && ['pause', 'skip', 'exit'].every(d => document.querySelector('.demo [data-d=' + d + ']'))`));
  await ev(`document.querySelector('.demo [data-d=pause]').click(), 1`); await wait(300);
  check('   pause holds the tour', await ev(`CORE_EARTH.state.demo.state.paused && /Resume/.test(document.querySelector('.demo [data-d=pause]').textContent)`));
  for (let i = 0; i < 11; i++) { await ev(`CORE_EARTH.state.demo.skip(), 1`); await wait(i === 8 && !phone ? 6000 : 1800); }
  check('   the tour ends on « A parallel world to help humanity improve the real one. »', await until(`/A parallel world to help humanity improve the real one\\./.test(document.querySelector('.demo')?.textContent || '')`, 15000));
  await shot('06-demo-end');
  await ev(`document.querySelector('.demo [data-d=exit]').click(), 1`);
  check('   exit removes the tour', await ev(`!document.querySelector('.demo')`));
  check('XSS payload never executed', !(await ev('!!window.__pwned')));
  check('network: only GET, only this site and the 3 reviewed map hosts (no local model, no speech service)', methods.size === 0 && [...hosts].every(h => ALLOWED.includes(h)), [...hosts, ...methods].join(','));
  check('no uncaught page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`RESULTS ${results.length} ${JSON.stringify(metrics)}`);
} catch (e) { console.error('FAIL', e.message, '\nerrors:', errors.slice(0, 5).join('\n')); process.exitCode = 1; }
finally { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`).catch(() => 0); }
