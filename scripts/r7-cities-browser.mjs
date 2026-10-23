// Local R7 acceptance: independent city case and scenario choice from recorded data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8794/';
const out = process.argv[3] || '.core-local/evidence/r7-cities';
fs.mkdirSync(out, { recursive: true });
const recorded = JSON.parse(fs.readFileSync('data/mobility/results.json', 'utf8'));
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9254));
let checks = 0;
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('core.lang', 'en'));
    const page = await context.newPage(), errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
    await page.goto(base + 'city.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#city-scenario').waitFor();
    assert.match(await page.locator('#city-main').innerText(), /Independent CORE research demonstration/); checks++;
    assert.match(await page.locator('#city-main').innerText(), /synthetic fixture, no real participant/); checks++;
    await page.locator('#city-scenario').selectOption('C');
    const c = recorded.scenarios.find(s => s.id === 'C');
    assert.match(await page.locator('#city-main').innerText(), new RegExp(`Modelled car delay: ${Math.round(c.summary.carDelay.mean)} s`)); checks++;
    assert.match(await page.locator('#city-main').innerText(), /Blocked for real-world use/); checks++;
    assert.equal(await page.locator('a[href="world.html#sim=C"]').count(), 1); checks++;
    assert.equal(await page.locator('a[href="report.html#mission=mission.sf.mobility"]').count(), 1); checks++;
    await page.locator('#city-main h1').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/${name}-city.png` });
    await page.locator('.business-card').last().screenshot({ path: `${out}/${name}-decision.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); checks++;
    assert.deepEqual(errors, []); assert.deepEqual(writes, []); checks += 2;
    await context.close();
  }
  const blocked = await browser.newContext();
  await blocked.route('**/data/mobility/results.json', route => route.abort());
  const unavailable = await blocked.newPage();
  await unavailable.goto(base + 'city.html', { waitUntil: 'domcontentloaded' });
  await unavailable.getByText(/City case unavailable|Cas municipal indisponible/).waitFor();
  assert.equal(await unavailable.locator('#city-scenario').count(), 0); checks++;
  await blocked.close();
} finally { await browser.close(); }
console.log(`${checks}/19 R7 browser checks passed`);
