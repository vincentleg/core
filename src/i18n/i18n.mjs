// CORE — interface language (central runtime).
//  • English is the default for every first visit and the canonical fallback; browser locale is never used.
//  • Enabled languages are those with COMPLETE coverage of the supported product: English and French.
//    The eight other languages drafted in V8 (zh-Hans, hi, es, ar, pt, bn, ru, ja) are NOT selectable until a full,
//    reviewed translation exists (see PLANNED); a saved preference for one of them falls back to English.
//  • Three ways to translate, all resolved here:
//      t('key', vars)        shared interface strings (strings.mjs);
//      T('English', 'Français')  a message pair written next to the code that uses it;
//      L({ en, fr })         bilingual data built by generators (missions, findings, agent messages);
//    static HTML carries English text plus data-fr / data-fr-ph / data-fr-label / data-fr-title, applied by apply().
//  • Changing language dispatches 'core:lang'; pages re-render without a reload. Stored in localStorage core.lang.
//  • Model-generated text (local LLM) is shown in the language it was produced in and labelled as such; it is never
//    presented as translated.
import { STRINGS } from './strings.mjs';
export const LANGS = [['en', 'English', 'ltr', 'en-US'], ['fr', 'Français', 'ltr', 'fr-FR']];
export const PLANNED = ['zh-Hans', 'hi', 'es', 'ar', 'pt', 'bn', 'ru', 'ja'];
export const STATUS = { en: 'reference', fr: 'complete (supported surfaces); written by the coding model, not yet reviewed by a professional translator' };
const KEY = 'core.lang';
const enabled = c => LANGS.some(l => l[0] === c);
export function lang(store = globalThis.localStorage) { try { const v = store?.getItem(KEY); return enabled(v) ? v : 'en'; } catch { return 'en'; } }
export function setLang(code, store = globalThis.localStorage) {
  if (!enabled(code)) return false; try { store?.setItem(KEY, code); } catch {}
  apply(code); globalThis.document?.dispatchEvent(new CustomEvent('core:lang', { detail: code })); return true;
}
export const dir = code => LANGS.find(l => l[0] === code)?.[2] || 'ltr';
export const locale = (code = lang()) => LANGS.find(l => l[0] === code)?.[3] || 'en-US';
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
// Shared keys; English fallback per key.
export function t(key, vars = {}, code = lang()) { return fill(STRINGS[code]?.[key] ?? STRINGS.en[key] ?? key, vars); }
// Inline message pair.
export const T = (en, fr, code = lang()) => (code === 'fr' && fr != null ? fr : en);
// Bilingual data value: { en, fr } → current language; plain strings pass through (legacy data).
export const L = (x, code = lang()) => (x && typeof x === 'object' && !Array.isArray(x) ? (x[code] ?? x.en ?? '') : (x ?? ''));
export const B = (en, fr) => ({ en, fr });
export const isBi = x => !!x && typeof x === 'object' && typeof x.en === 'string';
// Locale-aware formatting and plurals.
export const num = (n, opts = {}, code = lang()) => (Number.isFinite(+n) ? new Intl.NumberFormat(locale(code), opts).format(+n) : String(n ?? '—'));
export const date = (d, opts = { year: 'numeric', month: 'short', day: 'numeric' }, code = lang()) => { const x = d instanceof Date ? d : new Date(d); return isNaN(x) ? String(d ?? '') : new Intl.DateTimeFormat(locale(code), opts).format(x); };
export function plural(n, forms, code = lang()) { const f = forms[code] || forms.en; const r = new Intl.PluralRules(locale(code)).select(+n); return fill(f[r] ?? f.other, { n: num(n, {}, code) }); }
export function coverage(code) { const en = Object.keys(STRINGS.en), have = en.filter(k => STRINGS[code]?.[k]); return { total: en.length, translated: have.length, missing: en.filter(k => !STRINGS[code]?.[k]), status: STATUS[code] }; }
// Document-level: lang/dir attributes, [data-i18n] keys, and English/French attribute pairs on static HTML.
export function apply(code = lang(), root = globalThis.document) {
  if (!root?.documentElement && !root?.querySelectorAll) return;
  const doc = root.documentElement ? root : null; if (doc) { doc.documentElement.lang = code; doc.documentElement.dir = dir(code); }
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n, {}, code);
  for (const el of root.querySelectorAll('[data-i18n-ph]')) el.setAttribute('placeholder', t(el.dataset.i18nPh, {}, code));
  for (const el of root.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', t(el.dataset.i18nLabel, {}, code));
  for (const el of root.querySelectorAll('[data-fr]')) { if (el.dataset.en == null) el.dataset.en = el.innerHTML; el.innerHTML = code === 'fr' ? el.dataset.fr : el.dataset.en; }
  for (const [attr, d] of [['placeholder', 'frPh'], ['aria-label', 'frLabel'], ['title', 'frTitle'], ['content', 'frContent']]) {
    const sel = `[data-fr-${{ frPh: 'ph', frLabel: 'label', frTitle: 'title', frContent: 'content' }[d]}]`, enKey = `en${d.slice(2)}`;
    for (const el of root.querySelectorAll(sel)) { if (el.dataset[enKey] == null) el.dataset[enKey] = el.getAttribute(attr) ?? ''; el.setAttribute(attr, code === 'fr' ? el.dataset[d] : el.dataset[enKey]); }
  }
  if (doc) { const ti = doc.querySelector('title[data-fr]'); if (ti) doc.title = ti.textContent; }
}
// Re-run fn now and on every language change (returns an unsubscribe function).
export function onLang(fn) { const h = e => fn(e.detail); globalThis.document?.addEventListener('core:lang', h); return () => globalThis.document?.removeEventListener('core:lang', h); }
// Agent registry fields: English from a.en, French from the original field.
export const AT = (a, k, code = lang()) => (code === 'en' ? (a?.en?.[k] ?? a?.[k]) : a?.[k]) ?? '';
