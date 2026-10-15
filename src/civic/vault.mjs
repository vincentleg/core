// CORE Idea Vault — private ideas with version history, SHA-256 fingerprints chained per version, optional
// passphrase encryption (PBKDF2 → AES-GCM, WebCrypto), and explicit permissions. Local prototype: nothing leaves the device.
// A fingerprint proves that a given text existed in this vault at a recorded local time. It is NOT a patent, NOT a
// trusted timestamp, and does NOT establish novelty or ownership; the UI says so.
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
  if (!['all-rights-reserved', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'CC0-1.0'].includes(licence)) return { ok: false, error: 'licence non proposée' };
  return { ok: true, value: { ...idea, permissions: { ...idea.permissions, publication: { version, hash: v.hash, licence, attribution: `${pseudonym} (${idea.owner})`, at } } } };
}

// Passphrase encryption for storage at rest in the browser. 210 000 PBKDF2-SHA-256 iterations (OWASP 2023 guidance).
export async function seal(obj, passphrase, iterations = 210000) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16)), iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await subtle().deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, await subtle().importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { v: 1, kdf: 'PBKDF2-SHA-256', iterations, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
export async function open(box, passphrase) {
  const key = await subtle().deriveKey({ name: 'PBKDF2', salt: unb64(box.salt), iterations: box.iterations, hash: 'SHA-256' }, await subtle().importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  try { return JSON.parse(dec.decode(await subtle().decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct)))); }
  catch { throw Error('phrase secrète incorrecte ou coffre altéré'); }
}
