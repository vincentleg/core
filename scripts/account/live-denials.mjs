// Real-provider denial checks: node scripts/account/live-denials.mjs (Supabase CLI login and CORE_FOUNDER_EMAIL required). Publishable key only, held in memory, never printed. No email is sent.
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';

const { createAccountHandler } = await import('./handler.mjs');
const keys = JSON.parse((s => s.slice(s.indexOf('[')))(execFileSync('npx', ['-y', 'supabase@2.121.0', 'projects', 'api-keys', '--project-ref', 'kuvhrwcgknltjtofouws', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })));
const key = keys.find(k => k.type === 'publishable')?.api_key; if (!/^sb_publishable_/.test(key || '')) throw Error('no publishable key');
if (!/^[^@\s]+@[^@\s]+$/.test(process.env.CORE_FOUNDER_EMAIL || '')) throw Error('Set CORE_FOUNDER_EMAIL (never committed)');
if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(process.env.CORE_FOUNDER_USER_ID || '')) throw Error('Set CORE_FOUNDER_USER_ID (never committed)');
const probe = name => `${name}@example.invalid`;
const url = 'https://kuvhrwcgknltjtofouws.supabase.co', origin = 'https://creationofrebornearth.com';
const env = { CORE_SUPABASE_URL: url, CORE_SUPABASE_PUBLISHABLE_KEY: key, CORE_FOUNDER_USER_ID: process.env.CORE_FOUNDER_USER_ID, CORE_FOUNDER_EMAIL: process.env.CORE_FOUNDER_EMAIL, CORE_ACCOUNT_ORIGIN: origin };
const results = [], check = (name, ok, detail = '') => results.push({ name, pass: !!ok, detail });
const rest = (path, init = {}) => fetch(url + path, { ...init, headers: { apikey: key, 'Content-Type': 'application/json', ...init.headers } });

for (const table of ['core_founder_workspaces', 'core_founders']) {
  const r = await rest(`/rest/v1/${table}?select=*`); const body = await r.text();
  check(`anonymous REST read ${table} denied`, r.status === 401 || r.status === 403 || (r.ok && body === '[]'), `HTTP ${r.status}`);
}
let r = await rest('/rest/v1/core_founder_workspaces', { method: 'POST', body: JSON.stringify({ user_id: env.CORE_FOUNDER_USER_ID, data: {} }) });
check('anonymous REST insert denied', !r.ok, `HTTP ${r.status}`);
r = await rest('/rest/v1/core_founder_workspaces?user_id=eq.' + env.CORE_FOUNDER_USER_ID, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ revision: 99 }) });
check('anonymous REST update denied', !r.ok || (await r.text()) === '[]', `HTTP ${r.status}`);
r = await rest('/rest/v1/rpc/founder_session_active', { method: 'POST', body: '{}' });
check('private session function not exposed', !r.ok, `HTTP ${r.status}`);
r = await rest('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: probe('core-signup-probe'), password: crypto.randomUUID() + 'Aa1!' }) });
check('public sign-up disabled', !r.ok, `HTTP ${r.status}`);
r = await rest('/rest/v1/core_founder_workspaces?select=*', { headers: { Authorization: 'Bearer forged.jwt.token' } });
check('forged bearer token rejected by REST', r.status === 401, `HTTP ${r.status}`);

const handler = createAccountHandler({ env });
async function call(path, method = 'GET', body, headers = {}) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(req, { url: '/api/account/' + path, method, headers: { ...(method === 'GET' ? {} : { origin, 'content-type': 'application/json' }), ...headers } });
  const res = {}; await handler(req, { writeHead: (code, h) => Object.assign(res, { code, headers: h }), end: b => res.body = JSON.parse(b) }); return res;
}
let a = await call('workspace'); check('handler: no cookie → 401', a.code === 401, a.code);
a = await call('workspace', 'GET', undefined, { cookie: '__Host-core_account=forged.jwt.token' }); check('handler: forged session → 401', a.code === 401, a.code);
a = await call('login', 'POST', { email: probe('someone-else') }); check('handler: non-founder email → generic 200, no provider call', a.code === 200 && a.body.sent === true, a.code);
const login = await call('login', 'POST', { email: probe('nobody') }), verifier = login.headers['Set-Cookie'].split(';')[0];
a = await call('callback', 'POST', { type: 'pkce', code: crypto.randomUUID() }, { cookie: verifier }); check('handler: forged PKCE code rejected by provider', a.code === 401 && a.body.error === 'invalid-invitation', a.code + ' ' + a.body.error);
a = await call('callback', 'POST', { type: 'email', token_hash: 'f'.repeat(56) }); check('handler: forged token hash rejected by provider', a.code === 401 && a.body.error === 'invalid-invitation', a.code + ' ' + a.body.error);
a = await call('workspace', 'GET', undefined, { origin: 'https://evil.invalid', cookie: '__Host-core_account=x' }); check('handler: cross-origin refused', a.code === 403, a.code);

for (const x of results) console.log(x.pass ? 'PASS' : 'FAIL', x.name, x.detail);
console.log(`${results.filter(x => x.pass).length}/${results.length} passed`);
process.exitCode = results.every(x => x.pass) ? 0 : 1;
