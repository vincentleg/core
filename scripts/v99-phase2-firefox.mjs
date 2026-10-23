// Native installed Firefox 122 exposes CDP. This does not use a Chrome executable or download another browser.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const port = Number(process.env.CORE_FIREFOX_PORT || 9243), base = process.env.CORE_TEST_URL || 'http://127.0.0.1:8790/';
assert.ok(port !== 9222 && ['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); assert.match(version.Browser, /^Firefox\//);
const report = { at: new Date().toISOString(), version, rows: [] };
const out = process.argv[2] || '.core-local/evidence/v99-phase2/firefox.json';
for (const code of ['en', 'fr', 'es', 'de', 'zh-CN', 'pt']) {
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?${new URL('world.html', base).href}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0; const pending = new Map(), errors = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); if (!p) return; clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.text || 'page exception'); });
const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id, timer = setTimeout(() => { pending.delete(n); reject(Error('Timeout: ' + method)); }, 45000); pending.set(n, { resolve, reject, timer }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async expression => { const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result?.value; };
const until = async expression => { const start = Date.now(); while (Date.now() - start < 45000) { if (await evaluate(expression).catch(() => false)) return; await new Promise(resolve => setTimeout(resolve, 200)); } throw Error('Condition timed out: ' + expression); };
  try {
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable'); await call('Network.setCacheDisabled', { cacheDisabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const row = { code, checks: [], errors: [], axe: null }, check = (name, ok) => row.checks.push({ name, ok: !!ok }); const before = errors.length;
    try {
      await until('!!(globalThis.CORE_EARTH?.state.ready && globalThis.CORE_INTELLIGENCE?.engine)');
      await evaluate(`(s=>{s.value=${JSON.stringify(code)};s.dispatchEvent(new Event('change'));})(document.querySelector('[data-lang]'))`); await until(`document.documentElement.lang===${JSON.stringify(code)}`);
      check('Firefox document language', await evaluate(`document.documentElement.lang===${JSON.stringify(code)}`));
      row.render = await evaluate(`new Promise(resolve=>{const m=CORE_EARTH.state.map;m.once('render',()=>{const c=m.getCanvas(),gl=c.getContext('webgl2');resolve({width:c.width,height:c.height,zoom:m.getZoom(),projection:m.getProjection(),contextLost:!gl||gl.isContextLost()});});m.triggerRepaint();})`);
      check('globe rendered by WebGL', row.render.width>0 && !row.render.contextLost && row.render.zoom<9 && JSON.stringify(row.render.projection).includes('vertical-perspective'));
      if (code === 'en') { const png = await call('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(out + '.globe.png', Buffer.from(png.data, 'base64')); }
      await evaluate(`document.querySelector('#ea-start').click()`); check('Explorer opens', await evaluate('CORE_EARTH.exploring'));
      const result = await evaluate(`(async()=>{const before=CORE_EARTH.state.map.getCenter().toArray();await CORE_INTELLIGENCE.submit('Take me to Folsom Street in San Francisco.');return {navigated:CORE_INTELLIGENCE.lastResult.navigated,before,after:CORE_EARTH.state.map.getCenter().toArray()};})()`);
      check('search moves actual camera', result?.navigated && JSON.stringify(result.before) !== JSON.stringify(result.after));
      const next = code === 'en' ? 'fr' : 'en';
      await evaluate(`(s=>{s.value=${JSON.stringify(next)};s.dispatchEvent(new Event('change'));})(document.querySelector('[data-lang]'))`); await until(`document.documentElement.lang===${JSON.stringify(next)}`); check('language switches without reload', true);
      await evaluate(`(s=>{s.value=${JSON.stringify(code)};s.dispatchEvent(new Event('change'));})(document.querySelector('[data-lang]'))`); await until(`document.documentElement.lang===${JSON.stringify(code)}`);
      await evaluate(fs.readFileSync('.core-local/a11y-tools/node_modules/axe-core/axe.min.js', 'utf8'));
      row.axe = await evaluate(`(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),incomplete:r.incomplete.map(v=>v.id)};})()`);
      check('Explorer axe', row.axe.violations.length === 0);
      await evaluate(`document.querySelector('a[href="solutions.html"]').click()`); await until('location.pathname.endsWith("/solutions.html") && !!document.querySelector("[data-lang]")'); check('navigation link works', true);
      check('navigation preserves language', await evaluate(`document.documentElement.lang===${JSON.stringify(code)}`));

    } catch (e) { row.errors.push(e.message); row.diagnostic=await evaluate(`({url:location.href,ready:globalThis.CORE_EARTH?.state.ready,engine:!!globalThis.CORE_INTELLIGENCE?.engine,boot:document.querySelector('.le-boot')?.textContent})`).catch(e=>({transportError:e.message})); }
    row.errors.push(...errors.slice(before)); report.rows.push(row); fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); console.log(code, row.checks.filter(c => !c.ok).length, 'failures', row.errors.length, 'errors');
  } finally { await call('Target.closeTarget', { targetId: tab.id }).catch(() => {}); ws.close(); }
}
report.failures = report.rows.reduce((n, r) => n + r.errors.length + r.checks.filter(c => !c.ok).length, 0); fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); process.exitCode = report.failures || report.rows.length !== 6 ? 1 : 0;
