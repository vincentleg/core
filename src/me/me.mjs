// Mon CORE (V7) — the person's own space: avatar, private ideas, journey, followed problems, collaboration, learning,
// review history and privacy. Everything is read from this browser; nothing is ranked, scored or published.
// Real-world impact is shown only when independently established — today, never.
import * as NAV from '../shell/nav.mjs';
import * as J from '../shell/journey.mjs';
import * as VS from '../civic/vault-session.mjs';
import * as AC from '../earth/avatar-config.mjs';
import { icon } from '../ui/icons.mjs';
import { humanPlace, STATUS_FR } from "../earth/problem-view.mjs";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const getJ = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const day = iso => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const toast = m => { $('toast').textContent = m; clearTimeout(toast.t); toast.t = setTimeout(() => { $('toast').textContent = ''; }, 4000); };
NAV.render($('core-nav'), { active: 'me' }); $('me-sub').innerHTML = NAV.subnav('me', 'me');

const av = AC.load(), commons = getJ('core.commons.v1'), j = J.read(), net = getJ('core.network.v1') || {}, kb = getJ('core.kbcontrib.v1') || {};
let problems = [];

function hero() {
  const name = av.identity.pseudonym || commons?.profile?.pseudonym || '';
  $('me-name').textContent = name || 'Votre espace';
  $('me-meta').textContent = `${name ? 'Pseudonyme local' : 'Aucun pseudonyme encore'} · humain · ${commons?.profile ? `identité ${commons.profile.id.slice(0, 14)}…` : 'pas d’identité locale'} · aucun compte, aucun profil public`;
  const steps = J.summary(j).filter(s => s.at).length;
  $('me-facts').innerHTML = `<div><b>${steps}/8</b><span>étapes du parcours</span></div><div><b>${VS.exists() ? icon('lock', 24) : '—'}</b><span>${VS.exists() ? 'coffre chiffré présent' : 'pas encore de coffre'}</span></div><div><b>0</b><span>impact réel établi</span></div>`;
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
  } catch (e) { $('me-canvas').replaceWith(Object.assign(document.createElement('p'), { className: 'fine', textContent: `Aperçu 3D indisponible (${e.message}).` })); }
}

function ideasCard() {
  if (!VS.exists()) return `<p class="fine">Pas encore d’idée. Elles naissent dans le dialogue, sont enregistrées <b>chiffrées</b> dans ce navigateur, et ne sont jamais publiées sans votre décision explicite.</p><a class="btn primary" href="dialogue.html#mode=propose">${icon('bulb', 16)} Proposer une idée</a>`;
  if (!VS.unlocked()) return `<form class="form" id="me-unlock"><label>Phrase secrète du coffre <input id="me-pass" type="password" minlength="12" autocomplete="current-password" required></label><button type="submit">${icon('unlock', 15)} Ouvrir pour voir mes idées</button><p class="fine">Le coffre se reverrouille seul. CORE ne peut pas lire vos idées sans cette phrase.</p></form>`;
  const ideas = VS.vault().ideas;
  return ideas.length ? `<ul class="me-list">${ideas.map(i => { const v = i.versions.at(-1); return `<li><span><b>${esc(v?.title || 'Idée')}</b><br><span class="fine">${i.versions.length} version(s) · ${esc(day(v?.at))} · privée${i.permissions?.publication ? ' · publiée' : ''}</span></span><span class="le-row"><a class="btn small" href="dialogue.html#idea=${encodeURIComponent(i.id)}">Reprendre</a><a class="btn small" href="commons.html#labs?idea=${encodeURIComponent(i.id)}">Labs</a></span></li>`; }).join('')}</ul>` : '<p class="fine">Votre coffre est vide.</p>';
}

// Followed mission and contributions shared WITH CONSENT, read from this browser (core.follow.v1, core.civ.v72).
function missionsCard() {
  const f = getJ('core.follow.v1'), civ = getJ('core.civ.v72'), ms = f?.mission && civ?.missions?.[f.mission];
  if (!f?.mission) return `<p class="fine">Aucune mission suivie. Dans CORE World, couche « Agents », ouvrez une mission et choisissez « Suivre ».</p><a class="btn" href="world.html#layer=agents&mission=mission.sf.housing-resilience">${icon('explore', 16)} Voir la mission phare</a>`;
  const ins = ms?.humanInputs || [];
  return `<ul class="me-list"><li><span><b>${esc(f.title || f.mission)}</b><br><span class="fine">${ms ? esc({ open: 'en cours', 'awaiting-human': 'dossier prêt, en attente d’une revue humaine', monitoring: 'surveillance', gap: 'lacune', cancelled: 'annulée' }[ms.status] || ms.status) : 'état non disponible dans ce navigateur'}</span></span><span class="le-row"><a class="btn small" href="world.html#mission=${encodeURIComponent(f.mission)}">World</a><a class="btn small" href="dialogue.html#mission=${encodeURIComponent(f.mission)}">Séance</a></span></li>
    ${ins.map(h => `<li><span>« ${esc(h.title)} »<br><span class="fine">${esc({ hypothesis: 'hypothèse', evidence: 'preuve', question: 'question', challenge: 'contestation' }[h.kind] || h.kind)} · ${esc(h.state)} · partagée avec votre consentement · aucune validation automatique</span></span></li>`).join('')}</ul>
    ${ins.length ? '' : '<p class="fine">Aucune contribution partagée avec cette mission.</p>'}<p class="fine">Réutilisation par d’autres : aucune (rien n’est publié). Impact réel : aucun établi.</p>`;
}
function render() {
  const done = J.summary(j), followed = j.problemId ? problems.find(p => p.id === j.problemId) : null, drafts = (net.drafts || []).length, reports = (net.reports || []).length, kbN = (kb.items || kb.contributions || []).length;
  $('me-body').innerHTML = `
  <section class="me-card wide"><h2>${icon('route', 18)} Mon parcours</h2>
    <div class="me-steps">${done.map(s => `<div class="${s.at ? 'done' : ''}"><b>${esc(s.label)}</b>${s.at ? esc(day(s.at)) : 'pas encore'}</div>`).join('')}</div>
    <p class="fine">Le parcours ne garde que des identifiants et des dates, jamais le texte de vos idées.</p></section>
  <section class="me-card"><h2>${icon('lock', 18)} Mes idées privées</h2>${ideasCard()}</section>
  <section class="me-card"><h2>${icon('map', 18)} Problèmes suivis</h2>${followed ? `<ul class="me-list"><li><span><span class="le-badge" data-s="${esc(followed.status)}">${esc(STATUS_FR[followed.status] || followed.status)}</span><br><b>${esc(followed.title)}</b><br><span class="fine">${esc(humanPlace(followed.place))}</span></span><a class="btn small" href="world.html#problem=${encodeURIComponent(followed.id)}">Voir</a></li></ul>` : `<p class="fine">Aucun problème suivi. Ouvrez un problème dans CORE World pour le retrouver ici.</p><a class="btn" href="world.html">${icon('explore', 16)} Explorer</a>`}</section>
  <section class="me-card"><h2>${icon('history', 18)} Ce qu’il est advenu de mes contributions</h2>
    <ol class="le-timeline">${j.ideaId ? `<li><b>Idée enregistrée</b> (${j.idea?.versions || 1} version(s)) — <span class="fine">privée, chiffrée, non publiée</span></li>` : ''}${j.steps.labs ? `<li><b>Analysée par CORE Labs</b> — <span class="fine">${j.idea?.missingEvidence != null ? `${j.idea.missingEvidence} preuve(s) manquante(s) signalée(s)` : 'analyse locale'} ; aucune validation</span></li>` : ''}${j.steps.review ? '<li><b>Demande de revue préparée</b> — <span class="fine">relecteurs fictifs : aucune revue humaine réelle</span></li>' : ''}
      <li><b>Revue humaine</b> — <span class="fine">aucune : aucun relecteur humain vérifié n’existe encore dans CORE</span></li><li><b>Réutilisation par d’autres</b> — <span class="fine">aucune : rien n’est publié dans ce prototype</span></li></ol></section>
  <section class="me-card"><h2>${icon('flask', 18)} Missions suivies et contributions</h2>${missionsCard()}</section>
  <section class="me-card"><h2>${icon('collaborate', 18)} Collaboration</h2>
    <ul class="me-list"><li><span>Brouillons de communauté (locaux)</span><b>${drafts}</b></li><li><span>Signalements envoyés à la modération simulée</span><b>${reports}</b></li><li><span>Contributions de connaissances en quarantaine</span><b>${kbN}</b></li></ul>
    <p class="fine">Experts, membres et modérateurs sont fictifs dans ce prototype.</p></section>
  <section class="me-card third"><h2>${icon('graduation', 18)} Apprentissage</h2><p class="fine">Trois leçons de l’Académie (démonstration enseignant, élèves fictifs).</p><a class="btn" href="commons.html#academy">Ouvrir l’Académie</a></section>
  <section class="me-card third"><h2>${icon('chart', 18)} Impact réel</h2><p><b>Aucun impact réel établi.</b></p><p class="fine">CORE n’affiche un effet dans le monde que s’il est mesuré et établi indépendamment, avec méthode, date et incertitude.</p></section>
  <section class="me-card third"><h2>${icon('trust', 18)} Confidentialité</h2><p class="fine">Tout est dans ce navigateur. Voyez chaque donnée stockée, verrouillez le coffre, ou effacez tout.</p><a class="btn" href="commons.html#trust">Mes données et TRUST</a></section>`;
  $('me-unlock')?.addEventListener('submit', async e => { e.preventDefault(); try { await VS.unlock($('me-pass').value, commons?.profile?.id); render(); } catch (err) { toast(err.message); } });
}
hero(); render(); portrait();
fetch('data/problems/registry.json').then(r => r.json()).then(r => { problems = r.problems; render(); }).catch(() => {});
VS.onChange(() => render());
globalThis.CORE_ME = { render, portrait: false };
