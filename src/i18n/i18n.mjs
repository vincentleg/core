// CORE — interface language (central runtime).
//  • Six languages: English (reference), French, Spanish, German, Simplified Chinese, Portuguese.
//  • First visit: the browser's preferred language if supported, else English. An explicit choice is stored
//    (localStorage core.lang) and always wins.
//  • Sources of text, all resolved here:
//      t('key', vars)            shared interface strings (strings.mjs, English/French);
//      T('English', 'Français')  a message pair written next to the code that uses it;
//      L({ en, fr })             bilingual data built by generators (missions, findings, agent messages);
//      static HTML               English text plus data-fr / data-fr-ph / data-fr-label / data-fr-title, applied by apply().
//    English and French are written inline. The other languages come from one dictionary per language
//    (src/i18n/locales/<code>.json) keyed by the English source text; "{0}" placeholders in a key match the values
//    interpolated at runtime, so a template such as `${n} problems` is translated as a whole.
//  • Changing language loads that dictionary, then dispatches 'core:lang'; pages re-render without a reload.
//  • Model-generated text is shown in the language it was produced in and labelled as such; it is never presented as
//    a translation, and translations are never presented as original quotations.
import { STRINGS } from './strings.mjs';
export const LANGS = [['en', 'English', 'ltr', 'en-US'], ['fr', 'Français', 'ltr', 'fr-FR'], ['es', 'Español', 'ltr', 'es-ES'], ['de', 'Deutsch', 'ltr', 'de-DE'], ['zh-CN', '简体中文', 'ltr', 'zh-CN'], ['pt', 'Português', 'ltr', 'pt-BR']];
// Language names in English, for instructions given to a language model.
export const LANGUAGE_NAME = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', 'zh-CN': 'Simplified Chinese', pt: 'Portuguese' };
export const DICTIONARY_LANGS = ['es', 'de', 'zh-CN', 'pt'];
export const STATUS = { en: 'reference', fr: 'partial; model-written draft, not professionally reviewed', es: 'partial; model-written draft with English fallback, not professionally reviewed', de: 'partial; model-written draft with English fallback, not professionally reviewed', 'zh-CN': 'partial; model-written draft with English fallback, not professionally reviewed', pt: 'partial; model-written draft with English fallback, not professionally reviewed' };
const KEY = 'core.lang';
const enabled = c => LANGS.some(l => l[0] === c);
// Browser preference → supported code (any Chinese variant uses the Simplified Chinese edition).
// Only a browser page detects; Node (tests, generators) exposes the OS locale and must stay on the English reference.
export function detect(prefs = globalThis.document ? globalThis.navigator?.languages || [globalThis.navigator?.language].filter(Boolean) : []) {
  for (const p of prefs) { const v = String(p).toLowerCase(), base = v.split('-')[0]; if (base === 'zh') return 'zh-CN'; const hit = LANGS.find(l => l[0] === base); if (hit) return hit[0]; }
  return 'en';
}
let chosen = null, languageRequest = 0;
export function lang(store) { if (store === undefined && globalThis.document && chosen) return chosen; try { if (store === undefined) store = globalThis.localStorage; const v = store?.getItem(KEY); if (enabled(v)) return v; } catch {} return dictionaryReady(detect()) ? detect() : 'en'; }
// ---------- dictionaries ----------
const DICT = {}, PATTERNS = {}, CACHE = {}, MISSING = new Set();
const dictionaryReady = code => !DICTIONARY_LANGS.includes(code) || !!DICT[code];
export function loadDictionary(code, entries) {
  DICT[code] = entries; CACHE[code] = new Map();
  // Template keys, most specific (longest literal text) first.
  PATTERNS[code] = Object.keys(entries).filter(k => /\{\d+\}/.test(k)).map(k => { const parts = k.split(/\{(\d+)\}/); let re = '^', order = []; parts.forEach((p, i) => { if (i % 2) { re += '([\\s\\S]*?)'; order.push(+p); } else re += p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }); return { k, re: new RegExp(re + '$'), order, lit: parts.filter((_, i) => !(i % 2)).join('').length }; }).sort((a, b) => b.lit - a.lit);
}
export async function ensureDictionary(code) {
  if (dictionaryReady(code) || !globalThis.fetch || !globalThis.document) return;
  const r = await fetch(new URL(`./locales/${code}.json`, import.meta.url)); if (!r.ok) throw Error('Language unavailable'); loadDictionary(code, await r.json());
}
// English source → target language; templates substitute their runtime values; untranslated text stays English.
export function translate(en, code = lang()) {
  if (code === 'en' || typeof en !== 'string' || en === '') return en;
  const d = DICT[code]; if (!d) return en;
  const s = String(en), cache = CACHE[code]; if (cache.has(s)) return cache.get(s);
  let out = d[s];
  if (out == null) for (const p of PATTERNS[code]) { const m = s.match(p.re); if (m) { const vals = []; p.order.forEach((n, i) => { vals[n] = m[i + 1]; }); out = d[p.k].replace(/\{(\d+)\}/g, (_, n) => { const v = vals[+n] ?? ''; return d[v] ?? v; }); break; } }
  if (out == null) { if (/[A-Za-z]{3}/.test(s)) MISSING.add(s); out = s; }
  if (cache.size > 5000) cache.clear(); cache.set(s, out); return out;
}
export const missing = () => [...MISSING];
export const clearMissing = () => MISSING.clear();
// Load the stored or detected language before any page renders (top-level await; English/French need nothing).
if (globalThis.document) { const want = (() => { try { const v = localStorage.getItem(KEY); return enabled(v) ? v : detect(); } catch { return detect(); } })(); await ensureDictionary(want).catch(() => {}); }
export async function setLang(code, store) {
  if (!enabled(code)) return false; const request = store === undefined ? ++languageRequest : 0; await ensureDictionary(code);
  if (request && request !== languageRequest) return false;
  if (globalThis.document && store === undefined) chosen = code; // keep this page usable when browser storage is blocked
  try { (store === undefined ? globalThis.localStorage : store)?.setItem(KEY, code); } catch {}
  apply(code); globalThis.document?.dispatchEvent(new CustomEvent('core:lang', { detail: code })); return true;
}
export const dir = code => LANGS.find(l => l[0] === code)?.[2] || 'ltr';
export const locale = (code = lang()) => LANGS.find(l => l[0] === code)?.[3] || 'en-US';
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
// Shared keys; other languages translate the English value.
export function t(key, vars = {}, code = lang()) { const en = STRINGS.en[key]; if (en == null) return key; return fill(code === 'fr' ? STRINGS.fr[key] ?? en : translate(en, code), vars); }
// Inline message pair.
export const T = (en, fr, code = lang()) => (code === 'fr' && fr != null ? fr : code === 'en' ? en : Array.isArray(en) ? en.map(x => translate(x, code)) : translate(en, code));
// Bilingual data value: { en, fr } → current language; plain strings pass through (legacy data).
export const L = (x, code = lang()) => (x && typeof x === 'object' && !Array.isArray(x) ? (x[code] ?? (code === 'fr' ? x.fr : null) ?? translate(x.en ?? '', code) ?? '') : (x ?? ''));
export const B = (en, fr) => ({ en, fr });
// A dictionary of [en, fr] pairs read in the current language (keys, Object.entries and JSON keep working).
export const BL = o => new Proxy(o, { get: (t, k) => (Array.isArray(t[k]) ? T(t[k][0], t[k][1]) : t[k]) });
export const isBi = x => !!x && typeof x === 'object' && typeof x.en === 'string';
// Locale-aware formatting and plurals.
export const num = (n, opts = {}, code = lang()) => (Number.isFinite(+n) ? new Intl.NumberFormat(locale(code), opts).format(+n) : String(n ?? '—'));
export const date = (d, opts = { year: 'numeric', month: 'short', day: 'numeric' }, code = lang()) => { const x = d instanceof Date ? d : new Date(d); return isNaN(x) ? String(d ?? '') : new Intl.DateTimeFormat(locale(code), opts).format(x); };
// Plural forms: a language's own forms when given, otherwise the translated English form for its plural category.
export function plural(n, forms, code = lang()) { const r = new Intl.PluralRules(locale(code)).select(+n), f = forms[code]; const chosen = f ? f[r] ?? f.other : translate(forms.en[r] ?? forms.en.other, code); return fill(chosen, { n: num(n, {}, code) }); }
export function coverage(code) { const en = Object.values(STRINGS.en), have = code === 'en' ? en : code === 'fr' ? Object.keys(STRINGS.en).filter(k => STRINGS.fr[k]).map(k => STRINGS.en[k]) : en.filter(s => DICT[code]?.[s]); return { total: en.length, translated: have.length, missing: en.filter(s => !have.includes(s)), status: STATUS[code] }; }
// Document-level: lang/dir attributes, [data-i18n] keys, and English/French attribute pairs on static HTML.
export function apply(code = lang(), root = globalThis.document) {
  if (!root?.documentElement && !root?.querySelectorAll) return;
  const doc = root.documentElement ? root : null; if (doc) { doc.documentElement.lang = code; doc.documentElement.dir = dir(code); }
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n, {}, code);
  for (const el of root.querySelectorAll('[data-i18n-ph]')) el.setAttribute('placeholder', t(el.dataset.i18nPh, {}, code));
  for (const el of root.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', t(el.dataset.i18nLabel, {}, code));
  for (const el of root.querySelectorAll('[data-fr]')) { if (el.dataset.en == null) el.dataset.en = el.innerHTML.trim(); el.innerHTML = code === 'fr' ? el.dataset.fr : translate(el.dataset.en, code); }
  for (const [attr, d] of [['placeholder', 'frPh'], ['aria-label', 'frLabel'], ['title', 'frTitle'], ['content', 'frContent']]) {
    const sel = `[data-fr-${{ frPh: 'ph', frLabel: 'label', frTitle: 'title', frContent: 'content' }[d]}]`, enKey = `en${d.slice(2)}`;
    for (const el of root.querySelectorAll(sel)) { if (el.dataset[enKey] == null) el.dataset[enKey] = el.getAttribute(attr) ?? ''; el.setAttribute(attr, code === 'fr' ? el.dataset[d] : translate(el.dataset[enKey], code)); }
  }
  if (doc) { const ti = doc.querySelector('title[data-fr]'); if (ti) doc.title = ti.textContent; }
  // The privacy page is script-free: its language sections are reached by anchor.
  for (const el of root.querySelectorAll('a[href^="privacy.html"]')) el.setAttribute('href', `privacy.html#${code}`);
}
// Re-run fn now and on every language change (returns an unsubscribe function).
export function onLang(fn) { const h = e => fn(e.detail); globalThis.document?.addEventListener('core:lang', h); return () => globalThis.document?.removeEventListener('core:lang', h); }
// Agent registry fields: English from a.en, French from the original field, others translated from English.
export const AT = (a, k, code = lang()) => (code === 'fr' ? a?.[k] : code === 'en' ? (a?.en?.[k] ?? a?.[k]) : translate(a?.en?.[k] ?? a?.[k], code)) ?? '';
