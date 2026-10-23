// Remaining acceptance gaps: 320-CSS-pixel reflow and Dialogue's tab/radio keyboard contracts.
// A reserved HTTPS origin is fulfilled only from our loopback public build: real PUBLIC code, no hosting claim.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PAGES } from './public-manifest.mjs';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const port = Number(process.env.CORE_CDP_PORT || 9241), source = process.env.CORE_TEST_URL || 'http://127.0.0.1:8790/';
assert.ok(port !== 9222 && ['localhost', '127.0.0.1'].includes(new URL(source).hostname));
const base = 'https://core-acceptance.invalid/', browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const out = process.argv[2] || '.core-local/evidence/v99-phase5/browser.json';
const axe = fs.readFileSync('.core-local/a11y-tools/node_modules/axe-core/axe.min.js', 'utf8');
const report = { browser: browser.version(), at: new Date().toISOString(), originFixture: base, rows: [] };
try {
  for (const code of ['en', 'fr', 'es', 'de', 'zh-CN', 'pt']) {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' });
    await ctx.route(base + '**', async route => {
      const u = new URL(route.request().url());
      const response = await ctx.request.get(new URL(u.pathname + u.search, source).href);
      await route.fulfill({ response });
    });
    await ctx.addInitScript(code => localStorage.setItem('core.lang', code), code);
    for (const file of PAGES) {
      const page = await ctx.newPage(), row = { code, file, width: 320, checks: [], errors: [], forbiddenRequests: [] };
      page.on('pageerror', e => row.errors.push(e.message));
      page.on('request', r => { if (/huggingface|hf\.co|raw\.githubusercontent|photon|:11434|\/api\/intelligence|\/\.core-local\//.test(r.url())) row.forbiddenRequests.push(r.url()); });
      const check = (name, ok) => row.checks.push({ name, ok: !!ok });
      try {
        await page.goto(base + file, { waitUntil: 'domcontentloaded' });
        if (file !== 'privacy.html') await page.locator('[data-lang]').waitFor();
        if (file === 'world.html') await page.waitForFunction(() => globalThis.CORE_EARTH?.state.ready && globalThis.CORE_INTELLIGENCE?.engine);
        await page.waitForTimeout(350);
        row.overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        check('320 CSS pixel root reflow', row.overflow <= 1);
        check('language retained', await page.evaluate(({ code, privacy }) => privacy ? !!document.querySelector(`section[lang="${code}"]`) : document.documentElement.lang === code, { code, privacy: file === 'privacy.html' }));
        if (file !== 'privacy.html') {
          check('real non-loopback PUBLIC code path', await page.evaluate(async () => (await import('/src/env.mjs')).PUBLIC));
          check('header controls fit viewport', await page.locator('#core-nav .mark,#core-nav [data-companion],#core-nav [data-demo],#core-nav [data-lang],#core-nav summary').evaluateAll(es => es.every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; })));
          const more = page.locator('#core-nav .le-more-menu > summary'); await more.focus(); await page.keyboard.press('Enter');
          check('keyboard opens More menu within viewport', await page.locator('#core-nav .le-more-menu').evaluate(e => e.open && [...e.querySelectorAll('a')].every(a => { const r = a.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; })));
          await page.keyboard.press('Enter');
          check('keyboard closes More menu', await page.locator('#core-nav .le-more-menu').evaluate(e => !e.open));
        }
        if (file === 'world.html') {
          row.capability = await page.evaluate(async () => (await import('/src/intelligence/core/browser-model.mjs')).browserAICapability());
          row.dictation = await page.evaluate(async code => (await import('/src/ui/dictation.mjs')).dictationSupport(code), code);
          check('no unsolicited AI consent', await page.evaluate(() => !localStorage.getItem('core.ai.consent')));
        }
        if (file === 'dialogue.html') for (const width of [320, 1440]) for (const team of [false, true]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(base + file + (team ? '#mission=mission.sf.mobility' : ''), { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => !!globalThis.CORE_DIALOGUE);
          const tag = `${width}/${team ? 'team' : 'room'}`, tabs = page.locator('[role=tab][data-side]');
          await tabs.first().focus();
          for (const [key, index] of [['ArrowRight', 1], ['ArrowLeft', 0], ['ArrowLeft', 2], ['ArrowRight', 0], ['End', 2], ['Home', 0]]) {
            await page.keyboard.press(key);
            check(tag + ' tab ' + key, await tabs.nth(index).evaluate(e => e === document.activeElement && e.getAttribute('aria-selected') === 'true' && e.tabIndex === 0));
            check(tag + ' one tab stop and named active panel', await page.evaluate(() => {
              const tabs = [...document.querySelectorAll('[role=tab][data-side]')], active = tabs.find(e => e.getAttribute('aria-selected') === 'true'), panel = document.querySelector('#dl-side');
              return tabs.filter(e => e.tabIndex === 0).length === 1 && panel.getAttribute('aria-labelledby') === active.id && active.getAttribute('aria-controls') === panel.id;
            }));
          }
          await page.keyboard.press('Tab');
          check(tag + ' Tab reaches named panel', await page.locator('#dl-side').evaluate(e => e === document.activeElement));
          check(tag + ' panel exposed with accessible name', /^- tabpanel "/m.test(await page.locator('#dl-side').ariaSnapshot()));
          if (!team) {
            const radios = page.locator('.dl-mode [role=radio]'); await radios.first().focus();
            for (const [key, index] of [['ArrowRight', 1], ['ArrowDown', 0], ['ArrowUp', 1], ['ArrowLeft', 0], ['End', 1], ['Home', 0]]) {
              await page.keyboard.press(key);
              check(tag + ' radio ' + key, await radios.nth(index).evaluate(e => e === document.activeElement && e.getAttribute('aria-checked') === 'true' && e.tabIndex === 0));
            }
            check(tag + ' one radio tab stop', await radios.evaluateAll(es => es.filter(e => e.tabIndex === 0).length === 1));
          }
          await page.evaluate(axe);
          const a = await page.evaluate(async () => {
            const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
            return { violations: r.violations, incomplete: r.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length })) };
          });
          (row.scans ||= []).push({ tag, ...a }); check(tag + ' axe', a.violations.length === 0);
        }
        check('no model/geocoder/local-worker request', row.forbiddenRequests.length === 0);
      } catch (e) { row.errors.push(e.message); }
      report.rows.push(row); fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); await page.close();
      console.log(code, file, row.checks.filter(c => !c.ok).length, 'failures', row.errors.length, 'errors');
    }
    await ctx.close();
  }
} finally { await browser.close(); }
assert.equal(report.rows.length, 66);
report.checks = report.rows.reduce((n, r) => n + r.checks.length, 0);
report.failures = report.rows.reduce((n, r) => n + r.errors.length + r.checks.filter(c => !c.ok).length, 0);
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); process.exitCode = report.failures ? 1 : 0;
