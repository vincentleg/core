# CORE avatar assets (V7)

| File | Content | Source | Licence |
|---|---|---|---|
| `body-f.glb`, `body-m.glb` | Base bodies (rigged, 65-bone humanoid), 1024 px WebP textures embedded | Quaternius, *Universal Base Characters* [Standard], <https://quaternius.itch.io/universal-base-characters> | CC0 1.0 (`LICENSE-quaternius-ubc.txt`, also stated on the itch.io page) |
| `hair-kit.glb` | 6 hairstyles, beard, 2 eyebrow meshes, shared textures | same pack | CC0 1.0 |
| `skin-kit.glb` | Light and dark skin base-colour scans, as materials on 4 tiny quads | same pack | CC0 1.0 |
| `anim.glb` | Skeleton plus 5 clips (Idle, Walk, Jog, Idle_Talking, Interact) | Quaternius, *Universal Animation Library* [Standard], <https://quaternius.itch.io/universal-animation-library> | CC0 1.0 (`LICENSE-quaternius-ual.txt`) |

- **Obtained:** 2026-10-15, through the creator's free ("No thanks, just take me to the downloads") itch.io flow. No account, no payment.
- **Original archives (SHA-256):**
  - `Universal Base Characters[Standard].zip`: `fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40`
  - `Universal Animation Library[Standard].zip`: `cc73fc4e495b82958207316596317a3f40b9fa38065bde1027937452da537724`
- **Processing (glTF Transform 4.5.1, build-time only, not a runtime dependency):**
  - textures resized to 1024 px and re-encoded as WebP;
  - hair geometry quantised (body positions are not quantised, because clothing is offset in metres);
  - animation tracks reduced (scale tracks, leaf bones and non-root translations removed);
  - the unused mannequin mesh dropped.
- **Licence note:** Quaternius's website also publishes a newer "Quaternius Asset License" for its catalogue. Both the pack pages and the licence files shipped inside these two packs state CC0 1.0. Either way, using the assets inside a product is allowed. Publishing these files in a public repository is a release-gate question for the founder: see `docs/v7/TOOLING_AND_COSTS.md`.
- **Clothing:** generated at runtime by CORE (`src/earth/avatar3d.mjs`) from the body's skin weights; it is not a third-party asset.
