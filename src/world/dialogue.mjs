// CORE World — deterministic agent dialogue adapter (V3 prototype).
// No language model: replies are assembled only from the agent profile and the problem record passed in, with their
// sources. When a record does not contain the answer, the agent says so. Conversation memory = this exchange only.
const STATUS = { observed: 'OBSERVÉ (lu dans un registre public)', 'potential-risk': 'RISQUE POTENTIEL (motif détecté, non confirmé)', hypothesis: 'HYPOTHÈSE (sans preuve)', simulated: 'SIMULÉ (modèle non calibré)' };
const INTENTS = [
  ['role', /\b(qui es[- ]tu|que fais[- ]tu|ton r[ôo]le|what do you do|who are you|tu fais quoi|présente|bonjour|salut|hello|hi)\b/i],
  ['evidence', /\b(preuve|source|donn[ée]e|evidence|data|mesur|comment le sais)/i],
  ['status', /\b(statut|[ée]tat|revue|d[ée]cision|valid|approuv|status|review)/i],
  ['solution', /\b(solution|propos|interven|pourquoi|why|que faire|recommand|simulation|sc[ée]nario)/i],
  ['contribute', /\b(contribu|aider|participer|help|comment puis|soumettre)/i],
  ['observation', /\b(j'ai (vu|observ|remarqu)|i (saw|noticed|observed)|chez moi|dans mon quartier|je passe)/i],
  ['suggestion', /\b(je propose|il faudrait|on pourrait|suggest|what if|et si)/i],
  ['problem', /\b(probl[èe]me|trottoir|sidewalk|largeur|issue|quoi ici|qu'y a-t-il)/i],
];
export function intent(text) { for (const [k, re] of INTENTS) if (re.test(text)) return k; return 'unknown'; }

export function reply(text, { agent, problem, sidewalk }) {
  const k = intent(text), src = [], out = [];
  const label = STATUS[problem.status] || problem.status;
  switch (k) {
    case 'role':
      out.push(`Je suis ${agent.code}, « ${agent.role} ». Agent à règles (déterministe), sans modèle de langage. Périmètre : ${agent.scope.area}. Compétence déclarée, pas une qualification professionnelle.`);
      out.push('Je peux vous expliquer le problème enregistré ici, ses preuves, son statut de revue et comment contribuer.'); src.push('data/agents/registry.json'); break;
    case 'problem':
      out.push(`${problem.title} — ${problem.place}. ${problem.statement}`, `Statut : ${label}. Limite : ${problem.caveat}`); src.push(problem.id); break;
    case 'evidence':
      out.push(`Preuve enregistrée : ${problem.evidence.map(e => e.ref).join(', ')} (DataSF, ${problem.evidence.map(e => e.url).join(', ')}).`);
      if (sidewalk) out.push(`Relevé : ${sidewalk.width_ft} ft côté ${sidewalk.side ?? 'non précisé'}, étude ${sidewalk.year ?? 2014}. Je n’ai aucune mesure plus récente.`);
      out.push(`Confiance : ${problem.confidence}.`); src.push(...problem.evidence.map(e => e.url)); break;
    case 'status': {
      const inv = problem.investigation;
      out.push(inv ? `Une investigation déterministe (${inv.task}, empreinte ${inv.fingerprint}) a conclu « ${inv.decision} ». Ce n’est pas une approbation.` : 'Aucune investigation enregistrée.');
      out.push(`Décision humaine : ${problem.humanDecision}. Aucune action réelle n’est autorisée.`); src.push(problem.id); break;
    }
    case 'solution':
      out.push(problem.interventions.length ? `Interventions enregistrées : ${problem.interventions.map(i => `${i.label} (${i.status})`).join(' ; ')}.` : 'Aucune proposition d’intervention ni simulation n’est enregistrée pour ce problème. Je ne propose pas de solution sans étude.');
      out.push('Vous pouvez soumettre une idée : elle restera dans votre navigateur et sera clairement marquée comme non revue.'); src.push(problem.id); break;
    case 'contribute':
      out.push('Trois façons : une observation (ce que vous avez constaté, quand), une idée de solution, ou une source de preuve à vérifier. Utilisez « Contribuer » dans ce panneau.');
      out.push('Dans ce prototype, rien n’est transmis : pas de modération ni de revue en ligne.'); break;
    case 'observation':
      out.push('Merci. Une observation de terrain est utile si elle est datée et localisée au tronçon, sans donnée personnelle.');
      out.push('Pouvez-vous préciser quand vous l’avez constatée et de quel côté de la rue ? Vous pourrez ensuite la soumettre comme observation.'); break;
    case 'suggestion':
      out.push('Je note qu’il s’agit d’une idée, pas d’une conclusion. Elle devra être étudiée avec des preuves avant toute revue humaine.');
      out.push('Quelle preuve permettrait de vérifier que votre idée améliore la situation ?'); break;
    default:
      out.push('Je réponds seulement à partir des enregistrements de ce problème. Je peux parler de : mon rôle, le problème, les preuves, le statut de revue, les solutions envisagées, comment contribuer.');
  }
  if (k === 'problem' || k === 'evidence') out.push('Avez-vous observé un problème d’accessibilité similaire ailleurs sur ce corridor ?');
  return { intent: k, text: out.join('\n'), sources: src, kind: 'deterministic' };
}
