# PROJECT_STATE (12 oct. 2026)

Fait
- Phase 0 : `corridor.html` (moteur + agents + Passerelle, testé en Node : 3 030 simulations, permis, plot twists).
- Phase 1 : `index.html` — MapLibre GL 5.6 en globe, style Trame sur tuiles OpenFreeMap, bâtiments 3D,
  recherche Nominatim, satellite Esri, relief AWS. Syntaxe vérifiée ; rendu à vérifier dans un vrai navigateur
  (construit sans accès réseau).

Lancer : `python3 -m http.server 8000` puis http://localhost:8000 · Reconstruire le corridor : `node build.js`

Développement : Claude Code en local (règles dans CLAUDE.md).
Prochaine phase : 2 (corridor sur les feux réels de Folsom St). Voir ROADMAP.md.
