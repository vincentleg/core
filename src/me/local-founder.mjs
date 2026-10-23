// Local founder workspace in Mon CORE. Renders only inside an authorized loopback founder session
// (scripts/founder-server.mjs); for every other visitor it renders nothing and embeds no private record or name.
import { T, onLang } from '../i18n/i18n.mjs';
import { exchangeFounderCapability, privateExtensions } from '../private/extensions.mjs';
export async function mountLocalFounder(anchor) {
  await exchangeFounderCapability();
  const extensions = await privateExtensions();
  let prospects = [];
  if (extensions.length) try {
    const r = await fetch('/api/founder/prospects', { credentials: 'same-origin', cache: 'no-store' });
    if (r.ok && r.headers.get('content-type')?.includes('application/json')) { const data = await r.json(); if (Array.isArray(data.prospects)) prospects = data.prospects; }
  } catch {}
  if (!extensions.length && !prospects.length) return;
  const root = document.createElement('section'); root.className = 'me-card wide'; root.id = 'founder-local'; anchor.before(root);
  const node = (tag, text) => Object.assign(document.createElement(tag), { textContent: text });
  const pick = v => (v && typeof v === 'object' ? T(v.en || '', v.fr || v.en || '') : String(v || ''));
  function render() {
    root.replaceChildren(node('h2', T('Private founder workspace · this computer', 'Espace fondateur privé · cet ordinateur')),
      node('p', T('Local session granted by the founder server on this computer (loopback capability, server-checked). It is not a verified online identity and nothing here is published.', 'Session locale accordée par le serveur fondateur de cet ordinateur (jeton local vérifié côté serveur). Ce n’est pas une identité en ligne vérifiée et rien ici n’est publié.')));
    if (extensions.length) {
      root.append(node('h3', T('Private projects', 'Projets privés')));
      for (const x of extensions) { const a = node('a', pick(x.title) || x.id); a.className = 'btn'; a.href = 'world.html#private/' + x.id; root.append(a); }
    }
    if (prospects.length) {
      root.append(node('h3', T('Private business pipeline', 'Pipeline commercial privé')));
      for (const p of prospects) root.append(node('p', [p.name || p.company, p.status, p.brief || p.opportunity].filter(Boolean).join(' · ')));
      root.append(node('p', T('Exploratory records only — not signed customers or commissioned projects unless the record says so.', 'Fiches exploratoires uniquement — ni clients signés ni projets commandés sauf mention contraire.')));
    }
  }
  render(); onLang(render);
}
