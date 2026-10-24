// My CORE — the person's own space: avatar, private ideas, contributions (private and shared), journey, followed
// problems, collaboration, learning, review history and privacy. Everything is read from this browser; nothing is
// ranked, scored or published. Real-world impact is shown only when independently established — today, never.
import { mountFounderAccount } from './founder.mjs';
import { mountLocalFounder } from './local-founder.mjs';
import { STREET_LEVEL } from '../features.mjs';
import * as NAV from '../shell/nav.mjs';
import * as J from '../shell/journey.mjs';
import * as VS from '../civic/vault-session.mjs';
import * as AC from '../earth/avatar-config.mjs';
import { icon } from '../ui/icons.mjs';
import * as CONTRIB from '../contrib/contributions.mjs';
import * as STORE from '../contrib/store.mjs';
import * as LC from '../contrib/lifecycle.mjs';
import * as AR from '../earth/agent-records.mjs';
import * as MV from '../earth/mission-intel-view.mjs';
import * as SV from '../execution/saved.mjs';
import { humanPlace, statusLabel, ptext } from '../earth/problem-view.mjs';
import { hstate } from '../earth/civ-panels.mjs';
import { T, L, date, onLang, lang } from '../i18n/i18n.mjs';

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
// R1 lifecycle: each private contribution gets a hash-chained history (src/contrib/lifecycle.mjs). Browser actions are
// demonstration steps by a random local owner id; no verifier exists here, so every review, authorization and external
// state stays out of reach and is listed as a pending decision.
const LIFE = LC.createLifecycle(), life = new Map();
// R2: the published recorded investigation, to show an honest same-mission link (never "analysed by agents").
let records = null, recordsFailed = false, recWork = null;
fetch(AR.FILES.work).then(r => { if (!r.ok) throw Error(`HTTP ${r.status}`); return r.json(); }).then(work => { recWork = work; records = AR.buildIndex({ work }); render(); }).catch(() => { recordsFailed = true; render(); });
async function syncLife() {
  const owner = STORE.localOwner(); life.clear(); if (!owner) return;
  const recs = STORE.lifecycles();
  for (const e of STORE.list().filter(x => x.state === 'private')) {
    let r = recs[e.id];
    try {
      if (!r) { r = await LIFE.create({ id: e.id, owner, mission: e.mission, demonstration: e.demonstration, reason: e.investigation ? `Draft prepared from the saved agent investigation ${e.investigation.execution} in this browser on ${e.at}` : e.city ? `Draft prepared from the saved city summary ${e.city.id} in this browser on ${e.at}` : `Draft recorded from the private contribution saved in this browser on ${e.at}`, evidence: [{ kind: 'user-claim', ref: e.id, source: 'this browser' }, ...SV.lifecycleEvidence(e.investigation), ...SV.cityLifecycleEvidence(e.city)] }); if (!STORE.saveLifecycle(r)) continue; }
      life.set(e.id, { record: r, check: await LIFE.verify(r), owned: r.owner === owner });
    } catch { /* storage unavailable: the card falls back to the plain contribution line */ }
  }
}
const MODE = { demonstration: ['local demonstration step, not an authenticated action', 'étape de démonstration locale, pas une action authentifiée'], system: ['deterministic code check', 'contrôle déterministe par le code'], authenticated: ['authenticated human', 'humain authentifié'] };
function lifeHTML(e) {
  const L1 = life.get(e.id); if (!L1) return '';
  const { record: r, check } = L1, side = !LC.MAIN_PATH.includes(r.state), reached = new Set(r.events.map(x => x.to)), req = LC.requirementsFor(r.mission), gaps = LC.missing(r);
  const who = p => p.roles.map(x => L(LC.ROLES[x])).join(' / ');
  const pend = LC.pending(r).map(p => `<li><b>${esc(L(LC.LABELS[p.to]))}</b>: <span class="fine">${p.roles.includes('owner') ? T('you can do this here', 'vous pouvez le faire ici') : p.roles.includes('system') ? T('automatic code check', 'contrôle automatique par le code') : `${esc(who(p))} · ${T('requires an authenticated human; none exists in CORE yet', 'exige un humain authentifié ; aucun n’existe encore dans CORE')}`}${p.external ? ` · ${T('also a verified external record; external integration is disabled', 'aussi un enregistrement externe vérifié ; l’intégration externe est désactivée')}` : ''}${p.consequential ? ` · ${T('consequential: human authorization required', 'conséquent : autorisation humaine requise')}` : ''}</span></li>`).join('');
  const can = to => check.ok && L1.owned && LC.RULES[to]?.from.includes(r.state) && !LC.TERMINAL.includes(r.state);
  return `<div class="lc" data-life="${esc(e.id)}"><p class="lc-head"><span class="le-badge">${esc(L(LC.LABELS[r.state]))}</span>${r.demonstration ? ` <span class="le-badge lc-demo">${T('Demonstration', 'Démonstration')}</span>` : ''} <span class="fine">${check.ok ? T(`History verified: ${r.events.length} event(s), hash chain intact`, `Historique vérifié : ${r.events.length} événement(s), chaîne d’empreintes intacte`) : `${T('History failed verification; actions locked', 'L’historique n’a pas passé la vérification ; actions bloquées')} (${esc(check.reason || '')})`}</span></p>
    <ol class="me-stages" aria-label="${T('Lifecycle', 'Cycle de vie')}">${LC.MAIN_PATH.map(s => `<li class="${s === r.state ? 'now' : reached.has(s) ? 'done' : ''}">${esc(L(LC.LABELS[s]))}</li>`).join('')}${side ? `<li class="now">${esc(L(LC.LABELS[r.state]))}</li>` : ''}</ol>
    <details open><summary>${T('Timeline', 'Chronologie')}</summary><ol class="lc-events">${r.events.map(x => `<li><b>${esc(L(LC.LABELS[x.to]))}</b> · <span class="fine">${esc(day(x.at))} · ${esc(L(LC.ROLES[x.actor.role]))} · ${esc(T(...MODE[x.actor.mode]))}</span><br><span class="fine">${T('Recorded reason', 'Motif enregistré')}: ${esc(x.reason)}${x.evidence.length ? ` · ${T('evidence', 'preuves')}: ${x.evidence.map(v => esc(`${v.kind} (${v.source || v.ref})`)).join(', ')}` : ` · ${T('no evidence attached', 'aucune preuve jointe')}`}</span></li>`).join('')}</ol></details>
    <div class="lc-grid"><div><h4>${T('Missing evidence', 'Preuves manquantes')}</h4>${gaps.length ? `<ul>${gaps.map(g => `<li>${esc(L(g.label))}</li>`).join('')}</ul>` : `<p class="fine">${T('None listed.', 'Aucune listée.')}</p>`}</div>
    <div><h4>${T('Limitations', 'Limites')}</h4><ul>${req.limitations.map(x => `<li>${esc(L(x))}</li>`).join('')}</ul></div>
    ${records ? AR.relatedHTML(records, r) : recordsFailed && r.mission === AR.MISSION_OF_WORK ? `<div class="lc-related"><h4>${T('Related recorded investigation', 'Enquête enregistrée liée')}</h4><p class="fine">${T(`Could not load ${AR.FILES.work}; reload to retry.`, `Impossible de charger ${AR.FILES.work} ; rechargez pour réessayer.`)}</p></div>` : ''}
    <div><h4>${T('Pending decisions', 'Décisions en attente')}</h4>${pend ? `<ul>${pend}</ul>` : `<p class="fine">${T('None: this contribution is closed.', 'Aucune : cette contribution est close.')}</p>`}</div></div>
    ${can('SUBMITTED') ? `<form class="lc-submit" data-life-submit="${esc(e.id)}"><label class="fine"><input type="checkbox" name="consent" required> ${T('I agree that a reviewer may read this text if one is ever verified. Demonstration: nothing is sent; the CORE evidence check runs in this browser.', 'J’accepte qu’un relecteur lise ce texte si l’un d’eux est un jour vérifié. Démonstration : rien n’est envoyé ; le contrôle des preuves CORE s’exécute dans ce navigateur.')}</label><button type="submit" class="btn small">${T('Submit for demonstration review', 'Soumettre pour une revue de démonstration')}</button></form>` : ''}
    ${invRefHTML(e.investigation)}${cityRefHTML(e.city)}${MV.linkHTML(e.relates?.mission === r.mission ? e.relates : null)}<div class="lc-prov"><h4>${T('Provenance', 'Provenance')}</h4><p class="fine">${T('Created', 'Créée')} ${esc(day(e.at))} ${T('in this browser', 'dans ce navigateur')} · ${Array.isArray(e.place) ? `${T('place', 'lieu')} ${esc(Number(e.place[1]).toFixed(4))}, ${esc(Number(e.place[0]).toFixed(4))}` : T('no map place recorded', 'aucun lieu cartographié')} · ${T('structured by', 'structurée par')} ${esc(e.structuredBy || T('the author', 'l’auteur'))} · ${T('stored only in this browser; never sent by CORE', 'stockée uniquement dans ce navigateur ; jamais envoyée par CORE')} · ${check.ok ? T('history verified', 'historique vérifié') : T('history failed verification', 'historique non vérifié')}</p>
      ${r.mission ? `<a class="btn small" href="world.html#mission=${encodeURIComponent(r.mission)}">${T('Open the mission’s evidence on the map', 'Ouvrir les preuves de la mission sur la carte')}</a>` : ''}
      ${check.ok && L1.owned && !r.demonstration ? `<button type="button" class="btn small" data-life-packet="${esc(e.id)}">${T('Download a review request', 'Télécharger une demande de revue')}</button><span class="fine"> ${T('For a human reviewer you choose. CORE sends nothing and the state does not change.', 'Pour un relecteur humain de votre choix. CORE n’envoie rien et l’état ne change pas.')}</span>` : r.demonstration ? `<p class="fine">${T('Saved during the guided tour as a demonstration draft, so no review request is offered. To prepare one, use Contribute on the map.', 'Enregistrée pendant la visite guidée comme brouillon de démonstration : aucune demande de revue n’est proposée. Pour en préparer une, utilisez Contribuer sur la carte.')} <a href="world.html#contribute">${T('Contribute on the map', 'Contribuer sur la carte')}</a></p>` : ''}</div>
    ${can('ARCHIVED') ? `<button type="button" class="btn small ghost" data-life-archive="${esc(e.id)}">${T('Archive', 'Archiver')}</button>` : ''}
    <p class="fine">${T('Transmitted, externally implemented and impact measured require an authorized human, a verified external record and an enabled external integration. None exists, so these states cannot be reached.', 'Transmise, mise en œuvre externe et impact mesuré exigent un humain habilité, un enregistrement externe vérifié et une intégration externe activée. Rien de cela n’existe : ces états sont inatteignables.')}</p></div>`;
}
async function lifeAct(id, to, opts) {
  const L1 = life.get(id), owner = STORE.localOwner(); if (!L1 || !owner) return;
  try { const next = await LIFE.transition(L1.record, { id: owner, role: 'owner', mode: 'demonstration' }, to, opts); if (!STORE.saveLifecycle(next)) throw Error(T('Browser storage unavailable; nothing was changed.', 'Stockage local indisponible ; rien n’a été modifié.')); }
  catch (err) { toast(err.message); }
  await syncLife(); render();
}
// R29: agent investigations the person ran on the map and chose to save (src/execution/saved.mjs). Each is re-verified
// by digest on every load; one that fails cannot go to review. None is a validated finding or an approved decision.
const inv = new Map(), invDetail = new Map(); let invOpen = null;
async function syncInv() {
  inv.clear();
  for (const { savedAt, report } of SV.savedEntries(localStorage)) { let ok = true, reason = null; try { await SV.verifyReport(report); } catch (err) { ok = false; reason = err.message; } inv.set(report.execution, { savedAt, report, ok, reason }); }
}
const CLS = { deterministic: ['Deterministic tools only', 'Outils déterministes seulement'], 'local-model': ['Used a local AI model', 'A utilisé un modèle d’IA local'], recorded: ['Recorded replay', 'Relecture enregistrée'] };
const clsBadge = (c, model) => `<span class="le-badge inv-cls" data-class="${esc(c)}">${esc(T(...CLS[c]))}${model ? ` · ${esc(model)}` : ''}</span>`;
const linkedTo = id => STORE.list().find(c => c.investigation?.execution === id) || null;
const NOTVAL = () => T('Exploratory and uncalibrated: not scientifically validated, not approved, not a decision.', 'Exploratoire et non calibrée : ni validée scientifiquement, ni approuvée, ni une décision.');
function invRefHTML(ref) {
  const r = ref && SV.cleanRef(ref); if (!r) return '';
  return `<div class="mi-link inv-ref"><b>${T('From a saved agent investigation', 'Issue d’une enquête d’agents enregistrée')}</b> ${clsBadge(r.class, r.model)}<br><span class="fine"><code>${esc(r.execution.slice(0, 8))}</code> · ${esc(day(r.endedAt))} · ${r.findings.length} ${T('evidence references', 'références de preuves')} · ${T('report', 'rapport')} SHA-256 <code>${esc(r.digest.slice(0, 12))}…</code> · ${inv.get(r.execution)?.ok ? T('saved report verified', 'rapport enregistré vérifié') : T('saved report missing or not verified', 'rapport enregistré absent ou non vérifié')} · ${esc(NOTVAL())}</span></div>`;
}
function invCard() {
  const rec = recWork?.run ? `<li class="inv-rec"><span>${clsBadge('recorded')}<br><b>${esc(String(recWork.run.question || '').slice(0, 140))}…</b><br><span class="fine">${T('Published investigation', 'Enquête publiée')} <code>${esc(recWork.run.id.slice(0, 8))}</code> · ${T('recorded', 'enregistrée')} ${esc(day(recWork.recorded))} · ${T('not stored here, not re-run', 'non stockée ici, non réexécutée')}</span></span><a class="btn small" href="world.html#intel=mission.sf.mobility">${T('Open the replay', 'Ouvrir la relecture')}</a></li>` : '';
  const items = [...inv.values()].reverse();
  return `<p class="fine">${T('Investigations you ran on the map and chose to save. They are kept only in this browser until you delete them: no account, server or synchronisation. ', 'Enquêtes que vous avez exécutées sur la carte et choisi d’enregistrer. Elles restent dans ce navigateur jusqu’à leur suppression : ni compte, ni serveur, ni synchronisation. ')}${esc(NOTVAL())}</p>
  <ul class="me-list inv-list">${rec}${items.map(({ savedAt, report: r, ok, reason }) => { const cls = SV.executionClass(r), mine = r.findings.filter(f => f.origin === 'this-execution'), n = k => mine.filter(f => f.kind === k).length, c = linkedTo(r.execution);
    return `<li data-inv="${esc(r.execution)}"><span>${clsBadge(cls, SV.modelOf(r))} <span class="le-badge">${esc(r.status)}</span><br><b>${esc(r.objective.slice(0, 140))}</b><br>
      <span class="fine"><code>${esc(r.execution.slice(0, 8))}</code> · ${esc(r.mission)} · ${T('ran', 'exécutée')} ${esc(day(r.startedAt))} · ${T('saved', 'enregistrée')} ${esc(day(savedAt))} · ${n('computed-output')} ${T('computed outputs', 'résultats calculés')} · ${n('user-assumption')} ${T('assumptions', 'hypothèses de calcul')} · ${n('model-hypothesis')} ${T('model hypotheses', 'hypothèses du modèle')} · ${r.requirements.length} ${T('unresolved requirements', 'exigences non résolues')} · ${r.disagreements.filter(d => !d.recorded).length} ${T('disagreements', 'désaccords')}</span><br>
      <span class="fine">${ok ? `${T('Integrity verified', 'Intégrité vérifiée')} · SHA-256 <code>${esc(r.digest.slice(0, 12))}…</code>` : `<b class="cmp-err">${T('Integrity check failed', 'Échec du contrôle d’intégrité')}: ${esc(reason)}</b> ${T('It cannot be reviewed; export or delete it.', 'Elle ne peut pas aller en revue ; exportez-la ou supprimez-la.')}`}</span>
      <span class="le-row inv-actions"><button type="button" class="btn small" data-inv-open="${esc(r.execution)}" aria-expanded="${invOpen === r.execution}">${invOpen === r.execution ? T('Close', 'Fermer') : T('Inspect', 'Examiner')}</button>${ok ? `<a class="btn small" href="world.html#exec=${encodeURIComponent(r.execution)}">${T('Reopen on the map', 'Rouvrir sur la carte')}</a>` : ''}<button type="button" class="btn small" data-inv-export="${esc(r.execution)}">${T('Export', 'Exporter')}</button>${ok ? (c ? `<a class="btn small" href="#contributions" data-inv-goto="${esc(c.id)}">${T('Review request prepared: see it', 'Demande de revue préparée : la voir')}</a>` : `<button type="button" class="btn small primary" data-inv-review="${esc(r.execution)}">${T('Prepare a review request', 'Préparer une demande de revue')}</button>`) : ''}<button type="button" class="btn small ghost" data-inv-del="${esc(r.execution)}">${T('Delete', 'Supprimer')}</button></span>
      ${invOpen === r.execution ? `<div class="inv-detail" id="inv-detail">${invDetail.get(`${r.execution}|${lang()}`) || T('Loading…', 'Chargement…')}</div>` : ''}</span></li>`; }).join('')}</ul>
  ${cityListHTML()}
  ${items.length ? '' : `<p class="fine">${T('No saved investigation. On the map, open the San Francisco mobility mission, run a supervised execution and choose “Save in My CORE”.', 'Aucune enquête enregistrée. Sur la carte, ouvrez la mission de mobilité de San Francisco, lancez une exécution supervisée et choisissez « Enregistrer dans Mon CORE ».')}</p><a class="btn" href="world.html#intel=mission.sf.mobility">${T('Open the mission', 'Ouvrir la mission')}</a>`}`;
}
// R31: city summaries saved from the City Intelligence view. Re-verified on load; each links to the investigations it
// compared, which are checked again (present, same digest). Their review request uses the same contribution lifecycle.
const cities = new Map(), cityDetail = new Map(); let cityOpen = null;
async function syncCity() { cities.clear(); for (const sum of SV.listCitySummaries(localStorage)) { let ok = true, reason = null; try { await SV.verifyCitySummary(sum); } catch (err) { ok = false; reason = err.message; } cities.set(sum.id, { sum, ok, reason }); } }
const reportOk = r => !!r && inv.get(r.execution)?.ok === true && inv.get(r.execution).report.digest === r.digest;
const cityLinked = id => STORE.list().find(c => c.city?.id === id) || null;
function cityRefHTML(ref) {
  const r = ref && SV.cleanCityRef(ref); if (!r) return '';
  return `<div class="mi-link inv-ref"><b>${T('From a saved city summary', 'Issue d’une synthèse urbaine enregistrée')}</b> · ${esc(r.city)}<br><span class="fine"><code>${esc(r.id.slice(0, 8))}</code> · ${esc(day(r.createdAt))} · ${r.investigations.length} ${T('linked investigation(s)', 'enquête(s) liée(s)')} · SHA-256 <code>${esc(r.digest.slice(0, 12))}…</code> · ${cities.get(r.id)?.ok ? T('saved summary verified', 'synthèse enregistrée vérifiée') : T('saved summary missing or not verified', 'synthèse enregistrée absente ou non vérifiée')} · ${T('relationships between missions are hypotheses; not validated, not approved', 'les relations entre missions sont des hypothèses ; non validé, non approuvé')}</span></div>`;
}
function cityListHTML() {
  const list = [...cities.values()].reverse(); if (!list.length) return '';
  return `<h3 id="city-summaries">${T('City summaries', 'Synthèses urbaines')}</h3><ul class="me-list inv-list">${list.map(({ sum, ok, reason }) => { const c = cityLinked(sum.id);
    return `<li data-city-sum="${esc(sum.id)}"><span><span class="le-badge inv-cls" data-class="recorded">${T('Deterministic city comparison', 'Comparaison urbaine déterministe')}</span><br><b>${esc(T(sum.city.name.en, sum.city.name.fr))} · ${esc(day(sum.createdAt))}</b><br>
      <span class="fine"><code>${esc(sum.id.slice(0, 8))}</code> · ${sum.missions.length} ${T('missions', 'missions')} · ${T('shared geography', 'géographie commune')}: ${sum.overlaps.map(o => esc(o.neighborhood)).join(', ') || T('none', 'aucune')} · ${sum.opportunities.length} ${T('opportunities (hypotheses)', 'pistes (hypothèses)')} · ${sum.disagreements.length} ${T('disagreements', 'désaccords')}</span><br>
      <span class="fine">${sum.missions.map(m => m.report ? `${esc(m.id)}: <a href="#investigations" data-inv-goto-inv="${esc(m.report.execution)}"><code>${esc(m.report.execution.slice(0, 8))}</code></a> ${reportOk(m.report) ? T('(present, verified)', '(présente, vérifiée)') : T('(deleted or changed)', '(supprimée ou modifiée)')}` : `${esc(m.id)}: ${T('no saved run', 'aucune exécution enregistrée')}`).join(' · ')}</span><br>
      <span class="fine">${ok ? `${T('Integrity verified', 'Intégrité vérifiée')} · SHA-256 <code>${esc(sum.digest.slice(0, 12))}…</code>` : `<b class="cmp-err">${T('Integrity check failed', 'Échec du contrôle d’intégrité')}: ${esc(reason)}</b>`} · ${esc(NOTVAL())}</span>
      <span class="le-row inv-actions"><button type="button" class="btn small" data-city-open="${esc(sum.id)}" aria-expanded="${cityOpen === sum.id}">${cityOpen === sum.id ? T('Close', 'Fermer') : T('Inspect', 'Examiner')}</button><a class="btn small" href="world.html#city=san-francisco">${T('Open the current city view', 'Ouvrir la vue urbaine actuelle')}</a><button type="button" class="btn small" data-city-export="${esc(sum.id)}">${T('Export', 'Exporter')}</button>${ok ? (c ? `<a class="btn small" href="#contributions" data-inv-goto="${esc(c.id)}">${T('Review request prepared: see it', 'Demande de revue préparée : la voir')}</a>` : `<button type="button" class="btn small primary" data-city-review="${esc(sum.id)}">${T('Prepare a review request', 'Préparer une demande de revue')}</button>`) : ''}<button type="button" class="btn small ghost" data-city-del="${esc(sum.id)}">${T('Delete', 'Supprimer')}</button></span>
      ${cityOpen === sum.id ? `<div class="inv-detail" id="city-detail">${cityDetail.get(`${sum.id}|${lang()}`) || T('Loading…', 'Chargement…')}</div>` : ''}</span></li>`; }).join('')}</ul>`;
}
async function showCityDetail() {
  const box = $('city-detail'), x = cities.get(cityOpen), key = `${cityOpen}|${lang()}`; if (!box || !x || cityDetail.has(key)) return;
  try { const V = await import('../execution/city-view.mjs'); cityDetail.set(key, V.summaryHTML(x.sum, { reportOk })); if ($('city-detail') === box) box.innerHTML = cityDetail.get(key); }
  catch (err) { box.textContent = T(`Details unavailable: ${err.message}`, `Détails indisponibles : ${err.message}`); }
}
async function prepareCityReview(id) {
  const x = cities.get(id); if (!x?.ok) return;
  const sum = x.sum, text = [`${T('Saved city summary', 'Synthèse urbaine enregistrée')} ${sum.id} (${T(sum.city.name.en, sum.city.name.fr)}). ${NOTVAL()}`,
    `${T('Shared geography (co-location only)', 'Géographie commune (co-localisation seulement)')}: ${sum.overlaps.map(o => o.neighborhood).join(', ') || '—'}.`,
    `${T('Opportunities, all hypotheses', 'Pistes, toutes des hypothèses')}: ${sum.opportunities.map(o => o.text).join(' ')}`].join('\n').slice(0, 1000);
  const e = STORE.save({ kind: 'question', title: `${T('City summary', 'Synthèse urbaine')} · ${T(sum.city.name.en, sum.city.name.fr)} · ${day(sum.createdAt)}`.slice(0, 120), text, mission: null, structuredBy: 'deterministic', city: SV.cityRef(sum) });
  if (!STORE.list().some(c => c.id === e.id)) return toast(T('Browser storage unavailable; nothing was prepared.', 'Stockage local indisponible ; rien n’a été préparé.'));
  await syncLife(); render(); document.querySelector(`[data-life="${CSS.escape(e.id)}"]`)?.scrollIntoView({ block: 'start' });
  toast(T('Draft review request prepared in My contributions. Nothing was sent.', 'Brouillon de demande de revue préparé dans Mes contributions. Rien n’a été envoyé.'));
}
// Preparing a review request reuses the contribution lifecycle: a private draft that references the investigation.
async function prepareReview(id) {
  const x = inv.get(id); if (!x?.ok) return;
  const r = x.report, ref = SV.investigationRef(r), cls = T(...CLS[ref.class]);
  const text = [`${T('Saved local agent investigation', 'Enquête locale d’agents enregistrée')} ${r.execution} (${cls}${ref.model ? `, ${ref.model}` : ''}). ${NOTVAL()}`, `${T('Objective', 'Objectif')}: ${r.objective}`,
    `${T('Proposed conclusions (awaiting human review)', 'Conclusions proposées (en attente de revue humaine)')}: ${r.conclusions.map(c => c.text).join(' ')}`].join('\n').slice(0, 1000);
  const e = STORE.save({ kind: 'hypothesis', title: `${T('Agent investigation', 'Enquête d’agents')} ${r.execution.slice(0, 8)}: ${r.objective}`.slice(0, 120), text, mission: r.mission, structuredBy: 'deterministic', investigation: ref });
  if (!STORE.list().some(c => c.id === e.id)) return toast(T('Browser storage unavailable; nothing was prepared.', 'Stockage local indisponible ; rien n’a été préparé.'));
  await syncLife(); render(); document.querySelector(`[data-life="${CSS.escape(e.id)}"]`)?.scrollIntoView({ block: 'start' });
  toast(T('Draft review request prepared in My contributions. Nothing was sent.', 'Brouillon de demande de revue préparé dans Mes contributions. Rien n’a été envoyé.'));
}
const saveFile = (name, v) => { const url = URL.createObjectURL(new Blob([JSON.stringify(v, null, 2) + '\n'], { type: 'application/json' })), a = Object.assign(document.createElement('a'), { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
// The detail view reuses the Earth report rendering (loaded only when asked), without its map actions; cached per language.
async function showInvDetail() {
  const box = $('inv-detail'), x = inv.get(invOpen), key = `${invOpen}|${lang()}`; if (!box || !x || invDetail.has(key)) return;
  try { const V = await import('../execution/view.mjs'); invDetail.set(key, V.resultHTML(x.report, { source: 'stored', actions: false, nameOf: id => records?.byId.get(id)?.code || id })); if ($('inv-detail') === box) box.innerHTML = invDetail.get(key); }
  catch (err) { box.textContent = T(`Details unavailable: ${err.message}`, `Détails indisponibles : ${err.message}`); }
}
// Every contribution: private ones (this browser only) and those shared with a mission, with stage and evaluation.
function contribCard() {
  const civ = getJ('core.civ.v72'), shared = Object.entries(civ?.missions || {}).flatMap(([mid, ms]) => (ms.humanInputs || []).map(h => ({ ...h, mid })));
  const priv = STORE.list().filter(e => e.state === 'private');
  const ORDER = ['shared', 'review', 'evaluated', 'human'], LBL = Object.fromEntries(CONTRIB.STAGES);
  if (!shared.length && !priv.length) return `<p class="fine">${T('No contribution yet. In CORE World, “Contribute” helps you describe what you noticed; you then choose to keep it private or share it with a mission.', 'Aucune contribution. Dans CORE World, « Contribuer » vous aide à décrire ce que vous avez remarqué ; vous choisissez ensuite de le garder privé ou de le partager avec une mission.')}</p><a class="btn" href="world.html#contribute">${icon('explore', 16)} ${T('Contribute', 'Contribuer')}</a>`;
  return `${priv.length ? `<h3>${T('Private (this browser only, not shared)', 'Privées (ce navigateur seulement, non partagées)')}</h3><ul class="me-list">${priv.map(e => `<li><span><b>“${esc(e.title)}”</b><br><span class="fine">${e.demonstration ? T('Demonstration idea · draft, not reviewed', 'Idée de démonstration · brouillon, non relu') + ' · ' : ''}${esc(L(CONTRIB.KINDS[e.kind]) || e.kind)} · ${esc(day(e.at))} · ${e.structuredBy === 'local-model' ? T('structured by the local model', 'structurée par le modèle local') : T('structured by rules', 'structurée par des règles')}</span>${lifeHTML(e)}</span><span class="le-row"><a class="btn small" href="world.html#contribute=${encodeURIComponent(e.mission || '')}">${T('Open', 'Ouvrir')}</a><button type="button" class="btn small ghost" data-del="${esc(e.id)}">${T('Delete', 'Supprimer')}</button></span></li>`).join('')}</ul>` : ''}
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
  <section class="me-card wide"><h2>${T('Current plan', 'Offre actuelle')}</h2><p><b>CORE Free</b> · ${T('local preview, no subscription', 'aperçu local, sans abonnement')}</p><p class="fine">${T('No sign-in, cloud sync or billing. Your profile and contributions stay in this browser; clearing browser data can erase them.', 'Aucune connexion, synchronisation serveur ou facturation. Votre profil et vos contributions restent dans ce navigateur ; effacer ses données peut les supprimer.')}</p><a href="plans.html">${T('View proposed plans', 'Voir les offres proposées')}</a></section>
  <section class="me-card wide" id="investigations"><h2>${icon('flask', 18)} ${T('Agent investigations', 'Enquêtes d’agents')}</h2>${invCard()}</section>
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
  $('me-body').querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (!confirm(T('Delete this private contribution and its history from this browser?', 'Supprimer cette contribution privée et son historique de ce navigateur ?'))) return; STORE.remove(b.dataset.del); life.delete(b.dataset.del); render(); });
  $('me-body').querySelectorAll('[data-life-submit]').forEach(f => f.onsubmit = e => { e.preventDefault(); if (!f.consent.checked) return; lifeAct(f.dataset.lifeSubmit, 'SUBMITTED', { reason: 'Submitted by the author for demonstration review from My CORE; nothing was sent', consent: { review: true } }); });
  $('me-body').querySelectorAll('[data-life-packet]').forEach(b => b.onclick = () => {
    const id = b.dataset.lifePacket, L1 = life.get(id), entry = STORE.list().find(x => x.id === id); if (!L1 || !entry) return;
    const ix = entry.investigation && inv.get(entry.investigation.execution), investigationCheck = !entry.investigation ? null : ix?.ok && ix.report.digest === entry.investigation.digest ? { ok: true } : { ok: false, reason: ix ? 'saved report altered or not verified' : 'saved report deleted from this browser' };
    const cx = entry.city && cities.get(entry.city.id), cityCheck = !entry.city ? null : cx?.ok && cx.sum.digest === entry.city.digest ? { ok: true } : { ok: false, reason: cx ? 'saved city summary altered or not verified' : 'saved city summary deleted from this browser' };
    const packet = LC.reviewPacket(L1.record, entry, { verification: L1.check, related: records ? AR.relatedInvestigation(records, L1.record) : null, investigationCheck, cityCheck });
    const url = URL.createObjectURL(new Blob([JSON.stringify(packet, null, 2) + '\n'], { type: 'application/json' })), a = Object.assign(document.createElement('a'), { href: url, download: `core-review-request-${id}.json` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('me-body').querySelectorAll('[data-life-archive]').forEach(b => b.onclick = () => { if (confirm(T('Archive this contribution? Its history is kept.', 'Archiver cette contribution ? Son historique est conservé.'))) lifeAct(b.dataset.lifeArchive, 'ARCHIVED', { reason: 'Archived by the author' }); });
  const B = $('me-body');
  B.querySelectorAll('[data-inv-open]').forEach(b => b.onclick = () => { invOpen = invOpen === b.dataset.invOpen ? null : b.dataset.invOpen; render(); document.querySelector(`[data-inv="${CSS.escape(b.dataset.invOpen)}"]`)?.scrollIntoView({ block: 'start' }); });
  B.querySelectorAll('[data-inv-export]').forEach(b => b.onclick = () => { const x = inv.get(b.dataset.invExport); if (x) saveFile(`core-investigation-${x.report.execution.slice(0, 8)}.json`, x.report); });
  B.querySelectorAll('[data-inv-review]').forEach(b => b.onclick = () => prepareReview(b.dataset.invReview));
  B.querySelectorAll('[data-inv-goto]').forEach(b => b.onclick = e => { e.preventDefault(); document.querySelector(`[data-life="${CSS.escape(b.dataset.invGoto)}"]`)?.scrollIntoView({ block: 'start' }); });
  B.querySelectorAll('[data-inv-del]').forEach(b => b.onclick = () => { if (!confirm(T('Delete this saved investigation from this browser? A review request already prepared keeps its reference but can no longer be checked against the report.', 'Supprimer cette enquête enregistrée de ce navigateur ? Une demande de revue déjà préparée garde sa référence mais ne pourra plus être vérifiée avec le rapport.'))) return;
    if (!SV.deleteReport(b.dataset.invDel, localStorage)) return toast(T('Browser storage unavailable; nothing was deleted.', 'Stockage local indisponible ; rien n’a été supprimé.')); if (invOpen === b.dataset.invDel) invOpen = null; inv.delete(b.dataset.invDel); render(); });
  if (invOpen) showInvDetail();
  if (cityOpen) showCityDetail();
  B.querySelectorAll('[data-city-open]').forEach(b => b.onclick = () => { cityOpen = cityOpen === b.dataset.cityOpen ? null : b.dataset.cityOpen; render(); document.querySelector(`[data-city-sum="${CSS.escape(b.dataset.cityOpen)}"]`)?.scrollIntoView({ block: 'start' }); });
  B.querySelectorAll('[data-city-export]').forEach(b => b.onclick = () => { const x = cities.get(b.dataset.cityExport); if (x) saveFile(`core-city-summary-${x.sum.id.slice(0, 8)}.json`, x.sum); });
  B.querySelectorAll('[data-city-review]').forEach(b => b.onclick = () => prepareCityReview(b.dataset.cityReview));
  B.querySelectorAll('[data-inv-goto-inv]').forEach(b => b.onclick = e => { e.preventDefault(); const el = document.querySelector(`[data-inv="${CSS.escape(b.dataset.invGotoInv)}"]`); if (el) el.scrollIntoView({ block: 'start' }); else toast(T('That investigation is no longer saved in this browser.', 'Cette enquête n’est plus enregistrée dans ce navigateur.')); });
  B.querySelectorAll('[data-city-del]').forEach(b => b.onclick = () => { if (!confirm(T('Delete this city summary from this browser? The investigations it links to are kept.', 'Supprimer cette synthèse urbaine de ce navigateur ? Les enquêtes liées sont conservées.'))) return;
    if (!SV.deleteCitySummary(b.dataset.cityDel, localStorage)) return toast(T('Browser storage unavailable; nothing was deleted.', 'Stockage local indisponible ; rien n’a été supprimé.')); if (cityOpen === b.dataset.cityDel) cityOpen = null; cities.delete(b.dataset.cityDel); render(); });
  if (location.hash === '#contributions' || location.hash === '#investigations') $(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
}
// Earth-first (src/features.mjs): identity is the pseudonym, not a 3D avatar; the portrait and the studio link are dormant.
if (!STREET_LEVEL) { document.querySelector('.me-portrait')?.remove(); document.querySelector('.me-hero a[href="avatar.html"]')?.remove(); }
render(); if (STREET_LEVEL) portrait();
// #investigation=<id> (from the map): open that saved investigation once its integrity has been checked.
// #city=<id>: open that saved city summary (after its investigations, which it links to, are verified).
Promise.all([syncInv(), syncCity()]).then(() => { const h = new URLSearchParams(location.hash.slice(1)), id = h.get('investigation'), cid = h.get('city'); if (id && inv.has(id)) invOpen = id; if (cid && cities.has(cid)) cityOpen = cid; render();
  const target = invOpen ? `[data-inv="${CSS.escape(invOpen)}"]` : cityOpen ? `[data-city-sum="${CSS.escape(cityOpen)}"]` : null; if (target) document.querySelector(target)?.scrollIntoView({ block: 'start' }); });
fetch('data/problems/registry.json').then(r => r.json()).then(r => { problems = r.problems; render(); }).catch(() => {});
VS.onChange(() => render()); onLang(() => render());
globalThis.CORE_ME = { render, portrait: false, life, inv, cities };
syncLife().then(render);

mountFounderAccount($('me-body')); mountLocalFounder($('me-body'));
