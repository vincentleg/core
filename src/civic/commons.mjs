// CORE Commons — local prototype UI for identity, idea vault, labs, arena, academy and progress (V4).
// Storage: `core.commons.v1` holds the profile and the arena/academy demo state; private ideas are stored ONLY as an
// AES-GCM box sealed with the user's passphrase (`core.vault.v1`). Nothing is sent anywhere.
import * as I from './identity.mjs';
import * as V from './vault.mjs';
import * as L from './labs.mjs';
import * as A from './arena.mjs';
import * as C from './academy.mjs';
import * as G from './progress.mjs';
import * as K from '../kb/knowledge.mjs';
import * as NAV from '../shell/nav.mjs';
import * as J from '../shell/journey.mjs';
import * as VS from './vault-session.mjs';
import * as UJ from './ui-journey.mjs';
import * as UK from './ui-knowledge.mjs';
import * as UN from './ui-network.mjs';
import * as UM from './ui-more.mjs';
import * as UMI from './ui-missions.mjs';
import { T, L as LL, onLang } from '../i18n/i18n.mjs';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const S = { tab: 'profile', profile: get('core.commons.v1')?.profile || null, vault: null, pass: null, labsLog: get('core.commons.v1')?.labsLog || [], arena: null, academy: null, sel: null, data: null };
const saveCommons = () => put('core.commons.v1', { profile: S.profile, labsLog: S.labsLog.slice(-50) });
let toastT; const toast = t => { $('toast').textContent = t; clearTimeout(toastT); toastT = setTimeout(() => { $('toast').textContent = ''; }, 6000); };
const params = new URLSearchParams(location.search);

// The vault lives in the shared, auto-locking session (vault-session.mjs); S.vault mirrors it while unlocked.
async function persistVault() { if (VS.unlocked()) await VS.save(S.vault); }
VS.onChange(open => { if (!open && S.vault) { S.vault = null; S.sel = null; toast(T('Vault locked automatically.', 'Coffre verrouillé automatiquement.')); render(); } });
const short = h => h ? `${h.slice(0, 12)}…` : '—';

// ---------- Profile ----------
function renderProfile(B) {
  if (!S.profile) {
    const w = get('core.world.v1')?.avatar;
    B.innerHTML = `<div class="card"><h2>${T('Create a CORE identity (pseudonym)', 'Créer une identité CORE (pseudonyme)')}</h2>
      <p class="fine">${T('No real name is asked for. Everything is private by default; you choose, field by field, what would become public on the day a public space exists.', 'Aucun nom réel n’est demandé. Tout est privé par défaut ; vous choisissez champ par champ ce qui deviendrait public le jour où un espace public existera.')}</p>
      <form class="form" id="pf"><label>${T('Pseudonym', 'Pseudonyme')} <input id="pf-ps" required maxlength="24" value="${esc(w?.name || '')}"></label>
      <label>${T('Age band', 'Tranche d’âge')} <select id="pf-age"><option value="adult">${T('Adult', 'Adulte')}</option><option value="minor">${T('Minor', 'Mineur')}</option></select></label>
      <p class="fine">${w ? T(`CORE World avatar linked: ${esc(w.preset)}.`, `Avatar CORE World lié : ${esc(w.preset)}.`) : T('No CORE World avatar in this browser (you can create one in CORE World).', 'Aucun avatar CORE World dans ce navigateur (vous pourrez en créer un dans CORE World).')}</p>
      <button type="submit" class="primary">${T('Create', 'Créer')}</button></form></div>`;
    $('pf').onsubmit = e => { e.preventDefault(); try { S.profile = I.createProfile({ pseudonym: $('pf-ps').value, ageBand: $('pf-age').value, avatar: w ? { preset: w.preset, top: w.top, hair: w.hair } : null }); saveCommons(); render(); } catch (err) { toast(err.message); } };
    return;
  }
  const p = S.profile, pub = I.publicView(p);
  B.innerHTML = `<div class="grid2"><div class="card"><h2>${esc(p.pseudonym)}</h2><p class="hash">${esc(p.id)}</p>
      <form class="form" id="pe"><label>${T('Biography (optional)', 'Biographie (facultative)')} <textarea id="pe-bio" maxlength="400">${esc(p.bio)}</textarea></label>
      <label>${T('Interests (comma-separated)', 'Centres d’intérêt (séparés par des virgules)')} <input id="pe-int" maxlength="200" value="${esc(p.interests.join(', '))}"></label>
      <label>${T('Problems I want to solve', 'Problèmes que je veux résoudre')} <input id="pe-pb" maxlength="200" value="${esc(p.problems.join(', '))}"></label>
      <div class="inline"><label>${T('Declared expertise', 'Compétence déclarée')} <input id="pe-ex" maxlength="60"></label><label>${T('Years', 'Années')} <input id="pe-yr" type="number" min="0" max="70" style="width:5em"></label></div>
      <button type="submit">${T('Save', 'Enregistrer')}</button></form>
      <h3>${T('Expertise', 'Compétences')}</h3><ul>${p.expertise.map(e => `<li>${esc(e.label)}${e.years != null ? ` · ${e.years} ${T('year(s)', 'an(s)')}` : ''} · <span class="badge ${e.basis === 'verified' ? 'observed' : 'approx'}">${e.basis === 'verified' ? T('VERIFIED', 'VÉRIFIÉE') : T('DECLARED', 'DÉCLARÉE')}</span></li>`).join('') || `<li class="fine">${T('none', 'aucune')}</li>`}</ul>
      <p class="fine">${T('Declared expertise stays declared: no verifier exists in this prototype.', 'Une compétence déclarée reste déclarée : aucun vérificateur n’existe dans ce prototype.')}</p></div>
    <div class="card"><h2>${T('Visibility', 'Visibilité')}</h2><table class="tbl"><tbody>${I.FIELDS.map(f => `<tr><td>${esc(f)}</td><td><label><input type="checkbox" data-vis="${f}" ${p.visibility[f] === 'public' ? 'checked' : ''}> public</label></td></tr>`).join('')}</tbody></table>
      <label class="inline"><input type="checkbox" id="pe-lb" ${p.leaderboards ? 'checked' : ''}> ${T('Appear in thematic leaderboards (no leaderboard exists yet)', 'Apparaître dans des classements thématiques (aucun classement n’existe encore)')}</label>
      <h3>${T('What another person would see', 'Ce que verrait une autre personne')}</h3><pre class="hash" id="pe-pub">${esc(JSON.stringify(pub, null, 1))}</pre>
      <button type="button" class="ghost small" id="pe-del">${T('Delete my local profile', 'Supprimer mon profil local')}</button></div></div>`;
  $('pe').onsubmit = e => { e.preventDefault(); let q = { ...S.profile, bio: $('pe-bio').value.slice(0, 400), interests: $('pe-int').value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10), problems: $('pe-pb').value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10) };
    if ($('pe-ex').value.trim()) q = I.declareExpertise(q, $('pe-ex').value, $('pe-yr').value === '' ? null : Number($('pe-yr').value));
    S.profile = q; saveCommons(); render(); toast(T('Profile saved in this browser.', 'Profil enregistré dans ce navigateur.')); };
  B.querySelectorAll('[data-vis]').forEach(c => c.onchange = () => { try { S.profile = I.setVisibility(S.profile, c.dataset.vis, c.checked ? 'public' : 'private'); saveCommons(); render(); } catch (err) { c.checked = false; toast(err.message); } });
  $('pe-lb').onchange = e => { try { S.profile = I.setLeaderboards(S.profile, e.target.checked); saveCommons(); } catch (err) { e.target.checked = false; toast(err.message); } };
  $('pe-del').onclick = () => { S.profile = null; saveCommons(); render(); };
}

// ---------- Vault ----------
function renderVault(B) {
  if (!S.profile) { B.innerHTML = `<div class="card"><p>${T('First create an identity (Identity section).', 'Créez d’abord une identité (section Identité).')}</p></div>`; return; }
  if (!S.vault) {
    const exists = !!get('core.vault.v1');
    B.innerHTML = `<div class="card"><h2>${exists ? T('Open your idea vault', 'Ouvrir votre coffre à idées') : T('Create your idea vault', 'Créer votre coffre à idées')}</h2>
      <p class="fine">${T('Your private ideas are encrypted in this browser (AES-GCM, key derived from your passphrase with PBKDF2). Without the passphrase nobody, not even CORE, can read them, and they are lost if you forget it.', 'Vos idées privées sont chiffrées dans ce navigateur (AES-GCM, clé dérivée de votre phrase secrète par PBKDF2). Sans la phrase, personne, ni CORE, ne peut les lire, et elles sont perdues si vous l’oubliez.')}</p>
      <form class="form" id="vk"><label>${T('Passphrase (at least 12 characters)', 'Phrase secrète (12 caractères au moins)')} <input id="vk-p" type="password" minlength="12" autocomplete="${exists ? 'current-password' : 'new-password'}" required></label><button type="submit" class="primary">${exists ? T('Open', 'Ouvrir') : T('Create', 'Créer')}</button></form></div>`;
    $('vk').onsubmit = async e => { e.preventDefault(); const p = $('vk-p').value; if (p.length < 12) return toast(T('At least 12 characters.', '12 caractères au moins.'));
      try { S.vault = await VS.unlock(p, S.profile.id); render(); } catch (err) { toast(err.message); } };
    return;
  }
  const ideas = S.vault.ideas, cur = ideas.find(i => i.id === S.sel) || null, pid = S.problemId || null;
  B.innerHTML = `<div class="warn">${T('A SHA-256 fingerprint proves that a text existed in this vault at a recorded local time. It is neither a patent, nor a certified timestamp, nor proof of novelty or ownership. Publishing may compromise a future patent application.', 'Une empreinte SHA-256 prouve qu’un texte existait dans ce coffre à une heure locale enregistrée. Ce n’est ni un brevet, ni un horodatage certifié, ni une preuve de nouveauté ou de propriété. Une publication peut compromettre une future demande de brevet.')}</div>
    <div class="grid2"><div class="card"><h2>${T('My ideas', 'Mes idées')} (${ideas.length})</h2><ul>${ideas.map(i => `<li><button type="button" class="ghost small" data-open="${esc(i.id)}">${esc(i.versions.at(-1).title)}</button> · v${i.versions.length}${i.permissions.publication ? ` · ${T('published (local)', 'publiée (locale)')}` : ` · ${T('private', 'privée')}`}</li>`).join('') || `<li class="fine">${T('none', 'aucune')}</li>`}</ul>
      <button type="button" id="v-new">${T('New idea', 'Nouvelle idée')}</button> <button type="button" class="ghost small" id="v-lock">${T('Lock', 'Verrouiller')}</button></div>
    <div class="card" id="v-edit"><h2>${cur ? T(`New version of “${esc(cur.versions.at(-1).title)}”`, `Nouvelle version de « ${esc(cur.versions.at(-1).title)} »`) : T('New idea', 'Nouvelle idée')}</h2>
      <form class="form" id="vf"><label>${T('Title', 'Titre')} <input id="vf-t" maxlength="120" required value="${esc(cur?.versions.at(-1).title || '')}"></label>
      <label>${T('Problem', 'Problème')} <textarea id="vf-p" maxlength="4000" required>${esc(cur?.versions.at(-1).problem || (pid ? T(`Linked to CORE problem ${pid}. `, `Lié au problème CORE ${pid}. `) : ''))}</textarea></label>
      <label>${T('Proposed solution', 'Solution proposée')} <textarea id="vf-s" maxlength="4000" required>${esc(cur?.versions.at(-1).solution || '')}</textarea></label>
      <label>${T('Evidence and sources', 'Preuves et sources')} <textarea id="vf-e" maxlength="2000">${esc(cur?.versions.at(-1).evidence || '')}</textarea></label>
      <button type="submit" class="primary">${cur ? T('Save the version', 'Enregistrer la version') : T('Create', 'Créer')}</button></form></div></div>
    ${cur ? `<div class="card"><h2>${T('History and permissions', 'Historique et permissions')}</h2><table class="tbl"><thead><tr><th>v</th><th>${T('Local date', 'Date locale')}</th><th>${T('Fingerprint', 'Empreinte')}</th><th>${T('Previous', 'Précédente')}</th></tr></thead><tbody>${cur.versions.map(v => `<tr><td>${v.n}</td><td>${esc(v.at.slice(0, 19).replace('T', ' '))}</td><td class="hash">${esc(v.hash)}</td><td class="hash">${esc(short(v.prev))}</td></tr>`).join('')}</tbody></table>
      <p id="v-chain" class="fine">${T('Checking the chain…', 'Vérification de la chaîne…')}</p>
      <label class="inline"><input type="checkbox" id="v-labs" ${cur.permissions.labsAnalysis ? 'checked' : ''}> ${T('Allow analysis by CORE Labs (local rules, no external service)', 'Autoriser l’analyse par CORE Labs (règles locales, aucun service externe)')}</label>
      <details><summary>${T('Publish a version (local; nothing is sent)', 'Publier une version (locale, rien n’est envoyé)')}</summary><form class="form" id="vp"><label>Version <select id="vp-v">${cur.versions.map(v => `<option>${v.n}</option>`).join('')}</select></label>
        <label>${T('Licence', 'Licence')} <select id="vp-l"><option value="all-rights-reserved">${T('All rights reserved', 'Tous droits réservés')}</option><option>CC-BY-4.0</option><option>CC-BY-SA-4.0</option><option>CC0-1.0</option></select></label>
        <label class="inline"><input type="checkbox" id="vp-c"> ${T('I understand that public disclosure may compromise a patent application and that CORE acquires no right over my idea.', 'Je comprends qu’une divulgation publique peut compromettre une demande de brevet et que CORE n’acquiert aucun droit sur mon idée.')}</label>
        <button type="submit">${T('Publish locally', 'Publier localement')}</button></form></details>
      ${cur.permissions.publication ? `<p>${T('Publication', 'Publication')} : v${cur.permissions.publication.version} · ${esc(cur.permissions.publication.licence)} · attribution “${esc(cur.permissions.publication.attribution)}” · <span class="hash">${esc(short(cur.permissions.publication.hash))}</span></p>` : ''}</div>` : ''}`;
  B.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { S.sel = b.dataset.open; render(); });
  $('v-new').onclick = () => { S.sel = null; render(); };
  $('v-lock').onclick = () => { VS.lock(); };
  $('vf').onsubmit = async e => { e.preventDefault();
    try { let idea = cur || V.newIdea({ id: `idea-${Date.now().toString(36)}`, owner: S.profile.id });
      idea = await V.addVersion(idea, { title: $('vf-t').value, problem: $('vf-p').value, solution: $('vf-s').value, evidence: $('vf-e').value, problemId: pid });
      S.vault.ideas = [...ideas.filter(i => i.id !== idea.id), idea]; S.sel = idea.id; await persistVault(); render(); toast(T(`Version ${idea.versions.length} saved and encrypted.`, `Version ${idea.versions.length} enregistrée et chiffrée.`)); } catch (err) { toast(err.message); } };
  if (cur) {
    UJ.renderVaultTools(B, cur, { owner: S.profile.id, toast, save: async next => { S.vault.ideas = S.vault.ideas.map(x => x.id === next.id ? next : x); await persistVault(); },
      after: removed => { if (removed) { S.vault = VS.vault(); S.sel = null; } render(); } });
    V.verifyChain(cur).then(r => { const el = $('v-chain'); if (el) el.textContent = r.ok ? T(`Chain intact: ${r.length} version(s), every fingerprint recomputed.`, `Chaîne intacte : ${r.length} version(s), chaque empreinte recalculée.`) : T(`Chain BROKEN at version ${r.at}.`, `Chaîne ROMPUE à la version ${r.at}.`); });
    $('v-labs').onchange = async e => { const r = V.grant(cur, 'labsAnalysis', e.target.checked, S.profile.id); if (!r.ok) return toast(r.error); S.vault.ideas = ideas.map(i => i.id === cur.id ? r.value : i); await persistVault(); render(); };
    $('vp').onsubmit = async e => { e.preventDefault(); const r = V.publish(cur, { actor: S.profile.id, version: Number($('vp-v').value), licence: $('vp-l').value, pseudonym: S.profile.pseudonym, confirmDisclosure: $('vp-c').checked });
      if (!r.ok) return toast(r.error); S.vault.ideas = ideas.map(i => i.id === cur.id ? r.value : i); await persistVault(); render(); toast(T('Published locally (no public space exists yet).', 'Publiée localement (aucun espace public n’existe encore).')); };
  }
}

// ---------- Labs ----------
function renderLabs(B) {
  if (!S.vault) { B.innerHTML = `<div class="card"><p>${T('Open your vault (Idea Vault section): Labs only analyses ideas you allow it to read.', 'Ouvrez votre coffre (section Coffre à idées) : Labs n’analyse que les idées que vous l’autorisez à lire.')}</p></div>`; return; }
  const ideas = S.vault.ideas, cur = ideas.find(i => i.id === S.sel) || ideas[0];
  B.innerHTML = `<div class="card"><h2>${T('CORE Labs: explainable analysis', 'CORE Labs: analyse explicable')}</h2><p class="fine">${T('Method', 'Méthode')} ${esc(L.METHOD.id)} v${esc(L.METHOD.version)} : ${esc(LL(L.METHOD.kind))}. ${T('A checklist, not a grade; it spots elements, not their accuracy.', 'Une liste de contrôle, pas une note ; elle repère des éléments, pas leur exactitude.')}</p>
    <label>${T('Idea', 'Idée')} <select id="lb-i">${ideas.map(i => `<option value="${esc(i.id)}" ${i === cur ? 'selected' : ''}>${esc(i.versions.at(-1).title)} (v${i.versions.length})</option>`).join('')}</select></label>
    <button type="button" class="primary" id="lb-run" ${cur ? '' : 'disabled'}>${T('Analyse the latest version', 'Analyser la dernière version')}</button></div>
    ${cur?.reviews.length ? cur.reviews.map((r, k) => `<div class="card"><h3>${T(`Analysis of v${r.version}`, `Analyse de la v${r.version}`)} · ${esc(r.at.slice(0, 16).replace('T', ' '))}</h3><ul class="check">${r.items.map(i => `<li class="${i.status}"><b>${i.status === 'present' ? '✓' : '○'} ${esc(LL(L.label(i)))}</b> · ${esc(LL(L.note(i)))}</li>`).join('')}</ul>
      <p class="fine">${esc(LL(L.limitsText(r.limits)))}</p><form class="form" data-contest="${k}"><label>${T('Contest this analysis', 'Contester cette analyse')} <input maxlength="1000" placeholder="${T('reason (at least 15 characters)', 'motif (15 caractères au moins)')}"></label><button type="submit" class="ghost small">${T('Contest', 'Contester')}</button></form></div>`).join('') : ''}
    ${cur?.contests.length ? `<div class="card"><h3>${T('Contests', 'Contestations')}</h3><ul>${cur.contests.map(c => `<li>${esc(c.reason)} · <i>${esc(c.status)}</i></li>`).join('')}</ul></div>` : ''}`;
  $('lb-i').onchange = e => { S.sel = e.target.value; render(); };
  $('lb-run').onclick = async () => { const r = L.review(cur, { recent: S.labsLog }); if (!r.ok) return toast(r.error);
    S.labsLog.push({ idea: cur.id, at: r.value.at }); saveCommons(); S.vault.ideas = ideas.map(i => i.id === cur.id ? { ...i, reviews: [...i.reviews, r.value] } : i); S.sel = cur.id; await persistVault(); render(); };
  B.querySelectorAll('[data-contest]').forEach(f => f.onsubmit = async e => { e.preventDefault(); const r = L.contest(cur, { reviewIndex: Number(f.dataset.contest), reason: f.querySelector('input').value, actor: S.profile.id });
    if (!r.ok) return toast(r.error); S.vault.ideas = ideas.map(i => i.id === cur.id ? r.value : i); await persistVault(); render(); });
  if (cur) UJ.renderDossier(B, cur, { toast });
}

// ---------- Arena (fictional demo) ----------
// Two fictional entries and two fictional judge sheets are written in advance and labelled; the user sits as judge 3.
const FICT_ENTRIES = () => ({ 'fictif-1': T('Install removable shade sails and two trees in planters; detailed budget €31,000; measure ground temperature before and after over ten days.', 'Installer des voiles d’ombrage démontables et deux arbres en bacs ; budget détaillé 31 000 € ; mesurer la température au sol avant et après sur dix jours.'), 'fictif-2': T('Paint the ground a light colour and add misters; estimated budget €18,000; risk: water use, to be monitored with a meter.', 'Peindre le sol en couleur claire et ajouter des brumisateurs ; budget estimé 18 000 € ; risque : consommation d’eau, à surveiller par compteur.') });
const FICT_SHEETS = { 'jury-fictif-1': { 'fictif-1': [3, 3, 2, 2, 3], 'fictif-2': [2, 3, 2, 3, 2] }, 'jury-fictif-2': { 'fictif-1': [3, 2, 3, 2, 3], 'fictif-2': [2, 2, 3, 3, 1] } };
const NOTE = () => T('Demonstration sheet written in advance (fictional judge).', 'Fiche de démonstration rédigée à l’avance (jury fictif).');
function arenaStart() {
  const ok = r => { if (!r.ok) throw Error(r.error); return r.value; };
  let t = A.newTournament();
  for (const e of Object.keys(FICT_ENTRIES())) t = ok(A.register(t, { who: e, role: 'participant' }));
  for (const j of [...Object.keys(FICT_SHEETS), 'vous']) t = ok(A.register(t, { who: j, role: 'judge' }));
  t = ok(A.close(t, 'submission')); for (const [e, text] of Object.entries(FICT_ENTRIES())) t = ok(A.submit(t, { who: e, text }));
  t = ok(A.close(t, 'judging'));
  const crit = t.challenge.criteria.map(([id]) => id);
  for (const [j, by] of Object.entries(FICT_SHEETS)) for (const [e, sc] of Object.entries(by)) t = ok(A.judge(t, { who: j, entry: e, scores: Object.fromEntries(crit.map((c, i) => [c, sc[i]])), notes: Object.fromEntries(crit.map(c => [c, NOTE()])) }));
  return t;
}
function renderArena(B) {
  const ch = A.CHALLENGE; S.arena = S.arena || arenaStart(); const t = S.arena, crit = ch.criteria;
  const mine = A.visibleSheets(t, 'vous'), todo = Object.keys(t.submissions).filter(e => !mine.some(s => s.entry === e));
  const res = t.phase === 'closed' ? A.results(t) : null;
  B.innerHTML = `<p class="fict">${esc(LL(ch.label))}</p><div class="card"><h2>${esc(LL(ch.title))}</h2><p>${esc(LL(ch.statement))}</p><h3>${T('Published rules', 'Règles publiées')}</h3><ol>${ch.rules.map(r => `<li>${esc(LL(r))}</li>`).join('')}</ol>
    <p class="fine">${T('Roles', 'Rôles')} : ${Object.values(A.ROLES).map(r => esc(LL(r))).join(' · ')}. ${T('The “Spectator-voter” role is closed', 'Le rôle « Spectateur-votant » est fermé')} : ${esc(A.register(A.newTournament(), { who: 'x', role: 'spectator-voter' }).error)}.</p></div>
    <div class="card"><h2>${T('Demonstration: you are judge no. 3', 'Démonstration : vous êtes le juge n° 3')}</h2><p class="fine">${T('Two fictional proposals and two fictional judge sheets are provided for the demonstration. Your sheets stay sealed: you do not see the other judges’ sheets before closing.', 'Deux propositions et deux fiches de jury fictives sont fournies pour la démonstration. Vos fiches restent scellées : vous ne voyez pas celles des autres juges avant la clôture.')}</p>
    ${todo.length ? todo.map(e => `<form class="form card" data-judge="${esc(e)}"><b>${esc(e)}</b><p>${esc(t.submissions[e].text)}</p>${crit.map(([id, label]) => `<div class="inline"><label>${esc(LL(label))} <select data-c="${id}">${[0, 1, 2, 3, 4].map(n => `<option>${n}</option>`).join('')}</select></label><input data-n="${id}" maxlength="200" aria-label="${T('Justification', 'Justification')} : ${esc(LL(label))}" placeholder="${T('justification (at least 10 characters)', 'justification (10 caractères au moins)')}"></div>`).join('')}<button type="submit">${T('Seal my sheet', 'Sceller ma fiche')}</button></form>`).join('')
      : t.phase === 'judging' ? `<button type="button" class="primary" id="ar-close">${T('Close and publish the results', 'Clôturer et publier les résultats')}</button>` : ''}
    ${res?.ok ? `<h3>${T('Results (fictional)', 'Résultats (fictifs)')}</h3><table class="tbl"><thead><tr><th>${T('Rank', 'Rang')}</th><th>${T('Proposal', 'Proposition')}</th><th>${T('Median total', 'Total médian')}</th><th>${T('Evidence (median)', 'Preuves (médiane)')}</th></tr></thead><tbody>${res.value.ranking.map(r => `<tr><td>${r.rank}</td><td>${esc(r.entry)}</td><td>${r.total}</td><td>${r.evidence}</td></tr>`).join('')}</tbody></table>
      <p class="fine">${T(`This ranking recognises proposals in a fictional challenge. It is neither a scientific validation (${res.value.scientificValidation}) nor an authorisation to act (${res.value.authorizes}).`, `Ce classement reconnaît des propositions dans un défi fictif. Il ne vaut ni validation scientifique (${res.value.scientificValidation}) ni autorisation d’agir (${res.value.authorizes}).`)}</p>
      <details><summary>${T('All sheets', 'Toutes les fiches')} (${res.value.sheets.length})</summary><table class="tbl"><tbody>${res.value.sheets.map(s => `<tr><td>${esc(s.judge)} → ${esc(s.entry)}</td><td>${Object.values(s.scores).join(' · ')}</td><td>${esc(Object.values(s.notes)[0])}</td></tr>`).join('')}</tbody></table></details>
      <button type="button" class="ghost small" id="ar-reset">${T('Restart the demonstration', 'Recommencer la démonstration')}</button>` : ''}</div>`;
  B.querySelectorAll('[data-judge]').forEach(f => f.onsubmit = e => { e.preventDefault();
    const scores = Object.fromEntries(crit.map(([id]) => [id, Number(f.querySelector(`[data-c="${id}"]`).value)])), notes = Object.fromEntries(crit.map(([id]) => [id, f.querySelector(`[data-n="${id}"]`).value]));
    const r = A.judge(S.arena, { who: 'vous', entry: f.dataset.judge, scores, notes }); if (!r.ok) return toast(r.error); S.arena = r.value; render(); });
  $('ar-close')?.addEventListener('click', () => { const r = A.close(S.arena, 'closed'); if (!r.ok) return toast(r.error); S.arena = r.value; render(); });
  $('ar-reset')?.addEventListener('click', () => { S.arena = null; render(); });
  UM.renderDebate(B, S, { toast });
}

// ---------- Academy (teacher demo) ----------
function renderAcademy(B) {
  const lid = S.route?.lesson || S.academy?.lesson || C.LESSON.id, Ls = C.lessonById(lid); if (!S.academy || S.academy.lesson !== Ls.id) S.academy = C.startSession({ teacher: 'enseignant-demo', lesson: Ls.id }).value; const s = S.academy; const sum = C.summary(s);
  B.innerHTML = `<div class="card"><h2>CORE Academy</h2><table class="tbl"><tbody>${C.PATHWAYS.map(p => `<tr><td><b>${esc(p.name)}</b></td><td>${esc(LL(p.ages))}</td><td>${esc(LL(p.status))}</td></tr>`).join('')}</tbody></table>
    <p class="warn">${T('Teacher-demonstration mode only: no minor is invited; pupils A, B and C are fictional. No messaging between pupils, no ranking, no public profile. The teacher keeps pedagogical authority.', 'Mode démonstration enseignant uniquement : aucun mineur n’est invité ; les élèves A, B et C sont fictifs. Ni messagerie entre élèves, ni classement, ni profil public. L’enseignant garde l’autorité pédagogique.')}</p></div>
    <div class="card"><label>${T('Lesson', 'Leçon')} <select id="ac-lesson">${C.LESSONS.map(l => `<option value="${esc(l.id)}" ${l.id === Ls.id ? 'selected' : ''}>${esc(LL(l.title))}</option>`).join('')}</select></label></div>
    <div class="card"><h2>${esc(LL(Ls.title))}</h2><p class="fine">${T('Pathways', 'Parcours')} ${Ls.pathways.join(', ')} · ${Ls.minutes} min · ${T('real source', 'source réelle')} : <a href="${esc(Ls.source.url)}" target="_blank" rel="noopener noreferrer">${esc(Ls.source.record)}</a></p>
    <ul>${Ls.goals.map(g => `<li>${esc(LL(g))}</li>`).join('')}</ul>
    <label>${T('Answer as', 'Répondre en tant que')} <select id="ac-l">${C.PERSONAS.map(p => `<option value="${p.id}">${esc(LL(p.label))}</option>`).join('')}</select></label>
    ${Ls.questions.map(q => `<form class="form" data-q="${q.id}"><b>${esc(LL(q.text))}</b>${q.kind === 'choice' ? q.options.map((o, i) => `<label class="inline"><input type="radio" name="${q.id}" value="${i}"> ${esc(LL(o))}</label>`).join('') : `<textarea maxlength="400" aria-label="${esc(LL(q.text))}"></textarea>`}<button type="submit" class="small">${T('Answer', 'Répondre')}</button></form>`).join('')}</div>
    <div class="card"><h2>${T('Teacher view', 'Vue enseignant')}</h2><table class="tbl"><thead><tr><th>${T('Question', 'Question')}</th><th>${T('Answers', 'Réponses')}</th><th>${T('Correct', 'Justes')}</th><th>${T('To review', 'À relire')}</th></tr></thead><tbody>${sum.map(r => `<tr><td>${r.question}</td><td>${r.answered}</td><td>${r.correct ?? '—'}</td><td>${r.toReview}</td></tr>`).join('')}</tbody></table>
    ${Object.entries(s.answers).filter(([k]) => Ls.questions.find(q => q.id === k.split(':')[1])?.kind === 'open').map(([k, a]) => `<form class="form" data-fb="${esc(k)}"><span>${esc(k.split(':')[0])} : “${esc(a.value)}”</span>${s.feedback[k] ? `<i>${T('Feedback', 'Retour')} : ${esc(s.feedback[k])}</i>` : `<input maxlength="400" placeholder="${T('teacher feedback', 'retour de l’enseignant')}"><button type="submit" class="small">${T('Send feedback', 'Envoyer le retour')}</button>`}</form>`).join('')}
    <p class="fine">${T('Open answers are never graded automatically: only the teacher answers them. Guide for the teacher', 'Les réponses ouvertes ne sont jamais notées automatiquement : seul l’enseignant y répond. Repère pour l’enseignant')} : ${esc(LL(Ls.questions.find(q => q.kind === 'open').explain))}</p></div>`;
  $('ac-lesson').onchange = e => go('academy', { lesson: e.target.value });
  B.querySelectorAll('[data-q]').forEach(f => f.onsubmit = e => { e.preventDefault(); const q = Ls.questions.find(x => x.id === f.dataset.q);
    const v = q.kind === 'choice' ? f.querySelector('input:checked')?.value : f.querySelector('textarea').value; if (v == null || v === '') return toast(T('Choose or write an answer.', 'Choisissez ou écrivez une réponse.'));
    const r = C.answer(S.academy, { learner: $('ac-l').value, question: q.id, value: v }); if (!r.ok) return toast(r.error); S.academy = r.value;
    toast(q.kind === 'choice' ? `${r.value.answers[`${$('ac-l').value}:${q.id}`].correct ? T('Correct.', 'Juste.') : T('Not quite.', 'Pas tout à fait.')} ${LL(q.explain)}` : T('Answer passed to the teacher (in this browser).', 'Réponse transmise à l’enseignant (dans ce navigateur).')); render(); });
  B.querySelectorAll('[data-fb]').forEach(f => f.onsubmit = e => { e.preventDefault(); const [learner, question] = f.dataset.fb.split(':');
    const r = C.feedback(S.academy, { actor: 'enseignant-demo', learner, question, text: f.querySelector('input').value }); if (!r.ok) return toast(r.error); S.academy = r.value; render(); });
}

// ---------- Progress ----------
async function renderProgress(B) {
  if (!S.data) { B.innerHTML = `<p class="fine">${T('Loading the registries…', 'Chargement des registres…')}</p>`; try { S.data = Object.fromEntries(await Promise.all([['problems', 'data/problems/registry.json'], ['civIndex', 'data/civ/index.json'], ['agents', 'data/agents/registry.json'], ['energy', 'data/sf/energy-benchmarks.geojson'], ['sidewalks', 'data/sf/sidewalks.geojson']].map(async ([k, u]) => [k, await (await fetch(u)).json()]))); } catch (e) { B.innerHTML = `<p class="warn">${T(`Registries unavailable (${esc(e.message)}). No indicator is shown without its data.`, `Registres indisponibles (${esc(e.message)}). Aucun indicateur n’est affiché sans ses données.`)}</p>`; return; } }
  const v = G.virtualProgress(S.data), e = G.earthIndicators(S.data);
  B.innerHTML = `<div class="card"><h2>${T('CORE’s virtual progress : activity, not impact', 'Progrès virtuel de CORE : activité, pas impact')}</h2><div class="kpi-row">${v.map(x => `<div class="kpi"><b>${esc(x.value)}</b>${esc(LL(x.label))}<br><span class="fine">${esc(LL(x.basis))}</span></div>`).join('')}</div></div>
    <div class="card"><h2>${T('Real progress on Earth: sourced indicators', 'Progrès réel de la Terre, indicateurs sourcés')}</h2>${e.map(i => `<div class="card"><h3>${esc(LL(i.domain))} · ${esc(LL(i.label))}</h3><p><b>${esc(i.value)}</b> ${esc(LL(i.unit))} (n = ${i.n})</p>
      <dl class="kv"><dt>Source</dt><dd><a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">${esc(i.source)}</a></dd><dt>${T('Period', 'Période')}</dt><dd>${esc(LL(i.period))}</dd><dt>${T('Method', 'Méthode')}</dt><dd>${esc(LL(i.method))}</dd><dt>${T('Uncertainty', 'Incertitude')}</dt><dd>${esc(LL(i.uncertainty))}</dd><dt>${T('Scope', 'Portée')}</dt><dd>${esc(LL(i.scope))}</dd><dt>${T('Trend', 'Tendance')}</dt><dd>${esc(LL(i.trend))}</dd></dl></div>`).join('')}
      <p class="fine">${T('No universal civilisation score is computed: energy, accessibility, environment, institutions and well-being cannot be reduced to one number. The full progress dashboard is on the Progress page.', 'Aucun score universel de civilisation n’est calculé : énergie, accessibilité, environnement, institutions et bien-être ne se résument pas en un nombre. Le tableau de bord complet est sur la page Progrès.')} <a href="progress.html">${T('Progress', 'Progrès')}</a></p></div>
    <div class="card"><h2>${T('Kardashev scale (educational tool)', 'Échelle de Kardashev (outil éducatif)')}</h2><p class="fine">${T('Sagan’s interpolation: K = (log₁₀ P − 6) / 10, P in watts. Type I ≈ 10¹⁶ W, II ≈ 10²⁶ W, III ≈ 10³⁶ W. It measures power used, not well-being, equity, knowledge or sustainability; more energy is not “better” in itself.', 'Interpolation de Sagan : K = (log₁₀ P − 6) / 10, P en watts. Type I ≈ 10¹⁶ W, II ≈ 10²⁶ W, III ≈ 10³⁶ W. Elle mesure la puissance utilisée, pas le bien-être, l’équité, la connaissance ni la durabilité ; plus d’énergie n’est pas « mieux » en soi.')}</p>
      <form class="form inline" id="kd"><label>${T('Power (W)', 'Puissance (W)')} <input id="kd-p" inputmode="decimal" placeholder="${T('e.g. 1e13 (enter a value and its source)', 'ex. 1e13 (entrez une valeur et sa source)')}"></label><button type="submit">${T('Compute', 'Calculer')}</button></form><p id="kd-out" aria-live="polite"></p></div>`;
  $('kd').onsubmit = ev => { ev.preventDefault(); try { const r = G.kardashev(Number($('kd-p').value)); $('kd-out').textContent = `K = ${r.K.toFixed(3)} · ${LL(r.note)}.`; } catch (err) { $('kd-out').textContent = err.message; } };
}

// ---------- Knowledge (V6): see ui-knowledge.mjs ----------
const renderKnowledge = B => UK.renderKnowledge(B, S, { go, toast, profile: S.profile });

const RENDER = { continuity: UM.renderContinuity, institutions: B => UM.renderInstitutions(B), experts: B => UN.renderExperts(B, S, { toast, go }), communities: B => UN.renderCommunities(B, S, { toast, go }), journey: UJ.renderJourney, trust: UJ.renderTrust, knowledge: renderKnowledge, profile: renderProfile, vault: renderVault, labs: renderLabs, arena: renderArena, academy: renderAcademy, progress: renderProgress };
// ---------- routing: commons.html#section?key=value (deep links, back button, no reload) ----------
function route() {
  const [sec, q] = location.hash.slice(1).split('?'), hp = new URLSearchParams(q || '');
  S.tab = RENDER[sec] ? sec : RENDER[params.get('tab')] ? params.get('tab') : 'profile';
  S.route = Object.fromEntries(hp); if (hp.get('idea')) S.sel = hp.get('idea');
  if (hp.get('problem')) S.problemId = hp.get('problem'); else if (params.get('problem')) S.problemId = params.get('problem');
}
export function go(section, query = {}) { const q = new URLSearchParams(query).toString(); location.hash = section + (q ? `?${q}` : ''); }
function render() {
  const g = NAV.groupOf(S.tab); NAV.render($('core-nav'), { active: g?.id });
  const sec = g?.sections?.find(([id]) => id === S.tab);
  const secLabel = sec ? (Array.isArray(sec[1]) ? T(...sec[1]) : sec[1]) : null, gLabel = g ? (T(g.label, { explore: 'Explorer', create: 'Créer', collaborate: 'Ensemble', me: 'Mon CORE' }[g.id] || g.label)) : 'CORE';
  $('cm-eyebrow').textContent = gLabel; document.querySelector('#cm-main h1').textContent = secLabel || T('CORE’s human layer', 'La couche humaine de CORE');
  document.title = `CORE · ${secLabel || 'Commons'}`;
  const bar = document.querySelector('.cm-tabs');
  bar.innerHTML = NAV.subnav(g?.id, S.tab);
  bar.querySelectorAll('a[href^="commons.html#"]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.getAttribute('href').split('#')[1]); $('cm-body').focus(); });
  const B = $('cm-body'), tab = S.tab; Promise.resolve(RENDER[tab](B)).then(() => { if (S.tab === tab) return UMI.append(tab, B); }).catch(() => {});
}
addEventListener('hashchange', () => { route(); render(); });
route();
render();
onLang(() => { S.arena = null; render(); });
globalThis.CORE_COMMONS = { state: S, render, go };
