// CORE public deployment manifest: crawls the supported pages and lists every file they can load (HTML, scripts,
// imports, CSS url(), fetched data and assets). Only these files are published (scripts/build-public.mjs).
//   node scripts/public-manifest.mjs [--print]
import fs from 'node:fs'; import path from 'node:path';
export const PAGES = ['solutions.html', 'plans.html', 'world.html', 'me.html', 'commons.html', 'dialogue.html', 'avatar.html', 'progress.html', 'report.html', 'manifesto.html', 'privacy.html'];
const ROOT = process.cwd(), seen = new Set(), dyn = [];
const REF = /(?:from\s*|import\s*\(\s*|import\s+)['"`]([^'"`]+)['"`]|(?:src|href)\s*=\s*"([^"#?]+)|url\(\s*['"]?([^'")?#]+)|['"`]((?:\.\.?\/|\/)?(?:data|assets|src)\/[^'"`\s)]+)['"`]/g;
const norm = p => path.normalize(p).replace(/\\/g, '/');
function visit(file) {
  file = norm(file); if (seen.has(file) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return; seen.add(file);
  if (!/\.(html|m?js|css|json|geojson)$/.test(file) || /\.(json|geojson)$/.test(file)) return;
  const text = fs.readFileSync(file, 'utf8'), dir = path.dirname(file);
  for (const m of text.matchAll(REF)) {
    let r = m[1] || m[2] || m[3] || m[4]; if (!r || /^(https?:|data:|blob:|mailto:|#|javascript:)/.test(r)) continue;
    r = r.split('?')[0];
    if (r.includes('${')) { dyn.push(`${file}: ${r}`); continue; }
    const base = m[4] && !r.startsWith('.') ? '' : (r.startsWith('/') ? '' : dir);
    const target = norm(path.join(base, r.replace(/^\//, '')));
    if (target.startsWith('..')) continue;
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) continue;
    visit(target);
  }
}
// The module worker is created with new URL(), not a static import.
for (const p of [...PAGES, 'assets/vendor/maplibre-gl-6.11.2/maplibre-gl-worker.mjs', 'src/urban/worker.mjs', 'src/intelligence/core/capture-worklet.mjs', 'data/urban/catalog.json', 'data/urban/latest.json']) visit(p);
export const FILES = [...seen].filter(f => fs.existsSync(f)).sort();
if (process.argv.includes('--print')) { console.log(FILES.join('\n')); console.error(`${FILES.length} files; dynamic references to review:\n${[...new Set(dyn)].join('\n')}`); }
