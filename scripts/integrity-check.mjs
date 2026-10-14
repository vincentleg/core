// CORE integrity and security gate (Phase 4). Exits non-zero on any finding, which blocks the commit or push
// when run from .githooks (enable once per clone: git config core.hooksPath .githooks).
//   node scripts/integrity-check.mjs --staged         lines added in the index (pre-commit)
//   node scripts/integrity-check.mjs --push <range>   lines added in the commits about to be pushed (pre-push)
//   node scripts/integrity-check.mjs --all            every tracked file (audit)
// A false positive is never bypassed: fix the rule, or add an explicit, reasoned exception to
// .integrity-allowlist.json (exact path + SHA-256 of the exact value). There is no bypass option.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const args = process.argv.slice(2), mode = args[0] || '--staged';
const allow = JSON.parse(fs.readFileSync('.integrity-allowlist.json', 'utf8')).exceptions;

const FORBIDDEN_PATHS = [
  [/^test-results\//, 'local test evidence must stay out of Git'], [/(^|\/)node_modules\//, 'dependencies'],
  [/\.(png|jpe?g|gif|webp|bmp|mp4|mov)$/i, 'screenshots and media'], [/\.log$/i, 'raw logs'],
  [/(^|\/)\.env(\.|$)(?!example$)/, 'environment files'], [/\.(pem|key|p12|pfx)$/i, 'key material'], [/^data\/raw\//, 'raw data'],
];
const SECRET_RULES = [
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/], ['github-token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/], ['openai-style-key', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/], ['slack-token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/], ['google-api-key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['assigned-secret', /\b(api[_-]?key|secret|passwd|password|token)\b\s*[:=]\s*["'][A-Za-z0-9_\-+/=]{12,}["']/i],
];
const PII_RULES = [
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, () => true],
  ['phone', /\(?\b[2-9]\d{2}\)?[ .-]\d{3}[ .-]\d{4}\b/g, path => path.startsWith('data/')], // phone numbers matter in collected data
  ['local-path', /(\/Users\/[A-Za-z0-9._-]+|\/home\/[A-Za-z0-9._-]+|\/private\/tmp\/claude-[^\s"'`]*)/g, () => true],
];
const MAX_BYTES = 8 * 1024 * 1024;

function filesAndLines() {
  if (mode === '--all') return git('ls-files').split('\n').filter(Boolean).map(path => ({ path, status: 'A', lines: fs.existsSync(path) && !binary(path) ? fs.readFileSync(path, 'utf8').split('\n') : [] }));
  const base = mode === '--push' ? ['diff', '--unified=0', '--no-color', '--diff-filter=ACMR', args[1]] : ['diff', '--cached', '--unified=0', '--no-color', '--diff-filter=ACMR'];
  const names = git(...base.map(x => x === '--unified=0' ? '--name-status' : x).filter(x => x !== '--no-color')).split('\n').filter(Boolean).map(l => { const p = l.split('\t'); return { status: p[0][0], path: p[p.length - 1] }; });
  const diff = git(...base), out = new Map(names.map(n => [n.path, { ...n, lines: [] }]));
  let cur = null;
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) { cur = out.get(l.slice(6)) || null; continue; }
    if (cur && l.startsWith('+') && !l.startsWith('+++')) cur.lines.push(l.slice(1));
  }
  return [...out.values()];
}
const binary = p => /\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|zip|gz)$/i.test(p);
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const allowed = (rule, path, value) => allow.some(e => e.rule === rule && e.path === path && e.sha256 === sha(value)); // exceptions store a hash, never the value

const findings = [];
const files = filesAndLines();
for (const f of files) {
  for (const [re, why] of FORBIDDEN_PATHS) if (re.test(f.path)) findings.push({ rule: 'forbidden-path', path: f.path, detail: why });
  if (fs.existsSync(f.path) && fs.statSync(f.path).size > MAX_BYTES) findings.push({ rule: 'file-size', path: f.path, detail: `${fs.statSync(f.path).size} bytes > ${MAX_BYTES}` });
  if (f.path.endsWith('.json') && fs.existsSync(f.path)) { try { JSON.parse(fs.readFileSync(f.path, 'utf8')); } catch (e) { findings.push({ rule: 'invalid-json', path: f.path, detail: e.message }); } }
  f.lines.forEach((line, i) => {
    for (const [rule, re] of SECRET_RULES) { const m = line.match(re); if (m && !allowed(rule, f.path, m[0])) findings.push({ rule, path: f.path, detail: `${m[0].slice(0, 12)}…` }); }
    for (const [rule, re, applies] of PII_RULES) {
      if (!applies(f.path)) continue;
      for (const m of line.matchAll(re)) if (!allowed(rule, f.path, m[0])) findings.push({ rule, path: f.path, detail: m[0] });
    }
  });
}
// The generated corridor must match its sources (never hand-edited).
if (files.some(f => /^(src\/(template\.html|app\.js|engine\.js)|corridor\.html|build\.js)$/.test(f.path)) || mode === '--all') {
  const before = fs.readFileSync('corridor.html', 'utf8'); execFileSync('node', ['build.js'], { stdio: 'ignore' });
  if (fs.readFileSync('corridor.html', 'utf8') !== before) { fs.writeFileSync('corridor.html', before); findings.push({ rule: 'corridor-drift', path: 'corridor.html', detail: 'run node build.js and stage corridor.html' }); }
}

const uniq = [...new Map(findings.map(f => [`${f.rule}|${f.path}|${f.detail}`, f])).values()];
console.log(`integrity-check ${mode}: ${files.length} file(s) scanned, ${uniq.length} finding(s), ${allow.length} documented exception(s)`);
for (const f of uniq) console.log(`  FAIL ${f.rule} ${f.path} — ${f.detail}`);
process.exit(uniq.length ? 1 : 0);
