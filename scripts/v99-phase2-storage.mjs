// Fresh isolated-browser regression for denied Storage access. No real visitor data is read.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const port = Number(process.env.CORE_CDP_PORT || 9241), base = process.env.CORE_TEST_URL || 'http://127.0.0.1:8790/';
assert.ok(port !== 9222 && ['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`), rows = [];
try {
  for (const code of ['en', 'fr', 'es', 'de', 'zh-CN', 'pt']) {
    const ctx = await browser.newContext({ locale: code, viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { get() { throw new DOMException('Storage denied', 'SecurityError'); } });
      Object.defineProperty(navigator, 'gpu', { value: undefined });
    });
    for (const file of ['world.html', 'avatar.html', 'commons.html']) {
      const page = await ctx.newPage(), row = { code, file, errors: [], checks: [] };
      page.on('pageerror', e => row.errors.push(e.message));
      try {
        await page.goto(new URL(file, base).href, { waitUntil: 'domcontentloaded' });
        await page.locator('[data-lang]').waitFor();
        if (file === 'world.html') await page.waitForFunction(() => CORE_EARTH?.state.ready && CORE_INTELLIGENCE?.engine, null, { timeout: 45000 });
        await page.locator('[data-lang]').selectOption(code === 'en' ? 'fr' : 'en');
        await page.locator('[data-lang]').selectOption(code);
        await page.waitForFunction(code => document.documentElement.lang === code, code);
        row.checks.push({ name: 'language remains usable without persistent storage', ok: true });
      } catch (e) { row.errors.push(e.message); }
      rows.push(row); await page.close(); console.log(code, file, row.errors.length, 'errors');
    }
    await ctx.close();
  }
} finally { await browser.close(); }
const failures = rows.reduce((n, r) => n + r.errors.length, 0);
assert.equal(rows.length, 18);
fs.writeFileSync(process.argv[2] || '.core-local/evidence/v99-phase2/storage-browser.json', JSON.stringify({ at: new Date().toISOString(), browser: browser.version(), rows, failures }, null, 2) + '\n');
process.exitCode = failures ? 1 : 0;
