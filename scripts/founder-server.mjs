// Private demo only: loopback, ephemeral capability, HttpOnly session, strict host/origin and fixed public file list.
// This does not authenticate a founder identity and must never be deployed or bound to a public interface.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { FILES } from './public-manifest.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.geojson': 'application/geo+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.wasm': 'application/wasm' };
// Founder-private projects live outside the repository and every served tree (default ~/core-private/<id>/).
export const PRIVATE_DIR = path.resolve(process.env.CORE_PRIVATE_DIR || path.join(os.homedir(), 'core-private'));
export function createFounderServer({ dataFile = path.join(ROOT, '.core-local/founder/prospects.json'), privateDir = PRIVATE_DIR, capability = crypto.randomBytes(32).toString('hex') } = {}) {
  const allowed = new Set(FILES), session = crypto.randomBytes(32).toString('hex');
  const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  const server = http.createServer((req, res) => {
    const send = (code, body, type = 'application/json', headers = {}) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', ...headers }); res.end(req.method === 'HEAD' ? '' : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
    try {
      const host = req.headers.host, port = server.address().port;
      if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) return send(421, { error: 'Host refused' });
      if (req.headers.origin && req.headers.origin !== `http://${host}` || ['cross-site', 'same-site'].includes(req.headers['sec-fetch-site'])) return send(403, { error: 'Origin refused' });
      const pathname = new URL(req.url, `http://${host}`).pathname;
      if (pathname === '/api/founder/session' && req.method === 'POST') {
        if (!equal(req.headers['x-core-founder'], capability)) return send(401, { error: 'Local capability required' });
        // The hint cookie is not a credential: it only lets public code skip a request outside founder sessions.
        return send(200, { mode: 'private-local-demo' }, 'application/json', { 'Set-Cookie': [`core_founder=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`, 'core_private_hint=1; SameSite=Strict; Path=/; Max-Age=28800'] });
      }
      const cookie = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('core_founder='))?.slice(13);
      const authorized = equal(cookie, session);
      if (pathname === '/api/founder/extensions' || pathname.startsWith('/private/')) {
        // Same answer for missing and unauthorized: a logged-out visitor learns nothing about private project names.
        if (!authorized || !['GET', 'HEAD'].includes(req.method)) return send(404, 'Not found', 'text/plain');
        if (pathname === '/api/founder/extensions') return send(200, { extensions: listPrivate(privateDir) });
        const m = /^\/private\/([a-z0-9-]{1,40})\/([A-Za-z0-9_-]{1,80}\.(?:mjs|json|css))$/.exec(pathname);
        const file = m && path.join(privateDir, m[1], m[2]);
        if (!file || !fs.existsSync(file) || !fs.realpathSync(file).startsWith(fs.realpathSync(privateDir) + path.sep)) return send(404, 'Not found', 'text/plain');
        return send(200, fs.readFileSync(file), MIME[path.extname(file)]);
      }
      if (pathname.startsWith('/api/')) {
        if (pathname !== '/api/founder/prospects' || req.method !== 'GET') return send(404, { error: 'Unknown private operation' });
        if (!authorized) return send(401, { error: 'Private local session required' });
        const stat = fs.statSync(dataFile); if (stat.size > 64000 || (stat.mode & 0o077)) return send(503, { error: 'Private file must be bounded and owner-only (chmod 600)' });
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8')); if (!Array.isArray(data.prospects) || data.prospects.length > 100) throw Error('Invalid private records');
        return send(200, data);
      }
      if (!['GET', 'HEAD'].includes(req.method)) return send(405, { error: 'Read only' });
      const file = pathname === '/' ? 'world.html' : decodeURIComponent(pathname.slice(1));
      if (!allowed.has(file)) return send(404, 'Not found', 'text/plain');
      // Serve the verified public build, never the repository or private data directory.
      return send(200, fs.readFileSync(path.join(ROOT, 'public', file)), MIME[path.extname(file)] || 'application/octet-stream');
    } catch { send(503, { error: 'Local demo data or public build unavailable' }); }
  });
  return { server, capability };
}
function listPrivate(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(id => /^[a-z0-9-]{1,40}$/.test(id) && fs.existsSync(path.join(dir, id, 'index.mjs'))).map(id => {
    let title = id; try { title = JSON.parse(fs.readFileSync(path.join(dir, id, 'project.json'), 'utf8')).title ?? id; } catch {}
    return { id, title };
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.CORE_FOUNDER_PORT || 8792); if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid port');
  const { server, capability } = createFounderServer();
  server.listen(port, '127.0.0.1', () => console.log(`Private local workspace — keep this link private: http://127.0.0.1:${port}/me.html#founder=${capability}`));
}
