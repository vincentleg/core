# V9.8 registered tools

Authoritative JSON schemas and deterministic validation: [`src/intelligence/core/tools.mjs`](../../src/intelligence/core/tools.mjs). All tools are read-only retrieval or browser presentation. They do not authorize a real-world decision or change a scientific result.

| Tool | Arguments and observable result |
| --- | --- |
| search_places | query, optional city; returns sourced IDs/coordinates or candidates requiring clarification |
| resolve_location | place_id; accepts an existing ID or a unique exact verified name, never a fuzzy coordinate guess |
| fly_to_place | place_id or `$location`; moves the camera, checks actual arrival and highlights destination |
| fly_to_coordinates | place_id plus two finite coordinates; must match the sourced place within two metres |
| zoom_to_area | verified place_id; moves to the reference's bounded zoom level |
| highlight_geographic_feature | verified place_id; draws a destination point, not a fabricated boundary/route |
| search_agents | query, optional city, recorded_only, nearest, within_results, status; small ranked list from actual registry/task data |
| show_nearby_agents | query/city/recorded_only; distance-ranked actual matching assignments |
| filter_agents_by_location | city; deterministic municipality filter |
| select_agent | returned agent_id or `$best_agent`; camera, highlight and actual agent panel |
| follow_agent | returned agent_id; tracks available visual walker position, never claims live model execution |
| retrieve_evidence | agent_id or `$selected_agent`; `all:true` only broadens when no explicit agent_id is supplied; recorded claims, tasks, source IDs and limitations |
| inspect_selected_problem | no arguments; actual selected problem record and status, or an explicit no-selection result |
| show_sources | no arguments; actual dossier sources, no invented links |
| lookup_core_knowledge | query; indexed current/planned/long-term product facts and public references |
| restore_previous_view | no arguments; restores the previous verified camera center/zoom |

Every per-tool argument object is closed. Types, string/array limits, enum values, finite numbers, real IDs and coordinate provenance are checked in code. A model cannot provide a new tool, shell command, endpoint, file path or permission. The planner's argument object is narrowed by the selected tool's schema before execution.

Eight tool calls, at most four rounds, four calls per plan, bounded context/history and two-minute model request timeout. An identical repeated model plan stops with an explicitly labeled execution receipt. Actual success/failure outcomes are visible and kept only in bounded session memory. Cancellation prevents success announcements for an unconfirmed camera action. The UI never animates arbitrary agents to manufacture a result.

The local bridge permits one inference/STT request at once, thirty starts/minute, forty-eight-kilobyte text request and one-megabyte PCM WAV request limits. It binds to loopback, validates Host/Origin/Sec-Fetch-Site, uses an ephemeral token for POSTs, exposes only an allowlisted static bundle, and has no CORS/public model endpoint. Whisper uses a fixed subprocess invocation with `shell:false` and standard input; no audio file or arbitrary visitor command is executed.

Known limitations: matching uses registered metadata and lexical indexing around the model's interpretation, not embeddings; approximate municipal/bridge reference points are disclosed; additional address/neighborhood geocoding needs the optional external service; selected idle agents often have no recorded findings. Tool receipts establish UI actions and record retrieval, not correctness of every recorded model claim.
