# FD05 — code propriétaire provisoire, tiers et hébergement

Instruction fondatrice du 2026-10-14 : le code original CORE reste **provisoirement propriétaire**, sans ajout de licence open source du projet. Cette posture ne révoque pas les droits accordés par les licences tierces ni les conditions GitHub ; dépôt public et Pages ne fournissent aucune confidentialité. Aucun avis sur titularité, brevetabilité, marque ou enforceability générale ; revue qualifiée ultérieure. Aucun fichier LICENSE de projet ajouté.

| Périmètre vérifié | Droits / preuves | Obligation ou limite |
| --- | --- | --- |
| MapLibre 5.7.3 embarqué | `assets/vendor/maplibre-gl-5.7.3/LICENSE.txt`, BSD-3-Clause | Conserver copyright, conditions et disclaimer ; pas de réattribution propriétaire de ce composant |
| Oxanium, IBM Plex Sans/Mono | Trois `assets/fonts/OFL-*.txt`, SIL OFL 1.1 | Notices conservées ; règles noms réservés et redistribution à respecter ; aucune modification de fonte |
| OSM / OpenMapTiles et bases dérivées | Attribution à l’écran et manifests/README OSM ; [règles officielles](https://www.openstreetmap.org/copyright) | ODbL/attribution et obligations de bases dérivées ne disparaissent pas avec FD05 ; licence des données distincte du code CORE |
| DataSF SF / NYC | `docs/DATA_SOURCES.md` et manifests datés, licences/conditions/transformations | Agrégats et contexte existants seulement ; ne pas transformer permission d’accès en validation scientifique ou licence universelle |
| NASA Blue Marble / OpenFreeMap | Attribution existante et DATA_SOURCES | Pas d’approbation/endorsement supposé ni SLA ; données et service ont des conditions distinctes |
| Terrain AWS/Mapzen composite | Sources/credits existants | Obligations régionales et usage commercial non certifiés globalement ; pas de nouvelle source ni prétention de clearance |
| Esri / Nominatim | Désactivés | Pas de réactivation sans droits/politiques appropriés ; pas de compte/clé ajouté |
| Comptages SFMTA candidats | `pilot/source-manifest.json` : accès vérifié, droits de réutilisation UNVERIFIED | Aucun payload mesuré publié ou calibrage ; présence d’un prestataire ne prouve pas une cession des droits |

Revue ciblée : notices embarquées présentes, attribution et sources existantes conservées ; aucun paquet, asset, dataset mesuré ou licence tierce modifié. Les scans d’intégrité/SRI ne certifient pas tout l’IP, la chaîne de dépendances ou l’absence de CVE. Les fixtures nouvelles sont synthétiques et explicitement séparées des sources réelles.

Hébergement : conserver le prototype statique gratuit existant. Les [limites officielles GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) excluent son usage comme hébergement gratuit d’un service principalement transactionnel ou SaaS commercial, et les transactions sensibles. La future offre CORE Business doit donc faire l’objet d’une qualification séparée ; aucune vente, authentification sensible, migration d’hébergeur ou dépense engagée ici.

Questions OP05 pour revue qualifiée : titularité des contributions/accords antérieurs, marque CORE et disponibilité de domaines (aucune recherche d’antériorité exhaustive ni achat), données dérivées ODbL et attributions selon distribution, conditions commerciales des fournisseurs/terrain, hébergement/résidence/privacy professionnelle. La politique provisoire ne tranche pas ces questions.
