# Récupération automation et préparation scientifique

Mandat : consolidation finale du fondateur ; 2026-10-15 UTC. Base `747730564f950a85ae9dd036219f000b897a2ce6`, branche `consolidation/security-science-recovery`. Changements autorisés : corrections minimales, fondations/registre, validation et publication sûre ; aucun nouvel outil, coût, compte, réglage distant non autorisé ou intervention réelle.

## Acceptation et travail effectué

- Cause cron identifiée sur les logs réels GitHub, test corrigé et régression déterministe ajoutée ; limites de collecte, provenance, source validation et workflow planifié préservés.
- Catalogue civilisationnel exécutable, références datées/qualité/limites, calculs SI et sensitivités honnêtes ; recherche réutilisant le moteur existant dans un espace séparé. Pas de refonte UI ni de simulation calibrée.
- Confidentialité du paquet pilote durcie : métadonnées inattendues et dates de droits futures rejetées. CSV SFMTA relus pour qualification de métadonnées seulement ; aucun tableau de mesures redistribué.
- Matrice WS1–WS12, engagements additionnels et cadre privacy/réglementaire ; phases historiques, 22 engagements antérieurs et décisions FD01–08 préservés.
- Migration PR et payload de protection préparés/inactifs ; preuves API et action externe exacte consignées dans `GITHUB_PROTECTION_MIGRATION.md`. Pas de contournement, token plus puissant ou bot désactivé.

## Cause exacte du cron

[Run 38682336769](https://github.com/vincentleg/core/actions/runs/38682336769), SHA `73110ec`, collecte le 2026-10-15 vers 04:36:22 UTC. 354 items, 4 nouveaux, 1 changé, **zéro source en échec** dans ce run. `datasf-311-soma`, intervalle 360 minutes, avait été tenté à `2026-10-14T22:36:30.117Z` : encore environ huit secondes à attendre au début du run, donc correctement ignoré. Le test exigeait zéro source due une minute après le dernier succès global ; le 311 devenait alors légitimement dû. L’assertion confondait horloge globale et horloges de chaque source.

Correction limitée à `test/phase3.test.js` : vérifier absence de retry **avant l’échéance propre de chaque source**, conserver les tests de délais/retired et ajouter la régression six-heures/une-minute. Aucun assouplissement du collecteur ni suppression de garde. Logs téléchargés localement dans `/tmp/core-recovery-cron-failure.log`, non publiés.

## Limites matérielles

Main non protégée et Actions PR désactivées à la réinspection ; OP01 explicite et PR réelle de transition manquent. Paramètres distants inchangés. Code propriétaire provisoire, aucune licence CORE ajoutée ; notices tierces conservées. Pas de qualification juridique globale ni scan CVE/pentest exhaustif. Outillage absent de PATH n’est pas preuve d’absence sur toute la machine.

Howard 6th–7th puis Folsom/Main : shortlist conditionnelle. Accès aux fichiers ≠ droits ; époques, timings, holdout, méthodes et revue indépendante non qualifiés. G0/G3 bloqués ; aucune mesure ou causalité inventée. Gate terrain toujours fermé.

## Résultats de validation/publication

Validation fraîche locale : ciblés 33/33 ; intégration `node scripts/verify.mjs` 159/159, CSP à jour, intégrité 330 fichiers/zéro constat/six exceptions historiques, whitespace conforme. Première tentative dans le sandbox : 157/159 (deux serveurs loopback non démarrés) ; répétition autorisée avec loopback : 159/159, sans modification du code. Preuves locales `/tmp/core-recovery-targeted.log` et `/tmp/core-recovery-integration-unrestricted.log`. Catalogue 11 sources/10 affirmations, retrieval et calcul exécutés. Résultats distants consignés ci-dessous. Aucun résultat historique 153/153 réutilisé comme preuve du nouveau code. Les tests ciblés vérifient notamment le ledger WS12 et ses frontières, sans refaire son développement. Pas de nouvelle validation exhaustive navigateur/accessibilité/réglementaire/scientifique revendiquée.


## Livraison et automation vérifiées

- Implémentation : `1c1e5eb22fc8f898f87fe854f3946c7138e76575`, 22 fichiers ; [PR #1](https://github.com/vincentleg/core/pull/1), fusion normale `a1e5f3eee0f4416ffed19378b77696d368c2da6f`. Main relue immédiatement avant intégration, aucun update concurrent écrasé, aucune réécriture/force-push.
- [CI branche 38690003577](https://github.com/vincentleg/core/actions/runs/38690003577), [CI PR 38690034632](https://github.com/vincentleg/core/actions/runs/38690034632), [CI main 38690185100](https://github.com/vincentleg/core/actions/runs/38690185100) : succès.
- [Rehearsal read-only 38690024915](https://github.com/vincentleg/core/actions/runs/38690024915) : succès, 364 éléments/14 nouveaux/1 modifié/zéro source en échec, périmètre JSON contrôlé, 159/159, intégrité 330 fichiers/zéro constat/six exceptions existantes ; aucune publication par ce run.
- [Vrai workflow city-feed 38690197479](https://github.com/vincentleg/core/actions/runs/38690197479), **workflow_dispatch manuel**, sur main : succès. Collecte 364 éléments/14 nouveaux/1 modifié/zéro échec, tests 159/159 et intégrité des 17 JSON attendus avant commit/push. Commit bot `a646c84` récupéré par avance rapide ; fichiers exclusivement sous `data/feeds`, `data/missions`, `data/agents`, aucun changement de code ou hors périmètre. Dernier succès `2026-10-15T06:03:45.421Z`. Pas de nouvelle collecte locale ni de répétition de tests après simple récupération du commit testé.
- Les schedules/gates et permissions n’ont pas changé. La réparation du parcours réel est vérifiée ; le **prochain déclenchement schedule**, sa ponctualité et un SLA ne sont pas établis par un lancement manuel. Source retirée/ancienne reste explicitement signalée ; aucun LLM ne s’exécute dans ce cron.
- [Pages 38690184922](https://github.com/vincentleg/core/actions/runs/38690184922) sur `a1e5f3e` : succès. HTTP production https://vincentleg.github.io/core/ : catalogue, index et exemple WS12 reçus identiques au dépôt. SHA-256 catalogue `f8d62c3b765081b8680aabdec23c7d2356b167a65a228cea3a6e1bc975aecbd0`, index `7dbfc0d76a23498885b8591097a3edc43b8cbe78ec0ef01ebac867a84eb90e51`, exemple `42ed0879df99a0328aca91b7ae145bb9f7e7e9e53d7f0baaea34f8e28430f631`. Preuve locale `/tmp/core-recovery-production-evidence.json`. La publication documentaire suivante embarque également le commit bot testé ; son SHA/CI/Pages et le tag final sont confirmés dans Git/GitHub à la clôture, pas inventés ici.

**Résultat : PARTIAL**, changements sûrs livrés, récupération réelle réussie ; protection distante encore inactive et pilote non calibré. Blocages externes exacts : OP01/permission PR et cadence de revue avant bascule/protection ; droits/époque/timings des mesures et relecteur/holdout avant calibration ; politiques de rétention/contribution commerciale/authentification avant Public/Business. Les trois premiers gates scientifiques restent prioritaires aux cosmétiques.
