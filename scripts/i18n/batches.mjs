// Translation workflow for the dictionary languages (es, de, zh-CN, pt).
//   node scripts/i18n/batches.mjs split [size]   → scripts/i18n/work/NNN.src.json for catalog strings not yet translated
//   node scripts/i18n/batches.mjs merge          → validates work/NNN.tr.json ({ id: [es, de, zh-CN, pt] }) and writes
//                                                  src/i18n/locales/<code>.json (sorted, catalog keys only)
// Validation: same {n} placeholders, same HTML tags, non-empty, no stray English-only copy for long sentences.
import fs from 'node:fs'; import path from 'node:path';
const DIR = 'scripts/i18n/work', LOC = 'src/i18n/locales', CODES = ['es', 'de', 'zh-CN', 'pt'];
const catalog = JSON.parse(fs.readFileSync('scripts/i18n/catalog.json', 'utf8'));
const load = c => (fs.existsSync(`${LOC}/${c}.json`) ? JSON.parse(fs.readFileSync(`${LOC}/${c}.json`, 'utf8')) : {});
const tags = s => (s.match(/<\/?[a-z][^>]*>/gi) || []).map(t => t.replace(/\s.*?>$/, '>').toLowerCase()).sort().join('');
const holes = s => (s.match(/\{\d+\}/g) || []).sort().join('');
const cmd = process.argv[2];
if (cmd === 'split') {
  fs.mkdirSync(DIR, { recursive: true });
  const done = new Set(Object.keys(load('es'))), pending = new Set(fs.readdirSync(DIR).filter(f => f.endsWith('.src.json')).flatMap(f => Object.values(JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')))));
  const todo = Object.keys(catalog).filter(k => !done.has(k) && !pending.has(k)), size = +process.argv[3] || 90;
  let n = fs.readdirSync(DIR).filter(f => f.endsWith('.src.json')).length;
  for (let i = 0; i < todo.length; ) { let chars = 0, j = i; while (j < todo.length && j - i < size && chars < 5200) chars += todo[j++].length; const batch = Object.fromEntries(todo.slice(i, j).map((k, x) => [x, k])); fs.writeFileSync(path.join(DIR, `${String(n++).padStart(3, '0')}.src.json`), JSON.stringify(batch, null, 1)); i = j; }
  console.log(`${todo.length} strings → ${n} batches in ${DIR}`);
} else if (cmd === 'merge') {
  const out = Object.fromEntries(CODES.map(c => [c, load(c)])), problems = [];
  for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.tr.json')).sort()) {
    const src = JSON.parse(fs.readFileSync(path.join(DIR, f.replace('.tr.', '.src.')), 'utf8')), tr = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    for (const [id, en] of Object.entries(src)) {
      const row = tr[id]; if (!Array.isArray(row) || row.length !== 4) { problems.push(`${f}#${id}: missing row`); continue; }
      row.forEach((v, i) => { const c = CODES[i]; if (typeof v !== 'string' || !v.trim()) return problems.push(`${f}#${id} ${c}: empty`); if (holes(v) !== holes(en)) return problems.push(`${f}#${id} ${c}: placeholders ${holes(en)} → ${holes(v)}`); if (tags(v) !== tags(en)) return problems.push(`${f}#${id} ${c}: HTML tags differ`); out[c][en] = v; });
    }
  }
  for (const c of CODES) { const sorted = Object.fromEntries(Object.entries(out[c]).filter(([k]) => k in catalog).sort(([a], [b]) => a.localeCompare(b))); fs.writeFileSync(`${LOC}/${c}.json`, JSON.stringify(sorted, null, 0).replace(/","/g, '",\n"') + '\n'); }
  const total = Object.keys(catalog).length; console.log(CODES.map(c => `${c}: ${Object.keys(load(c)).length}/${total}`).join(' · '));
  if (problems.length) { console.log(`${problems.length} problems:\n` + problems.slice(0, 40).join('\n')); process.exitCode = 1; }
} else console.log('usage: split [size] | merge');
