// CORE Academy — one lesson and a teacher-supervised session (V4 prototype). No minor is invited: the prototype runs
// only in "démonstration enseignant" mode with clearly synthetic learner personas. No chat between learners, no
// ranking, no data about real children. Age ranges are design hypotheses.
export const PATHWAYS = [
  { id: 'discover', name: 'CORE Discover', ages: '6–9 (hypothèse)', status: 'conception seulement' },
  { id: 'explore', name: 'CORE Explore', ages: '10–13 (hypothèse)', status: 'leçon prototype (démonstration enseignant)' },
  { id: 'challenge', name: 'CORE Challenge', ages: '14–17 (hypothèse)', status: 'leçon prototype (démonstration enseignant)' },
  { id: 'research', name: 'CORE Research', ages: '18+', status: 'via CORE Labs' },
];
// Built from a real CORE record (sidewalk-below-bsp-min:5665000) so pupils practise reading evidence, not fiction.
export const LESSON = {
  id: 'academy-observe-or-assume-001', pathways: ['explore', 'challenge'], minutes: 20,
  title: 'Observer ou supposer ? Lire une preuve sur un trottoir de San Francisco',
  goals: ['distinguer un fait enregistré d’une hypothèse', 'repérer la date d’une mesure', 'distinguer une règle de conception d’une norme', 'proposer une vérification'],
  source: { record: 'sidewalk-below-bsp-min:5665000', url: 'https://data.sf.gov/d/4g86-grxu' },
  questions: [
    { id: 'q1', kind: 'choice', text: 'Qu’est-ce qui a été réellement mesuré ?', options: ['Le trottoir mesurait 10 pieds de large lors de l’étude', 'Des piétons ne peuvent pas passer', 'Le trottoir est dangereux'], answer: 0,
      explain: 'Le registre contient une largeur mesurée. Les deux autres phrases sont des interprétations qu’aucune donnée ici ne prouve.' },
    { id: 'q2', kind: 'choice', text: 'De quand date la mesure ?', options: ['2014', 'Aujourd’hui', 'On ne sait pas'], answer: 0,
      explain: 'L’étude date de 2014 : la largeur actuelle peut être différente.' },
    { id: 'q3', kind: 'choice', text: 'Le « minimum de 12 pieds » est…', options: ['une règle de conception de la ville (Better Streets Plan)', 'une loi sur l’accessibilité', 'une mesure du trottoir'], answer: 0,
      explain: 'Le dossier précise que ce minimum est une règle de conception, pas une norme d’accessibilité.' },
    { id: 'q4', kind: 'open', text: 'Que faudrait-il faire pour savoir si le trottoir est encore trop étroit aujourd’hui ?',
      explain: 'Exemple de bonne réponse : une nouvelle mesure datée, au même endroit, avec la même méthode.' },
  ],
};
export const PERSONAS = [{ id: 'eleve-A', label: 'Élève fictif A' }, { id: 'eleve-B', label: 'Élève fictif B' }, { id: 'eleve-C', label: 'Élève fictif C' }];

export function startSession({ teacher, mode = 'teacher-demo', learners = PERSONAS.map(p => p.id) }) {
  if (mode !== 'teacher-demo') return { ok: false, error: 'seul le mode démonstration enseignant existe : aucun mineur réel avant revue de protection, juridique et sécurité' };
  if (!teacher) return { ok: false, error: 'une session est toujours ouverte par un enseignant' };
  if (learners.some(l => !PERSONAS.some(p => p.id === l))) return { ok: false, error: 'apprenants fictifs uniquement dans ce prototype' };
  return { ok: true, value: { teacher, lesson: LESSON.id, learners, answers: {}, feedback: {}, open: true, features: { learnerChat: false, ranking: false, publicProfiles: false } } };
}
export function answer(s, { learner, question, value }) {
  if (!s.open) return { ok: false, error: 'session fermée par l’enseignant' };
  if (!s.learners.includes(learner)) return { ok: false, error: 'apprenant inconnu' };
  const q = LESSON.questions.find(x => x.id === question); if (!q) return { ok: false, error: 'question inconnue' };
  const v = q.kind === 'choice' ? Number(value) : String(value ?? '').slice(0, 400);
  return { ok: true, value: { ...s, answers: { ...s.answers, [`${learner}:${question}`]: { value: v, correct: q.kind === 'choice' ? v === q.answer : null } } } };
}
// Open answers are reviewed by the teacher, never auto-graded; the teacher's feedback is the authority.
export function feedback(s, { actor, learner, question, text }) {
  if (actor !== s.teacher) return { ok: false, error: 'seul l’enseignant donne un retour' };
  return { ok: true, value: { ...s, feedback: { ...s.feedback, [`${learner}:${question}`]: String(text ?? '').slice(0, 400) } } };
}
// Teacher view: per-question understanding, no learner ranking.
export function summary(s) {
  return LESSON.questions.map(q => {
    const a = s.learners.map(l => s.answers[`${l}:${q.id}`]).filter(Boolean);
    return { question: q.id, answered: a.length, correct: q.kind === 'choice' ? a.filter(x => x.correct).length : null, toReview: q.kind === 'open' ? s.learners.filter(l => s.answers[`${l}:${q.id}`] && !s.feedback[`${l}:${q.id}`]).length : 0 };
  });
}
