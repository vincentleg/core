// CORE V8 — interface strings. English is the reference. Other languages: drafts by the coding model, NOT reviewed by
// native speakers (see STATUS in i18n.mjs); any missing key falls back to English.
const en = {
  'nav.explore': 'Explore', 'nav.create': 'Create', 'nav.together': 'Together', 'nav.me': 'My CORE', 'nav.trust': 'TRUST', 'nav.journey': 'Journey',
  'nav.proto': 'LOCAL PROTOTYPE', 'nav.manifesto': 'Manifesto', 'nav.demo': 'Experience CORE', 'nav.progress': 'Progress', 'nav.language': 'Language', 'nav.voice': 'Companion (voice or text)', 'nav.main': 'Main navigation',
  'cmp.title': 'CORE companion', 'cmp.intro': 'Say or type what you want to do. I only perform actions from a fixed list, and I never share, delete or publish anything for you.',
  'cmp.placeholder': 'e.g. “show the bus lane simulation”', 'cmp.do': 'Go', 'cmp.mic': 'Speak', 'cmp.mic_stop': 'Stop listening', 'cmp.listening': 'Listening — on this device only',
  'cmp.mic_unavailable': 'Voice input needs on-device speech recognition, which this browser does not offer. Typing works everywhere; no audio is ever sent to a server.',
  'cmp.mic_permission': 'Your browser will ask for microphone permission. Audio stays on this device; nothing is recorded or kept.',
  'cmp.speak': 'Read answers aloud (device voices only)', 'cmp.not_understood': 'I did not understand. Try one of the examples below.', 'cmp.invalid': 'I could not do that: {reason}.',
  'cmp.confirm': 'This needs your own explicit action.', 'cmp.open': 'Open the page', 'cmp.examples': 'Examples', 'cmp.close': 'Close', 'cmp.history': 'What I did',
  'cmp.ex1': 'Go to Folsom Street', 'cmp.ex2': 'Play the traffic signal simulation', 'cmp.ex3': 'Compare scenarios', 'cmp.ex4': 'Open the mobility mission', 'cmp.ex5': 'Show the agents layer', 'cmp.ex6': 'Switch language to Spanish',
  'act.navigate_to_place': 'Going to {place}.', 'act.find_agent': 'Here is {code}, {role}.', 'act.follow_agent': 'Following {code}.', 'act.open_mission': 'Opening the mission: {title}.',
  'act.switch_world_layer': 'Layer: {layer}.', 'act.ask_agent': 'Opening a conversation with {code}. Your question is pre-filled, not sent.',
  'act.start_simulation': 'Replaying the recorded simulation ({scenario}). It is an uncalibrated model, not a prediction.', 'act.compare_scenarios': 'Here is the comparison of the recorded scenarios, with their uncertainty.',
  'act.open_report': 'Opening the report for {title}.', 'act.open_profile': 'Opening My CORE.', 'act.change_language': 'Language: {lang}.',
  'act.share_contribution': 'Sharing always needs your own explicit choice. Nothing has been shared.', 'act.delete_my_data': 'Deleting data needs your own confirmation in TRUST. Nothing has been deleted.',
  'lang.draft': 'Draft translation, not yet reviewed by a native speaker. English is the reference.',
};
const fr = {
  'nav.explore': 'Explorer', 'nav.create': 'Créer', 'nav.together': 'Ensemble', 'nav.me': 'Mon CORE', 'nav.trust': 'TRUST', 'nav.journey': 'Parcours',
  'nav.proto': 'PROTOTYPE LOCAL', 'nav.manifesto': 'Manifeste', 'nav.demo': 'Découvrir CORE', 'nav.progress': 'Progrès', 'nav.language': 'Langue', 'nav.voice': 'Compagnon (voix ou texte)', 'nav.main': 'Navigation principale',
  'cmp.title': 'Compagnon CORE', 'cmp.intro': 'Dites ou écrivez ce que vous voulez faire. Je n’exécute que des actions d’une liste fixe, et je ne partage, ne supprime ni ne publie rien à votre place.',
  'cmp.placeholder': 'ex. « montre la simulation de la voie de bus »', 'cmp.do': 'Aller', 'cmp.mic': 'Parler', 'cmp.mic_stop': 'Arrêter l’écoute', 'cmp.listening': 'Écoute — sur cet appareil uniquement',
  'cmp.mic_unavailable': 'La voix exige une reconnaissance vocale sur l’appareil, que ce navigateur ne propose pas. L’écrit fonctionne partout ; aucun son n’est jamais envoyé à un serveur.',
  'cmp.mic_permission': 'Votre navigateur va demander l’accès au micro. Le son reste sur cet appareil ; rien n’est enregistré ni conservé.',
  'cmp.speak': 'Lire les réponses à voix haute (voix de l’appareil uniquement)', 'cmp.not_understood': 'Je n’ai pas compris. Essayez un des exemples ci-dessous.', 'cmp.invalid': 'Impossible : {reason}.',
  'cmp.confirm': 'Cette action exige votre propre geste explicite.', 'cmp.open': 'Ouvrir la page', 'cmp.examples': 'Exemples', 'cmp.close': 'Fermer', 'cmp.history': 'Ce que j’ai fait',
  'cmp.ex1': 'Va à Folsom Street', 'cmp.ex2': 'Rejoue la simulation des feux', 'cmp.ex3': 'Compare les scénarios', 'cmp.ex4': 'Ouvre la mission mobilité', 'cmp.ex5': 'Affiche la couche agents', 'cmp.ex6': 'Change la langue en espagnol',
  'act.navigate_to_place': 'Direction {place}.', 'act.find_agent': 'Voici {code}, {role}.', 'act.follow_agent': 'Je suis {code}.', 'act.open_mission': 'Ouverture de la mission : {title}.',
  'act.switch_world_layer': 'Couche : {layer}.', 'act.ask_agent': 'Conversation avec {code} ouverte. Votre question est préremplie, pas envoyée.',
  'act.start_simulation': 'Relecture de la simulation enregistrée ({scenario}). Modèle non calibré, pas une prévision.', 'act.compare_scenarios': 'Voici la comparaison des scénarios enregistrés, avec leur incertitude.',
  'act.open_report': 'Ouverture du rapport : {title}.', 'act.open_profile': 'Ouverture de Mon CORE.', 'act.change_language': 'Langue : {lang}.',
  'act.share_contribution': 'Partager exige toujours votre propre choix explicite. Rien n’a été partagé.', 'act.delete_my_data': 'Supprimer des données exige votre confirmation dans TRUST. Rien n’a été supprimé.',
  'lang.draft': 'Traduction provisoire, non relue par une personne de langue maternelle. L’anglais fait référence.',
};
const es = {
  'nav.explore': 'Explorar', 'nav.create': 'Crear', 'nav.together': 'Juntos', 'nav.me': 'Mi CORE', 'nav.journey': 'Recorrido', 'nav.proto': 'PROTOTIPO LOCAL', 'nav.manifesto': 'Manifiesto', 'nav.demo': 'Descubrir CORE', 'nav.progress': 'Progreso', 'nav.language': 'Idioma', 'nav.voice': 'Compañero (voz o texto)', 'nav.main': 'Navegación principal',
  'cmp.title': 'Compañero CORE', 'cmp.intro': 'Di o escribe lo que quieres hacer. Solo ejecuto acciones de una lista fija y nunca comparto, borro ni publico nada por ti.', 'cmp.placeholder': 'p. ej. «muestra la simulación del carril bus»', 'cmp.do': 'Ir', 'cmp.mic': 'Hablar', 'cmp.mic_stop': 'Dejar de escuchar', 'cmp.listening': 'Escuchando — solo en este dispositivo',
  'cmp.mic_unavailable': 'La voz requiere reconocimiento en el dispositivo, que este navegador no ofrece. Escribir funciona siempre; nunca se envía audio a un servidor.', 'cmp.not_understood': 'No lo entendí. Prueba uno de los ejemplos.', 'cmp.confirm': 'Esto requiere tu propia acción explícita.', 'cmp.open': 'Abrir la página', 'cmp.examples': 'Ejemplos', 'cmp.close': 'Cerrar',
  'act.navigate_to_place': 'Vamos a {place}.', 'act.open_mission': 'Abriendo la misión: {title}.', 'act.start_simulation': 'Reproduciendo la simulación grabada ({scenario}). Es un modelo no calibrado, no una predicción.', 'act.change_language': 'Idioma: {lang}.',
  'lang.draft': 'Traducción provisional, aún no revisada por una persona nativa. El inglés es la referencia.',
};
const pt = {
  'nav.explore': 'Explorar', 'nav.create': 'Criar', 'nav.together': 'Juntos', 'nav.me': 'Meu CORE', 'nav.journey': 'Percurso', 'nav.proto': 'PROTÓTIPO LOCAL', 'nav.manifesto': 'Manifesto', 'nav.demo': 'Conhecer o CORE', 'nav.progress': 'Progresso', 'nav.language': 'Idioma', 'nav.voice': 'Companheiro (voz ou texto)', 'nav.main': 'Navegação principal',
  'cmp.title': 'Companheiro CORE', 'cmp.intro': 'Diga ou escreva o que quer fazer. Só executo ações de uma lista fixa e nunca partilho, apago ou publico nada por si.', 'cmp.do': 'Ir', 'cmp.mic': 'Falar', 'cmp.listening': 'A ouvir — apenas neste dispositivo', 'cmp.not_understood': 'Não percebi. Experimente um dos exemplos.', 'cmp.close': 'Fechar', 'cmp.examples': 'Exemplos',
  'act.change_language': 'Idioma: {lang}.', 'lang.draft': 'Tradução provisória, ainda não revista por um falante nativo. O inglês é a referência.',
};
const zh = {
  'nav.explore': '探索', 'nav.create': '创造', 'nav.together': '协作', 'nav.me': '我的 CORE', 'nav.journey': '旅程', 'nav.proto': '本地原型', 'nav.manifesto': '宣言', 'nav.demo': '体验 CORE', 'nav.progress': '进展', 'nav.language': '语言', 'nav.voice': '助手（语音或文字）', 'nav.main': '主导航',
  'cmp.title': 'CORE 助手', 'cmp.intro': '说出或输入你想做的事。我只执行固定列表中的操作，绝不替你分享、删除或发布任何内容。', 'cmp.do': '执行', 'cmp.mic': '说话', 'cmp.listening': '正在聆听——仅在本设备上', 'cmp.not_understood': '我没有听懂。请试试下面的示例。', 'cmp.close': '关闭', 'cmp.examples': '示例',
  'act.change_language': '语言：{lang}。', 'lang.draft': '草稿译文，尚未经母语者审校。以英文为准。',
};
const hi = {
  'nav.explore': 'खोजें', 'nav.create': 'रचें', 'nav.together': 'साथ मिलकर', 'nav.me': 'मेरा CORE', 'nav.journey': 'यात्रा', 'nav.proto': 'स्थानीय प्रोटोटाइप', 'nav.manifesto': 'घोषणापत्र', 'nav.demo': 'CORE का अनुभव करें', 'nav.progress': 'प्रगति', 'nav.language': 'भाषा', 'nav.voice': 'साथी (आवाज़ या टेक्स्ट)', 'nav.main': 'मुख्य नेविगेशन',
  'cmp.title': 'CORE साथी', 'cmp.do': 'जाएँ', 'cmp.mic': 'बोलें', 'cmp.close': 'बंद करें', 'cmp.examples': 'उदाहरण', 'act.change_language': 'भाषा: {lang}।', 'lang.draft': 'मसौदा अनुवाद, अभी किसी मूल भाषी द्वारा जाँचा नहीं गया। अंग्रेज़ी संदर्भ है।',
};
const ar = {
  'nav.explore': 'استكشف', 'nav.create': 'أنشئ', 'nav.together': 'معًا', 'nav.me': 'CORE الخاص بي', 'nav.journey': 'المسار', 'nav.proto': 'نموذج أولي محلي', 'nav.manifesto': 'البيان', 'nav.demo': 'اكتشف CORE', 'nav.progress': 'التقدّم', 'nav.language': 'اللغة', 'nav.voice': 'المرافق (صوت أو نص)', 'nav.main': 'التنقل الرئيسي',
  'cmp.title': 'مرافق CORE', 'cmp.intro': 'قل أو اكتب ما تريد فعله. أنفّذ فقط إجراءات من قائمة ثابتة، ولا أشارك أو أحذف أو أنشر أي شيء نيابةً عنك.', 'cmp.do': 'تنفيذ', 'cmp.mic': 'تحدّث', 'cmp.listening': 'أستمع — على هذا الجهاز فقط', 'cmp.not_understood': 'لم أفهم. جرّب أحد الأمثلة أدناه.', 'cmp.close': 'إغلاق', 'cmp.examples': 'أمثلة',
  'act.change_language': 'اللغة: {lang}.', 'lang.draft': 'ترجمة مبدئية لم يراجعها بعد متحدث أصلي. الإنجليزية هي المرجع.',
};
const bn = {
  'nav.explore': 'অন্বেষণ', 'nav.create': 'সৃষ্টি', 'nav.together': 'একসাথে', 'nav.me': 'আমার CORE', 'nav.journey': 'যাত্রা', 'nav.proto': 'স্থানীয় প্রোটোটাইপ', 'nav.manifesto': 'ইশতেহার', 'nav.demo': 'CORE অভিজ্ঞতা', 'nav.progress': 'অগ্রগতি', 'nav.language': 'ভাষা', 'nav.voice': 'সঙ্গী (কণ্ঠ বা লেখা)', 'nav.main': 'প্রধান নেভিগেশন',
  'cmp.title': 'CORE সঙ্গী', 'cmp.do': 'যান', 'cmp.mic': 'বলুন', 'cmp.close': 'বন্ধ', 'cmp.examples': 'উদাহরণ', 'act.change_language': 'ভাষা: {lang}।', 'lang.draft': 'খসড়া অনুবাদ, এখনও কোনো মাতৃভাষী পর্যালোচনা করেননি। ইংরেজিই রেফারেন্স।',
};
const ru = {
  'nav.explore': 'Исследовать', 'nav.create': 'Создавать', 'nav.together': 'Вместе', 'nav.me': 'Мой CORE', 'nav.journey': 'Маршрут', 'nav.proto': 'ЛОКАЛЬНЫЙ ПРОТОТИП', 'nav.manifesto': 'Манифест', 'nav.demo': 'Знакомство с CORE', 'nav.progress': 'Прогресс', 'nav.language': 'Язык', 'nav.voice': 'Помощник (голос или текст)', 'nav.main': 'Основная навигация',
  'cmp.title': 'Помощник CORE', 'cmp.intro': 'Скажите или напишите, что хотите сделать. Я выполняю только действия из фиксированного списка и никогда не делюсь, не удаляю и не публикую ничего за вас.', 'cmp.do': 'Выполнить', 'cmp.mic': 'Говорить', 'cmp.listening': 'Слушаю — только на этом устройстве', 'cmp.not_understood': 'Я не понял. Попробуйте один из примеров.', 'cmp.close': 'Закрыть', 'cmp.examples': 'Примеры',
  'act.change_language': 'Язык: {lang}.', 'lang.draft': 'Черновой перевод, ещё не проверенный носителем языка. Эталон — английский.',
};
const ja = {
  'nav.explore': '探索', 'nav.create': '創る', 'nav.together': 'みんなで', 'nav.me': 'マイ CORE', 'nav.journey': '旅程', 'nav.proto': 'ローカル試作版', 'nav.manifesto': 'マニフェスト', 'nav.demo': 'CORE を体験', 'nav.progress': '進捗', 'nav.language': '言語', 'nav.voice': 'コンパニオン（音声または文字）', 'nav.main': 'メインナビゲーション',
  'cmp.title': 'CORE コンパニオン', 'cmp.intro': 'やりたいことを話すか入力してください。決められた一覧の操作だけを行い、あなたの代わりに共有・削除・公開することはありません。', 'cmp.do': '実行', 'cmp.mic': '話す', 'cmp.listening': '聞き取り中 — この端末内のみ', 'cmp.not_understood': '理解できませんでした。下の例を試してください。', 'cmp.close': '閉じる', 'cmp.examples': '例',
  'act.change_language': '言語：{lang}。', 'lang.draft': '翻訳の草稿で、まだネイティブスピーカーの確認を受けていません。英語が基準です。',
};
export const STRINGS = { en, fr, es, pt, 'zh-Hans': zh, hi, ar, bn, ru, ja };
