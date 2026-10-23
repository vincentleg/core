// Head-loaded without map imports: capture the first click before the application is ready.
(() => {
  let launch=null, requested=false, running=false, error=null;
  const entries='#ea-demo-cta, [data-demo]';
  function paint() {
    for(const el of document.querySelectorAll(entries))el.setAttribute('aria-busy',String(requested||running));
    const status=document.getElementById('ea-demo-loading');if(!status)return;
    status.hidden=!(requested||running||error);
    const M={en:['Demo unavailable. Reload to try again. ','Loading CORE… your tour will start automatically.'],fr:['Démo indisponible. Rechargez pour réessayer. ','Chargement de CORE… la visite démarrera automatiquement.'],es:['Demostración no disponible. Recargue para intentarlo de nuevo. ','Cargando CORE… la visita comenzará automáticamente.'],de:['Demo nicht verfügbar. Zum erneuten Versuch neu laden. ','CORE wird geladen… Ihre Tour startet automatisch.'],'zh-CN':['演示不可用。请重新加载后再试。','正在加载 CORE……导览将自动开始。'],pt:['Demonstração indisponível. Recarregue para tentar novamente. ','Carregando o CORE… sua visita começará automaticamente.']};
    const m=M[document.documentElement.lang]||M.en;
    status.textContent=error?m[0]+error:m[1];
  }
  function fail(e) { error=String(e?.message||e);requested=false;running=false;paint(); }
  async function flush() {
    if(!requested||running||!launch)return;
    running=true;
    try { await launch(); } catch(e) { fail(e); }
    finally { requested=false;running=false;paint(); }
  }
  function request() {
    if(requested||running||(!document.getElementById('ea-panel')?.hidden&&document.querySelector('.urban-tour')))return;
    if(error){paint();return;}
    requested=true;paint();flush();
  }
  globalThis.CORE_DEMO=Object.freeze({request,fail,ready(fn){if(typeof fn!=='function')throw Error('Demo launcher required');launch=fn;error=null;flush();}});
  document.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||!e.target.closest?.(entries))return;
    e.preventDefault();request();
  });
  document.addEventListener('readystatechange',paint);
  document.addEventListener('core:lang',paint);
  if(new URLSearchParams(location.hash.slice(1)).has('demo'))request();
})();
