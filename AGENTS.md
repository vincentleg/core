# CORE — règles des agents de code

Terre parallèle 3D, noir/cyan : globe cartographique et corridor synthétique séparé ; site statique compatible GitHub Pages.

## Périmètre et contexte
- Phases 10–11 closes ; aucune nouvelle phase sans demande explicite. Une phase autorisée à la fois ; arrêter au critère de fin. Commit, push, tag et déploiement seulement sur autorisation explicite.
- Lire `PROJECT_STATE.md` si nécessaire, `ROADMAP.md` pour une phase autorisée, les historiques pour une question non résolue. Réutiliser le contexte déjà chargé.
- Un agent ; aucune délégation sans autorisation. Lectures ciblées, regroupées si indépendantes ; sorties bornées, grosses preuves dans des fichiers. Simulations longues : fournir la commande, sans boucles.
- Préserver code, historique et travail utilisateur ; aucun refactoring superflu. Justifier chaque dépendance nouvelle. Jamais de force-push ; vérifier le distant et préserver les changements concurrents avant publication.

## Garanties
- Moteur et Passerelle déterministes et testables ; calculs et validation des preuves en code, jamais par le modèle. Preuves invalides, inconnues ou incomplètes : bloquer. Logique de `src/engine.js` : modification sur demande explicite seulement.
- `src/app.js` + `src/template.html` → `corridor.html` via `node build.js` ; jamais d’édition manuelle du résultat. Régénérer `data/` avec ses scripts.
- Outils/données libres, gratuits, sans clé ni compte ; aucun service payant, abonnement ou facturation automatique. Versions épinglées ; vérifier licences, attribution, confidentialité et redistribution des sources concernées (`docs/DATA_SOURCES.md`).
- Avant publication : examiner fichiers et historique concernés ; aucun secret, identifiant d’accès, donnée personnelle/sensible, base locale, cache ou gros résultat généré. Activer `git config core.hooksPath .githooks` ; ne contourner aucun contrôle de sécurité ou de preuves.
- Afficher ce qui est synthétique, précalculé, approximatif ou non calibré ; distinguer observations, hypothèses, simulations et relectures. Aucun gain non calibré n’est une amélioration réelle mesurée. Agents : propositions ; Passerelle : état du permis ; humain : autorisation. « Prêt pour signature » ≠ « approuvé » ; aucune action réelle ni relecture présentée comme du direct.

## Validation et checkpoints
- Tests affectés d’abord ; suite `node --test test/*.test.js` pour intégration majeure/release. Répéter seulement après changement pertinent, échec ou incertitude justifiée ; investigation ciblée. Préserver les contrôles de sécurité, de preuves et de déterminisme.
- `node build.js` si ses entrées changent. Navigateur si nécessaire : `python3 -m http.server 8000 --bind 127.0.0.1`, puis http://localhost:8000. Déclarer toute validation manquante.
- Documentation seule : revue du diff, `git diff --check`, intégrité applicable ; aucun test applicatif/navigateur sans raison liée au changement.
- Checkpoints : état, commit, validations et périmètre, liens de preuves, blocages. `PROJECT_STATE.md` : 10 lignes maximum, actualiser si l’état change. Distinguer résultats enregistrés et nouveaux ; ne présumer aucun succès.
