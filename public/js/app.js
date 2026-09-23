
(async function(){
  "use strict";

  // Pays couverts, un par un (voir README) — chaque entrée pointe vers son propre fichier
  // communes-XX.txt (même format que la France : population;lon,lat;cp;région;nom), pour pouvoir
  // ajouter un nouveau pays sans toucher aux fichiers déjà en place. hasToll/tollRateByClass :
  // la France, l'Espagne et l'Italie ont un vrai réseau autoroutier à péage significatif au tarif
  // kilométrique repéré (voir plus bas, finalizeLeg) ; le Portugal n'a que son réseau à péage
  // électronique sans barrière (tarif très inférieur, cohérent avec les grilles Via Verde/Ascendi
  // consultées) ; l'Andorre, la Belgique, les Pays-Bas, le Luxembourg, la Suisse, l'Allemagne et
  // l'Autriche n'ont pas de péage AU TRAJET — aucun montant n'y est donc jamais affiché. Dans les
  // trois premiers, un ou deux ponts/tunnels isolés restent payants (Kiltunnel/pont de Nieuwerbrug
  // aux Pays-Bas, quelques tunnels ponctuels au Luxembourg) mais ne sont, volontairement, pas
  // modélisés : contrairement à un réseau autoroutier ou à une traversée en ferry (toujours
  // obligatoire, voir plus bas), rien ne dit qu'un trajet donné passerait justement par cet ouvrage
  // précis plutôt qu'un itinéraire alternatif gratuit — cette app ne calcule pas de vrai itinéraire
  // routier (voir roadDistanceKm), les ajouter au hasard serait donc plus souvent faux que juste. La
  // Suisse et l'Autriche sont un cas à part, tous les deux : leur réseau autoroutier n'est pas
  // gratuit, mais son usage est soumis à une vignette ANNUELLE (ou de plus courte durée) à prix fixe
  // plutôt qu'à un péage par trajet — aucun modèle €/km ou CHF/km n'a de sens ici, et l'app ne simule
  // pas un abonnement. Chacun a aussi ses propres ouvrages isolés à péage EN PLUS de la vignette,
  // non modélisés pour la même raison que le Kiltunnel néerlandais : le Grand-Saint-Bernard/Munt la
  // Schera pour la Suisse, plusieurs tunnels/tronçons alpins (Brenner, Tauern, Karawanken...) pour
  // l'Autriche. La République tchèque rejoint ce même groupe à vignette (électronique depuis 2021,
  // e-dálniční známka — SFDI, edalnice.gov.cz) : 1 jour/10 jours/30 jours/1 an à prix fixe en CZK
  // (230/300/480/2570 CZK 2026 pour un véhicule léger), aucun ouvrage isolé à péage connu en plus de
  // la vignette (contrairement à la Suisse/l'Autriche). L'Allemagne est, elle, un cas simple : ses
  // autoroutes (Autobahn) sont entièrement
  // gratuites pour tous les modes de transport que couvre cette app (voiture, van, moto) — seuls les
  // poids lourds ≥3,5 t paient une redevance kilométrique (LKW-Maut, élargie aux véhicules de 3,5 t
  // depuis juillet 2024), un seuil qu'aucun véhicule modélisé ici n'atteint (un van aménagé reste un
  // véhicule léger). Saint-Marin et le Liechtenstein sont, eux, les cas les plus simples de tous :
  // ni péage, ni vignette, ni ouvrage isolé payant — Saint-Marin (292 km de routes, aucune autoroute)
  // et le Liechtenstein (aucune autoroute non plus, quelques mètres de route classée "autoroute" à la
  // frontière suisse mais sans aucun péage ni vignette propre — la vignette suisse, si elle est
  // achetée, y est valable aussi, mais n'est jamais obligatoire pour le seul Liechtenstein) ont un
  // réseau routier entièrement gratuit. Monaco, Malte, Guernesey et Jersey rejoignent ce même groupe
  // "entièrement gratuit" : aucun des quatre n'a de réseau autoroutier à péage ni de vignette (Malte
  // a bien un péage urbain à Valette, mais UNIQUEMENT une redevance de congestion aux heures de
  // bureau, pas un péage routier — non modélisé, comme les ouvrages isolés ci-dessus). La Pologne est
  // un cas particulier, différent de tous les précédents : depuis 2021, la quasi-totalité du réseau
  // autoroutier/express géré par l'Etat (GDDKiA) est gratuite pour les voitures/vans/motos — mais
  // TROIS sections restent à péage réel pour ces mêmes véhicules, concédées à des opérateurs privés
  // et non à l'Etat : A1 Gdańsk-Toruń (AmberOne, ~152 km), A2 Świecko-Konin (Autostrada
  // Wielkopolska, ~255 km) et A4 Katowice-Kraków (Stalexport, ~60 km) — ~467 km à elles trois sur
  // un réseau national de ~1 700 km. Contrairement au Kiltunnel néerlandais ou aux tunnels alpins
  // suisses/autrichiens (de vrais ouvrages isolés de quelques km), ce sont ici de longs corridors
  // autoroutiers à part entière — mais toujours seulement TROIS itinéraires précis parmi des
  // centaines de trajets possibles à travers le pays : rien ne dit qu'un trajet tiré au hasard entre
  // deux communes polonaises emprunterait justement l'un de ces trois corridors plutôt qu'un chemin
  // alternatif gratuit (l'app ne calcule toujours pas de vrai itinéraire routier, voir
  // roadDistanceKm) — les modéliser comme un péage général serait donc plus souvent faux que juste,
  // exactement le même raisonnement que pour un ouvrage isolé, à une échelle géographique plus
  // grande. hasToll:false, et aucune vignette non plus : le réseau gratuit l'est réellement, sans
  // laissez-passer à acheter au préalable comme en Suisse/Autriche/République tchèque. La Slovaquie
  // rejoint, elle, le groupe à vignette (Suisse/Autriche/République tchèque) : vignette électronique
  // obligatoire (e-známka — Národná diaľničná spoločnosť/NDS, eznamka.sk) sur toutes les autoroutes
  // (D) et voies express (R) du pays, à prix fixe selon la durée (1/10/30/365 jours, 8,10/10,80/
  // 17,10/90 € 2026 pour un véhicule léger) — aucun barème €/km ne peut en dériver, et l'app ne
  // simule pas un abonnement (hasToll:false). Aucun ouvrage isolé à péage identifié en plus de la
  // vignette, comme la République tchèque — cas simple, sans les tunnels alpins de la Suisse/
  // l'Autriche. La Hongrie rejoint le même groupe à vignette : vignette électronique obligatoire
  // (e-matrica — NÚSZ Zrt./Nemzeti Útdíjfizetési Szolgáltató, ematrica.nemzetiutdij.hu, portail
  // d'Etat) sur les autoroutes et voies rapides, à prix fixe selon la durée et la catégorie de
  // véhicule (catégorie D1, voiture ≤3,5 t : 1 jour 5 550 Ft, 10 jours 6 900 Ft, 1 mois 11 170 Ft,
  // 1 an national 61 760 Ft, 2026) — aucun barème Ft/km ne peut en dériver, et l'app ne simule pas
  // un abonnement (hasToll:false). Aucun ouvrage isolé à péage identifié en plus de la vignette,
  // comme la République tchèque/la Slovaquie. La Slovénie rejoint elle aussi le même groupe :
  // e-vinjeta obligatoire (DARS — Družba za avtoceste v Republiki Sloveniji, gestionnaire public du
  // réseau, portail evinjeta.dars.si — 100% numérique depuis 2022, plus de vignette autocollante),
  // à prix fixe selon la durée pour une voiture (classe 2A) : 7 jours 16 €, 1 mois 32 €, 1 an
  // 117,50 € (2026) — aucun barème €/km ne peut en dériver (hasToll:false). Aucun ouvrage isolé à
  // péage identifié en plus de la vignette, comme la République tchèque/la Slovaquie/la Hongrie. La
  // Croatie, elle, ROMPT ce groupe et rejoint plutôt la France/l'Espagne/l'Italie : un vrai péage
  // FERMÉ au trajet (ticket à l'entrée, paiement à la sortie selon la distance parcourue), géré par
  // HAC/Bina-Istra/AZM sur ~1 330 km d'autoroutes — PAS de vignette. Barème officiel 2026 (calculé
  // sur Zagreb-Split/Dugopolje, ~410 km, mojkalkulator.com.hr agrégeant les tarifs HAC) : catégorie I
  // (voiture) 24,50 €, catégorie II (van/remorque) 36,70 €, catégorie IA (moto) 12,30 € — soit
  // 0,060 €/km (classe 1), 0,090 €/km (classe 2, ratio ×1,5 EXACT par rapport à la classe 1, une
  // vraie donnée plutôt qu'une extrapolation), 0,030 €/km (classe 5, ratio ×0,5 EXACT lui aussi) —
  // voir TOLL_RATE_BY_COUNTRY.HR plus bas. hasToll:true, comme la France/l'Espagne/l'Italie. La
  // Bosnie-Herzégovine rejoint elle aussi ce groupe à péage fermé : réseau encore limité (~200 km
  // au total, deux gestionnaires — JP Autoceste FBiH pour le corridor Vc/A1 Sarajevo-Zenica et le
  // tronçon sud vers la Croatie, AD Autoputevi RS pour le tronçon nord Gradiška-Doboj/E661
  // Gradiška-Banja Luka), tickets payés à la sortie. Barème 2026 moins homogène que pour la Croatie
  // (aucune source unique avec grille par catégorie) : six sections réelles retenues (tolls.eu),
  // 0,09 à 0,29 KM/km selon le tronçon, moyenne ~0,19 KM/km — converti au taux de caisse d'émission
  // fixe (1 EUR = 1,95583 KM depuis 1997, voir COUNTRIES.BA.currency plus bas) : ~0,097 €/km,
  // classes 2/5 extrapolées au ratio France/Espagne/Italie (×1,55/×0,58) faute de grille par
  // catégorie ici. hasToll:true. Le Royaume-Uni, lui, REJOINT le groupe "entièrement gratuit"
  // (Belgique/Pays-Bas/Luxembourg/Allemagne/Saint-Marin/Liechtenstein/Monaco/Malte/Guernesey/
  // Jersey/Pologne) : son réseau autoroutier (motorways, "M") est intégralement gratuit, comme les
  // autoroutes allemandes.
  // Seuls trois ouvrages ISOLÉS restent payants — le M6 Toll près de Birmingham (~43 km, National
  // Highways/Midland Expressway), le Dartford Crossing sur la Tamise à l'est de Londres (pont/
  // tunnels de l'A282), et le Mersey Gateway près de Liverpool — exactement le même cas que le
  // Kiltunnel néerlandais ou les tunnels alpins suisses/autrichiens : de vrais péages, mais des
  // ouvrages ponctuels qu'un trajet aléatoire ne traverse pas nécessairement plutôt qu'un chemin
  // alternatif gratuit (l'app ne calcule pas de vrai itinéraire routier, voir roadDistanceKm) — non
  // modélisés, pour la même raison. hasToll:false, aucune vignette non plus (contrairement à la
  // Suisse/l'Autriche/la République tchèque/la Slovaquie/la Hongrie/la Slovénie, le Royaume-Uni n'a
  // aucun système de vignette). L'Irlande, elle, POURRAIT sembler rejoindre plutôt le groupe à péage
  // fermé de la Croatie/la Bosnie-Herzégovine (M50 autour de Dublin, M1/M3/M4/M6/M7-M8/N25 vers les
  // autres grandes villes) — mais son système est en réalité un ensemble de BARRIÈRES PONCTUELLES à
  // tarif FIXE (ex. M50 : 3,10 € par passage au pont de Westlink, quel que soit le trajet parcouru
  // sur cette autoroute ; M1 Drogheda/M4 Enfield/M6 Athlone/M7-M8 Portlaoise/N25 Waterford : chacune
  // UN seul point de péage à tarif fixe, entre 1,90 € et 3,10 € selon le tronçon, 2026), pas un
  // système fermé proportionnel à la distance (ticket entrée/sortie) comme HAC en Croatie. Chaque
  // barrière est encore plus ponctuelle qu'un corridor polonais entier (voir plus haut) : un simple
  // point fixe sur l'autoroute, traversé ou non selon l'itinéraire exact, jamais garanti par un
  // trajet aléatoire entre deux communes irlandaises quelconques (l'app ne calcule toujours pas de
  // vrai itinéraire routier). hasToll:false, même raisonnement que les ouvrages isolés britanniques/
  // néerlandais/suisses/autrichiens ci-dessus, à une échelle plus fine encore (barrière ponctuelle
  // plutôt que tunnel/pont/corridor). Aucune vignette non plus. L'île de Man, elle, est le cas le
  // plus simple de toute cette série : AUCUNE autoroute ni voie rapide sur toute l'île (réseau
  // routier local, y compris le célèbre circuit du TT sur route ouverte) — hasToll:false sans la
  // moindre exception à modéliser, comme Saint-Marin/le Liechtenstein.
  // aliasFile (AD/ES/PT/BE/NL/LU/CH/DE/IT/AT/SM/LI/MC/MT/GG/JE/CZ/PL/SK/HU/SI/HR/BA/GB/IE/IM seulement) : noms alternatifs par
  // langue (voir scripts/build-aliases.js, source GeoNames alternateNamesV2) — permet de saisir une
  // ville dans la langue choisie pour l'interface (ex. "Anvers" pour la commune belge "Antwerpen",
  // "La Haye" pour la commune néerlandaise "Den Haag" — voir searchCommunes plus bas). Absent pour la
  // France : ses communes viennent de geo.api.gouv.fr, pas de GeoNames, aucun geonameid n'est donc
  // disponible pour les relier à ces noms alternatifs (voir le script pour le détail de ce choix).
  // currency (CH/LI/GG/JE/CZ/PL) : la Suisse et le Liechtenstein (franc suisse, union monétaire) ne
  // sont pas dans la zone euro ; Guernesey et Jersey non plus (livre de Guernesey/livre de Jersey,
  // deux monnaies locales À PARITÉ FIXE avec la livre sterling — jamais l'euro malgré la proximité
  // avec la France) — modélisées ici sous 'GBP', la devise réellement utilisée pour les prix affichés
  // (Airbnb/Booking n'ont pas de sélecteur "livre de Jersey/Guernesey", seulement GBP). Monaco et
  // Malte, eux, sont bien en zone euro (absent -> EUR par défaut, voir countryCurrency plus bas). La
  // République tchèque n'a, elle non plus, jamais adopté l'euro (membre de l'UE mais hors zone euro,
  // comme la Suisse) : sa monnaie propre, la couronne tchèque ('CZK'), reste utilisée ici. La Pologne
  // non plus (membre de l'UE, hors zone euro comme la Suisse/la République tchèque) : le złoty
  // polonais ('PLN'). La Slovaquie, elle, contrairement à ses trois voisins ci-dessus (Autriche,
  // République tchèque, Pologne), A adopté l'euro (2009) — absent de COUNTRIES.SK.currency, EUR par
  // défaut, comme la grande majorité des pays déjà couverts. La Hongrie, elle, rejoint le camp
  // "hors zone euro" (membre de l'UE mais pas de l'euro, comme la République tchèque/la Pologne,
  // PAS comme sa voisine slovaque) : sa monnaie propre, le forint hongrois ('HUF'), reste utilisée
  // ici. La Slovénie, elle, a adopté l'euro dès 2007 — premier des pays entrés dans l'UE en 2004 à
  // le faire, et la SEULE des quatre voisines directes de l'Italie/l'Autriche ici couvertes (avec la
  // Slovaquie) à être dans la zone euro : absente de COUNTRIES.SI.currency, EUR par défaut. La
  // Croatie, elle, a adopté l'euro le 1er janvier 2023 — la plus récente adoption parmi tous les pays
  // ici couverts, remplaçant la kuna croate (HRK) : absente elle aussi de COUNTRIES.HR.currency. La
  // Bosnie-Herzégovine, elle, n'a PAS l'euro et n'est même pas candidate à l'adoption à court terme
  // (candidate à l'UE depuis 2022 seulement, hors zone euro ET hors MCE II) : sa monnaie propre, le
  // mark convertible ('BAM', symbole KM) — mais à la différence du forint hongrois ou de la couronne
  // tchèque, à PARITÉ FIXE avec l'euro depuis 1997 via caisse d'émission (currency board), jamais
  // dévaluée depuis 28 ans : 1 EUR = 1,95583 BAM exactement, le même taux que le deutsche mark avait
  // avec l'euro. Le Royaume-Uni, lui, rejoint Guernesey/Jersey (currency:'GBP') : la livre sterling,
  // jamais l'euro malgré le Brexit n'ayant rien changé à cette évidence antérieure — même choix que
  // pour les deux baillages, "GBP" est aussi la devise réellement proposée par Airbnb/Booking (pas
  // de sélecteur séparé). L'Irlande, elle, contrairement à son voisin britannique, EST en zone euro
  // (depuis 1999/2002 comme la France) : absente de COUNTRIES.IE.currency, EUR par défaut. L'île de
  // Man, elle, rejoint le Royaume-Uni/Guernesey/Jersey (currency:'GBP') : la livre mannoise existe
  // bien mais reste à parité fixe avec la livre sterling, jamais utilisée séparément par Airbnb/
  // Booking — même raisonnement, "GBP" directement réutilisé sans nouvelle recherche.
  var COUNTRIES = TripData.COUNTRIES;
  var COUNTRY_LIST = Object.keys(COUNTRIES);
  var ALIAS_COUNTRY_LIST = COUNTRY_LIST.filter(function(cc){ return COUNTRIES[cc].aliasFile; });
  // Symbole/code affiché à côté d'un montant (voir updateBudgetHint plus bas) : "€" pour l'euro (le
  // seul des treize à s'afficher en symbole plutôt qu'en code ISO, par habitude d'usage), les douze
  // autres tels quels — la livre sterling se note généralement "£" devant le montant en anglais,
  // mais rester en code ISO ici évite toute ambiguïté avec les livres locales de Guernesey/Jersey
  // (jamais interchangeables avec un simple "£" hors de leurs îles respectives).
  // Gibraltar/Moldavie/Biélorussie/Ukraine, dernier ajout en date : GIP rejoint CHF/GBP/CZK/PLN/HUF/
  // BAM/DKK/NOK/SEK/ALL/RSD/MKD/RON/ISK (code ISO tel quel, jamais un symbole ambigu) pour la même
  // raison que GBP — la livre de Gibraltar est à parité fixe avec la livre sterling mais n'est PAS
  // interchangeable avec elle en dehors du territoire, un simple "£" créerait la même ambiguïté déjà
  // évitée pour GBP/Guernesey/Jersey. MDL/BYN/UAH suivent la même règle par cohérence avec le reste
  // de la table (aucune de ces trois devises n'a un symbole international aussi immédiatement
  // reconnaissable que "€", même règle qui a laissé CZK/PLN/HUF... en code ISO plutôt qu'en symbole).
  // Turquie, dernier ajout en date : TRY suit la même règle que le reste de la table (code ISO
  // plutôt qu'un symbole, même si — contrairement à GIP/MDL/BYN/UAH — la livre turque a un vrai
  // symbole ("₺") suffisamment reconnaissable pour ne pas nécessiter cette prudence ; gardé en code
  // ISO malgré tout pour rester cohérent avec le reste de cette table, jamais mélangée entre symbole
  // et code ISO selon la devise (voir CURRENCY_GLYPH juste en dessous pour le vrai symbole, réservé
  // au sélecteur de devise).
  // Arménie/Azerbaïdjan/Syrie, dernier ajout en date : AMD/AZN/SYP suivent la même règle (code ISO
  // plutôt qu'un symbole ici, quel que soit le vrai symbole disponible — voir CURRENCY_GLYPH plus bas).
  // Liban/Israël/Jordanie/Égypte/Libye, dernier ajout en date : LBP/ILS/JOD/EGP/LYD suivent la même
  // règle (code ISO ici, quel que soit le vrai symbole — voir CURRENCY_GLYPH plus bas).
  var CURRENCY_SYMBOL = { EUR: '€', CHF: 'CHF', GBP: 'GBP', CZK: 'CZK', PLN: 'PLN', HUF: 'HUF', BAM: 'KM', DKK: 'DKK', NOK: 'NOK', SEK: 'SEK', ALL: 'ALL', RSD: 'RSD', MKD: 'MKD', RON: 'RON', ISK: 'ISK', GIP: 'GIP', MDL: 'MDL', BYN: 'BYN', UAH: 'UAH', TRY: 'TRY', GEL: 'GEL', AMD: 'AMD', AZN: 'AZN', SYP: 'SYP', LBP: 'LBP', ILS: 'ILS', JOD: 'JOD', EGP: 'EGP', LYD: 'LYD', MAD: 'MAD', DZD: 'DZD', TND: 'TND', XOF: 'XOF', MRU: 'MRU', GMD: 'GMD', CVE: 'CVE', GNF: 'GNF', SLE: 'SLE', LRD: 'LRD', GHS: 'GHS', XAF: 'XAF', NGN: 'NGN', SDG: 'SDG', SSP: 'SSP', ERN: 'ERN', ETB: 'ETB', DJF: 'DJF', SOS: 'SOS', KES: 'KES', UGX: 'UGX', TZS: 'TZS', RWF: 'RWF', BIF: 'BIF', CDF: 'CDF', STN: 'STN', AOA: 'AOA', ZMW: 'ZMW', MWK: 'MWK', MZN: 'MZN', ZWG: 'ZWG', BWP: 'BWP', NAD: 'NAD', ZAR: 'ZAR', SZL: 'SZL', LSL: 'LSL', KMF: 'KMF', MGA: 'MGA', MUR: 'MUR', SCR: 'SCR', SHP: 'SHP', RUB: 'RUB', SAR: 'SAR', AED: 'AED', QAR: 'QAR', BHD: 'BHD', OMR: 'OMR', KWD: 'KWD', IQD: 'IQD', IRR: 'IRR', YER: 'YER', AFN: 'AFN', KZT: 'KZT', KGS: 'KGS', UZS: 'UZS', TJS: 'TJS', TMT: 'TMT', BDT: 'BDT', BTN: 'BTN', INR: 'INR', MVR: 'MVR', NPR: 'NPR', PKR: 'PKR', LKR: 'LKR', USD: 'USD', CNY: 'CNY', HKD: 'HKD', MOP: 'MOP', KPW: 'KPW', KRW: 'KRW', JPY: 'JPY', MNT: 'MNT', TWD: 'TWD', BND: 'BND', KHR: 'KHR', IDR: 'IDR', LAK: 'LAK', MYR: 'MYR', MMK: 'MMK', PHP: 'PHP', SGD: 'SGD', THB: 'THB', VND: 'VND', AUD: 'AUD', NZD: 'NZD', PGK: 'PGK', SBD: 'SBD', VUV: 'VUV', FJD: 'FJD', WST: 'WST', TOP: 'TOP', CAD: 'CAD', MXN: 'MXN', BMD: 'BMD', GTQ: 'GTQ', BZD: 'BZD', HNL: 'HNL', NIO: 'NIO', CRC: 'CRC', PAB: 'PAB', CUP: 'CUP', JMD: 'JMD', HTG: 'HTG', DOP: 'DOP', BSD: 'BSD', XCD: 'XCD', BBD: 'BBD', TTD: 'TTD', KYD: 'KYD', AWG: 'AWG', XCG: 'XCG', COP: 'COP', VES: 'VES', GYD: 'GYD', SRD: 'SRD', PEN: 'PEN', BOB: 'BOB', BRL: 'BRL', PYG: 'PYG', UYU: 'UYU', ARS: 'ARS', CLP: 'CLP', FKP: 'FKP' };
  // Vrai symbole/abréviation d'usage courant de chaque devise — UNIQUEMENT pour l'affichage du
  // sélecteur de devise (bouton + liste, voir plus bas "SÉLECTEUR DE DEVISE"), jamais pour le
  // montant affiché dans le formulaire (CURRENCY_SYMBOL ci-dessus, volontairement resté au code ISO
  // pour éviter l'ambiguïté GBP/Guernesey-Jersey déjà documentée). Quatre devises partagent le même
  // symbole "kr" (DKK/NOK/SEK/ISK, chacune sa propre couronne nationale — l'islandaise rejoint le
  // groupe avec ce passage) : jamais affiché seul dans le sélecteur, toujours accompagné du code
  // (voir renderCurrencyList/renderCurrencyButton) pour rester non ambigu malgré le symbole commun.
  // GIP : même glyphe que GBP ("£", livre de Gibraltar imprimée avec le même symbole). MDL : "L"
  // comme ALL (le leu moldave, comme le lek albanais, s'abrège en une simple lettre plutôt qu'un
  // symbole dédié — jamais affiché seul dans le sélecteur, voir le commentaire au-dessus de
  // CURRENCY_GLYPH). BYN : "Br", le symbole latin adopté par la Banque nationale de Biélorussie en
  // 2005 (concours officiel). Un symbole graphique de remplacement (un "Б" cyrillique stylisé, à la
  // manière du signe rouble russe "₽") a bien été retenu par un nouveau concours officiel en janvier
  // 2026, mais un symbole de monnaie tout juste adopté met en pratique plusieurs années à obtenir un
  // point de code Unicode propre (le "₽" russe, adopté en 2013, n'a été normalisé qu'en 2014) :
  // l'utiliser maintenant afficherait très probablement un caractère manquant plutôt que le symbole
  // voulu — même risque de rendu déjà rencontré et évité une fois dans ce projet (voir LANG_FLAGS
  // dans i18n.js, l'abandon des émojis drapeau pour cette même raison). "Br", encore officiellement
  // en usage, reste le choix fiable. UAH : "₴" (signe monétaire dédié de la hryvnia, U+20B4, normalisé
  // de longue date et largement pris en charge) — contrairement à "kr"/"L"/"Br" ci-dessus, un vrai
  // symbole comme "€"/"£" plutôt qu'une abréviation.
  // TRY : "₺" (signe de la livre turque, U+20BA) — contrairement au "Б" biélorusse tout juste
  // choisi en 2026 (voir plus haut), un symbole ADOPTÉ EN 2012 et normalisé Unicode depuis (v6.2,
  // la même année) : plus de dix ans de recul, largement pris en charge par toutes les polices
  // système courantes, aucun risque de caractère manquant comparable.
  // GEL (lari géorgien) : vrai symbole "₾" utilisable sans risque — adopté par la Banque nationale de
  // Géorgie en 2014, normalisé Unicode dès 2015 (Unicode 8.0), plus de dix ans d'ancienneté.
  // AMD (dram arménien) : vrai symbole "֏" (U+058F ARMENIAN DRAM SIGN), normalisé Unicode 6.1 (2012)
  // — plus de dix ans d'ancienneté, même palier de confiance que "₾"/"₺" ci-dessus.
  // AZN (manat azerbaïdjanais) : vrai symbole "₼" (U+20BC MANAT SIGN), adopté par la Banque centrale
  // d'Azerbaïdjan en 2006, normalisé Unicode 7.0 (2014) — aucune ambiguïté avec le manat turkmène
  // (celui-ci n'a pas de code Unicode dédié, généralement abrégé "m"/"T").
  // SYP (livre syrienne) : AUCUN symbole Unicode dédié n'existe pour cette devise — abrégée "LS"/"SP"
  // en lettres latines ou "ل.س" en arabe selon les sources, sans forme unique qui domine. Le glyphe
  // arabe "ل.س" est retenu ici (même logique que "дин."/"ден" pour le dinar serbe/le denar
  // macédonien plus haut : l'abréviation réellement utilisée dans le script national du pays plutôt
  // qu'une romanisation).
  // LBP (livre libanaise) : aucun symbole Unicode dédié — abrégée "LL" en lettres latines (même
  // logique que "дин."/"ден"/"ل.س" plus haut : l'abréviation réellement utilisée localement, ici la
  // forme latine plutôt qu'arabe, "LL" étant la plus répandue dans l'usage commercial courant d'après
  // la presse libanaise elle-même).
  // ILS (nouveau shekel israélien) : vrai symbole dédié "₪" (U+20AA NEW SHEQEL SIGN), normalisé
  // Unicode dès la version 1.1 (juin 1993) — aussi ancien que le symbole dollar, aucun risque de
  // rendu manquant comparable au "Б" biélorusse tout juste choisi en 2026 plus haut.
  // JOD (dinar jordanien) : aucun symbole Unicode dédié — abrégée "JD" en lettres latines, de très
  // loin la forme la plus utilisée dans l'usage commercial courant (non officielle mais dominante).
  // EGP (livre égyptienne) : aucun symbole Unicode dédié — abrégée "LE" en lettres latines (de
  // "livre égyptienne", héritage du français comme "LL" pour le Liban), également courante avec "E£".
  // LYD (dinar libyen) : aucun symbole Unicode dédié — abrégée "ل.د" en arabe (pas de forme latine
  // qui domine clairement d'après les sources consultées, contrairement à JOD/EGP/LBP ci-dessus).
  // Lot Sahel / Corne. XAF : "F CFA", même abréviation que XOF — deux francs CFA distincts (BEAC et
  // BCEAO) mais même parité et même nom d'usage ; le code affiché à côté les distingue. NGN : vrai
  // symbole "₦" (U+20A6 NAIRA SIGN, Unicode 1.1, 1993). ETB : "Br", abréviation du birr — même
  // lettres que BYN, toujours affichée avec son code. SDG "ج.س." et ERN "Nfk" : abréviations
  // réellement utilisées localement, aucun symbole Unicode dédié. DJF "Fdj" et SOS "Sh.So." : idem.
  // SSP : aucune abréviation ne domine ("SSP" ou "SS£" selon les sources) — le code ISO, comme CVE.
  // Lot Afrique orientale, centrale et australe / océan Indien : AUCUNE de ces vingt et une devises
  // n'a de point de code Unicode dédié — abréviations réellement en usage : KSh, USh, TSh (shillings
  // kényan, ougandais, tanzanien), FRw et FBu (francs rwandais et burundais), FC (franc congolais),
  // Db (dobra), Kz (kwanza), K et MK (kwachas zambien et malawite), MT (metical), ZiG (Zimbabwe
  // Gold), P (pula), N$ (dollar namibien), R (rand), E (lilangeni), L (loti, pluriel maloti « M »),
  // CF (franc comorien), Ar (ariary), Rs (roupie mauricienne) et SR (roupie seychelloise). Plusieurs
  // lettres isolées (K, L, E, P, R) sont ambiguës seules : toujours affichées avec leur code.
  // Péninsule Arabique, Irak, Iran : abréviations arabes en usage (ر.س, د.إ, ر.ق, د.ب, ر.ع., د.ك, د.ع, ر.ي)
  // et signe du rial (﷼, U+FDFC) pour l'Iran. Les nouveaux signes dédiés du riyal saoudien (U+20C1,
  // Unicode 17.0, septembre 2025) et du dirham émirien (U+20C3, Unicode 18.0, septembre 2026) ne sont PAS
  // utilisés : encore absents de la plupart des polices système, ils s'afficheraient en carré vide — même
  // raisonnement que pour le nouveau symbole du rouble biélorusse plus haut.
  var CURRENCY_GLYPH = { EUR: '€', CHF: 'Fr.', GBP: '£', CZK: 'Kč', PLN: 'zł', HUF: 'Ft', BAM: 'KM', DKK: 'kr', NOK: 'kr', SEK: 'kr', ALL: 'L', RSD: 'дин.', MKD: 'ден', RON: 'lei', ISK: 'kr', GIP: '£', MDL: 'L', BYN: 'Br', UAH: '₴', TRY: '₺', GEL: '₾', AMD: '֏', AZN: '₼', SYP: 'ل.س', LBP: 'LL', ILS: '₪', JOD: 'JD', EGP: 'LE', LYD: 'ل.د', MAD: 'د.م.', DZD: 'د.ج', TND: 'د.ت', XOF: 'F CFA', MRU: 'UM', GMD: 'D', CVE: 'CVE', GNF: 'FG', SLE: 'Le', LRD: 'L$', GHS: '₵', XAF: 'F CFA', NGN: '₦', SDG: 'ج.س.', SSP: 'SSP', ERN: 'Nfk', ETB: 'Br', DJF: 'Fdj', SOS: 'Sh.So.', KES: 'KSh', UGX: 'USh', TZS: 'TSh', RWF: 'FRw', BIF: 'FBu', CDF: 'FC', STN: 'Db', AOA: 'Kz', ZMW: 'K', MWK: 'MK', MZN: 'MT', ZWG: 'ZiG', BWP: 'P', NAD: 'N$', ZAR: 'R', SZL: 'E', LSL: 'L', KMF: 'CF', MGA: 'Ar', MUR: 'Rs', SCR: 'SR', SHP: '£', RUB: '₽', SAR: 'ر.س', AED: 'د.إ', QAR: 'ر.ق', BHD: 'د.ب', OMR: 'ر.ع.', KWD: 'د.ك', IQD: 'د.ع', IRR: '﷼', YER: 'ر.ي', AFN: '؋', KZT: '₸', KGS: 'сом', UZS: 'soʻm', TJS: 'ЅМ', TMT: 'm', BDT: '৳', BTN: 'Nu.', INR: '₹', MVR: 'Rf', NPR: 'रू', PKR: 'Rs', LKR: 'රු', USD: 'US$', CNY: '¥', HKD: 'HK$', MOP: 'MOP$', KPW: '₩', KRW: '₩', JPY: '¥', MNT: '₮', TWD: 'NT$', BND: 'B$', KHR: '៛', IDR: 'Rp', LAK: '₭', MYR: 'RM', MMK: 'K', PHP: '₱', SGD: 'S$', THB: '฿', VND: '₫', AUD: 'A$', NZD: 'NZ$', PGK: 'K', SBD: 'SI$', VUV: 'VT', FJD: 'FJ$', WST: 'WS$', TOP: 'T$', CAD: 'C$', MXN: 'MX$', BMD: 'BD$', GTQ: 'Q', BZD: 'BZ$', HNL: 'L', NIO: 'C$ (NIO)', CRC: '₡', PAB: 'B/.', CUP: '$MN', JMD: 'J$', HTG: 'G', DOP: 'RD$', BSD: 'B$', XCD: 'EC$', BBD: 'Bds$', TTD: 'TT$', KYD: 'CI$', AWG: 'Afl.', XCG: 'Cg', COP: 'COL$', VES: 'Bs.', GYD: 'G$', SRD: 'Sr$', PEN: 'S/', BOB: 'Bs', BRL: 'R$', PYG: '₲', UYU: '$U', ARS: 'AR$', CLP: 'CLP$', FKP: 'FK£' };
  // Devise choisie MANUELLEMENT par le visiteur (sélecteur de devise dans l'en-tête, voir plus bas
  // "SÉLECTEUR DE DEVISE") — null tant qu'il n'a rien choisi, ce qui laisse `countryCurrency`
  // continuer à suivre le pays de chaque commune comme avant (voir son commentaire juste après :
  // "chaque étape du séjour utilisera ensuite sa propre devise"). Un choix explicite FIGE au
  // contraire une seule devise pour tout le site, quelle que soit l'étape affichée — même logique
  // "réglage global mémorisé" que la langue (STORAGE_KEY 'lang' dans i18n.js) ou le thème
  // (STORAGE_KEY 'theme' dans theme.js), jamais lue/écrite ailleurs que via ces deux fonctions.
  var CURRENCY_STORAGE_KEY = 'currency';
  // Choix de la page en cours, indépendant du stockage (10e audit du 18/09/2026) : sans localStorage (navigation privée
  // stricte, stockage bloqué), le sélecteur de devise n'avait aucun effet, alors que la langue et le thème s'appliquent
  // quand même à la page. undefined = rien choisi pendant cette visite (on lit alors la valeur mémorisée).
  var sessionCurrency;
  // Devise proposée seulement si trip-data.js sait y convertir le plafond d'hébergement (11e audit du 19/09/2026 : le
  // sélecteur listait des devises vers lesquelles rien n'était converti). Lu dans TripData au chargement, jamais une liste
  // en dur : on demande à lodgingPriceCap un plafond dans cette devise pour un pays de la zone euro et on regarde si c'est
  // bien elle qui revient. Depuis l'extension des taux (lodgingPriceCap.rateSources), toutes les devises le sont.
  function isConvertibleCurrency(code){
    if(code === 'EUR') return true;
    try { var r = TripData.lodgingPriceCap('FR', 'moyen', code); return !!r && r.currency === code; } catch(e){ return false; }
  }
  function isKnownCurrency(v){
    // hasOwnProperty : une valeur stockée comme « constructor » ne doit pas passer pour une devise.
    return !!v && /^[A-Z]{3}$/.test(v) && CURRENCY_OPTIONS.indexOf(v) !== -1;
  }
  function getPreferredCurrency(){
    if(sessionCurrency !== undefined) return sessionCurrency;
    try {
      var v = localStorage.getItem(CURRENCY_STORAGE_KEY);
      return isKnownCurrency(v) ? v : null;
    } catch(e){ return null; } // stockage indisponible (navigation privée stricte...) : reste en auto
  }
  function setPreferredCurrency(code){
    sessionCurrency = isKnownCurrency(code) ? code : null;
    try {
      if(sessionCurrency) localStorage.setItem(CURRENCY_STORAGE_KEY, sessionCurrency);
      else localStorage.removeItem(CURRENCY_STORAGE_KEY);
    } catch(e){ /* pas grave : le choix s'applique pour cette page (sessionCurrency), juste pas mémorisé */ }
  }
  // Montants de péage et de ferry : toujours en euros (barèmes publiés en euros), quelle que soit la devise choisie.
  // vignette (CH/AT/CZ/SK) : URL de la BOUTIQUE OFFICIELLE de la vignette autoroutière du pays —
  // via.admin.ch (portail officiel de l'Office fédéral de la douane et de la sécurité des frontières,
  // pas un revendeur tiers) pour la Suisse, shop.asfinag.at (société publique gestionnaire des
  // autoroutes autrichiennes) pour l'Autriche, edalnice.gov.cz (portail .gov.cz du SFDI — Fonds
  // d'Etat pour les infrastructures de transport, seul émetteur officiel) pour la République
  // tchèque, eznamka.sk (Národná diaľničná spoločnosť/NDS, seul canal de vente officiel affiché sur
  // le site lui-même) pour la Slovaquie, ematrica.nemzetiutdij.hu (portail d'Etat de NÚSZ Zrt. —
  // Nemzeti Útdíjfizetési Szolgáltató, "Service national de péage" — PAS e-autopalyamatrica.hu,
  // domaine à l'apparence officielle mais en réalité exploité par une société privée tierce,
  // Biorobotok Informatikai és Adatfeldolgozási Kft., un revendeur écarté ici) pour la Hongrie,
  // evinjeta.dars.si (portail officiel de DARS, société publique gestionnaire du réseau autoroutier
  // slovène) pour la Slovénie. Utilisé par renderDays pour afficher un petit rappel la première fois
  // qu'un pays à vignette apparaît dans l'itinéraire — voir plus bas.
  function countryCurrency(cc){
    var pref = getPreferredCurrency();
    if(pref) return pref;
    return (COUNTRIES[cc] && COUNTRIES[cc].currency) || 'EUR';
  }
  // Plafond de prix / nuit d'un logement : celui du PAYS de l'étape (TripData.lodgingPriceCap, partagé avec le moteur),
  // converti dans la devise choisie (ou laissé dans celle du pays en mode automatique). Sert à l'indication de budget.
  function lodgingCap(cc, budgetKey){
    return TripData.lodgingPriceCap(cc, budgetKey, getPreferredCurrency());
  }
  // Plafond utilisé dans les LIENS Airbnb/Booking : même règle que le moteur (buildLodgingLinks, lib/trip-engine.js) —
  // devise choisie si les plateformes l'acceptent (TripData.LODGING_LINK_CURRENCIES), sinon celle du pays de l'étape si elle
  // y figure, sinon l'euro.
  function linkLodgingCap(cc, budgetKey){
    var ok = TripData.LODGING_LINK_CURRENCIES || ['EUR'];
    var cap = lodgingCap(cc, budgetKey);
    if(ok.indexOf(cap.currency) < 0){
      var local = TripData.lodgingPriceCap(cc, budgetKey, null);
      cap = ok.indexOf(local.currency) >= 0 ? local : TripData.lodgingPriceCap(cc, budgetKey, 'EUR');
    }
    return cap;
  }
  // Liste des devises à proposer dans le sélecteur — RECONSTRUITE depuis COUNTRIES plutôt que
  // recopiée à la main (voir la demande d'origine, "en prenant en compte celles des pays déjà
  // renseignées") : ajouter un pays avec une nouvelle devise (COUNTRIES[cc].currency) suffit à le
  // faire apparaître ici automatiquement, aucune liste séparée à tenir à jour en double. EUR forcé
  // en tête (implicite pour la plupart des pays, jamais explicitement présent dans COUNTRIES sous
  // forme de `currency:'EUR'`, sinon absent de cette liste faute d'apparaître littéralement dans un
  // champ `currency`). Toutes les devises dans l'ordre alphabétique du code ISO ; l'ordre affiché
  // (« Automatique », puis la devise du pays de la langue d'interface, puis les autres) est calculé
  // à l'ouverture du panneau (voir renderCurrencyList), la langue pouvant changer entre-temps.
  // Seules les devises convertibles sont retenues (voir isConvertibleCurrency).
  var CURRENCY_OPTIONS = (function(){
    var set = { EUR: true };
    COUNTRY_LIST.forEach(function(cc){ set[COUNTRIES[cc].currency || 'EUR'] = true; });
    var rates = TripData.ECB_EUR_RATES && TripData.ECB_EUR_RATES.rates;
    if(rates) Object.keys(rates).forEach(function(code){ if(/^[A-Z]{3}$/.test(code)) set[code] = true; });
    return Object.keys(set).filter(isConvertibleCurrency).sort();
  })();
  // Devise du pays associé à la langue d'interface (I18N.country : de -> DE -> EUR, ja -> JP -> JPY…) ; EUR à défaut.
  function languageCurrency(){
    var cc = window.I18N.country ? window.I18N.country() : '';
    var cur = (cc && COUNTRIES[cc]) ? (COUNTRIES[cc].currency || 'EUR') : 'EUR';
    return CURRENCY_OPTIONS.indexOf(cur) !== -1 ? cur : 'EUR';
  }

  // Langue Wikipédia utilisée pour les photos/articles d'un lieu (voir /api/photo côté serveur) :
  // celle choisie par le visiteur pour l'INTERFACE (voir js/i18n.js — détectée depuis son
  // navigateur au premier chargement, mémorisée ensuite) — une commune espagnole affiche donc son
  // article en espagnol pour un visiteur ayant choisi l'espagnol, en français pour un visiteur en
  // français, etc. Tenue à jour à chaque changement de langue (voir l'écouteur 'i18n:langchange'
  // plus bas) : les prochaines recherches de photo utilisent alors tout de suite la nouvelle langue.
  var t = window.I18N.t, tl = window.I18N.tl;
  var VISITOR_LANG = window.I18N.current();

  /* ---------- SÉLECTEUR DE DEVISE ---------- */
  // Même construction que le sélecteur de langue juste à côté dans l'en-tête (voir js/i18n.js,
  // "SÉLECTEUR DE LANGUE") : un bouton ouvre un petit panneau listant les options, ici sans champ de
  // recherche (une douzaine d'entrées au lieu de 51 langues, une liste directe suffit). Vit dans
  // app.js plutôt que i18n.js : la liste des devises et leur logique (COUNTRIES, CURRENCY_SYMBOL,
  // countryCurrency, BUDGET_PRICE_MAX) sont toutes déjà ici, pas dans le module de traduction —
  // seuls les DEUX libellés affichés (currency.buttonLabel, currency.auto) viennent de i18n.js,
  // comme n'importe quel autre texte d'interface. Construit ICI, AVANT le chargement des communes
  // (voir le bloc `await Promise.all(...)` juste plus bas) plutôt qu'après : ce bouton ne dépend
  // d'aucune donnée chargée en réseau (juste COUNTRIES/CURRENCY_SYMBOL/CURRENCY_GLYPH, déjà en
  // mémoire) — le construire seulement après ce fetch le faisait apparaître avec un temps de retard
  // visible à chaque chargement de page (signalé par l'utilisateur), alors que le sélecteur de
  // langue juste à côté (indépendant, construit par i18n.js) apparaît lui immédiatement.
  var currencySwitcherRoot = null, currencyPanelEl = null, currencyListEl = null, currencyButtonEl = null;
  var currencyTypeBuf = '', currencyTypeAt = 0; // recherche au clavier (voir currencyTypeAheadIndex)

  function renderCurrencyButton(){
    if(!currencyButtonEl) return;
    var pref = getPreferredCurrency();
    // "AUTO" tant qu'aucune devise n'est figée (aucun symbole unique ne le représenterait — la
    // devise varie d'une étape à l'autre) ; sinon CODE + symbole réel (voir CURRENCY_GLYPH), le code
    // toujours présent pour lever l'ambiguïté des trois "kr" (DKK/NOK/SEK, voir son commentaire).
    // « Auto » traduit (clé du bouton de thème, même sens, déjà courte dans les 161 langues) — l'ancien 'AUTO' en dur.
    // Sens d'écriture forcé de gauche à droite pour un CODE de devise, comme pour les options de la liste (19e audit
    // du 21/09/2026). Le 19e audit n'avait corrigé QUE les options : le BOUTON, qui affiche en permanence la devise
    // choisie, gardait le sens de la page. Mesuré sur les 152 devises des pays couverts, 84 étiquettes se
    // réordonnent dans une page de droite à gauche — « ARS AR$ » s'y affichait « $ARS AR », « AUD A$ » « $AUD A »,
    // « AWG Afl. » « .AWG Afl » (20e audit du 21/09/2026). « Auto », lui, est traduit : il suit la page.
    var codeEl = currencyButtonEl.querySelector('.currency-toggle-code');
    if(pref) codeEl.setAttribute('dir', 'ltr'); else codeEl.removeAttribute('dir');
    codeEl.textContent = pref ? pref + ' ' + (CURRENCY_GLYPH[pref] || '') : t('theme.auto');
  }
  // returnFocus : rend le focus au bouton (fermeture au clavier ou après un choix), pas lors d'un clic ailleurs.
  function closeCurrencyPanel(returnFocus){
    // Tampon de frappe remis à zéro (19e audit du 21/09/2026) : il survivait à la fermeture, si bien que taper « u »,
    // fermer, rouvrir et taper « s » dans la seconde menait sur USD au lieu de la première devise en S.
    currencyTypeBuf = '';
    currencyTypeAt = 0;
    var wasOpen = currencyPanelEl && currencyPanelEl.classList.contains('show');
    if(currencyPanelEl) currencyPanelEl.classList.remove('show');
    if(currencyButtonEl) currencyButtonEl.setAttribute('aria-expanded', 'false');
    if(wasOpen && returnFocus === true && currencyButtonEl) currencyButtonEl.focus();
  }
  function currencyOptions(){ return currencyListEl ? Array.prototype.slice.call(currencyListEl.querySelectorAll('.currency-option')) : []; }
  // RECHERCHE AU CLAVIER (18e audit du 21/09/2026). Le sélecteur de devise aligne 153 options ; le sélecteur de langue,
  // qui en a 161, a un champ de recherche, mais celui-ci n'avait que les flèches : atteindre « ZAR » demandait 150
  // appuis sur Flèche bas. Taper « z », « a », « r » y mène directement, comme dans toute liste déroulante du système.
  // Règles usuelles d'une listbox : les frappes s'accumulent tant qu'elles s'enchaînent (une seconde), une lettre seule
  // répétée fait défiler les options qui commencent par elle, la recherche repart du début de la liste si la fin ne
  // donne rien. Rendue pure (libellés, position, tampon) pour être vérifiable sans navigateur — voir tests/ui.test.js.
  function currencyTypeAheadIndex(labels, from, buffer){
    if(!buffer) return -1;
    var b = buffer.toLowerCase();
    // Une seule lettre : on part de l'option SUIVANTE pour faire défiler les homonymes ; plusieurs lettres : on repart
    // de l'option courante, que la frappe précédente vient peut-être de désigner.
    var début = b.length === 1 ? from + 1 : from;
    for(var i = 0; i < labels.length; i++){
      var j = (début + i % labels.length + labels.length) % labels.length;
      if(String(labels[j] || '').toLowerCase().indexOf(b) === 0) return j;
    }
    return -1;
  }
  function focusCurrencyOption(idx){
    var opts = currencyOptions();
    if(opts.length) opts[Math.max(0, Math.min(opts.length - 1, idx))].focus();
  }
  function openCurrencyPanel(){
    if(!currencyPanelEl) return;
    currencyPanelEl.classList.add('show');
    currencyButtonEl.setAttribute('aria-expanded', 'true');
    renderCurrencyList();
    // Focus sur l'option active (ou la première) : la liste se parcourt ensuite aux flèches.
    var opts = currencyOptions();
    var activeIdx = opts.findIndex(function(o){ return o.classList.contains('active'); });
    focusCurrencyOption(activeIdx < 0 ? 0 : activeIdx);
  }
  function chooseCurrency(value){
    setPreferredCurrency(value);
    renderCurrencyButton();
    applyCurrencyPanelTexts();
    updateBudgetHint();
    rerenderCurrentTrip();
    closeCurrencyPanel(true);
  }
  function renderCurrencyList(){
    var pref = getPreferredCurrency();
    currencyListEl.innerHTML = '';
    function addOption(value, label){
      var li = document.createElement('li');
      li.className = 'currency-option' + (value === pref ? ' active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', value === pref ? 'true' : 'false');
      li.setAttribute('tabindex', '-1');
      // Sens d'écriture forcé de gauche à droite pour un CODE de devise (19e audit du 21/09/2026). « ARS AR$ »
      // s'affichait « $ARS AR » dans une page en arabe, en hébreu ou en persan : le symbole final est un caractère
      // neutre, il prenait la direction du paragraphe. Toutes les devises à symbole terminal étaient touchées.
      // « Automatique », lui, est traduit : il suit la page.
      if(value) li.setAttribute('dir', 'ltr');
      li.textContent = label;
      li.addEventListener('mousedown', function(e){ e.preventDefault(); });
      li.addEventListener('click', function(){ chooseCurrency(value); });
      li.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); chooseCurrency(value); }
      });
      currencyListEl.appendChild(li);
    }
    // « Automatique » (par défaut : devise du pays de chaque étape), puis la devise du pays de la langue d'interface,
    // puis toutes les autres par ordre alphabétique.
    addOption(null, t('currency.auto'));
    var first = languageCurrency();
    [first].concat(CURRENCY_OPTIONS.filter(function(c){ return c !== first; })).forEach(function(code){
      var glyph = CURRENCY_GLYPH[code];
      addOption(code, glyph ? code + ' ' + glyph : code);
    });
  }
  function buildCurrencySwitcher(){
    currencySwitcherRoot = document.getElementById('currency-switcher');
    if(!currencySwitcherRoot) return; // page sans sélecteur (mentions légales/confidentialité)

    currencyButtonEl = document.createElement('button');
    currencyButtonEl.type = 'button';
    currencyButtonEl.className = 'currency-toggle-btn';
    // Sémantique ARIA (17e audit du 20/09/2026, même correction qu'au 17e pour le sélecteur de langue — voir le
    // commentaire devant buildSwitcher dans js/i18n.js) : le bouton annonçait aria-haspopup="listbox" alors que le
    // panneau portait role="dialog". Deux motifs pour un seul composant : un lecteur d'écran annonçait « dialogue »,
    // puis « liste ». L'ensemble est ramené au SEUL motif réellement implémenté — bouton → liste d'options à focus
    // glissant :
    //   - le bouton garde aria-haspopup="listbox" et désigne la liste par aria-controls ;
    //   - le panneau n'est plus qu'un conteneur de mise en page, sans rôle (display:none quand il est fermé : rien
    //     n'en sort dans l'arbre d'accessibilité), et donc sans aria-label — personne n'annonce celui d'un <div>
    //     sans rôle ;
    //   - la liste porte role="listbox" et le nom accessible du composant (voir applyCurrencyPanelTexts), les
    //     options role="option".
    // Pas de champ de recherche ici (une trentaine d'options au plus) : aucun role="combobox" à retirer.
    // Aucun changement de comportement : mêmes classes, mêmes écouteurs, même navigation au clavier.
    currencyButtonEl.setAttribute('aria-haspopup', 'listbox');
    currencyButtonEl.setAttribute('aria-expanded', 'false');
    currencyButtonEl.innerHTML =
      '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="9"/><path d="M9 15.5c0 1 1.2 1.8 3 1.8s3-.8 3-1.8-1.2-1.5-3-1.8-3-1-3-1.8 1.2-1.7 3-1.7 3 .7 3 1.7"/>' +
        '<path d="M12 6.7V6M12 18v-.7"/>' +
      '</svg>' +
      '<span class="currency-toggle-code"></span>';

    currencyPanelEl = document.createElement('div');
    currencyPanelEl.className = 'currency-panel';

    currencyListEl = document.createElement('ul');
    currencyListEl.className = 'currency-option-list';
    currencyListEl.id = 'currency-option-list';
    currencyListEl.setAttribute('role', 'listbox');
    currencyButtonEl.setAttribute('aria-controls', currencyListEl.id);

    currencyPanelEl.appendChild(currencyListEl);
    currencySwitcherRoot.appendChild(currencyButtonEl);
    currencySwitcherRoot.appendChild(currencyPanelEl);

    currencyButtonEl.addEventListener('click', function(){
      if(currencyPanelEl.classList.contains('show')) closeCurrencyPanel(); else openCurrencyPanel();
    });
    document.addEventListener('click', function(e){
      if(!currencySwitcherRoot.contains(e.target)) closeCurrencyPanel();
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && currencyPanelEl.classList.contains('show')){ closeCurrencyPanel(true); }
    });
    // Flèches haut/bas, Début/Fin dans la liste ; flèche bas sur le bouton fermé : ouvre la liste.
    currencyListEl.addEventListener('keydown', function(e){
      var opts = currencyOptions();
      var idx = opts.indexOf(document.activeElement);
      if(idx < 0) return;
      if(e.key === 'ArrowDown'){ e.preventDefault(); focusCurrencyOption(idx + 1); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); focusCurrencyOption(idx - 1); }
      else if(e.key === 'Home'){ e.preventDefault(); focusCurrencyOption(0); }
      else if(e.key === 'End'){ e.preventDefault(); focusCurrencyOption(opts.length - 1); }
      else if(e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.trim()){
        // Espace exclu (e.key.trim()) : l'option s'en sert déjà pour valider le choix.
        var maintenant = Date.now();
        if(maintenant - currencyTypeAt > 1000) currencyTypeBuf = '';
        currencyTypeAt = maintenant;
        currencyTypeBuf += e.key;
        var étiquettes = opts.map(function(o){ return o.textContent; });
        var cible = currencyTypeAheadIndex(étiquettes, idx, currencyTypeBuf);
        // Tampon qui ne correspond plus à rien : on repart de la DERNIÈRE frappe, comme le font les listes du
        // système (19e audit du 21/09/2026). Deux défauts d'un coup : taper « j » puis « c » cherchait « jc » et ne
        // menait nulle part ; et une lettre RÉPÉTÉE donnait « cc », qui ne préfixe rien — la liste ne bougeait pas,
        // alors que le commentaire et le message de commit de la 18e passe promettaient qu'elle fasse défiler.
        if(cible < 0 && currencyTypeBuf.length > 1){
          currencyTypeBuf = e.key;
          cible = currencyTypeAheadIndex(étiquettes, idx, currencyTypeBuf);
        }
        if(cible >= 0){ e.preventDefault(); focusCurrencyOption(cible); }
      }
    });
    currencyButtonEl.addEventListener('keydown', function(e){
      if(e.key === 'ArrowDown' && !currencyPanelEl.classList.contains('show')){ e.preventDefault(); openCurrencyPanel(); }
    });
    // Tabulation hors du panneau : il se referme, comme au clic ailleurs.
    currencyPanelEl.addEventListener('focusout', function(e){
      if(e.relatedTarget && !currencySwitcherRoot.contains(e.relatedTarget)) closeCurrencyPanel();
    });

    renderCurrencyButton();
  }
  function applyCurrencyPanelTexts(){
    if(!currencyButtonEl) return;
    var full = t('currency.buttonLabel') + ' — ' + (getPreferredCurrency() || t('currency.auto'));
    currencyButtonEl.setAttribute('aria-label', full);
    currencyButtonEl.title = full;
    // Nom accessible du composant : porté par la LISTE depuis le 17e audit du 20/09/2026, le panneau n'ayant plus de
    // rôle (il le portait depuis le 10e audit, quand il était encore un « dialogue »). Puis libellé « Auto » du bouton
    // dans la langue courante.
    if(currencyListEl) currencyListEl.setAttribute('aria-label', t('currency.buttonLabel'));
    renderCurrencyButton();
  }
  buildCurrencySwitcher();
  applyCurrencyPanelTexts();
  window.addEventListener('i18n:langchange', applyCurrencyPanelTexts);

  /* ---------- UNITÉ DE DISTANCE : KILOMÈTRES OU MILES ---------- */
  // 13e audit du 19/09/2026 : le site n'affichait que des kilomètres. Les visiteurs des pays où la signalisation routière
  // donne les distances en miles les voient désormais en miles :
  //   - Royaume-Uni : The Traffic Signs Regulations and General Directions 2016 (SI 2016/362) — distances des panneaux
  //     routiers en miles (et yards) ;
  //   - États-Unis : Manual on Uniform Traffic Control Devices (MUTCD, Federal Highway Administration) — distances de la
  //     signalisation en miles (unités usuelles américaines).
  // Libéria et Birmanie, souvent cités comme non métriques : aucune source officielle solide vérifiée pour leur
  // signalisation routière, ils restent en kilomètres. 1 mile = 1,609344 km EXACTEMENT (accord international sur le yard
  // et la livre de 1959 : 1 yard = 0,9144 m, 1 mile = 1 760 yards).
  // Unité fixée par la LANGUE D'INTERFACE choisie (demande du 19/09/2026, sans sélecteur) : miles quand le pays associé
  // à la langue (I18N.country, d'après son drapeau) est le Royaume-Uni ou les États-Unis — anglais, gallois, gaélique
  // écossais, scots, cornique (drapeaux britanniques), hawaïen (drapeau des États-Unis) ; kilomètres pour toutes les autres.
  // Conséquence assumée : l'anglais (drapeau britannique) est en miles pour tous ses lecteurs, y compris ceux de pays
  // métriques (Australie, Inde, Irlande…) ; l'irlandais (drapeau irlandais) reste en kilomètres. Île de Man, Jersey,
  // Guernesey (manxois, jersiais, guernesiais) : signalisation en miles, mais aucun texte officiel vérifié ici — km.
  // Tout ce qui est affiché suit l'unité (étapes, total, ferry, recharges, randonnées, messages d'erreur, champs du
  // formulaire, textes du PDF) ; les données et le serveur restent en kilomètres : les champs sont convertis en km avant
  // l'envoi. Aucune vitesse n'est affichée. Péage : aucun tarif au kilomètre n'est affiché (seulement des montants par
  // étape) ; la mention « estimation au kilomètre » (toll.estimateNote) décrit les barèmes publiés, qui sont au km, et
  // reste telle quelle.
  var KM_PER_MILE = 1.609344;
  var MILE_COUNTRIES = { GB: true, US: true };
  function unitForLang(code){ return MILE_COUNTRIES[window.I18N.country(code)] ? 'mi' : 'km'; }
  function distanceUnit(){ return unitForLang(VISITOR_LANG); }
  // Conversions : affichage (km -> unité) et saisie (unité -> km, arrondi au dixième, jamais plus précis que le moteur).
  function kmToDistanceUnit(km, unit){ return (unit || distanceUnit()) === 'mi' ? Number(km) / KM_PER_MILE : Number(km); }
  function distanceUnitToKm(v, unit){
    var n = Number(v);
    if((unit || distanceUnit()) !== 'mi') return n;
    return Math.round(n * KM_PER_MILE * 10) / 10;
  }
  // Distance mise en forme dans la langue d'interface : « 213 km », « 132 mi », « 132 миль », « ١٣٢ ميلًا » — modèle
  // unit.kmN / unit.miN de la langue (forme exacte par nombre quand l'unité s'écrit en toutes lettres, I18N.plural),
  // nombre arrondi à l'entier (decimals : 1 pour une randonnée ou une valeur saisie).
  function formatDistanceValue(v, unit, decimals){
    var p = Math.pow(10, decimals || 0);
    var r = Math.round(Number(v) * p) / p;
    if(!isFinite(r)) return '';
    var key = unit === 'mi' ? 'unit.miN' : 'unit.kmN';
    var tpl = (window.I18N.plural && window.I18N.plural(key, r)) || t(key);
    return tpl.replace('{n}', formatNum(r));
  }
  function formatDistance(km, decimals){
    var n = Number(km);
    if(km == null || km === '' || !isFinite(n)) return '';
    var unit = distanceUnit();
    return formatDistanceValue(kmToDistanceUnit(n, unit), unit, decimals);
  }
  // Paramètre {unit} des étiquettes (« km autour du départ », « mi autour du départ »).
  function distanceUnitVars(){ return { unit: t('unit.' + distanceUnit()) }; }
  // Distance d'une randonnée (Visorando : « 12,5 km » ; OpenStreetMap : « 12.3 km ») remise en forme dans l'unité et la
  // langue d'affichage ; tout autre texte est gardé tel quel.
  function hikeDistanceText(raw){
    var m = String(raw == null ? '' : raw).match(/^\s*(\d+(?:[.,]\d+)?)\s*km\s*$/i);
    return m ? formatDistance(parseFloat(m[1].replace(',', '.')), 1) : (raw || '');
  }
  // Durée et difficulté d'une randonnée Visorando (14e audit du 19/09/2026) : le serveur les renvoie telles que la page
  // française les publie (« 5h20 », « 45min », « Moyenne ») et elles restaient en français dans toutes les langues, à
  // l'écran comme dans le PDF. Durée remise en forme par formatDurationMin ; difficulté : les quatre seules valeurs
  // retenues par le serveur (title="Facile|Moyenne|Difficile|Très difficile", voir fetchVisorandoHikes dans server.js)
  // associées à une clé traduite. Toute autre valeur est gardée telle quelle.
  function hikeDurationText(raw){
    var s = String(raw == null ? '' : raw);
    var m = s.match(/^\s*(\d{1,2})\s*h\s*(?:(\d{1,2})\s*(?:min)?)?\s*$/i);
    if(m && (!m[2] || +m[2] < 60)) return formatDurationMin(+m[1] * 60 + (+m[2] || 0));
    m = s.match(/^\s*(\d{1,3})\s*min\s*$/i);
    return m ? formatDurationMin(+m[1]) : s;
  }
  var HIKE_DIFFICULTY_KEYS = { 'Facile': 'hike.difficulty.easy', 'Moyenne': 'hike.difficulty.medium', 'Difficile': 'hike.difficulty.hard', 'Très difficile': 'hike.difficulty.veryHard' };
  function hikeDifficultyText(raw){
    var key = Object.prototype.hasOwnProperty.call(HIKE_DIFFICULTY_KEYS, raw) ? HIKE_DIFFICULTY_KEYS[raw] : null;
    return key ? t(key) : (raw == null ? '' : String(raw));
  }

  // Plus aucune donnée volumineuse n'est chargée ici au démarrage — voir README, section
  // "Recherche et tirage aléatoire côté serveur" : le champ "ville de départ" s'active
  // immédiatement (voir plus bas), la recherche interroge /api/search-city et le tirage
  // /api/generate-trip (voir lib/trip-engine.js côté serveur).

  /* ---------- ICONS ---------- */
  var ICONS = {
    bed:'<path d="M3 18v-7a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v2M3 18v2M3 18h18M13 13h6a2 2 0 0 1 2 2v3M21 18v2M7 11a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"/>',
    spark:'<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z"/>',
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    plug:'<path d="M9 7V3M15 7V3M7 7h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7Z"/><path d="M12 15v3M9 21h6"/>',
    toll:'<path d="M4 21V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v15M20 21V6a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v15"/><path d="M7 12l10-5M4 21h16"/>',
    warn:'<path d="M12 3.5 2.5 20h19L12 3.5Z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    ferry:'<path d="M4 18.5c1.4 1 2.9 1 4.3 0s2.9-1 4.3 0 2.9 1 4.3 0 2.9-1 4.3 0"/><path d="M5.2 18 6.5 11h9L19 18"/><path d="M12 11V4M12 4.5h3.5L13 7.5"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    camera:'<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.3"/>',
    walk:'<path d="M3 19l6-11 4 6 2-3 6 8H3Z"/><circle cx="8" cy="6" r="1.6"/>',
    zoom:'<circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6"/><path d="M21 21l-4.3-4.3"/>',
    close:'<path d="M6 6l12 12M18 6L6 18"/>',
    // Train-auto (Sylt Shuttle) : voiture de chemin de fer sur ses rails.
    train:'<rect x="5" y="4" width="14" height="12" rx="2.5"/><path d="M5 11h14M9 16l-2 4M15 16l2 4M8.5 13.5h.01M15.5 13.5h.01"/>'
  };
  // Icônes décoratives (le texte voisin porte le sens) : masquées aux lecteurs d'écran (12e audit du 19/09/2026).
  function icon(name){return '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ICONS[name]+'</svg>';}

  // Étiquette de locale pour Intl/toLocaleDateString (horloge, dates formatées, nombre d'habitants...) :
  // calculée par i18n.js pour la langue d'interface (voir I18N.localeTag). Avant septembre 2026, une table
  // de 15 langues seulement ici — les 146 autres affichaient leurs dates en français.
  function localeTag(){ return window.I18N.localeTag(VISITOR_LANG); }
  // Suffixe de clé i18n depuis une clé TRANSPORT à tirets ("voiture-thermique" -> "voitureThermique") —
  // évite de dupliquer les six libellés dans une structure séparée juste pour la casse.
  function camelFromDash(key){
    return key.replace(/-([a-z])/g, function(_, c){ return c.toUpperCase(); });
  }
  function transportLabel(key){ return t('transport.' + camelFromDash(key) + '.label'); }
  function transportPackExtra(key){ return tl('pack.' + camelFromDash(key)); }
  function budgetLabel(key){ return t('form.budget.' + key); }
  // Types de POI connus (voir POI_TYPE_LABEL plus bas, remplacé par une résolution i18n à la
  // volée) — sert seulement à savoir si un type a une vraie traduction ou doit retomber sur le
  // libellé générique ("curiosité locale").
  var KNOWN_POI_TYPES = {
    attraction:1, museum:1, viewpoint:1, castle:1, gallery:1, zoo:1, theme_park:1, monument:1,
    memorial:1, archaeological_site:1, cave_entrance:1, ruins:1, fort:1, citadel:1, manor:1,
    chapel:1, place_of_worship:1, nature_reserve:1, peak:1, waterfall:1, beach:1, artwork:1
  };
  function poiTypeLabel(type){ return (type && KNOWN_POI_TYPES[type]) ? t('poiType.' + type) : t('poiType.fallback'); }

  /* ---------- POP-UP PHOTO (agrandissement en qualité maximale) ---------- */
  // Une seule popup réutilisée pour toutes les images cliquables (tuile principale + activités) :
  // on y affiche l'image en résolution d'origine renvoyée par Wikipédia (imageFull), pas la
  // vignette utilisée dans les tuiles.
  var lightboxEl = null;
  var lightboxOpener = null; // élément qui avait le focus à l'ouverture, qui le retrouve à la fermeture
  function ensureLightbox(){
    if(lightboxEl) return lightboxEl;
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox';
    lightboxEl.setAttribute('role', 'dialog');
    lightboxEl.setAttribute('aria-modal', 'true');
    lightboxEl.innerHTML =
      '<button type="button" class="lightbox-close">'+icon('close')+'</button>'+
      '<img class="lightbox-img" alt="" referrerpolicy="no-referrer">'+
      '<div class="lightbox-caption"></div>';
    document.body.appendChild(lightboxEl);
    lightboxEl.addEventListener('click', function(e){ if(e.target === lightboxEl) closeLightbox(); });
    lightboxEl.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function(e){
      if(!lightboxEl.classList.contains('show')) return;
      if(e.key === 'Escape'){ closeLightbox(); return; }
      // Focus maintenu dans la fenêtre (bouton de fermeture, lien Wikipédia éventuel).
      if(e.key === 'Tab'){
        var focusables = Array.prototype.slice.call(lightboxEl.querySelectorAll('button, a[href]'));
        if(!focusables.length) return;
        var first = focusables[0], last = focusables[focusables.length - 1];
        if(e.shiftKey && (document.activeElement === first || !lightboxEl.contains(document.activeElement))){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && (document.activeElement === last || !lightboxEl.contains(document.activeElement))){ e.preventDefault(); first.focus(); }
      }
    });
    applyLightboxTexts();
    return lightboxEl;
  }
  // Libellé accessible du bouton de fermeture, retraduit au changement de langue (voir l'écouteur 'i18n:langchange').
  function applyLightboxTexts(){
    if(!lightboxEl) return;
    lightboxEl.querySelector('.lightbox-close').setAttribute('aria-label', t('photo.closeAria'));
  }
  // SÉCURITÉ (audit de septembre 2026) : tout texte venu des données ou de services tiers (noms OpenStreetMap, titres
  // Wikipédia, noms de lieux GeoNames…) est échappé avant insertion en HTML, et seules les URL http(s) sont acceptées
  // dans les attributs href/src — un nom OSM du type « <img src=x onerror=…> » ne doit jamais s'exécuter.
  function safeUrl(u){ return /^https?:\/\//i.test(String(u || '')) ? escHtml(u) : '#'; }
  // Même contrôle pour une affectation directe de propriété (element.href = …), sans échappement HTML.
  function safeHref(u){ return /^https?:\/\//i.test(String(u || '')) ? String(u) : '#'; }

  // ---- Crédit des photos (10e audit du 18/09/2026) ----
  // Les mentions légales promettent « crédit affiché avec l'image » : chaque photo Wikimedia est suivie de son auteur et
  // de sa licence quand le serveur les fournit (author, license, licenseUrl de /api/photo, null quand Wikimedia ne les
  // donne pas ; artist/licenseShortName/filePage/descriptionUrl acceptés aussi), sinon d'un lien vers la page de
  // description du fichier sur Commons (ou sur la Wikipédia qui l'héberge), où figurent l'auteur et la licence. Cette
  // page se déduit de l'adresse de l'image elle-même : (upload|thumb).wikimedia.org/wikipedia/<projet>/[thumb/]x/xy/
  // <fichier> ou commons.wikimedia.org/wiki/Special:FilePath/<fichier>. Les POI d'OpenStreetMap n'apportent que l'image.
  function photoFilePage(imgUrl){
    var u;
    try { u = new URL(String(imgUrl || '')); } catch(e){ return null; }
    if(u.protocol !== 'https:') return null;
    var m;
    // upload.wikimedia.org et thumb.wikimedia.org (nouvel hôte des vignettes de l'API REST de Wikipédia, 2026).
    if(/^(upload|thumb)\.wikimedia\.org$/.test(u.hostname)){
      m = u.pathname.match(/^\/wikipedia\/([a-z-]+)\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^\/]+)/);
      if(!m) return null;
      var host = m[1] === 'commons' ? 'commons.wikimedia.org' : (/^[a-z]{2,3}(-[a-z]+)?$/.test(m[1]) ? m[1] + '.wikipedia.org' : null);
      return host ? 'https://' + host + '/wiki/File:' + m[2] : null;
    }
    if(u.hostname === 'commons.wikimedia.org'){
      m = u.pathname.match(/^\/wiki\/Special:FilePath\/([^\/]+)$/);
      return m ? 'https://commons.wikimedia.org/wiki/File:' + m[1] : null;
    }
    return null;
  }
  // Texte brut d'un champ éventuellement balisé (le champ « Artist » de Commons contient souvent un lien HTML) :
  // DOMParser n'exécute aucun script et ne charge aucune image, contrairement à innerHTML sur un élément.
  function plainText(s){
    s = String(s == null ? '' : s);
    if(!/[<&]/.test(s)) return s.trim();
    try { return (new DOMParser().parseFromString(s, 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim(); }
    catch(e){ return s.replace(/<[^>]*>/g, '').trim(); }
  }
  function photoCreditInfo(data, imgUrl){
    data = data || {};
    var author = plainText(data.artist || data.author || '').slice(0, 120);
    var license = plainText(data.license || data.licenseShortName || '').slice(0, 60);
    var filePage = safeHref(data.filePage || data.descriptionUrl || '') !== '#' ? String(data.filePage || data.descriptionUrl)
      : photoFilePage(imgUrl || data.imageFull || data.image);
    return { author: author, license: license, licenseUrl: safeHref(data.licenseUrl) !== '#' ? String(data.licenseUrl) : null, filePage: filePage };
  }
  // HTML du crédit (textes échappés, liens http(s) seulement) ; chaîne vide si rien n'est connu.
  function photoCreditHtml(info){
    if(!info) return '';
    if(info.author && info.license){
      var lic = info.licenseUrl
        ? '<a href="' + safeUrl(info.licenseUrl) + '" target="_blank" rel="noopener">' + escHtml(info.license) + '</a>'
        : escHtml(info.license);
      var txt = t('photo.credit', { author: escHtml(info.author), license: lic });
      return info.filePage ? txt + ' <a href="' + safeUrl(info.filePage) + '" target="_blank" rel="noopener" aria-label="' +
        escHtml(t('photo.creditLink')) + '">↗</a>' : txt;
    }
    return info.filePage ? '<a href="' + safeUrl(info.filePage) + '" target="_blank" rel="noopener">' + escHtml(t('photo.creditLink')) + ' ↗</a>' : '';
  }
  function openLightbox(imgUrl, caption, wikiUrl, credit){
    if(!imgUrl || safeHref(imgUrl) === '#') return;
    var el = ensureLightbox();
    var img = el.querySelector('.lightbox-img');
    img.src = imgUrl;
    img.alt = caption || '';
    var capEl = el.querySelector('.lightbox-caption');
    var creditHtml = photoCreditHtml(credit || photoCreditInfo(null, imgUrl));
    capEl.innerHTML = (caption ? '<span>'+escHtml(caption)+'</span>' : '') +
      (wikiUrl ? '<a href="'+safeUrl(wikiUrl)+'" target="_blank" rel="noopener">'+escHtml(t('wiki.link'))+'</a>' : '') +
      (creditHtml ? '<span class="lightbox-credit">' + creditHtml + '</span>' : '');
    // Nom du lieu comme intitulé de la fenêtre (nom propre, rien à traduire) ; à défaut, « Photo réelle… » — un
    // role="dialog" doit toujours avoir un nom (10e audit).
    el.setAttribute('aria-label', caption || t('photo.real'));
    applyLightboxTexts();
    if(!el.classList.contains('show')) lightboxOpener = document.activeElement;
    el.classList.add('show');
    document.body.classList.add('lightbox-open');
    el.querySelector('.lightbox-close').focus();
  }
  function closeLightbox(){
    if(!lightboxEl || !lightboxEl.classList.contains('show')) return;
    lightboxEl.classList.remove('show');
    document.body.classList.remove('lightbox-open');
    lightboxEl.querySelector('.lightbox-img').removeAttribute('src');
    // Focus rendu à l'élément d'origine s'il est toujours affiché (un nouveau rendu a pu le remplacer).
    if(lightboxOpener && lightboxOpener.isConnected && typeof lightboxOpener.focus === 'function') lightboxOpener.focus();
    lightboxOpener = null;
  }

  /* ---------- REFERENCE DATA ---------- */
  // label/extra ne sont plus stockés ici en dur : ils dépendent de la langue choisie (voir
  // transportLabel()/transportPackExtra() plus haut, résolues à la volée via I18N à chaque usage) —
  // seules les données non textuelles (vitesse, classe de péage, motorisation) restent ici.
  // ferryClass (voir FERRY_ROUTES plus bas) : contrairement à tollClass, jamais null — un vélo ne
  // peut pas prendre l'autoroute mais peut tout à fait monter à bord d'un ferry, comme piéton avec
  // sa monture (tarif "foot", nettement moins cher qu'une place véhicule).
  var TRANSPORT = TripData.TRANSPORT;
  // Recharge électrique : autonomie route réaliste retenue avant de viser une pause.
  var EV_RANGE_KM = TripData.EV_RANGE_KM;
  var EV_CHARGE_MARGIN = TripData.EV_CHARGE_MARGIN; // recharge de 10 à 80 % : 70 % de l'autonomie entre deux arrêts, voir trip-data.js

  // ---- Péage : barème dérivé des guides tarifaires officiels VINCI Autoroutes 2026 ----
  // Sources : ASF (public-content.vinci-autoroutes.com/PDF/Tarifs-peage-asf/ASF-Guide-tarifaire-2026-maj062026.pdf)
  // et Cofiroute (.../PDF/Tarifs-peage-Cofiroute/Cofiroute-Guide-tarifaire-2026.pdf) : 54 liaisons réelles au
  // total, avec leur tarif TTC par classe de véhicule (30 depuis la page "Tarifs des principales liaisons" ASF,
  // 24 extraites de la grille gare-à-gare Cofiroute, sélectionnées pour leur lisibilité géographique).
  // Escota (Côte d'Azur) a aussi été consultée : son guide reproduit la même table nationale que celle d'ASF,
  // sans données additionnelles distinctes. Arcos (A355, contournement de Strasbourg) et Duplex A86 (tunnel
  // Rueil-Vaucresson-Vélizy) publient des tarifs forfaitaires modulés par heure de la journée plutôt qu'un
  // barème kilométrique — non comparables à ce modèle, ils ne sont donc pas intégrés au calcul.
  // Aucun de ces guides ne publie la distance des liaisons : elle est reconstituée ici à partir des coordonnées
  // officielles des communes (geo.api.gouv.fr) avec un facteur correcteur "vol d'oiseau -> route" de 1,17
  // (ratio usuellement admis pour les grands axes autoroutiers français, peu sinueux). Le tarif €/km retenu
  // par classe est la médiane observée sur l'ensemble des 54 liaisons listées ci-dessous (TOLL_REFERENCE).
  
  // Médiane €/km observée sur les 30 liaisons ci-dessus (classe 1 / 2 / 5). La classe 2 s'applique
  // au van aménagé (hauteur/PTAC), la classe 5 aux motos ; le vélo est exclu (interdit sur autoroute).
  //
  // Espagne et Portugal : même principe (tarif €/km "classe 1" dérivé d'un échantillon réel de
  // liaisons officielles), classes 2/5 extrapolées avec les MÊMES ratios que la France (2 ≈ ×1,55,
  // 5 ≈ ×0,58 la classe 1) faute de grille détaillée par classe pour ces deux pays — à affiner si
  // des barèmes complets deviennent disponibles.
  // - Espagne (AP-68 Bilbao-Zaragoza, barème officiel Autopistas/Abertis, janvier 2026 :
  //   autopistas.com/tarifas-y-descuentos/tarifas — plusieurs liaisons "Ligeros" ~294 km/39,90 €)
  //   -> ~0,14 €/km, très proche du tarif classe 1 français (péage classique avec barrière).
  // - Portugal (A22 Via do Infante, péage électronique sans barrière, vialivre.pt/en/tolls/tolls-on-a22 :
  //   somme des tarifs de section sur tout le trajet ~130 km pour 4,65 €) -> ~0,036 €/km, nettement
  //   moins cher — cohérent avec un réseau ex-SCUT à péage électronique, pas une grande autoroute
  //   à barrières. Échantillon plus restreint que la France (une seule liaison de référence) :
  //   estimation moins précise, affinable plus tard avec d'autres sections Ascendi/Via Verde.
  // - Andorre : pas de réseau autoroutier à péage — aucun montant n'est jamais calculé (hasToll:false).
  // - Belgique : autoroutes gratuites depuis l'abolition du dernier péage (tunnel de Liefkenshoek,
  //   2017) — aucun montant n'est jamais calculé (hasToll:false), comme l'Andorre.
  // - Pays-Bas : réseau autoroutier gratuit à 99% (isdetunnelopen.nl, tolls.eu) — seul le petit
  //   Kiltunnel (Dordrecht, ~2 €) reste payant, un cas isolé non comparable à un barème
  //   kilométrique national ; le Westerscheldetunnel, lui, est gratuit pour les véhicules légers
  //   depuis janvier 2025. Même traitement que la Belgique (hasToll:false). Un autre cas isolé, le
  //   pont à péage privé de Nieuwerbrug (le seul du pays, gratuit pour piétons/vélos/motos et pour
  //   les habitants du village), reste lui aussi hors modèle pour la même raison.
  // - Luxembourg : réseau autoroutier et routier entièrement gratuit pour les véhicules légers,
  //   seuls certains poids lourds paient une redevance kilométrique (nakordoni.eu, taxe-auto.be) —
  //   même traitement que l'Andorre/la Belgique/les Pays-Bas (hasToll:false).
  // - Suisse : pas gratuite, mais pas un péage au trajet non plus — une vignette annuelle à prix
  //   fixe (40 CHF/an, ch.ch/fr/circulation-et-vehicules/.../vignette-autoroutiere) donne un accès
  //   illimité au réseau, quel que soit le nombre de trajets ou de kilomètres parcourus dans
  //   l'année : aucun barème €/km ou CHF/km ne peut en dériver, et l'app ne simule pas un
  //   abonnement (hasToll:false). Le tunnel du Grand-Saint-Bernard (vers l'Italie, ~31 CHF
  //   aller simple/50 CHF aller-retour, letunnel.com) reste payant EN PLUS de la vignette, mais
  //   reste un ouvrage isolé non modélisé, même raisonnement que le Kiltunnel néerlandais.
  // - Allemagne : cas le plus simple de tous — l'Autobahn est réellement et entièrement gratuite
  //   pour les voitures, vans et motos (pas de vignette contrairement à la Suisse, pas de péage
  //   ponctuel contrairement aux Pays-Bas/au Luxembourg). Seuls les poids lourds à partir de 3,5 t
  //   paient la LKW-Maut (toll-collect.de) — hors du périmètre des véhicules modélisés par l'app,
  //   même un van aménagé restant un véhicule léger (hasToll:false).
  // - Italie : réseau à péage classique avec barrière (comme la France), barème officiel Autostrade
  //   per l'Italia 2026 (autostrade.it/en/servizi-al-cliente/pedaggio/come-si-calcola-il-pedaggio) —
  //   classe A (voiture) : 0,07869 €/km en plaine, 0,09315 €/km en zone de montagne. Retenu :
  //   0,086 €/km (valeur intermédiaire), classes 2/5 extrapolées avec les mêmes ratios que la
  //   France/l'Espagne/le Portugal (2 ≈ ×1,55, 5 ≈ ×0,58) faute de grille détaillée par classe.
  // - Autriche : même principe que la Suisse — pas gratuite, mais pas un péage au trajet non plus.
  //   Une vignette (autocollante ou digitale, asfinag.at) donne un accès illimité au réseau pour sa
  //   durée : 10 jours (12,80 €), 2 mois (32 €) ou 1 an (106,80 €) pour une voiture — aucun barème
  //   €/km ne peut en dériver, et l'app ne simule pas un abonnement (hasToll:false). Plusieurs
  //   tronçons alpins isolés (Sondermautstrecken) restent payants EN PLUS de la vignette — Brenner
  //   A13 (12,50 € l'aller), Tauern A10 (15 €), Karawanken A11, Arlberg S16... — mais suivent le même
  //   raisonnement que le Kiltunnel néerlandais/le Grand-Saint-Bernard suisse : des ouvrages isolés
  //   parmi d'autres itinéraires possibles, non modélisés.
  // - République tchèque : même principe que la Suisse/l'Autriche — vignette électronique
  //   obligatoire (e-dálniční známka, depuis 2021, SFDI/edalnice.gov.cz) plutôt qu'un péage au
  //   trajet : 1 jour (230 CZK), 10 jours (300 CZK), 30 jours (480 CZK) ou 1 an (2 570 CZK) pour
  //   une voiture — aucun barème CZK/km ne peut en dériver, et l'app ne simule pas un abonnement
  //   (hasToll:false). Contrairement à la Suisse/l'Autriche, aucun ouvrage isolé à péage EN PLUS de
  //   la vignette n'a été identifié sur le réseau tchèque — cas plus simple sur ce point précis.
  // - Saint-Marin : aucune autoroute (292 km de routes au total, aucune à péage) — cas le plus
  //   simple de tous, comme l'Andorre.
  // - Liechtenstein : même chose — aucune autoroute propre, donc ni péage ni vignette propre. La
  //   vignette suisse (voir plus haut), si elle est achetée pour la Suisse, reste valable sur les
  //   quelques mètres de route classée "autoroute" à la frontière (union douanière avec la Suisse),
  //   mais n'est jamais OBLIGATOIRE pour circuler dans le seul Liechtenstein — contrairement à la
  //   Suisse/l'Autriche, aucun rappel de vignette n'est donc affiché pour ce pays (voir
  //   COUNTRIES.LI, sans champ `vignette`).
  // - Croatie : réseau à péage FERMÉ (ticket à l'entrée, paiement à la sortie), comme la France —
  //   PAS de vignette, contrairement à tous les pays d'Europe centrale ajoutés jusqu'ici (Suisse/
  //   Autriche/République tchèque/Slovaquie/Hongrie/Slovénie). Barème calculé sur Zagreb-Split/
  //   Dugopolje (A1, ~410 km) — mojkalkulator.com.hr, agrégeant les tarifs officiels HAC 2026 :
  //   catégorie I (voiture) 24,50 €, IA (moto) 12,30 €, II (van/remorque) 36,70 €. Contrairement à
  //   l'Italie/l'Espagne/le Portugal, les classes 2/5 ne sont PAS extrapolées ici : ce sont de VRAIS
  //   ratios officiels par rapport à la classe 1 (36,70/24,50 = ×1,498 ≈ ×1,5 ; 12,30/24,50 = ×0,502
  //   ≈ ×0,5), retenus tels quels plutôt qu'arrondis au ratio français/espagnol habituel — d'où
  //   0,060/0,090/0,030 €/km, une progression exactement ×1,5/×0,5 qui n'est ici PAS une
  //   coïncidence de calcul.
  // - Bosnie-Herzégovine : péage fermé elle aussi, mais réseau bien plus jeune/court (~200 km,
  //   corridor Vc encore en construction par tronçons) et réparti entre DEUX gestionnaires (JP
  //   Autoceste FBiH, AD Autoputevi RS) sans grille tarifaire unique publiée. Six tronçons réels
  //   retenus (tolls.eu 2026) : Svilaj-Odžak (8 km, 1,20 KM), Laktaši-Doboj (79 km, 7 KM),
  //   Gradiška-Banja Luka (27 km, 3,50 KM), Sarajevo Sjever-Zenica Sjever (60 km, 14 KM), Sarajevo
  //   Zapad-Bradina (24 km, 7 KM), Čapljina-Ljubuški (18 km, 4,40 KM) — de 0,09 à 0,29 KM/km selon
  //   le tronçon (les plus courts coûtent proportionnellement plus cher, comme souvent), moyenne
  //   ~0,19 KM/km. Converti au taux de caisse d'émission FIXE (1 EUR = 1,95583 KM, voir
  //   COUNTRIES.BA.currency) plutôt qu'à un taux de marché flottant : ~0,097 €/km. Classes 2/5
  //   extrapolées au ratio France/Espagne/Italie (×1,55/×0,58) faute de grille par catégorie ici,
  //   contrairement à la Croatie.
  // - Serbie : péage fermé (comme la France/la Croatie/la Bosnie-Herzégovine), réseau bien plus
  //   développé que celui de ses deux voisins déjà couverts (938 km, un seul gestionnaire national,
  //   Putevi Srbije, putevi-srbije.rs/index.php/en/road-toll — 77 gares automatiques). Cinq
  //   liaisons réelles retenues (tolls.eu 2026, tarifs catégorie Ia moto / I voiture) : Beograd
  //   (Vrčin)-Presevo (A1, 350 km, 1 030/2 060 din), Beograd-Subotica (A1, 132 km, 420/850 din),
  //   Beograd-Požega (A2, 123 km, 480/950 din), Beograd-Šid (A3, 76 km, 260/520 din), Pojate-Vrbа
  //   (A5, 71 km, 200/410 din) — de 5,78 à 7,72 din/km pour la voiture selon le tronçon, MÉDIANE
  //   ~6,44 din/km. Converti au taux de change de RÉFÉRENCE indiqué par tolls.eu (117 RSD = 1 EUR,
  //   cohérent avec la gestion de change étroite de la Banque nationale de Serbie plutôt qu'un vrai
  //   flottement libre) : ~0,055 €/km. Contrairement à l'Italie/l'Espagne/le Portugal mais COMME la
  //   Croatie, la classe moto (5) n'est pas extrapolée : sur les cinq liaisons ci-dessus, le tarif
  //   moto vaut systématiquement très exactement la MOITIÉ du tarif voiture (1030/2060, 420/850,
  //   480/950, 260/520, 200/410 — ratio moyen 0,497, arrondi à ×0,5 comme pour la Croatie) — d'où
  //   0,028 €/km. Aucune grille officielle trouvée en revanche pour la catégorie II (van/remorque,
  //   malgré une recherche directe sur putevi-srbije.rs) : extrapolée au ratio croate ×1,5 (le seul
  //   ratio RÉEL confirmé dans la région pour cette catégorie, plus proche géographiquement/
  //   structurellement que le ×1,55 franco-ibérique) plutôt qu'inventée — d'où 0,083 €/km.
  // - Macédoine du Nord : péage aux gares (paiement au fil des gares successives d'un même axe,
  //   pas un ticket entrée/sortie unique comme la Serbie) mais bien proportionnel à la distance une
  //   fois les gares d'un trajet cumulées — géré par l'Entreprise publique des routes d'État
  //   (roads.org.mk/en/toll-system/toll-rates). Tarif retenu sur la liaison A1 Skopje-Gevgelija
  //   (123 km, corridor principal nord-sud vers la Grèce) : 360 MKD catégorie 1B (voiture),
  //   fuel-prices.eu/tolls.eu 2026 -> 2,93 MKD/km. Converti au cours cible OFFICIEL de la Banque
  //   nationale de Macédoine du Nord, ancrage de facto depuis 1997 (~61,5 MKD = 1 EUR — mappr.co,
  //   fxrate.io 2026) plutôt qu'à un taux de marché flottant (comme pour le mark convertible
  //   bosnien) : ~0,048 €/km. Contrairement à la Serbie/la Croatie, un vrai barème officiel par
  //   catégorie A ÉTÉ trouvé (roads.org.mk, quatre gares : Romanovci/Petrovec/Sopot/Gevgelia,
  //   catégories 1A moto/1B voiture/2 van) : ratio moto moyen ×0,60 (40/60, 20/40, 50/80, 60/100),
  //   ratio van moyen ×1,42 (80/60, 50/40, 120/80, 160/100) — retenus tels quels plutôt que le ratio
  //   croate, structurellement différent (péage aux gares plutôt que fermé) — d'où 0,029/0,068 €/km.
  // - Grèce : péage aux gares comme la Macédoine du Nord (paiement fixe à chaque gare traversée,
  //   pas un ticket entrée/sortie unique), mais un réseau bien plus dense — plusieurs concessionnaires
  //   distincts par axe (Olympia Odos, PATHE/Attiki Odos, Egnatia Odos), interopérables depuis 2023
  //   (badge unique e-Pass, mydiodia.gr). Trois liaisons réelles retenues (mydiodia.gr 2026,
  //   catégorie 2/voiture) : Athènes-Patras (A8/Olympia Odos, 215 km, 13,80 €) -> 0,0642 €/km,
  //   Athènes-Thessalonique (A1/PATHE, 503 km, 36,70 €) -> 0,0730 €/km, Thessalonique-Alexandroupoli
  //   (A2/Egnatia Odos, 360 km, 14,25 €) -> 0,0396 €/km — nettement moins cher sur l'Egnatia, cohérent
  //   avec le nouveau tarif national annoncé pour cet axe (0,04 €/km + TVA à partir de 2026,
  //   tovima.com). Médiane retenue : 0,0642 €/km, arrondi 0,064 €/km. Classe moto (5) dérivée d'un
  //   VRAI ratio officiel trouvé sur la grille tarifaire de l'Attiki Odos (périphérique d'Athènes,
  //   pas une liaison intercité mais la seule grille par catégorie disponible) : catégorie 1 (moto)
  //   1,25 €, catégorie 2 (voiture) 2,55 € -> ratio ×0,49, arrondi ×0,5 comme la Croatie/la Serbie —
  //   d'où 0,032 €/km. Classe van (2), même grille Attiki Odos : catégorie 4 (van/caravane) au même
  //   tarif que la catégorie 2 pour ce périphérique précis, pas représentatif d'un vrai surcoût
  //   intercité — extrapolée à la place au ratio régional ×1,5 (Croatie/Macédoine du Nord) plutôt que
  //   prise telle quelle, faute de grille intercité dédiée — d'où 0,096 €/km.
  var TOLL_RATE_BY_CLASS = TripData.TOLL_RATE_BY_CLASS;
  var TOLL_RATE_BY_COUNTRY = TripData.TOLL_RATE_BY_COUNTRY;
  var TOLL_SOURCE = TripData.TOLL_SOURCE;

  // ---- Ferries : traversées maritimes réelles (Corse, Baléares, Canaries, îles grecques...) ----
  // Contrairement au réseau routier, une île n'est jamais reliée au continent par la route : le
  // moteur de distance (roadDistanceKm, vol d'oiseau × 1,17) n'avait, avant ceci, aucune idée de la
  // mer — un trajet pouvait "traverser" la Méditerranée ou l'Atlantique comme une route normale,
  // silencieusement faux. Modélisé ici comme un mode à part, avec une durée et un tarif FIXES par
  // ligne (pas un calcul au km/heure comme la route, voir finalizeFerryLeg) : un ferry ne va pas
  // plus vite avec un moteur plus puissant, contrairement à une voiture.
  //
  // Volontairement PAS d'avion, même pour les îles les plus lointaines (Canaries) : hors sujet pour
  // un site de road trip, dont le principe est de garder SON véhicule tout du long — un ferry le
  // permet, un vol l'abandonne au point de départ. Concrètement, ça exclut les Açores et Madère :
  // aucune liaison maritime régulière n'existe aujourd'hui (2026) entre le Portugal continental et
  // ces archipels — seulement des projets/annonces politiques (budget 2025/2026), rien
  // d'opérationnel (sources : jm-madeira.pt, publico.pt). Ces communes restent donc accessibles
  // comme point de départ (recherche manuelle) mais jamais comme étape reliée au reste d'un
  // itinéraire — cohérent avec le principe "jamais de trajet fabriqué" déjà appliqué au reste du
  // site (voir ferryRouteFor : l'absence d'entrée pour ce couple de masses continentales suffit à
  // les exclure, sans code spécifique).
  //
  // Tarifs "classe 1" = voiture, place pont/couchette économique, BASSE saison — comme pour les
  // péages, un ordre de grandeur indicatif construit à partir de vraies grilles tarifaires, pas un
  // tarif garanti. Classes 2/5/foot extrapolées faute de grille détaillée par catégorie (même
  // limite déjà assumée pour les péages espagnol/portugais).
  // - Corse : Corsica Linea (Marseille, ~11-13h) / Corsica Ferries (Nice ~4h30, Toulon ~7-10h) —
  //   ~50-180 €/voiture, ~30-50 €/passager basse saison (corsicalinea.com, hissez-o.fr,
  //   visit-corsica.com). Retenu : ~8h30 (moyenne), 90 €/voiture.
  // - Baléares : Baleària/Trasmediterranea, Barcelone/Valence -> Palma — ~7h30, ~120-150 €/voiture,
  //   ~180 € pour un van/camping-car (balearia.com, barcelonamallorca.com). Retenu : 135 €/voiture.
  // - Canaries : Naviera Armas/Baleària Canarias, Cadix -> Las Palmas/Ténérife — traversée BIEN plus
  //   longue (37 à 46h, quasi deux jours en mer, à ne pas confondre avec les autres lignes), à
  //   partir de ~124 € (armastrasmediterranea.com). Retenu : ~41h (moyenne), 280 €/voiture.
  // - Îles Wadden (Pays-Bas) : TESO, Den Helder -> Texel — traversée courte (20 min), ~31-46 €
  //   l'ALLER-RETOUR voiture selon le jour (boottexel.eu, hellotexel.com) -> ~18 €/traversée une
  //   fois ramené au sens "un seul passage" utilisé ici (voir finalizeFerryLeg, appelé une fois par
  //   sens, pas un billet aller-retour). Les quatre autres îles (Vlieland, Terschelling — Rederij
  //   Doeksen — Ameland, Schiermonnikoog — Wagenborg) sont couvertes par le même tarif faute de
  //   mieux, alors que leurs traversées sont nettement plus chères et l'accès en voiture bien plus
  //   restreint en pratique (souvent réservé aux résidents) : approximation plus grossière que pour
  //   la Corse/les Baléares/les Canaries pour ces quatre-là spécifiquement. IMPORTANT : chacune
  //   garde sa PROPRE masse continentale (wadden-texel, wadden-vlieland...), pas une seule
  //   "wadden" partagée — sans ça, le moteur les aurait crues reliées entre elles par la route,
  //   alors qu'aucune ne l'est (il faut repasser par le continent, donc un second ferry, pour
  //   aller par exemple de Texel à Terschelling). Chacune n'est reliée qu'au continent, jamais
  //   directement à une autre île Wadden — voir la boucle juste après qui génère les 5 entrées.
  // - Sardaigne : Moby/Tirrenia/GNV, Gênes -> Olbia — traversée longue (~11h10 à 12h selon la
  //   compagnie), ~90-110 €/voiture en place pont basse saison (traghetti.com, moby.it — le tarif
  //   moyen ~258 € cité par plusieurs comparateurs inclut cabine/famille, pas comparable à ce
  //   modèle "voiture seule" déjà utilisé pour la Corse/les Baléares). Retenu : ~11h30 (moyenne),
  //   100 €/voiture, ratios classe 2/5/foot identiques à la Corse (×1,5/×0,45/×0,45).
  // - Sicile : Caronte & Tourist, Villa San Giovanni -> Messine — le détroit de Messine ne fait que
  //   ~3 km de large, traversée très courte (~20-25 min, plusieurs dizaines de rotations par jour),
  //   plus proche des îles Wadden que de la Corse dans son profil. Tarif par longueur de véhicule
  //   (carontetourist.it/en/strait-messina/rates-cars) : ~17 € jusqu'à 3,50 m, ~42 € de 3,51 à
  //   5,50 m (la plupart des voitures) — retenu ~35 €/voiture (valeur médiane représentative), et
  //   ~3 €/passager piéton (tarif piéton affiché, sans véhicule). AUCUN pont routier n'existe à ce
  //   jour (2026) : le "ponte sullo Stretto di Messina" est encore au stade de l'autorisation
  //   administrative, chantier annoncé fin 2026, mise en service visée 2033-2034 (mit.gov.it,
  //   stradeeautostrade.it) — trop lointain et non garanti pour anticiper sa mise en service ici ;
  //   le ferry reste, à ce jour, l'unique traversée réelle.
  // - Malte : Virtu Ferries, Pozzallo (Sicile) -> Valette — ~1h45, seul opérateur sur cette ligne
  //   (quasi-monopole, prix nettement plus élevés que Corse/Sardaigne malgré une traversée bien plus
  //   courte : plusieurs sources citent un tarif "voiture" grand public entre ~85 et ~120 €, jusqu'à
  //   plusieurs centaines d'euros en tarif flexible/haute saison — rome2rio.com, maltauncovered.com,
  //   ferryscanner.com). Retenu : ~120 €/voiture (borne basse représentative, même logique que pour
  //   la Sardaigne : écarter le tarif flexible premium plutôt qu'un vrai prix "voiture seule"),
  //   ratios classe 2/5/foot identiques à la Corse/Sardaigne (×1,5/×0,45/×0,45) faute de grille par
  //   catégorie. Distance ~100 km (estimée aux coordonnées des deux ports).
  // - Gozo (Malte) : Gozo Channel Line, Ċirkewwa -> Mġarr — traversée très courte (~25 min, un départ
  //   toutes les 30 min, 24h/24), au même profil que Messine/les îles Wadden. Tarif "voiture +
  //   conducteur" officiel ~15,70 € (gozochannel.com/ferry/fares/car-and-driver), mais UNIQUEMENT
  //   perçu au retour (comme pour Texel, jamais facturé dans les deux sens) -> ~8 €/traversée une
  //   fois ramené au sens "un seul passage" utilisé ici ; ~4 €/traversée pour une moto (tarif "moto +
  //   pilote" ~8,15 € constaté, même conversion), ~2 €/traversée piéton (tarif AR piéton ~4,65 €,
  //   même conversion). Comino, îlot minuscule entre les deux (population quasi nulle, aucune route),
  //   rejoint la masse "gozo" par simple seuil de latitude (36,00°) plutôt qu'une étiquette dédiée :
  //   sans commune propre dans les données, le distinguer n'aurait aucun effet observable.
  // - Guernesey/Jersey (îles Anglo-Normandes) : Condor Ferries, Saint-Malo -> Jersey (~1h25, Condor
  //   Voyager) et Saint-Malo -> Guernesey (~2h) ; liaison INTER-îles Jersey<->Guernesey (~1h à 2h
  //   selon le navire, ~1h10 en moyenne) — condorferries.co.uk, directferries.com. Aucune liaison
  //   n'existe avec le Royaume-Uni dans ce modèle : les ports anglais (Poole, Portsmouth) ne
  //   desservent aucun pays couvert par cette app, seul Saint-Malo (France, déjà un pays couvert)
  //   compte ici. Tarifs "voiture" grand public à partir de ~99 £ (~115 € au taux 2026) sur les deux
  //   lignes Saint-Malo, tarif passager à partir de ~36 £/personne (~42 €) — condorferries.co.uk,
  //   directferries.com. Retenus : Saint-Malo->Jersey ~110 km/1h25/115 €, Saint-Malo->Guernesey ~155
  //   km/2h/115 €, Jersey<->Guernesey ~65 km/1h10/75 € (aucun tarif "voiture" publié pour cette
  //   dernière : estimation interpolée entre les deux lignes Saint-Malo au prorata de la distance,
  //   plus élevée qu'une simple règle de trois pour tenir compte des coûts fixes d'une courte
  //   traversée). Classe 5/foot dérivées des tarifs passager trouvés plutôt que du ratio Corse
  //   (×0,45) : ce dernier sous-estimerait nettement le passager sur ces lignes, dont le tarif publié
  //   est déjà proche de la moitié du tarif voiture. Sercq (voir SARK_EXCLUDE_NAMES,
  //   scripts/build-country-communes.js) n'a AUCUNE liaison en ferry pour véhicules — exclue en
  //   amont, jamais une destination possible ici.
  // - Croatie : le plus gros ajout en nombre de lignes jusqu'ici — onze îles habitées, chacune sa
  //   propre masse continentale (voir HR_ISLAND_POSTCODES/landmassOf plus bas), toutes desservies par
  //   Jadrolinija sauf Rab (Rapska Plovidba). Système fermé (Zagreb-Split), voir TOLL_RATE_BY_COUNTRY
  //   plus haut : PAS de vignette pour les traversées, un vrai tarif "voiture" par ligne (source :
  //   putovnica.net/absolute-croatia.com/allferriescroatia.com, tarifs officiels haute saison 2026).
  //   Quand une île est desservie par PLUSIEURS lignes réelles, la plus COURTE est retenue plutôt que
  //   la plus longue au départ direct de Split/Zadar (même logique que Messine pour la Sicile) —
  //   notamment pour la Corčula/Hvar/Mljet, désormais accessibles par un court saut depuis la
  //   presqu'île de Pelješac, elle-même reliée au continent par un vrai pont routier depuis 2022 (pont
  //   de Pelješac) et donc déjà "continent" dans ce modèle, sans anneau dédié. Classe 2/5 extrapolées
  //   au ratio ×1,5/×0,5 — les MÊMES ratios que le péage croate ci-dessus (voir TOLL_RATE_BY_COUNTRY),
  //   une cohérence qui n'est pas fortuite : HAC applique un ratio comparable à ses propres classes de
  //   véhicules, retenu ici faute de grille détaillée par classe pour chaque ligne de ferry.
  //   Classe foot = vrai tarif passager publié par ligne (pas une extrapolation), sauf Zadar-Brbinj
  //   (Dugi Otok) où aucun tarif fiable n'a été trouvé : approximé sur le tarif d'une ligne de durée
  //   comparable (Prapratno-Sobra).
  //   - Cres (+Lošinj, reliée à Cres par un pont à Osor — même masse) : Brestova-Porozina, 20 min,
  //     20,70 €/voiture, 4,40 €/passager (préférée à Valbiska-Merag, via Krk, déjà "continent" ici,
  //     par simplicité : une seule ligne à modéliser).
  //   - Rab : Stinica-Mišnjak (Rapska Plovidba), 20 min, 18,20 €/voiture, 4,20 €/passager.
  //   - Ugljan (+Pašman, reliée à Ugljan par le pont de Ždrelac — même masse) : Zadar-Preko, 25 min,
  //     17,30 €/voiture, 3,80 €/passager.
  //   - Dugi Otok : Zadar-Brbinj, 1h45, 28,50 €/voiture, ~7,50 €/passager (approximé, voir plus haut).
  //   - Brač : Split-Supetar, 50 min, 26,10 €/voiture, 6,50 €/passager.
  //   - Šolta : Split-Rogač, 1h, 23,50 €/voiture, 5,70 €/passager.
  //   - Hvar : Drvenik-Sućuraj, 30 min, 19,70 €/voiture, 4,10 €/passager (préférée à Split-Stari Grad,
  //     bien plus longue — 1h50, 47,60 € — même logique de ligne courte que Corčula/Mljet).
  //   - Vis : Split-Vis, 2h20, 52 €/voiture — SEULE ligne réelle, île la plus éloignée du continent
  //     parmi celles couvertes ici, aucun raccourci n'existe. Passager estimé (non publié précisément
  //     dans les sources consultées) au même ratio que les autres lignes Split (~1/4,5 du tarif
  //     voiture) : 12 €.
  //   - Korčula : Orebić-Dominče, 20 min, 16,20 €/voiture, 4,40 €/passager.
  //   - Mljet : Prapratno-Sobra, 45 min, 25,50 €/voiture, 6,10 €/passager.
  //   - Lastovo : Split-Vela Luka-Ubli, 4h30 (île la plus reculée), 73,70 €/voiture, 11,50 €/passager
  //     — SEULE ligne réelle, aucun raccourci n'existe pour cette île au large.
  //   Îlots volontairement LAISSÉS DE CÔTÉ (aucune ligne modélisée, traités comme "continent" par
  //   défaut — limite assumée, pas un oubli) : Krk/Pag/Vir/Čiovo (déjà reliés au continent par un vrai
  //   pont routier, correctement "continent"), et une bonne douzaine de très petites îles à liaison
  //   locale réduite et population quasi nulle dans les données (archipel de Zadar : Molat/Ist/
  //   Premuda/Silba/Olib/Iž/Rava/Zverinac ; archipel de Šibenik : Murter[pont]/Kaprije/Zlarin/Žirje/
  //   Prvić/Krapanj ; îles Élaphites près de Dubrovnik : Koločep/Lopud/Šipan ; Susak/Unije/Ilovik près
  //   de Lošinj ; Drvenik Veli/Mali près de Trogir ; Biševo/Palagruža au large de Vis) — même logique
  //   que les Açores/Madère pour le Portugal : ces communes restent accessibles comme point de départ
  //   (recherche manuelle) mais jamais comme étape reliée au reste d'un itinéraire.
  var HR_ISLAND_POSTCODES = TripData.HR_ISLAND_POSTCODES;
  // Table inverse (code postal -> île), construite une seule fois plutôt qu'à chaque appel de
  // landmassOf — identifiée par CODE POSTAL EXACT plutôt que par coordonnées : contrairement à la
  // Corse/aux Baléares/à la Sardaigne/la Sicile, le littoral dalmate est bien trop découpé pour
  // qu'un simple rectangle lat/lon sépare fiablement une île de son continent voisin (vérifié :
  // Brač/Hvar/Vis partagent presque exactement la même bande de latitude que la côte de Makarska,
  // Ugljan/Pašman celle de Zadar/Biograd) — le code postal, lui, est un identifiant GeoNames déjà
  // séparé par île, aussi fiable que les codes 2A/2B pour la Corse ou les provinces pour la Sardaigne/
  // la Sicile.
  var HR_POSTCODE_TO_ISLAND = TripData.HR_POSTCODE_TO_ISLAND;
  var WADDEN_ISLANDS = TripData.WADDEN_ISLANDS;
  // Provinces italiennes de Sardaigne (5) et de Sicile (9) — voir landmassOf plus bas. Liste
  // vérifiée exhaustivement sur les 107 provinces distinctes présentes dans communes-it.txt.
  var SARDINIA_PROVINCES = TripData.SARDINIA_PROVINCES;
  var SICILY_PROVINCES = TripData.SICILY_PROVINCES;
  // Îles grecques — voir le grand commentaire "Ferries : Grèce" au-dessus de FERRY_ROUTES pour la
  // méthode, les sources et la liste des exclusions volontaires. Contrairement à la Croatie
  // (HR_ISLAND_POSTCODES, codes postaux EXACTS un par un — littoral trop découpé pour un simple
  // préfixe), le système postal grec est découpé en blocs RÉGIONAUX suffisamment propres pour qu'un
  // préfixe (RegExp testée sur le code postal complet) sépare fiablement une île de ses voisines —
  // vérifié exhaustivement sur les ~14 220 communes de communes-gr.txt, préfecture par préfecture.
  // Quelques exceptions ponctuelles bien identifiées, en commentaire à côté de l'entrée concernée :
  // Skýros (34007) et Póros (18020, avec un filtrage par nom) partagent leur bloc de codes postaux
  // avec une zone continentale voisine (Eubée pour Skýros, Trézène/Galatás pour Póros) ; Íos (84001)
  // et Amorgós (84008) sont, eux, des codes ISOLÉS au sein du bloc plus large des Cyclades restées
  // volontairement non modélisées (voir plus bas). L'ordre des entrées ci-dessous n'a aucune
  // importance (chaque test est indépendant), sauf le cas Póros qui doit être vérifié par nom AVANT
  // le repli sur le préfixe générique.
  var GR_POROS_MAINLAND_NAMES = TripData.GR_POROS_MAINLAND_NAMES;
  var GR_ISLAND_PATTERNS = TripData.GR_ISLAND_PATTERNS;
  var FERRY_ROUTES = TripData.FERRY_ROUTES;
  
  // Détecte la masse continentale d'une commune : son pays pour la France (le champ dept y est un
  // vrai code de département, 2A/2B identifient la Corse sans ambiguïté) ; ses coordonnées pour
  // l'Espagne/le Portugal (dept y est déjà un nom de région en clair, pas exploitable ici — voir
  // parseCommunesFile). Bornes larges mais qui ne mordent jamais sur le continent correspondant :
  // vérifié que la France métropolitaine ne dépasse pas ~7,7°E (hors de la plage Corse) et que la
  // façade est de l'Espagne autour de Barcelone est à plus de 41°N (hors de la plage Baléares).
  // Traversée en ferry : durée et tarif FIXES pour la ligne concernée (voir FERRY_ROUTES), sans
  // rapport avec la vitesse du véhicule choisi — contrairement à finalizeLeg. Ni péage ni recharge
  // électrique en mer (une voiture électrique peut recharger sur certaines lignes, mais aucune
  // donnée fiable là-dessus : pas modélisé, plutôt que d'inventer un chiffre).
  // label n'est plus stocké ici (voir budgetLabel() plus haut) — seul l'ordre reste une donnée
  // stable, indépendante de la langue.
  var BUDGET = {
    economique:{order:0},
    moyen:{order:1},
    confortable:{order:2}
  };
  // Plafond de prix / nuit (2 adultes) utilisé uniquement pour préremplir les liens de recherche
  // Airbnb / Booking — un repère indicatif choisi pour ce générateur, pas une donnée tarifaire réelle.
  // Plafonds de prix par palier de budget, un jeu de valeurs par devise (voir countryCurrency) —
  // pas une simple conversion au taux de change : le coût réel du logement en Suisse est
  // nettement plus élevé qu'en zone euro pour une catégorie équivalente (chambre privée en
  // auberge ~90-150 CHF, hôtel 2-3★ ~150-350 CHF, haut de gamme au-delà de 250 CHF — hostelz.com,
  // holiday-thun.ch, myswissalps.com, échantillon 2026), d'où des paliers CHF proportionnellement
  // plus hauts que leur équivalent EUR plutôt qu'une simple conversion. GBP (Guernesey/Jersey) : entre
  // les deux — hôtels dès ~40 £/nuit, moyenne Airbnb ~143-155 £ (Jersey/Guernesey), jusqu'à ~250-320 £
  // en haute saison (échantillon likibu.com/hotels.uk.com/airroi.com 2026) — paliers proches des
  // montants EUR (même ordre de grandeur en valeur nominale), pas de la conversion au taux de change.
  // CZK (République tchèque) : à l'inverse de la Suisse, un pays moins cher que la zone euro — même
  // à Prague (la ville la plus chère du pays, largement au-dessus de la moyenne nationale des petites
  // communes que ce générateur tire au sort), le loyer Airbnb médian ~2 470 CZK/nuit et la fourchette
  // couvrant 80% des annonces ~1 650-3 900 CZK restent sous l'équivalent d'une simple conversion des
  // paliers EUR (échantillon airdna.co/airroi.com/bestpragueguide.com 2026) — paliers donc légèrement
  // EN DESSOUS de l'équivalent EUR converti, pas au-dessus comme pour la Suisse. PLN (Pologne) : même
  // profil que la République tchèque — pays moins cher que la zone euro. Moyenne nationale Airbnb
  // ~320-480 PLN/nuit, 80% des annonces entre ~200-550 PLN (échantillon airroi.com/airbtics.com
  // 2026, Varsovie/Cracovie/Wrocław inclus) — paliers calés sous cette moyenne nationale (comme pour
  // la République tchèque, ce générateur tire surtout de petites communes, moins chères que les
  // grandes villes de l'échantillon). HUF (Hongrie) : même profil encore — Airbnb à Budapest (la
  // ville la plus chère du pays) va de ~12 000-18 000 Ft pour les appartements d'entrée de gamme
  // hors centre à ~23 000-25 000 Ft de médiane, jusqu'à 60 000+ Ft pour le haut de gamme (échantillon
  // airroi.com/airbtics.com 2026) — paliers calés sous la médiane budapestoise, cohérent avec les
  // petites communes tirées au sort par ce générateur. BAM (Bosnie-Herzégovine) : même profil
  // "moins cher que la zone euro" une fois encore — à Sarajevo (la ville la plus chère du pays),
  // moyenne Airbnb ~61-71 $/nuit selon le mois (~56-65 €), chambres privées en dehors du centre
  // (Grbavica/Kovačići) ~40-70 KM/nuit (~20-36 €, échantillon likibu.com/thehoteljournal.com 2026)
  // — paliers calés à ~70% de la conversion EUR->BAM au taux fixe (1,95583), cohérent avec le ratio
  // déjà observé pour PLN (~80%) et plus prudent que HUF (~38-40%) faute d'un échantillon aussi
  // large que pour les autres devises.
  var BUDGET_PRICE_MAX = TripData.BUDGET_PRICE_MAX;
  // Les listes elles-mêmes viennent maintenant de I18N.tl() (voir js/i18n.js, objet LISTS) — sac de
  // base et compléments par budget/transport, résolus à la langue courante à chaque rendu
  // (renderPacking) plutôt que figés en français ici.

  /* ---------- POINTS D'INTÉRÊT RÉELS (OpenStreetMap) ---------- */
  // ~300 communes disposant d'au moins un point d'intérêt touristique ou patrimonial nommé,
  // extraites d'OpenStreetMap (données © contributeurs OpenStreetMap, licence ODbL) via l'API
  // Overpass, filtrées par appartenance réelle au territoire français (test géométrique contre
  // le contour IGN) puis rattachées à leur commune la plus proche. Couverture honnête : ces
  // ~300 communes ont une activité précise et réellement nommée ; les ~35 000 autres communes
  // du pays restent des étapes possibles, avec une activité générique (marché, patrimoine
  // local, balade) plutôt qu'un point d'intérêt inventé.
  
  // POI_TYPE_LABEL n'est plus une table de libellés figée : voir poiTypeLabel()/KNOWN_POI_TYPES
  // plus haut, résolus via I18N à chaque rendu (nécessaire pour qu'un changement de langue en
  // cours de session retraduise les activités déjà affichées — voir renderActivityCards).
  // Suggestions génériques : des CLÉS i18n (pas du texte résolu) — un changement de langue doit
  // pouvoir les retraduire sans rejouer le tirage (voir buildActivityOptions/renderActivityCards).
  // "generic.walk" à part : la balade a sa propre logique de sélection (voir buildActivityOptions),
  // pour éviter le doublon avec les 4 autres suggestions génériques ci-dessous.
  var GENERIC_KEYS_NO_WALK = ['generic.market', 'generic.church', 'generic.stroll', 'generic.producer'];
  // Types de POI OSM qui se prêtent à une vraie suggestion de balade/randonnée (plutôt qu'une
  // visite en intérieur) : on les préfère comme suggestion "balade" quand ils sont disponibles.
  var WALK_POI_TYPES = { viewpoint:1, nature_reserve:1, peak:1, waterfall:1, cave_entrance:1, beach:1 };
  // Pour la diversité des activités proposées (voir buildActivityOptions), certains types comptent
  // comme une seule et même catégorie même si leur étiquette affichée reste distincte (voir
  // POI_TYPE_LABEL) — un monument aux morts EST un mémorial, proposer les deux en même temps
  // n'apporterait pas de vraie diversité.
  var POI_DIVERSITY_GROUP = { monument:'memorial', memorial:'memorial' };
  function diversityGroup(type){ return POI_DIVERSITY_GROUP[type] || type; }
  // FEATURED (points d'intérêt réels pré-recensés pour ~300 communes françaises) et le parsing des
  // communes elles-mêmes ne sont plus chargés côté client — voir README, "Recherche et tirage
  // aléatoire côté serveur" : lib/trip-engine.js s'en sert désormais côté serveur uniquement
  // (voir featuredCount sur chaque leg, consommé par updateRevealTexts plus bas).

  /* ---------- STATE ---------- */
  var radiusMode = 'km';
  var lastNorm = null; // évite de retomber sur la même première étape deux fois de suite
  var rouletteTimer = null;
  // Attente maximale du préchargement des activités et photos après réception du tirage (roulette comprise).
  var PRELOAD_MAX_WAIT_MS = 10000;
  // Délai maximal d'attente de /api/generate-trip côté navigateur.
  var DRAW_TIMEOUT_MS = 30000;
  var currentDrawId = 0;
  var currentTripLabel = ''; // « Départ → première étape · dates ISO », pour nommer le PDF exporté (voir export-pdf-btn)
  // Voyage AFFICHÉ : {legs, city, budgetKey, transportKey, cityCoord, firstStop, days, notices, departureTension,
  // startIso, endIso} — seul état relu par les re-rendus (langue, devise) et l'export PDF.
  var currentTripData = null;
  var portalsShownFor = {}; // étape -> liste d'activités où le lien « Plus de randonnées » est affiché

  var els = {
    form: document.getElementById('form'),
    cityField: document.getElementById('city-field'),
    city: document.getElementById('city'),
    citySuggest: document.getElementById('city-suggest'),
    cityError: document.getElementById('city-error'),
    datesField: document.getElementById('dates-field'),
    dateStart: document.getElementById('date-start'),
    dateEnd: document.getElementById('date-end'),
    durationHint: document.getElementById('duration-hint'),
    datesError: document.getElementById('dates-error'),
    tentToggle: document.getElementById('tent-toggle'),
    budget: document.getElementById('budget'),
    budgetHint: document.getElementById('budget-hint'),
    transport: document.getElementById('transport'),
    radius: document.getElementById('radius'),
    radiusUnit: document.getElementById('radius-unit'),
    radiusValueWrap: document.getElementById('radius-value-wrap'),
    radiusValueDisplay: document.getElementById('radius-value-display'),
    radiusDec: document.getElementById('radius-dec'),
    radiusInc: document.getElementById('radius-inc'),
    minDistanceField: document.getElementById('min-distance-field'),
    minDistance: document.getElementById('min-distance'),
    minDistanceDec: document.getElementById('min-distance-dec'),
    minDistanceInc: document.getElementById('min-distance-inc'),
    maxDistance: document.getElementById('max-distance'),
    maxDistanceDec: document.getElementById('max-distance-dec'),
    maxDistanceInc: document.getElementById('max-distance-inc'),
    minDistanceError: document.getElementById('min-distance-error'),
    legDistance: document.getElementById('leg-distance'),
    legDistanceDec: document.getElementById('leg-distance-dec'),
    legDistanceInc: document.getElementById('leg-distance-inc'),
    daysPerCityField: document.getElementById('days-per-city-field'),
    minDaysPerCity: document.getElementById('min-days-per-city'),
    minDaysPerCityDec: document.getElementById('min-days-per-city-dec'),
    minDaysPerCityInc: document.getElementById('min-days-per-city-inc'),
    maxDaysPerCity: document.getElementById('max-days-per-city'),
    maxDaysPerCityDec: document.getElementById('max-days-per-city-dec'),
    maxDaysPerCityInc: document.getElementById('max-days-per-city-inc'),
    daysPerCityError: document.getElementById('days-per-city-error'),
    modeKm: document.getElementById('mode-km'),
    modeH: document.getElementById('mode-h'),
    clock: document.getElementById('clock'),
    reveal: document.getElementById('reveal'),
    compass: document.getElementById('compass'),
    rouletteLabel: document.getElementById('roulette-label'),
    rouletteName: document.getElementById('roulette-name'),
    rouletteClue: document.getElementById('roulette-clue'),
    stamp: document.getElementById('stamp'),
    revealReal: document.getElementById('reveal-real'),
    revealRegion: document.getElementById('reveal-region'),
    mapCard: document.getElementById('map-card'),
    mapWrap: document.getElementById('map-wrap'),
    timeline: document.getElementById('timeline'),
    timelineStats: document.getElementById('timeline-stats'),
    days: document.getElementById('days'),
    exportRow: document.getElementById('export-row'),
    exportPdfBtn: document.getElementById('export-pdf-btn'),
    exportHint: document.getElementById('export-hint'),
    packCard: document.getElementById('pack-card'),
    packProgress: document.getElementById('pack-progress'),
    packSub: document.getElementById('pack-sub'),
    packGrid: document.getElementById('pack-grid'),
    againRow: document.getElementById('again-row'),
    againBtn: document.getElementById('again-btn'),
    launchBtn: document.getElementById('launch-btn'),
    formError: document.getElementById('form-error'),
    tollToggle: document.getElementById('toll-toggle'),
    tollField: document.getElementById('toll-field'),
    tollBikeHint: document.getElementById('toll-bike-hint'),
    radiusField: document.getElementById('radius-field'),
    radiusError: document.getElementById('radius-error'),
    radiusLabel: document.getElementById('radius-label'),
    legDistanceField: document.getElementById('leg-distance-field'),
    legDistanceError: document.getElementById('leg-distance-error'),
    ferryToggle: document.getElementById('ferry-toggle'),
    tensionToggle: document.getElementById('tension-toggle')
  };

  // Une commune réelle différente à chaque chargement de la page plutôt qu'un exemple toujours
  // identique ("Ex. Lyon ou 69001") — dans l'esprit "mystère" du site. Filtrée sur une population
  // minimale pour rester un exemple lisible (pas un hameau de 12 habitants au nom obscur), et sur
  // 16 caractères maximum pour le nom : au-delà, "Ex. <nom> ou <cp>" ne tient plus dans le champ
  // sans réduire la taille du texte du placeholder (vérifié empiriquement). Repli en cascade sur un
  // filtre moins strict si l'un d'eux ne laissait rien (improbable, mais gratuit à couvrir).
  // La commune elle-même est tirée une seule fois par chargement de page (pas à chaque changement
  // de langue) — seul le gabarit "Ex. X ou CP" autour d'elle est retraduit (voir placeholderText(),
  // rappelée par l'écouteur 'i18n:langchange' plus bas).
  var placeholderCommune = null;
  // Sans COMMUNES chargé côté client (voir README, "Recherche et tirage aléatoire côté
  // serveur"), la commune d'exemple du placeholder est tirée d'une petite liste fixe plutôt
  // que de la base complète — un échantillon volontairement varié (plusieurs pays), pas
  // besoin de plus pour ce simple exemple de saisie.
  var PLACEHOLDER_EXAMPLES = [
    {name:'Sainte-Foy', cps:['85150']}, {name:'Chenonceaux', cps:['37150']},
    {name:'Sevilla', cps:['41001']}, {name:'Brugge', cps:['8000']},
    {name:'Locarno', cps:['6600']}, {name:'Kraków', cps:['31-000']},
    {name:'Split', cps:['21000']}, {name:'Tórshavn', cps:['100']}
  ];
  function pickPlaceholderCommune(){
    return PLACEHOLDER_EXAMPLES[Math.floor(Math.random() * PLACEHOLDER_EXAMPLES.length)];
  }
  function placeholderText(){
    if(!placeholderCommune) placeholderCommune = pickPlaceholderCommune();
    return t('form.city.placeholder', {name: placeholderCommune.name, cp: placeholderCommune.cps[0]});
  }

  // Les données sont chargées : on peut activer la recherche de ville.
  els.city.disabled = false;
  els.city.placeholder = placeholderText();

  function tickClock(){
    var d = new Date();
    els.clock.textContent = localeDateText(d, {weekday:'long', day:'numeric', month:'long'});
  }
  tickClock();

  /* ---------- DATES DU SÉJOUR ---------- */
  var MAX_TRIP_DAYS = 21;
  var MAX_STOPS = 15; // nombre maximum de villes-étapes distinctes sur un même trajet
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
    var parts = s.split('-');
    if(parts.length !== 3) return null;
    return new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
  }
  function formatFrDate(iso){
    var d = parseIsoDate(iso);
    if(!d) return '';
    return localeDateText(d, {day:'numeric', month:'short'});
  }
  // Dates en chiffres (15e audit du 19/09/2026, voir I18N.numericDates) : touroyo et adyguéen, sans données de dates dans
  // le navigateur, recevaient les noms de mois de leur locale de repli (« Eyl » turc, « сент. » russe). Jour et mois sur
  // deux chiffres, dans l'ordre jour.mois de ces deux locales de repli (turc et russe : « 20.09 », « 20.09.2026 »), écrits
  // ici plutôt que par Intl : sans année, ICU mélange « 05/09 » et « 20.9 – 23.9 » en turc. Jour de la semaine omis.
  function numericDatesLang(){ return !!(window.I18N.numericDates && window.I18N.numericDates(VISITOR_LANG)); }
  function numericDateText(d, opts){
    var p = function(n){ return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + (opts && opts.year ? '.' + d.getFullYear() : '');
  }
  // Nom d'un pays dans la langue d'interface — Intl.DisplayNames, sinon le nom des données (COUNTRIES[..].name, en
  // FRANÇAIS) ou celui reçu du serveur. Factorisé au 17e audit du 20/09/2026 pour les quatre emplois (infobulle des
  // suggestions, avertissement moto à l'écran et dans le PDF, étiquette de vignette).
  // La 16e passe avait coupé Intl.DisplayNames pour le touroyo et l'adyguéen, au motif qu'il répond dans la LOCALE DE
  // REPLI : c'était remplacer un nom lisible par un mot d'une TROISIÈME langue, encore moins lisible. Le repli de ces
  // deux langues n'est pas quelconque (voir LOCALE_FALLBACK dans i18n.js) : c'est la langue de contact de leurs
  // locuteurs, DANS LEUR PROPRE ÉCRITURE — russe (cyrillique) pour l'adyguéen de la république d'Adyguée, turc (latin)
  // pour le touroyo du Tur Abdin. « Швейцария » et « İsviçre » sont donc lus par ce public ; « Suisse » ne l'est pas.
  // Le principe retenu : jamais un mot d'une langue tierce MOINS lisible que l'alternative — ici le repli gagne, alors
  // que pour les dates et les durées (numericDatesLang, durationWords) le format neutre en chiffres gagne, parce qu'il
  // se passe entièrement de mots. Aucune exception par langue : Intl.DisplayNames pour tout le monde.
  function countryDisplayName(cc, fallback){
    var name = fallback || (COUNTRIES[cc] && COUNTRIES[cc].name) || cc || '';
    if(!cc) return name;
    try { name = new Intl.DisplayNames([localeTag()], { type: 'region' }).of(cc) || name; } catch(e){}
    return name;
  }
  function localeDateText(d, opts){
    return numericDatesLang() ? numericDateText(d, opts) : d.toLocaleDateString(localeTag(), opts);
  }
  // Une seule ligne "Trouver un logement" par séjour (voir buildItinerary), pas une par nuit :
  // le libellé doit donc pouvoir couvrir une plage ("20 août → 22 août") plutôt qu'une seule date
  // quand le séjour dure plus d'une nuit.
  // Plage de dates dans la langue d'interface (12e audit du 19/09/2026) : Intl.DateTimeFormat#formatRange (« 20–22 août »,
  // « ٢٠–٢٢ أغسطس », « 8月20日～22日 »), qui connaît l'ordre et le séparateur de chaque langue — la flèche « → » écrite en
  // dur pointait à rebours en arabe, persan, ourdou, sorani et divehi (écriture de droite à gauche). Sans formatRange :
  // deux dates séparées par un tiret demi-cadratin, sans direction.
  function formatDateRange(d1, d2, opts){
    // 16e audit du 20/09/2026 : une plage à cheval sur deux années s'écrivait « 31.12–02.01 », sans le moindre repère
    // d'année — Intl l'ajoute de lui-même dans les autres langues. Année portée par les DEUX dates dès qu'elles
    // diffèrent (« 31.12.2026–02.01.2027 »), et toujours quand l'appelant la demande.
    if(numericDatesLang()){
      var yearOpts = ((opts && opts.year) || d1.getFullYear() !== d2.getFullYear()) ? { year: 'numeric' } : null;
      return numericDateText(d1, yearOpts) + '–' + numericDateText(d2, yearOpts);
    }
    try {
      var dtf = new Intl.DateTimeFormat(localeTag(), opts);
      if(typeof dtf.formatRange === 'function') return dtf.formatRange(d1, d2);
      return dtf.format(d1) + ' – ' + dtf.format(d2);
    } catch(e){ return isoDate(d1) + ' – ' + isoDate(d2); }
  }
  function formatStayRange(checkIn, checkOut){
    var d1 = parseIsoDate(checkIn), d2 = parseIsoDate(checkOut);
    var nights = (d1 && d2) ? Math.round((d2 - d1) / 86400000) : 1;
    return nights > 1 ? formatDateRange(d1, d2, {day: 'numeric', month: 'short'}) : formatFrDate(checkIn);
  }
  (function initDates(){
    var today = new Date();
    today.setHours(0,0,0,0);
    var defaultStart = today; // par défaut, un départ aujourd'hui
    var defaultEnd = addDays(defaultStart, 2); // par défaut, un séjour de 3 jours / 2 nuits
    els.dateStart.min = isoDate(today);
    els.dateStart.value = isoDate(defaultStart);
    els.dateEnd.min = isoDate(defaultStart); // même jour autorisé (virée sans nuitée)
    els.dateEnd.value = isoDate(defaultEnd);
  })();
  function clearDatesError(){ clearFieldError(els.datesField, els.datesError); }
  // Convention standard (hôtellerie/voyage) : le nombre de nuits est l'écart en jours calendaires
  // entre arrivée et retour (0 si même jour = virée sans nuitée) ; le nombre de "jours" du séjour
  // est nuits + 1 (le jour d'arrivée compte, celui de retour aussi). Ex. du 7 au 9 = 2 nuits, 3 jours.
  function tripNightsAndDays(start, end){
    var rawNights = Math.round((end - start) / 86400000);
    var nights = Math.max(0, Math.min(MAX_TRIP_DAYS - 1, rawNights));
    return { nights: nights, days: nights + 1, capped: nights < rawNights };
  }
  // Durée du séjour (« 3 jours (2 nuits) ») : « 1 jour » sans nuitée (11e audit : « 1 jours (0 nuits) » dans le message
  // de distance d'éloignement). Langues à plusieurs formes plurielles (russe, polonais, tchèque… : « 3 дня », « 5 дней ») :
  // nombre + forme exacte (I18N.plural, clés stats.days et dur.nights), dans l'ordre de la langue ; sinon les phrases
  // traduites telles quelles.
  function durationLabel(days, nights){
    if(nights <= 0) return t('form.dates.oneDay');
    var P = window.I18N.plural;
    var dWord = P && P('stats.days', days), nWord = P && P('dur.nights', nights);
    if(dWord && nWord){
      // Duel arabe sans nombre devant (« ٣ أيام (ليلتان) », 14e audit du 19/09/2026 : voir dualWithoutNumber).
      var d = dualWithoutNumber(days) ? dWord : null, n = dualWithoutNumber(nights) ? nWord : null;
      return nounFirstLang()
        ? (d || dWord + ' ' + formatNum(days)) + ' (' + (n || nWord + ' ' + formatNum(nights)) + ')'
        : (d || formatNum(days) + ' ' + dWord) + ' (' + (n || formatNum(nights) + ' ' + nWord) + ')';
    }
    return t(nights === 1 ? 'form.dates.duration1' : 'form.dates.durationN', {days: formatNum(days), nights: formatNum(nights)});
  }
  // « — 21 jours max » (12e audit du 19/09/2026) : la phrase traduite porte le pluriel générique du mot « jours »
  // (stats.days : « дней », « zile », « dienas »…), faux pour 21 dans bien des langues (« 21 день », « 21 de zile »,
  // « 21 diena », « 21 dan », « 21 يومًا »). Quand I18N.plural connaît la forme exacte pour ce nombre, elle remplace ce
  // mot (mot entier seulement) ; sinon la phrase reste telle quelle.
  function maxDaysSuffix(){
    var txt = t('form.dates.maxSuffix', {max: formatNum(MAX_TRIP_DAYS)});
    var exact = window.I18N.plural ? window.I18N.plural('stats.days', MAX_TRIP_DAYS) : null;
    var generic = t('stats.days');
    if(!exact || exact === generic) return txt;
    try {
      var esc = generic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return txt.replace(new RegExp('(^|[^\\p{L}\\p{M}])' + esc + '(?![\\p{L}\\p{M}])', 'u'), function(m, before){ return before + exact; });
    } catch(e){ return txt; }
  }
  function updateDatesHint(){
    var start = parseIsoDate(els.dateStart.value);
    var end = parseIsoDate(els.dateEnd.value);
    if(start && end && end >= start){
      els.dateEnd.min = isoDate(start);
      var dur = tripNightsAndDays(start, end);
      var label = durationLabel(dur.days, dur.nights);
      els.durationHint.textContent = label + (dur.capped ? maxDaysSuffix() : '');
      clearDatesError();
    } else {
      els.durationHint.textContent = t('form.dates.placeholder');
    }
  }
  els.dateStart.addEventListener('change', function(){
    var start = parseIsoDate(els.dateStart.value);
    var end = parseIsoDate(els.dateEnd.value);
    if(start){
      els.dateEnd.min = isoDate(start);
      if(!end || end < start){ els.dateEnd.value = isoDate(addDays(start,2)); } // 3 jours / 2 nuits par défaut
    }
    updateDatesHint();
  });
  els.dateEnd.addEventListener('change', updateDatesHint);
  // Toute modification des dates retire l'erreur affichée (date passée, date manquante…) : elle sera recalculée à l'envoi.
  // Le message « trop loin pour 1 jour » de la distance d'éloignement dépend aussi de la durée : retiré de même.
  [els.dateStart, els.dateEnd].forEach(function(el){
    el.addEventListener('input', function(){ clearDatesError(); clearMinDistanceError(); });
    el.addEventListener('change', function(){ clearDatesError(); clearMinDistanceError(); });
  });
  updateDatesHint();
  function getTripDays(){
    var start = parseIsoDate(els.dateStart.value);
    var end = parseIsoDate(els.dateEnd.value);
    if(!start || !end || end < start) return null;
    return tripNightsAndDays(start, end).days;
  }

  /* ---------- CITY VALIDATION ---------- */
  // Messages d'erreur des champs : une fonction qui produit le texte dans la langue COURANTE, gardée sur l'élément
  // pour être rappelée au changement de langue (voir l'écouteur 'i18n:langchange' ; sans ça, #city-error retombait
  // sur son texte data-i18n « Merci d'indiquer une ville de départ » quel que soit le vrai message affiché).
  function msg(key, vars){ return function(){ return t(key, typeof vars === 'function' ? vars() : vars); }; }
  function setErrorText(el, message){
    el.__message = typeof message === 'function' ? message : null;
    el.textContent = el.__message ? el.__message() : message;
  }
  function retranslateErrors(){
    [els.cityError, els.datesError, els.radiusError, els.minDistanceError, els.legDistanceError, els.daysPerCityError, els.formError].forEach(function(el){
      if(el && el.__message && el.classList.contains('show')) el.textContent = el.__message();
    });
  }
  // Erreurs de champ accessibles (10e audit du 18/09/2026) : le champ fautif porte aria-invalid="true" et le message lui est
  // relié par aria-describedby (ajouté à ce qui y figure déjà, retiré à l'effacement) — sinon un lecteur d'écran lisait le
  // message une fois (role="alert") puis plus rien en revenant sur le champ.
  function addDescribedBy(input, id){
    var ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if(ids.indexOf(id) === -1){ ids.push(id); input.setAttribute('aria-describedby', ids.join(' ')); }
  }
  function removeDescribedBy(input, id){
    var ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(function(x){ return x && x !== id; });
    if(ids.length) input.setAttribute('aria-describedby', ids.join(' ')); else input.removeAttribute('aria-describedby');
  }
  function fieldInputs(field){ return Array.prototype.slice.call(field.querySelectorAll('input, select')); }
  function clearFieldError(field, errEl){
    if(!field || !errEl) return;
    field.classList.remove('invalid');
    errEl.classList.remove('show');
    fieldInputs(field).forEach(function(input){
      input.removeAttribute('aria-invalid');
      removeDescribedBy(input, errEl.id);
    });
  }
  // inputs : champ(s) en cause (le premier reçoit le focus) ; par défaut tous ceux du bloc.
  function showFieldError(field, errEl, message, inputs){
    setErrorText(errEl, message);
    inputs = inputs && inputs.length ? inputs : fieldInputs(field);
    field.classList.add('invalid');
    errEl.classList.add('show');
    fieldInputs(field).forEach(function(input){
      if(inputs.indexOf(input) !== -1){ input.setAttribute('aria-invalid', 'true'); addDescribedBy(input, errEl.id); }
      else { input.removeAttribute('aria-invalid'); removeDescribedBy(input, errEl.id); }
    });
    field.classList.remove('shake');
    void field.offsetWidth; // relance l'animation
    field.classList.add('shake');
    try { inputs[0].focus(); } catch(e){}
  }
  function clearCityError(){ clearFieldError(els.cityField, els.cityError); }
  function showCityError(message){ showFieldError(els.cityField, els.cityError, message, [els.city]); }
  // Erreurs qui ne concernent pas la ville saisie (quota, serveur occupé, délai dépassé, aucun itinéraire, zones
  // déconseillées, erreur de rendu) : affichées sous le bouton de tirage, sans marquer la ville invalide (11e audit — le
  // champ ville était signalé fautif et recevait le focus pour une erreur du serveur). Le bouton garde le focus.
  function showFormError(message){
    if(!els.formError) return showCityError(message);
    // RENDRE VISIBLE D'ABORD, écrire ensuite (18e audit du 21/09/2026). Le texte était posé pendant que la région
    // portait encore « display:none » : une région role="alert" absente du rendu n'est PAS dans l'arbre
    // d'accessibilité, l'insertion n'y déclenche donc aucune annonce, et rendre visible une région DÉJÀ remplie
    // n'est pas annoncé de façon fiable (NVDA, JAWS, VoiceOver). Le quota, le serveur occupé, le délai dépassé, la
    // coupure réseau et l'itinéraire impossible passaient tous par là : rien n'était lu à voix haute.
    // L'écriture est reportée à la tâche suivante pour que la technologie d'assistance ait vu la région apparaître
    // avant que son contenu ne change.
    els.formError.classList.add('show');
    setTimeout(function(){ if(els.formError.classList.contains('show')) setErrorText(els.formError, message); }, 0);
  }
  function clearFormError(){
    if(!els.formError) return;
    els.formError.classList.remove('show');
    els.formError.__message = null;
    els.formError.textContent = '';
  }
  function showDatesError(message, input){ showFieldError(els.datesField, els.datesError, message, [input || els.dateStart]); }

  /* ---------- MIN-DISTANCE VALIDATION ---------- */
  function clearMinDistanceError(){ clearFieldError(els.minDistanceField, els.minDistanceError); }
  function showMinDistanceError(message, input){ showFieldError(els.minDistanceField, els.minDistanceError, message, [input || els.minDistance]); }

  /* ---------- MIN/MAX JOURS PAR VILLE VALIDATION ---------- */
  function clearDaysPerCityError(){ clearFieldError(els.daysPerCityField, els.daysPerCityError); }
  function showDaysPerCityError(message, input){ showFieldError(els.daysPerCityField, els.daysPerCityError, message, [input || els.minDaysPerCity]); }

  /* ---------- RAYON ET DISTANCE ENTRE ÉTAPES ---------- */
  function clearRadiusError(){ clearFieldError(els.radiusField, els.radiusError); }
  function clearLegDistanceError(){ clearFieldError(els.legDistanceField, els.legDistanceError); }

  // Validation propre du site, traduite (10e audit) : le formulaire est en novalidate — la validation native du navigateur
  // (step/min/max) bloquait l'envoi avec une bulle dans la langue du NAVIGATEUR, et empêchait #dates-error de s'afficher.
  // Bornes relues sur les attributs min/max des champs ; le pas (step) n'est pas imposé : une valeur comme 305 km est
  // acceptée telle quelle. Renvoie null si tout va bien, sinon { input, message } pour le premier champ fautif.
  function checkNumberRange(input, allowEmpty){
    var raw = input.value;
    if(input.validity && input.validity.badInput) raw = 'x'; // saisie non numérique (le navigateur renvoie alors '')
    if(raw === '' && allowEmpty) return null;
    var v = parseFloat(raw), min = parseFloat(input.min), max = parseFloat(input.max);
    // Champ de distance (14e audit du 19/09/2026) : la valeur réellement envoyée, en km, doit aussi tenir dans les bornes du
    // moteur (voir unitFieldBounds : toute valeur affichée dans les bornes du champ y tient), et le message donne les
    // bornes avec leur unité (« between 12.4 mi and 745.7 mi », et non « between 13 and 745 »).
    var spec = distanceFieldSpec(input), km = spec && isFinite(v) ? distanceFieldKm(input) : null;
    if(isFinite(v) && (!isFinite(min) || v >= min) && (!isFinite(max) || v <= max) && (!spec || (km >= spec.min && km <= spec.max))) return null;
    return { input: input, message: msg('form.error.range', function(){
      return spec ? { min: formatDistanceValue(min, fieldDistanceUnit, 1), max: formatDistanceValue(max, fieldDistanceUnit, 1) } : { min: formatNum(min), max: formatNum(max) };
    }) };
  }
  // Dates : manquante, passée, ou retour avant l'arrivée — chacune son message exact.
  function checkDates(){
    if(!els.dateStart.value || !parseIsoDate(els.dateStart.value)) return { input: els.dateStart, message: msg('form.dates.error.startRequired') };
    if(!els.dateEnd.value || !parseIsoDate(els.dateEnd.value)) return { input: els.dateEnd, message: msg('form.dates.error.endRequired') };
    var today = new Date(); today.setHours(0, 0, 0, 0);
    if(parseIsoDate(els.dateStart.value) < today) return { input: els.dateStart, message: msg('form.dates.error.past') };
    if(parseIsoDate(els.dateEnd.value) < parseIsoDate(els.dateStart.value)) return { input: els.dateEnd, message: msg('form.dates.error') };
    return null;
  }

  /* ---------- CITY AUTOCOMPLETE (nom ou code postal) ---------- */
  var selectedCity = null; // {name, cp, lat, lon} — n'est posé qu'en choisissant une suggestion
  var currentSuggestions = [];
  var activeSuggestIndex = -1;

  function formatCpBadge(r){
    return (r.allCps && r.allCps.length > 1) ? (r.cp + ' +' + (r.allCps.length - 1)) : r.cp;
  }
  // Émoji drapeau générique à partir d'un code pays ISO 3166-1 alpha-2 (ex. "SM" -> 🇸🇲) : chaque
  // lettre est encodée en "regional indicator symbol" Unicode (U+1F1E6 = 'A' + 127397) — fonctionne
  // pour N'IMPORTE QUEL code à 2 lettres sans table de correspondance à maintenir par pays, y compris
  // Guernesey/Jersey ("GG"/"JE", codes ISO à part entière malgré leur statut de dépendance de la
  // Couronne, tout comme Saint-Marin/Liechtenstein/Andorre n'ont rien de spécial à gérer). Affiché
  // devant le nom dans la liste de suggestions (voir renderSuggestions plus bas) pour distinguer d'un
  // coup d'œil deux communes homonymes de pays différents (ex. "San Marino" saint-marinais vs les
  // sept villages italiens du même nom, la confusion qui a motivé cet ajout) — visible directement,
  // pas seulement au survol, pour rester utile sur mobile.
  function countryFlagEmoji(cc){
    if(!cc || cc.length !== 2) return '';
    var base = 127397; // 0x1F1E6 (regional indicator 'A') - 65 (code de 'A')
    return String.fromCodePoint(base + cc.charCodeAt(0), base + cc.charCodeAt(1));
  }
  function renderSuggestions(results){
    els.citySuggest.innerHTML = '';
    currentSuggestions = results;
    activeSuggestIndex = -1;
    els.city.removeAttribute('aria-activedescendant');
    if(results.length === 0){
      els.citySuggest.classList.remove('show');
      els.city.setAttribute('aria-expanded','false');
      return;
    }
    results.forEach(function(r, idx){
      var li = document.createElement('li');
      li.className = 'suggest-item';
      li.id = 'city-opt-'+idx;
      li.setAttribute('role','option');
      li.setAttribute('aria-selected','false');
      // Drapeau + nom regroupés SOUS le même span flex "suggest-name" (plutôt qu'un troisième enfant
      // direct de la li) : la li reste en `justify-content:space-between` avec exactement DEUX
      // blocs (nom, code postal) comme avant cet ajout — un troisième enfant y aurait cassé la mise
      // en page en espaçant les trois uniformément au lieu de "nom à gauche, cp à droite".
      var nameSpan = document.createElement('span');
      nameSpan.className = 'suggest-name';
      // Drapeau : image SVG hébergée localement (public/img/flags/XX.svg, circle-flags, licence MIT), comme le
      // sélecteur de langue. Les émojis drapeau utilisés jusqu'au 7e audit (18/09/2026) ne s'affichent PAS sous
      // Windows — le système ne fournit aucune image pour les paires d'indicateurs régionaux, et le navigateur
      // retombe sur deux lettres encadrées. Si un fichier venait à manquer, l'émoji reprend sa place (onerror).
      var flagSpan = document.createElement('img');
      flagSpan.className = 'suggest-flag';
      flagSpan.src = 'img/flags/' + String(r.country || '').toLowerCase() + '.svg';
      flagSpan.alt = '';
      flagSpan.loading = 'lazy';
      flagSpan.setAttribute('aria-hidden','true'); // décoratif : le nom du pays est repris en texte dans le title ci-dessous
      flagSpan.addEventListener('error', function(){
        var repli = document.createElement('span');
        repli.className = 'suggest-flag';
        repli.textContent = countryFlagEmoji(r.country);
        repli.setAttribute('aria-hidden','true');
        if(flagSpan.parentNode) flagSpan.parentNode.replaceChild(repli, flagSpan);
      });
      var nameTextSpan = document.createElement('span');
      nameTextSpan.textContent = r.name;
      // Trouvé par un nom dans une autre langue (« san » -> Xanten, alias bas-allemand « Santen ») : ce nom est
      // affiché entre parenthèses, sinon on ne comprend pas pourquoi la ville est proposée.
      if(r.matchedName){
        var matchedSpan = document.createElement('span');
        matchedSpan.className = 'suggest-matched';
        matchedSpan.textContent = ' (' + r.matchedName + ')';
        nameTextSpan.appendChild(matchedSpan);
      }
      // Lieu-dit rattaché à une commune (23/09/2026) : « Belzaises » ne dit pas où il est, « Belzaises ·
      // Saint-Sulpice-sur-Risle » si. Le point sépare deux NOMS DE LIEUX, là où la parenthèse ci-dessus signale un nom
      // dans une autre langue : deux signes différents pour deux sens différents. Jamais affiché quand la commune
      // porte le nom du lieu (ce serait se répéter), ni pour les lieux qui n'en ont pas.
      if(r.commune && r.commune !== r.name){
        var communeSpan = document.createElement('span');
        communeSpan.className = 'suggest-commune';
        communeSpan.textContent = ' · ' + r.commune;
        nameTextSpan.appendChild(communeSpan);
      }
      // Ce qui distingue cette ligne de ses homonymes au rendu identique (voir marquerDistinctions) : région,
      // population ou coordonnée. Absent quand la ligne est déjà seule de son espèce.
      if(r.distinct){
        var distinctSpan = document.createElement('span');
        distinctSpan.className = 'suggest-distinct';
        // Une coordonnée est faite de chiffres et de virgules : en écriture de droite à gauche, elle s'inverserait
        // comme le code postal le faisait avant le 19e audit. Une région, elle, garde le sens de la page.
        if(r.distinctLtr) distinctSpan.setAttribute('dir', 'ltr');
        distinctSpan.textContent = ' · ' + r.distinct;
        nameTextSpan.appendChild(distinctSpan);
      }
      nameSpan.appendChild(flagSpan);
      nameSpan.appendChild(nameTextSpan);
      var cpSpan = document.createElement('span');
      cpSpan.className = 'suggest-cp';
      // Même raison que pour les devises : « 69001 +8 » s'affichait « 8+ 69001 » dans une page de droite à gauche,
      // le « + » étant neutre (19e audit du 21/09/2026).
      cpSpan.setAttribute('dir', 'ltr');
      cpSpan.textContent = formatCpBadge(r);
      // Nom du pays dans la langue d'interface (COUNTRIES[..].name est en français) — voir countryDisplayName.
      var countryName = countryDisplayName(r.country, (COUNTRIES[r.country] && COUNTRIES[r.country].name) || '');
      if(countryName) li.setAttribute('title', countryName); // survol : nom du pays en clair, pas seulement le drapeau
      // …et dans le NOM ACCESSIBLE (18e audit du 21/09/2026). Le drapeau est une image décorative et « title » n'est
      // qu'une DESCRIPTION, que les lecteurs d'écran ne lisent pas par défaut dans une liste et qui n'existe pas au
      // toucher : une saisie « Lyon » annonçait cinq « Lyons » suivis d'un code postal, sans moyen de savoir lequel
      // est en France. Le nom du pays est donc ajouté au contenu de l'option, hors écran.
      li.appendChild(nameSpan);
      li.appendChild(cpSpan);
      if(countryName){
        var paysSpan = document.createElement('span');
        paysSpan.className = 'visually-hidden';
        paysSpan.textContent = ' ' + countryName;
        li.appendChild(paysSpan);
      }
      li.addEventListener('mousedown', function(e){ e.preventDefault(); selectCommune(r); });
      els.citySuggest.appendChild(li);
    });
    els.citySuggest.classList.add('show');
    els.city.setAttribute('aria-expanded','true');
  }
  function selectCommune(r){
    // Recherche en attente ou relance programmée invalidée : la liste ne doit pas se rouvrir après le choix.
    ++searchRequestSeq;
    clearTimeout(searchDebounceTimer);
    selectedCity = { name:r.name, cp:r.cp, allCps:r.allCps, lat:r.lat, lon:r.lon, dept:r.dept, country:r.country };
    // Le code postal est FACULTATIF depuis le 21/09/2026 : 98 910 lieux publiés n'en ont pas. Sans cette garde, le
    // champ affichait « Hrazdan () » — une parenthèse vide. Les quatre autres endroits qui affichent un code postal
    // la posaient déjà ; celui-ci avait été oublié (23/09/2026).
    els.city.value = r.cp ? r.name + ' (' + r.cp + ')' : r.name;
    hideSuggestions();
    clearCityError();
    updateBudgetHint(); // la devise du plafond affiché dépend du pays de la ville choisie (voir plus bas)
  }
  // Message non sélectionnable dans la liste (ex. moteur encore en chargement côté serveur) : sans lui, la
  // liste restait simplement vide et l'autocomplétion semblait cassée pendant le démarrage du serveur.
  // Annonce de la recherche de ville aux lecteurs d'écran (23/09/2026). Même motif que `annoncer` dans i18n.js pour le
  // sélecteur de langue, et pour les mêmes raisons mesurées au 20e audit : réécrire le MÊME texte n'annonce rien chez
  // la plupart des lecteurs, donc on vide puis on écrit au tour suivant ; le texte courant est mémorisé pour ne pas
  // répéter la phrase à chaque frappe d'une recherche déjà vide ; le minuteur en attente est toujours annulé, sans
  // quoi une annonce périmée s'écrit APRÈS que la liste a été remplie.
  var rechercheLiveTexte = '';
  var rechercheLiveTimer = null;
  function annonceRecherche(texte){
    // getElementById absent : renderSuggestions est aussi exécutée dans un DOM factice par tests/ui.test.js, qui ne
    // fournit que createElement. L'annonce est un supplément, jamais une condition d'affichage de la liste.
    if(typeof document.getElementById !== 'function') return;
    var live = document.getElementById('city-search-announce');
    if(!live) return;
    texte = texte || '';
    if(texte === rechercheLiveTexte) return;
    if(rechercheLiveTimer){ clearTimeout(rechercheLiveTimer); rechercheLiveTimer = null; }
    rechercheLiveTexte = texte;
    live.textContent = '';
    if(!texte) return;
    rechercheLiveTimer = setTimeout(function(){ rechercheLiveTimer = null; live.textContent = texte; }, 0);
  }
  // SUGGESTIONS INDISCERNABLES (23/09/2026). Deux lignes qui affichent exactement le même texte ne désignent rien :
  // le visiteur ne peut pas choisir. C'est le prix du démasquage des homonymes du 22/09 — avant lui, un seul lieu par
  // couple (nom, code postal) était proposé, donc la question ne se posait pas. Mesuré sur les données publiées :
  // 237 599 groupes rendaient au moins deux lignes au rendu identique, soit 789 499 lignes. « Xincun », code CN-30,
  // en rend 287 à lui seul, et les deux Robīt d'Éthiopie — 20 679 habitants et population inconnue, 227 km d'écart —
  // s'affichaient « Robīt — ET-46 » l'un comme l'autre.
  //
  // Chaque ligne reçoit donc ce qui la DISTINGUE de ses homonymes, et seulement quand elle en a. Trois étapes, de la
  // plus parlante à la plus sûre : la RÉGION, sinon la POPULATION, sinon la COORDONNÉE. Les deux premières viennent
  // de la réponse et ne coûtent rien ; la troisième ne se lit pas bien, mais elle désigne TOUJOURS, et elle n'est
  // employée que là où rien d'autre ne sépare les fiches — mesuré : la région et la population sont identiques pour
  // les 287 Xincun comme pour les 8 Kārēz d'Afghanistan.
  // Aucune recherche spatiale ici : un « près de telle ville » serait plus lisible, mais il demanderait une requête
  // de voisinage par suggestion, sur le chemin le plus chaud du moteur, à chaque frappe.
  function coordTexte(r){
    var n = function(v){ return Number(v).toLocaleString(localeTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    // Séparateur « / » et non « , » : dans les langues à virgule décimale — le français en tête — « 31,23, 119,20 »
    // aligne trois virgules qui font deux métiers différents, et la paire devient illisible. Constaté à l'écran en
    // production le 23/09/2026, sur la langue par défaut du site.
    return n(r.lat) + ' / ' + n(r.lon);
  }
  function popTexte(r){
    var vars = { n: r.pop.toLocaleString(localeTag()) };
    return pluralPhrase('reveal.inhabitants', r.pop, vars) || t('reveal.inhabitants', vars);
  }
  // Un groupe encore ambigu est redécoupé par l'étape suivante. Une étape qui ne sépare rien est sautée sans rien
  // afficher : mieux vaut aucune mention qu'une mention identique partout.
  function affinerDistinctions(groupe, etape){
    if(groupe.length < 2) return;
    if(etape >= 2){
      groupe.forEach(function(r){ r.distinct = coordTexte(r); r.distinctLtr = true; });
      return;
    }
    var valeur = etape === 0 ? function(r){ return r.dept || ''; } : function(r){ return r.pop ? popTexte(r) : ''; };
    var sous = {}, ordre = [];
    groupe.forEach(function(r){
      var v = valeur(r);
      if(!Object.prototype.hasOwnProperty.call(sous, v)){ sous[v] = []; ordre.push(v); }
      sous[v].push(r);
    });
    if(ordre.length < 2) return affinerDistinctions(groupe, etape + 1); // cette étape ne distingue rien
    ordre.forEach(function(v){
      if(v) sous[v].forEach(function(r){ r.distinct = v; r.distinctLtr = false; });
      affinerDistinctions(sous[v], etape + 1); // sous-groupe encore ambigu : on affine, quitte à remplacer
    });
  }
  function marquerDistinctions(results){
    var parTexte = {}, ordre = [];
    results.forEach(function(r){
      r.distinct = null; r.distinctLtr = false;
      // La clé est EXACTEMENT ce que la ligne montre aujourd'hui (voir renderSuggestions) : drapeau, nom, nom
      // alternatif, commune de rattachement, code postal. Deux fiches qui en diffèrent sont déjà distinguables.
      var k = r.country + '|' + r.name + '|' + (r.matchedName || '') + '|' + (r.cp || '') + '|' + (r.commune || '');
      if(!Object.prototype.hasOwnProperty.call(parTexte, k)){ parTexte[k] = []; ordre.push(k); }
      parTexte[k].push(r);
    });
    ordre.forEach(function(k){ affinerDistinctions(parTexte[k], 0); });
    return results;
  }
  function renderSuggestMessage(text){
    els.citySuggest.innerHTML = '';
    currentSuggestions = [];
    activeSuggestIndex = -1;
    els.city.removeAttribute('aria-activedescendant');
    var li = document.createElement('li');
    li.className = 'suggest-item suggest-message';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-disabled', 'true');
    li.textContent = text;
    els.citySuggest.appendChild(li);
    els.citySuggest.classList.add('show');
    els.city.setAttribute('aria-expanded', 'true');
  }

  function hideSuggestions(){
    // Comme selectCommune : une réponse ou une relance arrivant après la fermeture ne rouvre pas la liste.
    ++searchRequestSeq;
    clearTimeout(searchDebounceTimer);
    els.citySuggest.classList.remove('show');
    els.citySuggest.innerHTML = '';
    currentSuggestions = [];
    activeSuggestIndex = -1;
    els.city.setAttribute('aria-expanded','false');
    els.city.removeAttribute('aria-activedescendant');
  }
  function updateActiveSuggest(){
    var items = els.citySuggest.querySelectorAll('.suggest-item');
    items.forEach(function(it, i){
      var active = i === activeSuggestIndex;
      it.classList.toggle('active', active);
      it.setAttribute('aria-selected', active ? 'true':'false');
      if(active) it.scrollIntoView({block:'nearest'});
    });
    // Option active annoncée par les lecteurs d'écran alors que le focus reste dans le champ.
    var activeItem = activeSuggestIndex >= 0 ? items[activeSuggestIndex] : null;
    if(activeItem && activeItem.id) els.city.setAttribute('aria-activedescendant', activeItem.id);
    else els.city.removeAttribute('aria-activedescendant');
  }

  // Recherche via /api/search-city (voir README, "Recherche et tirage aléatoire côté serveur") —
  // plus de COMMUNES/ALIASES en mémoire côté client. Débattue (150 ms) pour ne pas envoyer une
  // requête à chaque frappe, avec un numéro de séquence pour ignorer une réponse en retard qui
  // arriverait APRÈS une saisie plus récente (une requête réseau peut répondre dans le désordre,
  // contrairement à l'ancienne recherche locale synchrone qui n'avait pas ce risque).
  var searchDebounceTimer = null;
  var searchRequestSeq = 0;
  els.city.addEventListener('input', function(){
    selectedCity = null;
    if(els.city.value.trim()) clearCityError();
    updateBudgetHint(); // ville désélectionnée : retombe sur la devise par défaut (EUR)
    var query = els.city.value;
    // Liste de la saisie PRÉCÉDENTE vidée dès la frappe (10e audit du 18/09/2026) : taper « Nantes » par-dessus « lyon »
    // puis Flèche bas + Entrée avant l'arrivée des nouveaux résultats choisissait encore « Lyon ».
    hideSuggestions();
    var mySeq = ++searchRequestSeq;
    clearTimeout(searchDebounceTimer);
    // 3 caractères minimum, ou 2 caractères idéographiques (北京, 東京 : voir SHORT_IDEOGRAPHIC_INDEX côté serveur).
    var trimmedQuery = query.trim();
    if(trimmedQuery.length < 3 && !(trimmedQuery.length === 2 && /^[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uf900-\ufaff]{2}$/.test(trimmedQuery))){ renderSuggestions([]); return; }
    function runSearch(){
      // country : pays de la langue d'interface (I18N.country), dont les villes passent en tête des suggestions.
      // La saisie part dans le CORPS, pas dans l'URL (17e audit du 20/09/2026) : le pare-feu de l'hébergement répond
      // 404 à la place du site pour certaines URL contenant de l'écriture arabe — 28 % des grandes villes dont le nom
      // arabe est publié étaient introuvables, la requête n'arrivant jamais au serveur. Le corps, lui, passe. Voir
      // searchCityHandler dans server.js, qui sert toujours le GET par ailleurs.
      fetch('/api/search-city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, limit: 20, country: window.I18N.country(), lang: window.I18N.current() })
      })
        .then(function(r){
          // 503 : soit le serveur vient de démarrer et charge encore ses ~4 millions de lieux (jusqu'à une minute
          // ou plus), soit il est surchargé ({error:'busy'}). 429 : trop de recherches en une minute.
          if(r.status === 429) return { tooMany: true };
          if(r.status === 503){
            return r.json().catch(function(){ return {}; }).then(function(body){
              return body && body.error === 'busy' ? { busy: true } : { loading: true };
            });
          }
          // Tout autre refus (400, 404, 500…) : DIRE que la recherche a échoué (18e audit du 21/09/2026). La liste
          // se refermait sans un mot, exactement comme pour « cette ville n'existe pas » — c'est ce qui a rendu si
          // long le diagnostic du 404 posé par le pare-feu de l'hébergement à la 17e passe : côté visiteur, une
          // panne d'infrastructure et une saisie sans résultat se ressemblaient trait pour trait.
          if(!r.ok) return { échec: true };
          return r.json();
        })
        .then(function(data){
          if(mySeq !== searchRequestSeq) return; // une saisie plus récente (ou la fermeture de la liste) a pris le relais
          if(data.échec){ renderSuggestMessage(t('error.network')); return; }
          if(data.tooMany){ renderSuggestMessage(t('error.tooManyRequests')); return; }
          if(data.loading || data.busy){
            renderSuggestMessage(t(data.busy ? 'error.serverBusy' : 'form.city.loadingPlaceholder'));
            // Relance de la même recherche (2 s au démarrage, 5 s si surchargé) seulement si le champ a toujours le
            // focus et que la saisie n'a pas changé — sinon la liste se rouvrait toute seule après la perte du focus.
            searchDebounceTimer = setTimeout(function(){
              if(mySeq !== searchRequestSeq || document.activeElement !== els.city || els.city.value !== query) return;
              runSearch();
            }, data.busy ? 5000 : 2000);
            return;
          }
          // Recherche SANS RÉSULTAT : on le dit (22/09/2026, demande de l'utilisateur). La liste se refermait en
          // silence — le sélecteur de langue, lui, affiche « Aucune langue trouvée » depuis la 19e passe. Le message
          // n'est montré QUE pour une réponse du serveur : une saisie trop courte referme la liste comme avant, sans
          // reprocher au visiteur de ne pas avoir fini de taper (voir l'autre appel à renderSuggestions).
          var trouvés = data.results || [];
          if(!trouvés.length){ renderSuggestMessage(t('form.city.searchNoResults')); annonceRecherche(t('form.city.searchNoResults')); }
          else { renderSuggestions(marquerDistinctions(trouvés)); annonceRecherche(''); }
        })
        // Panne réseau : même traitement que le tirage depuis la 16e passe — on le dit, au lieu de refermer la liste.
        .catch(function(){ if(mySeq === searchRequestSeq) renderSuggestMessage(t('error.network')); });
    }
    searchDebounceTimer = setTimeout(runSearch, 150);
  });
  els.city.addEventListener('keydown', function(e){
    if(!els.citySuggest.classList.contains('show')) return;
    // Liste sans option sélectionnable (message « chargement… ») : les flèches ne sélectionnent rien.
    if((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !currentSuggestions.length){ e.preventDefault(); return; }
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      activeSuggestIndex = Math.min(activeSuggestIndex+1, currentSuggestions.length-1);
      updateActiveSuggest();
    } else if(e.key === 'ArrowUp'){
      e.preventDefault();
      // Flèche haut sans option active : dernière option (comportement habituel d'une liste déroulante), au lieu de
      // sélectionner la première comme la flèche bas (10e audit).
      activeSuggestIndex = activeSuggestIndex < 0 ? currentSuggestions.length - 1 : Math.max(activeSuggestIndex-1, 0);
      updateActiveSuggest();
    } else if(e.key === 'Enter'){
      if(activeSuggestIndex >= 0 && currentSuggestions[activeSuggestIndex]){
        e.preventDefault();
        selectCommune(currentSuggestions[activeSuggestIndex]);
      }
    } else if(e.key === 'Escape'){
      hideSuggestions();
    }
  });
  els.city.addEventListener('blur', function(){ setTimeout(hideSuggestions, 120); });

  /* ---------- RADIUS MODE TOGGLE ---------- */
  // En mode heures, le champ affiche directement la durée mise en forme (ex. "4h30") par-dessus
  // le nombre décimal brut (ex. "4.5") — voir .radius-value-display en CSS — plutôt que de
  // l'indiquer seulement à côté. Le texte d'unité n'a donc plus besoin de répéter le "h".
  function updateRadiusUnitLabel(){
    if(radiusMode === 'h'){
      var h = parseFloat(els.radius.value) || 0;
      var durationTxt = formatDurationMin(h * 60, true);
      els.radiusValueDisplay.textContent = durationTxt;
      // Libellé long (swahili, tamoul, ourdou…) : texte réduit plutôt que coupé, puisque le nombre saisi est transparent
      // dans ce mode. Le même texte, en forme longue, est donné aux lecteurs d'écran (l'incrustation est aria-hidden).
      els.radiusValueWrap.classList.add('show-duration');
      els.radiusUnit.textContent = t('form.radius.unitH');
      fitRadiusDisplay();
      // Valeur annoncée sous sa forme lisible (« 4 h et 30 min ») : aria-valuetext, et non aria-label, qui était ignoré
      // puisque le champ est déjà nommé par aria-labelledby (10e audit du 18/09/2026).
      els.radius.setAttribute('aria-valuetext', formatDurationMin(h * 60));
    } else {
      els.radiusValueWrap.classList.remove('show-duration');
      els.radiusValueWrap.classList.remove('two-lines');
      // En distance, la valeur est annoncée avec son unité (km ou mi, celle des champs : voir fieldDistanceUnit).
      var dv = parseFloat(els.radius.value);
      if(isFinite(dv)) els.radius.setAttribute('aria-valuetext', formatDistanceValue(dv, fieldDistanceUnit, 1)); else els.radius.removeAttribute('aria-valuetext');
      els.radiusUnit.textContent = t('form.radius.unitKm', distanceUnitVars());
    }
  }
  // Taille du libellé réduite pas à pas jusqu'à ce qu'il tienne dans le champ (« 11 ம.நே. 30 நிமி. » en tamoul, « saa 11
  // na dak 30 » en swahili) : le nombre saisi étant transparent dans ce mode, un texte coupé rendait la valeur illisible.
  // 10e audit : la réduction descendait jusqu'à 0,5rem (8 px), illisible (tamoul à 320 px). Plancher à 0,72rem ; au-delà,
  // le libellé passe sur deux lignes dans le champ (classe two-lines) plutôt que de rapetisser encore.
  function fitRadiusDisplay(){
    var el = els.radiusValueDisplay;
    els.radiusValueWrap.classList.remove('two-lines');
    var sizes = ['', '0.86rem', '0.78rem', '0.72rem'];
    for(var i = 0; i < sizes.length; i++){
      el.style.fontSize = sizes[i];
      if(el.scrollWidth <= el.clientWidth + 1) return;
    }
    els.radiusValueWrap.classList.add('two-lines');
    el.style.fontSize = '0.72rem';
  }
  // Champs de distance du formulaire dans l'unité d'affichage (13e audit du 19/09/2026) : le visiteur saisit des miles
  // quand l'unité est le mile ; bornes et pas convertis depuis les valeurs en kilomètres ci-dessous (celles d'index.html) ;
  // pas de 10 km -> 5 mi. fieldDistanceUnit : unité dans laquelle les champs sont exprimés à cet instant (le HTML arrive
  // en km).
  // 14e audit du 19/09/2026 : les bornes en miles étaient arrondies vers l'intérieur (20 km -> 13 mi) mais la valeur au
  // plus proche (20 km -> 12 mi) : une valeur valide en km devenait invalide en miles (tirage refusé). Règle retenue :
  //   - valeur affichée au dixième près (12,5 km -> 7.8 mi, 305 km -> 189.5 mi, et non 8 / 190 : l'écran, la valeur
  //     envoyée et les messages, eux aussi au dixième, disent la même chose) ; sans décimale quand elle est entière ;
  //   - bornes en miles arrondies au dixième VERS L'EXTÉRIEUR (20 km -> 12.4 mi, 1 200 km -> 745.7 mi) : toute valeur
  //     valide en km reste dans les bornes une fois convertie (l'arrondi au dixième est monotone) ;
  //   - une valeur en miles comprise dans ces bornes est ramenée dans celles du moteur au moment de la conversion en km
  //     (12.4 mi = 19,96 km -> 20 km, 745.7 mi = 1 200,1 km -> 1 200 km) : elle reste valide une fois revenue en km ;
  //   - valeurs par défaut en miles arrondies au pas (300 km -> 185 mi, 400 km -> 250 mi, 80 km -> 50 mi, et non 186 / 249,
  //     que les boutons −/+ décalaient : 249 -> 254), la valeur envoyée étant celle affichée (185 mi = 297,7 km).
  var RADIUS_KM_FIELD = { value: 300, min: 20, max: 1200, step: 10 };
  var DISTANCE_KM_FIELDS = [
    { el: els.minDistance, min: 0, max: 3000, step: 10 },
    { el: els.maxDistance, min: 0, max: 3000, step: 10 },
    { el: els.legDistance, min: 10, max: 3000, step: 10 }
  ];
  var fieldDistanceUnit = 'km';
  function unitFieldBounds(b, unit){
    if(unit !== 'mi') return { value: b.value, min: b.min, max: b.max, step: b.step };
    var step = Math.max(1, Math.round(b.step / KM_PER_MILE / 5) * 5);
    return { value: b.value != null ? Math.round(b.value / KM_PER_MILE / step) * step : null,
      min: Math.floor(b.min / KM_PER_MILE * 10 + 1e-9) / 10, max: Math.ceil(b.max / KM_PER_MILE * 10 - 1e-9) / 10, step: step };
  }
  function applyFieldBounds(input, b){ input.min = b.min; input.max = b.max; input.step = b.step; }
  // Bornes en km d'un champ de distance (null : autre champ, ou rayon en heures).
  function distanceFieldSpec(input){
    if(input === els.radius) return radiusMode === 'km' ? RADIUS_KM_FIELD : null;
    for(var i = 0; i < DISTANCE_KM_FIELDS.length; i++) if(DISTANCE_KM_FIELDS[i].el === input) return DISTANCE_KM_FIELDS[i];
    return null;
  }
  // Texte d'un champ de distance : au dixième près, sans « .0 ».
  function distanceFieldText(v){ return String(Math.round(Number(v) * 10) / 10); }
  // Valeur d'un champ en kilomètres (null si vide ou invalide). La valeur exacte en km d'une conversion précédente est
  // gardée tant que le visiteur n'a pas retouché le champ : km -> mi -> km rend 300, pas 299.
  function distanceFieldKm(input){
    if(input.__km != null && input.value === input.__shown) return input.__km;
    var v = parseFloat(input.value);
    if(!isFinite(v)) return null;
    var km = distanceUnitToKm(v, fieldDistanceUnit);
    // Miles : valeur comprise dans les bornes affichées (arrondies vers l'extérieur) ramenée dans celles du moteur.
    var spec = distanceFieldSpec(input);
    if(spec && fieldDistanceUnit === 'mi'){
      var b = unitFieldBounds(spec, 'mi');
      if(v >= b.min && km < spec.min) km = spec.min;
      if(v <= b.max && km > spec.max) km = spec.max;
    }
    return km;
  }
  // 15e audit du 19/09/2026 : la valeur exacte n'est gardée que si elle tient dans les bornes du moteur. Une saisie juste
  // hors bornes (19,96 km dans le rayon, 1 200,05 km, −0,04 km, 9,97 km pour l'étape) s'affichait arrondie DANS les bornes
  // en miles (« 12.4 », « 745.7 », « 0 », « 6.2 ») mais restait refusée, avec le message « between 12.4 mi and 745.7 mi » :
  // incompréhensible. Hors bornes, la valeur affichée est désormais celle relue (distanceFieldKm) : valeur affichée =
  // valeur envoyée = valeur contrôlée, comme pour une saisie directe en miles.
  function setDistanceFieldKm(input, km, unit){
    var shown = distanceFieldText(kmToDistanceUnit(km, unit));
    var spec = distanceFieldSpec(input);
    input.value = shown;
    input.__km = (spec && (km < spec.min || km > spec.max)) ? null : km;
    input.__shown = shown; input.__defaultKm = null;
  }
  // Valeur par défaut (rayon, distance max entre étapes) : arrondie au pas en miles, envoyée telle qu'affichée
  // (185 mi -> 297,7 km) ; retrouvée exacte (300 km) au retour en km tant que le visiteur n'y a pas touché.
  function defaultDistanceValue(km, unit){ return unitFieldBounds({ value: km, step: 10 }, unit).value; }
  function setDefaultDistanceField(input, km, unit){
    var shown = defaultDistanceValue(km, unit);
    setDistanceFieldKm(input, unit === 'mi' ? distanceUnitToKm(shown, 'mi') : km, unit);
    input.__defaultKm = km;
  }
  function convertDistanceFields(to){
    var inputs = DISTANCE_KM_FIELDS.map(function(f){ return f.el; }).concat(radiusMode === 'km' ? [els.radius] : []);
    inputs.forEach(function(input){
      if(input.__defaultKm != null && input.value === input.__shown){ setDefaultDistanceField(input, input.__defaultKm, to); return; }
      var km = input.value === '' ? null : distanceFieldKm(input);
      if(km != null) setDistanceFieldKm(input, km, to);
    });
    DISTANCE_KM_FIELDS.forEach(function(f){ applyFieldBounds(f.el, unitFieldBounds(f, to)); });
    if(radiusMode === 'km') applyFieldBounds(els.radius, unitFieldBounds(RADIUS_KM_FIELD, to));
    fieldDistanceUnit = to;
  }
  // 15e audit du 19/09/2026 : recliquer le bouton déjà actif remettait le rayon à sa valeur par défaut (la saisie était
  // perdue) et effaçait l'erreur affichée. Mode inchangé : rien à faire (aucun appel d'initialisation ne passe par ici :
  // l'état de départ vient d'index.html et de setDefaultDistanceField plus bas). Les erreurs du rayon et de la distance
  // d'éloignement ne sont retirées qu'à un vrai changement de mode (elles citaient des bornes de l'autre mode).
  function setMode(mode){
    if(mode === radiusMode) return;
    radiusMode = mode;
    clearRadiusError(); clearMinDistanceError();
    els.modeKm.setAttribute('aria-pressed', mode==='km');
    els.modeH.setAttribute('aria-pressed', mode==='h');
    if(mode==='km'){
      applyFieldBounds(els.radius, unitFieldBounds(RADIUS_KM_FIELD, fieldDistanceUnit));
      setDefaultDistanceField(els.radius, RADIUS_KM_FIELD.value, fieldDistanceUnit);
    } else {
      els.radius.__defaultKm = null;
      els.radius.value = 4; els.radius.min=0.5; els.radius.max=12; els.radius.step=0.5;
    }
    updateRadiusUnitLabel();
  }
  els.modeKm.addEventListener('click', function(){ setMode('km'); });
  els.modeH.addEventListener('click', function(){ setMode('h'); });
  els.radius.addEventListener('input', updateRadiusUnitLabel);
  // En mode heures, le nombre décimal réel de l'input est rendu invisible (voir .show-duration en CSS) : la durée mise
  // en forme (« 4 h 30 ») s'affiche à sa place et suit chaque saisie.
  // 11e audit : Entrée n'envoyait plus le formulaire et aucun chiffre ne pouvait être saisi dans ce mode. Sont désormais
  // acceptés les chiffres (décimale « . » ou « , ») et les touches d'édition ; tout le champ est sélectionné à l'arrivée du
  // focus, pour qu'un nombre tapé remplace la valeur au lieu de s'y ajouter à l'aveugle (elle est masquée par l'affichage
  // de la durée). Les lettres restent bloquées (le texte masqué ne doit pas se remplir de caractères invisibles).
  els.radius.addEventListener('keydown', function(e){
    if(radiusMode !== 'h' || e.ctrlKey || e.metaKey || e.altKey) return;
    var allowed = ['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','Enter','Backspace','Delete','Home','End','.',','];
    if(allowed.indexOf(e.key) === -1 && !/^[0-9]$/.test(e.key)){ e.preventDefault(); }
  });
  els.radius.addEventListener('focus', function(){
    if(radiusMode === 'h'){ try { els.radius.select(); } catch(err){} }
  });
  els.radius.addEventListener('paste', function(e){
    if(radiusMode !== 'h') return;
    var txt = (e.clipboardData && e.clipboardData.getData('text')) || '';
    if(!/^\s*[0-9]+([.,][0-9]+)?\s*$/.test(txt)) e.preventDefault();
  });
  // Boutons +/- toujours tactiles, indépendants des flèches natives du champ (peu fiables, voire
  // absentes, sur mobile) et du champ lui-même (invisible en mode heures). Seul vrai moyen
  // d'ajuster la valeur au doigt.
  // Réutilisé par tous les champs numériques du formulaire équipés de boutons +/- (rayon, distance
  // min/max) : incrémente/décrémente comme le ferait la flèche native, en respectant step/min/max.
  function stepNumberField(el, dir){
    var step = parseFloat(el.step) || 1;
    var min = parseFloat(el.min), max = parseFloat(el.max);
    var cur = parseFloat(el.value);
    if(isNaN(cur)) cur = min; // champ vide ("Aucun minimum"...) : on part du plancher du champ
    // Valeur recalée sur la grille du pas (14e audit du 19/09/2026) : en miles, bornes (12.4) et valeurs converties
    // (186.4) tombent hors du pas de 5, et les boutons donnaient 186.4 -> 191.4. Désormais 186.4 -> 190 / 185.
    var q = cur / step, onGrid = Math.abs(q - Math.round(q)) < 1e-9;
    var next = onGrid ? cur + dir*step : (dir > 0 ? Math.ceil(q) : Math.floor(q)) * step;
    next = Math.min(max, Math.max(min, next));
    next = Math.round(next*100)/100; // évite les artefacts d'arrondi flottant (ex. 0.5+0.1*3)
    el.value = next;
    el.dispatchEvent(new Event('input', {bubbles:true}));
  }
  function stepRadius(dir){ stepNumberField(els.radius, dir); }
  els.radiusDec.addEventListener('click', function(){ stepRadius(-1); });
  els.radiusInc.addEventListener('click', function(){ stepRadius(1); });
  els.minDistanceDec.addEventListener('click', function(){ stepNumberField(els.minDistance, -1); });
  els.minDistanceInc.addEventListener('click', function(){ stepNumberField(els.minDistance, 1); });
  els.maxDistanceDec.addEventListener('click', function(){ stepNumberField(els.maxDistance, -1); });
  els.maxDistanceInc.addEventListener('click', function(){ stepNumberField(els.maxDistance, 1); });
  els.minDaysPerCityDec.addEventListener('click', function(){ stepNumberField(els.minDaysPerCity, -1); });
  els.minDaysPerCityInc.addEventListener('click', function(){ stepNumberField(els.minDaysPerCity, 1); });
  els.maxDaysPerCityDec.addEventListener('click', function(){ stepNumberField(els.maxDaysPerCity, -1); });
  els.maxDaysPerCityInc.addEventListener('click', function(){ stepNumberField(els.maxDaysPerCity, 1); });
  // Distance max entre les étapes : 80 km à vélo, 400 km sinon, tant que le visiteur n'a pas saisi sa propre valeur ;
  // la valeur par défaut suit alors le mode de transport choisi.
  // Valeur affichée dans l'unité des champs, arrondie au pas en miles (80 km -> 50 mi, 400 km -> 250 mi : voir
  // setDefaultDistanceField), envoyée telle qu'affichée.
  var DEFAULT_LEG_KM = { 'velo': 80 };
  var DEFAULT_LEG_KM_OTHER = 400;
  var legDistanceEdited = false;
  function defaultLegKm(){ return DEFAULT_LEG_KM[els.transport.value] || DEFAULT_LEG_KM_OTHER; }
  // Valeurs restaurées par le navigateur (14e audit du 19/09/2026) : Firefox remet les valeurs des champs d'une page
  // rechargée AVANT app.js, alors que fieldDistanceUnit vaut encore 'km' — des miles restaurés auraient été relus comme
  // des kilomètres (186 mi -> 186 km). Les champs de distance portent autocomplete="off" (index.html), qui désactive
  // cette restauration, et sont de plus remis ici à leurs valeurs du HTML (en km) avant la conversion dans l'unité de la
  // langue (syncDistanceUnit, plus bas). Retour arrière depuis le cache (bfcache, événement pageshow persisted) : la page
  // entière, script compris, est restaurée telle quelle — champs et fieldDistanceUnit restent cohérents.
  DISTANCE_KM_FIELDS.forEach(function(f){ f.el.value = ''; f.el.__km = null; f.el.__defaultKm = null; });
  setDefaultDistanceField(els.radius, RADIUS_KM_FIELD.value, fieldDistanceUnit);
  setDefaultDistanceField(els.legDistance, defaultLegKm(), fieldDistanceUnit);
  els.legDistanceDec.addEventListener('click', function(){ legDistanceEdited = true; stepNumberField(els.legDistance, -1); });
  els.legDistanceInc.addEventListener('click', function(){ legDistanceEdited = true; stepNumberField(els.legDistance, 1); });
  els.legDistance.addEventListener('change', function(){ legDistanceEdited = els.legDistance.value !== ''; });
  els.transport.addEventListener('change', function(){ if(!legDistanceEdited) setDefaultDistanceField(els.legDistance, defaultLegKm(), fieldDistanceUnit); });

  // Textes qui portent l'unité ou une distance (attribut data-i18n-unit d'index.html : étiquettes « {unit} au moins »,
  // aide « {bike} à vélo, {other} pour les autres modes ») : composés ici, i18n.js ne connaît pas l'unité.
  function applyDistanceUnitTexts(){
    var vars = distanceUnitVars();
    // Valeurs par défaut telles qu'affichées dans le champ (14e audit du 19/09/2026 : l'aide disait 249 mi, le champ 250).
    vars.bike = formatDistanceValue(defaultDistanceValue(DEFAULT_LEG_KM.velo, fieldDistanceUnit), fieldDistanceUnit);
    vars.other = formatDistanceValue(defaultDistanceValue(DEFAULT_LEG_KM_OTHER, fieldDistanceUnit), fieldDistanceUnit);
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-unit]'), function(el){
      el.textContent = t(el.getAttribute('data-i18n-unit'), vars);
    });
  }
  // Unité changée (elle suit la langue d'interface : voir unitForLang) : champs convertis, erreurs de distance retirées
  // (elles citaient des valeurs dans l'ancienne unité), textes et nom des boutons −/+ recomposés.
  function syncDistanceUnit(){
    var unit = distanceUnit();
    if(unit !== fieldDistanceUnit){
      convertDistanceFields(unit);
      clearRadiusError(); clearMinDistanceError(); clearLegDistanceError();
    }
    applyDistanceUnitTexts();
    updateRadiusUnitLabel();
    applyStepButtonLabels();
  }


  // Erreurs périmées effacées dès que le champ concerné change (10e audit du 18/09/2026) : « la distance minimale ne peut
  // pas dépasser la maximale » restait affiché après correction, jusqu'au tirage suivant. Le message « trop loin pour un
  // séjour aussi court » de la distance d'éloignement dépend aussi du rayon et du mode de transport (rayon en heures).
  els.radius.addEventListener('input', function(){ clearRadiusError(); clearMinDistanceError(); });
  [els.minDistance, els.maxDistance].forEach(function(el){ el.addEventListener('input', clearMinDistanceError); });
  els.legDistance.addEventListener('input', clearLegDistanceError);
  [els.minDaysPerCity, els.maxDaysPerCity].forEach(function(el){ el.addEventListener('input', clearDaysPerCityError); });
  // Changement de mode du rayon : erreurs retirées par setMode lui-même (15e audit du 19/09/2026 : plus au simple clic).
  els.transport.addEventListener('change', function(){ clearLegDistanceError(); clearMinDistanceError(); updateTollAvailability(); });

  // Péage sans objet à vélo (10e audit) : l'interrupteur restait actif sans aucun effet. Désactivé, avec l'explication
  // sous l'interrupteur (et reliée à lui pour les lecteurs d'écran) ; son état coché est conservé pour les autres modes.
  function updateTollAvailability(){
    var bike = els.transport.value === 'velo';
    els.tollToggle.disabled = bike;
    if(els.tollField) els.tollField.classList.toggle('is-disabled', bike);
    if(els.tollBikeHint){
      els.tollBikeHint.hidden = !bike;
      if(bike) addDescribedBy(els.tollToggle, els.tollBikeHint.id); else removeDescribedBy(els.tollToggle, els.tollBikeHint.id);
    }
  }
  updateTollAvailability();

  // Boutons −/+ : nom accessible complet, « Diminuer — Distance max entre les étapes » (10e audit : huit boutons
  // « Diminuer »/« Augmenter » impossibles à distinguer hors contexte visuel). Recalculé au changement de langue (la
  // retraduction statique remet d'abord « Diminuer » seul via data-i18n-aria-label).
  var STEP_BUTTON_LABELS = [
    ['radius', 'form.radius.label', null],
    ['min-distance', 'form.minDistance.label', 'form.minDistance.unitMin'],
    ['max-distance', 'form.minDistance.label', 'form.minDistance.unitMax'],
    ['leg-distance', 'form.legDistance.label', null],
    ['min-days-per-city', 'form.daysPerCity.label', 'form.daysPerCity.unitMin'],
    ['max-days-per-city', 'form.daysPerCity.label', 'form.daysPerCity.unitMax']
  ];
  function applyStepButtonLabels(){
    STEP_BUTTON_LABELS.forEach(function(row){
      var name = t(row[1]) + (row[2] ? ' (' + t(row[2], distanceUnitVars()) + ')' : '');
      var dec = document.getElementById(row[0] + '-dec'), inc = document.getElementById(row[0] + '-inc');
      if(dec) dec.setAttribute('aria-label', t('form.radius.decAria') + ' — ' + name);
      if(inc) inc.setAttribute('aria-label', t('form.radius.incAria') + ' — ' + name);
    });
  }
  applyStepButtonLabels();
  // Unité de distance de la page (celle de la langue d'interface) : champs et étiquettes.
  syncDistanceUnit();

  // Textes indicatifs (placeholder) des champs du formulaire : un placeholder ne passe jamais à la ligne et était coupé
  // net quand il dépassait le champ (« Aucun minimum » en tamoul, « Ex. Brugge ou 8000 » en cornique à 320 px). Sa
  // taille est réduite pas à pas jusqu'à ce qu'il tienne (mesure au canvas, même police que le rendu). Rappelé au
  // changement de langue, au redimensionnement et quand le placeholder de la ville change.
  var phCanvas = null;
  function placeholderFits(input){
    var cs = getComputedStyle(input, '::placeholder'), ics = getComputedStyle(input);
    phCanvas = phCanvas || document.createElement('canvas').getContext('2d');
    phCanvas.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var avail = input.clientWidth - parseFloat(ics.paddingLeft) - parseFloat(ics.paddingRight);
    return phCanvas.measureText(input.placeholder).width <= avail + 0.5;
  }
  // Plancher de lisibilité à 0,72rem ; si le texte ne tient toujours pas, le champ affiche « — » (la valeur par défaut :
  // aucune borne) et le texte complet reste en infobulle — l'étiquette et l'aide sous le champ disent déjà ce qu'il attend.
  // 11e audit : l'infobulle (title) ne s'affiche pas au toucher — le texte replié est aussi écrit en clair sous le champ
  // (span.ph-help, créé à la demande juste après la ligne du champ, masqué quand le texte tient dans le champ).
  function placeholderHelpEl(input){
    if(input.__phHelp) return input.__phHelp;
    var row = input.closest('.stepper-row') || input;
    var help = document.createElement('span');
    help.className = 'ph-help';
    help.id = input.id + '-ph-help';
    help.hidden = true;
    help.setAttribute('aria-hidden', 'true'); // même texte déjà annoncé par le champ (title)
    row.parentNode.insertBefore(help, row.nextSibling);
    input.__phHelp = help;
    return help;
  }
  function fitPlaceholders(){
    var sizes = ['', '0.86rem', '0.78rem', '0.72rem'];
    Array.prototype.forEach.call(els.form.querySelectorAll('input[placeholder]'), function(input){
      if(input.__fullPlaceholder !== undefined && input.placeholder === '—') input.placeholder = input.__fullPlaceholder;
      input.removeAttribute('title');
      if(input.__phHelp){ input.__phHelp.hidden = true; input.__phHelp.textContent = ''; }
      if(!input.placeholder || !input.clientWidth) return;
      for(var i = 0; i < sizes.length; i++){
        if(sizes[i]) input.style.setProperty('--ph-size', sizes[i]); else input.style.removeProperty('--ph-size');
        if(placeholderFits(input)) return;
      }
      if(input.type === 'number'){
        input.__fullPlaceholder = input.placeholder;
        input.title = input.placeholder;
        input.placeholder = '—';
        input.style.removeProperty('--ph-size');
        var help = placeholderHelpEl(input);
        help.textContent = input.__fullPlaceholder;
        help.hidden = false;
      }
    });
  }
  var fitPlaceholdersTimer = null;
  window.addEventListener('resize', function(){
    clearTimeout(fitPlaceholdersTimer);
    fitPlaceholdersTimer = setTimeout(fitPlaceholders, 100);
  });
  fitPlaceholders();

  /* ---------- FOURCHETTE DE PRIX DU BUDGET SÉLECTIONNÉ ---------- */
  // Affiche le plafond par nuit du pays de la ville de départ (TripData.lodgingPriceCap, filtre « 0 à X » des liens
  // Airbnb/Booking), dans la devise CHOISIE (conversion possible vers toutes les devises, voir
  // lodgingPriceCap.rateSources) ou, en mode automatique, dans celle du pays. Les liens eux-mêmes peuvent passer à une
  // autre devise si les plateformes n'acceptent pas la devise choisie (voir linkLodgingCap). Moyenne de l'UE en euros
  // tant qu'aucune ville n'est choisie.
  // Nombre au format de la langue d'interface (« 24 000 JPY » et non « 24000 JPY »).
  // Montant avec son symbole monétaire, mis en forme par Intl selon la langue d'interface (11e audit du 19/09/2026) :
  // « 150 € », « €150 », « 150,00 € », « ١٥٠ € »… au lieu d'un « € » collé en dur après le nombre dans chaque phrase
  // (l'anglais affichait « Up to 150 € »). Décimales : entières par défaut ; deux pour un petit montant non entier (péage,
  // ferry arrondis au dixième : « 6,30 € » plutôt que « 6 € »). Devise inconnue d'Intl : nombre suivi du code ISO.
  function formatMoney(n, currency, decimals){
    var v = Number(n);
    if(!isFinite(v)) return '';
    currency = /^[A-Z]{3}$/.test(currency || '') ? currency : 'EUR';
    if(decimals == null) decimals = (Math.abs(v) < 20 && Math.round(v) !== v) ? 2 : 0;
    if(!decimals) v = Math.round(v);
    try {
      return new Intl.NumberFormat(localeTag(), { style: 'currency', currency: currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
    } catch(e){ return formatNum(v) + ' ' + currency; }
  }
  // Montant estimé (« ~6,30 € »).
  // 13e audit du 19/09/2026 : même marque d'approximation que les fourchettes (approxMoneyRange) — « ≈ » dans les langues
  // dont le séparateur de plage est un tilde (japonais « €5 ～ €14 », coréen « €5~€14 »), où « ~€87 » se lisait comme le
  // début d'une plage ; « ~ » ailleurs.
  var approxMarkCache = {};
  function approxMark(){
    var tag = localeTag();
    if(approxMarkCache[tag]) return approxMarkCache[tag];
    var mark = '~';
    try {
      var nf = new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR' });
      if(typeof nf.formatRange === 'function' && /[~～〜]/.test(nf.formatRange(5, 14))) mark = '≈';
    } catch(e){}
    return (approxMarkCache[tag] = mark);
  }
  function approxMoney(n, currency, decimals){ return approxMark() + formatMoney(n, currency, decimals); }
  // Décimales communes aux deux bornes d'une fourchette (« ~5,20 € à ~14,70 € », « ~20 € à ~34 € », jamais « ~19,70 € à ~34 € »).
  function rangeDecimals(min, max){ return (Math.abs(max) < 20 && (Math.round(min) !== min || Math.round(max) !== max)) ? 2 : 0; }
  // Fourchette compacte pour les statistiques (« ~5–12 € », « ~€5–12 ») : Intl.NumberFormat.formatRange quand le
  // navigateur la connaît, sinon deux montants séparés par un tiret.
  function approxMoneyRange(min, max, currency){
    currency = currency || 'EUR';
    var decimals = rangeDecimals(min, max);
    var a = decimals ? min : Math.round(min), b = decimals ? max : Math.round(max);
    try {
      var nf = new Intl.NumberFormat(localeTag(), { style: 'currency', currency: currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      if(typeof nf.formatRange === 'function'){
        var range = nf.formatRange(a, b);
        // Séparateur de plage en tilde (japonais : « €5.20 ～ €14.70 ») : un « ~ » d'approximation devant se lisait comme
        // une deuxième plage (« ~€5.20 ～ €14.70 », 12e audit du 19/09/2026) — marque d'approximation « ≈ » à la place.
        return (/[~～〜]/.test(range) ? '≈' : '~') + range;
      }
    } catch(e){}
    return approxMark() + formatMoney(a, currency, decimals) + '–' + formatMoney(b, currency, decimals);
  }
  // Devise choisie que Airbnb/Booking ne proposent pas (voir linkLodgingCap) : les liens passent à la devise du pays de
  // l'étape ou à l'euro — dit UNE fois (« Liens Airbnb/Booking en MAD, EUR : la devise choisie (XOF) n'y est pas
  // proposée ») plutôt qu'un changement muet (11e audit). Rien en mode automatique.
  function currencyLinkFallbackText(linkCurrencies){
    var pref = getPreferredCurrency();
    var list = (linkCurrencies || []).filter(function(c, i, a){ return c && c !== pref && a.indexOf(c) === i; });
    if(!pref || !list.length) return '';
    return t('currency.linkFallback', { currency: formatList(list), chosen: pref });
  }
  // Énumération dans la langue d'interface (« MAD et EUR », « MAD، EUR », « MAD、EUR ») : Intl.ListFormat, sinon virgules
  // (12e audit du 19/09/2026 : « , » écrit en dur, y compris en arabe ou en japonais).
  // 13e audit du 19/09/2026 : Intl.ListFormat seulement si le navigateur a les règles de la LANGUE D'INTERFACE elle-même
  // (supportedLocalesOf, correspondance « lookup ») — pas celles de la locale de repli de localeTag(), qui écrivaient la
  // conjonction d'une autre langue (« MAD et EUR » en kabyle, kinyarwanda, monégasque ; « MAD እና EUR » en oromo ;
  // « MAD وEUR » en amazighe). Style « long » : le style « short » abrège la conjonction (« MAD & EUR » en néerlandais,
  // breton, féroïen). Sinon, simple virgule.
  function formatList(items){
    try {
      var tag = localeTag();
      if(typeof Intl.ListFormat === 'function' && tag.split('-')[0] === String(VISITOR_LANG).split('-')[0] &&
         Intl.ListFormat.supportedLocalesOf([tag], { localeMatcher: 'lookup' }).length){
        return new Intl.ListFormat(tag, { style: 'long', type: 'conjunction' }).format(items);
      }
    } catch(e){}
    return items.join(', ');
  }
  function updateBudgetHint(){
    // Garde défensive : le sélecteur de devise (voir plus haut, "SÉLECTEUR DE DEVISE") est
    // maintenant interactif dès le tout début du chargement, AVANT que `els` ci-dessous existe
    // (assigné seulement une fois les communes reçues) — un clic assez rapide sur "Automatique"/une
    // devise pendant cette fenêtre appellerait sinon cette fonction avant que le formulaire existe.
    if(!els || !els.budget) return;
    var key = els.budget.value;
    // Plafond du PAYS de la ville de départ (moyenne de l'UE tant qu'aucune ville n'est choisie), converti dans la devise
    // choisie — même calcul que le moteur (TripData.lodgingPriceCap).
    var cap = lodgingCap(selectedCity && selectedCity.country, key);
    els.budgetHint.textContent = t('form.budget.hint', {amount: formatMoney(cap.max, cap.currency, 0)});
  }
  // Niveaux de budget : nom du niveau suivi de la catégorie d'hébergement à laquelle son plafond correspond réellement
  // (11e audit : « Économique » plafonné à ~100 €, prix moyen d'un hôtel 2★). La clé courte (budgetLabel) reste celle
  // du sac à préparer et du PDF.
  function applyBudgetOptionLabels(){
    Array.prototype.forEach.call(els.budget.options, function(opt){
      opt.textContent = budgetLabel(opt.value) + ' — ' + t('form.budget.' + opt.value + 'Desc');
    });
  }
  applyBudgetOptionLabels();
  els.budget.addEventListener('change', updateBudgetHint);
  updateBudgetHint();

  /* ---------- HELPERS ---------- */
  function rand(min,max){ return Math.random()*(max-min)+min; }
  // Math.round(rand(min,max)) n'est PAS uniforme sur les entiers min..max : les deux bornes
  // (min et max) ne reçoivent que la moitié de la plage de valeurs continues des entiers du
  // milieu (ex. randInt(0,5) tirait "0" deux fois moins souvent que "2" ou "3") — un vrai biais
  // qui, répété à chaque choix (pick, shuffle, nombre d'étapes...), favorisait des résultats
  // "du milieu" et cassait le hasard perçu. Math.floor donne une distribution uniforme correcte.
  function randInt(min,max){ return Math.floor(rand(min, max+1)); }
  function pick(arr){ return arr[randInt(0,arr.length-1)]; }
  function shuffle(arr){
    var a = arr.slice();
    for(var i=a.length-1;i>0;i--){ var j=randInt(0,i); var tmp=a[i]; a[i]=a[j]; a[j]=tmp; }
    return a;
  }
  // Durée en minutes, dans la langue d'interface (« 2 h et 46 min », « 2 時間 46 分 », « 2 ч 46 мин »…) : Intl.DurationFormat,
  // sinon unités d'Intl.NumberFormat, sinon « 2h46 ». localeTag() : langue prise en charge par le navigateur (même repli
  // que pour les dates et les montants).
  // compact : forme courte (« 4h 30min », « 4h30m ») pour le champ étroit du rayon exprimé en heures.
  function formatDurationMin(totalMin, compact){
    var style = compact ? 'narrow' : 'short';
    totalMin = Math.max(0, Math.round(Number(totalMin) || 0));
    var h = Math.floor(totalMin / 60), m = totalMin % 60, loc = localeTag();
    // Langue sans aucune donnée Intl dans le navigateur (birman, cinghalais) : unités écrites dans la langue plutôt que
    // l'anglais de la locale de repli (11e audit).
    var words = window.I18N.durationWords ? window.I18N.durationWords(VISITOR_LANG) : null;
    if(words){
      var bits = [];
      if(h) bits.push(words.h.replace('{n}', formatNum(h)));
      if(m || !h) bits.push(words.m.replace('{n}', formatNum(m)));
      return bits.join(' ');
    }
    try {
      if(typeof Intl.DurationFormat === 'function'){
        var parts = {};
        if(h) parts.hours = h;
        if(m || !h) parts.minutes = m;
        // minutesDisplay 'always' seulement quand il n'y a PAS d'heures : sinon « 4 h » sortait « 4 h et 0 min ».
        return new Intl.DurationFormat(loc, { style: style, minutesDisplay: h ? 'auto' : 'always' }).format(parts);
      }
    } catch(e){}
    try {
      var out = [];
      if(h) out.push(new Intl.NumberFormat(loc, { style: 'unit', unit: 'hour', unitDisplay: style }).format(h));
      if(m || !h) out.push(new Intl.NumberFormat(loc, { style: 'unit', unit: 'minute', unitDisplay: style }).format(m));
      return out.join(' ');
    } catch(e){}
    return fmtHours(totalMin / 60);
  }
  // Minutes d'une étape : champ numérique du serveur (travelMin, roadMin), sinon relu depuis le libellé « 2h46 » / « 45 min »
  // (réponse d'une version antérieure du serveur).
  function legMinutes(minutes, label){
    if(typeof minutes === 'number' && isFinite(minutes)) return minutes;
    var hm = String(label || '').match(/^(\d+)h(\d*)$/);
    if(hm) return +hm[1] * 60 + (hm[2] ? +hm[2] : 0);
    var mm = String(label || '').match(/^(\d+) min$/);
    return mm ? +mm[1] : null;
  }
  function legDuration(minutes, label){
    var min = legMinutes(minutes, label);
    return min == null ? (label || '') : formatDurationMin(min);
  }
  function fmtHours(h){
    var totalMin = Math.round(h*60);
    var hh = Math.floor(totalMin/60), mm = totalMin%60;
    if(hh<=0) return mm+' min';
    return hh+'h'+(mm? String(mm).padStart(2,'0'):'');
  }
  // Nombres entiers et distances dans la langue d'interface (10e audit du 18/09/2026) : chiffres et séparateurs de la
  // locale (« 1 234 », « 1,234 », « ١٬٢٣٤ »).
  // Distances : formatDistance (13e audit du 19/09/2026), qui remplace formatKm — unité km ou mi, écrite par les
  // traductions du site (unit.kmN / unit.miN) plutôt que par Intl, dont la locale de repli donnait l'unité d'une AUTRE
  // langue (russe pour l'abkhaze, arabe pour l'amazighe…).
  function formatNum(n){
    var v = Number(n);
    if(!isFinite(v)) return '';
    try { return new Intl.NumberFormat(localeTag(), { maximumFractionDigits: 1 }).format(v); } catch(e){ return String(v); }
  }
  // Traduction d'une clé venue des DONNÉES (avertissements du moteur, liaison de ferry, types d'activité…) avant insertion
  // en HTML : une clé inconnue revient telle quelle de t() — elle est alors échappée (10e audit : « <img onerror> » envoyé
  // comme clé d'avertissement était inséré tel quel). Les traductions elles-mêmes ne contiennent aucun balisage (vérifié).
  function tData(key, vars){
    if(typeof key !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/.test(key)) return escHtml(key);
    var s;
    try { s = t(key, vars); } catch(e){ s = key; }
    return (typeof s !== 'string' || s === key) ? escHtml(key) : s;
  }
  // Source du barème de péage : le libellé français de trip-data.js (« autoroutes françaises 2026 ») est traduit ; les autres
  // sont des noms propres d'opérateurs (Autostrade per l'Italia, HAC…), gardés tels quels.
  function tollSourceLabel(cc){
    var src = TOLL_SOURCE[cc];
    if(!src) return '';
    if(cc === 'FR'){
      var year = (String(src).match(/\d{4}/) || [''])[0];
      return t('toll.sourceFr', { year: year }).trim();
    }
    return src;
  }

  // Rayon en kilomètres (champ en km ou en miles, voir fieldDistanceUnit ; mode heures : durée × vitesse du mode).
  function effectiveRadiusKm(speed){
    if(radiusMode === 'km') return distanceFieldKm(els.radius) || RADIUS_KM_FIELD.value;
    return (parseFloat(els.radius.value) || 4) * speed;
  }

  // Distance réelle (vol d'oiseau, corrigé d'un facteur route de 1,17 — même méthode que pour les péages)
  // entre deux points géolocalisés, utilisée pour choisir une destination plausible et calculer des
  // temps de trajet cohérents avec la carte, plutôt qu'une distance tirée au hasard dans le rayon choisi.

  /* ---------- GRILLE SPATIALE & CONSTRUCTION D'ITINÉRAIRE RÉEL ---------- */
  // Index léger (cellules ~0.2°, soit ~20 km) sur les ~35 000 communes pour trouver rapidement
  // les communes réelles proches d'un point donné, sans comparer une à une (35 000 communes x
  // jusqu'à 15 étapes serait trop lent en recherche naïve).
  // Construit un itinéraire réel par proche-en-proche : à chaque étape, on part de la position
  // courante et on choisit — avec un peu de hasard pondéré — une commune réelle non encore
  // visitée, en favorisant celles qui ont un point d'intérêt réel (FEATURED) et les plus peuplées
  // (plus probable d'y trouver un vrai commerce/logement).
  //
  // La "limite de rayon" (maxRadiusKm) ne borne QUE le tout dernier trajet — le retour vers le
  // point de départ. Sur un séjour à plusieurs étapes, le voyage peut s'éloigner bien plus loin
  // entre-temps (ex. 7 jours/6 nuits avec un rayon de retour de 300 km peut très bien pousser
  // jusqu'à 800 km puis revenir en plusieurs étapes pour que le dernier trajet reste ≤ 300 km).
  // Sur un trajet à une seule étape, en revanche, cette étape sert à la fois d'aller ET de retour :
  // la limite de rayon s'y applique donc directement, comme avant.
  //
  // `minDistanceKm` (optionnelle) impose que la première étape soit à au moins cette distance.
  // `maxDistanceKm` (optionnelle) plafonne la distance au point de départ pour TOUTE étape, à
  // n'importe quel moment du séjour — un vrai plafond, contrairement à la limite de rayon.
  // Répartit les nuits disponibles sur les étapes choisies : chacune a au moins 1 nuit, le reste
  // est distribué au hasard en favorisant les étapes avec de vrais points d'intérêt (pour permettre
  // plusieurs activités réelles distinctes sur place), avec un maximum de 4 nuits par étape.
  function lodgingCategoryLabel(budgetKey, avoidTent){
    if(budgetKey==='economique') return avoidTent ? t('lodging.economiqueNoTent') : t('lodging.economiqueTent');
    if(budgetKey==='moyen') return t('lodging.moyen');
    return t('lodging.confortable');
  }

  /* ---------- ROULETTE / REVEAL ---------- */
  // Texte de l'indice affiché sous la roulette une fois le tirage révélé (clé i18n) : rejoué au changement de langue,
  // sans quoi la retraduction statique remettait « La route va parler. » (data-i18n de #roulette-clue).
  var revealClueKey = null;
  function runReveal(firstStop, spinPool, drawId, onDone){
    els.stamp.classList.remove('show');
    els.revealReal.classList.remove('show');
    els.compass.classList.remove('spin');
    void els.compass.offsetWidth; // restart animation
    els.compass.classList.add('spin');
    setRevealLabel('reveal.drawing');
    announceReveal('');

    var names = shuffle(spinPool.filter(function(c){return c.norm!==firstStop.norm;})).slice(0,6).map(function(c){return c.name;});
    if(names.length===0) names.push(firstStop.name);
    names.push(firstStop.name);

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){
      els.rouletteName.textContent = firstStop.name;
      setRevealClue('reveal.clueReduced');
      finishReveal(firstStop, drawId, onDone);
      return;
    }

    var i = 0, delay = 90, step = 0;
    var totalSteps = names.length + 10;
    function tick(){
      if(drawId !== currentDrawId) return; // un tirage plus récent a été lancé : cette roulette s'arrête
      els.rouletteName.textContent = names[i % names.length];
      setRevealClue('reveal.clueSpinning');
      i++; step++;
      delay = delay * 1.16;
      if(step < totalSteps){
        rouletteTimer = setTimeout(tick, delay);
      } else {
        els.rouletteName.textContent = firstStop.name;
        setRevealClue('reveal.clueFinal');
        finishReveal(firstStop, drawId, onDone);
      }
    }
    tick();
  }
  var revealLabelKey = null;
  function setRevealLabel(key){ revealLabelKey = key; els.rouletteLabel.textContent = t(key); els.rouletteLabel.hidden = false; }
  function setRevealClue(key){ revealClueKey = key; els.rouletteClue.textContent = t(key); }
  // Seul le résultat final est annoncé aux lecteurs d'écran (région #reveal-announce, aria-live) : #reveal n'est plus
  // une région live, qui lisait chaque nom de la roulette.
  function announceReveal(text){
    var live = document.getElementById('reveal-announce');
    if(live) live.textContent = text;
  }
  // Libellés de la roulette dans la langue courante (changement de langue : la retraduction statique remettait les
  // textes d'attente data-i18n).
  function retranslateReveal(){
    if(revealLabelKey) els.rouletteLabel.textContent = t(revealLabelKey);
    if(revealClueKey) els.rouletteClue.textContent = t(revealClueKey);
    // Région annoncée aux lecteurs d'écran : sinon elle restait dans la langue du tirage (texte périmé à la lecture).
    // 16e audit du 20/09/2026 : l'annonce était RECONSTRUITE à partir du texte déjà affiché, encore dans l'ANCIENNE
    // langue — retranslateReveal est appelée AVANT rerenderCurrentTrip (donc avant updateRevealTexts) dans l'écouteur
    // 'i18n:langchange'. « Destination confirmée — Лион · 21 житель » mêlait les deux langues. Le texte de la région est
    // donc refait d'abord, depuis les données de l'étape (updateRevealTexts -> revealCountTexts), l'annonce ensuite.
    if(!revealInProgress && currentTripData && currentTripData.firstStop){
      updateRevealTexts(currentTripData.firstStop);
      announceReveal(t('reveal.confirmed') + ' — ' + els.revealRegion.textContent);
    }
  }
  // Rejoue juste le TEXTE des libellés "Destination confirmée"/nombre d'habitants/de POI posés par
  // finishReveal (jamais leur classe "show", déjà acquise, ni le délai de 250 ms qui n'a de sens que
  // pour l'animation initiale) — extrait à part pour pouvoir être rappelé tel quel depuis l'écouteur
  // 'i18n:langchange' plus bas. Sans ça, un changement de langue après un tirage laissait ces trois
  // libellés dans l'ancienne langue alors que le reste de la page (jours, carte, sac) suivait bien la
  // nouvelle — même firstStop que celui gardé dans currentTripData (voir plus bas), reconstruit à
  // l'identique.
  function updateRevealTexts(firstStop){
    setRevealLabel('reveal.confirmed');
    els.stamp.textContent = t('reveal.stamp');
    // Le code postal désambiguïse les nombreuses communes homonymes (ex. 3 "Thoiry" en France).
    var bits = [firstStop.name + (firstStop.cp ? ' (' + formatCpBadge(firstStop) + ')' : '')];
    // Nombre d'habitants et de lieux repérés au bon pluriel (15e audit du 19/09/2026 : « 2 настоящих интересных точек »,
    // « 21 жителей », « تم العثور على ٢ معالم ») : forme exacte de I18N.plural quand la langue en a plusieurs (duel arabe
    // écrit sans nombre, voir dualWithoutNumber), sinon la phrase traduite.
    bits.push.apply(bits, revealCountTexts(firstStop));
    els.revealRegion.textContent = bits.join(' · ');
  }
  function revealCountTexts(firstStop){
    var out = [];
    if(firstStop.pop){
      var popVars = {n: firstStop.pop.toLocaleString(localeTag())};
      out.push(pluralPhrase('reveal.inhabitants', firstStop.pop, popVars) || t('reveal.inhabitants', popVars));
    }
    if(firstStop.featuredCount){
      var c = firstStop.featuredCount, vars = {n: formatNum(c)};
      out.push(c > 1 ? (pluralPhrase('reveal.poiN', c, vars) || t('reveal.poiN', vars)) : t('reveal.poi1', vars));
    }
    return out;
  }
  function finishReveal(firstStop, drawId, onDone){
    setRevealLabel('reveal.confirmed');
    setTimeout(function(){
      if(drawId !== currentDrawId) return;
      els.stamp.classList.add('show');
      updateRevealTexts(firstStop); // re-sets rouletteLabel too, harmless (same value already set above)
      els.revealReal.classList.add('show');
      announceReveal(t('reveal.confirmed') + ' — ' + els.revealRegion.textContent);
      if(onDone) onDone();
    }, 250);
  }

  /* ---------- PÉAGE & RECHARGE : calcul par étape ---------- */
  // Le péage d'une étape est calculé par le moteur (lib/toll-grid.js : longueur minimale facturée d'affilée sur une
  // autoroute à péage réelle), plus par un seuil de distance côté client. Depuis le 7e audit, cocher ou non le péage ne
  // change plus la durée annoncée de l'étape : seul le montant change de sens (péage estimé si coché, péage évité si décoché — voir tollText).

  /* ---------- ITINERARY BUILD ---------- */
  // Liens de recherche réels (pas une réservation ni des résultats fabriqués) : cet artefact autonome
  // ne peut pas interroger une API Airbnb/hôtel en direct (aucun appel réseau externe n'est autorisé
  // au runtime, et aucune clé d'accès n'est disponible). On construit donc des liens de recherche
  // pré-remplis avec la vraie ville, les vraies dates et un plafond de prix indicatif — ils ouvrent
  // les résultats réels et à jour sur Airbnb / Booking. `country` (code ISO, ex. "CH") sert à deux
  // choses : préciser la ville dans la requête (au lieu de toujours accoler ", France" — un nom de
  // commune n'est pas forcément unique hors de France) et choisir la devise/le plafond de prix
  // adaptés (voir BUDGET_PRICE_MAX/countryCurrency) plutôt que systématiquement l'euro.
  // Liens de secours (toujours utiles pendant le chargement, ou si aucune photo n'est trouvée) :
  // une recherche Wikipédia et une recherche d'images, en un clic, sans rien stocker.
  // Sous-domaine Wikipédia de la langue du visiteur : « zh-Hant », « nrf-je », « pap-AW »… ne sont pas des sous-domaines.
  // Liste blanche : langues du site qui ont une édition de Wikipédia à code de 2-3 lettres (seul format accepté par
  // /api/photo). Jèrriais/guernésiais -> Wikipédia normande (nrm), filipino -> tl. Les autres (istro-roumain,
  // monténégrin, créole seychellois, touroyo, maya…, ou éditions à code composé comme fiu-vro/bat-smg) retombent sur
  // le français pour les langues de territoires francophones, sur l'anglais ailleurs.
  var WIKI_CODES = {};
  ('fr en es pt nl de lb it rm nds hsb frr sc fur mt lij csb rue ca eu gl oc br co mwl ga gv cy gd kw sco cs pl sk hu ' +
   'sl hr bs sr da no sv fi sq mk ro el bg lv lt et ltg is fo gag be ru uk crh tr ka ab hy az ar ku ady kab ha so am ' +
   'om ti sg sw rw mg af zu xh nso st tn ss ve ts sn tt ba sah ce myv mdf udm fa ckb kk ky tg uz tk kaa mn zh hak za ko ' +
   'ja hi mr ne bn ta ml ur dv si dz my th lo km vi tet id ms jv mi sm ty haw ht pap qu gn ch kl ay').split(' ')
    .forEach(function(c){ WIKI_CODES[c] = true; });
  var WIKI_ALIAS = { 'nrf-je': 'nrm', 'nrf-gg': 'nrm', fil: 'tl', 'zh-Hant': 'zh', 'qu-EC': 'qu', 'pap-AW': 'pap', 'pap-CW': 'pap' };
  var WIKI_FALLBACK_FR = { crs: true, mrq: true, zgh: true };
  function wikiLang(){
    var code = String(VISITOR_LANG || 'fr');
    if(WIKI_ALIAS[code]) return WIKI_ALIAS[code];
    if(WIKI_CODES[code]) return code;
    return WIKI_FALLBACK_FR[code] ? 'fr' : 'en';
  }
  function buildPhotoLinks(placeName, country){
    var countryName = (country && COUNTRIES[country] && COUNTRIES[country].name) || 'France';
    var q = encodeURIComponent(placeName + ' ' + countryName);
    return {
      wiki: 'https://' + wikiLang() + '.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(placeName) + '&go=Go',
      images: 'https://www.google.com/search?tbm=isch&q=' + q
    };
  }
  // Vraie photo du lieu : on interroge notre propre serveur (/api/photo), qui va chercher la
  // photo d'infobox de l'article Wikipédia correspondant, dans la langue du VISITEUR (VISITOR_LANG
  // — voir plus haut), avec désambiguïsation par région (département français, ou nom de région
  // déjà en clair pour les autres pays — voir `country`) et la met en cache côté serveur. Ici, on
  // ne fait qu'éviter de redemander deux fois la même commune pendant l'affichage (ex. plusieurs
  // nuits au même endroit).
  // Bornés (3e audit du 17/09/2026) : sans plafond, une longue série de tirages gardait indéfiniment des milliers de
  // réponses (photos, lieux, randonnées) en mémoire. Les entrées les plus anciennes sont retirées au-delà du plafond.
  var CLIENT_CACHE_MAX = 600;
  function cachePut(store, key, value){
    store[key] = value;
    var keys = Object.keys(store);
    if(keys.length > CLIENT_CACHE_MAX){
      for(var i = 0; i < keys.length - CLIENT_CACHE_MAX; i++) delete store[keys[i]];
    }
    return value;
  }
  var clientPhotoCache = {};
  // near : { lat, lon, kind } — point de référence du lieu cherché (kind 'poi' : lieu OSM précis ; 'area' : lieu connu
  // seulement par sa commune ; 'stop' : l'étape elle-même). Le serveur n'accepte qu'un article Wikipédia géolocalisé près
  // de ce point (fini « Madonna » la chanteuse pour une statue de la Madone en Corse).
  // Lieu OSM avec coordonnées : rayon serré ; sinon (Wikipédia « Lieux et monuments », lieux mis en avant) : sa commune.
  function optNear(opt, leg){ return opt && opt.lat != null ? nearOf(opt.lat, opt.lon, 'poi') : nearOf(leg && leg.lat, leg && leg.lon, 'area'); }
  function nearOf(lat, lon, kind){ return (lat != null && lon != null) ? { lat: Number(lat), lon: Number(lon), kind: kind } : null; }
  function photoRequestUrl(name, dept, country, near, lang){
    return '/api/photo?name=' + encodeURIComponent(name) + '&dept=' + encodeURIComponent(dept || '') +
      '&country=' + encodeURIComponent(country || '') + '&lang=' + encodeURIComponent(lang) +
      (near ? '&lat=' + encodeURIComponent(near.lat) + '&lon=' + encodeURIComponent(near.lon) + '&kind=' + encodeURIComponent(near.kind) : '');
  }
  function fetchPhotoJson(url){
    return fetch(url).then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); });
  }
  // Cache par lieu, INDÉPENDANT de la langue (septembre 2026) : un changement de langue redemandait toutes les photos
  // (jusqu'à ~90 requêtes pour 15 étapes, jusqu'à 6 appels à Wikipédia chacune côté serveur) et les images se
  // rechargeaient sous les yeux. Désormais les photos déjà affichées restent ; en arrière-plan, et deux à la fois
  // seulement, le lieu est redemandé dans la nouvelle langue pour mettre à jour le lien Wikipédia — et l'image quand il
  // n'y en avait pas encore. Entrée : { lang, data (réponse reçue), promise }.
  function fetchPlacePhoto(name, dept, country, near){
    var nearKey = near ? Number(near.lat).toFixed(2) + ',' + Number(near.lon).toFixed(2) + ',' + near.kind : '-';
    var key = name + '|' + (dept || '') + '|' + (country || '') + '|' + nearKey;
    var lang = wikiLang();
    var entry = clientPhotoCache[key];
    if(!entry){
      entry = cachePut(clientPhotoCache, key, { lang: lang, data: null });
      // Un échec (limite de requêtes, délai, erreur serveur) n'est pas mémorisé : un prochain affichage réessaiera.
      entry.promise = fetchPhotoJson(photoRequestUrl(name, dept, country, near, lang))
        .then(function(data){
          entry.data = data;
          // Langue changée pendant la requête : mise à jour en arrière-plan, comme pour une photo déjà affichée.
          if(wikiLang() !== entry.lang) queuePhotoLangRefresh(entry, name, dept, country, near, wikiLang());
          return data;
        })
        .catch(function(){
          if(clientPhotoCache[key] === entry) delete clientPhotoCache[key];
          return { image:null, wikiUrl:null, title:null };
        });
      return entry.promise;
    }
    if(entry.data && entry.lang !== lang) queuePhotoLangRefresh(entry, name, dept, country, near, lang);
    return entry.promise;
  }
  var photoRefreshQueue = [], photoRefreshActive = 0, photoRefreshChanged = false;
  var PHOTO_REFRESH_CONCURRENCY = 2;
  function queuePhotoLangRefresh(entry, name, dept, country, near, lang){
    if(entry.refreshLang === lang) return; // déjà en file pour cette langue
    entry.refreshLang = lang;
    photoRefreshQueue.push(function(){
      if(wikiLang() !== lang){ entry.refreshLang = null; return Promise.resolve(); } // langue changée entre-temps
      return fetchPhotoJson(photoRequestUrl(name, dept, country, near, lang)).then(function(data){
        if(wikiLang() !== lang || !data){ entry.refreshLang = null; return; }
        var old = entry.data || {};
        // Photo déjà affichée : conservée, seul le lien (article dans la nouvelle langue, s'il existe) change.
        var merged = old.image
          ? Object.assign({}, old, { wikiUrl: data.wikiUrl || old.wikiUrl, title: data.title || old.title })
          : data;
        if(merged.wikiUrl !== old.wikiUrl || merged.image !== old.image) photoRefreshChanged = true;
        entry.data = merged;
        entry.lang = lang;
        entry.promise = Promise.resolve(merged);
      }).catch(function(){ entry.refreshLang = null; }); // échec : nouvel essai au prochain affichage
    });
    pumpPhotoRefresh();
  }
  function pumpPhotoRefresh(){
    while(photoRefreshActive < PHOTO_REFRESH_CONCURRENCY && photoRefreshQueue.length){
      photoRefreshActive++;
      Promise.resolve(photoRefreshQueue.shift()()).catch(function(){ /* tâche déjà protégée, filet de sécurité */ }).then(function(){
        photoRefreshActive--;
        // File vidée : un seul redessin du journal de bord, qui relit les données à jour (sans nouvelle requête).
        if(!photoRefreshQueue.length && !photoRefreshActive && photoRefreshChanged){
          photoRefreshChanged = false;
          scheduleDaysRerender();
        }
        pumpPhotoRefresh();
      });
    }
  }
  // Vrais points d'intérêt en direct (OpenStreetMap/Overpass, via notre serveur) pour les communes
  // hors de FEATURED — la grande majorité. Mis en cache 24h côté serveur, donc rarement lent en
  // pratique après le tout premier tirage sur une commune donnée ; silencieux et sans jamais
  // bloquer l'affichage si Overpass est indisponible (voir renderDays, qui retombe sur les
  // activités génériques déjà affichées si rien n'est trouvé).
  var clientPoiCache = {};
  // Résultats déjà arrivés, lisibles sans attendre une promesse : renderDays affiche alors directement les vraies
  // activités préchargées pendant le tirage, sans passer par les suggestions génériques (voir realPoiQueueSync).
  var clientPoiResolved = {};
  // `name`/`dept` (optionnels) permettent au serveur de compléter Overpass avec la section "Lieux
  // et monuments" de l'article Wikipédia de la commune, quand elle existe — souvent plus riche, et
  // déjà illustrée y compris pour des lieux sans article dédié (voir server.js). Cette extraction
  // reste pour l'instant limitée aux communes françaises (voir server.js) : `country` permet au
  // serveur de savoir quand ne pas s'y essayer inutilement.
  function fetchRealPOIs(lat, lon, name, dept, country){
    var key = lat.toFixed(3) + ',' + lon.toFixed(3);
    if(!clientPoiCache[key]){
      var url = '/api/pois?lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon);
      if(name) url += '&name=' + encodeURIComponent(name) + '&dept=' + encodeURIComponent(dept || '') + '&country=' + encodeURIComponent(country || '');
      cachePut(clientPoiCache, key, fetch(url)
        .then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function(data){ return (data && data.pois) || []; })
        .catch(function(){ delete clientPoiCache[key]; return null; }) // échec non mémorisé (voir fetchPlacePhoto)
        .then(function(pois){ if(pois === null) return []; cachePut(clientPoiResolved, key, pois); return pois; }));
    }
    return clientPoiCache[key];
  }
  // Une commune avec plusieurs nuits d'affilée a besoin d'activités DIFFÉRENTES chaque jour — sans
  // coordination, chaque jour ferait sa propre copie mélangée de la même liste de POI (fetchRealPOIs
  // est mémoïsé, donc c'est la MÊME liste à chaque fois) et pourrait retomber sur le même lieu deux
  // fois. On construit ici une seule file partagée par commune (mélangée une fois, à la première
  // résolution), que buildActivityOptions consomme ensuite par .splice() à chaque appel — exactement
  // le même principe que le partage de poisQueue/genericQueue entre nuits consécutives dans
  // buildItinerary (voir plus bas), appliqué cette fois à la mise à jour asynchrone après coup.
  var poiQueueByLocation = {};
  var genericQueueByLocation = {};
  function sharedPoiQueue(key, pois){
    if(!poiQueueByLocation[key]) poiQueueByLocation[key] = shuffle(pois || []);
    if(!genericQueueByLocation[key]) genericQueueByLocation[key] = shuffle(GENERIC_KEYS_NO_WALK);
    return { poisQueue: poiQueueByLocation[key], genericQueue: genericQueueByLocation[key], hasPois: !!(pois && pois.length) };
  }
  // Même file que realPoiQueueFor, mais seulement si les POI sont déjà arrivés (null sinon).
  function realPoiQueueSync(lat, lon){
    var key = lat.toFixed(3) + ',' + lon.toFixed(3);
    return Object.prototype.hasOwnProperty.call(clientPoiResolved, key) ? sharedPoiQueue(key, clientPoiResolved[key]) : null;
  }
  function realPoiQueueFor(lat, lon, name, dept, country){
    var key = lat.toFixed(3) + ',' + lon.toFixed(3);
    return fetchRealPOIs(lat, lon, name, dept, country).then(function(pois){ return sharedPoiQueue(key, pois); });
  }
  // Plusieurs vraies randonnées balisées (Visorando, via notre serveur) pour la suggestion
  // "balade" quand aucun POI de plein air (point de vue, cascade...) n'a été trouvé pour la
  // compléter — un vrai itinéraire préparé, avec sa propre trace, vaut mieux qu'une phrase
  // générique. La LISTE est mémoïsée par nom de commune (un seul appel réseau même pour plusieurs
  // nuits au même endroit) ; voir pickHikeForCommune juste après pour la distribution d'une rando
  // DIFFÉRENTE par jour à partir de cette liste partagée.
  var clientHikeCache = {};
  // Septembre 2026 : Visorando dans les pays qu'il couvre réellement, itinéraires balisés OpenStreetMap ailleurs (ou si
  // Visorando ne trouve rien), plus les portails de randonnée de référence du pays — d'où le pays et les coordonnées.
  function hikeKeyOf(leg){ return leg.stop + '|' + (leg.country || '') + '|' + (leg.lat != null ? Number(leg.lat).toFixed(3) + ',' + Number(leg.lon).toFixed(3) : ''); }
  function fetchHikeData(leg){
    var key = hikeKeyOf(leg);
    if(!clientHikeCache[key]){
      var url = '/api/hike?name=' + encodeURIComponent(leg.stop) + '&country=' + encodeURIComponent(leg.country || '') +
        (leg.lat != null ? '&lat=' + encodeURIComponent(leg.lat) + '&lon=' + encodeURIComponent(leg.lon) : '') +
        '&lang=' + encodeURIComponent(String(VISITOR_LANG).split('-')[0]);
      cachePut(clientHikeCache, key, fetch(url)
        .then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function(data){ return { hikes: (data && data.hikes) || [], portals: (data && data.portals) || [] }; })
        .catch(function(){ delete clientHikeCache[key]; return { hikes: [], portals: [] }; })); // échec non mémorisé
    }
    return clientHikeCache[key];
  }
  // Pioche une rando pas encore proposée pour cette commune — sans ça, deux nuits d'affilée au même
  // endroit pouvaient se voir suggérer exactement la même randonnée (le fetch est mémoïsé, donc
  // sans coordination, chaque appel choisirait au hasard dans la même liste). La file partagée est
  // construite une seule fois (au premier appel, une fois la liste connue) puis vidée par .shift() ;
  // comme fetchVisorandoHikeList est déjà mémoïsé, les .then() successifs pour la même commune
  // s'exécutent dans l'ordre d'attachement (une seule file, jamais recréée entre-temps) — chaque
  // jour reçoit donc bien un élément différent, tant qu'il en reste. File épuisée -> null (la
  // suggestion générique de repli reste affichée plutôt que de répéter une rando déjà proposée).
  var hikeQueueByCommune = {};
  // Randonnées déjà proposées sur l'ensemble du voyage en cours (par lien) : une même randonnée n'apparaît jamais deux
  // jours, même à deux étapes voisines qui la trouvent toutes les deux. Remis à zéro à chaque nouveau tirage.
  var usedHikeUrls = {};
  // Incrémenté à chaque nouveau voyage affiché : une réponse arrivée pour un voyage précédent ne consomme ni ne modifie
  // les files du voyage en cours.
  var tripGeneration = 0;
  function pickHikeForCommune(leg){
    var key = hikeKeyOf(leg);
    var gen = tripGeneration;
    return fetchHikeData(leg).then(function(data){
      if(gen !== tripGeneration) return null;
      if(!hikeQueueByCommune[key]) hikeQueueByCommune[key] = shuffle(data.hikes);
      var queue = hikeQueueByCommune[key];
      while(queue.length){
        var hike = queue.shift();
        if(!usedHikeUrls[hike.url]){ usedHikeUrls[hike.url] = true; return hike; }
      }
      return null;
    });
  }
  // Lance à l'avance les mêmes requêtes que renderDays fera plus tard (photo de chaque étape,
  // vrais POI Overpass pour les communes qui en ont besoin, puis photo de chacun des POI trouvés) —
  // appelée pendant l'animation de la roulette, qui dure quelques secondes, plutôt que d'attendre
  // que l'itinéraire s'affiche pour commencer. fetchPlacePhoto()/fetchRealPOIs() mémoïsent déjà
  // leur résultat par clé (nom+département, ou coordonnées) : renderDays() récupère donc une
  // promesse déjà résolue (ou bien avancée) au lieu de repartir de zéro — moins d'attente visible
  // pour les photos et les activités, sans changer le rythme de l'animation elle-même.
  // Renvoie une promesse résolue quand tout ce qui a été lancé est arrivé (succès ou échec) : le tirage attend ce
  // préchargement, dans une limite de temps, avant d'afficher l'itinéraire (voir PRELOAD_MAX_WAIT_MS).
  function prefetchLegAssets(legs){
    var pending = [];
    legs.forEach(function(leg){
      if(!leg.stop) return;
      pending.push(fetchPlacePhoto(leg.stop, leg.dept, leg.country, nearOf(leg.lat, leg.lon, 'stop')));
      if(leg.activities){
        leg.activities.forEach(function(opt){
          if(opt.isReal && opt.searchName) pending.push(fetchPlacePhoto(opt.searchName, leg.dept, leg.country, optNear(opt, leg)));
          // Réchauffe seulement la LISTE (mémoïsée, sans effet de bord) — piocher une rando
          // précise pour ce jour se décide au rendu (voir pickHikeForCommune), pas ici : appeler
          // pickHikeForCommune dès le préchargement consommerait la file avant même que renderDays
          // sache quels jours en ont réellement besoin. Visorando ne couvre que la France.
          if(opt.needsHike && leg.lat != null) pending.push(fetchHikeData(leg));
        });
      }
      if(leg.needsRealPOIs && leg.lat != null && leg.lon != null){
        pending.push(fetchRealPOIs(leg.lat, leg.lon, leg.stop, leg.dept, leg.country).then(function(dept, country, dayLeg){
          return function(pois){
            // Un lieu venu de la section Wikipédia "Lieux et monuments" apporte parfois déjà sa
            // photo (voir server.js) — pas besoin de la redemander via /api/photo dans ce cas.
            var more = (pois || []).slice(0, 6).filter(function(p){ return !p.image; }).map(function(p){ return fetchPlacePhoto(p.name, dept, country, optNear(p, dayLeg)); });
            // Aucun lieu de plein air parmi les POI : la journée proposera une randonnée, autant la chercher aussi.
            if(!(pois || []).some(function(p){ return WALK_POI_TYPES[p.type]; })) more.push(fetchHikeData(dayLeg));
            return Promise.all(more);
          };
        }(leg.dept, leg.country, leg)));
      }
    });
    return Promise.all(pending.map(function(p){ return Promise.resolve(p).catch(function(){}); }));
  }
  // Choisit une étape "aller-retour" plausible pour un jour unique, ou construit un itinéraire
  // réel à plusieurs étapes (buildRealRoute) pour un séjour plus long. Les activités viennent des
  // vrais points d'intérêt (FEATURED) quand la commune en a, sinon d'une suggestion générique
  // honnête. Le logement n'est plus une description inventée : seulement une catégorie indicative
  // (voir lodgingCategoryLabel) associée à de vrais liens de recherche Airbnb / Booking.
  // Construit jusqu'à 3 suggestions d'activités pour une journée : jusqu'à 2 vraies curiosités
  // locales (POI OSM, réellement nommées) quand il y en a, une suggestion de balade/randonnée
  // (réutilisant un POI de plein air — point de vue, cascade, sommet... — quand disponible plutôt
  // qu'une formule générique), puis on complète avec d'autres suggestions génériques jusqu'à 3.
  // `poisQueue` et `genericQueue` sont mutées (consommées au fil des jours d'un même séjour pour
  // éviter les répétitions), et `genericQueue` est réapprovisionnée si elle vient à manquer.
  // Options générées avec des clés/données brutes (typeKey, labelKey) plutôt que du texte déjà
  // traduit : renderActivityCards résout le texte affiché à CHAQUE rendu via I18N — nécessaire pour
  // qu'un changement de langue en cours de session retraduise correctement des activités déjà
  // tirées, sans avoir à refaire le tirage ni reconsommer les files partagées (voir écouteur
  // 'i18n:langchange' plus bas). Seuls poi.name/hike.name restent du texte "en dur" : ce sont de
  // vrais noms propres (lieux réels), pas des libellés d'interface.
  function buildActivityOptions(poisQueue, genericQueue){
    var options = [];
    // Un maximum d'un lieu par type (musée, mémorial, château...) — sans ça, une zone où un seul
    // type de POI domine largement en nombre (ex. les nombreux "Puits n°X" mémoriaux des anciens
    // bassins miniers du Nord) pouvait accaparer les 2 suggestions réelles avec deux variantes
    // quasi identiques du même genre de lieu, au détriment de la diversité.
    var usedTypes = {};
    var i = 0;
    while(options.length < 2 && i < poisQueue.length){
      var poi = poisQueue[i];
      if(usedTypes[diversityGroup(poi.type)]){ i++; continue; }
      poisQueue.splice(i, 1); // l'élément suivant glisse à cet index, donc on ne bouge pas i
      usedTypes[diversityGroup(poi.type)] = true;
      options.push({
        label: poi.name,
        typeKey: poi.type || null,
        searchName: poi.name,
        isReal: true,
        isWalk: !!WALK_POI_TYPES[poi.type],
        image: poi.image || null, // déjà résolue (galerie Wikipédia) : voir renderActivityCards
        imageFull: poi.imageFull || null,
        lat: poi.lat != null ? poi.lat : null, lon: poi.lon != null ? poi.lon : null,
        wikiUrl: poi.wikiUrl || null
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
          imageFull: walkPoi.imageFull || null,
          lat: walkPoi.lat != null ? walkPoi.lat : null, lon: walkPoi.lon != null ? walkPoi.lon : null,
          wikiUrl: walkPoi.wikiUrl || null
        });
      } else {
        // Aucun POI de plein air disponible pour compléter cette suggestion : on tentera une vraie
        // rando balisée via Visorando (voir renderActivityCards) plutôt que de garder cette formule
        // générique telle quelle. Si Visorando ne renvoie rien non plus, elle reste affichée ainsi.
        options.push({ labelKey: 'generic.walk', typeI18nKey: 'poiType.walkFallback', isReal: false, isWalk: true, needsHike: true });
      }
    }
    while(options.length < 3){
      if(genericQueue.length === 0){ Array.prototype.push.apply(genericQueue, shuffle(GENERIC_KEYS_NO_WALK)); }
      var gKey = genericQueue.shift();
      if(options.some(function(o){ return o.labelKey === gKey; })) continue; // évite le doublon dans la même journée
      options.push({ labelKey: gKey, typeI18nKey: 'poiType.generic', isReal: false, isWalk: false });
    }
    return options;
  }

  // Remplit (ou remplace intégralement le contenu de) `actList` avec des cartes d'activité pour
  // `activities`. Réutilisée à la fois pour l'affichage initial (activités FEATURED ou génériques,
  // disponibles immédiatement) et pour la mise à jour asynchrone quand de vrais points d'intérêt
  // arrivent d'Overpass (voir plus bas) — le rendu d'une carte est identique dans les deux cas.
  // Transforme le titre d'une carte d'activité en lien vers sa page Wikipédia (ou, pour un lieu
  // OSM sans article dédié, vers la page de description du fichier sur Commons — voir server.js) —
  // le seul moyen d'atteindre la source pour un lieu SANS image trouvée, qui sinon n'avait aucun
  // lien du tout. Sans effet si aucune URL n'est connue, ou si le titre est déjà un lien.
  function applyActivityCardWikiLink(cardEl, wikiUrl){
    if(!wikiUrl) return;
    var titleEl = cardEl.querySelector('.activity-card-title');
    if(!titleEl || titleEl.tagName === 'A') return;
    var link = document.createElement('a');
    link.className = 'activity-card-title';
    link.href = safeHref(wikiUrl);
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = titleEl.textContent;
    titleEl.replaceWith(link);
  }
  // Applique une image à une carte d'activité (remplace l'icône par défaut), avec filet de
  // sécurité si l'URL échoue au chargement. Partagé entre une image déjà connue à l'avance (voir
  // ci-dessous — cas d'un lieu venu de la galerie Wikipédia de la commune) et une image récupérée
  // après coup via /api/photo. Le titre devient aussi un lien direct vers la page (en plus du clic
  // sur l'image, qui ouvre l'agrandissement).
  function applyActivityCardImage(cardEl, label, image, imageFull, wikiUrl, photoData){
    var fullUrl = imageFull || image;
    var visual = cardEl.querySelector('.activity-card-visual');
    if(!visual) return;
    visual.innerHTML = '<img class="activity-card-img" src="'+safeUrl(image)+'" alt="'+escHtml(label)+'" referrerpolicy="no-referrer">';
    cardEl.classList.add('has-image');
    // Crédit de la photo sous le type d'activité (voir photoCreditInfo) : auteur et licence, ou lien vers la page du fichier.
    var credit = photoCreditInfo(photoData, fullUrl);
    var creditHtml = photoCreditHtml(credit);
    var body = cardEl.querySelector('.activity-card-body');
    var oldCredit = cardEl.querySelector('.activity-card-credit');
    if(oldCredit) oldCredit.remove();
    if(body && creditHtml){
      var creditEl = document.createElement('div');
      creditEl.className = 'activity-card-credit';
      creditEl.innerHTML = creditHtml;
      body.appendChild(creditEl);
    }
    var im = visual.querySelector('.activity-card-img');
    im.addEventListener('error', function(){
      cardEl.classList.remove('has-image');
      visual.innerHTML = icon('spark');
      var c = cardEl.querySelector('.activity-card-credit');
      if(c) c.remove();
    });
    // Agrandissement activable au clavier : la vignette se comporte comme un bouton (Entrée/Espace).
    visual.setAttribute('role', 'button');
    visual.setAttribute('tabindex', '0');
    visual.setAttribute('aria-label', t('photo.enlargeAria', {name: label}));
    // Écouteurs posés une seule fois par vignette (cette fonction peut être rappelée sur la même carte) : ils lisent
    // la dernière image appliquée.
    visual.__lightbox = { fullUrl: fullUrl, label: label, wikiUrl: wikiUrl, credit: credit };
    if(!visual.__lightboxBound){
      visual.__lightboxBound = true;
      var openFromVisual = function(){
        var d = visual.__lightbox;
        if(d && cardEl.classList.contains('has-image')) openLightbox(d.fullUrl, d.label, d.wikiUrl, d.credit);
      };
      visual.addEventListener('click', openFromVisual);
      visual.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openFromVisual(); }
      });
    }
    im.addEventListener('error', function(){
      visual.removeAttribute('role'); visual.removeAttribute('tabindex'); visual.removeAttribute('aria-label');
    });
    applyActivityCardWikiLink(cardEl, wikiUrl);
  }
  // Libellé/type affichés d'une option d'activité, résolus à la langue COURANTE — jamais mis en
  // cache sur l'option elle-même (voir buildActivityOptions : seules des clés y sont stockées),
  // pour qu'un changement de langue en cours de session (voir renderDays/écouteur
  // 'i18n:langchange') retraduise correctement un rendu déjà affiché en rappelant simplement cette
  // même fonction, sans avoir à retirer quoi que ce soit d'une file partagée.
  function optionLabel(opt){ return opt.isReal ? opt.label : t(opt.labelKey); }
  function optionTypeLabel(opt){
    if(opt.typeKey) return poiTypeLabel(opt.typeKey);
    if(opt.typeI18nKey) return t(opt.typeI18nKey);
    return t('poiType.fallback');
  }
  function hikeCardHtml(hike){
    var metaBits = [];
    if(hike.distance) metaBits.push(escHtml(hikeDistanceText(hike.distance)));
    if(hike.duration) metaBits.push(escHtml(hikeDurationText(hike.duration)));
    if(hike.difficulty) metaBits.push(escHtml(hikeDifficultyText(hike.difficulty)));
    return '<div class="activity-card-visual">'+icon('walk')+'</div>'+
      '<div class="activity-card-body">'+
        '<div class="activity-card-title">'+escHtml(hike.name)+'</div>'+
        '<div class="activity-card-type">'+(metaBits.length ? metaBits.join(' · ') : t('hike.defaultType'))+'</div>'+
        '<div class="activity-card-source">'+t('hike.sourceLabel', {source: escHtml(hike.source || 'Visorando')})+'</div>'+
      '</div>';
  }
  // Activités d'une journée une fois les vrais POI connus. Une vraie randonnée déjà trouvée et AFFICHÉE pour ce jour
  // reste en place : sans ça, elle apparaissait puis disparaissait dès l'arrivée des POI (un point de vue ou un sommet
  // prenait la place de la « balade »). Elle remplace de préférence la suggestion de balade générique, sinon une
  // suggestion générique ; un POI de plein air ainsi écarté retourne dans la file de la commune pour un autre jour.
  function upgradeActivities(dayLeg, shared){
    var freshActivities = buildActivityOptions(shared.poisQueue, shared.genericQueue);
    var keptHike = (dayLeg.activities || []).filter(function(o){ return o.hikeUrl; })[0];
    if(keptHike && !freshActivities.some(function(o){ return o.hikeUrl; })){
      var slot = freshActivities.findIndex(function(o){ return o.needsHike; });
      if(slot < 0) slot = freshActivities.findIndex(function(o){ return !o.isReal; });
      if(slot < 0){
        slot = freshActivities.findIndex(function(o){ return o.isWalk; });
        if(slot < 0) slot = freshActivities.length - 1;
        var displaced = freshActivities[slot];
        shared.poisQueue.push({ name: displaced.label, type: displaced.typeKey, image: displaced.image, imageFull: displaced.imageFull, wikiUrl: displaced.wikiUrl, lat: displaced.lat, lon: displaced.lon });
      }
      freshActivities[slot] = keptHike;
    }
    return freshActivities;
  }
  function renderActivityCards(actList, activities, dept, communeName, leg){
    actList.innerHTML = '';
    // Portails de randonnée de référence du pays (lien « Plus de randonnées »), une seule fois par étape.
    if(leg && leg.lat != null && activities.some(function(o){ return o.needsHike || o.hikeUrl; })){
      var portalKey = hikeKeyOf(leg);
      if(!portalsShownFor[portalKey] || portalsShownFor[portalKey] === actList){
        portalsShownFor[portalKey] = actList;
        fetchHikeData(leg).then(function(data){
          if(!data.portals.length || actList.querySelector('.hike-portals')) return;
          var row = document.createElement('div');
          row.className = 'hike-portals';
          row.innerHTML = '<span>' + t('hike.morePortals') + '</span> ' + data.portals.map(function(p){
            return '<a href="' + safeUrl(p.url) + '" target="_blank" rel="noopener">' + escHtml(p.name) + ' ↗</a>';
          }).join(' · ');
          actList.appendChild(row);
        });
      }
    }
    // Visorando ne couvre que la France (voir server.js) — inutile d'afficher "recherche d'une
    // vraie randonnée…" ni de tenter l'appel pour une commune d'un autre pays, la case générique
    // resterait de toute façon affichée telle quelle.
    var canHike = !!(leg && leg.lat != null); // Visorando ou OpenStreetMap selon le pays (voir /api/hike)
    activities.forEach(function(opt){
      // Une vraie rando a déjà été trouvée pour cette option lors d'un rendu précédent (voir plus
      // bas) — ex. un changement de langue redessine tout le jour, mais la découverte Visorando,
      // elle, reste acquise : pas la peine de rejouer la promesse mémoïsée pour ça, juste réafficher
      // la carte trouvée (avec ses textes d'interface retraduits).
      if(opt.hikeUrl){
        var foundCard = document.createElement('a');
        foundCard.className = 'activity-card has-hike';
        foundCard.href = safeHref(opt.hikeUrl);
        foundCard.target = '_blank';
        foundCard.rel = 'noopener';
        foundCard.innerHTML = hikeCardHtml({ name: opt.hikeName, url: opt.hikeUrl, distance: opt.hikeDistance, duration: opt.hikeDuration, difficulty: opt.hikeDifficulty, source: opt.hikeSource });
        actList.appendChild(foundCard);
        return;
      }
      var card = document.createElement('div');
      card.className = 'activity-card';
      var label = optionLabel(opt);
      // opt.hikeSearched : recherche de randonnée terminée sans résultat (hikes: []) — la mention « recherche d'une vraie
      // randonnée… » restait sinon affichée indéfiniment, y compris à chaque nouveau rendu (10e audit du 18/09/2026).
      var noteHtml = (opt.needsHike && canHike && !opt.hikeSearched)
        ? ' <span class="activities-loading-note">'+escHtml(t('activities.loadingHike'))+'</span>'
        : '';
      card.innerHTML =
        '<div class="activity-card-visual">'+icon(opt.isWalk ? 'walk' : 'spark')+'</div>'+
        '<div class="activity-card-body">'+
          '<div class="activity-card-title">'+escHtml(label)+'</div>'+
          // Échappé (10e audit) : typeKey/typeI18nKey viennent des données ; une clé inconnue revient telle quelle de t().
          '<div class="activity-card-type">'+escHtml(optionTypeLabel(opt))+noteHtml+'</div>'+
        '</div>';
      actList.appendChild(card);
      if(opt.image){
        // Déjà résolue côté serveur (galerie Wikipédia de la commune, ou tag OSM wikimedia_commons
        // — voir server.js) — pas besoin d'un aller-retour /api/photo supplémentaire. opt.wikiUrl
        // (commune, ou page de description Commons/article dédié pour un POI OSM) sert de lien sur
        // le titre.
        applyActivityCardImage(card, label, opt.image, opt.imageFull, opt.wikiUrl || null, opt);
      } else if(opt.isReal && opt.searchName){
        // Pour une vraie curiosité nommée (POI OSM sans photo déjà connue), on tente sa propre
        // photo Wikipédia (ex. l'intérieur d'un musée, le paysage d'un point de vue) — plutôt que
        // la photo générale de la commune. Même sans photo trouvée, un lien vers une vraie page
        // Wikipédia (quand une existe) reste appliqué au titre — mieux qu'aucun lien du tout.
        fetchPlacePhoto(opt.searchName, dept, leg && leg.country, optNear(opt, leg)).then(function(cardEl, label){
          return function(data){
            if(!data) return;
            if(data.image) applyActivityCardImage(cardEl, label, data.image, data.imageFull, data.wikiUrl, data);
            else applyActivityCardWikiLink(cardEl, data.wikiUrl);
          };
        }(card, label));
      } else if(opt.needsHike && canHike && communeName){
        // Aucun POI de plein air trouvé pour cette journée : on tente une vraie rando balisée sur
        // Visorando. On ne récupère QUE le nom et le lien — jamais leur trace GPS, leur texte de
        // description ni leurs photos (voir server.js) — et la carte entière renvoie directement
        // vers leur page, avec la source explicitement créditée. Si rien n'est trouvé, la carte
        // générique reste affichée telle quelle. pickHikeForCommune (pas un fetch direct) : évite
        // de reproposer la même rando pour deux jours au même endroit — mémoïsée sur `leg` lui-même
        // (pas juste par commune) car une même journée peut être rendue plusieurs fois (le rendu
        // générique initial, la mise à jour une fois les vrais POI arrivés, un changement de
        // langue...) : sans ce cache par jour, chaque rendu consommerait un élément de la file
        // partagée, la vidant avant même d'atteindre le jour suivant.
        var hikePromise = (leg && leg.__hikePromise) || pickHikeForCommune(leg);
        if(leg) leg.__hikePromise = hikePromise;
        var hikeGen = tripGeneration;
        hikePromise.then(function(cardEl, opt){
          return function(hike){
            if(hikeGen !== tripGeneration) return;
            if(!hike){
              // Aucune randonnée (liste vide ou déjà toutes proposées) : la suggestion générique reste, sans la mention de
              // recherche en cours, ici et dans les rendus suivants (changement de langue ou de devise).
              opt.hikeSearched = true;
              var pending = cardEl.querySelector('.activities-loading-note');
              if(pending) pending.remove();
              return;
            }
            // Carte déjà remplacée par les vrais POI avant l'arrivée de la randonnée, sans suggestion de balade à
            // compléter : la randonnée n'est pas affichée, elle est rendue à la file pour un autre jour.
            if(!cardEl.parentNode && leg && leg.activities && leg.activities.indexOf(opt) < 0 &&
               !leg.activities.some(function(o){ return o.needsHike && !o.hikeUrl; })){
              delete usedHikeUrls[hike.url];
              var queue = hikeQueueByCommune[hikeKeyOf(leg)];
              if(queue) queue.unshift(hike);
              leg.__hikePromise = null;
              return;
            }
            // On mémorise la trouvaille directement sur `opt` (donc sur leg.activities, puisque
            // c'est le même objet) — pas seulement dans le DOM — pour que l'export PDF (voir
            // buildTripExportPayload) et un futur rendu (voir plus haut, opt.hikeUrl) reflètent la
            // vraie randonnée trouvée plutôt que la formule générique de repli.
            opt.hikeName = hike.name; opt.hikeUrl = hike.url;
            opt.hikeDistance = hike.distance; opt.hikeDuration = hike.duration; opt.hikeDifficulty = hike.difficulty; opt.hikeSource = hike.source || 'Visorando';
            if(!cardEl.parentNode) return;
            var newCard = document.createElement('a');
            newCard.className = 'activity-card has-hike';
            newCard.href = safeHref(hike.url);
            newCard.target = '_blank';
            newCard.rel = 'noopener';
            newCard.innerHTML = hikeCardHtml(hike);
            cardEl.parentNode.replaceChild(newCard, cardEl);
          };
        }(card, opt));
      }
    });
  }

  // Regroupe les nuits consécutives passées dans la même ville en une seule "case" (un seul
  // day-card à l'affichage) — par construction de buildItinerary, les nuits d'un même séjour sont
  // déjà contiguës dans `legs`, donc regrouper des voisins qui partagent le même `stop` (et ne sont
  // jamais un retour) suffit, pas besoin de comparer autre chose. startDay/endDay (1-based, jour
  // global du voyage) servent au badge et au titre combiné (voir formatDayRangeLabel).
  // Identité d'une étape : nom ET coordonnées — deux communes homonymes voisines (ex. deux « Thoiry ») tirées l'une
  // après l'autre restent deux séjours distincts.
  function stopKey(leg){
    return (leg.stop || '') + '|' + (leg.lat != null ? Number(leg.lat).toFixed(4) : '') + ',' + (leg.lon != null ? Number(leg.lon).toFixed(4) : '');
  }
  function groupLegsByStay(legs){
    var groups = [];
    legs.forEach(function(leg, idx){
      var prev = groups[groups.length - 1];
      if(!leg.isReturn && prev && !prev.legs[0].isReturn && stopKey(prev.legs[0]) === stopKey(leg)){
        prev.legs.push(leg);
        prev.endDay = idx + 1;
      } else {
        groups.push({ legs: [leg], startDay: idx + 1, endDay: idx + 1 });
      }
    });
    return groups;
  }
  // Pastille du numéro de jour (journal de bord et, depuis le 12e audit du 19/09/2026, chaque étape du PDF : champ
  // `badge`) : « ⟲ » pour le retour, « 3–5 » pour un séjour de plusieurs jours, chiffres de la langue d'interface.
  function dayBadgeText(group){
    if(group.legs[0].isReturn) return '⟲';
    return group.legs.length > 1 ? formatNum(group.startDay) + '–' + formatNum(group.endDay) : formatNum(group.startDay);
  }
  // Pastille de chaque étape du PDF (13e audit du 19/09/2026) : le PDF dessine une pastille PAR JOUR, et recevait pour
  // chacun la plage du séjour (« 1–3 » trois fois de suite). Chaque étape porte désormais son propre numéro de jour
  // (position dans le voyage, comme startDay/endDay de groupLegsByStay), chiffres de la langue ; « ⟲ » pour le retour,
  // que le serveur remplace par « R » (aucune police du PDF ne le dessine). L'écran garde la plage (dayBadgeText).
  function pdfLegBadges(legs){
    return legs.map(function(leg, idx){ return leg.isReturn ? '⟲' : formatNum(idx + 1).slice(0, 12); });
  }
  function formatDayRangeLabel(startDay, endDay){
    return (endDay - startDay === 1)
      ? t('day.rangeAnd', {a: formatNum(startDay), b: formatNum(endDay)})
      : t('day.rangeTo', {a: formatNum(startDay), b: formatNum(endDay)});
  }
  // Titre d'un day-card à un seul jour (voir buildItinerary : labelKind/dayNum posés au moment de
  // la construction de l'itinéraire, résolus en texte ICI plutôt que figés dans `leg.label` à la
  // construction) — nécessaire pour qu'un changement de langue en cours de session (voir
  // renderDays rappelé depuis l'écouteur 'i18n:langchange') retraduise correctement un itinéraire
  // déjà affiché sans avoir à le reconstruire.
  function singleLegLabel(leg){
    switch(leg.labelKind){
      case 'single': return t('day.single');
      case 'returnBare': return t('day.return');
      case 'day': return t('day.n', {n: formatNum(leg.dayNum)});
      case 'dayReturn': return t('day.nReturn', {n: formatNum(leg.dayNum)});
      default: return leg.label || '';
    }
  }

  /* ---------- RENDER: DAYS ---------- */
  // Avertissement « zone à tension » (France Diplomatie) : rouge = formellement déconseillé, orange =
  // déconseillé sauf raison impérative. Le libellé est traduit ; le lien mène à la fiche officielle.
  function tensionRowHtml(tension, textKey){
    var link = tension.source ? ' <a href="'+safeUrl(tension.source)+'" target="_blank" rel="noopener">'+t('tension.link')+'</a>' : '';
    return icon('warn') + '<span><span class="lbl">'+t('tension.label')+'</span>'+t(textKey)+link+'</span>';
  }

  // Échappement HTML des textes venus des données (noms de lieux des règles de circulation).
  function escHtml(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
  // Avertissement de circulation (van / moto) : même style que les zones à tension (orange), lien vers la source.
  function restrictionRowHtml(r){
    // Règle nationale (moto) : nom du pays dans la langue d'interface quand le navigateur le connaît (voir
    // countryDisplayName), sinon le nom reçu du serveur.
    var name = r.name || '';
    if(r.type === 'noMotorway' || r.type === 'noMotorwayCc' || r.type === 'partial') name = countryDisplayName(r.country, name);
    // r.kind/r.type/r.minCc viennent du serveur : clé validée (tData), cylindrée numérique seulement (10e audit).
    var cc = isFinite(Number(r.minCc)) && r.minCc !== '' && r.minCc != null ? formatNum(r.minCc) : '';
    var txt = tData(String(r.kind) + '.' + String(r.type), { name: escHtml(name), cc: cc });
    var src = r.source ? ' <a href="' + safeUrl(r.source) + '" target="_blank" rel="noopener">' + t('restriction.source') + '</a>' : '';
    return icon('warn') + '<span>' + txt + src + '</span>';
  }
  // Liens d'hébergement : Airbnb et Booking.com quand ils sont disponibles dans le pays, plateformes locales réelles là où
  // l'un d'eux est absent ou faible (voir LODGING_RULES) ; aucun lien connu : invitation à réserver en direct.
  // Le serveur fige la devise dans les liens Airbnb/Booking au moment du tirage : on la recalcule au rendu (devise
  // choisie dans le sélecteur, sinon celle du pays de l'étape), avec le plafond de prix correspondant. Seuls les
  // paramètres déjà présents dans l'URL sont modifiés (currency/price_max pour Airbnb ; selected_currency et le filtre
  // de prix nflt=price=DEVISE-0-MAX-1 pour Booking).
  // Langue d'affichage d'Airbnb/Booking (10e audit du 18/09/2026 : les liens ouvraient toujours le site en français).
  // Le domaine reste celui produit par le moteur (www.airbnb.fr, www.booking.com : seuls hôtes acceptés dans le PDF par
  // le serveur) ; la langue passe par le paramètre locale= d'Airbnb et par le suffixe searchresults.<langue>.html de
  // Booking. Langue retenue : celle de la locale d'interface (I18N.localeTag, qui retombe déjà sur la langue de contact
  // du territoire : luxembourgeois -> allemand, sorabe -> allemand…), si la plateforme la propose ; sinon l'anglais.
  var AIRBNB_LOCALES = ('af az bs ca cs cy da de et en es fr ga hr xh zu is it sw lv lt hu mt ms nl no pl pt ro sq sk sl sr ' +
    'fi sv tl vi tr el bg be mk ru uk ka hy he ar hi th ko ja zh id bn ta mr kk mn').split(' ');
  var BOOKING_LOCALES = { en: 'en-gb', de: 'de', nl: 'nl', fr: 'fr', es: 'es', ca: 'ca', it: 'it', pt: 'pt-pt', no: 'no', nb: 'no',
    fi: 'fi', sv: 'sv', da: 'da', cs: 'cs', hu: 'hu', ro: 'ro', ja: 'ja', pl: 'pl', el: 'el', ru: 'ru', tr: 'tr', bg: 'bg', ar: 'ar',
    ko: 'ko', he: 'he', lv: 'lv', uk: 'uk', hr: 'hr', id: 'id', ms: 'ms', th: 'th', et: 'et', lt: 'lt', sk: 'sk', sr: 'sr',
    sl: 'sl', vi: 'vi', tl: 'tl', fil: 'tl', is: 'is' };
  function platformLang(){
    var tag = String(localeTag() || 'fr-FR');
    var parts = tag.split('-'), primary = parts[0].toLowerCase();
    var isHant = /-(Hant|TW|HK|MO)\b/i.test(tag);
    return {
      airbnb: primary === 'zh' ? (isHant ? 'zh-TW' : 'zh') : (AIRBNB_LOCALES.indexOf(primary) !== -1 ? primary : 'en'),
      booking: primary === 'zh' ? (isHant ? 'zh-tw' : 'zh-cn') : (primary === 'pt' && /-BR\b/i.test(tag) ? 'pt-br' : (BOOKING_LOCALES[primary] || 'en-gb'))
    };
  }
  function lodgingUrlWithCurrency(url, country, budgetKey){
    var u;
    try { u = new URL(url); } catch(e){ return url; }
    if(!/^https?:$/.test(u.protocol)) return url;
    // Devise ET plafond viennent de linkLodgingCap (plafond du pays de l'étape, dans la devise choisie si Airbnb/Booking
    // l'acceptent, sinon celle du pays ou l'euro — même règle que le moteur).
    var cap = budgetKey ? linkLodgingCap(country, budgetKey) : { currency: countryCurrency(country), max: null };
    var currency = cap.currency;
    var priceMax = cap.max != null ? Math.round(cap.max) : null;
    var p = u.searchParams, changed = false;
    var pl = platformLang();
    if(/(^|\.)airbnb\./i.test(u.hostname)){
      if(p.has('currency')){ p.set('currency', currency); changed = true; }
      if(priceMax != null && p.has('price_max')){ p.set('price_max', String(priceMax)); changed = true; }
      p.set('locale', pl.airbnb); changed = true;
    } else if(/(^|\.)booking\.com$/i.test(u.hostname)){
      if(/^\/searchresults\.[a-z-]+\.html$/i.test(u.pathname)){ u.pathname = '/searchresults.' + pl.booking + '.html'; changed = true; }
      // Toujours posée (le serveur ne la met pas) : affichage des prix dans la devise du filtre de prix ci-dessous.
      if(/^[A-Z]{3}$/.test(currency || '')){ p.set('selected_currency', currency); changed = true; }
      var nflt = p.get('nflt');
      if(nflt && priceMax != null && /price=[A-Z]{3}-\d+-\d+-1/.test(nflt)){
        p.set('nflt', nflt.replace(/price=[A-Z]{3}-(\d+)-\d+-1/, 'price=' + currency + '-$1-' + priceMax + '-1'));
        changed = true;
      }
    }
    return changed ? u.toString() : url;
  }
  function lodgingLinksHtml(links, country, budgetKey){
    var html = '';
    if(links.airbnb) html += '<a href="'+safeUrl(lodgingUrlWithCurrency(links.airbnb, country, budgetKey))+'" target="_blank" rel="noopener" class="lodging-link">'+t('lodging.airbnb')+'</a>';
    if(links.booking) html += '<a href="'+safeUrl(lodgingUrlWithCurrency(links.booking, country, budgetKey))+'" target="_blank" rel="noopener" class="lodging-link">'+t('lodging.booking')+'</a>';
    (links.local || []).forEach(function(p){
      if(!/^https:\/\//.test(p.url)) return;
      html += '<a href="'+safeUrl(p.url)+'" target="_blank" rel="noopener" class="lodging-link">'+escHtml(p.name)+' ↗</a>';
    });
    return html || '<span class="lodging-none">'+t('lodging.noPlatform')+'</span>';
  }
  // Redessin du journal de bord regroupé (plusieurs réponses de POI peuvent arriver dans la même tâche). Seuls les jours
  // sont redessinés : la carte garderait sinon son zoom réinitialisé à chaque arrivée de POI.
  var daysRerenderTimer = null;
  function scheduleDaysRerender(){
    if(daysRerenderTimer) return;
    daysRerenderTimer = setTimeout(function(){
      daysRerenderTimer = null;
      if(currentTripData) renderDays(currentTripData);
    }, 0);
  }
  // Kilométrage total arrondi (distances d'étapes et parties routières des traversées).
  function tripTotalKm(legs){
    return Math.round(legs.reduce(function(s, l){ return s + (Number(l.distanceKm) || 0) + (Number(l.roadKm) || 0); }, 0));
  }
  function tripCurrencyNoRateText(trip){
    if(!getPreferredCurrency()) return '';
    var used = [];
    trip.legs.forEach(function(l){
      if(l.lodgingLinks && l.country && (l.lodgingLinks.airbnb || l.lodgingLinks.booking)) used.push(linkLodgingCap(l.country, trip.budgetKey).currency);
    });
    return currencyLinkFallbackText(used);
  }
  // Traversée (écran et PDF). Ce que couvre le tarif (priceCovers, 11e audit) : véhicule seul (+ tarif piéton par
  // personne s'il est connu), véhicule et conducteur, tous les occupants, ou non précisé par la grille ; gratuit (bacs
  // norvégiens…) ; tarif sans précision (vélo, moteur plus ancien : champ absent). Durée non publiée : « environ ».
  // html : route déjà échappée/traduite par tData, montants échappés ; sinon texte brut pour le PDF.
  function ferryLabel(fi){ return t(fi.mode === 'train' ? 'ferry.trainLabel' : 'ferry.label'); }
  // Tarif piéton (voyage à vélo : classe 'foot' du moteur, sans priceCovers) : un prix PAR PERSONNE, à dire comme tel à
  // l'écran, dans le PDF et dans le total (12e audit du 19/09/2026 : « ~12 € » seul laissait croire à un prix pour tous).
  function ferryFootFare(fi, transportKey){
    if(!fi || fi.mode === 'train') return false;
    if(fi.fareClass) return fi.fareClass === 'foot';
    return !('priceCovers' in fi) && !!(TRANSPORT[transportKey] && TRANSPORT[transportKey].ferryClass === 'foot');
  }
  // Ferry PIÉTON UNIQUEMENT (route passengerOnly du moteur) : l'île reste proposée, mais le véhicule doit rester au
  // port. L'avertissement ne concerne que les voyageurs motorisés : à vélo la classe est déjà 'foot' et la phrase
  // serait fausse.
  function ferryNoVehicles(fi, transportKey){
    return !!(fi && fi.passengerOnly && TRANSPORT[transportKey] && TRANSPORT[transportKey].ferryClass !== 'foot');
  }
  function ferryPriceText(fi, transportKey){
    var amt = Number(fi.amount);
    if(amt === 0) return t('ferry.price.free');
    var a = approxMoney(amt, 'EUR');
    if(ferryFootFare(fi, transportKey)) return t('ferry.price.perPerson', { amount: a });
    var foot = (fi.footAmount != null && isFinite(Number(fi.footAmount)) && Number(fi.footAmount) > 0) ? approxMoney(Number(fi.footAmount), 'EUR') : null;
    if(!('priceCovers' in fi)) return a;
    switch(fi.priceCovers){
      case 'vehicle': return foot ? t('ferry.price.vehicle', { amount: a, foot: foot }) : t('ferry.price.vehicleOnly', { amount: a });
      case 'vehicleAndDriver': return foot ? t('ferry.price.vehicleDriver', { amount: a, foot: foot }) : t('ferry.price.vehicleDriverOnly', { amount: a });
      case 'vehicleAndOccupants': return t('ferry.price.allIncluded', { amount: a });
      default: return t('ferry.price.unspecified', { amount: a });
    }
  }
  // Route inconnue (clé absente des traductions) : phrase sans la route ni le séparateur qui la suit ou la précède
  // (12e audit du 19/09/2026 : « Train-auto —  — ~75 € » dans le PDF). La route est remplacée par un repère, retiré avec
  // la ponctuation voisine, quelle que soit sa place dans la phrase traduite.
  var ROUTE_MARK = '\u0001';
  function withoutEmptyRoute(s){
    if(s.indexOf(ROUTE_MARK) < 0) return s;
    // Séparateurs : tirets (« —— » chinois compris), point médian, deux-points, virgules latine, arabe et chinoise.
    // 13e audit du 19/09/2026 : barre horizontale « ― » (U+2015) et point médian katakana « ・ » (U+30FB) du japonais.
    var sep = '[—–―·・:：،,，、-]+';
    var after = new RegExp(ROUTE_MARK + '\\s*' + sep + '\\s*'), before = new RegExp('\\s*' + sep + '\\s*' + ROUTE_MARK);
    s = after.test(s) ? s.replace(after, ' ') : before.test(s) ? s.replace(before, ' ') : s.replace(ROUTE_MARK, ' ');
    return s.replace(/ {2,}/g, ' ').trim();
  }
  function ferryText(fi, route, html, transportKey){
    var dur = formatDurationMin(fi.durationH * 60);
    if(fi.durationEstimated) dur = t('ferry.durationApprox', { duration: dur });
    if(html) dur = escHtml(dur);
    var r = route || ROUTE_MARK;
    if(fi.amount === null || fi.amount === undefined) return withoutEmptyRoute(t('ferry.textNoPrice', { route: r, duration: dur }));
    var price = ferryPriceText(fi, transportKey);
    return withoutEmptyRoute(t('ferry.textPriced', { route: r, price: html ? escHtml(price) : price, duration: dur }));
  }
  // Libellé du total ferry : les montants additionnés ne couvrent pas tous la même chose (véhicule seul, conducteur
  // compris, tous les occupants…) — dit honnêtement dès qu'un tarif ne comprend pas tous les passagers ou ne le précise pas.
  // Tarifs piétons (vélo) : total par personne (12e audit).
  function ferryTotalLabel(pricedLegs, transportKey){
    if(pricedLegs.length && pricedLegs.every(function(l){ return ferryFootFare(l.ferryInfo, transportKey); })) return t('stats.ferryTotalPerPerson');
    var mixed = pricedLegs.some(function(l){ var fi = l.ferryInfo; return Number(fi.amount) > 0 && ('priceCovers' in fi) && fi.priceCovers !== 'vehicleAndOccupants'; });
    return t(mixed ? 'stats.ferryTotalVehicles' : 'stats.ferryTotal');
  }
  // Kilomètres parcourus en ferry (distanceKm d'une étape avec traversée = la traversée ; roadKm = la route jusqu'au port).
  // Commentaire remis au-dessus de sa fonction (12e audit du 19/09/2026 : il précédait tripCurrencyNoRateText).
  function tripFerryKm(legs){
    // Train-auto (Sylt) exclu : ce ne sont pas des kilomètres « en ferry » (11e audit).
    return Math.round(legs.reduce(function(s, l){ return s + (l.ferryInfo && l.ferryInfo.mode !== 'train' ? (Number(l.distanceKm) || 0) : 0); }, 0));
  }
  // `trip` : le voyage affiché (voir currentTripData) — avertissements et zone de départ viennent de LUI, jamais d'une
  // réponse de tirage pas encore affichée.
  function renderDays(trip){
    var legs = trip.legs;
    els.days.innerHTML = '';
    portalsShownFor = {};
    // Avertissements valables pour tout le trajet (van : gabarit et vignettes ; électrique : couverture des bornes).
    (trip.notices || []).forEach(function(key){
      var note = document.createElement('div');
      note.className = 'day-row tension-row tension-orange';
      note.innerHTML = icon('warn') + '<span>' + tData(key) + '</span>';
      els.days.appendChild(note);
    });
    // Devise choisie non proposée par Airbnb/Booking : dit une seule fois pour tout le voyage (11e audit), au lieu de
    // liens d'hébergement qui passaient sans explication à une autre devise.
    var noRate = tripCurrencyNoRateText(trip);
    if(noRate){
      var rateNote = document.createElement('div');
      rateNote.className = 'day-row tension-row tension-orange';
      rateNote.innerHTML = icon('warn') + '<span>' + escHtml(noRate) + '</span>';
      els.days.appendChild(rateNote);
    }
    if(trip.departureTension){
      var depWarn = document.createElement('div');
      depWarn.className = 'day-row tension-row tension-' + trip.departureTension.level;
      depWarn.innerHTML = tensionRowHtml(trip.departureTension, 'tension.departure');
      els.days.appendChild(depWarn);
    }
    // Un seul rappel de vignette PAR PAYS pour tout l'itinéraire (pas à chaque jour/étape qui y
    // reste ou y repasse) — voir son affichage plus bas, dans la boucle groups.forEach. Remis à
    // zéro à chaque appel de renderDays, y compris depuis l'écouteur 'i18n:langchange' : le rappel
    // réapparaît alors sur la même première étape concernée, dans la nouvelle langue.
    var shownVignetteCountries = {};

    // Un séjour de plusieurs nuits au même endroit devient une seule "case" (un seul day-card) —
    // voir groupLegsByStay. Le badge/titre résument la plage de jours ; le trajet/péage/photo ne
    // sont montrés qu'une fois (ceux du jour d'arrivée) ; en revanche chaque jour du séjour garde
    // SA PROPRE section "Activités possibles" (voir la boucle dédiée plus bas), pour ne jamais
    // reproposer le même lieu deux fois au même endroit (voir realPoiQueueFor/pickHikeForCommune).
    var groups = groupLegsByStay(legs);
    groups.forEach(function(group, gIdx){
      var firstLeg = group.legs[0];
      var isMultiDay = group.legs.length > 1;
      var card = document.createElement('div');
      card.className = 'day-card';
      card.style.animationDelay = (gIdx*0.09)+'s';

      var badge = document.createElement('div');
      badge.className = 'day-badge';
      var num = document.createElement('div');
      num.className = 'num' + (firstLeg.isReturn? ' final':'') + (isMultiDay ? ' range' : '');
      // Chiffres de la langue d'interface (١, ၁, ๑…), comme le reste du journal de bord (11e audit).
      num.textContent = dayBadgeText(group);
      num.setAttribute('aria-hidden', 'true');
      badge.appendChild(num);
      if(gIdx < groups.length-1){
        var line = document.createElement('div');
        line.className = 'line';
        badge.appendChild(line);
      }
      card.appendChild(badge);

      var body = document.createElement('div');
      body.className = 'day-body';

      var top = document.createElement('div');
      top.className = 'day-top';
      var h3 = document.createElement('h3');
      h3.textContent = isMultiDay ? formatDayRangeLabel(group.startDay, group.endDay) : singleLegLabel(firstLeg);
      var rt = document.createElement('div');
      rt.className = 'route-time';
      // Étape avec traversée : partie par la route (jusqu'au port, puis depuis le port d'arrivée) + traversée, avec les
      // libellés existants des deux (déjà traduits dans toutes les langues).
      // textContent : aucun balisage dans ces libellés, rien à interpréter.
      rt.textContent = legRouteText(firstLeg);
      top.appendChild(h3);
      if(rt.textContent) top.appendChild(rt);
      body.appendChild(top);

      var stopEl = document.createElement('div');
      stopEl.className = 'day-stop';
      // Le code postal désambiguïse les nombreuses communes homonymes (ex. 3 "Thoiry" en France) —
      // sans lui, impossible de savoir laquelle a été tirée au sort rien qu'au nom.
      var stopLabel = firstLeg.stop + (firstLeg.cp ? ' (' + formatCpBadge(firstLeg) + ')' : '');
      stopEl.textContent = t(firstLeg.isReturn ? 'day.returnTo' : 'day.stepMystery', {stop: stopLabel});
      body.appendChild(stopEl);

      if(firstLeg.stop){
        var photos = buildPhotoLinks(firstLeg.stop, firstLeg.country);
        var tile = document.createElement('div');
        tile.className = 'photo-tile';
        tile.innerHTML =
          '<a class="photo-tile-main" href="'+safeUrl(photos.images)+'" target="_blank" rel="noopener">'+
            '<span class="photo-tile-icon">'+icon('camera')+'</span>'+
            '<span class="photo-tile-text">'+
              '<span class="photo-tile-title">'+t('photo.view', {name: escHtml(firstLeg.stop)})+'</span>'+
              '<span class="photo-tile-sub">'+t('photo.searching')+'</span>'+
            '</span>'+
          '</a>'+
          '<a class="photo-tile-wiki" href="'+safeUrl(photos.wiki)+'" target="_blank" rel="noopener">'+t('wiki.link')+'</a>';
        body.appendChild(tile);

        fetchPlacePhoto(firstLeg.stop, firstLeg.dept, firstLeg.country, nearOf(firstLeg.lat, firstLeg.lon, 'stop')).then(function(stopName, tileEl, photoLinks){
          return function(data){
            if(data && data.image){
              var articleUrl = data.wikiUrl || photoLinks.wiki;
              var fullUrl = data.imageFull || data.image;
              var creditInfo = photoCreditInfo(data, fullUrl);
              var creditHtml = photoCreditHtml(creditInfo);
              tileEl.className = 'photo-tile has-image';
              tileEl.innerHTML =
                '<button type="button" class="photo-tile-imgwrap" aria-label="'+t('photo.enlargeAria', {name: escHtml(stopName)})+'">'+
                  '<img class="photo-tile-img" src="'+safeUrl(data.image)+'" alt="'+escHtml(stopName)+'" referrerpolicy="no-referrer">'+
                  '<span class="photo-tile-zoom">'+icon('zoom')+'</span>'+
                '</button>'+
                '<div class="photo-tile-caption">'+
                  '<span class="photo-tile-text">'+
                    '<span class="photo-tile-title">'+escHtml(stopName)+'</span>'+
                    '<span class="photo-tile-sub">'+t('photo.real')+'</span>'+
                    (creditHtml ? '<span class="photo-tile-credit">'+creditHtml+'</span>' : '')+
                  '</span>'+
                  '<a class="photo-tile-wiki" href="'+safeUrl(articleUrl)+'" target="_blank" rel="noopener">'+t('wiki.link')+'</a>'+
                '</div>';
              // Filet de sécurité : si l'URL d'image renvoyée par Wikipédia échoue quand même
              // au chargement (lien mort, hotlink refusé...), on retombe sur la tuile de secours
              // plutôt que de laisser une icône d'image cassée affichée.
              var imgEl = tileEl.querySelector('.photo-tile-img');
              if(imgEl){
                imgEl.onerror = function(){
                  tileEl.className = 'photo-tile';
                  tileEl.innerHTML =
                    '<a class="photo-tile-main" href="'+safeUrl(photoLinks.images)+'" target="_blank" rel="noopener">'+
                      '<span class="photo-tile-icon">'+icon('camera')+'</span>'+
                      '<span class="photo-tile-text">'+
                        '<span class="photo-tile-title">'+t('photo.view', {name: escHtml(stopName)})+'</span>'+
                        '<span class="photo-tile-sub">'+t('photo.unavailable')+'</span>'+
                      '</span>'+
                    '</a>'+
                    '<a class="photo-tile-wiki" href="'+safeUrl(articleUrl)+'" target="_blank" rel="noopener">'+t('wiki.link')+'</a>';
                };
              }
              var imgWrapBtn = tileEl.querySelector('.photo-tile-imgwrap');
              if(imgWrapBtn){
                imgWrapBtn.addEventListener('click', function(){ openLightbox(fullUrl, stopName, articleUrl, creditInfo); });
              }
            } else {
              var sub = tileEl.querySelector('.photo-tile-sub');
              if(sub) sub.textContent = t('photo.none');
            }
          };
        }(firstLeg.stop, tile, photos));
      }

      // Trajet plus long que la distance max entre étapes, imposé par l'éloignement minimum (voir overMaxLeg dans
      // lib/trip-engine.js) : signalé plutôt que passé sous silence (8e audit du 18/09/2026).
      if(firstLeg.overMaxLeg){
        var overRow = document.createElement('div');
        overRow.className = 'day-row tension-row tension-orange';
        overRow.innerHTML = icon('warn') + '<span>' + escHtml(overMaxLegText(firstLeg.overMaxLeg)) + '</span>';
        body.appendChild(overRow);
      }
      if(firstLeg.tollInfo){
        var ti = firstLeg.tollInfo;
        var tollRow = document.createElement('div');
        tollRow.className = 'day-row';
        var tollTxt = escHtml(tollText(ti)) + ' ' + t('toll.estimateNote');
        // Barème du ou des pays traversés (ex. Autostrade per l'Italia), pas celui d'ASF pour tous.
        var tollSources = (Array.isArray(ti.countries) ? ti.countries : [firstLeg.country])
          .map(tollSourceLabel).filter(function(x, i, a){ return x && a.indexOf(x) === i; });
        tollRow.innerHTML = icon('toll') + '<span><span class="lbl">'+escHtml(t('toll.label', {source: tollSources.join(' + ') || '—'}))+'</span>'+tollTxt+'</span>';
        body.appendChild(tollRow);
      }
      if(firstLeg.tension && !firstLeg.isReturn){
        var tensionRow = document.createElement('div');
        tensionRow.className = 'day-row tension-row tension-' + firstLeg.tension.level;
        tensionRow.innerHTML = tensionRowHtml(firstLeg.tension, firstLeg.tension.level === 'red' ? 'tension.red' : 'tension.orange');
        body.appendChild(tensionRow);
      }
      if(firstLeg.ferryInfo){
        var fi = firstLeg.ferryInfo;
        var ferryRow = document.createElement('div');
        ferryRow.className = 'day-row';
        // routeKey vient du serveur : traduction connue échappée, sinon phrase sans route (12e audit du 19/09/2026 ;
        // la clé brute s'affichait auparavant, échappée par tData).
        var ferryRoute = tIfDefined(fi.routeKey);
        var ferryTxt = ferryText(fi, ferryRoute ? escHtml(ferryRoute) : '', true, trip.transportKey);
        ferryRow.innerHTML = icon(fi.mode === 'train' ? 'train' : 'ferry') + '<span><span class="lbl">'+escHtml(ferryLabel(fi))+'</span>'+ferryTxt+'</span>';
        body.appendChild(ferryRow);
        if(ferryNoVehicles(fi, trip.transportKey)){
          var ferryNoVeh = document.createElement('div');
          ferryNoVeh.className = 'day-row tension-row tension-orange';
          ferryNoVeh.innerHTML = icon('warn') + '<span>'+t('ferry.noVehicles')+'</span>';
          body.appendChild(ferryNoVeh);
        }
        // Liaison réelle sans tarif fixe publié : avertissement dans le style des zones à tension (orange).
        if(fi.amount === null){
          var ferryWarn = document.createElement('div');
          ferryWarn.className = 'day-row tension-row tension-orange';
          ferryWarn.innerHTML = icon('warn') + '<span>'+t(fi.priceStatus === 'variable' ? 'ferry.price.variable' : 'ferry.price.unknown')+'</span>';
          body.appendChild(ferryWarn);
        }
      }
      if(firstLeg.chargeInfo){
        var c = firstLeg.chargeInfo;
        if(c.stops > 0){
          var chargeRow = document.createElement('div');
          chargeRow.className = 'day-row';
          var chargeTxt;
          if(c.real && c.stations){
            // Recharges sur des bornes réelles (Open Charge Map) : lieu habité le plus proche de chaque borne, lien carte.
            // Coordonnées validées comme nombres (10e audit : s.lat/s.lon insérés tels quels dans l'attribut href).
            var places = c.stations.map(function(s){
              var la = Number(s.lat), lo = Number(s.lon);
              var coordsOk = isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
              var label = escHtml(s.near || (coordsOk ? la.toFixed(3) + ', ' + lo.toFixed(3) : ''));
              if(!coordsOk) return label;
              return '<a href="https://www.openstreetmap.org/?mlat=' + la + '&amp;mlon=' + lo + '#map=15/' + la + '/' + lo +
                '" target="_blank" rel="noopener">' + label + '</a>';
            }).filter(Boolean).join(', ');
            chargeTxt = chargeStopsText(true, c.stops, c.minutes, places);
          } else {
            chargeTxt = chargeStopsText(false, c.stops, c.minutes);
          }
          chargeRow.innerHTML = icon('plug') + '<span><span class="lbl">'+t('charge.label')+'</span>'+chargeTxt+'</span>';
          body.appendChild(chargeRow);
        }
        if(c.noChargerNearArrival){
          var noCharger = document.createElement('div');
          noCharger.className = 'day-row tension-row tension-orange';
          noCharger.innerHTML = icon('warn') + '<span>' + escHtml(noChargerText()) + '</span>';
          body.appendChild(noCharger);
        }
      }
      (firstLeg.restrictions || []).forEach(function(r){
        var rRow = document.createElement('div');
        rRow.className = 'day-row tension-row tension-orange';
        rRow.innerHTML = restrictionRowHtml(r);
        body.appendChild(rRow);
      });
      // Rappel vignette : uniquement la première fois que ce pays apparaît dans l'itinéraire (voir
      // shownVignetteCountries plus haut) — un pays traversé plusieurs jours de suite, ou retraversé
      // plus tard dans le séjour, n'a besoin d'acheter qu'UNE seule vignette pour tout le trajet.
      // 11e audit : le rappel ne concernait que le pays d'ARRIVÉE de l'étape ; le pays de départ (premier jour) et les pays
      // traversés connus (barèmes de péage traversés, et liste de pays traversés si le moteur la fournit) sont désormais
      // couverts, chacun une seule fois et NOMMÉ (plusieurs pays à vignette peuvent se suivre sur un même trajet).
      vignetteCountriesOfGroup(firstLeg, gIdx === 0 ? trip.cityCoord && trip.cityCoord.country : null, trip.transportKey).forEach(function(cc){
        if(shownVignetteCountries[cc]) return;
        shownVignetteCountries[cc] = true;
        var vignetteRow = document.createElement('div');
        vignetteRow.className = 'day-row';
        vignetteRow.innerHTML = icon('toll') + '<span><span class="lbl">'+escHtml(vignetteLabel(cc))+'</span>'+t('vignette.notice')+
          ' <a href="'+safeUrl(COUNTRIES[cc].vignette.url)+'" target="_blank" rel="noopener">'+t('vignette.link')+'</a></span>';
        body.appendChild(vignetteRow);
      });

      // Une section "Activités possibles" PAR JOUR du séjour (pas une seule pour tout le groupe) :
      // chaque jour garde ses propres suggestions, distinctes des autres jours au même endroit
      // (voir realPoiQueueFor/pickHikeForCommune). Le numéro de jour affiché ("Jour 1", "Jour 2"...)
      // est la position DANS ce séjour, pas le numéro global du voyage — inutile de le répéter
      // quand il n'y a qu'un seul jour ("— au choix" comme avant, sans numérotation superflue).
      group.legs.forEach(function(leg, dayIdxInGroup){
        if(!(leg.activities && leg.activities.length)) return;
        var actLabelRow = document.createElement('div');
        actLabelRow.className = 'day-row';
        // Cette commune n'a pas de POI répertorié dans FEATURED (la grande majorité des communes) :
        // une recherche de vraies curiosités locales via OpenStreetMap est en cours en tâche de
        // fond (voir plus bas) — la petite mention rend l'attente légitime plutôt que de laisser
        // les suggestions génériques ci-dessous paraître figées sans explication. Overpass peut
        // prendre plusieurs secondes, en particulier pour une grande ville.
        // POI déjà arrivés pendant le tirage : les vraies activités sont affichées d'emblée, sans passer par les
        // suggestions génériques puis leur remplacement sous les yeux de l'utilisateur.
        if(leg.needsRealPOIs && !leg.__poiUpgradeStarted && leg.lat != null && leg.lon != null){
          var readyShared = realPoiQueueSync(leg.lat, leg.lon);
          if(readyShared){
            leg.__poiUpgradeStarted = true;
            leg.needsRealPOIs = false;
            if(readyShared.hasPois) leg.activities = upgradeActivities(leg, readyShared);
          }
        }
        var loadingNoteHtml = leg.needsRealPOIs
          ? ' <span class="activities-loading-note">'+t('activities.loadingReal')+'</span>'
          : '';
        var actLabelText = isMultiDay ? t('activities.day', {n: formatNum(dayIdxInGroup + 1)}) : t('activities.choice');
        actLabelRow.innerHTML = icon('spark') + '<span class="lbl">'+actLabelText+loadingNoteHtml+'</span>';
        body.appendChild(actLabelRow);

        var actList = document.createElement('div');
        actList.className = 'activity-options';
        renderActivityCards(actList, leg.activities, leg.dept, leg.stop, leg);
        body.appendChild(actList);

        // Si Overpass ne répond rien (indisponible, aucun résultat...), les activités génériques
        // restent affichées telles quelles — aucune erreur visible, juste pas de mise à jour (et la
        // mention de recherche ci-dessus disparaît dans tous les cas, succès ou non). Le drapeau
        // __poiUpgradeStarted (posé une seule fois, jamais retiré) rend renderDays rejouable sans
        // effet de bord : un changement de langue en cours de session peut donc rappeler renderDays
        // sur le même itinéraire (voir écouteur 'i18n:langchange' plus bas) sans redemander Overpass
        // ni reconsommer la file partagée une seconde fois.
        if(leg.needsRealPOIs && !leg.__poiUpgradeStarted && leg.lat != null && leg.lon != null){
          leg.__poiUpgradeStarted = true;
          // realPoiQueueFor (pas fetchRealPOIs directement) : partage une seule file de POI/repli
          // par commune entre tous les jours d'un même séjour, pour ne jamais reproposer le même
          // lieu deux fois (voir sa définition plus haut).
          var poiGen = tripGeneration;
          realPoiQueueFor(leg.lat, leg.lon, leg.stop, leg.dept, leg.country).then(function(actListEl, dept, stopName, labelRow, dayLeg){
            return function(shared){
              if(poiGen !== tripGeneration) return; // voyage remplacé entre-temps
              // Marqué résolu qu'il y ait ou non de vrais POI trouvés : sinon, un ré-rendu ultérieur
              // (changement de langue) réafficherait indéfiniment la mention "recherche en cours"
              // pour un résultat déjà connu (voir loadingNoteHtml plus haut, qui teste ce champ).
              dayLeg.needsRealPOIs = false;
              var note = labelRow.querySelector('.activities-loading-note');
              if(note) note.remove();
              // Liste redessinée entre-temps (changement de langue ou de devise pendant le chargement) : ce
              // callback vise l'ancien DOM. Les données sont mises à jour puis le jour est redessiné à partir d'elles
              // (sans reconsommer la file), ce qui retire aussi la mention « recherche en cours » du nouveau DOM.
              if(!actListEl.isConnected){
                if(shared.hasPois) dayLeg.activities = upgradeActivities(dayLeg, shared);
                scheduleDaysRerender();
                return;
              }
              if(!shared.hasPois) return;
              var freshActivities = upgradeActivities(dayLeg, shared);
              // On remplace aussi leg.activities (pas seulement l'affichage) pour que l'export PDF
              // (voir buildTripExportPayload) reflète les vraies activités trouvées.
              dayLeg.activities = freshActivities;
              renderActivityCards(actListEl, freshActivities, dept, stopName, dayLeg);
            };
          }(actList, leg.dept, leg.stop, actLabelRow, leg));
        }
      });

      {
        // Pas de ligne "Type de logement" séparée : la catégorie choisie (voir lodgingCategoryLabel,
        // toujours disponible côté client à partir de budgetKey/avoidTent si jamais besoin) est déjà
        // reflétée dans les recherches Airbnb/Booking ci-dessous (budget, dates), qui l'affichent en
        // pratique plutôt qu'en théorie — une ligne à part ne faisait que répéter la même information.
        if(firstLeg.lodgingLinks){
          var linksRow = document.createElement('div');
          linksRow.className = 'day-row';
          linksRow.innerHTML = icon('search') +
            '<span><span class="lbl">'+t('lodging.find', {range: formatStayRange(firstLeg.lodgingCheckIn, firstLeg.lodgingCheckOut)})+'</span>'+
            '<span class="lodging-links">'+ lodgingLinksHtml(firstLeg.lodgingLinks, firstLeg.country, trip.budgetKey) + '</span></span>';
          body.appendChild(linksRow);
        }
      }
      if(firstLeg.isReturn){
        var homeRow = document.createElement('div');
        homeRow.className = 'day-row';
        homeRow.innerHTML = icon('clock') + '<span><span class="lbl">'+t('end.label')+'</span>'+t('end.text')+'</span>';
        body.appendChild(homeRow);
      }

      card.appendChild(body);
      els.days.appendChild(card);
    });

    // Nombre de jours DEMANDÉ (un aller-retour d'une journée compte 1 jour, pas ses 2 legs aller + retour) : voir tripStatsParts.
    // Mêmes morceaux que le PDF (tripStatsParts), ici avec la valeur en gras.
    els.timelineStats.innerHTML = tripStatsParts(trip).map(function(p){
      return '<span>' + (p.nounFirst ? escHtml(p.label) + ' <b>' + escHtml(p.value) + '</b>' : '<b>' + escHtml(p.value) + '</b>' + (p.label ? ' ' + escHtml(p.label) : '')) +
        (p.extra ? ' (' + escHtml(p.extra) + ')' : '') + '</span>';
    }).join('');
  }
  // Statistiques du voyage (journal de bord et PDF) : { value, label, nounFirst }. nounFirst : langues où le nom précède
  // le nombre (« siku 3 » en swahili, « iminsi 3 » en kinyarwanda…), repéré sur leur propre formule de durée
  // (form.dates.durationN commence par le nom) — 11e audit : « 3 siku » était affiché.
  function nounFirstLang(){ return !/^\s*\{days\}/.test(t('form.dates.durationN')); }
  // Duel arabe (14e audit du 19/09/2026) : « مدينتان », « ليلتان » disent déjà « deux » — « ٢ مدينتان » répétait le nombre
  // (CLDR écrit « يومان », « ميلان » sans chiffre). Forme exacte de I18N.plural seulement (PLURALS.ar), n = 2.
  function dualWithoutNumber(n){ return VISITOR_LANG === 'ar' && Number(n) === 2; }
  // Pastille « nombre + nom » des statistiques ; duel arabe : le nom seul, en gras à la place du nombre.
  function countPart(n, key, nf){
    var label = statsLabel(n, key);
    if(dualWithoutNumber(n) && window.I18N.plural && window.I18N.plural(key, n)) return { value: label, label: '', nounFirst: false };
    return { value: formatNum(n), label: label, nounFirst: nf };
  }
  function tripStatsParts(trip){
    var legs = trip.legs;
    var nights = legs.filter(function(l){return l.labelKind === 'day';}).length;
    var villes = {};
    legs.forEach(function(l){ if(!l.isReturn) villes[stopKey(l)]=true; });
    var statsDays = trip.days || legs.length, statsCities = Object.keys(villes).length;
    var nf = nounFirstLang();
    var parts = [countPart(statsDays, 'stats.days', nf), countPart(statsCities, 'stats.cities', nf), countPart(nights, 'stats.nights', nf)];
    // Kilométrage : route et traversées confondues, la part en ferry précisée (11e audit : un trajet vers la Corse
    // additionnait sans le dire 200 km de mer aux kilomètres de route).
    var totalKm = tripTotalKm(legs), ferryKm = tripFerryKm(legs);
    // Unité d'affichage (km ou mi, voir formatDistance) ; le paramètre garde son nom historique {km}. Même marque
    // d'approximation que les montants (approxMark : « ≈ » en japonais et en coréen).
    parts.push({ value: approxMark() + formatDistance(totalKm), label: t('stats.totalKm'), nounFirst: false, extra: ferryKm > 0 ? t('stats.ferryKm', { km: formatDistance(ferryKm) }) : null });
    // Péage : somme des bornes basses et hautes de chaque étape (fourchette), même logique que chaque étape (tollRange).
    var tollLegs = legs.filter(function(l){return l.tollInfo;});
    if(tollLegs.length){
      var sumMin = 0, sumMax = 0;
      tollLegs.forEach(function(l){ var r = tollRange(l.tollInfo); sumMin += r.min; sumMax += r.max; });
      var enabled = !!tollLegs[0].tollInfo.enabled, kind = tollRangeKind(sumMin, sumMax);
      if(kind === 'upTo') parts.push({ value: t('stats.upTo', { amount: approxMoney(sumMax, 'EUR') }), label: t(enabled ? 'stats.tollPossible' : 'stats.tollAvoided'), nounFirst: false });
      else parts.push({ value: kind === 'single' ? approxMoney(sumMax, 'EUR') : approxMoneyRange(sumMin, sumMax, 'EUR'), label: t(enabled ? 'stats.tollEstimated' : 'stats.tollAvoided'), nounFirst: false });
    }
    // Ferries (12e audit du 19/09/2026) : le train-auto (Sylt) a sa propre pastille, hors du total « de ferry » et du
    // décompte des traversées à tarif inconnu ; les traversées gratuites (bacs norvégiens…) n'entrent pas dans le total
    // (« ~0 € de ferry » s'affichait quand toutes l'étaient — la gratuité reste dite sur chaque étape) ; tarifs piétons
    // (vélo) : total par personne. Montant non nul : null/undefined = inconnu.
    var hasPrice = function(l){ return l.ferryInfo.amount !== null && l.ferryInfo.amount !== undefined && isFinite(Number(l.ferryInfo.amount)); };
    var paid = function(l){ return hasPrice(l) && Number(l.ferryInfo.amount) > 0; };
    var sumOf = function(arr){ return arr.reduce(function(s, l){ return s + Number(l.ferryInfo.amount); }, 0); };
    var ferryLegs = legs.filter(function(l){ return l.ferryInfo && l.ferryInfo.mode !== 'train'; });
    var paidFerries = ferryLegs.filter(paid);
    if(paidFerries.length){
      parts.push({ value: approxMoney(sumOf(paidFerries), 'EUR'), label: ferryTotalLabel(paidFerries, trip.transportKey), nounFirst: false });
    }
    var unpriced = ferryLegs.filter(function(l){ return !hasPrice(l); }).length;
    if(unpriced){
      parts.push(countPart(unpriced, 'stats.ferryUnpriced', false));
    }
    var paidTrains = legs.filter(function(l){ return l.ferryInfo && l.ferryInfo.mode === 'train' && paid(l); });
    if(paidTrains.length){
      parts.push({ value: approxMoney(sumOf(paidTrains), 'EUR'), label: t('stats.trainTotal'), nounFirst: false });
    }
    return parts;
  }
  // Fourchette de péage d'une étape (11e audit du 19/09/2026) : le moteur renvoie une borne basse « probable » (amountMin)
  // et une borne haute « possible » (amountMax, = amount). Réponse d'un moteur plus ancien, sans borne basse : montant unique.
  function tollRange(ti){
    var max = Number(ti.amountMax != null ? ti.amountMax : ti.amount);
    if(!isFinite(max) || max < 0) max = 0;
    var min = ti.amountMin != null ? Number(ti.amountMin) : max;
    if(!isFinite(min)) min = max;
    return { min: Math.max(0, Math.min(min, max)), max: max };
  }
  // 'upTo' : borne basse nulle (des routes gratuites longent le trajet) ; 'single' : bornes quasi égales (écart < 10 % ou
  // < 0,50 €) ; 'range' sinon. La borne basse nulle passe en premier : un péage seulement possible n'est jamais annoncé
  // comme certain, même minuscule.
  function tollRangeKind(min, max){
    if(!(min > 0)) return 'upTo';
    if(max - min < 0.5 || max - min < 0.1 * max) return 'single';
    return 'range';
  }
  // Phrase de péage d'une étape (écran et PDF). Péage décoché : mêmes trois cas, « sections à péage évitées », jamais une
  // économie certaine quand la borne basse est nulle.
  function tollText(ti){
    var r = tollRange(ti), kind = tollRangeKind(r.min, r.max), on = !!ti.enabled;
    if(kind === 'single') return t(on ? 'toll.estimated' : 'toll.avoided', { amount: approxMoney(r.max, 'EUR') });
    if(kind === 'upTo') return t(on ? 'toll.possibleUpTo' : 'toll.avoidedUpTo', { max: approxMoney(r.max, 'EUR') });
    var dec = rangeDecimals(r.min, r.max);
    return t(on ? 'toll.estimatedRange' : 'toll.avoidedRange', { min: approxMoney(r.min, 'EUR', dec), max: approxMoney(r.max, 'EUR', dec) });
  }
  // Pays à vignette à rappeler sur une case du journal : pays de départ (première case seulement), pays traversés connus
  // (barèmes de péage du trajet ; leg.transitCountries / leg.countriesCrossed si le moteur les fournit), puis pays d'arrivée.
  // Vélo (aucun barème de péage, tollClass null) : jamais sur autoroute, aucune vignette à rappeler (12e audit du
  // 19/09/2026 : le rappel s'affichait à vélo, faute de filtre sur le mode de transport).
  // Mode de transport soumis aux péages et vignettes (classe de péage connue) ; faux pour le vélo. Mode inconnu : vrai
  // (comportement d'avant, jamais un rappel retiré à tort).
  function transportHasToll(transportKey){
    return !(transportKey && TRANSPORT[transportKey] && TRANSPORT[transportKey].tollClass == null);
  }
  function vignetteCountriesOfGroup(leg, departureCountry, transportKey){
    if(!transportHasToll(transportKey)) return [];
    var list = [];
    if(departureCountry) list.push(departureCountry);
    [leg.transitCountries, leg.countriesCrossed, leg.tollInfo && leg.tollInfo.countries].forEach(function(arr){
      if(Array.isArray(arr)) arr.forEach(function(c){ list.push(c); });
    });
    if(leg.country) list.push(leg.country);
    return list.filter(function(cc, i, a){
      return typeof cc === 'string' && a.indexOf(cc) === i && COUNTRIES[cc] && COUNTRIES[cc].vignette && COUNTRIES[cc].vignette.url;
    });
  }
  // « Vignette autoroutière · Suisse » : nom du pays dans la langue d'interface (Intl.DisplayNames), sinon nom des
  // données — voir countryDisplayName.
  function vignetteLabel(cc){
    return t('vignette.label') + ' · ' + countryDisplayName(cc, (COUNTRIES[cc] && COUNTRIES[cc].name) || cc);
  }

  /* ---------- RENDER: MAP ---------- */
  // Carte interactive Leaflet + tuiles OpenStreetMap (voir index.html pour le chargement de la
  // bibliothèque). Remplace l'ancien tracé SVG maison (contours de pays simplifiés à la main,
  // projection équirectangulaire artisanale) : les vraies tuiles OSM couvrent nativement le monde
  // entier, sans jonctions de frontières à recoller ni fichier de contour à maintenir par pays.
  // L'instance de carte est créée une seule fois et réutilisée d'un tirage à l'autre (clearLayers
  // sur le calque de tracé), Leaflet n'acceptant pas d'être réinitialisé sur un conteneur déjà actif.
  var tripMap = null, tripMapLayer = null;
  // Tracés conservés pour leur rendre la couleur du thème courant (voir l'écouteur 'theme:change' plus bas).
  var tripRouteLine = null, tripReturnLine = null;

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Changement de thème (bouton, ou bascule du système en mode automatique) : les couleurs du tracé viennent de
  // variables CSS lues À L'INSTANT DU DESSIN — sans ceci, l'aller restait vert clair sur un fond sombre (7e audit).
  function refreshMapColors(){
    if(tripRouteLine) tripRouteLine.setStyle({ color: cssVar('--accent-3') });
    if(tripReturnLine) tripReturnLine.setStyle({ color: cssVar('--accent') });
  }
  window.addEventListener('theme:change', refreshMapColors);
  if(window.matchMedia){
    var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if(darkQuery.addEventListener) darkQuery.addEventListener('change', refreshMapColors);
  }

  function ensureTripMap(){
    if(tripMap) return tripMap;
    // role="region" : un aria-label sur un simple div sans rôle n'est annoncé par aucun lecteur d'écran (10e audit).
    els.mapWrap.setAttribute('role', 'region');
    els.mapWrap.setAttribute('aria-label', t('map.ariaLabel'));
    tripMap = L.map(els.mapWrap, {
      scrollWheelZoom: false, // la molette scrolle la page tant qu'on n'a pas cliqué sur la carte
      attributionControl: true,
      zoomControl: false // recréé ci-dessous avec des libellés traduits (« Zoom in/out » en anglais sinon)
    });
    tripMap.attributionControl.setPrefix(false); // retire le lien "Leaflet" ajouté par défaut devant le crédit OSM
    // Crédit OSM traduit (« © les contributeurs d'OpenStreetMap ») : ajouté au contrôle d'attribution plutôt qu'à la couche
    // de tuiles, pour pouvoir le remplacer au changement de langue (voir applyMapTexts).
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(tripMap);
    applyMapTexts();
    // Convenience classique Leaflet : la molette ne zoome la carte qu'une fois qu'on a cliqué
    // dedans (sinon on ne peut plus faire défiler la page en passant la souris sur la carte).
    tripMap.on('click', function(){ tripMap.scrollWheelZoom.enable(); });
    els.mapWrap.addEventListener('mouseleave', function(){ tripMap.scrollWheelZoom.disable(); });
    tripMapLayer = L.layerGroup().addTo(tripMap);
    return tripMap;
  }

  // Textes de la carte dans la langue courante : boutons de zoom (titre et nom accessible) et crédit OpenStreetMap.
  var mapZoomControl = null, mapAttributionHtml = null;
  function applyMapTexts(){
    if(!tripMap) return;
    els.mapWrap.setAttribute('aria-label', t('map.ariaLabel'));
    if(mapZoomControl) tripMap.removeControl(mapZoomControl);
    mapZoomControl = L.control.zoom({ zoomInTitle: t('map.zoomIn'), zoomOutTitle: t('map.zoomOut') }).addTo(tripMap);
    if(mapAttributionHtml) tripMap.attributionControl.removeAttribution(mapAttributionHtml);
    mapAttributionHtml = escHtml(t('map.attribution', { osm: ' ' })).replace(' ',
      '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>');
    tripMap.attributionControl.addAttribution(mapAttributionHtml);
  }
  function tripDivIcon(className, html, size, anchor){
    return L.divIcon({ className: 'trip-pin-wrap', html: '<div class="'+className+'">'+html+'</div>', iconSize: size, iconAnchor: anchor });
  }

  function renderMap(legs, city, cityCoord){
    var map = ensureTripMap();
    tripMapLayer.clearLayers();

    var startLL = (cityCoord && cityCoord.lat!=null && cityCoord.lon!=null) ? L.latLng(cityCoord.lat, cityCoord.lon) : null;
    var legLLs = legs.map(function(leg){
      return (leg.lat!=null && leg.lon!=null) ? L.latLng(leg.lat, leg.lon) : null;
    });

    var routeLatLngs = startLL ? [startLL] : [];
    legs.forEach(function(leg, idx){ if(!leg.isReturn && legLLs[idx]) routeLatLngs.push(legLLs[idx]); });
    if(routeLatLngs.length > 1){
      tripRouteLine = L.polyline(routeLatLngs, {
        color: cssVar('--accent-3'), weight: 3, opacity: 0.9, dashArray: '1 8', lineCap: 'round'
      }).addTo(tripMapLayer);
    }

    var lastStopLL = null;
    for(var i=legs.length-1;i>=0;i--){ if(!legs[i].isReturn && legLLs[i]){ lastStopLL = legLLs[i]; break; } }
    if(lastStopLL && startLL){
      tripReturnLine = L.polyline([lastStopLL, startLL], {
        color: cssVar('--accent'), weight: 2.2, opacity: 0.9, dashArray: '6 6', lineCap: 'round'
      }).addTo(tripMapLayer);
      var midLL = L.latLng((lastStopLL.lat+startLL.lat)/2, (lastStopLL.lng+startLL.lng)/2);
      L.marker(midLL, {
        icon: tripDivIcon('trip-return-label', t('map.returnLabel'), [50, 16], [25, 8]),
        interactive: false, keyboard: false
      }).addTo(tripMapLayer);
    }

    var allPts = startLL ? [startLL] : [];
    if(startLL){
      L.marker(startLL, {
        icon: tripDivIcon('trip-pin trip-pin-start',
          '<div class="trip-pin-badge">'+escHtml(t('map.departShort'))+'</div><div class="trip-pin-label">'+escHtml(city||t('map.departFallback'))+'</div>',
          [110, 50], [55, 13]),
        keyboard: false
      }).addTo(tripMapLayer);
    }

    // Une seule épingle par ville distincte : les nuits successives au même endroit partagent
    // les mêmes coordonnées et ne doivent pas empiler plusieurs points identiques.
    var stopNum = 0;
    var lastStopName = null;
    legs.forEach(function(leg, idx){
      if(leg.isReturn) return; // le retour rejoint le point de départ, déjà marqué
      if(stopKey(leg) === lastStopName) return; // nom + coordonnées : deux homonymes consécutifs gardent chacun leur épingle
      lastStopName = stopKey(leg);
      var ll = legLLs[idx];
      if(!ll) return;
      stopNum++;
      allPts.push(ll);
      L.marker(ll, {
        icon: tripDivIcon('trip-pin trip-pin-stop',
          '<div class="trip-pin-badge">'+escHtml(formatNum(stopNum))+'</div><div class="trip-pin-label">'+escHtml(leg.stop.split(' ').slice(0,2).join(' '))+'</div>',
          [110, 50], [55, 13]),
        keyboard: false
      }).addTo(tripMapLayer);
    });

    if(allPts.length){
      // requestAnimationFrame : le conteneur peut encore être caché (display:none, voir
      // map-card.show ajouté juste après cet appel) au moment précis de ce calcul — Leaflet a
      // besoin d'une taille non nulle pour mesurer correctement les limites de la carte.
      requestAnimationFrame(function(){
        map.invalidateSize();
        if(allPts.length === 1) map.setView(allPts[0], 12);
        else map.fitBounds(L.latLngBounds(allPts), { padding: [36, 36], maxZoom: 12 });
      });
    }
  }

  /* ---------- RENDER: PACKING LIST ---------- */
  function renderPacking(budgetKey, transportKey){
    var items = [];
    items = items.concat(tl('pack.base'));
    items = items.concat(transportPackExtra(transportKey));
    items = items.concat(tl('pack.' + budgetKey));
    // dedupe
    var seen = {};
    items = items.filter(function(it){ if(seen[it]) return false; seen[it]=true; return true; });

    els.packSub.textContent = t('pack.sub', {transport: transportLabel(transportKey), budget: budgetLabel(budgetKey)});
    els.packGrid.innerHTML = '';
    items.forEach(function(it, idx){
      var wrap = document.createElement('div');
      wrap.className = 'pack-item';
      var id = 'pack-'+idx;
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      var label = document.createElement('label');
      label.setAttribute('for', id);
      label.innerHTML = '<span class="check-box">'+icon('check')+'</span><span class="check-text"></span>';
      label.querySelector('.check-text').textContent = it;
      wrap.appendChild(input);
      wrap.appendChild(label);
      input.addEventListener('change', updatePackProgress);
      els.packGrid.appendChild(wrap);
    });
    updatePackProgress();
  }

  function updatePackProgress(){
    var boxes = els.packGrid.querySelectorAll('input[type="checkbox"]');
    var allChecked = boxes.length > 0 && Array.prototype.every.call(boxes, function(b){ return b.checked; });
    els.packProgress.classList.toggle('complete', allChecked);
  }

  // Construit les données envoyées à /api/export-pdf, à partir de l'état ACTUEL du voyage — pas
  // une simple relecture de legs tel que buildItinerary l'a produit initialement, mais tel qu'il
  // est maintenant (vrais POI Overpass et vraie randonnée Visorando une fois résolus, voir les
  // écritures dans leg.activities plus haut) : exactement ce que l'utilisateur voit à l'écran au
  // moment du clic. Le PDF lui-même est mis en page côté serveur (voir server.js) ; ici on ne fait
  // que rassembler des données déjà calculées, sans dupliquer la logique de calcul elle-même — les
  // libellés déjà formatés (codes postaux, dates, listes) sont réutilisés tels quels quand ils
  // existent (formatCpBadge, formatFrDate), ou relus directement depuis le DOM déjà rendu pour le
  // sac à préparer (renderPacking dédoublonne déjà la liste, pas la peine de recalculer).
  // Tension envoyée au PDF : niveau rouge/orange et source http(s) uniquement, sinon rien.
  function exportTension(tension){
    if(!tension || (tension.level !== 'red' && tension.level !== 'orange')) return null;
    return { level: tension.level, source: /^https?:\/\//i.test(String(tension.source || '')) ? String(tension.source) : null };
  }
  // Liens d'hébergement du PDF avec la même devise qu'à l'écran (voir lodgingUrlWithCurrency).
  function exportLodgingLinks(links, country, budgetKey){
    if(!links) return null;
    var out = {};
    Object.keys(links).forEach(function(k){ out[k] = links[k]; });
    if(links.airbnb) out.airbnb = lodgingUrlWithCurrency(links.airbnb, country, budgetKey);
    if(links.booking) out.booking = lodgingUrlWithCurrency(links.booking, country, budgetKey);
    return out;
  }
  // Lignes d'une étape pour le PDF, dans la langue d'interface : mêmes clés et mêmes valeurs que le journal de bord
  // (renderDays), en texte brut (noms de lieux non échappés, pas de liens : le serveur pose lui-même les liens autorisés).
  // Traduction, ou null si la clé n'existe pas encore (t() renverrait le nom de la clé, imprimé tel quel dans le PDF).
  function tIfDefined(key, vars){
    if(typeof key !== 'string') return null;
    var s;
    try { s = t(key, vars); } catch(e){ return null; }
    return (typeof s !== 'string' || s === key) ? null : s;
  }
  // Libellé d'une statistique du journal de bord, au singulier quand le compte vaut 1 (« 1 jour », « 1 ville »,
  // « 0 nuitée ») : le pluriel systématique donnait « 1 jours · 1 villes · 0 nuitées », y compris dans le PDF.
  // Intl.PluralRules décide de la forme selon la langue : le français dit « 0 nuitée » et « 1 jour » (catégorie « one »),
  // l'anglais « 0 nights » et « 1 day », le russe reprend le singulier pour 21, 31… Clé au singulier absente : pluriel.
  // Langues à plusieurs formes plurielles (duel arabe…) : forme exacte fournie par I18N.plural quand elle existe.
  function statsLabel(n, key){
    var exact = window.I18N.plural ? window.I18N.plural(key, n) : null;
    if(exact) return exact;
    var one = false;
    try { one = new Intl.PluralRules(localeTag()).select(n) === 'one'; } catch(e){ one = Math.abs(n) === 1; }
    return (one && tIfDefined(key + '1')) || t(key);
  }
  // Phrase à compteur dont la forme dépend du nombre (12e audit du 19/09/2026) : modèle exact de I18N.plural (russe,
  // polonais, arabe… : « 2 остановки », « 5 остановок », « 21 остановка »), {paramètres} remplacés ici ; null sinon.
  function pluralPhrase(key, n, vars){
    var tpl = window.I18N.plural ? window.I18N.plural(key, n) : null;
    if(!tpl) return null;
    return tpl.replace(/\{(\w+)\}/g, function(m, k){ return (vars && vars[k] != null) ? String(vars[k]) : m; });
  }
  // Pauses recharge (écran et PDF) : phrase au singulier pour une pause, sinon forme plurielle exacte quand la langue en
  // a plusieurs, sinon la phrase au pluriel traduite. places : lieux des bornes réelles (HTML déjà échappé à l'écran).
  function chargeStopsText(real, stops, minutes, places){
    var vars = {n: formatNum(stops), min: formatNum(minutes), places: places};
    if(real){
      if(stops <= 1) return t('charge.real1', vars);
      return pluralPhrase('charge.realN', stops, vars) || t('charge.realN', vars);
    }
    if(stops <= 1) return t('charge.text1', vars);
    return pluralPhrase('charge.textN', stops, vars) || t('charge.textN', vars);
  }
  function overMaxLegText(o){
    return t('leg.overMaxLeg', {max: formatDistance(Number(o.max) || 0), min: formatDistance(Number(o.min) || 0)});
  }
  // Aucune borne publique près de l'arrivée : rayon de recherche du moteur (CHARGER_NEAR_STOP_KM de lib/trip-engine.js,
  // 20 km), dit dans l'unité d'affichage (13e audit du 19/09/2026 : « 20 km » écrit en dur dans chaque traduction).
  var CHARGER_NEAR_STOP_KM = 20;
  function noChargerText(){ return t('charge.noChargerNearArrival', { dist: formatDistance(CHARGER_NEAR_STOP_KM) }); }
  // « ~ 2 h 46 de route · 213 km » (+ la traversée pour un ferry), chiffres dans la langue d'interface. Chaîne vide pour une
  // journée sans trajet (journées sur place : distanceKm/travelTime null depuis la modification du moteur du 18/09/2026) —
  // ni « undefined » ni « NaN » à l'écran ou dans le PDF.
  function legRouteText(leg){
    if(!leg || leg.distanceKm == null || !isFinite(Number(leg.distanceKm)) || (leg.travelMin == null && !leg.travelTime)) return '';
    // {dist} : distance déjà mise en forme dans l'unité d'affichage (13e audit du 19/09/2026 : « {km} km » en dur).
    return (leg.ferryInfo && leg.roadKm ? t('day.routeTime', {time: legDuration(leg.roadMin, leg.roadTime), dist: formatDistance(leg.roadKm)}) + ' + ' : '') +
      t(leg.ferryInfo ? 'day.crossingTime' : 'day.routeTime', {time: legDuration(leg.travelMin, leg.travelTime), dist: formatDistance(leg.distanceKm)});
  }
  function pdfLegTexts(leg){
    var out = {};
    if(leg.overMaxLeg) out.overMaxLeg = overMaxLegText(leg.overMaxLeg);
    var route = legRouteText(leg);
    if(route) out.route = route;
    out.stop = t(leg.isReturn ? 'day.returnTo' : 'day.stepMystery', {stop: leg.stop + (leg.cp ? ' (' + formatCpBadge(leg) + ')' : '')});
    if(leg.tension && !leg.isReturn) out.tension = t('tension.label') + ' — ' + t(leg.tension.level === 'red' ? 'tension.red' : 'tension.orange');
    if(leg.tollInfo){
      var ti = leg.tollInfo;
      var tollSources = (Array.isArray(ti.countries) ? ti.countries : [leg.country])
        .map(tollSourceLabel).filter(function(x, i, a){ return x && a.indexOf(x) === i; });
      out.toll = t('toll.label', {source: tollSources.join(' + ') || '—'}) + ' — ' + tollText(ti) + ' ' + t('toll.estimateNote');
    }
    if(leg.chargeInfo){
      var c = leg.chargeInfo;
      if(c.stops > 0){
        out.charge = t('charge.label') + ' — ' + (c.real && c.stations
          ? chargeStopsText(true, c.stops, c.minutes, c.stations.map(function(s){
              var la = Number(s.lat), lo = Number(s.lon);
              return s.near ? String(s.near) : (isFinite(la) && isFinite(lo) ? la.toFixed(3) + ', ' + lo.toFixed(3) : '');
            }).filter(Boolean).join(', '))
          : chargeStopsText(false, c.stops, c.minutes));
      }
      if(c.noChargerNearArrival) out.noCharger = noChargerText();
    }
    if(leg.restrictions && leg.restrictions.length){
      out.restrictions = leg.restrictions.map(function(r){
        var name = r.name || '';
        // Même nom qu'à l'écran (voir restrictionRowHtml et countryDisplayName).
        if(r.type === 'noMotorway' || r.type === 'noMotorwayCc' || r.type === 'partial') name = countryDisplayName(r.country, name);
        var cc = isFinite(Number(r.minCc)) && r.minCc !== '' && r.minCc != null ? formatNum(r.minCc) : '';
        return tIfDefined(String(r.kind) + '.' + String(r.type), { name: name, cc: cc }) || '';
      });
    }
    if(leg.ferryInfo){
      var fi = leg.ferryInfo;
      out.ferry = ferryLabel(fi) + ' — ' + ferryText(fi, tIfDefined(fi.routeKey) || '', false, currentTripData && currentTripData.transportKey) +
        (fi.amount === null ? ' ' + t(fi.priceStatus === 'variable' ? 'ferry.price.variable' : 'ferry.price.unknown') : '') +
        (ferryNoVehicles(fi, currentTripData && currentTripData.transportKey) ? ' ' + t('ferry.noVehicles') : '');
    }
    if(leg.lodgingCheckIn) out.lodging = t('lodging.find', {range: formatStayRange(leg.lodgingCheckIn, leg.lodgingCheckOut)});
    return out;
  }
  // Corps de l'export allégé (17e audit du 20/09/2026) : tous les champs FACULTATIFS étaient sérialisés même vides
  // (« "roadKm":null,"roadTime":null,"tollInfo":null,"chargeInfo":null,"restrictions":null,"overMaxLeg":null,
  // "tension":null,"ferryInfo":null,"checkInLabel":null,"cpBadge":null… » sur chaque étape, plus cinq nuls dans chaque
  // ferryInfo et deux dans chaque activité). Le serveur ne compare jamais à null : il teste la présence
  // (truthiness, `typeof x === 'string'`, `typeof x === 'number'`, `Array.isArray`, `!= null`) — une clé ABSENTE s'y lit
  // exactement comme une clé à null, le contrat de /api/export-pdf est donc inchangé et aucune information affichée
  // dans le PDF n'est retirée. Sur un long voyage, cela retire plusieurs kilo-octets d'un corps qui bute déjà sur la
  // limite de taille de /api/export-pdf (réponse 413, voir export.tooLarge).
  // `keep` : clés gardées même à null, quand le null lui-même fait partie du contrat lisible (ferryInfo.amount = null
  // signifie « traversée réelle dont le tarif n'est pas publié », voir server.js et le texte de secours du PDF).
  function compact(o, keep){
    var out = {};
    Object.keys(o).forEach(function(k){
      if(o[k] !== undefined && (o[k] !== null || (keep && keep.indexOf(k) >= 0))) out[k] = o[k];
    });
    return out;
  }
  function buildTripExportPayload(){
    if(!currentTripData) return null;
    var legs = currentTripData.legs, city = currentTripData.city;
    var budgetKey = currentTripData.budgetKey, transportKey = currentTripData.transportKey;
    var totalKm = tripTotalKm(legs);
    var nights = legs.filter(function(l){ return l.labelKind === 'day'; }).length;
    var villes = {};
    legs.forEach(function(l){ if(!l.isReturn) villes[stopKey(l)] = true; });
    var tollLegs = legs.filter(function(l){ return l.tollInfo; });
    // Péage : fourchette (somme des bornes basses et hautes), amount = borne haute pour les serveurs qui ne lisent qu'elle.
    var tollSummary = null;
    if(tollLegs.length){
      var tMin = 0, tMax = 0;
      tollLegs.forEach(function(l){ var r = tollRange(l.tollInfo); tMin += r.min; tMax += r.max; });
      tollSummary = { enabled: tollLegs[0].tollInfo.enabled, amount: Math.round(tMax * 10) / 10,
        amountMin: Math.round(tMin * 10) / 10, amountMax: Math.round(tMax * 10) / 10 };
    }
    // Textes du PDF dans la langue d'interface, composés avec les mêmes clés que la page (le serveur n'a pas les
    // traductions ; il garde le français en repli et contrôle lui-même les liens et les montants). Mêmes morceaux que le
    // journal de bord (tripStatsParts) ; la part en ferry du kilométrage devient une pastille à part (le serveur coupe
    // chaque pastille à 140 caractères, 12e audit).
    var statsTexts = [];
    tripStatsParts(currentTripData).forEach(function(p){
      statsTexts.push(p.nounFirst ? p.label + ' ' + p.value : (p.value + ' ' + p.label).trim());
      if(p.extra) statsTexts.push(p.extra);
    });
    var noticeTexts = {};
    (currentTripData.notices || []).forEach(function(key){ var txt = tIfDefined(key); if(txt) noticeTexts[key] = txt; });
    var depTension = currentTripData.departureTension;
    var generatedDate = '';
    try { generatedDate = localeDateText(new Date(), { day: 'numeric', month: 'long', year: 'numeric' }); } catch(e){}
    var texts = {
      subtitle: tIfDefined('pdf.subtitle', { city: city }),
      stats: statsTexts,
      notices: noticeTexts,
      departureTension: depTension ? t('tension.label') + ' — ' + t('tension.departure') + ' ' + t(depTension.level === 'red' ? 'tension.red' : 'tension.orange') : null,
      lodgingNone: t('lodging.noPlatform'),
      endMission: t('end.label') + ' — ' + t('end.text'),
      packTitle: t('pack.title'),
      packSub: t('pack.sub', { transport: transportLabel(transportKey), budget: budgetLabel(budgetKey) }),
      generated: tIfDefined('pdf.generated'),
      truncated: tIfDefined('pdf.truncated'), // mise en page arrêtée faute de temps côté serveur (voir PDF_BUILD_BUDGET_MS)
      generatedDate: generatedDate,
      // Devise choisie non proposée par Airbnb/Booking pour certaines étapes (voir tripCurrencyNoRateText) ; null sinon.
      currencyNote: tripCurrencyNoRateText(currentTripData) || null
    };
    // Vignette autoroutière (13e audit du 19/09/2026) : le texte générique n'est plus envoyé pour un mode sans classe de
    // péage (vélo) — le serveur rappelait alors une vignette à un cycliste, interdit d'autoroute (vignetteCountriesOfGroup
    // renvoie déjà une liste vide dans ce cas, le rappel par étape n'apparaissait donc pas).
    if(transportHasToll(transportKey)) texts.vignette = t('vignette.label') + ' — ' + t('vignette.notice');
    texts = compact(texts); // clés facultatives vides (departureTension, currencyNote, truncated…) : voir compact
    // Rappels de vignette NOMMÉS, une fois par pays, sur la même étape qu'à l'écran (pays de départ sur la première, pays
    // traversés connus, pays d'arrivée) : texts.vignette par étape, en plus du texte générique ci-dessus.
    var legBadges = pdfLegBadges(legs);
    var pdfVignetteShown = {};
    var legVignettes = legs.map(function(leg, idx){
      return vignetteCountriesOfGroup(leg, idx === 0 ? currentTripData.cityCoord && currentTripData.cityCoord.country : null, transportKey)
        .filter(function(cc){ if(pdfVignetteShown[cc]) return false; pdfVignetteShown[cc] = true; return true; })
        .map(function(cc){ return { country: cc, text: vignetteLabel(cc) + ' — ' + t('vignette.notice'), url: COUNTRIES[cc].vignette.url }; });
    });
    return compact({
      lang: VISITOR_LANG,
      texts: texts,
      // 13e audit du 19/09/2026 (contrat avec server.js) : mode de transport (le serveur ne rappelle plus de vignette à
      // vélo) et unité des distances affichées ('km' ou 'mi' : textes de secours du serveur dans la même unité). Les
      // champs numériques (stats.totalKm, legs[i].distanceKm…) restent en kilomètres.
      transportKey: transportKey,
      distanceUnit: distanceUnit(),
      city: city,
      tripLabel: tripLabelText(currentTripData) || currentTripLabel,
      budgetLabel: budgetLabel(budgetKey),
      transportLabel: transportLabel(transportKey),
      stats: compact({ days: currentTripData.days || legs.length, cities: Object.keys(villes).length, nights: nights, totalKm: totalKm, ferryKm: tripFerryKm(legs), toll: tollSummary }),
      notices: currentTripData.notices || [],
      // Zone déconseillée au point de départ (même forme que tension sur chaque étape).
      departureTension: exportTension(currentTripData.departureTension),
      legs: legs.map(function(leg, idx){
        var legTexts = pdfLegTexts(leg);
        if(legVignettes[idx].length) legTexts.vignettes = legVignettes[idx];
        // Séjour : le serveur n'affiche les liens d'hébergement QUE s'il a aussi la plage de dates
        // (`if(leg.lodgingLinks && leg.checkInLabel)`). Sans plage, les liens (2 à 4 URL complètes par étape) ne
        // servaient à rien et pesaient le plus lourd du corps — ils ne sont plus envoyés dans ce cas (17e audit).
        var checkInLabel = leg.lodgingCheckIn ? formatStayRange(leg.lodgingCheckIn, leg.lodgingCheckOut) : null;
        return compact({
          texts: legTexts,
          badge: legBadges[idx] || null,
          label: singleLegLabel(leg),
          stop: leg.stop,
          cpBadge: leg.cp ? formatCpBadge(leg) : null,
          isReturn: leg.isReturn ? true : null, // false = valeur par défaut du serveur : inutile de l'écrire
          distanceKm: leg.distanceKm,
          travelTime: leg.travelTime,
          roadKm: leg.roadKm || null,
          roadTime: leg.roadTime || null,
          country: leg.country || null,
          tollInfo: leg.tollInfo || null,
          chargeInfo: leg.chargeInfo || null,
          restrictions: leg.restrictions || null,
          overMaxLeg: leg.overMaxLeg ? { max: leg.overMaxLeg.max, min: leg.overMaxLeg.min } : null,
          // Avertissement de zone déconseillée, comme à l'écran (jamais sur le retour, qui rejoint le départ).
          tension: leg.isReturn ? null : exportTension(leg.tension),
          ferryInfo: leg.ferryInfo ? compact({ route: tIfDefined(leg.ferryInfo.routeKey) || '', amount: leg.ferryInfo.amount, priceStatus: leg.ferryInfo.priceStatus || null,
            priceCovers: leg.ferryInfo.priceCovers === undefined ? null : leg.ferryInfo.priceCovers, footAmount: leg.ferryInfo.footAmount != null ? leg.ferryInfo.footAmount : null,
            durationEstimated: leg.ferryInfo.durationEstimated ? true : null, mode: leg.ferryInfo.mode || null,
            passengerOnly: leg.ferryInfo.passengerOnly ? true : null,
            durationH: typeof leg.ferryInfo.durationH === 'number' ? leg.ferryInfo.durationH : null }, ['amount']) : null, // texte de secours du PDF (12e audit)
          checkInLabel: checkInLabel,
          lodgingLinks: checkInLabel ? exportLodgingLinks(leg.lodgingLinks, leg.country, budgetKey) : null,
          activities: (leg.activities || []).map(function(opt){
            return opt.hikeUrl ? {
              label: opt.hikeName,
              typeLabel: [hikeDistanceText(opt.hikeDistance), hikeDurationText(opt.hikeDuration), hikeDifficultyText(opt.hikeDifficulty)].filter(Boolean).join(' · ') || t('hike.defaultType'),
              source: opt.hikeSource || 'Visorando', hikeUrl: opt.hikeUrl,
              sourceLabel: t('hike.sourceLabel', { source: opt.hikeSource || 'Visorando' }).replace(/\s*↗\s*$/, '')
            } : { label: optionLabel(opt), typeLabel: optionTypeLabel(opt) };
          })
        });
      }),
      packing: Array.prototype.map.call(els.packGrid.querySelectorAll('.check-text'), function(el){ return el.textContent; })
    });
  }

  /* ---------- MAIN FLOW ---------- */
  async function generate(){
    clearFormError();
    var typed = els.city.value.trim();
    if(!typed){
      showCityError(msg('form.city.error.required'));
      return;
    }
    if(!selectedCity){
      showCityError(msg('form.city.error.selectFromList'));
      return;
    }
    var city = selectedCity.name;
    clearCityError();
    // Dates : message exact (arrivée ou retour manquant, arrivée passée, retour avant l'arrivée) — voir checkDates.
    var dateProblem = checkDates();
    if(dateProblem){ showDatesError(dateProblem.message, dateProblem.input); return; }
    var days = getTripDays();
    if(!days){ showDatesError(msg('form.dates.error'), els.dateEnd); return; }
    clearDatesError();
    // Bornes des champs numériques (novalidate : plus de bulle native du navigateur).
    clearRadiusError(); clearMinDistanceError(); clearLegDistanceError(); clearDaysPerCityError();
    var rangeProblem = checkNumberRange(els.radius, false);
    if(rangeProblem){ showFieldError(els.radiusField, els.radiusError, rangeProblem.message, [els.radius]); return; }
    rangeProblem = checkNumberRange(els.minDistance, true) || checkNumberRange(els.maxDistance, true);
    if(rangeProblem){ showMinDistanceError(rangeProblem.message, rangeProblem.input); return; }
    rangeProblem = checkNumberRange(els.legDistance, true);
    if(rangeProblem){ showFieldError(els.legDistanceField, els.legDistanceError, rangeProblem.message, [els.legDistance]); return; }
    rangeProblem = checkNumberRange(els.minDaysPerCity, true) || checkNumberRange(els.maxDaysPerCity, true);
    if(rangeProblem){ showDaysPerCityError(rangeProblem.message, rangeProblem.input); return; }
    var tripStart = parseIsoDate(els.dateStart.value);
    var budgetKey = els.budget.value;
    var transportKey = els.transport.value;
    var tollEnabled = els.tollToggle.checked;
    var ferryEnabled = els.ferryToggle.checked;
    var avoidTent = els.tentToggle.checked;
    var speed = TRANSPORT[transportKey].speed;
    var maxRadiusKm = Math.max(20, effectiveRadiusKm(speed));
    var cityCoord = { lat: selectedCity.lat, lon: selectedCity.lon, dept: selectedCity.dept, cp: selectedCity.cp, allCps: selectedCity.allCps, country: selectedCity.country };

    // Toujours en kilomètres vers le serveur, quelle que soit l'unité de saisie (13e audit du 19/09/2026 : 100 mi saisis ->
    // 160,9 km envoyés). Messages : distances dans l'unité d'affichage, au dixième près (valeur saisie).
    var minDistanceKm = distanceFieldKm(els.minDistance) || 0;
    var maxDistanceKm = distanceFieldKm(els.maxDistance) || 0;
    var totalNights = Math.max(0, days - 1);
    if(minDistanceKm > 0 && maxDistanceKm > 0 && minDistanceKm > maxDistanceKm){
      showMinDistanceError(msg('error.minMaxDistance', function(){ return {min: formatDistance(minDistanceKm, 1), max: formatDistance(maxDistanceKm, 1)}; }));
      return;
    }
    // Rayon cité au dixième, comme la distance minimale (15e audit du 19/09/2026 : « 12 mi » pour un rayon de 12.4 mi,
    // à côté d'une distance minimale de « 12.5 mi »). Idem pour la limite de retour renvoyée par le serveur, plus bas.
    if(minDistanceKm > 0 && minDistanceKm > maxRadiusKm && totalNights <= 1){
      var contextKey = totalNights === 0 ? 'error.minDistanceContextDay' : 'error.minDistanceContextNight';
      showMinDistanceError(msg('error.minDistanceTooFar', function(){ return {context: t(contextKey), min: formatDistance(minDistanceKm, 1), radius: formatDistance(maxRadiusKm, 1)}; }));
      return;
    }

    // Distance max entre étapes : le premier trajet peut la dépasser quand une distance d'éloignement est renseignée
    // (voir legAllowed côté serveur).
    var maxLegKm = distanceFieldKm(els.legDistance) || defaultLegKm();

    var minDaysPerCity = parseInt(els.minDaysPerCity.value, 10) || 1;
    var maxDaysPerCity = parseInt(els.maxDaysPerCity.value, 10) || 3;
    if(minDaysPerCity > maxDaysPerCity){
      showDaysPerCityError(msg('error.minMaxDaysPerCity', function(){ return {min: formatNum(minDaysPerCity), max: formatNum(maxDaysPerCity)}; }));
      return;
    }

    // Le tirage lui-même se fait désormais côté serveur (voir README, "Recherche et tirage
    // aléatoire côté serveur", et lib/trip-engine.js) — le client n'a plus jamais besoin de
    // télécharger la base de communes complète pour ça. `lastNorm` (évite de retomber sur la même
    // première étape deux fois de suite) est un simple identifiant opaque déjà renvoyé par le
    // serveur sur chaque leg (voir plus bas) : jamais recalculé côté client.
    var legs, data;
    // Dates lues au lancement (elles peuvent changer pendant la requête).
    var tripStartIso = els.dateStart.value, tripEndIso = els.dateEnd.value;
    // Séjour plafonné à MAX_TRIP_DAYS jours : la date de fin retenue (nom et en-tête du PDF) est celle du voyage tiré,
    // pas la date saisie (du 1er au 30 : 21 jours, fin le 21).
    var tripStartDate = parseIsoDate(tripStartIso);
    if(tripStartDate && days >= 1) tripEndIso = isoDate(addDays(tripStartDate, days - 1));
    // Numéro de tirage attribué AVANT la requête : une réponse arrivée alors qu'un tirage plus récent a été lancé est
    // ignorée (voir les contrôles drawId === currentDrawId ci-dessous et dans showDrawnTrip).
    var drawId = ++currentDrawId;
    // Les deux boutons de tirage sont désactivés pendant la requête ET la roulette qui suit (plus de double tirage par
    // « Retirer une autre destination ») : réactivés en cas d'erreur, ou une fois le voyage affiché (showDrawnTrip).
    // Avant (2e audit du 17/09/2026), ils l'étaient dès la réponse : un nouveau tirage lancé pendant la roulette arrêtait
    // celle-ci, et s'il échouait (429, 503…), l'écran restait bloqué sur « Tirage en cours » sans aucun voyage affiché.
    // Boutons désactivés, tirage marqué en cours et annonce de l'ANCIEN voyage retirée (voir beginDraw).
    beginDraw();
    // Délai maximal côté navigateur : sans réponse au bout de DRAW_TIMEOUT_MS, la requête est abandonnée.
    var abortCtrl = typeof AbortController === 'function' ? new AbortController() : null;
    var abortTimer = abortCtrl ? setTimeout(function(){ abortCtrl.abort(); }, DRAW_TIMEOUT_MS) : null;
    try {
      var resp = await fetch('/api/generate-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl ? abortCtrl.signal : undefined,
        body: JSON.stringify({
          departureCity: { name: selectedCity.name, cp: selectedCity.cp, allCps: selectedCity.allCps, lat: selectedCity.lat, lon: selectedCity.lon, dept: selectedCity.dept, country: selectedCity.country },
          days: days, budgetKey: budgetKey, transportKey: transportKey,
          tollEnabled: tollEnabled, ferryEnabled: ferryEnabled, avoidTent: avoidTent,
          avoidTension: els.tensionToggle.checked,
          tripStart: tripStartIso, maxRadiusKm: maxRadiusKm, avoidNorm: lastNorm,
          minDistanceKm: minDistanceKm, maxDistanceKm: maxDistanceKm, maxLegKm: maxLegKm,
          minDaysPerCity: minDaysPerCity, maxDaysPerCity: maxDaysPerCity,
          preferredCurrency: getPreferredCurrency()
        })
      });
      data = await resp.json().catch(function(){ return {}; });
      if(drawId !== currentDrawId) return; // un tirage plus récent a pris le relais
      if(resp.status === 429){ showFormError(msg('error.tooManyRequests')); return; }
      if(resp.status === 503){ showFormError(msg('error.serverBusy')); return; }
      // Moteur arrêté faute de temps (réponse timedOut) : message dédié plutôt qu'« itinéraire impossible ».
      if(data && data.timedOut){ showFormError(msg('error.drawTimeout')); return; }
      if(!resp.ok){
        showFormError(msg('error.routeImpossible'));
        return;
      }
      legs = data.legs || [];
      // Distance d'éloignement impossible à concilier avec le retour (pas assez de nuits pour revenir par étapes).
      if(legs.length === 0 && data.minDistanceUnreachable){
        var returnCapKm = data.returnCapKm;
        // Quand le plafond a été calculé SANS le filtre des zones à tension (le serveur le signale par tensionBlocked
        // sur cette même réponse, 19e audit du 21/09/2026), la distance annoncée ne suffit pas : à cette distance
        // exactement, c'est le filtre qui bloque. Les deux phrases déjà traduites sont composées, plutôt que d'en
        // inventer une troisième dans 161 langues.
        var messageDistance = msg('error.minDistanceTooFar', function(){ return {
          context: durationLabel(days, totalNights),
          min: formatDistance(minDistanceKm, 1), radius: formatDistance(returnCapKm, 1) }; });
        // Composé DANS la fonction, pas autour : showMinDistanceError garde un rappel pour retraduire le message
        // quand le visiteur change de langue (16e audit du 20/09/2026).
        showMinDistanceError(data.tensionBlocked
          ? function(){ return messageDistance() + ' ' + t('error.tensionBlocked'); }
          : messageDistance);
        return;
      }
      // Aucune étape assez éloignée ne respecte les autres réglages : le serveur ne propose plus d'itinéraire de secours
      // plus proche qui ignorerait la distance minimale.
      if(legs.length === 0 && data.minDistanceNotFound){
        showMinDistanceError(msg('error.minDistanceNotFound', function(){ return { min: formatDistance(minDistanceKm, 1) }; }));
        return;
      }
      if(legs.length === 0 && data.tensionBlocked){
        showFormError(msg('error.tensionBlocked'));
        return;
      }
    } catch(err){
      if(drawId !== currentDrawId) return;
      // Délai dépassé côté navigateur (AbortController) : même message que le délai dépassé côté serveur.
      // 16e audit du 20/09/2026 : tout AUTRE échec de fetch est une coupure réseau (serveur injoignable, connexion
      // perdue, requête bloquée) — la requête n'est même pas arrivée. « Impossible de construire un itinéraire […]
      // élargissez le rayon » (error.routeImpossible) envoyait sur une fausse piste : un message dédié dit quoi faire.
      showFormError(msg(err && err.name === 'AbortError' ? 'error.drawTimeout' : 'error.network'));
      return;
    } finally {
      if(abortTimer) clearTimeout(abortTimer);
      if(drawId === currentDrawId && !(legs && legs.length)) endFailedDraw();
    }
    if(legs.length === 0){
      showFormError(msg('error.routeImpossible'));
      return;
    }
    var firstLeg = legs[0];
    lastNorm = firstLeg.norm || null;
    // Avertissements et zone de départ de CE tirage : gardés localement, enregistrés avec le voyage seulement quand il
    // est affiché (showDrawnTrip) — le voyage affiché ne doit jamais hériter de ceux d'un tirage échoué ou en cours.
    var tripNotices = data.notices || [];
    var tripDepartureTension = data.departureTension || null;

    // 17e audit du 20/09/2026 : tout ce qui suit était HORS de tout try/catch, alors que le finally ci-dessus ne rend
    // les boutons QUE lorsque le tirage n'a produit aucune étape. Une exception dans prefetchLegAssets, dans
    // scrollIntoView ou dans le lancement de la roulette (runReveal) laissait donc « Lancer » et « Retirer une autre
    // destination » désactivés DÉFINITIVEMENT — plus aucun tirage possible sans recharger la page —, revealInProgress
    // bloqué à true et l'écran à moitié effacé, sans le moindre message. Même filet que pour le rendu (showDrawnTrip).
    try {
    // L'itinéraire complet est déjà connu ici, avant même le début de l'animation — autant lancer
    // dès maintenant les requêtes (photos, vrais points d'intérêt) dont renderDays() aura besoin
    // dans quelques secondes, une fois la roulette terminée.
    // L'affichage attend la fin de ce préchargement (vraies activités, randonnées, photos), dans la limite de
    // PRELOAD_MAX_WAIT_MS depuis ce point : la roulette en occupe déjà la plus grande partie, et ce qui arriverait
    // encore plus tard se met à jour sur place comme avant. drawId écarte l'affichage d'un tirage entre-temps relancé.
    var assetsReady = prefetchLegAssets(legs);
    var preloadDeadline = Date.now() + PRELOAD_MAX_WAIT_MS;

    // Vivier de VRAIS noms de communes proches du point de départ pour faire défiler la roulette
    // avant la révélation — désormais renvoyé directement par /api/generate-trip (voir
    // buildSpinPool dans lib/trip-engine.js), calculé côté serveur autour de cityCoord avec le même
    // rayon 15-400 km qu'avant le passage recherche/tirage côté serveur. Un temps remplacé par un
    // recyclage des AUTRES étapes du trajet déjà tiré (aucune requête supplémentaire) : trop pauvre
    // pour un trajet court ou qui repasse plusieurs nuits par la même commune — la roulette
    // n'affichait alors presque plus jamais d'autre nom que celui du tirage, signalé par
    // l'utilisateur. `data.spinPool` reste vide seulement si aucune commune d'au moins 500 habitants
    // n'existe dans ce rayon (zone très peu peuplée) : runReveal sait déjà s'en passer (voir son
    // commentaire), la roulette affiche alors juste la destination elle-même.
    var spinPool = data.spinPool || [];

    els.reveal.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto':'smooth', block:'start'});
    els.mapCard.classList.remove('show');
    els.timeline.classList.remove('show');
    els.exportRow.classList.remove('show');
    els.packCard.classList.remove('show');
    els.againRow.classList.remove('show');

    if(rouletteTimer) clearTimeout(rouletteTimer);

    var firstStopInfo = { name: firstLeg.stop, norm: firstLeg.norm, pop: firstLeg.pop, cp: firstLeg.cp, allCps: firstLeg.allCps, featuredCount: firstLeg.featuredCount || 0 };
    runReveal(firstStopInfo, spinPool, drawId, function(){
      Promise.race([assetsReady, new Promise(function(resolve){ setTimeout(resolve, Math.max(0, preloadDeadline - Date.now())); })])
        .then(function(){ if(drawId === currentDrawId) showDrawnTrip(); });
    });
    } catch(err){
      console.warn('[tirage] ' + (err && err.message));
      if(drawId !== currentDrawId) return; // un tirage plus récent a pris le relais : c'est à lui de rendre les boutons
      endFailedDraw();
      showFormError(msg('error.routeImpossible'));
      return;
    }
    function showDrawnTrip(){
      try { showDrawnTripNow(); } finally { setDrawButtonsDisabled(false); revealInProgress = false; }
    }
    function showDrawnTripNow(){
    try { renderDrawnTrip(); }
    catch(err){
      // Aucune isolation jusqu'ici : une exception pendant le rendu laissait le journal vide, la carte absente et les
      // statistiques du voyage PRÉCÉDENT à l'écran, sans message. On remet l'écran dans un état cohérent.
      console.warn('[rendu] ' + (err && err.message));
      els.timelineStats.innerHTML = '';
      els.days.innerHTML = '';
      hideDisplayedTrip();
      showFormError(msg('error.routeImpossible'));
      throw err;
    }
  }
  function renderDrawnTrip(){
      // Nouveau voyage : aucune randonnée ni aucun lieu encore proposé. Sans remise à zéro des files de POI, un deuxième
      // voyage passant par la même commune partait d'une file vidée et n'affichait plus que des suggestions génériques.
      usedHikeUrls = {}; hikeQueueByCommune = {}; poiQueueByLocation = {}; genericQueueByLocation = {};
      tripGeneration++;
      // Enregistré AVANT le rendu : renderDays lit les avertissements, la zone de départ, le nombre de jours demandé
      // et le budget (devise des liens d'hébergement) du voyage affiché. cityCoord est conservé pour que l'écouteur
      // 'i18n:langchange' puisse redessiner la carte sans nouveau tirage.
      currentTripData = { legs: legs, city: city, budgetKey: budgetKey, transportKey: transportKey, cityCoord: cityCoord,
        firstStop: firstStopInfo, days: days, notices: tripNotices, departureTension: tripDepartureTension,
        startIso: tripStartIso, endIso: tripEndIso };
      // Nom du PDF et en-tête de page : départ → première destination (elle change à chaque tirage) et dates (voir
      // tripLabelText, recomposé à l'export dans la langue du moment).
      currentTripLabel = tripLabelText(currentTripData);
      renderDays(currentTripData);
      renderMap(legs, city, cityCoord);
      renderPacking(budgetKey, transportKey);
      updateRevealTexts(firstStopInfo);

      els.mapCard.classList.add('show');
      els.timeline.classList.add('show');
      els.exportRow.classList.add('show');
      els.packCard.classList.add('show');
      els.againRow.classList.add('show');
    }
  }

  // Tirage échoué (quota, serveur occupé, délai, aucun itinéraire, erreur de rendu) : le voyage PRÉCÉDENT n'est plus affiché
  // ni exportable (10e audit du 18/09/2026) — il restait à l'écran sous le message d'erreur, et « Exporter en PDF »
  // exportait ce voyage périmé comme s'il répondait aux nouveaux réglages. La roulette revient à son état d'attente.
  function hideDisplayedTrip(){
    currentTripData = null;
    currentTripLabel = '';
    tripGeneration++; // réponses en retard (POI, randonnées) de l'ancien voyage ignorées
    [els.mapCard, els.timeline, els.exportRow, els.packCard, els.againRow].forEach(function(el){ el.classList.remove('show'); });
    els.days.innerHTML = '';
    els.timelineStats.innerHTML = '';
    els.stamp.classList.remove('show');
    els.revealReal.classList.remove('show');
    els.revealRegion.textContent = '';
    els.compass.classList.remove('spin');
    els.rouletteName.textContent = '???';
    revealLabelKey = null;
    els.rouletteLabel.hidden = true;
    setRevealClue('reveal.clueIdle');
    announceReveal('');
    if(rouletteTimer){ clearTimeout(rouletteTimer); rouletteTimer = null; }
  }
  // Tirage en cours (requête ou roulette) : un changement de langue ne doit pas remettre les libellés du voyage
  // précédent (« Destination confirmée », sa première étape) sur la roulette en cours.
  var revealInProgress = false;
  function setDrawButtonsDisabled(disabled){
    els.launchBtn.disabled = disabled;
    els.againBtn.disabled = disabled;
  }
  // Début et fin ratée d'un tirage, au même endroit (17e audit du 20/09/2026) — appelés par generate().
  // beginDraw : la région annoncée aux lecteurs d'écran (#reveal-announce, aria-live) était vidée seulement au DÉBUT DE
  // LA ROULETTE (runReveal), c'est-à-dire après la réponse du serveur. Entre le clic et la réponse — plusieurs secondes,
  // jusqu'à DRAW_TIMEOUT_MS —, puis après un tirage qui échoue sans toucher au voyage affiché, elle gardait
  // « Destination confirmée — Lyon · … » : l'ancien voyage, annoncé comme s'il venait d'être tiré. Elle est vidée dès
  // le départ, avec la désactivation des boutons.
  function beginDraw(){
    setDrawButtonsDisabled(true);
    revealInProgress = true;
    announceReveal('');
  }
  // endFailedDraw : tirage abandonné (erreur réseau, réponse d'erreur, exception pendant le lancement de la roulette) —
  // boutons rendus, écran remis à l'état « aucun voyage ».
  function endFailedDraw(){
    setDrawButtonsDisabled(false);
    revealInProgress = false;
    hideDisplayedTrip();
  }
  els.form.addEventListener('submit', function(e){
    e.preventDefault();
    if(els.launchBtn.disabled) return; // requête de tirage déjà en cours
    generate();
  });
  els.againBtn.addEventListener('click', function(){ if(!els.againBtn.disabled) generate(); });

  // AAAAMMJJ-HHhMMmSS, triable et sans caractère à échapper dans un nom de fichier — évite que deux
  // exports du même trajet (même ville de départ, même destination tirée) ne finissent avec un nom
  // identique que le navigateur devrait renuméroter lui-même ("(1)", "(2)"...).
  function pdfTimestamp(){
    var d = new Date();
    function pad(n){ return String(n).padStart(2, '0'); }
    return d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + '-' + pad(d.getHours()) + 'h' + pad(d.getMinutes()) + 'm' + pad(d.getSeconds());
  }
  // Nom de fichier local uniquement (pas d'URL à slugifier) : on garde surtout des caractères
  // "sûrs" pour un système de fichiers (accents inclus, la plupart des OS actuels les gèrent bien
  // dans un nom de fichier téléchargé — seuls les séparateurs et symboles réservés sont remplacés).
  // « Départ → première étape · 20–22 sept. 2026 » : en-tête des pages du PDF et nom du fichier. Dates dans la langue
  // d'interface (12e audit du 19/09/2026 : dates ISO et « date → date » écrits en dur, flèche à rebours dans les langues de
  // droite à gauche) — plage via formatDateRange, recomposée à l'export (la langue a pu changer depuis le tirage).
  function tripLabelText(trip){
    if(!trip || !trip.legs || !trip.legs.length) return '';
    var d1 = parseIsoDate(trip.startIso), d2 = parseIsoDate(trip.endIso);
    var dates = '';
    if(d1){
      var opts = {day: 'numeric', month: 'short', year: 'numeric'};
      if(trip.days > 1 && d2 && d2 > d1) dates = formatDateRange(d1, d2, opts);
      else { try { dates = localeDateText(d1, opts); } catch(e){ dates = trip.startIso; } }
    }
    // Flèche dans le sens de lecture (13e audit du 19/09/2026) : « → » écrit en dur pointait à rebours dans l'en-tête du
    // PDF en arabe, persan, sorani, ourdou et divehi. En écriture de droite à gauche, « ← » : dans l'ordre logique
    // « départ ← étape », l'algorithme bidirectionnel place le départ à droite et la flèche pointe vers l'étape.
    // 17e audit du 20/09/2026 : encore faut-il que la flèche prenne le sens du PARAGRAPHE. Sans isolat, deux noms en
    // alphabet LATIN (le cas courant, « Lyon ← Moffans ») forment une seule séquence de gauche à droite : la règle N1 de
    // l'algorithme bidirectionnel donne la direction L à la flèche, coincée entre deux runs L, et le voyage se lit à
    // l'envers en ar, fa, ckb, ur et dv. Symétriquement, deux noms ARABES dans une interface de gauche à droite
    // donnaient « موفان → ليون », à rebours aussi. Chaque nom est donc isolé par FSI (U+2068) … PDI (U+2069) : il compte
    // alors comme un caractère neutre, la flèche prend la direction du paragraphe (règle N2) et pointe toujours du
    // départ vers l'étape, quelles que soient les écritures en présence. Les isolats sont invisibles et de largeur nulle
    // (polices du PDF comprises, voir lib/pdf-text.js qui applique le même algorithme via bidi-js).
    var arrow = (window.I18N.isRtl && window.I18N.isRtl(VISITOR_LANG)) ? ' ← ' : ' → ';
    return isolate(trip.city) + arrow + isolate(trip.legs[0].stop) + (dates ? ' · ' + isolate(dates) : '');
  }
  // Nom propre isolé du reste de la phrase pour l'algorithme bidirectionnel (17e audit du 20/09/2026, voir
  // tripLabelText) : « premier caractère fort » (FSI) plutôt que LRI/RLI, l'écriture du nom n'étant pas connue ici.
  var BIDI_FSI = '\u2068', BIDI_PDI = '\u2069';
  function isolate(s){ return BIDI_FSI + String(s == null ? '' : s) + BIDI_PDI; }
  function pdfFilename(label){
    // Nom de fichier : lu de GAUCHE À DROITE par le système de fichiers et par le navigateur, quelle que soit la langue
    // de l'interface (17e audit du 20/09/2026). La flèche de l'en-tête y est donc remise à « → », qui, avec les isolats
    // de tripLabelText, nomme toujours le départ en premier — « ← » aurait désigné l'étape avec des noms latins.
    var base = (label || 'itineraire').replace(/←/g, '→').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
    // Nom du site dans la langue d'interface (11e audit : toujours « Cap sur l'inconnu »), sans caractère réservé.
    var site = String(t('hero.title') || "Cap sur l'inconnu").replace(/[\\/:*?"<>|]+/g, '-').trim();
    // Les trois morceaux sont isolés à leur tour : sans cela, un nom de site en écriture de droite à gauche
    // (« نحو المجهول ») entraînait tout ce qui suit — itinéraire ET horodatage — dans son sens de lecture, et le nom du
    // fichier s'affichait à l'envers dans la liste des téléchargements.
    return isolate(site) + ' - ' + isolate(base) + ' - ' + isolate(pdfTimestamp()) + '.pdf';
  }

  // Export PDF : générée côté serveur (voir server.js, /api/export-pdf) et téléchargée directement
  // — pas de fenêtre d'impression à gérer soi-même, un vrai fichier .pdf. On envoie l'état ACTUEL
  // du voyage (voir buildTripExportPayload) ; le serveur ne fait que la mise en page, aucune donnée
  // n'est conservée côté serveur au-delà de la réponse.
  // Le contenu du bouton est remis à la fin de l'export avec les textes de la langue COURANTE (la langue a pu changer
  // pendant la génération) : l'icône d'origine est gardée, les libellés data-i18n sont retraduits.
  var exportInProgress = false;
  var exportBtnOriginalHtml = els.exportPdfBtn.innerHTML;
  function restoreExportButton(){
    els.exportPdfBtn.innerHTML = exportBtnOriginalHtml;
    Array.prototype.forEach.call(els.exportPdfBtn.querySelectorAll('[data-i18n]'), function(n){ n.textContent = t(n.getAttribute('data-i18n')); });
  }
  els.exportPdfBtn.addEventListener('click', function(){
    if(exportInProgress) return;
    var payload = buildTripExportPayload();
    if(!payload) return;
    exportInProgress = true;
    els.exportPdfBtn.disabled = true;
    // aria-busy : le bouton devient inerte plusieurs secondes pendant la génération ; sans cela, rien n'indiquait à un
    // lecteur d'écran que quelque chose était en cours (7e audit).
    els.exportPdfBtn.setAttribute('aria-busy', 'true');
    els.exportPdfBtn.textContent = t('export.generating');
    fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){
      if(!r.ok){ var httpErr = new Error('http ' + r.status); httpErr.status = r.status; throw httpErr; }
      return r.blob();
    }).then(function(blob){
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = pdfFilename(payload.tripLabel);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    }).catch(function(err){
      if(els.exportHint){
        // Quota (429) ou serveur occupé (503) : mêmes messages que pour un tirage, plus parlants qu'une erreur générique.
        // 17e audit du 20/09/2026 : 413 (corps refusé, itinéraire trop volumineux — voir la limite de taille dans
        // server.js) affichait « réessayez dans un instant », un conseil FAUX : réessayer à l'identique redonnera 413.
        // Message dédié qui dit quoi changer (raccourcir le voyage, enlever des étapes).
        // 18e audit du 21/09/2026 : une COUPURE RÉSEAU affichait « Échec de la génération du PDF — réessayez dans
        // un instant », alors que le tirage, lui, sait dire « Serveur injoignable : vérifiez votre connexion »
        // depuis la 16e passe. Une requête qui n'a jamais abouti n'a pas de statut : c'est ce qui la distingue.
        var status = err && err.status;
        var réseau = !status && err && err.name !== 'AbortError';
        els.exportHint.textContent = réseau ? t('error.network')
          : status === 429 ? t('error.tooManyRequests') : status === 503 ? t('error.serverBusy')
          : status === 413 ? t('export.tooLarge') : t('export.error');
        setTimeout(function(){ els.exportHint.textContent = t('export.hint'); }, 6000);
      }
    }).then(function(){
      exportInProgress = false;
      els.exportPdfBtn.disabled = false;
      els.exportPdfBtn.removeAttribute('aria-busy');
      restoreExportButton();
      // Désactiver le bouton pendant la génération faisait retomber le focus clavier sur <body> : il lui est rendu,
      // mais SEULEMENT si le visiteur n'est pas reparti ailleurs entre-temps (7e audit).
      if(document.activeElement === document.body || !document.activeElement){
        try { els.exportPdfBtn.focus({ preventScroll: true }); } catch(err2){}
      }
    });
  });

  /* ---------- MULTILINGUE : mise à jour dynamique au changement de langue ---------- */
  // Le passage statique de js/i18n.js (au chargement de la page) a déjà traduit tout le texte figé
  // du HTML (voir les attributs data-i18n dans index.html) — sauf hero.lede, qui a besoin de deux
  // constantes (MAX_TRIP_DAYS/MAX_STOPS) connues seulement ici, pas dans i18n.js. Rempli une
  // première fois au chargement, puis à chaque changement de langue avec le reste ci-dessous.
  var heroLedeEl = document.querySelector('[data-i18n="hero.lede"]');
  function applyHeroLede(){
    if(heroLedeEl) heroLedeEl.textContent = t('hero.lede', {maxDays: formatNum(MAX_TRIP_DAYS), maxStops: formatNum(MAX_STOPS)});
  }
  applyHeroLede();

  // Un itinéraire est déjà affiché : on le redessine à partir des MÊMES données (pas un nouveau
  // tirage) — renderDays()/renderPacking() sont sûrs à rappeler (voir leurs commentaires :
  // __poiUpgradeStarted/__hikePromise empêchent toute nouvelle requête réseau ou consommation d'une
  // file partagée), renderMap() recrée juste les calques sur la même carte. Factorisé ici plutôt que
  // dupliqué : rappelé à la fois par l'écouteur 'i18n:langchange' ci-dessous (nouvelle langue) et par
  // le sélecteur de devise (devise et plafond de prix des liens Airbnb/Booking recalculés au rendu, voir
  // lodgingUrlWithCurrency — le serveur, lui, les a figés au moment du tirage).
  function rerenderCurrentTrip(){
    if(currentTripData){
      renderDays(currentTripData);
      renderMap(currentTripData.legs, currentTripData.city, currentTripData.cityCoord);
      renderPacking(currentTripData.budgetKey, currentTripData.transportKey);
      if(!revealInProgress) updateRevealTexts(currentTripData.firstStop);
    }
  }

  window.addEventListener('i18n:langchange', function(){
    VISITOR_LANG = window.I18N.current();
    syncDistanceUnit(); // l'unité suit la langue : kilomètres <-> miles, champs du formulaire convertis
    // L'horloge porte data-i18n (texte d'attente) : la retraduction statique la remettait à « — à remplir — »
    // jusqu'au rechargement ; on la recalcule dans la nouvelle langue.
    tickClock();
    applyHeroLede();
    els.city.placeholder = placeholderText();
    updateDatesHint();
    applyBudgetOptionLabels();
    updateBudgetHint();
    updateRadiusUnitLabel();
    retranslateErrors();
    retranslateReveal();
    applyLightboxTexts();
    applyMapTexts();
    applyStepButtonLabels();
    fitPlaceholders();
    applyDocumentMeta();
    applyThemeButtonLabel();
    if(exportInProgress) els.exportPdfBtn.textContent = t('export.generating');
    rerenderCurrentTrip();
  });

  // <title> et meta description dans la langue d'interface (10e audit du 18/09/2026 : restaient en français). En français,
  // les textes d'origine de index.html sont gardés tels quels (ce sont aussi ceux que lisent les moteurs de recherche).
  var metaDescriptionEl = document.querySelector('meta[name="description"]');
  var originalTitle = document.title;
  var originalDescription = metaDescriptionEl ? metaDescriptionEl.getAttribute('content') : '';
  function applyDocumentMeta(){
    if(VISITOR_LANG === 'fr'){
      document.title = originalTitle;
      if(metaDescriptionEl) metaDescriptionEl.setAttribute('content', originalDescription);
      return;
    }
    document.title = t('hero.title') + ' — ' + t('hero.eyebrow');
    if(metaDescriptionEl) metaDescriptionEl.setAttribute('content', t('hero.lede', {maxDays: formatNum(MAX_TRIP_DAYS), maxStops: formatNum(MAX_STOPS)}));
  }
  applyDocumentMeta();

  // Bouton de thème : nom accessible = libellé visible (« Clair ») suivi de l'action (« Changer de thème… ») — seul le
  // title portait l'explication, et le nom annoncé se réduisait à « Clair » sans dire à quoi servait le bouton (10e audit).
  // Couleur d'habillage du navigateur (meta theme-color) alignée sur le thème CHOISI, pas seulement sur celui du système.
  var themeColorMetas = Array.prototype.slice.call(document.querySelectorAll('meta[name="theme-color"]'));
  themeColorMetas.forEach(function(m){ m.__original = m.getAttribute('content'); });
  var THEME_COLORS = { light: '#E4DFC9', dark: '#12191A' };
  function applyThemeButtonLabel(){
    Array.prototype.forEach.call(document.querySelectorAll('.theme-toggle-btn'), function(btn){
      var cur = btn.getAttribute('data-theme-current') || 'auto';
      btn.setAttribute('aria-label', t('theme.' + (THEME_COLORS[cur] ? cur : 'auto')) + ' — ' + t('theme.buttonTitle'));
    });
  }
  function applyThemeColorMeta(){
    var choice = document.documentElement.getAttribute('data-theme');
    themeColorMetas.forEach(function(m){ m.setAttribute('content', THEME_COLORS[choice] || m.__original); });
  }
  window.addEventListener('theme:change', function(){ applyThemeButtonLabel(); applyThemeColorMeta(); });
  applyThemeButtonLabel();
  applyThemeColorMeta();

})().catch(function(err){
  // Échec de l'initialisation (script de données absent, erreur inattendue…) : message visible dans #load-error
  // plutôt qu'une page silencieusement inerte. Repli en français si le module de traduction lui-même manque.
  try { console.error('[init]', err); } catch(e){}
  var box = document.getElementById('load-error');
  if(!box) return;
  var detail = (err && err.message) ? String(err.message) : String(err);
  var I = window.I18N;
  box.textContent = (I && typeof I.t === 'function')
    ? I.t('error.loadData', {msg: detail})
    : 'Impossible de charger les données (' + detail + ').';
  box.classList.add('show');
});
