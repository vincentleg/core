// CORE boot guard (V7). Static pages load ~30 small ES modules. On a cold first visit, Python's development server
// (`python3 -m http.server`, listen backlog of 5) can reset a few of those connections, and one failed module leaves the
// page blank without any error. This guard has no dependencies: if the page's app has not started within 6 s, it reloads
// once (modules that did load are then cached); if that also fails, it explains what happened and offers a reload.
// The page names its readiness global in <meta name="core-ready" content="CORE_…">.
const name = document.querySelector('meta[name="core-ready"]')?.content;
if (name) {
  const key = `core.boot-retry:${location.pathname}`;
  setTimeout(() => {
    if (globalThis[name]) { try { sessionStorage.removeItem(key); } catch {} return; }
    let tried = false; try { tried = sessionStorage.getItem(key) === '1'; sessionStorage.setItem(key, '1'); } catch {}
    if (!tried) { location.reload(); return; }
    const box = document.createElement('div'); box.className = 'le-error'; box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;z-index:60;left:50%;top:40%;transform:translateX(-50%);max-width:520px;padding:16px 20px;background:#1a0f12;';
    box.textContent = 'Cette page n’a pas fini de charger (une partie des fichiers n’a pas été reçue du serveur local). ';
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Recharger'; b.onclick = () => location.reload(); box.append(b);
    document.body.append(box);
  }, 6000);
}
