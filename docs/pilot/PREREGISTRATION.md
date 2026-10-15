# Préenregistrement — template v1, DRAFT non exécuté

ID/version/commit : OPEN. Responsable/relecteur indépendant : OPEN. Date de scellement : NON SCELLÉ. Corridor/époque et droits : NON QUALIFIÉS. Aucun seuil ratifié et aucun holdout consulté pour ce protocole.

- Question initiale : prédire les comptages agrégés par intervalle sur un corridor avec une erreur évaluée hors calibration ; aucune optimisation réelle de feux.
- H0 : le modèle candidat n’améliore pas l’erreur de prédiction de la baseline simple sur observations tenues à l’écart. H1 et différence minimale utile : fixer avant scellement, pas après résultats.
- Unité : site × direction × mode × intervalle avec offset/fuseau documenté ; agrégats anonymes. Ne pas mélanger ADT estimé et comptage observé brut.
- Sources/versions/hachages et droits : compléter source-manifest ; aucune source UNVERIFIED admise.
- Population/fenêtres/exclusions : fixer jours comparables, AM/PM, événement/fermeture et méthode de comptage. Pas de suppression d’un jour défavorable après lecture.
- Baseline : moyenne par site/direction/bin des seuls jours d’entraînement, si couverture compatible ; sinon objectif réduit explicitement avant analyse. Aucun accès contrôleur supposé.
- Split proposé : cinq jours comparables au minimum, 3 train / 1 validation / 1 holdout scellé ; à confirmer selon données. Sans jours indépendants, pas de holdout par découpage aléatoire de bins adjacents ; réduire la portée et déclarer le protocole insuffisant.
- Métriques principales : MAE et WAPE définies dans BASELINE_CALIBRATION ; seuils et biais par approche : OPEN. Temps de parcours seulement si mesuré légalement. Pas de crash-proxy présenté comme délai.
- Incertitude : séparer erreur de mesure, variation inter-jours et variabilité du modèle ; sensibilité à la demande, paramètres et géométrie. Répétitions de seeds ne remplacent pas des jours indépendants.
- Échecs : droits/provenance, données insuffisantes, timing/réseau incompatible, manque d’identifiabilité, dénominateur nul, seuil manqué, holdout divulgué ou revue indépendante absente → BLOCKED pour la conclusion concernée.
- Modèle/paramètres/budget fini/seeds : OPEN ; SUMO non installé. Arrêt des ajustements avant holdout ; toute révision crée une version et requiert un nouveau holdout.
- Publication : résultats nuls/négatifs, exclusions, hypothèses et limites ; seulement agrégats sous droits vérifiés. Aucune conclusion causale ou autorisation terrain.

Approbations à obtenir : qualification des droits, validation du protocole et seuils par relecteur compétent ; l’approbation fondatrice FD07 du principe n’approuve pas implicitement ces valeurs ni cette personne.
