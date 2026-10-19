// Head-loaded without map imports: capture the first click before the application is ready.
(() => {
  let launch=null, requested=false, running=false, error=null;
  const entries='#ea-demo-cta, [data-demo]';
  function paint() {
    for(const el of document.querySelectorAll(entries))el.setAttribute('aria-busy',String(requested||running));
    const status=document.getElementById('ea-demo-loading');if(!status)return;
    status.hidden=!(requested||running||error);
    const fr=document.documentElement.lang==='fr';
    status.textContent=error?(fr?'Démo indisponible. Rechargez pour réessayer. ':'Demo unavailable. Reload to try again. ')+error:(fr?'Chargement de CORE… la visite démarrera automatiquement.':'Loading CORE… your tour will start automatically.');
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
