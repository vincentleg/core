// Isolated CDP acceptance for R3 failure states: essential files are blocked by request interception in this browser
// only (no production service, no server change), and the visitor must see a named, honest state.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8796/';
const dir = process.argv[3] || '.core-local/evidence/r3-robustness';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9259));
const checks = [], errors = [];
const check = (name, value) => { checks.push({ name, pass: !!value }); assert.ok(value, name); };
async function page(block, label) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('core.lang', 'en'));
  const p = await context.newPage();
  p.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  for (const f of block) await p.route(`**/${f}*`, r => r.abort('connectionreset'));
  return { context, p };
}
const boot = p => p.evaluate(() => { const b = document.querySelector('.le-boot'); return b ? { role: b.getAttribute('role'), text: b.innerText } : null; });
try {
  // 1. Command-bar data missing: the map starts, a non-blocking notice names the file.
  { const { context, p } = await page(['data/intelligence/work.json'], 'work');
    await p.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelector('.le-boot')?.innerText.includes('Started with a problem'), null, { timeout: 60000 });
    const b = await boot(p); fs.writeFileSync(`${dir}/work-boot.json`, JSON.stringify(b));
    check('degraded start is a status, not a fatal alert', b.role === 'status' && /work\.json/.test(b.text) && !/could not start/.test(b.text));
    await p.locator('#ea-demo-cta').click(); await p.locator('.urban-tour').waitFor({ timeout: 60000 });
    check('the SF tour still opens when the command bar data failed', true);
    await p.screenshot({ path: `${dir}/work-json-degraded.png` });
    await context.close(); }
  // 2. Agent registry missing: dossiers say the file failed to load instead of denying the agent exists.
  { const { context, p } = await page(['data/agents/sf-civilization.json'], 'registry');
    await p.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => globalThis.CORE_EARTH?.state.ready, null, { timeout: 60000 });
    await p.evaluate(() => CORE_EARTH.start()); await p.waitForFunction(() => !!CORE_EARTH.state.urban, null, { timeout: 60000 });
    await p.evaluate(() => CORE_EARTH.showAgent('core.san-francisco.housing.lead'));
    await p.waitForFunction(() => /Could not load data\/agents\/sf-civilization\.json/.test(document.getElementById('ea-panel')?.innerText || ''), null, { timeout: 30000 });
    const t = await p.locator('#ea-panel').innerText();
    check('registry failure named in the agent panel', /not as absent; reload to retry/.test(t) && !/not in the published registry/.test(t));
    await p.locator('.ar-failed').screenshot({ path: `${dir}/registry-failed.png` });
    await context.close(); }
  // 3. An essential module missing: the existing boot guard still names it (after its one automatic retry).
  { const { context, p } = await page(['src/earth/civ-panels.mjs'], 'module');
    await p.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelector('.le-boot')?.getAttribute('role') === 'alert', null, { timeout: 60000 });
    check('missing module: visible alert with reload', /could not start: src\/earth\/app\.mjs/.test((await boot(p)).text) && /Reload/.test((await boot(p)).text));
    await p.screenshot({ path: `${dir}/module-failed.png` });
    await context.close(); }
  // 4. My CORE: the related-investigation link reports a failed load instead of disappearing.
  { const { context, p } = await page(['data/intelligence/work.json'], 'me');
    await context.addInitScript(() => localStorage.setItem('core.contrib.v1', JSON.stringify([{ id: 'cr3', at: new Date().toISOString(), mission: 'mission.sf.mobility', kind: 'hypothesis', title: 'Green ratio near Folsom', text: 'Test after real counts.', place: null, structuredBy: 'deterministic', state: 'private', demonstration: true, sharedAs: null }])));
    await p.goto(base + 'me.html#contributions', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => /Could not load data\/intelligence\/work\.json/.test(document.querySelector('[data-life]')?.innerText || ''), null, { timeout: 30000 });
    check('My CORE names the failed investigation file', true);
    await context.close(); }
  check('no uncaught page errors', errors.length === 0);
} finally {
  fs.writeFileSync(`${dir}/report.json`, JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
console.log(`${checks.length}/${checks.length} browser checks passed`);
