// Content Security Policy for index.html (Phase 7). Recomputes the hash of the single inline script and writes
// the <meta http-equiv="Content-Security-Policy"> tag. Run after editing the inline script:  node scripts/csp.mjs
// `--check` exits 1 if the tag is missing or stale (used by tests).
// GitHub Pages cannot set response headers, so frame-ancestors / report-uri are not available (meta CSP limits).
import fs from 'node:fs';
import crypto from 'node:crypto';
const FILE = 'index.html', check = process.argv.includes('--check');
const html = fs.readFileSync(FILE, 'utf8');
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const hashes = inline.map(s => `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`);
// MapLibre 6 runs its worker from a same-origin module file (no blob: workers).
// Every external origin is listed for a reason (see docs/PHASE_7_SECURITY_REVIEW.md). Quarantined sources are absent.
const TILES = ['https://tiles.openfreemap.org', 'https://s3.amazonaws.com', 'https://gibs.earthdata.nasa.gov'];
const policy = [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  `img-src 'self' data: blob: ${TILES.join(' ')}`,
  `connect-src 'self' ${TILES.join(' ')} https://data.sf.gov https://earthquake.usgs.gov https://api.weather.gov https://api.github.com http://127.0.0.1:11434 http://localhost:11434 http://127.0.0.1:8080`,
  "worker-src 'self'", "child-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
].join('; ');
const tag = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
const re = /<meta http-equiv="Content-Security-Policy" content="[^"]*">/;
const current = (html.match(re) || [null])[0];
if (check) { if (current !== tag) { console.error('CSP meta tag missing or stale: run node scripts/csp.mjs'); process.exit(1); } console.log('CSP up to date'); process.exit(0); }
const out = current ? html.replace(re, tag) : html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n${tag}`);
fs.writeFileSync(FILE, out);
console.log(`CSP written (${inline.length} inline script hash(es)).`);
