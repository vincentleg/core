// Supplemental local acceptance: synthetic GPU/model failure, actual namespace wipe, public research fallback.
// No model download, audio recording or production access. Use the same isolated browser as the Phase 2 scripts.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const port = Number(process.env.CORE_CDP_PORT || 9241), base = process.env.CORE_TEST_URL || 'http://127.0.0.1:8790/';
assert.ok(port !== 9222 && ['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`), rows = [];
const out = process.argv[2] || '.core-local/evidence/v99-phase4/acceptance.json';
const modelSource = fs.readFileSync('src/intelligence/core/browser-model.mjs', 'utf8');
const marker = 'export async function loadBrowserModel(';
assert.equal(modelSource.split(marker).length, 2);
const fixture = modelSource.slice(0, modelSource.indexOf(marker)) + 'export async function loadBrowserModel(){globalThis.acceptanceLoads=(globalThis.acceptanceLoads||0)+1;throw Error("Synthetic load failure");}';
try {
  for (const code of ['en', 'fr', 'es', 'de', 'zh-CN', 'pt']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    // Only the public-mode flag and heavy loader are fixtures; consent UI, capability selection and wipe are real code.
    await ctx.route('**/src/env.mjs', r => r.fulfill({ contentType: 'text/javascript', body: 'export const PUBLIC=true;' }));
    await ctx.route('**/src/intelligence/core/browser-model.mjs', r => r.fulfill({ contentType: 'text/javascript', body: fixture }));
    await ctx.addInitScript(code => {
      if (!sessionStorage.getItem('acceptance.seeded')) {
        localStorage.setItem('core.lang', code); localStorage.setItem('core.acceptance', 'synthetic-private-record');
        localStorage.setItem('acceptance.unrelated', 'keep'); sessionStorage.setItem('core.acceptance', 'synthetic-session');
        sessionStorage.setItem('acceptance.seeded', 'yes');
      }
      Object.defineProperty(navigator, 'gpu', { value: { requestAdapter: async () => ({ features: new Set(['shader-f16']), limits: { maxBufferSize: 1073741824 } }) } });
    }, code);
    const page = await ctx.newPage(), row = { code, checks: [], errors: [], externalRequests: [] };
    const check = (name, ok) => row.checks.push({ name, ok: !!ok });
    page.on('pageerror', e => row.errors.push(e.message));
    page.on('request', r => { if (/huggingface|hf\.co|raw\.githubusercontent|photon|:11434/.test(r.url())) row.externalRequests.push(r.url()); });
    try {
      await page.goto(new URL('world.html', base).href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => globalThis.CORE_EARTH?.state.ready && globalThis.CORE_INTELLIGENCE?.engine);
      await page.locator('#ea-start').click(); await page.locator('[data-ci-more]').click();
      await page.locator('[data-ci-enable-ai]').waitFor();
      check('no model load without consent despite GPU capability', await page.evaluate(() => !globalThis.acceptanceLoads && !localStorage.getItem('core.ai.consent')));
      await page.locator('[data-ci-enable-ai]').click();
      await page.waitForFunction(() => globalThis.acceptanceLoads === 1 && !localStorage.getItem('core.ai.consent'));
      check('explicit enable attempts load and failure clears consent', true);
      check('typing survives failed model load', await page.locator('[data-ci-query]').isEnabled());
      await page.keyboard.press('Escape');
      await page.evaluate(() => localStorage.setItem('core.ai.consent', 'Qwen3-1.7B-q4f16_1-MLC'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => globalThis.acceptanceLoads === 1 && !localStorage.getItem('core.ai.consent'));
      check('matching stored consent permits retry; failure revokes it', true);
      await page.waitForFunction(() => globalThis.CORE_EARTH?.civ());
      await page.evaluate(() => CORE_EARTH.showInvestigate('mission.sf.mobility'));
      await page.locator('#inv-q').fill('Compare the recorded evidence for this mission');
      await page.locator('#inv-form').evaluate(e => e.requestSubmit());
      const key = 'This public research tool does not use a language model. The evidence and simulation steps above ran in your browser; use “View a recorded run” to replay a local-model investigation. Optional on-device AI in Explorer is separate.';
      const french = JSON.parse(fs.readFileSync('scripts/i18n/catalog.json', 'utf8'))[key];
      const expected = await page.evaluate(async ([key, french]) => (await import('/src/i18n/i18n.mjs')).T(key, french), [key, french]);
      await page.waitForFunction(text => document.body.innerText.includes(text), expected, { timeout: 20000 });
      check('public research fallback uses scoped translated disclosure', true);
      await page.goto(new URL('commons.html#trust', base).href, { waitUntil: 'domcontentloaded' });
      await page.locator('#tr-wipe').waitFor();
      await page.evaluate(async () => { const c = await caches.open('acceptance-model-cache'); await c.put('/acceptance-synthetic-model', new Response('synthetic')); });
      page.once('dialog', d => d.accept().catch(e => row.errors.push(e.message)));
      await Promise.all([page.waitForEvent('domcontentloaded'), page.locator('#tr-wipe').click()]);
      check('wipe removes local/session synthetic CORE records and consent', await page.evaluate(() => !localStorage.getItem('core.acceptance') && !sessionStorage.getItem('core.acceptance') && !localStorage.getItem('core.ai.consent')));
      check('wipe preserves unrelated records and disclosed model-cache scope', await page.evaluate(async () => localStorage.getItem('acceptance.unrelated') === 'keep' && !!await (await caches.open('acceptance-model-cache')).match('/acceptance-synthetic-model')));
      check('no model, geocoder or loopback request escaped fixtures', row.externalRequests.length === 0);
    } catch (e) { row.errors.push(e.message); }
    rows.push(row); fs.writeFileSync(out, JSON.stringify({ rows }, null, 2) + '\n'); await ctx.close();
    console.log(code, row.checks.filter(c => !c.ok).length, 'failures', row.errors.length, 'errors');
  }
} finally { await browser.close(); }
assert.equal(rows.length, 6);
const failures = rows.reduce((n, r) => n + r.errors.length + r.checks.filter(c => !c.ok).length, 0);
fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), fixtures: ['GPU capability', 'loader failure', 'public-mode flag', 'synthetic records/cache'], rows, failures }, null, 2) + '\n');
process.exitCode = failures ? 1 : 0;
