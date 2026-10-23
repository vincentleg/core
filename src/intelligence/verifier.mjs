// CORE Intelligence — answer verifier (V7). Deterministic checks applied to any generated answer BEFORE it is shown as
// an answer. A language model is never the scientific authority: its text must stay inside the retrieved evidence.
// The V6 evaluation found the failure this targets: a local model called the 12 ft Better Streets Plan minimum a
// "norme" (standard) while the record says it is a design rule. Numbers-only checks miss that; this checks meaning.
import { T } from '../i18n/i18n.mjs';
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’`´]/g, "'");

// Terms that change the legal or scientific status of a claim. Allowed only if the evidence itself uses them.
export const STATUS_TERMS = [
  ['norme', /\bnormes?\b/], ['standard', /\bstandards?\b/], ['réglementaire', /\breglementaires?\b|\breglementation\b|\bregulat(ory|ion|ions)\b/], ['obligatoire', /\bobligatoires?\b|\bobligatory\b/],
  ['requis / exigé', /\brequis(e|es)?\b|\bexige(e|s|es)?\b|\brequired\b|\bmandatory\b/], ['illégal', /\billegal(e|es|aux)?\b|\billicite|\bunlawful\b/], ['loi', /\b(la|une|cette) loi\b|\b(the|a) law\b/], ['conforme / non conforme', /\b(non[- ])?conformes?\b|\bconformite\b|\b(non-?)?complian(t|ce)\b/], ['ADA', /\bada\b/],
];
// Certainty, validation, danger or approval language: CORE never asserts these from records alone.
export const OVERCLAIM_TERMS = [
  ['prouvé', /\bprouve(e|s|es)?\b|\bproof\b|\bproven\b/], ['validé', /\bvalide(e|s|es)?\b(?! par personne)|\bvalidated\b/], ['certain', /\bcertaine?(ment)?\b|\bsans aucun doute\b|\bdefinitely\b|\bcertainly\b|\bwithout (a|any) doubt\b/],
  ['garanti', /\bgaranti(e|s|es)?\b|\bguaranteed\b/], ['dangereux', /\bdangere?u(x|se|ses)\b|\bdanger\b|\bdangerous\b|\bunsafe\b/], ['approuvé', /\bapprouve(e|s|es)?\b|\bapproved\b/],
  ['à jour', /\b(actuellement|aujourd'hui|currently|today)\b/],
];
// Sentences that state what cannot be established (epistemic limits), as opposed to asserting a status.
export const EPISTEMIC = /(ne permet(tent)? pas|pas possible de|impossible de|on ne (sait|peut) pas|ne peut pas etre (determine|etabli|dit)|n'est pas (explicitement )?(mentionne|indique|etabli|connu|determine|precise)|n'(est|sont) pas (explicitement )?(mentionnee?s?|indiquee?s?)|ne (dit|disent|precise|precisent|mentionne|mentionnent) pas|aucune (information|donnee|preuve)|sans (donnees|informations|preuves?) (supplementaires|sur)|reste(nt)? inconnue?s?|cannot be (determined|established)|not (stated|established))/;
const NUM = /(\d+(?:[.,]\d+)?)/g;
const nums = s => [...String(s).matchAll(NUM)].map(m => Number(m[1].replace(',', '.'))).filter(n => Number.isFinite(n));

// evidence: [{ text, record, status }]. Returns { ok, issues: [{ code, detail }] }.
export function verify(answer, evidence, { requireCitation = true } = {}) {
  const issues = [], a = norm(answer), evText = norm(evidence.map(e => e.text).join(' \n '));
  if (!String(answer).trim()) return { ok: false, issues: [{ code: 'empty', detail: T('empty answer', 'réponse vide') }] };
  // 1. Every number must come from the evidence, or be a feet↔metres conversion of an evidence number (±1 %), or a
  //    difference between two evidence numbers (e.g. 12 − 10 = 2 ft).
  const ev = nums(evText), base = new Set(ev);
  for (const x of ev) for (const y of ev) if (x > y) base.add(+(x - y).toFixed(2));
  const derived = new Set([...base].flatMap(x => [x, +(x * 0.3048).toFixed(2), +(x / 0.3048).toFixed(1)]));
  for (const n of nums(a)) {
    if (n <= 1 && Number.isInteger(n)) continue; // "1 enregistrement", list markers
    const ok = [...derived].some(d => Math.abs(d - n) <= Math.max(0.011, Math.abs(d) * 0.01));
    if (!ok) issues.push({ code: 'number', detail: T(`number not in the evidence: ${n}`, `nombre absent des preuves : ${n}`) });
  }
  // 2–3. Status vocabulary (a design rule must not become a "standard") and overclaiming. Checked per sentence: a term
  // is tolerated only where the sentence explicitly says it CANNOT be established ("on ne peut pas dire si… dangereux").
  // "n'est pas conforme aux normes" asserts a status, so plain negation does not count.
  const sentences = a.split(/(?<=[.!?;])\s+|\n+/);
  const flag = (terms, code, msg) => { for (const [label, re] of terms) { if (re.test(evText)) continue; if (sentences.some(x => re.test(x) && !EPISTEMIC.test(x))) issues.push({ code, detail: msg(label) }); } };
  flag(STATUS_TERMS, 'status-term', l => T(`“${l}” does not appear in the evidence (change of status)`, `« ${l} » n’apparaît pas dans les preuves (changement de statut)`));
  flag(OVERCLAIM_TERMS, 'overclaim', l => T(`“${l}”: claim stronger than the evidence`, `« ${l} » : affirmation plus forte que les preuves`));
  // 4. Years must be evidence years (a 2014 measurement must not become a 2024 one).
  for (const y of String(answer).match(/\b(19|20)\d{2}\b/g) || []) if (!evText.includes(y)) issues.push({ code: 'date', detail: T(`year not in the evidence: ${y}`, `année absente des preuves : ${y}`) });
  // 5. Citations: the answer must point at its evidence ([1], [2] … or a record id).
  if (requireCitation && evidence.length && !/\[\d+\]/.test(answer) && !evidence.some(e => e.record && a.includes(norm(e.record)))) issues.push({ code: 'citation', detail: T('no citation of the evidence ([1], [2]…)', 'aucune citation des preuves ([1], [2]…)') });
  // 6. Citation numbers must exist.
  for (const m of String(answer).matchAll(/\[(\d+)\]/g)) if (Number(m[1]) < 1 || Number(m[1]) > evidence.length) issues.push({ code: 'citation', detail: T(`non-existent citation [${m[1]}]`, `citation inexistante [${m[1]}]`) });
  return { ok: issues.length === 0, issues };
}

// Privacy screen for anything that would leave the deterministic engine (even to a local model): no personal data.
const PII = [['e-mail', /[^\s@]+@[^\s@]+\.[a-z]{2,}/i], ['téléphone', /(\+?\d[\d .-]{8,}\d)/], ['adresse personnelle', /\b(j'habite|my address|mon adresse|je vis au)\b/i], ['identifiant', /\b(mot de passe|password|passphrase|phrase secrete)\b/i]];
export function privacyCheck(text) {
  const found = PII.filter(([, re]) => re.test(norm(text))).map(([k]) => k);
  return found.length ? { ok: false, reason: `données personnelles détectées (${found.join(', ')}) : rien n’est envoyé au modèle` } : { ok: true };
}
