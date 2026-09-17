// Recherche d'une ville portuaire dans les données de lieux (GeoNames et sources nationales, public/data) pour
// scripts/ferry-ports/*.js : affiche les lieux du pays dont le nom correspond, avec coordonnées, région, population,
// masse terrestre (landmassOf) et zone (zoneOf) — la masse terrestre doit être celle de la rive de la liaison.
//
//   node scripts/ferry-ports/find-port.js JP Hakodate
//   node scripts/ferry-ports/find-port.js FR "Porto-Vecchio"
//   node scripts/ferry-ports/find-port.js GR Piraeus --near 37.94,23.64   (lieux à moins de 30 km, tous noms)
const fs = require('fs');
const path = require('path');
const { COUNTRIES } = require('../../public/js/trip-data.js');
const { internals } = require('../../lib/trip-engine.js');

const [cc, query] = process.argv.slice(2);
const nearArg = process.argv.indexOf('--near');
if(!cc || !COUNTRIES[cc] || (!query && nearArg < 0)){
  console.error('usage : node scripts/ferry-ports/find-port.js <PAYS> <nom> [--near lat,lon]');
  process.exit(1);
}
const places = internals.parseCommunesFile(fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'data', COUNTRIES[cc].file), 'utf8'), cc);
const hv = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
let found;
if(nearArg > 0){
  const [la, lo] = process.argv[nearArg + 1].split(',').map(Number);
  found = places.map(p => Object.assign({ km: hv(la, lo, p.lat, p.lon) }, p)).filter(p => p.km <= 30).sort((a, b) => a.km - b.km).slice(0, 25);
} else {
  const q = internals.normalizeCityName(query);
  found = places.filter(p => p.norm === q);
  if(!found.length) found = places.filter(p => p.norm.indexOf(q) === 0 || p.norm.indexOf(' ' + q) >= 0).slice(0, 25);
}
found.forEach(p => console.log([p.name, p.lat, p.lon, 'région=' + p.dept, 'pop=' + p.pop, 'masse=' + internals.landmassOf(p), 'zone=' + internals.zoneOf(p), p.km != null ? p.km.toFixed(1) + ' km' : ''].join(' | ')));
if(!found.length) console.log('aucun lieu');
