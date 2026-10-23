const test = require('node:test'), assert = require('node:assert/strict');
const tick = () => new Promise(resolve => setImmediate(resolve));
const original = Object.fromEntries(['SpeechRecognition', 'webkitSpeechRecognition', 'confirm'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
test.afterEach(() => { for (const [k, d] of Object.entries(original)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } });
function fake({ local = false, available = 'available', prefixed = false, consent = true } = {}) {
  delete globalThis.SpeechRecognition; delete globalThis.webkitSpeechRecognition;
  const instances = [], prompts = [];
  class SR {
    constructor() { instances.push(this); }
    static async available() { return available; }
    static install() { assert.fail('Speech packs must never install automatically'); }
    start() { this.started = true; this.onstart?.(); }
    abort() { this.aborted = true; this.onend?.(); }
  }
  if (local) SR.prototype.processLocally = false;
  globalThis[prefixed ? 'webkitSpeechRecognition' : 'SpeechRecognition'] = SR;
  globalThis.confirm = text => { prompts.push(text); return consent; };
  return { SR, instances, prompts };
}
function session(D, code = 'en') {
  const states = [], text = [];
  const cancel = D.startDictation({ code, onState: (...s) => states.push(s), onText: (...t) => text.push(t) });
  return { states, text, cancel };
}
const result = (rec, text, final) => rec.onresult({ results: [Object.assign([{ transcript: text }], { isFinal: final })] });

test('native and prefixed recognition: six locales, interim/final text, consent before capture, no Qwen', async () => {
  const D = await import('../src/ui/dictation.mjs');
  for (const [i, [code, locale]] of Object.entries(Object.entries({ en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', 'zh-CN': 'zh-CN', pt: 'pt-BR' }))) {
    const f = fake({ prefixed: Number(i) % 2 === 1 }), s = session(D, code);
    assert.equal(f.instances.length, 0, 'capture is not started synchronously before consent'); await tick();
    assert.equal(f.prompts.length, 1); assert.match(f.prompts[0], /provider|éditeur|Qwen/);
    const rec = f.instances[0]; assert.equal(rec.lang, locale); assert.equal(rec.interimResults, true);
    result(rec, 'Take me', false); result(rec, 'Take me to Oakland', true);
    assert.deepEqual(s.text.map(t => t.slice(0, 2)), [['Take me', false], ['Take me to Oakland', true]]);
    assert.equal(rec.maxAlternatives, 5);
    assert.equal(rec.aborted, true); assert.deepEqual(s.states.at(-1), ['idle', undefined]);
    result(rec, 'late duplicate', true); assert.equal(s.text.length, 2);
  }
});
test('already available on-device recognition needs no external consent or pack installation', async () => {
  const D = await import('../src/ui/dictation.mjs'), f = fake({ local: true }), s = session(D);
  await tick(); assert.equal(f.prompts.length, 0); assert.equal(f.instances[0].processLocally, true);
  assert.deepEqual(s.states.at(-1), ['listening', 'local']); s.cancel();
});
test('downloadable or failed local capability uses disclosed browser fallback, without installing', async () => {
  const D = await import('../src/ui/dictation.mjs');
  for (const availability of ['downloadable', 'downloading', 'unavailable', 'throws']) {
    const f = fake({ local: true, available: availability }); if (availability === 'throws') f.SR.available = async () => { throw Error('denied capability query'); };
    const s = session(D); await tick(); assert.equal(f.prompts.length, 1); assert.equal(f.instances[0].processLocally, false); s.cancel();
  }
});
test('declining browser-provider consent never constructs or starts recognition', async () => {
  const D = await import('../src/ui/dictation.mjs'), f = fake({ consent: false }), s = session(D);
  await tick(); assert.equal(f.instances.length, 0); assert.deepEqual(s.states.at(-1), ['idle', undefined]);
});
test('unsupported browser explains text fallback without asking permission', async () => {
  const D = await import('../src/ui/dictation.mjs'); fake(); delete globalThis.SpeechRecognition;
  const s = session(D); await tick(); assert.deepEqual(s.states.at(-1), ['error', 'unsupported']);
  assert.match(D.dictationMessage('unsupported'), /Type your request/);
});
test('cancel during capability detection prevents later consent and capture', async () => {
  const D = await import('../src/ui/dictation.mjs'), f = fake({ local: true }); let resolve;
  f.SR.available = () => new Promise(r => { resolve = r; }); const s = session(D); s.cancel(); resolve('available'); await tick();
  assert.equal(f.instances.length, 0); assert.equal(f.prompts.length, 0);
});
test('cancel while listening preserves interim text and suppresses late final commands', async () => {
  const D = await import('../src/ui/dictation.mjs'), f = fake(), s = session(D); await tick();
  const rec = f.instances[0]; result(rec, 'draft', false); s.cancel(); result(rec, 'unexpected command', true);
  assert.deepEqual(s.text.map(t => t.slice(0, 2)), [['draft', false]]); assert.equal(rec.aborted, true);
});
test('permission, recognition errors and silent end remain errors after onend', async () => {
  const D = await import('../src/ui/dictation.mjs');
  for (const [error, expected] of [['not-allowed','permission'],['service-not-allowed','permission'],['audio-capture','permission'],['network','network'],['no-speech','no-speech'],['end','no-speech']]) {
    const f = fake(), s = session(D); await tick(); const rec = f.instances[0];
    if (error === 'end') rec.onend(); else { rec.onerror({ error }); rec.onend(); }
    assert.deepEqual(s.states.at(-1), ['error', expected]); assert.equal(s.text.length, 0);
  }
});
test('bounded silence timeout releases recognition and keeps typing available', async () => {
  const D = await import('../src/ui/dictation.mjs'), saved = globalThis.setTimeout; let timeout;
  globalThis.setTimeout = (fn, ms) => { assert.equal(ms, 20000); timeout = fn; return 123; };
  try { const f = fake(), s = session(D); await tick(); timeout(); assert.equal(f.instances[0].aborted, true); assert.deepEqual(s.states.at(-1), ['error','no-speech']); }
  finally { globalThis.setTimeout = saved; }
});

test('provider alternatives and confidence survive unchanged; no guessed place substitution', async () => {
  const D = await import('../src/ui/dictation.mjs'), f = fake(), s = session(D, 'fr'); await tick();
  f.instances[0].onresult({ results: [Object.assign([{ transcript: 'First Street', confidence: .51 }, { transcript: 'Folsom Street', confidence: .48 }], { isFinal: true })] });
  assert.equal(s.text[0][0], 'First Street');
  assert.deepEqual(s.text[0][2], { language: 'fr-FR', alternatives: [{ text: 'First Street', confidence: .51 }, { text: 'Folsom Street', confidence: .48 }] });
});
