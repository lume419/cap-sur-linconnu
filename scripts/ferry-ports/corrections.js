// Corrections appliquées par scripts/build-ferry-ports.js après les fichiers ports-*.js (septembre 2026).
// - routes : liaisons dont une rive n'a aucune localité dans les données (quai OpenStreetMap seul).
// - remove : ports qui ne sont plus desservis par la liaison (raison sourcée) ; add : ports desservis manquants (source).
// - quays : terminaux ferry OpenStreetMap (amenity=ferry_terminal, extrémité de route=ferry ou quai nommé) pour les ports
//   dont le centre de la localité est loin du quai ; osm = élément cité, coordonnées recopiées de cet élément.
//   sideNote : quai que landmassOf range sur une autre rive faute de règle assez fine (voir la note).
// - pairs : paires de ports réellement desservies en 2026 (sites des opérateurs, ferryhopper), dans l'ordre des rives.
// Non recalés, faute de meilleure localité : Saint-Laurent-du-Maroni (lieu = centre de la commune, quai du bac à 61 km) et
// Surumatra (Kurupukari, quai à 71 km) ; les étapes utilisent ces mêmes coordonnées, l'estimation reste cohérente.
// 14e audit du 19/09/2026 : toujours non recalés, faute de coordonnées de quai dans le dépôt (aucun élément OpenStreetMap
// relevé ; pas de scripts/dump/GF_dump.txt ni PF_dump.txt ; communes.txt ne donne que le centre des communes) :
// Saint-Laurent-du-Maroni (centre de la commune, 4,9478 ; -54,0105, à 61 km d'Albina pour un bac de 2 km) et Moorea
// (centre de la commune « Moorea-Maiao », -17,506 ; -149,9179, 38,8 km de Papeete pour une traversée de 20 km, quai de
// Vaiare sur l'autre côte de l'île). Liste complète des ports trop éloignés de l'autre rive : tests/data.test.js
// (PORTS_FAR_OK), à recaler dès qu'un quai OpenStreetMap est relevé (champ quays ci-dessous).
module.exports = {
 "routes": [
  {
   "key": "hokkaido|okushiri",
   "source": "https://heartlandferry.jp/faretable/okushiri-route/ (Esashi ↔ Okushiri, Heart Land Ferry)",
   "ports": {
    "hokkaido": [
     {
      "cc": "JP",
      "place": "Esashi",
      "near": [
       41.86,
       140.13
      ],
      "quay": {
       "osm": "way/330655432",
       "lat": 41.8681231,
       "lon": 140.1232704
      }
     }
    ],
    "okushiri": [
     {
      "cc": "JP",
      "name": "Okushiri",
      "quay": {
       "osm": "way/330666288",
       "lat": 42.17467,
       "lon": 139.51729
      }
     }
    ]
   },
   "notes": {
    "Esashi": "extrémité côté Esashi de la route=ferry « 江差 ー 奥尻島 » (nœud 3376474613), 0,7 km du lieu ; near nécessaire (homonyme Esashi à 44.94, 142.58)",
    "Okushiri": "ferry_terminal « 奥尻港フェリーターミナル » (centre de l'élément way), extrémité de la même route=ferry à 0,1 km"
   }
  },
  {
   "key": "northAmerica|tatitlek",
   "source": "https://dot.alaska.gov/amhs/route.shtml (Valdez ↔ Tatitlek, Alaska Marine Highway System)",
   "ports": {
    "northAmerica": [
     {
      "cc": "US",
      "name": "Valdez",
      "quay": {
       "osm": "node/654413167",
       "lat": 61.1238563,
       "lon": -146.3656896
      },
      "sideNote": "Valdez est sur le continent, reliée par la Richardson Highway ; les lieux d'Alaska proches sont classés en lieux isolés et aucun lieu continental des données n'est à moins de 100 km."
     }
    ],
    "tatitlek": [
     {
      "cc": "US",
      "place": "Tatitlek",
      "quay": {
       "osm": "node/4493584403",
       "lat": 60.8639413,
       "lon": -146.682928
      }
     }
    ]
   },
   "notes": {
    "Valdez": "ferry_terminal « Valdez Ferry Terminal » (Alaska Marine Highway), extrémité de la route=ferry « Alaska Marine Highway - Valdez-Tatitlek » (way/196829041)",
    "Tatitlek": "ferry_terminal « Alaska Marine Highway - Tatitlek », autre extrémité de la même route=ferry ; 0,3 km du lieu"
   }
  }
 ],
 "remove": [
  {
   "key": "continental|corsica",
   "side": "corsica",
   "place": "Calvi",
   "reason": "Aucune ligne 2026 : absent des ports Corsica Linea (Balagne desservie via L'Île-Rousse) et des traversées Corsica Ferries ; netferry et directferries n'indiquent aucun départ de Calvi."
  },
  {
   "key": "continental|sicily",
   "side": "continental",
   "place": "Reggio Calabria",
   "reason": "Pas de ligne pour véhicules Reggio Calabria ↔ Messina en 2026 : seulement des navettes rapides passagers (Blu Jet, Liberty Lines) ; les ferries voitures (Caronte & Tourist, Bluferries) partent de Villa San Giovanni."
  }
 ],
 "add": [
  {
   "key": "continental|corsica",
   "side": "continental",
   "port": {
    "cc": "FR",
    "place": "Sète"
   },
   "source": "https://www.corsica-ferries.co.uk/cheap-fare/sete.html (Corsica Ferries Sète ↔ Ajaccio et Sète ↔ L'Île-Rousse, avr.-oct. 2026)"
  },
  {
   "key": "continental|corsica",
   "side": "continental",
   "port": {
    "cc": "IT",
    "place": "Civitavecchia",
    "near": [
     42.09,
     11.8
    ]
   },
   "source": "https://www.ferryhopper.com/en/ferries/france/corsica (Cors'Express Civitavecchia ↔ Bastia, oct.-nov., marginal)"
  },
  {
   "key": "balearic|continental",
   "side": "continental",
   "port": {
    "cc": "FR",
    "place": "Toulon"
   },
   "source": "https://www.ferryhopper.com/en/ferries/spain/mallorca (Corsica Ferries Toulon ↔ Alcúdia, avr.-nov.)"
  },
  {
   "key": "balearic|continental",
   "side": "continental",
   "port": {
    "cc": "FR",
    "place": "Sète"
   },
   "source": "https://www.ferryhopper.com/en/ferries/spain/mallorca (Corsica Ferries Sète ↔ Alcúdia, saisonnier)"
  },
  {
   "key": "continental|sardinia",
   "side": "continental",
   "port": {
    "cc": "FR",
    "place": "Sète"
   },
   "source": "https://www.corsica-ferries.co.uk/cheap-fare/sete.html (Corsica Ferries Sète ↔ Porto Torres, nouvelle ligne 2026, avr.-oct.)"
  },
  {
   "key": "continental|greatBritain",
   "side": "continental",
   "port": {
    "cc": "NL",
    "place": "Rotterdam"
   },
   "source": "https://www.poferries.com/en/routes (P&O Hull ↔ Rotterdam Europoort, quotidien ; port approché par la ville de Rotterdam)"
  },
  {
   "key": "aland|continental",
   "side": "continental",
   "port": {
    "cc": "EE",
    "place": "Tallinn"
   },
   "source": "https://www.tallink.com/travelling/one-way (Tallink Tallinn ↔ Stockholm avec escale à Mariehamn)"
  }
 ],
 "quays": [
  {
   "key": "continental|sardinia",
   "side": "sardinia",
   "place": "Cagliari",
   "quay": {
    "osm": "way/38555015",
    "lat": 39.2102323,
    "lon": 9.1073338
   },
   "note": "extrémité de la route=ferry « Civitavecchia - Cagliari » (nœud 1849046995, commun aux lignes Napoli/Palermo/Arbatax), port de Cagliari ; 2,5 km du centre de la localité"
  },
  {
   "key": "greatBritain|ireland",
   "side": "ireland",
   "place": "Larne",
   "quay": {
    "osm": "way/481313220",
    "lat": 54.8464487,
    "lon": -5.7975298
   },
   "note": "extrémité de la route=ferry Cairnryan – Larne (nœud 621883326), port de Larne ; 1,3 km du centre de la localité"
  },
  {
   "key": "continental|ssese",
   "side": "ssese",
   "place": "Beta",
   "quay": {
    "osm": "node/4721772540",
    "lat": -0.2470971,
    "lon": 32.0666704
   },
   "note": "ferry_terminal de Luku (sans nom ; extrémité de la route=ferry « Ssese Masaka Ferry » way/48078180 vers Bukakata) ; 9,5 km du centre de la localité"
  },
  {
   "key": "bantayan|cebu",
   "side": "bantayan",
   "place": "Santa Fe",
   "quay": {
    "osm": "way/36103119",
    "lat": 11.1661541,
    "lon": 123.807992
   },
   "note": "extrémité de la route=ferry « Hagnaya - Santa Fe » (nœud 598494678), port de Santa Fe ; 1,3 km du centre de la localité"
  },
  {
   "key": "bangka|belitung",
   "side": "belitung",
   "place": "Pangkalandudat",
   "quay": {
    "osm": "node/5784936893",
    "lat": -2.93671,
    "lon": 107.5297
   },
   "note": "ferry_terminal « Tanjung Rhu » (Pelabuhan Tanjung Ru, ligne Sadai – Tanjung Ru) ; 13,6 km du centre de la localité"
  },
  {
   "key": "ireland|isleOfMan",
   "side": "ireland",
   "place": "Larne",
   "quay": {
    "osm": "way/399048768",
    "lat": 54.8481091,
    "lon": -5.7968556
   },
   "note": "extrémité de la route=ferry « Larne - Isle of Man » (nœud 3204626407), port de Larne ; 1,3 km du centre de la localité"
  },
  {
   "key": "sardinia|sicily",
   "side": "sardinia",
   "place": "Cagliari",
   "quay": {
    "osm": "way/176323421",
    "lat": 39.2102323,
    "lon": 9.1073338
   },
   "note": "extrémité de la route=ferry « Cagliari - Palermo » (nœud 1849046995), port de Cagliari ; 2,5 km du centre de la localité"
  },
  {
   "key": "australia|moreton",
   "side": "moreton",
   "place": "Tangalooma",
   "quay": {
    "osm": "way/30977995",
    "lat": -27.1608913,
    "lon": 153.3699366
   },
   "note": "extrémité de la route=ferry « MICAT, Brisbane - Moreton Island » (nœud 14099876), plage de débarquement de la barge aux épaves de Tangalooma ; 2,1 km du centre de la localité"
  },
  {
   "key": "australia|kgari",
   "side": "kgari",
   "place": "Eurong",
   "quay": {
    "osm": "node/2037521194",
    "lat": -25.7961004,
    "lon": 153.0488995
   },
   "note": "ferry_terminal « Hook Point Ferry » (barge Inskip Point – Hook Point, route=ferry way/193860294) ; 32,8 km du centre de la localité"
  },
  {
   "key": "australia|curtisIsland",
   "side": "curtisIsland",
   "place": "Southend",
   "quay": {
    "osm": "way/558930935",
    "lat": -23.7618704,
    "lon": 151.3138404
   },
   "note": "extrémité côté île de la route=ferry Gladstone – South End (nœud 5391219687), rampe de South End ; 0,7 km du centre de la localité"
  },
  {
   "key": "durville|southIsland",
   "side": "southIsland",
   "place": "Hamilton Bay",
   "quay": {
    "osm": "way/622948641",
    "lat": -40.9258734,
    "lon": 173.8432074
   },
   "note": "extrémité côté French Pass de la route=ferry « d'Urville Island to French Pass Barge Crossing » (nœud 1115190061) ; 6,4 km du centre de la localité"
  },
  {
   "key": "vanuaLevu|vitiLevu",
   "side": "vanuaLevu",
   "place": "Nabouwalu",
   "quay": {
    "osm": "way/921708259",
    "lat": -16.9935032,
    "lon": 178.6852941
   },
   "note": "extrémité côté Nabouwalu de la route=ferry « Natovi – Nabouwalu » (nœud 8557156935) ; 0,7 km du centre de la localité"
  },
  {
   "key": "vanuaLevu|vitiLevu",
   "side": "vitiLevu",
   "place": "Natovi",
   "quay": {
    "osm": "way/921708259",
    "lat": -17.6752716,
    "lon": 178.5868748
   },
   "note": "extrémité côté Natovi de la route=ferry « Natovi – Nabouwalu » (nœud 8557156920) ; 2,3 km du centre de la localité"
  },
  {
   "key": "ovalau|vitiLevu",
   "side": "ovalau",
   "place": "Buresala Settlement",
   "quay": {
    "osm": "node/1844836541",
    "lat": -17.684247,
    "lon": 178.7415774
   },
   "note": "quai « Buresala Landing » (man_made=pier) ; 0,7 km du centre de la localité"
  },
  {
   "key": "ovalau|vitiLevu",
   "side": "vitiLevu",
   "place": "Natovi",
   "quay": {
    "osm": "way/921708259",
    "lat": -17.6752716,
    "lon": 178.5868748
   },
   "note": "débarcadère de Natovi : extrémité de la route=ferry « Natovi – Nabouwalu » (nœud 8557156920), même quai que la ligne vers Buresala (non tracée dans OSM) ; 2,3 km du centre de la localité"
  },
  {
   "key": "grandeTerreNC|ileDesPins",
   "side": "ileDesPins",
   "place": "L'Île-des-Pins",
   "quay": {
    "osm": "way/76192579",
    "lat": -22.6606004,
    "lon": 167.4375873
   },
   "note": "« Quai de Kuto » (man_made=pier, centre de l'élément), escale du Betico ; 6,6 km du centre de la localité"
  },
  {
   "key": "grandeTerreNC|mare",
   "side": "mare",
   "place": "Maré",
   "quay": {
    "osm": "node/528563510",
    "lat": -21.54767,
    "lon": 167.87686
   },
   "note": "ferry_terminal « Port de Tadine » ; 17,4 km du centre de la localité"
  },
  {
   "key": "grandeTerreNC|lifou",
   "side": "lifou",
   "place": "Lifou",
   "quay": {
    "osm": "node/1934777257",
    "lat": -20.9174511,
    "lon": 167.2791024
   },
   "note": "nœud nommé « Port de Wé - Lifou » (aucun ferry_terminal ni route=ferry) ; 11,3 km du centre de la localité"
  },
  {
   "key": "lifou|mare",
   "side": "lifou",
   "place": "Lifou",
   "quay": {
    "osm": "node/1934777257",
    "lat": -20.9174511,
    "lon": 167.2791024
   },
   "note": "nœud nommé « Port de Wé - Lifou » (aucun ferry_terminal ni route=ferry) ; 11,3 km du centre de la localité"
  },
  {
   "key": "lifou|mare",
   "side": "mare",
   "place": "Maré",
   "quay": {
    "osm": "node/528563510",
    "lat": -21.54767,
    "lon": 167.87686
   },
   "note": "ferry_terminal « Port de Tadine » ; 17,4 km du centre de la localité"
  },
  {
   "key": "greatBritain|uist",
   "side": "uist",
   "place": "Lochmaddy",
   "quay": {
    "osm": "way/256623173",
    "lat": 57.5964758,
    "lon": -7.1573919
   },
   "note": "extrémité de la route=ferry « Uig - Lochmaddy » (nœud 12995850188), terminal CalMac de Lochmaddy ; 1,6 km du centre de la localité"
  },
  {
   "key": "iceland|vestmannaeyjar",
   "side": "iceland",
   "place": "Hvolsvöllur",
   "quay": {
    "osm": "node/868280054",
    "lat": 63.5309,
    "lon": -20.11699
   },
   "note": "ferry_terminal « Landeyjahöfn » ; 25,0 km du centre de la localité"
  },
  {
   "key": "continental|endelave",
   "side": "endelave",
   "place": "Endelave By",
   "quay": {
    "osm": "way/29243611",
    "lat": 55.7621971,
    "lon": 10.2727035
   },
   "note": "extrémité côté île de la route=ferry « Endelave Færgen » (nœud 321633971), havn d'Endelave ; 0,6 km du centre de la localité"
  },
  {
   "key": "continental|hiiumaa",
   "side": "hiiumaa",
   "place": "Heltermaa",
   "quay": {
    "osm": "way/26206863",
    "lat": 58.8663359,
    "lon": 23.0480103
   },
   "note": "extrémité de la route=ferry « Rohuküla — Heltermaa » (nœud 620890716), port de Heltermaa ; 0,3 km du centre de la localité"
  },
  {
   "key": "hiiumaa|saaremaa",
   "side": "hiiumaa",
   "place": "Sõru",
   "quay": {
    "osm": "way/38742332",
    "lat": 58.6911913,
    "lon": 22.5217677
   },
   "note": "extrémité de la route=ferry « Triigi-Sõru » (nœud 459386293), port de Sõru ; 0,6 km du centre de la localité"
  },
  {
   "key": "continental|vormsi",
   "side": "vormsi",
   "place": "Sviby",
   "quay": {
    "osm": "way/68552906",
    "lat": 58.9704613,
    "lon": 23.3126921
   },
   "note": "extrémité de la route=ferry « Rohuküla — Sviby » (nœud 824303384), port de Sviby ; 1,8 km du centre de la localité"
  },
  {
   "key": "abruka|saaremaa",
   "side": "abruka",
   "place": "Abruka",
   "quay": {
    "osm": "way/38303661",
    "lat": 58.1625326,
    "lon": 22.5269411
   },
   "note": "extrémité côté Abruka de la route=ferry « Roomasaare-Abruka » (nœud 13657344831) ; 0,9 km du centre de la localité"
  },
  {
   "key": "abruka|saaremaa",
   "side": "saaremaa",
   "place": "Roomassaare",
   "quay": {
    "osm": "way/38303661",
    "lat": 58.2174877,
    "lon": 22.5047203
   },
   "note": "extrémité côté Roomassaare de la route=ferry « Roomasaare-Abruka » (nœud 2663740411) ; 1,5 km du centre de la localité"
  },
  {
   "key": "continental|rebbenesoya",
   "side": "continental",
   "place": "Hornet",
   "quay": {
    "osm": "node/6283927874",
    "lat": 70.0565775,
    "lon": 19.0320554
   },
   "note": "ferry_terminal « Mariagården ferjekai » (Mikkelvik), départ de la route=ferry « Mariagården - Bromnes » (way/62140259) ; 15,4 km du centre de la localité"
  },
  {
   "key": "continental|olkhon",
   "side": "continental",
   "place": "Shida",
   "quay": {
    "osm": "node/648761618",
    "lat": 53.0189451,
    "lon": 106.9004221
   },
   "note": "ferry_terminal « МРС » (Sakhiurta), départ de la route=ferry « МРС – остров Ольхон » ; 9,1 km du centre de la localité"
  },
  {
   "key": "miquelon|saintPierre",
   "side": "miquelon",
   "place": "Miquelon-Langlade",
   "quay": {
    "osm": "node/11697182293",
    "lat": 47.1018696,
    "lon": -56.3751866
   },
   "note": "ferry_terminal « Miquelon » (SPM Ferries), extrémité de la route=ferry « Saint-Pierre - Miquelon » ; 14,8 km du centre de la localité"
  },
  {
   "key": "bangka|sumatra",
   "side": "sumatra",
   "place": "Karanganyar",
   "quay": {
    "osm": "node/5258492967",
    "lat": -2.3699199,
    "lon": 104.8043166
   },
   "note": "ferry_terminal « Tanjung Api-Api », extrémité de la route=ferry « Tanjung Kalian (Muntok) - Tanjung Api-Api » ; 19,3 km du centre de la localité"
  },
  {
   "key": "northAmerica|seldovia",
   "side": "northAmerica",
   "place": "Nikolaevsk",
   "quay": {
    "osm": "node/1240836574",
    "lat": 59.6026368,
    "lon": -151.410216
   },
   "sideNote": "Le terminal AMHS de Homer (Homer Spit) est sur la péninsule de Kenai, reliée au réseau routier (Sterling Highway) ; la boîte continentale d'Alaska commence à 59.7 N.",
   "note": "ferry_terminal « Alaska Marine Highway Terminal - Homer », extrémité de la route=ferry AMHS Homer - Seldovia ; 25,8 km du centre de la localité"
  },
  {
   "key": "kodiak|northAmerica",
   "side": "northAmerica",
   "place": "Nikolaevsk",
   "quay": {
    "osm": "node/1240836574",
    "lat": 59.6026368,
    "lon": -151.410216
   },
   "sideNote": "Le terminal AMHS de Homer (Homer Spit) est sur la péninsule de Kenai, reliée au réseau routier (Sterling Highway) ; la boîte continentale d'Alaska commence à 59.7 N.",
   "note": "ferry_terminal « Alaska Marine Highway Terminal - Homer », extrémité de la route=ferry AMHS Homer - Kodiak ; 25,8 km du centre de la localité"
  },
  {
   "key": "lummiIsland|northAmerica",
   "side": "northAmerica",
   "place": "Lummi",
   "quay": {
    "osm": "node/37169667",
    "lat": 48.73123,
    "lon": -122.6702
   },
   "sideNote": "Gooseberry Point est sur le continent (réserve Lummi, face à l'île) ; la boîte lummiIsland (-122.73/-122.64) déborde sur la pointe.",
   "note": "ferry_terminal « Gooseberry Point » (Whatcom County) ; 8,2 km du centre de la localité"
  },
  {
   "key": "drummondIsland|northAmerica",
   "side": "drummondIsland",
   "place": "Drummond",
   "quay": {
    "osm": "node/184083892",
    "lat": 45.98883,
    "lon": -83.87882
   },
   "sideNote": "Le terminal de Drummond Island est à la pointe ouest de l'île, en face de DeTour Village ; la boîte drummondIsland commence à -83.85.",
   "note": "ferry_terminal « Drummond Island » (EUPTA) ; 11,9 km du centre de la localité"
  },
  {
   "key": "matinicus|northAmerica",
   "side": "matinicus",
   "place": "Matinicus",
   "quay": {
    "osm": "way/220345347",
    "lat": 43.8653038,
    "lon": -68.8850844
   },
   "note": "extrémité côté île de la route=ferry « Rockland - Matinicus » (nœud 2294751829) ; 0,2 km du centre de la localité"
  },
  {
   "key": "fogoIsland|newfoundland",
   "side": "fogoIsland",
   "place": "Seldom-Little Seldom",
   "quay": {
    "osm": "node/1479114339",
    "lat": 49.57161,
    "lon": -54.30102
   },
   "note": "ferry_terminal « Fogo Island » (Man O'War Cove) ; 8,1 km du centre de la localité"
  },
  {
   "key": "fogoIsland|newfoundland",
   "side": "newfoundland",
   "place": "Tims Harbour",
   "quay": {
    "osm": "node/1598423285",
    "lat": 49.5562,
    "lon": -54.47628
   },
   "note": "ferry_terminal « Farewell » ; 11,8 km du centre de la localité"
  },
  {
   "key": "changeIslands|newfoundland",
   "side": "changeIslands",
   "place": "Change Islands",
   "quay": {
    "osm": "node/1479114303",
    "lat": 49.5709,
    "lon": -54.40364
   },
   "sideNote": "Le terminal de Change Islands est à la pointe sud de l'île ; la règle changeIslands (4 km autour de 49.667, -54.415) ne l'atteint pas.",
   "note": "ferry_terminal « Change Islands » ; 10,7 km du centre de la localité"
  },
  {
   "key": "changeIslands|newfoundland",
   "side": "newfoundland",
   "place": "Tims Harbour",
   "quay": {
    "osm": "node/1598423285",
    "lat": 49.5562,
    "lon": -54.47628
   },
   "note": "ferry_terminal « Farewell » ; 11,8 km du centre de la localité"
  },
  {
   "key": "chiloe|southAmerica",
   "side": "chiloe",
   "place": "Ancud",
   "quay": {
    "osm": "node/1143094295",
    "lat": -41.8307425,
    "lon": -73.511737
   },
   "note": "nœud « Chacao isla de Chiloé », extrémité côté Chiloé des route=ferry « Ferry Pargua – Chacao » ; 25,6 km du centre de la localité"
  },
  {
   "key": "chiloe|southAmerica",
   "side": "southAmerica",
   "place": "Guayún",
   "quay": {
    "osm": "node/1476501409",
    "lat": -41.7927842,
    "lon": -73.4589761
   },
   "note": "nœud « Pargua », extrémité côté continent de la route=ferry « Ferry Pargua – Chacao » (way/23252560) ; 23,0 km du centre de la localité"
  },
  {
   "key": "hualaihue|southAmerica",
   "side": "hualaihue",
   "place": "Pata Mai",
   "quay": {
    "osm": "node/180172866",
    "lat": -41.7389678,
    "lon": -72.6469955
   },
   "note": "ferry_terminal « Caleta Puelche », extrémité de la route=ferry « Ferry Caleta La Arena – Caleta Puelche » ; 18,7 km du centre de la localité"
  },
  {
   "key": "southAmerica|villaOHiggins",
   "side": "southAmerica",
   "place": "Rápido Bórquez",
   "quay": {
    "osm": "node/280914750",
    "lat": -47.935166,
    "lon": -73.3234249
   },
   "note": "ferry_terminal « Puerto Yungay », extrémité de la route=ferry « Puerto Yungay – Río Bravo » ; 19,0 km du centre de la localité"
  },
  {
   "key": "southAmerica|tierraDelFuego",
   "side": "southAmerica",
   "place": "Monte Aymond",
   "quay": {
    "osm": "node/632646620",
    "lat": -52.4566991,
    "lon": -69.5457476
   },
   "note": "ferry_terminal « Punta Delgada » (Primera Angostura, Chili), route=ferry « Cruce Ferry Punta Delgada » ; 35,7 km du centre de la localité"
  },
  {
   "key": "southAmerica|tierraDelFuego",
   "side": "tierraDelFuego",
   "place": "Clarencia",
   "quay": {
    "osm": "node/632646610",
    "lat": -52.4945736,
    "lon": -69.5199923
   },
   "sideNote": "Bahía Azul est sur la rive Terre de Feu de la Primera Angostura ; la règle tierraDelFuego (15 km autour de Clarencia) ne l'atteint pas.",
   "note": "ferry_terminal « Bahía Azul » (Primera Angostura), route=ferry « Cruce Ferry Punta Delgada » ; 59,2 km du centre de la localité"
  },
  {
   "key": "guyanaCoast|suriname",
   "side": "suriname",
   "place": "Van Pettenpolder",
   "quay": {
    "osm": "node/29711119",
    "lat": 5.7496831,
    "lon": -57.1361017
   },
   "note": "ferry_terminal « Canawaima Ferry Service » (South Drain), extrémité de la route=ferry « Suriname - Guyana Ferry » ; 25,4 km du centre de la localité"
  },
  {
   "key": "guyanaCoast|southAmerica",
   "side": "guyanaCoast",
   "place": "Attai Village",
   "quay": {
    "osm": "node/373016372",
    "lat": 4.6609061,
    "lon": -58.6768664
   },
   "note": "ferry_terminal rive est (nord) de la route=ferry « Kurupukari Ferry Crossing » (way/33067173) ; 50,2 km du centre de la localité"
  },
  {
   "key": "essequiboCoast|guyanaCoast",
   "side": "essequiboCoast",
   "place": "Adventure",
   "quay": {
    "osm": "node/4052210492",
    "lat": 6.96932,
    "lon": -58.51361
   },
   "sideNote": "Supenaam est sur la côte d'Essequibo (rive ouest de l'estuaire) ; la boîte wakenaam (jusqu'à -58.52) englobe ce quai situé à -58.5136.",
   "note": "ferry_terminal « Supenaam Ferry Stelling » ; 13,2 km du centre de la localité"
  },
  {
   "key": "filicudi|salina",
   "side": "filicudi",
   "place": "Filicudi Porto",
   "quay": {
    "osm": "way/1312671197",
    "lat": 38.5621304,
    "lon": 14.581567
   },
   "note": "extrémité côté Filicudi de la route=ferry « Rinella - Filicudi » (nœud 1828346359) ; 0,6 km du centre de la localité"
  },
  {
   "key": "cachoeiraDoArari|salvaterra",
   "side": "cachoeiraDoArari",
   "place": "Cachoeira do Arari",
   "quay": {
    "osm": "node/94772946",
    "lat": -0.8869438,
    "lon": -48.6664254
   },
   "sideNote": "Rive ouest du rio Camará (bac way/357510999, ~150 m) : côté Cachoeira do Arari ; la boîte de coordonnées de salvaterra englobe les deux rives de ce bac.",
   "note": "ferry_terminal rive ouest de la traversée du rio Camará, ~35 km du centre de Cachoeira do Arari"
  },
  {
   "key": "middleNorthAndaman|southAndaman",
   "side": "southAndaman",
   "place": "Wrightmyo",
   "quay": {
    "osm": "node/293687025",
    "lat": 12.15989,
    "lon": 92.75571
   },
   "sideNote": "Jetée sud de Middle Strait (South Andaman), face à Nilambur (Baratang, node/293687055 à 1,2 km) ; la règle de middleNorthAndaman déborde sur la pointe nord de South Andaman.",
   "note": "ferry_terminal « Middle Strait Ferry » rive sud, ~42 km de Wrightmyo"
  },
  {
   "key": "continental|nagu",
   "side": "continental",
   "place": "Lillmälö",
   "quay": {
    "osm": "node/9455528254",
    "lat": 60.23572,
    "lon": 22.11266
   },
   "note": "ferry_terminal « Lillmälö (Pargas) », Finferries"
  },
  {
   "key": "continental|nagu",
   "side": "nagu",
   "place": "Nagu",
   "quay": {
    "osm": "node/9455528255",
    "lat": 60.22237,
    "lon": 22.098
   },
   "sideNote": "Prostvik est sur Nagu (terminal Finferries « Prostvik (Nagu) ») ; la règle de nagu, par codes postaux et boîte, laisse ce quai côté continent.",
   "note": "ferry_terminal « Prostvik (Nagu) », Finferries : le bac accoste à Prostvik, pas au port de Nagu (14 km)"
  },
  {
   "key": "arno|continental",
   "side": "arno",
   "place": "Strandby",
   "quay": {
    "osm": "node/434534265",
    "lat": 59.49827,
    "lon": 17.15922
   },
   "sideNote": "Terminal « Arnö » de l'Arnöleden, sur l'île (le terminal Oknö lui fait face à 700 m) ; la boîte de arno ne descend pas jusqu'au quai.",
   "note": "ferry_terminal « Arnö » (Arnöleden)"
  },
  {
   "key": "arno|continental",
   "side": "continental",
   "place": "Dalby",
   "quay": {
    "osm": "node/434534278",
    "lat": 59.4998,
    "lon": 17.14671
   },
   "note": "ferry_terminal « Oknö » (Arnöleden), 6,7 km de Dalby"
  },
  {
   "key": "continental|olkhon",
   "side": "olkhon",
   "place": "Yelga",
   "quay": {
    "osm": "node/648761645",
    "lat": 53.02294,
    "lon": 106.93071
   },
   "note": "ferry_terminal « остров Ольхон », en face de МРС (Sakhiurta), ~20 km de Yelga"
  }
 ],
 "pairs": {
  // 14e audit du 19/09/2026 — Le Pirée ↔ Póros : la rive continentale porte aussi Galatás (0,5 km de Póros), port du bac
  // Galatás ↔ Póros. Sans paires, un trajet depuis le Péloponnèse partait de Galatás avec la durée (2 h 30) et la grille
  // Saronic Ferries (35 €) de la ligne du Pirée, pour une traversée de quelques minutes. Aucune durée ni aucun prix
  // sourcés de ce bac dans le dépôt (seule mention : greeka.com, citée par ports-lot1.js, sans horaire ni tarif relevés) :
  // il ne peut pas devenir une liaison propre (clé continental|poros déjà prise, un seul jeu de durée et de prix par
  // clé). Galatás reste listé (port réel) mais n'est jamais apparié ; limite : le trajet par Galatás n'est pas proposé.
  "continental|poros": {
   "pairs": [
    [
     "Peiraiás",
     "Póros"
    ]
   ],
   "sources": [
    "https://www.sf.gr/en/fares (Saronic Ferries, Le Pirée–Póros, grille reprise dans trip-data.js)"
   ]
  },
  "continental|corsica": {
   "pairs": [
    [
     "Marseille",
     "Ajaccio"
    ],
    [
     "Marseille",
     "Bastia"
    ],
    [
     "Marseille",
     "L'Île-Rousse"
    ],
    [
     "Marseille",
     "Porto-Vecchio"
    ],
    [
     "Marseille",
     "Propriano"
    ],
    [
     "Toulon",
     "Ajaccio"
    ],
    [
     "Toulon",
     "Bastia"
    ],
    [
     "Toulon",
     "L'Île-Rousse"
    ],
    [
     "Toulon",
     "Porto-Vecchio"
    ],
    [
     "Toulon",
     "Propriano"
    ],
    [
     "Nice",
     "Ajaccio"
    ],
    [
     "Nice",
     "Bastia"
    ],
    [
     "Nice",
     "L'Île-Rousse"
    ],
    [
     "Nice",
     "Porto-Vecchio"
    ],
    [
     "Nice",
     "Propriano"
    ],
    [
     "Savona",
     "Bastia"
    ],
    [
     "Savona",
     "L'Île-Rousse"
    ],
    [
     "Genova",
     "Bastia"
    ],
    [
     "Livorno",
     "Bastia"
    ],
    [
     "Livorno",
     "L'Île-Rousse"
    ],
    [
     "Piombino",
     "Bastia"
    ],
    [
     "Sète",
     "Ajaccio"
    ],
    [
     "Sète",
     "L'Île-Rousse"
    ],
    [
     "Civitavecchia",
     "Bastia"
    ]
   ],
   "sources": [
    "https://www.corsicalinea.com/preparer-votre-voyage/les-ports",
    "https://www.lameridionale.fr/fr",
    "https://www.corsica-ferries.co.uk/crossing/corsica-ferry/",
    "https://www.mobylines.com/",
    "https://www.ferryhopper.com/en/ferries/france/corsica",
    "https://ulysse.com/news/corsica-ferries-marseille-ajaccio-monopole"
   ]
  },
  "balearic|continental": {
   "pairs": [
    [
     "Palma",
     "Barcelona"
    ],
    [
     "Palma",
     "Valencia"
    ],
    [
     "Palma",
     "Denia"
    ],
    [
     "Alcúdia",
     "Barcelona"
    ],
    [
     "Alcúdia",
     "Toulon"
    ],
    [
     "Alcúdia",
     "Sète"
    ]
   ],
   "sources": [
    "https://www.ferryhopper.com/en/ferries/spain/mallorca",
    "https://www.balearia.com/en/routes-timetables/ferry-barcelona-mallorca",
    "https://www.trasmed.com"
   ]
  },
  "continental|sardinia": {
   "pairs": [
    [
     "Genova",
     "Olbia"
    ],
    [
     "Genova",
     "Porto Torres"
    ],
    [
     "Genova",
     "Golfo Aranci"
    ],
    [
     "Livorno",
     "Olbia"
    ],
    [
     "Livorno",
     "Golfo Aranci"
    ],
    [
     "Piombino",
     "Olbia"
    ],
    [
     "Piombino",
     "Golfo Aranci"
    ],
    [
     "Civitavecchia",
     "Olbia"
    ],
    [
     "Civitavecchia",
     "Porto Torres"
    ],
    [
     "Civitavecchia",
     "Cagliari"
    ],
    [
     "Civitavecchia",
     "Arbatax"
    ],
    [
     "Napoli",
     "Cagliari"
    ],
    [
     "Toulon",
     "Porto Torres"
    ],
    [
     "Toulon",
     "Golfo Aranci"
    ],
    [
     "Nice",
     "Porto Torres"
    ],
    [
     "Nice",
     "Golfo Aranci"
    ],
    [
     "Barcelona",
     "Porto Torres"
    ],
    [
     "Sète",
     "Porto Torres"
    ]
   ],
   "sources": [
    "https://www.ferryhopper.com/en/ferries/italy/sardinia",
    "https://www.mobylines.com/",
    "https://www.corsica-ferries.co.uk/crossing/sardinia-ferry/",
    "https://sardinias.fr/ferry/marseille-porto-torres"
   ]
  },
  "continental|sicily": {
   "pairs": [
    [
     "Villa San Giovanni",
     "Messina"
    ],
    [
     "Salerno",
     "Messina"
    ],
    [
     "Salerno",
     "Palermo"
    ],
    [
     "Napoli",
     "Palermo"
    ],
    [
     "Napoli",
     "Termini Imerese"
    ],
    [
     "Civitavecchia",
     "Palermo"
    ],
    [
     "Civitavecchia",
     "Termini Imerese"
    ],
    [
     "Genova",
     "Palermo"
    ],
    [
     "Genova",
     "Termini Imerese"
    ],
    [
     "Livorno",
     "Palermo"
    ]
   ],
   "sources": [
    "https://www.ferryhopper.com/en/ferries/italy/sicily",
    "https://www.gnv.it/en/ferries-destinations/sicily",
    "https://www.carontetourist.it/en/strait-messina/timetables",
    "https://www.ferryhopper.com/en/ferry-routes/direct/salerno-messina",
    "https://www.bluferries.it/"
   ]
  },
  "continental|cres": {
   "pairs": [
    [
     "Zagorje",
     "Porozina"
    ],
    [
     "Pinezići",
     "Merag"
    ]
   ],
   "sources": [
    "https://www.jadrolinija.hr/en/travel/brestova_-_porozina_cres",
    "https://www.jadrolinija.hr/en/travel/valbiska_krk_-_merag_cres"
   ]
  },
  "continental|rab": {
   "pairs": [
    [
     "Stinica",
     "Barbat"
    ],
    [
     "Pinezići",
     "Lopar"
    ]
   ],
   "sources": [
    "https://www.jadrolinija.hr/en/travel/valbiska_krk_-_lopar_rab",
    "https://www.rapska-plovidba.hr"
   ]
  },
  "brac|continental": {
   "pairs": [
    [
     "Supetar",
     "Split"
    ],
    [
     "Sumartin",
     "Makarska"
    ]
   ],
   "sources": [
    "https://www.jadrolinija.hr/hr/putovanje/split_-_supetar_brac",
    "https://www.jadrolinija.hr/en/travel/sumartin_brac_-_makarska"
   ]
  },
  "continental|hvar": {
   "pairs": [
    [
     "Split",
     "Stari Grad"
    ],
    [
     "Drvenik",
     "Sućuraj"
    ]
   ],
   "sources": [
    "https://www.jadrolinija.hr/en/travels",
    "https://www.jadrolinija.hr/en/travel/drvenik_-_sucuraj_hvar"
   ]
  },
  "continental|korcula": {
   "pairs": [
    [
     "Orebić",
     "Korčula"
    ],
    [
     "Split",
     "Vela Luka"
    ]
   ],
   "sources": [
    "https://www.jadrolinija.hr/en/travels",
    "https://www.jadrolinija.hr/hr/putovanje/split_-vela_luka_korcula_-_ubli_lastovo"
   ]
  },
  "continental|greatBritain": {
   "pairs": [
    [
     "Calais",
     "Dover"
    ],
    [
     "Dunkerque",
     "Dover"
    ],
    [
     "Dieppe",
     "Newhaven"
    ],
    [
     "Le Havre",
     "Portsmouth"
    ],
    [
     "Ouistreham",
     "Portsmouth"
    ],
    [
     "Cherbourg-en-Cotentin",
     "Portsmouth"
    ],
    [
     "Cherbourg-en-Cotentin",
     "Poole"
    ],
    [
     "Saint-Malo",
     "Portsmouth"
    ],
    [
     "Saint-Malo",
     "Poole"
    ],
    [
     "Roscoff",
     "Plymouth"
    ],
    [
     "Santander",
     "Portsmouth"
    ],
    [
     "Santander",
     "Plymouth"
    ],
    [
     "Bilbao",
     "Portsmouth"
    ],
    [
     "Hoek van Holland",
     "Harwich"
    ],
    [
     "IJmuiden",
     "North Shields"
    ],
    [
     "Rotterdam",
     "Kingston upon Hull"
    ]
   ],
   "sources": [
    "https://www.dfds.com/en/passenger-ferries/ferry-crossings/ferries-to-uk",
    "https://www.poferries.com/en/routes",
    "https://www.brittany-ferries.co.uk/ferry-routes/planning/timetables",
    "https://brittanyferriesnewsroom.com/go-west-in-26-for-more-ships-more-choice-and-more-comfort-on-the-channel/",
    "https://www.condorferries.co.uk/ferry-routes-ports",
    "https://www.stenaline.co.uk/routes/harwich-hook-of-holland",
    "https://www.irishferries.com"
   ]
  },
  "greatBritain|ireland": {
   "pairs": [
    [
     "Holyhead",
     "Dublin"
    ],
    [
     "Fishguard",
     "Rosslare"
    ],
    [
     "Pembroke Dock",
     "Rosslare"
    ],
    [
     "Liverpool",
     "Dublin"
    ],
    [
     "Birkenhead",
     "Belfast"
    ],
    [
     "Cairnryan",
     "Belfast"
    ],
    [
     "Cairnryan",
     "Larne"
    ]
   ],
   "sources": [
    "https://www.stenaline.co.uk/routes",
    "https://www.irishferries.com",
    "https://www.poferries.com/en/routes"
   ]
  },
  "aland|continental": {
   "pairs": [
    [
     "Mariehamn",
     "Stockholm"
    ],
    [
     "Mariehamn",
     "Helsinki"
    ],
    [
     "Mariehamn",
     "Turku"
    ],
    [
     "Långnäs hamn",
     "Turku"
    ],
    [
     "Långnäs hamn",
     "Stockholm"
    ],
    [
     "Långnäs hamn",
     "Naantali"
    ],
    [
     "Långnäs hamn",
     "Kapellskär"
    ],
    [
     "Eckerö",
     "Grisslehamn"
    ],
    [
     "Mariehamn",
     "Tallinn"
    ]
   ],
   "sources": [
    "https://www.sales.vikingline.com/find-trip/timetable/stockholm-turku/",
    "https://www.sales.vikingline.com/find-trip/timetable/stockholm-helsinki/",
    "https://www.tallink.com/travelling/one-way",
    "https://www.finnlines.com/routes/naantali-kapellskar/",
    "https://www.eckerolinjen.ax",
    "https://www.shippax.com/en/news/setback-for-the-re-establishment-of-the-kapellskarmariehamn-route.aspx"
   ]
  },
  "continental|crete": {
   "pairs": [
    [
     "Peiraiás",
     "Irákleion"
    ],
    [
     "Peiraiás",
     "Soúda"
    ],
    [
     "Peiraiás",
     "Rethymno"
    ],
    [
     "Peiraiás",
     "Sitia"
    ],
    [
     "Peiraiás",
     "Kíssamos"
    ],
    [
     "Gýtheio",
     "Kíssamos"
    ]
   ],
   "sources": [
    "https://www.ferryhopper.com/en/ferries/greece/crete"
   ]
  },
  // 14e audit du 19/09/2026 — paire Vasilikí (Leucade) ↔ Fiskárdo (Céphalonie) retirée : traversée de ~19 km d'orthodromie à
  // laquelle s'appliquaient la durée et la grille de la ligne de Patras (liaison de ~100 km), même défaut que Galatás ↔
  // Póros (voir continental|poros). Aucune durée ni aucun prix de cette traversée dans le dépôt : Vasilikí reste listé,
  // jamais apparié ; limite : le trajet par Leucade n'est pas proposé.
  "continental|kefalonia": {
   "pairs": [
    [
     "Kyllíni",
     "Póros"
    ],
    [
     "Kyllíni",
     "Sámi"
    ],
    [
     "Pátra",
     "Sámi"
    ],
    [
     "Astakós",
     "Sámi"
    ]
   ],
   "sources": [
    "https://www.ferryhopper.com/en/ferries/greece/kefalonia"
   ]
  },
  // 14e audit du 19/09/2026 — paire Vasilikí (Leucade) ↔ Fríkes (Ithaque) retirée : traversée de ~19 km d'orthodromie à
  // laquelle s'appliquaient la durée et la grille de la ligne de Patras (liaison de ~100 km), même défaut que Galatás ↔
  // Póros (voir continental|poros). Aucune durée ni aucun prix de cette traversée dans le dépôt : Vasilikí reste listé,
  // jamais apparié ; limite : le trajet par Leucade n'est pas proposé.
  "continental|ithaca": {
   "pairs": [
    [
     "Pátra",
     "Aetós"
    ],
    [
     "Astakós",
     "Aetós"
    ],
    [
     "Astakós",
     "Fríkes"
    ]
   ],
   "sources": [
    "https://www.ferryhopper.com/en/ferries/greece/ithaki"
   ]
  },
  "continental|samos": {
   "pairs": [
    [
     "Peiraiás",
     "Vathý"
    ],
    [
     "Peiraiás",
     "Néon Karlovásion"
    ],
    [
     "Kavála",
     "Vathý"
    ],
    [
     "Kavála",
     "Néon Karlovásion"
    ],
    [
     "Thessaloníki",
     "Vathý"
    ],
    [
     "Thessaloníki",
     "Néon Karlovásion"
    ]
   ],
   "sources": [
    "https://www.ferryhopper.com/en/ferries/greece/samos"
   ]
  },
  "continental|ikaria": {
   "pairs": [
    [
     "Peiraiás",
     "Agios Kirykos"
    ],
    [
     "Peiraiás",
     "Évdilos"
    ],
    [
     "Kavála",
     "Agios Kirykos"
    ],
    [
     "Kavála",
     "Évdilos"
    ],
    [
     "Thessaloníki",
     "Évdilos"
    ],
    [
     "Thessaloníki",
     "Agios Kirykos"
    ]
   ],
   "sources": [
    "https://www.ferryhopper.com/en/ferries/greece/ikaria"
   ]
  },
  "continental|skopelos": {
   "pairs": [
    [
     "Vólos",
     "Skópelos"
    ],
    [
     "Vólos",
     "Glóssa"
    ],
    [
     "Kymási",
     "Skópelos"
    ],
    [
     "Kymási",
     "Glóssa"
    ],
    [
     "Thessaloníki",
     "Skópelos"
    ],
    [
     "Thessaloníki",
     "Glóssa"
    ]
   ],
   "sources": [
    "https://www.ferryhopper.com/en/ferries/greece/skopelos"
   ]
  },
  "continental|ombo": {
   "pairs": [
    [
     "Judaberg",
     "Eidssund"
    ],
    [
     "Nesvik",
     "Skor"
    ],
    [
     "Hjelmelandsvågen",
     "Skor"
    ]
   ],
   "sources": [
    "https://havspor.no/en/rute/fogn-judaberg-helgoy",
    "https://www.kolumbus.no/globalassets/ruter/baatruter/1025-fogn-judaberg-helgoy-bilferje.pdf",
    "https://havspor.no/en/stopp/hjelmeland-ferjekai",
    "https://www.visitnorway.no/listings/ferje-hjelmeland-nesvik-i-ryfylke/238496/"
   ]
  }
 }
};
