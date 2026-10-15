# Privacy notice — revised DRAFT (not published)

**Status:** working draft, 2026-10-15.
- **Not published.** `privacy.html` is unchanged.
- Publishing requires founder approval and review by qualified counsel (LEGAL_DECISIONS_REQUIRED L1–L6, L8).
- Every factual statement below was checked against the code on branch `consolidation/phase9-13` (after MapLibre 6.11.2, D090).
- Bracketed **[OPEN — …]** items must not be filled with invented facts.

**Changes from the published notice (2026-10-14):**
1. It adds the two undisclosed `localStorage` keys.
2. It states that published city data can include property addresses and permittee/company names.
3. It separates what CORE knows from what third parties receive.
4. It makes no legal-basis or compliance claim.

---

## Confidentialité — prototype CORE (projet de texte)

Dernière mise à jour : [OPEN — date de publication]

**Responsable de la publication :** [OPEN — identité de l’éditeur, statut, pays et coordonnées à décider par le fondateur ; ne pas compléter sans décision]. Contact provisoire : le dépôt public github.com/vincentleg/core.

Cette page décrit le comportement réel du prototype public. Elle n’est pas un avis juridique et ne revendique aucune conformité (RGPD, CCPA/CPRA ou autre) tant qu’une revue juridique qualifiée n’a pas eu lieu.

### Ce que CORE ne fait pas
- Aucun compte, aucune inscription, aucun formulaire transmis à un serveur.
- Aucun cookie, aucune mesure d’audience, aucun pisteur publicitaire, aucune empreinte de navigateur.
- Aucun serveur applicatif : le site est statique (GitHub Pages).
- Aucun modèle d’IA ne s’exécute pour les visiteurs du site public.

### Stockage dans votre navigateur
Ces données restent sur votre appareil ; le site n’a aucun moyen technique de les envoyer (politique de sécurité du contenu). Vous pouvez les effacer depuis les réglages de votre navigateur.

| Emplacement | Clé | Contenu | Durée |
|---|---|---|---|
| sessionStorage | `core.entered` | L’écran d’accueil a déjà été vu pendant cette session | Jusqu’à la fermeture de l’onglet |
| localStorage | `core.feeds.browser.v1` | Éléments publics récupérés par votre navigateur lors de la veille et réglages d’actualisation | Jusqu’à effacement |
| localStorage | `core.missions.v1` | Résumé des 10 dernières missions que vous avez lancées dans ce navigateur (identifiant, état, décision, empreinte, heure) | Jusqu’à effacement |
| localStorage | `core.human-decisions.v1` | Le choix et la note facultative (200 caractères au plus) que vous saisissez dans le panneau de revue humaine ; évitez d’y écrire des données personnelles | Jusqu’à effacement |

[OPEN — avis juridique : exemption « strictement nécessaire / demandé par l’utilisateur » pour ces clés (L4)]

### Requêtes vers des tiers
Pour afficher la carte et les données publiques, votre navigateur contacte directement les services suivants. Chacun reçoit, comme pour toute page web, votre adresse IP et l’identification de votre navigateur, et les traite selon ses propres conditions ; CORE ne reçoit pas ces journaux.

| Service | Pourquoi | Quand |
|---|---|---|
| GitHub Pages (GitHub, Inc.) | Hébergement du site | Toujours |
| OpenFreeMap | Tuiles et libellés de carte (© OpenStreetMap contributors) | Toujours |
| NASA GIBS | Image de la Terre de l’écran d’accueil | Écran d’accueil |
| AWS (Terrain Tiles) | Relief | Si le relief est activé |
| data.sf.gov, earthquake.usgs.gov, api.weather.gov | Veille sur des sources publiques officielles | Quand la veille s’actualise |
| api.github.com | Historique public des collectes automatiques | Vue « Santé des données » |

La bibliothèque cartographique (MapLibre GL JS 6.11.2) et les polices sont hébergées par CORE. Une politique de sécurité du contenu interdit tout autre service. Sur la machine du fondateur uniquement, le site peut contacter un modèle local et l’état d’un superviseur local ; ces adresses ne sont jamais jointes depuis le site public.

[OPEN — avis juridique : responsabilité éventuelle de l’éditeur pour ces transmissions intégrées (L3)]

### Données publiques affichées
CORE affiche des données publiques officielles (DataSF, NYC Open Data, USGS, NWS, OpenStreetMap…) selon leurs licences. Certaines contiennent des **adresses d’immeubles** (permis de construire, bilans énergétiques) et des **noms d’entreprises ou de titulaires de permis**. Les demandes 311 et les noms de propriétaires sont exclus par conception. [OPEN — politique de minimisation des adresses et noms (L6)]

### Vos droits et contact
CORE ne détient aucune donnée personnelle de visiteurs. Pour une question ou une demande concernant des données publiques affichées : [OPEN — canal de contact et délai de réponse à décider (L1, L8)].
