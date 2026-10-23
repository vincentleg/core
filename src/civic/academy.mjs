// CORE Academy — one lesson and a teacher-supervised session (V4 prototype). No minor is invited: the prototype runs
// only in "démonstration enseignant" mode with clearly synthetic learner personas. No chat between learners, no
// ranking, no data about real children. Age ranges are design hypotheses.
import { T } from '../i18n/i18n.mjs';
const B = (en, fr) => ({ en, fr });
export const PATHWAYS = [
  { id: 'discover', name: 'CORE Discover', ages: B('6–9 (hypothesis)', '6–9 (hypothèse)'), status: B('design only', 'conception seulement') },
  { id: 'explore', name: 'CORE Explore', ages: B('10–13 (hypothesis)', '10–13 (hypothèse)'), status: B('prototype lesson (teacher demonstration)', 'leçon prototype (démonstration enseignant)') },
  { id: 'challenge', name: 'CORE Challenge', ages: B('14–17 (hypothesis)', '14–17 (hypothèse)'), status: B('prototype lesson (teacher demonstration)', 'leçon prototype (démonstration enseignant)') },
  { id: 'research', name: 'CORE Research', ages: B('18+', '18+'), status: B('through CORE Labs', 'via CORE Labs') },
];
// Built from a real CORE record (sidewalk-below-bsp-min:5665000) so pupils practise reading evidence, not fiction.
export const LESSON = {
  id: 'academy-observe-or-assume-001', pathways: ['explore', 'challenge'], minutes: 20,
  title: B('Observe or assume? Reading evidence about a San Francisco sidewalk', 'Observer ou supposer ? Lire une preuve sur un trottoir de San Francisco'),
  goals: [B('tell a recorded fact from a hypothesis', 'distinguer un fait enregistré d’une hypothèse'), B('find the date of a measurement', 'repérer la date d’une mesure'), B('tell a design rule from a standard', 'distinguer une règle de conception d’une norme'), B('propose a check', 'proposer une vérification')],
  source: { record: 'sidewalk-below-bsp-min:5665000', url: 'https://data.sf.gov/d/4g86-grxu' },
  questions: [
    { id: 'q1', kind: 'choice', text: B('What was actually measured?', 'Qu’est-ce qui a été réellement mesuré ?'), options: [B('The sidewalk was 10 feet wide at the time of the survey', 'Le trottoir mesurait 10 pieds de large lors de l’étude'), B('Pedestrians cannot get through', 'Des piétons ne peuvent pas passer'), B('The sidewalk is dangerous', 'Le trottoir est dangereux')], answer: 0,
      explain: B('The record holds a measured width. The other two sentences are interpretations that no data here proves.', 'Le registre contient une largeur mesurée. Les deux autres phrases sont des interprétations qu’aucune donnée ici ne prouve.') },
    { id: 'q2', kind: 'choice', text: B('When was it measured?', 'De quand date la mesure ?'), options: [B('2014', '2014'), B('Today', 'Aujourd’hui'), B('We do not know', 'On ne sait pas')], answer: 0,
      explain: B('The survey dates from 2014: the current width may be different.', 'L’étude date de 2014 : la largeur actuelle peut être différente.') },
    { id: 'q3', kind: 'choice', text: B('The “12-foot minimum” is…', 'Le « minimum de 12 pieds » est…'), options: [B('a city design rule (Better Streets Plan)', 'une règle de conception de la ville (Better Streets Plan)'), B('an accessibility law', 'une loi sur l’accessibilité'), B('a measurement of the sidewalk', 'une mesure du trottoir')], answer: 0,
      explain: B('The record says this minimum is a design rule, not an accessibility standard.', 'Le dossier précise que ce minimum est une règle de conception, pas une norme d’accessibilité.') },
    { id: 'q4', kind: 'open', text: B('What would you need to do to know whether the sidewalk is still too narrow today?', 'Que faudrait-il faire pour savoir si le trottoir est encore trop étroit aujourd’hui ?'),
      explain: B('A good answer: a new dated measurement, at the same place, with the same method.', 'Exemple de bonne réponse : une nouvelle mesure datée, au même endroit, avec la même méthode.') },
  ],
};
export const LESSONS = [LESSON,
  { id: 'academy-ai-limits-001', pathways: ['challenge', 'research'], minutes: 20, title: B('What an AI does not know: reading a refusal and a source', 'Ce qu’une IA ne sait pas : lire un refus et une source'),
    goals: [B('understand that a refusal without evidence is a good answer', 'comprendre qu’un refus sans preuve est une bonne réponse'), B('ask for a source', 'exiger une source'), B('ask a checking question', 'poser une question de vérification')],
    source: { record: 'sidewalk-below-bsp-min:5665000', url: 'https://data.sf.gov/d/4g86-grxu' },
    questions: [
      { id: 'q1', kind: 'choice', text: B('A CORE agent answers: “No record allows us to say this sidewalk is dangerous.” This means…', 'Un agent CORE répond : « Aucun enregistrement ne permet d’affirmer que ce trottoir est dangereux. » Cela signifie…'), options: [B('it has no evidence and says so', 'qu’il n’a pas de preuve et le dit'), B('the sidewalk is safe', 'que le trottoir est sûr'), B('it is hiding information', 'qu’il cache une information')], answer: 0,
        explain: B('Absence of evidence is not evidence of the opposite: the agent says what its sources allow, nothing more.', 'Absence de preuve ne veut pas dire preuve du contraire : l’agent dit ce que ses sources permettent d’affirmer, rien de plus.') },
      { id: 'q2', kind: 'choice', text: B('An AI answer without a cited source is…', 'Une réponse d’IA sans source citée est…'), options: [B('a claim to check', 'une affirmation à vérifier'), B('true because it comes from an AI', 'vraie parce qu’elle vient d’une IA'), B('scientific proof', 'une preuve scientifique')], answer: 0,
        explain: B('An AI can be confidently wrong. A source makes checking possible.', 'Une IA peut se tromper avec assurance. Une source permet de vérifier.') },
      { id: 'q3', kind: 'open', text: B('Write a question to ask an agent to check one of its answers.', 'Écrivez une question à poser à un agent pour vérifier une de ses réponses.'), explain: B('Example: “What is the source, and when was it measured?”', 'Exemple : « Quelle est la source, et de quand date la mesure ? »') } ] },
  { id: 'academy-design-experiment-001', pathways: ['explore', 'challenge'], minutes: 25, title: B('Design an experiment: does widening a sidewalk help pedestrians?', 'Concevoir une expérience : élargir un trottoir aide-t-il les piétons ?'),
    goals: [B('measure before acting', 'mesurer avant d’agir'), B('compare with a control', 'comparer avec un témoin'), B('write a failure criterion', 'écrire un critère d’échec')],
    source: { record: 'sidewalk-below-bsp-min:5665000', url: 'https://data.sf.gov/d/4g86-grxu' },
    questions: [
      { id: 'q1', kind: 'choice', text: B('Before changing the sidewalk, what should be measured?', 'Avant de modifier le trottoir, que faut-il mesurer ?'), options: [B('the width and pedestrian flow, on known dates', 'la largeur et le passage des piétons, à des dates connues'), B('nothing, we will see afterwards', 'rien, on verra après'), B('one person’s opinion', 'l’avis d’une seule personne')], answer: 0,
        explain: B('Without a before measurement, we cannot know what changed.', 'Sans mesure avant, impossible de savoir ce qui a changé.') },
      { id: 'q2', kind: 'choice', text: B('Why also observe a “control” segment that is not changed?', 'Pourquoi observer aussi un tronçon « témoin » qu’on ne modifie pas ?'), options: [B('to separate the effect of the intervention from other changes', 'pour séparer l’effet de l’intervention des autres changements'), B('to look nice', 'pour faire joli'), B('it is not useful', 'ce n’est pas utile')], answer: 0,
        explain: B('Flow can change for other reasons (season, nearby works): the control shows it.', 'Le passage peut changer pour d’autres raisons (saison, travaux voisins) : le témoin permet de le voir.') },
      { id: 'q3', kind: 'open', text: B('Write a criterion that would show the idea DID NOT work.', 'Écrivez un critère qui montrerait que l’idée N’A PAS marché.'), explain: B('Example: “no difference in flow compared with the control segment after three months”.', 'Exemple : « pas de différence de passage par rapport au tronçon témoin après trois mois ».') } ] },
];
export const lessonById = id => LESSONS.find(l => l.id === id) || LESSON;
export const PERSONAS = [{ id: 'eleve-A', label: B('Fictional pupil A', 'Élève fictif A') }, { id: 'eleve-B', label: B('Fictional pupil B', 'Élève fictif B') }, { id: 'eleve-C', label: B('Fictional pupil C', 'Élève fictif C') }];

export function startSession({ teacher, mode = 'teacher-demo', learners = PERSONAS.map(p => p.id), lesson = LESSON.id }) {
  if (mode !== 'teacher-demo') return { ok: false, error: T('only the teacher-demonstration mode exists: no real minor before a protection, legal and safety review', 'seul le mode démonstration enseignant existe : aucun mineur réel avant revue de protection, juridique et sécurité') };
  if (!teacher) return { ok: false, error: T('a session is always opened by a teacher', 'une session est toujours ouverte par un enseignant') };
  if (learners.some(l => !PERSONAS.some(p => p.id === l))) return { ok: false, error: T('fictional learners only in this prototype', 'apprenants fictifs uniquement dans ce prototype') };
  if (!LESSONS.some(l => l.id === lesson)) return { ok: false, error: T('unknown lesson', 'leçon inconnue') };
  return { ok: true, value: { teacher, lesson, learners, answers: {}, feedback: {}, open: true, features: { learnerChat: false, ranking: false, publicProfiles: false } } };
}
export function answer(s, { learner, question, value }) {
  if (!s.open) return { ok: false, error: T('session closed by the teacher', 'session fermée par l’enseignant') };
  if (!s.learners.includes(learner)) return { ok: false, error: T('unknown learner', 'apprenant inconnu') };
  const q = lessonById(s.lesson).questions.find(x => x.id === question); if (!q) return { ok: false, error: T('unknown question', 'question inconnue') };
  const v = q.kind === 'choice' ? Number(value) : String(value ?? '').slice(0, 400);
  return { ok: true, value: { ...s, answers: { ...s.answers, [`${learner}:${question}`]: { value: v, correct: q.kind === 'choice' ? v === q.answer : null } } } };
}
// Open answers are reviewed by the teacher, never auto-graded; the teacher's feedback is the authority.
export function feedback(s, { actor, learner, question, text }) {
  if (actor !== s.teacher) return { ok: false, error: T('only the teacher gives feedback', 'seul l’enseignant donne un retour') };
  return { ok: true, value: { ...s, feedback: { ...s.feedback, [`${learner}:${question}`]: String(text ?? '').slice(0, 400) } } };
}
// Teacher view: per-question understanding, no learner ranking.
export function summary(s) {
  return lessonById(s.lesson).questions.map(q => {
    const a = s.learners.map(l => s.answers[`${l}:${q.id}`]).filter(Boolean);
    return { question: q.id, answered: a.length, correct: q.kind === 'choice' ? a.filter(x => x.correct).length : null, toReview: q.kind === 'open' ? s.learners.filter(l => s.answers[`${l}:${q.id}`] && !s.feedback[`${l}:${q.id}`]).length : 0 };
  });
}
