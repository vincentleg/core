// CORE World V7.2 — civilisation panels (pure HTML builders over the runtime; every value escaped).
import { STAGES, STAGE_FR, MSG_FR } from '../civilization/runtime.mjs';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safe = u => (/^https:\/\//i.test(String(u || '')) ? String(u) : null);
const nm = (R, id) => id === 'human:local' ? 'Une personne (vous)' : R.byId.get(id)?.name || R.byId.get(id)?.role || id || '—';
const short = (R, id) => id === 'human:local' ? 'Vous' : R.byId.get(id)?.code || String(id || '').split('.').pop();
const ago = (R, t) => { const d = Math.max(0, R.S.clock - t); return d < 60 ? `il y a ${Math.round(d)} s` : `il y a ${Math.round(d / 60)} min`; };
const STATE_FR = { working: 'au travail', inspecting: 'vérifie sur place', meeting: 'en réunion', travelling: 'en déplacement', returning: 'regagne son poste', idle: 'inactif' };
export const HONESTY = 'Simulation locale déterministe : les agents sont des identités du registre CORE animées par le moteur CORE ; leurs constats sont des calculs codés sur des données publiques datées. Aucun agent n’est un modèle de langage indépendant ; aucune décision réelle n’est prise.';

export function eventLine(R, e) {
  if (e.kind === 'message') return `<li class="cv-ev" data-ev="${e.seq}"><span class="cv-type t-${esc(e.type)}">${esc(MSG_FR[e.type] || e.type)}</span> <b>${esc(short(R, e.from))}</b> → ${esc(short(R, e.to))} <span class="fine">· ${esc(ago(R, e.t))}</span><br><span class="cv-txt">${esc(e.text)}</span></li>`;
  return `<li class="cv-ev sys" data-ev="${e.seq}"><span class="fine">${esc(e.text || e.kind)} · ${esc(ago(R, e.t))}</span></li>`;
}

export function agentHTML(R, id) {
  const a = R.byId.get(id); if (!a) return '<p>Agent inconnu.</p>';
  const act = R.activity(id), mem = R.S.memory[id] || { tasks: 0, messages: 0, reviews: 0, errors: 0, collaborators: [] }, m = act.mission ? R.M.get(act.mission) : null;
  const recent = R.S.events.filter(e => e.from === id || e.to === id || e.agents?.includes(id)).slice(-8).reverse();
  return `<header class="pp-head"><div class="le-row"><span class="le-agent-id">${esc(a.code)}</span><span class="le-badge" data-s="info">${esc(STATE_FR[act.state] || act.state)}</span></div>
    <h2 id="pp-title">${esc(a.role || a.name)}</h2><p class="pp-place">${esc(a.teamName || '')}${a.neighborhood ? ` · secteur ${esc(a.neighborhood)}` : ''} · agent CORE (non humain)</p></header>
    <div class="le-evidence"><span class="le-eyebrow">Maintenant</span><p style="margin:0">${esc(act.label)}</p>${m ? `<p class="fine" style="margin:0">Mission : <a href="#" data-mission="${esc(m.id)}">${esc(m.title)}</a> · étape ${esc(STAGE_FR[act.stage] || act.stage)}</p>` : ''}</div>
    <div class="pp-sec"><h3>Identité et organisation</h3><dl class="kv"><dt>Identifiant</dt><dd><code>${esc(a.id)}</code></dd><dt>Niveau</dt><dd>${esc({ agent: 'agent opérationnel', 'team-lead': 'direction d’équipe', city: 'direction de ville', council: 'conseil', assembly: 'assemblée', global: 'coordination globale' }[a.level] || a.level)}</dd>
      <dt>Supervision</dt><dd>${esc(nm(R, a.supervisor))}</dd><dt>Conseils</dt><dd>${a.councils?.length ? a.councils.map(c => esc(nm(R, c))).join('<br>') : '—'}</dd>
      <dt>Escalade</dt><dd>${a.escalation ? `${esc(nm(R, a.escalation.to))} — ${esc(a.escalation.when)}` : '—'}</dd><dt>Poste</dt><dd>virtuel (aucun bureau réel)</dd>
      <dt>Origine</dt><dd>${a.origin === 'registry-v1' ? 'registre CORE Phase 3 (conservé tel quel)' : 'registre V7.2 (généré)'} · exécution : ${esc({ simulated: 'moteur déterministe CORE', deterministic: 'outils déterministes', llm: 'assisté par modèle (registre Phase 5)', 'coordination-only': 'coordination', unavailable: 'indisponible' }[a.executionMode] || a.executionMode)}</dd></dl></div>
    <div class="pp-sec"><h3>Capacités et accès aux données</h3><p class="fine">${(a.capabilities || []).map(esc).join(' · ') || '—'}</p><p class="fine">Données : ${(a.dataPermissions || []).map(esc).join(', ') || 'aucune (lacune de domaine)'}</p></div>
    <div class="pp-sec"><h3>Mémoire opérationnelle</h3><p class="fine">${mem.tasks} tâche(s) terminée(s) · ${mem.messages} message(s) · ${mem.reviews} revue(s) ou contestation(s) · ${mem.errors} échec(s) · ${mem.collaborators.length} collaborateur(s) récents. La mémoire est un journal d’activité, pas un réentraînement.</p>
      <ul class="cv-feed">${recent.map(e => eventLine(R, e)).join('') || '<li class="fine">Aucune activité enregistrée pour cet agent.</li>'}</ul></div>
    <nav class="pp-actions" aria-label="Interagir"><a class="btn" href="#" data-mission="${esc(m?.id || 'mission.sf.housing-resilience')}">Mission</a><a class="btn primary" href="dialogue.html#mission=${encodeURIComponent(m?.id || 'mission.sf.housing-resilience')}&agent=${encodeURIComponent(id)}">Parler à cet agent</a><a class="btn" href="#" data-follow="${esc(id)}">Suivre</a></nav>
    <p class="fine">${esc(HONESTY)}</p>`;
}

export function missionHTML(R, mid) {
  const m = R.M.get(mid), ms = R.S.missions[mid]; if (!m) return '<p>Mission inconnue.</p>';
  const reached = new Set(m.plan.filter(t => ['done', 'failed'].includes(ms.tasks[t.id].state)).map(t => t.stage)), used = [...new Set(m.plan.map(t => t.stage)), ...(m.monitor ? ['MONITOR'] : [])];
  const f = id => m.findings.find(x => x.id === id), status = { open: 'en cours', 'awaiting-human': 'dossier prêt — en attente de revue humaine', monitoring: 'constat versé — surveillance', gap: 'lacune déclarée', cancelled: 'annulée' }[ms.status];
  const msgs = R.S.events.filter(e => e.mission === mid && e.kind === 'message').slice(-10).reverse();
  return `<header class="pp-head"><div class="le-row"><span class="le-badge" data-s="${ms.status === 'gap' ? 'simulated' : 'observed'}">${esc(status)}</span>${m.flagship ? '<span class="le-chip">Mission phare</span>' : ''}${m.regression ? '<span class="le-chip">Test de régression</span>' : ''}</div>
    <h2 id="pp-title">${esc(m.title)}</h2><p class="pp-lede">${esc(m.question)}</p><p class="fine">${esc(m.scope)}</p></header>
    <div class="pp-sec"><h3>Étapes</h3><ol class="cv-stages">${STAGES.filter(s => used.includes(s) || s === 'RECOMMENDATION').map(s => `<li class="${reached.has(s) ? 'done' : ms.stage === s ? 'now' : ''}">${esc(STAGE_FR[s])}${s === 'RECOMMENDATION' ? ' <span class="fine">(jamais sans revue humaine)</span>' : ''}</li>`).join('')}</ol></div>
    <div class="pp-sec"><h3>Ce qui est établi (constats datés)</h3><ul class="cv-findings">${m.findings.filter(x => x.status !== 'gap').map(x => `<li><span class="le-badge" data-s="${x.status === 'observed' ? 'observed' : 'info'}">${x.status === 'observed' ? 'observé' : 'dérivé'}</span> ${esc(x.claim)}<br><span class="fine">${x.source ? `${safe(x.source.page) ? `<a href="${esc(safe(x.source.page))}" target="_blank" rel="noopener noreferrer">${esc(x.source.title)}</a>` : esc(x.source.title)} · récupéré le ${esc(x.source.retrieved)} · ` : ''}${esc(x.period || '')} · limite : ${esc(x.limits)}</span></li>`).join('')}</ul></div>
    ${m.findings.some(x => x.status === 'gap') ? `<div class="pp-unc"><b>Ce qui n’est pas établi</b>${m.findings.filter(x => x.status === 'gap').map(x => `<p>${esc(x.claim)}</p>`).join('')}</div>` : ''}
    ${m.hypotheses.length ? `<div class="pp-sec"><h3>Hypothèses concurrentes (aucune n’est établie)</h3>${m.hypotheses.map(h => `<div class="cv-hyp"><b>${esc(h.id)} — ${esc(h.title)}</b><p>${esc(h.statement)}</p><p class="fine">Appuis : ${h.support.map(s => esc(f(s)?.claim?.slice(0, 70) || s)).join(' · ')}<br>Ce qui manque : ${h.against.map(s => esc(f(s)?.claim?.slice(0, 80) || s)).join(' · ')}<br>Test proposé : ${esc(h.test)}</p></div>`).join('')}</div>` : ''}
    ${m.dissent.length ? `<div class="pp-sec"><h3>Dissidences conservées</h3><ul>${m.dissent.map(d => `<li><b>${esc(R.byId.get(`core.san-francisco.${d.by}.lead`)?.teamName || d.by)}</b> — ${esc(d.text)}</li>`).join('')}</ul></div>` : ''}
    ${(m.audits || []).length ? `<div class="pp-sec"><h3>Vérifications fiche par fiche</h3><ul>${m.audits.map(a => { const st = ms.audits[a.id]; const t = st.lastTallies || st.tallies; return `<li>${esc(a.label)} : ${st.checked} fiche(s) vérifiée(s), ${st.pass} passe(s) complète(s)${Object.keys(t).length ? ` — ${Object.entries(t).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, n]) => `${n} « ${esc(k)} »`).join(', ')}` : ''}</li>`; }).join('')}</ul></div>` : ''}
    <div class="pp-sec"><h3>Échanges récents entre agents</h3><ul class="cv-feed">${msgs.map(e => eventLine(R, e)).join('') || '<li class="fine">Aucun échange pour l’instant.</li>'}</ul></div>
    <div class="pp-sec"><h3>Contributions humaines</h3>${ms.humanInputs.length ? `<ul>${ms.humanInputs.map(h => `<li>${esc(h.title)} — <span class="fine">${esc(h.state)}</span></li>`).join('')}</ul>` : '<p class="fine">Aucune. Vous pouvez proposer une hypothèse, une preuve ou une contestation : elle reste privée tant que vous ne consentez pas à la partager avec la mission.</p>'}</div>
    <nav class="pp-actions" aria-label="Participer"><a class="btn" href="dialogue.html#mission=${encodeURIComponent(mid)}">Séance d’équipe</a><a class="btn primary" href="dialogue.html#mission=${encodeURIComponent(mid)}&intent=propose">Proposer</a><a class="btn" href="#" data-follow-mission="${esc(mid)}">Suivre</a></nav>
    <p class="fine">${esc(HONESTY)}</p>`;
}

export function activityHTML(R, ctl) {
  const s = R.summary(), all = R.S.events, msgs = all.filter(e => e.kind === 'message');
  const challenges = msgs.filter(e => e.type === 'challenge').slice(-4).reverse(), artifacts = msgs.filter(e => e.type === 'dossier-update').slice(-4).reverse();
  return `<header class="pp-head"><p class="le-eyebrow">Activité de la civilisation CORE · San Francisco</p><h2 id="pp-title">${s.busy} agents au travail sur ${s.sanFrancisco}</h2>
    <p class="fine">${s.inspecting} vérifient sur place · ${s.meeting} en réunion · ${s.travelling} en déplacement · ${s.idle} inactifs (honnêtement : aucune tâche) · ${s.events} événements journalisés</p>
    <div class="le-row cv-ctl"><button type="button" class="small" data-speed="0">${ctl.paused ? 'Reprendre' : 'Pause'}</button>${[1, 4, 16].map(x => `<button type="button" class="small" data-speed="${x}" aria-pressed="${ctl.speed === x && !ctl.paused}">×${x}</button>`).join('')}<span class="fine">${ctl.writer ? 'moteur actif dans cet onglet' : 'lecture : le moteur tourne dans un autre onglet'} · intégrité du journal ${R.S.integrity === 'ok' && R.verify() ? 'vérifiée' : 'ROMPUE'}</span></div></header>
    <div class="pp-sec"><h3>Missions</h3><ul class="cv-missions">${s.missions.map(m => `<li><a href="#" data-mission="${esc(m.id)}">${m.flagship ? '★ ' : ''}${esc(m.title)}</a> <span class="fine">· ${esc(STAGE_FR[m.stage] || m.stage)} · ${esc({ open: 'en cours', 'awaiting-human': 'attend une revue humaine', monitoring: 'surveillance', gap: 'lacune : aucune donnée', cancelled: 'annulée' }[m.status])}</span></li>`).join('')}</ul></div>
    <div class="pp-sec"><h3>Questions ouvertes</h3><ul>${R.missions.flatMap(m => m.hypotheses.map(h => `<li><a href="#" data-mission="${esc(m.id)}">${esc(h.id)} — ${esc(h.title)}</a> <span class="fine">(non établie)</span></li>`)).join('')}</ul></div>
    <div class="pp-sec"><h3>Constats contestés</h3><ul class="cv-feed">${challenges.map(e => eventLine(R, e)).join('') || '<li class="fine">Aucun.</li>'}</ul></div>
    <div class="pp-sec"><h3>En attente d’une personne</h3><ul>${s.missions.filter(m => m.status === 'awaiting-human').map(m => `<li><a href="#" data-mission="${esc(m.id)}">${esc(m.title)}</a> — dossier prêt ; aucun relecteur humain vérifié n’existe encore</li>`).join('') || '<li class="fine">Rien.</li>'}</ul></div>
    <div class="pp-sec"><h3>Artefacts produits</h3><ul class="cv-feed">${artifacts.map(e => eventLine(R, e)).join('') || '<li class="fine">Aucun pour l’instant.</li>'}</ul></div>
    <div class="pp-sec"><h3>Derniers échanges</h3><ul class="cv-feed">${msgs.slice(-12).reverse().map(e => eventLine(R, e)).join('')}</ul></div>
    <div class="pp-sec"><h3>Gouvernance</h3><p class="fine">Assemblée mondiale CORE → 7 conseils (géographiques, thématiques, de mission) → Direction San Francisco → 34 équipes → ${s.sanFrancisco - 35} agents. Les conseils organisent la délibération scientifique ; un consensus d’agents n’est jamais un consentement démocratique humain.</p></div>
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
