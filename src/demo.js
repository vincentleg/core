// CORE — investor demonstration 2.0 (Phase 6). Nine visual steps, each with a camera move, one takeaway, optional
// details and a real component opened. Every number shown is read from the loaded data or recomputed
// (recorded missions are labelled recorded; the simulation runs in the browser). Replaces the earlier guides.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { i: -1, facts: null };
  const PLANNING = m => m.mode === 'fast' && /cheminement/.test(m.question);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fly = (v, ms = 4500) => { const map = G.__CORE_MAP; map.stop(); map.flyTo({ ...v, padding: G.CORE_LAYOUT ? G.CORE_LAYOUT.padding() : undefined, duration: reduced() ? 0 : ms, essential: true }); };

  // Facts for the narrative, computed from real loaded data (no hard-coded results).
  async function facts() {
    if (S.facts) return S.facts;
    const P = G.CORE_PLATFORM.state, sv = G.CORE_SF_VIEW; await sv.loadData();
    const ctx = G.CORE_COORD.buildContext({ manifest: sv.state.manifest, data: sv.state.data, verified: sv.state.verified });
    const sim = G.CORE_SIM_SIDEWALK.run(ctx), sens = G.CORE_SIM_SIDEWALK.sensitivity(ctx), alt = Object.fromEntries(G.CORE_SIM_SIDEWALK.alternatives(ctx).map(a => [a.id, a.totals]));
    const pm = P.cogIndex && P.cogIndex.missions.find(PLANNING), rec = pm ? await G.CORE_PLATFORM.loadRecorded(PLANNING) : null;
    const counts = G.CORE_ORG.counts(P.registry), sp = sens.params.find(x => x.param === 'spacingFt'), us = sens.params.find(x => x.param === 'usableFrontageShare');
    S.facts = { ctx, sim, alt, rec, pm, counts, records: Object.values(sv.state.data).reduce((n, fc) => n + (fc.features ? fc.features.length : 0), 0), datasets: sv.state.manifest.datasets.length, snapshot: ctx.asOf,
      range: [Math.min(...sp.additional, ...us.additional), Math.max(...sp.additional, ...us.additional)], feed: P.store.items.length };
    return S.facts;
  }

  const STEPS = [
    { t: 'Le monde', take: f => 'CORE vise un double numérique de la Terre ; aujourd’hui, une ville pilote est opérationnelle : San Francisco.',
      more: () => 'Paris et Tokyo sont des destinations de navigation sans données ni agents. Aucune surveillance planétaire n’est revendiquée.',
      run: () => { G.CORE_PLATFORM.show('world'); const z = Math.max(0.9, Math.min(2.6, Math.log2(Math.min(innerWidth, innerHeight - 52) * 0.42 * 2 * Math.PI / 512))); fly({ center: [-110, 32], zoom: z, pitch: 0, bearing: 0 }, 3500); } },
    { t: 'La ville', take: f => `San Francisco : ${f.datasets} jeux de données publics DataSF (${f.records} enregistrements, instantané du ${f.snapshot}) sur une ville 3D OpenStreetMap.`,
      more: () => 'Bâtiments : géométrie et hauteurs OSM (8 m si absentes). Golden Gate, Salesforce Tower et Transamerica : modèles procéduraux étiquetés approximatifs.',
      run: () => { G.CORE_PLATFORM.show('world'); fly({ center: [-122.418, 37.785], zoom: 12.6, pitch: 55, bearing: -20 }, 6000); } },
    { t: 'Le problème', take: () => 'Sur le corridor Folsom / Howard, des travaux d’excavation, des arbres et des trottoirs étroits se partagent la même rue.',
      more: () => 'Densité de registres par tronçon (zoom intermédiaire), puis registres individuels en se rapprochant. Un permis n’est pas la preuve que des travaux ont lieu.',
      run: () => { G.CORE_PLATFORM.show('world'); fly({ center: [-122.4065, 37.7795], zoom: 14.2, pitch: 58, bearing: -40 }, 4500); } },
    { t: 'Les agents', take: f => f.pm ? `${f.pm.agents.length} agents choisis par routage pour la question « arbres et accessibilité » — exécution réelle du modèle local, enregistrée (${Math.round(f.pm.metrics.wallMs / 1000)} s, ${f.pm.metrics.modelCalls} appels).` : 'Aucune mission enregistrée disponible.',
      more: f => `Organisation : ${f.counts.registered} profils, dont ${f.counts.executable} agents à règles et ${f.counts.llm} assistés par modèle (local). Le fil d’exécution ne montre que des évènements réels du journal.`,
      run: () => G.CORE_PLATFORM.openRecorded(PLANNING) },
    { t: 'La découverte', take: f => `${f.sim.totals.below_bsp_min} des ${f.sim.totals.blocks} tronçons (tous sur Folsom) ont un trottoir plus étroit que le minimum de leur classe Better Streets Plan (étude 2014).`,
      more: () => 'Croisement de trois sources publiques : largeurs de trottoir 2014, inventaire des arbres, permis de voirie. Observé, mais daté : un relevé actuel est nécessaire.',
      run: () => { G.CORE_PLATFORM.state.simCompare = 'none'; G.CORE_PLATFORM.show('sims'); fly({ center: [-122.4045, 37.7805], zoom: 15, pitch: 50, bearing: -44 }, 4000); } },
    { t: 'Les preuves', take: () => 'Chaque chiffre renvoie à un enregistrement public daté ; l’intégrité des fichiers est vérifiée, ce qui ne prouve pas leur exactitude.',
      more: () => 'Dates distinguées : collecte par CORE, publication par la source, dates administratives et dates prévues des permis. Politique d’éligibilité appliquée (une source en quarantaine).',
      run: () => G.CORE_PLATFORM.show('data') },
    { t: 'Les alternatives', take: f => `Modèle exploratoire exécuté ici : ${f.alt.A3.plantable_now} emplacements plantables maintenant (report des travaux) ; des fosses de 5 ft avec un cheminement de 6 ft n’en laissent que ${f.alt.A2.plantable_now}.`,
      more: () => 'Carte en mode différence : vert = plus d’emplacements que l’alternative, rouge = moins. Comptes par tronçon, pas de position d’arbre. Aucun bénéfice (carbone, chaleur) n’est calculé.',
      run: () => { G.CORE_PLATFORM.state.simCompare = 'A2'; G.CORE_PLATFORM.show('sims'); fly({ center: [-122.4065, 37.7795], zoom: 14.8, pitch: 50, bearing: -44 }, 3000); } },
    { t: 'La remise en question', take: f => f.rec ? `${f.rec.disagreements.length} désaccords entre agents et ${f.rec.rejected.length} sorties du modèle rejetées par le validateur ; selon deux hypothèses, la capacité varie de ${f.range[0]} à ${f.range[1]} emplacements.` : 'Sensibilité et rejets visibles dans la mission.',
      more: () => 'Le validateur vérifie citations, nombres, unités, portée, dates, lieux et causalité. Il ne garantit pas tout le sens : la revue humaine reste obligatoire.',
      run: () => G.CORE_PLATFORM.openRecorded(PLANNING) },
    { t: 'La décision', take: f => f.rec ? `Passerelle : « ${f.rec.decision.state} » — CORE recommande d’obtenir les preuves manquantes (relevé de terrain, réseaux) avant toute plantation. Aucune autorisation.` : 'Revue humaine obligatoire.',
      more: () => 'Ce qui est réel : données publiques, calculs déterministes, exécutions enregistrées du modèle. Simulé : le scénario exploratoire. Indisponible ici : le modèle en direct (Ollama local). La décision appartient aux humains.',
      run: async () => { const f = await facts(); fly({ center: [-122.4065, 37.7795], zoom: 14.4, pitch: 50, bearing: -40 }, 3500); if (f.rec) G.CORE_PLATFORM.openDossier(f.rec); } },
  ];

  function card() {
    let el = $('demo2');
    if (!el) { el = document.createElement('section'); el.id = 'demo2'; el.className = 'panel demo2'; el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-label', 'Démonstration guidée'); document.body.appendChild(el); }
    return el;
  }
  // Rapid navigation: a step superseded by a newer one stops rendering; errors never escape as unhandled rejections.
  async function go(i) { const token = (S.token = (S.token || 0) + 1); try { await render(i, token); } catch (e) { console.warn('démo', e); } }
  async function render(i, token) {
    S.i = Math.max(0, Math.min(STEPS.length - 1, i)); const s = STEPS[S.i], f = await facts(); if (token !== S.token) return; const el = card();
    document.body.classList.add('demo-on'); el.hidden = false;
    el.innerHTML = `<div class="d2-top"><span class="d2-n">${S.i + 1} / ${STEPS.length}</span><b>${esc(s.t)}</b><button type="button" class="ghost small" id="d2-exit" aria-label="Quitter la démonstration">Quitter</button></div>
      <p class="d2-take">${esc(s.take(f))}</p><details><summary>En savoir plus</summary><p class="hint">${esc(s.more(f))}</p></details>
      <div class="d2-nav"><button type="button" class="ghost small" id="d2-prev" ${S.i === 0 ? 'disabled' : ''}>← Précédent</button><span class="d2-dots">${STEPS.map((_, k) => `<i class="${k === S.i ? 'on' : ''}"></i>`).join('')}</span><button type="button" class="small" id="d2-next">${S.i === STEPS.length - 1 ? 'Terminer' : 'Suivant →'}</button></div>`;
    $('d2-prev').onclick = () => go(S.i - 1); $('d2-next').onclick = () => (S.i === STEPS.length - 1 ? stop() : go(S.i + 1)); $('d2-exit').onclick = stop;
    try { await s.run(f); } catch (e) { console.warn('demo step', e); }
    if (token === S.token && $('d2-next')) $('d2-next').focus({ preventScroll: true });
  }
  function stop() { const el = $('demo2'); if (el) el.hidden = true; document.body.classList.remove('demo-on'); S.i = -1; }
  function init() {
    // Replace the earlier guides: re-bind the dock button (cloning drops the old listener).
    const old = $('demo-guided'); if (old) { const b = old.cloneNode(true); old.replaceWith(b); b.addEventListener('click', () => go(0)); }
    document.addEventListener('keydown', e => { if (S.i < 0 || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'Escape') stop(); else if (e.key === 'ArrowRight') go(S.i + 1); else if (e.key === 'ArrowLeft') go(S.i - 1); });
  }
  G.CORE_DEMO = { init, go, stop, STEPS, state: S, facts };
})();
