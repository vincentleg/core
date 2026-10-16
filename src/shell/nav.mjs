// CORE shell navigation (V7) — four primary destinations; every earlier section stays reachable through contextual
// navigation. EXPLORE: the world and what is known about it. CREATE: think and develop ideas privately.
// COLLABORATE: experts, communities, debate and learning (fictional participants for now). MY CORE: identity, avatar,
// history and privacy. TRUST is always one click away. Deep links keep using the hash: commons.html#<section>?k=v.
import { read } from './journey.mjs';
import { icon } from '../ui/icons.mjs';
import { t, lang, setLang, apply, LANGS } from '../i18n/i18n.mjs';
export const GROUPS = [
  { id: 'explore', label: 'Explore', key: 'nav.explore', icon: 'explore', href: 'world.html', primary: true,
    links: [['world', 'World', 'world.html'], ['intelligence', 'Intelligence', 'index.html#app']],
    sections: [['knowledge', 'Knowledge'], ['progress', 'Progrès'], ['continuity', 'Continuity'], ['institutions', 'Institutions (démo)']] },
  { id: 'create', label: 'Create', key: 'nav.create', icon: 'create', href: 'dialogue.html',
    links: [['dialogue', 'Dialogue & Studio', 'dialogue.html']],
    sections: [['vault', 'Coffre à idées'], ['labs', 'Labs']] },
  { id: 'collaborate', label: 'Together', key: 'nav.together', icon: 'collaborate', href: 'commons.html#experts',
    sections: [['experts', 'Experts (fictifs)'], ['communities', 'Communautés (fictives)'], ['arena', 'Arène (fictive)'], ['academy', 'Académie']] },
  { id: 'me', label: 'My CORE', key: 'nav.me', icon: 'me', href: 'me.html',
    links: [['me', 'Mon CORE', 'me.html'], ['avatar', 'Avatar', 'avatar.html']],
    sections: [['profile', 'Identité'], ['journey', 'Mon parcours'], ['trust', 'Mes données et TRUST']] },
];
// Page → destination, for pages that are not commons sections.
const PAGES = { world: 'explore', intelligence: 'explore', dialogue: 'create', me: 'me', avatar: 'me' };
export const groupOf = section => GROUPS.find(g => g.sections?.some(([id]) => id === section)) || GROUPS.find(g => g.id === PAGES[section]) || null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function render(el, { active }) {
  const j = read(), done = Object.keys(j.steps).length, g = GROUPS.find(x => x.id === active) || groupOf(active), cur = lang();
  apply(cur);
  // V8: four destinations, then discreet access to the companion (voice or text, also the search), language,
  // progress, the manifesto, the guided demo and TRUST.
  el.innerHTML = `<a class="mark" href="world.html" aria-label="CORE — home"><i class="orb" aria-hidden="true"></i>CORE</a><span class="proto">${esc(t('nav.proto'))}</span>
    <nav class="le-nav" aria-label="${esc(t('nav.main'))}">${GROUPS.map(x => `<a href="${esc(x.href)}"${g && x.id === g.id ? ' aria-current="page"' : ''}>${icon(x.icon, 16)}<span>${esc(t(x.key))}</span></a>`).join('')}</nav>
    <div class="le-shell-right"><button type="button" class="le-cmp-btn" data-companion title="${esc(t('nav.voice'))}" aria-label="${esc(t('nav.voice'))}">${icon('search', 15)}<span aria-hidden="true">⌘K</span></button>
      <label class="le-lang" title="${esc(t('nav.language'))}"><span class="sr-only">${esc(t('nav.language'))}</span><select data-lang aria-label="${esc(t('nav.language'))}">${LANGS.map(([c, n]) => `<option value="${esc(c)}"${c === cur ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <a class="le-more" href="progress.html" title="${esc(t('nav.progress'))}">${icon('chart', 15)}<span>${esc(t('nav.progress'))}</span></a>
      <a class="le-more" href="manifesto.html" title="${esc(t('nav.manifesto'))}">${icon('book', 15)}<span>${esc(t('nav.manifesto'))}</span></a><a class="le-more" href="demo.html">${icon('play', 14)}<span>${esc(t('nav.demo'))}</span></a>
      <a class="journey-chip" href="commons.html#journey" title="Journey (stored in this browser, no private content)">${icon('route', 15)}${esc(t('nav.journey'))} ${done}/8</a>
      <a class="trust" href="commons.html#trust" title="TRUST">${icon('trust', 16)}<span>TRUST</span></a></div>`;
  const openCmp = () => import('../voice/companion.mjs').then(m => m.open());
  el.querySelector('[data-companion]').onclick = openCmp;
  el.querySelector('[data-lang]').onchange = e => { setLang(e.target.value); render(el, { active }); document.dispatchEvent(new CustomEvent('core:lang', { detail: e.target.value })); };
  if (!render.keys) { render.keys = true; addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmp(); } }); }
  document.addEventListener('core:lang', () => render(el, { active }), { once: true });
}

// Contextual navigation for a destination: its pages, then its sections. `current` is a page id or a section id.
export function subnav(groupId, current) {
  const g = GROUPS.find(x => x.id === groupId); if (!g) return '';
  const items = [...(g.links || []).map(([id, label, href]) => [id, label, href]), ...(g.sections || []).map(([id, label]) => [id, label, `commons.html#${id}`])];
  return items.map(([id, label, href]) => `<a href="${esc(href)}"${id === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
}
