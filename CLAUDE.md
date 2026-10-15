# CORE — instructions for Claude Code

@AGENTS.md

`AGENTS.md` (imported above) is the single source of truth shared with Codex and other agents; current state is `PROJECT_STATE.md`. Do not duplicate its rules here. Module map and command list (Phase 11 snapshot): `docs/development/CLAUDE_REFERENCE.md`, read only when needed. Tooling decisions: `docs/development/CLAUDE_TOOLING_AUDIT.md`.

Claude-specific rules not covered by `AGENTS.md`:
- Never hand-edit `data/` or `corridor.html`; after editing the inline script of `index.html` run `node scripts/csp.mjs` (a test checks the CSP hash).
- Do not re-enable Nominatim/Esri without resolving the documented constraints; do not change machine-wide browser settings to make a test pass.
- Scheduled `city-feed.yml` runs: do not claim continuous refresh without observed evidence.
- Context economy: search with Grep/Glob before reading; read large files (`index.html`, `corridor.html`, `data/**`, `docs/PHASE_*`) by range, not whole. Do not re-run a passing check without a relevant change.
- No subagents, MCP servers, plugins or hooks beyond `.claude/settings.json` and `docs/development/CLAUDE_TOOLING_AUDIT.md` without founder approval.

Anthropic compliance (permanent; governing texts: [Usage Policy](https://www.anthropic.com/legal/aup), [Consumer](https://www.anthropic.com/legal/consumer-terms)/[Commercial](https://www.anthropic.com/legal/commercial-terms) Terms, [Claude Code legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)):
- Use only the founder's own authorized Claude account or API key through the unmodified Claude Code client and Anthropic's own sign-in flow. Never read, copy, store, log, share or reuse OAuth/session tokens or API keys.
- Never bypass or work around usage limits, rate limits, safeguards, permission denials, billing controls or account restrictions (no extra accounts, rotation, or retry-to-evade). A blocked action is reported to the founder, not re-attempted another way.
- No proxy, gateway or model router between Claude Code and Anthropic (e.g. OmniRoute, Edgee, LiteLLM) and no routing of subscription access to other tools or users.
- Do not send CORE code, data or private records to any external provider, MCP server or web service without founder approval; public documentation lookups are fine.
- Save tokens only by legitimate means: targeted reads, concise output, no redundant runs.
- If an action may breach these policies or their scope is unclear, stop and ask.
