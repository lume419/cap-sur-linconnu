// Construit public/data/aliases-XX.txt : correspondances "nom dans une autre langue -> nom
// canonique" pour les communes andorranes/espagnoles/portugaises/belges/néerlandaises/
// luxembourgeoises/suisses/allemandes, à partir du fichier
// GeoNames alternateNamesV2 (download.geonames.org/export/dump/alternatenames/XX.zip — mêmes
// données que le dump utilisé par build-country-communes.js, mais avec les noms alternatifs
// étiquetés par langue ISO, justement conçues pour ce genre de besoin). Permet de saisir une ville
// dans la langue choisie pour l'interface (ex. "Anvers" en français pour la commune belge stockée
// sous son nom néerlandais "Antwerpen" — voir js/app.js, searchCommunes) plutôt que seulement son
// nom local.
//
// La France n'est PAS couverte ici : ses communes viennent de geo.api.gouv.fr (IGN/Etalab), pas de
// GeoNames — aucun geonameid n'est disponible pour les y relier. Les grandes villes françaises ont
// de toute façon presque toujours le même nom d'une langue à l'autre (Paris, Lyon, Marseille...),
// contrairement aux villes des quatre autres pays où l'écart est plus fréquent (Bruxelles/Brussels/
// Brussel, Séville/Sevilla/Seville...) : le gain attendu pour la France serait donc marginal, pour
// un effort disproportionné (reconstituer un rapprochement fiable geonameid <-> commune IGN).
//
// Reproduit ICI la même extraction que build-country-communes.js (mêmes filtres, même
// dédoublonnage, même jointure code postal) plutôt que d'appeler ce script : le seul besoin
// supplémentaire est de garder le geonameid sur l'entrée choisie, pour la relier ensuite aux noms
// alternatifs — dupliquer ce petit calcul évite de complexifier l'autre script, déjà stable, pour
// un besoin qui ne concerne que celui-ci.
const fs = require('fs');
const path = require('path');

// Serbie et Macédoine du Nord : dernier ajout en date de la série balkanique (Monténégro/Kosovo
// traités séparément, voir build-me-aliases.js/build-xk-aliases.js — pas de fichier de codes
// postaux GeoNames pour ces deux-là). La Grèce (GR) non plus : voir build-gr-aliases.js.
const COUNTRIES = ['TR']; // AD/ES/PT/BE/NL/LU/CH/DE/IT/AT/SM/LI/MC/MT/GG/JE/CZ/PL/
// SK/HU/SI/HR/BA/GB/IE/IM/DK/NO/SE/FI/AX/AL/RS/MK/RO/BG/LV/LT/EE/VA/IS/FO/GI/MD/BY/UA
// déjà générés et commités (les leurs restent inchangés)
// déjà générés et commités (public/data/aliases-ad|es|pt|be|nl|lu|ch|de|it|at|sm|li|mc|mt|gg|je|cz|pl|sk|hu|si|hr|ba|gb|ie|im|dk|no|se|fi|ax|al|rs|mk|ro|bg|lv|lt|ee|va|is|fo|gi|md|by|ua.txt)
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
// Les langues couvertes par l'interface (voir public/js/i18n.js, SUPPORTED) — un alias dans une
// langue non encore proposée ne servirait à rien pour l'instant. "lb" (luxembourgeois) depuis
// l'ajout du Luxembourg ; "it"/"rm" (italien/romanche) depuis l'ajout de la Suisse — GeoNames
// utilise "rm" pour le romanche (isolanguage ISO 639-1), comme public/js/i18n.js. "nds"/"hsb"/"frr"
// (bas-allemand/sorabe/frison du Nord, ISO 639-2/3 — pas de code 639-1 pour ces trois) depuis
// l'ajout de l'Allemagne. "sc"/"fur"/"lld" (sarde/frioulan/ladin, ISO 639-1 pour le sarde, 639-2/3
// pour les deux autres) depuis l'ajout de l'Italie — "lld" reste dans cet ensemble par cohérence,
// mais ne produira JAMAIS d'alias en pratique : les 91 lignes "lld" du fichier alternateNamesV2
// italien pointent toutes vers des sommets/massifs (Aspromonte, Nebrodi, Monte Linas...), aucune
// vers une commune (feature class P) — GeoNames n'a tout simplement pas de toponymie ladine pour
// les localités, contrairement au sarde/frioulan qui, eux, en ont une réelle. Le ladin reste malgré
// tout une langue d'interface complète (public/js/i18n.js) : seule la recherche de ville par son nom
// ladin n'est pas possible, exactement comme pour la France (aucun aliasFile du tout, voir plus haut).
// "mt" (maltais, ISO 639-1) depuis l'ajout de Malte. "lij" (ligure, ISO 639-3 — le monégasque n'a
// PAS son propre code, voir COUNTRIES/app.js) depuis l'ajout de Monaco, même si GeoNames n'a
// vraisemblablement aucune ligne "lij" à proposer (langue quasi absente des bases de données
// existantes). "nrf-je"/"nrf-gg" (jèrriais/guernésiais) depuis l'ajout de Jersey/Guernesey — voir
// LANG_OUTPUT_REMAP_BY_COUNTRY juste en dessous : GeoNames n'utilise qu'un seul code ISO 639-3
// ("nrf", Norman) pour les DEUX variantes, la RA ISO 639-3 les ayant fusionnées faute d'assez les
// distinguer ; le sous-tag IETF régional (nrf-JE/nrf-GG, aussi utilisé par Wikipédia pour ce même
// besoin) permet de les garder comme deux langues d'interface bien séparées malgré ce code commun.
// "csb" (kachoube, ISO 639-2/3) depuis l'ajout de la Pologne — seule langue RÉGIONALE reconnue par
// la loi polonaise (statut distinct des langues minoritaires, depuis 2005), bien dotée en ressources
// (édition Wikipédia dédiée csb.wikipedia.org, ~87 600 locuteurs recensés 2021). "rue" (rusyn, ISO
// 639-3 — le lemko, nom utilisé spécifiquement en Pologne, en est une variété reconnue comme
// minorité ETHNIQUE distincte à part entière depuis la même loi de 2005, contrairement au croate
// morave tchèque resté classé comme une simple variété du croate) depuis le même ajout. "ruo"
// (istro-roumain, ISO 639-3) depuis l'ajout de la Croatie — langue romane à part (PAS une simple
// variété du roumain standard, contrairement au beás hongrois écarté au tour de la Hongrie),
// gravement menacée (moins de 100 locuteurs natifs, six villages d'Istrie), reconnaissance officielle
// réelle mais partielle (patrimoine culturel protégé depuis 2007, Charte européenne des langues
// régionales/minoritaires Partie II depuis 2010, mais aucun statut de minorité nationale) — ajoutée
// malgré cette confiance plus faible, choix explicite de l'utilisateur (voir README "Langues"),
// cohérent avec le monégasque/jèrriais/guernésiais.
// RATTRAPAGE France/Espagne/Portugal/Andorre (voir README "Langues") : ces quatre pays, parmi les
// tout premiers ajoutés au tout début du projet, n'avaient JAMAIS eu leurs propres langues
// régionales évaluées — l'audit systématique "quelles langues régionales ce pays apporte-t-il ?"
// n'existait pas encore à l'époque. "ca" (catalan, ISO 639-1) : langue OFFICIELLE UNIQUE d'Andorre
// (jamais ajoutée non plus quand Andorre a été couverte — même traitement que le maltais/le
// luxembourgeois, la langue nationale d'un petit pays non encore représentée ailleurs), co-officielle
// en Catalogne/au Pays valencien/aux Baléares en Espagne (statut constitutionnel, ~9 millions de
// locuteurs), langue régionale reconnue en Catalogne Nord (Pyrénées-Orientales) côté France. "eu"
// (basque, ISO 639-1) : co-officiel au Pays basque/en Navarre espagnols (~1,2 million de locuteurs),
// langue régionale côté français (Iparralde/Pays basque nord). "gl" (galicien, ISO 639-1) :
// co-officiel en Galice (~2 millions de locuteurs). "oc" (occitan, ISO 639-1) : l'aranais (variété
// occitane gasconne parlée dans le Val d'Aran) est CO-OFFICIEL en Catalogne aux côtés du catalan et
// de l'espagnol — l'occitan lui-même est la langue régionale la plus répandue historiquement dans le
// sud de la France (tradition littéraire des troubadours, mouvement félibrige), reconnue "langue de
// France" par le ministère de la Culture (DGLFLF) sans statut co-officiel (la France n'a jamais
// ratifié la Charte européenne des langues régionales ou minoritaires, contrairement à tous les
// autres pays déjà couverts ici). Même statut DGLFLF pour "br" (breton, ISO 639-1 — Bretagne, écoles
// immersives Diwan, ~200 000 locuteurs) et "co" (corse, ISO 639-1 — Corse, statut proche du sarde
// italien). Écartés à ce stade (voir README "Langues" pour le détail) : l'alsacien (dialecte
// alémanique sans orthographe standard unique, très proche de l'allemand suisse déjà couvert par
// l'esprit du bas-allemand mais pas directement), le francoprovençal/arpitan (continuum dialectal
// trop fragmenté, aucune norme unique), le flamand occidental de France (quelques milliers de
// locuteurs, même aire dialectale que le flamand occidental belge, déjà couvert par l'esprit du
// néerlandais), et les langues d'oïl (picard, normand continental, gallo, poitevin-saintongeais...  —
// aucune de ce groupe n'atteint le niveau de norme écrite ou de vitalité du breton/de l'occitan/du
// corse). "mwl" (mirandais, ISO 639-3 — pas de code 639-1) : reconnu officiellement au Portugal pour
// les affaires locales depuis la loi 7/99 (29 janvier 1999), Terra de Miranda (Miranda do
// Douro/Mogadouro/Vimioso), ~10 000-15 000 locuteurs. "ga" (irlandais/Gaeilge, ISO 639-1) : ajouté
// depuis l'Irlande, mais PAS pour la même raison que les langues régionales ci-dessus — c'est la
// PREMIÈRE langue officielle de la République d'Irlande à parts égales avec l'anglais (Bunreacht na
// hÉireann, art. 8), donc en principe exclue par la politique "pas de langue nationale d'un pays déjà
// couvert par un autre biais" (voir README "Langues", même règle qui a exclu tchèque/polonais/
// slovaque/hongrois/slovène/croate/bosniaque). Exception délibérée, choix explicite de l'utilisateur :
// contrairement à ces langues slaves parlées dans plusieurs grands pays voisins, l'irlandais n'est
// langue nationale QUE de l'Irlande (et co-officielle de l'UE), un petit pays — même logique que le
// maltais/le luxembourgeois/le catalan (langue nationale d'un petit territoire non encore représentée
// ailleurs au moment de son ajout). "gv" (mannois/Gaelg, ISO 639-1) : langue HISTORIQUE propre à
// l'île de Man, relancée après la mort du dernier locuteur natif en 1974 — vrai soutien
// institutionnel actuel (Bunscoill Ghaelgagh, école primaire en immersion mannoise), ~1 800
// personnes déclarant une connaissance de la langue (recensement 2011). Même cas que le maltais/le
// luxembourgeois : la langue propre d'un petit territoire, pas la langue nationale d'un grand pays
// voisin — confiance plus faible que la moyenne du fait du nombre de locuteurs, comparable au
// cornique/à l'istro-roumain (choix déjà tranché plusieurs fois par l'utilisateur : traduire quand
// même, voir README "Langues"). Quatre dernières langues, toutes arrivées avec le Royaume-Uni mais
// ajoutées dans un commit séparé (voir README "Langues" pour le détail du séquençage) : "cy"
// (gallois, ISO 639-1) — officiel au pays de Galles (Welsh Language (Wales) Measure 2011), Charte
// Partie III, ~880 000 locuteurs, confiance haute. "gd" (gaélique écossais, ISO 639-1) — officiel en
// Écosse (Gaelic Language (Scotland) Act 2005), Charte Partie III, ~57 000-87 000 locuteurs,
// confiance haute. "kw" (cornique, ISO 639-1) — Charte Partie II depuis ~2010, minorité nationale
// reconnue (Framework Convention, 2014), mais seulement ~500-3 000 locuteurs surtout L2 — confiance
// basse, même palier que l'istro-roumain/le mannois. "sco" (scots, ISO 639-2/3 — pas de code 639-1) —
// Charte Partie II, ~1,5 million de locuteurs déclarés à des degrés divers, vraie tradition littéraire
// (Robert Burns) ; l'ulster-scots (variante nord-irlandaise) est délibérément FONDU dans cet ajout
// plutôt qu'ajouté à part — pas de norme écrite vraiment distincte, même logique que le rusyn/lemko
// traité comme une seule langue malgré ses variantes régionales.
// Gibraltar/Moldavie/Biélorussie/Ukraine, dernier ajout en date (voir README "Langues") : "gag"
// (gagaouze, ISO 639-2/3 — pas de code 639-1) depuis l'ajout de la Moldavie, seule langue à statut
// officiel PROPRE au pays (le roumain, langue d'Etat, est déjà couvert via "ro"/la Roumanie) —
// co-officielle dans l'autonomie de Gagaouzie aux côtés du roumain et du russe (loi de 1994 sur le
// statut juridique spécial de la Gagaouzie). "be" (biélorusse) ET "ru" (russe), ISO 639-1 tous les
// deux, depuis l'ajout de la Biélorussie : les DEUX sont langues d'Etat à parts égales (art. 17 de
// la Constitution biélorusse, révision de 1996) — même cas que l'irlandais/l'anglais en République
// d'Irlande, aucune des deux n'est à exclure au nom de la règle "pas de langue nationale d'un pays
// déjà couvert par un autre biais" puisque ni le biélorusse ni le russe ne sont la langue nationale
// d'un AUTRE pays déjà couvert par cette app (la Russie elle-même n'est pas un pays couvert ici).
// "uk" (ukrainien, ISO 639-1) depuis l'ajout de l'Ukraine — seule langue d'Etat depuis la loi du 25
// avril 2019 "Sur le fonctionnement de l'ukrainien en tant que langue d'Etat" (entrée en vigueur le
// 16 juillet 2019). "crh" (tatar de Crimée, ISO 639-2/3 — pas de code 639-1) : contrairement au
// russe, RETIRÉ par le Parlement ukrainien lui-même de la liste des langues minoritaires protégées
// en décembre 2025 (Kyiv Independent, déc. 2025) — le tatar de Crimée, lui, y reste bien présent
// (avec le hongrois/le roumain/le polonais/le biélorusse..., 18 langues au total) : ajouté sur ce
// fondement précis (statut légal ukrainien ACTUEL, jamais un jugement indépendant sur une langue
// hors du périmètre déjà couvert par ce projet), avec la même réserve de confiance que
// l'istro-roumain/le cornique/le mannois déjà traduits malgré un nombre de locuteurs plus modeste
// (~500 000, alphabet latin réintroduit en 1997, toujours en usage concurrent avec le cyrillique).
// Turquie, dernier ajout en date : "tr" (turc, ISO 639-1) seulement — SEULE langue d'Etat au titre
// de l'article 3 de la Constitution turque. Contrairement à tous les pays couverts jusqu'ici, la
// Turquie n'a ni signé ni ratifié la Charte européenne des langues régionales ou minoritaires
// (vérifié, coe.int) et n'accorde de statut CO-officiel à aucune langue régionale nulle part sur
// son territoire, y compris au kurde (kurmandji/zazaki, malgré une population de locuteurs
// importante — dizaines de millions) : l'article 42 de la Constitution interdit explicitement tout
// enseignement d'une langue maternelle autre que le turc, un assouplissement partiel depuis 2012
// (kurde en option à partir de la 5ᵉ année) restant loin d'un statut officiel ou co-officiel. Les
// quatre seules minorités protégées par un texte légal (traité de Lausanne, 1923 — arménien,
// bulgare, grec, hébreu) le sont au titre de droits COMMUNAUTAIRES (écoles, culte) et non d'un
// statut de langue officielle ou régionale comparable à celui qui a justifié chaque ajout précédent
// de ce projet (le finnois-suédois, le trilinguisme bosnien, l'autonomie gagaouze...) — aucune de
// ces quatre langues n'est donc ajoutée ici, cohérent avec la même règle "statut légal réel du pays,
// jamais un jugement indépendant" déjà appliquée pour le Kosovo/l'Ukraine plus haut.
const SUPPORTED_LANGS = new Set(['fr', 'en', 'es', 'pt', 'nl', 'de', 'lb', 'it', 'rm', 'nds', 'hsb', 'frr', 'sc', 'fur', 'lld', 'mt', 'lij', 'nrf-je', 'nrf-gg', 'csb', 'rue', 'ruo', 'ca', 'eu', 'gl', 'oc', 'br', 'co', 'mwl', 'ga', 'gv', 'cy', 'gd', 'kw', 'sco', 'cs', 'pl', 'sk', 'hu', 'sl', 'hr', 'bs', 'sr', 'da', 'no', 'sv', 'fi', 'sq', 'cnr', 'mk', 'ro', 'el', 'bg', 'lv', 'lt', 'et', 'ltg', 'vro', 'sgs', 'is', 'fo', 'gag', 'be', 'ru', 'uk', 'crh', 'tr']);
// Le sorabe (voir "Langues" du README) est traité comme une SEULE langue dans l'interface bien que
// GeoNames distingue haut-sorabe ("hsb", Saxe) et bas-sorabe ("dsb", Brandebourg) — deux langues très
// proches et mutuellement peu intelligibles à l'écrit, mais dont ni l'une ni l'autre n'a un nombre de
// locuteurs justifiant une entrée séparée dans le sélecteur de langue (haut-sorabe ~13 000, bas-sorabe
// ~7 000). Les alias "dsb" de GeoNames sont donc repliés sur le tag de sortie "hsb" (le plus parlé des
// deux) plutôt qu'ignorés — un alias bas-sorabe reste un alias sorabe valide pour la recherche de ville,
// même s'il ne correspond pas exactement à l'écriture haut-sorabe utilisée dans public/js/i18n.js.
const LANG_OUTPUT_REMAP = { dsb: 'hsb' };
// Remap supplémentaire, PAR PAYS cette fois (contrairement à LANG_OUTPUT_REMAP ci-dessus, global) :
// le même code source GeoNames "nrf" doit devenir "nrf-je" pour les alias de Jersey mais "nrf-gg"
// pour ceux de Guernesey — un remap global unique ne pourrait pas faire cette distinction, qui ne
// dépend que du pays en cours de traitement (voir la boucle plus bas).
const LANG_OUTPUT_REMAP_BY_COUNTRY = {
  JE: { nrf: 'nrf-je' },
  GG: { nrf: 'nrf-gg' }
};
// Bug de qualité de données GeoNames propre au Royaume-Uni : pour un grand nombre de petites
// communes galloises/cornouaillaises/écossaises, le nom local (gallois "cy", gaélique-écossais
// "gd", cornique "kw", ou encore irlandais "ga") a été dupliqué tel quel sous des dizaines d'AUTRES
// étiquettes de langue sans rapport (breton, catalan, basque, galicien, néerlandais, allemand,
// français, espagnol, italien, luxembourgeois, portugais, occitan, finnois, same du Nord...) —
// ex. "Aberhonddu" (nom gallois de Brecon) taggué "ca"/"fi"/"ga"/"kw"/"se" en plus de "cy" ; le nom
// à rallonge "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch" est ainsi taggué sous une
// vingtaine de langues, identique caractère pour caractère à chaque fois — aucune traduction
// indépendante ne convergerait par hasard vers la même orthographe dans vingt langues sans rapport,
// contrairement par exemple à "Londres" pour Londres (emprunt partagé authentique entre langues
// romanes). Plutôt qu'une liste de langues à exclure au cas par cas (repérée d'abord pour "br" seul,
// insuffisant : le même problème touche aussi "ca"/"eu"/"gl"/"nl"/"de"/"fr"/"es"/"it"/"lb"/"pt"/"oc"),
// on détecte directement la source du problème : tout nom alternatif dont le texte correspond
// EXACTEMENT à un nom déjà étiqueté "cy"/"gd"/"kw"/"gv"/"ga" dans le dump brut est écarté quelle que
// soit l'étiquette de langue sous laquelle il apparaît par ailleurs (voir CELTIC_PROBE_LANGS et son
// usage plus bas) — évite d'afficher un nom gallois/gaélique/cornique comme s'il s'agissait d'une
// traduction dans une langue qui n'a rien à voir, d'autant plus visible une fois le gallois/gaélique/
// cornique eux-mêmes ajoutés comme vraies langues de l'interface (voir la suite de cette série de
// commits, Royaume-Uni).
const CELTIC_PROBE_LANGS = new Set(['cy', 'gd', 'kw', 'gv', 'ga']);
// Etendu à l'Irlande à son tour : même famille de bug GeoNames potentielle pour un nom irlandais
// (langue désormais elle-même une cible réelle, voir "ga" dans SUPPORTED_LANGS) dupliqué sous une
// étiquette sans rapport — vérifié moins massif qu'au Royaume-Uni (la plupart des doublons irlandais
// concernent le nom ANGLAIS déjà canonique, donc déjà filtré par ailleurs par le test "identique au
// nom canonique"), gardé quand même par prudence.
const CELTIC_CROSS_CONTAMINATION_CHECK_COUNTRIES = new Set(['GB', 'IE', 'IM']);
// Royaume-Uni SEULEMENT, une fois "cy"/"gd"/"kw" eux-mêmes devenus des langues cibles réelles (voir
// SUPPORTED_LANGS plus bas) : CELTIC_PROBE_LANGS ci-dessus a un angle mort — il ne détecte QUE les
// doublons "probe lang -> langue hors-probe", jamais les doublons ENTRE deux probe langs (un même nom
// gallois taggué à la fois "cy" pour un geonameid et "gd"/"ga"/"kw" pour un autre geonameid du même
// lieu — aucun des deux ne déclenche sa propre exclusion). Découvert en testant ce rattrapage précis :
// sur les 2 236 alias bruts pour le Royaume-Uni, une bonne part de "cy"/"gd"/"kw"/"ga" pointait vers
// des communes hors du territoire linguistique correspondant (ex. "gd" gaélique-écossais "Y Trallwng"
// -> Welshpool, une ville GALLOISE ; "kw" cornique "Trefynwy" -> Monmouth, dans le Monmouthshire
// gallois ; "ga" irlandais "Inbhir Úige" -> Wick, en ÉCOSSE) — aucune raison qu'une ville hors de son
// aire linguistique propre ait un nom distinct dans cette langue. Restriction GÉOGRAPHIQUE (région
// GeoNames de la commune ciblée, même champ que la colonne région de communes-gb.txt) plutôt qu'un
// filtre de contenu : bien plus fiable ici que d'essayer de deviner linguistiquement quel nom "a
// l'air" gallois/gaélique/cornique/irlandais. Domaines vérifiés exhaustivement sur les 117 régions
// distinctes de communes-gb.txt.
const GB_REGION_RESTRICTED_LANGS = {
  cy: new Set(['Blaenau Gwent', 'Bridgend', 'Caerphilly', 'Cardiff', 'Carmarthenshire', 'Ceredigion',
    'Conwy', 'Denbighshire', 'Flintshire', 'Gwynedd', 'Isle of Anglesey', 'Merthyr Tydfil',
    'Monmouthshire', 'Neath Port Talbot', 'Newport', 'Pembrokeshire', 'Powys', 'Rhondda Cynon Taff',
    'Swansea', 'Torfaen', 'Vale of Glamorgan', 'Wales', 'Wrexham']), // pays de Galles
  gd: new Set(['Aberdeen City', 'Aberdeenshire', 'Angus', 'Argyll and Bute', 'City of Edinburgh',
    'Clackmannanshire', 'Dumfries and Galloway', 'Dunbartonshire', 'Dundee City', 'East Ayrshire',
    'East Dunbartonshire', 'East Lothian', 'East Renfrewshire', 'Falkirk', 'Fife', 'Glasgow City',
    'Highland', 'Inverclyde', 'Inverness', 'Isle of Barra', 'Midlothian', 'Moray', 'North Ayrshire',
    'North Lanarkshire', 'Orkney Islands', 'Perth and Kinross', 'Renfrewshire', 'Scotland',
    'Scottish Borders', 'Shetland Islands', 'South Ayrshire', 'South Lanarkshire', 'Stirling',
    'West Dunbart', 'West Lothian', 'Western Isles']), // Écosse
  kw: new Set(['Cornwall']), // Cornouailles
  ga: new Set(['Belfast', 'Belfast Greater', 'County Antrim', 'County Armagh', 'County Down',
    'County Fermanagh', 'County Londonderry', 'County Tyrone', 'Northern Ireland']) // Irlande du Nord
};
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
  'Prague': 'Praha',
  'Pilsen': 'Plzeň',
  'Warsaw': 'Warszawa',
  'Lodz': 'Łódź',
  'Bielsko-Biala': 'Bielsko-Biała',
  // Voir build-country-communes.js pour le détail de ces huit cas irlandais (six repérés par
  // relecture visuelle, deux via l'accord multi-langues d'aliases-ie.txt) — même correction
  // reproduite ici à l'identique, indispensable pour que les alias eux-mêmes pointent vers le bon
  // nom canonique plutôt que vers la forme irlandaise du dump brut.
  'An Ros': 'Rush',
  'Droichead Nua': 'Newbridge',
  'An Muileann gCearr': 'Mullingar',
  'Baile an Mhuilinn': 'Milltown',
  'Cill Fhíonáin': 'Kilfinane',
  'Cluain Meala': 'Clonmel',
  'Trá Mhór': 'Tramore',
  'Leifear': 'Lifford',
  // Voir build-country-communes.js pour le détail (Belgrade/Beograd, diacritique manquant de
  // Knjazevac/Knjaževac) — même correction reproduite ici pour que les alias pointent vers le bon
  // nom canonique.
  'Belgrade': 'Beograd',
  'Knjazevac': 'Knjaževac',
  // Voir build-country-communes.js pour le détail (Bucharest/Bucureşti) — même correction reproduite
  // ici. Aucune côté bulgare (voir aussi son commentaire).
  'Bucharest': 'Bucureşti',
  // Voir build-country-communes.js pour le détail complet (Riga/Rīga côté letton ; onze cas
  // lituaniens, macron/caron manquant — Ukmergė, Telšiai, Tauragė, Šilutė, Radviliškis, Plungė,
  // Naujoji Akmenė, Mažeikiai, Kupiškis, Biržai, Vilkaviškis) — mêmes corrections reproduites ici.
  // Aucune côté estonien.
  'Riga': 'Rīga',
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
  // Voir build-country-communes.js pour le détail (Vatican City -> Città del Vaticano) — même
  // correction reproduite ici. Aucune côté islandais ni féroïen.
  'Vatican City': 'Città del Vaticano',
  // Gibraltar/Moldavie/Biélorussie/Ukraine, dernier ajout en date — voir build-country-communes.js
  // pour le détail complet de chaque correction, reproduites ici à l'identique (même canonique
  // cible que communes-XX.txt, nécessaire pour que les alias pointent vers un nom qui existe
  // réellement dans ce fichier).
  'Chisinau': 'Chişinău',
  'Ryasno, Rjasno, Rasna': 'Ryasno',
  // Turquie, dernier ajout en date — voir build-country-communes.js pour le détail complet de
  // chaque correction, reproduites ici à l'identique.
  'Istanbul': 'İstanbul',
  'Umraniye': 'Ümraniye',
  'İnegol': 'İnegöl',
  'Sarigerme': 'Sarıgerme',
  'Incekum': 'İncekum',
  'Kutuklu': 'Kütüklü',
  'Karaburcak': 'Karaburçak',
  'Alacami': 'Alaçami'
};
// Même correction que build-country-communes.js (voir son commentaire pour le détail) : le dump
// GeoNames croate confond le Ð latin (Eth, U+00D0) avec le VRAI Đ croate (D barré, U+0110) dans 48
// noms de communes — remplacement global, sans risque pour les autres pays déjà générés.
function cleanName(raw){ return (NAME_OVERRIDES[raw] || raw).replace(/Ð/g, 'Đ'); }
// Même exclusion que build-country-communes.js (voir son commentaire pour le détail) : Sercq n'a
// aucune liaison en ferry pour véhicules, un alias y menant ne servirait donc à rien côté recherche
// (la commune elle-même est absente de communes-gg.txt).
const SARK_EXCLUDE_NAMES = new Set(['Sark', 'La Seigneurie']);
// Même incohérence que build-country-communes.js (voir son commentaire pour le détail) : 75
// communes macédoniennes restent en cyrillique brut dans le champ "name" du dump alors que le
// reste du pays est en latin — utilise le champ asciiname (c[2]) à la place pour ces seules
// entrées, pour que le nom CANONIQUE servant de cible aux alias soit cohérent avec
// communes-mk.txt (généré avec exactement la même règle).
const MK_CYRILLIC_RE = /[Ѐ-ӿ]/;
// Même repli réutilisé pour la Biélorussie (14 communes) et l'Ukraine (3, dont deux caractères
// cyrilliques confusables isolés plutôt qu'un nom entièrement cyrillique — voir
// build-country-communes.js pour le détail complet).
const ASCIINAME_FALLBACK_COUNTRIES = new Set(['MK', 'BY', 'UA']);

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180, dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
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
  const { grid } = gridObj;
  const cLat = Math.round(lat*10), cLon = Math.round(lon*10);
  let best = null, bestDist = Infinity;
  for(let dLat=-1; dLat<=1; dLat++){
    for(let dLon=-1; dLon<=1; dLon++){
      const bucket = grid.get((cLat+dLat) + '_' + (cLon+dLon));
      if(!bucket) continue;
      for(const p of bucket){
        const d = haversineKm(lat, lon, p.lat, p.lon);
        if(d < bestDist){ bestDist = d; best = p; }
      }
    }
  }
  return (best && bestDist <= maxKm) ? best : null;
}
// Normalisation légère (minuscules, sans accents) pour comparer un alias au nom canonique et
// écarter les paires identiques (ex. beaucoup de lignes GeoNames répètent juste le nom local sous
// plusieurs codes langue — "Sant Julià de Lòria" en de/pt/nl : ce n'est pas une vraie traduction).
function normalize(s){
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

for(const country of COUNTRIES){
  const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8');
  const postalRaw = fs.readFileSync(path.join(__dirname, 'postal', country + '_postal.txt'), 'utf8');
  const altRaw = fs.readFileSync(path.join(__dirname, 'altnames', country + '.txt'), 'utf8');

  const postalPoints = postalRaw.split('\n').filter(Boolean).map(line => {
    const c = line.split('\t');
    return { postcode: c[1], admin1: c[3] || '', code1: c[4] || '', admin2: c[5] || '', lat: parseFloat(c[9]), lon: parseFloat(c[10]) };
  }).filter(p => !isNaN(p.lat) && !isNaN(p.lon));
  const postalGrid = buildGrid(postalPoints);
  const postalByAdmin1Code = new Map();
  if(country === 'AD'){
    postalPoints.forEach(p => { if(p.code1) postalByAdmin1Code.set(p.code1, p); });
  }

  const rows = dumpRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
  const places = rows
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]))
    .map(c => ({
      geonameid: c[0],
      // Macédoine du Nord : le nom d'origine (souvent cyrillique brut, voir MK_CYRILLIC_RE plus
      // haut) est conservé à part (rawName) même quand `name` bascule sur asciiname — sans ça, ces
      // 75 communes deviendraient introuvables en tapant leur VRAI nom macédonien (voir plus bas,
      // où rawName sert à synthétiser un alias "mk" quand aucun n'existe déjà dans le fichier
      // alternateNames pour ce geonameid précis).
      rawName: c[1],
      name: cleanName((ASCIINAME_FALLBACK_COUNTRIES.has(country) && MK_CYRILLIC_RE.test(c[1])) ? c[2] : c[1]),
      lat: parseFloat(c[4]),
      lon: parseFloat(c[5]),
      admin1Code: c[10] || '',
      pop: parseInt(c[14], 10) || 0
    }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name)
    .filter(p => !(country === 'GG' && SARK_EXCLUDE_NAMES.has(p.name)));

  const seen = new Map();
  for(const p of places){
    const key = p.name.toLowerCase() + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
    const existing = seen.get(key);
    if(!existing || p.pop > existing.pop) seen.set(key, p);
  }
  // geonameid -> nom canonique final, UNIQUEMENT pour les communes qui ont bien survécu à la
  // jointure code postal (donc réellement présentes dans public/data/communes-XX.txt) — un alias
  // pointant vers une commune absente du fichier ne servirait à rien côté recherche.
  const canonicalByGeonameId = new Map();
  // Royaume-Uni seulement : geonameid -> région (admin2 ou admin1, MÊME calcul que le champ région de
  // communes-gb.txt dans build-country-communes.js) — nécessaire pour GB_REGION_RESTRICTED_LANGS
  // plus bas.
  const regionByGeonameId = (country === 'GB') ? new Map() : null;
  // Macédoine du Nord seulement : geonameid -> vrai nom cyrillique d'origine, pour les communes où
  // `name` a basculé sur asciiname (voir MK_CYRILLIC_RE) — sert plus bas à synthétiser un alias
  // "mk" quand le fichier alternateNames n'en fournit aucun pour ce geonameid précis (cas de figure
  // vérifié : le nom cyrillique brut est parfois attaché à un AUTRE geonameid — ex. l'entrée
  // administrative "Општина X" — jamais à celui du lieu habité lui-même).
  const mkRawCyrillicByGeonameId = (country === 'MK') ? new Map() : null;
  for(const p of seen.values()){
    const near = (country === 'AD') ? (postalByAdmin1Code.get(p.admin1Code) || null) : nearest(postalGrid, p.lat, p.lon, 15);
    if(near){
      canonicalByGeonameId.set(p.geonameid, p.name);
      if(regionByGeonameId) regionByGeonameId.set(p.geonameid, near.admin2 || near.admin1 || '');
      if(mkRawCyrillicByGeonameId && p.rawName !== p.name){
        mkRawCyrillicByGeonameId.set(p.geonameid, p.rawName);
      }
    }
  }

  // Fichier alternateNames : alternateNameId, geonameid, isolanguage, alternate name,
  // isPreferredName, isShortName, isColloquial, isHistoric, from, to.
  const aliasRows = altRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
  const seenAlias = new Set(); // dédoublonnage (lang, alias, canonical) — plusieurs lignes GeoNames
  // donnent parfois exactement la même correspondance (variantes préférée/courte du même nom).
  const countryRemap = LANG_OUTPUT_REMAP_BY_COUNTRY[country] || {};
  // Voir CELTIC_PROBE_LANGS plus haut : ensemble des noms déjà confirmés gallois/gaéliques/
  // corniques/manxois/irlandais dans ce dump, pour repérer les duplications sous une langue sans
  // rapport.
  let celticNames = null;
  if(CELTIC_CROSS_CONTAMINATION_CHECK_COUNTRIES.has(country)){
    celticNames = new Set();
    for(const c of aliasRows){
      if(CELTIC_PROBE_LANGS.has(c[2]) && c[3]) celticNames.add(normalize(c[3]));
    }
  }
  const out = [];
  for(const c of aliasRows){
    const geonameid = c[1], rawLang = c[2], alt = c[3], isHistoric = c[7];
    if(celticNames && !CELTIC_PROBE_LANGS.has(rawLang) && celticNames.has(normalize(alt))) continue;
    // Voir GB_REGION_RESTRICTED_LANGS plus haut pour le détail de ce filtre géographique.
    if(country === 'GB' && GB_REGION_RESTRICTED_LANGS[rawLang] && !GB_REGION_RESTRICTED_LANGS[rawLang].has(regionByGeonameId.get(geonameid) || '')) continue;
    // ex. "dsb" (bas-sorabe) -> "hsb" partout ; "nrf" -> "nrf-je"/"nrf-gg" seulement pour Jersey/
    // Guernesey (voir LANG_OUTPUT_REMAP_BY_COUNTRY plus haut) — le remap par pays a priorité.
    const lang = countryRemap[rawLang] || LANG_OUTPUT_REMAP[rawLang] || rawLang;
    if(!SUPPORTED_LANGS.has(lang)) continue;
    if(isHistoric === '1') continue;
    const canonical = canonicalByGeonameId.get(geonameid);
    if(!canonical || !alt) continue;
    if(normalize(alt) === normalize(canonical)) continue; // pas une vraie variante
    const dedupeKey = lang + '|' + normalize(alt) + '|' + canonical;
    if(seenAlias.has(dedupeKey)) continue;
    seenAlias.add(dedupeKey);
    out.push(`${lang};${alt};${canonical}`);
  }

  // Macédoine du Nord seulement : synthétise un alias "mk" (nom cyrillique -> nom latin canonique)
  // pour chaque commune de mkRawCyrillicByGeonameId qui n'en a reçu AUCUN du fichier alternateNames
  // ci-dessus — sans ça, une commune comme Арачиново/Arachinovo deviendrait introuvable en tapant
  // son vrai nom macédonien, alors même que c'est ce nom-là que le dump GeoNames donnait à l'origine
  // pour son propre geonameid (voir MK_CYRILLIC_RE/rawName plus haut).
  if(mkRawCyrillicByGeonameId){
    let synthesized = 0;
    for(const [geonameid, rawName] of mkRawCyrillicByGeonameId){
      const canonical = canonicalByGeonameId.get(geonameid);
      if(!canonical || normalize(rawName) === normalize(canonical)) continue;
      const dedupeKey = 'mk|' + normalize(rawName) + '|' + canonical;
      if(seenAlias.has(dedupeKey)) continue;
      seenAlias.add(dedupeKey);
      out.push(`mk;${rawName};${canonical}`);
      synthesized++;
    }
    if(synthesized) console.log(country, ': +', synthesized, 'alias "mk" synthétisés (nom cyrillique brut sans entrée alternateNames dédiée)');
  }

  const outPath = path.join(__dirname, '..', 'public', 'data', 'aliases-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(outPath, out.join('\n') + (out.length ? '\n' : ''), 'utf8');
  console.log(country, ':', canonicalByGeonameId.size, 'communes couvertes ->', out.length, 'alias ->', outPath);
}
