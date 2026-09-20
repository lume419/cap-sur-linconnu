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
//   - buildTirages(n), PAIRS_NAMED, PAIRS_CROSS, PAIRS_MOTO_TRANSIT, PAIRS_FERRY, PAIRS_COUNTRIES : jeu de tirages et de
//     trajets FIXE et reproductible ;
//   - runWorker(job) : exécute le jeu avec un moteur et renvoie les résultats résumés (un processus par moteur) ;
//   - compareRuns(a, b) et formatReport(rapport) : différences, couverture, temps de calcul (alerte globale), résumé par
//     catégorie, trajets directs, hébergement, temps réel.
// 14e audit du 19/09/2026 : moto en vrai transit, étapes avec traversée dans les trajets directs (directHop), hébergement,
// bornes, couverture du prix des ferries, pays traversés et restrictions comparés ; aller-retour près d'un pays plus rapide et
// petites distances ; tension au départ comparée seulement si les deux résultats la portent ; alerte de ralentissement
// global ; option --temps-reel (voir tests/compare-engine.js).
// 15e audit du 19/09/2026 : trois régressions de la 14e passe avaient échappé à l'outil — distance annoncée « hors de
// portée, X km » infaisable (redemander à X renvoyait X − 1), départ dans un pays couvert par le filtre des zones à tension
// « introuvable » au lieu de « hors de portée » (Moscou, Kyiv, Téhéran, Caracas, Kaboul), Sharm el-Sheikh à moto « hors de
// portée » alors que seul le filtre des zones bloquait — et un défaut ancien : une paire de ports d'une liaison recevait la
// durée, la distance et le prix de la ligne de référence (Gênes → Palerme « 24 min, 8 km, 43 € » = détroit de Messine).
// Ajouts : CONTRE-ÉPREUVE de chaque « hors de portée, X km » (même tirage rejoué à minDistanceKm = X, voir runWorker),
// cas ciblés correspondants, traversées résumées avec leur distance et leur marque « estimée d'après la paire »
// (pairEstimated du moteur, ou déduite : distance/durée différentes de toutes celles de la liaison), trajets directs
// Gênes → Palerme & co. avec témoins sur les paires de référence.
'use strict';
const fs = require('fs');
const path = require('path');
const Module = require('module');

// Mêmes noms que tests/helpers/engine.js (13e audit : repris ici car ce fichier-là charge toujours le moteur du dépôt).
// 14e audit du 19/09/2026 : fonctions de l'étape avec traversée (même enchaînement que finalizeHop de buildItinerary, voir
// directHop), restrictions, pays d'un point et liens d'hébergement, pour les trajets directs. Absente d'une ancienne version :
// undefined (le travailleur saute alors la mesure et le signale).
const INTERNAL_FUNCS = ['landmassOf', 'zoneOf', 'tollCountryOf', 'motoMotorwayBan', 'normalizeCityName', 'finalizeLeg',
  'countrySpeedFactor', 'countriesAlong', 'seaCrossingFor', 'ferryRouteFor', 'ferryRoadParts', 'finalizeFerryLeg',
  'restrictionsForLeg', 'roadDistanceKm', 'countryAtPoint', 'buildLodgingLinks',
  // 15e audit du 19/09/2026 : traversée estimée d'après la paire de ports (absente avant le 15e audit).
  'ferryRouteForPair'];
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
// slow = 1 (14e audit du 19/09/2026, option --temps-reel) : horloge normale, budget de 4 s comme en production — le
// résultat dépend alors de la machine et de sa charge.
function runSteady(E, params, seed, slow){
  const k = slow === undefined ? 10 : slow;
  const NATIVE_RANDOM = Math.random, realNow = Date.now, t0 = realNow();
  Math.random = mulberry32(seed);
  if(k !== 1) Date.now = () => t0 + (realNow() - t0) / k;
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
  // Autoroutes interdites aux motos, et pays voisins. Étiquette « moto-interdite » CALCULÉE par le travailleur avec
  // motoMotorwayBan du moteur (interdiction nationale totale), plus écrite à la main (14e audit du 19/09/2026 : Kuala
  // Lumpur et Kota Bharu la portaient à tort, la Malaisie n'interdit pas ses autoroutes aux motos).
  ['seoul', 'Seoul', 'KR', ['peage']], ['busan', 'Busan', 'KR', ['peage']],
  ['taipei', 'Taipei', 'TW', ['peage']], ['puli', 'Puli', 'TW', []],
  ['bangkok', 'Bangkok', 'TH', []], ['chiangmai', 'Chiang Mai', 'TH', ['frontiere']],
  ['hanoi', 'Hanoi', 'VN', ['frontiere']], ['hcmc', 'Ho Chi Minh City', 'VN', []],
  ['kualalumpur', 'Kuala Lumpur', 'MY', ['peage']], ['kotabharu', 'Kota Bharu', 'MY', ['frontiere']],
  ['jakarta', 'Jakarta', 'ID', ['peage', 'lent']], ['karachi', 'Karachi', 'PK', []],
  // Zones à tension
  ['kharkiv', 'Kharkiv', 'UA', ['tension']], ['peshawar', 'Peshawar', 'PK', ['tension']],
  ['goma', 'Goma', 'CD', ['tension', 'frontiere']], ['beyrouth', 'Beyrouth', 'LB', ['tension']],
  // Grand Nord, antiméridien
  ['tromso', 'Tromsø', 'NO', ['grand-nord', 'ferry']], ['rovaniemi', 'Rovaniemi', 'FI', ['grand-nord']],
  ['anchorage', 'Anchorage', 'US', ['grand-nord']], ['fairbanks', 'Fairbanks', 'US', ['grand-nord']],
  ['whitehorse', 'Whitehorse', 'CA', ['grand-nord']], ['anadyr', 'Anadyr', 'RU', ['grand-nord', 'antimeridien']],
  ['suva', 'Suva', 'FJ', ['ile', 'antimeridien']], ['labasa', 'Labasa', 'FJ', ['ile', 'antimeridien']],
  ['nukualofa', 'Nuku‘alofa', 'TO', ['ile', 'antimeridien']], ['christchurch', 'Christchurch', 'NZ', ['ile']],
];
// Départs des SEULS cas ciblés (14e audit du 19/09/2026) : hors de la rotation des tirages ordinaires, pour ne pas en
// changer la composition. Même format que DEPARTURES.
const TARGET_DEPARTURES = [
  // Pays lents voisins d'un pays plus rapide : plafond annoncé de l'aller-retour (returnCapKm).
  ['kayes', 'Kayes', 'ML', ['lent', 'frontiere']], ['bihac', ['Bihać', 'Bihac'], 'BA', ['lent', 'frontiere']],
  // Moto en vrai transit (pays à autoroutes interdites seulement traversé, départ et arrivée dans deux autres pays).
  ['nanning', 'Nanning', 'CN', ['frontiere']], ['kunming', 'Kunming', 'CN', ['frontiere']],
  ['myawaddy', 'Myawaddy', 'MM', ['frontiere']], ['luangprabang', 'Luang Prabang', 'LA', ['frontiere']],
  // Cas de production : itinéraire sous horloge ×10, « éloignement introuvable » en temps réel (voir --temps-reel).
  ['mutang', 'Mutang', 'CN', []], ['bellavista', 'Bella Vista', 'BZ', []], ['nanma', 'Nanma', 'CN', []],
  // 15e audit du 19/09/2026. Pays couverts par le filtre des zones à tension, grands éloignements (« introuvable » au lieu
  // de « hors de portée » à la 14e passe) ; Sharm el-Sheikh (« hors de portée » alors que seul le filtre bloquait), Brouta.
  ['moscou', 'Moscow', 'RU', ['tension']], ['kyiv', 'Kyiv', 'UA', ['tension']], ['teheran', 'Tehran', 'IR', ['tension']],
  ['caracas', 'Caracas', 'VE', ['tension']], ['kaboul', 'Kabul', 'AF', ['tension', 'lent']],
  ['sharm', 'Sharm el-Sheikh', 'EG', ['tension', 'cote']], ['brouta', 'Brouta', 'CI', ['tension']],
  // Distance annoncée infaisable à la 14e passe (contre-épreuve : redemander à X renvoyait X − 1).
  ['lewe', 'Lewe', 'MM', ['lent']], ['xarardheere', 'Xarardheere', 'SO', ['lent', 'cote']],
  ['calumboyan', 'Calumboyan', 'PH', ['ile', 'lent', 'ile-lent']], ['leganes', 'Leganes', 'PH', ['ile', 'lent', 'ile-lent']],
  ['jasdan', 'Jasdan', 'IN', []],
  // Très petites îles : aller-retour sans éloignement.
  ['jamestown', 'Jamestown', 'SH', ['ile']], ['longyearbyen', 'Longyearbyen', 'SJ', ['ile', 'grand-nord']],
  ['parintins', 'Parintins', 'BR', ['ile']],
];
function departureOf(key){ return DEPARTURES.find(x => x[0] === key) || TARGET_DEPARTURES.find(x => x[0] === key); }
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
//   [départ, mode, nom, paramètres, graine, options] — options.rt : joué aussi en temps réel avec --temps-reel (14e audit).
const TARGETED = [];
(function(){
  // Aller-retour dans la journée depuis Paris : temps de calcul (×7 au 12e audit).
  for(const s of [1, 2, 3]) TARGETED.push(['paris', 'voiture-thermique', 'cible-1j-perf', { days: 1 }, s, { rt: s === 1 }]);
  TARGETED.push(['paris', 'voiture-electrique', 'cible-1j-perf', { days: 1 }, 1]);
  TARGETED.push(['lyon', 'voiture-thermique', 'cible-1j-min380', { days: 1, minDistanceKm: 380 }, 1, { rt: true }]);
  TARGETED.push(['lyon', 'voiture-thermique', 'cible-1j-min480', { days: 1, minDistanceKm: 480 }, 1, { rt: true }]);
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
  // Moto : pays seulement traversé (12e audit). 14e audit du 19/09/2026 : Kota Bharu → Bukit Kayu Hitam (graine 10) passe
  // par la Thaïlande mais reste un trajet INTÉRIEUR (Malaisie → Malaisie : aucun transit depuis le 13e audit) — gardé
  // comme cas témoin sous ce nom. Les VRAIS transits (départ et arrivée dans deux pays sans interdiction, pays traversé à
  // autoroutes interdites aux motos d'après motoMotorwayBan et countriesAlong du moteur) sont les tirages ci-dessous,
  // graines choisies le 19/09/2026 parce qu'elles en produisent un : Viêt Nam entre la Chine et le Laos, Thaïlande entre
  // la Birmanie et le Laos. Aucun transit possible par la Corée du Sud, Taïwan ou le Sri Lanka (pas de voisin par la
  // route) ; Malaisie → Cambodge/Laos par la Thaïlande et Inde → Afghanistan par le Pakistan : aucun sur 60 graines
  // (trajets directs seulement, voir PAIRS_MOTO_TRANSIT). Le rapport compte les tirages avec transit réel (« Couverture »).
  TARGETED.push(['kotabharu', 'moto', 'cible-moto-interieur-via-TH', { days: 5, maxRadiusKm: 1500, maxLegKm: 800, minDaysPerCity: 1, maxDaysPerCity: 1, avoidTension: false }, 10]);
  const T5 = { days: 5, maxRadiusKm: 1200, maxLegKm: 900, minDaysPerCity: 1, maxDaysPerCity: 1, avoidTension: false };
  for(const s of [16, 35]) TARGETED.push(['nanning', 'moto', 'cible-moto-transit-VN-5j', T5, s]);
  for(const s of [7, 50]) TARGETED.push(['nanning', 'moto', 'cible-moto-transit-VN-2j', { days: 2, minDistanceKm: 700, maxLegKm: 1200, avoidTension: false }, s, { rt: s === 7 }]);
  for(const s of [17, 43]) TARGETED.push(['kunming', 'moto', 'cible-moto-transit-VN-5j', T5, s]);
  for(const s of [7, 55]) TARGETED.push(['luangprabang', 'moto', 'cible-moto-transit-VN-3j', { days: 3, minDistanceKm: 500, maxLegKm: 1000, avoidTension: false }, s]);
  for(const s of [24, 55]) TARGETED.push(['myawaddy', 'moto', 'cible-moto-transit-TH-5j', Object.assign({}, T5, { maxRadiusKm: 900, maxLegKm: 700 }), s]);
  for(const s of [9, 14]) TARGETED.push(['myawaddy', 'moto', 'cible-moto-transit-TH-3j', { days: 3, minDistanceKm: 400, maxLegKm: 800, avoidTension: false }, s]);
  // Même tirage en voiture (témoin : aucune restriction, autoroutes permises).
  TARGETED.push(['nanning', 'voiture-thermique', 'cible-moto-transit-VN-2j-temoin-voiture', { days: 2, minDistanceKm: 700, maxLegKm: 1200, avoidTension: false }, 7]);
  // Aller-retour dans la journée PRÈS D'UN PAYS PLUS RAPIDE (14e audit) : plafond annoncé (returnCapKm) d'un départ de pays
  // lent dont la zone atteignable déborde sur un voisin plus rapide (Mali → Sénégal/Guinée, Bosnie → Croatie).
  for(const d of ['bamako', 'kayes', 'sarajevo', 'bihac'])
    for(const km of [250, 290, 330, 370]) for(const m of ['voiture-thermique', 'moto'])
      TARGETED.push([d, m, 'cible-1j-lent-voisin-min' + km, { days: 1, minDistanceKm: km }, 1, { rt: km === 330 }]);
  // Distance max / étape max de moins de 15 km (plancher de 15 km de l'aller-retour, 14e audit).
  for(const m of ['voiture-thermique', 'velo']){
    TARGETED.push(['lyon', m, 'cible-1j-petit-max10', { days: 1, maxDistanceKm: 10 }, 1]);
    TARGETED.push(['lyon', m, 'cible-1j-petit-etape5', { days: 1, maxLegKm: 5 }, 1]);
    TARGETED.push(['lyon', m, 'cible-1j-petit-max10-etape5', { days: 1, maxDistanceKm: 10, maxLegKm: 5 }, 1]);
    TARGETED.push(['lyon', m, 'cible-1j-petit-rayon10', { days: 1, maxRadiusKm: 10 }, 1]);
    TARGETED.push(['lyon', m, 'cible-3j-petit-etape5', { days: 3, maxLegKm: 5 }, 1]);
  }
  // Cas de production (14e audit) : itinéraire sous horloge ×10, « éloignement introuvable » en temps réel avec le
  // budget de 4 s. Joués aussi en temps réel avec --temps-reel.
  for(const d of ['mutang', 'bellavista', 'nanma'])
    for(const m of ['voiture-thermique', 'voiture-hybride', 'voiture-electrique', 'moto'])
      TARGETED.push([d, m, 'cible-prod-5j-min649', { days: 5, minDistanceKm: 649 }, 1, { rt: true }]);
  // Ferries avec parties routières (Stuttgart/Bratislava au 12e audit).
  TARGETED.push(['bratislava', 'voiture-thermique', 'cible-ferry-12j', { days: 12, maxRadiusKm: 1500, maxLegKm: 1500, minDistanceKm: 700, maxDistanceKm: 1500, minDaysPerCity: 2, maxDaysPerCity: 3 }, 1]);
  TARGETED.push(['puli', 'voiture-thermique', 'cible-puli-8j', { days: 8, ferryEnabled: false, maxRadiusKm: 3000, minDistanceKm: 1500 }, 70104]);
  // 15e audit du 19/09/2026. Départ dans un pays couvert par le filtre des zones à tension, filtre ACTIF (profil par
  // défaut), éloignement au-delà du plafond de la journée : « hors de portée » attendu (la 14e passe répondait
  // « introuvable »). Sharm el-Sheikh à moto 190 km : seul le filtre des zones bloque, « hors de portée » est faux.
  for(const [d, km] of [['moscou', 600], ['kyiv', 500], ['teheran', 500], ['kharkiv', 500], ['caracas', 500], ['kaboul', 400], ['brouta', 300]])
    TARGETED.push([d, 'voiture-thermique', 'cible-1j-tension-loin-min' + km, { days: 1, minDistanceKm: km }, 1]);
  TARGETED.push(['sharm', 'moto', 'cible-1j-tension-loin-min190', { days: 1, minDistanceKm: 190 }, 1]);
  // Distance annoncée infaisable à la 14e passe (la contre-épreuve de l'ancien moteur doit échouer, celle du nouveau passer).
  TARGETED.push(['lewe', 'voiture-electrique', 'cible-1j-annonce-min344', { days: 1, minDistanceKm: 344 }, 1]);
  TARGETED.push(['xarardheere', 'voiture-electrique', 'cible-1j-annonce-min434', { days: 1, minDistanceKm: 434 }, 1]);
  TARGETED.push(['calumboyan', 'voiture-electrique', 'cible-1j-annonce-min457', { days: 1, minDistanceKm: 457 }, 1]);
  TARGETED.push(['leganes', 'voiture-thermique', 'cible-1j-annonce-min237', { days: 1, minDistanceKm: 237 }, 1]);
  TARGETED.push(['jasdan', 'moto', 'cible-1j-annonce-min377', { days: 1, minDistanceKm: 377 }, 1]);
  // Très petites îles, aller-retour sans éloignement ; Lyon avec une distance max de 1 et 3 km.
  for(const d of ['jamestown', 'longyearbyen', 'parintins']) TARGETED.push([d, 'voiture-thermique', 'cible-1j-petite-ile', { days: 1 }, 1]);
  for(const m of ['voiture-thermique', 'velo']) for(const km of [1, 3]) TARGETED.push(['lyon', m, 'cible-1j-petit-max' + km, { days: 1, maxDistanceKm: km }, 1]);
})();

function durationClass(days){ return days === 1 ? '1j' : days <= 3 ? '2-3j' : days <= 7 ? '4-7j' : days <= 14 ? '8-14j' : '15-21j'; }

// Jeu FIXE : n tirages (≥ nombre de cas ciblés) — chaque départ reçoit les six modes à tour de rôle, et un profil
// choisi par une rotation différente de celle des modes, pour croiser modes, durées et options.
function buildTirages(n){
  const out = [];
  TARGETED.forEach(t => out.push({ dep: t[0], mode: t[1], profile: t[2], extra: t[3], seed: t[4], rt: !!(t[5] && t[5].rt) }));
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
// Paires nommées : îles de pays lents ou rapides, outre-mer, continents, frontières. Le suffixe « moto-interdite » (pays
// d'une extrémité) ou « moto-transit » (pays seulement traversé) du groupe est CALCULÉ par le travailleur avec
// motoMotorwayBan et countriesAlong du moteur (14e audit du 19/09/2026 : plus d'étiquette écrite à la main, voir DEPARTURES).
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
  ['Seoul', 'Daejeon', 'KR', 'continent'], ['Taipei', 'Taichung', 'TW', 'continent'], ['Bangkok', 'Pattaya', 'TH', 'continent'],
  ['Hanoi', ['Haiphong', 'Hai Phong', 'Hải Phòng'], 'VN', 'continent'], ['Kuala Lumpur', 'Ipoh', 'MY', 'continent'], ['Karachi', 'Hyderabad', 'PK', 'continent'],
  ['Anchorage', 'Fairbanks', 'US', 'grand-nord'], ['Tromsø', 'Narvik', 'NO', 'grand-nord'], ['Rovaniemi', 'Oulu', 'FI', 'grand-nord'],
];
// Paires frontalières : [nom, pays, nom, pays, étiquette].
const PAIRS_CROSS = [
  ['Strasbourg', 'FR', 'Freiburg', 'DE', 'frontiere'], ['Lille', 'FR', 'Bruxelles', 'BE', 'frontiere'], ['Genève', 'CH', 'Annecy', 'FR', 'frontiere'],
  ['Wien', 'AT', 'Bratislava', 'SK', 'frontiere'], ['Kota Bharu', 'MY', 'Hat Yai', 'TH', 'frontiere'], ['Ciudad Juárez', 'MX', 'Chihuahua', 'MX', 'peage'],
  ['Ljubljana', 'SI', 'Zagreb', 'HR', 'frontiere'], ['Salzburg', 'AT', 'München', 'DE', 'frontiere'], ['Basel', 'CH', 'Mulhouse', 'FR', 'frontiere'],
];
// Moto en VRAI transit (14e audit du 19/09/2026) : [nom, pays, nom, pays, étiquette]. Vérifié le 19/09/2026 avec
// countriesAlong et motoMotorwayBan du moteur : aucune des deux extrémités n'est dans un pays à autoroutes interdites
// (interdiction nationale totale), le trait traverse un tel pays. Kota Bharu → Siem Reap : témoin (le trait passe par
// le golfe de Thaïlande, aucun transit). Le groupe reçoit « moto-transit » seulement si le moteur le confirme.
const PAIRS_MOTO_TRANSIT = [
  ['Nanning', 'CN', 'Luang Prabang', 'LA', 'transit-VN'], ['Nanning', 'CN', 'Vientiane', 'LA', 'transit-VN'],
  ['Kunming', 'CN', 'Vientiane', 'LA', 'transit-VN'], ['Nanning', 'CN', 'Phnom Penh', 'KH', 'transit-VN'],
  ['Alor Setar', 'MY', 'Battambang', 'KH', 'transit-TH'], ['Alor Setar', 'MY', 'Vientiane', 'LA', 'transit-TH'],
  ['Myawaddy', 'MM', 'Vientiane', 'LA', 'transit-TH'], ['Amritsar', 'IN', 'Kabul', 'AF', 'transit-PK'],
  ['Amritsar', 'IN', 'Jalalabad', 'AF', 'transit-PK'], ['Zahedan', 'IR', 'Kandahar', 'AF', 'transit-PK'],
  ['Kota Bharu', 'MY', 'Siem Reap', 'KH', 'temoin-sans-transit'],
];
// Étapes avec TRAVERSÉE (14e audit) : [nom, pays, nom, pays, étiquette]. Jouées par directHop, même enchaînement que
// finalizeHop de buildItinerary (traversée entre zones, puis liaison entre masses terrestres, sinon finalizeLeg) :
// finalizeFerryLeg avec ses parties routières, péages, recharges, pays traversés et couverture du prix. Liaison vérifiée
// le 19/09/2026 (ferryRouteFor / seaCrossingFor) ; une paire sans liaison est jouée quand même (étape par la route).
const PAIRS_FERRY = [
  ['Bastia', 'FR', 'Nice', 'FR', 'ferry'], ['Nice', 'FR', 'Bastia', 'FR', 'ferry'], ['Ajaccio', 'FR', 'Marseille', 'FR', 'ferry'],
  ['Palma', 'ES', 'Barcelona', 'ES', 'ferry'], ['Stuttgart', 'DE', 'Cagliari', 'IT', 'ferry-transit'], ['Bratislava', 'SK', 'Palermo', 'IT', 'ferry-transit'],
  ['Olbia', 'IT', 'Livorno', 'IT', 'ferry'], ['Palermo', 'IT', 'Napoli', 'IT', 'ferry'], ['Naha', 'JP', 'Kagoshima', 'JP', 'ferry'],
  ['Hakodate', 'JP', 'Aomori', 'JP', 'ferry'], ['Denpasar', 'ID', 'Surabaya', 'ID', 'ferry'], ['Cebu City', 'PH', 'Tagbilaran', 'PH', 'ferry'],
  ['Ceuta', 'ES', 'Algeciras', 'ES', 'ferry-zone'], ['Hobart', 'AU', 'Melbourne', 'AU', 'ferry'], ['Wellington', 'NZ', 'Christchurch', 'NZ', 'ferry'],
  ['Jeju', 'KR', 'Seoul', 'KR', 'ferry'], ['Magong', 'TW', 'Taipei', 'TW', 'ferry'], ['Dzaoudzi', 'FR', 'Mamoudzou', 'FR', 'ferry'],
  ['London', 'GB', 'Paris', 'FR', 'ferry'], ['Dublin', 'IE', 'Liverpool', 'GB', 'ferry'], ['Split', 'HR', 'Supetar', 'HR', 'ferry'],
  ['Visby', 'SE', 'Stockholm', 'SE', 'ferry'],
  // 15e audit du 19/09/2026 : paire de ports éloignée de la ligne de référence de la liaison (la 14e passe leur donnait la
  // durée, la distance et le prix de la ligne de référence) — traversée estimée attendue (pairEstimated). Témoins sur la
  // paire de référence (Villa San Giovanni → Messine, Douvres → Calais) : inchangés attendus. « Nom@lat,lon » : lieu du
  // nom le plus proche de ce point (Póros de Céphalonie, pas celui du golfe Saronique).
  ['Genova', 'IT', 'Palermo', 'IT', 'ferry-paire'], ['Santander', 'ES', 'Portsmouth', 'GB', 'ferry-paire'],
  ['Astakós', 'GR', 'Sámi', 'GR', 'ferry-paire'], ['Kyllíni', 'GR', 'Póros@38.15,20.77', 'GR', 'ferry-paire'],
  ['Thessaloníki', 'GR', 'Skiáthos', 'GR', 'ferry-paire'],
  ['Villa San Giovanni', 'IT', 'Messina', 'IT', 'ferry-temoin'], ['Dover', 'GB', 'Calais', 'FR', 'ferry-temoin'],
];
// Pays des paires automatiques : les plus grandes villes du pays, appariées deux à deux (20 à 500 km par la route).
const PAIRS_COUNTRIES = ['FR', 'DE', 'ES', 'IT', 'PT', 'GB', 'IE', 'NL', 'BE', 'CH', 'AT', 'PL', 'CZ', 'HU', 'RO', 'HR', 'GR', 'TR', 'NO', 'SE',
  'FI', 'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'JP', 'KR', 'TW', 'TH', 'VN', 'MY', 'ID', 'PH', 'IN', 'PK', 'CN', 'AU', 'NZ', 'ZA', 'MA', 'EG',
  'KE', 'NG', 'MN', 'ML', 'BA', 'MG', 'NP', 'IR', 'KZ', 'UA', 'RS'];
const PAIRS_PER_COUNTRY = 3;

// ------------------------------------------------------------------------------------------------ résumé d'un tirage
function round1(x){ return typeof x === 'number' ? Math.round(x * 10) / 10 : x; }
// 14e audit du 19/09/2026 : résumé élargi — péage avec tollInfo.enabled, traversée avec la couverture du prix (priceCovers,
// footAmount, durationEstimated, mode, priceStatus, durationH), recharge avec les bornes (stations : lieu proche et
// position arrondie), hébergement (dates, devise et plafond des liens, plateformes). Partagé par les tirages et les trajets
// directs (summarizeLegInfo).
function summarizeToll(t){ return t ? [round1(t.amountMin), round1(t.amount), (t.countries || []).join('+'), t.enabled === undefined ? null : !!t.enabled] : null; }
// 15e audit du 19/09/2026 : distance de la traversée (km, distanceKm de l'étape) et marques de la traversée estimée
// d'après la paire de ports — pairEstimated : champ du moteur (ferryInfo, ou ferryRouteForPair dans directHop) ;
// pairEst : DÉDUITE par l'outil, la paire (distance, durée) n'est celle d'aucune liaison de FERRY_ROUTES / SEA_CROSSINGS de
// même routeKey (FERRY_REFS, rempli par runWorker avec les données de CE moteur). La déduction vaut pour les deux versions
// et pour les tirages, dont les étapes ne portent pas le champ de la route.
let FERRY_REFS = null;
function setFerryRefs(TD){
  FERRY_REFS = new Map();
  [TD.FERRY_ROUTES, TD.SEA_CROSSINGS].forEach(tab => Object.keys(tab || {}).forEach(k => {
    const r = tab[k];
    if(!r || !r.routeKey) return;
    let s = FERRY_REFS.get(r.routeKey);
    if(!s) FERRY_REFS.set(r.routeKey, s = new Set());
    s.add(r.distanceKm + '|' + r.durationH);
  }));
}
function summarizeFerry(f, seaKm){
  if(!f) return null;
  const o = { route: f.routeKey, amount: f.amount === undefined ? null : f.amount };
  ['priceStatus', 'priceCovers', 'footAmount', 'durationEstimated', 'mode', 'durationH'].forEach(k => { if(f[k] !== undefined && f[k] !== null) o[k] = f[k]; });
  if(seaKm !== undefined) o.km = seaKm;
  if(f.pairEstimated) o.pairEstimated = true;
  const refs = FERRY_REFS && FERRY_REFS.get(f.routeKey);
  if(refs && seaKm !== undefined && !refs.has(seaKm + '|' + f.durationH)) o.pairEst = true;
  return o;
}
function summarizeCharge(c){
  if(!c) return null;
  const o = { stops: c.stops, min: c.minutes, real: !!c.real };
  if(c.noChargerNearArrival) o.noCharger = true;
  if(c.stations && c.stations.length) o.stations = c.stations.map(s => (s.near || '?') + '@' + (+s.lat).toFixed(2) + ',' + (+s.lon).toFixed(2));
  return o;
}
// Liens d'hébergement : devise et plafond lus dans les URL (paramètres currency/price_max d'Airbnb, nflt de Booking.com),
// plateformes présentes, plateformes locales. Même lecture pour les deux versions.
function summarizeLodgingLinks(links){
  if(!links) return null;
  const o = { platforms: Object.keys(links).sort().join('+') };
  const air = links.airbnb && String(links.airbnb);
  if(air){ const cur = air.match(/[?&]currency=([A-Z]{3})/), max = air.match(/[?&]price_max=(\d+(?:\.\d+)?)/); o.airbnb = (cur ? cur[1] : '?') + ' ' + (max ? max[1] : '?'); }
  const bk = links.booking && String(links.booking);
  if(bk){ const m = decodeURIComponent(bk).match(/price=([A-Z]{3})-0-(\d+(?:\.\d+)?)/); o.booking = m ? m[1] + ' ' + m[2] : '?'; }
  if(links.local) o.local = links.local.map(p => p.name).join('+');
  return o;
}
function summarizeLegInfo(l, o){
  o = o || {};
  if(l.roadKm !== undefined){ o.roadKm = l.roadKm; o.roadMin = l.roadMin; }
  if(l.tollInfo) o.toll = summarizeToll(l.tollInfo);
  if(l.ferryInfo) o.ferry = summarizeFerry(l.ferryInfo, l.distanceKm);
  if(l.chargeInfo) o.charge = summarizeCharge(l.chargeInfo);
  if(l.restrictions && l.restrictions.length) o.warn = l.restrictions.map(r => r.kind + ':' + r.type + ':' + (r.country || r.name || '')).sort();
  if(l.countriesCrossed && l.countriesCrossed.length) o.crossed = l.countriesCrossed.slice().sort();
  return o;
}
function summarizeLeg(l){
  const o = summarizeLegInfo(l, { stop: l.stop, cc: l.country, day: l.dayNum, km: l.distanceKm, min: l.travelMin });
  if(l.overMaxLeg) o.over = 1;
  if(l.tension) o.tension = l.tension.level || 1;
  if(l.checkIn || l.lodgingLinks) o.lodg = { dates: (l.checkIn || '') + '/' + (l.checkOut || ''), stay: l.lodgingCheckIn ? l.lodgingCheckIn + '/' + l.lodgingCheckOut : null, links: summarizeLodgingLinks(l.lodgingLinks) };
  return o;
}
function summarizeResult(res){
  const legs = res.legs || [];
  const diag = { minDistanceUnreachable: !!res.minDistanceUnreachable, returnCapKm: res.returnCapKm === undefined ? null : res.returnCapKm,
    minDistanceNotFound: !!res.minDistanceNotFound, timedOut: !!res.timedOut, tensionBlocked: !!res.tensionBlocked };
  // Tension au départ : seulement si le résultat porte la donnée (14e audit : un résultat vide — diagnostic — n'a pas de
  // departureTension ; « null → red » quand un diagnostic devenait un itinéraire était un faux positif).
  if(Object.prototype.hasOwnProperty.call(res, 'departureTension')) diag.departureTension = res.departureTension ? (res.departureTension.level || 1) : null;
  return { diag, legs: legs.map(summarizeLeg), notices: (res.notices || []).slice().sort() };
}

// Couverture d'un tirage (14e audit) : ce que le tirage exerce vraiment, pour vérifier que le jeu couvre bien les chemins
// visés (moto en vrai transit, traversées, bornes réelles). banFull(cc) : interdiction nationale totale (motoMotorwayBan).
function coverageOf(res, depCc, mode, banFull){
  const cov = {};
  let prev = { country: depCc };
  (res.legs || []).forEach(l => {
    if(l.distanceKm == null && !l.isReturn){ prev = l; return; }
    if(l.ferryInfo) cov.ferry = 1;
    if(l.chargeInfo && l.chargeInfo.stations && l.chargeInfo.stations.length) cov.bornes = 1;
    if(mode === 'moto' && prev.country && l.country && prev.country !== l.country && !banFull(prev.country) && !banFull(l.country) &&
      (l.countriesCrossed || []).some(cc => cc !== prev.country && cc !== l.country && banFull(cc))) cov.motoTransit = 1;
    if(mode === 'moto' && prev.country === l.country && (l.countriesCrossed || []).some(cc => cc !== l.country && banFull(cc))) cov.motoInterieurVia = 1;
    prev = l;
  });
  return cov;
}

// Étape directe, même enchaînement que finalizeHop (buildItinerary) : traversée entre zones (Ceuta/Melilla…), sinon
// liaison entre masses terrestres, sinon finalizeLeg. Pays traversés : ceux de l'étape avec traversée, sinon countriesAlong
// (comme generateTrip, pas pour le vélo). Restrictions van/moto : restrictionsForLeg comme generateTrip.
function directHop(A, TD, mode, a, b, km, tollEnabled){
  const speed = TD.TRANSPORT[mode].speed;
  let leg = null, route = null, parts = null;
  if(A.zoneOf && A.seaCrossingFor && A.ferryRoadParts && A.finalizeFerryLeg){
    const fz = A.zoneOf(a), tz = A.zoneOf(b), crossing = A.seaCrossingFor(fz, tz);
    // speed en sixième argument comme finalizeHop (18e audit du 21/09/2026) : la paire de ports dépend de la vitesse du mode.
    if(crossing){ route = crossing; parts = A.ferryRoadParts(a, b, fz, tz, crossing, speed); }
    else {
      const fl = A.landmassOf(a), tl = A.landmassOf(b);
      route = fl !== tl && A.ferryRouteFor ? A.ferryRouteFor(fl, tl) : null;
      if(route) parts = A.ferryRoadParts(a, b, fl, tl, route, speed);
    }
    if(route) leg = A.finalizeFerryLeg(mode, route, parts, speed, tollEnabled, a, b);
  }
  // Traversée estimée d'après la paire (15e audit du 19/09/2026) : le moteur pose pairEstimated sur la ROUTE, pas sur
  // ferryInfo — relu ici avec ferryRouteForPair (même appel que finalizeFerryLeg), absent avant le 15e audit.
  if(leg && leg.ferryInfo && leg.ferryInfo.pairEstimated === undefined && A.ferryRouteForPair){
    const r2 = A.ferryRouteForPair(route, parts);
    if(r2 && r2.pairEstimated) leg.ferryInfo.pairEstimated = true;
  }
  if(!leg) leg = A.finalizeLeg(km, speed, mode, tollEnabled, A.tollCountryOf ? A.tollCountryOf(b) : b.country, a, b);
  if(mode !== 'velo' && !leg.ferryInfo && A.countriesAlong) leg.countriesCrossed = A.countriesAlong(a, b);
  if((mode === 'van' || mode === 'moto') && A.restrictionsForLeg){
    // to.countriesCrossed : posé par generateTrip avant restrictionsForLeg, qui y lit les pays seulement traversés.
    const r = A.restrictionsForLeg(mode, a, Object.assign({}, b, { countriesCrossed: leg.countriesCrossed || [] }), {});
    if(r.length) leg.restrictions = r;
  }
  return leg;
}

// ------------------------------------------------------------------------------------------------ travailleur
// « Nom@lat,lon » (15e audit du 19/09/2026) : parmi les lieux de ce nom, le plus proche du point (homonymes : Póros de
// Céphalonie). Sinon : le plus peuplé.
function findPlaceIn(byCc, A, names, cc){
  const list = byCc.get(cc) || [];
  for(const raw of [].concat(names)){
    const at = String(raw).match(/^(.*)@(-?[\d.]+),(-?[\d.]+)$/);
    const q = A.normalizeCityName(at ? at[1] : raw);
    const order = at ? (a, b) => hav(a.lat, a.lon, +at[2], +at[3]) - hav(b.lat, b.lon, +at[2], +at[3]) : (a, b) => b.pop - a.pop;
    const hit = list.filter(c => c.norm === q).sort(order)[0] ||
      list.filter(c => c.norm.indexOf(q) === 0).sort(order)[0];
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
  setFerryRefs(TD); // traversées estimées d'après la paire, déduites (15e audit, voir summarizeFerry)
  const loadMs = Date.now() - t0;
  log('moteur chargé en ' + Math.round(loadMs / 1000) + ' s, ' + Math.round(process.memoryUsage().rss / 1048576) + ' Mo');
  const byCc = new Map();
  for(const c of A.COMMUNES){ let a = byCc.get(c.country); if(!a) byCc.set(c.country, a = []); a.push(c); }
  // Interdiction nationale totale des autoroutes aux motos, d'après CE moteur (14e audit : étiquettes calculées).
  const banFull = cc => { const b = cc && A.motoMotorwayBan ? A.motoMotorwayBan(cc) : null; return !!(b && b.fullBan); };
  const missingFn = INTERNAL_FUNCS.filter(n => typeof A[n] !== 'function');

  // Tirages
  const tirages = buildTirages(job.n);
  const out = { label: job.label, root: job.root, loadMs, budgetMs: A.TRIP_TIME_BUDGET_MS, chargers: A.CHARGER_COUNT, tirages: [], legs: [], lodging: [], realtime: null, missing: [], missingFn };
  const depCache = new Map();
  const paramsOf = t => {
    const d = departureOf(t.dep);
    if(!depCache.has(t.dep)) depCache.set(t.dep, findPlaceIn(byCc, A, d[1], d[2]));
    const place = depCache.get(t.dep);
    if(!place) return null;
    return { d, place, params: Object.assign({ departureCity: depObj(place), days: 1, budgetKey: 'moyen', transportKey: t.mode, tollEnabled: true,
      ferryEnabled: true, avoidTent: false, avoidTension: true, tripStart: '2026-10-01' }, t.extra) };
  };
  const tagsOf = d => d[3].concat(banFull(d[2]) ? ['moto-interdite'] : []);
  const tStart = Date.now();
  tirages.forEach((t, i) => {
    const p = paramsOf(t);
    if(!p){ out.missing.push('départ ' + t.dep); return; }
    const { d, place, params } = p;
    let r;
    try { r = runSteady(E, params, t.seed); }
    catch(e){ out.tirages.push({ id: t.id, dep: t.dep, cc: d[2], tags: tagsOf(d), mode: t.mode, profile: t.profile, days: params.days, error: String(e && e.stack || e).slice(0, 500) }); return; }
    out.tirages.push({ id: t.id, dep: t.dep, cc: d[2], tags: tagsOf(d), mode: t.mode, profile: t.profile, days: params.days,
      depPt: pt(place), ms: Math.round(r.ms), sum: summarizeResult(r.res), cov: coverageOf(r.res, d[2], t.mode, banFull) });
    if((i + 1) % 25 === 0) log((i + 1) + '/' + tirages.length + ' tirages, ' + Math.round((Date.now() - tStart) / 1000) + ' s');
  });

  // CONTRE-ÉPREUVE (15e audit du 19/09/2026) : chaque tirage qui répond « hors de portée » (minDistanceUnreachable) avec
  // une distance annoncée returnCapKm = X est rejoué à minDistanceKm = X, même graine, même horloge ×10. Un itinéraire est
  // attendu : X est affiché à l'utilisateur comme la distance faisable. À la 14e passe, redemander à X renvoyait « hors
  // de portée, X − 1 » (Lewe en électrique : 328 km annoncés, 221 faisables). Joué pour CHAQUE moteur ; un échec du
  // nouveau moteur compte dans --fail-on-diff. farKm : lieu le plus éloigné du départ, en distance ROUTIÈRE estimée
  // (roadDistanceKm du moteur, l'unité de minDistanceKm ; à vol d'oiseau sans cette fonction) — information seulement.
  out.counter = [];
  const byId = new Map(tirages.map(t => [t.id, t]));
  const tCounter = Date.now();
  const farOf = (p0, l) => A.roadDistanceKm ? A.roadDistanceKm(p0.lat, p0.lon, l.lat, l.lon) : hav(p0.lat, p0.lon, l.lat, l.lon);
  out.tirages.forEach(r => {
    if(!r.sum || !r.sum.diag.minDistanceUnreachable) return;
    const X = r.sum.diag.returnCapKm, t = byId.get(r.id), p = t && paramsOf(t);
    if(!p) return;
    if(!(X > 0)){ out.counter.push({ id: r.id, X, skipped: 'returnCapKm ' + X }); return; }
    const params2 = Object.assign({}, p.params, { minDistanceKm: X });
    try {
      const c = runSteady(E, params2, t.seed);
      const s = summarizeResult(c.res), d = s.diag;
      const farKm = (c.res.legs || []).reduce((m, l) => typeof l.lat === 'number' && !l.isReturn ? Math.max(m, Math.round(farOf(p.place, l))) : m, 0);
      // Réussite : un itinéraire, OU (filtre des zones actif) « bloqué par les zones à tension » — X vient alors du second
      // tirage sans filtre (départ dans une zone déconseillée : Moscou, Kyiv, Mogadiscio…) et c'est bien le filtre qui
      // bloque à X ; même règle que la campagne d'invariants (tests/engine-invariants.test.js).
      const tensionOk = !!d.tensionBlocked && p.params.avoidTension !== false;
      out.counter.push({ id: r.id, X, ms: Math.round(c.ms), n: s.legs.length, ok: (s.legs.length > 0 && !d.minDistanceUnreachable && !d.minDistanceNotFound) || tensionOk,
        outcome: diagStr(d, s.legs.length), farKm: farKm || null });
    } catch(e){ out.counter.push({ id: r.id, X, ok: false, error: String(e && e.message || e).slice(0, 300) }); }
  });
  log('contre-épreuves : ' + out.counter.length + ' (' + out.counter.filter(c => c.ok === false).length + ' échouée(s)), ' + Math.round((Date.now() - tCounter) / 1000) + ' s');

  // Temps réel (14e audit, option --temps-reel) : sous-ensemble des cas ciblés rejoué avec l'horloge NORMALE (budget de
  // 4 s comme en production). Dépend de la machine et de sa charge (et de l'autre moteur s'ils tournent en parallèle).
  if(job.realtime){
    out.realtime = [];
    tirages.filter(t => t.rt).forEach(t => {
      const p = paramsOf(t);
      if(!p) return;
      try {
        const r = runSteady(E, p.params, t.seed, 1);
        out.realtime.push({ id: t.id, ms: Math.round(r.ms), sum: summarizeResult(r.res) });
      } catch(e){ out.realtime.push({ id: t.id, error: String(e && e.message || e).slice(0, 300) }); }
    });
    log('temps réel : ' + out.realtime.length + ' tirages');
  }

  // Appels directs : durée, péage, recharge, traversée, pays, restrictions, sans l'aléa du tirage.
  const pairs = [];
  PAIRS_NAMED.forEach(p => pairs.push([p[0], p[2], p[1], p[2], p[3]]));
  PAIRS_CROSS.forEach(p => pairs.push(p));
  PAIRS_MOTO_TRANSIT.forEach(p => pairs.push(p));
  PAIRS_FERRY.forEach(p => pairs.push(p));
  const resolved = [];
  // Suffixe du groupe calculé avec le moteur : « moto-interdite » (pays d'une extrémité), « moto-transit » (pays traversé).
  const motoSuffix = (a, b) => {
    if(banFull(a.country) || banFull(b.country)) return ' moto-interdite';
    if(a.country !== b.country && A.countriesAlong && A.countriesAlong(a, b).some(cc => cc !== a.country && cc !== b.country && banFull(cc))) return ' moto-transit';
    return '';
  };
  pairs.forEach(p => {
    const a = findPlaceIn(byCc, A, p[0], p[1]), b = findPlaceIn(byCc, A, p[2], p[3]);
    if(!a || !b){ out.missing.push('paire ' + p[0] + ' → ' + p[2] + ' (' + p[1] + ')'); return; }
    resolved.push({ a, b, group: p[1] + ' ' + p[4] + motoSuffix(a, b) });
  });
  PAIRS_COUNTRIES.forEach(cc => {
    const list = (byCc.get(cc) || []).filter(c => c.pop >= 20000)
      .sort((x, y) => (y.pop - x.pop) || (x.name < y.name ? -1 : x.name > y.name ? 1 : 0)).slice(0, 16);
    let n = 0;
    for(let i = 0; i + 1 < list.length && n < PAIRS_PER_COUNTRY; i += 2){
      const km = hav(list[i].lat, list[i].lon, list[i + 1].lat, list[i + 1].lon) * 1.287;
      if(km < 20 || km > 500) continue;
      resolved.push({ a: list[i], b: list[i + 1], group: cc + ' auto' + motoSuffix(list[i], list[i + 1]) }); n++;
    }
  });
  const seenPair = new Set();
  // Variante « sans péage » de la voiture thermique : tollInfo.enabled (14e audit).
  const variants = MODES.map(m => [m, m, true]).concat([['voiture-thermique', 'voiture-thermique sans péage', false]]);
  resolved.forEach(({ a, b, group }) => {
    const pk = a.name + '|' + a.country + '|' + b.name + '|' + b.country;
    if(seenPair.has(pk)) return; // paire nommée aussi tirée parmi les grandes villes du pays
    seenPair.add(pk);
    const km = Math.round(hav(a.lat, a.lon, b.lat, b.lon) * 1.287);
    for(const [mode, modeLabel, toll] of variants){
      const id = a.name + ' (' + a.country + ') → ' + b.name + ' (' + b.country + ') | ' + modeLabel;
      try {
        const h0 = process.hrtime.bigint();
        const leg = directHop(A, TD, mode, a, b, km, toll);
        const ms = Number(process.hrtime.bigint() - h0) / 1e6;
        out.legs.push(Object.assign({ id, group, mode: modeLabel, km, min: leg.travelMin, ms: Math.round(ms * 10) / 10 }, summarizeLegInfo(leg)));
      } catch(e){ out.legs.push({ id, group, mode: modeLabel, km, error: String(e && e.message || e).slice(0, 300) }); }
    }
  });

  // Hébergement (14e audit) : plafond lodgingPriceCap et liens buildLodgingLinks par pays × palier × devise choisie.
  if(typeof TD.lodgingPriceCap === 'function'){
    const budgets = Object.keys(TD.LODGING_BASE_EUR || { petit: 1, moyen: 1, confort: 1 });
    const currencies = [null, 'EUR', 'USD', 'JPY', 'XOF'];
    Object.keys(TD.COUNTRIES || {}).sort().forEach(cc => budgets.forEach(bk => currencies.forEach(cur => {
      const id = cc + '|' + bk + '|' + (cur || 'pays');
      try {
        const cap = TD.lodgingPriceCap(cc, bk, cur);
        const links = A.buildLodgingLinks ? summarizeLodgingLinks(A.buildLodgingLinks('Ville', '2026-10-01', '2026-10-03', bk, cc, cur)) : null;
        out.lodging.push({ id, cc, cap: cap ? cap.currency + ' ' + cap.max : null, links });
      } catch(e){ out.lodging.push({ id, cc, error: String(e && e.message || e).slice(0, 200) }); }
    })));
  }
  out.totalMs = Date.now() - t0;
  out.rssMb = Math.round(process.memoryUsage().rss / 1048576);
  log('terminé : ' + out.tirages.length + ' tirages, ' + out.legs.length + ' trajets directs, ' + out.lodging.length + ' plafonds d\'hébergement, ' + Math.round(out.totalMs / 1000) + ' s');
  return out;
}

// ------------------------------------------------------------------------------------------------ comparaison
const KINDS = ['erreur', 'depart', 'diagnostic', 'nbEtapes', 'etapes', 'distances', 'durees', 'peages', 'ferries', 'recharge', 'hebergement', 'avertissements', 'pays', 'tension'];
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
// Issue d'un tirage en une ligne (15e audit du 19/09/2026, résumé des cas ciblés) : « hors de portée 263 km », « 2 trajets ».
function outcomeOf(t){
  if(t.error) return 'erreur';
  const d = t.sum.diag, n = t.sum.legs.length;
  if(d.minDistanceUnreachable) return 'hors de portée ' + d.returnCapKm + ' km';
  if(d.minDistanceNotFound) return 'introuvable';
  if(d.tensionBlocked) return 'bloqué (zones à tension)';
  if(d.timedOut && !n) return 'temps écoulé';
  return n ? n + ' trajet(s)' + (d.timedOut ? ', temps écoulé' : '') : 'vide sans diagnostic';
}
// Cas ciblés résumés en tête du rapport (15e audit) : ancien → nouveau pour chacun.
const SUMMARY_PROFILES = /^cible-1j-(tension-loin-min|annonce-min|petite-ile$|petit-max[13]$)/;
function compareTirage(a, b){
  const kinds = new Set(), det = [];
  if(a.error || b.error){
    if(J(a.error) !== J(b.error)){ kinds.add('erreur'); det.push('erreur : ' + (a.error || 'aucune').split('\n')[0] + ' → ' + (b.error || 'aucune').split('\n')[0]); }
    return { kinds: [...kinds], det };
  }
  if(a.depPt && b.depPt && J(a.depPt) !== J(b.depPt)){ kinds.add('depart'); det.push('départ résolu différemment : ' + J(a.depPt) + ' → ' + J(b.depPt)); }
  const da = a.sum.diag, db = b.sum.diag, la = a.sum.legs, lb = b.sum.legs;
  let trans = null;
  const diagKeys = ['minDistanceUnreachable', 'returnCapKm', 'minDistanceNotFound', 'timedOut', 'tensionBlocked'];
  if(diagKeys.some(k => da[k] !== db[k]) || (!la.length) !== (!lb.length)){ kinds.add('diagnostic'); det.push('diagnostic : ' + diagStr(da, la.length) + ' → ' + diagStr(db, lb.length)); trans = diagShort(da, la.length) + ' → ' + diagShort(db, lb.length); }
  // Tension au départ : seulement si les DEUX résultats portent la donnée (14e audit du 19/09/2026). Un diagnostic (tirage
  // vide) ne la porte pas : son passage à un itinéraire est déjà compté dans « diagnostic ».
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  if(has(da, 'departureTension') && has(db, 'departureTension') && da.departureTension !== db.departureTension){ kinds.add('tension'); det.push('tension au départ : ' + da.departureTension + ' → ' + db.departureTension); }
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
      if(J(x.lodg) !== J(y.lodg)){ kinds.add('hebergement'); det.push(w + 'hébergement ' + J(x.lodg) + ' → ' + J(y.lodg)); }
      if(J(x.warn) !== J(y.warn) || x.over !== y.over){ kinds.add('avertissements'); det.push(w + 'avertissements ' + J(x.warn) + (x.over ? ' overMaxLeg' : '') + ' → ' + J(y.warn) + (y.over ? ' overMaxLeg' : '')); }
      if(J(x.crossed) !== J(y.crossed)){ kinds.add('pays'); det.push(w + 'pays traversés ' + J(x.crossed) + ' → ' + J(y.crossed)); }
      if(x.tension !== y.tension){ kinds.add('tension'); det.push(w + 'tension ' + J(x.tension) + ' → ' + J(y.tension)); }
    }
  }
  return { kinds: [...kinds], det, trans };
}

// Trajet direct : mêmes natures que les tirages (14e audit : traversée, pays, restrictions, péage avec enabled, bornes).
const LEG_FIELDS = [['durees', ['min', 'roadMin']], ['distances', ['roadKm']], ['peages', ['toll']], ['recharge', ['charge']],
  ['ferries', ['ferry']], ['pays', ['crossed']], ['avertissements', ['warn']]];
function compareLeg(x, y){
  const kinds = [], det = [];
  if(J(x.error) !== J(y.error)){ kinds.push('erreur'); det.push('erreur ' + (x.error || '—') + ' → ' + (y.error || '—')); }
  LEG_FIELDS.forEach(([k, fields]) => {
    const ch = fields.filter(f => J(x[f]) !== J(y[f]));
    if(!ch.length) return;
    kinds.push(k);
    ch.forEach(f => det.push(f === 'min' || f === 'roadMin' ? f + ' ' + fmtMin(x[f]) + ' → ' + fmtMin(y[f]) : f + ' ' + J(x[f]) + ' → ' + J(y[f])));
  });
  return { kinds, det };
}

function median(a){ if(!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function quantile(a, q){ if(!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }
function timeStats(a){ return { n: a.length, median: median(a), p90: quantile(a, 0.9), total: a.reduce((s, x) => s + x, 0) }; }

// Seuil de ralentissement PAR TIRAGE : ×1,5 ET +200 ms (le bruit de mesure d'un tirage court dépasse facilement ×1,5).
const SLOW_RATIO = 1.5, SLOW_MS = 200;
// Seuils GLOBAUX (14e audit du 19/09/2026) : un ralentissement général de ~40 % ne franchit presque jamais le seuil par
// tirage. Alerte si, sur les tirages communs aux deux moteurs, la médiane OU le 90e centile augmente d'au moins 25 % (et
// de plus de 5 ms / 20 ms), OU le total d'au moins 20 % (et de plus de 2 s). Par catégorie (au moins 8 tirages) : médiane
// ou total +30 % (et +10 ms / +1 s). Mêmes seuils dans l'autre sens pour « plus rapide ». Moteurs lancés en parallèle,
// les deux mesures subissent la même charge ; deux lancements du même moteur diffèrent de ±20 % par tirage, mais pas les
// agrégats : « node tests/compare-engine.js fdd68aa fdd68aa » (même version des deux côtés, 19/09/2026) donne médiane ×1,00,
// p90 ×0,96, total ×1,01, aucune alerte globale ni par catégorie.
const GLOBAL_TIMING = { median: [1.25, 5], p90: [1.25, 20], total: [1.20, 2000] };
const GROUP_TIMING = { minN: 8, median: [1.30, 10], total: [1.30, 1000] };
function timingAlert(sa, sb, th){
  const out = [];
  ['median', 'p90', 'total'].forEach(k => {
    if(!th[k] || sa[k] == null || sb[k] == null) return;
    const [ratio, abs] = th[k];
    if(sb[k] >= sa[k] * ratio && sb[k] - sa[k] > abs) out.push({ k, dir: 'lent', ratio: sb[k] / Math.max(1e-9, sa[k]) });
    else if(sa[k] >= sb[k] * ratio && sa[k] - sb[k] > abs) out.push({ k, dir: 'rapide', ratio: sb[k] / Math.max(1e-9, sa[k]) });
  });
  return out;
}

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
    const row = { id: a.id, dep: a.dep, cc: a.cc, tags: a.tags, mode: a.mode, profile: a.profile, days: a.days, kinds: c.kinds, det: c.det, trans: c.trans, msA: a.ms, msB: b.ms,
      capA: a.sum ? a.sum.diag.returnCapKm : null, capB: b.sum ? b.sum.diag.returnCapKm : null, outA: outcomeOf(a), outB: outcomeOf(b) };
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

  // Temps : tirages communs aux deux moteurs (tous, puis inchangés seulement), et alerte globale / par catégorie.
  const both = rows.filter(r => r.msA != null && r.msB != null);
  const stat = list => ({ A: timeStats(list.map(r => r.msA)), B: timeStats(list.map(r => r.msB)) });
  const tAll = stat(both), tSame = stat(both.filter(r => !r.kinds.length));
  const globalAlert = timingAlert(tAll.A, tAll.B, GLOBAL_TIMING);
  const groupAlerts = [];
  Object.keys(groups).forEach(k => {
    const g = groups[k];
    if(g.msA.length < GROUP_TIMING.minN) return;
    const al = timingAlert(timeStats(g.msA), timeStats(g.msB), GROUP_TIMING);
    if(al.length){ g.alert = al; groupAlerts.push(k); }
  });

  // Trajets directs
  const legB = new Map(B.legs.map(l => [l.id, l]));
  const legRows = [], legGroups = {}, legOnlyA = [];
  A.legs.forEach(x => {
    const y = legB.get(x.id);
    if(!y){ legOnlyA.push(x.id); return; }
    legB.delete(x.id);
    const c = compareLeg(x, y);
    const ratio = (x.min > 0 && y.min > 0) ? y.min / x.min : null;
    const row = { id: x.id, group: x.group, mode: x.mode, km: x.km, minA: x.min, minB: y.min, ratio, kinds: c.kinds, det: c.det, msA: x.ms, msB: y.ms };
    legRows.push(row);
    // Groupe × (motorisés | vélo) : les cinq modes motorisés changent en général ensemble, une ligne suffit.
    for(const key of [x.group + (x.mode === 'velo' ? ' | vélo' : ' | motorisés'), 'mode ' + x.mode]){
      const g = legGroups[key] || (legGroups[key] = { n: 0, kinds: {}, ratios: [] });
      g.n++; c.kinds.forEach(k => { g.kinds[k] = (g.kinds[k] || 0) + 1; });
      if(ratio != null && c.kinds.includes('durees')) g.ratios.push(ratio);
    }
  });

  // Hébergement : plafonds et liens par pays × palier × devise.
  const lodB = new Map((B.lodging || []).map(l => [l.id, l]));
  const lodRows = [];
  (A.lodging || []).forEach(x => {
    const y = lodB.get(x.id);
    if(!y) return;
    lodB.delete(x.id);
    const kinds = [];
    if(J(x.error) !== J(y.error)) kinds.push('erreur');
    if(x.cap !== y.cap) kinds.push('plafond');
    if(J(x.links) !== J(y.links)) kinds.push('liens');
    if(kinds.length) lodRows.push({ id: x.id, cc: x.cc, kinds, capA: x.cap, capB: y.cap, linksA: x.links, linksB: y.links, errA: x.error, errB: y.error });
  });

  // Couverture : ce que les tirages exercent vraiment, par moteur.
  const covOf = T => {
    const c = { motoTransit: [], motoInterieurVia: [], ferry: 0, bornes: 0 };
    T.tirages.forEach(t => {
      if(!t.cov) return;
      if(t.cov.motoTransit) c.motoTransit.push(t.id);
      if(t.cov.motoInterieurVia) c.motoInterieurVia.push(t.id);
      if(t.cov.ferry) c.ferry++;
      if(t.cov.bornes) c.bornes++;
    });
    c.legGroups = {};
    T.legs.forEach(l => { const m = l.group.match(/moto-(transit|interdite)$/); if(m) c.legGroups[m[0]] = (c.legGroups[m[0]] || 0) + 1; if(l.ferry) c.legGroups.ferry = (c.legGroups.ferry || 0) + 1; });
    return c;
  };

  // Temps réel (--temps-reel) : pour chaque moteur, résultat en temps réel contre résultat sous horloge ×10 ; puis ancien
  // contre nouveau en temps réel.
  let realtime = null;
  if(A.realtime && B.realtime){
    const steadyA = new Map(A.tirages.map(t => [t.id, t])), steadyB = new Map(B.tirages.map(t => [t.id, t]));
    const rtB = new Map(B.realtime.map(t => [t.id, t]));
    const outcome = t => t.error ? 'erreur' : (t.sum.legs.length ? t.sum.legs.length + ' trajets' : diagShort(t.sum.diag, 0));
    const rrows = [];
    A.realtime.forEach(ra => {
      const rb = rtB.get(ra.id), sa = steadyA.get(ra.id), sb = steadyB.get(ra.id);
      if(!rb || !sa || !sb) return;
      const vsA = compareTirage(sa, ra), vsB = compareTirage(sb, rb), ab = compareTirage(ra, rb), abSteady = compareTirage(sa, sb);
      rrows.push({ id: ra.id, msA: ra.ms, msB: rb.ms, steadyA: outcome(sa), realA: outcome(ra), steadyB: outcome(sb), realB: outcome(rb),
        diffA: vsA.kinds, diffB: vsB.kinds, diffAB: ab.kinds, detAB: ab.det, abOnlyRealtime: J(ab.det) !== J(abSteady.det), budgetA: ra.ms >= 0.95 * (A.budgetMs || 4000), budgetB: rb.ms >= 0.95 * (B.budgetMs || 4000) });
    });
    realtime = { rows: rrows, budgetMs: [A.budgetMs, B.budgetMs] };
  }

  // Contre-épreuves (15e audit du 19/09/2026), par moteur : distance annoncée X infaisable = échec.
  const counterOf = T => {
    const list = T.counter || null;
    if(!list) return null;
    return { tested: list.filter(c => !c.skipped).length, skipped: list.filter(c => c.skipped), failed: list.filter(c => c.ok === false), passed: list.filter(c => c.ok) };
  };
  const counter = { A: counterOf(A), B: counterOf(B) };

  // Traversées (15e audit) : trajets directs avec traversée (une ligne par paire, voiture thermique) et traversées
  // estimées d'après la paire, par moteur (trajets directs et tirages).
  const est = f => !!(f && (f.pairEstimated || f.pairEst));
  const legA = new Map(A.legs.map(l => [l.id, l]));
  const ferryRows = [];
  B.legs.forEach(y => {
    const x = legA.get(y.id);
    if(y.mode !== 'voiture-thermique' || !((x && x.ferry) || y.ferry)) return;
    ferryRows.push({ id: y.id.replace(/ \| voiture-thermique$/, ''), group: y.group, a: x ? { min: x.min, ferry: x.ferry || null } : null, b: { min: y.min, ferry: y.ferry || null },
      changed: !x || J(x.ferry) !== J(y.ferry) || x.min !== y.min });
  });
  const estOf = T => {
    const legs = T.legs.filter(l => l.mode === 'voiture-thermique' && est(l.ferry));
    const tir = [];
    T.tirages.forEach(t => (t.sum ? t.sum.legs : []).forEach((l, i) => { if(est(l.ferry)) tir.push({ id: t.id, i, stop: l.stop, km: l.km, min: l.min, ferry: l.ferry }); }));
    // Désaccord entre le champ du moteur et la déduction de l'outil (information).
    const mismatch = T.legs.filter(l => l.ferry && l.mode === 'voiture-thermique' && l.ferry.pairEstimated !== undefined && !!l.ferry.pairEstimated !== !!l.ferry.pairEst).map(l => l.id);
    return { direct: legs.map(l => l.id), directEngine: legs.filter(l => l.ferry.pairEstimated).length, tirages: tir, mismatch };
  };
  const ferries = { rows: ferryRows, est: { A: estOf(A), B: estOf(B) } };

  const msA = A.tirages.filter(t => t.ms != null).map(t => t.ms), msB = B.tirages.filter(t => t.ms != null).map(t => t.ms);
  return {
    counter, ferries,
    labels: [A.label, B.label],
    meta: { A: { loadMs: A.loadMs, totalMs: A.totalMs, rssMb: A.rssMb, chargers: A.chargers, missing: A.missing, missingFn: A.missingFn || [] },
      B: { loadMs: B.loadMs, totalMs: B.totalMs, rssMb: B.rssMb, chargers: B.chargers, missing: B.missing, missingFn: B.missingFn || [] } },
    tirages: { n: rows.length, changed: rows.filter(r => r.kinds.length).length, onlyA, onlyB, rows },
    timing: { medianA: median(msA), medianB: median(msB), maxA: Math.max(0, ...msA), maxB: Math.max(0, ...msB),
      totalA: msA.reduce((s, x) => s + x, 0), totalB: msB.reduce((s, x) => s + x, 0), slow, fast,
      all: tAll, same: tSame, globalAlert, groupAlerts },
    groups,
    legs: { n: legRows.length, changed: legRows.filter(r => r.kinds.length).length, onlyA: legOnlyA, onlyB: [...legB.keys()], rows: legRows, groups: legGroups },
    lodging: { n: (A.lodging || []).length, changed: lodRows.length, onlyB: [...lodB.keys()], rows: lodRows },
    coverage: { A: covOf(A), B: covOf(B) },
    realtime,
  };
}

// Nombre de différences qui comptent pour --fail-on-diff (le temps réel, qui dépend de la machine, n'y entre pas).
// 15e audit du 19/09/2026 : plus les contre-épreuves ÉCHOUÉES du NOUVEAU moteur (une distance annoncée infaisable est un
// défaut, pas un changement ; celles de l'ancien moteur sont seulement listées).
function diffCount(R){
  return R.tirages.changed + R.legs.changed + R.lodging.changed + R.timing.slow.length + R.timing.globalAlert.filter(a => a.dir === 'lent').length +
    R.tirages.onlyA.length + R.tirages.onlyB.length + (R.counter && R.counter.B ? R.counter.B.failed.length : 0);
}

// ------------------------------------------------------------------------------------------------ rapport texte
function formatReport(R, opts){
  opts = opts || {};
  const maxRows = opts.maxRows || 400;
  const L = [];
  const pct = (a, n) => n ? Math.round(100 * a / n) + ' %' : '—';
  const f0 = x => x == null ? '—' : String(Math.round(x));
  const kindsStr = o => KINDS.concat(['plafond', 'liens']).filter(k => o[k]).map(k => k + ' ' + o[k]).join(', ');
  L.push('=== Comparaison du moteur : ' + R.labels[0] + '  →  ' + R.labels[1] + ' ===');
  for(const k of ['A', 'B']){
    const m = R.meta[k];
    L.push((k === 'A' ? 'ancien  ' : 'nouveau ') + ': chargement ' + Math.round(m.loadMs / 1000) + ' s, total ' + Math.round(m.totalMs / 1000) + ' s, ' + m.rssMb + ' Mo, bornes ' + m.chargers +
      (m.missing.length ? ', introuvables : ' + m.missing.join(', ') : '') +
      (m.missingFn.length ? ', fonctions absentes de cette version (mesures sautées) : ' + m.missingFn.join(', ') : ''));
  }

  // Fichiers différents entre les deux versions (14e audit) : code ou données ?
  if(R.files){
    const F = R.files;
    L.push('');
    L.push('--- Fichiers lus par le moteur qui diffèrent : ' + F.code.length + ' de code, ' + F.data.length + ' de données' + (F.other.length ? ', ' + F.other.length + ' autre(s) non lu(s) par l\'outil' : '') + ' ---');
    const line = f => '  ' + f.status.padEnd(2) + ' ' + f.path + (f.add != null ? '  (+' + f.add + ' −' + f.del + ' lignes)' : '');
    if(F.code.length){ L.push('code :'); F.code.forEach(f => L.push(line(f))); }
    if(F.data.length){ L.push('données :'); F.data.forEach(f => L.push(line(f))); }
    if(F.other.length){ L.push('autres (non lus par le moteur ou reconstruits par l\'outil) :'); F.other.slice(0, 20).forEach(f => L.push(line(f))); }
    if(!F.code.length && !F.data.length) L.push('  aucun : toute différence ci-dessous vient d\'ailleurs (horloge, ordre de chargement…) — à examiner.');
    else if(!F.code.length) L.push('  → seules les DONNÉES ont changé : les différences ci-dessous viennent des données.');
    else if(!F.data.length) L.push('  → seul le CODE a changé.');
  }

  // Contre-épreuves (15e audit du 19/09/2026) : « hors de portée, X km » rejoué à minDistanceKm = X.
  const CE = R.counter;
  if(CE && (CE.A || CE.B)){
    const failB = CE.B ? CE.B.failed.length : 0, failAny = failB + (CE.A ? CE.A.failed.length : 0);
    L.push('');
    L.push((failAny ? '!!! ' : '--- ') + 'CONTRE-ÉPREUVES « hors de portée, X km » rejouées à minDistanceKm = X (même graine, même horloge) : ' +
      ['A', 'B'].map(k => (k === 'A' ? 'ancien ' : 'nouveau ') + (CE[k] ? (CE[k].tested - CE[k].failed.length) + ' / ' + CE[k].tested + ' faisables' : '—')).join(', ') +
      (failB ? ' — ' + failB + ' DISTANCE(S) ANNONCÉE(S) INFAISABLE(S) DANS LE NOUVEAU MOTEUR (comptées dans --fail-on-diff)' : '') + (failAny ? ' !!!' : ' ---'));
    ['A', 'B'].forEach(k => {
      const c = CE[k];
      if(!c) return;
      if(c.skipped.length) L.push('  ' + (k === 'A' ? 'ancien' : 'nouveau') + ' : ' + c.skipped.length + ' sans distance annoncée (returnCapKm ≤ 0) : ' + c.skipped.slice(0, 6).map(s => s.id.split('|').slice(0, 3).join('|')).join(' ; '));
      if(!c.failed.length) return;
      L.push('  !!! ' + (k === 'A' ? 'ANCIEN' : 'NOUVEAU') + ' moteur, ' + c.failed.length + ' contre-épreuve(s) échouée(s) (X infaisable) :');
      c.failed.slice(0, 60).forEach(f => L.push('    !!! ' + f.id + ' : annoncé ' + f.X + ' km → rejoué à ' + f.X + ' km : ' + (f.error ? 'erreur ' + f.error : f.outcome)));
      if(c.failed.length > 60) L.push('    … ' + (c.failed.length - 60) + ' autres (voir le JSON)');
    });
    // Contre-épreuves réussies dont le lieu le plus lointain est en deçà de X (distance routière estimée) : information.
    ['A', 'B'].forEach(k => {
      const c = CE[k];
      const short = c ? c.passed.filter(p => p.farKm != null && p.farKm < p.X - 1) : [];
      if(short.length) L.push('  ' + (k === 'A' ? 'ancien' : 'nouveau') + ' : ' + short.length + ' réussie(s) avec un lieu le plus lointain < X (distance routière estimée, information) : ' +
        short.slice(0, 8).map(p => p.id.split('|').slice(0, 3).join('|') + ' X ' + p.X + ' → ' + p.farKm).join(' ; '));
    });
  }

  // Cas ciblés du 15e audit (19/09/2026) : issue ancien → nouveau, et contre-épreuve de chaque moteur.
  const sumRows = R.tirages.rows.filter(r => SUMMARY_PROFILES.test(r.profile));
  if(sumRows.length){
    const ceOf = (k, id) => { const c = CE && CE[k] && CE[k].failed.concat(CE[k].passed).find(x => x.id === id); return c ? (c.ok ? ' [contre-épreuve OK]' : ' [!!! contre-épreuve ÉCHOUÉE : ' + (c.outcome || c.error) + ']') : ''; };
    L.push('');
    L.push('--- Cas ciblés du 15e audit (zones à tension, distance annoncée, petites îles, distance max 1-3 km) : ancien → nouveau ---');
    sumRows.forEach(r => {
      const km = (r.id.match(/"minDistanceKm":(\d+)/) || [])[1], mx = (r.id.match(/"maxDistanceKm":(\d+)/) || [])[1];
      L.push('  ' + (r.kinds.length ? '← ' : '  ') + (r.dep + ' ' + r.mode + (km ? ' min ' + km : '') + (mx ? ' max ' + mx : '')).padEnd(44) + r.outA + ceOf('A', r.id) + '  →  ' + r.outB + ceOf('B', r.id));
    });
  }

  const T = R.tirages;
  L.push('');
  L.push('--- Tirages : ' + T.changed + ' / ' + T.n + ' changés (' + pct(T.changed, T.n) + ')' +
    (T.onlyA.length ? ', ' + T.onlyA.length + ' seulement dans l\'ancien' : '') + (T.onlyB.length ? ', ' + T.onlyB.length + ' seulement dans le nouveau' : ''));
  const kindTot = {};
  T.rows.forEach(r => r.kinds.forEach(k => { kindTot[k] = (kindTot[k] || 0) + 1; }));
  L.push('par nature : ' + (kindsStr(kindTot) || 'aucune différence'));
  [['seulement dans l\'ancien', T.onlyA],['seulement dans le nouveau', T.onlyB]].forEach(([w, l]) => { if(l.length) L.push(w + ' : ' + l.slice(0, 20).join(' ; ')); });
  // Transitions de diagnostic, par mode : « tous les vélos passent à minDistanceUnreachable » se lit ici d'un coup d'œil.
  const trans = {};
  T.rows.filter(r => r.trans && r.trans.indexOf('étapes → étapes') < 0).forEach(r => {
    const k = r.trans + '  [' + r.mode + ']';
    // Plafond annoncé (returnCapKm) joint quand il change (14e audit : « bamako 1j min 330 (plafond 196→263) »).
    const cap = (r.capA != null || r.capB != null) && r.capA !== r.capB ? ' (plafond ' + r.capA + '→' + r.capB + ')' : '';
    (trans[k] = trans[k] || []).push(r.dep + (r.days === 1 ? ' 1j' : ' ' + r.days + 'j') + ((r.id.match(/"minDistanceKm":(\d+)/) || [])[1] ? ' min ' + r.id.match(/"minDistanceKm":(\d+)/)[1] : '') + cap);
  });
  const tk = Object.keys(trans).sort();
  if(tk.length){
    L.push('transitions de diagnostic (ancien → nouveau) :');
    tk.forEach(k => L.push('  ' + String(trans[k].length).padStart(3) + '  ' + k + ' : ' + trans[k].slice(0, 12).join(', ') + (trans[k].length > 12 ? '…' : '')));
  }

  // Couverture (14e audit) : chemins réellement exercés par le jeu.
  const CV = R.coverage;
  if(CV){
    L.push('');
    L.push('--- Couverture (ancien / nouveau) ---');
    L.push('  tirages moto en VRAI transit (pays à autoroutes interdites seulement traversé) : ' + CV.A.motoTransit.length + ' / ' + CV.B.motoTransit.length +
      (CV.B.motoTransit.length ? '  [' + CV.B.motoTransit.slice(0, 6).map(id => id.split('|').slice(0, 3).join('|') + '|' + id.split('|').pop()).join(' ; ') + ']' : '  ← AUCUN : cas ciblés à revoir'));
    L.push('  tirages moto intérieurs passant par un tel pays (aucun transit appliqué) : ' + CV.A.motoInterieurVia.length + ' / ' + CV.B.motoInterieurVia.length);
    L.push('  tirages avec traversée : ' + CV.A.ferry + ' / ' + CV.B.ferry + ' ; avec bornes réelles : ' + CV.A.bornes + ' / ' + CV.B.bornes);
    L.push('  trajets directs : moto-transit ' + (CV.A.legGroups['moto-transit'] || 0) + ' / ' + (CV.B.legGroups['moto-transit'] || 0) +
      ', moto-interdite ' + (CV.A.legGroups['moto-interdite'] || 0) + ' / ' + (CV.B.legGroups['moto-interdite'] || 0) +
      ', avec traversée ' + (CV.A.legGroups.ferry || 0) + ' / ' + (CV.B.legGroups.ferry || 0));
  }

  const TM = R.timing;
  L.push('');
  L.push('--- Temps de calcul (réel, horloge du moteur ralentie ×10) : médiane ' + f0(TM.medianA) + ' → ' + f0(TM.medianB) + ' ms, max ' +
    f0(TM.maxA) + ' → ' + f0(TM.maxB) + ' ms, total ' + Math.round(TM.totalA / 1000) + ' → ' + Math.round(TM.totalB / 1000) + ' s');
  const st = (s, lab) => '  ' + lab.padEnd(28) + 'n ' + s.A.n + ', médiane ' + f0(s.A.median) + ' → ' + f0(s.B.median) + ' ms, p90 ' + f0(s.A.p90) + ' → ' + f0(s.B.p90) +
    ' ms, total ' + (s.A.total / 1000).toFixed(1) + ' → ' + (s.B.total / 1000).toFixed(1) + ' s' + (s.A.total ? ' (×' + (s.B.total / s.A.total).toFixed(2) + ')' : '');
  L.push(st(TM.all, 'tirages communs'));
  L.push(st(TM.same, 'dont résultat inchangé'));
  if(TM.globalAlert.length) TM.globalAlert.forEach(a => L.push('  !!! ' + (a.dir === 'lent' ? 'RALENTISSEMENT GÉNÉRAL' : 'accélération générale') + ' : ' + a.k + ' ×' + a.ratio.toFixed(2)));
  else L.push('  alerte globale : aucune (seuils : médiane ou p90 ×' + GLOBAL_TIMING.median[0] + ', total ×' + GLOBAL_TIMING.total[0] + ')');
  if(TM.groupAlerts.length) L.push('  catégories plus lentes/rapides (médiane ou total ×' + GROUP_TIMING.median[0] + ', ≥ ' + GROUP_TIMING.minN + ' tirages) : ' + TM.groupAlerts.length + ', voir le résumé par catégorie');
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
    if(k.startsWith('pays ') && !g.changed && !g.alert && !opts.all) return; // pays sans changement : omis (--all pour tout voir)
    const kinds = kindsStr(g.kinds);
    const mA = median(g.msA), mB = median(g.msB);
    const flag = (g.changed === g.n && g.n > 1) ? '  ← TOUS changés' : '';
    const tflag = g.alert ? '  ← plus ' + g.alert[0].dir + ' (' + g.alert.map(a => a.k + ' ×' + a.ratio.toFixed(2)).join(', ') + ')' : '';
    L.push('  ' + k.padEnd(34) + String(g.changed).padStart(4) + ' / ' + String(g.n).padEnd(4) + (kinds ? ' ' + kinds : '') + '  [' + f0(mA) + ' → ' + f0(mB) + ' ms]' + flag + tflag);
  });

  const LG = R.legs;
  L.push('');
  L.push('--- Trajets directs (finalizeLeg / finalizeFerryLeg) : ' + LG.changed + ' / ' + LG.n + ' changés' +
    (LG.onlyA.length ? ', ' + LG.onlyA.length + ' seulement dans l\'ancien' : '') + (LG.onlyB.length ? ', ' + LG.onlyB.length + ' seulement dans le nouveau' : ''));
  [['seulement dans l\'ancien', LG.onlyA],['seulement dans le nouveau', LG.onlyB]].forEach(([w, l]) => { if(l.length) L.push('  ' + w + ' : ' + l.slice(0, 12).join(' ; ')); });
  L.push('  groupe | mode                           n      rapport durée nouveau/ancien (médiane, min–max)   natures changées');
  Object.keys(LG.groups).sort((a, b) => (a.startsWith('mode ') ? 0 : 1) - (b.startsWith('mode ') ? 0 : 1) || (a < b ? -1 : 1)).forEach(k => {
    const g = LG.groups[k];
    const nat = kindsStr(g.kinds);
    if(!k.startsWith('mode ') && !nat && !opts.all) return;
    const r = g.ratios.length ? '×' + median(g.ratios).toFixed(3) + ' (' + Math.min(...g.ratios).toFixed(3) + '–' + Math.max(...g.ratios).toFixed(3) + ')' +
      (median(g.ratios) < 0.98 ? ' plus rapide' : median(g.ratios) > 1.02 ? ' plus lent' : '') : '';
    L.push('  ' + k.padEnd(38) + String(g.n).padEnd(6) + ' ' + r.padEnd(44) + (nat || '—'));
  });
  const changedLegs = LG.rows.filter(r => r.kinds.length);
  if(changedLegs.length){
    L.push('  détail (' + Math.min(changedLegs.length, maxRows) + ' premiers) :');
    changedLegs.slice(0, maxRows).forEach(r => {
      L.push('    ' + r.id + ', ' + r.km + ' km' + (r.ratio && r.kinds.includes('durees') ? ' (×' + r.ratio.toFixed(3) + ')' : '') + ' : ' + r.det.join(' ; ').slice(0, 600));
    });
  }

  // Traversées (15e audit du 19/09/2026) : trajets directs avec traversée, et traversées estimées d'après la paire.
  const FE = R.ferries;
  if(FE){
    const fStr = t => {
      if(!t) return 'absent';
      const f = t.ferry;
      if(!f) return 'pas de traversée (' + fmtMin(t.min) + ')';
      return f.route + ' ' + (f.km != null ? f.km + ' km ' : '') + fmtMin(t.min) + ', ' + (f.amount != null ? f.amount + ' €' : (f.priceStatus === 'variable' ? 'prix variable' : 'prix inconnu')) +
        (f.pairEstimated ? ', ESTIMÉE (pairEstimated)' : f.pairEst ? ', ESTIMÉE (déduite)' : '');
    };
    L.push('');
    L.push('--- Traversées estimées d\'après la paire de ports (ancien / nouveau) : trajets directs ' + FE.est.A.direct.length + ' / ' + FE.est.B.direct.length +
      ' (dont champ pairEstimated du moteur ' + FE.est.A.directEngine + ' / ' + FE.est.B.directEngine + ')' +
      ', étapes de tirages ' + FE.est.A.tirages.length + ' / ' + FE.est.B.tirages.length + ' ---');
    ['A', 'B'].forEach(k => { if(FE.est[k].mismatch.length) L.push('  ' + (k === 'A' ? 'ancien' : 'nouveau') + ' : champ du moteur ≠ déduction de l\'outil pour ' + FE.est[k].mismatch.join(' ; ')); });
    FE.est.B.tirages.slice(0, 12).forEach(e => L.push('  nouveau, tirage ' + e.id.split('|').slice(0, 3).join('|') + '|' + e.id.split('|').pop() + ' #' + (e.i + 1) + ' ' + e.stop + ' : ' +
      fStr({ min: e.min, ferry: e.ferry })));
    L.push('  trajets directs avec traversée (voiture thermique ; distance, durée, prix de la traversée, estimation) — « ← » : changé :');
    FE.rows.slice().sort((a, b) => (a.group < b.group ? -1 : a.group > b.group ? 1 : 0) || (a.id < b.id ? -1 : 1)).forEach(r => {
      if(!r.changed && !opts.all && !/ferry-(paire|temoin)/.test(r.group)) return;
      L.push('    ' + (r.changed ? '← ' : '  ') + r.id + ' [' + r.group + '] : ' + fStr(r.a) + (r.changed ? '  →  ' + fStr(r.b) : '  (inchangé)'));
    });
    const hidden = FE.rows.filter(r => !r.changed && !/ferry-(paire|temoin)/.test(r.group)).length;
    if(hidden && !opts.all) L.push('    … ' + hidden + ' autre(s) inchangé(s) (--all pour tout voir)');
  }

  const LD = R.lodging;
  if(LD){
    L.push('');
    L.push('--- Hébergement (lodgingPriceCap, buildLodgingLinks : pays × palier × devise) : ' + LD.changed + ' / ' + LD.n + ' changés' + (LD.onlyB.length ? ', ' + LD.onlyB.length + ' seulement dans le nouveau' : ''));
    if(LD.changed){
      const byCc = {};
      LD.rows.forEach(r => { byCc[r.cc] = (byCc[r.cc] || 0) + 1; });
      L.push('  pays : ' + Object.keys(byCc).sort().map(c => c + ' ' + byCc[c]).join(', '));
      LD.rows.slice(0, 40).forEach(r => L.push('    ' + r.id + ' [' + r.kinds.join(', ') + '] ' + (r.kinds.includes('plafond') ? r.capA + ' → ' + r.capB + ' ' : '') +
        (r.kinds.includes('liens') ? J(r.linksA) + ' → ' + J(r.linksB) : '') + (r.kinds.includes('erreur') ? (r.errA || '—') + ' → ' + (r.errB || '—') : '')));
    }
  }

  // Temps réel (14e audit, --temps-reel) : dépend de la machine, séparé du reste et hors de --fail-on-diff.
  const RT = R.realtime;
  if(RT){
    const nA = RT.rows.filter(r => r.diffA.length).length, nB = RT.rows.filter(r => r.diffB.length).length, nAB = RT.rows.filter(r => r.diffAB.length).length,
      nABrt = RT.rows.filter(r => r.abOnlyRealtime).length;
    L.push('');
    L.push('--- TEMPS RÉEL (horloge normale, budget ' + RT.budgetMs.join(' / ') + ' ms comme en production — DÉPEND DE LA MACHINE ET DE SA CHARGE) ---');
    L.push('  ' + RT.rows.length + ' cas ; temps réel ≠ horloge ×10 : ' + nA + ' (ancien), ' + nB + ' (nouveau) ; ancien ≠ nouveau en temps réel : ' + nAB + ' (dont ' + nABrt + ' autrement qu\'à ×10)' +
      ' ; budget atteint : ' + RT.rows.filter(r => r.budgetA).length + ' / ' + RT.rows.filter(r => r.budgetB).length);
    // Détail : seulement ce que l'horloge ×10 ne montre pas (réel ≠ ×10, budget atteint, écart ancien/nouveau propre au
    // temps réel) — les écarts ancien/nouveau identiques à ceux de l'horloge ×10 sont déjà listés plus haut.
    RT.rows.filter(r => r.diffA.length || r.diffB.length || r.abOnlyRealtime || r.budgetA || r.budgetB || opts.all).forEach(r => {
      L.push('  * ' + r.id);
      L.push('      ancien  : ×10 ' + r.steadyA + ' | réel ' + r.realA + ' (' + r.msA + ' ms' + (r.budgetA ? ', budget atteint' : '') + ')' + (r.diffA.length ? '  ← réel ≠ ×10 [' + r.diffA.join(', ') + ']' : ''));
      L.push('      nouveau : ×10 ' + r.steadyB + ' | réel ' + r.realB + ' (' + r.msB + ' ms' + (r.budgetB ? ', budget atteint' : '') + ')' + (r.diffB.length ? '  ← réel ≠ ×10 [' + r.diffB.join(', ') + ']' : ''));
      if(r.abOnlyRealtime) L.push('      ancien → nouveau en temps réel, autrement qu\'à ×10 [' + r.diffAB.join(', ') + '] : ' + r.detAB.slice(0, 2).join(' ; ').slice(0, 300));
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

module.exports = { loadEngineAt, compilePatchedAt, buildBundle, runSteady, buildTirages, runWorker, compareRuns, compareTirage, compareLeg, formatReport, diffCount, outcomeOf, setFerryRefs,
  summarizeResult, directHop, coverageOf, DEPARTURES, TARGET_DEPARTURES, MODES, PROFILES, TARGETED, PAIRS_NAMED, PAIRS_CROSS, PAIRS_MOTO_TRANSIT, PAIRS_FERRY,
  PAIRS_COUNTRIES, KINDS, SLOW_RATIO, SLOW_MS, GLOBAL_TIMING, GROUP_TIMING };
