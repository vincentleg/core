// CORE Dialogue room (V6) — UI for src/dialogue/engine.mjs. Private by default: the session lives in memory; it is kept only
// if the user saves it into the encrypted vault. Deep links: dialogue.html#problem=<id> or #idea=<id> (continue an idea).
import * as D from './engine.mjs';
import { loadIndex } from '../kb/browser.mjs';
import { STATUS } from '../kb/knowledge.mjs';
import * as NAV from '../shell/nav.mjs';
import * as J from '../shell/journey.mjs';
import * as VS from '../civic/vault-session.mjs';
import * as V from '../civic/vault.mjs';
import * as I from '../civic/identity.mjs';
import { humanSVG, agentSVG, PRESETS } from '../world/avatars.mjs';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https:\/\//i.test(String(u || '')) ? u : '#');
const getJ = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const putJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const DEFAULT_PROBLEM = 'sidewalk-below-bsp-min:5665000';
const R = { ix: null, problem: null, agent: null, s: null, side: 'idea', times: [], ideaId: null, pending: null };
let toastT; const toast = t => { $('toast').textContent = t; clearTimeout(toastT); toastT = setTimeout(() => { $('toast').textContent = ''; }, 6000); };
const hash = () => Object.fromEntries(new URLSearchParams(location.hash.slice(1)));

function pickAgent(problem) {
  const byDomain = { accessibility: 'public-space', infrastructure: 'civil', nature: 'forestry' }[problem.domain];
  const ids = problem.assignedAgents || [];
  const id = ids.find(x => byDomain && x.includes(`.${byDomain}.`)) || ids[0];
  return R.ix.agents.find(a => a.id === id) || null;
}

function scene() {
  const w = getJ('core.world.v1')?.avatar, p = PRESETS.find(x => x.id === w?.preset) || PRESETS[0];
  const human = { ...p, ...(w?.top ? { top: w.top } : {}), ...(w?.hair ? { hair: w.hair } : {}) };
  $('dl-scene').innerHTML = `<figure>${humanSVG(human, { title: 'Vous' })}<figcaption>${esc(w?.name || p.name)} · humain</figcaption></figure>
    <figure class="agent">${agentSVG({ code: R.agent?.code || 'CORE' })}<figcaption>${esc(R.agent?.code || 'agent CORE')} · agent (non humain)</figcaption></figure>`;
}

const WHO = { user: 'VOUS', reasoning: 'AGENT · RAISONNEMENT GUIDÉ', challenge: 'AGENT · OBJECTION', evidence: 'PREUVE · CORE KNOWLEDGE', system: 'SYSTÈME' };
function renderConvo() {
  $('dl-convo').innerHTML = R.s.turns.map(t => {
    const k = t.role === 'user' ? 'user' : t.kind;
    const cites = t.citations?.length ? `<ul class="cites">${[...new Map(t.citations.map(c => [c.record, c])).values()].map(c => `<li>${esc(c.record)} · ${esc(c.source)} · ${esc(c.integrity)}${c.url ? ` · <a href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener noreferrer">source</a>` : ''}</li>`).join('')}</ul>` : '';
    const st = t.statuses?.length ? `<span class="badge ${t.statuses.includes('observed') ? 'observed' : 'approx'}">${esc([...new Set(t.statuses)].map(x => STATUS[x]?.split(' — ')[0] || x).join(' · '))}</span> ` : '';
    const unc = t.uncertainty?.length ? `<p class="unc"><b>Incertitude :</b> ${t.uncertainty.map(esc).join(' ')}</p>` : '';
    const cav = t.caveat ? `<p class="unc"><b>Affirmation non soutenue :</b> ${esc(t.caveat)}</p>` : '';
    return `<li class="turn ${k}"><span class="who">${WHO[k] || k}</span>${st}${esc(t.text)}${cites}${unc}${cav}</li>`;
  }).join('');
  const el = $('dl-convo'); el.scrollTop = el.scrollHeight;
}

function renderSide() {
  document.querySelectorAll('[data-side]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.side === R.side)));
  const B = $('dl-side'), d = R.s.draft;
  if (R.side === 'idea') {
    const miss = new Set(D.missing(R.s).map(m => m.id));
    B.innerHTML = `<p class="fine">Le brouillon se remplit au fil de la conversation. Cliquez une rubrique pour y revenir.</p>
      <ol class="phases">${D.PHASES.map(([id, label]) => `<li><button type="button" data-phase="${id}" ${R.s.phase === id ? 'aria-current="step"' : ''}><span>${esc(label)}</span><span class="${miss.has(id) ? 'no' : 'ok'}">${miss.has(id) ? 'à faire' : '✓'}</span></button></li>`).join('')}</ol>
      <details open><summary>Aperçu de l’idée</summary><dl class="kv">${[['Problème', d.problem], ['Idée', d.proposal], ['Mécanisme', d.mechanism], ['Hypothèses', d.assumptions.join(' ; ')], ['Tests', d.tests.join(' ; ')], ['Suite', d.pathway]].map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || '—')}</dd>`).join('')}</dl></details>
      <div class="card"><h3>Enregistrer dans mon coffre chiffré</h3>${saveForm()}</div>`;
    B.querySelectorAll('[data-phase]').forEach(b => b.onclick = () => { R.s = D.goTo(R.s, b.dataset.phase); renderAll(); $('dl-input').focus(); });
    wireSave();
  } else if (R.side === 'evidence') {
    B.innerHTML = R.s.evidence.length ? `<p class="fine">Enregistrements cités pendant cette session (registres publics vérifiés par empreinte).</p><ul>${R.s.evidence.map(e => `<li><code>${esc(e.record)}</code> · ${esc(e.source)} · ${esc(e.integrity)}${e.url ? ` · <a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener noreferrer">source</a>` : ''}</li>`).join('')}</ul>
      <p><a href="commons.html#knowledge?q=${encodeURIComponent(R.problem?.id || '')}">Explorer dans CORE Knowledge →</a></p>` : '<p class="fine">Aucune preuve citée pour l’instant. Posez une question finissant par « ? » : la réponse vient de CORE Knowledge, avec ses sources.</p>';
  } else {
    B.innerHTML = `<p class="fine">Moteur : ${esc(D.ENGINE.id)} ${esc(D.ENGINE.version)}. ${esc(D.ENGINE.kind)}. Ce n’est pas un modèle de langage général ; il ne valide rien.</p>
      <p class="fine"><b>Confidentialité.</b> Cette session est en mémoire seulement. Elle n’est conservée que si vous l’enregistrez dans votre coffre chiffré ; rien n’est transmis.</p>
      <div class="row2"><button type="button" id="dl-md">Exporter (Markdown)</button><button type="button" id="dl-json">Exporter (JSON)</button></div>
      <button type="button" class="ghost small" id="dl-clear">Effacer cette session</button>
      <p><a href="world.html">← Retour à CORE World</a></p>`;
    $('dl-md').onclick = () => download(`core-dialogue-${R.s.id}.md`, D.exportMarkdown(R.s), 'text/markdown');
    $('dl-json').onclick = () => download(`core-dialogue-${R.s.id}.json`, JSON.stringify(R.s, null, 1), 'application/json');
    $('dl-clear').onclick = () => { if (confirm('Effacer définitivement cette session de la mémoire de la page ?')) start(true); };
  }
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

function saveForm() {
  const prof = getJ('core.commons.v1')?.profile;
  if (!prof) return `<form class="form" id="dl-prof"><p class="fine">Le coffre appartient à une identité pseudonyme locale.</p><label>Pseudonyme <input id="dl-ps" maxlength="24" required></label><button type="submit">Créer mon identité locale</button></form>`;
  if (!VS.unlocked()) return `<form class="form" id="dl-unlock"><label>Phrase secrète du coffre (12 caractères au moins) <input id="dl-pass" type="password" minlength="12" autocomplete="current-password" required></label><button type="submit">${VS.exists() ? 'Ouvrir le coffre' : 'Créer le coffre'}</button><p class="fine">Le coffre se verrouille seul après 10 min d’inactivité.</p></form>`;
  return `<form class="form" id="dl-save"><label class="inline"><input type="checkbox" id="dl-consent"> J’enregistre ${R.ideaId ? 'une nouvelle version de cette idée' : 'cette idée'} et la session dans mon coffre chiffré (rien n’est transmis).</label>
    <button type="submit" class="primary">${R.ideaId ? 'Enregistrer la version' : 'Enregistrer l’idée'}</button></form>
    ${R.ideaId ? `<p><a href="commons.html#labs?idea=${encodeURIComponent(R.ideaId)}">Analyser dans CORE Labs →</a></p>` : ''}`;
}
function wireSave() {
  $('dl-prof')?.addEventListener('submit', e => { e.preventDefault(); try { const c = getJ('core.commons.v1') || {}; c.profile = I.createProfile({ pseudonym: $('dl-ps').value }); putJ('core.commons.v1', c); renderSide(); } catch (err) { toast(err.message); } });
  $('dl-unlock')?.addEventListener('submit', async e => { e.preventDefault(); try { await VS.unlock($('dl-pass').value, getJ('core.commons.v1').profile.id); if (R.pending) await loadIdea(R.pending); renderSide(); } catch (err) { toast(err.message); } });
  $('dl-save')?.addEventListener('submit', async e => { e.preventDefault();
    const ctx = { 'consent.vault': $('dl-consent').checked, 'vault.unlocked': VS.unlocked() }, ok = D.toolAllowed('vault.save', ctx);
    if (!ok.ok) return toast('Cochez le consentement pour enregistrer (' + ok.reason + ').');
    if (!R.s.draft.proposal.trim()) return toast('Décrivez d’abord votre idée dans la conversation (rubrique « Votre idée »).');
    try {
      const vault = VS.vault(), owner = getJ('core.commons.v1').profile.id;
      let idea = vault.ideas.find(i => i.id === R.ideaId) || V.newIdea({ id: `idea-${Date.now().toString(36)}`, owner });
      idea = await V.addVersion(idea, D.toIdea(R.s));
      idea = { ...idea, dialogueDraft: R.s.draft, dialogueSessions: [...(idea.dialogueSessions || []), { id: R.s.id, at: new Date().toISOString(), turns: R.s.turns, evidence: R.s.evidence }].slice(-5) };
      await VS.save({ ...vault, ideas: [...vault.ideas.filter(i => i.id !== idea.id), idea] });
      const first = !R.ideaId; R.ideaId = idea.id;
      J.mark(first ? 'vault' : 'revision', { problemId: R.problem?.id, ideaId: idea.id, idea: { versions: idea.versions.length } });
      toast(`Version ${idea.versions.length} enregistrée et chiffrée (empreinte ${idea.versions.at(-1).hash.slice(0, 12)}…).`); renderSide();
    } catch (err) { toast(err.message); } });
}

async function loadIdea(id) {
  const idea = VS.vault().ideas.find(i => i.id === id); if (!idea) return toast('Idée introuvable dans votre coffre.');
  R.ideaId = id; R.pending = null;
  if (idea.dialogueDraft) { R.s.draft = { ...R.s.draft, ...idea.dialogueDraft }; }
  else { const v = idea.versions.at(-1); R.s.draft.proposal = v.solution.split('\n')[0]; R.s.draft.problem = v.problem.split('\n')[0]; }
  R.s.phase = D.missing(R.s)[0]?.id || 'review';
  R.s.turns.push({ role: 'agent', kind: 'reasoning', text: `Nous reprenons votre idée (version ${idea.versions.length}). Une analyse Labs a pu signaler des manques : voyez la rubrique en cours ou choisissez-en une à droite.`, at: new Date().toISOString() });
  renderAll();
}

function renderAll() { renderConvo(); renderSide(); }
async function send(text) {
  if (!text.trim()) return;
  R.s = await D.turn(R.s, text, { ix: R.ix, problem: R.problem, history: R.times }); R.times.push(Date.now());
  if (!J.read().steps.dialogue) J.mark('dialogue', { problemId: R.problem?.id });
  $('dl-input').value = ''; renderAll(); $('dl-input').focus();
}

function start(fresh = false) {
  R.s = D.newSession({ id: `s-${Date.now().toString(36)}`, problem: R.problem }); if (fresh) R.ideaId = null;
  $('dl-title').textContent = R.problem ? `${R.problem.title}` : 'Salle de dialogue';
  $('dl-engine').textContent = `${R.agent ? `${R.agent.code} — ${R.agent.role}. ` : ''}Raisonnement guidé par règles + preuves de CORE Knowledge : pas un modèle de langage, aucune validation.`;
  $('dl-chips').innerHTML = ['Que sait-on de ce trottoir ?', 'Quelles preuves pour ce trottoir ?', 'Quel agent analyse ce trottoir ?'].map(q => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('');
  $('dl-chips').querySelectorAll('[data-q]').forEach(b => b.onclick = () => send(b.dataset.q));
  renderAll();
}

async function boot() {
  NAV.render($('core-nav'), { active: 'dialogue' });
  try { R.ix = await loadIndex(); } catch (e) { $('dl-convo').innerHTML = `<li class="turn system">CORE Knowledge indisponible (${esc(e.message)}). Le dialogue ne répond pas sans ses sources.</li>`; return; }
  const h = hash(), pid = h.problem || J.read().problemId || DEFAULT_PROBLEM;
  R.problem = R.ix.problems.find(p => p.id === pid) || R.ix.problems.find(p => p.id === DEFAULT_PROBLEM);
  R.agent = pickAgent(R.problem); scene(); start();
  if (h.idea) { if (VS.unlocked()) await loadIdea(h.idea); else { R.pending = h.idea; R.ideaId = h.idea; R.side = 'idea'; renderSide(); toast('Ouvrez votre coffre (à droite) pour reprendre cette idée.'); } }
  $('dl-form').onsubmit = e => { e.preventDefault(); send($('dl-input').value); };
  $('dl-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send($('dl-input').value); } });
  document.querySelectorAll('[data-side]').forEach(b => b.onclick = () => { R.side = b.dataset.side; renderSide(); });
  VS.onChange(open => { if (!open) toast('Coffre verrouillé.'); renderSide(); });
  globalThis.CORE_DIALOGUE = { state: R, send };
}
boot();
