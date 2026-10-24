// Local reuse is an efficiency cache, never an authorization/security boundary. CI validates a fresh checkout.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
export const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
export const isDocumentation = p => /\.md$/i.test(p);
export const needsTests = files => files.some(p => !isDocumentation(p));
export function fingerprint(ref = null) {
  const records = ref ? git('ls-tree', '-rz', ref).split('\0').filter(Boolean).map(l => { const [meta, file] = l.split('\t'); return { meta, file }; })
    : git('ls-files', '--stage', '-z').split('\0').filter(Boolean).map(l => { const [meta, file] = l.split('\t'); return { meta: meta.replace(/ 0$/, ''), file }; });
  const items = records.filter(r => !isDocumentation(r.file)).map(r => [r.file, r.meta.replace(' blob ', ' ')]).sort((a, b) => a[0].localeCompare(b[0]));
  return crypto.createHash('sha256').update(JSON.stringify([process.version, process.platform, items])).digest('hex');
}
export function unchangedRuntime(ref = null) {
  const args = ['diff', '--name-only', '--no-renames', ...(ref ? [ref] : [])];
  return !needsTests(git(...args).split('\n').filter(Boolean));
}
const proofPath = key => `.core-local/verification/${key}.json`;
export function reusable(ref = null) {
  if (!unchangedRuntime(ref)) return false;
  const key = fingerprint(ref);
  try { const p = JSON.parse(fs.readFileSync(proofPath(key))), age = Date.now() - Date.parse(p.at); return p.key === key && p.node === process.version && p.passed === true && age >= 0 && age <= 86400000; } catch { return false; }
}
export function security() {
  for (const args of [['scripts/csp.mjs', '--check'], ['scripts/integrity-check.mjs', '--all']]) execFileSync(process.execPath, args, { stdio: 'inherit' });
  execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
}
export function full(ref = null) {
  if (!unchangedRuntime(ref)) throw Error('Stage runtime changes before verification, or check out the exact push target.');
  const key = fingerprint(ref); security();
  const tests = fs.readdirSync('test').filter(f => f.endsWith('.test.js')).sort().map(f => 'test/' + f);
  // Git hooks export GIT_DIR, GIT_INDEX_FILE, GIT_WORK_TREE…; inherited by tests, they would redirect fixture repositories
  // (git init/commit/config in temporary directories) into this real repository. Tests run without them.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|COMMON_DIR|NAMESPACE|CEILING_DIRECTORIES|DISCOVERY_ACROSS_FILESYSTEM|PREFIX|QUARANTINE_PATH|CONFIG|CONFIG_GLOBAL|CONFIG_SYSTEM|CONFIG_PARAMETERS|CONFIG_COUNT|CONFIG_KEY_\d+|CONFIG_VALUE_\d+|EXEC_PATH|PUSH_OPTION_\w+)$/.test(k)));
  execFileSync(process.execPath, ['--test', ...tests], { stdio: 'inherit', env });
  if (!unchangedRuntime(ref) || fingerprint(ref) !== key) throw Error('Runtime changed during verification');
  fs.mkdirSync('.core-local/verification', { recursive: true });
  fs.writeFileSync(proofPath(key), JSON.stringify({ key, node: process.version, passed: true, at: new Date().toISOString() }) + '\n');
  console.log('Full verification passed; reusable for identical runtime tree and Node version.');
}
export function scanCommits(commits) {
  for (const commit of commits) {
    if (!/^[a-f0-9]{40}$/.test(commit)) throw Error('Invalid commit');
    const parents = git('rev-list', '--parents', '-n', '1', commit).split(' ');
    const base = parents[1] || '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
    execFileSync(process.execPath, ['scripts/integrity-check.mjs', '--push', `${base}..${commit}`], { stdio: 'inherit' });
  }
}
