// CORE — cross-city investigations (Phase 10). A global domain director delegates the same question to the department
// leads of two operational cities; their specialists run the city tools on each city's own verified snapshot; an
// independent methodology reviewer states what is comparable and what is not BEFORE any comparison is reported; the
// adversarial rules review every finding; the result goes to a human. Verified institutional memory (findings already
// verified and reviewed in each city) is read first and cited. Missions are checkpointed in the same SQLite memory as
// city missions, so they survive a restart. Nothing here has authority over any city.
(function (root) {
  'use strict';
  const ORG = typeof require === 'function' ? require('./org.js') : root.CORE_ORG;
  const CT = typeof require === 'function' ? require('./civ-tools.js') : root.CORE_CIV_TOOLS;
  const CITIES = typeof require === 'function' ? require('./cities.js') : root.CORE_CITIES;
  const DIRECTOR = 'core.global.director.road-safety', METHOD = 'core.global.research.methodology-reviewer', EXEC = 'core.global.coordinator';
  const STAGES = ['DISCOVERED', 'ASSIGNED', 'MEMORY_CONSULTED', 'INVESTIGATING', 'METHODOLOGY_REVIEW', 'EVIDENCE_VALIDATION', 'PROPOSED_DECISION', 'HUMAN_REVIEW'];
  const YEARS = 5, DAY = 864e5, d = s => Math.floor(Date.parse(s) / DAY);

  // Methodology reviewer's tool: per-metric comparability verdict, from each city's declared definitions and data.
  function comparability(parts) {
    const [a, b] = parts, w = p => p.cx.data['crashes-agg'].window, ov = (() => { const s = Math.max(d(w(a).from), d(w(b).from)), e = Math.min(d(w(a).to), d(w(b).to)), len = Math.max(d(w(a).to) - d(w(a).from), d(w(b).to) - d(w(b).from)); return len > 0 ? Math.max(0, e - s) / len : 0; })();
    const sevA = new Set(a.cx.data['crashes-agg'].rows.map(r => r.severity)), sevB = new Set(b.cx.data['crashes-agg'].rows.map(r => r.severity)), classes = s => [...s].filter(x => !/Fatal/.test(x));
    const graded = p => classes(p === a ? sevA : sevB).some(x => /Severe/.test(x));
    return [
      { metric: 'Accidents ou collisions avec au moins un blessé ou tué (5 ans)', verdict: 'comparable avec réserves', why: `Les deux sources sont des déclarations de police ; systèmes et seuils de déclaration différents (${a.cfg.labels.crashes} ; ${b.cfg.labels.crashes}).` },
      { metric: 'Accidents ou collisions mortels', verdict: 'comparable avec réserves', why: 'Définition proche (au moins une personne tuée) ; effectifs très faibles, donc très incertains.' },
      { metric: 'Accidents graves (blessés graves)', verdict: graded(a) && graded(b) ? 'comparable avec réserves' : 'non comparable', why: `Classes de gravité : ${a.cfg.name} ${classes(sevA).join(' / ') || 'aucune'} ; ${b.cfg.name} ${classes(sevB).join(' / ') || 'aucune'}.` },
      { metric: 'Réseau désigné et taux par km', verdict: 'non comparable (descriptif seulement)', why: `Désignations administratives de méthodes différentes (${a.cfg.labels.hin} ; ${b.cfg.labels.hin}) et de granularité différente : un taux par km décrit chaque réseau, il ne compare pas le risque des villes.` },
      { metric: 'Rattachement d’un accident à un tronçon', verdict: 'non comparable sans recalcul', why: `${a.cx.L.assignment} / ${b.cx.L.assignment}` },
      { metric: 'Travaux', verdict: 'non comparable', why: `${a.cfg.labels.works} contre ${b.cfg.labels.works} : objets administratifs différents.` },
      { metric: 'Période couverte', verdict: ov >= 0.9 ? 'comparable' : 'comparable avec réserves', why: `${a.cfg.name} ${w(a).from} → ${w(a).to} ; ${b.cfg.name} ${w(b).from} → ${w(b).to} (recouvrement ${Math.round(ov * 100)} %).` },
    ];
  }
  const TOOLS = { 'comparability.review': { permission: 'review' } };

  function createWorld({ registry = ORG.buildWorld(), cxs, memory = null, clock = () => new Date().toISOString(), onEvent = null }) {
    const idx = ORG.index(registry), byId = id => idx.byId.get(id); let stopped = false;
    const now = () => clock();
    const emit = (m, kind, data) => { if (onEvent) onEvent({ mission: m.id, kind, at: now(), state: m.state, data }); };
    const msg = (m, from, to, type, purpose, evidence = [], outcome = null) => { const e = { id: `M${m.messages.length + 1}`, mission: m.id, at: now(), from, to, type, purpose, evidence: evidence.slice(0, 20).map(r => r.ref || r), outcome }; m.messages.push(e); emit(m, 'message', e); return e; };
    const stage = (m, s) => { m.state = s; m.stages.push({ stage: s, at: now() }); if (memory) memory.checkpoint(m.id, s, m); emit(m, 'stage', { stage: s }); };
    const guard = () => { if (stopped) { const e = new Error('arrêt d’urgence'); e.stopped = true; throw e; } };
    const specialist = (city, tool) => registry.agents.find(a => a.id.startsWith(`core.${city}.`) && a.tools.includes(tool) && a.executionMode === 'deterministic' && a.status === 'available');
    function exec(m, agentId, tool, city, target, requester, via) {
      const a = byId(agentId), def = CT.TOOLS[tool] || TOOLS[tool];
      if (!a || !def || !ORG.canUse(a, tool, def.permission)) throw new Error(`permission refusée : ${agentId} → ${tool}`);
      const st = { id: `S${m.subtasks.length + 1}`, tool, city, target, agent: a.id, code: a.code, requester, via, depth: via ? 2 : 1, state: 'running', attempts: 1, ms: 0, error: null, findings: 0 };
      if (via) { msg(m, requester, via, 'request', `Demande d’appui (${tool}) pour ${city ? CITIES.get(city).name : 'la comparaison'}`, [], 'accepté par la direction'); msg(m, via, a.id, 'delegate', `Sous-tâche bornée ${st.id} : ${tool}`, [], 'assignée'); }
      else msg(m, requester, a.id, 'delegate', `Sous-tâche bornée ${st.id} : ${tool}`, [], 'assignée');
      m.subtasks.push(st); const t0 = Date.now();
      try { const out = city ? CT.TOOLS[tool].run(cxs[city], target) : null; st.state = 'succeeded'; st.ms = Date.now() - t0; st.findings = out && out.findings ? out.findings.length : 0; return out; }
      catch (e) { st.state = 'failed'; st.error = e.message; st.ms = Date.now() - t0; m.errors.push(`${tool} (${city}) : ${e.message}`); return null; }
    }
    // Same mission identity for the same pair and snapshots: re-running is idempotent; an interrupted mission resumes.
    async function compare(pairs, { resume = true, crashAfter = null } = {}) {
      const parts = pairs.map(([city, nhood]) => ({ city, nhood, cfg: CITIES.get(city), cx: cxs[city] }));
      for (const p of parts) if (!p.cfg || p.cfg.status !== 'operational' || !p.cx || !p.cx.nh.has(p.nhood)) throw new Error(`zone non opérationnelle : ${p.city}/${p.nhood}`);
      const id = `world:road-safety-comparison:${parts.map(p => `${p.city}/${p.nhood.toLowerCase().replace(/[^a-z]+/g, '-')}@${p.cx.stamp || p.cx.asOf}`).join('+')}`;
      const cp = resume && memory ? memory.loadCheckpoint(id) : null;
      if (cp && ['APPROVED', 'REJECTED', 'NEEDS_MORE_EVIDENCE'].includes(cp.body.state)) return cp.body; // a human decision is never overwritten
      if (cp && cp.body.state === 'HUMAN_REVIEW' && resume) return cp.body;
      const t0 = Date.now(); let m;
      if (cp && cp.body.state !== 'FAILED' && cp.body.state !== 'CANCELLED') { m = cp.body; m.resumedFrom = cp.stage; }
      else m = { id, version: 'core-world-mission-v1', workflow: 'cross-city-road-safety', title: 'Comparaison inter-villes : sécurité routière sur les réseaux désignés', scope: 'world', cities: parts.map(p => p.city), nhoods: parts.map(p => `${p.cfg.name} — ${p.nhood}`), nhood: parts.map(p => p.nhood).join(' / '),
        question: `Que peut-on comparer, et que ne peut-on pas comparer, entre les accidents sur les réseaux désignés de ${parts.map(p => `${p.nhood} (${p.cfg.name})`).join(' et ')} ?`, owner: DIRECTOR, state: null, stages: [], subtasks: [], messages: [], results: {}, findings: [], rejected: [], challenges: [], comparability: [], memoryReused: [], recommendation: null, review: null, decision: null, errors: [], model: { calls: 0, accepted: [], rejected: [] } };
      const order = STAGES, at = s => order.indexOf(m.state) < order.indexOf(s), crash = s => { if (crashAfter === s) { const e = new Error('arrêt simulé du processus'); e.crash = true; throw e; } };
      try {
        if (!m.state) { stage(m, 'DISCOVERED'); msg(m, EXEC, DIRECTOR, 'assign', 'Analyse comparative demandée entre deux villes opérationnelles', [], 'acceptée'); }
        if (at('ASSIGNED')) { guard(); for (const p of parts) msg(m, DIRECTOR, `core.${p.city}.mobility.lead`, 'delegate', `Profil d’accidents des réseaux désignés de ${p.nhood}`, [], 'acceptée'); stage(m, 'ASSIGNED'); crash('ASSIGNED'); }
        if (at('MEMORY_CONSULTED')) { guard();
          // Institutional memory: city findings already verified and reviewed (or approved) on the same snapshots.
          if (memory) for (const p of parts) { const mid = `civ:${p.city === 'san-francisco' ? '' : p.city + ':'}safety-works:${p.nhood.toLowerCase().replace(/[^a-z]+/g, '-')}@${p.cx.stamp || p.cx.asOf}`;
            // Same problem on any snapshot; superseded entries are excluded by status (a still-valid older entry is reused).
            const hits = memory.entries({ kind: 'finding', workflow: 'safety-works' }).filter(e => e.mission.replace(/@.*$/, '') === mid.replace(/@.*$/, '') && ['verified', 'reviewed', 'approved'].includes(e.status));
            for (const e of hits) m.memoryReused.push({ id: e.id, city: p.city, status: e.status, statement: e.statement, mission: e.mission });
            msg(m, DIRECTOR, 'memory', 'memory-read', `Mémoire institutionnelle consultée pour ${p.nhood}`, hits.map(e => `memory:${e.id}`), hits.length ? `${hits.length} constat(s) ${[...new Set(hits.map(e => ({ verified: 'vérifiés', reviewed: 'vérifiés et revus', approved: 'approuvés par un humain' }[e.status])))].join(' / ')} réutilisé(s) comme point de départ` : 'aucun constat vérifié disponible : enquête complète'); }
          stage(m, 'MEMORY_CONSULTED'); }
        if (at('INVESTIGATING')) { guard(); // a stage is checkpointed only once its work is complete, so a resume never skips work
          for (const p of parts) { const L = `core.${p.city}.mobility.lead`, tr = specialist(p.city, 'safety.crash-profile'), wk = specialist(p.city, 'works.area-windows');
            const cpf = exec(m, tr.id, 'safety.crash-profile', p.city, { nhood: p.nhood }, L, null); if (!cpf) continue;
            m.results[`${p.city}:safety.crash-profile`] = { rows: cpf.rows.slice(0, 50), assumptions: cpf.assumptions };
            // Evidence location (for the map replay): the most injured designated segment of the neighbourhood.
            const top0 = cpf.rows[0] && p.cx.hin.get(cpf.rows[0].cnn), site = top0 ? { coord: top0.mid, label: `${top0.street || cpf.rows[0].cnn} (${p.cfg.name})`, kind: 'tronçon désigné le plus touché' } : null; m.subtasks[m.subtasks.length - 1].site = site;
            for (const f of cpf.findings.slice(0, 1)) m.findings.push({ ...f, city: p.city, by: tr.id, evidence: f.evidence.map(r => ({ ...r, city: p.city })) });
            const top = cpf.rows.slice(0, 10).map(r => r.cnn), wo = top.length ? exec(m, wk.id, 'works.area-windows', p.city, { segments: top }, tr.id, `core.${p.city}.civil.lead`) : null; if (wo) m.subtasks[m.subtasks.length - 1].site = site;
            if (wo) { m.results[`${p.city}:works.area-windows`] = { rows: wo.rows }; for (const f of wo.findings) m.findings.push({ ...f, city: p.city, by: wk.id, evidence: f.evidence.map(r => ({ ...r, city: p.city })) }); }
            msg(m, tr.id, L, 'report', `Résultats pour ${p.nhood} remis à la direction`, cpf.findings[0].evidence.slice(0, 5), 'transmis'); msg(m, L, DIRECTOR, 'report', `Synthèse ${p.cfg.name}`, [], 'transmise'); }
          stage(m, 'INVESTIGATING'); crash('INVESTIGATING'); }
        if (at('METHODOLOGY_REVIEW')) { guard();
          msg(m, DIRECTOR, METHOD, 'request', 'Vérifier la comparabilité des définitions, méthodes, périodes et géographies', [], 'acceptée');
          const rv = byId(METHOD); if (!ORG.canUse(rv, 'comparability.review', 'review')) throw new Error('permission refusée : comparability.review');
          m.subtasks.push({ id: `S${m.subtasks.length + 1}`, tool: 'comparability.review', city: null, target: { pairs }, agent: METHOD, code: rv.code, requester: DIRECTOR, via: null, depth: 1, state: 'succeeded', attempts: 1, ms: 0, error: null, findings: 0 });
          m.comparability = comparability(parts); m.subtasks[m.subtasks.length - 1].findings = m.comparability.length;
          // Only descriptive side-by-side figures; each city's rate is stated on its own network with its own definition.
          const fig = parts.map(p => { const rows = m.results[`${p.city}:safety.crash-profile`] ? m.results[`${p.city}:safety.crash-profile`].rows : [], segs = CT.hinIn(p.cx, p.nhood), km = segs.reduce((s, h) => s + h.length_km, 0), cr = segs.flatMap(h => p.cx.crashes.get(h.cnn) || []), n = cr.reduce((s, r) => s + r.n, 0), fat = cr.filter(r => /Fatal/.test(r.severity)).reduce((s, r) => s + r.n, 0);
            return { city: p.city, name: p.cfg.name, nhood: p.nhood, km: +km.toFixed(2), crashes: n, fatal: fat, perKmYear: km ? +(n / km / YEARS).toFixed(1) : null, fatalPerKmYear: km ? +(fat / km / YEARS).toFixed(2) : null, evidence: [{ type: 'record', dataset: 'neighborhoods', ref: `neighborhoods:${p.nhood}`, city: p.city }, ...rows.slice(0, 5).map(r => ({ type: 'record', dataset: 'crashes-agg', ref: `crashes-agg:${r.cnn}`, city: p.city }))] }; });
          m.figures = fig;
          m.findings.push({ topic: 'cross', city: null, by: METHOD, claim: `Comparabilité : ${m.comparability.filter(c => /^comparable/.test(c.verdict)).length} indicateur(s) comparable(s) avec ou sans réserves, ${m.comparability.filter(c => /^non comparable/.test(c.verdict)).length} non comparable(s) (gravité, réseau désigné, rattachement, travaux).`, epistemic: 'derived', evidence: fig.flatMap(x => x.evidence.slice(0, 2)), values: { comparable: m.comparability.filter(c => /^comparable/.test(c.verdict)).length } });
          m.findings.push({ topic: 'cross', city: null, by: DIRECTOR, claim: `Juxtaposition descriptive (non comparable en niveau) : ${fig.map(x => `${x.nhood} (${x.name}) ${x.crashes} ${x.city === 'new-york' ? 'collisions' : 'accidents'} avec blessé ou tué sur ${x.km} km de réseau désigné, dont ${x.fatal} mortel(s)`).join(' ; ')} — 5 ans, définitions différentes.`, epistemic: 'derived', evidence: fig.flatMap(x => x.evidence), values: { figures: fig.map(({ evidence, ...x }) => x) } });
          msg(m, METHOD, DIRECTOR, 'review', 'Avis de comparabilité remis avant toute comparaison', [], `${m.comparability.filter(c => /^non comparable/.test(c.verdict)).length} indicateur(s) non comparable(s)`);
          stage(m, 'METHODOLOGY_REVIEW'); crash('METHODOLOGY_REVIEW'); }
        if (at('EVIDENCE_VALIDATION')) { guard();
          for (const p of parts) { const v = specialist(p.city, 'data.freshness'); const fr = exec(m, v.id, 'data.freshness', p.city, { datasets: ['crashes-agg', 'hin'] }, DIRECTOR, `core.${p.city}.research.lead`); if (fr) for (const c of fr.challenges) m.challenges.push({ ...c, city: p.city, by: v.id }); }
          const empty = { hin: new Map(), crashes: new Map(), recordIds: new Set(), nh: new Map(), retrieved: {}, ramps: [] };
          m.recommendation = { kind: 'recommandation (hypothèse à vérifier)', text: `Ne comparer les deux villes que sur les collisions avec blessé ou tué et les collisions mortelles, chacune sur sa propre définition ; ne pas comparer la gravité, les réseaux désignés ni les travaux. Prochaine étape : obtenir une classification de gravité commune et recalculer le rattachement avec la même méthode dans les deux villes. Hypothèse : aucune ville n’est jugée plus ou moins sûre par cette analyse.` };
          const r = CT.review(empty, m.findings, m.recommendation, ref => !!ref.city && CT.resolve(cxs[ref.city], ref));
          m.rejected = r.rejected; m.findings = r.accepted.map((f, i) => ({ ...f, id: `F${i + 1}` })); m.review = { ...r, accepted: undefined, by: parts.map(p => `core.${p.city}.safety.adversarial-reviewer`) };
          for (const p of parts) msg(m, `core.${p.city}.safety.adversarial-reviewer`, DIRECTOR, 'review', `Revue adversariale des constats (${p.cfg.name})`, [], `${m.findings.filter(f => f.city === p.city).length} accepté(s)`);
          stage(m, 'EVIDENCE_VALIDATION'); }
        guard();
        const ok = m.findings.length > 0 && m.review.recommendation && m.review.recommendation.ok;
        m.decision = { by: parts.map(p => `core.${p.city}.governance.gateway`), state: ok ? 'ÉLIGIBLE À LA REVUE HUMAINE' : 'PREUVES SUPPLÉMENTAIRES REQUISES', caveats: m.challenges.filter(c => c.level === 'warn').map(c => `${CITIES.get(c.city).name} : ${c.text}`), authorizes: 'rien — décision humaine requise' };
        msg(m, DIRECTOR, 'human', 'decision', `Proposition : ${m.decision.state}`, [], m.decision.caveats.join(' ') || 'aucune réserve');
        stage(m, 'PROPOSED_DECISION'); stage(m, 'HUMAN_REVIEW');
        if (memory) for (const f of m.findings.filter(f => f.topic === 'cross')) { const p = memory.propose({ kind: 'finding', workflow: 'cross-city-road-safety', statement: f.claim, evidence: f.evidence.map(e => `${e.city}:${e.ref}`), origin: f.by, mission: m.id }); if (!p.existing) { memory.transition(p.id, 'verified', `core.${parts[0].city}.research.evidence-verifier`, 'références résolues dans les deux instantanés'); memory.transition(p.id, 'reviewed', `core.${parts[1].city}.safety.adversarial-reviewer`, 'revue adversariale (règles déterministes) après avis de comparabilité'); } }
        // Same comparison on newer snapshots supersedes the older findings (kept, linked; changed numbers → conflict).
        if (memory) { const key = id.replace(/@[^+]*/g, ''), all = memory.entries({ kind: 'finding', workflow: 'cross-city-road-safety' }), mine = all.filter(e => e.mission === id && e.status !== 'rejected');
          for (const old of all.filter(e => e.mission !== id && e.mission.replace(/@[^+]*/g, '') === key && e.mission < id && ['verified', 'reviewed', 'approved'].includes(e.status))) {
            const succ = mine.find(e => e.statement.split(':')[0] === old.statement.split(':')[0]); if (!succ) continue; // unchanged statements keep their entry
            const r = memory.supersede(old.id, succ.id, `core.${parts[0].city}.research.evidence-verifier`, 'remplacé par une comparaison sur des instantanés plus récents'); if (r.conflict) (m.conflicts = m.conflicts || []).push({ entry: old.id, successor: succ.id, note: 'valeurs différentes entre instantanés' }); } }
      } catch (e) { if (e.crash) throw e; m.state = e.stopped ? 'CANCELLED' : 'FAILED'; m.errors.push(e.stopped ? 'arrêt d’urgence' : e.message); if (memory) memory.checkpoint(m.id, m.state, m); }
      m.metrics = { wallMs: Date.now() - t0, subtasks: m.subtasks.length, failed: m.subtasks.filter(s => s.state === 'failed').length, toolCalls: m.subtasks.length, messages: m.messages.length, modelCalls: 0, memoryReused: m.memoryReused.length };
      if (memory) memory.checkpoint(m.id, m.state, m);
      return m;
    }
    function humanDecision(m, reviewer, decision, note = '') {
      if (!/^human:[A-Za-z0-9._-]{2,40}$/.test(String(reviewer))) throw new Error('décision réservée à un humain (human:<nom>)');
      if (m.state !== 'HUMAN_REVIEW') throw new Error(`mission non soumise à la revue humaine (${m.state})`);
      const to = { approve: 'APPROVED', reject: 'REJECTED', 'needs-evidence': 'NEEDS_MORE_EVIDENCE' }[decision]; if (!to) throw new Error('décision inconnue');
      m.human = { reviewer, decision: to, note: String(note).slice(0, 500), at: now() }; msg(m, reviewer, DIRECTOR, 'human-decision', `Décision humaine : ${to}`, [], note || null); stage(m, to);
      if (memory && to === 'APPROVED') for (const e of memory.entries({ kind: 'finding', workflow: 'cross-city-road-safety', status: 'reviewed' }).filter(e => e.mission === m.id)) memory.transition(e.id, 'approved', reviewer, 'mission approuvée par un humain');
      return m;
    }
    return { compare, humanDecision, stopAll: () => { stopped = true; }, resetStop: r => { if (!/^human:/.test(r)) return false; stopped = false; return true; } };
  }
  const W = { createWorld, comparability, STAGES, DIRECTOR, METHOD, TOOLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = W; else root.CORE_CIV_WORLD = W;
})(typeof globalThis !== 'undefined' ? globalThis : this);
