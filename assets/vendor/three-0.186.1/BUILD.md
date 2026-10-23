# three.js 0.186.1 — CORE bundle

- **Content:** `core3d.min.mjs` is one ES module bundling three.js 0.186.1 (MIT, `LICENSE.txt`) and the addons listed in `entry.mjs`: GLTFLoader, SkeletonUtils.clone, RoomEnvironment, BufferGeometryUtils, Sky. It is tree-shaken and minified.
- **Build:** `npx esbuild@0.25.10 entry.mjs --bundle --format=esm --minify --legal-comments=eof --target=es2022 --outfile=core3d.min.mjs`, run in a scratch directory where `three@0.186.1` is installed.
- **Checksums:** SHA-256 `ca518e1544f4a6e4818b04e42ba8f548bba197d57bf139175972b5a10bf87384`; SRI `sha384-7lNpWpnD+3omzMKX01L5GK3iv43s1fBtpHivXpAIusFsUNiS+7Mm+u4jOtl0hucz`.
- **No WebAssembly:** the Draco and meshopt decoders are deliberately excluded, so the strict CSP needs no `wasm-unsafe-eval`.
