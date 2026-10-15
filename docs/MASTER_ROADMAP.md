# CORE — master roadmap consolidé

Statut : reconstruction documentaire, pas ratification rétroactive. Base auditée : `1f0adb4` ; Phases 10/11 livrées à `a25169c` / `088ebe4`. Directions FD01–FD08 approuvées le 2026-10-14 ; mission actuelle : **Phase 13, moteur scientifique et preuve de bout en bout**, après récupération et livraison du Workstream 12, sans ouverture publique ni phase cosmétique. Constitution V1 et directions actuelles : [FOUNDER_DECISIONS.md](FOUNDER_DECISIONS.md). Les décisions de conversation absentes du dépôt restent UNVERIFIED / FOUNDER CONFIRMATION REQUIRED.

## Hiérarchie des preuves et produits

Une instruction explicite du fondateur définit le périmètre autorisé ; un commit ou un rapport ne prouve pas à lui seul une approbation fondatrice. Conserver les versions contradictoires et leur provenance. Sources : `HANDOFF.md` §§2–4,7 (`5c99cfe`), `ROADMAP.md` à `7824682` et `56884e6`, `docs/PRODUCT_VISION.md`, `docs/DECISIONS.md` D003/D007/D013/D018/D023/D031/D039/D070, rapports de phases. Le registre [FOUNDER_COMMITMENTS.md](FOUNDER_COMMITMENTS.md) distingue source retrouvée, autorisation de cette session et décision non récupérée.

- **CORE Civilization — priorité** : preuves, agents spécialisés, hypothèses concurrentes, simulations bornées, contestation, dossier vérifiable ; pas de contrôle réel.
- **CORE Business — professionnel** : futur parcours ville/opérateur/validateur, actifs et permissions territoriales, identité réelle, signatures, responsabilité, audit et validation terrain. Non livré par un prototype public ou un préfixe `human:`.
- **CORE World — B2C lointain et optionnel** : bac à sable grand public/XR ; ni priorité actuelle ni dépendance de Civilization. La navigation « Monde » et la carte 3D sont un contexte géographique, pas la preuve d’un produit B2C.

Cette séparation est approuvée par FD02 ; son éventuelle formulation exacte dans les anciennes conversations est non récupérée. Ne pas inventer une validation historique des trois noms.

## Numérotation originelle O — `7824682:ROADMAP.md`, confirmée par HANDOFF §7

| Phase / engagement original | Critère de fin original | État face à ce critère / dette |
| --- | --- | --- |
| O0 — Corridor pilote v0 | `corridor.html` fonctionne | Livré ; corridor synthétique conservé |
| O1 — La Terre réelle | Site public volant vers SoMa et affichant les bâtiments en 3D | Livré ; satellite Esri/recherche Nominatim désactivés pour contraintes documentées |
| O2 — Corridor sur les vraies rues de SF | « Optimiser ce corridor » lance les agents sur les feux réels de SoMa | NON LIVRÉ ; coordination de permis ≠ optimisation des feux réels |
| O3 — N’importe quel carrefour du monde | Fonctionne à SF, Paris et Tokyo sans code spécifique | NON LIVRÉ ; Paris/Tokyo : navigation seulement |
| O4 — Agents 3D et plot twists manuels | Un chantier dessiné suspend le permis concerné | PARTIEL ; avatars/relectures, pas ce parcours d’autorisation/révocation |
| O5 — SUMO hors ligne + comptages réels | Écart simulation/comptages affiché avant tout gain | DIFFÉRÉ ; pas de calibration réelle ni SUMO intégré |
| O6 — Bâtiments et énergie | Permis bâtiment par la Passerelle avec EnergyPlus | NON LIVRÉ ; benchmarks énergétiques ≠ simulateur/permis bâtiment |

## Refonte F — `56884e6:ROADMAP.md`

| Phase / nom exact | Acceptation originale à préserver | Correspondance / statut |
| --- | --- | --- |
| F0 — Foundation & GitHub | Docs, build/tests, historique et publication vérifiée | Livré, rapport Phase 0 |
| F1 — Prototype reliability & data honesty | Navigateurs, provenance, conformité des fournisseurs, preuves bloquantes | Clos avec réserves : Safari/iOS non validés |
| F2 — One real street corridor | Snapshot reproductible, licence/date, géométrie et hypothèses synthétiques explicites | Couvert en partie par 2A–2C ; ne pas le confondre avec O2 |
| F3 — Calibrated pilot | Calibration/holdout, incertitude avant gains, résultats datés, revue ingénieur | DIFFÉRÉ, renommé « 10+ » ; reste une dépendance de toute prétention d’efficacité réelle |
| F4 — Roadworks coordination | Propositions sourcées, validité/révocation, revue humaine, résultats pilote mesurés | PARTIEL ; analyses présentes, pilote mesuré/autorisation opérationnelle absents |
| F5 — Generalization | Contrats portables, simulateurs spécialisés, limites de données/géographie testées | PARTIEL ; SF/NY et tests de frontières, sans généralisation des simulateurs calibrés |
| Later | Critères et revue de sources/sécurité par domaine | Vision : énergie, eau, sous-sol, collaboration, XR ; aucune autorisation automatique |

## Livraisons L — numérotation courante conservée

| Phase / nom exact | Livraison et preuve versionnée | Acceptation différée à ne pas effacer |
| --- | --- | --- |
| L0 — Foundation & GitHub | `56884e6`, `PHASE_0_AUDIT.md` | Pas une certification scientifique |
| L1 — Prototype reliability & data honesty | `53d1b8e`, `PHASE_1_REPORT.md` | Safari/iOS et appareils physiques |
| L2A — San Francisco technical discovery | `63c878d`, `PHASE_2A_TECHNICAL_AUDIT.md` et cinq specs associées | Comptages/temps de feux absents |
| L2B — San Francisco world foundation | `8418261`, `PHASE_2B_REPORT.md` | Géométrie/rendu approximatifs |
| L2C — Real-world agents & coordination intelligence | `fa085d0`, `PHASE_2C_REPORT.md` | Coordination conditionnelle, pas travaux observés |
| L2D — San Francisco city intelligence foundation | `628c66f`, `PHASE_2_REPORT.md` | Alternatives exploratoires, pas causalité |
| L3 — Agent organization, city intelligence & professional platform | `fc44dce`, `PHASE_3_REPORT.md` | Profils non exécutables explicités |
| L4 — Model-assisted agents & living City Intelligence | `d9af01d`, `PHASE_4_REPORT.md` | Interprétation LLM ≠ autorité factuelle |
| L5 — Urban intelligence, multi-agent reasoning, simulation & public deployment | `03202c2`, `PHASE_5_REPORT.md` et évaluations | Simulations non calibrées, évaluations non indépendantes |
| L6 — World 2.0 · intelligence experience · investor-grade platform | `a201121`, `PHASE_6_REPORT.md` | Présentation ≠ validation terrain |
| L7 — The Living Civilization | `7e359c5`, `PHASE_7_REPORT.md` | Relectures publiques, pas activité autonome continue |
| L8 — The Living Civilization (observable, controlled) | `ea34cfd`, `PHASE_8_REPORT.md` | Contrôles locaux, pas identité professionnelle |
| L9 — Autonomous intelligence & living civilization | `phase9-release`, `PHASE_9_REPORT.md` | Aucune décision humaine terrain démontrée |
| L10 — Autonomous planetary intelligence network | `phase10-release`, `PHASE_10_REPORT.md` | Deux zones d’étude, pas couverture planétaire ; comparabilité limitée |
| L11 — Scientific intelligence | `phase11-release`, `PHASE_11_REPORT.md` | Reproductibilité/contestation à règles, pas calibration, indépendance expérimentale ni efficacité réelle |

Les chemins des rapports ci-dessus sont sous `docs/`. Statut « livré/clos » : livraison logicielle avec limites, **pas validation de toutes les ambitions O/F**. Aucune Phase 11 originelle retrouvée avant `088ebe4` ; son adéquation à un master plan conversationnel antérieur reste UNVERIFIED. Le brief récent autorisant L11 est connu de la session, pas une constitution retrouvée.

## Ordre stratégique après consolidation

1. Appliquer Constitution V1 et FD02 : science/calibration/revue indépendante prioritaires ; correspondance historique O/F/L conservée avec ses inconnues, sans demander une nouvelle approbation des huit orientations.
2. Sécurité de publication : approuver une transition compatible des protections de `main` et du bot ; données actuelles toujours soumises à intégrité/fraîcheur. Voir [SECURITY_BASELINE.md](SECURITY_BASELINE.md).
3. Qualifier légalement un jeu de comptages et préenregistrer un pilote borné ; obtenir revue indépendante et mesures avant calibration/claims. Voir [SCIENTIFIC_PILOT_PLAN.md](SCIENTIFIC_PILOT_PLAN.md).
4. Business multiutilisateur seulement après identité, responsabilité, séparation territoriale, audit ancré et autorisations authentifiées. World B2C reste optionnel/distant.

Les FD01–FD08 approuvent Constitution V1, code provisoirement propriétaire et préparation scientifique ; aucune Phase 12 ni action terrain. Réglages GitHub, droits/époque du pilote, seuils/relecteurs et politiques professionnelles : dépendances opérationnelles OP01–OP06, pas orientations stratégiques à ratifier de nouveau.


## Workstream 12 — participation et mémoire générationnelle (mandat distinct)

Source : message fondateur « CORE AVATAR, DIGITAL CITIZENSHIP & GENERATIONAL CIVILIZATION MEMORY », 2026-10-14 Pacific. Ce numéro de workstream ne renomme ni ne clôt une phase O/F/L ; la livraison scientifique différée reste prioritaire. CORE = noyau évolutif de savoir humain/scientifique, propositions et améliorations vérifiées ; pas système de crédit social ou jeu détaché des preuves.

| Périmètre | Maintenant / preuve | Plus tard / gate |
| --- | --- | --- |
| CORE Public, avatar optionnel et témoignage situé | Schémas profil/consentement/provenance ; démonstration synthétique ; `docs/product/CORE_AVATAR_VISION.md` | Comptes, identité réelle, modération/accessibilité et anti-manipulation avant inscriptions/soumissions publiques |
| Contribution → revue → calcul → publication | Ledger local déterministe, versions/objections, état de publication distinct d’autorisation ; `CONTRIBUTION_IMPACT_LEDGER.md` | Intérêt partenaire, pilote, mise en œuvre et impact : preuve/mandat authentifié, gates toujours désactivés aujourd’hui |
| Codex générationnel | Mémoire SQLite séparée et export propriétaire, historique/supersession, retrait/effacement logique ; `CORE_PUBLIC_PARTICIPATION.md` | Plan soutenable de rétention, sauvegarde/restauration, succession et droits ; pas de permanence/immutabilité revendiquée |
| Lien Business | Aucun accès ni donnée B2B depuis contributions publiques | Gouvernance explicite crédit/licences/consentement/rémunération, séparation professionnelle et sécurité |

Ordre inchangé : FD03 et qualification du pilote SF, puis validation/calibration indépendante ; ouverture publique et avatars avancés seulement après justification et gates de sécurité. Les cosmétiques, multi-joueur immersif, récompenses monétaires et classements sociaux ne sont pas implémentés. Résultats locaux : `docs/WORKSTREAM_12_REPORT.md`, pas preuve d’une communauté, adoption municipale ou impact réel.


## Consolidation finale — mandat fondateur 2026-10-15 UTC

Matrice courante des workstreams 1–12 : [WORKSTREAM_CLOSURE_MATRIX.md](WORKSTREAM_CLOSURE_MATRIX.md) ; preuves de récupération/publication : [RECOVERY_SCIENTIFIC_READINESS_REPORT.md](RECOVERY_SCIENTIFIC_READINESS_REPORT.md). Ces workstreams transversaux ne renomment pas O/F/L ni une Phase 12. Le corpus Kardashev et le cadre multidimensionnel [CIVILIZATION_RESEARCH.md](CIVILIZATION_RESEARCH.md) alimentent Civilization sans substituer énergie à paix, liberté, santé ou écologie. CORE Public porte la participation future ; Business reste professionnel/authentifié ; World immersif reste optionnel et distant.

Priorité : fiabilité du cron et transition FD03 sûre, puis G0/G1/G3 du pilote Howard 6th–7th conditionnel. Comptages/feux réels, SUMO/calibration, indépendance et effets mesurés demeurent différés ; les fondations locales testées ne les clôturent pas. Aucun compte public, modèle payant, installation de simulateur ou contrôle terrain autorisé.


## L13 — Scientific engine, agent tooling & end-to-end proof

Mandat fondateur explicite du 2026-10-15 UTC, après récupération/WS12. Ce numéro autorisé ne complète ni ne renomme les critères scientifiques O/F différés, ni une Phase 12 historique inexistante dans le registre. Implémentation : `src/research.js`, CLI/mémoire `scripts/research.mjs`, laboratoire `research.html`, lien WS12 exact-version et conseil scientifique partagé. Baseline + deux variantes, sources locales épinglées, dissidence, sensibilités et recalcul ; deux adapters bornés (trafic synthétique, énergie historique). Résultats de validation/publication : [PHASE_13_REPORT.md](PHASE_13_REPORT.md).

Mémoire locale, reprise, consentement et gate fermé n’établissent ni identité authentifiée, indépendance expérimentale, calibration ou impact. Le cadre Kardashev reste une dimension physique parmi les droits/bien-être/paix/écologie. Priorité suivante proposée, non commencée : Phase 14, qualification/ingestion de mesures autorisées, baseline/holdout et revue indépendante avant simulateur calibré. FD03/OP01 demeure ouvert. Aucune Constitution réécrite, ouverture Public/Business ou World immersif engagée.


Preuves L13 : code 409eff2, PR #2/fusion b667c6e ; 170/170, CI/Pages et sept contrôles Chromium production réussis. Le logiciel borné est livré, les critères de calibration/holdout/indépendance d’O5/F3/10+ restent différés. Rapport Phase 13 pour limites, outillage, sources et liens vérifiables.
