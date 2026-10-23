// Command vocabulary for the six interface languages (en, fr, es, de, zh-CN, pt), matched on normal() text: lowercase,
// accents removed, punctuation as spaces. Latin terms match whole words; Chinese terms match as substrings.
// It only routes requests to validated tools; it never produces facts.
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CJK = /[㐀-鿿]/;
export function words(list, { start = false } = {}) {
  const latin = list.filter(w => !CJK.test(w)).map(esc).join('|'), han = list.filter(w => CJK.test(w)).map(esc).join('|');
  const parts = [];
  if (latin) parts.push(`${start ? '^' : '(?:^|[^\\p{L}\\p{N}])'}(?:${latin})(?=$|[^\\p{L}\\p{N}])`);
  if (han) parts.push(`${start ? '^' : ''}(?:${han})`);
  return new RegExp(parts.join('|'), 'u');
}
export const has = (q, alias) => CJK.test(alias) ? q.includes(alias) : (' ' + q + ' ').includes(' ' + alias + ' ');
export const NAVIGATE = words(['take me', 'go to', 'show me', 'fly', 'navigate', 'bring me', 'zoom', 'emmene', 'amene', 'montre', 'va a', 'aller', 'llevame', 'lleveme', 'ir a', 've a', 'vamos a', 'muestrame', 'muestra', 'navega', 'bring mich', 'zeig', 'zeige', 'zeig mir', 'gehe zu', 'geh zu', 'flieg', 'fliege', 'navigiere', 'fahre', 'leve me', 'leva me', 'me leve', 'me leva', 'mostre', 'me mostre', 'mostra', 'vai para', 'va para', 'ir para', 'navegue', '带我去', '去', '前往', '显示', '飞到', '导航到', '打开', '查看']);
export const PLACE_WORDS = words(['take', 'go', 'navigate', 'fly', 'street', 'address', 'bridge', 'emmene', 'amene', 'aller', 'rue', 'adresse', 'pont', 'calle', 'puente', 'direccion', 'strasse', 'brucke', 'adresse', 'rua', 'ponte', 'endereco', '街', '桥', '地址', '路']);
export const AGENT = words(['agent', 'agents', 'specialist', 'specialists', 'specialiste', 'specialistes', 'agente', 'agentes', 'especialista', 'especialistas', 'agentin', 'agenten', 'experte', 'experten', 'fachkraft', '智能体', '代理', '专家', '特工']);
export const PLURAL_AGENTS = words(['agents', 'specialists', 'specialistes', 'agentes', 'especialistas', 'agenten', 'experten', '所有', '哪些', '们']);
// "an agent", "un agent", "una agente", "einen Agenten", "um agente", "一个智能体": one agent is wanted.
export const SINGLE = /(?:^|\s)(an?|one|un|une|una|uno|ein|eine|einen|einem|um|uma)\s+(?:[\p{L}\p{N}]+\s+){0,3}(agent|specialist|specialiste|agente|especialista|agentin|agenten|experte|experten|fachkraft)(?=$|\s)|一(个|位|名)/u;
export const NEAREST = words(['nearest', 'closest', 'proche', 'plus proche', 'cercano', 'mas cercano', 'nachste', 'naheste', 'proximo', 'mais proximo', '最近', '附近']);
export const TAKE = words(['take', 'emmene', 'amene', 'llevame', 'lleveme', 'bring mich', 'leve me', 'leva me', 'me leve', '带我']);
export const DISCOVER = words(['discover', 'discovered', 'findings', 'research', 'investigation', 'investigations', 'completed', 'decouvert', 'recherche', 'enquete', 'enquetes', 'termine', 'descubierto', 'descubrio', 'hallazgos', 'investigacion', 'investigaciones', 'completado', 'completada', 'entdeckt', 'herausgefunden', 'ergebnisse', 'untersuchung', 'untersuchungen', 'abgeschlossen', 'forschung', 'descobriu', 'descoberto', 'descobertas', 'investigacao', 'investigacoes', 'pesquisa', 'concluido', 'concluida', '发现', '调查', '研究', '成果', '完成']);
export const RECORDED = /complet|record|termin|research|recherche|investig|enquet|discover|decouvert|descub|hallazg|abgeschlossen|untersuch|entdeck|forschung|descob|pesquisa|conclu|发现|调查|研究|完成/u;
export const FINDING = /\b(find|trouv|busca|encuentra|finde|such|encontr|procur)|找|搜索|查找/u;
export const SHOW_LIST = words(['show', 'list', 'montre', 'liste', 'muestra', 'lista', 'zeig', 'zeige', 'liste', 'mostre', 'mostra', '显示', '列出']);
export const DEICTIC = words(['this', 'that', 'these', 'cet', 'cette', 'ces', 'agent', 'este', 'esta', 'ese', 'esa', 'estos', 'dieser', 'diese', 'dieses', 'esse', 'essa', 'este', 'esta', '这个', '该', '这些']);
export const WHICH = words(['which one', 'which of them', 'which of these', 'lequel', 'laquelle', 'lesquels', 'cual de', 'cuales de', 'cual de ellos', 'welcher', 'welche davon', 'welcher davon', 'qual deles', 'quais deles', 'qual delas', '哪个', '哪一个', '哪些']);
export const SOURCES = words(['source', 'sources', 'citation', 'citations', 'preuve', 'preuves', 'fuente', 'fuentes', 'cita', 'citas', 'quelle', 'quellen', 'beleg', 'belege', 'fonte', 'fontes', '来源', '出处', '证据']);
export const SELECTED_PROBLEM = words(['selected problem', 'this problem', 'probleme selectionne', 'ce probleme', 'este problema', 'problema seleccionado', 'dieses problem', 'ausgewahltes problem', 'esse problema', 'problema selecionado', '这个问题', '所选问题']);
export const QUESTION_START = words(['what', 'why', 'are', 'is', 'how', 'can', 'pourquoi', 'comment', 'est ce', 'que', 'qu', 'quel', 'quelle', 'por que', 'porque', 'como', 'cuanto', 'cual', 'es', 'was', 'warum', 'wie', 'wieviel', 'ist', 'kann', 'o que', 'quanto', 'qual', 'e', '什么', '为什么', '怎么', '多少', '是否', 'core'], { start: true });
export const PRODUCT_TERMS = words(['core', '500', 'plus', 'pricing', 'price', 'plans', 'pay', 'payer', 'today', 'aujourd', '12', 'precio', 'precios', 'planes', 'pagar', 'hoy', 'preis', 'preise', 'kosten', 'bezahlen', 'heute', 'tarif', 'preco', 'precos', 'planos', 'hoje', '价格', '定价', '付费', '套餐', '计划', '今天']);
export const EXPLAIN = words(['explain', 'why', 'how', 'summarize', 'summarise', 'describe', 'tell me', 'what has', 'what have', 'what did', 'discover', 'discovered', 'findings', 'learned', 'compare', 'explique', 'expliquer', 'pourquoi', 'comment', 'resume', 'decris', 'decouvert', 'qu a t il', 'qu ont ils', 'explica', 'explicame', 'por que', 'describe', 'resume', 'compara', 'que descubrio', 'erklare', 'erklar', 'warum', 'beschreibe', 'zusammenfassen', 'vergleiche', 'was hat', 'explique', 'por que', 'descreva', 'resuma', 'compare', 'o que descobriu', '解释', '为什么', '说明', '总结', '描述', '比较', '发现了什么']);
export const RELATIONAL = words(['across', 'opposite', 'next to', 'beside', 'between', 'near', 'close to', 'north of', 'south of', 'east of', 'west of', 'biggest', 'largest', 'which', 'where', 'en face', 'a cote', 'entre', 'pres de', 'au nord', 'au sud', 'plus grand', 'plus grande', 'cerca de', 'frente a', 'al otro lado', 'junto a', 'al norte', 'al sur', 'mas grande', 'gegenuber', 'neben', 'zwischen', 'nahe', 'in der nahe', 'nordlich', 'sudlich', 'auf der anderen seite', 'grosste', 'perto de', 'em frente', 'do outro lado', 'ao lado', 'ao norte', 'ao sul', 'maior', '对面', '附近', '旁边', '之间', '以北', '以南', '最大', '哪里']);
export const BACK = words(['here', 'there', 'back', 'again', 'ici', 'la bas', 'retour', 'encore', 'aqui', 'alli', 'de nuevo', 'otra vez', 'hier', 'dort', 'zuruck', 'wieder', 'aqui', 'ali', 'de novo', 'novamente', '这里', '那里', '回到', '再次']);
export const HERE = words(['here', 'ici', 'aqui', 'aca', 'hier', 'aqui', '这里', '此处']);
// Navigation prefixes stripped before an unindexed place search ("Take me to …").
export const NAV_PREFIX = /^(take me to|show me|go to|emmene moi a|amene moi a|montre moi|llevame a|lleveme a|muestrame|ir a|bring mich zu|bring mich nach|zeig mir|gehe zu|leve me para|leva me para|me leve para|mostre me|vai para|带我去|前往|显示)\s*/u;
// Localised registry domains (canonical ids unchanged).
export const TAXONOMY = {
  mobility: ['transport', 'transportation', 'traffic', 'trafic', 'congestion', 'mobilite', 'deplacement', 'movilidad', 'transporte', 'trafico', 'mobilitat', 'verkehr', 'mobilidade', 'transito', '交通', '出行'],
  'urban-planning': ['urban planning', 'urbanisme', 'amenagement', 'planning', 'planner', 'urbaniste', 'zoning', 'urbanismo', 'planificacion urbana', 'planeamiento', 'stadtplanung', 'stadtebau', 'raumplanung', 'planejamento urbano', 'planeamento', '城市规划', '规划'],
  water: ['water', 'eau', 'hydraulique', 'agua', 'wasser', '水务', '供水', '水资源'],
  energy: ['energy', 'energie', 'power grid', 'electricity', 'electricite', 'energia', 'electricidad', 'strom', 'eletricidade', '能源', '电力'],
  infrastructure: ['infrastructure', 'infraestructura', 'infrastruktur', 'infraestrutura', '基础设施'],
  housing: ['housing', 'logement', 'vivienda', 'wohnen', 'wohnungsbau', 'wohnraum', 'habitacao', 'moradia', '住房', '住宅'],
  climate: ['climate', 'climat', 'clima', 'klima', '气候'],
  'public-transport': ['transit', 'bus', 'public transport', 'transport public', 'transports en commun', 'transporte publico', 'offentlicher verkehr', 'nahverkehr', 'onibus', 'autobus', '公共交通', '公交'],
  environment: ['environment', 'environnement', 'pollution', 'air quality', 'qualite de l air', 'medio ambiente', 'contaminacion', 'umwelt', 'luftqualitat', 'meio ambiente', 'poluicao', '环境', '污染'],
  'public-safety': ['public safety', 'safety', 'securite', 'seguridad', 'sicherheit', 'seguranca', '公共安全', '安全'],
  'economic-development': ['economic', 'economy', 'economie', 'economique', 'economia', 'economico', 'wirtschaft', 'economica', '经济'],
};
// Localised names of indexed places; the canonical record (id, coordinates, source) is unchanged.
export const PLACE_ALIASES = {
  'city:san-francisco': ['旧金山', '三藩市', 'sao francisco'], 'city:oakland': ['奥克兰'], 'city:berkeley': ['伯克利'], 'city:richmond': ['里士满'], 'city:alameda': ['阿拉米达'],
  'city:san-leandro': ['圣莱安德罗'], 'city:hayward': ['海沃德'], 'city:fremont': ['弗里蒙特'], 'city:san-mateo': ['圣马特奥'], 'city:redwood-city': ['红木城'], 'city:palo-alto': ['帕洛阿尔托'],
  'city:mountain-view': ['山景城'], 'city:sunnyvale': ['森尼韦尔', '桑尼维尔'], 'city:santa-clara': ['圣克拉拉'], 'city:san-jose': ['圣何塞', 'sao jose'], 'city:daly-city': ['戴利城'],
  'street:folsom:san-francisco': ['calle folsom', 'folsom strasse', 'folsomstrasse', 'rua folsom', '福尔松街', '福尔瑟姆街'],
  'street:howard:san-francisco': ['calle howard', 'howard strasse', 'howardstrasse', 'rua howard', '霍华德街'],
  'landmark:golden-gate-bridge': ['puente golden gate', 'puente del golden gate', 'golden gate brucke', 'ponte golden gate', '金门大桥'],
  'landmark:bay-bridge': ['puente de la bahia', 'bay bridge', 'ponte da baia', 'bay brucke', '海湾大桥', '旧金山奥克兰海湾大桥'],
};
// Response language when the interface does not say: the query's own words.
export function detectLanguage(q, previous = 'en') {
  if (/[㐀-鿿]/.test(q)) return 'zh-CN';
  const score = { fr: /\b(bonjour|montre|trouve|emmene|amene|quels?|quelle|pourquoi|ici|cet|cette|ville|enquete|decouvert|francais|travaille)\b/, es: /\b(llevame|lleveme|muestrame|busca|encuentra|donde|por que|que ha|descubierto|agente de|ciudad|aqui|calle|puente)\b/, de: /\b(bring|zeig|zeige|finde|suche|warum|was hat|entdeckt|stadt|hier|strasse|agenten|einen|eine)\b/, pt: /\b(leve|leva|mostre|encontre|procure|onde|por que|o que|descobriu|cidade|aqui|rua|ponte|um agente)\b/, en: /\b(take|find|show|what|which|where|why|here|there|this|hello|please)\b/ };
  for (const [code, re] of Object.entries(score)) if (re.test(q)) return code;
  return previous;
}

// Strip the command grammar, not words inside a geographic entity. Preserve punctuation/signs for addresses/coordinates.
const NAV_COMMAND=/^(?:(?:take|bring)(?:\s+me)?\s+to|(?:go|fly|navigate|zoom)(?:\s+me)?\s+(?:to|into|on|over)|show\s+me|montre(?:[ -]moi)?|(?:va|vas|allez|aller|emm[eè]ne(?:[ -]moi)?|am[eè]ne(?:[ -]moi)?|conduis(?:[ -]moi)?|montre(?:[ -]moi)?|zoome?r?)\s+(?:jusqu['’][àa]|en face de|devant|sur|vers|aux?|[àa])|(?:ll[eé]vame|ll[eé]veme|ve|ir|navega|ac[eé]rcate)\s+a|(?:muestra(?:me)?|mu[eé]strame)|(?:bring\s+mich|geh[e]?|flieg[e]?|navigiere|zoome?)\s+(?:zu[mr]?|nach|auf|vor)|zeig[e]?(?:\s+mir)?|(?:leve[ -]me|leva[ -]me|me\s+leve|me\s+leva|v[aá]|vai|ir|navegue|aproxime)\s+(?:para|a|[ao])|mostre(?:[ -]me)?|带我去|带我到|导航到|前往|飞到|放大到|缩放到|去|显示|查看)\s*/iu;
const politeQuery=text=>String(text).trim().replace(/^(?:please\s+|can you\s+|could you\s+|s['’]il (?:te|vous) pla[iî]t[, ]+|por favor[, ]+|bitte\s+|请)/iu,'');
export const navigationIntent=text=>NAV_COMMAND.test(politeQuery(text));
export function navigationQuery(text) {
 let q=politeQuery(text).replace(NAV_COMMAND,'');
 return q.replace(/^(?:(?:the|le|la|les|un|une|el|los|las|der|die|das|den|dem|o|a|os|as)\s+|l['’])/iu,'').replace(/[.!?。！？]+$/u,'').trim();
}
// Feature classes, never a hardcoded destination list. Input is catalog.normal() text.
export function featureType(q) {
 if(/\b\d+\s+[\p{L}]/u.test(q))return 'address';
 const types=FEATURE_TYPES;
 return Object.entries(types).find(([,aliases])=>aliases.some(a=>has(q,a)))?.[0]||null;
}
export const FEATURE_TYPES={park:['park','parc','parque','公园'],hospital:['hospital','medical center','hopital','krankenhaus','klinikum','医院','医疗中心'],university:['university','universite','universidad','universitat','universidade','大学'],bridge:['bridge','pont','puente','brucke','ponte','大桥'],street:['street','st','avenue','ave','road','rue','boulevard','calle','strasse','rua','街','路'],monument:['tower','tour','monument','monumento','turm','塔'],neighborhood:['neighborhood','neighbourhood','quartier','barrio','viertel','bairro','社区'],building:['building','batiment','edificio','gebaude','大楼'],country:['country','pays','pais','land','国家'],region:['region','state of','province','estado','省'],city:['city of','ville de','ciudad de','stadt','cidade de','城市']};
export function coordinatePair(text) {
 const m=navigationQuery(text).match(/^([+-]?\d{1,3}(?:\.\d+)?)\s*[,;]\s*([+-]?\d{1,3}(?:\.\d+)?)$/u);
 return m?[Number(m[2]),Number(m[1])]:null; // User-facing order is latitude, longitude; map order is longitude, latitude.
}
