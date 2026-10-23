// Local R10 check: a public visitor cannot discover founder-private projects; the loopback founder session can open them.
//   node scripts/r10-private-browser.mjs <public base, e.g. http://127.0.0.1:8794/ serving public/> [output dir]
// Requires a browser you started with --remote-debugging-port=$CORE_CDP_PORT on 127.0.0.1 and `node scripts/build-public.mjs`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { createFounderServer, PRIVATE_DIR } from './founder-server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8794/';
const out = process.argv[3] || '.core-local/evidence/r10-private';
fs.mkdirSync(out, { recursive: true });
const DENIED = new Set(JSON.parse('[' + /new Set\(\[([^\]]+)\]/.exec(fs.readFileSync('test/private-isolation.test.js', 'utf8'))[1].replace(/'/g, '"') + ']'));
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 24);
const leaks = text => { const w = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []; return w.some((x, j) => DENIED.has(hash(x)) || (j && DENIED.has(hash(w[j - 1] + ' ' + x)))); };
const report = { base, at: new Date().toISOString(), checks: [], requests: [], errors: [] };
const check = (name, ok) => { report.checks.push({ name, pass: !!ok }); assert.ok(ok, name); console.log('PASS', name); };
const { server, capability } = createFounderServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
const founder = `http://127.0.0.1:${server.address().port}/`;
// The project id is read from the private store at run time so this tracked script never names it.
const id = fs.readdirSync(PRIVATE_DIR).find(d => fs.existsSync(`${PRIVATE_DIR}/${d}/index.mjs`)); assert.ok(id, 'no private project in ' + PRIVATE_DIR);
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9261));
try {
  const pub = await browser.newContext({ viewport: { width: 1440, height: 900 } }), page = await pub.newPage();
  page.on('request', r => report.requests.push(r.url())); page.on('pageerror', e => report.errors.push(e.message));
  for (const p of ['business.html', 'solutions.html', 'world.html', 'me.html']) {
    await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(p === 'world.html' ? 6000 : 1500);
    check(`public ${p}: rendered text has no private project term`, !leaks(await page.locator('body').innerText()));
  }
  check('public Mon CORE shows no local founder workspace', await page.locator('#founder-local').count() === 0);
  await page.goto(base + 'world.html#private/' + id, { waitUntil: 'load' }); await page.waitForTimeout(6000);
  check('public private route opens nothing', await page.evaluate(() => !globalThis.CORE_TWIN && !document.querySelector('.twin-panel')));
  check('public pages never request a private file or founder API', report.requests.every(u => !/\/private\/(?!extensions\.mjs)|\/api\/founder\//.test(new URL(u).pathname)));
  for (const p of [`private/${id}/index.mjs`, `private/${id}/project.json`, 'api/founder/extensions', 'private/extensions.mjs'])
    check(`public GET /${p.replace(id, '<id>')} is 404`, (await pub.request.get(base + p)).status() === 404);
  check('founder server refuses private file without session', (await pub.request.get(founder + `private/${id}/index.mjs`)).status() === 404);
  await pub.close();
  const priv = await browser.newContext({ viewport: { width: 1440, height: 900 } }), fp = await priv.newPage();
  fp.on('pageerror', e => report.errors.push('founder: ' + e.message));
  await fp.goto(founder + 'me.html#founder=' + capability, { waitUntil: 'load' });
  await fp.locator(`#founder-local a[href="world.html#private/${id}"]`).waitFor({ timeout: 30000 });
  check('capability removed from the address bar', !fp.url().includes(capability));
  check('Mon CORE lists the private project in the founder session', true);
  await fp.locator(`#founder-local a[href="world.html#private/${id}"]`).click();
  await fp.waitForFunction(() => !!globalThis.CORE_TWIN, null, { timeout: 90000 });
  check('founder session opens the private project and its agents', await fp.locator('.twin-agent').count() > 0);
  await fp.screenshot({ path: out + '/founder-private.png' });
  await priv.close();
  check('no page errors', report.errors.length === 0);
} finally {
  report.requests = [...new Set(report.requests.map(u => new URL(u).pathname))];
  fs.writeFileSync(out + '/report.json', JSON.stringify(report, null, 2) + '\n');
  await browser.close(); server.close();
}
