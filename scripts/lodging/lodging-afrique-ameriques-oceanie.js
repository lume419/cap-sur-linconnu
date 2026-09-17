// Région : afrique-ameriques-oceanie
//   Afrique subsaharienne (+ océan Indien), Amériques (Nord, Caraïbes, Centre, Sud, Groenland, Malouines), Océanie.
// Date : 2026-09-17
// Méthode :
//   - Statuts « absent » : presse / pages de guides + constat direct sur le site de la plateforme.
//   - Statuts « limited » par offre très faible : relevé direct le 2026-09-17 du nombre d'hébergements affiché
//     par Booking.com (https://www.booking.com/country/XX.html, « pick from N hotels ») et par Airbnb
//     (https://www.airbnb.com/s/<Pays>/homes, bouton « Show N places »). Seuil retenu : < 20 hébergements
//     pour tout le pays/territoire. Les comptes Airbnb peuvent inclure quelques annonces de zones voisines
//     (recherche cartographique) : ce sont des ordres de grandeur.
//   - Plateformes locales : chaque URL testée (curl ou navigateur) sur un exemple réel ; constat noté dans `verified`.
// Limites :
//   - Les pays ok/ok sans plateforme locale utile ne sont pas listés (Kenya, Brésil, Mexique, Caraïbes, etc.).
//   - Venezuela : Airbnb (1 000+) et Booking (865) disponibles en 2026, aucune plateforme locale dominante vérifiée → non listé.
//   - Territoires inhabités (GS, AQ, BV, HM, UM) et TF non traités.
//   - Pour Tokelau, Nauru, Marshall, Érythrée, Tchad, RCA, Niger, Guinée équatoriale, Micronésie, Soudan :
//     aucune plateforme locale en ligne vérifiable trouvée → local: [].
module.exports = [
  // ───────────── Priorité 1 : plateforme absente ou restreinte (sanctions / retrait) ─────────────
  { country: 'CU',
    airbnb: 'limited', booking: 'absent',
    statusSource: 'https://cubasbest.com/airbnb-hides-cuba-listings/',
    statusNote: "Airbnb : depuis février 2025, ne peut plus payer les hôtes sur comptes cubains (MLC) du fait des règles "
      + "américaines ; annonces masquées et réservations annulées en 2026 sauf hôtes payés à l'étranger "
      + "(voir aussi https://havanatimes.org/features/airbnb-pauses-services-in-cuba-impacting-hosts-and-tourism/). "
      + "Booking.com : plateforme cubaine suspendue en décembre 2019 (https://www.bestcubatravelguide.com/how-to-book-a-casa-particular/), "
      + "l'essentiel de l'inventaire hôtelier retiré avant l'exode des chaînes en 2026 "
      + "(https://www.travelerstoday.com/articles/60588/20260724/cuba-loses-its-last-international-hotel-brands-what-travelers-need-now.htm) ; "
      + "constat 2026-09-17 : booking.com/country/cu.html et /city/cu/la-habana.html redirigent vers la page Caraïbes, Cuba absent de la liste.",
    local: [
      { name: 'Homestay.com', url: 'https://www.homestay.com/cuba', type: 'rentals',
        searchByUrl: false,
        verified: "Page Cuba (casas particulares) chargée en navigateur ; page Havane = 3 332 logements (2026-09-17). La recherche par "
          + "paramètres (location=, check_in=) renvoie « no results » sans coordonnées géocodées, et les pages ville exigent un slug "
          + "(/cuba/havana) → pas de modèle {town} fiable.",
        source: 'https://www.travelerstoday.com/articles/60588/20260724/cuba-loses-its-last-international-hotel-brands-what-travelers-need-now.htm' },
      { name: 'CubaCasas.net', url: 'https://cubacasas.net/index.html', type: 'rentals',
        searchByUrl: false,
        verified: "Annuaire de casas particulares (contact direct des propriétaires) en ligne ; ~45 pages ville en slug "
          + "(/cities/la_habana, /cities/trinidad, /cities/vinales…) ; page La Habana HTTP 200 (2026-09-17). Pas de recherche par URL.",
        source: 'http://www.cubacasas.net/' },
    ],
    date: '2026-09-17' },

  { country: 'SD',
    airbnb: 'ok', booking: 'limited',
    statusSource: 'https://www.booking.com/country/sd.html',
    statusNote: "Constat 2026-09-17 : booking.com/country/sd.html redirige vers la page Afrique (canonical continent/africa) et la page "
      + "Khartoum n'affiche que des « hôtels à proximité » : aucun hébergement soudanais proposé. Guerre civile depuis avril 2023. "
      + "Airbnb affiche encore ~124 annonces.",
    local: [],
    date: '2026-09-17' },

  // ───────────── Priorité 1 bis : offre quasi nulle (petites îles, pays très peu couverts) ─────────────
  { country: 'TV',
    airbnb: 'limited', booking: 'limited',
    statusSource: 'https://www.booking.com/country/tv.html',
    statusNote: "Constat 2026-09-17 : booking.com/country/tv.html et /city/tv/funafuti.html redirigent vers la page Océanie (aucun hébergement) ; "
      + "Airbnb « Show 7 places » pour Tuvalu.",
    local: [
      { name: 'Timeless Tuvalu (office du tourisme)', url: 'https://www.timelesstuvalu.com/accommodation/', type: 'hotels',
        searchByUrl: false,
        verified: "Page officielle listant 10 hébergements de Funafuti avec téléphone/e-mail (Funafuti Lagoon Hotel, Filamona Lodge, Esfam Lodge…) (2026-09-17). Réservation par contact direct.",
        source: 'https://www.timelesstuvalu.com/' },
    ],
    date: '2026-09-17' },

  { country: 'KI',
    airbnb: 'limited', booking: 'limited',
    statusSource: 'https://www.booking.com/country/ki.html',
    statusNote: "Constat 2026-09-17 : la page pays Booking existe mais n'affiche aucun nombre ni aucune ville (Tarawa, Kiritimati absents) ; Airbnb « Show 7 places ».",
    local: [
      { name: 'Kiribati Tourism (Stay With Us)', url: 'https://kiribatitourism.gov.ki/stay-with-us', type: 'hotels',
        searchByUrl: false,
        verified: "Site officiel ; sous-page /in-south-tarawa liste Betio Lodge, The George Hotel, Fema Lodge, Utireirei Hotel, Mary's Motel, Dreamers Guesthouse, Tad's Guesthouse (2026-09-17). Pages aussi pour North Tarawa et Kiritimati.",
        source: 'https://kiribatitourism.gov.ki/' },
    ],
    date: '2026-09-17' },

  { country: 'NR',
    airbnb: 'limited', booking: 'limited',
    statusSource: 'https://www.booking.com/country/nr.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 2 hotels » ; Airbnb « Show 2 places ».',
    local: [],
    date: '2026-09-17' },

  { country: 'TK',
    airbnb: 'limited', booking: 'limited',
    statusSource: 'https://www.booking.com/country/tk.html',
    statusNote: "Constat 2026-09-17 : booking.com/country/tk.html redirige vers la page Océanie ; recherche Airbnb « Tokelau » sans résultat local. "
      + "Accès uniquement par bateau depuis Samoa avec autorisation du gouvernement de Tokelau.",
    local: [],
    date: '2026-09-17' },

  { country: 'PN',
    airbnb: 'limited', booking: 'limited',
    statusSource: 'https://www.booking.com/country/pn.html',
    statusNote: 'Constat 2026-09-17 : booking.com/country/pn.html redirige vers la page Océanie ; Airbnb « 1 home ».',
    local: [
      { name: 'Visit Pitcairn', url: 'https://www.visitpitcairn.pn/where-to-stay', type: 'rentals',
        searchByUrl: false,
        verified: "Page officielle : 12 séjours chez l'habitant (10 disponibles), 170–425 NZD/pers./jour, demande via formulaire de chaque hôte après réservation du bateau MV Silver Supporter (2026-09-17).",
        source: 'https://www.visitpitcairn.pn/' },
    ],
    date: '2026-09-17' },

  { country: 'SH',
    airbnb: 'limited', booking: 'limited',
    statusSource: 'https://www.booking.com/country/sh.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 7 hotels » ; Airbnb « 10 homes ».',
    local: [
      { name: 'St Helena Tourism', url: 'https://sthelenatourism.com/where-to-stay/', type: 'both',
        searchByUrl: false,
        verified: "Page officielle « Where to stay » : hôtels/guest houses, locations, B&B (Mantis St Helena, Farm Lodge, The Blue Lantern…) ; réservation préalable obligatoire (2026-09-17).",
        source: 'https://sthelenatourism.com/' },
    ],
    date: '2026-09-17' },

  { country: 'FK',
    airbnb: 'limited', booking: 'limited',
    statusSource: 'https://www.booking.com/country/fk.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 7 hotels » ; Airbnb « Show 12 places ».',
    local: [
      { name: 'Falkland Islands Tourist Board', url: 'https://www.falklandislands.com/stay', type: 'both',
        searchByUrl: false,
        verified: "Page officielle : 45 hébergements (hôtels, lodges, guest houses, self-catering) à Stanley et dans les îles, classement 1–5 étoiles local (2026-09-17).",
        source: 'https://www.falklandislands.com/' },
    ],
    date: '2026-09-17' },

  { country: 'ER',
    airbnb: 'limited', booking: 'limited',
    statusSource: 'https://www.booking.com/country/er.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 2 hotels » ; Airbnb « Show 19 places ».',
    local: [],
    date: '2026-09-17' },

  { country: 'MH',
    airbnb: 'limited', booking: 'limited',
    statusSource: 'https://www.booking.com/country/mh.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 3 hotels » ; Airbnb « Show 19 places ».',
    local: [],
    date: '2026-09-17' },

  { country: 'NU',
    airbnb: 'ok', booking: 'limited',
    statusSource: 'https://www.booking.com/country/nu.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 5 hotels » ; Airbnb « Show 22 places ».',
    local: [
      { name: 'Niue Tourism', url: 'https://www.niueisland.com/accommodation', type: 'both',
        searchByUrl: false,
        verified: "Page officielle listant les hébergements de l'île avec fiche individuelle (Alekis, Aliutu Guesthouse, Anaiki Motel, Breeze, Damiana's Holiday Motel, Kaliki Lodge…) (2026-09-17).",
        source: 'https://www.niueisland.com/' },
    ],
    date: '2026-09-17' },

  { country: 'AS',
    airbnb: 'ok', booking: 'limited',
    statusSource: 'https://www.booking.com/country/as.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 6 hotels » ; Airbnb « Show 42 places ».',
    local: [
      { name: 'Visit American Samoa', url: 'https://www.visitamericansamoa.org/accommodations', type: 'hotels',
        searchByUrl: false,
        verified: "Page officielle : 11 hébergements à Tutuila et Manu'a (Tradewinds Hotel, Sadie's by the Sea, Sadie Thompson Inn, Fitiuta Lodge…) (2026-09-17).",
        source: 'https://www.visitamericansamoa.org/' },
    ],
    date: '2026-09-17' },

  { country: 'FM',
    airbnb: 'ok', booking: 'limited',
    statusSource: 'https://www.booking.com/country/fm.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 9 hotels » ; Airbnb « Show 29 places ».',
    local: [],
    date: '2026-09-17' },

  { country: 'TD',
    airbnb: 'ok', booking: 'limited',
    statusSource: 'https://www.booking.com/country/td.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 5 hotels » ; Airbnb « 27 homes ».',
    local: [],
    date: '2026-09-17' },

  { country: 'CF',
    airbnb: 'ok', booking: 'limited',
    statusSource: 'https://www.booking.com/country/cf.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 10 hotels » ; Airbnb « Show 58 places ».',
    local: [],
    date: '2026-09-17' },

  { country: 'NE',
    airbnb: 'ok', booking: 'limited',
    statusSource: 'https://www.booking.com/country/ne.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 11 hotels » ; Airbnb « Show 121 places ».',
    local: [],
    date: '2026-09-17' },

  { country: 'GQ',
    airbnb: 'ok', booking: 'limited',
    statusSource: 'https://www.booking.com/country/gq.html',
    statusNote: 'Constat 2026-09-17 : Booking « pick from 13 hotels » ; Airbnb « Show 54 places ».',
    local: [],
    date: '2026-09-17' },

  // ───────────── Priorité 2 : Airbnb/Booking disponibles, plateforme locale majeure ─────────────
  { country: 'ZA',
    airbnb: 'ok', booking: 'ok',
    statusSource: '', statusNote: "Booking : 45 419 hébergements (2026-09-17). LekkeSlaap est la première agence en ligne locale (33 000+ établissements).",
    local: [
      { name: 'LekkeSlaap', url: 'https://www.lekkeslaap.co.za/soek?q={town}', type: 'both',
        searchByUrl: true,
        verified: "Modèle issu de l'OpenSearch officiel. q=Cape%20Town → redirige vers /akkommodasie-in/kaapstad ; q=Stellenbosch → /akkommodasie-in/stellenbosch ; "
          + "q=Port%20Elizabeth → page de résultats « 692 lekke plekke … Gqeberha (Port Elizabeth) » (2026-09-17). Page ville = 6 754 hébergements au Cap. Dates non passables par URL.",
        source: 'https://www.news24.com/brandstory/partner-content/lekkeslaap-raises-the-bar-for-local-travel-in-south-africa-20250609-0843' },
    ],
    date: '2026-09-17' },

  { country: 'NG',
    airbnb: 'ok', booking: 'ok',
    statusSource: '', statusNote: "Booking : 4 812 hébergements pour tout le Nigeria (2026-09-17) contre 3 761 hôtels pour la seule Lagos sur Hotels.ng, première agence hôtelière en ligne du pays.",
    local: [
      { name: 'Hotels.ng', url: 'https://hotels.ng/search?query={town}', type: 'hotels',
        searchByUrl: true,
        verified: "query=Lagos → /hotels-in-lagos/lagos (3 761 hôtels) ; query=Port%20Harcourt → /hotels-in-rivers/port-harcourt (625) ; query=Calabar → /hotels-in-cross-river/calabar (332) (2026-09-17). Dates non passables par URL (sélecteur JS).",
        source: 'https://en.wikipedia.org/wiki/Hotels.ng' },
    ],
    date: '2026-09-17' },

  { country: 'AU',
    airbnb: 'ok', booking: 'ok',
    statusSource: '', statusNote: "Stayz (Expedia Group, fondé en 2001) reste la plateforme australienne de référence pour les maisons de vacances (40 000+ logements).",
    local: [
      { name: 'Stayz', url: 'https://www.stayz.com.au/search?destination={town}&startDate={checkin}&endDate={checkout}&adults={adults}', type: 'rentals',
        searchByUrl: true,
        verified: "Navigateur : destination=Hobart&startDate=2026-10-01&endDate=2026-10-05&adults=2 → « Hobart, Tasmania, Australia », 218 properties, dates 1–5 oct. conservées (2026-09-17). curl renvoie 429 (anti-bot).",
        source: 'https://www.hometime.io/blog/airbnb-alternatives-in-australia' },
    ],
    date: '2026-09-17' },

  { country: 'NZ',
    airbnb: 'ok', booking: 'ok',
    statusSource: '', statusNote: "Bookabach (20 000+ baches, depuis 2000) et Holiday Houses sont les plateformes néo-zélandaises historiques de location de vacances, aux côtés d'Airbnb.",
    local: [
      { name: 'Bookabach', url: 'https://www.bookabach.co.nz/search?destination={town}&startDate={checkin}&endDate={checkout}&adults={adults}', type: 'rentals',
        searchByUrl: true,
        verified: "Navigateur : destination=Wanaka&startDate=2026-10-01&endDate=2026-10-05&adults=2 → « Wānaka, Otago, New Zealand », 52 properties disponibles, dates conservées (2026-09-17). curl renvoie 429.",
        source: 'https://www.nzherald.co.nz/travel/10-top-tips-for-renting-an-nz-holiday-home-this-summer/YRO3JYI4GO7MO6AGLE7THCTX5M/' },
      { name: 'Holiday Houses', url: 'https://www.holidayhouses.co.nz/Browse/List.aspx?navigation=search&locationsearch={town}&availablefrom={checkin}&availableto={checkout}&minguests={adults}', type: 'rentals',
        searchByUrl: true,
        verified: "curl : locationsearch=Wanaka&availablefrom=2026-10-01&availableto=2026-10-05&minguests=2 → « 42 results for Thursday, 1 October 2026 - Monday, 5 October 2026, 2 guests », annonces à Wanaka/Lake Hawea (2026-09-17).",
        source: 'https://www.nzherald.co.nz/travel/10-top-tips-for-renting-an-nz-holiday-home-this-summer/YRO3JYI4GO7MO6AGLE7THCTX5M/' },
    ],
    date: '2026-09-17' },
];
