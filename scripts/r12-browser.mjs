// R12: capture the shipped public build at desktop and phone sizes, and exercise the R11 journey.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.env.CORE_TEST_URL || 'http://127.0.0.1:8794/';
const out = process.env.CORE_TEST_EVIDENCE || '.core-local/evidence/r12';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const findings = [];
try {
  for (const [name, viewport, reducedMotion] of [['desktop', { width: 1440, height: 900 }, 'no-preference'], ['mobile', { width: 390, height: 844 }, 'reduce']]) {
    const context = await browser.newContext({ viewport, reducedMotion, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    async function capture(route, label, ready) {
      await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded' });
      if (ready) await page.waitForFunction(ready, null, { timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(out, name + '-' + label + '.png') });
      const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.ok(width.scroll <= width.viewport + 1, name + ' ' + label + ' horizontal overflow: ' + JSON.stringify(width));
      findings.push({ name, label, ...width });
    }
    await capture('world.html', 'home', () => globalThis.CORE_EARTH?.state.ready && globalThis.CORE_EARTH?.state.urban);
    await page.locator('#ea-start').click();
    await page.waitForFunction(() => document.body.classList.contains('ea-explore'));
    await page.locator('#ea-hero').waitFor({ state: 'hidden', timeout: 10000 });
    await page.screenshot({ path: path.join(out, name + '-world.png') });
    await capture('solutions.html', 'solutions');
    await capture('plans.html', 'offers');
    await capture('me.html', 'my-core', () => !!globalThis.CORE_ME);
    await capture('business.html', 'business');
    await capture('world.html', 'demo-start', () => globalThis.CORE_EARTH?.state.ready && globalThis.CORE_EARTH?.state.urban);
    await page.locator('#ea-demo-cta').click();
    await page.locator('.urban-tour').waitFor({ timeout: 30000 });
    assert.match(await page.locator('#pp-title').innerText(), /Earth|Terre/);
    await page.waitForFunction(() => document.querySelector('.urban-tour')?.textContent.includes('3/8'), null, { timeout: 18000 });
    assert.match(await page.locator('#urban-idea-form textarea').inputValue(), /Fictional example|Exemple fictif/);
    await page.screenshot({ path: path.join(out, name + '-demo.png') });
    await page.waitForFunction(() => document.querySelector('.urban-tour')?.textContent.includes('8/8'), null, { timeout: 55000 });
    await page.locator('.urban-tour').waitFor({ state: 'hidden', timeout: 18000 });
    assert.equal(await page.evaluate(() => CORE_EARTH.state.layer.mode), 'agents');
    assert.equal(await page.locator('#ea-panel').isVisible(), false);
    await page.screenshot({ path: path.join(out, name + '-core-world.png') });
    await page.evaluate(() => CORE_DEMO.request());
    await page.locator('[data-urban=pause]').click();
    assert.match(await page.locator('.urban-tour').innerText(), /Paused|En pause/);
    await page.locator('[data-urban=pause]').click();
    assert.match(await page.locator('.urban-tour').innerText(), /Playing automatically|Lecture automatique/);
    await page.locator('[data-urban=next]').click();
    assert.match(await page.locator('#pp-title').innerText(), /geographic challenge|défi géographique/i);
    await page.locator('[data-urban=previous]').focus();
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#pp-title').innerText(), /Earth|Terre/);
    await page.locator('[data-urban=restart]').click();
    await page.locator('[data-urban=next]').focus();
    await page.keyboard.press('Tab');
    assert.match(await page.locator('.urban-tour').innerText(), /Paused|En pause/);
    await page.locator('[data-urban=end]').click();
    assert.equal(await page.locator('#ea-panel').isVisible(), false);
    assert.deepEqual(errors.filter(e => !/\.core-local\/civ\/state\.json/.test(e)), [], name + ' page errors');
    await context.close();
    console.log(name + ': six pages, screenshots, eight-step demo and CORE World handoff passed');
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(findings, null, 2));
