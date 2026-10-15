// Commons UI — Expert Network and Communities (V6). Every person shown is fictional and labelled. Review requests are
// stored inside the encrypted vault; community drafts, reports and blocks are local (core.network.v1) and never published.
import * as N from './network.mjs';
import * as L from './labs.mjs';
import * as VS from './vault-session.mjs';
import * as J from '../shell/journey.mjs';
import { loadIndex } from '../kb/browser.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'core.network.v1';
const loadN = () => { try { return { drafts: [], mod: {}, blocked: [], joined: [], ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return { drafts: [], mod: {}, blocked: [], joined: [] }; } };
const saveN = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
const banner = `<p class="fict">${esc(N.FICTION)}</p>`;

export async function renderExperts(B, S, { toast, go }) {
  const unlocked = VS.unlocked(), ideas = unlocked ? VS.vault().ideas : [], idea = ideas.find(i => i.id === (S.route?.idea || S.sel)) || null;
  const matches = idea ? N.match(`${idea.versions.at(-1).title} ${idea.versions.at(-1).problem} ${idea.versions.at(-1).solution}`, { domain: idea.category === 'accessibilité' ? 'accessibility' : null }) : [];
  B.innerHTML = `${banner}<div class="card"><h2>Réseau d’experts — annuaire de démonstration</h2>
    <table class="tbl"><thead><tr><th>Personne</th><th>Domaine</th><th>Sujets</th><th>Vérification</th><th>Conflits déclarés</th></tr></thead><tbody>${N.EXPERTS.map(x => `<tr><td>${esc(x.name)}<br><span class="fine">${esc(x.affiliation)} · ${x.languages.join(', ')}</span></td><td>${esc(x.field)}</td><td>${esc(x.tags.join(', '))}</td><td><span class="badge synthetic">SYNTHÉTIQUE — non vérifié</span></td><td>${x.coi.length ? esc(x.coi.join(', ')) : 'aucun'}</td></tr>`).join('')}</tbody></table>
    <p class="fine">Un avis d’expert, même réel, n’est jamais une vérité scientifique : il entre dans le dossier comme un avis, avec ses conflits d’intérêts.</p></div>
    ${!unlocked ? `<div class="card"><h2>Préparer une demande de revue</h2><form class="form" id="xp-unlock"><label>Phrase secrète du coffre <input id="xp-pass" type="password" minlength="12" required></label><button type="submit">Ouvrir le coffre</button></form><p class="fine">Les demandes sont conservées dans votre coffre chiffré, car elles peuvent contenir le texte de votre idée.</p></div>`
      : !ideas.length ? '<div class="card"><p>Aucune idée dans votre coffre. Commencez dans <a href="dialogue.html">Dialogue</a>.</p></div>'
      : `<div class="card"><h2>Préparer une demande de revue</h2><label>Idée <select id="xp-idea">${ideas.map(i => `<option value="${esc(i.id)}" ${i === idea ? 'selected' : ''}>${esc(i.versions.at(-1).title)} (v${i.versions.length})</option>`).join('')}</select></label>
        ${idea ? `<p class="fine">Correspondances par sujets : ${matches.map(m => `${esc(m.expert.name)} (${esc(m.why)})`).join(' ; ') || 'aucune'}</p>
        <form class="form" id="xp-req"><label>Expert <select id="xp-who">${N.EXPERTS.map(x => `<option value="${x.id}" ${matches[0]?.expert.id === x.id ? 'selected' : ''}>${esc(x.name)} — ${esc(x.field)}</option>`).join('')}</select></label>
          <fieldset class="custom"><legend>Ce que je partage</legend>${Object.entries(N.SHARE).map(([k, v], n) => `<label class="inline"><input type="radio" name="xp-share" value="${k}" ${n === 0 ? 'checked' : ''}> ${esc(v)}</label>`).join('')}
          <label>Version <select id="xp-v">${idea.versions.map(v => `<option ${v.n === idea.versions.length ? 'selected' : ''}>${v.n}</option>`).join('')}</select></label></fieldset>
          <label>Message <textarea id="xp-msg" maxlength="500">Pouvez-vous relire cette proposition et me dire ce qui manque ?</textarea></label>
          <label>Mes propres conflits d’intérêts (facultatif) <input id="xp-coi" maxlength="300"></label>
          <label class="inline"><input type="checkbox" id="xp-ok"> Je confirme partager uniquement ce qui est choisi ci-dessus, avec une personne fictive (rien n’est envoyé).</label>
          <button type="submit" class="primary">Préparer la demande</button></form>` : ''}</div>
      ${idea?.reviewRequests?.length ? idea.reviewRequests.map(r => `<div class="card"><h3>Demande à ${esc(r.expert)} · version ${r.version} · ${esc(N.SHARE[r.share])}</h3><p class="fine">État : ${esc(r.state)} · ${esc(r.at.slice(0, 16).replace('T', ' '))} UTC${r.coi ? ` · ${esc(r.coi.note)}` : ''}</p>
        ${r.response ? `<p class="fict">${esc(r.response.label)}</p><p style="white-space:pre-line">${esc(r.response.text)}</p>` : `<button type="button" data-ask="${esc(r.id)}">Obtenir l’avis fictif (démonstration)</button>`}
        ${r.response && !r.authorDecision ? `<form class="form inline" data-dec="${esc(r.id)}"><label>Ma décision <select>${Object.entries(N.DECISIONS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label><input maxlength="500" placeholder="motif (requis si désaccord)" aria-label="Motif"><button type="submit" class="small">Enregistrer</button></form>` : ''}
        ${r.authorDecision ? `<p>Décision de l’auteur : <b>${esc(r.authorDecision.label)}</b>${r.authorDecision.reason ? ` — ${esc(r.authorDecision.reason)}` : ''} <span class="fine">(${esc(r.authorDecision.scope)})</span></p>` : ''}</div>`).join('') : ''}`}`;
  B.querySelector('#xp-unlock')?.addEventListener('submit', async e => { e.preventDefault(); try { await VS.unlock(B.querySelector('#xp-pass').value, S.profile?.id || 'local'); renderExperts(B, S, { toast, go }); } catch (err) { toast(err.message); } });
  B.querySelector('#xp-idea')?.addEventListener('change', e => go('experts', { idea: e.target.value }));
  const saveIdea = async next => { const v = VS.vault(); await VS.save({ ...v, ideas: v.ideas.map(i => i.id === next.id ? next : i) }); };
  B.querySelector('#xp-req')?.addEventListener('submit', async e => { e.preventDefault();
    const r = N.request(idea, { expertId: B.querySelector('#xp-who').value, share: B.querySelector('input[name=xp-share]:checked').value, version: B.querySelector('#xp-v').value, message: B.querySelector('#xp-msg').value, conflicts: B.querySelector('#xp-coi').value, confirmed: B.querySelector('#xp-ok').checked });
    if (!r.ok) return toast(r.error); await saveIdea(r.value);
    J.mark('review', { ideaId: idea.id, problemId: idea.versions.at(-1).problemId, idea: { versions: idea.versions.length, reviewRequests: r.value.reviewRequests.length } });
    toast('Demande préparée et chiffrée dans votre coffre (aucun envoi).'); renderExperts(B, S, { toast, go }); });
  B.querySelectorAll('[data-ask]').forEach(b => b.onclick = async () => {
    const ix = await loadIndex(), pid = idea.versions.at(-1).problemId, problem = ix.problems.find(p => p.id === pid) || null;
    const sw = problem?.evidence.map(e => ix.records.get(e.ref)).find(r => r?.kind === 'sidewalk') || null;
    const r = N.fictionalResponse(idea, b.dataset.ask, { missing: L.dossier(idea, { problem, sidewalk: sw }).missingEvidence }); if (!r.ok) return toast(r.error);
    await saveIdea(r.value); renderExperts(B, S, { toast, go }); });
  B.querySelectorAll('[data-dec]').forEach(f => f.onsubmit = async e => { e.preventDefault();
    const r = N.decide(idea, f.dataset.dec, { decision: f.querySelector('select').value, reason: f.querySelector('input').value, actor: idea.owner }); if (!r.ok) return toast(r.error);
    await saveIdea(r.value); renderExperts(B, S, { toast, go }); });
}

export function renderCommunities(B, S, { toast, go }) {
  const st = loadN(), c = N.COMMUNITIES.find(x => x.id === S.route?.c);
  if (!c) {
    B.innerHTML = `${banner}<div class="card"><h2>Communautés</h2><ul>${N.COMMUNITIES.map(x => `<li><a href="#communities?c=${x.id}">${esc(x.name)}</a> <span class="badge info">${esc(x.kind)}</span> <span class="fine">${x.members.length} membre(s) fictif(s) · ${x.threads.length} fil(s) · adultes uniquement</span></li>`).join('')}</ul>
      <p class="fine">Aucune publication, aucune messagerie privée, aucune localisation de personnes. Les communautés réelles exigent comptes, anti-Sybil et modération humaine (CORE TRUST).</p></div>`;
    return;
  }
  if (c.problemId) J.mark('community', { problemId: c.problemId });
  const who = id => c.members.find(m => m[0] === id)?.[1] || id, mod = id => st.mod[id];
  B.innerHTML = `${banner}<div class="card"><p><a href="#communities">← Communautés</a></p><h2>${esc(c.name)}</h2><p><span class="badge info">${esc(c.kind)}</span> adultes uniquement${c.problemId ? ` · problème lié : <a href="#knowledge?view=explore&n=${encodeURIComponent('problem:' + c.problemId)}">${esc(c.problemId)}</a> · <a href="world.html#problem=${encodeURIComponent(c.problemId)}">voir dans World</a>` : ''}</p>
    <h3>Règles</h3><ol>${c.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
    <h3>Membres (fictifs)</h3><ul>${c.members.map(([id, n, role]) => `<li>${esc(n)} — ${esc(role)} ${st.blocked.includes(id) ? '<span class="badge approx">bloqué (localement)</span>' : `<button type="button" class="ghost small" data-block="${id}">Bloquer</button>`}</li>`).join('')}</ul>
    <label class="inline"><input type="checkbox" id="cm-join" ${st.joined.includes(c.id) ? 'checked' : ''}> Suivre cette communauté (local ; aucune inscription réelle)</label></div>
    ${c.threads.map(t => `<div class="card"><h3>${esc(t.title)}</h3>${t.posts.filter(p => !st.blocked.includes(p.by)).map(p => { const m = mod(p.id); return `<div class="contrib"><b>${esc(who(p.by))}</b> <span class="badge synthetic">FICTIF</span>${m ? ` <span class="badge approx">${esc(N.MOD[m.state])}</span>` : ''}
      <p>${m?.state === 'removed' ? '<i>Message retiré par la modération (simulée) — règle : ' + esc(m.rule) + '</i>' : esc(p.text)}</p>${p.evidence.length ? `<p class="fine">Preuves : ${p.evidence.map(e => `<a href="#knowledge?view=explore&n=${encodeURIComponent('record:' + e)}">${esc(e)}</a>`).join(', ')}</p>` : ''}
      ${!m ? `<form class="form inline" data-report="${p.id}"><input maxlength="200" placeholder="motif du signalement" aria-label="Motif du signalement"><button type="submit" class="small ghost">Signaler</button></form>` : ''}
      ${m?.state === 'reported' ? `<form class="form inline" data-mod="${p.id}"><label>Modération simulée : règle <select>${c.rules.map(r => `<option>${esc(r)}</option>`).join('')}</select></label><button type="submit" name="kept" class="small">Maintenir</button><button type="submit" name="removed" class="small">Retirer</button></form>` : ''}
      ${['removed', 'kept'].includes(m?.state) ? `<form class="form inline" data-appeal="${p.id}"><input maxlength="300" placeholder="motif de contestation" aria-label="Motif de contestation"><button type="submit" class="small ghost">Contester</button></form>` : ''}
      ${m?.state === 'appealed' ? '<p class="fine">Contestation enregistrée : elle attend une personne réelle (inexistante dans ce prototype).</p>' : ''}</div>`; }).join('')}
      <form class="form" data-draft="${t.id}"><label>Écrire un brouillon (local, non publié) <textarea maxlength="1000"></textarea></label><button type="submit" class="small">Garder le brouillon</button></form>
      ${st.drafts.filter(d => d.community === c.id && d.thread === t.id).map(d => `<div class="contrib"><span class="badge info">${esc(d.label)}</span><p>${esc(d.text)}</p><button type="button" class="ghost small" data-deldraft="${esc(d.id)}">Supprimer</button></div>`).join('')}</div>`).join('')}`;
  const save = () => { saveN(st); renderCommunities(B, S, { toast, go }); };
  B.querySelector('#cm-join').onchange = e => { st.joined = e.target.checked ? [...new Set([...st.joined, c.id])] : st.joined.filter(x => x !== c.id); save(); };
  B.querySelectorAll('[data-block]').forEach(b => b.onclick = () => { st.blocked = [...new Set([...st.blocked, b.dataset.block])]; save(); });
  const post = id => c.threads.flatMap(t => t.posts).find(p => p.id === id);
  B.querySelectorAll('[data-report]').forEach(f => f.onsubmit = e => { e.preventDefault(); const r = N.report(post(f.dataset.report), { reason: f.querySelector('input').value }); if (!r.ok) return toast(r.error); st.mod[f.dataset.report] = r.value.mod; save(); });
  B.querySelectorAll('[data-mod]').forEach(f => f.onsubmit = e => { e.preventDefault(); const r = N.moderate({ ...post(f.dataset.mod), mod: st.mod[f.dataset.mod] }, { rule: f.querySelector('select').value, outcome: e.submitter?.name }); if (!r.ok) return toast(r.error); st.mod[f.dataset.mod] = r.value.mod; save(); });
  B.querySelectorAll('[data-appeal]').forEach(f => f.onsubmit = e => { e.preventDefault(); const r = N.appeal({ mod: st.mod[f.dataset.appeal] }, { reason: f.querySelector('input').value }); if (!r.ok) return toast(r.error); st.mod[f.dataset.appeal] = r.value.mod; save(); });
  B.querySelectorAll('[data-draft]').forEach(f => f.onsubmit = e => { e.preventDefault(); const r = N.draftPost(c.id, { thread: f.dataset.draft, text: f.querySelector('textarea').value }); if (!r.ok) return toast(r.error); st.drafts.push(r.value); save(); if (r.value.notes.length) toast(r.value.notes.join(' ')); });
  B.querySelectorAll('[data-deldraft]').forEach(b => b.onclick = () => { st.drafts = st.drafts.filter(d => d.id !== b.dataset.deldraft); save(); });
}
