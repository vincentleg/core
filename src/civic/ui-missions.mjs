// Commons × missions (V7.2): Knowledge, Labs, Arena and Academy read the flagship mission's computed findings.
// Nothing here creates knowledge: mission findings are calculations on dated public data, reviewed by no human; they
// are shown as cited candidates, never merged into the verified Knowledge graph, never ranked by votes.
import * as A from '../civilization/analyses.mjs';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
import { T, L } from '../i18n/i18n.mjs';
const MID = 'mission.sf.housing-resilience', TITLE = () => T('Affordable housing and urban resilience — San Francisco', 'Logement abordable et résilience urbaine — San Francisco');
let cached = null;
async function load() {
  if (cached) return cached;
  const need = ['pipeline', 'prodYear', 'prodNb', 'evictions', 'housingManifest', 'flood', 'sf9Manifest'], D = {};
  await Promise.all(need.map(async k => { const r = await fetch(A.FILES[k]); if (!r.ok) throw Error(`${A.FILES[k]} : HTTP ${r.status}`); D[k] = await r.json(); }));
  return (cached = A.housing(D));
}
const src = f => f.source ? `${esc(f.source.title)} · ${T('retrieved', 'récupéré le')} ${esc(f.source.retrieved)}` : T('gap', 'lacune');
const claim = (h, id) => esc(L(h.findings.find(f => f.id === id)?.claim) || id);
const links = () => `<p class="le-row"><a class="btn small" href="world.html#layer=agents&mission=${MID}">${T('See the mission in World', 'Voir la mission dans World')}</a><a class="btn small" href="dialogue.html#mission=${MID}">${T('Team session', 'Séance d’équipe')}</a></p>`;
const VIEWS = {
  knowledge: h => `<div class="card" id="mission-knowledge"><p class="le-eyebrow">${T('Mission V7.2', 'Mission V7.2')}</p><h2>${T(`Findings of the mission “${TITLE()}”`, `Constats de la mission « ${TITLE()} »`)}</h2>
    <p class="fine">${T('Candidates computed by the CORE engine on dated public snapshots; no human review; not merged into the verified CORE Knowledge graph.', 'Candidats calculés par le moteur CORE sur des instantanés publics datés ; aucune revue humaine ; non intégrés au graphe vérifié de CORE Knowledge.')}</p>
    <ul>${h.findings.map(f => `<li><span class="badge ${f.status === 'observed' ? 'observed' : f.status === 'gap' ? 'none' : 'info'}">${f.status === 'gap' ? T('GAP', 'LACUNE') : f.status === 'observed' ? T('OBSERVED', 'OBSERVÉ') : T('DERIVED', 'DÉRIVÉ')}</span> ${esc(L(f.claim))}<br><span class="fine">${src(f)} — ${esc(L(f.limits))}</span></li>`).join('')}</ul>${links()}</div>`,
  labs: h => `<div class="card" id="mission-labs"><p class="le-eyebrow">Mission V7.2</p><h2>${T('Test an idea against the housing mission', 'Tester une idée contre la mission logement')}</h2>
    <p class="fine">${T('Known missing evidence for the mission: any idea that depends on it remains a hypothesis.', 'Preuves manquantes connues de la mission : toute idée qui en dépend reste une hypothèse.')}</p><ul>${h.findings.filter(f => f.status === 'gap').map(f => `<li>${esc(L(f.claim))}</li>`).join('')}</ul>
    <p class="fine">${T('Tests already proposed by the team', 'Tests déjà proposés par l’équipe')} : ${h.hypotheses.map(x => `${esc(x.id)} — ${esc(L(x.test))}`).join(' · ')}</p>${links()}</div>`,
  arena: h => `<div class="card" id="mission-arena"><p class="le-eyebrow">${T('Mission V7.2 · no vote, no winner', 'Mission V7.2 · sans vote, sans gagnant')}</p><h2>${T('Competing hypotheses of the housing mission', 'Hypothèses concurrentes de la mission logement')}</h2>
    <div class="grid2">${h.hypotheses.map(x => `<div class="contrib"><b>${esc(x.id)} — ${esc(L(x.title))}</b><p>${esc(L(x.statement))}</p><p class="fine">${T('Support', 'Appuis')} : ${x.support.map(id => claim(h, id)).join(' · ')}</p><p class="fine">${T('What is missing', 'Ce qui manque')} : ${x.against.map(id => claim(h, id)).join(' · ')}</p></div>`).join('')}</div>
    <p class="fine">${T('Dissent kept', 'Dissidences conservées')} : ${h.dissent.map(d => esc(L(d.text))).join(' · ')}</p><p class="fine">${T('Popularity does not decide between hypotheses; only new dated data can.', 'La popularité ne départage pas des hypothèses ; seules de nouvelles données datées le peuvent.')}</p>${links()}</div>`,
  academy: h => { const f = id => h.findings.find(x => x.id === id);
    return `<div class="card" id="mission-academy"><p class="le-eyebrow">${T('Lesson V7.2 · teacher demonstration', 'Leçon V7.2 · démonstration enseignant')}</p><h2>${T('Reading a mission file: finding, calculation, gap, hypothesis', 'Lire un dossier de mission : constat, calcul, lacune, hypothèse')}</h2>
    <ol><li>${T('Is this finding observed or derived?', 'Ce constat est-il observé ou dérivé ?')} ${T('“', '« ')}${esc(L(f('h.production-trend').claim))}${T('”', ' »')} <details><summary>${T('Answer', 'Réponse')}</summary>${T('Derived: an average computed on observed counts', 'Dérivé : une moyenne calculée sur des comptes observés')} (${src(f('h.production-trend'))}).</details></li>
      <li>${T('Can we say that rents went up?', 'Peut-on dire que les loyers ont augmenté ?')} <details><summary>${T('Answer', 'Réponse')}</summary>${T('No', 'Non')} : ${esc(L(f('g.rent-burden').claim))}</details></li>
      <li>${T('Are eviction notices evictions?', 'Les avis d’expulsion sont-ils des expulsions ?')} <details><summary>${T('Answer', 'Réponse')}</summary>${T('No.', 'Non.')} ${esc(L(f('h.eviction-notices').limits))}</details></li>
      <li>${T('Does H1 explain the crisis?', 'H1 explique-t-elle la crise ?')} <details><summary>${T('Answer', 'Réponse')}</summary>${T('Not established', 'Non établi')} : ${esc(L(f('g.causality').claim))}</details></li></ol>
    <p class="fine">${T('Fictional students; no real minor; the teacher keeps pedagogical authority.', 'Élèves fictifs ; aucun mineur réel ; l’enseignant garde l’autorité pédagogique.')}</p>${links()}</div>`; },
};
export async function append(tab, B) {
  if (!VIEWS[tab] || B.querySelector(`#mission-${tab}`)) return;
  try { const h = await load(); B.insertAdjacentHTML(tab === 'knowledge' ? 'beforeend' : 'afterbegin', VIEWS[tab](h)); }
  catch (e) { B.insertAdjacentHTML('beforeend', `<p class="warn">${T('Housing mission unavailable', 'Mission logement indisponible')} (${esc(e.message)}).</p>`); }
}
