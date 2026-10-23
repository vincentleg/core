// CORE Idea Vault — private ideas with version history, SHA-256 fingerprints chained per version, optional
// passphrase encryption (PBKDF2 → AES-GCM, WebCrypto), and explicit permissions. Local prototype: nothing leaves the device.
// A fingerprint proves that a given text existed in this vault at a recorded local time. It is NOT a patent, NOT a
// trusted timestamp, and does NOT establish novelty or ownership; the UI says so.
import { T } from '../i18n/i18n.mjs';
const enc = new TextEncoder(), dec = new TextDecoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const subtle = () => globalThis.crypto.subtle;
export const sha256 = async s => hex(await subtle().digest('SHA-256', enc.encode(s)));
const canon = v => JSON.stringify({ n: v.n, title: v.title, problem: v.problem, solution: v.solution, evidence: v.evidence, problemId: v.problemId ?? null, at: v.at, prev: v.prev });

export function newIdea({ id, owner }) {
  return { id, owner, versions: [], permissions: { labsAnalysis: false, collaborators: [], publication: null }, reviews: [], contests: [] };
}
export async function addVersion(idea, { title, problem, solution, evidence = '', problemId = null, at = new Date().toISOString() }) {
  for (const [k, v] of Object.entries({ title, problem, solution })) if (!String(v ?? '').trim()) throw Error(`champ requis : ${k}`);
  const prev = idea.versions.at(-1)?.hash ?? null;
  const v = { n: idea.versions.length + 1, title: String(title).slice(0, 120), problem: String(problem).slice(0, 4000), solution: String(solution).slice(0, 4000), evidence: String(evidence).slice(0, 2000), problemId, at, prev };
  v.hash = await sha256(canon(v));
  return { ...idea, versions: [...idea.versions, v] };
}
// Recomputes every fingerprint and link; any edit of an earlier version breaks the chain.
export async function verifyChain(idea) {
  let prev = null;
  for (const v of idea.versions) { if (v.prev !== prev || v.hash !== await sha256(canon(v))) return { ok: false, at: v.n }; prev = v.hash; }
  return { ok: true, length: idea.versions.length };
}

export function grant(idea, permission, value, actor) {
  if (actor !== idea.owner) return { ok: false, error: 'seul l’auteur modifie les permissions' };
  if (permission === 'labsAnalysis') return { ok: true, value: { ...idea, permissions: { ...idea.permissions, labsAnalysis: !!value } } };
  if (permission === 'collaborator') return { ok: true, value: { ...idea, permissions: { ...idea.permissions, collaborators: [...new Set([...idea.permissions.collaborators, value])] } } };
  return { ok: false, error: 'permission inconnue' };
}
export const canRead = (idea, who) => who === idea.owner || idea.permissions.collaborators.includes(who) || (!!idea.permissions.publication && who === 'public');
export const canAnalyse = idea => idea.permissions.labsAnalysis === true;

// Publication is explicit, names the version, the licence chosen by the author and the attribution to keep.
export function publish(idea, { actor, version, licence, pseudonym, at = new Date().toISOString(), confirmDisclosure = false }) {
  if (actor !== idea.owner) return { ok: false, error: 'seul l’auteur publie' };
  if (!confirmDisclosure) return { ok: false, error: 'confirmation requise : une divulgation publique peut compromettre une future demande de brevet' };
  const v = idea.versions.find(x => x.n === version); if (!v) return { ok: false, error: 'version inconnue' };
  if (!['all-rights-reserved', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'CC0-1.0'].includes(licence)) return { ok: false, error: T('licence not offered', 'licence non proposée') };
  return { ok: true, value: { ...idea, permissions: { ...idea.permissions, publication: { version, hash: v.hash, licence, attribution: `${pseudonym} (${idea.owner})`, at } } } };
}

// Passphrase encryption at rest; PBKDF2-SHA-256 cost follows the current OWASP recommendation.
export async function seal(obj, passphrase, iterations = 600000) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16)), iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await subtle().deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, await subtle().importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { v: 1, kdf: 'PBKDF2-SHA-256', iterations, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
export async function open(box, passphrase) {
  const key = await subtle().deriveKey({ name: 'PBKDF2', salt: unb64(box.salt), iterations: box.iterations, hash: 'SHA-256' }, await subtle().importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  try { return JSON.parse(dec.decode(await subtle().decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct)))); }
  catch { throw Error(T('wrong passphrase or altered vault', 'phrase secrète incorrecte ou coffre altéré')); }
}

// Word-level comparison of two versions (LCS, bounded): [{ op: 'same' | 'add' | 'del', text }].
export function diffWords(a, b, max = 1500) {
  const A = String(a).split(/(\s+)/).slice(0, max), B = String(b).split(/(\s+)/).slice(0, max), n = A.length, m = B.length;
  const T = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i][j] = A[i] === B[j] ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
  const out = [], push = (op, text) => { const l = out.at(-1); if (l && l.op === op) l.text += text; else out.push({ op, text }); };
  let i = 0, j = 0; while (i < n && j < m) { if (A[i] === B[j]) { push('same', A[i]); i++; j++; } else if (T[i + 1][j] >= T[i][j + 1]) push('del', A[i++]); else push('add', B[j++]); }
  while (i < n) push('del', A[i++]); while (j < m) push('add', B[j++]);
  return out;
}
export function removeIdea(vault, id, actor) {
  const idea = vault.ideas.find(i => i.id === id); if (!idea) return { ok: false, error: T('unknown idea', 'idée inconnue') };
  if (idea.owner !== actor) return { ok: false, error: T('only the author deletes an idea', 'seul l’auteur supprime une idée') };
  return { ok: true, value: { ...vault, ideas: vault.ideas.filter(i => i.id !== id) } };
}
export const CATEGORIES = ['infrastructure', 'accessibilité', 'énergie', 'environnement', 'éducation', 'santé publique', 'autre']; // stored ids (French, kept for saved vaults)
const CAT_EN = { infrastructure: 'infrastructure', 'accessibilité': 'accessibility', 'énergie': 'energy', environnement: 'environment', 'éducation': 'education', 'santé publique': 'public health', autre: 'other' };
export const categoryLabel = c => T(CAT_EN[c] || c, c);
export function setMeta(idea, { category, notes }, actor) {
  if (actor !== idea.owner) return { ok: false, error: T('only the author edits the idea', 'seul l’auteur modifie l’idée') };
  if (category && !CATEGORIES.includes(category)) return { ok: false, error: T('unknown category', 'catégorie inconnue') };
  return { ok: true, value: { ...idea, ...(category ? { category } : {}), ...(notes != null ? { notes: String(notes).slice(0, 4000) } : {}) } };
}
