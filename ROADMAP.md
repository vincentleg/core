# CORE — delivery roadmap

This roadmap replaces the historical phase numbering in HANDOFF.md and the prototype UI. Historical phases 0 (synthetic corridor) and 1 (globe implementation) are existing assets, not evidence of production readiness. Deliver one phase at a time; no phase below authorizes an agent to execute infrastructure changes.

| Phase | Scope | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 0 — Foundation & GitHub | Audit, documentation, reproducible build/tests, preserve history, safe GitHub publication | Required docs present; application preserved with documented minimal fixes; build and tests pass; browser evidence or explicit pending status; secret/size review; verified commit on remote main | Foundation delivered; remote commit verification recorded in delivery report |
| 1 — Prototype reliability & data honesty | Close Phase 0 audit gaps before geographic integration | Desktop Chrome/Firefox/Safari and mobile checks recorded; source/date/fallback labels visible; Nominatim compliant configuration or search disabled; non-open imagery resolved; permit inputs fail closed with negative tests; empty/failed agent runs recover; all tests pass | In progress — interrupted for Claude Code handoff; 19 Node tests pass, browser gate fails; see docs/CLAUDE_HANDOFF.md |
| 2 — One real street corridor | Anchor one Folsom Street corridor to documented OSM geometry | Reproducible source snapshot, license/date and missing-data handling; geometry on map; demand and timings explicitly synthetic until calibrated; unchanged separation of simulation and authorization | Planned |
| 3 — Calibrated pilot | SUMO adapter, observed counts and timings; offline results | Calibration/holdout error and uncertainty displayed before gains; reproducible dated results and stress tests; human engineering review | Planned |
| 4 — Roadworks coordination | Compare closures and work schedules across a pilot area | Evidence-linked proposals, explicit validity/revocation rules, auditable human review, measured pilot outcomes | Planned |
| 5 — Generalization | Multiple regions and specialist simulators | Portable scenario/permit contracts and validated adapters; geographic/data-access boundaries tested | Planned |
| Later | Energy, water, subsurface, collaboration, XR | Separate scoped acceptance criteria and data/security review before implementation | Vision only |

Phase 1 continuation: do not restart implemented work. First resolve the MapLibre runtime exception and incomplete browser validation described in docs/CLAUDE_HANDOFF.md; then finish the concrete items in docs/PHASE_0_AUDIT.md, starting with truthful map data labels, provider compliance and fail-closed permit validation. Do not start new real-street optimization until these criteria pass. Engine changes require an explicit task authorizing them.

Long simulations run offline only on explicit request; provide reproducible commands instead of launching repeated searches. Existing browser action “Lancer les agents” runs the bounded demonstration (3,030 reported evaluations).
