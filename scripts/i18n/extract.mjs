// Extracts every English user-facing string of the published product into scripts/i18n/catalog.json
// ({ "English source": "French reference" | null }). Sources: T/TX/tr/B pairs, { en, fr } objects, *_EN label maps,
// [en, fr] pairs, the problem-text dictionary, shared keys, plus strings recorded by the browser crawl
// (scripts/i18n/crawl.mjs → scripts/i18n/crawled.json: exact HTML and dynamic strings).
// Template literals become "{0}" keys, matched at runtime by src/i18n/i18n.mjs.
//   node scripts/i18n/extract.mjs
import fs from 'node:fs';
import { FILES } from '../public-manifest.mjs';
import { STRINGS } from '../../src/i18n/strings.mjs';
const OUT = 'scripts/i18n/catalog.json', CRAWLED = 'scripts/i18n/crawled.json';
// Parse a JS string literal starting at s[i] (', " or `); returns { text, end } with ${…} replaced by {n}.
function literal(s, i) {
  const q = s[i]; if (!`'"\``.includes(q)) return null;
  let out = '', n = 0, j = i + 1;
  while (j < s.length) {
    const c = s[j];
    if (c === '\\') { const d = s[j + 1]; out += d === 'n' ? '\n' : d === 't' ? '\t' : d === 'u' ? String.fromCharCode(parseInt(s.slice(j + 2, j + 6), 16)) : d; j += d === 'u' ? 6 : 2; continue; }
    if (c === q) return { text: out, end: j + 1 };
    if (q === '`' && c === '$' && s[j + 1] === '{') { let depth = 1, k = j + 2; while (k < s.length && depth) { const ch = s[k]; if (`'"\``.includes(ch)) { const sub = literal(s, k); k = sub ? sub.end : k + 1; continue; } if (ch === '{') depth++; else if (ch === '}') depth--; k++; } out += `{${n++}}`; j = k; continue; }
    if (q !== '`' && c === '\n') return null;
    out += c; j++;
  }
  return null;
}
const skipSpace = (s, i) => { while (/\s/.test(s[i] || '')) i++; return i; };
const useful = x => x && !/^#[0-9a-f]{3,8}$/i.test(x) && x !== '[object Object]' && /\p{L}{2}/u.test(x.replace(/\{\d+\}/g, '')) && x.replace(/\{\d+\}|[\s·:,.;()\-–—→/|+%]/g, '').length >= 2;
const FRENCH = /[éèêàùçôîœ’«»]|\b(le|la|les|des|du|une|pour|avec|sur|aucun|aucune|est|sont|pas)\b/i;
const cat = new Map();
const add = (en, fr = null, where = '') => { if (!useful(en)) return; const prev = cat.get(en); if (!prev) cat.set(en, { fr, where: new Set([where]) }); else { if (fr && !prev.fr) prev.fr = fr; prev.where.add(where); } };
for (const f of FILES.filter(f => /\.(m?js)$/.test(f) && !/vendor|i18n\/locales/.test(f))) {
  const s = fs.readFileSync(f, 'utf8');
  // T('en', 'fr') / TX / tr / B
  for (const m of s.matchAll(/(?<![\w$.])(T|TX|tr|B|P|h\.t)\(\s*/g)) { const a = literal(s, m.index + m[0].length); if (!a) continue; let k = skipSpace(s, a.end); let fr = null; if (s[k] === ',') { const b = literal(s, skipSpace(s, k + 1)); if (b) fr = b.text; } add(a.text, fr, f); }
  // { en: '…', fr: '…' }
  for (const m of s.matchAll(/(?<![\w$])en\s*:\s*/g)) { const a = literal(s, m.index + m[0].length); if (!a) continue; const rest = s.slice(a.end, a.end + 600), fm = rest.match(/^\s*,\s*fr\s*:\s*/); const fr = fm ? literal(s, a.end + fm[0].length)?.text : null; add(a.text, fr, f); }
  // [ 'English', 'Français' ] pairs
  for (const m of s.matchAll(/\[\s*(?=['"`])/g)) { const a = literal(s, m.index + m[0].length); if (!a) continue; let k = skipSpace(s, a.end); if (s[k] !== ',') continue; const b = literal(s, skipSpace(s, k + 1)); if (!b) continue; if (s[skipSpace(s, b.end)] === ']' && a.text !== b.text && (FRENCH.test(b.text) || /^[A-Z]/.test(a.text) && /^[A-ZÉ]/.test(b.text))) add(a.text, b.text, f); }
  // const X_EN = { key: 'English', … }
  for (const m of s.matchAll(/(?:const|let)\s+(\w+_EN)\s*=\s*\{/g)) { const body = s.slice(m.index, s.indexOf('};', m.index)); for (const v of body.matchAll(/:\s*(?=['"`])/g)) { const a = literal(body, v.index + v[0].length); if (a) add(a.text, null, f); } }
}
// Problem-text dictionary (French record → English) and its English templates.
{ const s = fs.readFileSync('src/earth/problem-view.mjs', 'utf8'), d = s.slice(s.indexOf('const DICT'), s.indexOf('const TEMPLATES'));
  for (const m of d.matchAll(/:\s*(?=['"`])/g)) { const a = literal(d, m.index + m[0].length); if (a) add(a.text, null, 'problem-view DICT'); }
  const tpl = s.slice(s.indexOf('const TEMPLATES'), s.indexOf('export function ptext'));
  for (const m of tpl.matchAll(/=>\s*(?=`)/g)) { const a = literal(tpl, m.index + m[0].length); if (a) add(a.text.replace(/\{\d+\}(?=\{\d+\})/g, ''), null, 'problem-view TEMPLATES'); } }
for (const [k, v] of Object.entries(STRINGS.en)) add(v, STRINGS.fr[k] || null, 'strings.mjs');
const EXTRA = 'scripts/i18n/templates.json';
if (fs.existsSync(EXTRA)) for (const en of JSON.parse(fs.readFileSync(EXTRA, 'utf8'))) add(en, null, 'templates.json');
if (fs.existsSync(CRAWLED)) for (const [en, fr] of Object.entries(JSON.parse(fs.readFileSync(CRAWLED, 'utf8')))) add(en, fr, 'crawl');
const out = Object.fromEntries([...cat].sort(([a], [b]) => a.localeCompare(b)).map(([en, v]) => [en, v.fr]));
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
const chars = Object.keys(out).reduce((a, k) => a + k.length, 0);
console.log(`i18n catalog: ${Object.keys(out).length} strings, ${chars} characters, ${Object.keys(out).filter(k => /\{\d+\}/.test(k)).length} templates`);
