module.exports = {
  landmass: {
    JP: {
      default: 'honshu',
      rules: [
        // --- Hokkaido : îles sans pont ---
        { key: 'rishiri', match: { near: [{ name: 'Rishiri-tō', lat: 45.18, lon: 141.24, km: 13 }] } },
        { key: 'rebun', match: { near: [{ name: 'Rebun-tō', lat: 45.38, lon: 141.03, km: 14 }] } },
        { key: 'okushiri', match: { near: [{ name: 'Okushiri-tō', lat: 42.15, lon: 139.47, km: 15 }] } },
        { key: '*', match: { near: [{ name: 'Teuri-tō', lat: 44.42, lon: 141.31, km: 4 }, { name: 'Yagishiri-tō', lat: 44.43, lon: 141.42, km: 4 }] } },
        { key: 'hokkaido', match: { regions: ['Hokkaido'] }, note: "Tunnel du Seikan : FERROVIAIRE uniquement (navettes auto non proposées) -> masse distincte" },
        // --- Mer du Japon ---
        { key: 'sado', match: { box: [[37.75, 38.35, 138.15, 138.6]] } },
        { key: 'dogo', match: { box: [[36.14, 36.35, 133.12, 133.45]] }, note: 'Oki : Dōgo' },
        { key: '*', match: { box: [[35.95, 36.14, 132.95, 133.2]] }, note: 'Oki : Dōzen (Nishinoshima, Nakanoshima, Chiburijima), sans pont entre elles' },
        { key: '*', match: { near: [{ name: 'Awashima', lat: 38.465, lon: 139.25, km: 4 }, { name: 'Tobishima', lat: 39.19, lon: 139.55, km: 4 }, { name: 'Hegurajima', lat: 37.85, lon: 136.92, km: 2 }, { name: 'Mishima (Hagi)', lat: 34.77, lon: 131.15, km: 4 }, { name: 'Ōshima (Hagi)', lat: 34.483, lon: 131.40, km: 1.5 }] } },
        // --- Îles d'Izu et Ogasawara (Tokyo) ---
        { key: 'izuOshima', match: { box: [[34.66, 34.82, 139.3, 139.47]] } },
        { key: '*', match: { box: [[20, 34.66, 139.1, 160], [30, 35.0, 139.47, 139.62]] }, note: "Toshima, Niijima, Shikinejima, Kōzushima, Miyakejima, Hachijōjima, Ogasawara…" },
        { key: '*', match: { near: [{ name: 'Hatsushima', lat: 35.04, lon: 139.17, km: 2 }] } },
        // --- Baie d'Ise / Mikawa ---
        { key: '*', match: { near: [{ name: 'Tōshijima', lat: 34.515, lon: 136.89, km: 3 }, { name: 'Sakatejima', lat: 34.487, lon: 136.858, km: 1 }, { name: 'Kamishima', lat: 34.545, lon: 136.98, km: 2 }] } },
        // --- Mer intérieure de Seto (îles non reliées ; Awaji, Shimanami, Yumeshima, Akinada, Etajima, Suō-Ōshima sont reliées) ---
        { key: 'shodoshima', match: { near: [{ name: 'Shōdoshima', lat: 34.50, lon: 134.26, km: 13 }] } },
        { key: '*', match: { near: [
          { name: 'Teshima', lat: 34.49, lon: 134.09, km: 3 }, { name: 'Naoshima', lat: 34.455, lon: 133.99, km: 3 },
          { name: 'Megijima/Ogijima', lat: 34.41, lon: 134.06, km: 2.5 }, { name: 'Hiroshima (Kagawa)', lat: 34.37, lon: 133.71, km: 2.5 },
          { name: 'Takamijima', lat: 34.311, lon: 133.682, km: 1.5 }, { name: 'Ibukijima', lat: 34.128, lon: 133.536, km: 1.5 },
          { name: 'Awashima (Kagawa)', lat: 34.272, lon: 133.63, km: 1.5 }, { name: 'Ieshima', lat: 34.665, lon: 134.52, km: 3 },
          { name: 'Kitagishima/Shiraishi', lat: 34.385, lon: 133.545, km: 2 }, { name: 'Ninoshima', lat: 34.313, lon: 132.438, km: 2 },
          { name: 'Miyajima', lat: 34.296, lon: 132.32, km: 2.5 }, { name: 'Nakajima (Ehime)', lat: 33.97, lon: 132.64, km: 3.5 },
          { name: 'Gogoshima', lat: 33.89, lon: 132.673, km: 1.5 }, { name: 'Nushima', lat: 34.169, lon: 134.821, km: 1.5 }, { name: 'Sanagijima', lat: 34.337, lon: 133.628, km: 1 }] } },
        { key: '*', match: { box: [[34.195, 34.30, 132.84, 132.97]] }, note: 'Ōsakikamijima (Ōsakishimojima/Okamura reliées par l’Akinada Tobishima Kaidō restent sur Honshu)' },
        // --- Kyushu nord / Genkai ---
        { key: 'tsushima', match: { box: [[34.05, 34.72, 129.15, 129.52]] }, note: 'Kami- et Shimo-shima reliées par pont entre elles' },
        { key: 'iki', match: { near: [{ name: 'Iki', lat: 33.80, lon: 129.72, km: 14 }] } },
        { key: '*', match: { near: [{ name: 'Nokonoshima', lat: 33.618, lon: 130.308, km: 1.5 }, { name: 'Ōshima (Munakata)', lat: 33.90, lon: 130.43, km: 3 }, { name: 'Madarashima', lat: 33.569, lon: 129.764, km: 1.5 }, { name: 'Takashima (Nagasaki)', lat: 32.658, lon: 129.754, km: 1.2 }, { name: 'Himeshima (Itoshima)', lat: 33.567, lon: 130.05, km: 1 }, { name: 'Ōshima (Hirado)', lat: 33.485, lon: 129.55, km: 3.5 }, { name: 'Takushima', lat: 33.437, lon: 129.522, km: 1.5 }, { name: 'Himeshima (Ōita)', lat: 33.723, lon: 131.647, km: 1.5 }, { name: 'Shimanoura (Nobeoka)', lat: 32.733, lon: 131.867, km: 0.8 }] } },
        // --- Gotō ---
        { key: 'fukue', match: { box: [[32.55, 32.80, 128.58, 128.86]] }, note: 'Gotō : Fukue-jima' },
        { key: 'nakadori', match: { box: [[32.885, 33.12, 128.94, 129.2], [32.84, 33.12, 129.0, 129.2]] }, note: 'Gotō : Nakadōri + Wakamatsu + Hinoshima/Arifuku (reliées par ponts)' },
        { key: '*', match: { box: [[32.5, 33.35, 128.5, 129.3]] }, note: 'Gotō : Hisaka, Naru, Ojika, Nozaki, Uku, Hirashima…' },
        // --- Kagoshima : Ōsumi, Tokara, Amami ---
        { key: 'tanegashima', match: { box: [[30.3, 30.9, 130.8, 131.1]] } },
        { key: 'yakushima', match: { near: [{ name: 'Yakushima', lat: 30.35, lon: 130.53, km: 17 }] } },
        { key: 'amami', match: { box: [[28.125, 28.55, 129.1, 129.75]] }, note: 'Amami-Ōshima (Kakeroma, Uke, Yoro exclues)' },
        { key: 'tokunoshima', match: { box: [[27.63, 27.92, 128.85, 129.06]] } },
        { key: 'okinoerabu', match: { box: [[27.3, 27.45, 128.5, 128.72]] } },
        { key: '*', match: { box: [[27.0, 31.0, 128.0, 130.4], [27.0, 30.2, 128.0, 131.5]] }, note: 'Kagoshima : Kuchinoerabu, Tokara, Kikai, Kakeroma, Uke, Yoro, Yoron…' },
        // --- Okinawa ---
        { key: '*', match: { near: [{ name: 'Kudakajima', lat: 26.16, lon: 127.89, km: 1.5 }, { name: 'Tsukenjima', lat: 26.25, lon: 127.94, km: 1.5 }, { name: 'Iejima', lat: 26.715, lon: 127.79, km: 5 }, { name: 'Minnajima', lat: 26.65, lon: 127.82, km: 1 }] } },
        { key: 'okinawa', match: { box: [[26.05, 26.95, 127.6, 128.35]] }, note: 'Okinawa-hontō + îles reliées (Kōri, Yagaji, Sesoko, Ōu, Henza, Hamahiga, Miyagi, Ikei, Senaga)' },
        { key: 'kumejima', match: { box: [[26.28, 26.42, 126.7, 126.85]] } },
        { key: 'miyako', match: { box: [[24.7, 24.95, 125.13, 125.48]] }, note: 'Miyako + Irabu, Shimoji, Ikema, Kurima (reliées) ; Ōgami exclue si présente' },
        { key: 'ishigaki', match: { box: [[24.335, 24.62, 124.1, 124.35]] } },
        { key: 'iriomote', match: { box: [[24.24, 24.45, 123.65, 123.95]] } },
        { key: '*', match: { regions: ['Okinawa'] }, note: 'autres îles d’Okinawa (Kerama, Tonaki, Aguni, Iheya, Izena, Daitō, Tarama, Taketomi, Kohama, Hateruma, Yonaguni…)' },
        { key: '*', match: { box: [[20, 26.9, 122, 132]] } }
      ]
    },
    KR: {
      rules: [
        { key: '*', match: { near: [
          { name: 'Udo', lat: 33.505, lon: 126.955, km: 3 }, { name: 'Gapado', lat: 33.17, lon: 126.27, km: 1.5 },
          { name: 'Marado', lat: 33.117, lon: 126.267, km: 1 }, { name: 'Biyangdo', lat: 33.406, lon: 126.23, km: 0.8 },
          { name: 'Chujado', lat: 33.955, lon: 126.31, km: 6 }] }, note: 'îles du Jeju-do sans pont : chaque lieu isolé' },
        { key: 'jeju', match: { regions: ['Jeju-do'] }, note: 'Jeju : aucune liaison routière' },
        { key: 'jeju', match: { box: [[33.1, 33.6, 126.1, 127.0]] }, note: 'lieux de Jeju mal rangés dans une autre région' },
        { key: 'ulleungdo', match: { near: [{ name: 'Ulleungdo', lat: 37.50, lon: 130.87, km: 12 }, { name: 'Dokdo', lat: 37.24, lon: 131.87, km: 3 }] } },
        { key: '*', match: { near: [
          // Incheon / Gyeonggi (Ganghwa, Gyodong, Seongmo/Seokmo, Yeongjong, Muui, Yeongheung, Daebu : reliées)
          { name: 'Baengnyeongdo', lat: 37.96, lon: 124.68, km: 6 }, { name: 'Daecheongdo', lat: 37.83, lon: 124.71, km: 4 },
          { name: 'Socheongdo', lat: 37.77, lon: 124.76, km: 3 }, { name: 'Yeonpyeongdo', lat: 37.665, lon: 125.70, km: 4 },
          { name: 'Deokjeokdo/Soyado', lat: 37.23, lon: 126.14, km: 6 }, { name: 'Mungapdo', lat: 37.172, lon: 126.105, km: 2 },
          { name: 'Gulupdo', lat: 37.19, lon: 125.98, km: 2 }, { name: 'Seungbongdo', lat: 37.168, lon: 126.295, km: 1.5 },
          { name: 'Daeijakdo', lat: 37.18, lon: 126.25, km: 2 }, { name: 'Jawoldo', lat: 37.255, lon: 126.31, km: 3 },
          { name: 'Sindo/Sido/Modo', lat: 37.53, lon: 126.44, km: 4 }, { name: 'Jangbongdo', lat: 37.54, lon: 126.34, km: 2 },
          { name: 'Seogeomdo', lat: 37.719, lon: 126.233, km: 0.8 }, { name: 'Boreumdo', lat: 37.676, lon: 126.19, km: 1.5 },
          { name: 'Maldo', lat: 37.687, lon: 126.131, km: 0.8 }, { name: 'Pungdo', lat: 37.11, lon: 126.39, km: 1.5 },
          // Chungcheongnam-do (Anmyeondo, Wonsando : reliées)
          { name: 'Sapsido', lat: 36.335, lon: 126.355, km: 2.5 }, { name: 'Hodo', lat: 36.30, lon: 126.261, km: 1.2 }, { name: 'Nokdo', lat: 36.27, lon: 126.263, km: 1 },
          // Jeollabuk-do / Yeonggwang
          { name: 'Wido', lat: 35.60, lon: 126.28, km: 4 }, { name: 'Anmado', lat: 35.36, lon: 126.03, km: 3 }, { name: 'Nagwoldo', lat: 35.20, lon: 126.14, km: 2.5 },
          // Sinan (Aphae, Amtae, Palgeum, Anjwa, Jaeun, Jido, Imja, Jeungdo : reliées)
          { name: 'Heuksando', lat: 34.68, lon: 125.43, km: 5 }, { name: 'Hongdo', lat: 34.68, lon: 125.20, km: 3 },
          { name: 'Gageodo', lat: 34.07, lon: 125.12, km: 4 }, { name: 'Taedo', lat: 34.43, lon: 125.29, km: 4 },
          { name: 'Uido', lat: 34.61, lon: 125.84, km: 3 }, { name: 'Manjaedo', lat: 34.21, lon: 125.47, km: 2 },
          { name: 'Hauido', lat: 34.625, lon: 126.02, km: 2.5 }, { name: 'Sinuido', lat: 34.58, lon: 126.04, km: 3 },
          { name: 'Jangsando', lat: 34.575, lon: 126.095, km: 1.5 },
          // Jindo / Wando (Jindo, Wando, Sinjido, Gogeumdo, Yaksan : reliées)
          { name: 'Jodo (archipel)', lat: 34.31, lon: 126.04, km: 5 }, { name: 'Cheongsando', lat: 34.18, lon: 126.88, km: 5 },
          { name: 'Soando', lat: 34.16, lon: 126.64, km: 4 }, { name: 'Bogildo/Nohwado', lat: 34.17, lon: 126.56, km: 6 },
          { name: 'Geumildo/Saengildo', lat: 34.34, lon: 127.02, km: 6 }, { name: 'Deogudo', lat: 34.25, lon: 127.017, km: 1 },
          // Yeosu (Dolsan, Hwataedo, Baekyado, Palyeong-daegyo : reliées)
          { name: 'Geumodo', lat: 34.525, lon: 127.745, km: 5 }, { name: 'Yeondo', lat: 34.43, lon: 127.80, km: 2 },
          { name: 'Gaedo', lat: 34.605, lon: 127.75, km: 2 }, { name: 'Geomundo', lat: 34.04, lon: 127.31, km: 4 },
          { name: 'Chodo', lat: 34.22, lon: 127.25, km: 3 }, { name: 'Sonjukdo', lat: 34.285, lon: 127.38, km: 3 },
          { name: 'Pyeongdo', lat: 34.233, lon: 127.45, km: 1 },
          // Namhae / Tongyeong (Namhae, Changseon, Mireukdo, Geoje, Chilcheondo, Gadeokdo : reliées)
          { name: 'Nodo', lat: 34.735, lon: 127.953, km: 1.5 }, { name: 'Hansando', lat: 34.79, lon: 128.48, km: 3 },
          { name: 'Yokjido', lat: 34.63, lon: 128.26, km: 4 }, { name: 'Yeonhwado', lat: 34.64, lon: 128.35, km: 2 },
          { name: 'Saryangdo', lat: 34.835, lon: 128.21, km: 4 }, { name: 'Maemuldo', lat: 34.64, lon: 128.57, km: 2 },
          { name: 'Bijindo', lat: 34.725, lon: 128.46, km: 1.5 }] }, note: 'petites îles sans pont : chaque lieu isolé' },
        { key: '*', match: { box: [[34.62, 34.80, 125.85, 126.005]] }, note: 'Bigeumdo/Dochodo (reliées entre elles, pas au continent)' }
      ]
    },
    KP: {
      rules: [
        { key: '*', match: { near: [{ name: "Ch'o-do", lat: 38.53, lon: 124.84, km: 5 }, { name: 'Sŏk-to', lat: 38.642, lon: 125.003, km: 2.5 }] }, note: 'îles de la mer Jaune sans lien fixe' }
      ]
    },
    CN: {
      rules: [
        { key: 'hainan', match: { box: [[18.1, 20.17, 108.55, 111.15]] }, note: 'Hainan : détroit de Qiongzhou sans pont ni tunnel' },
        { key: '*', match: { regions: ['Hainan'] }, note: 'Sansha (Paracels) et îles hors île principale' },
        { key: '*', match: { near: [
          { name: 'Weizhou', lat: 21.04, lon: 109.11, km: 5 }, { name: 'Xieyang', lat: 20.91, lon: 109.21, km: 2 },
          { name: 'Naozhou', lat: 20.90, lon: 110.59, km: 6 }, { name: 'Shangchuan', lat: 21.70, lon: 112.78, km: 10 },
          { name: 'Xiachuan', lat: 21.64, lon: 112.59, km: 7 }, { name: 'Dangan (Wanshan)', lat: 22.102, lon: 114.029, km: 2 },
          { name: 'Guishan (Wanshan)', lat: 22.132, lon: 113.825, km: 2.5 }, { name: 'Wanshan', lat: 21.94, lon: 113.71, km: 3 },
          { name: 'Nanri', lat: 25.22, lon: 119.475, km: 5 }, { name: 'Meizhou', lat: 25.075, lon: 119.125, km: 4 },
          { name: 'Gulangyu', lat: 24.445, lon: 118.067, km: 1 }, { name: 'Xiyang (Fujian)', lat: 26.505, lon: 120.047, km: 2 },
          { name: 'Dachen', lat: 28.46, lon: 121.89, km: 5 }, { name: 'Nanji', lat: 27.465, lon: 121.079, km: 2 },
          { name: 'Beiji', lat: 27.633, lon: 121.20, km: 1.5 },
          { name: 'Hengsha', lat: 31.32, lon: 121.84, km: 6 }, { name: 'Shengsi', lat: 30.73, lon: 122.47, km: 15 },
          { name: 'Qushan', lat: 30.44, lon: 122.32, km: 5 }, { name: 'Xiushan', lat: 30.17, lon: 122.17, km: 3.5 },
          { name: 'Putuoshan', lat: 30.00, lon: 122.39, km: 3 }, { name: 'Taohuadao', lat: 29.81, lon: 122.28, km: 5 },
          { name: 'Liuheng', lat: 29.73, lon: 122.14, km: 6 },
          { name: 'Changshan (Changdao)', lat: 37.94, lon: 120.70, km: 10 }, { name: 'Liugongdao', lat: 37.50, lon: 122.18, km: 2 },
          { name: 'Zhangzidao', lat: 39.03, lon: 122.73, km: 5 }, { name: 'Guangludao', lat: 39.18, lon: 122.35, km: 5 },
          { name: 'Dachangshan/Xiaochangshan', lat: 39.26, lon: 122.58, km: 8 }, { name: 'Haiyangdao', lat: 39.065, lon: 123.165, km: 4 },
          { name: 'Juhuadao', lat: 40.50, lon: 120.80, km: 3 }] }, note: 'îles habitées sans pont ; Zhoushan, Daishan (pont Zhoudai 2021), Chongming/Changxing, Pingtan, Xiamen, Dongshan, Nan’ao, Dongtou, Donghai, Hailing reliées -> continental' }
      ]
    },
    HK: {
      rules: [
        { key: '*', match: { near: [
          { name: 'Lamma', lat: 22.215, lon: 114.12, km: 2.8 }, { name: 'Cheung Chau', lat: 22.208, lon: 114.028, km: 1.5 },
          { name: 'Peng Chau', lat: 22.285, lon: 114.036, km: 0.8 }, { name: 'Po Toi', lat: 22.165, lon: 114.255, km: 1.5 },
          { name: 'Tung Ping Chau', lat: 22.542, lon: 114.434, km: 1.5 }, { name: 'Tap Mun', lat: 22.471, lon: 114.36, km: 0.8 },
          { name: 'Sharp Island (Kiu Tsui)', lat: 22.367, lon: 114.289, km: 0.5 }, { name: 'Soko Islands', lat: 22.17, lon: 113.91, km: 2.5 }] }, note: 'îles sans pont' },
        { key: '*', match: { box: [[22.540, 22.556, 114.283, 114.300]] }, note: 'îles sans pont (Kat O = boîte) ; Hong Kong Island (tunnels), Lantau, Tsing Yi, Ma Wan, Ap Lei Chau reliées -> continental' }
      ]
    },
    MO: { rules: [], note: 'Macao (péninsule, Taipa, Coloane/Cotai) relié à Zhuhai/Hengqin et au pont HZMB : continental' },
    TW: {
      default: 'taiwan',
      rules: [
        { key: '*', match: { near: [{ name: 'Dacang', lat: 23.618, lon: 119.568, km: 0.6 }] } },
        { key: 'penghu', match: { box: [[23.515, 23.73, 119.46, 119.70]] }, note: 'Magong + Huxi + Baisha + Xiyu (Grand pont de Penghu) + Zhongtun' },
        { key: 'kinmen', match: { box: [[24.35, 24.56, 118.15, 118.50]] }, note: 'Grand Kinmen + Lieyu (pont de Kinmen, 2022)' },
        { key: 'lanyu', match: { near: [{ name: 'Lanyu', lat: 22.05, lon: 121.55, km: 8 }] } },
        { key: 'ludao', match: { near: [{ name: 'Ludao', lat: 22.66, lon: 121.49, km: 4 }] } },
        { key: 'xiaoliuqiu', match: { near: [{ name: 'Xiaoliuqiu', lat: 22.34, lon: 120.37, km: 3 }] } },
        { key: '*', match: { box: [[20, 27, 116, 119.9]] }, note: 'autres îles de Penghu (Wang’an, Qimei, Jibei, Hujing, Tongpan, Huayu…), Wuqiu, Pratas' },
        { key: '*', match: { regions: ['Fukien'] }, note: 'Matsu (Nangan, Beigan, Juguang, Dongyin : pas de pont entre elles)' }
      ]
    }
  },
  ferries: [
    { a: 'honshu', b: 'hokkaido', routeKey: 'aomoriHakodate', name: 'Aomori ↔ Hakodate',
      operator: 'Tsugaru Kaikyo Ferry', durationH: 3.7, distanceKm: 113,
      priceByClass: { 1: 116.88, 2: 218.21, 5: 18.23, foot: 20.01 },
      currency: 'JPY', original: { car: 21730, van: 40570, moto: 3390, foot: 3720 },
      source: 'https://www.tsugarukaikyo.co.jp/service/fare/hakodate-aomori/', date: '2026-09-16',
      note: "Grille au 1er avril 2026, période B (1er juin-23 juillet, 18 août-30 sept., 27-31 déc.). Voiture <6 m 25 450 JPY conducteur inclus (Standard 3 720) -> 21 730. Classe 2 = 6-7 m 33 550 + ajustement carburant 32 % (10 740) = 44 290, conducteur supposé inclus comme pour les <6 m -> 40 570. Moto <750 cc 3 390 (passager en sus). Piéton Standard 3 720. Période A (1er oct.-26 déc.) : voiture 21 260, piéton 3 160. Durée (3 h 40) et distance (113 km) : ordre de grandeur, non relevés sur la grille." },
    { a: 'honshu', b: 'okinawa', routeKey: 'kagoshimaNaha', name: 'Kagoshima ↔ Naha',
      operator: "Marue Ferry (A-LINE)", durationH: 25, distanceKm: 661,
      priceByClass: { 1: 463.75, 2: 880.49, 5: 39.0, foot: 93.59 },
      currency: 'JPY', original: { car: 86220, van: 163700, moto: 7250, foot: 17400 },
      source: 'https://www.aline-ferry.com/kagoshima/fare/car_price/', date: '2026-09-16',
      note: "Grilles révisées au 1er sept. 2026 (mention « demande d'autorisation en cours », valables 1er sept.-31 oct. 2026). Voiture de tourisme 4-5 m 88 500 JPY (inclut la 2e classe du conducteur, 14 880) + surcharge carburant véhicule <6 m Kagoshima-Amami/Okinawa 12 600 -> 86 220. Classe 2 = 6-7 m (catégorie utilitaire, seule au-delà de 6 m) 147 140 + surcharge 31 440 - 14 880 = 163 700. Moto (grille 2019, hors surcharge) 7 250, passager en sus. Piéton 2e classe 14 880 + surcharge 2 520. Durée : ordre de grandeur (départ du soir, arrivée le lendemain soir), horaire non extrait. Distance orthodromique entre ports, pas la longueur de ligne." },
    { a: 'honshu', b: 'amami', routeKey: 'kagoshimaNaze', name: 'Kagoshima ↔ Naze (Amami-Ōshima)',
      operator: "Marue Ferry (A-LINE)", durationH: 11, distanceKm: 372,
      priceByClass: { 1: 277.43, 2: 549.48, 5: 23.29, foot: 63.15 },
      currency: 'JPY', original: { car: 51580, van: 102160, moto: 4330, foot: 11740 },
      source: 'https://www.aline-ferry.com/kagoshima/fare/car_price/', date: '2026-09-16',
      note: "Même grille que Kagoshima-Naha. Voiture 4-5 m 48 200 (incl. 2e classe 9 220) + surcharge 12 600 ; 6-7 m 79 940 + 31 440 - 9 220 ; moto 4 330 ; piéton 9 220 + 2 520. Durée approximative (traversée de nuit), non relevée ; distance orthodromique." },
    { a: 'honshu', b: 'tokunoshima', routeKey: 'kagoshimaKametoku', name: 'Kagoshima ↔ Kametoku (Tokunoshima)',
      operator: "Marue Ferry (A-LINE)", durationH: 15, distanceKm: 456,
      priceByClass: { 1: 350.04, 2: 667.92, 5: 35.66, foot: 74.98 },
      currency: 'JPY', original: { car: 65080, van: 124180, moto: 6630, foot: 13940 },
      source: 'https://www.aline-ferry.com/kagoshima/fare/car_price/', date: '2026-09-16',
      note: "Voiture 4-5 m 63 900 (incl. 2e classe 11 420) + 12 600 ; 6-7 m 104 160 + 31 440 - 11 420 ; moto 6 630 ; piéton 11 420 + 2 520. Durée approximative, non relevée ; distance orthodromique." },
    { a: 'honshu', b: 'okinoerabu', routeKey: 'kagoshimaWadomari', name: 'Kagoshima ↔ Wadomari (Okinoerabu)',
      operator: "Marue Ferry (A-LINE)", durationH: 17, distanceKm: 503,
      priceByClass: { 1: 374.78, 2: 720.85, 5: 35.66, foot: 81.16 },
      currency: 'JPY', original: { car: 69680, van: 134020, moto: 6630, foot: 15090 },
      source: 'https://www.aline-ferry.com/kagoshima/fare/car_price/', date: '2026-09-16',
      note: "Voiture 4-5 m 69 650 (incl. 2e classe 12 570) + 12 600 ; 6-7 m 115 150 + 31 440 - 12 570 ; moto 6 630 ; piéton 12 570 + 2 520. Durée approximative, non relevée ; distance orthodromique." },
    { a: 'continental', b: 'honshu', routeKey: 'busanShimonoseki', name: 'Busan ↔ Shimonoseki',
      operator: 'Kampu Ferry / Pukwan Ferry', durationH: 12.25, distanceKm: 217,
      priceByClass: { 1: 137.16, 2: 177.5, 5: 96.82, foot: 77.56 },
      currency: 'JPY', original: { car: 25500, van: 33000, moto: 18000, foot: 14420 },
      source: 'https://www.kampuferry.co.jp/reserve/index.html#carbike_fare', date: '2026-09-16',
      note: "Tarifs au 1er avril 2026, aller simple ; transport de véhicule conditionné à un aller-retour. Voiture <5 m en 2e classe 37 500 JPY conducteur inclus (2e classe 12 000) -> 25 500 ; classe 2 = véhicule de 6 m (camping-cars au tarif voiture, +7 500 par mètre au-delà de 5 m) 45 000 - 12 000 ; moto ≥125 cc 30 000 - 12 000. Piéton 2e classe 12 000 + surcharge carburant 1 800 (sept. 2026) + taxe d'usage Shimonoseki 620 (hors taxe japonaise de départ 3 000). Non inclus : frais de douane 6 000 par véhicule, assurance coréenne. Horaire Shimonoseki 19:45 -> Busan 08:00. Distance orthodromique. Préféré à Fukuoka-Busan (Camellia Line), dont la grille véhicule n'a pas été vérifiée." },
    { a: 'taiwan', b: 'penghu', routeKey: 'kaohsiungMagong', name: 'Kaohsiung ↔ Magong',
      operator: 'Taiwan Navigation (Penghu Ferry)', durationH: 4.5, distanceKm: 128,
      priceByClass: { 1: 60.77, 2: 79.59, 5: 36.45, foot: 23.29 },
      currency: 'TWD', original: { car: 2244, van: 2939, moto: 1346, foot: 860 },
      source: 'https://tnc-kao.com.tw/transport/information', date: '2026-09-16',
      note: "Grilles de l'opérateur (images datées 20250319), départ Kaohsiung. Voiture ≤2 799 cc NT$2 244 (transport 1 800 + frais fixes 444) ; classe 2 = fourgon ≥6 places ou >2 800 cc NT$2 939 ; moto 151-500 cc accompagnée NT$1 346 ; piéton siège économique NT$860 (https://tnc-kao.com.tw/schedule/ticket). Le fret véhicule n'inclut pas le billet du conducteur. Durée approximative, non relevée ; distance orthodromique." }
  ],
  // Liaisons examinées mais NON modélisées (pas de grille officielle vérifiable pour véhicules + passagers)
  ferriesRejected: [
    { pair: 'continental|jeju', route: 'Mokpo/Wando ↔ Jeju', reason: "Seaworld Express (seaferry.co.kr) et Hanil Express (hanilexpress.co.kr) : tarifs véhicule servis dynamiquement par le moteur de réservation, aucune grille publiée accessible ; seules des agences (jejube.com) republient des montants sans ligne précise." },
    { pair: 'continental|hainan', route: "Hai'an/Xuwen ↔ Haikou", reason: "Montants trouvés uniquement sur des portails locaux (bendibao) : passager 41,5 CNY, petite voiture 413,5 CNY sortie / 415,5 CNY entrée, conducteur inclus ; aucune grille officielle consultée et rien pour motos ni véhicules longs." },
    { pair: 'honshu|sado, oki, tsushima, iki, gotō, tanegashima, yakushima, shodoshima, rishiri, rebun, okushiri', route: 'Lignes intérieures japonaises', reason: 'Grilles non consultées (budget de recherche) : îles laissées isolées.' },
    { pair: 'taiwan|kinmen, taiwan|matsu', route: 'Kaohsiung-Kinmen, Keelung-Matsu', reason: 'Non recherchées ; Matsu est en masses isolées (*).' }
  ]
};
