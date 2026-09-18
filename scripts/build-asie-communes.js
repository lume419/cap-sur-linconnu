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
const { excludePlace, fixName } = require('./communes-corrections.js'); // lieux mal rangés, disparus, Sercq, Antarctique (voir ce fichier)

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
// Cellules de 0,1° : 11,1 km en latitude, 11,1 × cos(lat) km en longitude. La fenêtre doit couvrir maxKm dans les deux
// sens — avec ±1 cellule (3e audit du 17/09/2026), 1 760 lieux étaient déclarés « sans point postal à moins de 15 km »
// alors qu'il en existait un (Sirajganj, 127 481 habitants, point à 12,0 km), et d'autres rattachés à un point plus
// éloigné que le plus proche réel.
function nearest(grid, lat, lon, maxKm){
  const cLat = Math.round(lat*10), cLon = Math.round(lon*10);
  const spanLat = Math.max(1, Math.ceil(maxKm / 11.1));
  const spanLon = Math.max(1, Math.ceil(maxKm / Math.max(1, 11.1 * Math.cos(lat * Math.PI / 180))));
  let best = null, bestDist = Infinity;
  for(let dLat=-spanLat; dLat<=spanLat; dLat++) for(let dLon=-spanLon; dLon<=spanLon; dLon++){
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

// ONLY_COUNTRY=JP : reconstruit un seul pays (les autres fichiers restent intacts).
const ONLY_COUNTRY = process.env.ONLY_COUNTRY || '';
let total = 0;
for(const country of COUNTRIES){
  if(ONLY_COUNTRY && country !== ONLY_COUNTRY) continue;
  const seen = new Map(); let brut = 0;
  const raw = fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8');
  raw.split('\n').forEach(line => {
    const c = line.split('\t');
    if(c[6] !== 'P' || !KEEP_FEATURE_CODES.has(c[7]) || !c[1]) return;
    const lat = parseFloat(c[4]), lon = parseFloat(c[5]);
    if(isNaN(lat) || isNaN(lon)) return;
    const name = fixName(country, c[0], c[1]); // noms aux caractères perdus corrigés d'après la même fiche (voir communes-corrections.js)
    if(excludePlace(country, c[0], name, lat, lon)) return;
    brut++;
    const p = { name, lat, lon, admin1: c[10] || '', admin2: c[11] || '', admin3: c[12] || '', pop: parseInt(c[14], 10) || 0 };
    // Dédoublonnage identique au pipeline standard : même nom + coordonnées à ~1 km près.
    const k = p.name.toLowerCase() + '|' + lat.toFixed(2) + '|' + lon.toFixed(2);
    const prev = seen.get(k);
    if(!prev || p.pop > prev.pop) seen.set(k, p);
  });

  let grid = null;
  // Philippines (septembre 2026) : certains points du fichier postal GeoNames sont mal placés — Culion (5315),
  // Coron (5316) et Busuanga (5317) sont tous trois à 10,847 N ; 119,7818 E, à ~150 km de leurs îles, si bien
  // qu'aucun lieu de ces municipalités n'avait de point postal à moins de 15 km et tous étaient écartés. Quand
  // aucun point n'est assez proche, le code est pris par MUNICIPALITÉ : nom de la division ADM3 GeoNames du lieu
  // (même province) identique au nom de localité d'une et une seule ligne du fichier postal.
  let postalByMunicipality = null, admin3Names = null;
  // Japon (septembre 2026) : le fichier postal GeoNames place TOUS les codes de certaines municipalités insulaires au
  // même point, sur le continent — Okushiri (043-1400 à 043-1522 : Okushiri, Akaishi, Aonae…) à 41,9076 N ; 140,2695 E,
  // à ~70 km de l'île. Aucun lieu de l'île n'avait de point postal à moins de 15 km : tous étaient écartés et la liaison
  // Esashi–Okushiri ne pouvait jamais servir. Quand aucun point n'est assez proche, le code est pris par LOCALITÉ :
  // mêmes codes administratifs GeoNames (préfecture, district, municipalité) et nom de localité identique à celui
  // d'une et une seule ligne du fichier postal (données Japan Post reprises par GeoNames).
  let postalByLocality = null;
  function normMuni(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^(city|municipality) of /, '').replace(/ city$/, '').replace(/[^a-z0-9]/g, ''); }
  if(POSTAL.has(country)){
    grid = new Map();
    // Les deux règles de repli valent pour tous les pays à codes postaux (3e audit du 17/09/2026) : le même défaut de
    // fichier postal existe ailleurs (Inde : 11 248 lieux écartés dont Virār, 1,2 M d'habitants ; Bangladesh :
    // Mymensingh ; Japon : Tsushima). Elles ne servent qu'aux lieux SANS point postal assez proche.
    postalByMunicipality = new Map();
    postalByLocality = new Map();
    fs.readFileSync(path.join(__dirname, 'postal', country + '_postal.txt'), 'utf8').split('\n').filter(Boolean).forEach(l => {
      const c = l.split('\t'); const lat = parseFloat(c[9]), lon = parseFloat(c[10]);
      {
        const key = c[4] + '|' + c[6] + '|' + normMuni(c[2]);
        const prev = postalByMunicipality.get(key);
        postalByMunicipality.set(key, prev === undefined ? c[1] : (prev === c[1] ? prev : null)); // null = ambigu
      }
      {
        const key = c[4] + '|' + c[6] + '|' + c[8] + '|' + normMuni(c[2]);
        const prev = postalByLocality.get(key);
        postalByLocality.set(key, prev === undefined ? c[1] : (prev === c[1] ? prev : null)); // null = ambigu
      }
      if(isNaN(lat) || isNaN(lon)) return;
      const k = Math.round(lat*10) + '_' + Math.round(lon*10);
      if(!grid.has(k)) grid.set(k, []);
      grid.get(k).push({ postcode: c[1], lat, lon });
    });
    {
      admin3Names = new Map();
      raw.split('\n').forEach(line => {
        const c = line.split('\t');
        if(c[7] === 'ADM3') admin3Names.set(c[10] + '|' + c[11] + '|' + c[12], c[1]);
      });
    }
  }
  let parMunicipalite = 0, parLocalite = 0;

  let sansCode = 0, sansRegion = 0;
  const lines = [];
  for(const p of seen.values()){
    const region = (p.admin1 && p.admin1 !== '00') ? (admin1Names.get(country + '.' + p.admin1) || '') : '';
    let cp;
    if(grid){
      // Ordre : point postal le plus proche, puis — faute de point assez proche — code de la LOCALITÉ de même nom
      // (le plus précis : « Okushiri » 043-1401), puis code de la MUNICIPALITÉ (« Okushiri Chō » 043-1400).
      const near = nearest(grid, p.lat, p.lon, 15);
      if(near) cp = near.postcode;
      else if(postalByLocality && p.admin3 && postalByLocality.get(p.admin1 + '|' + p.admin2 + '|' + p.admin3 + '|' + normMuni(p.name))){
        cp = postalByLocality.get(p.admin1 + '|' + p.admin2 + '|' + p.admin3 + '|' + normMuni(p.name));
        parLocalite++;
      } else if(admin3Names && p.admin3 && admin3Names.has(p.admin1 + '|' + p.admin2 + '|' + p.admin3)
        && postalByMunicipality.get(p.admin1 + '|' + p.admin2 + '|' + normMuni(admin3Names.get(p.admin1 + '|' + p.admin2 + '|' + p.admin3)))){
        cp = postalByMunicipality.get(p.admin1 + '|' + p.admin2 + '|' + normMuni(admin3Names.get(p.admin1 + '|' + p.admin2 + '|' + p.admin3)));
        parMunicipalite++;
      } else { sansCode++; continue; }
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
    (grid ? ' (' + sansCode + ' écartés sans point postal à moins de 15 km' + (parMunicipalite ? ', ' + parMunicipalite + ' rattachés par municipalité' : '') + (parLocalite ? ', ' + parLocalite + ' rattachés par localité' : '') + ')' : sansRegion ? ' (dont ' + sansRegion + ' sans région)' : ''));
}
console.log('TOTAL : ' + total);
