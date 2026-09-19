// Groupe « asie » — lignes de ferry existantes transportant des véhicules, jusqu'ici non modélisées (consigne
// CONSIGNE-FERRIES-SANS-TARIF.md, 16 septembre 2026). Pays : JP, KR, CN, TW, PH, ID, MY, TH, VN, BD (IN, LK, MV, MM, KH :
// aucune ligne retenue, voir rapport). Toutes les clés a/b existent déjà dans scripts/iles/*.js : aucune règle ajoutée.
// Prix en EUROS au taux InforEuro de septembre 2026 (1 EUR = 185,92 JPY = 1 600,39 KRW = 20 628,08 IDR = 30 362,6154 VND)
// quand une grille officielle fixe a été trouvée ; sinon priceStatus 'unknown' et prix null.
// Classes : 1 = voiture 4-5 m, 2 = véhicule 6-7 m / van / camping-car, 5 = moto (<750 cc), foot = passager adulte le moins cher.
module.exports = {
  landmassRules: {},
  ferries: [
    {
      "a": "honshu",
      "b": "sado",
      "routeKey": "niigataRyotsu", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot", "durationEstimated": true,
      "name": "Niigata ↔ Ryōtsu",
      "operator": "Sado Kisen",
      "durationH": 2.5,
      "distanceKm": 57,
      "priceByClass": {
        "1": 89.93,
        "2": 159.1,
        "5": 29.53,
        "foot": 19.2
      },
      "currency": "JPY",
      "original": {
        "car": 16720,
        "van": 29580,
        "moto": 5490,
        "foot": 3570
      },
      "source": "https://www.sadokisen.co.jp/faretables/",
      "date": "2026-09-16",
      "note": "Grille carferry juillet-septembre 2026 (surcharge carburant incluse). Voiture 4-5 m 20 290 JPY conducteur inclus (2e classe 3 570) -> 16 720 ; classe 2 = 6-7 m 33 150 - 3 570 ; moto <750 cc 5 490 (conducteur non inclus) ; piéton 2e classe 3 570. Durée carferry ~2 h 30 (ordre de grandeur, non relevée) ; distance orthodromique. Hausse de la surcharge annoncée au 1er oct. 2026 (+180 JPY par voiture selon la presse)."
    },
    {
      "a": "honshu",
      "b": "dogo",
      "routeKey": "shichiruiSaigo", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot", "durationEstimated": true,
      "name": "Shichirui ↔ Saigō (Dōgo)",
      "operator": "Oki Kisen",
      "durationH": 2.5,
      "distanceKm": 71,
      "priceByClass": {
        "1": 102.19,
        "2": 170.29,
        "5": 21.25,
        "foot": 20.82
      },
      "currency": "JPY",
      "original": {
        "car": 19000,
        "van": 31660,
        "moto": 3950,
        "foot": 3870
      },
      "source": "https://www.oki-kisen.co.jp/fare/",
      "date": "2026-09-16",
      "note": "Grille « 2026年6月1日改定 », section 本土～隠岐. Véhicule <5 m 22 870 JPY avec billet 2e classe du conducteur (3 870) -> 19 000 ; classe 2 = <7 m 35 530 - 3 870 ; moto 750 cc未満 3 950 (tarif « bagage spécial », passager en sus) ; piéton 2e classe 3 870. Même tarif depuis Sakaiminato. Durée ~2 h 30 depuis Shichirui (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "honshu",
      "b": "tsushima",
      "routeKey": "hakataIzuhara", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot", "durationEstimated": true,
      "name": "Hakata ↔ Izuhara",
      "operator": "Kyushu Yusen",
      "durationH": 4.75,
      "distanceKm": 122,
      "priceByClass": {
        "1": 148.83,
        "2": 277,
        "5": 30.5,
        "foot": 33.78
      },
      "currency": "JPY",
      "original": {
        "car": 27670,
        "van": 51500,
        "moto": 5670,
        "foot": 6280
      },
      "source": "https://www.kyu-you.co.jp/price/8.html",
      "date": "2026-09-16",
      "note": "Grille du 1er avril au 31 octobre 2026 (surcharge 0). Véhicule 4-5 m 33 950 JPY, conducteur gratuit en 2e classe (6 280) -> 27 670 ; classe 2 = 6-7 m 57 780 - 6 280 ; moto <750 cc 5 670 (passager en sus) ; piéton 2e classe 6 280. Ferry via Iki, ~4 h 45 (ordre de grandeur) ; distance orthodromique. Grille à revérifier après le 31/10/2026."
    },
    {
      "a": "honshu",
      "b": "iki",
      "routeKey": "karatsuIndoji", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot", "durationEstimated": true,
      "name": "Karatsu ↔ Indōji (Iki)",
      "operator": "Kyushu Yusen",
      "durationH": 1.75,
      "distanceKm": 36,
      "priceByClass": {
        "1": 65.35,
        "2": 120.32,
        "5": 13.5,
        "foot": 13.72
      },
      "currency": "JPY",
      "original": {
        "car": 12150,
        "van": 22370,
        "moto": 2510,
        "foot": 2550
      },
      "source": "https://www.kyu-you.co.jp/price/8.html",
      "date": "2026-09-16",
      "note": "Grille 1er avril-31 octobre 2026. Véhicule 4-5 m 14 700 JPY conducteur inclus (2e classe 2 550) -> 12 150 ; 6-7 m 24 920 - 2 550 ; moto <750 cc 2 510 ; piéton 2 550. Retenue plutôt que Hakata-Gōnoura (plus longue). Durée ~1 h 45 (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "iki",
      "b": "tsushima",
      "routeKey": "gonouraIzuhara", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot", "durationEstimated": true,
      "name": "Gōnoura ↔ Izuhara",
      "operator": "Kyushu Yusen",
      "durationH": 2.25,
      "distanceKm": 62,
      "priceByClass": {
        "1": 81,
        "2": 151.68,
        "5": 20.33,
        "foot": 17.75
      },
      "currency": "JPY",
      "original": {
        "car": 15060,
        "van": 28200,
        "moto": 3780,
        "foot": 3300
      },
      "source": "https://www.kyu-you.co.jp/price/8.html",
      "date": "2026-09-16",
      "note": "Section 壱岐から厳原 de la grille 1er avril-31 octobre 2026. Véhicule 4-5 m 18 360 JPY conducteur inclus (3 300) -> 15 060 ; 6-7 m 31 500 - 3 300 ; moto <750 cc 3 780 ; piéton 3 300. Durée ~2 h 15 (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "honshu",
      "b": "fukue",
      "routeKey": "nagasakiFukue", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot",
      "name": "Nagasaki ↔ Fukue",
      "operator": "Kyushu Shosen",
      "durationH": 3.2,
      "distanceKm": 95,
      "priceByClass": {
        "1": 147.64,
        "2": 267.59,
        "5": 13.39,
        "foot": 24.1
      },
      "currency": "JPY",
      "original": {
        "car": 27450,
        "van": 49750,
        "moto": 2490,
        "foot": 4480
      },
      "source": "https://kyusho.co.jp/vehicles/8336 ; https://kyusho.co.jp/schedule?start=2026-09-20&shuppatsu=nagasaki&touchaku=fukue",
      "date": "2026-09-16",
      "note": "Grille véhicules de septembre 2026 (surcharge carburant révisée chaque mois ; octobre et novembre publiés à part). Véhicule 4-5 m 31 930 JPY conducteur inclus ; ferry adulte 4 480 (horaire du 20/09/2026) -> 27 450 ; 6-7 m 54 230 - 4 480 ; moto <750 cc 6 970 « passager + bagage spécial » - 4 480 = 2 490 ; piéton 4 480. Horaire 8:05 -> 11:15."
    },
    {
      "a": "honshu",
      "b": "nakadori",
      "routeKey": "saseboArikawa", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot",
      "name": "Sasebo ↔ Arikawa (Nakadōri)",
      "operator": "Kyushu Shosen",
      "durationH": 2.6,
      "distanceKm": 59,
      "priceByClass": {
        "1": 132.53,
        "2": 237.47,
        "5": 13.34,
        "foot": 25.76
      },
      "currency": "JPY",
      "original": {
        "car": 24640,
        "van": 44150,
        "moto": 2480,
        "foot": 4790
      },
      "source": "https://kyusho.co.jp/vehicle?term=sasebo_kamigoto ; https://kyusho.co.jp/schedule?start=2026-09-20&shuppatsu=sasebo&touchaku=arikawa",
      "date": "2026-09-16",
      "note": "Grille « 2026年9月 », section 佐世保～有川. Véhicule 4-5 m 29 430 JPY conducteur inclus ; ferry adulte 4 790 -> 24 640 ; 6-7 m 48 940 - 4 790 ; moto <750 cc 7 270 (passager inclus) - 4 790 ; piéton 4 790. Horaire 8:00 -> 10:35. Surcharge carburant mensuelle."
    },
    {
      "a": "honshu",
      "b": "yakushima",
      "routeKey": "kagoshimaMiyanoura", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot",
      "name": "Kagoshima ↔ Miyanoura (Yakushima)",
      "operator": "Orita Kisen (Ferry Yakushima 2)",
      "durationH": 4,
      "distanceKm": 129,
      "priceByClass": {
        "1": 123.71,
        "2": 252.8,
        "5": 16.14,
        "foot": 34.96
      },
      "currency": "JPY",
      "original": {
        "car": 23000,
        "van": 47000,
        "moto": 3000,
        "foot": 6500
      },
      "source": "https://ferryyakusima2.com/timetable",
      "date": "2026-09-16",
      "note": "Grille de l'opérateur (surcharge incluse), aller. Véhicule <5 m 29 500 JPY conducteur inclus (2e classe 6 500) -> 23 000 ; <7 m 53 500 - 6 500 ; moto <750 cc 3 000 (2e classe en sus) ; piéton 6 500. Horaire 8:30 -> 12:30."
    },
    {
      "a": "honshu",
      "b": "tanegashima",
      "routeKey": "kagoshimaNishinoomote", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot",
      "name": "Kagoshima ↔ Nishinoomote (Tanegashima)",
      "operator": "Cosmo Line (Ferry Princess Wakasa)",
      "durationH": 3.5,
      "distanceKm": 104,
      "priceByClass": {
        "1": 110.26,
        "2": 212.99,
        "5": 15.06,
        "foot": 31.73
      },
      "currency": "JPY",
      "original": {
        "car": 20500,
        "van": 39600,
        "moto": 2800,
        "foot": 5900
      },
      "source": "https://cosmoline.jp/guide ; https://cosmoline.jp/1318 (grille image « 令和8年8月17日～10月31日の通常期適用運賃 »)",
      "date": "2026-09-16",
      "note": "Période normale 17 août-31 octobre 2026, surcharge incluse (繁忙期 19-23 sept. plus cher). Véhicule 4-5 m 26 400 JPY conducteur inclus (2e classe 5 900) -> 20 500 ; 6-7 m 45 500 - 5 900 ; moto <750 cc 8 700 (adulte inclus) - 5 900 ; piéton 5 900. Traversée annoncée 3 h 30."
    },
    {
      "a": "honshu",
      "b": "shodoshima",
      "routeKey": "takamatsuTonosho", "priceCovers": "vehicle", "coversSource": "véhicule seul : grille « un passager inclus » (adulte 700 JPY déduit) ; passagers au tarif foot",
      "name": "Takamatsu ↔ Tonoshō (Shōdoshima)",
      "operator": "Shikoku Ferry / Shōdoshima Ferry",
      "durationH": 1,
      "distanceKm": 22,
      "priceByClass": {
        "1": 30.28,
        "2": 40.77,
        "5": 9.95,
        "foot": 3.77
      },
      "currency": "JPY",
      "original": {
        "car": 5630,
        "van": 7580,
        "moto": 1850,
        "foot": 700
      },
      "source": "https://www.shikokuferry.com/route2 ; https://www.shikokuferry.com/truck/",
      "date": "2026-09-16",
      "note": "Véhicule <5 m 6 330 JPY avec un passager inclus (adulte 700) -> 5 630 ; classe 2 = <7 m 8 280 (page camions/bus) - 700 ; moto <750 cc 1 850 ; piéton 700. Durée (~60 min) et distance (22 km) publiées par l'opérateur."
    },
    {
      "a": "hokkaido",
      "b": "rishiri",
      "routeKey": "wakkanaiOshidomari", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot", "durationEstimated": true,
      "name": "Wakkanai ↔ Oshidomari (Rishiri)",
      "operator": "Heart Land Ferry",
      "durationH": 1.67,
      "distanceKm": 52,
      "priceByClass": {
        "1": 128.07,
        "2": 201.75,
        "5": 37.65,
        "foot": 19.31
      },
      "currency": "JPY",
      "original": {
        "car": 23810,
        "van": 37510,
        "moto": 7000,
        "foot": 3590
      },
      "source": "https://heartlandferry.jp/faretable/",
      "date": "2026-09-16",
      "note": "Grille 1er janv.-31 déc. 2026 (surcharge 0). Véhicule <5 m 27 400 JPY, conducteur en 2e classe inclus (3 590) -> 23 810 ; <7 m 41 100 - 3 590 ; moto <750 cc 7 000 (bagage spécial) ; piéton 3 590. Distance 52 km publiée (grille 2019) ; durée ~1 h 40 (ordre de grandeur)."
    },
    {
      "a": "hokkaido",
      "b": "rebun",
      "routeKey": "wakkanaiKafuka", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot", "durationEstimated": true,
      "name": "Wakkanai ↔ Kafuka (Rebun)",
      "operator": "Heart Land Ferry",
      "durationH": 1.92,
      "distanceKm": 59,
      "priceByClass": {
        "1": 143.93,
        "2": 226.44,
        "5": 37.65,
        "foot": 21.25
      },
      "currency": "JPY",
      "original": {
        "car": 26760,
        "van": 42100,
        "moto": 7000,
        "foot": 3950
      },
      "source": "https://heartlandferry.jp/faretable/",
      "date": "2026-09-16",
      "note": "Grille 2026. Véhicule <5 m 30 710 JPY conducteur inclus (3 950) -> 26 760 ; <7 m 46 050 - 3 950 ; moto <750 cc 7 000 ; piéton 3 950. Distance 59 km publiée ; durée ~1 h 55 (ordre de grandeur)."
    },
    {
      "a": "rishiri",
      "b": "rebun",
      "routeKey": "oshidomariKafuka", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot", "durationEstimated": true,
      "name": "Oshidomari ↔ Kafuka",
      "operator": "Heart Land Ferry",
      "durationH": 0.75,
      "distanceKm": 19,
      "priceByClass": {
        "1": 44.21,
        "2": 71.05,
        "5": 18.83,
        "foot": 9.68
      },
      "currency": "JPY",
      "original": {
        "car": 8220,
        "van": 13210,
        "moto": 3500,
        "foot": 1800
      },
      "source": "https://heartlandferry.jp/faretable/",
      "date": "2026-09-16",
      "note": "Grille 2026, section 利尻島(鴛泊・沓形)～礼文島. Véhicule <5 m 10 020 JPY conducteur inclus (1 800) -> 8 220 ; <7 m 15 010 - 1 800 ; moto 3 500 ; piéton 1 800. Distance 19 km publiée ; durée ~45 min (ordre de grandeur)."
    },
    {
      "a": "hokkaido",
      "b": "okushiri",
      "routeKey": "esashiOkushiri", "priceCovers": "vehicle", "coversSource": "véhicule seul : la grille de l'exploitant inclut le billet 2e classe du conducteur, déduit ici (voir note) ; moto tarifée comme « bagage spécial », pilote en sus ; passagers au tarif foot", "durationEstimated": true,
      "name": "Esashi ↔ Okushiri",
      "operator": "Heart Land Ferry",
      "durationH": 2.17,
      "distanceKm": 60,
      "priceByClass": {
        "1": 129.09,
        "2": 208.26,
        "5": 32.38,
        "foot": 19.2
      },
      "currency": "JPY",
      "original": {
        "car": 24000,
        "van": 38720,
        "moto": 6020,
        "foot": 3570
      },
      "source": "https://heartlandferry.jp/faretable/okushiri-route/",
      "date": "2026-09-16",
      "note": "Grille 1er juillet-30 septembre 2026 (surcharge incluse). ATTENTION : cette grille EXPIRE le 30 septembre 2026, une grille distincte s'applique à partir du 1er octobre — tarifs à relever de nouveau sur la page de l'opérateur après cette date (relevé du 7e audit, 18/09/2026). Véhicule <5 m 27 570 JPY conducteur inclus (2e classe 3 570) -> 24 000 ; <7 m 42 290 - 3 570 ; moto <750 cc 6 020 ; piéton 3 570. Durée ~2 h 10 (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "okinawa",
      "b": "kumejima",
      "routeKey": "nahaKanegusuku", "priceCovers": "vehicle", "coversSource": "véhicule seul : grille Kume Shōsen, billet du conducteur offert avec le véhicule (déduit) ; moto « bagage », pilote en sus", "durationEstimated": true,
      "name": "Naha (Tomari) ↔ Kanegusuku (Kumejima)",
      "operator": "Kume Shosen",
      "durationH": 3.5,
      "distanceKm": 88,
      "priceByClass": {
        "1": 87.35,
        "2": 187.07,
        "5": 19.47,
        "foot": 18.56
      },
      "currency": "JPY",
      "original": {
        "car": 16240,
        "van": 34780,
        "moto": 3620,
        "foot": 3450
      },
      "source": "http://www.kumeline.com/fare_ticket/",
      "date": "2026-09-16",
      "note": "Grille de l'opérateur (TVA 10 % incluse, non datée). Véhicule 4-5 m 19 690 JPY, billet du conducteur offert (adulte 3 450) -> 16 240 ; 6-7 m 38 230 - 3 450 ; moto >50 cc 3 620 (bagage) ; piéton 3 450. Certaines traversées font escale à Tonaki : durée ~3 à 4 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "continental",
      "b": "jeju",
      "routeKey": "wandoJeju", "durationEstimated": true,
      "name": "Wando ↔ Jeju",
      "operator": "Hanil Express (Silver Cloud, Gold Stella)",
      "durationH": 2.67,
      "distanceKm": 90,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://www.hanilexpress.co.kr/expressFerry/shipfare/shippingFareB.do",
      "date": "2026-09-16",
      "note": "Ferry rapide passagers + véhicules (page « 차량선적 » : consignes d'embarquement des voitures, réservation en ligne des voitures et utilitaires). Tarif « déclaré » (신고요금) servi seulement par le formulaire de recherche, aucune grille lisible sur la page ; montants des agences non retenus. Plus courte des lignes vers Jeju (Mokpo, Yeosu, Busan, Incheon aussi desservis). Durée ~2 h 40 (sites secondaires) ; distance orthodromique."
    },
    {
      "a": "continental",
      "b": "ulleungdo",
      "routeKey": "pohangSadong", "priceCovers": "vehicle", "coversSource": "véhicule seul : grille Ulleung Cruise, véhicule facturé en fret, passagers en sus", "durationEstimated": true,
      "name": "Pohang (Yeongilman) ↔ Sadong (Ulleungdo)",
      "operator": "Ulleung Cruise (New Sea Pearl)",
      "durationH": 6.5,
      "distanceKm": 201,
      "priceByClass": {
        "1": 111.22,
        "2": 196.83,
        "5": 80.73,
        "foot": 50.93
      },
      "currency": "KRW",
      "original": {
        "car": 178000,
        "van": 315000,
        "moto": 129200,
        "foot": 81500
      },
      "source": "https://www.ulcruise.co.kr/www/flight/fare/car_freight ; https://www.ulcruise.co.kr/www/flight/fare",
      "date": "2026-09-16",
      "note": "Grilles de base de l'opérateur (aller simple). Classe 1 = berline intermédiaire (중형) 178 000 KRW ; classe 2 = camping-car ≤1 t (캠핑카) 315 000 ; moto ≤750 cc 129 200 ; piéton = cabine la moins chère (6인실 In, terminal inclus) 81 500. Véhicule facturé seul (passagers en sus). NON inclus : surcharge carburant (유류할증료, variable, annoncée à part) et frais de chargement/déchargement du véhicule. Traversée de nuit ~6 h 30 (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "continental",
      "b": "hainan",
      "routeKey": "xuwenHaikou", "durationEstimated": true,
      "name": "Xuwen ↔ Haikou (Xinhai)",
      "operator": "Qiongzhou Strait Ferry (琼州海峡轮渡)",
      "durationH": 1.5,
      "distanceKm": 20,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://m.gmw.cn/2026-01/27/content_1304320237.htm ; https://m.haikou.bendibao.com/traffic/43267.shtm",
      "date": "2026-01-27",
      "note": "Ferries rouliers passagers + véhicules (Guangming Daily, questions-réponses sur la traversée de 2026 : billets véhicules et voitures électriques). Montants (petite voiture 413,5 CNY sortie / 415,5 CNY entrée conducteur inclus, passager 41,5 CNY) repris seulement par des portails locaux, vente par l'application officielle : aucune grille officielle lisible. Durée ~1 h 30 (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "luzon",
      "b": "leyteSamar",
      "routeKey": "matnogAllen",
      "name": "Matnog ↔ Allen (Dapdap)",
      "operator": "Archipelago Philippine Ferries (FastCat), Montenegro Lines, Santa Clara, Peñafrancia",
      "durationH": 1.5,
      "distanceKm": 22,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Traversée 1 h-1 h 30, départs toutes les 4 h (FastCat/Montenegro, Dapdap) ; Jubasan (Santa Clara) aussi. Distance orthodromique."
    },
    {
      "a": "leyteSamar",
      "b": "mindanao",
      "routeKey": "liloanLipata",
      "name": "Liloan ↔ Lipata",
      "operator": "Montenegro Lines, FastCat, GT Express, Philharbor",
      "durationH": 3.5,
      "distanceKm": 63,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Durée 3 h 30 (matrice) ; San Ricardo (Benit)-Lipata plus court (1 h) mais Liloan plus fréquenté. Distance orthodromique."
    },
    {
      "a": "panay",
      "b": "negros",
      "routeKey": "dumangasBanago", "durationEstimated": true,
      "name": "Dumangas ↔ Banago (Bacolod)",
      "operator": "FastCat, Montenegro Lines, Starlite, Seen Sam",
      "durationH": 1.5,
      "distanceKm": 30,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Distance 12,95 NM selon la matrice ; durée 1 h-1 h 40 (ordre de grandeur)."
    },
    {
      "a": "cebu",
      "b": "negros",
      "routeKey": "toledoSanCarlos",
      "name": "Toledo ↔ San Carlos",
      "operator": "Archipelago Philippine Ferries (FastCat M10)",
      "durationH": 1.5,
      "distanceKm": 27,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Lite Ferry supprimées du CPC sur cette ligne ; FastCat M10 maintenu. Durée 1 h 30 (matrice) ; distance orthodromique."
    },
    {
      "a": "negros",
      "b": "siquijor",
      "routeKey": "dumagueteSiquijor", "durationEstimated": true,
      "name": "Dumaguete ↔ Siquijor",
      "operator": "Montenegro Lines, Aleson Shipping, Lite Shipping",
      "durationH": 1.5,
      "distanceKm": 25,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Lignes Dumaguete-Siquijor et Dumaguete-Larena listées ; durée ~1 h 30-2 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "negros",
      "b": "mindanao",
      "routeKey": "dumagueteDapitan",
      "name": "Dumaguete ↔ Dapitan",
      "operator": "Seen Sam Shipping, Lite Shipping, Montenegro Lines",
      "durationH": 4,
      "distanceKm": 73,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Durée 4 h (matrice, LCT 1038) ; distance orthodromique."
    },
    {
      "a": "cebu",
      "b": "leyteSamar",
      "routeKey": "polambatoPalompon", "durationEstimated": true,
      "name": "Polambato (Bogo) ↔ Palompon",
      "operator": "Medallion Transport",
      "durationH": 2.5,
      "distanceKm": 39,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 22,41 NM (matrice) ; durée ~2 h 30 (ordre de grandeur). Plus courte que Cebu-Ormoc."
    },
    {
      "a": "bohol",
      "b": "leyteSamar",
      "routeKey": "ubayBato", "durationEstimated": true,
      "name": "Ubay ↔ Bato",
      "operator": "Medallion Transport",
      "durationH": 2.5,
      "distanceKm": 46,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 26,46 NM, ~2 h 30 (matrice)."
    },
    {
      "a": "panay",
      "b": "guimaras",
      "routeKey": "iloiloJordan",
      "name": "Iloilo ↔ Jordan (Guimaras)",
      "operator": "F.F. Cruz Shipping",
      "durationH": 0.5,
      "distanceKm": 4,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). RoRo MV Felipe / Felipe III, 3 NM, 30 min (matrice) ; départ Lapuz/Iloilo. Distance orthodromique arrondie."
    },
    {
      "a": "luzon",
      "b": "marinduque",
      "routeKey": "lucenaBalanacan", "durationEstimated": true,
      "name": "Lucena ↔ Balanacan",
      "operator": "Montenegro Lines, Starhorse Shipping",
      "durationH": 2.5,
      "distanceKm": 49,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 28 NM ; taux matrice « Car - P117.00/per lane meter » (non convertible en prix par voiture). Durée ~2 h 30 (ordre de grandeur)."
    },
    {
      "a": "luzon",
      "b": "catanduanes",
      "routeKey": "tabacoSanAndres",
      "name": "Tabaco ↔ San Andres",
      "operator": "Regina Shipping Lines",
      "durationH": 2.5,
      "distanceKm": 48,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 29 NM, 2 h 30 (matrice). Tabaco-Virac (Cardinal/Santa Clara, 3 h) aussi listée."
    },
    {
      "a": "luzon",
      "b": "masbate",
      "routeKey": "pilarMasbate", "durationEstimated": true,
      "name": "Pilar ↔ Masbate City",
      "operator": "Montenegro Lines",
      "durationH": 3,
      "distanceKm": 61,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 36 NM, départs toutes les 2 h, ~3 h (matrice)."
    },
    {
      "a": "cebu",
      "b": "camotes",
      "routeKey": "danaoConsuelo", "durationEstimated": true,
      "name": "Danao ↔ Consuelo (Camotes)",
      "operator": "Jomalia Shipping",
      "durationH": 2,
      "distanceKm": 37,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 17,4 NM (matrice) ; durée ~2 h (ordre de grandeur)."
    },
    {
      "a": "cebu",
      "b": "bantayan",
      "routeKey": "hagnayaSantaFe", "durationEstimated": true,
      "name": "Hagnaya ↔ Santa Fe (Bantayan)",
      "operator": "Island Shipping, Asian Marine Transport (Super Shuttle Ferry)",
      "durationH": 1,
      "distanceKm": 14,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 9 NM, ~1 h (matrice)."
    },
    {
      "a": "mindanao",
      "b": "samal",
      "routeKey": "sasaBabak",
      "name": "Sasa (Davao) ↔ Babak (Samal)",
      "operator": "CW Cole, Mae Wess, Davao Wessjay, Davsam Link",
      "durationH": 0.25,
      "distanceKm": 2,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 0,86 NM, 15 min, départs toutes les heures (matrice). Pont Samal-Davao en construction (fin annoncée 2027-2028) : liaison à retirer à son ouverture."
    },
    {
      "a": "mindanao",
      "b": "dinagat",
      "routeKey": "surigaoSanJose", "durationEstimated": true,
      "name": "Surigao ↔ San Jose (Dinagat)",
      "operator": "Montenegro Lines",
      "durationH": 1.5,
      "distanceKm": 26,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Durée ~1 h 30 (ordre de grandeur, non relevée) ; distance orthodromique."
    },
    {
      "a": "mindanao",
      "b": "siargao",
      "routeKey": "surigaoDapa",
      "name": "Surigao ↔ Dapa (Siargao)",
      "operator": "Montenegro Lines, Evaristo & Sons (Precious Ferry)",
      "durationH": 3.5,
      "distanceKm": 60,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 34,8 NM, 3 h 30 (matrice) ; la matrice cite des montants par mètre linéaire, non convertibles."
    },
    {
      "a": "mindanao",
      "b": "basilan",
      "routeKey": "zamboangaIsabela",
      "name": "Zamboanga ↔ Isabela (Basilan)",
      "operator": "Montenegro Lines, FastCat, Aleson Shipping",
      "durationH": 1.5,
      "distanceKm": 26,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 14 NM, 40 min à 1 h 30 selon le navire (matrice). Un navire Aleson suspendu depuis le 27/01/2026."
    },
    {
      "a": "mindanao",
      "b": "jolo",
      "routeKey": "zamboangaJolo", "durationEstimated": true,
      "name": "Zamboanga ↔ Jolo",
      "operator": "Montenegro Lines (Ma. Rebecca), Aleson Shipping",
      "durationH": 4,
      "distanceKm": 152,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Montenegro de jour 7:00 -> 11:00 ; Aleson de nuit (~7 h). Zone à risque (avis de voyage) non prise en compte. Distance orthodromique."
    },
    {
      "a": "luzon",
      "b": "tablas",
      "routeKey": "batangasOdiongan", "durationEstimated": true,
      "name": "Batangas ↔ Odiongan (Tablas)",
      "operator": "Montenegro Lines",
      "durationH": 8,
      "distanceKm": 181,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Ligne Batangas-Odiongan-Romblon ; durée ~8 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "luzon",
      "b": "lubang",
      "routeKey": "manilaTilik",
      "name": "Manila ↔ Tilik (Lubang)",
      "operator": "Atienza Interisland Ferries (MV June Aster / Star San Carlos)",
      "durationH": 6,
      "distanceKm": 115,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Deux rotations par semaine, Manila 9:00 -> Tilik 15:00 (matrice)."
    },
    {
      "a": "luzon",
      "b": "polillo",
      "routeKey": "realPolillo",
      "name": "Real ↔ Polillo",
      "operator": "AU. Calucin IV",
      "durationH": 3,
      "distanceKm": 36,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 20,5 NM, Real 12:00 -> Polillo 15:00 (matrice)."
    },
    {
      "a": "luzon",
      "b": "alabat",
      "routeKey": "atimonanAlabat",
      "name": "Atimonan ↔ Alabat",
      "operator": "Jeanalyn Fullante (MV Pinoy RORO I)",
      "durationH": 1,
      "distanceKm": 15,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). 9,07 NM, 1 h, départs quotidiens (matrice)."
    },
    {
      "a": "luzon",
      "b": "palawan",
      "routeKey": "manilaPuertoPrincesa", "durationEstimated": true,
      "name": "Manila ↔ Puerto Princesa",
      "operator": "2GO",
      "durationH": 30,
      "distanceKm": 591,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf ; https://2go.com.ph/travel/book/sailing-schedule/",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Permis spécial 2GO Manila-Coron-Puerto Princesa-Coron-Manila (passagers et fret roulant), une rotation hebdomadaire. Durée ~30 h via Coron (ordre de grandeur, non relevée) ; distance orthodromique. NB : aucun lieu de Coron/Busuanga/Culion (codes 5315-5317) dans communes-ph.txt ; l'escale de Coron n'est pas modélisée."
    },
    {
      "a": "panay",
      "b": "palawan",
      "routeKey": "iloiloPuertoPrincesa", "durationEstimated": true,
      "name": "Iloilo ↔ Puerto Princesa",
      "operator": "Montenegro Lines (MV Maria Erlinda)",
      "durationH": 26,
      "distanceKm": 434,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf",
      "date": "2026-03",
      "note": "Liaison RoRo listée « SERVED » dans la matrice officielle MARINA (RRTS / Philippine Nautical Highway, « as of March 2026 »), qui ne publie que des taux indicatifs par passager-mille ou par mètre linéaire, pas de prix par véhicule ; sites des opérateurs hors ligne (FastCat) ou derrière une vérification anti-robot (Montenegro Lines, non contournée). Ligne Iloilo-Cuyo-Puerto Princesa, hebdomadaire (Iloilo sam. 8:00, Cuyo 18:00). Durée ~26 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "sumatra",
      "b": "weh",
      "routeKey": "uleeLheueBalohan", "durationEstimated": true,
      "name": "Ulee Lheue ↔ Balohan (Sabang)",
      "operator": "ASDP Indonesia Ferry (KMP Aceh Hebat 2, KMP BRR)",
      "durationH": 2,
      "distanceKm": 30,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://rri.co.id/sabang/regional/2546135/kmp-aceh-hebat-2-kembali-beroperasi-layani-lintasan-ulee-lheue-balohan",
      "date": "2026-07",
      "note": "KMP Aceh Hebat 2 de retour le 5/07/2026 ; 87 777 véhicules transportés de janvier à mi-juin 2026. Tarif réglementé mais aucune grille officielle 2026 lisible (billets uniquement sur Ferizy) ; montants de presse non retenus. Durée ~2 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "sumatra",
      "b": "simeulue",
      "routeKey": "calangSinabang", "durationEstimated": true,
      "name": "Calang ↔ Sinabang",
      "operator": "ASDP Indonesia Ferry (KMP Aceh Hebat 1)",
      "durationH": 12,
      "distanceKm": 256,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://infopublik.id/kategori/nusantara/975233/kmp-aceh-hebat-1-perkuat-akses-kepulauan-ratusan-penumpang-tiba-selamat-di-calang",
      "date": "2026-06",
      "note": "Traversée du 18/06/2026 : 287 passagers, 62 motos, 38 véhicules à quatre roues ; « une douzaine d'heures ». Aucune grille officielle trouvée. Distance orthodromique."
    },
    {
      "a": "sumatra",
      "b": "nias",
      "routeKey": "sibolgaGunungsitoli", "durationEstimated": true,
      "name": "Sibolga ↔ Gunungsitoli",
      "operator": "ASDP Indonesia Ferry (KMP Jatra I, Jatra II)",
      "durationH": 10,
      "distanceKm": 139,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://sumut.indonesiasatu.co.id/sambut-libur-sekolah-2026-mulai-24-juni-kmp-jatra-ii-kembali-layani-lintasan-sibolgagunung-sitoli-nias",
      "date": "2026-06",
      "note": "Jatra I et II en service à partir du 24/06/2026. Grille de juin 2025 (IVA 1 662 500 IDR, adulte 93 100) baissée en septembre 2025 sans nouveaux montants publiés : aucun tarif courant lisible. Traversée de nuit ~10 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "sumatra",
      "b": "siberut",
      "routeKey": "bungusSiberut", "durationEstimated": true,
      "name": "Bungus (Padang) ↔ Siberut (Maileppet)",
      "operator": "ASDP Indonesia Ferry (KMP Ambu-Ambu)",
      "durationH": 12,
      "distanceKm": 144,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://www.kliksaja.id/nasional/98316807441/info-mentawai-jadwal-kapal-kmp-gambolo-dan-kmp-ambu-ambu-bulan-maret-2026-rute-padang-tua-pejat-siberut-sikakap ; https://www.asdp.id/kapal/kmp-ambu-ambu",
      "date": "2026-03",
      "note": "Ferry roulier ASDP, départs hebdomadaires Padang -> Siberut (16:00, mars 2026). Aucune grille officielle trouvée. Durée de nuit ~12 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "sumatra",
      "b": "sipora",
      "routeKey": "bungusTuaPejat", "durationEstimated": true,
      "name": "Bungus (Padang) ↔ Tua Pejat",
      "operator": "ASDP Indonesia Ferry (KMP Gambolo, KMP Ambu-Ambu)",
      "durationH": 12,
      "distanceKm": 140,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://www.kliksaja.id/nasional/98316807441/info-mentawai-jadwal-kapal-kmp-gambolo-dan-kmp-ambu-ambu-bulan-maret-2026-rute-padang-tua-pejat-siberut-sikakap",
      "date": "2026-03",
      "note": "Départs hebdomadaires Padang -> Tua Pejat (lundi 16:00, mars 2026). Aucune grille officielle trouvée. Durée ~12 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "sumatra",
      "b": "pagai",
      "routeKey": "bungusSikakap", "durationEstimated": true,
      "name": "Bungus (Padang) ↔ Sikakap",
      "operator": "ASDP Indonesia Ferry (KMP Gambolo, KMP Ambu-Ambu)",
      "durationH": 14,
      "distanceKm": 190,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://www.kliksaja.id/nasional/98316807441/info-mentawai-jadwal-kapal-kmp-gambolo-dan-kmp-ambu-ambu-bulan-maret-2026-rute-padang-tua-pejat-siberut-sikakap",
      "date": "2026-03",
      "note": "Départs hebdomadaires Padang -> Sikakap (mercredi 16:00, mars 2026). Aucune grille officielle trouvée. Durée ~14 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "sumatra",
      "b": "bengkalis",
      "routeKey": "sungaiSelariAirPutih", "durationEstimated": true,
      "name": "Sungai Selari (Pakning) ↔ Air Putih (Bengkalis)",
      "operator": "UPT Dishub Riau / Pemkab Bengkalis (KMP Swarna Putri…)",
      "durationH": 0.75,
      "distanceKm": 14,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://riaupos.co/riau/bengkalis/09/09/2026/218407/kapal-ro-ro-masuk-docking-pelayanan-penyeberangan-bengkalis-dikeluhkan-pengguna/",
      "date": "2026-09-09",
      "note": "RoRo toutes les heures 6:30-23:30, files de véhicules en 2026 (Riau Pos, RRI). Aucune grille officielle lisible. Durée ~45 min (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "sumatra",
      "b": "rupat",
      "routeKey": "dumaiTanjungKapal", "durationEstimated": true,
      "name": "Dumai ↔ Tanjung Kapal (Rupat)",
      "operator": "UPT PP Wilayah 1 Dumai, Dishub Riau (KMP Swarna Bengawan, Muria…)",
      "durationH": 1,
      "distanceKm": 18,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://www.siberriau.com/read-8189-2026-03-20-roro-dumairupat-mulai-beroperasi-pukul-1330-wib-pada-1-syawal.html",
      "date": "2026-03-20",
      "note": "RoRo quotidien (11 rotations). Montants relevés par un site local non daté (adulte 11 000, voiture IVa 158 000 IDR) sans grille officielle : non retenus. Durée ~1 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "batam",
      "b": "bintan",
      "routeKey": "telagaPunggurTanjungUban", "priceCovers": "vehicleAndOccupants", "coversSource": "billet véhicule indonésien : « pembelian tiket kendaraan sudah termasuk kendaraan berserta penumpang / muatan di atas kendaraan » (Satpel Lembar, BPTD NTB – Kemenhub, https://www.satpellembar.info/tarif/)", "durationEstimated": true,
      "name": "Telaga Punggur ↔ Tanjung Uban",
      "operator": "ASDP Indonesia Ferry",
      "durationH": 1,
      "distanceKm": 8,
      "priceByClass": {
        "1": 14.98,
        "2": 27.39,
        "5": 2.47,
        "foot": 1.31
      },
      "currency": "IDR",
      "original": {
        "car": 309000,
        "van": 565000,
        "moto": 51000,
        "foot": 27000
      },
      "source": "https://asdp.id/siaran-pers/dorong-pariwisata-kepulauan-bintan-asdp-perkuat-konektivitas-telaga-punggur-tanjung-uban (communiqué de l'exploitant ASDP, 9/10/2025)",
      "date": "2025-10-09",
      "note": "11e audit (19/09/2026) : grille publiée par l'exploitant ASDP (communiqué du 9/10/2025 : adulte 27 000, golongan II 51 000 — « Motor 50cc », coquille pour < 500 cm³ —, IVA 309 000, VA 565 000 IDR), qui remplace la source de presse (Batam Pos) ; montants inchangés. Tarifs normaux annoncés par ASDP (communiqué relayé par Batam Pos, juin 2026) : adulte 27 000, golongan II 51 000, IVA 309 000, VA 565 000 IDR ; remise temporaire du 20/06 au 5/07/2026 ignorée. Billet véhicule indonésien = occupants inclus. Durée ~1 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "bangka",
      "b": "belitung",
      "routeKey": "sadaiTanjungRu", "durationEstimated": true,
      "name": "Sadai ↔ Tanjung Ru",
      "operator": "ASDP / opérateurs privés (KMP Menumbing Raya, KMP Kuala Bate II)",
      "durationH": 5,
      "distanceKm": 159,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://bangka.tribunnews.com/lokal/1686511/tarif-penyeberangan-sadai-belitung-dipastikan-tetap-tiga-armada-siap-layani-penumpang ; https://hubdat.dephub.go.id/id/bptd/babel/satuan-pelayanan/pelabuhan-tanjung-ru/",
      "date": "2026",
      "note": "Ferries rouliers Sadai (Bangka Selatan) - Tanjung Ru (Belitung Timur) ; tarifs « inchangés, conformes aux dispositions officielles » sans montants publiés. Durée ~5 h (ordre de grandeur) ; distance orthodromique. Sadai (et la pointe sud-est de Bangka) rangée dans la masse bangka par iles-insulinde.js (correction du 16/09/2026)."
    },
    {
      "a": "bali",
      "b": "nusaPenida",
      "routeKey": "padangbaiSampalan", "durationEstimated": true,
      "name": "Padangbai ↔ Sampalan (Nusa Penida)",
      "operator": "ASDP Indonesia Ferry (KMP Nusa Jaya Abadi)",
      "durationH": 1.5,
      "distanceKm": 17,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://asdp.id/siaran-pers/asdp-terus-tingkatkan-pelayanan-lintas-padangbai-lembar-dan-padangbai-nusa-penida ; https://catperku.com/jadwal-kapal-ferry-roro-dari-padang-bai-ke-nusa-penida-terbaru/",
      "date": "2026",
      "note": "RoRo ASDP, deux départs par jour (un le dimanche). Montants partiels relayés (adulte 31 700 IDR) sans grille véhicules officielle : non retenus. Durée ~1 h 30 (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "java",
      "b": "borneo",
      "routeKey": "surabayaBanjarmasin", "durationEstimated": true,
      "name": "Surabaya ↔ Banjarmasin",
      "operator": "Dharma Lautan Utama (KM Dharma Kartika 2, Dharma Rucitra 1)",
      "durationH": 20,
      "distanceKm": 478,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://www.metrotvnews.com/read/N6GCVp3G-jadwal-kapal-surabaya-banjarmasin-dua-kapal-beroperasi-bergantian ; https://tanjungpinang.pikiran-rakyat.com/travel-wisata/pr-36810267224/jadwal-kapal-surabaya-banjarmasin-juni-2026-padat-40-pelayaran-siap-layani-penumpang?page=all",
      "date": "2026-06",
      "note": "Navires rouliers quasi quotidiens ; passagers avec véhicule à l'embarquement 6 h avant. Aucune grille véhicules officielle lisible. Durée 19-20 h (presse) ; distance orthodromique."
    },
    {
      "a": "borneo",
      "b": "pulauLaut",
      "routeKey": "batulicinTanjungSerdang", "durationEstimated": true,
      "name": "Batulicin ↔ Tanjung Serdang (Pulau Laut)",
      "operator": "ASDP Indonesia Ferry, filiales et Dharma Lautan Utama",
      "durationH": 0.75,
      "distanceKm": 33,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://kalsel.antaranews.com/berita/493081/asdp-batulicin-siapkan-delapan-kapal-untuk-kelancaran-nataru",
      "date": "2025-12",
      "note": "Huit ferries pour Noël/Nouvel An 2026, jusqu'à 12 rotations/jour, voitures et motos. Aucune grille officielle lisible. Durée ~45 min (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "borneo",
      "b": "sulawesi",
      "routeKey": "batulicinGarongkong", "durationEstimated": true,
      "name": "Batulicin ↔ Garongkong (Barru)",
      "operator": "ASDP Indonesia Ferry (KMP Awu-Awu)",
      "durationH": 24,
      "distanceKm": 413,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://makassar.antaranews.com/berita/466812/asdp-batulicin-buka-rute-tujuan-pelabuhan-garongkong-sulsel ; https://www.threads.com/@djpl_ksopgarongkong/post/DY7avLMAVAf/",
      "date": "2026-06",
      "note": "Ferry roulier (véhicules 4 et 6 roues), horaires publiés par la capitainerie KSOP Garongkong jusqu'en juin 2026, deux départs par semaine. Aucune grille officielle lisible. Durée ~24 h (site secondaire kataomed, ordre de grandeur). Distance : 413 km à vol d'oiseau entre les terminaux OpenStreetMap de Batulicin (way 318476217) et de Garongkong (node 13911655038), minimum de la route maritime ; les ~242 km du site secondaire étaient incompatibles avec l'écart réel entre les ports (septembre 2026)."
    },
    {
      "a": "borneo",
      "b": "tarakan",
      "routeKey": "sebawangTarakan", "durationEstimated": true,
      "name": "Sebawang ↔ Tarakan",
      "operator": "ASDP Indonesia Ferry (KMP Manta)",
      "durationH": 4.5,
      "distanceKm": 89,
      "priceStatus": "variable", "priceByClass": { "1": null, "2": null, "5": null, "foot": null },
      "source": "https://www.detik.com/kalimantan/bisnis/d-8426612/rincian-tarif-penyeberangan-kapal-feri-tarakan-sebawang-mulai-6-april",
      "date": "2026-04-06",
      "note": "Prix non retenus (11e audit, 19/09/2026) : l'arrêté du gouverneur du Kalimantan du Nord n° 100.3.3.1/78/2026 (confirmé par le communiqué ASDP du 9/04/2026, sans montants) est introuvable au JDIH provincial ; montants connus par la seule presse (detik, Antara). Relevé : Arrêté du gouverneur du Kalimantan du Nord n° 100.3.3.1/78/2026, en vigueur le 6/04/2026 (relayé par detik) : adulte économique 81 000, golongan II 190 000 (moto, conducteur et passager inclus), IVa 1 300 000, Va 2 300 000 IDR. Billet véhicule = occupants inclus. Distance 48 milles (publiée) ; durée ~4 h 30 (ordre de grandeur)."
    },
    {
      "a": "tarakan",
      "b": "nunukan",
      "routeKey": "tarakanNunukan", "durationEstimated": true,
      "name": "Tarakan ↔ Nunukan",
      "operator": "ASDP Indonesia Ferry (KMP Manta II)",
      "durationH": 6,
      "distanceKm": 95,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://kalpress.id/2026/06/10/sambut-libur-sekolah-dan-cuti-bersama-asdp-rilis-jadwal-kmp-manta-ii-juni-2026-rute-tarakan-nunukan-sebatik-sei-menggaris-semakin-padat/",
      "date": "2026-06-10",
      "note": "Ligne « perintis » (subventionnée) Tarakan-Nunukan-Sebatik-Sei Menggaris, horaires selon la marée ; 19 à 26 véhicules. Aucune grille officielle lisible. Durée ~6 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "sulawesi",
      "b": "selayar",
      "routeKey": "biraPamatata", "durationEstimated": true,
      "name": "Bira ↔ Pamatata (Selayar)",
      "operator": "ASDP Indonesia Ferry (KMP Takabonerate et autres)",
      "durationH": 2,
      "distanceKm": 31,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://www.asdp.id/siaran-pers/penyeberangan-rute-bira-pamatata-semakin-cepat-dan-mudah-kmp-takabonerate-jadi-andalan-masyarakat-selayar ; https://www.detik.com/sulsel/berita/d-8559826/jadwal-kapal-feri-rute-bira-lintas-pulau-selayar-juli-2026-dan-harga-tiketnya",
      "date": "2026-07",
      "note": "Liaison ASDP Bira-Pamatata ; les tarifs publiés en juillet 2026 concernent la ligne Bira-Patumbukan (IVA 686 000 IDR), pas Pamatata : non retenus. Durée ~2 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "sulawesi",
      "b": "muna",
      "routeKey": "torobuluTampo", "durationEstimated": true,
      "name": "Torobulu ↔ Tampo (Muna)",
      "operator": "KMP Cendrawasih, KMP Nuku, KMP Tunu Pratama Jaya (UPTD Pelabuhan Torobulu)",
      "durationH": 3,
      "distanceKm": 50,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://sultra.antaranews.com/berita/529574/pelabuhan-torobulu-konsel-siapkan-empat-kapal-feri-layani-mudik-2026",
      "date": "2026-03",
      "note": "Trois ferries sur Torobulu-Tampo pour le Lebaran 2026, 2 à 6 rotations/jour, traversée 2 h 30-3 h 30 (Antara). Aucune grille officielle lisible. Distance orthodromique."
    },
    {
      "a": "ambon",
      "b": "seram",
      "routeKey": "hunimuaWaipirit", "priceCovers": "vehicleAndOccupants", "coversSource": "billet véhicule indonésien : « pembelian tiket kendaraan sudah termasuk kendaraan berserta penumpang / muatan di atas kendaraan » (Satpel Lembar, BPTD NTB – Kemenhub, https://www.satpellembar.info/tarif/)", "durationEstimated": true,
      "name": "Hunimua ↔ Waipirit",
      "operator": "ASDP Indonesia Ferry (KMP Erana, Inelika, Rokatenda, Terubuk)",
      "durationH": 1.5,
      "distanceKm": 36,
      "priceByClass": {
        "1": 14.71,
        "2": 20.09,
        "5": 3.05,
        "foot": 1.33
      },
      "currency": "IDR",
      "original": {
        "car": 303445,
        "van": 414475,
        "moto": 63000,
        "foot": 27500
      },
      "source": "https://www.asdp.id/siaran-pers/asdp-resmi-berlakukan-penyesuaian-tarif-di-lintasan-galala-namlea-dan-hunimua-waipirit-ambon ; https://www.asdp.id/siaran-pers/mulai-juni-penyeberangan-hunimua%E2%80%93waipirit-beroperasi-24-jam-tiap-akhir-pekan",
      "date": "2026-06",
      "note": "Grille ASDP (arrêté du gouverneur des Moluques n° 1625/2024, en vigueur le 20/09/2024) : adulte 27 500, golongan II 63 000, IVA 303 445, VA 414 475 IDR ; aucune révision trouvée depuis ; service 24 h le week-end depuis le 1er juin 2026. Mention « (PP) » dans le communiqué supposée désigner la ligne, pas un aller-retour (montants cohérents avec un aller simple). Billet véhicule = occupants inclus. Durée ~1 h 30 (ordre de grandeur). Liang (port de Hunimua) rangé dans la masse ambon par iles-insulinde.js (correction du 16/09/2026)."
    },
    {
      "a": "ambon",
      "b": "buru",
      "routeKey": "galalaNamlea", "priceCovers": "vehicleAndOccupants", "coversSource": "billet véhicule indonésien : « pembelian tiket kendaraan sudah termasuk kendaraan berserta penumpang / muatan di atas kendaraan » (Satpel Lembar, BPTD NTB – Kemenhub, https://www.satpellembar.info/tarif/)", "durationEstimated": true,
      "name": "Galala ↔ Namlea",
      "operator": "ASDP Indonesia Ferry",
      "durationH": 8,
      "distanceKm": 131,
      "priceByClass": {
        "1": 48.81,
        "2": 60.31,
        "5": 10.59,
        "foot": 5.99
      },
      "currency": "IDR",
      "original": {
        "car": 1006779,
        "van": 1244020,
        "moto": 218435,
        "foot": 123600
      },
      "source": "https://www.asdp.id/siaran-pers/asdp-resmi-berlakukan-penyesuaian-tarif-di-lintasan-galala-namlea-dan-hunimua-waipirit-ambon",
      "date": "2024-09-29",
      "note": "Grille ASDP (arrêté du gouverneur des Moluques n° 1625/2024) : adulte 123 600, golongan II 218 435, IVA 1 006 779, VA 1 244 020 IDR ; circulation en 2026 non confirmée par une source datée (à vérifier) ; mention « (PP) » interprétée comme aller simple. Traversée de nuit ~8 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "halmahera",
      "b": "morotai",
      "routeKey": "tobeloDaruba", "durationEstimated": true,
      "name": "Tobelo ↔ Daruba (Morotai)",
      "operator": "ASDP Indonesia Ferry (KMP Maming)",
      "durationH": 3.5,
      "distanceKm": 46,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://halmaheraraya.id/kmp-maming-resmi-layani-rute-tobelo-daruba/ ; https://www.malutpost.com/2025/06/25/asdp-geser-feri-berkapasitas-besar-layani-rute-tobelo-daruba/",
      "date": "2025-07",
      "note": "KMP Maming en service depuis le 3/07/2025 (plaintes sur la priorité donnée aux camions : véhicules transportés). Pas de source 2026 sur le ferry roulier (seul le bateau rapide passagers Dodola Express est cité en août 2026) : à revérifier. Aucune grille officielle. Durée ~3 h 30 (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "timor",
      "b": "flores",
      "routeKey": "kupangLarantuka", "durationEstimated": true,
      "name": "Kupang (Bolok) ↔ Larantuka",
      "operator": "ASDP Indonesia Ferry",
      "durationH": 14,
      "distanceKm": 216,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://kupang.tribunnews.com/bisnis/979467/jadwal-kapal-fery-asdp-kupang-hari-ini-minggu-13-september-2026-kupang-laranuka-jam-1400-wita",
      "date": "2026-09-13",
      "note": "Horaires ASDP Kupang publiés quotidiennement (Pos Kupang). Aucune grille officielle lisible. Traversée de nuit ~14 h (ordre de grandeur) ; distance orthodromique. Bolok et la rive timoraise du détroit de Semau rangés dans la masse timor par iles-insulinde.js (correction du 16/09/2026)."
    },
    {
      "a": "timor",
      "b": "alor",
      "routeKey": "kupangKalabahi", "durationEstimated": true,
      "name": "Kupang (Bolok) ↔ Kalabahi",
      "operator": "ASDP Indonesia Ferry",
      "durationH": 16,
      "distanceKm": 248,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://kupang.tribunnews.com/bisnis/979338/jadwal-kapal-fery-asdp-kupang-hari-ini-sabtu-12-september-2026-kupang-kalabahi-jam-1800-wita",
      "date": "2026-09-12",
      "note": "Horaires ASDP Kupang (Pos Kupang, septembre 2026). Aucune grille officielle lisible. Durée ~16 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "timor",
      "b": "rote",
      "routeKey": "bolokPantaiBaru", "durationEstimated": true,
      "name": "Bolok (Kupang) ↔ Pantai Baru (Rote)",
      "operator": "ASDP Indonesia Ferry (KMP Cakalang II)",
      "durationH": 4,
      "distanceKm": 71,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://kupang.tribunnews.com/bisnis/979467/jadwal-kapal-fery-asdp-kupang-hari-ini-minggu-13-september-2026-kupang-laranuka-jam-1400-wita",
      "date": "2026-09-13",
      "note": "Départ 9:00 vers Pantai Baru (Pos Kupang, septembre 2026). Aucune grille officielle lisible. Durée ~4 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "timor",
      "b": "sabu",
      "routeKey": "kupangSeba", "durationEstimated": true,
      "name": "Kupang (Bolok) ↔ Seba (Sabu)",
      "operator": "ASDP Indonesia Ferry (KMP Uma Kalada)",
      "durationH": 10,
      "distanceKm": 182,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://kupang.tribunnews.com/bisnis/979467/jadwal-kapal-fery-asdp-kupang-hari-ini-minggu-13-september-2026-kupang-laranuka-jam-1400-wita",
      "date": "2026-09",
      "note": "KMP Uma Kalada sur les lignes de Sabu-Raijua (Pos Kupang, septembre 2026). Aucune grille officielle lisible. Durée ~10 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "sumbawa",
      "b": "sumba",
      "routeKey": "sapeWaikelo", "durationEstimated": true,
      "name": "Sape ↔ Waikelo",
      "operator": "ASDP Indonesia Ferry (KMP Cakalang)",
      "durationH": 8,
      "distanceKm": 94,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://sbdkab.go.id/2026/06/09/bupati-sbd-resmikan-pengoperasian-perdana-kmp-cakalang-lintasan-waikelo-sape/",
      "date": "2026-06-09",
      "note": "Ligne rouverte le 24/05/2026, deux traversées par semaine (site officiel du kabupaten Sumba Barat Daya). Aucune grille officielle lisible. Durée ~8 h (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "borneo",
      "b": "labuan",
      "routeKey": "menumbokLabuan", "durationEstimated": true,
      "name": "Menumbok ↔ Labuan",
      "operator": "Labuan Point Enterprise (Labuan Ferry), Binabalu (Galaxy Ferry)",
      "durationH": 1.5,
      "distanceKm": 14,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://ferirorolabuan.com/ ; https://labuanferry.com/ ; https://galaxyferry.com/",
      "date": "2026-09",
      "note": "Ferries RoRo véhicules + passagers, horaires de septembre 2026 ; tarifs véhicules seulement dans les systèmes de réservation des opérateurs : aucune grille lisible. Durée ~1 h 30 (ordre de grandeur) ; distance orthodromique."
    },
    {
      "a": "continental",
      "b": "kohChang",
      "routeKey": "aoThammachatSapparot", "durationEstimated": true,
      "name": "Ao Thammachat ↔ Ao Sapparot (Ko Chang)",
      "operator": "Koh Chang Ferry",
      "durationH": 0.5,
      "distanceKm": 13,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://kohchangferries.com/ferry-koh-chang/ ; https://explorekohchang.com/koh-chang/how-to-get-to-koh-chang/koh-chang-ferries/",
      "date": "2026-09",
      "note": "Ferry voitures + passagers toutes les heures environ (6:30-18:30) ; Centrepoint suspendu depuis 2024. Montants (voiture 120 à 200 THB, passager 80 à 90) divergents et repris seulement par des sites d'information, aucune grille de l'opérateur ou d'une autorité. Durée ~30 min ; distance orthodromique."
    },
    {
      "a": "continental",
      "b": "lanta",
      "routeKey": "huaHinKhlongMak",
      "name": "Ban Hua Hin ↔ Khlong Mak (Ko Lanta Noi)",
      "operator": "Bacs communaux (แพขนานยนต์)",
      "durationH": 0.25,
      "distanceKm": 2,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://www.phuketferry.com/ban-klong-mak-pier-koh-lanta.html ; https://www.phuketferry.com/ban-hua-hin-pier-koh-lanta.html",
      "date": "2026",
      "note": "Bacs à véhicules 6:00-22:00 toutes les 20 min, traversée 10-15 min. Montants (voiture 80 à 100 THB, passager 3 à 20) divergents selon les sites, aucune grille officielle. Pont Hua Hin-Lanta Noi prévu 2029 : liaison à retirer à son ouverture. Distance approximative."
    },
    {
      "a": "continental",
      "b": "phuQuoc",
      "routeKey": "haTienBaiVong", "priceCovers": null, "coversSource": "grille Thạnh Thới : inclusion du conducteur non précisée",
      "name": "Hà Tiên ↔ Bãi Vòng (Phú Quốc)",
      "operator": "Thạnh Thới",
      "durationH": 2.7,
      "distanceKm": 53,
      "priceByClass": {
        "1": 32.94,
        "2": 54.34,
        "5": 7.9,
        "foot": 6.75
      },
      "currency": "VND",
      "original": {
        "car": 1000000,
        "van": 1650000,
        "moto": 240000,
        "foot": 205000
      },
      "source": "https://thanhthoi.vn/",
      "date": "2026-09-16",
      "note": "« Bảng Giá Hà Tiên - Phú Quốc » de l'opérateur : voiture 4-5 places 1 000 000 VND ; classe 2 = véhicule 12-16 places 1 650 000 (7-9 places 1 300 000) ; moto (mô tô) 240 000 (scooter « gắn máy » 95 000) ; adulte 205 000. Inclusion du conducteur non précisée : supposé payant. Horaire 7:30 -> 10:10 (Thriving 20). Rạch Giá-Phú Quốc plus cher (voiture 1 500 000). Distance orthodromique."
    },
    {
      "a": "continental",
      "b": "catBa",
      "routeKey": "dongBaiCaiVieng", "durationEstimated": true,
      "name": "Đồng Bài (Cát Hải) ↔ Cái Viềng (Cát Bà)",
      "operator": "Bến phà Đồng Bài",
      "durationH": 0.33,
      "distanceKm": 3,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://mia.vn/cam-nang-du-lich/kinh-nghiem-di-pha-dong-bai-19237 ; https://catbaexpress.com/bang-gia-ve-pha-ben-got-cai-vieng.html",
      "date": "2026",
      "note": "Bac voitures depuis le terminal de Đồng Bài (ouvert le 1/03/2024, remplace Gót), 5:30-18:30 (été 5:00-19:30). Montants (voiture <9 places 190 000 VND) repris seulement par des sites de voyage, aucune grille officielle. Durée ~20 min et distance ~3 km (ordres de grandeur)."
    },
    {
      "a": "continental",
      "b": "bhola",
      "routeKey": "laharhatVeduria", "durationEstimated": true,
      "name": "Laharhat ↔ Veduria (Bhola)",
      "operator": "BIWTC",
      "durationH": 2,
      "distanceKm": 15,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://www.bssnews.net/special-stories/400040 ; https://en.wikipedia.org/wiki/Bhola_Bridge",
      "date": "2026",
      "note": "Bac roulier BIWTC Barishal-Bhola (bancs de sable perturbant la navigation près de Bheduria, BSS). Grille BIWTC par véhicule citée en ligne mais portail biwtc.portal.gov.bd hors service (« Domain is not available ») : non lisible. Nouvelle ligne Kanchpur-Ilisha (8 h) à l'essai depuis le 27/08/2026, non retenue. Durée 1 h 30-2 h ; distance orthodromique."
    },
    {
      "a": "continental",
      "b": "sandwip",
      "routeKey": "banshbariaGuptachhara",
      "name": "Banshbaria ↔ Guptachhara (Sandwip)",
      "operator": "BIWTC (Kapataksha…)",
      "durationH": 1.17,
      "distanceKm": 20,
      "priceStatus": "unknown",
      "priceByClass": {
        "1": null,
        "2": null,
        "5": null,
        "foot": null
      },
      "source": "https://www.tbsnews.net/bangladesh/ferry-kapataksha-reaches-banshberia-ghat-after-8-hour-stranding-sandwip-route-1532136 ; https://www.tbsnews.net/bangladesh/transport/long-awaited-chattogram-sandwip-ferry-service-begins-operating-1100546",
      "date": "2025-03",
      "note": "Premier bac maritime du pays (mars 2025), 35 véhicules et 600 passagers par ferry, 4 rotations/jour selon la marée, 1 h 10. Tarifs annoncés à l'ouverture (passager 100, moto 200, voiture 900 BDT) relayés par la presse mais grille BIWTC non consultable (portail hors ligne) et non confirmée en 2026 : non retenus. Distance orthodromique."
    }
  ]
};
