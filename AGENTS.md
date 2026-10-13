# CORE — règles pour l'agent de code (Codex, Claude Code)

CORE vise une Terre parallèle en 3D (style CORE : fond noir, arêtes cyan). Le dépôt contient actuellement
un globe cartographique et un corridor synthétique séparé. La Passerelle produit des propositions de permis
à faire signer par un humain. Site statique compatible GitHub Pages ; publication à vérifier séparément.

## Fichiers
- `index.html` : la Terre réelle (MapLibre GL 5.7.3 en globe, tuiles OpenFreeMap, bâtiments 3D, recherche locale) + vue San Francisco (`src/sf-world.js`, `src/sf-view.js`, données `data/sf` régénérées par `node scripts/sf-snapshot.mjs`, jamais éditées à la main).
- `src/engine.js` : moteur de trafic, agents, adversaires, Passerelle. Ne pas modifier sa logique sans demande explicite.
- `src/app.js` + `src/template.html` → `corridor.html` via `node build.js` (ne jamais éditer `corridor.html` à la main).
- `HANDOFF.md` : contexte historique. `ROADMAP.md` : phases actuelles (nouvelle Phase 0 fondations). `PROJECT_STATE.md` : état courant (10 lignes max). `docs/PHASE_0_AUDIT.md` : constats et validations.

## Règles de travail (économiser les tokens)
- Lis `PROJECT_STATE.md` et seulement les fichiers nécessaires à la phase en cours.
- Une phase à la fois ; arrête-toi dès que son critère de fin (ROADMAP.md) est atteint.
- Pas de refonte du code existant, pas de nouvelle dépendance sans la justifier en une ligne.
- Outils et données gratuits uniquement, sans clé ni compte. Bibliothèques depuis unpkg, versions épinglées.
- Les simulations longues : donne la commande, ne les lance pas en boucle.
- Ne colle pas de grosses données dans la conversation ; écris-les dans des fichiers.
- Vérifier : `python3 -m http.server 8000` puis ouvrir http://localhost:8000.
- Construire avec `node build.js` ; tester avec `node --test test/*.test.js`. Déclarer toute validation navigateur manquante.
- Fin de phase : `node build.js` si `src/` a changé, commit, `PROJECT_STATE.md` mis à jour (10 lignes max), `git push`.
- Préserver l'historique et les modifications de l'utilisateur ; jamais de force-push. Vérifier le distant avant de publier.
- Examiner les fichiers et l'historique avant publication : aucun secret, identifiant d'accès, fichier sensible, cache ou gros résultat généré.
- Outils libres uniquement ; aucune API payante, aucun abonnement ni facturation automatique. Les services existants non conformes sont inventoriés dans `docs/DATA_SOURCES.md`.
- Garder le moteur et la Passerelle déterministes et testables. Aucun refactoring non nécessaire ; avancer de façon autonome sur les tâches courantes autorisées.

## Honnêteté du produit
- Tout ce qui est synthétique, précalculé ou non calibré est indiqué à l'écran.
- Les agents proposent ; la Passerelle (code déterministe) décide de l'état du permis ; rien n'est appliqué au monde réel.
- « Prêt pour signature » ne signifie jamais « approuvé ». Aucun gain non calibré ne représente une amélioration réelle mesurée.
