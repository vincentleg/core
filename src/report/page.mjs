// CORE V8 — report page (report.html#mission=<id>): 20 sections, printable to PDF by the browser.
import * as NAV from '../shell/nav.mjs';
import { FILES } from '../civilization/analyses.mjs';
import { buildMissions } from '../civilization/missions.mjs';
import { sections } from './report.mjs';
import { T, L, onLang } from '../i18n/i18n.mjs';
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
    $('rp-mission').innerHTML = missions.map(m => `<option value="${esc(m.id)}">${esc(L(m.title))}</option>`).join('');
    const opts = () => { [...$('rp-mission').options].forEach((o, i) => { o.textContent = L(missions[i].title); }); };
    const render = () => { const m = pick(), S = sections(m, { mobility, manifest, civ }); $('rp-mission').value = m.id; document.title = `CORE — ${L(m.title)} — ${T('proposal for consideration', 'proposition soumise à examen')}`;
      $('rp-doc').innerHTML = `<header class="rp-head"><p class="le-eyebrow">${T('CORE · mission file · proposal for consideration', 'CORE · dossier de mission · proposition soumise à examen')}</p><h1>${esc(L(m.title))}</h1><p class="fine">${T('Local prototype · not a recommendation · no verified human review · verified real-world impact: none', 'Prototype local · pas une recommandation · aucune revue humaine vérifiée · impact réel vérifié : aucun')}</p></header>
        <nav class="rp-toc" aria-label="${T('Contents', 'Sommaire')}"><ol>${S.map(s => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('')}</ol></nav>
        ${S.map(s => `<section id="${s.id}" class="rp-sec"><h2><span>${s.n}.</span> ${esc(s.title)}</h2>${s.html}</section>`).join('')}`;
      globalThis.CORE_REPORT = { mission: m.id, sections: S.length }; };
    $('rp-mission').onchange = e => { history.replaceState(null, '', `#mission=${encodeURIComponent(e.target.value)}`); render(); };
    $('rp-print').onclick = () => print(); addEventListener('hashchange', render); render(); onLang(() => { opts(); render(); });
  } catch (e) { $('rp-doc').innerHTML = `<p class="cmp-err">${T('Report unavailable', 'Rapport indisponible')} : ${esc(e.message)}</p>`; globalThis.CORE_REPORT = { error: e.message }; }
})();
