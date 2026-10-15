// Consistent local backup of CORE's private state (.core-local), never inside the repository and never sent anywhere.
//   node scripts/backup-local.mjs [--dest DIR] [--dry-run]
// Default destination: ~/CORE-backups/<UTC timestamp>/ (mode 700). SQLite files are copied with `sqlite3 .backup`,
// which is safe while a writer holds the WAL; JSON state files are copied as-is. Restore: stop CORE processes, then copy
// the files back into .core-local/ (the -wal/-shm files are not needed: the backup is a complete database).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function plan(root, dest) {
  const src = path.join(root, '.core-local');
  if (path.resolve(dest).startsWith(path.resolve(root) + path.sep)) throw Error('backup destination must be outside the repository');
  const items = [];
  const walk = (dir, rel = '') => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = path.join(rel, e.name), full = path.join(dir, e.name);
      if (e.isDirectory()) { if (!['backup', 'backups'].includes(r)) walk(full, r); continue; } // earlier backups are not re-copied
      if (/\.sqlite-(wal|shm|journal)$/.test(e.name)) continue;
      items.push({ from: full, to: path.join(dest, r), kind: e.name.endsWith('.sqlite') ? 'sqlite' : 'file' });
    }
  };
  if (fs.existsSync(src)) walk(src);
  return items;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), dry = args.includes('--dry-run');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = args.includes('--dest') ? path.resolve(args[args.indexOf('--dest') + 1]) : path.join(os.homedir(), 'CORE-backups', stamp);
  const items = plan(process.cwd(), dest);
  for (const it of items) {
    if (dry) { console.log(`${it.kind}\t${path.relative(process.cwd(), it.from)}`); continue; }
    fs.mkdirSync(path.dirname(it.to), { recursive: true, mode: 0o700 });
    if (it.kind === 'sqlite') execFileSync('sqlite3', [it.from, `.backup '${it.to.replace(/'/g, "''")}'`]);
    else fs.copyFileSync(it.from, it.to);
  }
  if (!dry) { fs.chmodSync(dest, 0o700); console.log(`backed up ${items.length} file(s) to ${dest}`); }
}
