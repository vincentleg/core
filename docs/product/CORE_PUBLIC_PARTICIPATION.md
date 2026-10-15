# CORE Public — participation, vie privée et codex

Vision actuelle : [CORE_AVATAR_VISION.md](CORE_AVATAR_VISION.md). Baseline : Constitution V1, FD01–FD08 et AUTHORITY_POLICY. Ce document n’active aucune communauté, collecte de témoignages réels, inscription ou soumission publique.

## Expérience locale comme contexte

Une personne peut à terme décrire volontairement un lieu qu’elle connaît. Distinguer sa déclaration, date/contexte, observation, interprétation, hypothèses et preuves corroborantes. Un témoignage est une source contextuelle précieuse, pas automatiquement un fait vérifié indépendamment. Plusieurs copies/comptes ne constituent pas plusieurs sources indépendantes. Les contradictions, abstentions, corrections et résultats négatifs restent liés au dossier.

Métadonnées : zone approximative par défaut, précision facultative dans l’espace privé, date avec fuseau, incertitude, provenance/licence et portée de consentement. Une permission de publication ne vaut ni accord commercial, ni qualification professionnelle, ni autorisation de pilote. Protéger aussi tiers, mineurs, personnes vulnérables, sites sensibles et infrastructures restreintes ; déclaration de protection par l’auteur ≠ modération effective.

## Contrôles implémentés dans le sandbox synthétique

- Aucun serveur public, stockage utilisateur dans Git ou nouvelle route du centre de contrôle. Le module accepte uniquement `synthetic-demo` et des preuves de fixtures hachées ; le texte n’est jamais exécuté comme instruction.
- Contenu privé séparé de la projection publique : contexte, point précis, notes privées de revue, anciennes versions privées et empreintes de contenu privé ne sortent pas. Les objections publiques viennent de codes/explications contrôlés ; la note libre reste propriétaire.
- Publication : consentement explicite + revue de la projection exacte/version par un rôle distinct. Identité, avatar, intérêts/expertise et quartier ont leurs propres opt-ins ; valeur privée absente du fingerprint public. Les références à des contributions privées sont omises.
- Correction : nouvelle version, simulation/approbation invalidées, projection retirée jusqu’à nouvelle revue. Retrait immédiat de la projection ; export propriétaire via `ledger.inspect(capability, id)`. Effacement logique local par `ledger.erase`, avec tombstone sans contenu personnel.
- Base SQLite séparée `.core-local/contributions-*.sqlite`, ignorée par Git, fichiers restreints à 0600 ; refus des liens et chemins publics. Le mode par défaut est en mémoire. Les capacités sont des objets du sandbox en processus, **pas une authentification de personnes**. Aucun profil/contenu ne provisionne un rôle.

Limites : une personne contrôlant le processus/fichier peut réécrire son stockage ; le registre n’est ni une sandbox OS, ni une signature externe. Un texte volontairement placé dans un champ public peut divulguer une information : avant un service réel, modération, rendu textuel sûr et contrôles de divulgation sont indispensables. Ne pas présenter le typage actuel comme une anonymisation ou une prévention universelle des fuites. Aucun transfert depuis une base Business.

## Mémoire générationnelle — plan à définir avant un service réel

Le modèle conserve versions, provenance, réutilisations/supersessions, objections, corrections et échecs ; les dossiers locaux survivent à une réouverture SQLite. L’auteur peut exporter son historique privé ; le lecteur voit la version publiée et une chronologie publique expurgée. L’archivage public des anciennes versions et son consentement ne sont pas activés par défaut.

Ne pas promettre stockage immuable ou perpétuel. Le prototype est mono-processus, borné à 100 dossiers, 32 versions et 256 événements par dossier ; il n’existe pas de service de sauvegarde/continuité générationnelle. Avant activation : responsables de conservation/succession, durées/résidence, formats/versionnement/migration, sauvegardes chiffrées et restaurations testées, correction et accès après décès, licences et moyens humains/financiers soutenables — sans achat implicite.

L’effacement actuel retire le contenu des lectures applicatives locales, **pas une garantie d’effacement physique SQLite/WAL, des sauvegardes ou copies déjà exportées**. Un service futur doit définir rétention légale, retrait des index/caches, propagation aux sous-traitants et exceptions d’audit avec minimisation et transparence. Pas de données privées dans l’historique Git public.

## Gates avant ouverture

Authentification et séparation des permissions, modèle de menace, modération/recours humains, protection des tiers, quotas, origine/familles des preuves, déduplication, anti-bot/Sybil et détection de campagnes coordonnées respectueuses de la vie privée ; tests adversariaux et d’accessibilité. Aucun score de valeur sociale ni collecte d’identité intrusive par défaut. Consensus/votes/audience ne remplacent pas la validation scientifique. Politique commerciale, crédit/licences/rémunération et garanties Business à approuver séparément.
