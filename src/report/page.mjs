// CORE V8 — report page (report.html#mission=<id>): 20 sections, printable to PDF by the browser.
import * as NAV from '../shell/nav.mjs';
import { FILES } from '../civilization/analyses.mjs';
import { buildMissions } from '../civilization/missions.mjs';
import { sections } from './report.mjs';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const get = async u => { const r = await fetch(u); if (!r.ok) throw Error(`${u} : HTTP ${r.status}`); return r.json(); };
NAV.render($('core-nav'), { active: 'explore' });
(async () => {
  try {
    const D = {}; await Promise.all(Object.entries(FILES).map(async ([k, p]) => { D[k] = await get(p); }));
    const missions = buildMissions(D, await get('data/agents/sf-civilization.json')), [mobility, manifest] = await Promise.all([get('data/mobility/results.json'), get('data/mobility/manifest.json')]);
    let civ = null; try { civ = JSON.parse(localStorage.getItem('core.civ.v72') || 'null'); } catch {}
    const pick = () => { const id = new URLSearchParams(location.hash.slice(1)).get('mission'); return missions.find(m => m.id === id) || missions.find(m => m.id === 'mission.sf.mobility'); };
    $('rp-mission').innerHTML = missions.map(m => `<option value="${esc(m.id)}">${esc(m.title)}</option>`).join('');
    const render = () => { const m = pick(), S = sections(m, { mobility, manifest, civ }); $('rp-mission').value = m.id; document.title = `CORE — ${m.title} — proposition soumise à examen`;
      $('rp-doc').innerHTML = `<header class="rp-head"><p class="le-eyebrow">CORE · dossier de mission · proposition soumise à examen</p><h1>${esc(m.title)}</h1><p class="fine">Prototype local · pas une recommandation · aucune revue humaine vérifiée · impact réel vérifié : aucun</p></header>
        <nav class="rp-toc" aria-label="Sommaire"><ol>${S.map(s => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('')}</ol></nav>
        ${S.map(s => `<section id="${s.id}" class="rp-sec"><h2><span>${s.n}.</span> ${esc(s.title)}</h2>${s.html}</section>`).join('')}`;
      globalThis.CORE_REPORT = { mission: m.id, sections: S.length }; };
    $('rp-mission').onchange = e => { history.replaceState(null, '', `#mission=${encodeURIComponent(e.target.value)}`); render(); };
    $('rp-print').onclick = () => print(); addEventListener('hashchange', render); render();
  } catch (e) { $('rp-doc').innerHTML = `<p class="cmp-err">Rapport indisponible : ${esc(e.message)}</p>`; globalThis.CORE_REPORT = { error: e.message }; }
})();
