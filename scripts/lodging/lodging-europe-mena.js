// Plateformes d'hébergement locales — région europe-mena
// (Europe, ex-URSS, Turquie, Moyen-Orient, Afrique du Nord ; codes du projet : public/js/trip-data.js).
// Méthode : statut Airbnb/Booking établi par recherche web (communiqués, presse, SEC, témoignages 2025-2026) ;
// modèles d'URL testés le 2026-09-17 par curl (HTML serveur) et, pour les sites en JavaScript, dans un navigateur
// (Sutochno, HalaSyria, Gathern). Les noms de ville du projet sont latins (GeoNames), ex. « Moscow », « Tehran ».
// Limites :
//  - Pays non listés = Airbnb et Booking disponibles sans plateforme locale nettement dominante trouvée et sourcée
//    (UE, Balkans, Royaume-Uni, Scandinavie, Ukraine, Caucase, Asie centrale, Golfe hors Arabie saoudite, Maghreb,
//    Libye, Yémen, Irak…). Aucune source trouvée qualifiant Airbnb/Booking de « limited » dans ces pays.
//  - Russie/Biélorussie : paiement par carte étrangère partiel (Ostrovok : Mastercard, pas Visa ; Sutochno : Visa/MC
//    via passerelle biélorusse — source russiable.com, juin 2026). Yandex Travel écarté (cartes russes exigées,
//    SmartCaptcha bloquant la vérification).
//  - Iran : sites en persan pour l'essentiel, paiement par cartes bancaires iraniennes uniquement (sanctions).
//  - Turquie : le statut « limited » de Booking concerne les utilisateurs situés en Turquie (réservations
//    domestiques bloquées depuis 2017) ; un projet de loi (juillet-août 2026) pourrait lever l'interdiction.
//  - Syrie : les noms GeoNames du projet (Damashq, Halab, Hims) ne correspondent pas aux slugs anglais de HalaSyria,
//    d'où un lien vers la liste nationale plutôt qu'un modèle {town}.
// Date : 2026-09-17.
module.exports = [
  { country: 'RU',
    airbnb: 'absent', booking: 'absent',
    statusSource: 'https://www.cnbc.com/2022/03/04/airbnb-is-suspending-all-operations-in-russia-and-belarus-.html',
    statusNote: 'Airbnb (4 mars 2022) et Booking.com (mars 2022) ont suspendu leurs activités en Russie ; toujours suspendus en 2026 (russiable.com, mis à jour le 22/06/2026 ; les agrégateurs russes demandent même d\'encadrer leur retour, TASS).',
    local: [
      { name: 'Суточно.ру (Sutochno)', url: 'https://sutochno.ru/front/searchapp/search?term={town}&guests_adults={adults}&occupied={checkin};{checkout}',
        type: 'both', searchByUrl: true,
        verified: 'Navigateur, 2026-09-17 : term=Kazan -> « Казань, 1-3 окт, 2 гостя », 5 071 logements ; term=Suzdal -> page Суздаль avec résultats. Nom latin accepté, dates AAAA-MM-JJ prises en compte.',
        source: 'https://russiable.com/ostrovok-best-alternative-booking/' },
      { name: 'Ostrovok', url: 'https://ostrovok.ru/', type: 'both', searchByUrl: false,
        verified: 'curl, 2026-09-17 : accueil 200 ; pages ville uniquement par slug sensible à la casse (/hotel/russia/moscow/ = 200, /hotel/russia/Moscow/ = 404) et dates JJ.MM.AAAA : pas de modèle {town} fiable.',
        source: 'https://russiable.com/ostrovok-best-alternative-booking/' }
    ],
    date: '2026-09-17' },

  { country: 'BY',
    airbnb: 'absent', booking: 'absent',
    statusSource: 'https://www.forumdaily.com/en/airbnb-i-booking-bolshe-ne-rabotaet-v-rossii-i-belarusi-teper-zhiteli-etix-stran-ne-mogut-bronirovat-zhile/',
    statusNote: 'Airbnb et Booking.com ont suspendu leurs services en Biélorussie en mars 2022 (hébergements biélorusses retirés) ; aucune reprise signalée en 2026, Booking refuse en outre les cartes biélorusses depuis 2024.',
    local: [
      { name: 'Суточно.ру (Sutochno)', url: 'https://sutochno.ru/front/searchapp/search?term={town}&guests_adults={adults}&occupied={checkin};{checkout}',
        type: 'both', searchByUrl: true,
        verified: 'Navigateur, 2026-09-17 : term=Minsk -> page « Минск », 2 279 logements trouvés.',
        source: 'https://www.belveb.by/blog/travels-970-s/populyarnye-servisy-bronirovaniya-zhilya-dlya-puteshestviy-16687-p/' },
      { name: 'Ostrovok', url: 'https://ostrovok.ru/', type: 'both', searchByUrl: false,
        verified: 'curl, 2026-09-17 : /hotel/belarus/minsk/ = 200 « Отели в Минске » ; slug sensible à la casse, pas de modèle {town} fiable.',
        source: 'https://www.belveb.by/blog/travels-970-s/populyarnye-servisy-bronirovaniya-zhilya-dlya-puteshestviy-16687-p/' }
    ],
    date: '2026-09-17' },

  { country: 'IR',
    airbnb: 'absent', booking: 'absent',
    statusSource: 'https://www.irun2iran.com/how-to-book-hotels-in-iran/',
    statusNote: 'Sanctions américaines : Airbnb indique (forum officiel community.withairbnb.com) que ses services ne sont pas disponibles en Iran, comme en Crimée, Syrie et Corée du Nord ; Booking.com et les plateformes mondiales ne sont pas utilisables, les paiements internationaux étant impossibles (irun2iran.com, 1er nov. 2025 ; livingintehran.com).',
    local: [
      { name: 'Jajiga', url: 'https://www.jajiga.com/en/s/{town}', type: 'rentals', searchByUrl: true,
        verified: 'curl, 2026-09-17 : /en/s/Tehran -> redirigé vers /en/s/tehran, « 1106 room » ; Shiraz 679 ; (version persane : Isfahan 645, Yazd 463, Kashan 487). Ville inconnue -> liste nationale (pas d\'erreur). Dates non acceptées dans l\'URL.',
        source: 'https://livingintehran.com/2022/03/13/airbnb-alternatives-in-iran/' },
      { name: 'Alibaba.ir (hôtels)', url: 'https://www.alibaba.ir/hotel', type: 'hotels', searchByUrl: false,
        verified: 'curl, 2026-09-17 : /hotel = 200 ; pages ville en slug minuscule (/hotel/ir-tehran = 200 « رزرو هتل تهران »), /hotel/ir-Tehran = page générique : pas de modèle {town} fiable.',
        source: 'https://www.irun2iran.com/how-to-book-hotels-in-iran/' },
      { name: 'SnappTrip', url: 'https://www.snapptrip.com/', type: 'both', searchByUrl: false,
        verified: 'curl, 2026-09-17 : accueil 200 ; pages ville avec nom persan dans l\'URL (رزرو-هتل/تهران), incompatible avec les noms latins du projet.',
        source: 'https://www.irun2iran.com/how-to-book-hotels-in-iran/' }
    ],
    date: '2026-09-17' },

  { country: 'SY',
    airbnb: 'absent', booking: 'absent',
    statusSource: 'https://annapowaska.com/2026/01/03/how-to-book-a-hotel-in-syria/',
    statusNote: 'Malgré la levée des sanctions américaines mi-2025, Airbnb bloque toujours les annonces syriennes et Booking.com, Agoda, Expedia, Hostelworld ne permettent pas de réserver en Syrie (témoignage de voyageuse, janv. 2026 ; propertymanagementstories.com, 2026).',
    local: [
      { name: 'HalaSyria', url: 'https://halasyria.com/hotels', type: 'hotels', searchByUrl: false,
        verified: 'Navigateur, 2026-09-17 : /hotels -> « 83 hotels found » (toute la Syrie). Le modèle /hotels/{town} fonctionne avec les noms anglais (/hotels/damascus -> 55 hôtels) mais pas avec les noms GeoNames du projet (/hotels/Damashq -> « 0 hotels found »).',
        source: 'https://annapowaska.com/2026/01/03/how-to-book-a-hotel-in-syria/' }
    ],
    date: '2026-09-17' },

  { country: 'TR',
    airbnb: 'ok', booking: 'limited',
    statusSource: 'https://www.hurriyetdailynews.com/booking-com-set-for-return-after-9-years-225021',
    statusNote: 'Booking.com est interdit pour les réservations domestiques des utilisateurs situés en Turquie depuis 2017 (décision de justice obtenue par TÜRSAB) ; les réservations depuis l\'étranger restent possibles. Projet de loi de juillet-août 2026 (licence obligatoire des plateformes) non encore voté. TÜRSAB a aussi attaqué Airbnb en janvier 2026 (procédure en cours, Airbnb accessible).',
    local: [
      { name: 'TatilBudur', url: 'https://www.tatilbudur.com/', type: 'hotels', searchByUrl: false,
        verified: 'curl, 2026-09-17 : accueil 200 ; formulaire hôtel en POST, pages ville en slug turc minuscule (/yurtici-oteller/antalya-otelleri) : pas de modèle {town}.',
        source: 'https://mtsglobe.com/mts-globe-group-sign-a-cooperation-agreement-with-the-tour-operator-tatilbudur-one-of-the-largest-online-travel-players-in-turkey/' },
      { name: 'Jolly', url: 'https://www.jollytur.com/otel', type: 'hotels', searchByUrl: false,
        verified: 'curl, 2026-09-17 : /otel = 200 « Otel Ara » ; aucune recherche par paramètre d\'URL identifiée.',
        source: 'https://www.kenresearch.com/turkey-online-travel-booking-platforms-market' }
    ],
    date: '2026-09-17' },

  { country: 'SA',
    airbnb: 'ok', booking: 'ok',
    statusSource: 'https://endeavor.org/stories/she-started-with-one-room-soon-gathern-captured-44-of-saudi-tourism/',
    statusNote: 'Airbnb et Booking disponibles, mais Gathern revendique 44 % du marché de l\'hébergement alternatif saoudien (72 000+ biens, 5 M d\'utilisateurs ; levée de 72 M$ en 2025).',
    local: [
      { name: 'Gathern', url: 'https://gathern.co/en', type: 'rentals', searchByUrl: false,
        verified: 'Navigateur/curl, 2026-09-17 : /en = 200 ; recherche par identifiant numérique de ville (/en/search?city=3&check_in=…) ; les pages /property/apartments-{ville} renvoient Riyad par défaut pour une ville inconnue (Makkah, zzzz) : pas de modèle {town} fiable.',
        source: 'https://therealdeal.com/international/2025/09/26/gathern-saudi-airbnb-rival-eyes-2028-ipo/' }
    ],
    date: '2026-09-17' }
];
