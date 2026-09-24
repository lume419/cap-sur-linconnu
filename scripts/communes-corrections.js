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
// changé. HR et ES (build-country-communes.js) restaient non régénérables, faute de HR_postal / ES_postal dans le dépôt,
// et leurs fichiers publiés n'avaient pas été retouchés à ce moment-là.
// MISE À JOUR au 20e audit du 21/09/2026 : ce n'est plus vrai et ce commentaire se contredisait avec la suite du
// fichier. Les 18e et 19e audits ont appliqué le traitement ligne à ligne AUSSI à ces fichiers publiés ; vérifié sur
// l'état actuel : « Zorkovac_ », « Donja_Podgora », « Gornje_Zagorje », « XXX » et « Test » n'y figurent plus, et
// communes-es.txt comme communes-hr.txt ne contiennent plus aucun « _ ». La règle générale du dépôt tient donc sans
// exception : quand un pays n'est pas régénérable, le code est corrigé ET les lignes visées du fichier publié le sont
// aussi, de sorte que la prochaine régénération donne le même résultat.
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
  '8182275':  ['CO', 'La Esmeralda', 'VE', 'doublon', 'La Esmeralda (communes-ve.txt, 0,2 km), Amazonas ; fiche CO « Valle del Cauca »'],
  // 21/09/2026 — SEPT fiches trouvées en rendant le code postal facultatif. Elles n'avaient jamais été vues parce
  // qu'aucune n'avait de point postal à moins de 15 km : le filtre postal les écartait par accident. Le contrôle
  // « lieu isolé de son pays » de tests/data.test.js les a toutes signalées dès leur première publication.
  '11648179': ['NL', 'Zeelandia', 'BQ', 'absent', 'Saint-Eustache (Pays-Bas caribéens), 6 841 km du reste des Pays-Bas ; fiche NL sans division'],
  '694774':   ['UA', 'Sasovo', 'RU', 'absent', 'Sassovo, oblast de Riazan (54,33 / 41,92), 489 km de la frontière ukrainienne'],
  '2368407':  ['TG', 'Agbatopé', 'CM', 'absent', 'longitude 11,27 : Cameroun. Le Togo ne dépasse pas 1,8° Est'],
  '7779239':  ['SD', 'Naam', 'SS', 'absent', 'latitude 5,88 : Soudan du Sud (frontière de 2011 non reprise par la fiche)'],
  '7828712':  ['SD', 'Faraksika', 'SS', 'absent', 'latitude 5,02 : Soudan du Sud, même cas que Naam'],
  '11072304': ['ET', 'Figuiratomo', 'ML', 'absent', 'longitude −8,36 : Mali. L\'Éthiopie commence à 33° Est'],
  // 22/09/2026 — trouvée en levant le seuil de population du Levant : une fiche de plus aux coordonnées d'un
  // autre continent, signalée par le contrôle « lieu isolé de son pays » dès sa première publication.
  '11397269': ['EG', 'Maqhaka', 'LS', 'absent', "latitude −29,25 : Lesotho, 5 800 km au sud de l'Égypte"],
  '10179428': ['JP', 'Inarizako', 'EG', 'absent', 'longitude 30,97 au lieu de 130,97 (le « 1 » manque) : la fiche tombe dans le delta du Nil, alors qu\'elle se dit de Kagoshima']
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
// RÈGLE RÉVISÉE (19e audit), CORRIGÉE AU 20e DU 21/09/2026 : une coordonnée à deux entiers n'est écartée que si
// rien dans le dépôt ne corrobore sa position. Le 19e audit acceptait deux corroborations ; la seconde ne valait
// RIEN et elle a restitué 50 fiches à tort.
//   (a) VALIDE — une autre fiche du dump du pays porte le même nom, ou le contient comme mot entier, avec une
//       coordonnée NON entière à moins de 5 km. Le point publié est grossier mais l'écart est borné par ces 5 km,
//       et la corroboration est indépendante : elle vient d'une fiche que le générateur n'a pas produite.
//   (b) RETIRÉE — « le générateur a joint un vrai code postal ». C'était TAUTOLOGIQUE : dans un pays doté d'un
//       fichier postal, le générateur écarte tout lieu sans point postal à moins de 15 km (build-country-communes.js
//       « if(!cp) return null », même règle dans build-asie-communes.js et build-ameriques-communes.js). Tout lieu
//       PUBLIÉ dans un tel pays porte donc un code postal par construction : le critère ne triait rien et ne bornait
//       rien — le point postal le plus proche peut être à 15 km, et rien ne dit qu'il désigne CE lieu. Le 19e audit
//       en tirait aussi que « les 76 restantes sont toutes dans des pays sans fichier postal », ce qui était faux.
// Contrôles ajoutés au 20e audit, sur les seules fiches corroborées par (a) :
//   - la fiche corroborante ne doit pas être un lieu DÉJÀ PUBLIÉ du même nom : sinon restituer fabrique le
//     quasi-doublon que la même passe retirait ailleurs. Deux cas : MZ Fotine (homonyme publié à 0,84 km) et
//     PL Zagrody (2,38 km) — retirés.
//   - le point doit être sur la terre ferme (lib/land-grid.bin, 7200×3600) : les 15 le sont.
// MESURE SUR LES 139 FICHES écartées au 18e audit (script reproductible : il relit les dumps et le diff du 18e) :
// 15 corroborées par (a), dont 2 quasi-doublons -> 13 RESTITUÉES, listées ci-dessous avec leur preuve ; 126 restent
// écartées. Une fiche est écartée, jamais déplacée (aucune coordonnée inventée).
//
// Ce que l'erreur du 18e audit coûtait malgré tout, et que (a) répare : TROIANUL (Roumanie, 3 502 habitants,
// chef-lieu de commune, Teleorman) — station paragrêle homonyme à 1,9 km ; Grude (paroisse suédoise, église
// homonyme à 1,4 km) ; Qucain (Tibet, 150 m) ; Flattum (Norvège, 730 m). Et la mesure de fréquence qui invalidait
// le raisonnement d'origine tient toujours : sur 4 989 386 fiches P/PPL*, 0,13 % ont une latitude entière et 1,6 %
// tombent sur la grille du dixième de degré ; neuf coordonnées à deux entiers sont attendues par pur hasard, pour
// 155 observées. Deux entiers signalent une source GROSSIÈRE, pas une fiche inventée. Preuve par l'absurde dans les
// données publiées : Alajärvi (Finlande, 8 793 habitants) est publié à la latitude EXACTEMENT 63,00000.
const PLACEHOLDER_COORD_OK = new Set([
  '3907488', // BO Prado — Arroyo Prado (H/STM) à 2,6 km
  '8049327', // CN Qucain — Qucain (H/SPNT) à 0,1 km
  '1648108', // ID Boti — Tanjung Boti (T/PT) à 2,4 km
  '1242796', // LK Jayanthipura — Jayanthipura (A/ADM4) à 3,5 km
  '1083046', // MG Ambatolahy — Ambatolahy (A/ADM4) à 2,7 km
  '1068590', // MG Beanana — Beanana (A/ADM4) à 2,1 km
  '1303668', // MM Nyaungbintha — Nyaungbintha-anauk (P/PPL) à 0,5 km
  '3157110', // NO Flattum — Flattum (S/FRM) à 0,7 km
  '3145712', // NO Mo — Mo (S/CH) à 1,7 km
  '664591', // RO Troianul (3 502 hab.) — Troianul Anti-hail Rocket Firing Station (S/FCL) à 1,9 km
  '2710349', // SE Grude — Grude Kyrka (S/CH) à 1,4 km
  '231290', // UG Kikorongo — Lake Kikorongo (H/LKC) à 2,6 km
  '3639648', // VE Hato Bartolomé — Hato Bartolomé (S/FRM) à 1,1 km
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
// 11. LE CODE ADMINISTRATIF CONTREDIT LES COORDONNÉES (24/09/2026). Une fiche dont le code de division dit une
//    île et dont le point en dit une autre est fausse par l'un des deux bouts. Elle n'est écartée que lorsque
//    le MÊME lieu existe déjà, correctement placé, sous le MÊME code : on retire alors un doublon corrompu,
//    pas une information. Repérée par un crible géométrique : au Cap-Vert, les neuf îles ont des boîtes de
//    coordonnées disjointes (CV_ISLAND_BOXES dans public/js/trip-data.js), et une seule fiche sur 2 780 s'y
//    trouve en contradiction avec son concelho.
const ADMIN_COORD_CONFLICT = [
  // « Ponta Verde », concelho CV-18 (São Filipe), qui est sur FOGO. Deux fiches portent ce code : l'une à
  // -24,4598 / 14,9820, sur Fogo, cohérente ; l'autre à -23,6000 / 15,1992, SUR SANTIAGO, à 80 km de là, avec
  // une population voisine mais différente (1 117 contre 1 072). La longitude ronde (-23,6000) et l'écart de
  // population désignent la seconde comme la fiche abîmée. C'est elle qui faisait se chevaucher les boîtes de
  // Fogo et de Santiago, lesquelles sont mesurées sans elle.
  { cc: 'CV', name: 'Ponta Verde', lat: 15.1992, lon: -23.6,
    raison: 'concelho CV-18 (São Filipe, Fogo) mais coordonnées sur Santiago, à 80 km ; doublon de la fiche correcte à -24,4598 / 14,9820' },
];
// Comparaison au dix-millième de degré (~11 m) : la fiche visée est désignée sans risque d'en emporter une autre.
function isAdminCoordConflict(country, name, lat, lon){
  for(var i = 0; i < ADMIN_COORD_CONFLICT.length; i++){
    var e = ADMIN_COORD_CONFLICT[i];
    if(e.cc === country && e.name === name && Math.abs(e.lat - lat) < 1e-4 && Math.abs(e.lon - lon) < 1e-4) return true;
  }
  return false;
}
// 12. L'ÉTIQUETTE DE DIVISION CONTREDIT LES COORDONNÉES (24/09/2026). Différent du point 11 : là, une fiche
//    en double était ÉCARTÉE ; ici la fiche est bonne et unique, c'est son étiquette de région qui est fausse.
//    Deux cribles l'ont établi, sur seize pays et 641 000 lieux :
//      - un lieu ISOLÉ dans sa division (à plus de 50 km des siens, à moins de 3 km d'une autre, rapport ≥ 10) ;
//      - une division ÉCLATÉE en grappes lointaines — c'est ce second crible qui a trouvé le Danemark, car quand
//        la mauvaise étiquette frappe tout un GROUPE, ce sont les fiches correctes qui paraissent isolées.
//    CHAQUE cas a ensuite été confronté à la CARTE (géocodage inverse OpenStreetMap, une requête par seconde,
//    même méthode que WRONG_COUNTRY plus haut), en comparant le lieu à son VOISIN d'un kilomètre plutôt qu'à son
//    étiquette : cela se passe de toute table de correspondance entre rangs administratifs.
//    NON retenus, et c'est le contrôle qui les a écartés : trois fiches que la carte CONFIRME (elles n'étaient
//    signalées que parce que leur voisin était mal étiqueté — Nakanoshima au Japon, Leipämäki en Finlande,
//    København au Danemark), et une ÉCARTÉE APRÈS COUP : « Campiña » (Espagne). La carte la place à Sorihuela
//    del Guadalimar, dans la province de JAÉN, et j'ai d'abord corrigé son étiquette. À tort : sa population de
//    67 904 — la deuxième de Córdoba après la ville même — et son code postal 14600 (146xx = Córdoba, 232xx =
//    Jaén) en font un enregistrement de COMARQUE dont DEUX attributs sur trois disent Córdoba. C'est la
//    COORDONNÉE qui est fausse, pas l'étiquette, et corriger celle-ci aurait aggravé la fiche. Laissée telle
//    quelle : on ne sait pas où ce point devrait être.
//    Les divisions légitimement éclatées ne sont PAS touchées : Tokyo administre les Ogasawara à 1 200 km,
//    Kagoshima les Amami, la Sicile Pantelleria et Lampedusa. Une préfecture peut s'étaler, une commune non.
const DIVISION_FIXES = [
  // Japon — préfecture rendue par la carte (zoom 8), suffixe « Prefecture » retiré pour suivre la graphie du fichier.
  { cc: 'JP', name: "Takou", lat: 29.8411, lon: 129.8744, to: "Kagoshima" },   // au lieu de Okinawa
  { cc: 'JP', name: "Hara", lat: 35.9981, lon: 139.0307, to: "Saitama" },   // au lieu de Tochigi
  { cc: 'JP', name: "Koshimoto", lat: 36.8031, lon: 139.2346, to: "Gunma" },   // au lieu de Saitama
  // Norvège — commune rendue par la carte au rang municipal (zoom 10) : le rang large ne distinguait que « Vestland ».
  { cc: 'NO', name: "Vangsbygdi", lat: 60.4926, lon: 6.8541, to: "Ulvik" },   // au lieu de Modalen
  { cc: 'NO', name: "Dalegarden", lat: 60.5812, lon: 5.7938, to: "Vaksdal" },   // au lieu de Modalen
  // Suède — idem. « Kinda » est la seule étiquette cible qu'aucun autre lieu publié ne porte encore.
  { cc: 'SE', name: "Ävjeboda", lat: 58.0333, lon: 15.9, to: "Kinda" },   // au lieu de Jönköping
  // Philippines — le fichier porte la RÉGION, la carte rend la PROVINCE : on ne peut pas les comparer directement.
//    La carte place le lieu et son voisin dans la MÊME province, donc dans la même région : c'est l'étiquette du
//    voisin qui est retenue, dans la graphie du fichier.
  { cc: 'PH', name: "Villarosa", lat: 15.55, lon: 120.75, to: "Central Luzon" },   // au lieu de Cordillera
  { cc: 'PH', name: "Tayquin", lat: 14.1333, lon: 121.4333, to: "Calabarzon" },   // au lieu de Central Luzon
  { cc: 'PH', name: "San Miguel", lat: 13.7, lon: 121.0667, to: "Calabarzon" },   // au lieu de Bicol Region
  { cc: 'PH', name: "Potol", lat: 13.9751, lon: 121.5941, to: "Calabarzon" },   // au lieu de Mimaropa
  { cc: 'PH', name: "Payasan", lat: 13.2333, lon: 121.9667, to: "Mimaropa" },   // au lieu de Calabarzon
  { cc: 'PH', name: "Palang Norte", lat: 17.55, lon: 120.5167, to: "Cordillera" },   // au lieu de Calabarzon
  { cc: 'PH', name: "Malanoog", lat: 17.6167, lon: 120.8667, to: "Cordillera" },   // au lieu de Bicol Region
  { cc: 'PH', name: "Lumit", lat: 5.9344, lon: 124.7258, to: "Soccsksargen" },   // au lieu de Davao Region
  { cc: 'PH', name: "Kulambugan", lat: 6.7, lon: 124.7833, to: "Autonomous Region in Muslim Mindanao" },   // au lieu de Northern Mindanao
  { cc: 'PH', name: "Kabasalan", lat: 7.0667, lon: 124.65, to: "Autonomous Region in Muslim Mindanao" },   // au lieu de Zamboanga Peninsula
  { cc: 'PH', name: "Imelda", lat: 7.647, lon: 122.9535, to: "Zamboanga Peninsula" },   // au lieu de Northern Mindanao
  { cc: 'PH', name: "Ibaba", lat: 14.65, lon: 120.95, to: "National Capital Region" },   // au lieu de Western Visayas
  { cc: 'PH', name: "Despujols", lat: 8.5833, lon: 124.5, to: "Northern Mindanao" },   // au lieu de Zamboanga Peninsula
  { cc: 'PH', name: "Dalahuan", lat: 7.9333, lon: 117.0667, to: "Mimaropa" },   // au lieu de Davao Region
  { cc: 'PH', name: "Dacong Cog", lat: 9.7833, lon: 123.7667, to: "Central Visayas" },   // au lieu de Western Visayas
  { cc: 'PH', name: "Borong", lat: 6.2833, lon: 124.1333, to: "Soccsksargen" },   // au lieu de Mimaropa
  { cc: 'PH', name: "Bacjauan Sur", lat: 11.2167, lon: 123.1, to: "Western Visayas" },   // au lieu de Bicol Region
  { cc: 'PH', name: "Valebermoso", lat: 10.4167, lon: 123.25, to: "Central Visayas" },   // au lieu de Ilocos
  { cc: 'PH', name: "Hondo Point", lat: 9.25, lon: 118, to: "Mimaropa" },   // au lieu de Ilocos
  { cc: 'PH', name: "Nahas", lat: 11.75, lon: 122, to: "Western Visayas" },   // au lieu de Ilocos
  { cc: 'PH', name: "Bago", lat: 10.75, lon: 122.5, to: "Western Visayas" },   // au lieu de Ilocos
  { cc: 'PH', name: "Pinaninding Barrio School", lat: 13.9142, lon: 121.8343, to: "Calabarzon" },   // au lieu de Ilocos
  { cc: 'PH', name: "Brgy. Aiburo", lat: 9.8959, lon: 126.0254, to: "Caraga" },   // au lieu de Northern Mindanao
  // Indonésie — province rendue par la carte, au même rang que le fichier.
  { cc: 'ID', name: "Bobokan", lat: -1.2244, lon: 98.8889, to: "West Sumatra" },   // au lieu de North Sumatra
  { cc: 'ID', name: "Tanahmerah", lat: 3.6833, lon: 117.5167, to: "North Kalimantan" },   // au lieu de East Kalimantan
  { cc: 'ID', name: "Japura", lat: -0.3251, lon: 102.3138, to: "Riau" },   // au lieu de Riau Islands
  { cc: 'ID', name: "Bocek", lat: -7.8747, lon: 112.5908, to: "East Java" },   // au lieu de Central Java
  { cc: 'ID', name: "Tempelrejo", lat: -7.625, lon: 110.5325, to: "Central Java" },   // au lieu de Aceh
  { cc: 'ID', name: "Bendokuluk", lat: -7.255, lon: 110.1775, to: "Central Java" },   // au lieu de Jakarta
  { cc: 'ID', name: "Alueduamuka", lat: 4.9813, lon: 97.7393, to: "Aceh" },   // au lieu de West Kalimantan
  { cc: 'ID', name: "Jopo", lat: -8.1133, lon: 113.379, to: "East Java" },   // au lieu de Jakarta
  { cc: 'ID', name: "Rokot", lat: -2.0873, lon: 99.6906, to: "West Sumatra" },   // au lieu de East Nusa Tenggara
  { cc: 'ID', name: "Kota Ternate", lat: 0.7833, lon: 127.3667, to: "North Maluku" },   // au lieu de Maluku
  { cc: 'ID', name: "Longsaan", lat: 2.5039, lon: 115.5679, to: "North Kalimantan" },   // au lieu de East Kalimantan
  { cc: 'ID', name: "Ramban", lat: -2.7185, lon: 112.8709, to: "Central Kalimantan" },   // au lieu de West Kalimantan
  { cc: 'ID', name: "Karanganjar", lat: -2.7261, lon: 111.5893, to: "Central Kalimantan" },   // au lieu de West Kalimantan
  // Danemark — commune rendue par la carte au rang municipal. Les quinze lieux étiquetés « Københavns Kommune »
//    ont été vérifiés UN PAR UN : dix sont à Vesthimmerland, DEUX à Rebild (Store et Lille Binderup — les supposer
//    identiques à leurs voisins aurait introduit deux erreurs), deux à Frederikshavn, et København seule est juste.
  { cc: 'DK', name: "Troelstrup", lat: 56.8458, lon: 9.5346, to: "Vesthimmerland Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Store Binderup", lat: 56.7638, lon: 9.5594, to: "Rebild Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Skagen", lat: 57.7209, lon: 10.5839, to: "Frederikshavn Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Sjøstrup", lat: 56.7937, lon: 9.5661, to: "Vesthimmerland Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Nyrup", lat: 56.7715, lon: 9.4927, to: "Vesthimmerland Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Lille Binderup", lat: 56.7866, lon: 9.5924, to: "Rebild Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Langdal", lat: 56.8671, lon: 9.5439, to: "Vesthimmerland Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Kelddal Gårde", lat: 56.8759, lon: 9.547, to: "Vesthimmerland Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Katby", lat: 56.8333, lon: 9.5833, to: "Vesthimmerland Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Gundestrup", lat: 56.8143, lon: 9.564, to: "Vesthimmerland Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Giver", lat: 56.8269, lon: 9.5842, to: "Vesthimmerland Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Gislum", lat: 56.7665, lon: 9.5203, to: "Vesthimmerland Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Aars", lat: 56.804, lon: 9.5144, to: "Vesthimmerland Kommune" },   // au lieu de Københavns Kommune
  { cc: 'DK', name: "Skagen port", lat: 57.7181, lon: 10.5945, to: "Frederikshavn Kommune" },   // au lieu de Københavns Kommune
  // Croatie (24/09/2026) — trouvée par RICOCHET, en contrôlant en production une fiche dont le code postal venait
  //    d'être effacé : la réponse affichait « Splitsko-Dalmatinska » pour un lieu de la presqu'île de Pelješac.
  //    Le crible ci-dessus l'avait RATÉE, et c'est son seuil qui explique pourquoi : il exigeait plus de 50 km
  //    d'écart d'avec les siens, or le lieu le plus proche réellement étiqueté Split-Dalmatie est à 19 km — de
  //    l'autre côté de l'eau. Ses 68 voisins à moins de 15 km sont TOUS en Dubrovnik-Neretva, et la carte place
  //    le lieu comme son voisin de 2 km (Pijavičino) dans la même županija. Sans effet sur la masse terrestre :
  //    en Croatie c'est le CODE POSTAL qui décide d'une île (HR_POSTCODE_TO_ISLAND), pas l'étiquette — vérifié,
  //    la fiche reste « continental » avant comme après, Pelješac étant une presqu'île.
  // Uruguay (24/09/2026) — trouvées en arbitrant les étiquettes des pays non régénérables : sur douze fiches
  //    tirées au sort, la carte en a démenti DEUX. « Tres Islas » était rangée à Montevideo, à 300 km de là.
  { cc: 'UY', name: "Tres Islas", lat: -32.5167, lon: -54.6833, to: "Cerro Largo" },   // au lieu de Montevideo Department
  { cc: 'UY', name: "Tambores", lat: -31.8774, lon: -56.2444, to: "Paysandú Department" },   // au lieu de Tacuarembó Department
  { cc: 'HR', name: "Gornji Dingač", lat: 42.9256, lon: 17.3533, to: "Dubrovačko-Neretvanska" },   // au lieu de Splitsko-Dalmatinska
];
// Comparaison au dix-millième de degré (~11 m) : la fiche visée est désignée sans risque d'en emporter une autre.
function fixDivision(country, name, lat, lon){
  for(var i = 0; i < DIVISION_FIXES.length; i++){
    var e = DIVISION_FIXES[i];
    if(e.cc === country && e.name === name && Math.abs(e.lat - lat) < 1e-4 && Math.abs(e.lon - lon) < 1e-4) return e.to;
  }
  return null;
}
// 13. LE CODE POSTAL EST DÉMENTI PAR LES COORDONNÉES (24/09/2026). Troisième famille après les points 11 et 12 :
//    là c'était la fiche en double, puis l'étiquette de région ; ici c'est le CODE POSTAL qui contredit le terrain.
//    CAUSE : le code n'est pas recopié d'une table, il est pris au POINT POSTAL LE PLUS PROCHE à moins de 15 km
//    (voir build-country-communes.js). Quand le fichier postal GeoNames contient un point mal placé, tout lieu
//    situé près de lui hérite d'un code d'une autre région — Sarrebruck, 182 971 habitants, porte ainsi 50424,
//    qui est Cologne, alors que ses propres quartiers portent 66104 et 66119.
//    CRIBLE : est signalé un lieu dont le préfixe postal diffère de celui de TOUS ses voisins à moins de 12 km
//    (cinq au minimum), ces voisins s'accordant entre eux. Aucune table de référence n'est nécessaire : les
//    lieux déjà publiés font foi. 40 suspects sur seize pays.
//    CONTRÔLE : chaque suspect a été soumis à la CARTE, qui renvoie elle-même un code postal (géocodage inverse
//    OpenStreetMap, une requête par seconde, zoom 14 puis 18). Rien n'est déduit du voisinage seul.
//    NON retenus, et c'est le contrôle qui les a écartés :
//      - TROIS faux positifs que la carte CONFIRME, de vraies enclaves postales que le crible seul aurait cassées :
//        Osidda (province de Nuoro enclavée en pays de Sassari), Tunø By (île), Morawsko ;
//      - SIX indécis, la carte ne renvoyant aucun code aux deux zooms : Conquista de la Sierra, Vale de Boi,
//        Corujeira, Castanheira, Kawaichō-jōgashima, Vrysopoyles ;
//      - CAMPIÑA (Espagne), qui est un cas INVERSE et reste OUVERT : son code 14600 et son étiquette disent
//        Cordoue, ses seules coordonnées disent Jaén, et ses 67 904 habitants sont le chiffre d'une comarque.
//        C'est la POSITION qui est fausse, pas le code : l'effacer détruirait la donnée juste. Sa bonne
//        position reste inconnue, aucune correction n'est donc appliquée.
//    GESTE : le code démenti est EFFACÉ, non remplacé. Le code rendu par la carte est celui de l'objet adressable
//    le plus proche — souvent le bourg voisin ou la commune englobante — et l'écrire ici reviendrait à attribuer
//    à un hameau le code d'un autre lieu. Le projet publie déjà des codes vides depuis le 21/09/2026 : un code
//    absent se voit, un code faux trompe. Vérifié : aucune de ces fiches ne change de masse terrestre une fois
//    son code effacé, la correction est donc sans effet sur les itinéraires.
const CP_CONTREDIT = [
  // Allemagne — 3 fiches.
  { cc: 'DE', name: "Saarbrücken", lat: 49.2326, lon: 7.0098 },   // 50424 ; la carte donne 66121 et ses 73 voisins sont tous en 66xx
  { cc: 'DE', name: "Albertstadt", lat: 51.0833, lon: 13.7667 },   // 04063 ; la carte donne 01099 et ses 118 voisins sont tous en 01xx
  { cc: 'DE', name: "Heidingsfeld", lat: 49.7611, lon: 9.9422 },   // 74064 ; la carte donne 97084 et ses 54 voisins sont tous en 97xx
  // Pays-Bas — 1 fiche.
  { cc: 'NL', name: "Zeewolde", lat: 52.33, lon: 5.5417 },   // 3981 ; la carte donne 3891 EV et ses 23 voisins sont tous en 38xx
  // Espagne — 11 fiches.
  { cc: 'ES', name: "Aldeire", lat: 37.1601, lon: -3.072 },   // 04897 ; la carte donne 18514 et ses 11 voisins sont tous en 18xx
  { cc: 'ES', name: "Zurbao / Zurbano", lat: 42.8707, lon: -2.6181 },   // 48110 ; la carte donne 01520 et ses 95 voisins sont tous en 01xx
  { cc: 'ES', name: "Vinyols i els Arcs", lat: 41.1167, lon: 1.0333 },   // 25144 ; la carte donne 43391 et ses 23 voisins sont tous en 43xx
  { cc: 'ES', name: "Ribes Altes", lat: 42.3167, lon: 2.1833 },   // 25289 ; la carte donne 17534 et ses 23 voisins sont tous en 17xx
  { cc: 'ES', name: "San Andrés", lat: 28.5, lon: -16.1833 },   // 35414 ; la carte donne 38120 et ses 59 voisins sont tous en 38xx
  { cc: 'ES', name: "Hoya Grande", lat: 28.1333, lon: -16.75 },   // 35299 ; la carte donne 38677 et ses 35 voisins sont tous en 38xx
  { cc: 'ES', name: "El Martinete", lat: 37.2144, lon: -3.8115 },   // 14940 ; la carte donne 18339 et ses 37 voisins sont tous en 18xx
  { cc: 'ES', name: "Vallverd de Queralt", lat: 41.4667, lon: 1.3167 },   // 25261 ; la carte donne 43424 et ses 29 voisins sont tous en 43xx
  { cc: 'ES', name: "Meirás", lat: 43.35, lon: -8.3 },   // 36870 ; la carte donne 15168 et ses 85 voisins sont tous en 15xx
  { cc: 'ES', name: "Corneda", lat: 42.4667, lon: -8.1167 },   // 27528 ; la carte donne 32536 et ses 81 voisins sont tous en 32xx
  { cc: 'ES', name: "Aeta", lat: 43.0761, lon: -2.2986 },   // 48003 ; la carte donne 20709 et ses 63 voisins sont tous en 20xx
  // Italie — 3 fiches.
  { cc: 'IT', name: "Villa Aresu", lat: 39.1958, lon: 9.0633 },   // 08030 ; la carte donne 09122 et ses 45 voisins sont tous en 09xx
  { cc: 'IT', name: "Bilgalzu", lat: 40.7837, lon: 9.0242 },   // 08020 ; la carte donne 07027 et ses 18 voisins sont tous en 07xx
  { cc: 'IT', name: "Pauli Mannu", lat: 39.9866, lon: 8.7047 },   // 08010 ; la carte donne 09077 et ses 59 voisins sont tous en 09xx
  // Portugal — 4 fiches.
  { cc: 'PT', name: "Laranjeiras", lat: 37.4058, lon: -7.4582 },   // 8800-164 ; la carte donne 21595 et ses 34 voisins sont tous en 89xx
  { cc: 'PT', name: "Hortas", lat: 37.1931, lon: -7.4379 },   // 8800-162 ; la carte donne 8900-265 et ses 30 voisins sont tous en 89xx
  { cc: 'PT', name: "Fontainhas", lat: 39.2437, lon: -8.7205 },   // 2140-436 ; la carte donne 2005-297 et ses 116 voisins sont tous en 20xx
  { cc: 'PT', name: "Piedade", lat: 38.4276, lon: -28.0597 },   // 9800-501 ; la carte donne 9930-229 et ses 18 voisins sont tous en 99xx
  // Croatie — 1 fiche.
  { cc: 'HR', name: "Gornji Dingač", lat: 42.9256, lon: 17.3533 },   // 21310 ; la carte donne 20244 et ses 35 voisins sont tous en 20xx
  // Pologne — 7 fiches.
  { cc: 'PL', name: "Godowa", lat: 49.8525, lon: 21.7983 },   // 39-102 ; la carte donne 38-100 et ses 56 voisins sont tous en 38xx
  { cc: 'PL', name: "Gniewczyna", lat: 50.1167, lon: 22.4833 },   // 38-120 ; la carte donne 37-306 et ses 56 voisins sont tous en 37xx
  { cc: 'PL', name: "Staroscin", lat: 50.9965, lon: 17.8262 },   // 48-112 ; la carte donne 46-112 et ses 50 voisins sont tous en 46xx
  { cc: 'PL', name: "Jeziorki Zabartowskie", lat: 53.2578, lon: 17.4413 },   // 85-115 ; la carte donne 89-115 et ses 46 voisins sont tous en 89xx
  { cc: 'PL', name: "Kunów", lat: 49.6004, lon: 20.742 },   // 30-000 ; la carte donne 33-327 et ses 77 voisins sont tous en 33xx
  { cc: 'PL', name: "Szydlice", lat: 54.1199, lon: 17.9614 },   // 82-400 ; la carte donne 83-400 et ses 55 voisins sont tous en 83xx
  { cc: 'PL', name: "Grójec", lat: 50.6535, lon: 18.95 },   // 41-283 ; la carte donne 42-283 et ses 62 voisins sont tous en 42xx
  // ---------------------------------------------------------------------------------------------------------
  // SECONDE PASSE (24/09/2026), CRIBLE CALIBRÉ PAR PAYS — 169 fiches, treize pays.
  //
  // La première passe supposait un préfixe de DEUX caractères partout. Faux dans les deux sens, vérifié :
  // POLTAVA porte 36000, son VRAI code, et ses voisins en 38xxx sont dans la même oblast (une oblast ukrainienne
  // couvre 36xxx à 39xxx) ; tandis que GROZNY porte 385798 quand toute sa région est en 36xxxx. Deux caractères,
  // c'est exact en Espagne, trop fin en Ukraine, trop grossier en Russie.
  //
  // CALIBRAGE, sans aucune table de référence. Pour chaque longueur L on demande à chaque lieu si le préfixe
  // MAJORITAIRE de ses voisins à 12 km est le sien ; la part de oui est la COHÉRENCE de L. On garde le préfixe le
  // plus FIN dont la cohérence reste à moins de cinq points de celle du plus GROSSIER — chaque pays jugé à son
  // propre étalon. Deux règles plus simples ont été essayées et écartées, et leurs contre-exemples sont gardés :
  //   - « le plus grand L au-dessus de 0,97 » écartait l'ESPAGNE (L2 = 0,960), où deux chiffres valent pourtant
  //     une province : le niveau de cohérence ne veut rien dire en soi, un lieu de frontière a légitimement une
  //     majorité de voisins d'à côté, et ce plancher dépend de la densité du pays ;
  //   - « le L qui précède la plus forte chute » donnait L = 4 à l'Espagne : la courbe décroît sans fin, donc la
  //     plus forte chute tombe toujours à la queue.
  // La marge de cinq points n'est pas libre : à six, l'Ukraine repasse à L = 2 et le bruit revient.
  //
  // GARDE INDISPENSABLE, trouvée en lisant des suspects zambiens : pour 143 pays sur 239, ce champ ne contient
  // PAS un code postal mais l'identifiant de RÉGION ISO (« ZM-08 », « BO-05 »), que le générateur y écrit faute
  // de fichier postal. Y faire tourner ce crible revient à tester la région sous couvert du code, et l'effacer y
  // détruirait la seule étiquette de région dont ces fiches disposent. Sans cette garde : 935 suspects, dont
  // l'essentiel venait de ces pays. Avec elle : 301, sur les 53 pays réellement calibrables.
  //
  // ARBITRAGE des 301 par la CARTE (géocodage inverse, une requête par seconde, zoom 14 puis 18) : 180 codes
  // contredits, 16 fiches INNOCENTÉES — la carte y confirme le code inscrit —, 5 sans verdict clair, 100 indécises.
  //
  // ONZE des 180 ont ensuite été ÉCARTÉES À LA MAIN, et chacune pour une raison nommée :
  //   - SACRAMENTO (94203) et HOLTSVILLE (00501) : codes RÉELS et valides, ceux des boîtes postales de l'État de
  //     Californie et du fisc fédéral. Ni le crible ni la carte ne distinguent « code d'ailleurs » de « autre code
  //     du même endroit » ; les effacer aurait détruit une donnée juste.
  //   - KALAMUNDA (6926) et MANCHESTER SQUARE (1209) : plages australiennes de boîtes postales, même raison.
  //   - ALGÉRIE (3 fiches) : Assi Bou Nif oppose 318 à 310, deux sous-zones du MÊME wilaya d'Oran — le calibrage
  //     y a retenu L = 3, trop fin. GÉORGIE (3 fiches) : cohérence plate au-delà de L2 (0,886 partout), donc le
  //     L = 4 retenu n'apporte aucune information.
  //   - CAMPIÑA : cas inverse déjà connu, protégé par tests/corrections.test.js.
  // Un filtre automatique a été tenté pour ces cas — distance au lieu le plus proche portant le même préfixe —
  // puis ABANDONNÉ : il est plafonné par construction, le crible exigeant déjà qu'aucun voisin à 12 km ne partage
  // ce préfixe. Minimum mesuré 12,1 km. Il ne sépare rien, et le dire vaut mieux que de s'en remettre à lui.
  // ---------------------------------------------------------------------------------------------------------
  // Ukraine — 96 fiches, préfixe calibré à 1 caractère.
  { cc: 'UA', name: "Lebedyn", lat: 50.5823, lon: 34.4826 },   // 28613 ; la carte donne 42200 et ses 28 voisins sont tous en 4
  { cc: 'UA', name: "Stebnyk", lat: 49.301, lon: 23.552 },   // 77453 ; la carte donne 82172 et ses 30 voisins sont tous en 8
  { cc: 'UA', name: "Trostyanets", lat: 50.4848, lon: 34.9657 },   // 19056 ; la carte donne 42600-42615 et ses 21 voisins sont tous en 4
  { cc: 'UA', name: "Pyryatyn", lat: 50.2439, lon: 32.5203 },   // 80359 ; la carte donne 37000-37004 et ses 31 voisins sont tous en 3
  { cc: 'UA', name: "Karlivka", lat: 49.4555, lon: 35.1349 },   // 27643 ; la carte donne 39500-39507 et ses 17 voisins sont tous en 3
  { cc: 'UA', name: "Mykolaivka", lat: 48.8619, lon: 37.7683 },   // 19449 ; la carte donne 84180 et ses 20 voisins sont tous en 8
  { cc: 'UA', name: "Hulyaypole", lat: 47.6668, lon: 36.2558 },   // 39036 ; la carte donne 70200-70205 et ses 26 voisins sont tous en 7
  { cc: 'UA', name: "Mykhaylivka", lat: 47.2686, lon: 35.2221 },   // 60400 ; la carte donne 72000-72007 et ses 15 voisins sont tous en 7
  { cc: 'UA', name: "Pivdenne", lat: 49.8813, lon: 36.0681 },   // 85293 ; la carte donne 62464 et ses 34 voisins sont tous en 6
  { cc: 'UA', name: "Rokytne", lat: 51.2789, lon: 27.2171 },   // 60320 ; la carte donne 34200 et ses 15 voisins sont tous en 3
  { cc: 'UA', name: "Talalaivka", lat: 50.9578, lon: 31.9209 },   // 20031 ; la carte donne 16651 et ses 28 voisins sont tous en 1
  { cc: 'UA', name: "Vynohradivka", lat: 45.679, lon: 28.5757 },   // 32123 ; la carte donne 68733 et ses 6 voisins sont tous en 6
  { cc: 'UA', name: "Sloboda", lat: 51.1981, lon: 33.6069 },   // 09250 ; la carte donne 41714 et ses 20 voisins sont tous en 4
  { cc: 'UA', name: "Vepryk", lat: 50.3701, lon: 34.176 },   // 08531 ; la carte donne 37362 et ses 19 voisins sont tous en 3
  { cc: 'UA', name: "Novodanylivka", lat: 46.6457, lon: 35.0249 },   // 28527 ; la carte donne 72520 et ses 13 voisins sont tous en 7
  { cc: 'UA', name: "Rozumivka", lat: 47.7539, lon: 35.1394 },   // 07716 ; la carte donne 70424 et ses 11 voisins sont tous en 7
  { cc: 'UA', name: "Novovodyane", lat: 47.429, lon: 34.6902 },   // 85017 ; la carte donne 71322 et ses 13 voisins sont tous en 7
  { cc: 'UA', name: "Pishchane", lat: 51.5076, lon: 25.1673 },   // 27204 ; la carte donne 44565 et ses 15 voisins sont tous en 4
  { cc: 'UA', name: "Bubnivska Slobidka", lat: 49.7026, lon: 31.7103 },   // 20240 ; la carte donne 19750 et ses 11 voisins sont tous en 1
  { cc: 'UA', name: "Valeryanivka", lat: 47.6387, lon: 37.3812 },   // 64812 ; la carte donne 85754 et ses 21 voisins sont tous en 8
  { cc: 'UA', name: "Brovarky", lat: 49.3693, lon: 32.9712 },   // 19712 ; la carte donne 39026 et ses 18 voisins sont tous en 3
  { cc: 'UA', name: "Troianivka", lat: 51.3363, lon: 25.2853 },   // 30624 ; la carte donne 44622 et ses 11 voisins sont tous en 4
  { cc: 'UA', name: "Sichove", lat: 46.6805, lon: 34.7876 },   // 28619 ; la carte donne 72513 et ses 17 voisins sont tous en 7
  { cc: 'UA', name: "Sushky", lat: 49.1075, lon: 33.9302 },   // 19024 ; la carte donne 39152 et ses 36 voisins sont tous en 3
  { cc: 'UA', name: "Kharkivtsi", lat: 50.2815, lon: 33.858 },   // 08433 ; la carte donne 37341 et ses 27 voisins sont tous en 3
  { cc: 'UA', name: "Fediivka", lat: 49.6788, lon: 34.2032 },   // 27230 ; la carte donne 38412 et ses 54 voisins sont tous en 3
  { cc: 'UA', name: "Luhovyky", lat: 50.2594, lon: 32.8298 },   // 07031 ; la carte donne 37122 et ses 21 voisins sont tous en 3
  { cc: 'UA', name: "Yerkivtsi", lat: 49.9216, lon: 33.0046 },   // 08430 ; la carte donne 37810 et ses 28 voisins sont tous en 3
  { cc: 'UA', name: "Severynivka", lat: 51.2506, lon: 25.6259 },   // 08039 ; la carte donne 44640 et ses 18 voisins sont tous en 4
  { cc: 'UA', name: "Sokolivshchyna", lat: 50.1991, lon: 34.2995 },   // 07718 ; la carte donne 38104 et ses 39 voisins sont tous en 3
  { cc: 'UA', name: "Dibrova", lat: 51.1556, lon: 27.979 },   // 59349 ; la carte donne 11023 et ses 24 voisins sont tous en 1
  { cc: 'UA', name: "Kochubeyivka", lat: 50.2658, lon: 36.2384 },   // 20323 ; la carte donne 62313 et ses 41 voisins sont tous en 6
  { cc: 'UA', name: "Didivshchyna", lat: 51.6566, lon: 33.3911 },   // 08514 ; la carte donne 41317 et ses 36 voisins sont tous en 4
  { cc: 'UA', name: "Buzova Paskivka", lat: 49.5022, lon: 34.783 },   // 62026 ; la carte donne 38773 et ses 39 voisins sont tous en 3
  { cc: 'UA', name: "Yaremivka", lat: 48.977, lon: 32.9991 },   // 64369 ; la carte donne 27534 et ses 19 voisins sont tous en 2
  { cc: 'UA', name: "Skybyntsi", lat: 50.1916, lon: 32.6962 },   // 09813 ; la carte donne 37124 et ses 25 voisins sont tous en 3
  { cc: 'UA', name: "Svystunivka", lat: 49.2563, lon: 34.7546 },   // 92642 ; la carte donne 39451 et ses 17 voisins sont tous en 3
  { cc: 'UA', name: "Lavryky", lat: 49.6162, lon: 34.3684 },   // 09054 ; la carte donne 38715 et ses 51 voisins sont tous en 3
  { cc: 'UA', name: "Shovkopliasy", lat: 49.3447, lon: 34.138 },   // 62338 ; la carte donne 39331 et ses 45 voisins sont tous en 3
  { cc: 'UA', name: "Shakhove", lat: 49.8028, lon: 38.4895 },   // 85050 ; la carte donne 92123 et ses 28 voisins sont tous en 9
  { cc: 'UA', name: "Derylove", lat: 49.0669, lon: 37.7288 },   // 64350 ; la carte donne 84450 et ses 16 voisins sont tous en 8
  { cc: 'UA', name: "Zavitne", lat: 50.9358, lon: 25.4823 },   // 26615 ; la carte donne 45221 et ses 29 voisins sont tous en 4
  { cc: 'UA', name: "Lisove", lat: 51.6667, lon: 26.4 },   // 07036 ; la carte donne 34141 et ses 11 voisins sont tous en 3
  { cc: 'UA', name: "Yasenivka", lat: 50.9929, lon: 24.9461 },   // 32150 ; la carte donne 45120 et ses 37 voisins sont tous en 4
  { cc: 'UA', name: "Vysochynivka", lat: 49.7068, lon: 39.5499 },   // 63431 ; la carte donne 92411 et ses 9 voisins sont tous en 9
  { cc: 'UA', name: "Vyshniv", lat: 51.1977, lon: 24.0304 },   // 77063 ; la carte donne 44301 et ses 22 voisins sont tous en 4
  { cc: 'UA', name: "Velykosillia", lat: 49.3946, lon: 22.822 },   // 60511 ; la carte donne 82074 et ses 29 voisins sont tous en 8
  { cc: 'UA', name: "Tseniava", lat: 48.5518, lon: 25.1256 },   // 60010 ; la carte donne 78255 et ses 33 voisins sont tous en 7
  { cc: 'UA', name: "Striletska Pushkarka", lat: 50.4397, lon: 35.4311 },   // 92650 ; la carte donne 42820 et ses 23 voisins sont tous en 4
  { cc: 'UA', name: "Spivakivka", lat: 49.0525, lon: 38.9081 },   // 64351 ; la carte donne 93512 et ses 17 voisins sont tous en 9
  { cc: 'UA', name: "Simianivka", lat: 51.1606, lon: 33.3587 },   // 38721 ; la carte donne 41656 et ses 27 voisins sont tous en 4
  { cc: 'UA', name: "Rozhny", lat: 50.6669, lon: 30.735 },   // 31520 ; la carte donne 07412 et ses 11 voisins sont tous en 0
  { cc: 'UA', name: "Prokhorivka", lat: 47.5268, lon: 37.6705 },   // 19023 ; la carte donne 85773 et ses 19 voisins sont tous en 8
  { cc: 'UA', name: "Pokhuvka", lat: 48.8011, lon: 24.5988 },   // 60512 ; la carte donne 77716 et ses 39 voisins sont tous en 7
  { cc: 'UA', name: "Pidluby", lat: 50.9231, lon: 27.7487 },   // 81066 ; la carte donne 11225 et ses 17 voisins sont tous en 1
  { cc: 'UA', name: "Pidlisky", lat: 50.5784, lon: 26.4597 },   // 81373 ; la carte donne 35440 et ses 43 voisins sont tous en 3
  { cc: 'UA', name: "Ploske", lat: 50.0448, lon: 37.3439 },   // 20762 ; la carte donne 62607 et ses 36 voisins sont tous en 6
  { cc: 'UA', name: "Mykilske", lat: 49.5358, lon: 39.9594 },   // 84011 ; la carte donne 92510 et ses 16 voisins sont tous en 9
  { cc: 'UA', name: "Nemyrivka", lat: 50.9907, lon: 28.7183 },   // 35563 ; la carte donne 11542 et ses 32 voisins sont tous en 1
  { cc: 'UA', name: "Naraivka", lat: 50.8062, lon: 27.9048 },   // 77191 ; la carte donne 11242 et ses 28 voisins sont tous en 1
  { cc: 'UA', name: "Nahoriany", lat: 51.3681, lon: 28.5367 },   // 60114 ; la carte donne 11131 et ses 47 voisins sont tous en 1
  { cc: 'UA', name: "Moskalenky", lat: 51.0753, lon: 34.2745 },   // 09742 ; la carte donne 41841 et ses 49 voisins sont tous en 4
  { cc: 'UA', name: "Mlyny", lat: 51.1376, lon: 28.6668 },   // 78416 ; la carte donne 11190 et ses 17 voisins sont tous en 1
  { cc: 'UA', name: "Myrivka", lat: 47.7772, lon: 35.8813 },   // 31246 ; la carte donne 70153 et ses 34 voisins sont tous en 7
  { cc: 'UA', name: "Mircha", lat: 50.6463, lon: 29.2792 },   // 07810 ; la carte donne 12231 et ses 27 voisins sont tous en 1
  { cc: 'UA', name: "Litky", lat: 51.0507, lon: 28.421 },   // 07411 ; la carte donne 11325 et ses 26 voisins sont tous en 1
  { cc: 'UA', name: "Lypyne", lat: 50.9098, lon: 27.3961 },   // 81057 ; la carte donne 11713 et ses 21 voisins sont tous en 1
  { cc: 'UA', name: "Kotliarivka", lat: 47.1199, lon: 36.2535 },   // 63745 ; la carte donne 71200 et ses 19 voisins sont tous en 7
  { cc: 'UA', name: "Komarivka", lat: 51.0701, lon: 26.3342 },   // 08020 ; la carte donne 35016 et ses 28 voisins sont tous en 3
  { cc: 'UA', name: "Kobylianka", lat: 51.5715, lon: 31.5391 },   // 20536 ; la carte donne 15531 et ses 23 voisins sont tous en 1
  { cc: 'UA', name: "Kyselivka", lat: 51.601, lon: 32.2213 },   // 20513 ; la carte donne 15640 et ses 22 voisins sont tous en 1
  { cc: 'UA', name: "Zabiliany", lat: 48.6381, lon: 28.5599 },   // 19117 ; la carte donne 24220 et ses 25 voisins sont tous en 2
  { cc: 'UA', name: "Grabovo", lat: 51.4383, lon: 23.6977 },   // 80719 ; la carte donne 44023 et ses 14 voisins sont tous en 4
  { cc: 'UA', name: "Chystopillia", lat: 47.3712, lon: 35.6655 },   // 93500 ; la carte donne 71725 et ses 20 voisins sont tous en 7
  { cc: 'UA', name: "Hlynianka", lat: 51.1351, lon: 24.1977 },   // 23017 ; la carte donne 44356 et ses 28 voisins sont tous en 4
  { cc: 'UA', name: "Bystrytsia", lat: 49.2583, lon: 23.2251 },   // 32535 ; la carte donne 82190 et ses 26 voisins sont tous en 8
  { cc: 'UA', name: "Brusivka", lat: 49.3303, lon: 39.4015 },   // 28645 ; la carte donne 92814 et ses 16 voisins sont tous en 9
  { cc: 'UA', name: "Borysivka", lat: 46.7876, lon: 36.4093 },   // 27269 ; la carte donne 72151 et ses 6 voisins sont tous en 7
  { cc: 'UA', name: "Berezhnytsia", lat: 49.4616, lon: 23.118 },   // 59217 ; la carte donne 81480 et ses 51 voisins sont tous en 8
  { cc: 'UA', name: "Baranivka", lat: 50.8745, lon: 29.2201 },   // 32143 ; la carte donne 11618 et ses 35 voisins sont tous en 1
  { cc: 'UA', name: "Sotniki", lat: 50.1853, lon: 36.1217 },   // 19415 ; la carte donne 62322 et ses 55 voisins sont tous en 6
  { cc: 'UA', name: "Slobidske", lat: 49.3485, lon: 36.3915 },   // 20842 ; la carte donne 64123 et ses 32 voisins sont tous en 6
  { cc: 'UA', name: "Rozhdestvenske", lat: 51.8908, lon: 33.8442 },   // 16260 ; la carte donne 41242 et ses 31 voisins sont tous en 4
  { cc: 'UA', name: "Pidlissia", lat: 51.3127, lon: 23.6975 },   // 31036 ; la carte donne 44310 et ses 19 voisins sont tous en 4
  { cc: 'UA', name: "Lonivka", lat: 50.9546, lon: 27.9455 },   // 81277 ; la carte donne 11212 et ses 19 voisins sont tous en 1
  { cc: 'UA', name: "Illinske", lat: 51.3768, lon: 33.8308 },   // 07633 ; la carte donne 41508 et ses 55 voisins sont tous en 4
  { cc: 'UA', name: "Hlyniane", lat: 50.9553, lon: 34.5813 },   // 27041 ; la carte donne 42304 et ses 57 voisins sont tous en 4
  { cc: 'UA', name: "Prosika", lat: 50.8316, lon: 27.6543 },   // 60424 ; la carte donne 11234 et ses 24 voisins sont tous en 1
  { cc: 'UA', name: "Zoria", lat: 50.5549, lon: 30.9467 },   // 20231 ; la carte donne 07452 et ses 21 voisins sont tous en 0
  { cc: 'UA', name: "Sofiivka", lat: 50.7467, lon: 31.7987 },   // 07641 ; la carte donne 17150 et ses 35 voisins sont tous en 1
  { cc: 'UA', name: "Step", lat: 50.7296, lon: 32.6733 },   // 07551 ; la carte donne 17311 et ses 23 voisins sont tous en 1
  { cc: 'UA', name: "Vovkivka", lat: 49.1191, lon: 35.5852 },   // 20720 ; la carte donne 64041 et ses 25 voisins sont tous en 6
  { cc: 'UA', name: "Yurivka", lat: 48.4255, lon: 36.6758 },   // 85194 ; la carte donne 52912 et ses 21 voisins sont tous en 5
  { cc: 'UA', name: "Osykuvate", lat: 48.4049, lon: 33.7682 },   // 27662 ; la carte donne 52119 et ses 25 voisins sont tous en 5
  { cc: 'UA', name: "Yabluniv", lat: 49.6865, lon: 31.4013 },   // 09130 ; la carte donne 19032 et ses 18 voisins sont tous en 1
  { cc: 'UA', name: "Heronymivka", lat: 49.4517, lon: 31.9504 },   // 32010 ; la carte donne 19601 et ses 6 voisins sont tous en 1
  // Russie — 38 fiches, préfixe calibré à 2 caractères.
  { cc: 'RU', name: "Grozny", lat: 43.312, lon: 45.6889 },   // 385798 ; la carte donne 364022 et ses 11 voisins sont tous en 36
  { cc: 'RU', name: "Mikhaylovka", lat: 50.0619, lon: 43.2334 },   // 412336 ; la carte donne 403343 et ses 10 voisins sont tous en 40
  { cc: 'RU', name: "Izobil’nyy", lat: 45.3665, lon: 41.7091 },   // 347674 ; la carte donne 356141 et ses 12 voisins sont tous en 35
  { cc: 'RU', name: "Konstantinovsk", lat: 47.5811, lon: 41.0934 },   // 352410 ; la carte donne 347250 et ses 9 voisins sont tous en 34
  { cc: 'RU', name: "Tsentral’nyy", lat: 56.297, lon: 42.7887 },   // 155929 ; la carte donne 606087 et ses 18 voisins sont tous en 60
  { cc: 'RU', name: "Malinovo", lat: 55.7483, lon: 38.8726 },   // 303659 ; la carte donne 142632 et ses 60 voisins sont tous en 14
  { cc: 'RU', name: "Yelizavetino", lat: 57.6833, lon: 42.5833 },   // 141332 ; la carte donne 157900 et ses 11 voisins sont tous en 15
  { cc: 'RU', name: "Viflyantsev", lat: 47.8953, lon: 41.5048 },   // 396721 ; la carte donne 347276 et ses 9 voisins sont tous en 34
  { cc: 'RU', name: "Verkhniye Yaki", lat: 55.6904, lon: 51.0294 },   // 612931 ; la carte donne 422172 et ses 18 voisins sont tous en 42
  { cc: 'RU', name: "Tenishevo", lat: 54.355, lon: 43.7599 },   // 422839 ; la carte donne 431273 et ses 30 voisins sont tous en 43
  { cc: 'RU', name: "Stepnoy", lat: 46.6954, lon: 48.1783 },   // 352411 ; la carte donne 416150 et ses 18 voisins sont tous en 41
  { cc: 'RU', name: "Stakhanovskiy", lat: 59.5487, lon: 48.835 },   // 301275 ; la carte donne 613750 et ses 7 voisins sont tous en 61
  { cc: 'RU', name: "Sergiyevskoye", lat: 44.9516, lon: 42.7034 },   // 385637 ; la carte donne 356274 et ses 5 voisins sont tous en 35
  { cc: 'RU', name: "Rozovka", lat: 51.098, lon: 47.1912 },   // 359066 ; la carte donne 413247 et ses 5 voisins sont tous en 41
  { cc: 'RU', name: "Rodina", lat: 57.2833, lon: 59.3 },   // 453072 ; la carte donne 623036 et ses 5 voisins sont tous en 62
  { cc: 'RU', name: "Progress", lat: 52.0627, lon: 42.2148 },   // 352212 ; la carte donne 393462 et ses 15 voisins sont tous en 39
  { cc: 'RU', name: "Petrovskiy", lat: 50.7531, lon: 41.978 },   // 309547 ; la carte donne 403115 et ses 15 voisins sont tous en 40
  { cc: 'RU', name: "Ozerki", lat: 53.59, lon: 47.938 },   // 429921 ; la carte donne 433781 et ses 10 voisins sont tous en 43
  { cc: 'RU', name: "Gashkovo", lat: 60.0963, lon: 35.4914 },   // 187736 ; la carte donne 162468 et ses 11 voisins sont tous en 16
  { cc: 'RU', name: "Nikol’skoye", lat: 51.6747, lon: 54.515 },   // 452444 ; la carte donne 460504 et ses 5 voisins sont tous en 46
  { cc: 'RU', name: "Moiseyevka", lat: 54.0333, lon: 49.7667 },   // 607861 ; la carte donne 433528 et ses 7 voisins sont tous en 43
  { cc: 'RU', name: "Lebyazh’ye", lat: 54.1167, lon: 49.6167 },   // 393474 ; la carte donne 433540 et ses 8 voisins sont tous en 43
  { cc: 'RU', name: "Kiselëvka", lat: 56.7702, lon: 58.6144 },   // 617821 ; la carte donne 623040 et ses 7 voisins sont tous en 62
  { cc: 'RU', name: "Blagodatka", lat: 53.0973, lon: 46.4264 },   // 393937 ; la carte donne 442501 et ses 11 voisins sont tous en 44
  { cc: 'RU', name: "Araslambayevskiy", lat: 53.5419, lon: 59.6033 },   // 163020 ; la carte donne 457658 et ses 10 voisins sont tous en 45
  { cc: 'RU', name: "Ternovskaya", lat: 47.7745, lon: 42.1688 },   // 352102 ; la carte donne 347316 et ses 8 voisins sont tous en 34
  { cc: 'RU', name: "Internatsional’nyy", lat: 43.48, lon: 44.104 },   // 346473 ; la carte donne 361201 et ses 15 voisins sont tous en 36
  { cc: 'RU', name: "Yachmeneva", lat: 57.8696, lon: 62.2274 },   // 617565 ; la carte donne 624683 et ses 16 voisins sont tous en 62
  { cc: 'RU', name: "Stantsionnyy-Polevskoy", lat: 56.4412, lon: 60.3156 },   // 456653 ; la carte donne 623388 et ses 6 voisins sont tous en 62
  { cc: 'RU', name: "Malinovka", lat: 55.8675, lon: 63.0106 },   // 452021 ; la carte donne 641756 et ses 6 voisins sont tous en 64
  { cc: 'RU', name: "Georgiyevka", lat: 56.2752, lon: 88.6226 },   // 663643 ; la carte donne 652256 et ses 8 voisins sont tous en 65
  { cc: 'RU', name: "Chernovskoye", lat: 54.9224, lon: 60.0621 },   // 680520 ; la carte donne 456388 et ses 5 voisins sont tous en 45
  { cc: 'RU', name: "Berëzovo", lat: 55.2333, lon: 86.25 },   // 633574 ; la carte donne 650510 et ses 7 voisins sont tous en 65
  { cc: 'RU', name: "Anyshtaikha", lat: 53.15, lon: 86.2 },   // 680700 ; la carte donne 659470 et ses 6 voisins sont tous en 65
  { cc: 'RU', name: "Kamenushka", lat: 56.2043, lon: 60.4487 },   // 623375 ; la carte donne 456813 et ses 8 voisins sont tous en 45
  { cc: 'RU', name: "Sotsposëlok", lat: 58.0929, lon: 56.2305 },   // 456656 ; la carte donne 614112 et ses 19 voisins sont tous en 61
  { cc: 'RU', name: "Nikol’skiy", lat: 54.8415, lon: 44.1392 },   // 307233 ; la carte donne 607742 et ses 23 voisins sont tous en 60
  { cc: 'RU', name: "Firyusikha", lat: 55.1929, lon: 42.1935 },   // 391561 ; la carte donne 607042 et ses 12 voisins sont tous en 60
  // Australie — 15 fiches, préfixe calibré à 2 caractères.
  { cc: 'AU', name: "Tuross Head", lat: -36.0533, lon: 150.1332 },   // 2630 ; la carte donne 2537 et ses 8 voisins sont tous en 25
  { cc: 'AU', name: "Moonee Beach", lat: -30.2057, lon: 153.1529 },   // 2259 ; la carte donne 2450 et ses 10 voisins sont tous en 24
  { cc: 'AU', name: "Bowen Mountain", lat: -33.5719, lon: 150.6256 },   // 2800 ; la carte donne 2753 et ses 9 voisins sont tous en 27
  { cc: 'AU', name: "Greenmount", lat: -27.7858, lon: 151.9008 },   // 4225 ; la carte donne 4359 et ses 8 voisins sont tous en 43
  { cc: 'AU', name: "Mogo", lat: -35.7848, lon: 150.1417 },   // 2850 ; la carte donne 2536 et ses 14 voisins sont tous en 25
  { cc: 'AU', name: "Strathallan", lat: -36.25, lon: 144.75 },   // 3622 ; la carte donne 3564 et ses 5 voisins sont tous en 35
  { cc: 'AU', name: "Medway", lat: -34.4916, lon: 150.2823 },   // 2820 ; la carte donne 2577 et ses 9 voisins sont tous en 25
  { cc: 'AU', name: "St Mary", lat: -25.6988, lon: 152.4997 },   // 4570 ; la carte donne 4650 et ses 8 voisins sont tous en 46
  { cc: 'AU', name: "Rose Valley", lat: -34.7235, lon: 150.8096 },   // 2630 ; la carte donne 2534 et ses 6 voisins sont tous en 25
  { cc: 'AU', name: "Upper Ryans Creek", lat: -36.6368, lon: 146.1925 },   // 3875 ; la carte donne 3673 et ses 7 voisins sont tous en 36
  { cc: 'AU', name: "The Grange", lat: -24.8167, lon: 152.4167 },   // 4051 ; la carte donne 4670 et ses 14 voisins sont tous en 46
  { cc: 'AU', name: "Langley", lat: -23.4655, lon: 150.4517 },   // 4630 ; la carte donne 4702 et ses 8 voisins sont tous en 47
  { cc: 'AU', name: "Springfield", lat: -33.3433, lon: 149.2635 },   // 2630 ; la carte donne 2800 et ses 7 voisins sont tous en 28
  { cc: 'AU', name: "Woodlands", lat: -35.3166, lon: 149.8863 },   // 2536 ; la carte donne 2622 et ses 8 voisins sont tous en 26
  { cc: 'AU', name: "Mountain Spring Dairy", lat: -28.5973, lon: 153.4457 },   // 2370 ; la carte donne 2482 et ses 69 voisins sont tous en 24
  // Inde — 6 fiches, préfixe calibré à 2 caractères.
  { cc: 'IN', name: "Mathurāpur", lat: 22.1151, lon: 88.3925 },   // 700039 ; la carte donne 743354 et ses 45 voisins sont tous en 74
  { cc: 'IN', name: "Jamrauli", lat: 27.1523, lon: 76.6695 },   // 321609 ; la carte donne 301409 et ses 5 voisins sont tous en 30
  { cc: 'IN', name: "Chinchura", lat: 23.1963, lon: 87.0887 },   // 713150 ; la carte donne 722101 et ses 7 voisins sont tous en 72
  { cc: 'IN', name: "Thotta Rāmachandrapuram", lat: 16.7702, lon: 81.444 },   // 521340 ; la carte donne 534406 et ses 91 voisins sont tous en 53
  { cc: 'IN', name: "Siripuram", lat: 16.2843, lon: 80.6945 },   // 533432 ; la carte donne 522306 et ses 76 voisins sont tous en 52
  { cc: 'IN', name: "Handigund", lat: 16.4208, lon: 75.0606 },   // 591235 ; la carte donne 587312 et ses 7 voisins sont tous en 58
  // Turquie — 5 fiches, préfixe calibré à 2 caractères.
  { cc: 'TR', name: "Isparta", lat: 37.7644, lon: 30.5522 },   // 33080 ; la carte donne 32100 et ses 13 voisins sont tous en 32
  { cc: 'TR', name: "İncirli", lat: 38.5318, lon: 35.7701 },   // 99655 ; la carte donne 38900 et ses 26 voisins sont tous en 38
  { cc: 'TR', name: "Sürtme", lat: 38.5783, lon: 35.2862 },   // 99655 ; la carte donne 38560 et ses 10 voisins sont tous en 38
  { cc: 'TR', name: "Esenköy", lat: 39.2143, lon: 29.9153 },   // 20600 ; la carte donne 43210 et ses 25 voisins sont tous en 43
  { cc: 'TR', name: "Çiçekli", lat: 38.5006, lon: 27.2855 },   // 45750 ; la carte donne 35040 et ses 29 voisins sont tous en 35
  // Uruguay — 2 fiches, préfixe calibré à 2 caractères.
  { cc: 'UY', name: "Pan de Azúcar", lat: -34.7787, lon: -55.2358 },   // 30300 ; la carte donne 20300 et ses 10 voisins sont tous en 20
  { cc: 'UY', name: "Puntas de Cañada Grande", lat: -34.4079, lon: -56.7392 },   // 15600 ; la carte donne 80000 et ses 5 voisins sont tous en 80
  // Portugal — 1 fiche, préfixe calibré à 1 caractère.
  { cc: 'PT', name: "Pinhal Novo", lat: 38.6311, lon: -8.9138 },   // 7570-701 ; la carte donne 2955-093 et ses 49 voisins sont tous en 2
  // Arménie — 1 fiche, préfixe calibré à 1 caractère.
  { cc: 'AM', name: "Vardenis", lat: 40.1827, lon: 45.7316 },   // 0309 ; la carte donne 1601 et ses 6 voisins sont tous en 1
  // Roumanie — 1 fiche, préfixe calibré à 2 caractères.
  { cc: 'RO', name: "Oreavu", lat: 45.5895, lon: 27.1507 },   // 127661 ; la carte donne 627156 et ses 43 voisins sont tous en 62
  // Costa Rica — 1 fiche, préfixe calibré à 1 caractère.
  { cc: 'CR', name: "Quebrador", lat: 9.6035, lon: -83.7909 },   // 30203 ; la carte donne 11703 et ses 9 voisins sont tous en 1
  // Tchéquie — 1 fiche, préfixe calibré à 1 caractère.
  { cc: 'CZ', name: "Lhotka", lat: 49.9013, lon: 14.189 },   // 142 00 ; la carte donne 267 28 et ses 94 voisins sont tous en 2
  // Indonésie — 1 fiche, préfixe calibré à 2 caractères.
  { cc: 'ID', name: "Kebon Kelapa", lat: -6.3094, lon: 108.3081 },   // 16125 ; la carte donne 45222 et ses 314 voisins sont tous en 45
  // Tunisie — 1 fiche, préfixe calibré à 2 caractères.
  { cc: 'TN', name: "Douar el Haj Salah", lat: 36.4908, lon: 8.4814 },   // 7112 ; la carte donne 8160 et ses 14 voisins sont tous en 81
];
// Comparaison au dix-millième de degré (~11 m), comme fixDivision : la fiche visée est désignée sans risque
// d'en emporter une autre — « Laranjeiras » existe cinq fois au Portugal, une seule est visée.
function cpContredit(country, name, lat, lon){
  for(var i = 0; i < CP_CONTREDIT.length; i++){
    var e = CP_CONTREDIT[i];
    if(e.cc === country && e.name === name && Math.abs(e.lat - lat) < 1e-4 && Math.abs(e.lon - lon) < 1e-4) return true;
  }
  return false;
}
// 14. RÉGION PRISE AU DUMP, PAS AU POINT POSTAL (24/09/2026). Quatre pays étaient devenus NON RÉGÉNÉRABLES :
//    leur régénération changeait des milliers d'étiquettes de région — Russie 173 477 lignes, Australie 13 036,
//    Costa Rica 4 425, Uruguay 554 — sans qu'aucune fiche ne soit perdue, ajoutée ni déplacée : SEULE l'étiquette
//    changeait. Cause : le fichier publié avait été fabriqué SANS fichier postal, donc avec l'admin1 du dump
//    (l'État, la province, l'oblast) ; ces fichiers postaux sont là aujourd'hui, et le générateur prend alors la
//    région au POINT POSTAL LE PLUS PROCHE, qui porte l'admin2 — le district.
//    CE N'EST PAS UN SIMPLE CHANGEMENT DE RANG, c'est une PERTE DE JUSTESSE, et la carte l'a mesurée sur douze
//    fiches tirées au sort par pays (géocodage inverse, une requête par seconde, zoom 10, qui rend l'État ET le
//    district dans la même réponse) :
//      - COSTA RICA : province publiée juste 12 fois sur 12 ; canton régénéré FAUX 4 fois sur 12 (Cueva rangée
//        à San Ramón quand la carte dit Naranjo, Quebrador à Paraíso quand la carte dit Dota, Peñas Blancas à
//        San Ramón quand la carte dit Esparza).
//      - RUSSIE : l'oblast publié est juste (Смоленская область, Тверская область, Татарстан…) ; le raïon
//        régénéré est FAUX au moins une fois sur douze (Mishino rangée au raïon de Novgorod quand la carte dit
//        Borovitchi) et il est écrit EN CAPITALES CYRILLIQUES, là où tout le reste du fichier est en latin.
//      - AUSTRALIE : l'État publié est confirmé 12 fois sur 12 ; les shires régénérés ne sont pas vérifiables,
//        la carte ne rendant pas de comté pour ce pays. On ne troque pas du confirmé contre de l'invérifiable.
//      - URUGUAY : les deux se valent presque — 2 erreurs publiées contre 3 régénérées sur douze. Les deux
//        erreurs publiées relevées sont corrigées à part, dans DIVISION_FIXES.
//    RAISON DE FOND : le point postal le plus proche peut se trouver DE L'AUTRE CÔTÉ d'une limite de district.
//    L'erreur est rare au rang de l'État, fréquente au rang du district. C'est la même mécanique qui a produit
//    les étiquettes fausses corrigées une à une dans DIVISION_FIXES.
//    Pour ces pays, la région est donc prise au DUMP, comme si aucun fichier postal n'existait — le code postal,
//    lui, continue de venir du point postal. Les quatre redeviennent régénérables à l'identique.
const REGION_DU_DUMP = new Set(['RU', 'AU', 'UY', 'CR']);
function excludePlace(country, geonameid, name, lat, lon){
  return isWrongCountry(country, geonameid) || isJunkId(country, geonameid) || HISTORICAL_NAME_RE.test(name || '') || isJunkName(name) ||
    isProjectBatch(country, geonameid) || isAntarcticUnderAR(country, lat) || isSark(country, lat, lon) || isPlaceholderCoord(lat, lon, geonameid) ||
    isAdminCoordConflict(country, name, lat, lon);
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
//     572 groupes, les deux critères désignent la même graphie 452 fois ; sur les 120 divergences (« 443 / 129 »
//     au 19e audit, recompté au 20e sur l'état d'avant la fusion, dans l'ordre réel des fichiers), la fréquence
//     l'emporte partout sauf un motif connu : le roumain, où la cédille héritée « Dobreşti » (5 occurrences) est
//     plus fréquente que la virgule souscrite correcte « Dobrești » (3). Limite assumée et écrite : départager deux
//     orthographes demande une source orthographique que le dépôt n'a pas ; la fréquence est le meilleur signal
//     disponible hors ligne.
//   - CE QUI RESTE après la fusion : 6 paires à moins de 300 m publient encore deux populations non nulles
//     différentes (12 avant) et 29 produisent deux suggestions (34 avant la fusion, 28 avant que les lieux sans code
//     postal ne soient publiés le 21/09/2026) — celles dont les deux points tombent de part et d'autre d'une limite
//     de case de 0,01°, que cette clé ne peut pas rapprocher. tests/data.test.js fige ces deux nombres, à la valeur
//     EXACTE et non en plafond depuis le 20e audit : ils ne peuvent plus bouger en silence, ni à la hausse ni à la
//     baisse.

// 9. QUASI-DOUBLONS (audit n° 11) — le dédoublonnage des générateurs compare le nom et les coordonnées BRUTES arrondies
//    à 0,01° : deux fiches du même lieu de part et d'autre d'une limite d'arrondi (64,24497 et 64,24503) passaient
//    toutes les deux (93 paires : « Şūfī Qal‘ah » AF à 0,7 km, « Yaguajay » CU à 30 m…). Deuxième passe sur les lignes
//    publiées (« pop;lon,lat;cp;région;nom ») : même nom (casse ignorée) et même point à 0,01° près SUR LES COORDONNÉES
//    PUBLIÉES -> une seule ligne gardée, la plus peuplée (à égalité, la première). Ne fait que retirer des lignes, jamais
//    en séparer ; l'ordre des lignes gardées est inchangé.
function dropNearDuplicates(lines){
  const nomOf = l => l.split(';')[4];
  // Fréquence de chaque GRAPHIE dans le pays : premier critère de départage (voir 9 bis).
  const fréquence = new Map();
  lines.forEach(l => { if(l){ const n = nomOf(l); fréquence.set(n, (fréquence.get(n) || 0) + 1); } });
  const best = new Map();
  // Clé : nom NORMALISÉ comme le moteur (19e audit du 21/09/2026) + point arrondi à 0,01°. Avec le nom brut, deux
  // lignes du même lieu qui ne diffèrent que par un accent ou un trait d'union passaient toutes les deux.
  const keyOf = l => {
    const p = l.split(';'); const ll = (p[1] || '').split(',');
    return normalizeCityName(p[4]) + '|' + (+ll[1]).toFixed(2) + '|' + (+ll[0]).toFixed(2);
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

// 10. COMMUNES FRANÇAISES DONT LE POINT OFFICIEL N'EST PAS SUR L'ÎLE HABITÉE (24/09/2026).
//     `public/data/communes.txt` reprend la liste officielle (geo.api.gouv.fr, IGN / Etalab) et
//     build-france-lieux.js promet de ne retoucher AUCUNE ligne IGN. Cette table est la seule exception, et
//     chaque entrée porte la mesure qui la justifie. Elle ne vaut QUE pour les communes d'outre-mer étalées sur
//     plusieurs îles, où le point officiel tombe sur un atoll quasi désert à des centaines de kilomètres de la
//     population : là, recopier fidèlement revient à publier une ville au mauvais endroit.
//     La correction est appliquée par le générateur, donc elle survit à une régénération ; le nom, le code
//     postal et le département de la ligne IGN ne sont jamais touchés, seul le couple de coordonnées l'est.
const IGN_COORD_FIXES = {
  // La commune de Fangatau réunit l'atoll de Fangatau, qui lui donne son nom et porte son chef-lieu, et celui
  // de FAKAHINA, à 72 km au sud-est. Le point officiel est sur Fakahina, à 1,5 km de son centre, donc à 79 km
  // de l'atoll de Fangatau. Même choix que pour Nukutavake : le point va sur l'atoll qui nomme la commune.
  'Fangatau|987': { lat: -15.82, lon: -140.8872,
    source: 'https://en.wikipedia.org/wiki/Fangatau (15°49′12″S 140°53′14″O)' },
  // Les 1 570 habitants de la commune des Gambier vivent TOUS sur les îles Mangareva ; la commune couvre en
  // outre Temoe, Marutea Sud, Morane et Maria Est. Le point officiel, -22,0353 / -136,186, est en PLEINE MER
  // à 174 km au nord-ouest de Rikitea, son chef-lieu : c'est le plus gros écart des 48 communes polynésiennes.
  'Gambier|987': { lat: -23.1203, lon: -134.9692,
    source: 'https://en.wikipedia.org/wiki/Rikitea (23°7′13″S 134°58′9″O, chef-lieu sur Mangareva)' },
  // La commune de Tureia couvre Tureia, Vanavana, Tematagi, MORUROA et Fangataufa. Le point officiel tombe à
  // 14 km de Moruroa, inhabité, soit 133 km de l'atoll de Tureia où vivent les 261 habitants.
  'Tureia|987': { lat: -20.7711, lon: -138.5647,
    source: 'https://en.wikipedia.org/wiki/Tureia (20°46′16″S 138°33′53″O)' },
  // La commune de Hao regroupe douze îles. Le point officiel tombe à 13 km de Nengonengo, inhabité, soit
  // 121 km de l'atoll de Hao et de son chef-lieu Otepa, où vivent les 1 227 habitants.
  'Hao|987': { lat: -18.0753, lon: -140.9453,
    source: 'https://en.wikipedia.org/wiki/Hao_(French_Polynesia) (18°4′31″S 140°56′43″O)' },
  // La commune d'Anaa couvre Anaa, Faaite et les atolls INHABITÉS de Tahanea et Motutunga. Le point officiel
  // tombe à 15 km de Tahanea, soit 84 km de l'atoll d'Anaa. Les 970 habitants sont sur Anaa et Faaite.
  'Anaa|987': { lat: -17.3419, lon: -145.5086,
    source: 'https://en.wikipedia.org/wiki/Anaa (17°20′31″S 145°30′31″O)' },
  // La commune de Nuku-Hiva couvre l'île de Nuku Hiva (339 km²) et les îles INHABITÉES d'Eiao et Hatutu, à
  // 97 et 103 km au nord-ouest. Le point officiel part vers elles : 61 km de Taiohae, chef-lieu, où se
  // concentrent les 3 025 habitants. C'est la commune la plus peuplée des sept.
  'Nuku-Hiva|987': { lat: -8.9097, lon: -140.1014,
    source: 'https://en.wikipedia.org/wiki/Taioha%27e (8°54′35″S 140°6′5″O, chef-lieu)' },
  // La commune de Nukutavake couvre Nukutavake, Vahitahi, Pinaki et Vairaatea. Le point officiel est sur
  // VAHITAHI (105 habitants), à 55 km de l'atoll de Nukutavake qui donne son nom à la commune.
  'Nukutavake|987': { lat: -19.2667, lon: -138.7667,
    source: 'https://en.wikipedia.org/wiki/Nukutavake (19°16′S 138°46′O)' },
  // La commune d'Arutua couvre Arutua (826 hab.), Apataki (350) et Kaukura (475). Le point officiel est à
  // 13 km d'Apataki, soit 33 km de l'atoll d'Arutua, le plus peuplé et celui qui nomme la commune.
  'Arutua|987': { lat: -15.2453, lon: -146.6119,
    source: 'https://en.wikipedia.org/wiki/Arutua (15°14′43″S 146°36′43″O)' },
  // La commune de Maupiti couvre Maupiti, Maupihaʻa (Mopelia), Manuae (Scilly) et Motu One (Bellingshausen).
  // geo.api.gouv.fr publie -16,78 / -153,9401 pour le `centre` ET pour la `mairie` — c'est Maupihaʻa, à 2,5 km
  // près (16°48′S 153°57′W), où vivaient SEPT personnes au 27/08/2023. L'île de Maupiti, où vivent les 1 302
  // habitants de la commune et où siège la mairie, est à 16°26′24″S 152°16′27″W, soit 236 km plus à l'est.
  // Conséquence mesurée avant correction : la liaison du Maupiti Express vers Bora Bora, trois fois par semaine,
  // mesurait 236 km au lieu de 40, et n'a pas pu être écrite (lot de couverture, passe 5).
  // L'erreur est dans la source officielle, pas dans sa reprise : le projet la corrige ici plutôt que de
  // republier une commune habitée sur un atoll désert.
  // ÉLARGISSEMENT du 24/09/2026 : les deux entrées ci-dessous ne corrigent pas une île FAUSSE — le point y est
  // sur la bonne masse terrestre — mais un CENTROÏDE posé loin de la population, sur la partie déserte. Le
  // crible des 170 communes d'outre-mer hors Polynésie n'a trouvé que ces deux-là ; ailleurs, les communes
  // multi-îles ont toutes leur point sur l'île habitée.
  // La commune de Rangiroa couvre l'atoll de Rangiroa (80 km de long, 2 785 hab.) et ceux de Tikehau, Mataiva
  // et Makatea. Le point officiel, -15,1921 / -147,8597, est à l'extrémité SUD-OUEST de l'atoll, à 35 km de
  // TIPUTA, son chef-lieu, et d'Avatoru : les deux villages, où vit l'essentiel de la population, sont au NORD.
  // Contrairement aux dix premières entrées, le point n'était pas sur une île fausse — c'est un centroïde d'un
  // atoll géant, comme Ouvéa et Miquelon-Langlade ; il rejoint la même règle, le point va où vivent les gens.
  'Rangiroa|987': { lat: -14.9761, lon: -147.6250,
    source: 'https://en.wikipedia.org/wiki/Tiputa (14°58′34″S 147°37′30″O, chef-lieu de la commune)' },
  // La commune d'Ouvéa couvre l'atoll (croissant de 35 km, trois districts : Saint-Joseph, Fayaoué, Mouli) et
  // les îlots Beautemps-Beaupré. Le point officiel est à 28 km de la référence de l'île, à l'extrémité nord,
  // vers les îlots Pléiades, quand les 3 162 habitants vivent le long du croissant.
  'Ouvéa|988': { lat: -20.6522, lon: 166.5619,
    source: 'https://en.wikipedia.org/wiki/Ouv%C3%A9a_Island (20°39′8″S 166°33′43″E)' },
  // Miquelon et Langlade sont soudées par la dune de Langlade, donc une seule masse — mais LANGLADE N'A PLUS
  // D'HABITANT PERMANENT depuis 2006, et les 596 habitants de la commune vivent tous au village de Miquelon,
  // sur la pointe nord. Le point officiel est à 15 km au sud, sur l'isthme désert.
  'Miquelon-Langlade|975': { lat: 47.1000, lon: -56.3792,
    source: 'https://en.wikipedia.org/wiki/Miquelon-Langlade (47°06′00″N 56°22′45″O, village de Miquelon)' },
  // La commune d'Arue couvre Arue, dans la banlieue est de Papeete, ET l'atoll de TETIAROA, à 58 km au nord de
  // Tahiti. geo.api.gouv.fr publie -17,0496 / -149,5463 pour le `centre` ET pour la `mairie` : ce point est sur
  // Tetiaroa (17°00′S 149°35′W), où vivaient 240 personnes en 2017, à 52 km d'Arue et de ses 10 322 habitants.
  // Le projet le savait déjà et le contournait : la règle d'île d'Arue rangeait la commune par son code postal
  // 98701 « dont le point du fichier est erroné (…) en mer ~50 km au nord ». Le contournement réglait le
  // classement, pas la POSITION — Arue restait publiée en mer, à 52 km de là où elle est.
  'Arue|987': { lat: -17.5161, lon: -149.5117,
    source: 'https://en.wikipedia.org/wiki/Arue,_French_Polynesia (17°30′58″S 149°30′42″O)' },
  'Maupiti|987': { lat: -16.4401, lon: -152.2743,
    source: 'https://en.wikipedia.org/wiki/Maupiti (16°26′24,3″S 152°16′27,3″O ; village de Vaiea)' },
};
// La clé est « nom|département » : communes.txt ne porte pas de code INSEE.
function fixIgnCoord(nom, dept){
  return IGN_COORD_FIXES[nom + '|' + dept] || null;
}

module.exports = { NAME_FIXES, fixName, LOST_CHARS_RE, WRONG_COUNTRY, isWrongCountry, HISTORICAL_NAME_RE, EDITOR_COMMENT_NAME_RE, PLACEHOLDER_NAMES,
  PLACEHOLDER_QUALIFIED_RE, JUNK_IDS, isJunkId, LOCAL_SCRIPT_DUPLICATES, SAME_POINT_DUPLICATES, INPUT_SYMBOL_RE, ALIAS_REPAIR_REJECT, repairAliasTypography, repairAliasLoose,
  BROKEN_BRACKET_RE, hasUnbalancedParen, UNDERSCORE_RE, PROJECT_BATCH, isProjectBatch, isJunkName, ANTARCTIC_TREATY_LAT, isAntarcticUnderAR, SARK_BOX, isSark, isPlaceholderCoord, PLACEHOLDER_COORD_OK, regionLabel, excludePlace,
  fixMixedScript, hasMixedScriptWord, aliasLangFromScript, SCRIPT_ONE_LANG, SCRIPT_MANY_LANGS, cleanPlaceName, preparePlaceName, dropNearDuplicates, ADMIN_COORD_CONFLICT, isAdminCoordConflict, DIVISION_FIXES, fixDivision, CP_CONTREDIT, cpContredit, REGION_DU_DUMP, IGN_COORD_FIXES, fixIgnCoord };
