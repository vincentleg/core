// CORE shell navigation (V7) — four primary destinations; every earlier section stays reachable through contextual
// navigation. EXPLORE: the world and what is known about it. CREATE: think and develop ideas privately.
// COLLABORATE: experts, communities, debate and learning (fictional participants for now). MY CORE: identity, avatar,
// history and privacy. TRUST is always one click away. Deep links keep using the hash: commons.html#<section>?k=v.
import { read } from './journey.mjs';
import { icon } from '../ui/icons.mjs';
export const GROUPS = [
  { id: 'explore', label: 'Explorer', icon: 'explore', href: 'world.html', primary: true,
    links: [['world', 'World', 'world.html'], ['intelligence', 'Intelligence', 'index.html#app']],
    sections: [['knowledge', 'Knowledge'], ['progress', 'Progrès'], ['continuity', 'Continuity'], ['institutions', 'Institutions (démo)']] },
  { id: 'create', label: 'Créer', icon: 'create', href: 'dialogue.html',
    links: [['dialogue', 'Dialogue & Studio', 'dialogue.html']],
    sections: [['vault', 'Coffre à idées'], ['labs', 'Labs']] },
  { id: 'collaborate', label: 'Collaborer', icon: 'collaborate', href: 'commons.html#experts',
    sections: [['experts', 'Experts (fictifs)'], ['communities', 'Communautés (fictives)'], ['arena', 'Arène (fictive)'], ['academy', 'Académie']] },
  { id: 'me', label: 'Mon CORE', icon: 'me', href: 'me.html',
    links: [['me', 'Mon CORE', 'me.html'], ['avatar', 'Avatar', 'avatar.html']],
    sections: [['profile', 'Identité'], ['journey', 'Mon parcours'], ['trust', 'Mes données et TRUST']] },
];
// Page → destination, for pages that are not commons sections.
const PAGES = { world: 'explore', intelligence: 'explore', dialogue: 'create', me: 'me', avatar: 'me' };
export const groupOf = section => GROUPS.find(g => g.sections?.some(([id]) => id === section)) || GROUPS.find(g => g.id === PAGES[section]) || null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function render(el, { active }) {
  const j = read(), done = Object.keys(j.steps).length, g = GROUPS.find(x => x.id === active) || groupOf(active);
  el.innerHTML = `<a class="mark" href="world.html" aria-label="CORE — accueil"><i class="orb" aria-hidden="true"></i>CORE</a><span class="proto">PROTOTYPE LOCAL</span>
    <nav class="le-nav" aria-label="Navigation principale">${GROUPS.map(x => `<a href="${esc(x.href)}"${g && x.id === g.id ? ' aria-current="page"' : ''}>${icon(x.icon, 16)}<span>${esc(x.label)}</span></a>`).join('')}</nav>
    <div class="le-shell-right"><a class="journey-chip" href="commons.html#journey" title="Mon parcours (stocké dans ce navigateur, sans contenu privé)">${icon('route', 15)}Parcours ${done}/8</a>
      <a class="trust" href="commons.html#trust" title="TRUST — vos données, la sécurité et les garanties">${icon('trust', 16)}<span>TRUST</span></a></div>`;
}

// Contextual navigation for a destination: its pages, then its sections. `current` is a page id or a section id.
export function subnav(groupId, current) {
  const g = GROUPS.find(x => x.id === groupId); if (!g) return '';
  const items = [...(g.links || []).map(([id, label, href]) => [id, label, href]), ...(g.sections || []).map(([id, label]) => [id, label, `commons.html#${id}`])];
  return items.map(([id, label, href]) => `<a href="${esc(href)}"${id === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
}
