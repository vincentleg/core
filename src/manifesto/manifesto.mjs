// CORE — Manifesto. V9: the authoritative French founding text (16 chapters and the ten founding principles,
// src/manifesto/long-fr.mjs, word for word) and its full English translation (long-en.mjs, default). Any other
// language falls back to English with a visible notice (never a silent mix).
import * as NAV from '../shell/nav.mjs';
import { lang, t } from '../i18n/i18n.mjs';
import { SOURCE as SRC_EN } from './long-en.mjs';
import { SOURCE as SRC_FR } from './long-fr.mjs';
import { parse, inline, words } from './parse.mjs';
export const LONG = { en: parse(SRC_EN), fr: parse(SRC_FR) };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const TEXT = {
  en: { eyebrow: 'Manifesto', toc: 'Contents', minutes: 'min read', top: 'Back to top', status: 'Founding text · V9 · translated from the authoritative French' },
  fr: { eyebrow: 'Manifeste', toc: 'Sommaire', minutes: 'min de lecture', top: 'Haut de page', status: 'Texte fondateur · V9 · version française faisant autorité' },
};

function render() {
  const code = lang(), T = TEXT[code] || TEXT.en, M = LONG[code] || LONG.en, P = M.principles;
  const block = b => (b.h3 ? `<h3 class="mf-h3">${inline(b.h3)}</h3>` : `<p>${inline(b)}</p>`);
  $('mf-doc').innerHTML = `<header class="mf-head"><p class="le-eyebrow">${esc(T.eyebrow)}</p><h1>${esc(M.title)}</h1><p class="mf-sub">${esc(M.subtitle)}</p>
      <p class="mf-tag">${esc(M.tagline)}</p><p class="mf-lede">${inline(M.lede)}</p>
      <p class="fine">${esc(T.status)} · ${Math.round(words(M) / 230)} ${T.minutes}</p>
      ${TEXT[code] ? '' : '<p class="fine">This text exists in French (authoritative) and English; it is shown in English.</p>'}</header>
    <nav class="mf-toc" aria-label="${esc(T.toc)}"><h2>${esc(T.toc)}</h2><ol>${M.chapters.map(c => `<li><a href="#mf-${c.id}"><span>${c.n}</span> ${esc(c.title)}</a></li>`).join('')}<li><a href="#mf-principles"><span>✦</span> ${esc(P.title)}</a></li></ol></nav>
    ${M.chapters.map(c => `<section class="mf-ch" id="mf-${c.id}" aria-labelledby="mf-${c.id}-h"><h2 id="mf-${c.id}-h"><span class="mf-n">${c.n}</span>${esc(c.title)}</h2>${c.body.map(block).join('')}</section>`).join('')}
    <hr class="mf-rule">
    <section class="mf-ch" id="mf-principles" aria-labelledby="mf-principles-h"><h2 id="mf-principles-h"><span class="mf-n">✦</span>${esc(P.title)}</h2>
    <ol class="mf-list">${P.items.map(p => `<li><h3>${esc(p.head)}</h3><p>${inline(p.text)}</p></li>`).join('')}</ol></section>
    ${M.coda.map(c => `<p class="mf-sign">${inline(c)}</p>`).join('')}
    <nav class="le-row"><a class="btn primary" href="world.html#demo">${esc(t('nav.demo'))}</a><a class="btn" href="progress.html">${esc(t('nav.progress'))}</a><a class="btn" href="commons.html#trust">TRUST</a><a class="btn ghost" href="#mf-doc">${esc(T.top)}</a></nav>`;
  globalThis.CORE_MANIFESTO = { lang: TEXT[code] ? code : 'en', principles: P.items.length, chapters: M.chapters.length, words: words(M) };
}
NAV.render($('core-nav'), { active: 'manifesto' });
render(); document.addEventListener('core:lang', render);
