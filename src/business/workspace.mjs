import { render } from '../shell/nav.mjs';
import { T, onLang } from '../i18n/i18n.mjs';
// Public CORE Business page. Organization projects are private by design: no client, prospect, building, model or
// metric is shipped here, and no private project is used as a public demonstration.
const root = document.getElementById('business-main');
const e = (tag, text) => { const n = document.createElement(tag); if (text != null) n.textContent = text; return n; };
const link = (text, href) => { const a = e('a', text); a.href = href; a.className = 'btn'; return a; };
function draw() {
  render(document.getElementById('core-nav'), { active: 'business' }); root.replaceChildren();
  root.append(e('p', 'CORE BUSINESS'), e('h1', T('Private intelligence for organizations', 'Une intelligence privée pour les organisations')));
  const card = e('section'); card.className = 'business-card';
  card.append(e('h2', T('How organization workspaces work', 'Fonctionnement des espaces d’organisation')));
  for (const line of [
    T('Each organization works in a private workspace with its own agents, evidence, scenarios and reports.', 'Chaque organisation travaille dans un espace privé avec ses propres agents, preuves, scénarios et rapports.'),
    T('Private projects never become public civic knowledge automatically, and are never used as public demonstrations.', 'Les projets privés ne deviennent jamais automatiquement des connaissances civiques publiques et ne servent jamais de démonstrations publiques.'),
    T('Business agents are distinct from public civic agents. A subscription never buys greater civic influence.', 'Les agents Business sont distincts des agents civiques publics. Un abonnement n’achète jamais plus d’influence civique.'),
    T('Scenario results are bounded and labelled as synthetic or uncalibrated until evidence supports them; a person authorizes any real action.', 'Les résultats de scénario sont bornés et signalés comme synthétiques ou non calibrés tant que des preuves ne les étayent pas ; une personne autorise toute action réelle.')
  ]) card.append(e('p', line));
  root.append(card);
  const status = e('section'); status.className = 'business-card';
  status.append(e('h2', T('Availability', 'Disponibilité')), e('p', T('No public business demonstration and no paid plan is active. Private workspaces open only after a server-side authorization check in Mon CORE.', 'Aucune démonstration commerciale publique ni offre payante n’est active. Les espaces privés ne s’ouvrent qu’après une vérification d’autorisation côté serveur dans Mon CORE.')), link(T('Open Mon CORE', 'Ouvrir Mon CORE'), 'me.html'), link(T('Explore CORE World', 'Explorer CORE World'), 'world.html'));
  root.append(status);
}
draw(); onLang(draw);
