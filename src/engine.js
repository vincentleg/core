// CORE engine v0 — signalised-corridor traffic simulator + agents + Passerelle.
// Point-queue model: vehicles reach the stop line at free-flow time, wait FIFO,
// and discharge on green at the saturation headway. One engine drives both the
// thousands of agent runs and the live 3D view (no second "animation" model).

const CORRIDOR = {
  name: 'Corridor pilote (synthétique)',
  xs: [0, 180, 360, 560, 740],          // stop-line positions along the arterial (m)
  speed: 12.5,                          // free-flow speed (m/s) = 45 km/h
  entryLen: 200,                        // upstream entry link (m)
  lanes: { EB: 2, WB: 2, N: 1, S: 1 },
  headway: 2.0,                         // saturation headway per lane (s)
  lost: 3,                              // yellow + all-red per change (s)
  minCrossGreen: 15,                    // pedestrian crossing time (s)
  minArtGreen: 20,
  T: 1800,                              // demand period (s)
  drain: 900,                           // extra time to clear queues (s)
};

const BASE_DEMAND = { EB: 1100, WB: 1000, cross: [320, 380, 300, 420, 340] }; // veh/h

const TWISTS = {
  pointe:   { id: 'pointe',   label: 'Heure de pointe +20 %', demandMul: 1.2 },
  chantier: { id: 'chantier', label: 'Chantier : 1 voie fermée vers l’est au carrefour 4', closed: { i: 3, dir: 'EB' } },
  pluie:    { id: 'pluie',    label: 'Pluie : débit des feux −15 %', headwayMul: 1 / 0.85 },
  aleas:    { id: 'aleas',    label: 'Autre jour : arrivées tirées autrement', seed: 7 },
  evenement:{ id: 'evenement',label: 'Sortie de concert : rue transversale du carrefour 3 ×2,5', crossBoost: { i: 2, mul: 2.5 } },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function arrivals(rate, T, rand) {
  const out = []; if (rate <= 0) return out;
  const lam = rate / 3600; let t = -Math.log(1 - rand()) / lam;
  while (t < T) { out.push(t); t += -Math.log(1 - rand()) / lam; }
  return out;
}

// A scenario = demand + conditions. Same scenario => identical arrivals for every plan (fair comparison).
function makeScenario(twistIds = [], extra = {}) {
  twistIds = [...new Set(twistIds)];
  const tw = twistIds.map(id => TWISTS[id]).filter(Boolean);
  const mul = tw.reduce((m, t) => m * (t.demandMul || 1), 1);
  const hw = tw.reduce((m, t) => m * (t.headwayMul || 1), 1);
  const seed = tw.reduce((s, t) => t.seed || s, 1);
  const closed = tw.filter(t => t.closed).map(t => t.closed).concat(extra.closed || []);
  const rand = rng(seed * 9973);
  const boost = i => tw.reduce((m, t) => m * (t.crossBoost && t.crossBoost.i === i ? t.crossBoost.mul : 1), 1);
  const T = CORRIDOR.T;
  const gen = {
    EB: arrivals(BASE_DEMAND.EB * mul, T, rand).map(t => t + CORRIDOR.entryLen / CORRIDOR.speed),
    WB: arrivals(BASE_DEMAND.WB * mul, T, rand).map(t => t + CORRIDOR.entryLen / CORRIDOR.speed),
    N: BASE_DEMAND.cross.map((r, i) => arrivals(r * mul * boost(i) / 2, T, rand)),
    S: BASE_DEMAND.cross.map((r, i) => arrivals(r * mul * boost(i) / 2, T, rand)),
  };
  return { twists: twistIds.slice(), headway: CORRIDOR.headway * hw, closed, gen, label: tw.map(t => t.label).join(' + ') || 'Conditions normales' };
}

function basePlan() { // assumed current timing: fixed 90 s cycle, 50/50, no coordination
  return { C: 90, g: [42, 42, 42, 42, 42], o: [0, 0, 0, 0, 0], name: 'Plan de référence' };
}

class Sim {
  constructor(plan, sc) {
    const n = CORRIDOR.xs.length; this.plan = plan; this.sc = sc; this.t = 0; this.n = n;
    this.ap = [];
    for (let i = 0; i < n; i++) for (const d of ['EB', 'WB', 'N', 'S']) {
      let lanes = CORRIDOR.lanes[d];
      if (sc.closed.some(c => c.i === i && c.dir === d)) lanes = Math.max(1, lanes - 1);
      const arr = d === 'EB' ? (i === 0 ? sc.gen.EB.slice() : []) : d === 'WB' ? (i === n - 1 ? sc.gen.WB.slice() : []) : sc.gen[d][i].slice();
      const org = (d === 'EB' && i === 0) || (d === 'WB' && i === n - 1) ? arr.slice() : [];
      this.ap.push({ i, d, lanes, arr, org, served: 0, credit: 0, art: d === 'EB' || d === 'WB' });
    }
    this.delay = 0; this.servedN = 0; this.stops = 0; this.artTT = []; this.crossDelay = 0; this.crossN = 0;
    this.byInt = new Float64Array(n);
  }
  A(i, d) { return this.ap[i * 4 + ['EB', 'WB', 'N', 'S'].indexOf(d)]; }
  phase(i, t) {
    const { C, g, o } = this.plan, m = (((t - o[i]) % C) + C) % C;
    if (m < g[i]) return 'ART'; if (m >= g[i] + CORRIDOR.lost && m < C - CORRIDOR.lost) return 'CROSS'; return 'ALLRED';
  }
  step() {
    const t = this.t, cap = 1 / this.sc.headway, xs = CORRIDOR.xs, v = CORRIDOR.speed;
    for (const a of this.ap) {
      const ph = this.phase(a.i, t), green = a.art ? ph === 'ART' : ph === 'CROSS';
      if (!green) { a.credit = 0; continue; }
      a.credit = Math.min(a.credit + cap * a.lanes, a.lanes);
      while (a.credit >= 1 && a.served < a.arr.length && a.arr[a.served] <= t) {
        const w = t - a.arr[a.served]; this.delay += w; this.servedN++; this.byInt[a.i] += w; if (w > 2) this.stops++;
        if (a.art) {
          const nxt = a.d === 'EB' ? a.i + 1 : a.i - 1;
          const org = a.org[a.served];
          if (nxt >= 0 && nxt < this.n) { const b = this.A(nxt, a.d); b.arr.push(t + Math.abs(xs[nxt] - xs[a.i]) / v); b.org.push(org); }
          else this.artTT.push(t - org + CORRIDOR.entryLen / v);
        } else { this.crossDelay += w; this.crossN++; }
        a.served++; a.credit -= 1;
      }
    }
    this.t++;
  }
  run() {
    const end = CORRIDOR.T + CORRIDOR.drain; while (this.t < end) this.step();
    let unserved = 0, pen = 0;
    for (const a of this.ap) for (let k = a.served; k < a.arr.length; k++) if (a.arr[k] < end) { unserved++; pen += end - a.arr[k]; }
    const tot = this.servedN + unserved, D = this.delay + pen;
    return {
      avgDelay: D / Math.max(1, tot), stopsPct: 100 * this.stops / Math.max(1, this.servedN),
      artTT: this.artTT.reduce((s, x) => s + x, 0) / Math.max(1, this.artTT.length),
      crossDelay: this.crossDelay / Math.max(1, this.crossN), unserved, vehicles: tot,
      byInt: Array.from(this.byInt, x => x / Math.max(1, tot)),
    };
  }
}

const evaluate = (plan, sc) => new Sim(plan, sc).run();

// ---------- Agents bâtisseurs: they generate plans, the engine scores them ----------
function clampPlan(p) {
  const C = p.C, maxG = C - 2 * CORRIDOR.lost - CORRIDOR.minCrossGreen;
  return { ...p, g: p.g.map(x => Math.max(CORRIDOR.minArtGreen, Math.min(maxG, Math.round(x)))), o: p.o.map(x => ((Math.round(x) % C) + C) % C) };
}
function greenWave(C, share, dir = 'EB') { // offsets from travel times: the classic "onde verte"
  const xs = CORRIDOR.xs, v = CORRIDOR.speed, g = Math.round((C - 6) * share);
  return clampPlan({ C, g: xs.map(() => g), o: xs.map(x => dir === 'EB' ? x / v : (xs[xs.length - 1] - x) / v), agent: 'Onde verte' });
}

function* builderAgents(budget, seed = 42) {
  const r = rng(seed); const n = CORRIDOR.xs.length; const out = [];
  const randPlan = () => { const C = 60 + 5 * Math.floor(r() * 13); const maxG = C - 6 - CORRIDOR.minCrossGreen;
    return clampPlan({ C, g: Array.from({ length: n }, () => 20 + r() * (maxG - 20)), o: Array.from({ length: n }, () => r() * C), agent: 'Exploration' }); };
  // 1) heuristics (green waves both directions, several cycles and splits)
  for (const C of [70, 80, 90, 100, 110]) for (const s of [0.55, 0.6, 0.65]) for (const d of ['EB', 'WB']) yield greenWave(C, s, d);
  // 2) exploration, 3) refinement around the best (handled by caller feeding back scores)
  while (true) yield randPlan();
}
function mutate(p, r) {
  const q = { ...p, g: p.g.slice(), o: p.o.slice(), agent: 'Affinage' };
  const k = Math.floor(r() * 3);
  if (k === 0) { const i = Math.floor(r() * q.g.length); q.g[i] += (r() - 0.5) * 12; }
  else if (k === 1) { const i = Math.floor(r() * q.o.length); q.o[i] += (r() - 0.5) * 20; }
  else { const dC = r() < 0.5 ? -5 : 5; q.C = Math.max(60, Math.min(120, q.C + dC)); }
  return clampPlan(q);
}

// Runs `budget` variants on the nominal scenario. onProgress({done, best}) for the UI. Chunked & async-friendly.
async function searchPlans({ budget = 1500, scenario, onProgress, yieldEvery = 40, seed = 42 }) {
  const r = rng(seed + 1); const gen = builderAgents(budget, seed); const scored = [];
  const base = evaluate(basePlan(), scenario);
  for (let k = 0; k < budget; k++) {
    let p;
    if (k > budget * 0.45 && scored.length) { const top = scored.slice(0, 12); p = mutate(top[Math.floor(r() * top.length)].plan, r); }
    else p = gen.next().value;
    const m = evaluate(p, scenario); scored.push({ plan: p, m });
    if (k % 20 === 19 || k === budget - 1) scored.sort((a, b) => a.m.avgDelay - b.m.avgDelay);
    if (onProgress && (k % yieldEvery === 0 || k === budget - 1)) { onProgress({ done: k + 1, budget, best: scored[0], base }); await new Promise(res => setTimeout(res, 0)); }
  }
  scored.sort((a, b) => a.m.avgDelay - b.m.avgDelay);
  return { base, ranked: scored };
}

// ---------- Agents adversaires + Passerelle ----------
const STRESS = [[], ['pointe'], ['chantier'], ['pluie'], ['aleas'], ['pointe', 'pluie']];

function stressTest(plans, extraTwists = []) {
  const scs = STRESS.map(t => makeScenario(t.concat(extraTwists)));
  const baseM = scs.map(sc => evaluate(basePlan(), sc));
  return plans.map(p => {
    const rows = scs.map((sc, j) => { const m = evaluate(p, sc); return { label: sc.label, base: baseM[j].avgDelay, plan: m.avgDelay, ratio: m.avgDelay / baseM[j].avgDelay }; });
    const worst = rows.reduce((a, b) => (b.ratio > a.ratio ? b : a));
    return { plan: p, rows, worstRatio: worst.ratio, worst, gain: 1 - rows[0].ratio };
  }).sort((a, b) => a.worstRatio - b.worstRatio);
}

// Robust refinement: builders mutate the best plans, adversaries score each mutant on every stress case.
async function robustRefine({ candidates, extra = [], budget = 240, onProgress, seed = 99 }) {
  const r = rng(seed); const scs = STRESS.map(t => makeScenario(t.concat(extra)));
  const baseM = scs.map(sc => evaluate(basePlan(), sc).avgDelay);
  const score = p => { const rows = scs.map((sc, j) => { const d = evaluate(p, sc).avgDelay; return { label: sc.label, base: baseM[j], plan: d, ratio: d / baseM[j] }; });
    const worst = rows.reduce((a, b) => (b.ratio > a.ratio ? b : a)); return { plan: p, rows, worstRatio: worst.ratio, worst, gain: 1 - rows[0].ratio }; };
  let pool = candidates.map(score).sort((a, b) => a.worstRatio - b.worstRatio); let sims = candidates.length * scs.length;
  for (let k = 0; k < budget; k++) {
    const parent = pool[Math.floor(r() * Math.min(6, pool.length))].plan;
    const child = score({ ...mutate(parent, r), agent: 'Robustesse' }); sims += scs.length;
    pool.push(child); pool.sort((a, b) => a.worstRatio - b.worstRatio || b.gain - a.gain); pool = pool.slice(0, 30);
    if (onProgress && (k % 10 === 0 || k === budget - 1)) { onProgress({ done: k + 1, budget, best: pool[0], sims }); await new Promise(res => setTimeout(res, 0)); }
  }
  return { ranked: pool, sims };
}

// The Passerelle: deterministic rules, never an LLM. A plan is only ever *proposed* for a human signature.
function issuePermit(st, world = {}) {
  const pct = x => Math.round(x * 100);
  const failing = st.rows.filter(r => r.ratio > 1.0);
  let state, reason;
  if (failing.length) { state = 'SUSPENDU'; reason = `Le plan dégrade la situation dans ${failing.length} cas testé(s) : ${failing.map(f => f.label).join(' ; ')}.`; }
  else if (st.gain < 0.05) { state = 'BLOQUÉ'; reason = 'Gain inférieur à 5 % : ne justifie pas un changement sur le terrain.'; }
  else { state = 'PRÊT POUR SIGNATURE'; reason = 'Meilleur que le plan de référence dans tous les cas testés.'; }
  return {
    action: `Reprogrammer les feux des ${CORRIDOR.xs.length} carrefours du corridor pilote`,
    plan: st.plan, state, reason,
    gainNominal: pct(st.gain), gainWorst: pct(1 - st.worstRatio), worstCase: st.worst.label,
    tests: st.rows.map(r => ({ cas: r.label, retardRef_s: +r.base.toFixed(1), retardPlan_s: +r.plan.toFixed(1), gain_pct: pct(1 - r.ratio) })),
    hypotheses: [
      'Demande de trafic synthétique, non calibrée sur des comptages réels.',
      'Géométrie du corridor simplifiée ; tous les véhicules vont tout droit.',
      'Plan de référence supposé (cycle 90 s, sans coordination), non relevé sur le terrain.',
      `Temps de traversée piétonne garanti ≥ ${CORRIDOR.minCrossGreen} s à chaque carrefour.`,
    ],
    validite: 'Valable tant que la demande reste dans la plage testée (jusqu’à +20 %) et sans nouveau chantier non testé.',
    reversibilite: 'Totalement réversible : retour au plan précédent en une reprogrammation.',
    signature: 'Ingénieur trafic de la ville (signature humaine obligatoire ; CORE n’applique rien).',
    monde: world.label || 'Conditions du test',
  };
}

const CORE = { CORRIDOR, BASE_DEMAND, TWISTS, rng, makeScenario, basePlan, Sim, evaluate, greenWave, searchPlans, robustRefine, stressTest, issuePermit, STRESS };
if (typeof module !== 'undefined') module.exports = CORE; else globalThis.CORE = CORE;
