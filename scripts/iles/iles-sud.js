// Groupe « sud » : Inde, Sri Lanka, Maldives, Bangladesh, Myanmar, Thaïlande, Viêt Nam, Cambodge,
// Territoire britannique de l'océan Indien, île Christmas, îles Cocos.
// Recherches et vérification contre public/data/communes-xx.txt : 16 septembre 2026.
// Taux InforEuro septembre 2026 : 1 EUR = 38.37 THB = 111.0585 INR.
// NB Caspienne : les ferries Kazakhstan/Turkménistan ↔ Azerbaïdjan (Aktau/Kuryk/Türkmenbaşy ↔ Alat) relient deux
// morceaux de la masse `continental` ; une liaison continental ↔ continental n'a pas de sens dans ce modèle : non modélisés.
module.exports = {
  landmass: {
    IN: {
      rules: [
        { key: 'southAndaman', match: { box: [[11.45, 11.90, 92.50, 92.85]] },
          note: "Île Andaman du Sud (Sri Vijaya Puram/Port Blair, Bamboo Flat…). Pas de pont sur le Middle Strait : pont de 1,96 km en construction (NHIDCL, objectif 31/12/2026), traversée par bac à véhicules." },
        { key: 'middleNorthAndaman', match: { box: [[11.95, 13.70, 92.60, 93.10]] },
          note: "Baratang + Andaman du Milieu + Andaman du Nord : pont de Humphrey Strait (1,45 km, achevé 2022) et pont d'Austin Creek (Mayabunder–Kalighat) sur l'Andaman Trunk Road." },
        { key: 'carNicobar', match: { box: [[9.00, 9.30, 92.65, 92.90]] }, note: 'Car Nicobar, sans liaison routière.' },
        { key: '*', match: { regions: ['Andaman and Nicobar'] }, note: "Filet de sécurité : tout autre lieu de l'archipel isolé." },
        { key: '*', match: { regions: ['Lakshadweep'] }, note: 'Atolls séparés (Kavaratti, Minicoy, Amini…) : chaque lieu isolé.' },
        { key: 'sagar', match: { box: [[21.62, 21.90, 88.02, 88.175]] },
          note: "Île de Sagar (Gangasagar) : Gangasagar Setu sur la Muriganga seulement lancé (première pierre 06/01/2026, L&T, 2–3 ans) ; bac Lot 8–Kachuberia." }
        // Diu : reliée par ponts routiers (Ghoghla/Tad) → continental. Rameswaram : pont routier de Pamban (1988) → continental.
      ]
    },
    LK: {
      default: 'sriLanka',
      rules: [],
      // Île entière sans lien routier avec l'Inde. Îles de Jaffna reliées par chaussées (Kayts/Velanai, Karainagar, Pungudutivu, Mandaitivu) et île de Mannar (chaussée/pont) incluses. Delft, Nainativu, Analaitivu, Eluvaitivu : aucun lieu dans le fichier (vérifié).
    },
    MV: {
      rules: [
        { key: 'maleHulhumale', match: { near: [{ name: 'Male', lat: 4.1752, lon: 73.5092, km: 1.5 }, { name: 'Hulhumale', lat: 4.2117, lon: 73.5401, km: 2 }] },
          note: "Malé–Hulhulé par le pont Sinamalé (2018), Hulhulé–Hulhumalé par chaussée. Villimalé : pont Thilamalé pas encore livré (remise prévue 30/09/2026) — et aucun lieu Villimalé dans le fichier." },
        { key: 'adduLink', match: { near: [{ name: 'Gan (Addu)', lat: -0.70, lon: 73.15, km: 3 }, { name: 'Hithadhoo (Addu)', lat: -0.60, lon: 73.0833, km: 3 }] },
          note: 'Addu : Gan–Feydhoo–Maradhoo–Hithadhoo reliées par la Link Road.' },
        { key: 'hulhumeedhoo', match: { box: [[-0.60, -0.58, 73.22, 73.24]] }, note: 'Meedhoo + Hulhudhoo (+ Hulumido) : une seule île, non reliée à la Link Road.' },
        { key: 'laamuLink', match: { near: [{ name: 'Fonadhoo', lat: 1.8324, lon: 73.5026, km: 1.5 }, { name: 'Gan (Laamu)', lat: 1.9232, lon: 73.5447, km: 1.5 }] },
          note: 'Laamu : Fonadhoo–Maandhoo–Kadhdhoo–Gan reliées par chaussées (~18 km).' },
        { key: 'eydhafushi', match: { near: [{ name: 'Eydhafushi', lat: 5.1033, lon: 73.0708, km: 0.6 }] }, note: "Eydhafushi + « Open Stage » (même île)." },
        { key: '*', match: { box: [[-1.0, 7.2, 72.5, 73.9]] }, note: 'Toutes les autres îles : chaque lieu isolé (y compris les points « atoll » génériques).' }
      ]
    },
    BD: {
      rules: [
        { key: 'bhola', match: { box: [[21.95, 22.10, 90.60, 90.92], [22.10, 22.55, 90.655, 90.92], [22.55, 22.70, 90.575, 90.92], [22.70, 22.80, 90.585, 90.92]] },
          note: "Île de Bhola (Bhola Sadar, Daulatkhan, Borhanuddin, Tazumuddin, Lalmohan, Char Fasson) : aucun pont ; bac BIWTC Laharhat–Veduria. Limites approchées (Tetulia à l'ouest, Meghna à l'est, chenal d'Ilisha au nord)." },
        { key: 'sandwip', match: { box: [[22.38, 22.61, 91.40, 91.56]] }, note: 'Sandwip : aucun pont (vedettes/bateaux Kumira–Guptachhara).' },
        { key: 'kutubdia', match: { box: [[21.70, 21.92, 91.82, 91.872]] }, note: 'Kutubdia : aucun pont (bateaux Magnama–Baraghop).' },
        { key: '*', match: { near: [{ name: 'Sonadia', lat: 21.4833, lon: 91.90, km: 2 }] }, note: 'Sonadia, sans pont.' }
        // Maheshkhali/Matarbari : reliée par le pont routier de Badarkhali (Chakaria) → continental.
        // Saint-Martin, Hatiya, Nijhum Dwip, Manpura : aucun lieu dans le fichier (vérifié).
      ]
    },
    MM: {
      rules: [
        { key: 'cheduba', match: { box: [[18.68, 18.95, 93.48, 93.765]] }, note: 'Île de Man Aung (Cheduba), sans pont.' },
        { key: 'kadan', match: { box: [[12.28, 12.70, 98.20, 98.47]] }, note: "Kadan Kyun (King Island), archipel de Mergui, sans pont. Limite est approchée (chenal face à Myeik)." },
        { key: '*', match: { box: [[11.55, 12.28, 98.00, 98.45], [12.28, 12.70, 97.90, 98.20]] }, note: 'Autres îles de Mergui (Kanmaw/Kyunsu, îlots ouest) : chaque lieu isolé.' }
        // Ramree : reliée au continent par la route → continental.
      ]
    },
    TH: {
      rules: [
        { key: 'samui', match: { box: [[9.40, 9.60, 99.90, 100.12]] }, note: 'Ko Samui (certains lieux étiquetés Nakhon Si Thammarat par erreur).' },
        { key: 'phangan', match: { box: [[9.66, 9.81, 99.94, 100.10]] } },
        { key: 'kohTao', match: { box: [[10.05, 10.14, 99.80, 99.86]] }, note: 'Ko Tao : pas de ferry-auto à tarif publié.' },
        { key: 'kohChang', match: { box: [[11.95, 12.155, 102.25, 102.45]] }, note: 'Ko Chang (le continent — Laem Ngop, Ao Thammachat — commence vers 12,16° N).' },
        { key: 'kohKood', match: { box: [[11.55, 11.72, 102.50, 102.62]] } },
        { key: '*', match: { box: [[11.78, 11.86, 102.43, 102.53]] }, note: 'Ko Mak, Ko Kradat : chaque lieu isolé.' },
        { key: 'lanta', match: { box: [[7.45, 7.60, 98.99, 99.13], [7.60, 7.695, 99.03, 99.135]] },
          note: "Ko Lanta Yai + Ko Lanta Noi (pont Siri Lanta, 2016). Pas de pont vers le continent (pont Hua Hin–Lanta Noi prévu 2029) ; bac Hua Hin–Khlong Mak sans grille officielle trouvée. Limite nord approchée (chenal ≈ 7,69–7,70° N)." },
        { key: '*', match: { box: [[7.75, 7.88, 98.97, 99.03], [7.88, 7.925, 98.97, 99.01]] }, note: 'Ko Jum / Ko Si Boya : chaque lieu isolé.' },
        { key: '*', match: { box: [[7.95, 8.20, 98.54, 98.66]] }, note: 'Ko Yao Noi / Ko Yao Yai : chaque lieu isolé.' },
        { key: '*', match: { box: [[7.65, 7.80, 98.72, 98.80]] }, note: 'Ko Phi Phi.' },
        { key: 'kohSamet', match: { box: [[12.52, 12.60, 101.43, 101.48]] } },
        { key: 'kohSiChang', match: { box: [[13.10, 13.18, 100.79, 100.83]] } },
        { key: '*', match: { box: [[9.70, 9.79, 98.38, 98.44]] }, note: 'Ko Phayam.' },
        { key: '*', match: { box: [[6.45, 6.60, 99.20, 99.35]] }, note: 'Ko Lipe / Ko Adang.' },
        { key: 'kohLibong', match: { box: [[7.19, 7.29, 99.34, 99.415]] } },
        { key: '*', match: { box: [[7.30, 7.39, 99.25, 99.33]] }, note: 'Ko Muk.' }
        // Phuket : pont Sarasin/Thep Krasattri → continental. Ko Yo, Ko Sire : ponts → continental.
      ]
    },
    VN: {
      rules: [
        { key: 'phuQuoc', match: { box: [[9.80, 10.50, 103.80, 104.10]] }, note: 'Phú Quốc (+ An Thới) : ferries-autos Thạnh Thới/Phú Quốc Express sans grille officielle en ligne → isolée.' },
        { key: 'catBa', match: { box: [[20.70, 20.87, 106.93, 107.12]] },
          note: "Cát Bà. Cát Hải (à l'ouest, ≤106,93° E) est reliée au continent par le pont Tân Vũ–Lạch Huyện (2017) → continental. Bac Đồng Bài/Gót–Cái Viềng : pas de grille officielle en ligne." },
        { key: 'conDao', match: { box: [[8.60, 8.80, 106.50, 106.70]] }, note: 'Côn Sơn (Côn Đảo), rattachée administrativement à HCMV.' },
        { key: 'lySon', match: { box: [[15.35, 15.45, 109.05, 109.20]] } },
        { key: '*', match: { box: [[20.75, 21.02, 107.38, 107.85]] }, note: 'Bái Tử Long : Bản Sen, Quan Lạn, Minh Châu, Cô Tô… chaque lieu isolé (Cái Bầu/Vân Đồn, reliée par pont, est au nord de 21,02°).' },
        { key: '*', match: { near: [
          { name: 'Phú Quý', lat: 10.5166, lon: 108.9329, km: 8 },
          { name: 'Bạch Long Vĩ', lat: 20.1315, lon: 107.7308, km: 4 },
          { name: 'Thổ Chu', lat: 9.3031, lon: 103.4755, km: 6 },
          { name: 'Hòn Sơn', lat: 9.80, lon: 104.633, km: 3 },
          { name: 'Cồn Cỏ', lat: 17.1537, lon: 107.3375, km: 2 },
          { name: 'Cù Lao Chàm', lat: 15.95, lon: 108.50, km: 3 },
          { name: 'Bình Ba', lat: 11.8375, lon: 109.2399, km: 2 },
          { name: 'Cù Lao Xanh', lat: 13.6134, lon: 109.3534, km: 2 }
        ] }, note: 'Petites îles isolées.' }
      ]
    },
    KH: {
      rules: [
        { key: 'kohRong', match: { box: [[10.66, 10.82, 103.15, 103.33]] }, note: 'Koh Rong (lieux étiquetés « Koh Kong » par erreur de région), sans ferry-auto.' },
        { key: 'kohRongSamloem', match: { box: [[10.53, 10.66, 103.25, 103.37]] } },
        { key: 'kohKongKrao', match: { box: [[11.26, 11.47, 102.97, 103.035]] }, note: "Koh Kong Krao (+ Koh Kapi) : sans pont. La ville de Koh Kong est sur le continent (pont vers la Thaïlande)." }
      ]
    },
    IO: {
      rules: [
        { key: 'diegoGarcia', match: { box: [[-7.50, -7.20, 72.30, 72.50]] }, note: 'Diego Garcia (Downtown, Seabreeze village).' },
        { key: '*', match: { box: [[-7.6, -5.0, 71.0, 72.6]] }, note: 'Autres atolls (Île Lubine/Peros Banhos).' }
      ]
    },
    CX: { default: 'christmasIsland', rules: [] }, // Île Christmas : 3 lieux sur la même île.
    CC: { rules: [ { key: '*', match: { box: [[-12.3, -11.8, 96.7, 97.0]] }, note: 'Home Island (Bantam Village) et West Island séparées par le lagon.' } ] }
  },

  ferries: [
    { a: 'continental', b: 'samui', routeKey: 'donsakLipaNoi', name: 'Don Sak ↔ Ko Samui (Lipa Noi)',
      operator: 'Raja Ferry Port', durationH: 1.5, distanceKm: 30,
      priceByClass: { 1: 11.99, 2: 11.99, 5: 1.56, foot: 5.47 },
      currency: 'THB', original: { car: 670, van: 670, moto: 270, foot: 210 },
      source: 'https://www.rajaferryport.com/fare (annexe à l\'arrêté de la province de Surat Thani du 6 juin 2565/2022, grille indexée sur le prix du gazole)',
      date: '2026-09-16',
      note: "Palier 8 (gazole 40,00–42,49 THB/l), confirmé par le tarif passager affiché 210 THB sur rajaferryport.com le 16/09/2026. Ligne 7 « voiture, SUV, pick-up, van » = 670 THB conducteur inclus → véhicule seul = 670 − 210 ; moto (ligne 5) 270 − 210. Distance : orthodromie approximative entre les ports. Tarif variable selon le palier gazole." },
    { a: 'continental', b: 'phangan', routeKey: 'donsakThongSala', name: 'Don Sak ↔ Ko Pha Ngan (Thong Sala)',
      operator: 'Raja Ferry Port', durationH: 2.5, distanceKm: 51,
      priceByClass: { 1: 19.81, 2: 19.81, 5: 4.04, foot: 7.30 },
      currency: 'THB', original: { car: 1040, van: 1040, moto: 435, foot: 280 },
      source: 'https://www.rajaferryport.com/fare (annexe à l\'arrêté de la province de Surat Thani du 6 juin 2565/2022)',
      date: '2026-09-16',
      note: "Palier 8, confirmé par le tarif passager affiché 280 THB. Voiture/van 1 040 THB conducteur inclus → véhicule seul = 1 040 − 280 ; moto 435 − 280. Distance approximative." },
    // Ao Thammachat ↔ Ko Chang NON RETENU : grille (voiture 200 THB, moto 150, passager 90, 10/04/2026) reprise seulement
    // par des sites d'information, pas publiée par l'opérateur ni par une autorité — hors règle stricte.
    { a: 'southAndaman', b: 'middleNorthAndaman', routeKey: 'middleStraitNilambur', name: 'Middle Strait ↔ Nilambur (Baratang)',
      operator: 'Directorate of Shipping Services, A&N Administration', durationH: 0.25, distanceKm: 3,
      priceByClass: { 1: 1.71, 2: 3.38, 5: 0.59, foot: 0.14 },
      currency: 'INR', original: { car: 190, van: 375, moto: 65, foot: 16 },
      source: 'https://dss.andamannicobar.gov.in/docs/press/DSS_Passenger_Fares_2026-27.pdf (Order n° 216 du 26/02/2026, annexe 8)',
      date: '2026-04-01',
      note: "Tarifs 2026-27 en vigueur au 01/04/2026, hors taxes et droits portuaires. « Four Wheelers/LV without load » 190 ; classe 2 = « Heavy vehicle without load (minibus/tempo) » 375 ; deux-roues 65 ; passager 16 (même tarif habitants/non-habitants). Véhicule et passagers facturés séparément. Distance approximative (le pont en construction mesure 1,96 km). Liaison à supprimer quand le pont du Middle Strait ouvrira (objectif 31/12/2026)." }
  ]
};
