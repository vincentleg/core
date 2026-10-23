// Local R9 check for navigation, keyboard entry, responsive width and read-only page behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8794/';
const out = process.argv[3] || '.core-local/evidence/r9-readiness';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9254));
let checks = 0;
const timings = [];
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('core.lang', 'en'));
    const page = await context.newPage(), errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
    for (const [file, current, target] of [['city.html', 'world.html#explore', '#city-main'], ['business.html', 'solutions.html', '#business-main']]) {
      const started = performance.now();
      await page.goto(base + file, { waitUntil: 'domcontentloaded' });
      await page.locator(`${target} h1`).waitFor();
      timings.push({ viewport: name, file, localReadyMs: Math.round(performance.now() - started) });
      assert.equal(await page.locator('#core-nav a[aria-current=page]').getAttribute('href'), current); checks++;
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.className), 'skip'); checks++;
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement?.id), target.slice(1)); checks++;
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); checks++;
    }
    assert.deepEqual(errors, []); assert.deepEqual(writes, []); checks += 2;
    await page.screenshot({ path: `${out}/${name}-business.png` });
    await context.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(`${out}/report.json`, JSON.stringify({ checks, timings, browser: browser.version() }, null, 2));
console.log(`${checks}/20 R9 browser checks passed`);
