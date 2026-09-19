// Comparaison de deux versions du moteur (13e audit du 19/09/2026) — partie commune à tests/compare-engine.js.
//
// Pourquoi : aux 12e et 13e audits, des corrections du moteur ont changé le comportement de chemins voisins (vélo, pays
// lents, voiture électrique, temps de calcul ×7) sans qu'aucun test ne le voie : les tests vérifient la cohérence interne
// d'un tirage et le cas corrigé, pas ce qui a CHANGÉ. Cet outil joue les mêmes tirages (mêmes paramètres, même graine,
// même horloge ralentie) et les mêmes appels directs de finalizeLeg avec deux moteurs, et liste chaque différence.
//
// Contenu :
//   - loadEngineAt(root, sources) : charge le moteur d'une racine quelconque (copie extraite de git ou dépôt), avec la
//     même compilation en mémoire que tests/helpers/engine.js (ligne d'export __test ajoutée, aucun fichier modifié) ;
//   - buildTirages(n), PAIRS_NAMED, PAIRS_COUNTRIES : jeu de tirages et de trajets FIXE et reproductible ;
//   - runWorker(job) : exécute le jeu avec un moteur et renvoie les résultats résumés (un processus par moteur) ;
//   - compareRuns(a, b) et formatReport(rapport) : différences, temps de calcul, résumé par catégorie.
'use strict';
const fs = require('fs');
const path = require('path');
const Module = require('module');

// Mêmes noms que tests/helpers/engine.js (13e audit : repris ici car ce fichier-là charge toujours le moteur du dépôt).
const INTERNAL_FUNCS = ['landmassOf', 'zoneOf', 'tollCountryOf', 'motoMotorwayBan', 'normalizeCityName', 'finalizeLeg',
  'countrySpeedFactor', 'countriesAlong'];
const INTERNAL_VARS = ['COMMUNES', 'LAST_TRIP_DIAGNOSTIC', 'TRIP_TIME_BUDGET_MS', 'CHARGER_COUNT'];

function compilePatchedAt(root){
  const file = path.join(root, 'lib', 'trip-engine.js');
  let src = fs.readFileSync(file, 'utf8');
  const g = n => '(typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined)';
  src += '\n;module.exports.__test = {' +
    INTERNAL_FUNCS.map(n => n + ': ' + g(n)).join(', ') + ', ' +
    INTERNAL_VARS.map(n => 'get ' + n + '(){ return ' + g(n) + '; }').join(', ') + ' };\n';
  const m = new Module(file, module);
  m.filename = file;
  // Modules npm éventuels : ceux du dépôt (la copie extraite n'a pas de node_modules).
  m.paths = Module._nodeModulePaths(path.dirname(file)).concat(Module._nodeModulePaths(path.resolve(__dirname, '..', '..')));
  m._compile(src, file);
  return m.exports;
}

// Bundle des lieux reconstruit à partir des fichiers communes*.txt, dans l'ordre alphabétique (celui de
// scripts/build-data-bundles.js sous Windows) : les deux moteurs reçoivent ainsi un bundle construit de la même façon,
// même si public/data/communes-bundle.txt du dépôt est périmé. sources.communes = [{ cc, file }].
function buildBundle(communes){
  return communes.slice().sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .map(s => '###' + s.cc + '###\n' + fs.readFileSync(s.file, 'utf8')).join('\n');
}

async function loadEngineAt(root, sources){
  const e = compilePatchedAt(root);
  let bundle = buildBundle(sources.communes);
  await e.init(bundle, '', fs.readFileSync(sources.featured, 'utf8'), { skipSearchIndex: true });
  bundle = null;
  if(sources.chargers && fs.existsSync(sources.chargers) && e.loadChargingStations) e.loadChargingStations(fs.readFileSync(sources.chargers, 'utf8'));
  return e;
}

// ------------------------------------------------------------------------------------------------ hasard et horloge
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s){ let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// Graine fixe ET horloge ralentie ×10 (comme runSteady de tests/engine-regressions.test.js) : le budget de 4 s devient
// 40 s réelles, le résultat ne dépend pas de la charge de la machine. Le temps mesuré est le temps RÉEL du calcul.
function runSteady(E, params, seed){
  const NATIVE_RANDOM = Math.random, realNow = Date.now, t0 = realNow();
  Math.random = mulberry32(seed);
  Date.now = () => t0 + (realNow() - t0) / 10;
  const h0 = process.hrtime.bigint();
  try {
    const res = E.generateTrip(params);
    return { res, ms: Number(process.hrtime.bigint() - h0) / 1e6 };
  } finally { Math.random = NATIVE_RANDOM; Date.now = realNow; }
}

function hav(lat1, lon1, lat2, lon2){
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// ------------------------------------------------------------------------------------------------ jeu de tirages
// Départs : [clé, nom (ou variantes), pays, étiquettes]. Étiquettes utilisées par le résumé par catégorie.
const DEPARTURES = [
  // Pays rapides, à péage
  ['paris', 'Paris', 'FR', ['rapide', 'peage']], ['lyon', 'Lyon', 'FR', ['rapide', 'peage']],
  ['strasbourg', 'Strasbourg', 'FR', ['rapide', 'peage', 'frontiere']], ['lille', 'Lille', 'FR', ['rapide', 'peage', 'frontiere']],
  ['brest', 'Brest', 'FR', ['rapide', 'cote']],
  ['berlin', 'Berlin', 'DE', ['rapide', 'sans-peage']], ['munchen', 'München', 'DE', ['rapide', 'frontiere']],
  ['freiburg', 'Freiburg', 'DE', ['rapide', 'frontiere']], ['madrid', 'Madrid', 'ES', ['rapide', 'peage']],
  ['roma', 'Roma', 'IT', ['rapide', 'peage']], ['geneve', 'Genève', 'CH', ['frontiere', 'vignette']],
  ['wien', 'Wien', 'AT', ['vignette', 'frontiere']], ['bratislava', 'Bratislava', 'SK', ['vignette', 'frontiere']],
  ['ljubljana', 'Ljubljana', 'SI', ['vignette', 'frontiere']], ['warszawa', 'Warszawa', 'PL', ['peage']],
  ['lisboa', 'Lisboa', 'PT', ['peage']], ['london', 'London', 'GB', ['sans-peage', 'ferry']], ['dublin', 'Dublin', 'IE', ['ferry']],
  ['istanbul', 'İstanbul', 'TR', ['peage']], ['mexico', 'Mexico City', 'MX', ['peage']],
  ['juarez', 'Ciudad Juárez', 'MX', ['frontiere', 'peage']], ['newyork', 'New York City', 'US', ['peage']],
  ['tokyo', 'Tokyo', 'JP', ['peage']], ['santiago', 'Santiago', 'CL', ['peage']],
  // Pays lents
  ['ulanbator', ['Ulan Bator', 'Ulaanbaatar'], 'MN', ['lent']], ['bamako', 'Bamako', 'ML', ['lent']],
  ['mopti', 'Mopti', 'ML', ['lent', 'tension']], ['sarajevo', 'Sarajevo', 'BA', ['lent', 'peage']],
  ['antananarivo', 'Antananarivo', 'MG', ['lent', 'ile']], ['manila', 'Manila', 'PH', ['lent', 'ile']],
  ['kathmandu', 'Kathmandu', 'NP', ['lent']], ['nairobi', 'Nairobi', 'KE', []], ['dakar', 'Dakar', 'SN', []],
  // Îles, mesurées ou non
  ['ajaccio', 'Ajaccio', 'FR', ['ile']], ['bastia', 'Bastia', 'FR', ['ile', 'ferry']], ['mamoudzou', 'Mamoudzou', 'FR', ['ile', 'outre-mer']],
  ['reunion', 'Saint-Denis', 'FR', ['ile', 'outre-mer']], ['cebu', 'Cebu City', 'PH', ['ile', 'lent', 'ile-lent']],
  ['davao', 'Davao', 'PH', ['ile', 'lent', 'ile-lent']], ['denpasar', 'Denpasar', 'ID', ['ile', 'ile-lent', 'lent']],
  ['naha', 'Naha', 'JP', ['ile', 'peage']], ['sapporo', 'Sapporo', 'JP', ['ile', 'peage']], ['palma', 'Palma', 'ES', ['ile']],
  ['cagliari', 'Cagliari', 'IT', ['ile']], ['irakleion', 'Irákleion', 'GR', ['ile']], ['reykjavik', 'Reykjavík', 'IS', ['ile', 'grand-nord']],
  ['hobart', 'Hobart', 'AU', ['ile']], ['honolulu', 'Honolulu', 'US', ['ile']],
  // Autoroutes interdites aux motos
  ['seoul', 'Seoul', 'KR', ['moto-interdite', 'peage']], ['busan', 'Busan', 'KR', ['moto-interdite', 'peage']],
  ['taipei', 'Taipei', 'TW', ['moto-interdite', 'peage']], ['puli', 'Puli', 'TW', ['moto-interdite']],
  ['bangkok', 'Bangkok', 'TH', ['moto-interdite']], ['chiangmai', 'Chiang Mai', 'TH', ['moto-interdite', 'frontiere']],
  ['hanoi', 'Hanoi', 'VN', ['moto-interdite', 'frontiere']], ['hcmc', 'Ho Chi Minh City', 'VN', ['moto-interdite']],
  ['kualalumpur', 'Kuala Lumpur', 'MY', ['moto-interdite', 'peage']], ['kotabharu', 'Kota Bharu', 'MY', ['moto-interdite', 'frontiere']],
  ['jakarta', 'Jakarta', 'ID', ['moto-interdite', 'peage', 'lent']], ['karachi', 'Karachi', 'PK', ['moto-interdite']],
  // Zones à tension
  ['kharkiv', 'Kharkiv', 'UA', ['tension']], ['peshawar', 'Peshawar', 'PK', ['tension', 'moto-interdite']],
  ['goma', 'Goma', 'CD', ['tension', 'frontiere']], ['beyrouth', 'Beyrouth', 'LB', ['tension']],
  // Grand Nord, antiméridien
  ['tromso', 'Tromsø', 'NO', ['grand-nord', 'ferry']], ['rovaniemi', 'Rovaniemi', 'FI', ['grand-nord']],
  ['anchorage', 'Anchorage', 'US', ['grand-nord']], ['fairbanks', 'Fairbanks', 'US', ['grand-nord']],
  ['whitehorse', 'Whitehorse', 'CA', ['grand-nord']], ['anadyr', 'Anadyr', 'RU', ['grand-nord', 'antimeridien']],
  ['suva', 'Suva', 'FJ', ['ile', 'antimeridien']], ['labasa', 'Labasa', 'FJ', ['ile', 'antimeridien']],
  ['nukualofa', 'Nuku‘alofa', 'TO', ['ile', 'antimeridien']], ['christchurch', 'Christchurch', 'NZ', ['ile']],
];
const MODES = ['voiture-thermique', 'voiture-hybride', 'voiture-electrique', 'van', 'moto', 'velo'];

// Profils : nom, classe de durée, paramètres selon le mode (le vélo a ses propres échelles de distance).
const V = m => m === 'velo';
const PROFILES = [
  ['1j', m => ({ days: 1 })],
  ['1j-rayon', m => ({ days: 1, maxRadiusKm: V(m) ? 40 : 120 })],
  ['1j-min', m => ({ days: 1, minDistanceKm: V(m) ? 25 : 150 })],
  ['1j-min-haut', m => ({ days: 1, minDistanceKm: V(m) ? 37 : 205 })],
  ['1j-min-max', m => ({ days: 1, minDistanceKm: V(m) ? 15 : 100, maxDistanceKm: V(m) ? 45 : 250 })],
  ['3j', m => ({ days: 3 })],
  ['2j-min', m => ({ days: 2, minDistanceKm: V(m) ? 40 : 250 })],
  ['3j-sans-peage', m => ({ days: 3, tollEnabled: false, maxLegKm: V(m) ? 50 : 200 })],
  ['7j', m => ({ days: 7 })],
  ['7j-min-max-etapes', m => ({ days: 7, minDistanceKm: V(m) ? 60 : 300, maxDistanceKm: V(m) ? 150 : 700, maxLegKm: V(m) ? 70 : 350 })],
  ['7j-sans-ferry', m => ({ days: 7, ferryEnabled: false, maxRadiusKm: V(m) ? 150 : 600 })],
  ['7j-tension-off', m => ({ days: 7, avoidTension: false, maxRadiusKm: V(m) ? 150 : 800 })],
  ['14j', m => ({ days: 14, minDaysPerCity: 2, maxDaysPerCity: 3 })],
  ['14j-min-etapes', m => ({ days: 14, minDistanceKm: V(m) ? 100 : 500, maxLegKm: V(m) ? 80 : 500, maxRadiusKm: V(m) ? 300 : 1500 })],
  ['21j', m => ({ days: 21, maxRadiusKm: V(m) ? 400 : 2000, maxLegKm: V(m) ? 90 : 600, minDaysPerCity: 1, maxDaysPerCity: 2 })],
  ['21j-sans-ferry-tension-off', m => ({ days: 21, ferryEnabled: false, avoidTension: false, maxRadiusKm: V(m) ? 400 : 1500 })],
];

// Cas ciblés, toujours joués : chemins où les 12e et 13e audits ont introduit des régressions.
//   [départ, mode, nom, paramètres, graine]
const TARGETED = [];
(function(){
  // Aller-retour dans la journée depuis Paris : temps de calcul (×7 au 12e audit).
  for(const s of [1, 2, 3]) TARGETED.push(['paris', 'voiture-thermique', 'cible-1j-perf', { days: 1 }, s]);
  TARGETED.push(['paris', 'voiture-electrique', 'cible-1j-perf', { days: 1 }, 1]);
  TARGETED.push(['lyon', 'voiture-thermique', 'cible-1j-min380', { days: 1, minDistanceKm: 380 }, 1]);
  TARGETED.push(['lyon', 'voiture-thermique', 'cible-1j-min480', { days: 1, minDistanceKm: 480 }, 1]);
  // Vélo aller-retour avec éloignement : plafond de la journée (33 km à 15 km/h) — ne dépend pas du pays.
  for(const d of ['paris', 'lyon', 'berlin', 'madrid', 'ulanbator', 'bamako', 'sarajevo', 'antananarivo', 'cebu', 'manila'])
    for(const km of [20, 30, 36, 45]) TARGETED.push([d, 'velo', 'cible-velo-1j-min' + km, { days: 1, minDistanceKm: km }, 1]);
  // Électrique et moto aller-retour au-delà de 180 km (4,5 h × 80 km/h) : « hors de portée » ou « introuvable ».
  // 400 km : au-delà de 360 km (ancien plafond) et en deçà du plafond d'un pays rapide (FR 424 km) — la voiture électrique
  // (recharges) passe de « hors de portée » à « introuvable » entre 3d53524 et a8aa4bc.
  for(const d of ['paris', 'munchen', 'madrid', 'roma', 'istanbul'])
    for(const km of [215, 400]) for(const m of ['voiture-electrique', 'moto']) TARGETED.push([d, m, 'cible-1j-min' + km, { days: 1, minDistanceKm: km }, 1]);
  for(const d of ['seoul', 'taipei', 'bangkok', 'kualalumpur', 'ulanbator', 'bamako', 'mopti', 'kharkiv'])
    for(const km of [200, 350]) for(const m of ['moto', 'voiture-electrique']) TARGETED.push([d, m, 'cible-1j-min' + km, { days: 1, minDistanceKm: km }, 1]);
  // Aucun candidat (rayon plus court que l'éloignement, ou côte/île sans ferry) entre 180 km (ancien plafond à 80 km/h)
  // et le plafond à la vitesse du pays : « hors de portée » ou « introuvable » selon le plafond appliqué.
  for(const d of ['paris', 'lyon', 'madrid', 'munchen', 'brest', 'lisboa', 'bastia', 'palma', 'naha', 'sapporo'])
    for(const m of ['voiture-electrique', 'moto']){
      TARGETED.push([d, m, 'cible-1j-min200-rayon150', { days: 1, minDistanceKm: 200, maxRadiusKm: 150 }, 1]);
      TARGETED.push([d, m, 'cible-1j-min200-sans-ferry', { days: 1, minDistanceKm: 200, ferryEnabled: false }, 1]);
    }
  // Îles de pays lents et outre-mer : vitesse du pays ou du mode.
  for(const d of ['cebu', 'davao', 'denpasar', 'naha', 'sapporo', 'ajaccio', 'mamoudzou', 'reunion', 'palma', 'antananarivo'])
    for(const m of ['voiture-thermique', 'moto']) TARGETED.push([d, m, 'cible-ile-3j', { days: 3, maxRadiusKm: 200 }, 1]);
  // Moto : pays seulement traversé (Kota Bharu → Thaïlande, 12e audit).
  TARGETED.push(['kotabharu', 'moto', 'cible-moto-traverse', { days: 5, maxRadiusKm: 1500, maxLegKm: 800, minDaysPerCity: 1, maxDaysPerCity: 1, avoidTension: false }, 10]);
  // Ferries avec parties routières (Stuttgart/Bratislava au 12e audit).
  TARGETED.push(['bratislava', 'voiture-thermique', 'cible-ferry-12j', { days: 12, maxRadiusKm: 1500, maxLegKm: 1500, minDistanceKm: 700, maxDistanceKm: 1500, minDaysPerCity: 2, maxDaysPerCity: 3 }, 1]);
  TARGETED.push(['puli', 'voiture-thermique', 'cible-puli-8j', { days: 8, ferryEnabled: false, maxRadiusKm: 3000, minDistanceKm: 1500 }, 70104]);
})();

function durationClass(days){ return days === 1 ? '1j' : days <= 3 ? '2-3j' : days <= 7 ? '4-7j' : days <= 14 ? '8-14j' : '15-21j'; }

// Jeu FIXE : n tirages (≥ nombre de cas ciblés) — chaque départ reçoit les six modes à tour de rôle, et un profil
// choisi par une rotation différente de celle des modes, pour croiser modes, durées et options.
function buildTirages(n){
  const out = [];
  TARGETED.forEach(t => out.push({ dep: t[0], mode: t[1], profile: t[2], extra: t[3], seed: t[4] }));
  const rest = Math.max(0, n - out.length);
  const per = Math.max(1, Math.ceil(rest / DEPARTURES.length));
  let count = 0;
  for(let k = 0; k < per && count < rest; k++){
    for(let i = 0; i < DEPARTURES.length && count < rest; i++){
      const mode = MODES[(i + k) % MODES.length];
      const prof = PROFILES[(i * 5 + k * 7) % PROFILES.length];
      out.push({ dep: DEPARTURES[i][0], mode, profile: prof[0], extra: prof[1](mode), seed: 1000 + hashStr(DEPARTURES[i][0] + '|' + k) % 100000 });
      count++;
    }
  }
  out.forEach(t => { t.id = t.dep + '|' + t.mode + '|' + t.profile + '|' + JSON.stringify(t.extra) + '|s' + t.seed; });
  // Doublons éventuels (mêmes paramètres) : retirés, l'identifiant sert de clé de comparaison.
  const seen = new Set();
  return out.filter(t => !seen.has(t.id) && seen.add(t.id));
}

// ------------------------------------------------------------------------------------------------ trajets directs
// Paires nommées : îles de pays lents ou rapides, outre-mer, continents, frontières, moto interdite.
const PAIRS_NAMED = [
  ['Cebu City', 'Toledo', 'PH', 'ile-lent'], ['Cebu City', 'Bogo', 'PH', 'ile-lent'], ['Lapu-Lapu', 'Toledo', 'PH', 'ile-lent'],
  ['Manila', 'Baguio', 'PH', 'lent'], ['Davao', 'Cagayan de Oro', 'PH', 'ile-lent'],
  ['Denpasar', 'Singaraja', 'ID', 'ile-lent'], ['Jakarta', 'Bandung', 'ID', 'lent'],
  ['Naha', 'Nago', 'JP', 'ile'], ['Sapporo', 'Asahikawa', 'JP', 'ile'], ['Sapporo', 'Hakodate', 'JP', 'ile'], ['Tokyo', 'Utsunomiya', 'JP', 'continent'],
  ['Bastia', 'Ajaccio', 'FR', 'ile'], ['Mamoudzou', 'Kani-Kéli', 'FR', 'outre-mer'], ['Saint-Denis', 'Saint-Pierre', 'FR', 'outre-mer'],
  ['Cayenne', 'Kourou', 'FR', 'outre-mer'], ['Nouméa', 'Bourail', 'FR', 'outre-mer'],
  ['Palma', 'Manacor', 'ES', 'ile'], ['Sassari', 'Cagliari', 'IT', 'ile'], ['Palermo', 'Catania', 'IT', 'ile'], ['Irákleion', 'Chaniá', 'GR', 'ile'],
  ['Antananarivo', 'Toamasina', 'MG', 'lent'], ['Antananarivo', 'Antsirabe', 'MG', 'lent'],
  ['Christchurch', 'Invercargill', 'NZ', 'ile'], ['Hobart', 'Launceston', 'AU', 'ile'], ['Suva', 'Nadi', 'FJ', 'antimeridien'],
  ['Ulan Bator', 'Erdenet', 'MN', 'lent'], ['Ulan Bator', 'Darhan', 'MN', 'lent'], ['Bamako', 'Ségou', 'ML', 'lent'], ['Bamako', 'Sikasso', 'ML', 'lent'],
  ['Sarajevo', 'Mostar', 'BA', 'lent'], ['Sarajevo', 'Tuzla', 'BA', 'lent'], ['Banja Luka', 'Sarajevo', 'BA', 'lent'],
  ['Paris', 'Lyon', 'FR', 'rapide'], ['Lyon', 'Marseille', 'FR', 'rapide'], ['Paris', 'Rouen', 'FR', 'rapide'], ['Berlin', 'München', 'DE', 'rapide'],
  ['Hamburg', 'Bremen', 'DE', 'rapide'], ['Madrid', 'Valencia', 'ES', 'rapide'], ['Milano', 'Bologna', 'IT', 'rapide'],
  ['Seoul', 'Daejeon', 'KR', 'moto-interdite'], ['Taipei', 'Taichung', 'TW', 'moto-interdite'], ['Bangkok', 'Pattaya', 'TH', 'moto-interdite'],
  ['Hanoi', ['Haiphong', 'Hai Phong', 'Hải Phòng'], 'VN', 'moto-interdite'], ['Kuala Lumpur', 'Ipoh', 'MY', 'moto-interdite'], ['Karachi', 'Hyderabad', 'PK', 'moto-interdite'],
  ['Anchorage', 'Fairbanks', 'US', 'grand-nord'], ['Tromsø', 'Narvik', 'NO', 'grand-nord'], ['Rovaniemi', 'Oulu', 'FI', 'grand-nord'],
];
// Paires frontalières : [nom, pays, nom, pays, étiquette].
const PAIRS_CROSS = [
  ['Strasbourg', 'FR', 'Freiburg', 'DE', 'frontiere'], ['Lille', 'FR', 'Bruxelles', 'BE', 'frontiere'], ['Genève', 'CH', 'Annecy', 'FR', 'frontiere'],
  ['Wien', 'AT', 'Bratislava', 'SK', 'frontiere'], ['Kota Bharu', 'MY', 'Hat Yai', 'TH', 'moto-interdite'], ['Ciudad Juárez', 'MX', 'Chihuahua', 'MX', 'peage'],
  ['Ljubljana', 'SI', 'Zagreb', 'HR', 'frontiere'], ['Salzburg', 'AT', 'München', 'DE', 'frontiere'], ['Basel', 'CH', 'Mulhouse', 'FR', 'frontiere'],
];
// Pays des paires automatiques : les plus grandes villes du pays, appariées deux à deux (20 à 500 km par la route).
const PAIRS_COUNTRIES = ['FR', 'DE', 'ES', 'IT', 'PT', 'GB', 'IE', 'NL', 'BE', 'CH', 'AT', 'PL', 'CZ', 'HU', 'RO', 'HR', 'GR', 'TR', 'NO', 'SE',
  'FI', 'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'JP', 'KR', 'TW', 'TH', 'VN', 'MY', 'ID', 'PH', 'IN', 'PK', 'CN', 'AU', 'NZ', 'ZA', 'MA', 'EG',
  'KE', 'NG', 'MN', 'ML', 'BA', 'MG', 'NP', 'IR', 'KZ', 'UA', 'RS'];
const PAIRS_PER_COUNTRY = 3;

// ------------------------------------------------------------------------------------------------ résumé d'un tirage
function round1(x){ return typeof x === 'number' ? Math.round(x * 10) / 10 : x; }
function summarizeLeg(l){
  const o = { stop: l.stop, cc: l.country, day: l.dayNum, km: l.distanceKm, min: l.travelMin };
  if(l.roadKm !== undefined){ o.roadKm = l.roadKm; o.roadMin = l.roadMin; }
  if(l.tollInfo) o.toll = [round1(l.tollInfo.amountMin), round1(l.tollInfo.amount), (l.tollInfo.countries || []).join('+')];
  if(l.ferryInfo) o.ferry = [l.ferryInfo.routeKey, l.ferryInfo.amount === undefined ? null : l.ferryInfo.amount];
  if(l.chargeInfo) o.charge = [l.chargeInfo.stops, l.chargeInfo.minutes, !!l.chargeInfo.noChargerNearArrival];
  if(l.restrictions && l.restrictions.length) o.warn = l.restrictions.map(r => r.kind + ':' + r.type + ':' + (r.country || r.name || '')).sort();
  if(l.countriesCrossed && l.countriesCrossed.length) o.crossed = l.countriesCrossed.slice().sort();
  if(l.overMaxLeg) o.over = 1;
  if(l.tension) o.tension = l.tension.level || 1;
  return o;
}
function summarizeResult(res){
  const legs = res.legs || [];
  return {
    diag: { minDistanceUnreachable: !!res.minDistanceUnreachable, returnCapKm: res.returnCapKm === undefined ? null : res.returnCapKm,
      minDistanceNotFound: !!res.minDistanceNotFound, timedOut: !!res.timedOut, tensionBlocked: !!res.tensionBlocked,
      departureTension: res.departureTension ? (res.departureTension.level || 1) : null },
    legs: legs.map(summarizeLeg),
    notices: (res.notices || []).slice().sort(),
  };
}

// ------------------------------------------------------------------------------------------------ travailleur
function findPlaceIn(byCc, A, names, cc){
  const list = byCc.get(cc) || [];
  for(const name of [].concat(names)){
    const q = A.normalizeCityName(name);
    const hit = list.filter(c => c.norm === q).sort((a, b) => b.pop - a.pop)[0] ||
      list.filter(c => c.norm.indexOf(q) === 0).sort((a, b) => b.pop - a.pop)[0];
    if(hit) return hit;
  }
  return null;
}
function depObj(c){ return { name: c.name, cp: c.cps[0], lat: c.lat, lon: c.lon, dept: c.dept, country: c.country, allCps: c.cps.slice() }; }
function pt(c){ return { name: c.name, cc: c.country, lat: round1(c.lat * 1000) / 1000, lon: round1(c.lon * 1000) / 1000 }; }

async function runWorker(job, log){
  log = log || (() => {});
  const t0 = Date.now();
  const E = await loadEngineAt(job.root, job.sources);
  const A = E.__test;
  const TD = require(path.join(job.root, 'public', 'js', 'trip-data.js'));
  const loadMs = Date.now() - t0;
  log('moteur chargé en ' + Math.round(loadMs / 1000) + ' s, ' + Math.round(process.memoryUsage().rss / 1048576) + ' Mo');
  const byCc = new Map();
  for(const c of A.COMMUNES){ let a = byCc.get(c.country); if(!a) byCc.set(c.country, a = []); a.push(c); }

  // Tirages
  const tirages = buildTirages(job.n);
  const out = { label: job.label, root: job.root, loadMs, budgetMs: A.TRIP_TIME_BUDGET_MS, chargers: A.CHARGER_COUNT, tirages: [], legs: [], missing: [] };
  const depCache = new Map();
  const tStart = Date.now();
  tirages.forEach((t, i) => {
    const d = DEPARTURES.find(x => x[0] === t.dep);
    if(!depCache.has(t.dep)) depCache.set(t.dep, findPlaceIn(byCc, A, d[1], d[2]));
    const place = depCache.get(t.dep);
    if(!place){ out.missing.push('départ ' + t.dep); return; }
    const params = Object.assign({ departureCity: depObj(place), days: 1, budgetKey: 'moyen', transportKey: t.mode, tollEnabled: true,
      ferryEnabled: true, avoidTent: false, avoidTension: true, tripStart: '2026-10-01' }, t.extra);
    let r;
    try { r = runSteady(E, params, t.seed); }
    catch(e){ out.tirages.push({ id: t.id, dep: t.dep, cc: d[2], tags: d[3], mode: t.mode, profile: t.profile, days: params.days, error: String(e && e.stack || e).slice(0, 500) }); return; }
    out.tirages.push({ id: t.id, dep: t.dep, cc: d[2], tags: d[3], mode: t.mode, profile: t.profile, days: params.days,
      depPt: pt(place), ms: Math.round(r.ms), sum: summarizeResult(r.res) });
    if((i + 1) % 25 === 0) log((i + 1) + '/' + tirages.length + ' tirages, ' + Math.round((Date.now() - tStart) / 1000) + ' s');
  });

  // Appels directs de finalizeLeg : durée, péage, recharge sans l'aléa du tirage.
  const pairs = [];
  PAIRS_NAMED.forEach(p => pairs.push([p[0], p[2], p[1], p[2], p[3]]));
  PAIRS_CROSS.forEach(p => pairs.push(p));
  const resolved = [];
  pairs.forEach(p => {
    const a = findPlaceIn(byCc, A, p[0], p[1]), b = findPlaceIn(byCc, A, p[2], p[3]);
    if(!a || !b){ out.missing.push('paire ' + p[0] + ' → ' + p[2] + ' (' + p[1] + ')'); return; }
    resolved.push({ a, b, group: p[1] + ' ' + p[4] });
  });
  PAIRS_COUNTRIES.forEach(cc => {
    const list = (byCc.get(cc) || []).filter(c => c.pop >= 20000)
      .sort((x, y) => (y.pop - x.pop) || (x.name < y.name ? -1 : x.name > y.name ? 1 : 0)).slice(0, 16);
    let n = 0;
    for(let i = 0; i + 1 < list.length && n < PAIRS_PER_COUNTRY; i += 2){
      const km = hav(list[i].lat, list[i].lon, list[i + 1].lat, list[i + 1].lon) * 1.287;
      if(km < 20 || km > 500) continue;
      resolved.push({ a: list[i], b: list[i + 1], group: cc + ' auto' }); n++;
    }
  });
  const fl = A.finalizeLeg, seenPair = new Set();
  resolved.forEach(({ a, b, group }) => {
    const pk = a.name + '|' + a.country + '|' + b.name + '|' + b.country;
    if(seenPair.has(pk)) return; // paire nommée aussi tirée parmi les grandes villes du pays
    seenPair.add(pk);
    const km = Math.round(hav(a.lat, a.lon, b.lat, b.lon) * 1.287);
    for(const mode of MODES){
      const id = a.name + ' (' + a.country + ') → ' + b.name + ' (' + b.country + ') | ' + mode;
      try {
        const country = A.tollCountryOf ? A.tollCountryOf(b) : b.country;
        const h0 = process.hrtime.bigint();
        const leg = fl(km, TD.TRANSPORT[mode].speed, mode, true, country, a, b);
        const ms = Number(process.hrtime.bigint() - h0) / 1e6;
        out.legs.push({ id, group, mode, km, min: leg.travelMin, ms: Math.round(ms * 10) / 10,
          toll: leg.tollInfo ? [round1(leg.tollInfo.amountMin), round1(leg.tollInfo.amount), (leg.tollInfo.countries || []).join('+')] : null,
          charge: leg.chargeInfo ? [leg.chargeInfo.stops, leg.chargeInfo.minutes] : null });
      } catch(e){ out.legs.push({ id, group, mode, km, error: String(e && e.message || e).slice(0, 300) }); }
    }
  });
  out.totalMs = Date.now() - t0;
  out.rssMb = Math.round(process.memoryUsage().rss / 1048576);
  log('terminé : ' + out.tirages.length + ' tirages, ' + out.legs.length + ' trajets directs, ' + Math.round(out.totalMs / 1000) + ' s');
  return out;
}

// ------------------------------------------------------------------------------------------------ comparaison
const KINDS = ['erreur', 'depart', 'diagnostic', 'nbEtapes', 'etapes', 'distances', 'durees', 'peages', 'ferries', 'recharge', 'avertissements', 'pays', 'tension'];
const J = x => JSON.stringify(x === undefined ? null : x);
function fmtMin(m){ return m == null ? '—' : Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0'); }
function diagStr(d, n){
  const f = [];
  if(d.minDistanceUnreachable) f.push('minDistanceUnreachable(returnCapKm=' + d.returnCapKm + ')');
  if(d.minDistanceNotFound) f.push('minDistanceNotFound');
  if(d.timedOut) f.push('timedOut');
  if(d.tensionBlocked) f.push('tensionBlocked');
  return (n ? n + ' étapes' : 'vide') + (f.length ? ' ' + f.join(' ') : '');
}

// Diagnostic abrégé, pour le tableau des transitions (« minDistanceUnreachable → minDistanceNotFound »).
function diagShort(d, n){
  return d.minDistanceUnreachable ? 'minDistanceUnreachable' : d.minDistanceNotFound ? 'minDistanceNotFound' : d.timedOut ? 'timedOut' :
    d.tensionBlocked ? 'tensionBlocked' : n ? 'étapes' : 'vide sans diagnostic';
}
function compareTirage(a, b){
  const kinds = new Set(), det = [];
  if(a.error || b.error){
    if(J(a.error) !== J(b.error)){ kinds.add('erreur'); det.push('erreur : ' + (a.error || 'aucune').split('\n')[0] + ' → ' + (b.error || 'aucune').split('\n')[0]); }
    return { kinds: [...kinds], det };
  }
  if(J(a.depPt) !== J(b.depPt)){ kinds.add('depart'); det.push('départ résolu différemment : ' + J(a.depPt) + ' → ' + J(b.depPt)); }
  const da = a.sum.diag, db = b.sum.diag, la = a.sum.legs, lb = b.sum.legs;
  let trans = null;
  const diagKeys = ['minDistanceUnreachable', 'returnCapKm', 'minDistanceNotFound', 'timedOut', 'tensionBlocked'];
  if(diagKeys.some(k => da[k] !== db[k]) || (!la.length) !== (!lb.length)){ kinds.add('diagnostic'); det.push('diagnostic : ' + diagStr(da, la.length) + ' → ' + diagStr(db, lb.length)); trans = diagShort(da, la.length) + ' → ' + diagShort(db, lb.length); }
  if(da.departureTension !== db.departureTension){ kinds.add('tension'); det.push('tension au départ : ' + da.departureTension + ' → ' + db.departureTension); }
  if(J(a.sum.notices) !== J(b.sum.notices)){ kinds.add('avertissements'); det.push('avis : ' + J(a.sum.notices) + ' → ' + J(b.sum.notices)); }
  if(la.length !== lb.length && la.length && lb.length){ kinds.add('nbEtapes'); det.push('trajets : ' + la.length + ' → ' + lb.length); }
  const route = l => l.map(x => x.stop + (x.cc ? '/' + x.cc : '')).join(' → ');
  const tot = (l, f) => l.reduce((s, x) => s + (f(x) || 0), 0);
  if(la.length && lb.length && route(la) !== route(lb)){
    kinds.add('etapes');
    det.push('étapes : ' + route(la).slice(0, 300));
    det.push('      → ' + route(lb).slice(0, 300));
    det.push('total : ' + tot(la, x => x.km) + ' km ' + fmtMin(tot(la, x => x.min)) + ' → ' + tot(lb, x => x.km) + ' km ' + fmtMin(tot(lb, x => x.min)) +
      ' ; péage ≤ ' + round1(tot(la, x => x.toll && x.toll[1])) + ' → ' + round1(tot(lb, x => x.toll && x.toll[1])));
  } else if(la.length && la.length === lb.length){
    for(let i = 0; i < la.length; i++){
      const x = la[i], y = lb[i], w = '#' + (i + 1) + ' ' + x.stop + ' : ';
      if(x.km !== y.km || x.roadKm !== y.roadKm){ kinds.add('distances'); det.push(w + 'distance ' + x.km + (x.roadKm !== undefined ? ' (route ' + x.roadKm + ')' : '') + ' → ' + y.km + (y.roadKm !== undefined ? ' (route ' + y.roadKm + ')' : '') + ' km'); }
      if(x.min !== y.min || x.roadMin !== y.roadMin){ kinds.add('durees'); det.push(w + 'durée ' + fmtMin(x.min) + (x.roadMin !== undefined ? ' (route ' + fmtMin(x.roadMin) + ')' : '') + ' → ' + fmtMin(y.min) + (y.roadMin !== undefined ? ' (route ' + fmtMin(y.roadMin) + ')' : '')); }
      if(J(x.toll) !== J(y.toll)){ kinds.add('peages'); det.push(w + 'péage ' + J(x.toll) + ' → ' + J(y.toll)); }
      if(J(x.ferry) !== J(y.ferry)){ kinds.add('ferries'); det.push(w + 'ferry ' + J(x.ferry) + ' → ' + J(y.ferry)); }
      if(J(x.charge) !== J(y.charge)){ kinds.add('recharge'); det.push(w + 'recharge ' + J(x.charge) + ' → ' + J(y.charge)); }
      if(J(x.warn) !== J(y.warn) || x.over !== y.over){ kinds.add('avertissements'); det.push(w + 'avertissements ' + J(x.warn) + (x.over ? ' overMaxLeg' : '') + ' → ' + J(y.warn) + (y.over ? ' overMaxLeg' : '')); }
      if(J(x.crossed) !== J(y.crossed)){ kinds.add('pays'); det.push(w + 'pays traversés ' + J(x.crossed) + ' → ' + J(y.crossed)); }
      if(x.tension !== y.tension){ kinds.add('tension'); det.push(w + 'tension ' + J(x.tension) + ' → ' + J(y.tension)); }
    }
  }
  return { kinds: [...kinds], det, trans };
}

function median(a){ if(!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

// Seuil de ralentissement : ×1,5 ET +200 ms (le bruit de mesure d'un tirage court dépasse facilement ×1,5).
const SLOW_RATIO = 1.5, SLOW_MS = 200;

function compareRuns(A, B){
  const mapB = new Map(B.tirages.map(t => [t.id, t]));
  const rows = [], onlyA = [], slow = [], fast = [];
  const groups = {};
  const bump = (key, row) => {
    const g = groups[key] || (groups[key] = { n: 0, changed: 0, kinds: {}, msA: [], msB: [] });
    g.n++; if(row.kinds.length) g.changed++;
    row.kinds.forEach(k => { g.kinds[k] = (g.kinds[k] || 0) + 1; });
    if(row.msA != null && row.msB != null){ g.msA.push(row.msA); g.msB.push(row.msB); }
  };
  A.tirages.forEach(a => {
    const b = mapB.get(a.id);
    if(!b){ onlyA.push(a.id); return; }
    mapB.delete(a.id);
    const c = compareTirage(a, b);
    const row = { id: a.id, dep: a.dep, cc: a.cc, tags: a.tags, mode: a.mode, profile: a.profile, days: a.days, kinds: c.kinds, det: c.det, trans: c.trans, msA: a.ms, msB: b.ms };
    rows.push(row);
    if(a.ms != null && b.ms != null){
      if(b.ms > a.ms * SLOW_RATIO && b.ms - a.ms > SLOW_MS) slow.push(row);
      if(a.ms > b.ms * SLOW_RATIO && a.ms - b.ms > SLOW_MS) fast.push(row);
    }
    bump('mode ' + a.mode, row);
    bump('durée ' + durationClass(a.days), row);
    bump('pays ' + a.cc, row);
    (a.tags || []).forEach(t => bump('étiquette ' + t, row));
    if(/^cible-/.test(a.profile)) bump('cas ciblé ' + a.profile.replace(/\d+$/, ''), row);
  });
  const onlyB = [...mapB.keys()];

  // Trajets directs
  const legB = new Map(B.legs.map(l => [l.id, l]));
  const legRows = [], legGroups = {}, legOnlyA = [];
  A.legs.forEach(x => {
    const y = legB.get(x.id);
    if(!y){ legOnlyA.push(x.id); return; }
    legB.delete(x.id);
    const kinds = [];
    if(J(x.error) !== J(y.error)) kinds.push('erreur');
    if(x.min !== y.min) kinds.push('durees');
    if(J(x.toll) !== J(y.toll)) kinds.push('peages');
    if(J(x.charge) !== J(y.charge)) kinds.push('recharge');
    const ratio = (x.min > 0 && y.min > 0) ? y.min / x.min : null;
    const row = { id: x.id, group: x.group, mode: x.mode, km: x.km, minA: x.min, minB: y.min, ratio, tollA: x.toll, tollB: y.toll, chargeA: x.charge, chargeB: y.charge, kinds, msA: x.ms, msB: y.ms, errA: x.error, errB: y.error };
    legRows.push(row);
    // Groupe × (motorisés | vélo) : les cinq modes motorisés changent en général ensemble, une ligne suffit.
    for(const key of [x.group + (x.mode === 'velo' ? ' | vélo' : ' | motorisés'), 'mode ' + x.mode]){
      const g = legGroups[key] || (legGroups[key] = { n: 0, dur: 0, toll: 0, charge: 0, ratios: [] });
      g.n++; if(kinds.includes('durees')) g.dur++; if(kinds.includes('peages')) g.toll++; if(kinds.includes('recharge')) g.charge++;
      if(ratio != null && kinds.includes('durees')) g.ratios.push(ratio);
    }
  });

  const msA = A.tirages.filter(t => t.ms != null).map(t => t.ms), msB = B.tirages.filter(t => t.ms != null).map(t => t.ms);
  return {
    labels: [A.label, B.label],
    meta: { A: { loadMs: A.loadMs, totalMs: A.totalMs, rssMb: A.rssMb, chargers: A.chargers, missing: A.missing },
      B: { loadMs: B.loadMs, totalMs: B.totalMs, rssMb: B.rssMb, chargers: B.chargers, missing: B.missing } },
    tirages: { n: rows.length, changed: rows.filter(r => r.kinds.length).length, onlyA, onlyB, rows },
    timing: { medianA: median(msA), medianB: median(msB), maxA: Math.max(0, ...msA), maxB: Math.max(0, ...msB),
      totalA: msA.reduce((s, x) => s + x, 0), totalB: msB.reduce((s, x) => s + x, 0), slow, fast },
    groups,
    legs: { n: legRows.length, changed: legRows.filter(r => r.kinds.length).length, onlyA: legOnlyA, onlyB: [...legB.keys()], rows: legRows, groups: legGroups },
  };
}

// ------------------------------------------------------------------------------------------------ rapport texte
function formatReport(R, opts){
  opts = opts || {};
  const maxRows = opts.maxRows || 400;
  const L = [];
  const pct = (a, n) => n ? Math.round(100 * a / n) + ' %' : '—';
  const f0 = x => x == null ? '—' : String(Math.round(x));
  L.push('=== Comparaison du moteur : ' + R.labels[0] + '  →  ' + R.labels[1] + ' ===');
  for(const k of ['A', 'B']){
    const m = R.meta[k];
    L.push((k === 'A' ? 'ancien  ' : 'nouveau ') + ': chargement ' + Math.round(m.loadMs / 1000) + ' s, total ' + Math.round(m.totalMs / 1000) + ' s, ' + m.rssMb + ' Mo, bornes ' + m.chargers +
      (m.missing.length ? ', introuvables : ' + m.missing.join(', ') : ''));
  }
  const T = R.tirages;
  L.push('');
  L.push('--- Tirages : ' + T.changed + ' / ' + T.n + ' changés (' + pct(T.changed, T.n) + ')' +
    (T.onlyA.length ? ', ' + T.onlyA.length + ' seulement dans l\'ancien' : '') + (T.onlyB.length ? ', ' + T.onlyB.length + ' seulement dans le nouveau' : ''));
  const kindTot = {};
  T.rows.forEach(r => r.kinds.forEach(k => { kindTot[k] = (kindTot[k] || 0) + 1; }));
  L.push('par nature : ' + (KINDS.filter(k => kindTot[k]).map(k => k + ' ' + kindTot[k]).join(', ') || 'aucune différence'));
  [['seulement dans l\'ancien', T.onlyA],['seulement dans le nouveau', T.onlyB]].forEach(([w, l]) => { if(l.length) L.push(w + ' : ' + l.slice(0, 20).join(' ; ')); });
  // Transitions de diagnostic, par mode : « tous les vélos passent à minDistanceUnreachable » se lit ici d'un coup d'œil.
  const trans = {};
  T.rows.filter(r => r.trans && r.trans.indexOf('étapes → étapes') < 0).forEach(r => {
    const k = r.trans + '  [' + r.mode + ']';
    (trans[k] = trans[k] || []).push(r.dep + (r.days === 1 ? ' 1j' : ' ' + r.days + 'j') + ((r.id.match(/"minDistanceKm":(\d+)/) || [])[1] ? ' min ' + r.id.match(/"minDistanceKm":(\d+)/)[1] : ''));
  });
  const tk = Object.keys(trans).sort();
  if(tk.length){
    L.push('transitions de diagnostic (ancien → nouveau) :');
    tk.forEach(k => L.push('  ' + String(trans[k].length).padStart(3) + '  ' + k + ' : ' + trans[k].slice(0, 12).join(', ') + (trans[k].length > 12 ? '…' : '')));
  }

  const TM = R.timing;
  L.push('');
  L.push('--- Temps de calcul (réel, horloge du moteur ralentie ×10) : médiane ' + f0(TM.medianA) + ' → ' + f0(TM.medianB) + ' ms, max ' +
    f0(TM.maxA) + ' → ' + f0(TM.maxB) + ' ms, total ' + Math.round(TM.totalA / 1000) + ' → ' + Math.round(TM.totalB / 1000) + ' s');
  L.push('ralentis (> ×' + SLOW_RATIO + ' et > +' + SLOW_MS + ' ms) : ' + TM.slow.length + (TM.slow.length ? '' : ' — aucun'));
  TM.slow.sort((a, b) => (b.msB - b.msA) - (a.msB - a.msA)).slice(0, 40).forEach(r =>
    L.push('  ' + r.msA + ' → ' + r.msB + ' ms (×' + (r.msB / Math.max(1, r.msA)).toFixed(1) + ')  ' + r.id));
  if(TM.fast.length){
    L.push('accélérés (même seuil) : ' + TM.fast.length);
    TM.fast.sort((a, b) => (b.msA - b.msB) - (a.msA - a.msB)).slice(0, 10).forEach(r => L.push('  ' + r.msA + ' → ' + r.msB + ' ms  ' + r.id));
  }

  L.push('');
  L.push('--- Résumé par catégorie (changés / total, natures, temps médian ancien → nouveau) ---');
  const order = ['mode ', 'durée ', 'cas ciblé ', 'étiquette ', 'pays '];
  const keys = Object.keys(R.groups).sort((a, b) => {
    const ia = order.findIndex(p => a.startsWith(p)), ib = order.findIndex(p => b.startsWith(p));
    return ia - ib || (a < b ? -1 : 1);
  });
  keys.forEach(k => {
    const g = R.groups[k];
    if(k.startsWith('pays ') && !g.changed && !opts.all) return; // pays sans changement : omis (--all pour tout voir)
    const kinds = KINDS.filter(x => g.kinds[x]).map(x => x + ' ' + g.kinds[x]).join(', ');
    const mA = median(g.msA), mB = median(g.msB);
    const flag = (g.changed === g.n && g.n > 1) ? '  ← TOUS changés' : '';
    const tflag = (mA != null && mB > mA * SLOW_RATIO && mB - mA > SLOW_MS / 2) ? '  ← plus lent' : (mA != null && mA > mB * SLOW_RATIO && mA - mB > SLOW_MS / 2) ? '  ← plus rapide' : '';
    L.push('  ' + k.padEnd(34) + String(g.changed).padStart(4) + ' / ' + String(g.n).padEnd(4) + (kinds ? ' ' + kinds : '') + '  [' + f0(mA) + ' → ' + f0(mB) + ' ms]' + flag + tflag);
  });

  const LG = R.legs;
  L.push('');
  L.push('--- Trajets directs (finalizeLeg) : ' + LG.changed + ' / ' + LG.n + ' changés' +
    (LG.onlyA.length ? ', ' + LG.onlyA.length + ' seulement dans l\'ancien' : '') + (LG.onlyB.length ? ', ' + LG.onlyB.length + ' seulement dans le nouveau' : ''));
  [['seulement dans l\'ancien', LG.onlyA],['seulement dans le nouveau', LG.onlyB]].forEach(([w, l]) => { if(l.length) L.push('  ' + w + ' : ' + l.slice(0, 12).join(' ; ')); });
  L.push('  groupe | mode                           durée chg / n   rapport durée nouveau/ancien (médiane, min–max)   péage chg   recharge chg');
  Object.keys(LG.groups).sort((a, b) => (a.startsWith('mode ') ? 0 : 1) - (b.startsWith('mode ') ? 0 : 1) || (a < b ? -1 : 1)).forEach(k => {
    const g = LG.groups[k];
    if(!k.startsWith('mode ') && !g.dur && !g.toll && !g.charge && !opts.all) return;
    const r = g.ratios.length ? '×' + median(g.ratios).toFixed(3) + ' (' + Math.min(...g.ratios).toFixed(3) + '–' + Math.max(...g.ratios).toFixed(3) + ')' +
      (median(g.ratios) < 0.98 ? ' plus rapide' : median(g.ratios) > 1.02 ? ' plus lent' : '') : '';
    L.push('  ' + k.padEnd(38) + String(g.dur).padStart(3) + ' / ' + String(g.n).padEnd(4) + ' ' + r.padEnd(44) + String(g.toll).padStart(6) + String(g.charge).padStart(12));
  });
  const changedLegs = LG.rows.filter(r => r.kinds.length);
  if(changedLegs.length){
    L.push('  détail (' + Math.min(changedLegs.length, maxRows) + ' premiers) :');
    changedLegs.slice(0, maxRows).forEach(r => {
      const p = [];
      if(r.kinds.includes('erreur')) p.push('erreur ' + (r.errA || '—') + ' → ' + (r.errB || '—'));
      if(r.kinds.includes('durees')) p.push(fmtMin(r.minA) + ' → ' + fmtMin(r.minB) + (r.ratio ? ' (×' + r.ratio.toFixed(3) + ')' : ''));
      if(r.kinds.includes('peages')) p.push('péage ' + J(r.tollA) + ' → ' + J(r.tollB));
      if(r.kinds.includes('recharge')) p.push('recharge ' + J(r.chargeA) + ' → ' + J(r.chargeB));
      L.push('    ' + r.id + ', ' + r.km + ' km : ' + p.join(' ; '));
    });
  }

  L.push('');
  const changed = T.rows.filter(r => r.kinds.length);
  L.push('--- Détail des tirages changés (' + Math.min(changed.length, maxRows) + ' / ' + changed.length + ') ---');
  changed.slice(0, maxRows).forEach(r => {
    L.push('* ' + r.id + '  [' + r.kinds.join(', ') + ']  ' + r.msA + ' → ' + r.msB + ' ms');
    r.det.slice(0, 12).forEach(d => L.push('    ' + d));
    if(r.det.length > 12) L.push('    … ' + (r.det.length - 12) + ' autres lignes (voir le JSON)');
  });
  L.push('');
  L.push('Règle : tout changement listé doit être VOULU et EXPLIQUÉ avant un commit (voir tests/README.md).');
  return L.join('\n');
}

module.exports = { loadEngineAt, compilePatchedAt, buildBundle, runSteady, buildTirages, runWorker, compareRuns, compareTirage, formatReport,
  summarizeResult, DEPARTURES, MODES, PROFILES, TARGETED, PAIRS_NAMED, PAIRS_CROSS, PAIRS_COUNTRIES, KINDS, SLOW_RATIO, SLOW_MS };
