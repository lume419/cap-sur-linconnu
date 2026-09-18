// Grille terre/eau (lib/land-grid.bin, construite par scripts/build-land-grid.js depuis Natural Earth 1:10m, domaine
// public) : isLand(lat, lon), waterRunKm(…) (plus longue portion d'un trait à vol d'oiseau sur l'eau) et landPathKm(…)
// (chemin par la terre sur la grille).
// Chargée paresseusement ; absente, toutes les fonctions répondent « terre » (aucun trajet refusé).
const fs = require('fs');
const path = require('path');

let GRID = null; // { w, h, step, rows: Array<Uint16Array> } — longueurs de segments eau/terre alternés par ligne
let STATUS = 'non chargée';
// Fichier tronqué ou d'une autre version : les lectures au-delà du tampon levaient RangeError à la PREMIÈRE
// vérification de mer, pas au chargement, et chaque appel relançait la lecture du fichier (7e audit). En-tête, largeur,
// hauteur et longueur de chaque ligne sont désormais vérifiés une fois pour toutes ; une grille refusée équivaut à une
// grille absente : « terre » partout, aucun trajet refusé, mais l'état est visible dans /api/status.
function load(){
  if(GRID !== null) return GRID;
  try {
    const b = fs.readFileSync(path.join(__dirname, 'land-grid.bin'));
    if(b.length < 13 || b.toString('latin1', 0, 9) !== 'LANDGRID1') throw new Error('en-tête absent ou d\'une autre version');
    const w = b.readUInt16LE(9), h = b.readUInt16LE(11);
    if(!(w > 0) || !(h > 0)) throw new Error('dimensions ' + w + '×' + h);
    const rows = new Array(h);
    let off = 13;
    for(let r = 0; r < h; r++){
      if(off + 2 > b.length) throw new Error('fichier tronqué ligne ' + r + '/' + h);
      const n = b.readUInt16LE(off); off += 2;
      if(off + 2 * n > b.length) throw new Error('fichier tronqué ligne ' + r + '/' + h);
      // Positions de début des segments (cumul), pour une recherche dichotomique
      const starts = new Uint16Array(n);
      let acc = 0;
      for(let i = 0; i < n; i++){ starts[i] = acc; acc += b.readUInt16LE(off + 2 * i); }
      if(acc !== w) throw new Error('ligne ' + r + ' : ' + acc + ' cases au lieu de ' + w);
      off += 2 * n;
      rows[r] = starts;
    }
    GRID = { w, h, step: 360 / w, rows };
    STATUS = w + '×' + h;
  } catch(e){
    // ENOENT compris (7e audit) : sans la grille, plus aucune traversée maritime n'est détectée — un silence complet
    // laissait croire que le contrôle fonctionnait.
    console.warn('[land-grid] grille indisponible (' + (e.code === 'ENOENT' ? 'lib/land-grid.bin absent' : e.message) + ') : toutes les vérifications terre/mer répondent « terre ».');
    STATUS = 'indisponible (' + (e.code || e.message) + ')';
    GRID = false;
  }
  return GRID;
}
// État pour GET /api/status : « 4096×2048 », « indisponible (ENOENT) »…
function status(){ load(); return STATUS; }
function isLand(lat, lon){
  const g = load();
  if(!g) return true;
  const r = Math.min(g.h - 1, Math.max(0, Math.floor((90 - lat) / g.step)));
  let c = Math.floor((((lon + 180) % 360) + 360) % 360 / g.step);
  if(c >= g.w) c = g.w - 1;
  const starts = g.rows[r];
  let lo = 0, hi = starts.length - 1;
  while(lo < hi){ const mid = (lo + hi + 1) >> 1; if(starts[mid] <= c) lo = mid; else hi = mid - 1; }
  return (lo & 1) === 1; // segments alternés en commençant par l'eau
}
// Ponts et chaussées de plus de ~10 km au-dessus de l'eau (extrémités relevées sur les voies OpenStreetMap portant ce nom,
// septembre 2026) : un point sur l'eau à moins de FIXED_LINK_KM de leur axe compte comme « terre ». Les franchissements plus
// courts (Bosphore, Kertch, Rion-Antirion, Grand Belt avec Sprogø…) passent par la tolérance d'une case d'eau de landPathKm.
const FIXED_LINKS = [
  { name: 'Pont Hong Kong–Zhuhai–Macao', a: [22.2126, 113.5838], b: [22.3175, 113.959], osm: 'way/165957815' },
  { name: 'Pont de la baie de Hangzhou', a: [30.3848, 121.1691], b: [30.5828, 121.0364], osm: 'way/1389427541' },
  { name: 'Lake Pontchartrain Causeway', a: [30.0216, -90.1539], b: [30.3641, -90.0938], osm: 'way/23989963' },
  { name: 'Chesapeake Bay Bridge–Tunnel', a: [36.9166, -76.1305], b: [37.1175, -75.9694], osm: 'way/20375737' },
  { name: 'Pont de la baie de Jiaozhou', a: [36.0876, 120.1211], b: [36.1604, 120.3571], osm: 'way/135971579' },
  { name: 'Pont du Donghai', a: [30.6242, 122.082], b: [30.8824, 121.8813], osm: 'way/10411013' },
  { name: "Pont de l'Øresund", a: [55.6618, 12.6283], b: [55.5793, 12.809], osm: 'way/23283662' },
  { name: 'Pont de la Confédération', a: [46.1636, -63.8151], b: [46.2513, -63.7052], osm: 'way/4233040' },
  { name: 'Pont Sultan Abdul Halim Muadzam Shah (Penang)', a: [5.2913, 100.2948], b: [5.2434, 100.4664], osm: 'way/248191579' },
  { name: 'Pont de Penang', a: [5.3609, 100.3143], b: [5.3549, 100.3914], osm: 'way/23108661' },
  { name: 'Pont Rio–Niterói', a: [-22.889, -43.2204], b: [-22.8808, -43.1094], osm: 'way/5082900' },
  { name: 'Pont Vasco de Gama', a: [38.7865, -9.1001], b: [38.7244, -8.9725], osm: 'way/4247904' },
  { name: 'Pont du Grand Belt (E20)', a: [55.2997, 10.8526], b: [55.3514, 11.1432], osm: 'way/2032610' },
  { name: 'Chaussée du roi Fahd', a: [26.2117, 50.2674], b: [26.1698, 50.4332], osm: 'way/4815374' },
  { name: 'Chaussée Cheikh Jaber (Koweït)', a: [29.2993, 47.9171], b: [29.6432, 48.0066], osm: 'way/24828297' }
];
// Couloir large : le trait à vol d'oiseau d'un trajet qui emprunte le pont ne suit pas son axe exact.
const FIXED_LINK_KM = 12;
// Barrières : chapelets d'îles que la grille relie à tort alors qu'aucune route ne les traverse. Kvarken (Suède ↔ Finlande) :
// seule liaison, le ferry Wasaline Umeå–Vaasa ; ligne tracée dans le détroit entre l'archipel de Holmön (SE) et Valsörarna (FI).
const BARRIERS = [
  { name: 'Kvarken', a: [64.00, 20.97], b: [63.30, 20.97] }
];
const BARRIER_KM = 3;
function distToSegKm(lat, lon, a, b){
  const kx = 111.32 * Math.cos((a[0] + b[0]) / 2 * Math.PI / 180), ky = 110.57;
  const bx = (b[1] - a[1]) * kx, by = (b[0] - a[0]) * ky, px = (lon - a[1]) * kx, py = (lat - a[0]) * ky;
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / (bx * bx + by * by)));
  return Math.hypot(px - t * bx, py - t * by);
}
// Le trait (lat1, lon1) → (lat2, lon2) coupe-t-il une barrière ? (intersection de segments en coordonnées planes locales)
function crossesBarrier(lat1, lon1, lat2, lon2){
  const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  return BARRIERS.some(x => {
    const p1 = [lon1, lat1], p2 = [lon2, lat2], q1 = [x.a[1], x.a[0]], q2 = [x.b[1], x.b[0]];
    const d1 = cross(q1[0], q1[1], q2[0], q2[1], p1[0], p1[1]), d2 = cross(q1[0], q1[1], q2[0], q2[1], p2[0], p2[1]);
    const d3 = cross(p1[0], p1[1], p2[0], p2[1], q1[0], q1[1]), d4 = cross(p1[0], p1[1], p2[0], p2[1], q2[0], q2[1]);
    return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
  });
}
function nearBarrier(lat, lon){ return BARRIERS.some(x => distToSegKm(lat, lon, x.a, x.b) <= BARRIER_KM); }
function nearFixedLink(lat, lon){
  for(const l of FIXED_LINKS){
    const kx = 111.32 * Math.cos((l.a[0] + l.b[0]) / 2 * Math.PI / 180), ky = 110.57;
    const bx = (l.b[1] - l.a[1]) * kx, by = (l.b[0] - l.a[0]) * ky, px = (lon - l.a[1]) * kx, py = (lat - l.a[0]) * ky;
    const t = Math.max(0, Math.min(1, (px * bx + py * by) / (bx * bx + by * by)));
    const dx = px - t * bx, dy = py - t * by;
    if(dx * dx + dy * dy <= FIXED_LINK_KM * FIXED_LINK_KM) return true;
  }
  return false;
}
// Plus longue portion continue sur l'eau (km) le long du trait (interpolation linéaire en lat/lon, pas de ~2 km). stopAt :
// arrêt dès que la portion atteint cette longueur (réponse suffisante pour un refus, calcul écourté).
// Écart de longitude par le plus court côté (un trait Fidji 179,9° → -179,9° fait 0,2°, pas 359,8°).
function lonDelta(lon1, lon2){ let d = lon2 - lon1; if(d > 180) d -= 360; else if(d < -180) d += 360; return d; }
function waterRunKm(lat1, lon1, lat2, lon2, totalKm, stopAt){
  const g = load();
  if(!g || !(totalKm > 0)) return 0;
  const n = Math.max(2, Math.ceil(totalKm / 2));
  const stepKm = totalKm / n;
  const dLon = lonDelta(lon1, lon2);
  let run = 0, best = 0;
  for(let i = 0; i <= n; i++){
    const t = i / n, la = lat1 + (lat2 - lat1) * t, lo = lon1 + dLon * t; // isLand ramène la longitude dans [-180, 180[
    if(isLand(la, lo) || nearFixedLink(la, lo)){ run = 0; }
    else {
      run += stepKm;
      if(run > best){ best = run; if(stopAt && best >= stopAt) return best; }
    }
  }
  return best;
}
// Chemin par la terre entre deux points, sur la grille (8 voisins), d'au plus limitKm : A* restreint à l'ellipse où
// d(départ, case) + d(case, arrivée) ≤ limitKm. Case franchissable : terre (y compris une case
// traversée par un trait de côte, voir scripts/build-land-grid.js), axe d'une liaison fixe, et les
// cases de départ et d'arrivée (lieux côtiers) ; jamais une case à moins de BARRIER_KM d'une barrière. Renvoie la longueur
// trouvée (km) ou Infinity.
// Symétrique : les extrémités sont rangées dans un ordre fixe avant la recherche (le garde-fou d'expansions rendait le
// résultat dépendant du sens : Stepantsminda → Kirchroth 2 739 km, sens inverse Infinity).
// deadline (facultatif, horodatage Date.now()) : au-delà, recherche abandonnée et réponse Infinity (« pas de chemin »,
// donc trajet refusé : jamais un trajet accepté faute de temps). Vérifiée toutes les 500 expansions.
// Résultats mémorisés par couple de cases : une réponse trouvée (longueur L) vaut pour toute limite ≥ L, un échec complet
// (pas une interruption) pour toute limite ≤ celle essayée.
const MAX_EXPANSIONS = 60000;
const PATH_CACHE = new Map();
function cellKm(g, r){ return { dx: g.step * 111.32 * Math.cos((90 - (r + 0.5) * g.step) * Math.PI / 180), dy: g.step * 110.57 }; }
function landPathKm(lat1, lon1, lat2, lon2, limitKm, deadline){
  const g = load();
  if(!g) return 0;
  const toRC = (la, lo) => [Math.min(g.h - 1, Math.max(0, Math.floor((90 - la) / g.step))), Math.floor((((lo + 180) % 360) + 360) % 360 / g.step) % g.w];
  let [r0, c0] = toRC(lat1, lon1), [r1, c1] = toRC(lat2, lon2);
  if(r0 * g.w + c0 > r1 * g.w + c1){ [r0, c0, r1, c1] = [r1, c1, r0, c0]; }
  const cacheKey = (r0 * g.w + c0) + ':' + (r1 * g.w + c1);
  const cached = PATH_CACHE.get(cacheKey);
  if(cached){
    if(isFinite(cached.km) && cached.km <= limitKm) return cached.km;
    if(cached.failLimit >= limitKm) return Infinity;
  }
  if(deadline && Date.now() > deadline) return Infinity;
  const res = landPathSearch(g, r0, c0, r1, c1, limitKm, deadline);
  if(res !== null){
    if(PATH_CACHE.size > 50000) PATH_CACHE.clear();
    const entry = PATH_CACHE.get(cacheKey) || { km: Infinity, failLimit: -1 };
    if(isFinite(res)) entry.km = Math.min(entry.km, res); else entry.failLimit = Math.max(entry.failLimit, limitKm);
    PATH_CACHE.set(cacheKey, entry);
  }
  return res === null ? Infinity : res;
}
// null : recherche interrompue par la date limite (résultat non mémorisé).
// Franchissabilité de chaque case (hors extrémités), calculée à la première demande : 0 inconnue, 1 oui, 2 non (7200 × 3600
// octets). Évite, à chaque expansion, la dichotomie de isLand et le parcours des liaisons fixes.
let PASSABLE = null;
function cellPassable(g, r, c){
  if(!PASSABLE) PASSABLE = new Uint8Array(g.w * g.h);
  const k = r * g.w + c;
  let v = PASSABLE[k];
  if(!v){
    const la = 90 - (r + 0.5) * g.step, lo = (c + 0.5) * g.step - 180;
    v = nearBarrier(la, lo) ? 2 : (isLand(la, lo) || nearFixedLink(la, lo)) ? 1 : 2;
    PASSABLE[k] = v;
  }
  return v === 1;
}
function landPathSearch(g, r0, c0, r1, c1, limitKm, deadline){
  const center = (r, c) => [90 - (r + 0.5) * g.step, (c + 0.5) * g.step - 180];
  const km = (la1, lo1, la2, lo2) => {
    let dLon = Math.abs(lo2 - lo1); if(dLon > 180) dLon = 360 - dLon;
    const x = dLon * 111.32 * Math.cos((la1 + la2) / 2 * Math.PI / 180), y = (la2 - la1) * 110.57;
    return Math.sqrt(x * x + y * y);
  };
  const passable = (r, c) => ((r === r0 && c === c0) || (r === r1 && c === c1)) || cellPassable(g, r, c);
  const key = (r, c) => r * g.w + c;
  const goal = key(r1, c1);
  const [gla, glo] = center(r1, c1), [sla, slo] = center(r0, c0);
  const best = new Map([[key(r0, c0), 0]]);
  // tas binaire minimal sur f = g + h
  const heap = [[km(sla, slo, gla, glo), 0, r0, c0]];
  const push = n => { heap.push(n); let i = heap.length - 1; while(i > 0){ const p = (i - 1) >> 1; if(heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if(heap.length){ heap[0] = last; let i = 0; for(;;){ const l = 2 * i + 1, rr = l + 1; let m = i; if(l < heap.length && heap[l][0] < heap[m][0]) m = l; if(rr < heap.length && heap[rr][0] < heap[m][0]) m = rr; if(m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  let expanded = 0;
  while(heap.length){
    const [f, gc, r, c] = pop();
    if(f > limitKm) return Infinity;
    const k = key(r, c);
    if(k === goal) return gc;
    if(gc > (best.get(k) ?? Infinity)) continue;
    if(++expanded > MAX_EXPANSIONS) return Infinity; // garde-fou
    if(deadline && expanded % 500 === 0 && Date.now() > deadline) return null;
    const { dx, dy } = cellKm(g, r);
    for(let dr = -1; dr <= 1; dr++) for(let dc = -1; dc <= 1; dc++){
      if(!dr && !dc) continue;
      const nr = r + dr, nc = (c + dc + g.w) % g.w;
      if(nr < 0 || nr >= g.h) continue;
      const ng = gc + Math.sqrt((dc * dx) ** 2 + (dr * dy) ** 2);
      const nk = key(nr, nc);
      if(ng >= (best.get(nk) ?? Infinity)) continue;
      const h = km(90 - (nr + 0.5) * g.step, (nc + 0.5) * g.step - 180, gla, glo);
      if(ng + h > limitKm) continue;
      if(!passable(nr, nc)) continue;
      best.set(nk, ng);
      push([ng + h, ng, nr, nc]);
    }
  }
  return Infinity;
}
module.exports = { isLand, waterRunKm, landPathKm, crossesBarrier, FIXED_LINKS, BARRIERS, available: () => !!load(), status };
