// CORE World — avatar presets (humans) and the agent figure (clearly artificial). Inline SVG, no external assets.
// Presets differ in style and silhouette only; nothing about them carries status, competence or rank.
export const PRESETS = [
  { id: 'ava', name: 'Ava', skin: '#8d5a3b', hair: 'bun', hairColor: '#1d1410', outfit: 'jacket', top: '#2f6f8f', bottom: '#25303b' },
  { id: 'noor', name: 'Noor', skin: '#c68b62', hair: 'scarf', hairColor: '#7a3b4a', outfit: 'coat', top: '#b98b3e', bottom: '#3a3a44' },
  { id: 'kenji', name: 'Kenji', skin: '#e0b48f', hair: 'short', hairColor: '#20201e', outfit: 'hoodie', top: '#4f7a4a', bottom: '#2b2b30' },
  { id: 'malik', name: 'Malik', skin: '#5b3a28', hair: 'curly', hairColor: '#0f0c0a', outfit: 'shirt', top: '#c9c3b6', bottom: '#2f4057' },
  { id: 'elena', name: 'Elena', skin: '#f0cfb0', hair: 'long', hairColor: '#a8723a', outfit: 'jacket', top: '#8f3f3f', bottom: '#2e3236' },
];
export const PALETTE = ['#2f6f8f', '#b98b3e', '#4f7a4a', '#8f3f3f', '#5d4f8f', '#c9c3b6', '#2b2b30', '#d1784c'];
export const HAIR = ['short', 'long', 'bun', 'curly', 'scarf'];

const hair = (kind, c) => ({
  short: `<path d="M20 15c0-6 4-9 10-9s10 3 10 9v2H20z" fill="${c}"/>`,
  long: `<path d="M19 17c0-8 5-11 11-11s11 3 11 11v15h-4V19H23v13h-4z" fill="${c}"/>`,
  bun: `<circle cx="30" cy="5" r="4" fill="${c}"/><path d="M20 15c0-6 4-9 10-9s10 3 10 9v2H20z" fill="${c}"/>`,
  curly: `<path d="M19 15c-1-7 5-10 11-10s12 3 11 10c-2 1-4 1-5 0-2 1-4 1-6 0-2 1-4 1-6 0-2 1-4 1-5 0z" fill="${c}"/>`,
  scarf: `<path d="M18 17c0-8 5-12 12-12s12 4 12 12v14c-3 2-6 3-12 3s-9-1-12-3z" fill="${c}"/>`,
}[kind] || '');

// Human figure, seen from behind/three-quarter so it reads in third person. Legs are separate groups for the walk cycle.
export function humanSVG(a, { title = '' } = {}) {
  const coat = a.outfit === 'coat' ? `<path d="M19 30h22l3 26H16z" fill="${a.top}"/>` : `<rect x="19" y="29" width="22" height="22" rx="6" fill="${a.top}"/>`;
  const hood = a.outfit === 'hoodie' ? `<path d="M21 28c2-3 16-3 18 0l-2 5H23z" fill="${a.top}" opacity=".85"/>` : '';
  return `<svg viewBox="0 0 60 92" width="60" height="92" role="img" aria-label="${title || `Avatar ${a.name}`}" class="human-svg">
  <ellipse cx="30" cy="89" rx="14" ry="3" fill="#000" opacity=".35"/>
  <g class="leg l"><rect x="22" y="52" width="7" height="32" rx="3" fill="${a.bottom}"/><rect x="21" y="82" width="9" height="5" rx="2" fill="#1a1a1a"/></g>
  <g class="leg r"><rect x="31" y="52" width="7" height="32" rx="3" fill="${a.bottom}"/><rect x="30" y="82" width="9" height="5" rx="2" fill="#1a1a1a"/></g>
  <g class="arm l"><rect x="13" y="31" width="7" height="22" rx="3.5" fill="${a.top}"/><circle cx="16.5" cy="54" r="3" fill="${a.skin}"/></g>
  <g class="arm r"><rect x="40" y="31" width="7" height="22" rx="3.5" fill="${a.top}"/><circle cx="43.5" cy="54" r="3" fill="${a.skin}"/></g>
  ${coat}${hood}
  <rect x="27" y="24" width="6" height="6" fill="${a.skin}"/>
  <ellipse cx="30" cy="16" rx="9.5" ry="10.5" fill="${a.skin}"/>
  ${hair(a.hair, a.hairColor)}
</svg>`;
}

// Agent figure: hexagonal body, emblem and halo. Deliberately non-human so nobody mistakes an agent for a person.
export function agentSVG({ code = 'AGENT', color = '#78e8ff' } = {}) {
  return `<svg viewBox="0 0 64 96" width="64" height="96" role="img" aria-label="Agent ${code}" class="agent-svg">
  <ellipse cx="32" cy="92" rx="16" ry="3" fill="${color}" opacity=".35"/>
  <path d="M32 40l16 9v20l-16 9-16-9V49z" fill="#06223a" stroke="${color}" stroke-width="2"/>
  <path d="M32 50l7 4v8l-7 4-7-4v-8z" fill="${color}" opacity=".85"/>
  <circle cx="32" cy="24" r="11" fill="#06223a" stroke="${color}" stroke-width="2"/>
  <rect x="25" y="21" width="14" height="5" rx="2.5" fill="${color}"/>
  <circle class="halo" cx="32" cy="24" r="16" fill="none" stroke="${color}" stroke-width="1" opacity=".5"/>
  <line x1="32" y1="78" x2="32" y2="86" stroke="${color}" stroke-width="2"/>
</svg>`;
}
