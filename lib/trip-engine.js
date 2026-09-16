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

const { COUNTRIES, TRANSPORT, FERRY_ROUTES, SEA_CROSSINGS, TOLL_RATE_BY_COUNTRY, TOLL_MIN_DISTANCE_KM,
  EV_RANGE_KM, EV_CHARGE_MARGIN, BUDGET_PRICE_MAX, WADDEN_ISLANDS, SARDINIA_PROVINCES,
  SICILY_PROVINCES, HR_POSTCODE_TO_ISLAND, CV_CONCELHO_TO_ISLAND, ISLAND_BOXES, ISLAND_ONLY_COUNTRIES, NO_TRIP_LANDMASSES, TENSION_ZONES, ISLAND_RULES, GR_ISLAND_PATTERNS,
  GR_POROS_MAINLAND_NAMES } = TripData;

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
// Toute liaison existante est proposée, même sans tarif connu pour le mode de transport choisi : `priceStatus`
// ('variable' = prix fixé à la réservation selon la demande ; 'unknown' = aucun tarif publié ou lisible) ou un prix
// absent pour la classe (ex. motos sur le MV Manu'atele) donnent un montant null et un avertissement à l'affichage.
function ferryRouteFor(a, b){
  if(a === b) return null;
  return FERRY_ROUTES[landmassKey(a, b)] || null;
}

// landmassOf : port DIRECT, aucun changement — voir app.js pour les commentaires de sourcing
// détaillés par pays (identiques ici, non reproduits en double pour rester lisible).
function landmassOf(c){
  // Lot Asie : règles d'îles génériques (ISLAND_RULES, trip-data.js), évaluées avec les mêmes types de
  // correspondance que les zones à tension (matchTension) plus des boîtes de coordonnées.
  var islandRules = ISLAND_RULES[c.country];
  if(islandRules){
    for(var iri=0; iri<islandRules.rules.length; iri++){
      var ir = islandRules.rules[iri];
      if(matchTension(ir.match, c)){
        return ir.key === '*' ? c.country + ':' + Number(c.lat).toFixed(3) + ',' + Number(c.lon).toFixed(3) : ir.key;
      }
    }
    // fallthrough (France) : les règles ne couvrent qu'une partie du pays (collectivités d'outre-mer,
    // dépendances de la Guadeloupe) ; un lieu qu'aucune règle ne range suit la logique propre au pays, plus bas.
    if(islandRules.fallthrough){ /* continue */ }
    // default '*' (Indonésie) : tout lieu qu'aucune règle ne range est une île isolée à lui seul.
    else return islandRules.default === '*' ? c.country + ':' + Number(c.lat).toFixed(3) + ',' + Number(c.lon).toFixed(3) : (islandRules.default || 'continental');
  }
  if(c.country === 'FR'){
    if(c.dept === '2A' || c.dept === '2B') return 'corsica';
    // Départements d'outre-mer : jusqu'ici tous "continental", comme la métropole. Sans effet visible
    // tant qu'aucun pays voisin n'était couvert, mais faux dès l'ajout de Maurice (220 km de La
    // Réunion) et des Comores (70 km de Mayotte) : un trajet aurait pu "rouler" à travers l'océan.
    // Chaque DOM a désormais sa masse terrestre. À Mayotte, Petite-Terre (Dzaoudzi, Pamandzi — code
    // postal 97615) est une île distincte de Grande-Terre, reliée par une barge dont la grille
    // véhicules n'est pas publiée de façon vérifiable (voir README) : isolée.
    if(c.dept === '971') return 'guadeloupe';
    if(c.dept === '972') return 'martinique';
    if(c.dept === '973') return 'guyane';
    if(c.dept === '974') return 'reunion';
    if(c.dept === '976'){
      var ytCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
      return ytCps.indexOf('97615') !== -1 ? 'mayottePetiteTerre' : 'mayotteGrandeTerre';
    }
    return 'continental';
  }
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
      // Shetland (ZE) et Orcades (KW15, KW16, KW17 — codes exclusifs à l'archipel) : jusqu'ici rangées
      // dans "greatBritain", si bien qu'un trajet au départ de Lerwick pouvait « rouler » jusqu'au
      // continent, puis la traversée Manche comptée entre Shetland et la Norvège (mesuré : 24 étapes
      // norvégiennes sur 15 tirages depuis Lerwick). Chaque archipel a désormais sa masse terrestre.
      if(/^ZE/i.test(gbCps[gci])) return 'shetland';
      if(/^KW1[5-7]$/i.test(gbCps[gci])) return 'orkney';
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
    // Reste de l'archipel (Streymoy, Eysturoy, Vágar, Borðoy… reliées par ponts et tunnels) : sa propre
    // masse terrestre. Jusqu'ici "continental", ce qui laissait un trajet au départ de Tórshavn « rouler »
    // jusqu'au Royaume-Uni, à l'Islande ou au continent (mesuré : 43 étapes britanniques et 14
    // islandaises sur 15 tirages).
    return 'faroe';
  }
  // Islande : même correction, île à part entière (jusqu'ici "continental" par défaut — 25 étapes hors
  // d'Islande sur 15 tirages depuis Reykjavík). Les îles habitées au large (Vestmannaeyjar, Grímsey,
  // Hrísey) ne sont pas distinguées, faute de découpage dans les données : limite assumée.
  if(c.country === 'IS') return 'iceland';
  // Turquie : deux vraies îles reliées par ferry pour véhicules (Bozcaada/Gökçeada, détroit des
  // Dardanelles) détectées par le champ "dept" — littéralement le nom de l'île pour ces deux-là dans
  // communes-tr.txt (GeoNames y range chaque hameau sous "Bozcaada"/"Gökçeada(İmroz)" comme région,
  // pas un simple code de province comme pour le reste du pays). Les îles sud de la mer de Marmara
  // (Avşa/Marmara/Paşalimanı/Ekinlik, réseau GESTAŞ depuis Erdek) ne sont PAS modélisées ici — limite
  // assumée comme pour les fjords norvégiens ou les Açores/Madère portugaises, un archipel secondaire
  // moins fréquenté par un vrai road trip que les deux îles ci-dessus (bien plus connues,
  // Bozcaada/Ténédos et Gökçeada/Imbros). Anomalie GeoNames connue et non corrigée ici (hors
  // périmètre de cet ajout) : une poignée de hameaux quasi inhabités de Gökçeada (Paşaçayırı,
  // Gürçeşme...) portent des coordonnées manifestement erronées, placées sur le continent proche
  // plutôt que sur l'île elle-même — sans effet pratique réel, aucun n'ayant de population
  // significative.
  if(c.country === 'TR'){
    if(c.dept === 'Bozcaada') return 'bozcaada';
    if(c.dept && c.dept.indexOf('Gökçeada') === 0) return 'gokceada';
    return 'continental';
  }
  // Chypre, dernier ajout en date : île à part entière, SANS liaison ferry pour véhicule modélisée
  // ici (voir COUNTRIES.CY dans trip-data.js pour le détail) — une vraie ligne Limassol-Le Pirée
  // existe et opère à nouveau depuis 2022, mais saisonnière (fin mai-début septembre) et portée par
  // un unique opérateur privé dont le nom a déjà changé plusieurs fois depuis la reprise ; faute de
  // durée/tarif par véhicule vérifiés avec la même rigueur que le reste de FERRY_ROUTES, elle n'est
  // pas ajoutée à cette table plutôt que d'inventer un chiffre. Sans son propre code landmass, Chypre
  // retombait sur "continental" comme tous les pays non listés ci-dessus — un trajet aurait alors pu
  // "rouler" jusqu'en Turquie/Grèce à travers la mer, une route qui n'existe pas. Îlot autonome pour
  // l'instant : un itinéraire tiré au sort depuis Chypre reste entièrement chypriote, comme l'Islande
  // ou les îles Féroé (autres landmass sans connexion continentale modélisée).
  if(c.country === 'CY') return 'cyprus';
  // Cap-Vert : PREMIER pays du projet dont tout le territoire est insulaire — neuf îles habitées,
  // chacune sa propre masse terrestre, reliées entre elles par huit liaisons de FERRY_ROUTES. Le
  // rattachement se fait par le CODE de concelho porté par le champ "cp" (voir
  // CV_CONCELHO_TO_ISLAND dans trip-data.js pour le pourquoi du code plutôt que des coordonnées),
  // exactement comme Bornholm, Gotland ou les îles croates se reconnaissent à leur code postal.
  if(c.country === 'CV'){
    var cvCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
    for(var cvi=0; cvi<cvCps.length; cvi++){
      var cvIsland = CV_CONCELHO_TO_ISLAND[cvCps[cvi]];
      if(cvIsland) return cvIsland;
    }
    // Concelho inconnu : île indéterminée, on isole plutôt que de rattacher au hasard.
    return 'capeVerdeOther';
  }
  // Lot Afrique orientale, centrale et australe / océan Indien : îles par boîte de coordonnées
  // vérifiée (ISLAND_BOXES dans trip-data.js). Zanzibar par code de région GeoNames, qui coïncide
  // avec les boîtes (vérifié) et reste juste pour les îlots au large.
  if(c.country === 'TZ'){
    var tzCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
    for(var tzi=0; tzi<tzCps.length; tzi++){
      if(tzCps[tzi] === 'TZ-13' || tzCps[tzi] === 'TZ-20') return 'pemba';
      if(tzCps[tzi] === 'TZ-21' || tzCps[tzi] === 'TZ-22' || tzCps[tzi] === 'TZ-25') return 'unguja';
    }
  }
  // Russie : territoires sans route vers le reste du réseau. Sakhaline (reliée par le ferry
  // Vanino-Kholmsk, voir FERRY_ROUTES) et, dans le même oblast, les îles Kouriles (à l'est de 145° E ou
  // au sud de 45,85° N — vérifié : 15 lieux, tous insulaires), chacune isolée faute de grille tarifaire
  // lisible ; le Kamtchatka et la Tchoukotka, sans aucune route ; les îles du Commandeur (Nikolskoïe) ;
  // la Nouvelle-Zemble (oblast d'Arkhangelsk au nord de 70° N). Limites assumées et écrites : Iakoutsk,
  // sur la rive gauche de la Lena sans pont avant 2028, reste rattachée au réseau ; Vorkouta,
  // Naryan-Mar et le reste du Taïmyr aussi.
  if(c.country === 'RU'){
    if(c.dept === 'Sakhalin Oblast'){
      if(c.lon >= 145.0 || c.lat < 45.85) return 'RU:' + Number(c.lat).toFixed(3) + ',' + Number(c.lon).toFixed(3);
      return 'sakhalin';
    }
    if(c.dept === 'Kamchatka'){
      if(c.lon >= 165.5 && c.lat < 56.5) return 'RU:' + Number(c.lat).toFixed(3) + ',' + Number(c.lon).toFixed(3);
      return 'kamchatka';
    }
    if(c.dept === 'Chukotka') return 'chukotka';
    if(c.dept === 'Arkhangelskaya' && c.lat >= 70) return 'RU:' + Number(c.lat).toFixed(3) + ',' + Number(c.lon).toFixed(3);
  }
  var boxes = ISLAND_BOXES[c.country];
  if(boxes){
    for(var bi=0; bi<boxes.length; bi++){
      var bx = boxes[bi];
      if(c.lat >= bx[1] && c.lat <= bx[2] && c.lon >= bx[3] && c.lon <= bx[4]) return bx[0];
    }
    if(ISLAND_ONLY_COUNTRIES[c.country]) return c.country + ':' + Number(c.lat).toFixed(3) + ',' + Number(c.lon).toFixed(3);
  }
  return 'continental';
}

// Pays dont le barème de péage s'applique à un lieu. Les départements d'outre-mer sont rattachés à
// la France (country 'FR') mais n'ont AUCUNE autoroute à péage : sans ce filtre, le tarif kilométrique
// de la métropole était appliqué aux trajets de La Réunion ou de Mayotte.
function tollCountryOf(c){
  if(c.country === 'FR' && /^97/.test(c.dept || '')) return null;
  return c.country;
}

function fmtHours(h){
  var totalMin = Math.round(h*60);
  var hh = Math.floor(totalMin/60), mm = totalMin%60;
  if(hh<=0) return mm+' min';
  return hh+'h'+(mm? String(mm).padStart(2,'0'):'');
}

function finalizeFerryInfo(route, ferryClass){
  var amount = route.priceByClass ? route.priceByClass[ferryClass] : null;
  if(typeof amount !== 'number') amount = null;
  var info = { routeKey: route.routeKey, amount: amount, durationH: route.durationH };
  if(amount === null) info.priceStatus = route.priceStatus === 'variable' ? 'variable' : 'unknown';
  return info;
}

function finalizeFerryLeg(transportKey, route){
  var ferryClass = TRANSPORT[transportKey].ferryClass;
  return {
    travelTime: fmtHours(route.durationH),
    distanceKm: route.distanceKm,
    tollInfo: null,
    chargeInfo: null,
    ferryInfo: finalizeFerryInfo(route, ferryClass)
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
// ---------------------------------------------------------------------------------------------
// ZONES À TENSION (voir TENSION_ZONES dans trip-data.js) — zones rouges (« formellement déconseillé »)
// et orange (« déconseillé sauf raison impérative ») de France Diplomatie. Elles ne ferment plus aucune
// frontière : chaque lieu reçoit, une seule fois dans init(), un niveau de tension ; un filtre activé par
// défaut les écarte des tirages, et chaque étape en zone à tension porte un avertissement.
// ---------------------------------------------------------------------------------------------
var TENSION_RULES_BY_COUNTRY = {};
// Filtre du tirage en cours. generateTrip est entièrement SYNCHRONE : la valeur est posée juste avant le
// tirage et relue par findNearbyCommunes, par lequel passent TOUS les candidats (étapes, repli, dernière
// étape, vivier de la roulette) — un seul point de filtrage plutôt qu'un paramètre de plus à propager.
var AVOID_TENSION = true;

function tensionCpsOf(c){ return c.allCps || c.cps || (c.cp ? [c.cp] : []); }
// Lieu du pays « cc » à moins de km du point (bande frontalière). Parcourt la grille déjà construite.
function nearCountryWithin(lat, lon, cc, km){
  var latSpan = Math.ceil(km / (GRID_CELL_DEG*111)) + 1;
  var kmPerLonDeg = Math.max(111 * Math.cos(lat * Math.PI/180), 20);
  var lonSpan = Math.ceil(km / (GRID_CELL_DEG*kmPerLonDeg)) + 1;
  var cx = Math.floor(lat/GRID_CELL_DEG), cy = Math.floor(lon/GRID_CELL_DEG);
  for(var dx=-latSpan; dx<=latSpan; dx++){
    for(var dy=-lonSpan; dy<=lonSpan; dy++){
      var list = COMMUNE_GRID[(cx+dx)+'_'+(cy+dy)];
      if(!list) continue;
      for(var i=0;i<list.length;i++){
        if(list[i].country === cc && haversineKm(lat, lon, list[i].lat, list[i].lon) <= km) return true;
      }
    }
  }
  return false;
}
function matchTension(m, c){
  if(!m) return false;
  if(m.all) return true;
  if(m.regions) return m.regions.indexOf(c.dept || '') !== -1;
  if(m.cpPrefix){
    var cps = tensionCpsOf(c);
    for(var i=0;i<cps.length;i++){
      for(var j=0;j<m.cpPrefix.length;j++){ if(String(cps[i]).indexOf(m.cpPrefix[j]) === 0) return true; }
    }
    return false;
  }
  if(m.near){
    for(var k=0;k<m.near.length;k++){ if(haversineKm(c.lat, c.lon, m.near[k].lat, m.near[k].lon) <= m.near[k].km) return true; }
    return false;
  }
  if(m.borderKm) return nearCountryWithin(c.lat, c.lon, m.with, m.borderKm);
  if(m.box){
    for(var bxi=0; bxi<m.box.length; bxi++){
      var b = m.box[bxi];
      if(c.lat >= b[0] && c.lat <= b[1] && c.lon >= b[2] && c.lon <= b[3]) return true;
    }
    return false;
  }
  return false;
}
// Niveau le plus élevé parmi les règles du pays qui couvrent le lieu (rouge > orange), une fois retirés
// les lieux de leur "except". Renvoie null hors de toute zone.
function tensionOf(c){
  var rules = TENSION_RULES_BY_COUNTRY[c.country];
  if(!rules) return null;
  var best = null;
  for(var i=0;i<rules.length;i++){
    var r = rules[i];
    if(!matchTension(r.match, c) || (r.except && matchTension(r.except, c))) continue;
    if(!best || (r.level === 'red' && best.level !== 'red')) best = { level: r.level, source: r.source || null };
  }
  return best;
}
function buildTensionIndex(){
  TENSION_RULES_BY_COUNTRY = {};
  (TENSION_ZONES || []).forEach(function(r){ (TENSION_RULES_BY_COUNTRY[r.country] = TENSION_RULES_BY_COUNTRY[r.country] || []).push(r); });
  COMMUNES.forEach(function(c){ c.tension = TENSION_RULES_BY_COUNTRY[c.country] ? tensionOf(c) : null; });
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
        if(AVOID_TENSION && c.tension) continue;
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

// Le modèle "même masse continentale = joignable" (voir landmassOf) ne vérifie jamais l'adjacence
// RÉELLE entre deux pays — jusqu'ici sans conséquence pratique, la moitié Est du continent européen/
// caucasien déjà couverte formant une chaîne de vraies frontières communes ne serait-ce qu'à travers
// un pays voisin. Le Proche-Orient est beaucoup plus fragmenté : découvert en testant l'ajout du
// Liban/d'Israël/de la Palestine/de la Jordanie/de l'Égypte/de la Libye, un trajet généré depuis
// Beyrouth proposait une étape en Israël (frontière fermée depuis des décennies, voir plus bas), PUIS
// une autre directement en Cisjordanie (aucune frontière commune du tout avec le Liban) — même famille
// de bug que Chypre lors de l'ajout précédent (voir landmassOf), mais une question d'adjacence
// terrestre plutôt qu'une mer à traverser. Plutôt qu'une liste noire de frontières fermées (essayée
// d'abord, insuffisante — elle n'empêchait pas le second cas), une liste BLANCHE de paires réellement
// adjacentes, appliquée UNIQUEMENT quand au moins un des deux pays fait partie de ce dernier ajout —
// jamais aux paires ne concernant que des pays déjà couverts avant lui, pour ne pas remettre en cause
// une simplification déjà acceptée ailleurs dans ce projet (ex. Arménie-Syrie, non adjacents non plus,
// mais hors du périmètre de ce correctif).
// ZONES plutôt que simples codes pays depuis l'ajout du Maghreb : Ceuta et Melilla sont espagnoles
// mais bâties sur le continent africain, séparées de l'Espagne péninsulaire par la mer et frontalières
// du Maroc par la terre. Un contrôle au niveau du PAYS ne pouvait pas les distinguer du reste de
// l'Espagne (reallyAdjacent renvoie true quand les deux côtés sont identiques), et le moteur traversait
// donc le détroit de Gibraltar par la route : mesuré avant correction, un trajet sur cent tirés depuis
// Algésiras passait par Ceuta sans le moindre segment de ferry. zoneOf() renvoie le code pays pour tout
// le reste, et deux zones dédiées pour ces deux villes, identifiées par leur préfixe de code postal
// (51xxx Ceuta, 52xxx Melilla, exclusifs à ces deux villes autonomes) — même méthode de détection par
// préfixe postal que pour Bornholm, Gotland ou l'Irlande du Nord ailleurs dans ce fichier.
function zoneOf(c){
  // Kaliningrad : exclave russe entre la Lituanie et la Pologne, séparée du reste de la Russie par des
  // frontières terrestres avec la Lituanie et la Pologne (voir ADJACENT_PAIRS) — et reliée aussi par le ferry
  // Oust-Louga-Baltiïsk (SEA_CROSSINGS 'RU|RU-KGD').
  if(c.country === 'RU' && c.dept === 'Kaliningrad Oblast') return 'RU-KGD';
  if(c.country === 'ES'){
    var cps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
    for(var i=0; i<cps.length; i++){
      if(/^51\d{3}$/.test(cps[i])) return 'ES-CE';
      if(/^52\d{3}$/.test(cps[i])) return 'ES-ML';
    }
  }
  return c.country;
}
// Une traversée maritime obligatoire entre deux ZONES d'une même masse terrestre (voir SEA_CROSSINGS
// dans trip-data.js) — le pendant de ferryRouteFor pour les cas que la masse terrestre ne sait pas
// décrire.
function seaCrossingFor(a, b){ return (a === b) ? null : (SEA_CROSSINGS[landmassKey(a, b)] || null); }

var NEW_BATCH_COUNTRIES = new Set(['LB', 'IL', 'PS', 'JO', 'EG', 'LY',
  // Lot Maghreb : mêmes règles d'adjacence réelle, étendues aux quatre territoires ajoutés et aux
  // deux villes espagnoles d'Afrique.
  'MA', 'DZ', 'TN', 'EH', 'ES-CE', 'ES-ML',
  // Lot Afrique de l'Ouest : treize pays de plus soumis au même contrôle d'adjacence réelle.
  'MR', 'ML', 'SN', 'GM', 'CV', 'GN', 'GW', 'SL', 'LR', 'BF', 'CI', 'GH', 'TG',
  // Lot Sahel / Afrique centrale / Corne de l'Afrique.
  'NE', 'BJ', 'NG', 'TD', 'CF', 'SD', 'SS', 'ER', 'ET', 'DJ', 'SO',
  // Lot Afrique orientale, centrale et australe / océan Indien.
  'KE', 'UG', 'TZ', 'RW', 'BI', 'CD', 'CG', 'GA', 'GQ', 'ST', 'AO', 'ZM', 'MW', 'MZ', 'ZW', 'BW', 'NA',
  'ZA', 'SZ', 'LS', 'KM', 'MG', 'MU', 'SC',
  // Cameroun, Sainte-Hélène/Ascension/Tristan da Cunha, îles Glorieuses et Juan de Nova.
  'CM', 'SH', 'TF',
  // Russie (et son exclave de Kaliningrad), Svalbard et Jan Mayen.
  'RU', 'RU-KGD', 'SJ',
  // Péninsule Arabique, Irak et Iran.
  'SA', 'BH', 'AE', 'IQ', 'IR', 'KW', 'OM', 'QA', 'YE',
  // Asie centrale, du Sud, de l'Est et du Sud-Est.
  'AF', 'KZ', 'KG', 'UZ', 'TJ', 'TM', 'BD', 'BT', 'IN', 'MV', 'NP', 'PK', 'LK', 'IO', 'CN', 'HK', 'MO', 'KP', 'KR',
  'JP', 'MN', 'TW', 'BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'TL', 'VN', 'CX', 'CC',
  // Océanie (septembre 2026)
  'AU', 'NZ', 'PG', 'SB', 'VU', 'FJ', 'WS', 'TO', 'TV', 'KI', 'NR', 'MH', 'FM', 'PW', 'NU', 'CK', 'TK', 'GU', 'MP', 'AS', 'UM', 'PN', 'NF', 'HM']);
// ADJACENCE RÉELLE — règle révisée en septembre 2026, à la demande de l'utilisateur.
//
// Une paire figure ici dès qu'une ROUTE franchit physiquement la frontière entre les deux zones. Les
// fermetures d'origine politique ou sécuritaire NE ferment PLUS rien : avis « formellement déconseillé »
// de France Diplomatie, fermetures décidées par un État (Finlande-Russie depuis 2023, Maroc-Algérie depuis
// 1994, Rwanda-Burundi depuis 2024, Azerbaïdjan à l'entrée, Ouganda-RDC pour Ebola…), frontières dont
// l'ouverture n'avait pas pu être établie faute de source récente. Ces situations relèvent désormais des
// ZONES À TENSION (voir TENSION_ZONES dans trip-data.js) : un avertissement à l'affichage, et un filtre
// activé par défaut qui les exclut des tirages. Le détail des fermetures recensées lors des recherches
// précédentes reste dans le README, section "Pays couverts".
//
// NE FIGURENT PAS ICI, uniquement parce qu'AUCUNE ROUTE ne traverse la frontière :
// - RD Congo-Congo : le fleuve Congo sur toute sa longueur, sans pont (Kinshasa-Brazzaville : canots et bac
//   sans grille tarifaire ; pont route-rail prévu pour 2028) ;
// - RD Congo-Centrafrique : l'Oubangui (Zongo-Bangui, pirogues et bac irrégulier) ;
// - Tanzanie-RD Congo : frontière entièrement dans le lac Tanganyika ;
// - Nigeria-Tchad : 85 km de frontière dans le lac Tchad, sans poste routier ;
// - et, bien sûr, toute paire sans frontière commune (Liban-Jordanie, Ceuta-Melilla…).
// Ceuta et Melilla sont reliées à l'Espagne péninsulaire, et Kaliningrad à la Russie, par des traversées
// maritimes (SEA_CROSSINGS) ; ces paires figurent ici pour que la traversée soit autorisée.
var ADJACENT_PAIRS = new Set([
  // Proche-Orient
  'LB|SY', 'LB|IL', 'SY|JO', 'SY|IL', 'IL|JO', 'IL|EG', 'IL|PS', 'JO|PS', 'EG|LY', 'EG|PS', 'EG|SD',
  // Maghreb et Sahara
  'LY|TN', 'TN|DZ', 'DZ|LY', 'MA|DZ', 'MA|EH', 'DZ|EH', 'DZ|MR', 'DZ|ML', 'DZ|NE', 'LY|NE', 'LY|TD', 'LY|SD',
  'ES-CE|MA', 'ES-ML|MA', 'ES|ES-CE', 'ES|ES-ML',
  // Afrique de l'Ouest
  'MR|EH', 'MR|SN', 'MR|ML', 'ML|SN', 'ML|GN', 'ML|CI', 'ML|BF', 'ML|NE', 'SN|GN', 'SN|GW', 'SN|GM',
  'GN|CI', 'GN|LR', 'GN|SL', 'GN|GW', 'SL|LR', 'LR|CI', 'BF|CI', 'BF|GH', 'BF|TG', 'BF|BJ', 'BF|NE',
  'CI|GH', 'GH|TG', 'BJ|TG', 'BJ|NG', 'BJ|NE', 'NE|NG', 'NE|TD',
  // Afrique centrale et Corne
  'NG|CM', 'TD|CM', 'TD|CF', 'TD|SD', 'CF|CM', 'CF|SD', 'CF|SS', 'CF|CG', 'CM|CG', 'CM|GA', 'CM|GQ',
  'CG|GA', 'CG|AO', 'GA|GQ', 'SD|SS', 'SD|ET', 'SD|ER', 'ER|ET', 'ER|DJ', 'ET|DJ', 'ET|SO', 'ET|SS',
  'ET|KE', 'DJ|SO', 'SS|KE', 'SS|UG', 'SS|CD',
  // Afrique orientale et australe
  'KE|SO', 'KE|TZ', 'KE|UG', 'UG|TZ', 'UG|RW', 'UG|CD', 'TZ|RW', 'TZ|BI', 'TZ|ZM', 'TZ|MW', 'TZ|MZ',
  'RW|BI', 'RW|CD', 'BI|CD', 'CD|ZM', 'CD|AO', 'AO|ZM', 'AO|NA', 'ZM|MW', 'ZM|MZ', 'ZM|ZW', 'ZM|BW',
  'ZM|NA', 'MW|MZ', 'MZ|ZW', 'MZ|ZA', 'MZ|SZ', 'ZW|ZA', 'ZW|BW', 'BW|ZA', 'BW|NA', 'NA|ZA', 'ZA|SZ', 'ZA|LS',
  // Péninsule Arabique, Irak et Iran (Bahreïn : chaussée du roi Fahd, 25 km de route sur la mer ;
  // Musandam, exclave omanaise, est reliée au reste d'Oman par la route à travers les Émirats)
  'SA|JO', 'SA|IQ', 'SA|KW', 'SA|QA', 'SA|AE', 'SA|OM', 'SA|YE', 'SA|BH', 'AE|OM', 'OM|YE',
  'IQ|JO', 'IQ|SY', 'IQ|TR', 'IQ|IR', 'IQ|KW', 'IR|TR', 'IR|AM', 'IR|AZ',
  // Asie centrale
  'KZ|RU', 'KZ|CN', 'KZ|KG', 'KZ|UZ', 'KZ|TM', 'KG|UZ', 'KG|TJ', 'KG|CN', 'UZ|TJ', 'UZ|TM', 'UZ|AF', 'TJ|AF',
  'TJ|CN', 'TM|AF', 'TM|IR', 'AF|IR', 'AF|PK',
  // Asie du Sud (Pakistan-Inde : Wagah-Attari ; Inde-Chine : Nathu La ; Népal-Chine : Kerung, Tatopani)
  'PK|IR', 'PK|IN', 'PK|CN', 'IN|CN', 'IN|NP', 'IN|BT', 'IN|BD', 'IN|MM', 'NP|CN',
  // Asie de l'Est (Hong Kong-Macao : pont Hong Kong-Zhuhai-Macao ; Corées : routes de la zone démilitarisée)
  'CN|MN', 'CN|RU', 'CN|KP', 'CN|VN', 'CN|LA', 'CN|MM', 'CN|HK', 'CN|MO', 'HK|MO', 'MN|RU', 'KP|RU', 'KP|KR',
  // Asie du Sud-Est (Malaisie-Singapour : chaussée et Second Link ; Bornéo : Malaisie, Brunei, Indonésie ;
  // Timor : Indonésie-Timor oriental)
  'VN|LA', 'VN|KH', 'LA|TH', 'LA|KH', 'LA|MM', 'TH|MM', 'TH|KH', 'TH|MY', 'MY|SG', 'MY|BN', 'MY|ID', 'ID|TL',
  // Océanie : seule frontière terrestre, Wutung (PG) – Skouw (ID), franchie par la route Vanimo–Jayapura.
  'PG|ID',
  // Sans route, donc absentes : Afghanistan-Chine (col de Wakhjir), Bhoutan-Chine, Bangladesh-Myanmar
  // (aucun poste routier), et toute frontière maritime.
  // Russie et son exclave
  'RU|NO', 'RU|FI', 'RU|EE', 'RU|LV', 'RU|BY', 'RU|UA', 'RU|GE', 'RU|AZ', 'RU-KGD|LT', 'RU-KGD|PL', 'RU|RU-KGD'
]);
function reallyAdjacent(zoneA, zoneB){
  if(!zoneA || !zoneB || zoneA === zoneB) return true;
  if(!NEW_BATCH_COUNTRIES.has(zoneA) && !NEW_BATCH_COUNTRIES.has(zoneB)) return true; // hors périmètre de ce correctif
  return ADJACENT_PAIRS.has(zoneA + '|' + zoneB) || ADJACENT_PAIRS.has(zoneB + '|' + zoneA);
}

function buildRealRoute(startLat, startLon, startLandmass, startZone, maxRadiusKm, numStops, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled, shortHop){
  var route = [];
  var used = {};
  if(avoidNorm) used[avoidNorm] = true;
  var curLat = startLat, curLon = startLon;
  var curLandmass = startLandmass;
  var curZone = startZone;
  var minDist = minDistanceKm || 0;
  var maxDist = maxDistanceKm || 0;
  var hopCeiling = maxDist > 0 ? maxDist : 600;
  function reachable(x){
    var toLandmass = landmassOf(x.commune);
    var toZone = zoneOf(x.commune);
    if(!reallyAdjacent(curZone, toZone)) return false;
    // Traversée obligatoire entre deux zones d'une même masse terrestre (Ceuta/Melilla) : jamais
    // franchissable par la route, quoi qu'en dise la masse terrestre.
    if(seaCrossingFor(curZone, toZone)) return ferryEnabled;
    return toLandmass === curLandmass || (ferryEnabled && !!ferryRouteFor(curLandmass, toLandmass));
  }
  for(var i=0; i<numStops; i++){
    var isFirst = i===0;
    var isLast = !isFirst && i===numStops-1;
    var isOnlyStop = numStops === 1;
    var minHop = shortHop ? 2 : (isFirst ? Math.max(15, minDist) : 8);
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
      // La dernière étape doit être réellement adjacente à la fois au pays courant (pour y ARRIVER)
      // ET au pays de départ (pour en REPARTIR directement vers le point de départ, voir "retour" sur
      // la carte/le calcul de trajet retour plus bas — un saut direct, jamais un nouveau passage par
      // les mêmes étapes intermédiaires). Sans ce second contrôle, un trajet pourrait très bien
      // atteindre sa dernière étape par une vraie chaîne de pays adjacents, puis "revenir" directement
      // par une frontière qui, elle, n'existe pas (ex. Beyrouth -> Syrie -> Jordanie -> Cisjordanie,
      // chaque saut réel, mais un retour direct Cisjordanie -> Liban ne l'est pas).
      var lastCap = maxDist > 0 ? Math.min(maxRadiusKm, maxDist) : maxRadiusKm;
      function reachableLast(x){ return reachable(x) && reallyAdjacent(startZone, zoneOf(x.commune)); }
      candidates = findNearbyCommunes(curLat, curLon, 0, Math.max(maxHop, lastCap), minPop)
        .filter(function(x){ return !used[x.commune.norm]; })
        .filter(reachableLast)
        .filter(function(x){ return roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= lastCap; });
      if(candidates.length===0){
        candidates = findNearbyCommunes(startLat, startLon, 0, lastCap, 0)
          .filter(function(x){ return !used[x.commune.norm]; })
          .filter(reachableLast);
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
    // Sans cette ligne (oubliée dans une première version de ce correctif, détectée par un test
    // automatisé de 180 trajets plutôt qu'en relisant le code) : reachable()/reachableLast()
    // auraient continué à comparer chaque nouvelle étape au pays de DÉPART plutôt qu'au pays de
    // l'étape précédente, laissant passer des sauts non adjacents dès la deuxième étape (ex. un
    // trajet Amman -> Syrie -> Israël, le deuxième saut resterait comparé à "Jordanie" au lieu de
    // "Syrie" et paraîtrait à tort valide puisque Jordanie-Israël, eux, sont bien adjacents).
    curZone = zoneOf(chosen.commune);
  }
  return route;
}

function distributeNights(route, totalNights, minNightsPerStop, maxNightsPerStop){
  var minN = minNightsPerStop || 1;
  var maxN = Math.max(minN, maxNightsPerStop || 3);
  var nights = route.map(function(){ return minN; });
  var remaining = totalNights - nights.reduce(function(a,b){ return a+b; }, 0);
  var guard = 0;
  while(remaining > 0 && guard < 300){
    guard++;
    var idx = randInt(0, route.length-1);
    if(nights[idx] >= maxN) continue;
    var feat = FEATURED[route[idx].norm];
    var weight = feat ? feat.pois.length + 1 : 1;
    if(Math.random() > weight/5) continue;
    nights[idx]++;
    remaining--;
  }
  // round-robin en respectant le plafond tant que c'est possible
  while(remaining > 0){
    var progressed = false;
    for(var i=0; i<nights.length && remaining>0; i++){
      if(nights[i] < maxN){
        nights[i]++;
        remaining--;
        progressed = true;
      }
    }
    if(!progressed) break;
  }
  // dernier recours : bornes min/max incompatibles avec le nombre de nuits total,
  // on dépasse le plafond plutôt que de perdre des nuits du séjour
  var idx2 = 0;
  while(remaining > 0){
    nights[idx2 % nights.length]++;
    remaining--;
    idx2++;
  }
  // sécurité : si le plancher minNightsPerStop a fait dépasser totalNights (ex. itinéraire de
  // secours réduit à une seule étape), on retranche pour ne jamais dépasser la durée demandée
  var excess = nights.reduce(function(a,b){ return a+b; }, 0) - totalNights;
  var k = nights.length - 1;
  while(excess > 0 && nights.some(function(n){ return n > 1; })){
    if(nights[k] > 1){ nights[k]--; excess--; }
    k = (k - 1 + nights.length) % nights.length;
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
function buildItinerary(city, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled, preferredCurrency, minDaysPerCity, maxDaysPerCity){
  var speed = TRANSPORT[transportKey].speed;
  var cLat = cityCoord.lat, cLon = cityCoord.lon;
  var startLandmass = landmassOf(cityCoord);
  // Jan Mayen (voir NO_TRIP_LANDMASSES) : recherchable, mais aucun trajet n'y est proposé.
  if(NO_TRIP_LANDMASSES[startLandmass]) return [];
  var legs = [];
  var minDist = minDistanceKm || 0;
  var maxDist = maxDistanceKm || 0;
  var minNightsPerStop = minDaysPerCity || 1;
  var maxNightsPerStop = Math.max(minNightsPerStop, maxDaysPerCity || 3);

  function finalizeHop(fromPoint, toPoint, distanceKm, country){
    // Une traversée entre zones (Ceuta/Melilla) prime sur la masse terrestre : les deux points sont
    // "continentaux" tous les deux, seule SEA_CROSSINGS sait qu'il y a la mer entre eux.
    var crossing = seaCrossingFor(zoneOf(fromPoint), zoneOf(toPoint));
    if(crossing) return finalizeFerryLeg(transportKey, crossing);
    var fromLandmass = landmassOf(fromPoint), toLandmass = landmassOf(toPoint);
    if(fromLandmass !== toLandmass){
      var route = ferryRouteFor(fromLandmass, toLandmass);
      if(route) return finalizeFerryLeg(transportKey, route);
    }
    return finalizeLeg(distanceKm, speed, transportKey, tollEnabled, tollCountryOf(toPoint));
  }

  if(days <= 1){
    var hopCeiling0 = maxDist > 0 ? maxDist : 600;
    var minHop0 = Math.max(15, minDist);
    var hop = Math.max(40, minDist > 0 ? Math.max(minDist*1.4, maxRadiusKm) : Math.min(maxRadiusKm, hopCeiling0));
    function reachable0(x){
      var toLandmass = landmassOf(x.commune);
      var toZone = zoneOf(x.commune);
      if(!reallyAdjacent(zoneOf(cityCoord), toZone)) return false;
      if(seaCrossingFor(zoneOf(cityCoord), toZone)) return ferryEnabled;
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
  var maxPossibleStops = Math.max(1, Math.min(MAX_STOPS, totalNights, Math.floor(totalNights / minNightsPerStop) || 1));
  var forceMultiStop = minDist > maxRadiusKm && maxPossibleStops >= 2;
  var minStops = forceMultiStop ? 2 : (totalNights >= 3 ? Math.min(3, maxPossibleStops) : 1);
  minStops = Math.min(minStops, maxPossibleStops);
  // assez d'étapes pour qu'aucune ville n'ait besoin de dépasser maxNightsPerStop nuits
  var minStopsForCap = Math.min(Math.ceil(totalNights / maxNightsPerStop) || 1, maxPossibleStops);
  minStops = Math.max(minStops, minStopsForCap);
  var numStops = randInt(minStops, maxPossibleStops);
  var route = buildRealRoute(cLat, cLon, startLandmass, zoneOf(cityCoord), maxRadiusKm, numStops, avoidNorm, minDist, maxDist, ferryEnabled);
  if(route.length === 0) route = buildRealRoute(cLat, cLon, startLandmass, zoneOf(cityCoord), Math.max(maxRadiusKm, 300), 1, null, 0, maxDist, ferryEnabled);
  // Dernier recours pour les petites îles : la première étape exige au moins 15 km, si bien que tout
  // départ d'une île plus petite que cela (Sainte-Hélène, Brava, La Digue, Petite-Terre à Mayotte…)
  // aboutissait à « itinéraire impossible » alors que d'autres lieux réels existent à quelques
  // kilomètres. Ce troisième essai n'intervient que si les deux précédents ont échoué, et accepte une
  // étape à partir de 2 km : le comportement des trajets ordinaires est inchangé.
  if(route.length === 0) route = buildRealRoute(cLat, cLon, startLandmass, zoneOf(cityCoord), Math.max(maxRadiusKm, 300), 1, null, 0, maxDist, ferryEnabled, true);
  if(route.length === 0) return [];
  var nights = distributeNights(route, totalNights, minNightsPerStop, maxNightsPerStop);

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
      var legInfo = n===0 ? finalizeHop(prevPoint, commune, distanceKm, commune.country) : finalizeLeg(distanceKm, speed, transportKey, tollEnabled, tollCountryOf(commune));
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
  buildTensionIndex();
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

  var minDaysPerCity = Math.round(Number(p.minDaysPerCity));
  if(!isFinite(minDaysPerCity) || minDaysPerCity < 1) minDaysPerCity = 1;
  var maxDaysPerCity = Math.round(Number(p.maxDaysPerCity));
  if(!isFinite(maxDaysPerCity) || maxDaysPerCity < 1) maxDaysPerCity = 3;
  maxDaysPerCity = Math.min(maxDaysPerCity, MAX_TRIP_DAYS - 1);
  minDaysPerCity = Math.min(minDaysPerCity, maxDaysPerCity);

  // Filtre des zones à tension : actif sauf demande explicite contraire (p.avoidTension === false).
  var avoidTension = p.avoidTension !== false;
  AVOID_TENSION = avoidTension;
  var legs = buildItinerary(cityName, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled, preferredCurrency, minDaysPerCity, maxDaysPerCity);
  // Tirage vide avec le filtre actif : on vérifie si c'est le filtre qui bloque (départ au milieu d'une
  // zone à tension, par exemple), pour que le client puisse le dire plutôt qu'un « itinéraire impossible ».
  var tensionBlocked = false;
  if(legs.length === 0 && avoidTension){
    AVOID_TENSION = false;
    tensionBlocked = buildItinerary(cityName, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled, preferredCurrency, minDaysPerCity, maxDaysPerCity).length > 0;
    AVOID_TENSION = true;
  }
  // Avertissement par étape (et pour le point de départ), calculé sur les mêmes règles.
  legs.forEach(function(leg){
    leg.tension = (leg.country && TENSION_RULES_BY_COUNTRY[leg.country]) ? tensionOf({ country: leg.country, cps: leg.allCps, cp: leg.cp, dept: leg.dept, lat: leg.lat, lon: leg.lon }) : null;
  });
  var departureTension = TENSION_RULES_BY_COUNTRY[country] ? tensionOf(cityCoord) : null;
  var spinPool = buildSpinPool(lat, lon, maxRadiusKm);
  AVOID_TENSION = true;
  return { legs: legs, spinPool: spinPool, departureTension: departureTension, tensionBlocked: tensionBlocked };
}

module.exports = { init, isReady, searchCity, generateTrip };
