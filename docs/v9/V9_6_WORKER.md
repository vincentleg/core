# V9.6 local agent worker

From the CORE repository, Node 22.20 or later:

```sh
npm ci --prefix scripts/intelligence
node scripts/intelligence/run.mjs --question "Your new Bay Area research question"
node scripts/intelligence/run.mjs --resume RUN_ID
```

Uses existing loopback Ollama `qwen3:8b`; override `--model`, `--provider ollama|openai-compatible-local`, `--endpoint http://127.0.0.1:PORT`. Model inference is real, not Codex subscription inference. No paid-provider fallback. `--publish` explicitly publishes **this question/run** to the public snapshot; omit it for private research. Review public outputs before deployment. Private memory, databases and conversation context are excluded from the static build.

One serial worker; 500 identities share it. A process lock prevents concurrent CLI workers. On abrupt termination, inspect the PID in `.core-local/intelligence/worker.lock`; remove only a confirmed stale lock before resuming. SQLite graph checkpoints persist between invocations. Model calls, tool decisions, errors, delegation and outputs are stored in `.core-local/intelligence/work.sqlite`. Read-only external tool calls interrupted before checkpoint completion may be retried; no interventions or side effects are authorized.

Per run: at most 48 model calls, 16 tasks, depth 3, 130,000 recorded tokens; 12 turns per specialist and 24 for the planner; 15-minute session and 120-second full-response inference timeout. Exhausted budgets do not reset on resume. Interrupted requests can have unknown token consumption; report that separately from returned usage. No unlimited polling, shell tool, unrestricted URL fetch or real-world action tool. Reviewer acceptance does not substitute for independent scientific validation or human authorization. Claim checks enforce references and numerical support; they do not prove every natural-language claim.

No hosted worker or public submission API exists. The website displays a dated, manually published execution record and says hosted workers are offline. Continuous work requires an authorized persistent machine/service, scheduler, authentication, monitoring and agreed resource limits. No infrastructure or billing was enabled.

Geography rebuild (two official sources, bounded requests; cached responses reused):

```sh
node scripts/intelligence/geography.mjs
```

Sixteen municipal responsibilities are not complete Bay Area data coverage. Walkers stay within disconnected known pedestrian components; no routes connect cities across the Bay. Assignment weights use square-root Census land area and a documented SF evidence/mission multiplier, not invented population. Numerical models remain SF approach-level exploratory calculations with assumed traffic inputs. News ingestion, validated traffic counts, calibration and citywide forecasts remain absent.
