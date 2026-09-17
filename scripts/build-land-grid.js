// Construit lib/land-grid.bin : grille terre/eau mondiale (pas de 0,05°, ~5,5 km) tirée de Natural Earth 1:10m (domaine
// public, https://www.naturalearthdata.com) — terres (ne_10m_land) + petites îles (ne_10m_minor_islands) − lacs
// (ne_10m_lakes). Le moteur s'en sert pour refuser un trajet PAR LA ROUTE dont le trait à vol d'oiseau passe longuement
// sur l'eau (mer entre deux pays de la même masse terrestre, golfe, grand lac) : voir waterRunKm dans lib/trip-engine.js.
//
//   node scripts/build-land-grid.js <dossier contenant ne_10m_land/, ne_10m_lakes/, ne_10m_minor_islands/>
//
// Format : en-tête « LANDGRID1 » (9 octets), largeur et hauteur (uint16 LE), puis pour chaque ligne (du nord au sud) un
// nombre de segments (uint16) et les longueurs de segments alternés eau/terre en commençant par l'eau (uint16 chacun).
// Une cellule est « terre » si son centre est à l'intérieur d'un polygone de terres (règle pair-impair) ou si un trait de
// côte la traverse, et si son centre est hors lac.
const fs = require('fs');
const path = require('path');

const STEP = 0.05, W = Math.round(360 / STEP), H = Math.round(180 / STEP);
const dir = process.argv[2];
if(!dir){ console.error('usage : node scripts/build-land-grid.js <dossier Natural Earth>'); process.exit(1); }

// Lecture minimale d'un .shp de polygones (type 5) : liste d'anneaux [[lon, lat], …]
function readRings(file){
  const b = fs.readFileSync(file);
  const rings = [];
  let off = 100;
  while(off < b.length){
    const len = b.readInt32BE(off + 4) * 2; // longueur du contenu en mots de 16 bits
    const rec = off + 8;
    const type = b.readInt32LE(rec);
    if(type === 5){
      const nParts = b.readInt32LE(rec + 36), nPts = b.readInt32LE(rec + 40);
      const partsOff = rec + 44, ptsOff = partsOff + 4 * nParts;
      for(let p = 0; p < nParts; p++){
        const start = b.readInt32LE(partsOff + 4 * p), end = p + 1 < nParts ? b.readInt32LE(partsOff + 4 * (p + 1)) : nPts;
        const ring = new Float64Array((end - start) * 2);
        for(let i = start; i < end; i++){ ring[(i - start) * 2] = b.readDoubleLE(ptsOff + 16 * i); ring[(i - start) * 2 + 1] = b.readDoubleLE(ptsOff + 16 * i + 8); }
        rings.push(ring);
      }
    }
    off = rec + len;
  }
  return rings;
}
// Rasterisation pair-impair : bits[y * W + x] = 1 si le centre de la cellule est dans l'ensemble des anneaux.
// Cases traversées par un trait de côte : marquées « terre » (touchEdges), pour ne pas perdre les terres plus étroites
// qu'une case — anneaux d'atolls (Majuro, Tarawa), flèches et presqu'îles — dont le centre tomberait sur l'eau.
function markEdges(bits, rings){
  rings.forEach(r => {
    const n = r.length / 2;
    for(let i = 0; i < n; i++){
      const x1 = r[i * 2], y1 = r[i * 2 + 1], j = (i + 1) % n, x2 = r[j * 2], y2 = r[j * 2 + 1];
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / (STEP / 2)));
      for(let k = 0; k <= steps; k++){
        const x = x1 + (x2 - x1) * k / steps, y = y1 + (y2 - y1) * k / steps;
        const row = Math.min(H - 1, Math.max(0, Math.floor((90 - y) / STEP))), col = Math.min(W - 1, Math.max(0, Math.floor((x + 180) / STEP)));
        bits[row * W + col] = 1;
      }
    }
  });
  return bits;
}
function rasterize(rings){
  const bits = new Uint8Array(W * H);
  const buckets = Array.from({ length: H }, () => []);
  rings.forEach(r => {
    const n = r.length / 2;
    for(let i = 0; i < n; i++){
      const x1 = r[i * 2], y1 = r[i * 2 + 1], j = (i + 1) % n, x2 = r[j * 2], y2 = r[j * 2 + 1];
      if(y1 === y2) continue;
      const yMin = Math.min(y1, y2), yMax = Math.max(y1, y2);
      // lignes dont le centre (90 - (y + 0,5) × STEP) est dans [yMin, yMax)
      const rowFrom = Math.max(0, Math.ceil((90 - yMax) / STEP - 0.5)), rowTo = Math.min(H - 1, Math.floor((90 - yMin) / STEP - 0.5));
      for(let row = rowFrom; row <= rowTo; row++){
        const lat = 90 - (row + 0.5) * STEP;
        if(lat < yMin || lat >= yMax) continue;
        buckets[row].push(x1 + (lat - y1) / (y2 - y1) * (x2 - x1));
      }
    }
  });
  for(let row = 0; row < H; row++){
    const xs = buckets[row].sort((a, b) => a - b);
    for(let k = 0; k + 1 < xs.length; k += 2){
      const c0 = Math.max(0, Math.ceil((xs[k] + 180) / STEP - 0.5)), c1 = Math.min(W - 1, Math.floor((xs[k + 1] + 180) / STEP - 0.5));
      for(let c = c0; c <= c1; c++) bits[row * W + c] = 1;
    }
    buckets[row] = null;
  }
  return bits;
}
const t0 = Date.now();
const landRings = readRings(path.join(dir, 'ne_10m_land', 'ne_10m_land.shp'));
const land = markEdges(rasterize(landRings), landRings);
const islandRings = readRings(path.join(dir, 'ne_10m_minor_islands', 'ne_10m_minor_islands.shp'));
const islands = markEdges(rasterize(islandRings), islandRings);
const lakes = rasterize(readRings(path.join(dir, 'ne_10m_lakes', 'ne_10m_lakes.shp')));
const out = [Buffer.from('LANDGRID1')];
const head = Buffer.alloc(4); head.writeUInt16LE(W, 0); head.writeUInt16LE(H, 2); out.push(head);
let landCells = 0, totalRuns = 0;
for(let row = 0; row < H; row++){
  const runs = [];
  let cur = 0, len = 0;
  for(let c = 0; c < W; c++){
    const v = (land[row * W + c] || islands[row * W + c]) && !lakes[row * W + c] ? 1 : 0;
    landCells += v;
    if(v === cur) len++;
    else { runs.push(len); cur = v; len = 1; }
  }
  runs.push(len);
  const b = Buffer.alloc(2 + runs.length * 2);
  b.writeUInt16LE(runs.length, 0);
  runs.forEach((r, i) => b.writeUInt16LE(r, 2 + i * 2));
  out.push(b);
  totalRuns += runs.length;
}
const file = path.join(__dirname, '..', 'lib', 'land-grid.bin');
fs.writeFileSync(file, Buffer.concat(out));
console.log('grille ' + W + '×' + H + ', ' + (landCells / (W * H) * 100).toFixed(1) + ' % de terre, ' + totalRuns + ' segments, ' +
  Math.round(fs.statSync(file).size / 1024) + ' Ko, ' + Math.round((Date.now() - t0) / 1000) + ' s -> ' + file);
