// Speech is user-initiated. Browser/OS voices may be provider-managed; CORE sends no audio.
export function speechOutput({ onState = () => {} } = {}) {
  const api = globalThis.speechSynthesis;
  const supported = !!api && typeof globalThis.SpeechSynthesisUtterance === 'function';
  let current = null;
  const stop = () => { current = null; if (supported) api.cancel(); onState('idle'); };
  const speak = (text, code = 'en') => {
    if (!supported || !String(text || '').trim()) return false;
    stop();
    const utterance = new SpeechSynthesisUtterance(String(text).slice(0, 2000));
    utterance.lang = code === 'fr' ? 'fr-FR' : 'en-US';
    current = utterance;
    utterance.onstart = () => { if (current === utterance) onState('speaking'); };
    utterance.onend = utterance.onerror = () => { if (current === utterance) { current = null; onState('idle'); } };
    try { api.speak(utterance); return true; }
    catch { current = null; onState('idle'); return false; }
  };
  return { supported, speak, stop };
}
