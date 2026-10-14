// CORE — City Intelligence pipeline (Phase 3, extended in Phase 4: 16 sources, retired/stale handling,
// aggregated statistics, confidence limitations, commentary/allegation separation). Source registry → normalization → deduplication →
// verification → classification → geolocation → temporal index → graph links → mission suggestions.
// Every item keeps its source, publication date, retrieval date and verification status. Civic items are
// metadata only, classified by official type/status, never ranked or interpreted politically.
(function (root) {
  'use strict';
  const isNode = typeof require === 'function' && typeof module !== 'undefined';
  const C = isNode ? require('./coord.js') : root.CORE_COORD;

  // Kinds separate facts from statements: observations and statistics (measured or counted by the source),
  // notices, proposals, adopted decisions, ongoing/completed work, predictions (forecasts or models),
  // announcements (an agency describing its own work), commentary/opinion and allegations (never facts).
  const KINDS = ['observation', 'statistic', 'public-notice', 'proposal', 'approved-decision', 'ongoing-project', 'completed-work', 'prediction', 'announcement', 'commentary', 'opinion', 'allegation'];
  const OFFICIAL_HOSTS = ['data.sf.gov', 'data.sfgov.org', 'earthquake.usgs.gov', 'api.weather.gov', 'webapi.legistar.com', 'sfgov.legistar.com', 'www.sfmta.com', 'sfpublicworks.org', 'www.sfpuc.gov', 'sfrecpark.org', 'sf-fire.org', 'www.caiso.com'];
  // Registered open-data providers that are not government agencies (licensed, attributed, labelled as such).
  const OPEN_DATA_HOSTS = ['air-quality-api.open-meteo.com', 'open-meteo.com'];
  const TRUSTED = ['official-source', 'registered-open-data'];
  const SF = [-122.4194, 37.7749];

  // Source registry: id, category, rate limit (minimum minutes between requests), browser support (CORS).
  const SOURCES = [
    { id: 'datasf-street-use', name: 'DataSF · Street-Use Permits (récents, corridor)', publisher: 'SF Public Works', category: 'infrastructure', url: 'https://data.sf.gov/d/b6tj-gt35', license: 'ODC-PDDL', minIntervalMin: 15, browser: true, confidence: ['high', 'Un permis n’est pas la preuve que les travaux ont lieu.'] },
    { id: 'datasf-building', name: 'DataSF · Building Permits (récents, corridor)', publisher: 'Department of Building Inspection', category: 'buildings', url: 'https://data.sf.gov/d/i98e-djp9', license: 'ODC-PDDL', minIntervalMin: 15, browser: true, confidence: ['high', 'Le statut « issued » ne prouve pas un chantier en cours.'] },
    { id: 'datasf-tree-removals', name: 'DataSF · Avis d’abattage (récents)', publisher: 'SF Public Works', category: 'nature', url: 'https://data.sf.gov/d/qrwx-q4gg', license: 'ODC-PDDL', minIntervalMin: 30, browser: true, confidence: ['high', 'Un avis ne confirme pas l’abattage.'] },
    { id: 'datasf-closures', name: 'DataSF · Fermetures temporaires SFMTA (à venir, corridor)', publisher: 'SFMTA', category: 'events', url: 'https://data.sf.gov/d/8x25-yybr', license: 'ODC-PDDL', minIntervalMin: 30, browser: true, confidence: ['high', 'Permis SFMTA uniquement.'] },
    { id: 'usgs-quakes', name: 'USGS · Séismes à moins de 100 km (30 j, M ≥ 2,5)', publisher: 'U.S. Geological Survey', category: 'emergency', url: 'https://earthquake.usgs.gov/fdsnws/event/1/', license: 'U.S. public domain', minIntervalMin: 5, browser: true, confidence: ['high', 'Les solutions automatiques sont révisables.'] },
    { id: 'nws-alerts', name: 'NWS · Alertes actives (zone San Francisco CAZ006)', publisher: 'National Weather Service', category: 'climate', url: 'https://api.weather.gov/alerts/active?zone=CAZ006', license: 'U.S. public domain', minIntervalMin: 10, browser: true, confidence: ['high', 'Alerte ou prévision, pas une observation.'] },
    { id: 'legistar', name: 'Legistar · Dossiers du Board of Supervisors (API publique)', publisher: 'Clerk of the Board of Supervisors', category: 'administration', url: 'https://sfbos.org/legislation', license: 'Public records (metadata)', minIntervalMin: 60, browser: false, confidence: ['low', 'API figée : aucun dossier modifié depuis 2020.'],
      enabled: false, retired: 'Retirée de la collecte le 2026-10-13 : l’API publique webapi.legistar.com/v1/sfgov ne contient aucun dossier postérieur à 2020 (vérifié par MatterId décroissant). Éléments historiques conservés.' },
    { id: 'rss-sfmta', name: 'SFMTA · Blog (RSS)', publisher: 'SFMTA', category: 'mobility', url: 'https://www.sfmta.com/blog/rss.xml', license: 'Official agency feed (titles/links)', minIntervalMin: 60, browser: false, confidence: ['medium', 'Communication de l’agence sur ses propres actions.'] },
    { id: 'rss-publicworks', name: 'SF Public Works · Actualités (RSS)', publisher: 'SF Public Works', category: 'infrastructure', url: 'https://sfpublicworks.org/rss.xml', license: 'Official agency feed (titles/links)', minIntervalMin: 60, browser: false, confidence: ['medium', 'Communication de l’agence sur ses propres actions.'] },
    { id: 'rss-sfpuc', name: 'SFPUC · Actualités (RSS)', publisher: 'SF Public Utilities Commission', category: 'infrastructure', url: 'https://www.sfpuc.gov/rss.xml', license: 'Official agency feed (titles/links)', minIntervalMin: 1440, browser: false, confidence: ['low', 'Flux non mis à jour depuis mai 2024 : consulté une fois par jour seulement.'] },
    // Phase 4 additions (verified 2026-10-13). Personal data never collected: aggregated counts only for 311 and business registrations.
    { id: 'datasf-planning', name: 'DataSF · Dossiers de projets du Planning Department (30 j)', publisher: 'SF Planning Department', category: 'urbanism', url: 'https://data.sf.gov/d/qvu5-m3a2', license: 'ODC-PDDL', minIntervalMin: 60, browser: true, confidence: ['high', 'Une demande déposée n’est pas une autorisation ; noms des demandeurs et instructeurs exclus.'] },
    { id: 'datasf-311-soma', name: 'DataSF · Demandes 311, South of Market (7 j, agrégées)', publisher: 'SF 311', category: 'society', url: 'https://data.sf.gov/d/vw6y-z8j6', license: 'ODC-PDDL', minIntervalMin: 360, browser: true, confidence: ['medium', 'Demandes signalées par le public, non des incidents vérifiés ; comptes agrégés par catégorie.'] },
    { id: 'datasf-business-soma', name: 'DataSF · Enregistrements d’entreprises, South of Market (30 j, compte)', publisher: 'SF Treasurer & Tax Collector', category: 'economy', url: 'https://data.sf.gov/d/g8m3-pdis', license: 'ODC-PDDL', minIntervalMin: 1440, browser: true, confidence: ['medium', 'Un enregistrement n’est pas une ouverture ; compte agrégé, aucun nom collecté.'] },
    { id: 'rss-recpark', name: 'SF Recreation & Parks · Actualités (RSS)', publisher: 'SF Recreation and Park Department', category: 'environment', url: 'https://sfrecpark.org/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml', license: 'Official agency feed (titles/links)', minIntervalMin: 120, browser: false, confidence: ['medium', 'Communication de l’agence sur ses propres projets et évènements.'] },
    { id: 'rss-sffire', name: 'SF Fire Department · Actualités (RSS)', publisher: 'San Francisco Fire Department', category: 'public_safety', url: 'https://sf-fire.org/rss.xml', license: 'Official agency feed (titles/links)', minIntervalMin: 120, browser: false, confidence: ['medium', 'Avis administratifs du service ; pas un flux d’incidents.'] },
    { id: 'caiso-fuelmix', name: 'CAISO · Mix de production électrique du jour (Californie)', publisher: 'California Independent System Operator', category: 'energy', url: 'https://www.caiso.com/todays-outlook', license: 'Public operational data (attribution CAISO)', minIntervalMin: 60, browser: false, confidence: ['high', 'Zone CAISO (Californie), pas spécifique à San Francisco ; données opérationnelles révisables.'] },
    { id: 'openmeteo-aq', name: 'Open-Meteo · Qualité de l’air modélisée (CAMS), SoMa', publisher: 'Open-Meteo (données CAMS / Copernicus)', category: 'environment', url: 'https://open-meteo.com/en/docs/air-quality-api', license: 'CC BY 4.0', minIntervalMin: 60, browser: true, confidence: ['low', 'Valeur modélisée, pas une mesure de capteur.'],
      enabled: false, retired: 'En quarantaine depuis le 2026-10-14 : l’API gratuite d’Open-Meteo est réservée à un usage non commercial et CORE est un prototype d’entreprise présenté à des investisseurs (politique de données, Phase 5).' },
  ];
  const RULES = [
    ['infrastructure', /\b(street|sewer|paving|repav|utility|excavat|pipe|curb|sidewalk repair|infrastructure|seismic improvement|bridge)\b/i],
    ['mobility', /\b(muni|transit|bus|bike|bicycl|traffic|parking|pedestrian|street safety|e-device|rail|vehicle)\b/i],
    ['nature', /\b(tree|trees|park|green|garden|landscap|urban forest)\b/i],
    ['climate', /\b(climate|flood|heat|storm|rain|wind|fire weather|resilien|sea level|advisory|warning)\b/i],
    ['emergency', /\b(earthquake|seismic|emergency|evacuat|hazard)\b/i],
    ['buildings', /\b(building|housing|construction|permit|seismic retrofit|demolition|alteration)\b/i],
    ['energy', /\b(energy|solar|electric|power|gas|battery|electrification)\b/i],
    ['administration', /\b(ordinance|resolution|hearing|legislation|board|charter|budget|appropriat|motion)\b/i],
    ['health', /\b(health|clinic|hospital|safety)\b/i],
    ['economy', /\b(business|jobs|economic|workforce|bond|finance)\b/i],
    ['culture', /\b(festival|heritage|art|culture|cultural|month|celebrat|museum)\b/i],
    ['public_space', /\b(plaza|public space|sidewalk|accessib|playground)\b/i],
    ['urbanism', /\b(planning|zoning|land use|rezoning|general plan|design review|entitlement|urban design)\b/i],
    ['environment', /\b(air quality|pollution|emission|wildfire smoke|habitat|watershed|climate adaptation|biodiversity)\b/i],
    ['public_safety', /\b(fire|police|public safety|emergency response|rescue|fire code)\b/i],
    ['society', /\b(community|neighborhood|resident|youth|senior|equity|homeless|encampment)\b/i],
  ];
  // Statements that are not facts: kept, but never classified as observations or decisions.
  const statementKind = (text, fallback) => /\b(alleg\w*|accus\w*|lawsuit|sued|charged with)\b/i.test(text) ? 'allegation' : /\b(opinion|op-ed|commentary|editorial|column)\b/i.test(text) ? 'commentary' : fallback;
  const classify = text => RULES.filter(([, re]) => re.test(text || '')).map(([d]) => d);

  function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
  const clip = (s, n = 280) => { const t = String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  // Personal contact details never enter the store (emails and phone numbers in agency text are redacted).
  const scrub = t => String(t ?? '').replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[contact masqué]').replace(/\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, '[téléphone masqué]');
  // Timestamps without a zone (Socrata floating timestamps, date-only RSS dates) are San Francisco wall-clock
  // times: read them as America/Los_Angeles on every machine (a UTC CI runner must give the same instant).
  const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2}|\b(GMT|UTC|UT|PST|PDT|EST|EDT|CST|CDT|MST|MDT)\b)\s*$/i;
  const offsetMin = (t, tz) => { const m = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date(t)).find(p => p.type === 'timeZoneName').value.match(/GMT([+-]\d+)?(?::(\d+))?/); return m && m[1] ? Math.sign(+m[1]) * (Math.abs(+m[1]) * 60 + (+m[2] || 0)) : 0; };
  function iso(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? new Date(v).toISOString() : null;
    const s = String(v || '').trim(), t = Date.parse(s); if (!Number.isFinite(t)) return null;
    if (HAS_ZONE.test(s)) return new Date(t).toISOString();
    const localWall = /^\d{4}-\d{2}-\d{2}$/.test(s) ? t : t - new Date(t).getTimezoneOffset() * 60000; // wall-clock time as if UTC (bare ISO dates already parse as UTC)
    let utc = localWall - offsetMin(localWall, 'America/Los_Angeles') * 60000;
    utc = localWall - offsetMin(utc, 'America/Los_Angeles') * 60000; // second pass settles DST edges
    return new Date(utc).toISOString();
  }

  function verify(item) {
    const checks = [];
    let host = null; try { host = new URL(item.url).host; } catch (_) { /* invalid */ }
    checks.push({ id: 'https', pass: /^https:\/\//.test(item.url || '') });
    const open = OPEN_DATA_HOSTS.includes(host);
    checks.push({ id: 'official-host', pass: OFFICIAL_HOSTS.includes(host) || open, detail: open ? 'fournisseur de données ouvertes enregistré (non gouvernemental)' : null });
    checks.push({ id: 'published-date', pass: !!item.published });
    checks.push({ id: 'source-registered', pass: SOURCES.some(s => s.id === item.source) });
    return { status: checks.every(c => c.pass) ? (open ? 'registered-open-data' : 'official-source') : 'unverified', checks };
  }

  // Normalizers per source: raw row → item (or null). Never fills missing fields with invented values.
  const N = {
    'datasf-street-use': r => r.permit_number && r.latitude && r.longitude ? base('datasf-street-use', `${r.permit_number}@${r.cnn}`, `https://data.sf.gov/resource/b6tj-gt35.json?permit_number=${encodeURIComponent(r.permit_number)}`,
      `${r.permit_type} ${r.permit_number} — ${r.streetname || ''} (${r.cross_street_1 || ''} / ${r.cross_street_2 || ''})`, `${r.agent && /\b(inc|llc|co|company|corp|construction|engineering|electric|gas|department|communications?|group|telephone|cable\w*)\b/i.test(r.agent) ? r.agent : 'Titulaire'} · fenêtre ${String(r.permit_start_date || '').slice(0, 10)} → ${String(r.permit_end_date || '').slice(0, 10)} · statut ${r.status}`,
      r.approved_date, r.status === 'ACTIVE' ? 'ongoing-project' : 'approved-decision', ['infrastructure'], point(r.longitude, r.latitude), { cnn: r.cnn, permit_number: r.permit_number, status: r.status, start: String(r.permit_start_date || '').slice(0, 10), end: String(r.permit_end_date || '').slice(0, 10) }) : null,
    'datasf-building': r => r.permit_number && r.location ? base('datasf-building', r.permit_number, `https://data.sf.gov/resource/i98e-djp9.json?permit_number=${encodeURIComponent(r.permit_number)}`,
      `Permis de construire ${r.permit_number} — ${[r.street_number, r.street_name, r.street_suffix].filter(Boolean).join(' ')}`, `${r.permit_type_definition} · statut ${r.status} · ${clip(r.description, 160)}`,
      r.status === 'filed' ? r.filed_date : r.issued_date || r.filed_date, r.status === 'filed' ? 'proposal' : 'approved-decision', ['buildings'], point(r.location.coordinates[0], r.location.coordinates[1]), { permit_number: r.permit_number, status: r.status }) : null,
    'datasf-tree-removals': r => r.treeid && r.posteddate ? base('datasf-tree-removals', `${r.treeid}@${String(r.posteddate).slice(0, 10)}`, `https://data.sf.gov/resource/qrwx-q4gg.json?treeid=${encodeURIComponent(r.treeid)}`,
      `Avis d’abattage — arbre ${r.treeid}`, `${r.postedtype || 'Avis'} · ${clip(r.species, 80)}`, r.posteddate, 'public-notice', ['nature'], point(r.long, r.lat), { treeid: r.treeid }) : null,
    'datasf-closures': r => r.objectid && r.start_date ? base('datasf-closures', String(r.objectid), `https://data.sf.gov/resource/8x25-yybr.json?objectid=${encodeURIComponent(r.objectid)}`,
      `Fermeture ${r.type} — ${r.street} (${r.from_st} → ${r.to_st})`, `${clip(r.case_name, 80)} · ${String(r.start_date).slice(0, 10)} → ${String(r.end_date || '').slice(0, 10)} · ${r.status}`,
      r.created_date || null, /review/i.test(r.status) ? 'proposal' : 'approved-decision', ['events', 'mobility'], r.shape || null, { cnn: r.cnn, status: r.status, start: String(r.start_date).slice(0, 10), end: String(r.end_date || '').slice(0, 10) }) : null,
    'usgs-quakes': f => f && f.id && f.properties ? base('usgs-quakes', f.id, f.properties.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`,
      `Séisme M${f.properties.mag} — ${f.properties.place}`, `Magnitude ${f.properties.mag} (${f.properties.magType}), statut ${f.properties.status}${f.properties.status === 'automatic' ? ' (révisable)' : ''}`,
      new Date(f.properties.time).toISOString(), 'observation', ['emergency'], { type: 'Point', coordinates: f.geometry.coordinates.slice(0, 2) }, { mag: f.properties.mag, status: f.properties.status, depth_km: f.geometry.coordinates[2] }) : null,
    'nws-alerts': f => f && f.properties && f.properties.id ? base('nws-alerts', f.properties.id, f.properties['@id'] || f.id,
      `${f.properties.event} — ${clip(f.properties.areaDesc, 80)}`, `${f.properties.severity} · ${f.properties.certainty} · ${clip(f.properties.headline, 160)}`,
      f.properties.sent, 'prediction', ['climate'], null, { severity: f.properties.severity, expires: f.properties.expires }) : null,
    legistar: m => m && m.MatterId ? base('legistar', String(m.MatterId), `https://sfgov.legistar.com/LegislationDetail.aspx?ID=${m.MatterId}&GUID=${m.MatterGuid}`,
      `${m.MatterTypeName} ${m.MatterFile} — ${clip(m.MatterTitle || m.MatterName, 140)}`, `Statut officiel : ${m.MatterStatusName}${m.MatterBodyName ? ` · ${m.MatterBodyName}` : ''}`,
      m.MatterIntroDate, /pass|adopt|enact|approved|final/i.test(m.MatterStatusName || '') ? 'approved-decision' : /pending|committee|introduc|referr|hearing/i.test(m.MatterStatusName || '') ? 'proposal' : 'announcement', null, null, { file: m.MatterFile, type: m.MatterTypeName, status: m.MatterStatusName }) : null,
    // An http:// link on a registered official host is upgraded to https:// (verified for sf-fire.org on 2026-10-13).
    rss: (sourceId, it) => it && it.link && it.title ? base(sourceId, it.guid || it.link, upgrade(it.link), clip(it.title, 160), clip(it.description, 280), it.pubDate, statementKind(it.title, 'announcement'), null, null, {}) : null,
    'datasf-planning': r => r && r.record_id && r.open_date ? base('datasf-planning', r.record_id, `https://data.sf.gov/resource/qvu5-m3a2.json?record_id=${encodeURIComponent(r.record_id)}`,
      `Projet ${r.record_id} — ${clip(r.project_name || r.project_address, 100)}`, `Statut ${r.record_status} · ${clip(r.description, 220)}`, r.open_date,
      /approv/i.test(r.record_status || '') ? 'approved-decision' : /closed|withdr|cancel/i.test(r.record_status || '') ? 'completed-work' : 'proposal', ['urbanism', 'buildings'], null,
      { record_id: r.record_id, status: r.record_status, address: r.project_address || null, units_net: r.number_of_units_net != null ? Number(r.number_of_units_net) : null, corridor_street: /\b(FOLSOM|HOWARD) ST\b/i.test(r.project_address || '') ? (r.project_address.match(/\b(FOLSOM|HOWARD)\b/i)[1].toUpperCase()) : null }) : null,
    'datasf-311-soma': (r, o) => r && r.service_name && r.count ? base('datasf-311-soma', `${r.service_name}@${o.periodEnd}`, 'https://data.sf.gov/d/vw6y-z8j6',
      `311 · ${r.service_name} : ${Number(r.count)} demande(s) en 7 j (South of Market)`, `Compte agrégé des demandes 311 du ${o.periodStart} au ${o.periodEnd} ; demandes signalées, non vérifiées.`, `${o.periodEnd}T00:00:00Z`, 'statistic', ['society', 'public_space'], null,
      { service: r.service_name, count: Number(r.count), period: [o.periodStart, o.periodEnd], area: 'South of Market (analysis neighborhood)' }) : null,
    'datasf-business-soma': (r, o) => r && r.count != null ? base('datasf-business-soma', `soma@${o.periodEnd}`, 'https://data.sf.gov/d/g8m3-pdis',
      `${Number(r.count)} nouvel(le)s enregistrement(s) d’entreprise en 30 j (South of Market)`, `Compte agrégé du ${o.periodStart} au ${o.periodEnd} (date de début d’activité déclarée) ; aucun nom collecté.`, `${o.periodEnd}T00:00:00Z`, 'statistic', ['economy'], null,
      { count: Number(r.count), period: [o.periodStart, o.periodEnd], area: 'South of Market' }) : null,
    'caiso-fuelmix': (rows, o) => {
      const last = rows.filter(x => x.Time && Object.keys(x).length > 3).pop(); if (!last) return null;
      const num = k => Number(last[k]) || 0, ren = ['Solar', 'Wind', 'Geothermal', 'Biomass', 'Biogas', 'Small hydro'].reduce((a, k) => a + Math.max(0, num(k)), 0);
      const total = Object.keys(last).filter(k => k !== 'Time').reduce((a, k) => a + Math.max(0, num(k)), 0); if (!total) return null;
      return base('caiso-fuelmix', `caiso@${o.dayPacific}`, 'https://www.caiso.com/todays-outlook',
        `Réseau CAISO ${o.dayPacific} ${last.Time} (Pacifique) : ${Math.round(ren / total * 100)} % renouvelables (hors grande hydraulique)`, `Production instantanée ${Math.round(total)} MW, dont solaire ${Math.max(0, num('Solar'))} MW, éolien ${num('Wind')} MW, gaz ${num('Natural Gas')} MW, importations ${num('Imports')} MW.`,
        o.nowIso, 'observation', ['energy'], null, { time: `${o.dayPacific} ${last.Time}`, total_mw: Math.round(total), renewables_mw: Math.round(ren), renewables_pct: Math.round(ren / total * 100), area: 'CAISO balancing area' });
    },
    'openmeteo-aq': (j, o) => j && j.current && j.current.time ? base('openmeteo-aq', `soma@${j.current.time}`, 'https://open-meteo.com/en/docs/air-quality-api',
      `Qualité de l’air modélisée SoMa : US AQI ${j.current.us_aqi}, PM2,5 ${j.current.pm2_5} µg/m³`, `Modèle CAMS via Open-Meteo, heure ${j.current.time} UTC ; valeur modélisée, pas une mesure.`, `${j.current.time}:00Z`, 'prediction', ['environment', 'health'],
      { type: 'Point', coordinates: [-122.418, 37.775] }, { us_aqi: j.current.us_aqi, pm2_5: j.current.pm2_5, model: 'CAMS (Open-Meteo)' }) : null,
  };
  const upgrade = u => { try { const x = new URL(u); if (x.protocol === 'http:' && OFFICIAL_HOSTS.includes(x.host)) { x.protocol = 'https:'; return x.toString(); } } catch (_) { /* keep as is */ } return u; };
  const confidenceOf = s => ({ level: (s.confidence || ['medium'])[0], limitations: (s.confidence || [null, 'Non précisées.'])[1] });
  function point(lon, lat) { const x = Number(lon), y = Number(lat); return Number.isFinite(x) && Number.isFinite(y) && !(x === 0 && y === 0) ? { type: 'Point', coordinates: [x, y] } : null; }
  function base(source, nativeId, url, title, summary, published, kind, domains, geo, data) {
    const s = SOURCES.find(x => x.id === source);
    const item = { id: `${source}:${nativeId}`, source, source_name: s.name, publisher: s.publisher, license: s.license, url, title: clip(scrub(title), 200), summary: clip(scrub(summary)), published: iso(published), kind,
      domains: [...new Set([...(domains || []), ...classify(`${title} ${summary}`), s.category])].sort(), geo, geo_basis: geo ? 'source coordinates' : data && data.address ? 'adresse seulement (non géocodée)' : 'none (not geolocated)', data,
      confidence: confidenceOf(s) };
    item.verification = verify(item);
    item.hash = hash(JSON.stringify([item.title, item.summary, item.published, item.kind, item.data]));
    return item;
  }

  // Merge new items into the store: dedupe by id, detect changes by content hash, keep first/last seen.
  function merge(store, items, retrievedAt) {
    const by = new Map(store.items.map(i => [i.id, i])); let added = 0, changed = 0, unchanged = 0;
    for (const it of items) {
      const prev = by.get(it.id);
      if (!prev) { by.set(it.id, { ...it, retrieved_at: retrievedAt, first_seen: retrievedAt, last_seen: retrievedAt, revision: 1 }); added++; }
      else if (prev.hash !== it.hash) { by.set(it.id, { ...it, retrieved_at: retrievedAt, first_seen: prev.first_seen, last_seen: retrievedAt, revision: prev.revision + 1, changed_at: retrievedAt }); changed++; }
      else { prev.last_seen = retrievedAt; prev.confidence = it.confidence; prev.verification = it.verification; prev.domains = it.domains; unchanged++; } // metadata only; no revision
    }
    store.items = [...by.values()].sort((a, b) => String(b.published).localeCompare(String(a.published)) || a.id.localeCompare(b.id));
    return { added, changed, unchanged };
  }

  // Geolocation link to the corridor (derived): nearest segment within 60 m.
  function linkToCorridor(item, ctx, maxM = 60) {
    if (!item.geo || item.geo.type !== 'Point' || !ctx) return null;
    if (item.data && item.data.cnn) { const c = String(parseInt(item.data.cnn, 10)); if (ctx.segments.has(c)) return { segment: c, basis: 'observed (CNN field)', distance_m: Math.round(C.distanceToGeometry(item.geo.coordinates, ctx.segments.get(c).geometry)) }; }
    let best = null;
    for (const [cnn, s] of ctx.segments) { const d = C.distanceToGeometry(item.geo.coordinates, s.geometry); if (d <= maxM && (!best || d < best.distance_m)) best = { segment: cnn, basis: `derived (≤ ${maxM} m)`, distance_m: Math.round(d) }; }
    return best;
  }
  const kmFromSF = item => item.geo && item.geo.type === 'Point' ? C.distanceToGeometry(SF, item.geo) / 1000 : null;

  // Deterministic mission suggestions; deduplicated by key. Civic and agency news never auto-trigger missions.
  function suggest(item, ctx) {
    if (!TRUSTED.includes(item.verification.status)) return null;
    const link = linkToCorridor(item, ctx);
    if (link && ['datasf-street-use', 'datasf-building', 'datasf-tree-removals', 'datasf-closures'].includes(item.source))
      { const sp = ctx.segments.get(link.segment).properties; return { key: `corridor:${link.segment}`, type: 'corridor-change', segment: link.segment, reason: `${item.title} — ${item.kind} rattaché à ${sp.street} ${sp.from} → ${sp.to} (${link.basis}).`, item: item.id }; }
    if (item.source === 'usgs-quakes' && item.data.mag >= 3 && kmFromSF(item) <= 100)
      return { key: `seismic:${item.id}`, type: 'seismic-context', reason: `Séisme M${item.data.mag} à ${Math.round(kmFromSF(item))} km de San Francisco.`, item: item.id };
    if (item.source === 'nws-alerts' && ['Moderate', 'Severe', 'Extreme'].includes(item.data.severity))
      return { key: `weather:${item.id}`, type: 'weather-alert-context', reason: `Alerte NWS ${item.data.severity}.`, item: item.id };
    return null;
  }

  // Parse RSS 2.0 (title, link, guid, pubDate, description) with a small, dependency-free parser.
  function parseRss(xml) {
    const dec = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').trim();
    const tag = (s, t) => { const m = s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? dec(m[1]) : null; };
    return [...String(xml).matchAll(/<item[\s>]([\s\S]*?)<\/item>/g)].map(m => ({ title: tag(m[1], 'title'), link: tag(m[1], 'link'), guid: tag(m[1], 'guid'), pubDate: tag(m[1], 'pubDate'), description: tag(m[1], 'description') }));
  }

  function health(store, nowIso) {
    return SOURCES.map(s => {
      const st = store.sources[s.id] || {}, items = store.items.filter(i => i.source === s.id);
      const newest = items.reduce((m, i) => (i.published && i.published > m ? i.published : m), '');
      const ageDays = newest ? Math.floor((Date.parse(nowIso) - Date.parse(newest)) / 86400000) : null;
      return { id: s.id, name: s.name, category: s.category, browser: s.browser, enabled: s.enabled !== false, retired: s.retired || null, minIntervalMin: s.minIntervalMin, confidence: confidenceOf(s), lastSuccess: st.lastSuccess || null, lastError: st.lastError || null, lastAttempt: st.lastAttempt || null,
        items: items.length, newestPublished: newest || null, freshness: s.enabled === false ? `retired${ageDays !== null ? ` (stale ${ageDays} j)` : ''}` : ageDays === null ? 'no items' : ageDays > 365 ? `stale (${ageDays} j)` : `${ageDays} j`, ok: s.enabled === false ? null : !!st.lastSuccess && (!st.lastError || st.lastAttempt === st.lastSuccess) };
    });
  }
  function dueSources(store, now = Date.now(), browserOnly = false) {
    return SOURCES.filter(s => s.enabled !== false && (!browserOnly || s.browser) && (!store.sources[s.id] || !store.sources[s.id].lastAttempt || now - Date.parse(store.sources[s.id].lastAttempt) >= s.minIntervalMin * 60000));
  }

  // Bounded request per source (same in Node and browser). corridorCnns: string CNNs; now: Date.
  function request(sourceId, { now = new Date(), corridorCnns = [] } = {}) {
    const d = n => new Date(now.getTime() - n * 86400000).toISOString().slice(0, 10);
    const q = s => encodeURIComponent(s), cnns = corridorCnns.map(c => `'${c}'`).join(',');
    const bbox = 'within_box(location, 37.7895, -122.4190, 37.7700, -122.3945)';
    switch (sourceId) {
      case 'datasf-street-use': return { type: 'json', url: `https://data.sf.gov/resource/b6tj-gt35.json?$query=${q(`SELECT permit_number, permit_type, status, streetname, cross_street_1, cross_street_2, cnn, agent, approved_date, permit_start_date, permit_end_date, latitude, longitude WHERE cnn in (${cnns}) AND approved_date >= '${d(30)}' AND permit_type in ('Excavation','ExcStreet','StrtImprov','Boring','Emergency') ORDER BY approved_date DESC LIMIT 200`)}` };
      case 'datasf-building': return { type: 'json', url: `https://data.sf.gov/resource/i98e-djp9.json?$query=${q(`SELECT permit_number, permit_type_definition, status, filed_date, issued_date, street_number, street_name, street_suffix, description, location WHERE ${bbox} AND filed_date >= '${d(30)}' ORDER BY filed_date DESC LIMIT 200`)}` };
      case 'datasf-tree-removals': return { type: 'json', url: `https://data.sf.gov/resource/qrwx-q4gg.json?$query=${q(`SELECT treeid, postedtype, posteddate, species, lat, long WHERE posteddate >= '${d(90)}' AND lat::number between 37.7700 and 37.7895 AND long::number between -122.4190 and -122.3945 ORDER BY posteddate DESC LIMIT 200`)}` };
      case 'datasf-closures': return { type: 'json', url: `https://data.sf.gov/resource/8x25-yybr.json?$query=${q(`SELECT objectid, type, status, street, from_st, to_st, cnn, case_name, start_date, end_date, created_date, shape WHERE cnn in (${cnns}) AND end_date >= '${d(0)}' LIMIT 200`)}` };
      case 'usgs-quakes': return { type: 'geojson', url: `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=37.7749&longitude=-122.4194&maxradiuskm=100&starttime=${d(30)}&minmagnitude=2.5&orderby=time&limit=100` };
      case 'nws-alerts': return { type: 'geojson', url: 'https://api.weather.gov/alerts/active?zone=CAZ006' };
      // The public sfgov Legistar API returns no recent matters (newest modifications 2018–2021 on 2026-10-13):
      // request the 10 most recently modified so source health reveals staleness instead of hiding it.
      case 'legistar': return { type: 'json', url: `https://webapi.legistar.com/v1/sfgov/matters?$orderby=${q('MatterLastModifiedUtc desc')}&$top=10` };
      case 'rss-sfmta': return { type: 'rss', url: 'https://www.sfmta.com/blog/rss.xml' };
      case 'rss-publicworks': return { type: 'rss', url: 'https://sfpublicworks.org/rss.xml' };
      case 'rss-sfpuc': return { type: 'rss', url: 'https://www.sfpuc.gov/rss.xml' };
      case 'rss-recpark': return { type: 'rss', url: 'https://sfrecpark.org/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml' };
      case 'rss-sffire': return { type: 'rss', url: 'https://sf-fire.org/rss.xml' };
      // Personal fields (applicant, planner) are never requested.
      case 'datasf-planning': return { type: 'json', url: `https://data.sf.gov/resource/qvu5-m3a2.json?$query=${q(`SELECT record_id, record_type, project_name, description, record_status, project_address, open_date, number_of_units_net WHERE record_type = 'PRJ' AND open_date >= '${d(30)}' ORDER BY open_date DESC LIMIT 100`)}` };
      case 'datasf-311-soma': return { type: 'json', url: `https://data.sf.gov/resource/vw6y-z8j6.json?$query=${q(`SELECT service_name, count(*) AS count WHERE requested_datetime >= '${d(7)}' AND analysis_neighborhood = 'South of Market' GROUP BY service_name ORDER BY count DESC LIMIT 10`)}`, opts: { periodStart: d(7), periodEnd: d(0) } };
      case 'datasf-business-soma': return { type: 'json', url: `https://data.sf.gov/resource/g8m3-pdis.json?$query=${q(`SELECT count(*) AS count WHERE dba_start_date >= '${d(30)}' AND neighborhoods_analysis_boundaries = 'South of Market'`)}`, opts: { periodStart: d(30), periodEnd: d(0) } };
      case 'caiso-fuelmix': return { type: 'csv', url: 'https://www.caiso.com/outlook/current/fuelsource.csv', opts: { dayPacific: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now), nowIso: now.toISOString() } };
      case 'openmeteo-aq': return { type: 'json', url: 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.775&longitude=-122.418&current=pm2_5,us_aqi' };
      default: throw new TypeError(`source inconnue ${sourceId}`);
    }
  }
  // Raw response body → normalized items for one source.
  const parseCsv = text => { const [head, ...lines] = String(text).trim().split(/\r?\n/); const keys = head.split(','); return lines.map(l => Object.fromEntries(l.split(',').map((v, i) => [keys[i], v]))); };
  // opts: the request's period/date context (request(...).opts) for aggregated and daily sources.
  function itemsFrom(sourceId, body, opts = {}) {
    let rows;
    if (sourceId.startsWith('rss-')) rows = parseRss(body).map(it => N.rss(sourceId, it));
    else if (sourceId === 'caiso-fuelmix') rows = [N[sourceId](parseCsv(body), opts)];
    else if (sourceId === 'openmeteo-aq') rows = [N[sourceId](typeof body === 'string' ? JSON.parse(body) : body, opts)];
    else { const j = typeof body === 'string' ? JSON.parse(body) : body; rows = (Array.isArray(j) ? j : j.features || []).map(r => N[sourceId](r, opts)); }
    const seen = new Set(); // multi-address permits arrive as several rows: keep the first per id
    return rows.filter(it => it && !seen.has(it.id) && seen.add(it.id));
  }

  const FEEDS = { iso, request, itemsFrom, KINDS, SOURCES, OFFICIAL_HOSTS, OPEN_DATA_HOSTS, TRUSTED, confidenceOf, statementKind, parseCsv, classify, normalize: N, merge, verify, linkToCorridor, suggest, parseRss, health, dueSources, kmFromSF, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = FEEDS; else root.CORE_FEEDS = FEEDS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
