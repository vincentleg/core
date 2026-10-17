// CORE avatar model (V7) — pure data, no rendering. The avatar is split into separate concerns so none can leak
// into another: identity (a pseudonym), appearance (what the renderer draws), visibility (who may see it), and
// cosmetics (future, optional). Appearance never carries status, competence, rank or review authority, and every
// option below is free: the full creator is part of FREE_CORE ('avatar-basic'); no payment can change what a person
// may do in CORE (see src/world/entitlements.mjs NEVER_FOR_SALE).
import { T } from '../i18n/i18n.mjs';
// [id, label] pairs whose label is read in the current language.
const P2 = (id, en, fr) => { const a = [id]; Object.defineProperty(a, 1, { get: () => T(en, fr), enumerable: true }); return a; };
const SK = (id, base, tint, en, fr) => ({ id, base, tint, get label() { return T(en, fr); } });
export const KEY = 'core.avatar.v2';
export const BODIES = [P2('f', 'Silhouette A', 'Silhouette A'), P2('m', 'Silhouette B', 'Silhouette B')]; // neutral labels: a body shape is not an identity
export const SKINS = [ // base texture (light/dark scan) × tint; a wide, evenly spaced range
  SK('s1', 'light', '#ffffff', 'Very light', 'Très clair'), SK('s2', 'light', '#f3dcc8', 'Light', 'Clair'),
  SK('s3', 'light', '#e2bb98', 'Light golden', 'Clair doré'), SK('s4', 'light', '#c99a74', 'Medium', 'Moyen'),
  SK('s5', 'dark', '#ffffff', 'Tan', 'Hâlé'), SK('s6', 'dark', '#d9b49a', 'Brown', 'Brun'),
  SK('s7', 'dark', '#a8826a', 'Dark brown', 'Brun foncé'), SK('s8', 'dark', '#7a5a48', 'Very dark', 'Très foncé'),
];
export const HAIRS = [P2('Hair_Long', 'Long', 'Longs'), P2('Hair_Buns', 'Buns', 'Chignons'), P2('Hair_SimpleParted', 'Side part', 'Raie de côté'), P2('Hair_BuzzedFemale', 'Short', 'Courts'), P2('Hair_Buzzed', 'Buzzed', 'Ras'), P2('none', 'None', 'Aucun')];
export const HAIR_COLORS = ['#2a1d17', '#4a2f22', '#7a4b2c', '#a0612f', '#c9a06a', '#d8c6a5', '#8c8c8c', '#3b3f58'];
export const TOPS = [P2('tee', 'T-shirt', 'T-shirt'), P2('knit', 'Fine knit', 'Pull fin'), P2('jacket', 'Jacket', 'Veste')];
export const BOTTOMS = [P2('jeans', 'Jeans', 'Jean'), P2('chino', 'Trousers', 'Pantalon'), P2('shorts', 'Shorts', 'Short')];
export const TOP_COLORS = ['#f2efe8', '#1f2a3a', '#2f6f8f', '#3d6b4f', '#8f3f3f', '#c58b3c', '#6b5c8f', '#d9cbb2'];
export const BOTTOM_COLORS = ['#2f3e58', '#1d1f24', '#6f6656', '#b8ad97', '#3e4a3c', '#53413a'];
export const SHOE_COLORS = ['#f4f4f2', '#1b1b1e', '#5a3a26', '#2f6f8f'];
export const PRESETS = [
  { id: 'ava', label: 'Ava', body: 'f', skin: 's6', hair: 'Hair_Buns', hairColor: '#2a1d17', top: 'jacket', topColor: '#2f6f8f', bottom: 'chino', bottomColor: '#1d1f24', shoes: '#f4f4f2', beard: false },
  { id: 'noor', label: 'Noor', body: 'f', skin: 's4', hair: 'Hair_Long', hairColor: '#4a2f22', top: 'knit', topColor: '#c58b3c', bottom: 'jeans', bottomColor: '#2f3e58', shoes: '#5a3a26', beard: false },
  { id: 'kenji', label: 'Kenji', body: 'm', skin: 's2', hair: 'Hair_SimpleParted', hairColor: '#2a1d17', top: 'tee', topColor: '#3d6b4f', bottom: 'jeans', bottomColor: '#1d1f24', shoes: '#f4f4f2', beard: false },
  { id: 'malik', label: 'Malik', body: 'm', skin: 's8', hair: 'Hair_Buzzed', hairColor: '#2a1d17', top: 'jacket', topColor: '#d9cbb2', bottom: 'chino', bottomColor: '#2f3e58', shoes: '#1b1b1e', beard: true },
  { id: 'elena', label: 'Elena', body: 'f', skin: 's1', hair: 'Hair_Long', hairColor: '#c9a06a', top: 'tee', topColor: '#8f3f3f', bottom: 'jeans', bottomColor: '#2f3e58', shoes: '#f4f4f2', beard: false },
  { id: 'tomas', label: 'Tomás', body: 'm', skin: 's5', hair: 'Hair_SimpleParted', hairColor: '#4a2f22', top: 'knit', topColor: '#1f2a3a', bottom: 'chino', bottomColor: '#6f6656', shoes: '#5a3a26', beard: true },
];
const HEX = /^#[0-9a-f]{6}$/i;
const pick = (v, list, d) => (list.includes(v) ? v : d);

// Normalise anything read from storage or a form into a valid appearance; unknown values fall back to a preset.
export function normalize(input = {}) {
  const base = PRESETS.find(p => p.id === input.preset) || PRESETS[0], a = { ...base, ...input };
  return {
    preset: PRESETS.some(p => p.id === a.preset) ? a.preset : null,
    body: pick(a.body, BODIES.map(b => b[0]), base.body), skin: pick(a.skin, SKINS.map(s => s.id), base.skin),
    hair: pick(a.hair, HAIRS.map(h => h[0]), base.hair), hairColor: HEX.test(a.hairColor) ? a.hairColor : base.hairColor,
    top: pick(a.top, TOPS.map(t => t[0]), base.top), topColor: HEX.test(a.topColor) ? a.topColor : base.topColor,
    bottom: pick(a.bottom, BOTTOMS.map(t => t[0]), base.bottom), bottomColor: HEX.test(a.bottomColor) ? a.bottomColor : base.bottomColor,
    shoes: HEX.test(a.shoes) ? a.shoes : base.shoes, beard: a.body === 'm' && !!a.beard,
  };
}
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);

export function load(st = globalThis.localStorage) {
  let raw = null; try { raw = JSON.parse(st?.getItem(KEY) || 'null'); } catch { raw = null; }
  return { appearance: normalize(raw?.appearance), identity: { pseudonym: cleanName(raw?.identity?.pseudonym) }, visibility: { avatarPublic: false, note: T('No public profile: nothing leaves this browser.', 'Aucun profil public : rien ne quitte ce navigateur.') }, cosmetics: { owned: [], note: T('No purchase possible; every option is free.', 'Aucun achat possible ; toutes les options sont gratuites.') }, saved: !!raw };
}
export function save(state, st = globalThis.localStorage) {
  const v = { v: 2, appearance: normalize(state.appearance), identity: { pseudonym: cleanName(state.identity?.pseudonym) }, savedAt: new Date().toISOString() };
  try { st.setItem(KEY, JSON.stringify(v)); return true; } catch { return false; }
}
// CSS custom properties for 2D chips (avatar initials etc.) — derived from appearance, never from identity.
export function chipStyle(a) { const s = SKINS.find(x => x.id === a.skin); return `--skin:${s.base === 'dark' ? '#8a5c40' : '#e7c3a4'};--top:${a.topColor}`; }
