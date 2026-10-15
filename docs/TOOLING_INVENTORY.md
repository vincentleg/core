# CORE — inventaire et décisions d’outillage

Inspection ciblée des exécutables, manifests et métadonnées de configuration pendant la consolidation ; aucun outil ajouté/démarré, aucun secret imprimé. « Présent » ne prouve ni disponibilité du service ni gain de performance. Les configurations privées ne sont pas copiées dans Git.

| Outil | État observé | Sécurité, compatibilité, coût / décision |
| --- | --- | --- |
| Codex CLI | Installé, manifest `@openai/codex` 0.162.1 ; configuration `gpt-6.1-sol`, effort medium | AGENTS appliqué ; un agent par défaut. Coût du compte existant non audité ; aucune nouvelle API/crédit activé |
| Claude CLI / CLAUDE.md | Exécutable et instructions présents | Préserver décisions antérieures ; instructions alignées sur contexte ciblé, pas lecture systématique des anciens rapports |
| Ollama / Qwen3 | Binaire utilisateur et manifeste qwen3:8b présents, pas dans PATH ; disponibilité/inférence non testées ici | Installation historiquement documentée D030 : Ollama MIT, modèle Apache-2.0. Local loopback ; ne pas relancer/télécharger pour cet audit |
| Claude-Mem | Aucun plugin/config identifié aux chemins contrôlés | Évoqué, adoption et installation non établies ; ne pas substituer une mémoire externe à Git/registre des engagements |
| Ruflo / claude-flow | Aucun exécutable/config identifié | Orchestration non adoptée ; code/hooks/permissions et licence/version à examiner avant proposition |
| Everything Claude Code | Aucun plugin installé identifié | Pas de compatibilité Codex supposée ; hooks tiers peuvent dupliquer les contrôles/coûts ; pas installé |
| OmniRoute | Aucun exécutable/config identifié | Routing non adopté ; ne pas ouvrir de proxy externe ou fallback payant |
| LiteLLM | Ni exécutable ni module Python identifié | Pas installé ; intérêt absent pour un unique modèle local ; revue dépendances/licence/télémétrie et interdiction de routes payantes préalables |
| MCP | Outils apps/TUI fournis par l’hôte ; pas de serveur personnel déclaré dans les configs inspectées | Exposition d’un outil ≠ serveur installé pour CORE. Aucun connecteur ajouté ; permissions/sources de données à valider séparément |
| Skills | Skills système génériques, `review-agent` ; skills Claude synchronisés dont import-memory/deep-research | Pas de skill scientifique/sécurité spécialisé ratifié retrouvé. `review-agent` ne remplace ni un audit indépendant ni la contrainte d’un agent de cette mission |
| Mémoire CORE | SQLite/checkpoints/exports versionnés, namespaces d’agents | Mémoire métier, pas mémoire universelle de Codex/Claude. Pas d’export automatique de secrets/conversations privées |
| Compression / mémoire d’agent | Contexte résumé par l’hôte ; pas de réglage personnel de compression mesuré retrouvé | Aucun pourcentage de crédits/tokens économisés affirmé ; checkpoints traçables préférés |
| Provider Bitrig | Endpoint déclaré dans une section de configuration Codex | Route effective, facturation, rétention/résidence et contrats non vérifiés. Déclaration ≠ activation ; aucun changement de route ni appel ajouté |
| SUMO / netconvert | Non trouvés dans PATH | Candidat offline libre, non installé ; revue de version/licence/checksum et protocole avant toute installation |

Absence aux emplacements inspectés n’est pas une preuve d’absence sur toute la machine. Les mentions antérieures de ces outils ne sont pas récupérées comme décisions d’adoption : UNVERIFIED / FOUNDER CONFIRMATION REQUIRED.

## Choix minimal pour cette consolidation

Réutiliser Node, Git, outils navigateur existants, CI standard publique et mémoire métier. N’ajouter aucun routage, orchestrateur, serveur MCP, mémoire ou compression. Les bibliothèques CORE restent sans nouveau gestionnaire de paquets.

Vérification avec la skill OpenAI Docs : la [documentation officielle AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) décrit les instructions hiérarchiques et leur chargement au démarrage. Cette portée explique l’intérêt de règles courtes et ciblées ; elle ne mesure pas une économie de tokens pour CORE. Aucun réglage de modèle ou de compte modifié.

Avant tout ajout futur : version et origine épinglées, licence vérifiée, permissions/réseau/stockage documentés, secrets et rétention évalués, pas de commande arbitraire ni fournisseur payant par défaut ; test d’ablation reproductible sur le même travail (temps, appels/outils, tokens/crédits si disponibles, qualité/régressions et charge mémoire). Un gain supposé n’autorise ni installation ni achat.

Ajout futur potentiellement utile : **SUMO offline seulement après qualification des comptages et approbation du pilote**, car il comble un manque scientifique documenté. Les autres outils restent optionnels ; le cache exact de validation et les checkpoints répondent déjà au besoin immédiat sans dépendance.
