# CORE — état du projet, 14 octobre 2026
- Phases 0 → 10 closes ; production vérifiée : a25169c, tag annoté phase10-release ; rapport : docs/PHASE_10_REPORT.md §P.
- 2 villes opérationnelles (src/cities.js) : San Francisco (pilote, inchangé) et New York (3 NTA de Manhattan, NYC Open Data).
- 82 profils : 35 exécutables (28 à règles + 7 assistés par modèle local) ; 16 opérationnels autonomes ; 47 avec travail enregistré.
- 12 missions autonomes enregistrées (5 SF, 5 NY, 1 aide à la décision, 1 enquête inter-villes), toutes en attente de revue humaine.
- Mémoire SQLite : réutilisation vérifiée, remplacement par instantané plus récent, conflits ; découverte par comparaison d’instantanés (0 changement réel à ce jour).
- Planificateur persistant `scripts/civd.mjs` (file SQLite, reprise après crash, budgets, STOP) ; centre de contrôle local étendu.
- Production https://vincentleg.github.io/core/ : Pages réussi ; 82 profils, couches NYC, démo 9/9 ; 0 requête NYC/modèle non voulue, 0 erreur console.
- Interception HTML locale NordVPN diagnostiquée ; réponse HTTP directe identique au dépôt. Tests au checkpoint : Node 121/121, Chrome 159/159 ; Firefox/Safari et cron horaire non vérifiés.
- Phase 11 non commencée ; uniquement sur demande explicite du fondateur.
