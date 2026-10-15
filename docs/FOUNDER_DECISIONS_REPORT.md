# Livraison — décisions fondatrices et préparation scientifique

Base : `95a1cf4`, branche `founder-decisions/scientific-foundation`. Mandat : message fondateur FD01–FD08 du 2026-10-14 Pacific. Pas de Phase 12, nouvel outil, achat, réglage de compte ou action réelle.

## Acceptation

- [x] Huit orientations approuvées enregistrées avec portée, provenance/date ; Constitution V1 limitée aux principes couverts ; détails OP01–OP06 ouverts.
- [x] Dix-sept engagements, historique O/F/L et critères scientifiques différés préservés ; PROJECT_STATE unique état courant.
- [x] Classes/risques d’action formalisés ; gate local refuse external/inconnu même avec label humain forgé ; aucun service d’identité ou adaptateur terrain.
- [x] Migration du bot préparée sans modification du workflow courant : candidat JSON borné et rehearsal manuel read-only ; aucun réglage distant, PR ou auto-merge ajouté.
- [x] Sources officielles de comptages accessibles inspectées ; droits/holdout/timings non qualifiés ; shortlist conditionnelle et aucun payload mesuré republié.
- [x] Paquet pilote reproductible : manifeste, schéma, fixture synthétique, vérification d’entrées, métriques, préenregistrement, calibration/échecs et checklist indépendante.
- [x] Posture propriétaire provisoire, notices tierces et limitations d’hébergement documentées ; inventaire d’outils recontrôlé sans installation.
- [ ] Intégration, CI, rehearsal opérationnel et vérification de production à consigner avant tag.

## Blocages séparables

FD03 préparé, **protection distante non activée** : option Actions de PR désactivée, plan exact non retourné par API ; capacité des protected branches pour dépôt public disponible sur Free. Activation sans migration casserait le push cron actuel. OP01 exige autorisation précise des réglages et acceptation de la revue humaine des PR. Collecte automatique conservée ; bascule non effectuée.

Pilote **non prêt pour calibration** : droits/couverture/époque de mesures et timings, seuils préenregistrés, holdout et relecteur à qualifier (OP03/OP04). Ce blocage empêche ingestion/calibration de ces mesures, pas la préparation sûre. Pas d’intervention physique ou Business autorisée.

## Vérification et publication

Validation locale : 6/6 tests du paquet, 2/2 contrôles HTTP du serveur, puis une intégration finale 142/142 ; CSP à jour, intégrité 308 fichiers/zéro constat/six exceptions préexistantes documentées, whitespace conforme. Trace : `/tmp/core-fd-integration.log`, `/tmp/core-fd-control-tests.log`. Diff nul sur index/corridor/src/assets/data et workflow planifié : aucune modification du runtime public ni des snapshots publiés. CI, rehearsal et publication à consigner après vérification.

Observation GitHub : cycle planifié [38662345424](https://github.com/vincentleg/core/actions/runs/38662345424), succès, lancé le 2026-10-15 à 00:50:55 UTC ; gate à 135 minutes, `collect=false`. Prouve un déclenchement et sa gate, pas une collecte ce jour-là ni une cadence horaire garantie.

Tests de fixtures ne constituent ni calibration ni validation scientifique indépendante ; rehearsal read-only ne démontre ni protection effective ni cycle planifié réel. Firefox/Safari/accessibilité assistée, pentest, revue juridique exhaustive et fiabilité de cadence cron non vérifiés. Les décisions fondatrices approuvées ne sont plus à ratifier ; seules opérations OP pertinentes restent ouvertes.
