// Voice input only. No CORE audio endpoint, model download or automatic recognition.
import { T } from '../i18n/i18n.mjs';
const BCP47 = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', 'zh-CN': 'zh-CN', pt: 'pt-BR' };
const Recognition = () => globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export async function dictationSupport(code) {
  const SR = Recognition();
  if (!SR) return 'unsupported';
  if ('processLocally' in SR.prototype && typeof SR.available === 'function') {
    try { if (await SR.available({ langs: [BCP47[code] || 'en-US'], processLocally: true }) === 'available') return 'available'; } catch {}
  }
  return 'browser'; // Browser-managed recognition may use the provider's external service.
}
export function dictationMessage(detail) {
  if (detail === 'permission') return T('Microphone permission denied. Typing still works.', 'Accès au micro refusé. L’écrit fonctionne toujours.');
  if (detail === 'no-speech') return T('No speech detected. Try the microphone again or type your request.', 'Aucune parole détectée. Réessayez le micro ou écrivez votre demande.');
  if (detail === 'unsupported') return T('Speech recognition is unavailable in this browser. Type your request instead.', 'La reconnaissance vocale est indisponible dans ce navigateur. Écrivez votre demande.');
  if (detail === 'local') return T('Listening, on this device only', 'Écoute, sur cet appareil uniquement');
  if (detail === 'browser') return T('Listening — your browser provider may process audio.', 'Écoute — l’éditeur du navigateur peut traiter le son.');
  if (detail === 'preparing') return T('Preparing voice input…', 'Préparation de la saisie vocale…');
  return T('Voice input unavailable. Typing still works.', 'Saisie vocale indisponible. L’écrit fonctionne toujours.');
}
// Returns cancel immediately, including while capability detection/consent is pending.
export function startDictation({ code, onText, onState }) {
  let rec, done = false, timer;
  const finish = detail => { if (done) return; done = true; clearTimeout(timer); onState(detail ? 'error' : 'idle', detail); };
  const cancel = () => { finish(); rec?.abort(); };
  onState('preparing');
  (async () => {
    const support = await dictationSupport(code);
    if (done) return;
    if (support === 'unsupported') return finish('unsupported');
    if (support === 'browser' && !globalThis.confirm?.(T('Browser speech recognition may send audio to your browser provider for processing under its privacy policy. CORE does not receive or store audio. No Qwen download is needed. Continue?', 'La reconnaissance vocale du navigateur peut envoyer le son à son éditeur, selon sa politique de confidentialité. CORE ne reçoit ni ne conserve le son. Aucun téléchargement de Qwen n’est nécessaire. Continuer ?'))) return finish();
    if (done) return;
    const SR = Recognition(); rec = new SR();
    if ('processLocally' in rec) rec.processLocally = support === 'available';
    rec.lang = BCP47[code] || 'en-US'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 5;
    rec.onstart = () => { if (!done) onState('listening', support === 'available' ? 'local' : 'browser'); };
    rec.onresult = e => {
      if (done) return;
      const results = Array.from(e.results), text = results.map(r => r[0].transcript).join(' ').trim();
      const final = results.length > 0 && results.every(r => r.isFinal);
      if (!text) return;
      if (final) { finish(); rec.abort(); }
      // Keep provider alternatives intact; confidence is provider-specific, never proof of what was said.
      const alternatives = Array.from({ length: Math.min(5, Math.max(...results.map(r => r.length))) }, (_, i) => ({
        text: results.map(r => (r[i] || r[0]).transcript).join(' ').trim(),
        confidence: results.every(r => Number.isFinite((r[i] || r[0]).confidence)) ? Math.min(...results.map(r => (r[i] || r[0]).confidence)) : null
      })).filter((a, i, all) => a.text && all.findIndex(b => b.text === a.text) === i);
      onText(text, final, { language: rec.lang, alternatives });
    };
    rec.onerror = e => { if (!done) { finish(['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error) ? 'permission' : e.error); rec.abort(); } };
    rec.onend = () => finish('no-speech');
    timer = setTimeout(() => { finish('no-speech'); rec.abort(); }, 20000);
    rec.start();
  })().catch(() => { finish('recognition'); rec?.abort(); });
  return cancel;
}
