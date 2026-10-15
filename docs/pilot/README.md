# SF — paquet de préparation scientifique v1

FD06/FD07 autorisent cette préparation, pas une intervention ni une prétention de calibration. Le paquet contient manifeste de sources, schéma normalisé, préenregistrement, spécification baseline/calibration et checklist indépendante. Les seuils numériques et responsables restent OPEN. Aucun simulateur installé.

## Choix de corridor — conditionnel

1. **Howard entre 6th et 7th** : priorité documentaire, car le [dépôt SFMTA RAISE](https://www.sfmta.com/reports/san-francisco-municipal-transportation-agency-howard-streetscape-improvement-project%C2%A0usdot-2021-raise-grant-data-repository) donne deux rapports précisément localisés. Le [rapport location 6](https://www.sfmta.com/media/27438/download?inline=) est accessible : comptage tube, WB, une journée du 17 octobre 2018, prestataire Quality Counts. Ni plans de feux, ni cinq journées comparables, ni droits de republication qualifiés. Candidat, pas corridor scientifiquement sélectionné.
2. **Folsom / Main** : [dossier de comptages SFMTA](https://www.sfmta.com/media/34367/download?inline=) identifié ; couverture détaillée, époque, licence et compatibilité géométrique à vérifier avant sélection. Alternative conditionnelle, pas preuve d’un meilleur pilote.

La [page Traffic Counts](https://www.sfmta.com/TrafficCounts), datée du 1er janvier 2024, lie des CSV « Intersection Counts 2014–2022 » et « Corridor Counts 2014–2022 ». Le CSV corridor accessible comporte des enregistrements plus anciens que son libellé : ne pas utiliser le titre comme couverture effective. Métadonnées/limites : `source-manifest.json`. Les données DataSF déjà sous PDDL restent utiles au contexte administratif, pas comme débits observés. La recherche ciblée au catalogue DataSF « traffic counts » n’a pas établi de jeu équivalent sous licence vérifiée ; ce n’est pas une recherche exhaustive.

## Exécution bornée

```sh
node scripts/pilot.mjs --check test/fixtures/pilot-synthetic.json --synthetic-fixture
node --test test/founder-decisions.test.js
```

La fixture est **synthétique**, sans relation avec une mesure SF. Sans le drapeau explicite, elle est refusée. `VALIDATED_INPUT` ne signifie ni calibré, ni revue indépendante, ni efficacité réelle. Aucun downloader ou normaliseur de mesures SFMTA n’est activé : droits non vérifiés. Un futur import conserve les octets originaux/hachage, licence et transformations, n’ingère que des agrégats non personnels, puis vérifie `counts.schema.json` et le validateur Node sans dépendance.

Le statut de droits VERIFIED dans un manifeste doit être étayé par une revue et une référence : le validateur vérifie la présence/cohérence de cette déclaration, pas la titularité juridique ni l’authenticité de l’éditeur. Un manifeste et un payload réécrits ensemble ne deviennent pas une preuve indépendante. Aucun connecteur réseau n’est exécuté par la CLI pilote.

## Checklist d’accès et gates

- G0 : éditeur/droits pour traitement ET republication, fournisseur éventuel, version, unités, observation/collecte, fuseau/DST, couverture, schéma/encodage et transformations vérifiés ; **BLOCKED** aujourd’hui.
- G1 : corridor/époque/réseau/timings vérifiés ; protocole/holdout et seuils préenregistrés avant lecture ; **DRAFT**.
- G2 : baseline simple avant modèle, calibration et erreur holdout ; SUMO offline seulement avec raison et données adéquates ; **NON EXÉCUTÉ**.
- G3 : relecteur indépendant compétent et autre méthode de calcul ; **NON DÉSIGNÉ**.
- G4 : autorisation humaine authentifiée et contraintes terrain ; **DISABLED**, sans adaptateur réel.

Étape scientifique suivante : qualifier G0/G1 sur un corridor, puis faire sceller le protocole par un relecteur avant toute calibration. Aucun bénéfice trafic/sécurité ni validation causale obtenu par ce paquet.
