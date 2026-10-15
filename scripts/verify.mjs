import { git, needsTests, security, full, scanCommits } from './lib/verification.mjs';
const ci = process.argv.includes('--ci'), base = process.env.CORE_VERIFY_BASE;
if (ci && base && !/^0{40}$/.test(base)) {
  if (!/^[a-f0-9]{40}$/.test(base)) throw Error('Invalid CI base');
  scanCommits(git('rev-list', '--reverse', `${base}..HEAD`).split('\n').filter(Boolean));
  const files = git('diff', '--name-only', '--no-renames', base, 'HEAD').split('\n').filter(Boolean);
  if (!needsTests(files)) { security(); console.log('Documentation-only CI: integrity/CSP passed; no application suite.'); }
  else full('HEAD');
} else full(ci ? 'HEAD' : null);
