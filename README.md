# CORE — La Trame

Une Terre parallèle où des agents testent des milliers de solutions avant qu'elles touchent le monde réel.

- `index.html` : la Terre réelle en 3D (globe, rues, bâtiments, recherche, satellite, relief).
- `corridor.html` : le corridor pilote, avec les agents, les plot twists et la Passerelle (généré par `node build.js`).
- `src/engine.js` : moteur de trafic, agents, Passerelle. `src/app.js` : rendu du corridor.
- Phases suivantes : voir `ROADMAP.md`.

## Voir le site

En ligne : GitHub Pages (Settings → Pages → branche `main`, dossier `/`).
En local : `python3 -m http.server 8000` dans ce dossier, puis http://localhost:8000.

## Données

Carte © OpenStreetMap contributors, tuiles OpenFreeMap / OpenMapTiles. Relief : AWS Terrain Tiles.
Imagerie satellite : Esri World Imagery (vérifier les conditions avant tout usage commercial).
