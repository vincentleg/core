// Optional dependency-free CDP verification in an existing isolated Chromium. No browser installation.
// node scripts/research-browser.mjs 9333 http://127.0.0.1:8000/research.html /tmp/core-p13-local
import fs from 'node:fs';
import assert from 'node:assert/strict';
const port = Number(process.argv[2] || 9333), url = process.argv[3] || 'http://127.0.0.1:8000/research.html', output = process.argv[4] || '/tmp/core-p13-browser';
if (!Number.isInteger(port) || !/^https?:\/\/(127\.0\.0\.1|localhost|vincentleg\.github\.io)([:/]|$)/.test(url) || !output.startsWith('/tmp/')) throw Error('Bounded browser audit arguments required');
const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
assert.ok(target.webSocketDebuggerUrl, 'Chromium CDP required; do not reuse another browser service');
const ws = new WebSocket(target.webSocketDebuggerUrl), pending = new Map(), errors = [], requests = [], failed = []; let id = 0;
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); if (p) { clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); } }
  else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Log.entryAdded' && m.params.entry.level === 'error' || m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m);
  else if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
  else if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) failed.push({ url: m.params.response.url, status: m.params.response.status });
});
const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id, timer = setTimeout(() => { pending.delete(n); reject(Error('CDP timeout: ' + method)); }, 15000); pending.set(n, { resolve, reject, timer }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async expression => { const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error('Browser evaluation failed'); return r.result.value; };
const until = async expression => { for (let n = 0; n < 80; n++) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error('Browser assertion timeout'); };
try {
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await call(m);
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url });
  await until(`document.querySelector('#status')?.textContent.startsWith('Enregistrement vérifié') || document.querySelector('#status')?.textContent.startsWith('BLOCKED')`);
  assert.ok(await evaluate(`document.querySelector('#status').textContent.startsWith('Enregistrement vérifié')`), 'recorded dossiers verified');
  assert.equal(await evaluate(`document.querySelectorAll('#result table:first-of-type tbody tr').length`), 6); // two three-row comparison/sensitivity tables
  assert.ok(await evaluate(`document.querySelector('#contribution').textContent.includes('résultat scientifique lié')`));
  await evaluate(`document.querySelector('#factor').value='1.2';document.querySelector('#controls').requestSubmit();0`);
  await until(`document.querySelector('#result table tbody').textContent.includes('14,4')`);
  assert.ok(await evaluate(`document.querySelector('#result').textContent.includes('historique reste inchangé')`));
  await evaluate(`document.querySelector('#domain').value='historical-energy';document.querySelector('#factor').value='1';document.querySelector('#controls').requestSubmit();0`);
  await until(`document.querySelector('#result h2')?.textContent.startsWith('Énergie')`);
  assert.ok(await evaluate(`document.querySelector('#result').textContent.includes('18,721') && document.querySelector('#result').textContent.includes('ei-2025')`));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), 'mobile has no page overflow');
  assert.ok(await evaluate(`document.querySelector('#domain').labels.length===1 && document.querySelector('#factor').labels.length===1 && document.querySelector('a.skip')!==null`));
  fs.writeFileSync(output + '.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const external = requests.filter(s => /^https?:/.test(s) && new URL(s).origin !== new URL(url).origin);
  const evidence = { url, checks: ['recorded-dossiers-reproduced', 'three-candidates', 'sensitivity-control', 'energy-SI-and-source', 'contribution-link', 'mobile-no-overflow', 'labels-and-skip-link'], errors: errors.length, failedRequests: failed, externalRequests: external, browserScope: 'Chromium only; no full accessibility certification' };
  fs.writeFileSync(output + '.json', JSON.stringify(evidence, null, 2) + '\n');
  assert.equal(errors.length, 0, 'zero console errors'); assert.deepEqual(failed, [], 'no failed resource'); assert.deepEqual(external, [], 'no model or external data request');
  console.log(JSON.stringify(evidence));
} finally { ws.close(); }
