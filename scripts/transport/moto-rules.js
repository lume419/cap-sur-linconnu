// =============================================================================
// moto-rules.js — Interdictions de circulation pour les MOTOS
// (autoroutes / voies rapides / villes)
//
// Méthode : recherche web manuelle le 2026-09-17 ; chaque entrée est adossée à
//   une source consultée (texte officiel, ministère, gestionnaire autoroutier,
//   police) ou, à défaut, à un média reconnu (indiqué dans `detail`).
//   Aucune règle n'a été reprise sans source ; les simples projets ou
//   propositions de loi ne sont PAS inclus.
//
// Schéma :
//   { type: 'noMotorway', country, minCc, scope, detail, source, date,
//     partial?: true, near?: { lat, lon, km } }
//     - minCc : cylindrée (cm³) à partir de laquelle l'accès est autorisé ;
//               null = interdit à toutes les motos.
//     - partial : true quand seules certaines voies sont concernées
//               (pas tout le réseau autoroutier du pays).
//     - near : zone approximative (centre + rayon) pour les restrictions
//              localisées ; absent pour les règles nationales ou les axes très longs.
//   { type: 'cityBan', country, name, near: { lat, lon, km }, detail, source, date }
//
// Hypothèse simulateur : moto de TOURISME (≥ 500 cm³), immatriculée à
//   l'étranger (donc « non locale » là où des règles visent les plaques d'autres
//   régions).
//
// Limites :
//   - Rayons `near` approximatifs (ordre de grandeur, pas des polygones).
//   - Les restrictions visant uniquement les cyclomoteurs (< 50/125 cm³ :
//     Europe, Maroc, Amériques…) ou uniquement les motos de livraison (Koweït,
//     Émirats) sont volontairement exclues.
//   - Règles susceptibles d'évoluer (Taïwan, Pakistan, CDMX, Hanoï…) : à revérifier.
//   - Certaines sources officielles étaient inaccessibles (403) ; la source citée
//     est alors un média reconnu, signalé dans `detail`.
// =============================================================================

const D = '2026-09-17';

module.exports = [
  // ---------------------------------------------------------------------------
  // INTERDICTIONS NATIONALES (réseau autoroutier / voies express)
  // ---------------------------------------------------------------------------
  { type: 'noMotorway', country: 'KR', minCc: null,
    scope: 'toutes les autoroutes (고속도로) et routes réservées aux automobiles (자동차전용도로)',
    detail: "L'article 63 de la loi sur la circulation routière interdit ces voies à toutes les motos, quelle que soit la cylindrée (depuis 1972 pour les autoroutes, étendu en 1992). La Cour constitutionnelle a confirmé l'interdiction à plusieurs reprises.",
    source: 'https://www.law.go.kr/법령/도로교통법', date: D },

  { type: 'noMotorway', country: 'TW', minCc: null,
    scope: "autoroutes nationales (國道) : fermées de fait à toutes les motos ; seule l'antenne 國道3甲 (Taipei) est ouverte aux motos ≥ 250 cm³",
    detail: "Le règlement sur la circulation sur autoroutes et voies express (art. 19-20) prévoit depuis 2012 un accès conditionnel des motos ≥ 550 cm³, mais aucune autoroute nationale n'a été ouverte en pratique (Taipei Times, juillet 2025). Les sections de voies express provinciales autorisées aux grosses cylindrées sont signalées sur place.",
    source: 'https://www.taipeitimes.com/News/taiwan/archives/2025/07/03/2003839685', date: D },

  { type: 'noMotorway', country: 'JP', minCc: 126,
    scope: 'autoroutes (高速道路) et routes réservées aux automobiles (自動車専用道路)',
    detail: "Les « gentsuki » (≤ 50 cm³ et 51-125 cm³), les vélos et les piétons sont interdits ; les motos à partir de 126 cm³ y ont accès (NEXCO Central Japan).",
    source: 'https://www.c-nexco.co.jp/en/safety/safety_drive/false_entry/', date: D },

  { type: 'noMotorway', country: 'VN', minCc: null,
    scope: 'toutes les autoroutes (đường cao tốc, souvent signalées « CT »)',
    detail: "La loi n° 36/2024/QH15 sur l'ordre et la sécurité routière (en vigueur au 1er janvier 2025) interdit les autoroutes à toutes les motos et à tous les cyclomoteurs. Amende de 10 à 14 millions de VND selon le décret 168/2024.",
    source: 'https://xaydungchinhsach.chinhphu.vn/toan-van-luat-trat-tu-an-toan-giao-thong-duong-bo-119240909105718285.htm', date: D },

  { type: 'noMotorway', country: 'TH', minCc: null,
    scope: 'motorways du Département des routes (M7, M9, M6, M81, M82…) et autoroutes urbaines à péage de Bangkok (EXAT)',
    detail: "Loi sur la circulation terrestre de 1979 (art. 139) et règlement de 1981 sur les voies spéciales : motos interdites. Le nouveau motorway M81 (octobre 2025) interdit aussi toutes les motos, sans exception de cylindrée (source : Thaiger, média reconnu). Aucun texte officiel autorisant les ≥ 400 cm³ n'a été trouvé.",
    source: 'https://thethaiger.com/news/national/new-m81-motorway-bans-bikes-motorcycles-tractors', date: D },

  { type: 'noMotorway', country: 'PH', minCc: 400,
    scope: 'autoroutes à péage (expressways / tollways)',
    detail: "L'ordre départemental DOTC n° 2007-38 réserve les autoroutes aux motos d'au moins 400 cm³ (399 cm³ refusées). Le Toll Regulatory Board fait appliquer la règle (source : Top Gear Philippines, média reconnu).",
    source: 'https://www.topgear.com.ph/moto-sapiens/motorcycle-news/trb-bans-small-motorbikes-expressways-a00188-20180818', date: D },

  { type: 'noMotorway', country: 'ID', minCc: null,
    scope: "toutes les autoroutes à péage (jalan tol), sauf voie moto physiquement séparée : seule la Tol Bali Mandara (Denpasar-aéroport-Nusa Dua) en dispose",
    detail: "Les règlements gouvernementaux (PP 44/2009, repris par le PP 23/2024) n'autorisent les motos sur une autoroute à péage que sur une voie dédiée et séparée. Le pont de Suramadu n'est plus à péage depuis 2018 (Kompas).",
    source: 'https://otomotif.kompas.com/read/2023/10/08/122100815/ini-satu-satunya-jalan-tol-di-indonesia-yang-boleh-dilewati-motor', date: D },

  { type: 'noMotorway', country: 'PK', minCc: null,
    scope: 'motorways nationales (M-1, M-2, etc.)',
    detail: "Interdiction prise en vertu de l'art. 45 de la National Highway Safety Ordinance 2000. En novembre 2022, la Cour suprême a annulé l'autorisation accordée aux grosses cylindrées (> 600 cm³) par la haute cour d'Islamabad (Dawn).",
    source: 'https://www.dawn.com/news/1721813', date: D },

  { type: 'noMotorway', country: 'LK', minCc: null,
    scope: 'toutes les expressways (E01 Southern, E02, E03 Katunayake…)',
    detail: "La Road Development Authority interdit les expressways aux piétons, vélos, motos, tuk-tuks et tracteurs.",
    source: 'https://exway.rda.gov.lk/index.php?page=faq', date: D },

  { type: 'noMotorway', country: 'CN', minCc: null, partial: true,
    scope: "voies express (高速公路) de 13 provinces/municipalités : Zhejiang, Jiangsu, Shanghai, Shandong, Henan, Sichuan, Fujian, Jiangxi, Hainan, Ningxia, Qinghai, Gansu, Shaanxi ; ailleurs, loi nationale permissive (véhicules > 70 km/h, limite 80 km/h)",
    detail: "La loi nationale ne bannit pas les motos, mais ces 13 entités l'ont fait par règlement local ; Jiangsu a révisé le sien en septembre 2025 et le projet du Hunan n'était pas adopté en février 2026 (Tencent News, média reconnu).",
    source: 'https://view.inews.qq.com/k/20260213A05UX000', date: D },

  // ---------------------------------------------------------------------------
  // INTERDICTIONS PARTIELLES (certaines voies seulement)
  // ---------------------------------------------------------------------------
  { type: 'noMotorway', country: 'KH', minCc: 500, partial: true,
    scope: 'autoroute Phnom Penh-Sihanoukville (PPSHV) ; vignette gratuite du ministère obligatoire pour les motos autorisées',
    detail: "Le ministère des Travaux publics interdit cette autoroute aux motos de moins de 500 cm³ (ou de moins de 27 kW pour les électriques) et aux tuk-tuks (source : Khmer Times, média reconnu).",
    near: { lat: 11.20, lon: 104.20, km: 110 },
    source: 'https://www.khmertimeskh.com/501162482/pp-sville-expressway-off-limits-to-small-motorcycles-tuk-tuks/', date: D },

  { type: 'noMotorway', country: 'LA', minCc: null, partial: true,
    scope: 'autoroute Vientiane-Vang Vieng (tronçon laotien de la voie express Laos-Chine) ; utiliser la route 13',
    detail: "Les vélos, motos, charrettes, engins agricoles et véhicules à roues métalliques n'ont pas le droit d'emprunter l'autoroute (Vientiane Times, décembre 2020).",
    near: { lat: 18.45, lon: 102.45, km: 70 },
    source: 'https://www.vientianetimes.org.la/freeContent/FreeConten_Vientiane250.php', date: D },

  { type: 'noMotorway', country: 'BD', minCc: null, partial: true,
    scope: 'Dhaka Elevated Expressway (autoroute urbaine surélevée)',
    detail: "Motos, vélos et trois-roues n'ont pas le droit d'emprunter l'autoroute surélevée de Dacca (Daily Star, média reconnu). Les autres axes (Dhaka-Mawa, pont de la Padma, voie express de Chattogram) ne figurent pas ici faute d'interdiction confirmée en 2026.",
    near: { lat: 23.8103, lon: 90.4125, km: 15 },
    source: 'https://www.thedailystar.net/news/bangladesh/transport/news/bikes-three-wheelers-not-allowed-dhaka-elevated-expressway-3363936', date: D },

  { type: 'noMotorway', country: 'IN', minCc: null, partial: true,
    scope: 'Bengaluru-Mysuru Expressway (chaussée principale ; voies de service autorisées)',
    detail: "Depuis le 1er août 2023, un arrêté de la NHAI interdit la chaussée principale aux deux-roues, trois-roues et tracteurs (Deccan Herald).",
    near: { lat: 12.55, lon: 76.95, km: 70 },
    source: 'https://www.deccanherald.com/india/karnataka/bengaluru/autos-two-wheelers-cant-use-bengaluru-mysuru-e-way-from-august-1-1240663.html', date: D },

  { type: 'noMotorway', country: 'IN', minCc: null, partial: true,
    scope: "voies express de la région de Delhi : Delhi-Meerut Expressway, Dwarka Expressway, Delhi-Gurgaon Expressway, UER-II, Badarpur Elevated Highway (voies de service autorisées)",
    detail: "La NHAI interdit ces axes aux deux-roues et trois-roues : Delhi-Meerut depuis janvier 2021, les autres depuis 2024. En mars 2024, All India Radio a relayé l'interdiction de la Dwarka Expressway.",
    near: { lat: 28.60, lon: 77.20, km: 45 },
    source: 'https://www.newsonair.gov.in/nhai-prohibits-non-motorised-vehicles-on-dwarka-expressway-for-safety-enhances-measures-for-commuter-safety', date: D },

  { type: 'noMotorway', country: 'IN', minCc: null, partial: true,
    scope: 'Delhi-Mumbai Expressway (NE-4), tous tronçons ouverts',
    detail: "La NHAI y interdit les deux-roues, trois-roues et autres véhicules lents depuis l'ouverture du tronçon Delhi-Dausa en février 2023 (DNA India).",
    source: 'https://www.dnaindia.com/india/report-delhi-mumbai-expressway-no-bikes-scooters-three-wheelers-allowed-on-delhi-dausa-stretch-know-rule-3024734', date: D },

  { type: 'noMotorway', country: 'IN', minCc: null, partial: true,
    scope: 'Mumbai-Pune Expressway (Yashwantrao Chavan Expressway)',
    detail: "Deux-roues, trois-roues, tracteurs et charrettes sont interdits sur cette autoroute gérée par la MSRDC (Moneylife, média reconnu). L'ancienne NH48 reste ouverte aux motos.",
    near: { lat: 18.80, lon: 73.35, km: 60 },
    source: 'https://www.moneylife.in/article/mumbaipune-expressway-open-for-jaywalking-autos-twowheelers-parked-cars-and-urinating/31057.html', date: D },

  { type: 'noMotorway', country: 'IN', minCc: null, partial: true,
    scope: 'Samruddhi Mahamarg (Mumbai-Nagpur Expressway)',
    detail: "Deux-roues et trois-roues ne sont pas autorisés sur cette autoroute de la MSRDC (source secondaire, pas de texte officiel consulté).",
    source: 'https://quickinsure.co.in/articles/all-about-samruddhi-mahamarg-india-mega-expressway', date: D },

  { type: 'noMotorway', country: 'IN', minCc: null, partial: true,
    scope: "Mumbai : pont Atal Setu (Sewri-Nhava Sheva, MTHL) et Mumbai Coastal Road",
    detail: "Selon la FAQ de la MMRDA et les arrêtés de la police de la circulation de Mumbai, les deux-roues et trois-roues sont interdits sur l'Atal Setu et sur la Coastal Road.",
    near: { lat: 19.00, lon: 72.90, km: 20 },
    source: 'https://mmrda.maharashtra.gov.in/sites/default/files/2024-04/faq_atal_setu_15-03-2024_final_1_1.pdf', date: D },

  { type: 'noMotorway', country: 'KE', minCc: null, partial: true,
    scope: 'Nairobi Expressway (autoroute surélevée Mlolongo-Westlands)',
    detail: "Un avis publié au journal officiel du 31 décembre 2020 interdit motos, tuk-tuks, vélos et trottinettes ; l'exploitant Moja Expressway maintient l'interdiction (Kenyans.co.ke).",
    near: { lat: -1.3100, lon: 36.8500, km: 18 },
    source: 'https://www.kenyans.co.ke/news/74237-list-transport-means-not-allowed-expressway', date: D },

  { type: 'noMotorway', country: 'UG', minCc: 400, partial: true,
    scope: 'Kampala-Entebbe Expressway (péage)',
    detail: "Le règlement de l'autoroute interdit les piétons, les animaux et les motos de moins de 400 cm³ (sauf signalisation contraire).",
    near: { lat: 0.2000, lon: 32.5300, km: 25 },
    source: 'https://kee.go.ug/expressway-rules/', date: D },

  { type: 'noMotorway', country: 'MX', minCc: null, partial: true,
    scope: "Mexico (CDMX) : seconds niveaux des voies à accès contrôlé (segundo piso du Periférico, autopistas urbanas) interdits à toutes les motos ; voies centrales (Periférico, Viaducto, Circuito Interior…) réservées aux > 250 cm³",
    detail: "L'article 21 du règlement de circulation de Mexico interdit les seconds niveaux aux motos quelle que soit la cylindrée ; amende de 10 à 20 UMA et retrait de points (El Universal). Le relèvement à 600 cm³ annoncé en 2022 n'a pas été publié.",
    near: { lat: 19.4326, lon: -99.1332, km: 25 },
    source: 'https://www.eluniversal.com.mx/autopistas/desde-cuando-las-motos-pueden-circular-en-el-segundo-piso-del-periferico/', date: D },

  { type: 'noMotorway', country: 'BR', minCc: null, partial: true,
    scope: 'São Paulo : voies express (pista expressa) des Marginais Pinheiros et Tietê ; les voies locales (pista local) restent autorisées',
    detail: "Selon la mairie de São Paulo, les motos sont interdites sur la voie express de la Marginal Pinheiros (Ponte Transamérica à Ponte Fepasa), qui prolonge l'interdiction déjà en place sur la Marginal Tietê. Infraction moyenne : 4 points et 130,16 R$.",
    near: { lat: -23.5505, lon: -46.6333, km: 20 },
    source: 'https://prefeitura.sp.gov.br/web/pinheiros/w/noticias/94245', date: D },

  { type: 'noMotorway', country: 'PE', minCc: null, partial: true,
    scope: 'Lima : voies express (vías expresas) du réseau métropolitain, dont la Costa Verde (22 km)',
    detail: "Les ordonnances municipales 2015-MML et 2499-2022 interdisent ces voies aux deux et trois-roues motorisés. Le Tribunal constitutionnel les a validées en 2020 et les contrôles se sont renforcés en avril 2024 sur la Costa Verde.",
    near: { lat: -12.0464, lon: -77.0428, km: 25 },
    source: 'https://www.tc.gob.pe/institucional/notas-de-prensa/motos-y-mototaxis-no-podran-circular-por-vias-expresas-de-lima/', date: D },

  // ---------------------------------------------------------------------------
  // INTERDICTIONS EN VILLE / ZONE
  // ---------------------------------------------------------------------------
  { type: 'cityBan', country: 'MM', name: 'Yangon',
    near: { lat: 16.8053, lon: 96.1561, km: 20 },
    detail: "Les motos sont interdites dans la ville de Yangon depuis le début des années 2000, par décision municipale (YCDC). Des interdictions supplémentaires visent des townships périphériques (Thanlyin, Hlaing Tharyar, Dala…). L'interdiction était toujours en vigueur en 2024 (AFP via Kuwait Times).",
    source: 'https://kuwaittimes.com/article/13650/world/asia/with-motorbikes-banned-yangon-riders-struggle/', date: D },

  { type: 'cityBan', country: 'CN', name: 'Pékin (Beijing)',
    near: { lat: 39.9042, lon: 116.4074, km: 30 },
    detail: "Les motos immatriculées hors de Pékin sont interdites jour et nuit à l'intérieur du 6e périphérique (hors l'anneau lui-même) et ne peuvent obtenir que le permis d'entrée « hors 6e périphérique » (mesure conjointe de 2014 pour réduire la pollution).",
    source: 'https://jtgl.beijing.gov.cn/jgj/94034/94143/11140740/index.html', date: D },

  { type: 'cityBan', country: 'CN', name: 'Canton (Guangzhou)',
    near: { lat: 23.1291, lon: 113.2644, km: 60 },
    detail: "Les motos immatriculées hors de Guangzhou sont interdites 24 h/24 sur tout le territoire administratif de la ville, et toutes les motos le sont dans le centre, la cité universitaire et le quartier de la gare du Sud. Avis municipal en vigueur du 22 janvier 2022 au 21 janvier 2027.",
    source: 'https://www.gz.gov.cn/gfxwj/szfgfxwj/gzsrmzf/content/post_8001575.html', date: D },

  { type: 'cityBan', country: 'CN', name: 'Shenzhen',
    near: { lat: 22.5431, lon: 114.0579, km: 35 },
    detail: "Motos interdites 24 h/24 sur toutes les routes de Futian, Luohu, Nanshan, Yantian, Bao'an, Longgang, Longhua, Pingshan et Guangming (sauf la G107 et Pingshan Dadao) et sur la plupart des routes de Dapeng. Avis valable du 1er janvier 2026 au 31 décembre 2028.",
    source: 'https://www.sz.gov.cn/zfgb/2025/gb1397/content/post_12554074.html', date: D },
];
