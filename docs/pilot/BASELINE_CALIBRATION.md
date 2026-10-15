# Baseline, calibration et critères d’échec — spécification v1

Statut : préparation, aucune calibration exécutée. Ordre : droits/couverture → protocole scellé → baseline → calibration → validation → holdout unique → revue indépendante. Aucun résultat synthétique utilisé comme observation.

Pour les mêmes sites/directions/modes/bins, comparer une prédiction figée p aux observations y. MAE = somme des |p−y| divisée par n ; WAPE = somme des |p−y| divisée par somme(y), ratio et non pourcentage implicite. Zéro dénominateur = non évaluable, jamais réussite. Absence de comptage ≠ zéro. Alignement par identifiants/temps obligatoire avant appel de `compareCounts` ; ce helper ne réalise pas une jointure ni une validation scientifique.

Baseline simple : moyenne des mêmes bins sur jours d’entraînement comparables ; ne jamais inclure validation/holdout. Documenter unité, mode, direction, intervalle, fuseau/DST, incertitude du comptage et l’éventuel traitement des manquants préenregistré. Refuser doublons/chevauchements ; plusieurs sources du même comptage ne créent pas de réplications indépendantes.

Un modèle de signalisation exige géométrie/voies/mouvements, phases, cycles, offsets et demandes à la même époque. Sans timings légalement documentés, aucune simulation des « vrais feux ». Ne pas mélanger observations 2018 et réseau actuel ni transférer un résultat d’un corridor sans qualification.

SUMO reste candidat offline : version/licence/composants/checksum à vérifier après données adéquates ; calibration bornée, paramètres identifiables et contraintes physiques. Comparer à la baseline simple, pas seulement à soi-même. Aucun EnergyPlus ou contrôleur à installer/connecter ici.

Seuils d’erreur et de biais, amplitude minimale utile, budget et nombre de réplications : OPEN, à fixer avant holdout. L’ancien exemple WAPE ≤20% reste une proposition non ratifiée. Sur échantillon court : descriptifs et limites, pas intervalle causal fictif ni extrapolation saisonnière. Un modèle calibré sur comptages ne prouve pas un bénéfice trafic/sécurité ; une étude causale et des autorisations distinctes seraient nécessaires.
