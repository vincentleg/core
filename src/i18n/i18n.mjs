// CORE V8 — interface language. English is the default and the reference; every other language falls back to English
// key by key. Translation status is recorded per language (non-English strings were drafted by the coding model and
// have not been reviewed by a native speaker). Stored only in this browser (localStorage core.lang).
import { STRINGS } from './strings.mjs';
export const LANGS = [
  ['en', 'English', 'ltr'], ['zh-Hans', '简体中文', 'ltr'], ['hi', 'हिन्दी', 'ltr'], ['es', 'Español', 'ltr'], ['fr', 'Français', 'ltr'],
  ['ar', 'العربية', 'rtl'], ['pt', 'Português', 'ltr'], ['bn', 'বাংলা', 'ltr'], ['ru', 'Русский', 'ltr'], ['ja', '日本語', 'ltr'],
];
export const STATUS = { en: 'reference', fr: 'draft-unreviewed', es: 'draft-unreviewed', pt: 'draft-unreviewed', 'zh-Hans': 'draft-unreviewed', hi: 'draft-unreviewed', ar: 'draft-unreviewed', bn: 'draft-unreviewed', ru: 'draft-unreviewed', ja: 'draft-unreviewed' };
const KEY = 'core.lang';
export function lang(store = globalThis.localStorage) { try { const v = store?.getItem(KEY); return LANGS.some(l => l[0] === v) ? v : 'en'; } catch { return 'en'; } }
export function setLang(code, store = globalThis.localStorage) { if (!LANGS.some(l => l[0] === code)) return false; try { store?.setItem(KEY, code); } catch {} apply(code); return true; }
export const dir = code => LANGS.find(l => l[0] === code)?.[2] || 'ltr';
// t('key', {n: 3}) — English fallback for a missing key; {name} placeholders are replaced with escaped-by-caller values.
export function t(key, vars = {}, code = lang()) {
  const s = STRINGS[code]?.[key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
// Coverage of a language against English (for the internal translation-status table).
export function coverage(code) { const en = Object.keys(STRINGS.en), have = en.filter(k => STRINGS[code]?.[k]); return { total: en.length, translated: have.length, missing: en.filter(k => !STRINGS[code]?.[k]), status: STATUS[code] }; }
// Document-level: lang and direction attributes, and every [data-i18n] element.
export function apply(code = lang(), root = globalThis.document) {
  if (!root?.documentElement) return; root.documentElement.lang = code; root.documentElement.dir = dir(code);
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n, {}, code);
  for (const el of root.querySelectorAll('[data-i18n-ph]')) el.setAttribute('placeholder', t(el.dataset.i18nPh, {}, code));
  for (const el of root.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', t(el.dataset.i18nLabel, {}, code));
}
