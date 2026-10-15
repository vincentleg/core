// MapLibre GL JS 6 is ESM-only. This same-origin module exposes it as the global the app expects and signals
// readiness; index.html starts its inline app on that signal (or on DOMContentLoaded, where a failed load shows the
// existing "moteur de carte" message). The vendored modules are SRI-pinned through <link rel="modulepreload">.
import * as maplibregl from '../assets/vendor/maplibre-gl-6.11.2/maplibre-gl.mjs';
globalThis.maplibregl = maplibregl;
globalThis.dispatchEvent(new Event('core:maplibre'));
