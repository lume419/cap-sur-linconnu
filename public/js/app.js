
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
  var CURRENCY_SYMBOL = { EUR: '€', CHF: 'CHF', GBP: 'GBP', CZK: 'CZK', PLN: 'PLN', HUF: 'HUF', BAM: 'KM', DKK: 'DKK', NOK: 'NOK', SEK: 'SEK', ALL: 'ALL', RSD: 'RSD', MKD: 'MKD', RON: 'RON', ISK: 'ISK' };
  // Vrai symbole/abréviation d'usage courant de chaque devise — UNIQUEMENT pour l'affichage du
  // sélecteur de devise (bouton + liste, voir plus bas "SÉLECTEUR DE DEVISE"), jamais pour le
  // montant affiché dans le formulaire (CURRENCY_SYMBOL ci-dessus, volontairement resté au code ISO
  // pour éviter l'ambiguïté GBP/Guernesey-Jersey déjà documentée). Quatre devises partagent le même
  // symbole "kr" (DKK/NOK/SEK/ISK, chacune sa propre couronne nationale — l'islandaise rejoint le
  // groupe avec ce passage) : jamais affiché seul dans le sélecteur, toujours accompagné du code
  // (voir renderCurrencyList/renderCurrencyButton) pour rester non ambigu malgré le symbole commun.
  var CURRENCY_GLYPH = { EUR: '€', CHF: 'Fr.', GBP: '£', CZK: 'Kč', PLN: 'zł', HUF: 'Ft', BAM: 'KM', DKK: 'kr', NOK: 'kr', SEK: 'kr', ALL: 'L', RSD: 'дин.', MKD: 'ден', RON: 'lei', ISK: 'kr' };
  // Devise choisie MANUELLEMENT par le visiteur (sélecteur de devise dans l'en-tête, voir plus bas
  // "SÉLECTEUR DE DEVISE") — null tant qu'il n'a rien choisi, ce qui laisse `countryCurrency`
  // continuer à suivre le pays de chaque commune comme avant (voir son commentaire juste après :
  // "chaque étape du séjour utilisera ensuite sa propre devise"). Un choix explicite FIGE au
  // contraire une seule devise pour tout le site, quelle que soit l'étape affichée — même logique
  // "réglage global mémorisé" que la langue (STORAGE_KEY 'lang' dans i18n.js) ou le thème
  // (STORAGE_KEY 'theme' dans theme.js), jamais lue/écrite ailleurs que via ces deux fonctions.
  var CURRENCY_STORAGE_KEY = 'currency';
  function getPreferredCurrency(){
    try {
      var v = localStorage.getItem(CURRENCY_STORAGE_KEY);
      return v && CURRENCY_SYMBOL[v] ? v : null;
    } catch(e){ return null; } // stockage indisponible (navigation privée stricte...) : reste en auto
  }
  function setPreferredCurrency(code){
    try {
      if(code) localStorage.setItem(CURRENCY_STORAGE_KEY, code);
      else localStorage.removeItem(CURRENCY_STORAGE_KEY);
    } catch(e){ /* pas grave : le choix s'appliquera pour cette page, juste pas mémorisé */ }
  }
  // Devise d'un pays donné : la préférence manuelle si le visiteur en a choisi une (voir plus haut),
  // sinon EUR par défaut (tous les pays actuels sauf ceux listés dans CURRENCY_SYMBOL/COUNTRIES) —
  // CHF pour la Suisse/le Liechtenstein, GBP pour Guernesey/Jersey/l'île de Man/le Royaume-Uni, etc.
  // (COUNTRIES[cc].currency). Utilisé pour le plafond de prix budget/logement (voir
  // BUDGET_PRICE_MAX, updateBudgetHint, buildLodgingLinks) — jamais pour le péage/ferry, dont les
  // montants restent TOUJOURS affichés en euros, même préférence de devise choisie ou pas (voir
  // toll.enabled/toll.disabled dans i18n.js, non paramétrées par devise).
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
  // Liste des devises à proposer dans le sélecteur — RECONSTRUITE depuis COUNTRIES plutôt que
  // recopiée à la main (voir la demande d'origine, "en prenant en compte celles des pays déjà
  // renseignées") : ajouter un pays avec une nouvelle devise (COUNTRIES[cc].currency) suffit à le
  // faire apparaître ici automatiquement, aucune liste séparée à tenir à jour en double. EUR forcé
  // en tête (implicite pour la plupart des pays, jamais explicitement présent dans COUNTRIES sous
  // forme de `currency:'EUR'`, sinon absent de cette liste faute d'apparaître littéralement dans un
  // champ `currency`), le reste dans l'ordre alphabétique du code ISO.
  var CURRENCY_OPTIONS = (function(){
    var set = { EUR: true };
    COUNTRY_LIST.forEach(function(cc){ set[COUNTRIES[cc].currency || 'EUR'] = true; });
    var codes = Object.keys(set).filter(function(c){ return c !== 'EUR'; }).sort();
    return ['EUR'].concat(codes);
  })();

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

  function renderCurrencyButton(){
    if(!currencyButtonEl) return;
    var pref = getPreferredCurrency();
    // "AUTO" tant qu'aucune devise n'est figée (aucun symbole unique ne le représenterait — la
    // devise varie d'une étape à l'autre) ; sinon CODE + symbole réel (voir CURRENCY_GLYPH), le code
    // toujours présent pour lever l'ambiguïté des trois "kr" (DKK/NOK/SEK, voir son commentaire).
    currencyButtonEl.querySelector('.currency-toggle-code').textContent =
      pref ? pref + ' ' + (CURRENCY_GLYPH[pref] || '') : 'AUTO';
  }
  function closeCurrencyPanel(){
    if(currencyPanelEl) currencyPanelEl.classList.remove('show');
    if(currencyButtonEl) currencyButtonEl.setAttribute('aria-expanded', 'false');
  }
  function openCurrencyPanel(){
    if(!currencyPanelEl) return;
    currencyPanelEl.classList.add('show');
    currencyButtonEl.setAttribute('aria-expanded', 'true');
    renderCurrencyList();
  }
  function renderCurrencyList(){
    var pref = getPreferredCurrency();
    currencyListEl.innerHTML = '';
    function addOption(value, label){
      var li = document.createElement('li');
      li.className = 'currency-option' + (value === pref ? ' active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', value === pref ? 'true' : 'false');
      li.textContent = label;
      li.addEventListener('mousedown', function(e){
        e.preventDefault();
        setPreferredCurrency(value);
        renderCurrencyButton();
        updateBudgetHint();
        rerenderCurrentTrip();
        closeCurrencyPanel();
      });
      currencyListEl.appendChild(li);
    }
    addOption(null, t('currency.auto'));
    CURRENCY_OPTIONS.forEach(function(code){
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
    currencyButtonEl.setAttribute('aria-haspopup', 'listbox');
    currencyButtonEl.setAttribute('aria-expanded', 'false');
    currencyButtonEl.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="9"/><path d="M9 15.5c0 1 1.2 1.8 3 1.8s3-.8 3-1.8-1.2-1.5-3-1.8-3-1-3-1.8 1.2-1.7 3-1.7 3 .7 3 1.7"/>' +
        '<path d="M12 6.7V6M12 18v-.7"/>' +
      '</svg>' +
      '<span class="currency-toggle-code"></span>';

    currencyPanelEl = document.createElement('div');
    currencyPanelEl.className = 'currency-panel';
    currencyPanelEl.setAttribute('role', 'dialog');

    currencyListEl = document.createElement('ul');
    currencyListEl.className = 'currency-option-list';
    currencyListEl.setAttribute('role', 'listbox');

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
      if(e.key === 'Escape' && currencyPanelEl.classList.contains('show')){ closeCurrencyPanel(); currencyButtonEl.focus(); }
    });

    renderCurrencyButton();
  }
  function applyCurrencyPanelTexts(){
    if(!currencyButtonEl) return;
    var full = t('currency.buttonLabel') + ' — ' + (getPreferredCurrency() || t('currency.auto'));
    currencyButtonEl.setAttribute('aria-label', full);
    currencyButtonEl.title = full;
  }
  buildCurrencySwitcher();
  applyCurrencyPanelTexts();
  window.addEventListener('i18n:langchange', applyCurrencyPanelTexts);

  // Les données (communes par pays, points d'intérêt réels) ne sont plus embarquées dans le script :
  // elles sont chargées depuis /data au démarrage. Le formulaire reste désactivé (voir index.html)
  // tant que ce chargement n'est pas terminé. La carte du parcours, elle, n'a plus besoin d'aucun
  // fichier local : elle s'appuie sur de vraies tuiles OpenStreetMap via Leaflet (voir renderMap).
  //
  // Cache local (IndexedDB) du résultat DÉJÀ PARSÉ (COMMUNES/ALIASES, voir plus bas) — le fichier
  // texte brut, lui, était déjà mis en cache réseau une heure (voir server.js), mais le PARSING
  // JavaScript de ~562 000 communes + ~87 000 alias (2026), lui, se refaisait entièrement à CHAQUE
  // chargement de page, cache réseau ou pas : ~2 s mesurées dans le navigateur, le vrai goulot une
  // fois la compression gzip en place. Ce cache ne contient QUE des données géographiques publiques
  // déjà présentes sur /data (noms de communes, codes postaux, coordonnées) — rien qui concerne le
  // visiteur lui-même, donc rien qui relève du RGPD (qui ne s'applique qu'à des données personnelles,
  // article 4 du règlement) ; jamais transmis au serveur ni ailleurs, voir
  // politique-confidentialite.html. `readDataCache`/`writeDataCache` échouent silencieusement
  // (navigation privée, quota dépassé, navigateur sans IndexedDB...) sans jamais bloquer le chargement
  // du site — même philosophie que le fetch des alias plus bas, un bonus jamais indispensable.
  //
  // Invalidation AUTOMATIQUE : `DATA_VERSION` (voir plus bas) dérive une clé de version
  // directement de la longueur des deux bundles déjà reçus — pas un numéro de version à penser à
  // incrémenter à la main à chaque ajout de pays (source d'oubli quasi garantie vu le rythme des
  // ajouts de ce projet). Tout changement de contenu qui modifie ne serait-ce qu'un seul caractère
  // d'un fichier change presque toujours la longueur du bundle qui le contient (ajout de communes,
  // correction de nom...) : le cache est alors ignoré et reconstruit une fois, comme au tout
  // premier chargement.
  var DATA_CACHE_DB = 'csi-data-cache', DATA_CACHE_STORE = 'parsed', DATA_CACHE_KEY = 'v1';
  function openDataCacheDb(){
    return new Promise(function(resolve, reject){
      if(!window.indexedDB){ reject(new Error('indexedDB indisponible')); return; }
      var req = indexedDB.open(DATA_CACHE_DB, 1);
      req.onupgradeneeded = function(){ req.result.createObjectStore(DATA_CACHE_STORE); };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  }
  function readDataCache(version){
    return openDataCacheDb().then(function(db){
      return new Promise(function(resolve){
        var req = db.transaction(DATA_CACHE_STORE, 'readonly').objectStore(DATA_CACHE_STORE).get(DATA_CACHE_KEY);
        req.onsuccess = function(){
          var rec = req.result;
          if(!rec || rec.version !== version || !rec.communesJson){ resolve(null); return; }
          try {
            var communes = JSON.parse(rec.communesJson);
            var aliasesRaw = JSON.parse(rec.aliasesJson);
            // ALIASES référence les objets COMMUNES par identité (c.commune === l'entrée COMMUNES
            // correspondante, voir plus bas) : JSON ne sait pas exprimer cette référence, donc les
            // alias sont sérialisés comme un simple index numérique vers COMMUNES (voir writeDataCache)
            // et reconstitués ici.
            var aliases = aliasesRaw.map(function(a){ return { norm: a.norm, commune: communes[a.i] }; });
            resolve(communes.length ? { communes: communes, aliases: aliases } : null);
          } catch(e){ resolve(null); }
        };
        req.onerror = function(){ resolve(null); };
      });
    }).catch(function(){ return null; });
  }
  function writeDataCache(version, communes, aliases){
    openDataCacheDb().then(function(db){
      // Index communes -> position (Map par référence) plutôt qu'un indexOf par alias : sur
      // ~87 000 alias contre ~562 000 communes, indexOf (balayage linéaire) aurait fait des
      // dizaines de milliards de comparaisons — un Map ramène ça à un aller simple par alias.
      var indexByCommune = new Map();
      communes.forEach(function(c, i){ indexByCommune.set(c, i); });
      var aliasesCompact = aliases.map(function(a){ return { norm: a.norm, i: indexByCommune.get(a.commune) }; });
      db.transaction(DATA_CACHE_STORE, 'readwrite').objectStore(DATA_CACHE_STORE)
        .put({ version: version, communesJson: JSON.stringify(communes), aliasesJson: JSON.stringify(aliasesCompact) }, DATA_CACHE_KEY);
    }).catch(function(){ /* silencieux, voir commentaire plus haut */ });
  }
  var COMMUNES_RAW_BY_COUNTRY = {}, FEATURED_RAW, ALIASES_RAW_BY_COUNTRY = {}, DATA_VERSION;
  // Découpe un bundle serveur (voir server.js, routes /data/communes-bundle.txt et
  // /data/aliases-bundle.txt) en un objet {CODE_PAYS: texte brut}, à l'identique de ce que
  // produisaient les ~91 fetches individuels d'avant — split() avec un groupe capturant conserve
  // les marqueurs dans le résultat, en alternance avec le contenu qui les suit :
  // ["", "FR", "<contenu>", "DE", "<contenu>", ...]. Une éventuelle ligne vide en trop en bordure
  // de bloc (séparateur entre deux fichiers concaténés côté serveur) est sans conséquence :
  // parseCommunesFile (plus bas) fait déjà `.filter(Boolean)` sur les lignes.
  function splitBundle(bundleText){
    var parts = bundleText.split(/###([A-Z]{2})###\n/);
    var out = {};
    for (var i = 1; i < parts.length; i += 2) out[parts[i]] = parts[i + 1];
    return out;
  }
  try {
    // Les ~91 requêtes individuelles d'avant (une par fichier communes-XX.txt/aliases-XX.txt) ont
    // été mesurées en conditions réelles sur l'hébergement mutualisé (o2switch) : ~2,3 s
    // incompressibles quelle que soit la taille des fichiers ou la compression demandée — un débit
    // constant d'environ 40-45 requêtes/seconde, signature d'une protection anti-flood de
    // l'hébergeur plutôt qu'un problème de bande passante (6, 40 ou 92 connexions simultanées
    // donnaient quasiment le même temps total). Regroupées en 2 requêtes (voir server.js,
    // buildBundle) : la limite ne s'applique plus.
    var bundleResults = await Promise.all([
      fetch('data/communes-bundle.txt').then(function(r){ if(!r.ok) throw new Error('communes-bundle.txt : HTTP ' + r.status); return r.text(); }),
      fetch('data/featured.txt').then(function(r){ if(!r.ok) throw new Error('featured.txt : HTTP '+r.status); return r.text(); }),
      // Tolérant à l'échec (contrairement aux deux fetches ci-dessus) : la saisie multilingue des
      // villes est un bonus, pas une donnée essentielle — un bundle d'alias manquant/en erreur ne
      // doit jamais empêcher le site de fonctionner (voir le .catch, pas le try/catch global qui,
      // lui, affiche l'écran d'erreur bloquant pour les données réellement essentielles).
      fetch('data/aliases-bundle.txt').then(function(r){ return r.ok ? r.text() : ''; }).catch(function(){ return ''; })
    ]);
    var communesBundleText = bundleResults[0];
    FEATURED_RAW = bundleResults[1];
    var aliasesBundleText = bundleResults[2];
    COMMUNES_RAW_BY_COUNTRY = splitBundle(communesBundleText);
    ALIASES_RAW_BY_COUNTRY = splitBundle(aliasesBundleText);
    var missingCountries = COUNTRY_LIST.filter(function(cc){ return !COMMUNES_RAW_BY_COUNTRY[cc]; });
    if(missingCountries.length) throw new Error('communes-bundle.txt : pays manquants — ' + missingCountries.join(','));
    DATA_VERSION = communesBundleText.length + '|' + aliasesBundleText.length;
  } catch(err){
    var loadErr = document.getElementById('load-error');
    if(loadErr){
      loadErr.textContent = window.I18N.t('error.loadData', {msg: err.message});
      loadErr.classList.add('show');
    }
    return;
  }

  /* ---------- ICONS ---------- */
  var ICONS = {
    bed:'<path d="M3 18v-7a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v2M3 18v2M3 18h18M13 13h6a2 2 0 0 1 2 2v3M21 18v2M7 11a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"/>',
    spark:'<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z"/>',
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    plug:'<path d="M9 7V3M15 7V3M7 7h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7Z"/><path d="M12 15v3M9 21h6"/>',
    toll:'<path d="M4 21V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v15M20 21V6a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v15"/><path d="M7 12l10-5M4 21h16"/>',
    ferry:'<path d="M4 18.5c1.4 1 2.9 1 4.3 0s2.9-1 4.3 0 2.9 1 4.3 0 2.9-1 4.3 0"/><path d="M5.2 18 6.5 11h9L19 18"/><path d="M12 11V4M12 4.5h3.5L13 7.5"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    camera:'<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.3"/>',
    walk:'<path d="M3 19l6-11 4 6 2-3 6 8H3Z"/><circle cx="8" cy="6" r="1.6"/>',
    zoom:'<circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6"/><path d="M21 21l-4.3-4.3"/>',
    close:'<path d="M6 6l12 12M18 6L6 18"/>'
  };
  function icon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ICONS[name]+'</svg>';}

  // Code court -> étiquette de locale complète, pour Intl/toLocaleDateString (horloge, dates
  // formatées, nombre d'habitants...) — une seule variante par langue suffit ici, pas besoin de
  // distinguer ex. pt-PT/pt-BR pour ce site.
  // it : it-IT depuis l'ajout de l'Italie elle-même (plutôt que it-CH, utilisé quand l'italien
  // n'était encore que la 3e langue de la Suisse) — l'Italie est sa patrie la plus naturelle.
  var LOCALE_TAG = { fr:'fr-FR', en:'en-GB', es:'es-ES', pt:'pt-PT', nl:'nl-NL', de:'de-DE', lb:'lb-LU', it:'it-IT', rm:'rm-CH', nds:'nds-DE', hsb:'hsb-DE', frr:'frr-DE', sc:'sc-IT', fur:'fur-IT', lld:'lld-IT' };
  function localeTag(){ return LOCALE_TAG[VISITOR_LANG] || 'fr-FR'; }
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
  function ensureLightbox(){
    if(lightboxEl) return lightboxEl;
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox';
    lightboxEl.setAttribute('role', 'dialog');
    lightboxEl.setAttribute('aria-modal', 'true');
    lightboxEl.innerHTML =
      '<button type="button" class="lightbox-close" aria-label="'+t('photo.closeAria')+'">'+icon('close')+'</button>'+
      '<img class="lightbox-img" alt="">'+
      '<div class="lightbox-caption"></div>';
    document.body.appendChild(lightboxEl);
    lightboxEl.addEventListener('click', function(e){ if(e.target === lightboxEl) closeLightbox(); });
    lightboxEl.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && lightboxEl.classList.contains('show')) closeLightbox();
    });
    return lightboxEl;
  }
  function openLightbox(imgUrl, caption, wikiUrl){
    if(!imgUrl) return;
    var el = ensureLightbox();
    var img = el.querySelector('.lightbox-img');
    img.src = imgUrl;
    img.alt = caption || '';
    var capEl = el.querySelector('.lightbox-caption');
    capEl.innerHTML = (caption ? '<span>'+caption+'</span>' : '') +
      (wikiUrl ? '<a href="'+wikiUrl+'" target="_blank" rel="noopener">'+t('wiki.link')+'</a>' : '');
    el.classList.add('show');
    document.body.classList.add('lightbox-open');
  }
  function closeLightbox(){
    if(!lightboxEl) return;
    lightboxEl.classList.remove('show');
    document.body.classList.remove('lightbox-open');
    lightboxEl.querySelector('.lightbox-img').src = '';
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
  var EV_CHARGE_MARGIN = TripData.EV_CHARGE_MARGIN; // on recharge avant d'atteindre 75% de l'autonomie annoncée

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
  var TOLL_MIN_DISTANCE_KM = TripData.TOLL_MIN_DISTANCE_KM; // en-deçà, le péage n'entre pas en ligne de compte

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
  
  function landmassKey(a, b){ return [a, b].sort().join('|'); }
  function ferryRouteFor(a, b){ return (a === b) ? null : (FERRY_ROUTES[landmassKey(a, b)] || null); }
  // Détecte la masse continentale d'une commune : son pays pour la France (le champ dept y est un
  // vrai code de département, 2A/2B identifient la Corse sans ambiguïté) ; ses coordonnées pour
  // l'Espagne/le Portugal (dept y est déjà un nom de région en clair, pas exploitable ici — voir
  // parseCommunesFile). Bornes larges mais qui ne mordent jamais sur le continent correspondant :
  // vérifié que la France métropolitaine ne dépasse pas ~7,7°E (hors de la plage Corse) et que la
  // façade est de l'Espagne autour de Barcelone est à plus de 41°N (hors de la plage Baléares).
  function landmassOf(c){
    if(c.country === 'FR') return (c.dept === '2A' || c.dept === '2B') ? 'corsica' : 'continental';
    if(c.country === 'ES'){
      if(c.lon >= -18.5 && c.lon <= -13.0 && c.lat >= 27.5 && c.lat <= 29.6) return 'canary';
      if(c.lon >= 1.0 && c.lon <= 4.6 && c.lat >= 38.5 && c.lat <= 40.3) return 'balearic';
      return 'continental';
    }
    if(c.country === 'PT'){
      // Aucune ligne dans FERRY_ROUTES pour ces deux valeurs : voir le commentaire au-dessus de
      // FERRY_ROUTES — pas une omission, l'absence de vraie liaison maritime régulière.
      if(c.lon <= -20) return 'azores';
      if(c.lon <= -14) return 'madeira';
      return 'continental';
    }
    if(c.country === 'NL'){
      // Cinq îles Wadden, chacune sa propre commune aux Pays-Bas (contrairement à la Corse/aux
      // Baléares, le champ dept y est directement exploitable — un nom de commune, pas un simple
      // nom de région comme pour le reste de l'Espagne/Portugal). Une étiquette PAR île (voir
      // WADDEN_ISLANDS/FERRY_ROUTES plus haut) — jamais "wadden" tout court, sans quoi le moteur
      // les aurait crues reliées entre elles par la route. Repli sur une simple recherche de
      // sous-chaîne (pas d'égalité stricte) : une coquille du dump GeoNames orthographie l'une
      // d'elles "Ameland Municipalitye".
      for(var wi=0; wi<WADDEN_ISLANDS.length; wi++){
        if(new RegExp(WADDEN_ISLANDS[wi], 'i').test(c.dept || '')) return 'wadden-' + WADDEN_ISLANDS[wi];
      }
      return 'continental';
    }
    if(c.country === 'IT'){
      // Comme pour l'Espagne/le Portugal, dept est ici un nom de PROVINCE en clair (pas un code),
      // issu du fichier des codes postaux — comparaison stricte à la liste exacte des provinces de
      // chaque île plutôt qu'une sous-chaîne, pour éviter tout faux positif avec une province du
      // continent qui contiendrait par hasard le même mot.
      if(SARDINIA_PROVINCES.indexOf(c.dept) !== -1) return 'sardinia';
      if(SICILY_PROVINCES.indexOf(c.dept) !== -1) return 'sicily';
      return 'continental';
    }
    if(c.country === 'HR'){
      // Ici, ni le pays (comme la France) ni un simple rectangle lat/lon (comme l'Espagne/le
      // Portugal) ni le nom de comté (dept, comme la province italienne) ne suffisent : un comté
      // croate (ex. Splitsko-Dalmatinska) couvre à la fois des îles ET la portion de côte continentale
      // en face, ET plusieurs comtés/rectangles se chevauchent d'une île à l'autre (voir le
      // commentaire au-dessus de HR_ISLAND_POSTCODES) — seul le code postal, distinct par île dans
      // les données GeoNames, sépare correctement les deux. On regarde TOUS les codes postaux de la
      // commune (allCps), pas seulement le premier, par prudence. `c.cps` (au pluriel, sans le
      // préfixe "all") est le nom du champ sur l'objet commune BRUT tel que sorti de
      // parseCommunesFile/COMMUNE_GRID — c'est CE nom-là qu'utilisent les candidats vus par
      // reachable() dans buildRealRoute (via findNearbyCommunes) ; `cp`/`allCps` ne sont ajoutés que
      // plus tard, sur les objets enrichis (leg/stop/selectedCity). Bug réel trouvé lors de l'ajout
      // du Royaume-Uni (voir plus bas, c.country === 'GB') : sans repli sur `c.cps`, un candidat brut
      // ne matchait JAMAIS aucun code postal ici et retombait toujours sur 'continental' — resté
      // invisible pour la Croatie jusqu'ici car CHAQUE île y a justement une ligne de ferry directe
      // vers 'continental' (le mauvais repli tombait par pur hasard sur une masse malgré tout
      // ferry-atteignable) ; devenu un vrai blocage pour l'Irlande du Nord, qui n'a (volontairement,
      // voir plus bas) aucune ligne vers 'greatBritain' pour masquer le même bug.
      var hrCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
      for(var hci=0; hci<hrCps.length; hci++){
        var hrIsland = HR_POSTCODE_TO_ISLAND[hrCps[hci]];
        if(hrIsland) return hrIsland;
      }
      return 'continental'; // Krk/Pag/Vir/Čiovo (ponts routiers) + îlots non couverts, voir plus haut
    }
    // Malte : tout le pays est une île, mais DEUX masses distinctes reliées entre elles par leur
    // propre ferry (voir gozo|malta plus haut) — l'île principale (Malte) au sud, Gozo au nord,
    // séparées par le canal de Gozo (Comino, l'îlot entre les deux, rejoint la masse "gozo" par ce
    // même seuil faute d'étiquette dédiée, voir le commentaire au-dessus de FERRY_ROUTES). Seuil
    // vérifié sur l'ensemble de communes-mt.txt : le point le plus au nord de Malte (Marfa, 35,986°)
    // et le plus au sud de Gozo (Sannat, 36,025°) encadrent une marge nette de la latitude retenue.
    if(c.country === 'MT') return (c.lat >= 36.0) ? 'gozo' : 'malta';
    // Guernesey/Jersey : chacune sa propre masse (voir continental|jersey/continental|guernsey/
    // guernsey|jersey plus haut) — deux îles distinctes, jamais reliées entre elles par la route.
    if(c.country === 'GG') return 'guernsey';
    if(c.country === 'JE') return 'jersey';
    if(c.country === 'GB'){
      // Contrairement à la France/l'Espagne/l'Italie/la Croatie, pas besoin ici de séparer une île
      // annexe du continent : le Royaume-Uni EST l'île, dans son ensemble, hormis un seul cas — les
      // six comtés d'Irlande du Nord, géographiquement sur l'île d'IRLANDE et non sur celle de
      // Grande-Bretagne (aucune route ne relie les deux, uniquement des ferries, voir
      // continental|greatBritain plus haut). Identifiés par leur préfixe de code postal "BT" (zone
      // postale de Belfast, exclusive à l'Irlande du Nord — vérifié exhaustivement sur les 651
      // communes de communes-gb.txt : aucun chevauchement avec un autre préfixe ni avec une commune
      // hors Irlande du Nord). Étiquetées "ireland" par anticipation — la même masse que la
      // République d'Irlande dès son ajout (île unique, aucune mer entre les deux, voir README) —
      // plutôt qu'une étiquette "northernIreland" à part qui devrait de toute façon fusionner avec
      // "ireland" ensuite.
      // Voir le commentaire équivalent pour hrCps ci-dessus : repli sur `c.cps` (nom du champ sur
      // l'objet commune BRUT) indispensable ici, sans quoi AUCUN candidat brut d'Irlande du Nord
      // n'était jamais reconnu comme tel (retombait sur 'greatBritain'), rendant Belfast totalement
      // injoignable même depuis lui-même (aucune ligne 'ireland'-'greatBritain' pour masquer le bug
      // comme en Croatie) — trouvé en testant précisément ce cas en direct.
      var gbCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
      for(var gci=0; gci<gbCps.length; gci++){
        if(/^BT/i.test(gbCps[gci])) return 'ireland';
      }
      return 'greatBritain';
    }
    // République d'Irlande : le pays ENTIER rejoint la masse "ireland" déjà utilisée pour l'Irlande
    // du Nord ci-dessus (voir le commentaire GB) — île unique, aucune mer entre les deux, jamais
    // besoin de la moindre subdivision interne pour cette app (contrairement au Royaume-Uni voisin).
    if(c.country === 'IE') return 'ireland';
    // Île de Man : là encore, tout le territoire tient sur une seule masse, aucune subdivision
    // interne — la troisième île britannique de cette série (avec la Grande-Bretagne/l'Irlande du
    // Nord et la République d'Irlande) à n'avoir besoin que d'un simple test de pays.
    if(c.country === 'IM') return 'isleOfMan';
    if(c.country === 'DK'){
      // Le Danemark continental (Jylland/Fionie/Sjælland, y compris Copenhague) rejoint 'continental'
      // comme le reste de l'Europe connectée par la route : les trois masses sont reliées entre elles
      // par de VRAIS ponts routiers (Lillebæltsbroen gratuit, Storebæltsbroen/Øresundsbron payants mais
      // non modélisés, voir COUNTRIES.DK plus haut) — aucune ligne de ferry nécessaire pour aller de l'un
      // à l'autre. Seule exception : Bornholm, île sans aucun pont, uniquement reliée par ferry (voir
      // FERRY_ROUTES, 'bornholm|continental'). Identifiée par le préfixe de code postal danois "37"
      // (3700-3790), exclusif à la commune de Bornholm — vérifié sur les 9 codes postaux distincts de
      // communes-dk.txt commençant par "37", tous et uniquement rattachés à "Bornholm Kommune". Même
      // repli sur `c.cps` que pour hrCps/gbCps ci-dessus (nom du champ sur l'objet commune BRUT).
      var dkCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
      for(var dci=0; dci<dkCps.length; dci++){
        if(/^37/.test(dkCps[dci])) return 'bornholm';
      }
      return 'continental';
    }
    if(c.country === 'SE'){
      // Öland est reliée au continent par un vrai pont routier (Ölandsbron, 1972) — déjà 'continental'
      // sans code dédié. Seule vraie île sans pont modélisée : Gotland (voir FERRY_ROUTES,
      // 'continental|gotland'). Identifiée par le préfixe de code postal suédois "62" (620-624),
      // exclusif à la région Gotland — vérifié sur l'ensemble de communes-se.txt (les codes postaux
      // suédois s'écrivent "XXX XX", avec un espace ; le préfixe testé porte sur les trois premiers
      // chiffres, avant l'espace). Même repli sur `c.cps` que pour dkCps/hrCps/gbCps ci-dessus.
      var seCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
      for(var sci=0; sci<seCps.length; sci++){
        if(/^62/.test(seCps[sci])) return 'gotland';
      }
      return 'continental';
    }
    // Îles Åland : contrairement à la France/l'Espagne/l'Italie/la Croatie/le Danemark/la Suède, pas
    // besoin de distinguer une île d'un pays par ailleurs continental — comme pour Guernesey/Jersey/
    // l'île de Man, le pays AX EST l'île dans son ensemble (voir FERRY_ROUTES, 'aland|continental').
    if(c.country === 'AX') return 'aland';
    if(c.country === 'GR'){
      // Grèce — voir le grand commentaire au-dessus de FERRY_ROUTES pour la méthode complète et la
      // liste des sources. Contrairement à la Croatie (code postal EXACT, un par un — HR_POSTCODE_TO_
      // ISLAND), le système postal grec se prête à un simple test de PRÉFIXE (GR_ISLAND_PATTERNS,
      // testés dans l'ordre, le premier qui matche gagne) — vérifié exhaustivement, préfecture par
      // préfecture, sur les ~14 220 communes de communes-gr.txt. Même repli sur `c.cps` (nom du champ
      // sur l'objet commune BRUT) que pour hrCps/gbCps/dkCps/seCps ci-dessus, pour la même raison
      // (un candidat brut vu par reachable()/findNearbyCommunes n'a pas encore `allCps`).
      var grCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
      for(var gpi=0; gpi<grCps.length; gpi++){
        var grCp = grCps[gpi];
        // Cas Póros à part : son bloc de codes postaux (18020) est PARTAGÉ avec Galatás/Troizína,
        // sur le continent (péninsule de Trézène, en face de l'île) — un simple préfixe suffirait à
        // tort à faire passer ces communes continentales pour l'île. Filtrées par nom AVANT le test
        // générique (voir GR_POROS_MAINLAND_NAMES plus haut) ; en cas de faux négatif ponctuel sur un
        // hameau non listé, la commune retombe simplement sur 'continental' — jamais l'inverse
        // (aucun risque de faire croire une commune continentale reliée par un ferry qui n'existe pas
        // pour elle), cohérent avec le principe "jamais de trajet fabriqué" déjà appliqué ailleurs.
        if(/^1802/.test(grCp)){
          if(!GR_POROS_MAINLAND_NAMES.test(c.name || '')) return 'poros';
          continue;
        }
        for(var gpp=0; gpp<GR_ISLAND_PATTERNS.length; gpp++){
          if(GR_ISLAND_PATTERNS[gpp][0].test(grCp)) return GR_ISLAND_PATTERNS[gpp][1];
        }
      }
      return 'continental'; // Eubée (pont de Chalcis), Péloponnèse, Attique, Thessalie, Macédoine,
      // Thrace, Épire, Grèce centrale — ainsi que Leucade (reliée au continent par une digue routière
      // depuis les années 1980, jamais par ferry) et une trentaine de petites îles/îlots
      // volontairement LAISSÉS DE CÔTÉ (même logique que les îlots croates plus haut — limite
      // assumée, pas un oubli) : Cyclades mineures (Sífnos, Sérifos, Kýthnos, Kéa, Antíparos, Anáfi,
      // Síkinos, Folégandros, Kímolos), Dodécanèse mineur (Lipsí, Tílos, Sými, Kásos, Astypálaia,
      // Kastellórizo), mer Égée du Nord (Ágios Efstrátios, Foúrnoi), et petites îles ioniennes
      // (Paxoí, Meganísi, Kálamos) — toutes restent accessibles comme point de départ (recherche
      // manuelle) mais jamais comme étape reliée au reste d'un itinéraire.
    }
    if(c.country === 'FO'){
      // Îles Féroé — voir le commentaire au-dessus de FERRY_ROUTES pour la méthode complète. Un
      // simple test de PRÉFIXE de code postal suffit ici (comme la Grèce, pas besoin d'un code exact
      // par un comme la Croatie) : Suðuroy occupe exclusivement le bloc 800-970, vérifié
      // exhaustivement sur les 180 communes de communes-fo.txt (aucun autre bloc du pays n'empiète
      // sur cette tranche — la confusion possible avec "Vágur", nom partagé par une commune du nord,
      // code postal 700, et celle de Suðuroy, code 900, est déjà résolue par le simple test de
      // préfixe plutôt que par le nom). Même repli sur `c.cps` que pour hrCps/gbCps/dkCps/seCps/grCps
      // ci-dessus.
      var foCps = c.allCps || c.cps || (c.cp ? [c.cp] : []);
      for(var fpi=0; fpi<foCps.length; fpi++){
        if(/^[89]/.test(foCps[fpi])) return 'suduroy';
      }
      return 'continental'; // Streymoy (dont Tórshavn), Eysturoy, Vágar, Sandoy — reliées entre elles
      // et à Streymoy par pont ou tunnel sous-marin (le plus récent, Sandoyartunnilin, ouvert fin
      // 2023) : de vrais péages y existent (voir COUNTRIES.FO plus haut) mais jamais un ferry.
    }
    return 'continental'; // Andorre, Belgique, Monaco — déjà reliées au continent par la route
  }
  // Traversée en ferry : durée et tarif FIXES pour la ligne concernée (voir FERRY_ROUTES), sans
  // rapport avec la vitesse du véhicule choisi — contrairement à finalizeLeg. Ni péage ni recharge
  // électrique en mer (une voiture électrique peut recharger sur certaines lignes, mais aucune
  // donnée fiable là-dessus : pas modélisé, plutôt que d'inventer un chiffre).
  function finalizeFerryLeg(transportKey, route){
    var ferryClass = TRANSPORT[transportKey].ferryClass;
    return {
      travelTime: fmtHours(route.durationH),
      distanceKm: route.distanceKm,
      tollInfo: null,
      chargeInfo: null,
      ferryInfo: { routeKey: route.routeKey, amount: route.priceByClass[ferryClass], durationH: route.durationH }
    };
  }
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
  var FEATURED = {};
  FEATURED_RAW.split('\n').forEach(function(line){
    var parts = line.split(';');
    var nom = parts[0], lat = parseFloat(parts[1]), lon = parseFloat(parts[2]);
    var poisStr = parts[3] || '';
    var pois = poisStr ? poisStr.split('|').map(function(s){
      var m = s.match(/^(.*)\(([a-z_]+)\)$/);
      return m ? {name:m[1], type:m[2]} : {name:s, type:''};
    }) : [];
    FEATURED[normalizeCityName(nom)] = {name:nom, lat:lat, lon:lon, pois:pois};
  });
  /* ---------- BASE DES COMMUNES FRANÇAISES ---------- */
  // Couverture complète : ~35 000 communes (nom officiel + population + coordonnées + code(s) postal/postaux),
  // dérivées du Découpage administratif officiel (IGN / geo.api.gouv.fr, licence ouverte Etalab).
  // Format compact d'une ligne par commune : "population;lon,lat;cp1,cp2,...;Nom officiel"
  
  var DIACRITICS_RE = new RegExp("[̀-ͯ]", "g");
  var SEP_RE = /[-'’]/g;
  function normalizeCityName(s){
    return String(s||'').trim().toLowerCase()
      .normalize('NFD').replace(DIACRITICS_RE,'')
      .replace(SEP_RE,' ').replace(/\s+/g,' ').trim();
  }
  // Un fichier par pays, même format compact (voir plus haut), fusionnés en un seul tableau tagué
  // `country` — c'est ce tag qui distingue ensuite un code de département français (à résoudre via
  // DEPARTMENTS côté serveur) d'un nom de région déjà en clair pour les autres pays (ex. "Almería",
  // "Aveiro" — voir scripts/build-country-communes.js, qui produit directement ce nom).
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
  // Saisie d'une ville dans une AUTRE langue que son nom local (ex. "Anvers" en français pour la
  // commune belge "Antwerpen", "Séville" pour "Sevilla" — voir scripts/build-aliases.js, source
  // GeoNames alternateNamesV2). ALIASES[i].commune référence directement l'entrée COMMUNES
  // correspondante : sélectionner un résultat trouvé par alias résout donc bien vers le VRAI nom
  // local (celui utilisé partout ailleurs dans l'app — carte, activités, péage...), pas vers
  // l'alias saisi, qui n'était qu'un moyen de le trouver. Un alias reconnu dans N'IMPORTE LAQUELLE
  // des langues couvertes fonctionne, pas seulement celle actuellement choisie pour l'interface :
  // plus simple (pas besoin de reconstruire l'index à chaque changement de langue) et plus tolérant
  // pour l'utilisateur (fonctionne même juste après avoir changé de langue, ou par habitude).
  var COMMUNES, ALIASES = [];
  // Cache local déjà PARSÉ (voir tout en haut, "Cache local (IndexedDB)") : si un chargement
  // précédent a laissé une copie valide pour cette même version de données, on l'utilise
  // directement — ni parsing, ni construction d'index, un simple objet déjà prêt.
  var cachedData = await readDataCache(DATA_VERSION);
  if(cachedData){
    COMMUNES = cachedData.communes;
    ALIASES = cachedData.aliases || [];
  } else {
    COMMUNES = COUNTRY_LIST.reduce(function(all, cc){
      return all.concat(parseCommunesFile(COMMUNES_RAW_BY_COUNTRY[cc], cc));
    }, []);

    // Construction d'ALIASES VOLONTAIREMENT DIFFÉRÉE (par petits lots via setTimeout) plutôt que
    // synchrone ici : avec 45 pays et plus de 562 000 communes au total (2026), construire cet
    // index avant d'activer le champ "ville de départ" ajoutait un temps d'attente significatif et
    // parfaitement inutile — la recherche par nom local/code postal (searchCommunes, COMMUNES seul)
    // fonctionne très bien sans les alias, qui ne sont qu'un bonus (voir plus haut, "tolérant à
    // l'échec individuel"). Le champ est donc activé dès que COMMUNES est prêt (juste plus bas), et
    // ALIASES se remplit tout seul en tâche de fond juste après — searchCommunes lit la variable
    // ALIASES en direct (fermeture, pas une copie), donc les résultats par alias apparaissent
    // automatiquement dès que ce remplissage progressif les atteint, sans code supplémentaire. PAR
    // LOTS de plusieurs pays (pas un seul gros bloc, pas non plus un tick par pays) : un seul
    // setTimeout global se serait fait sentir comme un court gel de l'interface juste après
    // l'activation du champ ; à l'inverse, un tick séparé par pays (45 timers en chaîne) s'est
    // révélé PIRE en pratique, testé en direct — un onglet que le navigateur ne juge pas au premier
    // plan peut brider chaque `setTimeout` à environ 1/seconde (limitation standard des navigateurs
    // pour les onglets en arrière-plan), ce qui a fait grimper la construction complète à plus de
    // 40 secondes au lieu d'une fraction de seconde. Des lots de quelques pays limitent donc le
    // nombre de timers en jeu (moins exposé à ce bridage) tout en gardant chaque bloc synchrone
    // court.
    var COMMUNES_BY_COUNTRY_FOR_ALIASES = {};
    COMMUNES.forEach(function(c){
      (COMMUNES_BY_COUNTRY_FOR_ALIASES[c.country] = COMMUNES_BY_COUNTRY_FOR_ALIASES[c.country] || []).push(c);
    });
    (function scheduleAliasBuild(){
      var ALIAS_BATCH_SIZE = 10;
      var queue = ALIAS_COUNTRY_LIST.slice();
      function step(){
        var batch = queue.splice(0, ALIAS_BATCH_SIZE);
        if(!batch.length){
          // Construction terminée : mémorisée pour le prochain chargement (voir tout en haut,
          // readDataCache/writeDataCache) — fire-and-forget, sans jamais bloquer l'interface.
          writeDataCache(DATA_VERSION, COMMUNES, ALIASES);
          return;
        }
        batch.forEach(function(cc){
          var raw = ALIASES_RAW_BY_COUNTRY[cc];
          if(!raw) return;
          var byName = {};
          (COMMUNES_BY_COUNTRY_FOR_ALIASES[cc] || []).forEach(function(c){
            (byName[c.name] = byName[c.name] || []).push(c);
          });
          raw.split('\n').filter(Boolean).forEach(function(line){
            var parts = line.split(';');
            var alias = parts[1], canonical = parts[2];
            if(!alias || !canonical) return;
            var targets = byName[canonical];
            if(!targets) return;
            var norm = normalizeCityName(alias);
            targets.forEach(function(c){ ALIASES.push({ norm: norm, commune: c }); });
          });
        });
        setTimeout(step, 0);
      }
      setTimeout(step, 0);
    })();
  }

  // Recherche à partir de 3 caractères : préfixe de code postal OU préfixe du nom LOCAL/d'un alias
  // connu dans une autre langue (voir ALIASES ci-dessus), LES DEUX à chaque fois plutôt qu'un choix
  // exclusif selon le premier caractère saisi (chiffre -> code postal, lettre -> nom) comme avant
  // l'ajout de Malte/Guernesey/Jersey : leurs codes postaux commencent par des LETTRES ("VLT", "JE2",
  // "GY6"...), contrairement aux codes purement numériques de tous les pays précédents — un simple
  // `/^[0-9]/` sur la saisie aurait fait passer "VLT" pour un début de nom de commune (et donc
  // manquer la recherche par code postal) plutôt que le préfixe de code postal qu'il est réellement.
  // Essayer les deux systématiquement coûte à peine plus cher (même parcours de COMMUNES) et reste
  // sans risque de faux positif : aucun nom de commune ne commence par un chiffre, et un code postal
  // ne matche jamais par hasard un nom. Comparaison de code postal insensible à la casse (cps.txt
  // garde la casse d'origine GeoNames, ex. "VLT" — la saisie normalisée par normalizeCityName est,
  // elle, toujours en minuscules). Résultats triés par population décroissante pour faire remonter
  // les villes connues.
  function searchCommunes(query, limit){
    var q = normalizeCityName(query);
    if(q.length < 3) return [];
    var matches = [];
    var seenKeys = {}; // évite qu'une même commune apparaisse deux fois (nom local + alias, tous deux correspondant à la saisie)
    function pushMatch(c, cp){
      var key = c.country + '|' + c.norm + '|' + cp;
      if(seenKeys[key]) return;
      seenKeys[key] = true;
      matches.push({name:c.name, cp:cp, allCps:c.cps, pop:c.pop, lat:c.lat, lon:c.lon, dept:c.dept, country:c.country});
    }
    for(var i=0; i<COMMUNES.length; i++){
      var c = COMMUNES[i];
      var matchCp = null;
      for(var j=0;j<c.cps.length;j++){ if(c.cps[j].toLowerCase().indexOf(q)===0){ matchCp = c.cps[j]; break; } }
      if(matchCp) pushMatch(c, matchCp);
      if(c.norm.indexOf(q)===0) pushMatch(c, c.cps[0]);
    }
    for(var k=0; k<ALIASES.length; k++){
      if(ALIASES[k].norm.indexOf(q) === 0) pushMatch(ALIASES[k].commune, ALIASES[k].commune.cps[0]);
    }
    matches.sort(function(a,b){ return b.pop - a.pop; });
    return matches.slice(0, limit);
  }

  /* ---------- STATE ---------- */
  var radiusMode = 'km';
  var lastNorm = null; // évite de retomber sur la même première étape deux fois de suite
  var rouletteTimer = null;
  var currentTripLabel = ''; // "Ville — X jours", pour nommer le PDF exporté (voir export-pdf-btn)
  var currentTripData = null; // {legs, city, budgetKey, transportKey} du dernier itinéraire affiché

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
    tollToggle: document.getElementById('toll-toggle'),
    ferryToggle: document.getElementById('ferry-toggle')
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
  function pickPlaceholderCommune(){
    var pool = COMMUNES.filter(function(c){ return c.pop >= 2000 && c.name.length <= 16; });
    if(!pool.length) pool = COMMUNES.filter(function(c){ return c.name.length <= 16; });
    if(!pool.length) pool = COMMUNES;
    return pool[Math.floor(Math.random() * pool.length)];
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
    els.clock.textContent = d.toLocaleDateString(localeTag(),{weekday:'long', day:'numeric', month:'long'});
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
    return d.toLocaleDateString(localeTag(), {day:'numeric', month:'short'});
  }
  // Une seule ligne "Trouver un logement" par séjour (voir buildItinerary), pas une par nuit :
  // le libellé doit donc pouvoir couvrir une plage ("20 août → 22 août") plutôt qu'une seule date
  // quand le séjour dure plus d'une nuit.
  function formatStayRange(checkIn, checkOut){
    var d1 = parseIsoDate(checkIn), d2 = parseIsoDate(checkOut);
    var nights = (d1 && d2) ? Math.round((d2 - d1) / 86400000) : 1;
    return nights > 1 ? (formatFrDate(checkIn) + ' → ' + formatFrDate(checkOut)) : formatFrDate(checkIn);
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
  function clearDatesError(){
    els.datesField.classList.remove('invalid');
    els.datesError.classList.remove('show');
  }
  // Convention standard (hôtellerie/voyage) : le nombre de nuits est l'écart en jours calendaires
  // entre arrivée et retour (0 si même jour = virée sans nuitée) ; le nombre de "jours" du séjour
  // est nuits + 1 (le jour d'arrivée compte, celui de retour aussi). Ex. du 7 au 9 = 2 nuits, 3 jours.
  function tripNightsAndDays(start, end){
    var rawNights = Math.round((end - start) / 86400000);
    var nights = Math.max(0, Math.min(MAX_TRIP_DAYS - 1, rawNights));
    return { nights: nights, days: nights + 1, capped: nights < rawNights };
  }
  function updateDatesHint(){
    var start = parseIsoDate(els.dateStart.value);
    var end = parseIsoDate(els.dateEnd.value);
    if(start && end && end >= start){
      els.dateEnd.min = isoDate(start);
      var dur = tripNightsAndDays(start, end);
      var label = dur.nights === 0
        ? t('form.dates.oneDay')
        : t(dur.nights === 1 ? 'form.dates.duration1' : 'form.dates.durationN', {days: dur.days, nights: dur.nights});
      els.durationHint.textContent = label + (dur.capped ? t('form.dates.maxSuffix', {max: MAX_TRIP_DAYS}) : '');
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
  updateDatesHint();
  function getTripDays(){
    var start = parseIsoDate(els.dateStart.value);
    var end = parseIsoDate(els.dateEnd.value);
    if(!start || !end || end < start) return null;
    return tripNightsAndDays(start, end).days;
  }

  /* ---------- CITY VALIDATION ---------- */
  function clearCityError(){
    els.cityField.classList.remove('invalid');
    els.cityError.classList.remove('show');
  }
  function showCityError(message){
    els.cityError.textContent = message;
    els.cityField.classList.add('invalid');
    els.cityError.classList.add('show');
    els.cityField.classList.remove('shake');
    void els.cityField.offsetWidth; // restart shake animation
    els.cityField.classList.add('shake');
    els.city.focus();
  }

  /* ---------- MIN-DISTANCE VALIDATION ---------- */
  function clearMinDistanceError(){
    els.minDistanceField.classList.remove('invalid');
    els.minDistanceError.classList.remove('show');
  }
  function showMinDistanceError(message){
    els.minDistanceError.textContent = message;
    els.minDistanceField.classList.add('invalid');
    els.minDistanceError.classList.add('show');
    els.minDistanceField.classList.remove('shake');
    void els.minDistanceField.offsetWidth;
    els.minDistanceField.classList.add('shake');
    els.minDistance.focus();
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
      var flagSpan = document.createElement('span');
      flagSpan.className = 'suggest-flag';
      flagSpan.textContent = countryFlagEmoji(r.country);
      flagSpan.setAttribute('aria-hidden','true'); // décoratif : le nom du pays est repris en texte dans le title ci-dessous
      var nameTextSpan = document.createElement('span');
      nameTextSpan.textContent = r.name;
      nameSpan.appendChild(flagSpan);
      nameSpan.appendChild(nameTextSpan);
      var cpSpan = document.createElement('span');
      cpSpan.className = 'suggest-cp';
      cpSpan.textContent = formatCpBadge(r);
      var countryName = (COUNTRIES[r.country] && COUNTRIES[r.country].name) || '';
      if(countryName) li.setAttribute('title', countryName); // survol/lecteur d'écran : nom du pays en clair, pas seulement le drapeau
      li.appendChild(nameSpan);
      li.appendChild(cpSpan);
      li.addEventListener('mousedown', function(e){ e.preventDefault(); selectCommune(r); });
      els.citySuggest.appendChild(li);
    });
    els.citySuggest.classList.add('show');
    els.city.setAttribute('aria-expanded','true');
  }
  function selectCommune(r){
    selectedCity = { name:r.name, cp:r.cp, allCps:r.allCps, lat:r.lat, lon:r.lon, dept:r.dept, country:r.country };
    els.city.value = r.name + ' (' + r.cp + ')';
    hideSuggestions();
    clearCityError();
    updateBudgetHint(); // la devise du plafond affiché dépend du pays de la ville choisie (voir plus bas)
  }
  function hideSuggestions(){
    els.citySuggest.classList.remove('show');
    els.citySuggest.innerHTML = '';
    currentSuggestions = [];
    activeSuggestIndex = -1;
    els.city.setAttribute('aria-expanded','false');
  }
  function updateActiveSuggest(){
    var items = els.citySuggest.querySelectorAll('.suggest-item');
    items.forEach(function(it, i){
      var active = i === activeSuggestIndex;
      it.classList.toggle('active', active);
      it.setAttribute('aria-selected', active ? 'true':'false');
      if(active) it.scrollIntoView({block:'nearest'});
    });
  }

  els.city.addEventListener('input', function(){
    selectedCity = null;
    if(els.city.value.trim()) clearCityError();
    renderSuggestions(searchCommunes(els.city.value, 8));
    updateBudgetHint(); // ville désélectionnée : retombe sur la devise par défaut (EUR)
  });
  els.city.addEventListener('keydown', function(e){
    if(!els.citySuggest.classList.contains('show')) return;
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      activeSuggestIndex = Math.min(activeSuggestIndex+1, currentSuggestions.length-1);
      updateActiveSuggest();
    } else if(e.key === 'ArrowUp'){
      e.preventDefault();
      activeSuggestIndex = Math.max(activeSuggestIndex-1, 0);
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
      els.radiusValueDisplay.textContent = fmtHours(h);
      els.radiusValueWrap.classList.add('show-duration');
      els.radiusUnit.textContent = t('form.radius.unitH');
    } else {
      els.radiusValueWrap.classList.remove('show-duration');
      els.radiusUnit.textContent = t('form.radius.unitKm');
    }
  }
  function setMode(mode){
    radiusMode = mode;
    els.modeKm.setAttribute('aria-pressed', mode==='km');
    els.modeH.setAttribute('aria-pressed', mode==='h');
    if(mode==='km'){
      els.radius.value = 300; els.radius.min=20; els.radius.max=1200; els.radius.step=10;
    } else {
      els.radius.value = 4; els.radius.min=0.5; els.radius.max=12; els.radius.step=0.5;
    }
    updateRadiusUnitLabel();
  }
  els.modeKm.addEventListener('click', function(){ setMode('km'); });
  els.modeH.addEventListener('click', function(){ setMode('h'); });
  els.radius.addEventListener('input', updateRadiusUnitLabel);
  // En mode heures, le nombre décimal réel de l'input est rendu invisible (voir .show-duration
  // en CSS) : taper dessus au clavier ne montrerait rien d'utile, et permettrait de sélectionner
  // ce texte caché. On bloque donc la saisie clavier directe, en ne laissant passer que les
  // touches qui pilotent le pas de 0,5h (flèches haut/bas) et la navigation (Tab) — l'ajustement
  // de la valeur reste possible via ces flèches ou via les boutons +/- natifs du champ.
  els.radius.addEventListener('keydown', function(e){
    if(radiusMode !== 'h') return;
    var allowed = ['Tab','ArrowUp','ArrowDown','Escape'];
    if(allowed.indexOf(e.key) === -1){ e.preventDefault(); }
  });
  els.radius.addEventListener('paste', function(e){ if(radiusMode === 'h') e.preventDefault(); });
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
    var next = Math.min(max, Math.max(min, cur + dir*step));
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

  /* ---------- FOURCHETTE DE PRIX DU BUDGET SÉLECTIONNÉ ---------- */
  // Affiche le plafond réellement utilisé pour préremplir les liens Airbnb/Booking (voir
  // buildLodgingLinks, BUDGET_PRICE_MAX) — "jusqu'à X €/CHF" reflète le filtre "0 à X" appliqué sur
  // ces liens, pas une fourchette contiguë entre paliers. La devise suit le pays de la ville de
  // départ SÉLECTIONNÉE (selectedCity.country) quand elle est connue — un simple aperçu avant
  // tirage, puisque chaque étape du séjour utilisera ensuite sa propre devise (voir
  // buildLodgingLinks, appelé par commune) ; EUR par défaut tant qu'aucune ville n'est choisie.
  function updateBudgetHint(){
    // Garde défensive : le sélecteur de devise (voir plus haut, "SÉLECTEUR DE DEVISE") est
    // maintenant interactif dès le tout début du chargement, AVANT que `els` ci-dessous existe
    // (assigné seulement une fois les communes reçues) — un clic assez rapide sur "Automatique"/une
    // devise pendant cette fenêtre appellerait sinon cette fonction avant que le formulaire existe.
    if(!els || !els.budget) return;
    var key = els.budget.value;
    var currency = countryCurrency(selectedCity && selectedCity.country);
    var max = BUDGET_PRICE_MAX[currency][key];
    els.budgetHint.textContent = t('form.budget.hint', {max: max, currency: CURRENCY_SYMBOL[currency]});
  }
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
  function fmtHours(h){
    var totalMin = Math.round(h*60);
    var hh = Math.floor(totalMin/60), mm = totalMin%60;
    if(hh<=0) return mm+' min';
    return hh+'h'+(mm? String(mm).padStart(2,'0'):'');
  }
  function formatEuro(n){ return (Math.round(n*10)/10).toFixed(1).replace('.',','); }

  function effectiveRadiusKm(speed){
    var v = parseFloat(els.radius.value) || (radiusMode==='km'?300:4);
    return radiusMode==='km' ? v : v*speed;
  }

  // Distance réelle (vol d'oiseau, corrigé d'un facteur route de 1,17 — même méthode que pour les péages)
  // entre deux points géolocalisés, utilisée pour choisir une destination plausible et calculer des
  // temps de trajet cohérents avec la carte, plutôt qu'une distance tirée au hasard dans le rayon choisi.
  var ROAD_FACTOR = 1.17;
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

  /* ---------- GRILLE SPATIALE & CONSTRUCTION D'ITINÉRAIRE RÉEL ---------- */
  // Index léger (cellules ~0.2°, soit ~20 km) sur les ~35 000 communes pour trouver rapidement
  // les communes réelles proches d'un point donné, sans comparer une à une (35 000 communes x
  // jusqu'à 15 étapes serait trop lent en recherche naïve).
  var COMMUNE_GRID = null;
  var GRID_CELL_DEG = 0.2;
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
  function findNearbyCommunes(lat, lon, minKm, maxKm, minPop){
    // 1° de latitude vaut ~111 km partout, mais 1° de longitude se rétrécit avec cos(latitude) —
    // à la latitude de la France (~42-51°N), c'est ~25-35% de moins qu'à l'équateur. Utiliser le
    // même "span" en cellules pour dx (nord-sud) et dy (est-ouest) sous-couvrait donc largement la
    // direction est-ouest : une recherche censée porter à 600 km ne portait réellement qu'à
    // ~430 km plein ouest (vérifié) — assez pour manquer la Bretagne depuis la majorité du pays.
    // Calcul séparé du span est-ouest, élargi du facteur de compression, pour couvrir le même
    // rayon réel dans toutes les directions.
    var latSpan = Math.ceil(maxKm / (GRID_CELL_DEG*111)) + 1;
    var kmPerLonDeg = Math.max(111 * Math.cos(lat * Math.PI/180), 20); // garde-fou, sans objet en France
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
          var d = roadDistanceKm(lat, lon, c.lat, c.lon);
          if(d>=minKm && d<=maxKm) out.push({commune:c, distKm:d});
        }
      }
    }
    return out;
  }
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
  function buildRealRoute(startLat, startLon, startLandmass, maxRadiusKm, numStops, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled){
    var route = [];
    var used = {};
    if(avoidNorm) used[avoidNorm] = true;
    var curLat = startLat, curLon = startLon;
    var curLandmass = startLandmass;
    var minDist = minDistanceKm || 0;
    var maxDist = maxDistanceKm || 0; // 0 = pas de plafond
    var hopCeiling = maxDist > 0 ? maxDist : 600;
    // Même masse continentale que la position courante -> toujours autorisé (route normale, comme
    // avant). Masse différente -> seulement si les ferries sont activés ET qu'une vraie ligne
    // relie les deux (voir ferryRouteFor) ; sinon la commune est écartée du bassin de candidats,
    // quelle que soit sa distance à vol d'oiseau (qui ne veut rien dire pour une île sans liaison —
    // voir landmassOf/FERRY_ROUTES plus haut).
    function reachable(x){
      var toLandmass = landmassOf(x.commune);
      return toLandmass === curLandmass || (ferryEnabled && !!ferryRouteFor(curLandmass, toLandmass));
    }
    for(var i=0; i<numStops; i++){
      var isFirst = i===0;
      var isLast = !isFirst && i===numStops-1;
      var isOnlyStop = numStops === 1;
      var minHop = isFirst ? Math.max(15, minDist) : 8;
      var maxHop;
      if(isFirst && isOnlyStop){
        // Étape unique : elle sert aussi de retour, donc la limite de rayon s'y applique.
        maxHop = Math.max(40, minDist > 0 ? Math.max(minDist*1.4, maxRadiusKm) : Math.min(maxRadiusKm, hopCeiling));
      } else if(isFirst){
        maxHop = Math.max(40, minDist > 0 ? Math.max(minDist*1.4, hopCeiling) : hopCeiling);
      } else {
        maxHop = Math.max(35, Math.min(hopCeiling*0.5, 220));
      }
      // La taille de la commune n'est plus un critère d'éligibilité : un hameau de 50 habitants
      // est un candidat aussi valable qu'une grande ville, du moment qu'il reste dans le rayon de
      // recherche. Seuil très bas gardé uniquement pour écarter les artefacts de données
      // (communes à population nulle/inconnue dans la base).
      var minPop = 15;

      var candidates;
      if(isLast){
        // La limite de rayon/temps de retour ne s'applique qu'ici : quel que soit l'éloignement
        // atteint entre-temps, la dernière étape doit être choisie pour que le trajet final
        // rentre dans le rayon demandé (et dans le plafond maxDistanceKm, s'il y en a un).
        var lastCap = maxDist > 0 ? Math.min(maxRadiusKm, maxDist) : maxRadiusKm;
        candidates = findNearbyCommunes(curLat, curLon, 0, Math.max(maxHop, lastCap), minPop)
          .filter(function(x){ return !used[x.commune.norm]; })
          .filter(reachable)
          .filter(function(x){ return roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= lastCap; });
        if(candidates.length===0){
          candidates = findNearbyCommunes(startLat, startLon, 0, lastCap, 0)
            .filter(function(x){ return !used[x.commune.norm]; })
            .filter(reachable);
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
      // Tirage réellement uniforme dans tout le bassin de candidats éligibles — pas de score de
      // population ni de bonus "commune avec un vrai POI" (FEATURED) ici. Testé : même un bonus
      // modeste sur ~23 000 candidats suffit à écraser le hasard dès qu'il existe ne serait-ce que
      // quelques dizaines de communes qui en bénéficient (ce qui est le cas : FEATURED ne couvre
      // que 19 départements sur 108, concentrés à 92% dans un coin de l'Est) — la Bretagne, par
      // exemple, n'était alors *jamais* tirée malgré ~5% de part légitime du bassin de candidats.
      // La découverte de vrais points d'intérêt reste au rendez-vous quand la commune tirée en a
      // (voir buildActivityOptions, qui consulte FEATURED pour la commune once choisie) — mais ça
      // n'influence plus QUI est choisi, seulement CE QUI EST PROPOSÉ une fois le lieu tiré.
      var chosen = candidates[randInt(0, candidates.length-1)];
      used[chosen.commune.norm] = true;
      route.push(chosen.commune);
      curLat = chosen.commune.lat; curLon = chosen.commune.lon;
      curLandmass = landmassOf(chosen.commune);
    }
    return route;
  }
  // Répartit les nuits disponibles sur les étapes choisies : chacune a au moins 1 nuit, le reste
  // est distribué au hasard en favorisant les étapes avec de vrais points d'intérêt (pour permettre
  // plusieurs activités réelles distinctes sur place), avec un maximum de 4 nuits par étape.
  function distributeNights(route, totalNights){
    var nights = route.map(function(){ return 1; });
    var remaining = totalNights - route.length;
    var guard = 0;
    while(remaining > 0 && guard < 300){
      guard++;
      var idx = randInt(0, route.length-1);
      if(nights[idx] >= 4) continue;
      var feat = FEATURED[route[idx].norm];
      var weight = feat ? feat.pois.length + 1 : 1;
      if(Math.random() > weight/5) continue; // les étapes bien pourvues gagnent plus souvent une nuit de plus
      nights[idx]++;
      remaining--;
    }
    // Filet de sécurité : si le tirage pondéré n'a pas suffi à écouler toutes les nuits
    // (beaucoup de nuits pour peu d'étapes), on distribue le reste sans condition.
    var idx2 = 0;
    while(remaining > 0){
      nights[idx2 % nights.length]++;
      remaining--;
      idx2++;
    }
    return nights;
  }
  function lodgingCategoryLabel(budgetKey, avoidTent){
    if(budgetKey==='economique') return avoidTent ? t('lodging.economiqueNoTent') : t('lodging.economiqueTent');
    if(budgetKey==='moyen') return t('lodging.moyen');
    return t('lodging.confortable');
  }
  buildCommuneGrid(); // appelé ici (après la déclaration de COMMUNE_GRID ci-dessus), pas plus haut

  /* ---------- ROULETTE / REVEAL ---------- */
  function runReveal(firstStop, spinPool, onDone){
    els.stamp.classList.remove('show');
    els.revealReal.classList.remove('show');
    els.compass.classList.remove('spin');
    void els.compass.offsetWidth; // restart animation
    els.compass.classList.add('spin');
    els.rouletteLabel.textContent = t('reveal.drawing');

    var names = shuffle(spinPool.filter(function(c){return c.norm!==firstStop.norm;})).slice(0,6).map(function(c){return c.name;});
    if(names.length===0) names.push(firstStop.name);
    names.push(firstStop.name);

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){
      els.rouletteName.textContent = firstStop.name;
      els.rouletteClue.textContent = t('reveal.clueReduced');
      finishReveal(firstStop, onDone);
      return;
    }

    var i = 0, delay = 90, step = 0;
    var totalSteps = names.length + 10;
    function tick(){
      els.rouletteName.textContent = names[i % names.length];
      els.rouletteClue.textContent = t('reveal.clueSpinning');
      i++; step++;
      delay = delay * 1.16;
      if(step < totalSteps){
        rouletteTimer = setTimeout(tick, delay);
      } else {
        els.rouletteName.textContent = firstStop.name;
        els.rouletteClue.textContent = t('reveal.clueFinal');
        finishReveal(firstStop, onDone);
      }
    }
    tick();
  }
  // Rejoue juste le TEXTE des libellés "Destination confirmée"/nombre d'habitants/de POI posés par
  // finishReveal (jamais leur classe "show", déjà acquise, ni le délai de 250 ms qui n'a de sens que
  // pour l'animation initiale) — extrait à part pour pouvoir être rappelé tel quel depuis l'écouteur
  // 'i18n:langchange' plus bas. Sans ça, un changement de langue après un tirage laissait ces trois
  // libellés dans l'ancienne langue alors que le reste de la page (jours, carte, sac) suivait bien la
  // nouvelle — même firstStop que celui gardé dans currentTripData (voir plus bas), reconstruit à
  // l'identique.
  function updateRevealTexts(firstStop){
    els.rouletteLabel.textContent = t('reveal.confirmed');
    els.stamp.textContent = t('reveal.stamp');
    // Le code postal désambiguïse les nombreuses communes homonymes (ex. 3 "Thoiry" en France).
    var bits = [firstStop.name + (firstStop.cp ? ' (' + formatCpBadge(firstStop) + ')' : '')];
    if(firstStop.pop) bits.push(t('reveal.inhabitants', {n: firstStop.pop.toLocaleString(localeTag())}));
    if(FEATURED[firstStop.norm]){
      var n = FEATURED[firstStop.norm].pois.length;
      bits.push(t(n > 1 ? 'reveal.poiN' : 'reveal.poi1', {n: n}));
    }
    els.revealRegion.textContent = bits.join(' · ');
  }
  function finishReveal(firstStop, onDone){
    els.rouletteLabel.textContent = t('reveal.confirmed');
    setTimeout(function(){
      els.stamp.classList.add('show');
      updateRevealTexts(firstStop); // re-sets rouletteLabel too, harmless (same value already set above)
      els.revealReal.classList.add('show');
      if(onDone) onDone();
    }, 250);
  }

  /* ---------- PÉAGE & RECHARGE : calcul par étape ---------- */
  // Au-delà de TOLL_MIN_DISTANCE_KM, une portion du trajet emprunterait plausiblement une autoroute
  // à péage. Le péage coché rend l'étape plus rapide (temps réduit) ; décoché, le temps annoncé
  // correspond à l'itinéraire sans péage et on indique ce qui aurait pu être gagné.
  function finalizeLeg(distanceKm, speed, transportKey, tollEnabled, country){
    var hours = distanceKm / speed;
    var tollInfo = null;
    var tollClass = TRANSPORT[transportKey].tollClass; // null pour le vélo, interdit sur autoroute
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

  /* ---------- ITINERARY BUILD ---------- */
  // Liens de recherche réels (pas une réservation ni des résultats fabriqués) : cet artefact autonome
  // ne peut pas interroger une API Airbnb/hôtel en direct (aucun appel réseau externe n'est autorisé
  // au runtime, et aucune clé d'accès n'est disponible). On construit donc des liens de recherche
  // pré-remplis avec la vraie ville, les vraies dates et un plafond de prix indicatif — ils ouvrent
  // les résultats réels et à jour sur Airbnb / Booking. `country` (code ISO, ex. "CH") sert à deux
  // choses : préciser la ville dans la requête (au lieu de toujours accoler ", France" — un nom de
  // commune n'est pas forcément unique hors de France) et choisir la devise/le plafond de prix
  // adaptés (voir BUDGET_PRICE_MAX/countryCurrency) plutôt que systématiquement l'euro.
  function buildLodgingLinks(town, checkIn, checkOut, budgetKey, country){
    var countryName = (COUNTRIES[country] && COUNTRIES[country].name) || 'France';
    var q = encodeURIComponent(town + ', ' + countryName);
    var currency = countryCurrency(country);
    var priceMax = BUDGET_PRICE_MAX[currency][budgetKey];
    return {
      airbnb: 'https://www.airbnb.fr/s/' + encodeURIComponent(town) + '/homes?checkin=' + checkIn + '&checkout=' + checkOut + '&adults=2&price_max=' + priceMax + '&currency=' + currency,
      booking: 'https://www.booking.com/searchresults.fr.html?ss=' + q + '&checkin=' + checkIn + '&checkout=' + checkOut + '&group_adults=2&no_rooms=1&nflt=price%3D' + currency + '-0-' + priceMax + '-1'
    };
  }
  // Liens de secours (toujours utiles pendant le chargement, ou si aucune photo n'est trouvée) :
  // une recherche Wikipédia et une recherche d'images, en un clic, sans rien stocker.
  function buildPhotoLinks(placeName){
    var q = encodeURIComponent(placeName + ' France');
    return {
      wiki: 'https://' + VISITOR_LANG + '.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(placeName) + '&go=Go',
      images: 'https://www.google.com/search?tbm=isch&q=' + q
    };
  }
  // Vraie photo du lieu : on interroge notre propre serveur (/api/photo), qui va chercher la
  // photo d'infobox de l'article Wikipédia correspondant, dans la langue du VISITEUR (VISITOR_LANG
  // — voir plus haut), avec désambiguïsation par région (département français, ou nom de région
  // déjà en clair pour les autres pays — voir `country`) et la met en cache côté serveur. Ici, on
  // ne fait qu'éviter de redemander deux fois la même commune pendant l'affichage (ex. plusieurs
  // nuits au même endroit).
  var clientPhotoCache = {};
  function fetchPlacePhoto(name, dept, country){
    var key = name + '|' + (dept || '') + '|' + (country || '') + '|' + VISITOR_LANG;
    if(!clientPhotoCache[key]){
      var url = '/api/photo?name=' + encodeURIComponent(name) + '&dept=' + encodeURIComponent(dept || '') +
        '&country=' + encodeURIComponent(country || '') + '&lang=' + encodeURIComponent(VISITOR_LANG);
      clientPhotoCache[key] = fetch(url)
        .then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .catch(function(){ return { image:null, wikiUrl:null, title:null }; });
    }
    return clientPhotoCache[key];
  }
  // Vrais points d'intérêt en direct (OpenStreetMap/Overpass, via notre serveur) pour les communes
  // hors de FEATURED — la grande majorité. Mis en cache 24h côté serveur, donc rarement lent en
  // pratique après le tout premier tirage sur une commune donnée ; silencieux et sans jamais
  // bloquer l'affichage si Overpass est indisponible (voir renderDays, qui retombe sur les
  // activités génériques déjà affichées si rien n'est trouvé).
  var clientPoiCache = {};
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
      clientPoiCache[key] = fetch(url)
        .then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function(data){ return (data && data.pois) || []; })
        .catch(function(){ return []; });
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
  function realPoiQueueFor(lat, lon, name, dept, country){
    var key = lat.toFixed(3) + ',' + lon.toFixed(3);
    return fetchRealPOIs(lat, lon, name, dept, country).then(function(pois){
      if(!poiQueueByLocation[key]) poiQueueByLocation[key] = shuffle(pois || []);
      if(!genericQueueByLocation[key]) genericQueueByLocation[key] = shuffle(GENERIC_KEYS_NO_WALK);
      return {
        poisQueue: poiQueueByLocation[key],
        genericQueue: genericQueueByLocation[key],
        hasPois: !!(pois && pois.length)
      };
    });
  }
  // Plusieurs vraies randonnées balisées (Visorando, via notre serveur) pour la suggestion
  // "balade" quand aucun POI de plein air (point de vue, cascade...) n'a été trouvé pour la
  // compléter — un vrai itinéraire préparé, avec sa propre trace, vaut mieux qu'une phrase
  // générique. La LISTE est mémoïsée par nom de commune (un seul appel réseau même pour plusieurs
  // nuits au même endroit) ; voir pickHikeForCommune juste après pour la distribution d'une rando
  // DIFFÉRENTE par jour à partir de cette liste partagée.
  var clientHikeCache = {};
  function fetchVisorandoHikeList(communeName){
    if(!clientHikeCache[communeName]){
      clientHikeCache[communeName] = fetch('/api/hike?name=' + encodeURIComponent(communeName))
        .then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function(data){ return (data && data.hikes) || []; })
        .catch(function(){ return []; });
    }
    return clientHikeCache[communeName];
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
  function pickHikeForCommune(communeName){
    return fetchVisorandoHikeList(communeName).then(function(hikes){
      if(!hikeQueueByCommune[communeName]) hikeQueueByCommune[communeName] = shuffle(hikes);
      var queue = hikeQueueByCommune[communeName];
      return queue.length ? queue.shift() : null;
    });
  }
  // Lance à l'avance les mêmes requêtes que renderDays fera plus tard (photo de chaque étape,
  // vrais POI Overpass pour les communes qui en ont besoin, puis photo de chacun des POI trouvés) —
  // appelée pendant l'animation de la roulette, qui dure quelques secondes, plutôt que d'attendre
  // que l'itinéraire s'affiche pour commencer. fetchPlacePhoto()/fetchRealPOIs() mémoïsent déjà
  // leur résultat par clé (nom+département, ou coordonnées) : renderDays() récupère donc une
  // promesse déjà résolue (ou bien avancée) au lieu de repartir de zéro — moins d'attente visible
  // pour les photos et les activités, sans changer le rythme de l'animation elle-même.
  function prefetchLegAssets(legs){
    legs.forEach(function(leg){
      if(!leg.stop) return;
      fetchPlacePhoto(leg.stop, leg.dept, leg.country);
      if(leg.activities){
        leg.activities.forEach(function(opt){
          if(opt.isReal && opt.searchName) fetchPlacePhoto(opt.searchName, leg.dept, leg.country);
          // Réchauffe seulement la LISTE (mémoïsée, sans effet de bord) — piocher une rando
          // précise pour ce jour se décide au rendu (voir pickHikeForCommune), pas ici : appeler
          // pickHikeForCommune dès le préchargement consommerait la file avant même que renderDays
          // sache quels jours en ont réellement besoin. Visorando ne couvre que la France.
          if(opt.needsHike && leg.country === 'FR') fetchVisorandoHikeList(leg.stop);
        });
      }
      if(leg.needsRealPOIs && leg.lat != null && leg.lon != null){
        fetchRealPOIs(leg.lat, leg.lon, leg.stop, leg.dept, leg.country).then(function(dept, country){
          return function(pois){
            // Un lieu venu de la section Wikipédia "Lieux et monuments" apporte parfois déjà sa
            // photo (voir server.js) — pas besoin de la redemander via /api/photo dans ce cas.
            (pois || []).slice(0, 4).forEach(function(p){ if(!p.image) fetchPlacePhoto(p.name, dept, country); });
          };
        }(leg.dept, leg.country));
      }
    });
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
  function buildItinerary(city, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, avoidNorm, minDistanceKm, maxDistanceKm, ferryEnabled){
    var speed = TRANSPORT[transportKey].speed;
    var cLat = cityCoord.lat, cLon = cityCoord.lon;
    var startLandmass = landmassOf(cityCoord);
    var legs = [];
    var minDist = minDistanceKm || 0;
    var maxDist = maxDistanceKm || 0;

    // Choisit finalizeLeg (route) ou finalizeFerryLeg (traversée) selon que les deux extrémités du
    // saut sont sur la même masse continentale — voir landmassOf/ferryRouteFor plus haut. Un
    // changement de masse ne peut se produire que si les ferries étaient activés au moment du
    // tirage (seule condition sous laquelle buildRealRoute/les candidats ci-dessous les proposent) :
    // pas besoin de revérifier ferryEnabled ici, juste de reconnaître la traversée déjà décidée.
    function finalizeHop(fromPoint, toPoint, distanceKm, country){
      var fromLandmass = landmassOf(fromPoint), toLandmass = landmassOf(toPoint);
      if(fromLandmass !== toLandmass){
        var route = ferryRouteFor(fromLandmass, toLandmass);
        if(route) return finalizeFerryLeg(transportKey, route);
      }
      return finalizeLeg(distanceKm, speed, transportKey, tollEnabled, country);
    }

    if(days <= 1){
      // Jour unique : l'étape sert aussi de retour, donc la limite de rayon s'y applique
      // directement (comme pour un trajet à une seule étape dans buildRealRoute).
      var hopCeiling0 = maxDist > 0 ? maxDist : 600;
      var minHop0 = Math.max(15, minDist);
      var hop = Math.max(40, minDist > 0 ? Math.max(minDist*1.4, maxRadiusKm) : Math.min(maxRadiusKm, hopCeiling0));
      function reachable0(x){
        var toLandmass = landmassOf(x.commune);
        return toLandmass === startLandmass || (ferryEnabled && !!ferryRouteFor(startLandmass, toLandmass));
      }
      // La taille n'est plus un critère d'éligibilité (voir buildRealRoute) : seuil très bas gardé
      // uniquement pour écarter les artefacts de données.
      var candidates = findNearbyCommunes(cLat, cLon, minHop0, hop, 15)
        .filter(function(x){ return x.commune.norm !== avoidNorm; })
        .filter(reachable0);
      if(maxDist > 0) candidates = candidates.filter(function(x){ return x.distKm <= maxDist; });
      if(candidates.length===0){
        candidates = findNearbyCommunes(cLat, cLon, minHop0, hop*1.6, 0).filter(reachable0);
        if(maxDist > 0) candidates = candidates.filter(function(x){ return x.distKm <= maxDist; });
      }
      // Toujours rien même avec ce repli élargi (arrive surtout depuis une toute petite île sans
      // ferry activé, ou avec des contraintes de distance trop serrées) : itinéraire vide plutôt
      // qu'un plantage juste en dessous — generate() sait déjà afficher un message clair pour ça.
      if(candidates.length===0) return [];
      // Tirage uniforme, voir buildRealRoute pour le détail de pourquoi (tout score, même modeste,
      // écrase le hasard sur un aussi grand bassin de candidats).
      var stop = candidates[randInt(0, candidates.length-1)].commune;
      var featured0 = FEATURED[stop.norm];
      var poisQueue0 = featured0 ? featured0.pois.slice() : [];
      var genericQueue0 = shuffle(GENERIC_KEYS_NO_WALK);
      var activities0 = buildActivityOptions(poisQueue0, genericQueue0);
      var distOut = Math.round(roadDistanceKm(cLat, cLon, stop.lat, stop.lon));
      var distBack = Math.round(roadDistanceKm(stop.lat, stop.lon, cLat, cLon));
      // label : texte dans la langue au moment du tirage, utilisé tel quel par l'export PDF (rendu
      // côté serveur, non traduit — voir buildTripExportPayload). labelKind/dayNum : la même info
      // sous forme de données, résolue en texte à la volée par l'affichage web (voir
      // singleLegLabel) pour rester correcte après un changement de langue en cours de session.
      legs.push(Object.assign({
        label: t('day.single'), labelKind: 'single',
        stop: stop.name,
        activities: activities0,
        needsRealPOIs: !featured0,
        lodging: null,
        isReturn:false,
        lat: stop.lat, lon: stop.lon, norm: stop.norm, pop: stop.pop, dept: stop.dept, country: stop.country, cp: stop.cps[0], allCps: stop.cps
      }, finalizeHop(cityCoord, stop, distOut, stop.country)));
      legs.push(Object.assign({
        label: t('day.return'), labelKind: 'returnBare',
        stop: city,
        activities: null,
        lodging: null,
        isReturn:true,
        lat: cLat, lon: cLon, dept: cityCoord.dept, country: cityCoord.country, cp: cityCoord.cp, allCps: cityCoord.allCps
      }, finalizeHop(stop, cityCoord, distBack, cityCoord.country)));
      return legs;
    }

    var totalNights = days - 1;
    var maxPossibleStops = Math.max(1, Math.min(MAX_STOPS, totalNights));
    // Si la distance minimale demandée dépasse le rayon/temps de retour max, il faut au moins
    // 2 étapes pour pouvoir s'éloigner suffisamment PUIS revenir dans les temps sur le dernier
    // trajet (voir buildRealRoute) — sinon la contrainte serait mathématiquement impossible à
    // tenir avec une seule étape (generate() bloque déjà ce cas quand il ne reste qu'1 nuit).
    var forceMultiStop = minDist > maxRadiusKm && maxPossibleStops >= 2;
    var minStops = forceMultiStop ? 2 : (totalNights >= 3 ? Math.min(3, maxPossibleStops) : 1);
    minStops = Math.min(minStops, maxPossibleStops);
    var numStops = randInt(minStops, maxPossibleStops);
    var route = buildRealRoute(cLat, cLon, startLandmass, maxRadiusKm, numStops, avoidNorm, minDist, maxDist, ferryEnabled);
    if(route.length === 0) route = buildRealRoute(cLat, cLon, startLandmass, Math.max(maxRadiusKm, 300), 1, null, 0, maxDist, ferryEnabled);
    // Aucune commune trouvable même avec ce repli élargi (arrive surtout depuis une toute petite
    // île — Corse mise à part, quelques dizaines de communes seulement — sans ferry activé, ou
    // avec des contraintes de distance trop serrées pour son bassin de candidats) : mieux vaut
    // remonter un itinéraire vide, que generate() sait déjà signaler proprement (voir
    // "error.routeImpossible"), que de laisser distributeNights planter sur un tableau vide juste
    // après.
    if(route.length === 0) return [];
    var nights = distributeNights(route, totalNights);

    var dayCounter = 0;
    var prevLat = cLat, prevLon = cLon;
    var prevPoint = cityCoord; // landmassOf a besoin de dept/country, pas seulement lat/lon
    route.forEach(function(commune, stopIdx){
      var nightsHere = nights[stopIdx];
      var featured = FEATURED[commune.norm];
      var poisQueue = featured ? featured.pois.slice() : [];
      var genericQueue = shuffle(GENERIC_KEYS_NO_WALK);
      // Un séjour de plusieurs nuits au même endroit ne doit donner lieu qu'à UNE seule réservation
      // (les dates couvrent tout le séjour), pas une recherche Airbnb/Booking distincte — et donc
      // un lien différent — pour chaque nuit individuelle. Calculées une fois avant la boucle sur
      // les nuits, attachées uniquement à la première (voir plus bas) : c'est là, à l'arrivée, que
      // la recherche de logement est utile — pas répétée chaque jour du même séjour.
      var stayCheckIn = isoDate(addDays(tripStart, dayCounter));
      var stayCheckOut = isoDate(addDays(tripStart, dayCounter + nightsHere));
      var stayLodgingLinks = buildLodgingLinks(commune.name, stayCheckIn, stayCheckOut, budgetKey, commune.country);
      for(var n=0; n<nightsHere; n++){
        dayCounter++;
        var distanceKm = n===0 ? Math.round(roadDistanceKm(prevLat, prevLon, commune.lat, commune.lon)) : Math.round(rand(3,14));
        // n===0 : arrivée depuis l'étape précédente (peut-être une traversée, voir finalizeHop) ;
        // n>0 : nuit supplémentaire au même endroit (petit trajet local, jamais un ferry vers
        // soi-même — finalizeLeg direct, pas la peine de passer par finalizeHop pour ça).
        var legInfo = n===0 ? finalizeHop(prevPoint, commune, distanceKm, commune.country) : finalizeLeg(distanceKm, speed, transportKey, tollEnabled, commune.country);
        var activities = buildActivityOptions(poisQueue, genericQueue);
        var checkIn = isoDate(addDays(tripStart, dayCounter-1));
        var checkOut = isoDate(addDays(tripStart, dayCounter));
        var isFirstNightHere = (n === 0);
        legs.push(Object.assign({
          label: t('day.n', {n: dayCounter}), labelKind: 'day', dayNum: dayCounter,
          stop: commune.name,
          activities: activities,
          needsRealPOIs: !featured,
          lodging: lodgingCategoryLabel(budgetKey, avoidTent),
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
      label: t('day.nReturn', {n: dayCounter}), labelKind: 'dayReturn', dayNum: dayCounter,
      stop: city,
      activities: null,
      lodging: null,
      isReturn:true,
      lat: cLat, lon: cLon, dept: cityCoord.dept, country: cityCoord.country, cp: cityCoord.cp, allCps: cityCoord.allCps
    }, finalizeHop(prevPoint, cityCoord, distBackKm, cityCoord.country)));

    return legs;
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
    link.href = wikiUrl;
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
  function applyActivityCardImage(cardEl, label, image, imageFull, wikiUrl){
    var fullUrl = imageFull || image;
    var visual = cardEl.querySelector('.activity-card-visual');
    if(!visual) return;
    visual.innerHTML = '<img class="activity-card-img" src="'+image+'" alt="'+label+'" referrerpolicy="no-referrer">';
    cardEl.classList.add('has-image');
    var im = visual.querySelector('.activity-card-img');
    im.addEventListener('error', function(){
      cardEl.classList.remove('has-image');
      visual.innerHTML = icon('spark');
    });
    visual.addEventListener('click', function(){ openLightbox(fullUrl, label, wikiUrl); });
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
    if(hike.distance) metaBits.push(hike.distance);
    if(hike.duration) metaBits.push(hike.duration);
    if(hike.difficulty) metaBits.push(hike.difficulty);
    return '<div class="activity-card-visual">'+icon('walk')+'</div>'+
      '<div class="activity-card-body">'+
        '<div class="activity-card-title">'+hike.name+'</div>'+
        '<div class="activity-card-type">'+(metaBits.length ? metaBits.join(' · ') : t('hike.defaultType'))+'</div>'+
        '<div class="activity-card-source">'+t('hike.sourceLabel')+'</div>'+
      '</div>';
  }
  function renderActivityCards(actList, activities, dept, communeName, leg){
    actList.innerHTML = '';
    // Visorando ne couvre que la France (voir server.js) — inutile d'afficher "recherche d'une
    // vraie randonnée…" ni de tenter l'appel pour une commune d'un autre pays, la case générique
    // resterait de toute façon affichée telle quelle.
    var canHike = !leg || leg.country === 'FR';
    activities.forEach(function(opt){
      // Une vraie rando a déjà été trouvée pour cette option lors d'un rendu précédent (voir plus
      // bas) — ex. un changement de langue redessine tout le jour, mais la découverte Visorando,
      // elle, reste acquise : pas la peine de rejouer la promesse mémoïsée pour ça, juste réafficher
      // la carte trouvée (avec ses textes d'interface retraduits).
      if(opt.hikeUrl){
        var foundCard = document.createElement('a');
        foundCard.className = 'activity-card has-hike';
        foundCard.href = opt.hikeUrl;
        foundCard.target = '_blank';
        foundCard.rel = 'noopener';
        foundCard.innerHTML = hikeCardHtml({ name: opt.hikeName, url: opt.hikeUrl, distance: opt.hikeDistance, duration: opt.hikeDuration, difficulty: opt.hikeDifficulty });
        actList.appendChild(foundCard);
        return;
      }
      var card = document.createElement('div');
      card.className = 'activity-card';
      var label = optionLabel(opt);
      var noteHtml = (opt.needsHike && canHike)
        ? ' <span class="activities-loading-note">'+t('activities.loadingHike')+'</span>'
        : '';
      card.innerHTML =
        '<div class="activity-card-visual">'+icon(opt.isWalk ? 'walk' : 'spark')+'</div>'+
        '<div class="activity-card-body">'+
          '<div class="activity-card-title">'+label+'</div>'+
          '<div class="activity-card-type">'+optionTypeLabel(opt)+noteHtml+'</div>'+
        '</div>';
      actList.appendChild(card);
      if(opt.image){
        // Déjà résolue côté serveur (galerie Wikipédia de la commune, ou tag OSM wikimedia_commons
        // — voir server.js) — pas besoin d'un aller-retour /api/photo supplémentaire. opt.wikiUrl
        // (commune, ou page de description Commons/article dédié pour un POI OSM) sert de lien sur
        // le titre.
        applyActivityCardImage(card, label, opt.image, opt.imageFull, opt.wikiUrl || null);
      } else if(opt.isReal && opt.searchName){
        // Pour une vraie curiosité nommée (POI OSM sans photo déjà connue), on tente sa propre
        // photo Wikipédia (ex. l'intérieur d'un musée, le paysage d'un point de vue) — plutôt que
        // la photo générale de la commune. Même sans photo trouvée, un lien vers une vraie page
        // Wikipédia (quand une existe) reste appliqué au titre — mieux qu'aucun lien du tout.
        fetchPlacePhoto(opt.searchName, dept, leg && leg.country).then(function(cardEl, label){
          return function(data){
            if(!data) return;
            if(data.image) applyActivityCardImage(cardEl, label, data.image, data.imageFull, data.wikiUrl);
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
        var hikePromise = (leg && leg.__hikePromise) || pickHikeForCommune(communeName);
        if(leg) leg.__hikePromise = hikePromise;
        hikePromise.then(function(cardEl, opt){
          return function(hike){
            if(!hike) return;
            // On mémorise la trouvaille directement sur `opt` (donc sur leg.activities, puisque
            // c'est le même objet) — pas seulement dans le DOM — pour que l'export PDF (voir
            // buildTripExportPayload) et un futur rendu (voir plus haut, opt.hikeUrl) reflètent la
            // vraie randonnée trouvée plutôt que la formule générique de repli.
            opt.hikeName = hike.name; opt.hikeUrl = hike.url;
            opt.hikeDistance = hike.distance; opt.hikeDuration = hike.duration; opt.hikeDifficulty = hike.difficulty;
            if(!cardEl.parentNode) return;
            var newCard = document.createElement('a');
            newCard.className = 'activity-card has-hike';
            newCard.href = hike.url;
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
  function groupLegsByStay(legs){
    var groups = [];
    legs.forEach(function(leg, idx){
      var prev = groups[groups.length - 1];
      if(!leg.isReturn && prev && !prev.legs[0].isReturn && prev.legs[0].stop === leg.stop){
        prev.legs.push(leg);
        prev.endDay = idx + 1;
      } else {
        groups.push({ legs: [leg], startDay: idx + 1, endDay: idx + 1 });
      }
    });
    return groups;
  }
  function formatDayRangeLabel(startDay, endDay){
    return (endDay - startDay === 1)
      ? t('day.rangeAnd', {a: startDay, b: endDay})
      : t('day.rangeTo', {a: startDay, b: endDay});
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
      case 'day': return t('day.n', {n: leg.dayNum});
      case 'dayReturn': return t('day.nReturn', {n: leg.dayNum});
      default: return leg.label || '';
    }
  }

  /* ---------- RENDER: DAYS ---------- */
  function renderDays(legs, city){
    els.days.innerHTML = '';
    var totalKm = 0;
    legs.forEach(function(leg){ totalKm += leg.distanceKm || 0; });
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
      num.className = 'num' + (firstLeg.isReturn? ' final':'');
      num.textContent = firstLeg.isReturn ? '⟲' : (isMultiDay ? (group.startDay+'-'+group.endDay) : String(group.startDay));
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
      rt.innerHTML = t(firstLeg.ferryInfo ? 'day.crossingTime' : 'day.routeTime', {time: firstLeg.travelTime, km: firstLeg.distanceKm});
      top.appendChild(h3); top.appendChild(rt);
      body.appendChild(top);

      var stopEl = document.createElement('div');
      stopEl.className = 'day-stop';
      // Le code postal désambiguïse les nombreuses communes homonymes (ex. 3 "Thoiry" en France) —
      // sans lui, impossible de savoir laquelle a été tirée au sort rien qu'au nom.
      var stopLabel = firstLeg.stop + (firstLeg.cp ? ' (' + formatCpBadge(firstLeg) + ')' : '');
      stopEl.textContent = t(firstLeg.isReturn ? 'day.returnTo' : 'day.stepMystery', {stop: stopLabel});
      body.appendChild(stopEl);

      if(firstLeg.stop){
        var photos = buildPhotoLinks(firstLeg.stop);
        var tile = document.createElement('div');
        tile.className = 'photo-tile';
        tile.innerHTML =
          '<a class="photo-tile-main" href="'+photos.images+'" target="_blank" rel="noopener">'+
            '<span class="photo-tile-icon">'+icon('camera')+'</span>'+
            '<span class="photo-tile-text">'+
              '<span class="photo-tile-title">'+t('photo.view', {name: firstLeg.stop})+'</span>'+
              '<span class="photo-tile-sub">'+t('photo.searching')+'</span>'+
            '</span>'+
          '</a>'+
          '<a class="photo-tile-wiki" href="'+photos.wiki+'" target="_blank" rel="noopener">'+t('wiki.link')+'</a>';
        body.appendChild(tile);

        fetchPlacePhoto(firstLeg.stop, firstLeg.dept, firstLeg.country).then(function(stopName, tileEl, photoLinks){
          return function(data){
            if(data && data.image){
              var articleUrl = data.wikiUrl || photoLinks.wiki;
              var fullUrl = data.imageFull || data.image;
              tileEl.className = 'photo-tile has-image';
              tileEl.innerHTML =
                '<button type="button" class="photo-tile-imgwrap" aria-label="'+t('photo.enlargeAria', {name: stopName})+'">'+
                  '<img class="photo-tile-img" src="'+data.image+'" alt="'+stopName+'" referrerpolicy="no-referrer">'+
                  '<span class="photo-tile-zoom">'+icon('zoom')+'</span>'+
                '</button>'+
                '<div class="photo-tile-caption">'+
                  '<span class="photo-tile-text">'+
                    '<span class="photo-tile-title">'+stopName+'</span>'+
                    '<span class="photo-tile-sub">'+t('photo.real')+'</span>'+
                  '</span>'+
                  '<a class="photo-tile-wiki" href="'+articleUrl+'" target="_blank" rel="noopener">'+t('wiki.link')+'</a>'+
                '</div>';
              // Filet de sécurité : si l'URL d'image renvoyée par Wikipédia échoue quand même
              // au chargement (lien mort, hotlink refusé...), on retombe sur la tuile de secours
              // plutôt que de laisser une icône d'image cassée affichée.
              var imgEl = tileEl.querySelector('.photo-tile-img');
              if(imgEl){
                imgEl.onerror = function(){
                  tileEl.className = 'photo-tile';
                  tileEl.innerHTML =
                    '<a class="photo-tile-main" href="'+photoLinks.images+'" target="_blank" rel="noopener">'+
                      '<span class="photo-tile-icon">'+icon('camera')+'</span>'+
                      '<span class="photo-tile-text">'+
                        '<span class="photo-tile-title">'+t('photo.view', {name: stopName})+'</span>'+
                        '<span class="photo-tile-sub">'+t('photo.unavailable')+'</span>'+
                      '</span>'+
                    '</a>'+
                    '<a class="photo-tile-wiki" href="'+articleUrl+'" target="_blank" rel="noopener">'+t('wiki.link')+'</a>';
                };
              }
              var imgWrapBtn = tileEl.querySelector('.photo-tile-imgwrap');
              if(imgWrapBtn){
                imgWrapBtn.addEventListener('click', function(){ openLightbox(fullUrl, stopName, articleUrl); });
              }
            } else {
              var sub = tileEl.querySelector('.photo-tile-sub');
              if(sub) sub.textContent = t('photo.none');
            }
          };
        }(firstLeg.stop, tile, photos));
      }

      if(firstLeg.tollInfo){
        var ti = firstLeg.tollInfo;
        var barrierTxt = t(ti.fluxLibre ? 'toll.barrierFree' : 'toll.barrierClassic');
        var amountTxt = formatEuro(ti.amount);
        var tollRow = document.createElement('div');
        tollRow.className = 'day-row';
        var tollTxt = t(ti.enabled ? 'toll.enabled' : 'toll.disabled', {amount: amountTxt, barrier: barrierTxt, min: ti.savedMin});
        tollRow.innerHTML = icon('toll') + '<span><span class="lbl">'+t('toll.label')+'</span>'+tollTxt+'</span>';
        body.appendChild(tollRow);
      }
      if(firstLeg.ferryInfo){
        var fi = firstLeg.ferryInfo;
        var ferryRow = document.createElement('div');
        ferryRow.className = 'day-row';
        var ferryTxt = t('ferry.text', { route: t(fi.routeKey), amount: formatEuro(fi.amount), duration: fmtHours(fi.durationH) });
        ferryRow.innerHTML = icon('ferry') + '<span><span class="lbl">'+t('ferry.label')+'</span>'+ferryTxt+'</span>';
        body.appendChild(ferryRow);
      }
      if(firstLeg.chargeInfo){
        var c = firstLeg.chargeInfo;
        var chargeRow = document.createElement('div');
        chargeRow.className = 'day-row';
        var chargeTxt = t(c.stops > 1 ? 'charge.textN' : 'charge.text1', {n: c.stops, min: c.minutes});
        chargeRow.innerHTML = icon('plug') + '<span><span class="lbl">'+t('charge.label')+'</span>'+chargeTxt+'</span>';
        body.appendChild(chargeRow);
      }
      // Rappel vignette : uniquement la première fois que ce pays apparaît dans l'itinéraire (voir
      // shownVignetteCountries plus haut) — un pays traversé plusieurs jours de suite, ou retraversé
      // plus tard dans le séjour, n'a besoin d'acheter qu'UNE seule vignette pour tout le trajet.
      var vignetteCountry = firstLeg.country && COUNTRIES[firstLeg.country];
      if(vignetteCountry && vignetteCountry.vignette && !shownVignetteCountries[firstLeg.country]){
        shownVignetteCountries[firstLeg.country] = true;
        var vignetteRow = document.createElement('div');
        vignetteRow.className = 'day-row';
        vignetteRow.innerHTML = icon('toll') + '<span><span class="lbl">'+t('vignette.label')+'</span>'+t('vignette.notice')+
          ' <a href="'+vignetteCountry.vignette.url+'" target="_blank" rel="noopener">'+t('vignette.link')+'</a></span>';
        body.appendChild(vignetteRow);
      }

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
        var loadingNoteHtml = leg.needsRealPOIs
          ? ' <span class="activities-loading-note">'+t('activities.loadingReal')+'</span>'
          : '';
        var actLabelText = isMultiDay ? t('activities.day', {n: dayIdxInGroup + 1}) : t('activities.choice');
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
          realPoiQueueFor(leg.lat, leg.lon, leg.stop, leg.dept, leg.country).then(function(actListEl, dept, stopName, labelRow, dayLeg){
            return function(shared){
              // Marqué résolu qu'il y ait ou non de vrais POI trouvés : sinon, un ré-rendu ultérieur
              // (changement de langue) réafficherait indéfiniment la mention "recherche en cours"
              // pour un résultat déjà connu (voir loadingNoteHtml plus haut, qui teste ce champ).
              dayLeg.needsRealPOIs = false;
              var note = labelRow.querySelector('.activities-loading-note');
              if(note) note.remove();
              if(!shared.hasPois) return;
              var freshActivities = buildActivityOptions(shared.poisQueue, shared.genericQueue);
              // On remplace aussi leg.activities (pas seulement l'affichage) pour que l'export PDF
              // (voir buildTripExportPayload) reflète les vraies activités trouvées.
              dayLeg.activities = freshActivities;
              renderActivityCards(actListEl, freshActivities, dept, stopName, dayLeg);
            };
          }(actList, leg.dept, leg.stop, actLabelRow, leg));
        }
      });

      if(firstLeg.lodging){
        // Pas de ligne "Type de logement" séparée : la catégorie choisie est déjà reflétée dans
        // les recherches Airbnb/Booking ci-dessous (budget, dates), qui l'affichent en pratique
        // plutôt qu'en théorie — une ligne à part ne faisait que répéter la même information.
        if(firstLeg.lodgingLinks){
          var linksRow = document.createElement('div');
          linksRow.className = 'day-row';
          linksRow.innerHTML = icon('search') +
            '<span><span class="lbl">'+t('lodging.find', {range: formatStayRange(firstLeg.lodgingCheckIn, firstLeg.lodgingCheckOut)})+'</span>'+
            '<span class="lodging-links">'+
              '<a href="'+firstLeg.lodgingLinks.airbnb+'" target="_blank" rel="noopener" class="lodging-link">'+t('lodging.airbnb')+'</a>'+
              '<a href="'+firstLeg.lodgingLinks.booking+'" target="_blank" rel="noopener" class="lodging-link">'+t('lodging.booking')+'</a>'+
            '</span></span>';
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

    var nights = legs.filter(function(l){return l.lodging;}).length;
    var villes = {};
    legs.forEach(function(l){ if(!l.isReturn) villes[l.stop]=true; });
    var statsHtml =
      '<span><b>'+legs.length+'</b> '+t('stats.days')+'</span>'+
      '<span><b>'+Object.keys(villes).length+'</b> '+t('stats.cities')+'</span>'+
      '<span><b>'+nights+'</b> '+t('stats.nights')+'</span>'+
      '<span><b>~'+totalKm+' km</b> '+t('stats.totalKm')+'</span>';
    var tollLegs = legs.filter(function(l){return l.tollInfo;});
    if(tollLegs.length){
      var tollSum = tollLegs.reduce(function(s,l){return s+l.tollInfo.amount;},0);
      statsHtml += '<span><b>~'+formatEuro(tollSum)+' €</b> '+t(tollLegs[0].tollInfo.enabled ? 'stats.tollEstimated' : 'stats.tollAvoided')+'</span>';
    }
    var ferryLegs = legs.filter(function(l){return l.ferryInfo;});
    if(ferryLegs.length){
      var ferrySum = ferryLegs.reduce(function(s,l){return s+l.ferryInfo.amount;},0);
      statsHtml += '<span><b>~'+formatEuro(ferrySum)+' €</b> '+t('stats.ferryTotal')+'</span>';
    }
    els.timelineStats.innerHTML = statsHtml;
  }

  /* ---------- RENDER: MAP ---------- */
  // Carte interactive Leaflet + tuiles OpenStreetMap (voir index.html pour le chargement de la
  // bibliothèque). Remplace l'ancien tracé SVG maison (contours de pays simplifiés à la main,
  // projection équirectangulaire artisanale) : les vraies tuiles OSM couvrent nativement le monde
  // entier, sans jonctions de frontières à recoller ni fichier de contour à maintenir par pays.
  // L'instance de carte est créée une seule fois et réutilisée d'un tirage à l'autre (clearLayers
  // sur le calque de tracé), Leaflet n'acceptant pas d'être réinitialisé sur un conteneur déjà actif.
  var tripMap = null, tripMapLayer = null;

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function ensureTripMap(){
    if(tripMap) return tripMap;
    els.mapWrap.setAttribute('aria-label', t('map.ariaLabel'));
    tripMap = L.map(els.mapWrap, {
      scrollWheelZoom: false, // la molette scrolle la page tant qu'on n'a pas cliqué sur la carte
      attributionControl: true
    });
    tripMap.attributionControl.setPrefix(false); // retire le lien "Leaflet" ajouté par défaut devant le crédit OSM
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(tripMap);
    // Convenience classique Leaflet : la molette ne zoome la carte qu'une fois qu'on a cliqué
    // dedans (sinon on ne peut plus faire défiler la page en passant la souris sur la carte).
    tripMap.on('click', function(){ tripMap.scrollWheelZoom.enable(); });
    els.mapWrap.addEventListener('mouseleave', function(){ tripMap.scrollWheelZoom.disable(); });
    tripMapLayer = L.layerGroup().addTo(tripMap);
    return tripMap;
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
      L.polyline(routeLatLngs, {
        color: cssVar('--accent-3'), weight: 3, opacity: 0.9, dashArray: '1 8', lineCap: 'round'
      }).addTo(tripMapLayer);
    }

    var lastStopLL = null;
    for(var i=legs.length-1;i>=0;i--){ if(!legs[i].isReturn && legLLs[i]){ lastStopLL = legLLs[i]; break; } }
    if(lastStopLL && startLL){
      L.polyline([lastStopLL, startLL], {
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
          '<div class="trip-pin-badge">D</div><div class="trip-pin-label">'+(city||t('map.departFallback'))+'</div>',
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
      if(leg.stop === lastStopName) return;
      lastStopName = leg.stop;
      var ll = legLLs[idx];
      if(!ll) return;
      stopNum++;
      allPts.push(ll);
      L.marker(ll, {
        icon: tripDivIcon('trip-pin trip-pin-stop',
          '<div class="trip-pin-badge">'+stopNum+'</div><div class="trip-pin-label">'+leg.stop.split(' ').slice(0,2).join(' ')+'</div>',
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
  function buildTripExportPayload(){
    if(!currentTripData) return null;
    var legs = currentTripData.legs, city = currentTripData.city;
    var budgetKey = currentTripData.budgetKey, transportKey = currentTripData.transportKey;
    var totalKm = legs.reduce(function(s,l){ return s + (l.distanceKm||0); }, 0);
    var nights = legs.filter(function(l){ return l.lodging; }).length;
    var villes = {};
    legs.forEach(function(l){ if(!l.isReturn) villes[l.stop] = true; });
    var tollLegs = legs.filter(function(l){ return l.tollInfo; });
    var tollSummary = tollLegs.length ? {
      enabled: tollLegs[0].tollInfo.enabled,
      amount: tollLegs.reduce(function(s,l){ return s + l.tollInfo.amount; }, 0)
    } : null;
    return {
      city: city,
      tripLabel: currentTripLabel,
      budgetLabel: budgetLabel(budgetKey),
      transportLabel: transportLabel(transportKey),
      stats: { days: legs.length, cities: Object.keys(villes).length, nights: nights, totalKm: totalKm, toll: tollSummary },
      legs: legs.map(function(leg){
        return {
          label: leg.label,
          stop: leg.stop,
          cpBadge: leg.cp ? formatCpBadge(leg) : null,
          isReturn: !!leg.isReturn,
          distanceKm: leg.distanceKm,
          travelTime: leg.travelTime,
          country: leg.country || null,
          tollInfo: leg.tollInfo || null,
          chargeInfo: leg.chargeInfo || null,
          ferryInfo: leg.ferryInfo ? { route: t(leg.ferryInfo.routeKey), amount: leg.ferryInfo.amount } : null,
          checkInLabel: leg.lodgingCheckIn ? formatStayRange(leg.lodgingCheckIn, leg.lodgingCheckOut) : null,
          lodgingLinks: leg.lodgingLinks || null,
          activities: (leg.activities || []).map(function(opt){
            return opt.hikeUrl ? {
              label: opt.hikeName,
              typeLabel: [opt.hikeDistance, opt.hikeDuration, opt.hikeDifficulty].filter(Boolean).join(' · ') || t('hike.defaultType'),
              source: 'Visorando', hikeUrl: opt.hikeUrl
            } : { label: optionLabel(opt), typeLabel: optionTypeLabel(opt), source: null, hikeUrl: null };
          })
        };
      }),
      packing: Array.prototype.map.call(els.packGrid.querySelectorAll('.check-text'), function(el){ return el.textContent; })
    };
  }

  /* ---------- MAIN FLOW ---------- */
  function generate(){
    var typed = els.city.value.trim();
    if(!typed){
      showCityError(t('form.city.error.required'));
      return;
    }
    if(!selectedCity){
      showCityError(t('form.city.error.selectFromList'));
      return;
    }
    var city = selectedCity.name;
    clearCityError();
    var days = getTripDays();
    if(!days){
      els.datesField.classList.add('invalid');
      els.datesError.classList.add('show');
      els.datesField.classList.remove('shake');
      void els.datesField.offsetWidth;
      els.datesField.classList.add('shake');
      els.dateStart.focus();
      return;
    }
    clearDatesError();
    var tripStart = parseIsoDate(els.dateStart.value);
    var budgetKey = els.budget.value;
    var transportKey = els.transport.value;
    var tollEnabled = els.tollToggle.checked;
    var ferryEnabled = els.ferryToggle.checked;
    var avoidTent = els.tentToggle.checked;
    var speed = TRANSPORT[transportKey].speed;
    var maxRadiusKm = Math.max(20, effectiveRadiusKm(speed));
    var cityCoord = { lat: selectedCity.lat, lon: selectedCity.lon, dept: selectedCity.dept, cp: selectedCity.cp, allCps: selectedCity.allCps, country: selectedCity.country };

    var minDistanceKm = parseFloat(els.minDistance.value) || 0;
    var maxDistanceKm = parseFloat(els.maxDistance.value) || 0;
    var totalNights = Math.max(0, days - 1);
    clearMinDistanceError();
    if(minDistanceKm > 0 && maxDistanceKm > 0 && minDistanceKm > maxDistanceKm){
      showMinDistanceError(t('error.minMaxDistance', {min: minDistanceKm, max: maxDistanceKm}));
      return;
    }
    if(minDistanceKm > 0 && minDistanceKm > maxRadiusKm && totalNights <= 1){
      var contextTxt = t(totalNights === 0 ? 'error.minDistanceContextDay' : 'error.minDistanceContextNight');
      showMinDistanceError(t('error.minDistanceTooFar', {context: contextTxt, min: minDistanceKm, radius: Math.round(maxRadiusKm)}));
      return;
    }

    var legs = buildItinerary(city, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, lastNorm, minDistanceKm, maxDistanceKm, ferryEnabled);
    if(legs.length === 0){
      showCityError(t('error.routeImpossible'));
      return;
    }
    var firstLeg = legs[0];
    lastNorm = firstLeg.norm || null;

    // L'itinéraire complet est déjà connu ici, avant même le début de l'animation — autant lancer
    // dès maintenant les requêtes (photos, vrais points d'intérêt) dont renderDays() aura besoin
    // dans quelques secondes, une fois la roulette terminée.
    prefetchLegAssets(legs);

    // Vivier de vrais noms de communes proches, pour faire défiler la roulette avant la révélation.
    var spinRadius = Math.max(60, Math.min(maxRadiusKm, 400));
    var spinPool = findNearbyCommunes(cityCoord.lat, cityCoord.lon, 15, spinRadius, 500).map(function(x){ return x.commune; });

    els.reveal.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto':'smooth', block:'start'});
    els.mapCard.classList.remove('show');
    els.timeline.classList.remove('show');
    els.exportRow.classList.remove('show');
    els.packCard.classList.remove('show');
    els.againRow.classList.remove('show');

    if(rouletteTimer) clearTimeout(rouletteTimer);

    var firstStopInfo = { name: firstLeg.stop, norm: firstLeg.norm, pop: firstLeg.pop, cp: firstLeg.cp, allCps: firstLeg.allCps };
    runReveal(firstStopInfo, spinPool, function(){
      renderDays(legs, city);
      renderMap(legs, city, cityCoord);
      renderPacking(budgetKey, transportKey);
      // Le départ seul (city) se répète à chaque nouvel essai depuis la même ville — c'est la
      // première destination tirée au sort (firstLeg.stop) qui change à chaque tirage et rend le
      // nom de fichier réellement distinct d'un export à l'autre (voir pdfFilename).
      currentTripLabel = city + ' → ' + firstLeg.stop + ' - ' + days + (days > 1 ? ' jours' : ' jour');
      // cityCoord conservé (pas seulement legs/city) : nécessaire pour pouvoir rappeler renderMap
      // depuis l'écouteur 'i18n:langchange' plus bas, qui redessine l'itinéraire déjà affiché dans
      // la nouvelle langue sans repartir d'un nouveau tirage.
      currentTripData = { legs: legs, city: city, budgetKey: budgetKey, transportKey: transportKey, cityCoord: cityCoord, firstStop: firstStopInfo };

      els.mapCard.classList.add('show');
      els.timeline.classList.add('show');
      els.exportRow.classList.add('show');
      els.packCard.classList.add('show');
      els.againRow.classList.add('show');
    });
  }

  els.form.addEventListener('submit', function(e){
    e.preventDefault();
    generate();
  });
  els.againBtn.addEventListener('click', generate);

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
  function pdfFilename(label){
    var base = (label || 'itineraire').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
    return "Cap sur l'inconnu - " + base + ' - ' + pdfTimestamp() + '.pdf';
  }

  // Export PDF : générée côté serveur (voir server.js, /api/export-pdf) et téléchargée directement
  // — pas de fenêtre d'impression à gérer soi-même, un vrai fichier .pdf. On envoie l'état ACTUEL
  // du voyage (voir buildTripExportPayload) ; le serveur ne fait que la mise en page, aucune donnée
  // n'est conservée côté serveur au-delà de la réponse.
  els.exportPdfBtn.addEventListener('click', function(){
    var payload = buildTripExportPayload();
    if(!payload) return;
    var originalLabel = els.exportPdfBtn.innerHTML;
    var originalHint = els.exportHint ? els.exportHint.textContent : '';
    els.exportPdfBtn.disabled = true;
    els.exportPdfBtn.textContent = t('export.generating');
    fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){
      if(!r.ok) throw new Error('http ' + r.status);
      return r.blob();
    }).then(function(blob){
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = pdfFilename(currentTripLabel);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    }).catch(function(){
      if(els.exportHint){
        els.exportHint.textContent = t('export.error');
        setTimeout(function(){ els.exportHint.textContent = originalHint; }, 6000);
      }
    }).then(function(){
      els.exportPdfBtn.disabled = false;
      els.exportPdfBtn.innerHTML = originalLabel;
    });
  });

  /* ---------- MULTILINGUE : mise à jour dynamique au changement de langue ---------- */
  // Le passage statique de js/i18n.js (au chargement de la page) a déjà traduit tout le texte figé
  // du HTML (voir les attributs data-i18n dans index.html) — sauf hero.lede, qui a besoin de deux
  // constantes (MAX_TRIP_DAYS/MAX_STOPS) connues seulement ici, pas dans i18n.js. Rempli une
  // première fois au chargement, puis à chaque changement de langue avec le reste ci-dessous.
  var heroLedeEl = document.querySelector('[data-i18n="hero.lede"]');
  function applyHeroLede(){
    if(heroLedeEl) heroLedeEl.textContent = t('hero.lede', {maxDays: MAX_TRIP_DAYS, maxStops: MAX_STOPS});
  }
  applyHeroLede();

  // Un itinéraire est déjà affiché : on le redessine à partir des MÊMES données (pas un nouveau
  // tirage) — renderDays()/renderPacking() sont sûrs à rappeler (voir leurs commentaires :
  // __poiUpgradeStarted/__hikePromise empêchent toute nouvelle requête réseau ou consommation d'une
  // file partagée), renderMap() recrée juste les calques sur la même carte. Factorisé ici plutôt que
  // dupliqué : rappelé à la fois par l'écouteur 'i18n:langchange' ci-dessous (nouvelle langue) et par
  // le sélecteur de devise plus bas (nouvelle devise sur les liens Airbnb/Booking déjà affichés).
  function rerenderCurrentTrip(){
    if(currentTripData){
      renderDays(currentTripData.legs, currentTripData.city);
      renderMap(currentTripData.legs, currentTripData.city, currentTripData.cityCoord);
      renderPacking(currentTripData.budgetKey, currentTripData.transportKey);
      updateRevealTexts(currentTripData.firstStop);
    }
  }

  window.addEventListener('i18n:langchange', function(){
    VISITOR_LANG = window.I18N.current();
    applyHeroLede();
    els.city.placeholder = placeholderText();
    updateDatesHint();
    updateBudgetHint();
    updateRadiusUnitLabel();
    rerenderCurrentTrip();
  });

})();
