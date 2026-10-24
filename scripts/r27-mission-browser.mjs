// Isolated CDP acceptance for R27 (mission intelligence): one real-click San Francisco journey — agent on the map →
// mission investigation → evidence → scenario workbench comparison → contribution linked to a mission item → My CORE
// review request — and one mobile interaction check. Start a fresh browser and a loopback server from public/ first.
//   CORE_CDP_PORT=<port> node scripts/r27-mission-browser.mjs http://127.0.0.1:<port>/ <evidence-dir>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8797/';
const dir = process.argv[3] || '.core-local/evidence/r27-mission';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9259));
const checks = [], errors = [];
const check = (name, value) => { checks.push({ name, pass: !!value }); console.log(value ? 'PASS' : 'FAIL', name); assert.ok(value, name); };
const AGENT = 'core.san-francisco.housing.lead';
const panelText = page => page.locator('#ea-panel').innerText();
const waitPanel = (page, re) => page.waitForFunction(s => new RegExp(s, 'i').test(document.querySelector('#ea-panel')?.innerText || ''), re.source, { timeout: 30000 });

async function open(label, viewport, extra = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', acceptDownloads: true, ...extra }), writes = [];
  await context.addInitScript(() => { localStorage.setItem('core.lang', 'en'); localStorage.setItem('core.layerintro.v1', '["real","agents","hybrid"]'); });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  page.on('request', r => { if (!['GET', 'HEAD'].includes(r.method())) writes.push(`${r.method()} ${r.url()}`); });
  return { context, page, writes };
}

try {
  { const { context, page, writes } = await open('desktop', { width: 1440, height: 1000 });
    await page.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => globalThis.CORE_EARTH?.state.map && CORE_EARTH.state.ready, null, { timeout: 90000 });
    await page.evaluate(() => CORE_EARTH.start());
    await page.waitForFunction(() => !!CORE_EARTH.state.urban && !!CORE_EARTH.state.layer, null, { timeout: 90000 });
    await page.evaluate(() => CORE_EARTH.state.map.jumpTo({ center: [-122.41, 37.777], zoom: 15 }));
    await page.waitForFunction(() => CORE_EARTH.state.urban.city.positions.length >= 50, null, { timeout: 30000 });
    // 1–2. Select the recorded quantitative agent by a real click on its map symbol (frozen in place for the click).
    await page.evaluate(() => CORE_EARTH.setLayer('hybrid', { intro: false }));
    let pt = null;
    for (let k = 0; k < 6 && !pt; k++) {
      pt = await page.evaluate(async id => {
        const m = CORE_EARTH.state.map, find = () => m.queryRenderedFeatures({ layers: ['urban-agents'] }).find(f => f.properties.id === id);
        let f = find(); if (!f) { const p = CORE_EARTH.state.urban.city.positions.find(x => x.id === id || x.properties?.id === id); const c = p?.coordinates || p?.geometry?.coordinates; if (c) m.jumpTo({ center: c, zoom: 18, pitch: 0, bearing: 0 }); await new Promise(r => setTimeout(r, 600)); f = find(); }
        if (!f) return null; const p = m.project(f.geometry.coordinates), r = m.getCanvas().getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y - 8 };
      }, AGENT);
    }
    let realAgentClick = false;
    if (pt) { await page.mouse.click(pt.x, pt.y); realAgentClick = await waitPanel(page, /Mission responsibility/).then(async () => /Mobility scenario analysis/.test(await panelText(page))).catch(() => false); }
    if (!realAgentClick) { console.log('NOTE recorded agent symbol not clickable at this moment; opened through CORE_EARTH.showAgent'); await page.evaluate(id => CORE_EARTH.showAgent(id), AGENT); await waitPanel(page, /Mission responsibility/); }
    checks.push({ name: 'agent selected by a real map click', pass: realAgentClick, informational: true });
    // 3. Agent identity, recorded status, responsibility.
    const a = await panelText(page); fs.writeFileSync(`${dir}/desktop-agent.txt`, a);
    check('agent shows its responsibility, recorded status and no live execution', /Mobility scenario analysis/.test(a) && /Recorded work/.test(a) && /Live execution is unavailable here/.test(a) && /Blocked: authorized data missing/.test(a));
    check('agent shows evidence it produced, dependencies and open questions', /F8/.test(a) && /Computed, uncalibrated/.test(a) && /Depends on/.test(a) && /Open questions/.test(a));
    await page.locator('.mi-brief').screenshot({ path: `${dir}/desktop-agent-brief.png` });
    await page.locator('.mi-memory summary').click();
    check('recorded memory references task and events with timestamps', /work\.json#task:3/.test(await page.locator('.mi-memory').innerText()) && /UTC/.test(await page.locator('.mi-memory').innerText()));
    // 4–6. Mission investigation: responsibilities, evidence, supported findings and unresolved questions.
    await page.locator('.mi-brief [data-intel]').click(); await waitPanel(page, /Mission investigation/);
    const m = await panelText(page); fs.writeFileSync(`${dir}/desktop-mission.txt`, m);
    check('mission lists five responsibilities with owners and states', ['Geographic context and infrastructure', 'Evidence and source quality', 'Mobility scenario analysis', 'Risks and uncertainty', 'Human review and decision preparation'].every(s => m.includes(s)) && /Awaiting human review/.test(m));
    check('mission states it is organised by deterministic code with no agent running', /deterministic code · no agent is running/.test(m));
    await page.locator('[data-mi-jump="mi-s-evidence"]').click();
    const ev = await page.locator('#mi-s-evidence').innerText();
    check('evidence stage separates source, observation and computed provenance', /Source evidence/.test(ev) && /Recorded observation/.test(ev) && /Computed, uncalibrated/.test(ev) && /provenance checked by a recorded validation/.test(ev));
    await page.locator('#mi-s-hypotheses summary').click();
    const hy = await page.locator('#mi-s-hypotheses').innerText();
    check('hypotheses show contradicted, unverified and numerically checked claims', /Contradicted by recorded evidence/.test(hy) && /Unverified/.test(hy) && /match the computed output/.test(hy));
    await page.locator('[data-mi-jump="mi-s-uncertainty"]').click();
    const un = await page.locator('#mi-s-uncertainty').innerText();
    check('conflicts and open questions are listed unresolved', /X1 · Location/.test(un) && /Next step/.test(un) && /unresolved/.test(un) && /Observed traffic measurements/.test(un));
    await page.locator('.mi-log summary').click();
    check('assembly record is inspectable', /rule-based code, not autonomous AI reasoning/.test(await page.locator('.mi-log').innerText()));
    await page.screenshot({ path: `${dir}/desktop-mission.png` });
    // 7–8. Scenario workbench: compare the existing exploratory scenarios.
    await page.locator('[data-mi-jump="mi-s-analysis"]').click();
    await page.locator('#mi-s-analysis [data-urban="workbench"]').click();
    await waitPanel(page, /Run actual model/);
    await page.locator('#ea-panel button[type=submit]', { hasText: 'Run actual model' }).click();
    await waitPanel(page, /Exploratory, not calibrated/);
    const wb = await panelText(page);
    check('workbench compares exploratory scenarios, uncalibrated', /Accrued delay \/ arrival/.test(wb) && /Human review required/.test(wb));
    await page.screenshot({ path: `${dir}/desktop-workbench.png` });
    // 9. Back to the mission; respond to an open question.
    await page.evaluate(() => { location.hash = 'intel=mission.sf.mobility'; });
    await waitPanel(page, /Mission investigation/);
    await page.locator('[data-mi-jump="mi-s-uncertainty"]').click();
    await page.locator('#mi-s-uncertainty [data-relates="R:measurements"]').click();
    await waitPanel(page, /Respond to the mission/);
    check('contribution form shows the mission link and that agents did not read it', /Linked to question R:measurements/.test(await panelText(page)) && /the agents did not and will not read your text/.test(await panelText(page)));
    await page.locator('#nt-text').fill('I can point to a 2019 manual turning-movement count at Folsom and 2nd; its reuse terms need checking.');
    await page.locator('#nt-form button[type=submit]').click(); await page.locator('#nt-private').waitFor();
    await page.locator('#nt-private').click(); await page.locator('#nt-done .nt-ok').waitFor();
    const done = await page.locator('#nt-done').innerText();
    check('kept private, linked, not analysed, not approved', /Kept private/.test(done) && /Linked to question R:measurements/.test(done) && /nothing is approved/.test(done));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('core.contrib.v1')).at(-1));
    check('stored only in this browser with the link snapshot', stored.state === 'private' && stored.relates?.ref === 'R:measurements' && stored.relates.analysedByAgents === false);
    await page.screenshot({ path: `${dir}/desktop-contribution.png` });
    // 10. Prepare the human review request in My CORE.
    await page.locator('#nt-done a', { hasText: 'Prepare a human review request' }).click();
    await page.waitForURL(/me\.html#contributions/); await page.locator('[data-life] .mi-link').waitFor({ timeout: 30000 });
    const me = await page.locator(`[data-life="${stored.id}"]`).innerText(); fs.writeFileSync(`${dir}/mycore.txt`, me);
    check('My CORE shows the link, the evidence still missing and the required independent review', /Linked to question R:measurements/.test(me) && /Missing evidence/i.test(me) && /Independent expert review/.test(me) && /did not and will not read your text/.test(me));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator(`[data-life-packet="${stored.id}"]`).click()]);
    const packet = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); fs.writeFileSync(`${dir}/review-request.json`, JSON.stringify(packet, null, 2));
    check('review request carries the mission link, stays a draft and is not transmitted', packet.contribution.relatesTo?.ref === 'R:measurements' && packet.contribution.relatesTo.analysedByAgents === false && packet.lifecycle.state === 'DRAFT' && /has not transmitted, reviewed, validated or endorsed/.test(packet.notice));
    await page.locator(`[data-life="${stored.id}"]`).screenshot({ path: `${dir}/desktop-mycore.png` });
    check('desktop: no network writes', writes.length === 0);
    await context.close(); }
  // Mobile: open the mission from Earth, use stage navigation and respond, without horizontal overflow.
  { const { context, page, writes } = await open('mobile', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(base + 'world.html#intel=mission.sf.mobility', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /Mission investigation/i.test(document.querySelector('#ea-panel')?.innerText || ''), null, { timeout: 120000 });
    await page.locator('[data-mi-jump="mi-agents"]').tap();
    await page.locator('#mi-agents [data-agent]').first().tap();
    await waitPanel(page, /Mission responsibility/);
    check('mobile: tap from the responsibility board opens an agent brief', /Recorded role/i.test(await panelText(page)));
    await page.locator('.mi-brief [data-intel]').tap(); await waitPanel(page, /Mission investigation/);
    await page.locator('#mi-s-review summary').tap();
    const btn = page.locator('#mi-s-review [data-contribute]'); await btn.scrollIntoViewIfNeeded();
    const box = await btn.boundingBox(); console.log('review button box', JSON.stringify(box));
    check('mobile: primary review action is at least 44 px and inside the viewport', box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 390);
    check('mobile: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.getElementById('ea-panel').scrollWidth <= document.getElementById('ea-panel').clientWidth + 1));
    await page.screenshot({ path: `${dir}/mobile-mission-review.png` });
    check('mobile: no network writes', writes.length === 0);
    await context.close(); }
  check('no page errors', errors.length === 0);
} catch (e) { console.error(e.message); process.exitCode = 1; }
finally {
  fs.writeFileSync(`${dir}/results.json`, JSON.stringify({ base, checks, errors }, null, 2));
  console.log(`RESULTS ${checks.filter(c => c.pass).length}/${checks.length}${errors.length ? ` errors: ${errors.join(' | ')}` : ''}`);
  await browser.close().catch(() => {});
}
