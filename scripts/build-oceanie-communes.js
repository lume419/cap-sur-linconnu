// Script ponctuel (septembre 2026) : OCÉANIE — Australie, Nouvelle-Zélande, Papouasie-Nouvelle-Guinée, Îles Salomon,
// Vanuatu, Fidji, Samoa, Tonga, Tuvalu, Kiribati, Nauru, Îles Marshall, États fédérés de Micronésie, Palaos, Niue,
// Îles Cook, Tokelau, Guam, Îles Mariannes du Nord, Samoa américaines, îles mineures éloignées des États-Unis,
// Pitcairn, île Norfolk, îles Heard-et-MacDonald.
//
// LIEUX : tous les lieux habités GeoNames (classe P, mêmes codes que les autres lots), dédoublonnés comme ailleurs.
// Exception : les îles Heard-et-MacDonald n'ont AUCUN lieu habité (territoire inhabité, accès soumis à permis de la
// division antarctique australienne) — seules les deux îles elles-mêmes (classe T, GeoNames 1547315 Heard Island et
// 1547301 McDonald Island) sont reprises, recherchables sans trajet, comme les îles Éparses.
//
// CODES POSTAUX — même règle unique que le lot Asie (au moins 90 % des lieux à moins de 15 km d'un point postal
// GeoNames → vrais codes ; sinon étiquette "XX-<admin1>") :
//   Codes postaux : Australie 90,9 % · Nouvelle-Zélande 94,5 % · Guam 100 %.
//   Code par ÎLE ou par ÉTAT, réel (codes ZIP de l'USPS, repris des fichiers GeoNames, rattachés par la division
//   admin1 du lieu faute de coordonnées utilisables dans ces fichiers) : Îles Mariannes du Nord (Saipan 96950, Rota
//   96951, Tinian 96952 ; les Northern Islands, quasi inhabitées, sous 96950, le code de Saipan qui les dessert —
//   rattachement non vérifié dans un texte de l'USPS, signalé), États fédérés de Micronésie (Kosrae 96944, Pohnpei
//   96941, Chuuk 96942, Yap 96943), Îles Marshall (Kwajalein 96970, Ebeye ; tout le reste 96960, Majuro).
//   Code UNIQUE pour tout le territoire, réel : Palaos 96940, Samoa américaines 96799, Niue 9974, Nauru NRU68,
//   Pitcairn PCRN 1ZZ, île Norfolk 2899, îles Heard-et-MacDonald 7151.
//   Écarté : la seule ligne du fichier GeoNames de Samoa porte « AS 96799 », le code des Samoa AMÉRICAINES — Samoa
//   n'a pas de code postal : étiquette de région.
//   Étiquette de région : Papouasie-Nouvelle-Guinée (codes postaux réels mais absents de GeoNames), Îles Salomon,
//   Vanuatu, Fidji, Samoa, Tonga, Tuvalu, Kiribati, Îles Cook, Tokelau, îles mineures éloignées.

const fs = require('fs');
const path = require('path');
// Corrections communes à tous les générateurs de lieux (audit n° 11) : noms nettoyés, lieux écartés, quasi-doublons —
// voir scripts/communes-corrections.js.
const { excludePlace, preparePlaceName, dropNearDuplicates } = require('./communes-corrections.js');

const POSTAL = new Set(['AU', 'NZ', 'GU']);
const SINGLE_CODE = { PW: '96940', AS: '96799', NU: '9974', NR: 'NRU68', PN: 'PCRN 1ZZ', NF: '2899', HM: '7151' };
const ADMIN1_CODE = {
  MP: { '110': '96950', '100': '96951', '120': '96952', '085': '96950' },
  FM: { '01': '96944', '02': '96941', '03': '96942', '04': '96943' },
  MH: { '150': '96970', '*': '96960' }
};
const COUNTRIES = ['AU', 'NZ', 'PG', 'SB', 'VU', 'FJ', 'WS', 'TO', 'TV', 'KI', 'NR', 'MH', 'FM', 'PW', 'NU', 'CK', 'TK',
  'GU', 'MP', 'AS', 'UM', 'PN', 'NF', 'HM'];
const ISLANDS_ONLY = { HM: ['1547315', '1547301'] };
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
    if(ISLANDS_ONLY[country]){ if(ISLANDS_ONLY[country].indexOf(c[0]) === -1) return; }
    else if(c[6] !== 'P' || !KEEP_FEATURE_CODES.has(c[7]) || !c[1]) return;
    const lat = parseFloat(c[4]), lon = parseFloat(c[5]);
    if(isNaN(lat) || isNaN(lon)) return;
    const name = preparePlaceName(country, c[0], c[1]);
    if(excludePlace(country, c[0], name, lat, lon)) return;
    brut++;
    const p = { name, lat, lon, admin1: c[10] || '', pop: parseInt(c[14], 10) || 0 };
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
  let lines = [];
  for(const p of seen.values()){
    const region = (p.admin1 && p.admin1 !== '00') ? (admin1Names.get(country + '.' + p.admin1) || '') : '';
    let cp;
    if(grid){
      const near = nearest(grid, p.lat, p.lon, 15);
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
    (grid ? ' (' + sansCode + ' écartés sans point postal à moins de 15 km)' : sansRegion ? ' (dont ' + sansRegion + ' sans région)' : ''));
}
console.log('TOTAL : ' + total);
