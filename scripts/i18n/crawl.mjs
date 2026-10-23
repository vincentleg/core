// Real-browser i18n crawl: loads every published page in a dictionary language and records (1) the exact English/French
// pairs of static HTML (data-fr*) and (2) every rendered string that no dictionary entry or template covers, while
// exercising the main journeys. Output: scripts/i18n/crawled.json (identity-seeded run) or a missing-strings report.
//   CORE_TEST_URL=http://127.0.0.1:8790/ NODE_PATH=… node scripts/i18n/crawl.mjs [--report <lang>]
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { PAGES } from '../public-manifest.mjs';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.env.CORE_TEST_URL || 'http://127.0.0.1:8790/', report = process.argv.includes('--report') ? process.argv[process.argv.indexOf('--report') + 1] : null;
const code = report || 'es', seed = report ? null : Object.fromEntries(Object.keys(JSON.parse(fs.readFileSync('scripts/i18n/catalog.json', 'utf8'))).map(k => [k, k]));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--ignore-gpu-blocklist'] });
const pairs = {}, missing = new Set(), errors = [];
async function page(path, act) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  if (seed) await ctx.route(`**/src/i18n/locales/${code}.json`, r => r.fulfill({ json: seed }));
  await ctx.addInitScript(c => { try { localStorage.setItem('core.lang', c); } catch {} }, code);
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(`${path}: ${e.message}`));
  await p.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded' });
  await p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(1500);
  if (act) await act(p).catch(e => errors.push(`${path} action: ${e.message}`));
  await p.waitForTimeout(600);
  const got = await p.evaluate(async () => {
    const I = await import('./src/i18n/i18n.mjs'); const out = {};
    for (const el of document.querySelectorAll('[data-fr]')) out[el.dataset.en ?? el.innerHTML.trim()] = el.dataset.fr;
    for (const [attr, d, e] of [['placeholder', 'frPh', 'enPh'], ['aria-label', 'frLabel', 'enLabel'], ['title', 'frTitle', 'enTitle'], ['content', 'frContent', 'enContent']]) for (const el of document.querySelectorAll(`[data-fr-${{ frPh: 'ph', frLabel: 'label', frTitle: 'title', frContent: 'content' }[d]}]`)) out[el.dataset[e] ?? el.getAttribute(attr)] = el.dataset[d];
    return { pairs: out, missing: I.missing() };
  });
  Object.assign(pairs, got.pairs); got.missing.forEach(m => missing.add(m)); await ctx.close();
  console.log(path, Object.keys(got.pairs).length, 'pairs', got.missing.length, 'missing');
}
const click = async (p, sel) => { const l = p.locator(sel).first(); if (await l.count() && await l.isVisible()) { await l.click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(700); } };
// privacy.html runs no script (script-src 'none'): its six languages are hand-written sections, not dictionary text.
for (const path of PAGES.filter(p => p !== 'privacy.html')) {
  if (path !== 'world.html') { await page(path, async p => { for (const s of await p.locator('details:not([open]) > summary').all()) await s.click().catch(() => {}); for (const t of (await p.locator('[role=tab], .tabs button, nav.sub button').all()).slice(0, 12)) { await t.click().catch(() => {}); await p.waitForTimeout(300); } }); continue; }
  await page(path, async p => {
    await p.waitForFunction(() => globalThis.CORE_EARTH?.state.ready && globalThis.CORE_INTELLIGENCE?.engine, null, { timeout: 60000 });
    await click(p, '#ea-status-btn'); await click(p, '#ea-status [data-close]'); await click(p, '#ea-start'); await p.waitForTimeout(1500);
    for (const q of ['Take me to Folsom Street in San Francisco.', 'Find an urban planning agent near Oakland.', 'What has this agent discovered?', 'Show me the transportation agents here.', 'Which of these agents has completed an investigation?', 'Why would I pay $12 for CORE Plus?', 'Are all 500 agents thinking right now?', 'Show me completed investigations.', 'Show me the sources.', 'Take me to Mission Street in San Francisco.', 'Explain photosynthesis']) { await p.evaluate(q => CORE_INTELLIGENCE.submit(q), q); await p.waitForTimeout(400); }
    await click(p, '[data-ci-more]'); await click(p, '[data-ci-more]');
    for (const l of ['agents', 'hybrid', 'real']) { await click(p, `[data-layer=${l}]`); await click(p, '#ea-layer-help'); }
    await click(p, '#ea-problems-btn'); await click(p, '#ea-list-ul button'); await click(p, '#ea-about-btn');
    await click(p, '#ea-noticed-btn');
    await p.evaluate(() => CORE_DEMO.request()); await p.locator('[data-urban=next]').waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    for (let i = 0; i < 6; i++) await click(p, '[data-urban=next]');
    await click(p, '[data-urban=end]');
  });
}
await browser.close();
if (report) { fs.writeFileSync(`scripts/i18n/missing-${code}.json`, JSON.stringify([...missing].sort(), null, 1)); console.log(`${missing.size} missing strings in ${code}; ${errors.length} page errors`, errors.slice(0, 8)); }
else { const out = { ...pairs }; for (const m of missing) if (!(m in out)) out[m] = null; fs.writeFileSync('scripts/i18n/crawled.json', JSON.stringify(out, null, 1)); console.log(`crawl: ${Object.keys(pairs).length} HTML pairs, ${missing.size} unextracted strings; ${errors.length} page errors`, errors.slice(0, 8)); }
