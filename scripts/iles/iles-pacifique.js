// Groupe « pacifique » : WS, TO, TV, KI, NR, MH, FM, PW, NU, CK, TK, GU, MP, AS, UM, PN, NF, HM.
// Boîtes : [latMin, latMax, lonMin, lonMax]. Règles évaluées dans l'ordre.
// Antiméridien : Samoa, Tonga, Samoa américaines, Niue, Cook, Tokelau, îles de la Ligne/Phoenix (KI) ont des
// longitudes négatives ; Tuvalu, Gilbert (KI), Marshall, Micronésie, Palaos, Guam, Mariannes, Nauru, Norfolk positives.
const S = (box, note) => ({ key: '*', match: { box }, note });
const B = (key, box, note) => (note ? { key, match: { box }, note } : { key, match: { box } });
module.exports = {
  landmass: {
    // ---------------- Samoa ----------------
    WS: {
      default: 'upolu',
      rules: [
        B('apolima', [[-13.835, -13.80, -172.17, -172.135]], 'Apolima : aucune liaison routière'),
        B('manono', [[-13.87, -13.83, -172.125, -172.09]], 'Manono : ni pont ni chaussée (bateaux depuis Manono-uta)'),
        B('savaii', [[-13.83, -13.40, -172.85, -172.10]], "Savai'i"),
      ]
    },
    // ---------------- Tonga (longitudes négatives, ~ -176 à -173) ----------------
    TO: {
      default: '*',
      rules: [
        B('niuafoou', [[-15.66, -15.54, -175.72, -175.58]], "Niuafo'ou (villages mal étiquetés « Vavau »/« Haapai » dans le fichier)"),
        B('niuatoputapu', [[-16.0, -15.90, -173.83, -173.69]], 'Niuatoputapu'),
        B('eua', [[-21.50, -21.27, -175.0, -174.88]], "'Eua"),
        B('tongatapu', [[-21.32, -21.03, -175.42, -175.0]], 'Tongatapu (quelques villages étiquetés « Vavau » par erreur)'),
        { key: '*', match: { near: [
          { name: 'Hunga', lat: -18.683, lon: -174.122, km: 0.4 },
          { name: 'Nuapapu (Nopapu)', lat: -18.699, lon: -174.075, km: 0.4 },
          { name: 'Kapa', lat: -18.707, lon: -174.037, km: 0.4 },
          { name: 'Falevai (Kapa)', lat: -18.705, lon: -174.035, km: 0.4 },
          { name: "'Otea (Kapa)", lat: -18.688, lon: -174.036, km: 0.4 },
          { name: "Nga'unoho", lat: -18.685, lon: -174.022, km: 0.4 },
          { name: 'Ofu (Vavau)', lat: -18.697, lon: -173.963, km: 0.4 },
          { name: "'Olo'ua", lat: -18.672, lon: -173.956, km: 0.4 },
        ] }, note: "îles du lagon de Vava'u sans chaussée" },
        B('vavau', [[-18.73, -18.56, -174.10, -173.90]], "Vava'u 'Uta + Pangaimotu + 'Utungake + Koloa/Okoa (chaussées routières)"),
        B('lifukaFoa', [[-19.83, -19.725, -174.375, -174.28]], 'Lifuka et Foa reliées par chaussée routière'),
      ]
    },
    // ---------------- Tuvalu (longitudes positives) ----------------
    TV: {
      default: '*',
      rules: [
        B('fongafale', [[-8.56, -8.47, 179.17, 179.22]], 'Fongafale (Funafuti) ; Amatuku et Funafala = îlots isolés'),
        B('nanumea', [[-5.70, -5.65, 176.10, 176.13]]),
        B('nanumanga', [[-6.31, -6.27, 176.30, 176.33]], 'île unique'),
        B('niutao', [[-6.12, -6.09, 177.32, 177.35]], 'île unique (Niulakita, étiquetée Niutao, reste isolée)'),
        B('vaitupu', [[-7.50, -7.45, 178.65, 178.70]], 'île unique'),
        B('nukulaelae', [[-9.38, -9.36, 179.80, 179.82]], 'villages jumeaux de Fangaua'),
      ]
    },
    // ---------------- Kiribati (Gilbert à l'est de 169°E ; Phoenix/Ligne en longitudes négatives) ----------------
    KI: {
      default: '*',
      rules: [
        B('tarawaSud', [[1.32, 1.395, 172.90, 173.17]], 'Tarawa-Sud de Betio à Bonriki/Tanaea + Buota : chaussées (Nippon Causeway) et pont de Buota ; Nord-Tarawa (Abatao…) isolé'),
        B('kiritimati', [[1.70, 2.10, -157.70, -157.20]], 'Kiritimati : London, Tabwakea, Banana, Poland reliés par route'),
        B('teraina', [[4.60, 4.75, -160.45, -160.33]], 'Teraina : île unique'),
        B('banaba', [[-0.90, -0.82, 169.50, 169.56]], 'Banaba : île unique'),
        B('butaritari', [[3.03, 3.19, 172.74, 172.97]], 'îlot de Butaritari (Ukiangang → Kuma, chaussées) ; Bikati et Makin isolés'),
        B('beru', [[-1.39, -1.28, 175.94, 176.03]], 'île unique'),
        B('nikunau', [[-1.41, -1.31, 176.40, 176.49]], 'île unique'),
        B('tamana', [[-2.52, -2.48, 175.96, 176.00]], 'île unique'),
        B('arorae', [[-2.67, -2.62, 176.80, 176.85]], 'île unique'),
      ]
    },
    NR: { default: 'nauru', rules: [] },
    // ---------------- Îles Marshall ----------------
    MH: {
      default: '*',
      rules: [
        { key: '*', match: { near: [{ name: 'Ejit', lat: 7.124, lon: 171.350, km: 0.5 }] }, note: 'Ejit : îlot sans chaussée' },
        B('majuro', [[7.06, 7.16, 171.02, 171.40]], 'Majuro : route continue Laura ↔ Rita par chaussées'),
        B('ebeye', [[8.76, 8.82, 167.72, 167.75]], 'Ebeye–Loi–Gugeegue : chaussée'),
        B('kili', [[5.62, 5.67, 169.10, 169.14]], 'île unique'),
        B('lib', [[8.29, 8.33, 167.36, 167.39]], 'île unique'),
        B('jabat', [[7.73, 7.77, 168.96, 168.99]], 'île unique'),
      ]
    },
    // ---------------- Micronésie ----------------
    FM: {
      default: '*',
      rules: [
        S([[9.612, 9.65, 138.13, 138.168]], "Rumung : pont retiré par les habitants, accès en bateau"),
        B('yap', [[9.42, 9.625, 138.03, 138.20]], 'Yap (Marbaa\') + Gagil-Tomil (chaussée) + Maap (route)'),
        B('kosrae', [[5.25, 5.40, 162.90, 163.05]], 'Kosrae + Lelu (chaussée)'),
        B('weno', [[7.405, 7.50, 151.815, 151.905]], 'Weno (Chuuk)'),
        B('tonoas', [[7.362, 7.40, 151.855, 151.905]], 'Tonoas/Dublon (Chuuk) ; Eten isolée'),
        B('fefan', [[7.312, 7.366, 151.82, 151.86]], 'Fefan (Chuuk)'),
        B('uman', [[7.28, 7.315, 151.865, 151.90]], 'Uman (Chuuk)'),
        S([[6.995, 7.02, 158.24, 158.27]], 'îlots du lagon nord de Pohnpei (Parem, Lenger)'),
        B('pohnpei', [[6.78, 6.995, 158.10, 158.35]], 'Pohnpei + Sokehs, Takatik, Temwen (chaussées)'),
      ]
    },
    // ---------------- Palaos ----------------
    PW: {
      default: '*',
      rules: [
        B('babeldaob', [[7.28, 7.80, 134.40, 134.70]], 'Babeldaob + Koror (pont KB) + Malakal/Ngerekebesang (chaussées)'),
        B('peleliu', [[6.98, 7.10, 134.20, 134.30]]),
        B('angaur', [[6.88, 6.93, 134.11, 134.16]]),
      ]
    },
    NU: { default: 'niue', rules: [] },
    // ---------------- Îles Cook ----------------
    CK: {
      default: '*',
      rules: [
        B('rarotonga', [[-21.30, -21.18, -159.85, -159.72]]),
        B('aitutaki', [[-18.90, -18.82, -159.82, -159.76]], 'île principale ; Manuae (Vai Toka) isolée'),
        B('atiu', [[-20.05, -19.96, -158.15, -158.09]]),
        B('mangaia', [[-21.97, -21.88, -157.98, -157.87]]),
        B('mitiaro', [[-19.91, -19.79, -157.75, -157.68]], '« Mangarei Village » à -19.70 reste isolé (coordonnée hors île)'),
        B('mauke', [[-20.20, -20.12, -157.39, -157.31]]),
      ]
    },
    TK: { default: '*', rules: [] },
    GU: { default: 'guam', rules: [] },
    // ---------------- Mariannes du Nord ----------------
    MP: {
      default: '*',
      rules: [
        B('saipan', [[15.08, 15.30, 145.68, 145.83]]),
        B('tinian', [[14.90, 15.10, 145.55, 145.68]]),
        B('rota', [[14.08, 14.22, 145.10, 145.30]]),
      ]
    },
    // ---------------- Samoa américaines ----------------
    AS: {
      default: '*',
      rules: [
        S([[-14.30, -14.279, -170.566, -170.54]], "Aunu'u : pas de liaison routière"),
        B('tau', [[-14.27, -14.19, -169.54, -169.40]], "Ta'u"),
        B('ofuOlosega', [[-14.20, -14.14, -169.70, -169.59]], 'Ofu et Olosega reliées par pont routier'),
        B('tutuila', [[-14.40, -14.22, -170.86, -170.54]]),
      ]
    },
    UM: { default: '*', rules: [] },
    PN: { default: 'pitcairn', rules: [] },
    NF: { default: 'norfolk', rules: [] },
    HM: { default: '*', rules: [] },
  },
  ferries: [
    { a: 'upolu', b: 'savaii', routeKey: 'mulifanuaSalelologa', name: 'Mulifanua ↔ Salelologa',
      operator: 'Samoa Shipping Corporation', durationH: 1.25, distanceKm: 23,
      priceByClass: { 1: 30.24, 2: 31.83, 5: 9.55, foot: 3.18 },
      currency: 'WST', original: { car: 95, van: 100, moto: 30, foot: 10 },
      source: 'https://www.ssc.ws/timetable-fares-domestic/', date: '2026-09-16',
      note: "Aller simple. Voiture = catégorie B (12–15 ft : berlines, Hilux, Hiace…) ; van = catégorie C (15–18 ft : vans américains, pick-up longs) ; cat. A (10–12 ft, petites 2 portes) = 80 WST. Moto/scooter 30 WST. La grille ne dit pas si le conducteur est inclus : prix véhicule pris tel quel. Durée 60–90 min (samoa.travel), distance orthodromique quais. Taux InforEuro 09/2026 : 1 € = 3,14166 WST." },
    { a: 'tutuila', b: 'tau', routeKey: 'pagoPagoTau', name: "Pago Pago ↔ Faleāsao (Ta'u)",
      operator: 'American Samoa Government – Port Administration, Water Transportation Division (MV Manuʻatele)', durationH: 8, distanceKm: 128,
      priceByClass: { 1: 214.72, 2: 429.44, 5: null, foot: 25.77 },
      currency: 'USD', original: { car: 250, van: 500, foot: 30 },
      source: 'https://portadministration.as.gov/services/water-transportation-wtd', date: '2026-09-16',
      note: "Aller simple. Voiture = « mini-compact / compact / mid-size » 250 USD ; van = « large » 500 USD ; adulte 30 USD. Pas de tarif moto publié (classe 5 absente). Service quinzainier (jeudi aller, vendredi retour), horaires sujets à changement. Durée ~8 h aller / 6,5 h retour (americansamoapocketguide.com). Taux InforEuro 09/2026 : 1 € = 1,1643 USD." },
    { a: 'tutuila', b: 'ofuOlosega', routeKey: 'pagoPagoOfu', name: 'Pago Pago ↔ Ofu',
      operator: 'American Samoa Government – Port Administration, Water Transportation Division (MV Manuʻatele)', durationH: 8, distanceKm: 111,
      priceByClass: { 1: 214.72, 2: 429.44, 5: null, foot: 25.77 },
      currency: 'USD', original: { car: 250, van: 500, foot: 30 },
      source: 'https://portadministration.as.gov/services/water-transportation-wtd', date: '2026-09-16',
      note: "Même grille « Manu'a » que Ta'u (tarif unique pour Manu'a). Escale à Ofu après Ta'u (americansamoapocketguide.com). Pas de tarif moto publié. Taux InforEuro 09/2026 : 1 € = 1,1643 USD." },
  ]
};
