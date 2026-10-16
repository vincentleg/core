// CORE Dialogue — team research mode (V7.2): a person works with a mission's specialist team.
// dialogue.html#mission=<id>[&agent=<id>][&intent=propose]
// How answers are produced (stated on the page):
//  • the question is routed by topic to the specialists whose mission findings address it;
//  • each specialist answers ONLY with the mission's computed findings (claim, source, retrieval date, limits);
//  • the evidence agent checks sources and dates; the review agent says what is NOT established and keeps dissent;
//  • the coordinator summarises without erasing disagreement;
//  • optionally (if the person chose the local model in Dialogue), the coordinator's summary may be reworded by the
//    local model and is shown only if it passes the verifier (src/intelligence/verifier.mjs); otherwise the
//    deterministic summary stays. No agent here is an independent reasoning model.
// Contributions: kept private in the encrypted vault, and/or shared with the mission council ONLY with explicit consent.
import * as CIV from '../civilization/client.mjs';
import { STAGE_FR, MSG_FR } from '../civilization/runtime.mjs';
import { verify } from '../intelligence/verifier.mjs';
import { ollamaGenerate } from '../intelligence/orchestrator.mjs';
import * as NAV from '../shell/nav.mjs';
import * as J from '../shell/journey.mjs';
import * as VS from '../civic/vault-session.mjs';
import * as V from '../civic/vault.mjs';
import * as I from '../civic/identity.mjs';
import { icon } from '../ui/icons.mjs';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https:\/\//i.test(String(u || '')) ? String(u) : null);
const getJ = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const putJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const toast = t => { $('toast').textContent = t; clearTimeout(toast.t); toast.t = setTimeout(() => { $('toast').textContent = ''; }, 6000); };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const T = { R: null, m: null, turns: [], side: 'dossier', roster: [], busy: false, abort: null, ideaId: null, lastInput: null };

// Topic routing: keywords → finding ids. Order matters (first matches are cited first).
export const TOPICS = [
  [/(production|construi|achev|offre|logements? (nets?|neufs?)|supply|construction)/, ['h.production-trend', 'h.affordable-share']],
  [/(pipeline|projets?|abordable|affordable|programme|mohcd|ou (sont|se trouvent))/, ['h.pipeline', 'h.pipeline-geography']],
  [/(expuls|deplacement|evict|locataire|pression)/, ['h.eviction-notices']],
  [/(inond|climat|risque|resilien|vulnerab|eau|orage)/, ['h.flood-exposure']],
  [/(loyer|revenu|taux d.effort|prix|rent|income|cher)/, ['g.rent-burden', 'g.prices']],
  [/(zonage|foncier|zoning)/, ['g.zoning']], [/(transport|transit|bus|metro)/, ['g.transit']],
  [/(energ|batiment)/, ['e.eui']], [/(securite routiere|collision|accident|hin)/, ['m.hin', 'm.crashes']], [/(arbre|canopee|foret)/, ['f.trees']],
  [/(trottoir|sidewalk)/, ['s.sidewalk']], [/(fraich|date|ancien|a jour)/, ['r.freshness']],
];
const CAUSAL = /(pourquoi|cause|a cause|parce|explique|meilleure? (solution|politique)|faut.il|devrait|prouv|resoudre|solution)/;
export function route(question, mission) {
  const q = norm(question), ids = new Set();
  for (const [re, list] of TOPICS) if (re.test(q)) for (const id of list) if (mission.findings.some(f => f.id === id)) ids.add(id);
  // A causal question about the mission's subject ("why", "cause", "best solution") is answered with the competing
  // hypotheses' evidence and the explicit statement that causation is not established — never with a chosen cause.
  if (!ids.size && CAUSAL.test(q) && /(logement|housing|crise|abordab|ville|mission)/.test(q)) { for (const h of mission.hypotheses) for (const id of h.support) ids.add(id); ids.add('g.causality'); }
  return { findings: [...ids].map(id => mission.findings.find(f => f.id === id)), causal: CAUSAL.test(q) };
}

function pickRoster(R, m, focusId) {
  const team = t => R.agents.filter(a => a.team === `team.${t}` && a.level === 'agent'), byRole = (t, r) => team(t).find(a => a.id.includes(`.${r}.`)) || team(t)[0];
  const C = R.byId.get(m.coordinator);
  const roles = m.flagship ? [['housing', 'production'], ['housing', 'pipeline'], ['social', 'displacement'], ['climate', 'flood']] : [[C.department, m.findings[0]?.role || '']];
  const out = [{ who: C, role: 'coordinator', label: 'Coordination' }];
  for (const [t, r] of roles) { const a = byRole(t, r); if (a) out.push({ who: a, role: 'specialist', team: t, label: a.role }); }
  out.push({ who: byRole('research', 'dates') || byRole('research', 'sources'), role: 'evidence', team: 'research', label: 'Vérification des preuves' });
  out.push({ who: byRole('safety', 'adversarial') || team('safety')[0], role: 'review', team: 'safety', label: 'Revue critique' });
  if (focusId && R.byId.has(focusId) && !out.some(x => x.who?.id === focusId)) out.splice(1, 0, { who: R.byId.get(focusId), role: 'specialist', team: R.byId.get(focusId).department, label: R.byId.get(focusId).role, focus: true });
  return out.filter(x => x.who);
}
const forTeam = team => T.roster.find(x => x.role === 'specialist' && x.team === team) || T.roster.find(x => x.role === 'specialist');
const srcLine = f => f.source ? `${f.source.title} · récupéré le ${f.source.retrieved}${f.period ? ` · ${f.period}` : ''}` : 'lacune déclarée';

// ---------- turns ----------
const add = t => { T.turns.push({ at: Date.now(), ...t }); renderConvo(); };
function renderConvo() {
  $('dl-convo').innerHTML = T.turns.map(t => {
    if (t.kind === 'user') return `<li class="turn user"><p class="who">Vous</p><div class="body">${esc(t.text)}</div></li>`;
    if (t.kind === 'system') return `<li class="turn system"><p class="who">Système</p><div class="body">${esc(t.text)}</div></li>`;
    const a = t.agent, cites = (t.findings || []).filter(f => f.source).map(f => `<li>${icon('file', 12)} ${esc(srcLine(f))}${safeUrl(f.source.page) ? ` · <a href="${esc(safeUrl(f.source.page))}" target="_blank" rel="noopener noreferrer">source</a>` : ''}</li>`).join('');
    const cls = { specialist: 'evidence', evidence: 'reasoning', review: 'challenge', coordinator: 'reasoning', replay: 'reasoning' }[t.role] || 'reasoning';
    return `<li class="turn ${cls}"><p class="who">${esc(a?.code || '')} · ${esc(t.label || a?.role || '')}${t.badge ? ` <span class="le-badge" data-s="${esc(t.badge[0])}">${esc(t.badge[1])}</span>` : ''}</p><div class="body">${esc(t.text)}${cites ? `<ul class="cites">${cites}</ul>` : ''}${t.limits ? `<p class="unc"><b>Limites :</b> ${esc(t.limits)}</p>` : ''}${t.gen ? `<p class="gen">${t.gen}</p>` : ''}</div></li>`;
  }).join('') + (T.busy ? `<li class="turn reasoning draft"><p class="who">Modèle local · brouillon non vérifié</p><div class="body">${esc(T.draft || '…')}</div></li>` : '');
  const el = $('dl-convo'); el.scrollTop = el.scrollHeight;
}

export function answerTurns(m, roster, question) {
  const { findings, causal } = route(question, m), out = [], coord = roster.find(x => x.role === 'coordinator'), ev = roster.find(x => x.role === 'evidence'), rv = roster.find(x => x.role === 'review');
  const observed = findings.filter(f => f.status !== 'gap'), gaps = findings.filter(f => f.status === 'gap');
  if (!findings.length) {
    out.push({ role: 'coordinator', agent: coord.who, label: 'Coordination', text: `Aucun constat de cette mission ne répond à cette question. Je ne réponds pas sans preuve. Vous pouvez la proposer au conseil comme question de recherche (avec votre consentement), ou la poser à CORE Knowledge dans le dialogue simple.` });
    return out;
  }
  const byTeam = new Map(); for (const f of observed) { const k = f.team; if (!byTeam.has(k)) byTeam.set(k, []); byTeam.get(k).push(f); }
  for (const [team, fs] of byTeam) { const s = forTeam(team) || coord; out.push({ role: 'specialist', agent: s.who, label: s.label, badge: ['observed', fs.every(f => f.status === 'observed') ? 'observé' : 'dérivé de données observées'], text: fs.map(f => f.claim).join('\n'), findings: fs, limits: fs.map(f => f.limits).join(' ') }); }
  if (observed.length) out.push({ role: 'evidence', agent: ev.who, label: ev.label, text: `Sources vérifiées : ${[...new Set(observed.map(srcLine))].join(' ; ')}. Chaque chiffre est recalculé par le code depuis l’instantané daté ; aucun chiffre n’est tapé à la main ni produit par un modèle.` });
  const notEst = [...gaps.map(g => g.claim), ...(causal ? [m.findings.find(f => f.id === 'g.causality')?.claim || 'Aucune relation causale n’est établie.'] : [])];
  const hyps = m.hypotheses.filter(h => h.support.some(id => findings.some(f => f.id === id)) || h.against.some(id => findings.some(f => f.id === id)));
  const dis = m.dissent.filter(d => byTeam.has(d.by) || causal).slice(0, 2);
  if (notEst.length || hyps.length || dis.length) out.push({ role: 'review', agent: rv.who, label: rv.label, text: [notEst.length ? `Non établi : ${notEst.join(' ')}` : '', hyps.length ? `Hypothèses concernées, toutes ouvertes : ${hyps.map(h => `${h.id} (${h.title})`).join(', ')}.` : '', ...dis.map(d => `Dissidence conservée : ${d.text}`)].filter(Boolean).join('\n') });
  out.push({ role: 'coordinator', agent: coord.who, label: 'Coordination — synthèse', text: `${observed.length ? `Établi (comptes datés) : ${observed.map(f => f.claim).join(' ')}` : 'Rien n’est établi par les données chargées sur ce point.'}${notEst.length ? ` Non établi : ${notEst.length} point(s) ci-dessus.` : ''}${hyps.length ? ` Les hypothèses ${hyps.map(h => h.id).join(', ')} restent concurrentes ; aucune donnée chargée ne les départage.` : ''}`, findings: observed, synth: true });
  return out;
}

async function ask(text) {
  text = String(text || '').trim().slice(0, 500); if (!text || T.busy) return;
  add({ kind: 'user', text }); $('dl-input').value = '';
  const turns = answerTurns(T.m, T.roster, text);
  for (const t of turns) { await new Promise(r => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280)); add(t); }
  const pref = getJ('core.intelligence.v1'), syn = turns.find(t => t.synth);
  if (pref?.provider === 'ollama' && pref.model && syn?.findings?.length) await reword(syn, text, pref.model);
  J.mark('dialogue', { problemId: T.m.id });
}
// Optional local-model wording of the coordinator's synthesis, verified before display, cancellable, one call.
async function reword(syn, question, model) {
  const ev = syn.findings.map(f => ({ text: f.claim, record: f.source?.dataset || f.id }));
  const messages = [{ role: 'system', content: 'Tu es le coordinateur d’une équipe CORE. Résume en 2 ou 3 phrases, en français, UNIQUEMENT avec les constats numérotés. Cite [n] après chaque fait. N’ajoute aucun chiffre, date, cause, statut juridique ou certitude absents des constats. Dis ce qui reste incertain.' },
    { role: 'user', content: `Constats :\n${ev.map((e, i) => `[${i + 1}] ${e.text}`).join('\n')}\n\nQuestion : ${question}` }];
  T.busy = true; T.draft = ''; T.abort = new AbortController(); renderConvo(); $('dl-stop').hidden = false;
  try {
    const draft = await ollamaGenerate(messages, { model, signal: T.abort.signal, onToken: (_, all) => { T.draft = all; renderConvo(); } });
    const v = verify(draft, ev);
    T.busy = false;
    if (v.ok) add({ role: 'coordinator', agent: syn.agent, label: 'Coordination — reformulation', text: draft, findings: syn.findings, gen: `<span class="le-badge" data-s="local-model">Formulé par un modèle local</span> ${esc(model)} · vérifié contre ${ev.length} constat(s)` });
    else add({ kind: 'system', text: `Le brouillon du modèle local a été écarté par le vérificateur (${v.issues.map(i => i.detail).join(' ; ')}). La synthèse déterministe ci-dessus reste la réponse.` });
  } catch (e) { T.busy = false; add({ kind: 'system', text: e.name === 'AbortError' ? 'Reformulation arrêtée.' : `Modèle local indisponible (${e.message}) : la synthèse déterministe reste la réponse.` }); }
  finally { $('dl-stop').hidden = true; T.abort = null; }
}
function consult(id) {
  const x = T.roster.find(r => r.who.id === id) || { who: T.R.byId.get(id), label: T.R.byId.get(id)?.role, role: 'specialist' }, a = x.who, act = T.R.activity(a.id);
  const mine = T.m.findings.filter(f => f.team === a.department && f.status !== 'gap');
  add({ role: 'specialist', agent: a, label: `${x.label} (consulté)`, text: `${act.label}.${mine.length ? `\nMes constats pour cette mission :\n${mine.map(f => `• ${f.claim}`).join('\n')}` : '\nJe n’ai pas de constat propre dans cette mission ; je peux seulement relire ceux de l’équipe.'}`, findings: mine, limits: mine.map(f => f.limits).join(' ') });
}

// ---------- side panels ----------
function renderSide() {
  document.querySelectorAll('[data-side]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.side === T.side)));
  const B = $('dl-side'), m = T.m, ms = T.R.S.missions[m.id];
  if (T.side === 'dossier') {
    B.innerHTML = `<div class="ds-known"><div><b>Établi</b>${m.findings.filter(f => f.status !== 'gap').length} constat(s) daté(s)</div><div><b>Non établi</b>${m.findings.filter(f => f.status === 'gap').length} lacune(s) déclarée(s)</div><div><b>Proposé</b>${m.hypotheses.length} hypothèse(s) concurrente(s)</div></div>
      <section class="ds-sec"><h3>Étape <span class="st now">${esc(STAGE_FR[ms.stage] || ms.stage)}</span></h3><p>${esc({ open: 'Mission en cours.', 'awaiting-human': 'Dossier prêt : en attente d’une revue humaine (aucun relecteur humain vérifié n’existe encore).', monitoring: 'Surveillance.', gap: 'Lacune : aucune donnée.' }[ms.status] || ms.status)}</p></section>
      ${m.findings.map(f => `<section class="ds-sec"><h3>${esc(f.status === 'gap' ? 'Lacune' : f.status === 'observed' ? 'Observé' : 'Dérivé')}</h3><p>${esc(f.claim)}</p><p class="fine">${esc(srcLine(f))} — ${esc(f.limits)}</p></section>`).join('')}
      ${m.hypotheses.map(h => `<section class="ds-sec"><h3>${esc(h.id)} — ${esc(h.title)} <span class="st no">ouverte</span></h3><p>${esc(h.statement)}</p><p class="fine">Test proposé : ${esc(h.test)}</p></section>`).join('')}
      ${m.dissent.length ? `<section class="ds-sec"><h3>Dissidences</h3><ul>${m.dissent.map(d => `<li>${esc(d.text)}</li>`).join('')}</ul></section>` : ''}
      ${proposeForm()}`;
    wirePropose();
  } else if (T.side === 'team') {
    B.innerHTML = `<p class="fine">L’équipe de cette séance. Chaque agent est une identité du registre animée par le moteur déterministe CORE.</p>
      <ul class="tm-roster">${T.roster.map(x => `<li><div><b>${esc(x.who.code)}</b> · ${esc(x.label)}<br><span class="fine">${esc(T.R.activity(x.who.id).label)}</span></div><button type="button" class="small" data-consult="${esc(x.who.id)}">Consulter</button></li>`).join('')}</ul>
      <p><a href="world.html#mission=${encodeURIComponent(m.id)}">Voir la mission dans CORE World →</a></p>`;
    B.querySelectorAll('[data-consult]').forEach(b => b.onclick = () => consult(b.dataset.consult));
  } else {
    const evs = T.R.S.events.filter(e => e.mission === m.id && e.kind === 'message').slice(-30).reverse();
    B.innerHTML = `<p class="fine">Journal du moteur (relecture des enregistrements, empreintes chaînées ${T.R.verify() ? 'vérifiées' : 'ROMPUES'}). Ce sont des messages produits par le code à partir des constats cités, pas des conversations libres entre modèles.</p>
      <ul class="cv-feed">${evs.map(e => `<li class="cv-ev"><span class="cv-type t-${esc(e.type)}">${esc(MSG_FR[e.type] || e.type)}</span> <b>${esc(T.R.byId.get(e.from)?.code || (e.from === 'human:local' ? 'Vous' : e.from))}</b> → ${esc(T.R.byId.get(e.to)?.code || e.to)}<br><span class="cv-txt">${esc(e.text)}</span></li>`).join('') || '<li class="fine">Aucun échange pour l’instant (le moteur progresse quand CORE est ouvert).</li>'}</ul>`;
  }
}
function proposeForm() {
  const prof = getJ('core.commons.v1')?.profile, mine = T.R.S.missions[T.m.id].humanInputs;
  return `<section class="ds-sec" id="tm-propose"><h3>Proposer à la mission</h3>
    <form class="form" id="tm-form"><label>Type <select id="tm-kind"><option value="hypothesis">Hypothèse</option><option value="evidence">Preuve (avec sa source)</option><option value="question">Question de recherche</option><option value="challenge">Contestation</option></select></label>
      <label>Titre <input id="tm-title" maxlength="120" required></label><label>Texte <textarea id="tm-text" maxlength="1000" required></textarea></label>
      <div class="le-row"><button type="button" id="tm-private">Garder en privé (coffre chiffré)</button></div>
      <label class="inline"><input type="checkbox" id="tm-consent"> Je consens à partager ce titre et ce texte avec le conseil de mission (stockés dans ce navigateur, visibles dans CORE World ; aucune publication).</label>
      <button type="submit" class="primary">Soumettre au conseil de mission</button></form>
    ${!prof || !VS.unlocked() ? `<p class="fine">Pour garder une copie privée, il faut une identité locale et le coffre ouvert : ${!prof ? '<input id="tm-ps" maxlength="24" placeholder="pseudonyme"> <button type="button" class="small" id="tm-prof">Créer</button>' : '<input id="tm-pass" type="password" minlength="12" placeholder="phrase secrète (12+)"> <button type="button" class="small" id="tm-unlock">Ouvrir le coffre</button>'}</p>` : ''}
    ${mine.length ? `<p class="fine">Vos contributions à cette mission : ${mine.map(h => `« ${esc(h.title)} » (${esc(h.state)})`).join(', ')}</p>` : ''}</section>`;
}
function wirePropose() {
  const val = () => ({ kind: $('tm-kind').value, title: $('tm-title').value.trim(), text: $('tm-text').value.trim() });
  $('tm-prof')?.addEventListener('click', () => { try { const c = getJ('core.commons.v1') || {}; c.profile = I.createProfile({ pseudonym: $('tm-ps').value }); putJ('core.commons.v1', c); renderSide(); } catch (e) { toast(e.message); } });
  $('tm-unlock')?.addEventListener('click', async () => { try { await VS.unlock($('tm-pass').value, getJ('core.commons.v1').profile.id); renderSide(); } catch (e) { toast(e.message); } });
  $('tm-private').onclick = async () => {
    const v = val(); if (!v.title || !v.text) return toast('Donnez un titre et un texte.');
    if (!VS.unlocked()) return toast('Ouvrez d’abord votre coffre (ci-dessous).');
    try { const vault = VS.vault(), owner = getJ('core.commons.v1').profile.id; let idea = vault.ideas.find(i => i.id === T.ideaId) || V.newIdea({ id: `idea-${Date.now().toString(36)}`, owner });
      idea = await V.addVersion(idea, { title: v.title, problem: `${T.m.title} — ${T.m.question}`, solution: `[${v.kind}] ${v.text}`, evidence: '', problemId: T.m.id });
      await VS.save({ ...vault, ideas: [...vault.ideas.filter(i => i.id !== idea.id), idea] }); T.ideaId = idea.id;
      J.mark('vault', { problemId: T.m.id, ideaId: idea.id, idea: { versions: idea.versions.length } }); toast(`Gardé en privé et chiffré (version ${idea.versions.length}). Rien n’a été partagé.`);
    } catch (e) { toast(e.message); } };
  $('tm-form').onsubmit = async e => { e.preventDefault(); const v = val();
    if (!$('tm-consent').checked) return toast('Rien n’est partagé sans votre consentement : cochez la case pour soumettre au conseil.');
    try { const h = await CIV.submit(T.m.id, { ...v, consent: true }); T.lastInput = h; add({ kind: 'system', text: `Contribution « ${h.title} » transmise au conseil de mission. Elle sera triée par l’équipe de vérification puis examinée comme ${v.kind === 'evidence' ? 'preuve à vérifier' : 'hypothèse ou question'} ; aucune validation automatique, aucun relecteur humain vérifié pour l’instant.` });
      try { const f = getJ('core.follow.v1') || {}; f.mission = T.m.id; f.title = T.m.title; f.inputs = [...(f.inputs || []), { mission: T.m.id, title: h.title, at: new Date().toISOString() }].slice(-20); putJ('core.follow.v1', f); } catch {}
      renderSide(); } catch (err) { toast(err.message); } };
}

export async function boot(h) {
  NAV.render($('core-nav'), { active: 'dialogue' });
  document.querySelector('.dl-mode').hidden = true; $('dl-provider-btn').hidden = true;
  const tabs = document.querySelectorAll('[data-side]'); [['dossier', 'Dossier'], ['team', 'Équipe'], ['log', 'Échanges']].forEach(([k, l], i) => { tabs[i].dataset.side = k; tabs[i].textContent = l; });
  let R; try { R = await CIV.start(); } catch (e) { $('dl-convo').innerHTML = `<li class="turn system"><div class="body">Civilisation CORE indisponible (${esc(e.message)}).</div></li>`; return; }
  const m = R.M.get(h.mission); if (!m) { $('dl-convo').innerHTML = '<li class="turn system"><div class="body">Mission inconnue.</div></li>'; return; }
  Object.assign(T, { R, m, roster: pickRoster(R, m, h.agent) });
  document.title = `CORE — Séance d’équipe · ${m.title}`;
  $('dl-title').textContent = m.title; document.querySelector('.dl-titles .le-eyebrow').textContent = 'Séance d’équipe · mission';
  $('dl-engine').textContent = `${T.roster.length} agents CORE · réponses composées par le moteur à partir des constats cités · aucun agent n’est un modèle autonome`;
  $('dl-scene').innerHTML = '<i class="hex" aria-hidden="true"></i>';
  const lead = T.roster.find(x => x.focus) || T.roster[0];
  add({ role: 'coordinator', agent: lead.who, label: lead.focus ? lead.label : 'Coordination', text: `${lead.focus ? 'Vous m’avez sollicité depuis CORE World. ' : ''}Bienvenue dans la séance de la mission « ${m.title} ». Question de recherche : ${m.question}\nNous répondons uniquement avec les constats datés de la mission ; ce qui n’est pas établi est dit comme tel. Vous pouvez consulter un autre spécialiste (onglet Équipe), lire nos échanges (onglet Échanges) ou proposer une hypothèse.` });
  const qs = m.flagship ? ['Où sont les projets de logements abordables ?', 'La production de logements a-t-elle baissé ?', 'Les expulsions augmentent-elles ?', 'Les nouveaux logements sont-ils exposés aux inondations ?', 'Quelle est la cause de la crise du logement ?', 'Les loyers sont-ils trop chers ?'] : [`Que sait-on pour « ${m.title} » ?`];
  $('dl-chips').innerHTML = qs.map(q => `<button type="button" data-q="${esc(q)}">${icon('search', 14)} ${esc(q)}</button>`).join('') + T.roster.filter(x => x.role !== 'coordinator').slice(0, 3).map(x => `<button type="button" class="fill" data-consult="${esc(x.who.id)}">${icon('collaborate', 14)} Consulter ${esc(x.who.code)}</button>`).join('');
  $('dl-chips').querySelectorAll('[data-q]').forEach(b => b.onclick = () => ask(b.dataset.q));
  $('dl-chips').querySelectorAll('[data-consult]').forEach(b => b.onclick = () => consult(b.dataset.consult));
  $('dl-input').placeholder = 'Posez une question à l’équipe (logement, inondation, expulsions, production…)';
  $('dl-form').onsubmit = e => { e.preventDefault(); ask($('dl-input').value); };
  $('dl-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask($('dl-input').value); } });
  const stop = document.createElement('button'); stop.type = 'button'; stop.id = 'dl-stop'; stop.className = 'small'; stop.hidden = true; stop.textContent = 'Arrêter la reformulation'; stop.onclick = () => T.abort?.abort(); $('dl-form').append(stop);
  tabs.forEach(b => b.onclick = () => { T.side = b.dataset.side; renderSide(); });
  if (h.intent === 'propose') { T.side = 'dossier'; renderSide(); setTimeout(() => $('tm-propose')?.scrollIntoView({ block: 'start' }), 50); } else renderSide();
  let last = 0; CIV.onChange(() => { const now = performance.now(); if (now - last > 3000 && T.side !== 'dossier') { last = now; renderSide(); } });
  J.mark('dialogue', { problemId: m.id });
  globalThis.CORE_DIALOGUE = { state: T, send: ask, consult, team: true };
}
