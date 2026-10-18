// CORE shell navigation (V7) — four primary destinations; every earlier section stays reachable through contextual
// navigation. EXPLORE: the world and what is known about it. CREATE: think and develop ideas privately.
// COLLABORATE: experts, communities, debate and learning (fictional participants for now). MY CORE: identity, avatar,
// history and privacy. TRUST is always one click away. Deep links keep using the hash: commons.html#<section>?k=v.
import { PUBLIC } from '../env.mjs';
import { read } from './journey.mjs';
import { icon } from '../ui/icons.mjs';
import { t, T, lang, setLang, apply, LANGS } from '../i18n/i18n.mjs';
export const GROUPS = [
  { id: 'explore', label: 'Explore', key: 'nav.explore', icon: 'explore', href: 'world.html', primary: true,
    links: [['world', ['World', 'Monde'], 'world.html'], ['progress-page', ['Progress', 'Progrès'], 'progress.html'], ...(PUBLIC ? [] : [['intelligence', ['Intelligence (earlier prototype, French only)', 'Intelligence (prototype antérieur)'], 'index.html#app']])],
    sections: [['knowledge', ['Knowledge', 'Connaissances']], ['progress', ['Progress log', 'Journal des progrès']], ['continuity', ['Continuity', 'Continuité']], ['institutions', ['Institutions (demo)', 'Institutions (démo)']]] },
  { id: 'create', label: 'Create', key: 'nav.create', icon: 'create', href: 'dialogue.html',
    links: [['dialogue', ['Dialogue & Studio', 'Dialogue et Studio'], 'dialogue.html']],
    sections: [['vault', ['Idea Vault', 'Coffre à idées']], ['labs', ['Labs', 'Labs']]] },
  { id: 'collaborate', label: 'Together', key: 'nav.together', icon: 'collaborate', href: 'commons.html#experts',
    sections: [['experts', ['Experts (fictional)', 'Experts (fictifs)']], ['communities', ['Communities (fictional)', 'Communautés (fictives)']], ['arena', ['Arena (fictional)', 'Arène (fictive)']], ['academy', ['Academy', 'Académie']]] },
  { id: 'me', label: 'My CORE', key: 'nav.me', icon: 'me', href: 'me.html',
    links: [['me', ['My CORE', 'Mon CORE'], 'me.html'], ['avatar', ['Avatar', 'Avatar'], 'avatar.html']],
    sections: [['profile', ['Identity', 'Identité']], ['journey', ['My journey', 'Mon parcours']], ['trust', ['My data & TRUST', 'Mes données et TRUST']]] },
];
// Page → destination, for pages that are not commons sections.
const PAGES = { world: 'explore', intelligence: 'explore', dialogue: 'create', me: 'me', avatar: 'me' };
export const groupOf = section => GROUPS.find(g => g.sections?.some(([id]) => id === section)) || GROUPS.find(g => g.id === PAGES[section]) || null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function render(el, { active }) {
  const j = read(), done = Object.keys(j.steps).length, g = GROUPS.find(x => x.id === active) || groupOf(active), cur = lang();
  apply(cur);
  // Four destinations; then one Command entry (search, ask, navigate — also Cmd/Ctrl-K), one clear Demo action,
  // the language, a small "More" menu (Progress, Manifesto, Journey) and TRUST, always visible.
  el.innerHTML = `<a class="mark" href="world.html" aria-label="CORE · ${esc(t('nav.home'))}"><i class="orb" aria-hidden="true"></i>CORE</a><span class="proto" title="${esc(t('nav.protoNote'))}">${esc(t('nav.proto'))}</span>
    <nav class="le-nav" aria-label="${esc(t('nav.main'))}">${GROUPS.map(x => `<a href="${esc(x.href)}"${g && x.id === g.id ? ' aria-current="page"' : ''}>${icon(x.icon, 16)}<span>${esc(t(x.key))}</span></a>`).join('')}</nav>
    <div class="le-shell-right"><button type="button" class="le-cmp-btn" data-companion title="${esc(t('nav.voice'))}" aria-label="${esc(t('nav.voice'))}">${icon('search', 15)}<span class="le-cmp-txt">${esc(t('nav.command'))}</span><kbd aria-hidden="true">⌘K</kbd></button>
      <a class="le-demo-btn" href="world.html#demo" data-demo>${icon('play', 14)}<span>${esc(t('nav.demoShort'))}</span></a>
      <label class="le-lang" title="${esc(t('nav.language'))}"><span class="sr-only">${esc(t('nav.language'))}</span><select data-lang aria-label="${esc(t('nav.language'))}">${LANGS.map(([c, n]) => `<option value="${esc(c)}"${c === cur ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <details class="le-more-menu"><summary aria-label="${esc(t('nav.more'))}">${esc(t('nav.more'))}</summary><div class="le-glass">
        <a href="progress.html">${icon('chart', 15)} ${esc(t('nav.progress'))}</a><a href="manifesto.html">${icon('book', 15)} ${esc(t('nav.manifesto'))}</a><a href="commons.html#journey">${icon('route', 15)} ${esc(t('nav.journey'))} ${done}/8</a></div></details>
      <a class="trust" href="commons.html#trust" title="TRUST">${icon('trust', 16)}<span>TRUST</span></a></div>`;
  const openCmp = () => import('../voice/companion.mjs').then(m => m.open());
  el.querySelector('[data-companion]').onclick = openCmp;
  el.querySelector('[data-demo]').onclick = e => { if (globalThis.CORE_EARTH?.openDemoChoice) { e.preventDefault(); globalThis.CORE_EARTH.openDemoChoice(); } };
  el.querySelector('[data-lang]').onchange = e => setLang(e.target.value);
  if (!render.keys) { render.keys = true; addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmp(); } }); }
  if (!render.bound) { render.bound = true; document.addEventListener('core:lang', () => render(el, { active })); }
}

// Contextual navigation for a destination: its pages, then its sections. `current` is a page id or a section id.
export function subnav(groupId, current) {
  const g = GROUPS.find(x => x.id === groupId); if (!g) return '';
  const items = [...(g.links || []).map(([id, label, href]) => [id, label, href]), ...(g.sections || []).map(([id, label]) => [id, label, `commons.html#${id}`])];
  return items.map(([id, label, href]) => `<a href="${esc(href)}"${id === current ? ' aria-current="page"' : ''}>${esc(Array.isArray(label) ? T(...label) : label)}</a>`).join('');
}
