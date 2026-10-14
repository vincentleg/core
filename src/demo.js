// CORE — investor demonstration (Phase 6, rebuilt in Phase 9, extended in Phase 10 to two cities). Nine visual steps, each with a camera move, one takeaway, optional
// details and a real component opened. Every number shown is read from the loaded data or recomputed
// (recorded missions are labelled recorded; the simulation runs in the browser). Replaces the earlier guides.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { i: -1, facts: null };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fly = (v, ms = 4500) => { const map = G.__CORE_MAP; map.stop(); map.flyTo({ ...v, padding: G.CORE_LAYOUT ? G.CORE_LAYOUT.padding() : undefined, duration: reduced() ? 0 : ms, essential: true }); };

  // Facts for the narrative, computed from real loaded data (no hard-coded results). Phase 10: nine steps across the
  // two operational cities, each on a RECORDED mission (data/civ) — replayed, never presented as live.
  async function facts() {
    if (S.facts) return S.facts;
    const P = G.CORE_PLATFORM.state, sv = G.CORE_SF_VIEW; await sv.loadData(); if (P.opsReady) await P.opsReady;
    const A = G.CORE_ACTIVITY; await A.load(); const ix = P.civIndex ? P.civIndex.missions : [], get = e => e && A.state.missions.find(x => x.id === e.id);
    const ny = ix.filter(e => e.city === 'new-york').sort((a, b) => (b.priority ? b.priority.score : 0) - (a.priority ? a.priority.score : 0))[0];
    const counts = G.CORE_ORG.counts(P.registry), code = id => (P.registry.agents.find(a => a.id === id) || { code: id }).code;
    let mem = null; try { mem = await G.CORE_PLATFORM.getJSON('data/memory/export.json'); } catch (_) { /* optional */ }
    let disc = null; try { disc = await G.CORE_PLATFORM.getJSON('data/civ/discovery.json'); } catch (_) { /* optional */ }
    const C = G.CORE_CITIES, ops = C ? C.operational() : [];
    S.facts = { m: get(ny), w: get(ix.find(e => e.scope === 'world')), d: get(ix.find(e => e.workflow === 'decision-safety-works')), counts, code, missions: ix.length, cities: ops, mem, disc,
      cityAgents: id => P.registry.agents.filter(a => a.scope.city === id).length, human: ix.filter(e => e.human).length };
    return S.facts;
  }
  const site = (m, z = 16.2) => m && m.site ? { center: m.site.coord, zoom: z, pitch: 58, bearing: 29 } : { center: [-73.986, 40.7195], zoom: 14.3, pitch: 55, bearing: 29 };
  const nyView = { center: [-73.9860, 40.7195], zoom: 14.2, pitch: 55, bearing: 29 };
  const STEPS = [
    { t: 'La Terre', take: f => `CORE vise un double numérique de la Terre où des agents spécialisés étudient de vrais problèmes ; aujourd’hui, ${f.cities.length} villes sont opérationnelles : ${f.cities.map(c => c.name).join(' et ')}.`,
      more: () => 'Paris et Tokyo sont des destinations de navigation sans données ni agents. Aucune surveillance planétaire n’est revendiquée : deux zones d’étude, des données publiques datées.',
      run: () => { G.CORE_PLATFORM.show('world'); const z = Math.max(0.9, Math.min(2.6, Math.log2(Math.min(innerWidth, innerHeight - 52) * 0.42 * 2 * Math.PI / 512))); fly({ center: [-98, 36], zoom: z, pitch: 0, bearing: 0 }, 3500); } },
    { t: 'Deux villes', take: f => `${f.cities.map(c => `${c.name} : ${c.studyArea.neighborhoods.join(', ')} (${f.cityAgents(c.id)} profils d’agents)`).join(' · ')}. ${f.counts.registered} profils au total, dont ${f.counts.executable + f.counts.llm} exécutables.`,
      more: f => `${f.cities.map(c => `${c.name} : ${c.portal.licence.split(':')[0]}`).join(' · ')}. Chaque ville déclare ce qui n’est pas intégré (New York : ${(f.cities.find(c => c.id === 'new-york') || { unavailable: [] }).unavailable.join(', ')}).`,
      run: () => { G.CORE_PLATFORM.show('world'); fly(nyView, 6000); } },
    { t: 'Un problème détecté', take: f => f.m ? `Découvert automatiquement dans l’instantané de ${f.m.nhood} (New York) : ${(f.m.findings.find(x => x.topic === 'cross') || f.m.findings[0]).claim}` : 'Aucune mission enregistrée à New York.',
      more: f => `La découverte balaie chaque type de mission × quartier sur les données publiées ; le planificateur persistant compare aussi les instantanés successifs${f.disc ? ` (dernière comparaison : ${f.disc.diffs.map(x => `${x.city} ${x.signals} signal(s)`).join(', ')})` : ''}. Un signal est une hypothèse de tri, pas un constat.`,
      run: async () => { const f = await facts(); G.CORE_PLATFORM.show('world'); fly(site(f.m, 15.6), 4500); } },
    { t: 'Une hiérarchie qui délègue', take: f => f.m ? `${f.code('core.new-york.manager')} (coordination New York) confie la mission à ${f.code(f.m.owner)}, qui délègue ${f.m.subtasks.length} sous-tâches bornées, dont ${f.m.subtasks.filter(s => s.via).length} via d’autres directions.` : '',
      more: f => f.m ? `Chaîne enregistrée : ${f.code('core.global.coordinator')} (priorité) → ${f.code('core.new-york.manager')} → ${f.code(f.m.owner)} → spécialistes ${[...new Set(f.m.subtasks.map(s => s.code))].join(', ')} ; ${f.m.messages.length} échanges. Aucun agent de San Francisco n’exécute de travail new-yorkais.` : '',
      run: async () => { const f = await facts(); if (f.m && G.CORE_MOTION) { await G.CORE_MOTION.ensure(); G.CORE_AGENT_PROFILE.open(f.m.owner, 'org'); } } },
    { t: 'L’enquête (relecture)', take: f => f.m ? `Relecture de l’exécution enregistrée le ${String(f.m.recorded.at).slice(0, 10)} : les spécialistes new-yorkais rejoignent, sur les trottoirs cartographiés de Manhattan, le lieu des preuves, puis rendent compte ; ${f.m.findings.length} constats acceptés, ${f.m.rejected.length} rejeté(s).` : '',
      more: f => f.m ? `Ce n’est pas une exécution en direct ni une inspection physique ; l’ordre des échanges est celui du journal, le rythme est accéléré. Réserves de fraîcheur : ${f.m.challenges.map(c => c.text).join(' ')}` : '',
      run: async () => { const f = await facts(); G.CORE_AGENT_PROFILE.close(); fly(site(f.m), 2500); if (f.m) G.CORE_ACTIVITY.playOnly(f.m.id); } },
    { t: 'Collaboration entre villes', take: f => f.w ? `La direction mondiale ${f.code(f.w.owner)} pose la même question aux deux villes ; avant toute comparaison, le réviseur méthodologique ${f.code('core.global.research.methodology-reviewer')} déclare ${f.w.comparability.filter(c => /^non comparable/.test(c.verdict)).length} indicateurs non comparables sur ${f.w.comparability.length}.` : 'Aucune enquête inter-villes enregistrée.',
      more: f => f.w ? f.w.comparability.map(c => `${c.metric} : ${c.verdict}`).join(' · ') + '. Aucune ville n’est jugée plus ou moins sûre.' : '',
      run: async () => { const f = await facts(); G.CORE_PLATFORM.show('world'); const z = Math.max(2.4, Math.min(3.6, Math.log2(innerWidth / 512) + 2.2)); fly({ center: [-98, 39], zoom: z, pitch: 20, bearing: 0 }, 3000); if (f.w) { G.CORE_ACTIVITY.state.follow = false; await G.CORE_ACTIVITY.playOnly(f.w.id); G.CORE_ACTIVITY.state.follow = true; } } },
    { t: 'Une mémoire qui sert', take: f => f.w ? `La direction mondiale a d’abord relu la mémoire institutionnelle : ${f.w.memoryReused.length} constats déjà vérifiés et revus dans les deux villes ont été réutilisés comme point de départ, avec leur statut.` : '',
      more: f => `Règles : vérification des preuves puis revue par un autre agent ; un constat sur le monde n’est approuvé que par un humain ; un instantané plus récent remplace (sans effacer) les constats anciens et signale les valeurs changées.${f.mem ? ` Mémoire publiée : ${f.mem.institutional.length} entrées, chaîne SHA-256 ${f.mem.chain.ok ? 'intacte' : 'rompue'}.` : ''}`,
      run: async () => { G.CORE_PLATFORM.show('cities'); } },
    { t: 'Aide à la décision', take: f => f.d && f.d.decisionAnalysis ? `${f.d.nhood} : ${f.d.decisionAnalysis.options.length - 1} interventions comparées au statu quo — ${f.d.decisionAnalysis.options.slice(1).map(o => `${o.id} ${o.coveredShare !== undefined ? `couvre ${Math.round(o.coveredShare * 100)} %` : `${Math.round(o.change * 100)} %`}`).join(', ')} d’un indice d’exposition exploratoire ; ${f.d.decisionAnalysis.sensitivity.length} combinaisons de sensibilité.` : 'Aucune analyse enregistrée.',
      more: f => f.d && f.d.recommendation ? `${f.d.recommendation.text} Qualité des preuves : ${f.d.decisionAnalysis.quality.map(q => `${q.source} ${q.grade}`).join(', ')}.` : '',
      run: async () => { const f = await facts(); G.CORE_PLATFORM.show('cities'); setTimeout(() => { const h = [...document.querySelectorAll('#ws-body h3')].find(x => /Aide à la décision/.test(x.textContent)); if (h) h.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); }, 600); void f; } },
    { t: 'La supervision humaine', take: f => `Toutes les missions s’arrêtent à la revue humaine : ${f.missions} enregistrées. ${f.human ? `${f.human} décision(s) humaine(s) enregistrée(s).` : 'Aucune décision humaine n’a encore été prise : les missions attendent la revue du propriétaire.'} Passerelle de la comparaison inter-villes : « ${f.w && f.w.decision ? f.w.decision.state : '—'} » ; les passerelles n’autorisent rien et un arrêt d’urgence stoppe tout travail.`,
      more: () => 'Réel : données publiques, calculs déterministes, échanges et décisions de passerelle enregistrés. Non réel : aucune action sur une ville, aucune autorisation. Le centre de contrôle local (127.0.0.1, jeton) permet d’approuver, rejeter ou demander des preuves. Le dossier de preuves est téléchargeable.',
      run: async () => { const f = await facts(); G.CORE_PLATFORM.show('world'); if (f.w) G.CORE_ACTIVITY.dossier(f.w); } },
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
