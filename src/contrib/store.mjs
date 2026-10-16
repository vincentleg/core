// CORE V9 — the person's own contributions, kept in this browser only (localStorage core.contrib.v1).
// A contribution is 'private' (never leaves this list) or 'shared' (the person explicitly confirmed sharing it with a
// mission: its title and text were then added to that mission's log, in this browser — CORE has no shared server, so
// nobody else sees it). Private entries are stored in clear in this browser; the encrypted Idea Vault is separate.
export const KEY = 'core.contrib.v1';
const read = (st = globalThis.localStorage) => { try { const v = JSON.parse(st?.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = (list, st = globalThis.localStorage) => { try { st?.setItem(KEY, JSON.stringify(list.slice(-50))); return true; } catch { return false; } };
export const list = st => read(st);
export function save(entry, st) {
  const all = read(st), id = entry.id || `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const e = { id, at: entry.at || new Date().toISOString(), mission: entry.mission || null, kind: entry.kind, title: String(entry.title || '').slice(0, 120), text: String(entry.text || '').slice(0, 1000), place: entry.place || null, structuredBy: entry.structuredBy || 'deterministic', state: entry.state === 'shared' ? 'shared' : 'private', sharedAs: entry.sharedAs || null };
  const i = all.findIndex(x => x.id === id); if (i >= 0) all[i] = { ...all[i], ...e }; else all.push(e); write(all, st); return e;
}
export function markShared(id, sharedAs, st) { const all = read(st), e = all.find(x => x.id === id); if (!e) return null; e.state = 'shared'; e.sharedAs = sharedAs; e.sharedAt = new Date().toISOString(); write(all, st); return e; }
export function remove(id, st) { write(read(st).filter(x => x.id !== id), st); }
