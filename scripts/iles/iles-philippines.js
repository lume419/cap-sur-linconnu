// Îles et ferries — Philippines (groupe « philippines »). Voir CONSIGNE-ILES.md.
//
// Aucune île des Philippines n'est reliée par la route au continent asiatique : il n'y a PAS de masse
// `continental` pour PH. `default: 'luzon'` ; toutes les autres grandes îles ont une règle explicite.
//
// Méthode : les codes postaux philippins (champ cp, 4 chiffres) sont attribués PAR MUNICIPALITÉ (1 666 codes
// distincts pour 40 676 lieux). La plupart des règles sont donc des cpPrefix (province / municipalité
// insulaire), complétées par des boîtes pour les îles qui partagent un code avec la « grande terre »
// (Boracay, Talim, Olango, Samal, Nonoc/Hikdop, Siargao…). Règles vérifiées par script contre
// communes-ph.txt (comptage par masse, voisin le plus proche de même masse, lieux proches d'une autre masse).
//
// Ponts / chaussées routiers pris en compte (îles fusionnées) :
//  - Samar ↔ Leyte : pont San Juanico (1973) → masse `leyteSamar` ; Biliran ↔ Leyte : pont de Biliran ;
//    Panaon ↔ Leyte : pont de Liloan ; Calicoan ↔ Samar (Guiuan) : pont.
//  - Mactan ↔ Cebu : ponts Mactan-Mandaue, Marcelo Fernan, CCLEX (2022) → `cebu`.
//  - Panglao ↔ Bohol : ponts/chaussées Tagbilaran–Dauis → `bohol`.
//  - Pacijan ↔ Poro (Camotes) : chaussée → `camotes` (Ponson/Pilar, séparée, reste isolée).
// NON fusionnées (pas de pont routier ouvert au 16/09/2026) :
//  - Samal ↔ Davao : pont SIDC en construction (≈ 62 % en juillet 2026, fin annoncée 2027-2028) ;
//  - Guimaras ↔ Panay / Negros : pont Panay–Guimaras–Negros au stade des études/travaux préliminaires ;
//  - Alabat ↔ Luzon, Siargao ↔ Mindanao, Dinagat, Camiguin, Basilan, Sulu, Tawi-Tawi : aucun pont.
module.exports = {
  landmass: {
    PH: {
      default: 'luzon',
      rules: [
        // ---------- petites îles : chaque lieu isolé seul (aucune liaison tarifée) ----------
        { key: '*', match: { cpPrefix: [
            '3904', '3905',                 // Sabtang, Itbayat (Batanes)
            '4341', '4342',                 // Patnanungan, Jomalig (Quezon)
            '4517',                         // Rapu-Rapu / Batan (Albay)
            '5314',                         // Linapacan (Palawan)
            '5510', '5514', '5515',         // Carabao (San José), Banton/Simara, îlots de Romblon
            '5711',                         // Caluya / Semirara (Antique)
            '6048',                         // Ponson (Pilar, Camotes)
            '6407', '6408', '6410',         // San Antonio (Dalupiri), Capul, Biri (Northern Samar)
            '6546',                         // Maripipi (Biliran)
            '6712', '6722', '6724', '6725', // Tagapul-an, Daram, Almagro, Zumarraga (Samar)
            '7404', '7410', '7411', '7412', '7418', // îles de Sulu hors Jolo (Pata/Tapul, Siasi, Pandami, Lugus…)
            '7505', '7506',                 // Sibutu, Sitangkai (Tawi-Tawi)
            '8015',                         // Balut / Sarangani (Davao Occidental)
            '8416',                         // Socorro — Bucas Grande
            '8419'                          // îlot du détroit de Surigao
          ] }, note: "municipalités entièrement insulaires sans liaison véhicules à tarif publié" },
        { key: '*', match: { box: [
            [14.28, 14.422, 121.19, 121.26],   // Talim (lac Laguna de Bay)
            [10.21, 10.31, 124.045, 124.10],   // Olango (Lapu-Lapu)
            [11.32, 11.35, 124.10, 124.13],    // Malapascua (Daanbantayan)
            [11.42, 11.52, 123.225, 123.30],   // Sicogon et îlots de Carles/Estancia (Iloilo)
            [9.80, 9.90, 125.555, 125.66],     // Nonoc et îlots (Surigao City)
            [9.84, 9.935, 125.49, 125.555],    // Hikdop et îlots (Surigao City)
            [9.90, 9.95, 125.05, 125.10],      // Limasawa (Southern Leyte)
            [14.25, 14.31, 121.79, 121.87],    // Cagbalete (Mauban, Quezon)
            [6.88, 6.965, 125.66, 125.715]     // Talikud (Samal, code 8120 partagé avec Kaputian)
          ] }, note: "îles partageant le code postal d'une municipalité de la grande terre" },
        { key: '*', match: { near: [
            { name: 'Pamilacan', lat: 9.494, lon: 123.9227, km: 1.5 },
            { name: 'Pasil (îlot, Daanbantayan)', lat: 11.299, lon: 123.8907, km: 1.5 },
            { name: 'Cabul-an (îlots Hilutungan, Cordova)', lat: 10.1568, lon: 124.044, km: 1.5 },
            { name: 'Apid (Inopacan)', lat: 10.5364, lon: 124.6358, km: 1.5 },
            { name: 'Balukbaluk (Basilan)', lat: 6.6869, lon: 121.7137, km: 1.5 }
          ] }, note: 'îlots repérés par le contrôle « voisin de même masse à plus de 12 km »' },

        // ---------- îles avec masse propre ----------
        { key: 'boracay',    match: { box: [[11.940, 12.0, 121.90, 121.948]] }, note: 'code 5608 (Malay) partagé avec Caticlan ; pas de pont' },
        { key: 'batanes',    match: { cpPrefix: ['3900', '3901', '3902', '3903'] }, note: 'Batan (Basco, Mahatao, Ivana, Uyugan)' },
        { key: 'polillo',    match: { cpPrefix: ['4337', '4340'] }, note: 'Polillo (Panukulan, Polillo, Burdeos)' },
        { key: 'alabat',     match: { cpPrefix: ['4332', '4333', '4334', '4339'] }, note: 'Alabat, Perez, Quezon — pas de pont' },
        { key: 'marinduque', match: { cpPrefix: ['49'] } },
        { key: 'catanduanes', match: { cpPrefix: ['48'] } },
        { key: 'lubang',     match: { cpPrefix: ['5109', '5110', '5111'] } },
        { key: 'mindoro',    match: { cpPrefix: ['51', '52'] }, note: 'Occidental (51xx) + Oriental (52xx) Mindoro' },
        { key: 'dumaran',    match: { cpPrefix: ['5310', '5311'] } },
        { key: 'palawan',    match: { cpPrefix: ['53'] } },
        { key: 'burias',     match: { cpPrefix: ['5419', '5420'] } },
        { key: 'ticao',      match: { cpPrefix: ['5415', '5416', '5417', '5418'] } },
        { key: 'masbate',    match: { cpPrefix: ['54'] } },
        { key: 'sibuyan',    match: { cpPrefix: ['5511', '5512', '5513'] } },
        { key: 'romblon',    match: { cpPrefix: ['5500'] }, note: 'île de Romblon' },
        { key: 'tablas',     match: { cpPrefix: ['55'] } },
        { key: 'guimaras',   match: { cpPrefix: ['5044', '5045', '5046', '5047'] } },
        { key: 'panay',      match: { cpPrefix: ['50', '56', '57', '58'] }, note: 'Iloilo, Aklan, Antique, Capiz' },
        { key: 'siquijor',   match: { cpPrefix: ['6225', '6226', '6227', '6228', '6229', '6230'] } },
        { key: 'negros',     match: { cpPrefix: ['61', '62'] } },
        { key: 'bantayan',   match: { cpPrefix: ['6052', '6053'] } },
        { key: 'camotes',    match: { cpPrefix: ['6049', '6050', '6051'] }, note: 'Pacijan + Poro (chaussée)' },
        { key: 'cebu',       match: { cpPrefix: ['60'] }, note: 'y compris Mactan (ponts)' },
        { key: 'bohol',      match: { cpPrefix: ['63'] }, note: 'y compris Panglao (ponts)' },
        { key: 'laoang',     match: { box: [[12.545, 12.70, 124.975, 125.09]] }, note: 'îles Laoang/Batag (Northern Samar), sans pont' },
        { key: 'leyteSamar', match: { cpPrefix: ['64', '65', '66', '67', '68'] }, note: 'Samar + Leyte (San Juanico) + Biliran + Panaon' },
        { key: 'camiguin',   match: { cpPrefix: ['9100', '9101', '9102', '9103', '9104'] } },
        { key: 'mindanao',   match: { box: [[7.0, 7.30, 125.40, 125.664]] }, note: 'rive Davao City (Sasa, Lanang, Panacan) du code 8118 partagé avec Samal' },
        { key: 'samal',      match: { cpPrefix: ['8118', '8119', '8120', '8121'] }, note: 'Island Garden City of Samal (+ Talikud)' },
        { key: 'siargao',    match: { box: [[9.65, 10.12, 125.94, 126.20]] } },
        { key: 'dinagat',    match: { box: [[9.90, 10.50, 125.46, 125.82]] } },
        { key: 'basilan',    match: { cpPrefix: ['73'] } },
        { key: 'jolo',       match: { cpPrefix: ['74'] } },
        { key: 'bongao',     match: { box: [[4.95, 5.15, 119.70, 119.90]] }, note: 'Bongao + Sanga-Sanga' },
        { key: 'tawiTawi',   match: { cpPrefix: ['75'] }, note: 'île de Tawi-Tawi' },
        { key: 'mindanao',   match: { cpPrefix: ['7', '8', '9'] } }
      ]
    }
  },
  // Ferries : uniquement des grilles OFFICIELLES publiées par type de véhicule (sites des opérateurs ou PPA).
  // Taux InforEuro septembre 2026 : 1 EUR = 72,482 PHP. Classes : 1 = voiture (Starlite « 4 to 4.9 m »,
  // Trans-Asia « 4W Sedan », PPA « Auto ») ; 2 = van (Starlite « 5 to 5.9 m », Trans-Asia « 4W Van Type »,
  // PPA « L300/Urvan ») ; 5 = moto (≤ 200 cc) ; foot = adulte tarif « Regular », classe la moins chère.
  // Hypothèse commune : tarif véhicule SEUL, conducteur payant son billet (les grilles ne disent pas le
  // contraire, sauf Trans-Asia qui évoque un « free convoy pass » pour certains véhicules — non retenu).
  // durationH / distanceKm : distance MARINA (matrice « Philippine Nautical Highway », mars 2026) quand elle
  // existe, sinon estimation (ligne droite entre ports majorée) ; durées indicatives des horaires publiés.
  ferries: [
    { a: 'luzon', b: 'mindoro', routeKey: 'batangasCalapan', name: 'Batangas ↔ Calapan',
      operator: 'Starlite Ferries', durationH: 2, distanceKm: 44,
      priceByClass: { 1: 58.22, 2: 65.53, 5: 21.8, foot: 9.38 },
      currency: 'PHP', original: { car: 4220, van: 4750, moto: 1580, foot: 680 },
      source: 'https://starliteferries.com/schedule-and-rates-2025-batangas-routes/', date: '2026-09-16',
      note: "page « Schedule and Rates 2026 », Batangas To Calapan ; voiture 4–4,9 m, van 5–5,9 m ; passager reclining seat/economy (Fastcraft 770 PHP non retenu) ; distance MARINA 24 NM ; hors frais de terminal PPA" },
    { a: 'mindoro', b: 'panay', routeKey: 'roxasCaticlan', name: 'Roxas (Mindoro) ↔ Caticlan',
      operator: 'Starlite Ferries', durationH: 4, distanceKm: 89,
      priceByClass: { 1: 103.47, 2: 122.93, 5: 41.25, foot: 18.49 },
      currency: 'PHP', original: { car: 7500, van: 8910, moto: 2990, foot: 1340 },
      source: 'https://starliteferries.com/schedule-and-rates-2025-roxas-mindoro-routes/', date: '2026-09-16',
      note: "Roxas Mindoro To Caticlan (identique sur la page Caticlan routes) ; distance MARINA 48 NM, 4 h ; Caticlan est sur Panay (pas Boracay)" },
    { a: 'luzon', b: 'panay', routeKey: 'batangasCaticlan', name: 'Batangas ↔ Caticlan',
      operator: 'Starlite Ferries', durationH: 10, distanceKm: 239,
      priceByClass: { 1: 248.06, 2: 254.82, 5: 104.58, foot: 29.94 },
      currency: 'PHP', original: { car: 17980, van: 18470, moto: 7580, foot: 2170 },
      source: 'https://starliteferries.com/schedule-and-rates-2025-batangas-routes/', date: '2026-09-16',
      note: "Batangas To Caticlan ; passager reclining seats ; distance MARINA 129 NM ; durée indicative (traversée de nuit)" },
    { a: 'luzon', b: 'romblon', routeKey: 'batangasRomblon', name: 'Batangas ↔ Romblon',
      operator: 'Starlite Ferries', durationH: 10, distanceKm: 189,
      priceByClass: { 1: 217.36, 2: 217.36, 5: 72.29, foot: 17.11 },
      currency: 'PHP', original: { car: 15755, van: 15755, moto: 5240, foot: 1240 },
      source: 'https://starliteferries.com/schedule-and-rates-2025-romblon-routes/', date: '2026-09-16',
      note: "Romblon, Romblon To Batangas (même grille sur Batangas routes) ; 4–4,9 m et 5–5,9 m au même prix ; distance MARINA 102 NM, 10 h (Montenegro)" },
    { a: 'romblon', b: 'sibuyan', routeKey: 'romblonMagdiwang', name: 'Romblon ↔ Magdiwang (Sibuyan)',
      operator: 'Starlite Ferries', durationH: 2, distanceKm: 32,
      priceByClass: { 1: 48.8, 2: 48.8, 5: 8.94, foot: 6.14 },
      currency: 'PHP', original: { car: 3537, van: 3537, moto: 648, foot: 445 },
      source: 'https://starliteferries.com/schedule-and-rates-2025-sibuyan-routes/', date: '2026-09-16',
      note: "Sibuyan (Magdiwang, port d'Ambulong) To Romblon ; distance estimée (28 km en ligne droite), durée indicative" },
    { a: 'romblon', b: 'panay', routeKey: 'romblonRoxasCity', name: 'Romblon ↔ Roxas City',
      operator: 'Starlite Ferries', durationH: 6, distanceKm: 130,
      priceByClass: { 1: 129.76, 2: 129.76, 5: 41.1, foot: 21.38 },
      currency: 'PHP', original: { car: 9405, van: 9405, moto: 2979, foot: 1550 },
      source: 'https://starliteferries.com/schedule-and-rates-2025-romblon-routes/', date: '2026-09-16',
      note: "Romblon, Romblon To Roxas City, Capiz (port de Culasi) ; distance estimée (122 km en ligne droite), durée indicative" },
    { a: 'luzon', b: 'sibuyan', routeKey: 'batangasMagdiwang', name: 'Batangas ↔ Magdiwang (Sibuyan)',
      operator: 'Starlite Ferries', durationH: 12, distanceKm: 235,
      priceByClass: { 1: 226.26, 2: 226.26, 5: 85.47, foot: 17.11 },
      currency: 'PHP', original: { car: 16400, van: 16400, moto: 6195, foot: 1240 },
      source: 'https://starliteferries.com/schedule-and-rates-2025-sibuyan-routes/', date: '2026-09-16',
      note: "Sibuyan (Magdiwang) To Batangas, escale Romblon ; distance estimée, durée indicative" },
    { a: 'cebu', b: 'bohol', routeKey: 'cebuTagbilaran', name: 'Cebu ↔ Tagbilaran',
      operator: 'Trans-Asia Shipping Lines', durationH: 4, distanceKm: 80,
      priceByClass: { 1: 74.78, 2: 144.31, 5: 18.49, foot: 6.62 },
      currency: 'PHP', original: { car: 5420, van: 10460, moto: 1340, foot: 480 },
      source: 'https://transasiashipping.com/rolling-cargo-rates-freighters/ ; https://transasiashipping.com/passage-fare-vismin/', date: '2026-09-16',
      note: "grille véhicules « as of April 2026 », sens Cebu→Tagbilaran (retour : sedan 3 020, van 4 820 PHP) ; sedan/van marqués « * selon dimensions » ; passager 2nd class non aircon « as of June 15, 2026 » ; hors frais portuaires ; distance estimée" },
    { a: 'cebu', b: 'masbate', routeKey: 'cebuMasbate', name: 'Cebu ↔ Masbate',
      operator: 'Trans-Asia Shipping Lines', durationH: 12, distanceKm: 250,
      priceByClass: { 1: 134.79, 2: 152.73, 5: 36.15, foot: 21.52 },
      currency: 'PHP', original: { car: 9770, van: 11070, moto: 2620, foot: 1560 },
      source: 'https://transasiashipping.com/rolling-cargo-rates-freighters/ ; https://transasiashipping.com/passage-fare-vismin/', date: '2026-09-16',
      note: "Cebu→Masbate City (moto retour 3 346,38 PHP) ; grilles avril / juin 2026 ; distance estimée (233 km en ligne droite), durée indicative" },
    { a: 'cebu', b: 'panay', routeKey: 'cebuIloilo', name: 'Cebu ↔ Iloilo',
      operator: 'Trans-Asia Shipping Lines', durationH: 14, distanceKm: 420,
      priceByClass: { 1: 262.38, 2: 550.69, 5: 52.7, foot: 27.04 },
      currency: 'PHP', original: { car: 19017.55, van: 39914.86, moto: 3819.51, foot: 1960 },
      source: 'https://transasiashipping.com/rolling-cargo-rates-freighters/ ; https://transasiashipping.com/passage-fare-vismin/', date: '2026-09-16',
      note: "sens Cebu→Iloilo (retour nettement moins cher : sedan 14 060, van 19 195 PHP) ; route maritime par le sud de Negros, distance estimée ; durée indicative" },
    { a: 'cebu', b: 'mindanao', routeKey: 'cebuCagayanDeOro', name: 'Cebu ↔ Cagayan de Oro',
      operator: 'Trans-Asia Shipping Lines', durationH: 10, distanceKm: 260,
      priceByClass: { 1: 191.74, 2: 386.4, 5: 43.61, foot: 23.26 },
      currency: 'PHP', original: { car: 13898, van: 28007, moto: 3161.15, foot: 1686 },
      source: 'https://transasiashipping.com/rolling-cargo-rates-freighters/ ; https://transasiashipping.com/passage-fare-vismin/', date: '2026-09-16',
      note: "départ quotidien 20 h ; passager 2nd class non aircon (tarif du tableau quotidien ; 1 827 PHP certains jours) ; van « * » selon dimensions ; retenue plutôt que Cebu–Surigao ou Nasipit–Cebu (Starlite) comme liaison principale Visayas–Mindanao du nord ; distance estimée" },
    { a: 'bohol', b: 'mindanao', routeKey: 'tagbilaranCagayanDeOro', name: 'Tagbilaran ↔ Cagayan de Oro',
      operator: 'Trans-Asia Shipping Lines', durationH: 8, distanceKm: 175,
      priceByClass: { 1: 125.01, 2: 205.72, 5: 26.14, foot: 20.53 },
      currency: 'PHP', original: { car: 9061, van: 14911, moto: 1894.56, foot: 1488 },
      source: 'https://transasiashipping.com/rolling-cargo-rates-freighters/ ; https://transasiashipping.com/passage-fare-vismin/', date: '2026-09-16',
      note: "grille identique dans les deux sens ; distance estimée (156 km en ligne droite), durée indicative" },
    { a: 'mindanao', b: 'camiguin', routeKey: 'balingoanBenoni', name: 'Balingoan ↔ Benoni (Camiguin)',
      operator: 'Asian Marine Transport Corp. (grille publiée par PPA PMO Misamis Oriental)', durationH: 1.25, distanceKm: 20,
      priceByClass: { 1: 37.18, 2: 46.49, 5: 10.61, foot: 5.52 },
      currency: 'PHP', original: { car: 2695, van: 3370, moto: 769, foot: 400 },
      source: 'http://www.pmocdo.ppa.com.ph/fare-rates-for-rolling-cargo-port-of-balingoan-to-benoni-and-vice-versa/ ; http://www.pmocdo.ppa.com.ph/fare-rates-for-passenger-vessels-port-of-balingoan-to-benoni-and-vice-versa/', date: '2026-09-16',
      note: "page PPA « Fare Rates for Rolling Cargo » (dernière modification 2021) : Auto/Multicab 2 695, L300/Urvan 3 370, Motorcycle 769 ; passager economy Benoni/Guinsiliban 400 PHP « as of March 31, 2023 » ; grilles anciennes mais seules officielles trouvées ; distance estimée (18 km en ligne droite)" }
  ]
};
