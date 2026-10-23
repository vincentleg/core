// Writes data/integrity/anchors.json: SHA-256 of the public files CORE Knowledge cites, computed offline by this script and
// committed to Git, so runtime verification compares against a reference that the runtime did not produce.
// The SF dataset files are anchored through data/sf/manifest.json (written by scripts/sf-snapshot.mjs), which is itself anchored here.
//   node scripts/anchor-data.mjs           write anchors and print the value to pin in src/kb/knowledge.mjs (ANCHORS_SHA256)
//   node scripts/anchor-data.mjs --check   exit 1 if any anchored file changed
// Re-run after regenerating any anchored registry (scripts/problems.mjs, scripts/agents.mjs, scripts/sf-snapshot.mjs).
import fs from 'node:fs';
import crypto from 'node:crypto';
export const ANCHORED = ['data/problems/registry.json', 'data/agents/registry.json', 'data/sf/manifest.json'];
export const ANCHORS = 'data/integrity/anchors.json';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
export const build = () => ({ version: 1, generator: 'scripts/anchor-data.mjs', note: 'SHA-256 of files cited by CORE Knowledge; committed reference, not computed at load', files: ANCHORED.map(path => { const b = fs.readFileSync(path); return { path, bytes: b.length, sha256: sha(b) }; }) });

if (import.meta.url === `file://${process.argv[1]}`) {
  const next = build();
  if (process.argv.includes('--check')) {
    const cur = JSON.parse(fs.readFileSync(ANCHORS, 'utf8')), bad = next.files.filter(f => cur.files.find(c => c.path === f.path)?.sha256 !== f.sha256);
    if (bad.length) { console.error(`anchors out of date: ${bad.map(f => f.path).join(', ')}`); process.exit(1); }
    console.log(`anchors current (${next.files.length} files)`);
  } else {
    fs.mkdirSync('data/integrity', { recursive: true });
    const text = JSON.stringify(next, null, 1) + '\n'; fs.writeFileSync(ANCHORS, text);
    console.log(`wrote ${ANCHORS}; pin ANCHORS_SHA256 = '${sha(text)}' in src/kb/knowledge.mjs`);
  }
}
