// Fresh axe + keyboard/focus checks, using existing Playwright and the separately pinned local axe test library.
// NODE_PATH=<existing Playwright modules> CORE_CDP_PORT=9241 node scripts/v99-phase2-accessibility.mjs [output.json] [page.html ...]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PAGES } from './public-manifest.mjs';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const axe = fs.readFileSync('.core-local/a11y-tools/node_modules/axe-core/axe.min.js', 'utf8');
const port = Number(process.env.CORE_CDP_PORT || 9241), base = process.env.CORE_TEST_URL || 'http://127.0.0.1:8790/';
assert.ok(port !== 9222 && ['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const only = process.argv.slice(3); assert.ok(only.every(p => PAGES.includes(p)));
const out = process.argv[2] || '.core-local/evidence/v99-phase2/accessibility.json';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const report = { at: new Date().toISOString(), browser: browser.version(), axe: '4.10.2', rows: [] };
const crises = { en: 'I want to end my life', fr: 'je veux mourir', es: 'quiero morir', de: 'Ich will mich umbringen', 'zh-CN': '我不想活了', pt: 'quero morrer' };
try {
  for (const code of ['en', 'fr', 'es', 'de', 'zh-CN', 'pt']) for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ locale: 'en-US', viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: 'reduce' });
    await ctx.addInitScript(code => { localStorage.setItem('core.lang', code); Object.defineProperty(navigator, 'gpu', { value: undefined }); }, code);
    const files = PAGES.filter(p => (!only.length || only.includes(p)) && (width === 1440 || ['world.html', 'commons.html', 'dialogue.html', 'avatar.html'].includes(p)));
    for (const file of files) {
      const page = await ctx.newPage(), row = { code, width, file, errors: [], keyboard: [], scans: [] };
      page.on('pageerror', e => row.errors.push(e.message));
      const check = (name, ok) => row.keyboard.push({ name, ok: !!ok });
      const scan = async state => {
        await page.evaluate(axe);
        const r = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }); return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, html: n.html, summary: n.failureSummary })) })), incomplete: r.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length })), passes: r.passes.map(v => v.id) }; });
        row.scans.push({ state, ...r });
      };
      try {
        await page.goto(new URL(file, base).href, { waitUntil: 'domcontentloaded' });
        if (file !== 'privacy.html') await page.locator('[data-lang]').waitFor();
        if (file === 'world.html') await page.waitForFunction(() => globalThis.CORE_EARTH?.state.ready && globalThis.CORE_INTELLIGENCE?.engine, null, { timeout: 45000 });
        await page.waitForTimeout(250);
        await page.keyboard.press('Tab');
        check('Tab reaches a visible focus target', await page.evaluate(() => document.activeElement !== document.body && document.activeElement.getClientRects().length > 0 && (getComputedStyle(document.activeElement).outlineStyle !== 'none' || document.activeElement.matches('input,select,textarea'))));
        await scan('page');
        if (file === 'world.html') {
          await page.locator('#ea-start').focus(); await page.keyboard.press('Enter');
          check('keyboard enters Explorer', await page.evaluate(() => CORE_EARTH.exploring));
          await page.locator('[data-ci-more]').focus(); await page.keyboard.press('Enter');
          check('keyboard opens settings', await page.locator('[data-ci-settings]').isVisible());
          await scan('Explorer settings');
          await page.locator('[data-ci-geocode]').focus(); await page.keyboard.press('Escape');
          check('Escape closes settings', !(await page.locator('[data-ci-settings]').isVisible()));
          check('Escape restores settings trigger focus', await page.locator('[data-ci-more]').evaluate(e => e === document.activeElement));
          await page.locator('[data-companion]').focus(); await page.keyboard.press('Enter');
          await page.waitForFunction(() => document.activeElement === document.querySelector('[data-ci-query]'));
          check('command shortcut focuses text input', await page.locator('[data-ci-query]').evaluate(e => e === document.activeElement));
          await page.waitForFunction(() => !!CORE_EARTH.civ());
          const requests = []; page.on('request', r => { if (r.url().includes(':11434')) requests.push(r.url()); });
          for (const [open, input, submit, status] of [['showInvestigate', '#inv-q', '#inv-form', '#inv-state'], ['showContribute', '#nt-text', '#nt-form', '#nt-state']]) {
            await page.evaluate(open => CORE_EARTH[open]('mission.sf.mobility'), open);
            await page.locator(input).fill(crises[code]); await page.locator(submit).evaluate(e => e.requestSubmit());
            const fixed = await page.evaluate(async code => (await import('/src/intelligence/core/safety.mjs')).crisisMessage(code), code);
            check(open + ' fixed crisis response', await page.locator(status).innerText() === fixed);
            check(open + ' clears crisis input', await page.locator(input).inputValue() === '');
            await scan(open + ' crisis response');
          }
          check('research crisis sends no model requests', requests.length === 0);
          const direct = await page.evaluate(async ({ code, q }) => { const C = await import('/src/civilization/client.mjs'), S = await import('/src/intelligence/core/safety.mjs'); try { await C.runInvestigation('mission.sf.mobility', q); return false; } catch (e) { return e.message === S.crisisMessage(code); } }, { code, q: crises[code] });
          check('direct research API refuses crisis', direct);
          check('research crisis not persisted', await page.evaluate(q => !JSON.stringify({ ...localStorage }).includes(q), crises[code]));
        }
        if (file === 'dialogue.html') {
          check('suggestions exposed as a named group', /^- group "/m.test(await page.locator('#dl-chips').ariaSnapshot()));
          await page.goto(new URL('dialogue.html#mission=mission.sf.mobility', base).href, { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => !!document.querySelector('#dl-form')?.onsubmit);
          await page.locator('#dl-input').fill(crises[code]); await page.locator('#dl-form').evaluate(e => e.requestSubmit());
          check('team dialogue fixed crisis response', await page.locator('#dl-convo').innerText().then(t => t.includes('findahelpline.com') && !t.includes(crises[code])));
          check('team dialogue clears input', await page.locator('#dl-input').inputValue() === '');
          await page.locator('#dl-convo').focus();
          check('conversation can receive keyboard focus', await page.locator('#dl-convo').evaluate(e => e === document.activeElement && getComputedStyle(e).outlineStyle !== 'none'));
          const bottom = await page.locator('#dl-convo').evaluate(e => { e.scrollTop = e.scrollHeight; return e.scrollTop; });
          if (bottom > 0) { await page.keyboard.press('PageUp'); await page.waitForTimeout(300); check('keyboard scrolls conversation', await page.locator('#dl-convo').evaluate((e, bottom) => e.scrollTop < bottom, bottom)); }
          check('team dialogue crisis not persisted', await page.evaluate(q => !JSON.stringify({ ...localStorage }).includes(q), crises[code]));
          await scan('team dialogue crisis response');
        }
        if (file === 'commons.html') {
          const trigger = page.locator('[data-companion]'); await trigger.focus(); await page.keyboard.press('Enter');
          await page.locator('dialog.cmp[open]').waitFor();
          check('dialog receives focus', await page.evaluate(() => document.querySelector('dialog.cmp').contains(document.activeElement)));
          for (let i = 0; i < 16; i++) { await page.keyboard.press(i < 8 ? 'Tab' : 'Shift+Tab'); check('modal prevents background control focus', await page.evaluate(() => document.querySelector('dialog.cmp').contains(document.activeElement) || (document.activeElement === document.body && !document.hasFocus()))); }
          await scan('companion dialog'); await page.keyboard.press('Escape');
          check('Escape closes dialog', await page.locator('dialog.cmp[open]').count() === 0);
          check('dialog restores trigger focus', await trigger.evaluate(e => e === document.activeElement));
        }
      } catch (e) { row.errors.push(e.message); }
      report.rows.push(row); fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); await page.close();
      console.log(code, width, file, row.scans.reduce((n, s) => n + s.violations.length, 0), 'axe violations', row.keyboard.filter(k => !k.ok).length, 'focus failures', row.errors.length, 'errors');
    }
    await ctx.close();
  }
} finally { await browser.close(); }
report.violations = report.rows.reduce((n, r) => n + r.scans.reduce((n, s) => n + s.violations.length, 0), 0);
report.failures = report.rows.reduce((n, r) => n + r.errors.length + r.keyboard.filter(k => !k.ok).length, 0);
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ rows: report.rows.length, violations: report.violations, failures: report.failures }));
process.exitCode = report.violations || report.failures ? 1 : 0;
