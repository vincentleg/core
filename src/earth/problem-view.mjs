// CORE Living Earth — plain-language problem view (V7). Pure functions: record in, escaped HTML out (testable).
// Readable by default; registry identifiers and technical fields live in the "Détails techniques" disclosure.
import { icon } from '../ui/icons.mjs';
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https:\/\//i.test(String(u || '')) ? String(u) : '#');
export const STATUS_FR = { observed: 'Observé', 'potential-risk': 'Risque potentiel', hypothesis: 'Hypothèse', simulated: 'Simulé' };
export const STATUS_HELP = { observed: 'un fait mesuré, enregistré dans une source publique', 'potential-risk': 'un signal qui mérite vérification, pas un fait établi', hypothesis: 'une idée à tester, sans preuve suffisante', simulated: 'un résultat de modèle, pas une observation' };
const SUFFIX = /^(ST|AVE|AV|BLVD|WAY|PL|LN|RD|DR|TER|AL|ALY|CT|SQ|HWY|PLZ)$/;
const word = w => /^0*\d+(ST|ND|RD|TH)$/.test(w) ? w.replace(/^0+/, '').toLowerCase() : SUFFIX.test(w) ? w[0] + w.slice(1).toLowerCase() : w[0] + w.slice(1).toLowerCase();
// "FOLSOM ST 05TH ST → FALMOUTH ST" → "Folsom St, entre 5th St et Falmouth St"
export function humanPlace(place = '') {
  const [left, right] = String(place).split('→').map(s => s.trim().split(/\s+/).filter(Boolean));
  if (!left?.length) return String(place);
  const cut = left.findIndex(w => SUFFIX.test(w)), street = left.slice(0, cut + 1 || left.length), from = cut >= 0 ? left.slice(cut + 1) : [];
  const fmt = ws => ws.map(word).join(' ');
  return from.length && right?.length ? `${fmt(street)}, entre ${fmt(from)} et ${fmt(right)}` : fmt(street) + (right?.length ? ` → ${fmt(right)}` : '');
}
const m = ft => `${(ft * 0.3048).toFixed(2).replace('.', ',')} m`;
export function reviewSteps(p) {
  const inv = p.investigation || {};
  return [
    ['Enregistré depuis une source publique', true, p.asOf ? `instantané du ${p.asOf.slice(0, 10)}` : ''],
    ['Analysé par les agents CORE', !!inv.task, inv.label || 'aucune analyse enregistrée'],
    ['Revue humaine', false, inv.state === 'awaiting-human' ? 'en attente — aucun relecteur humain vérifié n’existe encore' : 'non commencée'],
    ['Décision', false, p.humanDecision || 'aucune décision humaine enregistrée'],
  ];
}

export function problemHTML(p, { sidewalk = null, journey = null, count = 1 } = {}) {
  const st = p.status, steps = reviewSteps(p), mt = p.metrics || {};
  const measure = mt.width_ft != null && mt.min_ft != null ? `<div class="le-evidence">
      <span class="le-eyebrow">Ce qui a été mesuré</span>
      <div class="le-row" style="justify-content:space-between;align-items:baseline"><span class="v">${esc(mt.width_ft)} ft <small class="fine">(${m(mt.width_ft)})</small></span><span class="fine">minimum ${esc(mt.min_ft)} ft (${m(mt.min_ft)})${sidewalk?.recommended_ft ? ` · recommandé ${esc(sidewalk.recommended_ft)} ft` : ''}</span></div>
      <div class="le-meter" role="img" aria-label="Largeur mesurée ${esc(mt.width_ft)} pieds sur un minimum de ${esc(mt.min_ft)} pieds"><i style="width:${Math.min(100, (mt.width_ft / Math.max(mt.min_ft, sidewalk?.recommended_ft || mt.min_ft)) * 100).toFixed(1)}%"></i><u style="left:${((mt.min_ft / Math.max(mt.min_ft, sidewalk?.recommended_ft || mt.min_ft)) * 100).toFixed(1)}%" data-l="min."></u></div>
      <p class="src" style="margin-top:14px">${p.evidence.map(e => `<a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener noreferrer">${icon('external', 13)} DataSF · ${esc(e.ref)}</a>`).join(' · ')} — étude des trottoirs de San Francisco (2014)</p></div>` : `<div class="le-evidence"><span class="le-eyebrow">Preuves</span><p>${esc(p.statement)}</p><p class="src">${p.evidence.map(e => `<a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener noreferrer">${esc(e.ref)}</a>`).join(' · ')}</p></div>`;
  return `<header class="pp-head">
    <div class="le-row"><span class="le-badge" data-s="${esc(st)}">${esc(STATUS_FR[st] || st)}</span><span class="fine">${esc(STATUS_HELP[st] || '')}</span></div>
    <h2 id="pp-title">${esc(p.title)}</h2>
    <p class="pp-place">${icon('map', 15)} ${esc(humanPlace(p.place))}${count > 1 ? ` · <span class="fine">${count} problèmes enregistrés sur ce tronçon</span>` : ''}</p></header>
  <p class="pp-lede">${esc(p.statement)}</p>
  ${measure}
  <div class="pp-unc"><b>${icon('info', 15)} Ce que l’on ne sait pas</b><p>${esc(p.caveat || 'Aucune limite déclarée dans l’enregistrement : à vérifier.')}</p>${p.confidence ? `<p class="fine">Confiance : ${esc(p.confidence)}</p>` : ''}</div>
  <div class="pp-sec"><h3>Où en est l’examen</h3><ol class="le-steps">${steps.map(([l, ok, d], i) => `<li class="${ok ? 'done' : i === steps.findIndex(s => !s[1]) ? 'now' : ''}"><div><b>${esc(l)}</b><br><span class="fine">${esc(d)}</span></div></li>`).join('')}</ol></div>
  <div class="pp-sec"><h3>Idées et contributions</h3>${journey?.idea ? `<p>Vous avez une idée privée liée à ce problème (${journey.idea.versions || 0} version(s)), chiffrée dans votre coffre.</p>` : '<p class="fine">Aucune idée de votre part pour l’instant. Les idées restent privées et chiffrées dans ce navigateur ; aucune contribution d’autrui n’est publiée dans ce prototype.</p>'}</div>
  <nav class="pp-actions" aria-label="Participer">
    <a class="btn" href="dialogue.html#problem=${encodeURIComponent(p.id)}&mode=understand">${icon('book', 16)} Comprendre</a>
    <a class="btn primary" href="dialogue.html#problem=${encodeURIComponent(p.id)}&mode=propose">${icon('bulb', 16)} Proposer</a>
    <a class="btn" href="commons.html#communities?problem=${encodeURIComponent(p.id)}">${icon('collaborate', 16)} Collaborer</a></nav>
  <details class="pp-adv"><summary>Détails techniques</summary><dl class="kv">
    <dt>Identifiant</dt><dd><code>${esc(p.id)}</code></dd><dt>Tronçon (CNN)</dt><dd><code>${esc(p.segment || '—')}</code></dd><dt>Domaine</dt><dd>${esc(p.domain)}</dd>
    <dt>Gravité</dt><dd>${esc(p.severity?.level || '—')} — ${esc(p.severity?.basis || '')} (${esc(p.severity?.method || '')})</dd>
    <dt>Investigation</dt><dd>${esc(p.investigation?.task || '—')} · ${esc(p.investigation?.decision || '—')}</dd>
    <dt>Agents assignés</dt><dd>${(p.assignedAgents || []).length}</dd><dt>Vérifié le</dt><dd>${esc((p.lastVerified || '').slice(0, 10))}</dd></dl></details>`;
}
