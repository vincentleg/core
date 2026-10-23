// Founder-private extensions. The public build ships only this generic loader: no private file, name or record.
// Private modules are served solely by the loopback founder server (scripts/founder-server.mjs) after its server-side
// session check; a public host has no /api/founder/ route and no /private/ files. The hint cookie below only avoids a
// pointless request on public pages — it grants nothing; the server refuses every private path without the session.
const LOCAL = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
const ID = /^[a-z0-9-]{1,40}$/;
let loaded = null;
const hinted = () => typeof document !== 'undefined' && document.cookie.split(';').some(c => c.trim() === 'core_private_hint=1');

// Exchanges the one-time capability printed by the founder server (#founder=<64 hex>) for its HttpOnly session.
export async function exchangeFounderCapability() {
  if (!LOCAL || !/^#founder=[a-f0-9]{64}$/.test(location.hash)) return false;
  const token = location.hash.slice(9); history.replaceState(null, '', location.pathname + location.search);
  const r = await fetch('/api/founder/session', { method: 'POST', headers: { 'x-core-founder': token }, credentials: 'same-origin', cache: 'no-store' }).catch(() => null);
  loaded = null; return !!r?.ok;
}

// Resolves to [{ id, title, module }] in an authorized local founder session, otherwise to [].
export function privateExtensions() {
  if (loaded) return loaded;
  loaded = (async () => {
    if (!LOCAL || !hinted()) return [];
    try {
      const r = await fetch('/api/founder/extensions', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) return [];
      const list = (await r.json()).extensions;
      if (!Array.isArray(list)) return [];
      const out = [];
      for (const x of list.filter(x => ID.test(x?.id)).slice(0, 20)) {
        try { out.push({ id: x.id, title: x.title, module: await import(`/private/${x.id}/index.mjs`) }); } catch (e) { console.error(e); }
      }
      return out;
    } catch { return []; }
  })();
  return loaded;
}
