# CORE — état au 12 octobre 2026
- Phase 0 : fondations, audit et validations terminés ; livraison sur main (hash dans le rapport final).
- Dépôt cible existant public : https://github.com/vincentleg/core ; historique local conservé.
- Globe/SoMa et corridor vus dans Chrome ; agents → permis → suspension concert vérifiés.
- Build réussi ; 6 tests Node passent ; moteur et src/app.js inchangés.
- Corrigé : enveloppe HTML/UTF-8, panneaux masqués ; description du globe honnête.
- Données trafic synthétiques/non calibrées ; aucun système de signature ou action réelle.
- Limites : NaN accepté par Passerelle, Nominatim, Esri, avertissements carte ; docs/PHASE_0_AUDIT.md.
- Local : node build.js ; node --test test/*.test.js ; python3 -m http.server 8000.
- Suite : Phase 1 fiabilité (ROADMAP.md), non commencée ; Pages/autres navigateurs non validés.
