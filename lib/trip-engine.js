// Moteur de recherche de ville et de tirage aléatoire d'itinéraire, côté SERVEUR — voir README,
// section "Recherche et tirage aléatoire côté serveur" pour le contexte complet (pourquoi ce
// portage : le navigateur ne doit plus jamais télécharger la base de communes/alias complète,
// qui ne fait que grandir à chaque nouveau pays ajouté).
//
// Port DIRECT (pas une réécriture) des fonctions correspondantes de public/js/app.js — même
// algorithme, mêmes commentaires de sourcing conservés, avec exactement deux catégories de
// changement :
// 1. Indépendance à l'i18n : les 4 appels `t('day.single'/'day.return'/'day.n'/'day.nReturn')`
//    qui traduisaient le libellé d'une étape AU MOMENT du tirage sont retirés — chaque `leg` ne
//    porte plus que `labelKind`/`dayNum` (déjà présents EN PLUS de `label` dans la version
//    client, pour permettre un nouveau rendu après un changement de langue en cours de session,
//    voir `singleLegLabel()` dans app.js) : c'est ce même mécanisme, généralisé à 100% des cas,
//    qui rend ce module utilisable sans jamais charger `i18n.js` (1,14 Mo, 61 langues) côté
//    serveur. Le champ `lodging` (catégorie de logement, elle aussi traduite au tirage dans la
//    version client via `lodgingCategoryLabel`) est retiré pour la même raison : le client
//    connaît déjà `budgetKey`/`avoidTent` (ce sont SES propres champs de formulaire) et peut
//    calculer ce texte lui-même au rendu, sans que le serveur ait besoin de le lui répéter.
// 2. La devise préférée du visiteur (mémorisée en localStorage côté client, voir
//    `getPreferredCurrency()` dans app.js — le serveur n'a par nature aucun accès à ce
//    stockage) est reçue en paramètre explicite (`preferredCurrency`) plutôt que lue depuis un
//    quelconque état global.
//
// Aucune autre différence : même moteur, mêmes probabilités, mêmes règles ferries/péages/masses
// continentales par pays (toutes lues depuis public/js/trip-data.js, PARTAGÉ avec le client —
// voir son commentaire d'en-tête).

'use strict';

const TripData = require('../public/js/trip-data.js');

// ---------------------------------------------------------------------------------------------
// Constantes locales (trop petites/spécifiques à ce moteur pour justifier leur place dans
// trip-data.js, qui reste réservé aux tables vraiment partagées avec le rendu client) — copiées
// telles quelles depuis app.js.
// ---------------------------------------------------------------------------------------------
const POI_DIVERSITY_GROUP = { monument: 'memorial', memorial: 'memorial' };
const WALK_POI_TYPES = { viewpoint: 1, nature_reserve: 1, peak: 1, waterfall: 1, cave_entrance: 1, beach: 1 };
const GENERIC_KEYS_NO_WALK = ['generic.market', 'generic.church', 'generic.stroll', 'generic.producer'];
const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g');
const SEP_RE = /[-'’]/g;
const ROAD_FACTOR = 1.17;
const GRID_CELL_DEG = 0.2;
const MAX_STOPS = 15; // nombre maximum de villes-étapes distinctes sur un même trajet
const MAX_TRIP_DAYS = 21;
const CURRENCY_CODE_RE = /^[A-Z]{3}$/;

const { COUNTRIES, TRANSPORT, FERRY_ROUTES, TOLL_RATE_BY_COUNTRY, TOLL_MIN_DISTANCE_KM,
  EV_RANGE_KM, EV_CHARGE_MARGIN, BUDGET_PRICE_MAX, WADDEN_ISLANDS, SARDINIA_PROVINCES,
  SICILY_PROVINCES, HR_POSTCODE_TO_ISLAND, GR_ISLAND_PATTERNS, GR_POROS_MAINLAND_NAMES } = TripData;

// ---------------------------------------------------------------------------------------------
// État du module : construit une seule fois par process (voir init() tout en bas), jamais
// reconstruit par requête — même principe que communesBundlePromise dans server.js.
// ---------------------------------------------------------------------------------------------
let COMMUNES = null;
let ALIASES = null;
let FEATURED = null;
let COMMUNE_GRID = null;
// Index de recherche (voir buildSearchIndex()) : la recherche par préfixe (searchCommunes)
// n'accepte de toute façon une requête qu'à partir de 3 caractères (voir plus bas) — indexer sur
// ce même préfixe de 3 caractères transforme un scan complet de COMMUNES/ALIASES (562k+87k
// entrées, ~33ms/appel mesuré localement, plusieurs fois plus sur l'hébergement mutualisé) en un
// simple regard dans un panier de taille bien plus réduite, sans changer aucun résultat.
const SEARCH_PREFIX_LEN = 3;
let NAME_INDEX = null;  // Map<préfixe, Commune[]>
let CP_INDEX = null;    // Map<préfixe, {commune, cp}[]>
let ALIAS_INDEX = null; // Map<préfixe, Alias[]>

// ---------------------------------------------------------------------------------------------
// Utilitaires de date (port direct, app.js)
// ---------------------------------------------------------------------------------------------
function isoDate(d){
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function addDays(d, n){
  var r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function parseIsoDate(s){
  if(!s) return null;
  var parts = String(s).split('-');
  if(parts.length !== 3) return null;
  var d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------------------------
// countryCurrency : port direct, SAUF la source de la préférence de devise (voir commentaire
// d'en-tête, point 2) — reçue en paramètre plutôt que lue depuis localStorage (inaccessible ici).
// ---------------------------------------------------------------------------------------------
function countryCurrency(cc, preferredCurrency){
  if(preferredCurrency) return preferredCurrency;
  return (COUNTRIES[cc] && COUNTRIES[cc].currency) || 'EUR';
}

function landmassKey(a, b){ return [a, b].sort().join('|'); }
function ferryRouteFor(a, b){ return (a === b) ? null : (FERRY_ROUTES[landmassKey(a, b)] || null); }

// landmassOf : port DIRECT, aucun changement — voir app.js pour les commentaires de sourcing
// détaillés par pays (identiques ici, non reproduits en double pour rester lisible).
function landmassOf(c){
  if(c.country === 'FR') return (c.dept === '2A' || c.dept === '2B') ? 'corsica' : 'continental';
  if(c.country === 'ES'){
    if(c.lon >= -18.5 && c.lon <= -13.0 && c.lat >= 27.5 && c.lat <= 29.6) return 'canary';
    if(c.lon >= 1.0 && c.lon <= 4.6 && c.lat >= 38.5 && c.lat <= 40.3) return 'balearic';
    return 'continental';
  }
  if(c.country === 'PT'){
    if(c.lon <= -20) return 'azores';
    if(c.lon <= -14) return 'madeira';
    return 'continental';
  }
  if(c.country === 'NL'){
    for(var wi=0; wi<WADDEN_ISLANDS.length; wi++){
      if(new RegExp(WADDEN_ISLANDS[wi], 'i').test(c.dept || '')) return 'wadden-' + WADDEN_ISLANDS[wi];
    }
    return 'continental';
  }
  if(c.country === 'IT'){
    if(SARDINIA_PROVINCES.indexOf(c.dept) !== -1) return 'sardinia';
    if(SICILY_PROVINCES.indexOf(c.dept) !== -1) return 'sicily';
    return 'continental';
  }
  if(c.country === 'HR'){
    var hrCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
    for(var hci=0; hci<hrCps.length; hci++){
      var hrIsland = HR_POSTCODE_TO_ISLAND[hrCps[hci]];
      if(hrIsland) return hrIsland;
    }
    return 'continental';
  }
  if(c.country === 'MT') return (c.lat >= 36.0) ? 'gozo' : 'malta';
  if(c.country === 'GG') return 'guernsey';
  if(c.country === 'JE') return 'jersey';
  if(c.country === 'GB'){
    var gbCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
    for(var gci=0; gci<gbCps.length; gci++){
      if(/^BT/i.test(gbCps[gci])) return 'ireland';
    }
    return 'greatBritain';
  }
  if(c.country === 'IE') return 'ireland';
  if(c.country === 'IM') return 'isleOfMan';
  if(c.country === 'DK'){
    var dkCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
    for(var dci=0; dci<dkCps.length; dci++){
      if(/^37/.test(dkCps[dci])) return 'bornholm';
    }
    return 'continental';
  }
  if(c.country === 'SE'){
    var seCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
    for(var sci=0; sci<seCps.length; sci++){
      if(/^62/.test(seCps[sci])) return 'gotland';
    }
    return 'continental';
  }
  if(c.country === 'AX') return 'aland';
  if(c.country === 'GR'){
    var grCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
    for(var gpi=0; gpi<grCps.length; gpi++){
      var grCp = grCps[gpi];
      if(/^1802/.test(grCp)){
        if(!GR_POROS_MAINLAND_NAMES.test(c.name || '')) return 'poros';
        continue;
      }
      for(var gpp=0; gpp<GR_ISLAND_PATTERNS.length; gpp++){
        if(GR_ISLAND_PATTERNS[gpp][0].test(grCp)) return GR_ISLAND_PATTERNS[gpp][1];
      }
    }
    return 'continental';
  }
  if(c.country === 'FO'){
    var foCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
    for(var fpi=0; fpi<foCps.length; fpi++){
      if(/^[89]/.test(foCps[fpi])) return 'suduroy';
    }
    return 'continental';
  }
  return 'continental';
}

function fmtHours(h){
  var totalMin = Math.round(h*60);
  var hh = Math.floor(totalMin/60), mm = totalMin%60;
  if(hh<=0) return mm+' min';
  return hh+'h'+(mm? String(mm).padStart(2,'0'):'');
}

function finalizeFerryLeg(transportKey, route){
  var ferryClass = TRANSPORT[transportKey].ferryClass;
  return {
    travelTime: fmtHours(route.durationH),
    distanceKm: route.distanceKm,
    tollInfo: null,
    chargeInfo: null,
    ferryInfo: { routeKey: route.routeKey, amount: route.priceByClass[ferryClass], durationH: route.durationH }
  };
}

function diversityGroup(type){ return POI_DIVERSITY_GROUP[type] || type; }

function normalizeCityName(s){
  return String(s||'').trim().toLowerCase()
    .normalize('NFD').replace(DIACRITICS_RE,'')
    .replace(SEP_RE,' ').replace(/\s+/g,' ').trim();
}

function parseCommunesFile(raw, country){
  return raw.split('\n').filter(Boolean).map(function(line){
    var parts = line.split(';');
    var pop = parseInt(parts[0], 10) || 0;
    var latlon = parts[1].split(',');
    var lon = parseFloat(latlon[0]);
    var lat = parseFloat(latlon[1]);
    var cps = parts[2].split(',');
    var dept = parts[3];
    var name = parts[4];
    return { name:name, norm:normalizeCityName(name), cps:cps, pop:pop, lat:lat, lon:lon, dept:dept, country:country };
  });
}

// Construit, une seule fois dans init() (comme buildCommuneGrid()), trois paniers indexés sur les
// 3 premiers caractères normalisés — nom de commune, CHAQUE code postal (une commune à plusieurs
// codes postaux apparaît dans un panier par code), et alias. searchCommunes() n'a alors plus qu'à
// regarder le panier correspondant au préfixe tapé, jamais l'intégralité de COMMUNES/ALIASES.
function searchIndexPrefix(s){ return s.slice(0, SEARCH_PREFIX_LEN); }
function buildSearchIndex(){
  NAME_INDEX = new Map();
  CP_INDEX = new Map();
  ALIAS_INDEX = new Map();
  function addTo(map, key, entry){
    var bucket = map.get(key);
    if(!bucket){ bucket = []; map.set(key, bucket); }
    bucket.push(entry);
  }
  COMMUNES.forEach(function(c){
    addTo(NAME_INDEX, searchIndexPrefix(c.norm), c);
    c.cps.forEach(function(cp){
      addTo(CP_INDEX, searchIndexPrefix(cp.toLowerCase()), { commune:c, cp:cp });
    });
  });
  ALIASES.forEach(function(a){
    addTo(ALIAS_INDEX, searchIndexPrefix(a.norm), a);
  });
}

function searchCommunes(query, limit){
  var q = normalizeCityName(query);
  if(q.length < SEARCH_PREFIX_LEN) return [];
  var qp = searchIndexPrefix(q);
  var matches = [];
  var seenKeys = {};
  function pushMatch(c, cp){
    var key = c.country + '|' + c.norm + '|' + cp;
    if(seenKeys[key]) return;
    seenKeys[key] = true;
    matches.push({name:c.name, cp:cp, allCps:c.cps, pop:c.pop, lat:c.lat, lon:c.lon, dept:c.dept, country:c.country});
  }
  // Codes postaux dont le préfixe correspond — un seul code retenu par commune, comme le
  // scan d'origine (`break` au premier match dans c.cps, dans l'ordre du fichier source).
  var cpMatchedCommunes = {};
  (CP_INDEX.get(qp) || []).forEach(function(entry){
    var ckey = entry.commune.country + '|' + entry.commune.norm;
    if(cpMatchedCommunes[ckey]) return;
    if(entry.cp.toLowerCase().indexOf(q) === 0){
      cpMatchedCommunes[ckey] = true;
      pushMatch(entry.commune, entry.cp);
    }
  });
  // Noms de commune dont le préfixe correspond.
  (NAME_INDEX.get(qp) || []).forEach(function(c){
    if(c.norm.indexOf(q) === 0) pushMatch(c, c.cps[0]);
  });
  // Alias (multilingues) dont le préfixe correspond.
  (ALIAS_INDEX.get(qp) || []).forEach(function(a){
    if(a.norm.indexOf(q) === 0) pushMatch(a.commune, a.commune.cps[0]);
  });
  matches.sort(function(a,b){ return b.pop - a.pop; });
  return matches.slice(0, limit);
}

function rand(min,max){ return Math.random()*(max-min)+min; }
function randInt(min,max){ return Math.floor(rand(min, max+1)); }
function shuffle(arr){
  var a = arr.slice();
  for(var i=a.length-1;i>0;i--){ var j=randInt(0,i); var tmp=a[i]; a[i]=a[j]; a[j]=tmp; }
  return a;
}

function haversineKm(lat1, lon1, lat2, lon2){
  var R = 6371;
  var toRad = function(d){ return d * Math.PI / 180; };
  var dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  var s = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}
function roadDistanceKm(lat1, lon1, lat2, lon2){
  return haversineKm(lat1, lon1, lat2, lon2) * ROAD_FACTOR;
}
function gridKey(lat, lon){
  return Math.floor(lat/GRID_CELL_DEG) + '_' + Math.floor(lon/GRID_CELL_DEG);
}
function buildCommuneGrid(){
  COMMUNE_GRID = {};
  COMMUNES.forEach(function(c){
    var k = gridKey(c.lat, c.lon);
    (COMMUNE_GRID[k] = COMMUNE_GRID[k] || []).push(c);
  });
}
function findNearbyCommunes(lat, lon, minKm, maxKm, minPop){
  var latSpan = Math.ceil(maxKm / (GRID_CELL_DEG*111)) + 1;
  var kmPerLonDeg = Math.max(111 * Math.cos(lat * Math.PI/180), 20);
  var lonSpan = Math.ceil(maxKm / (GRID_CELL_DEG*kmPerLonDeg)) + 1;
  var cx = Math.floor(lat/GRID_CELL_DEG), cy = Math.floor(lon/GRID_CELL_DEG);
  var out = [];
  for(var dx=-latSpan; dx<=latSpan; dx++){
    for(var dy=-lonSpan; dy<=lonSpan; dy++){
      var list = COMMUNE_GRID[(cx+dx)+'_'+(cy+dy)];
      if(!list) continue;
      for(var i=0;i<list.length;i++){
        var c = list[i];
        if(c.pop < minPop) continue;
        var d = roadDistanceKm(lat, lon, c.lat, c.lon);
        if(d>=minKm && d<=maxKm) out.push({commune:c, distKm:d});
      }
    }
  }
  return out;
}

// Vivier de VRAIS noms de communes proches du point de DÉPART (pas de la destination tirée),
// utilisé côté client uniquement pour faire défiler la roulette de révélation avant de s'arrêter
// sur le vrai tirage (voir runReveal dans app.js) — port direct du calcul qui tournait côté client
// avant le passage recherche/tirage côté serveur (26ee0c9), perdu à cette occasion : app.js
// recyclait alors les AUTRES étapes du trajet déjà tiré en remplacement (aucune requête
// supplémentaire nécessaire), mais ce vivier de repli est bien plus pauvre pour un trajet court ou
// qui repasse par les mêmes communes plusieurs nuits de suite — signalé par l'utilisateur (délai de
// révélation qui ne montre presque plus d'autre ville que celle tirée). Mêmes paramètres qu'avant
// la migration : 15 à `min(maxRadiusKm, 400)` km (au moins 60 km pour rester utilisable même avec
// un petit rayon de trajet), population >= 500 (des noms reconnaissables, pas des hameaux). Limité
// à 40 résultats après mélange (le client n'en affiche jamais que 6 à la fois, mais en tire un
// nouveau sous-ensemble à chaque relance de roulette) pour ne pas alourdir la réponse dans les
// régions denses (des centaines de communes de plus de 500 habitants dans un rayon de 400 km en
// France/Allemagne/Pologne...).
function buildSpinPool(lat, lon, maxRadiusKm){
  var spinRadius = Math.max(60, Math.min(maxRadiusKm, 400));
  var found = findNearbyCommunes(lat, lon, 15, spinRadius, 500);
  return shuffle(found).slice(0, 40).map(function(x){ return { name: x.commune.name, norm: x.commune.norm }; });
}

function buildRealRoute(startLat, startLon, startLandmass, maxRadiusKm, numStops, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled){
  var route = [];
  var used = {};
  if(avoidNorm) used[avoidNorm] = true;
  var curLat = startLat, curLon = startLon;
  var curLandmass = startLandmass;
  var minDist = minDistanceKm || 0;
  var maxDist = maxDistanceKm || 0;
  var hopCeiling = maxDist > 0 ? maxDist : 600;
  function reachable(x){
    var toLandmass = landmassOf(x.commune);
    return toLandmass === curLandmass || (ferryEnabled && !!ferryRouteFor(curLandmass, toLandmass));
  }
  for(var i=0; i<numStops; i++){
    var isFirst = i===0;
    var isLast = !isFirst && i===numStops-1;
    var isOnlyStop = numStops === 1;
    var minHop = isFirst ? Math.max(15, minDist) : 8;
    var maxHop;
    if(isFirst && isOnlyStop){
      maxHop = Math.max(40, minDist > 0 ? Math.max(minDist*1.4, maxRadiusKm) : Math.min(maxRadiusKm, hopCeiling));
    } else if(isFirst){
      maxHop = Math.max(40, minDist > 0 ? Math.max(minDist*1.4, hopCeiling) : hopCeiling);
    } else {
      maxHop = Math.max(35, Math.min(hopCeiling*0.5, 220));
    }
    var minPop = 15;
    var candidates;
    if(isLast){
      var lastCap = maxDist > 0 ? Math.min(maxRadiusKm, maxDist) : maxRadiusKm;
      candidates = findNearbyCommunes(curLat, curLon, 0, Math.max(maxHop, lastCap), minPop)
        .filter(function(x){ return !used[x.commune.norm]; })
        .filter(reachable)
        .filter(function(x){ return roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= lastCap; });
      if(candidates.length===0){
        candidates = findNearbyCommunes(startLat, startLon, 0, lastCap, 0)
          .filter(function(x){ return !used[x.commune.norm]; })
          .filter(reachable);
      }
    } else {
      candidates = findNearbyCommunes(curLat, curLon, minHop, maxHop, minPop)
        .filter(function(x){ return !used[x.commune.norm]; })
        .filter(reachable);
      if(maxDist > 0){
        candidates = candidates.filter(function(x){ return roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= maxDist; });
      }
      if(candidates.length===0){
        candidates = findNearbyCommunes(curLat, curLon, minHop, maxHop*2, 0)
          .filter(function(x){ return !used[x.commune.norm]; })
          .filter(reachable);
        if(maxDist > 0){
          candidates = candidates.filter(function(x){ return roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= maxDist; });
        }
      }
    }
    if(candidates.length===0) break;
    var chosen = candidates[randInt(0, candidates.length-1)];
    used[chosen.commune.norm] = true;
    route.push(chosen.commune);
    curLat = chosen.commune.lat; curLon = chosen.commune.lon;
    curLandmass = landmassOf(chosen.commune);
  }
  return route;
}

function distributeNights(route, totalNights){
  var nights = route.map(function(){ return 1; });
  var remaining = totalNights - route.length;
  var guard = 0;
  while(remaining > 0 && guard < 300){
    guard++;
    var idx = randInt(0, route.length-1);
    if(nights[idx] >= 4) continue;
    var feat = FEATURED[route[idx].norm];
    var weight = feat ? feat.pois.length + 1 : 1;
    if(Math.random() > weight/5) continue;
    nights[idx]++;
    remaining--;
  }
  var idx2 = 0;
  while(remaining > 0){
    nights[idx2 % nights.length]++;
    remaining--;
    idx2++;
  }
  return nights;
}

function finalizeLeg(distanceKm, speed, transportKey, tollEnabled, country){
  var hours = distanceKm / speed;
  var tollInfo = null;
  var tollClass = TRANSPORT[transportKey].tollClass;
  var countryToll = COUNTRIES[country] && COUNTRIES[country].hasToll ? TOLL_RATE_BY_COUNTRY[country] : null;
  if(tollClass && countryToll && distanceKm >= TOLL_MIN_DISTANCE_KM){
    var rate = countryToll[tollClass];
    var amount = Math.round(distanceKm * rate * 10) / 10;
    var savedRatio = rand(0.15, 0.30);
    var savedMin = Math.round(hours * 60 * savedRatio);
    var fluxLibre = Math.random() < 0.25;
    tollInfo = { enabled: !!tollEnabled, amount: amount, fluxLibre: fluxLibre, savedMin: savedMin, tollClass: tollClass, rate: rate };
    if(tollEnabled) hours = hours * (1 - savedRatio);
  }
  var chargeInfo = null;
  var tr = TRANSPORT[transportKey];
  if(tr.electric){
    var effectiveRange = EV_RANGE_KM * EV_CHARGE_MARGIN;
    if(distanceKm > effectiveRange){
      var stops = Math.ceil(distanceKm / effectiveRange) - 1;
      if(stops > 0){
        var totalMin = stops * randInt(25, 40);
        chargeInfo = { stops: stops, minutes: totalMin };
        hours += totalMin / 60;
      }
    }
  }
  return { travelTime: fmtHours(hours), distanceKm: distanceKm, tollInfo: tollInfo, chargeInfo: chargeInfo };
}

function buildLodgingLinks(town, checkIn, checkOut, budgetKey, country, preferredCurrency){
  var countryName = (COUNTRIES[country] && COUNTRIES[country].name) || 'France';
  var q = encodeURIComponent(town + ', ' + countryName);
  var currency = countryCurrency(country, preferredCurrency);
  var priceMax = BUDGET_PRICE_MAX[currency][budgetKey];
  return {
    airbnb: 'https://www.airbnb.fr/s/' + encodeURIComponent(town) + '/homes?checkin=' + checkIn + '&checkout=' + checkOut + '&adults=2&price_max=' + priceMax + '&currency=' + currency,
    booking: 'https://www.booking.com/searchresults.fr.html?ss=' + q + '&checkin=' + checkIn + '&checkout=' + checkOut + '&group_adults=2&no_rooms=1&nflt=price%3D' + currency + '-0-' + priceMax + '-1'
  };
}

function buildActivityOptions(poisQueue, genericQueue){
  var options = [];
  var usedTypes = {};
  var i = 0;
  while(options.length < 2 && i < poisQueue.length){
    var poi = poisQueue[i];
    if(usedTypes[diversityGroup(poi.type)]){ i++; continue; }
    poisQueue.splice(i, 1);
    usedTypes[diversityGroup(poi.type)] = true;
    options.push({
      label: poi.name,
      typeKey: poi.type || null,
      searchName: poi.name,
      isReal: true,
      isWalk: !!WALK_POI_TYPES[poi.type],
      image: poi.image || null,
      imageFull: poi.imageFull || null
    });
  }
  if(!options.some(function(o){ return o.isWalk; })){
    var walkIdx = -1;
    for(var j=0; j<poisQueue.length; j++){ if(WALK_POI_TYPES[poisQueue[j].type] && !usedTypes[diversityGroup(poisQueue[j].type)]){ walkIdx = j; break; } }
    if(walkIdx >= 0){
      var walkPoi = poisQueue.splice(walkIdx, 1)[0];
      options.push({
        label: walkPoi.name,
        typeKey: walkPoi.type || null,
        searchName: walkPoi.name,
        isReal: true,
        isWalk: true,
        image: walkPoi.image || null,
        imageFull: walkPoi.imageFull || null
      });
    } else {
      options.push({ labelKey: 'generic.walk', typeI18nKey: 'poiType.walkFallback', isReal: false, isWalk: true, needsHike: true });
    }
  }
  while(options.length < 3){
    if(genericQueue.length === 0){ Array.prototype.push.apply(genericQueue, shuffle(GENERIC_KEYS_NO_WALK)); }
    var gKey = genericQueue.shift();
    if(options.some(function(o){ return o.labelKey === gKey; })) continue;
    options.push({ labelKey: gKey, typeI18nKey: 'poiType.generic', isReal: false, isWalk: false });
  }
  return options;
}

// buildItinerary : port direct de app.js, avec les deux changements documentés en en-tête de ce
// fichier (labelKind/dayNum seuls, pas de `label` pré-traduit ; `lodging` retiré ; devise
// préférée reçue en paramètre plutôt que lue depuis localStorage).
function buildItinerary(city, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled, preferredCurrency){
  var speed = TRANSPORT[transportKey].speed;
  var cLat = cityCoord.lat, cLon = cityCoord.lon;
  var startLandmass = landmassOf(cityCoord);
  var legs = [];
  var minDist = minDistanceKm || 0;
  var maxDist = maxDistanceKm || 0;

  function finalizeHop(fromPoint, toPoint, distanceKm, country){
    var fromLandmass = landmassOf(fromPoint), toLandmass = landmassOf(toPoint);
    if(fromLandmass !== toLandmass){
      var route = ferryRouteFor(fromLandmass, toLandmass);
      if(route) return finalizeFerryLeg(transportKey, route);
    }
    return finalizeLeg(distanceKm, speed, transportKey, tollEnabled, country);
  }

  if(days <= 1){
    var hopCeiling0 = maxDist > 0 ? maxDist : 600;
    var minHop0 = Math.max(15, minDist);
    var hop = Math.max(40, minDist > 0 ? Math.max(minDist*1.4, maxRadiusKm) : Math.min(maxRadiusKm, hopCeiling0));
    function reachable0(x){
      var toLandmass = landmassOf(x.commune);
      return toLandmass === startLandmass || (ferryEnabled && !!ferryRouteFor(startLandmass, toLandmass));
    }
    var candidates = findNearbyCommunes(cLat, cLon, minHop0, hop, 15)
      .filter(function(x){ return x.commune.norm !== avoidNorm; })
      .filter(reachable0);
    if(maxDist > 0) candidates = candidates.filter(function(x){ return x.distKm <= maxDist; });
    if(candidates.length===0){
      candidates = findNearbyCommunes(cLat, cLon, minHop0, hop*1.6, 0).filter(reachable0);
      if(maxDist > 0) candidates = candidates.filter(function(x){ return x.distKm <= maxDist; });
    }
    if(candidates.length===0) return [];
    var stop = candidates[randInt(0, candidates.length-1)].commune;
    var featured0 = FEATURED[stop.norm];
    var poisQueue0 = featured0 ? featured0.pois.slice() : [];
    var genericQueue0 = shuffle(GENERIC_KEYS_NO_WALK);
    var activities0 = buildActivityOptions(poisQueue0, genericQueue0);
    var distOut = Math.round(roadDistanceKm(cLat, cLon, stop.lat, stop.lon));
    var distBack = Math.round(roadDistanceKm(stop.lat, stop.lon, cLat, cLon));
    legs.push(Object.assign({
      labelKind: 'single',
      stop: stop.name,
      activities: activities0,
      needsRealPOIs: !featured0,
      featuredCount: featured0 ? featured0.pois.length : 0, // voir updateRevealTexts côté client
      isReturn:false,
      lat: stop.lat, lon: stop.lon, norm: stop.norm, pop: stop.pop, dept: stop.dept, country: stop.country, cp: stop.cps[0], allCps: stop.cps
    }, finalizeHop(cityCoord, stop, distOut, stop.country)));
    legs.push(Object.assign({
      labelKind: 'returnBare',
      stop: city,
      activities: null,
      isReturn:true,
      lat: cLat, lon: cLon, dept: cityCoord.dept, country: cityCoord.country, cp: cityCoord.cp, allCps: cityCoord.allCps
    }, finalizeHop(stop, cityCoord, distBack, cityCoord.country)));
    return legs;
  }

  var totalNights = days - 1;
  var maxPossibleStops = Math.max(1, Math.min(MAX_STOPS, totalNights));
  var forceMultiStop = minDist > maxRadiusKm && maxPossibleStops >= 2;
  var minStops = forceMultiStop ? 2 : (totalNights >= 3 ? Math.min(3, maxPossibleStops) : 1);
  minStops = Math.min(minStops, maxPossibleStops);
  var numStops = randInt(minStops, maxPossibleStops);
  var route = buildRealRoute(cLat, cLon, startLandmass, maxRadiusKm, numStops, avoidNorm, minDist, maxDist, ferryEnabled);
  if(route.length === 0) route = buildRealRoute(cLat, cLon, startLandmass, Math.max(maxRadiusKm, 300), 1, null, 0, maxDist, ferryEnabled);
  if(route.length === 0) return [];
  var nights = distributeNights(route, totalNights);

  var dayCounter = 0;
  var prevLat = cLat, prevLon = cLon;
  var prevPoint = cityCoord;
  route.forEach(function(commune, stopIdx){
    var nightsHere = nights[stopIdx];
    var featured = FEATURED[commune.norm];
    var poisQueue = featured ? featured.pois.slice() : [];
    var genericQueue = shuffle(GENERIC_KEYS_NO_WALK);
    var stayCheckIn = isoDate(addDays(tripStart, dayCounter));
    var stayCheckOut = isoDate(addDays(tripStart, dayCounter + nightsHere));
    var stayLodgingLinks = buildLodgingLinks(commune.name, stayCheckIn, stayCheckOut, budgetKey, commune.country, preferredCurrency);
    for(var n=0; n<nightsHere; n++){
      dayCounter++;
      var distanceKm = n===0 ? Math.round(roadDistanceKm(prevLat, prevLon, commune.lat, commune.lon)) : Math.round(rand(3,14));
      var legInfo = n===0 ? finalizeHop(prevPoint, commune, distanceKm, commune.country) : finalizeLeg(distanceKm, speed, transportKey, tollEnabled, commune.country);
      var activities = buildActivityOptions(poisQueue, genericQueue);
      var checkIn = isoDate(addDays(tripStart, dayCounter-1));
      var checkOut = isoDate(addDays(tripStart, dayCounter));
      var isFirstNightHere = (n === 0);
      legs.push(Object.assign({
        labelKind: 'day', dayNum: dayCounter,
        stop: commune.name,
        activities: activities,
        needsRealPOIs: !featured,
        featuredCount: featured ? featured.pois.length : 0, // voir updateRevealTexts côté client
        checkIn: checkIn, checkOut: checkOut,
        lodgingLinks: isFirstNightHere ? stayLodgingLinks : null,
        lodgingCheckIn: isFirstNightHere ? stayCheckIn : null,
        lodgingCheckOut: isFirstNightHere ? stayCheckOut : null,
        isReturn:false,
        lat: commune.lat, lon: commune.lon, norm: commune.norm, pop: commune.pop, dept: commune.dept, country: commune.country, cp: commune.cps[0], allCps: commune.cps
      }, legInfo));
    }
    prevLat = commune.lat; prevLon = commune.lon;
    prevPoint = commune;
  });

  dayCounter++;
  var distBackKm = Math.round(roadDistanceKm(prevLat, prevLon, cLat, cLon));
  legs.push(Object.assign({
    labelKind: 'dayReturn', dayNum: dayCounter,
    stop: city,
    activities: null,
    isReturn:true,
    lat: cLat, lon: cLon, dept: cityCoord.dept, country: cityCoord.country, cp: cityCoord.cp, allCps: cityCoord.allCps
  }, finalizeHop(prevPoint, cityCoord, distBackKm, cityCoord.country)));

  return legs;
}

// ---------------------------------------------------------------------------------------------
// Construction de l'état (COMMUNES/ALIASES/FEATURED/COMMUNE_GRID) à partir du texte brut déjà
// disponible côté serveur (voir server.js, getBundlePromise) — même format `###XX###` que celui
// que le client redécoupait auparavant (splitBundle dans app.js), et même logique de
// construction des alias que l'ancien scheduleAliasBuild côté client (par lots, ici en un seul
// passage synchrone puisque déclenché une seule fois au démarrage du process, voir init()
// plus bas pour la justification de ce choix).
// ---------------------------------------------------------------------------------------------
function splitBundle(bundleText){
  var parts = bundleText.split(/###([A-Z]{2})###\n/);
  var out = {};
  for (var i = 1; i < parts.length; i += 2) out[parts[i]] = parts[i + 1];
  return out;
}

function buildCommunesAndAliases(communesRaw, aliasesRaw){
  var rawByCountry = splitBundle(communesRaw);
  var communes = [];
  var byCountry = {};
  Object.keys(rawByCountry).forEach(function(cc){
    var parsed = parseCommunesFile(rawByCountry[cc], cc);
    byCountry[cc] = parsed;
    communes = communes.concat(parsed);
  });
  var aliasRawByCountry = splitBundle(aliasesRaw);
  var aliases = [];
  Object.keys(aliasRawByCountry).forEach(function(cc){
    var byName = {};
    (byCountry[cc] || []).forEach(function(c){
      (byName[c.name] = byName[c.name] || []).push(c);
    });
    aliasRawByCountry[cc].split('\n').filter(Boolean).forEach(function(line){
      var parts = line.split(';');
      var alias = parts[1], canonical = parts[2];
      if(!alias || !canonical) return;
      var targets = byName[canonical];
      if(!targets) return;
      var norm = normalizeCityName(alias);
      targets.forEach(function(c){ aliases.push({ norm: norm, commune: c }); });
    });
  });
  return { communes: communes, aliases: aliases };
}

function parseFeatured(featuredRaw){
  var featured = {};
  featuredRaw.split('\n').forEach(function(line){
    if(!line) return;
    var parts = line.split(';');
    var nom = parts[0], lat = parseFloat(parts[1]), lon = parseFloat(parts[2]);
    var poisStr = parts[3] || '';
    var pois = poisStr ? poisStr.split('|').map(function(s){
      var m = s.match(/^(.*)\(([a-z_]+)\)$/);
      return m ? {name:m[1], type:m[2]} : {name:s, type:''};
    }) : [];
    featured[normalizeCityName(nom)] = {name:nom, lat:lat, lon:lon, pois:pois};
  });
  return featured;
}

// init() fait tout le travail CPU (parsing de ~562 000 communes + ~87 000 alias, construction de
// la grille spatiale) de façon SYNCHRONE, en un seul passage — volontairement, contrairement à la
// leçon "toujours async" retenue pour la compression des bundles /data/ (voir server.js) : cette
// construction n'a lieu qu'UNE SEULE FOIS par démarrage de process (pas à chaque requête, pas à
// chaque redémarrage recalculé plusieurs fois), déclenchée par server.js juste après le
// démarrage du serveur — donc AVANT qu'aucun trafic réel ne puisse arriver dans la même tâche,
// contrairement au cas de la compression où le travail pouvait entrer en concurrence avec de
// vraies requêtes de visiteurs. Un blocage ponctuel de ~1-2 s au tout premier démarrage est un
// compromis assumé plutôt qu'une complexité de découpage en tâches asynchrones pour un coût qui
// ne se reproduit jamais après.
function init(communesRaw, aliasesRaw, featuredRaw){
  var result = buildCommunesAndAliases(communesRaw, aliasesRaw);
  COMMUNES = result.communes;
  ALIASES = result.aliases;
  FEATURED = parseFeatured(featuredRaw);
  buildCommuneGrid();
  buildSearchIndex();
}

function isReady(){ return COMMUNES !== null; }

// ---------------------------------------------------------------------------------------------
// API publique consommée par server.js (routes /api/search-city et /api/generate-trip)
// ---------------------------------------------------------------------------------------------
function searchCity(query, limit){
  return searchCommunes(query, limit || 8);
}

// Valide et normalise les paramètres reçus du client avant de lancer le tirage — c'est
// désormais la vraie frontière de confiance (voir README) : le client validait déjà tout ceci
// avant d'appeler buildItinerary() localement, mais rien n'empêche une requête directe à cette
// API de contourner ces règles, donc tout est revérifié ici.
function generateTrip(params){
  if(!isReady()) throw new Error('moteur non initialisé');
  var p = params || {};
  var dep = p.departureCity;
  if(!dep || typeof dep !== 'object') throw new Error('departureCity manquant');
  var lat = Number(dep.lat), lon = Number(dep.lon);
  if(!isFinite(lat) || lat < -90 || lat > 90 || !isFinite(lon) || lon < -180 || lon > 180) throw new Error('coordonnées de départ invalides');
  var country = String(dep.country || '');
  if(!COUNTRIES[country]) throw new Error('pays de départ inconnu');
  var cityCoord = {
    lat: lat, lon: lon, dept: dep.dept || null, country: country,
    cp: dep.cp || (Array.isArray(dep.allCps) ? dep.allCps[0] : null),
    allCps: Array.isArray(dep.allCps) ? dep.allCps : (dep.cp ? [dep.cp] : [])
  };
  var cityName = String(dep.name || '').slice(0, 120);

  var days = Math.round(Number(p.days));
  if(!isFinite(days) || days < 1 || days > MAX_TRIP_DAYS) throw new Error('nombre de jours invalide');

  var budgetKey = ['economique','moyen','confortable'].indexOf(p.budgetKey) !== -1 ? p.budgetKey : 'moyen';
  var transportKey = Object.prototype.hasOwnProperty.call(TRANSPORT, p.transportKey) ? p.transportKey : 'voiture-thermique';
  var tollEnabled = !!p.tollEnabled;
  var ferryEnabled = !!p.ferryEnabled;
  var avoidTent = !!p.avoidTent;

  var tripStart = parseIsoDate(p.tripStart) || new Date();
  var maxRadiusKm = Number(p.maxRadiusKm);
  if(!isFinite(maxRadiusKm) || maxRadiusKm <= 0) maxRadiusKm = 300;
  maxRadiusKm = Math.min(Math.max(maxRadiusKm, 20), 3000);

  var avoidNorm = p.avoidNorm ? normalizeCityName(String(p.avoidNorm).slice(0, 200)) : null;
  var minDistanceKm = Number(p.minDistanceKm) || 0;
  var maxDistanceKm = Number(p.maxDistanceKm) || 0;
  if(minDistanceKm < 0) minDistanceKm = 0;
  if(maxDistanceKm < 0) maxDistanceKm = 0;

  var preferredCurrency = (typeof p.preferredCurrency === 'string' && CURRENCY_CODE_RE.test(p.preferredCurrency)) ? p.preferredCurrency : null;

  var legs = buildItinerary(cityName, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled, preferredCurrency);
  var spinPool = buildSpinPool(lat, lon, maxRadiusKm);
  return { legs: legs, spinPool: spinPool };
}

module.exports = { init, isReady, searchCity, generateTrip };
