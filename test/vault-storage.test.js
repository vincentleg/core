const test = require('node:test'), assert = require('node:assert/strict');
test('vault rejects failed persistence without discarding the previous encrypted record', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), records = new Map(); let denied = false;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => records.get(key) || null,
    setItem(key, value) { if (denied) throw Error('QuotaExceededError'); records.set(key, value); },
    removeItem: key => records.delete(key),
  } });
  const VS = await import('../src/civic/vault-session.mjs'), V = await import('../src/civic/vault.mjs');
  try {
    await VS.unlock('synthetic-only-passphrase', 'acceptance-owner'); const original = records.get('core.vault.v1');
    denied = true; const draft = { owner: 'acceptance-owner', ideas: [{ id: 'unsaved' }] };
    await assert.rejects(VS.save(draft), /Storage unavailable/);
    assert.equal(records.get('core.vault.v1'), original);
    assert.equal(VS.unlocked(), true, 'failed persistence does not lock the open session');
    assert.equal(VS.vault().ideas.length, 0, 'a rejected replacement does not commit in memory');
    denied = false; await VS.save(draft);
    assert.equal((await V.open(JSON.parse(records.get('core.vault.v1')), 'synthetic-only-passphrase')).ideas[0].id, 'unsaved');
    denied = true; await assert.rejects(VS.save({ owner: 'acceptance-owner', ideas: [] }), /Storage unavailable/);
    assert.equal(VS.vault().ideas[0].id, 'unsaved', 'a failed deletion remains retryable');
    denied = false; await VS.save({ owner: 'acceptance-owner', ideas: [] });
    assert.equal(VS.vault().ideas.length, 0);
    VS.lock(); denied = true;
    records.delete('core.vault.v1'); await assert.rejects(VS.unlock('synthetic-only-passphrase', 'acceptance-owner'), /Storage unavailable/);
    assert.equal(VS.unlocked(), false, 'a failed vault creation must not leave a false open state');
  } finally { VS.lock(); if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage; }
});
