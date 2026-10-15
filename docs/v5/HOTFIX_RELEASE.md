# MapLibre 6.11.2 security hotfix — release instructions (prepared 2026-10-15, NOT released)

| | |
|---|---|
| Local branch | `hotfix/maplibre-6.11.2` (also checked out in a scratch worktree) |
| Commit | `22ce0d2` — one commit on top of `main` at `358f6f6` (verified against the GitHub API on 2026-10-15) |
| Origin | Cherry-pick of `6e6f7ab` from the consolidation work, minus 3 consolidation-only documents |
| Fixes | GHSA-jrc7-96c5-q579 / CVE-2026-85061 (critical): XSS sanitizer bypass in `maplibre-gl` ≤ 6.4.0; production serves 5.7.3 |
| Contains no | V2/V3/V4 code, `world.html`, `commons.html`, compliance drafts, incident record or Phase 14 scaffolding |
| Backups | `~/CORE-backups/git/core-hotfix-maplibre-6.11.2-*.bundle` and `hotfix-maplibre-6.11.2.patch` (mode 600) |

## Exact change (20 files, +907 / −90)
| Area | Files |
|---|---|
| Dependency | `assets/vendor/maplibre-gl-5.7.3/{maplibre-gl.js, maplibre-gl.css}` deleted; `LICENSE.txt` moved to `assets/vendor/maplibre-gl-6.11.2/`; added `maplibre-gl.mjs`, `maplibre-gl-shared.mjs`, `maplibre-gl-worker.mjs`, `maplibre-gl.css` (byte-identical to npm/jsDelivr 6.11.2) |
| Loading | `src/maplibre-loader.mjs` (new); `index.html` (module preload with SRI, start on `core:maplibre`, CSP `worker-src 'self'; child-src 'self'`); `scripts/csp.mjs` |
| API migration | `src/agent-motion.js` (`CORE_MOTION.camera()` replaces the removed `map.transform`) |
| Tests and audits | `test/phase9.test.js` (vendored files, worker hash); `scripts/browser-audit.mjs` and `scripts/browser-negative-audit.mjs` (public APIs only) |
| Documentation | `README.md`, `docs/ARCHITECTURE.md`, `docs/DATA_SOURCES.md`, `docs/IP_AND_ATTRIBUTION.md` (licence/attribution of the new version), `docs/SF_3D_ARCHITECTURE.md`, `docs/DECISIONS.md` (D090) |

Review the full diff with `git show 22ce0d2`, or the patch file.

## Verification done (local)
- Node suite on `main` + hotfix: **170/170**.
- `node scripts/verify.mjs`: passed.
- Integrity gate: 0 findings.
- CSP hash: already correct (`node scripts/csp.mjs` left `index.html` unchanged).
- Chromium 155, served from the hotfix tree:
  - main audit **159/159** on the second run. The first run stopped at check 114 on `CORE_MOTION.state.dimOthers is not iterable`, the pre-existing activity/replay race that also exists on `main`; it is fixed separately in `01906b5`, not included, to keep the hotfix minimal;
  - negative audit **12/12**;
  - lab **7/7**, 0 errors, 0 external requests.
- **Not run:** Firefox and Safari; WebGL2 is now required.

## Release steps (founder approval required for each)
1. `git fetch origin` and check that `main` is still `358f6f6`. If it moved (bot data commits), rebase the hotfix (`git rebase origin/main hotfix/maplibre-6.11.2`) and rerun `node --test test/*.test.js` and `node scripts/verify.mjs`.
2. `git push origin hotfix/maplibre-6.11.2` (a normal push, never force).
3. Open a PR to `main`, titled "fix(security): MapLibre 6.11.2 (GHSA-jrc7-96c5-q579)", and wait for `core-verify` to succeed on the PR's head.
4. Merge normally. GitHub Pages republishes `main`.
5. After deploy:
   - `curl -sI https://vincentleg.github.io/core/assets/vendor/maplibre-gl-6.11.2/maplibre-gl.mjs` returns 200;
   - the old path `.../maplibre-gl-5.7.3/maplibre-gl.js` returns 404;
   - `index.html#app` shows the globe with no console error;
   - run `node scripts/research-browser.mjs <port> https://vincentleg.github.io/core/research.html /tmp/core-prod`.
6. **Rollback** only for a breaking regression: `git revert` the merge in a new PR. That brings back the vulnerable 5.7.3, so prefer a forward fix.
7. Afterwards: rebase or merge PR #3 onto the new `main`. It contains the same change, so expect a trivial conflict-free merge or an empty cherry-pick of `6e6f7ab`.
