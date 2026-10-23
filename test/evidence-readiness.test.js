'use strict';
// R3 evidence governance: the source manifest may not claim more than it can show.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const m = JSON.parse(fs.readFileSync('docs/pilot/source-manifest.json', 'utf8'));

test('manifest never reports calibration readiness, validation or real-world authority', () => {
  assert.equal(m.calibrationReady, false); assert.equal(m.authorizesRealWorld, false);
  assert.ok(!/VALIDATED|CALIBRATED/.test(JSON.stringify(m.sources.map(s => s.rights))));
});

test('only sources with a licence and an evidence URL may be AUTHORIZED_AVAILABLE; measured SFMTA tables stay unconfirmed', () => {
  const allowed = new Set([...m.r3.statusVocabulary, 'UNVERIFIED', 'PREVIOUSLY_DOCUMENTED']);
  for (const s of m.sources) {
    assert.ok(allowed.has(s.rights.status), `${s.id}: ${s.rights.status}`);
    if (s.rights.status === 'AUTHORIZED_AVAILABLE') { assert.ok(s.rights.license && /^https:\/\//.test(s.rights.evidenceUrl), s.id); assert.notEqual(s.kind, 'measured-candidate-not-ingested', `${s.id}: measured tables need a written grant`); }
    if (/^sfmta-/.test(s.id)) assert.notEqual(s.rights.status, 'AUTHORIZED_AVAILABLE', `${s.id}: no SFMTA reuse grant is recorded`);
  }
  assert.equal(m.sources.find(s => s.id === 'sfcta-cmp-speeds').rights.status, 'RESTRICTED');
  assert.equal(m.sources.find(s => s.id === 'caltrans-pems').rights.status, 'NOT_APPLICABLE');
});

test('corridor reconstruction is recorded with official sources and an epoch rule', () => {
  const c = m.r3.corridorChange;
  assert.ok(c.sources.every(u => u.startsWith('https://www.sfmta.com/')));
  assert.match(c.consequence, /one epoch/); assert.match(c.consequence, /Mixing epochs is a protocol failure/);
  const r = fs.readFileSync('docs/R3_EVIDENCE_READINESS.md', 'utf8');
  assert.match(r, /no scientific validation exists or is claimed/i);
  assert.match(r, /Impossible without real observations/);
});
