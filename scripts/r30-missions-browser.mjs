// Isolated CDP check for R30 (geographic mission engine), second mission, real clicks on the public build:
// Problems & missions → SF housing mission → plan (objective, location, evidence, availability, tasks, limitations)
// → the blocked Oakland specification (no run possible) → back → authorized run → findings and limitations → save in
// My CORE → review request with the investigation reference. Start a fresh browser and a loopback server first.
//   CORE_CDP_PORT=<port> node scripts/r30-missions-browser.mjs <base-url> <evidence-dir>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8797/', dir = process.argv[3] || '.core-local/evidence/r30-missions';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9259));
const checks = [], errors = []; let current = null;
const check = (name, value) => { checks.push({ name, pass: !!value }); console.log(value ? 'PASS' : 'FAIL', name); assert.ok(value, name); };
const panelText = page => page.locator('#ea-panel').innerText();
const waitPanel = (page, re, timeout = 60000) => page.waitForFunction(s => new RegExp(s, 'i').test(document.querySelector('#ea-panel')?.innerText || ''), re.source, { timeout });
const HOUSING = 'mission.sf.housing-resilience', TILE_HOSTS = ['tiles.openfreemap.org', 's3.amazonaws.com', 'gibs.earthdata.nasa.gov'];

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true }), writes = [], hosts = new Set(), data = [];
  await context.addInitScript(() => { if (!sessionStorage.getItem('r30.init')) { sessionStorage.setItem('r30.init', '1'); localStorage.setItem('core.lang', 'en'); localStorage.setItem('core.layerintro.v1', '["real","agents","hybrid"]'); } });
  const page = await context.newPage(); current = page;
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol)) hosts.add(u.host); if (u.pathname.includes('/data/sf-housing/')) data.push(u.pathname); if (!['GET', 'HEAD'].includes(r.method())) writes.push(`${r.method()} ${r.url()}`); });
  // 1. Select the mission on Earth.
  await page.goto(base + 'world.html#problems', { waitUntil: 'domcontentloaded' });
  await page.locator(`#ea-panel [data-mission="${HOUSING}"]`).first().waitFor({ timeout: 120000 });
  await page.locator(`#ea-panel [data-mission="${HOUSING}"]`).first().click();
  const go = page.locator(`#ea-panel [data-exec-mission="${HOUSING}"]`); await go.waitFor(); const mark = data.length; await go.click();
  await waitPanel(page, /Plan only: nothing has run/);
  // 2–4. Objective, location, evidence, availability, plan.
  const plan = await panelText(page); fs.writeFileSync(`${dir}/housing-plan.txt`, plan);
  check('objective and location shown', /Affordable-housing pipeline distribution \(San Francisco\)/.test(plan) && /Where are planned affordable units/.test(await page.locator('#ex-objective').inputValue()) && /San Francisco \(41 analysis neighbourhoods\) · 37\.7765, -122\.4135/.test(plan));
  check('authorized evidence listed with licence, date and rights documentation; execution available', /MOHCD Affordable Housing Pipeline/.test(plan) && /Public Domain U\.S\. Government/.test(plan) && /retrieved 2026-10-16/.test(plan) && /Execution available/.test(plan) && !/not loaded/.test(plan));
  check('task plan: six tasks, registered agents, permissions, optional model step', ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].every(t => plan.includes(t)) && /housing\.sources/.test(plan) && /compute-local/.test(plan) && /after H2, H3/.test(plan) && /optional/.test(plan));
  check('limitations, required human review and known gaps shown before running', /Scientific limitations/i.test(plan) && /not homes delivered/.test(plan) && /Human review required/.test(plan) && /Known missing before running: Housing need and affordability measures/.test(plan));
  await page.locator('#ea-panel [data-intel-fly]').first().click();
  await page.waitForFunction(() => { const c = CORE_EARTH.state.map.getCenter(); return Math.abs(c.lng + 122.4135) < 0.01 && Math.abs(c.lat - 37.7765) < 0.01; }, null, { timeout: 15000 });
  check('“Show on the map” flies to the mission location', true);
  await page.screenshot({ path: `${dir}/housing-plan.png` });
  // The blocked specification: listed, explained, not runnable.
  await page.locator('.ex-missions summary').click();
  await page.locator('[data-exec-mission="mission.oakland.signal-timing"]').click(); await waitPanel(page, /Signal timing transfer to Oakland/);
  const ok = await panelText(page);
  check('Oakland specification is listed as not executable with its blocker and no run button', /Not executable/.test(ok) && /No authorized Oakland street geometry/.test(ok) && await page.locator('#ex-run').count() === 0);
  await page.locator('.ex-missions summary').click(); await page.locator(`[data-exec-mission="${HOUSING}"]`).click(); await waitPanel(page, /Plan only: nothing has run/);
  // 5–6. Run with an edited input; inspect findings and limitations.
  await page.locator('#ex-top').fill('4'); await page.locator('#ex-consent').check(); await page.locator('#ex-run').click();
  await waitPanel(page, /Findings of this execution/, 120000);
  const res = await panelText(page); fs.writeFileSync(`${dir}/housing-result.txt`, res);
  check('completed: five deterministic tasks done, model step unavailable on the public site', /Completed/.test(res) && /5\/6 tasks done/i.test(res) && /New local execution with deterministic tools only/.test(res));
  check('checksums of the bundled snapshot verified in this run', (res.match(/checksum verified in this run/g) || []).length === 3);
  check('computed findings follow the edited input and keep their limits', /in 4 neighbourhood\(s\)/.test(res) && /Computed, uncalibrated/.test(res) && /not a measure of need/.test(res));
  check('disagreements and unresolved requirements', /Does the affordable pipeline follow where affordable housing was recently completed\?/.test(res) && /Does concentration show where affordable housing is most needed\?/.test(res) && /Unresolved scientific requirements \(4\)/i.test(res));
  check('proposals awaiting human review; no simulator workbench for this mission', /proposed — awaiting human review/.test(res) && /Not scientifically validated, not approved, not a decision/.test(res) && await page.locator('#ea-panel [data-urban="workbench"]').count() === 0);
  // CORE World's own analyses load the eviction aggregate at page start; the execution must not.
  const mine = data.slice(mark), reads = await page.evaluate(() => CORE_EARTH.state.exec.ctl.state.calls.flatMap(c => c.resources));
  check('the execution fetched and read only the cited housing files, never eviction notices', mine.length === 4 && mine.every(p => /(manifest|pipeline|production-by-year|production-by-neighborhood)\.(json|geojson)$/.test(p)) && reads.length > 0 && !reads.some(p => /evictions/.test(p)));
  await page.screenshot({ path: `${dir}/housing-result.png` });
  // 7–8. Save in My CORE, prepare the review request.
  await page.locator('#ea-panel [data-exec="save"]').click(); await waitPanel(page, /Saved in My CORE \(this browser only\)/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('core.executions.v1')).at(-1).report);
  check('saved report carries the housing specification and no recorded run', saved.mission === HOUSING && saved.spec.id === HOUSING && saved.spec.version === 1 && saved.reads.recordedRun === null);
  await page.locator('#ea-panel [data-exec="review"]').click(); await page.waitForURL(/me\.html#investigation=/);
  const item = page.locator(`[data-inv="${saved.execution}"]`); await item.waitFor({ timeout: 30000 });
  await page.waitForFunction(i => /Integrity verified/.test(document.querySelector(`[data-inv="${i}"]`)?.innerText || ''), saved.execution, { timeout: 30000 });
  check('My CORE: housing investigation verified, deterministic class', /mission\.sf\.housing-resilience/.test(await item.innerText()) && /Deterministic tools only/.test(await item.innerText()));
  await item.locator('[data-inv-review]').click();
  const life = page.locator('[data-life]').filter({ hasText: 'From a saved agent investigation' }); await life.waitFor({ timeout: 30000 });
  const [dl] = await Promise.all([page.waitForEvent('download'), life.locator('[data-life-packet]').click()]);
  const packet = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); fs.writeFileSync(`${dir}/review-request.json`, JSON.stringify(packet, null, 2));
  check('review request references the housing investigation; not validated, nothing sent', packet.agentInvestigation?.mission === HOUSING && packet.agentInvestigation.digest === saved.digest && packet.agentInvestigation.reportCheck.ok && packet.agentInvestigation.validated === false && packet.contribution.mission === HOUSING && packet.lifecycle.state === 'DRAFT');
  const extra = [...hosts].filter(h => h !== new URL(base).host && !TILE_HOSTS.includes(h));
  check('no host beyond this site and map tiles; no network writes', extra.length === 0 && writes.length === 0);
  await context.close();
  check('no page errors', errors.length === 0);
} catch (e) { console.error(e.message); process.exitCode = 1; await current?.locator('body').innerText().then(t => fs.writeFileSync(`${dir}/failure-page.txt`, t.slice(0, 20000))).catch(() => {}); }
finally {
  fs.writeFileSync(`${dir}/results.json`, JSON.stringify({ base, checks, errors }, null, 2));
  console.log(`RESULTS ${checks.filter(c => c.pass).length}/${checks.length}${errors.length ? ` errors: ${errors.join(' | ')}` : ''}`);
  await browser.close().catch(() => {});
}
