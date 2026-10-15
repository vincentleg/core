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
- [x] Intégration, CI, rehearsal opérationnel read-only et vérification de production réussis ; tag distinct créé après ces preuves.

## Blocages séparables

FD03 préparé, **protection distante non activée** : option Actions de PR désactivée, plan exact non retourné par API ; capacité des protected branches pour dépôt public disponible sur Free. Activation sans migration casserait le push cron actuel. OP01 exige autorisation précise des réglages et acceptation de la revue humaine des PR. Collecte automatique conservée ; bascule non effectuée.

Pilote **non prêt pour calibration** : droits/couverture/époque de mesures et timings, seuils préenregistrés, holdout et relecteur à qualifier (OP03/OP04). Ce blocage empêche ingestion/calibration de ces mesures, pas la préparation sûre. Pas d’intervention physique ou Business autorisée.

## Vérification et publication

Validation locale : 6/6 tests du paquet, 2/2 contrôles HTTP du serveur, puis une intégration finale 142/142 ; CSP à jour, intégrité 308 fichiers/zéro constat/six exceptions préexistantes documentées, whitespace conforme. Trace : `/tmp/core-fd-integration.log`, `/tmp/core-fd-control-tests.log`. Diff nul sur index/corridor/src/assets/data et workflow planifié : aucune modification du runtime public ni des snapshots publiés. CI, rehearsal et publication vérifiés ci-dessous.

Observation GitHub : cycle planifié [38662345424](https://github.com/vincentleg/core/actions/runs/38662345424), succès, lancé le 2026-10-15 à 00:50:55 UTC ; gate à 135 minutes, `collect=false`. Prouve un déclenchement et sa gate, pas une collecte ce jour-là ni une cadence horaire garantie.

Tests de fixtures ne constituent ni calibration ni validation scientifique indépendante ; rehearsal read-only ne démontre ni protection effective ni cycle planifié réel. Firefox/Safari/accessibilité assistée, pentest, revue juridique exhaustive et fiabilité de cadence cron non vérifiés. Les décisions fondatrices approuvées ne sont plus à ratifier ; seules opérations OP pertinentes restent ouvertes.


## Résultats de publication vérifiés

- Implémentation : `9ea33c99d81dd4145fb2497035d338f910e6e2af`, publiée sur branche dédiée puis main par fast-forward après relecture du distant. Aucun commit planifié supplémentaire à réconcilier, aucune réécriture/bypass. Les compléments de clôture sont documentaires seulement.
- [CI branche 38667932089](https://github.com/vincentleg/core/actions/runs/38667932089) et [CI main 38668084712](https://github.com/vincentleg/core/actions/runs/38668084712) : succès, 142/142 ; intégrité 308 fichiers, zéro constat, six exceptions existantes.
- [Rehearsal read-only 38668124052](https://github.com/vincentleg/core/actions/runs/38668124052) : succès sur le même SHA ; collecte réelle via scripts existants (353 éléments, 3 nouveaux, 1 modifié, zéro source en échec), candidat borné, sécurité et 142/142 sur ses sorties, aucun push/PR/merge. Ces tests supplémentaires portent sur des données candidates nouvellement collectées, pas une répétition locale de la même intégration. Aucune PR réelle ni protection testée sur le serveur GitHub : migration distante toujours OPEN.
- [Pages 38668083964](https://github.com/vincentleg/core/actions/runs/38668083964) : succès sur le même SHA ; production https://vincentleg.github.io/core/.
- Chrome production ciblé : 4/4 ; 82 profils, dossier scientifique vérifié HUMAN_REVIEW sans autorisation réelle, implémentation toujours BLOCKED ; zéro requête modèle/NYC et zéro erreur console pendant ce contrôle. Aucun rerun de la suite navigateur complète. Runtime public (HTML/JS/assets/données) inchangé.
- HTTP sans cache : Constitution V1 publiée identique au dépôt, SHA-256 `68e09e4bd4f22dc6466b9ededf079910c1dfcbb88db167e2f88498d399d4cd42` ; index `7dbfc0d76a23498885b8591097a3edc43b8cbe78ec0ef01ebac867a84eb90e51` et corridor `d03259d1c01417190da1a23a72f4540732b31eee511124ec5e0be3af7013096a` inchangés/conformes. Aucune nouvelle investigation NordVPN ni protection machine désactivée.
- Tag annoté `founder-decisions-release-2026-10-14` sur `9ea33c9`, après succès CI/Pages/rehearsal et contrôles production ; aucun tag de phase modifié.
- Traces locales : `/tmp/core-fd-feed-rehearsal.log`, `/tmp/core-fd-production-browser.json`, `/tmp/core-fd-production-http.json`. API main après rehearsal : `protected=false`, SHA `9ea33c9` ; preuve que son passage n’a pas activé une protection ni publié ses données candidates.

## Bilan

**PARTIAL au regard de tous les objectifs**, livraison sûre publiée : FD01/02/04/05/07/08 principes ratifiés et contrôles/préparations applicables réalisés ; FD03 techniquement préparée, activation externe bloquée OP01 ; FD06 données/corridor qualifiés seulement comme candidats, réutilisation et calibration bloquées OP03/OP04. Ne pas demander de ratifier à nouveau les huit orientations. Prochain jalon : preuve des droits/couverture/timings, protocole scellé et relecteur indépendant ; pas de nouvelle fonction visuelle ni efficacité prétendue.
