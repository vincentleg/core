// CORE World V7.2 — civilisation panels (pure HTML builders over the runtime; every value escaped).
import { STAGES, STAGE_FR, MSG_FR } from '../civilization/runtime.mjs';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safe = u => (/^https:\/\//i.test(String(u || '')) ? String(u) : null);
const nm = (R, id) => id === 'human:local' ? 'Une personne (vous)' : R.byId.get(id)?.name || R.byId.get(id)?.role || id || '—';
const short = (R, id) => id === 'human:local' ? 'Vous' : R.byId.get(id)?.code || String(id || '').split('.').pop();
const ago = (R, t) => { const d = Math.max(0, R.S.clock - t); return d < 60 ? `il y a ${Math.round(d)} s` : `il y a ${Math.round(d / 60)} min`; };
const STATE_FR = { reasoning: 'raisonne (modèle local)', working: 'au travail', inspecting: 'vérifie sur place', meeting: 'en réunion', travelling: 'en déplacement', returning: 'regagne son poste', idle: 'inactif' };
const TEAMROLE_FR = { coordinator: 'coordination', researcher: 'recherche', 'data-investigator': 'enquête sur les données', 'scientific-analyst': 'analyse scientifique', 'simulation-engineer': 'simulation', optimization: 'optimisation', 'skeptical-reviewer': 'relecture sceptique', 'source-verifier': 'vérification des sources', 'safety-ethics': 'sécurité et éthique', facilitator: 'facilitation', 'report-author': 'rédaction de rapports', deliberation: 'délibération' };
export const HONESTY = 'Simulation locale déterministe : les agents sont des identités du registre CORE animées par le moteur CORE ; leurs constats sont des calculs codés sur des données publiques datées. Aucun agent n’est un modèle de langage indépendant ; aucune décision réelle n’est prise.';

export function eventLine(R, e) {
  if (e.kind === 'message') return `<li class="cv-ev" data-ev="${e.seq}"><span class="cv-type t-${esc(e.type)}">${esc(MSG_FR[e.type] || e.type)}</span> <b>${esc(short(R, e.from))}</b> → ${esc(short(R, e.to))} <span class="fine">· ${esc(ago(R, e.t))}</span><br><span class="cv-txt">${esc(e.text)}</span></li>`;
  return `<li class="cv-ev sys" data-ev="${e.seq}"><span class="fine">${esc(e.text || e.kind)} · ${esc(ago(R, e.t))}</span></li>`;
}

export function agentHTML(R, id) {
  const a = R.byId.get(id); if (!a) return '<p>Agent inconnu.</p>';
  const act = R.activity(id), mem = R.S.memory[id] || { tasks: 0, messages: 0, reviews: 0, errors: 0, collaborators: [] }, m = act.mission ? R.M.get(act.mission) : null;
  const recent = R.S.events.filter(e => e.from === id || e.to === id || e.agents?.includes(id)).slice(-8).reverse();
  const found = R.S.events.filter(e => e.kind === 'message' && e.from === id).slice(-4).reverse();
  return `<header class="pp-head"><div class="le-row"><span class="le-agent-id">${esc(a.code)}</span><span class="le-badge" data-s="info">${esc(STATE_FR[act.state] || act.state)}</span></div>
    <h2 id="pp-title">${esc(a.role || a.name)}</h2><p class="pp-place">${esc(a.teamName || '')}${a.neighborhood ? ` · secteur ${esc(a.neighborhood)}` : ''} · agent CORE (non humain)</p></header>
    <p class="fine cv-whoami">Je suis ${esc(a.code)}, ${esc((a.role || a.name || '').toLowerCase())}${a.teamRole ? ` (rôle d’équipe : ${esc(TEAMROLE_FR[a.teamRole] || a.teamRole)})` : ''}. Je suis un agent logiciel de CORE, pas une personne.</p>
    <div class="le-evidence"><span class="le-eyebrow">Ce sur quoi je travaille</span><p style="margin:0">${esc(act.label)}</p>${m ? `<p class="fine" style="margin:0">Mission : <a href="#" data-mission="${esc(m.id)}">${esc(m.title)}</a> · étape ${esc(STAGE_FR[act.stage] || act.stage)}</p>` : ''}</div>
    <div class="pp-sec"><h3>Ce que j’ai trouvé ou transmis</h3>${found.length ? `<ul class="cv-feed">${found.map(e => eventLine(R, e)).join('')}</ul>` : '<p class="fine">Rien encore : je n’ai transmis aucun constat ni message.</p>'}</div>
    <nav class="pp-actions" aria-label="Interagir"><a class="btn primary" href="dialogue.html#mission=${encodeURIComponent(m?.id || 'mission.sf.housing-resilience')}&agent=${encodeURIComponent(id)}">Me parler</a>${m?.simulation ? '<button type="button" class="btn" data-sim="S0">Voir la simulation</button>' : ''}<a class="btn" href="#" data-mission="${esc(m?.id || 'mission.sf.housing-resilience')}">Mission</a><a class="btn" href="#" data-follow="${esc(id)}">Suivre</a></nav>
    <details class="pp-adv"><summary>Identité, organisation et mémoire</summary>
    <div class="pp-sec"><h3>Identité et organisation</h3><dl class="kv"><dt>Identifiant</dt><dd><code>${esc(a.id)}</code></dd><dt>Niveau</dt><dd>${esc({ agent: 'agent opérationnel', 'team-lead': 'direction d’équipe', city: 'direction de ville', council: 'conseil', assembly: 'assemblée', global: 'coordination globale' }[a.level] || a.level)}</dd>
      <dt>Supervision</dt><dd>${esc(nm(R, a.supervisor))}</dd><dt>Conseils</dt><dd>${a.councils?.length ? a.councils.map(c => esc(nm(R, c))).join('<br>') : '—'}</dd>
      <dt>Escalade</dt><dd>${a.escalation ? `${esc(nm(R, a.escalation.to))} — ${esc(a.escalation.when)}` : '—'}</dd><dt>Poste</dt><dd>virtuel (aucun bureau réel)</dd>
      <dt>Origine</dt><dd>${a.origin === 'registry-v1' ? 'registre CORE Phase 3 (conservé tel quel)' : 'registre V7.2 (généré)'} · exécution : ${esc({ simulated: 'moteur déterministe CORE', deterministic: 'outils déterministes', llm: 'assisté par modèle (registre Phase 5)', 'coordination-only': 'coordination', unavailable: 'indisponible' }[a.executionMode] || a.executionMode)}</dd></dl></div>
    <div class="pp-sec"><h3>Capacités et accès aux données</h3><p class="fine">${(a.capabilities || []).map(esc).join(' · ') || '—'}</p><p class="fine">Données : ${(a.dataPermissions || []).map(esc).join(', ') || 'aucune (lacune de domaine)'}</p></div>
    <div class="pp-sec"><h3>Mémoire opérationnelle</h3><p class="fine">${mem.tasks} tâche(s) terminée(s) · ${mem.messages} message(s) · ${mem.reviews} revue(s) ou contestation(s) · ${mem.errors} échec(s) · ${mem.collaborators.length} collaborateur(s) récents. La mémoire est un journal d’activité, pas un réentraînement.</p>
      <ul class="cv-feed">${recent.map(e => eventLine(R, e)).join('') || '<li class="fine">Aucune activité enregistrée pour cet agent.</li>'}</ul></div></details>
    <p class="fine">${esc(HONESTY)}</p>`;
}

export function missionHTML(R, mid) {
  const m = R.M.get(mid), ms = R.S.missions[mid]; if (!m) return '<p>Mission inconnue.</p>';
  const reached = new Set(m.plan.filter(t => ['done', 'failed'].includes(ms.tasks[t.id].state)).map(t => t.stage)), used = [...new Set(m.plan.map(t => t.stage)), ...(m.monitor ? ['MONITOR'] : [])];
  const f = id => m.findings.find(x => x.id === id), status = { open: 'en cours', 'awaiting-human': 'dossier prêt — en attente de revue humaine', monitoring: 'constat versé — surveillance', gap: 'lacune déclarée', cancelled: 'annulée' }[ms.status];
  const msgs = R.S.events.filter(e => e.mission === mid && e.kind === 'message').slice(-10).reverse();
  return `<header class="pp-head"><div class="le-row"><span class="le-badge" data-s="${ms.status === 'gap' ? 'simulated' : 'observed'}">${esc(status)}</span>${m.flagship ? '<span class="le-chip">Mission phare</span>' : ''}${m.regression ? '<span class="le-chip">Test de régression</span>' : ''}</div>
    <h2 id="pp-title">${esc(m.title)}</h2><p class="pp-lede">${esc(m.question)}</p><p class="fine">${esc(m.scope)}</p></header>
    ${m.simulation ? `<div class="pp-sec cv-sim"><h3>Simulation enregistrée</h3><p class="fine">${esc(m.simulation)}</p><button type="button" class="primary small" data-sim="S0">Voir la simulation et comparer les scénarios</button></div>` : ''}
    <div class="pp-sec"><h3>Étapes</h3><ol class="cv-stages">${STAGES.filter(s => used.includes(s) || s === 'RECOMMENDATION').map(s => `<li class="${reached.has(s) ? 'done' : ms.stage === s ? 'now' : ''}">${esc(STAGE_FR[s])}${s === 'RECOMMENDATION' ? ' <span class="fine">(jamais sans revue humaine)</span>' : ''}</li>`).join('')}</ol></div>
    <div class="pp-sec"><h3>Ce qui est établi (constats datés)</h3><ul class="cv-findings">${m.findings.filter(x => x.status !== 'gap').map(x => `<li><span class="le-badge" data-s="${x.status === 'observed' ? 'observed' : 'info'}">${x.status === 'observed' ? 'observé' : 'dérivé'}</span> ${esc(x.claim)}<br><span class="fine">${x.source ? `${safe(x.source.page) ? `<a href="${esc(safe(x.source.page))}" target="_blank" rel="noopener noreferrer">${esc(x.source.title)}</a>` : esc(x.source.title)} · récupéré le ${esc(x.source.retrieved)} · ` : ''}${esc(x.period || '')} · limite : ${esc(x.limits)}</span></li>`).join('')}</ul></div>
    ${m.findings.some(x => x.status === 'gap') ? `<div class="pp-unc"><b>Ce qui n’est pas établi</b>${m.findings.filter(x => x.status === 'gap').map(x => `<p>${esc(x.claim)}</p>`).join('')}</div>` : ''}
    ${m.hypotheses.length ? `<div class="pp-sec"><h3>Hypothèses concurrentes (aucune n’est établie)</h3>${m.hypotheses.map(h => `<div class="cv-hyp"><b>${esc(h.id)} — ${esc(h.title)}</b><p>${esc(h.statement)}</p><p class="fine">Appuis : ${h.support.map(s => esc(f(s)?.claim?.slice(0, 70) || s)).join(' · ')}<br>Ce qui manque : ${h.against.map(s => esc(f(s)?.claim?.slice(0, 80) || s)).join(' · ')}<br>Test proposé : ${esc(h.test)}</p></div>`).join('')}</div>` : ''}
    ${m.dissent.length ? `<div class="pp-sec"><h3>Dissidences conservées</h3><ul>${m.dissent.map(d => `<li><b>${esc(R.byId.get(`core.san-francisco.${d.by}.lead`)?.teamName || d.by)}</b> — ${esc(d.text)}</li>`).join('')}</ul></div>` : ''}
    ${(m.audits || []).length ? `<div class="pp-sec"><h3>Vérifications fiche par fiche</h3><ul>${m.audits.map(a => { const st = ms.audits[a.id]; const t = st.lastTallies || st.tallies; return `<li>${esc(a.label)} : ${st.checked} fiche(s) vérifiée(s), ${st.pass} passe(s) complète(s)${Object.keys(t).length ? ` — ${Object.entries(t).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, n]) => `${n} « ${esc(k)} »`).join(', ')}` : ''}</li>`; }).join('')}</ul></div>` : ''}
    ${modelWorkHTML(R, mid)}
    <div class="pp-sec"><h3>Échanges récents entre agents</h3><ul class="cv-feed">${msgs.map(e => eventLine(R, e)).join('') || '<li class="fine">Aucun échange pour l’instant.</li>'}</ul></div>
    <div class="pp-sec"><h3>Contributions humaines</h3>${ms.humanInputs.length ? `<ul>${ms.humanInputs.map(h => `<li>${esc(h.title)} — <span class="fine">${esc(h.state)}</span></li>`).join('')}</ul>` : '<p class="fine">Aucune. Vous pouvez proposer une hypothèse, une preuve ou une contestation : elle reste privée tant que vous ne consentez pas à la partager avec la mission.</p>'}</div>
    <nav class="pp-actions" aria-label="Participer"><a class="btn" href="dialogue.html#mission=${encodeURIComponent(mid)}">Séance d’équipe</a><a class="btn primary" href="dialogue.html#mission=${encodeURIComponent(mid)}&intent=propose">Proposer</a><a class="btn" href="report.html#mission=${encodeURIComponent(mid)}">Rapport</a><a class="btn" href="#" data-follow-mission="${esc(mid)}">Suivre</a></nav>
    <p class="fine">${esc(HONESTY)}</p>`;
}

export function activityHTML(R, ctl) {
  const s = R.summary(), all = R.S.events, msgs = all.filter(e => e.kind === 'message');
  const challenges = msgs.filter(e => e.type === 'challenge').slice(-4).reverse(), artifacts = msgs.filter(e => e.type === 'dossier-update').slice(-4).reverse();
  return `<header class="pp-head"><p class="le-eyebrow">Activité de la civilisation CORE · San Francisco</p><h2 id="pp-title">${s.busy} agents au travail sur ${s.sanFrancisco}</h2>
    <p class="fine">${s.inspecting} vérifient sur place · ${s.meeting} en réunion · ${s.travelling} en déplacement · ${s.idle} inactifs (honnêtement : aucune tâche) · ${s.events} événements journalisés</p>
    <div class="le-row cv-ctl"><button type="button" class="small" data-speed="0">${ctl.paused ? 'Reprendre' : 'Pause'}</button>${[1, 4, 16].map(x => `<button type="button" class="small" data-speed="${x}" aria-pressed="${ctl.speed === x && !ctl.paused}">×${x}</button>`).join('')}<span class="fine">${ctl.writer ? 'moteur actif dans cet onglet' : 'lecture : le moteur tourne dans un autre onglet'} · intégrité du journal ${R.S.integrity === 'ok' && R.verify() ? 'vérifiée' : 'ROMPUE'}</span></div></header>
    <div class="pp-sec"><h3>Intelligence partagée (modèle local)</h3>${reasoningHTML(R, ctl)}</div>
    <div class="pp-sec"><h3>Missions</h3><ul class="cv-missions">${s.missions.map(m => `<li><a href="#" data-mission="${esc(m.id)}">${m.flagship ? '★ ' : ''}${esc(m.title)}</a> <span class="fine">· ${esc(STAGE_FR[m.stage] || m.stage)} · ${esc({ open: 'en cours', 'awaiting-human': 'attend une revue humaine', monitoring: 'surveillance', gap: 'lacune : aucune donnée', cancelled: 'annulée' }[m.status])}</span></li>`).join('')}</ul></div>
    <div class="pp-sec"><h3>Questions ouvertes</h3><ul>${R.missions.flatMap(m => m.hypotheses.map(h => `<li><a href="#" data-mission="${esc(m.id)}">${esc(h.id)} — ${esc(h.title)}</a> <span class="fine">(non établie)</span></li>`)).join('')}</ul></div>
    <div class="pp-sec"><h3>Constats contestés</h3><ul class="cv-feed">${challenges.map(e => eventLine(R, e)).join('') || '<li class="fine">Aucun.</li>'}</ul></div>
    <div class="pp-sec"><h3>En attente d’une personne</h3><ul>${s.missions.filter(m => m.status === 'awaiting-human').map(m => `<li><a href="#" data-mission="${esc(m.id)}">${esc(m.title)}</a> — dossier prêt ; aucun relecteur humain vérifié n’existe encore</li>`).join('') || '<li class="fine">Rien.</li>'}</ul></div>
    <div class="pp-sec"><h3>Artefacts produits</h3><ul class="cv-feed">${artifacts.map(e => eventLine(R, e)).join('') || '<li class="fine">Aucun pour l’instant.</li>'}</ul></div>
    <div class="pp-sec"><h3>Derniers échanges</h3><ul class="cv-feed">${msgs.slice(-12).reverse().map(e => eventLine(R, e)).join('')}</ul></div>
    <div class="pp-sec"><h3>Gouvernance</h3><p><a href="#" data-hierarchy="1">Voir la hiérarchie complète →</a></p><p class="fine">Assemblée mondiale CORE → 7 conseils (géographiques, thématiques, de mission) → Direction San Francisco → 34 équipes → ${s.sanFrancisco - 35} agents. Les conseils organisent la délibération scientifique ; un consensus d’agents n’est jamais un consentement démocratique humain.</p></div>
    <p class="fine">${esc(HONESTY)}</p>`;
}

export function eventHTML(R, seq) {
  const e = R.S.events.find(x => x.seq === Number(seq)); if (!e) return '<p>Événement introuvable (journal tronqué).</p>';
  const m = R.M.get(e.mission), ev = (e.evidence || []).map(id => m?.findings.find(f => f.id === id)).filter(Boolean);
  return `<header class="pp-head"><div class="le-row"><span class="cv-type t-${esc(e.type || e.kind)}">${esc(MSG_FR[e.type] || e.kind)}</span><span class="fine">événement n° ${e.seq} · t = ${esc(e.t)} s · empreinte ${esc(e.h)}</span></div>
    <h2 id="pp-title">${esc(nm(R, e.from))}${e.to ? ` → ${esc(nm(R, e.to))}` : ''}</h2></header><p class="pp-lede">${esc(e.text)}</p>
    ${ev.length ? `<div class="pp-sec"><h3>Preuves citées</h3><ul>${ev.map(x => `<li>${esc(x.claim)}<br><span class="fine">${x.source ? esc(x.source.title) + ' · ' + esc(x.source.retrieved) : 'lacune'} · ${esc(x.limits)}</span></li>`).join('')}</ul></div>` : ''}
    <dl class="kv"><dt>Mission</dt><dd>${m ? `<a href="#" data-mission="${esc(m.id)}">${esc(m.title)}</a>` : '—'}</dd><dt>Tâche</dt><dd>${esc(e.task || '—')} · ${esc(STAGE_FR[e.stage] || e.stage || '')}</dd><dt>Agents</dt><dd>${(e.agents || []).map(a => `<a href="#" data-agent="${esc(a)}">${esc(short(R, a))}</a>`).join(', ') || '—'}</dd></dl>
    <p class="fine">Message produit par le moteur déterministe à partir des enregistrements cités ; ce n’est pas une conversation libre entre modèles.</p>`;
}

export function hierarchyHTML(R) {
  const by = l => R.agents.filter(a => a.level === l), G = by('global')[0], ASM = by('assembly')[0], city = by('city')[0], leads = by('team-lead');
  const size = t => R.agents.filter(a => a.team === t).length, busy = t => R.agents.filter(a => a.team === t && R.S.busy[a.id]).length;
  const link = a => `<a href="#" data-agent="${esc(a.id)}">${esc(a.name || a.role)}</a>`;
  return `<header class="pp-head"><p class="le-eyebrow">Hiérarchie de la civilisation CORE</p><h2 id="pp-title">${R.agents.length} agents enregistrés · ${R.agents.filter(a => a.city === 'san-francisco').length} à San Francisco</h2>
    <p class="fine">Coordination et délibération, jamais autorité : aucun niveau ne peut approuver une conclusion scientifique, autoriser une action réelle ou décider à la place des humains.</p></header>
    <ol class="cv-tree"><li><b>Niveau 1</b> — ${link(G)} <span class="fine">(coordination globale)</span></li>
      <li><b>Niveau 2</b> — ${link(ASM)}<ul>${by('council').map(c => `<li>${link(c)} <span class="fine">· ${esc({ geographic: 'géographique', thematic: 'thématique', mission: 'de mission' }[c.kind] || c.kind)} · ${c.members.length} membre(s)${c.status === 'partial' ? ' · partiel (registre non chargé)' : ''}</span></li>`).join('')}</ul></li>
      <li><b>Niveau 3</b> — ${link(city)} <span class="fine">(délègue aux équipes ; ne peut outrepasser ni la revue ni l’autorisation humaine)</span></li>
      <li><b>Niveaux 4–5</b> — ${leads.length} équipes<ul class="cv-teams">${leads.map(l => `<li>${link(l)} <span class="fine">· ${size(l.team)} agents · ${busy(l.team)} au travail</span></li>`).join('')}</ul></li></ol>
    <p class="fine">${esc(HONESTY)}</p>`;
}

function reasoningHTML(R, ctl) {
  const r = ctl.reasoning || { state: 'off' }, jobs = Object.values(R.S.jobs || {}), cnt = st => jobs.filter(j => j.state === st).length;
  const state = { off: 'désactivé', detecting: 'détection du modèle local…', unavailable: `indisponible — ${r.reason || ''}`, on: `activé — ${r.model}, ${r.workers} worker partagé par ${R.agents.length} agents` }[r.state] || r.state;
  return `<p class="fine">Les agents ne possèdent pas chacun un modèle : une file partagée et bornée confie des tâches typées (preuves manquantes, hypothèse, objection) au modèle local, puis chaque réponse est validée (schéma, constats cités, vérificateur). Les résultats restent des <b>propositions non revues</b> ; ils ne modifient jamais les constats.</p>
    <p class="le-row"><button type="button" class="small" data-reason="${r.state === 'on' ? 'off' : 'on'}">${r.state === 'on' ? 'Désactiver' : 'Activer'} le raisonnement local</button><span class="fine">État : ${esc(state)}${r.state === 'on' ? ` · file ${r.queued}, en cours ${r.running}` : ''}</span></p>
    <p class="fine">Tâches : ${cnt('done')} validée(s), ${cnt('rejected')} écartée(s) par la validation, ${cnt('expired')} expirée(s), ${cnt('pending') + cnt('running')} en attente. Budget : 1 tâche à la fois, ${r.budget?.maxPerHour ?? 40} par heure au plus, ${Math.round((r.budget?.timeoutMs ?? 120000) / 1000)} s maximum chacune.</p>`;
}
export function modelWorkHTML(R, mid) {
  const w = R.S.missions[mid]?.modelWork || []; if (!w.length) return '';
  const item = x => x.kind === 'gaps' ? (x.output?.questions || []).map(q => esc(q.question)).join('<br>') : x.kind === 'hypothesis' ? (x.output?.hypotheses || []).map(h => `<b>${esc(h.title)}</b> — ${esc(h.statement)}<br><span class="fine">Test : ${esc(h.test)} · Réfutée si : ${esc(h.falsifiedIf)}</span>`).join('<br>') : (x.output?.objections || []).map(o => `${esc(o.kind)} : ${esc(o.text)}`).join('<br>');
  return `<div class="pp-sec"><h3>Travail du modèle local — propositions non revues</h3><ul class="cv-findings">${w.slice(-6).reverse().map(x => `<li><span class="le-badge" data-s="${x.status === 'validé' ? 'local-model' : 'simulated'}">${x.status === 'validé' ? 'proposition validée (non revue)' : 'écartée par la validation'}</span> <span class="fine">${esc({ gaps: 'Preuves manquantes', hypothesis: 'Hypothèse', critique: `Objections à « ${x.target?.title || ''} »` }[x.kind])} · ${esc(R.byId.get(x.agent)?.code || x.agent)} · ${esc(x.model || '')}${x.ms ? ` · ${Math.round(x.ms / 1000)} s` : ''}</span><br>${x.status === 'validé' ? item(x) : esc((x.issues || []).join(' ; '))}</li>`).join('')}</ul></div>`;
}
