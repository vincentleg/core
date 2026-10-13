// CORE — multidomain city investigation (Phase 2D). Eight logical roles, deterministic and rule-based.
// Discovery → Evidence → Cross-domain reasoning → Scenario generation → Evaluation → Adversarial review →
// Synthesis → Human decision gateway. Every event is an executed operation. No language model is used;
// a model-provider interface exists for the future but no provider is registered.
(function (root) {
  'use strict';
  const isNode = typeof require === 'function' && typeof module !== 'undefined';
  const C = isNode ? require('./coord.js') : root.CORE_COORD;
  const GR = isNode ? require('./graph.js') : root.CORE_GRAPH;
  const SIM = isNode ? require('./simulation.js') : root.CORE_SIM;

  const DEFAULTS = Object.freeze({ treeBufferM: 12, frontageM: 40, buildingRecencyDays: 365, investigationDays: 21, ...C.DEFAULTS });
  const ROLES = [
    { id: 'discovery', name: 'Découverte' }, { id: 'evidence', name: 'Preuves' }, { id: 'crossdomain', name: 'Raisonnement inter-domaines' },
    { id: 'scenario', name: 'Génération de scénarios' }, { id: 'evaluation', name: 'Évaluation' }, { id: 'adversarial', name: 'Revue adversariale' },
    { id: 'synthesis', name: 'Synthèse' }, { id: 'gateway', name: 'Passerelle de décision humaine' },
  ];
  const STATES = { ELIGIBLE: 'ÉLIGIBLE À LA REVUE HUMAINE', MORE: 'PREUVES SUPPLÉMENTAIRES REQUISES', REJECT: 'REJETÉ' };
  const ACTIVE_BP = ['filed', 'approved', 'issued', 'reinstated', 'plancheck'];
  const REQUIRED_DATASETS = ['permits', 'corridor', 'street-trees', 'building-permits'];

  // ---------- Optional model-provider interface (none registered; rules only) ----------
  const providers = [];
  function registerProvider(p) {
    if (!p || typeof p.id !== 'string' || typeof p.propose !== 'function' || !['llm', 'rule'].includes(p.kind)) throw new TypeError('fournisseur invalide');
    providers.push(p); return p; // proposals from a provider are never trusted: the gateway recomputes from the snapshot
  }

  // ---------- Block signals (deterministic, per corridor segment) ----------
  function treesOf(ctx, cnn) { return (ctx.data['street-trees'] ? ctx.data['street-trees'].features : []).filter(f => f.properties.cnn === cnn).map(f => ({ id: f.properties.treeid, coords: f.geometry.coordinates, legal: f.properties.legal_status, species: f.properties.species, record_id: f.properties.record_id })); }
  function blockSignals(ctx, G, seg, p) {
    const s = ctx.segments.get(seg), g = C.analyseGroup(ctx, seg, p);
    const horizonEnd = ctx.asOfN + p.horizonDays;
    const works = g.planning.filter(w => w.s <= horizonEnd).map(w => ({ ...w, coords: ctx.byRecord.get(`permits:${w.record_id}`).feature.geometry.coordinates }));
    const trees = treesOf(ctx, seg);
    const exposed = trees.filter(t => works.some(w => C.distanceToGeometry(w.coords, { type: 'Point', coordinates: t.coords }) <= p.treeBufferM));
    const bps = G.of(`segment:${seg}`, 'NEAR').map(r => G.entities.get(r.from)).filter(e => e.type === 'Permit' && e.props.domain === 'buildings');
    const recent = bps.filter(e => e.props.recent);
    const energy = G.of(`segment:${seg}`, 'NEAR').map(r => G.entities.get(r.from)).filter(e => e.type === 'Building');
    const sidewalks = G.of(`segment:${seg}`, 'LOCATED_IN').map(r => G.entities.get(r.from)).filter(e => e.props.kind === 'sidewalk');
    const removals = trees.flatMap(t => G.of(`tree:${t.id}`, 'ASSOCIATED_WITH').map(r => G.entities.get(r.from)).filter(e => e.type === 'Event'));
    const parks = G.of(`segment:${seg}`, 'NEAR').map(r => G.entities.get(r.from)).filter(e => e.type === 'Park');
    const orgs = [...new Set(works.map(w => w.agent).filter(Boolean))].sort();
    const domains = { infrastructure: works.length > 0, nature: exposed.length > 0, buildings: recent.length > 0, energy: energy.length > 0, public_space: sidewalks.length > 0 || parks.length > 0, events: removals.length > 0 || g.env.closures.length > 0 };
    const core = ['infrastructure', 'nature', 'buildings'].filter(k => domains[k]).length;
    // Trees under a public removal notice contradict the nature link: they do not count towards ranking.
    const noticed = new Set(trees.filter(t => G.of(`tree:${t.id}`, 'ASSOCIATED_WITH').some(r => G.entities.get(r.from).type === 'Event')).map(t => t.id));
    const exposedNet = exposed.filter(t => !noticed.has(t.id));
    return { seg, street: s.properties.street, from: s.properties.from, to: s.properties.to, group: g, works, orgs, trees, exposed, exposedNet, recent, buildingPermits: bps, energy, sidewalks, removals, parks, domains, core,
      domainCount: Object.values(domains).filter(Boolean).length };
  }
  // Ranking: key domains, organisations, exposed trees not contradicted by a removal notice, recent building permits, other domains.
  const rank = (a, b) => b.core - a.core || b.orgs.length - a.orgs.length || b.exposedNet.length - a.exposedNet.length || b.recent.length - a.recent.length || b.domainCount - a.domainCount || a.seg.localeCompare(b.seg);

  // ---------- Alternatives ----------
  function alternatives(ctx, b, p) {
    const base = b.works, env = b.group.env;
    const coord = SIM.run('coordination-schedule-v1', { scenario: 'S2', base, env, opts: p });
    const deferWin = base.map(w => {
      if (w.fixed.length) return { ...w, shift: 0 };
      const target = Math.max(w.s, ctx.asOfN + p.investigationDays), sh = Math.min(target - w.s, p.maxShiftDays);
      return { ...w, s: w.s + sh, e: w.e + sh, start: C.ds(w.s + sh), end: C.ds(w.e + sh), shift: sh };
    });
    const byId = w => new Map(w.map(x => [x.record_id, x]));
    const coordById = byId(coord.outputs.windows.map(x => ({ ...x, s: C.dn(x.start), e: C.dn(x.end) })));
    const coordWin = base.map(w => { const c = coordById.get(w.record_id); return { ...w, s: c.s, e: c.e, start: c.start, end: c.end, shift: c.shift }; });
    return [
      { id: 'R0', name: 'Référence : travaux indépendants, tels que permis', kind: 'observed-derived', windows: base.map(w => ({ ...w, shift: 0 })),
        description: 'Chaque titulaire travaille dans sa fenêtre de permis ; aucune revue commune des arbres ni des travaux de façade.',
        assumptions: ['Dates de permis = fenêtres autorisées, pas travaux réalisés.'],
        evidence: [{ id: 'permis de voirie vérifiés', available: true }] },
      { id: 'R1', name: 'Intervention coordonnée : fenêtre commune + revue de protection des arbres', kind: 'hypothetical', windows: coordWin,
        description: 'Fenêtres d’excavation alignées (scénario S2 du moteur de coordination, sous contraintes) et une seule revue de protection des arbres avant le premier début, coordonnée avec les travaux de façade.',
        assumptions: ['Les excavations sont techniquement compatibles dans une même fenêtre (non vérifié).', 'Une revue d’arbres commune couvre tous les permis simultanés.'],
        evidence: [{ id: 'permis de voirie vérifiés', available: true }, { id: 'positions des arbres (inventaire)', available: true },
          { id: 'tracé réel des tranchées', available: false }, { id: 'état sanitaire et zones racinaires des arbres', available: false }, { id: 'calendrier des travaux de bâtiment', available: false }, { id: 'accord des titulaires', available: false }] },
      { id: 'R2', name: 'Différer et investiguer : vérification de terrain avant ouverture', kind: 'hypothetical', windows: deferWin,
        description: `Les permis non commencés sont décalés jusqu’à ${p.investigationDays} j après l’instantané (dans la limite de ±${p.maxShiftDays} j) pour vérifier tracés de tranchées, arbres et travaux de façade ; les travaux commencés continuent.`,
        assumptions: [`${p.investigationDays} jours suffisent pour une visite de terrain (hypothèse).`, 'Les titulaires acceptent un report (non vérifié).'],
        evidence: [{ id: 'permis de voirie vérifiés', available: true }, { id: 'positions des arbres (inventaire)', available: true }, { id: 'permis de bâtiment récents au front du tronçon', available: true }] },
    ];
  }
  function evaluateAlt(ctx, b, alt, p) {
    const env = b.group.env, wins = alt.windows.map(w => ({ ...w }));
    const m = C.evaluate(wins, env);
    const viol = alt.id === 'R0' ? [] : C.violations(b.works, wins, env, p);
    const expo = SIM.run('tree-proximity-exposure-v1', { windows: wins.map(w => ({ record_id: w.record_id, coords: w.coords, s: w.s, e: w.e })), trees: b.trees, distanceM: p.treeBufferM });
    const ev = SIM.run('evidence-completeness-v1', { items: alt.evidence });
    const concurrentBuilding = b.recent.length;
    return { id: alt.id, metrics: { excavationPermits: wins.length, organisations: m.organisations, occupationWindows: m.occupationWindows, overlapPairs: m.overlapPairs, overlapDays: m.overlapDays,
      treesWithinBuffer: expo.outputs.uniqueTrees, permitTreePairs: expo.outputs.permitTreePairs, exposureEpisodes: alt.id === 'R0' ? expo.outputs.permitTreePairs : expo.outputs.exposureEpisodes,
      recentBuildingPermits: concurrentBuilding, moved: wins.filter(w => w.shift).length, delayDays: wins.reduce((s, w) => s + Math.max(0, w.shift || 0), 0), violations: viol.length, evidenceCompleteness: ev.outputs.ratio },
      violations: viol, missingEvidence: ev.outputs.missing, models: [expo.model, ev.model, alt.id === 'R1' ? 'coordination-schedule-v1' : null].filter(Boolean),
      notes: alt.id === 'R0' ? 'Épisodes d’exposition comptés par permis (chaque titulaire intervient séparément).' : 'Épisodes d’exposition comptés par fenêtre d’occupation commune (hypothèse de revue partagée).' };
  }

  // ---------- Adversarial perturbations ----------
  const PERTURBATIONS = [
    { id: 'P1', label: 'Rayon autour des arbres divisé par deux', apply: p => ({ ...p, treeBufferM: Math.max(1, Math.round(p.treeBufferM / 2)) }) },
    { id: 'P2', label: 'Incertitude de géocodage : rayon +15 m', apply: p => ({ ...p, treeBufferM: p.treeBufferM + 15 }) },
    { id: 'P3', label: 'Permis de bâtiment récents limités à 180 jours', apply: p => ({ ...p, buildingRecencyDays: Math.min(180, p.buildingRecencyDays) }) },
    { id: 'P4', label: 'Front de rue resserré à 25 m', apply: p => ({ ...p, frontageM: 25 }) },
    { id: 'P5', label: 'Horizon réduit à 30 jours', apply: p => ({ ...p, horizonDays: Math.min(30, p.horizonDays) }) },
    { id: 'P6', label: 'Arbres faisant l’objet d’un avis d’abattage exclus', apply: p => ({ ...p, excludeRemovalTrees: true }) },
    { id: 'P7', label: 'Arbres non entretenus par DPW exclus', apply: p => ({ ...p, dpwOnly: true }) },
  ];
  function holds(ctx, seg, p) {
    const G = GR.buildCityGraph(ctx, p), b = blockSignals(ctx, G, seg, p);
    let exposed = b.exposed;
    if (p.excludeRemovalTrees) { const gone = new Set(b.removals.flatMap(e => G.of(e.id, 'ASSOCIATED_WITH').map(r => r.to))); exposed = exposed.filter(t => !gone.has(`tree:${t.id}`)); }
    if (p.dpwOnly) exposed = exposed.filter(t => /DPW/i.test(t.legal || ''));
    const ok = b.domains.infrastructure && exposed.length > 0 && b.recent.length > 0;
    return { ok, detail: `${b.works.length} excavation(s), ${exposed.length} arbre(s) à ≤ ${p.treeBufferM} m, ${b.recent.length} permis de bâtiment récent(s)` };
  }

  // ---------- Pipeline ----------
  function* investigate(ctx, options = {}) {
    const p = { ...DEFAULTS, ...options }; let seq = 0;
    const ev = (agent, op, text, extra = {}) => ({ seq: ++seq, agent, kind: 'deterministic', op, text, status: 'ok', ...extra });
    const out = { params: p, asOf: ctx.asOf };
    // 1. Discovery
    yield ev('discovery', 'graph', 'Construction du graphe de connaissances du corridor à partir de l’instantané vérifié…');
    const G = GR.buildCityGraph(ctx, p); out.graph = G;
    const st = G.stats();
    yield ev('discovery', 'graph', `Graphe : ${st.entities} entités, ${st.relations} relations (${Object.entries(st.by).map(([k, n]) => `${n} ${k}`).join(', ')}).`, { counts: st });
    const blocks = [];
    for (const seg of ctx.segments.keys()) {
      const b = blockSignals(ctx, G, seg, p); blocks.push(b);
      yield ev('discovery', 'scan', `${b.street} ${b.from} → ${b.to} : ${b.works.length} excavation(s) à ≤ ${p.horizonDays} j (${b.orgs.length} org.), ${b.trees.length} arbre(s) dont ${b.exposed.length} à ≤ ${p.treeBufferM} m, ${b.recent.length} permis de bâtiment récent(s), ${b.energy.length} bâtiment(s) déclaré(s) énergie — ${b.core}/3 domaines clés.`,
        { cnn: C.groupCnns(ctx, seg), domains: Object.keys(b.domains).filter(k => b.domains[k]) });
    }
    const candidates = blocks.filter(b => b.core === 3).sort(rank);
    out.candidates = candidates.map(b => ({ seg: b.seg, street: b.street, from: b.from, to: b.to, core: b.core, domains: b.domains, orgs: b.orgs, exposed: b.exposed.length, exposedNet: b.exposedNet.length, recent: b.recent.length }));
    yield ev('discovery', 'done', `${candidates.length} tronçon(s) combinent infrastructure, nature et bâtiments ; classement : domaines, organisations, arbres exposés, permis récents.`, { status: candidates.length ? 'ok' : 'warn' });
    if (!candidates.length) { out.brief = null; out.decision = { state: STATES.REJECT, reason: 'Aucune relation inter-domaines vérifiable avec ces paramètres.', authorizes: false, checks: [] }; if (!p._noGateway) yield ev('gateway', 'decide', out.decision.reason, { status: 'fail' }); return out; }
    // 2. Evidence
    const bad = REQUIRED_DATASETS.filter(k => !ctx.datasets[k] || ctx.datasets[k].verified !== 'ok');
    yield ev('evidence', 'check', bad.length ? `Sommes SHA-256 non vérifiées : ${bad.join(', ')}.` : `Jeux requis vérifiés (SHA-256) : ${REQUIRED_DATASETS.join(', ')} ; instantané ${ctx.asOf}.`, { status: bad.length ? 'fail' : 'ok' });
    let chosen = null;
    for (const b of candidates) {
      const checks = evidenceChecks(ctx, b, p);
      const fails = checks.filter(c => !c.pass);
      yield ev('evidence', 'verify', `${b.street} ${b.from} → ${b.to} : ${checks.length - fails.length}/${checks.length} contrôles${fails.length ? ` — échec : ${fails.map(c => c.label).join(' ; ')}` : ''}.`, { status: fails.length ? 'fail' : 'ok', cnn: C.groupCnns(ctx, b.seg) });
      if (!fails.length && !bad.length && !chosen) { chosen = b; out.evidenceChecks = checks; }
    }
    if (!chosen) { out.brief = null; out.decision = { state: STATES.REJECT, reason: 'Aucun candidat ne passe les contrôles de preuves.', authorizes: false, checks: [] }; if (!p._noGateway) yield ev('gateway', 'decide', out.decision.reason, { status: 'fail' }); return out; }
    out.block = chosen;
    // 3. Cross-domain reasoning
    const hyp = `hypothesis:${chosen.seg}`;
    G.addEntity(hyp, 'Hypothesis', { text: 'Les excavations à venir, les arbres d’alignement proches et les travaux de bâtiment récents sur ce tronçon gagneraient à être examinés ensemble avant ouverture.' }, null);
    const claims = [];
    const addClaim = (id, text, basis, support) => { claims.push({ id, text, basis, support }); for (const s of support) if (G.entities.has(s)) G.relate('SUPPORTED_BY', hyp, s, basis === 'derived' ? 'derived' : basis === 'observed' ? 'observed' : 'rule', text); };
    const review = chosen.group.planning.length ? C.reviewBasis(chosen.works, chosen.group.env, p) : { pairs: [] };
    addClaim('C1', `${chosen.works.length} fenêtre(s) d’excavation de ${chosen.orgs.length} organisation(s) dans les ${p.horizonDays} j${review.pairs.length ? `, dont ${review.pairs.length} chevauchement(s) entre organisations` : ''}.`, 'rule', chosen.works.map(w => `permit:${w.record_id}`));
    for (const t of chosen.exposed) for (const w of chosen.works) {
      const d = C.distanceToGeometry(w.coords, { type: 'Point', coordinates: t.coords });
      if (d <= p.treeBufferM) G.relate('NEAR', `tree:${t.id}`, `permit:${w.record_id}`, 'derived', `Arbre à ${Math.round(d)} m du point publié du permis (≤ ${p.treeBufferM} m ; le tracé réel est inconnu).`, { distance_m: Math.round(d) });
    }
    addClaim('C2', `${chosen.exposed.length} arbre(s) inventorié(s) à ≤ ${p.treeBufferM} m des points de permis d’excavation.`, 'derived', chosen.exposed.map(t => `tree:${t.id}`));
    addClaim('C3', `${chosen.recent.length} permis de bâtiment déposé(s) ou délivré(s) depuis ${p.buildingRecencyDays} j au front du tronçon.`, 'derived', chosen.recent.map(e => e.id));
    G.relate('AFFECTS', hyp, `segment:${chosen.seg}`, 'hypothesis', 'Hypothèse à vérifier : les travaux pourraient toucher les mêmes trottoirs et fosses d’arbres. Aucune causalité n’est établie par la proximité.');
    const contradictions = [];
    for (const e of chosen.removals) { contradictions.push({ id: e.id, text: `Avis d’abattage (${e.props.notice}, ${e.props.posted}) : l’arbre concerné pourrait ne plus être à protéger.` }); G.relate('CONTRADICTED_BY', hyp, e.id, 'observed', 'Un avis public d’abattage réduit l’enjeu de protection pour cet arbre.'); }
    const unexposedRecent = chosen.recent.filter(e => /interior|bathroom|kitchen|sign|re-?roof/i.test(e.props.description || ''));
    if (unexposedRecent.length) contradictions.push({ id: 'scope', text: `${unexposedRecent.length} permis de bâtiment récents semblent intérieurs ou d’enseigne : leur lien avec le trottoir est incertain.` });
    out.hypothesis = { id: hyp, text: G.entities.get(hyp).props.text, claims, contradictions };
    yield ev('crossdomain', 'hypothesis', `Hypothèse testable sur ${chosen.street} ${chosen.from} → ${chosen.to} : ${claims.map(c => c.id + ' ' + c.text).join(' ')}`, { cnn: C.groupCnns(ctx, chosen.seg), refs: claims.flatMap(c => c.support).slice(0, 20) });
    yield ev('crossdomain', 'contradictions', contradictions.length ? `${contradictions.length} élément(s) contradictoire(s) ou limitant(s) : ${contradictions.map(c => c.text).join(' ')}` : 'Aucun élément contradictoire trouvé dans l’instantané.', { status: contradictions.length ? 'warn' : 'ok' });
    // 4. Scenario generation
    const alts = alternatives(ctx, chosen, p); out.alternatives = alts.map(a => ({ id: a.id, name: a.name, kind: a.kind, description: a.description, assumptions: a.assumptions, windows: a.windows.map(w => ({ record_id: w.record_id, permit_number: w.permit_number, agent: w.agent, start: w.start, end: w.end, shift: w.shift || 0, fixed: w.fixed })) }));
    for (const a of alts) yield ev('scenario', 'generate', `${a.id} · ${a.name} — ${a.description}`, { cnn: C.groupCnns(ctx, chosen.seg) });
    // 5. Evaluation
    out.evaluations = alts.map(a => evaluateAlt(ctx, chosen, a, p));
    for (const r of out.evaluations) { const m = r.metrics; yield ev('evaluation', 'models', `${r.id} : ${m.occupationWindows} fenêtre(s), ${m.overlapPairs} chevauchement(s), ${m.treesWithinBuffer} arbre(s) à ≤ ${p.treeBufferM} m, ${m.exposureEpisodes} épisode(s) d’exposition, ${m.delayDays} j de report, ${m.violations} violation(s), preuves ${Math.round(m.evidenceCompleteness * 100)} % — modèles ${r.models.join(', ')}.`, { status: m.violations ? 'warn' : 'ok' }); }
    yield ev('evaluation', 'limits', 'Aucun modèle énergétique, écologique ni trafic réel validé : aucun gain, coût, émission ou dommage n’est estimé.', { status: 'warn' });
    // 6. Adversarial
    out.adversarial = PERTURBATIONS.map(x => { const r = holds(ctx, chosen.seg, x.apply(p)); return { id: x.id, label: x.label, pass: r.ok, detail: r.detail }; });
    for (const r of out.adversarial) yield ev('adversarial', 'test', `${r.id} ${r.label} : ${r.pass ? 'relation maintenue' : 'relation perdue'} (${r.detail}).`, { status: r.pass ? 'ok' : 'fail' });
    out.missing = ['tracé réel des tranchées (les points de permis sont à l’adresse ou au tronçon)', 'état sanitaire et zones racinaires des arbres', 'calendrier et emprise des travaux de bâtiment sur le trottoir', 'accord des titulaires sur un report ou une fenêtre commune'];
    yield ev('adversarial', 'missing', `Preuves manquantes : ${out.missing.join(' ; ')}.`, { status: 'warn' });
    // 7. Synthesis
    out.brief = synthesize(ctx, out, p);
    yield ev('synthesis', 'brief', `Conclusion conditionnelle : ${out.brief.recommendedAction.summary}`, { cnn: C.groupCnns(ctx, chosen.seg) });
    if (p._noGateway) return out;
    // 8. Gateway (independent recomputation inside)
    out.decision = issueCityDecision(out.brief, ctx);
    yield ev('gateway', 'decide', `${out.decision.state} — ${out.decision.reason}`, { status: out.decision.state === STATES.ELIGIBLE ? 'ok' : out.decision.state === STATES.MORE ? 'warn' : 'fail' });
    out.fingerprint = C.fingerprint({ brief: out.brief, decision: out.decision.state });
    yield ev('system', 'complete', `Investigation terminée. Empreinte ${out.fingerprint} (FNV-1a, non cryptographique) — identique à chaque réexécution avec les mêmes paramètres et le même instantané.`);
    return out;
  }
  function quiet(ctx, p) { const gen = investigate(ctx, { ...p, _noGateway: true }); let n; while (!(n = gen.next()).done); return n.value; }

  function evidenceChecks(ctx, b, p) {
    const checks = [];
    checks.push({ id: 'records', label: 'enregistrements présents', pass: b.works.every(w => ctx.byRecord.has(`permits:${w.record_id}`)) && b.trees.length > 0 });
    checks.push({ id: 'dates', label: 'dates de permis cohérentes', pass: b.works.every(w => w.start <= w.end) });
    checks.push({ id: 'geometry', label: `permis à ≤ ${p.geoToleranceM} m de leur CNN`, pass: b.works.every(w => C.distanceToGeometry(w.coords, ctx.segments.get(w.cnn) ? ctx.segments.get(w.cnn).geometry : ctx.nodes.get(w.cnn).geometry) <= p.geoToleranceM) });
    checks.push({ id: 'trees-cnn', label: 'arbres rattachés au tronçon par leur CNN', pass: b.trees.every(t => t.coords && Number.isFinite(t.coords[0])) });
    checks.push({ id: 'organisations', label: 'organisations identifiées', pass: b.orgs.length >= 1 });
    return checks;
  }

  function synthesize(ctx, out, p) {
    const b = out.block, ev = Object.fromEntries(out.evaluations.map(e => [e.id, e]));
    const recommended = ev.R1.metrics.evidenceCompleteness < 1 || ev.R1.violations.length ? 'R2' : 'R1';
    const ranking = recommended === 'R2'
      ? [{ id: 'R2', why: 'Seule option dont les preuves requises sont disponibles ; elle comble les manques avant d’engager une intervention.' },
        { id: 'R1', why: `Moins d’épisodes d’exposition modélisés (${ev.R1.metrics.exposureEpisodes} contre ${ev.R0.metrics.exposureEpisodes}) mais preuves requises incomplètes (${ev.R1.missingEvidence.join(', ')})${ev.R1.violations.length ? ` et ${ev.R1.violations.length} violation(s)` : ''}.` },
        { id: 'R0', why: 'Laisse la relation inter-domaines sans revue ; reste la référence si l’investigation ne confirme rien.' }]
      : [{ id: 'R1', why: 'Preuves complètes et contraintes respectées.' }, { id: 'R2', why: 'Retarde sans nécessité si les preuves sont complètes.' }, { id: 'R0', why: 'Référence.' }];
    const recentList = b.recent.slice(0, 8).map(e => ({ permit: e.props.permit_number, type: e.props.type, status: e.props.status, filed: e.props.filed, issued: e.props.issued, address: e.props.address, description: e.props.description, url: `https://data.sf.gov/resource/i98e-djp9.json?permit_number=${encodeURIComponent(e.props.permit_number)}` }));
    return {
      version: 'core-decision-brief-v1', snapshot: { generated_at: ctx.manifest.generated_at, city_snapshot_at: ctx.manifest.city_snapshot_at || null, datasets: Object.fromEntries(Object.entries(ctx.datasets).map(([k, d]) => [k, { id: d.id, sha256: d.sha256, verified: d.verified }])) },
      params: Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith('_') && ['treeBufferM', 'frontageM', 'buildingRecencyDays', 'investigationDays', 'horizonDays', 'maxShiftDays', 'leadDays', 'programmeDays', 'geoToleranceM'].includes(k))),
      discovered: `Sur ${b.street} entre ${b.from} et ${b.to}, ${b.works.length} fenêtre(s) d’excavation de ${b.orgs.length} organisation(s) dans les ${p.horizonDays} prochains jours se situent à ≤ ${p.treeBufferM} m de ${b.exposed.length} arbre(s) d’alignement inventorié(s), sur un front où ${b.recent.length} permis de bâtiment ont été déposés ou délivrés depuis ${p.buildingRecencyDays} jours.`,
      location: { segment_cnn: b.seg, street: b.street, from: b.from, to: b.to, group_cnns: C.groupCnns(ctx, b.seg) },
      whyItMatters: 'Plusieurs services interviennent sur le même trottoir que des arbres publics et des chantiers de façade : sans revue commune, les mêmes fosses d’arbres et le même cheminement peuvent être perturbés plusieurs fois. C’est une hypothèse à vérifier, pas un dommage constaté.',
      domains: Object.keys(b.domains).filter(k => b.domains[k]),
      evidence: {
        excavations: b.works.map(w => ({ permit: w.permit_number, organisation: w.agent, start: w.start, end: w.end, status: w.status, fixed: w.fixed, record_id: w.record_id, url: `https://data.sf.gov/resource/b6tj-gt35.json?permit_number=${encodeURIComponent(w.permit_number)}` })),
        trees: b.exposed.map(t => ({ treeid: t.id, species: t.species, legal_status: t.legal, url: `https://data.sf.gov/resource/tkzw-k3nq.json?treeid=${encodeURIComponent(t.id)}` })),
        buildingPermits: recentList, buildingPermitsTotal: b.recent.length,
        energyBuildings: b.energy.map(e => ({ parcel: e.provenance.record_id, name: e.props.name, address: e.props.address, site_eui: e.props.site_eui, benchmark_status: e.props.benchmark_status })),
        sidewalks: b.sidewalks.map(s => ({ width_ft: s.props.width_ft, side: s.props.side, year: 2014 })),
        removals: b.removals.map(e => ({ notice: e.props.notice, posted: e.props.posted, site: e.props.site })),
        parks: b.parks.map(e => ({ name: e.props.name })),
      },
      observationVsInference: { observed: ['Fenêtres, titulaires et statuts des permis de voirie', 'Arbres de l’inventaire et leur CNN', 'Avis d’abattage', 'Permis de bâtiment (type, statut, dates, adresse)', 'Bilans énergétiques déclarés', 'Largeurs de trottoir (2014)'],
        derived: [`Distances arbre–permis (≤ ${p.treeBufferM} m) au point publié du permis`, `Permis de bâtiment à ≤ ${p.frontageM} m de l’axe`], rule: ['Chevauchements temporels', `Récence des permis de bâtiment (${p.buildingRecencyDays} j)`], hypothesis: [out.hypothesis.text] },
      hypothesis: out.hypothesis,
      baseline: 'R0', alternatives: out.alternatives, evaluation: { method: 'Modèles déterministes : coordination-schedule-v1 (calendrier sous contraintes), tree-proximity-exposure-v1 (comptage de proximité), evidence-completeness-v1 (liste de contrôle). Aucun modèle physique, énergétique ou écologique.', results: out.evaluations },
      constraints: [`Décalage maximal ±${p.maxShiftDays} j`, `Préavis ${p.leadDays} j`, `Permis > ${p.programmeDays} j non déplacés`, 'Permis commencés, actifs ou d’urgence non déplacés', 'Durées conservées'],
      uncertainty: ['Position des permis géocodée à l’adresse ou au tronçon : distances indicatives.', 'Statut DBI « issued » sans date d’achèvement : récence utilisée comme indicateur d’activité.', 'Largeurs de trottoir issues d’une étude de 2014.', 'Bilans énergétiques déclarés, non mesurés par CORE.'],
      missingData: out.missing,
      stakeholders: [...b.orgs, 'SF Public Works (permis de voirie, Bureau of Urban Forestry)', 'Department of Building Inspection', 'titulaires des permis de bâtiment au front du tronçon', 'riverains et usagers du trottoir'],
      adversarial: out.adversarial, contradictions: out.hypothesis.contradictions,
      ranking, recommendedAction: { alternative: recommended, summary: recommended === 'R2'
        ? `Proposer à la revue humaine une vérification de terrain coordonnée (R2) sur ${b.street} ${b.from} → ${b.to} avant l’ouverture des excavations non commencées ; ne pas engager d’intervention coordonnée (R1) tant que tracés, état des arbres et calendrier des façades ne sont pas connus.`
        : `Proposer une intervention coordonnée (R1) à la revue humaine.` },
      humanApproval: 'Revue humaine obligatoire : coordination SF Public Works (voirie et Bureau of Urban Forestry), DBI et titulaires. CORE n’autorise ni n’applique aucune action.',
      invalidatedIf: ['Les permis à venir sont annulés, reportés hors horizon ou déjà terminés.', 'Les tranchées réelles sont éloignées des arbres (tracé vérifié).', 'Les arbres exposés font l’objet d’un abattage approuvé.', 'Les permis de bâtiment récents sont sans emprise sur le trottoir.', `Un nouvel instantané ne reproduit pas la relation (empreinte différente).`],
    };
  }

  // ---------- Human decision gateway (fail closed) ----------
  const BRIEF_KEYS = ['version', 'snapshot', 'params', 'discovered', 'location', 'whyItMatters', 'domains', 'evidence', 'observationVsInference', 'hypothesis', 'baseline', 'alternatives', 'evaluation', 'constraints', 'uncertainty', 'missingData', 'stakeholders', 'adversarial', 'contradictions', 'ranking', 'recommendedAction', 'humanApproval', 'invalidatedIf'];
  function issueCityDecision(input, ctx) {
    const checks = []; const add = (id, label, pass, detail) => { checks.push({ id, label, pass: !!pass, detail: detail || null }); return !!pass; };
    const reject = reason => ({ state: STATES.REJECT, reason, checks, authorizes: false, humanReview: 'Aucune proposition exploitable.' });
    let b; try { b = JSON.parse(JSON.stringify(input)); } catch (_) { return reject('Note de décision illisible.'); }
    try {
      if (!add('contract', 'note de décision complète, sans champ inconnu', b && typeof b === 'object' && !Array.isArray(b) && BRIEF_KEYS.every(k => k in b) && Object.keys(b).every(k => BRIEF_KEYS.includes(k)) && b.version === 'core-decision-brief-v1')) return reject('Preuves ou champs essentiels manquants.');
      const p = { ...DEFAULTS, ...b.params };
      if (!add('params', 'paramètres valides', ['treeBufferM', 'frontageM', 'buildingRecencyDays', 'investigationDays', 'horizonDays', 'maxShiftDays', 'leadDays'].every(k => Number.isFinite(p[k]) && p[k] >= 0 && p[k] <= 3650))) return reject('Paramètres invalides.');
      const verified = REQUIRED_DATASETS.every(k => ctx.datasets[k] && ctx.datasets[k].verified === 'ok' && b.snapshot.datasets[k] && b.snapshot.datasets[k].sha256 === ctx.datasets[k].sha256);
      if (!add('snapshot', 'sources vérifiables (SHA-256 identiques et vérifiés)', verified && b.snapshot.generated_at === ctx.manifest.generated_at)) return reject('Enregistrements sources non vérifiables.');
      if (!add('location', 'tronçon du corridor', ctx.segments.has(b.location.segment_cnn))) return reject('Relation géographique invalide.');
      const dates = b.evidence.excavations.every(e => /^\d{4}-\d{2}-\d{2}$/.test(e.start) && /^\d{4}-\d{2}-\d{2}$/.test(e.end) && e.start <= e.end);
      if (!add('dates', 'dates cohérentes', dates)) return reject('Dates incohérentes.');
      // Independent deterministic recomputation
      const r = quiet(ctx, p);
      if (!add('discovery', 'découverte recalculée à l’identique', r && r.block && r.block.seg === b.location.segment_cnn)) return reject('La découverte ne correspond pas au recalcul.');
      const brief2 = synthesize(ctx, r, p);
      const same = k => C.stable(brief2[k]) === C.stable(b[k]);
      if (!add('evidence', 'preuves identiques au recalcul', same('evidence') && same('hypothesis') && same('domains'))) return reject('Preuves absentes, modifiées ou incohérentes.');
      if (!add('domains', 'au moins trois domaines reliés', b.domains.filter(d => ['infrastructure', 'nature', 'buildings'].includes(d)).length === 3)) return reject('Relation inter-domaines insuffisante.');
      if (!add('evaluation', 'résultats identiques au recalcul déterministe', same('evaluation') && same('alternatives'))) return reject('Les résultats ne correspondent pas au recalcul déterministe.');
      if (!add('adversarial', 'revue adversariale recalculée à l’identique', same('adversarial') && same('contradictions'))) return reject('La revue adversariale ne correspond pas au recalcul.');
      if (!add('ranking', 'classement et action recommandée recalculés', same('ranking') && same('recommendedAction'))) return reject('Recommandation incohérente avec le recalcul.');
      const rec = r.evaluations.find(e => e.id === b.recommendedAction.alternative);
      if (!add('constraints', 'action recommandée sans violation de contrainte', rec && rec.violations.length === 0, rec && rec.violations.join(' ; '))) return reject('L’action recommandée viole les contraintes déclarées.');
      const failed = b.adversarial.filter(x => !x.pass);
      const complete = rec.metrics.evidenceCompleteness === 1;
      add('essential-evidence', 'preuves essentielles de l’action disponibles', complete, complete ? null : rec.missingEvidence.join(', '));
      add('robust', 'relation maintenue sous les perturbations', !failed.length, failed.map(x => `${x.id} ${x.label}`).join(' ; ') || null);
      const base = { checks, authorizes: false, recommended: b.recommendedAction.alternative, humanReview: b.humanApproval };
      if (!complete) return { ...base, state: STATES.MORE, reason: `L’action ${b.recommendedAction.alternative} exige des preuves absentes : ${rec.missingEvidence.join(', ')}.` };
      // An intervention (R1) must survive every perturbation. An investigation (R2) exists to resolve uncertainty:
      // it is eligible when the relation survives a majority of perturbations, with the sensitivity disclosed.
      const isInvestigation = b.recommendedAction.alternative === 'R2', majority = b.adversarial.length - failed.length >= Math.ceil(b.adversarial.length / 2) + (b.adversarial.length % 2 ? 0 : 1);
      add('sensitivity-rule', isInvestigation ? 'investigation : relation maintenue sous une majorité de perturbations' : 'intervention : relation maintenue sous toutes les perturbations', isInvestigation ? majority : !failed.length);
      if (isInvestigation ? !majority : failed.length) return { ...base, state: STATES.MORE, reason: `Relation trop sensible aux hypothèses : ${failed.map(x => x.label.toLowerCase()).join(' ; ')}. Compléter les preuves avant revue.` };
      return { ...base, state: STATES.ELIGIBLE, reason: `${b.recommendedAction.summary} Relation maintenue sous ${b.adversarial.length - failed.length}/${b.adversarial.length} perturbations${failed.length ? ` (sensible à : ${failed.map(x => x.label.toLowerCase()).join(' ; ')})` : ''} ; ${b.missingData.length} manque(s) déclaré(s).` };
    } catch (err) { return reject('Note invalide : ' + (err && err.message ? err.message : 'erreur')); }
  }
  function run(ctx, options) { const events = []; const gen = investigate(ctx, options); let r; for (;;) { const n = gen.next(); if (n.done) { r = n.value; break; } events.push(n.value); } return { events, result: r }; }

  const CITY = { DEFAULTS, ROLES, STATES, PERTURBATIONS, providers, registerProvider, investigate, run, issueCityDecision, blockSignals, synthesize };
  if (typeof module !== 'undefined' && module.exports) module.exports = CITY; else root.CORE_CITY = CITY;
})(typeof globalThis !== 'undefined' ? globalThis : this);
