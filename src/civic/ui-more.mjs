// Commons UI — Arena structured debate, Continuity, and a labelled institutional demonstration (V6).
import * as Db from './debate.mjs';
import * as J from '../shell/journey.mjs';
import { loadIndex } from '../kb/browser.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function renderDebate(B, S, { toast }) {
  const ix = await loadIndex().catch(() => null);
  S.debate = S.debate || structuredClone(Db.DEBATE); const d = S.debate, a = Db.analyse(d), o = Db.outcome(d);
  const node = (id, depth = 0) => d.args.filter(x => x.target === id).map(x => `<li class="arg ${x.kind}"><span class="badge ${x.kind === 'argument' ? 'info' : 'approx'}">${esc(Db.KINDS[x.kind])}</span> <b>${esc(x.by)}</b> — ${esc(x.text)}
      ${x.evidence.length ? `<span class="fine"> · preuves : ${x.evidence.map(e => `<a href="#knowledge?view=explore&n=${encodeURIComponent('record:' + e)}">${esc(e)}</a>`).join(', ')}</span>` : x.kind === 'argument' ? ' <span class="badge synthetic">non sourcé</span>' : ''}
      ${a.unresolved.some(u => u.id === x.id) ? ' <span class="badge approx">sans réponse</span>' : ''}<ul>${node(x.id, depth + 1)}</ul></li>`).join('');
  const html = `<div class="card" id="debate"><p class="fict">${esc(d.label)}</p><h2>${esc(d.question)}</h2>
    <p class="fine">Problème réel : <a href="#knowledge?view=explore&n=${encodeURIComponent('problem:' + d.problemId)}">${esc(d.problemId)}</a>. Pas de vote : la qualité se lit dans les preuves et les objections restées sans réponse.</p>
    ${d.proposals.map(p => `<div class="contrib"><b>${esc(p.title)}</b> <span class="fine">— ${esc(p.by)}${p.by === 'vous' ? ' (votre proposition, locale)' : ' (fictif)'}</span><p>${esc(p.summary)}</p><ul class="args">${node(p.id)}</ul></div>`).join('')}
    <form class="form" id="db-f"><div class="inline"><label>Type <select id="db-kind">${Object.entries(Db.KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <label>Vise <select id="db-target">${[...d.proposals.map(p => [p.id, 'Proposition : ' + p.title]), ...d.args.map(x => [x.id, Db.KINDS[x.kind] + ' : ' + x.text.slice(0, 40) + '…'])].map(([id, l]) => `<option value="${esc(id)}">${esc(l)}</option>`).join('')}</select></label></div>
      <label>Texte <textarea id="db-text" maxlength="600"></textarea></label>
      <label>Preuves (identifiants CORE séparés par des virgules, ex. sidewalks:8562) <input id="db-ev" maxlength="200"></label><button type="submit">Ajouter</button></form>
    ${d.proposals.some(p => p.by === 'vous') ? '' : `<form class="form inline" id="db-p"><label>Votre proposition <input id="db-pt" maxlength="80" placeholder="titre"></label><input id="db-ps" maxlength="400" placeholder="résumé" aria-label="Résumé de votre proposition"><button type="submit" class="small">Proposer</button></form>`}
    <h3>Issue du débat (expliquée, sans gagnant)</h3><ul>${o.explanation.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="fine">Ni autorisation (${o.authorizes}), ni validation scientifique (${o.scientificValidation}).</p></div>`;
  const old = B.querySelector('#debate'); if (old) old.outerHTML = html; else B.insertAdjacentHTML('afterbegin', html);
  const rerender = () => renderDebate(B, S, { toast });
  B.querySelector('#db-f').onsubmit = e => { e.preventDefault(); const ev = B.querySelector('#db-ev').value.split(',').map(x => x.trim()).filter(Boolean);
    const r = Db.addArgument(d, { target: B.querySelector('#db-target').value, kind: B.querySelector('#db-kind').value, text: B.querySelector('#db-text').value, evidence: ev, records: ix?.records });
    if (!r.ok) return toast(r.error); S.debate = r.value; J.mark('arena', { problemId: d.problemId }); rerender(); };
  B.querySelector('#db-p')?.addEventListener('submit', e => { e.preventDefault(); const r = Db.addProposal(d, { title: B.querySelector('#db-pt').value, summary: B.querySelector('#db-ps').value }); if (!r.ok) return toast(r.error); S.debate = r.value; J.mark('arena', { problemId: d.problemId }); rerender(); });
}

// ---------- Continuity: what kind of knowledge each source is ----------
const CONT = [
  ['fiction', 'Fiction (inspiration, pas une preuve)', [['Isaac Asimov, Foundation (1951)', 'Préserver le savoir pour raccourcir une période de déclin ; la « psychohistoire » prédictive est une fiction.']]],
  ['history', 'Histoire et interprétations', [['Edward Gibbon, Decline and Fall (1776–1789)', 'Explications morales, religieuses et militaires — cadrage du XVIIIe siècle, discuté aujourd’hui.'], ['Bryan Ward-Perkins, The Fall of Rome (2005)', 'L’archéologie montre un déclin matériel réel en Occident.'], ['Peter Heather, The Fall of the Roman Empire (2005)', 'Chocs extérieurs déterminants.'], ['Kyle Harper, The Fate of Rome (2017)', 'Climat et pandémies comme facteurs majeurs.'], ['Peter Brown, The World of Late Antiquity (1971)', 'Transformation plutôt que simple déclin.']]],
  ['contested', 'Débats ouverts', [['Joseph Tainter (1988) vs McAnany & Yoffee (2010)', 'Rendements décroissants de la complexité contre critique des récits d’« effondrement » ; mesurabilité discutée.']]],
  ['systems', 'Science des systèmes et de la résilience', [['C. S. Holling (1973)', 'Résilience : absorber le changement, pas seulement revenir à l’équilibre.'], ['Marten Scheffer (2009)', 'Points de bascule et signaux précoces, avec leurs limites.'], ['Centeno et al. (2015)', 'Risque systémique mondial et cascades.'], ['UNDRR, cadre de Sendai 2015–2030', 'Vocabulaire international de la préparation et du relèvement.']]],
  ['scenario', 'Scénarios (spéculatifs, jamais des prévisions)', [['Exercice : si le chantier voisin bloque le trottoir 30 jours', 'Qui est touché ? Quel itinéraire de contournement ? Quelles données manquent ? — exercice de réflexion, aucune probabilité.']]],
];
export function renderContinuity(B) {
  B.innerHTML = `<div class="card"><h2>CORE Continuity — préserver le savoir et comprendre les dépendances</h2>
    <p class="fine">Chaque source est rangée selon ce qu’elle est. Aucune prédiction d’effondrement ; aucune autorité d’IA. Références bibliographiques à vérifier dans un catalogue de bibliothèque (voir docs/v4/CONTINUITY.md).</p>
    ${CONT.map(([id, label, items]) => `<h3>${esc(label)} <span class="badge ${id === 'fiction' || id === 'scenario' ? 'synthetic' : id === 'contested' ? 'approx' : 'info'}">${esc(id)}</span></h3><ul>${items.map(([t, d]) => `<li><b>${esc(t)}</b> — ${esc(d)}</li>`).join('')}</ul>`).join('')}
    <h3>Ce que CORE fait déjà pour la continuité</h3><ul><li>Instantanés de données datés avec empreintes SHA-256 et ancrage vérifié (CORE Knowledge).</li><li>Historique des décisions conservé (Constitution, décisions fondatrices).</li><li>Sauvegardes locales vérifiées (git bundle, bases SQLite).</li></ul></div>`;
}

// ---------- Institutions: what a city view could show, from PUBLIC data only ----------
export async function renderInstitutions(B) {
  const ix = await loadIndex().catch(() => null);
  const by = {}; for (const p of ix?.problems || []) { const k = `${p.domain}|${p.status}`; by[k] = (by[k] || 0) + 1; }
  const doms = [...new Set((ix?.problems || []).map(p => p.domain))], sts = ['observed', 'potential-risk', 'hypothesis', 'simulated'];
  B.innerHTML = `<p class="fict">DÉMONSTRATION — aucune ville, aucun contrat, aucun système institutionnel connecté</p><div class="card"><h2>CORE City — vue de démonstration</h2>
    <p class="fine">Construite uniquement à partir des registres publics du corridor Folsom / Howard. Une offre institutionnelle réelle utiliserait des espaces séparés : les données privées d’une institution n’entrent jamais dans la connaissance publique, et aucune institution n’accède aux idées privées des citoyens.</p>
    <table class="tbl"><thead><tr><th>Domaine</th>${sts.map(s => `<th>${esc(s)}</th>`).join('')}</tr></thead><tbody>${doms.map(dm => `<tr><td>${esc(dm)}</td>${sts.map(s => `<td>${by[`${dm}|${s}`] || 0}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <h3>Ce qu’un client institutionnel ne peut jamais acheter</h3><ul><li>Une conclusion scientifique, un classement public, une influence sur les votes.</li><li>L’accès aux idées privées, conversations ou contributions confidentielles.</li><li>La suppression d’un résultat d’intérêt public.</li></ul></div>`;
}
