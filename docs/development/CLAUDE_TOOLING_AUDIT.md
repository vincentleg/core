# CORE — Claude Code tooling audit (2026-10-15)

Scope: development tooling for Claude Code only. No CORE runtime, scientific module, data or Phase 14 work is touched. This audit extends `docs/TOOLING_INVENTORY.md`, `docs/PHASE_13_TOOLING.md` and FC15 in `docs/FOUNDER_COMMITMENTS.md`, and does not replace them.

## Baseline verified

- Local clone (expected path confirmed), remote `github.com/vincentleg/core`, branch `main`, HEAD `21ef38d` = tag `phase13-release`.
- Claude Code 2.1.300, Node v22.20.0, `gh` available. `core.hooksPath = .githooks` (pre-commit, pre-push: integrity check and tests).
- Before this work: no project or user MCP server (`~/.claude.json`, no `.mcp.json`), no installed plugin, no project skill, subagent or Claude hook. Only user setting: `theme`.
- Nothing in `test/`, `scripts/`, `.githooks/` or `.github/` reads `CLAUDE.md`, `AGENTS.md` or `.claude/`.

## Adopted (native, free, no network, no new dependency)

| Change | Effect | Removal |
|---|---|---|
| `CLAUDE.md` reduced to `@AGENTS.md` import plus 5 Claude-only rules | Instructions loaded at session start go from 6,810 B (old `CLAUDE.md`, which then also required a manual read of `AGENTS.md`) to 4,844 B (`CLAUDE.md` 1,194 + `AGENTS.md` 3,650), so about 29% fewer startup bytes, and `AGENTS.md` is always loaded instead of loaded on demand. It is now a single rule source shared with Codex. | `git checkout CLAUDE.md` |
| Phase 11 module and command map moved verbatim to `docs/development/CLAUDE_REFERENCE.md` | Read only when needed, no longer paid for in every session | Delete the file |
| `.claude/settings.json` (shared) `allow` list | Fewer permission prompts for read-only git commands and the existing checks (`node --test`, `build.js`, `integrity-check`, `verify`, `csp`) | Edit the list |
| `.claude/settings.json` `deny` list | Blocks force-push (`--force`, `-f`, `+refspec`), `--no-verify`/`-n` on commit and push, `git -c core.hooksPath`, reads of `.env*` / `*.pem` / `*.key`, and Claude edits to `corridor.html` and `data/**` | Edit the list |
| Anthropic compliance section in `CLAUDE.md` | Six-line permanent rule set covering authorized auth only, no circumvention, no routers, no external data transfer without approval, legitimate token savings, and stop-and-ask. It links to the governing texts instead of copying them. | Remove the section |
| `.gitignore` covers `.claude/settings.local.json` | Personal overrides are never committed | Remove the line |
| Native per-project auto-memory (`~/.claude/projects/…/memory/`) | Already built in; it holds the cross-session memory that Claude-Mem would duplicate | None needed |

## Candidates evaluated

Identity and metadata come from the GitHub API (2026-10-15) and the Claude Code plugin directory cache. Activity is not a security audit.

| Candidate | Identity / licence | Decision | Reason |
|---|---|---|---|
| Claude-Mem | `thedotmack/claude-mem`, Apache-2.0, active | REJECTED (unchanged from Phase 13) | Captures sessions through hooks and builds AI summaries, which duplicates native auto-memory, Git and the CORE SQLite registry. It adds hook overhead and session data retention, and no token gain has been measured. |
| OmniRoute | `ourines/omniroute`, MIT (Phase 13) | REJECTED | Model proxy and router that handles credentials and providers. It is an external data path with no need, and `AGENTS.md` forbids paid fallbacks. |
| Edge Rope | No Claude Code tool by that name found | UNIDENTIFIED | The closest match is Edgee, a gateway that routes Claude Code traffic through a third party for compression. That would send prompts and code outside, which is rejected under the no-external-transfer rule. The founder should give the intended URL if it was something else. |
| Ruflo | `ruvnet/ruflo`, MIT, active | REJECTED (unchanged from Phase 13) | A multi-agent orchestration framework, which conflicts with the one-agent rule in `AGENTS.md` and adds heavy maintenance and permission surface. |
| Claude Code Setup | `claude-code-setup` 1.0.0, official Anthropic plugin directory, partner-reviewed, read-only analysis | NOT INSTALLED | It recommends hooks, skills, MCP and subagents. This audit has done that work, and installing it would add a plugin for a one-off result. It can be run once on demand (`/plugin install claude-code-setup@claude-plugins-official`) if the founder approves. |
| Task Observer | Ambiguous: the directory entry is `petrovicistefan/claude-code-plugins` (not reviewed), while web listings point to `rebelytics/one-skill-to-rule-them-all` | REJECTED | Unclear provenance. It is an always-on meta-skill that logs observations during every task, which adds tokens to each session for a speculative benefit. |
| Context7 MCP | `upstash/context7`, MIT, official plugin directory (Anthropic-reviewed) | DEFERRED | Hosted remote server: it sends library queries to `mcp.context7.com`, and rate limits are lower without an account or key. CORE has few dependencies (vendored MapLibre 5.7.3, Node built-ins), so the need is low. Reconsider if Phase 14 adds libraries. |
| Playwright MCP | `microsoft/playwright-mcp`, Apache-2.0, active | DEFERRED | Runs locally and is free, but it needs a package download through `npx`, and its tool schemas add context. CORE already has dependency-free CDP/BiDi browser audits (`scripts/browser-audit.mjs`, DECISIONS) and Phase 13 adopted native CDP. Use the existing scripts. |
| Firecrawl MCP | `firecrawl/firecrawl-mcp-server`, MIT, active | REJECTED | A hosted service: crawl and map need an API key and an account with credits. The keyless tier is rate-limited and still sends data externally. Built-in WebFetch/WebSearch cover occasional needs. |
| Perplexity MCP | `perplexityai/modelcontextprotocol`, MIT | REJECTED | Requires a Perplexity API key, a paid metered API. This is forbidden by `AGENTS.md` (no paid service or key). |

## Configuration validation (2026-10-15, second pass)

Checked against the [permissions documentation](https://code.claude.com/docs/en/permissions) for Claude Code 2.1.300:

- Deny rules are evaluated before allow rules, and an allow rule cannot carve an exception out of a deny rule.
- A rule with two wildcards does not match the bare form of a command. Previously `git push <remote> <branch> -f`, refspec `+` force-pushes, `git commit -n` (the short form of `--no-verify`) and `git -c core.hooksPath=…` were not covered. Deny rules for these were added.
- `Edit(./corridor.html)` and `Edit(./data/**)` were added at the founder's request (second mandate). Edit deny rules also cover Bash file commands that Claude Code recognizes, such as `sed`/`tee`, and redirect targets. No build, test or documented workflow writes these paths through a shell redirect: they are written inside `node build.js` and the `scripts/*.mjs` regenerators, which these rules do not affect. CI runs without Claude and is unaffected.

Live probes, which take effect without a restart because settings reload:

| Probe | Expected | Observed |
|---|---|---|
| `git commit --no-verify --dry-run` | denied | denied |
| `git commit -n --dry-run` (rule added this session) | denied | denied |
| Read `./.env` | denied | denied |
| `: >> corridor.html` (zero-byte append) | denied | **allowed**. No content was changed, but redirects through the `:` builtin are not caught. |
| Edit tool on `corridor.html` / `data/**` | denied | not probed: the auto-mode classifier refused further probing of Claude's own permissions |

The Edit/data guard is therefore defence in depth, not a complete barrier. The `CLAUDE.md` rule, code review and git history remain the primary controls.

## Deliberately not added

- **Subagents**: `AGENTS.md` sets one agent with no delegation without authorization.
- **Claude hooks**: the repository's git hooks already enforce integrity and tests. A Claude-side duplicate would cost time on every tool call. The `deny` rules give a partial generated-file guard without a script.
- **Project skills**: no workflow is yet repeated often enough to justify one. Revisit if Phase 14 adds a recurring validation recipe.

## Validation

- `.claude/settings.json` parses as JSON. `git diff --check` is clean. `node scripts/integrity-check.mjs --all`: 0 findings after removing a local absolute path it flagged in this document.
- No application or browser tests were run. Only documentation and Claude configuration changed, with no runtime input (per `AGENTS.md`).

## Open items for the founder

- Approve or discard these uncommitted changes. Nothing has been committed or pushed.
- Identify "Edge Rope" if it was not Edgee.
- Optionally approve a one-off run of `claude-code-setup` as a second opinion.

## Advertised Claude skills (UI/UX, SEO, accessibility, marketing, legal checklists…) — 2026-10-15

No specific skill package or source was supplied, so none can be verified or installed. Any proposed skill must pass these checks before use:
- authentic source and maintainer, licence, and full read of its instructions and scripts;
- filesystem, network and secret access, and external transmission of repository content;
- supply-chain risk and compatibility with `.claude/settings.json` deny rules and FD08/FD09;
- measured incremental value and cost.

Skills that hide AI use, bypass provider limits or evade security controls are refused outright.

The compliance audit (`docs/compliance/`) was done with existing tools only:
- `grep`;
- the repository's Chromium audits;
- a scratch CDP DOM probe, not committed;
- GitHub's public advisory API, which received only the public package name.

Built-in Claude Code skills (`/code-review`, `/security-review`, `/simplify`) cover review needs. Marketing claims about token savings or productivity are not treated as evidence. **Decision: nothing installed.**
