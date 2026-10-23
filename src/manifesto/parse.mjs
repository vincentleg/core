// CORE — Manifesto source parser. The long-*.mjs SOURCE strings use a small Markdown subset (#, ##, ###, **bold**,
// *italic*, ---, "1." list); this turns one into a structured document without altering a single word.
export function parse(src) {
  const blocks = src.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const doc = { head: [], chapters: [], principles: null, coda: [] };
  let ch = null;
  for (const b of blocks) {
    if (b === '---') { ch = null; continue; }
    const c = /^## ([IVXL]+)\. (.+)$/.exec(b);
    if (c) { ch = { n: c[1], id: c[1].toLowerCase(), title: c[2], body: [] }; doc.chapters.push(ch); continue; }
    if (!doc.chapters.length) { doc.head.push(...b.split('\n')); continue; }
    if (/^## /.test(b)) { doc.principles = { title: b.slice(3), items: [] }; ch = null; continue; }
    if (doc.principles && /^\d+\. /m.test(b)) {
      doc.principles.items = b.split('\n').map(l => /^\d+\. \*\*(.+?)\*\* (.+)$/.exec(l)).map(m => ({ head: m[1], text: m[2] }));
      continue;
    }
    if (ch) ch.body.push(/^### /.test(b) ? { h3: b.slice(4) } : b); else doc.coda.push(b);
  }
  const H = doc.head; doc.title = H.find(l => /^# /.test(l)).slice(2); doc.subtitle = H.find(l => /^## /.test(l)).slice(3);
  doc.tagline = H.find(l => /^### /.test(l)).slice(4); doc.lede = H.find(l => !/^#/.test(l)) || '';
  delete doc.head; return doc;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
export const plain = s => String(s).replace(/\*\*?/g, '');
export const words = d => [...d.chapters.flatMap(c => c.body.map(b => b.h3 || b)), ...d.principles.items.map(p => `${p.head} ${p.text}`), ...d.coda]
  .reduce((n, s) => n + plain(s).split(/\s+/).filter(Boolean).length, 0);
