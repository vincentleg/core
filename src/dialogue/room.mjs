// CORE Dialogue & Research Studio (V7) — UI for src/dialogue/engine.mjs. Private by default: the session lives in memory;
// it is kept only if the user saves it into the encrypted vault. Two modes over one session: Conversation and Studio
// (the dossier, editable). Factual questions go through src/intelligence/orchestrator.mjs: deterministic by default, an
// optional LOCAL model only when the person switches it on, and every model wording is verified before it is shown.
// Deep links: dialogue.html#problem=<id>[&mode=understand|propose] or #idea=<id> (continue an idea).
import * as D from './engine.mjs';
import { loadIndex } from '../kb/browser.mjs';
import { STATUS } from '../kb/knowledge.mjs';
import * as NAV from '../shell/nav.mjs';
import * as J from '../shell/journey.mjs';
import * as VS from '../civic/vault-session.mjs';
import * as V from '../civic/vault.mjs';
import * as I from '../civic/identity.mjs';
import * as O from '../intelligence/orchestrator.mjs';
import * as AC from '../earth/avatar-config.mjs';
import { icon } from '../ui/icons.mjs';
import { T, onLang } from '../i18n/i18n.mjs';
import { ptext } from '../earth/problem-view.mjs';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https:\/\//i.test(String(u || '')) ? u : '#');
const getJ = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const putJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const DEFAULT_PROBLEM = 'sidewalk-below-bsp-min:5665000';
const PKEY = 'core.intelligence.v1'; // provider preference only (never content)
const R = { ix: null, problem: null, agent: null, s: null, side: 'idea', times: [], ideaId: null, pending: null, mode: 'dialogue', provider: getJ(PKEY)?.provider === 'ollama' ? 'ollama' : 'deterministic', model: getJ(PKEY)?.model || null, local: { ok: false, models: [] }, busy: false, draft: '' };
let toastT; const toast = t => { $('toast').textContent = t; clearTimeout(toastT); toastT = setTimeout(() => { $('toast').textContent = ''; }, 6000); };
const hash = () => Object.fromEntries(new URLSearchParams(location.hash.slice(1)));

function pickAgent(problem) {
  const byDomain = { accessibility: 'public-space', infrastructure: 'civil', nature: 'forestry' }[problem.domain];
  const ids = problem.assignedAgents || [];
  const id = ids.find(x => byDomain && x.includes(`.${byDomain}.`)) || ids[0];
  return R.ix.agents.find(a => a.id === id) || null;
}

function scene() {
  $('dl-scene').innerHTML = `<i class="hex" aria-hidden="true"></i><span class="sr-only">Agent ${esc(R.agent?.code || 'CORE')}, non humain</span>`;
}
const WHO = () => ({ user: T('You', 'Vous'), reasoning: T('Agent · guided reasoning', 'Agent · raisonnement guidé'), challenge: T('Agent · objection', 'Agent · objection'), evidence: T('Evidence · CORE Knowledge', 'Preuve · CORE Knowledge'), system: T('System', 'Système') });
function genLine(t) {
  if (t.kind !== 'evidence' || !t.provider) return '';
  if (t.provider === 'ollama' && t.verified) return `<p class="gen"><span class="le-badge" data-s="local-model">${T('Worded by a local model', 'Formulé par un modèle local')}</span> ${esc(t.model || '')} · ${T(`checked against ${t.claims?.length || 0} cited piece(s) of evidence`, `vérifié contre ${t.claims?.length || 0} preuve(s) citée(s)`)} · <details><summary>${T('Exact text of the evidence', 'Texte exact des preuves')}</summary>${(t.claims || []).map((c, i) => `[${i + 1}] ${esc(c)}`).join('<br>')}</details></p>`;
  if (t.rejected) return `<p class="gen"><span class="le-badge" data-s="deterministic">${T('Deterministic answer', 'Réponse déterministe')}</span> ${T('The local model’s draft was discarded by the verifier:', 'Le brouillon du modèle local a été écarté par le vérificateur :')} <details><summary>${T('why', 'pourquoi')}</summary>${t.rejected.issues.map(i => esc(i.detail)).join('<br>')}</details></p>`;
  if (t.fallback) return `<p class="gen"><span class="le-badge" data-s="deterministic">${T('Deterministic answer', 'Réponse déterministe')}</span> ${esc(t.fallback)}</p>`;
  return '';
}
function renderConvo() {
  $('dl-convo').innerHTML = R.s.turns.map(t => {
    const k = t.role === 'user' ? 'user' : t.kind;
    const cites = t.citations?.length ? `<ul class="cites">${[...new Map(t.citations.map(c => [c.record, c])).values()].map(c => `<li>${icon('file', 12)} ${esc(c.record)} · ${esc(c.source)} · ${esc(c.integrity)}${c.url ? ` · <a href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener noreferrer">source</a>` : ''}</li>`).join('')}</ul>` : '';
    const st = t.statuses?.length ? `<span class="badge ${t.statuses.includes('observed') ? 'observed' : 'approx'}">${esc([...new Set(t.statuses)].map(x => STATUS[x]?.split(': ')[0] || x).join(' · '))}</span>` : '';
    const unc = t.uncertainty?.length ? `<p class="unc"><b>${T('What remains uncertain:', 'Ce qui reste incertain :')}</b> ${t.uncertainty.map(esc).join(' ')}</p>` : '';
    const cav = t.caveat ? `<p class="unc"><b>${T('Unsupported claim:', 'Affirmation non soutenue :')}</b> ${esc(t.caveat)}</p>` : '';
    return `<li class="turn ${k}"><p class="who">${WHO()[k] || k} ${st}</p><div class="body">${esc(t.text)}${cites}${unc}${cav}${genLine(t)}</div></li>`;
  }).join('') + (R.busy ? `<li class="turn evidence draft" aria-live="off"><p class="who">${T('Local model · unverified draft', 'Modèle local · brouillon non vérifié')}</p><div class="body">${esc(R.draft || '…')}</div></li>` : '');
  const el = $('dl-convo'); el.scrollTop = el.scrollHeight;
}

function renderSide() {
  document.querySelectorAll('[data-side]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.side === R.side)));
  const B = $('dl-side'), d = R.s.draft;
  if (R.side === 'idea') {
    const miss = new Set(D.missing(R.s).map(m => m.id)), studio = R.mode === 'studio';
    const val = id => { const v = d[id]; return Array.isArray(v) ? v : v ? [v] : []; };
    const known = R.s.evidence.length ? T(`${R.s.evidence.length} record(s) cited`, `${R.s.evidence.length} enregistrement(s) cité(s)`) : T('nothing cited yet', 'rien de cité pour l’instant');
    $('dl-dossier-state').textContent = `${D.PHASES.length - miss.size}/${D.PHASES.length} ${T('sections', 'rubriques')}`;
    B.innerHTML = `<div class="ds-known"><div><b>${T('What is known', 'Ce qui est connu')}</b>${esc(known)}</div><div><b>${T('What is unknown', 'Ce qui est inconnu')}</b>${esc(R.problem?.caveat ? ptext(R.problem.caveat).split(/[;.]/)[0] + ' …' : T('not stated in the record: to be specified', 'non déclaré dans l’enregistrement : à préciser'))}</div><div><b>${T('What is proposed', 'Ce qui est proposé')}</b>${esc(d.proposal ? d.proposal.slice(0, 80) : T('no idea yet', 'aucune idée encore'))}</div></div>
      <div class="ds-grid">${D.PHASES.map(([id, label, prompt]) => { const v = val(id), st = R.s.phase === id ? 'now' : miss.has(id) ? 'no' : 'ok';
        return `<section class="ds-sec" data-sec="${id}"><h3>${esc(label)} <span class="st ${st}">${st === 'ok' ? T('filled', 'rempli') : st === 'now' ? T('in progress', 'en cours') : T('to do', 'à faire')}</span></h3>
          ${studio ? `<label class="sr-only" for="ds-${id}">${esc(label)}</label><textarea id="ds-${id}" data-field="${id}" placeholder="${esc(prompt)}">${esc(Array.isArray(d[id]) ? d[id].join('\n') : d[id] || '')}</textarea>`
            : v.length ? (v.length > 1 ? `<ul>${v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p>${esc(v[0])}</p>`) : `<p class="empty">${esc(prompt)}</p>`}
          ${studio ? '' : `<button type="button" class="goto" data-phase="${id}">${st === 'ok' ? T('Review', 'Revoir') : T('Work on this', 'Travailler ceci')}</button>`}</section>`; }).join('')}</div>
      <div class="card"><h3>${T('Save to my encrypted vault', 'Enregistrer dans mon coffre chiffré')}</h3>${saveForm()}</div>`;
    B.querySelectorAll('[data-phase]').forEach(b => b.onclick = () => { R.s = D.goTo(R.s, b.dataset.phase); renderAll(); $('dl-input').focus(); });
    B.querySelectorAll('textarea[data-field]').forEach(t => t.oninput = () => { const f = t.dataset.field; R.s.draft[f] = Array.isArray(R.s.draft[f]) ? t.value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12) : t.value; });
    wireSave();
  } else if (R.side === 'evidence') {
    B.innerHTML = R.s.evidence.length ? `<p class="fine">${T('Records cited during this session (public registries verified by fingerprint).', 'Enregistrements cités pendant cette session (registres publics vérifiés par empreinte).')}</p><ul>${R.s.evidence.map(e => `<li><code>${esc(e.record)}</code> · ${esc(e.source)} · ${esc(e.integrity)}${e.url ? ` · <a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener noreferrer">source</a>` : ''}</li>`).join('')}</ul>
      <p><a href="commons.html#knowledge?q=${encodeURIComponent(R.problem?.id || '')}">${T('Explore in CORE Knowledge →', 'Explorer dans CORE Knowledge →')}</a></p>` : `<p class="fine">${T('No evidence cited yet. Ask a question ending with “?”: the answer comes from CORE Knowledge, with its sources.', 'Aucune preuve citée pour l’instant. Posez une question finissant par « ? » : la réponse vient de CORE Knowledge, avec ses sources.')}</p>`;
  } else {
    B.innerHTML = `<p class="fine">${T('Dialogue engine', 'Moteur de dialogue')} : ${esc(D.ENGINE.id)} ${esc(D.ENGINE.version)} · ${esc(D.ENGINE.kind)}. ${T('Factual answers', 'Réponses factuelles')} : ${esc(O.PROVIDERS[R.provider].label)}. ${T('Nothing here validates an idea.', 'Rien ici ne valide une idée.')}</p>
      <p class="fine"><b>${T('Privacy.', 'Confidentialité.')}</b> ${T('This session is in memory only. It is kept only if you save it to your encrypted vault; nothing is transmitted.', 'Cette session est en mémoire seulement. Elle n’est conservée que si vous l’enregistrez dans votre coffre chiffré ; rien n’est transmis.')}</p>
      <div class="row2"><button type="button" id="dl-md">${T('Export (Markdown)', 'Exporter (Markdown)')}</button><button type="button" id="dl-json">${T('Export (JSON)', 'Exporter (JSON)')}</button></div>
      <button type="button" class="ghost small" id="dl-clear">${T('Clear this session', 'Effacer cette session')}</button>
      <p><a href="world.html${R.problem ? `#problem=${encodeURIComponent(R.problem.id)}` : ''}">${T('← Back to the problem in CORE World', '← Retour au problème dans CORE World')}</a> · <a href="me.html">${T('My CORE', 'Mon CORE')}</a></p>`;
    $('dl-md').onclick = () => download(`core-dialogue-${R.s.id}.md`, D.exportMarkdown(R.s), 'text/markdown');
    $('dl-json').onclick = () => download(`core-dialogue-${R.s.id}.json`, JSON.stringify(R.s, null, 1), 'application/json');
    $('dl-clear').onclick = () => { if (confirm(T('Permanently clear this session from the page’s memory?', 'Effacer définitivement cette session de la mémoire de la page ?'))) start(true); };
  }
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

function saveForm() {
  const prof = getJ('core.commons.v1')?.profile;
  if (!prof) return `<form class="form" id="dl-prof"><p class="fine">${T('The vault belongs to a local pseudonymous identity.', 'Le coffre appartient à une identité pseudonyme locale.')}</p><label>${T('Pseudonym', 'Pseudonyme')} <input id="dl-ps" maxlength="24" required></label><button type="submit">${T('Create my local identity', 'Créer mon identité locale')}</button></form>`;
  if (!VS.unlocked()) return `<form class="form" id="dl-unlock"><label>${T('Vault passphrase (at least 12 characters)', 'Phrase secrète du coffre (12 caractères au moins)')} <input id="dl-pass" type="password" minlength="12" autocomplete="current-password" required></label><button type="submit">${VS.exists() ? T('Open the vault', 'Ouvrir le coffre') : T('Create the vault', 'Créer le coffre')}</button><p class="fine">${T('The vault locks itself after 10 min of inactivity.', 'Le coffre se verrouille seul après 10 min d’inactivité.')}</p></form>`;
  return `<form class="form" id="dl-save"><label class="inline"><input type="checkbox" id="dl-consent"> ${R.ideaId ? T('I save a new version of this idea and the session to my encrypted vault (nothing is transmitted).', 'J’enregistre une nouvelle version de cette idée et la session dans mon coffre chiffré (rien n’est transmis).') : T('I save this idea and the session to my encrypted vault (nothing is transmitted).', 'J’enregistre cette idée et la session dans mon coffre chiffré (rien n’est transmis).')}</label>
    <button type="submit" class="primary">${R.ideaId ? T('Save the version', 'Enregistrer la version') : T('Save the idea', 'Enregistrer l’idée')}</button></form>
    ${R.ideaId ? `<p><a href="commons.html#labs?idea=${encodeURIComponent(R.ideaId)}">${T('Analyse in CORE Labs →', 'Analyser dans CORE Labs →')}</a></p>` : ''}`;
}
function wireSave() {
  $('dl-prof')?.addEventListener('submit', e => { e.preventDefault(); try { const c = getJ('core.commons.v1') || {}; c.profile = I.createProfile({ pseudonym: $('dl-ps').value }); putJ('core.commons.v1', c); renderSide(); } catch (err) { toast(err.message); } });
  $('dl-unlock')?.addEventListener('submit', async e => { e.preventDefault(); try { await VS.unlock($('dl-pass').value, getJ('core.commons.v1').profile.id); if (R.pending) await loadIdea(R.pending); renderSide(); } catch (err) { toast(err.message); } });
  $('dl-save')?.addEventListener('submit', async e => { e.preventDefault();
    const ctx = { 'consent.vault': $('dl-consent').checked, 'vault.unlocked': VS.unlocked() }, ok = D.toolAllowed('vault.save', ctx);
    if (!ok.ok) return toast(T('Tick the consent box to save (' + ok.reason + ').', 'Cochez le consentement pour enregistrer (' + ok.reason + ').'));
    if (!R.s.draft.proposal.trim()) return toast(T('First describe your idea in the conversation (section “Your idea”).', 'Décrivez d’abord votre idée dans la conversation (rubrique « Votre idée »).'));
    try {
      const vault = VS.vault(), owner = getJ('core.commons.v1').profile.id;
      let idea = vault.ideas.find(i => i.id === R.ideaId) || V.newIdea({ id: `idea-${Date.now().toString(36)}`, owner });
      idea = await V.addVersion(idea, D.toIdea(R.s));
      idea = { ...idea, dialogueDraft: R.s.draft, dialogueSessions: [...(idea.dialogueSessions || []), { id: R.s.id, at: new Date().toISOString(), turns: R.s.turns, evidence: R.s.evidence }].slice(-5) };
      await VS.save({ ...vault, ideas: [...vault.ideas.filter(i => i.id !== idea.id), idea] });
      const first = !R.ideaId; R.ideaId = idea.id;
      J.mark(first ? 'vault' : 'revision', { problemId: R.problem?.id, ideaId: idea.id, idea: { versions: idea.versions.length } });
      toast(T(`Version ${idea.versions.length} saved and encrypted (fingerprint ${idea.versions.at(-1).hash.slice(0, 12)}…).`, `Version ${idea.versions.length} enregistrée et chiffrée (empreinte ${idea.versions.at(-1).hash.slice(0, 12)}…).`)); renderSide();
    } catch (err) { toast(err.message); } });
}

async function loadIdea(id) {
  const idea = VS.vault().ideas.find(i => i.id === id); if (!idea) return toast(T('Idea not found in your vault.', 'Idée introuvable dans votre coffre.'));
  R.ideaId = id; R.pending = null;
  if (idea.dialogueDraft) { R.s.draft = { ...R.s.draft, ...idea.dialogueDraft }; }
  else { const v = idea.versions.at(-1); R.s.draft.proposal = v.solution.split('\n')[0]; R.s.draft.problem = v.problem.split('\n')[0]; }
  R.s.phase = D.missing(R.s)[0]?.id || 'review';
  R.s.turns.push({ role: 'agent', kind: 'reasoning', text: T(`We resume your idea (version ${idea.versions.length}). A Labs analysis may have flagged gaps: see the current section or choose one on the right.`, `Nous reprenons votre idée (version ${idea.versions.length}). Une analyse Labs a pu signaler des manques : voyez la rubrique en cours ou choisissez-en une à droite.`), at: new Date().toISOString() });
  renderAll();
}

// Suggestions: questions go to Knowledge (sent); idea starters only fill the composer (the person writes the idea).
const STARTERS = () => T({ proposal: ['First check the current width, then…'], mechanism: ['This would help because…'], assumptions: ['I assume that… ; I also assume that…'], constraints: ['Cost: … ; permits: … ; time: …'], alternatives: ['Do nothing ; …'], risks: ['Could hinder… ; to watch: …'], tests: ['Measure … before and after, for … months'], pathway: ['Citizen initiative', 'Research project'] }, { proposal: ['Vérifier d’abord la largeur actuelle, puis…'], mechanism: ['Cela aiderait parce que…'], assumptions: ['Je suppose que… ; je suppose aussi que…'], constraints: ['Coût : … ; autorisations : … ; délai : …'], alternatives: ['Ne rien faire ; …'], risks: ['Pourrait gêner… ; à surveiller : …'], tests: ['Mesurer … avant et après, pendant … mois'], pathway: ['Initiative citoyenne', 'Projet de recherche'] });
function chips() {
  const qs = T(['What do we know about this sidewalk?', 'What evidence for this sidewalk?', 'Which agent analyses this sidewalk?'], ['Que sait-on de ce trottoir ?', 'Quelles preuves pour ce trottoir ?', 'Quel agent analyse ce trottoir ?']);
  $('dl-chips').innerHTML = qs.map(q => `<button type="button" data-q="${esc(q)}">${icon('search', 14)} ${esc(q)}</button>`).join('') + (STARTERS()[R.s?.phase] || []).map(x => `<button type="button" class="fill" data-fill="${esc(x)}">${icon('bulb', 14)} ${esc(x)}</button>`).join('');
  $('dl-chips').querySelectorAll('[data-q]').forEach(b => b.onclick = () => send(b.dataset.q));
  $('dl-chips').querySelectorAll('[data-fill]').forEach(b => b.onclick = () => { $('dl-input').value = b.dataset.fill; $('dl-input').focus(); });
}
function renderProvider() {
  const P = O.PROVIDERS[R.provider];
  $('dl-provider-btn').innerHTML = `${icon('cpu', 15)} ${esc(R.provider === 'ollama' ? `${T('Local model', 'Modèle local')} · ${R.model || '?'}` : T('Deterministic', 'Déterministe'))}`;
  $('dl-provider').innerHTML = `<p class="fine" style="margin:0">${T('Who words the factual answers? The facts always come from CORE Knowledge; a model can only reword them, and every rewording is checked (numbers, dates, legal status, certainty, citations) before it is shown.', 'Qui formule les réponses factuelles ? Les faits viennent toujours de CORE Knowledge ; un modèle ne peut que les reformuler, et chaque reformulation est vérifiée (chiffres, dates, statut juridique, certitude, citations) avant d’être affichée.')}</p>
    <label><input type="radio" name="dl-prov" value="deterministic" ${R.provider === 'deterministic' ? 'checked' : ''}><b>${esc(O.PROVIDERS.deterministic.label)}</b><span class="fine">${esc(O.PROVIDERS.deterministic.kind)} ${T('Default.', 'Par défaut.')}</span></label>
    <label><input type="radio" name="dl-prov" value="ollama" ${R.provider === 'ollama' ? 'checked' : ''} ${R.local.ok && R.local.models.length ? '' : 'disabled'}><b>${esc(O.PROVIDERS.ollama.label)}</b><span class="fine">${R.local.ok ? T(`Detected on this computer (${esc(R.local.models.join(', ') || 'no model')}). Your questions go to this local process, never to the Internet; your private notes are never sent to it.`, `Détecté sur cet ordinateur (${esc(R.local.models.join(', ') || 'aucun modèle')}). Vos questions vont à ce processus local, jamais sur Internet ; vos notes privées ne lui sont jamais envoyées.`) : (R.probed ? T('Not detected (Ollama must run on this computer, 127.0.0.1:11434).', 'Non détecté (Ollama doit tourner sur cet ordinateur, 127.0.0.1:11434).') : T('Looking for the local model…', 'Recherche du modèle local…'))} ${T('Experimental: slower, and its discarded drafts stay visible.', 'Expérimental : plus lent, et ses brouillons écartés restent visibles.')}</span></label>
    ${R.local.models.length > 1 ? `<label class="fine">${T('Model', 'Modèle')} <select id="dl-model">${R.local.models.map(m => `<option ${m === R.model ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>` : ''}
    <label><input type="radio" disabled><b>${esc(O.PROVIDERS.remote.label)}</b><span class="fine">${esc(O.PROVIDERS.remote.kind)}</span></label>`;
  $('dl-provider').querySelectorAll('input[name=dl-prov]').forEach(i => i.onchange = () => { R.provider = i.value; R.model = R.provider === 'ollama' ? (R.model && R.local.models.includes(R.model) ? R.model : R.local.models[0]) : null; putJ(PKEY, { provider: R.provider, model: R.model }); renderProvider(); });
  $('dl-model')?.addEventListener('change', e => { R.model = e.target.value; putJ(PKEY, { provider: R.provider, model: R.model }); renderProvider(); });
  void P;
}
function setMode(m) { R.mode = m; $('dl-main').dataset.mode = m; document.querySelectorAll('.dl-mode [data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === m))); R.side = 'idea'; renderSide(); }
function renderAll() { renderConvo(); renderSide(); chips(); }
async function send(text) {
  if (!text.trim()) return;
  if (R.busy) return;
  const answerer = R.provider === 'ollama' && R.model ? async q => {
    R.busy = true; R.draft = ''; renderConvo();
    try { return await O.answer(q, { ix: R.ix, problem: R.problem, provider: 'ollama', model: R.model, onToken: (t, all) => { R.draft = all; renderConvo(); } }); }
    finally { R.busy = false; R.draft = ''; }
  } : null;
  $('dl-input').value = '';
  R.s = await D.turn(R.s, text, { ix: R.ix, problem: R.problem, history: R.times, answerer }); R.times.push(Date.now());
  if (!J.read().steps.dialogue) J.mark('dialogue', { problemId: R.problem?.id });
  $('dl-input').value = ''; renderAll(); $('dl-input').focus();
}

function start(fresh = false) {
  R.s = D.newSession({ id: `s-${Date.now().toString(36)}`, problem: R.problem }); if (fresh) R.ideaId = null;
  $('dl-title').textContent = R.problem ? `${ptext(R.problem.title)}` : T('Dialogue room', 'Salle de dialogue');
  $('dl-engine').textContent = `${R.agent ? `${R.agent.code} · ${T(R.agent.en?.role || R.agent.role, R.agent.role)}` : T('CORE agent', 'Agent CORE')} · ${T('not human · validates nothing', 'non humain · ne valide rien')}`;
  chips();
  renderAll();
}

async function boot() {
  // V7.2: a mission link opens the team research mode (src/dialogue/team.mjs); the single-agent room is unchanged.
  if (hash().mission) return (await import('./team.mjs')).boot(hash());
  NAV.render($('core-nav'), { active: 'dialogue' });
  try { R.ix = await loadIndex(); } catch (e) { $('dl-convo').innerHTML = `<li class="turn system">${T('CORE Knowledge unavailable', 'CORE Knowledge indisponible')} (${esc(e.message)}). ${T('The dialogue does not answer without its sources.', 'Le dialogue ne répond pas sans ses sources.')}</li>`; return; }
  const h = hash(), pid = h.problem || J.read().problemId || DEFAULT_PROBLEM;
  R.problem = R.ix.problems.find(p => p.id === pid) || R.ix.problems.find(p => p.id === DEFAULT_PROBLEM);
  R.agent = pickAgent(R.problem); scene(); start();
  if (h.idea) { if (VS.unlocked()) await loadIdea(h.idea); else { R.pending = h.idea; R.ideaId = h.idea; R.side = 'idea'; renderSide(); toast(T('Open your vault (on the right) to resume this idea.', 'Ouvrez votre coffre (à droite) pour reprendre cette idée.')); } }
  $('dl-form').onsubmit = e => { e.preventDefault(); send($('dl-input').value); };
  $('dl-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send($('dl-input').value); } });
  document.querySelectorAll('[data-side]').forEach(b => b.onclick = () => { R.side = b.dataset.side; renderSide(); });
  document.querySelectorAll('.dl-mode [data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  // The local model is looked for only when the person opens this panel or has chosen it before: no background probing.
  const probe = () => O.ollamaAvailable().then(r => { R.local = r; R.probed = true; if (R.provider === 'ollama' && !(r.ok && r.models.includes(R.model))) { R.provider = 'deterministic'; R.model = null; } renderProvider(); });
  $('dl-provider-btn').onclick = () => { const p = $('dl-provider'); p.hidden = !p.hidden; $('dl-provider-btn').setAttribute('aria-expanded', String(!p.hidden)); if (!p.hidden && !R.probed) probe(); };
  renderProvider();
  if (R.provider === 'ollama') probe();
  if (h.mode === 'studio') setMode('studio');
  if (h.mode === 'understand') send(T('What do we know about this sidewalk?', 'Que sait-on de ce trottoir ?'));
  if (h.mode === 'propose') { R.s = D.goTo(R.s, 'proposal'); renderAll(); $('dl-input').focus(); }
  VS.onChange(open => { if (!open) toast(T('Vault locked.', 'Coffre verrouillé.')); renderSide(); });
  onLang(() => { $('dl-title').textContent = R.problem ? ptext(R.problem.title) : T('Dialogue room', 'Salle de dialogue'); renderAll(); renderProvider(); });
  globalThis.CORE_DIALOGUE = { state: R, send };
}
boot();
