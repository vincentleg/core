// Same engine as the local CLI. Public inputs only; no innerHTML, model calls or visitor storage.
(async function () {
  'use strict';
  const R = globalThis.CORE_RESEARCH, $ = id => document.getElementById(id), status = $('status'), result = $('result');
  let inputs, saved, current, busy = false;
  const node = (tag, text, parent, className) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; if (parent) parent.append(e); return e; };
  const section = title => { const s = node('section', undefined, result); node('h2', title, s); return s; };
  const number = n => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
  const fetchText = async file => { const r = await fetch(file, { cache: 'no-store', credentials: 'omit' }); if (!r.ok) throw Error('Source locale indisponible'); const t = await r.text(); if (t.length > 300000) throw Error('Source trop volumineuse'); return t; };
  function table(parent, caption, headings, rows) {
    const wrap = node('div', undefined, parent, 'scroll'), t = node('table', undefined, wrap); node('caption', caption, t);
    const head = node('tr', undefined, node('thead', undefined, t)); headings.forEach(h => { const th = node('th', h, head); th.scope = 'col'; });
    const body = node('tbody', undefined, t); for (const row of rows) { const tr = node('tr', undefined, body); row.forEach((x, i) => { const td = node(i ? 'td' : 'th', String(x), tr); if (!i) td.scope = 'row'; }); }
  }
  function render(b, mode) {
    current = b; result.replaceChildren(); result.hidden = false;
    const traffic = b.question.domain === 'synthetic-traffic', q = section(b.title);
    node('p', mode + ' · ' + b.runtime + ' · facteur hypothétique ' + b.question.parameters.factor, q);
    b.hypotheses.forEach(h => node('p', h, q));
    table(q, b.units, traffic ? ['Scénario', 'Somme des files', 'File terminale', 'File maximale'] : ['Scénario', 'Énergie (EJ)', 'Puissance moyenne (TW)', 'Indice K'], b.options.map(o => traffic ? [o.label, number(o.sum), number(o.terminal), number(o.peak)] : [o.label, number(o.energyEJ), number(o.averageWatts / 1e12), number(o.index)]));
    const sensitivity = section('Sensibilité et robustesse');
    table(sensitivity, 'Facteurs de stress arbitraires, pas intervalles de confiance', ['Facteur', 'Baseline', 'Alternative A', 'Alternative B'], b.sensitivity.map(s => [s.factor, ...s.options.map(o => number(traffic ? o.sum : o.averageWatts / 1e12))]));
    const debate = section('Conseil scientifique · politiques déterministes');
    for (const e of b.discussion) { const article = node('article', undefined, debate, e.kind === 'dissent' ? 'dissent' : ''); node('h3', e.id + ' / ' + e.kind, article); node('p', e.agent, article); node('p', e.claim, article); node('p', 'Références : ' + e.evidence.join(', ') + (e.respondsTo ? ' · Répond à ' + e.respondsTo : ''), article); }
    const sources = section('Preuves et provenance');
    b.sources.forEach(s => { const d = node('details', undefined, sources); node('summary', s.id + ' · ' + s.kind, d); const a = node('a', s.url, d); a.href = s.url; a.rel = 'noopener noreferrer'; node('p', s.rights, d); node('p', s.locator || s.warning, d); node('p', 'Revue : ' + (s.checkedOn || 'fixture inventée, aucune date d’observation réelle'), d); node('code', s.sha256 + ' · ' + s.hashScope, d); });
    const gate = section('Gate · revue uniquement, mise en œuvre bloquée');
    b.limitations.forEach(l => node('p', l, gate)); node('p', 'Calibration : non. Revue indépendante : non. Autorisation réelle : non.', gate); node('code', b.fingerprint, gate);
    const button = node('button', 'Exporter ce dossier JSON', gate); button.type = 'button'; button.onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' })), a = node('a'); a.href = url; a.download = 'core-research.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    if (traffic && b.fingerprint !== saved.traffic.fingerprint) node('p', 'Exploration distincte du résultat enregistré lié à la contribution. Son historique reste inchangé.', gate);
  }
  try {
    const [countsRaw, catalogRaw, registryRaw, demoRaw] = await Promise.all(['test/fixtures/pilot-synthetic.json', 'data/research/civilization.json', 'data/agents/registry.json', 'data/research/phase13-demo.json'].map(fetchText));
    inputs = { countsRaw, catalogRaw, registry: JSON.parse(registryRaw) }; saved = JSON.parse(demoRaw);
    for (const b of [saved.traffic, saved.energy]) if ((await R.verify(inputs, b.question, b)).state === 'BLOCKED') throw Error('Dossier enregistré non reproductible');
    const c = saved.contribution;
    if (saved.beforeConsent !== null || c.research?.fingerprint !== saved.traffic.fingerprint || c.research.questionId !== saved.traffic.question.id || c.realWorldStatus !== 'NOT_AUTHORIZED' || c.measuredImpact !== null || c.authorizesRealWorld !== false) throw Error('Lien contribution ou statut invalide');
    const panel = $('contribution'); panel.replaceChildren(); node('p', c.author + ' · identité fictive · ' + c.state, panel); node('p', c.observation.statement, panel); node('p', c.proposal, panel); node('p', 'Lieu public : ' + c.location.neighborhood + ' uniquement. Point précis et contexte privé absents.', panel); node('p', 'Résultat lié : ' + c.research.questionId + ' · recherche synthétique, pas adoption ni impact.', panel); node('code', c.research.fingerprint, panel);
    const list = node('ol', undefined, panel); c.history.forEach(e => node('li', e.to + (e.research ? ' · résultat scientifique lié' : '') + ' · révision ' + e.revision, list));
    render(saved.traffic, 'Enregistrement vérifié par recalcul'); status.textContent = 'Enregistrement vérifié · aucune inférence IA en direct.';
    $('controls').onsubmit = async e => {
      e.preventDefault(); if (busy) return; busy = true; $('run').disabled = true;
      try {
        const domain = $('domain').value, original = domain === 'synthetic-traffic' ? saved.traffic.question : saved.energy.question, q = { ...original, parameters: { factor: Number($('factor').value) } };
        const b = await R.run(inputs, q); if ((await R.verify(inputs, q, b)).state === 'BLOCKED') throw Error('Calcul non reproductible');
        render(b, 'Calcul exécuté dans ce navigateur'); status.textContent = 'Calcul local vérifié · mise en œuvre bloquée.';
      } catch { result.hidden = true; status.textContent = 'BLOCKED : calcul ou preuve invalide. Aucune recommandation.'; }
      finally { busy = false; $('run').disabled = false; }
    };
  } catch { result.hidden = true; $('run').disabled = true; status.textContent = 'BLOCKED : sources, résultat ou provenance invalides. Aucune recommandation.'; }
})();
