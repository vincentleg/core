# V9.9 data-flow and storage review — Phase 2, 2026-10-21

Scope: the supported static pages, their manifest-listed modules, the pinned optional model SDK and the separate local intelligence tools. This records code behavior and test evidence, not processor contracts, legal approval or an inspection of anyone’s stored content. No visitor database or personal browser profile was opened.

## Network boundaries

| Feature | Destination and data | Activation and remaining limit |
| --- | --- | --- |
| Static application | Same-origin host receives IP/request metadata and requested asset paths | Loading the site; Vercel disclosed in privacy.html. Actual retention, account access, contracts and residency unverified. |
| Earth imagery, vectors and terrain | tiles.openfreemap.org, gibs.earthdata.nasa.gov and s3.amazonaws.com receive tile/asset URLs and network metadata; tile coordinates reveal the viewed area | Map loading/navigation; exact hosts in src/earth/style.mjs and CSP. They do not receive vault contents through the inspected code. Provider processing is outside this code audit. |
| External place search | photon.komoot.io receives the search phrase and network metadata | Explicit opt-in, default off; bounded results. Place searches can themselves be sensitive. |
| Optional browser model | Revision-pinned huggingface.co / *.hf.co / raw.githubusercontent.com assets and network metadata | Explicit model opt-in; inference runs on the device. No model download or real inference was performed in Phase 2. Full shard integrity remains partial. |
| Microphone input | On-device recognition/language-pack implementation supplied by the browser | Explicit press, processLocally required; no cloud-recognition fallback. Actual hardware/pack behavior unverified. No speech-output API is used. |
| Local development model/worker | Loopback-only model endpoints and local SQLite checkpoint state | Separate local tools, excluded from the public artifact. Public build removes loopback CSP destinations. Tests use scripted model fixtures, not paid or remote inference. |
| External reference links | The selected website receives a normal navigation request | Human click. Existing HTTPS validation and noopener/noreferrer retained; not a review of each destination’s privacy terms. |

No new runtime processor, account, connector, plugin, analytics implementation or paid service was added. “No CORE server-side visitor records” does not mean that the host and map/model-download providers keep no request logs. The privacy notice and TRUST distinguish those flows, but wording and controller/contact adequacy still need qualified review (controls 21, 24, 29, 30 and 40).

## First-party browser records

Source inventory: src/civic/ui-journey.mjs, src/shell/, src/earth/, src/civic/, src/contrib/, src/civilization/client.mjs, src/intelligence/core/, src/urban/, src/dialogue/ and src/i18n/. All records below are clear text unless explicitly marked encrypted. Pseudonyms are not authentication.

| Store/key | Purpose |
| --- | --- |
| localStorage core.lang | Chosen interface language |
| core.avatar.v2; core.world.v1 | Appearance/pseudonym; legacy World state/contributions |
| core.world.layer | Preferred World data layer |
| core.commons.v1 | Local profile and Labs log |
| core.vault.v1 | AES-GCM encrypted ideas and saved dialogue; passphrase never persisted |
| core.journey.v1 | Demonstration progress, identifiers and dates |
| core.kbcontrib.v1 | Candidate Knowledge contributions |
| core.network.v1 | Community drafts and fictional review requests |
| core.intelligence.v1 | Engine/provider preference; not conversation content |
| core.intelligence.v1.missions | Local mission-reasoning preference |
| core.ai.consent | On-device AI consent/model identifier |
| core.civ.v72 | Local agent runtime and contributions explicitly shared with a local mission |
| core.follow.v1 | Followed mission and titles of shared contributions |
| core.contrib.v1 | Private contribution text and local sharing links; separate from encrypted vault |
| core.investigations.v1 | Last ten research questions/results, clear text; crisis inputs now rejected before recording |
| core.layerintro.v1 | World introduction display preferences |
| core.urban.v95 | Saved exploratory traffic runs |
| Legacy core.feeds.browser.v1, core.missions.v1, core.human-decisions.v1 | Prior watch/mission/local-review records; may remain from earlier releases |
| Legacy core.companion.speak | Obsolete read-aloud preference only; no speech-output path remains |
| sessionStorage core.dialogue.prefill | Navigation draft; prefilled, not automatically sent |
| sessionStorage core.boot-retry:&lt;pathname&gt; | Bounded one-reload startup recovery marker |
| Legacy sessionStorage core.entered | Prior entry-state marker |
| In-memory state | Unsaved input, current dialogue, model context, unlocked vault, map and runtime state; not all are erased in another open tab |
| Browser HTTP cache, SDK CacheStorage/IndexedDB | Static/map/model assets and SDK caching, outside the namespace sweep; contents vary by opt-in/browser. No new model cache was created for these checks. |

The TRUST inventory now includes AI consent and exploratory traffic state. The namespace wipe sweeps **all core.* keys** in both Storage APIs, including legacy/unknown keys, preserves unrelated keys, destroys the vault session and reloads the current page. A denied Storage getter now reports incomplete removal instead of implying success. Fresh isolated mobile checks cover denied localStorage/sessionStorage on World, Avatar and Commons in all six languages (18 cases, zero page errors); page-local language switching works even when persistence fails.

The button explicitly erases CORE records/preferences; it does **not** promise to clear model/browser caches or other tabs’ memory. Close other CORE tabs and clear site data/cache in browser settings for fuller removal. Browser eviction, filesystem backups, downloaded exports and forensic erasure are outside this operation. Unencrypted local contributions remain readable to scripts running with this origin’s privileges. No automatic backup, multi-user account system, cloud storage or cross-tab erasure infrastructure is warranted for this static prototype.

## Human decisions still required

A qualified reviewer must assess controller/contact details, actual hosting/provider retention and agreements, sensitive search wording, translation meaning and clinical/geographic suitability of crisis resources. Vault exports remain the person’s responsibility; no remote recovery service exists. Optional model integrity/download acceptance and physical microphone acceptance require separate, bounded device checks. None of those approvals was invented or inferred from green tests.
