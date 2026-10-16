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
VS.onChange(open => { if (!open && S.vault) { S.vault = null; S.sel = null; toast('Coffre verrouillé automatiquement.'); render(); } });
const short = h => h ? `${h.slice(0, 12)}…` : '—';

// ---------- Profile ----------
function renderProfile(B) {
  if (!S.profile) {
    const w = get('core.world.v1')?.avatar;
    B.innerHTML = `<div class="card"><h2>Créer une identité CORE (pseudonyme)</h2>
      <p class="fine">Aucun nom réel n’est demandé. Tout est privé par défaut ; vous choisissez champ par champ ce qui deviendrait public le jour où un espace public existera.</p>
      <form class="form" id="pf"><label>Pseudonyme <input id="pf-ps" required maxlength="24" value="${esc(w?.name || '')}"></label>
      <label>Tranche d’âge <select id="pf-age"><option value="adult">Adulte</option><option value="minor">Mineur</option></select></label>
      <p class="fine">${w ? `Avatar CORE World lié : ${esc(w.preset)}.` : 'Aucun avatar CORE World dans ce navigateur (vous pourrez en créer un dans CORE World).'}</p>
      <button type="submit" class="primary">Créer</button></form></div>`;
    $('pf').onsubmit = e => { e.preventDefault(); try { S.profile = I.createProfile({ pseudonym: $('pf-ps').value, ageBand: $('pf-age').value, avatar: w ? { preset: w.preset, top: w.top, hair: w.hair } : null }); saveCommons(); render(); } catch (err) { toast(err.message); } };
    return;
  }
  const p = S.profile, pub = I.publicView(p);
  B.innerHTML = `<div class="grid2"><div class="card"><h2>${esc(p.pseudonym)}</h2><p class="hash">${esc(p.id)}</p>
      <form class="form" id="pe"><label>Biographie (facultative) <textarea id="pe-bio" maxlength="400">${esc(p.bio)}</textarea></label>
      <label>Centres d’intérêt (séparés par des virgules) <input id="pe-int" maxlength="200" value="${esc(p.interests.join(', '))}"></label>
      <label>Problèmes que je veux résoudre <input id="pe-pb" maxlength="200" value="${esc(p.problems.join(', '))}"></label>
      <div class="inline"><label>Compétence déclarée <input id="pe-ex" maxlength="60"></label><label>Années <input id="pe-yr" type="number" min="0" max="70" style="width:5em"></label></div>
      <button type="submit">Enregistrer</button></form>
      <h3>Compétences</h3><ul>${p.expertise.map(e => `<li>${esc(e.label)}${e.years != null ? ` · ${e.years} an(s)` : ''} — <span class="badge ${e.basis === 'verified' ? 'observed' : 'approx'}">${e.basis === 'verified' ? 'VÉRIFIÉE' : 'DÉCLARÉE'}</span></li>`).join('') || '<li class="fine">aucune</li>'}</ul>
      <p class="fine">Une compétence déclarée reste déclarée : aucun vérificateur n’existe dans ce prototype.</p></div>
    <div class="card"><h2>Visibilité</h2><table class="tbl"><tbody>${I.FIELDS.map(f => `<tr><td>${esc(f)}</td><td><label><input type="checkbox" data-vis="${f}" ${p.visibility[f] === 'public' ? 'checked' : ''}> public</label></td></tr>`).join('')}</tbody></table>
      <label class="inline"><input type="checkbox" id="pe-lb" ${p.leaderboards ? 'checked' : ''}> Apparaître dans des classements thématiques (aucun classement n’existe encore)</label>
      <h3>Ce que verrait une autre personne</h3><pre class="hash" id="pe-pub">${esc(JSON.stringify(pub, null, 1))}</pre>
      <button type="button" class="ghost small" id="pe-del">Supprimer mon profil local</button></div></div>`;
  $('pe').onsubmit = e => { e.preventDefault(); let q = { ...S.profile, bio: $('pe-bio').value.slice(0, 400), interests: $('pe-int').value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10), problems: $('pe-pb').value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10) };
    if ($('pe-ex').value.trim()) q = I.declareExpertise(q, $('pe-ex').value, $('pe-yr').value === '' ? null : Number($('pe-yr').value));
    S.profile = q; saveCommons(); render(); toast('Profil enregistré dans ce navigateur.'); };
  B.querySelectorAll('[data-vis]').forEach(c => c.onchange = () => { try { S.profile = I.setVisibility(S.profile, c.dataset.vis, c.checked ? 'public' : 'private'); saveCommons(); render(); } catch (err) { c.checked = false; toast(err.message); } });
  $('pe-lb').onchange = e => { try { S.profile = I.setLeaderboards(S.profile, e.target.checked); saveCommons(); } catch (err) { e.target.checked = false; toast(err.message); } };
  $('pe-del').onclick = () => { S.profile = null; saveCommons(); render(); };
}

// ---------- Vault ----------
function renderVault(B) {
  if (!S.profile) { B.innerHTML = '<div class="card"><p>Créez d’abord une identité (onglet Profil).</p></div>'; return; }
  if (!S.vault) {
    const exists = !!get('core.vault.v1');
    B.innerHTML = `<div class="card"><h2>${exists ? 'Ouvrir' : 'Créer'} votre coffre à idées</h2>
      <p class="fine">Vos idées privées sont chiffrées dans ce navigateur (AES-GCM, clé dérivée de votre phrase secrète par PBKDF2). Sans la phrase, personne — ni CORE — ne peut les lire, et elles sont perdues si vous l’oubliez.</p>
      <form class="form" id="vk"><label>Phrase secrète (12 caractères au moins) <input id="vk-p" type="password" minlength="12" autocomplete="${exists ? 'current-password' : 'new-password'}" required></label><button type="submit" class="primary">${exists ? 'Ouvrir' : 'Créer'}</button></form></div>`;
    $('vk').onsubmit = async e => { e.preventDefault(); const p = $('vk-p').value; if (p.length < 12) return toast('12 caractères au moins.');
      try { S.vault = await VS.unlock(p, S.profile.id); render(); } catch (err) { toast(err.message); } };
    return;
  }
  const ideas = S.vault.ideas, cur = ideas.find(i => i.id === S.sel) || null, pid = S.problemId || null;
  B.innerHTML = `<div class="warn">Une empreinte SHA-256 prouve qu’un texte existait dans ce coffre à une heure locale enregistrée. Ce n’est ni un brevet, ni un horodatage certifié, ni une preuve de nouveauté ou de propriété. Une publication peut compromettre une future demande de brevet.</div>
    <div class="grid2"><div class="card"><h2>Mes idées (${ideas.length})</h2><ul>${ideas.map(i => `<li><button type="button" class="ghost small" data-open="${esc(i.id)}">${esc(i.versions.at(-1).title)}</button> · v${i.versions.length}${i.permissions.publication ? ' · publiée (locale)' : ' · privée'}</li>`).join('') || '<li class="fine">aucune</li>'}</ul>
      <button type="button" id="v-new">Nouvelle idée</button> <button type="button" class="ghost small" id="v-lock">Verrouiller</button></div>
    <div class="card" id="v-edit"><h2>${cur ? `Nouvelle version de « ${esc(cur.versions.at(-1).title)} »` : 'Nouvelle idée'}</h2>
      <form class="form" id="vf"><label>Titre <input id="vf-t" maxlength="120" required value="${esc(cur?.versions.at(-1).title || '')}"></label>
      <label>Problème <textarea id="vf-p" maxlength="4000" required>${esc(cur?.versions.at(-1).problem || (pid ? `Lié au problème CORE ${pid}. ` : ''))}</textarea></label>
      <label>Solution proposée <textarea id="vf-s" maxlength="4000" required>${esc(cur?.versions.at(-1).solution || '')}</textarea></label>
      <label>Preuves et sources <textarea id="vf-e" maxlength="2000">${esc(cur?.versions.at(-1).evidence || '')}</textarea></label>
      <button type="submit" class="primary">${cur ? 'Enregistrer la version' : 'Créer'}</button></form></div></div>
    ${cur ? `<div class="card"><h2>Historique et permissions</h2><table class="tbl"><thead><tr><th>v</th><th>Date locale</th><th>Empreinte</th><th>Précédente</th></tr></thead><tbody>${cur.versions.map(v => `<tr><td>${v.n}</td><td>${esc(v.at.slice(0, 19).replace('T', ' '))}</td><td class="hash">${esc(v.hash)}</td><td class="hash">${esc(short(v.prev))}</td></tr>`).join('')}</tbody></table>
      <p id="v-chain" class="fine">Vérification de la chaîne…</p>
      <label class="inline"><input type="checkbox" id="v-labs" ${cur.permissions.labsAnalysis ? 'checked' : ''}> Autoriser l’analyse par CORE Labs (règles locales, aucun service externe)</label>
      <details><summary>Publier une version (locale, rien n’est envoyé)</summary><form class="form" id="vp"><label>Version <select id="vp-v">${cur.versions.map(v => `<option>${v.n}</option>`).join('')}</select></label>
        <label>Licence <select id="vp-l"><option value="all-rights-reserved">Tous droits réservés</option><option>CC-BY-4.0</option><option>CC-BY-SA-4.0</option><option>CC0-1.0</option></select></label>
        <label class="inline"><input type="checkbox" id="vp-c"> Je comprends qu’une divulgation publique peut compromettre une demande de brevet et que CORE n’acquiert aucun droit sur mon idée.</label>
        <button type="submit">Publier localement</button></form></details>
      ${cur.permissions.publication ? `<p>Publication : v${cur.permissions.publication.version} · ${esc(cur.permissions.publication.licence)} · attribution « ${esc(cur.permissions.publication.attribution)} » · <span class="hash">${esc(short(cur.permissions.publication.hash))}</span></p>` : ''}</div>` : ''}`;
  B.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { S.sel = b.dataset.open; render(); });
  $('v-new').onclick = () => { S.sel = null; render(); };
  $('v-lock').onclick = () => { VS.lock(); };
  $('vf').onsubmit = async e => { e.preventDefault();
    try { let idea = cur || V.newIdea({ id: `idea-${Date.now().toString(36)}`, owner: S.profile.id });
      idea = await V.addVersion(idea, { title: $('vf-t').value, problem: $('vf-p').value, solution: $('vf-s').value, evidence: $('vf-e').value, problemId: pid });
      S.vault.ideas = [...ideas.filter(i => i.id !== idea.id), idea]; S.sel = idea.id; await persistVault(); render(); toast(`Version ${idea.versions.length} enregistrée et chiffrée.`); } catch (err) { toast(err.message); } };
  if (cur) {
    UJ.renderVaultTools(B, cur, { owner: S.profile.id, toast, save: async next => { S.vault.ideas = S.vault.ideas.map(x => x.id === next.id ? next : x); await persistVault(); },
      after: removed => { if (removed) { S.vault = VS.vault(); S.sel = null; } render(); } });
    V.verifyChain(cur).then(r => { const el = $('v-chain'); if (el) el.textContent = r.ok ? `Chaîne intacte : ${r.length} version(s), chaque empreinte recalculée.` : `Chaîne ROMPUE à la version ${r.at}.`; });
    $('v-labs').onchange = async e => { const r = V.grant(cur, 'labsAnalysis', e.target.checked, S.profile.id); if (!r.ok) return toast(r.error); S.vault.ideas = ideas.map(i => i.id === cur.id ? r.value : i); await persistVault(); render(); };
    $('vp').onsubmit = async e => { e.preventDefault(); const r = V.publish(cur, { actor: S.profile.id, version: Number($('vp-v').value), licence: $('vp-l').value, pseudonym: S.profile.pseudonym, confirmDisclosure: $('vp-c').checked });
      if (!r.ok) return toast(r.error); S.vault.ideas = ideas.map(i => i.id === cur.id ? r.value : i); await persistVault(); render(); toast('Publiée localement (aucun espace public n’existe encore).'); };
  }
}

// ---------- Labs ----------
function renderLabs(B) {
  if (!S.vault) { B.innerHTML = '<div class="card"><p>Ouvrez votre coffre (onglet Coffre à idées) : Labs n’analyse que les idées que vous l’autorisez à lire.</p></div>'; return; }
  const ideas = S.vault.ideas, cur = ideas.find(i => i.id === S.sel) || ideas[0];
  B.innerHTML = `<div class="card"><h2>CORE Labs — analyse explicable</h2><p class="fine">Méthode ${esc(L.METHOD.id)} v${esc(L.METHOD.version)} : ${esc(L.METHOD.kind)}. Une liste de contrôle, pas une note ; elle repère des éléments, pas leur exactitude.</p>
    <label>Idée <select id="lb-i">${ideas.map(i => `<option value="${esc(i.id)}" ${i === cur ? 'selected' : ''}>${esc(i.versions.at(-1).title)} (v${i.versions.length})</option>`).join('')}</select></label>
    <button type="button" class="primary" id="lb-run" ${cur ? '' : 'disabled'}>Analyser la dernière version</button></div>
    ${cur?.reviews.length ? cur.reviews.map((r, k) => `<div class="card"><h3>Analyse de la v${r.version} · ${esc(r.at.slice(0, 16).replace('T', ' '))}</h3><ul class="check">${r.items.map(i => `<li class="${i.status}"><b>${i.status === 'present' ? '✓' : '○'} ${esc(i.label)}</b> — ${esc(i.note)}</li>`).join('')}</ul>
      <p class="fine">${esc(r.limits)}</p><form class="form" data-contest="${k}"><label>Contester cette analyse <input maxlength="1000" placeholder="motif (15 caractères au moins)"></label><button type="submit" class="ghost small">Contester</button></form></div>`).join('') : ''}
    ${cur?.contests.length ? `<div class="card"><h3>Contestations</h3><ul>${cur.contests.map(c => `<li>${esc(c.reason)} — <i>${esc(c.status)}</i></li>`).join('')}</ul></div>` : ''}`;
  $('lb-i').onchange = e => { S.sel = e.target.value; render(); };
  $('lb-run').onclick = async () => { const r = L.review(cur, { recent: S.labsLog }); if (!r.ok) return toast(r.error);
    S.labsLog.push({ idea: cur.id, at: r.value.at }); saveCommons(); S.vault.ideas = ideas.map(i => i.id === cur.id ? { ...i, reviews: [...i.reviews, r.value] } : i); S.sel = cur.id; await persistVault(); render(); };
  B.querySelectorAll('[data-contest]').forEach(f => f.onsubmit = async e => { e.preventDefault(); const r = L.contest(cur, { reviewIndex: Number(f.dataset.contest), reason: f.querySelector('input').value, actor: S.profile.id });
    if (!r.ok) return toast(r.error); S.vault.ideas = ideas.map(i => i.id === cur.id ? r.value : i); await persistVault(); render(); });
  if (cur) UJ.renderDossier(B, cur, { toast });
}

// ---------- Arena (fictional demo) ----------
// Two fictional entries and two fictional judge sheets are written in advance and labelled; the user sits as judge 3.
const FICT_ENTRIES = { 'fictif-1': 'Installer des voiles d’ombrage démontables et deux arbres en bacs ; budget détaillé 31 000 € ; mesurer la température au sol avant et après sur dix jours.', 'fictif-2': 'Peindre le sol en couleur claire et ajouter des brumisateurs ; budget estimé 18 000 € ; risque : consommation d’eau, à surveiller par compteur.' };
const FICT_SHEETS = { 'jury-fictif-1': { 'fictif-1': [3, 3, 2, 2, 3], 'fictif-2': [2, 3, 2, 3, 2] }, 'jury-fictif-2': { 'fictif-1': [3, 2, 3, 2, 3], 'fictif-2': [2, 2, 3, 3, 1] } };
const NOTE = 'Fiche de démonstration rédigée à l’avance (jury fictif).';
function arenaStart() {
  const ok = r => { if (!r.ok) throw Error(r.error); return r.value; };
  let t = A.newTournament();
  for (const e of Object.keys(FICT_ENTRIES)) t = ok(A.register(t, { who: e, role: 'participant' }));
  for (const j of [...Object.keys(FICT_SHEETS), 'vous']) t = ok(A.register(t, { who: j, role: 'judge' }));
  t = ok(A.close(t, 'submission')); for (const [e, text] of Object.entries(FICT_ENTRIES)) t = ok(A.submit(t, { who: e, text }));
  t = ok(A.close(t, 'judging'));
  const crit = t.challenge.criteria.map(([id]) => id);
  for (const [j, by] of Object.entries(FICT_SHEETS)) for (const [e, sc] of Object.entries(by)) t = ok(A.judge(t, { who: j, entry: e, scores: Object.fromEntries(crit.map((c, i) => [c, sc[i]])), notes: Object.fromEntries(crit.map(c => [c, NOTE])) }));
  return t;
}
function renderArena(B) {
  const ch = A.CHALLENGE; S.arena = S.arena || arenaStart(); const t = S.arena, crit = ch.criteria;
  const mine = A.visibleSheets(t, 'vous'), todo = Object.keys(t.submissions).filter(e => !mine.some(s => s.entry === e));
  const res = t.phase === 'closed' ? A.results(t) : null;
  B.innerHTML = `<p class="fict">${esc(ch.label)}</p><div class="card"><h2>${esc(ch.title)}</h2><p>${esc(ch.statement)}</p><h3>Règles publiées</h3><ol>${ch.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
    <p class="fine">Rôles : ${Object.values(A.ROLES).map(esc).join(' · ')}. Le rôle « Spectateur-votant » est fermé : ${esc(A.register(A.newTournament(), { who: 'x', role: 'spectator-voter' }).error)}.</p></div>
    <div class="card"><h2>Démonstration : vous êtes le juge n° 3</h2><p class="fine">Deux propositions et deux fiches de jury fictives sont fournies pour la démonstration. Vos fiches restent scellées : vous ne voyez pas celles des autres juges avant la clôture.</p>
    ${todo.length ? todo.map(e => `<form class="form card" data-judge="${esc(e)}"><b>${esc(e)}</b><p>${esc(t.submissions[e].text)}</p>${crit.map(([id, label]) => `<div class="inline"><label>${esc(label)} <select data-c="${id}">${[0, 1, 2, 3, 4].map(n => `<option>${n}</option>`).join('')}</select></label><input data-n="${id}" maxlength="200" aria-label="Justification : ${esc(label)}" placeholder="justification (10 caractères au moins)"></div>`).join('')}<button type="submit">Sceller ma fiche</button></form>`).join('')
      : t.phase === 'judging' ? '<button type="button" class="primary" id="ar-close">Clôturer et publier les résultats</button>' : ''}
    ${res?.ok ? `<h3>Résultats (fictifs)</h3><table class="tbl"><thead><tr><th>Rang</th><th>Proposition</th><th>Total médian</th><th>Preuves (médiane)</th></tr></thead><tbody>${res.value.ranking.map(r => `<tr><td>${r.rank}</td><td>${esc(r.entry)}</td><td>${r.total}</td><td>${r.evidence}</td></tr>`).join('')}</tbody></table>
      <p class="fine">Ce classement reconnaît des propositions dans un défi fictif. Il ne vaut ni validation scientifique (${res.value.scientificValidation}) ni autorisation d’agir (${res.value.authorizes}).</p>
      <details><summary>Toutes les fiches (${res.value.sheets.length})</summary><table class="tbl"><tbody>${res.value.sheets.map(s => `<tr><td>${esc(s.judge)} → ${esc(s.entry)}</td><td>${Object.values(s.scores).join(' · ')}</td><td>${esc(Object.values(s.notes)[0])}</td></tr>`).join('')}</tbody></table></details>
      <button type="button" class="ghost small" id="ar-reset">Recommencer la démonstration</button>` : ''}</div>`;
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
  B.innerHTML = `<div class="card"><h2>CORE Academy</h2><table class="tbl"><tbody>${C.PATHWAYS.map(p => `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.ages)}</td><td>${esc(p.status)}</td></tr>`).join('')}</tbody></table>
    <p class="warn">Mode démonstration enseignant uniquement : aucun mineur n’est invité ; les élèves A, B et C sont fictifs. Ni messagerie entre élèves, ni classement, ni profil public. L’enseignant garde l’autorité pédagogique.</p></div>
    <div class="card"><label>Leçon <select id="ac-lesson">${C.LESSONS.map(l => `<option value="${esc(l.id)}" ${l.id === Ls.id ? 'selected' : ''}>${esc(l.title)}</option>`).join('')}</select></label></div>
    <div class="card"><h2>${esc(Ls.title)}</h2><p class="fine">Parcours ${Ls.pathways.join(', ')} · ${Ls.minutes} min · source réelle : <a href="${esc(Ls.source.url)}" target="_blank" rel="noopener noreferrer">${esc(Ls.source.record)}</a></p>
    <ul>${Ls.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
    <label>Répondre en tant que <select id="ac-l">${C.PERSONAS.map(p => `<option value="${p.id}">${esc(p.label)}</option>`).join('')}</select></label>
    ${Ls.questions.map(q => `<form class="form" data-q="${q.id}"><b>${esc(q.text)}</b>${q.kind === 'choice' ? q.options.map((o, i) => `<label class="inline"><input type="radio" name="${q.id}" value="${i}"> ${esc(o)}</label>`).join('') : `<textarea maxlength="400" aria-label="${esc(q.text)}"></textarea>`}<button type="submit" class="small">Répondre</button></form>`).join('')}</div>
    <div class="card"><h2>Vue enseignant</h2><table class="tbl"><thead><tr><th>Question</th><th>Réponses</th><th>Justes</th><th>À relire</th></tr></thead><tbody>${sum.map(r => `<tr><td>${r.question}</td><td>${r.answered}</td><td>${r.correct ?? '—'}</td><td>${r.toReview}</td></tr>`).join('')}</tbody></table>
    ${Object.entries(s.answers).filter(([k]) => Ls.questions.find(q => q.id === k.split(':')[1])?.kind === 'open').map(([k, a]) => `<form class="form" data-fb="${esc(k)}"><span>${esc(k.split(':')[0])} : « ${esc(a.value)} »</span>${s.feedback[k] ? `<i>Retour : ${esc(s.feedback[k])}</i>` : `<input maxlength="400" placeholder="retour de l’enseignant"><button type="submit" class="small">Envoyer le retour</button>`}</form>`).join('')}
    <p class="fine">Les réponses ouvertes ne sont jamais notées automatiquement : seul l’enseignant y répond. Repère pour l’enseignant : ${esc(Ls.questions.find(q => q.kind === 'open').explain)}</p></div>`;
  $('ac-lesson').onchange = e => go('academy', { lesson: e.target.value });
  B.querySelectorAll('[data-q]').forEach(f => f.onsubmit = e => { e.preventDefault(); const q = Ls.questions.find(x => x.id === f.dataset.q);
    const v = q.kind === 'choice' ? f.querySelector('input:checked')?.value : f.querySelector('textarea').value; if (v == null || v === '') return toast('Choisissez ou écrivez une réponse.');
    const r = C.answer(S.academy, { learner: $('ac-l').value, question: q.id, value: v }); if (!r.ok) return toast(r.error); S.academy = r.value;
    toast(q.kind === 'choice' ? `${r.value.answers[`${$('ac-l').value}:${q.id}`].correct ? 'Juste.' : 'Pas tout à fait.'} ${q.explain}` : 'Réponse transmise à l’enseignant (dans ce navigateur).'); render(); });
  B.querySelectorAll('[data-fb]').forEach(f => f.onsubmit = e => { e.preventDefault(); const [learner, question] = f.dataset.fb.split(':');
    const r = C.feedback(S.academy, { actor: 'enseignant-demo', learner, question, text: f.querySelector('input').value }); if (!r.ok) return toast(r.error); S.academy = r.value; render(); });
}

// ---------- Progress ----------
async function renderProgress(B) {
  if (!S.data) { B.innerHTML = '<p class="fine">Chargement des registres…</p>'; try { S.data = Object.fromEntries(await Promise.all([['problems', 'data/problems/registry.json'], ['civIndex', 'data/civ/index.json'], ['agents', 'data/agents/registry.json'], ['energy', 'data/sf/energy-benchmarks.geojson'], ['sidewalks', 'data/sf/sidewalks.geojson']].map(async ([k, u]) => [k, await (await fetch(u)).json()]))); } catch (e) { B.innerHTML = `<p class="warn">Registres indisponibles (${esc(e.message)}). Aucun indicateur n’est affiché sans ses données.</p>`; return; } }
  const v = G.virtualProgress(S.data), e = G.earthIndicators(S.data);
  B.innerHTML = `<div class="card"><h2>Progrès virtuel de CORE — activité, pas impact</h2><div class="kpi-row">${v.map(x => `<div class="kpi"><b>${esc(x.value)}</b>${esc(x.label)}<br><span class="fine">${esc(x.basis)}</span></div>`).join('')}</div></div>
    <div class="card"><h2>Progrès réel de la Terre — indicateurs sourcés</h2>${e.map(i => `<div class="card"><h3>${esc(i.domain)} · ${esc(i.label)}</h3><p><b>${esc(i.value)}</b> ${esc(i.unit)} (n = ${i.n})</p>
      <dl class="kv"><dt>Source</dt><dd><a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">${esc(i.source)}</a></dd><dt>Période</dt><dd>${esc(i.period)}</dd><dt>Méthode</dt><dd>${esc(i.method)}</dd><dt>Incertitude</dt><dd>${esc(i.uncertainty)}</dd><dt>Portée</dt><dd>${esc(i.scope)}</dd><dt>Tendance</dt><dd>${esc(i.trend)}</dd></dl></div>`).join('')}
      <p class="fine">Aucun score universel de civilisation n’est calculé : énergie, accessibilité, environnement, institutions et bien-être ne se résument pas en un nombre.</p></div>
    <div class="card"><h2>Échelle de Kardashev (outil éducatif)</h2><p class="fine">Interpolation de Sagan : K = (log₁₀ P − 6) / 10, P en watts. Type I ≈ 10¹⁶ W, II ≈ 10²⁶ W, III ≈ 10³⁶ W. Elle mesure la puissance utilisée, pas le bien-être, l’équité, la connaissance ni la durabilité ; plus d’énergie n’est pas « mieux » en soi.</p>
      <form class="form inline" id="kd"><label>Puissance (W) <input id="kd-p" inputmode="decimal" placeholder="ex. 1e13 (entrez une valeur et sa source)"></label><button type="submit">Calculer</button></form><p id="kd-out" aria-live="polite"></p></div>`;
  $('kd').onsubmit = ev => { ev.preventDefault(); try { const r = G.kardashev(Number($('kd-p').value)); $('kd-out').textContent = `K = ${r.K.toFixed(3)} — ${r.note}.`; } catch (err) { $('kd-out').textContent = err.message; } };
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
  $('cm-eyebrow').textContent = g?.label || 'CORE'; document.querySelector('#cm-main h1').textContent = sec?.[1] || 'La couche humaine de CORE';
  document.title = `CORE — ${sec?.[1] || 'Commons'}`;
  const bar = document.querySelector('.cm-tabs');
  bar.innerHTML = NAV.subnav(g?.id, S.tab);
  bar.querySelectorAll('a[href^="commons.html#"]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.getAttribute('href').split('#')[1]); $('cm-body').focus(); });
  RENDER[S.tab]($('cm-body'));
}
addEventListener('hashchange', () => { route(); render(); });
route();
render();
globalThis.CORE_COMMONS = { state: S, render, go };
