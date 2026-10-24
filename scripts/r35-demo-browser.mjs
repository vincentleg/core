// Isolated CDP acceptance for R35 (Parallel World mission demonstration), real clicks on the public build.
// Desktop: CTA → 14 auto-advancing stages with blue step/total timers, pause/resume, camera on each stage target,
// avatar travel and pair, evidence and model panels, Real World handoff without agents, exit back to exploration.
// Mobile: reduced motion, fast skipping through the simulation stage (no stale scenario), layout, exit.
// Start a fresh browser first; screenshots are evidence of the visual reenactment, not of agent execution.
//   CORE_CDP_PORT=<port> node scripts/r35-demo-browser.mjs <base-url> <evidence-dir>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:8811/', dir = process.argv[3] || '.core-local/evidence/r35';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9261));
const checks = [], errors = [];
const check = (name, value) => { checks.push({ name, pass: !!value }); console.log(value ? 'PASS' : 'FAIL', name); assert.ok(value, name); };
const SHOTS = { introduce: 'agent-introduction', arrive: 'agent-movement', problem: 'problem-detection', exchange: 'collaboration', simulate: 'simulation', report: 'human-review-report' };

async function open(label, viewport, extra = {}) {
  const context = await browser.newContext({ viewport, ...extra });
  await context.addInitScript(() => { if (!sessionStorage.getItem('r35.init')) { sessionStorage.setItem('r35.init', '1'); localStorage.setItem('core.lang', 'en'); } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  return { context, page };
}
// Everything the checks need, read from the page in one call.
const probe = page => page.evaluate(() => {
  const E = CORE_EARTH, d = E.state.demo, m = E.state.map, el = document.querySelector('.mission-demo');
  const vis = id => m.getLayer(id) ? m.getLayoutProperty(id, 'visibility') !== 'none' : null;
  const c = m.getCenter();
  return { running: !!d?.state.running, i: d?.state.i, paused: d?.state.paused, mode: E.state.layer?.mode, panel: E.state.panelKind?.kind, panelHidden: document.getElementById('ea-panel').hidden,
    step: el?.querySelector('[data-step-pct]')?.textContent, total: el?.querySelector('[data-total-pct]')?.textContent, stepW: el?.querySelector('[data-stepbar]')?.style.width,
    title: el?.querySelector('h2')?.textContent, text: el?.innerText || '', center: [c.lng, c.lat], zoom: m.getZoom(),
    avatars: [...document.querySelectorAll('.demo-avatar')].map(a => !a.hidden && a.isConnected), route: !!m.getSource('demo-route'),
    urbanAgents: vis('urban-agents'), civ: ['civ-agents', 'civ-agents-label'].map(vis), plates: [...(E.state.plates?.values() || [])].filter(p => !p.getElement().hidden).length,
    sim: !!E.state.scn?.state?.on, overflow: document.documentElement.scrollWidth > innerWidth + 1,
    box: el ? (r => [r.left, r.top, r.right, r.bottom])(el.getBoundingClientRect()) : null, w: innerWidth, h: innerHeight };
});
const stages = page => page.evaluate(async () => (await import('./src/earth/demo.mjs')).STAGES.map(s => ({ id: s.id, to: s.to, real: !!s.real, pair: !!s.pair, panel: s.panel, travel: !!s.travel })));
const near = (a, b, tol) => Math.hypot((a[0] - b[0]) * Math.cos(b[1] * Math.PI / 180), a[1] - b[1]) * 111000 < tol;
const pct = s => Number(String(s).replace('%', ''));

try {
  { const { context, page } = await open('desktop', { width: 1440, height: 1000 });
    await page.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#ea-demo-cta').waitFor({ timeout: 60000, polling: 250 }); await page.locator('#ea-demo-cta').click();
    await page.waitForFunction(() => globalThis.CORE_EARTH?.state.demo?.state.running, null, { timeout: 180000, polling: 250 });
    const S = await stages(page);
    let p = await probe(page);
    check('CTA launches the mission demonstration in Parallel World at stage 1/14', p.i === 0 && p.mode === 'parallel' && /1\/14/.test(p.text) && /not live agent execution/.test(p.text));
    // Timer: step bar advances on the shared clock; pause freezes it; resume continues.
    await page.waitForFunction(() => parseFloat(document.querySelector('[data-stepbar]')?.style.width) > 20, null, { timeout: 20000, polling: 100 });
    await page.locator('.mission-demo [data-d="pause"]').click(); const a = await probe(page); await page.waitForTimeout(1500); const b = await probe(page);
    check('pause freezes step and total timers', a.paused && a.step === b.step && a.total === b.total && pct(a.step) > 0);
    await page.locator('.mission-demo [data-d="pause"]').click();
    const errs = []; page.on('response', r => { if (r.status() >= 400 && new URL(r.url()).host.startsWith('127.0.0.1')) errs.push(r.url()); });
    for (let i = 0; i < S.length; i++) {
      const st = S[i];
      // Pause from inside the page as soon as the stage is reached (mid-route for travel stages): software rendering is
      // too slow for a round-trip click to land reliably within a 7.6 s stage. The Pause button itself is checked above.
      await page.waitForFunction(([i, min]) => { const d = CORE_EARTH.state.demo; if (d.state.i !== i || d.state.elapsed / d.state.duration < min) return false; d.pause(); return true; }, [i, ['depart', 'arrive'].includes(st.id) ? 0.4 : st.id === 'introduce' ? 0.75 : 0], { timeout: 30000, polling: 20 });
      await page.waitForTimeout(400);
      if (st.id === 'simulate') await page.waitForFunction(() => CORE_EARTH.state.scn?.state?.on && CORE_EARTH.state.panelKind?.kind === 'simulation', null, { timeout: 60000, polling: 250 });
      p = await probe(page);
      const want = await page.evaluate(async i => { const D = await import('./src/earth/demo.mjs'), s = CORE_EARTH.state.demo.state; return D.cameraAt(D.STAGES[i], s.elapsed / s.duration); }, i);
      const total = pct(p.total), expected = Math.round((i + pct(p.step) / 100) / S.length * 100);
      check(`stage ${i + 1} ${st.id}: label ${i + 1}/14, paused, blue timers synchronized (step ${p.step}, total ${p.total})`, p.i === i && p.paused && p.text.includes(`${i + 1}/14`) && Math.abs(total - expected) <= 1);
      check(`stage ${i + 1} ${st.id}: camera tracks stage target`, near(p.center, want.center, want.zoom > 14 ? 60 : 5000) && Math.abs(p.zoom - want.zoom) < 0.3);
      const wantAvatars = !st.real && i >= 2 ? (st.pair ? 2 : 1) : 0;
      check(`stage ${i + 1} ${st.id}: ${wantAvatars} visible agent avatar(s), mode ${st.real ? 'real' : 'parallel'}`, p.avatars.filter(Boolean).length === wantAvatars && p.mode === (st.real ? 'real' : 'parallel'));
      if (st.panel !== 'none') check(`stage ${i + 1} ${st.id}: side panel open (${p.panel})`, !p.panelHidden);
      if (st.travel) { const d = await page.evaluate(() => { const m = CORE_EARTH.state.map, c = m.project(m.getCenter()), r = [...document.querySelectorAll('.demo-avatar')].find(x => !x.hidden).getBoundingClientRect(), o = m.getContainer().getBoundingClientRect(); return Math.hypot((r.left + r.right) / 2 - o.left - c.x, r.bottom - o.top - c.y); });
        check(`stage ${i + 1} ${st.id}: camera follows the moving avatar (${Math.round(d)} px from view centre)`, d < 40); }
      if (st.id === 'arrive') { const pos = await page.evaluate(() => [...document.querySelectorAll('.demo-avatar')][0] && CORE_EARTH.state.map.project([-122.404431251, 37.779440335]));
        check('movement: route line drawn while the agent travels', p.route && !!pos); }
      if (['exchange', 'synthesize'].includes(st.id)) check(`stage ${i + 1}: recorded findings F4–F8 referenced, labelled scripted`, /F4 \/ F5/.test(p.text) && /F6 \/ F7 \/ F8/.test(p.text) && /Scripted exchange/.test(p.text));
      if (['candidates', 'simulate', 'compare'].includes(st.id)) check(`stage ${i + 1}: verified model comparison, no real-world recommendation`, /s\/arrival/.test(p.text) && /not a real-world recommendation/.test(p.text));
      if (st.id === 'simulate') check('simulation stage shows the recorded scenario overlay', p.sim);
      if (st.id === 'compare') check('scenario overlay removed after the simulation stage', !p.sim);
      if (['report', 'reality'].includes(st.id)) check(`stage ${i + 1}: human-review gate stated, no action authorized`, /No real-world action authorized/.test(p.text) && /Open research dossier/.test(p.text));
      if (st.real) check('Real World: no urban/civ agents, plates or demo avatars', p.urbanAgents !== true && p.civ.every(v => v !== true) && p.plates === 0 && !p.avatars.some(Boolean) && /Verified real-world resolution: none/.test(p.text) && /REAL WORLD · MISSION HANDOFF/.test(p.text));
      if (SHOTS[st.id]) await page.screenshot({ path: `${dir}/desktop-${Object.keys(SHOTS).indexOf(st.id) + 1}-${SHOTS[st.id]}.png` });
      await page.evaluate(() => CORE_EARTH.state.demo.resume());
    }
    await page.waitForFunction(() => CORE_EARTH.state.demo.state.done, null, { timeout: 30000, polling: 100 });
    console.log('local 4xx', JSON.stringify(errs));
    check('final stage stays open at 100% without looping', (await probe(page)).total === '100%');
    await page.locator('.mission-demo [data-d="exit"]').last().click();
    p = await probe(page);
    check('exit removes demo, avatars and route; restores Parallel World exploration', !p.running && !p.text && p.avatars.length === 0 && !p.route && p.mode === 'parallel' && p.panelHidden && !p.sim);
    await context.close();
  }
  { const { context, page } = await open('mobile', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await page.goto(base + 'world.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#ea-demo-cta').waitFor({ timeout: 60000, polling: 250 }); await page.locator('#ea-demo-cta').tap();
    await page.waitForFunction(() => globalThis.CORE_EARTH?.state.demo?.state.running, null, { timeout: 180000, polling: 250 });
    let p = await probe(page);
    check('mobile: demonstration launches, no horizontal overflow, caption inside viewport', p.i === 0 && !p.overflow && p.box[0] >= 0 && p.box[2] <= p.w + 1 && p.box[3] <= p.h + 1);
    await page.locator('.mission-demo [data-d="next"]').tap(); await page.locator('.mission-demo [data-d="next"]').tap();
    await page.evaluate(() => CORE_EARTH.state.demo.pause()); await page.waitForTimeout(800);
    const agentBox = await page.evaluate(() => { const a = [...document.querySelectorAll('.demo-avatar')].find(x => !x.hidden)?.getBoundingClientRect(), c = document.querySelector('.mission-demo').getBoundingClientRect(); return a && { a: a.bottom, top: a.top, cap: c.top, i: CORE_EARTH.state.demo.state.i }; });
    check(`mobile: agent avatar visible above the caption (stage ${agentBox?.i + 1})`, agentBox && agentBox.top > 0 && agentBox.a <= agentBox.cap);
    await page.screenshot({ path: `${dir}/mobile-agent.png` });
    const btn = await page.locator('.mission-demo [data-d="next"]').boundingBox();
    check('mobile: controls at least 44 px tall', btn.height >= 44);
    // Reduced motion: 2.2 s stages keep auto-advancing between taps, so tap until the simulation stage is reached.
    while ((await probe(page)).i < 9) await page.locator('.mission-demo [data-d="next"]').tap();
    // Skip past the simulation before its scenario resolves (two Next actions in one task): no stale overlay or sheet may remain.
    await page.evaluate(() => { const d = CORE_EARTH.state.demo; d.pause(); d.next(); d.next(); d.pause(); });
    await page.waitForTimeout(6000); p = await probe(page);
    check('mobile: fast skip past simulation leaves no stale scenario; caption is the only sheet', p.i === 11 && !p.sim && p.panelHidden && /not a real-world recommendation/.test(p.text) && !p.overflow);
    await page.evaluate(() => { const d = CORE_EARTH.state.demo; d.next(); d.pause(); }); await page.waitForTimeout(800); p = await probe(page);
    check('mobile: human-review stage readable in the caption', p.i === 12 && /No real-world action authorized/.test(p.text) && p.panelHidden);
    await page.screenshot({ path: `${dir}/mobile-report.png` });
    await page.evaluate(() => { const d = CORE_EARTH.state.demo; d.next(); d.pause(); }); await page.waitForTimeout(800); p = await probe(page);
    check('mobile: Real World handoff hides all agents', p.i === 13 && p.mode === 'real' && !p.avatars.some(Boolean) && p.urbanAgents !== true && p.civ.every(v => v !== true) && p.plates === 0);
    await page.screenshot({ path: `${dir}/mobile-real-world.png` });
    await page.locator('.mission-demo [data-d="exit"]').last().tap(); p = await probe(page);
    check('mobile: exit restores Parallel World with no demo residue', !p.running && p.avatars.length === 0 && !p.route && p.mode === 'parallel' && !p.sim && !p.overflow);
    await context.close();
  }
  check('zero page errors', errors.length === 0);
} finally {
  fs.writeFileSync(`${dir}/results.json`, JSON.stringify({ checks, errors }, null, 2));
  console.log(`RESULTS ${checks.filter(c => c.pass).length}/${checks.length} errors=${errors.length}`); for (const e of errors) console.log('ERROR', e);
  await browser.close().catch(() => {});
}
