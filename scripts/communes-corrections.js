// Corrections de lieux partagées par les générateurs scripts/build-*-communes.js (septembre 2026, audit n° 10).
//
// POURQUOI UN FICHIER À PART — les fichiers public/data/communes-XX.txt sont GÉNÉRÉS : une ligne supprimée à la main
// revient à la régénération suivante. Chaque exclusion ci-dessous est donc lue par le générateur du pays concerné,
// au moment où il parcourt le dump GeoNames, AVANT le dédoublonnage.
//
// 1. LIEUX RANGÉS DANS LE MAUVAIS PAYS (WRONG_COUNTRY) — GeoNames range parfois un lieu sous le code pays d'un voisin :
//    coordonnées dans un pays, code pays d'un autre, et division administrative (admin1) incohérente avec les
//    coordonnées (Niagané « région de Zinder » à 1 500 km de Zinder, au Mali ; Rengani Jhar « Xinjiang » en Assam ;
//    Pyinmagon « Nong Khai » dans la région de Rangoun). Repérés par l'audit n° 10 : lieu dont le plus proche voisin
//    publié est étranger (< 1,5 km) alors que le plus proche lieu du même pays est à plus de 15 km. Chaque cas a été
//    vérifié un par un : pays réel du point d'après les limites OpenStreetMap (géocodage inverse Nominatim), recherche
//    du même lieu dans le fichier du bon pays et dans son dump GeoNames.
//    - « doublon » : le même lieu est déjà publié dans le fichier du bon pays (nom identique ou variante de
//      translittération, à moins de 3 km) : la copie mal rangée est simplement écartée.
//    - « absent » : le lieu n'existe pas dans le bon pays. Il est écarté aussi plutôt que déplacé : son entrée GeoNames
//      porte la division administrative de l'autre pays (le générateur du bon pays en tire la région et l'étiquette
//      de code, il faudrait donc les inventer), et tous ces lieux sont des hameaux sans population renseignée.
//    NON retenus (vérifiés, laissés tels quels) : villes frontalières réelles dont le point GeoNames, arrondi à la
//    minute d'arc (~1,8 km), tombe à moins d'un kilomètre du mauvais côté (Chirundu et Nyamapande au Zimbabwe,
//    Amucotocapa en Angola) ; villes jumelles présentes des deux côtés (Guruve ZW, Aceguá BR/UY, Coutts, North Portal,
//    Pigeon River, Rainy River, Estcourt Station, Monaco, Ad Darbāsīyah, Kobané, Buhodle, Albazino, Ushakovo…) ;
//    territoires disputés, repris TELS QUELS comme partout ailleurs dans ce projet (Ariel en Cisjordanie, Sansha /
//    Hoàng Sa aux Paracels, Congsa dans la vallée de Nelang).
//
// 2. BASES ANTARCTIQUES SOUS « AR » — GeoNames range 32 bases de l'Antarctique (Great Wall, King Sejong,
//    Bellingshausen, Arctowski, Vernadsky…) sous le code AR, division « Tierra del Fuego » (revendication argentine,
//    gelée par le traité sur l'Antarctique). Elles sortent de communes-ar.txt (tout lieu AR au sud de 60° S, limite du
//    traité) et sont reprises par build-antarctique-communes.js, qui les fusionne avec les bases déjà décrites sous AQ
//    (même règle de doublon que pour les entrées AQ entre elles) ou les ajoute à communes-aq.txt si elles manquaient.
//
// 3. LIEUX DISPARUS « (historical) » — convention GNIS/NGA reprise par GeoNames : le suffixe « (historical) » marque
//    un lieu qui n'existe plus (ville fantôme, village noyé, quartier absorbé). Même règle que l'exclusion des codes
//    PPLQ/PPLW (lieux abandonnés/détruits) et des stations « (historical) » de l'Antarctique.
//
// 4. SERCQ (SARK) — exclue de communes-gg.txt pour la raison documentée dans build-country-communes.js et le README
//    (section Ferries) : île sans voitures, aucune liaison en ferry pour véhicules, trajet impossible quel que soit le
//    mode. L'ancienne exclusion par nom (« Sark », « La Seigneurie ») laissait passer 14 hameaux de l'île ; le filtre
//    est désormais une zone, la même que la règle d'île « sark » de scripts/iles/iles-atlantique-nord.js
//    (49,40–49,45° N, 2,40–2,33° O), qui ne touche ni Guernesey (côte est à 2,52° O) ni Herm (2,45° O).
//
// GÉNÉRATEURS QUI LISENT CE FICHIER : build-sahel-corne, build-westafrica, build-afrique-australe, build-golfe,
// build-asie, build-ameriques, build-country-communes (filtre excludePlace) et build-antarctique (reprise des bases AR).
// Tous ont été relancés après l'ajout, SAUF build-country-communes.js : ses fichiers postaux (scripts/postal/GG_postal.txt,
// GB_postal.txt…) ne sont plus sur le disque, il ne peut pas régénérer ses pays hors ligne. Pour lui, le même filtre
// excludePlace a été appliqué aux fichiers publiés par un script de l'audit, ligne à ligne : communes-gg.txt (14 hameaux
// de Sercq) et communes-gb.txt (1 lieu « (historical) », Stobcross) — aucun autre pays de ce générateur n'est touché.
// À la prochaine régénération de ces pays, le filtre du générateur donnera le même résultat.

// geonameid -> [pays du dump, nom, pays réel, 'doublon' | 'absent', détail]
const WRONG_COUNTRY = {
  // Afrique de l'Ouest / Sahel
  '2423034':  ['GN', 'Biramadougou', 'ML', 'absent', 'région de Koulikoro, au nord de Kangaba'],
  '10376455': ['NE', 'Niagané', 'ML', 'doublon', 'Niarané (communes-ml.txt, 0,3 km), cercle de Kayes ; fiche NE « région de Zinder »'],
  '11204775': ['NG', 'Niakaramadougou', 'CI', 'doublon', 'Niakaramandougou (communes-ci.txt, 0,3 km) ; fiche NG « Kwara State »'],
  // Corne de l'Afrique
  '329921':   ['ET', 'Ohale', 'SO', 'doublon', 'Oohaale (communes-so.txt, mêmes coordonnées), Hiiraan'],
  '199122':   ['KE', 'Damasa', 'SO', 'doublon', 'Dhamas (communes-so.txt, 1,3 km), Gedo'],
  // Afrique centrale et australe
  '2396769':  ['GA', 'Otana', 'CG', 'doublon', 'Otana (communes-cg.txt, 0,6 km), point dans les Plateaux (Congo)'],
  '1045500':  ['MZ', 'Guruve', 'ZW', 'doublon', 'Guruve (communes-zw.txt, 1,1 km), Mashonaland Central'],
  '978535':   ['ZA', 'Masabe', 'MZ', 'absent', 'province de Maputo, à 60 km au nord de la frontière du KwaZulu-Natal'],
  '987188':   ['ZA', 'Kristal', 'SZ', 'absent', 'région de Manzini ; fiche ZA « Northern Cape »'],
  // Golfe / Moyen-Orient
  '107946':   ['SA', 'Aţ Ţawīlah', 'YE', 'doublon', 'Aţ Ţawīlah (communes-ye.txt, 2,5 km), à côté de Saada'],
  '25913':    ['IR', 'Doāb', 'IQ', 'absent', 'gouvernorat de Souleimaniye, à l\'ouest de Halabja'],
  // Asie centrale
  '1215650':  ['UZ', 'Bashir', 'TM', 'absent', 'province de Lebap'],
  '1216330':  ['UZ', 'Pinën', 'TJ', 'doublon', 'Pinyon (communes-tj.txt, 1,4 km), Sughd'],
  '1512247':  ['UZ', 'Baskunchi', 'KZ', 'doublon', 'Basqynshy (communes-kz.txt, 0,8 km), à 80° E, loin de l\'Ouzbékistan'],
  '1514767':  ['TM', 'Moskva', 'UZ', 'absent', 'province du Khorezm, près de Qo\'shko\'pir'],
  // Asie du Sud et du Sud-Est
  '8431173':  ['BT', 'Māgo', 'IN', 'absent', 'Mago, district de Tawang (Arunachal Pradesh)'],
  '9035670':  ['CN', 'Rengani Jhar', 'IN', 'absent', 'Assam ; fiche CN « Xinjiang »'],
  '1117192':  ['TH', 'Ban Noe Khi', 'MM', 'absent', 'État Karen, à l\'ouest de la Moei (frontière)'],
  '1463048':  ['TH', 'Pyinmagon', 'MM', 'doublon', 'Pyin Ma Kone (communes-mm.txt, 2,6 km), région de Rangoun ; fiche TH « Nong Khai »'],
  // Amériques
  '3611942':  ['HN', 'El Crique', 'GT', 'absent', 'département d\'Izabal'],
  '3612018':  ['HN', 'El Copante', 'SV', 'absent', 'département de San Miguel ; fiche HN « Intibucá »'],
  '3496786':  ['DO', 'María Bonita', 'HT', 'absent', 'Nord-Est haïtien, mêmes coordonnées que Salnave (HT) ; fiche DO « La Romana »'],
  '3681019':  ['CO', 'Hato Buenavista', 'VE', 'absent', 'État de Táchira ; fiche CO « Casanare »'],
  '3766574':  ['CO', 'Puerto Elvira', 'PE', 'doublon', 'Puerto Elvira (communes-pe.txt, 0,2 km), Loreto'],
  '8182275':  ['CO', 'La Esmeralda', 'VE', 'doublon', 'La Esmeralda (communes-ve.txt, 0,2 km), Amazonas ; fiche CO « Valle del Cauca »']
};

function isWrongCountry(country, geonameid){
  const e = WRONG_COUNTRY[geonameid];
  return !!(e && e[0] === country);
}

// Lieux disparus (convention GNIS/NGA) : « Stobcross (historical) », « Cutler Ridge  (historical) »…
const HISTORICAL_NAME_RE = /\(historical\)\s*$/i;

// Limite du traité sur l'Antarctique : lieux du dump AR au sud de 60° S -> repris sous AQ.
const ANTARCTIC_TREATY_LAT = -60;
function isAntarcticUnderAR(country, lat){ return country === 'AR' && lat < ANTARCTIC_TREATY_LAT; }

// Sercq : même zone que la règle d'île « sark » (scripts/iles/iles-atlantique-nord.js).
const SARK_BOX = { latMin: 49.40, latMax: 49.45, lonMin: -2.40, lonMax: -2.33 };
function isSark(country, lat, lon){
  return country === 'GG' && lat >= SARK_BOX.latMin && lat <= SARK_BOX.latMax && lon >= SARK_BOX.lonMin && lon <= SARK_BOX.lonMax;
}

// 5. NOMS QUI SONT DES COMMENTAIRES D'ÉDITEURS OU DES MARQUES DE LIEU INCONNU (septembre 2026, suite de l'audit n° 10) :
//    fiches GeoNames dont le champ « nom » contient une remarque de contributeur au lieu d'un nom — « There's no such a
//    place here. » (TM 162203), « Kum-Bel’ (not a PPL, delete?) », « Chukur (only fields... delete?) », « Bulak (Bulak =
//    Source/Water, not inhabited, delete?) » (KG), « Alpe Balma Rossa (? coordinate GPS ?) » (IT, coordonnées douteuses
//    selon la fiche elle-même) — ou une simple marque d'absence de nom : « Unknown » (BD 7487588), « Wuming? » (CN
//    10036224, alias chinois « 无名? », « sans nom ? »). Le lieu n'est pas attesté : écarté, et ses alias avec lui.
//    Motif (commentaires) + liste exacte (marques d'absence de nom, trop courtes pour un motif sans faux positif :
//    « 无名坑 », « Nameless » (Tennessee), « Bezymyannoye » sont de VRAIS noms de lieux, gardés).
const EDITOR_COMMENT_NAME_RE = /delete\?|no such a? ?place|not a PPL|not inhabited|\(\?[^)]*\?\)/i;
const PLACEHOLDER_NAMES = new Set(['Unknown', 'Wuming?']);
// 6. CARACTÈRES PERDUS (« ? ») DANS LE NOM — huit fiches indiennes récentes dont le champ « name » (et « asciiname ») a
//    perdu des caractères à la saisie : « Saizawh ?E? », « Mar?S? », « Lebur Bit ? I »… (probablement des parenthèses
//    ou des tirets non ASCII). Quand la MÊME fiche (même geonameid) donne une forme propre — champ « alternatenames » du
//    dump IN_dump.txt, repris à l'identique dans scripts/altnames/IN.txt —, elle remplace le nom (NAME_FIXES) ; elle est
//    cohérente avec les voisines déjà publiées (« Marpara North », 796710, à côté de « Marpara South »). Sinon le lieu
//    est écarté (LOST_CHARS_RE ci-dessous, appliqué APRÈS NAME_FIXES) : reconstituer « Saizawh East » ou « Lebur Bit-I »
//    serait une supposition. Écartés faute de source : Saizawh ?E? (1257734), Bualpui NG ?E? (13645551), Lebur Bit ? I
//    (13645557), Survepalle Bit ? II (13645558).
// geonameid -> [pays, nom GeoNames, nom corrigé, source]
const NAME_FIXES = {
  '13645550': ['IN', 'Kawlchaw ?E?', 'Kawlchaw East', 'IN_dump alternatenames + altnames/IN.txt 20699185'],
  '13645552': ['IN', 'Sangau ?E?', 'Sangau East', 'IN_dump alternatenames + altnames/IN.txt 20699186'],
  '13645553': ['IN', 'Sangau ?W?', 'Sangau West', 'IN_dump alternatenames + altnames/IN.txt 20699187'],
  '13645554': ['IN', 'Mar?S?', 'Marpara South', 'IN_dump alternatenames + altnames/IN.txt 20699188']
};
function fixName(country, geonameid, name){
  const e = NAME_FIXES[geonameid];
  return (e && e[0] === country && e[1] === name) ? e[2] : name;
}
const LOST_CHARS_RE = /\?/;
function isJunkName(name){ return EDITOR_COMMENT_NAME_RE.test(name || '') || PLACEHOLDER_NAMES.has(name) || LOST_CHARS_RE.test(name || ''); }

// Filtre commun, appelé par chaque générateur sur chaque ligne du dump : true = lieu écarté.
function excludePlace(country, geonameid, name, lat, lon){
  return isWrongCountry(country, geonameid) || HISTORICAL_NAME_RE.test(name || '') || isJunkName(name) ||
    isAntarcticUnderAR(country, lat) || isSark(country, lat, lon);
}

module.exports = { NAME_FIXES, fixName, LOST_CHARS_RE, WRONG_COUNTRY, isWrongCountry, HISTORICAL_NAME_RE, EDITOR_COMMENT_NAME_RE, PLACEHOLDER_NAMES, isJunkName, ANTARCTIC_TREATY_LAT, isAntarcticUnderAR, SARK_BOX, isSark, excludePlace };
