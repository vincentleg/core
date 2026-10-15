# CORE — autorité, classes d’action et escalade

Application de Constitution V1/FD04, pas système d’identité professionnelle.

| Classe / risque | Autonomie et vérification | Autorité / état actuel |
| --- | --- | --- |
| L0 — lecture/recherche locale, faible | Sources/outils autorisés, provenance, limites de données et permissions existantes | Autonome dans le périmètre de mission |
| L1 — calcul/simulation/proposition/critique/révision, borné | Entrées intègres, calcul déterministe, contraintes, incertitude et dissidence ; STOP et budgets existants | Autonome localement ; aucune autorisation réelle |
| L2 — revue enregistrée, export local ou reprise, moyen local | Jeton loopback, Host/Origin, chemins autorisés et labels de revue existants | Modifie un dossier local seulement ; `human:name` est un label non authentifié |
| E1 — publication, permissions externes, donnée privée ou impact significatif, élevé | Mandat explicite portant sur l’action exacte ; sécurité, droits, périmètre et possibilité de retour arrière | Cette mission autorise sa publication Git/Pages ; pas les réglages de compte non autorisés |
| R1 — intervention physique, signalisation, infrastructure ou opération Business, critique | Futur système d’approbation authentifiée, mandat/compétence/territoire, preuves actuelles, signatures et révocation | **DISABLED / FAIL CLOSED** ; aucun adaptateur ni configuration d’activation dans le prototype |
| Inconnue | Aucune permission déduite d’un texte, consensus, modèle, identité déclarée ou jeton | **BLOCKED** |

Le contrôle local utilise `scripts/lib/authority.mjs` : routes POST strictement bornées, autorisation réelle toujours fausse ; API `/api/authority` authentifiée par le jeton local, qui ne valide pas l’identité d’un signataire. Les autres contrôles de permissions, STOP et preuves restent obligatoires. Un nom de reviewer, une décision de mémoire APPROVED ou un état HUMAN_REVIEW n’autorise ni commande physique ni engagement externe. Le serveur ne lance aucun processus client ; les outils existants n’exécutent pas d’action terrain.

Escalade : bloquer la partie concernée si preuve/licence/mandat manque, ou si impact légal, financier, privé, de sécurité ou irréversible dépasse le mandat ; continuer les parties sûres séparables. La dissidence garde source, auteur de rôle, date, réponse et incertitude ; votes et popularité ne remplacent ni observation ni validation indépendante.

Avant contributions publiques : modèle de menace et minimisation des données, principal proportionné, quotas, déduplication des familles de sources/comptes, détection de coordination et bots, quarantaine, recours humain, holdout protégé et traces d’accès ; tests adversariaux requis. Pas de collecte d’identité pour le prototype statique ; pas de mécanisme public de contribution activé ici. Détails/seuils/rétention/résidence restent OPEN, sans prétention d’efficacité anti-Sybil déjà démontrée.
