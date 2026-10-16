// CORE V7 — Living Earth: avatar model, map sources vs CSP, plain-language problem view, navigation, assets and pages.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8'), imp = p => import(path.join(ROOT, p));
const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };

test('avatar: appearance is normalised, pseudonym cleaned, and nothing about it is for sale or carries status', async () => {
  const A = await imp('src/earth/avatar-config.mjs'), E = await imp('src/world/entitlements.mjs');
  const st = mem();
  assert.ok(A.save({ appearance: { body: 'x', skin: 'zz', topColor: 'red', hair: '<script>' }, identity: { pseudonym: '<img src=x onerror=1>Noor' } }, st));
  const l = A.load(st);
  assert.equal(l.appearance.body, A.PRESETS[0].body); assert.equal(l.appearance.skin, A.PRESETS[0].skin); assert.match(l.appearance.topColor, /^#[0-9a-f]{6}$/i);
  assert.ok(!/[<>]/.test(l.identity.pseudonym));
  assert.equal(l.visibility.avatarPublic, false); assert.deepEqual(l.cosmetics.owned, []);
  assert.ok(E.FREE_CORE.includes('avatar-basic'), 'the full avatar creator is part of the free core');
  for (const k of ['rank', 'status', 'role', 'verified', 'authority', 'tier']) assert.ok(!(k in l.appearance), `appearance carries no ${k}`);
  assert.ok(A.SKINS.length >= 8 && new Set(A.SKINS.map(s => s.base)).size === 2, 'a wide, two-scan range of skin tones');
  assert.equal(A.normalize({ body: 'f', beard: true }).beard, false);
});

test('map style: every remote source host is exactly what the World CSP allows (and nothing needs a key)', async () => {
  const { livingEarthStyle, HOSTS } = await imp('src/earth/style.mjs');
  const csp = read('world.html').match(/connect-src ([^;]+);/)[1].split(/\s+/);
  for (const h of HOSTS) assert.ok(csp.includes(h), `${h} is in the CSP`);
  assert.ok(csp.filter(h => /^https?:/.test(h)).every(h => HOSTS.includes(h) || h === 'http://127.0.0.1:11434'), 'no other remote host');
  const urls = JSON.stringify(livingEarthStyle({})).match(/https:\/\/[^"]+/g);
  for (const u of urls) { assert.ok(HOSTS.some(h => u.startsWith(h)), u); assert.doesNotMatch(u, /key=|token=|access_token/i, u); }
  const noRelief = JSON.stringify(livingEarthStyle({ terrain: false }));
  assert.doesNotMatch(noRelief, /elevation-tiles/, 'without relief no elevation tiles are requested');
});

test('problem view: plain language by default, identifiers only in the technical details, and everything escaped', async () => {
  const V = await imp('src/earth/problem-view.mjs');
  assert.equal(V.humanPlace('FOLSOM ST 05TH ST → FALMOUTH ST'), 'Folsom St, entre 5th St et Falmouth St');
  const reg = JSON.parse(read('data/problems/registry.json')), p = reg.problems.find(x => x.id === 'sidewalk-below-bsp-min:5665000');
  const html = V.problemHTML(p, {});
  assert.match(html, /10 ft/); assert.match(html, /3,05 m/); assert.match(html, /Ce que l’on ne sait pas/); assert.match(html, /Revue humaine/);
  const visible = html.split('<details')[0].replace(/<[^>]+>/g, ' ');
  assert.ok(!visible.includes('5665000') && html.split('<details')[1].includes('sidewalk-below-bsp-min:5665000'), 'registry id shown only inside the technical details');
  assert.doesNotMatch(html.replace(/non validée?s?/gi, ''), /validé|approuvé|prouvé/i, 'no approval language (the record’s own “non validée” is fine)');
  const evil = { ...p, title: '<img src=x onerror=1>', statement: '"><script>x</script>', caveat: '<b id=evil>', evidence: [{ ref: '<i id=evil>', url: 'javascript:alert(1)' }] };
  const e = V.problemHTML(evil, {});
  assert.doesNotMatch(e, /<img|<script|<b id=evil>|<i id=evil>|javascript:/);
});

test('navigation: four destinations; every V6 section remains reachable from one of them', async () => {
  const NAV = await imp('src/shell/nav.mjs');
  assert.deepEqual(NAV.GROUPS.map(g => g.label), ['Explorer', 'Créer', 'Collaborer', 'Mon CORE']);
  const all = NAV.GROUPS.flatMap(g => [...(g.sections || []).map(s => s[0]), ...(g.links || []).map(l => l[0])]);
  for (const id of ['knowledge', 'progress', 'continuity', 'institutions', 'vault', 'labs', 'experts', 'communities', 'arena', 'academy', 'profile', 'journey', 'trust', 'world', 'dialogue', 'me', 'avatar', 'intelligence']) assert.ok(all.includes(id), id);
  assert.equal(NAV.groupOf('labs').id, 'create'); assert.equal(NAV.groupOf('trust').id, 'me');
});

test('assets: CC0 avatar files with their licences, three.js bundle without WebAssembly, OFL/ISC notices present', () => {
  for (const f of ['body-f.glb', 'body-m.glb', 'hair-kit.glb', 'skin-kit.glb', 'anim.glb']) { const s = fs.statSync(path.join(ROOT, 'assets/avatars', f)).size; assert.ok(s > 1000 && s < 2e6, `${f} ${s}`); }
  for (const f of ['LICENSE-quaternius-ubc.txt', 'LICENSE-quaternius-ual.txt']) assert.match(read(`assets/avatars/${f}`), /CC0 1\.0/);
  const bundle = read('assets/vendor/three-0.186.1/core3d.min.mjs');
  assert.doesNotMatch(bundle, /WebAssembly\.(instantiate|compile)/); assert.match(bundle, /SPDX-License-Identifier: MIT/);
  assert.match(read('assets/fonts/OFL-inter.txt'), /SIL Open Font License/); assert.match(read('assets/vendor/LUCIDE-LICENSE.txt'), /ISC/);
});

test('V7 pages: strict CSP, boot guard, readiness global named, no inline script', () => {
  for (const [f, g] of [['world.html', 'CORE_EARTH'], ['avatar.html', 'CORE_STUDIO'], ['dialogue.html', 'CORE_DIALOGUE'], ['me.html', 'CORE_ME'], ['commons.html', 'CORE_COMMONS']]) {
    const s = read(f);
    assert.match(s, /script-src 'self';/, f); assert.doesNotMatch(s, /unsafe-eval|wasm-unsafe-eval/, f);
    assert.match(s, new RegExp(`<meta name="core-ready" content="${g}">`), f); assert.match(s, /src="src\/ui\/boot-guard\.mjs"/, f);
    assert.doesNotMatch(s, /<script(?![^>]*src=)/, `${f}: no inline script`);
  }
  assert.match(read('me.html'), /connect-src 'self' blob: data:;/);
});

test('backend schema: RLS enabled and forced on every table, no plaintext idea column, no self-grant', () => {
  const s = read('backend/schema.sql');
  const tables = [...s.matchAll(/create table core\.(\w+)/g)].map(m => m[1]);
  assert.ok(tables.length >= 7);
  for (const t of tables) { assert.match(s, new RegExp(`alter table core\\.${t} enable row level security`), t); assert.match(s, new RegExp(`alter table core\\.${t} force row level security`), t); }
  assert.doesNotMatch(s, /using \(true\)/i, 'no policy grants everyone everything');
  assert.match(s, /not \(box \? 'plaintext'\)/); assert.match(s, /no self-grant/); assert.match(s, /reviewers cannot decide on their own contribution/);
});
