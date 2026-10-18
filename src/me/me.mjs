// My CORE — the person's own space: avatar, private ideas, contributions (private and shared), journey, followed
// problems, collaboration, learning, review history and privacy. Everything is read from this browser; nothing is
// ranked, scored or published. Real-world impact is shown only when independently established — today, never.
import { STREET_LEVEL } from '../features.mjs';
import * as NAV from '../shell/nav.mjs';
import * as J from '../shell/journey.mjs';
import * as VS from '../civic/vault-session.mjs';
import * as AC from '../earth/avatar-config.mjs';
import { icon } from '../ui/icons.mjs';
import * as CONTRIB from '../contrib/contributions.mjs';
import * as STORE from '../contrib/store.mjs';
import { humanPlace, statusLabel, ptext } from '../earth/problem-view.mjs';
import { hstate } from '../earth/civ-panels.mjs';
import { T, L, date, onLang } from '../i18n/i18n.mjs';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const getJ = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const day = iso => (iso ? date(iso) : '');
const toast = m => { $('toast').textContent = m; clearTimeout(toast.t); toast.t = setTimeout(() => { $('toast').textContent = ''; }, 4000); };
NAV.render($('core-nav'), { active: 'me' });

const av = AC.load(), commons = getJ('core.commons.v1'), net = getJ('core.network.v1') || {}, kb = getJ('core.kbcontrib.v1') || {};
let problems = [];

function hero() {
  const name = av.identity.pseudonym || commons?.profile?.pseudonym || '';
  $('me-sub').innerHTML = NAV.subnav('me', 'me');
  $('me-name').textContent = name || T('Your space', 'Votre espace');
  $('me-meta').textContent = T(`${name ? 'Local pseudonym' : 'No pseudonym yet'} · human · ${commons?.profile ? `identity ${commons.profile.id.slice(0, 14)}…` : 'no local identity'} · no account, no public profile`, `${name ? 'Pseudonyme local' : 'Aucun pseudonyme encore'} · humain · ${commons?.profile ? `identité ${commons.profile.id.slice(0, 14)}…` : 'pas d’identité locale'} · aucun compte, aucun profil public`);
  const steps = J.summary(J.read()).filter(s => s.at).length;
  $('me-facts').innerHTML = `<div><b>${steps}/8</b><span>${T('journey steps', 'étapes du parcours')}</span></div><div><b>${VS.exists() ? icon('lock', 24) : '—'}</b><span>${VS.exists() ? T('encrypted vault present', 'coffre chiffré présent') : T('no vault yet', 'pas encore de coffre')}</span></div><div><b>0</b><span>${T('real-world impact established', 'impact réel établi')}</span></div>`;
}

async function portrait() {
  try {
    const THREE = await import('../../assets/vendor/three-0.186.1/core3d.min.mjs'), { buildAvatar } = await import('../earth/avatar3d.mjs');
    const c = $('me-canvas'), r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
    const sc = new THREE.Scene(); sc.environment = new THREE.PMREMGenerator(r).fromScene(new THREE.RoomEnvironment(), 0.04).texture; sc.environmentIntensity = 0.6;
    const key = new THREE.DirectionalLight('#fff3e2', 2.2); key.position.set(1.5, 2.5, 2.5); sc.add(key, new THREE.HemisphereLight('#bcd7ff', '#2a2420', 0.7));
    const rim = new THREE.DirectionalLight('#7fd8ff', 1.4); rim.position.set(-2, 2, -2); sc.add(rim);
    const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 20); cam.position.set(0.15, 1.42, 2.2); cam.lookAt(0, 1.32, 0);
    const a = await buildAvatar(av.appearance); a.root.rotation.y = -0.25; sc.add(a.root); a.play('Idle_Talking_Loop', 0);
    const size = () => { const b = c.getBoundingClientRect(); r.setSize(b.width, b.height, false); cam.aspect = b.width / b.height; cam.updateProjectionMatrix(); }; size(); addEventListener('resize', size);
    const clock = new THREE.Clock(), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    r.setAnimationLoop(() => { a.update(still ? 0 : clock.getDelta()); r.render(sc, cam); });
    globalThis.CORE_ME.portrait = true;
  } catch (e) { $('me-canvas').replaceWith(Object.assign(document.createElement('p'), { className: 'fine', textContent: T(`3D preview unavailable (${e.message}).`, `Aperçu 3D indisponible (${e.message}).`) })); }
}

function ideasCard() {
  if (!VS.exists()) return `<p class="fine">${T('No idea yet. Ideas are born in the dialogue, saved <b>encrypted</b> in this browser, and never published without your explicit decision.', 'Pas encore d’idée. Elles naissent dans le dialogue, sont enregistrées <b>chiffrées</b> dans ce navigateur, et ne sont jamais publiées sans votre décision explicite.')}</p><a class="btn primary" href="dialogue.html#mode=propose">${icon('bulb', 16)} ${T('Propose an idea', 'Proposer une idée')}</a>`;
  if (!VS.unlocked()) return `<form class="form" id="me-unlock"><label>${T('Vault passphrase', 'Phrase secrète du coffre')} <input id="me-pass" type="password" minlength="12" autocomplete="current-password" required></label><button type="submit">${icon('unlock', 15)} ${T('Open to see my ideas', 'Ouvrir pour voir mes idées')}</button><p class="fine">${T('The vault locks itself again. CORE cannot read your ideas without this passphrase.', 'Le coffre se reverrouille seul. CORE ne peut pas lire vos idées sans cette phrase.')}</p></form>`;
  const ideas = VS.vault().ideas;
  return ideas.length ? `<ul class="me-list">${ideas.map(i => { const v = i.versions.at(-1); return `<li><span><b>${esc(v?.title || T('Idea', 'Idée'))}</b><br><span class="fine">${i.versions.length} ${T('version(s)', 'version(s)')} · ${esc(day(v?.at))} · ${T('private', 'privée')}${i.permissions?.publication ? ` · ${T('published', 'publiée')}` : ''}</span></span><span class="le-row"><a class="btn small" href="dialogue.html#idea=${encodeURIComponent(i.id)}">${T('Resume', 'Reprendre')}</a><a class="btn small" href="commons.html#labs?idea=${encodeURIComponent(i.id)}">Labs</a></span></li>`; }).join('')}</ul>` : `<p class="fine">${T('Your vault is empty.', 'Votre coffre est vide.')}</p>`;
}

const MST = { open: ['in progress', 'en cours'], 'awaiting-human': ['dossier ready, awaiting human review', 'dossier prêt, en attente d’une revue humaine'], monitoring: ['monitoring', 'surveillance'], gap: ['gap', 'lacune'], cancelled: ['cancelled', 'annulée'] };
function missionsCard() {
  const f = getJ('core.follow.v1'), civ = getJ('core.civ.v72'), ms = f?.mission && civ?.missions?.[f.mission];
  if (!f?.mission) return `<p class="fine">${T('No mission followed. In CORE World, open a mission and choose “Follow”.', 'Aucune mission suivie. Dans CORE World, ouvrez une mission et choisissez « Suivre ».')}</p><a class="btn" href="world.html#problems">${icon('explore', 16)} ${T('See the missions', 'Voir les missions')}</a>`;
  return `<ul class="me-list"><li><span><b>${esc(L(f.title) || f.mission)}</b><br><span class="fine">${ms ? esc(T(...(MST[ms.status] || [ms.status, ms.status]))) : T('state not available in this browser', 'état non disponible dans ce navigateur')}</span></span><span class="le-row"><a class="btn small" href="world.html#mission=${encodeURIComponent(f.mission)}">World</a><a class="btn small" href="dialogue.html#mission=${encodeURIComponent(f.mission)}">${T('Session', 'Séance')}</a></span></li></ul>
    <p class="fine">${T('Reuse by others: none (nothing is published). Real-world impact: none established.', 'Réutilisation par d’autres : aucune (rien n’est publié). Impact réel : aucun établi.')}</p>`;
}
// Every contribution: private ones (this browser only) and those shared with a mission, with stage and evaluation.
function contribCard() {
  const civ = getJ('core.civ.v72'), shared = Object.entries(civ?.missions || {}).flatMap(([mid, ms]) => (ms.humanInputs || []).map(h => ({ ...h, mid })));
  const priv = STORE.list().filter(e => e.state === 'private');
  const ORDER = ['shared', 'review', 'evaluated', 'human'], LBL = Object.fromEntries(CONTRIB.STAGES);
  if (!shared.length && !priv.length) return `<p class="fine">${T('No contribution yet. In CORE World, “Contribute” helps you describe what you noticed; you then choose to keep it private or share it with a mission.', 'Aucune contribution. Dans CORE World, « Contribuer » vous aide à décrire ce que vous avez remarqué ; vous choisissez ensuite de le garder privé ou de le partager avec une mission.')}</p><a class="btn" href="world.html#contribute">${icon('explore', 16)} ${T('Contribute', 'Contribuer')}</a>`;
  return `${priv.length ? `<h3>${T('Private (this browser only, not shared)', 'Privées (ce navigateur seulement, non partagées)')}</h3><ul class="me-list">${priv.map(e => `<li><span><b>“${esc(e.title)}”</b><br><span class="fine">${esc(L(CONTRIB.KINDS[e.kind]) || e.kind)} · ${esc(day(e.at))} · ${e.structuredBy === 'local-model' ? T('structured by the local model', 'structurée par le modèle local') : T('structured by rules', 'structurée par des règles')}</span></span><span class="le-row"><a class="btn small" href="world.html#contribute=${encodeURIComponent(e.mission || '')}">${T('Open', 'Ouvrir')}</a><button type="button" class="btn small ghost" data-del="${esc(e.id)}">${T('Delete', 'Supprimer')}</button></span></li>`).join('')}</ul>` : ''}
    ${shared.length ? `<h3>${T('Shared with a mission (with your consent)', 'Partagées avec une mission (avec votre consentement)')}</h3><ul class="me-list">${shared.map(h => { const st = CONTRIB.stageOf(h), k = ORDER.indexOf(st), e = h.evaluation;
      return `<li><span><b>“${esc(h.title)}”</b><br><span class="fine">${esc(L(CONTRIB.KINDS[h.kind]) || h.kind)} · ${T('mission', 'mission')} <a href="world.html#mission=${encodeURIComponent(h.mid)}">${esc(h.mid.replace('mission.sf.', ''))}</a> · ${esc(hstate(h.state))}</span>
        <ol class="me-stages">${ORDER.map((s, i) => `<li class="${i < k ? 'done' : i === k ? 'now' : ''}">${esc(L(LBL[s]))}</li>`).join('')}</ol>
        ${e ? `<span class="fine"><b>${esc(L(e.label))}</b>${e.related.length ? ` · ${T('related findings', 'constats liés')}: ${e.related.map(esc).join(', ')}` : ''}${e.checks.length ? ` · ${e.checks.map(c => esc(L(c.detail))).join('; ')}` : ''}<br>${esc(L(e.method))}.</span>` : ''}</span></li>`; }).join('')}</ul>` : ''}
    <p class="fine">${T('Everything here lives in this browser. Shared contributions are in the mission’s log in this browser only: CORE has no shared server, nothing is published, no verified human reviewer exists yet, and no real-world impact is established.', 'Tout ceci vit dans ce navigateur. Les contributions partagées sont dans le journal de la mission, dans ce navigateur seulement : CORE n’a pas de serveur partagé, rien n’est publié, aucun relecteur humain vérifié n’existe encore et aucun impact réel n’est établi.')}</p>`;
}
function render() {
  hero();
  const j = J.read(), done = J.summary(j), followed = j.problemId ? problems.find(p => p.id === j.problemId) : null, drafts = (net.drafts || []).length, reports = (net.reports || []).length, kbN = (kb.items || kb.contributions || []).length;
  $('me-body').innerHTML = `
  <section class="me-card wide" id="contributions"><h2>${icon('target', 18)} ${T('My contributions', 'Mes contributions')}</h2>${contribCard()}</section>
  <section class="me-card wide"><h2>${icon('route', 18)} ${T('My journey', 'Mon parcours')}</h2>
    <div class="me-steps">${done.map(s => `<div class="${s.at ? 'done' : ''}"><b>${esc(s.label)}</b>${s.at ? esc(day(s.at)) : T('not yet', 'pas encore')}</div>`).join('')}</div>
    <p class="fine">${T('The journey keeps only identifiers and dates, never the text of your ideas.', 'Le parcours ne garde que des identifiants et des dates, jamais le texte de vos idées.')}</p></section>
  <section class="me-card"><h2>${icon('lock', 18)} ${T('My private ideas (encrypted vault)', 'Mes idées privées (coffre chiffré)')}</h2>${ideasCard()}</section>
  <section class="me-card"><h2>${icon('map', 18)} ${T('Followed problems', 'Problèmes suivis')}</h2>${followed ? `<ul class="me-list"><li><span><span class="le-badge" data-s="${esc(followed.status)}">${esc(statusLabel(followed.status))}</span><br><b>${esc(ptext(followed.title))}</b><br><span class="fine">${esc(humanPlace(followed.place))}</span></span><a class="btn small" href="world.html#problem=${encodeURIComponent(followed.id)}">${T('View', 'Voir')}</a></li></ul>` : `<p class="fine">${T('No problem followed. Open a problem in CORE World to find it here.', 'Aucun problème suivi. Ouvrez un problème dans CORE World pour le retrouver ici.')}</p><a class="btn" href="world.html">${icon('explore', 16)} ${T('Explore', 'Explorer')}</a>`}</section>
  <section class="me-card"><h2>${icon('flask', 18)} ${T('Followed mission', 'Mission suivie')}</h2>${missionsCard()}</section>
  <section class="me-card"><h2>${icon('history', 18)} ${T('What happened to my ideas', 'Ce qu’il est advenu de mes idées')}</h2>
    <ol class="le-timeline">${j.ideaId ? `<li><b>${T('Idea saved', 'Idée enregistrée')}</b> (${j.idea?.versions || 1} ${T('version(s)', 'version(s)')}): <span class="fine">${T('private, encrypted, not published', 'privée, chiffrée, non publiée')}</span></li>` : ''}${j.steps.labs ? `<li><b>${T('Analysed by CORE Labs', 'Analysée par CORE Labs')}</b>: <span class="fine">${j.idea?.missingEvidence != null ? T(`${j.idea.missingEvidence} missing piece(s) of evidence flagged`, `${j.idea.missingEvidence} preuve(s) manquante(s) signalée(s)`) : T('local analysis', 'analyse locale')}; ${T('no validation', 'aucune validation')}</span></li>` : ''}${j.steps.review ? `<li><b>${T('Review request prepared', 'Demande de revue préparée')}</b>: <span class="fine">${T('fictional reviewers: no real human review', 'relecteurs fictifs : aucune revue humaine réelle')}</span></li>` : ''}
      <li><b>${T('Human review', 'Revue humaine')}</b>: <span class="fine">${T('none: no verified human reviewer exists in CORE yet', 'aucune : aucun relecteur humain vérifié n’existe encore dans CORE')}</span></li><li><b>${T('Reuse by others', 'Réutilisation par d’autres')}</b>: <span class="fine">${T('none: nothing is published in this prototype', 'aucune : rien n’est publié dans ce prototype')}</span></li></ol></section>
  <section class="me-card"><h2>${icon('collaborate', 18)} ${T('Collaboration', 'Collaboration')}</h2>
    <ul class="me-list"><li><span>${T('Community drafts (local)', 'Brouillons de communauté (locaux)')}</span><b>${drafts}</b></li><li><span>${T('Reports sent to simulated moderation', 'Signalements envoyés à la modération simulée')}</span><b>${reports}</b></li><li><span>${T('Knowledge contributions in quarantine', 'Contributions de connaissances en quarantaine')}</span><b>${kbN}</b></li></ul>
    <p class="fine">${T('Experts, members and moderators are fictional in this prototype.', 'Experts, membres et modérateurs sont fictifs dans ce prototype.')}</p></section>
  <section class="me-card third"><h2>${icon('graduation', 18)} ${T('Learning', 'Apprentissage')}</h2><p class="fine">${T('Three Academy lessons (teacher demonstration, fictional pupils).', 'Trois leçons de l’Académie (démonstration enseignant, élèves fictifs).')}</p><a class="btn" href="commons.html#academy">${T('Open the Academy', 'Ouvrir l’Académie')}</a></section>
  <section class="me-card third"><h2>${icon('chart', 18)} ${T('Real-world impact', 'Impact réel')}</h2><p><b>${T('No real-world impact established.', 'Aucun impact réel établi.')}</b></p><p class="fine">${T('CORE shows an effect in the world only if it is measured and independently established, with method, date and uncertainty.', 'CORE n’affiche un effet dans le monde que s’il est mesuré et établi indépendamment, avec méthode, date et incertitude.')}</p><a class="btn small" href="progress.html">${T('Progress', 'Progrès')}</a></section>
  <section class="me-card third"><h2>${icon('trust', 18)} ${T('Privacy', 'Confidentialité')}</h2><p class="fine">${T('Everything is in this browser. See each stored item, lock the vault, or erase everything.', 'Tout est dans ce navigateur. Voyez chaque donnée stockée, verrouillez le coffre, ou effacez tout.')}</p><a class="btn" href="commons.html#trust">${T('My data & TRUST', 'Mes données et TRUST')}</a></section>`;
  $('me-unlock')?.addEventListener('submit', async e => { e.preventDefault(); try { await VS.unlock($('me-pass').value, commons?.profile?.id); render(); } catch (err) { toast(err.message); } });
  $('me-body').querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (!confirm(T('Delete this private contribution from this browser?', 'Supprimer cette contribution privée de ce navigateur ?'))) return; STORE.remove(b.dataset.del); render(); });
  if (location.hash === '#contributions') $('contributions')?.scrollIntoView({ block: 'start' });
}
// Earth-first (src/features.mjs): identity is the pseudonym, not a 3D avatar; the portrait and the studio link are dormant.
if (!STREET_LEVEL) { document.querySelector('.me-portrait')?.remove(); document.querySelector('.me-hero a[href="avatar.html"]')?.remove(); }
render(); if (STREET_LEVEL) portrait();
fetch('data/problems/registry.json').then(r => r.json()).then(r => { problems = r.problems; render(); }).catch(() => {});
VS.onChange(() => render()); onLang(() => render());
globalThis.CORE_ME = { render, portrait: false };
