# CORE — dossier complet de passation

Dernière mise à jour : 12 octobre 2026. Auteur du projet : Vincent Leguide (vincent.leguide@outlook.com), fondateur.
Dépôt : https://github.com/vincentleg/core · Site prévu : https://vincentleg.github.io/core/

Ce document contient tout ce qui a été décidé et construit. À lire en entier avant de coder.

---

## 1. En une phrase

**CORE (Creation Of Reborn Earth) est une Terre parallèle en 3D où des agents IA testent en continu des milliers de
solutions aux problèmes du monde réel (feux, bouchons, chantiers, bâtiments, énergie, eau…) ; seules les propositions
qui survivent aux tests et peuvent se justifier passent dans le monde réel, par la « Passerelle », sous forme de permis
à faire signer par un humain.**

Mission longue : moderniser la Terre sans gaspillage, puis atteindre une civilisation de type I sur l'échelle de
Kardashev (maîtrise de l'énergie de la planète), puis de type II (au-delà de la Terre). Pitch court :
*"A world where agents' decisions are put to the test—before their results cross into ours."*

---

## 2. Origine du projet

### 2.1 Hackathon du 10 octobre 2026
Decision-Grade AI @ Stanford (Industrious Palo Alto, organisé par Ezio, partenaires TokenRouter, HarnessRouter,
Keenable). Thème : décider quand une réponse d'IA est assez étayée pour agir. Vincent y a présenté **PLOT TWIST**
(track « Build a Trust Agent »). Il n'a pas gagné, mais l'idée a conduit à CORE.

Idées clés héritées du hackathon (toujours au cœur de CORE) :
- **KEYSTONE** : identifier la preuve « clé de voûte » d'une décision ; retirer une preuve ne doit jamais rendre une
  décision plus permissive ; inconnu ≠ faux ; compter les sources indépendantes, pas le nombre de sources.
- **PLOT TWIST** : l'utilisateur modifie le monde (une preuve tombe, un événement survient) dans une copie
  expérimentale ; on observe quelles actions dépendaient de quoi ; l'agent revérifie, corrige ou demande un arbitrage.
- **Permis d'agir** : chaque action reçoit une autorisation conditionnelle liée aux preuves qui la justifient
  (action exacte, périmètre, preuves, conditions, durée de validité, déclencheurs de suspension, justification).
  Révocation sélective : quand une preuve tombe, seules les actions qui en dépendent s'arrêtent.
- **La Passerelle** : seul point de sortie vers le monde réel ; code déterministe, jamais un LLM ; elle ne fait que
  *proposer* pour signature humaine. Le monde de test ne peut jamais rien faire sortir comme définitif.
- **La Trame** : univers visuel inspiré de l'atmosphère Tron × Matrix, avec son propre vocabulaire (aucun nom, logo,
  personnage ni élément protégé de ces œuvres). Agent mascotte : **Scout**.

### 2.2 Passage à CORE
Vincent a étendu l'idée à un jumeau de la planète entière (« Google Earth en monde virtuel exact, mais modifiable »),
avec des agents qui travaillent 24 h/24 sur des problèmes réels et des lieux réels, et dont les conclusions sont
appliquées dans le monde réel. Il veut viser une entreprise valorisée au moins 1 milliard de dollars et présenter le
projet à Y Combinator, a16z speedrun et a16z (Alpha Fellowship jugée peu adaptée : réservée aux étudiants et jeunes
diplômés ingénieurs logiciels).

---

## 3. La vision complète

### 3.1 Le monde parallèle
- Copie 3D de toute la planète : surface (routes, bâtiments, arbres, nature), sous-sol (tuyaux, câbles, réseaux,
  géothermie, eau, pétrole, minéraux), océans, en temps réel.
- Navigation comme Google Earth, mais plus précise ; du globe à la rue, puis sous le sol.
- Les agents y travaillent en continu : ils simulent, testent des milliers de scénarios sur un même problème et un même
  lieu, et produisent des conclusions.
- Chacun (entreprise, architecte, ville, citoyen) peut isoler une zone et « construire » : bâtiment parfait, intérieur
  et extérieur, à la manière de Minecraft mais pour la vraie vie (dans des bacs à sable séparés du réel).
- Usage XR : Apple Vision Pro, lunettes Meta et Snap — « le métavers utile ».
- Problèmes ciblés à terme : bouchons, trafic, feux rouges/orange/verts, pollution, chantiers, bâtiments durables,
  géothermie, ressources du sol, eau, internet, océans, énergie ; problèmes sociaux et environnementaux des villes.
- Ambition d'image : « on va à fond dans l'univers Tron » (sans reprendre la propriété de Disney).

### 3.2 La position retenue (ce qui rend la vision finançable)
- La carte 3D seule appartient déjà aux géants (Google, NVIDIA, Bentley/Cesium, Esri, Niantic Spatial) : ce n'est pas
  un avantage. Google Project Green Light optimise déjà des feux ; NVIDIA vend une architecture de jumeaux de villes.
- Ce qui manque : **la couche de décision** entre la simulation et le monde réel. Catégorie visée : le
  **« jumeau de décision »**. Chaque proposition qui sort porte un permis : action, données sources datées, domaine de
  validité, plot twists joués, personnes touchées, réversibilité, signature humaine requise. Quand une donnée change
  dans le réel, le permis est suspendu automatiquement, et seules les propositions dépendantes s'arrêtent.
- **Les agents proposent, les humains signent.** Ne jamais dire « les agents décident et le monde réel exécute ».
- Les trois âges : (1) moderniser la Terre (chantiers, réseaux, bâtiments, mobilité) — finance l'entreprise ;
  (2) gérer la planète comme un système (énergie, eau, sous-sol, océans, climat) — type I ; (3) construire au-delà de
  la Terre (stations, bases lunaires, énergie en orbite) — vers le type II.
- Ce que la vision ne promet pas : remplacer la politique, « régler tous les problèmes », des milliards d'économies
  sans source.

### 3.3 Repères factuels utilisés
- Kardashev : humanité ≈ 0,73 sur l'échelle de Sagan ; type I estimé atteignable au plus tôt vers le XXIVe siècle.
- Destination Earth (UE) : jumeaux du climat et des extrêmes ; phase 3 de juin 2026 à juin 2028 ; objectif de réplique
  complète du système Terre en 2030 (pas les villes ni l'usage commercial).
- Marché des jumeaux numériques 2025 : 18,9 à 35,8 milliards $ selon les cabinets (GMI, Research and Markets, Grand
  View) — contexte seulement, jamais l'argument principal.
- Bentley a racheté Cesium (2024). Niantic Spatial entraîne un « Large Geospatial Model » sur plus de 30 milliards
  d'images. a16z American Dynamism (1,176 Md$ dans la levée 2026) investit dans l'intérêt national, y compris
  transports, logement, industrie. Speedrun privilégie une démo cliquable au deck.

---

## 4. Business

### 4.1 Premier produit (porte d'entrée)
**Coordination des chantiers de voirie et de réseaux** : « arrêter de creuser trois fois la même rue ».
- Utilisateur : ingénieur coordination voirie de la ville. Validateur : directeur des travaux publics.
- Acheteurs : opérateurs de réseaux (fibre, eau, énergie) et entreprises de travaux, qui paient vite pour gagner du
  temps ; la ville rejoint gratuitement ou à bas prix comme contrepartie → effet de réseau à deux côtés.
- Déclencheur : rue rouverte peu après réfection, plaintes, grand programme fibre ou canalisations.
- Solution actuelle : tableurs, réunions, logiciels de permis (concurrents spécialisés à cartographier).
- Métriques : réouvertures évitées, jours de fermeture de voie, heures de bouchon simulées puis observées, temps de
  coordination. Jamais le taux d'approbation.
- Le sous-sol vient « gratuitement » : les opérateurs clients apportent leurs plans de réseaux.
- La démo utilise les feux (plus visuel, mieux outillé) ; un chantier = une voie fermée dans le même moteur.

### 4.2 Modèle économique (hypothèses)
| Client | Achète | Prix | Quand |
| --- | --- | --- | --- |
| Opérateurs, entreprises de travaux | Coordination, simulation d'impact, dossier de permis justifié | Abonnement + frais par projet passé par la Passerelle | Dès le début |
| Villes | Vue unifiée, arbitrage, historique | Abonnement par taille, bas au départ | Dès le début |
| Propriétaires, promoteurs | Projet de bâtiment simulé dans son contexte | Licence par projet / portefeuille | Phase 2 |
| États, agences | Planification multi-réseaux, énergie, résilience | Contrats pluriannuels | Phase 3 |
| Développeurs d'agents tiers | Accès Trame + Passerelle | Commission + API | Phase 3 |
| Grand public | Voir et commenter ce qui change dans sa rue ; bacs à sable | Gratuit | Phase 2 |

- **Ouvert** : format des permis et des scénarios, visionneuse publique (comme 3D Tiles pour Cesium).
- **Fermé** : moteur de décision, agents CORE, réseau des acteurs, historique des décisions et résultats.
- Règle approximative : 1 Md$ de valorisation ≈ ~100 M$ de revenus récurrents annuels.

### 4.3 Défensibilité
1. Position dans le flux de décision (changer d'outil = reconstruire historique et circuits de signature).
2. Effet de réseau ville + opérateurs + entreprises + propriétaires.
3. Historique des propositions signées et de leurs résultats réels (les agents apprennent de la réalité).
4. Standard ouvert des permis.
La 3D n'est pas une défense ; c'est la vitrine.

### 4.4 Trajectoire
Démo → 10 utilisateurs (ingénieurs voirie, opérateurs) → premier client payant → 10 villes (série A) → plateforme
(investissement public, énergie, bâtiments, agents tiers) → planète (jumeaux sectoriels reliés : vision type I).

### 4.5 Accès, gouvernance, sécurité
| Rôle | Voit | Peut |
| --- | --- | --- |
| Public | Surface, projets approuvés ou en consultation | Explorer, commenter, proposer en bac à sable |
| Professionnel | Ses actifs, projets qui le concernent | Créer des scénarios, lancer des agents, soumettre |
| Validateur | Son périmètre | Signer, refuser, demander une précision |
| Agent IA | Données de sa mission | Proposer et tester, jamais agir dans le réel |
| Administrateur souverain | Données sensibles de son territoire | Décider du partage et de l'hébergement |
- Emplacement exact des réseaux critiques jamais public ; journal d'accès.
- CORE modélise des flux, pas des personnes ; mobilité agrégée et anonymisée.
- Hébergement par pays possible (RGPD).

### 4.6 Pitch
- Une phrase : *"CORE is a parallel Earth where AI agents test every change to our streets, networks and buildings
  before it's built—and only the plans that survive the tests reach the people who sign them."*
- 60 s : *"Every year, cities and utilities make enormous decisions about streets, pipes and buildings—and almost none
  of them are tested before they're made. The same street gets dug up three times… CORE is a living parallel Earth.
  AI agents work in it around the clock: they propose improvements, simulate their impact, and attack each other's
  plans with what-if scenarios. Every plan that survives comes with its evidence, its assumptions and its stress
  tests—ready for an engineer to sign. We start with one painful job: coordinating roadworks and utility works…
  From there, every physical change on Earth can pass through CORE."*
- À joindre : lien de démo en premier, verbatims de 10 entretiens, parcours de Vincent (infrastructure, intégration
  edge/IA chez INFODIP, construction rapide avec des agents IA).
- À ne pas dire : « on règle tous les problèmes », « les agents décident à la place des humains », chiffres sans source.

### 4.7 Plan hors code (90 jours)
- J8–30 : 10–15 entretiens (ingénieurs voirie, opérateurs, entreprises). Question : « Combien de fois avez-vous rouvert
  la même rue l'an dernier, et pourquoi ? » Cartographier les logiciels existants. Audit des licences de données.
- J31–60 : un pilote gratuit sur un quartier ; mesurer réouvertures évitées, jours de fermeture ; cofondateur technique
  (simulation, géospatial).
- J61–90 : lettre d'intention, vérifier les dates speedrun / YC, candidater avec la démo.

### 4.8 Risques
Vision trop large (toujours montrer le premier produit) ; ventes lentes aux villes (commencer par les opérateurs) ;
géants (rester neutre, prendre la position de décision) ; qualité des données (sources et dates visibles) ; licences
(OpenStreetMap ODbL, Google) ; sécurité des réseaux ; coût du calcul (habitants à base de règles, LLM réservé) ;
fondateur seul (cofondateur sous 60 jours).

---

## 5. Le produit : design et mécanique

### 5.1 La Trame (visuel)
- Terre sombre dessinée en lumière : bâtiments en arêtes cyan, faces translucides, flux en lignes qui pulsent,
  propositions d'agents en objets fantômes au-dessus du réel. La couleur n'est jamais le seul signal (symbole + libellé).
- Trois modes toujours visibles : **Réel** (cyan, avec source et date de chaque donnée), **Scénario** (ambre,
  propositions des agents), **Bac à sable / test** (magenta, rien n'en sort sans la Passerelle).
- Six niveaux : globe → région → ville → quartier → rue → sous-sol (surface transparente, réseaux en couleurs codées).
- Navigation : barre de recherche et vol, souris/tactile comme Google Earth, curseur de temps (hier, aujourd'hui, futurs
  proposés), bouton « plonger sous le sol », panneau latéral toujours disponible (aucune opération importante ne
  doit obliger à naviguer en 3D).
- Performance : niveau de détail selon le zoom, arêtes sur volumes simples, effets limités à la zone active.
- Grammaire héritée de PLOT TWIST : phare = objectif ; pavillons = actions (hauteur = irréversibilité) ; arches =
  permis (✓ actif, ⏸ suspendu, ✕ bloqué, ✋ humain) ; prismes = preuves (plein soutenu, pointillé inconnu, fendu
  contredit, anneau = bail qui expire) ; faisceaux = dépendances ; colonne ambre = intervention humaine ;
  « vue structure » = révéler la provenance exacte d'une preuve.
- Personnalité de l'agent : curiosité (balayage), hésitation (pulsation), arrêt explicite, résolution sobre ; jamais de
  récompense pour avoir approuvé.

### 5.2 Les agents
| Famille | Rôle | Nombre | Techno | Coût |
| --- | --- | --- | --- | --- |
| Habitants | Simuler piétons, voitures, livraisons | Milliers à millions | Règles et archétypes, LLM ponctuel | Faible |
| Bâtisseurs | Proposer une amélioration | Dizaines à centaines | LLM + outils (données, simulations, comparaisons) | Élevé, ciblé |
| Adversaires | Jouer les plot twists (retard, panne, crue, donnée fausse) | Un par proposition importante | LLM + tirages de scénarios extrêmes | Moyen |
| Passerelle | Décider si une proposition peut sortir | Une | Code déterministe | Négligeable |
- Un agent = une fiche : rôle, outils, périmètre (zone, données, budget de calcul), règles de sortie.
- Orchestrateur qui crée/détruit les agents ; chaque scénario dans une copie isolée du monde.
- Visuel : habitants = flux agrégés ; bâtisseurs = figures géométriques, une couleur par métier ; adversaires en rouge
  au moment du test ; clic sur un agent = sa mission, ce qu'il a testé, pourquoi.
- Recherche : AgentTorch (8,4 M d'agents à New York), CityBehavEx (100 000 agents, 75 jours, < 1 h sur un GPU grand
  public), OpenCity (36 s → 0,06 s par agent avec regroupement des requêtes).

### 5.3 La simulation : des milliers de scénarios pour un même lieu
Les agents pilotent des moteurs spécialisés ; les milliers de scénarios coûtent du calcul, pas des tokens.
| Problème | Moteur open source | Variables | Mesures |
| --- | --- | --- | --- |
| Feux | SUMO + sumo-rl (MIT) | Phases, coordination, apprentissage | Attente, arrêts, files |
| Bouchons | SUMO | Sens, voies, itinéraires, livraisons | Temps de trajet, saturation |
| Chantiers | SUMO + planification | Ordre, regroupement, fermetures | Jours de fermeture, bouchons induits |
| Énergie bâtiment | EnergyPlus (DOE, pilotable en Python) | Isolation, fenêtres, chauffage, solaire | Consommation, confort, coût |
| Réseau électrique | pandapower | Raccordements, stockage, recharge | Surcharges, pertes, tensions |
| Eau | WNTR / EPANET | Vannes, pompes, canalisations | Pression, fuites |
Boucle : poser le problème → calibrer la copie (reproduire les comptages réels ; sans calibration, aucune conclusion
crédible) → générer des variantes (Optuna, sumo-rl) → exécuter en parallèle → attaquer (adversaires) → classer par
robustesse (le meilleur dans les pires cas) → le LLM rédige le permis → après application, mesures réelles → recalibrer.
CORE affiche toujours l'écart simulation / réalité avant tout gain.

### 5.4 Plateforme et hébergement
- Logiciel **web** (lien cliquable, aucune installation) ; XR plus tard via le même code (WebXR).
- Démo : site statique sur GitHub Pages ; simulations soit dans le navigateur (moteur JS), soit précalculées hors ligne
  et rejouées avec leur date (« résultats calculés le … »). Pas de serveur de calcul avant la levée.
- Gratuit, sans compte ni clé autant que possible. Payant évité : Google Photorealistic 3D Tiles (facturation Google
  Cloud, pas de cache ni hors ligne, visualisation seule), API LLM dans la boucle, serveurs de calcul. Cesium ion :
  compte gratuit pour développer ; conditions commerciales à vérifier.
- Données 3D : CesiumJS + Cesium OSM Buildings (stylables), Overture Maps (2,3 Md d'empreintes, ouvertes), OpenFreeMap
  (tuiles OSM gratuites sans clé, choisi pour la phase 1). Copie exacte à terme : drones/aérien via partenaires
  (Niantic Spatial + Spexi par exemple), plans des opérateurs pour le sous-sol, capteurs pour le temps réel.

### 5.5 XR
Ordre : navigateur → casque immersif en salle de décision (Vision Pro) → lunettes AR sur le terrain (voir les réseaux
sous la chaussée avant de creuser). Snap Specs (juin 2026, 2 200 $, 51°), Meta Ray-Ban Display (déc. 2025, 799 $, 20°).
Superposition au centimètre = positionnement visuel (ex. Niantic Spatial) en partenariat.

---

## 6. Ce qui est déjà construit (dépôt `vincentleg/core`)

### 6.1 Contexte de construction
Construit dans un environnement **sans accès internet** (ni npm, ni PyPI, ni OSM, seulement GitHub restreint) :
pas de SUMO, pas de CesiumJS installés, aucun rendu vu dans un vrai navigateur. Tout le JavaScript est vérifié
syntaxiquement ; le moteur et le parcours complet sont testés en Node.

### 6.2 Fichiers
| Fichier | Contenu |
| --- | --- |
| `index.html` | **Phase 1** : la Terre réelle. MapLibre GL 5.6.0 (unpkg) en projection globe ; style Trame écrit à la main sur tuiles vectorielles OpenFreeMap (`https://tiles.openfreemap.org/planet`, schéma OpenMapTiles) : eau, côtes et frontières cyan, routes avec halo, voies ferrées violettes, empreintes de bâtiments + bâtiments 3D extrudés (`render_height`), labels Noto Sans. Rotation lente du globe ; boutons Globe / San Francisco / Paris / Tokyo (vols) ; recherche Nominatim ; couches Trame / Satellite (Esri World Imagery) / Relief 3D (AWS Terrain Tiles, terrarium) ; marqueur pilote ambre sur SoMa ; barre de statut (lat, lon, zoom). **Rendu jamais vu : à vérifier en premier.** |
| `corridor.html` | **Phase 0**, généré par `node build.js` depuis `src/`. Globe filaire maison → plongée → corridor pilote 3D (rendu canvas 2D fait main, arêtes cyan, niveaux de détail) avec véhicules simulés en direct ; panneau agents ; plot twists ; Passerelle ; lien retour vers `index.html`. |
| `src/engine.js` | Moteur CORE v0 (Node + navigateur, `globalThis.CORE`). |
| `src/app.js`, `src/template.html`, `build.js` | Rendu et assemblage du corridor. |
| `CLAUDE.md`, `AGENTS.md` | Règles de travail pour Claude Code / Codex. |
| `ROADMAP.md` | Phases et prompts. `PROJECT_STATE.md` : état courant. |

### 6.3 Le moteur (`src/engine.js`)
- Corridor synthétique : 5 carrefours à x = 0, 180, 360, 560, 740 m ; 45 km/h ; artère 2 voies dans chaque sens,
  transversales 1 voie ; débit de saturation 2 s/voie ; 3 s de jaune + rouge intégral ; vert piéton ≥ 15 s ;
  demande 30 min (EB 1 100, WB 1 000 véh/h, transversales 300–420) + 15 min de vidange.
- Modèle de file d'attente au point d'arrêt (FIFO, tout droit), arrivées de Poisson à graine fixe : chaque plan voit
  exactement la même demande. Le même moteur sert aux milliers de runs **et** à l'affichage en direct (aucun second
  modèle « pour l'animation »).
- Plan de référence supposé : cycle 90 s, vert 42 s, sans coordination.
- Twists : `pointe` (+20 %), `chantier` (1 voie fermée vers l'est avant C4), `pluie` (débit −15 %), `aleas`
  (autre tirage), `evenement` (sortie de concert : transversale de C3 ×2,5).
- API : `makeScenario(twists)`, `basePlan()`, `new Sim(plan, sc)` (`step()`, `run()`, `phase(i,t)`),
  `evaluate(plan, sc)` → retard moyen, % d'arrêts, temps de traversée, retard transversal, non servis, retard par
  carrefour ; `greenWave(C, share, dir)` ; `searchPlans({budget, scenario, onProgress})` (agents « Onde verte »,
  « Exploration », « Affinage ») ; `robustRefine({candidates, extra})` (agents « Robustesse », score = pire ratio
  sur 6 cas : normal, pointe, chantier, pluie, autre jour, pointe + pluie) ; `stressTest(plans, extra)` ;
  `issuePermit(result)` → PRÊT POUR SIGNATURE (meilleur que la référence dans tous les cas), SUSPENDU (pire dans au
  moins un cas), BLOQUÉ (gain < 5 %), avec action, gains, tableau des tests, hypothèses (demande synthétique non
  calibrée, géométrie simplifiée, référence supposée, vert piéton), validité, réversibilité, signature (ingénieur
  trafic ; CORE n'applique rien).
- Résultats testés : 1 500 plans en 2,8 s ; parcours complet ≈ 3 030 simulations en ≈ 7 s → **PRÊT, −68 % de retard
  (pire cas −61 %)** ; twist Concert → **SUSPENDU** ; agents relancés dans ce monde → **PRÊT, −51 % (pire cas −47 %)**.
  Gains sur données synthétiques : ne pas les présenter comme des gains réels.

### 6.4 L'interface du corridor (`src/app.js`)
Caméra orbitale (glisser, Maj+glisser, molette, pincement), globe filaire avec contours simplifiés et villes, plongée
animée vers SF, quartier généré (bâtiments en arêtes, LOD), feux colorés par phase, anneaux de chaleur par carrefour,
véhicules (blanc = roule, rouge = arrêté) dérivés de l'état du moteur, agents en polyèdres au-dessus des carrefours
pendant la recherche, chantier et concert dessinés, bascule Plan de référence / Plan proposé, vitesse, pause, clic sur
un carrefour (cycle, vert, décalage), carte Passerelle avec tableau des tests et copie du permis en JSON. Mention à
l'écran : corridor, bâtiments et demande synthétiques.

### 6.5 Mettre en ligne
```bash
git remote add origin https://github.com/vincentleg/core.git
git push -u origin main
```
Puis GitHub → Settings → Pages → Deploy from a branch → `main` / root → https://vincentleg.github.io/core/

---

## 7. Phases de build

| Phase | Ce qu'on voit | Fini quand | État |
| --- | --- | --- | --- |
| 0 | Corridor synthétique : agents, plot twists, Passerelle | `corridor.html` marche | Fait |
| 1 | Terre réelle : globe, rues, bâtiments 3D, recherche, satellite, relief | Le site vole jusqu'à SoMa et affiche les bâtiments en 3D | Fait, **à vérifier en ligne** |
| 2 | Corridor sur les vrais feux de Folsom St (SF), véhicules et feux sur la carte | « Optimiser ce corridor » lance les agents sur les feux réels | À faire |
| 3 | N'importe quel carrefour du monde | Marche à SF, Paris, Tokyo sans code spécifique | À faire |
| 4 | Agents 3D au-dessus des carrefours ; chantier tracé à la main | Un chantier tracé suspend le permis concerné | À faire |
| 5 | SUMO hors ligne + comptages réels, résultats datés | Écart simulation / comptages affiché avant tout gain | À faire |
| 6 | Bâtiments et énergie (EnergyPlus) | Un permis « bâtiment » sort par la Passerelle | À faire |
| Plus tard | Sous-sol, chantiers multi-opérateurs (produit d'entrée), curseur de temps, comptes et rôles, XR | — | — |

Prompts détaillés : voir `ROADMAP.md`. Avant la phase 2 : ouvrir le site, vérifier la phase 1 (globe, vol, bâtiments 3D,
recherche, satellite, relief) et corriger ce qui ne s'affiche pas.

---

## 8. Règles de travail pour l'agent de code
- Lire `PROJECT_STATE.md`, puis seulement les fichiers de la phase en cours.
- Une phase à la fois ; s'arrêter au critère de fin ; commit ; `PROJECT_STATE.md` mis à jour (10 lignes max) ; push.
- Pas de refonte, pas de dépendance sans justification ; bibliothèques depuis unpkg, versions épinglées.
- Gratuit, sans clé ni compte. Données en fichiers, jamais collées dans la conversation. Simulations longues : donner
  la commande à Vincent.
- Ne pas modifier la logique des agents ni de la Passerelle sans demande explicite. `corridor.html` est généré
  (`node build.js`), ne pas l'éditer à la main.
- Honnêteté : tout ce qui est synthétique, précalculé ou non calibré est indiqué à l'écran ; la Passerelle n'applique
  jamais rien ; les agents proposent, les humains signent.

## 9. Questions ouvertes
- Qui ressent le plus la douleur des chantiers mal coordonnés : ville ou opérateurs ?
- Quelles données de permis, de feux et de comptages sont réellement accessibles à San Francisco ?
- Qui signerait une proposition sortie de la Passerelle, à quelles conditions ?
- Licences : OpenStreetMap (ODbL), Esri, Cesium ion pour un usage commercial.
- Dates du prochain cycle a16z speedrun et du prochain batch YC.
