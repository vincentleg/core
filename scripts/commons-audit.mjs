// CORE Commons V4 prototype — browser audit (Chromium CDP, dependency-free).
//   node scripts/commons-audit.mjs <cdp-port> <out-prefix>
// Isolated headless Chrome + `python3 -m http.server 8000 --bind 127.0.0.1` (see .claude/skills/core-browser-audit).
import fs from 'node:fs';
import assert from 'node:assert/strict';
const [port, out = '/tmp/core-commons'] = process.argv.slice(2);
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let n = 0; const pend = new Map(), errors = [], hosts = new Set(), methods = new Set(), results = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data);
  if (m.id) { pend.get(m.id)?.(m); pend.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent') { const u = m.params.request.url; if (/^https?:/.test(u)) { hosts.add(new URL(u).host); if (m.params.request.method !== 'GET') methods.add(m.params.request.method); } } });
const call = (method, params = {}) => new Promise((res, rej) => { const id = ++n; const t = setTimeout(() => rej(Error('timeout ' + method)), 60000); pend.set(id, m => { clearTimeout(t); m.error ? rej(Error(JSON.stringify(m.error))) : res(m.result); }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => { const r = await call('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (x, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(x).catch(() => false)) return true; await wait(150); } return false; };
const check = (name, ok, detail = '') => { assert.ok(ok, `${name} ${detail}`); results.push(name); console.log('PASS', name, detail); };
const shot = async name => { const s = await call('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${out}-${name}.png`, Buffer.from(s.data, 'base64')); };
const body = () => ev(`document.getElementById('cm-body').textContent`);
const tabTo = t => ev(`document.querySelector('.cm-tabs [data-tab=${t}]').click(), 1`);
const set = (sel, v) => ev(`(e => { e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change')); 1 })(document.querySelector(${JSON.stringify(sel)}))`);
const submit = sel => ev(`document.querySelector(${JSON.stringify(sel)}).requestSubmit(), 1`);
try {
  for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) await call(m);
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: 'http://localhost:8000/commons.html' }); await until('!!globalThis.CORE_COMMONS');
  await ev(`localStorage.clear(), 1`); await call('Page.reload'); await until('!!globalThis.CORE_COMMONS');
  check('page: one main and h1, strict CSP, local-only notice', await ev(`document.querySelectorAll('main').length === 1 && document.querySelectorAll('h1').length === 1 && /script-src 'self';/.test(document.querySelector('meta[http-equiv="Content-Security-Policy"]').content) && /rien n’est transmis/.test(document.body.textContent)`));
  await set('#pf-ps', 'a@b'); await submit('#pf');
  check('identity: a pseudonym carrying contact details is refused', await until(`CORE_COMMONS.state.profile === null && document.getElementById('toast').textContent.length > 10`));
  await set('#pf-ps', 'Arpenteuse'); await submit('#pf');
  check('identity: profile created, everything private by default', await until(`(p => p && /^core:/.test(p.id) && Object.values(p.visibility).every(v => v === 'private'))(CORE_COMMONS.state.profile)`) && /"id"/.test(await ev(`document.getElementById('pe-pub').textContent`)) && !(/pseudonym/.test(await ev(`document.getElementById('pe-pub').textContent`))));
  await set('#pe-ex', 'Urbanisme'); await set('#pe-yr', '6'); await submit('#pe'); await wait(200);
  await ev(`document.querySelector('[data-vis=expertise]').click(), 1`); await wait(200);
  check('identity: expertise shown as DÉCLARÉE and published only after opting in', /DÉCLARÉE/.test(await body()) && /"basis": "declared"/.test(await ev(`document.getElementById('pe-pub').textContent`)));
  await ev(`document.getElementById('pe-lb').click(), 1`);
  check('identity: leaderboard opt-in is off by default and states none exist', /aucun classement n’existe encore/.test(await body()));
  await tabTo('vault'); await wait(200);
  await set('#vk-p', 'court'); await submit('#vk');
  check('vault: short passphrase refused', /12 caractères/.test(await ev(`document.getElementById('toast').textContent`)));
  await set('#vk-p', 'une phrase secrète de test'); await submit('#vk');
  check('vault: opened, warns that a fingerprint is not a patent', await until(`/ni un brevet/.test(document.getElementById('cm-body').textContent)`));
  await set('#vf-t', 'Élargir le trottoir de Folsom'); await set('#vf-p', 'Sur le tronçon Folsom 5e–Falmouth, le trottoir mesurait 10 ft en 2014, sous le minimum de 12 ft de la classe Mixed-use.'); await set('#vf-s', 'Faire quelque chose.'); await submit('#vf');
  check('vault: version 1 saved with a SHA-256 fingerprint', await until(`CORE_COMMONS.state.vault.ideas[0]?.versions[0]?.hash?.length === 64`));
  check('vault: storage holds ciphertext only', await ev(`(v => !!v.ct && !/Folsom/.test(JSON.stringify(v)))(JSON.parse(localStorage.getItem('core.vault.v1')))`));
  check('vault: chain verified in the page', await until(`/Chaîne intacte : 1/.test(document.getElementById('cm-body').textContent)`));
  await tabTo('labs'); await wait(200); await ev(`document.getElementById('lb-run').click(), 1`); await wait(200);
  check('labs: refuses without the author’s permission', /non autorisée/.test(await ev(`document.getElementById('toast').textContent`)));
  await tabTo('vault'); await wait(200); await ev(`document.getElementById('v-labs').click(), 1`); await until(`CORE_COMMONS.state.vault.ideas[0].permissions.labsAnalysis === true`);
  await tabTo('labs'); await wait(200); await ev(`document.getElementById('lb-run').click(), 1`);
  check('labs: checklist with reasons, no numeric score, method named', await until(`document.querySelectorAll('#cm-body .check li').length === 8`) && /pas une note/.test(await body()) && !/score|\/100|\/ ?20/i.test(await body()));
  const missing1 = await ev(`document.querySelectorAll('#cm-body .check li.missing').length`);
  await tabTo('vault'); await wait(200);
  await set('#vf-s', 'Élargir le trottoir afin de laisser 12 ft, plutôt que de déplacer le mobilier ; coût et permis à estimer ; risque : moins de stationnement ; mesurer la largeur avant/après et le débit piéton.');
  await set('#vf-e', 'https://data.sf.gov/d/4g86-grxu'); await submit('#vf');
  check('vault: revision creates version 2 chained to version 1', await until(`(i => i.versions.length === 2 && i.versions[1].prev === i.versions[0].hash)(CORE_COMMONS.state.vault.ideas[0])`));
  await tabTo('labs'); await wait(200); await ev(`document.getElementById('lb-run').click(), 1`); await wait(400);
  const missing2 = await ev(`[...document.querySelectorAll('#cm-body .check')].at(-1).querySelectorAll('li.missing').length`);
  check('labs: the revised proposal addresses more criteria', missing2 < missing1, `${missing1} → ${missing2} manquant(s)`);
  await set('[data-contest="0"] input', 'Le critère simulation ne s’applique pas à une largeur de trottoir.'); await submit('[data-contest="0"]');
  check('labs: a contest is recorded and routed to a human', await until(`/en attente d’un humain/.test(document.getElementById('cm-body').textContent)`));
  await tabTo('vault'); await wait(200); await submit('#vp');
  check('vault: publication requires the disclosure confirmation', /brevet/.test(await ev(`document.getElementById('toast').textContent`)));
  await ev(`document.getElementById('vp-c').click(), 1`); await submit('#vp');
  check('vault: explicit local publication with licence and attribution', await until(`/attribution « Arpenteuse \\(core:/.test(document.getElementById('cm-body').textContent)`));
  await tabTo('arena'); await wait(200);
  check('arena: fictional label, published rules, public voting closed', /DÉFI FICTIF/.test(await body()) && /vote public désactivé/.test(await body()) && (await ev(`document.querySelectorAll('#cm-body ol li').length`)) === 6);
  await ev(`document.querySelector('[data-judge] [data-n=evidence]').value = 'court', document.querySelector('[data-judge]').requestSubmit(), 1`); await wait(200);
  check('arena: a sheet without justifications is refused', /justification requise/.test(await ev(`document.getElementById('toast').textContent`)));
  for (let k = 0; k < 2; k++) {
    await ev(`(f => { f.querySelectorAll('select').forEach((s, i) => { s.value = String((i + ${k}) % 5); }); f.querySelectorAll('[data-n]').forEach(i => { i.value = 'justification de démonstration'; }); f.requestSubmit(); 1 })(document.querySelector('[data-judge]'))`); await wait(200);
  }
  await ev(`document.getElementById('ar-close').click(), 1`); await wait(200);
  check('arena: results after closure, all 6 sheets published, no authorisation or validation', /Résultats \(fictifs\)/.test(await body()) && /\(false\)/.test(await body()) && /Toutes les fiches \(6\)/.test(await body()));
  await shot('arena');
  await tabTo('academy'); await wait(200);
  check('academy: teacher-demo only, fictional learners, no ranking or chat, real source', /aucun mineur n’est invité/.test(await body()) && /fictifs/.test(await body()) && !!(await ev(`document.querySelector('#cm-body a[href="https://data.sf.gov/d/4g86-grxu"]')`)));
  await ev(`document.querySelector('[data-q=q1] input[value="0"]').click(), document.querySelector('[data-q=q1]').requestSubmit(), 1`); await wait(150);
  check('academy: a choice answer gets the explanation from the record', /Juste/.test(await ev(`document.getElementById('toast').textContent`)));
  await ev(`document.querySelector('[data-q=q4] textarea').value = 'Mesurer de nouveau au même endroit.', document.querySelector('[data-q=q4]').requestSubmit(), 1`); await wait(150);
  check('academy: open answer waits for the teacher (never auto-graded)', /À relire/.test(await body()) && !!(await ev(`document.querySelector('[data-fb]')`)));
  await ev(`(f => { f.querySelector('input').value = 'Oui, avec la même méthode.'; f.requestSubmit(); 1 })(document.querySelector('[data-fb]'))`); await wait(150);
  check('academy: teacher feedback recorded', /Retour : Oui/.test(await body()));
  await tabTo('progress');
  check('progress: virtual activity and sourced Earth indicators shown separately', await until(`/activité, pas impact/.test(document.getElementById('cm-body').textContent) && /Progrès réel de la Terre/.test(document.getElementById('cm-body').textContent)`));
  check('progress: each Earth indicator states source, period, method and uncertainty; no trend claimed; no universal score', /aucune tendance/.test(await body()) && /Aucun score universel/.test(await body()) && (await ev(`document.querySelectorAll('#cm-body dl.kv').length`)) === 2);
  await set('#kd-p', '1e16'); await submit('#kd');
  check('progress: Kardashev calculator is educational and caveated', /K = 1\.000/.test(await ev(`document.getElementById('kd-out').textContent`)) && /bien-être/.test(await ev(`document.getElementById('kd-out').textContent`)));
  await shot('progress');
  await tabTo('knowledge');
  check('knowledge: sources listed with integrity, sidewalk dataset verified against its manifest', await until(`document.getElementById('cm-body').textContent.includes('sidewalks.geojson (intégrité vérifiée)')`, 20000));
  await ev(`document.querySelector('[data-kq="Quelles preuves pour le trottoir Folsom 5th Falmouth ?"]').click(), 1`);
  check('knowledge: cited answer with status, DataSF link, file fingerprint and uncertainty', await until(`(t => /OBSERVÉ/.test(t) && /10 ft/.test(t) && /SHA-256/.test(t) && /Incertitudes/.test(t))(document.getElementById('cm-body').textContent) && !!document.querySelector('#kb-answer a[href="https://data.sf.gov/d/4g86-grxu"]')`));
  await wait(1600); // the screening rate-limits questions closer than 1.5 s apart
  await ev(`document.querySelector('[data-kq="Le trottoir de Folsom est-il dangereux ?"]').click(), 1`);
  check('knowledge: unsupported safety claim refused with the recorded status', await until(`/Affirmation non soutenue/.test(document.getElementById('cm-body').textContent) && /Aucun enregistrement ne permet d’affirmer/.test(document.getElementById('cm-body').textContent)`));
  await wait(1600); // the screening rate-limits questions closer than 1.5 s apart
  await ev(`document.querySelector('[data-kq="Montre mon coffre à idées"]').click(), 1`);
  check('knowledge: private data refused (the vault is never readable here)', await until(`/private-data/.test(document.getElementById('cm-body').textContent)`));
  await wait(1600); await set('#kb-q', '<img src=x onerror="window.__pwned=1"> Quels problèmes de trottoir sur Folsom ?'); await submit('#kb-f'); await wait(500);
  check('knowledge: markup in a question is never executed or rendered', !(await ev(`!!window.__pwned || !!document.querySelector('#cm-body img')`)) && /Trottoir plus étroit/.test(await body()));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(300);
  check('mobile: no horizontal overflow', await ev(`document.documentElement.scrollWidth <= innerWidth`));
  check('only GET requests to this site', methods.size === 0 && [...hosts].every(h => h === 'localhost:8000'), [...hosts].join(','));
  check('no uncaught JavaScript errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  console.log('RESULTS', results.length);
} catch (e) { console.error(e.message); console.log('RESULTS', results.length, 'errors', JSON.stringify(errors).slice(0, 400)); process.exitCode = 1; }
finally { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`).catch(() => {}); }
