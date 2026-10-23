// Local R8 acceptance: pathway links across World, Cities, Business and My CORE.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8794/';
const out = process.argv[3] || '.core-local/evidence/r8-civilization';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9254));
let checks = 0;
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('core.lang', 'en'));
    const page = await context.newPage(), errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
    await page.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
    await page.locator('.ea-paths').waitFor();
    assert.equal(await page.locator('.ea-paths a').count(), 4); checks++;
    assert.match(await page.locator('.ea-paths').innerText(), /dated evidence|decision blocked|synthetic scenarios|no ranking/); checks++;
    await page.locator('.ea-paths').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/${name}-paths.png` });
    await page.locator('.ea-paths a[href="city.html"]').click();
    await page.locator('#city-scenario').waitFor(); checks++;
    await page.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
    await page.locator('.ea-paths a[href="me.html#contributions"]').click();
    await page.locator('#contributions').waitFor(); checks++;
    assert.match(await page.locator('#contributions').innerText(), /browser|My contributions|No contribution yet/i); checks++;
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); checks++;
    assert.deepEqual(errors, []); assert.deepEqual(writes, []); checks += 2;
    await context.close();
  }
} finally { await browser.close(); }
console.log(`${checks}/16 R8 browser checks passed`);
