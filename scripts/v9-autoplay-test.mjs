// CORE V9 — autonomous demo acceptance test through the REAL user path: fresh session, trusted mouse clicks
// (CDP Input.dispatchMouseEvent) on the visible « Launch CORE Demo » button and the visible autonomous option, then
// NO click, key or programmatic stage change. The page is only read. Fails if the tour stalls on any stage.
// Then checks that manual mode does NOT advance on its own.
//   CORE_BASE=http://127.0.0.1:8000/ node scripts/v9-autoplay-test.mjs <cdp-port> [w h]   (never port 9222)
const CORE_BASE = process.env.CORE_BASE || 'http://localhost:8000/';
const [port, W = '1440', H = '900'] = process.argv.slice(2);
if (String(port) === '9222') throw Error('port 9222 is reserved');
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let n = 0; const pend = new Map(), errors = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { pend.get(m.id)?.(m); pend.delete(m.id); return; } if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200)); });
const call = (method, params = {}) => new Promise((res, rej) => { const id = ++n; const t = setTimeout(() => rej(Error('timeout ' + method)), 60000); pend.set(id, m => { clearTimeout(t); m.error ? rej(Error(JSON.stringify(m.error))) : res(m.result); }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => { const r = await call('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (x, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(x).catch(() => false)) return true; await wait(250); } return false; };
// A trusted click at the centre of the visible element, like a person with a mouse.
const click = async sel => { const b = await ev(`(e => { if (!e) return null; const r = e.getBoundingClientRect(); return r.width && r.height ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })(document.querySelector(${JSON.stringify(sel)}))`);
  if (!b) throw Error(`not visible: ${sel}`); for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await call('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 }); };
const fails = []; const check = (name, ok, d = '') => { if (!ok) fails.push(name); console.log(ok ? 'PASS' : 'FAIL', name, d); };
const fresh = async () => { await call('Page.navigate', { url: CORE_BASE + 'world.html' }); await until(`!!globalThis.CORE_EARTH`, 30000); await ev('localStorage.clear(), sessionStorage.clear(), 1'); await call('Page.navigate', { url: 'about:blank' }); await wait(300); await call('Page.navigate', { url: CORE_BASE + 'world.html' }); await until(`!!document.getElementById('ea-demo-cta') && document.readyState === 'complete'`, 30000); await wait(800); };
try {
  for (const m of ['Page.enable', 'Runtime.enable']) await call(m);
  await call('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 700 });
  // ---------- autonomous ----------
  await fresh(); await click('#ea-demo-cta'); await until(`!document.getElementById('ea-demo-choice').hidden`, 5000);
  await click('[data-demo-mode=auto]');
  check('demo panel appears after the two clicks', await until(`!!document.querySelector('.demo h2')`, 20000));
  check('autonomous mode: no Next button shown', !(await ev(`!!document.querySelector('.demo [data-d=next]')`)));
  const t0 = Date.now(), seen = [], STALL = 45000; let last = -1, since = Date.now(), done = false;
  while (Date.now() - t0 < 600000) {
    const s = await ev(`(d => d ? { i: d.state.i, done: d.state.done, paused: d.state.paused, h: document.querySelector('.demo h2')?.textContent } : null)(CORE_EARTH.state.demo)`).catch(() => null);
    if (s && s.i !== last) { last = s.i; since = Date.now(); seen.push(s.i); console.log(`  stage ${s.i + 1}/15 at ${Math.round((Date.now() - t0) / 1000)} s — ${s.h}`); }
    if (s?.done) { done = true; break; }
    if (Date.now() - since > STALL) { console.log('  STALLED on stage', last + 1, JSON.stringify(s)); break; }
    await wait(500);
  }
  check('autonomous tour advanced through all 15 stages by itself', new Set(seen).size === 15 && seen.every((x, i) => x === i), seen.map(x => x + 1).join(','));
  check('conclusion reached, with replay and explore options', done && await ev(`/A parallel world to help humanity improve the real one/.test(document.querySelector('.demo')?.innerText || '') && !!document.querySelector('.demo [data-d=restart]') && !!document.querySelector('.demo [data-d=exit]')`), `${Math.round((Date.now() - t0) / 1000)} s`);
  // ---------- manual ----------
  await fresh(); await click('#ea-demo-cta'); await until(`!document.getElementById('ea-demo-choice').hidden`, 5000); await click('[data-demo-mode=manual]');
  await until(`!!document.querySelector('.demo h2')`, 20000); await wait(25000);
  check('manual mode stays on stage 1 without a click (25 s)', await ev(`CORE_EARTH.state.demo.state.i`) === 0);
  await click('.demo [data-d=next]'); await wait(1500);
  check('manual mode: Next advances one stage', await ev(`CORE_EARTH.state.demo.state.i`) === 1);
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (e) { check('test crashed', false, e.message); }
console.log(fails.length ? `FAILED: ${fails.length}` : 'ALL PASSED'); await call('Target.closeTarget', { targetId: tab.id }).catch(() => 0); process.exit(fails.length ? 1 : 0);
