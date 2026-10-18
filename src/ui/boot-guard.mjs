// CORE boot guard (V9.1). Loaded as a classic script in <head>, before the page's modules, so that it sees their failures.
// The page names its readiness global in <meta name="core-ready" content="CORE_…">. The guard tells apart:
//  • a file that was not received (a module graph or stylesheet `error` event) or an uncaught error before the page is
//    ready: the failure is named on screen with a Reload button. A file that failed to load is retried once
//    automatically (network hiccups, the development server resetting connections); the recovered page then says so.
//  • a page that is merely slow (its data still downloading): a polite "Still loading" status, never a reload; after 45 s
//    it offers a reload without forcing one.
// Language follows the visitor's choice (localStorage core.lang), English by default. No dependencies.
(() => {
  const name = document.querySelector('meta[name="core-ready"]')?.content;
  if (!name) return;
  const fr = (() => { try { return localStorage.getItem('core.lang') === 'fr'; } catch { return false; } })();
  const T = (en, f) => (fr ? f : en);
  const key = `core.boot-retry:${location.pathname}`, started = Date.now(), failures = [];
  let box = null, done = false;
  const session = (fn) => { try { return fn(sessionStorage); } catch { return null; } };
  const short = (u) => { try { const x = new URL(u, location.href); return x.origin === location.origin ? x.pathname.replace(/^\//, '') : x.host + x.pathname; } catch { return String(u); } };

  addEventListener('error', (e) => {
    if (done) return;
    const el = e.target;
    if (el && el !== window && (el.tagName === 'SCRIPT' || el.tagName === 'LINK')) failures.push({ load: true, what: short(el.src || el.href), at: Date.now() });
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
    if (reload) { const b = document.createElement('button'); b.type = 'button'; b.textContent = T('Reload', 'Recharger'); b.style.cssText = 'margin-left:10px'; b.onclick = () => location.reload(); box.append(' ', b); }
  };
  const clear = (note) => { if (note) { show('status', note); setTimeout(() => box?.remove(), 8000); } else box?.remove(); };

  const tick = () => {
    if (globalThis[name]) {
      done = true;
      const retried = session((s) => s.getItem(key)); session((s) => s.removeItem(key));
      return clear(retried ? T(`Loaded after one automatic retry (${retried} was not received the first time).`, `Chargée après une nouvelle tentative automatique (${retried} n’avait pas été reçu la première fois).`) : null);
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
        ? T(`This page could not start: ${f.what} (or a file it needs) was not received. Check your connection, then reload.`, `Cette page n’a pas pu démarrer : ${f.what} (ou un fichier dont il dépend) n’a pas été reçu. Vérifiez votre connexion, puis rechargez.`)
        : T(`This page could not start because of an error: ${f.what}`, `Cette page n’a pas pu démarrer à cause d’une erreur : ${f.what}`), true);
    }
    if (s >= 45) show('status', T(`Still loading after ${s} s. Your connection may be slow; you can keep waiting or reload.`, `Chargement toujours en cours après ${s} s. Votre connexion est peut-être lente ; vous pouvez patienter ou recharger.`), true);
    else if (s >= 8) show('status', T(`Still loading CORE data… ${s} s`, `Chargement des données de CORE… ${s} s`));
    setTimeout(tick, s >= 8 ? 1000 : 500);
  };
  // Give the page's modules a moment: most pages are ready well before the first status would appear.
  setTimeout(tick, 1500);
})();
