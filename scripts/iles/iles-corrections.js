// Groupe « corrections » — nouvelles îles hors Europe (CONSIGNE-ILES-EUROPE.md), 16 septembre 2026.
// Vérification des lieux : polygones OSM place=island (Overpass) pour GW, MZ, SN (Saloum : coastline), SL, GN, TN, AE, EG, LY ;
// Nominatim pour RU (Overpass saturé). Aucun lieu dans les données : Kerkennah (TN), Dalma (AE), Chikotan (RU), îles de LY/EG/MA.
// Djerba (TN) : chaussée d'El Kantara → continental (aucune règle). Ilha de Moçambique (MZ) : pont routier → continental (aucune règle).
// Corrections faites directement dans le dépôt : scripts/iles/iles-insulinde.js (Bolok/Semau, Sadai, Liang), iles-sud.js (Ko Phaluai + liaison),
// ferries-asie.js (notes). iles-philippines.js inchangé : aucun lieu de Coron/Busuanga/Culion dans communes-ph.txt.
// Complément du 16 septembre 2026 (soir) : lieux ajoutés aux données — Kerkennah (TN, 16 lieux, exclusion du lot
// Maghreb levée), Dalma (AE, 4 entrées GeoNames : 3 quartiers PPLX et l'île ADM3), Coron/Busuanga/Culion (PH,
// 135 lieux jusqu'ici écartés par des points postaux mal placés) — et masses correspondantes ci-dessous
// (TN, AE, et landmassRules pour PH, placées en tête des règles de iles-philippines.js).
module.exports = {
  "landmassRules": {
    "PH": [
      { "key": "cuyo", "match": { "cpPrefix": ["5318", "5319"] }, "note": "Île de Cuyo : municipalités de Cuyo et de Magsaysay, reliées par la route, sans pont vers Palawan. Lieux jusqu'ici écartés (points postaux mal placés), ajoutés en septembre 2026." },
      { "key": "*", "match": { "cpPrefix": ["5307", "5320", "5321", "5322"] }, "note": "Municipalités insulaires de Palawan sans route vers l'île principale : Balabac (Balabac, Bugsuk), Agutaya, Cagayancillo, Kalayaan — chaque lieu isolé." },
      { "key": "*", "match": { "near": [{ "name": "Cabugao (île de Coron)", "lat": 11.926, "lon": 120.254, "km": 2 }, { "name": "Bangwang Daan (île de Coron)", "lat": 11.954, "lon": 120.266, "km": 2 }] },
        "note": "Île de Coron (Tagbanua) : sans route ni véhicule, chaque village isolé." },
      { "key": "*", "match": { "box": [[11.68, 11.80, 120.13, 120.20]] }, "note": "Îlots du sud de la municipalité de Coron (Bulalacao, Calumbagan, Siniguelas…) : chaque lieu isolé." },
      { "key": "*", "match": { "box": [[12.27, 12.34, 119.85, 119.96]] }, "note": "Île de Calauit et îlots voisins (Kawiren, Cadyes, Minit…) : chaque lieu isolé." },
      { "key": "culion", "match": { "box": [[11.70, 11.985, 119.83, 120.135]] }, "note": "Île de Culion (code 5315) — limite nord approchée par la baie de Gutob ; aucun pont vers Busuanga." },
      { "key": "busuanga", "match": { "box": [[11.985, 12.27, 119.80, 120.36]] }, "note": "Île de Busuanga : municipalités de Busuanga (5317) et de Coron (5316, dont la ville de Coron), reliées par la route." }
    ]
  },
  "landmass": {
    "TN": { "default": "continental", "rules": [
      { "key": "kerkennah", "match": { "box": [[34.55, 34.82, 10.95, 11.35]] }, "note": "Archipel des Kerkennah (Chergui et Gharbi reliées par la chaussée d'El Kantra) ; Djerba, reliée par la chaussée d'El Kantara, reste continentale." }
    ] },
    "AE": { "fallthrough": true, "rules": [
      { "key": "dalma", "match": { "box": [[24.40, 24.56, 52.25, 52.37]] }, "note": "Île de Dalma (Abou Dhabi), sans pont." }
    ] },
    "RU": {
      "fallthrough": true,
      "rules": [
        {
          "key": "olkhon",
          "match": {
            "box": [[53,53.01,106.9341,106.9857],[53.01,53.02,106.9252,107.0066],[53.02,53.03,106.9231,107.044],[53.03,53.04,106.9083,107.07],[53.04,53.05,106.9067,107.1507],[53.05,53.06,106.9176,107.2199],[53.06,53.07,106.898,107.3425],[53.07,53.08,106.9105,107.4123],[53.08,53.09,106.9304,107.4307],[53.09,53.1,106.9448,107.4444],[53.1,53.11,106.962,107.4527],[53.11,53.12,106.9782,107.4706],[53.12,53.13,107.0779,107.4915],[53.13,53.14,107.0998,107.4987],[53.14,53.15,107.1008,107.5215],[53.15,53.16,107.1112,107.5302],[53.16,53.17,107.2054,107.5626],[53.17,53.18,107.2168,107.5737],[53.18,53.19,107.2587,107.5871],[53.19,53.2,107.3202,107.6006],[53.2,53.21,107.3352,107.6316],[53.21,53.22,107.3729,107.6565],[53.22,53.23,107.3906,107.7363],[53.23,53.24,107.4085,107.7433],[53.24,53.25,107.4617,107.7475],[53.25,53.26,107.4837,107.7548],[53.26,53.27,107.4849,107.7588],[53.27,53.28,107.4911,107.7574],[53.28,53.29,107.5384,107.7539],[53.29,53.3,107.5911,107.7535],[53.3,53.31,107.6167,107.7473],[53.31,53.32,107.6339,107.7478],[53.32,53.33,107.6461,107.7525],[53.33,53.34,107.6663,107.7515],[53.34,53.35,107.6749,107.7586],[53.35,53.36,107.6916,107.766],[53.36,53.37,107.6951,107.7737],[53.37,53.38,107.708,107.7863],[53.38,53.39,107.712,107.792],[53.39,53.4,107.7217,107.7957],[53.4,53.41,107.7574,107.7939],[53.41,53.42,107.7841,107.7954]]
          },
          "note": "Olkhon (lac Baïkal) : Yelga, Malyy Khuzhir, Khuzhir, Kharantsy (commune rurale de Khuzhir = l'île, d'après Nominatim) ; Sarma (106,835° E, commune de Shara-Togot) reste continentale. Aucun pont : bac Sakhiurta (MRS) ↔ baie Perevoznaïa Boîtes : bandes de 0,01° de latitude couvrant le contour OpenStreetMap de l'île (relation/2734482, septembre 2026), marge ~300 m — la boîte unique d'avant englobait la rive continentale du détroit (quai de MRS/Sakhiurta)."
        },
        {
          "key": "kunashir",
          "match": {
            "box": [
              [
                43.6,
                44.6,
                145.3,
                146.2
              ]
            ]
          },
          "note": "Kounachir : Ioujno-Kourilsk, Otrada, Golovnino… (codes 694500/694502, dont 6 lieux sans région qui retombaient jusqu'ici sur continental)"
        },
        {
          "key": "iturup",
          "match": {
            "box": [
              [
                44.4,
                45.8,
                146.8,
                148.9
              ]
            ]
          },
          "note": "Itouroup : Kourilsk, Kitovyy, Rybaki, Reydovo (codes 694530-694535)"
        },
        {
          "key": "paramushir",
          "match": {
            "box": [
              [
                50,
                51,
                154.9,
                156.4
              ]
            ]
          },
          "note": "Paramouchir : un seul lieu (Devyatka, district de Severo-Kourilsk)"
        },
        {
          "key": "kizhi",
          "match": {
            "near": [
              {
                "name": "Kizhi",
                "lat": 62.0762,
                "lon": 35.1918,
                "km": 0.45
              },
              {
                "name": "Vasilevo",
                "lat": 62.0842,
                "lon": 35.2055,
                "km": 0.58
              },
              {
                "name": "Yamka",
                "lat": 62.0829,
                "lon": 35.2206,
                "km": 0.97
              },
              {
                "name": "Ersenevo",
                "lat": 62.0781,
                "lon": 35.1895,
                "km": 0.33
              },
              {
                "name": "Boyarshchina",
                "lat": 62.071,
                "lon": 35.1971,
                "km": 0.77
              }
            ]
          },
          "note": "Île de Kizhi (lac Onega) : villages Kizhi, Vasilyevo, Yamka, Ersenevo, Boyarshchina ; aucun pont, accès par hydroglisseur/bateau passagers, pas de véhicules"
        },
        {
          "key": "valaam",
          "match": {
            "near": [
              {
                "name": "Valaam",
                "lat": 61.387,
                "lon": 30.95,
                "km": 3
              },
              {
                "name": "Uusi-Jerusalem",
                "lat": 61.3716,
                "lon": 30.8927,
                "km": 3
              }
            ]
          },
          "note": "Île de Valaam (lac Ladoga) : bateaux passagers depuis Sortavala/Priozersk, pas de transport de véhicules pour le public"
        }
      ]
    },
    "GW": {
      "default": "continental",
      "rules": [
        {
          "key": "bolama",
          "match": {
            "near": [
              {
                "name": "Bolama",
                "lat": 11.5769,
                "lon": -15.4761,
                "km": 1
              }
            ]
          },
          "note": "Île de Bolama (ville de Bolama) : aucun pont, pirogues depuis São João"
        },
        {
          "key": "bubaque",
          "match": {
            "near": [
              {
                "name": "Bubaque",
                "lat": 11.2833,
                "lon": -15.8333,
                "km": 1
              }
            ]
          },
          "note": "Bubaque (archipel des Bijagós) : ferry Bissau–Bubaque passagers/fret, aucun transport de véhicules documenté"
        },
        {
          "key": "*",
          "match": {
            "near": [
              {
                "name": "Caravela",
                "lat": 11.5667,
                "lon": -16.2667,
                "km": 1
              }
            ]
          },
          "note": "Caravela (Bijagós)"
        }
      ]
    },
    "MZ": {
      "default": "continental",
      "rules": [
        {
          "key": "inhaca",
          "match": {
            "box": [
              [
                -26.0614,
                -25.9961,
                32.89,
                32.9697
              ]
            ]
          },
          "note": "Inhaca : aucun pont ; bateaux passagers Kanyaka/Ribwene depuis Maputo, pas de bac véhicules documenté"
        },
        {
          "key": "bazaruto",
          "match": {
            "box": [
              [
                -21.7344,
                -21.5042,
                35.4222,
                35.4903
              ]
            ]
          },
          "note": "Île de Bazaruto (Manuel à -21,6567 : à 0,1 km du polygone OSM, côte ouest)"
        },
        {
          "key": "benguerra",
          "match": {
            "near": [
              {
                "name": "Rafael",
                "lat": -21.8633,
                "lon": 35.4361,
                "km": 1
              },
              {
                "name": "Chefe L. Mazalete",
                "lat": -21.8806,
                "lon": 35.4244,
                "km": 1
              },
              {
                "name": "Mariano",
                "lat": -21.8508,
                "lon": 35.4453,
                "km": 1
              },
              {
                "name": "L.G. Smith",
                "lat": -21.8453,
                "lon": 35.4411,
                "km": 1
              }
            ]
          },
          "note": "Île de Benguerra (Bazaruto)"
        },
        {
          "key": "ibo",
          "match": {
            "near": [
              {
                "name": "Ibo",
                "lat": -12.3426,
                "lon": 40.5859,
                "km": 1
              },
              {
                "name": "Manáua",
                "lat": -12.35,
                "lon": 40.6,
                "km": 1
              },
              {
                "name": "Ibo",
                "lat": -12.3333,
                "lon": 40.5833,
                "km": 1
              }
            ]
          },
          "note": "Île d'Ibo (Quirimbas) : doublon GeoNames « Ibo » à 0,3 km du polygone inclus"
        },
        {
          "key": "quirimba",
          "match": {
            "near": [
              {
                "name": "Quirimba",
                "lat": -12.4089,
                "lon": 40.5992,
                "km": 1
              },
              {
                "name": "Quirimba",
                "lat": -12.4303,
                "lon": 40.6131,
                "km": 1
              }
            ]
          },
          "note": "Île Quirimba (Quirimbas) : chenal de mangrove avec Ibo, pas de pont routier"
        },
        {
          "key": "matemo",
          "match": {
            "near": [
              {
                "name": "Ucaia",
                "lat": -12.2,
                "lon": 40.5667,
                "km": 0.92
              },
              {
                "name": "Namba",
                "lat": -12.2,
                "lon": 40.6,
                "km": 1
              },
              {
                "name": "Mituba",
                "lat": -12.2,
                "lon": 40.6,
                "km": 1
              },
              {
                "name": "Matemo",
                "lat": -12.1947,
                "lon": 40.5978,
                "km": 1
              },
              {
                "name": "Maiôa",
                "lat": -12.1833,
                "lon": 40.5833,
                "km": 1
              },
              {
                "name": "Matúmbi",
                "lat": -12.2167,
                "lon": 40.6167,
                "km": 1
              }
            ]
          },
          "note": "Île de Matemo (Quirimbas) ; Maiôa et Matúmbi (coordonnées arrondies à la minute) à ≤ 0,4 km du polygone"
        },
        {
          "key": "chiloane",
          "match": {
            "near": [
              {
                "name": "Chingune",
                "lat": -20.6208,
                "lon": 34.8914,
                "km": 1
              },
              {
                "name": "Chiloane",
                "lat": -20.6692,
                "lon": 34.9286,
                "km": 1
              },
              {
                "name": "Bue",
                "lat": -20.6375,
                "lon": 34.9089,
                "km": 1
              }
            ]
          },
          "note": "Île de Chiloane (Sofala)"
        },
        {
          "key": "*",
          "match": {
            "near": [
              {
                "name": "Tavari",
                "lat": -12.5333,
                "lon": 40.6,
                "km": 1
              },
              {
                "name": "Nfunvo",
                "lat": -12.5542,
                "lon": 40.5978,
                "km": 1
              },
              {
                "name": "Chefe Alibaiane",
                "lat": -16.3231,
                "lon": 39.8375,
                "km": 1
              },
              {
                "name": "Zefania",
                "lat": -23.8194,
                "lon": 35.4275,
                "km": 1
              },
              {
                "name": "Santa Carolina",
                "lat": -21.6183,
                "lon": 35.3417,
                "km": 1
              },
              {
                "name": "Santa Isabel",
                "lat": -21.9756,
                "lon": 35.4203,
                "km": 1
              }
            ]
          },
          "note": "Petites îles sans pont : Mefunvo (Quirimbas), Santa Carolina et Magaruque (Bazaruto), Ilha dos Ratos (baie d'Inhambane), Ilha de Angoche"
        }
      ]
    },
    "SN": {
      "default": "continental",
      "rules": [
        {
          "key": "*",
          "match": {
            "near": [
              {
                "name": "Gorée",
                "lat": 14.6683,
                "lon": -17.3988,
                "km": 1
              },
              {
                "name": "Niodior",
                "lat": 13.8583,
                "lon": -16.7233,
                "km": 1
              },
              {
                "name": "Dionewar",
                "lat": 13.8879,
                "lon": -16.73,
                "km": 1
              },
              {
                "name": "Falia",
                "lat": 13.9182,
                "lon": -16.6802,
                "km": 1
              },
              {
                "name": "Djirnda",
                "lat": 13.9802,
                "lon": -16.608,
                "km": 0.5
              },
              {
                "name": "Diamniadio",
                "lat": 14.0667,
                "lon": -16.5741,
                "km": 1
              },
              {
                "name": "Moundé",
                "lat": 13.9557,
                "lon": -16.6489,
                "km": 1
              },
              {
                "name": "Baout",
                "lat": 14.0478,
                "lon": -16.5331,
                "km": 0.82
              },
              {
                "name": "Bassoul",
                "lat": 13.9256,
                "lon": -16.5898,
                "km": 1
              },
              {
                "name": "Bassar",
                "lat": 13.9196,
                "lon": -16.608,
                "km": 1
              },
              {
                "name": "Siwo",
                "lat": 13.9078,
                "lon": -16.6536,
                "km": 0.47
              },
              {
                "name": "Mar Lodj",
                "lat": 14.0443,
                "lon": -16.6788,
                "km": 1
              },
              {
                "name": "Mar Soulou",
                "lat": 14.0415,
                "lon": -16.6681,
                "km": 1
              },
              {
                "name": "Diofandor",
                "lat": 13.8259,
                "lon": -16.6108,
                "km": 0.78
              },
              {
                "name": "Gouk",
                "lat": 13.8709,
                "lon": -16.5311,
                "km": 1
              },
              {
                "name": "Djinak Diatako",
                "lat": 13.6019,
                "lon": -16.5409,
                "km": 1
              },
              {
                "name": "Djinak Bara",
                "lat": 13.6011,
                "lon": -16.5489,
                "km": 1
              },
              {
                "name": "Karabane",
                "lat": 12.5567,
                "lon": -16.7003,
                "km": 1
              },
              {
                "name": "Diogué",
                "lat": 12.5744,
                "lon": -16.7525,
                "km": 0.45
              },
              {
                "name": "Boune",
                "lat": 12.7978,
                "lon": -16.765,
                "km": 0.72
              }
            ]
          },
          "note": "Gorée ; îles du Saloum (Gandoul : Niodior, Dionewar, Falia ; commune de Djirnda : Djirnda, Diamniadio, Moundé, Baout ; Bassoul, Bassar, Siwo ; Mar Lodj, Mar Soulou ; Diofandor, Gouk), Jinack ; Casamance : Karabane, Diogué, Boune. Aucun pont, desserte par pirogues ; chaque lieu isolé"
        }
      ]
    },
    "SL": {
      "default": "continental",
      "rules": [
        {
          "key": "sherbro",
          "match": {
            "box": [
              [
                7.5042,
                7.6376,
                -12.9522,
                -12.6653
              ],
              [
                7.3986,
                7.5253,
                -12.6754,
                -12.5039
              ],
              [
                7.5163,
                7.6486,
                -12.6823,
                -12.6249
              ],
              [
                7.5177,
                7.6494,
                -12.6439,
                -12.5925
              ],
              [
                7.5157,
                7.5433,
                -12.6107,
                -12.495
              ],
              [
                7.5235,
                7.5511,
                -12.6071,
                -12.4994
              ],
              [
                7.5321,
                7.555,
                -12.528,
                -12.5067
              ],
              [
                7.5363,
                7.5563,
                -12.5436,
                -12.5236
              ],
              [
                7.6267,
                7.6467,
                -12.6119,
                -12.5919
              ]
            ]
          },
          "note": "Île Sherbro (Bonthe) : aucun pont, pas de bac véhicules régulier documenté"
        },
        {
          "key": "*",
          "match": {
            "near": [
              {
                "name": "Ricketts",
                "lat": 8.101,
                "lon": -13.2363,
                "km": 1
              },
              {
                "name": "Dublin",
                "lat": 8.1375,
                "lon": -13.1927,
                "km": 1
              }
            ]
          },
          "note": "Banana Islands (Dublin, Ricketts)"
        },
        {
          "key": "*",
          "match": {
            "near": [
              {
                "name": "York",
                "lat": 7.5412,
                "lon": -12.463,
                "km": 1
              },
              {
                "name": "Yele",
                "lat": 7.5877,
                "lon": -12.9809,
                "km": 1
              },
              {
                "name": "Tivellin",
                "lat": 7.5883,
                "lon": -12.9827,
                "km": 1
              },
              {
                "name": "Tasso",
                "lat": 8.5653,
                "lon": -13.0874,
                "km": 1
              },
              {
                "name": "Tasoku",
                "lat": 8.5539,
                "lon": -13.0636,
                "km": 1
              },
              {
                "name": "Sei",
                "lat": 7.6337,
                "lon": -12.9964,
                "km": 1
              },
              {
                "name": "Sangbalima",
                "lat": 8.5645,
                "lon": -13.065,
                "km": 0.79
              },
              {
                "name": "Pujehun",
                "lat": 7.564,
                "lon": -12.5507,
                "km": 1
              },
              {
                "name": "Periwahun",
                "lat": 7.5807,
                "lon": -12.5391,
                "km": 1
              },
              {
                "name": "Mawabul",
                "lat": 8.888,
                "lon": -13.2257,
                "km": 1
              },
              {
                "name": "Mateti",
                "lat": 8.9069,
                "lon": -13.2363,
                "km": 1
              },
              {
                "name": "Matanok",
                "lat": 8.915,
                "lon": -13.2183,
                "km": 1
              },
              {
                "name": "Mania",
                "lat": 7.6378,
                "lon": -13.0489,
                "km": 1
              },
              {
                "name": "Malai",
                "lat": 8.5333,
                "lon": -12.95,
                "km": 0.41
              },
              {
                "name": "Makenke",
                "lat": 8.5544,
                "lon": -12.9357,
                "km": 0.74
              },
              {
                "name": "Makambo",
                "lat": 8.538,
                "lon": -12.9332,
                "km": 0.28
              },
              {
                "name": "Lenkenboli",
                "lat": 8.9089,
                "lon": -13.2358,
                "km": 1
              },
              {
                "name": "Kortimaw",
                "lat": 8.9031,
                "lon": -13.2373,
                "km": 1
              },
              {
                "name": "Baoma",
                "lat": 7.6264,
                "lon": -13.0472,
                "km": 1
              },
              {
                "name": "Pulunmant",
                "lat": 8.5394,
                "lon": -13.0875,
                "km": 1
              },
              {
                "name": "Tumbubana",
                "lat": 8.5728,
                "lon": -13.0075,
                "km": 0.95
              },
              {
                "name": "Bomplake",
                "lat": 7.5762,
                "lon": -12.4997,
                "km": 1
              },
              {
                "name": "Foya",
                "lat": 7.5575,
                "lon": -12.5467,
                "km": 0.95
              },
              {
                "name": "Bomotoke",
                "lat": 7.5786,
                "lon": -12.5525,
                "km": 1
              },
              {
                "name": "Yangisei",
                "lat": 7.6115,
                "lon": -12.5595,
                "km": 1
              },
              {
                "name": "Bumpetok",
                "lat": 7.6579,
                "lon": -13.0232,
                "km": 1
              },
              {
                "name": "Mut",
                "lat": 7.6254,
                "lon": -13.0459,
                "km": 1
              },
              {
                "name": "Baki",
                "lat": 7.6018,
                "lon": -13.0056,
                "km": 1
              },
              {
                "name": "Gewojahun",
                "lat": 7.5866,
                "lon": -12.979,
                "km": 1
              },
              {
                "name": "Kila",
                "lat": 7.555,
                "lon": -12.5028,
                "km": 1
              },
              {
                "name": "Bonge",
                "lat": 7.5834,
                "lon": -12.5524,
                "km": 1
              },
              {
                "name": "Kopoila",
                "lat": 7.441,
                "lon": -12.4898,
                "km": 0.61
              },
              {
                "name": "Matamkia",
                "lat": 8.5785,
                "lon": -12.9742,
                "km": 0.99
              },
              {
                "name": "Makose",
                "lat": 8.5547,
                "lon": -12.9498,
                "km": 1
              },
              {
                "name": "Giehun",
                "lat": 7.5687,
                "lon": -12.5477,
                "km": 1
              },
              {
                "name": "Sembehun",
                "lat": 7.5749,
                "lon": -12.5335,
                "km": 1
              }
            ]
          },
          "note": "Îles de l'estuaire de la Sierra Leone (Tasso, Kortimaw, Kagbeli, Tumbu), Turtle Islands (Yele, Sei, Mut, Baki), îles de la rivière Sherbro (York, Macauley, îlot de Kopoila) : sans pont, chaque lieu isolé"
        }
      ]
    },
    "GN": {
      "default": "continental",
      "rules": [
        {
          "key": "*",
          "match": {
            "near": [
              {
                "name": "Robané",
                "lat": 9.4878,
                "lon": -13.8261,
                "km": 1
              },
              {
                "name": "Kouromandja",
                "lat": 9.4608,
                "lon": -13.7492,
                "km": 1
              },
              {
                "name": "Fotoba",
                "lat": 9.5064,
                "lon": -13.8039,
                "km": 1
              },
              {
                "name": "Kassa",
                "lat": 9.4764,
                "lon": -13.7497,
                "km": 1
              },
              {
                "name": "Tanene",
                "lat": 9.4894,
                "lon": -13.7589,
                "km": 1
              },
              {
                "name": "Mangue",
                "lat": 9.4964,
                "lon": -13.7611,
                "km": 1
              },
              {
                "name": "Boume",
                "lat": 9.4714,
                "lon": -13.8369,
                "km": 1
              },
              {
                "name": "Tahire",
                "lat": 9.4644,
                "lon": -13.7964,
                "km": 1
              },
              {
                "name": "Sébaya",
                "lat": 9.4911,
                "lon": -13.8169,
                "km": 1
              },
              {
                "name": "Soro",
                "lat": 9.5039,
                "lon": -13.7661,
                "km": 1
              },
              {
                "name": "Cote",
                "lat": 9.4797,
                "lon": -13.8358,
                "km": 1
              },
              {
                "name": "Tayiré",
                "lat": 9.4639,
                "lon": -13.7997,
                "km": 1
              }
            ]
          },
          "note": "Îles de Loos (Kassa, Room, Tamara/Fotoba) : bateaux depuis Conakry, sans véhicules"
        },
        {
          "key": "*",
          "match": {
            "near": [
              {
                "name": "Koréou",
                "lat": 10.8667,
                "lon": -15.05,
                "km": 1
              },
              {
                "name": "Katchek",
                "lat": 10.8833,
                "lon": -15.0667,
                "km": 1
              },
              {
                "name": "Kassagba",
                "lat": 10.9,
                "lon": -15,
                "km": 1
              },
              {
                "name": "Kantongondébéré",
                "lat": 10.95,
                "lon": -15,
                "km": 1
              },
              {
                "name": "Kambonkou",
                "lat": 10.85,
                "lon": -15.0167,
                "km": 1
              },
              {
                "name": "Kaformane",
                "lat": 10.9,
                "lon": -14.9667,
                "km": 1
              },
              {
                "name": "Kadinié",
                "lat": 10.9167,
                "lon": -15.0333,
                "km": 1
              },
              {
                "name": "Kabot",
                "lat": 10.8,
                "lon": -14.95,
                "km": 1
              },
              {
                "name": "Bakhaday",
                "lat": 10.95,
                "lon": -15,
                "km": 1
              }
            ]
          },
          "note": "Îles Tristao (Katchek, Kabot…), estuaire du Rio Kogon : accès par bateau"
        }
      ]
    }
  },
  "ferries": [
    {
      "a": "continental", "b": "kerkennah", "routeKey": "sfaxSidiYoussef", "name": "Sfax ↔ Sidi Youssef (Kerkennah)",
      "operator": "SONOTRAK (Société Nouvelle de Transport de Kerkennah)", "durationH": 1.2, "distanceKm": 21,
      "priceByClass": { "1": 1.78, "2": 2.22, "5": 0.44, "foot": 0.3 },
      "currency": "TND", "original": { "car": 6, "van": 7.5, "moto": 1.5, "foot": 1 },
      "source": "https://www.sonotrak.com.tn (communiqué tarifaire du 4 juillet 2022, en vigueur le 6 juillet 2022, décision des ministres du Commerce et du Transport ; horaire du 1er septembre 2026)",
      "date": "2026-09-16",
      "note": "Aller simple TTC, conducteur non compris (billet passager 1 TND). Classe 2 = camionnette ou véhicule mixte 1-9 places (camping-car non listé). Moto = ligne « 125 cm³ » (1,5 TND ; moins de 125 cm³ : 1 TND). Grille scannée en arabe, lecture à confirmer. 10 départs par jour dans chaque sens ; 1 h à 1 h 20. Taux InforEuro septembre 2026 : 3,38015 TND/€."
    },
    {
      "a": "continental", "b": "dalma", "routeKey": "alDhannaDalma", "name": "Jebel Al Dhanna ↔ Dalma",
      "operator": "Abu Dhabi Maritime (AD Ports)", "durationH": 1, "distanceKm": 43,
      "priceByClass": { "1": 23.36, "2": 23.36, "5": null, "foot": 4.67 },
      "currency": "AED", "original": { "car": 100, "van": 100, "moto": null, "foot": 20 },
      "source": "https://www.admaritime.ae (page Tariffs et FAQ du portail de réservation tickets.admaritime.ae)",
      "date": "2026-09-16",
      "note": "Aller simple : voiture ou 4x4 100 AED, camping-car 100 AED, adulte 20 AED (moins de 12 ans gratuit). Moto absente de la grille (tarif non communiqué). Conducteur vraisemblablement facturé à part (billets véhicule et passager distincts). 2 à 3 allers-retours par jour, réservation recommandée. Taux InforEuro septembre 2026 : 4,27995 AED/€."
    },
    {
      "a": "luzon", "b": "busuanga", "routeKey": "manilaCoron", "name": "Manille ↔ Coron",
      "operator": "2GO Travel (MV 2GO St. Francis Xavier)", "durationH": 13, "distanceKm": 300,
      "priceStatus": "variable", "priceByClass": { "1": null, "2": null, "5": null, "foot": null },
      "source": "https://travel.2go.com.ph (horaires) ; matrice MARINA des lignes desservies (mars 2026)",
      "date": "2026-09-16",
      "note": "Une rotation par semaine (départ de Manille le vendredi 17:30, arrivée le samedi 06:30 ; retour le dimanche 20:30). Véhicules transportés en fret roulant (capacité 40), dépôt environ 48 h avant le départ, prix sur devis ; billet passager à prix dynamique. Distance à vol d'oiseau."
    },
    {
      "a": "continental",
      "b": "olkhon",
      "routeKey": "sakhyurtaOlkhon",
      "name": "Sakhiurta (MRS) ↔ Olkhon",
      "operator": "AO Vostochno-Sibirskoe retchnoe parokhodstvo (VSRP)",
      "durationH": 0.25,
      "distanceKm": 2,
      "priceByClass": {
        "1": 0,
        "2": 0,
        "5": 0,
        "foot": 0
      },
      "source": "https://vsrp.ru/routes/paromnaya-pereprava-mrs-ostrov-olkhon-02/ ; https://www.magicbaikal.ru/rest/ferry-to-olkhon.htm",
      "date": "2026-09-16",
      "note": "Page officielle VSRP : transport des véhicules et des passagers « БЕСПЛАТНО » (gratuit). Service 2026 du 7 mai au 31 décembre (bacs Dorozhnik 8 voitures, Semen Batakaev et Olkhonskie Vorota 16 voitures) ; fermé à l'englacement, route de glace en février-mars. Distance entre pontons 2 km (magicbaikal) ; durée non publiée : 15 min = ordre de grandeur."
    },
    {
      "a": "sakhalin",
      "b": "kunashir",
      "routeKey": "korsakovYuzhnoKurilsk",
      "name": "Korsakov ↔ Ioujno-Kourilsk",
      "operator": "Sakhpasflot (Admiral Nevelskoy, Igor Farkhutdinov, Pavel Leonov)",
      "durationH": 19,
      "distanceKm": 376,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://paluba.media/news/207890 ; https://sakhpasflot.ru/napravleniya/ ; https://rasp.yandex.ru/water/korsakov--ugno-kurilsk",
      "date": "2026-01-25",
      "note": "Rotation Korsakov – Kourilsk (Itouroup) – Ioujno-Kourilsk (Kounachir) – Malokourilskoïe (Chikotan) – Korsakov ; le ferry PV22 Admiral Nevelskoy (revenu en ligne en janvier 2026) transporte des voitures particulières. Tarifs réglementés (arrêté du gouvernement de la région de Sakhaline n° 175 du 13/04/2023, rév. 01/06/2026) mais barème véhicules non lisible (site régional des tarifs inaccessible). Durée ~19 h (ordre de grandeur publié, 18-22 h selon escales) ; distance orthodromique."
    },
    {
      "a": "sakhalin",
      "b": "iturup",
      "routeKey": "korsakovKurilsk",
      "name": "Korsakov ↔ Kourilsk (Itouroup)",
      "operator": "Sakhpasflot (Admiral Nevelskoy, Igor Farkhutdinov, Pavel Leonov)",
      "durationH": 20,
      "distanceKm": 424,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://paluba.media/news/207890 ; https://sakhpasflot.ru/napravleniya/",
      "date": "2026-01-25",
      "note": "Même rotation que Korsakov ↔ Ioujno-Kourilsk (voitures particulières acceptées sur l'Admiral Nevelskoy) ; débarquement en rade selon la météo. Barème véhicules non lisible. Durée : passage direct 18-22 h (ordre de grandeur publié) ; distance orthodromique."
    }
  ]
};
