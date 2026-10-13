# CORE — règles pour l'agent de code (Codex, Claude Code)

CORE est une Terre parallèle en 3D (style « Trame » : fond noir, arêtes cyan) où des agents testent des milliers de
solutions (feux, chantiers, énergie) et où seule une solution testée sort par la « Passerelle », sous forme de permis
à faire signer par un humain. Site statique publié sur GitHub Pages.

## Fichiers
- `index.html` : la Terre réelle (MapLibre GL 5.6 en globe, tuiles OpenFreeMap, bâtiments 3D, recherche Nominatim).
- `src/engine.js` : moteur de trafic, agents, adversaires, Passerelle. Ne pas modifier sa logique sans demande explicite.
- `src/app.js` + `src/template.html` → `corridor.html` via `node build.js` (ne jamais éditer `corridor.html` à la main).
- `HANDOFF.md` : tout le projet (vision, business, design, ce qui est construit). `ROADMAP.md` : les phases. `PROJECT_STATE.md` : où on en est (≤ 30 lignes).

## Règles de travail (économiser les tokens)
- Lis `PROJECT_STATE.md` et seulement les fichiers nécessaires à la phase en cours.
- Une phase à la fois ; arrête-toi dès que son critère de fin (ROADMAP.md) est atteint.
- Pas de refonte du code existant, pas de nouvelle dépendance sans la justifier en une ligne.
- Outils et données gratuits uniquement, sans clé ni compte. Bibliothèques depuis unpkg, versions épinglées.
- Les simulations longues : donne la commande, ne les lance pas en boucle.
- Ne colle pas de grosses données dans la conversation ; écris-les dans des fichiers.
- Vérifier : `python3 -m http.server 8000` puis ouvrir http://localhost:8000.
- Fin de phase : `node build.js` si `src/` a changé, commit, `PROJECT_STATE.md` mis à jour (10 lignes max), `git push`.

## Honnêteté du produit
- Tout ce qui est synthétique, précalculé ou non calibré est indiqué à l'écran.
- Les agents proposent ; la Passerelle (code déterministe) décide de l'état du permis ; rien n'est appliqué au monde réel.
