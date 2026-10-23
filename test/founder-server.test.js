const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
test('private founder data requires local capability and strict origin; no file traversal or public static fallback', async t => {
  const { createFounderServer } = await import('../scripts/founder-server.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'core-founder-test-')), dataFile = path.join(dir, 'records.json'); fs.writeFileSync(dataFile, JSON.stringify({ prospects: [{ name: 'Private test record', status: 'prospect' }] }), { mode: 0o600 });
  const { server, capability } = createFounderServer({ dataFile }); await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(async () => { await new Promise(r => server.close(r)); fs.rmSync(dir, { recursive: true }); });
  const base = 'http://127.0.0.1:' + server.address().port;
  assert.equal((await fetch(base + '/api/founder/prospects')).status, 401);
  assert.equal((await fetch(base + '/api/founder/session', { method: 'POST', headers: { 'x-core-founder': 'wrong' } })).status, 401);
  assert.equal((await fetch(base + '/api/founder/session', { method: 'POST', headers: { 'x-core-founder': capability, origin: 'https://evil.invalid' } })).status, 403);
  const login = await fetch(base + '/api/founder/session', { method: 'POST', headers: { 'x-core-founder': capability } }); assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie'); assert.match(cookie, /HttpOnly; SameSite=Strict/);
  const headers = { cookie: cookie.split(';')[0] }; assert.equal((await (await fetch(base + '/api/founder/prospects', { headers })).json()).prospects[0].name, 'Private test record');
  assert.equal((await fetch(base + '/api/founder/prospects', { headers: { ...headers, origin: 'https://evil.invalid' } })).status, 403);
  assert.equal((await fetch(base + '/.core-local/founder/prospects.json', { headers })).status, 404);
  assert.equal((await fetch(base + '/%2e%2e/.git/config', { headers })).status, 404);
});
