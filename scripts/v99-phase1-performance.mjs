// Current public World performance using existing Playwright + isolated Chrome; no model downloads or inference.
// NODE_PATH=<existing modules> CORE_CDP_PORT=9241 node scripts/v99-phase1-performance.mjs [output.json]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const port = Number(process.env.CORE_CDP_PORT || 9241), base = process.env.CORE_TEST_URL || 'http://127.0.0.1:8790/';
assert.ok(port !== 9222 && port > 1024 && port < 65536);
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`), samples = [];
const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  localStorage.setItem('core.lang', 'en'); Object.defineProperty(navigator, 'gpu', { value: undefined });
  globalThis.CORE_PERF_LONG_TASKS = [];
  new PerformanceObserver(list => { for (const e of list.getEntries()) CORE_PERF_LONG_TASKS.push({ start: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true });
});
try {
  for (const [name, width, cold] of [['desktop-cold', 1440, true], ['desktop-warm', 1440, false], ['mobile-cold', 390, true]]) {
    const page = await ctx.newPage(); await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const cdp = await ctx.newCDPSession(page); let bytes = 0, requests = 0; const errors = [];
    page.on('pageerror', e => errors.push(e.message)); cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength; requests++; });
    await cdp.send('Network.enable'); await cdp.send('Performance.enable');
    if (cold) await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: cold });
    const started = performance.now(); await page.goto(new URL('world.html', base).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => globalThis.CORE_EARTH?.state.ready && globalThis.CORE_INTELLIGENCE?.engine, null, { timeout: 60000 });
    const readyMs = Math.round(performance.now() - started);
    await page.locator('#ea-start').click(); await page.waitForTimeout(1500);
    const command = await page.evaluate(async () => { const start = performance.now(); await CORE_INTELLIGENCE.submit('Find an urban planning agent near Oakland.'); return { elapsedMs: Math.round(performance.now() - start), timings: CORE_INTELLIGENCE.lastResult.timings, selected: !!CORE_INTELLIGENCE.engine.state.agent }; });
    const frames = await page.evaluate(() => new Promise(resolve => { let count = 0; const start = performance.now(); const tick = () => { count++; const ms = performance.now() - start; if (ms < 3000) requestAnimationFrame(tick); else resolve({ fps: +(count * 1000 / ms).toFixed(1), ms: Math.round(ms) }); }; requestAnimationFrame(tick); }));
    const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    assert.ok(Number.isFinite(readyMs) && readyMs > 0 && command.selected && frames.fps > 0);
    const detail = await page.evaluate(() => ({ longTasks: CORE_PERF_LONG_TASKS, largestResources: performance.getEntriesByType('resource').sort((a, b) => b.decodedBodySize - a.decodedBodySize).slice(0, 10).map(e => ({ url: e.name, decodedKB: Math.round(e.decodedBodySize / 1024), ms: Math.round(e.duration) })) }));
    samples.push({ name, viewport: width, readyMs, transferredKB: Math.round(bytes / 1024), completedRequests: requests, heapMB: +(metrics.JSHeapUsedSize / 1048576).toFixed(1), command, frames, ...detail, errors, webgpu: false });
    await page.close(); console.log(name, JSON.stringify(samples.at(-1)));
  }
} finally {
  fs.writeFileSync(process.argv[2] || '.core-local/evidence/v99-phase1/performance.json', JSON.stringify({ at: new Date().toISOString(), browser: browser.version(), base, limits: 'Single headless machine, no WebGPU/model, no CPU/network throttling. Frame rate is requestAnimationFrame cadence, not measured GPU render throughput. Transfers cover completed requests through the sample; not total build size. No agreed pass budget.', samples }, null, 2) + '\n');
  await ctx.close(); await browser.close();
}
process.exitCode = samples.some(s => s.errors.length) || samples.length !== 3 ? 1 : 0;
