import {navigationIntent,featureType} from '../intelligence/core/lexicon.mjs';
import {normal} from '../intelligence/core/catalog.mjs';
import {speechReview} from '../ui/speech-review.mjs';
// CORE Companion (text). Loaded only when the person opens it (Command button or Cmd/Ctrl-K).
//  • Text always works. Navigation commands run real application actions; research questions are answered from the
//    missions' recorded findings (cited by id), with an offer — never automatic — to ask the full research team, which
//    uses the local model on this computer when one runs.
//  • Text answers only: never speech synthesis. Optional voice INPUT uses consented native recognition (src/ui/dictation.mjs),
//    starts only on an explicit press, and routes the transcript through the same read-only pipeline as typed input.
import * as A from './actions.mjs';
import { startDictation, dictationMessage } from '../ui/dictation.mjs';
import { t, T, L, lang, setLang } from '../i18n/i18n.mjs';
import { isCrisis, crisisMessage } from '../intelligence/core/safety.mjs';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let dlg = null, agentsCache = null, missionsCache = null;

// Context: the live World runtime when present, otherwise the published registry and missions (fetched once, on demand).
async function context(need = {}) {
  const E = globalThis.CORE_EARTH, R = E?.civ?.();
  if (R) return { agents: R.agents, missions: [...R.M.values()], agentMission: id => R.activity(id).mission, world: E };
  if (need.agents && !agentsCache) { try { agentsCache = (await (await fetch('data/agents/sf-civilization.json')).json()).agents || []; } catch { agentsCache = []; } }
  if (need.missions && !missionsCache) { try { const [{ FILES }, { buildMissions }] = await Promise.all([import('../civilization/analyses.mjs'), import('../civilization/missions.mjs')]); const D = {}; await Promise.all(Object.entries(FILES).map(async ([k, u]) => { D[k] = await (await fetch(u)).json(); })); missionsCache = buildMissions(D, { agents: agentsCache || (await (await fetch('data/agents/sf-civilization.json')).json()).agents }); } catch { missionsCache = null; } }
  return { agents: agentsCache || [], missions: missionsCache || A.MISSION_INDEX, world: null };
}
const needs = text => ({ agents: /core[- ][a-z]{2,4}[- ]\d|agent|follow|suis|ask|demande|find|trouve|cherche|where|ou est/i.test(text), missions: /\?|missing|manque|lacune|why|how|what|pourquoi|comment|quel|evidence|preuve/i.test(text) });

const REASON = { 'language-not-available': ['That language is not available yet: CORE offers English, French, Spanish, German, Simplified Chinese and Portuguese.', 'Cette langue n’est pas encore disponible : CORE propose l’anglais, le français, l’espagnol, l’allemand, le chinois simplifié et le portugais.'], 'unknown-agent': ['I could not find that agent. Try its code, e.g. CORE-MOB-001.', 'Je n’ai pas trouvé cet agent. Essayez son code, ex. CORE-MOB-001.'], 'unknown-mission': ['Which mission? Mobility, housing, energy, road safety, urban forest…', 'Quelle mission ? Mobilité, logement, énergie, sécurité routière, forêt urbaine…'] };
export async function run(text) {
  if (isCrisis(text)) return { ok: true, msg: crisisMessage(lang()), html: '' };
  if (navigationIntent(text) || featureType(normal(text))) {
    if (globalThis.CORE_INTELLIGENCE) { const result = await CORE_INTELLIGENCE.submit(text); return { ok: !!CORE_INTELLIGENCE.lastResult?.navigated, msg: CORE_INTELLIGENCE.lastResult?.text || '' }; }
    try { sessionStorage.setItem('core.navigation.pending', String(text).slice(0,300)); return { ok: true, msg: T('Opening Earth to resolve your request…', 'Ouverture de la Terre pour rechercher votre destination…'), href: 'world.html' }; }
    catch { return { ok: false, msg: T('Open Explorer and enter your destination there.', 'Ouvrez Explorer et saisissez votre destination.') }; }
  }
  const ctx = await context(needs(text)), cmd = A.parse(text, ctx);
  if (!cmd.name) return { ok: false, msg: REASON[cmd.reason] ? T(...REASON[cmd.reason]) : t('cmp.not_understood') };
  const p = A.plan(cmd, ctx); if (!p.ok) return { ok: false, msg: t('cmp.invalid', { reason: p.errors.join(', ') }) };
  const out = { ok: true, cmd, msg: p.say, html: '' };
  if (p.confirm) return { ...out, confirm: p.href };
  if (p.setLang) { await setLang(p.setLang); return { ...out, msg: A.plan(cmd, ctx).say }; }
  if (p.prefill) try { sessionStorage.setItem('core.dialogue.prefill', p.prefill); } catch {}
  // Grounded content shown in the companion itself.
  const missions = ctx.missions.filter(m => m.findings);
  if (p.answer === 'question') {
    const hits = A.answer(cmd.params.question, missions, lang()), mid = hits[0]?.mission || A.suggestMission(cmd.params.question, missions) || 'mission.sf.mobility';
    out.html = hits.length ? `<ul class="cmp-ans">${hits.map(h => `<li>${esc(h.text)} <span class="fine">[${esc(h.id)} · ${esc(h.status)}]</span></li>`).join('')}</ul>` : `<p>${T('No recorded finding answers this. CORE does not answer without evidence.', 'Aucun constat enregistré n’y répond. CORE ne répond pas sans preuve.')}</p>`;
    out.html += `<p class="fine">${T('These are recorded findings, retrieved by matching words, not a reasoned answer.', 'Ce sont des constats enregistrés, retrouvés par correspondance de mots, pas une réponse raisonnée.')}</p><button type="button" class="small" data-cmp-team="${esc(mid)}">${T('Ask the research team (local model, about a minute)', 'Demander à l’équipe de recherche (modèle local, environ une minute)')}</button>`;
    out.team = { mission: mid, question: cmd.params.question };
  }
  if (p.answer === 'gaps') { const m = missions.find(x => x.id === cmd.params.mission); out.html = m ? `<ul class="cmp-ans">${m.findings.filter(f => f.status === 'gap').map(f => `<li>${esc(L(f.claim))}</li>`).join('') || `<li>${T('No declared gap.', 'Aucune lacune déclarée.')}</li>`}</ul>` : ''; }
  if (p.answer === 'missions') out.html = `<ul class="cmp-ans">${missions.map(m => `<li><b>${esc(L(m.title))}</b>: <span class="fine">${m.findings.filter(f => f.status !== 'gap').length} ${T('findings', 'constats')}, ${m.findings.filter(f => f.status === 'gap').length} ${T('gaps', 'lacunes')}</span></li>`).join('')}</ul>`;
  const W = ctx.world, fn = p.call && W?.[p.call[0]];
  if (fn) { await fn(...p.call.slice(1)); return out; }
  return { ...out, href: p.href || null };
}

let stopDictation = null, review = null;

function render() {
  review?.dispose();
  stopDictation?.(); stopDictation = null;
  const ex = [T('Show me the San Francisco mobility mission', 'Montre-moi la mission mobilité de San Francisco'), T('What are the agents investigating?', 'Sur quoi travaillent les agents ?'), T('Explain the difference between the real world and CORE World', 'Explique la différence entre le monde réel et le Monde CORE'), T('Show the simulation', 'Montre la simulation'), T('Compare the scenarios', 'Compare les scénarios'), T('What evidence is missing?', 'Quelles preuves manquent ?'), T('How can I contribute?', 'Comment puis-je contribuer ?'), T('Open my saved ideas', 'Ouvre mes idées sauvegardées'), T('Start the guided demo', 'Lance la démo guidée'), T('Show me the manifesto', 'Montre-moi le manifeste'), T('Why did the bus lane perform badly?', 'Pourquoi la voie bus a-t-elle mal fonctionné ?')];
  dlg.setAttribute('aria-label', t('cmp.title'));
  dlg.innerHTML = `<form method="dialog" class="cmp-head"><h2>${esc(t('cmp.title'))}</h2><button class="ghost small" value="close" aria-label="${esc(t('cmp.close'))}">✕</button></form>
    <p class="fine">${esc(T('Search, ask or go anywhere in CORE. I run actions from a fixed list, answer from recorded evidence, and never share, delete or publish anything for you.', 'Cherchez, demandez ou allez n’importe où dans CORE. J’exécute des actions d’une liste fixe, je réponds à partir des preuves enregistrées, et je ne partage, ne supprime ni ne publie rien à votre place.'))}</p>
    <form class="cmp-row" data-cmp-form><label class="sr-only" for="cmp-in">${esc(t('cmp.title'))}</label><input id="cmp-in" type="text" name="q" maxlength="300" autocomplete="off" placeholder="${esc(t('cmp.placeholder'))}"><button class="primary small" type="submit">${esc(t('cmp.do'))}</button><button type="button" class="small" data-cmp-mic aria-pressed="false">${esc(T('Speak', 'Parler'))}</button></form>
    <p class="cmp-live" data-cmp-live hidden role="status"><i aria-hidden="true"></i><span></span></p>
    <div class="cmp-out" data-cmp-out aria-live="polite"></div>
    <details><summary>${esc(t('cmp.examples'))}</summary><ul class="cmp-ex">${ex.map(x => `<li><button type="button" class="ghost small" data-cmp-ex>${esc(x)}</button></li>`).join('')}</ul></details>`;
  const out = dlg.querySelector('[data-cmp-out]'), input = dlg.querySelector('input[name=q]'), live = dlg.querySelector('[data-cmp-live]');
  const status = (s, cls = '') => { live.hidden = !s; live.className = `cmp-live ${cls}`; live.querySelector('span').textContent = s || ''; };
  const go = async text => {
    status(T('Working…', 'Traitement…'));
    let r; try { r = await run(text); } catch (e) { r = { ok: false, msg: e.message }; }
    status('');
    out.innerHTML = `<p class="${r.ok ? '' : 'cmp-err'}">${esc(r.msg)}</p>${r.html || ''}${r.confirm ? `<p class="fine">${esc(t('cmp.confirm'))}</p><a class="btn small" href="${esc(r.confirm)}">${esc(t('cmp.open'))}</a>` : ''}`;
    out.querySelector('[data-cmp-team]')?.addEventListener('click', () => { const mid = r.team.mission; if (globalThis.CORE_EARTH?.showInvestigate) { dlg.close(); globalThis.CORE_EARTH.revealMap(); globalThis.CORE_EARTH.showInvestigate(mid, r.team.question); } else location.href = `world.html#investigate=${encodeURIComponent(mid)}`; });
    if (r.cmd?.name === 'change_language') render();
    if (r.href) setTimeout(() => { location.href = r.href; }, 700);
  };
  const mic = dlg.querySelector('[data-cmp-mic]');
  review = speechReview(input, dlg.querySelector('[data-cmp-form]'), () => { stopDictation?.(); stopDictation = null; });
  mic.onclick = async () => {
    if (stopDictation) { stopDictation(); stopDictation = null; return; }
    try { stopDictation = startDictation({ code: review.code(), onText: review.receive,
      onState: (st, d) => { const active = st === 'preparing' || st === 'listening'; mic.setAttribute('aria-pressed', String(active)); mic.textContent = active ? T('Stop listening', 'Arrêter l’écoute') : T('Speak', 'Parler'); if (active) status(dictationMessage(st === 'preparing' ? 'preparing' : d)); else { stopDictation = null; if (st === 'error') status(dictationMessage(d), 'err'); else { status(''); input.focus(); } } } }); }
    catch { status(T('Voice input unavailable. Typing still works.', 'Saisie vocale indisponible. L’écrit fonctionne toujours.'), 'err'); stopDictation = null; }
  };
  dlg.querySelector('[data-cmp-form]').onsubmit = e => { e.preventDefault(); const v = input.value.trim(); if (v) go(v); };
  dlg.querySelectorAll('[data-cmp-ex]').forEach(b => b.onclick = () => { input.value = b.textContent; go(b.textContent); });
  setTimeout(() => input.focus(), 30);
}

export function open() {
  if (!dlg) { dlg = document.createElement('dialog'); dlg.className = 'cmp le-glass'; document.body.append(dlg); document.addEventListener('core:lang', () => { if (dlg.open) render(); }); dlg.addEventListener('close', () => { stopDictation?.(); stopDictation = null; }); }
  render(); dlg.showModal?.() ?? dlg.setAttribute('open', '');
}
