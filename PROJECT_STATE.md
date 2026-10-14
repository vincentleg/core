# CORE — état du projet, 14 octobre 2026
- Phases 0 → 10 terminées ; Phase 10 : docs/PHASE_10_REPORT.md. Site public : https://vincentleg.github.io/core/
- 2 villes opérationnelles (src/cities.js) : San Francisco (pilote, inchangé) et New York (3 NTA de Manhattan, NYC Open Data).
- 82 profils : 35 exécutables (28 à règles + 7 assistés par modèle local) ; 16 opérationnels autonomes ; 47 avec travail enregistré.
- 12 missions autonomes enregistrées (5 SF, 5 NY, 1 aide à la décision, 1 enquête inter-villes), toutes en attente de revue humaine.
- Mémoire SQLite : réutilisation vérifiée, remplacement par instantané plus récent, conflits ; découverte par comparaison d’instantanés (0 changement réel à ce jour).
- Planificateur persistant `scripts/civd.mjs` (file SQLite, reprise après crash, budgets, STOP) ; centre de contrôle local étendu.
- Déplacements validés dans les deux villes (chaque agent sur le réseau piéton de sa ville) ; démo investisseur en 9 étapes.
- Tests : 121 Node ; Chrome 159/159 ; négatif 12/12 ; Firefox/Safari non vérifiés ; coût 0 $.
- Phase 11 : sur demande explicite du fondateur.
