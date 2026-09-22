// Script ponctuel (septembre 2026) : RUSSIE (RU) et SVALBARD ET JAN MAYEN (SJ).
//
// Les deux ont un vrai fichier de codes postaux GeoNames (export/zip/RU.zip, SJ.zip) : retour au
// principe du pipeline STANDARD (build-country-communes.js, utilisé pour l'Ukraine et la Biélorussie)
// — chaque lieu habité reçoit le code postal du point postal le plus proche à moins de 15 km. Un lieu sans point
// postal assez proche était ÉCARTÉ jusqu'au 21/09/2026 (« sans code, impossible de le distinguer à l'affichage de
// ses homonymes ») ; il est désormais publié avec un code VIDE — le code postal aide à retrouver sa ville, il ne
// décide pas si elle existe. 15 498 lieux russes concernés. Trois différences, écrites ici :
//
// 1. RÉGION : le fichier postal russe donne ses noms de région en cyrillique (« Адыгея Республика »)
//    alors que GeoNames range les noms de lieux en translittération latine (« Maykop »). Pour ne pas
//    mélanger les écritures sur une même ligne, la région vient de admin1CodesASCII.txt (GeoNames,
//    latin), par le code admin1 DU LIEU lui-même.
// 2. PRÉCISION DES POINTS POSTAUX RUSSES, mesurée avant de trancher : 26 925 codes sont géolocalisés
//    précisément (précision GeoNames 4), 16 529 seulement estimés (précision 1). Garder les deux ne
//    rattache que ~1 190 lieux de plus, sans coût mesurable : les deux précisions sont gardées, comme
//    pour tous les pays standard.
// 3. VILLES SANS POINT POSTAL À MOINS DE 15 KM : même ainsi, 16 villes de plus de 10 000 habitants
//    restaient sans code (Noïabrsk 110 000 hab., Kogalym, Nadym, Monchegorsk, Ielizovo…) — leurs
//    points postaux existent mais sont décalés de plus de 15 km. Pour les lieux d'au moins 10 000
//    habitants SEULEMENT, un second rapprochement par NOM est tenté : le nom russe du lieu dans les
//    noms alternatifs GeoNames (langue « ru », entrée du lieu elle-même) doit être IDENTIQUE au nom
//    de localité du fichier postal (« Ноябрьск », pas « Ноябрьск 1 »), à moins de 60 km — pas par
//    région : le fichier postal range Noïabrsk dans l'oblast de Tioumen (78), GeoNames dans le district
//    des Iamalo-Nénètses (87), deux découpages légitimes d'un même territoire gigogne. Entre plusieurs
//    lignes homonymes, le plus petit code (bureau principal) est retenu. Résultat mesuré : 4 villes
//    rattachées (dont Noïabrsk, 629800). Les 12 autres n'ont toujours PAS de code, faute de donnée fiable :
//    absentes du fichier postal (Kogalym, Monchegorsk, Nadym, Dalnegorsk, Kovdor…) ou géolocalisées
//    à plus de 60 km de leur position réelle (Ielizovo placée à ~190 km, sur les coordonnées de
//    Petropavlovsk). Limite assumée plutôt qu'un code deviné — mais elles sont PUBLIÉES depuis le
//    21/09/2026, code vide, au lieu d'être écartées.
//
// CRIMÉE : GeoNames range quelques lieux de Crimée et Sébastopol sous RU (admin1 RU.47 pour
// Sébastopol) tout en gardant la Crimée sous UA dans le dump ukrainien. Repris TEL QUEL, sans retouche
// éditoriale politique — même principe que pour le Sahara occidental, le nord de Chypre ou le Kosovo.
//
// SVALBARD ET JAN MAYEN : codes postaux norvégiens réels (9170 Longyearbyen, 9178 Barentsburg, 9173
// Ny-Ålesund, 9175 Sveagruva, 8099 Jan Mayen). Les lieux abandonnés (Pyramiden, Grumantbyen : PPLQ)
// sont exclus comme partout ; les stations isolées sans point postal à moins de 15 km (Hornsund,
// Hopen Radio, Herwighamma sur Bjørnøya — les points postaux de Bjørnøya et Hopen portent tous deux
// les mêmes coordonnées de remplissage, 78,267 N 14,830 E, fausses pour ces deux îles) sont écartées.

const fs = require('fs');
const path = require('path');
// Corrections communes à tous les générateurs de lieux (audit n° 11) : noms nettoyés, lieux écartés, quasi-doublons —
// voir scripts/communes-corrections.js.
const { excludePlace, preparePlaceName, dropNearDuplicates } = require('./communes-corrections.js');

const COUNTRIES = ['RU', 'SJ'];
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180, dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function buildGrid(points){
  const grid = new Map();
  points.forEach(p => {
    const k = Math.round(p.lat*10) + '_' + Math.round(p.lon*10);
    if(!grid.has(k)) grid.set(k, []);
    grid.get(k).push(p);
  });
  return grid;
}
function nearest(grid, lat, lon, maxKm){
  const cLat = Math.round(lat*10), cLon = Math.round(lon*10);
  let best = null, bestDist = Infinity;
  for(let dLat=-1; dLat<=1; dLat++){
    for(let dLon=-1; dLon<=1; dLon++){
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
function readAdmin1Names(){
  const map = new Map();
  fs.readFileSync(path.join(__dirname, 'admin1CodesASCII.txt'), 'utf8').split('\n').forEach(l => {
    const f = l.split('\t');
    if(f[0] && f[1]) map.set(f[0], f[1]);
  });
  return map;
}
const admin1Names = readAdmin1Names();

for(const country of COUNTRIES){
  const postal = fs.readFileSync(path.join(__dirname, 'postal', country + '_postal.txt'), 'utf8')
    .split('\n').filter(Boolean).map(l => l.split('\t'))
    .map(c => ({ postcode: c[1], place: c[2], code1: c[4] || '', lat: parseFloat(c[9]), lon: parseFloat(c[10]) }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lon));
  const grid = buildGrid(postal);

  const places = fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8')
    .split('\n').filter(Boolean).map(l => l.split('\t'))
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]) && !excludePlace(country, c[0], preparePlaceName(country, c[0], c[1]), parseFloat(c[4]), parseFloat(c[5])))
    .map(c => ({ id: c[0], name: preparePlaceName(country, c[0], c[1]), lat: parseFloat(c[4]), lon: parseFloat(c[5]), admin1: c[10] || '', pop: parseInt(c[14], 10) || 0 }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name);

  // Dédoublonnage identique au pipeline standard : même nom + coordonnées à ~1 km près.
  const seen = new Map();
  for(const p of places){
    const k = p.name.toLowerCase() + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
    const prev = seen.get(k);
    if(!prev || p.pop > prev.pop) seen.set(k, p);
  }
  const deduped = Array.from(seen.values());

  // Rapprochement par nom (point 3 de l'en-tête), préparé seulement pour les villes concernées.
  const byName = new Map();
  postal.forEach(pt => { if(!byName.has(pt.place)) byName.set(pt.place, []); byName.get(pt.place).push(pt); });
  const rescueIds = new Set(deduped.filter(p => p.pop >= 10000 && !nearest(grid, p.lat, p.lon, 15)).map(p => p.id));
  const ruNames = new Map();
  if(rescueIds.size && fs.existsSync(path.join(__dirname, 'altnames', country + '.txt'))){
    fs.readFileSync(path.join(__dirname, 'altnames', country + '.txt'), 'utf8').split('\n').forEach(l => {
      const c = l.split('\t');
      if(c[2] === 'ru' && rescueIds.has(c[1])){ if(!ruNames.has(c[1])) ruNames.set(c[1], []); ruNames.get(c[1]).push(c[3]); }
    });
  }
  let sansCode = 0, parNom = 0;
  const lines = deduped.map(p => {
    let near = nearest(grid, p.lat, p.lon, 15);
    if(!near && rescueIds.has(p.id)){
      for(const ru of (ruNames.get(p.id) || [])){
        const hit = (byName.get(ru) || []).filter(pt => haversineKm(p.lat, p.lon, pt.lat, pt.lon) <= 60)
          .sort((a, b) => a.postcode.localeCompare(b.postcode))[0];
        if(hit){ near = hit; parNom++; break; }
      }
    }
      // CODE POSTAL FACULTATIF (21/09/2026) : le lieu était ÉCARTÉ ici faute de point postal exploitable. Le code
      // postal aide à retrouver sa ville, il ne décide pas si elle existe : le lieu est publié avec un code VIDE.
    if(!near) sansCode++;
    const region = admin1Names.get(country + '.' + p.admin1) || '';
    return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${near ? near.postcode : ''};${region};${p.name}`;
  }).filter(Boolean);

  const out = path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(out, dropNearDuplicates(lines).join('\n') + '\n', 'utf8'); // quasi-doublons (voir communes-corrections.js)
  console.log(country + ' : ' + places.length + ' bruts -> ' + deduped.length + ' dédoublonnés -> ' + lines.length +
    ' publiés (dont ' + parNom + ' rattachés par nom ; ' + sansCode + ' sans code postal)');
}
