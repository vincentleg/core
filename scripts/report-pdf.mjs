// CORE V8 — print a mission report to PDF through a local headless Chrome you started yourself (DevTools protocol).
//   CORE_CDP_PORT=<port> node scripts/report-pdf.mjs --mission mission.sf.mobility --out report.pdf [--base http://127.0.0.1:8000]
// Start the browser with a fresh profile, e.g. chrome --headless=new --remote-debugging-port=<port> --user-data-dir=<tmp>.
// There is no default port (9222 is refused: it may belong to another browser holding real cookies). Local only.
import fs from 'node:fs';
const a = process.argv.slice(2), arg = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const port = process.env.CORE_CDP_PORT, mission = arg('--mission', 'mission.sf.mobility'), out = arg('--out', `report-${mission.replace(/[^a-z0-9.-]/gi, '_')}.pdf`), base = arg('--base', 'http://127.0.0.1:8000');
if (!port || port === '9222') { console.error('Set CORE_CDP_PORT to the port of a headless Chrome you started with a fresh profile (not 9222).'); process.exit(1); }
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error('--base must be a local http://127.0.0.1:<port> server'); process.exit(1); }
if (!/^mission\.[a-z0-9.-]+$/.test(mission)) { console.error('invalid mission id'); process.exit(1); }
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let n = 0; const pend = new Map(); ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const call = (method, params = {}) => new Promise(r => { const id = ++n; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await call('Page.enable'); await call('Runtime.enable');
await call('Page.navigate', { url: `${base}/report.html#mission=${encodeURIComponent(mission)}` });
let ok = null; for (let i = 0; i < 60 && !ok; i++) { await new Promise(r => setTimeout(r, 500)); const r = await call('Runtime.evaluate', { expression: 'globalThis.CORE_REPORT && JSON.stringify(globalThis.CORE_REPORT)', returnByValue: true }); ok = r.result?.result?.value; }
if (!ok || JSON.parse(ok).error || JSON.parse(ok).sections !== 20) { console.error('report not ready:', ok); process.exit(1); }
const pdf = await call('Page.printToPDF', { printBackground: false, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#555">CORE — proposition soumise à examen, pas une recommandation · <span class="pageNumber"></span>/<span class="totalPages"></span></div>' });
fs.writeFileSync(out, Buffer.from(pdf.result.data, 'base64')); console.log(`${out}: ${fs.statSync(out).size} bytes, mission ${mission}`);
await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`); ws.close(); process.exit(0);
