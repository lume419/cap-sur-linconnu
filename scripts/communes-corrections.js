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

// geonameid -> [pays du dump, nom, pays réel, 'doublon' | 'absent', détail]
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
const EDITOR_COMMENT_NAME_RE = /delete\?|\bdelete\b|\bduplicate\b|\bplease\b|no such a? ?place|not a PPL|not inhabited|\(\?[^)]*\?\)|https?:\/\/|www\.|\(historical region\)|ROAD DESTINATION|@|\d\s?m2\b|\d\s?m²/i;
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
  '1554185': ['CN', 'Qiancheli-父听过', 'nom incertain (suffixe chinois sans rapport, aucune autre forme)']
};
function isJunkId(country, geonameid){
  const e = JUNK_IDS[geonameid];
  return !!(e && e[0] === country);
}
// Crochet non apparié : caractère perdu à la saisie (« Baidaonath[ur » BD, « Bādar[ar Kālusan », « Suppam[ālaiyam » IN :
// « [ » à la place d'une lettre, probablement « p », voisine sur le clavier — supposition, donc lieu écarté comme pour
// « ? » plus bas) ou morceau de note (« 50 km.] [ROAD… »).
const BROKEN_BRACKET_RE = /\[[^\]]*$|^[^\[]*\]/;
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
  '3126127': ['ES', 'XXX', 'Casa Blanca', 'asciiname de la fiche (« Casa Blanca »)']
};
function fixName(country, geonameid, name){
  const e = NAME_FIXES[geonameid];
  return (e && e[0] === country && e[1] === name) ? e[2] : name;
}
const LOST_CHARS_RE = /\?/;
function isJunkName(name){
  name = name || '';
  return !name || EDITOR_COMMENT_NAME_RE.test(name) || PLACEHOLDER_NAMES.has(name) || PLACEHOLDER_QUALIFIED_RE.test(name) ||
    LOST_CHARS_RE.test(name) || BROKEN_BRACKET_RE.test(name);
}

// Filtre commun, appelé par chaque générateur sur chaque ligne du dump : true = lieu écarté.
function excludePlace(country, geonameid, name, lat, lon){
  return isWrongCountry(country, geonameid) || isJunkId(country, geonameid) || HISTORICAL_NAME_RE.test(name || '') || isJunkName(name) ||
    isProjectBatch(country, geonameid) || isAntarcticUnderAR(country, lat) || isSark(country, lat, lon);
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

// 9. QUASI-DOUBLONS (audit n° 11) — le dédoublonnage des générateurs compare le nom et les coordonnées BRUTES arrondies
//    à 0,01° : deux fiches du même lieu de part et d'autre d'une limite d'arrondi (64,24497 et 64,24503) passaient
//    toutes les deux (93 paires : « Şūfī Qal‘ah » AF à 0,7 km, « Yaguajay » CU à 30 m…). Deuxième passe sur les lignes
//    publiées (« pop;lon,lat;cp;région;nom ») : même nom (casse ignorée) et même point à 0,01° près SUR LES COORDONNÉES
//    PUBLIÉES -> une seule ligne gardée, la plus peuplée (à égalité, la première). Ne fait que retirer des lignes, jamais
//    en séparer ; l'ordre des lignes gardées est inchangé.
function dropNearDuplicates(lines){
  const best = new Map();
  const keyOf = l => {
    const p = l.split(';'); const ll = (p[1] || '').split(',');
    return p.slice(4).join(';').toLowerCase() + '|' + (+ll[1]).toFixed(2) + '|' + (+ll[0]).toFixed(2);
  };
  lines.forEach((l, i) => {
    if(!l) return;
    const k = keyOf(l), pop = parseInt(l, 10) || 0, prev = best.get(k);
    if(!prev || pop > prev.pop) best.set(k, { i, pop });
  });
  return lines.filter((l, i) => !l || best.get(keyOf(l)).i === i);
}

module.exports = { NAME_FIXES, fixName, LOST_CHARS_RE, WRONG_COUNTRY, isWrongCountry, HISTORICAL_NAME_RE, EDITOR_COMMENT_NAME_RE, PLACEHOLDER_NAMES,
  PLACEHOLDER_QUALIFIED_RE, JUNK_IDS, isJunkId,
  BROKEN_BRACKET_RE, PROJECT_BATCH, isProjectBatch, isJunkName, ANTARCTIC_TREATY_LAT, isAntarcticUnderAR, SARK_BOX, isSark, excludePlace,
  fixMixedScript, cleanPlaceName, preparePlaceName, dropNearDuplicates };
