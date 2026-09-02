// Script ponctuel pour la Grèce UNIQUEMENT (pas un remplacement de build-country-communes.js,
// toujours utilisé pour tous les autres pays) : GeoNames n'a AUCUN fichier de codes postaux pour ce
// pays (téléchargement export/zip/GR.zip -> 404, vérifié — même cas que la Bosnie-Herzégovine/le
// Monténégro/le Kosovo). Contrairement à ces trois-là, cependant, l'article Wikipédia "Postal codes
// in Greece" ne liste AUCUNE commune individuelle (juste une carte des préfixes à deux chiffres et
// une description du système, vérifié) — inutilisable comme source de rapprochement. Reconstruit à
// la place depuis le jeu de données tiers MentatInnovations/grpostcodes (licence Apache 2.0,
// github.com/MentatInnovations/grpostcodes) : 1 250 codes postaux grecs DÉJÀ géolocalisés
// (latitude/longitude), ce qui permet ici un rapprochement PAR COORDONNÉES — la même méthode que le
// pipeline standard (nearest(), voir build-country-communes.js), plutôt que le rapprochement par NOM
// utilisé pour la Bosnie/le Monténégro/le Kosovo (dont les sources tierces n'avaient pas de
// coordonnées). PAS une source officielle (contrairement à Wikipédia) ni un annuaire tiers
// spécialisé comme postanskibroj.cu.rs pour le Monténégro : un simple jeu de données communautaire,
// choix de dernier recours documenté comme tel (voir README, "Pays couverts"). Couverture
// géographique vérifiée avant usage : les 1 250 codes couvrent bien l'ensemble du pays (préfixes à
// deux chiffres de 10 à 90, Crète/Rhodes/Thrace incluses), pas seulement l'agglomération d'Athènes.
const fs = require('fs');
const path = require('path');

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

// Huit exonymes/formes classiques ou latinisées repérés dans l'échantillon des ~150 plus grandes
// communes du pays (le reste déjà bon, y compris les formes accentuées façon ELOT 743 déjà
// utilisées par GeoNames pour la quasi-totalité du pays — Thessaloníki, Pátra, Lárisa,
// Irákleion...) : "Athens" (exonyme anglais, remplacé par "Athína" — déjà présent dans la liste de
// noms alternatifs de cette même entrée, cohérent avec la convention accentuée du reste du jeu de
// données), "Piraeus" -> "Peiraiás", "Volos" -> "Vólos" (pas un exonyme cette fois mais un accent
// manquant), "Sparta" -> "Spárti" (forme classique/latine, pas la forme grecque moderne), "Mytilene"
// -> "Mytilíni", "Zakynthos" -> "Zákynthos" (accent manquant), "Rhodes" -> "Ródos" (forme
// anglicisée), "Corfu" -> "Kérkyra" (seul vrai exonyme étranger du lot, sans aucun rapport
// phonétique avec l'endonyme grec — Kerkyra/Corcyra, contrairement aux sept autres qui ne sont que
// des transformations phonétiques du même nom).
const NAME_OVERRIDES = {
  'Athens': 'Athína',
  'Piraeus': 'Peiraiás',
  'Volos': 'Vólos',
  'Sparta': 'Spárti',
  'Mytilene': 'Mytilíni',
  'Zakynthos': 'Zákynthos',
  'Rhodes': 'Ródos',
  'Corfu': 'Kérkyra'
};
function cleanName(raw){ return NAME_OVERRIDES[raw] || raw; }

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180, dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function buildGrid(points){
  const grid = new Map();
  const cell = (lat, lon) => Math.round(lat*10) + '_' + Math.round(lon*10);
  points.forEach(p => {
    const k = cell(p.lat, p.lon);
    if(!grid.has(k)) grid.set(k, []);
    grid.get(k).push(p);
  });
  return { grid, cell };
}
// maxKm bien plus généreux que les 15 km du pipeline standard : 1 250 points pour tout le pays
// (contre des dizaines de milliers dans un fichier GeoNames classique) laissent forcément des zones
// rurales bien plus vastes entre deux codes postaux connus — un rayon trop strict aurait laissé la
// majorité des petits villages sans aucun code postal assigné.
function nearest(gridObj, lat, lon, maxKm){
  const { grid } = gridObj;
  const cLat = Math.round(lat*10), cLon = Math.round(lon*10);
  let best = null, bestDist = Infinity;
  for(let dLat=-4; dLat<=4; dLat++){
    for(let dLon=-4; dLon<=4; dLon++){
      const bucket = grid.get((cLat+dLat) + '_' + (cLon+dLon));
      if(!bucket) continue;
      for(const p of bucket){
        const d = haversineKm(lat, lon, p.lat, p.lon);
        if(d < bestDist){ bestDist = d; best = p; }
      }
    }
  }
  return (best && bestDist <= maxKm) ? best : null;
}

// Fichier gr-postal-raw.csv : "tk","territory","lat","lon" (en-tête inclus) — 1 250 lignes.
const csvRaw = fs.readFileSync(path.join(__dirname, 'gr-postal-raw.csv'), 'utf8');
const postalPoints = csvRaw.split('\n').slice(1).filter(Boolean).map(line => {
  const parts = line.split('","').map(s => s.replace(/^"|"$/g, ''));
  return { postcode: parts[0], lat: parseFloat(parts[2]), lon: parseFloat(parts[3]) };
}).filter(p => p.postcode && !isNaN(p.lat) && !isNaN(p.lon));
const postalGrid = buildGrid(postalPoints);

const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', 'GR_dump.txt'), 'utf8');
const rows = dumpRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
const places = rows
  .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]))
  .map(c => ({
    geonameid: c[0],
    name: cleanName(c[1]),
    lat: parseFloat(c[4]),
    lon: parseFloat(c[5]),
    pop: parseInt(c[14], 10) || 0
  }))
  .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name);

const seen = new Map();
for(const p of places){
  const key = p.name.toLowerCase() + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
  const existing = seen.get(key);
  if(!existing || p.pop > existing.pop) seen.set(key, p);
}
const deduped = Array.from(seen.values());

// geonameid -> nom canonique, UNIQUEMENT pour les communes qui ont bien reçu un code postal —
// repris ensuite par build-gr-aliases.js (même principe que canonicalByGeonameId dans
// build-aliases.js/build-me-communes.js), pour ne jamais faire pointer un alias vers une commune
// absente de communes-gr.txt.
const canonicalByGeonameId = {};
const lines = deduped.map(p => {
  const near = nearest(postalGrid, p.lat, p.lon, 30);
  const cp = near ? near.postcode : '';
  if(!cp) return null; // sans code postal on ne peut pas désambiguïser à l'affichage -> écarté
  canonicalByGeonameId[p.geonameid] = p.name;
  return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${cp};;${p.name}`;
}).filter(Boolean);

const outPath = path.join(__dirname, '..', 'public', 'data', 'communes-gr.txt');
fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(__dirname, 'gr-canonical-by-geonameid.json'), JSON.stringify(canonicalByGeonameId), 'utf8');
console.log('GR : ', places.length, 'lieux bruts ->', deduped.length, 'dédoublonnés ->', lines.length, 'avec code postal ->', outPath);
