// Isolated CDP acceptance for R29 (saved agent investigations in My CORE). Desktop, real clicks: run an investigation
// on the map → nothing stored until "Save in My CORE" → reload → reopen it on the map → My CORE (integrity, class,
// inspect) → prepare the existing review request → download it → export the report → reload My CORE. Mobile (public
// build): run, save, open in My CORE, inspect, 44 px actions, no overflow, delete. Start a fresh browser and servers first.
//   CORE_CDP_PORT=<port> node scripts/r29-saved-investigations-browser.mjs <desktop-base-url> <mobile-base-url> <evidence-dir>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const desk = process.argv[2] || 'http://127.0.0.1:8798/', mob = process.argv[3] || 'http://127.0.0.1:8797/';
const dir = process.argv[4] || '.core-local/evidence/r29-saved';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9259));
const checks = [], errors = []; let current = null;
const check = (name, value) => { checks.push({ name, pass: !!value }); console.log(value ? 'PASS' : 'FAIL', name); assert.ok(value, name); };
const note = (name, value) => { checks.push({ name, pass: !!value, informational: true }); console.log(value ? 'NOTE+' : 'NOTE-', name); };
const panelText = page => page.locator('#ea-panel').innerText();
const waitPanel = (page, re, timeout = 60000) => page.waitForFunction(s => new RegExp(s, 'i').test(document.querySelector('#ea-panel')?.innerText || ''), re.source, { timeout });
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('core.executions.v1') || '[]'));
const TILE_HOSTS = ['tiles.openfreemap.org', 's3.amazonaws.com', 'gibs.earthdata.nasa.gov'];

async function open(label, viewport, extra = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', acceptDownloads: true, ...extra }), writes = [], hosts = new Set();
  await context.addInitScript(() => { if (!sessionStorage.getItem('r29.init')) { sessionStorage.setItem('r29.init', '1'); localStorage.setItem('core.lang', 'en'); localStorage.setItem('core.layerintro.v1', '["real","agents","hybrid"]'); } });
  const page = await context.newPage(); current = page;
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  page.on('dialog', d => d.accept());
  page.on('request', r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol)) hosts.add(u.host); if (!['GET', 'HEAD'].includes(r.method())) writes.push(`${r.method()} ${r.url()}`); });
  return { context, page, writes, hosts };
}
async function runOnMap(page, base) {
  await page.goto(base + 'world.html#intel=mission.sf.mobility', { waitUntil: 'domcontentloaded' });
  await waitPanel(page, /Mission investigation/, 120000);
  const plan = page.locator('#ea-panel button[data-exec-mission="mission.sf.mobility"]').first(); await plan.scrollIntoViewIfNeeded(); await plan.click();
  await waitPanel(page, /Plan only: nothing has run/);
  await page.locator('#ex-consent').check(); await page.locator('#ex-run').click();
  await waitPanel(page, /Findings of this execution/, 240000);
}
const download = async (page, locator) => { const [dl] = await Promise.all([page.waitForEvent('download'), locator.click()]); return JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); };

try {
  { const { context, page, writes, hosts } = await open('desktop', { width: 1440, height: 1000 });
    // 1. Run an investigation; nothing is stored until the person saves it.
    await runOnMap(page, desk);
    const res = await panelText(page);
    const ai = /New local execution that used a local AI model/.test(res);
    note(`desktop run class: ${ai ? 'used a local AI model' : 'deterministic tools only'}`, ai);
    check('result states its execution class and that it is not validated', /New local execution (that used a local AI model|with deterministic tools only)/.test(res) && /Not scientifically validated, not approved, not a decision/.test(res));
    check('nothing stored before the person saves', (await saved(page)).length === 0 && /Not saved yet/.test(res));
    // 2. Save.
    await page.locator('#ea-panel [data-exec="save"]').click(); await waitPanel(page, /Saved in My CORE \(this browser only\)/);
    const s1 = await saved(page), id = s1[0]?.report.execution;
    check('saved once in browser storage with savedAt and the full report', s1.length === 1 && Number.isFinite(Date.parse(s1[0].savedAt)) && /^[0-9a-f]{64}$/.test(s1[0].report.digest) && s1[0].report.mission === 'mission.sf.mobility');
    // 3. Reload and reopen it on the map: labelled re-opened, not re-run.
    await page.reload({ waitUntil: 'domcontentloaded' }); await waitPanel(page, /Mission investigation/, 120000);
    check('saved report persists across a reload', (await saved(page))[0]?.report.execution === id);
    await page.locator('#ea-panel button[data-exec-mission="mission.sf.mobility"]').first().click(); await waitPanel(page, /Saved in My CORE \(this browser\)/);
    await page.locator('[data-exec-open]').first().click(); await waitPanel(page, /re-opened from this browser: not re-run/);
    check('reopened on the map without re-running', /not re-run/.test(await panelText(page)) && (await saved(page)).length === 1);
    // 4. To My CORE through the review action; the saved investigation opens, verified.
    await page.locator('#ea-panel [data-exec="review"]').click();
    await page.waitForURL(/me\.html#investigation=/); const item = page.locator(`[data-inv="${id}"]`); await item.waitFor({ timeout: 30000 });
    await page.waitForFunction(() => /Findings of this execution/.test(document.getElementById('inv-detail')?.innerText || ''), null, { timeout: 30000 });
    const mi = await page.locator('#investigations').innerText(); fs.writeFileSync(`${dir}/mycore-investigations.txt`, mi);
    check('My CORE lists recorded replay and the saved run with distinct classes', /Recorded replay/.test(mi) && (ai ? /Used a local AI model · /.test(mi) : /Deterministic tools only/.test(mi)));
    check('integrity verified and evidence summarised; not validated', /Integrity verified/.test(await item.innerText()) && /unresolved requirements/.test(await item.innerText()) && /not scientifically validated, not approved, not a decision/i.test(mi));
    check('inspect shows findings by provenance, disagreements and requirements', /Computed, uncalibrated/.test(mi) && /Disagreements/.test(mi) && /Unresolved scientific requirements/i.test(mi) && !/Save in My CORE/.test(mi));
    await page.screenshot({ path: `${dir}/desktop-mycore.png` });
    // 5. Prepare the existing My CORE review request from it.
    await item.locator('[data-inv-review]').click();
    const life = page.locator('[data-life]').filter({ hasText: 'From a saved agent investigation' }); await life.waitFor({ timeout: 30000 });
    const lt = await life.innerText(); fs.writeFileSync(`${dir}/mycore-contribution.txt`, lt);
    check('draft contribution references the investigation through the lifecycle', /From a saved agent investigation/.test(lt) && /saved report verified/.test(lt) && new RegExp(id.slice(0, 8)).test(lt) && /simulation \(local (execution with a local AI model|deterministic execution) in this browser · report SHA-256/.test(lt));
    check('the investigation now links to its prepared request (no duplicate)', /Review request prepared: see it/.test(await item.innerText()));
    const packet = await download(page, life.locator('[data-life-packet]')); fs.writeFileSync(`${dir}/review-request.json`, JSON.stringify(packet, null, 2));
    check('review request carries identity, digest and evidence refs, verified, not validated', packet.format === 'core.review-request.v1' && packet.agentInvestigation?.execution === id && packet.agentInvestigation.digest === s1[0].report.digest && packet.agentInvestigation.reportCheck.ok === true && packet.agentInvestigation.findings.length > 0 && packet.agentInvestigation.validated === false && packet.agentInvestigation.approved === false && packet.lifecycle.state === 'DRAFT' && packet.missingEvidence.length === 4);
    // 6. Export.
    const exported = await download(page, item.locator('[data-inv-export]')); fs.writeFileSync(`${dir}/export.json`, JSON.stringify(exported, null, 2));
    check('export is the saved report, digest unchanged', exported.execution === id && exported.digest === s1[0].report.digest);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator(`[data-inv="${id}"]`).waitFor();
    await page.waitForFunction(i => /Integrity verified/.test(document.querySelector(`[data-inv="${i}"]`)?.innerText || ''), id, { timeout: 30000 });
    check('after reload: still saved, verified and linked to its review request', /Review request prepared: see it/.test(await page.locator(`[data-inv="${id}"]`).innerText()));
    const extra = [...hosts].filter(h => !['127.0.0.1:' + new URL(desk).port, '127.0.0.1:11434', ...TILE_HOSTS].includes(h));
    check('browser-local: no host beyond this site, map tiles and the local model; no writes except the local model', extra.length === 0 && writes.every(w => w === 'POST http://127.0.0.1:11434/api/chat'));
    console.log('hosts', [...hosts].join(' '), 'writes', writes.length);
    await context.close(); }
  // Mobile (public build): run, save, open in My CORE, inspect, delete; touch targets and overflow.
  { const { context, page, writes } = await open('mobile', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await runOnMap(page, mob);
    check('mobile: deterministic run on the public build', /New local execution with deterministic tools only/.test(await panelText(page)));
    const sv = page.locator('#ea-panel [data-exec="save"]'); await sv.scrollIntoViewIfNeeded(); const sb = await sv.boundingBox(); check('mobile: save button ≥ 44 px', sb && sb.height >= 44 && sb.x + sb.width <= 390); await sv.tap();
    const go = page.locator('#ea-panel a[href="me.html#investigations"]'); await go.waitFor(); await go.tap();
    await page.waitForURL(/me\.html#investigations/); const it = page.locator('[data-inv]').first(); await it.waitFor({ timeout: 30000 });
    await page.waitForFunction(() => /Integrity verified/.test(document.querySelector('[data-inv]')?.innerText || ''), null, { timeout: 30000 });
    await it.locator('[data-inv-open]').tap(); await page.waitForFunction(() => /Findings of this execution/.test(document.getElementById('inv-detail')?.innerText || ''), null, { timeout: 30000 });
    const boxes = await it.locator('.inv-actions .btn').evaluateAll(bs => bs.map(b => { const r = b.getBoundingClientRect(); return [r.height, r.x, r.right]; }));
    check('mobile: My CORE investigation actions ≥ 44 px inside the viewport', boxes.length >= 4 && boxes.every(([h, x, r]) => h >= 44 && x >= 0 && r <= 390));
    check('mobile: no horizontal overflow in My CORE', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${dir}/mobile-mycore.png` });
    await it.locator('[data-inv-del]').tap(); await page.waitForFunction(() => !document.querySelector('[data-inv]'), null, { timeout: 10000 });
    check('mobile: delete removes the saved investigation from this browser', (await saved(page)).length === 0);
    check('mobile: no network writes', writes.length === 0);
    await context.close(); }
  check('no page errors', errors.length === 0);
} catch (e) { console.error(e.message); process.exitCode = 1; await current?.locator('body').innerText().then(t => fs.writeFileSync(`${dir}/failure-page.txt`, t.slice(0, 20000))).catch(() => {}); }
finally {
  fs.writeFileSync(`${dir}/results.json`, JSON.stringify({ desk, mob, checks, errors }, null, 2));
  console.log(`RESULTS ${checks.filter(c => c.pass).length}/${checks.length}${errors.length ? ` errors: ${errors.join(' | ')}` : ''}`);
  await browser.close().catch(() => {});
}
