// Script ponctuel (septembre 2026) : ASIE — Afghanistan, Kazakhstan, Kirghizstan, Ouzbékistan, Tadjikistan,
// Turkménistan, Bangladesh, Bhoutan, Inde, Maldives, Népal, Pakistan, Sri Lanka, Territoire britannique de
// l'océan Indien, Chine, Hong Kong, Macao, Corée du Nord, Corée du Sud, Japon, Mongolie, Taïwan, Brunei,
// Cambodge, Indonésie, Laos, Malaisie, Myanmar, Philippines, Singapour, Thaïlande, Timor oriental, Viêt Nam,
// île Christmas, îles Cocos.
//
// VOLUME — choix explicite de l'utilisateur : TOUS les lieux habités GeoNames sont gardés, y compris pour la
// Chine (~897 000) et l'Inde (~547 000), qui triplent à eux seuls le nombre de lieux du site. Mémoire du
// serveur et taille des bundles en hausse en conséquence (voir README).
//
// CODES POSTAUX — dix-sept fichiers GeoNames existent. Règle unique, mesurée pays par pays (part des lieux
// ayant un point postal à moins de 15 km) : au moins 90 % → vrais codes postaux, pipeline standard (lieu
// rattaché au point postal le plus proche à moins de 15 km, écarté sinon) ; moins de 90 % → aucun code postal,
// étiquette "XX-<admin1 GeoNames>" comme pour les lots africains (tous les lieux gardés). Mélanger les deux
// dans un même pays produirait un champ incohérent.
//   Codes postaux : Inde 97,8 % · Indonésie 97,5 % · Japon 98,2 % · Corée du Sud 100 % · Philippines 93,7 %
//                   · Bangladesh 93,0 % · Sri Lanka 96,0 % · Singapour 100 %.
//   Étiquette de région : Chine 14,8 % (2 352 codes pour 806 coordonnées) · Thaïlande 68,8 % · Pakistan 70,6 %
//                   · Malaisie 81,8 %.
//   Code UNIQUE pour tout le territoire, réel : Territoire britannique de l'océan Indien BBND 1ZZ, île Christmas
//   6798, îles Cocos 6799 (codes postaux australiens).
//   Écartés : Hong Kong 999077 et Macao 999078 sont des codes de remplissage GeoNames (aucun des deux n'a de
//   système de codes postaux) → étiquette de région.
// Région : toujours le nom admin1 GeoNames (latin), par le code du lieu lui-même — les fichiers postaux coréen
// et japonais donnent leurs noms de région dans leur écriture.

const fs = require('fs');
const path = require('path');

const POSTAL = new Set(['IN', 'ID', 'JP', 'KR', 'PH', 'BD', 'LK', 'SG']);
const SINGLE_CODE = { IO: 'BBND 1ZZ', CX: '6798', CC: '6799' };
const COUNTRIES = ['AF', 'KZ', 'KG', 'UZ', 'TJ', 'TM', 'BD', 'BT', 'IN', 'MV', 'NP', 'PK', 'LK', 'IO', 'CN', 'HK', 'MO',
  'KP', 'KR', 'JP', 'MN', 'TW', 'BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'TL', 'VN', 'CX', 'CC'];
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371, dLat = (lat2-lat1) * Math.PI/180, dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function nearest(grid, lat, lon, maxKm){
  const cLat = Math.round(lat*10), cLon = Math.round(lon*10);
  let best = null, bestDist = Infinity;
  for(let dLat=-1; dLat<=1; dLat++) for(let dLon=-1; dLon<=1; dLon++){
    const bucket = grid.get((cLat+dLat) + '_' + (cLon+dLon));
    if(!bucket) continue;
    for(const p of bucket){ const d = haversineKm(lat, lon, p.lat, p.lon); if(d < bestDist){ bestDist = d; best = p; } }
  }
  return (best && bestDist <= maxKm) ? best : null;
}
const admin1Names = new Map();
fs.readFileSync(path.join(__dirname, 'admin1CodesASCII.txt'), 'utf8').split('\n').forEach(l => {
  const f = l.split('\t'); if(f[0] && f[1]) admin1Names.set(f[0], f[1]);
});

let total = 0;
for(const country of COUNTRIES){
  const seen = new Map(); let brut = 0;
  fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8').split('\n').forEach(line => {
    const c = line.split('\t');
    if(c[6] !== 'P' || !KEEP_FEATURE_CODES.has(c[7]) || !c[1]) return;
    const lat = parseFloat(c[4]), lon = parseFloat(c[5]);
    if(isNaN(lat) || isNaN(lon)) return;
    brut++;
    const p = { name: c[1], lat, lon, admin1: c[10] || '', pop: parseInt(c[14], 10) || 0 };
    // Dédoublonnage identique au pipeline standard : même nom + coordonnées à ~1 km près.
    const k = p.name.toLowerCase() + '|' + lat.toFixed(2) + '|' + lon.toFixed(2);
    const prev = seen.get(k);
    if(!prev || p.pop > prev.pop) seen.set(k, p);
  });

  let grid = null;
  if(POSTAL.has(country)){
    grid = new Map();
    fs.readFileSync(path.join(__dirname, 'postal', country + '_postal.txt'), 'utf8').split('\n').filter(Boolean).forEach(l => {
      const c = l.split('\t'); const lat = parseFloat(c[9]), lon = parseFloat(c[10]);
      if(isNaN(lat) || isNaN(lon)) return;
      const k = Math.round(lat*10) + '_' + Math.round(lon*10);
      if(!grid.has(k)) grid.set(k, []);
      grid.get(k).push({ postcode: c[1], lat, lon });
    });
  }

  let sansCode = 0, sansRegion = 0;
  const lines = [];
  for(const p of seen.values()){
    const region = (p.admin1 && p.admin1 !== '00') ? (admin1Names.get(country + '.' + p.admin1) || '') : '';
    let cp;
    if(grid){
      const near = nearest(grid, p.lat, p.lon, 15);
      if(!near){ sansCode++; continue; }
      cp = near.postcode;
    } else if(SINGLE_CODE[country]){
      cp = SINGLE_CODE[country];
    } else {
      cp = region ? country + '-' + p.admin1 : country;
      if(!region) sansRegion++;
    }
    lines.push(`${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${cp};${region};${p.name}`);
  }
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt'), lines.join('\n') + '\n', 'utf8');
  total += lines.length;
  console.log(country + ' : ' + brut + ' bruts -> ' + seen.size + ' dédoublonnés -> ' + lines.length + ' retenus' +
    (grid ? ' (' + sansCode + ' écartés sans point postal à moins de 15 km)' : sansRegion ? ' (dont ' + sansRegion + ' sans région)' : ''));
}
console.log('TOTAL : ' + total);
