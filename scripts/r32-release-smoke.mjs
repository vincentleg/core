// R32 release smoke test of the production build (public/), in production mode: serve public/ on loopback and start a
// fresh headless Chrome with --host-resolver-rules="MAP core.test 127.0.0.1" so the page runs on a non-local hostname
// (PUBLIC = true: no local-model probe, no local-only requests), exactly as on the production domain.
// One desktop pass: onboarding → Problems & missions → City intelligence → SF mobility run → SF housing run → city view
// with both saved runs → city summary → My CORE persistence across reload → review request (lifecycle draft) → privacy;
// plus a mobile load check.   CORE_CDP_PORT=<port> node scripts/r32-release-smoke.mjs http://core.test:<port>/ <dir>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://core.test:8797/', dir = process.argv[3] || '.core-local/evidence/r32-release';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9259));
const checks = [], errors = []; let current = null;
const check = (name, value) => { checks.push({ name, pass: !!value }); console.log(value ? 'PASS' : 'FAIL', name); assert.ok(value, name); };
const panelText = page => page.locator('#ea-panel').innerText();
const waitPanel = (page, re, timeout = 60000) => page.waitForFunction(s => new RegExp(s, 'i').test(document.querySelector('#ea-panel')?.innerText || ''), re.source, { timeout });
const TILE_HOSTS = ['tiles.openfreemap.org', 's3.amazonaws.com', 'gibs.earthdata.nasa.gov'];

async function open(label, viewport, extra = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', acceptDownloads: true, ...extra }), writes = [], urls = [];
  await context.addInitScript(() => { if (!sessionStorage.getItem('r32.init')) { sessionStorage.setItem('r32.init', '1'); localStorage.setItem('core.lang', 'en'); localStorage.setItem('core.layerintro.v1', '["real","agents","hybrid"]'); } });
  const page = await context.newPage(); current = page;
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`)); page.on('dialog', d => d.accept());
  page.on('request', r => { urls.push(r.url()); if (!['GET', 'HEAD'].includes(r.method())) writes.push(`${r.method()} ${r.url()}`); });
  return { context, page, writes, urls };
}
async function runAndSave(page, mission) {
  await page.locator(`#ea-panel [data-exec-mission="${mission}"]`).first().click(); await waitPanel(page, /Plan only: nothing has run/);
  const plan = await panelText(page);
  await page.locator('#ex-consent').check(); await page.locator('#ex-run').click(); await waitPanel(page, /Findings of this execution/, 120000);
  const res = await panelText(page); await page.locator('#ea-panel [data-exec="save"]').click(); await waitPanel(page, /Saved in My CORE \(this browser only\)/);
  return { plan, res };
}
async function toCity(page) {
  await page.locator('#ea-panel [data-exec="plan"]').click(); await waitPanel(page, /Plan only: nothing has run/);
  await page.locator('.ex-missions summary').click(); await page.locator('.ex-missions [data-city="open"]').click(); await waitPanel(page, /Missions \(2\)/);
}

try {
  { const { context, page, writes, urls } = await open('desktop', { width: 1440, height: 1000 });
    // Onboarding and navigation.
    await page.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#ea-start').waitFor({ timeout: 120000 }); check('onboarding: opening screen offers “Enter CORE”', await page.locator('#ea-start').isVisible());
    await page.locator('#ea-start').click(); await page.waitForFunction(() => document.getElementById('ea-hero')?.hidden && globalThis.CORE_EARTH?.exploring, null, { timeout: 60000 });
    check('onboarding: entering reveals the explorable Earth', true);
    await page.waitForFunction(() => !!CORE_EARTH.state.civ, null, { timeout: 90000 }); await page.locator('#ea-problems-btn').click(); await page.locator('#ea-panel [data-city="open"]').waitFor({ timeout: 60000 });
    await page.locator('#ea-panel [data-city="open"]').click(); await waitPanel(page, /Missions \(2\)/);
    check('City intelligence: two missions available, boundaries verified', /Execution available[\s\S]*Execution available/.test(await panelText(page)) && /checksum verified/.test(await panelText(page)));
    // SF mobility and SF housing executions (public: deterministic, model unavailable).
    const m = await runAndSave(page, 'mission.sf.mobility');
    check('SF mobility: completed, deterministic only, AI explicitly unavailable on the public site', /CORE never contacts a model on a visitor’s computer/.test(m.plan) && /Completed/.test(m.res) && /7\/8 tasks done/i.test(m.res) && /New local execution with deterministic tools only/.test(m.res) && /Recomputed recorded F8 with core-fluid-queue-1: identical/.test(m.res));
    await toCity(page);
    const h = await runAndSave(page, 'mission.sf.housing-resilience');
    check('SF housing: completed, checksums verified, limitations shown', /5\/6 tasks done/i.test(h.res) && (h.res.match(/checksum verified in this run/g) || []).length === 3 && /not a measure of need/.test(h.res));
    check('scientific limits preserved: proposals awaiting human review, not validated', [m.res, h.res].every(t => /proposed — awaiting human review/.test(t) && /Not scientifically validated, not approved, not a decision/.test(t)));
    await toCity(page);
    const c = await panelText(page);
    check('City intelligence with both saved runs: co-location only, no invented conflict, human review required', (c.match(/Saved run [0-9a-f]{8}/g) || []).length === 2 && /Co-location only/.test(c) && /No cross-mission conflict detected/.test(c) && /Human review required\./.test(c));
    await page.locator('#ea-panel [data-city="save"]').click(); await waitPanel(page, /City summary saved in My CORE/);
    const ids = await page.evaluate(() => ({ city: JSON.parse(localStorage.getItem('core.city.v1')).at(-1).id, runs: JSON.parse(localStorage.getItem('core.executions.v1')).map(e => e.report.execution) }));
    // My CORE: persistence across reload, integrity, review lifecycle.
    await page.locator('#ea-panel a[href^="me.html#city="]').click(); await page.waitForURL(/me\.html#city=/);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(({ city, runs }) => [`[data-city-sum="${city}"]`, ...runs.map(r => `[data-inv="${r}"]`)].every(s => /Integrity verified/.test(document.querySelector(s)?.innerText || '')), ids, { timeout: 30000 });
    check('My CORE after reload: both investigations and the city summary saved and verified', (await page.locator(`[data-city-sum="${ids.city}"]`).innerText()).match(/\(present, verified\)/g)?.length === 2);
    const inv = page.locator(`[data-inv="${ids.runs[0]}"]`); await inv.locator('[data-inv-review]').click();
    const life = page.locator('[data-life]').filter({ hasText: 'From a saved agent investigation' }); await life.waitFor({ timeout: 30000 });
    const [dl] = await Promise.all([page.waitForEvent('download'), life.locator('[data-life-packet]').click()]);
    const packet = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); fs.writeFileSync(`${dir}/review-request.json`, JSON.stringify(packet, null, 2));
    check('human-review lifecycle: draft only, report verified, nothing validated or approved', packet.lifecycle.state === 'DRAFT' && packet.agentInvestigation.reportCheck.ok && packet.agentInvestigation.validated === false && packet.agentInvestigation.approved === false && /has not transmitted, reviewed, validated or endorsed/.test(packet.notice));
    // Privacy in production mode.
    const hosts = [...new Set(urls.map(u => new URL(u)).filter(u => /^https?:$/.test(u.protocol)).map(u => u.host))];
    // My CORE's founder-account module (src/me/founder.mjs, unchanged since R10) probes same-origin GET /api/account/session;
    // production answers 404 and nothing is sent. Every other local, internal or API request fails the check.
    const local = urls.filter(u => /127\.0\.0\.1|localhost|\/\.core-local\/|\/api\/|\/docs\/|11434/.test(u) && !(new URL(u).host === new URL(base).host && new URL(u).pathname === '/api/account/session'));
    fs.writeFileSync(`${dir}/requests.txt`, `${hosts.join('\n')}\n--- local/internal:\n${local.join('\n')}\n`);
    fs.writeFileSync(`${dir}/writes.txt`, writes.join('\n'));
    check('browser-local privacy: no writes, no local-only or internal requests, only this site and map tiles', writes.length === 0 && local.length === 0 && hosts.every(x => x === new URL(base).host || TILE_HOSTS.includes(x)));
    await context.close(); }
  { const { context, page, writes } = await open('mobile', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(base + 'world.html#city=san-francisco', { waitUntil: 'domcontentloaded' }); await waitPanel(page, /Missions \(2\)/, 120000);
    check('mobile: City intelligence loads without horizontal overflow or writes', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && writes.length === 0);
    await context.close(); }
  check('no page errors', errors.length === 0);
} catch (e) { console.error(e.message); process.exitCode = 1; await current?.locator('body').innerText().then(t => fs.writeFileSync(`${dir}/failure-page.txt`, t.slice(0, 20000))).catch(() => {}); }
finally {
  fs.writeFileSync(`${dir}/results.json`, JSON.stringify({ base, checks, errors }, null, 2));
  console.log(`RESULTS ${checks.filter(c => c.pass).length}/${checks.length}${errors.length ? ` errors: ${errors.join(' | ')}` : ''}`);
  await browser.close().catch(() => {});
}
