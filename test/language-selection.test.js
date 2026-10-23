const test = require('node:test'), assert = require('node:assert/strict');
test('a slow dictionary load cannot override a newer selected interface/speech language', async () => {
  const originals = Object.fromEntries(['document', 'fetch', 'localStorage'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  let release, stored = 'en'; const events = [];
  try {
    globalThis.document = { documentElement: {}, querySelectorAll: () => [], querySelector: () => null, dispatchEvent: e => events.push(e.detail) };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => stored, setItem: (_, v) => { stored = v; } } });
    globalThis.fetch = () => new Promise(resolve => { release = () => resolve({ ok: true, json: async () => ({}) }); });
    const i18n = await import('../src/i18n/i18n.mjs?selection-race');
    const slow = i18n.setLang('es'); await i18n.setLang('fr'); release();
    assert.equal(await slow, false); assert.equal(i18n.lang(), 'fr'); assert.equal(stored, 'fr'); assert.deepEqual(events, ['fr']);
  } finally { for (const [k, d] of Object.entries(originals)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } }
});
