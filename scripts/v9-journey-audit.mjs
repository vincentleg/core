// CORE V9 — product-completion journey (Chromium CDP), acceptance tests A–J of the V9 brief:
//   A first impression · B language switching + French-leak scan of every supported page · C autonomous tour ·
//   D manual tour · E agent investigation (real local model if Ollama runs, otherwise the explicit unavailable state) ·
//   F recorded SUMO traffic with 3D vehicles · G contribution (structure, edit, private, consented share) ·
//   H companion · I layout (run once per viewport) · J walkthrough coherence; plus page errors and network hosts.
//   CORE_BASE=http://127.0.0.1:8017/ node scripts/v9-journey-audit.mjs <cdp-port> <out-prefix> [w h] [--skip-tour]
// Results are written to <out-prefix>-results.json; screenshots to <out-prefix>-*.png. Never use port 9222.
import fs from 'node:fs';
const CORE_BASE = process.env.CORE_BASE || 'http://localhost:8000/';
const args = process.argv.slice(2), flags = new Set(args.filter(a => a.startsWith('--'))), pos = args.filter(a => !a.startsWith('--'));
const [port, out = '/tmp/core-v9', W = '1440', H = '900'] = pos; const phone = +W < 700;
if (String(port) === '9222') throw Error('port 9222 is reserved: use a dedicated CDP port');
const SELF = CORE_BASE.replace(/^https?:\/\/|\/.*$/g, ''), ALLOWED = [SELF, 'tiles.openfreemap.org', 'gibs.earthdata.nasa.gov', 's3.amazonaws.com', '127.0.0.1:11434'];
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let n = 0; const pend = new Map(), errors = [], hosts = new Set(), results = [], fails = [], leaks = {}, metrics = {};
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { pend.get(m.id)?.(m); pend.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 300));
  if (m.method === 'Network.requestWillBeSent') { const u = m.params.request.url; if (/^https?:/.test(u)) hosts.add(new URL(u).host); } });
const call = (method, params = {}) => new Promise((res, rej) => { const id = ++n; const t = setTimeout(() => rej(Error('timeout ' + method)), 120000); pend.set(id, m => { clearTimeout(t); m.error ? rej(Error(JSON.stringify(m.error))) : res(m.result); }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => { const r = await call('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (x, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(x).catch(() => false)) return true; await wait(250); } return false; };
const check = (name, ok, detail = '') => { (ok ? results : fails).push(detail ? `${name} — ${detail}` : name); console.log(ok ? 'PASS' : 'FAIL', name, detail); };
const shot = async name => { const s = await call('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${out}-${name}.png`, Buffer.from(s.data, 'base64')); };
const go = async (url, ready, ms = 60000) => { await call('Page.navigate', { url: 'about:blank' }); await wait(300); await ev('window.__stale = true, 1').catch(() => 0); await call('Page.navigate', { url: CORE_BASE + url }); return until(`!window.__stale && (${ready})`, ms); };
const setLang = async code => { await ev(`(s => { s.value = ${JSON.stringify(code)}; s.dispatchEvent(new Event('change')); return 1; })(document.querySelector('[data-lang]'))`); await wait(700); };
const E_READY = '!!globalThis.CORE_EARTH && CORE_EARTH.state.civReady';
// French-leak detector: visible text of the page (language selector, code, ids and author names excluded) must contain
// no French function words or typographic French. Returns the offending snippets.
const LEAK = `(() => { const root = document.body.cloneNode(true);
  root.querySelectorAll('[data-lang], select[data-lang], code, .hash, script, style, [lang="fr"], [hidden], template, noscript').forEach(x => x.remove());
  const t = (root.innerText || root.textContent || '').replace(/\\s+/g, ' ');
  const re = /\\b(les|des|une|du|pour|avec|aucune?|vous|votre|vos|nous|n’est|c’est|qu’|d’un|d’une|l’|leurs?|sont|être|données|problème|pas encore|ville de|trottoir|revue humaine|à la|au lieu)\\b|[«»]|\\b\\w*(é|è|ê|à|ù|ç)\\w*\\b/gi;
  const ok = /^(Tomás|Français|é|Lévy)$/i; const hits = [];
  for (const m of t.matchAll(re)) { if (ok.test(m[0])) continue; hits.push(t.slice(Math.max(0, m.index - 40), m.index + 40)); if (hits.length >= 6) break; }
  return { hits, sample: t.slice(0, 160), bad: /\\[object Object\\]|undefined|NaN|\\bnav\\.[a-z]|\\bact\\.[a-z]|\\bcmp\\.[a-z]/.test(t) ? (t.match(/.{0,40}(\\[object Object\\]|undefined|NaN|\\bnav\\.[a-z]+|\\bact\\.[a-z]+|\\bcmp\\.[a-z]+).{0,40}/) || [''])[0] : '' }; })()`;
const scan = async (label) => { const r = await ev(LEAK); leaks[label] = r; check(`B. no French leakage in English · ${label}`, !r.hits.length && !r.bad, r.bad || r.hits[0] || ''); };
const layout = async (label, sel) => { const r = await ev(`(() => { const d = document.documentElement, overflow = d.scrollWidth - innerWidth;
    const vis = ${JSON.stringify(sel)}.map(s => { const e = document.querySelector(s); if (!e) return [s, 'missing']; const b = e.getBoundingClientRect(); if (!b.width || !b.height) return [s, 'hidden'];
      const inView = b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1; const top = document.elementFromPoint(Math.min(innerWidth - 1, b.left + b.width / 2), Math.min(innerHeight - 1, b.top + Math.min(b.height / 2, 12)));
      return [s, inView ? (top && (e === top || e.contains(top) || top.contains(e)) ? 'ok' : 'covered by ' + (top?.id || top?.className || top?.tagName)) : 'outside viewport']; });
    return { overflow, vis }; })()`); const bad = r.vis.filter(v => v[1] !== 'ok');
  check(`I. layout ${W}×${H} · ${label}: primary actions visible and unobstructed, no horizontal scroll`, r.overflow <= 1 && !bad.length, bad.map(b => b.join(': ')).join('; ') || `overflow ${r.overflow}px`); };
try {
  for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) await call(m);
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: phone });
  await go('world.html', '!!globalThis.CORE_EARTH'); await ev('localStorage.clear(), sessionStorage.clear(), 1');
  const t0 = Date.now(); await go('world.html', E_READY); metrics.readyMs = Date.now() - t0;

  if (!flags.has('--tour-only')) {
  // ---------- A. First impression ----------
  const hero = await ev(`(() => { const h = document.getElementById('ea-hero'); return { lang: document.documentElement.lang, sel: document.querySelector('[data-lang]')?.value, text: h?.innerText || '', cta: (b => b && { t: b.textContent.trim(), w: b.getBoundingClientRect().width, primary: b.classList.contains('primary') })(document.getElementById('ea-demo-cta')) }; })()`);
  check('A. fresh session: English selected', hero.lang === 'en' && hero.sel === 'en', `${hero.lang}/${hero.sel}`);
  check('A. hero states the purpose and mission (CORE — Creation Of Reborn Earth; Kardashev aspiration labelled)', /Build the World as It Should Be\./.test(hero.text) && /A Parallel Earth\. A Collective Intelligence\./.test(hero.text) && /Long-term aspiration/.test(hero.text));
  check('A. Launch CORE Demo is the prominent primary action', hero.cta?.t === 'Launch Demo' && hero.cta.primary && hero.cta.w > 120, JSON.stringify(hero.cta));
    await scan('world · hero'); await layout('hero', ['#ea-demo-cta', '#ea-start']); await shot('A-hero');
  await ev(`document.getElementById('ea-start').click(), 1`); await wait(2500);
  await ev(`document.getElementById('ea-layer-help')?.click(), 1`); await wait(500);
  const intro = await ev(`(document.getElementById('ea-layer-intro')?.innerText || '') + ' | ' + [...document.querySelectorAll('#ea-layers button, #ea-layers [role=radio]')].map(b => b.textContent + ' ' + (b.getAttribute('aria-label') || '') + ' ' + (b.title || '')).join(' ')`);
  check('A. real versus parallel world explained (Real Earth / CORE World / Hybrid View)', /Real Earth/.test(intro) && /CORE World/.test(intro) && /Hybrid/.test(intro), intro.slice(0, 100).replace(/\n/g, ' '));
  await ev(`document.getElementById('ea-layer-help')?.click(), 1`);
  await layout('map tools', ['#ea-problems-btn', '#ea-noticed-btn', '#ea-layers']);

  // ---------- English scans of World panels ----------
  await ev(`CORE_EARTH.showProblems(), 1`); await wait(900); await scan('world · problems & missions');
  await ev(`CORE_EARTH.openMission('mission.sf.mobility'), 1`); await wait(1500); await scan('world · mobility mission workspace'); await shot('E-mission');
  await ev(`CORE_EARTH.showTeam('mission.sf.mobility'), 1`); await wait(900); await scan('world · mission team');
  const agentId = await ev(`[...CORE_EARTH.civ().agents].find(a => a.team === 'team.mobility' && a.level === 'agent')?.id || null`).catch(() => null);
  if (agentId) { await ev(`CORE_EARTH.showAgent(${JSON.stringify(agentId)}), 1`); await wait(900); await scan('world · agent card'); }
  await ev(`CORE_EARTH.openMission('mission.sf.housing-resilience'), 1`); await wait(1200); await scan('world · housing mission workspace');
  await ev(`CORE_EARTH.showHierarchy?.(), 1`).catch(() => 0); await wait(700); await scan('world · organisation');
  await ev(`CORE_EARTH.showActivity?.(), 1`).catch(() => 0); await wait(700); await scan('world · activity');

  // ---------- F. Traffic simulation ----------
  await ev(`CORE_EARTH.showSimulation('A').then(() => 1)`); await wait(3000);
  await ev(`document.querySelector('[data-scn-play]')?.click(), 1`); await wait(3500);
  const simA = await ev(`({ on: CORE_EARTH.state.scn?.state.on, sc: CORE_EARTH.state.scn?.state.scenario, veh: CORE_EARTH.state.scn?.state.vehicles.length || 0, frame: CORE_EARTH.state.scn?.state.frame || 0, text: document.getElementById('ea-panel').innerText })`);
  await wait(2500); const frame2 = await ev(`CORE_EARTH.state.scn?.state.frame || 0`);
  const t3d = await ev(`(() => { const t = CORE_EARTH.state.traffic3d || CORE_EARTH.state.scn?.traffic3d; return t ? (t.count?.() ?? t.state?.count ?? -1) : -1; })()`).catch(() => -1);
  check('F. recorded SUMO scenario A plays: vehicles present and moving', simA.on && simA.sc === 'A' && simA.veh > 20 && frame2 > simA.frame, `${simA.veh} vehicles, frame ${simA.frame.toFixed?.(1)} → ${frame2.toFixed?.(1)}, 3D ${t3d}`);
  check('F. labelled recorded, synthetic demand, uncalibrated; never a validated recommendation', /Recorded SUMO simulation: synthetic demand, uncalibrated model/i.test(simA.text) && !/validated recommendation(?!\s*[.)]?\s*$)/i.test(simA.text.replace(/not a validated recommendation/gi, '')), simA.text.slice(0, 80).replace(/\n/g, ' '));
  await scan('world · simulation A'); await shot('F-sim-A');
  await ev(`document.querySelector('[data-scn=B]')?.click(), 1`); await wait(1800);
  const simB = await ev(`({ sc: CORE_EARTH.state.scn?.state.scenario, text: document.getElementById('ea-panel').innerText })`);
  check('F. switching to B shows B’s data and metrics (different from A)', simB.sc === 'B' && simB.text !== simA.text && /Adaptive \(actuated\) signals/.test(simB.text) && /Car delay -?\d/.test(simB.text), simB.sc);
  await layout('simulation panel', ['#ea-panel']); await shot('F-sim-B');
  await ev(`document.querySelector('[data-scn-off]')?.click(), 1`).catch(() => 0); await wait(600);

  // ---------- E. Agent investigation ----------
  await ev(`CORE_EARTH.showInvestigate('mission.sf.mobility'), 1`); await wait(800); await scan('world · investigation form');
  await ev(`document.querySelector('#inv-form [type=submit]').click(), 1`);
  const tInv = Date.now(); const finished = await until(`(t => /Local AI reasoning is unavailable|Done in|Investigation failed/i.test(t) && !document.querySelector('#inv-form [type=submit]').disabled)(document.getElementById('inv-state')?.textContent || '')`, 300000);
  const inv = await ev(`({ state: document.getElementById('inv-state')?.textContent || '', steps: [...document.querySelectorAll('#inv-steps .inv-step')].map(li => ({ role: li.querySelector('b')?.textContent, prov: li.querySelector('.le-badge')?.textContent, status: li.dataset.status, body: (li.querySelector('.inv-b')?.innerText || '').slice(0, 80) })), answer: document.getElementById('inv-out')?.innerText.slice(0, 400) || '', last: CORE_EARTH.state.lastInvestigation ? { runtime: CORE_EARTH.state.lastInvestigation.runtime, model: CORE_EARTH.state.lastInvestigation.model, n: CORE_EARTH.state.lastInvestigation.steps?.length } : null })`);
  metrics.investigationMs = Date.now() - tInv; metrics.investigation = inv.last;
  const unavailable = /Local AI reasoning is unavailable/.test(inv.state);
  if (unavailable && await ev(`!!document.querySelector('[data-inv-rec]')`)) { // public site: replay the recorded real run
    await ev(`document.querySelector('[data-inv-rec]').click(), 1`); await until(`/Recorded run, replayed/.test(document.getElementById('inv-state')?.textContent || '')`, 15000);
    const rec = await ev(`({ state: document.getElementById('inv-state').textContent, steps: [...document.querySelectorAll('#inv-steps .inv-step')].map(li => ({ role: li.querySelector('b')?.textContent, prov: li.querySelector('.le-badge')?.textContent, status: li.dataset.status, body: (li.querySelector('.inv-b')?.innerText || '').slice(0, 80) })), answer: document.getElementById('inv-out')?.innerText.slice(0, 300) || '' })`);
    check('E. public site: recorded real run replayed, labelled “replay, not live inference”, with local-model and deterministic steps', /not live inference/.test(rec.state) && rec.steps.length >= 6 && rec.steps.some(x => /local model/.test(x.prov)) && rec.steps.some(x => /deterministic/.test(x.prov)) && /unreviewed/i.test(rec.answer), rec.state.slice(0, 120));
    inv.steps = rec.steps; inv.answer = rec.answer;
  }
  check('E. investigation ran to completion with a stated runtime', finished && !!inv.last, `${inv.last?.runtime} ${inv.last?.model || ''} in ${Math.round(metrics.investigationMs / 1000)} s`);
  check('E. every step shows its role, provenance (local model / deterministic) and status', inv.steps.length >= 6 && inv.steps.every(s => s.role && s.prov && s.status), inv.steps.map(s => `${s.role}:${s.prov}:${s.status}`).join(' | '));
  check('E. evidence step cites finding ids; simulation step reads recorded results', inv.steps.some(s => /\b[a-z]\.[a-z-]+/.test(s.body)) && inv.steps.some(s => /±/.test(s.body)), inv.steps.map(s => s.body.slice(0, 30)).join(' | '));
  check(unavailable ? 'E. local model unavailable: UI says so explicitly' : 'E. local model answer labelled unreviewed draft from the local model', unavailable ? /Recorded research and deterministic tools remain accessible/.test(inv.state) : /unreviewed/i.test(inv.answer) || /No validated answer/.test(inv.answer), inv.answer.slice(0, 100).replace(/\n/g, ' '));
  await scan('world · investigation result'); await shot('E-investigation');

  // ---------- G. Contribution ----------
  await ev(`CORE_EARTH.showContribute('mission.sf.mobility'), 1`); await wait(800);
  await ev(`(t => { t.value = 'In the morning, buses get stuck on Folsom between 5th and 6th; maybe because of cars turning right.'; document.querySelector('#nt-form [type=submit]').click(); return 1; })(document.getElementById('nt-text'))`); await wait(900);
  const st = await ev(`({ state: document.getElementById('nt-state').textContent, title: document.getElementById('nt-title')?.value, kind: document.getElementById('nt-kind')?.value })`);
  check('G. observation structured (labelled: deterministic rules, not AI) and editable', !!st.title && /deterministic rules/.test(st.state), `${st.kind} · ${st.title}`);
  await ev(`document.getElementById('nt-title').value = 'Buses stuck on Folsom (edited)', 1`);
  await ev(`document.getElementById('nt-private').click(), 1`); await wait(700);
  const priv = await ev(`(() => { const a = JSON.parse(localStorage.getItem('core.contrib.v1') || '[]'); const x = (Array.isArray(a) ? a : a.items || []).find(e => /edited/.test(e.title)); return x ? { state: x.state, title: x.title } : null; })()`);
  check('G. kept private: persisted locally with the edited title', priv?.state === 'private', JSON.stringify(priv));
  await ev(`document.getElementById('nt-share-ask').click(), 1`); await wait(400);
  const conf = await ev(`({ shown: !document.getElementById('nt-confirm').hidden, text: document.getElementById('nt-confirm').innerText })`);
  await ev(`document.getElementById('nt-share').click(), 1`); await wait(600);
  const before = await ev(`(() => { const a = JSON.parse(localStorage.getItem('core.contrib.v1') || '[]'); return (Array.isArray(a) ? a : a.items || []).filter(e => e.state !== 'private').length; })()`);
  check('G. sharing needs explicit confirmation (nothing shared without the consent box)', conf.shown && before === 0, `shared before consent: ${before}`);
  check('G. the local/shared capability is described honestly (no server, nobody else sees it)', /nobody else will see it/.test(conf.text) && /nothing is accepted automatically/.test(conf.text));
  await ev(`document.getElementById('nt-consent').click(), document.getElementById('nt-share').click(), 1`); await wait(1500);
  const shared = await ev(`(() => { const a = JSON.parse(localStorage.getItem('core.contrib.v1') || '[]'); return (Array.isArray(a) ? a : a.items || []).filter(e => e.state !== 'private').map(e => e.state); })()`);
  check('G. after consent: shared with the mission and evaluated on form only', shared.length >= 1, JSON.stringify(shared));
  await scan('world · contribution'); await shot('G-contribution');
  await go('me.html', '!!globalThis.CORE_ME'); await wait(1500);
  const me = await ev(`document.body.innerText`);
  check('G. My CORE lists the contribution (persistence across pages)', /Buses stuck on Folsom \(edited\)/.test(me));
  await scan('me.html');

  // ---------- H. Companion ----------
  await go('world.html', E_READY);
  const cmd = async text => { await ev(`(async () => { if (!document.querySelector('dialog.cmp[open]')) document.querySelector('[data-companion]').click(); for (let i = 0; i < 40 && !document.querySelector('dialog.cmp input'); i++) await new Promise(r => setTimeout(r, 100)); const i = document.querySelector('dialog.cmp input'); i.value = ${JSON.stringify(text)}; document.querySelector('[data-cmp-form]').requestSubmit(); return 1; })()`); await wait(2500); return ev(`document.querySelector('[data-cmp-out]')?.innerText || ''`); };
  const nav = await cmd('show me the problems'); await wait(800);
  check('H. navigation command opens the problems & missions panel', await ev(`CORE_EARTH.state.panelKind?.kind === 'problems' || !document.getElementById('ea-list').hidden`), nav.slice(0, 80).replace(/\n/g, ' '));
  const ans = await cmd('What could reduce bus delays on Folsom?');
  check('H. grounded question: answer cites recorded finding ids (or states the model is unavailable)', /\b[a-z]\.[a-z-]+\b/.test(ans) || /unavailable/i.test(ans), ans.slice(0, 140).replace(/\n/g, ' '));
  const mic = await ev(`(m => ({ exists: !!m, hidden: !m || m.hidden || getComputedStyle(m).display === 'none', sr: !!(globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition) }))(document.querySelector('[data-cmp-mic]'))`);
  check('H. microphone only with on-device recognition; typed fallback always present', (mic.sr || mic.hidden) && await ev(`!!document.querySelector('dialog.cmp input')`), JSON.stringify(mic));
  await scan('world · companion'); await shot('H-companion');
  await ev(`document.querySelector('dialog.cmp')?.close(), 1`);

  // ---------- D. Manual tour ----------
  await ev(`CORE_EARTH.launchDemo('manual'), 1`); await until(`!!document.querySelector('.demo h2')`, 15000); await wait(7000);
  const d0 = await ev(`({ i: CORE_EARTH.state.demo.state.i, h: document.querySelector('.demo h2').textContent })`);
  check('D. manual mode stays on stage 1 until the user advances', d0.i === 0, d0.h);
  await scan('world · demo stage 1'); await layout('demo controls', ['.demo [data-d=next]', '.demo [data-d=exit]']);
  await ev(`document.querySelector('.demo [data-d=next]').click(), 1`); await wait(4000);
  const d1 = await ev(`CORE_EARTH.state.demo.state.i`);
  await ev(`document.querySelector('.demo [data-d=prev]').click(), 1`); await wait(4000);
  const d2 = await ev(`CORE_EARTH.state.demo.state.i`);
  check('D. Next and Previous move one stage', d1 === 1 && d2 === 0, `${d1}, ${d2}`);
  // B. language switch while the demo and a panel are open
  await setLang('fr'); await wait(800);
  const fr = await ev(`({ lang: document.documentElement.lang, demo: document.querySelector('.demo h2')?.textContent, ctl: document.querySelector('.demo [data-d=next]')?.textContent, nav: document.querySelector('.le-nav a')?.textContent.trim() })`);
  check('B. switching to French updates the shell and the open demo panel', fr.lang === 'fr' && fr.demo !== d0.h && /Suivant/.test(fr.ctl || '') && fr.nav === 'Explorer', JSON.stringify(fr));
  await setLang('en');
  check('B. back to English: demo labels revert', /Next/.test(await ev(`document.querySelector('.demo [data-d=next]')?.textContent || ''`)) && await ev(`document.querySelector('.demo h2')?.textContent`) === d0.h);
  for (let i = 0; i < 14; i++) { await ev(`document.querySelector('.demo [data-d=next]')?.click(), 1`); await wait(2500); }
  const last = await ev(`({ i: CORE_EARTH.state.demo.state.i, txt: document.querySelector('.demo')?.innerText || '' })`);
  check('D. reaches the final stage with its conclusion; Restart offered', last.i === 14 && /A parallel world to help humanity improve the real one/.test(last.txt) && await ev(`!!document.querySelector('.demo [data-d=restart]')`), `stage ${last.i + 1}`);
  await scan('world · demo final stage'); await shot('D-final');
  await ev(`document.querySelector('.demo [data-d=restart]').click(), 1`); await wait(3000);
  check('D. Restart returns to stage 1', await ev(`CORE_EARTH.state.demo.state.i`) === 0);
  await ev(`document.querySelector('.demo [data-d=exit]').click(), 1`); await wait(600);
  check('D. Exit closes the tour', !(await ev(`!!document.querySelector('.demo')`)));

  // ---------- B. panels and simulation re-render on language change ----------
  await ev(`CORE_EARTH.openMission('mission.sf.mobility'), 1`); await wait(1200);
  const mEn = await ev(`document.getElementById('ea-panel').innerText.slice(0, 200)`); await setLang('fr');
  const mFr = await ev(`document.getElementById('ea-panel').innerText.slice(0, 200)`);
  check('B. open mission panel re-renders in French', mFr !== mEn && /[éèàç]|\b(les|des|une)\b/.test(mFr), mFr.slice(0, 60).replace(/\n/g, ' '));
  await ev(`CORE_EARTH.showSimulation('B').then(() => 1)`); await wait(2500);
  check('B. simulation description in French', /Simulation SUMO enregistrée : demande synthétique, modèle non calibré/i.test(await ev(`document.getElementById('ea-panel').innerText`)));
  await setLang('en'); await wait(500);
  check('B. simulation description back in English', /Recorded SUMO simulation: synthetic demand, uncalibrated model/i.test(await ev(`document.getElementById('ea-panel').innerText`)));
  await ev(`document.querySelector('[data-scn-off]')?.click(), 1`).catch(() => 0);

  // ---------- B. other supported pages, English then a French spot check ----------
  const PAGES = [['commons.html#profile', 'CORE_COMMONS'], ['commons.html#vault', 'CORE_COMMONS'], ['commons.html#labs', 'CORE_COMMONS'], ['commons.html#arena', 'CORE_COMMONS'], ['commons.html#academy', 'CORE_COMMONS'],
    ['commons.html#knowledge?view=ask', 'CORE_COMMONS'], ['commons.html#knowledge?view=explore&q=folsom', 'CORE_COMMONS'], ['commons.html#experts', 'CORE_COMMONS'], ['commons.html#communities', 'CORE_COMMONS'], ['commons.html#continuity', 'CORE_COMMONS'],
    ['commons.html#institutions', 'CORE_COMMONS'], ['commons.html#journey', 'CORE_COMMONS'], ['commons.html#trust', 'CORE_COMMONS'], ['commons.html#progress', 'CORE_COMMONS'],
    ['dialogue.html', 'CORE_DIALOGUE'], ['dialogue.html#mission=mission.sf.housing-resilience', 'CORE_DIALOGUE'], ['avatar.html', 'CORE_STUDIO'], ['progress.html', 'CORE_PROGRESS'], ['report.html#mission=mission.sf.mobility', 'CORE_REPORT'], ['manifesto.html', 'CORE_MANIFESTO'], ['privacy.html', 'true']];
  for (const [url, g] of PAGES) {
    const ok = await go(url, g === 'true' ? 'document.readyState === "complete"' : `!!globalThis.${g}`); await wait(url.startsWith('commons') || url.startsWith('dialogue') ? 2500 : 1500);
    if (!ok) { check(`J. page loads · ${url}`, false); continue; }
    if (url === 'commons.html#knowledge?view=ask') { await ev(`document.querySelector('[data-kq]')?.click(), 1`); await wait(1500); }
    if (url.startsWith('dialogue.html#mission')) { await ev(`document.querySelector('[data-q]')?.click(), 1`); await wait(3500); }
    if (url === 'dialogue.html') { await ev(`document.querySelector('[data-q]')?.click(), 1`); await wait(1500); }
    await scan(url);
  }
  await go('manifesto.html', '!!globalThis.CORE_MANIFESTO'); const mf = await ev(`globalThis.CORE_MANIFESTO`);
  check('J. manifesto: 16 chapters and ten founding principles in English with contents', mf.chapters === 16 && mf.principles === 10 && mf.words >= 3000 && await ev(`document.querySelectorAll('.mf-toc li').length`) === 17 && /THE CORE MANIFESTO/.test(await ev(`document.querySelector('.mf-doc h1').textContent`)), `${mf.words} words`);
  await setLang('fr'); const mff = await ev(`globalThis.CORE_MANIFESTO`);
  check('B. manifesto fully in French when French is selected', mff.lang === 'fr' && mff.chapters === 16 && mff.principles === 10 && /LE MANIFESTE CORE/.test(await ev(`document.querySelector('.mf-doc h1').textContent`)));
  await go('report.html#mission=mission.sf.mobility', '!!globalThis.CORE_REPORT'); await wait(1500);
  check('B. report in French when French is selected; no raw objects', /Proposition soumise à examen/.test(await ev('document.body.innerText')) && !(await ev(`/\\[object Object\\]/.test(document.body.innerText)`)));
  await go('commons.html#knowledge?view=ask', '!!globalThis.CORE_COMMONS'); await wait(2000); await ev(`document.querySelector('[data-kq]')?.click(), 1`); await wait(1500);
  check('B. CORE Knowledge answers in French when French is selected', /problèmes|trottoir|relevé|le registre/i.test(await ev(`document.getElementById('kb-answer')?.innerText || ''`)));
  await setLang('en');

  }
  // ---------- C. Autonomous tour (unattended) ----------
  if (!flags.has('--skip-tour')) {
    await go('world.html', E_READY); await ev(`CORE_EARTH.launchDemo('auto'), 1`); await until(`!!CORE_EARTH.state.demo?.state && CORE_EARTH.state.demo.state.i >= 0`, 20000);
    const tTour = Date.now(); let lastI = -1, seen = new Set(), clicks = 0;
    while (Date.now() - tTour < 480000) { const s = await ev(`(d => d ? { i: d.state.i, done: d.state.done, running: d.state.running } : null)(CORE_EARTH.state.demo)`).catch(() => null); if (!s) break; if (s.i !== lastI) { seen.add(s.i); lastI = s.i; if (s.i === 7) await shot('C-tour-evidence'); if (s.i === 9) await shot('C-tour-motion'); } if (s.done || (s.i === 14 && await ev(`!!CORE_EARTH.state.demo.state.statuses[14]`))) break; await wait(1000); }
    const tour = await ev(`({ i: CORE_EARTH.state.demo.state.i, statuses: CORE_EARTH.state.demo.state.statuses, txt: document.querySelector('.demo')?.innerText || '' })`); metrics.tourMs = Date.now() - tTour;
    check('C. autonomous tour visits all 15 stages without any click', seen.size === 15 && clicks === 0, `${seen.size} stages in ${Math.round(metrics.tourMs / 1000)} s`);
    check('C. every stage reached its scene (ready, no fallback needed)', tour.statuses.filter(Boolean).length === 15 && tour.statuses.every(s => s?.ready), tour.statuses.filter(s => !s?.ready).map(s => s?.id).join(', '));
    check('C. tour ends on its conclusion', /A parallel world to help humanity improve the real one/.test(tour.txt));
    await shot('C-tour-final');
  }

  // ---------- J / safety ----------
  check('J. no uncaught page errors during the walkthrough', errors.length === 0, errors.slice(0, 3).join(' | '));
  const extra = [...hosts].filter(h => !ALLOWED.includes(h));
  check('J. network: only self, map tiles, NASA GIBS, terrain tiles and the loopback local model', extra.length === 0, extra.join(', '));
} catch (e) { check('audit crashed', false, e.stack?.split('\n').slice(0, 3).join(' ')); }
fs.writeFileSync(`${out}-results.json`, JSON.stringify({ viewport: `${W}x${H}`, at: new Date().toISOString(), base: CORE_BASE, pass: results.length, fail: fails.length, fails, results, metrics, errors, hosts: [...hosts], leaks }, null, 1));
console.log(`\n${results.length} passed, ${fails.length} failed → ${out}-results.json`);
await call('Target.closeTarget', { targetId: tab.id }).catch(() => 0); ws.close(); process.exit(fails.length ? 1 : 0);
