// Commons × missions (V7.2): Knowledge, Labs, Arena and Academy read the flagship mission's computed findings.
// Nothing here creates knowledge: mission findings are calculations on dated public data, reviewed by no human; they
// are shown as cited candidates, never merged into the verified Knowledge graph, never ranked by votes.
import * as A from '../civilization/analyses.mjs';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MID = 'mission.sf.housing-resilience', TITLE = 'Logement abordable et résilience urbaine — San Francisco';
let cached = null;
async function load() {
  if (cached) return cached;
  const need = ['pipeline', 'prodYear', 'prodNb', 'evictions', 'housingManifest', 'flood', 'sf9Manifest'], D = {};
  await Promise.all(need.map(async k => { const r = await fetch(A.FILES[k]); if (!r.ok) throw Error(`${A.FILES[k]} : HTTP ${r.status}`); D[k] = await r.json(); }));
  return (cached = A.housing(D));
}
const src = f => f.source ? `${esc(f.source.title)} · récupéré le ${esc(f.source.retrieved)}` : 'lacune';
const links = `<p class="le-row"><a class="btn small" href="world.html#layer=agents&mission=${MID}">Voir la mission dans World</a><a class="btn small" href="dialogue.html#mission=${MID}">Séance d’équipe</a></p>`;
const VIEWS = {
  knowledge: h => `<div class="card" id="mission-knowledge"><p class="le-eyebrow">Mission V7.2</p><h2>Constats de la mission « ${TITLE} »</h2>
    <p class="fine">Candidats calculés par le moteur CORE sur des instantanés publics datés ; aucune revue humaine ; non intégrés au graphe vérifié de CORE Knowledge.</p>
    <ul>${h.findings.map(f => `<li><span class="badge ${f.status === 'observed' ? 'observed' : f.status === 'gap' ? 'none' : 'info'}">${esc(f.status === 'gap' ? 'LACUNE' : f.status === 'observed' ? 'OBSERVÉ' : 'DÉRIVÉ')}</span> ${esc(f.claim)}<br><span class="fine">${src(f)} — ${esc(f.limits)}</span></li>`).join('')}</ul>${links}</div>`,
  labs: h => `<div class="card" id="mission-labs"><p class="le-eyebrow">Mission V7.2</p><h2>Tester une idée contre la mission logement</h2>
    <p class="fine">Preuves manquantes connues de la mission : toute idée qui en dépend reste une hypothèse.</p><ul>${h.findings.filter(f => f.status === 'gap').map(f => `<li>${esc(f.claim)}</li>`).join('')}</ul>
    <p class="fine">Tests déjà proposés par l’équipe : ${h.hypotheses.map(x => `${esc(x.id)} — ${esc(x.test)}`).join(' · ')}</p>${links}</div>`,
  arena: h => `<div class="card" id="mission-arena"><p class="le-eyebrow">Mission V7.2 · sans vote, sans gagnant</p><h2>Hypothèses concurrentes de la mission logement</h2>
    <div class="grid2">${h.hypotheses.map(x => `<div class="contrib"><b>${esc(x.id)} — ${esc(x.title)}</b><p>${esc(x.statement)}</p><p class="fine">Appuis : ${x.support.map(id => esc(h.findings.find(f => f.id === id)?.claim || id)).join(' · ')}</p><p class="fine">Ce qui manque : ${x.against.map(id => esc(h.findings.find(f => f.id === id)?.claim || id)).join(' · ')}</p></div>`).join('')}</div>
    <p class="fine">Dissidences conservées : ${h.dissent.map(d => esc(d.text)).join(' · ')}</p><p class="fine">La popularité ne départage pas des hypothèses ; seules de nouvelles données datées le peuvent.</p>${links}</div>`,
  academy: h => { const f = id => h.findings.find(x => x.id === id);
    return `<div class="card" id="mission-academy"><p class="le-eyebrow">Leçon V7.2 · démonstration enseignant</p><h2>Lire un dossier de mission : constat, calcul, lacune, hypothèse</h2>
    <ol><li>Ce constat est-il observé ou dérivé ? « ${esc(f('h.production-trend').claim)} » <details><summary>Réponse</summary>Dérivé : une moyenne calculée sur des comptes observés (${src(f('h.production-trend'))}).</details></li>
      <li>Peut-on dire que les loyers ont augmenté ? <details><summary>Réponse</summary>Non : ${esc(f('g.rent-burden').claim)}</details></li>
      <li>Les avis d’expulsion sont-ils des expulsions ? <details><summary>Réponse</summary>Non. ${esc(f('h.eviction-notices').limits)}</details></li>
      <li>H1 explique-t-elle la crise ? <details><summary>Réponse</summary>Non établi : ${esc(f('g.causality').claim)}</details></li></ol>
    <p class="fine">Élèves fictifs ; aucun mineur réel ; l’enseignant garde l’autorité pédagogique.</p>${links}</div>`; },
};
export async function append(tab, B) {
  if (!VIEWS[tab] || B.querySelector(`#mission-${tab}`)) return;
  try { const h = await load(); B.insertAdjacentHTML(tab === 'knowledge' ? 'beforeend' : 'afterbegin', VIEWS[tab](h)); }
  catch (e) { B.insertAdjacentHTML('beforeend', `<p class="warn">Mission logement indisponible (${esc(e.message)}).</p>`); }
}
