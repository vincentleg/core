// Screenshots of key states for visual review (Phase 6). node scripts/ui-shots.mjs [url] [outPrefix] [width] [height]
import fs from 'node:fs';
const [url = 'http://localhost:8000/', prefix = 'test-results/phase6/shot', W = '1440', H = '900'] = process.argv.slice(2);
const tab = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let n = 0; const pend = new Map(), errors = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) pend.get(m.id)?.(m); else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description || '').slice(0, 200)); });
const call = (method, params = {}) => new Promise(r => { const id = ++n; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => (await call('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async name => { const s = await call('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${prefix}-${name}.png`, Buffer.from(s.result.data, 'base64')); };
await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable'); await call('Network.setCacheDisabled', { cacheDisabled: true });
await call('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 700 });
await call('Page.navigate', { url });
for (let i = 0; i < 200 && !(await ev('!!(window.CORE_PLATFORM && CORE_PLATFORM.state.ready)')); i++) await wait(100);
await wait(3500); await shot('1-globe');
const steps = JSON.parse(process.env.STEPS || '[]');
const defaults = [
  ['2-city', `(document.querySelector('#pilot-real') || { click() {} }).click(); 0`, 10000],
  ['3-agents', `CORE_PLATFORM.show('agents'); 0`, 1500],
  ['4-mission', `CORE_PLATFORM.show('missions'); 0`, 1500],
  ['5-sims', `CORE_PLATFORM.show('sims'); 0`, 3500],
  ['6-demo', `CORE_PLATFORM.show('demo'); 0`, 1500],
];
for (const [name, js, ms] of steps.length ? steps : defaults) { await ev(js); await wait(ms); await shot(name); }
console.log(JSON.stringify({ errors }));
ws.close(); await fetch(`http://127.0.0.1:9222/json/close/${tab.id}`);
