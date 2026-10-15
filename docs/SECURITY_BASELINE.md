# CORE — sécurité de consolidation

Périmètre : prototype statique public, exécution propriétaire locale, sources publiques ; pas de certificat de sécurité ni de test d’intrusion complet. Base `1f0adb4`, état de réglages relu pendant la consolidation. Aucun réglage GitHub, abonnement, visibilité ou protection machine n’a été modifié.

## Menaces et contrôles vérifiables

| Surface | Contrôle implémenté / preuve | Limite ou gate restant |
| --- | --- | --- |
| Sources SF/NY sur disque | `scripts/lib/snapshot.mjs` partagé par core-env/civ-runtime : SHA-256 des octets, dates, noms uniques, racine réelle/symlinks, JSON et taille ; tests consolidation | Source et manifeste peuvent être falsifiés ensemble par un détenteur du dépôt ; pas signature du fournisseur |
| Fraîcheur | Mode `replay` explicite préservant archives ; `--current-data` pour civ/science bloque sources périmées/non classées selon budgets existants `cities.js` | Date de collecte ≠ date d’observation ni vérité actuelle. Les autres modèles ne deviennent pas calibrés. Défaut = exécution sur snapshot historique, annoncé en CLI |
| Contenu public / secrets | Scan du contenu et de chaque commit non publié avant push ; valeurs détectées masquées ; CI frais ; `.core-local/` ignoré | Motifs/allowlist ne couvrent pas toutes les fuites ni les anciens commits déjà publiés. Contact fondateur historique : exception documentée, pas secret |
| Publication | Nouveau `core-verify` sur push/PR, lecture seule, actions déjà utilisées épinglées, checkout sans credentials persistés ; tests de garde | `main` actuellement non protégé : checks non obligatoires côté serveur jusqu’à décision FD03 |
| CSP | Globe conservé ; corridor : hashes exacts des deux scripts, pas eval/inline script libre, réseau interdit, fontes locales ; build et vérification reproductibles | Meta CSP ne fournit pas `frame-ancestors`/reporting. Hébergement à en-têtes adaptés à qualifier avant interfaces sensibles |
| Permissions / injection | Registre/outils, validation déterministe, budgets, STOP, assertions/citations, tests négatifs existants conservés | Même processus Node/JS ≠ isolation OS ; aucune prétention de protection universelle contre injection |
| Autorisation / journaux | Serveur local loopback, token, Host/Origin, chemins/action allowlists, corps bornés ; chaînes SHA-256 | `human:` n’authentifie pas un ingénieur ; journal non ancré indépendamment ; aucun rôle Business réel |
| Dépendances / IP | Aucun nouveau paquet ; MapLibre/fontes auto-hébergés avec licences/SRI ; sources existantes seulement | Pas de scan CVE exhaustif, licence CORE/marque non tranchées, conditions commerciales à revoir |

Les anciens examens `PHASE_7_SECURITY_REVIEW.md` / `PHASE_8_SECURITY_REVIEW.md` sont des preuves historiques ; les affirmations absolues « aucun secret » ou « impossible de réécrire » ne valent pas certification actuelle.

## GitHub Free et configuration recommandée — NON APPLIQUÉE

Lecture API : propriétaire de type `User`, dépôt `public`, branche `main` avec `protected: false`. Plan de facturation personnel non inspecté. [GitHub confirme les protected branches pour les dépôts publics avec GitHub Free](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches). [Les runners standards des dépôts publics sont gratuits](https://docs.github.com/en/billing/concepts/product-billing/github-actions). Cette CI utilise `ubuntu-24.04` standard, aucun runner large, stockage d’artefacts facturable, marketplace payante ou cache distant ajouté. Aucun changement de plan requis pour les contrôles proposés.

Configuration proposée au fondateur après préparation du workflow de publication : protéger `main`, interdire force-push/suppression, exiger le check **core-verify** émis par GitHub Actions, et PR vérifiée à jour avant intégration ; décider explicitement du traitement des administrateurs et des approbations. Les restrictions de pousse par équipes dépendent des capacités organisationnelles ; ne pas les supposer disponibles sur ce dépôt personnel. Ne pas exiger un approbateur indépendant inexistant : le propriétaire unique ne peut pas approuver sa propre PR.

**Dépendance bloquante de transition :** le bot `city-feed` pousse aujourd’hui directement sur `main`. Des checks/PR obligatoires peuvent casser ces publications, car la nouvelle révision de données doit exister sur une branche avant son contrôle. Avant activation, faire approuver et préparer une branche de données + PR et les permissions nécessaires, ou un autre parcours vérifiable sans bypass. Ne pas donner automatiquement une exemption au bot ni ouvrir `contents: write` à la nouvelle CI. Cette mission laisse `city-feed` inchangé.

Pas de protection appliquée par l’agent. Le workflow présent est utile mais ne rend pas les statuts obligatoires à lui seul. Risque restant HIGH jusqu’à FD03 et sa transition testée.

## Hooks et validation proportionnée

- Pre-commit conserve l’intégrité des ajouts. Pre-push scanne séparément les nouveaux commits non déjà présents dans les refs distantes locales : une valeur ajoutée puis supprimée dans la série reste contrôlée. Les refs distantes locales ne sont pas une autorité adversariale ; CI contrôle aussi la plage push/PR.
- Markdown seul : sécurité/CSP en CI, pas de suite applicative répétée. Les hooks/configs, tests, données, assets, build et code déclenchent une validation complète s’ils n’ont pas déjà une preuve locale exacte.
- Preuve dans `.core-local/verification/` : empreinte du contenu versionné hors Markdown, modes de fichiers, version Node et plateforme, durée maximale 24 h ; pas de réutilisation si runtime non indexé/modifié. Les tags réutilisent une preuve correspondante ; un tag non vérifié ne contourne pas la validation.
- Cache local = optimisation, **pas attestation de confiance** : un propriétaire du système peut le falsifier. CI n’importe pas ce cache ; code/données sont retestés dans un checkout propre. La protection serveur proposée doit rendre le check obligatoire.
- `node scripts/verify.mjs` : une intégration complète explicite (CSP, intégrité sans écriture, whitespace, tests) et preuve réutilisable. La CI utilise `--ci`, contrôle l’historique ajouté et évite la suite pour Markdown seul. Les sorties de tests ne sont plus supprimées.
- Le scanner compare désormais le corridor en mémoire ; un audit ne régénère plus silencieusement un fichier. Les anciennes déclarations d’une seule suite par release ne comptaient pas les anciens hooks `pre-push`.

## Gates avant ouverture externe / Business

Avant comptes publics, commentaires, soumissions ou agents tiers : modèle de menace, principal authentifié, quotas serveur, origine/familles des sources, déduplication inter-comptes, détection de coordination, quarantaine/recours, protection du holdout, journal d’accès et séparation territoriale. Définir les tests adversariaux et la minimisation des données avant une solution anti-Sybil. Aucun système d’identité inutile construit sur le site statique.

Avant intervention réelle : identité/mandat du signataire, contraintes et preuves actuelles, signature attestable, TTL/suspension/révocation, responsabilité et arrêt d’urgence ; indépendant du simple état HUMAN_REVIEW. Ces capacités restent absentes et aucune action réelle n’est autorisée.
