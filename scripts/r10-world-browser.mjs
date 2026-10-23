// Local R10 acceptance for Gates B–D: agent mission card (map click and direct), execution classes, the visitor's
// proposals layer (CORE World / Hybrid only), the view legend, panel geometry, My CORE provenance and review request.
//   node scripts/r10-world-browser.mjs <base serving public/> [output dir]   (browser you started, CORE_CDP_PORT)
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8794/';
const dir = process.argv[3] || '.core-local/evidence/r10-world';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9261));
const checks = [], errors = [], writes = [];
const check = (name, value) => { checks.push({ name, pass: !!value }); console.log(value ? 'PASS' : 'FAIL', name); assert.ok(value, name); };
const WORK_AGENT = 'core.san-francisco.housing.lead', PLACE = [-122.4072, 37.7801];
const SEED = JSON.stringify([{ id: 'cr10demo', at: '2026-10-23T09:00:00.000Z', mission: 'mission.sf.mobility', kind: 'idea', title: 'Bus priority at 5th and Folsom', text: 'A proposal to test, not an observation.', place: PLACE, structuredBy: 'deterministic', state: 'private' }]);

async function open(label, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', acceptDownloads: true });
  await context.addInitScript(seed => { localStorage.setItem('core.lang', 'en'); localStorage.setItem('core.layerintro.v1', '["real","agents","hybrid"]'); if (!localStorage.getItem('core.contrib.v1')) localStorage.setItem('core.contrib.v1', seed); }, SEED);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  page.on('request', r => { if (!['GET', 'HEAD'].includes(r.method())) writes.push(`${r.method()} ${r.url()}`); });
  return { context, page };
}
async function enterSF(page, layer) {
  await page.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => globalThis.CORE_EARTH?.state.map && CORE_EARTH.state.ready, null, { timeout: 90000 });
  await page.evaluate(() => CORE_EARTH.start());
  await page.waitForFunction(() => !!CORE_EARTH.state.urban && !!CORE_EARTH.state.layer, null, { timeout: 90000 });
  await page.evaluate(() => CORE_EARTH.state.map.jumpTo({ center: [-122.41, 37.777], zoom: 15 }));
  await page.waitForFunction(() => CORE_EARTH.state.urban.city.positions.length >= 50, null, { timeout: 30000 });
  await page.evaluate(l => { CORE_EARTH.setLayer(l, { intro: false }); CORE_EARTH.state.map.jumpTo({ center: CORE_EARTH.state.urban.city.positions[0].coordinates, zoom: 16.5, pitch: 0, bearing: 0 }); }, layer);
  await page.waitForFunction(() => CORE_EARTH.state.map.queryRenderedFeatures({ layers: ['urban-agents'] }).length > 0, null, { timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => !CORE_EARTH.state.map.isMoving(), null, { timeout: 30000 }); await page.waitForTimeout(500);
}
const settle = async page => { await page.waitForFunction(() => document.getElementById('ea-panel').getAnimations({ subtree: true }).every(a => a.playState !== 'running'), null, { timeout: 10000 }); await page.waitForTimeout(300); };
const geometry = page => page.evaluate(() => { const p = document.getElementById('ea-panel'), r = p.getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top, bottom: r.bottom, vw: innerWidth, vh: innerHeight, hOverflow: [...p.querySelectorAll('*')].some(n => n.scrollWidth > n.clientWidth + 2 && getComputedStyle(n).overflowX === 'visible' && n.getBoundingClientRect().right > r.right + 2), docOverflow: document.documentElement.scrollWidth > innerWidth + 1 }; });

try {
  for (const [label, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const { context, page } = await open(label, viewport);
    await enterSF(page, 'hybrid');
    await page.waitForFunction(() => !!CORE_EARTH.state.records, null, { timeout: 30000 });
    const legend = await page.locator('#ea-view-legend').innerText().catch(() => '');
    if (label === 'desktop') check(`${label}: Hybrid legend names replay, recorded work, proposals and the real map`, /replay/.test(legend) && /recorded work/.test(legend) && /your proposals/.test(legend) && /real map/.test(legend));
    const ring = await page.evaluate(() => CORE_EARTH.state.map.getLayer('civ-agents-rec') && CORE_EARTH.state.map.getSource('civ-agents') ? true : false);
    check(`${label}: recorded-work ring layer exists`, ring);
    // A real click on a mapped agent symbol opens the mission card first.
    // Tap a symbol whose point is uncovered map canvas (as a person would), not one hidden under a control.
    const pt = await (await page.waitForFunction(() => { const m = CORE_EARTH.state.map, r = m.getCanvas().getBoundingClientRect(); for (const f of m.queryRenderedFeatures({ layers: ['urban-agents'] })) { const p = m.project(f.geometry.coordinates), x = r.left + p.x, y = r.top + p.y - 10; if (document.elementFromPoint(x, y) === m.getCanvas()) return { x, y }; } return null; }, null, { timeout: 20000 }).catch(() => null))?.jsonValue();
    check(`${label}: agent symbols rendered`, !!pt);
    if (label === 'mobile') { await page.screenshot({ path: `${dir}/mobile-hybrid-map.png` }); const lg = await page.locator('#ea-view-legend').boundingBox(); check('mobile: view legend stays compact and lets taps through', lg && lg.height <= 60 && await page.locator('#ea-view-legend').evaluate(n => getComputedStyle(n).pointerEvents === 'none')); }
    // Symbols move; a tap can miss a moving figure. Retry like a person would and record what each missed tap opened.
    const misses = [];
    for (let i = 0; i < 3; i++) {
      const at = i ? await page.evaluate(() => { const m = CORE_EARTH.state.map, r = m.getCanvas().getBoundingClientRect(); for (const f of m.queryRenderedFeatures({ layers: ['urban-agents'] })) { const p = m.project(f.geometry.coordinates), x = r.left + p.x, y = r.top + p.y - 10; if (document.elementFromPoint(x, y) === m.getCanvas()) return { x, y }; } return null; }) : pt;
      await page.mouse.click(at.x, at.y);
      if (await page.locator('#ea-panel .ao-card').waitFor({ timeout: 8000 }).then(() => true, () => false)) break;
      misses.push((await page.locator('#ea-panel').textContent().catch(() => '')).slice(0, 80));
    }
    fs.writeFileSync(`${dir}/${label}-tap-misses.json`, JSON.stringify(misses, null, 2));
    await page.locator('#ea-panel .ao-card').waitFor({ timeout: 2000 }); await settle(page);
    const card = await page.locator('#ea-panel .ao-card').innerText(), exec = await page.locator('#ea-panel .ao-card').getAttribute('data-exec');
    check(`${label}: map click shows mission card with execution class`, ['recorded', 'replay', 'inactive'].includes(exec) && ['Responsibility', 'Why here', 'Problem', 'Evidence', 'Tools', 'Human review', 'History'].every(k => card.includes(k)));
    check(`${label}: no agent is shown as live`, exec !== 'live' && !/Live execution/.test(card));
    const firstSection = await page.evaluate(() => { const b = document.getElementById('ea-panel-body'), h = b.querySelector('header'), c = b.querySelector('.ao-card'); return !!c && (!h || h.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) && c.getBoundingClientRect().top < innerHeight; });
    check(`${label}: mission card is visible directly under the header`, firstSection);
    const g = await geometry(page); fs.writeFileSync(`${dir}/${label}-geometry.json`, JSON.stringify(g, null, 2));
    check(`${label}: panel fits the viewport without horizontal overflow`, g.bottom <= g.vh + 1 && g.top >= 0 && !g.hOverflow && !g.docOverflow);
    if (label === 'desktop') check('desktop: agent panel leaves most of the map visible (≤ 32% width)', g.w <= g.vw * 0.32);
    await page.screenshot({ path: `${dir}/${label}-hybrid-agent.png` });
    // An agent with published recorded work.
    await page.evaluate(id => CORE_EARTH.showAgent(id), WORK_AGENT); await page.locator('#ea-panel .ao-card[data-exec="recorded"]').waitFor({ timeout: 20000 });
    check(`${label}: recorded agent card names its recorded source`, /data\/(intelligence|urban|civ)\//.test(await page.locator('#ea-panel .ao-card').innerText()));
    // The visitor's proposal: visible in Hybrid/CORE World, absent from Real Earth.
    await page.locator('#ea-panel [data-close="ea-panel"]').click(); // a person closes the sheet before tapping the map
    await page.evaluate(p => { CORE_EARTH.state.map.jumpTo({ center: p, zoom: 16.5 }); }, PLACE); await page.waitForFunction(() => !CORE_EARTH.state.map.isMoving()); await page.waitForTimeout(600);
    const prop = await (await page.waitForFunction(() => { const m = CORE_EARTH.state.map, f = m.queryRenderedFeatures({ layers: ['my-proposals'] })[0]; if (!f) return null; const p = m.project(f.geometry.coordinates), r = m.getCanvas().getBoundingClientRect(); const x = r.left + p.x, y = r.top + p.y; return { x, y, top: document.elementFromPoint(x, y)?.outerHTML.slice(0, 200) }; }, null, { timeout: 10000 }).catch(() => null))?.jsonValue();
    if (!prop) fs.writeFileSync(`${dir}/${label}-proposal-diagnostics.json`, JSON.stringify(await page.evaluate(() => { const m = CORE_EARTH.state.map; return { layer: !!m.getLayer('my-proposals'), visibility: m.getLayoutProperty('my-proposals', 'visibility'), features: m.getSource('my-proposals')?.serialize?.().data?.features?.length, zoom: m.getZoom(), center: m.getCenter(), mode: CORE_EARTH.state.layer?.mode }; }), null, 2));
    check(`${label}: own proposal drawn in Hybrid View`, !!prop);
    await page.mouse.click(prop.x, prop.y); await page.waitForFunction(() => /Your proposal/.test(document.getElementById('ea-panel')?.textContent || ''), null, { timeout: 10000 });
    const pp = await page.locator('#ea-panel').innerText();
    check(`${label}: proposal panel says proposed, private, not analysed`, /Proposed · not evidence/.test(pp) && /private to this browser/.test(pp) && /has not been analysed by any agent/.test(pp));
    await page.evaluate(() => CORE_EARTH.setLayer('real', { intro: false })); await page.waitForTimeout(300);
    check(`${label}: Real Earth hides proposals`, await page.evaluate(() => CORE_EARTH.state.map.getLayoutProperty('my-proposals', 'visibility') === 'none'));
    if (label === 'desktop') check('desktop: Real Earth legend says sourced data only', /sourced map data/.test(await page.locator('#ea-view-legend').innerText()));
    await page.evaluate(() => CORE_EARTH.setLayer('agents', { intro: false })); await page.waitForTimeout(300);
    check(`${label}: CORE World shows proposals`, await page.evaluate(() => CORE_EARTH.state.map.getLayoutProperty('my-proposals', 'visibility') === 'visible'));
    await page.screenshot({ path: `${dir}/${label}-coreworld.png` });
    // My CORE: provenance, link back to the mission, and a review request that CORE does not send.
    await page.goto(base + 'me.html#contributions', { waitUntil: 'domcontentloaded' }); await page.locator('[data-life] .lc-prov').waitFor({ timeout: 30000 });
    const prov = await page.locator('[data-life] .lc-prov').innerText();
    check(`${label}: My CORE shows provenance and storage boundary`, /Provenance/.test(prov) && /stored only in this browser/.test(prov) && /history verified/.test(prov) && /37\.7801, -122\.4072/.test(prov));
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-life-packet]').click()]);
    const packet = JSON.parse(fs.readFileSync(await download.path(), 'utf8')); fs.writeFileSync(`${dir}/${label}-review-request.json`, JSON.stringify(packet, null, 2));
    const owner = await page.evaluate(() => JSON.parse(localStorage.getItem('core.lifecycle.v1') || '{}').owner);
    check(`${label}: review request is pseudonymous, honest and changes nothing`, packet.format === 'core.review-request.v1' && !JSON.stringify(packet).includes(owner) && packet.lifecycle.integrity.ok && packet.relatedRecordedInvestigation?.analysedContribution !== true);
    await page.locator('[data-life]').screenshot({ path: `${dir}/${label}-mycore.png` });
    await context.close();
  }
  check('no browser page errors', errors.length === 0);
  check('no network writes', writes.length === 0);
} finally {
  fs.writeFileSync(`${dir}/report.json`, JSON.stringify({ base, at: new Date().toISOString(), checks, errors, writes }, null, 2) + '\n');
  await browser.close();
}
