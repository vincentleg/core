// Browser loader for CORE Knowledge: fetches ONLY the allowlisted public files (assertAllowed), same-origin, no cache.
// Kept separate so src/kb/knowledge.mjs itself contains no network code (enforced by test/knowledge.test.js).
import { buildIndex, assertAllowed } from './knowledge.mjs';
let cached = null;
export function loadIndex() {
  cached = cached || buildIndex(async p => { const r = await fetch(assertAllowed(p), { cache: 'no-store', credentials: 'same-origin' }); if (!r.ok) throw Error(`${p} : HTTP ${r.status}`); return r.text(); });
  return cached;
}
