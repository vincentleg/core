// CORE V8 — « Experience CORE »: an autonomous guided tour of about four minutes in 12 acts, driven through the public
// World API (no private data, nothing shared, nothing recorded). Start, pause, skip and exit at any time; Space pauses,
// → skips, Esc exits. Reduced motion: camera jumps instead of flights. Every act states what is real, synthetic or simulated.
import { lang } from '../i18n/i18n.mjs';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = ms => new Promise(r => setTimeout(r, ms));
const T = {
  en: { title: 'Experience CORE', start: 'Start the tour', pause: 'Pause', resume: 'Resume', skip: 'Next', exit: 'Exit', of: 'of',
    intro: 'A four-minute guided tour in 12 acts. You can pause, skip or leave at any moment. Nothing you do is recorded or shared.',
    acts: [
      ['Earth', 'This is Earth — the real one, drawn from open map data and NASA imagery. CORE builds a parallel version of it.'],
      ['A region', 'Every layer is labelled: observed, derived, simulated or unknown. Here, the San Francisco Bay Area.'],
      ['A city', 'In San Francisco, CORE runs research missions on public, dated data: housing, energy, road safety, mobility.'],
      ['The agents', 'These holograms are registered CORE agents — software identities with roles, not people, and not free-running AI. Their work is coded computation.'],
      ['A mission', 'The mobility mission asks: what could reduce delays on Folsom Street without harming buses, safety or equity — and what can we actually know?'],
      ['What we do not know', 'No public traffic counts. Signal timings unpublished. CORE declares these gaps instead of filling them with guesses.'],
      ['Simulate: a bus lane', 'A recorded SUMO simulation on the real street network. In this uncalibrated model, the bus lane breaks where Folsom narrows — buses get trapped. Not supported.'],
      ['Compare: adaptive signals', 'Actuated signals cut modelled delays for cars and buses. Promising — but only in a model without real counts. Human review required.'],
      ['Street level', 'Walk the street among the agents. They stand on mapped walkways, never inside buildings.'],
      ['Your turn', '“I noticed something.” Describe what you see; CORE structures it. You decide whether it stays private or is shared — never automatically.'],
      ['Honest progress', 'Knowledge, gaps, simulations and participation are counted separately. Verified real-world impact: zero. Energy use: Kardashev ≈ 0.73.'],
      ['CORE', 'A parallel world to help humanity improve the real one.'],
    ] },
  fr: { title: 'Découvrir CORE', start: 'Commencer la visite', pause: 'Pause', resume: 'Reprendre', skip: 'Suivant', exit: 'Quitter', of: 'sur',
    intro: 'Une visite guidée de quatre minutes en 12 actes. Vous pouvez mettre en pause, passer ou quitter à tout moment. Rien n’est enregistré ni partagé.',
    acts: [
      ['La Terre', 'Voici la Terre — la vraie, dessinée à partir de cartes ouvertes et d’images de la NASA. CORE en construit une version parallèle.'],
      ['Une région', 'Chaque couche est étiquetée : observée, dérivée, simulée ou inconnue. Ici, la baie de San Francisco.'],
      ['Une ville', 'À San Francisco, CORE mène des missions de recherche sur des données publiques datées : logement, énergie, sécurité routière, mobilité.'],
      ['Les agents', 'Ces hologrammes sont des agents CORE enregistrés — des identités logicielles avec un rôle, pas des personnes, ni des IA libres. Leur travail est du calcul codé.'],
      ['Une mission', 'La mission mobilité demande : qu’est-ce qui pourrait réduire les retards sur Folsom sans nuire aux bus, à la sécurité ni à l’équité — et que peut-on vraiment en savoir ?'],
      ['Ce que l’on ne sait pas', 'Aucun comptage public. Minutage des feux non publié. CORE déclare ces lacunes au lieu de les combler par des suppositions.'],
      ['Simuler : une voie de bus', 'Une simulation SUMO enregistrée sur le vrai réseau. Dans ce modèle non calibré, la voie bus casse là où Folsom se rétrécit — les bus restent bloqués. Non étayé.'],
      ['Comparer : feux adaptatifs', 'Les feux actionnés réduisent les retards modélisés des voitures et des bus. Prometteur — mais seulement dans un modèle sans comptages réels. Revue humaine requise.'],
      ['À hauteur humaine', 'Marchez dans la rue parmi les agents. Ils se tiennent sur les trottoirs cartographiés, jamais dans les bâtiments.'],
      ['À vous', '« J’ai remarqué quelque chose. » Décrivez ce que vous voyez ; CORE le structure. Vous décidez s’il reste privé ou s’il est partagé — jamais automatiquement.'],
      ['Un progrès honnête', 'Connaissance, lacunes, simulations et participation sont comptées séparément. Impact réel vérifié : zéro. Énergie : Kardashev ≈ 0,73.'],
      ['CORE', 'Un monde parallèle pour aider l’humanité à améliorer le monde réel.'],
    ] },
};
export const ACT_MS = 20000;

// E: the World API (CORE_EARTH). Returns a controller.
export function createDemo(E, root = document.body) {
  const L = T[lang()] || T.en, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = { i: -1, paused: false, left: 0, t0: 0, timer: 0, running: false, done: false };
  const el = document.createElement('section'); el.className = 'demo le-glass'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', L.title); el.setAttribute('aria-live', 'polite');
  root.append(el);
  const panelOff = () => { const p = document.getElementById('ea-panel'); if (p) p.hidden = true; };
  const ACTS = [
    async () => { panelOff(); E.revealMap(); await E.goScale('planet'); },
    async () => { await E.goScale('region'); },
    async () => { await E.flyTo([-122.4085, 37.7790], 15.2); E.setLayer('hybrid'); },
    async () => { E.setLayer('agents'); const R = E.civ(); const busy = R?.agents.find(a => R.activity(a.id).state === 'working' || R.activity(a.id).state === 'inspecting'); if (busy) E.followAgent(busy.id); },
    async () => { E.state.follow = null; E.setLayer('hybrid'); E.showMission('mission.sf.mobility'); },
    async () => { const p = document.querySelector('#ea-panel .pp-unc'); p?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); },
    async () => { await E.playSimulation('A'); },
    async () => { await E.playSimulation('B'); document.querySelector('#ea-panel .scn-table')?.scrollIntoView({ block: 'center' }); },
    async () => { E.hideSimulation?.(true); if (E.state.quality !== 'low') { await E.enterHuman(); } },
    async () => { if (E.state.mode === 'human') await E.goScale('city'); E.showNoticed(); const t = document.getElementById('nt-text'); if (t) { t.value = L === T.fr ? 'Le matin, les bus restent bloqués sur Folsom entre la 5th et la 6th ; peut-être à cause des voitures qui tournent.' : 'In the morning, buses get stuck on Folsom between 5th and 6th; maybe because of turning cars.'; document.getElementById('nt-form')?.requestSubmit(); } },
    async () => { panelOff(); },
    async () => { panelOff(); await E.goScale('planet'); },
  ];
  function view() {
    if (S.i < 0) { el.innerHTML = `<h2>${esc(L.title)}</h2><p>${esc(L.intro)}</p><div class="le-row"><button type="button" class="primary" data-d="start">${esc(L.start)}</button><button type="button" data-d="exit">${esc(L.exit)}</button></div>`; return; }
    const [h, p] = L.acts[S.i], last = S.i === ACTS.length - 1;
    el.innerHTML = `<p class="le-eyebrow">${S.i + 1} ${esc(L.of)} ${ACTS.length}</p><h2>${esc(h)}</h2><p class="${last ? 'demo-last' : ''}">${esc(p)}</p>
      <div class="demo-bar" aria-hidden="true"><i style="width:${((S.i + 1) / ACTS.length) * 100}%"></i></div>
      <div class="le-row"><button type="button" data-d="pause">${esc(S.paused ? L.resume : L.pause)}</button>${last ? '' : `<button type="button" data-d="skip">${esc(L.skip)}</button>`}<button type="button" data-d="exit">${esc(L.exit)}</button></div>`;
  }
  async function go(i) {
    clearTimeout(S.timer); S.i = i; if (i >= ACTS.length) return exit(true);
    view(); try { await ACTS[i](); } catch (e) { console.warn('demo act', i + 1, e); }
    if (S.i !== i || !S.running) return; S.left = i === ACTS.length - 1 ? 9000 : ACT_MS; arm();
  }
  function arm() { clearTimeout(S.timer); if (S.paused) return; S.t0 = performance.now(); const i = S.i; S.timer = setTimeout(() => { if (S.i === i) go(i + 1); }, S.left); }
  function pause() { if (S.i < 0) return; S.paused = !S.paused; if (S.paused) { clearTimeout(S.timer); S.left = Math.max(0, S.left - (performance.now() - S.t0)); E.state.scn?.stop?.(); } else arm(); view(); }
  function exit(done = false) { clearTimeout(S.timer); S.running = false; S.done = done; el.remove(); removeEventListener('keydown', keys, true); history.replaceState(null, '', location.pathname); }
  function keys(e) { if (!S.running || e.target.closest?.('input, textarea, select')) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); exit(); } else if (e.key === ' ' && E.state.mode !== 'human') { e.preventDefault(); pause(); } else if (e.key === 'ArrowRight' && E.state.mode !== 'human') { e.preventDefault(); go(S.i + 1); } }
  el.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; const d = b.dataset.d; if (d === 'start') go(0); else if (d === 'pause') pause(); else if (d === 'skip') go(S.i + 1); else exit(); });
  addEventListener('keydown', keys, true); S.running = true; view();
  return { state: S, start: () => go(0), pause, skip: () => go(S.i + 1), exit, acts: ACTS.length, text: L };
}
