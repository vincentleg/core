// Public static replay + explicit local browser recomputation. Never contacts a model or starts local agents.
(function (G) {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { bundle: null, saved: null, current: null, gate: null, token: 0 };
  const number = x => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(x);
  async function json(url) { const r = await fetch(url); if (!r.ok) throw Error('Source indisponible : ' + url); return r.json(); }
  async function load() {
    if (S.bundle) return;
    const [saved, manifest] = await Promise.all([json('data/science/sf-traffic.json'), json('data/sf9/manifest.json')]);
    const raw = {};
    await Promise.all(['neighborhoods', 'hin', 'crashes-agg', 'permits'].map(async key => { const r = await fetch('data/sf9/' + key + '.json'); if (!r.ok) throw Error('Preuve absente'); raw[key] = await r.text(); }));
    const registry = G.CORE_PLATFORM.state.registry;
    S.saved = saved; S.bundle = { manifest, raw, registry, mission: saved.sourceMission };
  }
  function content(d, gate, mode) {
    const max = Math.max(1, d.result.baseline), agents = G.CORE_PLATFORM.state.registry.agents;
    const agent = id => { const a = agents.find(a => a.id === id); return `<button type="button" class="linkish" data-sc-agent="${esc(id)}">${esc(a ? a.code + ' · ' + a.role : id)}</button>`; };
    return `<section class="science" aria-label="Dossier scientifique"><p><a href="research.html">Laboratoire scientifique : questions, contribution synthétique et calculs interactifs</a></p>
      <header class="sc-hero"><span class="sc-eyebrow">CORE CIVILIZATION / SCIENTIFIC INTELLIGENCE</span><h3>Solve in the virtual world.<br>Improve the real one.</h3><p>Tenderloin · San Francisco · sécurité routière × travaux</p><span class="pill ${gate.state === 'BLOCKED' ? 'fail' : 'warn'}">${esc(gate.state)} · aucune autorisation</span><p class="hint">${esc(mode)} · agents à règles déterministes · 0 appel de modèle. Aucun effet réel démontré. Mise en œuvre BLOQUÉE : faisabilité, validation de terrain et autorisation humaine requises.</p></header>
      <nav class="sc-nav" aria-label="Sections du dossier">${[['problem','Problème'],['debate','Délibération'],['options','Interventions'],['evidence','Preuves'],['protocol','Validation réelle']].map(([id,label]) => `<a href="#sc-${id}">${label}</a>`).join('')}</nav>
      <section id="sc-problem"><h3>01 / Une question mesurable</h3><p>${esc(d.objective)}</p><p class="hint">${esc(d.metric)}</p><div class="sc-stats"><div><b>${number(d.result.baseline)}</b><span>indice de référence</span></div><div><b>${d.result.rows.length}</b><span>tronçons étudiés</span></div><div><b>${d.sensitivity.length}</b><span>combinaisons de sensibilité</span></div></div><p class="hint">Instantané : ${esc(d.snapshot)} ; tous les résultats concernent ces données datées. Ce n’est pas une mesure de congestion actuelle.</p></section>
      <section id="sc-debate"><h3>02 / Proposer. Contester. Réviser.</h3><p class="hint">Politiques de rôles exécutées en code ; ces textes ne sont pas un dialogue LLM. Chaque objection reste dans le dossier.</p><ol class="sc-debate">${d.discussion.map(e => `<li data-debate="${esc(e.kind)}"><div>${agent(e.agent)} <span class="pill ${e.kind === 'dissent' ? 'warn' : 'info'}">${esc(e.kind)}</span></div><p>${esc(e.claim)}</p><small>${esc(e.id)}${e.respondsTo ? ' → ' + esc(e.respondsTo) : ''} · ${e.evidence.length} références vérifiables</small><details><summary>Références de cette contribution</summary><p>${e.evidence.map(r => esc(r.ref)).join(' · ')}</p></details></li>`).join('')}</ol></section>
      <section id="sc-options"><h3>03 / Le laboratoire des hypothèses</h3><p class="hint">Changer les paramètres exécute les calculs bornés dans ce navigateur. Aucun agent distant, aucune modification de l’enregistrement publié.</p><form id="sc-controls" class="sc-controls"><label>Horizon<select name="horizon">${[60,120,180].map(x=>`<option ${x===d.parameters.horizon?'selected':''}>${x}</option>`).join('')}</select>jours</label><label>Tronçons prioritaires<select name="topN">${[3,5,10].map(x=>`<option ${x===d.parameters.topN?'selected':''}>${x}</option>`).join('')}</select></label><label>Mutualisation supposée<select name="coordination">${[0,.25,.5,.75,1].map(x=>`<option value="${x}" ${x===d.parameters.coordination?'selected':''}>${x*100} %</option>`).join('')}</select></label><label>Gravité<select name="weight"><option value="all" ${d.parameters.weight==='all'?'selected':''}>Toutes blessures</option><option value="severe" ${d.parameters.weight==='severe'?'selected':''}>Graves / mortelles</option></select></label><button type="submit" class="small">Recalculer et vérifier</button><button type="button" class="small ghost" id="sc-reset">Enregistrement initial</button></form>
      <p id="sc-status" tabindex="-1" role="status" aria-live="polite">${esc(mode)} — ${esc(gate.state)}.</p>
      <div class="sc-options">${d.result.options.map(o => `<article class="sc-option"><span class="sc-eyebrow">${o.id} / ${o.eligible?'À EXAMINER':'CONTRAINTE NON SATISFAITE'}</span><h4>${esc(o.label)}</h4><b>${number(o.exposure)}</b><span>indice dans l’horizon</span><meter min="0" max="${max}" value="${o.exposure}" aria-label="Indice ${o.id}">${number(o.exposure)}</meter><p>${esc(o.meaning)}</p>${o.displaced?`<p class="sc-dissent">Charge déplacée : ${number(o.displaced)} · total conservé : ${number(o.exposure+o.displaced)}</p>`:''}</article>`).join('')}</div>
      <details><summary>Sensibilité complète : ${d.sensitivity.length} combinaisons</summary><div class="sc-scroll"><table class="tbl"><caption>Indice exploratoire ; aucun gain réel mesuré</caption><thead><tr><th>Horizon</th><th>Gravité</th><th>Mutualisation</th><th>I0</th><th>I2</th><th>I3 déplacé</th></tr></thead><tbody>${d.sensitivity.map(s=>`<tr><td>${s.horizon} j</td><td>${esc(s.weight)}</td><td>${s.coordination*100} %</td><td>${number(s.baseline)}</td><td>${number(s.coordinated)}</td><td>${number(s.displaced)}</td></tr>`).join('')}</tbody></table></div></details></section>
      <section id="sc-evidence"><h3>04 / Preuves, pas promesses</h3><ul>${d.assumptions.map(a=>`<li>${esc(a)}</li>`).join('')}</ul><div class="sc-scroll"><table class="tbl"><thead><tr><th>Source / nature</th><th>Collectée</th><th>Provenance</th></tr></thead><tbody>${d.sources.map(s=>`<tr><td>${esc(s.dataset)}<br><small>${esc(s.kind)}</small></td><td>${esc(s.retrievedAt)}</td><td><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.provider)}</a><details><summary>Empreinte, licence et transformations</summary><code>${esc(s.sha256)}</code><p>${esc(s.licence)} · ${esc(s.modifications)}</p></details></td></tr>`).join('')}</tbody></table></div><details><summary>Calcul par tronçon</summary><div class="sc-scroll"><table class="tbl"><thead><tr><th>CNN / rue</th><th>Taux historique / km / an</th><th>Jours-permis</th><th>Jours uniques</th></tr></thead><tbody>${d.result.rows.map(r=>`<tr><td>${esc(r.cnn)} · ${esc(r.street)}</td><td>${number(r.rate)}</td><td>${r.sumDays}</td><td>${r.unionDays}</td></tr>`).join('')}</tbody></table></div></details><p class="hint">Empreinte reproductible du dossier : <code>${esc(d.fingerprint)}</code>. Les empreintes vérifient l’intégrité, pas la vérité des observations.</p></section>
      <section id="sc-protocol"><h3>05 / Le prochain pas appartient au réel</h3><ol>${d.validation.map(v=>`<li>${esc(v)}</li>`).join('')}</ol><p class="sc-dissent">I3 reste écartée : faisabilité et rattrapage inconnus. I2 reste une hypothèse à examiner par les services. Aucune décision humaine enregistrée dans ce dossier.</p><button type="button" id="sc-export" class="small">Télécharger le dossier JSON</button><p class="hint">Exécution locale reproductible : <code>node scripts/science.mjs --record</code>. Arrêt d’urgence, moteur et mémoire existants ; aucune inférence LLM requise.</p></section></section>`;
  }
  async function render(el, p = null) {
    const token = ++S.token; S.gate = {state:'VERIFYING',authorizes:false}; S.current = null; el.innerHTML = '<p role="status">Vérification des preuves scientifiques…</p>';
    try {
      await load();
      const d = p ? await G.CORE_SCIENCE.run(S.bundle, p) : S.saved.dossier;
      const gate = await G.CORE_SCIENCE.verify(S.bundle, d);
      if (token !== S.token || G.CORE_PLATFORM.state.sec !== 'science') return;
      S.gate = gate; S.current = d;
      if (gate.state === 'BLOCKED') throw Error(gate.issues.join('; '));
      const mode = p ? 'Calcul déterministe exécuté dans ce navigateur' : 'Relecture enregistrée le ' + S.saved.recordedAt;
      el.innerHTML = content(d, gate, mode);
      el.querySelectorAll('[data-sc-agent]').forEach(b=>b.onclick=()=>G.CORE_AGENT_PROFILE.open(b.dataset.scAgent));
      el.querySelector('#sc-controls').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);render(el,{horizon:+f.get('horizon'),topN:+f.get('topN'),coordination:+f.get('coordination'),weight:f.get('weight')});};
      el.querySelector('#sc-reset').onclick=()=>render(el);
      if (p) el.querySelector('#sc-status').focus({preventScroll:true});
      el.querySelector('#sc-export').onclick=()=>{const blob=new Blob([JSON.stringify({mode,gate,dossier:d},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='core-science-tenderloin.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    } catch(e) { if(token===S.token){S.gate={state:'BLOCKED',authorizes:false,issues:[e.message]};el.innerHTML='<section class="science"><h3>Dossier bloqué</h3><p role="alert">'+esc(e.message)+'</p><p>Aucune recommandation ni autorisation. Vérifier les sources avant de réessayer.</p></section>';}}
  }
  G.CORE_SCIENCE_VIEW = { render, state:S };
})(globalThis);
