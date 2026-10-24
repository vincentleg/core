// Isolated CDP acceptance for R28 (supervised execution): one real-click desktop journey — mission → plan review →
// refused without authorization → authorized step-by-step local execution (pause/resume) → findings, disagreements,
// unresolved requirements → save in My CORE → scenario workbench → stored re-open → cancel and retry → human review
// hand-off to My CORE (R29: the review request is the existing My CORE one; updated in R30) — and one
// mobile journey from an agent brief. Start a fresh browser and a loopback server first. Serve the source tree to test
// the local-model path on this computer, or public/ (local model stripped from the CSP) to test the unavailable path.
//   CORE_CDP_PORT=<port> node scripts/r28-execution-browser.mjs <desktop-base-url> <mobile-base-url> <evidence-dir>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const desk = process.argv[2] || 'http://127.0.0.1:8798/', mob = process.argv[3] || 'http://127.0.0.1:8797/';
const dir = process.argv[4] || '.core-local/evidence/r28-execution';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:' + (process.env.CORE_CDP_PORT || 9259));
const checks = [], errors = [];
const check = (name, value) => { checks.push({ name, pass: !!value }); console.log(value ? 'PASS' : 'FAIL', name); assert.ok(value, name); };
const note = (name, value) => { checks.push({ name, pass: !!value, informational: true }); console.log(value ? 'NOTE+' : 'NOTE-', name); };
const panelText = page => page.locator('#ea-panel').innerText();
const waitPanel = (page, re, timeout = 60000) => page.waitForFunction(s => new RegExp(s, 'i').test(document.querySelector('#ea-panel')?.innerText || ''), re.source, { timeout });
let current = null;
const TILE_HOSTS = ['tiles.openfreemap.org', 's3.amazonaws.com', 'gibs.earthdata.nasa.gov'];

async function open(label, viewport, extra = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', acceptDownloads: true, ...extra }), writes = [], hosts = new Set();
  await context.addInitScript(() => { localStorage.setItem('core.lang', 'en'); localStorage.setItem('core.layerintro.v1', '["real","agents","hybrid"]'); });
  const page = await context.newPage(); current = page;
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  page.on('request', r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol)) hosts.add(u.host); if (!['GET', 'HEAD'].includes(r.method())) writes.push(`${r.method()} ${r.url()}`); });
  return { context, page, writes, hosts };
}
const statusOf = page => page.locator('#ea-panel .ex-mode .ex-st').first().innerText();

try {
  { const { context, page, writes, hosts } = await open('desktop', { width: 1440, height: 1000 });
    await page.goto(desk + 'world.html#intel=mission.sf.mobility', { waitUntil: 'domcontentloaded' });
    await waitPanel(page, /Mission investigation/, 120000);
    // 1. An existing geographic problem: the recorded investigation is labelled a replay; execution is a separate action.
    check('mission investigation separates recorded replay from execution', /recorded replay; an execution runs new tool calls/.test(await panelText(page)));
    await page.locator('#ea-panel button[data-exec-mission="mission.sf.mobility"]').first().click();
    await waitPanel(page, /Plan only: nothing has run/);
    // 2. Review the plan.
    const plan = await panelText(page); fs.writeFileSync(`${dir}/desktop-plan.txt`, plan);
    check('plan lists eight tasks with agents, tools, permissions and dependencies', ['T1', 'T4', 'T6', 'T8'].every(t => plan.includes(t)) && /sim\.sweep/.test(plan) && /compute-local/.test(plan) && /after T2, T3, T4, T5/.test(plan) && /Plan only: nothing has run/.test(plan));
    const modelOn = /AI reasoning: available \(/.test(plan); note(`desktop AI reasoning ${modelOn ? 'available' : 'unavailable'} on ${desk}`, modelOn);
    await page.locator('.ex-perm summary').click();
    const perm = await page.locator('.ex-perm').innerText();
    check('denied permissions are shown', ['Unapproved network access', 'Arbitrary shell commands', 'External communications', 'Real-world actions'].every(s => perm.includes(s)) && (perm.match(/denied/g) || []).length >= 6);
    await page.screenshot({ path: `${dir}/desktop-plan.png` });
    // Refused without explicit authorization.
    await page.locator('#ex-run').click();
    check('nothing runs without authorization', /Tick the authorization box first/.test(await page.locator('#ex-form-msg').innerText()) && await page.locator('#ex-controls').count() === 0);
    // 3. Authorize a bounded execution with an edited assumption, step by step.
    await page.locator('#ex-green1').fill('60');
    await page.locator('#ex-step').check(); await page.locator('#ex-consent').check();
    const before = hosts.size; await page.locator('#ex-run').click();
    await waitPanel(page, /Local execution in this browser/);
    await page.waitForFunction(() => /Paused/.test(document.querySelector('#ea-panel .ex-mode')?.innerText || ''), null, { timeout: 30000 });
    const p1 = await panelText(page); fs.writeFileSync(`${dir}/desktop-paused.txt`, p1);
    check('4. genuine progress: paused after T1 with one recorded tool call', /1\/8 tasks done · 1 tool calls/i.test(p1) && /Resume/.test(p1));
    await page.screenshot({ path: `${dir}/desktop-paused.png` });
    // Resume through the tasks; observe the model step running if a model is available.
    let sawRunningT7 = false; const ex = () => page.evaluate(() => { const s = CORE_EARTH.state.exec.ctl.state; return { status: s.status, calls: s.calls.length, next: s.tasks.find(t => t.status === 'queued')?.id }; });
    for (let k = 0, x = await ex(); k < 12 && x.status === 'paused'; k++, x = await ex()) {
      await page.locator('#ex-controls [data-exec="resume"]').click();
      if (x.next === 'T7' && modelOn) { await page.waitForFunction(() => /T7[^\n]*Running/.test(document.querySelector('#ea-panel .ex-tasks')?.innerText || ''), null, { timeout: 30000 }); sawRunningT7 = true; await page.screenshot({ path: `${dir}/desktop-model-running.png` }); }
      await page.waitForFunction(n => { const s = CORE_EARTH.state.exec.ctl.state; return s.calls.length > n && s.status !== 'running'; }, x.calls, { timeout: 180000, polling: 100 });
    }
    await waitPanel(page, /Findings of this execution/, 60000);
    const res = await panelText(page); fs.writeFileSync(`${dir}/desktop-result.txt`, res);
    check('execution completed with eight tasks', /Completed/.test(await statusOf(page)) && /[78]\/8 tasks done/i.test(res));
    if (modelOn) { note('model step observed running', sawRunningT7); check('model step labelled: validated hypotheses or a rejection, never silent', /Model-generated hypothesis/.test(res) || /rejected by validation|exceeded/.test(res)); }
    else check('model step reported unavailable, nothing replaces it', /T7[\s\S]{0,120}Unavailable/.test(res) && /AI reasoning: unavailable/.test(res));
    // 6. Findings, uncertainty, disagreements, requirements, gate.
    check('findings typed by provenance with assumptions and uncalibrated computations', /Your assumption/.test(res) && /green 60 %/.test(res) && /Computed, uncalibrated/.test(res) && /Recomputed recorded F8/.test(res));
    check('recorded-run items kept apart from this execution', /Items read from the recorded run \(\d+\), not produced by this execution/i.test(res));
    check('independent disagreements and unresolved requirements', /Is the lower modelled delay evidence for a real-world change\?/.test(res) && /How large is the green-time effect\?/.test(res) && /Unresolved scientific requirements \(7\)/i.test(res) && /Observed traffic measurements/.test(res));
    check('conclusions are proposals awaiting human review', /proposed — awaiting human review/.test(res) && /Awaiting human review\./.test(res) && /Code cannot accept these conclusions/.test(res));
    await page.locator('.ex-log summary').click();
    check('tool-call log shows resources and digests', /data\/urban\/catalog\.json/.test(await page.locator('.ex-log').innerText()) && /in [a-f0-9]{10} · out [a-f0-9]{10}/.test(await page.locator('.ex-log').innerText()));
    await page.screenshot({ path: `${dir}/desktop-result.png`, fullPage: false });
    // R29: nothing is stored until the person saves it.
    check('nothing stored before saving', await page.evaluate(() => !localStorage.getItem('core.executions.v1')));
    await page.locator('#ea-panel [data-exec="save"]').click(); await waitPanel(page, /Saved in My CORE \(this browser only\)/);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('core.executions.v1')).at(-1).report);
    check('report stored only in this browser, local-execution mode, new id, user assumption kept', stored.mode === 'local-execution' && stored.execution !== stored.reads.recordedRun && stored.calls.every(c => /^[a-f0-9]{64}$/.test(c.outputDigest)) && stored.calls.find(c => c.tool === 'sim.compare').input.scenarios[1].parameters.green === 0.6 && stored.review.accepted === false);
    fs.writeFileSync(`${dir}/report.json`, JSON.stringify(stored, null, 2));
    const extra = [...hosts].filter(h => h !== new URL(desk).host && h !== '127.0.0.1:11434' && !TILE_HOSTS.includes(h));
    check('execution contacted no host beyond this site, map tiles and the local model', extra.length === 0 && writes.every(w => w === 'POST http://127.0.0.1:11434/api/chat'));
    console.log('hosts', before, [...hosts].join(' '), 'writes', writes.length);
    // 7. Scenario workbench.
    await page.locator('#ea-panel [data-urban="workbench"]').click();
    await waitPanel(page, /Run actual model/);
    check('scenario workbench opens from the report', true);
    // Re-open the stored execution: labelled, not re-run.
    await page.evaluate(() => { location.hash = ''; }); await page.evaluate(() => { location.hash = 'intel=mission.sf.mobility'; }); await waitPanel(page, /Mission investigation/);
    await page.locator('#ea-panel button[data-exec-mission="mission.sf.mobility"]').first().click(); await waitPanel(page, /Saved in My CORE \(this browser\)/);
    await page.locator('[data-exec-open]').first().click(); await waitPanel(page, /re-opened from this browser: not re-run/);
    check('stored execution re-opened with its label and no new tool call', /not re-run/.test(await panelText(page)) && await page.locator('#ex-controls button').count() === 0);
    // 5. Cancel and recover.
    await page.locator('#ea-panel [data-exec="plan"]').last().click(); await waitPanel(page, /Plan only: nothing has run/);
    await page.locator('#ex-step').check(); await page.locator('#ex-consent').check(); await page.locator('#ex-run').click();
    await page.waitForFunction(() => /Paused/.test(document.querySelector('#ea-panel .ex-mode')?.innerText || ''), null, { timeout: 30000 });
    await page.locator('#ex-controls [data-exec="cancel"]').click(); await waitPanel(page, /Retry unfinished tasks/);
    const c = await panelText(page);
    check('cancel stops the run: remaining tasks cancelled, report incomplete', /Cancelled/.test(await statusOf(page)) && (c.match(/Cancelled/g) || []).length >= 7 && /No report was composed/.test(c));
    await page.locator('#ex-controls [data-exec="retry"]').click();
    await page.waitForFunction(() => /Paused/.test(document.querySelector('#ea-panel .ex-mode')?.innerText || ''), null, { timeout: 30000 });
    check('retry resumes the unfinished tasks in the same execution', /2\/8 tasks done/i.test(await panelText(page)));
    await page.locator('#ex-controls [data-exec="cancel"]').click();
    // 8. Human review: hand-off to My CORE, where the saved investigation is verified and its review request prepared.
    await page.goto(desk + `world.html#exec=${stored.execution}`, { waitUntil: 'domcontentloaded' }); await waitPanel(page, /re-opened from this browser: not re-run/, 120000);
    await page.locator('#ea-panel [data-exec="review"]').click(); await page.waitForURL(/me\.html#investigation=/);
    const item = page.locator(`[data-inv="${stored.execution}"]`); await item.waitFor({ timeout: 30000 });
    await page.waitForFunction(i => /Integrity verified/.test(document.querySelector(`[data-inv="${i}"]`)?.innerText || ''), stored.execution, { timeout: 30000 });
    check('review hands off to My CORE: saved investigation verified, review request can be prepared, nothing sent', await item.locator('[data-inv-review]').count() === 1 && writes.every(w => w === 'POST http://127.0.0.1:11434/api/chat'));
    await context.close(); }
  // Mobile, public build: from an agent brief, run without a model; touch targets and overflow.
  { const { context, page, writes } = await open('mobile', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(mob + 'world.html#intel=mission.sf.mobility', { waitUntil: 'domcontentloaded' });
    await waitPanel(page, /Mission investigation/, 120000);
    await page.locator('[data-mi-jump="mi-agents"]').tap();
    await page.locator('#mi-agents [data-agent]').first().tap(); await waitPanel(page, /Mission responsibility/);
    const b = page.locator('#ea-panel button', { hasText: 'Plan a supervised execution with this agent' }); await b.scrollIntoViewIfNeeded(); await b.tap();
    await waitPanel(page, /Plan only: nothing has run/);
    check('mobile: plan opened from an agent; AI reasoning unavailable on the public build', /AI reasoning: unavailable/.test(await panelText(page)));
    await page.locator('#ex-consent').tap(); const run = page.locator('#ex-run'); await run.scrollIntoViewIfNeeded();
    const box = await run.boundingBox(); check('mobile: authorize button ≥ 44 px and inside the viewport', box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 390);
    await run.tap(); await waitPanel(page, /Findings of this execution/);
    const t = await panelText(page);
    check('mobile: completed locally with T7 unavailable', /Completed/.test(await statusOf(page)) && /7\/8 tasks done/i.test(t) && /T7[\s\S]{0,120}Unavailable/.test(t));
    const rb = page.locator('#ea-panel [data-exec="review"]'); await rb.scrollIntoViewIfNeeded(); const rbb = await rb.boundingBox();
    check('mobile: review action ≥ 44 px', rbb && rbb.height >= 44 && rbb.x + rbb.width <= 390);
    check('mobile: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.getElementById('ea-panel').scrollWidth <= document.getElementById('ea-panel').clientWidth + 1));
    await page.screenshot({ path: `${dir}/mobile-result.png` });
    check('mobile: no network writes', writes.length === 0);
    await context.close(); }
  check('no page errors', errors.length === 0);
} catch (e) { console.error(e.message); process.exitCode = 1; await current?.locator('#ea-panel').innerText().then(t => fs.writeFileSync(`${dir}/failure-panel.txt`, t)).catch(() => {}); }
finally {
  fs.writeFileSync(`${dir}/results.json`, JSON.stringify({ desk, mob, checks, errors }, null, 2));
  console.log(`RESULTS ${checks.filter(c => c.pass).length}/${checks.length}${errors.length ? ` errors: ${errors.join(' | ')}` : ''}`);
  await browser.close().catch(() => {});
}
