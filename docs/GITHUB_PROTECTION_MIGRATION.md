# FD03 — protection de main : préparation, pas activation

Inspection 2026-10-14 Pacific : dépôt public, propriétaire User, compte connecté `vincentleg` avec admin ; `main.protected=false`, liste rulesets vide. API Actions : `default_workflow_permissions=read`, `can_approve_pull_request_reviews=false`, `allow_auto_merge=false`. Le champ de plan du compte est absent/null : **plan exact UNVERIFIED**, aucun accès facturation demandé. Les [protected branches sont disponibles pour un dépôt public sur GitHub Free](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches) ; aucun upgrade nécessaire pour cette capacité. Pas de réglage changé.

## Flux actuel et frontière

`city-feed.yml` garde ses schedules `17 */3 * * *` et `41 * * * *`, gate de collecte 150 min, job contents:write, collecte déterministe, éventuel enregistrement de mission, tests, scan puis push direct de JSON sous `data/feeds`, `data/missions`, `data/agents`. Rien ne contrôle le trafic réel. Le check général s’appelle **core-verify** (workflow/job) avec contents:read. Aucun changement de ces schedules, sorties ou autorisations dans cette mission.

`feed-rehearsal.yml` est manuel, contents:read, checkout sans credentials persistés : mêmes collecteurs, validation des seuls JSON attendus, intégration/sécurité, résumé borné ; **aucun push, PR, merge, artefact ou secret ajouté**. Le script `feed-candidate.mjs` décrit la révision exacte et refuse toute autre modification, suppression ou lien symbolique. Les tests utilisent un dépôt temporaire et des fixtures ; une collecte réseau de rehearsal est un contrôle opérationnel séparé, pas un test unitaire.

## Migration proposée après autorisation OP01

1. Exécuter le rehearsal manuel et vérifier les sorties/limites ; vérifier le workflow courant en parallèle. Pas de bascule si collecte échouée ou modification hors périmètre.
2. Approuver explicitement la permission Actions de **création de PR** au niveau dépôt. Ne pas augmenter les permissions globales ; futur job de publication seulement contents:write + pull-requests:write. Aucun droit administration, actions:write, secret PAT ou App ajouté implicitement. Le réglage GitHub regroupe création et approbation : le futur workflow n’émettra jamais d’approbation de revue.
3. Adapter la publication : branche **unique par run/attempt**, créée depuis main relu ; commit des seuls fichiers validés, push normal de cette branche, PR ciblant main. Pas de branche fixe nécessitant force-push ; pas de push direct à main, suppression automatique ou auto-merge de données externes. Une PR existante devenue obsolète reste visible ; rebase/fusion normale ou nouveau candidat après nouvelle collecte/validation.
4. Vérifier une PR réelle de répétition avant activation des protections. Les [événements émis par GITHUB_TOKEN](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) ne déclenchent pas tous les workflows : actuellement PR ouverte/synchronisée par ce token produit une CI nécessitant approbation humaine. Le mainteneur approuve le lancement, contrôle **core-verify** sur la révision exacte, examine les diffs et merge normalement. Aucun token plus puissant ou workflow `pull_request_target` pour contourner cette garde.
5. Bascule coordonnée, puis protéger main : PR + check **core-verify** à jour provenant de GitHub Actions, résolution des discussions, interdiction force-push/suppression, aucun bypass accordé au bot. Décider du traitement administrateur sans exemption implicite ; ne pas exiger l’approbation d’un second humain inexistant. Tester qu’un candidat non conforme ne merge pas et qu’un candidat revu publie bien Pages.
6. Revalider le prochain cycle planifié. La **collecte** reste automatique, la publication devient revue humaine ; cette latence est une décision explicite avant bascule. Sans ce choix, protéger main casserait le push actuel : **activation bloquée et flux actuel conservé**.

Le fichier `docs/github/city-feed-pr.yml.example` illustre les seules étapes de publication après les gates existantes. Il est inactif et n’autorise aucune opération distante. Une répétition locale n’établit ni le fonctionnement des permissions GitHub ni le cron réel. Les [réglages Actions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) restent à approuver ; pas de modification externe par cette livraison.

## Réinspection de récupération — 2026-10-15 UTC

API relue : main non protégée, rulesets `[]`, compte administrateur, dépôt public ; plan personnel toujours null/non vérifié. `can_approve_pull_request_reviews=false`, permissions globales read, `allow_auto_merge=false`. Check émis **core-verify**, App **github-actions**, app_id **15368**, vérifié sur `7477305`. Pages legacy/main/racine avec HTTPS. Aucune configuration distante modifiée.

Préparation exécutable **inactive** : `city-feed-pr.yml.example` est maintenant un workflow manuel complet (actions existantes épinglées, validation JSON + intégration avant push, branche unique, PR uniquement, aucune approbation/merge automatique). Le fichier reste hors `.github/workflows`. `main-protection.proposed.json` donne le payload proposé : CI exacte/à jour liée à l’émetteur, PR, administrateur soumis, conversations résolues, force-push et suppression interdits. Zéro reviewer obligatoire permet le mainteneur unique ; cela ne représente pas une revue indépendante. Tests de garde inclus ; parcours PR distant **NON VÉRIFIÉ**.

**Pourquoi pas d’activation :** OP01 précédent réserve l’autorisation précise du réglage regroupant création ET approbation des PR et l’acceptation de la latence de revue humaine. Le mandat courant conditionne l’activation à cette autorisation existante et à un chemin bot vérifié ; ni l’une ni l’autre n’est établie. Aucune permission compte/App/PAT ou exemption ajoutée. Le cron direct existant reste actif pendant sa réparation ; protéger main à cet instant le casserait.

Action externe précise à autoriser, sans achat :

1. Dépôt → Settings → Actions → General → Workflow permissions : conserver read par défaut ; autoriser explicitement « Allow GitHub Actions to create and approve pull requests ». Le workflow proposé ne demande aucune approbation de revue.
2. Après accord sur publication revue humainement, installer le template manuel, ajouter la variable de dépôt `CORE_FEED_PR_ENABLED=true`, lancer un candidat ; approuver au besoin le lancement CI issu de GITHUB_TOKEN, vérifier le SHA exact et le diff, intégrer normalement. Aucun auto-merge.
3. Après PR réelle réussie : remplacer seulement la publication du cron par ce parcours, conserver schedules/gates/collecteurs ; puis Settings → Branches → Add branch protection rule → main : PR, core-verify/GitHub Actions à jour, conversations résolues, contrôles appliqués aux administrateurs, aucun force-push/suppression. Payload proposé disponible ; vérifier ensuite API `protected=true` et un cycle réel. Ne pas appliquer ce payload prématurément.

Référence fraîche : [GitHub, disponibilité sur dépôt public Free](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches). Aucun upgrade requis pour cette capacité ; ne pas assimiler cela à un audit de facturation.


## Recommended configuration — 2026-10-15 (consolidation branch, not applied)

Live API: `main` has 0 effective rules and no rulesets; the repo is public, so both classic protection and rulesets are available without an upgrade. CI check `core-verify` is emitted by GitHub Actions (`integration_id` 15368), confirmed on `903ea98`.

- **Recommended: repository ruleset** `docs/github/main-ruleset.proposed.json`. It applies to administrators too, because the bypass list is empty, and it can be paused and audited in the Rules UI.
  - Blocks deletion and non-fast-forward pushes.
  - Requires a PR with resolved review threads and stale-review dismissal.
  - Requires an up-to-date `core-verify` from GitHub Actions.
  - The classic payload `main-protection.proposed.json` stays as an equivalent alternative. Do not enable both.
- **Reviews.** `required_approving_review_count: 0`, because GitHub forbids self-approval and there is a single maintainer. The PR plus CI plus thread resolution is the gate. Raise it to 1 once a second reviewer exists.
- **Order (unchanged, OP01).** Enabling this today breaks the `city-feed` direct push to `main`.
  1. Authorize the Actions PR permission.
  2. Install the PR template workflow.
  3. Run one successful candidate PR.
  4. Then apply the ruleset: `gh api -X POST repos/vincentleg/core/rulesets --input docs/github/main-ruleset.proposed.json`.
  5. Verify with `gh api repos/vincentleg/core/rules/branches/main`.
  No bypass is granted to the bot.
