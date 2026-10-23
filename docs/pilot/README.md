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

## Qualification complémentaire — 2026-10-15 UTC

`source-manifest.json` consigne la nouvelle lecture des deux CSV officiels, sans copier les mesures : corridor SHA inchangé ; intersection UTF-8, 1 189 lignes hors en-tête (blancs possibles), SHA `d6f7809d7b68ab416bb68776edc56c5b05dbacf7bf52df2e16ef6ab494384c55`. Howard/6th et Howard/7th : dates isolées 2015–2016 ; corridor Folsom Beale–Main : 13/14 décembre 2017. Pas de correspondance exacte Folsom/Main établie dans le CSV intersection ; ces noms ne certifient pas géométrie/mouvement. Le PDF Howard 6th–7th de 2018 reste une preuve historique antérieure, pas relu intégralement dans cette mission.

La [clause copyright SFMTA](https://www.sfmta.com/terms-of-use) réserve les actifs éditoriaux/créatifs, sans grant explicite identifié pour ces tables prestataires. Cela ne tranche pas la protection juridique des faits ; droits de traitement/redistribution à qualifier. Aucun emprunt de PDDL d’un autre portail. Aucun payload mesuré publié ni source déclarée VERIFIED. Shortlist maintenue **conditionnelle** : Howard 6th–7th, puis Folsom/Main.

G0 reste bloqué : droits, méthode/époque/géométrie, timings contemporains compatibles, manquants/doublons et holdout de jours indépendants. Deux dates proches ne prouvent pas un holdout adéquat. Prochaine voie sans achat : retrouver un grant explicite lié au fichier ou une autorisation écrite, qualifier bins/mouvements et plans de feux de la même époque ; sinon protocole de comptage agrégé nouveau à autoriser séparément. Aucun contact agence ni collecte terrain lancé.

Le validateur existant reçoit un durcissement ciblé : allowlist des métadonnées du paquet/manifeste/droits et rejet des dates de droits futures ; pas de note privée cachée hors des lignes observées. Erreurs sans payload. Validation d’entrée ≠ authentification d’une licence ou calibration. Domaine-neutralité conservée : ce schéma est pour comptages agrégés ; ni énergie/eau ni simulation universelle revendiquée.

## R3 — 2026-10-23 UTC : reconstruction du corridor et sources complémentaires

Détail et tableau des sources : `docs/R3_EVIDENCE_READINESS.md` ; entrées lisibles par machine : `source-manifest.json` (`r3`, six sources ajoutées). Constat décisif : le projet SFMTA Folsom-Howard Streetscape reconstruit Folsom (2nd–11th ; nouveaux feux 8th–11th, achèvement substantiel visé octobre 2026) et Howard (travaux 2026–2029). Les comptages et plans de feux de la shortlist sont donc antérieurs au projet ; une étude doit choisir une seule époque avant tout résultat. Plans de feux : uniquement par demande d’accès aux documents publics, qui n’accorde pas en soi de droit de réutilisation. Vitesses SFCTA/INRIX : RESTRICTED. Volumes piétons, files d’attente et délai mesurés : MISSING. G0 reste **BLOCKED** ; aucune donnée téléchargée, aucune demande déposée.
