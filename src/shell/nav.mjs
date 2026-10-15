// CORE shell navigation — one product, one hierarchy. World is the primary human experience; Intelligence is the
// scientific engine; TRUST governs everything and is always one click away. Pages: world.html, dialogue.html,
// commons.html#<section>, index.html#app. Deep links use the hash so state survives without a server.
import { read } from './journey.mjs';
export const GROUPS = [
  { id: 'world', label: 'World', href: 'world.html', primary: true },
  { id: 'dialogue', label: 'Dialogue', href: 'dialogue.html' },
  { id: 'savoir', label: 'Savoir', href: 'commons.html#knowledge', sections: [['knowledge', 'Knowledge'], ['continuity', 'Continuity']] },
  { id: 'espace', label: 'Mon espace', href: 'commons.html#profile', sections: [['profile', 'Identité'], ['vault', 'Coffre à idées'], ['labs', 'Labs']] },
  { id: 'ensemble', label: 'Ensemble', href: 'commons.html#experts', sections: [['experts', 'Experts (fictifs)'], ['communities', 'Communautés (fictives)'], ['arena', 'Arène (fictive)']] },
  { id: 'apprendre', label: 'Apprendre', href: 'commons.html#academy', sections: [['academy', 'Académie']] },
  { id: 'progres', label: 'Progrès', href: 'commons.html#progress', sections: [['progress', 'Progrès'], ['journey', 'Mon parcours']] },
  { id: 'intelligence', label: 'Intelligence', href: 'index.html#app' },
  { id: 'trust', label: 'TRUST', href: 'commons.html#trust', sections: [['trust', 'Mes données et la sécurité']] },
];
export const groupOf = section => GROUPS.find(g => g.sections?.some(([id]) => id === section)) || null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function render(el, { active }) {
  const j = read(), done = Object.keys(j.steps).length;
  el.innerHTML = `<a class="mark" href="world.html" aria-label="CORE World — accueil">C<span>◯</span>RE</a><span class="proto">PROTOTYPE LOCAL</span>
    <nav class="core-nav" aria-label="Navigation CORE"><ul>${GROUPS.map(g => `<li><a href="${esc(g.href)}"${g.id === active ? ' aria-current="page"' : ''}${g.primary ? ' class="primary-link"' : ''}>${esc(g.label)}</a></li>`).join('')}</ul></nav>
    <a class="journey-chip" href="commons.html#journey" title="Mon parcours (stocké dans ce navigateur, sans contenu privé)">Parcours ${done}/8</a>`;
}
