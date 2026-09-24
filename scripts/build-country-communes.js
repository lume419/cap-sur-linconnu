// Convertit les données GeoNames (dump géographique + codes postaux) en fichiers communes-XX.txt
// au même format que communes.txt (France) : population;lon,lat;cp1,cp2,...;region;nom
// Une ligne de plus par rapport au format France : le code pays est dans le nom de fichier
// (communes-es.txt), pas dans chaque ligne — cohérent avec le choix "un fichier par pays".
const fs = require('fs');
const path = require('path');
// lieux mal rangés, disparus, Sercq, Antarctique ; noms nettoyés et quasi-doublons (audit n° 11) — voir ce fichier
const { excludePlace, preparePlaceName, dropNearDuplicates, fixDivision, cpContredit, REGION_DU_DUMP, uniformiseEtiquette } = require('./communes-corrections.js');

// 13e audit du 19/09/2026 : ONLY_COUNTRY=AL (ou AL,TR…) régénère ces seuls pays, à condition que scripts/dump/XX_dump.txt
// ET scripts/postal/XX_postal.txt soient sur le disque (liste vide par défaut, comme avant).
const COUNTRIES = (process.env.ONLY_COUNTRY || '').split(',').filter(Boolean); // dump/ et postal/ ne contiennent que les fichiers des pays en cours
// d'ajout — AD/ES/PT/BE/NL/LU/CH/DE/IT/AT/SM/LI/MC/MT/GG/JE/CZ/PL/SK/HU/SI/HR/BA/GB/IE/IM/DK/NO/SE/
// FI/AX/AL/RS/MK/RO/BG/LV/LT/EE/VA/IS/FO/GI/MD/BY/UA/TR/GE/AZ/CY sont déjà générés et commités
// (public/data/communes-ad|es|pt|be|nl|lu|ch|de|it|at|sm|li|mc|mt|gg|je|cz|pl|sk|hu|si|hr|ba|gb|ie|
// im|dk|no|se|fi|ax|al|rs|mk|ro|bg|lv|lt|ee|va|is|fo|gi|md|by|ua|tr|ge|az|cy.txt), pas la peine de
// retélécharger leurs sources pour les régénérer à l'identique à chaque nouvel ajout. L'Arménie (AM)
// et la Syrie (SY), ajoutées dans le même passage qu'AZ/CY, N'UTILISENT PAS ce script standard :
// aucun fichier de codes postaux GeoNames pour ces deux pays non plus, voir build-am-communes.js
// (reconstruction par nom depuis la poste arménienne, Haypost) et build-sy-communes.js (aucun
// système de codes postaux réel en Syrie — code de gouvernorat ISO 3166-2:SY utilisé à la place).
// La Grèce (GR)
// n'utilise PAS ce script standard : aucun fichier de codes postaux GeoNames pour ce pays, voir
// build-gr-communes.js (reconstruction depuis une source tierce). Monténégro (ME) et Kosovo (XK)
// n'utilisent PAS ce script standard : aucun fichier de codes postaux GeoNames pour ces deux pays,
// voir build-me-communes.js/build-xk-communes.js (reconstruction depuis une source tierce).
// La Turquie (TR) revient au pipeline STANDARD : GeoNames publie un vrai fichier de codes postaux
// pour ce pays (vérifié avant de commencer) — le plus gros pays traité par ce script à ce jour
// (~52 800 lieux bruts avant jointure/dédoublonnage, contre ~45 400 pour l'Ukraine, le précédent
// record). La Géorgie (GE), dernier ajout en date, n'utilise PAS ce script standard : aucun fichier
// de codes postaux GeoNames pour ce pays non plus (même vérification, export/zip/GE.zip -> 404),
// voir build-ge-communes.js (reconstruction par rapprochement de nom depuis un annuaire tiers,
// yell.ge — aucune source déjà géolocalisée trouvée pour ce pays, contrairement à la Grèce).
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
  'Vilkaviskis': 'Vilkaviškis',
  // L'Estonie, elle, n'a demandé AUCUNE correction : échantillon des 100 plus grandes communes du
  // pays déjà bon, diacritiques compris (Tallinn, Tartu, Pärnu, Kohtla-Järve, Rakvere, Kuressaare,
  // Sillamäe, Võru, Jõhvi...).
  // Le Vatican, cas unique de toute cette série : UNE SEULE commune au monde (le pays tient
  // entièrement dans son unique code postal, 00120), et cette commune-là porte l'exonyme anglais
  // "Vatican City" dans le champ "name" GeoNames — alors même que son propre fichier de codes
  // postaux, source distincte, utilise déjà la forme italienne "Citta' Del Vaticano" (apostrophe
  // simple à la place de l'accent grave manquant). Corrigé en "Città del Vaticano", la forme
  // italienne correcte — l'italien étant la langue de travail quotidienne du Vatican (le latin,
  // langue officielle pour les actes juridiques/religieux, n'étant d'usage courant nulle part au
  // sens où ce projet nomme ses communes).
  'Vatican City': 'Città del Vaticano',
  // L'Islande et les îles Féroé, elles, n'ont demandé AUCUNE correction : échantillon exhaustif des
  // deux pays (96 communes islandaises, 180 féroïennes) déjà bon, diacritiques islandais/féroïens
  // compris (þ/ð/ö islandais — Reykjavík, Hafnarfjörður, Þorlákshöfn... ; ø/á/í/ú féroïens —
  // Tórshavn, Klaksvík, Fuglafjørður, Norðragøta...).
  // Gibraltar : AUCUNE correction nécessaire (2 communes seulement, Gibraltar et Catalan Bay, déjà
  // bonnes telles quelles).
  // Moldavie : 1 797 communes retenues, une seule correction — mais la capitale elle-même :
  // "Chisinau", champ "name" GeoNames sans diacritique (échantillon des 100 plus grandes communes
  // du pays par ailleurs déjà bon, diacritiques compris — Bălţi, Durleşti, Dubăsari, Căuşeni,
  // Hînceşti, Floreşti... — y compris de nombreuses localités transnistriennes conservées telles
  // quelles, GeoNames rattachant tout le territoire à la Moldavie internationalement reconnue,
  // aucune exclusion ni renommage éditorial ici). Corrigée en "Chişinău", forme présente dans la
  // propre liste de noms alternatifs de cette même entrée — cédille ş/ţ plutôt que la variante à
  // virgule souscrite ş/ţ, pour la même raison que "Bucureşti" plus haut : cohérence avec l'écrasante
  // majorité du reste du dump moldave lui-même (1 959 caractères ş/ţ contre seulement 237 ș/ț
  // dénombrés dans le fichier brut).
  'Chisinau': 'Chişinău',
  // Biélorussie : 25 147 communes retenues. AUCUNE correction NAME_OVERRIDES classique (aucun
  // exonyme anglais identifié parmi les plus grandes villes — Minsk, Homyel', Hrodna, Vitebsk,
  // Mahilyow, Brest, Bobruysk... déjà telles quelles dans le dump) — seulement un cas de nom
  // MALFORMÉ : l'entrée 814990 porte "Ryasno, Рясно, Расна" comme champ "name" (trois
  // translittérations différentes du même nom concaténées par des virgules à l'intérieur du champ
  // lui-même, plutôt que dans la liste de noms alternatifs prévue à cet effet — un bug de saisie
  // inédit parmi tous les pays couverts jusqu'ici) ; cette commune est aussi l'une des 14 détectées
  // "cyrillique" (voir ASCIINAME_FALLBACK_COUNTRIES plus haut), le nom réellement utilisé après repli
  // sur asciiname est donc "Ryasno, Rjasno, Rasna" — corrigé ici en "Ryasno" (le premier segment,
  // seule vraie forme latine usuelle). Note transparente sur le reste du dump biélorusse : contrairement
  // au Kosovo (formes serbes corrigées en formes albanaises, la langue très majoritaire du pays), le
  // dump biélorusse mélange sans cohérence apparente des translittérations à base RUSSE (ex.
  // "Vitebsk", "Mogilev" jamais rencontré ici car déjà "Mahilyow" — translittération biélorusse) et à
  // base BIÉLORUSSE ("Homyel'", "Hrodna", "Barysaw", "Zhodzina") pour différentes villes du même
  // pays — mais AUCUNE de ces formes n'est un exonyme étranger comparable à "Vienna"/"Prague" (les
  // deux translittérations restent des lectures phonétiques directes du nom local, russe ou
  // biélorusse, jamais un nom complètement différent importé d'une tierce langue) : contrairement au
  // Kosovo, où une source faisant autorité (la Poste du Kosovo elle-même) permettait de trancher
  // clairement en faveur de l'albanais, aucune source équivalente ni aucune campagne de
  // translittération officielle systématique n'a été identifiée pour la Biélorussie qui permettrait
  // de corriger cette incohérence ville par ville sans se livrer à des suppositions non vérifiées —
  // laissé tel quel, comme le reste du dump GeoNames utilisé sans retouche ailleurs dans ce projet.
  'Ryasno, Rjasno, Rasna': 'Ryasno',
  // Ukraine : 30 044 communes retenues. AUCUNE correction NAME_OVERRIDES nécessaire (échantillon des
  // 150 plus grandes villes du pays déjà bon — Kyiv, Kharkiv, Odesa, Dnipro, Zaporizhzhya, Lviv...,
  // déjà la translittération ukrainienne moderne post-2018/BGN-PCGN, PAS les anciens exonymes issus
  // du russe "Kiev"/"Kharkov"/"Odessa"/"Dnepr" — la réforme officielle de romanisation ukrainienne de
  // 2010, largement adoptée à l'international depuis l'initiative #KyivNotKiev de 2018, est déjà
  // celle utilisée par ce dump GeoNames). Kherson, Saky, Alushta (villes de Crimée) restent
  // rattachées au code pays "UA" par GeoNames, comme la quasi-totalité des bases de données et
  // organisations internationales qui ne reconnaissent pas l'annexion russe de 2014 — utilisées
  // telles quelles, sans exclusion ni retouche éditoriale, même logique que les localités
  // transnistriennes conservées sous "MD" plus haut.
  // Turquie, dernier ajout en date, le plus gros pays traité par ce script à ce jour (~52 800 lieux
  // bruts) : contrairement à la Macédoine du Nord/la Biélorussie/l'Ukraine plus haut, aucun problème
  // de script à gérer (le turc s'écrit nativement en alphabet latin depuis la réforme de 1928) —
  // seulement des diacritiques turcs (ç/ğ/ı/İ/ö/ş/ü) manquants sur cinq entrées précises, détectées
  // systématiquement plutôt qu'à l'oeil (vérification manuelle irréaliste sur un pays de cette
  // taille) : un script dédié compare, pour chaque commune retenue avec au moins 1 000 habitants, le
  // nom SANS diacritique à celui de toute autre entrée du même département administratif (même code
  // "admin1" GeoNames) partageant le même nom une fois les diacritiques turcs neutralisés — ne
  // retient que les cas où une autre entrée existe avec STRICTEMENT PLUS de diacritiques turcs,
  // écartant ainsi les doublons dans l'autre sens (une grande ville déjà correcte, comme İzmir,
  // n'est jamais signalée simplement parce qu'un doublon mineur existe quelque part sous une forme
  // sans diacritique). "Istanbul" (la plus grande ville du pays, 15,7 millions d'habitants) manque
  // le İ majuscule pointé initial — présent dans sa propre liste de noms alternatifs GeoNames (qui
  // liste aussi bien "Istanbul" qu'"İstanbul" pour cette même entrée, incohérence interne au dump).
  // "Umraniye" (district d'Istanbul, 573 265 habitants) manque le Ü — confirmé par DEUX autres
  // entrées GeoNames du même lieu exact (l'entité administrative ADM2 7732588 et son doublon PPLA2
  // 10400338), toutes deux correctement "Ümraniye". "İnegol" (district de Bursa, 133 959 habitants)
  // manque le ö final — confirmé par sa propre liste de noms alternatifs ("İnegöl") ET par l'entité
  // administrative correspondante (ADM2 7732332, déjà "İnegöl"). "Sarigerme" (station balnéaire de
  // Muğla, 16 000 habitants) manque le ı — une entrée jumelle à coordonnées quasi identiques (313258)
  // porte déjà "Sarıgerme" ; cette correction unifie aussi les deux entrées au dédoublonnage (sans
  // elle, "Sarigerme" et "Sarıgerme" survivraient comme deux communes distinctes au même endroit,
  // la casse dépareillée empêchant la clé de dédoublonnage habituelle de les fusionner). "Incekum"
  // (lieu-dit côtier d'Antalya, 3 345 habitants — sous le seuil des 1 000 habitants utilisé pour le
  // dépistage automatique ci-dessus, ajouté après une vérification manuelle du même genre) manque le
  // İ initial — confirmé par sa propre liste de noms alternatifs ET par une plage (BCH) exactement
  // aux mêmes coordonnées, déjà "İncekum". Trois derniers cas sous le seuil des 1 000 habitants,
  // trouvés par le même script abaissé à 200 habitants puis vérifiés un par un (au lieu d'être
  // ajoutés automatiquement, un seuil plus bas rendant plus probable une coïncidence entre deux
  // villages homonymes SANS RAPPORT plutôt qu'un vrai diacritique manquant) : "Kütüklü" (nom de
  // village très courant en Turquie, au moins huit entrées GeoNames distinctes) — l'entrée retenue
  // ici (Düzce, 324 habitants) partage exactement le même code de province qu'une autre entrée
  // "Kütüklü" déjà correcte, cohérent avec une simple incohérence de saisie plutôt qu'un homonyme
  // fortuit. "Karaburcak"/"Alacami" : chacun désigne deux villages RÉELLEMENT distincts (coordonnées
  // à plus de 100 km d'écart) dans la même province partageant le même nom — hypothèse retenue
  // malgré tout : les deux villages portent la MÊME orthographe correcte en turc réel ("Karaburçak",
  // "buisson noir épineux" ; "Alaçami", "mosquée bigarrée"), une coïncidence entre deux noms
  // RÉELLEMENT différents étant nettement moins probable qu'une simple omission de diacritique
  // répétée sur un nom composé courant.
  'Istanbul': 'İstanbul',
  'Umraniye': 'Ümraniye',
  'İnegol': 'İnegöl',
  'Sarigerme': 'Sarıgerme',
  'Incekum': 'İncekum',
  'Kutuklu': 'Kütüklü',
  'Karaburcak': 'Karaburçak',
  'Alacami': 'Alaçami',
  // Azerbaïdjan : treize corrections parmi les plus grandes communes du pays (échantillon des ~30
  // plus grandes, reste déjà bon), toutes confirmées par la liste de noms alternatifs GeoNames de
  // la même entrée (alphabet latin azerbaïdjanais officiel depuis 1991, ə/ç/ğ/ı/ö/ş/ü/İ) — même
  // méthode que pour la Turquie voisine (diacritiques manquants dans le champ "name", présents dans
  // "alternatenames"). "Baku" (exonyme international très répandu) -> "Bakı" ; "Ganja" -> "Gəncə" ;
  // "Sumgayit" -> "Sumqayıt" ; "Khirdalan" -> "Xırdalan" ; "Sheki" -> "Şəki" ; "Bilajari" ->
  // "Biləcəri" ; "Barda" -> "Bərdə" ; "Shamkhir" -> "Şəmkir" ; "Aghjabadi" -> "Ağcabədi" ;
  // "Shamakhi" -> "Şamaxı" ; "Aghdam" -> "Ağdam" ; "Jalilabad" -> "Cəlilabad" ; "Imishli" ->
  // "İmişli". "Yevlakh"/"Yevlax", elle, n'est PAS corrigée : aucune forme à diacritiques dans sa
  // propre liste de noms alternatifs (contrairement aux treize cas ci-dessus), la variante kh/x
  // n'étant qu'une question de translittération plutôt qu'un vrai diacritique manquant.
  'Baku': 'Bakı',
  'Ganja': 'Gəncə',
  'Sumgayit': 'Sumqayıt',
  'Khirdalan': 'Xırdalan',
  'Sheki': 'Şəki',
  'Bilajari': 'Biləcəri',
  'Barda': 'Bərdə',
  'Shamkhir': 'Şəmkir',
  'Aghjabadi': 'Ağcabədi',
  'Shamakhi': 'Şamaxı',
  'Aghdam': 'Ağdam',
  'Jalilabad': 'Cəlilabad',
  'Imishli': 'İmişli',
  // Chypre : trois corrections, seulement dans les villes SANS ambiguïté de contrôle territorial
  // (zone sous contrôle de la République de Chypre, à majorité grecque incontestée) — "Limassol"
  // (exonyme anglais) -> "Lemesos", "Larnaca" -> "Larnaka", "Paphos" -> "Pafos" (chacune déjà la
  // forme utilisée par le champ région GeoNames de la même ligne). Nicosia/Kyrenia/Famagusta ne
  // sont PAS corrigées ici : Nicosie est une capitale divisée (zone tampon ONU) où "Nicosia" reste
  // le nom utilisé jusque dans les communications officielles anglophones de la République de
  // Chypre elle-même, et Kyrenia/Famagusta se trouvent dans la partie nord sous administration
  // chypriote-turque de facto (non reconnue internationalement) — y substituer la forme grecque
  // "Keryneia"/"Ammochostos" reviendrait à trancher éditorialement une question politique disputée,
  // à l'inverse de la règle "GeoNames tel quel, sans retouche éditoriale" déjà suivie pour le
  // Kosovo/la Crimée/la Transnistrie/l'Abkhazie ailleurs dans ce projet.
  'Limassol': 'Lemesos',
  'Larnaca': 'Larnaka',
  'Paphos': 'Pafos'
};
// PAYS VISÉ PAR CHAQUE ENTRÉE (audit n° 11) — la table ci-dessus était appliquée à TOUS les pays générés par ce script,
// alors que chaque entrée ne vise qu'un pays (celui du commentaire qui la justifie) : « Turin », hameau écossais (GB) ou
// irlandais (IE), devenait « Torino » ; « Sitten » (village de Saxe, DE) devenait « Sion » ; « Milan » (HR, AL) devenait
// « Milano » ; « The Hague » (Grand Manchester, GB) « Den Haag » ; « Ostend » (Essex, GB) « Oostende » ; deux fermes
// norvégiennes « Århus » (NO) « Aarhus ». Chaque renommage ne s'applique plus qu'au pays visé ; une entrée sans pays fait
// échouer le script (garde-fou pour les ajouts futurs). Table IDENTIQUE dans build-country-communes.js et build-aliases.js.
const NAME_OVERRIDES_COUNTRY = {
  PT: ['Lisbon'], BE: ['Brussels', 'Antwerp', 'Ostend', 'Saint-Vith'], NL: ['The Hague'], CH: ['Geneva', 'Sitten'],
  DE: ['Munich', 'Nuremberg'], IT: ['Rome', 'Milan', 'Naples', 'Turin', 'Genoa', 'Florence', 'Padua', 'Venice'], AT: ['Vienna'],
  CZ: ['Prague', 'Pilsen'], PL: ['Warsaw', 'Lodz', 'Bielsko-Biala'],
  IE: ['An Ros', 'Droichead Nua', 'An Muileann gCearr', 'Baile an Mhuilinn', 'Cill Fhíonáin', 'Cluain Meala', 'Trá Mhór', 'Leifear'],
  DK: ['Copenhagen', 'Århus'], SE: ['Gothenburg'], FI: ['Hyvinge', 'Sibbo'], AL: ['Tirana'], RS: ['Belgrade', 'Knjazevac'],
  RO: ['Bucharest'], LV: ['Riga'],
  LT: ['Ukmerge', 'Telsiai', 'Taurage', 'Silute', 'Radviliskis', 'Plunge', 'Naujoji Akmene', 'Mazeikiai', 'Kupiskis', 'Birzai', 'Vilkaviskis'],
  VA: ['Vatican City'], MD: ['Chisinau'], BY: ['Ryasno, Rjasno, Rasna'],
  TR: ['Istanbul', 'Umraniye', 'İnegol', 'Sarigerme', 'Incekum', 'Kutuklu', 'Karaburcak', 'Alacami'],
  AZ: ['Baku', 'Ganja', 'Sumgayit', 'Khirdalan', 'Sheki', 'Bilajari', 'Barda', 'Shamkhir', 'Aghjabadi', 'Shamakhi', 'Aghdam', 'Jalilabad', 'Imishli'],
  CY: ['Limassol', 'Larnaca', 'Paphos']
};
const NAME_OVERRIDE_TARGET_COUNTRY = new Map();
Object.keys(NAME_OVERRIDES_COUNTRY).forEach(cc => NAME_OVERRIDES_COUNTRY[cc].forEach(n => NAME_OVERRIDE_TARGET_COUNTRY.set(n, cc)));
Object.keys(NAME_OVERRIDES).forEach(n => { if(!NAME_OVERRIDE_TARGET_COUNTRY.has(n)) throw new Error('NAME_OVERRIDES sans pays visé : ' + n); });
NAME_OVERRIDE_TARGET_COUNTRY.forEach((cc, n) => { if(!NAME_OVERRIDES[n]) throw new Error('NAME_OVERRIDES_COUNTRY sans renommage : ' + n); });
// Pas un exonyme mais une confusion de caractère systématique dans le dump GeoNames croate : 48
// noms de communes (ex. "Sveti Ðurđ", "Ðurđenovac", "Ðeletovci") utilisent le Ð latin (Eth
// islandais/féroïen, U+00D0) au lieu du VRAI Đ croate (D barré, U+0110) — les deux se ressemblent
// à l'écran mais sont deux caractères Unicode distincts, et aucun pays déjà couvert par cette app
// n'utilise légitimement le premier (l'islandais/féroïen ne sont pas des langues gérées ici).
// Remplacement global plutôt que 48 entrées NAME_OVERRIDES : appliqué à chaque nom lu du dump,
// avant même NAME_OVERRIDES (voir cleanName plus bas), aucun risque de faux positif pour les
// autres pays déjà générés (jamais régénérés à l'identique, voir COUNTRIES en haut de ce fichier).
function cleanName(raw, country){
  const o = NAME_OVERRIDE_TARGET_COUNTRY.get(raw) === country ? NAME_OVERRIDES[raw] : null;
  return (o || raw).replace(/Ð/g, 'Đ');
}
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
// CORRECTION (septembre 2026, audit n° 10) : l'exclusion par nom laissait passer les 14 autres hameaux de l'île (La
// Collinette, Le Grand Fort, La Vaurocque…), publiés dans communes-gg.txt malgré « Sercq exclue » (README). Elle est
// complétée par une ZONE (isSark dans communes-corrections.js, appliquée par excludePlace ci-dessous) : la même boîte
// que la règle d'île « sark » de scripts/iles/iles-atlantique-nord.js, vérifiée sans risque pour Guernesey (côte est
// à 2,52° O) et Herm (2,45° O). La liste de noms reste en place, inoffensive. Ce script ne peut plus être relancé
// pour GG (aucun fichier postal GG dans scripts/postal) : le même filtre a été appliqué au fichier publié par le
// script de l'audit, ligne pour ligne (14 lignes retirées, rien d'autre).
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
// Même mécanisme réutilisé, bien plus modestement, pour la Biélorussie (14 communes sur 25 226,
// ex. Тельмы Вторые/Радость/Франополь — asciiname "Tel'my Vtorye"/"Radost'"/"Franopol'", cohérent
// avec la translittération du reste du dump biélorusse) et l'Ukraine (3 communes sur 32 484) — mais
// pour l'Ukraine, PAS le même genre d'erreur que Macédoine du Nord/Biélorussie (un nom ENTIÈREMENT
// cyrillique resté tel quel) : deux des trois sont un caractère cyrillique confusable ISOLÉ, à
// l'apparence quasi identique à son équivalent latin, glissé au milieu d'un nom sinon déjà latin —
// "Antonіvka" (le troisième caractère est le caractère cyrillique ukrainien "і", U+0456, visuellement
// indiscernable du "i" latin U+0069) et "Storozhevoнe" (l'avant-dernier caractère est le cyrillique
// "н" au lieu du latin "n") — même famille de bug que la confusion Ð/Đ déjà rencontrée pour la
// Croatie, mais lettre par lettre plutôt que systématique ; asciiname règle les trois d'un coup
// ("Antonivka", "Demechi", "Storozhevone") sans qu'il soit utile de les distinguer du cas macédonien/
// biélorusse dans le code, la même détection (présence d'au moins un caractère cyrillique dans
// "name") suffit à capter les deux familles de bug.
const MK_CYRILLIC_RE = /[Ѐ-ӿ]/;
const ASCIINAME_FALLBACK_COUNTRIES = new Set(['MK', 'BY', 'UA']);

// Noms des divisions administratives (GeoNames admin1CodesASCII.txt), repris tels quels : ils servent de REGION aux
// lieux qui n'ont pas de point postal à moins de 15 km, désormais publiés au lieu d'être écartés (21/09/2026).
const admin1Names = new Map();
fs.readFileSync(path.join(__dirname, 'admin1CodesASCII.txt'), 'utf8').split('\n').forEach(l => {
  const f = l.split('\t');
  if(f[0] && f[1]) admin1Names.set(f[0], f[1]);
});

// Générateur MUET SI ON NE LUI DIT RIEN (19e audit du 21/09/2026) : sans ONLY_COUNTRY, la liste est vide, la
// boucle ne tourne pas, rien n'est écrit et le script sortait en code 0 sans un mot. Un générateur silencieux qui
// « réussit » est indiscernable d'un générateur qui a travaillé — c'est ce qui a laissé « Test » et « XXX » publiés
// pendant sept passes d'audit sans que personne ne s'en plaigne. Il dit maintenant ce qu'il fait, et sort en erreur.
if(!COUNTRIES.length){
  console.error('build-country-communes.js : aucun pays demandé. Ce script ne régénère QUE les pays listés dans');
  console.error('  ONLY_COUNTRY (ex. ONLY_COUNTRY=RO,BG node scripts/build-country-communes.js), et seulement si');
  console.error('  scripts/dump/XX_dump.txt est présent sur le disque (le fichier postal, s\'il manque, est remplacé');
  console.error('  par les codes déjà publiés — voir le commentaire dans la boucle).');
  process.exit(1);
}
console.log('build-country-communes.js : ' + COUNTRIES.length + ' pays demandé(s) — ' + COUNTRIES.join(', '));
for(const country of COUNTRIES){
  const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8');
  // FICHIER POSTAL ABSENT DU DÉPÔT (21/09/2026). Les fichiers de codes postaux GeoNames ne sont pas commités (trop
  // volumineux, et ils ne sont retéléchargés que pour les pays en cours d'ajout) : une trentaine de pays déjà
  // publiés n'ont donc plus leur source postale ici. Jusqu'à présent ils étaient simplement non régénérables, et la
  // correction du jour — ne plus écarter un lieu faute de code postal — leur serait restée inaccessible.
  // Repli : les codes DÉJÀ PUBLIÉS sont relus depuis public/data/communes-XX.txt et rattachés par coordonnée exacte
  // (4 décimales, la précision du fichier publié). Les lieux qui n'y figurent pas sortent avec un code vide, ce qui
  // est exactement ce que produirait le fichier postal pour eux. Le résultat est donc identique à une vraie
  // régénération pour la colonne « code », et reproductible : relancer le script ne change plus rien.
  const postalPath = path.join(__dirname, 'postal', country + '_postal.txt');
  const publiéPath = path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt');
  const postalAbsent = !fs.existsSync(postalPath);
  if(postalAbsent && !fs.existsSync(publiéPath)){
    console.error(country + ' : ni scripts/postal/' + country + '_postal.txt ni le fichier publié — impossible de régénérer.');
    process.exit(1);
  }
  // Rattachement au fichier déjà publié : d'abord la coordonnée exacte, puis — le dump GeoNames bouge d'une version
  // à l'autre — le même nom à moins de 5 km. Sans ce second essai, une localité dont la coordonnée a été affinée
  // depuis la dernière génération perdrait son code postal et son district, ce qui serait une régression.
  const déjàPubliés = new Map();
  const déjàParNom = new Map();
  // REPLI SUR LE CODE DÉJÀ PUBLIÉ (24/09/2026) : cette table était bâtie seulement quand le fichier postal
  // manquait. Elle l est désormais TOUJOURS, car elle sert aussi de dernier recours quand la recherche postale ne
  // trouve AUCUN point à moins de 15 km. Mesuré sur la Russie : quatre codes RÉELS étaient perdus à chaque
  // régénération — Pangody 629757, Noïabrsk 629800, Lyantor 628449, Mejgorié 453570, quatre villes du Grand Nord
  // et une ville fermée, qu aucun point du fichier postal actuel n approche. Reprendre un code déjà publié
  // n invente rien : il vient d une génération antérieure, sourcée de la même façon.
  if(fs.existsSync(publiéPath)){
    fs.readFileSync(publiéPath, 'utf8').split('\n').filter(Boolean).forEach(l => {
      const ch = l.split(';'), ll = ch[1].split(',');
      const e = { postcode: ch[2], admin2: ch[3], admin1: ch[3], lat: +ll[1], lon: +ll[0] };
      // Clé = COORDONNÉES **ET NOM** (24/09/2026). Indexée par les seules coordonnées, cette table perdait une
      // ligne sur douze : 2 280 lignes suédoises partagent leur position arrondie au dix-millième avec une
      // autre, et la dernière écrasait la précédente. Un lieu recevait alors le code postal ET LA RÉGION de son
      // homonyme de position — mesuré : une régénération de la Suède sans fichier postal changeait cinq lignes,
      // dont trois RÉGRESSIONS (Västanå prenait la région de Gulsele, Ramsvik celle de Liden, Östanbro celle
      // d'Ekensberg), toutes trois démenties par la carte. COLLISION de coordonnées levée par le nom.
      déjàPubliés.set(ll[1] + ',' + ll[0] + '|' + ch[4], e);
      const k = ch[4].toLowerCase();
      let g = déjàParNom.get(k); if(!g) déjàParNom.set(k, g = []);
      g.push(e);
    });
    console.log(country + ' : fichier postal absent — ' + déjàPubliés.size + ' codes repris du fichier déjà publié');
  }
  const codePublié = p => {
    const exact = déjàPubliés.get(p.lat.toFixed(4) + ',' + p.lon.toFixed(4) + '|' + p.name);
    if(exact) return exact;
    let best = null, bestKm = 5; // 5 km : le rapprochement postal lui-même en autorise 15, et il s'agit ici du MÊME nom
    for(const e of (déjàParNom.get(p.name.toLowerCase()) || [])){
      const d = haversineKm(p.lat, p.lon, e.lat, e.lon);
      if(d < bestKm){ bestKm = d; best = e; }
    }
    return best;
  };
  const postalRaw = postalAbsent ? '' : fs.readFileSync(postalPath, 'utf8');

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
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]) && !excludePlace(country, c[0], preparePlaceName(country, c[0], cleanName((ASCIINAME_FALLBACK_COUNTRIES.has(country) && MK_CYRILLIC_RE.test(c[1])) ? c[2] : c[1], country)), parseFloat(c[4]), parseFloat(c[5]))) // 13e audit du 19/09/2026 : filtre sur le nom publié (renommages compris), voir communes-corrections.js
    .map(c => ({
      name: preparePlaceName(country, c[0], cleanName((ASCIINAME_FALLBACK_COUNTRIES.has(country) && MK_CYRILLIC_RE.test(c[1])) ? c[2] : c[1], country)),
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

  // CODE POSTAL FACULTATIF (21/09/2026, demande de l'utilisateur). Jusqu'ici, un lieu sans point postal à moins de
  // 15 km était ÉCARTÉ — « sans code postal on ne peut pas désambiguïser à l'affichage ». C'était mettre une aide à
  // la saisie au-dessus de l'existence du lieu : le code postal sert à retrouver sa ville quand on la cherche, il ne
  // décide pas si elle existe. Le lieu est donc publié avec un code VIDE, et sa région prise du dump GeoNames
  // (admin1CodesASCII.txt) au lieu du point postal, pour qu'il reste distinguable à l'affichage.
  let sansCode = 0;
  const lines = deduped.map(p => {
    const near = postalAbsent ? codePublié(p)
      : (country === 'AD')
      ? (postalByAdmin1Code.get(p.admin1Code) || null)
      : nearest(postalGrid, p.lat, p.lon, 15);
    // Code postal DÉMENTI par les coordonnées (voir CP_CONTREDIT dans communes-corrections.js) : il est
    // EFFACÉ, pas remplacé — le code rendu par la carte est celui du bourg voisin, l'écrire ici serait inventer.
    // Ne touche que les fiches nommément vérifiées sur la carte ; la région, elle, est conservée.
    // Dernier recours : aucun point postal à moins de 15 km, mais un code DÉJÀ PUBLIÉ pour cette fiche.
    const replí = near ? null : codePublié(p);
    const cp = cpContredit(country, p.name, p.lat, p.lon) ? '' : (near ? near.postcode : (replí ? replí.postcode : ''));
    // Pays dont la région se prend au DUMP même quand un fichier postal existe (voir REGION_DU_DUMP dans
    // communes-corrections.js) : le point postal le plus proche peut être de l'autre côté d'une limite de
    // district, et la carte a mesuré la perte — canton faux 4 fois sur 12 au Costa Rica. Le CODE postal, lui,
    // continue de venir du point postal.
    const region = (near && !REGION_DU_DUMP.has(country)) ? (near.admin2 || near.admin1 || '')
      : (admin1Names.get(country + '.' + p.admin1Code) || '');
    if(!cp) sansCode++;
    // Étiquette de région démentie par la carte (voir DIVISION_FIXES dans communes-corrections.js) : on écrit
    // celle du terrain, pas celle du dump. Ne touche que les fiches nommément vérifiées.
    const regionCorrigee = fixDivision(country, p.name, p.lat, p.lon);
    // Graphie minoritaire d'une région (voir ETIQUETTE_UNIFIEE) : une seule graphie par région et par pays.
    const regionUnifiee = uniformiseEtiquette(country, region);
    return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${cp};${regionCorrigee || regionUnifiee || region};${p.name}`;
  });

  const outPath = path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(outPath, dropNearDuplicates(lines).join('\n') + '\n', 'utf8'); // quasi-doublons (voir communes-corrections.js)
  console.log(country, ': ', places.length, 'lieux bruts ->', deduped.length, 'dédoublonnés ->', lines.length,
    'publiés (dont', sansCode, 'sans code postal) ->', outPath);
}
