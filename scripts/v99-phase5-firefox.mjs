// Native Firefox acceptance through its available WebDriver BiDi endpoint; no browser/package download.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const port = Number(process.env.CORE_FIREFOX_PORT || 9243), base = process.env.CORE_TEST_URL || 'http://127.0.0.1:8790/';
assert.ok(port !== 9222 && ['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const out = process.argv[2] || '.core-local/evidence/v99-phase5/firefox.json';
const ws = new WebSocket(`ws://127.0.0.1:${port}/session`), pending = new Map(); let id = 0;
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
ws.addEventListener('message', e => { const m = JSON.parse(e.data), p = pending.get(m.id); if (!p) return; clearTimeout(p.timer); pending.delete(m.id); m.type === 'error' ? p.reject(Error(m.error + ': ' + m.message)) : p.resolve(m.result); });
const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id, timer = setTimeout(() => { pending.delete(n); reject(Error('Timeout: ' + method)); }, 30000); pending.set(n, { resolve, reject, timer }); ws.send(JSON.stringify({ id: n, method, params })); });
const report = { at: new Date().toISOString(), rows: [], pageErrors: [] }; let context;
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.method === 'log.entryAdded' && m.params.type === 'javascript' && !/Cross-Origin Request|CORS|NetworkError/i.test(m.params.text || '')) report.pageErrors.push(m.params.text); });
const evaluate = async expression => {
  const r = await call('script.evaluate', { expression: `(async()=>JSON.stringify(await (${expression})))()`, target: { context }, awaitPromise: true, resultOwnership: 'none' });
  if (r.type === 'exception') throw Error(r.exceptionDetails?.text || 'script exception');
  return r.result.value === undefined ? undefined : JSON.parse(r.result.value);
};
const until = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 200)); } throw Error('Condition timed out: ' + expression); };
const navigate = path => call('browsingContext.navigate', { context, url: new URL(path, base).href, wait: 'complete' });
const press = value => call('input.performActions', { context, actions: [{ type: 'key', id: 'keyboard', actions: [{ type: 'keyDown', value }, { type: 'keyUp', value }] }] });
try {
  report.capabilities = (await call('session.new', { capabilities: {} })).capabilities;
  assert.equal(report.capabilities.browserName.toLowerCase(), 'firefox');
  await call('session.subscribe', { events: ['log.entryAdded'] });
  context = (await call('browsingContext.create', { type: 'tab' })).context;
  for (const code of ['en', 'fr', 'es', 'de', 'zh-CN', 'pt']) {
    const row = { code, checks: [], errors: [] }, check = (name, ok) => { assert.equal(typeof ok, 'boolean', name); row.checks.push({ name, ok }); };
    try {
      await call('browsingContext.setViewport', { context, viewport: { width: 1440, height: 900 } });
      await navigate('world.html'); await until('!!(globalThis.CORE_EARTH?.state.ready && globalThis.CORE_INTELLIGENCE?.engine)');
      await evaluate(`(async()=>{await(await import('/src/i18n/i18n.mjs')).setLang(${JSON.stringify(code)});return true;})()`);
      check('language', await evaluate(`document.documentElement.lang===${JSON.stringify(code)}`));
      check('actual WebGL globe', await evaluate(`(()=>{const m=CORE_EARTH.state.map,c=m.getCanvas(),gl=c.getContext('webgl2');return c.width>0&&!!gl&&!gl.isContextLost()&&JSON.stringify(m.getProjection()).includes('vertical-perspective');})()`));
      if (code === 'en') { const r = await call('browsingContext.captureScreenshot', { context }); fs.writeFileSync(out + '.globe.png', Buffer.from(r.data, 'base64')); }
      await evaluate(`(document.querySelector('#ea-start').click(),true)`);
      check('Explorer search moves camera', await evaluate(`(async()=>{const m=CORE_EARTH.state.map,before=m.getCenter().toArray();await CORE_INTELLIGENCE.submit('Take me to Folsom Street in San Francisco.');return CORE_INTELLIGENCE.lastResult.navigated&&JSON.stringify(before)!==JSON.stringify(m.getCenter().toArray());})()`));
      for (const team of [false, true]) {
        await call('browsingContext.setViewport', { context, viewport: { width: 320, height: 900 } });
        await navigate('dialogue.html' + (team ? '#mission=mission.sf.mobility' : '')); await until('!!globalThis.CORE_DIALOGUE');
        const tag = team ? 'team' : 'room';
        check(tag + ' header fits 320px', await evaluate(`[...document.querySelectorAll('#core-nav .mark,#core-nav [data-companion],#core-nav [data-demo],#core-nav [data-lang],#core-nav summary')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;})`));
        await evaluate(`(document.querySelector('[data-side]').focus(),true)`);
        for (const [key, index] of [['\uE014', 1], ['\uE012', 0], ['\uE010', 2], ['\uE011', 0]]) {
          await press(key);
          check(tag + ' tab key ' + index, await evaluate(`(()=>{const tabs=[...document.querySelectorAll('[data-side]')],e=tabs[${index}];return document.activeElement===e&&e.getAttribute('aria-selected')==='true'&&tabs.filter(t=>t.tabIndex===0).length===1&&document.querySelector('#dl-side').getAttribute('aria-labelledby')===e.id;})()`));
        }
        await press('\uE004'); check(tag + ' Tab reaches panel', await evaluate(`document.activeElement.id==='dl-side'`));
        if (!team) {
          await evaluate(`(document.querySelector('.dl-mode [role=radio]').focus(),true)`); await press('\uE014');
          check('radio selects studio', await evaluate(`document.activeElement.dataset.mode==='studio'&&document.activeElement.getAttribute('aria-checked')==='true'&&CORE_DIALOGUE.state.mode==='studio'`));
        }
        check(tag + ' preserves language', await evaluate(`document.documentElement.lang===${JSON.stringify(code)}`));
      }
    } catch (e) { row.errors.push(e.message); }
    report.rows.push(row); fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); console.log(code, row.checks.filter(c => !c.ok).length, 'failures', row.errors.length, 'errors');
  }
} finally { await call('session.end').catch(() => {}); ws.close(); }
assert.equal(report.rows.length, 6);
report.failures = report.pageErrors.length + report.rows.reduce((n, r) => n + r.errors.length + r.checks.filter(c => !c.ok).length, 0);
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); process.exitCode = report.failures ? 1 : 0;
