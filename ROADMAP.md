# CORE — delivery roadmap

This roadmap replaces the historical phase numbering in HANDOFF.md and the prototype UI. Historical phases 0 (synthetic corridor) and 1 (globe implementation) are existing assets, not evidence of production readiness. Deliver one phase at a time; no phase below authorizes an agent to execute infrastructure changes.

| Phase | Scope | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 0 — Foundation & GitHub | Audit, documentation, reproducible build/tests, preserve history, safe GitHub publication | Required docs present; application preserved with documented minimal fixes; build and tests pass; browser evidence or explicit pending status; secret/size review; verified commit on remote main | Foundation delivered; remote commit verification recorded in delivery report |
| 1 — Prototype reliability & data honesty | Close Phase 0 audit gaps before geographic integration | Desktop Chrome/Firefox/Safari and mobile checks recorded; source/date/fallback labels visible; Nominatim compliant configuration or search disabled; non-open imagery resolved; permit inputs fail closed with negative tests; empty/failed agent runs recover; all tests pass | Closed 2026-10-12 — 21 Node tests pass; Chrome 155 and Firefox 122 audits pass with no uncaught errors; Safari not tested (owner setting); see docs/PHASE_1_REPORT.md |
| 2 — One real street corridor | Anchor one Folsom Street corridor to documented OSM geometry | Reproducible source snapshot, license/date and missing-data handling; geometry on map; demand and timings explicitly synthetic until calibrated; unchanged separation of simulation and authorization | Planned |
| 3 — Calibrated pilot | SUMO adapter, observed counts and timings; offline results | Calibration/holdout error and uncertainty displayed before gains; reproducible dated results and stress tests; human engineering review | Planned |
| 4 — Roadworks coordination | Compare closures and work schedules across a pilot area | Evidence-linked proposals, explicit validity/revocation rules, auditable human review, measured pilot outcomes | Planned |
| 5 — Generalization | Multiple regions and specialist simulators | Portable scenario/permit contracts and validated adapters; geographic/data-access boundaries tested | Planned |
| Later | Energy, water, subsurface, collaboration, XR | Separate scoped acceptance criteria and data/security review before implementation | Vision only |

Phase 1 is closed; its report lists the limits carried forward (headless-only coverage, Safari/iOS untested, synthetic traffic, no real signatures). Phase 2 starts only on the founder's explicit request. Engine changes still require an explicit task authorizing them.

Long simulations run offline only on explicit request; provide reproducible commands instead of launching repeated searches. Existing browser action “Lancer les agents” runs the bounded demonstration (3,030 reported evaluations).
