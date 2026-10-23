// CORE R2 — agent records and status sources. Joins an agent identity (data/agents/sf-civilization.json) with the only
// recorded activity CORE publishes: the local-model investigation (data/intelligence/work.json), the deterministic urban
// run (data/urban/latest.json) and the recorded civilisation missions (data/civ/index.json). Every displayed status names
// its source; anything absent is labelled "not recorded". Map motion and runtime states are browser replays, never live
// telemetry. No private state (.core-local/) is read; a person's contributions are counted only in their own browser.
import { T, AT } from '../i18n/i18n.mjs';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const FILES = Object.freeze({ work: 'data/intelligence/work.json', urban: 'data/urban/latest.json', civ: 'data/civ/index.json' });
export const REGISTRY = 'data/agents/sf-civilization.json';
// The recorded investigation and the SF tour concern the same Folsom/Howard mobility question.
export const MISSION_OF_WORK = 'mission.sf.mobility';
export const TIERS = Object.freeze({
  deterministic: { id: 'tool-executing', label: ['executes deterministic tools', 'exécute des outils déterministes'] },
  llm: { id: 'model-assisted', label: ['model-assisted; needs a local model on this computer', 'assisté par modèle ; nécessite un modèle local sur cet ordinateur'] },
  simulated: { id: 'engine-animated', label: ['registered identity animated by the deterministic CORE engine', 'identité enregistrée animée par le moteur déterministe CORE'] },
  'coordination-only': { id: 'coordination', label: ['coordination role; executes no tool', 'rôle de coordination ; n’exécute aucun outil'] },
  unavailable: { id: 'unavailable', label: ['planned role; not executable', 'rôle prévu ; non exécutable'] }
});
export const tierOf = a => TIERS[a?.executionMode] || { id: 'unknown', label: ['execution mode not recorded', 'mode d’exécution non enregistré'] };
const PERMISSION = { read: ['read only', 'lecture seule'], analyze: ['may analyse data', 'peut analyser des données'], propose: ['may propose; cannot decide', 'peut proposer ; ne décide pas'], review: ['may review other agents’ work; cannot approve conclusions', 'peut relire le travail d’autres agents ; n’approuve aucune conclusion'], govern: ['coordinates software routing only; no authority over people or decisions', 'coordonne seulement le routage logiciel ; aucune autorité sur les personnes ni les décisions'] };

// Authoritative counts, read from the registry document itself (never hard-coded).
export function registryCounts(doc) {
  const agents = doc?.agents || [], sf = agents.filter(a => a.city === 'san-francisco').length;
  const modes = agents.reduce((m, a) => (m[a.executionMode] = (m[a.executionMode] || 0) + 1, m), {});
  return { total: agents.length, sanFrancisco: sf, outsideSanFrancisco: agents.length - sf, modes, declared: doc?.counts || null };
}

// Provenance named by a recorded finding: source ids, publisher, model id or the findings it checked; never invented.
const findingSource = o => !o ? null : o.sources?.length ? o.sources.map(x => x.id).join(', ') : o.source || o.boundarySource?.publisher || (o.model ? `model ${o.model}` : null) || (o.checked?.length ? `checks ${o.checked.map(x => x.id).join(', ')}` : null);
// `failed`: published files that could not be loaded. Their fields are shown as unavailable, never as absent.
export function buildIndex({ registry = [], work = null, urban = null, civ = null, failed = [] } = {}) {
  const byId = new Map(registry.map(a => [a.id, a])), rec = new Map(), get = id => rec.get(id) || rec.set(id, { work: [], tools: [], rejected: [], urban: [], civ: [], findings: [] }).get(id);
  for (const t of work?.run?.tasks || []) get(t.agent).work.push({ role: t.role, status: t.status, goal: t.goal || null, completed: t.completed || null });
  for (const e of work?.events || []) if (e.agent && (e.kind === 'tool_completed' || e.kind === 'tool_rejected')) get(e.agent)[e.kind === 'tool_completed' ? 'tools' : 'rejected'].push({ tool: e.tool || null, at: e.at || null });
  for (const f of work?.run?.findings || []) if (f.agent) get(f.agent).findings.push({ id: f.id, tool: f.tool || null, source: findingSource(f.output) });
  for (const t of urban?.tasks || []) get(t.agent).urban.push({ role: t.role, status: t.status, completed: t.completed || null, sources: t.output?.sources || [] });
  for (const m of civ?.missions || []) for (const p of m.participants || []) get(p).civ.push({ id: m.id, state: m.state, city: m.city });
  return {
    byId, work, urban, civ, failed: [...failed],
    meta: { work: work ? { recorded: work.recorded, question: work.run?.question, humanReview: work.humanReview, runId: work.run?.id, completed: work.run?.completed, agents: (work.run?.tasks || []).length } : null, urban: urban ? { created: urban.created, completed: urban.completed, calibrated: urban.calibrated === true } : null, civ: civ ? { recorded: civ.recorded_at, missions: civ.missions?.length || 0 } : null },
    records: id => rec.get(id) || { work: [], tools: [], rejected: [], urban: [], civ: [], findings: [] }
  };
}
// Most recent recorded timestamp for an agent, with its source file; null when nothing is recorded.
export function lastRecorded(index, id) {
  const r = index.records(id), c = [];
  for (const t of r.work) if (t.completed) c.push([t.completed, FILES.work]);
  for (const t of r.tools) if (t.at) c.push([t.at, FILES.work]);
  for (const t of r.urban) if (t.completed) c.push([t.completed, FILES.urban]);
  if (r.civ.length && index.meta.civ?.recorded) c.push([index.meta.civ.recorded, FILES.civ]);
  const ok = c.filter(([at]) => Number.isFinite(Date.parse(at))).sort((a, b) => Date.parse(b[0]) - Date.parse(a[0]));
  return ok[0] ? { at: ok[0][0], source: ok[0][1] } : null;
}
// Agents whose virtual post lies within `radius` metres of a point (equirectangular distance; city scale only).
export function near(index, [lng, lat], radius = 500, limit = 12) {
  const k = Math.cos(lat * Math.PI / 180) * 111320, out = [];
  for (const a of index.byId.values()) { if (!Array.isArray(a.post)) continue; const d = Math.hypot((a.post[0] - lng) * k, (a.post[1] - lat) * 110540); if (d <= radius) out.push({ a, d }); }
  out.sort((x, y) => x.d - y.d || x.a.id.localeCompare(y.a.id));
  return { total: out.length, items: out.slice(0, limit) };
}
// A contribution relates to the recorded investigation only when it concerns the same mission and was created after
// that investigation completed. The agents never saw it; the relation is "same question", not "analysed".
export function relatedInvestigation(index, record) {
  const w = index.meta.work, created = record?.events?.[0]?.at;
  if (!w || record?.mission !== MISSION_OF_WORK || !Number.isFinite(Date.parse(created)) || !Number.isFinite(Date.parse(w.completed)) || Date.parse(created) < Date.parse(w.completed)) return null;
  return { mission: MISSION_OF_WORK, runId: w.runId, question: w.question, completed: w.completed, agents: [...new Set((index.work?.run?.tasks || []).map(t => t.agent))], relation: 'same-mission-prior-investigation', analysedContribution: false };
}
const day = at => (Number.isFinite(Date.parse(at)) ? String(at).slice(0, 10) : '');
const missing = s => `<span class="ar-missing">${esc(s)}</span>`;
const none = () => missing(T('Not recorded', 'Non enregistré'));
const unloaded = files => `<p class="ar-failed" role="status">${T(`Could not load ${files.join(', ')}. Fields from it are shown as unavailable, not as absent; reload to retry.`, `Impossible de charger ${files.join(', ')}. Les champs qui en dépendent sont indiqués comme indisponibles, pas comme absents ; rechargez pour réessayer.`)}</p>`;
const registryFailed = index => index.failed.includes(REGISTRY);

// `mapState`: the state shown on the map and where it came from ({ value, source }); `mine`: the viewer's own lifecycle
// records from this browser (never sent anywhere).
export function dossierHTML(index, id, { mapState = null, mine = [] } = {}) {
  if (registryFailed(index)) return `<section class="pp-sec ar"><h3>${T('Records and status sources', 'Enregistrements et sources des statuts')}</h3>${unloaded([REGISTRY])}</section>`;
  const recFailed = Object.values(FILES).filter(f => index.failed.includes(f)), gap = text => recFailed.length ? missing(T('Unavailable: records could not be loaded', 'Indisponible : enregistrements non chargés')) : missing(text);
  const a = index.byId.get(id); if (!a) return `<section class="pp-sec ar"><h3>${T('Records and status sources', 'Enregistrements et sources des statuts')}</h3><p>${missing(T('This identity is not in the published registry.', 'Cette identité n’est pas dans le registre publié.'))}</p></section>`;
  const r = index.records(id), last = lastRecorded(index, id), tier = tierOf(a), m = index.meta;
  const scope = [a.city ? (a.city === 'san-francisco' ? 'San Francisco' : a.city) : T('no city (global or regional role)', 'aucune ville (rôle global ou régional)'), a.neighborhood ? `${T('sector', 'secteur')} ${a.neighborhood}` : T('no sector assigned', 'aucun secteur attribué')].join(' · ');
  const post = Array.isArray(a.post) ? `${T('virtual post', 'poste virtuel')} ${a.post[1].toFixed(4)}, ${a.post[0].toFixed(4)} (${T('not a real office', 'pas un bureau réel')})` : T('no map post', 'aucun poste cartographié');
  const missions = [
    ...r.work.map(t => `<li>${T('Recorded local-model investigation', 'Enquête enregistrée avec modèle local')} · ${esc(t.role)} · ${esc(t.status)}${t.completed ? ` · ${esc(day(t.completed))}` : ''}<br><span class="fine">${esc(m.work?.question || '')}</span></li>`),
    ...r.urban.map(t => `<li>${T('Recorded deterministic urban run', 'Exécution urbaine déterministe enregistrée')} · ${esc(t.role)} · ${esc(t.status)}${t.completed ? ` · ${esc(day(t.completed))}` : ''}</li>`),
    ...r.civ.map(c => `<li>${T('Recorded civilisation mission', 'Mission de civilisation enregistrée')} <code>${esc(c.id)}</code> · ${esc(c.state)}</li>`)];
  const tools = [...r.tools.map(t => `${esc(t.tool || '?')} · ${esc(day(t.at))} · ${T('completed', 'terminé')}`), ...r.rejected.map(t => `${esc(t.tool || '?')} · ${esc(day(t.at))} · ${T('rejected by the tool gate', 'refusé par le contrôle des outils')}`), ...r.urban.map(t => `${esc(t.role)} · ${T('deterministic task', 'tâche déterministe')}`)];
  const evidence = [...r.findings.map(f => `<b>${esc(f.id)}</b>${f.tool ? ` · ${esc(f.tool)}` : ''} · ${f.source ? esc(f.source) : missing(T('source not recorded', 'source non enregistrée'))}`), ...[...new Set(r.urban.flatMap(t => t.sources))].map(s => `${T('source', 'source')} <code>${esc(s)}</code>`)];
  const related = r.work.length ? mine.filter(x => relatedInvestigation(index, x)).length : 0;
  const sup = index.byId.get(a.supervisor);
  return `<section class="pp-sec ar" data-records="${esc(id)}"><h3>${T('Records and status sources', 'Enregistrements et sources des statuts')}</h3>${recFailed.length ? unloaded(recFailed) : ''}<dl class="kv">
    <dt>${T('Agent class', 'Classe d’agent')}</dt><dd>${esc(T(...tier.label))} · ${a.origin === 'registry-v1' ? T('Phase 3 registry profile', 'profil du registre Phase 3') : T('generated registry identity', 'identité générée du registre')}</dd>
    <dt>${T('Geographic scope', 'Périmètre géographique')}</dt><dd>${esc(scope)}<br><span class="fine">${esc(post)}</span></dd>
    <dt>${T('Recorded missions', 'Missions enregistrées')}</dt><dd>${missions.length ? `<ul>${missions.join('')}</ul>` : gap(T('No recorded mission for this agent', 'Aucune mission enregistrée pour cet agent'))}</dd>
    <dt>${T('Last recorded activity', 'Dernière activité enregistrée')}</dt><dd>${last ? `${esc(day(last.at))} · <code>${esc(last.source)}</code>` : recFailed.length ? gap('') : none()}</dd>
    <dt>${T('Tool execution records', 'Exécutions d’outils enregistrées')}</dt><dd>${tools.length ? tools.join('<br>') : gap(T('No tool execution recorded', 'Aucune exécution d’outil enregistrée'))}</dd>
    <dt>${T('Evidence references', 'Références de preuves')}</dt><dd>${evidence.length ? evidence.join('<br>') : gap(T('No evidence reference recorded', 'Aucune référence de preuve enregistrée'))}</dd>
    <dt>${T('Human supervision', 'Supervision humaine')}</dt><dd>${esc(T(...(PERMISSION[a.permission] || [a.permission || 'not recorded', a.permission || 'non enregistré'])))} · ${T('software supervisor', 'superviseur logiciel')}: ${esc(sup ? AT(sup, 'name') || sup.id : T('none', 'aucun'))}<br>${r.work.length ? `${T('Human review of the recorded investigation', 'Revue humaine de l’enquête enregistrée')}: ${esc(m.work?.humanReview || T('not recorded', 'non enregistrée'))}<br>` : ''}${T('No agent can approve a conclusion or authorise real-world action; a human decides.', 'Aucun agent ne peut approuver une conclusion ni autoriser une action réelle ; un humain décide.')}</dd>
    ${related ? `<dt>${T('Your contributions', 'Vos contributions')}</dt><dd>${T(`${related} private contribution(s) in this browser concern the same mission. This agent’s recorded work predates them and did not analyse them.`, `${related} contribution(s) privée(s) dans ce navigateur concernent la même mission. Le travail enregistré de cet agent les précède et ne les a pas analysées.`)}</dd>` : ''}
  </dl><h4>${T('Where each status comes from', 'D’où vient chaque statut')}</h4><ul class="ar-sources">
    <li><b>${T('Map state', 'État sur la carte')}</b>${mapState ? ` (${esc(mapState.value)})` : ''}: ${esc(mapState?.source || T('browser replay; not live telemetry', 'relecture dans le navigateur ; pas de télémétrie en direct'))}. ${T('Movement is a visualisation.', 'Le déplacement est une visualisation.')}</li>
    <li><b>${T('Registry status', 'Statut au registre')}</b> (${esc(a.status || T('not set', 'non défini'))}): <code>${esc(REGISTRY)}</code> · ${T('describes capability, not activity', 'décrit une capacité, pas une activité')}</li>
    <li><b>${T('Recorded work', 'Travail enregistré')}</b>: ${m.work ? `<code>${esc(FILES.work)}</code> ${esc(day(m.work.recorded))}` : missing(FILES.work)} · ${m.urban ? `<code>${esc(FILES.urban)}</code> ${esc(day(m.urban.created))}` : missing(FILES.urban)} · ${m.civ ? `<code>${esc(FILES.civ)}</code> ${esc(day(m.civ.recorded))}` : missing(FILES.civ)}</li>
  </ul></section>`;
}

export function nearHTML(index, lngLat, counts) {
  if (registryFailed(index)) return `<header class="pp-head"><span class="le-eyebrow">${T('Agents near this point', 'Agents près de ce point')}</span></header>${unloaded([REGISTRY])}`;
  const recFailed = Object.values(FILES).some(f => index.failed.includes(f));
  const { total, items } = near(index, lngLat);
  const recorded = id => { const r = index.records(id); return r.work.length + r.urban.length + r.civ.length > 0; };
  return `<header class="pp-head"><span class="le-eyebrow">${T('Agents near this point', 'Agents près de ce point')}</span><h2 id="pp-title">${T(`${total} registered agent(s) within 500 m`, `${total} agent(s) enregistré(s) à moins de 500 m`)}</h2>
    <p class="pp-place">${esc(lngLat[1].toFixed(4))}, ${esc(lngLat[0].toFixed(4))} · ${T('virtual posts from the registry, not real offices or people', 'postes virtuels du registre, ni bureaux réels ni personnes')}</p></header>
    ${items.length ? `<ul class="ar-near">${items.map(({ a, d }) => `<li><a href="#" data-agent="${esc(a.id)}"><b>${esc(a.code)}</b> · ${esc(AT(a, 'role') || AT(a, 'name'))}</a><br><span class="fine">${Math.round(d)} m · ${esc(T(...tierOf(a).label))} · ${recorded(a.id) ? T('recorded work available', 'travail enregistré disponible') : recFailed ? missing(T('records unavailable', 'enregistrements indisponibles')) : missing(T('no recorded work', 'aucun travail enregistré'))}</span></li>`).join('')}</ul>${total > items.length ? `<p class="fine">${T(`Showing the ${items.length} nearest.`, `Affichage des ${items.length} plus proches.`)}</p>` : ''}`
      : `<p>${missing(T('No registered agent has a virtual post here.', 'Aucun agent enregistré n’a de poste virtuel ici.'))}</p>`}
    <p class="fine">${counts ? T(`Registry: ${counts.total} registered identities, ${counts.sanFrancisco} assigned to San Francisco and ${counts.outsideSanFrancisco} global, council or regional coordinators.`, `Registre : ${counts.total} identités enregistrées, dont ${counts.sanFrancisco} affectées à San Francisco et ${counts.outsideSanFrancisco} coordinations globales, de conseil ou régionales.`) : ''} ${T('Select an agent to see its records and where each status comes from.', 'Choisissez un agent pour voir ses enregistrements et l’origine de chaque statut.')}</p>`;
}

// My CORE: the honest link between a contribution and the recorded investigation of the same mission, if any.
export function relatedHTML(index, record) {
  const rel = relatedInvestigation(index, record); if (!rel) return '';
  return `<div class="lc-related"><h4>${T('Related recorded investigation', 'Enquête enregistrée liée')}</h4><p class="fine">${esc(rel.question)}<br>${T(`Completed ${day(rel.completed)} by ${rel.agents.length} registered agents, before your contribution. Same mission; the agents did not analyse your text.`, `Terminée le ${day(rel.completed)} par ${rel.agents.length} agents enregistrés, avant votre contribution. Même mission ; les agents n’ont pas analysé votre texte.`)}</p><a class="btn small" href="world.html#investigations">${T('Open the recorded investigation', 'Ouvrir l’enquête enregistrée')}</a></div>`;
}

// Mission-level bridge to the published run. The browser replay in the mission panel is a separate record.
export function missionRunHTML(index, mid) {
  if (mid !== MISSION_OF_WORK) return `<section class="pp-sec ar"><h3>${T('Published investigation', 'Enquête publiée')}</h3><p class="fine">${T('No published agent investigation is linked to this mission. The activity above is a browser replay.', 'Aucune enquête publiée des agents n’est liée à cette mission. L’activité ci-dessus est une relecture dans le navigateur.')}</p></section>`;
  if (index.failed.includes(FILES.work)) return `<section class="pp-sec ar"><h3>${T('Published investigation', 'Enquête publiée')}</h3>${unloaded([FILES.work])}</section>`;
  const w = index.work, tasks = w?.run?.tasks || [], events = w?.events || [];
  if (!w?.run) return `<section class="pp-sec ar"><h3>${T('Published investigation', 'Enquête publiée')}</h3><p>${none()}</p></section>`;
  const agents = new Set(tasks.map(t => t.agent));
  return `<section class="pp-sec ar" data-mission-run="${esc(mid)}"><h3>${T('Published investigation', 'Enquête publiée')}</h3>
    <p class="fine">${T('Recorded local-model run, not live execution or a review of contributions in this browser.', 'Exécution locale avec modèle enregistrée, ni travail en direct ni revue des contributions de ce navigateur.')}</p>
    <dl class="kv"><dt>${T('Source and completion', 'Source et achèvement')}</dt><dd><code>${esc(FILES.work)}</code> · ${esc(day(w.run.completed || w.recorded))} · <code>${esc(w.run.id || '')}</code></dd>
    <dt>${T('Team and actual work', 'Équipe et travail réel')}</dt><dd>${T(`${agents.size} agents, ${tasks.filter(t => t.status === 'completed').length}/${tasks.length} tasks completed, ${events.filter(e => e.kind === 'tool_completed').length} tool calls completed`, `${agents.size} agents, ${tasks.filter(t => t.status === 'completed').length}/${tasks.length} tâches terminées, ${events.filter(e => e.kind === 'tool_completed').length} appels d’outils terminés`)}</dd>
    <dt>${T('Evidence and authority', 'Preuves et autorité')}</dt><dd>${w.run.findings?.length || 0} ${T('recorded findings', 'constats enregistrés')} · ${esc(w.humanReview || T('human review not recorded', 'revue humaine non enregistrée'))}</dd></dl>
    <button type="button" class="btn small" data-urban="intelligence">${T('Inspect tasks, sources and uncertainty', 'Examiner les tâches, sources et incertitudes')}</button></section>`;
}

// Gate B (R10): one execution class per agent, decided from published records only.
//   live     — requires a verified live-execution source naming this agent; CORE publishes none, so it is never shown.
//   recorded — published files hold completed work, tool runs or mission participation by this identity.
//   replay   — no published work; the map shows a deterministic replay computed in this browser (no AI running).
//   inactive — no published work and no current replay assignment.
export const EXECUTION = Object.freeze({
  live: [['Live execution', 'Exécution en direct'], ['Verified live source for this agent.', 'Source en direct vérifiée pour cet agent.']],
  recorded: [['Recorded work', 'Travail enregistré'], ['Published records show completed work by this identity. Map motion is a separate browser replay, not this work happening now.', 'Des enregistrements publiés montrent un travail terminé par cette identité. Le mouvement sur la carte est une relecture distincte, pas ce travail en cours.']],
  replay: [['Browser replay', 'Relecture navigateur'], ['No published work record. Its map activity is a deterministic replay computed in this browser; no AI is running.', 'Aucun travail publié. Son activité sur la carte est une relecture déterministe calculée dans ce navigateur ; aucune IA ne tourne.']],
  inactive: [['Inactive', 'Inactif'], ['No published work record and no current replay assignment.', 'Aucun travail publié et aucune affectation de relecture en cours.']]
});
export function executionClass(index, id, replayState = null, live = null) {
  if (live?.verified === true && live.agent === id) return 'live';
  const r = index.records(id);
  if (r.work.length || r.urban.length || r.civ.length || r.tools.length || r.findings.length) return 'recorded';
  if (replayState && replayState !== 'idle' && index.byId.get(id)?.executionMode !== 'unavailable') return 'replay';
  return 'inactive';
}
// Compact mission card shown first in an agent panel: what it is doing, why it is here, what supports it.
// `replay`: { state, stateLabel, missionTitle, kind } from the browser. kind 'replay' (default): deterministic engine replay;
// kind 'task': a scenario task the visitor ran in this browser (shown as such, never as agent work or replay).
export function missionCardHTML(index, id, replay = null) {
  if (registryFailed(index)) return '';
  const a = index.byId.get(id); if (!a) return '';
  const task = replay?.kind === 'task', cls = executionClass(index, id, task ? null : replay?.state), [label, why] = EXECUTION[cls], r = index.records(id), m = index.meta, last = lastRecorded(index, id);
  const scope = [a.city ? (a.city === 'san-francisco' ? 'San Francisco' : a.city) : T('global or regional role', 'rôle global ou régional'), a.neighborhood ? `${T('sector', 'secteur')} ${a.neighborhood}` : ''].filter(Boolean).join(' · ');
  const problem = r.work.length && m.work?.question ? `${esc(m.work.question)} <span class="fine">(${T('recorded investigation', 'enquête enregistrée')})</span>`
    : r.civ.length ? `${r.civ.map(c => `<code>${esc(c.id)}</code>`).join(', ')} <span class="fine">(${T('recorded mission', 'mission enregistrée')})</span>`
    : replay?.missionTitle ? `${esc(replay.missionTitle)} <span class="fine">(${T('browser replay assignment', 'affectation de relecture')})</span>` : none();
  const sources = new Set([...r.findings.map(f => f.source).filter(Boolean), ...r.urban.flatMap(t => t.sources)]);
  const evidence = r.findings.length || sources.size ? T(`${r.findings.length} recorded finding(s) · ${sources.size} named source(s)`, `${r.findings.length} constat(s) enregistré(s) · ${sources.size} source(s) nommée(s)`) : none();
  const caps = a.capabilities?.length || 0, runs = r.tools.length + r.rejected.length;
  const tools = `${T(`${caps} authorized capability(ies)`, `${caps} capacité(s) autorisée(s)`)} · ${runs ? T(`${r.tools.length} recorded tool run(s), ${r.rejected.length} refused`, `${r.tools.length} exécution(s) d’outil enregistrée(s), ${r.rejected.length} refusée(s)`) : T('no recorded tool run', 'aucune exécution d’outil enregistrée')}`;
  const review = r.work.length && m.work?.humanReview ? esc(m.work.humanReview) : T('Any conclusion needs human review; the agent cannot approve, decide or act outside CORE.', 'Toute conclusion exige une revue humaine ; l’agent ne peut ni approuver, ni décider, ni agir hors de CORE.');
  return `<section class="pp-sec ao-card" data-exec="${cls}" aria-label="${T('Mission card', 'Fiche de mission')}">
    <p class="ao-exec-row"><span class="ao-exec" data-exec="${cls}">${esc(T(...label))}</span>${replay?.stateLabel ? `<span class="ao-replay">${T('On the map', 'Sur la carte')}: ${esc(replay.stateLabel)}${task ? '' : ` · ${T('replay', 'relecture')}`}</span>` : ''}</p>
    <p class="fine ao-why">${esc(T(...why))}</p><dl class="kv ao-kv">
    <dt>${T('Responsibility', 'Responsabilité')}</dt><dd>${esc(AT(a, 'role') || AT(a, 'name') || a.id)}</dd>
    <dt>${T('Why here', 'Pourquoi ici')}</dt><dd>${esc(scope)} <span class="fine">(${T('virtual post', 'poste virtuel')})</span></dd>
    <dt>${T('Problem', 'Problème')}</dt><dd>${problem}</dd>
    <dt>${T('Evidence', 'Preuves')}</dt><dd>${evidence}</dd>
    <dt>${T('Tools', 'Outils')}</dt><dd>${tools}</dd>
    <dt>${T('Human review', 'Revue humaine')}</dt><dd>${review}</dd>
    <dt>${T('History', 'Historique')}</dt><dd>${last ? `${esc(day(last.at))} · <code>${esc(last.source)}</code>` : none()}</dd></dl></section>`;
}
