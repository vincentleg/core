// CORE V6 — end-to-end demo journey audit (Chromium CDP). World → agent → Dialogue (cited evidence, challenges) → encrypted
// vault → Labs dossier → revision in Dialogue → version diff → fictional expert review → fictional community → fictional
// Arena → back to World with the journey status. Carries an XSS payload and a unique private phrase through every step.
//   node scripts/world-audit.mjs-style usage: node scripts/v6-journey-audit.mjs <cdp-port> <out-prefix>
import fs from 'node:fs';
import assert from 'node:assert/strict';
const CORE_BASE = process.env.CORE_BASE || 'http://localhost:8000/'; // override to audit another local server
const [port, out = '/tmp/core-v6'] = process.argv.slice(2), BASE = CORE_BASE;
const PRIVATE = 'PHRASE-PRIVEE-7Q3X', PASS = 'une phrase secrète de démonstration', XSS = '<img src=x onerror="window.__pwned=1">';
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let n = 0; const pend = new Map(), errors = [], hosts = new Set(), methods = new Set(), results = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { pend.get(m.id)?.(m); pend.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent') { const u = m.params.request.url; if (/^https?:/.test(u)) { hosts.add(new URL(u).host); if (m.params.request.method !== 'GET') methods.add(m.params.request.method + ' ' + u); } } });
const call = (method, params = {}) => new Promise((res, rej) => { const id = ++n; const t = setTimeout(() => rej(Error('timeout ' + method)), 60000); pend.set(id, m => { clearTimeout(t); m.error ? rej(Error(JSON.stringify(m.error))) : res(m.result); }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => { const r = await call('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (x, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(x).catch(() => false)) return true; await wait(200); } return false; };
const check = (name, ok, detail = '') => { assert.ok(ok, `${name} ${detail}`); results.push(name); console.log('PASS', name, detail); };
const shot = async name => { const s = await call('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${out}-${name}.png`, Buffer.from(s.data, 'base64')); };
const go = async (url, ready) => { await ev('window.__stale = true, 1').catch(() => 0); await call('Page.navigate', { url: BASE + url }); assert.ok(await until(`!window.__stale && ${ready}`, 30000), `load ${url}`); };
const pwned = () => ev('!!window.__pwned');
const say = async text => { await ev(`CORE_DIALOGUE.send(${JSON.stringify(text)}).then(() => 1)`); await wait(1600); };
try {
  for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) await call(m);
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  // 1. World
  await go('world-classic.html', '!!globalThis.CORE_WORLD && !!CORE_WORLD.state.map'); await ev('localStorage.clear(), 1');
  await go('world-classic.html', '!!globalThis.CORE_WORLD && !!CORE_WORLD.state.map');
  await ev(`document.getElementById('enter').click(), 1`); await wait(200); await ev(`document.getElementById('confirm').click(), 1`);
  check('1. enter CORE World with an avatar in San Francisco', await until(`CORE_WORLD.state.mode === 'avatar'`, 20000));
  await ev(`document.getElementById('goto').click(), 1`); await until(`!document.getElementById('talk').disabled`, 6000);
  await ev(`CORE_WORLD.openPanel('agent'), 1`);
  const href = await ev(`document.querySelector('#panel-body a[href^="dialogue.html#problem="]').getAttribute('href')`);
  check('2. discover the documented sidewalk problem and its agent; a route to the Dialogue room exists', /sidewalk-below-bsp-min/.test(decodeURIComponent(href)));
  // 2. Dialogue
  await go(href, '!!globalThis.CORE_DIALOGUE && CORE_DIALOGUE.state.s');
  await say('Que sait-on de ce trottoir ?');
  check('3. the agent answers with cited, verified evidence (CORE Knowledge)', await ev(`(t => !!t && t.citations.some(c => c.record === 'sidewalks:8562' && c.integrity === 'verified'))(CORE_DIALOGUE.state.s.turns.find(t => t.kind === 'evidence'))`) && await ev(`!!document.querySelector('#dl-convo .turn.evidence .cites')`));
  await say(`${XSS} Élargir le trottoir, c’est évident ${PRIVATE}`);
  check('4. a weak, overconfident proposal is challenged (not praised), and markup is inert', await ev(`CORE_DIALOGUE.state.s.turns.at(-1).kind === 'challenge' && /certitude/.test(CORE_DIALOGUE.state.s.turns.at(-1).text)`) && !(await pwned()) && !(await ev(`!!document.querySelector('#dl-convo img')`)));
  for (const t of ['afin de laisser passer deux fauteuils roulants', 'la chaussée peut céder 2 ft', 'coût de 50000 dollars; permis de la ville', 'ne rien faire; déplacer le mobilier', 'moins de stationnement']) await say(t);
  await ev(`(document.getElementById('dl-ps').value = 'Demo', document.getElementById('dl-prof').requestSubmit(), 1)`); await wait(300);
  await ev(`(document.getElementById('dl-pass').value = ${JSON.stringify(PASS)}, document.getElementById('dl-unlock').requestSubmit(), 1)`); await wait(1500);
  await ev(`(document.getElementById('dl-consent').click(), document.getElementById('dl-save').requestSubmit(), 1)`);
  check('5. the idea is saved privately: encrypted vault, chained version', await until(`!!CORE_DIALOGUE.state.ideaId && /Version 1 enregistrée et chiffrée/.test(document.getElementById('toast').textContent)`, 8000));
  const idea = await ev('CORE_DIALOGUE.state.ideaId');
  // 3. Labs
  await go(`commons.html#vault?idea=${idea}`, '!!globalThis.CORE_COMMONS');
  await ev(`(document.getElementById('vk-p').value = ${JSON.stringify(PASS)}, document.getElementById('vk').requestSubmit(), 1)`); await until(`!!document.getElementById('v-labs')`, 8000);
  await ev(`document.getElementById('v-labs').click(), 1`); await wait(800);
  await ev(`location.hash = 'labs?idea=${idea}', 1`); await wait(600); await ev(`document.getElementById('lb-run').click(), 1`);
  check('6. Labs produces a structured dossier with a testable hypothesis, a calculation on recorded values, and missing evidence', await until(`(d => d && /Hypothèse testable/.test(d.textContent) && /2 ft \\(0.61 m\\)/.test(d.textContent) && /Preuves manquantes \\([1-9]/.test(d.textContent) && !/validé\\b/i.test(d.querySelector('.badge').textContent))(document.getElementById('lb-dossier'))`, 10000));
  await shot('labs');
  // 4. Revision in Dialogue
  await go(`dialogue.html#idea=${idea}&problem=sidewalk-below-bsp-min:5665000`, '!!globalThis.CORE_DIALOGUE && CORE_DIALOGUE.state.s');
  await ev(`(document.getElementById('dl-pass').value = ${JSON.stringify(PASS)}, document.getElementById('dl-unlock').requestSubmit(), 1)`); await until(`CORE_DIALOGUE.state.pending === null`, 8000);
  await say('mesurer la largeur actuelle et compter les piétons avant et après pendant 3 mois');
  await ev(`(document.getElementById('dl-consent').click(), document.getElementById('dl-save').requestSubmit(), 1)`);
  check('7. the proposal is revised in Dialogue and saved as version 2 of the same idea', await until(`/Version 2 enregistrée/.test(document.getElementById('toast').textContent)`, 8000));
  // 5. Diff + expert request
  await go(`commons.html#vault?idea=${idea}`, '!!globalThis.CORE_COMMONS');
  await ev(`(document.getElementById('vk-p').value = ${JSON.stringify(PASS)}, document.getElementById('vk').requestSubmit(), 1)`); await until(`!!document.getElementById('v-diff')`, 8000);
  check('8. the two versions can be compared (what was added is visible)', await ev(`/compter les piétons/.test([...document.querySelectorAll('#v-diff ins')].map(x => x.textContent).join(' '))`));
  await ev(`location.hash = 'experts?idea=${idea}', 1`); await until(`!!document.getElementById('xp-req')`, 8000);
  await ev(`(document.getElementById('xp-ok').click(), document.getElementById('xp-req').requestSubmit(), 1)`); await until(`!!document.querySelector('[data-ask]')`, 8000);
  await ev(`document.querySelector('[data-ask]').click(), 1`);
  check('9. a review request is prepared for a FICTIONAL expert; the reply is labelled fictional and asks for missing evidence', await until(`(t => /AVIS FICTIF/.test(t) && /ni validation/.test(t) && /mesure actuelle/i.test(t))(document.getElementById('cm-body').textContent)`, 8000));
  // 6. Community + Arena
  await ev(`location.hash = 'communities?c=cm-folsom', 1`); await wait(500);
  check('10. a fictional community discusses the same documented issue, citing the real record', await ev(`(t => /FICTIF/.test(t) && /sidewalks:8562/.test(t) && /adultes uniquement/.test(t))(document.getElementById('cm-body').textContent)`));
  await ev(`location.hash = 'arena', 1`); await until(`!!document.getElementById('db-f')`, 8000);
  await ev(`(document.getElementById('db-kind').value = 'rebuttal', document.getElementById('db-target').value = 'a2', document.getElementById('db-text').value = ${JSON.stringify(XSS + ' Mesurons d’abord la largeur actuelle.')}, document.getElementById('db-ev').value = 'sidewalks:8562', document.getElementById('db-f').requestSubmit(), 1)`); await wait(500);
  check('11. a clearly fictional Arena compares approaches with sourced arguments; no winner, no vote; markup inert', await ev(`(t => /DÉBAT FICTIF/.test(t) && /Aucune proposition n’est déclarée gagnante/.test(t))(document.getElementById('debate').textContent)`) && !(await pwned()) && !(await ev(`!!document.querySelector('#debate img')`)));
  // 7. Back to World
  await go('world.html#problem=sidewalk-below-bsp-min:5665000', '!!globalThis.CORE_WORLD && !!CORE_WORLD.state.map');
  await ev(`document.getElementById('no-avatar').click(), 1`); await until(`!document.getElementById('world-panel').hidden`, 20000);
  check('12. back in World, the problem panel shows the updated journey and that nothing is validated', await until(`(t => /Votre parcours sur ce problème/.test(t) && /2 version\\(s\\)/.test(t) && /aucune validation/.test(t))(document.getElementById('panel-body').textContent)`, 8000));
  await shot('world-return');
  check('13. journey: all 8 steps recorded', await ev(`Object.keys(JSON.parse(localStorage.getItem('core.journey.v1')).steps).length === 8`));
  // Privacy and safety across the whole journey
  check('14. the private phrase exists only inside the encrypted vault', await ev(`(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), v = localStorage.getItem(k); if (k !== 'core.vault.v1' && v.includes(${JSON.stringify(PRIVATE)})) return false; } return !localStorage.getItem('core.vault.v1').includes(${JSON.stringify(PRIVATE)}); })()`));
  check('15. no injected script ran on any page', !(await pwned()));
  check('16. only GET requests, to this site and the map tile service', methods.size === 0 && [...hosts].every(h => [CORE_BASE.replace(/^https?:\/\/|\/.*$/g, ''), 'tiles.openfreemap.org'].includes(h)), [...hosts, ...methods].join(','));
  check('17. no uncaught JavaScript errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  console.log('RESULTS', results.length);
} catch (e) { console.error(e.message); console.log('RESULTS', results.length, 'errors', JSON.stringify(errors).slice(0, 400)); process.exitCode = 1; }
finally { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`).catch(() => {}); }
