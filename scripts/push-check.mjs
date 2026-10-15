// Pre-push: inspect every unpublished commit, including additions later removed, then reuse exact-tree tests.
import fs from 'node:fs';
import { git, needsTests, reusable, full, scanCommits } from './lib/verification.mjs';
const lines = fs.readFileSync(0, 'utf8').trim().split('\n').filter(Boolean), scanned = new Set();
for (const line of lines) {
  const [localRef, sha, , remoteSha] = line.trim().split(/\s+/);
  if (!/^[a-f0-9]{40}$/.test(sha || '') || !/^[a-f0-9]{40}$/.test(remoteSha || '')) throw Error('Invalid push input');
  if (/^0{40}$/.test(sha)) continue;
  const target = git('rev-parse', `${sha}^{commit}`);
  const unpublished = git('rev-list', '--reverse', target, '--not', '--remotes=origin').split('\n').filter(Boolean).filter(c => !scanned.has(c));
  scanCommits(unpublished); unpublished.forEach(c => scanned.add(c));
  let base = null;
  if (!/^0{40}$/.test(remoteSha)) base = git('rev-parse', `${remoteSha}^{commit}`);
  else { try { base = git('merge-base', target, 'refs/remotes/origin/main'); } catch { /* first publication */ } }
  const changed = base ? git('diff', '--name-only', '--no-renames', base, target).split('\n').filter(Boolean) : ['unverified-new-tree'];
  if (localRef.startsWith('refs/tags/') || needsTests(changed)) {
    if (reusable(target)) console.log('pre-push: exact runtime already verified; security scan retained.');
    else full(target);
  } else console.log('pre-push: documentation-only/no runtime change; security scan retained.');
}
