// Zones rouges/orange France Diplomatie — groupe europe — consulté le 2026-09-16
// date = « Dernière actualisation » de la section Zones de vigilance de chaque fiche Sécurité
module.exports = [
  {
    "country": "UA",
    "level": "red",
    "label": "Ukraine : tout le pays (guerre en cours)",
    "match": {
      "all": true
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/ukraine/conseils-aux-voyageurs-securite",
    "date": "2026-03-13"
  },
  {
    "country": "BY",
    "level": "red",
    "label": "Biélorussie : tout le pays",
    "match": {
      "all": true
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/bielorussie/conseils-aux-voyageurs-securite",
    "date": "2026-05-27"
  },
  {
    "country": "RU",
    "level": "red",
    "label": "Russie : tout le pays",
    "match": {
      "all": true
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/russie/conseils-aux-voyageurs-securite",
    "date": "2026-03-12"
  },
  {
    "country": "MD",
    "level": "orange",
    "label": "Transnistrie (rive gauche du Dniestr et Bender)",
    "match": {
      "regions": [
        "Camenca Tr.",
        "Ribnita Tr.",
        "Dubasari Tr.",
        "Grigoriopol Tr.",
        "Slobozia Tr.",
        "Tiraspol Tr.",
        "Bender Tr."
      ]
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/moldavie/conseils-aux-voyageurs-securite",
    "date": "2026-03-11"
  },
  {
    "country": "GE",
    "level": "red",
    "label": "Abkhazie et abords (approximation par cercles)",
    "match": {
      "near": [
        {
          "name": "Gagra",
          "lat": 43.33,
          "lon": 40.27,
          "km": 25
        },
        {
          "name": "Haute vallée de la Bzyb",
          "lat": 43.45,
          "lon": 40.55,
          "km": 20
        },
        {
          "name": "Goudaouta",
          "lat": 43.1,
          "lon": 40.62,
          "km": 22
        },
        {
          "name": "Soukhoumi",
          "lat": 43,
          "lon": 41.02,
          "km": 25
        },
        {
          "name": "Abkhazie centre",
          "lat": 43.25,
          "lon": 41.05,
          "km": 25
        },
        {
          "name": "Haute Kodori ouest",
          "lat": 43.2,
          "lon": 41.45,
          "km": 22
        },
        {
          "name": "Haute Kodori est",
          "lat": 43.1,
          "lon": 41.85,
          "km": 22
        },
        {
          "name": "Otchamtchire",
          "lat": 42.71,
          "lon": 41.46,
          "km": 20
        },
        {
          "name": "Tkvartcheli",
          "lat": 42.85,
          "lon": 41.68,
          "km": 18
        },
        {
          "name": "Gali",
          "lat": 42.63,
          "lon": 41.73,
          "km": 12
        },
        {
          "name": "Basse Ingouri",
          "lat": 42.52,
          "lon": 41.6,
          "km": 9
        }
      ]
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/georgie/conseils-aux-voyageurs-securite",
    "date": "2026-03-05"
  },
  {
    "country": "GE",
    "level": "red",
    "label": "Ossétie du Sud (région de Tskhinvali) et abords (approximation par cercles)",
    "match": {
      "near": [
        {
          "name": "Tskhinvali",
          "lat": 42.23,
          "lon": 43.96,
          "km": 14
        },
        {
          "name": "Java",
          "lat": 42.4,
          "lon": 43.93,
          "km": 15
        },
        {
          "name": "Kvaisa",
          "lat": 42.51,
          "lon": 43.66,
          "km": 12
        },
        {
          "name": "Znaouri",
          "lat": 42.37,
          "lon": 43.73,
          "km": 10
        },
        {
          "name": "Ossétie du Sud nord-est",
          "lat": 42.53,
          "lon": 44.12,
          "km": 12
        },
        {
          "name": "Akhalgori",
          "lat": 42.13,
          "lon": 44.48,
          "km": 12
        },
        {
          "name": "Ossétie du Sud est",
          "lat": 42.3,
          "lon": 44.25,
          "km": 12
        }
      ]
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/georgie/conseils-aux-voyageurs-securite",
    "date": "2026-03-05"
  },
  {
    "country": "AM",
    "level": "orange",
    "label": "Province du Syunik (Goris, Kapan, Sissian, Meghri)",
    "match": {
      "cpPrefix": [
        "32",
        "33",
        "34",
        "35"
      ]
    },
    "except": {
      "near": [
        {
          "name": "Yeghvard (code postal 3313 erroné dans les données)",
          "lat": 40.323,
          "lon": 44.484,
          "km": 3
        }
      ]
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/armenie/conseils-aux-voyageurs-securite",
    "date": "2026-03-04"
  },
  {
    "country": "AM",
    "level": "red",
    "label": "Zones frontalières avec l'Azerbaïdjan (bande ~12 km)",
    "match": {
      "borderKm": 12,
      "with": "AZ"
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/armenie/conseils-aux-voyageurs-securite",
    "date": "2026-03-04"
  },
  {
    "country": "AM",
    "level": "red",
    "label": "Zones frontalières avec le Nakhitchevan (bande ~9 km)",
    "match": {
      "near": [
        {
          "name": "Frontière Nakhitchevan 1",
          "lat": 39.78,
          "lon": 44.78,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 2",
          "lat": 39.75,
          "lon": 44.89,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 3",
          "lat": 39.72,
          "lon": 45,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 4",
          "lat": 39.67,
          "lon": 45.09,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 5",
          "lat": 39.62,
          "lon": 45.18,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 6",
          "lat": 39.58,
          "lon": 45.28,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 7",
          "lat": 39.54,
          "lon": 45.38,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 8",
          "lat": 39.51,
          "lon": 45.453,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 9",
          "lat": 39.48,
          "lon": 45.527,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 10",
          "lat": 39.45,
          "lon": 45.6,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 11",
          "lat": 39.417,
          "lon": 45.667,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 12",
          "lat": 39.383,
          "lon": 45.733,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 13",
          "lat": 39.35,
          "lon": 45.8,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 14",
          "lat": 39.3,
          "lon": 45.875,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 15",
          "lat": 39.25,
          "lon": 45.95,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 16",
          "lat": 39.175,
          "lon": 45.985,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 17",
          "lat": 39.1,
          "lon": 46.02,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 18",
          "lat": 39.04,
          "lon": 46.045,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 19",
          "lat": 38.98,
          "lon": 46.07,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 20",
          "lat": 38.925,
          "lon": 46.105,
          "km": 9
        },
        {
          "name": "Frontière Nakhitchevan 21",
          "lat": 38.87,
          "lon": 46.14,
          "km": 9
        }
      ]
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/armenie/conseils-aux-voyageurs-securite",
    "date": "2026-03-04"
  },
  {
    "country": "AZ",
    "level": "orange",
    "label": "Azerbaïdjan : majeure partie du territoire (dont Bakou)",
    "match": {
      "all": true
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/azerbaidjan/conseils-aux-voyageurs-securite",
    "date": "2026-03-06"
  },
  {
    "country": "AZ",
    "level": "red",
    "label": "Ancien Haut-Karabagh et anciens districts adjacents",
    "match": {
      "regions": [
        "Xankəndi",
        "Xocali",
        "Xocavənd",
        "Şuşa",
        "Kəlbəcər",
        "Laçin",
        "Qubadli",
        "Zəngilan",
        "Ağdam",
        "Füzuli"
      ]
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/azerbaidjan/conseils-aux-voyageurs-securite",
    "date": "2026-03-06"
  },
  {
    "country": "AZ",
    "level": "red",
    "label": "Ancien Haut-Karabagh : secteurs de Djebraïl et d'Ağdərə",
    "match": {
      "near": [
        {
          "name": "Cəbrayıl",
          "lat": 39.4,
          "lon": 47.03,
          "km": 18
        },
        {
          "name": "Ağdərə (Martakert)",
          "lat": 40.21,
          "lon": 46.82,
          "km": 15
        }
      ]
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/azerbaidjan/conseils-aux-voyageurs-securite",
    "date": "2026-03-06"
  },
  {
    "country": "AZ",
    "level": "red",
    "label": "Zones frontalières avec l'Arménie (bande ~15 km)",
    "match": {
      "borderKm": 15,
      "with": "AM"
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/azerbaidjan/conseils-aux-voyageurs-securite",
    "date": "2026-03-06"
  },
  {
    "country": "TR",
    "level": "orange",
    "label": "Départements du Hatay, Kilis, Gaziantep, Şanlıurfa, Mardin, Diyarbakır et Batman",
    "match": {
      "cpPrefix": [
        "31",
        "79",
        "27",
        "63",
        "47",
        "21",
        "72"
      ]
    },
    "except": {
      "near": [
        {
          "name": "Antalya (code postal 27500 erroné dans les données)",
          "lat": 36.908,
          "lon": 30.696,
          "km": 20
        }
      ]
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/turquie/conseils-aux-voyageurs-securite",
    "date": "2026-03-23"
  },
  {
    "country": "TR",
    "level": "red",
    "label": "Abords immédiats de la frontière syrienne (bande ~12 km)",
    "match": {
      "near": [
        {
          "name": "Frontière syrienne 1",
          "lat": 35.92,
          "lon": 35.92,
          "km": 12
        },
        {
          "name": "Frontière syrienne 2",
          "lat": 35.87,
          "lon": 36.035,
          "km": 12
        },
        {
          "name": "Frontière syrienne 3",
          "lat": 35.82,
          "lon": 36.15,
          "km": 12
        },
        {
          "name": "Frontière syrienne 4",
          "lat": 35.91,
          "lon": 36.26,
          "km": 12
        },
        {
          "name": "Frontière syrienne 5",
          "lat": 36,
          "lon": 36.37,
          "km": 12
        },
        {
          "name": "Frontière syrienne 6",
          "lat": 36.1,
          "lon": 36.465,
          "km": 12
        },
        {
          "name": "Frontière syrienne 7",
          "lat": 36.2,
          "lon": 36.56,
          "km": 12
        },
        {
          "name": "Frontière syrienne 8",
          "lat": 36.325,
          "lon": 36.565,
          "km": 12
        },
        {
          "name": "Frontière syrienne 9",
          "lat": 36.45,
          "lon": 36.57,
          "km": 12
        },
        {
          "name": "Frontière syrienne 10",
          "lat": 36.55,
          "lon": 36.6,
          "km": 12
        },
        {
          "name": "Frontière syrienne 11",
          "lat": 36.65,
          "lon": 36.63,
          "km": 12
        },
        {
          "name": "Frontière syrienne 12",
          "lat": 36.735,
          "lon": 36.655,
          "km": 12
        },
        {
          "name": "Frontière syrienne 13",
          "lat": 36.82,
          "lon": 36.68,
          "km": 12
        },
        {
          "name": "Frontière syrienne 14",
          "lat": 36.76,
          "lon": 36.815,
          "km": 12
        },
        {
          "name": "Frontière syrienne 15",
          "lat": 36.7,
          "lon": 36.95,
          "km": 12
        },
        {
          "name": "Frontière syrienne 16",
          "lat": 36.64,
          "lon": 37.1,
          "km": 12
        },
        {
          "name": "Frontière syrienne 17",
          "lat": 36.647,
          "lon": 37.233,
          "km": 12
        },
        {
          "name": "Frontière syrienne 18",
          "lat": 36.653,
          "lon": 37.367,
          "km": 12
        },
        {
          "name": "Frontière syrienne 19",
          "lat": 36.66,
          "lon": 37.5,
          "km": 12
        },
        {
          "name": "Frontière syrienne 20",
          "lat": 36.703,
          "lon": 37.625,
          "km": 12
        },
        {
          "name": "Frontière syrienne 21",
          "lat": 36.745,
          "lon": 37.75,
          "km": 12
        },
        {
          "name": "Frontière syrienne 22",
          "lat": 36.787,
          "lon": 37.875,
          "km": 12
        },
        {
          "name": "Frontière syrienne 23",
          "lat": 36.83,
          "lon": 38,
          "km": 12
        },
        {
          "name": "Frontière syrienne 24",
          "lat": 36.847,
          "lon": 38.133,
          "km": 12
        },
        {
          "name": "Frontière syrienne 25",
          "lat": 36.863,
          "lon": 38.267,
          "km": 12
        },
        {
          "name": "Frontière syrienne 26",
          "lat": 36.88,
          "lon": 38.4,
          "km": 12
        },
        {
          "name": "Frontière syrienne 27",
          "lat": 36.835,
          "lon": 38.538,
          "km": 12
        },
        {
          "name": "Frontière syrienne 28",
          "lat": 36.79,
          "lon": 38.675,
          "km": 12
        },
        {
          "name": "Frontière syrienne 29",
          "lat": 36.745,
          "lon": 38.813,
          "km": 12
        },
        {
          "name": "Frontière syrienne 30",
          "lat": 36.7,
          "lon": 38.95,
          "km": 12
        },
        {
          "name": "Frontière syrienne 31",
          "lat": 36.725,
          "lon": 39.113,
          "km": 12
        },
        {
          "name": "Frontière syrienne 32",
          "lat": 36.75,
          "lon": 39.275,
          "km": 12
        },
        {
          "name": "Frontière syrienne 33",
          "lat": 36.775,
          "lon": 39.438,
          "km": 12
        },
        {
          "name": "Frontière syrienne 34",
          "lat": 36.8,
          "lon": 39.6,
          "km": 12
        },
        {
          "name": "Frontière syrienne 35",
          "lat": 36.817,
          "lon": 39.757,
          "km": 12
        },
        {
          "name": "Frontière syrienne 36",
          "lat": 36.833,
          "lon": 39.913,
          "km": 12
        },
        {
          "name": "Frontière syrienne 37",
          "lat": 36.85,
          "lon": 40.07,
          "km": 12
        },
        {
          "name": "Frontière syrienne 38",
          "lat": 36.888,
          "lon": 40.203,
          "km": 12
        },
        {
          "name": "Frontière syrienne 39",
          "lat": 36.925,
          "lon": 40.335,
          "km": 12
        },
        {
          "name": "Frontière syrienne 40",
          "lat": 36.962,
          "lon": 40.468,
          "km": 12
        },
        {
          "name": "Frontière syrienne 41",
          "lat": 37,
          "lon": 40.6,
          "km": 12
        },
        {
          "name": "Frontière syrienne 42",
          "lat": 37.017,
          "lon": 40.75,
          "km": 12
        },
        {
          "name": "Frontière syrienne 43",
          "lat": 37.035,
          "lon": 40.9,
          "km": 12
        },
        {
          "name": "Frontière syrienne 44",
          "lat": 37.053,
          "lon": 41.05,
          "km": 12
        },
        {
          "name": "Frontière syrienne 45",
          "lat": 37.07,
          "lon": 41.2,
          "km": 12
        },
        {
          "name": "Frontière syrienne 46",
          "lat": 37.078,
          "lon": 41.35,
          "km": 12
        },
        {
          "name": "Frontière syrienne 47",
          "lat": 37.085,
          "lon": 41.5,
          "km": 12
        },
        {
          "name": "Frontière syrienne 48",
          "lat": 37.093,
          "lon": 41.65,
          "km": 12
        },
        {
          "name": "Frontière syrienne 49",
          "lat": 37.1,
          "lon": 41.8,
          "km": 12
        },
        {
          "name": "Frontière syrienne 50",
          "lat": 37.105,
          "lon": 41.938,
          "km": 12
        },
        {
          "name": "Frontière syrienne 51",
          "lat": 37.11,
          "lon": 42.075,
          "km": 12
        },
        {
          "name": "Frontière syrienne 52",
          "lat": 37.115,
          "lon": 42.212,
          "km": 12
        },
        {
          "name": "Frontière syrienne 53",
          "lat": 37.12,
          "lon": 42.35,
          "km": 12
        }
      ]
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/turquie/conseils-aux-voyageurs-securite",
    "date": "2026-03-23"
  },
  {
    "country": "TR",
    "level": "red",
    "label": "Hatay frontalier (Reyhanlı, Kırıkhan, Altınözü, Yayladağı)",
    "match": {
      "near": [
        {
          "name": "Reyhanlı",
          "lat": 36.27,
          "lon": 36.57,
          "km": 12
        },
        {
          "name": "Kırıkhan",
          "lat": 36.5,
          "lon": 36.36,
          "km": 10
        },
        {
          "name": "Altınözü",
          "lat": 36.12,
          "lon": 36.25,
          "km": 10
        },
        {
          "name": "Yayladağı",
          "lat": 35.9,
          "lon": 36.06,
          "km": 10
        }
      ]
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/turquie/conseils-aux-voyageurs-securite",
    "date": "2026-03-23"
  },
  {
    "country": "TR",
    "level": "red",
    "label": "Frontière irakienne : provinces de Şırnak, Hakkari et Siirt",
    "match": {
      "cpPrefix": [
        "73",
        "30",
        "56"
      ]
    },
    "source": "https://www.diplomatie.gouv.fr/fr/information-par-pays/turquie/conseils-aux-voyageurs-securite",
    "date": "2026-03-23"
  }
];
