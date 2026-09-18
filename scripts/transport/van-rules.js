// van-rules.js — Restrictions de circulation pertinentes pour un van / fourgon aménagé
// (≤ 3,5 t, ~6-7 m de long, ~2,7-3 m de haut).
//
// Méthode : recherche web du 17/09/2026 (WebSearch/WebFetch). Sources officielles privilégiées
// (Umweltbundesamt, mieuxrespirerenville.gouv.fr, gov.uk/TfL, lez.brussels, milieuzones.nl,
// miljoezoner.dk, communes italiennes/espagnoles, NPS, SFTRF/ATMB, Land Tirol…) ; à défaut,
// source reconnue (presse spécialisée, guides) citée telle quelle dans `source`.
// Coordonnées : géocodage OpenStreetMap/Nominatim (centre de ville) ou point saisi à la main
// (tunnels, cols, routes, zones infra-communales). `km` = rayon approximatif couvrant la zone.
//
// Types : lez (zone à faibles émissions / restriction selon norme, vignette ou plaque),
//         ztl (zone à trafic limité réservée aux autorisés), tunnel, pass (col / route de montagne),
//         road (route touristique restreinte).
//
// Limites :
//  - Instantané au 17/09/2026 : les ZFE/ZBE évoluent souvent (calendriers de durcissement, annulations
//    judiciaires comme Valladolid 2026, abrogations comme Leipzig 16/04/2026, suspension Euro 5 diesel
//    en Émilie-Romagne/Piémont/Vénétie en sept. 2026). Vérifier avant départ.
//  - Couverture non exhaustive : ZBE espagnoles non sanctionnantes ou non vérifiées omises (≈150 communes
//    légalement tenues d'en avoir une) ; ZTL de petites villes italiennes omises ; zones zéro émission
//    néerlandaises pour utilitaires (N1) non listées ; restrictions temporaires lors des pics de
//    pollution (circulation différenciée France, Genève Stick'AIR, Oslo, alerte rouge Rome…) non listées.
//  - Le résultat dépend du véhicule : norme Euro, carburant, date de 1re immatriculation, catégorie
//    (M1 camping-car vs N1 utilitaire : ex. CAZ britanniques de classe C, ZE-zones NL), vignette
//    Crit'Air / Umweltplakette / enregistrement préalable des plaques étrangères.
//  - Pays sans entrée faute de restriction applicable ou de source fiable trouvée : Canada, Australie,
//    Nouvelle-Zélande, Argentine, Chili, Maroc, Turquie, Norvège, Suisse, Tchéquie (LEZ Prague poids
//    lourds seulement), Autriche (IG-L poids lourds ; seules les interdictions de délestage tyroliennes
//    sont listées), Grèce (Daktylios d'Athènes : véhicules étrangers exemptés 40 jours).
module.exports = [
  {
    type: "lez",
    country: "DE",
    name: "Berlin",
    near: {
      lat: 52.5174,
      lon: 13.3951,
      km: 7
    },
    detail: "Umweltzone de Berlin : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "München",
    near: {
      lat: 48.1371,
      lon: 11.5754,
      km: 5
    },
    detail: "Umweltzone de München : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Stuttgart",
    near: {
      lat: 48.7784,
      lon: 9.18,
      km: 9
    },
    detail: "Umweltzone de Stuttgart : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Ludwigsburg",
    near: {
      lat: 48.8954,
      lon: 9.1895,
      km: 7
    },
    detail: "Umweltzone de Ludwigsburg : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Pforzheim",
    near: {
      lat: 48.8909,
      lon: 8.7026,
      km: 3
    },
    detail: "Umweltzone de Pforzheim : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Augsburg",
    near: {
      lat: 48.369,
      lon: 10.898,
      km: 3
    },
    detail: "Umweltzone de Augsburg : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Regensburg",
    near: {
      lat: 49.0195,
      lon: 12.0975,
      km: 2
    },
    detail: "Umweltzone de Regensburg : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Bremen",
    near: {
      lat: 53.0758,
      lon: 8.8072,
      km: 3
    },
    detail: "Umweltzone de Bremen : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Darmstadt",
    near: {
      lat: 49.8728,
      lon: 8.6512,
      km: 4
    },
    detail: "Umweltzone de Darmstadt : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Frankfurt am Main",
    near: {
      lat: 50.1106,
      lon: 8.6821,
      km: 6
    },
    detail: "Umweltzone de Frankfurt am Main : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Limburg an der Lahn",
    near: {
      lat: 50.388,
      lon: 8.0635,
      km: 2
    },
    detail: "Umweltzone de Limburg an der Lahn : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Marburg",
    near: {
      lat: 50.809,
      lon: 8.7705,
      km: 4
    },
    detail: "Umweltzone de Marburg : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Offenbach am Main",
    near: {
      lat: 50.1055,
      lon: 8.7611,
      km: 3
    },
    detail: "Umweltzone de Offenbach am Main : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Wiesbaden",
    near: {
      lat: 50.082,
      lon: 8.2417,
      km: 4
    },
    detail: "Umweltzone de Wiesbaden : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Osnabrück",
    near: {
      lat: 52.272,
      lon: 8.0476,
      km: 3
    },
    detail: "Umweltzone de Osnabrück : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Aachen",
    near: {
      lat: 50.7764,
      lon: 6.0839,
      km: 3
    },
    detail: "Umweltzone de Aachen : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Bonn",
    near: {
      lat: 50.7353,
      lon: 7.1025,
      km: 4
    },
    detail: "Umweltzone de Bonn : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Dinslaken",
    near: {
      lat: 51.5624,
      lon: 6.7345,
      km: 3
    },
    detail: "Umweltzone de Dinslaken : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Düsseldorf",
    near: {
      lat: 51.2254,
      lon: 6.7763,
      km: 6
    },
    detail: "Umweltzone de Düsseldorf : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Eschweiler",
    near: {
      lat: 50.8175,
      lon: 6.2631,
      km: 2
    },
    detail: "Umweltzone de Eschweiler : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Hagen",
    near: {
      lat: 51.3583,
      lon: 7.4733,
      km: 4
    },
    detail: "Umweltzone de Hagen : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Köln",
    near: {
      lat: 50.9384,
      lon: 6.96,
      km: 8
    },
    detail: "Umweltzone de Köln : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Krefeld",
    near: {
      lat: 51.3331,
      lon: 6.5623,
      km: 4
    },
    detail: "Umweltzone de Krefeld : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Langenfeld (Rheinland)",
    near: {
      lat: 51.1009,
      lon: 6.9459,
      km: 3
    },
    detail: "Umweltzone de Langenfeld (Rheinland) : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Mönchengladbach",
    near: {
      lat: 51.1947,
      lon: 6.4354,
      km: 5
    },
    detail: "Umweltzone de Mönchengladbach : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Münster",
    near: {
      lat: 51.9625,
      lon: 7.6252,
      km: 3
    },
    detail: "Umweltzone de Münster : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Neuss",
    near: {
      lat: 51.1982,
      lon: 6.6916,
      km: 3
    },
    detail: "Umweltzone de Neuss : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Overath",
    near: {
      lat: 50.932,
      lon: 7.2839,
      km: 3
    },
    detail: "Umweltzone de Overath : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Remscheid",
    near: {
      lat: 51.1799,
      lon: 7.1944,
      km: 3
    },
    detail: "Umweltzone de Remscheid : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Ruhrgebiet",
    near: {
      lat: 51.47,
      lon: 7.12,
      km: 32
    },
    detail: "Umweltzone Ruhrgebiet (Essen, Dortmund, Duisburg, Bochum, Gelsenkirchen, Oberhausen, Mülheim, Bottrop, Herne, Recklinghausen…) : vignette verte (Umweltplakette) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Siegen",
    near: {
      lat: 50.8751,
      lon: 8.0256,
      km: 3
    },
    detail: "Umweltzone de Siegen : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Wuppertal",
    near: {
      lat: 51.264,
      lon: 7.178,
      km: 7
    },
    detail: "Umweltzone de Wuppertal : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Halle (Saale)",
    near: {
      lat: 51.4824,
      lon: 11.9713,
      km: 4
    },
    detail: "Umweltzone de Halle (Saale) : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DE",
    name: "Magdeburg",
    near: {
      lat: 52.1315,
      lon: 11.6401,
      km: 4
    },
    detail: "Umweltzone de Magdeburg : vignette verte (Umweltplakette, classe 4 : diesel Euro 4 avec filtre / essence catalysée) obligatoire, y compris pour les véhicules étrangers, 24 h/24.",
    source: "https://gis.uba.de/website/umweltzonen/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Paris (Métropole du Grand Paris)",
    near: {
      lat: 48.8535,
      lon: 2.3484,
      km: 13
    },
    detail: "ZFE-m du Grand Paris (intérieur de l'A86) : vignette Crit'Air obligatoire ; Crit'Air 3, 4, 5 et non classés interdits du lundi au vendredi de 8h à 20h.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Lyon",
    near: {
      lat: 45.7578,
      lon: 4.832,
      km: 6
    },
    detail: "ZFE de la Métropole de Lyon : Crit'Air 3, 4, 5 et non classés interdits depuis le 1er janvier 2025 (Crit'Air 2 prévu en périmètre central au 1er janvier 2028).",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Grenoble",
    near: {
      lat: 45.1876,
      lon: 5.7358,
      km: 10
    },
    detail: "ZFE de Grenoble Alpes Métropole : Crit'Air 3, 4, 5 et non classés interdits depuis le 1er janvier 2025 pour les voitures, du lundi au vendredi 7h–19h (restriction permanente sur 27 communes pour les utilitaires).",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Strasbourg",
    near: {
      lat: 48.5846,
      lon: 7.7507,
      km: 9
    },
    detail: "ZFE de l'Eurométropole de Strasbourg : Crit'Air 3, 4, 5 et non classés interdits depuis le 1er janvier 2025, 24 h/24 et 7 j/7.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Montpellier",
    near: {
      lat: 43.6112,
      lon: 3.8767,
      km: 10
    },
    detail: "ZFE de Montpellier Méditerranée Métropole : Crit'Air 3, 4, 5 et non classés interdits pour les voitures et utilitaires légers.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Marseille (Aix-Marseille-Provence)",
    near: {
      lat: 43.2964,
      lon: 5.3778,
      km: 5
    },
    detail: "ZFE d'Aix-Marseille-Provence (centre de Marseille) : Crit'Air 4, 5 et non classés interdits depuis septembre 2023, 24 h/24 et 7 j/7.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Nice",
    near: {
      lat: 43.7009,
      lon: 7.2684,
      km: 4
    },
    detail: "ZFE de la Métropole Nice Côte d'Azur : Crit'Air 5 et non classés interdits depuis le 1er janvier 2023.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Toulouse",
    near: {
      lat: 43.6045,
      lon: 1.4442,
      km: 7
    },
    detail: "ZFE de Toulouse Métropole : Crit'Air 4, 5 et non classés interdits (voitures incluses) depuis le 1er janvier 2023.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Rouen",
    near: {
      lat: 49.4405,
      lon: 1.094,
      km: 8
    },
    detail: "ZFE de la Métropole Rouen Normandie : Crit'Air 4, 5 et non classés interdits depuis le 1er septembre 2022.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Reims",
    near: {
      lat: 49.2578,
      lon: 4.0319,
      km: 5
    },
    detail: "ZFE du Grand Reims : Crit'Air 4, 5 et non classés interdits (hors deux-roues).",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Saint-Étienne",
    near: {
      lat: 45.4401,
      lon: 4.3873,
      km: 5
    },
    detail: "ZFE de Saint-Étienne Métropole : seuls les véhicules utilitaires (Crit'Air 4, 5 et non classés) et poids lourds sont restreints, les voitures particulières sont exemptées.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Clermont-Ferrand",
    near: {
      lat: 45.7775,
      lon: 3.0819,
      km: 6
    },
    detail: "ZFE de Clermont Auvergne Métropole : voitures non concernées ; seuls les véhicules utilitaires légers et poids lourds sont restreints (non classés).",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Nancy",
    near: {
      lat: 48.6937,
      lon: 6.1834,
      km: 6
    },
    detail: "ZFE du Grand Nancy : utilitaires légers Crit'Air 5 et non classés interdits ; voitures Crit'Air 5 et non classées interdites à partir du 1er janvier 2028.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Annecy",
    near: {
      lat: 45.8992,
      lon: 6.1289,
      km: 8
    },
    detail: "ZFE du Grand Annecy : véhicules non classés interdits depuis le 1er janvier 2025 (Crit'Air 5 en 2028, 4 en 2029, 3 en 2030).",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Annemasse",
    near: {
      lat: 46.1934,
      lon: 6.2341,
      km: 5
    },
    detail: "ZFE d'Annemasse Agglo : véhicules non classés interdits depuis le 1er janvier 2025 (Crit'Air 5 en 2028, 4 en 2029, 3 en 2030).",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Rennes",
    near: {
      lat: 48.1113,
      lon: -1.68,
      km: 5
    },
    detail: "ZFE de Rennes Métropole : véhicules non classés interdits depuis le 30 décembre 2024 (Crit'Air 5 au 1er janvier 2027).",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Lille",
    near: {
      lat: 50.6366,
      lon: 3.0635,
      km: 8
    },
    detail: "ZFE de la Métropole Européenne de Lille : véhicules non classés (sans Crit'Air possible) interdits depuis le 1er janvier 2025, en permanence.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Bordeaux",
    near: {
      lat: 44.8412,
      lon: -0.58,
      km: 8
    },
    detail: "ZFE de Bordeaux Métropole : véhicules non classés interdits depuis le 1er janvier 2025.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Pau",
    near: {
      lat: 43.2958,
      lon: -0.3686,
      km: 4
    },
    detail: "ZFE de Pau Béarn Pyrénées : véhicules non classés interdits du lundi au vendredi de 9h à 18h.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Caen",
    near: {
      lat: 49.1813,
      lon: -0.3636,
      km: 6
    },
    detail: "ZFE de Caen la Mer : véhicules non classés interdits.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Le Havre",
    near: {
      lat: 49.4939,
      lon: 0.108,
      km: 5
    },
    detail: "ZFE du Havre Seine Métropole : véhicules non classés interdits.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Nîmes",
    near: {
      lat: 43.8374,
      lon: 4.3601,
      km: 5
    },
    detail: "ZFE de Nîmes Métropole : véhicules non classés interdits.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Angers",
    near: {
      lat: 47.474,
      lon: -0.5516,
      km: 5
    },
    detail: "ZFE d'Angers Loire Métropole : véhicules non classés interdits.",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "FR",
    name: "Nantes",
    near: {
      lat: 47.2186,
      lon: -1.5541,
      km: 6
    },
    detail: "ZFE de Nantes Métropole : véhicules non classés interdits aux heures de pointe en semaine (7h–9h et 16h–19h).",
    source: "https://mieuxrespirerenville.gouv.fr/fiches-thematique/se-deplacer/zfe-francaises",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "FR",
    name: "Paris Centre (ZTL)",
    near: {
      lat: 48.859,
      lon: 2.347,
      km: 2
    },
    detail: "Zone à trafic limité Paris Centre (1er–4e arrondissements) depuis le 4 novembre 2024 : transit interdit 24 h/24, seuls les trajets à destination de la zone sont autorisés (amende 135 €).",
    source: "https://www.paris.fr/pages/paris-cree-une-zone-apaisee-dans-le-centre-de-la-capitale-20426",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "FR",
    name: "Lyon – Presqu'île (ZTL)",
    near: {
      lat: 45.76,
      lon: 4.833,
      km: 1
    },
    detail: "Zone à trafic limité de la Presqu'île de Lyon depuis le 21 juin 2025 : circulation réservée aux ayants droit et personnes enregistrées, bornes abaissées seulement de 6h à 13h.",
    source: "https://www.lyon.fr/vie-pratique/mobilites/la-zone-trafic-limite-en-presquile",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "London (ULEZ)",
    near: {
      lat: 51.5074,
      lon: -0.1278,
      km: 25
    },
    detail: "ULEZ couvrant tous les boroughs de Londres (hors M25) : essence Euro 4 et diesel Euro 6 minimum sinon 12,50 £/jour, 24 h/24 sauf 25 décembre ; les véhicules étrangers doivent s'enregistrer auprès de TfL.",
    source: "https://tfl.gov.uk/modes/driving/ultra-low-emission-zone",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "Birmingham",
    near: {
      lat: 52.4797,
      lon: -1.9026,
      km: 1.5
    },
    detail: "Clean Air Zone de classe D : voitures et vans diesel non Euro 6 / essence non Euro 4 soumis à une redevance journalière.",
    source: "https://www.gov.uk/guidance/driving-in-a-clean-air-zone",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "Bristol",
    near: {
      lat: 51.4545,
      lon: -2.5879,
      km: 1.5
    },
    detail: "Clean Air Zone de classe D : voitures et vans diesel non Euro 6 / essence non Euro 4 soumis à une redevance journalière.",
    source: "https://www.gov.uk/guidance/driving-in-a-clean-air-zone",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "Bath",
    near: {
      lat: 51.3814,
      lon: -2.3597,
      km: 1.5
    },
    detail: "Clean Air Zone de classe C : voitures particulières non taxées, mais vans/fourgons (N1) diesel non Euro 6 ou essence non Euro 4 paient une redevance journalière (9 £ pour un campervan N1).",
    source: "https://www.bathnes.gov.uk/find-out-bath-clean-air-zone-charges",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "Bradford",
    near: {
      lat: 53.7944,
      lon: -1.7519,
      km: 4
    },
    detail: "Clean Air Zone de classe C : vans et minibus diesel non Euro 6 / essence non Euro 4 soumis à redevance ; voitures particulières non concernées.",
    source: "https://www.gov.uk/guidance/driving-in-a-clean-air-zone",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "Sheffield",
    near: {
      lat: 53.3807,
      lon: -1.4702,
      km: 2
    },
    detail: "Clean Air Zone de classe C : vans et minibus diesel non Euro 6 / essence non Euro 4 soumis à redevance ; voitures particulières non concernées.",
    source: "https://www.gov.uk/guidance/driving-in-a-clean-air-zone",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "Newcastle upon Tyne (Tyneside)",
    near: {
      lat: 54.9738,
      lon: -1.6132,
      km: 2.5
    },
    detail: "Clean Air Zone de classe C (Tyneside) : vans et minibus diesel non Euro 6 / essence non Euro 4 soumis à redevance ; voitures particulières non concernées.",
    source: "https://www.gov.uk/guidance/driving-in-a-clean-air-zone",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "Oxford (Zero Emission Zone)",
    near: {
      lat: 51.752,
      lon: -1.2577,
      km: 0.5
    },
    detail: "Zero Emission Zone pilote du centre d'Oxford : tout véhicule essence ou diesel paie 10 £/jour (hybrides 2 £) de 7h à 19h, 7 j/7 ; amende 120 £.",
    source: "https://www.oxfordshire.gov.uk/transport-and-travel/oxford-zero-emission-zone-zez/charges-oxfords-zez",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "Glasgow",
    near: {
      lat: 55.8612,
      lon: -4.2502,
      km: 1
    },
    detail: "LEZ du centre de Glasgow (contrôle depuis le 1er juin 2023) : diesel Euro 6 et essence Euro 4 obligatoires, 24 h/24, amende (PCN) sinon.",
    source: "https://www.mygov.scot/low-emission-zones",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "Edinburgh",
    near: {
      lat: 55.9533,
      lon: -3.1884,
      km: 1
    },
    detail: "LEZ du centre d'Édimbourg (contrôle depuis le 1er juin 2024) : diesel Euro 6 et essence Euro 4 obligatoires, 24 h/24, amende (PCN) sinon.",
    source: "https://www.mygov.scot/low-emission-zones",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "Dundee",
    near: {
      lat: 56.4606,
      lon: -2.9702,
      km: 1
    },
    detail: "LEZ du centre de Dundee (contrôle depuis le 30 mai 2024) : diesel Euro 6 et essence Euro 4 obligatoires, 24 h/24, amende (PCN) sinon.",
    source: "https://www.mygov.scot/low-emission-zones",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "GB",
    name: "Aberdeen",
    near: {
      lat: 57.1482,
      lon: -2.0928,
      km: 1
    },
    detail: "LEZ du centre d'Aberdeen (contrôle depuis le 1er juin 2024) : diesel Euro 6 et essence Euro 4 obligatoires, 24 h/24, amende (PCN) sinon.",
    source: "https://www.mygov.scot/low-emission-zones",
    date: "2026-09-17"
  },
  {
    type: "tunnel",
    country: "GB",
    name: "Rotherhithe Tunnel (Londres)",
    near: {
      lat: 51.5045,
      lon: -0.045,
      km: 1
    },
    detail: "Tunnel de Rotherhithe interdit aux véhicules de plus de 2 m de haut ou de large et aux utilitaires de plus de 2 t (barrières physiques, amende jusqu'à 160 £ par passage) : un van ne peut pas l'emprunter.",
    source: "https://tfl.gov.uk/modes/driving/rotherhithe-tunnel-restrictions",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "BE",
    name: "Bruxelles / Brussel",
    near: {
      lat: 50.8467,
      lon: 4.3525,
      km: 9
    },
    detail: "LEZ de la Région de Bruxelles-Capitale (19 communes, hors ring) : depuis le 1er janvier 2026, diesel Euro 6 et essence Euro 3 minimum, 24 h/24 ; véhicules étrangers soumis aux mêmes règles, pass jour 35 € (max. 24/an).",
    source: "https://lez.brussels/mytax/fr/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "BE",
    name: "Antwerpen",
    near: {
      lat: 51.2211,
      lon: 4.3997,
      km: 5
    },
    detail: "LEZ d'Anvers : diesel Euro 5 et essence Euro 2 minimum en 2026 (durcissement reporté à 2028) ; tout véhicule étranger doit être enregistré avant l'entrée ou dans les 24 h.",
    source: "https://www.slimnaarantwerpen.be/nl/lez",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "BE",
    name: "Gent",
    near: {
      lat: 51.0538,
      lon: 3.725,
      km: 2.5
    },
    detail: "LEZ de Gand (intérieur du R40) : diesel Euro 5 et essence Euro 2 minimum en 2026 (diesel Euro 6 prévu en 2028) ; tout véhicule étranger doit être enregistré.",
    source: "https://stad.gent/nl/mobiliteit-openbare-werken/lage-emissiezone/toelatingsvoorwaarden-voor-de-lage-emissiezone",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "NL",
    name: "Amsterdam",
    near: {
      lat: 52.3731,
      lon: 4.8925,
      km: 6
    },
    detail: "Milieuzone bleue d'Amsterdam : voitures et utilitaires diesel de classe d'émission 5 (Euro 5) minimum ; essence et GPL libres.",
    source: "https://www.milieuzones.nl/personen-en-bestelautos",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "NL",
    name: "Utrecht",
    near: {
      lat: 52.0907,
      lon: 5.1216,
      km: 3
    },
    detail: "Milieuzone bleue d'Utrecht : voitures diesel Euro 5 minimum ; les utilitaires sont en plus soumis à la zone zéro émission.",
    source: "https://www.milieuzones.nl/personen-en-bestelautos",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "NL",
    name: "Arnhem",
    near: {
      lat: 52.0057,
      lon: 5.8762,
      km: 2
    },
    detail: "Milieuzone bleue d'Arnhem : voitures diesel Euro 5 minimum ; depuis le 1er juin 2026 les utilitaires relèvent de la zone zéro émission.",
    source: "https://www.milieuzones.nl/personen-en-bestelautos",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "NL",
    name: "Den Haag",
    near: {
      lat: 52.08,
      lon: 4.3113,
      km: 3
    },
    detail: "Milieuzone verte de La Haye : voitures diesel Euro 4 minimum ; utilitaires soumis à la zone zéro émission.",
    source: "https://www.milieuzones.nl/personen-en-bestelautos",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DK",
    name: "København",
    near: {
      lat: 55.6867,
      lon: 12.5701,
      km: 5
    },
    detail: "Miljøzone de København : depuis le 1er octobre 2023, les voitures et minibus diesel doivent avoir un filtre à particules ou être au moins Euro 5 ; les véhicules étrangers immatriculés avant 2011 doivent être enregistrés en ligne avant l'entrée.",
    source: "https://miljoezoner.dk/en/regulations-and-vehicles/rules-for-passenger-cars/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DK",
    name: "Frederiksberg",
    near: {
      lat: 55.678,
      lon: 12.5326,
      km: 2
    },
    detail: "Miljøzone de Frederiksberg : depuis le 1er octobre 2023, les voitures et minibus diesel doivent avoir un filtre à particules ou être au moins Euro 5 ; les véhicules étrangers immatriculés avant 2011 doivent être enregistrés en ligne avant l'entrée.",
    source: "https://miljoezoner.dk/en/regulations-and-vehicles/rules-for-passenger-cars/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DK",
    name: "Aarhus",
    near: {
      lat: 56.1496,
      lon: 10.2134,
      km: 4
    },
    detail: "Miljøzone de Aarhus : depuis le 1er octobre 2023, les voitures et minibus diesel doivent avoir un filtre à particules ou être au moins Euro 5 ; les véhicules étrangers immatriculés avant 2011 doivent être enregistrés en ligne avant l'entrée.",
    source: "https://miljoezoner.dk/en/regulations-and-vehicles/rules-for-passenger-cars/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DK",
    name: "Odense",
    near: {
      lat: 55.3997,
      lon: 10.3852,
      km: 4
    },
    detail: "Miljøzone de Odense : depuis le 1er octobre 2023, les voitures et minibus diesel doivent avoir un filtre à particules ou être au moins Euro 5 ; les véhicules étrangers immatriculés avant 2011 doivent être enregistrés en ligne avant l'entrée.",
    source: "https://miljoezoner.dk/en/regulations-and-vehicles/rules-for-passenger-cars/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "DK",
    name: "Aalborg",
    near: {
      lat: 57.0463,
      lon: 9.9215,
      km: 3
    },
    detail: "Miljøzone de Aalborg : depuis le 1er octobre 2023, les voitures et minibus diesel doivent avoir un filtre à particules ou être au moins Euro 5 ; les véhicules étrangers immatriculés avant 2011 doivent être enregistrés en ligne avant l'entrée.",
    source: "https://miljoezoner.dk/en/regulations-and-vehicles/rules-for-passenger-cars/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "SE",
    name: "Stockholm – Hornsgatan",
    near: {
      lat: 59.3177,
      lon: 18.059,
      km: 1
    },
    detail: "Miljözon klass 2 sur Hornsgatan : voitures, minibus et camionnettes diesel Euro 6 obligatoires, essence Euro 5 minimum pour les plus anciennes (klass 3 du centre-ville annulée par le Länsstyrelsen en mai 2026).",
    source: "https://trafik.stockholm/trafikregler/miljozoner/miljozon-hornsgatan/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "PL",
    name: "Warszawa",
    near: {
      lat: 52.2328,
      lon: 21.0191,
      km: 4
    },
    detail: "Strefa Czystego Transportu de Varsovie, 2e phase depuis le 1er janvier 2026 : essence Euro 3 (ou 2000 et plus) et diesel Euro 5 (ou 2009 et plus) minimum ; résidents exemptés jusqu'à fin 2027.",
    source: "https://transport.um.warszawa.pl/wymogi-sct",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "PL",
    name: "Kraków",
    near: {
      lat: 50.0469,
      lon: 19.9972,
      km: 9
    },
    detail: "Strefa Czystego Transportu de Cracovie depuis le 1er janvier 2026 : essence Euro 4 (ou 2005+) et diesel ≤ 3,5 t Euro 6 (ou 2014+) ; non-résidents non conformes admis 2026–2028 moyennant 2,50 PLN/heure, amende jusqu'à 500 PLN.",
    source: "https://samorzad.gov.pl/web/powiat-proszowicki/od-1-stycznia-2026-roku-wchodzi-strefa-czystego-transportu-w-krakowie",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "PT",
    name: "Lisboa (ZER)",
    near: {
      lat: 38.7169,
      lon: -9.1399,
      km: 3
    },
    detail: "Zona de Emissões Reduzidas de Lisbonne : zone 1 (Avenida da Liberdade–Baixa) Euro 3 minimum (véhicules légers de 2000+), zone 2 véhicules de 1996+ ; amende 120 €.",
    source: "https://informacoeseservicos.lisboa.pt/servicos/detalhe/zona-de-emissoes-reduzidas-zer",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Madrid",
    near: {
      lat: 40.4168,
      lon: -3.7035,
      km: 12
    },
    detail: "ZBE « Madrid Zona de Bajas Emisiones » : véhicules sans étiquette DGT (catégorie A) interdits sur tout le territoire municipal depuis le 1er janvier 2026, 24 h/24, contrôle par caméras.",
    source: "https://www.madrid.es/portales/munimadrid/es/Inicio/Movilidad-y-transportes/Zonas-de-Bajas-Emisiones/Madrid-Zona-de-Bajas-Emisiones/Madrid-Zona-de-Bajas-Emisiones-ZBE-/?vgnextfmt=default&vgnextoid=93e63877029eb710VgnVCM1000001d4a900aRCRD&vgnextchannel=d2d2edf0f70ab710VgnVCM2000001f4a900aRCRD",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Barcelona (ZBE Rondes)",
    near: {
      lat: 41.3826,
      lon: 2.1771,
      km: 8
    },
    detail: "ZBE Rondes de Barcelone : véhicules sans étiquette DGT interdits du lundi au vendredi 7h–20h ; véhicules étrangers à enregistrer auprès de l'AMB (autorisation 2 ans si équivalence, sinon 24 h, max. 24/an).",
    source: "https://www.amb.cat/es/web/mobilitat/mobilitat-sostenible/zbe/zones-baixes-emissions/la-zbe",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "València",
    near: {
      lat: 39.4697,
      lon: -0.3763,
      km: 5
    },
    detail: "ZBE de Valence : sanctions depuis le 1er décembre 2025 (200 € depuis le 1er janvier 2026) pour les véhicules sans étiquette non immatriculés dans la province de Valence ; extension prévue en 2027 et 2028.",
    source: "https://www.autopista.es/noticias-motor/como-te-afecta-zbe-valencia-en-2026-restricciones-multas-como-evitar-sanciones_321531_102.html",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Bilbao",
    near: {
      lat: 43.263,
      lon: -2.935,
      km: 1.5
    },
    detail: "ZBE de Bilbao : depuis le 1er janvier 2026, véhicules sans étiquette (A) interdits d'accès, de circulation et de stationnement, sauf exceptions de l'ordonnance.",
    source: "https://www.eleconomista.es/transportes-turismo/noticias/13710009/12/25/los-vehiculos-con-etiqueta-a-o-sin-etiqueta-que-accedan-a-la-zbe-de-bilbao-seran-multados-a-partir-del-1-de-enero.html",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Donostia / San Sebastián",
    near: {
      lat: 43.3224,
      lon: -1.9839,
      km: 1.2
    },
    detail: "ZBE du centre de Donostia (1,2 km², en vigueur depuis le 14 décembre 2024) : véhicules sans étiquette interdits 24 h/24, amende 200 € ; étiquette B interdite à partir de 2028.",
    source: "https://www.donostia.eus/es/movilidad/zona-bajas-emisiones/vehiculos-afectados",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Vitoria-Gasteiz",
    near: {
      lat: 42.8506,
      lon: -2.6614,
      km: 1.5
    },
    detail: "ZBE de Vitoria-Gasteiz : véhicules sans étiquette (A) interdits, sanctions (200 €) depuis le 15 décembre 2025, contrôle par caméras.",
    source: "https://www.vitoria-gasteiz.org/wb021/was/contenidoAction.do?idioma=en&uid=u7627e050_18b933a5b58__2031",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Pamplona / Iruña – Casco Antiguo",
    near: {
      lat: 42.8183,
      lon: -1.644,
      km: 1
    },
    detail: "ZBE du Casco Antiguo de Pampelune depuis le 1er janvier 2026 (sanctions dès le 1er mai 2026) : véhicules sans étiquette DGT interdits sauf résidents et autorisés.",
    source: "https://www.pamplona.es/zona-de-bajas-emisiones-de-pamplona",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Málaga",
    near: {
      lat: 36.7648,
      lon: -4.4422,
      km: 2
    },
    detail: "ZBE de Málaga : depuis le 30 novembre 2025, véhicules sans étiquette non domiciliés à Málaga interdits (amende 200 €), contrôle par caméras.",
    source: "https://www.cope.es/emisoras/andalucia/malaga-provincia/malaga/noticias/multas-200-euros-acceder-indebidamente-zona-bajas-emisiones-malaga-vehiculos-podran-entrar-tendran-prohibido-20251119_3255487.html",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Granada",
    near: {
      lat: 37.1735,
      lon: -3.5995,
      km: 3
    },
    detail: "ZBE de Grenade (23,55 km²) : depuis le 1er octobre 2025, véhicules sans étiquette immatriculés hors de la commune interdits 24 h/24, amende 200 €.",
    source: "http://www.movilidadgranada.com/zbe.php",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Zaragoza",
    near: {
      lat: 41.6916,
      lon: -0.9101,
      km: 2
    },
    detail: "ZBE de Saragosse : depuis le 12 décembre 2025, véhicules sans étiquette DGT interdits du lundi au vendredi 8h–20h (amende 200 €) ; les véhicules étrangers doivent s'inscrire au registre municipal.",
    source: "https://www.zaragoza.es/sede/portal/movilidad/bajas-emisiones/faq",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Sevilla – Isla de la Cartuja",
    near: {
      lat: 37.405,
      lon: -6.005,
      km: 1.5
    },
    detail: "ZBE de la Cartuja (Séville) : véhicules sans étiquette interdits les jours ouvrables de 7h à 19h, amende 200 €.",
    source: "https://www.race.es/zonas-de-bajas-emisiones/mapa-zbe-sevilla",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Palma",
    near: {
      lat: 39.5696,
      lon: 2.6502,
      km: 2
    },
    detail: "ZBE du centre de Palma : véhicules sans étiquette interdits 24 h/24, amende 200 € depuis janvier 2026 ; procédure spécifique pour véhicules étrangers.",
    source: "https://mobipalma.mobi/ca/informacio-zona-baixes-emissions-zbe-2/vehicles-estrangers/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ES",
    name: "Ourense",
    near: {
      lat: 42.194,
      lon: -7.5371,
      km: 1
    },
    detail: "ZBE d'Ourense : accès sans étiquette environnementale ni permis municipal sanctionné de 200 € depuis le 1er juillet 2026.",
    source: "https://www.motor16.com/las-ultimas-noticias/zbe-ourense-multa-200-euros/",
    date: "2026-09-17"
  },
  {
    type: "road",
    country: "ES",
    name: "Cap de Formentor (Mallorca)",
    near: {
      lat: 39.935,
      lon: 3.15,
      km: 12
    },
    detail: "Route Port de Pollença – phare de Formentor fermée aux véhicules privés non autorisés du 15 mai au 15 octobre 2026, de 10h à 22h (accès en transport public, vélo ou à pied).",
    source: "https://www.conselldemallorca.es/es/noticia1/-/asset_publisher/0kVpLMnZrHVi/content/les-restriccions-de-circulaci%C3%B3-a-formentor-es-mantindran-de-l-1-de-juny-al-30-d-octubre-durant-el-2026/695139",
    date: "2026-09-17"
  },
  {
    type: "road",
    country: "ES",
    name: "Lagos de Covadonga (CO-4)",
    near: {
      lat: 43.29,
      lon: -5.03,
      km: 8
    },
    detail: "Route CO-4 vers les lacs de Covadonga fermée aux véhicules privés lors des périodes régulées 2026 (Pâques, week-ends de mai, 1er juin–18 octobre sauf quelques jours, Toussaint), accès en bus depuis Cangas de Onís.",
    source: "https://www.ctaconecta.com/es/noticias/detalle/Visitar-los-Lagos-de-Covadonga-en-2026/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "IT",
    name: "Milano – Area B",
    near: {
      lat: 45.4642,
      lon: 9.1896,
      km: 8
    },
    detail: "Area B (quasi tout Milan) : lundi–vendredi 7h30–19h30, véhicules les plus polluants interdits ; diesel Euro 6 admis jusqu'au 30 septembre 2028, essence Euro 4 jusqu'au 1er octobre 2028 ; plaque vérifiable sur le portail de la commune.",
    source: "https://www.comune.milano.it/en/argomenti/mobilita/area-b",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Milano – Area C",
    near: {
      lat: 45.4642,
      lon: 9.19,
      km: 1.2
    },
    detail: "Area C (Cerchia dei Bastioni) : péage 7,50 €/jour, tous les jours 7h30–19h30 ; diesel jusqu'à Euro 5 interdits (Euro 6 admis jusqu'au 30 septembre 2028).",
    source: "https://www.comune.milano.it/en/argomenti/mobilita/area-c",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "IT",
    name: "Roma – Fascia Verde",
    near: {
      lat: 41.8933,
      lon: 12.4829,
      km: 8
    },
    detail: "ZTL Fascia Verde de Rome (1er nov. 2025–31 oct. 2026) : diesel pré-Euro 1 à Euro 3 interdits du lundi au samedi 24 h/24 ; diesel Euro 4 interdits 7h30–20h30 à partir du 1er novembre 2026 ; Euro 5–6 diesel interdits en alerte rouge.",
    source: "https://roma.luceverde.it/articles/piattaforma-115648b9-6b59-4e87-a5cf-81e7a9880609-1839126",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Roma – ZTL Centro Storico",
    near: {
      lat: 41.8986,
      lon: 12.4769,
      km: 1.5
    },
    detail: "ZTL Centro Storico de Rome : accès non autorisé verbalisé par caméras (23 portiques) du lundi au vendredi 6h30–18h et samedi 14h–18h, plus ZTL nocturne vendredi et samedi 23h–3h.",
    source: "https://romamobilita.it/infomobilita/ztl-tutti-gli-orari/",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Firenze",
    near: {
      lat: 43.771,
      lon: 11.255,
      km: 1.5
    },
    detail: "ZTL du centre historique de Florence (secteurs A, B, O, F, G) : lundi–vendredi 7h30–20h et samedi 7h30–16h, ZTL nocturne estivale jeudi–samedi 23h–3h (avril–octobre), portiques à lecture de plaques.",
    source: "https://mobilita.comune.fi.it/muoversi/muoversi/ztl.html",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Bologna",
    near: {
      lat: 44.494,
      lon: 11.343,
      km: 1.5
    },
    detail: "ZTL du centre historique de Bologne contrôlée par le système Sirio tous les jours de 7h à 20h (couloirs bus et zones piétonnes contrôlés 24 h/24 par RITA).",
    source: "https://www.bolognawelcome.com/it/altro/altro/ztl-centro-storico",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Pisa",
    near: {
      lat: 43.72,
      lon: 10.401,
      km: 1
    },
    detail: "ZTL du centre historique de Pise (zones A à D) contrôlée par caméras 24 h/24 tous les jours, accès interdit aux véhicules non autorisés (hors deux-roues motorisés).",
    source: "https://varchi.pisamo.it/portaleztl/",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Siena",
    near: {
      lat: 43.3186,
      lon: 11.3306,
      km: 1
    },
    detail: "ZTL du centre historique de Sienne : accès réservé aux autorisés ; clients d'hébergements autorisés si la structure enregistre la plaque (dans les 3 jours ouvrables).",
    source: "https://www.comune.siena.it/servizi/accesso-ztl-persone-fisiche",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Lucca",
    near: {
      lat: 43.843,
      lon: 10.505,
      km: 1
    },
    detail: "ZTL intra-muros de Lucques active 24 h/24 tous les jours, contrôlée par portiques électroniques entièrement opérationnels depuis le 19 janvier 2026.",
    source: "https://www.comune.lucca.it/argomento/ztl/",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Torino – ZTL Centrale",
    near: {
      lat: 45.0703,
      lon: 7.6869,
      km: 1
    },
    detail: "ZTL Centrale de Turin : circulation et stationnement interdits aux non-autorisés du lundi au vendredi de 7h30 à 10h30 (accès permis pour rejoindre un parking en ouvrage).",
    source: "https://www.comune.torino.it/schede-informative/ztl-centrale",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Napoli – Centro Antico",
    near: {
      lat: 40.85,
      lon: 14.256,
      km: 1
    },
    detail: "ZTL du Centro Antico de Naples : portiques via Miroballo, via Duomo et via Santa Sofia actifs tous les jours 9h–17h, via del Sole jusqu'à 22h (24h/2h le week-end).",
    source: "https://www.comune.napoli.it/articolo_tematico/trasporti-mobilita/ztl-e-aree-pedonali/ztl-del-centro-antico/",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Verona",
    near: {
      lat: 45.44,
      lon: 10.993,
      km: 1
    },
    detail: "ZTL du centre historique de Vérone contrôlée par portiques ; clients d'hôtel autorisés via communication de la plaque, régime renforcé depuis le 28 octobre 2024.",
    source: "https://www.comune.verona.it/Novita/Notizie/La-Zona-a-Traffico-Limitato-di-Verona",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Padova",
    near: {
      lat: 45.4078,
      lon: 11.876,
      km: 1
    },
    detail: "ZTL du centre de Padoue : zone A interdite en semaine 8h–23h30 (fériés 14h–23h30), zone B interdite 24 h/24 ; 7 portiques électroniques.",
    source: "https://www.comune.padova.it/zona-traffico-limitato-ztl-centro-storico",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Bergamo – Città Alta",
    near: {
      lat: 45.7037,
      lon: 9.6625,
      km: 0.6
    },
    detail: "ZTL permanente du centre historique de Città Alta (24 h/24) ; ZTL élargie « Città Alta e Colli » les dimanches et fériés 10h–24h et les soirs d'été.",
    source: "https://www.comune.bergamo.it/node/748000",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Palermo",
    near: {
      lat: 38.1157,
      lon: 13.3615,
      km: 1.3
    },
    detail: "ZTL du centre historique de Palerme active du lundi au vendredi 8h–20h : accès avec pass payant (journalier ou périodique) via le portail ou l'app « ZTL Palermo », libre le week-end.",
    source: "https://www.comune.palermo.it/servizio/richiedere-permesso-di-accesso-ad-area-ztl-31/",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "San Gimignano",
    near: {
      lat: 43.4677,
      lon: 11.0432,
      km: 0.4
    },
    detail: "Nouvelle ZTL du centre historique contrôlée par caméras aux 6 portes, sanctions depuis le 1er mai 2026 ; camping-cars orientés vers l'aire de Santa Chiara.",
    source: "https://www.comune.sangimignano.si.it/it/news/ztl-centro-storico-di-san-gimignano",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Parma",
    near: {
      lat: 44.8015,
      lon: 10.3279,
      km: 1
    },
    detail: "ZTL du centre historique de Parme (3 micro-zones) contrôlée par 5 portiques à caméras ; accès des non-résidents avec titre journalier ou de 2 heures activé avant l'entrée.",
    source: "https://www.infomobility.pr.it/en/electronic-gates-and-ltz/",
    date: "2026-09-17"
  },
  {
    type: "ztl",
    country: "IT",
    name: "Perugia",
    near: {
      lat: 43.1122,
      lon: 12.3888,
      km: 0.7
    },
    detail: "ZTL du centre historique de Pérouse active du lundi au vendredi 0h–13h et les week-ends/fériés 0h–7h (portique via del Roscetto 20h–16h), 14 portiques.",
    source: "https://www.comune.perugia.it/luogo/ztl-zone-a-traffico-limitato/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "IT",
    name: "Brescia",
    near: {
      lat: 45.5416,
      lon: 10.2118,
      km: 5
    },
    detail: "Mesures permanentes de Lombardie (commune de Fascia 1) : diesel jusqu'à Euro 4 et essence Euro 0–1 interdits en semaine 7h30–19h30 ; voitures diesel Euro 5 interdites à partir du 1er octobre 2026 (utilitaires N1 en 2027).",
    source: "https://www.regione.lombardia.it/ambiente-e-territorio/qualita-dell-aria/misure-permanenti-per-migliorare-la-qualita-dell-aria",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "IT",
    name: "Monza",
    near: {
      lat: 45.5845,
      lon: 9.2744,
      km: 4
    },
    detail: "Mesures permanentes de Lombardie (commune de Fascia 1) : diesel jusqu'à Euro 4 et essence Euro 0–1 interdits en semaine 7h30–19h30 ; voitures diesel Euro 5 interdites à partir du 1er octobre 2026 (utilitaires N1 en 2027).",
    source: "https://www.regione.lombardia.it/ambiente-e-territorio/qualita-dell-aria/misure-permanenti-per-migliorare-la-qualita-dell-aria",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "IT",
    name: "Bologna (antismog Émilie-Romagne)",
    near: {
      lat: 44.4938,
      lon: 11.3426,
      km: 6
    },
    detail: "Mesures antismog d'Émilie-Romagne à Bologna (saison 1er octobre–31 mars) : diesel jusqu'à Euro 4 et essence jusqu'à Euro 2 interdits du lundi au vendredi 8h30–18h30 ; diesel Euro 5 interdit aussi lors des épisodes d'urgence et dimanches écologiques (interdiction structurelle Euro 5 suspendue en septembre 2026).",
    source: "https://mobilita.regione.emilia-romagna.it/notizie/2025/settembre/dal-1-ottobre-tornano-in-emilia-romagna-le-misure-antismog",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "IT",
    name: "Modena (antismog Émilie-Romagne)",
    near: {
      lat: 44.6471,
      lon: 10.9252,
      km: 4
    },
    detail: "Mesures antismog d'Émilie-Romagne à Modena (saison 1er octobre–31 mars) : diesel jusqu'à Euro 4 et essence jusqu'à Euro 2 interdits du lundi au vendredi 8h30–18h30 ; diesel Euro 5 interdit aussi lors des épisodes d'urgence et dimanches écologiques (interdiction structurelle Euro 5 suspendue en septembre 2026).",
    source: "https://mobilita.regione.emilia-romagna.it/notizie/2025/settembre/dal-1-ottobre-tornano-in-emilia-romagna-le-misure-antismog",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "IT",
    name: "Parma (antismog Émilie-Romagne)",
    near: {
      lat: 44.8015,
      lon: 10.3279,
      km: 4
    },
    detail: "Mesures antismog d'Émilie-Romagne à Parma (saison 1er octobre–31 mars) : diesel jusqu'à Euro 4 et essence jusqu'à Euro 2 interdits du lundi au vendredi 8h30–18h30 ; diesel Euro 5 interdit aussi lors des épisodes d'urgence et dimanches écologiques (interdiction structurelle Euro 5 suspendue en septembre 2026).",
    source: "https://mobilita.regione.emilia-romagna.it/notizie/2025/settembre/dal-1-ottobre-tornano-in-emilia-romagna-le-misure-antismog",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "IT",
    name: "Reggio Emilia (antismog Émilie-Romagne)",
    near: {
      lat: 44.6983,
      lon: 10.6312,
      km: 4
    },
    detail: "Mesures antismog d'Émilie-Romagne à Reggio Emilia (saison 1er octobre–31 mars) : diesel jusqu'à Euro 4 et essence jusqu'à Euro 2 interdits du lundi au vendredi 8h30–18h30 ; diesel Euro 5 interdit aussi lors des épisodes d'urgence et dimanches écologiques (interdiction structurelle Euro 5 suspendue en septembre 2026).",
    source: "https://mobilita.regione.emilia-romagna.it/notizie/2025/settembre/dal-1-ottobre-tornano-in-emilia-romagna-le-misure-antismog",
    date: "2026-09-17"
  },
  {
    type: "road",
    country: "IT",
    name: "Costiera Amalfitana – SS163",
    near: {
      lat: 40.634,
      lon: 14.603,
      km: 20
    },
    detail: "SS163 Amalfitana (Positano–Vietri sul Mare) : autocaravanes et caravanes interdites dans les deux sens de 6h30 à 24h (ordonnance ANAS 337/2019), plus circulation alternée selon parité de plaque 10h–18h de juin à octobre (ordonnance 340/2019).",
    source: "https://www.ilvescovado.it/it/notizie-lifestyle-47/traffico-in-tilt-sulla-ss163-amalfitana-in-coda-154032/article",
    date: "2026-09-17"
  },
  {
    type: "road",
    country: "IT",
    name: "Lago di Braies / Pragser Wildsee",
    near: {
      lat: 46.6945,
      lon: 12.0853,
      km: 5
    },
    detail: "Vallée de Braies : du 1er juillet au 15 septembre 2026, accès en véhicule propre de 9h à 16h uniquement avec réservation en ligne (billet combiné parking + transit).",
    source: "https://www.alto-adige.com/informazioni-utili/raggiungere-il-lago-di-braies",
    date: "2026-09-17"
  },
  {
    type: "road",
    country: "IT",
    name: "Alpe di Siusi / Seiser Alm",
    near: {
      lat: 46.5405,
      lon: 11.615,
      km: 6
    },
    detail: "Route de l'Alpe di Siusi fermée aux véhicules privés de 9h à 17h pendant les saisons réglementées (arriver avant 9h pour les parkings, sinon télécabine ou bus).",
    source: "https://www.seiseralm.it/en/info-service/mobility/access-to-seiser-alm.html",
    date: "2026-09-17"
  },
  {
    type: "pass",
    country: "IT",
    name: "Tre Cime di Lavaredo – route à péage",
    near: {
      lat: 46.6124,
      lon: 12.2956,
      km: 5
    },
    detail: "Route à péage du Rifugio Auronzo : réservation obligatoire en 2026 (auronzo.info), camping-car 60 € contre 40 € pour une voiture, billet valable 12 h.",
    source: "https://www.dolomiti.it/en/auronzo-misurina/news/toll-road-tre-cime-di-lavaredo-open",
    date: "2026-09-17"
  },
  {
    type: "tunnel",
    country: "FR",
    name: "Tunnel routier du Fréjus",
    near: {
      lat: 45.137,
      lon: 6.695,
      km: 8
    },
    detail: "Tunnel du Fréjus (tarifs 2026) : classe 2 (hauteur 2–3 m) 73,40 € l'aller simple, mais classe 3 (2 essieux, hauteur > 3 m) 201,50 € ; hauteur maximale 4,30 m.",
    source: "https://www.sftrf.fr/wp-content/uploads/2025/12/Tarifs_tunnel_2026_FR.pdf",
    date: "2026-09-17"
  },
  {
    type: "tunnel",
    country: "FR",
    name: "Tunnel du Mont-Blanc",
    near: {
      lat: 45.853,
      lon: 6.895,
      km: 8
    },
    detail: "Tunnel du Mont-Blanc (tarifs 2026) : classe 1 (≤ 2 m) 55,50 €, classe 2 « camping-cars, grands utilitaires » (2–3 m, ≤ 3,5 t) 73,40 € l'aller France→Italie ; au-delà de 3 m, tarif poids lourd.",
    source: "https://www.atmb.com/telepeage-tarifs/les-tarifs-au-tunnel-du-mont-blanc-pour-les-vehicules-legers/",
    date: "2026-09-17"
  },
  {
    type: "tunnel",
    country: "FR",
    name: "Tunnel du col de Tende",
    near: {
      lat: 44.154,
      lon: 7.564,
      km: 5
    },
    detail: "Nouveau tunnel de Tende en circulation alternée à créneaux horaires limités (semaine 6h–8h, 12h30–13h30, 18h–21h mi-septembre 2026) et fermé du 21 septembre au 29 octobre 2026 pour travaux.",
    source: "https://www.tunneltenda.it/language/fr/home-francais/",
    date: "2026-09-17"
  },
  {
    type: "road",
    country: "AT",
    name: "Innsbruck / Innsbruck-Land",
    near: {
      lat: 47.2692,
      lon: 11.4041,
      km: 20
    },
    detail: "Interdictions de délestage du district de Innsbruck / Innsbruck-Land (1er mai–1er novembre 2026) : routes secondaires fermées au trafic de transit les samedis, dimanches, jours fériés et certains ponts de 7h à 19h ; seuls riverains et trafic à destination/au départ (hôtes arrivant/partant) sont autorisés.",
    source: "https://www.tirol.gv.at/verkehr/verkehrs-und-seilbahnrecht/verkehrsbeschraenkungen/verordnungen-fahrverbote/verordnung/sommerfahrverbote-fuer-den-ausweichverkehr-starten-mit-1-mai-2026/",
    date: "2026-09-17"
  },
  {
    type: "road",
    country: "AT",
    name: "Kufstein",
    near: {
      lat: 47.583,
      lon: 12.17,
      km: 20
    },
    detail: "Interdictions de délestage du district de Kufstein (1er mai–1er novembre 2026) : routes secondaires fermées au trafic de transit les samedis, dimanches, jours fériés et certains ponts de 7h à 19h ; seuls riverains et trafic à destination/au départ (hôtes arrivant/partant) sont autorisés.",
    source: "https://www.tirol.gv.at/verkehr/verkehrs-und-seilbahnrecht/verkehrsbeschraenkungen/verordnungen-fahrverbote/verordnung/sommerfahrverbote-fuer-den-ausweichverkehr-starten-mit-1-mai-2026/",
    date: "2026-09-17"
  },
  {
    type: "road",
    country: "AT",
    name: "Imst",
    near: {
      lat: 47.2452,
      lon: 10.7398,
      km: 20
    },
    detail: "Interdictions de délestage du district de Imst (1er mai–1er novembre 2026) : routes secondaires fermées au trafic de transit les samedis, dimanches, jours fériés et certains ponts de 7h à 19h ; seuls riverains et trafic à destination/au départ (hôtes arrivant/partant) sont autorisés.",
    source: "https://www.tirol.gv.at/verkehr/verkehrs-und-seilbahnrecht/verkehrsbeschraenkungen/verordnungen-fahrverbote/verordnung/sommerfahrverbote-fuer-den-ausweichverkehr-starten-mit-1-mai-2026/",
    date: "2026-09-17"
  },
  {
    type: "road",
    country: "AT",
    name: "Reutte",
    near: {
      lat: 47.485,
      lon: 10.719,
      km: 20
    },
    detail: "Interdictions de délestage du district de Reutte (1er mai–1er novembre 2026) : routes secondaires fermées au trafic de transit les samedis, dimanches, jours fériés et certains ponts de 7h à 19h ; seuls riverains et trafic à destination/au départ (hôtes arrivant/partant) sont autorisés.",
    source: "https://www.tirol.gv.at/verkehr/verkehrs-und-seilbahnrecht/verkehrsbeschraenkungen/verordnungen-fahrverbote/verordnung/sommerfahrverbote-fuer-den-ausweichverkehr-starten-mit-1-mai-2026/",
    date: "2026-09-17"
  },
  {
    type: "road",
    country: "IS",
    name: "Hautes Terres – routes F (Hálendi)",
    near: {
      lat: 64.85,
      lon: -18.5,
      km: 170
    },
    detail: "Routes de montagne « F » des Hautes Terres réservées par la loi aux véhicules 4x4, ouvertes seulement l'été (généralement mi-juin à septembre) ; un van 2 roues motrices y est interdit.",
    source: "https://www.atlasiceland.com/guides/f-road-rules-fines-and-legal-requirements",
    date: "2026-09-17"
  },
  {
    type: "pass",
    country: "ZA",
    name: "Sani Pass",
    near: {
      lat: -29.6,
      lon: 29.34,
      km: 10
    },
    detail: "Sani Pass (Afrique du Sud–Lesotho) : ~9 km non revêtus entre les postes-frontières, 4x4 exigé et contrôlé au poste sud-africain ; postes ouverts 6h–18h.",
    source: "https://www.mountainpassessouthafrica.co.za/find-a-pass/kwazulu-natal/410-sani-pass.html",
    date: "2026-09-17"
  },
  {
    type: "pass",
    country: "US",
    name: "Going-to-the-Sun Road (Glacier NP)",
    near: {
      lat: 48.6966,
      lon: -113.7183,
      km: 25
    },
    detail: "Going-to-the-Sun Road : véhicules de plus de 21 pieds (6,40 m, pare-chocs compris) ou plus de 8 pieds de large (2,44 m, rétroviseurs compris) interdits entre Avalanche Creek et Rising Sun ; au-delà de 10 pieds (3,05 m) de haut, surplombs rocheux à l'ouest de Logan Pass.",
    source: "https://www.nps.gov/glac/planyourvisit/gtsrinfo.htm",
    date: "2026-09-17"
  },
  {
    type: "tunnel",
    country: "US",
    name: "Zion–Mount Carmel Tunnel (Zion NP)",
    near: {
      lat: 37.2134,
      lon: -112.942,
      km: 8
    },
    detail: "Depuis le 7 juin 2026, véhicules de plus de 7'10\" de large (2,39 m), 11'4\" de haut (3,45 m), 35'9\" de long ou 50 000 lb interdits entre Canyon Junction et l'entrée Est (plus de permis tunnel) ; vérifier la largeur rétroviseurs compris.",
    source: "https://www.nps.gov/zion/learn/news/2026-01-05-large-vehicles.htm",
    date: "2026-09-17"
  },
  {
    type: "tunnel",
    country: "US",
    name: "Needles Highway – Needles Eye Tunnel",
    near: {
      lat: 43.8398,
      lon: -103.5402,
      km: 8
    },
    detail: "Needles Highway (Custer State Park) : tunnel Needles Eye de 8'0\" de large × 9'9\" de haut (2,44 × 2,97 m) et Iron Creek Tunnel 8'9\" × 10'10\" ; route fermée l'hiver.",
    source: "https://www.custerresorts.com/activities/scenic-drives/needles-highway",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "KR",
    name: "Séoul – Green Transport Zone",
    near: {
      lat: 37.57,
      lon: 126.985,
      km: 3
    },
    detail: "Green Transport Zone à l'intérieur des remparts de Séoul (Hanyangdoseong) : véhicules de grade d'émission 5 sans filtre interdits tous les jours de 6h à 21h depuis le 1er décembre 2019, amende 250 000 wons par jour.",
    source: "https://english.seoul.go.kr/seoul-to-control-grade-5-vehicles-of-emission-gas-in-green-transport-zones-from-dec-1/",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "JP",
    name: "Tokyo (règlement diesel)",
    near: {
      lat: 35.6895,
      lon: 139.6917,
      km: 40
    },
    detail: "Règlement diesel de Tokyo et des préfectures de Saitama, Chiba et Kanagawa (depuis octobre 2003) : camions, bus et véhicules à usage spécial diesel ne respectant pas la norme de particules interdits de circulation, y compris immatriculés ailleurs (amende jusqu'à 500 000 ¥) ; voitures particulières non concernées.",
    source: "https://dieselnet.com/standards/jp/tokyofit.php",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "CN",
    name: "Beijing (plaques non locales)",
    near: {
      lat: 39.9042,
      lon: 116.4074,
      km: 30
    },
    detail: "Pékin : véhicules non immatriculés à Pékin soumis au permis d'entrée (进京证, 12 fois/an, 7 jours max.) à l'intérieur du 6e périphérique, et interdits à tout moment dans le 2e périphérique.",
    source: "https://baike.baidu.com/en/item/Beijing%20Entrance%20Permit/1477836",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "CN",
    name: "Shanghai (plaques non locales)",
    near: {
      lat: 31.2304,
      lon: 121.4737,
      km: 12
    },
    detail: "Shanghai : voitures à plaques non shanghaïennes interdites sur les voies express surélevées aux heures réglementées en semaine et, depuis mai 2021, dans le périphérique intérieur de 7h à 10h et de 16h à 19h (hors week-ends et fériés).",
    source: "https://www.shanghai.gov.cn/nw12344/20210425/3d689cc0aab947598c4504c6e988801d.html",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "MX",
    name: "Ciudad de México (Hoy No Circula)",
    near: {
      lat: 19.4326,
      lon: -99.1332,
      km: 20
    },
    detail: "Hoy No Circula (CDMX et zone métropolitaine) : véhicules à plaques étrangères ou d'autres États interdits du lundi au vendredi 5h–11h et le samedi, sauf pase turístico gratuit (7 ou 14 jours) ou hologramme 0/00.",
    source: "https://www.hoy-no-circula.com.mx/foraneos",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "CO",
    name: "Bogotá (Pico y Placa)",
    near: {
      lat: 4.711,
      lon: -74.0721,
      km: 15
    },
    detail: "Pico y placa de Bogotá : voitures particulières restreintes selon le dernier chiffre de plaque du lundi au vendredi 6h–21h, et en 2026 aussi le samedi 6h–21h pour les véhicules immatriculés hors de Bogotá (exemption payante « pico y placa solidario »).",
    source: "https://bogota.gov.co/mi-ciudad/movilidad/asi-sera-el-pico-y-placa-para-vehiculos-matriculados-fuera-de-bogota",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "BR",
    name: "São Paulo (Rodízio)",
    near: {
      lat: -23.5505,
      lon: -46.6333,
      km: 10
    },
    detail: "Rodízio municipal du Centro Expandido de São Paulo : voitures et camions interdits selon le dernier chiffre de plaque (lundi 1-2 … vendredi 9-0) de 7h à 10h et de 17h à 20h en semaine, quelle que soit l'origine de la plaque.",
    source: "https://prefeitura.sp.gov.br/web/mobilidade/w/autorizacoes_especiais/isencao_de_rodizio/3921",
    date: "2026-09-17"
  },
  {
    type: "lez",
    country: "ID",
    name: "Jakarta (Ganjil-Genap)",
    near: {
      lat: -6.2088,
      lon: 106.8456,
      km: 10
    },
    detail: "Ganjil-genap de Jakarta : sur 25 axes, voitures à plaque paire/impaire autorisées seulement les jours de même parité, du lundi au vendredi 6h–10h et 16h–21h (amende jusqu'à 500 000 Rp).",
    source: "https://otomotif.kompas.com/read/2026/09/07/061200615/cek-jadwal-dan-lokasi-ganjil-genap-jakarta-pekan-ini",
    date: "2026-09-17"
  }
];
