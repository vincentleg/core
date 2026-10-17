// CORE public site build: copies ONLY what the supported pages load into public/ (deployed as a static site).
// Never published: docs/, scripts/, test/, .core-local/, internal reports, legacy archive pages, unreferenced data.
// The published pages' CSP drops the local-model endpoint (the public site never contacts a visitor's 127.0.0.1).
//   node scripts/build-public.mjs        → public/  (then: vercel deploy public --prod)
import fs from 'node:fs'; import path from 'node:path';
import { FILES } from './public-manifest.mjs';
const OUT = 'public';
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const EXTRA = [...walk('assets'), ...walk('data/mobility').filter(f => /trace-[A-Z0-9]+\.json$/.test(f)), ...walk('data/investigations').filter(f => f.endsWith('.json'))];
const files = [...new Set([...FILES, ...EXTRA])].filter(f => !/(^|\/)\.|\.DS_Store$/.test(f)).sort();
const FORBIDDEN = /^(docs|scripts|test|\.core-local|\.github|node_modules)\/|PROJECT_STATE|CORE_RESUME|AGENTS\.md|CLAUDE\.md|\.sqlite|\.env|(^|\/)(index|corridor|control|research|world-classic|demo)\.html$/;
const bad = files.filter(f => FORBIDDEN.test(f)); if (bad.length) throw Error(`refusing to publish: ${bad.join(', ')}`);
fs.rmSync(OUT, { recursive: true, force: true });
let bytes = 0;
for (const f of files) {
  const to = path.join(OUT, f); fs.mkdirSync(path.dirname(to), { recursive: true });
  if (f.endsWith('.html')) fs.writeFileSync(to, fs.readFileSync(f, 'utf8').replace(/\s*http:\/\/127\.0\.0\.1:11434/g, ''));
  else fs.copyFileSync(f, to);
  bytes += fs.statSync(to).size;
}
const H = [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' }, { key: 'Strict-Transport-Security', value: 'max-age=31536000' }];
fs.writeFileSync(path.join(OUT, 'vercel.json'), JSON.stringify({
  $schema: 'https://openapi.vercel.sh/vercel.json', cleanUrls: false, trailingSlash: false,
  rewrites: [{ source: '/', destination: '/world.html' }, { source: '/favicon.ico', destination: '/assets/brand/core-mark.svg' }],
  redirects: [{ source: '/index.html', destination: '/', permanent: true }],
  headers: [{ source: '/(.*)', headers: H }, { source: '/(src|assets)/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' }] }],
}, null, 1));
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
console.log(`public/: ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB`);
