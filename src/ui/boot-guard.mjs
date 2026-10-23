// CORE boot guard (V9.1). Loaded as a classic script in <head>, before the page's modules, so that it sees their failures.
// The page names its readiness global in <meta name="core-ready" content="CORE_…">. The guard tells apart:
//  • a file that was not received (a module graph or stylesheet `error` event) or an uncaught error before the page is
//    ready: the failure is named on screen with a Reload button. A file that failed to load is retried once
//    automatically (network hiccups, the development server resetting connections); the recovered page then says so.
//  • a page that is merely slow (its data still downloading): a polite "Still loading" status, never a reload; after 45 s
//    it offers a reload without forcing one.
// Language follows the visitor's choice (localStorage core.lang), else the browser language; six languages. No dependencies.
(() => {
  const name = document.querySelector('meta[name="core-ready"]')?.content;
  if (!name) return;
  const code = (() => { try { const v = localStorage.getItem('core.lang'); if (v) return v; } catch {} const p = (navigator.language || 'en').toLowerCase(); return p.startsWith('zh') ? 'zh-CN' : p.split('-')[0]; })();
  // Six languages; templates use {0}. English is the fallback.
  const MSG = {
    Reload: { es: 'Recargar', de: 'Neu laden', 'zh-CN': '重新加载', pt: 'Recarregar' },
    'Loaded after one automatic retry ({0} was not received the first time).': { es: 'Cargada tras un reintento automático ({0} no se recibió la primera vez).', de: 'Nach einem automatischen erneuten Versuch geladen ({0} kam beim ersten Mal nicht an).', 'zh-CN': '自动重试一次后已加载（第一次未收到 {0}）。', pt: 'Carregada após uma nova tentativa automática ({0} não foi recebido na primeira vez).' },
    'This page could not start: {0} (or a file it needs) was not received. Check your connection, then reload.': { es: 'Esta página no pudo iniciarse: no se recibió {0} (o un archivo que necesita). Compruebe su conexión y vuelva a cargar.', de: 'Diese Seite konnte nicht starten: {0} (oder eine benötigte Datei) kam nicht an. Prüfen Sie Ihre Verbindung und laden Sie neu.', 'zh-CN': '此页面无法启动：未收到 {0}（或其所需的文件）。请检查网络连接后重新加载。', pt: 'Esta página não pôde iniciar: {0} (ou um arquivo de que precisa) não foi recebido. Verifique sua conexão e recarregue.' },
    'This page could not start because of an error: {0}': { es: 'Esta página no pudo iniciarse por un error: {0}', de: 'Diese Seite konnte wegen eines Fehlers nicht starten: {0}', 'zh-CN': '此页面因错误无法启动：{0}', pt: 'Esta página não pôde iniciar devido a um erro: {0}' },
    'Still loading after {0} s. Your connection may be slow; you can keep waiting or reload.': { es: 'Todavía cargando tras {0} s. Su conexión puede ser lenta; puede esperar o recargar.', de: 'Lädt noch nach {0} s. Ihre Verbindung ist eventuell langsam; Sie können warten oder neu laden.', 'zh-CN': '{0} 秒后仍在加载。您的网络可能较慢；可以继续等待或重新加载。', pt: 'Ainda carregando após {0} s. Sua conexão pode estar lenta; você pode aguardar ou recarregar.' },
    'Started with a problem: {0}. The rest of the page works; reload to retry.': { es: 'Iniciada con un problema: {0}. El resto de la página funciona; recargue para reintentar.', de: 'Mit einem Problem gestartet: {0}. Der Rest der Seite funktioniert; zum erneuten Versuch neu laden.', 'zh-CN': '启动时出现问题：{0}。页面其余部分可正常使用；请重新加载以重试。', pt: 'Iniciada com um problema: {0}. O restante da página funciona; recarregue para tentar novamente.' },
    'Still loading CORE data… {0} s': { es: 'Cargando los datos de CORE… {0} s', de: 'CORE-Daten werden geladen… {0} s', 'zh-CN': '正在加载 CORE 数据…… {0} 秒', pt: 'Carregando os dados do CORE… {0} s' },
  };
  const T = (en, f, key, v = '') => code === 'fr' ? f : code !== 'en' && MSG[key]?.[code] ? MSG[key][code].replace('{0}', v) : en;
  const key = `core.boot-retry:${location.pathname}`, started = Date.now(), failures = [];
  let box = null, done = false;
  const session = (fn) => { try { return fn(sessionStorage); } catch { return null; } };
  const short = (u) => { try { const x = new URL(u, location.href); return x.origin === location.origin ? x.pathname.replace(/^\//, '') : x.host + x.pathname; } catch { return String(u); } };

  addEventListener('error', (e) => {
    if (done) return;
    const el = e.target;
    if (el && el !== window && (el.tagName === 'SCRIPT' || el.tagName === 'LINK')) failures.push({ load: true, what: short(el.src || el.href), at: Date.now() });
    // Browsers report this benign layout warning as an error event; it is not a page failure.
    else if (e.message && /ResizeObserver loop/.test(e.message)) return;
    else if (e.message) failures.push({ load: false, what: `${e.message}${e.filename ? ` (${short(e.filename)}:${e.lineno})` : ''}`, at: Date.now() });
    else return;
    console.warn(`CORE boot: ${failures.at(-1).what}`);
  }, true);
  addEventListener('unhandledrejection', (e) => { if (!done) failures.push({ load: false, what: String(e.reason?.message || e.reason).slice(0, 200), at: Date.now() }); });

  const show = (role, text, reload) => {
    if (!document.body) return;
    if (!box) {
      box = document.createElement('div'); box.className = 'le-boot';
      box.style.cssText = 'position:fixed;z-index:60;left:50%;bottom:24px;transform:translateX(-50%);max-width:min(560px,calc(100vw - 32px));padding:12px 16px;border-radius:12px;font:14px/1.45 system-ui,sans-serif;color:#eef3f8;background:#0b1422;border:1px solid #2b3a4f;box-shadow:0 8px 30px rgba(0,0,0,.5)';
      document.body.append(box);
    }
    box.setAttribute('role', role);
    if (role === 'alert') { box.style.background = '#2a1015'; box.style.borderColor = '#7a2e3a'; box.style.top = '40%'; box.style.bottom = 'auto'; }
    box.textContent = text;
    if (reload) { const b = document.createElement('button'); b.type = 'button'; b.textContent = T('Reload', 'Recharger', 'Reload'); b.style.cssText = 'margin-left:10px'; b.onclick = () => location.reload(); box.append(' ', b); }
  };
  const clear = (note) => { if (note) { show('status', note); setTimeout(() => box?.remove(), 8000); } else box?.remove(); };

  const tick = () => {
    // World exposes its global before asynchronous map/data and Intelligence startup have completed.
    // World started but its command bar could not load its data: a degraded start, named without blocking the map.
    const degraded = name === 'CORE_EARTH' && globalThis[name]?.state?.ready && !globalThis.CORE_INTELLIGENCE?.engine && globalThis.CORE_INTELLIGENCE?.failed;
    if (degraded) { done = true; session((s2) => s2.removeItem(key)); return show('status', T(`Started with a problem: ${degraded}. The rest of the page works; reload to retry.`, `Démarrée avec un problème : ${degraded}. Le reste de la page fonctionne ; rechargez pour réessayer.`, 'Started with a problem: {0}. The rest of the page works; reload to retry.', degraded), true); }
    if (globalThis[name] && (name !== 'CORE_EARTH' || (globalThis[name].state?.ready && globalThis.CORE_INTELLIGENCE?.engine))) {
      done = true;
      const retried = session((s) => s.getItem(key)); session((s) => s.removeItem(key));
      return clear(retried ? T(`Loaded after one automatic retry (${retried} was not received the first time).`, `Chargée après une nouvelle tentative automatique (${retried} n’avait pas été reçu la première fois).`, 'Loaded after one automatic retry ({0} was not received the first time).', retried) : null);
    }
    const s = Math.round((Date.now() - started) / 1000);
    // A failure only counts if the page is still not ready 3 s later (a non-essential stylesheet or a caught-later error
    // must not block a page that starts anyway; every failure is still logged to the console above).
    if (failures.length && Date.now() - failures[0].at >= 3000) {
      const load = failures.find((f) => f.load);
      if (load && !session((s2) => s2.getItem(key))) { session((s2) => s2.setItem(key, load.what)); console.warn(`CORE: ${load.what} was not received; retrying once.`); location.reload(); return; }
      done = true; session((s2) => s2.removeItem(key));
      const f = load || failures[0];
      return show('alert', load
        ? T(`This page could not start: ${f.what} (or a file it needs) was not received. Check your connection, then reload.`, `Cette page n’a pas pu démarrer : ${f.what} (ou un fichier dont il dépend) n’a pas été reçu. Vérifiez votre connexion, puis rechargez.`, 'This page could not start: {0} (or a file it needs) was not received. Check your connection, then reload.', f.what)
        : T(`This page could not start because of an error: ${f.what}`, `Cette page n’a pas pu démarrer à cause d’une erreur : ${f.what}`, 'This page could not start because of an error: {0}', f.what), true);
    }
    if (s >= 45) show('status', T(`Still loading after ${s} s. Your connection may be slow; you can keep waiting or reload.`, `Chargement toujours en cours après ${s} s. Votre connexion est peut-être lente ; vous pouvez patienter ou recharger.`, 'Still loading after {0} s. Your connection may be slow; you can keep waiting or reload.', s), true);
    else if (s >= 8) show('status', T(`Still loading CORE data… ${s} s`, `Chargement des données de CORE… ${s} s`, 'Still loading CORE data… {0} s', s));
    setTimeout(tick, s >= 8 ? 1000 : 500);
  };
  // Give the page's modules a moment: most pages are ready well before the first status would appear.
  setTimeout(tick, 1500);
})();
