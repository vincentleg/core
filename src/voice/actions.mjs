// CORE — companion action registry. Spoken or typed words are turned into ONE typed action from a fixed list; parameters
// are validated against known values (places, agents, missions, scenarios, layers, languages). Nothing a person says is
// ever evaluated as code, turned into a URL fragment without validation, or sent anywhere.
// Actions that share, delete or publish are flagged `confirm`: the companion never performs them — it opens the page
// where the person must act themselves. Research questions are answered from the missions' recorded findings
// (deterministic retrieval, cited by id); the full research team (local model) is offered, never run silently.
import { T, lang, LANGS as LANGUAGES } from '../i18n/i18n.mjs';
export const LAYERS = ['parallel', 'real'];
export const SCENARIOS = ['S0', 'A', 'B', 'C', 'D'];
export const LANGS = Object.fromEntries(LANGUAGES.map(([code, name]) => [code, name])); // the six interface languages
export const PLACES = {
  earth: { label: 'Planet Earth', scale: 'planet' }, 'san-francisco': { label: 'San Francisco', at: [-122.4194, 37.7749], zoom: 12.2 },
  soma: { label: 'SoMa, San Francisco', at: [-122.4040, 37.7785], zoom: 15.8 }, folsom: { label: 'Folsom Street (mobility study)', at: [-122.4038, 37.7793], zoom: 16.7 },
  'golden-gate': { label: 'Golden Gate Bridge', at: [-122.4783, 37.8199], zoom: 14.2 }, 'new-york': { label: 'New York', at: [-74.0060, 40.7128], zoom: 11.5 },
};
// Mission index for pages where the World runtime is not loaded (kept equal to buildMissions by test/v8.test.js).
export const MISSION_INDEX = [['mission.sf.housing-resilience', 'Affordable housing and urban resilience'], ['mission.sf.mobility', 'Mobility and congestion: SoMa'], ['mission.sf.energy-benchmarks', 'Energy performance of the corridor’s buildings'], ['mission.sf.road-safety', 'Road safety: the High-Injury Network'], ['mission.sf.urban-forest', 'Urban forest'], ['mission.sf.sidewalk-regression', 'Regression test: a Folsom Street sidewalk'], ['mission.sf.data-freshness', 'Freshness of CORE’s data'], ['mission.sf.ai-compute', 'Energy use of AI computing'], ['mission.sf.food-access', 'Food access'], ['mission.sf.schools', 'School access'], ['mission.sf.water', 'Water security']].map(([id, title]) => ({ id, title }));
export const ACTIONS = {
  navigate_to_place: { params: { place: 'place' }, label: 'Go to a place' },
  find_agent: { params: { agent: 'agent' }, label: 'Find an agent' },
  follow_agent: { params: { agent: 'agent' }, label: 'Follow an agent' },
  open_mission: { params: { mission: 'mission' }, label: 'Open a mission' },
  show_problems: { params: {}, label: 'Show the problems and missions' },
  agents_investigating: { params: {}, label: 'What the agents are investigating' },
  missing_evidence: { params: { mission: 'mission' }, label: 'What evidence is missing' },
  switch_world_layer: { params: { layer: 'layer' }, label: 'Switch the world view' },
  explain_layers: { params: {}, label: 'Explain Real Earth and CORE World' },
  ask_agent: { params: { agent: 'agent', question: 'text' }, label: 'Ask an agent' },
  ask_question: { params: { question: 'text' }, label: 'Ask CORE a research question' },
  start_simulation: { params: { scenario: 'scenario' }, label: 'Play a recorded simulation' },
  compare_scenarios: { params: {}, label: 'Compare scenarios' },
  open_report: { params: { mission: 'mission' }, label: 'Open a research dossier' },
  how_to_contribute: { params: {}, label: 'How can I contribute' },
  open_saved: { params: {}, label: 'Open my saved ideas and contributions' },
  open_profile: { params: {}, label: 'Open My CORE' },
  start_demo: { params: { mode: 'demoMode' }, label: 'Start the guided demo' },
  open_manifesto: { params: {}, label: 'Open the manifesto' },
  change_language: { params: { lang: 'lang' }, label: 'Change language' },
  share_contribution: { params: {}, label: 'Share a contribution', confirm: true },
  delete_my_data: { params: {}, label: 'Delete my local data', confirm: true },
};

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
const LANG_WORDS = [['en', /\b(english|anglais|ingles|englisch|ingl[eê]s)\b|英语|英文/], ['fr', /\b(french|francais|frances|franzosisch)\b|法语|法文/], ['es', /\b(spanish|espagnol|espanol|spanisch|espanhol)\b|西班牙/], ['de', /\b(german|allemand|aleman|deutsch|alemao)\b|德语|德文/], ['zh-CN', /\b(chinese|mandarin|chinois|chino|chinesisch|chines)\b|中文|汉语|普通话/], ['pt', /\b(portuguese|portugais|portugues|portugiesisch)\b|葡萄牙/]];
const PLANNED_WORDS = /\b(arabic|arabe|hindi|bengali|russian|russe|japanese|japonais|italian|italien|korean|coreen)\b/;
const PLACE_WORDS = [['golden-gate', /golden gate/], ['folsom', /\bfolsom\b/], ['soma', /\bsoma\b|south of market/], ['new-york', /new york|nyc/], ['san-francisco', /san francisco|\bsf\b/], ['earth', /\b(earth|terre|planet|planete|globe)\b/]];
const SCN_WORDS = [['A', /bus lane|voie (de )?bus|voie reservee|bus only/], ['B', /signal|feux|traffic light|actuated|adaptati/], ['C', /bike|velo|cycl|road diet/], ['D', /demand|demande|fewer cars|moins de voitures/], ['S0', /baseline|reference|actuel|current/]];
const LAYER_WORDS = [['parallel', /parallel world|monde parallele|core world|monde core|\bagents?\b|civili/], ['real', /real world|monde reel|real earth|terre reelle|\b(real|reel|reelle|reality|realite)\b/]];
const QUESTION = /\?\s*$|^(why|how|what|which|where|when|who|is|are|does|do|can|could|pourquoi|comment|quel|quelle|quels|quelles|ou|quand|qui|est-ce|combien)\b/;

function agentRef(t, ctx) {
  const code = t.match(/\bcore[- ]([a-z]{2,4})[- ](\d{3,4})\b/);
  if (code) { const c = `CORE-${code[1].toUpperCase()}-${code[2]}`; const a = ctx.agents?.find(x => x.code === c); return a ? a.id : null; }
  const words = t.split(' ').filter(w => w.length >= 5 && !/^(agent|trouve|cherche|follow|suivre|where|about|propos|question|demande)/.test(w));
  for (const w of words) { const a = ctx.agents?.find(x => norm(`${x.role} ${x.teamName || ''} ${x.en?.role || ''} ${x.en?.teamName || ''}`).includes(w)); if (a) return a.id; }
  return null;
}
const titleText = m => (typeof m.title === 'object' ? `${m.title.en} ${m.title.fr}` : m.title);
function missionRef(t, ctx) {
  const KEY = [['mobility', /mobil|traffic|trafic|congestion|transport|\bbus\b|voiture|\bcars?\b|parking|\bfeux\b|signal|velo|\bbike|folsom/], ['housing', /housing|logement|loyer|rent|evict|expuls|affordab|abordab/], ['ai-compute', /\b(ai|ia)\b|compute|calcul/], ['energy', /energ|building|batiment/], ['safety', /safety|securite|accident|collision|injur|bless/], ['forest', /tree|arbre|forest|foret|canopy|canopee/], ['sidewalk', /sidewalk|trottoir/], ['freshness', /fresh|fraicheur/], ['food', /food|aliment/], ['schools', /school|ecole|scolaire/], ['water', /water|\beau\b/]];
  for (const [k, re] of KEY) if (re.test(t)) { const m = ctx.missions?.find(x => x.id.includes(k)); if (m) return m.id; }
  const words = t.split(' ').filter(w => w.length >= 6);
  for (const w of words) { const m = ctx.missions?.find(x => norm(titleText(x)).includes(w)); if (m) return m.id; }
  return null;
}
const first = (t, table) => table.find(([, re]) => re.test(t))?.[0] || null;
export const suggestMission = (text, missions) => missionRef(norm(text), { missions });

// Text → { name, params } or { name: null, reason }. Deterministic; English and French phrasings.
export function parse(text, ctx = {}) {
  const raw = String(text || '').slice(0, 400), t = norm(raw);
  if (!t) return { name: null, reason: 'empty' };
  if (/\b(language|langue|idioma|sprache|parle en|speak|habla en|sprich)\b|语言|切换到/.test(t)) { const l = first(t, LANG_WORDS); return l ? { name: 'change_language', params: { lang: l } } : { name: null, reason: PLANNED_WORDS.test(t) ? 'language-not-available' : 'unknown-language' }; }
  if (/\b(delete|efface|supprime|wipe)\b/.test(t)) return { name: 'delete_my_data', params: {} };
  if (/\b(share|partage|publish|publie)\b/.test(t)) return { name: 'share_contribution', params: {} };
  if (/\b(demo|tour|visite|guided|guidee)\b/.test(t)) return { name: 'start_demo', params: { mode: /step|manual|pas a pas|manuel/.test(t) ? 'manual' : /auto|watch|regarder/.test(t) ? 'auto' : 'choose' } };
  if (/manifest/.test(t)) return { name: 'open_manifesto', params: {} };
  if (/(difference|differen|explain|explique).*(real|reel)|(real|reel).*(core world|monde core|parallel|parallele)/.test(t)) return { name: 'explain_layers', params: {} };
  if (/\b(layer|couche|mode|view|vue|world|monde)\b/.test(t) && first(t, LAYER_WORDS)) return { name: 'switch_world_layer', params: { layer: first(t, LAYER_WORDS) } };
  if (/compar/.test(t)) return { name: 'compare_scenarios', params: {} };
  if (/simul|replay|rejou|scenario/.test(t)) return { name: 'start_simulation', params: { scenario: first(t, SCN_WORDS) || 'S0' } };
  if (/(missing|manque|lacune|gap|unknown|inconnu).*(evidence|data|preuve|donnee)|(evidence|preuve|donnee).*(missing|manque)/.test(t)) return { name: 'missing_evidence', params: { mission: missionRef(t, ctx) || 'mission.sf.mobility' } };
  if (/(how|comment).*(contribut|help|aider|particip)|\b(i noticed|j ai remarque)\b/.test(t)) return { name: 'how_to_contribute', params: {} };
  if (/(saved|sauvegard|my ideas|mes idees|my contributions|mes contributions|vault|coffre)/.test(t)) return { name: 'open_saved', params: {} };
  if (/\b(report|rapport|dossier|pdf)\b/.test(t)) { const mission = missionRef(t, ctx); return mission ? { name: 'open_report', params: { mission } } : { name: null, reason: 'unknown-mission' }; }
  if (/\b(profile|profil|my core|mon core|avatar)\b/.test(t)) return { name: 'open_profile', params: {} };
  if (/(what|which|quoi|quels?|que).*(agents?).*(investigat|working|doing|font|travaill|examin|etudi)/.test(t)) return { name: 'agents_investigating', params: {} };
  if (/\b(problems|problemes|missions|challenges|defis)\b/.test(t) && /(show|list|all|toutes?|affiche|montre|voir)/.test(t)) return { name: 'show_problems', params: {} };
  if (/\b(ask|demande a|demander a|pose)\b/.test(t) && agentRef(t, ctx)) {
    const agent = agentRef(t, ctx), q = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw; return { name: 'ask_agent', params: { agent, question: q.trim().slice(0, 300) } };
  }
  if (/\b(follow|suis|suivre|suivez)\b/.test(t)) { const agent = agentRef(t, ctx); return agent ? { name: 'follow_agent', params: { agent } } : { name: null, reason: 'unknown-agent' }; }
  if (/\b(find|trouve|cherche|where is|ou est|locate)\b/.test(t) && !/mission/.test(t)) { const agent = agentRef(t, ctx); if (agent) return { name: 'find_agent', params: { agent } }; }
  if (/\bmission\b|\bopen\b|ouvre|show me|montre/.test(t)) { const mission = missionRef(t, ctx); if (mission) return { name: 'open_mission', params: { mission } }; }
  if (QUESTION.test(t)) return { name: 'ask_question', params: { question: raw.trim().slice(0, 300) } };
  const place = first(t, PLACE_WORDS); if (place) return { name: 'navigate_to_place', params: { place } };
  const mission = missionRef(t, ctx); if (mission) return { name: 'open_mission', params: { mission } };
  if (first(t, LAYER_WORDS) && t.split(' ').length <= 3) return { name: 'switch_world_layer', params: { layer: first(t, LAYER_WORDS) } };
  return { name: null, reason: 'not-understood' };
}

// Every parameter checked against the registry and the known values; unknown actions or values are refused.
export function validate(cmd, ctx = {}) {
  const A = ACTIONS[cmd?.name], err = []; if (!A) return { ok: false, errors: ['unknown action'] };
  const p = cmd.params || {};
  for (const k of Object.keys(p)) if (!(k in A.params)) err.push(`unexpected parameter ${k}`);
  for (const [k, type] of Object.entries(A.params)) {
    const v = p[k];
    const ok = { place: () => v in PLACES, agent: () => !!ctx.agents?.some(a => a.id === v), mission: () => !!ctx.missions?.some(m => m.id === v), layer: () => LAYERS.includes(v), scenario: () => SCENARIOS.includes(v), lang: () => v in LANGS, text: () => typeof v === 'string' && v.length > 0 && v.length <= 300, demoMode: () => ['auto', 'manual', 'choose'].includes(v) }[type];
    if (!ok || !ok()) err.push(`invalid ${k}`);
  }
  return { ok: !err.length, errors: err, confirm: !!A.confirm };
}

// Validated command → a plan the page executes: a call on the open World (fixed function names), or a same-site link
// built only from validated values. `say` is the acknowledgement in the current language.
export function plan(cmd, ctx = {}) {
  const v = validate(cmd, ctx); if (!v.ok) return { ok: false, errors: v.errors };
  const p = cmd.params, enc = encodeURIComponent, agent = ctx.agents?.find(a => a.id === p.agent), mission = ctx.missions?.find(m => m.id === p.mission);
  const role = a => (lang() === 'en' ? a?.en?.role || a?.role : a?.role), mt = m => (typeof m?.title === 'object' ? m.title[lang()] || m.title.en : m?.title);
  switch (cmd.name) {
    case 'navigate_to_place': { const P = PLACES[p.place]; return { ok: true, call: P.scale ? ['goScale', P.scale] : ['flyTo', P.at, P.zoom], href: `world.html#place=${enc(p.place)}`, say: T(`Going to ${P.label}.`, `Direction ${P.label}.`) }; }
    case 'find_agent': return { ok: true, call: ['showAgent', p.agent], href: `world.html#agent=${enc(p.agent)}`, say: T(`Here is ${agent.code}, ${role(agent)}. It is a software agent, not a person.`, `Voici ${agent.code}, ${role(agent)}. C’est un agent logiciel, pas une personne.`) };
    case 'follow_agent': return { ok: true, call: ['followAgent', p.agent], href: `world.html#agent=${enc(p.agent)}&follow=1`, say: T(`Following ${agent.code}.`, `Je suis ${agent.code}.`) };
    case 'open_mission': return { ok: true, call: ['openMission', p.mission], href: `world.html#mission=${enc(p.mission)}`, say: T(`Opening the mission: ${mt(mission)}.`, `Ouverture de la mission : ${mt(mission)}.`) };
    case 'show_problems': return { ok: true, call: ['showProblems'], href: 'world.html#problems', say: T('Here are the problems CORE’s agents are working on, with each mission’s maturity.', 'Voici les problèmes sur lesquels travaillent les agents de CORE, avec la maturité de chaque mission.') };
    case 'agents_investigating': return { ok: true, call: ['showProblems'], href: 'world.html#problems', answer: 'missions', say: T('The agents work on these missions. Each one says what is known, what is missing and what the team is doing now.', 'Les agents travaillent sur ces missions. Chacune dit ce qui est connu, ce qui manque et ce que fait l’équipe maintenant.') };
    case 'missing_evidence': return { ok: true, call: ['openMission', p.mission], href: `world.html#mission=${enc(p.mission)}`, answer: 'gaps', say: T(`What is missing for “${mt(mission)}”:`, `Ce qui manque pour « ${mt(mission)} » :`) };
    case 'switch_world_layer': return { ok: true, call: ['setLayer', p.layer], href: `world.html#layer=${enc(p.layer)}`, say: T(`${{ real: 'Real World', parallel: 'Parallel World' }[p.layer]}.`, `${{ real: 'Monde réel', parallel: 'Monde parallèle' }[p.layer]}.`) };
    case 'explain_layers': return { ok: true, say: T('Parallel World is the virtual agent environment on sourced geography. Real World shows physical geography and verified evidence without virtual agents. CORE World is the separate public product.', 'Le Monde parallèle est l’environnement virtuel des agents sur une géographie sourcée. Le Monde réel montre la géographie physique et des preuves vérifiées sans agents virtuels. CORE World est le produit public distinct.') };
    case 'ask_agent': return { ok: true, href: `dialogue.html#mission=${enc(ctx.agentMission?.(p.agent) || 'mission.sf.mobility')}&agent=${enc(p.agent)}`, prefill: p.question, say: T(`Opening a conversation with ${agent.code}. Your question is pre-filled, not sent.`, `Conversation avec ${agent.code} ouverte. Votre question est préremplie, pas envoyée.`) };
    case 'ask_question': return { ok: true, answer: 'question', say: T('From the recorded findings:', 'D’après les constats enregistrés :') };
    case 'start_simulation': return { ok: true, call: ['playSimulation', p.scenario], href: `world.html#sim=${enc(p.scenario)}&play=1`, say: T(`Replaying the recorded simulation (${p.scenario === 'S0' ? 'baseline' : `scenario ${p.scenario}`}). It is an uncalibrated model, not a prediction.`, `Relecture de la simulation enregistrée (${p.scenario === 'S0' ? 'référence' : `scénario ${p.scenario}`}). Modèle non calibré, pas une prévision.`) };
    case 'compare_scenarios': return { ok: true, call: ['showSimulation', 'S0'], href: 'world.html#sim=S0', say: T('Here is the comparison of the recorded scenarios, with their uncertainty.', 'Voici la comparaison des scénarios enregistrés, avec leur incertitude.') };
    case 'open_report': return { ok: true, href: `report.html#mission=${enc(p.mission)}`, say: T(`Opening the research dossier for ${mt(mission)}.`, `Ouverture du dossier de recherche : ${mt(mission)}.`) };
    case 'how_to_contribute': return { ok: true, call: ['showContribute'], href: 'world.html#contribute', say: T('Describe something you noticed; CORE helps structure it; you choose to keep it private or share it with a mission after an explicit confirmation.', 'Décrivez ce que vous avez remarqué ; CORE aide à le structurer ; vous choisissez de le garder privé ou de le partager avec une mission après une confirmation explicite.') };
    case 'open_saved': return { ok: true, href: 'me.html#contributions', say: T('Opening your saved contributions and ideas (stored in this browser).', 'Ouverture de vos contributions et idées enregistrées (dans ce navigateur).') };
    case 'open_profile': return { ok: true, href: 'me.html', say: T('Opening My CORE.', 'Ouverture de Mon CORE.') };
    case 'start_demo': return { ok: true, call: p.mode === 'choose' ? ['openDemoChoice'] : ['launchDemo', p.mode], href: `world.html#demo${p.mode === 'choose' ? '' : `=${p.mode}`}`, say: T('Starting the guided demo.', 'Lancement de la démo guidée.') };
    case 'open_manifesto': return { ok: true, href: 'manifesto.html', say: T('Opening the CORE manifesto.', 'Ouverture du manifeste CORE.') };
    case 'change_language': return { ok: true, setLang: p.lang, say: T(`Language: ${LANGS[p.lang]}.`, `Langue : ${LANGS[p.lang]}.`) };
    case 'share_contribution': return { ok: true, confirm: true, href: 'me.html#contributions', say: T('Sharing always needs your own explicit choice. Nothing has been shared; the link below opens your contributions.', 'Partager exige toujours votre propre choix explicite. Rien n’a été partagé ; le lien ci-dessous ouvre vos contributions.') };
    case 'delete_my_data': return { ok: true, confirm: true, href: 'commons.html#trust', say: T('Deleting data needs your own confirmation in TRUST. Nothing has been deleted.', 'Supprimer des données exige votre confirmation dans TRUST. Rien n’a été supprimé.') };
  }
  return { ok: false, errors: ['unhandled'] };
}

// Grounded answer from recorded findings (deterministic retrieval; every line cites its finding id).
const STOP = new Set('what which where when does have from with that this they there their about into would could should these those than then them were been being also more most such only very much many some will just your how why are the and for not but can its was has les des une est pour avec dans sur qui que quoi comment pourquoi quel quelle quels quelles sont pas'.split(' '));
const terms = s => new Set((norm(s).match(/[a-z0-9]{3,}/g) || []).filter(w => !STOP.has(w)));
export function answer(question, missions, code = 'en', k = 4) {
  const q = terms(question), txt = x => (x && typeof x === 'object' ? `${x.en} ${x.fr}` : x || '');
  const scored = missions.flatMap(m => m.findings.map(f => ({ m, f, n: [...terms(`${txt(f.claim)} ${txt(m.title)}`)].filter(w => q.has(w)).length }))).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, k);
  return scored.map(({ m, f }) => ({ mission: m.id, id: f.id, status: f.status, text: f.claim && typeof f.claim === 'object' ? f.claim[code] || f.claim.en : f.claim }));
}
