// Étend la carte (jusqu'ici France seule) pour couvrir aussi l'Espagne, le Portugal et l'Andorre.
// Reprend le même principe que l'existant (projection équirectangulaire simple, calibrée sur une
// latitude centrale, contours simplifiés en chemins SVG) — voir projectLonLat() dans app.js pour
// la formule exacte (recopiée ici à l'identique pour rester cohérent).
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'data', 'france-map.json');
const old = JSON.parse(fs.readFileSync(OUT, 'utf8'));

// ---- 1. Dé-projeter les tracés existants (France) vers lon/lat avec l'ANCIENNE projection ----
function parsePathToLonLat(d, proj){
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const pts = [];
  for(let i=0; i<nums.length; i+=2){
    const x = nums[i], y = nums[i+1];
    const lon = (x - proj.offX) / (proj.cosLat0 * proj.scale);
    const lat = -(y - proj.offY) / proj.scale;
    pts.push([lon, lat]);
  }
  return pts;
}
const mainlandLL = parsePathToLonLat(old.mainlandPath, old.proj);
const corsicaLL = parsePathToLonLat(old.corsicaPath, old.proj);

// ---- 2. Charger les contours Espagne/Portugal (déjà simplifiés, ~50-60 points) ----
function loadGeoJsonRing(file){
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  const geom = d.features[0].geometry;
  // Polygon -> [ [lon,lat], ... ] (premier anneau = contour extérieur) ; MultiPolygon -> le plus
  // grand polygone (écarte les îles annexes, cohérent avec le choix déjà fait pour la France qui
  // ne garde que continent + Corse, pas chaque îlot).
  if(geom.type === 'Polygon') return geom.coordinates[0];
  let best = geom.coordinates[0][0];
  for(const poly of geom.coordinates){ if(poly[0].length > best.length) best = poly[0]; }
  return best;
}
const spainLL = loadGeoJsonRing('ESP.geojson');
const portugalLL = loadGeoJsonRing('PRT.geojson');

// ---- 3. Andorre (absente des jeux de données simplifiés courants, micro-état) : contour OSM via
// Nominatim (© contributeurs OpenStreetMap, licence ODbL — même source/licence que les autres
// données OSM déjà utilisées ailleurs dans l'app), sous-échantillonné : bien plus détaillé que
// nécessaire pour une carte décorative à cette échelle. ----
const andRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'AND3.geojson'), 'utf8'));
const andGeom = andRaw.features[0].geometry;
const andFull = andGeom.type === 'Polygon' ? andGeom.coordinates[0] : andGeom.coordinates[0][0];
const ANDORRA_TARGET_POINTS = 24;
const step = Math.max(1, Math.floor(andFull.length / ANDORRA_TARGET_POINTS));
const andorraLL = andFull.filter((_, i) => i % step === 0);

// ---- 4. Nouvelle projection : centrée pour que France + Espagne + Portugal + Andorre tiennent
// toutes dans le même viewBox, avec la même marge proportionnelle que l'existant. ----
const allLL = [...mainlandLL, ...corsicaLL, ...spainLL, ...portugalLL, ...andorraLL];
const lons = allLL.map(p => p[0]), lats = allLL.map(p => p[1]);
const minLon = Math.min(...lons), maxLon = Math.max(...lons);
const minLat = Math.min(...lats), maxLat = Math.max(...lats);
const centerLat = (minLat + maxLat) / 2;
const cosLat0 = Math.cos(centerLat * Math.PI / 180);

const vb = old.viewBox; // garde le même viewBox (640x640) pour ne rien changer côté rendu
const PAD = 18; // marge en unités SVG, cohérente avec l'espacement visuel actuel
const spanX = (maxLon - minLon) * cosLat0;
const spanY = (maxLat - minLat);
const scale = Math.min((vb.W - 2*PAD) / spanX, (vb.H - 2*PAD) / spanY);
const offX = PAD - minLon * cosLat0 * scale;
const offY = (vb.H - PAD) + minLat * scale; // Y s'inverse (nord en haut)

function project(lon, lat){
  return [lon * cosLat0 * scale + offX, -lat * scale + offY];
}
function toPath(pts){
  return pts.map((p, i) => {
    const [x, y] = project(p[0], p[1]);
    return (i === 0 ? 'M ' : 'L ') + x.toFixed(1) + ' ' + y.toFixed(1);
  }).join(' ') + ' Z';
}

const result = {
  viewBox: vb,
  proj: { cosLat0, scale, offX, offY },
  mainlandPath: toPath(mainlandLL),
  corsicaPath: toPath(corsicaLL),
  spainPath: toPath(spainLL),
  portugalPath: toPath(portugalLL),
  andorraPath: toPath(andorraLL)
};
fs.writeFileSync(OUT, JSON.stringify(result), 'utf8');
console.log('Nouvelle projection :', { centerLat, cosLat0, scale, offX, offY });
console.log('Écrit dans', OUT);
