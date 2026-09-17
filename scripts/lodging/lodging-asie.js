// Plateformes d'hébergement par pays : région ASIE
// (Asie du Sud, Asie de l'Est, Asie du Sud-Est, Territoire britannique de l'océan Indien)
//
// Méthode (2026-09-17) :
//  - Statut Airbnb/Booking : sources de presse / communiqués / textes officiels, recoupés par des
//    recherches réelles sur airbnb.com (curl, HTML rendu côté serveur) et booking.com (navigateur).
//  - Plateformes locales : modèles d'URL testés dans un navigateur réel (sites JS) ou via curl
//    (sites rendus côté serveur) sur une ville réelle ; le résultat constaté est noté dans `verified`.
//  - Espaces réservés : {town} (nom encodé URL), {checkin}/{checkout} (AAAA-MM-JJ), {adults}.
//
// Limites :
//  - Les noms de villes du projet sont romanisés (ex. « Gyeongju », « Takayama »). Plusieurs sites
//    locaux ne trouvent que les noms dans l'écriture locale (hangeul, kanji) ou n'ont pas de
//    recherche par mot-clé : voir `verified` pour chaque modèle.
//  - Trip.com, MakeMyTrip, Traveloka, tiket.com et NOL (Yanolja) exigent un identifiant interne de
//    ville dans l'URL : aucun modèle {town} possible, on donne la page de recherche (searchByUrl: false).
//  - Les sites japonais (Rakuten Travel, Jalan) ignorent les dates passées dans l'URL de recherche
//    par mot-clé : modèles avec {town} seulement.
//  - Pays non retenus (ok/ok sans plateforme locale utilisable par URL) : voir rapport.
module.exports = [
  // ───────────── Priorité 1 : Airbnb/Booking absents ou restreints ─────────────
  { country: 'CN',
    airbnb: 'absent', booking: 'limited',
    statusSource: 'https://www.cnbc.com/2022/05/23/airbnb-is-closing-its-domestic-business-in-china-sources-say.html',
    statusNote: "Airbnb a retiré toutes ses annonces en Chine continentale le 30 juillet 2022 (ne garde que le voyage sortant ; toujours le cas en 2025 selon Skift : https://skift.com/2025/03/20/airbnb-stopped-listing-in-china-but-it-still-wants-chinese-travelers/). "
      + "Constaté le 2026-09-17 : une recherche Airbnb « Beijing » ou « Shanghai » ne renvoie aucun logement en Chine continentale. "
      + "Booking.com est disponible mais très minoritaire face à Trip.com et Meituan (https://kr-asia.com/how-meituan-outcompeted-trip-com-to-become-chinas-hotel-booking-king) : "
      + "le 2026-09-17, Chengdu = 515 établissements sur Booking contre 15 212 sur Trip.com pour la même nuit.",
    local: [
      { name: 'Trip.com', url: 'https://www.trip.com/hotels/', type: 'both',
        searchByUrl: false,
        verified: "2026-09-17 : la liste exige un identifiant interne de ville (optionId=28 pour Chengdu) ; les essais avec searchWord/keyword/cityName seuls renvoient « 0 properties found ». Page de recherche hôtels accessible en anglais, recherche Chengdu via le formulaire = 15 212 établissements.",
        source: 'https://kr-asia.com/how-meituan-outcompeted-trip-com-to-become-chinas-hotel-booking-king' },
    ],
    date: '2026-09-17' },

  { country: 'KP',
    airbnb: 'absent', booking: 'absent', noPlatform: true, // aucune réservation individuelle possible : message « réservez en direct »
    statusSource: 'https://checkyourfact.com/2018/12/02/fact-check-airbnb-apartments-west-bank-disputed/',
    statusNote: "Airbnb ne fait pas affaire en Corée du Nord pour se conformer aux sanctions (tout comme Crimée, Iran, Syrie). La Corée du Nord est sous embargo américain total (OFAC : https://ofac.treasury.gov/faqs/464), "
      + "ce qui s'applique aussi à Booking Holdings (société américaine). Constaté le 2026-09-17 : Airbnb « Pyongyang » ne renvoie aucun logement ; Booking « Pyongyang » redirige vers Pocheon (Corée du Sud). "
      + "Les séjours ne sont possibles que via des voyagistes agréés, sans réservation individuelle.",
    local: [],
    date: '2026-09-17' },

  { country: 'JP',
    airbnb: 'limited', booking: 'ok',
    statusSource: 'https://fortune.com/2018/06/08/airbnb-cancels-japan-listings/',
    statusNote: "Loi sur le minpaku (juin 2018) : enregistrement obligatoire et plafond de 180 nuits/an hors zones spéciales ; Airbnb a dû retirer la majorité de ses annonces japonaises en 2018. "
      + "Plusieurs arrondissements de Tokyo limitent encore les jours autorisés. Jalan et Rakuten Travel dominent la réservation domestique.",
    local: [
      { name: 'じゃらんnet (Jalan)', url: 'https://www.jalan.net/uw/uwp2011/uww2011init.do?keyword={town}', type: 'hotels',
        searchByUrl: true,
        verified: "2026-09-17 (curl) : « Kyoto » → page « 「Kyoto」に該当するホテル・宿一覧 » avec 30 établissements (MUNI KYOTO, eph KYOTO…) ; « Takayama » → 16 établissements (eph TAKAYAMA…). Recherche par mot-clé sur le nom : les villages peu connus peuvent ne rien donner. Dates dans l'URL non prises en compte.",
        source: 'https://www.japanryokanguide.com/en/blog/ryokan-booking-tips' },
      { name: '楽天トラベル (Rakuten Travel)', url: 'https://kw.travel.rakuten.co.jp/keyword/Search.do?f_query={town}', type: 'hotels',
        searchByUrl: true,
        verified: "2026-09-17 (curl) : « Kyoto » → 30 établissements (ROKU KYOTO LXR, IMU HOTEL KYOTO…) ; « Tokyo » → 30 résultats par page ; « Takayama » → 25. Page en Shift_JIS : les noms avec caractères non ASCII encodés en UTF-8 ne sont pas reconnus (noms romanisés sans diacritiques OK). Dates non prises en compte.",
        source: 'https://www.travelvoice.jp/english/japan-s-local-ota-rakuten-travel-has-begun-offering-more-than-400-000-hotels-in-the-world-as-a-global-ota' },
    ],
    date: '2026-09-17' },

  { country: 'KR',
    airbnb: 'limited', booking: 'ok',
    statusSource: 'https://www.koreatimes.co.kr/business/companies/20250819/airbnb-to-fully-enforce-business-registration-rule-in-korea',
    statusNote: "Depuis le 1er janvier 2026, Airbnb n'accepte plus de réservations pour les logements coréens sans enregistrement commercial : environ 30 000 annonces non autorisées (officetels, etc.) retirées. "
      + "Le marché domestique est dominé par Yanolja (NOL) et Yeogi Eottae (https://koreatechdesk.com/korea-yanolja-yeogi-eottae-coupon-investigation).",
    local: [
      { name: '여기어때 (Yeogi Eottae)', url: 'https://www.yeogi.com/domestic-accommodations?keyword={town}&checkIn={checkin}&checkOut={checkout}&personal={adults}', type: 'both',
        searchByUrl: true,
        verified: "2026-09-17 (navigateur) : « Seoul » → 536 résultats et « Busan » → 739 résultats du 15 au 17/10/2026 (dates et nombre de personnes appliqués) ; « 경주 » → 557 résultats. MAIS « Gyeongju » et « Jeonju » en romanisation → 0 résultat : ne fonctionne en caractères latins que pour les grandes villes.",
        source: 'https://koreatechdesk.com/korea-yanolja-yeogi-eottae-coupon-investigation' },
      { name: 'NOL (Yanolja)', url: 'https://nol.yanolja.com/', type: 'both',
        searchByUrl: false,
        verified: "2026-09-17 : page d'accueil accessible ; la recherche passe par une saisie semi-automatique et aucune URL de résultats d'hébergement stable n'a été trouvée (/results?keyword= redirige vers les spectacles).",
        source: 'https://koreatechdesk.com/korea-yanolja-yeogi-eottae-coupon-investigation' },
    ],
    date: '2026-09-17' },

  { country: 'MM',
    airbnb: 'absent', booking: 'ok',
    statusSource: 'https://skift.com/2023/03/29/airbnb-suspends-listings-in-myanmar-amid-political-unrest/',
    statusNote: "Airbnb a suspendu tous les logements au Myanmar en mars 2023 (la loi interdit aux étrangers de loger ailleurs que dans des hôtels et maisons d'hôtes enregistrés). Constaté le 2026-09-17 : Airbnb « Yangon » ne renvoie aucun logement. "
      + "Booking.com reste disponible (44 établissements à Yangon le 2026-09-17). Aucune plateforme locale vérifiable avec recherche en ligne.",
    local: [],
    date: '2026-09-17' },

  { country: 'HK',
    airbnb: 'limited', booking: 'ok',
    statusSource: 'https://www.info.gov.hk/gia/general/202306/21/P2023062000507.htm',
    statusNote: "Hotel and Guesthouse Accommodation Ordinance : toute location de moins de 28 jours consécutifs sans licence d'hôtel ou de maison d'hôtes est illégale (amendes et prison) ; la plupart des annonces Airbnb sont hors la loi.",
    local: [
      { name: 'Trip.com', url: 'https://www.trip.com/hotels/', type: 'both',
        searchByUrl: false,
        verified: "2026-09-17 : l'URL de liste exige un identifiant interne de ville (sans lui : « 0 properties found ») ; page de recherche accessible.",
        source: 'https://kr-asia.com/how-meituan-outcompeted-trip-com-to-become-chinas-hotel-booking-king' },
    ],
    date: '2026-09-17' },

  { country: 'MO',
    airbnb: 'limited', booking: 'ok',
    statusSource: 'https://www.macaupostdaily.com/news/13487',
    statusNote: "Loi 3/2010 modifiée : il est interdit de louer un logement d'habitation à des visiteurs pour moins de 90 jours ; les chambres d'hôtes sont interdites. Les séjours touristiques doivent se faire en hôtel.",
    local: [
      { name: 'Trip.com', url: 'https://www.trip.com/hotels/', type: 'both',
        searchByUrl: false,
        verified: "2026-09-17 : l'URL de liste exige un identifiant interne de ville ; page de recherche accessible.",
        source: 'https://kr-asia.com/how-meituan-outcompeted-trip-com-to-become-chinas-hotel-booking-king' },
    ],
    date: '2026-09-17' },

  { country: 'TW',
    airbnb: 'limited', booking: 'ok',
    statusSource: 'https://international.thenewslens.com/article/110475',
    statusNote: "Hotel Management Act / Tourism Development Act : toute location de moins de 30 jours doit être enregistrée comme hôtel ou maison d'hôtes (minsu) ; amendes jusqu'à 500 000 TWD pour hébergement illégal. Les annonces Airbnb sans licence sont illégales.",
    local: [
      { name: 'AsiaYo', url: 'https://asiayo.com/en-us/search/{town}/?adult={adults}&quantity=1', type: 'both',
        searchByUrl: true,
        verified: "2026-09-17 (navigateur) : « Hualien » → 391 hôtels et locations ; « Jiufen » → 16 ; « Taipei » → 296 (autour de la gare de Taipei). Dates non prises en compte par l'URL (à choisir sur la page).",
        source: 'https://techcrunch.com/2018/12/05/taiwan-based-travel-startup-asiayo-raises-7m-series-b-led-by-alibaba-taiwan-entrepreneurs-fund/' },
    ],
    date: '2026-09-17' },

  { country: 'SG',
    airbnb: 'limited', booking: 'ok',
    statusSource: 'https://www.ura.gov.sg/Corporate/Property/Residential/Short-Term-Accommodation',
    statusNote: "URA : interdiction de louer un logement privé pour moins de 3 mois consécutifs ; amendes jusqu'à 200 000 SGD, poursuites renforcées en 2024-2025. Les séjours courts doivent se faire en hôtel. Pas de plateforme locale dominante : Booking suffit.",
    local: [],
    date: '2026-09-17' },

  // ───────────── Priorité 2 : plateforme locale dominante ─────────────
  { country: 'IN',
    airbnb: 'ok', booking: 'ok',
    statusSource: 'https://skift.com/2025/01/09/makemytrip-dominates-travel-search-in-india-can-it-hold-on-to-its-lead/',
    statusNote: "Airbnb et Booking disponibles, mais MakeMyTrip (avec Goibibo) domine la réservation en ligne en Inde ; OYO est très présent dans l'hôtellerie économique.",
    local: [
      { name: 'OYO', url: 'https://www.oyorooms.com/hotels-in-{town}/', type: 'hotels',
        searchByUrl: true,
        verified: "2026-09-17 (curl) : « udaipur » et « Udaipur » → page « Budget Hotels in Udaipur » avec hôtels OYO (Collection O, Townhouse…) ; « New%20Delhi » et « pushkar » → 200 ; « kilakarai » (petite ville) → 404. Ne fonctionne que pour les villes où OYO a des hôtels.",
        source: 'https://www.mordorintelligence.com/industry-reports/india-online-accommodation-market' },
      { name: 'MakeMyTrip', url: 'https://www.makemytrip.com/hotels/', type: 'both',
        searchByUrl: false,
        verified: "2026-09-17 : les URLs /hotels/hotel-listing/?searchText=… et /hotels/{ville}-hotels.html redirigent vers l'accueil hôtels (identifiant de ville requis, et proposition de redirection vers makemytrip.global hors d'Inde). Page d'accueil hôtels accessible.",
        source: 'https://skift.com/2025/01/09/makemytrip-dominates-travel-search-in-india-can-it-hold-on-to-its-lead/' },
    ],
    date: '2026-09-17' },

  { country: 'ID',
    airbnb: 'ok', booking: 'ok',
    statusSource: 'https://databoks.katadata.co.id/en/consumer-services/statistics/58d9c01818894b5/online-tourism-booking-value-grows-traveloka-and-tiketcom-hold-largest-market-share',
    statusNote: "Airbnb et Booking disponibles, mais Traveloka et tiket.com détiennent les plus grandes parts du marché indonésien de la réservation en ligne.",
    local: [
      { name: 'Traveloka', url: 'https://www.traveloka.com/en-id/hotel', type: 'both',
        searchByUrl: false,
        verified: "2026-09-17 : page hôtels accessible dans un navigateur (curl reçoit 403) ; les URLs de recherche exigent un identifiant géographique interne (spec=…HOTEL_GEO.<id>).",
        source: 'https://www.worldtravelawards.com/award-indonesias-leading-online-travel-agency-2025' },
      { name: 'tiket.com', url: 'https://www.tiket.com/en-id/hotel', type: 'both',
        searchByUrl: false,
        verified: "2026-09-17 : /hotel/search?q=Yogyakarta (avec ou sans type=KEYWORD) redirige vers l'accueil hôtels ; la recherche exige un id interne (ex. id=banyumas-108001534490291065). Page d'accueil accessible.",
        source: 'https://databoks.katadata.co.id/en/consumer-services/statistics/58d9c01818894b5/online-tourism-booking-value-grows-traveloka-and-tiketcom-hold-largest-market-share' },
    ],
    date: '2026-09-17' },
];
