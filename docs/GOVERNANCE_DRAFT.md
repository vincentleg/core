# CORE — constitution et gouvernance proposées

**DRAFT — NON RATIFIÉ PAR LE FONDATEUR.** Ce texte organise les engagements récupérés et propose les exigences manquantes ; il n’invente ni approbation ancienne, ni capacité technique, ni autorité juridique. Les protections existantes restent applicables. Ratification éventuelle = décision explicite, version, portée et preuve conservées dans un ADR ; pas un simple commit de ce brouillon.

## Articles proposés

1. **Finalité et limites.** Civilization étudie des décisions vérifiables ; Business est un futur parcours professionnel ; World B2C reste optionnel. Aucun agent ne contrôle le monde réel.
2. **Intégrité scientifique.** Séparer observation, donnée administrative, hypothèse, simulation, estimation et effet causal validé. Préenregistrer objectifs, référence, métriques, exclusions et critères d’échec avant analyse du holdout. Publier résultats nuls/négatifs et limites ; la calibration ne prouve pas un bénéfice causal.
3. **Provenance et fraîcheur.** Source autorisée, licence, version, transformations, date d’observation/collecte et intégrité requises. Une empreinte n’authentifie pas un éditeur. Un ancien snapshot reste reproductible en rejeu ; il ne fonde pas automatiquement une décision actuelle.
4. **Agents bornés.** Identités stables, outils et territoire autorisés, budgets/STOP, pas d’auto-élévation, pas d’accès arbitraire au shell/aux secrets. Une permission en JavaScript n’est pas une sandbox de sécurité. Les textes externes sont non fiables ; valider citations, unités, portée et assertions.
5. **Contestation indépendante.** Conserver désaccord, abstention et hypothèses rivales. Un rôle « reviewer » utilisant le même code n’est pas une réplication indépendante. Exiger pour le futur pilote une autre méthode/implémentation et un relecteur compétent, sans présenter sa désignation comme déjà acquise.
6. **Vérification et inconnus.** Passerelles en code déterministe, tests négatifs, recalcul reproductible, échec fermé sur preuves/contraintes insuffisantes. Distinguer « dossier cohérent pour revue » de « intervention admissible » ; jamais d’autorisation réelle par modèle.
7. **Autorité humaine réelle.** Avant intervention : identité authentifiée, compétence/mandat et territoire vérifiés, action exacte, preuves et incertitudes, alternatives, durée de validité, déclencheurs de suspension, réversibilité, responsable et signature attestable. Revalidation à changement de preuve ; révocation sélective des seules actions dépendantes. `human:<nom>` ne satisfait pas ces exigences. Aucune interface réelle n’est autorisée par ce brouillon.
8. **Auditabilité.** Historique des données, modèles, décisions, dissidences et promotions ; trace d’accès pour données sensibles. Chaînes locales actuellement utiles mais réécrivables par leur détenteur ; ancrage séparé/contrôle d’accès requis avant responsabilité multiutilisateur.
9. **Anti-manipulation.** Avant contributions publiques/agents tiers : identité de contributeur proportionnée, origine et familles de sources, déduplication, quotas par principal/projet, détection de campagnes coordonnées, mise en quarantaine, recours et revue humaine. Plusieurs comptes/citations d’une même source ne deviennent pas des preuves indépendantes. Pas de notation sociale ni collecte d’identité inutile pour le prototype statique.
10. **Vie privée et souveraineté.** Minimisation, agrégation, finalité, rétention et suppression définies. Pas de réseaux critiques exacts ou données personnelles dans le dépôt public. Avant Business : séparation territoriale/locataires et hébergement validé, journal des accès, revue légale adaptée. Aucune conformité générale revendiquée.
11. **Sécurité, IP et coût.** Revue des sources/outils, versions/licences et exposition ; secrets hors Git, correctifs contrôlés, publication traçable. Zéro dépense additionnelle, aucun abonnement/API payante/topup sans accord explicite. Pas d’installation/routage externe implicite. La licence du code CORE appartient au choix du fondateur, pas à l’agent.
12. **Honnêteté et changement.** Rejeu, exécution locale et inférence réelle sont distingués. Démonstration ≠ validation terrain. Toute dérogation ou changement de produit/phase garde une décision sourcée ; aucun résumé récent n’efface un engagement antérieur.

## Décisions réservées au fondateur — toutes OPEN

| ID | Choix à confirmer | Dépendance / recommandation non appliquée |
| --- | --- | --- |
| FD01 | Ratification/version du présent brouillon | Vérifier engagements manquants et responsabilité ; pas de ratification implicite |
| FD02 | Correspondance O/F/L et priorités Civilization/Business/World | Confirmer master et critères différés, pas déclarer O2–O6 accomplis |
| FD03 | Protection de main et transition du bot | Voir SECURITY_BASELINE : aucune modification des réglages ; adapter PR/bot avant contrôles bloquants |
| FD04 | Validateurs humains et autorisations Business | Identités/mandats, signatures, TTL/révocation et audit ancré avant action réelle |
| FD05 | Licence du projet, marque, hébergement commercial | Ne pas déduire une licence de la visibilité publique ; pas de conseil juridique automatique |
| FD06 | Corridor, droits/observations et protocole pilote | Howard 6e–7e : candidat documentaire ; comptages/feux/époque compatibles à qualifier |
| FD07 | Relecteur indépendant, seuils et holdout | Aucun relecteur nommé ni seuil ratifié par l’agent |
| FD08 | Routing/MCP/mémoire et données exportables | Choisir confiance, résidence, droits, budget et benchmark avant toute adoption |

Les FD ouverts bloquent les capacités futures concernées, pas les réparations sûres ni la publication du prototype déjà autorisées. Phase 12 reste non autorisée.
