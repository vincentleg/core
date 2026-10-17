// CORE — Manifesto. V9: the long-form founding text (14 chapters, src/manifesto/long-*.mjs) followed by the ten V8
// principles. English is the reference; a full French translation exists; any other language falls back to English
// with a visible notice (never a silent mix).
import * as NAV from '../shell/nav.mjs';
import { lang, t } from '../i18n/i18n.mjs';
import { LONG as LONG_EN } from './long-en.mjs';
import { LONG as LONG_FR } from './long-fr.mjs';
export const LONG = { en: LONG_EN, fr: LONG_FR };
export const words = l => l.chapters.reduce((n, c) => n + c.body.join(' ').split(/\s+/).filter(Boolean).length, 0);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const TEXT = {
  en: {
    eyebrow: 'Manifesto', title: 'A parallel world to help humanity improve the real one',
    lede: 'CORE builds a second Earth — made of public data, open models and accountable agents — where ideas can be tested before anyone is asked to bet real lives, money or places on them.',
    principles: [
      ['Reality comes first', 'Everything CORE shows is labelled: observed, derived, simulated, hypothetical or unknown. A simulation is a question asked to a model, never a fact about the street.'],
      ['Evidence before opinion', 'Agents answer only from dated, sourced findings. When the evidence is missing, they say so — and a declared gap is worth more than a confident guess.'],
      ['Disagreement is kept', 'Competing hypotheses stay open until data separates them. Dissent is recorded, not smoothed away.'],
      ['Machines propose, people decide', 'Agents prepare dossiers; a gateway records the state of each permit; only accountable humans authorise anything. “Ready for signature” never means “approved”.'],
      ['Nothing is improved until it is measured', 'A gain in a model is not an improvement in the world. CORE counts real impact only when it has been verified independently, before and after — today, that number is zero, and we show it.'],
      ['Your ideas are yours', 'What you write stays private and encrypted on your device. You choose, explicitly, what to share and with whom. Nothing is published for you.'],
      ['Open, free, local', 'Open data with verified licences, open-source models and engines, no paid service, no account required, no hidden recording. The voice companion listens only on your device, and only when you ask.'],
      ['Everyone can notice something', 'A resident who sees buses stuck every morning holds knowledge no dataset has. CORE helps turn that observation into a testable question — and tells you honestly what happened to it.'],
      ['Many places, one planet', 'Missions start in one city and are designed to travel: the same methods, the same honesty, adapted to local data and local people.'],
      ['Progress has many dimensions', 'Knowledge, gaps, research work, simulations, participation and energy are measured separately. There is no single score that could be gamed — and energy use is not progress by itself.'],
    ],
    close: 'CORE is a prototype. It has not changed the world. It is a place to rehearse change carefully, together, in the open.',
    sign: 'A parallel world to help humanity improve the real one.',
  },
  fr: {
    eyebrow: 'Manifeste', title: 'Un monde parallèle pour aider l’humanité à améliorer le monde réel',
    lede: 'CORE construit une seconde Terre — faite de données publiques, de modèles ouverts et d’agents responsables — où les idées peuvent être mises à l’épreuve avant que quiconque ne doive y engager des vies, de l’argent ou des lieux réels.',
    principles: [
      ['La réalité d’abord', 'Tout ce que montre CORE est étiqueté : observé, dérivé, simulé, hypothétique ou inconnu. Une simulation est une question posée à un modèle, jamais un fait sur la rue.'],
      ['Les preuves avant l’opinion', 'Les agents ne répondent qu’à partir de constats datés et sourcés. Quand la preuve manque, ils le disent — et une lacune déclarée vaut mieux qu’une supposition assurée.'],
      ['Le désaccord est conservé', 'Les hypothèses concurrentes restent ouvertes tant que les données ne les départagent pas. La dissidence est consignée, pas effacée.'],
      ['Les machines proposent, les personnes décident', 'Les agents préparent des dossiers ; une passerelle consigne l’état de chaque permis ; seules des personnes responsables autorisent. « Prêt pour signature » ne veut jamais dire « approuvé ».'],
      ['Rien n’est amélioré tant que ce n’est pas mesuré', 'Un gain dans un modèle n’est pas une amélioration du monde. CORE ne compte un impact réel que s’il a été vérifié indépendamment, avant et après — aujourd’hui, ce nombre est zéro, et nous l’affichons.'],
      ['Vos idées vous appartiennent', 'Ce que vous écrivez reste privé et chiffré sur votre appareil. Vous choisissez, explicitement, ce que vous partagez et avec qui. Rien n’est publié à votre place.'],
      ['Ouvert, gratuit, local', 'Des données ouvertes aux licences vérifiées, des modèles et moteurs libres, aucun service payant, aucun compte requis, aucun enregistrement caché. Le compagnon vocal n’écoute que sur votre appareil, et seulement quand vous le demandez.'],
      ['Chacun peut remarquer quelque chose', 'Une habitante qui voit les bus bloqués chaque matin détient un savoir qu’aucun jeu de données n’a. CORE aide à transformer cette observation en question testable — et vous dit honnêtement ce qu’elle est devenue.'],
      ['Plusieurs lieux, une planète', 'Les missions commencent dans une ville et sont conçues pour voyager : mêmes méthodes, même honnêteté, adaptées aux données et aux personnes de chaque lieu.'],
      ['Le progrès a plusieurs dimensions', 'Connaissance, lacunes, travail de recherche, simulations, participation et énergie sont mesurés séparément. Aucun score unique qu’on pourrait manipuler — et consommer plus d’énergie n’est pas un progrès en soi.'],
    ],
    close: 'CORE est un prototype. Il n’a pas changé le monde. C’est un lieu pour répéter le changement avec soin, ensemble, au grand jour.',
    sign: 'Un monde parallèle pour aider l’humanité à améliorer le monde réel.',
  },
};

function render() {
  const code = lang(), T = TEXT[code] || TEXT.en, M = LONG[code] || LONG.en, fr = code === 'fr';
  const P = fr ? { toc: 'Sommaire', principles: 'Dix principes de travail', minutes: 'min de lecture', top: 'Haut de page' } : { toc: 'Contents', principles: 'Ten working principles', minutes: 'min read', top: 'Back to top' };
  $('mf-doc').innerHTML = `<header class="mf-head"><p class="le-eyebrow">${esc(T.eyebrow)}</p><h1>${esc(M.title)}</h1><p class="mf-sub">${esc(M.subtitle)}</p>
      <p class="fine">${esc(M.status)} · ${Math.round(words(M) / 230)} ${P.minutes}</p>
      ${TEXT[code] ? '' : '<p class="fine">This text exists in English (reference) and French; it is shown in English.</p>'}</header>
    <nav class="mf-toc" aria-label="${P.toc}"><h2>${P.toc}</h2><ol>${M.chapters.map(c => `<li><a href="#mf-${c.id}"><span>${c.n}</span> ${esc(c.title)}</a></li>`).join('')}<li><a href="#mf-principles"><span>✦</span> ${P.principles}</a></li></ol></nav>
    ${M.chapters.map(c => `<section class="mf-ch" id="mf-${c.id}" aria-labelledby="mf-${c.id}-h"><h2 id="mf-${c.id}-h"><span class="mf-n">${c.n}</span>${esc(c.title)}</h2>${c.body.map(p => `<p>${esc(p)}</p>`).join('')}</section>`).join('')}
    <section class="mf-ch" id="mf-principles" aria-labelledby="mf-principles-h"><h2 id="mf-principles-h"><span class="mf-n">✦</span>${P.principles}</h2><p class="mf-lede">${esc(T.lede)}</p>
    <ol class="mf-list">${T.principles.map(([h, p]) => `<li><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ol></section>
    <p class="mf-close">${esc(T.close)}</p><p class="mf-sign">${esc(T.sign)}</p>
    <nav class="le-row"><a class="btn primary" href="world.html#demo">${esc(t('nav.demo'))}</a><a class="btn" href="progress.html">${esc(t('nav.progress'))}</a><a class="btn" href="commons.html#trust">TRUST</a><a class="btn ghost" href="#mf-doc">${P.top}</a></nav>`;
  globalThis.CORE_MANIFESTO = { lang: TEXT[code] ? code : 'en', principles: T.principles.length, chapters: M.chapters.length, words: words(M) };
}
NAV.render($('core-nav'), { active: 'manifesto' });
render(); document.addEventListener('core:lang', render);
