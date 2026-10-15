// Commons UI — CORE Knowledge (V6): explore a real graph, ask cited questions, contribute candidates, follow the review queue.
// Deep links: commons.html#knowledge?view=explore&n=<node id>, ?view=ask, ?view=contribute, ?view=queue.
import * as K from '../kb/knowledge.mjs';
import * as G from '../kb/graph.mjs';
import * as C from '../kb/contributions.mjs';
import { loadIndex } from '../kb/browser.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https:\/\//i.test(String(u || '')) ? u : '#');
const KEY = 'core.kbcontrib.v1';
const loadC = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const saveC = v => { try { localStorage.setItem(KEY, JSON.stringify(v.slice(-100))); return true; } catch { return false; } };
const BADGE = { observed: 'observed', 'potential-risk': 'approx', hypothesis: 'synthetic', simulated: 'synthetic' };
const EXAMPLES = ['Quels problèmes de trottoir sur Folsom ?', 'Quelles preuves pour le trottoir Folsom 5th Falmouth ?', 'Quel agent analyse le trottoir de Folsom entre la 5th et Falmouth ?', 'Le trottoir de Folsom est-il dangereux ?', 'travaux Howard 8th 9th', 'Combien de problèmes ?', 'Montre mon coffre à idées'];
const VIEWS = [['explore', 'Explorer'], ['ask', 'Questions'], ['contribute', 'Contribuer'], ['queue', 'File de revue']];

export async function renderKnowledge(B, S, { go, toast, profile }) {
  if (!S.kb) { B.innerHTML = '<p class="fine">Vérification des registres publics…</p>'; try { S.kb = await loadIndex(); } catch (e) { B.innerHTML = `<p class="warn">Registres indisponibles (${esc(e.message)}). Aucune réponse n’est donnée sans ses sources.</p>`; return; } }
  const view = S.route?.view || (S.route?.q || S.route?.n ? 'explore' : 'explore'), f = S.kb.files;
  const head = `<div class="card"><h2>CORE Knowledge</h2><p class="fine">Méthode ${esc(K.METHOD.id)} v${esc(K.METHOD.version)}. Sources : ${Object.values(f).map(x => `<code>${esc(x.path)}</code> (${esc(x.integrity === 'verified' ? 'intégrité vérifiée' : 'INTÉGRITÉ ROMPUE')})`).join(', ')}. Aucune donnée privée n’est accessible.</p>
    <div class="chips" role="tablist" aria-label="Vues de Knowledge">${VIEWS.map(([id, l]) => `<button type="button" data-kv="${id}" aria-pressed="${id === view}">${l}</button>`).join('')}</div></div>`;
  let body = '';
  if (view === 'explore') {
    const g = S.kbGraph || (S.kbGraph = G.build(S.kb, { contributions: loadC() }));
    const q = S.route?.q || '', node = S.route?.n ? g.nodes.get(S.route.n) : null;
    const hits = q ? G.search(g, q) : [];
    body = `<div class="card"><form class="form inline" id="kx-f"><label>Rechercher <input id="kx-q" maxlength="120" value="${esc(q)}" placeholder="ex. trottoir folsom, permis howard, CORE-PUB"></label><button type="submit">Chercher</button></form>
      ${q ? `<h3>${hits.length} résultat(s)</h3><ul>${hits.map(h => `<li><a href="#knowledge?view=explore&n=${encodeURIComponent(h.node.id)}">${esc(h.node.label)}</a> <span class="fine">${esc(h.node.type)}${h.node.place ? ` · ${esc(h.node.place)}` : ''} — ${esc(h.why)}</span></li>`).join('') || '<li>aucun enregistrement ; CORE ne couvre que le corridor Folsom / Howard</li>'}</ul>` : '<p class="fine">Le graphe ne contient que des relations enregistrées. Chaque lien indique ce qu’il signifie ; aucun n’est une causalité.</p>'}</div>
      ${node ? nodeCard(g, node) : ''}`;
  } else if (view === 'ask') {
    const a = S.kbAnswer;
    body = `<div class="card"><form class="form" id="kb-f"><label>Votre question <input id="kb-q" maxlength="500" autocomplete="off" value="${esc(a?.question || '')}"></label><button type="submit" class="primary">Demander</button></form>
      <div class="chips">${EXAMPLES.map(q => `<button type="button" data-kq="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>${a ? answerCard(a) : ''}`;
  } else if (view === 'contribute') {
    body = `<div class="card"><h2>Proposer une connaissance (candidate)</h2><p class="fine">Votre contribution reste dans ce navigateur, en quarantaine. Elle n’entre jamais dans la connaissance vérifiée sans relecture par une personne compétente et identifiée — qui n’existe pas encore dans ce prototype. Les adresses ne sont jamais consultées automatiquement.</p>
      <form class="form" id="kc-f"><label>Type <select id="kc-type">${Object.entries(C.TYPES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <label>Affirmation (20 à 1 000 caractères) <textarea id="kc-claim" maxlength="1000" required></textarea></label>
      <label>Source https (requise pour publication, lien, presse) <input id="kc-url" maxlength="500" inputmode="url"></label>
      <label>Date de publication <input id="kc-date" type="date"></label>
      <label>Problème concerné <select id="kc-pb"><option value="">—</option>${S.kb.problems.filter(p => p.segment).slice(0, 98).map(p => `<option value="${esc(p.id)}" ${S.route?.problem === p.id || S.problemId === p.id ? 'selected' : ''}>${esc(p.title.slice(0, 50))} — ${esc(p.place)}</option>`).join('')}</select></label>
      <label>Preuves (texte libre) <textarea id="kc-ev" maxlength="1000"></textarea></label>
      <div class="inline"><label>Attribution <select id="kc-attr"><option value="pseudonym">pseudonyme</option><option value="anonymous">anonyme</option></select></label><label>Visibilité <select id="kc-vis"><option value="private">privée (moi seul)</option><option value="reviewers">relecteurs futurs</option></select></label></div>
      <button type="submit" class="primary">Soumettre en quarantaine</button></form></div>`;
  } else {
    const list = loadC();
    body = list.length ? list.slice().reverse().map(c => `<div class="card"><p><b>${esc(C.TYPES[c.type])}</b> · <span class="badge approx">${esc(c.class || 'non classée')}</span> · <span class="badge info">${esc(C.STATES[c.state])}</span></p>
      <p>${esc(c.claim)}</p>${c.url ? `<p class="fine">Source déclarée (non consultée) : ${esc(c.url)}</p>` : ''}
      ${c.conflicts.length ? `<div class="warn">${c.conflicts.map(x => `Conflit — ${esc(x.detail)}${x.recorded ? ` Enregistré : ${esc(x.recorded)} ; affirmé : ${esc(x.claimed)}.` : ''}`).join('<br>')}</div>` : ''}
      <details><summary>Historique (${c.history.length})${c.corrections.length ? ` · ${c.corrections.length} correction(s)` : ''}</summary><ol>${c.history.map(h => `<li>${esc(C.STATES[h.to])} — ${esc(h.by)}${h.note ? ` : ${esc(h.note)}` : ''}</li>`).join('')}</ol></details>
      <form class="form inline" data-ann="${esc(c.id)}"><label>Annotation (relecteur SIMULÉ, démonstration) <input maxlength="300"></label><button type="submit" class="small">Annoter</button></form>
      <form class="form inline" data-fix="${esc(c.id)}"><label>Corriger <input maxlength="1000" value="${esc(c.claim)}"></label><button type="submit" class="small">Corriger</button></form>
      <button type="button" class="ghost small" data-del="${esc(c.id)}">Supprimer</button></div>`).join('') : '<div class="card"><p class="fine">Aucune contribution. Utilisez « Contribuer ».</p></div>';
  }
  B.innerHTML = head + body;
  B.querySelectorAll('[data-kv]').forEach(b => b.onclick = () => go('knowledge', { view: b.dataset.kv }));
  B.querySelector('#kx-f')?.addEventListener('submit', e => { e.preventDefault(); go('knowledge', { view: 'explore', q: B.querySelector('#kx-q').value }); });
  const ask = async q => { S.kbAnswer = await K.ask(q, S.kb, { history: S.kbTimes || [] }); (S.kbTimes = S.kbTimes || []).push(Date.now()); renderKnowledge(B, S, { go, toast, profile }); };
  B.querySelector('#kb-f')?.addEventListener('submit', e => { e.preventDefault(); ask(B.querySelector('#kb-q').value); });
  B.querySelectorAll('[data-kq]').forEach(b => b.onclick = () => ask(b.dataset.kq));
  B.querySelector('#kc-f')?.addEventListener('submit', e => { e.preventDefault(); const v = id => B.querySelector(id).value;
    const r = C.submit({ type: v('#kc-type'), claim: v('#kc-claim'), url: v('#kc-url'), publishedOn: v('#kc-date'), problemId: v('#kc-pb') || null, evidence: v('#kc-ev'), attribution: v('#kc-attr'), visibility: v('#kc-vis') }, { id: `kc-${Date.now().toString(36)}`, author: profile?.id || 'local' });
    if (!r.ok) return toast(r.errors.join(' · '));
    saveC([...loadC(), C.process(r.value, S.kb)]); S.kbGraph = null; toast('Contribution en quarantaine, revue humaine requise.'); go('knowledge', { view: 'queue' }); });
  const update = (id, fn) => { const list = loadC(), i = list.findIndex(c => c.id === id), r = fn(list[i]); if (!r.ok) return toast(r.error); list[i] = r.value; saveC(list); S.kbGraph = null; renderKnowledge(B, S, { go, toast, profile }); };
  B.querySelectorAll('[data-ann]').forEach(fm => fm.onsubmit = e => { e.preventDefault(); update(fm.dataset.ann, c => C.review(c, { role: 'simulated-reviewer', decision: 'annotate', reason: fm.querySelector('input').value })); });
  B.querySelectorAll('[data-fix]').forEach(fm => fm.onsubmit = e => { e.preventDefault(); update(fm.dataset.fix, c => { const r = C.correct(c, { claim: fm.querySelector('input').value, actor: c.author }); return r.ok ? { ok: true, value: C.process(r.value, S.kb) } : r; }); });
  B.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { saveC(loadC().filter(c => c.id !== b.dataset.del)); S.kbGraph = null; renderKnowledge(B, S, { go, toast, profile }); });
}

function nodeCard(g, n) {
  const nb = G.neighbours(g, n.id), byType = {};
  for (const x of nb) (byType[x.type] ||= []).push(x);
  const p = n.type === 'problem' ? n.id.slice(8) : null;
  return `<div class="card" id="kx-node"><h2>${esc(n.label)}</h2><p><span class="badge ${BADGE[n.status] || 'info'}">${esc(n.type)}${n.status ? ` · ${esc(K.STATUS[n.status] || n.status)}` : ''}</span>${n.integrity ? ` <span class="fine">intégrité : ${esc(n.integrity)}</span>` : ''}${n.url ? ` · <a href="${esc(safeUrl(n.url))}" target="_blank" rel="noopener noreferrer">source</a>` : ''}</p>
    ${n.place ? `<p>Lieu enregistré : ${esc(n.place)}</p>` : ''}
    ${p ? `<div class="row2"><a class="btn" href="world.html#problem=${encodeURIComponent(p)}">Voir dans CORE World</a><a class="btn" href="dialogue.html#problem=${encodeURIComponent(p)}">Travailler avec un agent</a><a class="btn" href="#knowledge?view=contribute&problem=${encodeURIComponent(p)}">Contribuer</a></div>` : ''}
    ${Object.entries(byType).map(([t, xs]) => `<h3>${esc(t)} <span class="fine">— ${esc(G.EDGES[t])}</span></h3><ul>${xs.slice(0, 25).map(x => `<li>${x.dir === 'in' ? '← ' : '→ '}<a href="#knowledge?view=explore&n=${encodeURIComponent(x.node.id)}">${esc(x.node.label)}</a>${x.node.local ? ' <span class="badge approx">candidate locale</span>' : ''}${x.node.status ? ` <span class="fine">(${esc(x.node.status)})</span>` : ''}</li>`).join('')}${xs.length > 25 ? `<li class="fine">${xs.length - 25} autres…</li>` : ''}</ul>`).join('')}</div>`;
}
function answerCard(a) {
  return `<div class="card" id="kb-answer" aria-live="polite">${a.refusal ? `<p class="warn"><b>${a.kind === 'refusal' ? 'Refus' : 'Affirmation non soutenue'}</b> (${esc(a.refusal.code)}) — ${esc(a.refusal.reason)}</p>` : ''}
    ${a.claims.map(c => `<div class="card"><p><span class="badge ${c.status === 'observed' || c.status === 'dataset-record' ? 'observed' : c.status === 'simulated' || c.status === 'hypothesis' ? 'synthetic' : 'approx'}">${esc(K.STATUS[c.status])}</span></p><p>${esc(c.text)}</p>
      <ul class="hash">${c.citations.map(x => `<li>${esc(x.source)} · ${esc(x.record)}${x.url ? ` · <a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener noreferrer">source</a>` : ''} · SHA-256 ${esc(x.fileSha256.slice(0, 16))}… · ${esc(x.integrity)}</li>`).join('')}</ul></div>`).join('')}
    ${a.more ? `<p class="fine">${a.more} autre(s) enregistrement(s) correspondant(s) non affiché(s) : précisez la question.</p>` : ''}
    ${a.uncertainty.length ? `<h3>Incertitudes et limites</h3><ul>${a.uncertainty.map(u => `<li>${esc(u)}</li>`).join('')}</ul>` : ''}${a.notes?.length ? `<p class="fine">${a.notes.map(esc).join(' ')}</p>` : ''}</div>`;
}
