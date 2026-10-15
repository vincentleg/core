# Contribution & impact ledger — contrat et démonstration

Workstream 12 : domaine local synthétique, pas nouveau registre civil ni réseau social. Implémentation : `scripts/lib/contributions.mjs`, mémoire `src/civ-memory.js` isolée, sérialisation stable existante et gate `scripts/lib/authority.mjs`. Aucun changement au moteur de trafic, au registre d’agents ou à la passerelle scientifique existante.

## États et autorité

| État | Signification / gate actuel |
| --- | --- |
| DRAFT | Brouillon privé créé par capacité participant du sandbox |
| SUBMITTED | Soumission locale par l’auteur ; ne publie rien |
| SCREENED | Contrôle d’un rôle modérateur distinct ; aucune preuve terrain acquise |
| UNDER_REVIEW | Examen par rôle reviewer distinct ; pas une revue indépendante réelle |
| EVIDENCE_ASSESSED | Références/hash/provenance résolus, limites et objection explicites ; témoignage toujours contextuel |
| SIMULATED | Calcul borné reproductible sur comptages synthétiques admissibles ; étape facultative |
| REVISED | Nouvelle version après critique ; approbation/simulation précédentes invalidées, nouveau cycle de revue |
| APPROVED_FOR_PUBLICATION | Consentement + empreinte de la projection/version exacte, rôle publisher distinct |
| PUBLISHED | Affichage de cette seule projection synthétique ; aucune autorisation physique/commerciale |
| CONSIDERED_BY_PARTNER | Futur : preuve d’examen par organisation autorisée ; **désactivé** |
| AUTHORIZED_FOR_PILOT | Futur : mandat humain authentifié, périmètre/contraintes/protocole ; **désactivé** |
| PILOT_RUNNING | Futur : autorisation valide et preuves d’exécution/suivi ; **désactivé** |
| IMPLEMENTED | Futur : preuve de déploiement réel, distincte d’intérêt/autorisation/simulation ; **désactivé** |
| IMPACT_MEASURED | Futur : baseline, mesures, incertitudes, causalité qualifiée et revue indépendante ; **désactivé** |
| REJECTED_OR_WITHDRAWN | Rejet motivé par modération/reviewer ou retrait par auteur ; projection absente, historique propriétaire conservé avant effacement |

Toutes les transitions ne sont pas obligatoires : `EVIDENCE_ASSESSED → APPROVED_FOR_PUBLICATION` peut éviter une simulation non pertinente. Pas de saut de revue ni retour arbitraire ; correction via REVISED, rejet/retrait terminal dans ce prototype. Le statut de publication du ledger n’est pas le statut HUMAN_REVIEW/APPROVED d’une mission et ne le modifie pas. Le vocabulaire des états futurs reste disponible dans le schéma, leur entrée est toujours refusée.

## Traçabilité et preuves

Par dossier : auteur de rôle/pseudonyme choisi, versions, observation/interprétation/proposition séparées, consentements, quartier et contexte privé séparé, références de preuves, liens problèmes/réutilisation/supersession, décisions/analyses de rôles, objections, calculs et historique hash-chaîné. Chaque revue lie la version et les métadonnées complètes de ses sources ; remplacement d’une source sous le même ID bloque la relecture. Les liens vers des dossiers non publics restent cachés. Si une dépendance publiée disparaît, la projection dépendante peut être bloquée jusqu’à nouvelle revue.

Types déclarés dans `schemas/impact-evidence-v1.schema.json` : témoignage/comptages synthétiques, observation, simulation, intérêt partenaire, autorisation de pilote, déploiement et impact indépendant. Seules les deux sources synthétiques sont admissibles dans le runtime actuel ; les autres types ne prouvent rien par leur simple étiquette. `DEMO_ONLY_NO_COMMERCIAL_GRANT` est une restriction de démonstration, pas une politique de licence des futurs utilisateurs.

Ne jamais confondre idée proposée, idée revue, simulation favorable, intérêt d’organisation, mise en œuvre et bénéfice mesuré. Le calcul compare deux capacités abstraites sur la fixture existante `pilot-synthetic.json`, avec trois sensibilités de demande ; unité = somme de files synthétiques, **pas délai, efficacité des feux ou sécurité mesurés**. Calcul déterministe local, zéro inférence modèle, aucune adoption municipale.

Les empreintes privées ne sont pas publiques ; une empreinte publique indépendante couvre seulement la projection expurgée. SHA-256 rend les altérations accidentelles détectables, pas le stockage immuable ni la signature d’un humain. Les rôles du sandbox ne sont pas des comptes et n’authentifient pas une organisation. Concurrence multiutilisateur, import/export de production, rétention et continuité restent à concevoir/tester.

## Reproduction et inspection

```sh
node scripts/contribution-demo.mjs
node --test test/contributions.test.js
# Option locale explicite ; refuse d’écraser une base existante :
node scripts/contribution-demo.mjs --persist
```

Le résultat public déterministe est régénérable dans `examples/contributions/synthetic-public.json` par redirection de la première commande ; ne pas l’éditer à la main. Aucun contexte privé n’est imprimé. Le scénario fictif parcourt 14 événements sur deux versions : observation inventée à SF, soumission, revue, calcul, correction/consentement explicite, nouvelle revue et publication synthétique. L’auteur peut inspecter toutes ses versions via l’API locale ; le JSON public donne la chronologie expurgée et les objections structurées. Ni compte public, partenaire, impact réel ou monde multijoueur opérationnel.

Schémas : participant, contribution, contribution-history, impact-evidence sous `schemas/`. Validateur sans dépendance limité aux mots-clés utilisés ; pas un validateur JSON Schema général. Tests : confidentialité/consentement, progression opt-in, capacités forgées, privilèges, transitions externes, intégrité/provenance, retrait/effacement logique, persistance et chemins de stockage.
