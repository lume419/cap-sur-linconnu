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
//    Audit n° 11 (même méthode, Nominatim : pays du polygone contenant le point, puis objet OSM le plus proche) —
//    retenu : Daba Gorayale (ET, doublon, voir la liste). NON retenus, point dans le bon pays : Oswin Mukulu (AO,
//    province de Cunene, zone résidentielle OSM au même point, à 0,6 km d'Ontilindi NA), Ban San Keo (KH, Siem Pang),
//    El Sacrificio (GT, village OSM au même point, Petén), Panapana et Yacare (CO, Yavaraté, Vaupés), Candado Grande
//    (AR, Orán ; l'homonyme BO est à 17 km, à Bermejo), Sete Quedas (BR, chef-lieu de la commune du Mato Grosso do Sul).
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
// GÉNÉRATEURS QUI LISENT CE FICHIER (depuis l'audit n° 11, TOUS les générateurs de lieux) : build-sahel-corne,
// build-westafrica, build-afrique-australe, build-golfe, build-asie, build-ameriques, build-country-communes,
// build-antarctique (reprise des bases AR), et depuis l'audit n° 11 build-maghreb, build-gr, build-oceanie,
// build-russie-svalbard, build-cameroun, build-govfallback, build-sy, build-am, build-ba, build-ge, build-me, build-xk et
// build-sainte-helene-eparses. Chacun appelle preparePlaceName (noms), excludePlace (lieux écartés) et
// dropNearDuplicates (quasi-doublons) — voir les sections 7 à 9 plus bas.
// Audit n° 10 : tous relancés après l'ajout, SAUF build-country-communes.js : ses fichiers postaux (scripts/postal/
// GG_postal.txt, GB_postal.txt, IT_postal.txt…) ne sont plus sur le disque, il ne peut pas régénérer ses pays hors
// ligne. Pour lui, le même filtre excludePlace a été appliqué aux fichiers publiés, ligne à ligne : communes-gg.txt (14
// hameaux de Sercq), communes-gb.txt (1 lieu « (historical) », Stobcross) et communes-it.txt (« Alpe Balma Rossa (?
// coordinate GPS ?) », commentaire d'éditeur de la section 5, retiré à la main) — aucun autre pays de ce générateur
// n'était touché. (Ce commentaire ne citait que GG et GB jusqu'à l'audit n° 11, qui l'a corrigé.)
// Audit n° 11 : même situation pour build-country-communes.js, et aussi pour build-ba-communes.js (scripts/
// ba-postal-wiki.json absent) et build-me-communes.js (le dump ME actuel donne une autre population pour Bar : le
// fichier publié n'est plus reproductible à l'identique). Pour ces trois générateurs, le code est corrigé ET le même
// traitement est appliqué aux fichiers publiés par un script de l'audit (lignes visées seulement) ; à la prochaine
// régénération, le générateur donnera le même résultat.
// 12e audit du 19/09/2026 : MX et CU (build-ameriques-communes.js, ONLY_COUNTRY ajouté), NP, KR et CN
// (build-asie-communes.js) régénérés — reproduits à l'octet près AVANT la correction, puis seules les lignes visées ont
// changé. HR et ES (build-country-communes.js, fichiers postaux absents) NE SONT PAS régénérés et leurs fichiers publiés
// n'ont pas été retouchés : « Zorkovac_ », « Donja_Podgora », « Gornje_Zagorje » (HR), « XXX » et « Test » (ES)
// restent publiés jusqu'à la prochaine régénération avec GeoNames HR_postal / ES_postal ; les corrections sont en place
// ci-dessous (NAME_FIXES, JUNK_IDS) et tests/data.test.js les tient pour « en attente » tant qu'elles le sont.
// 13e audit du 19/09/2026 : parenthèses non appariées (hasUnbalancedParen), tout « _ » dans un nom, fêtes népalaises
// « Fair (…) », blocs administratifs indiens et nom « 17 » (ZW) — voir les sections 5 et 6. Régénérés : RU
// (build-russie-svalbard), AL (build-country-communes, ONLY_COUNTRY ajouté, AL_postal.txt présent), CI
// (build-westafrica), NG (build-sahel-corne), CD et ZW (build-afrique-australe), YE (build-golfe), NP, IN et PK
// (build-asie), chacun reproduit à l'octet près AVANT la correction. Tous les générateurs jugent désormais le nom
// PUBLIÉ (renommages propres au générateur compris) : aucune sortie n'a changé (générateurs relancés, et comparaison ligne
// à ligne des décisions pour les pays non régénérables : ES, HR, IT, DE…, BA).

// geonameid -> [pays du dump, nom, pays réel, 'doublon' | 'absent', détail]

// Normalisation des noms : CELLE DU MOTEUR, pas une copie (19e audit du 21/09/2026). Le dédoublonnage et la
// recherche doivent voir les mêmes doublons : leur divergence laissait passer 317 paires de lieux identiques à moins
// de 300 m dans une même case de 0,01°.
const { normalizeCityName } = require('../lib/trip-engine.js').internals;
const WRONG_COUNTRY = {
  // Afrique de l'Ouest / Sahel
  '2423034':  ['GN', 'Biramadougou', 'ML', 'absent', 'région de Koulikoro, au nord de Kangaba'],
  '10376455': ['NE', 'Niagané', 'ML', 'doublon', 'Niarané (communes-ml.txt, 0,3 km), cercle de Kayes ; fiche NE « région de Zinder »'],
  '11204775': ['NG', 'Niakaramadougou', 'CI', 'doublon', 'Niakaramandougou (communes-ci.txt, 0,3 km) ; fiche NG « Kwara State »'],
  // Corne de l'Afrique
  '329921':   ['ET', 'Ohale', 'SO', 'doublon', 'Oohaale (communes-so.txt, mêmes coordonnées), Hiiraan'],
  '199122':   ['KE', 'Damasa', 'SO', 'doublon', 'Dhamas (communes-so.txt, 1,3 km), Gedo'],
  // Audit n° 11 : même village que Davegoriale (SO 61721, mêmes noms alternatifs « Daba Gorayyale »), village OSM
  // « Daba-Goroyaale » au point SO (8,7300 N ; 44,8226 E, Togdheer) ; le point ET, arrondi (44,82 E), tombe à 0,7 km de
  // l'autre côté de la frontière (Jarar, Éthiopie).
  '444995':   ['ET', 'Daba Gorayale', 'SO', 'doublon', 'Davegoriale (communes-so.txt, 0,7 km), Togdheer ; point ET arrondi côté éthiopien'],
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
//    Audit n° 11 — le motif n'attrapait que « delete? ». Élargi aux autres mots d'éditeur, chacun vérifié sur TOUS les
//    fichiers publiés (lignes touchées relues une à une, aucun vrai nom de lieu) : « DELETE » (MA), « Kypchak-Talaa
//    (duplicate, please delete) » (KG, doublon de Kypchak-Talaa publié au même point), « Duplicate » (LR 2277024),
//    « Redford DUPLICATE OF https://www.geonames.org/5006917/redford.html » (US 7259466, Redford MI déjà publiée),
//    « Greece (historical region) » (GR), « 50 km.] [ROAD DESTINATION: Irafayle » (ER, note de carte routière),
//    « G@ufu » (BI), « Dom 957 m2 nad jeziorem Iławskim z basenem… » (PL, petite annonce immobilière).
//    Formes retenues et faux positifs écartés : mots entiers seulement (« please » ne prend pas « Mount Pleasent
//    Heights ») ; « m2 » seulement après un nombre (« M2 Salazares », MX, gardé) ; « project » N'EST PAS un motif — les
//    « Projecto de Assentamento » (BR) et « Project Colony » (IN) sont de vrais lieux habités — voir PROJECT_BATCH plus
//    bas pour le lot népalais ; crochets seulement NON appariés (BROKEN_BRACKET_RE) — « El Molino [Ranchería] » (MX) et
//    « Rāyāt [2] » (IQ) sont gardés.
// « not permanent » ajouté au 18e audit du 21/09/2026 : FM 7627387 publiait « Kapingamarangi Settlement not
// permanent » — le champ « nom » de la fiche EST la note de son éditeur. Et le point (7,62 N / 155,16 E) est l'île
// d'Oroluk, à 730 km de Kapingamarangi (atoll à 1,067 N), dont le village est publié par ailleurs (fiche 7626849) :
// ni le nom ni la position n'étaient exploitables. Seul cas des 4,8 millions de noms publiés, mais la famille était
// déjà connue — « not inhabited » et « not a PPL » figuraient ici depuis longtemps ; c'est la tournure qui manquait.
// Le contrôle d'isolement de tests/data.test.js ne pouvait pas le voir : 340 km entre cases de 1°, sous son seuil.
const EDITOR_COMMENT_NAME_RE = /delete\?|\bdelete\b|\bduplicate\b|\bplease\b|no such a? ?place|not a PPL|not inhabited|not permanent|\(\?[^)]*\?\)|https?:\/\/|www\.|\(historical region\)|ROAD DESTINATION|@|\d\s?m2\b|\d\s?m²/i;
//    12e audit du 19/09/2026 — marques d'absence de nom restées publiées, relevées par un balayage de TOUS les fichiers
//    communes-*.txt (nom complet seulement, avec ou sans précision entre crochets ou parenthèses ; chaque fiche relue
//    dans scripts/dump/) :
//    - « Ninguno » (« aucun ») : 313 lieux au Mexique — « Ninguno » seul (114) ou suivi de la description INEGI de ce
//      qui se trouve au point : « Ninguno [CERESO] » (prison), « Ninguno [Gasolinera] », « Ninguno [Granja] », nom d'un
//      particulier (« Ninguno [Juan Vargas] »)… Ce n'est pas un nom de localité : écartés. « El Ninguno » (Sinaloa),
//      vrai nom, gardé ;
//    - « Sin Nombre » (« sans nom ») : 3 lieux à Cuba (fiches 3536093, 3536098, 12343665 ; les autres fiches « Sin
//      Nombre » du dump sont des lieux-dits LCTY ou un cours d'eau, jamais publiés) ;
//    - « NONE » (NP 7969823, PPLL, aucun autre nom sur la fiche). « None » (casse ordinaire) N'EST PAS retenu : commune
//      du Piémont (IT 3172215), None au Timor occidental (ID), Naune/None (JP) ;
//    - bruit isolé (identifiant d'utilisateur au lieu d'un nom, aucun autre nom sur la fiche) : « Autonomia_clinicsf25 »
//      (MX 13631709, PPLL de 2026, doublon d'une fiche CTRM « clinique » au même point), « Kumoh_student » (KR 10942872,
//      doublon d'une fiche AREA au même point : étudiants de l'université Kumoh, Gumi).
//    Faux positifs vérifiés et GARDÉS (vrais toponymes) : « No Name » (Colorado, US 8479302, 123 hab.), « Nameless »
//    (Tennessee), « Bezimenne » (UA), « Adsız » (TR), « Name » (CN, « 那么 »), « Nada », « Nil », « Na », « Nom »,
//    « Lugar », « Ville », « Place », « Village », « Todo », « Temp » (RU, « Темп »), « Sample », « Blank » (US)…
//    Aucune forme « Sin nombre », « Sem nome », « Sans nom », « Unnamed », « Без названия », « 无名 », « N/A » ou « - »
//    seule dans les fichiers publiés.
const PLACEHOLDER_NAMES = new Set(['Unknown', 'Wuming?', 'Ninguno', 'Sin Nombre', 'NONE', 'Autonomia_clinicsf25', 'Kumoh_student']);
// Marque d'absence de nom suivie d'une précision (« Ninguno [CERESO] », « Ninguno (Ejido Villa Hermosa) »).
const PLACEHOLDER_QUALIFIED_RE = /^(?:Ninguno|Sin Nombre)\s*(?:\[[^\]]*\]|\([^)]*\))$/;
// Fiches écartées une à une (12e audit du 19/09/2026), geonameid -> [pays, nom, motif] :
const JUNK_IDS = {
  // Fiche de test : ferme (PPLF) créée en 2015 sous le nom « Test », sans aucun autre nom, en pleine campagne de Jaén.
  '10792572': ['ES', 'Test', 'fiche de test (PPLF de 2015, aucun autre nom)'],
  // Nom latin suivi de caractères chinois qui n'en sont pas la transcription (« 父听过 », « fu ting guo » : « père a
  // entendu ») ; la fiche ne donne aucune autre forme. Garder « Qiancheli » seul serait une supposition : écarté,
  // comme les noms à caractères perdus (section 6).
  '1554185': ['CN', 'Qiancheli-父听过', 'nom incertain (suffixe chinois sans rapport, aucune autre forme)'],
  // 13e audit du 19/09/2026 — nom réduit à un nombre : « 17 » (PPL de 2017, Masvingo), aucun autre nom sur la fiche
  // (ni asciiname différent, ni alternatename, rien dans altnames/ZW.txt) ; seul nom purement numérique de tous les
  // fichiers publiés. Numéro de parcelle ou de village de réinstallation probable, mais le nom réel est inconnu : écarté.
  '11523315': ['ZW', '17', 'nom réduit à un nombre, aucune autre forme sur la fiche']
};
// 13e audit du 19/09/2026 — fiches qui ne sont PAS des lieux habités, vérifiées une à une dans scripts/dump/ :
// - Népal : 22 fêtes saisies comme lieux (PPLL, import des 17 et 18/10/2019, le même que « Salgaun] » et « Ke_Gaun ») —
//   « Fair (Shivaratri) », « Fair(Paus 15) », « Annual Fair (Shrawan) », « Fair » seul… : le nom est celui d'une fête
//   (Shivaratri, Kartik, Maghe Sankranti, Janai Purnima…) ou « foire », jamais celui d'un village ; aucun autre nom sur
//   les fiches. « Bada Dashai) » (8001519, fiche suivante, 0,1 km) est la fin coupée de « Fair(Chaitra Dashai& Bada
//   Dashai) » (8001518) ; elle est écartée par hasUnbalancedParen. Aucune autre fiche NP du dump ne contient « Fair ».
// - Inde : 8 blocs de développement (« Neturia (community development block) », « Salboni (community development
//   block », « Sohela (Community Development Block) »…), subdivisions administratives saisies en PPLL le 06/01/2024
//   (plage 8740807-8740826), plus « Khejuri II » (8740812, même plage, même date, PPLL) : le chiffre romain est celui du
//   bloc (Khejuri I et II, Purba Medinipur), aucun village ne porte ce nom. Le chef-lieu du bloc, quand il existe comme
//   lieu, a sa propre fiche (Sohela, Debra, Neturia, Contai… publiés à part). NON retenus, même plage : Gaisilet
//   (8740827) et Khaprakhol (8740839), qui sont aussi des villages.
[
  [7945577, 'Fair (Baishakhe Purnima)'], [7945588, 'Fair (Kartik)'], [7945775, 'Fair (Kartik)'], [7945781, 'Fair (Bhadra)'],
  [7950829, 'Annual Fair (Shrawan)'], [7958461, 'Fair (Shivaratri)'], [7960244, 'Fair(Haribodhani Ekadashi'], [7960251, 'Fair(Paus 15)'],
  [7966049, 'Fair(Phagu Purnima)'], [7966050, 'Fair(Phagu Purnima)'], [7966570, 'Fair(Chaitra-Astami)'], [7966582, 'Fair(Fhagu Fullmoon)'],
  [7966607, 'Fair(Shivaratri)'], [7966871, 'Fair(Chaitra Fullmoon)'], [7978532, 'Fair (Janaipurnima to naw'], [7978623, 'Fair (Maghe Shankranti)'],
  [7979115, 'Fair (Chaitra-Astami)'], [8000733, 'Fair'], [8001381, 'Fair'], [8001518, 'Fair(Chaitra Dashai&'],
  [8004353, 'Fair(Baishakh Sankranti)'], [8004378, 'Fair']
].forEach(([id, n]) => { JUNK_IDS[id] = ['NP', n, 'fête, pas un lieu habité (PPLL, import des 17-18/10/2019)']; });
[
  [8740807, 'Neturia (community development block)'], [8740810, 'Contai III (community development block'],
  [8740812, 'Khejuri II'], [8740813, 'Narayangarh (community development block)'], [8740815, 'Salboni (community development block'],
  [8740817, 'Garhbeta II (community development block)'], [8740821, 'Keshiari (community development block)'],
  [8740824, 'Debra (community development block)'], [8740826, 'Sohela (Community Development Block)']
].forEach(([id, n]) => { JUNK_IDS[id] = ['IN', n, 'bloc de développement (subdivision administrative), pas un lieu habité (PPLL du 06/01/2024)']; });
// 14e audit du 19/09/2026 — DOUBLONS EN ÉCRITURE LOCALE SEULE dans des fichiers romanisés (JP, KR, KP, CN, IR) : fiche P
// dont le nom n'a aucune lettre latine (« 姫路 », « 尼崎 », « 하의 », « دهان »…), sans forme latine sur la fiche (asciiname =
// lecture chinoise « zhen lu » pour 姫路, ou rien), ET dont le nom exact (ou suivi de 市/町) est un alternatename d'une
// AUTRE fiche P publiée, à nom latin, à moins de 2 km : c'est le même lieu, publié deux fois (la seconde fois sous un nom
// que la recherche romanisée ne trouve pas). Relevé par balayage de tous les noms sans lettre latine de ces cinq fichiers
// contre scripts/dump/XX_dump.txt ; le doublon romanisé reste publié. Japon : lot 7302970-7303001 du 21/06/2010 (villes
// de Himeji, Amagasaki, Matsuyama…, 0,2 à 1,9 km du centre GeoNames de la ville). [geonameid, nom, geonameid du lieu
// romanisé gardé, son nom, distance en km]. JP 大馬木 : corrigé par NAME_FIXES (forme romanisée sur la fiche).
// 15e audit du 19/09/2026 — correction de ce commentaire, qui disait « non démontrables, listés dans le README » : 平泉 EST
// démontrable (voir SAME_POINT_DUPLICATES ci-dessous) et aucune liste ne figurait dans le README. Restent GARDÉS, faute
// de preuve (balayage de tous les noms sans lettre latine publiés en JP, KR, KP, CN, IR contre scripts/dump/, fiches
// romanisées publiées à moins de 2 km) : JP 六甲 (7302981 ; fiches Rokkocho et Rokkō-eki = quartier PPLX et gare, non
// publiés) et 御影 (7302982 ; Mikage 11777295 en PPLX, non publié ; Mikagechō-mikage, publié, est à 0,23 km et ne porte
// ni 御影 ni 御影町) ; les autres noms locaux de KP, CN et IR n'ont aucune fiche romanisée publiée au même point.
const LOCAL_SCRIPT_DUPLICATES = {
  JP: [
    [7302970, "志布志", 1852588, "Shibushi", 0.98], [7302974, "三次", 1856698, "Miyoshi", 0.62], [7302976, "出雲", 1861084, "Izumo", 1.09],
    [7302977, "松江", 1857550, "Matsue", 1.7], [7302978, "境港", 1853174, "Sakaiminato", 1.11], [7302979, "姫路", 1862627, "Himeji", 1.44],
    [7302983, "芦屋", 1864985, "Ashiya", 0.77], [7302984, "尼崎", 1865387, "Amagasaki", 0.21], [7302985, "梅田", 6697671, "Umeda", 0.24],
    [7302989, "清水", 1852416, "Shimizumachi", 0.56], [7302990, "沼津", 1854902, "Numazu", 0.63], [7302991, "熱海", 1864945, "Atami", 1.85],
    [7303001, "松山市", 1926099, "Matsuyama", 0.83]
  ],
  KR: [
    [6394638, "하의", 6395304, "Hagui", 0.04], [6395751, "새편", 6396036, "Saep’yŏn", 0], [6395752, "세련동", 6396042, "Seryeondong", 0.08],
    [6395753, "소서호", 6396043, "Soseoho", 0], [6395754, "동역", 6396044, "Dongyeok", 0], [6395756, "목우촌", 6396045, "Moguchon", 0],
    [6395762, "노동", 6396034, "Nodong", 0], [6395763, "사동", 6396048, "Sadong", 0], [6395764, "원서장", 6396058, "Wonseochang", 0.05],
    [6395767, "지동", 6396064, "Jidong", 0], [6395768, "노하", 6396066, "Noha", 0.08], [6395775, "금곡", 6396061, "Kŭmgok", 0],
    [6395776, "배부치기", 6396079, "Paebuch’igi", 0], [6395777, "뱀골", 6396081, "Paem-gol", 0], [6395778, "안태", 6396082, "Ant’ae", 0],
    [6395779, "부호리", 6396049, "Puho-ri", 0], [6395780, "남관", 6396050, "Namgwan", 0], [6395781, "장생이", 6396052, "Changsaengi", 0],
    [6395782, "장활", 6396053, "Changhwal", 0], [6395786, "등넘어", 6396057, "Deungneomeo", 0], [6395788, "계천", 6396028, "Gyecheon", 0],
    [6395789, "율리", 6396029, "Yulli", 0], [6395790, "화암", 6396030, "Hwaam", 0], [6395791, "외지", 6396032, "Oeji", 0],
    [6395797, "새마을", 6396069, "Acheon", 0], [6395798, "송호", 6396071, "Songho", 0], [6395799, "신복", 6396072, "Sinbok", 0.05],
    [6395800, "용산", 6396041, "Yongsan", 0], [6395801, "사동", 6396074, "Sadeung", 0], [6395802, "부곡", 6396075, "Bugok", 0],
    [6395803, "도림정", 6396076, "Dorimjeong", 0], [6395805, "노송", 6396090, "Nosong", 0.07], [6395806, "봉고지", 6396089, "Bunggoji", 0.33],
    [6395807, "춘동", 6396085, "Chundong", 0.05], [6395808, "흑암", 6396092, "Heugam", 0.06], [6395809, "마봉", 6396093, "Mabong", 0],
    [6395810, "영선", 6396088, "Yeongseon", 0], [6395811, "용흥", 6396086, "Yongheung", 0.19], [6395812, "남산", 6396087, "Namsan", 0.05],
    [6395815, "선덕", 6396097, "Seondeok", 0.08], [6395816, "달산", 6396096, "Dalsan", 0.06], [6395817, "향양", 6396095, "Hyangyang", 0.17],
    [6395821, "월하", 6396098, "Wolha", 0], [6395830, "용정", 6396102, "Yongjŏng", 0], [6395831, "남천", 6395981, "Namch’ŏn", 0],
    [6395843, "금산", 6396062, "Kŭmsan", 0], [6395844, "호천", 6396065, "Hoch’ŏn", 0], [6395845, "신금", 6396103, "Sin’gŭm", 0],
    [6395847, "목신", 6396038, "Moksin", 0], [6395849, "대흥", 6396039, "Taehŭng", 0], [6395899, "두주", 6396109, "Dunju", 0.12],
    [6395900, "조산", 6395896, "Josan", 0.57], [6395902, "당산골", 6396118, "Dangsangol", 0], [6395903, "서원", 6396117, "Sŏwŏn", 0],
    [6395904, "거오", 6396113, "Koŏ", 0], [6395905, "월곡", 6396112, "Wŏlgok", 0], [6395906, "원덕", 6396111, "Wondeok", 0],
    [6395907, "평촌", 6396110, "Pyŏng-ch’on", 0], [6395908, "망녕골", 6396120, "Mangnyeonggol", 0], [6395910, "오류동", 6396122, "Oryu-dong", 0],
    [6395911, "가곡", 6396123, "Kagok", 0], [6395912, "신죽", 6396124, "Sinjuk", 0], [6395913, "한천", 6396125, "Hanch’ŏn", 0],
    [6395921, "대운", 6396129, "Daeun", 0.28], [6395924, "신기", 6396033, "Singi", 0], [6395925, "선진", 6396132, "Seonjin", 0.05],
    [6395933, "신월", 6395755, "Sinwol", 0.29]
  ],
  KP: [
    [6275742, "지개골", 6275656, "Chigaegol", 0.12], [6275743, "석간말", 6275657, "Sŏkkanmal", 0.04], [6275744, "지성촌", 6275658, "Chisŏngch’on", 0.15],
    [6275745, "요동", 6275659, "Yo-dong", 0.05], [6275747, "미촌", 6275661, "Mich’on", 0.13], [6275748, "장골", 6275662, "Changgol", 0.25],
    [6275749, "귀대동", 6275663, "Kwidae-dong", 0.39], [6275750, "문골", 6275664, "Mun'gol", 0.2], [6275751, "아론말", 6275665, "Aronmal", 0.08],
    [6275752, "새골", 6275666, "Saegol", 0.52], [6275753, "이장골", 6275667, "Ijangdong", 0.87], [6275754, "곧은골", 6275668, "Kodŭn'gol", 0.52],
    [6275756, "월봉동", 6275670, "Wŏlbong-dong", 0.62], [6275758, "덕동", 6275672, "Tŏk-tong", 0.18], [6275760, "살구벌말", 6275674, "Salgubŏlmal", 0.2],
    [6275761, "학성동", 6275675, "Haksŏng-dong", 0.1], [6275763, "홍촌", 6275677, "Hongch’on", 0.19], [6275764, "용연동", 6275678, "Yongyŏn-dong", 0.13],
    [6275765, "언서골", 6275679, "Yŏnsŏgol", 0.29], [6275766, "웃고인", 6275680, "Ukkoin", 0.31], [6275767, "가촌", 6275681, "Kach’on", 0.13],
    [6275768, "탑동", 6275682, "T’ap-tong", 0.15], [6275769, "아랫말", 6275683, "Araenmal", 0.18], [6275770, "가래나무말", 6275684, "Karaenamumal", 0.28],
    [6275771, "대륜촌", 6275685, "Taeryunch’on", 0.09], [6275774, "남산골", 6275688, "Namsan", 0.07], [6275777, "원골", 6275691, "Wŏn'gol", 0.36],
    [6275780, "풍전리", 6275694, "P'ungjŏn-dong", 0.28], [6275781, "간촌", 6275695, "Kanch’on", 0.4], [6275782, "이동", 6275696, "I-dong", 0.72],
    [6275783, "운니리", 6275697, "Unni-ri", 0.17], [6275784, "고방", 6275699, "Kobang", 0.31], [6275785, "웃돗골", 6275700, "Uttotkol", 0.94],
    [6275786, "판자골", 6275701, "P'anjagol", 0], [6275793, "주암골", 6275708, "Chuamgol", 0.16], [6275796, "중간재", 6275711, "Chungganjae", 0.07],
    [6275797, "도장골", 6275712, "Tojanggol", 0.1], [6275801, "운암", 6275716, "Unam", 0.15], [6275802, "괘전골", 6275717, "Kwaejŏn'gol", 0.14],
    [6275804, "길흥", 6275720, "Kirhŭng", 0.12], [6275805, "초바웃골", 6275721, "Ch'obautkol", 0.03], [6275809, "장재동", 6275725, "Changjae-dong", 0.15],
    [6275811, "천을", 6275727, "Ch’ŏnŭl", 0], [6275812, "임연", 6275729, "Imyŏn", 0], [6275813, "미동", 6275730, "Mi-dong", 0.09],
    [6275814, "간동", 6275731, "Kan-dong", 0.1], [6275815, "진구지", 6275732, "Chin’guji", 0.62], [6275817, "박달", 6275734, "Paktal", 1.29],
    [6275818, "거차리", 6275735, "Kŏch’a-ri", 0], [6275819, "간동", 6275736, "Kan-dong", 0.1], [6275820, "관터", 6275737, "Kwant’ŏ", 0.06],
    [6275821, "거류동", 6275740, "Kŏryu-dong", 0.51]
  ],
  CN: [
    [7011353, "城郊", 7003510, "Chengjiao", 0], [7056451, "高庄", 7056450, "Gumu Gaozhuang", 0.24], [12339813, "兴龙庄村", 12339812, "Xinglongzhuangcun", 0]
  ],
  IR: [
    [7011497, "محمّد آباد گوری", 35293, "Rūstā-ye Faşlī-ye Deh Kheẕrī", 0.09], [7011502, "قلعه سنگ", 35334, "Rūstā-ye Faşlī-ye Ḩoseynābād-e Sangī", 0.04], [7049104, "دهان", 1114744, "Dahān", 0.4]
  ]
};
Object.entries(LOCAL_SCRIPT_DUPLICATES).forEach(([cc, rows]) => rows.forEach(([id, n, keptId, keptName, km]) => {
  JUNK_IDS[id] = [cc, n, 'doublon en écriture locale de « ' + keptName + ' » (fiche ' + keptId + ', ' + km + ' km), qui porte ce nom en alternatename'];
}));
// 15e audit du 19/09/2026 — DOUBLONS AU MÊME POINT, même principe que LOCAL_SCRIPT_DUPLICATES (le lieu reste publié une
// fois, sous son nom romanisé), mais la preuve que les deux noms désignent le même lieu vient d'ailleurs que les
// alternatenames de la fiche gardée. Critère, vérifié fiche par fiche dans scripts/dump/ : les deux fiches P ont les
// MÊMES coordonnées (écart ≤ 0,01 km) ET l'équivalence des noms est donnée par GeoNames lui-même — asciiname de la fiche
// écartée = transcription pinyin du nom gardé (« xiong ji dai » = Xiongjidai), ou une TROISIÈME fiche porte les deux
// formes.
// 16e audit du 20/09/2026 — ce commentaire annonçait « ces six cas seulement » alors que la liste en compte SEPT (3 en
// Chine, 2 en Iran, 2 au Japon), et le septième, Yanagidamen, ne relève d'aucun des deux critères énoncés : il tient au
// FICHIER POSTAL. Les critères retenus sont donc, au choix :
//   a. asciiname de la fiche écartée = transcription pinyin du nom gardé (CN, les 3 cas) ;
//   b. une TROISIÈME fiche, au même endroit, porte les deux formes (IR, les 2 cas ; JP 平泉, fiches 11776759 et 2112731) ;
//   c. les deux fiches partagent le code postal publié et le fichier Japan Post (scripts/postal/JP_postal.txt) nomme
//      cette localité postale du nom gardé, que l'autre fiche porte aussi en alternatename (JP Yanagidamen / Ō-maki).
// Balayage de tous les noms sans lettre latine publiés en JP, KR, KP, CN et IR : ces sept cas seulement.
// [geonameid écarté, nom publié, geonameid gardé, nom gardé, distance en km, preuve]. Le nom écarté n'est rattaché au
// nom gardé PAR LA FUSION que si celui-ci est unique dans le pays (16e audit, voir build-all-aliases.js) : c'est le cas
// de « zh;雄鸡埭;Xiongjidai », « fa;گوانی;Gavānī » et « ja;大馬木;Ō-maki », pas de 蓮湖, 东坑, احمد آباد ni 平泉, dont les
// noms gardés (Lianhu, Dongkeng, Aḩmadābād, Tateishi) désignent 16, 138, 172 et 15 lieux publiés.
// 17e audit du 20/09/2026 — la phrase disait « le nom écarté ne redevient trouvable que si… », ce qui est faux pour
// deux de ces quatre : « zh;东坑;Dongkeng » et « fa;احمد آباد;Aḩmadābād » sont TOUJOURS publiés, non par la fusion mais
// comme noms alternatifs GeoNames de fiches homonymes gardées. Ces deux noms restent donc cherchables — ils renvoient
// simplement les 138 Dongkeng ou les 172 Aḩmadābād sans que le bon lieu en ressorte. Seuls 蓮湖 et 平泉 ont vraiment
// disparu de la recherche. Même remarque pour les 85 lignes de fusion à homonymes des autres tables (surtout KR/KP) :
// 83 gardent un alias publié d'une autre provenance, voir tests/data.test.js.
const SAME_POINT_DUPLICATES = {
  CN: [
    [7506579, '雄鸡埭', 7332719, 'Xiongjidai', 0.01, 'asciiname « xiong ji dai » = Xiongjidai'],
    [8366070, '蓮湖', 8066000, 'Lianhu', 0, 'asciiname « lian hu » = Lianhu ; la fiche gardée porte 莲湖 (forme simplifiée de 蓮湖)'],
    [11145855, '东坑', 11145170, 'Dongkeng', 0, 'asciiname « dong keng » = Dongkeng ; 东坑 porté par d\'autres fiches Dongkeng (1812424…)']
  ],
  IR: [
    [7011509, 'احمد آباد', 7011479, 'Aḩmadābād', 0, 'fiche 35419 (ferme Aḩmadābād à 0,3 km) : Aḩmadābād et احمد آباد'],
    [7049105, 'گوانی', 7049041, 'Gavānī', 0, 'fiche 1336185 (ferme Gavānī à 0,5 km) : Gavānī et گوانی']
  ],
  JP: [
    // Tateishi (7 252 hab.) porte « Hiraizumi » en alternatename ; 平泉 = Hiraizumi d'après les fiches 11776759
    // (Hiraizumi, PPLX, alt 平泉) et 2112731 (Hiraizumi-cho, ADM3, alt 平泉町, Hiraizumi).
    [2112732, '平泉', 2110812, 'Tateishi', 0, 'Tateishi porte « Hiraizumi » ; fiches 11776759 et 2112731 : 平泉 = Hiraizumi'],
    // Deux fiches PPL au même point (35,1167 N ; 133,05 E), même code postal publié 699-1941, que le fichier postal Japan
    // Post (scripts/postal/JP_postal.txt) nomme « Omaki » ; Yanagidamen porte « Ōmaki » et « Omaki » en alternatenames.
    // Gardé : Ō-maki (1854180, ex-大馬木, nom de la localité postale) ; « Yanagidamen » n'a aucun nom rattaché à une
    // langue sur sa fiche et ne peut donc pas devenir un alias.
    [1848564, 'Yanagidamen', 1854180, 'Ō-maki', 0, 'même point, Yanagidamen porte « Ōmaki » ; code postal 699-1941 = Omaki (Japan Post)']
  ]
};
Object.entries(SAME_POINT_DUPLICATES).forEach(([cc, rows]) => rows.forEach(([id, n, keptId, keptName, km, proof]) => {
  JUNK_IDS[id] = [cc, n, 'doublon au même point de « ' + keptName + ' » (fiche ' + keptId + ', ' + km + ' km) : ' + proof];
}));
// 17e audit du 20/09/2026 — COORDONNÉES FAUSSES. Trouvées par le nouveau contrôle « lieu isolé de son pays » de
// tests/data.test.js : trois fiches GeoNames placées à des centaines ou des milliers de kilomètres du pays qui les
// publie. Ce ne sont pas des noms douteux (les filtres ci-dessus ne les voient pas), mais des POINTS faux : gardés,
// ils envoient un voyage à l'autre bout du monde. La coordonnée réelle n'étant connue pour aucun des trois, ils sont
// écartés plutôt que déplacés — jamais de valeur inventée. Chaque cas est prouvé par la fiche elle-même, pas par une
// connaissance générale. [geonameid, pays, nom, preuve]
[
  // Fuseau « Asia/Pontianak » : la SEULE fiche indonésienne des 21 957 de PG_dump.txt (toutes les autres sont en
  // Pacific/Port_Moresby, Pacific/Bougainville ou Pacific/Guadalcanal). Le point tombe au Kalimantan central (Bornéo),
  // à 4 400 km de la Nouvelle-Irlande sous laquelle la fiche est rangée (admin1 15). Le Katingan de Nouvelle-Irlande
  // existe bien : fiche 2094448 « Katingan Aid Post and Mission », à -3,28 / 152,05 — mais c'est un dispensaire
  // (classe S), pas un lieu habité, donc non publié ; écarter 2094449 retire le nom de Papouasie, ce qui est correct
  // puisque le point publié était en Indonésie.
  [2094449, 'PG', 'Katingan', 'fuseau Asia/Pontianak, seul de tout PG_dump.txt : point au Kalimantan (Bornéo), 4 400 km de la Nouvelle-Irlande déclarée'],
  // Latitude et longitude à l'entier exact (26 / 40), fuseau « Asia/Riyadh » : la SEULE fiche des 1 515 de BH_dump.txt
  // qui ne soit pas en Asia/Bahrain. Le point tombe en Arabie saoudite (région de Haïl), à 1 000 km de Bahreïn dont
  // tous les autres lieux sont vers 50,5° E. Coordonnée bouchon : la vraie position de Muqsha' n'est pas sur la fiche.
  [290331, 'BH', 'Magsha', 'coordonnées 26 / 40 à l\'entier exact et fuseau Asia/Riyadh, seul de tout BH_dump.txt : point en Arabie saoudite, 1 000 km de Bahreïn'],
  // Point en plein océan Pacifique (9,49 N / 90,35 O), à 660 km de la côte et à 900 km du reste du Guatemala. La fiche
  // est un doublon mal orthographié (« Cuchumantan » au lieu de « Cuchumatán ») de 3588308, publiée, elle, au bon
  // endroit : 15,5085 / -91,6038, Huehuetenango. Écarter le doublon ne retire donc aucun lieu réel.
  [6942034, 'GT', 'Todos Santos Cuchumantan', 'point en mer (9,49 N / 90,35 O, 660 km au large) ; doublon mal orthographié de la fiche 3588308, publiée à Huehuetenango']
].forEach(([id, cc, n, proof]) => { JUNK_IDS[id] = [cc, n, 'coordonnées fausses : ' + proof]; });
function isJunkId(country, geonameid){
  const e = JUNK_IDS[geonameid];
  return !!(e && e[0] === country);
}
// Crochet non apparié : caractère perdu à la saisie (« Baidaonath[ur » BD, « Bādar[ar Kālusan », « Suppam[ālaiyam » IN :
// « [ » à la place d'une lettre, probablement « p », voisine sur le clavier — supposition, donc lieu écarté comme pour
// « ? » plus bas) ou morceau de note (« 50 km.] [ROAD… »).
const BROKEN_BRACKET_RE = /\[[^\]]*$|^[^\[]*\]/;
// Parenthèse non appariée (13e audit du 19/09/2026) : « ( » jamais refermée ou « ) » sans « ( » avant elle. Nom coupé à
// la saisie (« ADK (Complexe » CI 12687451, « Baindada Market(Friday » NP 7955393, « Fair(Chaitra Dashai& » /
// « Bada Dashai) » NP 8001518-8001519, un nom en deux fiches) ou doublée (« Yasnyy)) », « Troitskiy)) » RU,
// « Shushicë)) » AL). Corrigé par NAME_FIXES quand la fiche donne la forme propre (asciiname ou alternatename), sinon
// lieu écarté — reconstituer la fin d'un nom serait une supposition. Parenthèses imbriquées appariées gardées. Seuls ces
// 11 noms étaient publiés (balayage de tous les fichiers communes-*.txt).
function hasUnbalancedParen(name){
  let depth = 0;
  for(const ch of String(name || '')){
    if(ch === '(') depth++;
    else if(ch === ')' && --depth < 0) return true;
  }
  return depth !== 0;
}
// Souligné (13e audit du 19/09/2026) : caractère de saisie (espace ou séparateur remplacé), jamais d'un toponyme.
// 9 noms publiés : 3 en Croatie (NAME_FIXES, en attente de régénération), « Basti Nizam_ud_din » (PK) et « Ḩudūd ar Rab‘ah
// _ Ar Rab‘ah » (YE), corrigés par NAME_FIXES d'après la fiche ; « Ke_Gaun » (NP 7956662 et 7956663, deux fiches à 2 km,
// PPLL de 2019), « Orile_Imo » (NG 6826378) et « Mwana-Uta_Kambundi » (CD 8447944) : aucune autre forme sur la fiche
// (asciiname identique, aucun alternatename, rien dans scripts/altnames/) — mettre une espace ou un tiret à la place serait
// une supposition : écartés. Test : tests/data.test.js (UNDERSCORE_OK, vide).
const UNDERSCORE_RE = /_/;
// Lot népalais d'activités de projet (audit n° 11) : un contributeur a versé dans GeoNames, sous la classe P (PPL, PPLF,
// PPLL, PPLS), les sites d'activités du projet MaWRiN (WWF, Sindhuli / Okhaldhunga, 2025-2026) — « Participatory
// Assessment by consultancy, MaWRiN Project », « PSC Meeting », « Check dams-Gaghar Sub Watershed-… », « Upgradation of
// animal sheds… », « Renewal of CFOP, … », « Fireline construction at … »… Aucun n'est un lieu habité. Les fiches forment
// deux plages de geonameid continues du dump NP, vérifiées entrée par entrée (aucun vrai lieu dedans, aucune fiche du
// lot en dehors : les plages voisines ±100 ne contiennent aucune entrée NP) : 13405693–13405739 (2025-07) et
// 13679834–13679981 (2026-07). Écartées par plage (un motif de nom ne les attraperait pas toutes sans faux positif :
// « Check Post », « Tourism Training Centre »…).
const PROJECT_BATCH = { NP: [[13405693, 13405739], [13679834, 13679981]] };
function isProjectBatch(country, geonameid){
  const r = PROJECT_BATCH[country]; if(!r) return false;
  const id = Number(geonameid);
  return r.some(([a, b]) => id >= a && id <= b);
}
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
  '13645554': ['IN', 'Mar?S?', 'Marpara South', 'IN_dump alternatenames + altnames/IN.txt 20699188'],
  // Audit n° 11 : champ « name » = adresse Wikipédia du lieu ; le nom est celui de l'article (village de Motarzyn,
  // gmina Białogard ; alias allemand « Muttrin » sur la même fiche). Sans cette correction, le lieu serait écarté par
  // EDITOR_COMMENT_NAME_RE (https://).
  '12451017': ['PL', 'https://en.wikipedia.org/wiki/Motarzyn', 'Motarzyn', 'nom de l\'article Wikipédia cité par la fiche ; alias « Muttrin »'],
  // 12e audit du 19/09/2026 — soulignés et doublons d'écriture dans le champ « name » ; la forme propre vient de la MÊME
  // fiche :
  // - lot croate du 2023-03-11 : « _ » à la place de l'espace ou en fin de nom ; forme croate officielle dans
  //   « alternatenames » (altnames/HR.txt, langue hr, isPreferredName = 1) ;
  '12514110': ['HR', 'Zorkovac_', 'Zorkovac', 'alternatenames + altnames/HR.txt 17475236 (hr, nom préféré)'],
  '12509524': ['HR', 'Donja_Podgora', 'Donja Podgora', 'alternatenames + altnames/HR.txt 17469806 (hr, nom préféré)'],
  '12514105': ['HR', 'Gornje_Zagorje', 'Gornje Zagorje', 'alternatenames + altnames/HR.txt 17470514 (hr, nom préféré)'],
  // - nom latin suivi du même nom dans l'écriture locale : l'asciiname de la fiche (« Damatou da ma tou », « Goam-ri
  //   goamli ») montre que « 大码头 » (dà mǎ tóu) et « 고암리 » (Goam-ri) sont la transcription du nom latin -> nom latin seul,
  //   comme le reste des fichiers CN et KR ;
  '1556529': ['CN', 'Damatou大码头', 'Damatou', 'asciiname « Damatou da ma tou » : 大码头 = Damatou'],
  '11962197': ['KR', 'Goam-ri 고암리', 'Goam-ri', 'asciiname « Goam-ri goamli » : 고암리 = Goam-ri'],
  // - nom remplacé par « XXX » (vandalisme ou test) : l'asciiname de la même fiche a gardé le nom d'origine.
  '3126127': ['ES', 'XXX', 'Casa Blanca', 'asciiname de la fiche (« Casa Blanca »)'],
  // 13e audit du 19/09/2026 — parenthèses non appariées et soulignés (voir hasUnbalancedParen et UNDERSCORE_RE), forme
  // propre donnée par la MÊME fiche :
  '468660': ['RU', 'Yasnyy))', 'Yasnyy', 'asciiname de la fiche (« Yasnyy »)'],
  '481559': ['RU', 'Troitskiy))', 'Troitskiy', 'asciiname de la fiche (« Troitskiy »)'],
  // asciiname « Shushice)) » (même défaut) ; seul alternatename : « Shushica » (forme définie albanaise), repris
  // aussi dans altnames/AL.txt 1354363. Rien ne donne « Shushicë » sans parenthèses : la forme de la fiche est retenue.
  '3184026': ['AL', 'Shushicë))', 'Shushica', 'alternatenames + altnames/AL.txt 1354363'],
  // alternatenames « Basti Nizam_ud_din, Tibbi Nizamuddin, Tibbi Nizāmuddīn » ; altnames/PK.txt 4817793 (en).
  '1392425': ['PK', 'Basti Nizam_ud_din', 'Tibbi Nizāmuddīn', 'alternatenames + altnames/PK.txt 4817793 (en)'],
  // « Ḩudūd ar Rab‘ah _ Ar Rab‘ah » (« limites d'Ar Rab‘ah _ Ar Rab‘ah ») ; alternatename « Ar Rab‘ah »
  // (altnames/YE.txt 3382676) ; les autres « Ar Rab‘ah » publiés sont d'autres lieux (le plus proche à 25 km).
  '7359228': ['YE', 'Ḩudūd ar Rab‘ah _ Ar Rab‘ah', 'Ar Rab‘ah', 'alternatenames + altnames/YE.txt 3382676'],
  // 14e audit du 19/09/2026 — symbole de saisie « # » dans le nom : alternatenames de la fiche « El # Emboque,Emboque ».
  '3891438': ['CL', 'El # Emboque', 'Emboque', 'alternatenames de la fiche (« Emboque »)'],
  // - nom en kanji seul dans le fichier romanisé du Japon ; la fiche donne sa forme romanisée (alternatenames « O-maki,
  //   da ma mu, Ō-maki, 大馬木 », Hepburn avec macron comme le reste de communes-jp.txt).
  '1854180': ['JP', '大馬木', 'Ō-maki', 'alternatenames de la fiche (« Ō-maki »)']
};
function fixName(country, geonameid, name){
  const e = NAME_FIXES[geonameid];
  return (e && e[0] === country && e[1] === name) ? e[2] : name;
}
const LOST_CHARS_RE = /\?/;
// 14e audit du 19/09/2026 — astérisque : marque de renvoi ou de saisie, jamais d'un toponyme. Un seul nom publié,
// « Organización Territorial de Base Comunidad Arroyo* » (BO 12520896, PPL de 2025) : asciiname et alternatenames portent
// le même « * », aucune forme propre sur la fiche -> lieu écarté (retirer le signe serait une supposition sur ce qu'il
// renvoie). « # » n'est PAS un motif : « Larpea #1 », « Larpea #2 » (LR) sont des numéros de villages ; « El # Emboque »
// (CL) est corrigé par NAME_FIXES.
const INPUT_SYMBOL_RE = /\*/;
function isJunkName(name){
  name = name || '';
  return !name || EDITOR_COMMENT_NAME_RE.test(name) || PLACEHOLDER_NAMES.has(name) || PLACEHOLDER_QUALIFIED_RE.test(name) ||
    LOST_CHARS_RE.test(name) || BROKEN_BRACKET_RE.test(name) || hasUnbalancedParen(name) || UNDERSCORE_RE.test(name) || INPUT_SYMBOL_RE.test(name);
}

// 15e audit du 19/09/2026 — RÉPARATION TYPOGRAPHIQUE DES ALIAS, appliquée par build-all-aliases.js (cleanAliasText)
// AVANT le refus par isJunkName. La 14e passe avait écarté 115 lignes d'alias publiées (« _ », parenthèse ou crochet
// orphelin, « * ») sans les réparer ; 82 d'entre elles n'avaient AUCUNE forme propre ailleurs (vérifié ligne par ligne
// dans scripts/altnames/ et scripts/dump/ : « Юхары_шильян » est le seul nom russe de Yuxarı Şilyan, « 伏尔加斯基_ » le seul
// nom chinois de Volzhskiy, « (佐敷町 » le seul « 佐敷町 » de Sashiki…) : le village n'était plus trouvable dans ces langues.
// Règles, dans cet ordre, retenues parce qu'elles sont PUREMENT TYPOGRAPHIQUES (aucune lettre ajoutée ni devinée) :
//   1. « _ » final retiré : reste d'un titre Wikipédia dont la précision a été coupée (« 伏尔加斯基_ » pour
//      « 伏尔加斯基_(萨马拉州) », « Беркли_ », « サンバーナーディーノ_ ») — le nom qui précède est complet ;
//   2. « _ » restant remplacé par une espace : convention des titres MediaWiki, où « _ » EST l'espace (« Иван_Вазово » =
//      « Иван Вазово », « St_Georges_D_Oleron ») — sauf « _ » collé à une espace (séparateur entre deux noms : aucune
//      réparation) ;
//   3. parenthèse ou crochet orphelin EN TÊTE ou EN FIN, seul signe de ce type dans l'alias, retiré (« (佐敷町 »,
//      « Hueschtert) », « Baile an Tirialaigh) », « [چانهاسن، مینه‌سوتا ») : le nom est entier, seul le signe est en trop.
// Le résultat passe ensuite par TOUS les contrôles habituels (isJunkName, égalité au nom publié, doublon d'une ligne
// existante : « Ansemburg) » retombe sur « Ansemburg », déjà publié, et disparaît).
// NON réparés (restent écartés) :
//   - parenthèse orpheline AU MILIEU (« zzLapurdi-) Jatsu », « 景島（Isla Vista)社群 ») ou deuxième parenthèse non
//     appariée (« (پنڈی ہاشم (باڑہ ») : il faudrait deviner où la parenthèse fermait ;
//   - « * » (un seul alias, « CZ*ECO Nelson » pour Eco-Nelson, AQ) : le retirer donne « CZECO Nelson », qui n'est pas un
//     nom — réparation non sûre, et cette forme ne figure sur aucune fiche GeoNames (la station n'a pas de fiche P dans
//     scripts/dump/AQ_dump.txt) ; les formes propres « Eco Nelson », « Base Eco Nelson » sont déjà publiées ;
//   - ALIAS_REPAIR_REJECT ci-dessous : lignes dont la forme réparée désigne une AUTRE entité que le lieu publié (commune
//     rurale, province, gouvernorat, autre ville) ou dont la graphie voulue reste incertaine (forme abrégée ou tronquée).
// 16e audit du 20/09/2026 — POURQUOI PAS DE RÈGLE GÉNÉRALE « la forme réparée doit figurer dans les alternatenames de la
// fiche » : mesurée sur les 115 lignes retirées à la 14e passe, elle n'en garderait que 32 (20 à la lettre près). Elle
// écarterait 83 réparations pourtant sûres et utiles — tous les « _ » finaux des titres chinois (« 伏尔加斯基_ » ->
// « 伏尔加斯基 », seul nom chinois de Volzhskiy), les parenthèses orphelines japonaises (« (佐敷町 » -> « 佐敷町 ») et les
// titres russes (« Иван_Вазово ») : un titre Wikipédia n'est presque jamais recopié tel quel en alternatename. Les cas
// où « _ » ne remplace PAS une espace restent donc traités un par un, ci-dessous, avec leur preuve.
const ALIAS_REPAIR_REJECT = new Map([
  ['Rakvere_vald', 'commune rurale de Rakvere (vald), pas la ville (EE)'],
  ['Põltsamaa_vald', 'commune rurale de Põltsamaa (vald), pas la ville (EE)'],
  ['Paide_vald', 'commune rurale de Paide (vald), pas la ville (EE)'],
  ['Khwaeng_Savannakhet', 'province (khwaeng) de Savannakhet, pas la ville (LA)'],
  ['Mukim_Penyabong', 'mukim (subdivision) de Penyabong, pas le village (MY)'],
  ['وادي_الدواسر_(محافظة)', 'gouvernorat (محافظة) de Wadi ad-Dawasir, pas la ville (SA)'],
  ['Ист_Лансинг', 'East Lansing, autre ville : nom recopié par erreur sur la fiche d\'East Tawas (US 4991692)'],
  ['Килитташ_ке', 'fin tronquée ou abrégée (« ке »), aucune autre forme russe sur la fiche (TR 743330)'],
  ['A_Gojilan', 'initiale abrégée (« A » pour ‘Awlā ou ‘Abd Allah ?), graphie voulue incertaine (IQ 98837)'],
  // 16e audit du 20/09/2026 — trois formes ajoutées, toutes publiées par la 15e passe et fausses :
  //   - « Михальчина_слобода » est le seul nom russe de la fiche UA 701271 (Yasna Poliana) ; or Mykhalchyna Sloboda
  //     EXISTE, fiche 816779 (publiée dans communes-ua.txt ligne 21961, Novhorod-Siverskyi), à 4,85 km. Même motif
  //     qu'« Ист_Лансинг » : titre wiki d'une AUTRE localité recopié sur la fiche. « Yasna Poliana » désignant 12 lieux
  //     publiés, la recherche de « Михальчина слобода » renvoyait 9 d'entre eux dans ses dix premiers résultats, le vrai
  //     village n'arrivant qu'en 4e position (mesuré sur lib/search-index.js avant correction) ;
  //   - « St_Georges_D_Oleron » : ici « _ » remplace les traits d'union ET l'apostrophe de « Saint-Georges-d'Oléron »
  //     (fiche FR 2979916, qui porte Saint-Georges-d'Oléron, Saint-Georges-d'Oleron, Saint-Georges), pas des espaces ;
  //     « St Georges D Oleron » ne figure sur aucune fiche ;
  //   - « Клајо Алабама) » : la parenthèse OUVRANTE manque (titre serbe « Клајо (Алабама) »). La fiche US 4055879 porte
  //     la même troncature en latin (« Klajo Alabama) »), et ses autres formes montrent une virgule perdue
  //     (« klyw  alabama », « کلیو، آلاباما ») : retirer la parenthèse fermante donne une forme qui n'existe nulle part.
  ['Михальчина_слобода', 'Mykhalchyna Sloboda, autre village : nom recopié par erreur sur la fiche de Yasna Poliana (UA 701271) ; la vraie fiche est 816779'],
  ['St_Georges_D_Oleron', '« _ » y remplace les traits d\'union et l\'apostrophe de Saint-Georges-d\'Oléron (FR 2979916), pas des espaces'],
  ['Клајо Алабама)', 'parenthèse ouvrante perdue (« Клајо (Алабама) ») ou virgule (« Clio, Alabama ») : forme voulue incertaine (US 4055879)']
]);
const ORPHAN_HEAD_RE = /^[(\[]/, ORPHAN_TAIL_RE = /[)\]]$/;
// 16e audit du 20/09/2026 — la réparation SANS la liste de refus : sert à retrouver, dans les fichiers déjà publiés, la
// forme qu'une ligne refusée avait prise à la 15e passe (« Михальчина слобода », « St Georges D Oleron »,
// « Клајо Алабама »), pour la retirer au lieu de la laisser derrière (build-all-aliases.js).
function repairAliasLoose(text){ return repairAliasTypography(text, true); }
function repairAliasTypography(text, ignoreReject){
  let t = String(text || '');
  if(!ignoreReject && ALIAS_REPAIR_REJECT.has(t)) return t;
  // « _ » contre une espace : séparateur entre deux noms, pas une espace MediaWiki (« حدود الربعة _ الربعة », YE : « limites
  // d'Ar Rab‘ah _ Ar Rab‘ah », écarté au 13e audit) -> aucune réparation, l'alias reste écarté.
  if(/\s_|_\s/.test(t)) return t;
  if(t.includes('_')) t = t.replace(/_+$/, '').replace(/_+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const signs = (t.match(/[()\[\]（）]/g) || []).length;
  if(signs === 1 && ORPHAN_HEAD_RE.test(t)) t = t.slice(1).trim();
  else if(signs === 1 && ORPHAN_TAIL_RE.test(t)) t = t.slice(0, -1).trim();
  return t;
}

// COORDONNÉE À DEUX ENTIERS EXACTS (18e audit du 21/09/2026, RÉVISÉ au 19e du 21/09/2026).
//
// Ce que le 18e audit affirmait : « GeoNames publie 5 décimales, la probabilité qu'un lieu réel tombe sur deux
// entiers exacts est de l'ordre de 1 sur 10 milliards, soit zéro cas attendu sur 4,8 millions de lieux ». C'ÉTAIT
// FAUX de quatre ordres de grandeur, et 139 fiches ont été écartées sur cette base. Mesure refaite sur les dumps
// eux-mêmes (4 989 386 fiches P/PPL*) : GeoNames ne publie pas cinq décimales pour tout le monde — 0,13 % des fiches
// ont une latitude entière, 1,6 % tombent sur la grille du dixième de degré. Le nombre attendu par pur hasard n'est
// donc pas ~0 mais NEUF, pour 155 observées ; et le facteur d'enrichissement à 1° (×17) est du même ordre qu'à 0,1°
// (×11), où personne ne parlerait de « bouchon ». Deux entiers exacts signalent une source GROSSIÈRE, pas une fiche
// inventée : c'est la queue continue d'une distribution de précision, pas une signature qualitative.
//
// Ce que l'erreur a coûté : parmi les 139 écartées, la commune de TROIANUL (Roumanie, 3 502 habitants, chef-lieu de
// la commune de Troianul, Teleorman) — le même dump porte « Comuna Troianul » (ADM2) à 500 m et une station
// paragrêle homonyme à 1,9 km. Également Grude (paroisse suédoise, église homonyme à 1,4 km), Fotine (Mozambique,
// 840 m), Qucain (Tibet, 150 m), Flattum (Norvège, 730 m)… Et 55 des 139 portaient un VRAI code postal, c'est-à-dire
// un point postal officiel joint à moins de 15 km. Preuve par l'absurde dans les données publiées : Alajärvi
// (Finlande, 8 793 habitants) est publié à la latitude EXACTEMENT 63,00000 ; si sa longitude l'avait été aussi, la
// règle effaçait une ville de 8 800 habitants.
//
// RÈGLE RÉVISÉE : une coordonnée à deux entiers n'est écartée que si RIEN dans le dépôt ne corrobore sa position.
// Corroboration (l'une des deux suffit, toutes deux bornent l'erreur du point) :
//   (a) une autre fiche du dump du pays porte le même nom — ou le contient comme mot entier — avec une coordonnée
//       NON entière à moins de 5 km : le point publié est grossier, l'écart est borné par ces 5 km ;
//   (b) le générateur a joint un vrai code postal, donc un point postal officiel à moins de 15 km.
// Mesure au 19e audit sur les 139 fiches : 15 corroborées par (a), 55 par (b), 63 par l'une ou l'autre — RESTITUÉES,
// listées ci-dessous avec leur preuve. Les 76 autres restent écartées : toutes sont dans des pays sans fichier
// postal (la colonne « code » y est une étiquette de région) et aucune fiche fine du même nom n'existe à moins de
// 5 km — leur point peut être faux de 78 km sans que rien ne permette de le savoir, et le dépôt n'a aucune source
// pour le corriger. Exemples conservés du 18e audit : CA Scarborough « 60 / -96 » (toundra du Manitoba, le seul
// Scarborough du dump étant le borough de Toronto), TZ « China » « -3 / 33 ». Une fiche est écartée, jamais déplacée
// (aucune coordonnée inventée). Le script de corroboration est reproductible : voir la description ci-dessus, il
// relit les dumps et le diff du 18e audit.
const PLACEHOLDER_COORD_OK = new Set([
  '2778012', // AT Gressenberg (32 hab.) — code postal 5112
  '2775912', // AT Hochwald — code postal 6450
  '2762605', // AT Untertiefenbach — code postal 8313
  '2142438', // AU Yarrigan — code postal 2396
  '732607', // BG Cheresha — code postal 2190
  '732357', // BG Debeli Rat — code postal 5084
  '726766', // BG Stoyanovtsi — code postal 5084
  '3907488', // BO Prado — Arroyo Prado (H/STM) à 2.6 km
  '8049327', // CN Qucain — Qucain (H/SPNT) à 0.1 km
  '3072262', // CZ Lázně Svaté Markety — code postal 383 01
  '2811699', // DE Weißthal — code postal 09648
  '3128850', // ES Baos — code postal 15151
  '2520319', // ES Cañamares — code postal 23477
  '654760', // FI Kalkkola — code postal 16160
  '652671', // FI Kirkonkylä — code postal 62101
  '652434', // FI Kivijärvi — code postal 43660
  '649090', // FI Långö — code postal 66400
  '3728099', // HT Cayepin — code postal HT5130
  '1648108', // ID Boti — Tanjung Boti (T/PT) à 2.4 km
  '1734149', // ID Kapulu — code postal 77155
  '6951070', // ID Nusa Dua — code postal 92767
  '1630931', // ID Poli — code postal 94475
  '6951059', // ID Seminyak — code postal 92767
  '1627412', // ID Setapok — code postal 79123
  '1845333', // KR Chuam — code postal 58142
  '1838431', // KR Pyeong — code postal 17927
  '1242796', // LK Jayanthipura — Jayanthipura (A/ADM4) à 3.5 km
  '1083046', // MG Ambatolahy — Ambatolahy (A/ADM4) à 2.7 km
  '1068590', // MG Beanana — Beanana (A/ADM4) à 2.1 km
  '1303668', // MM Nyaungbintha — Nyaungbintha-anauk (P/PPL) à 0.5 km
  '4007285', // MX El Tequesquite — code postal 46448
  '3979256', // MX Generalísimo Morelos — code postal 22940
  '4003843', // MX Joya de Ballesteros — code postal 60554
  '3994317', // MX Ojo de Gracias a Dios — code postal 26634
  '3990204', // MX Rancho Grande — code postal 26634
  '1046285', // MZ Fotine — Fotine (P/PPL) à 0.8 km
  '3157110', // NO Flattum — Flattum (S/FRM) à 0.7 km
  '3145712', // NO Mo — Mo (S/CH) à 1.7 km
  '3143985', // NO Nyhamar — code postal 5966
  '3936921', // PE La Perla (107 hab.) — code postal 15255
  '1731796', // PH Agutayan — code postal 5307
  '1728998', // PH Bagsak — code postal 7501
  '1712834', // PH Gitabla — code postal 6523
  '1687478', // PH San Vicente — code postal 5309
  '754147', // PL Zagrody — Zagrody (P/PPL) à 2.4 km
  '664591', // RO Troianul (3502 hab.) — Troianul Anti-hail Rocket Firing Station (S/FCL) à 1.9 km
  '583735', // RU Akishino — code postal 143512
  '575864', // RU Bobry — code postal 181370
  '2023885', // RU Grazhdanovka — code postal 676966
  '544034', // RU Kosov — code postal 347012
  '534875', // RU Lishneva — code postal 188283
  '1499601', // RU Malyye Malyuki — code postal 456530
  '2721301', // SE Blomdal — code postal 737 90
  '2710349', // SE Grude — Grude Kyrka (S/CH) à 1.4 km
  '2704049', // SE Hylle — code postal 690 45
  '12470311', // SE Landsbro — code postal 340 15
  '604117', // SE Niemisel — code postal 955 95
  '2688189', // SE Norsborg — code postal 640 51
  '2681605', // SE Rosendal — code postal 643 01
  '3058731', // SK Mešťáci — code postal 913 33
  '303544', // TR Ömerefendi Yaylası — code postal 42770
  '231290', // UG Kikorongo — Lake Kikorongo (H/LKC) à 2.6 km
  '3639648', // VE Hato Bartolomé — Hato Bartolomé (S/FRM) à 1.1 km
]);
function isPlaceholderCoord(lat, lon, geonameid){
  if(!Number.isInteger(lat) || !Number.isInteger(lon)) return false;
  return !PLACEHOLDER_COORD_OK.has(String(geonameid));
}
// ÉTIQUETTE DE RÉGION « XX-<admin1> » (18e audit du 21/09/2026). Quand un pays n'a pas de codes postaux publiés,
// les générateurs écrivent une étiquette informelle « XX-<code admin1 GeoNames> » dans la colonne du code postal.
// Pour huit pays, ce « code admin1 » est en réalité un IDENTIFIANT INTERNE GeoNames à 6-8 chiffres : le visiteur
// lisait « KZ-12510143 » sous le nom de sa ville. 1 592 lieux étaient concernés (KZ 1 418, soit 10,6 % du pays,
// GL 79, ML 37, CK 29, KY 15, MV 6, MO 5, SC 3). Le nom lisible de la division est déjà dans la colonne voisine
// (« KZ-12510143;Abai Region;Granitnoye »), et admin1CodesASCII.txt confirme l'équivalence : ces identifiants
// n'apportent donc rien et ne sont pas des codes. Au-delà de quatre chiffres, l'étiquette retombe sur le code pays
// seul — exactement ce que les générateurs font déjà pour un lieu sans région. Les vrais codes admin1 numériques
// courts (« IR-42 », « BH-16 », « PG-15 »…) ne sont pas touchés.
function regionLabel(country, admin1){
  if(!admin1 || admin1 === '00') return country;
  return /^\d{5,}$/.test(String(admin1)) ? country : country + '-' + admin1;
}
// Filtre commun, appelé par chaque générateur sur chaque ligne du dump : true = lieu écarté.
function excludePlace(country, geonameid, name, lat, lon){
  return isWrongCountry(country, geonameid) || isJunkId(country, geonameid) || HISTORICAL_NAME_RE.test(name || '') || isJunkName(name) ||
    isProjectBatch(country, geonameid) || isAntarcticUnderAR(country, lat) || isSark(country, lat, lon) || isPlaceholderCoord(lat, lon, geonameid);
}

// 7. LETTRES D'UN AUTRE ALPHABET GLISSÉES DANS UN MOT (audit n° 11) — « Áno Tripοdo » (omicron grec au milieu d'un nom
//    latin), « Коltsovo » (К et о cyrilliques), « Sha'biyyat Milе̄hah » (е cyrillique), « Αpostle Lyke » (alpha grec) ;
//    côté alias « Грeнобль » (e latin dans un nom russe). Le mot s'affiche normalement mais ne se trouve plus par une
//    saisie normale. Correction SEULEMENT quand elle est certaine : dans un mot, l'écriture de la langue de l'alias
//    (quand elle est connue et présente dans le mot), sinon l'écriture majoritaire (latine, cyrillique ou grecque), fixe
//    la graphie, et CHAQUE lettre intruse doit avoir un sosie exact dans cette écriture (tables ci-dessous : о/ο -> o,
//    К/Κ -> K, e -> е…, plus les sosies propres à une langue) ; égalité sans langue connue ou lettre sans sosie
//    (« Шеллenbergг », « Сан-Францisko » en tatar) = graphie incertaine -> { ok: false } (nom de lieu laissé tel quel,
//    alias écarté par build-all-aliases.js). Mesuré sur les alias publiés avant l'audit n° 11 : 873 corrigés, 97 écartés.
const TO_LATIN = {
  'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X','У':'Y','І':'I','Ј':'J','Ѕ':'S',
  'а':'a','е':'e','о':'o','р':'p','с':'c','у':'y','х':'x','і':'i','ј':'j','ѕ':'s',
  'Α':'A','Β':'B','Ε':'E','Ζ':'Z','Η':'H','Ι':'I','Κ':'K','Μ':'M','Ν':'N','Ο':'O','Ρ':'P','Τ':'T','Υ':'Y','Χ':'X',
  'α':'a','ι':'i','ο':'o','κ':'k','ν':'v','ρ':'p','υ':'u'
};
const TO_CYRILLIC = {
  'A':'А','B':'В','E':'Е','K':'К','M':'М','H':'Н','O':'О','P':'Р','C':'С','T':'Т','X':'Х','Y':'У',
  'a':'а','e':'е','o':'о','p':'р','c':'с','y':'у','x':'х','k':'к',
  // (і, ј, ѕ n'existent qu'en ukrainien/biélorusse/kazakh, serbe/macédonien : voir LANG_CYRILLIC_EXTRA.)
  // Ossète : « æ » latin tapé pour la lettre cyrillique ӕ (U+04D5), même forme (« Тиранæ », « Мендосæ »).
  'æ':'ӕ','Æ':'Ӕ'
};
// Sosies propres à certaines langues (alias seulement, la langue est connue) : « h » latin pour һ (mongol, kazakh,
// tatar, bachkir, kirghiz, iakoute : « Арвайhээр ») ; « l »/« I » latins pour la palotchka Ӏ (tchétchène, ingouche,
// langues du Daghestan, kabarde, adyguéen : « Йоккха-Атагlа »). En russe, « Калан-Деh » reste incertain (х ? һ ?).
// Tchouvache : « Ç »/« ç » latins pour Ҫ/ҫ (« Çĕнĕ Шупашкар », Novotcheboksarsk).
const LANG_CYRILLIC_EXTRA = { cv: { 'Ç':'Ҫ', 'ç':'ҫ' } };
// і (ukrainien, biélorusse, kazakh, ruthène : « Вiтрiвка » -> « Вітрівка ») ; ј (serbe, macédonien).
['uk', 'be', 'kk', 'rue'].forEach(l => { LANG_CYRILLIC_EXTRA[l] = Object.assign(LANG_CYRILLIC_EXTRA[l] || {}, { 'i':'і', 'I':'І' }); });
['sr', 'mk'].forEach(l => { LANG_CYRILLIC_EXTRA[l] = Object.assign(LANG_CYRILLIC_EXTRA[l] || {}, { 'j':'ј', 'J':'Ј' }); });
['mn', 'kk', 'tt', 'ba', 'ky', 'sah'].forEach(l => { LANG_CYRILLIC_EXTRA[l] = Object.assign(LANG_CYRILLIC_EXTRA[l] || {}, { 'h':'һ', 'H':'Һ' }); });
['ce', 'inh', 'av', 'lez', 'dar', 'lbe', 'tab', 'kbd', 'ady'].forEach(l => { LANG_CYRILLIC_EXTRA[l] = Object.assign(LANG_CYRILLIC_EXTRA[l] || {}, { 'l':'Ӏ', 'I':'Ӏ' }); });
// Écriture de la langue de l'alias : quand elle est connue, elle fixe l'écriture du mot même si l'intrus est majoritaire
// ou à égalité (« Kepeтapo » en kirghiz -> « Керетаро » ; « Kоpаnі » en finnois -> « Kopani » ; « PAΠANIANA » en grec).
const CYRILLIC_LANGS = new Set(['ru', 'uk', 'be', 'bg', 'sr', 'mk', 'kk', 'ky', 'tg', 'tt', 'ba', 'cv', 'mn', 'os', 'ce', 'sah', 'ab',
  'ady', 'av', 'kbd', 'udm', 'mhr', 'mrj', 'kv', 'koi', 'myv', 'mdf', 'bxr', 'tyv', 'alt', 'krc', 'lez', 'inh', 'dar', 'lbe', 'tab', 'xal', 'rue', 'cu']);
const LATIN_LANGS = new Set(['en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'sv', 'no', 'nb', 'nn', 'da', 'is', 'fo', 'fi', 'et', 'lv', 'lt', 'pl',
  'cs', 'sk', 'sl', 'hr', 'bs', 'sq', 'ro', 'hu', 'tr', 'az', 'uz', 'tk', 'hsb', 'dsb', 'csb', 'szl', 'ga', 'gd', 'cy', 'br', 'eu', 'ca',
  'gl', 'oc', 'co', 'lb', 'rm', 'fy', 'se', 'eo', 'la', 'vi', 'id', 'ms', 'tl', 'sw', 'kab', 'ha', 'yo', 'wo', 'mt']);
// Berbère, langues africaines en alphabet latin : γ et ε grecs tapés pour ɣ et ɛ latins (« Taγerdayt », Ghardaïa en kabyle).
const LATIN_EXTRA = { 'γ':'ɣ', 'ε':'ɛ' };
const TO_GREEK = {
  'A':'Α','B':'Β','E':'Ε','Z':'Ζ','H':'Η','I':'Ι','K':'Κ','M':'Μ','N':'Ν','O':'Ο','P':'Ρ','T':'Τ','Y':'Υ','X':'Χ',
  'a':'α','i':'ι','o':'ο','k':'κ','v':'ν','u':'υ'
};
const SAME_VOWELS = new Set([...'aeoiAEOIаеоіАЕОІαεοιΑΕΟΙ']);
const SCRIPT_OF = ch => /\p{Script=Latin}/u.test(ch) ? 'L' : /\p{Script=Cyrillic}/u.test(ch) ? 'C' : /\p{Script=Greek}/u.test(ch) ? 'G' : '';
const TABLE_FOR = { L: TO_LATIN, C: TO_CYRILLIC, G: TO_GREEK };
// Le mot est décomposé (NFD) : une lettre accentuée intruse se ramène à sa lettre de base plus le diacritique, qui est
// gardé (« Зелëный » : ë latin = e + tréma -> е + tréma -> ё ; « Мбуруküя » -> ӱ ; tchouvache « Утăрсан » : ă -> ӑ).
// Les mots SANS mélange ne sont jamais touchés (ni recomposés).
function fixMixedScript(text, lang){
  text = String(text || '');
  const langScript = !lang ? '' : CYRILLIC_LANGS.has(lang) ? 'C' : lang === 'el' ? 'G' : LATIN_LANGS.has(lang) ? 'L' : '';
  // Réécrit le mot dans l'écriture « major », ou null si une lettre intruse n'y a pas de sosie.
  function rewrite(tok, major){
    const table = TABLE_FOR[major];
    const extra = major === 'C' ? (lang && LANG_CYRILLIC_EXTRA[lang]) : (major === 'L' && langScript === 'L') ? LATIN_EXTRA : null;
    // Table latine : sosies cyrilliques ET grecs ; tables cyrillique/grecque : sosies latins seulement.
    const map = (ch, s) => (major === 'L' || s === 'L') ? (table[ch] || (extra && extra[ch]) || null) : null;
    let res = '';
    for(const ch of tok){
      const s = SCRIPT_OF(ch);
      if(!s || s === major){ res += ch; continue; }
      let m = map(ch, s);
      if(!m){
        // lettre accentuée : lettre de base + diacritique(s)
        const d = ch.normalize('NFD'), base = d[0], marks = d.slice(1);
        const mb = marks ? map(base, SCRIPT_OF(base)) : null;
        if(!mb) return null;
        m = mb + marks;
      }
      res += m;
    }
    return res.normalize('NFC');
  }
  let ok = true, changed = false;
  const out = text.replace(/[\p{L}\p{M}]+/gu, tok => {
    const count = { L: 0, C: 0, G: 0 };
    for(const ch of tok){ const s = SCRIPT_OF(ch); if(s) count[s]++; }
    const present = Object.keys(count).filter(s => count[s]);
    if(present.length < 2) return tok;
    // Ordre d'essai : écriture de la langue de l'alias (si le mot en contient), puis écriture majoritaire du mot
    // (« Humnіščy » en biélorusse : graphie latine, łacinka -> « Humniščy »). Égalité sans langue = incertain.
    // Écriture majoritaire CONTRAIRE à celle de la langue : admise seulement si les lettres intruses sont des voyelles
    // a/e/o/i, qui se lisent pareil dans les deux écritures — sinon un faux ami (р cyrillique = « r », pas « p »)
    // donnerait « Taprafal » pour « Тарrafal » (Tarrafal en russe) : alias écarté.
    const sorted = present.slice().sort((a, b) => count[b] - count[a]);
    const tries = [];
    if(langScript && count[langScript]) tries.push(langScript);
    if(count[sorted[0]] !== count[sorted[1]] && !tries.includes(sorted[0])){
      const intruders = [...tok].filter(ch => { const s = SCRIPT_OF(ch); return s && s !== sorted[0]; });
      if(!langScript || intruders.every(ch => SAME_VOWELS.has(ch))) tries.push(sorted[0]);
    }
    for(const major of tries){ const r = rewrite(tok, major); if(r !== null){ changed = true; return r; } }
    ok = false;
    return tok;
  });
  return { text: ok ? out : text, ok, changed: ok && changed };
}

// 7 bis. DEUX ÉCRITURES DANS UN MÊME MOT, SANS SOSIE POSSIBLE (18e audit du 21/09/2026). fixMixedScript ne connaît que
//    le latin, le cyrillique et le grec, qui partagent des lettres sosies : il sait donc réparer « Коltsovo ». Entre
//    l'éthiopien et le géorgien, entre l'arabe et le bengali, aucune lettre ne se ressemble — un mot qui mêle ces
//    écritures est une bouillie de deux translittérations automatiques, jamais un nom. GeoNames en publie : « ጉልያንتሲ »
//    (Gulyantsi en amharique, avec deux lettres arabes au milieu), « اوسترავა » (Ostrava en persan, fin en géorgien),
//    « ইমพფondo » (Impfondo, cinq écritures dans un mot). Ces alias ne se saisissent avec AUCUN clavier : ni le clavier
//    amharique ni le clavier arabe ne produisent le mot entier. Ils sont écartés, jamais réparés (la graphie visée est
//    indevinable). Mesure sur les alias publiés avant cette passe : 90 lignes à mot mêlé, dont 71 écartées par cette
//    règle et 19 gardées par l'exception ci-dessous. Aucun NOM DE LIEU publié n'est concerné (contrôle sur les 4,8
//    millions de lieux : zéro), la règle ne s'applique donc qu'aux alias.
//    EXCEPTION, latin collé à du chinois, du japonais ou du coréen : c'est l'usage réel de ces langues, qui accolent un
//    nom propre latin aux idéogrammes sans espace — « 密歇根州Oscoda地區 » (l'Oscoda du Michigan), « Talmage镇 » (le
//    bourg de Talmage), « カリフォルニア州Daggett », « Jinnah Antarctic基地 ». La suite latine doit alors ressembler à un
//    nom propre : lettres ASCII commençant par une majuscule (ou une initiale isolée, « レアンドロNアレム » pour Leandro
//    N. Alem). Une minuscule isolée ou une lettre pleine chasse trahit au contraire une translittération abîmée et
//    l'alias est écarté : « クランj » (Kranj), « スウæォンジ » (Swansea), « ほんまちひがｈし », « 一Ｏ九队青年点 » (un Ｏ
//    latin pleine chasse à la place du zéro chinois 〇).
const MIXED_WORD_SCRIPTS = [
  ['Cjk', /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u],
  ['Latn', /\p{Script=Latin}/u], ['Cyrl', /\p{Script=Cyrillic}/u], ['Grek', /\p{Script=Greek}/u],
  ['Arab', /\p{Script=Arabic}/u], ['Hebr', /\p{Script=Hebrew}/u], ['Deva', /\p{Script=Devanagari}/u],
  ['Thai', /\p{Script=Thai}/u], ['Laoo', /\p{Script=Lao}/u], ['Mymr', /\p{Script=Myanmar}/u], ['Khmr', /\p{Script=Khmer}/u],
  ['Geor', /\p{Script=Georgian}/u], ['Armn', /\p{Script=Armenian}/u], ['Ethi', /\p{Script=Ethiopic}/u],
  ['Beng', /\p{Script=Bengali}/u], ['Taml', /\p{Script=Tamil}/u], ['Knda', /\p{Script=Kannada}/u],
  ['Telu', /\p{Script=Telugu}/u], ['Mlym', /\p{Script=Malayalam}/u], ['Guru', /\p{Script=Gurmukhi}/u],
  ['Gujr', /\p{Script=Gujarati}/u], ['Orya', /\p{Script=Oriya}/u], ['Sinh', /\p{Script=Sinhala}/u],
  ['Tibt', /\p{Script=Tibetan}/u], ['Syrc', /\p{Script=Syriac}/u], ['Thaa', /\p{Script=Thaana}/u],
  ['Cher', /\p{Script=Cherokee}/u], ['Cans', /\p{Script=Canadian_Aboriginal}/u], ['Mong', /\p{Script=Mongolian}/u],
  ['Yiii', /\p{Script=Yi}/u], ['Tfng', /\p{Script=Tifinagh}/u], ['Nkoo', /\p{Script=Nko}/u], ['Vaii', /\p{Script=Vai}/u],
  ['Adlm', /\p{Script=Adlam}/u], ['Osge', /\p{Script=Osage}/u], ['Java', /\p{Script=Javanese}/u], ['Bali', /\p{Script=Balinese}/u],
  ['Bugi', /\p{Script=Buginese}/u], ['Cham', /\p{Script=Cham}/u], ['Tale', /\p{Script=Tai_Le}/u], ['Talu', /\p{Script=New_Tai_Lue}/u],
  ['Lana', /\p{Script=Tai_Tham}/u], ['Batk', /\p{Script=Batak}/u], ['Sund', /\p{Script=Sundanese}/u]
];
// Nom propre latin accolé à du CJK : ASCII, initiale majuscule (« Oscoda », « CDP », « N »).
const CJK_LATIN_WORD_RE = /^[A-Z][A-Za-z'\u2019.-]*$/;
function hasMixedScriptWord(text){
  const mots = String(text || '').match(/[\p{L}\p{M}]+/gu);
  if(!mots) return false;
  for(const mot of mots){
    const vues = MIXED_WORD_SCRIPTS.filter(function(e){ return e[1].test(mot); }).map(function(e){ return e[0]; });
    if(vues.length < 2) continue;
    if(vues.length === 2 && vues.indexOf('Cjk') >= 0 && vues.indexOf('Latn') >= 0){
      const suites = mot.match(/\p{Script=Latin}+/gu) || [];
      if(suites.every(function(x){ return CJK_LATIN_WORD_RE.test(x); })) continue;
    }
    return true;
  }
  return false;
}

// 7 ter. LANGUE DÉCLARÉE CONTREDITE PAR L'ÉCRITURE (18e audit du 21/09/2026). Certaines écritures ne servent qu'à UNE
//    langue de la liste du projet : le géorgien au géorgien, l'arménien à l'arménien, le singhalais au singhalais…
//    Quand un alias est écrit ENTIÈREMENT dans une de ces écritures et déclaré dans une AUTRE langue qui a elle aussi
//    son écriture propre, l'étiquette est fausse de façon certaine : « am;Ուռհա;Şanlıurfa » (Ourha, le nom arménien
//    d'Urfa, déclaré amharique), « ko;លង្វែក;Longveaek » (khmer déclaré coréen), « el;สะเมิง;Samoeng » (thaï déclaré
//    grec), « ta;කුරුවිට;Kuruwita » (singhalais déclaré tamoul). La ligne est RÉÉTIQUETÉE, pas écartée : sur les douze
//    cas relevés, neuf sont la seule graphie locale publiée pour leur lieu — « ta;කුරුවිට » est même le seul alias de
//    Kuruwita, l'écarter aurait fait disparaître le nom singhalais d'une ville du Sri Lanka. Les trois autres retombent
//    sur une ligne déjà correcte et sont alors dédoublonnées.
//    La règle ne s'applique QUE dans les deux sens sûrs : écriture exclusive d'une seule langue (donc ni le latin, ni
//    le cyrillique, ni l'arabe, ni le han, ni l'éthiopien — partagés entre plusieurs langues) ET langue déclarée
//    possédant elle-même une écriture exclusive (sinon une translittération latine légitime, « ja;Tokyo », serait prise
//    pour une erreur). Elle généralise le contrôle lao/khmer/birman/thaï de build-all-aliases.js, qui écartait la ligne.
const SCRIPT_ONE_LANG = { ka: /\p{Script=Georgian}/u, hy: /\p{Script=Armenian}/u, el: /\p{Script=Greek}/u,
  th: /\p{Script=Thai}/u, lo: /\p{Script=Lao}/u, my: /\p{Script=Myanmar}/u, km: /\p{Script=Khmer}/u,
  si: /\p{Script=Sinhala}/u, ta: /\p{Script=Tamil}/u, te: /\p{Script=Telugu}/u, kn: /\p{Script=Kannada}/u,
  ml: /\p{Script=Malayalam}/u, gu: /\p{Script=Gujarati}/u, or: /\p{Script=Oriya}/u, pa: /\p{Script=Gurmukhi}/u,
  dv: /\p{Script=Thaana}/u, ko: /\p{Script=Hangul}/u };
// Langues à écriture propre qui ne permettent PAS de conclure dans l'autre sens (plusieurs langues par écriture) :
// leur présence suffit à savoir que la langue déclarée est fausse, pas à deviner laquelle.
const SCRIPT_MANY_LANGS = { am: /\p{Script=Ethiopic}/u, ti: /\p{Script=Ethiopic}/u, he: /\p{Script=Hebrew}/u,
  yi: /\p{Script=Hebrew}/u, bn: /\p{Script=Bengali}/u, as: /\p{Script=Bengali}/u, bo: /\p{Script=Tibetan}/u,
  dz: /\p{Script=Tibetan}/u };
function aliasLangFromScript(text, lang){
  const t = String(text || '');
  const attendue = SCRIPT_ONE_LANG[lang] || SCRIPT_MANY_LANGS[lang];
  if(!attendue || attendue.test(t)) return null;          // langue sans écriture propre, ou écriture conforme
  let trouvée = null;
  for(const code of Object.keys(SCRIPT_ONE_LANG)){
    if(!SCRIPT_ONE_LANG[code].test(t)) continue;
    if(trouvée) return null;                              // deux écritures : cas de 7 bis, pas de réétiquetage
    trouvée = code;
  }
  if(!trouvée) return null;
  // Aucune lettre d'une autre écriture (latin, cyrillique, han…) : sinon la graphie est mêlée, pas mal étiquetée.
  if(/\p{L}/u.test(t.replace(new RegExp(SCRIPT_ONE_LANG[trouvée].source, 'gu'), ''))) return null;
  return trouvée;
}

// 8. NOM PROPRE À PUBLIER (audit n° 11), appliqué par chaque générateur au nom du dump (après NAME_FIXES et ses propres
//    renommages), AVANT excludePlace et le dédoublonnage. Ne change rien aux noms ordinaires :
//    - caractère de contrôle C1 (U+0080–U+009F) collé à une lettre accentuée : octet parasite d'un double encodage
//      (« Padre Á<U+0081>ngel Buodo » AR, « Alto Igarapé<U+0090> Açu » BR — la lettre est intacte, l'asciiname de la
//      même fiche le confirme : « Padre Angel Buodo », « Alto Igarape Acu ») -> retiré. Tout autre caractère de contrôle
//      = lettre perdue -> nom vide (lieu écarté par isJunkName) ;
//    - point-virgule : c'est le séparateur des fichiers publiés (« pop;lon,lat;cp;région;nom »), un « ; » dans le nom
//      décale les champs (« ;Malekantha », « Mallo Payal; », NP) -> retiré en tête et en fin, remplacé par « , » ailleurs ;
//    - espaces : doubles espaces réduits (« Puerta  de Córdoba » AR, 78 noms), espaces de tête et de fin retirés ;
//    - lettres d'un autre alphabet : voir fixMixedScript (corrigées seulement si la graphie est certaine).
function cleanPlaceName(name){
  let t = String(name || '').replace(/([\u00C0-\u024F])[\u0080-\u009F]/g, '$1');
  if(/[\u0000-\u001F\u007F-\u009F]/.test(t)) return '';
  t = t.replace(/^[\s;]+|[\s;]+$/g, '').replace(/\s*;\s*/g, ', ').replace(/\s{2,}/g, ' ');
  if(!t.includes('[')) t = t.replace(/\s*\]$/, ''); // « Salgaun] », « Gotma] » (NP, même import de 2019) : touche voisine
  // d'Entrée frappée en fin de saisie, nom complet par ailleurs -> crochet retiré (un « [ » au milieu d'un mot, lui,
  // remplace une lettre : BROKEN_BRACKET_RE, lieu écarté).
  const m = fixMixedScript(t);
  return m.text;
}
function preparePlaceName(country, geonameid, name){ return cleanPlaceName(fixName(country, geonameid, name)); }

// 9 bis. CE QUE CE DÉDOUBLONNAGE NE VOIT PAS (19e audit du 21/09/2026), mesuré sur les fichiers publiés :
//   - sa clé compare le nom BRUT (casse ignorée) ; le moteur, lui, compare le nom NORMALISÉ depuis la 18e passe.
//     Avec le critère du moteur, 1 212 paires de lieux d'un même pays portent le même nom à moins de 300 m, contre
//     837 avec le critère d'ici — dont 317 DANS LA MÊME case de 0,01°, que ce dédoublonnage devrait donc attraper.
//   - CORRIGÉ : la clé compare désormais le nom NORMALISÉ, donc 572 lignes de plus sont écartées (NP 188, IN 76,
//     PK 70, MX 50, BD 27…), toutes des doublons de graphie (« Bergen-Einde »/« Bergen Einde », « Osluševci »/
//     « Oslusevci », « Alajärvi »/« Älajärvi »). Fusionner ne rend RIEN introuvable : les deux graphies se
//     normalisent à l'identique, la recherche les trouvait donc déjà toutes les deux par la même saisie — ce que la
//     fusion supprime, c'est la suggestion en double et la population contradictoire, pas un chemin d'accès.
//   - DÉPARTAGE : la graphie la plus FRÉQUENTE dans le pays gagne, puis la population, puis la première ligne. La
//     population seule choisissait mal dès que les deux lignes ne s'écrivent pas pareil : elle gardait la coquille
//     « Älajärvi » (10 308 hab., vue 1 fois) plutôt qu'« Alajärvi » (8 793 hab., vue 3 fois), « Berezovo » (vue
//     2 fois) plutôt que « Berëzovo » (54 fois), « Ar Rubū` » plutôt qu'« Ar Rubū‘ » (vue 11 fois). Sur les
//     572 groupes, les deux critères désignent la même graphie 443 fois ; sur les 129 divergences, la fréquence
//     l'emporte partout sauf un motif connu : le roumain, où la cédille héritée « Dobreşti » (5 occurrences) est
//     plus fréquente que la virgule souscrite correcte « Dobrești » (3). Limite assumée et écrite : départager deux
//     orthographes demande une source orthographique que le dépôt n'a pas ; la fréquence est le meilleur signal
//     disponible hors ligne.
//   - CE QUI RESTE après la fusion : 6 paires à moins de 300 m publient encore deux populations non nulles
//     différentes (12 avant) et 28 produisent deux suggestions (34 avant) — celles dont les deux points tombent de
//     part et d'autre d'une limite de case de 0,01°, que cette clé ne peut pas rapprocher. tests/data.test.js fige
//     ces deux nombres : ils ne peuvent plus grandir en silence.

// 9. QUASI-DOUBLONS (audit n° 11) — le dédoublonnage des générateurs compare le nom et les coordonnées BRUTES arrondies
//    à 0,01° : deux fiches du même lieu de part et d'autre d'une limite d'arrondi (64,24497 et 64,24503) passaient
//    toutes les deux (93 paires : « Şūfī Qal‘ah » AF à 0,7 km, « Yaguajay » CU à 30 m…). Deuxième passe sur les lignes
//    publiées (« pop;lon,lat;cp;région;nom ») : même nom (casse ignorée) et même point à 0,01° près SUR LES COORDONNÉES
//    PUBLIÉES -> une seule ligne gardée, la plus peuplée (à égalité, la première). Ne fait que retirer des lignes, jamais
//    en séparer ; l'ordre des lignes gardées est inchangé.
function dropNearDuplicates(lines){
  const nomOf = l => l.split(';').slice(4).join(';');
  // Fréquence de chaque GRAPHIE dans le pays : premier critère de départage (voir 9 bis).
  const fréquence = new Map();
  lines.forEach(l => { if(l){ const n = nomOf(l); fréquence.set(n, (fréquence.get(n) || 0) + 1); } });
  const best = new Map();
  // Clé : nom NORMALISÉ comme le moteur (19e audit du 21/09/2026) + point arrondi à 0,01°. Avec le nom brut, deux
  // lignes du même lieu qui ne diffèrent que par un accent ou un trait d'union passaient toutes les deux.
  const keyOf = l => {
    const p = l.split(';'); const ll = (p[1] || '').split(',');
    return normalizeCityName(p.slice(4).join(';')) + '|' + (+ll[1]).toFixed(2) + '|' + (+ll[0]).toFixed(2);
  };
  lines.forEach((l, i) => {
    if(!l) return;
    const k = keyOf(l), pop = parseInt(l, 10) || 0, f = fréquence.get(nomOf(l)) || 0, prev = best.get(k);
    // Ordre : une population connue l'emporte sur une fiche à zéro (ne jamais perdre un chiffre réel au profit
    // d'une fiche vide), puis la graphie la plus fréquente, puis la population, puis la première ligne.
    const mieux = !prev || (pop > 0) !== (prev.pop > 0) ? (!prev || pop > 0) : (f !== prev.f ? f > prev.f : pop > prev.pop);
    if(mieux) best.set(k, { i, pop, f });
  });
  return lines.filter((l, i) => !l || best.get(keyOf(l)).i === i);
}

module.exports = { NAME_FIXES, fixName, LOST_CHARS_RE, WRONG_COUNTRY, isWrongCountry, HISTORICAL_NAME_RE, EDITOR_COMMENT_NAME_RE, PLACEHOLDER_NAMES,
  PLACEHOLDER_QUALIFIED_RE, JUNK_IDS, isJunkId, LOCAL_SCRIPT_DUPLICATES, SAME_POINT_DUPLICATES, INPUT_SYMBOL_RE, ALIAS_REPAIR_REJECT, repairAliasTypography, repairAliasLoose,
  BROKEN_BRACKET_RE, hasUnbalancedParen, UNDERSCORE_RE, PROJECT_BATCH, isProjectBatch, isJunkName, ANTARCTIC_TREATY_LAT, isAntarcticUnderAR, SARK_BOX, isSark, isPlaceholderCoord, PLACEHOLDER_COORD_OK, regionLabel, excludePlace,
  fixMixedScript, hasMixedScriptWord, aliasLangFromScript, SCRIPT_ONE_LANG, SCRIPT_MANY_LANGS, cleanPlaceName, preparePlaceName, dropNearDuplicates };
