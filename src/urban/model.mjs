// Exploratory deterministic fluid point queue at ONE approach, not a calibrated corridor forecast.
export const VERSION = 'core-fluid-queue-1';
export const REFERENCE = 'https://www.fhwa.dot.gov/publications/research/operations/tft/chap9.pdf';
export const DEFAULT = { demand: 900, lanes: 2, saturation: 1600, green: 0.45, cycle: 90, seconds: 900, speed: 30 };
const BOUNDS = { demand: [0, 8000], lanes: [1, 4], saturation: [400, 2400], green: [0.1, 0.85], cycle: [20, 180], seconds: [60, 3600], speed: [5, 60] };
export function validate(p) {
  if (!p || typeof p !== 'object' || Object.keys(p).sort().join() !== Object.keys(DEFAULT).sort().join()) throw Error('Expected exactly the seven declared traffic assumptions');
  for (const [k, [lo, hi]] of Object.entries(BOUNDS)) if (!Number.isFinite(p[k]) || p[k] < lo || p[k] > hi || (['lanes', 'cycle', 'seconds'].includes(k) && !Number.isInteger(p[k]))) throw Error(`Invalid ${k}: ${lo}–${hi}`);
  return { ...p };
}
export function solve(input, segment) {
  const p = validate(input);
  if (!segment || typeof segment.id !== 'string' || !Number.isFinite(segment.lengthM) || segment.lengthM < 5 || segment.lengthM > 5000) throw Error('Unsupported mapped approach');
  let queue = 0, maxQueue = 0, area = 0, served = 0;
  for (let t = 0; t < p.seconds; t++) {
    const incoming = p.demand / 3600;
    const greenSeconds = Math.max(0, Math.min(t + 1, Math.floor(t / p.cycle) * p.cycle + p.cycle * p.green) - t);
    const out = Math.min(queue + incoming, p.lanes * p.saturation / 3600 * greenSeconds);
    const next = Math.max(0, queue + incoming - out);
    area += (queue + next) / 2; queue = next; served += out; maxQueue = Math.max(maxQueue, queue);
  }
  const arrivals = p.demand * p.seconds / 3600, capacity = p.lanes * p.saturation * p.green;
  return { arrivals, served, remaining: queue, maxQueue, meanQueue: area / p.seconds,
    accruedDelayPerArrivalS: arrivals ? area / arrivals : 0, vehicleDelaySeconds: area,
    throughputVph: served * 3600 / p.seconds, capacityVph: capacity, utilization: p.demand / capacity,
    freeFlowSeconds: segment.lengthM / (p.speed / 3.6),
    exceedsApproxStorage: maxQueue * 7.5 / p.lanes > segment.lengthM,
    // shortcut: no spillback/turns/transit/pedestrian delays; upgrade only with counts, signal plans and a validated network model.
    censored: queue > 0.01 };
}
export function compare(request, segment) {
  if (!request || !Array.isArray(request.scenarios) || request.scenarios.length < 2 || request.scenarios.length > 4) throw Error('Compare 2–4 scenarios, baseline first');
  const rows = request.scenarios.map((s, i) => {
    if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 60) throw Error('Scenario name required (60 characters maximum)');
    const parameters = validate(s.parameters), metrics = solve(parameters, segment);
    const sensitivityDemandVph = [0.8, 1.2].map(f => Math.min(8000, parameters.demand * f));
    const sensitivity = sensitivityDemandVph.map(demand => solve({ ...parameters, demand }, segment).accruedDelayPerArrivalS);
    return { name: s.name, index: i, parameters, metrics, sensitivityDemandVph, sensitivityDelayS: sensitivity };
  });
  const baseline = rows[0].metrics;
  for (const r of rows) r.delta = { accruedDelayS: r.metrics.accruedDelayPerArrivalS - baseline.accruedDelayPerArrivalS, throughputVph: r.metrics.throughputVph - baseline.throughputVph, maxQueue: r.metrics.maxQueue - baseline.maxQueue };
  const candidates = rows.filter(r => !r.metrics.exceedsApproxStorage);
  const min = candidates.length ? Math.min(...candidates.map(r => r.metrics.accruedDelayPerArrivalS)) : null;
  const best = candidates.filter(r => Math.abs(r.metrics.accruedDelayPerArrivalS - min) < 1e-6);
  const comparable = rows.every(r => r.parameters.demand === rows[0].parameters.demand && r.parameters.seconds === rows[0].parameters.seconds);
  return { model: VERSION, rows, best: comparable && best.length === 1 ? best[0].index : null,
    verdict: !comparable ? 'inconclusive: demand or duration changed; objectives are not directly comparable' : best.length !== 1 ? 'inconclusive: tie or storage constraint exceeded' : 'lowest accrued delay under this model and storage constraint; not a real-world recommendation' };
}
export function distance(a,b) { const rad = x => x * Math.PI / 180, x = rad(b[0]-a[0])*Math.cos(rad((a[1]+b[1])/2)), y=rad(b[1]-a[1]); return 6371008.8*Math.hypot(x,y); }
export async function digest(value) { const bytes = new TextEncoder().encode(JSON.stringify(value)); return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x=>x.toString(16).padStart(2,'0')).join(''); }
