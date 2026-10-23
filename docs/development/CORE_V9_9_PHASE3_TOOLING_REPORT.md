# CORE V9.9 — Phase 3 developer tools, skills and MCP review

Review date: 2026-10-21. Verified worktree: `~/core/.core-local/worktrees/v9.8`; branch `v9.9/multilingual-text-first`; clean starting HEAD `6a91287`. Phase 2 and its application are preserved. This phase changes developer skills, a local verification script/manifest and documentation only. No application/UI/language/AI/schema change, HQ/Beta Lab modification, push or deployment.

## Outcome and verification boundary

Installed **two OpenAI security skills** and **Gitleaks CLI 8.30.1** project-locally. Exposed and clarified the existing CORE browser-audit skill for both clients. No global configuration change, MCP activation, OAuth login, new account, paid service, model download, multi-agent framework, package lifecycle script or remote-shell installer. Public source downloads used no GitHub token. Normal existing CLI runtime caches are distinct from settings; recorded global/project settings remain byte-identical.

New setup commit: **`9826762`** (`chore(v9.9): add pinned local security skills and tool verification`). A documentation checkpoint follows; its exact hash is in the final Git log. The Phase 2 90-point audit remains **65 PASS / 0 FAIL / 11 PARTIAL / 4 N/A / 10 NOT VERIFIED**; developer-tool availability does not close human/device/legal release gates.

Status meanings:

- **INSTALLED AND VERIFIED**: the stated installation plus a harmless functional check, within its explicit scope.
- **INSTALLED BUT UNVERIFIED**: files/binary exist but the relevant function has not passed.
- **AVAILABLE BUT NOT CONFIGURED**: an authoritative tool/catalog exists; not evidence of a local install/connection.
- **REQUIRES APPROVAL**: concrete external-data/credential/account/action scope must be authorized before activation; nothing activated here.
- **DEFERRED**: source/fit reviewed, but permissions, overlap, dependencies, workflow conflicts or review gaps prevent adoption now. Not a malware accusation.
- **REJECTED**: current policy fails (for example required paid API or unverifiable source/license); no installation.

“Skill format”, “MCP capable” and “documented” below describe source/documentation compatibility, **not** a live integration test. Maintainers are repository owners/licensors, not inferred personal identities. Metadata push dates are maintenance signals, not proof of security or a release date. Repository-head package versions below are not assertions that that version was installed or published to npm.

## Installed and existing tools

| Tool | Official source / maintainer | Intended use | Codex compatibility | Claude Code compatibility | Installation status | Verification evidence | Cost | Permissions | Recommended usage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| security-best-practices | [OpenAI skill](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices), Apache-2.0 | Focused language/framework security review | Native project discovery passed | Native project discovery passed | INSTALLED AND VERIFIED | Exact source pin, 18 upstream files across both skills; metadata discovery; hash/entry/reference checks | No tool fee; ordinary agent credits when invoked | Text only; no hooks, MCP, credentials or new grants | Explicit request, relevant references only; JS guidance fits CORE; do not invent a framework |
| security-threat-model | [OpenAI skill](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-threat-model), Apache-2.0 | Assets/boundaries/abuse paths | Native project discovery passed | Native project discovery passed | INSTALLED AND VERIFIED | Same exact pin; required templates resolve; no paid model invocation used to test | No tool fee; normal agent credits | Read scoped source, write a requested report; no independent authority | Explicit threat-model requests; validate unresolved assumptions with the founder |
| Gitleaks CLI 8.30.1 | [Gitleaks release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1), MIT | Offline secret detection | Shell invocation tested | Same binary via shell | INSTALLED AND VERIFIED | Official asset digest + checksum match; version; clean=exit 0; synthetic secret=exit 1; 100% redaction | Free local CLI; no account/key or new Action/service | Bounded stdin scan under current sandbox; no network/daemon | Supplement existing integrity gate; never disable its controls or upload findings |
| CORE browser-audit skill | [Local skill](../../.claude/skills/core-browser-audit/SKILL.md), existing CORE instructions | Browser/a11y/performance workflow | New project entry discovered | Existing entry discovered | INSTALLED AND VERIFIED | Both native clients list it; entry bytes match | Existing tools; no new fee | Only disposable profiles/own loopback servers, scope per task | V9.9 public scripts now distinguished from legacy corridor scripts; no automatic full runs |
| Codex CLI 0.163.0 | [OpenAI Codex](https://github.com/openai/codex), existing install | Coding client | Native | Not a Claude plugin | INSTALLED AND VERIFIED | Version/help and native app-server skills/list; no model turn | Existing provider/plan; no new inference charge | Existing policy/provider/settings unchanged | Start in verified worktree; project skills, no global config edits |
| Claude Code 2.1.306 | [Anthropic docs](https://code.claude.com/docs/en/overview), existing install; product terms apply | Coding client | Separate CLI | Native | INSTALLED AND VERIFIED | Version/help and SDK initialize lists all three project skills; no user/model turn | Existing provider/plan; no new inference charge | Fresh probe configuration mirrored only the already-accepted CORE trust bit; no credentials copied | Start in verified worktree; do not bootstrap an orchestration suite |
| Playwright Core 1.63.0 | [Microsoft Playwright](https://github.com/microsoft/playwright), Apache-2.0 | Isolated Chrome automation | Shell/library | Shell/library | INSTALLED AND VERIFIED | Existing version/import; isolated browser keyboard/click smoke | Free library | Own browser only; synthetic test blocked page requests | Reuse existing installation/scripts, no extra browser MCP needed |
| axe-core 4.10.2 | [Deque axe-core](https://github.com/dequelabs/axe-core), MPL-2.0 | Automated accessibility checks | Existing browser scripts | Existing browser scripts | INSTALLED AND VERIFIED | Import + Chrome fixture: 15 passing rules, zero violations | Free test library | Page DOM in own browser; no service | Automated findings only; incomplete/manual checks remain explicit |
| GitHub CLI 2.102.0 | [GitHub CLI](https://github.com/cli/cli), MIT | GitHub workflows when authorized | Shell | Shell | INSTALLED AND VERIFIED | Local version/help only; account/API access not exercised | CLI free; account/API/Actions limits separate | Existing credentials were not read or changed | Prefer existing CLI for narrow future operations; no push in this phase |
| Vercel CLI 63.1.2 | [Vercel CLI](https://github.com/vercel/vercel), Apache-2.0 package | Hosting diagnostics when authorized | Shell | Shell | INSTALLED AND VERIFIED | Version only, telemetry/update opt-out environment for that command; no account call | CLI free; hosting usage may bill | No hosting token/login/deploy operation | Installed binary is not production authorization; MCP stays unconfigured |
| Firefox 122 / SafariDriver | Existing OS applications, vendor terms | Cross-browser checks | Existing scripts | Existing scripts | INSTALLED AND VERIFIED (Firefox Phase 2); INSTALLED BUT UNVERIFIED (Safari automation) | Firefox Phase 2 48/48, not repeated; Safari Remote Automation still disabled | No new fee | Never personal profiles; founder-only Safari setting unchanged | Current Firefox/Safari/device release acceptance remains outstanding |
| Ponytail / system skills / host apps | Existing Codex config/cache and host skill catalog | Minimal coding, skill management, official docs | Already available | Native equivalents not assumed | AVAILABLE BUT NOT CONFIGURED for new CORE integrations | Existing Ponytail declaration/cache 5.3.2; system skill-installer/OpenAI Docs; host tools are not CORE MCP registrations | Existing agent credits/host terms | Global settings/cache inventory read, no change or new grant | Keep current one-agent workflow; host app exposure does not establish connected-account permission |

## Named candidates and other inventory recommendations

Each source below was resolved against the owner’s repository or provider documentation. README/license/package metadata were reviewed; uninstalled executable/transitive code was **not** comprehensively audited. No npm/pip/skills CLI or remote shell was executed for these candidates.

| Tool | Official source / maintainer | Intended use | Codex compatibility | Claude Code compatibility | Installation status | Verification evidence | Cost | Permissions | Recommended usage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Superpowers | [obra/superpowers](https://github.com/obra/superpowers) / obra | Engineering workflows | Skill format; full bootstrap not tested | Native plugin, untested | DEFERRED | MIT; selected texts reviewed | OSS; normal/model-worker credits | Hooks, workflow overrides, optional agents | Full verification-every-message rule conflicts with CORE test reuse; no framework bootstrap |
| Karpathy Skills | [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) / multica-ai | Concise coding guidelines | Text-compatible | CLAUDE.md guidance | REJECTED | Redirect to multica-ai; repository license not established | No service required | Would add overlapping instructions | Not maintained by Karpathy; no copying without a verified license; Ponytail already covers the useful principles |
| VibeWise | [nykooi1/vibe-wise](https://github.com/nykooi1/vibe-wise) / nykooi1 | Learning-first coding | Documented native plugin | Documented native plugin | DEFERRED | MIT; README supports both clients | OSS; existing model credits | Learning notes, hooks, repeated design questions | Opt-in educational workflow only; conflicts with current action-first preference |
| Council of High Intelligence | [0xNyk/council-of-high-intelligence](https://github.com/0xNyk/council-of-high-intelligence) / 0xNyk | Multi-persona deliberation | Documented Codex installer | Documented Claude installer | DEFERRED | MIT; installers/rosters described | OSS; multiple model calls | Agent subprocesses, scripts/config changes | Single-agent policy and token budget outweigh this bundle; do not auto-enable |
| Oh My Claude Code | [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) / Yeachan-Heo | Agent orchestration | Codex child CLI; separate oh-my-codex project | Native orchestrator | DEFERRED | MIT; README/package reviewed | OSS; multiplied provider usage | Hooks, tmux workers, provider calls | No autonomous orchestration enabled; npm package name is oh-my-claude-sisyphus |
| ECC by affaan-m | [affaan-m/ECC](https://github.com/affaan-m/ECC) / affaan-m | Multi-harness engineering suite | Documented native path | Documented native path | DEFERRED | MIT; canonical repo is now affaan-m/ECC | OSS free; hosted Pro optional | Installer, hooks, agents, broad workflow changes | Do not run setup wizard; selective future extraction needs review, not a bundle install |
| Agent Skills — Vercel collection | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) / vercel-labs | Framework/design/deployment guides | Skill format | Skill format | DEFERRED | Repository-wide license not established by checked files | Guides may be free; deployment may bill | Some skills run scripts or publish artifacts | Not a single universal plugin; do not install deployment skills or infer a license |
| Agent Skills — Anthropic collection | [anthropics/skills](https://github.com/anthropics/skills) / anthropics | Reusable skills/spec examples | Standard format; per-skill fit required | Native format | AVAILABLE BUT NOT CONFIGURED | Many Apache-2.0 skills; document skills source-available | Per-skill; services/model usage separate | Varies by selected scripts/skill | Review each directory/license; no blanket catalog install. Existing system skill-creator remains available |
| Cloudflare Security Audit Skill | [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) / cloudflare | Source-grounded security auditing | Agent-neutral guidance | Agent-neutral guidance | DEFERRED | MIT; exact commit/text reviewed | OSS; full audit can be token-heavy | Full audit requires independent agents and strict execution sandbox | No six-phase framework activation; use installed focused security skills; future guidance-only setup needs scoped review |
| Playwright MCP | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) / microsoft | Interactive browser tools | Documented MCP | Documented MCP | DEFERRED | Apache-2.0; source package 0.0.83, Node >=18 | Local package free | Browser navigation, page data, files/network | Existing Playwright/Core scripts suffice; browser MCP is not an isolation/security boundary |
| Chrome DevTools MCP | [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) / ChromeDevTools | Interactive traces/debugging | Documented MCP | Documented MCP | DEFERRED | Apache-2.0; source package 1.11.0; Node 22.20 meets engine | Local package free; CrUX external | Browser data/control; default telemetry, CrUX, update checks | Concrete future trace benefit, but existing CDP suffices now; require reviewed pin and opt-outs before activation |
| Context7 | [upstash/context7](https://github.com/upstash/context7) / upstash | Version-specific library documentation | MCP transport supported | MCP transport supported | REQUIRES APPROVAL | MIT; official remote endpoint and optional free key documented | Rate-limited access; paid tiers not enabled | Queries/library identifiers leave the machine | Best first remote candidate: public-library questions only, manual invocation, no project snippets; proposal below |
| GitHub MCP | [github/github-mcp-server](https://github.com/github/github-mcp-server) / github | Repository/PR metadata | Documented MCP | Documented MCP | REQUIRES APPROVAL | MIT; official GitHub server | No new tool fee established; existing account/limits apply | OAuth/PAT, repository contents/actions | Keep existing gh CLI; approve exact repo, read-only scope/tool list before any MCP login |
| Vercel MCP | [Vercel](https://vercel.com/docs/agent-resources/vercel-mcp) | Hosting diagnostics | Officially documented | Officially documented | REQUIRES APPROVAL | Official Vercel hosted service; no OSS server license assumed | Account/plan-dependent; possible resource billing | OAuth can confer the user account’s project/deployment access | No production access. Prefer founder-operated/read-only diagnostics; template is not an authorization |
| Supabase MCP | [supabase/mcp](https://github.com/supabase/mcp) / supabase | Database development/inspection | MCP transport supported | MCP transport supported | REQUIRES APPROVAL | Canonical supabase/mcp; Apache-2.0 | Account/plan-dependent; possible database/branch charges | OAuth/PAT, data and SQL/schema access | No live CORE DB exists in verified release scope. Require dev project_ref, read_only, narrow feature groups; no schema changes |
| Perplexity | [perplexityai/modelcontextprotocol](https://github.com/perplexityai/modelcontextprotocol) / perplexityai | Web research | Documented MCP | Documented MCP | REJECTED | MIT server; API key required | [Metered API](https://docs.perplexity.ai/docs/getting-started/pricing), not a guaranteed free local workflow | External queries and API credentials | Existing web search suffices; consumer free/Pro plans do not prove free API use |
| Firecrawl — keyless route | [firecrawl/firecrawl-mcp-server](https://github.com/firecrawl/firecrawl-mcp-server) / firecrawl | Search/scrape/parse | Official docs support Codex | Official docs support Claude Code | REQUIRES APPROVAL | MIT; official docs now offer keyless limited tools | Daily-limited keyless tier; full API may bill | Target URLs/query data sent to Firecrawl | Corrects prior paid-only assumption; no account needed for limited route, but external transfer still needs approval |
| PostHog | [PostHog/posthog](https://github.com/PostHog/posthog) / PostHog | Analytics/observability operations | Official client docs | Official client docs | REQUIRES APPROVAL | Old PostHog/mcp archived; current services/mcp in monorepo; mixed repository license | Free tiers/paid usage depend on service plan | Analytics/customer data, feature flags, credentials | No CORE tracking added. No instrumentation or production account access authorized |
| Composio | [ComposioHQ/composio](https://github.com/ComposioHQ/composio) / ComposioHQ | Cross-service automation | SDK/MCP integration possible, untested | SDK/MCP integration possible, untested | REQUIRES APPROVAL | MIT SDK; remote connector service terms separate | Quotas/plans and downstream API charges | OAuth broker and actions across connected apps | No account creation or connection; approve each app, data flow and action scope separately |
| Graphify | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) / Graphify-Labs | Local code knowledge graph | Documented project install | Documented project install | DEFERRED | Apache-2.0; Python >=3.12/tool environment documented | Code AST local/free; semantic extraction uses model credits | Broad indexing, generated state; optional external semantic pass/agents | Do not claim token savings. Needs isolated Python/dependency review, code-only scope and no semantic/parallel/global setup |
| Bloxks | Unresolved; no URL invented | Unresolved recommendation | Unknown | Unknown | REJECTED | No authoritative matching source identified in bounded search | Unknown | Unknown | No invented repo/package or installation. A precise founder-provided source could reopen review |
| ScrapeGraphAI | [ScrapeGraphAI/Scrapegraph-ai](https://github.com/ScrapeGraphAI/Scrapegraph-ai) / ScrapeGraphAI | LLM-assisted extraction | CLI/library callable; no native plugin assumed | CLI/library callable; no native plugin assumed | DEFERRED | MIT local library; hosted API separate | Local route needs an available model; cloud API paid | Site contents and prompts; browser dependencies | Default Python 3.9 and absent Ollama do not establish a working free setup. No scraper/model/browser downloads |
| Claude-Mem | [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) / thedotmack | Persistent agent memory | Adaptation not verified | Documented Claude plugin | DEFERRED | Current repository declares Apache-2.0 | OSS; summarization/model costs may apply | Hooks, persistent conversation stores, services | Retention/privacy and repeated context costs need explicit design; not installed |
| OmniRoute | [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute) / diegosouzapw | Model gateway/routing | Can route client traffic; not tested | Can route client traffic; not tested | DEFERRED | MIT; official source reviewed | Free software is not free provider inference | Prompt/credential routing, local service, fallback providers | No provider changes, account creation or routing through unapproved processors |
| Ruflo | [ruvnet/ruflo](https://github.com/ruvnet/ruflo) / ruvnet | Orchestration/memory | Provider integration, untested | Documented agent suite | DEFERRED | MIT repository | OSS; provider/runtime costs separate | Agents, persistent memory and hooks | Do not enable alongside existing tools; single-agent policy remains |
| Claude Octopus — nyldn | [nyldn/claude-octopus](https://github.com/nyldn/claude-octopus) / nyldn | Multi-model coordination | Codex integration, not standalone parity | Native Claude plugin | DEFERRED | MIT; source package 11.14.2 | Multiple providers/model calls | Shell orchestration, agent processes, hooks | Separate from xiaolai’s same-name project; no framework activated |
| Claude Octopus — xiaolai | [xiaolai/claude-octopus](https://github.com/xiaolai/claude-octopus) / xiaolai | Spawn Claude agents via MCP | MCP compatible in principle | Agent subprocess/MCP | DEFERRED | ISC repository | Claude/model use multiplies costs | Spawns code agents and inherits their access | Different maintainer/product; incompatible with current single-agent scope |
| Apify | [apify/apify-mcp-server](https://github.com/apify/apify-mcp-server) / apify | Actor/crawling automation | MCP capable | MCP capable | REQUIRES APPROVAL | MIT MCP wrapper | Actor/platform credits; possible billing | API token, external data retrieval/processing | No actors run; each source/use must meet CORE’s data-authorization policy |
| Resend | [resend/resend-mcp](https://github.com/resend/resend-mcp) / resend | Email automation | Documented MCP | Documented MCP | REQUIRES APPROVAL | Canonical resend/resend-mcp; MIT | Free quotas/paid sending depend on account | OAuth/API key, recipients/messages, send actions | No messages sent or accounts/domains configured; sending always needs explicit task authorization |
| Notion | [makenotion/notion-mcp-server](https://github.com/makenotion/notion-mcp-server) / makenotion | Workspace documentation | MCP capable | MCP capable | REQUIRES APPROVAL | MIT local server; hosted service separately controlled | Workspace/plan dependent | OAuth/token, page data and write permissions | No account or workspace connected; sharing/write scope must be approved |
| FFmpeg | [FFmpeg/FFmpeg](https://github.com/FFmpeg/FFmpeg) / FFmpeg | Local media utilities | Shell callable | Shell callable | DEFERRED | Mainly LGPL; optional GPL; canonical project at ffmpeg.org | Local software free; build/codec licenses vary | Local media/files/network/capture when requested | Not in PATH; no media deliverable here. Review chosen binary/build licenses before future install |
| Whisper | [openai/whisper](https://github.com/openai/whisper) / openai | Local transcription | Shell/Python callable | Shell/Python callable | DEFERRED | MIT repository | Local inference free after model download; compute cost | Audio files, model weights, Python/FFmpeg dependencies | Not in PATH; no model downloads or recording. No change to CORE microphone/answer behavior |
| yt-dlp | [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) / yt-dlp | Authorized media retrieval | Shell callable | Shell callable | DEFERRED | Core Unlicense; bundled components vary | Local tool free; source access terms separate | Network/media/cookies if explicitly supplied | Not in PATH; never bypass access restrictions or ingest content without source/use authorization |
| SUMO/netconvert | [eclipse-sumo/sumo](https://github.com/eclipse-sumo/sumo) / eclipse-sumo | Traffic simulation | Shell callable | Shell callable | DEFERRED | EPL-2.0 plus dependency licenses | Local software free; compute/storage costs | Local input/output; long-running simulation | Not in PATH; no new simulation or toolchain download during developer setup |

## Maintenance, licensing and installation provenance

Fetched official repository metadata/READMEs/licenses during this phase; snapshots are private local evidence. All successfully resolved repositories below were **not archived** at retrieval. An SPDX “unknown” is not permission to redistribute. Package installers mentioned here are upstream methods **not executed** by this phase; any future install must use a reviewed exact version/commit and lifecycle policy, not an unpinned one-line command.

| Source | License evidence | Last repository push (UTC date) | Upstream installation approach / caveat |
| --- | --- | --- | --- |
| [0xNyk/council-of-high-intelligence](https://github.com/0xNyk/council-of-high-intelligence) | MIT | 2026-10-19 | install.sh with client flags/custom targets; reviewed documentation only |
| [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) | Apache-2.0 | 2026-10-21 | npm chrome-devtools-mcp; disable telemetry/CrUX/update checks if later approved |
| [ComposioHQ/composio](https://github.com/ComposioHQ/composio) | MIT | 2026-10-21 | composio Python / @composio/core SDK and remote connector setup |
| [FFmpeg/FFmpeg](https://github.com/FFmpeg/FFmpeg) | Mainly LGPL with optional GPL, chosen build/component dependent | 2026-10-21 | Official project/build or reviewed OS package; GitHub is its official mirror, canonical source at code.ffmpeg.org |
| [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | Apache-2.0 | 2026-10-21 | graphifyy Python package; project flag exists, but default semantic/parallel behavior needs scoping |
| [PostHog/posthog](https://github.com/PostHog/posthog) | MIT Expat outside ee/ and third-party exclusions; separate enterprise terms | 2026-10-21 | Current services/mcp; hosted endpoint/official wizard; archived old repo is not the maintained server |
| [ScrapeGraphAI/Scrapegraph-ai](https://github.com/ScrapeGraphAI/Scrapegraph-ai) | MIT | 2026-10-06 | scrapegraphai Python package plus browser and an available model; managed API separate |
| [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) | MIT | 2026-10-21 | Claude plugin + npm oh-my-claude-sisyphus; separate Codex product |
| [affaan-m/ECC](https://github.com/affaan-m/ECC) | MIT | 2026-10-20 | ECC client plugin/ecc-universal wizard; hosted Pro not required for OSS |
| [anthropics/skills](https://github.com/anthropics/skills) | Many Apache-2.0; document skills source-available; per-directory review | 2026-10-09 | Selected directory/plugin; individual license matters |
| [apify/apify-mcp-server](https://github.com/apify/apify-mcp-server) | MIT | 2026-10-21 | Hosted MCP/local npm server; platform actor/token costs require review |
| [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) | MIT | 2026-09-14 | Skills CLI/directory; full mode needs agents and strict OS execution isolation |
| [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute) | MIT | 2026-10-21 | Client plugin/CLI integration in README; no installer executed |
| [eclipse-sumo/sumo](https://github.com/eclipse-sumo/sumo) | EPL-2.0 | 2026-10-21 | Official binary/package/source; review build/dependencies before a simulation task |
| [firecrawl/firecrawl-mcp-server](https://github.com/firecrawl/firecrawl-mcp-server) | MIT | 2026-10-21 | Keyless hosted URL or firecrawl-mcp; paid/full route separate |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | Not established in inspected repository metadata/root files | 2026-04-20 | Guideline/CLAUDE.md copy; canonical redirect recorded, no overwrite |
| [github/github-mcp-server](https://github.com/github/github-mcp-server) | MIT | 2026-10-21 | Official hosted MCP or local binary/container; credentials/scopes required |
| [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) | MIT | 2026-09-30 | Pinned official standalone release binary; no Homebrew/Docker/Action or installer used |
| [makenotion/notion-mcp-server](https://github.com/makenotion/notion-mcp-server) | MIT | 2026-09-20 | Official hosted MCP or local server; workspace grant required |
| [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Apache-2.0 | 2026-10-19 | npm @playwright/mcp; browser/profile provisioning would also need review |
| [nykooi1/vibe-wise](https://github.com/nykooi1/vibe-wise) | MIT | 2026-10-09 | Client plugin marketplace; both-client instructions exist |
| [nyldn/claude-octopus](https://github.com/nyldn/claude-octopus) | MIT | 2026-10-21 | Client plugin/CLI integration in README; no installer executed |
| [obra/superpowers](https://github.com/obra/superpowers) | MIT | 2026-10-21 | Client plugin/bootstrap or selected skill directories; no bootstrap executed |
| [openai/skills](https://github.com/openai/skills) | Selected installed directories: Apache-2.0 LICENSE.txt (no blanket root-license claim) | 2026-09-08 | Selected directories via existing skill-installer at pinned commit; installed two only |
| [openai/whisper](https://github.com/openai/whisper) | MIT | 2026-08-31 | Python package/source plus model weights and FFmpeg; no remote transcription API required for local route |
| [perplexityai/modelcontextprotocol](https://github.com/perplexityai/modelcontextprotocol) | MIT | 2026-10-19 | @perplexity-ai/mcp-server or hosted URL; required API key |
| [resend/resend-mcp](https://github.com/resend/resend-mcp) | MIT | 2026-10-21 | Hosted MCP or resend-mcp package; canonical repo redirect recorded |
| [ruvnet/ruflo](https://github.com/ruvnet/ruflo) | MIT | 2026-10-21 | Client plugin/CLI integration in README; no installer executed |
| [supabase/mcp](https://github.com/supabase/mcp) | Apache-2.0 | 2026-10-21 | Official hosted MCP or local stack; canonical redirect to supabase/mcp |
| [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | Apache-2.0 | 2026-10-21 | Client plugin/CLI integration in README; no installer executed |
| [upstash/context7](https://github.com/upstash/context7) | MIT | 2026-10-21 | Hosted MCP URL or @upstash/context7-mcp; monorepo root version is not the MCP version |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | Repository-wide license not established | 2026-10-14 | Skills CLI or selected directory copy; individual license must be established |
| [xiaolai/claude-octopus](https://github.com/xiaolai/claude-octopus) | ISC | 2026-10-21 | Client plugin/CLI integration in README; no installer executed |
| [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) | Unlicense | 2026-10-21 | Official release binary/Python package; bundled component licenses differ |

Vercel’s hosted MCP has no public server commit/license established here; provider-maintained docs and account terms govern it. PostHog’s old [PostHog/mcp](https://github.com/PostHog/mcp) was archived on 2026-01-19 and points to [services/mcp](https://github.com/PostHog/posthog/tree/master/services/mcp). Its current server/runtime and service plan were not executed or authenticated. “Bloxks” remains unidentified after bounded exact-name searches; maintainer/license/installation/cost/compatibility are all **NOT VERIFIED**, so it fails the installation policy.

Resolved renames: `forrestchang/andrej-karpathy-skills` → `multica-ai/andrej-karpathy-skills`; `affaan-m/everything-claude-code` → `affaan-m/ECC`; `supabase-community/supabase-mcp` → `supabase/mcp`; `resend/mcp-send-email` → `resend/resend-mcp`. Council, OMC, ECC, Ruflo and the two distinct Claude Octopus projects are not interchangeable. No celebrity endorsement, official integration or shared license is inferred from a name.

## Exact local installations and invocation

The two upstream skill directories are pinned to OpenAI commit **`49f948faa9258a0c61caceaf225e179651397431`** (commit date 2026-06-24; repository push metadata later). Their Apache-2.0 LICENSE.txt files are preserved. No upstream instructions/reference bytes were edited. Canonical directories:

- `.agents/skills/security-best-practices/`
- `.agents/skills/security-threat-model/`

Claude discovers regular SKILL.md entry copies under `.claude/skills/<name>/`; reference/license/interface files are relative **file** symlinks to the canonical directories, all confined to this worktree. Codex missed the symlinked browser SKILL.md in a probe, so entry files are regular copies. Current macOS file-symlink support is verified; other platforms need an explicit checkout/link check. The existing browser skill now has a matching regular entry in `.agents/skills/core-browser-audit/`; its guidance distinguishes current V9.9 public-page checks from legacy corridor checks. No hook, new model/provider, allowed-tools grant, auto-update or framework bootstrap was installed.

Use in a new turn/session (restart a running CLI if discovery is stale):

| Purpose | Codex | Claude Code |
| --- | --- | --- |
| Scoped security review | `$security-best-practices` followed by the approved path/question | `/security-best-practices` followed by the approved path/question |
| Threat model | `$security-threat-model` followed by scope/context | `/security-threat-model` followed by scope/context |
| Browser verification | `$core-browser-audit` and the affected public pages | `/core-browser-audit` and the affected public pages |
| Offline installation check | `node scripts/verify-developer-tools.mjs` via shell | Same shell command |
| Bounded staged-content secret scan | Command below via shell | Same shell command |

These skills are instructions, not new model runtimes or authorization to change application code. User instructions and AGENTS.md still govern. Load matching references on demand; do not read the entire cross-language catalog into every task. No token-savings percentage was measured or claimed. Threat modeling can request missing human context; it cannot invent approval.

```sh
# No upload and no history/parent-worktree scan; retain existing hooks as the required gate.
git diff --cached --no-ext-diff | .core-local/developer-tools/gitleaks/8.30.1/gitleaks stdin --no-banner --redact=100
node scripts/verify-developer-tools.mjs
```

Gitleaks location: **`.core-local/developer-tools/gitleaks/8.30.1/gitleaks`** (ignored, macOS arm64 only). Official asset `gitleaks_8.30.1_darwin_arm64.tar.gz`, SHA-256 **`b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5`**. The GitHub release asset digest and separately fetched release checksum file matched before extraction. Only the binary and MIT LICENSE were extracted; no installer ran. The installed binary’s digest is recorded in [the tooling lock](CORE_V9_9_TOOLING_LOCK.json), and verification refuses to execute a changed binary. No independent signature/attestation review is asserted. The CLI license is distinct from any optional hosted product/GitHub Action.

The binary is ready on this machine, but is not committed or published. A fresh clone/another platform must restore the matching reviewed official binary/license and verify the pin before use; it must not silently fetch a “latest” replacement. To restore skill files, prefer Git checkout of this checkpoint; the existing system skill-installer supports `--ref <exact-commit> --dest .agents/skills --method download` for missing directories and refuses to overwrite existing ones. Do not run it against global skill folders for this setup.

Existing Playwright: `~/core/.core-local/v8/pw/node_modules/playwright-core` **1.63.0**; set `NODE_PATH` to that node_modules directory when using the CORE browser scripts. Existing axe: `.core-local/a11y-tools/node_modules/axe-core` **4.10.2**. These dependencies were **not reinstalled**. Use only browsers started for the task; never personal profiles or founder ports 8788/9222. Safari settings remain founder-controlled. No browser package, WebKit download or optional model/audio stack was installed.

## Inactive MCP setup proposals — approval is the final activation step

No `.mcp.json`, `.codex/config.toml`, OAuth grant or new global registration was written. Templates below are **documentation only**. Placing an HTTP server into an active Claude MCP file can start connections on next launch; documentation is deliberately kept outside client-discovery paths.

Both clients support project scope: [Codex configuration](https://developers.openai.com/codex/mcp) uses trusted project `.codex/config.toml`; [Claude project MCP](https://code.claude.com/docs/en/mcp) uses `.mcp.json`. Their CLI add defaults must not be assumed to be project-scoped; do not use a command that edits global settings. Credentials, if later approved, belong in a private credential mechanism/environment, never committed JSON/TOML or URL parameters.

**First proposed remote integration: Context7, public documentation only.** Official endpoint `https://mcp.context7.com/mcp`. Queries/library identifiers leave the machine; no project files, secrets, personal data or private code snippets may be sent under this proposal. No account/key, paid upgrade or automatic invocation is included. The README recommends an API key, while the [API guide](https://context7.com/docs/api-guide) mixes authentication-required wording with no-key rate limits and the [CLI guide](https://context7.com/docs/clients/cli) requires login for hosted setup. Anonymous MCP availability is therefore **not established operationally**. No account creation is included: if a no-credential/free connection is unavailable, keep it inactive. After founder approval, verify current free access and tools/list, restrict to library resolution/document queries actually advertised, and retain normal per-action controls. A safe default is no registered server until approval, not a hidden background fetch.

```toml
# Proposal for a future project .codex/config.toml, only after approval.
[mcp_servers.core_context7]
url = "https://mcp.context7.com/mcp"
enabled = false
# Enable only after scope/free-access review and explicit authorization.
```

```json
{
  "mcpServers": {
    "core-context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

The Claude example would connect if copied into active configuration; it has **not** been copied. Codex’s disabled template is not an active installation either. Remote tool responses remain untrusted data; a docs tool cannot authorize edits, installs, credential access or deployment.

Other activation proposals:

| Integration | Concrete future boundary | Approval/setup still required |
| --- | --- | --- |
| GitHub MCP | Official hosted/local server, only the named CORE repository, read-only tools/credential scopes; preserve normal approvals | Founder chooses existing account and minimal access; verify server’s current read-only mode/tool names; do not replace gh or grant broad repo writes |
| Vercel MCP | Official `https://mcp.vercel.com`, one approved development project; only inspected read operations | [Vercel warns](https://vercel.com/docs/agent-resources/vercel-mcp) the connection gets the user account’s access. A client tool filter alone is not account isolation. No login until role/scope/production/billing boundaries are approved |
| Supabase MCP | `https://mcp.supabase.com/mcp?project_ref=<approved-development-project>&read_only=true` plus minimal feature groups | [Official options](https://supabase.com/docs/guides/ai-tools/mcp) support project scoping/read-only. No verified live CORE DB; no provisioning, SQL/schema write, branch creation or skipped confirmations |
| Firecrawl keyless | Official `https://mcp.firecrawl.dev/v2/mcp`, only rate-limited keyless search/scrape/parse of approved public sources | [Current docs](https://docs.firecrawl.dev/mcp-server) now support no-account access; approve URL/query transfer and data-source rights, inspect server surface, no key/full paid tools |
| Chrome DevTools MCP | Future reviewed exact package; only own disposable Chrome at an unused loopback port; no personal browser | Native pin/transitives/lifecycle review first; use `--no-usage-statistics`, `--no-performance-crux`, `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS=1`; no default telemetry/URL transfer. Existing CDP scripts remain preferred |
| PostHog / Composio / Apify / Resend / Notion | Each named existing development workspace/account, specific data and read/action boundary | Approve processor/retention/cost/credential scopes individually. No analytics instrumentation, automatic sending, actor jobs, account creation or production permissions authorized |

No proposal activates multiple agent frameworks. Superpowers/ECC/OMC/Council/Ruflo/Octopus remain uninstalled; Cloudflare full audit additionally needs independently scoped agents and stronger execution isolation. A future single-agent guidance subset could be reviewed separately. Graphify’s free local AST route is distinguished from model-based semantic extraction; no software or multi-agent/global setting was changed for it.

## Executed verification and evidence

Private ignored evidence: `.core-local/evidence/v99-phase3/`. It contains source/README/license snapshots, exact selected commits, installation records and harmless test results. It is not a portable Git artifact or evidence of connected service access. The portable manifest and offline verification script are committed.

| Check | Result / evidence |
| --- | --- |
| Correct worktree/branch/starting checkpoint | `v9.9/multilingual-text-first`, HEAD `6a91287`, initially clean |
| OpenAI skill installation | Existing trusted skill-installer, exact commit, project destination, no hooks/scripts executed; `skill-install.log` |
| Native Codex discovery | initialize → skills/list; all three project names, zero load errors; `codex-discovery.json`, `client-summary.json` |
| Native Claude discovery | SDK control initialize lists all three project commands; no user/model message; `claude-discovery.json`, `client-summary.json` |
| Discovery boundary | Codex used its normal runtime SQLite cache with no settings edit. Claude used an isolated configuration directory, project settings, no tools/MCP, no session persistence and only the founder’s **already-accepted** CORE trust bit; no auth credentials copied |
| Earlier discovery attempts | Codex missed the symlinked browser entry. Earlier Claude probes combining `--bare` and symlinked entries returned no project commands; final normal project discovery with regular entries succeeded. `claude plugin validate` expects a plugin manifest and rejected bare skill directories; this was not called a skill pass. Final native discovery supersedes those attempts |
| Offline installation verification | `node scripts/verify-developer-tools.mjs`: **38 pinned files**, matching client entries/browser skill, verified binary/version, positive+negative detection and full fixture redaction; `offline-verification-final.log` |
| Scanner functional check | Clean input exit **0**, generated never-issued test token exit **1**; token absent from logs/reports; `gitleaks-functional.json`, redacted reports |
| Existing Playwright/axe | Isolated Chrome **155.0.8059.85**, synthetic HTML, page requests aborted, Tab/Enter worked; axe **15 passing rules, zero violations**; `browser-smoke.log`. This is tooling compatibility, not a new CORE acceptance audit |
| Existing CLIs | Versions/help obtained; Vercel version command only with command-local telemetry/update opt-outs; `existing-libraries.log`, `vercel-version.log` |
| Existing security checks | Staged integrity hook passed without rule exceptions or bypass; CSP current; final full tracked-tree integrity and diff checks recorded at checkpoint |
| Configuration preservation | SHA-256 snapshots of global Codex config, global Claude settings/state JSON and existing project Claude settings remain equal; no active MCP files added |
| Application preservation | Scoped Git diff against `6a91287` contains only skills, the developer verification script/lock and documentation/checkpoints; no application/static-page/data/schema/production changes |

Native discovery verifies the installed client can parse/list these skills; it does not measure LLM compliance, quality or token savings. No billable nested coding session or paid API experiment was used. The offline script performs no network/model call; the synthetic browser test blocks page requests, which is not an OS-wide packet audit. CLI initialization was not a packet-level audit of all vendor background behavior; existing telemetry settings were not globally changed.

No repeat of the 316-test CORE suite, six-language browser matrix or 90-point security audit: no application change justified it. Those Phase 2 results remain **historical**, and tooling-file changes may invalidate the verifier’s broad non-Markdown tree fingerprint even though application content is unchanged. Do not claim a fresh runtime gate from these tool checks. Current Safari, physical microphone/models, manual contrast/screen-reader and human review gaps remain as recorded in Phase 2.

## Safe checkpoint

New work is local. No service login, push/deploy, HQ/Beta Lab operation or expensive agent framework was enabled. Own smoke-test browser closed; no persistent listener/profile or background server was left by these tests. Gitleaks and private evidence remain ignored locally, skills/manifest/verifier are committed, and the final documentation commit records the clean checkpoint. Future MCP activation requires separate explicit scope approval; this report is not that approval.
