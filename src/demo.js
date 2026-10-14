// CORE — investor demonstration (Phase 6, rebuilt in Phase 9 around a recorded autonomous mission). Eight visual steps, each with a camera move, one takeaway, optional
// details and a real component opened. Every number shown is read from the loaded data or recomputed
// (recorded missions are labelled recorded; the simulation runs in the browser). Replaces the earlier guides.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { i: -1, facts: null };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fly = (v, ms = 4500) => { const map = G.__CORE_MAP; map.stop(); map.flyTo({ ...v, padding: G.CORE_LAYOUT ? G.CORE_LAYOUT.padding() : undefined, duration: reduced() ? 0 : ms, essential: true }); };

  // Facts for the narrative, computed from real loaded data (no hard-coded results). Phase 9: the flagship is the
  // highest-priority RECORDED autonomous mission (data/civ), replayed — never presented as live.
  async function facts() {
    if (S.facts) return S.facts;
    const P = G.CORE_PLATFORM.state, sv = G.CORE_SF_VIEW; await sv.loadData(); if (P.opsReady) await P.opsReady;
    const A = G.CORE_ACTIVITY; await A.load(); const ix = P.civIndex ? P.civIndex.missions : [];
    const top = ix.slice().sort((a, b) => (b.priority ? b.priority.score : 0) - (a.priority ? a.priority.score : 0))[0], m = top && A.state.missions.find(x => x.id === top.id);
    const counts = G.CORE_ORG.counts(P.registry), code = id => (P.registry.agents.find(a => a.id === id) || { code: id }).code;
    S.facts = { m, counts, code, missions: ix.length, nhoods: P.civIndex ? P.civIndex.study_area.neighborhoods : [], datasets: sv.state.manifest.datasets.length };
    return S.facts;
  }
  const site = f => f.m && f.m.site ? { center: f.m.site.coord, zoom: 16.2, pitch: 58, bearing: -30 } : { center: [-122.413, 37.775], zoom: 14, pitch: 50, bearing: -30 };
  const STEPS = [
    { t: 'La Terre', take: () => 'CORE vise un double numérique de la Terre où des agents spécialisés étudient de vrais problèmes ; aujourd’hui, une ville pilote est opérationnelle : San Francisco.',
      more: () => 'Paris et Tokyo sont des destinations de navigation sans données ni agents. Aucune surveillance planétaire n’est revendiquée.',
      run: () => { G.CORE_PLATFORM.show('world'); const z = Math.max(0.9, Math.min(2.6, Math.log2(Math.min(innerWidth, innerHeight - 52) * 0.42 * 2 * Math.PI / 512))); fly({ center: [-110, 32], zoom: z, pitch: 0, bearing: 0 }, 3500); } },
    { t: 'Le pilote', take: f => `San Francisco : ${f.nhoods.join(', ')} et le corridor Folsom / Howard, à partir de données publiques DataSF et OpenStreetMap ; ${f.counts.registered} profils d’agents, dont ${f.counts.executable + f.counts.llm} exécutables.`,
      more: () => 'Les agents restent à leur poste virtuel tant qu’aucune mission enregistrée ou en cours ne leur donne une raison de se déplacer.',
      run: () => { G.CORE_PLATFORM.show('world'); fly({ center: [-122.415, 37.772], zoom: 13, pitch: 50, bearing: -20 }, 6000); } },
    { t: 'Un problème réel', take: f => f.m ? `${f.m.title} — ${f.m.nhood} : ${(f.m.findings.find(x => x.topic === 'cross') || f.m.findings[0]).claim}` : 'Aucune mission autonome enregistrée.',
      more: f => f.m ? `Sources : accidents avec blessés agrégés (5 ans), réseau HIN 2024, permis de voirie ; zone d’inondation modélisée selon la mission. Lieu cité : ${f.m.site ? f.m.site.label : '—'}.` : '',
      run: async () => { const f = await facts(); G.CORE_PLATFORM.show('world'); fly(site(f), 4500); } },
    { t: 'Un responsable assemble son équipe', take: f => f.m ? `${f.code(f.m.owner)} (direction ${f.m.owner.split('.')[2]}) reçoit la mission de la coordination et délègue ${f.m.subtasks.length} sous-tâches bornées, dont ${f.m.subtasks.filter(s => s.via).length} via d’autres directions.` : '',
      more: f => f.m ? `Chaîne : ${f.code('core.global.coordinator')} (priorité) → ${f.code('core.san-francisco.manager')} (affectation) → ${f.code(f.m.owner)} → spécialistes ; ${f.m.messages.length} échanges enregistrés.` : '',
      run: async () => { const f = await facts(); if (f.m && G.CORE_MOTION) { await G.CORE_MOTION.ensure(); G.CORE_AGENT_PROFILE.open(f.m.owner, 'org'); } } },
    { t: 'Les agents enquêtent (relecture)', take: f => f.m ? `Relecture de l’exécution enregistrée le ${String(f.m.recorded.at).slice(0, 10)} : les spécialistes se rendent, sur les trottoirs cartographiés, au lieu des preuves que leurs outils utilisent, puis rendent compte.` : '',
      more: () => 'Ce n’est pas une exécution en direct ni une inspection physique ; l’ordre des échanges est celui du journal, le rythme est accéléré.',
      run: async () => { const f = await facts(); G.CORE_AGENT_PROFILE.close(); fly(site(f), 2500); if (f.m) G.CORE_ACTIVITY.playOnly(f.m.id); } },
    { t: 'Preuves et contestations', take: f => f.m ? `${f.m.findings.length} constats acceptés par la revue adversariale, ${f.m.rejected.length} rejeté(s) ; ${f.m.challenges.filter(c => c.level === 'warn').length} réserve(s) de fraîcheur des données ; ${f.m.model.rejected.length} énoncé(s) du modèle rejeté(s) par le validateur.` : '',
      more: f => f.m ? f.m.challenges.map(c => c.text).join(' ') : '',
      run: () => { } },
    { t: 'Une recommandation, avec ses limites', take: f => f.m && f.m.recommendation ? `${f.m.recommendation.kind} : ${f.m.recommendation.text}` : 'Aucune recommandation.',
      more: f => f.m ? Object.values(f.m.results).flatMap(r => r.assumptions || []).join(' ') : '',
      run: () => { } },
    { t: 'La revue humaine', take: f => f.m ? `Passerelle : « ${f.m.decision.state} ». ${f.m.human ? `Décision humaine : ${f.m.human.decision} par ${f.m.human.reviewer}.` : 'Aucune décision humaine n’a encore été prise : la mission attend la revue du propriétaire.'}` : '',
      more: () => 'Réel : données publiques, calculs déterministes, échanges et décisions de passerelle enregistrés. Assisté par modèle (local, enregistré) : interprétations validées. Non réel : aucune action sur la ville, aucune autorisation. Le dossier de preuves est téléchargeable.',
      run: async () => { const f = await facts(); if (f.m) G.CORE_ACTIVITY.dossier(f.m); } },
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
