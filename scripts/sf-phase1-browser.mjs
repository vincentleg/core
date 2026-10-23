// Isolated CDP acceptance for the public San Francisco journey; start a fresh browser and local server first.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8796/';
const dir = process.argv[3] || '.core-local/evidence/sf-phase1';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9259));
const checks = [], errors = [], metrics = {};
const check = (name, value) => { checks.push({ name, pass: !!value }); assert.ok(value, name); };
async function journey(label, viewport, writeIdea) {
  const started = Date.now(), writes = [];
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('core.lang', 'en'));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  page.on('request', r => { if (!['GET', 'HEAD'].includes(r.method())) writes.push(`${r.method()} ${r.url()}`); });
  await page.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#ea-demo-cta').click();
  await page.locator('.urban-tour').waitFor({ timeout: 90000 });
  await page.screenshot({ path: `${dir}/${label}-entry.png` });
  metrics[label] = { viewport, readyMs: Date.now() - started };
  check(`${label}: Real Earth entry`, (await page.locator('#pp-title').innerText()).includes('San Francisco'));
  await page.locator('[data-urban=next]').click();
  check(`${label}: sourced local question`, (await page.locator('#ea-panel').innerText()).includes('DataSF'));
  await page.locator('[data-urban=next]').click();
  await page.locator('#urban-idea-form').waitFor();
  if (writeIdea) {
    await page.locator('#urban-idea-form textarea').fill('I want to kill myself');
    await page.locator('#urban-idea-form button').click();
    check(`${label}: crisis text refused without storage`, await page.evaluate(() => !localStorage.getItem('core.contrib.v1')));
    await page.locator('#urban-idea-form textarea').fill('Maybe test a different effective green ratio near Folsom Street, after obtaining real counts.');
    await page.locator('#urban-idea-form button').click();
    check(`${label}: private demonstration status`, (await page.locator('#ea-panel').innerText()).includes('demonstration draft'));
    check(`${label}: marked browser record`, await page.evaluate(() => JSON.parse(localStorage.getItem('core.contrib.v1') || '[]').some(x => x.demonstration && x.state === 'private' && x.sharedAs === null)));
    check(`${label}: no network writes from demo idea`, writes.length === 0);
  }
  await page.screenshot({ path: `${dir}/${label}-idea.png` });
  await page.locator('[data-urban=next]').click();
  check(`${label}: recorded agents distinguished`, (await page.locator('#ea-panel').innerText()).includes('did not analyse your text'));
  await page.locator('[data-urban=next]').click();
  check(`${label}: bounded scenario inputs`, await page.locator('#urban-form input').count() > 0);
  if (writeIdea) {
    await page.locator('#urban-form button[type=submit]').click();
    await page.waitForFunction(() => document.querySelector('#pp-title')?.textContent?.includes('Calculated outcomes'), null, { timeout: 30000 });
  } else await page.locator('[data-urban=next]').click();
  check(`${label}: verified scenario comparison`, await page.locator('.urban-table tbody tr').count() >= 2);
  await page.screenshot({ path: `${dir}/${label}-scenarios.png` });
  await page.locator('[data-urban=next]').click();
  check(`${label}: human review boundary`, (await page.locator('#ea-panel').innerText()).includes('No decision or external transmission occurred'));
  check(`${label}: no viewport overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${dir}/${label}-review.png` });
  if (writeIdea) {
    await page.locator('a[href="me.html#contributions"]').click();
    await page.waitForURL(/me\.html/);
    try { await page.waitForFunction(() => document.body.innerText.includes('Demonstration idea'), null, { timeout: 20000 }); }
    catch { metrics[label].historyReload = true; await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => document.body.innerText.includes('Demonstration idea'), null, { timeout: 60000 }); }
    check(`${label}: contribution history`, (await page.locator('body').innerText()).includes('Demonstration idea'));
    await page.screenshot({ path: `${dir}/${label}-history.png` });
  }
  metrics[label].journeyMs = Date.now() - started;
  await context.close();
}
try {
  await journey('desktop', { width: 1440, height: 1000 }, true);
  await journey('mobile', { width: 390, height: 844 }, false);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`regression: ${e.message}`));
  await page.goto(base + 'me.html', { waitUntil: 'domcontentloaded' });
  check('founder workspace route remains available', await page.locator('a[href="#founder-account"]').count() === 1);
  await context.close();
  check('no browser page errors', errors.length === 0);
} finally {
  fs.writeFileSync(`${dir}/report.json`, JSON.stringify({ checks, errors, metrics }, null, 2));
  await browser.close();
}
console.log(`${checks.length}/${checks.length} browser checks passed`);
