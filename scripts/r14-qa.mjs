// R14 release QA: every public page at desktop, tablet and phone sizes — screenshot, horizontal overflow, page errors,
// layout shift, load weight, touch targets, keyboard focus visibility and sampled text contrast. Serve the repo first.
//   NODE_PATH=… node scripts/r14-qa.mjs   → .core-local/evidence/r14/{qa.json, <viewport>-<page>.png}
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PAGES } from './public-manifest.mjs';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.env.CORE_TEST_URL || 'http://core-public.test:8794/';
const out = process.env.CORE_TEST_EVIDENCE || '.core-local/evidence/r14';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--host-resolver-rules=MAP core-public.test 127.0.0.1', '--unsafely-treat-insecure-origin-as-secure=http://core-public.test:8794', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const VIEWPORTS = [['desktop', { width: 1440, height: 900 }], ['tablet', { width: 820, height: 1180 }], ['mobile', { width: 390, height: 844 }]];
const rows = [];
try {
  for (const [vp, viewport] of VIEWPORTS) {
    const context = await browser.newContext({ viewport, locale: 'en-US', hasTouch: vp !== 'desktop', deviceScaleFactor: 1 });
    await context.addInitScript(() => { globalThis.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) globalThis.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    for (const p of PAGES) {
      const page = await context.newPage();
      const errors = [], reqs = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('requestfinished', async r => { const s = await r.sizes().catch(() => null); reqs.push({ url: r.url(), bytes: s ? s.responseBodySize : 0 }); });
      page.on('requestfailed', r => { if (!/core-public\.test/.test(r.url())) return; errors.push('request failed: ' + r.url()); });
      const t0 = Date.now();
      await page.goto(base + p, { waitUntil: 'load' });
      const loadMs = Date.now() - t0;
      if (p === 'world.html') await page.waitForFunction(() => globalThis.CORE_EARTH?.state.ready && globalThis.CORE_EARTH?.state.urban, null, { timeout: 60000 });
      await page.waitForTimeout(p === 'world.html' ? 2500 : 1200);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(out, `${vp}-${p.replace('.html', '')}.png`) });
      const m = await page.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden]') && r.bottom > 0 && r.top < innerHeight * 3; };
        const ctrls = [...document.querySelectorAll('button, a[href], select, input:not([type=hidden]), summary, [role=button]')].filter(vis);
        // WCAG 2.2 target size (minimum) 24×24 CSS px; inline links inside running text are exempt.
        const small = ctrls.filter(el => { const r = el.getBoundingClientRect(); const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.parentElement?.closest('p, li, dd, td'); return !inline && (r.width < 24 || r.height < 24); })
          .map(el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`);
        const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
        const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.85 && !getComputedStyle(e).backgroundImage.includes('gradient')) return c; } return rgb(getComputedStyle(document.body).backgroundColor); };
        const low = [];
        for (const el of [...document.querySelectorAll('p, li, a, button, span, h1, h2, h3, label, dd, td, th, summary')].filter(vis).slice(0, 400)) {
          if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
          const s = getComputedStyle(el), fg = rgb(s.color); if ((fg[3] ?? 1) < 0.5 || +s.opacity < 0.5) continue;
          const bg = bgOf(el), a = fg[3] ?? 1, mix = fg.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a));
          const L1 = lum(mix), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05), large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
          if (ratio < (large ? 3 : 4.5)) low.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}`);
        }
        return { overflow: document.documentElement.scrollWidth - innerWidth, controls: ctrls.length, small, low, cls: +globalThis.__cls.toFixed(3), h1: !!document.querySelector('h1'), lang: document.documentElement.lang };
      });
      // Keyboard: the first Tab stops show a visible focus indicator.
      const focus = [];
      if (vp === 'desktop') for (let i = 0; i < 4; i++) {
        await page.keyboard.press('Tab');
        focus.push(await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return 'body'; const s = getComputedStyle(e); return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none' ? 'visible' : `INVISIBLE ${e.tagName} ${(e.innerText || '').slice(0, 20)}`; }));
      }
      const bytes = reqs.reduce((a, r) => a + r.bytes, 0), big = reqs.filter(r => r.bytes > 500e3).map(r => `${r.url.replace(base, '')} ${(r.bytes / 1e6).toFixed(1)}MB`);
      rows.push({ vp, page: p, loadMs, requests: reqs.length, mb: +(bytes / 1e6).toFixed(2), big, errors, focus: focus.filter(f => f.startsWith('INVISIBLE')), ...m });
      console.log(`${vp} ${p}: ${loadMs}ms ${reqs.length} req ${(bytes / 1e6).toFixed(1)}MB cls ${m.cls} overflow ${m.overflow} small ${m.small.length} lowContrast ${m.low.length} errors ${errors.length}${focus.some(f => f.startsWith('INVISIBLE')) ? ' FOCUS-INVISIBLE' : ''}`);
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(out, 'qa.json'), JSON.stringify(rows, null, 1));
