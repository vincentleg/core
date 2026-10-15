# CORE — recherche civilisationnelle et Kardashev

Mandat fondateur de consolidation finale, 2026-10-15 UTC. CORE signifie **Creation Of Reborn Earth** ; mission : « Solve in the virtual world. Improve the real one. » Entreprise soutenable et projet participatif sont des finalités ; ni communauté mondiale opérationnelle, ni prospérité ou impact humanitaire mesuré ne sont revendiqués.

## Socle exécutable

`data/research/civilization.json` contient les références, localisateurs, dates de revue, niveaux de preuve, affirmations et limites. `node scripts/civilization-research.mjs --query 'waste heat'` valide le catalogue, calcule un exemple historique et réutilise `src/knowledge.js` dans une collection isolée. Il ne change ni connaissances des missions enregistrées, ni permissions d’agents, ni interface publique. Une référence cassée, une date invalide/future ou une revue échue bloque la commande ; une provenance cohérente ne certifie pas la vérité scientifique.

## Classification, unités et limites

- [Kardashev (1964), pp. 217–221](https://technosearch.seti.org/wp-content/uploads/2018-09/Kardashev_CTA102.pdf) : classification énergétique I/II/III, environ 4×10¹², 4×10²⁶ et 4×10³⁷ W dans l’original. Les valeurs historiques ne sont pas remplacées silencieusement par une convention moderne.
- Interpolation usuellement attribuée à **Sagan, The Cosmic Connection (1973)** : `K = (log10(P/W) − 6) / 10`. Les points 10¹⁶/10²⁶/10³⁶ W donnent 1/2/3 par construction. [Présentation de l’auteur physicien Cramer](https://www.npl.washington.edu/AV/altvw215.html) consultée ; [bibliographie de l’éditeur Sagan](https://assets.cambridge.org/97805217/83033/frontmatter/9780521783033_frontmatter.pdf) retrouvée, passage/page original **non vérifié indépendamment**. Aucune précision scientifique ajoutée par les décimales.
- [BIPM](https://www.bipm.org/documents/d/guest/si-brochure-9-pdf) : J = énergie, W = J/s ; pas de « watts par an » pour une énergie annuelle. Énergie primaire/fourniture totale, énergie finale, électricité et exergie utile ont des frontières différentes. Ne pas additionner entrées de conversion et sorties électriques.
- Exemple **historique 2024**, [Energy Institute, édition 2025](https://energyinst.org/statistical-review/insights-by-source) : 592 EJ de fourniture totale, divisés par 366 jours ≈18,72 TW, K≈0,727. Ce n’est pas une mesure actuelle 2026 ni du travail utile. Sensibilités ±10 % arbitraires : hypothèses, pas intervalles de confiance. Révisions de méthode/édition à harmoniser avant tendances.

## Domaines de recherche et frontières

| Domaine | Base / distinction | Prochaine preuve requise |
| --- | --- | --- |
| Thermodynamique/exergie/chaleur fatale | [Wright 2023](https://arxiv.org/abs/2309.06564v2) : travail radiatif, rendement et rejets contraints ; énergie ≠ travail disponible | Bilans et frontières explicites ; aucun calcul climatique global de CORE |
| Écologie et limites planétaires | [Richardson et al. 2023](https://doi.org/10.1126/sciadv.adh2458) : cadre multidimensionnel ; six limites franchies dans cette étude historique | Actualisation, incertitudes/interactions et échelles ; pas de compteur actuel déduit de 2023 |
| Technologies énergétiques | [IPCC AR6 WGIII ch. 6](https://www.ipcc.ch/report/ar6/wg3/downloads/report/IPCC_AR6_WGIII_Chapter06.pdf) : sobriété/efficacité, renouvelables, nucléaire, réseaux, stockage, flexibilité | Analyse locale du cycle de vie, matériaux, sécurité et coûts ; aucune technologie universellement optimale |
| Industrie spatiale, essaims de Dyson | [Dyson 1960](https://doi.org/10.1126/science.131.3414.1667), bibliographie vérifiée ; modèles radiatifs de Wright | Construction, masse, dynamique orbitale, entretien, propulsion et délais lumineux : hypothétiques/non démontrés ici |
| Fermi, Grand Filtre, technosignatures | [Verendel/Häggström 2015](https://arxiv.org/abs/1510.08684v2) : conclusions sensibles aux a priori | Détectabilité et faux positifs ; aucune civilisation extraterrestre ni probabilité d’effondrement établie |
| Paix, liberté, bien-être, coopération, résilience, capacité scientifique | Mandat fondateur ; [UNDP](https://hdr.undp.org/data-center/human-development-index) fournit une référence de dimensions humaines, pas une couverture exhaustive | Définitions, sources, incertitudes et revue indépendante de chaque dimension ; aucun poids ni score agrégé ratifié |

Types IV/V, extensions multivers, propulsion supraluminique et échéanciers de civilisation : **spéculation**, hors capacités démontrées. La science-fiction optimiste inspire la découverte, la coopération et la réduction des souffrances ; elle n’est pas une preuve technique ni une promesse de résultat. Aucun contenu créatif tiers copié.

## Cadre CORE multidimensionnel proposé

Conserver des axes séparés : énergie/exergie, soutenabilité, santé/éducation/bien-être, paix/liberté/coopération, résilience et capacité de recherche. Pour chaque indicateur : unité, population/périmètre, époque, qualité, provenance, dissidence, manquants, biais et limites. Aucun classement de la valeur humaine, des droits ou des pays, aucune récompense de consommation énergétique en soi. Gouvernance des métriques et pondérations reste ouverte. Les fondations SF/énergie/eau/climat gardent les mêmes gates de preuves ; aucun simulateur universel supposé.

Références seulement et résumés originaux CORE : aucun article, livre ou jeu de données tiers embarqué. La revue bibliographique, le calcul reproductible et les tests logiciels ne remplacent ni expertise indépendante, ni calibration, ni validation causale.
