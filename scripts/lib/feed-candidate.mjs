// No remote operation: validate the exact local data-only candidate before any future PR publisher.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const run = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const allowed = p => /^data\/(feeds|missions|agents)\/[A-Za-z0-9_./-]+\.json$/.test(p) && !p.split('/').includes('..');
export function inspectCandidate() {
  const paths = run('diff', '--name-only', '--no-renames', 'HEAD').split('\n').filter(Boolean);
  const untracked = run('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
  const all = [...new Set([...paths, ...untracked])].sort();
  if (all.some(p => !allowed(p))) throw Error('Candidate contains changes outside generated feed JSON');
  const staged = run('ls-files', '--stage', '-z').split('\0').filter(Boolean);
  if (staged.some(s => s.startsWith('120000 ') && all.includes(s.split('\t')[1]))) throw Error('Symlink candidate forbidden');
  for (const p of all) {
    if (!fs.existsSync(p) || !fs.lstatSync(p).isFile() || fs.statSync(p).size > 8 * 1024 * 1024) throw Error('Candidate must contain bounded regular JSON files, no deletion or symlink');
    try { JSON.parse(fs.readFileSync(p, 'utf8')); } catch { throw Error('Invalid candidate JSON; payload withheld'); }
  }
  return { paths: all, base: run('rev-parse', 'HEAD'), target: 'main', autoMerge: false, externalWrites: false, requiredCheck: 'core-verify', next: all.length ? 'Human-reviewed PR after repository permission approval; never push directly to protected main.' : 'No change' };
}
