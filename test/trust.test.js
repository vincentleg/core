// CORE TRUST V6 — cross-cutting checks: page policies, no external network code, journey privacy, navigation coverage,
// escaping in new UI modules, and no fabricated real-world claims in fictional modules.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const V6 = ['src/dialogue/engine.mjs', 'src/dialogue/room.mjs', 'src/shell/nav.mjs', 'src/shell/journey.mjs', 'src/civic/vault-session.mjs', 'src/civic/ui-journey.mjs', 'src/civic/ui-knowledge.mjs', 'src/civic/ui-network.mjs', 'src/civic/ui-more.mjs', 'src/civic/network.mjs', 'src/civic/debate.mjs', 'src/kb/contributions.mjs', 'src/kb/graph.mjs', 'src/kb/browser.mjs'];

test('pages: strict CSP — no inline or external scripts; Dialogue and Commons can only talk to this site', () => {
  for (const f of ['dialogue.html', 'commons.html', 'world.html', 'world-classic.html', 'avatar.html']) {
    const csp = read(f).match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    assert.match(csp, /script-src 'self';/, f); assert.doesNotMatch(csp, /unsafe-eval|script-src[^;]*unsafe-inline/, f);
    assert.match(csp, /object-src 'none'/, f); assert.match(csp, /form-action 'none'/, f);
    assert.doesNotMatch(read(f), /<script(?![^>]*src="src\/)/, `${f}: only same-origin module scripts`);
  }
  assert.match(read('commons.html'), /connect-src 'self';/);
  // V7: Dialogue may also reach a LOCAL model on the loopback interface, used only when the person switches it on.
  assert.match(read('dialogue.html'), /connect-src 'self' http:\/\/127\.0\.0\.1:11434;/);
  assert.match(read('world-classic.html'), /connect-src 'self' https:\/\/tiles\.openfreemap\.org;/);
  // V7 World: exactly the three public, keyless sources reviewed in docs/v7/TOOLING_AND_COSTS.md (OpenFreeMap tiles,
  // NASA GIBS imagery, AWS Terrain Tiles relief). blob:/data: are the map's own decoded resources, never remote.
  const w = read('world.html').match(/connect-src ([^;]+);/)[1].split(/\s+/).sort();
  assert.deepEqual(w, ["'self'", 'blob:', 'data:', 'https://gibs.earthdata.nasa.gov', 'https://s3.amazonaws.com', 'https://tiles.openfreemap.org'].sort());
  assert.match(read('avatar.html'), /connect-src 'self' blob: data:;/);
});

test('no V6 module contacts anything but this site: no absolute URL fetches, no sockets, no beacons, no storage of secrets in clear', () => {
  for (const f of V6) {
    const s = read(f);
    assert.doesNotMatch(s, /fetch\(\s*['"`]https?:|new WebSocket|sendBeacon|XMLHttpRequest|EventSource|navigator\.credentials/, f);
    assert.doesNotMatch(s, /localStorage\.setItem\([^)]*(pass|phrase|secret)/i, f);
  }
  assert.doesNotMatch(read('src/civic/vault-session.mjs'), /localStorage\.setItem\(KEY, JSON\.stringify\(state/, 'the decrypted vault is never stored');
});

test('journey state stores identifiers, counts and dates only — never idea text', async () => {
  const J = await import(path.join(ROOT, 'src/shell/journey.mjs'));
  const mem = new Map(), st = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) };
  const j = J.mark('vault', { problemId: 'p1', ideaId: 'i1', idea: { versions: 2, title: 'Mon idée secrète', solution: 'texte privé', missingEvidence: 1 } }, st);
  assert.deepEqual(j.idea, { versions: 2, missingEvidence: 1 });
  assert.ok(!mem.get('core.journey.v1').includes('secrète') && !mem.get('core.journey.v1').includes('privé'));
  assert.throws(() => J.mark('hack', {}, st)); J.reset(st); assert.equal(J.read(st).ideaId, null);
});

test('navigation: every section in the shell has a page; every V6 section is reachable', async () => {
  const NAV = await import(path.join(ROOT, 'src/shell/nav.mjs')), commons = read('src/civic/commons.mjs');
  const keys = new Set([...commons.matchAll(/\b([a-z]+): (?:UM\.|UJ\.|B => |render)/g)].map(m => m[1]));
  for (const g of NAV.GROUPS) for (const [id] of g.sections || []) assert.ok(keys.has(id) || new RegExp(`\\b${id}: render`).test(commons), `section ${id} has no renderer`);
  for (const f of ['world.html', 'dialogue.html', 'commons.html', 'index.html']) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
});

test('new UI modules escape what they render: every interpolation into HTML goes through esc() or is a number/constant', () => {
  for (const f of V6.filter(f => /ui-|room|nav/.test(f))) {
    const s = read(f);
    assert.match(s, /const esc = s => String\(s \?\? ''\)\.replace\(\/\[&<>"'\]\/g/, `${f} defines the standard escaper`);
    // Raw ${x.text}, ${p.title}, ${c.claim} etc. inside templates would be injection points.
    const raw = [...s.matchAll(/\$\{([a-z]\w*)\.(text|title|claim|summary|label|message|reason|name|by|place|note|body)\}/g)].map(m => m[0]);
    assert.deepEqual(raw, [], `${f}: unescaped interpolations ${raw.join(', ')}`);
  }
});

test('fictional modules never claim real people, institutions, approval or impact', () => {
  const s = read('src/civic/network.mjs') + read('src/civic/debate.mjs') + read('src/civic/ui-network.mjs');
  assert.doesNotMatch(s, /\b(MIT|Stanford|Harvard|Berkeley|Oxford|Cambridge University)\b/);
  assert.doesNotMatch(s, /approuvé par|validé par|endorsed by|certifié/i);
  assert.match(s, /FICTIF/);
});
