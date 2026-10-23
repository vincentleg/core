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
- **Project skills**: one added on 2026-10-15, `.claude/skills/core-browser-audit/` (see below). The real-browser recipe had become recurring, and had to be rebuilt from scratch, with a safety trap (port 9222).

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

## Screenshot candidates — evaluation 2026-10-15 (V2 mission)

Method:
- Identity, licence, last push and stars come from the GitHub API, which received public repository names only.
- Install, network and telemetry behaviour come from each README and file tree, and for the shared installer from its source (`vercel-labs/skills` `src/telemetry.ts`).
- No candidate was installed or executed. Screenshots and social posts are leads, not evidence; stars are not a quality measure.
- Context cost: each installed skill adds its description to every session, and its body loads when the skill is used.

**Cross-cutting finding.** Most skills install with `npx skills add …`. That CLI **sends telemetry to skills.sh by default** (opt-out with `DISABLE_TELEMETRY` or `DO_NOT_TRACK`). Any skill CORE adopts is therefore copied by hand at a pinned commit after review, never installed through that CLI.

### Engineering skills
| Candidate | Source · licence · last push | What it is | Install / network / telemetry | Decision | Reason |
|---|---|---|---|---|---|
| Superpowers | `obra/superpowers` · MIT · 2026-10-10 | 15 skills: brainstorm, plan, TDD, debugging, verification | Plugin with a `SessionStart` hook; its optional visual companion loads a logo from the author's site that reports the version (opt-out env var) | **ADAPT** (principles only) | Overlaps `AGENTS.md`; the hook and the telemetry pixel are not needed for the principles |
| Agent Skills | `addyosmani/agent-skills` · MIT · 2026-10-13 | 25 skills across define, plan, build, verify | Plugin with hooks, or `npx skills` (telemetry) | **ADAPT** | Good checklists. 25 descriptions add context every session; CORE already has a stricter verify loop |
| Anthropic Skills | `anthropics/skills` · per-skill licences (no repository licence) · 2026-10-09 | 20 reference skills (`frontend-design`, `webapp-testing`, `skill-creator`…) | Official marketplace | **DEFER** | Useful references. `webapp-testing` needs Playwright, see below |
| Matt Pocock Skills | `mattpocock/skills` · MIT · 2026-10-13 | 38 skills (planning, TDD, terseness) | `npx skills` (telemetry) | **ADAPT** | Ideas worth keeping (state the goal, terse output); 38 descriptions is too much context |
| Karpathy guidelines | `multica-ai/andrej-karpathy-skills` (was `forrestchang/…`) · **no licence** · 2026-04-20 | One `CLAUDE.md`: think first, simplicity, surgical changes, goal-driven execution | Plugin or copy | **ADAPT** (ideas only) | No licence, so the text cannot be copied. All four principles are already in `AGENTS.md` (targeted reads, no superfluous refactoring, end criteria) |
| Ponytail | `DietrichGebert/ponytail` · 2026-10-15 | 12 skills that push the agent towards less code | Plugin with hooks | **DEFER** | Same aim as `AGENTS.md` ("aucun refactoring superflu"); hooks add a call on every tool use |
| Caveman | `JuliusBrussee/caveman` · Apache-2.0 · 2026-10-15 | Terse-output skill **plus a proxy, CLI and cloud** | The CLI sends usage stats by default; the proxy and its cloud service can route model traffic | **REJECT** | A model proxy is forbidden by `CLAUDE.md`. The skill alone sends nothing, but terse "caveman" prose conflicts with clear French documentation |
| Security Audit | `cloudflare/security-audit-skill` · MIT · Cloudflare organisation · commit `c1c8a8c14710` (2026-09-14) | One source-first audit skill (~3,100 words plus reference files), confirmed vs candidate findings, sandboxed execution | Pure Markdown plus 2 local validators; no network | **EXPERIMENT** (founder approval) | Best fit of the set. Its full-audit mode delegates to subagents, which `AGENTS.md` forbids without authorization. Guidance mode is usable once vendored at the pinned commit |
| Diagram Design | `cathrynlavery/diagram-design` · 2026-10-15 | Editorial diagram skill | `npx skills`; `pip install playwright` for export | **DEFER** | No diagram need in the current scope |
| Graphify | `Graphify-Labs/graphify` · Apache-2.0 · 2026-10-14 | Codebase-to-graph query tool | Python package via pipx/uv (`curl … | sh` installer shown), `PreToolUse` hook, local query log | **DEFER** | A new Python dependency and hook for a repo that `grep` navigates well |
| Humanizer | `blader/humanizer` · MIT · 2026-09-28 | Removes signs of AI writing | `npx skills` | **REJECT** | Hiding AI involvement is refused by policy (see above) |
| Claude-Mem | `thedotmack/claude-mem` · Apache-2.0 · 2026-10-13 | Session capture through 4 hooks | `npx claude-mem install` | **REJECT** (unchanged) | Captures every prompt and tool call; duplicates native memory |
| Find-Skills | `vercel-labs/skills` · MIT · 2026-10-09 | The `npx skills` installer and its `find` command | Telemetry to skills.sh by default | **REJECT** as an install path | See the cross-cutting finding |

### Design skills
| Candidate | Source · licence · last push | Install / network / telemetry | Decision | Reason |
|---|---|---|---|---|
| Taste Skill | `Leonxlnx/taste-skill` · MIT · 2026-10-14 | `npx skills`; README carries API-key referral promotions | **DEFER** | Art-direction prompts; CORE needs consistency with its existing tokens more than a new direction |
| Impeccable | `pbakaus/impeccable` · Apache-2.0 · 2026-10-15 | Every new design calls `impeccable.style`, and anonymous telemetry is on unless opted out | **REJECT** | Sends design activity to a third-party service by design |
| UI UX Pro Max | `nextlevelbuilder/ui-ux-pro-max-skill` · MIT · 2026-10-15 | CLI `init`, Python scripts, a large rules database; a paid "Premium" tier exists | **DEFER** | Generic industry rules; heavy context. Its accessibility checklist overlaps WCAG, which CORE already targets |
| Awesome DESIGN.md | `VoltAgent/awesome-design-md` · MIT · 2026-10-14 | Markdown only | **ADAPT** (format only) | Collections of other brands' design analyses. CORE must not imitate another brand; only the `DESIGN.md` format idea is used (`docs/DESIGN.md`) |

### Browser automation
| Candidate | Source · licence | Decision | Reason |
|---|---|---|---|
| Playwright CLI / MCP | `microsoft/playwright-cli`, `microsoft/playwright-mcp` · Apache-2.0 | **EXPERIMENT** (founder approval) | CORE's dependency-free CDP/BiDi audits now pass in Chromium and Firefox. Playwright's real gain is **WebKit**, the only untested engine. It needs an npm package plus browser downloads (user cache, about 100–200 MB), so it requires founder approval. Its WebKit is close to Safari, but not identical |

### 3D and motion
| Candidate | Source · licence | Decision | Reason |
|---|---|---|---|
| img2threejs | `img2threejs/img2threejs` · Apache-2.0 | DEFER | CORE renders with MapLibre custom layers, not Three.js; image-to-model reconstruction risks implying measured geometry |
| Motion | `motiondivision/motion` · MIT | DEFER | No animation need that CSS transitions plus `prefers-reduced-motion` do not cover |
| GSAP | `greensock/GSAP` · proprietary no-charge licence (not OSI) | REJECT | Licence terms; no need |
| Lottie | `airbnb/lottie-web` · MIT · last push 2025-09-01 | DEFER | Slowing maintenance; decorative |
| Remotion | `remotion-dev/remotion` · company licence required above a team-size threshold | REJECT | Possible paid licence; video rendering is not runtime |
| Hyperframes | `heygen-com/hyperframes` · Apache-2.0 | DEFER | Video rendering for explainers; not runtime; 40 skills |
| Motion Design Skill | `LottieFiles/motion-design-skill` · 20 Markdown files | ADAPT | Timing, easing and reduced-motion principles, written into `docs/DESIGN.md` |
| Claude Motion Skill | `Hype-yolo/claude-motion-skill` · MIT · 67 stars, 3,198 files | REJECT | Low adoption, large surface, no CORE need |

### Other
| Candidate | Finding | Decision |
|---|---|---|
| Katana | `projectdiscovery/katana` (MIT) is a web crawler. **Its link to "Claude Opus" in the screenshot is UNVERIFIED** | REJECT for CORE: crawling third-party sites conflicts with FD09 and with the rule against intrusive testing |

**Adopted:** one project-local skill written for CORE (`.claude/skills/core-browser-audit/`), with no third-party text or code. Its description costs about 50 tokens per session. **Rollback:** delete the folder. **Installed third-party tools: none.**
