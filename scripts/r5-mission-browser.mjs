// Local R5 acceptance: fresh public/ build, isolated Chrome CDP, no external writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8794/';
const out = process.argv[3] || '.core-local/evidence/r5-mission';
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
    await page.goto(base + 'world.html#mission=mission.sf.mobility', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-mission-run="mission.sf.mobility"]', { timeout: 90000 }).waitFor();
    const summary = await page.locator('[data-mission-run]').innerText();
    assert.match(summary, /data\/intelligence\/work.json/); checks++;
    assert.match(summary, /Pending; model review is not human approval/); checks++;
    assert.ok(await page.evaluate(() => { const el = document.querySelector('[data-mission-run]'); return el.scrollWidth <= el.clientWidth; })); checks++;
    await page.screenshot({ path: `${out}/${name}-mission.png` });
    // As a person does, point at the panel first: live refreshes then hold (R10) so the button does not move under the pointer.
    { const box = await page.locator('#ea-panel').boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + 40); }
    await page.locator('[data-mission-run] [data-urban=intelligence]').click();
    assert.match(await page.locator('#ea-panel').innerText(), /Recorded autonomous investigation|Agent investigations/); checks++;
    assert.match(await page.locator('#ea-panel').innerText(), /Folsom/); checks++;
    await page.screenshot({ path: `${out}/${name}-investigation.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); checks++;
    assert.deepEqual(errors, []); assert.deepEqual(writes, []); checks += 2;
    await context.close();
  }
} finally { await browser.close(); }
console.log(`${checks}/16 R5 browser checks passed`);
