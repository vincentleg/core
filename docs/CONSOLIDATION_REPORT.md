# Consolidation — feuille de route, sécurité et science

## Périmètre et critères d’acceptation

Base : `1f0adb4` sur main ; phases 10 et 11 déjà livrées. Aucune Phase 12, nouvelle dépendance, installation, modification des réglages GitHub ou intervention réelle autorisée par ce travail.

- [x] Rapprocher les numérotations et engagements originaux sans inventer de ratification : MASTER_ROADMAP et FOUNDER_COMMITMENTS, avec chemins et commits sources.
- [x] Rédiger une constitution explicitement DRAFT et un registre des décisions fondatrices ouvertes.
- [x] Mutualiser la vérification des snapshots : hachages obligatoires, limites de chemins/taille/identités, dates et mode courant bloquant ; préserver la relecture historique.
- [x] Ajouter une CI gratuite à permissions limitées, actions épinglées ; optimiser le pre-push sans supprimer les scans des nouveaux commits.
- [x] Ajouter un CSP par hachages au corridor généré, sans changer le moteur ni son apparence ; rendre le scan d’intégrité non mutateur et masquer les valeurs détectées.
- [x] Inventorier les outils observés sans installation et définir un pilote gratuit avec ses prérequis légaux et scientifiques non satisfaits.
- [ ] Vérifier l’intégration, le navigateur affecté, la CI et le déploiement avant publication finale et tag.

## Limites et décisions

Voir SECURITY_BASELINE, TOOLING_INVENTORY, SCIENTIFIC_PILOT_PLAN et GOVERNANCE_DRAFT (FD01–FD08). Main non protégée à l’inspection ; aucune protection changée. Configuration recommandée soumise au fondateur, avec migration préalable du bot City Intelligence. Les scans ne constituent pas un pentest. Les droits et la couverture des comptages SFMTA candidats restent non vérifiés ; aucun calibrage, impact causal ou résultat terrain revendiqué. Pas d’authentification multiutilisateur, de système anti-Sybil ni d’inférence live ajoutés.

## Validation et publication

Validation locale : tests ciblés 8/8, puis une intégration complète 136/136. CSP à jour ; intégrité : 287 fichiers, zéro constat, six exceptions préexistantes documentées ; whitespace conforme. Aucun secret ni valeur personnelle détectée affiché. Aucun nouveau jeu de données ou paquet ; fichiers générés conformes aux sources. Ces contrôles ne constituent pas un audit exhaustif de secrets, de licences ou de vulnérabilités.

Chromium local : corridor 6/6 (CSP, moteur, commandes, scénario synthétique, mobile, console), science existante 10/10 (recalcul, preuve altérée bloquée, sources, mobile, absence de requête externe modèle/NYC). Le premier contrôle corridor utilisait une attente de 1,2 s pour une animation de 1,6 s ; correction du script de contrôle seulement, aucun correctif produit requis.

Traces locales : `/tmp/core-consolidation-integration.log`, `/tmp/core-consolidation-corridor-local.json`, `/tmp/core-consolidation-science-local.json`. CI, production, commits et tag : à renseigner après publication. Firefox, Safari, accessibilité assistée et cron restent non vérifiés.
