// CORE Idea Vault session — one place that holds the decrypted vault in memory, re-seals on every change, and forgets the
// passphrase automatically: after 10 minutes without activity, 60 s after the page is hidden, and when it is unloaded.
// Storage: `core.vault.v1` holds ciphertext only (see vault.mjs). Used by Commons and Dialogue.
import { seal, open } from './vault.mjs';
const KEY = 'core.vault.v1';
export const AUTO_LOCK_MS = 10 * 60 * 1000;
let state = null, timer = null; const listeners = new Set();
const get = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const put = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch { return false; } };
const emit = () => listeners.forEach(f => { try { f(!!state); } catch {} });
function arm() { clearTimeout(timer); if (state) timer = setTimeout(lock, AUTO_LOCK_MS); }
export const exists = () => !!get();
export const unlocked = () => !!state;
export const onChange = f => { listeners.add(f); return () => listeners.delete(f); };
export async function unlock(passphrase, owner) {
  if (String(passphrase).length < 12) throw Error('phrase secrète de 12 caractères au moins');
  const box = get();
  const vault = box ? await open(box, passphrase) : { owner, ideas: [] };
  state = { pass: passphrase, vault }; if (!box) await save(); arm(); emit(); return vault;
}
export function vault() { if (!state) throw Error('coffre verrouillé'); arm(); return state.vault; }
export async function save(next) { if (!state) throw Error('coffre verrouillé'); if (next) state.vault = next; arm(); return put(await seal(state.vault, state.pass)); }
export function lock() { clearTimeout(timer); state = null; emit(); }
export function destroy() { lock(); try { localStorage.removeItem(KEY); } catch {} }
export const HIDDEN_LOCK_MS = 60 * 1000;
if (typeof addEventListener === 'function') {
  addEventListener('pagehide', lock);
  document.addEventListener?.('visibilitychange', () => { if (!state) return; clearTimeout(timer); timer = setTimeout(lock, document.visibilityState === 'hidden' ? HIDDEN_LOCK_MS : AUTO_LOCK_MS); });
}
