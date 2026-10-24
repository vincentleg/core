// R35 mission demonstration. One elapsed clock drives camera, avatars and both progress bars.
// Scripted movement and exchange illustrate a recorded, offline investigation; they are never execution events.
import { T } from '../i18n/i18n.mjs';
import { SF_MOBILITY } from '../execution/missions.mjs';

const MOB = SF_MOBILITY.id;
const A = 'core.san-francisco.climate.lead'; // recorded evidence role, F4/F5
const B = 'core.san-francisco.housing.lead'; // recorded quantitative role, F6/F7/F8
const ROAD = [[-122.403387209, 37.780264973], [-122.404431251, 37.779440335]]; // catalog segment 5665000
const GLOBE = { center: [-24, 24], zoom: 1.6, pitch: 0, bearing: 0 };
const CITY = { center: [-122.4135, 37.7765], zoom: 12.2, pitch: 45, bearing: -25 };
const MID = [(ROAD[0][0] + ROAD[1][0]) / 2, (ROAD[0][1] + ROAD[1][1]) / 2];
const AGENT = { center: ROAD[0], zoom: 16.8, pitch: 54, bearing: -35 };
const PROBLEM = { center: ROAD[1], zoom: 17.3, pitch: 58, bearing: -32 };
const PAIR = { center: [-122.4041, 37.77985], zoom: 16.5, pitch: 50, bearing: -35 };
const WORK = { center: ROAD[1], zoom: 15.8, pitch: 40, bearing: -25 };
const EN = (title, detail, frTitle, frDetail) => ({ title: [title, frTitle], detail: [detail, frDetail] });
export const STAGES = Object.freeze([
  { id: 'activate', ...EN('CORE activates', 'Parallel World is a virtual workspace on sourced Earth geography. The mission is a guided reenactment, not live agent execution.', 'CORE s’active', 'Le Monde parallèle est un espace virtuel sur une géographie sourcée. La mission est une reconstitution guidée, pas une exécution en direct.'), from: GLOBE, to: GLOBE, subject: 'Earth', panel: 'none' },
  { id: 'approach', ...EN('Approach San Francisco', 'The camera locates the supported city and its Folsom Street mobility mission.', 'Approche de San Francisco', 'La caméra repère la ville prise en charge et sa mission mobilité sur Folsom Street.'), from: GLOBE, to: CITY, subject: 'San Francisco', panel: 'none' },
  { id: 'introduce', ...EN('Meet the evidence agent', 'CORE-CLI-0015 is a registered software identity. Its recorded role was evidence review in the offline mobility investigation.', 'Rencontrer l’agent de preuve', 'CORE-CLI-0015 est une identité logicielle enregistrée. Son rôle consigné était la revue des preuves dans l’enquête mobilité hors ligne.'), from: CITY, to: AGENT, subject: A, panel: 'agent' },
  { id: 'depart', ...EN('Travel along the mapped approach', 'A blue avatar moves on the published Folsom Street centerline. This movement is a visual reenactment, not a GPS trace or autonomous trip.', 'Parcourir l’approche cartographiée', 'Un avatar bleu suit l’axe publié de Folsom Street. Ce mouvement est une reconstitution visuelle, ni une trace GPS ni un déplacement autonome.'), from: AGENT, to: { ...AGENT, center: MID, zoom: 17.2 }, subject: A, panel: 'none', travel: [0, 0.5] },
  { id: 'arrive', ...EN('Follow the agent to the question', 'The camera follows the illustrative route to the mapped approach. No current traffic condition is inferred from this movement.', 'Suivre l’agent jusqu’à la question', 'La caméra suit le trajet illustratif vers l’approche cartographiée. Aucun état actuel du trafic n’est déduit de ce mouvement.'), from: { ...AGENT, center: MID, zoom: 17.2 }, to: PROBLEM, subject: A, panel: 'none', travel: [0.5, 1] },
  { id: 'problem', ...EN('Identify the evidence gap', 'The sourced street geometry is known. Traffic counts, actual signal timings and a measured delay at this location are missing; the mission asks whether an assumed timing change could reduce modelled delay.', 'Identifier le manque de preuves', 'La géométrie sourcée est connue. Comptages, minutages réels et retards mesurés ici manquent ; la mission teste si une modification supposée des feux peut réduire le retard modélisé.'), from: PROBLEM, to: PROBLEM, subject: 'Folsom segment 5665000', panel: 'mission' },
  { id: 'investigate', ...EN('Inspect recorded work', 'The approved mission tools read authorized geography, inspect evidence readiness and compare bounded scenarios. The published offline run has source and tool records; this tour starts no new run.', 'Examiner le travail consigné', 'Les outils autorisés lisent la géographie, contrôlent les preuves et comparent des scénarios bornés. L’exécution hors ligne publiée a des sources et journaux ; cette visite ne lance rien.'), from: PROBLEM, to: WORK, subject: 'Recorded tools', panel: 'team' },
  { id: 'exchange', ...EN('Agents exchange findings', 'Scripted illustration: the evidence role points to recorded validation F4/F5; the quantitative role contributes recorded mapped context F6/F7 and calculation F8. Open the recorded investigation for actual event logs.', 'Les agents échangent leurs constats', 'Illustration scénarisée : le rôle preuve montre F4/F5 ; le rôle quantitatif apporte le contexte F6/F7 et le calcul F8. Ouvrez l’enquête consignée pour les vrais journaux.'), from: WORK, to: PAIR, subject: 'CORE-CLI-0015 + CORE-HSG-0017', panel: 'investigation', pair: true },
  { id: 'synthesize', ...EN('Separate observations from hypotheses', 'Observation: mapped road geometry and dated source records. Hypothesis: changed green time may alter modelled queues. Missing: counts, signal plans, calibration and independent review.', 'Distinguer constats et hypothèses', 'Observation : géométrie et registres datés. Hypothèse : un autre temps de vert peut modifier les files modélisées. Manquent : comptages, plans de feux, calibration et revue indépendante.'), from: PAIR, to: PAIR, subject: 'Shared analysis', panel: 'investigation', pair: true },
  { id: 'candidates', ...EN('Form candidate scenarios', 'The verified recorded urban report compares Baseline, Alternative A and Alternative B under declared assumed demand and signal capacity. These are candidate models, not street proposals.', 'Former des scénarios candidats', 'Le rapport urbain vérifié compare Référence, Variante A et Variante B avec demande et capacité supposées. Ce sont des modèles candidats, pas des décisions de voirie.'), from: PAIR, to: WORK, subject: 'Folsom scenario inputs', panel: 'workbench' },
  { id: 'simulate', ...EN('View a bounded simulation', 'The verified urban report contains a deterministic queue calculation. A separate recorded SUMO trace may illustrate vehicles on the map; those vehicles are simulated, not observed traffic.', 'Voir une simulation bornée', 'Le rapport urbain vérifié contient un calcul déterministe de files. Une trace SUMO distincte peut illustrer des véhicules ; ils sont simulés, pas observés.'), from: WORK, to: PROBLEM, subject: 'Scenario area', panel: 'simulation' },
  { id: 'compare', ...EN('Compare without overclaiming', 'The lowest modelled delay is only a result under assumed inputs. CORE recommends gathering measurements and calibration before considering any intervention.', 'Comparer sans surinterpréter', 'Le retard modélisé le plus faible dépend des hypothèses. CORE recommande de mesurer et calibrer avant toute intervention.'), from: PROBLEM, to: WORK, subject: 'Verified model comparison', panel: 'results' },
  { id: 'report', ...EN('Prepare human review', 'The dossier links sources, recorded work, model limits and open questions. It remains a research proposal; no agent approves a finding or public action.', 'Préparer la revue humaine', 'Le dossier relie sources, travail consigné, limites et questions ouvertes. Il reste une proposition de recherche ; aucun agent n’approuve un constat ou une action publique.'), from: WORK, to: CITY, subject: 'Evidence workspace', panel: 'report' },
  { id: 'reality', ...EN('Return to Real World', 'Virtual agents disappear. Physical implementation would require authorized measurements, qualified independent review and explicit human approval. Verified real-world resolution: none.', 'Retourner au Monde réel', 'Les agents virtuels disparaissent. Une mise en œuvre exige mesures autorisées, revue indépendante qualifiée et autorisation humaine explicite. Résolution réelle vérifiée : aucune.'), from: CITY, to: CITY, subject: 'Physical San Francisco', panel: 'report', real: true }
]);

export const DEMO_AGENTS = Object.freeze([{ id: A, code: 'CORE-CLI-0015', role: 'Recorded evidence role', refs: 'F4, F5' }, { id: B, code: 'CORE-HSG-0017', role: 'Recorded quantitative role', refs: 'F6, F7, F8' }]);
export const progress = (elapsed, duration) => Math.max(0, Math.min(1, elapsed / duration));
export function advanceTimeline(state, delta) {
  if (!state.paused) state.elapsed = Math.min(state.duration, state.elapsed + Math.max(0, delta));
  return progress(state.elapsed, state.duration);
}
const mix = (a, b, p) => a + (b - a) * p;
export function cameraAt(stage, p) {
  const a = stage.from || GLOBE, b = stage.to || a, t = p * p * (3 - 2 * p);
  return { center: [mix(a.center[0], b.center[0], t), mix(a.center[1], b.center[1], t)], zoom: mix(a.zoom, b.zoom, t), pitch: mix(a.pitch, b.pitch, t), bearing: mix(a.bearing, b.bearing, t) };
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TXT = a => T(...a);
const F = { type: 'FeatureCollection', features: [] };
const line = coords => ({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }] });
const routePosition = f => ROAD[0].map((n, i) => mix(n, ROAD[1][i], f));

export function createDemo(E, { mode = 'auto', root = document.body, Marker = null } = {}) {
  const map = E.state.map, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { running: true, paused: false, done: false, i: -1, elapsed: 0, duration: reduced ? 2200 : 7600, mode };
  const old = { mode: E.state.layer?.mode || 'parallel', camera: map ? { center: map.getCenter().toArray(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(), padding: map.getPadding() } : null };
  const record = E.state.urban?.intelligence?.work;
  const report = E.state.urban?.report;
  const hasRecord = record?.run?.tasks?.some(t => t.agent === A) && record?.run?.findings?.some(f => f.id === 'F8');
  const hasReport = report?.request?.segment === '5665000' && Array.isArray(report?.result?.rows) && report.result.rows.length >= 2;
  const el = document.createElement('section'); el.className = 'demo le-glass mission-demo'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', T('CORE mission demonstration', 'Démonstration de mission CORE')); root.append(el);
  const avatars = new Map();
  if (map && Marker) for (const agent of DEMO_AGENTS) {
    const node = document.createElement('div'); node.className = 'demo-avatar'; node.innerHTML = `<i aria-hidden="true"></i><b>${esc(agent.code)}</b>`; node.title = `${agent.code} · ${agent.role} · scripted visual reenactment`;
    const marker = new Marker({ element: node, anchor: 'bottom' }).setLngLat(ROAD[0]).addTo(map);
    avatars.set(agent.id, marker);
  }
  if (map?.getSource && !map.getSource('demo-route')) { map.addSource('demo-route', { type: 'geojson', data: F }); map.addLayer({ id: 'demo-route', type: 'line', source: 'demo-route', paint: { 'line-color': '#62d8f2', 'line-width': 4, 'line-opacity': .85, 'line-dasharray': [1, 1] } }); }
  const route = map?.getSource?.('demo-route');
  let frame = 0, last = 0, lastCamera = 0;
  function evidence() {
    if (!hasRecord) return `<p class="demo-unavailable">${T('Recorded agent evidence unavailable; this stage cannot verify a finding.', 'Preuves des agents indisponibles ; ce constat ne peut être vérifié.')}</p>`;
    const task = record.run.tasks.find(t => t.agent === A), other = record.run.tasks.find(t => t.agent === B);
    return `<div class="demo-exchange"><div><b>${esc(DEMO_AGENTS[0].code)}</b><small>${T('Evidence role · recorded task', 'Rôle preuve · tâche consignée')} ${esc(task?.status || 'unknown')}</small><span>${T('Validated source readiness', 'A vérifié la préparation des sources')} · <code>F4 / F5</code></span></div><span aria-hidden="true">⇢</span><div><b>${esc(DEMO_AGENTS[1].code)}</b><small>${T('Quantitative role · recorded task', 'Rôle quantitatif · tâche consignée')} ${esc(other?.status || 'unknown')}</small><span>${T('Mapped context and model', 'Contexte cartographié et modèle')} · <code>F6 / F7 / F8</code></span></div></div><p class="fine">${T('Scripted exchange of published finding references. Actual delegation and tool events: data/intelligence/work.json.', 'Échange scénarisé des références publiées. Délégations et outils réels : data/intelligence/work.json.')}</p>`;
  }
  function result() {
    if (!hasReport) return `<p class="demo-unavailable">${T('Verified model report unavailable; no comparison or recommendation is asserted.', 'Rapport du modèle vérifié indisponible ; aucune comparaison ni recommandation affirmée.')}</p>`;
    const rows = report.result.rows, best = rows[report.result.best];
    return `<div class="demo-results">${rows.map((r, i) => `<div${i === report.result.best ? ' class="best"' : ''}><b>${esc(r.name)}</b><span>${Number(r.metrics.accruedDelayPerArrivalS).toFixed(1)} s/${T('arrival', 'arrivée')}</span></div>`).join('')}</div><p class="fine">${T('Recorded deterministic model', 'Modèle déterministe consigné')} · ${esc(report.id)} · ${esc(best?.name || '')} ${T('has the lowest delay under these assumptions; not a real-world recommendation.', 'a le retard le plus faible avec ces hypothèses ; aucune recommandation réelle.')}</p>`;
  }
  function details(st) {
    if (['exchange', 'synthesize'].includes(st.id)) return evidence();
    if (['candidates', 'simulate', 'compare'].includes(st.id)) return result();
    if (st.id === 'problem' || st.id === 'investigate') return `<p class="fine">${T('Source', 'Source')}: ${esc(SF_MOBILITY.evidence[0].publisher)} · <a href="${esc(SF_MOBILITY.evidence[0].url)}" target="_blank" rel="noopener">${esc(SF_MOBILITY.evidence[0].id)}</a> · ${T('retrieved', 'récupéré')} ${esc(SF_MOBILITY.evidence[0].retrieved.slice(0, 10))}. ${T('Recorded investigation', 'Enquête consignée')}: <code>data/intelligence/work.json</code>.</p>`;
    if (st.id === 'report' || st.id === 'reality') return `<p class="fine">${T('Unresolved: traffic counts, signal plans, calibration, cross-street and pedestrian effects, independent scientific review. No real-world action authorized.', 'Non résolu : comptages, plans de feux, calibration, effets sur rues transversales et piétons, revue indépendante. Aucune action réelle autorisée.')}</p><a class="btn small" href="report.html#mission=${MOB}">${T('Open research dossier', 'Ouvrir le dossier de recherche')}</a>`;
    if (['introduce', 'depart', 'arrive'].includes(st.id)) return `<p class="fine">${esc(DEMO_AGENTS[0].code)} · ${T('evidence reviewer in recorded run', 'relecteur des preuves dans l’exécution consignée')} · ${T('destination', 'destination')}: Folsom St segment 5665000 · ${T('visual reenactment', 'reconstitution visuelle')}</p>`;
    return '';
  }
  function view() {
    const st = STAGES[state.i]; if (!st) return;
    el.innerHTML = `<div class="demo-top"><p class="le-eyebrow">${st.real ? T('REAL WORLD · MISSION HANDOFF', 'MONDE RÉEL · FIN DE LA MISSION') : T('PARALLEL WORLD · MISSION REENACTMENT', 'MONDE PARALLÈLE · RECONSTITUTION DE MISSION')} · ${state.i + 1}/${STAGES.length}</p><button type="button" class="ghost small" data-d="exit" aria-label="${T('Exit demonstration', 'Quitter la démonstration')}">✕</button></div><h2>${esc(TXT(st.title))}</h2><p class="demo-say">${esc(TXT(st.detail))}</p><p class="demo-subject">${T('Focus', 'Cible')}: ${esc(st.subject)}</p>${details(st)}<p class="demo-step-label">${T('Step', 'Étape')} ${state.i + 1} · <span data-step-pct>0%</span></p><div class="demo-stagebar" role="progressbar" aria-label="${T('Step progress', 'Progression de l’étape')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i data-stepbar></i></div><p class="demo-total-label">${T('Total demonstration progress', 'Progression totale')} · <span data-total-pct>0%</span></p><div class="demo-bar" role="progressbar" aria-label="${T('Total progress', 'Progression totale')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i data-totalbar></i></div><div class="le-row demo-ctl"><button type="button" class="small" data-d="prev" ${state.i === 0 ? 'disabled' : ''}>← ${T('Previous', 'Précédent')}</button><button type="button" class="small" data-d="pause">${state.paused ? T('Play', 'Lire') : T('Pause', 'Pause')}</button><button type="button" class="small" data-d="next" ${state.i === STAGES.length - 1 ? 'disabled' : ''}>${T('Next', 'Suivant')} →</button><button type="button" class="small" data-d="restart">${T('Restart', 'Recommencer')}</button><button type="button" class="ghost small" data-d="exit">${T('Exit', 'Quitter')}</button></div>`;
    render(progress(state.elapsed, state.duration), true);
  }
  function render(p, camera = false) {
    const st = STAGES[state.i]; if (!st) return;
    const total = (state.i + p) / STAGES.length;
    for (const [name, value] of [['step', p], ['total', total]]) { const bar = el.querySelector(`[data-${name}bar]`), label = el.querySelector(`[data-${name}-pct]`), outer = bar?.parentElement; if (bar) bar.style.width = `${Math.round(value * 1000) / 10}%`; if (label) label.textContent = `${Math.round(value * 100)}%`; outer?.setAttribute('aria-valuenow', String(Math.round(value * 100))); }
    const visible = !st.real && E.state.layer?.mode !== 'real' && state.i >= 2;
    for (const [id, marker] of avatars) { const show = visible && (id === A || st.pair); marker.getElement().hidden = !show; }
    const fraction = st.travel ? mix(st.travel[0], st.travel[1], p * p * (3 - 2 * p)) : state.i < 3 ? 0 : 1;
    // Both avatars meet at the mapped approach; a screen offset keeps their figures and codes legible side by side.
    avatars.get(A)?.setLngLat(routePosition(fraction)).setOffset(st.pair ? [-52, 0] : [0, 0]); avatars.get(B)?.setLngLat(ROAD[1]).setOffset(st.pair ? [52, 0] : [0, 0]);
    if (route) route.setData(visible && st.travel ? line(ROAD) : F);
    if (camera && map?.jumpTo && (performance.now() - lastCamera > 32 || p === 0 || p === 1)) {
      lastCamera = performance.now(); const c = reduced ? st.to : cameraAt(st, p); const mobile = innerWidth < 861;
      // Phones: frame the target in the strip of map left between the header controls and the caption.
      const top = Math.round(Math.min(innerHeight * 0.34, 300)), bottom = Math.max(0, Math.min(innerHeight - top - 80, Math.round(innerHeight - el.getBoundingClientRect().top)));
      try { map.jumpTo({ ...c, padding: mobile ? { top, bottom, left: 0, right: 0 } : { top: 0, bottom: 0, left: 320, right: document.getElementById('ea-panel')?.hidden ? 0 : 440 } }); } catch { /* Map unavailable: caption remains usable. */ }
    }
  }
  // Each stage gets a token: panels that resolve after the user has moved on are discarded, never shown.
  let token = 0;
  const simOn = () => E.state.scn?.state?.on;
  function scene(st) {
    const mine = ++token;
    E.revealMap(); E.setLayer(st.real ? 'real' : 'parallel', { intro: false });
    if (st.panel !== 'simulation' && simOn()) E.hideSimulation({ quiet: true });
    // Phones show one sheet only: the caption carries the evidence summary and dossier link; the side sheet stays closed.
    const panel = document.getElementById('ea-panel'), compact = innerWidth < 861;
    if (panel) panel.hidden = compact || st.panel === 'none';
    if (compact && st.panel !== 'simulation') return;
    const actions = {
      agent: () => hasRecord && E.showAgent(A), mission: () => E.showMission(MOB), team: () => hasRecord && E.showTeam(MOB),
      investigation: () => hasRecord && E.state.urban?.investigations(), workbench: () => E.state.urban?.open(),
      simulation: () => E.showSimulation('S0', { camera: false }).then(() => { if (mine === token && state.running) { if (compact && panel) panel.hidden = true; return; } if (state.running) scene(STAGES[state.i]); else if (simOn()) E.hideSimulation({ quiet: true }); }),
      results: () => E.state.urban?.results(), report: () => E.showMission(MOB)
    };
    try { Promise.resolve(actions[st.panel]?.()).catch(e => console.warn('demo panel unavailable', e)); } catch (e) { console.warn('demo panel unavailable', e); }
  }
  function tick(now) {
    if (!state.running || state.paused) return;
    const p = advanceTimeline(state, last ? now - last : 0); last = now; render(p, true);
    if (p === 1) { state.done = state.i === STAGES.length - 1; if (state.mode === 'auto' && !state.done) return go(state.i + 1); return; }
    frame = requestAnimationFrame(tick);
  }
  function go(i) {
    cancelAnimationFrame(frame); state.i = Math.max(0, Math.min(STAGES.length - 1, i)); state.elapsed = 0; state.done = false; state.paused = false; last = 0; lastCamera = 0;
    scene(STAGES[state.i]); view(); frame = requestAnimationFrame(tick);
  }
  function pause() { if (state.paused || !state.running) return; state.paused = true; cancelAnimationFrame(frame); last = 0; view(); }
  function resume() { if (!state.paused || !state.running) return; state.paused = false; last = 0; view(); frame = requestAnimationFrame(tick); }
  function exit() {
    if (!state.running) return; state.running = false; cancelAnimationFrame(frame); route?.setData(F);
    for (const marker of avatars.values()) marker.remove(); if (map?.getLayer?.('demo-route')) map.removeLayer('demo-route'); if (map?.getSource?.('demo-route')) map.removeSource('demo-route');
    if (simOn()) E.hideSimulation({ quiet: true }); token++; E.setLayer(old.mode, { intro: false }); if (old.camera) map?.jumpTo(old.camera);
    document.getElementById('ea-panel')?.setAttribute('hidden', ''); el.remove(); removeEventListener('keydown', keys, true); map?.getCanvas?.().removeEventListener('pointerdown', pause);
  }
  function keys(e) { if (!state.running || e.target.closest?.('input, textarea, select, button, a')) return; if (e.key === 'Escape') { e.preventDefault(); exit(); } else if (e.key === ' ') { e.preventDefault(); state.paused ? resume() : pause(); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(state.i + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(state.i - 1); } }
  el.addEventListener('click', e => { const d = e.target.closest('[data-d]')?.dataset.d; if (d === 'next') go(state.i + 1); else if (d === 'prev') go(state.i - 1); else if (d === 'pause') state.paused ? resume() : pause(); else if (d === 'restart') go(0); else if (d === 'exit') exit(); });
  addEventListener('keydown', keys, true); map?.getCanvas?.().addEventListener('pointerdown', pause);
  return { state, stages: STAGES, start: () => go(0), next: () => go(state.i + 1), prev: () => go(state.i - 1), pause, resume, restart: () => go(0), exit, relabel: view };
}
