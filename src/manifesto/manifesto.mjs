// CORE — Manifesto. V9: the authoritative French founding text (16 chapters and the ten founding principles,
// src/manifesto/long-fr.mjs, word for word) and its full English translation (long-en.mjs, default). Any other
// language falls back to English with a visible notice (never a silent mix). V9.9: Spanish, German, Simplified Chinese
// and Portuguese translations (model-written, labelled as such) are loaded on demand.
import * as NAV from '../shell/nav.mjs';
import { lang, t } from '../i18n/i18n.mjs';
import { SOURCE as SRC_EN } from './long-en.mjs';
import { SOURCE as SRC_FR } from './long-fr.mjs';
import { parse, inline, words } from './parse.mjs';
export const LONG = { en: parse(SRC_EN), fr: parse(SRC_FR) };
const LAZY = { es: () => import('./long-es.mjs'), de: () => import('./long-de.mjs'), 'zh-CN': () => import('./long-zh-CN.mjs'), pt: () => import('./long-pt.mjs') };
const load = async code => { if (!LONG[code] && LAZY[code]) { try { LONG[code] = parse((await LAZY[code]()).SOURCE); } catch {} } return LONG[code]; };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const TEXT = {
  en: { eyebrow: 'Manifesto', toc: 'Contents', minutes: 'min read', top: 'Back to top', status: 'Founding text · V9 · translated from the authoritative French' },
  fr: { eyebrow: 'Manifeste', toc: 'Sommaire', minutes: 'min de lecture', top: 'Haut de page', status: 'Texte fondateur · V9 · version française faisant autorité' },
  es: { eyebrow: 'Manifiesto', toc: 'Índice', minutes: 'min de lectura', top: 'Volver arriba', status: 'Texto fundacional · V9 · traducción redactada por un modelo, sin revisión profesional; el texto francés es el de referencia' },
  de: { eyebrow: 'Manifest', toc: 'Inhalt', minutes: 'Min. Lesezeit', top: 'Nach oben', status: 'Gründungstext · V9 · von einem Modell verfasste Übersetzung, nicht professionell geprüft; maßgeblich ist der französische Text' },
  'zh-CN': { eyebrow: '宣言', toc: '目录', minutes: '分钟阅读', top: '返回顶部', status: '创始文本 · V9 · 由模型撰写的译文，未经专业审校；以法文文本为准' },
  pt: { eyebrow: 'Manifesto', toc: 'Sumário', minutes: 'min de leitura', top: 'Voltar ao topo', status: 'Texto fundador · V9 · tradução redigida por um modelo, sem revisão profissional; o texto francês é a referência' },
};

async function render() {
  const code = lang(); await load(code); const T = TEXT[code] && LONG[code] ? TEXT[code] : TEXT.en, M = LONG[code] || LONG.en, P = M.principles;
  // Chinese has no spaces between words: reading time from characters (≈ 400 per minute).
  const minutes = code === 'zh-CN' && LONG[code] ? Math.round([...JSON.stringify(M)].filter(c => /[\u3400-\u9fff]/.test(c)).length / 400) : Math.round(words(M) / 230);
  const block = b => (b.h3 ? `<h3 class="mf-h3">${inline(b.h3)}</h3>` : `<p>${inline(b)}</p>`);
  $('mf-doc').innerHTML = `<header class="mf-head"><p class="le-eyebrow">${esc(T.eyebrow)}</p><h1>${esc(M.title)}</h1><p class="mf-sub">${esc(M.subtitle)}</p>
      <p class="mf-tag">${esc(M.tagline)}</p><p class="mf-lede">${inline(M.lede)}</p>
      <p class="fine">${esc(T.status)} · ${minutes} ${T.minutes}</p>
      ${LONG[code] ? '' : '<p class="fine">This text could not be loaded in your language; it is shown in English.</p>'}</header>
    <nav class="mf-toc" aria-label="${esc(T.toc)}"><h2>${esc(T.toc)}</h2><ol>${M.chapters.map(c => `<li><a href="#mf-${c.id}"><span>${c.n}</span> ${esc(c.title)}</a></li>`).join('')}<li><a href="#mf-principles"><span>✦</span> ${esc(P.title)}</a></li></ol></nav>
    ${M.chapters.map(c => `<section class="mf-ch" id="mf-${c.id}" aria-labelledby="mf-${c.id}-h"><h2 id="mf-${c.id}-h"><span class="mf-n">${c.n}</span>${esc(c.title)}</h2>${c.body.map(block).join('')}</section>`).join('')}
    <hr class="mf-rule">
    <section class="mf-ch" id="mf-principles" aria-labelledby="mf-principles-h"><h2 id="mf-principles-h"><span class="mf-n">✦</span>${esc(P.title)}</h2>
    <ol class="mf-list">${P.items.map(p => `<li><h3>${esc(p.head)}</h3><p>${inline(p.text)}</p></li>`).join('')}</ol></section>
    ${M.coda.map(c => `<p class="mf-sign">${inline(c)}</p>`).join('')}
    <nav class="le-row"><a class="btn primary" href="world.html#demo">${esc(t('nav.demo'))}</a><a class="btn" href="progress.html">${esc(t('nav.progress'))}</a><a class="btn" href="commons.html#trust">TRUST</a><a class="btn ghost" href="#mf-doc">${esc(T.top)}</a></nav>`;
  globalThis.CORE_MANIFESTO = { lang: LONG[code] ? code : 'en', principles: P.items.length, chapters: M.chapters.length, words: words(M) };
}
NAV.render($('core-nav'), { active: 'manifesto' });
render(); document.addEventListener('core:lang', render);
