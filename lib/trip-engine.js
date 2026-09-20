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
// Caractères invisibles retirés des noms comparés (16e audit du 20/09/2026) : espace sans chasse (U+200B), liants
// persan/ourdou/indien (U+200C, U+200D), joint de mot (U+2060), trait d'union conditionnel (U+00AD), marque d'ordre
// (U+FEFF), séparateur mongol (U+180E) et marques de direction (U+200E, U+200F, U+061C). Aucun clavier ne les tape :
// sans cela, un alias qui en contient est introuvable, et un nom persan saisi avec ou sans liant ne correspond pas à
// la même graphie dans l'index (données nettoyées à la même passe, voir scripts/build-all-aliases.js).
const INVISIBLE_RE = /[\u00AD\u061C\u180E\u200B-\u200F\u2060\uFEFF]/g;
// Distance par la route = distance à vol d'oiseau × ROAD_FACTOR. Valeur MESURÉE (7e audit, 17/09/2026) sur
// 128 itinéraires routiers réels calculés par OSRM (profil voiture, données OpenStreetMap) entre villes de plus de
// 20 000 habitants de 16 pays, pour des étapes de 80 à 500 km à vol d'oiseau : médiane 1,287 (q25 1,216 ; q75 1,399),
// moyenne 1,327. La valeur précédente, 1,17, n'était sourcée nulle part et sous-estimait toutes les distances (donc
// aussi les durées et les budgets carburant) d'environ 10 %. Mesure reproductible : scripts/measure-road-factor.js,
// relevé conservé dans data/road-factor-osrm.json.
const ROAD_FACTOR = 1.287;
// Facteur routier des CORRIDORS AUTOROUTIERS, plus droits que la moyenne des routes : 1,170 (médiane mesurée sur les
// 38 liaisons à péage de public/data/toll-reference.json, en comparant leur kilométrage au vol d'oiseau entre les deux
// villes ; l'agent de vérification a mesuré 1,165 indépendamment sur les mêmes corridors avec OSRM). Les tarifs de
// TOLL_RATE_BY_COUNTRY sont des euros par kilomètre D'AUTOROUTE RÉELLE : appliqués à une distance estimée avec le
// facteur général (1,287), ils auraient surfacturé le péage d'environ 10 % partout. Les kilomètres facturés sont donc
// ramenés à l'échelle autoroutière (7e audit du 18/09/2026).
const TOLL_ROAD_FACTOR = 1.17;
const GRID_CELL_DEG = 0.2;
const MAX_STOPS = 15; // nombre maximum de villes-étapes distinctes sur un même trajet
const MAX_TRIP_DAYS = 21;
// Distance max entre deux étapes par défaut (formulaire « Distance max entre les étapes »). À vélo, 80 km : au-dessus
// des 65 km parcourus en moyenne chaque jour par un itinérant (France Vélo Tourisme, dossier de presse 2025, d'après
// les enquêtes Inddigo-Altermodal / Vélo & Territoires) et des 50 à 60 km d'un cycliste standard selon EuroVelo
// (fr.eurovelo.com/cycling-tips, consulté le 18/09/2026), mais dans la fourchette des cyclistes habitués — c'est un
// MAXIMUM, pas une moyenne, et le visiteur peut l'abaisser. En véhicule motorisé, 400 km ≈ 5 h de route à 80 km/h.
const DEFAULT_MAX_LEG_KM = { 'velo': 80 };
// Plafonds des distances reçues du client (distance d'éloignement min/max) et du rayon de recherche interne.
const MAX_DISTANCE_PARAM_KM = 3000;
const MAX_SEARCH_RADIUS_KM = 4500;
const CURRENCY_CODE_RE = /^[A-Z]{3}$/;

const { COUNTRIES, TRANSPORT, FERRY_ROUTES, SEA_CROSSINGS, TOLL_RATE_BY_COUNTRY, TOLL_LANDMASSES,
  EV_RANGE_KM, EV_CHARGE_MARGIN, EV_CHARGE_STOP_MIN, WADDEN_ISLANDS, SARDINIA_PROVINCES,
  SICILY_PROVINCES, HR_POSTCODE_TO_ISLAND, CV_CONCELHO_TO_ISLAND, ISLAND_BOXES, ISLAND_ONLY_COUNTRIES, NO_TRIP_LANDMASSES, TENSION_ZONES, ISLAND_RULES, GR_ISLAND_PATTERNS,
  GR_POROS_MAINLAND_NAMES, VAN_RULES, MOTO_RULES, LODGING_RULES, lodgingPriceCap, LODGING_LINK_CURRENCIES } = TripData;

// ---------------------------------------------------------------------------------------------
// RESTRICTIONS DE CIRCULATION : VANS ET MOTOS (septembre 2026)
// ---------------------------------------------------------------------------------------------
// VAN_RULES : zones à faibles émissions, zones à trafic limité, tunnels, cols et routes restreints (point + rayon).
// MOTO_RULES : interdiction des autoroutes aux motos dans un pays (noMotorway, éventuellement sous une cylindrée
// minCc ou sur une partie du réseau seulement : partial) et interdictions en ville (cityBan).
// Moto de tourisme supposée ≥ 500 cm³ : une interdiction qui ne vise que les motos de moins de 500 cm³ n'allonge pas
// le trajet (simple avertissement) ; une interdiction totale du réseau autoroutier le calcule par les routes
// secondaires (MOTO_NO_MOTORWAY_SPEED_FACTOR) et sans péage.
const MOTO_TOURING_CC = 500;
// Facteur de vitesse d'une moto privée d'autoroute, MESURÉ par pays (10e audit du 18/09/2026 ; 0,8 auparavant, sans
// source) : durée d'un trajet avec autoroutes / durée sans, calculées par le routeur Valhalla (OpenStreetMap, profil
// moto) sur 5 trajets par pays entre villes de plus de 20 000 habitants — scripts/measure-moto-no-motorway.js, relevé
// dans data/moto-no-motorway-valhalla.json. Médianes : Corée du Sud 0,68, Taïwan 0,58, Viêt Nam 0,85, Pakistan 0,87 ;
// Thaïlande, Indonésie et Sri Lanka 1,00 (autoroutes rares : les exclure ne change presque rien). Limites : 5 trajets par
// pays seulement (Taïwan : 0,50 à 1,00), et la vitesse de base reste celle du moteur (80 km/h), mesurée sur 16 pays qui
// ne comprennent aucun de ces sept. Pays sans relevé : médiane des 35 trajets, 0,89.
const MOTO_NO_MOTORWAY_SPEED_FACTOR = { KR: 0.68, TW: 0.58, VN: 0.85, PK: 0.87, TH: 1, ID: 1, LK: 1 };
const MOTO_NO_MOTORWAY_SPEED_FACTOR_DEFAULT = 0.89;
// Règle nationale (tout le réseau) par pays ; règles partielles (quelques voies rapides) : localisées (near) ou non.
var MOTO_NATIONAL_BY_COUNTRY = {}, MOTO_PARTIAL_RULES = [];
(MOTO_RULES || []).forEach(function(r){
  if(r.type !== 'noMotorway') return;
  if(r.partial) MOTO_PARTIAL_RULES.push(r); else MOTO_NATIONAL_BY_COUNTRY[r.country] = r;
});
function motoMotorwayBan(country){
  var r = MOTO_NATIONAL_BY_COUNTRY[country];
  if(!r) return null;
  var fullBan = r.minCc == null || r.minCc > MOTO_TOURING_CC;
  return { rule: r, fullBan: fullBan };
}
// Ville hôte d'une zone (ZFE, ZTL) : nom normalisé de la partie avant « – » ; distance maximale entre le point de la
// commune et le centre de la zone, pour écarter un homonyme lointain.
var ZONE_HOST_MAX_KM = 15, ZONE_HOST_CACHE = new Map();
// Nom normalisé d'un point : lieu tiré (norm), point de départ ou retour (name, stop) — 11e audit du 19/09/2026 : le
// départ et le retour n'ont pas de « norm », si bien que la ZTL de Rome n'était jamais signalée pour un départ de Rome.
function placeNorm(p){
  if(!p) return '';
  if(p.norm) return p.norm;
  var n = p.name || p.stop || '';
  return n ? normalizeCityName(String(n)) : '';
}
function zoneHostNorm(r){
  if(!ZONE_HOST_CACHE.has(r)) ZONE_HOST_CACHE.set(r, normalizeCityName(String(r.name || '').split(/\s+[–-]\s+/)[0]));
  return ZONE_HOST_CACHE.get(r);
}
// Avertissements d'un trajet from -> to (to = étape d'arrivée) pour un mode donné.
function restrictionsForLeg(transportKey, from, to, seenCountries){
  var out = [];
  if(transportKey === 'van'){
    (VAN_RULES || []).forEach(function(r){
      var near = r.near; if(!near) return;
      var hit;
      // Zone de ville (ZFE, ZTL) : étape dans son cercle, OU étape dans la ville qui l'accueille (10e audit du
      // 18/09/2026). Le point d'une étape est celui de la commune : pour 10 zones sur 133, aucun lieu ne tombe dans le
      // cercle (Rome : la commune « Roma » est à 2,9 km du centre de la ZTL, rayon 1,5 km) — l'avertissement n'était
      // jamais affiché. Ville hôte : la partie du nom avant « – » (« Roma – ZTL Centro Storico »), même pays.
      if(r.type === 'lez' || r.type === 'ztl'){
        hit = haversineKm(to.lat, to.lon, near.lat, near.lon) <= near.km ||
          (to.country === r.country && placeNorm(to) === zoneHostNorm(r) && haversineKm(to.lat, to.lon, near.lat, near.lon) <= ZONE_HOST_MAX_KM);
      }
      else hit = from ? distToSegmentKm(near.lat, near.lon, from.lat, from.lon, to.lat, to.lon) <= Math.max(near.km, 2)
                      : haversineKm(to.lat, to.lon, near.lat, near.lon) <= near.km;
      if(hit) out.push({ kind: 'van', type: r.type, name: r.name, source: r.source });
    });
  } else if(transportKey === 'moto'){
    // Pays traversés compris (12e audit, to.countriesCrossed posé avant cet appel, voir generateTrip).
    [from && from.country, to.country].concat(from && from.country !== to.country ? (to.countriesCrossed || []) : []).forEach(function(cc){
      if(!cc || seenCountries[cc]) return;
      var ban = motoMotorwayBan(cc);
      if(!ban) return;
      seenCountries[cc] = true;
      // Interdiction qui ne vise que les petites cylindrées (≤ moto de tourisme) : simple rappel du seuil.
      var type = ban.fullBan ? 'noMotorway' : 'noMotorwayCc';
      out.push({ kind: 'moto', type: type, country: cc, name: (COUNTRIES[cc] && COUNTRIES[cc].name) || cc, minCc: ban.rule.minCc || null, source: ban.rule.source });
    });
    // Voies rapides interdites localement : si le trajet passe dans leur zone ; sans zone, une fois par pays traversé.
    MOTO_PARTIAL_RULES.forEach(function(r){
      var key = 'partial:' + r.country + ':' + (r.near ? r.near.lat + ',' + r.near.lon : '');
      if(seenCountries[key]) return;
      var hit;
      if(r.near) hit = from ? distToSegmentKm(r.near.lat, r.near.lon, from.lat, from.lon, to.lat, to.lon) <= r.near.km
                            : haversineKm(to.lat, to.lon, r.near.lat, r.near.lon) <= r.near.km;
      else hit = (from && from.country === r.country) || to.country === r.country;
      if(!hit) return;
      seenCountries[key] = true;
      out.push({ kind: 'moto', type: 'partial', country: r.country, name: (COUNTRIES[r.country] && COUNTRIES[r.country].name) || r.country, source: r.source });
    });
    (MOTO_RULES || []).forEach(function(r){
      if(r.type !== 'cityBan' || !r.near) return;
      if(haversineKm(to.lat, to.lon, r.near.lat, r.near.lon) <= r.near.km) out.push({ kind: 'moto', type: 'cityBan', name: r.name, source: r.source });
    });
  }
  return out;
}

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
// Format strict AAAA-MM-JJ, date réelle (2026-02-31 refusé, pas reportée au 3 mars) et année raisonnable (de l'année
// précédente à trois ans plus tard) ; sinon null (date du jour). 0001-01-01 ou 99999-01-01 passaient dans les liens.
function parseIsoDate(s){
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if(!m) return null;
  var y = +m[1], mo = +m[2], da = +m[3];
  var thisYear = new Date().getFullYear();
  if(y < thisYear - 1 || y > thisYear + 3) return null;
  var d = new Date(y, mo - 1, da);
  return (d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === da) ? d : null;
}

// Devise et plafond de prix des liens d'hébergement : lodgingPriceCap (public/js/trip-data.js), partagé avec le client.

function landmassKey(a, b){ return [a, b].sort().join('|'); }
// Toute liaison existante est proposée, même sans tarif connu pour le mode de transport choisi : `priceStatus`
// ('variable' = prix fixé à la réservation selon la demande ; 'unknown' = aucun tarif publié ou lisible) ou un prix
// absent pour la classe (ex. motos sur le MV Manu'atele) donnent un montant null et un avertissement à l'affichage.
function ferryRouteFor(a, b){
  if(a === b || !FERRY_SIDES.has(a) || !FERRY_SIDES.has(b)) return null; // pré-test : pas de clé construite pour rien
  return FERRY_ROUTES[landmassKey(a, b)] || null;
}
// Masses terrestres et zones desservies par au moins une traversée ; masse « lieu isolé » (PAYS:lat,lon, voir landmassOf).
var FERRY_SIDES = new Set(), SEA_ZONES = new Set();
Object.keys(FERRY_ROUTES).forEach(function(k){ k.split('|').forEach(function(s){ FERRY_SIDES.add(s); }); });
Object.keys(SEA_CROSSINGS).forEach(function(k){ k.split('|').forEach(function(s){ SEA_ZONES.add(s); }); });
var POINT_LANDMASS_RE = /^[A-Z]{2}:-?\d/;

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
      var hrIsland = Object.prototype.hasOwnProperty.call(HR_POSTCODE_TO_ISLAND, hrCps[hci]) ? HR_POSTCODE_TO_ISLAND[hrCps[hci]] : null;
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
      var cvIsland = Object.prototype.hasOwnProperty.call(CV_CONCELHO_TO_ISLAND, cvCps[cvi]) ? CV_CONCELHO_TO_ISLAND[cvCps[cvi]] : null;
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

// Masse terrestre d'un lieu de COMMUNES, calculée une fois puis mémorisée sur le lieu (champ lu aussi par legAllowed) : un
// tirage sur un grand rayon l'évaluait plusieurs fois pour des centaines de milliers de lieux.
function communeLandmass(c){
  var lm = c.landmass;
  if(lm === undefined) lm = c.landmass = landmassOf(c);
  return lm;
}

// Pays « de rattachement » d'un lieu pour les règles nationales (interdiction d'autoroute aux motos, libellé du
// barème). Les départements d'outre-mer sont rattachés à la France (country 'FR') mais n'ont aucune autoroute à
// péage ; même chose pour les îles sans autoroute à péage des autres pays (Corse, Sardaigne, Baléares, Canaries,
// Madère, Crète…) : voir TOLL_LANDMASSES. Depuis le 7e audit, le MONTANT du péage ne dépend plus de ce rattachement
// mais des voies à péage réellement présentes sur le trajet (lib/toll-grid.js) ; ce filtre reste un garde-fou pour les
// règles de circulation et pour le cas où la grille manquerait.
function tollCountryOf(c){
  if(c.country === 'FR' && /^97/.test(c.dept || '')) return null;
  var tollLandmasses = TOLL_LANDMASSES[c.country];
  if(tollLandmasses && tollLandmasses.indexOf(landmassOf(c)) < 0) return null;
  return c.country;
}

// Durée d'un trajet (h) depuis son libellé fmtHours (« 6h30 », « 45 min »).
function travelHoursOf(label){
  var m = String(label || '').match(/^(\d+)h(\d*)$/);
  if(m) return +m[1] + (m[2] ? +m[2] / 60 : 0);
  var mm = String(label || '').match(/^(\d+) min$/);
  return mm ? +mm[1] / 60 : 0;
}
// Au-delà de cette durée de route, le premier trajet donne droit à une deuxième nuit à l'arrivée.
const FIRST_LEG_REST_HOURS = 6;

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
  // Ce que couvre le prix (11e audit du 19/09/2026, voir l'en-tête de FERRY_ROUTES) : 'vehicle' (véhicule seul, chaque
  // personne paie le tarif piéton en plus), 'vehicleAndDriver', 'vehicleAndOccupants', ou null (non précisé par la
  // grille). Tarif piéton joint pour que l'interface puisse l'indiquer. Durée estimée (non publiée) et train-auto signalés.
  if(amount !== null && ferryClass !== 'foot'){
    var byClass = route.priceCoversByClass;
    info.priceCovers = (byClass && Object.prototype.hasOwnProperty.call(byClass, ferryClass)) ? byClass[ferryClass] : (route.priceCovers || null);
    var foot = route.priceByClass && route.priceByClass.foot;
    if(typeof foot === 'number') info.footAmount = foot;
  }
  if(route.durationEstimated) info.durationEstimated = true;
  if(route.mode === 'train') info.mode = 'train';
  return info;
}

// parts : partie par la route jusqu'au port puis depuis le port d'arrivée (voir ferryRoadParts), affichée à côté de la
// traversée (roadKm, roadTime) ; travelTime/distanceKm restent ceux de la traversée seule. Chaque partie passe par
// finalizeLeg comme une étape ordinaire : vitesse réduite de la moto sans autoroute, péages, recharges de la voiture
// électrique (bornes réelles entre le départ et le port, puis entre le port et l'arrivée), cumulés sur l'étape.
// PAIRE DE PORTS ÉLOIGNÉE DE LA LIGNE DE RÉFÉRENCE (15e audit du 19/09/2026). Une liaison entre deux masses terrestres
// porte UNE durée, UNE distance et UNE grille de prix (celles de sa ligne sourcée), mais ferryRoadParts peut choisir
// n'importe quelle paire de ports autorisée : Gênes → Palerme recevait « 24 min, 8 km, 43,2 € » (détroit de Messine),
// Santander → Portsmouth 1 h 30 (Douvres–Calais), Astakós → Sámi 3 h 15 et 52,90 € (Patras). Quand la paire choisie a
// une traversée à vol d'oiseau éloignée de plus de ×1,5 (et 5 km) de celle de la paire de référence (la paire dont
// l'orthodromie est la plus proche de la distance publiée), la traversée est ESTIMÉE : distance = orthodromie de la
// paire, durée = distance ÷ vitesse médiane des liaisons à durée publiée de même longueur (FERRY_MEDIAN_SPEED, calculée
// sur FERRY_ROUTES au chargement), prix inconnu. Les liaisons à une seule paire (lignes à détour, Alaska, Labrador…)
// ne sont jamais touchées : leur paire EST la référence.
var FERRY_SPEED_CLASSES = [15, 45, 100, 300, Infinity], FERRY_MEDIAN_SPEED = null;
var FERRY_PAIR_ROAD_KMH = 80;        // vitesse routière de référence pour comparer les paires de ports (voir ferryRoadParts)
var FERRY_PAIR_ROAD_MARGIN_KM = 150; // au-delà de cet écart de route, la paire la plus courte par la route reste choisie
function ferryMedianSpeed(km){
  if(!FERRY_MEDIAN_SPEED){
    var byClass = FERRY_SPEED_CLASSES.map(function(){ return []; });
    Object.keys(FERRY_ROUTES).forEach(function(k){
      var r = FERRY_ROUTES[k];
      if(!r || r.durationEstimated || r.mode === 'train' || !(r.distanceKm > 0) || !(r.durationH > 0)) return;
      var c = 0; while(r.distanceKm >= FERRY_SPEED_CLASSES[c]) c++;
      byClass[c].push(r.distanceKm / r.durationH);
    });
    var all = [].concat.apply([], byClass).sort(function(a, b){ return a - b; });
    var med = function(a){ a = a.slice().sort(function(x, y){ return x - y; }); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
    var fallback = med(all) || 20;
    FERRY_MEDIAN_SPEED = byClass.map(function(a){ return a.length >= 5 ? med(a) : fallback; });
  }
  var c = 0; while(km >= FERRY_SPEED_CLASSES[c]) c++;
  return FERRY_MEDIAN_SPEED[c];
}
function ferryRouteForPair(route, parts){
  if(!parts || !(parts.pairSeaKm > 0) || !(parts.refSeaKm > 0) || !(route.distanceKm > 0)) return route;
  var a = parts.pairSeaKm, ref = parts.refSeaKm;
  if(a <= ref * 1.5 + 5 && a * 1.5 + 5 >= ref) return route;
  var km = Math.max(1, Math.round(a));
  // Vitesse : celle de la LIGNE elle-même tant que la paire reste du même ordre (au plus le double), sinon la médiane des
  // liaisons de même longueur (16e audit du 20/09/2026). Dunkerque ↔ Douvres (73 km) recevait la médiane, soit ~3 h 30,
  // alors que la ligne de Calais roule à ~29 km/h : ~2 h 30, bien plus proche des 2 h publiées par l'exploitant.
  var lineSpeed = route.durationH > 0 ? route.distanceKm / route.durationH : 0;
  var v = (lineSpeed > 0 && a <= ref * 2 && ref <= a * 2) ? lineSpeed : ferryMedianSpeed(km);
  return Object.assign({}, route, { distanceKm: km, durationH: Math.round(km / v * 10) / 10,
    durationEstimated: true, priceByClass: null, priceStatus: 'unknown', priceCovers: null, priceCoversByClass: null, pairEstimated: true });
}
// Orthodromie de la paire de référence d'une liaison (celle dont l'orthodromie est la plus proche de la distance
// publiée), mémorisée par clé de liaison.
var FERRY_REF_SEA_CACHE = new Map();
function ferryRefSeaKm(key, ports, fromSide, toSide, publishedKm){
  var ck = key + '|' + publishedKm;
  if(FERRY_REF_SEA_CACHE.has(ck)) return FERRY_REF_SEA_CACHE.get(ck);
  var fromList = ports[fromSide], toList = ports[toSide], best = null, bestGap = Infinity;
  var consider = function(p, q){
    var d = haversineKm(p[0], p[1], q[0], q[1]), gap = Math.abs(d - publishedKm);
    if(gap < bestGap){ bestGap = gap; best = d; }
  };
  if(ports.pairs){
    var fromFirst = key.split('|')[0] === fromSide;
    ports.pairs.forEach(function(pr){
      var i = pr[fromFirst ? 0 : 1], j = pr[fromFirst ? 1 : 0];
      if(i < fromList.length && j < toList.length) consider(fromList[i], toList[j]);
    });
  } else {
    for(var i = 0; i < fromList.length; i++) for(var j = 0; j < toList.length; j++) consider(fromList[i], toList[j]);
  }
  FERRY_REF_SEA_CACHE.set(ck, best);
  return best;
}
function portWithCountry(p){ return { lat: p.lat, lon: p.lon, country: countryAtPoint(p.lat, p.lon) }; }
function finalizeFerryLeg(transportKey, route, parts, speed, tollEnabled, fromPoint, toPoint){
  var ferryClass = TRANSPORT[transportKey].ferryClass;
  route = ferryRouteForPair(route, parts);
  var leg = {
    travelTime: fmtHours(route.durationH),
    travelMin: Math.round(route.durationH * 60),
    distanceKm: route.distanceKm,
    tollInfo: null,
    chargeInfo: null,
    ferryInfo: finalizeFerryInfo(route, ferryClass)
  };
  if(!(parts && isFinite(parts.km) && parts.km >= 1 && speed > 0)) return withArrivalCharger(leg);
  var pieces = parts.fromPort
    ? [finalizeLeg(Math.round(parts.fromKm), speed, transportKey, tollEnabled, tollCountryOf(fromPoint), fromPoint, parts.fromPort),
       finalizeLeg(Math.round(parts.toKm), speed, transportKey, tollEnabled, tollCountryOf(toPoint), parts.toPort, toPoint)]
    : [finalizeLeg(Math.round(parts.km), speed, transportKey, tollEnabled, tollCountryOf(toPoint), null, null)];
  if(pieces.length === 2 && pieces[0].chargeInfo) delete pieces[0].chargeInfo.noChargerNearArrival; // arrivée = le port
  var hours = 0, toll = null, charge = null;
  pieces.forEach(function(p){
    hours += travelHoursOf(p.travelTime);
    if(p.tollInfo){
      // Montants additionnés puis arrondis UNE fois (16e audit du 20/09/2026) : deux parties déjà arrondies au dixième
      // donnaient un total incohérent avec tolledKm × tarif (2,2 € pour 28 km à 0,084 €/km), au point de faire échouer
      // l'invariant du vérificateur une fois sur ~8 900 tirages.
      toll = toll ? Object.assign({}, toll, { amount: Math.round((toll.amountExact + p.tollInfo.amountExact) * 10) / 10,
        amountExact: toll.amountExact + p.tollInfo.amountExact,
        amountMax: Math.round(((toll.amountMaxExact || 0) + (p.tollInfo.amountMaxExact || 0)) * 10) / 10, // fourchette : bornes additionnées
        amountMaxExact: (toll.amountMaxExact || 0) + (p.tollInfo.amountMaxExact || 0),
        amountMin: Math.round(((toll.amountMinExact || 0) + (p.tollInfo.amountMinExact || 0)) * 10) / 10,
        amountMinExact: (toll.amountMinExact || 0) + (p.tollInfo.amountMinExact || 0),
        tolledKmMin: (toll.tolledKmMin || 0) + (p.tollInfo.tolledKmMin || 0),
        tolledKm: (toll.tolledKm || 0) + (p.tollInfo.tolledKm || 0), // les deux parties routières de l'étape s'additionnent
        countries: toll.countries.concat(p.tollInfo.countries.filter(function(c){ return toll.countries.indexOf(c) < 0; })) }) : Object.assign({}, p.tollInfo);
    }
    if(p.chargeInfo){
      charge = charge ? { stops: charge.stops + p.chargeInfo.stops, minutes: charge.minutes + p.chargeInfo.minutes,
        real: charge.real && p.chargeInfo.real, stations: (charge.stations || []).concat(p.chargeInfo.stations || []),
        noChargerNearArrival: !!(charge.noChargerNearArrival || p.chargeInfo.noChargerNearArrival) } : Object.assign({}, p.chargeInfo);
    }
  });
  if(charge && !charge.stops && !charge.noChargerNearArrival) charge = null;
  // Pays traversés par les parties routières (12e audit du 19/09/2026) : Stuttgart → Sardaigne par Gênes traverse la
  // Suisse, Bratislava → Sicile par Livourne l'Autriche et la Slovénie — sans rappel de vignette. Le port n'a pas de pays :
  // celui du lieu habité le plus proche.
  if(transportKey !== 'velo' && parts.fromPort){
    var crossed = countriesAlong(fromPoint, portWithCountry(parts.fromPort));
    countriesAlong(portWithCountry(parts.toPort), toPoint).forEach(function(cc){ if(crossed.indexOf(cc) < 0) crossed.push(cc); });
    leg.countriesCrossed = crossed;
  }
  leg.roadKm = Math.round(parts.km);
  leg.roadTime = fmtHours(hours);
  leg.roadMin = Math.round(hours * 60);
  leg.tollInfo = toll;
  leg.chargeInfo = charge;
  return withArrivalCharger(leg);
  // Voiture électrique : « aucune borne près de l'arrivée » vérifié pour TOUTE étape avec traversée (10e audit, trouvé
  // par la suite de tests). Sans partie routière (arrivée au port même, parts.km < 1) ou sans ports connus (partie
  // routière calculée sans extrémités), finalizeLeg ne voyait pas l'arrivée et l'avertissement manquait (Naha).
  function withArrivalCharger(l){
    if(TRANSPORT[transportKey].electric && toPoint && CHARGERS_BY_CELL && !chargerNear(toPoint.lat, toPoint.lon, CHARGER_NEAR_STOP_KM)){
      l.chargeInfo = l.chargeInfo || { stops: 0, minutes: 0, real: true };
      l.chargeInfo.noChargerNearArrival = true;
    }
    return l;
  }
}

function diversityGroup(type){ return POI_DIVERSITY_GROUP[type] || type; }

// Raccourci pour les noms en ASCII (la grande majorité des ~4 millions de lieux) : la décomposition NFD et
// le retrait des diacritiques n'y changent rien, seul le coût de normalize() est évité.
var ASCII_RE = /^[\x00-\x7f]*$/;
function normalizeCityName(s){
  s = String(s||'');
  if(ASCII_RE.test(s)) return s.trim().toLowerCase().replace(SEP_RE,' ').replace(/\s+/g,' ').trim();
  return s.trim().toLowerCase()
    .normalize('NFD').replace(DIACRITICS_RE,'').replace(INVISIBLE_RE,'')
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
// Écritures idéographiques (hanzi/kanji, kana, hangeul) : un nom complet y tient souvent en DEUX caractères
// (北京, 東京, 서울 en a deux aussi), trop court pour l'index à 3 caractères. Ces noms et alias sont donc aussi
// rangés sous leurs 2 premiers caractères, et une recherche de 2 caractères idéographiques y est autorisée.
var IDEOGRAPHIC_RE = /^[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uf900-\ufaff]{2}/;
var SHORT_IDEOGRAPHIC_INDEX = null;
function buildSearchIndex(){
  NAME_INDEX = new Map();
  CP_INDEX = new Map();
  ALIAS_INDEX = new Map();
  function addTo(map, key, entry){
    var bucket = map.get(key);
    if(!bucket){ bucket = []; map.set(key, bucket); }
    bucket.push(entry);
  }
  SHORT_IDEOGRAPHIC_INDEX = new Map();
  COMMUNES.forEach(function(c){
    addTo(NAME_INDEX, searchIndexPrefix(c.norm), c);
    if(IDEOGRAPHIC_RE.test(c.norm)) addTo(SHORT_IDEOGRAPHIC_INDEX, c.norm.slice(0, 2), { commune: c });
    c.cps.forEach(function(cp){
      addTo(CP_INDEX, searchIndexPrefix(cp.toLowerCase()), { commune:c, cp:cp });
    });
  });
  addAliasesToSearchIndex(ALIASES || []);
}
// Alias ajoutés à l'index APRÈS l'ouverture de la recherche (voir init) : pendant quelques secondes au démarrage,
// seuls les noms principaux et les codes postaux sont trouvés.
function addAliasesToSearchIndex(aliases){
  function addTo(map, key, entry){
    var bucket = map.get(key);
    if(!bucket){ bucket = []; map.set(key, bucket); }
    bucket.push(entry);
  }
  aliases.forEach(function(a){
    addTo(ALIAS_INDEX, searchIndexPrefix(a.norm), a);
    if(IDEOGRAPHIC_RE.test(a.norm)) addTo(SHORT_IDEOGRAPHIC_INDEX, a.norm.slice(0, 2), a);
  });
}

// preferCountry : pays dont les lieux passent en tête (langue d'interface) sans exclure les autres — même partage
// que l'index disque (mergePreferred, lib/search-index.js).
// lang : langue d'interface, pour choisir le nom alternatif affiché (même règle que l'index disque).
function searchCommunes(query, limit, preferCountry, lang){
  var q = normalizeCityName(query);
  function byPop(a, b){ return b.pop - a.pop; }
  var SI = require('./search-index.js');
  var rawQuery = String(query).trim().toLowerCase();
  function finish(list){
    list.forEach(function(m){ var pn = m._placeNorm; delete m._placeNorm; SI.finishAlias(m, pn); });
    list.sort(byPop);
    if(!preferCountry) return list.slice(0, limit);
    return require('./search-index.js').mergePreferred(
      list.filter(function(m){ return m.country === preferCountry; }).slice(0, limit),
      list.filter(function(m){ return m.country !== preferCountry; }).slice(0, limit), limit);
  }
  var matches = [];
  var seenKeys = {};
  if(q.length === 2 && IDEOGRAPHIC_RE.test(q)){
    // Entrées de nom ({ commune }) et d'alias ({ commune, text, lang… }) : un alias donne son nom en matchedName.
    (SHORT_IDEOGRAPHIC_INDEX.get(q) || []).forEach(function(e){
      pushMatch(e.commune, e.commune.cps[0], e.text ? e : null);
    });
    return finish(matches);
  }
  if(q.length < SEARCH_PREFIX_LEN) return [];
  var qp = searchIndexPrefix(q);
  // alias : nom alternatif qui a correspondu (absent pour un nom ou un code) — renvoyé en matchedName.
  function pushMatch(c, cp, alias){
    var key = c.country + '|' + c.norm + '|' + cp;
    var prev = seenKeys[key];
    if(prev){
      // Même choix que l'index disque (aliasScore) ; un lieu retenu par son nom ou son code n'a pas de parenthèse.
      if(alias && prev._alias) SI.offerAlias(prev, alias.text, alias.norm, alias.lang, rawQuery, q, lang);
      return;
    }
    var m = {name:c.name, cp:cp, allCps:c.cps, pop:c.pop, lat:c.lat, lon:c.lon, dept:c.dept, country:c.country, _placeNorm:c.norm};
    if(alias) SI.offerAlias(m, alias.text, alias.norm, alias.lang, rawQuery, q, lang);
    seenKeys[key] = m;
    matches.push(m);
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
    if(a.norm.indexOf(q) === 0) pushMatch(a.commune, a.commune.cps[0], a);
  });
  return finish(matches);
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
// Colonnes de la grille bouclées autour de l'antiméridien : colonne -900 (-180°) voisine de la colonne 899 (179,8°) ; un
// lieu à 180° exactement (deux hameaux des Fidji) est rangé en colonne -900.
var GRID_COLS = Math.round(360 / GRID_CELL_DEG), GRID_HALF_COLS = GRID_COLS / 2;
function wrapGridCol(cy){ return ((cy + GRID_HALF_COLS) % GRID_COLS + GRID_COLS) % GRID_COLS - GRID_HALF_COLS; }
function gridKey(lat, lon){
  return Math.floor(lat/GRID_CELL_DEG) + '_' + wrapGridCol(Math.floor(lon/GRID_CELL_DEG));
}
// Cases numérotées (entier) et pays présents dans chaque case, plus la liste des cases de chaque pays.
var COUNTRIES_BY_CELL = null, CELLS_BY_COUNTRY = null, BORDER_REACH_CACHE = {};
function cellNum(cx, cy){ return (cx + 1000) * 4000 + (cy + 2000); }
function buildCommuneGrid(){
  COMMUNE_GRID = {};
  COUNTRIES_BY_CELL = new Map();
  CELLS_BY_COUNTRY = {};
  BORDER_REACH_CACHE = {};
  COMMUNES.forEach(function(c){
    var k = gridKey(c.lat, c.lon);
    (COMMUNE_GRID[k] = COMMUNE_GRID[k] || []).push(c);
    var cx = Math.floor(c.lat/GRID_CELL_DEG), cy = wrapGridCol(Math.floor(c.lon/GRID_CELL_DEG)), n = cellNum(cx, cy);
    var set = COUNTRIES_BY_CELL.get(n);
    if(!set){ set = {}; COUNTRIES_BY_CELL.set(n, set); }
    if(!set[c.country]){ set[c.country] = true; (CELLS_BY_COUNTRY[c.country] = CELLS_BY_COUNTRY[c.country] || []).push(cx, cy); }
  });
}
// Pays du lieu habité le plus proche d'un point : dans sa case de la grille des lieux (0,2°, ~22 km), ou à défaut dans
// les 8 cases voisines ; null si aucun lieu autour. Sert au péage (voir lib/toll-grid.js, 8e audit du 18/09/2026) :
// un point de Genève doit être facturé au barème suisse — c'est-à-dire pas du tout — et non au barème français de
// l'autoroute située de l'autre côté de la frontière.
// Point franchement à l'intérieur d'un pays : sa case de la grille des lieux et les 8 voisines (~65 km de côté) ne
// contiennent des lieux que de ce pays, et au moins un. Sert au péage des pays seulement traversés (lib/toll-grid.js).
function insideCountry(lat, lon, country){
  if(!COUNTRIES_BY_CELL) return false;
  var cx = Math.floor(lat / GRID_CELL_DEG), cy = Math.floor(lon / GRID_CELL_DEG), found = false;
  for(var dx = -1; dx <= 1; dx++){
    for(var dy = -1; dy <= 1; dy++){
      var set = COUNTRIES_BY_CELL.get(cellNum(cx + dx, wrapGridCol(cy + dy)));
      if(!set) continue;
      for(var k in set){ if(k !== country) return false; found = true; }
    }
  }
  return found;
}
function countriesAlong(from, to){
  var km = haversineKm(from.lat, from.lon, to.lat, to.lon);
  var n = Math.max(4, Math.min(200, Math.round(km * ROAD_FACTOR / 10)));
  var pts = [];
  for(var i = 0; i < n; i++){
    var f = (i + 0.5) / n, lat = from.lat + (to.lat - from.lat) * f, lon = from.lon + (to.lon - from.lon) * f;
    pts.push({ lat: lat, lon: lon, cc: countryAtPoint(lat, lon) });
  }
  var ends = {};
  [from.country, to.country].forEach(function(c){ if(c) ends[c] = true; });
  var out = Object.keys(ends), minPts = Math.ceil(30 / (km * ROAD_FACTOR / n));
  for(var a = 0; a < n; ){
    var b = a;
    while(b < n && pts[b].cc === pts[a].cc) b++;
    var c = pts[a].cc;
    if(c && !ends[c] && out.indexOf(c) < 0 && b - a >= minPts){
      for(var k = a; k < b; k++){ if(insideCountry(pts[k].lat, pts[k].lon, c)){ out.push(c); break; } }
    }
    a = b;
  }
  return out;
}
function countryAtPoint(lat, lon){
  if(!COMMUNE_GRID) return null;
  var cx = Math.floor(lat / GRID_CELL_DEG), cy = Math.floor(lon / GRID_CELL_DEG);
  var kx = Math.cos(lat * Math.PI / 180);
  function nearestIn(list, best){
    for(var i = 0; i < list.length; i++){
      var c = list[i], dLat = c.lat - lat, dLon = (c.lon - lon) * kx, d = dLat * dLat + dLon * dLon;
      if(d < best.d){ best.d = d; best.country = c.country; }
    }
    return best;
  }
  var best = { d: Infinity, country: null };
  var ici = COMMUNE_GRID[cx + '_' + wrapGridCol(cy)];
  if(ici) return nearestIn(ici, best).country;
  for(var dx = -1; dx <= 1; dx++){
    for(var dy = -1; dy <= 1; dy++){
      var list = COMMUNE_GRID[(cx + dx) + '_' + wrapGridCol(cy + dy)];
      if(list) nearestIn(list, best);
    }
  }
  return best.country;
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

// ---------------------------------------------------------------------------------------------
// DISTANCE MAX ENTRE ÉTAPES ET BORNES DE RECHARGE (septembre 2026)
// ---------------------------------------------------------------------------------------------
// Contraintes du tirage en cours, posées par generateTrip (même principe qu'AVOID_TENSION) :
//   maxLegKm  distance routière maximale d'un trajet entre deux étapes (et du retour) — 80 km par défaut à vélo,
//             400 km pour les autres modes, réglable dans le formulaire. Une traversée en ferry n'y est pas soumise.
//   electric  voiture électrique : un trajet plus long que l'autonomie utile n'est retenu que s'il existe une suite de
//             bornes RÉELLES (Open Charge Map) le long de l'itinéraire (voir evPlan).
var LEG_CONSTRAINTS = { maxLegKm: 0, electric: false, ferryEnabled: true };
// Raison d'un tirage vide détectée par buildItinerary (distance d'éloignement impossible à concilier avec le retour),
// renvoyée au client par generateTrip.
var LAST_TRIP_DIAGNOSTIC = null;
// BUDGET DE TEMPS d'un tirage (audit de septembre 2026) : certains départs (Nuuk ou Moscou à 3 000 km d'éloignement,
// Caïmans à 30 km max entre étapes…) enchaînaient des centaines d'échecs de chemin par la terre (A*) et bloquaient le
// process 20 à 107 s — moteur synchrone, donc tous les visiteurs. Au-delà de TRIP_TIME_BUDGET_MS depuis l'entrée de
// generateTrip, plus aucun candidat n'est tiré, les essais suivants ne sont pas lancés et un chemin par la terre non encore
// trouvé compte comme absent (trajet refusé) : on renvoie l'itinéraire s'il est déjà valide, sinon un tirage vide marqué
// timedOut. TRIP_DEADLINE = 0 hors tirage. 4 s : le pire tirage légitime mesuré en local (Tokyo, électrique, 21 jours)
// prend ~2,4 s, et l'hébergement est environ deux fois plus lent ; le plafond global du serveur (CPU_BUDGETS) borne les rafales.
var TRIP_TIME_BUDGET_MS = 4000;
// Aller-retour dans la journée : au plus 9 h de trajet au total (aller + retour, traversées comprises). C'est la durée
// de conduite journalière maximale du règlement (CE) n° 561/2006, article 6 (« La durée de conduite journalière ne
// dépasse pas neuf heures ») — écrit pour les conducteurs professionnels, seule borne réglementaire publiée. 11e audit du
// 19/09/2026 : sans borne, 75 allers-retours sur 260 dépassaient 12 h, jusqu'à 110 h (Severn → Sarnia à vélo).
var DAY_TRIP_MAX_HOURS = 9;
var MIN_DIST_RETRIES = 2; // nouveaux essais avant d'annoncer « éloignement introuvable » (voir runTrip)
var TRIP_DEADLINE = 0, TRIP_TIMED_OUT = false;
function tripTimeUp(){
  if(!TRIP_DEADLINE) return false;
  if(!TRIP_TIMED_OUT && Date.now() > TRIP_DEADLINE) TRIP_TIMED_OUT = true;
  return TRIP_TIMED_OUT;
}
// Bornes : cases de 0,25° -> [lat, lon, lat, lon…] ; null tant que data/charging-stations.txt n'est pas chargé (repli
// sur l'estimation par l'autonomie seule, signalé sur l'étape).
var CHARGER_CELL_DEG = 0.25;
var CHARGERS_BY_CELL = null, CHARGER_COUNT = 0;
// Écart maximal entre une borne et la ligne directe du trajet pour qu'elle serve d'arrêt (détour raisonnable).
var CHARGER_CORRIDOR_KM = 15;
// Borne « proche » d'une étape : recharge possible en arrivant ou pour repartir plein.
var CHARGER_NEAR_STOP_KM = 20;

function loadChargingStations(raw){
  var byCell = new Map(), n = 0, pos = 0;
  while(pos < raw.length){
    var nl = raw.indexOf('\n', pos); if(nl < 0) nl = raw.length;
    var comma = raw.indexOf(',', pos);
    if(comma > pos && comma < nl){
      var lat = parseFloat(raw.slice(pos, comma)), lon = parseFloat(raw.slice(comma + 1, nl));
      if(isFinite(lat) && isFinite(lon)){
        var key = Math.floor(lat / CHARGER_CELL_DEG) * 10000 + Math.floor(lon / CHARGER_CELL_DEG);
        var arr = byCell.get(key); if(!arr) byCell.set(key, arr = []);
        arr.push(lat, lon); n++;
      }
    }
    pos = nl + 1;
  }
  CHARGERS_BY_CELL = byCell; CHARGER_COUNT = n;
  return n;
}
// Bornes à moins de km d'un point : appelle fn(lat, lon, distanceKm).
function eachChargerNear(lat, lon, km, fn){
  if(!CHARGERS_BY_CELL) return;
  var dLat = km / 111, dLon = km / Math.max(111 * Math.cos(lat * Math.PI / 180), 5);
  var x0 = Math.floor((lat - dLat) / CHARGER_CELL_DEG), x1 = Math.floor((lat + dLat) / CHARGER_CELL_DEG);
  var y0 = Math.floor((lon - dLon) / CHARGER_CELL_DEG), y1 = Math.floor((lon + dLon) / CHARGER_CELL_DEG);
  var cols = Math.round(360 / CHARGER_CELL_DEG), half = cols / 2;
  if(y1 - y0 + 1 >= cols){ y0 = -half; y1 = half - 1; }
  for(var x = x0; x <= x1; x++) for(var yy = y0; yy <= y1; yy++){
    var y = ((yy + half) % cols + cols) % cols - half; // colonnes bouclées autour de ±180°
    var arr = CHARGERS_BY_CELL.get(x * 10000 + y);
    if(!arr) continue;
    for(var i = 0; i < arr.length; i += 2){
      var d = haversineKm(lat, lon, arr[i], arr[i + 1]);
      if(d <= km) fn(arr[i], arr[i + 1], d);
    }
  }
}
function chargerNear(lat, lon, km){
  var found = false;
  if(!CHARGERS_BY_CELL) return false;
  eachChargerNear(lat, lon, km, function(){ found = true; });
  return found;
}
// Distance (km) d'un point à un segment, en projection locale équirectangulaire (suffisant sous quelques centaines de km).
function distToSegmentKm(pLat, pLon, aLat, aLon, bLat, bLon){
  var k = Math.cos(((aLat + bLat) / 2) * Math.PI / 180) * 111, K = 111;
  var ax = aLon * k, ay = aLat * K, bx = bLon * k, by = bLat * K, px = pLon * k, py = pLat * K;
  var dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  var t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  var qx = ax + t * dx - px, qy = ay + t * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}
// Plan de recharge d'un trajet A -> B en partant batterie pleine : [] si l'autonomie utile suffit, liste des bornes
// d'arrêt sinon (à chaque arrêt : la borne du couloir la plus proche de B encore atteignable), null si une portion du
// trajet n'a aucune borne connue à portée. Autonomie utile = EV_RANGE_KM × EV_CHARGE_MARGIN, en distance ROUTIÈRE.
var EV_PLAN_CACHE = new Map();
var EV_SAMPLE_KM = 10;
function evPlan(aLat, aLon, bLat, bLon){
  var reach = EV_RANGE_KM * EV_CHARGE_MARGIN / ROAD_FACTOR; // en vol d'oiseau
  var total = haversineKm(aLat, aLon, bLat, bLon);
  if(total <= reach) return [];
  if(!CHARGERS_BY_CELL) return null;
  var cacheKey = aLat.toFixed(3) + ',' + aLon.toFixed(3) + '>' + bLat.toFixed(3) + ',' + bLon.toFixed(3);
  if(EV_PLAN_CACHE.has(cacheKey)) return EV_PLAN_CACHE.get(cacheKey);
  // Points de la ligne directe tous les EV_SAMPLE_KM ; pour chacun, la borne la plus proche dans le couloir (recherche
  // locale de CHARGER_CORRIDOR_KM, quelques cases seulement). Puis parcours glouton : depuis la position courante, on
  // s'arrête à la borne du point le plus avancé encore atteignable. Bien plus rapide qu'un balayage de toutes les bornes
  // dans un rayon d'autonomie (≈ 200 km), qui rendait un tirage électrique de plusieurs dizaines de secondes.
  var n = Math.ceil(total / EV_SAMPLE_KM), samples = [];
  // Longitude interpolée par le plus court côté, ramenée dans [-180, 180[ (trajet à travers l'antiméridien).
  var dLonAB = bLon - aLon; if(dLonAB > 180) dLonAB -= 360; else if(dLonAB < -180) dLonAB += 360;
  for(var si = 1; si < n; si++){
    var f = si / n, sLat = aLat + (bLat - aLat) * f, sLon = aLon + dLonAB * f;
    if(sLon >= 180) sLon -= 360; else if(sLon < -180) sLon += 360;
    var near = null, nearD = CHARGER_CORRIDOR_KM;
    eachChargerNear(sLat, sLon, CHARGER_CORRIDOR_KM, function(lat, lon, d){ if(d <= nearD){ near = [lat, lon]; nearD = d; } });
    if(near) samples.push({ along: f * total, charger: near });
  }
  var stops = [], pos = 0, posLat = aLat, posLon = aLon, plan = null, guard = 0;
  for(;;){
    if(haversineKm(posLat, posLon, bLat, bLon) <= reach){ plan = stops; break; }
    if(++guard > 60) break;
    var next = null;
    for(var k = 0; k < samples.length; k++){
      var s = samples[k];
      if(s.along <= pos + 20) continue; // progresser d'au moins 20 km
      if(haversineKm(posLat, posLon, s.charger[0], s.charger[1]) > reach) break;
      next = s;
    }
    if(!next) break;
    stops.push(next.charger); pos = next.along; posLat = next.charger[0]; posLon = next.charger[1];
  }
  if(EV_PLAN_CACHE.size > 20000) EV_PLAN_CACHE.clear();
  EV_PLAN_CACHE.set(cacheKey, plan);
  return plan;
}
// Un trajet d'étape est-il permis ? from = { lat, lon, landmass, zone }, to = lieu. Les traversées (ferry, zones) ne sont
// pas soumises à la distance ni aux bornes.
// to : un lieu, ou un point dont la masse terrestre et la zone sont déjà connues ({ lat, lon, landmass, zone }).
// Partie par la route d'un trajet avec traversée : du point de départ à un port de sa rive, plus d'un port de l'autre rive
// jusqu'à l'arrivée (FERRY_PORTS, lib/ferry-ports.js, construit par scripts/build-ferry-ports.js), au plus court. Quand la
// liaison précise les paires de ports réellement desservies (pairs, indices dans l'ordre des rives de la clé), seules ces
// paires sont envisagées ; sinon tous les ports d'une rive sont supposés reliés à tous ceux de l'autre. Un port est son quai
// OpenStreetMap quand il est connu, sinon le centre de sa localité. Renvoie { km, fromPort, toPort, fromKm, toKm } ;
// liaison sans ports connus : km estimé par la distance à vol d'oiseau moins la traversée (sous-estime la partie
// terrestre), fromPort/toPort null. Sans allocation par appel (appelée pour des milliers de candidats par tirage).
// Ports de ferry (lib/ferry-ports.js) : réservés au serveur, jamais livrés au navigateur (contrairement à trip-data.js).
// Absent (premier lancement de scripts/build-ferry-ports.js, qui charge ce moteur) : estimation sans ports.
let FERRY_PORTS = {};
try { FERRY_PORTS = require('./ferry-ports.js'); } catch(e){ if(e.code !== 'MODULE_NOT_FOUND') throw e; }
// Grille terre/eau (lib/land-grid.js, Natural Earth) : un trajet PAR LA ROUTE dont le trait à vol d'oiseau passe au moins
// WATER_CHECK_KM d'affilée sur l'eau n'est accepté que si un chemin par la terre d'au plus WATER_DETOUR fois la distance
// existe sur la grille (détroits et estuaires étroits, ponts longs de FIXED_LINKS compris). Sans ce contrôle, deux pays de la
// même masse terrestre étaient reliés à travers la mer (Split → Pescara, Tallinn → Helsinki, Basse-Californie → Sonora,
// Buenos Aires → Colonia) : 14 % des voyages mesurés le 17/09/2026 contenaient une telle étape.
var landGrid = require('./land-grid.js');
// Voies à péage réelles (OpenStreetMap) : voir lib/toll-grid.js et finalizeLeg.
var tollGrid = require('./toll-grid.js');
var WATER_CHECK_KM = 25, WATER_DETOUR = 1.8;
function roadCrossesWater(from, to){
  var km = haversineKm(from.lat, from.lon, to.lat, to.lon);
  if(km < WATER_CHECK_KM) return false;
  if(landGrid.waterRunKm(from.lat, from.lon, to.lat, to.lon, km, WATER_CHECK_KM) < WATER_CHECK_KM &&
     !landGrid.crossesBarrier(from.lat, from.lon, to.lat, to.lon)) return false; // barrière : Kvarken (chapelet d'îles sans route)
  // Budget de temps du tirage épuisé : chemin non trouvé = traversée présumée (trajet refusé, jamais accepté par défaut).
  return !isFinite(landGrid.landPathKm(from.lat, from.lon, to.lat, to.lon, km * WATER_DETOUR, TRIP_DEADLINE));
}
var FERRY_D_FROM = new Float64Array(64), FERRY_D_TO = new Float64Array(64);
function ferryRoadParts(from, to, fromSide, toSide, ferry){
  var key = landmassKey(fromSide, toSide);
  var ports = FERRY_PORTS[key];
  var fromList = ports && ports[fromSide], toList = ports && ports[toSide];
  if(fromList && toList && fromList.length && toList.length && fromList.length <= 64 && toList.length <= 64){
    var i, j, bi = -1, bj = -1, best = Infinity;
    for(i = 0; i < fromList.length; i++) FERRY_D_FROM[i] = roadDistanceKm(from.lat, from.lon, fromList[i][0], fromList[i][1]);
    for(j = 0; j < toList.length; j++) FERRY_D_TO[j] = roadDistanceKm(to.lat, to.lon, toList[j][0], toList[j][1]);
    // Paire choisie sur le TEMPS TOTAL, route et traversée comprises (16e audit du 20/09/2026) : depuis que chaque paire
    // porte sa propre durée (ferryRouteForPair), gagner 20 km de route pouvait coûter des heures de mer — Reggio Calabria
    // prenait une traversée de 284 km (10 h 42) au lieu du détroit de Messine (8 km, 24 min) ; relevé sur 17 couples
    // (Malte, Åland, Baléares, Samos…). Vitesse routière de référence : celle du mode, sans facteur pays (comparaison
    // entre paires d'une même étape, le facteur serait le même pour toutes ; FERRY_PAIR_ROAD_KMH sert aussi de garde-fou
    // quand la vitesse du mode est nulle).
    var seaHours = function(pi, pj){
      var d = haversineKm(fromList[pi][0], fromList[pi][1], toList[pj][0], toList[pj][1]);
      var refD = refSeaKmFor(), lineSpeed = ferry.durationH > 0 && ferry.distanceKm > 0 ? ferry.distanceKm / ferry.durationH : 0;
      if(!(refD > 0) || (d <= refD * 1.5 + 5 && d * 1.5 + 5 >= refD)) return ferry.durationH > 0 ? ferry.durationH : d / ferryMedianSpeed(d);
      var v = (lineSpeed > 0 && d <= refD * 2 && refD <= d * 2) ? lineSpeed : ferryMedianSpeed(d);
      return d / v;
    };
    var roadKmh = FERRY_PAIR_ROAD_KMH;
    var roadKmOf = function(pi, pj){ return FERRY_D_FROM[pi] + FERRY_D_TO[pj]; };
    var totalHours = function(pi, pj){ return roadKmOf(pi, pj) / roadKmh + seaHours(pi, pj); };
    var refSeaKmFor = function(){ return (fromList.length > 1 || toList.length > 1) && Number(ferry.distanceKm) > 0 ? ferryRefSeaKm(key, ports, fromSide, toSide, Number(ferry.distanceKm)) : 0; };
    // Le temps total ne départage que des paires DE ROUTE COMPARABLE (au plus FERRY_PAIR_ROAD_MARGIN_KM de plus que la
    // plus courte) : sinon le moteur remplacerait une traversée par des centaines de kilomètres de route (Gênes → Palerme
    // deviendrait 1 100 km jusqu'au détroit de Messine). Sur le reste, la route la plus courte décide, comme avant.
    var cand = [];
    if(ports.pairs){
      var fromFirst = key.split('|')[0] === fromSide;
      for(var k = 0; k < ports.pairs.length; k++){
        var pi = ports.pairs[k][fromFirst ? 0 : 1], pj = ports.pairs[k][fromFirst ? 1 : 0];
        if(!(pi < fromList.length && pj < toList.length)) continue; // donnée incohérente : paire ignorée
        cand.push([pi, pj]);
      }
    } else {
      for(i = 0; i < fromList.length; i++) for(j = 0; j < toList.length; j++) cand.push([i, j]);
    }
    var minRoad = Infinity;
    cand.forEach(function(c){ var r = roadKmOf(c[0], c[1]); if(r < minRoad) minRoad = r; });
    var bestH = Infinity;
    cand.forEach(function(c){
      if(roadKmOf(c[0], c[1]) > minRoad + FERRY_PAIR_ROAD_MARGIN_KM) return;
      var h = totalHours(c[0], c[1]);
      if(h < bestH){ bestH = h; bi = c[0]; bj = c[1]; }
    });
    best = bi >= 0 ? roadKmOf(bi, bj) : Infinity;
    if(bi >= 0 && bj >= 0 && isFinite(best)){
      // Traversée de la paire choisie et de la paire de référence (15e audit, voir ferryRouteForPair).
      var pairSeaKm = haversineKm(fromList[bi][0], fromList[bi][1], toList[bj][0], toList[bj][1]);
      var refSeaKm = (fromList.length > 1 || toList.length > 1) && Number(ferry.distanceKm) > 0 ? ferryRefSeaKm(key, ports, fromSide, toSide, Number(ferry.distanceKm)) : null;
      return { km: best, fromPort: { lat: fromList[bi][0], lon: fromList[bi][1] }, toPort: { lat: toList[bj][0], lon: toList[bj][1] },
        fromKm: FERRY_D_FROM[bi], toKm: FERRY_D_TO[bj], pairSeaKm: pairSeaKm, refSeaKm: refSeaKm };
    }
  }
  return { km: Math.max(0, haversineKm(from.lat, from.lon, to.lat, to.lon) - (Number(ferry.distanceKm) || 0)) * ROAD_FACTOR,
    fromPort: null, toPort: null, fromKm: 0, toKm: 0 };
}
// Zone (pays, ou Ceuta/Melilla/Kaliningrad) d'un port de la rive « side » d'une liaison entre masses terrestres : les ports
// n'ont pas de pays, on prend celle du lieu de cette masse terrestre le plus proche (moins de PORT_ZONE_KM), mémorisée.
// null si aucun lieu : contrôle de frontière laissé de côté pour ce port.
var PORT_ZONE_KM = 40, PORT_ZONE_CACHE = new Map();
function portZone(port, side){
  var cacheKey = side + '@' + port.lat + ',' + port.lon;
  if(PORT_ZONE_CACHE.has(cacheKey)) return PORT_ZONE_CACHE.get(cacheKey);
  var span = Math.ceil(PORT_ZONE_KM / (GRID_CELL_DEG * Math.max(111 * Math.cos(port.lat * Math.PI / 180), 20))) + 1;
  var latSpan = Math.ceil(PORT_ZONE_KM / (GRID_CELL_DEG * 111)) + 1;
  var cx = Math.floor(port.lat / GRID_CELL_DEG), cy = Math.floor(port.lon / GRID_CELL_DEG);
  var best = null, bestD = PORT_ZONE_KM;
  for(var dx = -latSpan; dx <= latSpan; dx++) for(var dy = -span; dy <= span; dy++){
    var list = COMMUNE_GRID[(cx + dx) + '_' + wrapGridCol(cy + dy)];
    if(!list) continue;
    for(var i = 0; i < list.length; i++){
      var d = haversineKm(port.lat, port.lon, list[i].lat, list[i].lon);
      if(d < bestD && communeLandmass(list[i]) === side){ best = list[i]; bestD = d; }
    }
  }
  var zone = best ? zoneOf(best) : null;
  PORT_ZONE_CACHE.set(cacheKey, zone);
  return zone;
}
// extraCapKm : premier trajet d'un séjour avec « distance d'éloignement » renseignée (et retour d'un séjour à une seule
// étape) — choix de l'utilisateur : ce trajet peut prendre plus d'éloignement que la distance max entre étapes, mais
// jusqu'à max(maxLegKm, extraCapKm) seulement (appelants : distance d'éloignement × 1,4). Sans borne, un vélo réglé à
// 80 km entre étapes et 30 km d'éloignement pouvait faire un premier trajet de 2 922 km. Les bornes restent exigées.
// skipEv : ne pas vérifier les bornes (filtre de masse sur des milliers de candidats) — voir evLegOk, appliqué au tirage.
// Une traversée peut-elle partir de ce point en respectant capKm pour sa partie routière ? Vrai s'il existe une liaison
// (entre masses terrestres ou entre zones) dont un port de la rive de départ est à moins de capKm par la route, ou dont
// les ports ne sont pas connus (partie routière estimée autrement, voir ferryRoadParts). Voir strictPossible.
// 10e audit du 18/09/2026 : la version du 9e audit testait seulement « cette masse terrestre a des liaisons » — vrai pour
// tout le continent (253 liaisons), si bien que la passe stricte, censée ne servir qu'aux départs proches d'un port,
// tournait partout pour rien et faisait échouer des tirages faute de temps (16 sur 50 au lieu de 1 sur 50).
function ferryPossibleFrom(lat, lon, landmass, zone, capKm){
  if(!LEG_CONSTRAINTS.ferryEnabled) return false;
  var lists = [crossingsFrom(landmass, false), crossingsFrom(zone, true)];
  for(var l = 0; l < lists.length; l++){
    for(var i = 0; i < lists[l].length; i++){
      var ports = lists[l][i].ports;
      if(!ports) return true;
      for(var p = 0; p < ports.length; p++){
        if(roadDistanceKm(lat, lon, ports[p][0], ports[p][1]) <= capKm) return true;
      }
    }
  }
  return false;
}
function legCapKm(extraCapKm){
  var cap = LEG_CONSTRAINTS.maxLegKm;
  return (cap && extraCapKm > cap) ? extraCapKm : cap;
}
function legAllowed(from, to, extraCapKm, skipEv){
  var toLandmass = to.landmass !== undefined ? to.landmass : landmassOf(to);
  var toZone = to.zone !== undefined ? to.zone : zoneOf(to);
  var sea = from.zone && seaCrossingFor(from.zone, toZone);
  var ferry = sea || (toLandmass !== from.landmass && ferryRouteFor(from.landmass, toLandmass));
  var cap = legCapKm(extraCapKm);
  if(ferry){
    if(!LEG_CONSTRAINTS.ferryEnabled) return false; // ferries décochés : aucune traversée, même pour le retour
    // Trajet avec traversée : la partie par la route (jusqu'au port de départ, puis depuis le port d'arrivée) compte
    // aussi dans le maximum entre étapes — sans ça, tout lieu de l'autre rive était accepté (à vélo : Sapporo →
    // Yokohama, Lyon → Corse).
    // Voiture électrique : chaque partie routière (jusqu'au port, depuis le port) doit être faisable avec les bornes.
    if(cap || !skipEv){
      var fromSide = sea ? from.zone : from.landmass, toSide = sea ? toZone : toLandmass;
      var parts = ferryRoadParts(from, to, fromSide, toSide, ferry);
      if(cap && !(parts.km <= cap)) return false; // NaN refusé
      if(!skipEv && parts.fromPort){
        // Parties par la route contrôlées comme un trajet ordinaire (audit de septembre 2026) : sans ça, Crète → ferry →
        // Le Pirée → Italie roulait 830 km à travers l'Adriatique, et Baabda (Liban) → port de Taşucu (Turquie) passait
        // une frontière inexistante. Zone d'un port : voir portZone (liaison entre zones : la rive est la zone).
        if(from.zone && !reallyAdjacent(from.zone, sea ? fromSide : portZone(parts.fromPort, fromSide))) return false;
        if(!reallyAdjacent(sea ? toSide : portZone(parts.toPort, toSide), toZone)) return false;
        if(roadCrossesWater(from, parts.fromPort) || roadCrossesWater(parts.toPort, to)) return false;
        if(LEG_CONSTRAINTS.electric && (evPlan(from.lat, from.lon, parts.fromPort.lat, parts.fromPort.lon) === null ||
           evPlan(parts.toPort.lat, parts.toPort.lon, to.lat, to.lon) === null)) return false;
      }
    }
    return true;
  }
  // Par la route : même masse terrestre et frontière réellement franchissable. Sans ce contrôle, le retour vers le départ
  // d'un tirage interrompu (seul trajet vérifié par legAllowed seul) pouvait relier deux masses sans ferry (Calabre → Gozo).
  if(from.landmass !== undefined && toLandmass !== from.landmass) return false;
  if(from.zone && !reallyAdjacent(from.zone, toZone)) return false;
  var road = roadDistanceKm(from.lat, from.lon, to.lat, to.lon);
  if(cap && road > cap) return false;
  // skipEv : contrôles coûteux (bornes, traversée d'eau) laissés au tirage paresseux (pickCandidate).
  if(!skipEv && roadCrossesWater(from, to)) return false;
  if(!skipEv && LEG_CONSTRAINTS.electric && evPlan(from.lat, from.lon, to.lat, to.lon) === null) return false;
  return true;
}
// Tirage au hasard d'un candidat qui satisfait ok (vérification coûteuse, faite paresseusement) : ordre aléatoire, au plus
// EV_PICK_TRIES essais. Renvoie null si aucun ne convient.
var EV_PICK_TRIES = 400;
// Budget de temps épuisé (tripTimeUp) : plus aucun essai (un candidat déjà contrôlé en entier reste valable).
function pickCandidate(candidates, ok){
  if(!candidates.length || tripTimeUp()) return null;
  if(!ok) return candidates[randInt(0, candidates.length - 1)];
  // Petite liste : ordre aléatoire complet ; grande liste : indices tirés au hasard sans remise (pas de copie mélangée
  // de dizaines de milliers d'éléments à chaque étape).
  if(candidates.length <= EV_PICK_TRIES){
    var order = shuffle(candidates.map(function(_, i){ return i; }));
    for(var t = 0; t < order.length; t++){
      if(tripTimeUp()) return null;
      if(ok(candidates[order[t]])) return candidates[order[t]];
    }
    return null;
  }
  var tried = new Set();
  while(tried.size < EV_PICK_TRIES){
    if(tripTimeUp()) return null;
    var idx = randInt(0, candidates.length - 1);
    if(tried.has(idx)) continue;
    tried.add(idx);
    if(ok(candidates[idx])) return candidates[idx];
  }
  return null;
}

function tensionCpsOf(c){ return c.allCps || c.cps || (c.cp ? [c.cp] : []); }
// Lieu du pays « cc » à moins de km du point (bande frontalière des zones à tension). La zone atteignable
// (cases à moins de km d'une case contenant un lieu de cc) est calculée une fois par couple (pays, distance) :
// un lieu hors de cette zone est écarté sans calcul de distance. Sans ce pré-calcul, l'étape « zones à tension »
// de init() prenait ~90 s avec ~4 millions de lieux, et la recherche de ville restait indisponible tout ce temps.
function borderReach(cc, km){
  var cacheKey = cc + '|' + km;
  if(BORDER_REACH_CACHE[cacheKey]) return BORDER_REACH_CACHE[cacheKey];
  var reach = new Set(), cells = CELLS_BY_COUNTRY[cc] || [];
  var latSpan = Math.ceil(km / (GRID_CELL_DEG*111)) + 1;
  for(var i=0; i<cells.length; i+=2){
    var cx = cells[i], cy = cells[i+1];
    for(var dx=-latSpan; dx<=latSpan; dx++){
      var lonSpan = rowLonSpan(cx + dx, km), dyMax = lonSpan >= GRID_HALF_COLS ? GRID_HALF_COLS - 1 : lonSpan;
      for(var dy=-lonSpan; dy<=dyMax; dy++) reach.add(cellNum(cx+dx, wrapGridCol(cy+dy)));
    }
  }
  BORDER_REACH_CACHE[cacheKey] = reach;
  return reach;
}
// Demi-largeur (en colonnes de la grille) d'un cercle de km sur la RANGÉE de grille rowCx : prise au bord de la rangée
// le plus proche du pôle, plafonnée au tour complet (GRID_HALF_COLS). 11e audit du 19/09/2026 : la largeur était prise
// à la latitude du CENTRE, avec un plancher de 20 km par degré — les rangées plus proches du pôle étaient trop étroites
// (1 lieu trouvé sur 7 à −89,99°, et au-delà de ~70° de latitude pour les grands rayons).
function rowLonSpan(rowCx, km){
  var edgeLat = Math.min(89.99, Math.max(Math.abs(rowCx * GRID_CELL_DEG), Math.abs((rowCx + 1) * GRID_CELL_DEG)));
  var kmPerLonDeg = Math.max(111 * Math.cos(edgeLat * Math.PI / 180), 0.01);
  return Math.min(Math.ceil(km / (GRID_CELL_DEG * kmPerLonDeg)) + 1, GRID_HALF_COLS);
}
function nearCountryWithin(lat, lon, cc, km){
  var cx = Math.floor(lat/GRID_CELL_DEG), cy = wrapGridCol(Math.floor(lon/GRID_CELL_DEG));
  if(!borderReach(cc, km).has(cellNum(cx, cy))) return false;
  var latSpan = Math.ceil(km / (GRID_CELL_DEG*111)) + 1;
  for(var dx=-latSpan; dx<=latSpan; dx++){
    var lonSpan = rowLonSpan(cx + dx, km), dyMax = lonSpan >= GRID_HALF_COLS ? GRID_HALF_COLS - 1 : lonSpan;
    for(var dy=-lonSpan; dy<=dyMax; dy++){
      var col = wrapGridCol(cy+dy);
      var cellCountries = COUNTRIES_BY_CELL.get(cellNum(cx+dx, col));
      if(!cellCountries || !cellCountries[cc]) continue;
      var list = COMMUNE_GRID[(cx+dx)+'_'+col];
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
}
// Niveau de tension d'un lieu, calculé à la première demande puis mémorisé sur le lieu. Le calcul au démarrage
// pour les ~4 millions de lieux retardait d'autant la mise en service ; seuls les lieux réellement examinés
// par un tirage (candidats de findNearbyCommunes) sont désormais évalués.
function communeTension(c){
  if(c.tension === undefined) c.tension = TENSION_RULES_BY_COUNTRY[c.country] ? tensionOf(c) : null;
  return c.tension;
}

function findNearbyCommunes(lat, lon, minKm, maxKm, minPop){
  // Filet de sécurité : jamais plus que la demi-circonférence utile (coût en rayon², voir generateTrip).
  if(!(maxKm > 0)) return [];
  maxKm = Math.min(maxKm, MAX_SEARCH_RADIUS_KM);
  var latSpan = Math.ceil(maxKm / (GRID_CELL_DEG*111)) + 1;
  var cx = Math.floor(lat/GRID_CELL_DEG), cy0 = Math.floor(lon/GRID_CELL_DEG);
  var out = [];
  for(var dx=-latSpan; dx<=latSpan; dx++){
    // Budget de temps du tirage épuisé : liste partielle (chaque candidat reste contrôlé ; aucun ne sera plus tiré).
    if(tripTimeUp()) break;
    // Largeur propre à chaque rangée (voir rowLonSpan). Colonnes bouclées autour de ±180° (Fidji : 139 lieux sur 621
    // manquaient) ; tour complet près des pôles, chaque colonne une seule fois.
    var lonSpan = rowLonSpan(cx + dx, maxKm), dy0 = -lonSpan, dy1 = lonSpan, cy = cy0;
    if(2 * lonSpan + 1 >= GRID_COLS){ dy0 = -GRID_HALF_COLS; dy1 = GRID_HALF_COLS - 1; cy = 0; }
    for(var dy=dy0; dy<=dy1; dy++){
      var list = COMMUNE_GRID[(cx+dx)+'_'+wrapGridCol(cy+dy)];
      if(!list) continue;
      // Contrôle aussi à chaque case pleine (10e audit du 18/09/2026) : une ligne de la grille peut compter des dizaines
      // de milliers de lieux dont la zone à tension est évaluée à la première rencontre (~13 µs chacun) — le budget de
      // 4 s était dépassé jusqu'à 6,5 s (Manama, éloignement 3 000 km).
      if(tripTimeUp()) break;
      for(var i=0;i<list.length;i++){
        var c = list[i];
        if(c.pop < minPop) continue;
        var d = roadDistanceKm(lat, lon, c.lat, c.lon);
        if(d < minKm || d > maxKm) continue; // distance avant la tension : évalue la tension des seuls lieux dans l'anneau
        if(AVOID_TENSION && communeTension(c)) continue;
        out.push({commune:c, distKm:d});
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
function seaCrossingFor(a, b){ return (a === b || !SEA_ZONES.has(a) || !SEA_ZONES.has(b)) ? null : (SEA_CROSSINGS[landmassKey(a, b)] || null); }

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
  // Cameroun, Sainte-Hélène/Ascension/Tristan da Cunha, Terres australes et antarctiques françaises.
  'CM', 'SH', 'TF',
  // Russie (et son exclave de Kaliningrad), Svalbard et Jan Mayen.
  'RU', 'RU-KGD', 'SJ',
  // Péninsule Arabique, Irak et Iran.
  'SA', 'BH', 'AE', 'IQ', 'IR', 'KW', 'OM', 'QA', 'YE',
  // Asie centrale, du Sud, de l'Est et du Sud-Est.
  'AF', 'KZ', 'KG', 'UZ', 'TJ', 'TM', 'BD', 'BT', 'IN', 'MV', 'NP', 'PK', 'LK', 'IO', 'CN', 'HK', 'MO', 'KP', 'KR',
  'JP', 'MN', 'TW', 'BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'TL', 'VN', 'CX', 'CC',
  // Océanie (septembre 2026)
  'AU', 'NZ', 'PG', 'SB', 'VU', 'FJ', 'WS', 'TO', 'TV', 'KI', 'NR', 'MH', 'FM', 'PW', 'NU', 'CK', 'TK', 'GU', 'MP', 'AS', 'UM', 'PN', 'NF', 'HM',
  // Amériques (septembre 2026)
  'US', 'CA', 'MX', 'GL', 'BM', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'JM', 'HT', 'DO', 'BS', 'KN', 'AG', 'DM', 'LC', 'VC', 'BB', 'GD', 'TT', 'PR', 'VI', 'TC', 'KY', 'VG', 'AI', 'MS', 'AW', 'CW', 'SX', 'BQ', 'CO', 'VE', 'GY', 'SR', 'EC', 'PE', 'BO', 'BR', 'PY', 'UY', 'AR', 'CL', 'FK', 'GS',
  // Antarctique et île Bouvet (septembre 2026) : aucune frontière routière.
  'AQ', 'BV']);
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
  // Amériques : frontières franchies par une route (recherche du 16/09/2026). Sans route : Panama–Colombie (Darién),
  // Venezuela–Guyana, Colombie–Pérou, Canada–Groenland ; bac seulement : Guyana–Suriname, Suriname–Guyane française
  // (modélisés comme ferries s'ils sont retenus). Leticia–Tabatinga (Colombie–Brésil) : enclave sans route vers le reste
  // de la Colombie — la paire est ouverte, la masse terrestre isole Leticia. Guyane française : pays FR (pont de l'Oyapock).
  // Sint Maarten – Saint-Martin : frontière ouverte (FR).
  'CA|US', 'US|MX', 'MX|GT', 'MX|BZ', 'GT|BZ', 'GT|SV', 'GT|HN', 'SV|HN', 'HN|NI', 'NI|CR', 'CR|PA', 'HT|DO', 'SX|FR',
  'CO|VE', 'CO|EC', 'CO|BR', 'VE|BR', 'GY|BR', 'BR|FR', 'EC|PE', 'PE|BR', 'PE|BO', 'PE|CL', 'BO|BR', 'BO|PY', 'BO|AR', 'BO|CL',
  'BR|PY', 'BR|AR', 'BR|UY', 'AR|UY', 'AR|PY', 'AR|CL',
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

// depNorm : nom normalisé du lieu de départ, jamais tiré comme étape (ni aucun lieu à moins de START_EXCLUSION_KM du départ) —
// 80 voyages sur 1 195 de l'audit de septembre 2026 repassaient par leur propre ville de départ.
var START_EXCLUSION_KM = 2;
function notAtStart(c, startLat, startLon, depNorm){
  return c.norm !== depNorm && haversineKm(c.lat, c.lon, startLat, startLon) >= START_EXCLUSION_KM;
}
// RAYON DE RECHERCHE UTILE d'un trajet plafonné à capKm (distance routière) depuis « from » : un trajet par la route ne dépasse
// pas capKm ; un trajet avec traversée non plus pour ses parties routières, d'où (inégalité triangulaire, ports p1 et p2) :
// route(from, to) = 1,17 × vol(from, to) ≤ 1,17 × (vol(from, p1) + vol(p1, p2) + vol(p2, to)) ≤ capKm + 1,17 × écart(p1, p2),
// pour les seules liaisons dont un port de la rive de départ est à moins de capKm par la route (sans ports connus : distance
// de la traversée, voir ferryRoadParts). Chercher plus loin ne donnerait aucun candidat accepté par legAllowed ; sans cette
// borne, une excursion d'un jour à vélo (140 km au plus) parcourait tous les lieux dans un rayon de 3 000 km.
var CROSSINGS_BY_SIDE = null;
function crossingsFrom(side, isZone){
  if(!CROSSINGS_BY_SIDE){
    CROSSINGS_BY_SIDE = { landmass: new Map(), zone: new Map() };
    [[FERRY_ROUTES, 'landmass'], [SEA_CROSSINGS, 'zone']].forEach(function(t){
      Object.keys(t[0]).forEach(function(key){
        var sides = key.split('|'), ports = FERRY_PORTS[key];
        sides.forEach(function(own, si){
          var other = sides[1 - si];
          var ownPorts = ports && ports[own], otherPorts = ports && ports[other];
          var hasPorts = !!(ownPorts && otherPorts && ownPorts.length && otherPorts.length && ownPorts.length <= 64 && otherPorts.length <= 64);
          // Paires déclarées toutes incohérentes : ferryRoadParts retombe sur l'estimation sans ports.
          var firstSide = sides[0];
          if(hasPorts && ports.pairs && !ports.pairs.some(function(pr){ return pr[0] < ports[firstSide].length && pr[1] < ports[sides[1]].length; })) hasPorts = false;
          var gap = 0;
          if(hasPorts) ownPorts.forEach(function(p){ otherPorts.forEach(function(q){ gap = Math.max(gap, haversineKm(p[0], p[1], q[0], q[1])); }); });
          var list = CROSSINGS_BY_SIDE[t[1]].get(own);
          if(!list) CROSSINGS_BY_SIDE[t[1]].set(own, list = []);
          list.push({ ports: hasPorts ? ownPorts : null, gapKm: hasPorts ? gap : (Number(t[0][key].distanceKm) || 0) });
        });
      });
    });
  }
  return CROSSINGS_BY_SIDE[isZone ? 'zone' : 'landmass'].get(side) || [];
}
function searchRadiusCapKm(fromLat, fromLon, landmass, zone, capKm){
  if(!capKm) return Infinity;
  if(!LEG_CONSTRAINTS.ferryEnabled) return capKm;
  var capAir = capKm / ROAD_FACTOR, gap = 0;
  [crossingsFrom(landmass, false), zone ? crossingsFrom(zone, true) : []].forEach(function(list){
    for(var i = 0; i < list.length; i++){
      var e = list[i];
      if(e.gapKm <= gap) continue;
      if(e.ports){
        var near = false;
        for(var j = 0; j < e.ports.length && !near; j++) near = haversineKm(fromLat, fromLon, e.ports[j][0], e.ports[j][1]) <= capAir;
        if(!near) continue;
      }
      gap = e.gapKm;
    }
  });
  return capKm + ROAD_FACTOR * gap + 1; // + 1 km : marge d'arrondi
}
// Filtre en une seule passe : prédicats purs évalués dans l'ordre donné (les moins coûteux et les plus sélectifs d'abord) —
// même liste, dans le même ordre, que des .filter() successifs, sans tableaux intermédiaires de millions d'éléments (rayon
// de 3 000 km). Budget de temps épuisé : liste vide (aucun candidat ne serait plus tiré).
function filterCandidates(list, preds){
  var out = [];
  outer: for(var i = 0; i < list.length; i++){
    if((i & 1023) === 0 && tripTimeUp()) return [];
    var x = list[i];
    for(var k = 0; k < preds.length; k++){ if(!preds[k](x)) continue outer; }
    out.push(x);
  }
  return out;
}
function buildRealRoute(startLat, startLon, startLandmass, startZone, maxRadiusKm, numStops, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled, shortHop, depNorm){
  var route = [];
  var used = {};
  if(avoidNorm) used[avoidNorm] = true;
  if(depNorm) used[depNorm] = true;
  var notStart = function(x){ return notAtStart(x.commune, startLat, startLon, depNorm); };
  var curLat = startLat, curLon = startLon;
  var curLandmass = startLandmass;
  var curZone = startZone;
  var minDist = minDistanceKm || 0;
  var maxDist = maxDistanceKm || 0;
  var hopCeiling = maxDist > 0 ? maxDist : 600;
  // Retour possible à temps : depuis l'étape i, il reste (numStops - 1 - i) sauts d'au plus homeHopRoad km de route avant
  // la dernière étape, qui doit être à moins de lastCapAll du départ. Sans ce contrôle, un premier trajet très éloigné
  // (distance d'éloignement de 1 000 km) partait vers des étapes tirées au hasard, sans jamais se rapprocher du départ.
  var lastCapAll = maxDist > 0 ? Math.min(maxRadiusKm, maxDist) : maxRadiusKm;
  var homeHopRoad = Math.max(35, Math.min(hopCeiling*0.5, 220)) * ROAD_FACTOR;
  if(LEG_CONSTRAINTS.maxLegKm) homeHopRoad = Math.min(homeHopRoad, LEG_CONSTRAINTS.maxLegKm);
  function canStillReturn(x, i){
    if(numStops <= 1) return true;
    return roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= lastCapAll + (numStops - 1 - i) * homeHopRoad;
  }
  var notUsed = function(x){ return !used[x.commune.norm]; };
  // Pré-filtre exact de reachable, sans calcul de masse terrestre (coûteux) : quand aucune liaison ferry ne part de la masse
  // courante, seule une zone réellement adjacente peut convenir.
  var zoneOk = function(x){ return (ferryEnabled && FERRY_SIDES.has(curLandmass)) || reallyAdjacent(curZone, zoneOf(x.commune)); };
  function reachable(x){
    var toLandmass = communeLandmass(x.commune);
    var toZone = zoneOf(x.commune);
    // Liaison ferry entre deux masses terrestres : elle relie aussi deux pays sans frontière terrestre
    // commune (Corée ↔ Japon, Porto Rico ↔ République dominicaine…) — la liste ADJACENT_PAIRS ne concerne
    // que les frontières franchies par la ROUTE.
    if(toLandmass !== curLandmass && ferryEnabled && ferryRouteFor(curLandmass, toLandmass)) return true;
    if(!reallyAdjacent(curZone, toZone)) return false;
    // Traversée obligatoire entre deux zones d'une même masse terrestre (Ceuta/Melilla) : jamais
    // franchissable par la route, quoi qu'en dise la masse terrestre.
    if(seaCrossingFor(curZone, toZone)) return ferryEnabled;
    return toLandmass === curLandmass;
  }
  // Premier trajet (et retour d'un séjour à une étape) : jusqu'à max(maxLegKm, éloignement × 1,4), voir legAllowed.
  var firstCap = minDist > 0 ? minDist * 1.4 : 0;
  for(var i=0; i<numStops; i++){
    if(tripTimeUp()) break;
    var isFirst = i===0;
    var isLast = !isFirst && i===numStops-1;
    var evPick = null; // contrôles coûteux au tirage : traversée d'eau, bornes (voiture électrique)
    var chosen = null;
    var isOnlyStop = numStops === 1;
    // Séjour à une seule étape : l'aller EST le trajet de retour, donc la limite de rayon s'y applique (jusqu'à 1,4 × la
    // distance d'éloignement, voir firstCap). Avant (2e audit du 17/09/2026), la seconde passe (rayon × 2) et les
    // itinéraires de secours (rayon d'au moins 300 km) proposaient une étape bien au-delà du rayon choisi.
    var onlyStopCap = minDist > 0 ? Math.max(lastCapAll, firstCap) : lastCapAll;
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
    // Au-delà, legAllowed refuse tout candidat (voir searchRadiusCapKm).
    var searchCap = searchRadiusCapKm(curLat, curLon, curLandmass, curZone, legCapKm(isFirst ? firstCap : 0));
    if(isLast){
      // La dernière étape doit être réellement adjacente à la fois au pays courant (pour y ARRIVER)
      // ET au pays de départ (pour en REPARTIR directement vers le point de départ, voir "retour" sur
      // la carte/le calcul de trajet retour plus bas — un saut direct, jamais un nouveau passage par
      // les mêmes étapes intermédiaires). Sans ce second contrôle, un trajet pourrait très bien
      // atteindre sa dernière étape par une vraie chaîne de pays adjacents, puis "revenir" directement
      // par une frontière qui, elle, n'existe pas (ex. Beyrouth -> Syrie -> Jordanie -> Cisjordanie,
      // chaque saut réel, mais un retour direct Cisjordanie -> Liban ne l'est pas).
      var lastCap = maxDist > 0 ? Math.min(maxRadiusKm, maxDist) : maxRadiusKm;
      function reachableLast(x){
        if(!reachable(x)) return false;
        var lm = communeLandmass(x.commune);
        // Retour direct vers le départ : par la route (frontière réelle) ou par une liaison ferry.
        return reallyAdjacent(startZone, zoneOf(x.commune)) || (lm !== startLandmass && ferryEnabled && !!ferryRouteFor(lm, startLandmass));
      }
      // Distance max entre étapes et bornes : pour y arriver ET pour le retour direct au départ.
      var fromCur = { lat: curLat, lon: curLon, landmass: curLandmass, zone: curZone };
      var lastLegOk = function(x){
        return legAllowed(fromCur, x.commune, false, true) &&
          legAllowed({ lat: x.commune.lat, lon: x.commune.lon, landmass: communeLandmass(x.commune), zone: zoneOf(x.commune) }, { lat: startLat, lon: startLon, landmass: startLandmass, zone: startZone }, false, true);
      };
      evPick = function(x){
        return legAllowed(fromCur, x.commune) &&
          legAllowed({ lat: x.commune.lat, lon: x.commune.lon, landmass: communeLandmass(x.commune), zone: zoneOf(x.commune) }, { lat: startLat, lon: startLon, landmass: startLandmass, zone: startZone });
      };
      var withinLastCap = function(x){ return roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= lastCap; };
      candidates = filterCandidates(findNearbyCommunes(curLat, curLon, 0, Math.min(Math.max(maxHop, lastCap), searchCap), minPop),
        [withinLastCap, zoneOk, notStart, notUsed, reachableLast, lastLegOk]);
      if(candidates.length===0 && !tripTimeUp()){
        candidates = filterCandidates(findNearbyCommunes(startLat, startLon, 0, lastCap, 0), [zoneOk, notStart, notUsed, reachableLast, lastLegOk]);
      }
    } else {
      var fromHere = { lat: curLat, lon: curLon, landmass: curLandmass, zone: curZone };
      // Premier trajet avec distance d'éloignement (8e audit du 18/09/2026) : la distance max entre étapes est d'abord
      // respectée, et le plafond élargi (éloignement × 1,4) ne sert qu'en second recours, quand aucune étape n'existe à
      // la fois au-delà de l'éloignement et en deçà du maximum. Avant, le plafond élargi s'appliquait d'emblée : un
      // premier trajet de 170 km pouvait être tiré pour un maximum de 150 km alors que des étapes à 140 km existaient.
      // Un dépassement restant est signalé au voyageur (leg.overMaxLeg, voir runTrip).
      var extendedFirst = isFirst && legCapKm(firstCap) > legCapKm(0);
      var legExtraCap = (isFirst && !extendedFirst) ? firstCap : 0;
      var stopIndex = i;
      var legOk = function(x){ return canStillReturn(x, stopIndex) && legAllowed(fromHere, x.commune, legExtraCap, true); };
      evPick = function(x){ return legAllowed(fromHere, x.commune, legExtraCap); };
      var withinMaxDist = function(x){ return !(maxDist > 0) || roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= maxDist; };
      var withinOnlyStopCap = function(x){ return !isOnlyStop || roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= onlyStopCap; };
      var preds = [withinMaxDist, withinOnlyStopCap, zoneOk, notStart, notUsed, reachable, legOk];
      var searchFirstLeg = function(){
        var found = filterCandidates(findNearbyCommunes(curLat, curLon, minHop, Math.min(maxHop, searchCap), minPop), preds);
        if(found.length===0 && !tripTimeUp()){
          found = filterCandidates(findNearbyCommunes(curLat, curLon, minHop, Math.min(maxHop*2, searchCap), 0), preds);
        }
        return found;
      };
      // Passe stricte inutile quand le maximum est plus court que l'éloignement lui-même : aucune étape ne peut satisfaire
      // les deux (les deux sont des distances par la route, voir findNearbyCommunes).
      // Exception : avec un ferry possible depuis ce point, seule la partie ROUTIÈRE compte dans la distance max (voir
      // legAllowed) — une étape de l'autre rive peut respecter les deux (Calais → Whitstable : 42 km de route pour 96 km
      // d'éloignement). Au 8e audit, ce cas sautait la passe stricte (9e audit du 18/09/2026).
      var strictPossible = !extendedFirst || legCapKm(0) >= minHop || ferryPossibleFrom(curLat, curLon, curLandmass, curZone, legCapKm(0));
      candidates = strictPossible ? searchFirstLeg() : [];
      chosen = candidates.length ? pickCandidate(candidates, evPick) : null;
      if(!chosen && extendedFirst && !tripTimeUp()){
        legExtraCap = firstCap;
        candidates = searchFirstLeg();
        chosen = candidates.length ? pickCandidate(candidates, evPick) : null;
      }
    }
    if(candidates.length===0) break;
    if(isLast) chosen = pickCandidate(candidates, evPick);
    if(!chosen) break;
    used[chosen.commune.norm] = true;
    route.push(chosen.commune);
    curLat = chosen.commune.lat; curLon = chosen.commune.lon;
    curLandmass = communeLandmass(chosen.commune);
    // Sans cette ligne (oubliée dans une première version de ce correctif, détectée par un test
    // automatisé de 180 trajets plutôt qu'en relisant le code) : reachable()/reachableLast()
    // auraient continué à comparer chaque nouvelle étape au pays de DÉPART plutôt qu'au pays de
    // l'étape précédente, laissant passer des sauts non adjacents dès la deuxième étape (ex. un
    // trajet Amman -> Syrie -> Israël, le deuxième saut resterait comparé à "Jordanie" au lieu de
    // "Syrie" et paraîtrait à tort valide puisque Jordanie-Israël, eux, sont bien adjacents).
    curZone = zoneOf(chosen.commune);
  }
  // Tirage interrompu avant la dernière étape prévue (plus aucun candidat) : le retour depuis la dernière étape trouvée
  // n'a pas été contrôlé — on retire les étapes finales tant que ce retour dépasse la distance max entre étapes ou n'a
  // pas de bornes pour une voiture électrique.
  // Même règle pour la limite de rayon (2e audit du 17/09/2026) : un tirage interrompu (budget de temps, impasse) renvoyait
  // une dernière étape à 150 ou 1 000 km du départ pour un rayon de 50 ou 100 km. Un itinéraire complet la respecte déjà
  // (withinLastCap) ; une étape unique, voir onlyStopCap.
  var startPoint = { lat: startLat, lon: startLon, landmass: startLandmass, zone: startZone };
  var tailCap = numStops === 1 ? (minDist > 0 ? Math.max(lastCapAll, firstCap) : lastCapAll) : lastCapAll;
  while(route.length){
    var tail = route[route.length - 1];
    if(roadDistanceKm(tail.lat, tail.lon, startLat, startLon) > tailCap){ route.pop(); continue; }
    // Séjour prévu à une seule étape, atteinte grâce à la distance d'éloignement : son retour a forcément la même longueur
    // que l'aller. Un séjour prévu à plusieurs étapes et réduit à une seule, lui, doit respecter la distance max au retour.
    var returnExtraCap = (route.length === 1 && numStops === 1) ? firstCap : 0;
    if(legAllowed({ lat: tail.lat, lon: tail.lon, landmass: communeLandmass(tail), zone: zoneOf(tail) }, startPoint, returnExtraCap)) break;
    route.pop();
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
    var feat = featuredFor(route[idx]);
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

// Péage d'une étape (3e audit du 17/09/2026, complété le 18/09/2026). Trois corrections de sincérité :
// - le TYPE de péage (« flux libre » / « à barrière ») était tiré à pile ou face (25 %) et affiché comme un fait, et le
//   « vous gagnez environ N min » venait d'un pourcentage aléatoire entre 15 et 30 % — qui raccourcissait en plus la
//   durée annoncée du trajet. Les deux sont supprimés : le montant reste une estimation au kilomètre, présentée comme
//   telle (voir 'toll.enabled' / 'toll.estimateNote'), et la durée ne dépend plus que de la vitesse du mode.
// - une étape qui change de pays était facturée ENTIÈREMENT au barème du pays d'ARRIVÉE (Suisse -> France : 371 km au
//   tarif français, alors que la Suisse n'a aucun péage kilométrique) ;
// - surtout, le péage était facturé PARTOUT dans un pays « à péage », y compris là où il n'existe aucune voie payante :
//   Bastia -> Porto-Vecchio, Brest -> Quimper ou une étape de l'est anatolien recevaient une facture inventée.
// Les deux se règlent de la même façon (7e audit) : le trait de l'étape est échantillonné sur la grille des voies
// « toll=yes » d'OpenStreetMap (lib/toll-grid.js, cases de 0,25° ~ 28 km), et seuls les kilomètres dont la case porte
// vraiment une voie à péage sont facturés, au barème du pays de cette case. Sans la grille (fichier absent), aucun
// péage n'est estimé — plutôt rien qu'un montant inventé.
function tollRateOf(country, tollClass){
  var table = COUNTRIES[country] && COUNTRIES[country].hasToll ? TOLL_RATE_BY_COUNTRY[country] : null;
  return (table && table[tollClass]) || 0;
}
// from / to (facultatifs) : points de départ et d'arrivée, pour placer les recharges sur de vraies bornes.
// VITESSE PAR PAYS (11e audit du 19/09/2026). La vitesse des modes motorisés (80 km/h, TRANSPORT) est la médiane d'un
// relevé OSRM de 128 itinéraires dans 16 pays européens et en Turquie (data/road-factor-osrm.json, 79,4 km/h). Appliquée
// telle quelle au monde entier, elle était fausse ailleurs : Oslo → Bergen affiché 4 h 55 pour 7 h 46, la Mongolie ou
// le Mali roulant à ~40 km/h. Un second relevé, par pays et avec la même méthode (scripts/measure-road-speed-by-country.js,
// data/road-speed-by-country.json : 887 itinéraires, 150 pays, au moins 3 par pays), donne la vitesse de chaque pays ; la
// vitesse d'un trajet est celle du mode × (vitesse OSRM du pays ÷ 79,4), moyenne des pays de départ et d'arrivée. Pays
// sans relevé : vitesse du mode inchangée. Limites (documentées dans le fichier de données) : 3 à 6 itinéraires par pays ;
// OSRM ne compte ni trafic, ni pauses, ni état des routes — il donne ~75 km/h en Indonésie et au Viêt Nam, là où le
// routeur Valhalla mesure ~40 km/h (data/moto-no-motorway-valhalla.json) : les durées de ces pays restent optimistes.
// MASSE TERRESTRE MESURÉE (12e audit du 19/09/2026). Les itinéraires du relevé relient des villes de plus de 20 000
// habitants, à 60-400 km l'une de l'autre, sur la masse terrestre principale du pays (champ landmass de chaque itinéraire,
// calculé par landmassOf). Appliquée aux îles et à l'outre-mer, la vitesse du continent donnait des moyennes au-dessus de
// la limite légale sur des routes à double sens : Mamoudzou → Kani-Kéli (Mayotte, aucune voie rapide) 96,7 km/h, Bastia →
// Ajaccio 93,9 km/h, Saint-Denis → Saint-Pierre (La Réunion) 93,5 km/h. Un lieu hors des masses terrestres mesurées de son
// pays garde la vitesse du mode, sauf si le pays est plus lent : facteur min(1, pays) (13e audit, voir pointSpeedFactor).
var SPEED_REF_KMH = 79.4, COUNTRY_SPEED = {}, SPEED_LANDMASSES = {};
try {
  var speedData = require('../data/road-speed-by-country.json');
  Object.keys(speedData.summary || {}).forEach(function(cc){
    var r = speedData.summary[cc];
    if(r && r.n >= 3 && r.speedKmh > 10 && r.speedKmh < 150) COUNTRY_SPEED[cc] = r.speedKmh / SPEED_REF_KMH;
  });
  (speedData.routes || []).forEach(function(r){
    if(!r || !r.cc || !r.landmass) return;
    (SPEED_LANDMASSES[r.cc] = SPEED_LANDMASSES[r.cc] || {})[r.landmass] = true;
  });
} catch(e){ if(e.code !== 'MODULE_NOT_FOUND') throw e; }
// Masse terrestre des points sans champ landmass, mémorisée hors de l'objet (13e audit du 19/09/2026) : l'aller-retour
// dans la journée la recalculait pour le départ à chaque candidat (37 499 appels à landmassOf, Paris 1 jour : 1,1 s au
// lieu de 0,15 s). WeakMap : les étapes renvoyées au client ne reçoivent aucun champ supplémentaire.
var SPEED_LM_CACHE = new WeakMap();
function pointLandmass(p){
  if(p.landmass !== undefined) return p.landmass;
  if(SPEED_LM_CACHE.has(p)) return SPEED_LM_CACHE.get(p);
  var lm = landmassOf(p);
  SPEED_LM_CACHE.set(p, lm);
  return lm;
}
// Facteur du pays mesuré le plus rapide (au moins 1) : majorant de la vitesse d'un trajet, pour borner une recherche.
var DAY_REACH_TRIES = 12;       // essais du second passage « les plus proches de l'éloignement d'abord » (× 2)
var DAY_REACH_TRIES_MAX = 400;  // contrôles exacts au plus pour la distance annoncée
var DAY_REACH_BUCKET_KM = 10;   // largeur des tranches de distance balayées (précision de la distance annoncée)
var DAY_REACH_PER_BUCKET = 20;  // contrôles exacts au plus par tranche
var DAY_REACH_MS = 1500;        // budget du balayage ; au-delà, échantillon du reste plutôt qu'aucune annonce
var MAX_COUNTRY_SPEED = Object.keys(COUNTRY_SPEED).reduce(function(m, cc){ return Math.max(m, COUNTRY_SPEED[cc]); }, 1);
function pointSpeedFactor(p){
  var cc = p && p.country;
  if(!cc || !COUNTRY_SPEED[cc]) return null;
  if(p.lat == null || p.lon == null) return COUNTRY_SPEED[cc];
  var lm = pointLandmass(p);
  if(lm && SPEED_LANDMASSES[cc] && SPEED_LANDMASSES[cc][lm]) return COUNTRY_SPEED[cc];
  // Hors des masses mesurées : jamais plus rapide que le continent du pays (13e audit : au 12e, le facteur 1 rendait
  // Cebu, Bali, Zanzibar ou Okinawa plus rapides — 80 km/h — que Luçon, Java ou Honshu, mesurés entre 64 et 76 km/h).
  return Math.min(1, COUNTRY_SPEED[cc]);
}
function countrySpeedFactor(from, to, country){
  var list = [];
  [from, to].forEach(function(p){ var f = pointSpeedFactor(p); if(f != null) list.push(f); });
  // Sans extrémité localisée (partie routière d'un ferry sans ports connus) : pays de l'étape.
  if(!list.length && country && COUNTRY_SPEED[country]) list.push(COUNTRY_SPEED[country]);
  if(!list.length) return 1;
  return list.reduce(function(sum, f){ return sum + f; }, 0) / list.length;
}
function finalizeLeg(distanceKm, speed, transportKey, tollEnabled, country, from, to){
  var tollClass = TRANSPORT[transportKey].tollClass;
  // Vélo : 15 km/h sourcés (EuroVelo), indépendants du réseau routier du pays.
  if(transportKey !== 'velo') speed = speed * countrySpeedFactor(from, to, country);
  // Moto dans un pays dont les autoroutes lui sont interdites : routes secondaires, plus lentes, sans péage.
  if(transportKey === 'moto'){
    // Pays de l'arrivée aussi (10e audit) : la partie routière qui suit un ferry part d'un port sans pays, et hors de l'île
    // principale tollCountryOf ne renvoie aucun pays (Penghu, Kinmen) — l'interdiction taïwanaise était alors ignorée.
    var ban = motoMotorwayBan(country) || (from && from.country && motoMotorwayBan(from.country)) || (to && to.country && motoMotorwayBan(to.country));
    // Pays seulement TRAVERSÉ (12e audit du 19/09/2026) : Nanning →
    // Laos le Viêt Nam — l'interdiction n'était ni appliquée à la vitesse ni signalée. Même règle que les vignettes
    // (countriesAlong : 30 km d'affilée, un point franchement dans le pays).
    // Trajet INTÉRIEUR (départ et arrivée dans le même pays) : aucun transit, comme pour le péage (13e audit : Kangar →
    // Melor, Malaisie → Malaisie, recevait « autoroutes interdites en Thaïlande » alors que la route reste malaisienne).
    // Un port n'a pas de pays : celui du lieu habité le plus proche (14e audit du 19/09/2026 — sans lui, Kota Bharu →
    // Langkawi par Kuala Perlis passait pour un trajet entre deux pays et recevait l'interdiction thaïlandaise sur sa
    // partie routière malaisienne). Seule cette règle l'utilise : la vitesse des parties routières n'en dépend pas.
    if(!(ban && ban.fullBan) && from && to && from.lat != null && to.lat != null &&
       (from.country || countryAtPoint(from.lat, from.lon)) !== (to.country || countryAtPoint(to.lat, to.lon))){
      var crossedBan = countriesAlong(from, to).map(function(cc){ return motoMotorwayBan(cc); }).filter(function(b){ return b && b.fullBan; })[0];
      if(crossedBan) ban = crossedBan;
    }
    if(ban && ban.fullBan){
      var motoFactor = MOTO_NO_MOTORWAY_SPEED_FACTOR[ban.rule.country];
      speed = speed * (motoFactor || MOTO_NO_MOTORWAY_SPEED_FACTOR_DEFAULT);
      tollClass = null;
    }
  }
  var hours = distanceKm / speed;
  var tollInfo = null;
  // Sans les deux extrémités, rien à échantillonner. Plus de distance minimale d'étape (10e audit du 18/09/2026) : c'est
  // la longueur facturée d'affilée qui est bornée, à une case de la grille (voir tolledParts, lib/toll-grid.js).
  if(tollClass && from && to){
    // Distance ramenée à l'échelle des autoroutes (voir TOLL_ROAD_FACTOR) : c'est elle qui est facturée.
    // Un point n'est facturé qu'au barème de SON pays (lieu habité le plus proche) : sans cela, un point de
    // l'agglomération genevoise recevait le barème de l'autoroute française voisine sur un trajet entièrement suisse
    // (8e audit du 18/09/2026). Pays des extrémités (un port de ferry n'a pas de pays : celui du lieu habité le plus
    // proche) : facturés dès le premier point ; pays seulement traversés : sur au moins 30 km d'affilée (9e audit, voir
    // TRANSIT_MIN_KM dans lib/toll-grid.js). Un point sans lieu habité autour (bras de mer longé, désert) prend le pays
    // de l'étape quand elle n'en touche qu'un seul.
    var paysEtape = {};
    [from, to].forEach(function(p){ var c = p.country || countryAtPoint(p.lat, p.lon); if(c) paysEtape[c] = true; });
    var listePays = Object.keys(paysEtape);
    var paysDuPoint = function(lat, lon){
      var c = countryAtPoint(lat, lon);
      if(c) return c;
      return listePays.length === 1 ? listePays[0] : null;
    };
    // FOURCHETTE (11e audit du 19/09/2026, voir tolledParts dans lib/toll-grid.js) : borne basse « probable » et borne
    // haute « possible ». Le trait à vol d'oiseau ne dit pas si le vrai itinéraire prend l'autoroute payante ou la
    // gratuite qui la longe ; afficher un montant unique était faux dans un sens ou dans l'autre.
    // Deux extrémités hors des masses terrestres à barème (Kinmen, Corse, Baléares…, voir TOLL_LANDMASSES) : aucun péage.
    if(tollCountryOf(from) || tollCountryOf(to)){
      var tollKm = distanceKm * TOLL_ROAD_FACTOR / ROAD_FACTOR, paysOpts = { duPoint: paysDuPoint, extremites: paysEtape, interieur: insideCountry };
      var sumParts = function(parts){
        var r0 = { amount: 0, km: 0, countries: [], rate: 0 };
        parts.forEach(function(part){
          var r = tollRateOf(part.country, tollClass);
          if(!r) return;
          r0.amount += part.km * r; r0.km += part.km; r0.rate = r;
          if(r0.countries.indexOf(part.country) < 0) r0.countries.push(part.country);
        });
        return r0;
      };
      var hi = sumParts(tollGrid.tolledParts(from.lat, from.lon, to.lat, to.lon, tollKm, paysOpts, { upper: true }));
      var lo = sumParts(tollGrid.tolledParts(from.lat, from.lon, to.lat, to.lon, tollKm, paysOpts, { upper: false }));
      if(hi.countries.length && Math.round(hi.amount * 10) / 10 > 0){ // jamais « jusqu'à ~0 € » (12e audit)
        // amount = borne haute (compatibilité : anciens clients, totaux « jusqu'à ») ; amountMin = borne basse.
        // countries : pays dont un barème peut s'appliquer (libellé « barème … », voir TOLL_SOURCE).
        var amountMax = Math.round(hi.amount * 10) / 10, amountMin = Math.min(amountMax, Math.round(lo.amount * 10) / 10);
        // amountExact / amountMinExact / amountMaxExact : valeurs non arrondies, pour additionner les deux parties
        // routières d'une étape avec traversée sans cumuler les arrondis (16e audit). Non affichées.
        tollInfo = { enabled: !!tollEnabled, amount: amountMax, amountMin: amountMin, amountMax: amountMax, tollClass: tollClass,
          amountExact: hi.amount, amountMinExact: lo.amount, amountMaxExact: hi.amount,
          rate: hi.rate, countries: hi.countries, tolledKm: Math.round(hi.km), tolledKmMin: Math.round(Math.min(lo.km, hi.km)) };
      }
    }
  }
  var chargeInfo = null;
  var tr = TRANSPORT[transportKey];
  if(tr.electric){
    var effectiveRange = EV_RANGE_KM * EV_CHARGE_MARGIN;
    var plan = (from && to && CHARGERS_BY_CELL) ? evPlan(from.lat, from.lon, to.lat, to.lon) : null;
    if(plan && plan.length){
      // Arrêts sur des bornes réelles (Open Charge Map) : position et lieu habité le plus proche.
      var totalMin = plan.length * EV_CHARGE_STOP_MIN; // durée sourcée, voir trip-data.js (tirée au hasard avant le 10e audit)
      chargeInfo = { stops: plan.length, minutes: totalMin, real: true, stations: plan.map(function(s){
        var near = findNearbyCommunes(s[0], s[1], 0, 15, 0).sort(function(a, b){ return (b.commune.pop - a.commune.pop) || (a.distKm - b.distKm); })[0];
        return { lat: s[0], lon: s[1], near: near ? near.commune.name : null };
      }) };
      hours += totalMin / 60;
    } else if(distanceKm > effectiveRange && !(plan && plan.length === 0)){
      // Bornes non chargées (ou trajet hors contrainte) : estimation par l'autonomie seule, signalée.
      var stops = Math.ceil(distanceKm / effectiveRange) - 1;
      if(stops > 0){
        var estMin = stops * EV_CHARGE_STOP_MIN;
        chargeInfo = { stops: stops, minutes: estMin, real: false };
        hours += estMin / 60;
      }
    }
    // Aucune borne publique connue près de l'arrivée : recharge à prévoir à l'hébergement.
    if(to && CHARGERS_BY_CELL && !chargerNear(to.lat, to.lon, CHARGER_NEAR_STOP_KM)){
      chargeInfo = chargeInfo || { stops: 0, minutes: 0, real: true };
      chargeInfo.noChargerNearArrival = true;
    }
  }
  // travelMin : même durée en minutes, formatée par le navigateur dans la langue du visiteur (travelTime, « 2h46 », reste
  // pour les calculs internes et les anciens clients).
  return { travelTime: fmtHours(hours), travelMin: Math.round(hours * 60), distanceKm: distanceKm, tollInfo: tollInfo, chargeInfo: chargeInfo };
}

function buildLodgingLinks(town, checkIn, checkOut, budgetKey, country, preferredCurrency){
  var countryName = (COUNTRIES[country] && COUNTRIES[country].name) || 'France';
  var q = encodeURIComponent(town + ', ' + countryName);
  // Plafond du PAYS DE L'ÉTAPE, converti dans la devise choisie si possible (voir lodgingPriceCap, trip-data.js).
  var cap = lodgingPriceCap(country, budgetKey, preferredCurrency);
  // Devise du lien acceptée par les plateformes (voir LODGING_LINK_CURRENCIES) : sinon celle du pays, sinon l'euro.
  if(LODGING_LINK_CURRENCIES.indexOf(cap.currency) < 0){
    var local = lodgingPriceCap(country, budgetKey, null);
    cap = LODGING_LINK_CURRENCIES.indexOf(local.currency) >= 0 ? local : lodgingPriceCap(country, budgetKey, 'EUR');
  }
  var currency = cap.currency, priceMax = cap.max;
  var links = {
    airbnb: 'https://www.airbnb.fr/s/' + encodeURIComponent(town) + '/homes?checkin=' + checkIn + '&checkout=' + checkOut + '&adults=2&price_max=' + priceMax + '&currency=' + currency,
    booking: 'https://www.booking.com/searchresults.fr.html?ss=' + q + '&checkin=' + checkIn + '&checkout=' + checkOut + '&group_adults=2&no_rooms=1&nflt=price%3D' + currency + '-0-' + priceMax + '-1'
  };
  // Pays où Airbnb ou Booking.com est absent (sanctions, retrait) ou faible : lien retiré s'il est absent, plateformes
  // locales réelles ajoutées (LODGING_RULES, recherche sourcée — voir scripts/lodging/).
  var rule = LODGING_RULES && LODGING_RULES[country];
  if(rule){
    if(rule.airbnb === 'absent') delete links.airbnb;
    if(rule.booking === 'absent') delete links.booking;
    if(rule.local && rule.local.length){
      links.local = rule.local.map(function(p){
        return { name: p.name, url: p.url.replace(/\{town\}/g, encodeURIComponent(town)).replace(/\{checkin\}/g, checkIn)
          .replace(/\{checkout\}/g, checkOut).replace(/\{adults\}/g, '2') };
      });
    }
  }
  return links;
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
  // Lieu isolé à lui seul (masse terrestre « PAYS:lat,lon », voir landmassOf) sans liaison ferry ni traversée : les seuls
  // autres lieux de sa masse sont au même point, donc exclus (notAtStart). Sortie immédiate plutôt qu'une recherche sur
  // 3 000 km vouée à l'échec (Sveagruva : 51 s).
  if(POINT_LANDMASS_RE.test(startLandmass) && !(ferryEnabled && (FERRY_SIDES.has(startLandmass) || SEA_ZONES.has(zoneOf(cityCoord))))) return [];
  var depNorm = normalizeCityName(city);
  var legs = [];
  var minDist = minDistanceKm || 0;
  var maxDist = maxDistanceKm || 0;
  // Premier trajet et retour d'un séjour à une étape : jusqu'à max(maxLegKm, éloignement × 1,4), voir legAllowed.
  var firstCap = minDist > 0 ? minDist * 1.4 : 0;
  var minNightsPerStop = minDaysPerCity || 1;
  var maxNightsPerStop = Math.max(minNightsPerStop, maxDaysPerCity || 3);

  function finalizeHop(fromPoint, toPoint, distanceKm, country){
    // Une traversée entre zones (Ceuta/Melilla) prime sur la masse terrestre : les deux points sont
    // "continentaux" tous les deux, seule SEA_CROSSINGS sait qu'il y a la mer entre eux.
    var fromZone = zoneOf(fromPoint), toZone = zoneOf(toPoint);
    var crossing = seaCrossingFor(fromZone, toZone);
    if(crossing) return finalizeFerryLeg(transportKey, crossing, ferryRoadParts(fromPoint, toPoint, fromZone, toZone, crossing), speed, tollEnabled, fromPoint, toPoint);
    var fromLandmass = landmassOf(fromPoint), toLandmass = landmassOf(toPoint);
    if(fromLandmass !== toLandmass){
      var route = ferryRouteFor(fromLandmass, toLandmass);
      if(route) return finalizeFerryLeg(transportKey, route, ferryRoadParts(fromPoint, toPoint, fromLandmass, toLandmass, route), speed, tollEnabled, fromPoint, toPoint);
    }
    return finalizeLeg(distanceKm, speed, transportKey, tollEnabled, tollCountryOf(toPoint), fromPoint, toPoint);
  }

  if(days <= 1){
    var hopCeiling0 = maxDist > 0 ? maxDist : 600;
    // Plancher de 15 km abaissé quand la distance max ou l'étape max est plus courte (14e audit du 19/09/2026) : Lyon,
    // 1 jour, 10 km au plus, rendait un tirage vide sans explication, alors qu'un séjour de 3 jours trouvait
    // Saint-Cyr-au-Mont-d'Or à 9 km. Moitié de la borne : un lieu reste possible entre le plancher et la borne.
    var floor0 = Math.min(15, maxDist > 0 ? maxDist / 2 : 15, LEG_CONSTRAINTS.maxLegKm > 0 ? LEG_CONSTRAINTS.maxLegKm / 2 : 15);
    var minHop0 = Math.max(floor0, minDist);
    var hop = Math.max(40, minDist > 0 ? Math.max(minDist*1.4, maxRadiusKm) : Math.min(maxRadiusKm, hopCeiling0));
    function reachable0(x){
      var toLandmass = communeLandmass(x.commune);
      var toZone = zoneOf(x.commune);
      if(toLandmass !== startLandmass && ferryEnabled && ferryRouteFor(startLandmass, toLandmass)) return true;
      if(!reallyAdjacent(zoneOf(cityCoord), toZone)) return false;
      if(seaCrossingFor(zoneOf(cityCoord), toZone)) return ferryEnabled;
      return toLandmass === startLandmass;
    }
    var fromStart0 = { lat: cLat, lon: cLon, landmass: startLandmass, zone: zoneOf(cityCoord) };
    // Filtre de masse : aller seul (distance, frontière, ports symétriques) ; au tirage, l'aller ET le retour sont contrôlés
    // entièrement (traversée d'eau, parties routières des ferries, bornes).
    // Distance max entre étapes respectée d'abord, plafond élargi (éloignement × 1,4) en second recours seulement : voir
    // extendedFirst dans buildRealRoute (8e audit du 18/09/2026).
    var extended0 = legCapKm(firstCap) > legCapKm(0);
    var cap0 = extended0 ? 0 : firstCap;
    var legOk0 = function(x){ return legAllowed(fromStart0, x.commune, cap0, true); };
    var evPick0 = function(x){
      if(!(legAllowed(fromStart0, x.commune, cap0) &&
        legAllowed({ lat: x.commune.lat, lon: x.commune.lon, landmass: communeLandmass(x.commune), zone: zoneOf(x.commune) }, fromStart0, cap0))) return false;
      // Durée réelle de l'aller (route, recharges, traversée) : aller + retour dans DAY_TRIP_MAX_HOURS.
      var out = finalizeHop(cityCoord, x.commune, Math.round(x.distKm), x.commune.country);
      var h = travelHoursOf(out.travelTime) + (out.ferryInfo ? travelHoursOf(out.roadTime) : 0);
      return 2 * h <= DAY_TRIP_MAX_HOURS;
    };
    // Filtre de masse : la route seule, à la vitesse du mode, doit déjà tenir dans la journée (majorant de la vitesse
    // réelle ; le contrôle exact, traversées et recharges comprises, est fait au tirage par evPick0).
    // Vitesse du pays et de la masse terrestre (12e audit du 19/09/2026) : à 80 km/h fixes, Lyon avec 380 km d'éloignement
    // était refusé (8,1 h réelles à 94 km/h) et Oulan-Bator (41 km/h) gardait des candidats impossibles.
    // Minorant de la durée d'un aller (13e audit du 19/09/2026), mêmes règles que finalizeLeg : vélo à sa vitesse propre
    // (au 12e audit, la vitesse routière du pays lui était appliquée : limite annoncée 34 km au lieu de 67 à Oulan-Bator),
    // moto ralentie dans un pays aux autoroutes interdites, recharges minimales de la voiture électrique (Paris, 400 km :
    // 9,4 h aller-retour avec une recharge par trajet — « éloignement introuvable » après 4 s de calcul au lieu de « hors
    // de portée »).
    var dayBan0 = transportKey === 'moto' ? motoMotorwayBan(cityCoord.country) : null;
    var dayMoto0 = (dayBan0 && dayBan0.fullBan) ? (MOTO_NO_MOTORWAY_SPEED_FACTOR[dayBan0.rule.country] || MOTO_NO_MOTORWAY_SPEED_FACTOR_DEFAULT) : 1;
    var dayEvRange0 = TRANSPORT[transportKey].electric ? EV_RANGE_KM * EV_CHARGE_MARGIN : 0;
    var oneWayHours0 = function(km, factor){
      var h = km / (speed * factor * dayMoto0);
      if(dayEvRange0 && km > dayEvRange0) h += (Math.ceil(km / dayEvRange0) - 1) * EV_CHARGE_STOP_MIN / 60;
      return h;
    };
    var dayFactor0 = function(p){ return transportKey === 'velo' ? 1 : countrySpeedFactor(cityCoord, p, p ? p.country : cityCoord.country); };
    var dayDrive0 = function(x){ return 2 * oneWayHours0(x.distKm, dayFactor0(x.commune)) <= DAY_TRIP_MAX_HOURS; };
    var dayCapKm = Math.floor(DAY_TRIP_MAX_HOURS / 2 * speed * dayFactor0(null) * dayMoto0);
    while(dayCapKm > 0 && 2 * oneWayHours0(dayCapKm, dayFactor0(null)) > DAY_TRIP_MAX_HOURS) dayCapKm--;
    // Distance annoncée « hors de portée, X km au plus » (14e audit du 19/09/2026) : celle du plus lointain lieu qui passe
    // les mêmes filtres que les candidats (durée comprise, à la vitesse moyenne du départ ET de l'arrivée), et non plus le
    // seul plafond du pays de départ. Bamako annonçait 196 km alors qu'un aller-retour de 261 km vers la Guinée, plus
    // rapide, fonctionnait (Sarajevo, Bihać, Kayes de même). below : borne exclue (lieux plus proches que l'éloignement).
    // Rayon de recherche : plafond au plus rapide des pays mesurés (MAX_COUNTRY_SPEED), borné comme les candidats.
    // Recherche bornée à l'éloignement demandé : au-delà, les lieux ont déjà été cherchés comme candidats (hop ≥ 1,4 ×
    // l'éloignement). Sans cette borne, Séoul à moto, 350 km : 170 → 630 ms (outil de comparaison, 14e audit).
    // Renvoie { below : plus lointain lieu atteignable plus proche que l'éloignement, durationBlocks : aucun lieu entre
    // l'éloignement et +30 km ne passe les filtres de lieu SANS le filtre de durée ET avec lui }. « Hors de portée » n'est
    // annoncé que si c'est bien la durée qui bloque : si des lieux à cette distance passent la durée mais pas les autres
    // contrôles (étape max, traversée), « introuvable » reste plus juste.
    // 15e audit du 19/09/2026 : la distance annoncée doit être RÉELLEMENT faisable. Au 14e audit, c'était le plus lointain
    // lieu passant le filtre de durée, qui est un minorant (recharges minimales, ni traversées ni contrôle de trajet) :
    // redemander à cette distance renvoyait « hors de portée, X − 1 », jusqu'à 109 fois de suite (Lewe, Birmanie, en
    // électrique : 328 km annoncés pour 221 faisables). Les lieux sous l'éloignement sont maintenant triés du plus
    // lointain au plus proche et soumis au contrôle exact du tirage (evPick0) : le premier qui passe donne la distance
    // annoncée. Au plus DAY_REACH_TRIES contrôles (les plus lointains, puis un échantillon régulier du reste).
    // anyAbove : au moins un lieu entre l'éloignement et +30 km (sinon, île ou désert : rien n'existe à cette distance,
    // et « hors de portée, augmentez la durée » ne servirait à rien — « introuvable » ; 15e audit).
    var rMax0 = Math.ceil(DAY_TRIP_MAX_HOURS / 2 * speed * (transportKey === 'velo' ? 1 : MAX_COUNTRY_SPEED) * dayMoto0);
    var reachableMax0 = function(below){
      var placeOk = [withinMaxDist0, withinRadius0, zoneOk0, notStart0, reachable0];
      // Couronne [éloignement, +30 km] : existe-t-il un lieu, et l'un d'eux passe-t-il le filtre de durée ?
      var above = below < searchCap0 ? filterCandidates(findNearbyCommunes(cLat, cLon, below, Math.min(below + 30, searchCap0), 0), placeOk) : [];
      var anyAbove = above.length > 0, aboveTimeOk = above.some(dayDrive0);
      // Lieux plus proches, jusqu'au plafond de vitesse (au-delà, aucun ne passe le filtre de durée).
      var near = filterCandidates(findNearbyCommunes(cLat, cLon, floor0, Math.min(rMax0, searchCap0, below), 0), placeOk);
      var list = [];
      near.forEach(function(x){ if(x.distKm < below && dayDrive0(x) && legOk0(x)) list.push(x); });
      // Parcours du plus lointain au plus proche jusqu'au PREMIER lieu faisable : c'est la vraie distance maximale
      // (16e audit du 20/09/2026). Au 15e audit, seuls 12 essais + 12 échantillons étaient contrôlés et le premier succès
      // rencontré devenait X : Leganes annonçait 161 km alors que 199 km marche, Calumboyan 109 pour 208, écart jusqu'à
      // 172 km sur 10 % des cas. Le parcours complet ne coûte pas plus cher en pratique (chemin d'échec, mesuré < 1 s),
      // et reste borné par DAY_REACH_TRIES_MAX essais exacts et par le budget de temps du tirage.
      // Balayage par TRANCHES de DAY_REACH_BUCKET_KM, de la plus lointaine à la plus proche, au plus
      // DAY_REACH_PER_BUCKET contrôles exacts par tranche (16e audit du 20/09/2026). Un parcours candidat par candidat
      // épuisait ses essais dans les lieux les plus lointains, tous impossibles : Calumboyan a 10 754 lieux sous son
      // éloignement, dont des centaines entre 250 et 264 km qu'aucune voiture électrique ne peut faire dans la journée —
      // la distance annoncée tombait à 173 km alors que 220 km marche. Les tranches descendent vite : la distance
      // annoncée est à moins d'une tranche du maximum, pour quelques dizaines de contrôles.
      list.sort(function(a, b){ return b.distKm - a.distKm; });
      var best = 0, tries = 0, fin = Date.now() + DAY_REACH_MS;
      for(var i0 = 0; i0 < list.length && !best && tries < DAY_REACH_TRIES_MAX && Date.now() < fin && !tripTimeUp(); ){
        var top = list[i0].distKm, j0 = i0;
        while(j0 < list.length && list[j0].distKm > top - DAY_REACH_BUCKET_KM) j0++;
        // Essais répartis dans la tranche (pas régulier) : les lieux d'une même tranche se valent en distance, et ce qui
        // les départage (bornes de recharge, mer, frontière) ne se devine pas — mieux vaut couvrir large que trier.
        var n0 = j0 - i0, pas0 = Math.max(1, Math.ceil(n0 / DAY_REACH_PER_BUCKET));
        for(var k0 = i0; k0 < j0 && !best && tries < DAY_REACH_TRIES_MAX && !tripTimeUp(); k0 += pas0){
          tries++;
          if(evPick0(list[k0])) best = list[k0].distKm;
        }
        i0 = j0;
      }
      return { below: Math.floor(best), durationBlocks: !aboveTimeOk, anyAbove: anyAbove };
    };
    var notStart0 = function(x){ return x.commune.norm !== avoidNorm && notAtStart(x.commune, cLat, cLon, depNorm); };
    var withinMaxDist0 = function(x){ return !(maxDist > 0) || x.distKm <= maxDist; };
    // Aller-retour dans la journée : le retour a la longueur de l'aller, la limite de rayon s'applique (voir onlyStopCap
    // dans buildRealRoute) — la seconde passe (× 1,6) la dépassait.
    var radiusCap0 = minDist > 0 ? Math.max(maxRadiusKm, firstCap) : maxRadiusKm;
    var withinRadius0 = function(x){ return x.distKm <= radiusCap0; };
    var startZone0 = zoneOf(cityCoord);
    var zoneOk0 = function(x){ return (ferryEnabled && FERRY_SIDES.has(startLandmass)) || reallyAdjacent(startZone0, zoneOf(x.commune)); };
    var preds0 = [withinMaxDist0, withinRadius0, zoneOk0, notStart0, reachable0, dayDrive0, legOk0];
    var searchCap0 = searchRadiusCapKm(cLat, cLon, startLandmass, startZone0, legCapKm(firstCap)); // voir searchRadiusCapKm
    var search0 = function(){
      // Rayon borné par rMax0 (15e audit) : au-delà, aucun lieu ne peut passer le filtre de durée (hop × 1,6 allait
      // jusqu'à 841 km pour 600 km d'éloignement, alors que le plafond de vitesse est ~432 km en voiture).
      var found = filterCandidates(findNearbyCommunes(cLat, cLon, minHop0, Math.min(hop, searchCap0, rMax0), 15), preds0);
      if(found.length===0 && !tripTimeUp()){
        found = filterCandidates(findNearbyCommunes(cLat, cLon, minHop0, Math.min(hop*1.6, searchCap0, rMax0), 0), preds0);
      }
      return found;
    };
    var candidates = (!extended0 || legCapKm(0) >= minHop0 || ferryPossibleFrom(cLat, cLon, startLandmass, startZone0, legCapKm(0))) ? search0() : [];
    var picked0 = candidates.length ? pickCandidate(candidates, evPick0) : null;
    if(!picked0 && extended0 && !tripTimeUp()){
      cap0 = firstCap;
      candidates = search0();
      picked0 = candidates.length ? pickCandidate(candidates, evPick0) : null;
    }
    // Plus de EV_PICK_TRIES candidats, tous les essais au hasard refusés : second passage, les plus proches de
    // l'éloignement d'abord — ce sont les plus faciles à faire dans la journée (15e audit : Xarardheere en électrique,
    // 218 km, trouvait un lieu faisable à 218 km pour annoncer la distance, mais 400 essais au hasard parmi des milliers
    // le manquaient, d'où « hors de portée, 217 »).
    // Recherche complète (tous les lieux, même de moins de 15 habitants, comme reachableMax0) : la première recherche ne
    // retient que les lieux d'au moins 15 habitants tant qu'elle en trouve, alors que la distance annoncée peut venir
    // d'un lieu plus petit — sans cela, la contre-épreuve à X échouait.
    if(!picked0 && candidates.length > 0 && minDist > 0 && !tripTimeUp()){
      var all0 = filterCandidates(findNearbyCommunes(cLat, cLon, minHop0, Math.min(hop*1.6, searchCap0, rMax0), 0), preds0);
      var nearest0 = all0.sort(function(a, b){ return a.distKm - b.distKm; }).slice(0, DAY_REACH_TRIES * 2);
      for(var n0 = 0; n0 < nearest0.length && !picked0 && !tripTimeUp(); n0++) if(evPick0(nearest0[n0])) picked0 = nearest0[n0];
      if(all0.length > candidates.length) candidates = all0;
    }
    // Aucun éloignement demandé et aucun lieu au-delà du plancher (très petite île : Jamestown, Longyearbyen) : dernier
    // recours à 2 km, comme pour un séjour (15e audit — un séjour de 21 jours trouvait Levelwood à 8 km, 1 jour rien).
    if(candidates.length === 0 && !(minDist > 0) && floor0 > 2 && !tripTimeUp()){
      candidates = filterCandidates(findNearbyCommunes(cLat, cLon, 2, Math.min(floor0 + 15, searchCap0), 0), preds0);
      picked0 = candidates.length ? pickCandidate(candidates, evPick0) : null;
    }
    if(candidates.length===0){
      // Éloignement au-delà de ce qu'un aller-retour de DAY_TRIP_MAX_HOURS permet : « hors de portée pour revenir », avec
      // la distance du plus lointain lieu atteignable (même message que pour un séjour, voir minDistanceUnreachable).
      if(minDist > 0 && !tripTimeUp()){
        // Aucun lieu atteignable du tout (île sans liaison, filtres) : « introuvable », jamais un plafond sans lieu réel.
        var reach0 = reachableMax0(minDist);
        LAST_TRIP_DIAGNOSTIC = (reach0.below > 0 && reach0.durationBlocks && reach0.anyAbove) ? { minDistanceUnreachable: true, returnCapKm: reach0.below }
          : { minDistanceNotFound: true, exhaustive: true };
      }
      return [];
    }
    // Candidats tous refusés au contrôle exact (durée réelle, traversées, recharges) : même diagnostic qu'une liste vide
    // (12e audit : Oulan-Bator, 250 km, rendait un tirage vide sans explication).
    if(!picked0){
      // exhaustive : tous les candidats ont été contrôlés (pickCandidate les essaie tous sous EV_PICK_TRIES) — un nouvel
      // essai referait exactement les mêmes contrôles (13e audit : 3 tirages de 1,2 à 1,5 s pour rien).
      // Tous contrôlés sans succès : aucun lieu à cette distance n'est faisable, « hors de portée » avec le plus lointain lieu
      // plus proche qui passe les filtres. Pas tous contrôlés (au-delà d'EV_PICK_TRIES) : « introuvable », nouvel essai.
      if(minDist > 0 && !tripTimeUp()){
        // Plus de EV_PICK_TRIES candidats : ce sont EV_PICK_TRIES essais tirés au hasard qui ont tous échoué au contrôle exact
        // — « hors de portée » reste la réponse la plus juste (Kharkiv ou Mopti en électrique ou à moto, 350 km : l'outil de
        // comparaison les montrait passer à « introuvable », avec de nouveaux essais voués à l'échec).
        // Ici, des candidats passaient le filtre de durée (minorant) mais pas le contrôle exact : c'est la durée réelle
        // (recharges, traversées) qui bloque dès qu'aucun n'a réussi.
        var below0 = reachableMax0(minDist).below;
        LAST_TRIP_DIAGNOSTIC = below0 > 0 ? { minDistanceUnreachable: true, returnCapKm: below0 }
          : { minDistanceNotFound: true, exhaustive: candidates.length <= EV_PICK_TRIES };
      }
      return [];
    }
    TRIP_DEADLINE = 0; // étape retenue et contrôlée : la mise en forme n'est plus soumise au budget de temps
    var stop = picked0.commune;
    var featured0 = featuredFor(stop);
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
  // Distance d'éloignement au-delà de la limite de rayon : assez d'étapes pour revenir à portée du départ par sauts successifs.
  if(minDist > 0 && maxPossibleStops >= 2){
    var hopRoadForReturn = Math.max(35, Math.min((maxDist > 0 ? maxDist : 600) * 0.5, 220)) * ROAD_FACTOR;
    if(LEG_CONSTRAINTS.maxLegKm) hopRoadForReturn = Math.min(hopRoadForReturn, LEG_CONSTRAINTS.maxLegKm);
    var capForReturn = maxDist > 0 ? Math.min(maxRadiusKm, maxDist) : maxRadiusKm;
    var stopsForReturn = 1 + Math.ceil(Math.max(0, minDist * 1.2 - capForReturn) / hopRoadForReturn);
    numStops = Math.max(numStops, Math.min(maxPossibleStops, stopsForReturn));
    // Impossible à coup sûr : même en comptant au plus juste, il faut plus d'étapes pour revenir que le séjour n'a de
    // nuits (ex. 1 000 km d'éloignement, 300 km max entre étapes, 3 jours). Signalé tout de suite plutôt que cinq
    // essais sur un rayon de 1 400 km (~7 s) suivis d'un itinéraire de secours qui ignorait l'éloignement.
    if(1 + Math.ceil(Math.max(0, minDist - capForReturn) / hopRoadForReturn) > maxPossibleStops){
      LAST_TRIP_DIAGNOSTIC = { minDistanceUnreachable: true, returnCapKm: Math.round(Math.min(capForReturn, LEG_CONSTRAINTS.maxLegKm || capForReturn)) };
      return [];
    }
  }
  var route = buildRealRoute(cLat, cLon, startLandmass, zoneOf(cityCoord), maxRadiusKm, numStops, avoidNorm, minDist, maxDist, ferryEnabled, false, depNorm);
  var routeCutByTime = route.length < numStops && TRIP_TIMED_OUT;
  // Le chemin se construit étape par étape au hasard et peut aboutir à une impasse (itinéraire vide ou incomplet) :
  // quelques nouveaux essais (4 avec une distance d'éloignement, 2 sinon), le plus long itinéraire est gardé. Aucun
  // nouvel essai une fois le budget de temps épuisé.
  for(var attempt = 0; attempt < (minDist > 0 ? 4 : 2) && route.length < numStops && !tripTimeUp(); attempt++){
    var retry = buildRealRoute(cLat, cLon, startLandmass, zoneOf(cityCoord), maxRadiusKm, numStops, avoidNorm, minDist, maxDist, ferryEnabled, false, depNorm);
    if(retry.length > route.length){ route = retry; routeCutByTime = retry.length < numStops && TRIP_TIMED_OUT; }
  }
  // Itinéraire resté incomplet parce que le temps a manqué (et non faute de lieux) : ses nuits dépasseraient le maximum par
  // ville sans que rien ne le signale. Renvoyé vide, le client affiche « délai dépassé » (timedOut).
  if(routeCutByTime) return [];
  // Distance d'éloignement introuvable : signalée (minDistanceNotFound) au lieu d'un itinéraire de secours qui l'ignorait
  // en silence (2e audit du 17/09/2026 : Ajaccio sans ferry, 400 km au moins, première étape à 36 km).
  if(route.length === 0 && minDist > 0){
    if(!tripTimeUp()) LAST_TRIP_DIAGNOSTIC = { minDistanceNotFound: true };
    return [];
  }
  if(route.length === 0 && !tripTimeUp()) route = buildRealRoute(cLat, cLon, startLandmass, zoneOf(cityCoord), maxRadiusKm, 1, avoidNorm, 0, maxDist, ferryEnabled, false, depNorm);
  // Dernier recours pour les petites îles : la première étape exige au moins 15 km, si bien que tout
  // départ d'une île plus petite que cela (Sainte-Hélène, Brava, La Digue, Petite-Terre à Mayotte…)
  // aboutissait à « itinéraire impossible » alors que d'autres lieux réels existent à quelques
  // kilomètres. Ce troisième essai n'intervient que si les deux précédents ont échoué, et accepte une
  // étape à partir de 2 km : le comportement des trajets ordinaires est inchangé.
  if(route.length === 0 && !tripTimeUp()) route = buildRealRoute(cLat, cLon, startLandmass, zoneOf(cityCoord), maxRadiusKm, 1, avoidNorm, 0, maxDist, ferryEnabled, true, depNorm);
  if(route.length === 0) return [];
  var nights = distributeNights(route, totalNights, minNightsPerStop, maxNightsPerStop);

  // Premier trajet de plus de 6 h de route (hors traversée en ferry) : au moins 2 nuits à la première étape, pour laisser
  // une journée de visite après l'arrivée. La nuit est prise à l'étape qui en a le plus (au-dessus du minimum par ville),
  // sinon la dernière étape (ou à défaut une étape intermédiaire) est retirée si le trajet qui la contourne reste permis. Sans effet si le séjour n'a
  // qu'une nuit ou si le maximum de jours par ville est 1.
  var savedDeadline = TRIP_DEADLINE; TRIP_DEADLINE = 0; // mise en forme (lieux proches des bornes) hors budget de temps
  var firstLegInfo = finalizeHop(cityCoord, route[0], Math.round(roadDistanceKm(cLat, cLon, route[0].lat, route[0].lon)), route[0].country);
  TRIP_DEADLINE = savedDeadline;
  // Étape avec traversée : seules les heures de route comptent (roadTime), la traversée n'est pas de la conduite.
  if(travelHoursOf(firstLegInfo.ferryInfo ? firstLegInfo.roadTime : firstLegInfo.travelTime) > FIRST_LEG_REST_HOURS && nights[0] < 2 && maxNightsPerStop >= 2 && totalNights >= 2){
    var donor = -1;
    for(var di = 1; di < nights.length; di++) if(nights[di] > minNightsPerStop && (donor < 0 || nights[di] > nights[donor])) donor = di;
    if(donor > 0){ nights[donor]--; nights[0]++; }
    else if(route.length > 1){
      var before = route[route.length - 2];
      var backOk = legAllowed({ lat: before.lat, lon: before.lon, landmass: communeLandmass(before), zone: zoneOf(before) },
        { lat: cLat, lon: cLon, landmass: startLandmass, zone: zoneOf(cityCoord) }) &&
        roadDistanceKm(before.lat, before.lon, cLat, cLon) <= (maxDist > 0 ? Math.min(maxRadiusKm, maxDist) : maxRadiusKm);
      if(backOk){ route.pop(); nights[0] += nights.pop(); }
      else {
        // Dernier recours : retirer une étape intermédiaire si le trajet qui la contourne reste permis.
        for(var mi = 1; mi < route.length - 1; mi++){
          var a = route[mi - 1], b = route[mi + 1];
          if(legAllowed({ lat: a.lat, lon: a.lon, landmass: communeLandmass(a), zone: zoneOf(a) }, b) && reallyAdjacent(zoneOf(a), zoneOf(b))){
            route.splice(mi, 1); nights[0] += nights.splice(mi, 1)[0];
            break;
          }
        }
      }
    }
  }
  TRIP_DEADLINE = 0; // itinéraire arrêté et contrôlé : la mise en forme n'est plus soumise au budget de temps

  var dayCounter = 0;
  var prevLat = cLat, prevLon = cLon;
  var prevPoint = cityCoord;
  route.forEach(function(commune, stopIdx){
    var nightsHere = nights[stopIdx];
    var featured = featuredFor(commune);
    var poisQueue = featured ? featured.pois.slice() : [];
    var genericQueue = shuffle(GENERIC_KEYS_NO_WALK);
    var stayCheckIn = isoDate(addDays(tripStart, dayCounter));
    var stayCheckOut = isoDate(addDays(tripStart, dayCounter + nightsHere));
    var stayLodgingLinks = buildLodgingLinks(commune.name, stayCheckIn, stayCheckOut, budgetKey, commune.country, preferredCurrency);
    for(var n=0; n<nightsHere; n++){
      dayCounter++;
      // Journée sur place (2e nuit et suivantes au même endroit) : AUCUN trajet (10e audit du 18/09/2026). Elle portait un
      // « petit trajet local » de 3 à 14 km TIRÉ AU HASARD, affiché comme une vraie distance (« ~ 10 min de route · 11 km »)
      // et compté dans le kilométrage total du voyage — un chiffre inventé.
      var legInfo = (stopIdx === 0 && n === 0) ? firstLegInfo
        : n===0 ? finalizeHop(prevPoint, commune, Math.round(roadDistanceKm(prevLat, prevLon, commune.lat, commune.lon)), commune.country)
        : { distanceKm: null, travelTime: null, travelMin: null, tollInfo: null, chargeInfo: null };
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

function parseAliasesOfCountry(raw, countryCommunes, aliases){
  var byName = {};
  countryCommunes.forEach(function(c){ (byName[c.name] = byName[c.name] || []).push(c); });
  raw.split('\n').filter(Boolean).forEach(function(line){
    var parts = line.split(';');
    var alias = parts[1], canonical = parts[2];
    if(!alias || !canonical) return;
    var targets = byName[canonical];
    if(!targets) return;
    var norm = normalizeCityName(alias);
    targets.forEach(function(c){ aliases.push({ norm: norm, commune: c, text: alias, lang: parts[0] }); });
  });
}

function buildCommunesAndAliases(communesRaw, aliasesRaw){
  var rawByCountry = splitBundle(communesRaw);
  var communes = [];
  var byCountry = {};
  Object.keys(rawByCountry).forEach(function(cc){
    var parsed = parseCommunesFile(rawByCountry[cc], cc);
    byCountry[cc] = parsed;
    // push plutôt que concat : concat recopiait tout le tableau déjà construit à chaque pays (~190 copies
    // d'un tableau qui grandit jusqu'à ~4 millions de lieux).
    for(var pi=0; pi<parsed.length; pi++) communes.push(parsed[pi]);
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

// Points d'intérêt « vedettes » d'un lieu, seulement s'il s'agit bien de la commune de featured.txt : même nom normalisé
// ET à moins de FEATURED_MATCH_KM de ses coordonnées (11e audit du 19/09/2026). La table n'était indexée que par le
// nom : 279 homonymes dans le monde (un Juvigny à 418 km, des lieux homonymes aux États-Unis, en Allemagne, en Haïti…)
// affichaient comme réels les points d'intérêt de la commune française, et la recherche OpenStreetMap de leurs vrais
// points d'intérêt n'était même pas lancée (needsRealPOIs à faux).
var FEATURED_MATCH_KM = 5;
function featuredFor(place){
  var f = place && place.norm ? FEATURED[place.norm] : null;
  if(!f || !(isFinite(f.lat) && isFinite(f.lon))) return null;
  return haversineKm(place.lat, place.lon, f.lat, f.lon) <= FEATURED_MATCH_KM ? f : null;
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
// Démarrage par étapes (renvoie une promesse). Entre deux pays, la main est rendue à la boucle d'événements
// (setImmediate) : le serveur continue de répondre pendant le chargement au lieu de rester figé de longues
// secondes (sur l'hébergement mutualisé, des requêtes restaient sans réponse et semblaient perdues). La
// recherche de ville est ouverte dès que son index existe (SEARCH_READY), avant la grille des tirages
// (TRIP_READY). La durée de chaque étape est journalisée.
var SEARCH_READY = false, TRIP_READY = false;
function yieldToEventLoop(){ return new Promise(function(resolve){ setImmediate(resolve); }); }
// options.skipSearchIndex : l'index de recherche précalculé sur disque (lib/search-index.js) est disponible et
// sert la recherche de ville ; le moteur n'a alors besoin ni des alias ni de son propre index — seulement des
// lieux et de la grille pour les tirages, ce qui raccourcit d'autant le démarrage et la mémoire utilisée.
function init(communesRaw, aliasesRaw, featuredRaw, options){
  options = options || {};
  var t = Date.now(), steps = [];
  function step(name){ var now = Date.now(); steps.push(name + ' ' + (now - t) + ' ms'); t = now; }
  var communes = [], aliases = [], byCountry = {};
  var rawByCountry = splitBundle(communesRaw);
  var countries = Object.keys(rawByCountry);
  var aliasRawByCountry = splitBundle(aliasesRaw);
  var i = 0;
  function parseNextCountry(){
    if(i >= countries.length) return Promise.resolve();
    var cc = countries[i++];
    var parsed = parseCommunesFile(rawByCountry[cc], cc);
    byCountry[cc] = parsed;
    for(var pi=0; pi<parsed.length; pi++) communes.push(parsed[pi]);
    return yieldToEventLoop().then(parseNextCountry);
  }
  var aliasCountries = Object.keys(aliasRawByCountry), j = 0;
  function parseNextAliases(){
    if(j >= aliasCountries.length) return Promise.resolve();
    var cc = aliasCountries[j++];
    parseAliasesOfCountry(aliasRawByCountry[cc], byCountry[cc] || [], aliases);
    return yieldToEventLoop().then(parseNextAliases);
  }
  // Ordre choisi pour ouvrir la recherche au plus tôt : lieux → index des noms et codes postaux (recherche
  // ouverte) → alias multilingues ajoutés à l'index → grille des tirages.
  return parseNextCountry()
    .then(function(){
      step('lieux');
      COMMUNES = communes;
      ALIASES = [];
      FEATURED = parseFeatured(featuredRaw);
      buildTensionIndex();
      if(options.skipSearchIndex) return;
      buildSearchIndex();
      SEARCH_READY = true;
      step('index des noms');
      console.log('[trip-engine] recherche de ville disponible (noms et codes postaux).');
      return yieldToEventLoop()
        .then(parseNextAliases)
        .then(function(){
          ALIASES = aliases;
          addAliasesToSearchIndex(aliases);
          step('alias');
          return yieldToEventLoop();
        });
    })
    .then(function(){
      buildCommuneGrid();
      TRIP_READY = true;
      step('grille');
      console.log('[trip-engine] ' + steps.join(' · '));
    });
}

function isSearchReady(){ return SEARCH_READY; }
function isReady(){ return TRIP_READY; }

// ---------------------------------------------------------------------------------------------
// API publique consommée par server.js (routes /api/search-city et /api/generate-trip)
// ---------------------------------------------------------------------------------------------
function searchCity(query, limit, preferCountry, lang){
  return searchCommunes(query, limit || 8, preferCountry, lang);
}

// Valide et normalise les paramètres reçus du client avant de lancer le tirage — c'est
// désormais la vraie frontière de confiance (voir README) : le client validait déjà tout ceci
// avant d'appeler buildItinerary() localement, mais rien n'empêche une requête directe à cette
// API de contourner ces règles, donc tout est revérifié ici.
function generateTrip(params){
  var startedAt = Date.now();
  if(!isReady()) throw new Error('moteur non initialisé');
  var p = params || {};
  var dep = p.departureCity;
  if(!dep || typeof dep !== 'object') throw new Error('departureCity manquant');
  // Nombres ou chaînes numériques seulement (10e audit) : Number(null) et Number('') valent 0 (départ dans le golfe de
  // Guinée), Number(true) vaut 1.
  var numOnly = function(v){ return (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) ? Number(v) : NaN; };
  var lat = numOnly(dep.lat), lon = numOnly(dep.lon);
  if(!isFinite(lat) || lat < -90 || lat > 90 || !isFinite(lon) || lon < -180 || lon > 180) throw new Error('coordonnées de départ invalides');
  var country = typeof dep.country === 'string' ? dep.country : '';
  // Code pays : deux lettres ET propriété propre de COUNTRIES (« __proto__ », « constructor » passaient le test).
  if(!/^[A-Z]{2}$/.test(country) || !Object.prototype.hasOwnProperty.call(COUNTRIES, country)) throw new Error('pays de départ inconnu');
  // Codes postaux et région : chaînes courtes seulement (un objet ou un tableau géant faisait lever une TypeError interne).
  var cleanStr = function(v, max){ return (typeof v === 'string' || typeof v === 'number') ? String(v).slice(0, max) : null; };
  var depCps = Array.isArray(dep.allCps) ? dep.allCps.slice(0, 50).map(function(c){ return cleanStr(c, 16); }).filter(Boolean) : [];
  var depCp = cleanStr(dep.cp, 16);
  var cityName = typeof dep.name === 'string' ? dep.name.slice(0, 120) : '';
  // name : certaines règles d'îles en dépendent (Galatás et Troizína, continent grec, partagent le code postal de Póros).
  var cityCoord = {
    name: cityName,
    lat: lat, lon: lon, dept: cleanStr(dep.dept, 60), country: country,
    cp: depCp || depCps[0] || null,
    allCps: depCps.length ? depCps : (depCp ? [depCp] : [])
  };

  var days = Math.round(numOnly(p.days));
  if(!isFinite(days) || days < 1 || days > MAX_TRIP_DAYS) throw new Error('nombre de jours invalide');

  var budgetKey = ['economique','moyen','confortable'].indexOf(p.budgetKey) !== -1 ? p.budgetKey : 'moyen';
  var transportKey = Object.prototype.hasOwnProperty.call(TRANSPORT, p.transportKey) ? p.transportKey : 'voiture-thermique';
  var tollEnabled = !!p.tollEnabled;
  var ferryEnabled = !!p.ferryEnabled;
  var avoidTent = !!p.avoidTent;

  var tripStart = parseIsoDate(p.tripStart) || new Date();
  var maxRadiusKm = numOnly(p.maxRadiusKm);
  if(!isFinite(maxRadiusKm) || maxRadiusKm <= 0) maxRadiusKm = 300;
  maxRadiusKm = Math.min(Math.max(maxRadiusKm, 20), 3000);

  var avoidNorm = typeof p.avoidNorm === 'string' && p.avoidNorm ? normalizeCityName(p.avoidNorm.slice(0, 200)) : null;
  // SÉCURITÉ (audit de septembre 2026) : bornes hautes obligatoires. Ces valeurs deviennent le rayon de recherche de
  // findNearbyCommunes, dont le coût croît avec le carré du rayon ; « minDistanceKm: 1e308 » gelait le process entier
  // (boucle sans fin, moteur synchrone) pour tous les visiteurs.
  var minDistanceKm = numOnly(p.minDistanceKm);
  var maxDistanceKm = numOnly(p.maxDistanceKm);
  minDistanceKm = isFinite(minDistanceKm) ? Math.min(Math.max(minDistanceKm, 0), MAX_DISTANCE_PARAM_KM) : 0;
  maxDistanceKm = isFinite(maxDistanceKm) ? Math.min(Math.max(maxDistanceKm, 0), MAX_DISTANCE_PARAM_KM) : 0;
  // Même contrôle que le formulaire : un minimum au-delà du maximum était ignoré sans rien dire.
  if(minDistanceKm > 0 && maxDistanceKm > 0 && minDistanceKm > maxDistanceKm) throw new Error('distance minimale supérieure à la distance maximale');

  var preferredCurrency = (typeof p.preferredCurrency === 'string' && CURRENCY_CODE_RE.test(p.preferredCurrency)) ? p.preferredCurrency : null;

  var minDaysPerCity = Math.round(numOnly(p.minDaysPerCity));
  if(!isFinite(minDaysPerCity) || minDaysPerCity < 1) minDaysPerCity = 1;
  var maxDaysPerCity = Math.round(numOnly(p.maxDaysPerCity));
  if(!isFinite(maxDaysPerCity) || maxDaysPerCity < 1) maxDaysPerCity = 3;
  maxDaysPerCity = Math.min(maxDaysPerCity, MAX_TRIP_DAYS - 1);
  minDaysPerCity = Math.min(minDaysPerCity, maxDaysPerCity);
  // Un séjour de N jours compte N-1 nuits : un minimum par ville plus grand ne pouvait pas être respecté et donnait une
  // étape à moins de nuits que demandé, sans rien signaler (3e audit du 17/09/2026). Ramené au maximum possible.
  if(days > 1) minDaysPerCity = Math.min(minDaysPerCity, days - 1);

  // Distance max entre étapes : valeur du formulaire, sinon 80 km à vélo et 400 km pour les autres modes.
  var maxLegKm = Math.round(numOnly(p.maxLegKm));
  if(!isFinite(maxLegKm) || maxLegKm <= 0) maxLegKm = DEFAULT_MAX_LEG_KM[transportKey] || 400;
  maxLegKm = Math.min(Math.max(maxLegKm, 5), 3000);
  // État global du tirage (contraintes, filtre, diagnostic, budget de temps) : remis à zéro dans tous les cas, y compris
  // sur exception ou sortie anticipée (finally).
  try {
    return runTrip();
  } finally {
    AVOID_TENSION = true;
    LEG_CONSTRAINTS = { maxLegKm: 0, electric: false, ferryEnabled: true };
    LAST_TRIP_DIAGNOSTIC = null;
    TRIP_DEADLINE = 0; TRIP_TIMED_OUT = false;
  }

  function runTrip(){
  LEG_CONSTRAINTS = { maxLegKm: maxLegKm, electric: !!TRANSPORT[transportKey].electric, ferryEnabled: ferryEnabled };
  // Filtre des zones à tension : actif sauf demande explicite contraire (p.avoidTension === false).
  var avoidTension = p.avoidTension !== false;
  AVOID_TENSION = avoidTension;
  LAST_TRIP_DIAGNOSTIC = null;
  // Budget de temps compté depuis l'entrée de generateTrip (voir TRIP_TIME_BUDGET_MS), partagé par les deux tirages.
  var deadline = startedAt + TRIP_TIME_BUDGET_MS;
  TRIP_DEADLINE = deadline; TRIP_TIMED_OUT = false;
  var legs = buildItinerary(cityName, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled, preferredCurrency, minDaysPerCity, maxDaysPerCity);
  // « Éloignement introuvable » : le tirage est aléatoire (nombre d'étapes, candidats essayés), un échec peut venir du
  // hasard. Jusqu'à MIN_DIST_RETRIES nouveaux essais, dans le même budget de temps, avant de l'annoncer (11e audit du
  // 19/09/2026 : 5 tirages annoncés impossibles réussissaient avec une autre graine — Qatar, Kafr Şūr, Mittelberg…).
  // Un nouvel essai qui manque de temps ne remplace pas le diagnostic du premier tirage, qui avait conclu (12e audit du
  // 19/09/2026 : Puli, 1 500 km d'éloignement, annonçait « délai dépassé » au lieu d'« éloignement introuvable » ; 36 cas
  // sur 500 tirages) — même règle que pour le second tirage sans filtre (« c'est le premier diagnostic qui vaut »).
  for(var retry = 0; legs.length === 0 && retry < MIN_DIST_RETRIES && LAST_TRIP_DIAGNOSTIC && LAST_TRIP_DIAGNOSTIC.minDistanceNotFound &&
      !LAST_TRIP_DIAGNOSTIC.exhaustive && !TRIP_TIMED_OUT && Date.now() < deadline; retry++){
    var diagnosticConclu = LAST_TRIP_DIAGNOSTIC;
    LAST_TRIP_DIAGNOSTIC = null;
    TRIP_DEADLINE = deadline;
    legs = buildItinerary(cityName, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled, preferredCurrency, minDaysPerCity, maxDaysPerCity);
    if(legs.length === 0 && (TRIP_TIMED_OUT || !LAST_TRIP_DIAGNOSTIC)){
      LAST_TRIP_DIAGNOSTIC = diagnosticConclu;
      TRIP_TIMED_OUT = false;
      break;
    }
  }
  var diagnostic = LAST_TRIP_DIAGNOSTIC;
  // Aller-retour « hors de portée » avec le filtre des zones actif (15e audit du 19/09/2026) : le second tirage sans
  // filtre est fait d'abord — Sharm el-Sheikh à moto, 190 km, annonçait « hors de portée, 174 » alors que seul le filtre
  // bloquait (Be'er Ora, Israël, à 270 km, faisable). Séjours : diagnostic calculé indépendamment des zones, inchangé.
  if(diagnostic && diagnostic.minDistanceUnreachable && !(days <= 1 && avoidTension && !TRIP_TIMED_OUT && Date.now() <= deadline)){
    return { legs: [], minDistanceUnreachable: true, returnCapKm: diagnostic.returnCapKm, maxLegKm: maxLegKm };
  }
  // Tirage vide avec le filtre actif : on vérifie si c'est le filtre qui bloque (départ au milieu d'une
  // zone à tension, par exemple), pour que le client puisse le dire plutôt qu'un « itinéraire impossible ».
  // Pas de second tirage si le budget de temps est déjà épuisé.
  // Le filtre n'est mis en cause que si ce second tirage passe RÉELLEMENT par une zone à tension (9e audit du
  // 18/09/2026) : avant, sa seule réussite suffisait, alors que le premier tirage avait souvent échoué par simple hasard
  // (Lyon, réglages serrés : « décochez Exclure les zones déconseillées » sans aucune zone à 300 km à la ronde). Un
  // second tirage réussi sans aucune étape en zone respecte le filtre : c'est lui qui est proposé.
  var tensionBlocked = false;
  // Le premier tirage a-t-il conclu sans manquer de temps ? (voir plus bas : diagnostic conservé)
  var diagnosticAvantSecond = !TRIP_TIMED_OUT;
  if(legs.length === 0 && avoidTension && !TRIP_TIMED_OUT && Date.now() <= deadline){
    AVOID_TENSION = false;
    TRIP_DEADLINE = deadline;
    var diagFiltre = LAST_TRIP_DIAGNOSTIC;
    LAST_TRIP_DIAGNOSTIC = null;
    var legsSansFiltre = buildItinerary(cityName, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled, preferredCurrency, minDaysPerCity, maxDaysPerCity);
    var diagSansFiltre = LAST_TRIP_DIAGNOSTIC;
    LAST_TRIP_DIAGNOSTIC = diagFiltre;
    AVOID_TENSION = true;
    if(legsSansFiltre.length){
      var parZone = legsSansFiltre.some(function(leg){
        return !leg.isReturn && leg.country && TENSION_RULES_BY_COUNTRY[leg.country] &&
          tensionOf({ country: leg.country, cps: leg.allCps, cp: leg.cp, dept: leg.dept, lat: leg.lat, lon: leg.lon });
      });
      if(parZone) tensionBlocked = true;
      else legs = legsSansFiltre;
    }
    // Aller-retour : « introuvable » avec le filtre, « hors de portée » sans lui (Moscou, Kyiv, Téhéran, Caracas,
    // Kaboul, 500-600 km : la durée bloque de toute façon — 15e audit, régression de la 14e passe). Et « hors de portée »
    // avec le filtre confirmé par le second tirage (voir plus haut) : le diagnostic du premier est rendu.
    if(days <= 1 && !legs.length && !tensionBlocked){
      if(diagnostic && diagnostic.minDistanceUnreachable){
        return { legs: [], minDistanceUnreachable: true, returnCapKm: diagnostic.returnCapKm, maxLegKm: maxLegKm };
      }
      if(diagnostic && diagnostic.minDistanceNotFound && diagSansFiltre && diagSansFiltre.minDistanceUnreachable){
        TRIP_DEADLINE = 0;
        return { legs: [], minDistanceUnreachable: true, returnCapKm: diagSansFiltre.returnCapKm, maxLegKm: maxLegKm };
      }
    }
  }
  // Second tirage impossible (budget épuisé) après un aller-retour « hors de portée » : diagnostic du premier.
  if(!legs.length && !tensionBlocked && diagnostic && diagnostic.minDistanceUnreachable){
    return { legs: [], minDistanceUnreachable: true, returnCapKm: diagnostic.returnCapKm, maxLegKm: maxLegKm };
  }
  // Distance d'éloignement introuvable (et non zone à tension ni manque de temps) : signalée au client.
  if(legs.length === 0 && diagnostic && diagnostic.minDistanceNotFound && !tensionBlocked && !TRIP_TIMED_OUT){
    TRIP_DEADLINE = 0;
    return { legs: [], minDistanceNotFound: true, minDistanceKm: Math.round(minDistanceKm), maxLegKm: maxLegKm };
  }
  // Tirage vide faute de temps (et non faute d'itinéraire possible) : signalé au client (timedOut).
  // Premier tirage conclu (éloignement introuvable) puis second tirage, sans filtre, à court de temps : c'est le premier
  // diagnostic qui vaut (10e audit du 18/09/2026 : « délai dépassé » s'affichait à la place, Mexico, Kinshasa, Moscou).
  if(legs.length === 0 && diagnostic && diagnostic.minDistanceNotFound && !tensionBlocked && TRIP_TIMED_OUT && diagnosticAvantSecond){
    TRIP_DEADLINE = 0;
    return { legs: [], minDistanceNotFound: true, minDistanceKm: Math.round(minDistanceKm), maxLegKm: maxLegKm };
  }
  // « Délai dépassé » seulement si le PREMIER tirage a manqué de temps (11e audit) : un premier tirage conclu, suivi d'un
  // second tirage de contrôle (zones à tension) à court de temps, n'est pas un échec faute de temps.
  var timedOut = legs.length === 0 && TRIP_TIMED_OUT && !tensionBlocked && !diagnosticAvantSecond;
  TRIP_DEADLINE = 0;
  // Avertissement par étape (et pour le point de départ), calculé sur les mêmes règles.
  // Montants de péage non arrondis : utiles seulement pour additionner les parties routières d'une étape avec traversée
  // (16e audit du 20/09/2026), jamais envoyés au client.
  legs.forEach(function(leg){
    if(leg.tollInfo){ delete leg.tollInfo.amountExact; delete leg.tollInfo.amountMinExact; delete leg.tollInfo.amountMaxExact; }
  });
  legs.forEach(function(leg){
    leg.tension = (leg.country && TENSION_RULES_BY_COUNTRY[leg.country]) ? tensionOf({ country: leg.country, cps: leg.allCps, cp: leg.cp, dept: leg.dept, lat: leg.lat, lon: leg.lon }) : null;
  });
  var departureTension = TENSION_RULES_BY_COUNTRY[country] ? tensionOf(cityCoord) : null;
  // Trajet au-delà de la distance max entre étapes (8e audit du 18/09/2026) : seul l'éloignement minimum peut l'imposer
  // (premier trajet, et retour d'un séjour à une étape, voir legCapKm). Il était accepté sans rien dire ; il est
  // désormais signalé sur le trajet concerné. Distance comparée : celle de legAllowed (partie routière pour un ferry).
  // Journées sur place (même lieu que la veille, petit trajet local) exclues : elles ne doivent rien à l'éloignement
  // (9e audit du 18/09/2026 : « Corbas → Corbas, 11 km » était signalé comme imposé par l'éloignement minimum).
  if(minDistanceKm > 0){
    legs.forEach(function(leg, i){
      if(i > 0 && !leg.isReturn && leg.norm && leg.norm === legs[i - 1].norm) return;
      var km = leg.ferryInfo ? leg.roadKm : leg.distanceKm;
      if(km > maxLegKm + 0.5) leg.overMaxLeg = { max: maxLegKm, min: Math.round(minDistanceKm) };
    });
  }
  // Restrictions de circulation (van, moto) : par trajet, depuis l'étape précédente (ou le départ).
  var notices = [];
  // Pays traversés par chaque trajet (11e audit du 19/09/2026), pour les rappels de vignette : échantillons tous les
  // ~10 km le long du trait, pays du lieu habité le plus proche (countryAtPoint) ; un pays seulement traversé est retenu
  // s'il l'est sur au moins 30 km d'affilée avec un point franchement à l'intérieur — même règle que le péage de transit,
  // pour ne pas compter une frontière frôlée. Pas pour le vélo (aucune vignette), ni les journées sur place.
  if(transportKey !== 'velo'){
    var prevCross = cityCoord;
    legs.forEach(function(leg){
      if(leg.distanceKm == null && !leg.isReturn){ prevCross = leg; return; }
      if(!leg.ferryInfo) leg.countriesCrossed = countriesAlong(prevCross, leg);
      prevCross = leg;
    });
  }
  if(transportKey === 'van' || transportKey === 'moto'){
    var seenCountries = {}, prevPt = cityCoord;
    legs.forEach(function(leg){
      // Journée sur place (aucun trajet) : aucun avertissement de trajet (11e audit : « route : Reutte » répété 4 jours
      // à Pfronten, rappels de ZFE répétés chaque nuit). Ils sont donnés le jour de l'arrivée.
      if(leg.distanceKm == null && !leg.isReturn){ prevPt = leg; return; }
      var r = restrictionsForLeg(transportKey, prevPt, leg, seenCountries);
      if(r.length) leg.restrictions = r;
      prevPt = leg;
    });
    // Départ situé lui-même dans une zone (ZFE, centre interdit aux motos…) : signalé sur la première étape.
    var dep = restrictionsForLeg(transportKey, null, cityCoord, seenCountries).filter(function(x){ return x.type === 'lez' || x.type === 'ztl' || x.type === 'cityBan'; });
    if(dep.length && legs[0]){
      var seenR = {};
      legs[0].restrictions = dep.concat(legs[0].restrictions || []).filter(function(x){
        var k = x.kind + '|' + x.type + '|' + x.name;
        if(seenR[k]) return false;
        seenR[k] = true;
        return true;
      });
    }
  }
  if(transportKey === 'van' && legs.length) notices.push('van.notice');
  if(TRANSPORT[transportKey].electric && legs.length) notices.push('charge.dataNote');
  // Maximum de jours par ville dépassé (9e audit du 18/09/2026) : au plus MAX_STOPS villes-étapes, ou un itinéraire
  // écourté faute d'étapes (impasse), laissent plus de nuits que le maximum demandé dans une même ville — c'était fait
  // sans rien dire (21 jours avec 1 jour par ville au plus : 20 nuits pour 15 villes au plus). Nuits consécutives au même
  // lieu : une journée par nuit (voir buildItinerary).
  var nuitsIci = 0, depasseJours = false;
  legs.forEach(function(leg, i){
    if(leg.isReturn){ nuitsIci = 0; return; }
    nuitsIci = (i > 0 && leg.norm && leg.norm === legs[i - 1].norm) ? nuitsIci + 1 : 1;
    if(nuitsIci > maxDaysPerCity) depasseJours = true;
  });
  if(depasseJours) notices.push('days.overMaxPerCity');
  var spinPool = buildSpinPool(lat, lon, maxRadiusKm);
  var result = { legs: legs, spinPool: spinPool, departureTension: departureTension, tensionBlocked: tensionBlocked, maxLegKm: maxLegKm, notices: notices,
    chargersLoaded: CHARGER_COUNT };
  if(timedOut) result.timedOut = true;
  return result;
  }
}

module.exports = { init, isReady, isSearchReady, searchCity, generateTrip, loadChargingStations,
  // Fonctions partagées avec l'index de recherche précalculé (lib/search-index.js) : même lecture des fichiers,
  // même normalisation des noms, pour des résultats identiques à la recherche en mémoire.
  internals: { normalizeCityName, parseCommunesFile, parseAliasesOfCountry, IDEOGRAPHIC_RE,
    // Masse terrestre et zone d'un lieu : utilisées par scripts/build-ferry-ports.js pour valider les ports.
    landmassOf, zoneOf,
    // Pays d'un point (lieu habité le plus proche) et calcul complet d'une étape (durée, péage, recharges) : exposés
    // pour les vérifications, qui testent ainsi le code réel plutôt qu'une copie de sa logique.
    countryAtPoint, finalizeLeg } };
