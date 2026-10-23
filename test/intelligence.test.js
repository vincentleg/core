// CORE Intelligence V7 — the verifier (semantic checks before any model wording is shown) and the orchestrator
// (deterministic by default; a model can only reword cited Knowledge claims, and is discarded if it fails verification).
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const V = () => import(path.join(ROOT, 'src/intelligence/verifier.mjs')), O = () => import(path.join(ROOT, 'src/intelligence/orchestrator.mjs'));
const EV = [{ text: 'Trottoir plus étroit que le minimum du Better Streets Plan — FOLSOM ST 05TH ST → FALMOUTH ST. Largeur mesurée 10 ft (étude 2014) < minimum 12 ft pour la classe « Mixed-use ».', record: 'sidewalks:8562', status: 'observed' }];

test('verifier: the V6 failure (a design rule called a standard) and other status changes are rejected', async () => {
  const { verify } = await V();
  for (const bad of ['Il n’est donc pas conforme aux normes du Better Streets Plan [1].', 'Le minimum requis est de 12 ft [1].', 'Ce trottoir est illégal [1].', 'La norme impose 12 ft [1].'])
    assert.equal(verify(bad, EV).ok, false, bad);
  assert.equal(verify('La largeur mesurée est de 10 ft pour un minimum de 12 ft (étude 2014) [1].', EV).ok, true);
});
test('verifier: numbers, conversions, differences and years must come from the evidence', async () => {
  const { verify } = await V();
  assert.equal(verify('Il manque 2 ft, soit 0,61 m [1].', EV).ok, true);
  assert.equal(verify('10 ft, soit 3,05 m [1].', EV).ok, true);
  assert.deepEqual(verify('Mesuré à 9 ft [1].', EV).issues.map(i => i.code), ['number']);
  assert.ok(verify('Mesuré à 10 ft en 2024 [1].', EV).issues.some(i => i.code === 'date'));
});
test('verifier: overclaims rejected, explicit epistemic limits allowed, citations required and must exist', async () => {
  const { verify } = await V();
  assert.equal(verify('Le trottoir est dangereux [1].', EV).ok, false);
  assert.equal(verify('C’est prouvé : 10 ft [1].', EV).ok, false);
  assert.equal(verify('10 ft [1]. Il n’est pas possible de déterminer si cela est dangereux sans informations supplémentaires.', EV).ok, true);
  assert.equal(verify('La largeur mesurée est de 10 ft.', EV).ok, false, 'no citation');
  assert.equal(verify('La largeur mesurée est de 10 ft [3].', EV).ok, false, 'citation out of range');
});
test('privacy screen: personal data never goes to a model', async () => {
  const { privacyCheck } = await V();
  assert.equal(privacyCheck(['moi', 'exemple.org'].join('@') + ' trottoir ?').ok, false);
  assert.equal(privacyCheck('Que sait-on de ce trottoir ?').ok, true);
});

const index = async () => { const k = await import(path.join(ROOT, 'src/kb/knowledge.mjs')); return k.buildIndex(p => read(p)); };
test('orchestrator: deterministic by default — no generation call at all', async () => {
  const { answer } = await O(), ix = await index(); let called = 0;
  const r = await answer('Que sait-on du trottoir FOLSOM ST 05TH ST → FALMOUTH ST ?', { ix, generate: async () => { called++; return 'x'; } });
  assert.equal(called, 0); assert.equal(r.provider, 'deterministic'); assert.ok(r.citations.length > 0);
});
test('orchestrator: a model wording that fails verification is discarded; the cited deterministic answer is shown with reasons', async () => {
  const { answer } = await O(), ix = await index();
  const bad = await answer('Que sait-on du trottoir FOLSOM ST 05TH ST → FALMOUTH ST ?', { ix, provider: 'ollama', model: 'test', generate: async () => 'Ce trottoir n’est pas conforme aux normes ADA [1].' });
  assert.equal(bad.provider, 'deterministic'); assert.ok(bad.rejected.issues.length >= 2); assert.match(bad.text, /10 ft/);
  const good = await answer('Que sait-on du trottoir FOLSOM ST 05TH ST → FALMOUTH ST ?', { ix, provider: 'ollama', model: 'test', generate: async () => 'La largeur mesurée est de 10 ft, sous le minimum de 12 ft (étude 2014) [1]. La largeur actuelle reste inconnue.' });
  assert.equal(good.provider, 'ollama'); assert.equal(good.verified, true);
  const down = await answer('Que sait-on du trottoir FOLSOM ST 05TH ST → FALMOUTH ST ?', { ix, provider: 'ollama', model: 'test', generate: async () => { throw Error('ECONNREFUSED'); } });
  assert.equal(down.provider, 'deterministic'); assert.match(down.fallback, /unavailable/);
  const pii = await answer(`Que sait-on du trottoir FOLSOM ST 05TH ST → FALMOUTH ST ? ${['moi', 'exemple.org'].join('@')}`, { ix, provider: 'ollama', model: 'test', generate: async () => { throw Error('must not be called'); } });
  assert.equal(pii.provider, 'deterministic'); assert.match(pii.fallback, /personnelles/);
});
test('orchestrator: the remote provider is disabled; the local endpoint is loopback only; Dialogue CSP allows only that', async () => {
  const { PROVIDERS } = await O();
  assert.equal(PROVIDERS.remote.disabled, true); assert.equal(PROVIDERS.deterministic.default, true);
  assert.match(PROVIDERS.ollama.endpoint, /^http:\/\/127\.0\.0\.1:11434$/);
  assert.match(read('dialogue.html'), /connect-src 'self' http:\/\/127\.0\.0\.1:11434;/);
  assert.doesNotMatch(read('src/intelligence/orchestrator.mjs'), /https?:\/\/(?!127\.0\.0\.1)[a-z]/i, 'no remote URL in the orchestrator');
});
