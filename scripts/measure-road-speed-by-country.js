// Mesure du FACTEUR ROUTIER et de la VITESSE MOYENNE PAR PAYS (19/09/2026).
//
// Le moteur estime chaque étape par distance_route = vol_d_oiseau × ROAD_FACTOR (1,287, lib/trip-engine.js ; médiane
// de 128 itinéraires dans 16 pays, voir scripts/measure-road-factor.js et data/road-factor-osrm.json), puis
// durée = distance_route / 80 km/h (voiture), et ce pour TOUS les pays. Un audit a montré que c'est faux hors d'Europe
// de l'Ouest (Indonésie, Sri Lanka, Viêt Nam ~40 km/h ; Norvège : facteur 1,5 à 1,7 dans les fjords ; Kirghizistan…),
// et qu'à l'inverse les grands axes européens sont plus rapides que 80 km/h. Ce script mesure, PAYS PAR PAYS, le
// facteur routier et la vitesse moyenne sur de vrais itinéraires OSRM (router.project-osrm.org, profil « driving »,
// données OpenStreetMap, licence ODbL) entre des villes de plus de 20 000 habitants de la base de l'application,
// et écrit le relevé dans data/road-speed-by-country.json.
//
// LIMITE IMPORTANTE : OSRM ne compte ni le trafic, ni les pauses, ni les contrôles, ni l'état réel des routes (il
// applique les vitesses légales / par défaut du type de voie d'OpenStreetMap). Les vitesses mesurées sont donc
// OPTIMISTES, surtout dans les pays où la circulation est dense ou mixte (deux-roues, charrettes, villages). Les
// écarts ENTRE pays restent en revanche significatifs.
//
// Tirage : pour chaque pays de COUNTRIES (public/js/trip-data.js) ayant au moins MIN_CITIES lieux de plus de 20 000
// habitants, N paires de villes distinctes (N = 6 par défaut), sur la MÊME masse terrestre (landmassOf, lib/trip-engine.js)
// et à 60–400 km à vol d'oiseau. Graine fixe par pays (ajouter un pays ne change pas le tirage des autres).
// Rejets : itinéraire comportant un bac (étape OSRM de mode « ferry »), facteur route / vol d'oiseau > 3 (détour
// aberrant, souvent un bac ou une route inexistante), ou ville « accrochée » à plus de 10 km de la route la plus proche.
// Un pays n'a de résumé que s'il compte au moins MIN_ROUTES itinéraires valides ; sinon rien (le moteur garde sa
// valeur par défaut).
//
// Usage : node scripts/measure-road-speed-by-country.js [--n=6] [--seed=20260919] [--pause=1600] [--only=NO,ID]
//                                                         [--cache=chemin/cache.json]
// Service public gratuit : une requête à la fois, pause d'au moins 1,5 s entre deux requêtes, ralentissement
// automatique (attente croissante) si le serveur refuse (HTTP 429 / 5xx). Le cache (réponses déjà obtenues) permet
// de reprendre une mesure interrompue sans réinterroger le serveur. Aucune donnée de visiteur n'est envoyée :
// seules des coordonnées de villes tirées des fichiers publics du dépôt.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const TripData = require('../public/js/trip-data.js');
const { internals } = require('../lib/trip-engine.js');

const args = {};
process.argv.slice(2).forEach(a => { const m = /^--([^=]+)=(.*)$/.exec(a); if(m) args[m[1]] = m[2]; });
const N = parseInt(args.n, 10) || 6;
const SEED = parseInt(args.seed, 10) || 20260919;
const PAUSE_MS = Math.max(1500, parseInt(args.pause, 10) || 1600); // jamais moins de 1,5 s
const ONLY = args.only ? new Set(args.only.toUpperCase().split(',')) : null;
const CACHE = args.cache || path.join(os.tmpdir(), 'road-speed-by-country.cache.json');
const MIN_KM = 60, MAX_KM = 400, MIN_POP = 20000, MIN_CITIES = 5, MIN_ROUTES = 3;
const MAX_RATIO = 3, MAX_SNAP_M = 10000;
const DATA = path.join(__dirname, '..', 'public', 'data');
const OUT = path.join(__dirname, '..', 'data', 'road-speed-by-country.json');
const DEFAULTS = { roadFactor: 1.287, speedKmh: 80 };

function hav(a, b){
  const R = 6371, toR = x => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLon = toR(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
// Générateur reproductible, une graine par pays (dérivée du code pays).
function rng(cc){
  let s = SEED;
  for(const ch of cc) s = (s * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
const med = a => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const quant = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- Tirage des paires -----------------------------------------------------------------------------------------
const plan = [], skipped = [];
for(const code of Object.keys(TripData.COUNTRIES)){
  if(ONLY && !ONLY.has(code)) continue;
  const file = path.join(DATA, TripData.COUNTRIES[code].file);
  if(!fs.existsSync(file)){ skipped.push({ cc: code, reason: 'fichier absent' }); continue; }
  const cities = internals.parseCommunesFile(fs.readFileSync(file, 'utf8'), code)
    .filter(c => c.pop >= MIN_POP && isFinite(c.lat) && isFinite(c.lon));
  if(cities.length < MIN_CITIES){ skipped.push({ cc: code, reason: cities.length + ' ville(s) > 20 000 hab.' }); continue; }
  cities.forEach(c => { c.lm = internals.landmassOf(c); });
  const rnd = rng(code), seen = new Set(), pairs = [];
  for(let tries = 0; pairs.length < N && tries < 5000; tries++){
    const a = cities[Math.floor(rnd() * cities.length)], b = cities[Math.floor(rnd() * cities.length)];
    if(a === b || a.lm !== b.lm) continue;
    const key = [a.name + '@' + a.lat, b.name + '@' + b.lat].sort().join('|');
    if(seen.has(key)) continue;
    const d = hav(a, b);
    if(d < MIN_KM || d > MAX_KM) continue;
    seen.add(key);
    pairs.push({ cc: code, a, b, hav: d });
  }
  if(!pairs.length){ skipped.push({ cc: code, reason: 'aucune paire de 60 à 400 km sur une même masse terrestre' }); continue; }
  plan.push(...pairs);
}

// ---- Cache (reprise d'une mesure interrompue) --------------------------------------------------------------------
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch(e){ /* premier passage */ }
const saveCache = () => { fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(CACHE, JSON.stringify(cache)); };

async function route(p){
  const url = 'https://router.project-osrm.org/route/v1/driving/' + p.a.lon + ',' + p.a.lat + ';' + p.b.lon + ',' + p.b.lat +
    '?overview=false&steps=true&annotations=false';
  if(cache[url]) return { j: cache[url], cached: true };
  let wait = 30000;
  for(let attempt = 0; attempt < 5; attempt++){
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'cap-sur-linconnu/measure-road-speed-by-country' } });
      if(r.status === 429 || r.status >= 500){
        console.log('  serveur : HTTP ' + r.status + ' — pause ' + (wait / 1000) + ' s');
        await sleep(wait); wait *= 2; continue;
      }
      const j = await r.json();
      // On ne garde que ce qui sert : résumé de l'itinéraire, modes des étapes, distances d'accrochage.
      const slim = { code: j.code, message: j.message };
      if(j.routes && j.routes[0]){
        const rt = j.routes[0], modes = new Set();
        let ferryS = 0;
        (rt.legs || []).forEach(l => (l.steps || []).forEach(s => { modes.add(s.mode); if(s.mode === 'ferry') ferryS += s.duration; }));
        slim.distance = rt.distance; slim.duration = rt.duration; slim.modes = [...modes]; slim.ferryS = ferryS;
        slim.snap = (j.waypoints || []).map(w => w.distance);
      }
      if(j.code === 'Ok' || j.code === 'NoRoute'){ cache[url] = slim; saveCache(); }
      return { j: slim };
    } catch(e){
      console.log('  erreur réseau : ' + e.message + ' — pause ' + (wait / 1000) + ' s');
      await sleep(wait); wait *= 2;
    }
  }
  return { j: { code: 'Abandon' } };
}

(async () => {
  const t0 = Date.now();
  console.log(plan.length + ' itinéraires à mesurer dans ' + new Set(plan.map(p => p.cc)).size + ' pays (graine ' + SEED +
    ', ' + N + ' par pays, pause ' + PAUSE_MS + ' ms) ; ' + skipped.length + ' pays écartés au tirage.');
  const rows = [], rejected = [];
  for(let i = 0; i < plan.length; i++){
    const p = plan[i];
    const { j, cached } = await route(p);
    const base = { cc: p.cc, from: p.a.name, to: p.b.name, landmass: p.a.lm, hav: +p.hav.toFixed(2) };
    const tag = '[' + (i + 1) + '/' + plan.length + '] ' + p.cc + ' ' + p.a.name + ' → ' + p.b.name;
    if(j.code !== 'Ok' || !(j.distance > 0) || !(j.duration > 0)){
      rejected.push(Object.assign(base, { reason: 'OSRM : ' + j.code }));
      console.log(tag + ' — ' + j.code);
    } else {
      const km = j.distance / 1000, h = j.duration / 3600, ratio = km / p.hav, speed = km / h;
      const row = Object.assign(base, { km: +km.toFixed(2), hours: +h.toFixed(3), ratio: +ratio.toFixed(4), speed: +speed.toFixed(1),
        snapM: (j.snap || []).map(x => Math.round(x)) });
      let reason = null;
      if(j.modes && j.modes.indexOf('ferry') !== -1) reason = 'bac (' + Math.round(j.ferryS / 60) + ' min de traversée)';
      else if(ratio > MAX_RATIO) reason = 'facteur aberrant > ' + MAX_RATIO;
      else if((j.snap || []).some(x => x > MAX_SNAP_M)) reason = 'ville à plus de ' + (MAX_SNAP_M / 1000) + ' km de la route';
      if(reason){ row.reason = reason; rejected.push(row); }
      else rows.push(row);
      console.log(tag + ' | vol ' + p.hav.toFixed(0) + ' km | route ' + km.toFixed(0) + ' km | facteur ' + ratio.toFixed(3) +
        ' | ' + speed.toFixed(1) + ' km/h' + (reason ? ' — ÉCARTÉ : ' + reason : ''));
    }
    if(!cached && i < plan.length - 1) await sleep(PAUSE_MS);
  }

  // ---- Résumé par pays ---------------------------------------------------------------------------------------------
  const byCountry = {};
  for(const r of rows) (byCountry[r.cc] = byCountry[r.cc] || []).push(r);
  const summary = {}, tooFew = [];
  Object.keys(byCountry).sort().forEach(cc => {
    const rs = byCountry[cc];
    if(rs.length < MIN_ROUTES){ tooFew.push({ cc, n: rs.length }); return; }
    const ratios = rs.map(r => r.ratio), speeds = rs.map(r => r.speed);
    summary[cc] = {
      name: TripData.COUNTRIES[cc].name, n: rs.length,
      roadFactor: +med(ratios).toFixed(3), roadFactorRange: [+Math.min(...ratios).toFixed(3), +Math.max(...ratios).toFixed(3)],
      speedKmh: +med(speeds).toFixed(1), speedRange: [+Math.min(...speeds).toFixed(1), +Math.max(...speeds).toFixed(1)],
      // Vitesse « vol d'oiseau » : km à vol d'oiseau parcourus par heure de route (= facteur et vitesse combinés).
      crowKmh: +med(rs.map(r => r.hav / r.hours)).toFixed(1)
    };
  });
  const all = { ratio: rows.map(r => r.ratio), speed: rows.map(r => r.speed) };
  const out = {
    measuredAt: new Date().toISOString().slice(0, 10),
    source: 'OSRM (router.project-osrm.org, profil driving) — données © contributeurs OpenStreetMap, licence ODbL',
    caveat: 'OSRM ne compte ni trafic, ni pauses, ni contrôles, ni état réel des routes : vitesses optimistes, surtout là où la ' +
      'circulation est dense ou mixte. Les écarts entre pays restent significatifs. Médianes sur peu d\'itinéraires (n par pays).',
    engineDefaults: DEFAULTS,
    params: { script: 'scripts/measure-road-speed-by-country.js', seed: SEED, perCountry: N, minKm: MIN_KM, maxKm: MAX_KM,
      minPop: MIN_POP, minCities: MIN_CITIES, minRoutes: MIN_ROUTES, maxRatio: MAX_RATIO, maxSnapM: MAX_SNAP_M, pauseMs: PAUSE_MS,
      sameLandmass: true, ferryExcluded: true },
    overall: rows.length ? { n: rows.length, roadFactorMedian: +med(all.ratio).toFixed(4), roadFactorQ25: +quant(all.ratio, 0.25).toFixed(3),
      roadFactorQ75: +quant(all.ratio, 0.75).toFixed(3), speedMedian: +med(all.speed).toFixed(1),
      speedQ25: +quant(all.speed, 0.25).toFixed(1), speedQ75: +quant(all.speed, 0.75).toFixed(1) } : null,
    summary,
    countriesTooFewRoutes: tooFew,
    countriesSkipped: skipped,
    routes: rows,
    rejected
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log('\n=== ' + rows.length + ' itinéraires valides, ' + rejected.length + ' écartés, ' + Object.keys(summary).length +
    ' pays résumés, ' + Math.round((Date.now() - t0) / 60000) + ' min ===');
  Object.entries(summary).sort((a, b) => a[1].speedKmh - b[1].speedKmh).forEach(([cc, s]) =>
    console.log(cc + ' ' + s.name.padEnd(28) + ' n=' + s.n + ' facteur ' + s.roadFactor.toFixed(3) + ' | ' + s.speedKmh.toFixed(1) + ' km/h'));
  console.log('relevé écrit dans ' + OUT);
})();
