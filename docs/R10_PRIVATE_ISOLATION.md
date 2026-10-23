# R10 Gate A — founder-private project isolation (2026-10-23)

**Decision:** founder-private projects belong only to the founder's private workspace; they are never public demonstrations.

## Finding
A founder-private project was publicly reachable: its modules, data and agent roles were served by the production
deployment and present on one pushed branch of this public repository. Details, affected paths and containment options
are recorded in the private store (`EXPOSURE_2026-10-23.md`), not here. No remote, branch or deployment was changed.

## Change
- All project files moved out of the repository to a private store outside every served tree
  (`CORE_PRIVATE_DIR`, default `~/core-private/<id>/`; its own git repository without remote).
- Public code keeps only a generic loader (`src/private/extensions.mjs`): on a public host it does nothing and requests
  nothing. The Business page no longer demonstrates any private project; the public agent registry no longer includes it.
- `scripts/founder-server.mjs` (127.0.0.1, Host/Origin checks, one-time capability → HttpOnly SameSite=Strict session)
  serves `/api/founder/extensions` and `/private/<id>/*.{mjs,json,css}` only to that session; every other request gets
  the same 404 (no name disclosure), with symlink/traversal containment.
- Mon CORE renders the local founder workspace only inside that session.
- Founder auth user ID removed from tracked files (`CORE_FOUNDER_USER_ID` env for `live-denials.mjs`).

## Security status
- **Local founder access: server-side boundary, loopback only.** The capability proves possession of the printed link on
  this computer, not an online identity.
- **Production founder access to private projects: BLOCKED.** The deployed Supabase account API authenticates the founder
  for workspace records, but serving private project code would require it to ship in a function bundle built from this
  public repository. Not implemented; private projects are not deployable.
- Containment of the already-exposed copies requires founder decisions (redeploy, remote branch, history). Removing a link
  does not remove previously published copies.

## Validation
`test/private-isolation.test.js` (tracked tree + public manifest scan by hashed terms, logged-out/forged-cookie/Host/
Origin/traversal/symlink denials, founder success path); `scripts/r10-private-browser.mjs` (public pages, routes, network
requests, founder session opening the project).

## Gates B–D (implemented 2026-10-23, paused before founder review)
- B: `src/earth/agent-records.mjs` `executionClass` / `missionCardHTML` — one execution class per agent from published
  records only (recorded / browser replay / inactive; "live" needs a verified live source, none exists). Card first in
  every agent panel (civ and urban); header badge reads "Replay · …"; gold ring on map for agents with recorded work.
- C: `reviewPacket` in `src/contrib/lifecycle.mjs`; My CORE shows provenance (place, storage boundary, integrity), a link
  to the mission's evidence and a downloadable pseudonymous review request. CORE sends nothing; state unchanged.
- D: visitor's own located proposals drawn only in CORE World / Hybrid (never Real Earth), with a "proposed · not
  evidence" panel; non-interactive view legend; desktop panel ≤ 28 % width.
- Found during D: a name collision with the existing `#ea-legend`; fixed by `#ea-view-legend` before commit.
- Validation: unit 383/383; `scripts/r10-world-browser.mjs` 32/32 in three consecutive runs after removing test races
  (moving symbols; uncovered tap target). Pending: other-language strings, R1–R9 browser regressions, Firefox/Safari.

## Release and containment (2026-10-23)
- Public branch `release/r10-public` (`023f711`): a single squashed commit of the verified tree on top of `main`, so the
  local branch history that contains the private files was never pushed. No force-push; no existing remote ref changed.
- Production redeployed from that tree with the existing Vercel project (prebuilt). Every previously exposed private URL
  now returns 404 on both domains; all 173 live public text assets scanned clean. Earlier deployment URLs are behind
  Vercel's login (302 to SSO), so they are not public; they were not deleted.
- Credentials: no real secret was ever in public history (test fixtures only). The founder auth UUID and Supabase project
  reference are identifiers, not secrets, and cannot be "rotated"; access stays protected server-side. Nothing to rotate.
- Fixed during release: the mission panel re-rendered every 2 s and moved content under the pointer (R4/R5 failed, also
  on the R9 baseline). Periodic refreshes now hold for 5 s after any interaction with the panel.
- Remaining: the pushed branch `origin/v9.9/multilingual-text-first` still holds the private files, a prospect record and the
  founder auth UUID. Deleting it needs founder approval; GitHub may still serve its commits by SHA until a support purge.
