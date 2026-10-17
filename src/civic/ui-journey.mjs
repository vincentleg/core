// Commons UI — sections that connect the idea journey: Labs dossier, vault tools, "My journey" and TRUST.
import * as L from './labs.mjs';
import * as V from './vault.mjs';
import * as VS from './vault-session.mjs';
import * as J from '../shell/journey.mjs';
import { loadIndex } from '../kb/browser.mjs';
import { T } from '../i18n/i18n.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https:\/\//i.test(String(u || '')) ? u : '#');
const vtext = v => [v.title, v.problem, v.solution].join('\n'); // diff input (plain text); the diff output is escaped
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
  host.insertAdjacentHTML('beforeend', `<div class="card" id="lb-dossier"><h2>${T('Research dossier', 'Dossier de recherche')} (v${x.version})</h2>
    <p><span class="badge ${x.level === 'ready' ? 'info' : 'approx'}">${esc(x.levelLabel)}</span> <span class="fine">${esc(x.disclaimer)}</span></p>
    <h3>${T('Problem', 'Problème')}</h3><p>${esc(x.problemStatement)}</p><h3>${T('Testable hypothesis', 'Hypothèse testable')}</h3><p>${esc(x.hypothesis)}</p>
    <div class="grid2"><div><h3>${T('Underlying assumptions', 'Hypothèses sous-jacentes')}</h3><ul>${li(x.assumptions)}</ul><h3>${T('Alternatives', 'Alternatives')}</h3><ul>${li(x.alternatives)}</ul><h3>${T('Risks', 'Risques')}</h3><ul>${li(x.risks)}</ul></div>
    <div><h3>${T('Evidence', 'Preuves')}</h3><ul>${li(x.evidence) || `<li class="fine">${T('none', 'aucune')}</li>`}</ul><h3>${T('Validation plan', 'Plan de validation')}</h3><ol>${li(x.validationPlan)}</ol><h3>${T('Prototype plan', 'Plan de prototype')}</h3><ol>${li(x.prototypePlan)}</ol></div></div>
    <div class="grid2"><div><h3>${T('Success indicators', 'Indicateurs de succès')}</h3><ul>${li(x.successMetrics)}</ul></div><div><h3>${T('Failure criteria', 'Critères d’échec')}</h3><ul>${li(x.failureCriteria)}</ul></div></div>
    <h3>${T('Calculation', 'Calcul')}</h3>${x.calculation.available ? `<p>${T('Gap to the minimum', 'Écart au minimum')} : <b>${x.calculation.result.toMinimum_ft} ft (${x.calculation.result.toMinimum_m} m)</b>${x.calculation.result.toRecommended_ft != null ? ` · ${T('gap to the recommended width', 'écart à la largeur recommandée')} : <b>${x.calculation.result.toRecommended_ft} ft (${x.calculation.result.toRecommended_m} m)</b>` : ''}.</p><p class="fine">${esc(x.calculation.kind)} · ${esc(x.calculation.note)}</p>` : `<p class="fine">${esc(x.calculation.note)}</p>`}
    <h3>${T('Missing evidence', 'Preuves manquantes')} (${x.missingEvidence.length})</h3><ul>${li(x.missingEvidence) || `<li>${T('none found by the rules (this does not mean the dossier is complete)', 'aucune identifiée par les règles (cela ne signifie pas que le dossier est complet)')}</li>`}</ul>
    <div class="row2"><a class="btn" href="dialogue.html#idea=${encodeURIComponent(idea.id)}&problem=${encodeURIComponent(pid || '')}">${T('Revise in Dialogue', 'Réviser dans Dialogue')}</a><a class="btn" href="commons.html#experts?idea=${encodeURIComponent(idea.id)}">${T('Prepare a review request', 'Préparer une demande de revue')}</a><button type="button" id="lb-md">${T('Export the dossier', 'Exporter le dossier')}</button></div></div>`);
  host.querySelector('#lb-md').onclick = () => { download(`core-dossier-${idea.id}-v${x.version}.md`, L.dossierMarkdown(x)); toast(T('Dossier exported to this device.', 'Dossier exporté sur cet appareil.')); };
}

// Vault: category, notes, version comparison, export, deletion.
export function renderVaultTools(host, idea, { owner, save, toast, after }) {
  const vs = idea.versions, last = vs.length;
  host.insertAdjacentHTML('beforeend', `<div class="card" id="v-tools"><h2>${T('Idea tools', 'Outils de l’idée')}</h2>
    <div class="grid2"><form class="form" id="v-meta"><label>${T('Category', 'Catégorie')} <select id="v-cat"><option value="">—</option>${V.CATEGORIES.map(c => `<option value="${esc(c)}" ${idea.category === c ? 'selected' : ''}>${esc(V.categoryLabel ? V.categoryLabel(c) : c)}</option>`).join('')}</select></label>
      <label>${T('Research notes (private, encrypted)', 'Notes de recherche (privées, chiffrées)')} <textarea id="v-notes" maxlength="4000">${esc(idea.notes || '')}</textarea></label><button type="submit" class="small">${T('Save', 'Enregistrer')}</button></form>
    <div class="form">${last > 1 ? `<label>${T('Compare', 'Comparer')} <select id="v-a">${vs.map(v => `<option ${v.n === last - 1 ? 'selected' : ''}>${v.n}</option>`).join('')}</select> ${T('with', 'avec')} <select id="v-b">${vs.map(v => `<option ${v.n === last ? 'selected' : ''}>${v.n}</option>`).join('')}</select></label><div id="v-diff" class="diff"></div>` : `<p class="fine">${T('A single version: the comparison will appear at the next revision.', 'Une seule version : la comparaison apparaîtra à la prochaine révision.')}</p>`}</div></div>
    <div class="row2"><a class="btn" href="dialogue.html#idea=${encodeURIComponent(idea.id)}">${T('Continue in Dialogue', 'Continuer dans Dialogue')}</a><button type="button" id="v-export">${T('Export (decrypted, on this device)', 'Exporter (déchiffré, sur cet appareil)')}</button><button type="button" class="ghost small" id="v-del">${T('Delete the idea', 'Supprimer l’idée')}</button></div></div>`);
  const showDiff = () => { const a = vs.find(v => v.n === +host.querySelector('#v-a').value), b = vs.find(v => v.n === +host.querySelector('#v-b').value);
    host.querySelector('#v-diff').innerHTML = V.diffWords(vtext(a), vtext(b)).map(d => d.op === 'same' ? esc(d.text) : `<${d.op === 'add' ? 'ins' : 'del'}>${esc(d.text)}</${d.op === 'add' ? 'ins' : 'del'}>`).join(''); };
  if (last > 1) { host.querySelector('#v-a').onchange = host.querySelector('#v-b').onchange = showDiff; showDiff(); }
  host.querySelector('#v-meta').onsubmit = async e => { e.preventDefault(); const r = V.setMeta(idea, { category: host.querySelector('#v-cat').value || undefined, notes: host.querySelector('#v-notes').value }, owner); if (!r.ok) return toast(r.error); await save(r.value); toast(T('Saved (encrypted).', 'Enregistré (chiffré).')); after(); };
  host.querySelector('#v-export').onclick = () => { if (!confirm(T('The exported file is NOT encrypted. Continue?', 'Le fichier exporté n’est PAS chiffré. Continuer ?'))) return; download(`core-idea-${idea.id}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), note: T('Unencrypted local export. A fingerprint is neither a patent nor proof of novelty.', 'Export local non chiffré. Une empreinte n’est ni un brevet ni une preuve de nouveauté.'), idea }, null, 1), 'application/json'); };
  host.querySelector('#v-del').onclick = async () => { if (!confirm(T('Permanently delete this idea and all its versions from your vault?', 'Supprimer définitivement cette idée et toutes ses versions de votre coffre ?'))) return; const r = V.removeIdea(VS.vault(), idea.id, owner); if (!r.ok) return toast(r.error); await VS.save(r.value); toast(T('Idea deleted.', 'Idée supprimée.')); after(true); };
}

// "My journey": the cross-module journey, with the next sensible step.
const NEXT = { world: ['world.html', ['Enter CORE World', 'Entrer dans CORE World']], dialogue: ['dialogue.html', ['Talk to an agent', 'Parler à un agent']], vault: ['dialogue.html', ['Save your idea (vault)', 'Enregistrer votre idée (coffre)']], labs: ['commons.html#labs', ['Analyse in Labs', 'Analyser dans Labs']],
  revision: ['dialogue.html', ['Revise in Dialogue', 'Réviser dans Dialogue']], review: ['commons.html#experts', ['Prepare a review request', 'Préparer une demande de revue']], community: ['commons.html#communities', ['Consult the community', 'Consulter la communauté']], arena: ['commons.html#arena', ['Compare in the Arena', 'Comparer dans l’Arène']] };
export function renderJourney(B) {
  const j = J.read(), steps = J.summary(j), next = steps.find(s => !s.at);
  B.innerHTML = `<div class="card"><h2>${T('My journey', 'Mon parcours')}</h2><p class="fine">${T('Stored in this browser: identifiers, dates and counts only, never the text of your ideas.', 'Stocké dans ce navigateur : identifiants, dates et compteurs seulement, jamais le texte de vos idées.')}</p>
    <ol class="journey">${steps.map(s => `<li class="${s.at ? 'done' : ''}"><b>${s.at ? '✓' : '·'}</b> ${esc(s.label)}${s.at ? ` <span class="fine">${esc(s.at.slice(0, 16).replace('T', ' '))} UTC</span>` : ''}</li>`).join('')}</ol>
    ${j.idea ? `<p>${T('Linked idea', 'Idée liée')} : ${j.idea.versions || 0} ${T('version(s)', 'version(s)')}${j.idea.missingEvidence != null ? ` · ${T('missing evidence according to Labs', 'preuves manquantes selon Labs')} : ${j.idea.missingEvidence}` : ''}${j.idea.reviewRequests ? ` · ${T('review requests (fictional)', 'demandes de revue (fictives)')} : ${j.idea.reviewRequests}` : ''}.</p>` : ''}
    <p class="fine">${T('Scientific status: no validation, no authorisation, no measured impact. A review request to fictional experts is not a review.', 'Statut scientifique : aucune validation, aucune autorisation, aucun impact mesuré. Une demande de revue à des experts fictifs n’est pas une revue.')}</p>
    ${next ? `<p><a class="btn" href="${esc(NEXT[next.id][0])}">${T('Next step', 'Étape suivante')} : ${esc(T(...NEXT[next.id][1]))}</a></p>` : `<p>${T('All steps of the demonstration journey are done.', 'Toutes les étapes du parcours de démonstration sont faites.')}</p>`}
    <button type="button" class="ghost small" id="jr-reset">${T('Reset the journey', 'Réinitialiser le parcours')}</button></div>`;
  B.querySelector('#jr-reset').onclick = () => { J.reset(); renderJourney(B); };
}

// TRUST: what CORE keeps in this browser, how it is protected, and a one-click wipe.
const KEYS = [['core.world.v1', ['Avatar, pseudonym and CORE World contributions', 'Avatar, pseudonyme et contributions CORE World'], ['clear text', 'clair']], ['core.commons.v1', ['Pseudonymous profile and Labs log', 'Profil pseudonyme et journal Labs'], ['clear text', 'clair']], ['core.vault.v1', ['Private ideas, saved dialogue sessions', 'Idées privées, sessions de dialogue enregistrées'], ['encrypted (AES-GCM)', 'chiffré (AES-GCM)']],
  ['core.journey.v1', ['Journey (identifiers and dates)', 'Parcours (identifiants et dates)'], ['clear text, no private content', 'clair, sans contenu privé']], ['core.kbcontrib.v1', ['Knowledge contributions (candidates)', 'Contributions de connaissances (candidates)'], ['clear text', 'clair']], ['core.network.v1', ['Community drafts and review requests', 'Brouillons de communauté et demandes de revue'], ['clear text', 'clair']],
  ['core.feeds.browser.v1', ['Public watch (CORE Intelligence)', 'Veille publique (CORE Intelligence)'], ['clear text', 'clair']], ['core.missions.v1', ['Launched missions (CORE Intelligence)', 'Missions lancées (CORE Intelligence)'], ['clear text', 'clair']], ['core.human-decisions.v1', ['Local human review (CORE Intelligence)', 'Revue humaine locale (CORE Intelligence)'], ['clear text', 'clair']],
  ['core.avatar.v2', ['3D avatar (appearance) and pseudonym', 'Avatar 3D (apparence) et pseudonyme'], ['clear text', 'clair']], ['core.intelligence.v1', ['Choice of answer engine (never content)', 'Choix du moteur de réponse (jamais de contenu)'], ['clear text', 'clair']],
  ['core.civ.v72', ['Local state of the agent civilisation and the contributions you consented to share with a mission', 'État local de la civilisation d’agents et contributions que vous avez consenti à partager avec une mission'], ['clear text, local, never published', 'clair, local, jamais publié']], ['core.world.layer', ['World view chosen (Real Earth / CORE World / Hybrid View)', 'Vue choisie dans World (Terre réelle / Monde CORE / Vue hybride)'], ['clear text', 'clair']], ['core.follow.v1', ['Followed mission and titles of your shared contributions', 'Mission suivie et titres de vos contributions partagées'], ['clear text', 'clair']],
  ['core.lang', ['Interface language', 'Langue de l’interface'], ['clear text', 'clair']], ['core.companion.speak', ['Former read-aloud setting (no longer used; may remain from an earlier visit)', 'Ancien réglage de lecture à voix haute (plus utilisé ; peut subsister d’une visite antérieure)'], ['clear text', 'clair']], ['core.intelligence.v1.missions', ['Local reasoning on or off for missions', 'Raisonnement local activé ou non pour les missions'], ['clear text', 'clair']],
  ['core.contrib.v1', ['Your contributions: private ones (title and text) and links to the shared ones', 'Vos contributions : les privées (titre et texte) et les liens vers les partagées'], ['clear text, local, never published', 'clair, local, jamais publié']],
  ['core.investigations.v1', ['Your last 10 questions to a research team and their answers', 'Vos 10 dernières questions à une équipe de recherche et leurs réponses'], ['clear text, local', 'clair, local']], ['core.layerintro.v1', ['Which world-view introductions you have seen', 'Quelles introductions des vues vous avez vues'], ['clear text', 'clair']]];
export function renderTrust(B) {
  const size = k => { try { return (localStorage.getItem(k) || '').length; } catch { return 0; } };
  B.innerHTML = `<div class="card"><h2>${T('CORE TRUST: your data and safety', 'CORE TRUST : vos données et la sécurité')}</h2>
    <ul><li>${T('Nothing is transmitted: no account, no CORE server, no external AI. Pages only allow requests to this site (plus map tiles for CORE World, and the local model on this computer, 127.0.0.1, only when you ask for local reasoning).', 'Rien n’est transmis : pas de compte, pas de serveur CORE, aucune IA externe. Les pages n’autorisent que des requêtes vers ce site (plus les tuiles de carte pour CORE World, et le modèle local de cet ordinateur, 127.0.0.1, seulement quand vous demandez un raisonnement local).')}</li>
    <li>${T('Private ideas are encrypted with your passphrase; the vault locks after 10 minutes of inactivity.', 'Les idées privées sont chiffrées avec votre phrase secrète ; le coffre se verrouille après 10 min d’inactivité.')}</li>
    <li>${T('Identities are local and pseudonymous: this is not multi-user authentication.', 'Les identités sont locales et pseudonymes : ce n’est pas une authentification multi-utilisateur.')}</li>
    <li>${T('Experts, communities, arenas and pupils are <b>fictional</b> and labelled as such.', 'Les experts, communautés, arènes et élèves sont <b>fictifs</b> et étiquetés comme tels.')}</li>
    <li>${T('Agents propose and cite; they authorise nothing, contact nobody and buy nothing.', 'Les agents proposent et citent ; ils n’autorisent rien, ne contactent personne et n’achètent rien.')}</li>
    <li>${T('The microphone is used only when you press it and only if your browser recognises speech on this device; no audio is recorded or sent.', 'Le micro n’est utilisé que si vous appuyez dessus et seulement si votre navigateur reconnaît la parole sur cet appareil ; aucun son n’est enregistré ni envoyé.')}</li></ul>
    <h3>${T('Local storage', 'Stockage local')}</h3><table class="tbl"><thead><tr><th>${T('Key', 'Clé')}</th><th>${T('Content', 'Contenu')}</th><th>${T('Protection', 'Protection')}</th><th>${T('Size', 'Taille')}</th></tr></thead><tbody>${KEYS.map(([k, what, how]) => `<tr><td><code>${k}</code></td><td>${esc(T(...what))}</td><td>${esc(T(...how))}</td><td>${size(k) ? `${size(k)} ${T('chars', 'car.')}` : '—'}</td></tr>`).join('')}</tbody></table>
    <p>${T('Vault', 'Coffre')} : <b>${VS.unlocked() ? T('open', 'ouvert') : T('locked', 'verrouillé')}</b>${VS.unlocked() ? ` <button type="button" class="small" id="tr-lock">${T('Lock now', 'Verrouiller maintenant')}</button>` : ''}</p>
    <button type="button" class="ghost" id="tr-wipe">${T('Erase all my CORE data from this browser', 'Effacer toutes mes données CORE de ce navigateur')}</button></div>`;
  B.querySelector('#tr-lock')?.addEventListener('click', () => { VS.lock(); renderTrust(B); });
  B.querySelector('#tr-wipe').onclick = () => { if (!confirm(T('Permanently erase all CORE data from this browser, including the encrypted vault?', 'Effacer définitivement toutes les données CORE de ce navigateur, y compris le coffre chiffré ?'))) return; VS.destroy(); for (const [k] of KEYS) try { localStorage.removeItem(k); } catch {} try { sessionStorage.removeItem('core.entered'); sessionStorage.removeItem('core.dialogue.prefill'); } catch {} renderTrust(B); };
}
