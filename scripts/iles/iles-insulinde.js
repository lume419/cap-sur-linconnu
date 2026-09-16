// Groupe « insulinde » : Indonésie (ID), Timor oriental (TL), Malaisie (MY), Brunei (BN), Singapour (SG).
// Boîtes : [latMin, latMax, lonMin, lonMax]. Règles évaluées dans l'ordre.
const S = (box, note) => ({ key: '*', match: { box }, note });
module.exports = {
  landmass: {
    ID: {
      default: '*',
      rules: [
        // ---------- Sumatra : îles périphériques ----------
        { key: 'weh', match: { box: [[5.74, 5.95, 95.18, 95.42]] }, note: 'Pulau Weh (Sabang)' },
        S([[5.5, 5.8, 94.95, 95.18], [5.5, 5.74, 95.18, 95.28]], 'Pulau Breueh, Pulau Nasi'),
        { key: 'simeulue', match: { box: [[2.25, 3.0, 95.7, 96.75]] } },
        S([[1.95, 2.45, 96.95, 97.55]], 'Pulau Banyak'),
        { key: 'nias', match: { box: [[0.45, 1.6, 96.95, 98.0]] } },
        S([[-0.75, 0.35, 97.7, 98.7]], 'îles Batu'),
        { key: 'siberut', match: { box: [[-1.95, -0.8, 98.5, 99.4]] } },
        { key: 'sipora', match: { box: [[-2.45, -1.95, 99.4, 99.95]] } },
        { key: 'pagai', match: { box: [[-3.55, -2.45, 99.8, 100.65]] }, note: 'Pagai Nord et Sud' },
        S([[-5.13, -5.1, 103.83, 103.856]], 'Pulau Pisang'),
        { key: 'enggano', match: { box: [[-5.6, -5.2, 102.1, 102.5]] } },
        // Riau / Riau Islands
        { key: 'batam', match: { box: [[0.3, 1.25, 103.85, 104.17], [0.3, 0.8, 104.17, 104.35]] }, note: 'Batam–Rempang–Galang reliées par les ponts routiers Barelang' },
        { key: 'bintan', match: { box: [[0.8, 1.3, 104.17, 104.75]] } },
        { key: 'karimun', match: { box: [[0.95, 1.2, 103.3, 103.5]] }, note: 'Karimun Besar' },
        S([[2.0, 4.95, 105.4, 109.25], [0.7, 1.3, 107.0, 107.8]], 'Natuna, Anambas, Serasan, Tambelan'),
        S([[-0.72, 0.5, 104.05, 105.3]], 'Lingga, Singkep et îlots'),
        S([[0.55, 0.95, 103.3, 103.9], [0.47, 0.55, 103.55, 103.9], [0.95, 1.2, 103.5, 103.85]], 'Kundur, Moro, Sugi, Durai, îlots à l’ouest de Batam'),
        // ---------- Bangka-Belitung ----------
        { key: 'bangka', match: { box: [[-3.1, -3.0, 106.7, 106.76]] },
          note: "Pointe sud-est de Bangka (Sadai, port vers Tanjung Ru ; Tokoi, Tepang) : vérifié dans le polygone OSM de l'île de Bangka, à l'ouest du détroit de Lepar (Penutuk, Gunung, Menggu sont sur Lepar)" },
        S([[-3.1, -2.72, 106.7, 107.4]], 'Lepar, Pongok'),
        { key: 'bangka', match: { box: [[-2.7, -1.45, 105.1, 106.9], [-3.2, -2.7, 105.8, 106.7]] } },
        { key: 'belitung', match: { box: [[-3.5, -2.45, 107.45, 108.4]] } },
        // ---------- Java : îles périphériques ----------
        S([[-5.97, -5.1, 106.35, 106.95]], 'Kepulauan Seribu'),
        S([[-5.95, -5.7, 106.08, 106.35], [-5.99, -5.9, 105.8, 105.9]], 'îlots de la baie de Banten, Sangiang'),
        S([[-5.95, -5.7, 110.1, 110.7]], 'Karimunjawa'),
        { key: 'bawean', match: { box: [[-5.9, -5.68, 112.55, 112.8]] } },
        S([[-5.65, -5.3, 114.2, 114.7]], 'Masalembu'),
        { key: 'kangean', match: { box: [[-7.25, -6.75, 115.1, 116.0]] } },
        S([[-7.3, -6.95, 114.15, 114.75]], 'Sapudi, Raas'),
        S([[-7.22, -7.17, 113.88, 113.94], [-7.24, -7.2, 113.75, 113.81], [-7.13, -7.066, 113.94, 114.1]], 'Giligenting, Gili Raja, Poteran (Talango)'),
        // ---------- Java (+ Madura via Suramadu) ----------
        { key: 'java', match: { box: [[-8.95, -7.99, 105.1, 114.43], [-7.99, -5.97, 105.1, 114.6], [-5.97, -5.85, 105.95, 106.9], [-5.97, -5.8, 106.95, 114.436], [-8.95, -8.45, 114.43, 114.66]] },
          note: 'Madura incluse : pont routier de Suramadu (2009)' },
        // ---------- Sumatra ----------
        { key: 'rupat', match: { box: [[1.74, 2.15, 101.3, 101.85]] } },
        { key: 'bengkalis', match: { box: [[1.39, 1.7, 102.0, 102.55]] } },
        S([[0.8, 1.3, 102.2, 103.2], [0.74, 0.8, 102.2, 103.06]], 'Kepulauan Meranti (Tebing Tinggi, Rangsang, Padang, Merbau)'),
        { key: 'sumatra', match: { box: [[-6.0, -2.5, 95.0, 106.2], [-2.5, -1.3, 95.0, 105.0], [-1.3, 5.95, 95.0, 104.5]] } },
        // ---------- Bali ----------
        S([[-8.73, -8.64, 115.4, 115.465]], 'Nusa Lembongan, Ceningan'),
        { key: 'nusaPenida', match: { box: [[-8.86, -8.66, 115.465, 115.65]] } },
        { key: 'bali', match: { box: [[-8.9, -8.0, 114.4, 115.75]] }, note: 'Serangan reliée par chaussée routière' },
        // ---------- Nusa Tenggara ----------
        S([[-8.38, -8.32, 116.0, 116.1]], 'Gili Trawangan, Meno, Air'),
        { key: 'lombok', match: { box: [[-9.0, -8.05, 115.8, 116.74]] } },
        S([[-8.35, -8.15, 117.45, 117.7], [-8.3, -8.05, 118.9, 119.1]], 'Moyo, Sangeang'),
        { key: 'sumbawa', match: { box: [[-9.2, -8.0, 116.74, 119.25]] } },
        S([[-8.95, -8.4, 119.3, 119.78]], 'Komodo, Rinca et îlots'),
        S([[-8.37, -8.27, 121.66, 121.77], [-8.37, -8.34, 122.28, 122.33], [-8.5, -8.42, 122.37, 122.52], [-8.91, -8.84, 121.5, 121.56]], "Palu'e, Pemana, îles de la baie de Maumere, Pulau Ende"),
        { key: 'solor', match: { box: [[-8.62, -8.455, 122.875, 123.36], [-8.455, -8.42, 122.9, 123.36]] } },
        { key: 'flores', match: { box: [[-9.0, -8.0, 119.78, 122.99], [-8.36, -8.2, 122.99, 123.04]] } },
        { key: 'adonara', match: { box: [[-8.42, -8.15, 123.04, 123.34], [-8.42, -8.36, 122.99, 123.04]] } },
        { key: 'lembata', match: { box: [[-8.65, -8.1, 123.34, 123.9]] } },
        { key: 'pantar', match: { box: [[-8.6, -8.1, 123.9, 124.26], [-8.6, -8.42, 124.26, 124.35]] } },
        S([[-8.42, -8.1, 124.26, 124.38]], 'îlots entre Pantar et Alor (Pura, Treweng, Ternate)'),
        { key: 'alor', match: { box: [[-8.5, -8.05, 124.38, 125.2], [-8.5, -8.42, 124.35, 124.38]] } },
        { key: 'sumba', match: { box: [[-10.45, -9.25, 118.8, 121.0]] } },
        { key: 'sabu', match: { box: [[-10.65, -10.4, 121.7, 122.05]] } },
        { key: 'rote', match: { box: [[-11.05, -10.45, 122.7, 123.45]] } },
        { key: 'timor', match: { box: [[-10.28, -10.2, 123.485, 123.5]] },
          note: "Rive timoraise du détroit de Semau au sud de Bolok (Uihainmumu, polygone OSM de Timor) ; les villages de Semau (Hansisi, Kauan, Koblain…) sont au nord de 10,2° S ou à l'ouest de 123,485° E" },
        S([[-10.28, -10.1, 123.28, 123.5], [-10.3, -10.28, 123.28, 123.4], [-10.7, -10.5, 121.45, 121.7]], 'Semau, Raijua'),
        { key: 'timor', match: { box: [[-10.45, -8.9, 123.35, 125.2]] }, note: 'Timor occidental (partagé avec TL)' },
        // ---------- Kalimantan ----------
        S([[-1.95, -1.3, 108.6, 109.3]], 'Karimata'),
        { key: 'pulauLaut', match: { box: [[-4.2, -3.25, 116.03, 116.4], [-3.25, -3.19, 116.2, 116.4]] }, note: 'Pulau Laut : pont non achevé' },
        { key: 'tarakan', match: { box: [[3.2, 3.45, 117.5, 117.7]] } },
        { key: 'nunukan', match: { box: [[4.0, 4.2, 117.55, 117.76]] } },
        { key: 'sebatik', match: { box: [[4.05, 4.3, 117.76, 118.0]] }, note: 'île partagée avec la Malaisie' },
        S([[2.0, 2.45, 118.15, 119.0], [3.4, 3.6, 117.75, 117.95]], 'Derawan, Maratua, Bunyu'),
        { key: 'borneo', match: { box: [[-4.3, -1.5, 108.5, 117.0], [-1.5, 4.5, 108.5, 119.1]] } },
        // ---------- Sulawesi ----------
        { key: 'selayar', match: { box: [[-6.5, -5.72, 120.35, 120.65]] } },
        S([[-7.6, -6.5, 120.3, 122.0]], 'Takabonerate, Bonerate, Kalao'),
        S([[-5.2, -4.55, 118.9, 119.36]], 'archipel Spermonde'),
        { key: 'kabaena', match: { box: [[-5.45, -5.05, 121.75, 122.1]] } },
        S([[-6.1, -5.15, 123.3, 124.2]], 'Wakatobi'),
        { key: 'wawonii', match: { box: [[-4.3, -3.95, 122.9, 123.3]] } },
        { key: 'muna', match: { box: [[-5.3, -4.475, 122.4, 122.76], [-5.3, -4.55, 122.2, 122.4], [-5.45, -5.3, 122.2, 122.7]] } },
        { key: 'buton', match: { box: [[-5.85, -4.48, 122.76, 123.3], [-5.85, -5.45, 122.45, 122.76], [-5.45, -5.3, 122.7, 122.76]] } },
        S([[-2.2, -1.08, 122.7, 124.25]], 'îles Banggai (Peleng)'),
        S([[-0.6, -0.1, 121.5, 122.5]], 'îles Togean'),
        S([[1.58, 1.7, 124.65, 124.8], [1.62, 1.66, 124.8, 124.81], [1.77, 1.87, 125.05, 125.2]], 'Bunaken, Manado Tua, Siladen, Talise, Bangka'),
        { key: 'lembeh', match: { box: [[1.38, 1.56, 125.21, 125.35]] } },
        S([[2.2, 2.9, 125.25, 125.55], [3.8, 4.8, 126.5, 127.3]], 'Siau, Tagulandang, Talaud'),
        { key: 'sangihe', match: { box: [[3.2, 3.8, 125.3, 125.8]] } },
        { key: 'sulawesi', match: { box: [[-5.8, -2.8, 119.3, 121.1], [-3.6, -2.8, 118.7, 119.3],[-5.0, -2.8, 121.1, 123.2], [-2.8, -0.1, 118.7, 123.5], [-0.1, 1.4, 119.5, 125.3], [1.4, 1.9, 124.3, 125.3]] } },
        // ---------- Moluques ----------
        S([[0.55, 0.95, 127.25, 127.47], [-0.1, 0.55, 127.1, 127.45]], 'Ternate, Tidore, Moti, Makian, Kayoa'),
        { key: 'morotai', match: { box: [[1.9, 2.7, 128.15, 128.8]] } },
        { key: 'bacan', match: { box: [[-0.95, -0.3, 127.3, 127.8]] } },
        { key: 'halmahera', match: { box: [[-1.0, 2.6, 127.3, 129.0]] } },
        { key: 'ambon', match: { box: [[-3.8, -3.52, 127.9, 128.35], [-3.66, -3.49, 128.15, 128.37]] },
          note: "2e boîte : côte nord-est d'Ambon (Liang, port de Hunimua ; Batudua ; Tengah-Tengah), vérifiée dans le polygone OSM d'Ambon — Haruku commence à 128,41° E, Seram au nord de 3,4° S" },
        S([[-3.75, -3.45, 128.35, 128.85]], 'Haruku, Saparua, Nusa Laut'),
        { key: 'seram', match: { box: [[-3.55, -2.7, 127.8, 130.95]] } },
        { key: 'buru', match: { box: [[-3.95, -3.0, 125.9, 127.3]] } },
        { key: 'wetar', match: { box: [[-8.0, -7.3, 125.7, 126.9]] } },
        { key: 'yamdena', match: { box: [[-8.05, -7.0, 131.0, 131.72]] }, note: 'Yamdena (Tanimbar)' },
        S([[-8.4, -6.8, 130.8, 132.1]], 'autres îles Tanimbar (Selaru, Larat…)'),
        { key: 'keiKecil', match: { box: [[-6.1, -5.4, 132.5, 132.86]] }, note: 'Kei Kecil + Dullah (pont)' },
        { key: 'keiBesar', match: { box: [[-6.1, -5.2, 132.86, 133.25]] } },
        S([[-7.2, -5.3, 133.9, 135.0]], 'îles Aru (Wokam, Kobror, Trangan… séparées par des chenaux)'),
        // ---------- Papouasie ----------
        { key: 'waigeo', match: { box: [[-0.45, 0.15, 130.4, 131.4]] } },
        { key: 'salawati', match: { box: [[-1.45, -0.94, 130.5, 131.25]] } },
        { key: 'biak', match: { box: [[-1.3, -0.5, 135.4, 136.45]] }, note: 'Biak + Supiori (pont routier)' },
        { key: 'numfor', match: { box: [[-1.2, -0.85, 134.7, 135.05]] } },
        { key: 'yapen', match: { box: [[-2.0, -1.5, 135.3, 136.95]] } },
        { key: 'kolepom', match: { box: [[-8.45, -7.3, 137.6, 138.9]] } },
        { key: 'newGuinea', match: { box: [[-4.0, 1.0, 131.9, 141.1], [-1.6, 1.0, 130.9, 131.9], [-5.0, -4.0, 134.5, 141.1], [-9.3, -5.0, 137.0, 141.1]] } }
      ]
    },
    TL: {
      default: 'timor',
      rules: [
        S([[-8.4, -8.1, 125.45, 125.7]], 'Atauro'),
        S([[-8.45, -8.4, 127.28, 127.4]], 'Jaco')
      ]
    },
    MY: {
      rules: [
        { key: 'langkawi', match: { box: [[6.1, 6.5, 99.55, 100.0]] }, note: 'Langkawi (+ îlots de l’archipel)' },
        { key: 'pangkor', match: { box: [[4.17, 4.27, 100.52, 100.595]] } },
        { key: 'tioman', match: { box: [[2.7, 2.9, 104.08, 104.23]] } },
        S([[5.88, 5.94, 102.69, 102.77], [5.72, 5.8, 102.98, 103.05]], 'Perhentian, Redang'),
        S([[3.0, 3.04, 101.24, 101.29]], 'Pulau Ketam'),
        S([[5.26, 5.28, 100.38, 100.4]], 'Pulau Aman (Penang)'),
        S([[2.2, 2.65, 104.05, 104.7]], 'Pulau Sibu, Tinggi, Pemanggil, Aur'),
        { key: 'labuan', match: { box: [[5.15, 5.42, 115.1, 115.3]] } },
        // Sebatik, partie malaisienne. Deux boîtes suivant la côte nord de l'île : l'ancienne boîte unique
        // (4,05–4,30 N, 117,76–118,0 E) englobait TAWAU (372 615 hab.), sur le continent en face, de l'autre côté de
        // Cowie Harbour, et l'isolait du reste de Sabah ; elle laissait en revanche Wallace Bay et Mantadok, bien sur
        // l'île, dans « borneo ». À l'ouest de 117,80 E la côte nord de Sebatik monte à ~4,27 N (Wallace Bay 4,256) ;
        // à l'est elle redescend sous 4,21 N, alors que Tawau (4,245) et ses quartiers (Bridger 4,264, Tanjung Batu Laut
        // 4,272) sont au nord. Vérifié lieu par lieu sur communes-my.txt.
        { key: 'sebatik', match: { box: [[4.10, 4.27, 117.65, 117.80], [4.10, 4.215, 117.80, 117.93]] } },
        S([[7.05, 7.4, 116.95, 117.35]], 'Banggi, Balambangan, Malawali'),
        S([[4.4, 4.55, 118.625, 118.8], [4.0, 4.4, 118.6, 119.3]], 'Bum Bum, Mabul, Sipadan et îles de Semporna'),
        { key: 'borneo', match: { box: [[-4.5, 7.5, 108.5, 119.5]] } }
      ]
    },
    BN: { default: 'borneo', rules: [] },
    SG: {
      rules: [
        S([[1.395, 1.445, 103.9, 104.1], [1.385, 1.395, 104.02, 104.1]], 'Pulau Ubin, Pulau Tekong'),
        S([[1.15, 1.235, 103.6, 103.85]], 'îles du Sud')
      ]
    }
  },
  // Taux InforEuro septembre 2026 : 1 EUR = 20 628,08 IDR ; 1 EUR = 4,6875 MYR.
  // Indonésie : tarifs « kelas ekonomi » réglementés par golongan. Correspondance : 1 = golongan IVA (véhicule de
  // tourisme ≤ 5 m), 2 = golongan VA (véhicule de passagers 5–7 m), 5 = golongan II (moto < 500 cc, ou < 250 cc
  // quand la grille le précise), foot = penumpang dewasa. ATTENTION : en Indonésie le billet véhicule inclut le
  // conducteur ET les passagers du véhicule (tarif « terpadu » : traversée + jasa pelabuhan + assurance Jasa Raharja) ;
  // le prix véhicule ne peut pas être séparé de ses occupants.
  // Distances : orthodromie port à port (estimation), durées : ordre de grandeur publié ou usuel (voir note).
  ferries: [
    { a: 'java', b: 'sumatra', routeKey: 'merakBakauheni', name: 'Merak ↔ Bakauheni',
      operator: 'ASDP Indonesia Ferry (et opérateurs privés Gapasdap)', durationH: 2, distanceKm: 28,
      priceByClass: { 1: 23.36, 2: 46.72, 5: 3.01, foot: 1.10 },
      currency: 'IDR', original: { car: 481800, van: 963800, moto: 62100, foot: 22700 },
      source: 'https://www.asdp.id/siaran-pers/tarif-baru-penyeberangan-pada-29-lintasan-di-seluruh-indonesia-resmi-berlaku ; https://finance.detik.com/infrastruktur/d-7705893/pengumuman-ini-daftar-tarif-penyeberangan-feri',
      date: '2026-09-16',
      note: "Service régulier (hors « express »). Base : KM 61 Tahun 2023 (en vigueur depuis le 3/08/2023) ; la hausse de ~5 % du KM 131 Tahun 2024 (23 400 / 512 600 IDR…) a été reportée puis annulée par la DG Hubdat. Moto : 62 100 IDR selon le tableau detik (12/2024) et le communiqué ASDP ; une autre version du communiqué indique 60 600. Remises ponctuelles (Lebaran, Nataru) ignorées. Billet véhicule = occupants inclus." },
    { a: 'java', b: 'bali', routeKey: 'ketapangGilimanuk', name: 'Ketapang ↔ Gilimanuk',
      operator: 'ASDP Indonesia Ferry (et opérateurs privés)', durationH: 1, distanceKm: 5,
      priceByClass: { 1: 10.35, 2: 20.38, 5: 1.53, foot: 0.51 },
      currency: 'IDR', original: { car: 213400, van: 420400, moto: 31600, foot: 10600 },
      source: 'https://www.detik.com/jatim/berita/d-8347506/tarif-penyeberangan-ketapang-gilimanuk-untuk-motor-hingga-truk ; https://www.detik.com/bali/berita/d-6842206/tarif-penyeberangan-ketapang-gilimanuk-naik-5-93-persen-ini-rinciannya (golongan VA 420 400 IDR, KM 61/2023, vérifié le 16/09/2026)',
      date: '2026-02-09',
      note: "Tarifs KM 61 Tahun 2023 (hausse du 3/08/2023). Dewasa, golongan II et IVA : detikJatim 9/02/2026. Golongan VA (420 400 IDR) : relevé dans la même série de publications de presse, non repris dans l'article detik — chiffre le moins solide. Traversée 45–60 min. Billet véhicule = occupants inclus." },
    { a: 'bali', b: 'lombok', routeKey: 'padangbaiLembar', name: 'Padangbai ↔ Lembar',
      operator: 'ASDP Indonesia Ferry (et opérateurs privés)', durationH: 4.5, distanceKm: 65,
      priceByClass: { 1: 57.40, 2: 109.14, 5: 8.21, foot: 3.17 },
      currency: 'IDR', original: { car: 1184100, van: 2251300, moto: 169400, foot: 65300 },
      source: 'https://www.satpellembar.info/tarif/ (grille officielle, Satpel Pelabuhan Penyeberangan Lembar, BPTD kelas II NTB, Kemenhub)',
      date: '2026-09-16',
      note: "Tarif terpadu (traversée + jasa pelabuhan + assurance). Moto = golongan II « sepeda motor < 250 cc » ; dewasa = plus de 2 ans. Billet véhicule = véhicule + passagers. Durée : ordre de grandeur usuel 4–5 h (non publié sur la grille)." },
    { a: 'lombok', b: 'sumbawa', routeKey: 'kayanganPototano', name: 'Kayangan ↔ Poto Tano',
      operator: 'ASDP Indonesia Ferry (cabang Kayangan) et opérateurs privés', durationH: 1.5, distanceKm: 19,
      priceByClass: { 1: 27.29, 2: 43.29, 5: 3.64, foot: 0.91 },
      currency: 'IDR', original: { car: 563000, van: 893000, moto: 75000, foot: 18800 },
      source: 'https://insidelombok.id/berita-utama/tarif-penyeberangan-kayangan-poto-tano-naik-ini-biayanya/ ; https://suarantb.com/2026/03/17/mudik-lebaran-2026-asdp-kayangan-siapkan-24-kapal-dan-beri-diskon-tarif/',
      date: '2026-03-17',
      note: "Liaison intra-provinciale : tarif fixé par arrêté du gouverneur de NTB (signé le 3/01/2023, en vigueur le 12/01/2023, +10,41 %). Voiture ≤ 5 m 563 000, bus moyen ≤ 7 m 893 000, moto < 500 cc 75 000, passager 18 800 IDR ; tarifs normaux confirmés inchangés en mars 2026 (18 800 adulte, 32 000 vélo, 2 265 000 golongan IX). Remise Lebaran 2026 ignorée." },
    { a: 'sumbawa', b: 'flores', routeKey: 'sapeLabuanBajo', name: 'Sape ↔ Labuan Bajo',
      operator: 'ASDP Indonesia Ferry', durationH: 7, distanceKm: 96,
      priceByClass: { 1: 86.24, 2: 165.68, 5: 12.14, foot: 4.63 },
      currency: 'IDR', original: { car: 1779000, van: 3417700, moto: 250400, foot: 95600 },
      source: 'https://www.detik.com/bali/nusra/d-8248945/hore-ada-diskon-tarif-kapal-sape-labuan-bajo-nataru-ini-daftar-harga-terbaru',
      date: '2025-12',
      note: "Tarifs normaux (avant remise Nataru 2025/26) cités par le chef de port : adulte 95 600, moto 250 400, petit véhicule 1 779 000, bus moyen 3 417 700 IDR. Une traversée par jour dans chaque sens. Durée et distance : estimations (orthodromie ~96 km, 6–8 h)." },
    { a: 'sumatra', b: 'bangka', routeKey: 'tanjungApiApiTanjungKalian', name: 'Tanjung Api-Api ↔ Tanjung Kalian (Muntok)',
      operator: 'ASDP Indonesia Ferry (et opérateurs privés)', durationH: 3.5, distanceKm: 44,
      priceByClass: { 1: 50.96, 2: 90.37, 5: 6.69, foot: 2.82 },
      currency: 'IDR', original: { car: 1051200, van: 1864200, moto: 138000, foot: 58100 },
      source: 'https://sumsel.idntimes.com/news/sumatra-selatan/mau-ke-bangka-cek-tarif-dan-jadwal-terbaru-kapal-feri-juli-2026-00-pbgds-7lr6zp',
      date: '2026-07-23',
      note: "Grille relevée par IDN Times Sumsel (juillet 2026) : dewasa 58 100, golongan II 138 000, IVA 1 051 200, VA 1 864 200 IDR. Une autre publication (2025) donne IVA 998 500 et II 130 550 : écart signalé. Traversée 3–4 h. Billet véhicule = occupants inclus." },
    { a: 'continental', b: 'langkawi', routeKey: 'kualaPerlisLangkawi', name: 'Kuala Perlis ↔ Langkawi (RoRo)',
      operator: 'Langkawi RoRo Ferry Services', durationH: 1.5, distanceKm: 33,
      priceByClass: { 1: 33.07, 2: 44.80, 5: 12.59, foot: 7.89 },
      currency: 'MYR', original: { car: 155, van: 210, moto: 59, foot: 37 },
      source: 'https://www.langkawiroro.com/fare.html',
      date: '2026-04',
      note: "Grille « Update @ April 2026 », aller simple. Voiture = berline < 1500 cc (RM155) ; classe 2 = SUV/MPV < 2000 cc (RM210, pas de tarif camping-car publié) ; moto < 125 cc (RM59) ; piéton = adulte étranger RM37 (adulte malaisien RM21 = 4,48 €). Surcharge carburant annoncée au 20/04/2026 non chiffrée sur la grille. Inclusion du conducteur dans le prix véhicule non précisée. Durée et distance : estimations." }
  ]
};
