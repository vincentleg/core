// Offline Phase 3 installation checks. No account access, model call, package download or CORE runtime changes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const root = fs.realpathSync(new URL('..', import.meta.url)), lock = JSON.parse(fs.readFileSync(path.join(root, 'docs/development/CORE_V9_9_TOOLING_LOCK.json')));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
for (const [file, digest] of Object.entries(lock.files)) {
  const resolved = fs.realpathSync(path.join(root, file));
  assert.ok(resolved.startsWith(root + path.sep), `Tool file escapes this worktree: ${file}`);
  assert.equal(hash(fs.readFileSync(resolved)), digest, `Tool file changed: ${file}`);
}
for (const name of lock.skillsSource.installed) {
  const a = fs.readFileSync(path.join(root, '.agents/skills', name, 'SKILL.md'), 'utf8');
  assert.match(a, /^---\nname:/); assert.ok(a.includes(name));
  assert.equal(a, fs.readFileSync(path.join(root, '.claude/skills', name, 'SKILL.md'), 'utf8'));
}
assert.equal(fs.readFileSync(path.join(root, '.agents/skills/core-browser-audit/SKILL.md'), 'utf8'), fs.readFileSync(path.join(root, '.claude/skills/core-browser-audit/SKILL.md'), 'utf8'));
const binary = path.join(root, lock.gitleaks.binary);
assert.equal(hash(fs.readFileSync(binary)), lock.gitleaks.binarySha256, 'Unverified scanner binary; refusing execution');
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GITLEAKS_')));
const version = spawnSync(binary, ['version'], { cwd: root, env, encoding: 'utf8', timeout: 10000 });
assert.equal(version.status, 0); assert.equal('v' + version.stdout.trim(), lock.gitleaks.version);
// A generated, never-issued token tests detection without storing an actual credential or echoing the fixture.
const fixture = 'gh' + 'p_' + Array.from(crypto.randomBytes(36), n => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[n % 62]).join('');
for (const [label, input, expected] of [['clean', 'const publicLabel = "CORE";', 0], ['synthetic-secret', `example = "${fixture}"`, 1]]) {
  const result = spawnSync(binary, ['stdin', '--no-banner', '--redact=100', '--ignore-gitleaks-allow', '--log-level', 'error', '--report-format', 'json', '--report-path', '-'], { cwd: root, env, input, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, expected, `${label} scanner exit code`);
  assert.ok(!((result.stdout || '') + (result.stderr || '')).includes(fixture), 'Scanner fixture must remain redacted');
}
console.log(JSON.stringify({ pinnedFiles: Object.keys(lock.files).length, skills: lock.skillsSource.installed, browserSkillMatches: true, scanner: version.stdout.trim(), detectionAndRedaction: 'PASS', network: 'none', models: 'not invoked' }));
