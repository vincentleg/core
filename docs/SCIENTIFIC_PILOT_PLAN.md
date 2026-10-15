# CORE — plan pilote scientifique gratuit (DRAFT, non exécuté)

Statut : protocole proposé, **pas un pilote calibré ni une Phase 12 autorisée**. Aucun comptage collecté, simulateur installé, bénéfice estimé ou intervention réelle autorisée par cette mission. Le dossier L11 conserve son indice exploratoire ; cet indice n’est ni un délai de trafic, ni un risque causal d’accident.

## 1. Question et corridor candidat

Un seul tronçon : **Howard Street entre 6th et 7th, San Francisco**, compatible avec le périmètre SoMa existant. Question initiale : un modèle offline reproduit-il les débits observés sur ce tronçon et, si des temps de parcours sont légalement disponibles, leurs distributions ? Comparer des interventions seulement après réussite sur référence/holdout. Ne pas prétendre optimiser les vrais feux de Folsom : l’engagement originel O2 reste ouvert.

Le choix est candidat, à confirmer par le fondateur et les services ; ne pas changer silencieusement de corridor pour améliorer un résultat.

## 2. Gate G0 : sources légalement utilisables et cohérentes

| Source candidate | Faits récupérés / usage possible | Condition préalable / limite |
| --- | --- | --- |
| [SFMTA Howard RAISE data repository](https://www.sfmta.com/ja/node/25936) | Résultat de recherche primaire identifiant deux rapports de comptages, locations 6/7, Howard 6th–7th, octobre 2018 | Page complète/PDF non récupérés par l’outil pendant cette mission ; licence, tables et couverture **UNVERIFIED**. Aucune copie ni nombre intégré. Accès gratuit ne vaut pas licence de redistribution |
| DataSF existant | Permis, HIN et collisions agrégées PDDL, collectés en octobre 2026 ; manifest/version connus | Contexte administratif seulement : pas des comptages de débit ni des plans de feux ; ne pas calibrer avec l’indice L11 |
| OpenStreetMap | Géométrie candidate sous ODbL avec attribution/partage à l’identique des bases dérivées | Vérifier sens de circulation, voies, traversées et époque ; état 2026 non substituable à un comptage 2018 |
| Nouveaux comptages agrégés par humains autorisés | Alternative sans achat/API : nombres par mouvement et intervalle, sans image/visage/plaque/trajectoire individuelle | Mandat, sécurité de collecte, droits/licence et protocole à approuver ; aucune collecte déclenchée |
| Caltrans/PeMS, API avec compte/clé | Aucun accès intégré | Ne pas activer ; sources payantes/compte requis exclues de cette mission |

Avant ingestion : conserver URL/version exacte, éditeur, licence ou autorisation explicite, dates/horaires/fuseau, méthode, classes de véhicules, dénominateurs, erreurs de mesure, transformations, couverture et empreinte des octets. Vérifier que les autorisations couvrent bien le traitement et, séparément, la publication. Si droits ou couverture manquent, **G0 = BLOCKED**, pas d’extraction/republication ni de calibration prétendue. Aucun blocage juridique n’est contourné par un résumé d’agent.

## 3. Gate G1 : préenregistrement avant analyse du holdout

Proposition à ratifier : au moins cinq jours ouvrés comparables, fenêtres AM/PM définies avant collecte, intervalles de 15 min par approche/mouvement, jours/horaires et fermetures consignés. Fixer exclusions et traitement des manquants avant lecture des résultats ; ne pas confondre absence de donnée et zéro véhicule. Si cette couverture est irréaliste, réduire l’objectif explicitement avant collecte, pas après échec.

- Baseline = réseau/plan de feux réellement documentés à la même époque ; sans timings vérifiés, seulement un modèle exploratoire de flux, aucune comparaison d’optimisation de feux.
- Partage temporel proposé : 3 jours calibration, 1 validation, 1 holdout scellé ; pas de mélange aléatoire de bins adjacents. Un jeu de cinq jours ne permet aucune généralisation saisonnière.
- Métriques : comptages par mouvement/bin, WAPE et MAE avec définition des dénominateurs ; temps de parcours seulement si observés et légalement utilisables. Aucun proxy collision×jours-permis présenté comme ces métriques.
- Critères proposés, **non approuvés** : WAPE holdout ≤20% et pas de biais majeur par approche ; seuil de temps de parcours à préenregistrer si mesure disponible. Dénominateur nul, échantillon insuffisant ou référence non vérifiée = métrique non évaluable, pas réussite.
- Protéger le holdout des ajustements ; journaliser toute ouverture, seed, version et modification. Un échec oblige à changer/versionner l’hypothèse et obtenir un nouveau holdout, pas à effacer le résultat.

## 4. Gate G2 : simulateur offline et incertitude

[Eclipse SUMO](https://eclipse.dev/sumo/about/) : suite microscopique libre ; la page officielle consultée indique EPL-2.0 (vérifier la licence de la distribution choisie et ses composants avant adoption). SUMO/netconvert non trouvés dans PATH ; **rien installé**. Épingler version/checksum et paramètres ; ne pas promettre que le logiciel simule fidèlement ce corridor sans calibration.

Définir réseau, unités, demande et timings, seed fixe et versions des données. Recherche bornée offline, sans Optuna ni nouvelle dépendance inutile. Fournir les commandes après validation de G0/G1, ne pas lancer des recherches longues pendant la consolidation. Proposed budget : 20 seeds par condition et paramètres dans une grille finie, à confirmer avant calcul.

Évaluer l’incertitude de comptage, les variations jour/heure et celle du modèle séparément ; réplications par jour et seed, pas 20 seeds présentées comme 20 journées indépendantes. Sensibilité aux flux et paramètres identifiables ; intervalles/descriptifs avec taille d’échantillon et limites, sans certitude fictive. Si plusieurs paramètres reproduisent les mêmes flux, expliciter la non-identifiabilité plutôt que choisir silencieusement le meilleur scénario.

## 5. Gate G3 : validation indépendante

Un relecteur compétent distinct du développeur doit vérifier droits, schéma, unités, exclusions, séparation calibration/holdout et résultats. Réimplémentation simple des métriques/échantillon de calculs par une autre méthode ; `verify()` appelant le même code ne suffit pas. Identité, compétence et disponibilité de ce relecteur restent à confirmer ; aucune dépense ni désignation inventée.

Succès limité : « le modèle reproduit ces observations dans ce périmètre et avec ces erreurs ». Ni causalité, ni gain de sécurité, ni validité universelle. Publier les échecs et limites ; comparer au baseline simple pour vérifier qu’un simulateur complexe apporte réellement quelque chose.

## 6. Gate G4 : interventions / action réelle — BLOQUÉ

Après G0–G3, une demande distincte peut autoriser une comparaison offline de deux interventions et d’une référence, avec contraintes d’urgence, accessibilité et charge déplacée. Toute estimation reste conditionnelle ; pas de vies sauvées ni gain causal sans protocole adapté.

Terrain : identité et mandat du validateur, autorisation des services, sécurité/accessibilité, consentements si nécessaires, responsabilité, métriques préenregistrées, témoins/confondants, suivi après horizon, critères d’arrêt et révocation vérifiables. Aucun connecteur réel ni changement de signal ajouté. Un passage en revue humaine CORE n’est pas une signature opérationnelle.

## État de préparation

G0 : données/époque/droits non qualifiés ; G1 : DRAFT ; G2 : simulateur absent ; G3 : relecteur non confirmé ; G4 : BLOCKED. Le **plan** est prêt à examen, le **pilote scientifique** ne l’est pas. Prochaine décision fondateur FD06/FD07 ; coût additionnel autorisé : zéro.
