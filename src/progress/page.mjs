// CORE V8 — progress page: separate dimensions + the Kardashev energy scale (formula, uncertainty, source, trend).
import * as NAV from '../shell/nav.mjs';
import * as P from './progress.mjs';
import { FILES } from '../civilization/analyses.mjs';
import { buildMissions } from '../civilization/missions.mjs';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const get = async u => { const r = await fetch(u); if (!r.ok) throw Error(`${u} : HTTP ${r.status}`); return r.json(); };
NAV.render($('core-nav'), { active: 'progress' });

function chart(series) {
  const W = 720, H = 220, L = 52, R = 16, T = 14, B = 30, x0 = series[0].year, x1 = series.at(-1).year;
  const lo = Math.floor(Math.min(...series.map(s => s.K)) * 100) / 100, hi = Math.ceil(Math.max(...series.map(s => s.K)) * 100) / 100;
  const X = y => L + (y - x0) / (x1 - x0) * (W - L - R), Y = k => T + (hi - k) / (hi - lo) * (H - T - B);
  const ticks = []; for (let k = lo; k <= hi + 1e-9; k += 0.01) ticks.push(+k.toFixed(2));
  const years = series.filter(s => s.year % 10 === 0 || s.year === x1).map(s => s.year);
  const path = series.map((s, i) => `${i ? 'L' : 'M'}${X(s.year).toFixed(1)},${Y(s.K).toFixed(1)}`).join('');
  const band = series.map((s, i) => `${i ? 'L' : 'M'}${X(s.year).toFixed(1)},${Y(s.high).toFixed(1)}`).join('') + series.slice().reverse().map(s => `L${X(s.year).toFixed(1)},${Y(s.low).toFixed(1)}`).join('') + 'Z';
  return `<div class="pg-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Valeur K de ${x0} à ${x1}, de ${series[0].K.toFixed(3)} à ${series.at(-1).K.toFixed(3)}" data-x0="${x0}" data-x1="${x1}" data-l="${L}" data-r="${R}" data-w="${W}">
    ${ticks.map(k => `<line x1="${L}" x2="${W - R}" y1="${Y(k)}" y2="${Y(k)}" class="grid"/><text x="${L - 8}" y="${Y(k) + 4}" class="ax" text-anchor="end">${k.toFixed(2)}</text>`).join('')}
    ${years.map(y => `<text x="${X(y)}" y="${H - 8}" class="ax" text-anchor="middle">${y}</text>`).join('')}
    <path d="${band}" class="band"/><path d="${path}" class="line"/>
    <circle cx="${X(x1)}" cy="${Y(series.at(-1).K)}" r="4" class="dot"/><text x="${X(x1) - 8}" y="${Y(series.at(-1).K) - 10}" class="lbl" text-anchor="end">${series.at(-1).K.toFixed(3)} (${x1})</text>
    <line class="cross" y1="${T}" y2="${H - B}" x1="-10" x2="-10"/><circle class="hov" r="4" cx="-10" cy="-10"/></svg><div class="pg-tip" hidden></div></div>`;
}
function wireHover(series) {
  const box = document.querySelector('.pg-chart'), svg = box.querySelector('svg'), tip = box.querySelector('.pg-tip'), d = svg.dataset;
  svg.addEventListener('pointermove', e => {
    const r = svg.getBoundingClientRect(), sx = (e.clientX - r.left) / r.width * +d.w, yr = Math.round(+d.x0 + (sx - +d.l) / (+d.w - +d.l - +d.r) * (+d.x1 - +d.x0));
    const s = series.find(x => x.year === Math.max(+d.x0, Math.min(+d.x1, yr))); if (!s) return;
    const px = +d.l + (s.year - +d.x0) / (+d.x1 - +d.x0) * (+d.w - +d.l - +d.r), path = svg.querySelector('.line').getAttribute('d'), m = path.match(new RegExp(`[ML]${px.toFixed(1)},([\\d.]+)`));
    svg.querySelector('.cross').setAttribute('x1', px); svg.querySelector('.cross').setAttribute('x2', px); if (m) { svg.querySelector('.hov').setAttribute('cx', px); svg.querySelector('.hov').setAttribute('cy', m[1]); }
    tip.hidden = false; tip.textContent = `${s.year} · K ${s.K.toFixed(3)} (${s.low.toFixed(3)}–${s.high.toFixed(3)}) · ${s.terawatts.toFixed(1)} TW`;
    tip.style.left = `${Math.min(r.width - 220, Math.max(0, (px / +d.w) * r.width - 110))}px`;
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; svg.querySelector('.cross').setAttribute('x1', -10); svg.querySelector('.cross').setAttribute('x2', -10); svg.querySelector('.hov').setAttribute('cx', -10); });
}

(async () => {
  try {
    const [energy, mob, problems] = await Promise.all([get('data/progress/energy.json'), get('data/mobility/results.json'), get('data/problems/registry.json')]);
    const D = {}; await Promise.all(Object.entries(FILES).map(async ([k, p]) => { D[k] = await get(p); }));
    const missions = buildMissions(D, await get('data/agents/sf-civilization.json'));
    let civ = null; try { civ = JSON.parse(localStorage.getItem('core.civ.v72') || 'null'); } catch {}
    const dims = P.dimensions({ missions, mobility: mob, civ, energy, problems: problems.problems });
    $('pg-body').innerHTML = dims.map(d => `<section class="me-card pg-dim" data-dim="${esc(d.id)}"><h2>${esc(d.title)}</h2>
      <p class="pg-val"><b>${d.value == null ? '—' : esc(d.value)}</b> <span>${esc(d.unit)}</span></p><p>${esc(d.what)}</p>
      <p class="fine">Source : ${esc(d.source)}</p><p class="fine pg-not">Ne veut pas dire : ${esc(d.not)}</p></section>`).join('');
    const S = P.kSeries(energy.series.total.values), last = S.at(-1), y = String(last.year), parts = ['coal', 'petroleum', 'naturalGas', 'nuclear', 'renewablesAndOther'];
    const NAMES = { coal: 'Charbon', petroleum: 'Pétrole et autres liquides', naturalGas: 'Gaz naturel', nuclear: 'Nucléaire', renewablesAndOther: 'Renouvelables et autres' };
    const mix = parts.map(k => ({ k, q: energy.series[k].values[y] })), max = Math.max(...mix.map(m => m.q));
    $('pg-k').innerHTML = `<h2 id="pg-k-h">Échelle de Kardashev — une mesure d’énergie, à part</h2>
      <p class="pg-val"><b>K ≈ ${last.K.toFixed(3)}</b> <span>en ${last.year} · intervalle ${last.low.toFixed(3)}–${last.high.toFixed(3)}</span></p>
      <p><code>${esc(last.formula)}</code>. P = ${last.quadBtu.toFixed(1)} quadrillions de Btu/an × ${P.QBTU_J.toExponential(6)} J ÷ ${P.YEAR_S} s = <b>${last.terawatts.toFixed(2)} TW</b>. Le type I (K = 1) correspondrait à 10<sup>16</sup> W, soit environ ${(1e16 / last.watts).toFixed(0)} fois plus.</p>
      ${chart(S)}
      <details><summary>Tableau des valeurs</summary><div class="scn-table"><table class="tbl"><thead><tr><th>Année</th><th>Énergie (quad Btu)</th><th>TW</th><th>K</th></tr></thead><tbody>${S.slice().reverse().map(s => `<tr><td>${s.year}</td><td>${s.quadBtu.toFixed(1)}</td><td>${s.terawatts.toFixed(2)}</td><td>${s.K.toFixed(4)}</td></tr>`).join('')}</tbody></table></div></details>
      <h3>Composition en ${last.year} (quadrillions de Btu)</h3><ul class="pg-bars">${mix.map(m => `<li><span>${esc(NAMES[m.k])}</span><i style="width:${(m.q / max * 100).toFixed(1)}%"></i><b>${m.q.toFixed(1)}</b></li>`).join('')}</ul>
      <div class="pp-unc"><b>Incertitude et limites</b><p>La bande autour de la courbe correspond à ±${last.rel * 100} % sur l’énergie (hypothèse CORE couvrant les écarts de méthode et d’estimation), soit ±${((last.high - last.low) / 2).toFixed(3)} sur K.</p>${energy.caveats.map(c => `<p>${esc(c)}</p>`).join('')}<p>K mesure l’énergie utilisée, pas le progrès humain : plus d’énergie peut aussi vouloir dire plus d’émissions.</p></div>
      <p class="fine">${esc(energy.terms.acknowledgment)}. ${esc(energy.source.name)} — série <code>${esc(energy.series.total.id)}</code>, mise à jour ${esc(energy.source.published)}. Conditions : ${esc(energy.terms.status)} (<a href="${esc(energy.terms.url)}" rel="noopener">EIA</a>, vérifiées le ${esc(energy.terms.checked)}). Reproduire : <code>node scripts/progress-energy.mjs --fetch</code>.</p>`;
    wireHover(S);
    globalThis.CORE_PROGRESS = { dims, K: last };
  } catch (e) { $('pg-body').innerHTML = `<p class="cmp-err">Progrès indisponible : ${esc(e.message)}</p>`; globalThis.CORE_PROGRESS = { error: e.message }; }
})();
