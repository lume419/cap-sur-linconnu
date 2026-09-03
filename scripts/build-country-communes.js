// Convertit les données GeoNames (dump géographique + codes postaux) en fichiers communes-XX.txt
// au même format que communes.txt (France) : population;lon,lat;cp1,cp2,...;region;nom
// Une ligne de plus par rapport au format France : le code pays est dans le nom de fichier
// (communes-es.txt), pas dans chaque ligne — cohérent avec le choix "un fichier par pays".
const fs = require('fs');
const path = require('path');

const COUNTRIES = ['LV', 'LT', 'EE']; // dump/ et postal/ ne contiennent que les fichiers des pays
// en cours d'ajout — AD/ES/PT/BE/NL/LU/CH/DE/IT/AT/SM/LI/MC/MT/GG/JE/CZ/PL/SK/HU/SI/HR/BA/GB/IE/IM/
// DK/NO/SE/FI/AX/AL/RS/MK/RO/BG sont déjà générés et commités (public/data/communes-ad|es|pt|be|
// nl|lu|ch|de|it|at|sm|li|mc|mt|gg|je|cz|pl|sk|hu|si|hr|ba|gb|ie|im|dk|no|se|fi|ax|al|rs|mk|ro|
// bg.txt), pas la peine de retélécharger leurs sources pour les régénérer à l'identique à chaque
// nouvel ajout. La Grèce (GR) n'utilise PAS ce script standard : aucun fichier de codes postaux
// GeoNames pour ce pays, voir build-gr-communes.js (reconstruction depuis une source tierce).
// Monténégro (ME) et Kosovo (XK) n'utilisent PAS ce script standard : aucun fichier de codes
// postaux GeoNames pour ces deux pays, voir build-me-communes.js/build-xk-communes.js
// (reconstruction depuis une source tierce).
// Codes de "lieu habité nommé" à conserver (villes, villages, hameaux...) — PPLX (simple quartier
// d'une autre localité déjà comptée) et PPLW/PPLQ (détruit/abandonné) sont exclus pour éviter les
// doublons et les lieux qui n'existent plus.
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180, dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Grille spatiale simple (cellules ~0.1°) pour retrouver rapidement les entrées de codes postaux
// proches d'un point donné, sans comparer chaque lieu à des dizaines de milliers de codes postaux.
function buildGrid(points){
  const grid = new Map();
  const cell = (lat, lon) => Math.round(lat*10) + '_' + Math.round(lon*10);
  points.forEach(p => {
    const k = cell(p.lat, p.lon);
    if(!grid.has(k)) grid.set(k, []);
    grid.get(k).push(p);
  });
  return { grid, cell };
}
function nearest(gridObj, lat, lon, maxKm){
  const { grid, cell } = gridObj;
  const cLat = Math.round(lat*10), cLon = Math.round(lon*10);
  let best = null, bestDist = Infinity;
  for(let dLat=-1; dLat<=1; dLat++){
    for(let dLon=-1; dLon<=1; dLon++){
      const k = (cLat+dLat) + '_' + (cLon+dLon);
      const bucket = grid.get(k);
      if(!bucket) continue;
      for(const p of bucket){
        const d = haversineKm(lat, lon, p.lat, p.lon);
        if(d < bestDist){ bestDist = d; best = p; }
      }
    }
  }
  return (best && bestDist <= maxKm) ? best : null;
}

// Écarts isolés et confirmés (grep manuel) entre le champ "name" canonique de GeoNames et le nom
// local : GeoNames stocke parfois un exonyme anglais/français plutôt que le nom réellement utilisé
// sur place. "Lisbon" au lieu de "Lisboa" pour la capitale portugaise — vérifié sur un échantillon
// d'une dizaine d'autres grandes villes ES/PT (Sevilla, Zaragoza, Coimbra, Braga, Córdoba, Valencia,
// Porto...), toutes correctes en langue locale. Même chose pour quatre villes belges : "Brussels"
// (anglais — remplacé par le français "Bruxelles", déjà ce qu'utilise le champ "place" du fichier
// des codes postaux pour cette même ville), "Antwerp"/"Ostend" (anglais, remplacés par le
// néerlandais "Antwerpen"/"Oostende" — région flamande, comme "Gent"/"Brugge"/"Ieper" déjà corrects
// dans le dump), "Saint-Vith" (francisé, remplacé par l'allemand "Sankt Vith" — cette commune est
// dans la Communauté germanophone, troisième langue officielle du pays). Même chose pour "The
// Hague" (anglais, remplacé par le néerlandais "Den Haag" — nom déjà utilisé tel quel par le champ
// "place" du fichier des codes postaux pour cette même ville ; le reste de l'échantillon néerlandais
// vérifié, Rotterdam/Utrecht/Eindhoven/Nijmegen..., est déjà correct en langue locale). Deux cas
// suisses (échantillon des ~60 plus grandes communes du pays, reste correct en langue locale malgré
// les quatre langues officielles en présence — Zürich, Basel, Luzern, Biel/Bienne, Bellinzona,
// Sankt Gallen... déjà bons) : "Geneva" (exonyme anglais, remplacé par le français "Genève" — seule
// langue officielle du canton), "Sitten" (exonyme allemand employé côté GeoNames pour cette commune
// bilingue du Valais, remplacé par le français "Sion" — nom officiel utilisé pour la signalétique et
// les codes postaux de cette ville, bien que "Sitten" reste un nom attesté côté germanophone). Deux
// cas allemands (échantillon des 30 plus grandes communes du pays, reste déjà correct en langue
// locale — Köln, Frankfurt am Main, Düsseldorf, Hannover, Braunschweig... malgré leurs exonymes
// français/anglais fréquents) : "Munich" (anglais, remplacé par l'allemand "München"), "Nuremberg"
// (anglais, remplacé par l'allemand "Nürnberg"). Huit cas italiens (échantillon des 70 plus grandes
// communes du pays — Palermo, Bologna, Bari, Catania, Verona, Trieste, Bolzano, Udine... déjà bons,
// y compris les villes bilingues du Tyrol du Sud) : les grandes capitales régionales les plus connues
// à l'international ont presque toutes un exonyme anglais dans le dump GeoNames — "Rome"->"Roma",
// "Milan"->"Milano", "Naples"->"Napoli", "Turin"->"Torino", "Genoa"->"Genova", "Florence"->"Firenze",
// "Padua"->"Padova", "Venice"->"Venezia". Un cas autrichien (échantillon des 25 plus grandes
// communes du pays — Graz, Linz, Salzburg, Innsbruck, Klagenfurt am Wörthersee... déjà bons) :
// "Vienna" (anglais, remplacé par l'allemand "Wien"). Cas isolés, corrigés à la main plutôt que
// d'intégrer le fichier alternateNamesV2 (bien plus volumineux) pour si peu d'exceptions connues.
const NAME_OVERRIDES = {
  'Lisbon': 'Lisboa',
  'Brussels': 'Bruxelles',
  'Antwerp': 'Antwerpen',
  'Ostend': 'Oostende',
  'Saint-Vith': 'Sankt Vith',
  'The Hague': 'Den Haag',
  'Geneva': 'Genève',
  'Sitten': 'Sion',
  'Munich': 'München',
  'Nuremberg': 'Nürnberg',
  'Rome': 'Roma',
  'Milan': 'Milano',
  'Naples': 'Napoli',
  'Turin': 'Torino',
  'Genoa': 'Genova',
  'Florence': 'Firenze',
  'Padua': 'Padova',
  'Venice': 'Venezia',
  'Vienna': 'Wien',
  // Deux cas tchèques (échantillon des 80 plus grandes communes du pays — Brno, Ostrava, Liberec,
  // Olomouc, České Budějovice, Hradec Králové, Ústí nad Labem... déjà bons) : "Prague" (anglais,
  // remplacé par le tchèque "Praha") et "Pilsen" (exonyme allemand, remplacé par le tchèque
  // "Plzeň" — nom déjà utilisé par le reste du dump pour cette même ville, ex. son district
  // "Plzeň-město").
  'Prague': 'Praha',
  'Pilsen': 'Plzeň',
  // Deux cas polonais (échantillon des 160 plus grandes communes du pays — Kraków, Wrocław,
  // Poznań, Gdańsk, Szczecin, Lublin, Białystok... déjà bons) : "Warsaw" (exonyme anglais,
  // remplacé par le polonais "Warszawa") et "Lodz" (pas un exonyme cette fois, mais une entrée
  // GeoNames avec diacritiques manquants pour la capitale de la voïvodie de Łódź elle-même —
  // remplacée par "Łódź", déjà la forme utilisée par le reste du dump pour cette même ville, ex.
  // son quartier "Łódź-Widzew"). Un troisième cas du même genre (diacritiques manquants, pas un
  // exonyme) : "Bielsko-Biala" -> "Bielsko-Biała", déjà la forme utilisée par le champ région de
  // cette même ligne et par tout le reste du dump pour cette commune (ex. son comté
  // "Bielsko-Biała County").
  'Warsaw': 'Warszawa',
  'Lodz': 'Łódź',
  'Bielsko-Biala': 'Bielsko-Biała',
  // Six cas irlandais (échantillon des ~200 plus grandes communes du pays — Dublin, Cork, Limerick,
  // Galway, Waterford, Drogheda, Dundalk... déjà en anglais, y compris "Dún Laoghaire" qui n'a lui
  // AUCUN exonyme anglais distinct d'usage courant, correctement laissé tel quel) : contrairement à
  // tous les cas ci-dessus (où le nom LOCAL remplace un exonyme anglais), ces six communes ont dans
  // GeoNames un nom PRIMAIRE en irlandais alors que l'anglais — également langue officielle de
  // l'Irlande (Bunreacht na hÉireann, art. 8) et de très loin la forme la plus utilisée à
  // l'international (Airbnb/Booking, signalétique touristique, tourisme anglophone majoritaire) —
  // reste le nom courant même localement pour CES villes précises : "An Ros" -> "Rush" (Co. Dublin),
  // "Droichead Nua" -> "Newbridge" (Co. Kildare), "An Muileann gCearr" -> "Mullingar" (Co.
  // Westmeath), "Baile an Mhuilinn" -> "Milltown" (Co. Kerry), "Cill Fhíonáin" -> "Kilfinane" (Co.
  // Limerick), "Cluain Meala" -> "Clonmel" (Co. Tipperary) — chaque forme anglaise vérifiée présente
  // comme nom alternatif GeoNames sur la même entrée.
  'An Ros': 'Rush',
  'Droichead Nua': 'Newbridge',
  'An Muileann gCearr': 'Mullingar',
  'Baile an Mhuilinn': 'Milltown',
  'Cill Fhíonáin': 'Kilfinane',
  'Cluain Meala': 'Clonmel',
  // Deux cas supplémentaires, repérés non pas par relecture visuelle (comme les six ci-dessus, sur
  // l'échantillon des plus grandes communes) mais via un signal plus systématique : dans
  // aliases-ie.txt fraîchement généré, plusieurs langues INDÉPENDANTES proposaient exactement le
  // même nom alternatif pour la même commune — un signe fiable qu'il s'agit du vrai nom "de
  // référence" plutôt que d'une coïncidence. "Trá Mhór" -> "Tramore" (Co. Waterford, station
  // balnéaire connue) et "Leifear" -> "Lifford" (Co. Donegal, chef-lieu du comté) : huit et trois
  // langues respectivement s'accordaient toutes sur la forme anglaise. Les autres accords multi-
  // langues observés (Lahinch/Lehinch, Ennistymon/Ennistimon, Cahersiveen/Cahirciveen...) ne sont
  // PAS corrigés ici : ce ne sont que deux ORTHOGRAPHES anglaises concurrentes d'un même nom déjà
  // anglais, pas un cas irlandais-vs-anglais — l'app n'a jamais cherché à trancher entre variantes
  // d'une même langue (voir le choix GeoNames tel quel partout ailleurs), seulement à corriger un
  // exonyme manquant ou une vraie confusion de langue.
  'Trá Mhór': 'Tramore',
  'Leifear': 'Lifford',
  // Deux cas danois (échantillon des 30 plus grandes communes du pays — Odense, Aalborg,
  // Frederiksberg, Esbjerg, Randers, Kolding, Horsens, Vejle... déjà bons, y compris les caractères
  // æ/ø/å) : "Copenhagen" (exonyme anglais, remplacé par le danois "København" — capitale) et
  // "Århus" (pas un exonyme cette fois mais une orthographe DANOISE périmée : la ville a officiellement
  // repris l'orthographe historique "Aarhus" le 1er janvier 2011, abandonnant le "Å" adopté en 1948 —
  // remplacé par "Aarhus", déjà la forme utilisée par le reste du dump pour cette même ville, ex. sa
  // région "Aarhus Kommune" sur la même ligne).
  'Copenhagen': 'København',
  'Århus': 'Aarhus',
  // Un cas suédois (échantillon des 30 plus grandes communes du pays — Stockholm, Malmö, Uppsala,
  // Linköping, Örebro, Umeå, Västerås, Jönköping, Helsingborg... déjà bons, y compris les caractères
  // å/ä/ö) : "Gothenburg" (exonyme anglais, remplacé par le suédois "Göteborg" — deuxième ville du
  // pays).
  'Gothenburg': 'Göteborg',
  // Deux cas finlandais (échantillon des 80 plus grandes communes du pays — Helsinki, Espoo, Tampere,
  // Vantaa, Oulu, Turku, Jyväskylä... déjà bons). La Finlande est officiellement bilingue
  // finnois/suédois, et GeoNames respecte ici correctement la langue LOCALEMENT dominante commune par
  // commune plutôt que d'imposer systématiquement le finnois — vérifié pour plusieurs communes à
  // majorité suédophone conservées à raison sous leur nom suédois (Raseborg/Raasepori ~64% suédophone,
  // Jakobstad/Pietarsaari ~66%, Korsholm/Mustasaari ~68%, Väståboland/Länsi-Turunmaa très majoritaire
  // suédophone) : aucune de ces quatre n'est corrigée ici, à raison. Seuls deux VRAIS cas isolés
  // corrigés : "Hyvinge" -> "Hyvinkää" (commune historiquement et actuellement quasi exclusivement
  // finnophone, jamais à majorité suédophone — le nom suédois ici n'a aucune légitimité locale,
  // contrairement aux quatre communes ci-dessus) et "Sibbo" -> "Sipoo" (Uusimaa, longtemps à majorité
  // suédophone mais officiellement repassée à majorité FINNOPHONE au 1er janvier 2023 — stat.fi,
  // 65,3% finnophone / 26,8% suédophone fin 2025 — le nom suédois n'est donc plus le nom de la
  // majorité locale actuelle, à la différence des quatre communes citées plus haut).
  'Hyvinge': 'Hyvinkää',
  'Sibbo': 'Sipoo',
  // Un cas albanais (échantillon des 30 plus grandes communes du pays — Durrës, Vlorë, Elbasan,
  // Shkodër, Lushnjë, Berat, Korçë, Fier... déjà bons, y compris ë/ç) : "Tirana" (exonyme anglais,
  // remplacé par l'albanais "Tiranë" — déjà la forme utilisée par le reste du dump pour cette même
  // ville, ex. sa région "Bashkia Tiranë" sur la même ligne).
  'Tirana': 'Tiranë',
  // Deux cas serbes (échantillon des 400 plus grandes communes du pays — Niš, Novi Sad, Kragujevac,
  // Subotica, Čačak... déjà bons, y compris č/ć/š/ž/đ) : "Belgrade" (exonyme anglais, remplacé par
  // le serbe "Beograd" — déjà la forme utilisée par le reste du dump pour cette même ville, ex. son
  // district "Novi Beograd" resté correct) et "Knjazevac" (pas un exonyme cette fois mais un
  // diacritique manquant dans le champ "name" lui-même, repéré par recoupement avec la liste des
  // noms alternatifs de cette même entrée qui contient bien "Knjaževac" — remplacé en conséquence).
  'Belgrade': 'Beograd',
  'Knjazevac': 'Knjaževac',
  // Un cas roumain (échantillon des 300 plus grandes communes du pays — Iaşi, Constanţa, Braşov,
  // Timişoara, Craiova, Galaţi, Târgu Mureş... déjà bons, y compris ş/ţ) : "Bucharest" (exonyme
  // anglais, remplacé par "Bucureşti" — déjà la forme utilisée par le reste du dump pour cette même
  // ville dans sa liste de noms alternatifs, avec la même cédille ş/ţ que le reste du jeu de
  // données plutôt que la variante à virgule souscrite ș/ț de la norme actuelle, pour rester
  // cohérent avec l'orthographe déjà choisie par GeoNames pour toutes les autres communes
  // roumaines). Aucune correction nécessaire côté bulgare (échantillon des 300 plus grandes communes
  // du pays — Sofia, Plovdiv, Varna, Burgas... déjà bons) : le bulgare, langue cyrillique, n'a pas
  // de forme latine "officielle" à diacritiques comme le roumain — la translittération BGN/PCGN sans
  // diacritique déjà utilisée par GeoNames pour tout le pays (Kardzhali, Varshets...) est la même que
  // celle employée par les autorités bulgares elles-mêmes sur la signalétique routière.
  'Bucharest': 'Bucureşti',
  // La Lettonie a demandé un seul cas — mais la capitale elle-même : "Riga", champ "name" GeoNames
  // SANS le macron sur le I long (échantillon des 140 plus grandes communes du pays — Daugavpils,
  // Liepāja, Jelgava, Jūrmala, Ventspils, Rēzekne, Valmiera, Cēsis... déjà bons, macron compris) —
  // contradiction interne au dump lui-même : l'entrée ADM1/ADM2 de Riga (la région administrative,
  // pas la ville) porte elle bien le nom "Rīga" avec macron, et "Rīga" figure aussi dans la propre
  // liste de noms alternatifs de l'entrée ville. Corrigé en "Rīga", cohérent avec le reste du dump.
  'Riga': 'Rīga',
  // La Lituanie, elle, a demandé BEAUCOUP plus de corrections que tout autre pays de cette série —
  // onze cas parmi les ~200 plus grandes communes du pays (Vilnius, Kaunas, Klaipėda, Šiauliai,
  // Panevėžys, Alytus, Marijampolė, Jonava, Utena, Kėdainiai... déjà bons) : le dump GeoNames
  // lituanien omet le macron du ū/ė ou le caron du š/ž/č dans le champ "name" pour ces onze
  // communes précises, alors que la quasi-totalité du reste du pays est correcte. Chaque cas
  // vérifié par recoupement avec l'entrée ADM2 (municipalité de district) correspondante dans le
  // même dump, qui porte elle la forme correcte avec diacritiques (ex. "Ukmergės rajono
  // savivaldybė") — sauf Vilkaviškis, sans entrée ADM2 propre dans cet extrait GeoNames, retenue
  // malgré tout sur la seule foi de sa liste de noms alternatifs (où "Vilkaviškis" figure).
  'Ukmerge': 'Ukmergė',
  'Telsiai': 'Telšiai',
  'Taurage': 'Tauragė',
  'Silute': 'Šilutė',
  'Radviliskis': 'Radviliškis',
  'Plunge': 'Plungė',
  'Naujoji Akmene': 'Naujoji Akmenė',
  'Mazeikiai': 'Mažeikiai',
  'Kupiskis': 'Kupiškis',
  'Birzai': 'Biržai',
  'Vilkaviskis': 'Vilkaviškis'
  // L'Estonie, elle, n'a demandé AUCUNE correction : échantillon des 100 plus grandes communes du
  // pays déjà bon, diacritiques compris (Tallinn, Tartu, Pärnu, Kohtla-Järve, Rakvere, Kuressaare,
  // Sillamäe, Võru, Jõhvi...).
};
// Pas un exonyme mais une confusion de caractère systématique dans le dump GeoNames croate : 48
// noms de communes (ex. "Sveti Ðurđ", "Ðurđenovac", "Ðeletovci") utilisent le Ð latin (Eth
// islandais/féroïen, U+00D0) au lieu du VRAI Đ croate (D barré, U+0110) — les deux se ressemblent
// à l'écran mais sont deux caractères Unicode distincts, et aucun pays déjà couvert par cette app
// n'utilise légitimement le premier (l'islandais/féroïen ne sont pas des langues gérées ici).
// Remplacement global plutôt que 48 entrées NAME_OVERRIDES : appliqué à chaque nom lu du dump,
// avant même NAME_OVERRIDES (voir cleanName plus bas), aucun risque de faux positif pour les
// autres pays déjà générés (jamais régénérés à l'identique, voir COUNTRIES en haut de ce fichier).
function cleanName(raw){ return (NAME_OVERRIDES[raw] || raw).replace(/Ð/g, 'Đ'); }
// Sercq (Sark), dépendance du bailliage de Guernesey, remonte dans le dump GeoNames sous le code
// pays GG (elle n'a pas son propre code ISO) au même titre que les paroisses de Guernesey — mais
// contrairement aux îles Wadden (voir FERRY_ROUTES/landmassOf dans app.js), qui ont toutes une VRAIE
// ligne de ferry pour véhicules même si son usage touristique reste restreint en pratique, Sercq n'a
// AUCUNE liaison en ferry pour véhicules, pour personne : l'île est un site classé sans voiture
// (Dark Sky Island, seuls tracteurs/chevaux y circulent), desservie uniquement par vedettes à
// passagers depuis Guernesey/Jersey. Un trajet en voiture/van/moto y menant serait donc non pas une
// approximation généreuse mais un trajet réellement IMPOSSIBLE, quel que soit le mode couvert par
// cette app — écartée à la source plutôt que laissée au hasard du tirage. Repérée par nom exact
// (2 lieux : Sercq elle-même et le manoir "La Seigneurie" qui s'y trouve) plutôt que par
// coordonnées : la plus petite île du lot n'a pas de zone dédiée simple à borner sans risquer
// d'exclure par erreur un lieu de Guernesey proprement dit.
const SARK_EXCLUDE_NAMES = new Set(['Sark', 'La Seigneurie']);
// "Yomala" (geonameid 13527044, AX) est un doublon manifeste de la commune "Jomala" (geonameid
// 3041760, même admin2 212/170, coordonnées à ~2 km, code de lieu PPLA2 identique) — une confusion
// Y/J probable côté GeoNames plutôt qu'un vrai lieu distinct, ajoutée très récemment (2025-10-02).
// Exclue par nom exact plutôt que corrigée via NAME_OVERRIDES : un simple renommage n'aurait pas
// suffi à la fusionner avec la vraie "Jomala" au dédoublonnage (coordonnées trop éloignées pour la
// grille ~1 km utilisée), laissant deux communes "Jomala" fantômes à la place d'une.
const AX_EXCLUDE_NAMES = new Set(['Yomala']);
// Macédoine du Nord : le champ "name" du dump GeoNames est en LATIN pour l'immense majorité des
// lieux (2 454 sur 2 529, y compris tous les grands centres — Skopje, Bitola, Ohrid...), mais 75
// communes plus petites (Арачиново/Arachinovo, Петровец/Petrovec, Стајковци/Stajkovci...) restent
// en cyrillique brut dans ce même champ — une incohérence de saisie côté GeoNames, pas un choix
// éditorial : rien ne distingue ces 75 communes des autres pour justifier un script différent, et
// le reste de l'app (recherche de ville, tri alphabétique) suppose un script unique par pays. Le
// champ "asciiname" (calculé par GeoNames pour CHAQUE entrée, jamais vide ni lui-même cyrillique
// ici — vérifié) fournit déjà la translittération latine cohérente avec le reste du jeu de données
// (mêmes digrammes sh/ch/zh que "Shtip"/"Kochani"/"Delcevo" ailleurs) : utilisé comme source du nom
// à la place du champ "name" pour ces seules 75 entrées, plutôt que 75 entrées NAME_OVERRIDES.
const MK_CYRILLIC_RE = /[Ѐ-ӿ]/;

for(const country of COUNTRIES){
  const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8');
  const postalRaw = fs.readFileSync(path.join(__dirname, 'postal', country + '_postal.txt'), 'utf8');

  // Fichier codes postaux : country, postcode, place, admin_name1, admin_code1, admin_name2,
  // admin_code2, admin_name3, admin_code3, lat, lon, accuracy
  const postalPoints = postalRaw.split('\n').filter(Boolean).map(line => {
    const c = line.split('\t');
    return {
      postcode: c[1],
      admin1: c[3] || '',
      code1: c[4] || '',
      admin2: c[5] || '',
      lat: parseFloat(c[9]),
      lon: parseFloat(c[10])
    };
  }).filter(p => !isNaN(p.lat) && !isNaN(p.lon));
  const postalGrid = buildGrid(postalPoints);
  // L'Andorre n'a que 7 codes postaux (un par paroisse) : les centroïdes des paroisses sont trop
  // proches les uns des autres pour qu'un rapprochement par COORDONNÉES les distingue de façon
  // fiable (testé : Sispony, réellement en paroisse de La Massana, se voyait rattaché à Andorra-
  // la-Vella par pure proximité géographique). Le code de paroisse (admin1) du fichier dump et
  // celui du fichier codes postaux utilisent exactement le même référentiel — un rapprochement
  // PAR CODE est donc à la fois plus simple et strictement exact pour ce pays précis.
  const postalByAdmin1Code = new Map();
  if(country === 'AD'){
    postalPoints.forEach(p => { if(p.code1) postalByAdmin1Code.set(p.code1, p); });
  }

  // Fichier dump : geonameid, name, asciiname, alternatenames, lat, lon, feature class, feature
  // code, country, cc2, admin1, admin2, admin3, admin4, population, elevation, dem, timezone, mod
  const rows = dumpRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
  const places = rows
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]))
    .map(c => ({
      name: cleanName((country === 'MK' && MK_CYRILLIC_RE.test(c[1])) ? c[2] : c[1]),
      lat: parseFloat(c[4]),
      lon: parseFloat(c[5]),
      admin1Code: c[10] || '',
      pop: parseInt(c[14], 10) || 0
    }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name)
    .filter(p => !(country === 'GG' && SARK_EXCLUDE_NAMES.has(p.name)))
    .filter(p => !(country === 'AX' && AX_EXCLUDE_NAMES.has(p.name)));

  // Dédoublonnage : même nom normalisé + coordonnées quasi identiques (arrondi ~1km) -> un seul
  // gardé (le plus peuplé). Certaines localités apparaissent en double dans le dump GeoNames.
  const seen = new Map();
  for(const p of places){
    const key = p.name.toLowerCase() + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
    const existing = seen.get(key);
    if(!existing || p.pop > existing.pop) seen.set(key, p);
  }
  const deduped = Array.from(seen.values());

  const lines = deduped.map(p => {
    const near = (country === 'AD')
      ? (postalByAdmin1Code.get(p.admin1Code) || null)
      : nearest(postalGrid, p.lat, p.lon, 15);
    const cp = near ? near.postcode : '';
    const region = near ? (near.admin2 || near.admin1 || '') : '';
    if(!cp) return null; // sans code postal on ne peut pas désambiguïser à l'affichage -> écarté
    return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${cp};${region};${p.name}`;
  }).filter(Boolean);

  const outPath = path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(country, ': ', places.length, 'lieux bruts ->', deduped.length, 'dédoublonnés ->', lines.length, 'avec code postal ->', outPath);
}
