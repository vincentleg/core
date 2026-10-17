// CORE Companion (voice or text). Loaded only when the person opens it (Command button or Cmd/Ctrl-K).
//  • Text always works. Navigation commands run real application actions; research questions are answered from the
//    missions' recorded findings (cited by id), with an offer — never automatic — to ask the full research team, which
//    uses the local model on this computer when one runs.
//  • Voice input is offered ONLY when the browser can recognise speech on the device (SpeechRecognition with
//    processLocally). The microphone starts only on an explicit press; listening / processing / error states are shown;
//    the transcript is placed in the box for the person to edit, and runs only when they press Go. Nothing is recorded.
//  • Answers are written only: the companion never speaks (no speech synthesis).
import * as A from './actions.mjs';
import { t, T, L, lang, setLang } from '../i18n/i18n.mjs';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let dlg = null, rec = null, agentsCache = null, missionsCache = null;

// Context: the live World runtime when present, otherwise the published registry and missions (fetched once, on demand).
async function context(need = {}) {
  const E = globalThis.CORE_EARTH, R = E?.civ?.();
  if (R) return { agents: R.agents, missions: [...R.M.values()], agentMission: id => R.activity(id).mission, world: E };
  if (need.agents && !agentsCache) { try { agentsCache = (await (await fetch('data/agents/sf-civilization.json')).json()).agents || []; } catch { agentsCache = []; } }
  if (need.missions && !missionsCache) { try { const [{ FILES }, { buildMissions }] = await Promise.all([import('../civilization/analyses.mjs'), import('../civilization/missions.mjs')]); const D = {}; await Promise.all(Object.entries(FILES).map(async ([k, u]) => { D[k] = await (await fetch(u)).json(); })); missionsCache = buildMissions(D, { agents: agentsCache || (await (await fetch('data/agents/sf-civilization.json')).json()).agents }); } catch { missionsCache = null; } }
  return { agents: agentsCache || [], missions: missionsCache || A.MISSION_INDEX, world: null };
}
const needs = text => ({ agents: /core[- ][a-z]{2,4}[- ]\d|agent|follow|suis|ask|demande|find|trouve|cherche|where|ou est/i.test(text), missions: /\?|missing|manque|lacune|why|how|what|pourquoi|comment|quel|evidence|preuve/i.test(text) });

const REASON = { 'language-not-available': ['That language is not available yet: CORE currently offers English and French only.', 'Cette langue n’est pas encore disponible : CORE propose pour l’instant l’anglais et le français.'], 'unknown-agent': ['I could not find that agent. Try its code, e.g. CORE-MOB-001.', 'Je n’ai pas trouvé cet agent. Essayez son code, ex. CORE-MOB-001.'], 'unknown-mission': ['Which mission? Mobility, housing, energy, road safety, urban forest…', 'Quelle mission ? Mobilité, logement, énergie, sécurité routière, forêt urbaine…'] };
export async function run(text) {
  const ctx = await context(needs(text)), cmd = A.parse(text, ctx);
  if (!cmd.name) return { ok: false, msg: REASON[cmd.reason] ? T(...REASON[cmd.reason]) : t('cmp.not_understood') };
  const p = A.plan(cmd, ctx); if (!p.ok) return { ok: false, msg: t('cmp.invalid', { reason: p.errors.join(', ') }) };
  const out = { ok: true, cmd, msg: p.say, html: '' };
  if (p.confirm) return { ...out, confirm: p.href };
  if (p.setLang) { setLang(p.setLang); return { ...out, msg: A.plan(cmd, ctx).say }; }
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

// On-device recognition only. Returns 'available' or a reason string.
export async function voiceSupport(code = lang()) {
  const SR = globalThis.SpeechRecognition; // the prefixed webkitSpeechRecognition sends audio to a server: never used
  if (!SR || !('processLocally' in SR.prototype) || typeof SR.available !== 'function') return 'unsupported';
  try { return await SR.available({ langs: [code === 'fr' ? 'fr-FR' : 'en-US'], processLocally: true }); } catch { return 'unsupported'; }
}

function render() {
  const ex = [T('Show me the San Francisco mobility mission', 'Montre-moi la mission mobilité de San Francisco'), T('What are the agents investigating?', 'Sur quoi travaillent les agents ?'), T('Explain the difference between the real world and CORE World', 'Explique la différence entre le monde réel et le Monde CORE'), T('Show the simulation', 'Montre la simulation'), T('Compare the scenarios', 'Compare les scénarios'), T('What evidence is missing?', 'Quelles preuves manquent ?'), T('How can I contribute?', 'Comment puis-je contribuer ?'), T('Open my saved ideas', 'Ouvre mes idées sauvegardées'), T('Start the guided demo', 'Lance la démo guidée'), T('Show me the manifesto', 'Montre-moi le manifeste'), T('Why did the bus lane perform badly?', 'Pourquoi la voie bus a-t-elle mal fonctionné ?')];
  dlg.setAttribute('aria-label', t('cmp.title'));
  dlg.innerHTML = `<form method="dialog" class="cmp-head"><h2>${esc(t('cmp.title'))}</h2><button class="ghost small" value="close" aria-label="${esc(t('cmp.close'))}">✕</button></form>
    <p class="fine">${esc(T('Search, ask or go anywhere in CORE. I run actions from a fixed list, answer from recorded evidence, and never share, delete or publish anything for you.', 'Cherchez, demandez ou allez n’importe où dans CORE. J’exécute des actions d’une liste fixe, je réponds à partir des preuves enregistrées, et je ne partage, ne supprime ni ne publie rien à votre place.'))}</p>
    <form class="cmp-row" data-cmp-form><label class="sr-only" for="cmp-in">${esc(t('cmp.title'))}</label><input id="cmp-in" type="text" name="q" maxlength="300" autocomplete="off" placeholder="${esc(t('cmp.placeholder'))}"><button class="primary small" type="submit">${esc(t('cmp.do'))}</button>
      <button type="button" class="small" data-cmp-mic hidden>${esc(t('cmp.mic'))}</button></form>
    <p class="cmp-live" data-cmp-live hidden role="status"><i aria-hidden="true"></i><span></span></p>
    <p class="fine" data-cmp-micnote></p>
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
  dlg.querySelector('[data-cmp-form]').onsubmit = e => { e.preventDefault(); const v = input.value.trim(); if (v) go(v); };
  dlg.querySelectorAll('[data-cmp-ex]').forEach(b => b.onclick = () => { input.value = b.textContent; go(b.textContent); });
  const mic = dlg.querySelector('[data-cmp-mic]'), note = dlg.querySelector('[data-cmp-micnote]');
  voiceSupport().then(s => {
    if (s !== 'available') { note.textContent = t('cmp.mic_unavailable'); return; }
    mic.hidden = false; note.textContent = t('cmp.mic_permission');
    mic.onclick = () => {
      if (rec) { rec.abort(); return; }
      const SR = globalThis.SpeechRecognition; rec = new SR(); rec.processLocally = true; rec.lang = lang() === 'fr' ? 'fr-FR' : 'en-US'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      rec.onresult = e => { const r0 = e.results[e.results.length - 1]; input.value = r0[0].transcript; if (r0.isFinal) status(T('Processing… edit the text if needed, then press Go.', 'Traitement… modifiez le texte si besoin, puis appuyez sur Aller.')); };
      rec.onerror = e => { status(T(`Microphone error: ${e.error}. Typing still works.`, `Erreur du micro : ${e.error}. L’écrit fonctionne toujours.`), 'err'); };
      rec.onend = () => { rec = null; mic.textContent = t('cmp.mic'); if (!live.classList.contains('err')) status(input.value ? T('Edit the text if needed, then press Go.', 'Modifiez le texte si besoin, puis appuyez sur Aller.') : ''); input.focus(); };
      status(t('cmp.listening')); mic.textContent = t('cmp.mic_stop'); rec.start();
    };
  });
  setTimeout(() => input.focus(), 30);
}

export function open() {
  if (!dlg) { dlg = document.createElement('dialog'); dlg.className = 'cmp le-glass'; document.body.append(dlg); dlg.addEventListener('close', () => { rec?.abort(); }); document.addEventListener('core:lang', () => { if (dlg.open) render(); }); }
  render(); dlg.showModal?.() ?? dlg.setAttribute('open', '');
}
