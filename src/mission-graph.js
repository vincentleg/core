// CORE — mission collaboration graph (Phase 6). A swimlane built ONLY from recorded events of a mission:
// rows = agents that acted; x = recorded time (ms since mission start, from the mission log). Marks: tool calls
// (deterministic code), model calls, reports (accepted / rejected statements), routed evidence requests and disputes.
// Replay moves a playhead over the recorded timestamps (time-compressed); it never invents events.
(function () {
  'use strict';
  const G = globalThis;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const short = id => String(id || '').split('.').pop().replace(/-analyst$|-reviewer$/, '');

  function events(mc) {
    const out = [], rejectedBy = {};
    for (const r of mc.rejected || []) rejectedBy[`${r.agent}|${r.phase}`] = (rejectedBy[`${r.agent}|${r.phase}`] || 0) + 1;
    for (const l of mc.log || []) {
      if (!l.agent) { if (l.kind === 'stage') out.push({ t: l.t, kind: 'stage', label: l.stage, text: l.text }); continue; }
      if (l.kind === 'tool-call') out.push({ t: l.t, agent: l.agent, kind: l.state === 'denied' ? 'denied' : 'tool', text: l.text });
      else if (l.kind === 'model-call') out.push({ t: l.t, agent: l.agent, kind: l.state === 'error' ? 'error' : 'model', text: l.text });
      else if (l.kind === 'report') { const m = /^(\w+) : (\d+) énoncé/.exec(l.text || ''), phase = m ? m[1] : ''; out.push({ t: l.t, agent: l.agent, kind: 'report', accepted: m ? +m[2] : 0, rejected: rejectedBy[`${l.agent}|${phase}`] || 0, phase, text: l.text }); }
      else if (l.kind === 'route') out.push({ t: l.t, agent: l.agent, kind: 'route', text: l.text });
    }
    // Disputes: drawn at the time of the disputing agent's report in the phase where the response was made.
    for (const d of mc.disagreements || []) {
      const resp = (mc.responses || []).find(r => r.id === d.response), rep = out.find(e => e.kind === 'report' && e.agent === d.between[1] && resp && e.phase === resp.phase);
      if (rep) out.push({ t: rep.t, agent: d.between[1], to: d.between[0], kind: 'dispute', text: `${d.id} : ${d.statement}` });
    }
    return out.sort((a, b) => a.t - b.t);
  }

  function render(mc, { width = 380 } = {}) {
    const ev = events(mc), agents = [...new Set(ev.filter(e => e.agent).map(e => e.agent))], T = Math.max(1, ...ev.map(e => e.t));
    const rowH = 26, left = 104, top = 18, W = width, H = top + agents.length * rowH + 22, x = t => left + (W - left - 10) * t / T, y = a => top + agents.indexOf(a) * rowH + rowH / 2;
    const stages = ev.filter(e => e.kind === 'stage');
    const marks = ev.filter(e => e.agent).map((e, i) => {
      const cx = x(e.t), cy = y(e.agent), tip = `<title>+${(e.t / 1000).toFixed(1)} s · ${esc(short(e.agent))} · ${esc(e.text || '')}</title>`;
      if (e.kind === 'tool') return `<rect class="mk" data-t="${e.t}" x="${cx - 3}" y="${cy - 3}" width="6" height="6" fill="#58a6ff">${tip}</rect>`;
      if (e.kind === 'denied') return `<rect class="mk" data-t="${e.t}" x="${cx - 3}" y="${cy - 3}" width="6" height="6" fill="#f85149">${tip}</rect>`;
      if (e.kind === 'model') return `<circle class="mk" data-t="${e.t}" cx="${cx}" cy="${cy}" r="3.5" fill="none" stroke="#e3b341" stroke-width="1.5">${tip}</circle>`;
      if (e.kind === 'report') return `<g class="mk" data-t="${e.t}">${tip}<circle cx="${cx}" cy="${cy}" r="5" fill="#3fb950" opacity=".85"/>${e.rejected ? `<circle cx="${cx + 7}" cy="${cy - 5}" r="3.5" fill="#f85149"/>` : ''}<text x="${cx}" y="${cy + 3}" font-size="7" text-anchor="middle" fill="#0d1117">${e.accepted}</text></g>`;
      if (e.kind === 'route') return `<path class="mk" data-t="${e.t}" d="M${cx - 4} ${cy + 6} l4 -4 l4 4" stroke="#a5d6ff" fill="none">${tip}</path>`;
      if (e.kind === 'dispute' && agents.includes(e.to)) return `<line class="mk" data-t="${e.t}" x1="${cx}" y1="${cy}" x2="${cx}" y2="${y(e.to)}" stroke="#f85149" stroke-width="1.2" stroke-dasharray="3 2" marker-end="url(#arr)">${tip}</line>`;
      return '';
    }).join('');
    return `<figure class="mgraph"><figcaption>Fil d’exécution enregistré — ${agents.length} agents, ${ev.filter(e => e.agent).length} évènements, ${(T / 1000).toFixed(0)} s (temps réels du journal)</figcaption>
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Chronologie des actions des agents"><defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="#f85149"/></marker></defs>
      ${stages.map(s => `<line x1="${x(s.t)}" x2="${x(s.t)}" y1="${top - 6}" y2="${H - 18}" stroke="#30363d" stroke-dasharray="2 3"><title>${esc(s.label)} — ${esc(s.text)}</title></line>`).join('')}
      ${agents.map(a => `<text x="4" y="${y(a) + 4}" font-size="10" fill="#c9d1d9">${esc(short(a))}</text><line x1="${left}" x2="${W - 8}" y1="${y(a)}" y2="${y(a)}" stroke="#21262d"/>`).join('')}
      ${marks}<line id="mg-head" x1="${left}" x2="${left}" y1="${top - 8}" y2="${H - 18}" stroke="#79c0ff" stroke-width="1.5" opacity="0"/>
      <text x="${left}" y="${H - 4}" font-size="9" fill="#8b949e">0 s</text><text x="${W - 8}" y="${H - 4}" font-size="9" fill="#8b949e" text-anchor="end">${(T / 1000).toFixed(0)} s</text></svg>
      <div class="mg-legend"><span><i style="background:#58a6ff"></i>outil (code déterministe)</span><span><i style="border:1.5px solid #e3b341;border-radius:50%"></i>appel au modèle</span><span><i style="background:#3fb950;border-radius:50%"></i>énoncés acceptés</span><span><i style="background:#f85149;border-radius:50%"></i>rejetés</span><span><i style="border-top:1.5px dashed #f85149"></i>désaccord</span></div>
      <div class="toolbar"><button type="button" class="ghost small" data-mg-replay>Rejouer l’enregistrement (temps ×${Math.max(1, Math.round(T / 20000))} accéléré)</button><span class="hint" data-mg-now></span></div></figure>`;
  }
  // Replay: playhead over the recorded time axis; marks appear when their recorded time is reached.
  function bind(root, mc, { reduced = false } = {}) {
    const btn = root.querySelector('[data-mg-replay]'); if (!btn) return;
    btn.onclick = () => {
      const svg = root.querySelector('.mgraph svg'), head = svg.querySelector('#mg-head'), marks = [...svg.querySelectorAll('.mk')], now = root.querySelector('[data-mg-now]');
      const T = Math.max(1, ...marks.map(m => +m.dataset.t)), dur = reduced ? 0 : 20000, x0 = +head.getAttribute('x1'), vb = svg.viewBox.baseVal, x1 = vb.width - 10, start = performance.now();
      marks.forEach(m => { m.style.opacity = 0.08; }); head.setAttribute('opacity', 1);
      const step = () => { const p = dur ? Math.min(1, (performance.now() - start) / dur) : 1, t = p * T, hx = x0 + (x1 - x0) * p;
        head.setAttribute('x1', hx); head.setAttribute('x2', hx); for (const m of marks) if (+m.dataset.t <= t) m.style.opacity = 1;
        if (now) now.textContent = `relecture : +${(t / 1000).toFixed(0)} s du journal enregistré`; if (p < 1) requestAnimationFrame(step); else if (now) now.textContent = 'relecture terminée (aucun appel au modèle)'; };
      requestAnimationFrame(step);
    };
  }
  G.CORE_MISSION_GRAPH = { events, render, bind };
})();
