# CORE — agent permissions and security review (2026-10-15)

This is a focused review of CORE's **product** agents, done while consolidating Phases 9–13. The Claude Code development tooling is separate (see [CLAUDE_TOOLING_AUDIT.md](CLAUDE_TOOLING_AUDIT.md)). CORE's runtime has no dependency on Claude or Anthropic: the only match in `src/`, `scripts/` and workflows is a local-path pattern in `scripts/integrity-check.mjs`. This review is by the developer's agent; it is not an independent audit or pentest.

## Controls verified in code and tests

| Risk | Control | Evidence |
|---|---|---|
| Unauthorized real-world action | Only local actions allowed; `authorizesRealWorld:false` everywhere; no external execution adapter | `scripts/lib/authority.mjs`; `test/founder-decisions.test.js` |
| Privilege escalation through tools | `ORG.canUse(agent, tool, permission)` before every call; scope checks | `src/civ-engine.js:106-117` |
| Unbounded execution / loops | Per-subtask time budget, subtask cap, concurrency ≤ 4, bounded retries; daemon fetch budget per city per day, 600 s child timeout, STOP file | `src/civ-engine.js:117,152,289`; `scripts/lib/civd-core.mjs:30-59` |
| Prompt injection via model | Mock model that obeys an injection is still blocked from forbidden tools, decision language and invented numbers | `test/phase4.test.js:73` |
| Injection via research questions or contributions | Strict question schema (no free instructions, URLs, roles or tools); contributions map to parameters through trusted capabilities, and text is never interpreted | `src/research.js` `question()`; `scripts/lib/contributions.mjs:61`; `test/phase13.test.js:29` |
| Model output treated as fact | Optional Ollama only: loopback only, `redirect:'error'`, 8 s timeout, 8 KiB response cap, strict JSON schema, `validateStatement`, zero tool calls, deterministic fallback, `verifiedEvidence:false` | `scripts/lib/research-ollama.mjs` |
| Tampered evidence or inputs | Pinned SHA-256 for fixture and catalogue; recomputation; hash-chained memory events | `src/research.js:6-10,35-38`; `src/civ-memory.js` `verify()` |
| Local control centre abuse (CSRF, DNS rebinding) | Binds 127.0.0.1; random token checked with `timingSafeEqual`; Host allowlist; Origin check; POST routes go through the authority gate; CSP and `nosniff` | `scripts/control-server.mjs:3-56,86` |
| Data exfiltration | Public mode never contacts a model; Phase 13 production check: zero external requests; private SQLite under ignored `.core-local/` with restricted modes | `docs/PHASE_13_REPORT.md` |
| Secrets in commits | Integrity scan in pre-commit and pre-push, no bypass; Claude settings deny `--no-verify`, `-n`, `git -c core.hooksPath` | `.githooks/`, `scripts/integrity-check.mjs`, `.claude/settings.json` |

## Findings of this pass

| # | Finding | Severity | Status |
|---|---|---|---|
| A1 | Agents could supersede **human-approved** findings, and `supersede()` accepted rejected successors. This was an unreviewed change to trusted knowledge. | High (governance and integrity) | **Fixed** with a regression test; see [CORE_ENGINEERING_CONSOLIDATION.md](CORE_ENGINEERING_CONSOLIDATION.md) |
| A2 | A rejected claim reworded (different text, so a different content ID) re-enters as a new candidate, with no link to the rejection. It still needs verification, adversarial review and, for findings, human approval. | Medium | **Fixed (2026-10-15).** `propose()` links candidates whose token Jaccard similarity to a rejected entry of the same kind is ≥ 0.6, with at least 3 meaningful tokens each. The flag means "possible relation, not identity" and never rejects automatically. Approval then requires a human whose note cites each linked ID. Automatic procedure/lesson approval and bulk mission approval skip flagged entries and list them in `m.human.pendingRelated`. Tests are in `test/phase10.test.js`. Limit: a lexical method misses paraphrases with different vocabulary, so human review stays the control. |
| A3 | `human:<name>` and the control token are labels or local secrets, not authenticated identities. | High before any multi-user use | Known (FC02, OP02); blocks Business and public contributions |
| A4 | Isolation is in-process. A malicious local script with file access can rewrite private SQLite and its chain. | Medium | Known (Phase 13: "not immutable"); external anchoring is deferred (FC09) |
| A5 | A token header with multibyte characters of matching length makes `timingSafeEqual` throw, which surfaces as an error response. | Low | Fails closed; no change |

## Separation rule

Claude Code subagents, skills and memory are developer tools. CORE's scientific agents, memory and gateways are product components with their own tests. Never wire either into the other.
