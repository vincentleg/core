// CORE — public-data eligibility and provenance policy (Phase 5). Enforced, not only documented:
// the collector refuses sources that are not "eligible", evidence from ineligible sources fails verification,
// and tests require every snapshot dataset, feed source and knowledge source to have an entry.
// Status: eligible | quarantined (rights unclear — not used) | excluded (deliberately not used).
(function (root) {
  'use strict';
  const V = '2026-10-14';
  const PDDL = 'ODC Public Domain Dedication and License (PDDL) — reuse and redistribution permitted';
  const datasf = (id, publisher, sensitivity, use, notes = null) => ({ publisher, url: `https://data.sf.gov/d/${id}`, licence: PDDL, access: 'DataSF SoQL public API, no key, bounded queries', public: true, sensitivity, redistribution: 'permitted (attribution courtesy)', verified: V, allowedUse: use, status: 'eligible', notes });
  const ENTRIES = {
    // Snapshot datasets (data/sf)
    'dataset:corridor': datasf('3psu-pn9h', 'SF Public Works (DPW Basemap)', 'low', 'street geometry of the corridor'),
    'dataset:intersections': datasf('gmfx-8h6i', 'City and County of San Francisco', 'low', 'intersection geometry'),
    'dataset:permits': datasf('b6tj-gt35', 'SF Public Works', 'medium', 'permit windows by organisation; personal contacts removed, only organisation holders kept', 'Administrative permits are not evidence of completed work.'),
    'dataset:large-excavations': datasf('i926-ujnc', 'SF Public Works', 'medium', 'large utility excavation permits (no network maps)'),
    'dataset:moratoria': datasf('5wbp-dwzt', 'SF Public Works', 'low', 'excavation moratorium streets'),
    'dataset:closures': datasf('8x25-yybr', 'SFMTA', 'low', 'temporary street closures'),
    'dataset:street-trees': datasf('tkzw-k3nq', 'SF Public Works (Bureau of Urban Forestry)', 'low', 'tree locations, species, plot size'),
    'dataset:tree-removals': datasf('qrwx-q4gg', 'SF Public Works', 'low', 'removal notices; contact text redacted'),
    'dataset:building-permits': datasf('i98e-djp9', 'Department of Building Inspection', 'medium', 'permit status and description; no applicant names', 'Status "issued" is not evidence of construction.'),
    'dataset:energy-benchmarks': datasf('96ck-qcfe', 'SF Environment', 'medium', 'self-reported building benchmarks at building level (published by the City)'),
    'dataset:parks': datasf('gtr9-ntp6', 'SF Recreation and Park Department', 'low', 'park locations'),
    'dataset:sidewalks': datasf('4g86-grxu', 'SFMTA (AECOM study, 2014)', 'low', 'sidewalk widths and Better Streets Plan classes (2014)'),
    // City Intelligence feed sources (src/feeds.js)
    'feed:datasf-street-use': datasf('b6tj-gt35', 'SF Public Works', 'medium', 'recent corridor permits; organisation holders only'),
    'feed:datasf-building': datasf('i98e-djp9', 'Department of Building Inspection', 'medium', 'recent permits in a bounding box; no applicant fields requested'),
    'feed:datasf-tree-removals': datasf('qrwx-q4gg', 'SF Public Works', 'low', 'recent removal notices'),
    'feed:datasf-closures': datasf('8x25-yybr', 'SFMTA', 'low', 'upcoming closures on the corridor'),
    'feed:datasf-planning': datasf('qvu5-m3a2', 'SF Planning Department', 'medium', 'project records; applicant and planner names never requested'),
    'feed:datasf-311-soma': datasf('vw6y-z8j6', 'SF 311', 'high', 'AGGREGATED counts by category only; individual requests (addresses, free text, media) never collected'),
    'feed:datasf-business-soma': datasf('g8m3-pdis', 'SF Treasurer & Tax Collector', 'high', 'ONE aggregated count; owner and business names never collected'),
    'feed:usgs-quakes': { publisher: 'U.S. Geological Survey', url: 'https://earthquake.usgs.gov/fdsnws/event/1/', licence: 'U.S. public domain (USGS)', access: 'FDSN public API', public: true, sensitivity: 'low', redistribution: 'permitted', verified: V, allowedUse: 'earthquake parameters', status: 'eligible' },
    'feed:nws-alerts': { publisher: 'National Weather Service', url: 'https://www.weather.gov/documentation/services-web-api', licence: 'U.S. public domain (NOAA/NWS)', access: 'api.weather.gov public API', public: true, sensitivity: 'low', redistribution: 'permitted', verified: V, allowedUse: 'active alerts for zone CAZ006', status: 'eligible' },
    'feed:legistar': { publisher: 'Clerk of the Board of Supervisors', url: 'https://sfbos.org/legislation', licence: 'Public records (metadata)', access: 'public Legistar web API', public: true, sensitivity: 'low', redistribution: 'titles, status and links only', verified: V, allowedUse: 'historical metadata (API frozen since 2020; collection retired)', status: 'eligible' },
    'feed:rss-sfmta': { publisher: 'SFMTA', url: 'https://www.sfmta.com/blog/rss.xml', licence: 'Official agency feed — titles, dates and links (fair use of metadata)', access: 'public RSS', public: true, sensitivity: 'low', redistribution: 'titles/links only, summaries clipped', verified: V, allowedUse: 'announcements metadata', status: 'eligible' },
    'feed:rss-publicworks': { publisher: 'SF Public Works', url: 'https://sfpublicworks.org/rss.xml', licence: 'Official agency feed — titles, dates and links', access: 'public RSS', public: true, sensitivity: 'low', redistribution: 'titles/links only, summaries clipped', verified: V, allowedUse: 'announcements metadata', status: 'eligible' },
    'feed:rss-sfpuc': { publisher: 'SF Public Utilities Commission', url: 'https://www.sfpuc.gov/rss.xml', licence: 'Official agency feed — titles, dates and links', access: 'public RSS', public: true, sensitivity: 'low', redistribution: 'titles/links only; staff emails redacted', verified: V, allowedUse: 'announcements metadata', status: 'eligible' },
    'feed:rss-recpark': { publisher: 'SF Recreation and Park Department', url: 'https://sfrecpark.org/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml', licence: 'Official agency feed — titles, dates and links', access: 'public RSS', public: true, sensitivity: 'low', redistribution: 'titles/links only', verified: V, allowedUse: 'announcements metadata', status: 'eligible' },
    'feed:rss-sffire': { publisher: 'San Francisco Fire Department', url: 'https://sf-fire.org/rss.xml', licence: 'Official agency feed — titles, dates and links', access: 'public RSS', public: true, sensitivity: 'low', redistribution: 'titles/links only', verified: V, allowedUse: 'administrative notices only (no incident data)', status: 'eligible' },
    'feed:caiso-fuelmix': { publisher: 'California ISO', url: 'https://www.caiso.com/todays-outlook', licence: 'caiso.com Terms of Use: public materials may be used if proprietary notices are kept and the California ISO is credited (checked 2026-10-14)', access: 'public CSV, one request per hour', public: true, sensitivity: 'low', redistribution: 'aggregate statewide figures with attribution', verified: V, allowedUse: 'statewide grid mix context; never presented as San Francisco data', status: 'eligible' },
    'feed:openmeteo-aq': { publisher: 'Open-Meteo (CAMS / Copernicus data)', url: 'https://open-meteo.com/en/terms', licence: 'Data CC BY 4.0; the free API may only be used for non-commercial purposes (terms checked 2026-10-14)', access: 'public API, no key', public: true, sensitivity: 'low', redistribution: 'CC BY 4.0 with attribution', verified: V, allowedUse: 'none until rights are confirmed', status: 'quarantined', notes: 'CORE is an investor-facing company prototype; non-commercial status is not established, so the free API is no longer called and its items are not published. Paid plans are excluded by the $0 rule.' },
    // Knowledge sources (data/knowledge/library.json)
    'knowledge:src-datasf': { publisher: 'City and County of San Francisco', url: 'https://data.sf.gov', licence: PDDL, access: 'dataset documentation and metadata API', public: true, sensitivity: 'low', redistribution: 'permitted', verified: V, allowedUse: 'documentation summaries', status: 'eligible' },
    'knowledge:src-usgs': { publisher: 'USGS', url: 'https://earthquake.usgs.gov', licence: 'U.S. public domain', access: 'documentation', public: true, sensitivity: 'low', redistribution: 'permitted', verified: V, allowedUse: 'documentation summaries', status: 'eligible' },
    'knowledge:src-nws': { publisher: 'NWS', url: 'https://www.weather.gov', licence: 'U.S. public domain', access: 'documentation', public: true, sensitivity: 'low', redistribution: 'permitted', verified: V, allowedUse: 'documentation summaries', status: 'eligible' },
    'knowledge:src-legistar': { publisher: 'SF Board of Supervisors', url: 'https://sfbos.org', licence: 'Public records', access: 'documentation', public: true, sensitivity: 'low', redistribution: 'summaries', verified: V, allowedUse: 'documentation summaries', status: 'eligible' },
    'knowledge:src-ggbhtd': { publisher: 'Golden Gate Bridge, Highway & Transportation District', url: 'https://www.goldengate.org', licence: 'Published facts (dimensions)', access: 'public website', public: true, sensitivity: 'low', redistribution: 'short factual metadata', verified: V, allowedUse: 'landmark dimensions', status: 'eligible' },
    'knowledge:src-core': { publisher: 'CORE repository', url: 'https://github.com/vincentleg/core', licence: 'Project documentation', access: 'repository', public: true, sensitivity: 'low', redistribution: 'permitted', verified: V, allowedUse: 'methods and rules', status: 'eligible' },
    'knowledge:src-openmeteo': { publisher: 'Open-Meteo', url: 'https://open-meteo.com/en/docs/air-quality-api', licence: 'CC BY 4.0 (documentation summary)', access: 'documentation', public: true, sensitivity: 'low', redistribution: 'summary with attribution', verified: V, allowedUse: 'documentation summary', status: 'eligible' },
    'knowledge:src-caiso': { publisher: 'California ISO', url: 'https://www.caiso.com/todays-outlook', licence: 'Public website (documentation summary)', access: 'documentation', public: true, sensitivity: 'low', redistribution: 'summary with attribution', verified: V, allowedUse: 'documentation summary', status: 'eligible' },
    // Deliberately excluded (recorded so they are never added by accident)
    'excluded:311-individual': { publisher: 'SF 311', url: 'https://data.sf.gov/d/vw6y-z8j6', licence: PDDL, access: 'public API', public: true, sensitivity: 'high', redistribution: '—', verified: V, allowedUse: 'none', status: 'excluded', notes: 'Individual requests contain addresses, free text and media about identifiable situations: aggregated counts only.' },
    'excluded:police-incidents': { publisher: 'SFPD', url: 'https://data.sf.gov/d/wg3w-h783', licence: PDDL, access: 'public API', public: true, sensitivity: 'high', redistribution: '—', verified: V, allowedUse: 'none', status: 'excluded', notes: 'Incident-level public-safety data is not necessary for CORE’s functions.' },
    'excluded:business-owner-names': { publisher: 'SF Treasurer & Tax Collector', url: 'https://data.sf.gov/d/g8m3-pdis', licence: PDDL, access: 'public API', public: true, sensitivity: 'high', redistribution: '—', verified: V, allowedUse: 'none', status: 'excluded', notes: 'Owner names of sole proprietors are personal data.' },
    'excluded:bart-api-demo-key': { publisher: 'BART', url: 'https://api.bart.gov', licence: 'BART developer terms', access: 'requires an API key', public: true, sensitivity: 'low', redistribution: '—', verified: V, allowedUse: 'none', status: 'excluded', notes: 'Requires a key (even the published demo key is a credential): not used.' },
    'excluded:utility-network-maps': { publisher: '—', url: '—', licence: 'not public', access: 'restricted', public: false, sensitivity: 'high', redistribution: '—', verified: V, allowedUse: 'none', status: 'excluded', notes: 'Underground utility and security-sensitive infrastructure maps are not public and are never used.' },
  };

  // Phase 6: commercial eligibility, attribution, retention and scope for every entry (derived from the licence basis).
  for (const [k, e] of Object.entries(ENTRIES)) {
    const pddl = /PDDL/.test(e.licence), usPd = /public domain/i.test(e.licence) && !pddl, rss = /agency feed/i.test(e.licence);
    e.commercialUse = e.status === 'quarantined' ? 'non établi (API gratuite réservée à un usage non commercial) — en quarantaine'
      : e.status === 'excluded' ? 'sans objet (exclu)' : pddl ? 'oui (dédicace au domaine public ODC-PDDL)' : usPd ? 'oui (domaine public des États-Unis)'
      : /caiso/.test(k) ? 'oui, avec mentions de propriété et crédit à la California ISO (conditions du site)' : rss ? 'métadonnées et liens seulement (titres, dates, liens vers la source)' : 'documentation résumée avec attribution';
    e.attribution = e.attribution || (pddl ? 'Courtoisie : « DataSF (ODC-PDDL) »' : /caiso/.test(k) ? 'Obligatoire : « California ISO »' : rss ? 'Lien vers l’article de l’agence' : usPd ? 'Courtoisie : agence fédérale citée' : 'Source citée');
    e.retention = e.retention || (e.status === 'eligible' ? 'Instantanés et éléments versionnés dans Git ; purgés de la publication si la source devient inéligible' : 'Aucune collecte ; éléments déjà collectés purgés de la publication');
    e.scope = e.scope || (k.startsWith('dataset:') ? 'Corridor Folsom / Howard (2nd → 11th St), instantané daté' : k.startsWith('feed:') ? 'Requêtes bornées (corridor, quartier ou zone) et fenêtres temporelles déclarées dans src/feeds.js' : 'Documentation');
  }
  const get = key => ENTRIES[key] || null;
  const eligible = key => !!(ENTRIES[key] && ENTRIES[key].status === 'eligible');
  // Policy key of an evidence reference (as produced by src/tools.js).
  function keyOfEvidence(e, env) {
    if (e.type === 'record') return `dataset:${e.dataset || String(e.ref).split(':')[0]}`;
    if (e.type === 'dataset') return `dataset:${e.ref}`;
    if (e.type === 'feed') { const it = env && env.feeds.items.find(i => i.id === e.ref); return it ? `feed:${it.source}` : `feed:${String(e.ref).split(':')[0]}`; }
    if (e.type === 'feed-source') return `feed:${e.ref}`;
    if (e.type === 'knowledge') { const d = env && env.knowledge.lib.documents.find(x => x.id === e.ref); return d ? `knowledge:${d.source}` : null; }
    if (e.type === 'knowledge-library' || e.type === 'graph') return 'knowledge:src-core';
    return null;
  }
  function checkEvidence(list, env) {
    const out = list.map(e => { const k = keyOfEvidence(e, env); return { ref: e.ref, key: k, eligible: !!k && eligible(k), status: k && ENTRIES[k] ? ENTRIES[k].status : 'unknown' }; });
    return { pass: out.every(x => x.eligible), items: out };
  }

  const POLICY = { VERIFIED: V, ENTRIES, get, eligible, keyOfEvidence, checkEvidence };
  if (typeof module !== 'undefined' && module.exports) module.exports = POLICY; else root.CORE_DATA_POLICY = POLICY;
})(typeof globalThis !== 'undefined' ? globalThis : this);
