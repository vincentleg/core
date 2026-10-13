# CORE — phases de build

Chaque phase livre un site qui marche. Un prompt par phase, à coller dans Claude Code (terminal, dans le dossier du dépôt).
Claude Code lit `CLAUDE.md` automatiquement et s'arrête dès que le critère de fin est atteint. Tout est gratuit, sans compte ni clé, sauf mention.

| Phase | Ce qu'on voit sur le site | Fini quand | État |
| --- | --- | --- | --- |
| 0 | Corridor pilote v0 : agents, plot twists, Passerelle sur un corridor synthétique | `corridor.html` fonctionne | Fait |
| 1 | La Terre réelle : globe, rues et bâtiments 3D du monde entier, recherche d'adresse, satellite, relief | Le site public vole jusqu'à SoMa et affiche les bâtiments en 3D | Fait, à publier |
| 2 | Le corridor sur de vraies rues de San Francisco, véhicules et feux dessinés sur la carte | « Optimiser ce corridor » lance les agents sur les feux réels de SoMa | À faire |
| 3 | N'importe quel carrefour du monde : clic → les agents construisent le réseau local et optimisent | Marche à SF, Paris et Tokyo sans code spécifique | À faire |
| 4 | Agents visibles en 3D au-dessus des carrefours ; plot twists posés à la main sur la carte | Un chantier dessiné sur une rue suspend le permis concerné | À faire |
| 5 | SUMO hors ligne + comptages réels : résultats calibrés rejoués, datés | Écart simulation / comptages affiché avant tout gain | À faire |
| 6 | Bâtiments et énergie : clic sur un bâtiment → l'agent propose une rénovation (EnergyPlus) | Un permis « bâtiment » sort par la Passerelle | À faire |

## Sources de données (gratuites, sans clé)

- Carte vectorielle mondiale, bâtiments avec hauteurs : OpenFreeMap (données OpenStreetMap).
- Feux, rues, carrefours pour les agents : API Overpass d'OpenStreetMap (phase 2).
- Recherche d'adresse : Nominatim (une requête à la fois).
- Relief : AWS Terrain Tiles. Satellite : Esri World Imagery (conditions d'usage commercial à vérifier avant de vendre).

## Prompts pour Claude Code

**Phase 2**
> Phase 2 de ROADMAP.md. Dans `index.html`, ajoute un panneau « Corridor » et un bouton
> « Optimiser ce corridor » sur le marqueur pilote. Au clic : requête Overpass des nœuds `highway=traffic_signals` le long de
> Folsom Street entre 2nd St et 6th St ; ordonne-les, calcule les distances ; construis `CORRIDOR.xs` à partir d'elles
> (expose une fonction `setCorridor(xs)` dans `src/engine.js` sans changer le reste). Dessine véhicules (cercles) et feux
> sur la carte via une source GeoJSON mise à jour à chaque image, positionnée le long de la géométrie réelle de la rue.
> Reprends le panneau agents / plot twists / Passerelle de `src/app.js`. Fini quand les agents tournent sur les feux réels
> et que le permis s'affiche. Ne modifie pas la logique des agents ni de la Passerelle.

**Phase 3**
> Généralise la phase 2 : clic sur un feu n'importe où → Overpass récupère les feux du même axe dans 800 m → corridor →
> agents. Gère l'absence de feux (message clair). Fini quand ça marche à SF, Paris et Tokyo.

**Phase 4**
> Ajoute une couche 3D (couche personnalisée MapLibre + three.js depuis unpkg) : agents en polyèdres filaires au-dessus
> des carrefours pendant la recherche. Outil « tracer un chantier » : l'utilisateur clique sur une rue, la voie est fermée
> dans le scénario, la Passerelle réévalue le permis.

**Phase 5** (sur ta machine, Python)
> `pip install eclipse-sumo optuna`. `tools/sumo_eval.py` reproduit `evaluate(plan, scenario)` avec SUMO sur le réseau
> OSM du corridor. Recherche hors ligne, résultats dans `data/results.json`, rejoués par le site avec la date de calcul.
> Donne-moi les commandes ; ne lance pas les longues simulations toi-même.
