# CORE — user flows (implemented features only, 2026-10-15)

Each flow names what exists today, how it fails, and which automated check covers it.
- "Main audit" is `scripts/browser-audit.mjs` (Chromium 155 and Firefox 122: 162/162 on 2026-10-15).
- "Negative" is `scripts/browser-negative-audit.mjs` (Chromium only).
- "Lab" is `scripts/research-browser.mjs`.

**Not implemented, so no flow exists:**
- contributor accounts, contribution submission and its review status;
- CORE World participation;
- any CORE Business screen.

The only human input stored anywhere is the optional, local-only review note (flow 6).

## 1. Discover CORE
| | |
|---|---|
| Entry | `/` (landing) |
| Objective | Understand what CORE is and enter |
| Steps | 1. Wordmark and tagline over the natural Earth. 2. **ENTER CORE**. 3. Flight to San Francisco. `/#app` skips the landing |
| Success | Interface revealed over the holographic city style |
| Errors | Map engine unavailable: "Impossible de charger le moteur de carte (connexion ?)". WebGL or connection failure: "Carte indisponible : WebGL ou connexion. Le corridor reste accessible." A tile source down: "Une source cartographique est indisponible ; données potentiellement incomplètes." |
| Recovery | The corridor page works without the map; reload |
| Accessibility | One `main`/`h1`; keyboard Tab order verified in Chromium; reduced motion removes transitions |
| Privacy | Only the third parties listed in `privacy.html` are contacted; fonts and MapLibre are self-hosted |
| Covered by | Main audit: landing, ENTER, flight, `#app`, "no third-party code CDN request". Negative: blocked engine and tiles |

## 2. Explore the city and inspect an evidence record
| | |
|---|---|
| Entry | Explorer → "Pilote San Francisco · Folsom / Howard", search, or a click on the map |
| Steps | 1. Panel opens with the dated snapshot and its SHA-256 check. 2. Toggle layers or filter status. 3. Click a record. 4. Open its DataSF source |
| Success | The record shows its **OBSERVÉ** label, provenance and source link; record counts match the manifest |
| Empty state | "Aucun registre dans la zone cliquée." |
| Errors | Snapshot integrity fails: the "?" marker replaces "✓" and the panel says the file is not intact. A verified checksum never claims the source is accurate |
| Covered by | Main audit: "pilot panel opens with dated snapshot", "snapshot SHA-256 verified", "record selection shows observed record with provenance", "record links to DataSF" |

## 3. Understand uncertainty
| | |
|---|---|
| Where | Badges and pills described in `docs/DESIGN.md` (observed / approximate / synthetic; observation vs derivation vs rule vs hypothesis; RELECTURE vs EN DIRECT) |
| Success | Every number in a brief has a basis label. Procedural landmarks say **APPROXIMATIF**. Simulations carry an exploratory badge. Replays say they are recordings |
| Covered by | Main audit: "synthetic demo stays labelled separately", "simulation is drawn on the map per block with an exploratory badge", "replay is labelled as a recording and calls no model", "city intelligence separates statistics, predictions and announcements" |

## 4. Run or replay a mission and read the gateway
| | |
|---|---|
| Entry | Intelligence → a feed item → **Lancer**, or Missions |
| Steps | 1. Specialists run in the browser. 2. Findings appear. 3. The gateway gives its state. 4. Human review is shown as required |
| Success | Fingerprint equals the recorded Node mission; the state is never an authorization |
| Errors | Cancellation restores controls; a failed run blocks the stale permit (corridor) |
| Covered by | Main audit: "feed event becomes a mission…", "browser mission equals the recorded Node mission", "mission cancellation works", "decisions view lists gateway outcomes without authorizations", "failed run blocks stale permit and recovers UI" |

## 5. Recover from unavailable or stale data
| | |
|---|---|
| Where | Preuves → Santé des données; Intelligence |
| Behaviour | Stale feed: a warning box with the data age. A source that cannot be reached: "Historique indisponible (…). Aucune conclusion n’est tirée." Failed collections keep the previous items and say so. Each source's health lists its last success and last error |
| Covered by | Main audit: "source health shows stale official sources", "data health: … (or explicit unavailability)", "browser refresh is rate-limited" |

## 6. Review a proposed decision (local record only)
| | |
|---|---|
| Entry | Missions → Décisions |
| Steps | Choose a review option and an optional note of up to 200 characters |
| Success | Recorded **only in this browser** (`core.human-decisions.v1`), with the statement that it has no real-world effect |
| Privacy | Do not write personal data in the note; it stays on the device. See `docs/compliance/PRIVACY_NOTICE_DRAFT.md` |
| Covered by | Main audit: "decisions view offers a local-only human review record" |

## 7. Watch the civilisation replay
| | |
|---|---|
| Entry | Monde (Activity feed on desktop and tablet) or Civilisation → Activité (all sizes) |
| Success | Only recorded messages, labelled RELECTURE; agents move only for a recorded reason |
| Fixed this pass | Starting a mission replay while the activity feed was ending could undo the replay's dimming and send replay participants back to their posts (`src/civ-activity.js`) |
| Covered by | Main audit: "activity feed replays recorded messages only", "replay drives exactly the recorded participants", Node test "a stopped activity playback cannot undo a mission replay" |

## 8. Use the research lab
| | |
|---|---|
| Entry | `research.html` |
| Success | Recorded dossiers are reproduced in the browser; 0 external requests |
| Covered by | Lab: 7 checks, including "mobile-no-overflow" and "labels-and-skip-link" |

## 9. Read the privacy information
| | |
|---|---|
| Entry | "Confidentialité" link in the navigation bar → `privacy.html` |
| Known gap | The published notice omits two storage keys. A corrected draft exists but is **not published** (founder and counsel decision) |
| Covered by | Main audit: "privacy notice linked" |

## Gaps

- Safari/WebKit: no automated run.
- Screen readers: no VoiceOver or NVDA run.
- Colour contrast: not measured.
- Flows 2 and 4 on a phone are covered only by the layout and overflow checks, not walked step by step.
