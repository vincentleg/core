// CORE Identity — local pseudonymous profiles (V4 prototype). No legal name, private by default, per-field visibility.
// Self-declared expertise and verified credentials are different kinds of statement: a user can only declare;
// "verified" needs an attestation from a named verifier, which no verifier can issue in this prototype.
export const VISIBILITY = ['private', 'public'];
export const FIELDS = ['pseudonym', 'avatar', 'bio', 'expertise', 'experience', 'interests', 'problems', 'contributions', 'achievements'];
const B32 = 'abcdefghijkmnpqrstuvwxyz23456789';

export function newCoreId(rand = n => globalThis.crypto.getRandomValues(new Uint8Array(n))) {
  return 'core:' + [...rand(10)].map(b => B32[b % B32.length]).join('');
}
// A pseudonym is not a vehicle for real identity or contact details.
export function checkPseudonym(p) {
  const s = String(p ?? '').trim();
  if (s.length < 3 || s.length > 24) return { ok: false, error: 'pseudonyme de 3 à 24 caractères' };
  if (!/^[\p{L}\p{N} ._-]+$/u.test(s)) return { ok: false, error: 'lettres, chiffres, espace, point, tiret ou souligné seulement' };
  if (/@|\d{6,}|https?:/i.test(s)) return { ok: false, error: 'pas d’adresse, de numéro ou de lien dans un pseudonyme' };
  return { ok: true, value: s };
}

export function createProfile({ pseudonym, avatar = null, ageBand = 'adult', id = newCoreId(), at = new Date().toISOString() }) {
  const p = checkPseudonym(pseudonym); if (!p.ok) throw Error(p.error);
  if (!['adult', 'minor', 'unknown'].includes(ageBand)) throw Error('tranche d’âge inconnue');
  return { id, createdAt: at, ageBand, pseudonym: p.value, avatar, bio: '', expertise: [], experience: '', interests: [], problems: [], achievements: [],
    visibility: Object.fromEntries(FIELDS.map(f => [f, 'private'])), leaderboards: false, contact: 'none' };
}

export function setVisibility(profile, field, v) {
  if (!FIELDS.includes(field) || !VISIBILITY.includes(v)) throw Error('champ ou visibilité inconnus');
  if (profile.ageBand !== 'adult' && v === 'public' && ['bio', 'experience', 'achievements'].includes(field)) throw Error('profil non adulte : ce champ reste privé');
  return { ...profile, visibility: { ...profile.visibility, [field]: v } };
}
export function setLeaderboards(profile, on) {
  if (on && profile.ageBand !== 'adult') throw Error('aucun classement public pour un profil non adulte');
  return { ...profile, leaderboards: !!on };
}

export function declareExpertise(profile, label, years = null) {
  const l = String(label ?? '').trim().slice(0, 60); if (!l) throw Error('compétence vide');
  return { ...profile, expertise: [...profile.expertise, { label: l, years: Number.isFinite(years) ? years : null, basis: 'declared' }] };
}
// Only a registered verifier may attest a credential. The prototype has none, so every call is refused.
export const VERIFIERS = [];
export function attestCredential(profile, index, verifier) {
  if (!VERIFIERS.some(v => v.id === verifier?.id)) return { ok: false, error: 'aucun vérificateur reconnu : une compétence déclarée reste déclarée' };
  const e = profile.expertise[index]; if (!e) return { ok: false, error: 'compétence inconnue' };
  return { ok: true, value: { ...profile, expertise: profile.expertise.map((x, i) => i === index ? { ...x, basis: 'verified', verifiedBy: verifier.id } : x) } };
}

// What another person may see: only public fields, never age band, contact or private ideas.
export function publicView(profile) {
  const out = { id: profile.id };
  for (const f of FIELDS) if (profile.visibility[f] === 'public') out[f] = profile[f];
  if (out.expertise) out.expertise = out.expertise.map(e => ({ label: e.label, basis: e.basis, ...(e.verifiedBy ? { verifiedBy: e.verifiedBy } : {}) }));
  return out;
}
