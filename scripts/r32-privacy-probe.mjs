// Bounded production privacy check. Start a fresh Chrome with remote debugging first:
// CORE_CDP_PORT=<port> node scripts/r32-privacy-probe.mjs https://creationofrebornearth.com/world.html .core-local/evidence/r32-probe
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const expected = fs.readFileSync('public/world.html', 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const csp = html => (html.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content="([^"]*)"/i)?.[1] || '').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
const directives = html => csp(html).split(';').map(value => value.trim()).filter(Boolean).sort();
const scripts = html => [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m => m[1]);
const expectedScripts = scripts(expected);
const inspect = html => ({ htmlMatchesBuild: html === expected, cspRewritten: csp(html) !== csp(expected), cspDirectivesChanged: JSON.stringify(directives(html)) !== JSON.stringify(directives(expected)), extraScripts: scripts(html).filter(src => !expectedScripts.includes(src)) });
const changed = result => !result.htmlMatchesBuild || result.cspRewritten || result.extraScripts.length > 0 || (result.writes?.length || 0) > 0;
const classify = results => results.some(result => result.kind !== 'http' && (!result.tlsIssuer || /NordVPN/i.test(result.tlsIssuer))) ? 'NOT VERIFIED' : results.some(changed) ? 'FAIL' : 'PASS';
const endpoint = raw => { const u = new URL(raw); return { origin: u.origin, pathPrefix: u.pathname.slice(0, 24), pathLength: u.pathname.length, pathSha256: hash(u.pathname), queryFields: [...u.searchParams.keys()] }; };
const fields = (body, type) => {
  if (!body) return [];
  try {
    if (type.includes('application/json')) { const value = JSON.parse(body); return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : []; }
    if (type.includes('application/x-www-form-urlencoded')) return [...new URLSearchParams(body).keys()];
    if (type.includes('multipart/form-data')) return [...body.matchAll(/content-disposition:[^\r\n]*\bname="([^"]+)"/gi)].map(m => m[1]);
  } catch { return []; }
  return [];
};
const headerSubset = headers => Object.fromEntries(['server', 'x-vercel-id', 'x-vercel-cache', 'x-vercel-mitigated', 'content-type', 'content-security-policy', 'location', 'age'].filter(key => headers[key]).map(key => [key, headers[key]]));

if (process.argv[2] === '--self-test') {
  const injected = expected.replace('<head>', '<head><script src="/injected.js"></script>').replace(csp(expected), csp(expected).split('; ').reverse().join('; '));
  assert.deepEqual(inspect(expected), { htmlMatchesBuild: true, cspRewritten: false, cspDirectivesChanged: false, extraScripts: [] });
  assert.equal(inspect(injected).htmlMatchesBuild, false);
  assert.equal(inspect(injected).cspRewritten, true);
  assert.equal(inspect(injected).cspDirectivesChanged, false);
  assert.equal(inspect(injected).extraScripts.length, 1);
  assert.deepEqual(fields('{"DOMIdentifiers":[]}', 'application/json'), ['DOMIdentifiers']);
  assert.equal(changed({ ...inspect(expected), writes: [{}] }), true);
  assert.equal(classify([{ kind: 'fresh', tlsIssuer: 'NordVPN Threat Protection', ...inspect(expected) }]), 'NOT VERIFIED');
  assert.equal(classify([{ kind: 'fresh', tlsIssuer: 'Trusted CA', ...inspect(expected) }]), 'PASS');
  console.log('Privacy regression logic: CSP rewrite, extra script, POST field detection passed');
  process.exit(0);
}

const url = process.argv[2] || 'https://creationofrebornearth.com/world.html';
const dir = process.argv[3] || '.core-local/evidence/r32-probe';
if (new URL(url).protocol !== 'https:') throw Error('Use the production HTTPS URL');
fs.mkdirSync(dir, { recursive: true });
const results = [];

const http = await fetch(url, { redirect: 'manual' });
const httpHtml = await http.text();
fs.writeFileSync(`${dir}/http.html`, httpHtml);
results.push({ kind: 'http', status: http.status, headers: headerSubset(Object.fromEntries(http.headers)), ...inspect(httpHtml) });

const { chromium } = createRequire(import.meta.url)('playwright-core');
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.CORE_CDP_PORT || 9267}`);
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const network = [], resources = [];
const session = await context.newCDPSession(page);
await session.send('Network.enable');
session.on('Network.requestWillBeSent', event => {
  if (event.type === 'Script') resources.push({ endpoint: endpoint(event.request.url), initiator: event.initiator.stack?.callFrames?.map(frame => frame.url).filter(Boolean).slice(0, 1).map(endpoint) || [] });
  if (event.request.method === 'GET' || event.request.method === 'HEAD') return;
  const type = String(Object.entries(event.request.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '');
  const body = event.request.postData || '';
  network.push({ method: event.request.method, endpoint: endpoint(event.request.url), contentType: type, bodyBytes: body ? Buffer.byteLength(body) : null, bodyFields: fields(body, type), initiator: event.initiator.stack?.callFrames?.map(frame => frame.url).filter(Boolean).slice(0, 1).map(endpoint) || [] });
});

try {
  for (const kind of ['fresh', 'same-session']) {
    const response = kind === 'fresh' ? await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }) : await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response) throw Error(`${kind}: no navigation response`);
    await page.waitForTimeout(4000);
    const html = await response.text();
    fs.writeFileSync(`${dir}/${kind}.html`, html);
    const redirects = [];
    for (let request = response.request().redirectedFrom(); request; request = request.redirectedFrom()) redirects.unshift({ endpoint: endpoint(request.url()), status: (await request.response())?.status() });
    results.push({ kind, status: response.status(), headers: headerSubset(response.headers()), tlsIssuer: (await response.securityDetails())?.issuer || null, redirects, ...inspect(html), scriptsLoaded: resources.splice(0), writes: network.splice(0) });
  }
} finally {
  await context.close();
  await browser.close();
}

const verdict = classify(results);
fs.writeFileSync(`${dir}/results.json`, JSON.stringify({ url, verdict, results }, null, 2));
console.log(`R32 privacy: ${verdict} — ${results.map(result => `${result.kind} ${result.status}, build=${result.htmlMatchesBuild}, issuer=${result.tlsIssuer || 'unknown'}, ${result.extraScripts.length} extra scripts, ${result.writes?.length || 0} writes`).join('; ')}`);
if (verdict !== 'PASS') process.exitCode = 1;
