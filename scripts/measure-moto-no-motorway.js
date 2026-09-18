// Mesure du ralentissement d'une moto privée d'autoroute (MOTO_NO_MOTORWAY_SPEED_FACTOR, lib/trip-engine.js).
// Pour chacun des pays où les motos sont interdites sur tout le réseau autoroutier (règles « noMotorway » nationales de
// scripts/transport/moto-rules.js), PER trajets entre villes de plus de MIN_POP habitants, de MIN_KM à MAX_KM à vol
// d'oiseau (tirage à graine fixe, reproductible), sont calculés avec le routeur public Valhalla
// (valhalla1.openstreetmap.de, données OpenStreetMap, profil « motorcycle ») deux fois : avec autoroutes, puis avec
// exclude_highways (seules les autoroutes sont exclues ; les grandes routes nationales restent permises, comme pour
// une moto dans ces pays). Rapport retenu : durée avec autoroutes / durée sans = facteur de vitesse.
// Aucun serveur OSRM public ne permet d'exclure les autoroutes (« Exclude flag combination is not supported »), d'où
// Valhalla. Une requête toutes les 1,5 s : usage raisonnable d'un service public gratuit.
// Relevé du 18/09/2026 conservé dans data/moto-no-motorway-valhalla.json (35 trajets, 5 par pays).
// Usage : node scripts/measure-moto-no-motorway.js
const fs = require('fs'), path = require('path');
const DATA = path.join(__dirname, '..', 'public', 'data');
const OUT = path.join(__dirname, '..', 'data', 'moto-no-motorway-valhalla.json');
const CC = ['kr', 'tw', 'vn', 'th', 'id', 'pk', 'lk'];
const PER = 5, MIN_KM = 60, MAX_KM = 400, MIN_POP = 20000;
let seed = 20260918;
function rnd(){ seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function hav(a, b){ const R = 6371, t = x => x * Math.PI / 180; const dl = t(b.lat - a.lat), dn = t(b.lon - a.lon);
  const s = Math.sin(dl / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); }
function load(cc){
  const out = [];
  for(const l of fs.readFileSync(path.join(DATA, 'communes-' + cc + '.txt'), 'utf8').split('\n')){
    const p = l.split(';'); if(p.length < 5 || !(+p[0] >= MIN_POP)) continue;
    const ll = p[1].split(','); out.push({ name: p[4], lat: +ll[1], lon: +ll[0] });
  }
  return out;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function route(a, b, opts){
  const body = { locations: [{ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }], costing: 'motorcycle', units: 'kilometers' };
  if(opts) body.costing_options = { motorcycle: opts };
  const r = await fetch('https://valhalla1.openstreetmap.de/route', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'CapSurLInconnu/1.0 (measure-moto-no-motorway; https://github.com/lume419/cap-sur-linconnu)' },
    body: JSON.stringify(body) });
  const j = await r.json();
  return j.trip ? j.trip.summary : null;
}
const med = a => { a = [...a].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
(async () => {
  const rows = [];
  for(const cc of CC){
    const list = load(cc);
    let made = 0, tries = 0;
    while(made < PER && tries++ < 4000){
      const a = list[Math.floor(rnd() * list.length)], b = list[Math.floor(rnd() * list.length)];
      const d = hav(a, b);
      if(d < MIN_KM || d > MAX_KM) continue;
      const withHw = await route(a, b); await sleep(1500);
      const without = await route(a, b, { exclude_highways: true }); await sleep(1500);
      if(!withHw || !without){ console.log('échec', cc, a.name, b.name); continue; }
      made++;
      const row = { cc, a: a.name, b: b.name, hav: +d.toFixed(1), carKm: withHw.length, carH: +(withHw.time / 3600).toFixed(2),
        carKmh: +(withHw.length / (withHw.time / 3600)).toFixed(1), carHw: withHw.has_highway, motoKm: without.length,
        motoH: +(without.time / 3600).toFixed(2), motoKmh: +(without.length / (without.time / 3600)).toFixed(1),
        motoHw: without.has_highway, timeRatio: +(withHw.time / without.time).toFixed(3) };
      rows.push(row); console.log(JSON.stringify(row));
    }
  }
  fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(),
    source: 'valhalla1.openstreetmap.de (FOSSGIS), costing motorcycle (defaut) vs motorcycle exclude_highways=true', rows }, null, 1));
  for(const cc of CC){ const r = rows.filter(x => x.cc === cc); if(r.length) console.log(cc, 'n', r.length, 'facteur médian', med(r.map(x => x.timeRatio))); }
  console.log('tous : n', rows.length, 'facteur médian', med(rows.map(x => x.timeRatio)));
})();
