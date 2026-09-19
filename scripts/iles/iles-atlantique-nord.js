// Groupe « atlantique-nord » : Royaume-Uni (GB), Irlande (IE), Islande (IS), Féroé (FO), Guernesey (GG), Jersey (JE),
// île de Man (IM). Recherches et vérification contre public/data/communes-xx.txt : 16 septembre 2026.
// Taux InforEuro septembre 2026 : 1 EUR = 0,8572 GBP = 140,8 ISK = 7,4748 DKK.
//
// Convention de prix : classe 1 = voiture, 2 = camping-car (≤ 6 m chez CalMac ; catégorie la plus proche ailleurs,
// précisée dans la note), 5 = moto, foot = passager adulte ; véhicule SEUL (conducteur déduit quand le tarif l'inclut),
// pour UNE traversée. Quand l'opérateur ne vend qu'un aller-retour payé à l'aller (Shetland, Cuan, lignes 56/90 des
// Féroé), prix d'une traversée = moitié du retour.
//
// Distances : orthodromies calculées entre les ports (non publiées par les opérateurs).
//
// Ponts / chaussées / tunnels pris en compte (aucune règle : le lieu garde sa masse actuelle) :
// GB — Skye (pont de Skye, 1995), Anglesey et Holy Island (ponts Menai/Britannia, Four Mile Bridge), Seil (Clachan
//   Bridge), Eriska, Scalpay de Harris (pont 1997) et Great Bernera (pont 1953) → Lewis-Harris, Berneray–North Uist
//   (chaussée 1999), Grimsay–Benbecula–South Uist (chaussées) et Eriskay (chaussée 2001) → Uist, Vatersay–Barra
//   (chaussée 1991), Burray/South Ronaldsay (barrières Churchill) → orkney, Trondra/Burra/Muckle Roe (ponts) → shetland,
//   Walney, Roa Island, Hayling, Portsea, Sheppey, Canvey, Mersea, Foulness (pont routier) → greatBritain ;
//   Lindisfarne (Holy Island, chaussée submersible) et Osea Island (chaussée submersible) : gardées dans greatBritain.
//   Sandoy (FO) : tunnel routier de Sandoy (2023) → faroe. Vágar, Eysturoy, Borðoy, Kunoy, Viðoy : tunnels/chaussées → faroe.
//   Valentia (IE) : pont de Portmagee → ireland (aucune règle). Achill, Arranmore, Aran, Tory, Bere, Clare Island,
//   Inishbofin, Cape Clear : AUCUN lieu dans communes-ie.txt (vérifié par boîtes) — rien à séparer.
//   Rathlin (BT) : aucun lieu dans communes-gb.txt. Jersey et île de Man : aucun lieu hors de l'île principale.
const D = '2026-09-16';
const GBP = 0.8572, ISK = 140.8, DKK = 7.4748;
const g = v => Math.round(v / GBP * 100) / 100;
const i = v => Math.round(v / ISK * 100) / 100;
const k = v => Math.round(v / DKK * 100) / 100;
// CalMac : grilles « Summer 2026 » par ligne (PDF « view full summer fares list », valables depuis le 27 mars 2026).
// Tarifs véhicules SANS conducteur (passager en sus). Classe 2 = « Campervan or Motorhome up to 6 metres ».
const calmac = (car, camper, moto, adult) => ({ 1: g(car), 2: g(camper), 5: g(moto), foot: g(adult) });
const orkN = { 1: g(16.00), 2: g(39.50), 5: g(9.20), foot: g(6.75) };
const orkS = { 1: g(11.00), 2: g(27.25), 5: g(5.80), foot: g(3.45) };
// Shetland : aller-retour (véhicule conducteur compris) payé à l'aller : voiture ≤ 5,5 m £16,50, camping-car 5,5-9 m £23,50,
// moto £13,00, adulte £2,80 → par traversée : moitié, moins la part conducteur (£1,40).
const shet = { 1: g(16.50 / 2 - 1.40), 2: g(23.50 / 2 - 1.40), 5: g(13.00 / 2 - 1.40), foot: g(1.40) };
const SHET_SRC = 'https://www.shetland.gov.uk/downloads/file/2963/ferry-fares';

module.exports = {
  landmass: {
    GB: { fallthrough: true, rules: [
      // --- Correction continent / Orcades -----------------------------------------------------------------------
      { key: 'orkney', match: { near: [{ name: 'Burwick', lat: 58.7419, lon: -2.9715, km: 0.5 }] },
        note: "Burwick (South Ronaldsay) porte le code KW1 de Caithness et tombait dans greatBritain ; South Ronaldsay est reliée au Mainland des Orcades par les barrières Churchill." },
      // --- Morvern (continent) avec un code postal de Mull ------------------------------------------------------
      { key: 'greatBritain', match: { near: [{ name: 'Drimnin', lat: 56.6133, lon: -5.9848, km: 0.5 }, { name: 'Bonnavoulin', lat: 56.6000, lon: -5.9667, km: 0.5 }] },
        note: 'Drimnin et Bonnavoulin sont sur la péninsule de Morvern (continent) malgré le code PA75 de Tobermory.' },
      // --- Clyde ---------------------------------------------------------------------------------------------------
      { key: 'arran', match: { cpPrefix: ['KA27'] }, note: "Arran (KA27 : 46 lieux, tous sur l'île). Pas de pont." },
      { key: 'bute', match: { cpPrefix: ['PA20'] }, note: 'Bute (PA20). Pas de pont (Colintraive–Rhubodach et Wemyss Bay–Rothesay sont des ferries).' },
      { key: 'cumbrae', match: { cpPrefix: ['KA28'] }, note: 'Great Cumbrae (Millport).' },
      // --- Hébrides intérieures ------------------------------------------------------------------------------------
      { key: 'ulva', match: { box: [[56.455, 56.50, -6.33, -6.15]] },
        note: "Ulva (Bearnus) et Gometra (reliée à Ulva par un pont). Ulva ↔ Mull : bac à passagers uniquement." },
      { key: 'mull', match: { cpPrefix: ['PA62', 'PA63', 'PA64', 'PA65', 'PA66', 'PA67', 'PA68', 'PA69', 'PA70', 'PA71', 'PA72', 'PA73', 'PA74', 'PA75'] },
        note: 'Mull (codes PA62–PA75, moins Drimnin/Bonnavoulin ci-dessus).' },
      { key: 'iona', match: { cpPrefix: ['PA76'] }, note: 'Iona.' },
      { key: 'tiree', match: { cpPrefix: ['PA77'] }, note: 'Tiree.' },
      { key: 'coll', match: { cpPrefix: ['PA78'] }, note: 'Coll.' },
      { key: 'islay', match: { cpPrefix: ['PA42', 'PA43', 'PA44', 'PA45', 'PA46', 'PA47', 'PA48', 'PA49'] }, note: 'Islay.' },
      { key: 'jura', match: { cpPrefix: ['PA60'] }, note: 'Jura.' },
      { key: 'gigha', match: { cpPrefix: ['PA41'] }, note: 'Gigha.' },
      { key: 'colonsay', match: { cpPrefix: ['PA61'] }, note: 'Colonsay (Oronsay, îlot à gué, sans lieu).' },
      { key: 'kerrera', match: { box: [[56.37, 56.44, -5.60, -5.495]] }, note: 'Kerrera (Balliemore), face à Oban.' },
      { key: 'lismore', match: { box: [[56.48, 56.56, -5.58, -5.43]] }, note: 'Lismore (Achnacroish, Port Ramsay…).' },
      { key: 'luing', match: { box: [[56.19, 56.265, -5.70, -5.60]] }, note: 'Luing (Cullipool, Toberonochy, South Cuan). Seil, au nord du Cuan Sound, reste continentale (pont).' },
      { key: '*', match: { near: [{ name: 'Easdale', lat: 56.2918, lon: -5.6552, km: 0.15 }] }, note: "Easdale Island (bac à passagers depuis Ellenabeich, Seil)." },
      { key: 'eigg', match: { box: [[56.86, 56.93, -6.20, -6.09]] }, note: 'Eigg.' },
      { key: 'muck', match: { box: [[56.81, 56.85, -6.30, -6.19]] }, note: 'Muck.' },
      { key: 'rum', match: { box: [[56.93, 57.07, -6.45, -6.22]] }, note: 'Rum.' },
      { key: 'canna', match: { box: [[57.04, 57.08, -6.62, -6.47]] }, note: 'Canna (et Sanday, reliée par un pont).' },
      { key: 'raasay', match: { box: [[57.33, 57.56, -6.10, -5.95]] }, note: 'Raasay (Inverarish, Clachan, Balachuirn, Brochel, Arnish). Skye reste greatBritain (pont).' },
      // --- Hébrides extérieures --------------------------------------------------------------------------------------
      { key: 'lewisHarris', match: { cpPrefix: ['HS1', 'HS2', 'HS3', 'HS4', 'HS5'] }, note: 'Lewis et Harris (une seule île), avec Scalpay et Great Bernera (ponts).' },
      { key: 'uist', match: { cpPrefix: ['HS6', 'HS7', 'HS8'] }, note: 'Berneray, North Uist, Grimsay, Benbecula, South Uist, Eriskay : chaussées.' },
      { key: 'barra', match: { cpPrefix: ['HS9'] }, note: 'Barra et Vatersay (chaussée).' },
      // --- Orcades (hors Mainland) ---------------------------------------------------------------------------------
      { key: 'hoy', match: { box: [[58.76, 58.86, -3.45, -3.13], [58.86, 58.935, -3.45, -3.28]] }, note: 'Hoy et South Walls (chaussée de l’Ayre).' },
      { key: 'rousay', match: { box: [[59.125, 59.23, -3.13, -2.93]] }, note: 'Rousay.' },
      { key: 'westray', match: { box: [[59.23, 59.37, -3.10, -2.84]] }, note: 'Westray.' },
      { key: 'eday', match: { box: [[59.13, 59.25, -2.84, -2.715]] }, note: 'Eday.' },
      { key: 'sanday', match: { box: [[59.18, 59.33, -2.71, -2.35]] }, note: 'Sanday.' },
      { key: 'stronsay', match: { box: [[59.07, 59.165, -2.72, -2.50]] }, note: 'Stronsay.' },
      { key: 'shapinsay', match: { box: [[59.02, 59.09, -2.97, -2.78]] }, note: 'Shapinsay (Balfour).' },
      // --- Shetland (hors Mainland) --------------------------------------------------------------------------------
      { key: 'bressay', match: { box: [[60.10, 60.19, -1.142, -1.00]] }, note: 'Bressay (Lerwick, à -1,1443, reste sur Mainland).' },
      { key: 'yell', match: { box: [[60.485, 60.75, -1.25, -0.99]] }, note: 'Yell.' },
      { key: 'unst', match: { box: [[60.67, 60.87, -0.99, -0.70]] }, note: 'Unst.' },
      { key: 'fetlar', match: { box: [[60.56, 60.64, -0.95, -0.70]] }, note: 'Fetlar.' },
      { key: 'papaStour', match: { box: [[60.315, 60.36, -1.75, -1.665]] }, note: 'Papa Stour (Biggings).' },
      // --- Angleterre ----------------------------------------------------------------------------------------------
      { key: 'isleOfWight', match: { cpPrefix: ['PO30', 'PO31', 'PO32', 'PO33', 'PO34', 'PO35', 'PO36', 'PO37', 'PO38', 'PO39', 'PO40', 'PO41'] },
        note: "Île de Wight (PO30–PO41 : 125 lieux, identiques à la région « Isle of Wight »)." },
      { key: 'scillyStMarys', match: { cpPrefix: ['TR21'] }, note: "St Mary's (Scilly)." },
      { key: 'scillyStAgnes', match: { cpPrefix: ['TR22'] }, note: 'St Agnes (Scilly), avec Gugh (gué).' },
      { key: 'scillyBryher', match: { cpPrefix: ['TR23'] }, note: 'Bryher (Scilly).' },
      { key: 'scillyTresco', match: { cpPrefix: ['TR24'] }, note: 'Tresco (Scilly).' },
      { key: 'scillyStMartins', match: { cpPrefix: ['TR25'] }, note: "St Martin's (Scilly)." },
      { key: '*', match: { near: [{ name: 'Brownsea Island', lat: 50.6917, lon: -1.9715, km: 0.3 }, { name: 'Furzey Island', lat: 50.6827, lon: -1.9872, km: 0.3 },
        { name: 'Inchmurrin', lat: 56.0428, lon: -4.6098, km: 0.3 }, { name: 'Old Battery (Inchcolm)', lat: 56.0288, lon: -3.2975, km: 0.3 }] },
        note: "Îles sans liaison routière ni ferry pour véhicules : Brownsea et Furzey (port de Poole), Inchmurrin (Loch Lomond), Inchcolm (Firth of Forth)." }
    ] },
    IE: { fallthrough: true, rules: [
      { key: 'sherkin', match: { box: [[51.455, 51.495, -9.45, -9.39]] }, note: 'Sherkin Island (Kilmoon, Farranacoush) ; Baltimore (-9,37) reste sur le continent.' }
    ] },
    IS: { fallthrough: true, rules: [
      { key: 'vestmannaeyjar', match: { cpPrefix: ['900'] }, note: 'Heimaey (Vestmannaeyjar).' },
      { key: 'grimsey', match: { cpPrefix: ['611'] }, note: 'Grímsey.' },
      { key: 'hrisey', match: { near: [{ name: 'Hrísey', lat: 65.9784, lon: -18.3778, km: 1.5 }] }, note: 'Hrísey (code 630 partagé avec Litli-Árskógssandur, sur le continent).' }
    ] },
    FO: { fallthrough: true, rules: [
      { key: 'kalsoy', match: { cpPrefix: ['795', '796', '797', '798'] }, note: 'Kalsoy (Húsar, Syðradalur 796, Mikladalur, Trøllanes) ; tunnels internes. Syðradalur 177 est sur Streymoy.' },
      { key: 'nolsoy', match: { cpPrefix: ['270'] }, note: 'Nólsoy.' },
      { key: 'skuvoy', match: { cpPrefix: ['260'] }, note: 'Skúvoy.' },
      { key: 'hestur', match: { cpPrefix: ['280'] }, note: 'Hestur.' },
      { key: 'koltur', match: { cpPrefix: ['285'] }, note: 'Koltur (hélicoptère seulement).' },
      { key: 'mykines', match: { cpPrefix: ['388'] }, note: 'Mykines (Gásadalur 387 et Vikar sont sur Vágar).' },
      { key: 'svinoy', match: { cpPrefix: ['765'] }, note: 'Svínoy.' },
      { key: 'fugloy', match: { cpPrefix: ['766', '767'] }, note: 'Fugloy (Kirkja, Hattarvík).' }
    ] },
    GG: { fallthrough: true, rules: [
      { key: 'alderney', match: { box: [[49.68, 49.75, -2.26, -2.15]] }, note: 'Aurigny (St Anne, Braye, Newtown…) : jusqu’ici rangée dans guernsey.' },
      { key: 'sark', match: { box: [[49.40, 49.45, -2.40, -2.33]] }, note: 'Sercq, Grande et Petite Sercq (La Coupée, isthme).' },
      { key: 'herm', match: { near: [{ name: 'Herm', lat: 49.4696, lon: -2.4529, km: 1 }] }, note: 'Herm.' }
    ] }
  },
  ferries: [
    // ------------------------------------------------------------------ GB : CalMac
    { a: 'arran', b: 'greatBritain', routeKey: 'ardrossanBrodick', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Ardrossan ↔ Brodick', operator: 'CalMac',
      durationH: 0.92, distanceKm: 21, priceByClass: calmac(21.20, 21.20, 10.60, 5.30),
      source: 'https://assets.calmac.co.uk/media/3slhh51n/ardrossan-brodick-s26.pdf', date: D,
      note: 'Grille été 2026 : voiture £21,20, camping-car ≤ 6 m £21,20, moto £10,60, adulte £5,30 (aller). 55 min (horaire été 2026, 07:00→07:55).' },
    { a: 'bute', b: 'greatBritain', routeKey: 'wemyssBayRothesay', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Wemyss Bay ↔ Rothesay', operator: 'CalMac',
      durationH: 0.58, distanceKm: 11, priceByClass: calmac(15.50, 15.50, 7.75, 4.35),
      source: 'https://assets.calmac.co.uk/media/kh2hkdn3/wemyss-bay-rothesay-s26.pdf', date: D,
      note: 'Voiture £15,50, camping-car ≤ 6 m £15,50, moto £7,75, adulte £4,35. 35 min (horaire été 2026). Colintraive–Rhubodach non retenue (une liaison par paire).' },
    { a: 'cumbrae', b: 'greatBritain', routeKey: 'largsCumbrae', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Largs ↔ Cumbrae Slip', operator: 'CalMac',
      durationH: 0.17, distanceKm: 2, priceByClass: calmac(8.70, 8.70, 4.35, 2.30),
      source: 'https://assets.calmac.co.uk/media/h12d5r3v/largs-cumbrae-s26-v2.pdf', date: D,
      note: 'Voiture £8,70, camping-car ≤ 6 m £8,70, moto £4,35, adulte £2,30. 10 min.' },
    { a: 'greatBritain', b: 'mull', routeKey: 'obanCraignure', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Oban ↔ Craignure', operator: 'CalMac',
      durationH: 0.83, distanceKm: 16, priceByClass: calmac(18.20, 18.20, 9.10, 4.90),
      source: 'https://assets.calmac.co.uk/media/2j2pmonp/oban-craignure-s26.pdf', date: D,
      note: 'Voiture £18,20, camping-car ≤ 6 m £18,20, moto £9,10, adulte £4,90. Oban 06:45 → Craignure 07:35 (horaire été 2026). Lochaline–Fishnish et Kilchoan–Tobermory non retenues.' },
    { a: 'greatBritain', b: 'islay', routeKey: 'kennacraigIslay', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Kennacraig ↔ Port Askaig / Port Ellen', operator: 'CalMac',
      durationH: 1.92, distanceKm: 40, priceByClass: calmac(45.40, 45.40, 22.70, 9.00),
      source: 'https://assets.calmac.co.uk/media/hubnmk3p/kennacraig-islay-s26.pdf', date: D,
      note: 'Grille unique Kennacraig–Islay : voiture £45,40, camping-car ≤ 6 m £45,40, moto £22,70, adulte £9,00. Kennacraig 07:00 → Port Askaig 08:55 (horaire 2 juin–18 oct. 2026).' },
    { a: 'islay', b: 'jura', routeKey: 'portAskaigFeolin', "priceCovers": "vehicle", "coversSource": "véhicule seul : grille du conseil « inc. driver / inc. rider », part adulte déduite (voir note)", "durationEstimated": true, name: 'Port Askaig ↔ Feolin', operator: 'Argyll and Bute Council',
      durationH: 0.08, distanceKm: 1, priceByClass: { 1: g(24.60 / 2 - 2.55), 2: g(24.60 / 2 - 2.55), 5: g(7.40 - 2.55), foot: g(2.55) },
      source: 'https://juraferry.argyll-bute.gov.uk/car-driver', date: D,
      note: "Seul accès routier à Jura. « Car up to 6 Metres, inc. Driver – Return » £24,60 (→ £12,30 l'aller moins l'adulte £2,55) ; véhicules ≤ 6 m au même tarif (grille du conseil) ; « Motorcycle Single, inc. Rider » £7,40 ; adulte £2,55 (juraferry…/foot-passengers-motorcycles-concessions). Durée non publiée (détroit d'environ 800 m) : 5 min estimées." },
    { a: 'colonsay', b: 'greatBritain', routeKey: 'obanColonsay', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Oban ↔ Colonsay', operator: 'CalMac',
      durationH: 2.25, distanceKm: 58, priceByClass: calmac(50.95, 50.95, 25.50, 9.95),
      source: 'https://assets.calmac.co.uk/media/mn4bpd31/oban-colonsay-s26.pdf', date: D,
      note: "Voiture £50,95, camping-car ≤ 6 m £50,95 (uniquement avec accord préalable du Colonsay Estate), moto £25,50, adulte £9,95. Oban 16:20 → Colonsay 18:35." },
    { a: 'colonsay', b: 'islay', routeKey: 'portAskaigColonsay', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Port Askaig ↔ Colonsay', operator: 'CalMac',
      durationH: 1, distanceKm: 25, priceByClass: calmac(23.60, 23.60, 11.80, 5.60),
      source: 'https://assets.calmac.co.uk/media/zmxb33qc/port-askaig-colonsay-s26.pdf', date: D,
      note: 'Voiture £23,60, camping-car ≤ 6 m £23,60, moto £11,80, adulte £5,60. Mercredi et samedi seulement ; Port Askaig 12:45 → Colonsay 13:45 (horaire été 2026).' },
    { a: 'gigha', b: 'greatBritain', routeKey: 'tayinloanGigha', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Tayinloan ↔ Gigha', operator: 'CalMac',
      durationH: 0.33, distanceKm: 5, priceByClass: calmac(10.45, 10.45, 5.25, 3.70),
      source: 'https://assets.calmac.co.uk/media/js3dhfqu/tayinloan-gigha-s26.pdf', date: D,
      note: 'Voiture £10,45, camping-car ≤ 6 m £10,45 (caravanes interdites sur Gigha), moto £5,25, adulte £3,70. 20 min.' },
    { a: 'coll', b: 'greatBritain', routeKey: 'obanColl', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Oban ↔ Coll', operator: 'CalMac',
      durationH: 2.67, distanceKm: 68, priceByClass: calmac(62.75, 62.75, 31.40, 11.80),
      source: 'https://assets.calmac.co.uk/media/xhoc40kd/oban-coll-s26.pdf', date: D,
      note: 'Voiture £62,75, camping-car ≤ 6 m £62,75 (emplacement réservé exigé), moto £31,40, adulte £11,80. Oban 07:00 → Coll 09:40.' },
    { a: 'greatBritain', b: 'tiree', routeKey: 'obanTiree', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Oban ↔ Tiree', operator: 'CalMac',
      durationH: 3.83, distanceKm: 82, priceByClass: calmac(77.30, 77.30, 38.65, 14.20),
      source: 'https://assets.calmac.co.uk/media/1yldqd0r/oban-tiree-s26.pdf', date: D,
      note: 'Voiture £77,30, camping-car ≤ 6 m £77,30 (emplacement réservé exigé), moto £38,65, adulte £14,20. Via Coll : Oban 07:00 → Tiree 10:50.' },
    { a: 'coll', b: 'tiree', routeKey: 'collTiree', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Coll ↔ Tiree', operator: 'CalMac',
      durationH: 0.92, distanceKm: 22, priceByClass: calmac(21.25, 21.25, 10.65, 4.75),
      source: 'https://assets.calmac.co.uk/media/zbbfp5rw/coll-tiree-s26.pdf', date: D,
      note: 'Voiture £21,25, camping-car ≤ 6 m £21,25, moto £10,65, adulte £4,75. Coll 09:55 → Tiree 10:50.' },
    { a: 'greatBritain', b: 'lismore', routeKey: 'obanLismore', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Oban ↔ Lismore', operator: 'CalMac',
      durationH: 0.92, distanceKm: 11, priceByClass: calmac(16.15, 16.15, 8.10, 3.85),
      source: 'https://assets.calmac.co.uk/media/rtrjotaf/oban-lismore-s26.pdf', date: D,
      note: 'Voiture £16,15, camping-car ≤ 6 m £16,15, moto £8,10, adulte £3,85. 55 min (horaire été 2026). Port Appin–Point : passagers seulement.' },
    { a: 'greatBritain', b: 'luing', routeKey: 'cuanLuing', "priceCovers": "vehicle", "coversSource": "véhicule seul : grille du conseil « inc. driver / inc. rider », part adulte déduite (voir note)", name: 'Cuan ↔ Luing', operator: 'Argyll and Bute Council',
      durationH: 0.08, distanceKm: 0.5, priceByClass: { 1: g(13.80 / 2 - 2.85 / 2), 2: g(13.80 / 2 - 2.85 / 2), 5: g(7.30 / 2 - 2.85 / 2), foot: g(2.85 / 2) },
      source: 'https://cuanferry.argyll-bute.gov.uk/cars-2', date: D,
      note: "Billets aller-retour uniquement : « Private Vehicles Return (Up to 6m, inc. driver) » £13,80, « Motorcycle Return, Inc. Rider » £7,30, « Adult Return » £2,85 (cuanferry…/copy-of-cars-to-5-metres) ; par traversée : moitié, conducteur déduit. Traversée ≤ 5 min (départs de Seil et de Luing espacés de 5 min, horaire d'hiver 2026-27)." },
    { a: 'greatBritain', b: 'raasay', routeKey: 'sconserRaasay', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Sconser ↔ Raasay', operator: 'CalMac',
      durationH: 0.42, distanceKm: 4, priceByClass: calmac(8.75, 8.75, 4.40, 2.65),
      source: 'https://assets.calmac.co.uk/media/b5ilfsq3/sconser-raasay-s26.pdf', date: D,
      note: 'Voiture £8,75, camping-car ≤ 6 m £8,75, moto £4,40, adulte £2,65. 25 min. Sconser est sur Skye (greatBritain par le pont).' },
    { a: 'greatBritain', b: 'lewisHarris', routeKey: 'ullapoolStornoway', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Ullapool ↔ Stornoway', operator: 'CalMac',
      durationH: 2.67, distanceKm: 80, priceByClass: calmac(69.05, 69.05, 34.55, 12.75),
      source: 'https://assets.calmac.co.uk/media/ws0j33hu/ullapool-stornoway-s26.pdf', date: D,
      note: 'Voiture £69,05, camping-car ≤ 6 m £69,05, moto £34,55, adulte £12,75. Stornoway 07:00 → Ullapool 09:40. Uig–Tarbert non retenue.' },
    { a: 'greatBritain', b: 'uist', routeKey: 'uigLochmaddy', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Uig ↔ Lochmaddy', operator: 'CalMac',
      durationH: 1.75, distanceKm: 48, priceByClass: calmac(41.90, 41.90, 20.95, 8.50),
      source: 'https://assets.calmac.co.uk/media/sdkjo22t/uig-lochmaddy-s26.pdf', date: D,
      note: 'Voiture £41,90, camping-car ≤ 6 m £41,90, moto £20,95, adulte £8,50. Uig 09:30 → Lochmaddy 11:15. Uig est sur Skye. Mallaig/Oban–Lochboisdale non retenue.' },
    { a: 'lewisHarris', b: 'uist', routeKey: 'bernerayLeverburgh', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Berneray ↔ Leverburgh', operator: 'CalMac',
      durationH: 1, distanceKm: 11, priceByClass: calmac(18.45, 18.45, 9.25, 4.90),
      source: 'https://assets.calmac.co.uk/media/5xmboukn/berneray-leverburgh-s26.pdf', date: D,
      note: 'Voiture £18,45, camping-car ≤ 6 m £18,45, moto £9,25, adulte £4,90. Berneray 08:00 → Leverburgh 09:00 (horaire hiver 2026-27, PDF wtt-23).' },
    { a: 'barra', b: 'uist', routeKey: 'ardmhorEriskay', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Ardmhor (Barra) ↔ Eriskay', operator: 'CalMac',
      durationH: 0.67, distanceKm: 11, priceByClass: calmac(14.45, 14.45, 7.25, 4.20),
      source: 'https://assets.calmac.co.uk/media/wtvcanyh/ardmhor-eriskay-s26.pdf', date: D,
      note: 'Voiture £14,45, camping-car ≤ 6 m £14,45, moto £7,25, adulte £4,20. 40 min.' },
    { a: 'barra', b: 'greatBritain', routeKey: 'obanCastlebay', "priceCovers": "vehicle", "coversSource": "véhicule seul : CalMac, « the vehicle ticket does not include the driver fare, the driver is classed as a passenger » (https://www.calmac.co.uk/en-gb/faqs/tickets-and-reservations/how-do-you-charge-for-vehicles/)", name: 'Oban ↔ Castlebay', operator: 'CalMac',
      durationH: 4.75, distanceKm: 137, priceByClass: calmac(91.95, 91.95, 46.00, 19.70),
      source: 'https://assets.calmac.co.uk/media/jcijzce4/oban-castlebay-s26.pdf', date: D,
      note: 'Voiture £91,95, camping-car ≤ 6 m £91,95, moto £46,00, adulte £19,70. Oban 13:10 → Castlebay 17:55.' },
    // ------------------------------------------------------------------ GB : île de Wight
    { a: 'greatBritain', b: 'isleOfWight', routeKey: 'portsmouthFishbourne', name: 'Portsmouth ↔ Fishbourne', operator: 'Wightlink',
      durationH: 0.75, distanceKm: 11, priceByClass: { 1: null, 2: null, 5: null, foot: null }, priceStatus: 'variable',
      source: 'https://www.wightlink.co.uk/tickets/vehicle-tickets', date: D,
      note: "Prix selon jour, heure, remplissage et taille du véhicule (« from £38 each way with a car » en accueil) : pas de grille fixe. 45 min. Lymington–Yarmouth (Wightlink) et Southampton–East Cowes (Red Funnel) non retenues (une liaison par paire)." },
    // ------------------------------------------------------------------ GB : Orkney Ferries (tarifs du 1er avril 2026)
    { a: 'hoy', b: 'orkney', routeKey: 'houtonLyness', "priceCovers": null, "coversSource": "grille Orkney Ferries : tables passagers et véhicules séparées, inclusion du conducteur non écrite", name: 'Houton ↔ Lyness', operator: 'Orkney Ferries',
      durationH: 0.58, distanceKm: 9, priceByClass: orkS,
      source: 'https://www.orkneyferries.co.uk/documents/south-and-inner-isles-2026-27', date: D,
      note: "Grille South Isles, Shapinsay & Rousay : voiture ≤ 5,5 m £11,00, camping-car 5,51-8 m £27,25 (≤ 5,5 m : £11,00), moto £5,80, adulte £3,45 (aller). Lyness 07:10 → Houton 07:45 (été 2026)." },
    { a: 'orkney', b: 'rousay', routeKey: 'tingwallRousay', "priceCovers": null, "coversSource": "grille Orkney Ferries : tables passagers et véhicules séparées, inclusion du conducteur non écrite", name: 'Tingwall ↔ Rousay', operator: 'Orkney Ferries',
      durationH: 0.42, distanceKm: 5, priceByClass: orkS,
      source: 'https://www.orkneyferries.co.uk/documents/south-and-inner-isles-2026-27', date: D,
      note: 'Même grille que Hoy. Tingwall 11:50 → Rousay 12:15 (été 2026).' },
    { a: 'orkney', b: 'shapinsay', routeKey: 'kirkwallShapinsay', "priceCovers": null, "coversSource": "grille Orkney Ferries : tables passagers et véhicules séparées, inclusion du conducteur non écrite", "durationEstimated": true, name: 'Kirkwall ↔ Shapinsay', operator: 'Orkney Ferries',
      durationH: 0.5, distanceKm: 6, priceByClass: orkS,
      source: 'https://www.orkneyferries.co.uk/documents/south-and-inner-isles-2026-27', date: D,
      note: "Même grille que Hoy. Durée non indiquée (rotations de 45 min entre départs Shapinsay et Kirkwall) : 0,5 h retenue comme majorant." },
    { a: 'orkney', b: 'westray', routeKey: 'kirkwallWestray', "priceCovers": null, "coversSource": "grille Orkney Ferries : tables passagers et véhicules séparées, inclusion du conducteur non écrite", name: 'Kirkwall ↔ Rapness (Westray)', operator: 'Orkney Ferries',
      durationH: 1.42, distanceKm: 29, priceByClass: orkN,
      source: 'https://www.orkneyferries.co.uk/documents/north-isles-fares-26-27', date: D,
      note: "Grille North Isles : voiture ≤ 5,5 m £16,00, camping-car 5,51-8 m £39,50 (≤ 5,5 m : £16,00), moto £9,20, adulte £6,75 (aller). Kirkwall 07:20 → Westray 08:45 (été 2026)." },
    { a: 'eday', b: 'orkney', routeKey: 'kirkwallEday', "priceCovers": null, "coversSource": "grille Orkney Ferries : tables passagers et véhicules séparées, inclusion du conducteur non écrite", name: 'Kirkwall ↔ Eday', operator: 'Orkney Ferries',
      durationH: 1.25, distanceKm: 25, priceByClass: orkN,
      source: 'https://www.orkneyferries.co.uk/documents/north-isles-fares-26-27', date: D,
      note: 'Grille North Isles. Kirkwall 16:00 → Eday 17:15 (été 2026).' },
    { a: 'orkney', b: 'sanday', routeKey: 'kirkwallSanday', "priceCovers": null, "coversSource": "grille Orkney Ferries : tables passagers et véhicules séparées, inclusion du conducteur non écrite", name: 'Kirkwall ↔ Loth (Sanday)', operator: 'Orkney Ferries',
      durationH: 1.75, distanceKm: 28, priceByClass: orkN,
      source: 'https://www.orkneyferries.co.uk/documents/north-isles-fares-26-27', date: D,
      note: 'Grille North Isles. Kirkwall 07:40 → Sanday 09:25 via Stronsay (été 2026).' },
    { a: 'orkney', b: 'stronsay', routeKey: 'kirkwallStronsay', "priceCovers": null, "coversSource": "grille Orkney Ferries : tables passagers et véhicules séparées, inclusion du conducteur non écrite", name: 'Kirkwall ↔ Whitehall (Stronsay)', operator: 'Orkney Ferries',
      durationH: 1.67, distanceKm: 27, priceByClass: orkN,
      source: 'https://www.orkneyferries.co.uk/documents/north-isles-fares-26-27', date: D,
      note: 'Grille North Isles. Kirkwall 07:00 → Stronsay 08:40 (lundi, été 2026).' },
    // ------------------------------------------------------------------ GB : Shetland Islands Council (tarifs du 1er avril 2026)
    { a: 'bressay', b: 'shetland', routeKey: 'lerwickBressay', "priceCovers": "vehicle", "coversSource": "véhicule seul : grille SIC « conducteur compris », part conducteur déduite (voir note)", "durationEstimated": true, name: 'Lerwick ↔ Bressay', operator: 'Shetland Islands Council',
      durationH: 0.12, distanceKm: 1, priceByClass: shet, source: SHET_SRC, date: D,
      note: "Aller-retour payé à l'aller, conducteur compris : voiture ≤ 5,5 m £16,50, camping-car 5,5-9 m £23,50, moto £13,00, adulte £2,80 ; par traversée : moitié moins la part conducteur. 7 min (shetland.org)." },
    { a: 'shetland', b: 'yell', routeKey: 'toftUlsta', "priceCovers": "vehicle", "coversSource": "véhicule seul : grille SIC « conducteur compris », part conducteur déduite (voir note)", "durationEstimated": true, name: 'Toft ↔ Ulsta', operator: 'Shetland Islands Council',
      durationH: 0.33, distanceKm: 4, priceByClass: shet, source: SHET_SRC, date: D,
      note: 'Même grille que Bressay. 20 min (shetland.org).' },
    { a: 'unst', b: 'yell', routeKey: 'gutcherBelmont', "priceCovers": "vehicle", "coversSource": "véhicule seul : grille SIC « conducteur compris », part conducteur déduite (voir note)", name: 'Gutcher ↔ Belmont', operator: 'Shetland Islands Council',
      durationH: 0.17, distanceKm: 2, priceByClass: shet, source: SHET_SRC, date: D,
      note: "Même grille ; un seul paiement Yell Sound + Bluemull Sound si le trajet part du Mainland le même jour (grille SIC). 10 min." },
    { a: 'fetlar', b: 'yell', routeKey: 'gutcherHamarsNess', "priceCovers": "vehicle", "coversSource": "véhicule seul : grille SIC « conducteur compris », part conducteur déduite (voir note)", "durationEstimated": true, name: 'Gutcher ↔ Hamars Ness (Fetlar)', operator: 'Shetland Islands Council',
      durationH: 0.42, distanceKm: 7, priceByClass: shet, source: SHET_SRC, date: D,
      note: 'Même grille. 25 min (shetland.org).' },
    { a: 'papaStour', b: 'shetland', routeKey: 'westBurrafirthPapaStour', "priceCovers": "vehicle", "coversSource": "véhicule seul : grille SIC « conducteur compris », part conducteur déduite (voir note)", name: 'West Burrafirth ↔ Papa Stour', operator: 'Shetland Islands Council',
      durationH: 0.67, distanceKm: 9, priceByClass: shet, source: SHET_SRC, date: D,
      note: "Même grille (Papa Stour listée parmi les lignes « return fare »). MV Snolda, 6 voitures, réservation obligatoire, 5 jours par semaine. 40 min." },
    // ------------------------------------------------------------------ IS
    { a: 'iceland', b: 'vestmannaeyjar', routeKey: 'landeyjahofnVestmannaeyjar', "priceCovers": null, "coversSource": "grille Herjólfur : inclusion du conducteur non précisée", "durationEstimated": true, name: 'Landeyjahöfn ↔ Vestmannaeyjar', operator: 'Herjólfur ohf.',
      durationH: 0.58, distanceKm: 12, priceByClass: { 1: i(4050), 2: i(5400), 5: i(2700), foot: i(2700) },
      source: 'https://herjolfur.is/en/prices', date: D,
      note: "Prix 2026 par trajet : voiture < 5 m 4 050 ISK, véhicule > 5 m 5 400 ISK (classe 2), moto 2 700 ISK, adulte 2 700 ISK. 7 départs/jour de chaque côté. Environ 35 min ; l'hiver, déroutement fréquent sur Þorlákshöfn (≈ 2 h 45)." },
    { a: 'grimsey', b: 'iceland', routeKey: 'dalvikGrimsey', "durationEstimated": true, name: 'Dalvík ↔ Grímsey', operator: 'Vegagerðin (Sæfari)',
      durationH: 3, distanceKm: 68, priceByClass: { 1: null, 2: null, 5: null, foot: null }, priceStatus: 'unknown',
      source: 'https://www.vegagerdin.is/en/the-transportation-system/public-transport/ferries/saefari-grimsey', date: D,
      note: "Sæfari transporte voitures et passagers toute l'année ; places voitures réservables seulement par téléphone ou courriel ; aucune grille tarifaire lisible en ligne pour 2026. « About 3 hours each way » (akureyri.is)." },
    // ------------------------------------------------------------------ FO : Strandfaraskip Landsins
    { a: 'faroe', b: 'kalsoy', routeKey: 'klaksvikKalsoy', "priceCovers": null, "coversSource": "grille SSL : inclusion du conducteur non précisée", name: 'Klaksvík ↔ Syðradalur (Kalsoy)', operator: 'Strandfaraskip Landsins',
      durationH: 0.33, distanceKm: 4, priceByClass: { 1: k(336 / 2), 2: k(428 / 2), 5: k(214 / 2), foot: k(131 / 2) },
      source: 'https://www.ssl.fo/en/prices/prices-ferries', date: D,
      note: "Lignes 56/58/90 : prix aller-retour payé à l'aller seulement (tarif standard) : voiture < 5,5 m 336 DKK, véhicule personnel < 7 m 428 DKK, moto 214 DKK, adulte 131 DKK ; par traversée : moitié. M/F Sam, 20 min." },
    { a: 'faroe', b: 'nolsoy', routeKey: 'torshavnNolsoy', "priceCovers": null, "coversSource": "grille SSL : inclusion du conducteur non précisée", name: 'Tórshavn ↔ Nólsoy', operator: 'Strandfaraskip Landsins',
      durationH: 0.5, distanceKm: 5, priceByClass: { 1: k(336 / 2), 2: k(428 / 2), 5: k(214 / 2), foot: k(131 / 2) },
      source: 'https://www.ssl.fo/en/prices/prices-ferries', date: D,
      note: 'Ligne 90, même grille que Kalsoy. M/F Ternan, « Sailing time: 30 min ».' }
  ]
};
