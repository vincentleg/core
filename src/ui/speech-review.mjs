import { lang, LANGS } from '../i18n/i18n.mjs';

const LABELS = {
  en: ['Speech language', 'Same as interface', 'Review or edit the transcript, then send. Browser recognition can mishear place names.', 'Recognition alternatives'],
  fr: ['Langue du micro', 'Comme l’interface', 'Vérifiez ou corrigez le texte, puis envoyez. Le navigateur peut mal reconnaître les noms de lieux.', 'Autres transcriptions'],
  es: ['Idioma del micrófono', 'Igual que la interfaz', 'Revise o edite el texto y envíelo. El navegador puede confundir nombres de lugares.', 'Otras transcripciones'],
  de: ['Sprache des Mikrofons', 'Wie die Oberfläche', 'Prüfen oder bearbeiten Sie den Text und senden Sie ihn. Der Browser kann Ortsnamen falsch verstehen.', 'Andere Transkriptionen'],
  'zh-CN': ['语音语言', '与界面相同', '请检查或修改转写，然后发送。浏览器可能误识别地名。', '其他识别结果'],
  pt: ['Idioma do microfone', 'Igual à interface', 'Reveja ou edite o texto e envie. O navegador pode confundir nomes de lugares.', 'Outras transcrições']
};

// Shared by both input surfaces. Nothing is submitted or geocoded until the user presses Send.
export function speechReview(input, form, cancel) {
  const box = document.createElement('div'); box.className = 'speech-review';
  const label = document.createElement('label'), select = document.createElement('select');
  select.dataset.speechLanguage = '';
  const message = document.createElement('p'), alternatives = document.createElement('div');
  message.setAttribute('role', 'status'); message.hidden = true;
  alternatives.className = 'speech-alternatives'; alternatives.setAttribute('role', 'group'); label.append(select); box.append(label, message, alternatives); form.after(box);
  const reset = () => { message.hidden = true; alternatives.replaceChildren(); };
  function translate() {
    cancel(); const value = select.value, labels = LABELS[lang()] || LABELS.en;
    select.replaceChildren(...[['', labels[1]], ...LANGS.map(([c, n]) => [c, n])].map(([code, name]) => { const o = document.createElement('option'); o.value = code; o.textContent = name; return o; }));
    select.value = value || ''; select.setAttribute('aria-label', labels[0]); label.replaceChildren(document.createTextNode(labels[0] + ' '), select);
    reset(); alternatives.setAttribute('aria-label', labels[3]);
  }
  select.onchange = () => { cancel(); reset(); };
  input.addEventListener('input', reset); form.addEventListener('submit', () => { cancel(); reset(); });
  document.addEventListener('core:lang', translate); translate();
  return {
    code: () => select.value || lang(),
    clear: reset,
    languageControl: label,
    receive(text, final, detail) {
      input.value = text;
      if (!final) return;
      message.textContent = (LABELS[lang()] || LABELS.en)[2]; message.hidden = false;
      alternatives.replaceChildren(...(detail?.alternatives || []).slice(1).map(a => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = a.text;
        b.onclick = () => { input.value = a.text; input.focus(); }; return b;
      }));
      input.focus();
    },
    dispose() { cancel(); document.removeEventListener('core:lang', translate); box.remove(); }
  };
}
