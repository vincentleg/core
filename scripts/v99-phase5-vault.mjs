// Synthetic records only: quota failures, encrypted persistence, explicit plaintext export and retryable deletion.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const port = Number(process.env.CORE_CDP_PORT || 9241), base = process.env.CORE_TEST_URL || 'http://127.0.0.1:8790/';
assert.ok(port !== 9222 && ['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`), rows = [];
const out = process.argv[2] || '.core-local/evidence/v99-phase5/vault.json';
try {
  for (const code of ['en', 'fr', 'es', 'de', 'zh-CN', 'pt']) {
    const ctx = await browser.newContext({ acceptDownloads: true }), page = await ctx.newPage();
    const row = { code, checks: [], errors: [] }, check = (name, ok) => { assert.equal(typeof ok, 'boolean', name); row.checks.push({ name, ok }); };
    page.on('pageerror', e => row.errors.push(e.message));
    await ctx.addInitScript(code => { localStorage.setItem('core.lang', code); const set = Storage.prototype.setItem; globalThis.denyVaultWrite = false; Storage.prototype.setItem = function(k, v) { if (k === 'core.vault.v1' && globalThis.denyVaultWrite) throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); return set.call(this, k, v); }; }, code);
    const submit = id => page.locator(id).evaluate(e => e.requestSubmit());
    const stored = () => page.evaluate(() => localStorage.getItem('core.vault.v1'));
    const deny = value => page.evaluate(value => { globalThis.denyVaultWrite = value; document.querySelector('#toast').textContent = ''; }, value);
    const confirmClick = selector => Promise.all([page.waitForEvent('dialog').then(d => d.accept()), page.locator(selector).click()]);
    try {
      await page.goto(new URL('commons.html#vault', base).href); await page.waitForFunction(() => !!globalThis.CORE_COMMONS);
      await page.evaluate(async () => { const I = await import('/src/civic/identity.mjs'), profile = I.createProfile({ pseudonym: 'AcceptanceTester' }); localStorage.setItem('core.commons.v1', JSON.stringify({ profile, labsLog: [] })); });
      await page.reload(); await page.locator('#vk-p').fill('synthetic-only-passphrase'); await submit('#vk'); await page.locator('#vf-t').waitFor();
      const error = await page.evaluate(async () => (await import('/src/i18n/i18n.mjs')).T('Storage unavailable: nothing was saved.', 'Stockage indisponible : rien n’a été enregistré.'));
      const before = await stored();
      await page.locator('#vf-t').fill('Synthetic acceptance idea'); await page.locator('#vf-p').fill('Synthetic accessibility problem'); await page.locator('#vf-s').fill('Synthetic proposed solution');
      await deny(true); await submit('#vf'); await page.waitForFunction(error => document.querySelector('#toast').textContent === error, error);
      check('failed save reports translated error', true);
      check('failed save preserves previous ciphertext and draft fields', await stored() === before && await page.locator('#vf-t').inputValue() === 'Synthetic acceptance idea');
      await deny(false); await submit('#vf'); await page.locator('#v-export').waitFor();
      const cipher = await stored();
      check('retry persists encrypted idea', cipher !== before && !cipher.includes('Synthetic acceptance idea') && JSON.parse(cipher).iterations === 600000);
      const warning = await page.evaluate(async () => (await import('/src/i18n/i18n.mjs')).T('The exported file is NOT encrypted. Continue?', 'Le fichier exporté n’est PAS chiffré. Continuer ?'));
      let downloads = 0; page.on('download', () => downloads++);
      await Promise.all([page.waitForEvent('dialog').then(async d => { check('export warns that file is plaintext', d.message() === warning); await d.dismiss(); }), page.locator('#v-export').click()]);
      await page.waitForTimeout(100); check('declining export creates no file', downloads === 0);
      const [download] = await Promise.all([page.waitForEvent('download'), page.waitForEvent('dialog').then(d => d.accept()), page.locator('#v-export').click()]);
      const stream = await download.createReadStream(), chunks = []; for await (const c of stream) chunks.push(c); const text = Buffer.concat(chunks).toString('utf8'), exported = JSON.parse(text);
      check('explicit export contains idea without passphrase', exported.idea.versions.at(-1).title === 'Synthetic acceptance idea' && !text.includes('synthetic-only-passphrase'));
      const metadataBefore = await stored(); await page.locator('#v-notes').fill('Synthetic updated notes'); await deny(true); await submit('#v-meta');
      await page.waitForFunction(error => document.querySelector('#toast').textContent === error, error);
      check('failed metadata save retains ciphertext and draft', await stored() === metadataBefore && await page.locator('#v-notes').inputValue() === 'Synthetic updated notes');
      await deny(false); await submit('#v-meta'); await page.waitForFunction(before => localStorage.getItem('core.vault.v1') !== before, metadataBefore);
      check('metadata save retry succeeds', true);
      await page.locator('#v-lock').click(); await page.locator('#vk-p').waitFor();
      await page.locator('#vk-p').fill('synthetic-only-passphrase'); await submit('#vk'); await page.locator('[data-open]').click();
      check('locked vault reopens with persisted metadata', await page.locator('#v-notes').inputValue() === 'Synthetic updated notes');
      const deletionBefore = await stored(); await deny(true); await confirmClick('#v-del'); await page.waitForFunction(error => document.querySelector('#toast').textContent === error, error);
      check('failed deletion retains record and remains retryable', await stored() === deletionBefore && await page.evaluate(async () => (await import('/src/civic/vault-session.mjs')).vault().ideas.length === 1));
      await deny(false); await confirmClick('#v-del'); await page.waitForFunction(() => CORE_COMMONS.state.vault?.ideas.length === 0);
      check('deletion retry removes the encrypted idea', await page.evaluate(async () => { const V = await import('/src/civic/vault.mjs'); return (await V.open(JSON.parse(localStorage.getItem('core.vault.v1')), 'synthetic-only-passphrase')).ideas.length === 0; }));
    } catch (e) { row.errors.push(e.message); }
    rows.push(row); fs.writeFileSync(out, JSON.stringify({ rows }, null, 2) + '\n'); await ctx.close(); console.log(code, row.checks.filter(c => !c.ok).length, 'failures', row.errors.length, 'errors');
  }
} finally { await browser.close(); }
assert.equal(rows.length, 6);
const failures = rows.reduce((n, r) => n + r.errors.length + r.checks.filter(c => !c.ok).length, 0);
fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), synthetic: true, rows, failures }, null, 2) + '\n'); process.exitCode = failures ? 1 : 0;
