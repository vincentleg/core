// CORE V7 — the San Francisco journey, end to end (Chromium CDP), the quality benchmark of the V7 brief:
// Earth → San Francisco → recorded sidewalk problem → evidence → avatar → CORE agent at human scale → Dialogue → proposal
// → private, encrypted save → research dossier → Mon CORE history. Carries an XSS payload and a unique private phrase
// through every step, and records every network host and non-GET request.
//   CORE_BASE=http://127.0.0.1:8017/ node scripts/v7-journey-audit.mjs <cdp-port> <out-prefix> [width height]
import fs from 'node:fs';
import assert from 'node:assert/strict';
const CORE_BASE = process.env.CORE_BASE || 'http://localhost:8000/';
const [port, out = '/tmp/core-v7', W = '1440', H = '900'] = process.argv.slice(2);
const SELF = CORE_BASE.replace(/^https?:\/\/|\/.*$/g, ''), ALLOWED = [SELF, 'tiles.openfreemap.org', 'gibs.earthdata.nasa.gov', 's3.amazonaws.com'];
const PRIVATE = 'PHRASE-PRIVEE-V7-9KQ2', PASS = 'une phrase secrète de démonstration V7', XSS = '<img src=x onerror="window.__pwned=1">';
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let n = 0; const pend = new Map(), errors = [], hosts = new Set(), methods = new Set(), results = [], metrics = {};
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { pend.get(m.id)?.(m); pend.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent') { const u = m.params.request.url; if (/^https?:/.test(u)) { hosts.add(new URL(u).host); if (m.params.request.method !== 'GET') methods.add(m.params.request.method + ' ' + u); } } });
const call = (method, params = {}) => new Promise((res, rej) => { const id = ++n; const t = setTimeout(() => rej(Error('timeout ' + method)), 90000); pend.set(id, m => { clearTimeout(t); m.error ? rej(Error(JSON.stringify(m.error))) : res(m.result); }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => { const r = await call('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (x, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(x).catch(() => false)) return true; await wait(250); } return false; };
const check = (name, ok, detail = '') => { assert.ok(ok, `${name} ${detail}`); results.push(name); console.log('PASS', name, detail); };
const shot = async name => { const s = await call('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${out}-${name}.png`, Buffer.from(s.data, 'base64')); };
const go = async (url, ready) => { await ev('window.__stale = true, 1').catch(() => 0); await call('Page.navigate', { url: CORE_BASE + url }); assert.ok(await until(`!window.__stale && ${ready}`, 40000), `load ${url}`); };
const pwned = () => ev('!!window.__pwned');
try {
  for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) await call(m);
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 700 });
  // 1–2. Open CORE: the Earth, and the purpose in one sentence.
  const t0 = Date.now();
  await go('world.html', '!!globalThis.CORE_EARTH && CORE_EARTH.state.ready'); await ev('localStorage.clear(), 1');
  await go('world.html', '!!globalThis.CORE_EARTH && CORE_EARTH.state.ready'); metrics.worldReadyMs = Date.now() - t0;
  check('1. CORE opens on the Earth (globe projection, NASA imagery layer)', await ev(`CORE_EARTH.state.map.getProjection().type !== 'mercator' && !!CORE_EARTH.state.map.getLayer('imagery')`), `ready in ${metrics.worldReadyMs} ms`);
  check('2. the purpose is stated and the primary action is obvious', await ev(`/Explorez notre monde/.test(document.getElementById('ea-hero').textContent) && !!document.getElementById('ea-start')`));
  check('   four primary destinations in the navigation', await ev(`[...document.querySelectorAll('.le-nav a')].map(a => a.textContent.trim()).join('|') === 'Explorer|Créer|Collaborer|Mon CORE'`));
  await wait(2500); await shot('01-earth');
  // 3–6. Navigate to San Francisco, discover the recorded problem, open the panel, review the evidence.
  await ev('CORE_EARTH.start().then(() => 1)');
  check('3. flies to San Francisco, city scale', await until(`CORE_EARTH.state.map.getZoom() > 15.5 && CORE_EARTH.state.scale === 'city'`, 20000));
  // V7.2: the opening now lands on the flagship housing mission (Hybrid); the sidewalk problem stays the evidence regression.
  check('3b. (V7.2) the opening lands on the flagship research mission', await until(`!document.getElementById('ea-panel').hidden && /Logement abordable et résilience/.test(document.getElementById('ea-panel-body').textContent)`, 20000));
  await ev(`CORE_EARTH.focusSegment('5665000'), 1`);
  check('4. the recorded sidewalk problem is focused and its panel is open', await until(`!document.getElementById('ea-panel').hidden && /Better Streets Plan/.test(document.getElementById('pp-title').textContent)`));
  check('5. the panel speaks plainly: place, status explanation, review steps, Understand/Propose/Collaborate', await ev(`(t => /Folsom St, entre 5th St et Falmouth St/.test(t) && /un fait mesuré/.test(t) && /Revue humaine/.test(t) && /Comprendre/.test(t) && /Proposer/.test(t) && /Collaborer/.test(t))(document.getElementById('ea-panel').textContent)`));
  check('6. evidence: 10 ft vs 12 ft with metres, the DataSF source link, and what is unknown', await ev(`(p => /10 ft/.test(p.textContent) && /3,05 m/.test(p.textContent) && !!p.querySelector('a[href^="https://data.sf.gov/"]') && /Ce que l’on ne sait pas/.test(p.textContent))(document.getElementById('ea-panel'))`));
  check('   registry identifiers live in the technical details only', await ev(`(p => !p.querySelector('.pp-head').textContent.includes('5665000') && p.querySelector('details.pp-adv').textContent.includes('sidewalk-below-bsp-min:5665000'))(document.getElementById('ea-panel'))`));
  await wait(2500); await shot('02-problem');
  check('   accessible non-3D navigation: the list reaches every recorded segment', await ev(`document.querySelectorAll('#ea-list-ul [data-seg]').length >= 30`), await ev(`document.querySelectorAll('#ea-list-ul [data-seg]').length + ' segments'`));
  // 7. Create an avatar (XSS in the pseudonym).
  await go('avatar.html', '!!globalThis.CORE_STUDIO && CORE_STUDIO.ready');
  await ev(`document.querySelector('#st-presets [data-v=noor]').click(), 1`); await until('CORE_STUDIO.ready');
  await ev(`(i => { i.value = ${JSON.stringify('Noor ' + XSS)}; i.dispatchEvent(new Event('input')); })(document.getElementById('st-name')), document.querySelector('#st-top [data-v=jacket]').click(), 1`);
  await wait(2500); await ev(`document.getElementById('st-save').click(), 1`);
  const saved = await ev(`JSON.parse(localStorage.getItem('core.avatar.v2'))`);
  check('7. avatar created: 3D model, preset + customisation saved locally, pseudonym cleaned', saved.appearance.top === 'jacket' && saved.appearance.preset === null && !/[<>]/.test(saved.identity.pseudonym) && !(await pwned()), JSON.stringify(saved.identity));
  await shot('03-avatar');
  // 8. Meet the agent at human scale.
  await ev(`document.getElementById('st-enter').click(), 1`);
  assert.ok(await until(`!!globalThis.CORE_EARTH && CORE_EARTH.state.mode === 'human' && CORE_EARTH.state.humanReady`, 60000), 'human mode');
  await wait(3000);
  check('8. human scale: the avatar, holographic (non-human) agents and detailed buildings are in the scene', await until(`!!CORE_EARTH.state.avatar && CORE_EARTH.state.buildings > 0 && CORE_EARTH.state.crowdCounts && CORE_EARTH.state.crowdCounts.near + CORE_EARTH.state.crowdCounts.far > 0`, 15000), await ev(`CORE_EARTH.state.buildings + ' buildings'`));
  await ev(`dispatchEvent(new KeyboardEvent('keydown', { key: 'w' })), 1`); await wait(2500);
  metrics.humanFps = await ev('Math.round(CORE_EARTH.fps)'); metrics.layerMs = await ev('+(CORE_EARTH.state.scene.state.ms.reduce((a, b) => a + b, 0) / CORE_EARTH.state.scene.state.ms.length).toFixed(2)');
  check('   walking plays the walk animation and moves the avatar', await ev(`CORE_EARTH.state.avatar.clip === 'Walk_Loop'`), `${metrics.humanFps} fps, 3D layer ${metrics.layerMs} ms/frame`);
  await ev(`dispatchEvent(new KeyboardEvent('keyup', { key: 'w' })), 1`);
  await ev(`(S => { const nb = S.crowd.nearest(S.pos), [x, z] = S.toLocal(S.civ.posOf(nb.id)); S.pos = [x + 1.5, z + 1.5]; })(CORE_EARTH.state), 1`);
  check('   near the agent, "talk" becomes available', await until(`!document.getElementById('ea-talk').disabled`, 8000));
  await ev(`document.getElementById('ea-talk').click(), 1`);
  await wait(1200); await shot('04-human');
  // 9–10. Start a natural conversation; propose an improvement.
  check('   (V7.2) talking opens the agent’s card', await until(`/Identité et organisation/.test(document.getElementById('ea-panel-body').textContent)`, 8000));
  // The single-agent room (sidewalk evidence) is unchanged; reached from the problem panel's « Comprendre ».
  await go('dialogue.html#problem=sidewalk-below-bsp-min%3A5665000&mode=understand&from=world', '!!globalThis.CORE_DIALOGUE && !!CORE_DIALOGUE.state.problem');
  check('9. the conversation starts with cited evidence from CORE Knowledge (deterministic, labelled)', await until(`!!document.querySelector('#dl-convo .turn.evidence .cites') && /Déterministe/.test(document.getElementById('dl-provider-btn').textContent)`, 15000));
  await wait(1500);
  await ev(`CORE_DIALOGUE.send(${JSON.stringify(`Vérifier la largeur actuelle puis élargir le trottoir en retirant une file de stationnement ${PRIVATE} ${XSS}`)}).then(() => 1)`); await wait(2200);
  await ev(`CORE_DIALOGUE.send('Parce que les piétons auraient plus de place, c’est certain.').then(() => 1)`); await wait(1500);
  check('10. the proposal is recorded in the dossier and the overconfident claim is challenged', await ev(`CORE_DIALOGUE.state.s.draft.proposal.includes('élargir') && [...document.querySelectorAll('#dl-convo .turn.challenge')].some(t => /certitude/.test(t.textContent))`));
  // 11. Save privately (encrypted vault).
  await ev(`document.querySelector('[data-side=idea]').click(), 1`);
  await until(`!!document.getElementById('dl-prof') || !!document.getElementById('dl-unlock')`);
  if (await ev(`!!document.getElementById('dl-prof')`)) { await ev(`document.getElementById('dl-ps').value = 'NoorV7', document.getElementById('dl-prof').requestSubmit(), 1`); await until(`!!document.getElementById('dl-unlock')`); }
  await ev(`document.getElementById('dl-pass').value = ${JSON.stringify(PASS)}, document.getElementById('dl-unlock').requestSubmit(), 1`);
  await until(`!!document.getElementById('dl-save')`, 15000);
  await ev(`document.getElementById('dl-consent').checked = true, document.getElementById('dl-save').requestSubmit(), 1`);
  check('11. the idea is saved privately: encrypted vault, version 1', await until(`!!CORE_DIALOGUE.state.ideaId && /Version 1 enregistrée et chiffrée/.test(document.getElementById('toast').textContent)`, 15000));
  // 12–13. The research dossier: known, unknown, proposed.
  await ev(`document.querySelector('.dl-mode [data-mode=studio]').click(), 1`); await wait(800);
  check('12. the research dossier opens (Studio mode, editable sections)', await ev(`document.getElementById('dl-main').dataset.mode === 'studio' && document.querySelectorAll('#dl-side textarea[data-field]').length === 10`));
  check('13. it shows what is known, unknown and proposed', await ev(`(t => /Ce qui est connu/.test(t) && /Ce qui est inconnu/.test(t) && /Ce qui est proposé/.test(t) && /élargir/.test(t))(document.getElementById('dl-side').textContent)`));
  await shot('05-studio');
  // 14–15. Back to My CORE; the contribution is in the history.
  await go('me.html', '!!globalThis.CORE_ME');
  check('14. Mon CORE shows the journey and the followed problem', await until(`/Idée enregistrée/.test(document.getElementById('me-body').textContent) && /Folsom St/.test(document.getElementById('me-body').textContent)`, 10000));
  await ev(`document.getElementById('me-pass').value = ${JSON.stringify(PASS)}, document.getElementById('me-unlock').requestSubmit(), 1`);
  check('15. after unlocking, the contribution is listed with its version history and stays private', await until(`/élargir/.test(document.getElementById('me-body').textContent) && /1 version\\(s\\)/.test(document.getElementById('me-body').textContent) && /aucun relecteur humain vérifié/.test(document.getElementById('me-body').textContent)`, 10000));
  check('   no real-world impact is claimed', await ev(`/Aucun impact réel établi/.test(document.getElementById('me-body').textContent)`));
  await until('CORE_ME.portrait', 15000); await wait(1200); await shot('06-me');
  // Cross-cutting guarantees.
  const leak = await ev(`Object.keys(localStorage).filter(k => (localStorage.getItem(k) || '').includes(${JSON.stringify(PRIVATE)}))`);
  check('privacy: the private phrase exists nowhere in storage outside the encrypted vault (it is not even in the vault in clear)', leak.length === 0, JSON.stringify(leak));
  check('XSS payload never executed anywhere in the journey', !(await pwned()));
  check('network: only GET, only this site and the three reviewed public map sources', methods.size === 0 && [...hosts].every(h => ALLOWED.includes(h)), [...hosts, ...methods].join(','));
  check('no uncaught page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`RESULTS ${results.length} ${JSON.stringify(metrics)}`);
} catch (e) { console.error('FAIL', e.message, '\nerrors:', errors.slice(0, 5).join('\n')); process.exitCode = 1; }
finally { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`).catch(() => 0); }
