# CORE — constitutional reconciliation proposals: FD02, FD10 R1, art. 1, art. 8 (V5.1, 2026-10-15) — APPLIED AS FD11

> **Status (2026-10-15 UTC): approved by the founder and applied.** The founder's message « CORE — COMPLETE PREVIOUSLY AUTHORIZED REMEDIATIONS » approved the direction. The final wording was adjusted to that message and is recorded in **FD11** (`docs/FOUNDER_DECISIONS.md`) and the **Constitution V1.1** (`docs/CONSTITUTION_V1_1.md`):
> - validation gates *scientific claims, recommendations, measured impact and consequential real-world actions*;
> - immersive and participatory development is permitted without being presented as validation.
>
> The proposal texts below are kept for traceability.

**Purpose.** The founder's stated direction (2026-10-15):
- CORE World becomes the central human interface;
- CORE Intelligence is the scientific engine;
- CORE TRUST is the mandatory security and governance foundation;
- **scientific validation stays mandatory**.

Four current texts conflict with that direction. This document proposes replacements; nothing is changed until the founder approves each item explicitly (art. 8: date, scope, provenance). It supersedes A1/A2 in `docs/v4/CONSTITUTIONAL_AMENDMENTS_PROPOSED.md`, which missed FD02.

## Current texts (verbatim) and conflicts
| Text | Current wording (source) | Conflict with the direction |
|---|---|---|
| Art. 1 | « **Finalité.** « Solve in the virtual world. Improve the real one. » Civilization est prioritaire ; Business est l’offre professionnelle future ; World est une extension B2C optionnelle et distante. » (`docs/CONSTITUTION_V1.md`) | World is "optional and distant" |
| Art. 8 | « **Continuité.** Préserver les décisions et numérotations historiques, suivre les exigences scientifiques différées et privilégier calibration/validation indépendante aux nouvelles fonctions visuelles. Toute modification future de cette baseline garde date, portée et provenance explicites. » | Ranks visual features below validation, with no admissibility rule |
| FD02 | « Science réelle, calibration et validation indépendante avant nouvelles fonctions visuelles ; préserver phases 0–11 et exigences différées » (`docs/FOUNDER_DECISIONS.md`) | **Sequencing**: visual features only after validation. V3/V4 prototypes already sit in tension with it |
| FD10 R1 | « la Civilization autonome reste la priorité technique immédiate ; CORE World est l’interface participative de long terme (explorer, contribuer, comprendre), dimension distincte mais connectée, ni décorative ni jetable ni indéfiniment inaccessible ; jalons séparés » | World is "long-term"; Civilization is the immediate priority |

## Design principle of the reconciliation
- **Separate the claim gate from the feature gate.** Today FD02 blocks *features* until validation. The proposal blocks *claims* instead: no result, efficacy, impact or recommendation is presented as validated without calibration and independent validation.
- **What is allowed:** interfaces that expose evidence with its status.
- **What is never allowed:** an interface that makes an unvalidated claim look validated.

## Proposed texts

**R-Art.1 (replaces art. 1).**
> **Finalité.** « Solve in the virtual world. Improve the real one. » CORE repose sur un modèle de la Terre unique et gouverné, servi par trois faces :
> - CORE World, l’interface humaine centrale (explorer, comprendre, contribuer) ;
> - CORE Intelligence, le moteur scientifique (agents, simulations, passerelles) ;
> - Business, l’offre professionnelle, strictement séparée.
>
> CORE TRUST (sécurité, vie privée, gouvernance, provenance) est obligatoire pour toutes les faces : aucune ne s’ouvre au public sans ses garanties. Aucune face n’affaiblit les garanties d’une autre.

**R-Art.8 (replaces the second sentence of art. 8).**
> **Continuité.** Préserver les décisions et numérotations historiques et suivre les exigences scientifiques différées. Calibration et validation indépendante restent obligatoires avant toute affirmation d’efficacité, d’impact ou de recommandation réelle. Une fonction visuelle ou participative est admissible si :
> - elle expose des preuves avec leur statut ;
> - elle ne présente rien de non validé comme validé ;
> - elle respecte CORE TRUST.
>
> Le registre des exigences scientifiques reste visible et prioritaire. Toute modification future de cette baseline garde date, portée et provenance explicites.

**R-FD02 (replaces FD02).**
> Science réelle, calibration et validation indépendante **avant toute affirmation** d’efficacité, d’impact ou de recommandation réelle, quelle que soit l’interface. Les fonctions visuelles et participatives sont admissibles aux conditions de l’art. 8 ; elles ne remplacent ni ne retardent la validation, dont le registre reste prioritaire. Préserver phases 0–11 et exigences différées.

**R-FD10 R1 (replaces R1 only; R2–R5 unchanged).**
> CORE World est l’interface humaine centrale (explorer, comprendre, contribuer). Son ouverture publique dépend de CORE TRUST (identité, anti-Sybil, modération, vie privée, sécurité) et d’une autorisation du fondateur. La Civilization autonome et la validation scientifique restent la priorité technique du moteur ; jalons séparés et visibles pour World, Intelligence et TRUST.

## What would not change
- Art. 2–7 and FD01, FD03–FD09.
- FD10 R2–R5.
- Mandatory human authorization for real actions (art. 5, FD04).
- FD09 data rules.

## Effect if approved
- The V3/V4 prototypes become admissible as they are: they label status and claim nothing as validated. They stay non-public until CORE TRUST requirements are met ([REQUIREMENTS.md](REQUIREMENTS.md)).

## Effect if not approved
- V3/V4 stay frozen local prototypes.
- V5 continues science-first: Knowledge, calibration, validation.

## Procedure
1. The founder approves, edits or rejects each of the four texts.
2. Approved texts are recorded as **FD11** with date and wording.
3. A Constitution V1.1 is created, and V1 is kept in history.
4. Add a test that pins the approved wording (today no test asserts the FD02 or art. 1/8 text; `test/founder-decisions.test.js` covers other decisions).
