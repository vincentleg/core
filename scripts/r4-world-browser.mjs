// Local R4 acceptance: run against a freshly built public/ with an isolated Chrome CDP session.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8794/';
const out = process.argv[3] || '.core-local/evidence/r4-world';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9254));
let passed = 0;
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('core.lang', 'en'));
    const page = await context.newPage(), errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
    await page.goto(base + 'world.html#problems', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-discovery=area]').waitFor({ timeout: 90000 });
    const all = Number((await page.locator('#cv-discovery-count').innerText()).split(' ')[0]);
    assert.ok(all > 1); passed++;
    await page.locator('[data-discovery=category]').selectOption('active');
    const active = Number((await page.locator('#cv-discovery-count').innerText()).split(' ')[0]);
    assert.ok(active > 0 && active < all); passed++;
    await page.evaluate(() => CORE_EARTH.state.map.jumpTo({ center: [-122.4038, 37.7793], zoom: 15 }));
    await page.locator('[data-discovery=area]').selectOption('near');
    assert.ok(await page.locator('#cv-discovery-results [data-mission]').count() > 0); passed++;
    await page.screenshot({ path: `${out}/${name}-discovery.png` });
    await page.locator('#cv-discovery-results [data-mission]').first().click();
    assert.match(await page.locator('#ea-panel').innerText(), /What is known|What remains unknown/); passed++;
    assert.ok(await page.locator('#ea-panel [data-contribute]').count() > 0); passed++;
    await page.locator('#ea-panel [data-contribute]').click();
    assert.match(await page.locator('#ea-panel').innerText(), /private|browser/i); passed++;
    await page.goto(base + 'me.html#contributions', { waitUntil: 'domcontentloaded' });
    await page.locator('#contributions').waitFor();
    assert.match(await page.locator('#contributions').innerText(), /No contribution yet|My contributions/); passed++;
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); passed++;
    assert.deepEqual(errors, []); assert.deepEqual(writes, []); passed += 2;
    await context.close();
  }
} finally { await browser.close(); }
console.log(`${passed}/20 R4 browser checks passed`);
