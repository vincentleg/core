// CORE V9 — the person's own contributions, kept in this browser only (localStorage core.contrib.v1).
// A contribution is 'private' (never leaves this list) or 'shared' (the person explicitly confirmed sharing it with a
// mission: its title and text were then added to that mission's log, in this browser — CORE has no shared server, so
// nobody else sees it). Private entries are stored in clear in this browser; the encrypted Idea Vault is separate.
// R31: `city` is an optional reference to a saved city summary (identity, digest, compared investigations).
// R29: `investigation` is an optional reference to a saved local agent investigation (src/execution/saved.mjs).
// R27: `relates` is an optional snapshot of the public mission item a contribution responds to (src/earth/mission-intel.mjs).
import { cleanLink } from '../earth/mission-intel.mjs';
import { cleanRef, cleanCityRef } from '../execution/saved.mjs';
export const KEY = 'core.contrib.v1';
const read = st => { try { if (st === undefined) st = globalThis.localStorage; const v = JSON.parse(st?.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = (list, st) => { try { if (st === undefined) st = globalThis.localStorage; st?.setItem(KEY, JSON.stringify(list.slice(-50))); return true; } catch { return false; } };
export const list = st => read(st);
export function save(entry, st) {
  const all = read(st), id = entry.id || `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const e = { id, at: entry.at || new Date().toISOString(), mission: entry.mission || null, kind: entry.kind, title: String(entry.title || '').slice(0, 120), text: String(entry.text || '').slice(0, 1000), place: entry.place || null, structuredBy: entry.structuredBy || 'deterministic', state: entry.state === 'shared' ? 'shared' : 'private', demonstration: entry.demonstration === true, sharedAs: entry.sharedAs || null, relates: cleanLink(entry.relates), investigation: cleanRef(entry.investigation), city: cleanCityRef(entry.city) };
  const i = all.findIndex(x => x.id === id); if (i >= 0) all[i] = { ...all[i], ...e }; else all.push(e); write(all, st); return e;
}
export function markShared(id, sharedAs, st) { const all = read(st), e = all.find(x => x.id === id); if (!e || e.demonstration) return null; e.state = 'shared'; e.sharedAs = sharedAs; e.sharedAt = new Date().toISOString(); write(all, st); return e; }
export function remove(id, st) { write(read(st).filter(x => x.id !== id), st); removeLifecycle(id, st); }
// R1 lifecycle records (src/contrib/lifecycle.mjs), keyed by contribution id, owned by this browser's random local id.
// The owner id is not an account: it only scopes records to this browser. Deleting a contribution deletes its history.
export const LIFE_KEY = 'core.lifecycle.v1';
const readLife = st => { try { if (st === undefined) st = globalThis.localStorage; const v = JSON.parse(st?.getItem(LIFE_KEY) || 'null'); return v && typeof v === 'object' && v.records && typeof v.records === 'object' ? v : { owner: null, records: {} }; } catch { return { owner: null, records: {} }; } };
const writeLife = (v, st) => { try { if (st === undefined) st = globalThis.localStorage; st?.setItem(LIFE_KEY, JSON.stringify(v)); return true; } catch { return false; } };
export function localOwner(st) { const v = readLife(st); if (!v.owner) { v.owner = `local.${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`; if (!writeLife(v, st)) return null; } return v.owner; }
export const lifecycles = st => readLife(st).records;
export function saveLifecycle(record, st) { const v = readLife(st); if (!v.owner || record.owner !== v.owner) return false; v.records[record.id] = record; return writeLife(v, st); }
export function removeLifecycle(id, st) { const v = readLife(st); if (v.records[id]) { delete v.records[id]; writeLife(v, st); } }
