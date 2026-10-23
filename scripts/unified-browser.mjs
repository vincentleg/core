// Focused acceptance: real map/geocoder, synthetic recognizer events. No claim of physical microphone accuracy.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const base = process.env.CORE_TEST_URL || 'http://127.0.0.1:8792/';
assert.ok(['http://127.0.0.1:8792/', 'https://creationofrebornearth.com/'].includes(base));
const output = process.argv[2] || '.core-local/evidence/unified-browser.json';
const evidence = { at: new Date().toISOString(), base, checks: [], errors: [], requests: [], commands: [], physicalMicrophone: 'NOT VERIFIED; recognition events are fixtures', safari: 'NOT VERIFIED; remote automation requires founder setting' };
const browser = await chromium.connectOverCDP('http://127.0.0.1:9241'), ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
await ctx.addInitScript(() => localStorage.setItem('core.lang', 'en'));
const page = await ctx.newPage();
function check(name, value) { evidence.checks.push({ name, pass: !!value }); save(); assert.ok(value, name); console.log('PASS', name); }
function save() { fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n'); }
page.on('pageerror', e => evidence.errors.push(e.message)); page.on('dialog', d => d.accept());
page.on('request', r => { if (r.url().startsWith('https://photon.komoot.io/api/')) evidence.requests.push({ time: Date.now(), url: r.url() }); checkNoModel(r.url()); });
function checkNoModel(url) { if (/huggingface\.co|hf\.co/.test(url)) evidence.errors.push('Unexpected model request: ' + url); }
async function language(code) { await page.selectOption('[data-lang]', code); await page.waitForFunction(c => document.documentElement.lang === c, code); }
async function ready() { await page.waitForFunction(() => globalThis.CORE_EARTH?.state.ready && globalThis.CORE_INTELLIGENCE?.engine, null, { timeout: 90000 }); }
async function rate() { const recent = evidence.requests.filter(r => Date.now() - r.time < 61000); if (recent.length >= 5) await page.waitForTimeout(Math.max(1, 61000 - (Date.now() - recent[0].time))); const last = evidence.requests.at(-1); if (last && Date.now() - last.time < 1400) await page.waitForTimeout(1400 - (Date.now() - last.time)); }
async function command(q, bounds, type, choose) {
  await rate(); await page.locator('[data-ci-query]').fill(q); await page.locator('[data-ci-query]').press('Enter');
  await page.waitForFunction(q => CORE_INTELLIGENCE.lastRequest === q && !['thinking', 'executing', 'navigating'].includes(document.getElementById('core-intelligence').dataset.state), q, { timeout: 30000 });
  if (await page.evaluate(() => !!CORE_INTELLIGENCE.lastResult?.clarification) && choose) { await page.locator('.ci-turn').last().locator('.ci-choices button').filter({ hasText: choose }).first().click(); await page.waitForFunction(() => !!CORE_INTELLIGENCE.lastResult?.navigated, null, { timeout: 20000 }); }
  const r = await page.evaluate(() => ({ result: CORE_INTELLIGENCE.lastResult, place: CORE_INTELLIGENCE.engine.state.location, center: CORE_EARTH.state.map.getCenter().toArray() }));
  evidence.commands.push({ q, ...r }); save();
  check(q + ': real camera and entity', r.result?.navigated && r.place.type === type && r.center[0] >= bounds[0] && r.center[0] <= bounds[2] && r.center[1] >= bounds[1] && r.center[1] <= bounds[3] && Math.abs(r.center[0] - r.place.coordinates[0]) < .001 && Math.abs(r.center[1] - r.place.coordinates[1]) < .001);
}
try {
  // Founder-private projects are no longer part of the public product; see test/private-isolation.test.js.
  await page.goto(base + 'world.html'); await ready();
  await language('fr');
  await page.evaluate(() => { globalThis.__OriginalRecognition = globalThis.SpeechRecognition; globalThis.SpeechRecognition = class { constructor() { globalThis.__recognition = this; } start() { this.onstart?.(); } abort() { this.onend?.(); } }; });
  await page.locator('[data-ci-mic]').click(); check('French UI selects French recognition', await page.evaluate(() => __recognition.lang === 'fr-FR'));
  await page.evaluate(() => __recognition.onresult({ results: [Object.assign([{ transcript: 'First Street', confidence: .51 }, { transcript: 'Folsom Street', confidence: .48 }], { isFinal: false })] }));
  check('interim transcript editable without navigation', await page.locator('[data-ci-query]').inputValue() === 'First Street' && await page.evaluate(() => !!globalThis.CORE_TWIN));
  await page.evaluate(() => __recognition.onresult({ results: [Object.assign([{ transcript: 'First Street', confidence: .51 }, { transcript: 'Folsom Street', confidence: .48 }], { isFinal: true })] }));
  check('wrong final transcript never auto-executes', await page.evaluate(() => !CORE_INTELLIGENCE.lastRequest));
  await page.locator('.speech-alternatives button').filter({ hasText: 'Folsom Street' }).click();
  check('recognizer alternative is chosen by user, not guessed', await page.locator('[data-ci-query]').inputValue() === 'Folsom Street');
  await command('Folsom Street', [-122.43, 37.75, -122.38, 37.80], 'street');
  await page.locator('[data-ci-more]').click(); await page.selectOption('[data-speech-language]', 'en');await page.keyboard.press('Escape'); await page.locator('[data-ci-mic]').click(); check('independent English speech choice with French UI', await page.evaluate(() => __recognition.lang === 'en-US' && document.documentElement.lang === 'fr')); await page.locator('[data-ci-mic]').click();
  await page.locator('[data-ci-more]').click();await page.selectOption('[data-speech-language]', '');await page.keyboard.press('Escape');
  for (const code of ['en', 'fr', 'es', 'de', 'zh-CN', 'pt']) { await language(code); await page.locator('[data-ci-mic]').click(); check(code + ' recognition locale follows UI', await page.evaluate(c => __recognition.lang === ({ en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', 'zh-CN': 'zh-CN', pt: 'pt-BR' })[c], code)); await page.locator('[data-ci-mic]').click(); }
  await language('en'); await page.locator('[data-ci-mic]').click(); await page.evaluate(() => __recognition.onerror({ error: 'not-allowed' })); check('permission denial retains text fallback', /permission denied/.test(await page.locator('[data-ci-state]').innerText()));
  await command('Take me to Folsom Street', [-122.43, 37.75, -122.38, 37.80], 'street');
  await command('Go to Golden Gate Park', [-122.52, 37.75, -122.44, 37.79], 'park');
  await command('Show me Market Street', [-122.47, 37.73, -122.38, 37.81], 'street');
  await command('Take me to UCSF Medical Center', [-122.46, 37.74, -122.38, 37.80], 'hospital', 'Mission Bay');
  await command('Take me to Tokyo', [139, 35, 141, 36.2], 'city');
  await command('Show me the Eiffel Tower', [2.28, 48.84, 2.31, 48.88], 'monument', 'Paris');
  await language('fr');
  await command('Emmène-moi à Folsom Street.', [-122.43, 37.75, -122.38, 37.80], 'street');
  await command('Va à Golden Gate Park.', [-122.52, 37.75, -122.44, 37.79], 'park');
  await command('Montre-moi Market Street.', [-122.47, 37.73, -122.38, 37.81], 'street');
  await command("Va à l’hôpital UCSF.", [-122.46, 37.74, -122.38, 37.80], 'hospital', 'Mission Bay');
  await command('Emmène-moi à Paris.', [2.1, 48.7, 2.5, 49], 'city', 'France');
  await command('Zoom to 37.7749, -122.4194', [-122.42, 37.77, -122.41, 37.78], 'coordinates');
  await page.setViewportSize({ width: 390, height: 844 });
  check('mobile navigation fits viewport', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('language selector is outside top bar', await page.locator('#core-nav [data-lang]').count() === 0);
  check('no critical page errors or automatic model downloads', evidence.errors.length === 0);
} catch (error) { evidence.failure = error.message; evidence.debug = await page.evaluate(() => ({ toast: document.getElementById('toast')?.textContent, fatal: document.getElementById('fatal')?.textContent, twin: !!globalThis.CORE_TWIN, center: globalThis.CORE_EARTH?.state.map?.getCenter().toArray(), pitch: globalThis.CORE_EARTH?.state.map?.getPitch() })).catch(() => null); await page.screenshot({path:output.replace(/\.json$/, '-failure.png')}).catch(()=>{}); save(); throw error; }
finally { save(); await ctx.close(); await browser.close(); }
