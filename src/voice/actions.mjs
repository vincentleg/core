// CORE V8 — companion action registry. Spoken or typed words are turned into ONE typed action from a fixed list;
// parameters are validated against known values (places, agents, missions, scenarios, layers, languages). Nothing a
// person says is ever evaluated as code, turned into a URL fragment without validation, or sent anywhere.
// Actions that share, delete or publish are flagged `confirm`: the companion never performs them — it opens the page
// where the person must act themselves.
export const LAYERS = ['real', 'agents', 'hybrid'];
export const SCENARIOS = ['S0', 'A', 'B', 'C', 'D'];
export const LANGS = { en: 'English', 'zh-Hans': '简体中文', hi: 'हिन्दी', es: 'Español', fr: 'Français', ar: 'العربية', pt: 'Português', bn: 'বাংলা', ru: 'Русский', ja: '日本語' };
export const PLACES = {
  earth: { label: 'Planet Earth', scale: 'planet' }, 'san-francisco': { label: 'San Francisco', at: [-122.4194, 37.7749], zoom: 12.2 },
  soma: { label: 'SoMa, San Francisco', at: [-122.4040, 37.7785], zoom: 15.8 }, folsom: { label: 'Folsom Street (mobility study)', at: [-122.4038, 37.7793], zoom: 16.7 },
  'golden-gate': { label: 'Golden Gate Bridge', at: [-122.4783, 37.8199], zoom: 14.2 }, 'new-york': { label: 'New York', at: [-74.0060, 40.7128], zoom: 11.5 },
};
// Mission index for pages where the World runtime is not loaded (kept equal to buildMissions by test/v8.test.js).
export const MISSION_INDEX = [['mission.sf.housing-resilience', 'Housing affordability and urban resilience'], ['mission.sf.mobility', 'Mobility and congestion — SoMa'], ['mission.sf.energy-benchmarks', 'Building energy performance'], ['mission.sf.road-safety', 'Road safety: high-injury network'], ['mission.sf.urban-forest', 'Urban forest'], ['mission.sf.sidewalk-regression', 'Sidewalk regression test'], ['mission.sf.data-freshness', 'Data freshness'], ['mission.sf.ai-compute', 'AI compute energy'], ['mission.sf.food-access', 'Food access'], ['mission.sf.schools', 'School access'], ['mission.sf.water', 'Water security']].map(([id, title]) => ({ id, title }));
export const ACTIONS = {
  navigate_to_place: { params: { place: 'place' }, label: 'Go to a place' },
  find_agent: { params: { agent: 'agent' }, label: 'Find an agent' },
  follow_agent: { params: { agent: 'agent' }, label: 'Follow an agent' },
  open_mission: { params: { mission: 'mission' }, label: 'Open a mission' },
  switch_world_layer: { params: { layer: 'layer' }, label: 'Switch the world layer' },
  ask_agent: { params: { agent: 'agent', question: 'text' }, label: 'Ask an agent' },
  start_simulation: { params: { scenario: 'scenario' }, label: 'Play a recorded simulation' },
  compare_scenarios: { params: {}, label: 'Compare scenarios' },
  open_report: { params: { mission: 'mission' }, label: 'Open a report' },
  open_profile: { params: {}, label: 'Open My CORE' },
  change_language: { params: { lang: 'lang' }, label: 'Change language' },
  share_contribution: { params: {}, label: 'Share a contribution', confirm: true },
  delete_my_data: { params: {}, label: 'Delete my local data', confirm: true },
};

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
const LANG_WORDS = [['en', /\b(english|anglais|ingles)\b/], ['fr', /\b(french|francais|frances)\b/], ['es', /\b(spanish|espagnol|espanol)\b/], ['pt', /\b(portuguese|portugais|portugues)\b/], ['ar', /\b(arabic|arabe)\b/], ['hi', /\b(hindi)\b/], ['bn', /\b(bengali|bangla)\b/], ['ru', /\b(russian|russe|ruso)\b/], ['ja', /\b(japanese|japonais|japones)\b/], ['zh-Hans', /\b(chinese|mandarin|chinois)\b/]];
const PLACE_WORDS = [['golden-gate', /golden gate/], ['folsom', /folsom/], ['soma', /\bsoma\b|south of market/], ['new-york', /new york|nyc/], ['san-francisco', /san francisco|\bsf\b/], ['earth', /\b(earth|terre|planet|planete|globe)\b/]];
const SCN_WORDS = [['A', /bus lane|voie (de )?bus|voie reservee|\bbus\b/], ['B', /signal|feux|traffic light|actuated|adaptati/], ['C', /bike|velo|cycl|road diet/], ['D', /demand|demande|fewer cars|moins de voitures/], ['S0', /baseline|reference|actuel|current/]];
const LAYER_WORDS = [['hybrid', /hybrid|hybride|both|les deux/], ['agents', /\bagents?\b|civili/], ['real', /\b(real|reel|reelle|reality|realite)\b/]];

// Agent reference: an explicit code (CORE-XXX-0001), or a role keyword matched against registered roles.
function agentRef(t, ctx) {
  const code = t.match(/\bcore[- ]([a-z]{2,4})[- ](\d{3,4})\b/);
  if (code) { const c = `CORE-${code[1].toUpperCase()}-${code[2]}`; const a = ctx.agents?.find(x => x.code === c); return a ? a.id : null; }
  const words = t.split(' ').filter(w => w.length >= 5 && !/^(agent|trouve|cherche|follow|suivre|where|about|propos|question|demande)/.test(w));
  for (const w of words) { const a = ctx.agents?.find(x => norm(`${x.role} ${x.teamName || ''}`).includes(w)); if (a) return a.id; }
  return null;
}
function missionRef(t, ctx) {
  const KEY = [['mobility', /mobil|traffic|trafic|congestion|transport/], ['housing', /housing|logement|loyer|rent/], ['ai-compute', /\b(ai|ia)\b|compute|calcul/], ['energy', /energ/], ['safety', /safety|securite|accident|collision/], ['forest', /tree|arbre|forest|foret|canopy|canopee/], ['sidewalk', /sidewalk|trottoir/], ['freshness', /fresh|fraicheur/], ['food', /food|aliment/], ['schools', /school|ecole|scolaire/], ['water', /water|\beau\b/]];
  for (const [k, re] of KEY) if (re.test(t)) { const m = ctx.missions?.find(x => x.id.includes(k) || norm(x.title).includes(k)); if (m) return m.id; }
  const words = t.split(' ').filter(w => w.length >= 6);
  for (const w of words) { const m = ctx.missions?.find(x => norm(x.title).includes(w)); if (m) return m.id; }
  return null;
}
const first = (t, table) => table.find(([, re]) => re.test(t))?.[0] || null;

// Text → { name, params } or { name: null, reason }. Deterministic; English and French phrasings.
export function parse(text, ctx = {}) {
  const raw = String(text || '').slice(0, 400), t = norm(raw);
  if (!t) return { name: null, reason: 'empty' };
  if (/\b(language|langue|idioma|parle|speak)\b/.test(t)) { const lang = first(t, LANG_WORDS); return lang ? { name: 'change_language', params: { lang } } : { name: null, reason: 'unknown-language' }; }
  if (/\b(delete|efface|supprime|wipe)\b/.test(t)) return { name: 'delete_my_data', params: {} };
  if (/\b(share|partage|publish|publie)\b/.test(t)) return { name: 'share_contribution', params: {} };
  if (/\b(layer|couche|mode|view|vue)\b/.test(t) && first(t, LAYER_WORDS)) return { name: 'switch_world_layer', params: { layer: first(t, LAYER_WORDS) } };
  if (/compar/.test(t)) return { name: 'compare_scenarios', params: {} };
  if (/simul|replay|rejou|scenario/.test(t)) return { name: 'start_simulation', params: { scenario: first(t, SCN_WORDS) || 'S0' } };
  if (/\b(report|rapport|pdf)\b/.test(t)) { const mission = missionRef(t, ctx); return mission ? { name: 'open_report', params: { mission } } : { name: null, reason: 'unknown-mission' }; }
  if (/\b(profile|profil|my core|mon core|avatar)\b/.test(t)) return { name: 'open_profile', params: {} };
  if (/\b(ask|demande a|demander a|pose|question)\b/.test(t)) {
    const agent = agentRef(t, ctx); if (!agent) return { name: null, reason: 'unknown-agent' };
    const q = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw; return { name: 'ask_agent', params: { agent, question: q.trim().slice(0, 300) } };
  }
  if (/\b(follow|suis|suivre|suivez)\b/.test(t)) { const agent = agentRef(t, ctx); return agent ? { name: 'follow_agent', params: { agent } } : { name: null, reason: 'unknown-agent' }; }
  if (/\b(find|trouve|cherche|where is|ou est|locate|agent)\b/.test(t) && !/mission/.test(t)) { const agent = agentRef(t, ctx); if (agent) return { name: 'find_agent', params: { agent } }; }
  if (/\bmission\b|open|ouvre/.test(t)) { const mission = missionRef(t, ctx); if (mission) return { name: 'open_mission', params: { mission } }; }
  const place = first(t, PLACE_WORDS); if (place) return { name: 'navigate_to_place', params: { place } };
  const mission = missionRef(t, ctx); if (mission) return { name: 'open_mission', params: { mission } };
  if (first(t, LAYER_WORDS) && t.split(' ').length <= 2) return { name: 'switch_world_layer', params: { layer: first(t, LAYER_WORDS) } };
  return { name: null, reason: 'not-understood' };
}

// Every parameter checked against the registry and the known values; unknown actions or values are refused.
export function validate(cmd, ctx = {}) {
  const A = ACTIONS[cmd?.name], err = []; if (!A) return { ok: false, errors: ['unknown action'] };
  const p = cmd.params || {};
  for (const k of Object.keys(p)) if (!(k in A.params)) err.push(`unexpected parameter ${k}`);
  for (const [k, type] of Object.entries(A.params)) {
    const v = p[k];
    const ok = { place: () => v in PLACES, agent: () => !!ctx.agents?.some(a => a.id === v), mission: () => !!ctx.missions?.some(m => m.id === v), layer: () => LAYERS.includes(v), scenario: () => SCENARIOS.includes(v), lang: () => v in LANGS, text: () => typeof v === 'string' && v.length <= 300 }[type];
    if (!ok || !ok()) err.push(`invalid ${k}`);
  }
  return { ok: !err.length, errors: err, confirm: !!A.confirm };
}

// Validated command → a plan the page executes: a call on the open World (fixed function names), or a same-site link
// built only from validated values. `say` is the short spoken/written acknowledgement.
export function plan(cmd, ctx = {}) {
  const v = validate(cmd, ctx); if (!v.ok) return { ok: false, errors: v.errors };
  const p = cmd.params, enc = encodeURIComponent, agent = ctx.agents?.find(a => a.id === p.agent), mission = ctx.missions?.find(m => m.id === p.mission);
  switch (cmd.name) {
    case 'navigate_to_place': { const P = PLACES[p.place]; return { ok: true, call: P.scale ? ['goScale', P.scale] : ['flyTo', P.at, P.zoom], href: `world.html#place=${enc(p.place)}`, say: `Going to ${P.label}.` }; }
    case 'find_agent': return { ok: true, call: ['showAgent', p.agent], href: `world.html#agent=${enc(p.agent)}`, say: `Here is ${agent.code}, ${agent.role}.` };
    case 'follow_agent': return { ok: true, call: ['followAgent', p.agent], href: `world.html#agent=${enc(p.agent)}&follow=1`, say: `Following ${agent.code}.` };
    case 'open_mission': return { ok: true, call: ['showMission', p.mission], href: `world.html#mission=${enc(p.mission)}`, say: `Opening the mission: ${mission.title}.` };
    case 'switch_world_layer': return { ok: true, call: ['setLayer', p.layer], href: `world.html#layer=${enc(p.layer)}`, say: `${{ real: 'Real', agents: 'Agents', hybrid: 'Hybrid' }[p.layer]} layer.` };
    case 'ask_agent': return { ok: true, href: `dialogue.html#mission=${enc(ctx.agentMission?.(p.agent) || 'mission.sf.mobility')}&agent=${enc(p.agent)}`, prefill: p.question, say: `Opening a conversation with ${agent.code}. Your question is pre-filled, not sent.` };
    case 'start_simulation': return { ok: true, call: ['playSimulation', p.scenario], href: `world.html#sim=${enc(p.scenario)}&play=1`, say: `Replaying the recorded simulation${p.scenario === 'S0' ? ' (baseline)' : `, scenario ${p.scenario}`}. It is an uncalibrated model.` };
    case 'compare_scenarios': return { ok: true, call: ['showSimulation', 'S0'], href: 'world.html#sim=S0', say: 'Here is the comparison of all recorded scenarios, with their uncertainty.' };
    case 'open_report': return { ok: true, href: `report.html#mission=${enc(p.mission)}`, say: `Opening the report for ${mission.title}.` };
    case 'open_profile': return { ok: true, href: 'me.html', say: 'Opening My CORE.' };
    case 'change_language': return { ok: true, call: ['setLanguage', p.lang], say: `Language: ${LANGS[p.lang]}.` };
    case 'share_contribution': return { ok: true, confirm: true, href: 'me.html#contributions', say: 'Sharing always needs your own explicit choice. I opened your contributions; nothing has been shared.' };
    case 'delete_my_data': return { ok: true, confirm: true, href: 'commons.html#trust', say: 'Deleting data needs your own explicit confirmation in TRUST. Nothing has been deleted.' };
  }
  return { ok: false, errors: ['unhandled'] };
}
