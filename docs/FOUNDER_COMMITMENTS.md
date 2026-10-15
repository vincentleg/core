# CORE — registre traçable des engagements

Reconstruction à partir du dépôt à `1f0adb4` et du mandat de consolidation de cette session. SOURCE DOCUMENTÉE ≠ preuve d’une ratification constitutionnelle. SESSION AUTORISÉE signifie uniquement le périmètre explicite de cette mission ; aucun mandat terrain, nouvelle phase, achat ou réglage GitHub n’en découle.

Mise à jour 2026-10-14 : [FD01–FD08](FOUNDER_DECISIONS.md) sont approuvées dans la session présente. Les 17 engagements et leurs origines restent conservés ; approbation actuelle ne prouve pas une ratification historique. Constitution actuelle : V1 ; état opérationnel courant : PROJECT_STATE.md.

| ID / exigence | Origine récupérée | Statut de décision | Preuve d’implémentation | État | Priorité / action |
| --- | --- | --- | --- | --- | --- |
| FC01 — « Solve in the virtual world. Improve the real one. » | Brief L11 et mandat actuel ; PRODUCT_VISION | SESSION AUTORISÉE ; formulation historique non vérifiée | Dossier L11 et limites affichées | PARTIEL : pas d’amélioration réelle mesurée | P0 / conserver les limites |
| FC02 — Passerelle déterministe, humains autorisent | HANDOFF §§2.1,3.2 à `5c99cfe` ; D003 | SOURCE DOCUMENTÉE | engine/coord/cognitive/science, tests négatifs | IMPLÉMENTÉ pour propositions seulement | P0 / authentification avant Business |
| FC03 — Preuve retirée jamais plus permissive, inconnu ≠ faux | HANDOFF §2.1, héritage KEYSTONE | SOURCE DOCUMENTÉE | Tests de preuves manquantes, recalcul et BLOCKED | PARTIEL : indépendance/lineage des sources non généralisées | P0 / définir propriétés de monotonie par passerelle |
| FC04 — Autorisation conditionnelle et révocation sélective | HANDOFF §§2.1,3.2 ; O4/F4 | SOURCE DOCUMENTÉE | Permis synthétiques/dépendances et réévaluation | PARTIEL, pas TTL/signature/révocation opérationnels | P0 avant action réelle |
| FC05 — Calibration avant gains | O5 `7824682:ROADMAP.md`, F3 `56884e6:ROADMAP.md`, PRODUCT_VISION | SOURCE DOCUMENTÉE | Affichage non calibré, sensibilité et protocole L11 | DIFFÉRÉ ; pas de SUMO/holdout terrain | P1 / plan pilote préenregistré |
| FC06 — SF puis généralisation de vrais feux | O2/O3 | SOURCE DOCUMENTÉE | Géographie et données SF/NY ; Paris/Tokyo navigation | NON LIVRÉ selon critères originels | P1 / suivre les critères différés (FD02), pas prétendre clos |
| FC07 — Bâtiments/énergie par EnergyPlus | O6 ; HANDOFF §7 | SOURCE DOCUMENTÉE | Benchmarks énergétiques seulement | DIFFÉRÉ | P3 / autorisation distincte future |
| FC08 — Séparer surface publique et actifs sensibles | HANDOFF §4.5 | SOURCE DOCUMENTÉE | Sources publiques, données agrégées, exclusions | PARTIEL ; pas de RBAC professionnel/souverain | P0 avant données privées |
| FC09 — Accès souverain, journaux, hébergement territorial | HANDOFF §4.5 | SOURCE DOCUMENTÉE | Journaux locaux chaînés, pas d’hébergement territorial | DIFFÉRÉ ; chaîne non ancrée indépendamment | P0 avant Business |
| FC10 — Coût additionnel nul, versions épinglées | HANDOFF §8, AGENTS, D006/D009/D039 | SOURCE DOCUMENTÉE + SESSION AUTORISÉE | Pas de nouvelle dépendance/service ; CI standard publique | IMPLÉMENTÉ pour cette mission ; facturation outils existants non vérifiée | P0 / aucun achat ni auto-topup |
| FC11 — Outils autorisés, modèle non décisionnaire | D018/D025/D028/D031/D032 | SOURCE DOCUMENTÉE | Registre, canUse, validateurs, apprentissage contrôlé | IMPLÉMENTÉ localement, pas une isolation OS complète | P0 / tests de permissions conservés |
| FC12 — Mémoire persistante et reprise | D060/D071/D072 ; phases 9/10 | SOURCE DOCUMENTÉE | SQLite, checkpoints, conflits/supersession | IMPLÉMENTÉ ; pas mémoire universelle inter-outils | P1 / conserver preuve/provenance |
| FC13 — Civilization prioritaire, Business pro, World B2C distant | Mandats récents L11/consolidation ; HANDOFF §3.2 ne donne pas exactement ces noms | APPROUVÉ FD02 ; formulation antérieure UNVERIFIED | MASTER_ROADMAP et frontières proposées | APPROUVÉ, Business/World non livrés | P0 / respecter les frontières |
| FC14 — Constitution, anti-Sybil et anti-manipulation originels | Évoqués dans le mandat actuel, texte antérieur absent du dépôt/historique inspecté | Principes APPROUVÉS FD01 ; ancien texte UNVERIFIED | CONSTITUTION_V1, AUTHORITY_POLICY ; aucun système d’identité ajouté | V1 approuvée ; politiques détaillées OPEN | P0 avant contributions externes |
| FC15 — Claude-Mem/Ruflo/ECC/OmniRoute/LiteLLM et routing | Mentionnés dans les échanges récents ; aucun ADR d’adoption retrouvé | UNVERIFIED / FOUNDER CONFIRMATION REQUIRED | TOOLING_INVENTORY, configurations inspectées sans secrets | NON ADOPTÉS par cette mission | P2 / FD08 approuve les critères, pas les outils ; benchmark/licence avant adoption |
| FC16 — Séquence originelle de Phase 11 | Aucune Phase 11 retrouvée dans O/F ; L11 ajouté à `088ebe4` | UNVERIFIED / FOUNDER CONFIRMATION REQUIRED pour équivalence historique | Livraison récente autorisée ; tag existant conservé | L11 RELEASED, équivalence non prouvée | P0 / ne pas réécrire l’histoire |
| FC17 — Consolider, tester, publier sans Phase 12 | Mandat explicite de cette session | SESSION AUTORISÉE | Branche dédiée, CI/loader/hooks/CSP, rapport de consolidation | LIVRÉ, CONSOLIDATION_REPORT ; mandat FD actuel distinct | P0 / pas de Phase 12 ; OP01 avant réglages GitHub |

Les versions originales restent dans Git ; les nouveaux registres ne leur donnent pas rétroactivement un autre sens. Pour compléter une décision de conversation : fournir une référence/export explicite, citer son périmètre/date, marquer la confirmation et conserver le texte précédent. Une préférence supposée, un résumé d’agent ou une fusion Git ne vaut pas approbation du fondateur.


## Engagements additionnels — mandat Workstream 12 (2026-10-14 Pacific)

Les 17 engagements initiaux ci-dessus restent traçables. Les cinq suivants proviennent du message fondateur présent, pas d’une approbation ancienne supposée. Vision/fondations locales approuvées ; ouverture d’un service, droits commerciaux et interventions réelles non autorisés.

| ID / exigence | Origine / décision | Preuve et état | Priorité / prochaine action |
| --- | --- | --- | --- |
| FC18 — CORE noyau partagé et codex humain/scientifique générationnel | WS12 introduction/F ; APPROUVÉ vision | CORE_AVATAR_VISION, modèle versionné local ; pas communauté mondiale ni conservation perpétuelle | Science/FD03 d’abord ; continuité soutenable avant service |
| FC19 — Identité pseudonyme/avatar optionnels, vie privée, alternative accessible ; aucun classement de valeur humaine | WS12 A/B/C/E ; APPROUVÉ | Schémas, consentements séparés, aucun rôle depuis contenu ; prototype synthétique, pas authentification ni UI 3D | Protection des tiers/modération/accessibilité avant comptes |
| FC20 — Traçabilité contribution/impact et états d’autorisation distincts | WS12 D/H/J ; APPROUVÉ fondations | Ledger/tests/exemple synthétique ; preuve/revue/calcul/publication séparés ; états d’impact réel désactivés | Mandat/identité/validation avant toute opération terrain |
| FC21 — Versions, échecs, corrections, attribution, export/retrait/effacement et transfert générationnel | WS12 A/F ; APPROUVÉ principes | SQLite privée, chronologie et export propriétaire ; suppression logique seulement | Rétention/succession/sauvegardes/droits restent OPEN |
| FC22 — CORE Public → Civilization → Business sans fuite ni autorisation implicite | WS12 G ; APPROUVÉ frontière, modalités commerciales OPEN | Aucune base B2B interrogée, aucun privilège ou licence commerciale accordé | Approbation explicite crédit/licences/consentement/rémunération avant réutilisation commerciale |


## Mandat de consolidation finale — 2026-10-15 UTC

Origine : message explicite « FINAL CONSOLIDATION, SECURITY RECOVERY & SCIENTIFIC READINESS ». FC01–FC22 restent intacts ; pas de récupération fictive d’une décision ancienne.

| ID / exigence | Origine / portée approuvée | Preuve et état | Prochaine action |
| --- | --- | --- | --- |
| FC23 — CORE = Creation Of Reborn Earth, entreprise soutenable et noyau participatif de savoir | Identité du mandat actuel ; vision approuvée, pas statut juridique ni communauté livrée | CIVILIZATION_RESEARCH, matrice WS1–12 et limites des trois produits | Préserver science et droits avant service |
| FC24 — Kardashev comme fondation de recherche, énergie non suffisante pour le progrès | Phases E/identité du mandat ; recherche/calculs bornés autorisés | Catalogue daté, recherche locale existante réutilisée, calculs SI/testés ; origine Sagan détaillée encore partielle | Revue experte et métriques multi-axes sans classement humain |
| FC25 — Paix, prospérité, liberté, coopération, soutenabilité et inspiration optimiste | Vision actuelle explicite ; aucune efficacité humanitaire inventée | Cadre proposé dans CIVILIZATION_RESEARCH ; pas d’index/poids ratifiés ou de mesures d’impact | Choisir indicateurs/sources/revue avant allégation |
| FC26 — Récupérer cron et renforcer main sans casser l’automatisation | Phases B/C/H ; corrections/release autorisées, réglages conditionnés à OP01 et transition vérifiée | Régression temporelle corrigée ; payload/template PR inactifs, état API documenté | Rehearsal/run réel ; accord OP01, PR vérifiée puis protection sans bypass |
