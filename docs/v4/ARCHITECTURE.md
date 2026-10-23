# CORE V4 — the human civilization layer: architecture (2026-10-15)

**Status legend:**
- **Implemented**: local code with tests.
- **Demo**: a local demonstration with fictional or synthetic parts, labelled.
- **Proposal**: design only.
- **Blocked**: needs a founder decision or an external review.

Nothing is public. V4 sits around the V3 World without changing it, apart from one link from the World problem panel to the vault.

## 1. One shared, governed knowledge system
```
 World (avatars, agents, problems) ─┐                         ┌─ CORE City / Region / Government / Enterprise / Schools
 Commons: Identity · Vault · Labs ──┼──► shared models ◄──────┤   (institutional workspaces, proposal)
 Arena · Academy · Progress ────────┘   identity · permission  └─ Intelligence (agents, gateways, evidence) — unchanged
                                        contribution · provenance · audit
```

## 2. Shared models
| Model | Content | Status |
|---|---|---|
| **Identity** | CORE id (`core:` + 10 base-32 characters), pseudonym (3–24 characters, no contact details), age band, per-field visibility (private by default), declared vs verified expertise, leaderboard opt-in (off; refused for non-adults), contact `none` | Implemented (`src/civic/identity.mjs`) |
| **Permission** | Owner-only changes; explicit grants (`labsAnalysis`, collaborators, publication). No institution or agent reads a private idea without a grant | Implemented for the vault; institutional grants are a proposal |
| **Contribution** | Lifecycle with actor rules, reusing the gateway vocabulary (V3 `contributions.mjs`); ideas, versions, reviews and contests | Implemented locally |
| **Provenance** | Every version gets a SHA-256 fingerprint chained to the previous one; the review method is named with its version; dataset provenance follows the V3 record | Implemented (fingerprints, chain verification) |
| **Audit** | Append-only history: contests, judge sheets and teacher feedback carry actor and time; corrections are added, never overwritten | Implemented in the modules; a durable server log is a proposal |
| **Account security** | Passkeys (WebAuthn) as the primary login; recovery codes generated once; optional second device; no SMS-only recovery; session binding; rate limits. Legal identity only where a law or a role requires it (verified credentials, institutional staff) | **Proposal**: no accounts exist (Constitution art. 6) |

## 3. Pillars
| Pillar | What exists | Status |
|---|---|---|
| CORE Identity | Profile creation, visibility, declared expertise, public preview | Implemented (local) |
| CORE Idea Vault | Encrypted local storage (PBKDF2-SHA-256, 210,000 iterations → AES-GCM-256), chained versions, Labs permission, local publication with licence, attribution and disclosure warning | Implemented (local). A trusted timestamp (RFC 3161) and collaboration are proposals; legal review is **blocked** |
| CORE Labs | Deterministic 8-criterion checklist (`core-labs-checklist` v0.1.0), revision loop, 5 analyses per idea per day, near-duplicate refusal, contests to a human | Implemented. Model-assisted analysis is a proposal (local model only, same grounding and safety rules) |
| CORE Arena | Rules, roles, conflict checks, sealed sheets, median aggregation, closed public voting; one fictional challenge where the user sits as judge 3 beside labelled fictional sheets | Demo |
| CORE Academy | 4 pathways (age ranges are hypotheses); one lesson built from a real record; teacher session with fictional learners; teacher-only feedback | Demo. Real classrooms are **blocked** (safeguarding, legal and security review) |
| CORE World News for Education | Editorial design only (§5) | Proposal: no source pipeline |
| CORE Continuity | Bibliography and research framework ([CONTINUITY.md](CONTINUITY.md)) | Research |
| CORE Global Progress | Virtual activity (8 counts from registries) vs 2 sourced Earth indicators; no composite score; Kardashev as a teaching tool | Implemented (local), on existing data |
| Schools & families | Teacher authority built into the session model | Proposal beyond the demo |

## 4. Child safety architecture (proposal, required before any minor)
1. **Accounts and consent:** minors join only through a school or a verified guardian. Required permissions follow the applicable law: GDPR art. 8 (digital-consent age set per member state, 13–16), COPPA (US, under 13), the UK Age Appropriate Design Code. Compliance is **not** claimed; this needs counsel review.
2. **Defaults:**
   - private profiles;
   - no direct messages with unknown adults;
   - adult–minor contact only inside teacher-supervised classrooms;
   - no public ranking;
   - no behavioural advertising;
   - no purchases;
   - no AI companion designed to build attachment.
3. **Moderation:** reporting in one click; human moderators trained in safeguarding; an escalation path.
4. **Data:** minimisation, short retention, deletion by the guardian or the school.
5. **Code today:**
   - `identity.mjs` refuses public bios and leaderboards for non-adult profiles;
   - `academy.mjs` refuses any mode except teacher-demo, and any learner who is not a fictional persona.

## 5. World News for Education (proposal)
- **Sources:** an allowlist of reputable outlets and wire services, plus primary documents. Licensing is reviewed per FD09 before any ingestion.
- **Editorial card:**
  - what happened, where, and why it matters;
  - verified facts;
  - uncertainties;
  - perspectives, with attribution;
  - what can be learned;
  - publication time and the time the facts were checked.
- **Labels:** FACT / OPINION (attributed) / HYPOTHESIS / DEVELOPING.
- **Age-banded writing:** no distressing imagery for under-14s, no sensationalism, no engagement loops.
- **Human editor:** approves every card. No "live" claim without an operating pipeline.

## 6. Human empowerment map (Constitution proposal P1)
| Pillar | Human role supported | AI assists | Reserved for humans | How AI output is challenged | Against over-reliance |
|---|---|---|---|---|---|
| World | Citizen, explorer | Explaining records, guiding | Judging relevance, contributing | Every answer cites records; "aucun" when absent | Answers point to sources, not conclusions |
| Labs | Inventor, researcher | Completeness checklist, questions | Deciding what the idea is and whether it is good | Contest per analysis, to a human | Throttle; no score to optimise |
| Arena | Participant, judge | Formatting, aggregation | Judging and justification | Published sheets; 7-day contest | Judges write their own justifications |
| Academy | Teacher, learner, guardian | Lesson structure, choice feedback | Open-answer feedback, pacing, assessment | Teacher overrides | No auto-grading of reasoning; no learner ranking |
| Progress | Analyst, public | Computing indicators from sources | Interpreting meaning and priorities | Source, method and uncertainty shown | No composite score |
| Intelligence | Scientists, officials | Investigation, simulation | Review, authorization, implementation | Gateway recalculation; dissent kept | "Prêt pour revue" ≠ approved |
| City / Region / Government | Officials, planners | Analysis, scenarios | Political and legal decisions | Independent review; conflicts disclosed | Recommendations, never mandates |
| Healthcare, engineering, education services | Licensed professionals | Information and repetitive tasks only | All professional acts | Professional review | No substitution for licensed practice |

## 7. Institutional integration
- **What institutions can buy:** analysis, authorized datasets, simulations, integrations and support, through separate workspaces.
- **What they cannot buy:** conclusions, public voting influence, Arena results, or access to private ideas, protected citizen data or confidential contributions without the owner's grant or a lawful order reviewed by counsel.
- **Schools:** they get classrooms under their own authority (proposal).
- **Reference rules:** the independence rules are in the V3 threat model §4 and proposal P8.

## 8. Recognition and progression (proposal)
- **Achievements:** each is specific and documented ("analysed 3 proposals with complete evidence", "Arena finalist — fictional challenge 001"). There is no global experience score and no universal rank.
- **Rankings:** thematic or regional only, opt-in, adults only. They are based on judged work, never on votes alone or payment.
- **Integrity:** anti-collusion uses conflict declarations, judge rotation, statistical anomaly checks on sheets, and appeals.
- **Not sold:** votes, ranks, wins, authority or visibility (`NEVER_FOR_SALE`, V3).
