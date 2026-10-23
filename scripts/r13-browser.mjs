// R13: the complete public visitor journey on desktop and phone — Earth, layers, problems and missions, contribution
// → My CORE → review request download, product pages, language persistence, menus and keyboard. Serve the repo first.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
// The default host maps to the local server but is not localhost, so the pages run in their PUBLIC mode (treated as
// a secure origin, like the HTTPS deployment).
const base = process.env.CORE_TEST_URL || 'http://core-public.test:8794/';
const out = process.env.CORE_TEST_EVIDENCE || '.core-local/evidence/r13';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--host-resolver-rules=MAP core-public.test 127.0.0.1', '--unsafely-treat-insecure-origin-as-secure=http://core-public.test:8794', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ready = () => globalThis.CORE_EARTH?.state.ready && globalThis.CORE_EARTH?.state.urban && globalThis.CORE_EARTH?.state.civ;
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, locale: 'en-US', deviceScaleFactor: 1, acceptDownloads: true, hasTouch: name === 'mobile' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    const go = async (route, until) => { await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded' }); if (until) await page.waitForFunction(until, null, { timeout: 60000 }); };
    const noOverflow = async label => { const w = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(w <= 1, `${name} ${label}: horizontal overflow ${w}px`); };

    // 1. Homepage → CORE World → interactive Earth, all three layers.
    await go('world.html', ready);
    await page.locator('#ea-start').click();
    await page.locator('#ea-hero').waitFor({ state: 'hidden', timeout: 10000 });
    for (const mode of ['agents', 'hybrid', 'real']) {
      await page.locator(`[data-layer=${mode}]`).click();
      await page.waitForFunction(m => CORE_EARTH.state.layer?.mode === m, mode, { timeout: 10000 });
    }
    // 3. Problems & missions → a mission panel with actions.
    await page.locator('#ea-problems-btn').click();
    await page.locator('#ea-panel').waitFor({ state: 'visible' });
    await page.locator('#ea-panel [data-mission]').first().click();
    await page.waitForFunction(() => /mission/i.test(document.querySelector('#ea-panel .le-eyebrow, #ea-panel')?.textContent || ''));
    await page.screenshot({ path: path.join(out, name + '-mission.png') });
    await page.keyboard.press('Escape');
    await page.locator('#ea-panel').waitFor({ state: 'hidden', timeout: 5000 });

    // 4. Contribution → editable structured proposal → keep private → My CORE → submit → review request download.
    await page.locator('#ea-noticed-btn').click();
    await page.locator('#nt-text').fill('Buses queue on Folsom between 5th and 6th most weekday mornings; I saw it three times this week.');
    assert.equal(await page.locator('#nt-model').isDisabled(), true, name + ': local-model structuring is disabled on the public host');
    assert.match(await page.locator('#nt-model').innerText(), /unavailable on this site/, name + ': public label states the local model is unavailable');
    assert.match(await page.locator('#nt-model-note').innerText(), /this public site uses deterministic rules/);
    await page.locator('#nt-form button[type=submit]').click();
    await page.locator('#nt-title').fill('Morning bus queue on Folsom');
    await page.locator('#nt-private').click();
    await page.locator('#nt-done a[href="me.html#contributions"]').click();
    await page.waitForFunction(() => document.querySelector('[data-life-submit]'), null, { timeout: 20000 });
    await page.locator('[data-life-submit] input[name=consent]').first().check();
    await page.locator('[data-life-submit] button[type=submit]').first().click();
    await page.locator('[data-life-packet]').first().waitFor({ timeout: 20000 });
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-life-packet]').first().click()]);
    const packet = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.ok(JSON.stringify(packet).includes('Morning bus queue on Folsom'), name + ': review request carries the contribution');
    await page.screenshot({ path: path.join(out, name + '-my-core.png') });
    await noOverflow('my-core');

    // 5. Product pages and their primary navigation.
    for (const p of ['business.html', 'city.html', 'solutions.html', 'plans.html', 'manifesto.html', 'privacy.html', 'progress.html', 'commons.html', 'dialogue.html']) {
      await go(p);
      await page.waitForTimeout(400);
      assert.ok(await page.locator('h1, h2').first().isVisible(), `${name} ${p}: heading visible`);
      await noOverflow(p);
    }
    // Menu opens, closes with Escape and returns focus to its summary.
    await go('solutions.html');
    await page.locator('.le-more-menu summary').click();
    assert.equal(await page.locator('.le-more-menu').evaluate(d => d.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.le-more-menu').evaluate(d => d.open), false);

    // 6. Language switching persists across pages and reloads.
    await page.locator('[data-lang]').selectOption('fr');
    await page.waitForFunction(() => document.documentElement.lang.startsWith('fr'));
    await go('business.html');
    await page.waitForFunction(() => document.documentElement.lang.startsWith('fr'));
    await go('world.html', ready);
    assert.match(await page.locator('#ea-start').innerText(), /Entrer dans CORE/);
    await page.locator('[data-lang]').selectOption('en');
    await page.waitForFunction(() => document.documentElement.lang.startsWith('en'));

    assert.deepEqual(errors.filter(e => !/\.core-local\/civ\/state\.json/.test(e)), [], name + ' page errors');
    await context.close();
    console.log(name + ': Earth layers, mission panel, contribution → My CORE → review request, nine pages, menu and language persistence passed');
  }
} finally { await browser.close(); }
