// Mesure du FACTEUR ROUTIER et de la VITESSE MOYENNE réelle (7e audit, 17/09/2026).
//
// Le moteur estime chaque étape à partir de la distance à vol d'oiseau : distance_route = vol_d_oiseau × ROAD_FACTOR
// (lib/trip-engine.js), puis durée = distance_route / vitesse du mode (TRANSPORT dans public/js/trip-data.js).
// Ces deux constantes n'étaient sourcées nulle part. Ce script les mesure sur de VRAIS itinéraires routiers calculés
// par OSRM (router.project-osrm.org, profil « driving », données OpenStreetMap) entre de vraies villes de la base de
// l'application, et écrit le relevé dans data/road-factor-osrm.json (conservé pour pouvoir citer la mesure).
//
// Usage : node scripts/measure-road-factor.js [graine]
// Un appel par seconde, 64 itinéraires par graine (service public, usage modéré). Aucune donnée de visiteur n'est
// envoyée : seules des coordonnées de villes tirées des fichiers publics du dépôt.
//
// Relevé du 17/09/2026 (graines 20260917 et 777001, 128 itinéraires, 16 pays, étapes de 80 à 500 km à vol d'oiseau) :
//   facteur routier : médiane 1,287 — q25 1,216 / q75 1,399 / q90 1,533 — moyenne 1,327 (min 1,10 ; max 1,90)
//   vitesse moyenne : médiane 79,4 km/h (Europe 85,9 km/h ; France 91,1 km/h sur 8 itinéraires)
// Les valeurs extrêmes correspondent à des itinéraires contournant un relief ou un bras de mer (Tasmanie, Kyūshū).
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'public', 'data');
const OUT = path.join(__dirname, '..', 'data', 'road-factor-osrm.json');
const COUNTRIES = ['', 'de', 'es', 'it', 'gb', 'pl', 'se', 'us', 'ca', 'br', 'au', 'jp', 'in', 'za', 'mx', 'tr'];
const PER_COUNTRY = 4;
const MIN_KM = 80, MAX_KM = 500, MIN_POP = 20000;

function load(cc){
  const f = path.join(DATA, cc ? 'communes-' + cc + '.txt' : 'communes.txt');
  if(!fs.existsSync(f)) return [];
  const out = [];
  for(const line of fs.readFileSync(f, 'utf8').split('\n')){
    const p = line.split(';');
    if(p.length < 5 || !(+p[0] >= MIN_POP)) continue;
    const ll = p[1].split(',');
    out.push({ cc: cc || 'fr', name: p[4], lat: +ll[1], lon: +ll[0] });
  }
  return out;
}
function hav(a, b){
  const R = 6371, toR = x => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLon = toR(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
// Tirage reproductible : même graine, mêmes itinéraires.
let seed = parseInt(process.argv[2], 10) || 20260917;
function rnd(){ seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

const pairs = [];
for(const cc of COUNTRIES){
  const list = load(cc);
  if(list.length < 20){ console.log('(pas assez de villes pour ' + (cc || 'fr') + ')'); continue; }
  let tries = 0, made = 0;
  while(made < PER_COUNTRY && tries++ < 4000){
    const a = list[Math.floor(rnd() * list.length)], b = list[Math.floor(rnd() * list.length)];
    const d = hav(a, b);
    if(d < MIN_KM || d > MAX_KM) continue;
    pairs.push({ a, b, hav: d });
    made++;
  }
}

const med = a => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const moy = a => a.reduce((t, x) => t + x, 0) / a.length;
const quant = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };

(async () => {
  console.log(pairs.length + ' itinéraires à mesurer (graine ' + (parseInt(process.argv[2], 10) || 20260917) + ')');
  const rows = [];
  for(const p of pairs){
    const url = 'https://router.project-osrm.org/route/v1/driving/' + p.a.lon + ',' + p.a.lat + ';' + p.b.lon + ',' + p.b.lat + '?overview=false';
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'cap-sur-linconnu/measure-road-factor' } });
      const j = await r.json();
      if(j.code !== 'Ok' || !j.routes || !j.routes[0]){ console.log('— ' + p.a.name + ' → ' + p.b.name + ' : ' + j.code); continue; }
      const km = j.routes[0].distance / 1000, h = j.routes[0].duration / 3600;
      rows.push({ cc: p.a.cc, from: p.a.name, to: p.b.name, hav: +p.hav.toFixed(2), km: +km.toFixed(2), ratio: +(km / p.hav).toFixed(4), speed: +(km / h).toFixed(1) });
      console.log(p.a.cc + ' ' + p.a.name + ' → ' + p.b.name + ' | vol ' + p.hav.toFixed(0) + ' km | route ' + km.toFixed(0) + ' km | facteur ' + (km / p.hav).toFixed(3) + ' | ' + (km / h).toFixed(1) + ' km/h');
    } catch(e){ console.log('erreur : ' + e.message); }
    await new Promise(r => setTimeout(r, 1000));
  }
  if(!rows.length) return console.log('aucune mesure aboutie.');
  const ratios = rows.map(r => r.ratio), speeds = rows.map(r => r.speed);
  console.log('\n=== ' + rows.length + ' itinéraires ===');
  console.log('facteur routier : médiane ' + med(ratios).toFixed(4) + ' | q25 ' + quant(ratios, 0.25).toFixed(3) + ' | q75 ' + quant(ratios, 0.75).toFixed(3) + ' | moyenne ' + moy(ratios).toFixed(4));
  console.log('vitesse moyenne : médiane ' + med(speeds).toFixed(1) + ' km/h | moyenne ' + moy(speeds).toFixed(1) + ' km/h');
  // Les relevés précédents sont conservés : la médiane se calcule sur l'ensemble.
  let all = [];
  try { all = JSON.parse(fs.readFileSync(OUT, 'utf8')).routes || []; } catch(e){ /* premier relevé */ }
  const key = r => r.from + '|' + r.to;
  const seen = new Set(all.map(key));
  rows.forEach(function(r){ if(!seen.has(key(r))) all.push(r); });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    source: 'router.project-osrm.org (profil driving, données OpenStreetMap)',
    measuredAt: new Date().toISOString().slice(0, 10),
    routes: all,
    roadFactor: { median: +med(all.map(r => r.ratio)).toFixed(4), mean: +moy(all.map(r => r.ratio)).toFixed(4), n: all.length },
    speedKmh: { median: +med(all.map(r => r.speed)).toFixed(1), mean: +moy(all.map(r => r.speed)).toFixed(1), n: all.length }
  }, null, 1));
  console.log('relevé écrit dans ' + OUT + ' (' + all.length + ' itinéraires au total).');
})();
