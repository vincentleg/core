// Isolated CDP acceptance for R2 (agent records, location inspector, contribution link, mobile language selector).
// Start a fresh browser and a local server from public/ first; nothing here writes to a network service.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8796/';
const dir = process.argv[3] || '.core-local/evidence/r2-agents';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9259));
const checks = [], errors = [], fetched = new Set();
const check = (name, value) => { checks.push({ name, pass: !!value }); assert.ok(value, name); };
const WORK_AGENT = 'core.san-francisco.housing.lead';
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function open(label, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' }), writes = [];
  await context.addInitScript(() => { localStorage.setItem('core.lang', 'en'); localStorage.setItem('core.layerintro.v1', '["real","agents","hybrid"]'); });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  page.on('request', r => { const u = new URL(r.url()); if (u.origin === new URL(base).origin) fetched.add(u.pathname); if (!['GET', 'HEAD'].includes(r.method())) writes.push(`${r.method()} ${r.url()}`); });
  return { context, page, writes };
}
async function enterSF(page, layer) {
  await page.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => globalThis.CORE_EARTH?.state.map && globalThis.CORE_EARTH.state.ready, null, { timeout: 90000 });
  await page.evaluate(() => CORE_EARTH.start());
  await page.waitForFunction(() => !!CORE_EARTH.state.urban && !!CORE_EARTH.state.layer, null, { timeout: 90000 });
  // Centre on the mapped pedestrian window where the urban layer places its agent symbols.
  await page.evaluate(() => CORE_EARTH.state.map.jumpTo({ center: [-122.41, 37.777], zoom: 15 }));
  await page.waitForFunction(() => CORE_EARTH.state.urban.city.positions.length >= 50, null, { timeout: 30000 });
  await page.evaluate(l => { CORE_EARTH.setLayer(l, { intro: false }); CORE_EARTH.state.map.jumpTo({ center: CORE_EARTH.state.urban.city.positions[0].coordinates, zoom: 16.5, pitch: 0, bearing: 0 }); }, layer);
  await page.waitForFunction(() => CORE_EARTH.state.map.queryRenderedFeatures({ layers: ['urban-agents'] }).length > 0, null, { timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => !CORE_EARTH.state.map.isMoving(), null, { timeout: 30000 }); await page.waitForTimeout(500);
}
const panelText = page => page.locator('#ea-panel').innerText();
// Geometry is measured after the panel's entry animation (a brief translate) has settled.
const settle = async page => { await page.waitForFunction(() => document.getElementById('ea-panel').getAnimations({ subtree: true }).every(a => a.playState !== 'running'), null, { timeout: 10000 }); await page.waitForTimeout(300); };

try {
  // Desktop: dossier for an agent with recorded work, selected by a real click on its map symbol.
  { const { context, page, writes } = await open('desktop', { width: 1440, height: 1000 });
    // A private demonstration draft on the same mission, as the SF tour would save it (R1 covers the real tour path).
    await page.addInitScript(() => { if (!localStorage.getItem('core.contrib.v1')) localStorage.setItem('core.contrib.v1', JSON.stringify([{ id: 'cr2demo', at: new Date().toISOString(), mission: 'mission.sf.mobility', kind: 'hypothesis', title: 'Green ratio near Folsom', text: 'Maybe test a different green ratio after real counts.', place: null, structuredBy: 'deterministic', state: 'private', demonstration: true, sharedAs: null }])); });
    await page.goto(base + 'me.html#contributions', { waitUntil: 'domcontentloaded' });
    await page.locator('.lc-related').waitFor({ timeout: 30000 });
    const me = await page.locator('[data-life]').innerText();
    check('My CORE links the draft to the recorded investigation of the same mission', /Related recorded investigation/i.test(me) && /the agents did not analyse your text/.test(me));
    await page.locator('[data-life]').screenshot({ path: `${dir}/desktop-mycore-related.png` });
    await enterSF(page, 'hybrid');
    // project() is canvas-relative; symbols are anchored at the bottom, so click inside the figure, as a person would.
    const pt = await page.evaluate(() => { const m = CORE_EARTH.state.map, f = m.queryRenderedFeatures({ layers: ['urban-agents'] })[0]; if (!f) return null; const p = m.project(f.geometry.coordinates), r = m.getCanvas().getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y - 10, id: f.properties.id }; });
    if (pt) await page.mouse.click(pt.x, pt.y);
    check('agent symbols rendered on the map', !!pt);
    await page.waitForFunction(() => /Registry status/.test(document.querySelector('#ea-panel')?.innerText || ''), null, { timeout: 20000 });
    const clicked = await panelText(page); fs.writeFileSync(`${dir}/desktop-map-click-panel.txt`, clicked);
    check('map click opens the agent with records and status sources', /Records and status sources/i.test(clicked) && /Map state/i.test(clicked) && /Registry status/.test(clicked) && !/Agents near this point/i.test(clicked));
    check('map state names a source, not live telemetry', /no recorded or running task|a completion recorded in|scenario model task/.test(clicked));
    await page.screenshot({ path: `${dir}/desktop-map-click-agent.png` });
    await page.evaluate(id => CORE_EARTH.showAgent(id), WORK_AGENT);
    await page.waitForFunction(() => /calculate_scenarios/.test(document.querySelector('#ea-panel')?.innerText || ''), null, { timeout: 20000 });
    const w = await panelText(page);
    check('recorded mission, tools, evidence and supervision shown', /Recorded local-model investigation/.test(w) && /calculate_scenarios/.test(w) && /F8/.test(w) && /model core-fluid-queue-1/.test(w) && /Pending; model review is not human approval/.test(w));
    check('dossier links the private contribution honestly', /1 private contribution\(s\) in this browser concern the same mission/.test(w) && /did not analyse them/.test(w));
    await page.locator('section.ar').screenshot({ path: `${dir}/desktop-agent-records.png` });
    // An identity with no recorded work: labels instead of invention.
    const idle = await page.evaluate(() => [...CORE_EARTH.state.records.byId.values()].find(a => a.city === 'san-francisco' && a.executionMode === 'simulated' && (() => { const r = CORE_EARTH.state.records.records(a.id); return !r.work.length && !r.urban.length && !r.civ.length; })()).id);
    await page.evaluate(id => CORE_EARTH.showAgent(id), idle);
    await page.waitForFunction(() => /No recorded mission for this agent/.test(document.querySelector('#ea-panel')?.innerText || ''), null, { timeout: 20000 });
    const i = await panelText(page);
    check('missing data labelled for an agent without records', /No tool execution recorded/.test(i) && /No evidence reference recorded/.test(i) && /Not recorded/.test(i));
    await page.locator('section.ar').screenshot({ path: `${dir}/desktop-agent-missing.png` });
    // Location inspector: a real click on an empty place in Hybrid View.
    const empty = await page.evaluate(() => { const m = CORE_EARTH.state.map, layers = ['markers', 'civ-agents', 'civ-hubs', 'civ-net-city', 'urban-clusters', 'urban-agents'].filter(l => m.getLayer(l)); const r = m.getCanvas().getBoundingClientRect(); for (let x = 300; x < 900; x += 37) for (let y = 150; y < 650; y += 41) if (!m.queryRenderedFeatures([x, y], { layers }).length && document.elementFromPoint(r.left + x, r.top + y)?.tagName === 'CANVAS') return { x: r.left + x, y: r.top + y }; return null; });
    check('found an empty map point', !!empty);
    await page.mouse.click(empty.x, empty.y);
    await page.waitForFunction(() => /Agents near this point/i.test(document.querySelector('#ea-panel')?.innerText || ''), null, { timeout: 20000 });
    const near = await panelText(page);
    { await settle(page); const r = await page.evaluate(() => ['#ea-panel', '.le-lang-floating'].map(s => { const x = document.querySelector(s).getBoundingClientRect(); return { x: x.x, y: x.y, width: x.width, height: x.height }; }));
      check('desktop: language selector does not cover the panel', !overlap(r[0], r[1])); }
    check('location inspector lists registered agents with distance and class', /registered agent\(s\) within 500 m/.test(near) && / m · /.test(near) && /510 registered identities, 501 assigned to San Francisco and 9/.test(near));
    await page.screenshot({ path: `${dir}/desktop-near.png` });
    await page.locator('#ea-panel [data-agent]').first().click();
    await page.waitForFunction(() => /Records and status sources/i.test(document.querySelector('#ea-panel')?.innerText || ''), null, { timeout: 20000 });
    check('agent selectable from the location list', true);
    // Keyboard path: the layer explainer offers "Agents near the map centre".
    await page.locator('#ea-layer-help').click();
    await page.locator('[data-near-centre]').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => /Agents near this point/i.test(document.querySelector('#ea-panel')?.innerText || ''), null, { timeout: 20000 });
    check('keyboard path to the location inspector', true);
    // Real Earth: an empty click does not open the agent inspector.
    await page.evaluate(() => { CORE_EARTH.setLayer('real', { intro: false }); document.getElementById('ea-panel').hidden = true; });
    await page.mouse.click(empty.x, empty.y); await page.waitForTimeout(800);
    check('Real Earth click does not open agent inspector', await page.evaluate(() => document.getElementById('ea-panel').hidden || !/Agents near this point/i.test(document.getElementById('ea-panel').innerText)));
    check('desktop: no network writes', writes.length === 0);
    await context.close(); }
  // Mobile: dossier legibility, no overflow, language selector clear of the panel, including the SF tour.
  { const { context, page, writes } = await open('mobile', { width: 390, height: 844 });
    await enterSF(page, 'hybrid');
    await page.evaluate(id => CORE_EARTH.showAgent(id), WORK_AGENT);
    await page.waitForFunction(() => /calculate_scenarios/.test(document.querySelector('#ea-panel')?.innerText || ''), null, { timeout: 20000 });
    const rects = async () => { await settle(page); return page.evaluate(() => ['#ea-panel', '.le-lang-floating'].map(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && { x: r.x, y: r.y, width: r.width, height: r.height }; })); };
    let [p, l] = await rects();
    check('mobile: language selector does not cover the agent panel', !overlap(p, l));
    check('mobile: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check('mobile: view switch reachable (not covered by the city status chip)', await page.evaluate(() => { const b = document.querySelector('#ea-layers [data-layer=hybrid]').getBoundingClientRect(); return !!document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('#ea-layers'); }));
    { const chip = await page.evaluate(() => { const e = document.getElementById('urban-status'); if (!e || e.hidden) return null; const x = e.getBoundingClientRect(); return { x: x.x, y: x.y, width: x.width, height: x.height }; }); check('mobile: language selector clear of the city status chip', !overlap(chip, l)); }
    await page.screenshot({ path: `${dir}/mobile-agent.png` });
    await page.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#ea-demo-cta').click(); await page.locator('.urban-tour').waitFor({ timeout: 90000 });
    for (let k = 0; k < 6; k++) await page.locator('[data-urban=next]').click();
    check('mobile tour reaches the review stop', /Recommendation: gather evidence/.test(await panelText(page)));
    [p, l] = await rects();
    check('mobile: language selector does not cover the SF tour review', !overlap(p, l));
    const others = await page.evaluate(() => ['.maplibregl-ctrl-attrib', '#ea-layers', '#ea-scales'].map(s => { const e = document.querySelector(s); if (!e || !e.offsetParent) return null; const x = e.getBoundingClientRect(); return { x: x.x, y: x.y, width: x.width, height: x.height }; }));
    check('mobile: language selector clear of attribution, layer switch and scale controls', others.every(o => !overlap(o, l)));
    await page.screenshot({ path: `${dir}/mobile-tour-review.png` });
    check('mobile: no network writes', writes.length === 0);
    await context.close(); }
  // Only the pre-existing loopback-only resume probe of src/civilization/client.mjs (disabled on public hosts by PUBLIC) is allowed.
  check('no private or local-only files requested beyond the loopback-only runtime probe', [...fetched].filter(u => u.includes('.core-local')).every(u => u === '/.core-local/civ/state.json'));
  check('published agent records fetched', ['/data/intelligence/work.json', '/data/urban/latest.json', '/data/civ/index.json', '/data/agents/sf-civilization.json'].every(u => fetched.has(u)));
  check('no browser page errors', errors.length === 0);
} finally {
  fs.writeFileSync(`${dir}/report.json`, JSON.stringify({ checks, errors, fetched: [...fetched].filter(u => u.startsWith('/data/') || u.includes('.core-local')).sort() }, null, 2));
  await browser.close();
}
console.log(`${checks.length}/${checks.length} browser checks passed`);
