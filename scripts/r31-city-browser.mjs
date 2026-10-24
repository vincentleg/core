// Isolated CDP acceptance for R31 (city intelligence), real clicks on the public build. Desktop: Problems & missions →
// City intelligence (no saved runs) → run and save the housing mission → run and save the mobility mission → city
// view with both saved runs (shared geography, typed facts, carried disagreements, hypotheses) → save the city
// summary → My CORE (verified, linked investigations) → prepare the review request → download it → export → reload.
// Mobile: city view from its link, 44 px actions, no overflow, into a mission workflow. Start a fresh browser first.
//   CORE_CDP_PORT=<port> node scripts/r31-city-browser.mjs <base-url> <evidence-dir>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8797/', dir = process.argv[3] || '.core-local/evidence/r31-city';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9259));
const checks = [], errors = []; let current = null;
const check = (name, value) => { checks.push({ name, pass: !!value }); console.log(value ? 'PASS' : 'FAIL', name); assert.ok(value, name); };
const panelText = page => page.locator('#ea-panel').innerText();
const waitPanel = (page, re, timeout = 60000) => page.waitForFunction(s => new RegExp(s, 'i').test(document.querySelector('#ea-panel')?.innerText || ''), re.source, { timeout });
const TILE_HOSTS = ['tiles.openfreemap.org', 's3.amazonaws.com', 'gibs.earthdata.nasa.gov'], MOB = 'mission.sf.mobility', HOU = 'mission.sf.housing-resilience';

async function open(label, viewport, extra = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', acceptDownloads: true, ...extra }), writes = [], hosts = new Set();
  await context.addInitScript(() => { if (!sessionStorage.getItem('r31.init')) { sessionStorage.setItem('r31.init', '1'); localStorage.setItem('core.lang', 'en'); localStorage.setItem('core.layerintro.v1', '["real","agents","hybrid"]'); } });
  const page = await context.newPage(); current = page;
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`)); page.on('dialog', d => d.accept());
  page.on('request', r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol)) hosts.add(u.host); if (!['GET', 'HEAD'].includes(r.method())) writes.push(`${r.method()} ${r.url()}`); });
  return { context, page, writes, hosts };
}
async function runAndSave(page, mission) {
  await page.locator(`#ea-panel [data-exec-mission="${mission}"]`).first().click(); await waitPanel(page, /Plan only: nothing has run/);
  await page.locator('#ex-consent').check(); await page.locator('#ex-run').click(); await waitPanel(page, /Findings of this execution/, 180000);
  await page.locator('#ea-panel [data-exec="save"]').click(); await waitPanel(page, /Saved in My CORE \(this browser only\)/);
}
async function toCity(page) {
  await page.locator('#ea-panel [data-exec="plan"]').click(); await waitPanel(page, /Plan only: nothing has run/);
  await page.locator('.ex-missions summary').click(); await page.locator('.ex-missions [data-city="open"]').click(); await waitPanel(page, /City intelligence/);
  await page.waitForFunction(() => /Missions \(2\)/i.test(document.querySelector('#ea-panel')?.innerText || ''), null, { timeout: 30000 });
}

try {
  { const { context, page, writes, hosts } = await open('desktop', { width: 1440, height: 1000 });
    // 1. City intelligence from Problems & missions, before any saved run.
    await page.goto(base + 'world.html#problems', { waitUntil: 'domcontentloaded' });
    await page.locator('#ea-panel [data-city="open"]').waitFor({ timeout: 120000 }); await page.locator('#ea-panel [data-city="open"]').click();
    await waitPanel(page, /Missions \(2\)/);
    const c0 = await panelText(page); fs.writeFileSync(`${dir}/city-empty.txt`, c0);
    check('city overview: two San Francisco missions available, Oakland excluded, deterministic comparison stated', /Execution available[\s\S]*Execution available/.test(c0) && !/Oakland/.test(c0) && /Deterministic comparison by code, not an agent run/.test(c0));
    check('shared geography through verified neighbourhood boundaries', /Analysis Neighborhoods \(j2bu-swwd/.test(c0) && /checksum verified/.test(c0) && /Financial District\/South Beach/.test(c0) && /Point-in-polygon of the 2 endpoints/.test(c0) && /39 of 39 names match/.test(c0));
    check('before any run: observed facts only, both missions flagged as not yet run', /Observed/.test(c0) && /3166 planned units of which 1358 affordable/.test(c0) && (c0.match(/No saved investigation of/g) || []).length === 2);
    const layer = await page.waitForFunction(() => { const m = CORE_EARTH.state.map, src = m.getSource('core-city'), n = src?.serialize?.().data?.features?.length || 0;
      return m.getLayer('core-city-pts') && m.getLayoutProperty('core-city-pts', 'visibility') !== 'none' && n >= 4 ? { n } : false; }, null, { timeout: 30000 }).then(h => h.jsonValue()).catch(() => null);
    check('map shows mission locations and the shared neighbourhood', !!layer);
    await page.screenshot({ path: `${dir}/desktop-city-empty.png` });
    // 2. Into each mission's existing workflow: run and save.
    await runAndSave(page, HOU); await toCity(page); await runAndSave(page, MOB); await toCity(page);
    const c1 = await panelText(page); fs.writeFileSync(`${dir}/city-both.txt`, c1);
    check('both missions now show their saved runs', (c1.match(/Saved run [0-9a-f]{8}/g) || []).length === 2);
    check('facts at the shared area are typed observed and computed; co-location only', /Observed/.test(c1) && /Computed, uncalibrated[\s\S]*modelled delay/.test(c1) && /Co-location only: these facts describe the same area, not a relationship between them/.test(c1));
    check('evidence and readiness: no shared evidence file, shared review gap, requirements per mission', /No evidence file or dataset is cited by both missions/.test(c1) && /Shared gaps/.test(c1) && /Independent review/.test(c1) && /Observed traffic measurements/.test(c1));
    check('no invented conflict; disagreements carried from saved runs', /No cross-mission conflict detected/.test(c1) && /Disagreements carried from saved investigations \(\d+\)/.test(c1));
    check('opportunities are hypotheses; no causal claim', /Hypothesis, untested[\s\S]*no causal claim can be made/.test(c1) && !/\b(causes|caused by|leads to|results in)\b/i.test(c1.replace(/no causal claim/g, '')));
    await page.locator('#ea-panel details summary', { hasText: 'Agent contributions' }).click();
    check('agent contributions keep ownership, recorded vs from saved runs', /recorded · \d+ from saved runs/.test(await panelText(page)) && /No collaboration is simulated/.test(await panelText(page)));
    check('human review required', /Human review required\./.test(c1));
    await page.screenshot({ path: `${dir}/desktop-city-both.png` });
    // 3. Save the city summary and continue in My CORE.
    await page.locator('#ea-panel [data-city="save"]').click(); await waitPanel(page, /City summary saved in My CORE/);
    const sum = await page.evaluate(() => JSON.parse(localStorage.getItem('core.city.v1')).at(-1));
    check('city summary saved locally with links to both investigations', sum.kind === 'core-city-summary' && sum.missions.every(m => m.report?.execution) && sum.validated === false && sum.approved === false);
    await page.locator('#ea-panel a[href^="me.html#city="]').click(); await page.waitForURL(/me\.html#city=/);
    const item = page.locator(`[data-city-sum="${sum.id}"]`); await item.waitFor({ timeout: 30000 });
    await page.waitForFunction(i => /Integrity verified/.test(document.querySelector(`[data-city-sum="${i}"]`)?.innerText || '') && /Shared geography/.test(document.getElementById('city-detail')?.innerText || ''), sum.id, { timeout: 30000 });
    const it = await item.innerText(); fs.writeFileSync(`${dir}/mycore-city.txt`, it);
    check('My CORE: summary verified, both linked investigations present and verified, details open', (it.match(/\(present, verified\)/g) || []).length === 2 && /Deterministic city comparison/.test(it) && /Financial District\/South Beach/.test(it));
    await item.locator('[data-city-review]').click();
    const life = page.locator('[data-life]').filter({ hasText: 'From a saved city summary' }); await life.waitFor({ timeout: 30000 });
    const lt = await life.innerText(); check('draft contribution references the summary and both investigations as evidence', /saved summary verified/.test(lt) && /2 linked investigation\(s\)/.test(lt) && (lt.match(/saved investigation of mission\./g) || []).length === 2);
    const [dl] = await Promise.all([page.waitForEvent('download'), life.locator('[data-life-packet]').click()]);
    const packet = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); fs.writeFileSync(`${dir}/review-request.json`, JSON.stringify(packet, null, 2));
    check('review request carries the city summary, its digest and investigations; not validated; draft', packet.citySummary?.id === sum.id && packet.citySummary.digest === sum.digest && packet.citySummary.summaryCheck.ok && packet.citySummary.investigations.length === 2 && packet.citySummary.validated === false && packet.lifecycle.state === 'DRAFT' && /hypotheses; nothing is causal/.test(packet.citySummary.meaning));
    const [ex] = await Promise.all([page.waitForEvent('download'), item.locator('[data-city-export]').click()]);
    check('export is the saved summary', JSON.parse(fs.readFileSync(await ex.path(), 'utf8')).digest === sum.digest);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(i => /Integrity verified/.test(document.querySelector(`[data-city-sum="${i}"]`)?.innerText || ''), sum.id, { timeout: 30000 });
    check('after reload: still saved, verified, linked to its review request', /Review request prepared: see it/.test(await page.locator(`[data-city-sum="${sum.id}"]`).innerText()));
    check('browser-local: no host beyond this site and map tiles, no network writes', [...hosts].every(h => h === new URL(base).host || TILE_HOSTS.includes(h)) && writes.length === 0);
    await context.close(); }
  { const { context, page, writes } = await open('mobile', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(base + 'world.html#city=san-francisco', { waitUntil: 'domcontentloaded' }); await waitPanel(page, /Missions \(2\)/, 120000);
    const btns = await page.locator('#ea-panel .ci-actions button').evaluateAll(bs => bs.map(b => { const r = b.getBoundingClientRect(); return [r.height, r.x, r.right]; }));
    check('mobile: city actions ≥ 44 px inside the viewport', btns.length >= 4 && btns.every(([h, x, r]) => h >= 44 && x >= 0 && r <= 390));
    check('mobile: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.getElementById('ea-panel').scrollWidth <= document.getElementById('ea-panel').clientWidth + 1));
    await page.screenshot({ path: `${dir}/mobile-city.png` });
    const go = page.locator(`#ea-panel [data-exec-mission="${HOU}"]`).first(); await go.scrollIntoViewIfNeeded(); await go.tap(); await waitPanel(page, /Plan only: nothing has run/);
    check('mobile: tap into the housing mission’s execution workflow', /Affordable-housing pipeline distribution/.test(await panelText(page)));
    check('mobile: no network writes', writes.length === 0);
    await context.close(); }
  check('no page errors', errors.length === 0);
} catch (e) { console.error(e.message); process.exitCode = 1; await current?.locator('body').innerText().then(t => fs.writeFileSync(`${dir}/failure-page.txt`, t.slice(0, 20000))).catch(() => {}); }
finally {
  fs.writeFileSync(`${dir}/results.json`, JSON.stringify({ base, checks, errors }, null, 2));
  console.log(`RESULTS ${checks.filter(c => c.pass).length}/${checks.length}${errors.length ? ` errors: ${errors.join(' | ')}` : ''}`);
  await browser.close().catch(() => {});
}
