# Phase 13 — moteur scientifique et preuve de bout en bout

Mandat fondateur explicite « PHASE 13: SCIENTIFIC ENGINE, AGENT TOOLING & END-TO-END PROOF », 2026-10-15 UTC. Base fraîche `c39b3ab`, branche `phase13/scientific-engine`. Phase 13 est une nouvelle livraison autorisée ; elle ne renomme pas les phases O/F/L ou WS12 et ne ratifie aucune décision manquante. Constitution inchangée. Phase 14 proposée seulement.

## Acceptation / livré localement

- [x] Deux questions structurées enregistrées : trafic entièrement synthétique et fourniture énergétique historique. Schéma strict ; aucune instruction libre, URL, outil, rôle ou action réelle depuis la question/contribution.
- [x] Moteur partagé Node/navigateur `src/research.js` ; baseline + deux variantes, hypothèses concurrentes, sensibilités bornées, charge terminale visible ; vérification par recalcul et empreinte. Entrées locales épinglées, droits et provenance explicites.
- [x] Conseil réutilisé/étendu dans `src/science.js` : profils du registre existant, proposition, critique, vérification et révision. Dialogue à politiques déterministes, pas inférence autonome ni validation empirique indépendante ; dossiers Phase 11 préservés.
- [x] Mémoire SQLite CORE : versions/lineage, épisodes et findings candidats, transaction atomique, réouverture/rejeu et détection de corruption ; seconde exécution identique sans écritures. Aucun constat mondial approuvé automatiquement.
- [x] WS12 : acteur pseudonyme inventé, privé par défaut, consentement, nouvelle revue, simulation puis lien de recherche **exacte révision/empreinte** dans l’historique, avant publication. Capacité simulator opaque obligatoire ; relecture déterministe avant attachement. Révision invalide le lien courant ; objections/historique antérieurs conservés. Aucun statut terrain activé.
- [x] Surface `research.html`, liée depuis l’accueil et Science & décisions : contrôles réels, comparaison, sensibilité, débat, sources, export JSON, contribution et limites ; rapport statique sans JavaScript. Sémantique native, labels, skip-link, mobile. Zéro inscription/stockage visiteur ; aucune requête de modèle côté public.
- [x] Expérience d’outillage locale mesurée ; aucune dépendance installée. Adaptateur Ollama facultatif 8 s/100 jetons, schéma/claims contrôlés et repli déterministe ; aucune réponse modèle ajoutée aux preuves. Voir `PHASE_13_TOOLING.md`.

## Reproduction

```sh
node scripts/research.mjs --record
node scripts/research.mjs --question examples/research/traffic-question.json
node scripts/research.mjs --question examples/research/energy-question.json
node scripts/research-experiment.mjs
```

Les deux adapters sont volontairement bornés ; ce n’est pas un chercheur généraliste acceptant n’importe quelle question ou source. Le bridge transforme un scénario WS12 validé en question par mapping de confiance, sans interpréter le texte de contribution comme des instructions. Mémoire privée : `.core-local/research-phase13.sqlite`, ignorée par Git, modes restreints, liens refusés, STOP existant respecté. Artifacts publics générés : `data/research/phase13-demo.json`, `phase13-report.md`. Horloge du scénario WS12 fixée au 14 octobre pour reproductibilité : ce ne sont pas des dates de participation humaine réelle.

## Données, résultats et limites

Trafic : fixture synthétique déjà présente, deux intervalles de 15 minutes, arrivées [12,18], capacités abstraites 12/15/18 ; sommes des files [6,3,0], files terminales [6,3,0]. Pas de mesure Howard, débit réel, délai, coût ou sécurité. Un meilleur chiffre suppose une capacité fictive : aucune faisabilité ou amélioration terrain démontrée. Stress demande 0,8/1/1,2 : hypothèses, pas intervalles de confiance.

Énergie : atlas existant, aucune inflation de sources ; fait numérique public transcrit de l’Energy Institute : 592 EJ de fourniture totale **en 2024**, publication 2025, 366 jours, ≈18,721 TW. Variantes −10 %/+10 % hypothétiques, services et impacts inconnus. Ce n’est pas une nouvelle mesure 2026 ni un dataset de calibration librement redistribué. Source référencée/résumée, aucun article ou table complet copié. K utilise la convention Sagan explicite ; passage original partiellement vérifié, exergie/électricité distinctes, limites thermodynamiques/écologiques et axes humains conservés. Aucun classement de valeur humaine ou efficacité réelle.

Howard 6th–7th reste conditionnel : droits, mesures compatibles, plans de feux, holdout et relecteur manquent. Aucun SUMO installé ou calibré, coopération municipale, essai terrain ou revue indépendante inventés. La mémoire est locale et modifiable par son propriétaire, pas immuable ; identifiants/empreintes ne constituent pas authentification humaine. Main non protégée à la baseline API ; OP01 reste distinct et aucun réglage distant modifié par cette phase.

## Vérification et publication

Tests ciblés frais : 34/34 (Phase 13, Phase 11, WS12 et recherche civilisationnelle), dont injection/schema, actions externes, pins/citations, altération de résultat/dissidence, persistance, transaction/stockage privé, consentement/révision et repli modèle. Enregistrements régénérés ; build reproductible et CSP conformes.

Chromium local isolé : sept vérifications réussies, zéro erreur console/ressource et zéro requête externe ; comparaison, stress, énergie/SI, contribution, labels/skip et mobile. Script `scripts/research-browser.mjs`, preuves `/tmp/core-p13-local.json` et `.png`. Pas de Playwright installé. Firefox/Safari, audit complet d’accessibilité, pentest ou validation scientifique indépendante non effectués.

Intégration finale fraîche `node scripts/verify.mjs` : **170/170**, CSP à jour, intégrité **349 fichiers/zéro constat/six exceptions historiques**, whitespace conforme. Preuve `/tmp/core-p13-integration.log`, cache exact runtime/Node pour les hooks. CI/PR/Pages/production/tag : résultats exacts à consigner après exécution. Aucun résultat historique 159/159 supposé valable pour le nouveau code. Le workflow City Intelligence n’a pas changé ; ses contrats et tests existants passent dans cette intégration.

## Phase 14 proposée — pas commencée

Franchir G0/G1/G3 du pilote mesuré : droits explicites et provenance, comptages/époque/géométrie/timings compatibles, protocole préenregistré/holdout protégé, métriques et revue indépendante. Ensuite seulement adapter un simulateur offline approprié et mesurer son erreur de calibration ; aucun optimiseur de vrais feux ou gain causal avant ces preuves. Protection main/transition bot OP01 reste un gate de publication sûr, pas une permission implicite de modifier les réglages.


## Publication vérifiée

- Implémentation `409eff2707af686e71e2a5cc3b69f6e72bb33fd9`, 31 fichiers ; [PR #2](https://github.com/vincentleg/core/pull/2), fusion normale `b667c6e8d5307785b548f2d08155d9c57b409eb7`. Origin/main relu avant fusion : toujours c39b3ab ; aucune mise à jour planifiée écrasée, aucun force-push ou bypass.
- [CI branche 38693309773](https://github.com/vincentleg/core/actions/runs/38693309773), [CI PR 38693331291](https://github.com/vincentleg/core/actions/runs/38693331291), [CI main 38693440503](https://github.com/vincentleg/core/actions/runs/38693440503) : succès. Preuve locale exacte réutilisée par les hooks, sécurité conservée ; une seule suite locale finale complète 170/170.
- [Pages 38693439788](https://github.com/vincentleg/core/actions/runs/38693439788) réussi sur b667c6e. Production : https://vincentleg.github.io/core/research.html ; Chromium isolé réel : sept contrôles réussis, zéro erreur console/ressource, zéro requête externe (donc aucun modèle ou cityofnewyork). Source et enregistrement vérifiés par recalcul dans la page ; trafic, énergie, facteur, lien WS12 et mobile inspectés. Preuves `/tmp/core-p13-production.json`/`.png`.
- HTTP sans cache : research.html et phase13-demo.json identiques aux octets du dépôt ; empreintes dans `/tmp/core-p13-http-evidence.json`. Les affirmations restent celles de scénarios non calibrés, pas une validation terrain.
- Compatibilité feed : workflow inchangé et tests existants verts dans 170/170 ; [run schedule 38692326870](https://github.com/vincentleg/core/actions/runs/38692326870) observé réussi sur l’ancien c39b3ab, avant fusion. Cela ne prouve pas une collecte sur Phase 13 ni une cadence garantie ; aucune collecte supplémentaire déclenchée pour gonfler les preuves.
- Clôture suivante : documents seulement. Le SHA final, son statut CI/Pages et le tag **phase13-release** sont vérifiés dans Git/GitHub après déploiement ; aucun tag antérieur déplacé.

**Livraison fonctionnelle vérifiée**, avec frontières explicites : deux adapters bornés et agents à règles, pas recherche générale autonome, comptes ouverts ou efficacité réelle. Chrome seul vérifié ; Firefox/Safari et accessibilité exhaustive non vérifiés. OP01/protection main et droits/calibration/revue indépendante SF restent ouverts. Phase 14 non commencée.
