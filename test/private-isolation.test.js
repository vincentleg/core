const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync } = require('node:child_process');
// Founder-private projects must never reach the repository (public on GitHub; GitHub Pages serves main's whole tree),
// the public build or a logged-out visitor. Denied terms are stored as hashes of normalized tokens and token pairs so
// this test does not itself publish them — obfuscation only, not secrecy; the boundary is the server and the file layout.
const DENIED = new Set(['71ca1fd277df5b09ef0176f5', 'e79aa820ce402b016a12c535', 'b7b34df964204d10a0221cba', '154442ce23ac6c1bef715c71', '83e5a624982c5f18f1c225b8', '85a9d96dd3abb5146e124ea7', 'c5a149835753757c9cc44699', '6d5fa2fa677984f0897ea514', 'b0ae9bdaf359b45a7130b119', '5a3689c22259973bccd7f2ba', '0847af349dac5c4efe284b1a', '50e25a04bcd32f5dcf5a3c6a', 'e6e3203b55f98aaa6f3e6593', '037f7e37cba8592637df4fa6']);
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 24);
function denied(text) {
  const words = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  for (let i = 0; i < words.length; i++) if (DENIED.has(hash(words[i])) || (i && DENIED.has(hash(words[i - 1] + ' ' + words[i])))) return true;
  return false;
}
const TEXT = /\.(m?js|json|geojson|html|css|md|txt|ya?ml|sql|svg|csv)$/;

test('no tracked file and no public-build file contains founder-private project terms', async () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(f => f && TEXT.test(f) && !f.startsWith('assets/vendor/') && fs.existsSync(f));
  const { FILES } = await import('../scripts/public-manifest.mjs');
  const leaks = [...new Set([...tracked, ...FILES.filter(f => TEXT.test(f))])].filter(f => fs.statSync(f).size < 30e6 && denied(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(leaks, []);
  assert.deepEqual(FILES.filter(f => /(^|\/)(private|\.core-local|core-private)\//.test(f) && f !== 'src/private/extensions.mjs'), []);
});

test('logged-out visitors cannot list, discover or fetch private projects; the founder session can', async t => {
  const { createFounderServer } = await import('../scripts/founder-server.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'core-private-test-')), outside = fs.mkdtempSync(path.join(os.tmpdir(), 'core-outside-'));
  fs.mkdirSync(path.join(dir, 'alpha')); fs.writeFileSync(path.join(dir, 'alpha', 'index.mjs'), 'export const agents = () => [];\n');
  fs.writeFileSync(path.join(dir, 'alpha', 'project.json'), '{"title":{"en":"Alpha"}}'); fs.writeFileSync(path.join(outside, 'secret.json'), '{"secret":1}');
  fs.symlinkSync(path.join(outside, 'secret.json'), path.join(dir, 'alpha', 'escape.json'));
  const { server, capability } = createFounderServer({ privateDir: dir, dataFile: path.join(dir, 'none.json') }); await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(async () => { await new Promise(r => server.close(r)); fs.rmSync(dir, { recursive: true }); fs.rmSync(outside, { recursive: true }); });
  const base = 'http://127.0.0.1:' + server.address().port, get = (p, headers = {}, method = 'GET') => fetch(base + p, { headers, method });
  for (const p of ['/api/founder/extensions', '/private/alpha/index.mjs', '/private/alpha/project.json', '/private/missing/index.mjs']) {
    assert.equal((await get(p)).status, 404, p); assert.equal((await get(p, { cookie: 'core_founder=' + 'f'.repeat(64) })).status, 404, p);
    assert.equal((await get(p, { cookie: 'core_private_hint=1' })).status, 404, p);
  }
  // fetch() cannot spoof Host; a raw request checks DNS-rebinding protection.
  const spoofed = await new Promise((ok, no) => require('node:http').get({ host: '127.0.0.1', port: server.address().port, path: '/private/alpha/index.mjs', headers: { host: 'evil.invalid' } }, r => { r.resume(); ok(r.statusCode); }).on('error', no));
  assert.equal(spoofed, 421);
  const login = await fetch(base + '/api/founder/session', { method: 'POST', headers: { 'x-core-founder': capability } }); assert.equal(login.status, 200);
  const cookie = { cookie: login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ') };
  assert.match(login.headers.getSetCookie()[0], /^core_founder=[a-f0-9]{64}; HttpOnly; SameSite=Strict/);
  assert.deepEqual((await (await get('/api/founder/extensions', cookie)).json()).extensions, [{ id: 'alpha', title: { en: 'Alpha' } }]);
  const mod = await get('/private/alpha/index.mjs', cookie); assert.equal(mod.status, 200); assert.equal(mod.headers.get('content-type'), 'text/javascript'); assert.equal(mod.headers.get('cache-control'), 'no-store');
  for (const p of ['/private/alpha/escape.json', '/private/alpha/../../etc/passwd', '/private/alpha/%2e%2e%2fsecret.json', '/private/Alpha/index.mjs', '/private/alpha/index.sh'])
    assert.equal((await get(p, cookie)).status, 404, p);
  assert.equal((await get('/private/alpha/index.mjs', cookie, 'POST')).status, 404);
  assert.equal((await get('/private/alpha/index.mjs', { ...cookie, origin: 'https://evil.invalid' })).status, 403);
});

test('public code reaches private extensions only through the generic loader', () => {
  const src = execFileSync('git', ['grep', '-l', '-E', '-e', "[`'\"]/private/", '--', 'src', '*.html'], { encoding: 'utf8' }).trim().split('\n').sort();
  const allowed = ['src/private/extensions.mjs'];
  assert.deepEqual(src.filter(f => !allowed.includes(f)), [], 'unexpected private path reference');
  const loader = fs.readFileSync('src/private/extensions.mjs', 'utf8');
  assert.match(loader, /\['localhost', '127\.0\.0\.1'\]\.includes\(location\.hostname\)/); assert.doesNotMatch(loader, /core_founder=/);
});
