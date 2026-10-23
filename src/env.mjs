// CORE runtime environment. PUBLIC is true on any host other than this computer (localhost / 127.0.0.1): there,
// local-only features stay off — no request to a local model (Ollama on the visitor's 127.0.0.1), no local supervisor
// state, no links to unpublished archive pages. Node (tests, scripts) is never PUBLIC.
export const PUBLIC = typeof location !== 'undefined' && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
