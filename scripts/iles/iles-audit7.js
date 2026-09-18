// Groupe « 7e audit » (18 septembre 2026) — huit lieux insulaires que le moteur rendait accessibles PAR LA ROUTE.
//
// Vérification, lieu par lieu : recensements officiels (PhilAtlas, Wikipédia chinoise/grecque/indonésienne), longueurs
// de voirie mesurées dans OpenStreetMap par boîte de coordonnées, et recherche d'un ferry TRANSPORTANT LES VÉHICULES.
// Un bangka philippin, une vedette rapide thaïlandaise, un bateau d'excursion ou un navire de desserte bimensuel ne
// transportent pas de voiture : sans liaison véhicule à tarif officiel publié, l'île reste ISOLÉE — un road trip ne
// peut ni y arriver ni en partir, ce qui est la vérité du terrain, plutôt qu'une route inventée à travers la mer.
//
// Les règles sont placées EN TÊTE des règles de leur pays (voir build-island-rules.js) : elles doivent passer avant
// les grandes clés par code postal (`panay`, `cebu`, `leyteSamar`) qui rattachaient ces lieux à une grande île.
module.exports = {
  ferries: [
    {
      "a": "izena", "b": "okinawa",
      "routeKey": "untenNakada",
      "name": "Unten (Nakijin) ↔ Nakada",
      "operator": "Village d'Izena (フェリーいぜな尚円)",
      "durationH": 0.92,
      "distanceKm": 28,
      "priceByClass": { "1": 35.71, "2": 64.76, "5": 12.1, "foot": 9.9 },
      "currency": "JPY",
      "original": { "car": 6640, "van": 12040, "moto": 2250, "foot": 1840 },
      "source": "https://vill.izena.okinawa.jp/about/access/",
      "date": "2026-09-17",
      "note": "Grille du village d'Izena en vigueur depuis le 1er octobre 2019 (https://vill.izena.okinawa.jp/userfiles/files/201910071630.pdf), tarifs fixés par arrêté : ni grille saisonnière ni surcharge carburant. Adulte 1 840 JPY ; voiture 4-5 m 8 480 conducteur inclus -> 6 640 ; van 6-7 m 13 880 -> 12 040 ; moto 2 250 (pilote en sus). Converti à 185,92 JPY pour 1 EUR (InforEuro, septembre 2026), comme les autres liaisons japonaises. Durée 55 min annoncée par la commune ; distance orthodromique quai à quai. Taxe environnementale de 100 JPY par personne, hors grille, non comptée ici."
    },
    {
      "a": "iheya", "b": "okinawa",
      "routeKey": "untenMaedomari",
      "name": "Unten (Nakijin) ↔ Maedomari",
      "operator": "Village d'Iheya (フェリーいへやⅢ)",
      "durationH": 1.33,
      "distanceKm": 40,
      "priceByClass": { "1": 42.28, "2": 108.43, "5": 22.32, "foot": 13.34 },
      "currency": "JPY",
      "original": { "car": 7860, "van": 20160, "moto": 4150, "foot": 2480 },
      "source": "https://www.vill.iheya.okinawa.jp/soshiki/9/1144.html",
      "date": "2026-09-17",
      "note": "Grille du village d'Iheya (voir aussi https://iheyazima-kankou.jp/access/). Adulte 2 480 JPY ; voiture 4-5 m 10 340 -> 7 860 ; van 6-7 m 22 640 -> 20 160 ; moto 4 150. Même taux de change que les autres liaisons japonaises (185,92 JPY pour 1 EUR). Durée 80 min annoncée par la commune. Noho-jima est reliée à Iheya par le pont Noho Ōhashi (320 m, 2004, https://www.okinawastory.jp/spot/600010400) : même masse terrestre, pas de liaison maritime propre."
    }
  ],
  landmassRules: {
    PH: [
      // Islas de Gigantes (Carles, Iloilo) : Gigantes Norte (Asluman, Granada) et Gigantes Sur (Gabi, Lantangan),
      // 13 000 habitants au recensement 2020, aucune route entre les deux îles, aucun ferry véhicule — seulement des
      // pump boats depuis Bancal (1 h à 1 h 30, 100-120 ₱). Elles étaient rattachées à `panay` par le code postal 5019.
      { key: 'gigantesNorte', match: { box: [[11.61, 11.65, 123.33, 123.37]] }, note: 'Gigantes Norte (Granada, Asluman), île sans liaison véhicule.' },
      { key: 'gigantesSur', match: { box: [[11.575, 11.605, 123.315, 123.35]] }, note: 'Gigantes Sur (Gabi, Lantangan), île sans liaison véhicule ; séparée de Gigantes Norte, sans route entre les deux.' },
      { key: '*', match: { box: [[11.50, 11.56, 123.21, 123.24]] }, note: 'Îlots de Carles (Tenigban, Buenavista) : chaque lieu isolé.' },
      // Île de Kinatarkan / Guintacan (Santa Fe, Cebu) : Hagdan (3 957 hab., 2020) et Waga, 23,5 km de voirie sur
      // place, aucune route vers Cebu ni Bantayan. Le RoRo Hagnaya ↔ Santa Fe dessert Bantayan, à 12 km de là, pas
      // Kinatarkan. Le code postal 6047 est aussi celui de lieux continentaux du nord de Cebu : boîte, pas cpPrefix.
      { key: 'kinatarkan', match: { box: [[11.30, 11.36, 123.87, 123.93]] }, note: 'Île de Kinatarkan/Guintacan (Hagdan, Waga) : routes sur place, aucune liaison véhicule.' },
      // San Vicente (Northern Samar) : municipalité insulaire de 6 928 habitants (2020) sur l'île de Destacado ;
      // un bateau à moteur quotidien depuis San Isidro (~2 h, 100 ₱), aucun RoRo. Rattachée à `leyteSamar` par le 6419.
      { key: 'sanVicenteSamar', match: { box: [[12.255, 12.285, 124.09, 124.12]] }, note: 'Île de San Vicente / Destacado (Northern Samar) : aucune liaison véhicule.' }
    ],
    CN: [
      // Archipel de Changshan (Changhai, Dalian) : Dachangshan et Xiaochangshan sont reliées entre elles par le pont
      // de Changshan (长山大桥, 3 450 m, ouvert le 1er juillet 2014, 2×2 voies — zh.wikipedia.org/zh-cn/大连长山大桥,
      // OpenStreetMap way/399579047), mais rien ne les relie au continent : seulement un client-roulier Pikou ↔
      // Yuanyang, dont AUCUN tarif officiel n'est publié par l'opérateur (les montants trouvés viennent d'un portail
      // d'information local). Faute de tarif publié, aucune liaison n'est modélisée : l'archipel forme une masse
      // terrestre à part, sur laquelle on circule, sans trajet possible vers le continent.
      // La règle `near` existante (rayon de 8 km autour de 39,26/122,58) laissait Xiaochangshan et 38 autres lieux
      // en dehors : ils retombaient sur `continental`, donc joignables par la route depuis Dalian.
      // À revoir en 2029 : le pont transmaritime de Changhai (25,5 km, chantier ouvert le 24/02/2025) reliera
      // l'archipel au continent — shenyang.gov.cn, communiqué du 25/02/2025.
      { key: 'changshan', match: { box: [[39.19, 39.31, 122.50, 122.80]] }, note: 'Dachangshan + Xiaochangshan (pont de Changshan, 2014) ; aucune liaison véhicule à tarif publié vers le continent.' }
    ],
    TH: [
      // Ko Tarutao (parc national marin de Tarutao, Satun) : 18 km de piste entre le quartier général de Phante
      // Malakar et Ta Lo Wow, mais aucune population civile permanente recensée et aucun bac véhicule — des vedettes
      // à passagers depuis Pak Bara (~1 h), et sur place uniquement les véhicules du parc, le vélo ou la marche.
      { key: 'koTarutao', match: { box: [[6.50, 6.72, 99.60, 99.68]] }, note: 'Ko Tarutao : routes du parc national, aucune liaison véhicule.' },
      { key: '*', match: { box: [[6.76, 6.80, 99.70, 99.73]] }, note: 'Ban Lo Lai, Ban Hua Hin (îlots au nord de Tarutao) : chaque lieu isolé.' }
    ],
    ID: [
      // Pulau Karas (Distrik Karas, Fakfak, Papouasie occidentale) : 11 lieux, dont Mas (320 hab.), et AUCUNE route
      // cartographiée dans OpenStreetMap sur toute l'île. Desserte par les navires perintis KM Sabuk Nusantara depuis
      // Fakfak, environ 6 h, une rotation toutes les deux semaines, sans tarif véhicule publié.
      { key: '*', match: { box: [[-3.55, -3.38, 132.62, 132.78]] }, note: 'Île de Karas (Fakfak) : aucune route cartographiée, aucune liaison véhicule — chaque lieu isolé.' }
    ],
    JP: [
      // ---- Rétabli le 18/09/2026 : ces règles et les deux liaisons ci-dessous avaient été écrites directement dans
      // public/js/trip-data.js (16-17/09/2026) et non dans les sources ; la première régénération des règles d'îles
      // les a donc effacées. Elles vivent désormais ici, à leur place.
      // Izena et Iheya (Okinawa) : îles habitées jusque-là absentes des règles, donc rattachées à Okinawa — 3 tirages
      // sur 25 au départ de Nago plaçaient une étape sur Izena atteinte PAR LA ROUTE, 22 km de mer. Chacune a
      // maintenant sa masse terrestre, reliée par son vrai ferry municipal (voir ferries ci-dessous).
      { key: 'izena', match: { box: [[26.9, 26.96, 127.9, 127.97]] }, note: 'Île d\'Izena (village d\'Izena), ferry municipal depuis Unten (Nakijin).' },
      { key: 'iheya', match: { box: [[26.99, 27.07, 127.91, 128.0]] }, note: 'Île d\'Iheya, Noho-jima comprise (pont Noho Ōhashi, 320 m, 2004) ; ferry municipal depuis Unten.' },
      // Iwaishima (Yamaguchi) : la liaison Yanai ↔ Iwaishima est assurée par un navire à passagers de 43 tonneaux
      // sans pont-garage — aucun tarif véhicule n'existe, les automobilistes laissent leur voiture à quai (mairie de
      // Kaminoseki, grille officielle sans ligne « 自動車航送 »). L'île n'est donc jamais proposée à un road trip.
      { key: '*', match: { box: [[33.77, 33.8, 131.97, 132.0]] }, note: 'Iwaishima : navire à passagers seulement, aucun transport de véhicule — lieu isolé.' }
    ],
    GR: [
      // Chrysí (Χρυσή), au sud de la Crète : île INHABITÉE (2 habitants au recensement 2011), aucune route, site
      // Natura 2000 dont le débarquement est réglementé, desservie seulement par des bateaux d'excursion saisonniers
      // depuis Ierapetra. Elle était rattachée à la Crète par son code postal 72200.
      { key: '*', match: { box: [[34.86, 34.90, 25.68, 25.72]] }, note: 'Chrysí (sud de la Crète) : île inhabitée sans route ni liaison véhicule.' }
    ]
  },
  landmass: {
    // Érythrée : aucune règle d'île jusqu'ici, donc tout le pays était `continental` — y compris l'archipel des
    // Dahlak. Dahlak Kebir (~2 500 hab.) a des pistes sur place, mais aucune liaison véhicule publiée depuis Massaoua.
    ER: {
      default: 'continental',
      rules: [
        { key: 'dahlakKebir', match: { box: [[15.55, 15.85, 39.90, 40.20]] }, note: 'Dahlak Kebir (archipel des Dahlak) : pistes sur l\'île, aucune liaison véhicule publiée depuis Massaoua.' },
        { key: '*', match: { box: [[15.38, 15.55, 39.80, 40.05]] }, note: 'Îlots du sud de l\'archipel des Dahlak (Dilemmi, Follocle, Gandeli, Inghel, Dluh, Port Smyth…) : chaque lieu isolé.' }
      ]
    }
  }
};
