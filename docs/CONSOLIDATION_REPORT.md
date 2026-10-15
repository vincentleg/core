# Consolidation — feuille de route, sécurité et science

## Périmètre et critères d’acceptation

Base : `1f0adb4` sur main ; phases 10 et 11 déjà livrées. Aucune Phase 12, nouvelle dépendance, installation, modification des réglages GitHub ou intervention réelle autorisée par ce travail.

- [x] Rapprocher les numérotations et engagements originaux sans inventer de ratification : MASTER_ROADMAP et FOUNDER_COMMITMENTS, avec chemins et commits sources.
- [x] Rédiger une constitution explicitement DRAFT et un registre des décisions fondatrices ouvertes.
- [x] Mutualiser la vérification des snapshots : hachages obligatoires, limites de chemins/taille/identités, dates et mode courant bloquant ; préserver la relecture historique.
- [x] Ajouter une CI gratuite à permissions limitées, actions épinglées ; optimiser le pre-push sans supprimer les scans des nouveaux commits.
- [x] Ajouter un CSP par hachages au corridor généré, sans changer le moteur ni son apparence ; rendre le scan d’intégrité non mutateur et masquer les valeurs détectées.
- [x] Inventorier les outils observés sans installation et définir un pilote gratuit avec ses prérequis légaux et scientifiques non satisfaits.
- [x] Vérifier intégration, navigateur affecté, CI et déploiement ; tag créé seulement après attribution démontrée de l’avertissement navigateur local.

## Limites et décisions

Voir SECURITY_BASELINE, TOOLING_INVENTORY, SCIENTIFIC_PILOT_PLAN et GOVERNANCE_DRAFT (FD01–FD08). Main non protégée à l’inspection ; aucune protection changée. Configuration recommandée soumise au fondateur, avec migration préalable du bot City Intelligence. Les scans ne constituent pas un pentest. Les droits et la couverture des comptages SFMTA candidats restent non vérifiés ; aucun calibrage, impact causal ou résultat terrain revendiqué. Pas d’authentification multiutilisateur, de système anti-Sybil ni d’inférence live ajoutés.

## Validation et publication

Validation locale : tests ciblés 8/8, puis une intégration complète 136/136. CSP à jour ; intégrité : 287 fichiers, zéro constat, six exceptions préexistantes documentées ; whitespace conforme. Aucun secret ni valeur personnelle détectée affiché. Aucun nouveau jeu de données ou paquet ; fichiers générés conformes aux sources. Ces contrôles ne constituent pas un audit exhaustif de secrets, de licences ou de vulnérabilités.

Chromium local : corridor 6/6 (CSP, moteur, commandes, scénario synthétique, mobile, console), science existante 10/10 (recalcul, preuve altérée bloquée, sources, mobile, absence de requête externe modèle/NYC). Le premier contrôle corridor utilisait une attente de 1,2 s pour une animation de 1,6 s ; correction du script de contrôle seulement, aucun correctif produit requis.

Traces locales : `/tmp/core-consolidation-integration.log`, `/tmp/core-consolidation-corridor-local.json`, `/tmp/core-consolidation-science-local.json`.

Publication vérifiée : `324da8f10647d1e0cb6b0294e647d619017654be`, branche de travail `consolidation/master-security-science`, intégrée par fast-forward sur main après relecture du distant ; aucun nouveau commit City Intelligence à réconcilier, aucun force-push. Tag annoté `consolidation-release-2026-10-14` pointe sur cette révision ; tags de phases inchangés. Les compléments de clôture sont documentaires seulement, après le tag.

- CI branche : [38665650954](https://github.com/vincentleg/core/actions/runs/38665650954), succès.
- CI main : [38665770235](https://github.com/vincentleg/core/actions/runs/38665770235), succès, 136/136 et zéro constat sur 287 fichiers.
- Pages : [38665769766](https://github.com/vincentleg/core/actions/runs/38665769766), succès, même SHA ; [production](https://vincentleg.github.io/core/).
- Réponses HTTP directes sans cache : `index.html` SHA-256 `7dbfc0d76a23498885b8591097a3edc43b8cbe78ec0ef01ebac867a84eb90e51` ; `corridor.html` `d03259d1c01417190da1a23a72f4540732b31eee511124ec5e0be3af7013096a` ; identiques au dépôt.
- Chrome production : science 10/10, 82 profils chargés, zéro erreur et zéro requête modèle/NYC dans ce contrôle. Corridor : cinq contrôles fonctionnels/CSP/mobile réussis ; assertion console initialement en échec, avec un avertissement CSP local. Aucun bilan global « zéro erreur console » inventé.
- Diagnostic ciblé, sans exécuter JavaScript ni changer de protection : certificat émis par **NordVPN Threat Protection**, script externe ajouté et `script-src`/`connect-src` modifiés ; source servie directement intacte, arbres HTML identiques après exclusion de ces seules injections et normalisation des attributs booléens. L’avertissement vient de l’ajout d’une source à `connect-src 'none'` par l’intercepteur. Le corridor local non réécrit passe 6/6, sans erreur. Gate de publication PASS avec cette limite de l’environnement clairement attribuée.

Traces supplémentaires locales : `/tmp/core-consolidation-production-hashes.json`, `/tmp/core-consolidation-corridor-production.json`, `/tmp/core-consolidation-science-production.json`, `/tmp/core-consolidation-raw-investigation/summary.json`. Aucun script injecté ni URL opaque publié dans Git. Les avertissements de maintenance du workflow Pages géré par GitHub (runtime des actions et image ubuntu-latest) n’empêchent pas le déploiement ; la nouvelle CI propre au dépôt utilise ubuntu-24.04 et actions épinglées.

 Firefox, Safari, accessibilité assistée et cron restent non vérifiés.

## Clôture et prochaine étape

Consolidation technique livrée ; gouvernance toujours DRAFT. Aucun réglage GitHub, outil ou dépendance installé, aucune donnée pilote ingérée. Ni calibration, validation indépendante, autorisation Business, anti-Sybil déployé ou résultat causal revendiqué. Les FD01–FD08 restent OPEN ; priorités : confirmer les engagements, autoriser la transition de protection de main, puis qualifier légalement le pilote et son validateur. Aucun développement Phase 12 autorisé par cette clôture.
