// V9.9 public-build checks using the existing Playwright installation and an isolated Chrome you started.
// NODE_PATH=<existing modules> CORE_CDP_PORT=9241 node scripts/v99-phase1-browser.mjs
// No model downloads; model failure and microphone denial below are explicitly synthetic fixtures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PAGES } from './public-manifest.mjs';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const port = Number(process.env.CORE_CDP_PORT || 9241);
assert.ok(port !== 9222 && port > 1024 && port < 65536);
const base = process.env.CORE_TEST_URL || 'http://127.0.0.1:8790/';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const out = process.argv[2] || '.core-local/evidence/v99-phase1/browser.json';
const only = process.argv.slice(3); assert.ok(only.every(f => PAGES.includes(f)));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const report = { at: new Date().toISOString(), browser: browser.version(), base, checks: [], pages: [], fixtures: ['model unavailable', 'microphone permission denied'] };
const check = (name, ok, detail = '') => report.checks.push({ name, ok: !!ok, detail });
const crises = { en: 'I want to end my life', fr: 'je veux mourir', es: 'quiero morir', de: 'Ich will mich umbringen', 'zh-CN': '我不想活了', pt: 'quero morrer' };
const evidence = { en: 'What has this agent discovered?', fr: 'Qu’a découvert cet agent ?', es: '¿Qué ha descubierto este agente?', de: 'Was hat dieser Agent entdeckt?', 'zh-CN': '这个智能体发现了什么？', pt: 'O que este agente descobriu?' };
const ready = { 'world.html': 'CORE_INTELLIGENCE', 'dialogue.html': 'CORE_DIALOGUE', 'commons.html': 'CORE_COMMONS', 'manifesto.html': 'CORE_MANIFESTO', 'report.html': 'CORE_REPORT', 'progress.html': 'CORE_PROGRESS', 'avatar.html': 'CORE_STUDIO' };
try {
  for (const code of Object.keys(crises)) for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, locale: 'en-US', reducedMotion: 'reduce' });
    await ctx.addInitScript(code => { localStorage.setItem('core.lang', code); Object.defineProperty(navigator, 'gpu', { value: undefined }); }, code);
    for (const file of PAGES.filter(f => !only.length || only.includes(f))) {
      const page = await ctx.newPage(), tag = `${code}/${width}/${file}`, row = { tag, errors: [], missing: [], hosts: [], actions: [] };
      const hosts = new Set(); page.on('pageerror', e => row.errors.push(e.message));
      page.on('request', r => { if (/^https?:/.test(r.url())) hosts.add(new URL(r.url()).host); });
      try {
        const t = performance.now(), response = await page.goto(new URL(file, base).href, { waitUntil: 'domcontentloaded' });
        check(`${tag}: HTTP`, response.status() === 200, response.status());
        if (ready[file]) await page.waitForFunction(key => !!globalThis[key], ready[file], { timeout: 45000 });
        if (file !== 'privacy.html') await page.locator('[data-lang]').waitFor({ state: 'visible' });
        await page.waitForTimeout(400); row.readyMs = Math.round(performance.now() - t);
        check(`${tag}: language`, await page.evaluate(({ code, privacy }) => privacy ? !!document.querySelector(`section[lang="${code}"]`) : document.documentElement.lang === code, { code, privacy: file === 'privacy.html' }));
        if (file === 'world.html') {
          await page.waitForFunction(() => CORE_INTELLIGENCE.engine && CORE_EARTH.state.ready, null, { timeout: 60000 });
          await page.locator('#ea-start').click(); row.actions.push('Explore');
          await page.locator('[data-ci-more]').click();
          check(`${tag}: no-WebGPU fallback`, await page.evaluate(() => !navigator.gpu && !document.querySelector('[data-ci-enable-ai]')));
          await page.keyboard.press('Escape');
          await page.evaluate(async q => { await CORE_INTELLIGENCE.submit('Find an urban planning agent near Oakland.'); await CORE_INTELLIGENCE.submit(q); }, evidence[code]);
          check(`${tag}: actual agent evidence`, await page.evaluate(() => !!CORE_INTELLIGENCE.engine.state.agent && CORE_INTELLIGENCE.engine.state.events.some(e => e.tool === 'retrieve_evidence' && e.status === 'succeeded')));
          row.actions.push('agent search', 'agent selection', 'evidence');
          await page.evaluate(q => CORE_INTELLIGENCE.submit(q), crises[code]);
          check(`${tag}: crisis history`, await page.evaluate(q => !JSON.stringify(CORE_INTELLIGENCE.engine.state.history).includes(q), crises[code]));
          check(`${tag}: fixed safety label`, await page.locator('.ci-turn').last().locator('details').count() === 1);
          await page.evaluate(() => { globalThis.auditModelCalls = 0; CORE_INTELLIGENCE.engine.setModel(async () => { globalThis.auditModelCalls++; throw Error('<img src=x onerror=alert(1)>'); }); });
          await page.evaluate(() => CORE_INTELLIGENCE.submit('Explain the lifecycle of a star in detail.'));
          check(`${tag}: model failure falls back safely`, await page.evaluate(() => auditModelCalls > 0 && CORE_INTELLIGENCE.lastResult.mode === 'indexed-offline' && !!CORE_INTELLIGENCE.lastResult.text && !document.querySelector('.ci-turn img')));
          await page.evaluate(() => CORE_INTELLIGENCE.engine.setModel(null));
          await page.evaluate(() => {
            class Recognition { static async available() { return 'available'; } start() { this.onerror({ error: 'not-allowed' }); } abort() {} }
            Recognition.prototype.processLocally = true; globalThis.SpeechRecognition = Recognition;
            document.dispatchEvent(new CustomEvent('core:lang', { detail: document.documentElement.lang }));
          });
          await page.locator('[data-ci-mic]').waitFor({ state: 'visible' }); await page.locator('[data-ci-mic]').click();
          check(`${tag}: denied microphone keeps text input`, await page.locator('[data-ci-form] input').isEnabled()); row.actions.push('synthetic model failure', 'synthetic microphone denial');
          await page.locator('[data-ci-more]').click();
          await page.locator('[data-ci-reset]').click();
          await page.keyboard.press('Escape');
          for (const selector of ['#ea-problems-btn', '#ea-about-btn']) {
            const button = page.locator(selector); if (await button.isVisible()) { await button.click(); row.actions.push(selector); }
          }
        }
        if (file === 'dialogue.html') {
          await page.locator('#dl-input').fill(crises[code]); await page.locator('#dl-form [type=submit]').click();
          await page.waitForTimeout(200);
          check(`${tag}: dialogue crisis input not retained`, !(await page.locator('#dl-convo').innerText()).includes(crises[code])); row.actions.push('dialogue crisis');
        }
        if (file === 'commons.html') for (const section of ['vault', 'knowledge', 'experts', 'communities', 'trust']) {
          await page.goto(new URL(`commons.html#${section}`, base).href, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(350); row.actions.push(`menu: ${section}`);
          check(`${tag}: ${section} section`, await page.evaluate(section => CORE_COMMONS.state.tab === section && document.querySelector('#cm-body').textContent.trim().length > 10, section));
        }
        // Exercise rendered tabs, disclosures and the mobile navigation without saving, sharing or deleting content.
        const tabs = page.locator('[role=tab]');
        for (let i = 0; i < Math.min(await tabs.count(), 8); i++) if (await tabs.nth(i).isVisible()) { await tabs.nth(i).click(); row.actions.push('tab'); }
        const disclosures = page.locator('details:not([open]) > summary');
        for (const summary of (await disclosures.all()).slice(0, 6)) if (await summary.isVisible()) { await summary.click(); row.actions.push('disclosure'); }
        if (file !== 'privacy.html') {
          const select = page.locator('[data-lang]');
          await select.selectOption(code === 'en' ? 'fr' : 'en'); await select.selectOption(code);
          await page.waitForTimeout(150); check(`${tag}: language switch`, await page.evaluate(code => document.documentElement.lang === code, code)); row.actions.push('language selector');
          row.missing = await page.evaluate(async () => (await import('./src/i18n/i18n.mjs')).missing());
          check(`${tag}: catalogued translations`, row.missing.length === 0, row.missing);
        }
        const dom = await page.evaluate(() => {
          const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
          const controls = [...document.querySelectorAll('button, input:not([type=hidden]), select, textarea, [role=button]')].filter(visible);
          const unnamed = controls.filter(el => !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.labels?.length || el.textContent.trim() || el.getAttribute('title'))).map(el => el.outerHTML.slice(0, 180));
          return { overflow: document.documentElement.scrollWidth - innerWidth, unnamed, unlabeledImages: [...document.querySelectorAll('img:not([alt])')].filter(visible).length, h1: document.querySelectorAll('h1').length };
        });
        check(`${tag}: no horizontal overflow`, dom.overflow <= 1, dom.overflow);
        check(`${tag}: control names`, dom.unnamed.length === 0, dom.unnamed);
        check(`${tag}: image alternatives`, dom.unlabeledImages === 0);
        await page.keyboard.press('Tab');
        check(`${tag}: keyboard focus`, await page.evaluate(() => document.activeElement !== document.body));
        const cdp = await ctx.newCDPSession(page); const ax = await cdp.send('Accessibility.getFullAXTree');
        check(`${tag}: accessibility tree`, ax.nodes.some(n => n.role?.value === 'RootWebArea' && !!n.name?.value)); await cdp.detach();
        check(`${tag}: no page exceptions`, row.errors.length === 0, row.errors);
        row.hosts = [...hosts];
        check(`${tag}: no unsolicited model/geocoder/local requests`, !row.hosts.some(h => /huggingface|hf\.co|raw\.githubusercontent|photon|11434|8788/.test(h)), row.hosts);
      } catch (e) { check(`${tag}: completed`, false, e.message); }
      report.pages.push(row); await page.close();
      fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
      console.log(tag, report.checks.filter(c => c.name.startsWith(tag) && !c.ok).length, 'failures');
    }
    await ctx.close();
  }
} finally {
  report.pass = report.checks.filter(c => c.ok).length; report.fail = report.checks.length - report.pass;
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  // Disconnect from this isolated instance; do not close the browser used by the other serial audits.
  await browser.close();
}
console.log(JSON.stringify({ pass: report.pass, fail: report.fail, pages: report.pages.length, out }));
process.exitCode = report.fail ? 1 : 0;
