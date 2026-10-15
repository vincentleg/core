// Commons UI — V6 sections that connect the idea journey: Labs dossier, vault tools, "Mon parcours" and TRUST.
import * as L from './labs.mjs';
import * as V from './vault.mjs';
import * as VS from './vault-session.mjs';
import * as J from '../shell/journey.mjs';
import { loadIndex } from '../kb/browser.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https:\/\//i.test(String(u || '')) ? u : '#');
export function download(name, text, type = 'text/markdown') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

// Labs: structured dossier for the selected idea, appended under the checklist.
export async function renderDossier(host, idea, { toast }) {
  if (!idea?.versions.length) return;
  const ix = await loadIndex().catch(() => null);
  const pid = idea.versions.at(-1).problemId, problem = ix?.problems.find(p => p.id === pid) || null;
  const sw = problem?.evidence.map(e => ix.records.get(e.ref)).find(r => r?.kind === 'sidewalk') || null;
  const x = L.dossier(idea, { problem, sidewalk: sw });
  J.mark('labs', { problemId: pid, ideaId: idea.id, idea: { versions: idea.versions.length, missingEvidence: x.missingEvidence.length } });
  const li = a => a.map(i => `<li>${esc(typeof i === 'string' ? i : i.label || i.ref)}${i.url ? ` · <a href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer">source</a>` : ''}${i.basis ? ` <span class="fine">(${esc(i.basis)})</span>` : ''}</li>`).join('');
  host.insertAdjacentHTML('beforeend', `<div class="card" id="lb-dossier"><h2>Dossier de recherche (v${x.version})</h2>
    <p><span class="badge ${x.level === 'ready' ? 'info' : 'approx'}">${esc(x.levelLabel)}</span> <span class="fine">${esc(x.disclaimer)}</span></p>
    <h3>Problème</h3><p>${esc(x.problemStatement)}</p><h3>Hypothèse testable</h3><p>${esc(x.hypothesis)}</p>
    <div class="grid2"><div><h3>Hypothèses sous-jacentes</h3><ul>${li(x.assumptions)}</ul><h3>Alternatives</h3><ul>${li(x.alternatives)}</ul><h3>Risques</h3><ul>${li(x.risks)}</ul></div>
    <div><h3>Preuves</h3><ul>${li(x.evidence) || '<li class="fine">aucune</li>'}</ul><h3>Plan de validation</h3><ol>${li(x.validationPlan)}</ol><h3>Plan de prototype</h3><ol>${li(x.prototypePlan)}</ol></div></div>
    <div class="grid2"><div><h3>Indicateurs de succès</h3><ul>${li(x.successMetrics)}</ul></div><div><h3>Critères d’échec</h3><ul>${li(x.failureCriteria)}</ul></div></div>
    <h3>Calcul</h3>${x.calculation.available ? `<p>Écart au minimum : <b>${x.calculation.result.toMinimum_ft} ft (${x.calculation.result.toMinimum_m} m)</b>${x.calculation.result.toRecommended_ft != null ? ` · écart à la largeur recommandée : <b>${x.calculation.result.toRecommended_ft} ft (${x.calculation.result.toRecommended_m} m)</b>` : ''}.</p><p class="fine">${esc(x.calculation.kind)} — ${esc(x.calculation.note)}</p>` : `<p class="fine">${esc(x.calculation.note)}</p>`}
    <h3>Preuves manquantes (${x.missingEvidence.length})</h3><ul>${li(x.missingEvidence) || '<li>aucune identifiée par les règles (cela ne signifie pas que le dossier est complet)</li>'}</ul>
    <div class="row2"><a class="btn" href="dialogue.html#idea=${encodeURIComponent(idea.id)}&problem=${encodeURIComponent(pid || '')}">Réviser dans Dialogue</a><a class="btn" href="commons.html#experts?idea=${encodeURIComponent(idea.id)}">Préparer une demande de revue</a><button type="button" id="lb-md">Exporter le dossier</button></div></div>`);
  host.querySelector('#lb-md').onclick = () => { download(`core-dossier-${idea.id}-v${x.version}.md`, L.dossierMarkdown(x)); toast('Dossier exporté sur cet appareil.'); };
}

// Vault: category, notes, version comparison, export, deletion.
export function renderVaultTools(host, idea, { owner, save, toast, after }) {
  const vs = idea.versions, last = vs.length;
  host.insertAdjacentHTML('beforeend', `<div class="card" id="v-tools"><h2>Outils de l’idée</h2>
    <div class="grid2"><form class="form" id="v-meta"><label>Catégorie <select id="v-cat"><option value="">—</option>${V.CATEGORIES.map(c => `<option ${idea.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label>Notes de recherche (privées, chiffrées) <textarea id="v-notes" maxlength="4000">${esc(idea.notes || '')}</textarea></label><button type="submit" class="small">Enregistrer</button></form>
    <div class="form">${last > 1 ? `<label>Comparer <select id="v-a">${vs.map(v => `<option ${v.n === last - 1 ? 'selected' : ''}>${v.n}</option>`).join('')}</select> avec <select id="v-b">${vs.map(v => `<option ${v.n === last ? 'selected' : ''}>${v.n}</option>`).join('')}</select></label><div id="v-diff" class="diff"></div>` : '<p class="fine">Une seule version : la comparaison apparaîtra à la prochaine révision.</p>'}</div></div>
    <div class="row2"><a class="btn" href="dialogue.html#idea=${encodeURIComponent(idea.id)}">Continuer dans Dialogue</a><button type="button" id="v-export">Exporter (déchiffré, sur cet appareil)</button><button type="button" class="ghost small" id="v-del">Supprimer l’idée</button></div></div>`);
  const showDiff = () => { const a = vs.find(v => v.n === +host.querySelector('#v-a').value), b = vs.find(v => v.n === +host.querySelector('#v-b').value);
    host.querySelector('#v-diff').innerHTML = V.diffWords(`${a.title}\n${a.problem}\n${a.solution}`, `${b.title}\n${b.problem}\n${b.solution}`).map(d => d.op === 'same' ? esc(d.text) : `<${d.op === 'add' ? 'ins' : 'del'}>${esc(d.text)}</${d.op === 'add' ? 'ins' : 'del'}>`).join(''); };
  if (last > 1) { host.querySelector('#v-a').onchange = host.querySelector('#v-b').onchange = showDiff; showDiff(); }
  host.querySelector('#v-meta').onsubmit = async e => { e.preventDefault(); const r = V.setMeta(idea, { category: host.querySelector('#v-cat').value || undefined, notes: host.querySelector('#v-notes').value }, owner); if (!r.ok) return toast(r.error); await save(r.value); toast('Enregistré (chiffré).'); after(); };
  host.querySelector('#v-export').onclick = () => { if (!confirm('Le fichier exporté n’est PAS chiffré. Continuer ?')) return; download(`core-idee-${idea.id}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), note: 'Export local non chiffré. Une empreinte n’est ni un brevet ni une preuve de nouveauté.', idea }, null, 1), 'application/json'); };
  host.querySelector('#v-del').onclick = async () => { if (!confirm('Supprimer définitivement cette idée et toutes ses versions de votre coffre ?')) return; const r = V.removeIdea(VS.vault(), idea.id, owner); if (!r.ok) return toast(r.error); await VS.save(r.value); toast('Idée supprimée.'); after(true); };
}

// "Mon parcours": the cross-module journey, with the next sensible step.
const NEXT = { world: ['world.html', 'Entrer dans CORE World'], dialogue: ['dialogue.html', 'Parler à un agent'], vault: ['dialogue.html', 'Enregistrer votre idée (coffre)'], labs: ['commons.html#labs', 'Analyser dans Labs'],
  revision: ['dialogue.html', 'Réviser dans Dialogue'], review: ['commons.html#experts', 'Préparer une demande de revue'], community: ['commons.html#communities', 'Consulter la communauté'], arena: ['commons.html#arena', 'Comparer dans l’Arène'] };
export function renderJourney(B) {
  const j = J.read(), steps = J.summary(j), next = steps.find(s => !s.at);
  B.innerHTML = `<div class="card"><h2>Mon parcours</h2><p class="fine">Stocké dans ce navigateur : identifiants, dates et compteurs seulement, jamais le texte de vos idées.</p>
    <ol class="journey">${steps.map(s => `<li class="${s.at ? 'done' : ''}"><b>${s.at ? '✓' : '·'}</b> ${esc(s.label)}${s.at ? ` <span class="fine">${esc(s.at.slice(0, 16).replace('T', ' '))} UTC</span>` : ''}</li>`).join('')}</ol>
    ${j.idea ? `<p>Idée liée : ${j.idea.versions || 0} version(s)${j.idea.missingEvidence != null ? ` · preuves manquantes selon Labs : ${j.idea.missingEvidence}` : ''}${j.idea.reviewRequests ? ` · demandes de revue (fictives) : ${j.idea.reviewRequests}` : ''}.</p>` : ''}
    <p class="fine">Statut scientifique : aucune validation, aucune autorisation, aucun impact mesuré. Une demande de revue à des experts fictifs n’est pas une revue.</p>
    ${next ? `<p><a class="btn" href="${esc(NEXT[next.id][0])}">Étape suivante : ${esc(NEXT[next.id][1])}</a></p>` : '<p>Toutes les étapes du parcours de démonstration sont faites.</p>'}
    <button type="button" class="ghost small" id="jr-reset">Réinitialiser le parcours</button></div>`;
  B.querySelector('#jr-reset').onclick = () => { J.reset(); renderJourney(B); };
}

// TRUST: what CORE keeps in this browser, how it is protected, and a one-click wipe.
const KEYS = [['core.world.v1', 'Avatar, pseudonyme et contributions CORE World', 'clair'], ['core.commons.v1', 'Profil pseudonyme et journal Labs', 'clair'], ['core.vault.v1', 'Idées privées, sessions de dialogue enregistrées', 'chiffré (AES-GCM)'],
  ['core.journey.v1', 'Parcours (identifiants et dates)', 'clair, sans contenu privé'], ['core.kbcontrib.v1', 'Contributions de connaissances (candidates)', 'clair'], ['core.network.v1', 'Brouillons de communauté et demandes de revue', 'clair'],
  ['core.feeds.browser.v1', 'Veille publique (CORE Intelligence)', 'clair'], ['core.missions.v1', 'Missions lancées (CORE Intelligence)', 'clair'], ['core.human-decisions.v1', 'Revue humaine locale (CORE Intelligence)', 'clair']];
export function renderTrust(B) {
  const size = k => { try { return (localStorage.getItem(k) || '').length; } catch { return 0; } };
  B.innerHTML = `<div class="card"><h2>CORE TRUST — vos données et la sécurité</h2>
    <ul><li>Rien n’est transmis : pas de compte, pas de serveur CORE, aucune IA externe. Les pages n’autorisent que des requêtes vers ce site${' '}(et les tuiles de carte pour CORE World).</li>
    <li>Les idées privées sont chiffrées avec votre phrase secrète ; le coffre se verrouille après 10 min d’inactivité.</li>
    <li>Les identités sont locales et pseudonymes : ce n’est pas une authentification multi-utilisateur.</li>
    <li>Les experts, communautés, arènes et élèves sont <b>fictifs</b> et étiquetés comme tels.</li>
    <li>Les agents proposent et citent ; ils n’autorisent rien, ne contactent personne et n’achètent rien.</li></ul>
    <h3>Stockage local</h3><table class="tbl"><thead><tr><th>Clé</th><th>Contenu</th><th>Protection</th><th>Taille</th></tr></thead><tbody>${KEYS.map(([k, what, how]) => `<tr><td><code>${k}</code></td><td>${esc(what)}</td><td>${esc(how)}</td><td>${size(k) ? `${size(k)} car.` : '—'}</td></tr>`).join('')}</tbody></table>
    <p>Coffre : <b>${VS.unlocked() ? 'ouvert' : 'verrouillé'}</b>${VS.unlocked() ? ' <button type="button" class="small" id="tr-lock">Verrouiller maintenant</button>' : ''}</p>
    <button type="button" class="ghost" id="tr-wipe">Effacer toutes mes données CORE de ce navigateur</button></div>`;
  B.querySelector('#tr-lock')?.addEventListener('click', () => { VS.lock(); renderTrust(B); });
  B.querySelector('#tr-wipe').onclick = () => { if (!confirm('Effacer définitivement toutes les données CORE de ce navigateur, y compris le coffre chiffré ?')) return; VS.destroy(); for (const [k] of KEYS) try { localStorage.removeItem(k); } catch {} try { sessionStorage.removeItem('core.entered'); } catch {} renderTrust(B); };
}
