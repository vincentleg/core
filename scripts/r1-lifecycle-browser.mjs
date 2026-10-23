// Isolated CDP acceptance for the R1 contribution lifecycle in My CORE; start a fresh browser and local server first.
// The private demonstration idea is created through the real San Francisco tour, then followed in My CORE.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8796/';
const dir = process.argv[3] || '.core-local/evidence/r1-lifecycle';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9259));
const checks = [], errors = [];
const check = (name, value) => { checks.push({ name, pass: !!value }); assert.ok(value, name); };
async function run(label, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' }), writes = [];
  await context.addInitScript(() => localStorage.setItem('core.lang', 'en'));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  page.on('request', r => { if (!['GET', 'HEAD'].includes(r.method())) writes.push(`${r.method()} ${r.url()}`); });
  page.on('dialog', d => d.accept());
  await page.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#ea-demo-cta').click();
  await page.locator('.urban-tour').waitFor({ timeout: 90000 });
  await page.locator('[data-urban=next]').click(); await page.locator('[data-urban=next]').click();
  await page.locator('#urban-idea-form textarea').fill('Maybe test a different effective green ratio near Folsom Street, after obtaining real counts.');
  await page.locator('#urban-idea-form button').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('core.contrib.v1') || '[]').length === 1);
  await page.goto(base + 'me.html#contributions', { waitUntil: 'domcontentloaded' });
  const card = page.locator('[data-life]');
  await card.waitFor({ timeout: 30000 });
  const text = async () => card.innerText();
  check(`${label}: draft adopted into lifecycle`, /Draft/.test(await text()) && /History verified: 1 event/.test(await text()));
  check(`${label}: demonstration badge and local-step label`, /Demonstration/.test(await text()) && /local demonstration step, not an authenticated action/.test(await text()));
  check(`${label}: limitations and pending decisions visible`, /not calibrated/.test(await text()) && /Pending decisions/i.test(await text()));
  await page.locator('[data-life-submit] button').click();
  check(`${label}: consent required before submission`, await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('core.lifecycle.v1')).records)[0].state === 'DRAFT'));
  await page.locator('[data-life-submit] input[name=consent]').check();
  await page.locator('[data-life-submit] button').click();
  await page.waitForFunction(() => /History verified: 3 event/.test(document.querySelector('[data-life]')?.innerText || ''), null, { timeout: 15000 });
  const after = await text();
  check(`${label}: gate lists missing evidence`, /Needs evidence/.test(after) && /Authorized, observed traffic counts/.test(after) && /Official signal timing plans/.test(after) && /Independent expert review/.test(after));
  check(`${label}: reviews require an authenticated human`, /requires an authenticated human; none exists in CORE yet/.test(after));
  check(`${label}: external states unreachable`, /these states cannot be reached/.test(after) && !/data-life-submit/.test(await card.innerHTML()));
  check(`${label}: no network writes`, writes.length === 0);
  check(`${label}: no viewport overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${dir}/${label}-timeline.png`, fullPage: label === 'mobile' ? false : true });
  await card.screenshot({ path: `${dir}/${label}-timeline-card.png` });
  if (label === 'desktop') {
    // Tampering with stored history (forged transmission) locks the record instead of displaying it as progress.
    await page.evaluate(() => { const v = JSON.parse(localStorage.getItem('core.lifecycle.v1')), r = Object.values(v.records)[0]; r.events.at(-1).to = 'TRANSMITTED'; r.state = 'TRANSMITTED'; localStorage.setItem('core.lifecycle.v1', JSON.stringify(v)); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /failed verification/.test(document.querySelector('[data-life]')?.innerText || ''), null, { timeout: 15000 });
    check('tampered history locked', (await card.locator('[data-life-archive]').count()) === 0);
    await card.screenshot({ path: `${dir}/desktop-tampered-card.png` });
    await page.locator('[data-del]').click();
    await page.waitForFunction(() => !document.querySelector('[data-life]'));
    check('deleting the contribution deletes its history', await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('core.lifecycle.v1')).records).length === 0));
  }
  await context.close();
}
try {
  await run('desktop', { width: 1440, height: 1000 });
  await run('mobile', { width: 390, height: 844 });
  check('no browser page errors', errors.length === 0);
} finally {
  fs.writeFileSync(`${dir}/report.json`, JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
console.log(`${checks.length}/${checks.length} browser checks passed`);
