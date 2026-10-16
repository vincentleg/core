// CORE V8 — companion dialog (voice or text). Loaded only when the person opens it.
//  • Text always works. Voice is offered ONLY when the browser can recognise speech on the device
//    (SpeechRecognition with processLocally); otherwise the microphone stays off and the reason is shown.
//    The microphone starts only on an explicit press, a visible indicator shows while it listens, and it stops
//    after one phrase. No audio or transcript is stored or sent anywhere.
//  • Spoken answers (off by default) use only voices the device provides locally (voice.localService).
//  • Words become one typed action (actions.mjs); nothing is ever evaluated as code.
import * as A from './actions.mjs';
import { t, lang, setLang, LANGS } from '../i18n/i18n.mjs';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SPEAK_KEY = 'core.companion.speak';
let dlg = null, rec = null, agentsCache = null;

// Context: live World runtime when present, otherwise the published registry (fetched once, on demand).
async function context(needAgents) {
  const E = globalThis.CORE_EARTH, R = E?.civ?.();
  if (R) return { agents: R.agents, missions: [...R.M.values()].map(m => ({ id: m.id, title: m.title })), agentMission: id => R.activity(id).mission, world: E };
  if (needAgents && !agentsCache) { try { const r = await fetch('data/agents/sf-civilization.json'); agentsCache = (await r.json()).agents || []; } catch { agentsCache = []; } }
  return { agents: agentsCache || [], missions: A.MISSION_INDEX, world: null };
}
const needsAgents = text => /core[- ][a-z]{2,4}[- ]\d|agent|follow|suis|ask|demande|find|trouve|cherche|where|ou est/i.test(text);

export async function run(text) {
  const ctx = await context(needsAgents(text)), cmd = A.parse(text, ctx);
  if (!cmd.name) return { ok: false, msg: t('cmp.not_understood') };
  const p = A.plan(cmd, ctx); if (!p.ok) return { ok: false, msg: t('cmp.invalid', { reason: p.errors.join(', ') }) };
  const ag = ctx.agents.find(a => a.id === cmd.params.agent), mi = ctx.missions.find(m => m.id === cmd.params.mission);
  const msg = t(`act.${cmd.name}`, { place: A.PLACES[cmd.params.place]?.label, code: ag?.code, role: ag?.role, title: mi?.title, scenario: cmd.params.scenario === 'S0' ? 'baseline' : cmd.params.scenario, layer: cmd.params.layer, lang: A.LANGS[cmd.params.lang] });
  if (p.confirm) return { ok: true, cmd, msg, confirm: p.href };
  if (cmd.name === 'change_language') { setLang(cmd.params.lang); document.dispatchEvent(new CustomEvent('core:lang', { detail: cmd.params.lang })); return { ok: true, cmd, msg }; }
  if (p.prefill) try { sessionStorage.setItem('core.dialogue.prefill', p.prefill); } catch {}
  const W = ctx.world, fn = p.call && W?.[p.call[0]];
  if (fn) { await fn(...p.call.slice(1)); return { ok: true, cmd, msg }; }
  return { ok: true, cmd, msg, href: p.href };
}

function speak(text) {
  let on = false; try { on = localStorage.getItem(SPEAK_KEY) === '1'; } catch {} if (!on || !globalThis.speechSynthesis) return;
  const code = lang(), v = speechSynthesis.getVoices().filter(x => x.localService && x.lang.toLowerCase().startsWith(code.slice(0, 2)))[0];
  if (!v) return; const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; speechSynthesis.cancel(); speechSynthesis.speak(u);
}

// On-device recognition only. Returns 'available' or a reason string.
export async function voiceSupport(code = lang()) {
  const SR = globalThis.SpeechRecognition; // the prefixed webkitSpeechRecognition sends audio to a server: never used
  if (!SR || !('processLocally' in SR.prototype) || typeof SR.available !== 'function') return 'unsupported';
  try { return await SR.available({ langs: [code === 'zh-Hans' ? 'zh-CN' : code], processLocally: true }); } catch { return 'unsupported'; }
}

function render() {
  const ex = ['cmp.ex1', 'cmp.ex2', 'cmp.ex3', 'cmp.ex4', 'cmp.ex5', 'cmp.ex6'].map(k => t(k));
  let speakOn = false; try { speakOn = localStorage.getItem(SPEAK_KEY) === '1'; } catch {}
  dlg.innerHTML = `<form method="dialog" class="cmp-head"><h2>${esc(t('cmp.title'))}</h2><button class="ghost small" value="close" aria-label="${esc(t('cmp.close'))}">✕</button></form>
    <p class="fine">${esc(t('cmp.intro'))}</p>
    <form class="cmp-row" data-cmp-form><input type="text" name="q" maxlength="300" autocomplete="off" placeholder="${esc(t('cmp.placeholder'))}" aria-label="${esc(t('cmp.title'))}"><button class="primary small" type="submit">${esc(t('cmp.do'))}</button>
      <button type="button" class="small" data-cmp-mic hidden>${esc(t('cmp.mic'))}</button></form>
    <p class="cmp-live" data-cmp-live hidden role="status"><i aria-hidden="true"></i>${esc(t('cmp.listening'))}</p>
    <p class="fine" data-cmp-micnote></p>
    <div class="cmp-out" data-cmp-out aria-live="polite"></div>
    <label class="fine cmp-speak"><input type="checkbox" data-cmp-speak ${speakOn ? 'checked' : ''}> ${esc(t('cmp.speak'))}</label>
    <details><summary>${esc(t('cmp.examples'))}</summary><ul class="cmp-ex">${ex.map(x => `<li><button type="button" class="ghost small" data-cmp-ex>${esc(x)}</button></li>`).join('')}</ul></details>`;
  const out = dlg.querySelector('[data-cmp-out]'), input = dlg.querySelector('input[name=q]');
  const go = async text => {
    const r = await run(text);
    out.innerHTML = `<p class="${r.ok ? '' : 'cmp-err'}">${esc(r.msg)}</p>${r.confirm ? `<p class="fine">${esc(t('cmp.confirm'))}</p><a class="btn small" href="${esc(r.confirm)}">${esc(t('cmp.open'))}</a>` : ''}`;
    speak(r.msg);
    if (r.cmd?.name === 'change_language') render();
    if (r.href) setTimeout(() => { location.href = r.href; }, 700);
  };
  dlg.querySelector('[data-cmp-form]').onsubmit = e => { e.preventDefault(); const v = input.value.trim(); if (v) go(v); };
  dlg.querySelectorAll('[data-cmp-ex]').forEach(b => b.onclick = () => { input.value = b.textContent; go(b.textContent); });
  dlg.querySelector('[data-cmp-speak]').onchange = e => { try { localStorage.setItem(SPEAK_KEY, e.target.checked ? '1' : '0'); } catch {} };
  const mic = dlg.querySelector('[data-cmp-mic]'), note = dlg.querySelector('[data-cmp-micnote]'), live = dlg.querySelector('[data-cmp-live]');
  voiceSupport().then(s => {
    if (s !== 'available') { note.textContent = t('cmp.mic_unavailable'); return; }
    mic.hidden = false; note.textContent = t('cmp.mic_permission');
    mic.onclick = () => {
      if (rec) { rec.abort(); return; }
      const SR = globalThis.SpeechRecognition; rec = new SR(); rec.processLocally = true; rec.lang = lang() === 'zh-Hans' ? 'zh-CN' : lang(); rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
      rec.onresult = e => { const txt = e.results[0][0].transcript; input.value = txt; go(txt); };
      rec.onend = rec.onerror = () => { rec = null; live.hidden = true; mic.textContent = t('cmp.mic'); };
      live.hidden = false; mic.textContent = t('cmp.mic_stop'); rec.start();
    };
  });
  setTimeout(() => input.focus(), 30);
}

export function open() {
  if (!dlg) { dlg = document.createElement('dialog'); dlg.className = 'cmp le-glass'; dlg.setAttribute('aria-label', t('cmp.title')); document.body.append(dlg); dlg.addEventListener('close', () => { rec?.abort(); }); }
  render(); dlg.showModal?.() ?? dlg.setAttribute('open', '');
}
export { LANGS };
