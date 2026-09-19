// Script ponctuel (septembre 2026) : AMÉRIQUES — États-Unis, Canada, Mexique, Groenland, Bermudes, Amérique centrale
// (Guatemala, Belize, Salvador, Honduras, Nicaragua, Costa Rica, Panama), Caraïbes (Cuba, Jamaïque, Haïti, République
// dominicaine, Bahamas, Saint-Kitts-et-Nevis, Antigua-et-Barbuda, Dominique, Sainte-Lucie, Saint-Vincent-et-les-
// Grenadines, Barbade, Grenade, Trinité-et-Tobago, Porto Rico, îles Vierges américaines et britanniques, Turques-et-
// Caïques, Caïmans, Anguilla, Montserrat, Aruba, Curaçao, Sint Maarten, Pays-Bas caribéens), Amérique du Sud (Colombie,
// Venezuela, Guyana, Suriname, Équateur, Pérou, Bolivie, Brésil, Paraguay, Uruguay, Argentine, Chili), Malouines et
// Géorgie du Sud-et-Sandwich du Sud.
//
// LIEUX : tous les lieux habités GeoNames (classe P, mêmes codes que les autres lots), dédoublonnés comme ailleurs.
//
// CODES POSTAUX — même règle unique (au moins 90 % des lieux à moins de 15 km d'un point postal GeoNames → vrais
// codes ; sinon étiquette "XX-<admin1>") :
//   Codes postaux : États-Unis 96,6 % · Mexique 97,5 % · Bermudes 100 % · Costa Rica 98,0 % · Panama 93,5 % · Haïti
//   95,9 % · Porto Rico 99,5 % · îles Vierges américaines 100 % · Équateur 93,2 % · Pérou 99,4 % · Uruguay 97,5 %.
//   Code UNIQUE pour tout le territoire, réel : Turques-et-Caïques TKCA 1ZZ, Anguilla AI-2640, Malouines FIQQ 1ZZ,
//   Géorgie du Sud SIQQ 1ZZ.
//   Équateur : sans point postal à moins de 15 km, le lieu prend le point postal le plus proche de SON CANTON (codes
//   admin1/admin2 GeoNames identiques dans le fichier postal, vérifié) — plusieurs points des Galápagos sont mal placés
//   (celui de Puerto Baquerizo Moreno est sur l'île Española) et Floreana est à 58 km du point le plus proche : sans ce
//   repli, 34 des 51 lieux des Galápagos, dont le chef-lieu, étaient écartés. Non appliqué ailleurs : les codes de
//   division des fichiers postaux ne suivent pas ceux de GeoNames dans les autres pays (au Mexique, « 01 » ne désigne
//   pas le même État).
//   Étiquette de région : Canada 44,1 % (le fichier GeoNames ne donne que les trois premiers caractères, points
//   centraux de vastes zones), Groenland 22,1 %, Guatemala 83,4 %, Honduras 25,8 %, République dominicaine 64,5 %,
//   Colombie 70,3 %, Brésil 69,3 %, Argentine 82,3 %, Chili 65,2 %, et tous les pays sans fichier postal.

const fs = require('fs');
const path = require('path');
const { excludePlace, preparePlaceName, dropNearDuplicates } = require('./communes-corrections.js'); // lieux mal rangés, disparus, Sercq, Antarctique (voir ce fichier)

const POSTAL = new Set(['US', 'MX', 'BM', 'CR', 'PA', 'HT', 'PR', 'VI', 'EC', 'PE', 'UY']);
const SINGLE_CODE = { TC: 'TKCA 1ZZ', AI: 'AI-2640', FK: 'FIQQ 1ZZ', GS: 'SIQQ 1ZZ' };
const ADMIN1_CODE = {};
const COUNTRIES = ['US', 'CA', 'MX', 'GL', 'BM', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'JM', 'HT', 'DO', 'BS', 'KN', 'AG', 'DM',
  'LC', 'VC', 'BB', 'GD', 'TT', 'PR', 'VI', 'TC', 'KY', 'VG', 'AI', 'MS', 'AW', 'CW', 'SX', 'BQ', 'CO', 'VE', 'GY', 'SR', 'EC', 'PE', 'BO', 'BR',
  'PY', 'UY', 'AR', 'CL', 'FK', 'GS'];
const ISLANDS_ONLY = {};
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

// ONLY_COUNTRY=MX : reconstruit un seul pays (les autres fichiers restent intacts ; 12e audit du 19/09/2026, même
// option que build-asie-communes.js).
const ONLY_COUNTRY = process.env.ONLY_COUNTRY || '';
let total = 0;
for(const country of COUNTRIES){
  if(ONLY_COUNTRY && country !== ONLY_COUNTRY) continue;
  const seen = new Map(); let brut = 0;
  fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8').split('\n').forEach(line => {
    const c = line.split('\t');
    if(ISLANDS_ONLY[country]){ if(ISLANDS_ONLY[country].indexOf(c[0]) === -1) return; }
    else if(c[6] !== 'P' || !KEEP_FEATURE_CODES.has(c[7]) || !c[1]) return;
    const lat = parseFloat(c[4]), lon = parseFloat(c[5]);
    if(isNaN(lat) || isNaN(lon)) return;
    const name = preparePlaceName(country, c[0], c[1]); // noms nettoyés (voir communes-corrections.js)
    if(excludePlace(country, c[0], name, lat, lon)) return;
    brut++;
    const p = { name, lat, lon, admin1: c[10] || '', admin2: c[11] || '', pop: parseInt(c[14], 10) || 0 };
    const k = p.name.toLowerCase() + '|' + lat.toFixed(2) + '|' + lon.toFixed(2);
    const prev = seen.get(k);
    if(!prev || p.pop > prev.pop) seen.set(k, p);
  });

  let grid = null;
  const byCanton = {};
  if(POSTAL.has(country)){
    grid = new Map();
    fs.readFileSync(path.join(__dirname, 'postal', country + '_postal.txt'), 'utf8').split('\n').filter(Boolean).forEach(l => {
      const c = l.split('\t'); const lat = parseFloat(c[9]), lon = parseFloat(c[10]);
      if(isNaN(lat) || isNaN(lon)) return;
      const k = Math.round(lat*10) + '_' + Math.round(lon*10);
      if(!grid.has(k)) grid.set(k, []);
      grid.get(k).push({ postcode: c[1], lat, lon });
      if(country === 'EC'){ const ck = c[4] + '|' + c[6]; (byCanton[ck] = byCanton[ck] || []).push({ postcode: c[1], lat, lon }); }
    });
  }

  let sansCode = 0, sansRegion = 0, parCanton = 0;
  let lines = [];
  for(const p of seen.values()){
    const region = (p.admin1 && p.admin1 !== '00') ? (admin1Names.get(country + '.' + p.admin1) || '') : '';
    let cp;
    if(grid){
      let near = nearest(grid, p.lat, p.lon, 15);
      if(!near && byCanton[p.admin1 + '|' + p.admin2]){
        near = byCanton[p.admin1 + '|' + p.admin2].reduce((best, q) => {
          const d = haversineKm(p.lat, p.lon, q.lat, q.lon);
          return !best || d < best.d ? { q: q, d: d } : best;
        }, null).q;
        parCanton++;
      }
      if(!near){ sansCode++; continue; }
      cp = near.postcode;
    } else if(SINGLE_CODE[country]){
      cp = SINGLE_CODE[country];
    } else if(ADMIN1_CODE[country]){
      cp = ADMIN1_CODE[country][p.admin1] || ADMIN1_CODE[country]['*'];
      if(!cp) throw new Error(country + ' : division sans code ' + p.admin1 + ' (' + p.name + ')');
    } else {
      cp = region ? country + '-' + p.admin1 : country;
      if(!region) sansRegion++;
    }
    lines.push(`${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${cp};${region};${p.name}`);
  }
  lines = dropNearDuplicates(lines); // quasi-doublons (voir communes-corrections.js)
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt'), lines.join('\n') + '\n', 'utf8');
  total += lines.length;
  console.log(country + ' : ' + brut + ' bruts -> ' + seen.size + ' dédoublonnés -> ' + lines.length + ' retenus' +
    (grid ? ' (' + sansCode + ' écartés sans point postal à moins de 15 km' + (parCanton ? ', ' + parCanton + ' rattachés par canton' : '') + ')' : sansRegion ? ' (dont ' + sansRegion + ' sans région)' : ''));
}
console.log('TOTAL : ' + total);
