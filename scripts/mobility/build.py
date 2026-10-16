#!/usr/bin/env python3
"""CORE V8 — San Francisco mobility simulation pipeline (Eclipse SUMO 1.27.1, EPL-2.0).

Real street network → (synthetic, labelled) demand → baseline → candidate interventions → SUMO runs (several seeds) →
metrics → verdict → compact replay traces for CORE World. Run with the SUMO Python environment:
  python3 -m venv <venv> && <venv>/bin/pip install eclipse-sumo==1.27.1 sumo-data==1.27.1
  <venv>/bin/python scripts/mobility/build.py [--fetch] [--seeds 5]
Sources: OpenStreetMap (ODbL 1.0, via Overpass, one bounded query); DataSF (PDDL): Traffic Signals ybh5-27n2,
Transit Only Lanes tzh6-6j82, Speed Limits 3t7b-gebn. NOT available: traffic volumes (none published), signal timing
(none published), Muni GTFS (licence requires an agreement the founder has not accepted). Demand, signal plans and bus
headways are therefore SYNTHETIC ASSUMPTIONS and every result is UNCALIBRATED.
"""
import json, os, sys, subprocess, hashlib, math, random, statistics, time, urllib.request, urllib.parse, xml.etree.ElementTree as ET, datetime, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'data', 'mobility')
WORK = os.environ.get('CORE_MOBILITY_WORK', os.path.join(os.path.expanduser('~'), '.core-mobility-work'))
BBOX = (-122.4115, 37.7725, -122.3965, 37.7860)  # W, S, E, N — SoMa grid around Folsom / Howard (3rd–9th)
SIM_END = 1800  # 30 simulated minutes
UA = {'User-Agent': 'CORE-mobility/1.0 (+https://github.com/vincentleg/core)'}
args = sys.argv[1:]
SEEDS = int(args[args.index('--seeds') + 1]) if '--seeds' in args else 5
import sumo
SUMO_HOME = os.path.dirname(sumo.__file__); TOOLS = os.path.join(SUMO_HOME, 'tools'); sys.path.append(TOOLS)
import sumolib
BIN = lambda n: os.path.join(os.path.dirname(sys.executable), n)
os.makedirs(WORK, exist_ok=True); os.makedirs(OUT, exist_ok=True)
sha = lambda b: hashlib.sha256(b if isinstance(b, bytes) else b.encode()).hexdigest()
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
sources = []

def http(url, data=None):
    # curl (system TLS) — the macOS system Python's LibreSSL fails the TLS handshake with some APIs.
    cmd = ['curl', '-sS', '--fail', '--retry', '3', '--retry-delay', '5', '-A', UA['User-Agent'], '--max-time', '180', url]
    if data is not None: cmd[1:1] = ['--data-binary', '@-']
    return subprocess.run(cmd, input=data, capture_output=True, check=True).stdout

# ---------- 1. sources ----------
osm_path = os.path.join(WORK, 'soma.osm.xml')
if '--fetch' in args or not os.path.exists(osm_path):
    W, S, E, N = BBOX
    q = f'[out:xml][timeout:120];(way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|unclassified)$"]({S},{W},{N},{E}););(._;>;);out meta;'
    raw = http('https://overpass-api.de/api/interpreter', urllib.parse.urlencode({'data': q}).encode())
    open(osm_path, 'wb').write(raw)
    json.dump({'retrieved_at': now(), 'sha256': sha(raw)}, open(osm_path + '.json', 'w'))
meta = json.load(open(osm_path + '.json'))
sources.append({'id': 'osm-soma', 'title': 'OpenStreetMap — drivable streets, SoMa (Overpass)', 'license': 'ODbL 1.0 — © OpenStreetMap contributors', 'url': 'https://www.openstreetmap.org/copyright', 'retrieved_at': meta['retrieved_at'], 'raw_sha256': meta['sha256'], 'bbox': BBOX})
def soda(id_, where):
    W, S, E, N = BBOX
    url = f'https://data.sf.gov/resource/{id_}.json?$limit=5000&$where=' + urllib.parse.quote(where.format(W=W, S=S, E=E, N=N))
    raw = http(url); sources.append({'id': id_, 'title': None, 'license': 'ODC Public Domain Dedication and License (PDDL)', 'url': f'https://data.sf.gov/d/{id_}', 'retrieved_at': now(), 'raw_sha256': sha(raw)}); return json.loads(raw)
cache = os.path.join(WORK, 'datasf.json')
if '--fetch' in args or not os.path.exists(cache):
    sig = soda('ybh5-27n2', "within_box(shape, {N}, {W}, {S}, {E})")
    tol = soda('tzh6-6j82', "intersects(shape, 'POLYGON(({W} {S}, {E} {S}, {E} {N}, {W} {N}, {W} {S}))')")
    json.dump({'signals': sig, 'transit_lanes': tol, 'sources': sources[1:]}, open(cache, 'w'))
d = json.load(open(cache)); sources[1:] = d['sources']
for s, t in zip(sources[1:], ['Traffic Signals (DataSF ybh5-27n2)', 'Transit Only Lanes (DataSF tzh6-6j82)']): s['title'] = t

# ---------- 2. network ----------
net_base = os.path.join(WORK, 'base.net.xml')
subprocess.run([BIN('netconvert'), '--osm-files', osm_path, '-o', net_base, '--geometry.remove', '--ramps.guess', '--junctions.join', '--tls.guess-signals', '--tls.discard-simple', '--tls.join',
                '--tls.default-type', 'static', '--osm.lane-access', '--remove-edges.isolated', '--keep-edges.components', '1', '--no-turnarounds', '--output.street-names', '--proj.utm', '--no-warnings'], check=True)
net = sumolib.net.readNet(net_base, withPrograms=True)
def lonlat(x, y): lon, lat = net.convertXY2LonLat(x, y); return [round(lon, 6), round(lat, 6)]
edges = [e for e in net.getEdges() if not e.getID().startswith(':') and e.allows('passenger')]
folsom = [e for e in edges if (e.getName() or '').lower().startswith('folsom')]
osm_tls = [lonlat(*net.getNode(n.getID()).getCoord()) for n in net.getNodes() if n.getType() == 'traffic_light']
sig_pts = [(float(s['shape']['coordinates'][0]), float(s['shape']['coordinates'][1])) for s in d['signals'] if s.get('shape')]
def near(a, b, m=35): return math.hypot((a[0] - b[0]) * 88200, (a[1] - b[1]) * 110574) < m
matched = sum(1 for p in osm_tls if any(near(p, q) for q in sig_pts))
folsom_lanes = sorted({e.getLaneNumber() for e in folsom})
tol_streets = sorted({(t.get('street') or t.get('streetname') or t.get('street_name') or '?') for t in d['transit_lanes']})

# ---------- 3. scenario networks (reversible patches over the same base, rebuilt by netconvert so that lane
# connections and signal programs are recomputed consistently) ----------
def folsom_right_lanes(): return [e for e in folsom if e.getLaneNumber() >= 3]
def patch(name, allow=None, tls='static'):
    p = os.path.join(WORK, f'{name}.net.xml'); cmd = [BIN('netconvert'), '-s', net_base, '-o', p, '--no-warnings', '--tls.default-type', tls]
    if tls != 'static': cmd += ['--tls.rebuild']
    if allow:
        e_file = os.path.join(WORK, f'{name}.edg.xml')
        open(e_file, 'w').write('<edges>' + ''.join(f'<edge id="{e.getID()}"><lane index="0" allow="{allow}"/></edge>' for e in folsom_right_lanes()) + '</edges>')
        cmd += ['-e', e_file]
    subprocess.run(cmd, check=True); return p
NETS = {'base': net_base, 'bus': patch('bus', 'bus'), 'diet': patch('diet', 'bicycle'), 'act': patch('act', None, 'actuated'), 'bus+act': patch('busact', 'bus', 'actuated')}

# ---------- 4. demand (synthetic, labelled) ----------
def demand(scale, seed):
    trips = os.path.join(WORK, f'trips-{scale}-{seed}.xml'); routes = os.path.join(WORK, f'routes-{scale}-{seed}.rou.xml')
    if not os.path.exists(routes):
        period = round(1.6 / scale, 3)  # ~1,100 car trips per 30 min at scale 1.0 (assumption, not a count)
        subprocess.run([sys.executable, os.path.join(TOOLS, 'randomTrips.py'), '-n', net_base, '-o', trips, '-r', routes, '-e', str(SIM_END), '-p', str(period), '--seed', str(seed),
                        '--fringe-factor', '8', '--min-distance', '400', '--validate', '--vehicle-class', 'passenger', '--prefix', 'car'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return routes
# Synthetic bus line along Folsom (headway assumption: 6 min), from the westmost to the eastmost Folsom edge reachable.
fe = sorted(folsom, key=lambda e: e.getFromNode().getCoord()[0])
def bus_routes():
    p = os.path.join(WORK, 'bus.rou.xml')
    best = None
    for a in fe[:6]:
        for b in fe[::-1][:6]:
            r = net.getShortestPath(a, b, vClass='bus')[0]
            if r and len(r) > 3 and (not best or len(r) > len(best)): best = r
    ids = ' '.join(e.getID() for e in best)
    open(p, 'w').write(f'<routes><vType id="bus" vClass="bus" guiShape="bus" length="12"/><route id="folsom-line" edges="{ids}"/><flow id="bus" type="bus" route="folsom-line" begin="0" end="{SIM_END}" period="360" departLane="best"/></routes>')
    return p, [lonlat(*sumolib.geomhelper.positionAtShapeOffset(e.getShape(), 0)) for e in best]
bus_file, bus_path = bus_routes()

# ---------- 5. runs ----------
SCEN = [  # id, label, network, demand scale, what changes, primitives for the 3D layer
    ('S0', 'Référence (situation modélisée)', 'base', 1.0, 'Réseau OSM, plans de feux fixes générés par SUMO (minutage réel inconnu), demande synthétique.'),
    ('A', 'Voie réservée bus sur Folsom', 'bus', 1.0, 'La voie de droite de Folsom (tronçons à 3 voies ou plus) est réservée aux bus.'),
    ('B', 'Feux adaptatifs (actionnés)', 'act', 1.0, 'Tous les feux passent en mode actionné par la demande (algorithme SUMO, pas un équipement réel).'),
    ('C', 'Voie cyclable protégée (régime de voirie)', 'diet', 1.0, 'La voie de droite de Folsom devient une voie cyclable : une voie voiture en moins.'),
    ('D', 'Gestion de la demande (−15 % de trajets voiture)', 'base', 0.85, 'Hypothèse : 15 % de trajets voiture en moins (ex. tarification, télétravail) — non modélisé causalement.'),
]
SEARCH = [(f'X{i}', net, scale) for i, (net, scale) in enumerate([(n, s) for n in ['base', 'bus', 'act', 'diet', 'bus+act'] for s in [1.0, 0.9, 0.85]])]
def run(net_id, scale, seed, fcd=None):
    tag = f'{net_id}-{scale}-{seed}'.replace('+', '_'); ti = os.path.join(WORK, f'ti-{tag}.xml'); em = os.path.join(WORK, f'em-{tag}.xml'); sm = os.path.join(WORK, f'sm-{tag}.xml')
    cmd = [BIN('sumo'), '-n', NETS[net_id], '-r', f'{demand(scale, seed)},{bus_file}', '--seed', str(seed), '-e', str(SIM_END + 900), '--tripinfo-output', ti, '--summary-output', sm,
           '--device.emissions.probability', '1', '--no-step-log', '--no-warnings', '--time-to-teleport', '300', '--ignore-route-errors']
    if fcd: cmd += ['--fcd-output', fcd, '--fcd-output.geo', '--device.fcd.begin', '600', '--device.fcd.period', '2']
    memo = os.path.join(WORK, f'res-{tag}.json')
    if not fcd and os.path.exists(memo): return json.load(open(memo))
    t0 = time.time(); subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); dt = time.time() - t0
    trips = ET.parse(ti).getroot().findall('tripinfo'); cars = [t for t in trips if t.get('vType') != 'bus']; buses = [t for t in trips if t.get('vType') == 'bus']
    co2 = sum(float(t.find('emissions').get('CO2_abs')) for t in trips if t.find('emissions') is not None) / 1e6  # kg
    halting = [int(s.get('halting')) for s in ET.parse(sm).getroot().findall('step')]
    tele = sum(1 for t in trips if float(t.get('waitingTime', 0)) >= 300)
    res = {'seed': seed, 'carTrips': len(cars), 'carTravelTime': statistics.mean(float(t.get('duration')) for t in cars), 'carDelay': statistics.mean(float(t.get('timeLoss')) for t in cars),
            'busTravelTime': statistics.mean(float(t.get('duration')) for t in buses) if buses else None, 'busTrips': len(buses), 'busWaiting': statistics.mean(float(t.get('waitingTime')) for t in buses) if buses else None, 'carLongWaits': sum(1 for t in cars if float(t.get('waitingTime', 0)) >= 120), 'co2kg': co2, 'peakHalting': max(halting), 'meanHalting': statistics.mean(halting), 'longWaits': tele, 'wallSec': round(dt, 2)}
    if not fcd: json.dump(res, open(memo, 'w'))
    return res

def summarize(runs):
    out = {}
    for k in ['carTravelTime', 'carDelay', 'busTravelTime', 'busWaiting', 'carLongWaits', 'busTrips', 'co2kg', 'peakHalting', 'meanHalting', 'carTrips']:
        v = [r[k] for r in runs if r[k] is not None]
        m = statistics.mean(v); sd = statistics.stdev(v) if len(v) > 1 else 0; ci = 2.776 * sd / math.sqrt(len(v)) if len(v) > 1 else None  # t(0.975, df=4) for 5 seeds
        out[k] = {'mean': round(m, 2), 'sd': round(sd, 2), 'ci95': round(ci, 2) if ci is not None else None, 'n': len(v)}
    return out
seeds = list(range(1, SEEDS + 1)); results = {}; t_all = time.time()
for sid, label, net_id, scale, what in SCEN:
    runs = [run(net_id, scale, s) for s in seeds]; results[sid] = {'id': sid, 'label': label, 'network': net_id, 'demandScale': scale, 'change': what, 'runs': runs, 'summary': summarize(runs)}
    print(sid, label, results[sid]['summary']['carDelay'], results[sid]['summary']['busTravelTime'])
# Verdicts: better only if the difference exceeds both CIs (conservative); everything stays uncalibrated → human review.
base = results['S0']['summary']
def cmp(k, s):
    a, b = base[k], s[k]; d = b['mean'] - a['mean']; sig = abs(d) > (a['ci95'] or 0) + (b['ci95'] or 0); return {'delta': round(d, 2), 'pct': round(100 * d / a['mean'], 1) if a['mean'] else None, 'beyondNoise': sig}
for sid, r in results.items():
    if sid == 'S0': continue
    c = {k: cmp(k, r['summary']) for k in ['carDelay', 'busTravelTime', 'co2kg', 'meanHalting']}
    better = [k for k, v in c.items() if v['beyondNoise'] and v['delta'] < 0]; worse = [k for k, v in c.items() if v['beyondNoise'] and v['delta'] > 0]
    r['comparison'] = c; r['improves'] = better; r['worsens'] = worse
    r['status'] = 'unsupported' if not better else 'promising-uncalibrated' if not worse else 'trade-off-uncalibrated'
# Explanations from the diagnostics (numbers only from the runs above).
gaps = len([e for e in folsom if e.getLaneNumber() < 3])
for sid, r in results.items():
    sm = r['summary']; b = base
    parts = [f"Retard moyen voiture {sm['carDelay']['mean']:.0f} s (référence {b['carDelay']['mean']:.0f} s), bus {sm['busTravelTime']['mean']:.0f} s (référence {b['busTravelTime']['mean']:.0f} s), attente moyenne des bus {sm['busWaiting']['mean']:.0f} s, {sm['carLongWaits']['mean']:.0f} voitures bloquées plus de 2 min en moyenne par simulation."]
    if sid == 'A': parts.append(f"Folsom compte {gaps} tronçons à moins de 3 voies où la voie bus s’interrompt : privées d’une voie, les voitures y forment des files qui remontent le corridor, et les bus y restent pris.")
    if sid == 'C': parts.append("Une voie voiture en moins sans baisse de demande : la capacité baisse, les files s’allongent (le modèle ne simule pas les cyclistes supplémentaires).")
    if sid == 'B': parts.append("Les feux actionnés réduisent les temps morts aux carrefours peu chargés ; le gain dépend de plans de feux réels que nous ne connaissons pas.")
    if sid == 'D': parts.append("Moins de trajets voiture : effet mécanique d’une hypothèse de demande, pas d’une mesure dont on connaîtrait la faisabilité.")
    r['explanation'] = ' '.join(parts)
# Small constrained search: 15 candidates, constraint filter, 3 seeds each.
search = {'generated': len(SEARCH), 'rejected': [], 'simulated': [], 'note': 'Grille de 15 configurations ; filtrage par contraintes ; 3 graines chacune ; aucun modèle de substitution (surrogate) utilisé.'}
for cid, net_id, scale in SEARCH:
    if net_id == 'diet' and scale < 0.9: search['rejected'].append({'id': cid, 'network': net_id, 'demandScale': scale, 'reason': 'Contrainte : un régime de voirie ne peut pas supposer en plus une baisse de demande non modélisée (double hypothèse non étayée).'}); continue
    rs = [run(net_id, scale, s) for s in seeds[:3]]; sm = summarize(rs); search.setdefault('wallSec', 0); search['wallSec'] = round(search['wallSec'] + sum(r['wallSec'] for r in rs), 1)
    search['simulated'].append({'id': cid, 'network': net_id, 'demandScale': scale, 'carDelay': sm['carDelay']['mean'], 'busTravelTime': sm['busTravelTime']['mean'], 'co2kg': sm['co2kg']['mean']})
pts = search['simulated']
for p in pts: p['pareto'] = not any(q is not p and q['carDelay'] <= p['carDelay'] and q['busTravelTime'] <= p['busTravelTime'] and q['co2kg'] <= p['co2kg'] and (q['carDelay'] < p['carDelay'] or q['busTravelTime'] < p['busTravelTime'] or q['co2kg'] < p['co2kg']) for q in pts)
compute_sec = round(sum(r['wallSec'] for x in results.values() for r in x['runs']) + sum(0 for _ in search['simulated']), 1)  # simulator wall time of the recorded runs (cache-independent)
supported = [s for s, r in results.items() if r.get('status') == 'promising-uncalibrated']
verdict = ('Aucune solution suffisamment étayée : ' if not supported else 'Pistes techniquement prometteuses dans un modèle non calibré : ' + ', '.join(supported) + '. ') + 'Le modèle n’est pas calibré (aucun comptage de trafic, aucun minutage de feux réel, demande synthétique) : aucun scénario ne peut être recommandé sans données réelles et revue humaine.'

# ---------- 6. replay traces (S0, A, C) and geometry for the 3D layer ----------
VIEW = (-122.4085, 37.7765, -122.4005, 37.7830)
def trace(net_id, scale, sid):
    f = os.path.join(WORK, f'fcd-{sid}.xml'); run(net_id, scale, 1, fcd=f); frames = {}
    for ts in ET.iterparse(f, events=('end',)):
        el = ts[1]
        if el.tag != 'timestep': continue
        t = float(el.get('time'))
        if t > 600 + 240: break
        vs = []
        for v in el.findall('vehicle'):
            x, y = float(v.get('x')), float(v.get('y'))
            if VIEW[0] <= x <= VIEW[2] and VIEW[1] <= y <= VIEW[3]: vs.append([v.get('id'), round(x, 6), round(y, 6), round(float(v.get('angle')), 0), 1 if v.get('type') == 'bus' else 0])
        frames[int(t)] = vs; el.clear()
    return {'scenario': sid, 'start': 600, 'step': 2, 'frames': [frames[k] for k in sorted(frames)]}
traces = {sid: trace(n, sc, sid) for sid, n, sc in [('S0', 'base', 1.0), ('A', 'bus', 1.0), ('B', 'act', 1.0), ('C', 'diet', 1.0), ('D', 'base', 0.85)]}
lanes_geo = {'type': 'FeatureCollection', 'features': []}
for e in folsom:
    if e.getLaneNumber() >= 3:
        ln = e.getLanes()[0]; lanes_geo['features'].append({'type': 'Feature', 'geometry': {'type': 'LineString', 'coordinates': [lonlat(x, y) for x, y in ln.getShape()]}, 'properties': {'edge': e.getID(), 'width': ln.getWidth(), 'name': e.getName()}})
tls_geo = {'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': p}, 'properties': {'confirmedByDataSF': any(near(p, q) for q in sig_pts)}} for p in osm_tls]}

manifest = {'generated_at': now(), 'generator': 'scripts/mobility/build.py', 'engine': 'Eclipse SUMO 1.27.1 (EPL-2.0)', 'bbox': BBOX, 'simulatedSeconds': SIM_END, 'seeds': seeds, 'sources': sources,
  'network': {'edges': len(edges), 'folsomEdges': len(folsom), 'folsomLaneCounts': folsom_lanes, 'signalsInModel': len(osm_tls), 'signalsDataSF': len(sig_pts), 'signalsMatchedWithin35m': matched, 'transitOnlyLaneStreets': tol_streets},
  'synthetic': ['Demande voiture : trajets aléatoires (randomTrips, graine fixe), environ 1 100 trajets / 30 min — hypothèse, aucun comptage public disponible.',
                'Plans de feux : générés par SUMO (fixes ou actionnés) — aucun minutage réel publié.',
                'Ligne de bus : synthétique sur Folsom, un bus toutes les 6 min — le GTFS Muni exige un accord de licence non accepté.',
                'Émissions : modèle HBEFA par défaut de SUMO — estimation, flotte non calibrée.'],
  'calibration': 'NON CALIBRÉ — aucun résultat ne décrit le trafic réel de San Francisco.',
  'blockers': ['Comptages de trafic : aucun jeu public trouvé sur DataSF.', 'Minutage des feux : non publié.', 'GTFS Muni : accord de licence (indemnisation, droit californien) — décision du fondateur requise.'],
  'reproduce': 'python3 -m venv <venv> && <venv>/bin/pip install eclipse-sumo==1.27.1 sumo-data==1.27.1 && <venv>/bin/python scripts/mobility/build.py --fetch --seeds 5',
  'computeSeconds': compute_sec, 'searchComputeSeconds': search.get('wallSec')}
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
json.dump({'scenarios': list(results.values()), 'search': search, 'verdict': verdict, 'busRoute': bus_path, 'objectives': ['retard moyen des voitures (s)', 'temps de parcours des bus (s)', 'CO2 estimé (kg)']}, open(os.path.join(OUT, 'results.json'), 'w'), ensure_ascii=False)
json.dump({'folsomRightLanes': lanes_geo, 'signals': tls_geo}, open(os.path.join(OUT, 'geometry.json'), 'w'))
for sid, tr in traces.items(): json.dump(tr, open(os.path.join(OUT, f'trace-{sid}.json'), 'w'), separators=(',', ':'))
print('verdict:', verdict); print('compute s', compute_sec, 'signals model/DataSF/matched', len(osm_tls), len(sig_pts), matched, 'folsom lanes', folsom_lanes)
