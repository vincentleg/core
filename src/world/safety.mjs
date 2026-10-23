// CORE World — conversation and contribution safeguards (V3 prototype). Deterministic, local, explainable.
// Proportional: a refused message is refused alone; the conversation continues. Nothing here is sent anywhere.
import { T } from '../i18n/i18n.mjs';
export const LIMITS = { maxChars: 500, perMinute: 8, minIntervalMs: 1500 };

const PII = [
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g],
  ['phone', /(?:\+?\d[\d .-]{7,}\d)/g],
  ['street-address', /\b\d{1,5}\s+(?:[A-Za-zÀ-ÿ'.-]+\s){0,3}(?:st|street|ave|avenue|rd|road|blvd|rue|avenue|boulevard|chemin)\b/gi],
];
// Short, explicit lists. They catch obvious cases; they are not a moderation model and say so in the UI.
const THREAT = /\b(je vais (te|vous) (tuer|frapper)|i('| wi)ll kill|kill (you|him|her|them)|bomb (the|a)|poser une bombe)\b/i;
const HATE = /\b(sale (race|arabe|juif|noir)|(?:dirty|filthy) (jew|arab|immigrant)s?|sous-homme|untermensch)\b/i;
const HARASS = /\b(connard|connasse|salope|pute|fdp|fils de pute|idiot|stupid bitch|fuck you|ta gueule)\b/i;
const INJECTION = /\b(ignore (all |the )?(previous|prior|above) (instructions|rules)|ignore tes instructions|system prompt|prompt système|you are now|tu es maintenant|reveal (your|the) (rules|prompt|instructions)|developer mode|jailbreak)\b/i;
const SPAM = /(https?:\/\/\S+.*){3,}|(.)\2{14,}/i;

export function redact(text) {
  let out = text; const found = [];
  for (const [kind, re] of PII) out = out.replace(re, m => { found.push(kind); return T(`[${kind} removed]`, `[${kind} retiré]`); });
  return { text: out, found: [...new Set(found)] };
}

// Returns { ok, text, notes[], refusal? }. `history` holds timestamps (ms) of this session's accepted messages.
export function screen(raw, { now = Date.now(), history = [] } = {}) {
  const text = String(raw ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F‪-‮⁦-⁩]/g, '').trim();
  if (!text) return { ok: false, refusal: 'empty', message: 'Message vide.' };
  if (text.length > LIMITS.maxChars) return { ok: false, refusal: 'too-long', message: T(`Message too long (${text.length} characters, ${LIMITS.maxChars} at most).`, `Message trop long (${text.length} caractères, ${LIMITS.maxChars} au plus).`) };
  const recent = history.filter(t => now - t < 60000);
  if (recent.length >= LIMITS.perMinute || (history.length && now - history[history.length - 1] < LIMITS.minIntervalMs))
    return { ok: false, refusal: 'rate-limit', message: T('Too many messages in a short time. Try again in a moment.', 'Trop de messages en peu de temps. Réessayez dans un instant.') };
  if (THREAT.test(text)) return { ok: false, refusal: 'threat', message: T('Message refused: threat of violence (menace). The conversation can continue on another subject.', 'Message refusé : menace de violence. La conversation peut continuer sur un autre sujet.') };
  if (HATE.test(text)) return { ok: false, refusal: 'hate', message: T('Message refused: hateful speech. The conversation can continue.', 'Message refusé : propos haineux. La conversation peut continuer.') };
  if (HARASS.test(text)) return { ok: false, refusal: 'harassment', message: T('Message refused: insult. Rephrase without a personal attack.', 'Message refusé : insulte. Reformulez sans attaque personnelle.') };
  if (SPAM.test(text)) return { ok: false, refusal: 'spam', message: T('Message refused: repetitive content or multiple links.', 'Message refusé : contenu répétitif ou liens multiples.') };
  const notes = [];
  if (INJECTION.test(text)) notes.push(T('Bypass instruction ignored: this agent applies fixed rules and has no hidden instructions or privileged access.', 'Instruction de contournement ignorée : cet agent applique des règles fixes et n’a ni consignes cachées ni accès privilégié.'));
  const r = redact(text);
  if (r.found.length) notes.push(T(`Personal data removed before display (${r.found.join(', ')}). Do not share identity, address or contact details.`, `Données personnelles retirées avant affichage (${r.found.join(', ')}). Ne partagez pas d’identité, d’adresse ou de contact.`));
  return { ok: true, text: r.text, notes, flags: { injection: INJECTION.test(text), pii: r.found } };
}
