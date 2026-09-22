// Ports de ferry du lot 2 (liaisons FERRY_ROUTES) : villes portuaires réellement desservies sur chaque rive.
// Toutes les liaisons du lot sont nommées (« Port A ↔ Port B ») et sourcées par l'URL du commentaire de trip-data.js.
// Quand le port n'existe pas sous son nom dans les données de lieux, on retient la localité la plus proche du terminal
// sur la bonne masse terrestre ; near = position approximative du terminal ferry (ou du port) pour lever les homonymies.
module.exports = [
  { key: 'luzon|polillo', source: 'https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf (Real ↔ Polillo)',
    ports: {
      luzon: [{ cc: 'PH', place: 'Real', near: [14.6712, 121.6128] }],
      polillo: [{ cc: 'PH', place: 'Polillo' }]
    } },
  { key: 'alabat|luzon', source: 'https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf (Atimonan ↔ Alabat)',
    ports: {
      alabat: [{ cc: 'PH', place: 'Alabat' }],
      luzon: [{ cc: 'PH', place: 'Atimonan', near: [14.0014, 121.9294] }]
    } },
  { key: 'luzon|palawan', source: 'https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf ; https://2go.com.ph/travel/book/sailing-schedule/ (Manila ↔ Puerto Princesa)',
    ports: {
      // near : une seconde « Manila » existe à Mimaropa, 260 km au sud (voir ports-lot1.js).
      luzon: [{ cc: 'PH', place: 'Manila', near: [14.60, 120.98] }],
      palawan: [{ cc: 'PH', place: 'Puerto Princesa', near: [9.74, 118.73] }]
    } },
  { key: 'palawan|panay', source: 'https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf (Iloilo ↔ Puerto Princesa)',
    ports: {
      palawan: [{ cc: 'PH', place: 'Puerto Princesa', near: [9.74, 118.73] }],
      panay: [{ cc: 'PH', place: 'Iloilo' }]
    } },
  { key: 'sumatra|weh', source: 'https://rri.co.id/sabang/regional/2546135/kmp-aceh-hebat-2-kembali-beroperasi-layani-lintasan-ulee-lheue-balohan (Ulee Lheue ↔ Balohan (Sabang))',
    ports: {
      sumatra: [{ cc: 'ID', place: 'Uleelheue', near: [5.565, 95.2942] }],
      weh: [{ cc: 'ID', place: 'Balohan' }]
    } },
  { key: 'simeulue|sumatra', source: 'https://infopublik.id/kategori/nusantara/975233/kmp-aceh-hebat-1-perkuat-akses-kepulauan-ratusan-penumpang-tiba-selamat-di-calang (Calang ↔ Sinabang)',
    ports: {
      simeulue: [{ cc: 'ID', place: 'Sinabang' }],
      sumatra: [{ cc: 'ID', place: 'Calang', near: [4.6311, 95.5721] }]
    } },
  { key: 'nias|sumatra', source: 'https://sumut.indonesiasatu.co.id/sambut-libur-sekolah-2026-mulai-24-juni-kmp-jatra-ii-kembali-layani-lintasan-sibolgagunung-sitoli-nias (Sibolga ↔ Gunungsitoli)',
    ports: {
      nias: [{ cc: 'ID', place: 'Gunungsitoli' }],
      sumatra: [{ cc: 'ID', place: 'Sibolga', near: [1.7281, 98.7904] }]
    } },
  { key: 'siberut|sumatra', source: 'https://www.kliksaja.id/nasional/98316807441/info-mentawai-jadwal-kapal-kmp-gambolo-dan-kmp-ambu-ambu-bulan-maret-2026-rute-padang-tua-pejat-siberut-sikakap ; https://www.asdp.id/kapal/kmp-ambu-ambu (Bungus (Padang) ↔ Siberut (Maileppet))',
    ports: {
      siberut: [{ cc: 'ID', place: 'Saibisamukop Dua' }],
      sumatra: [{ cc: 'ID', place: 'Bungus', near: [-1.0535, 100.3912] }]
    } },
  { key: 'sipora|sumatra', source: 'https://www.kliksaja.id/nasional/98316807441/info-mentawai-jadwal-kapal-kmp-gambolo-dan-kmp-ambu-ambu-bulan-maret-2026-rute-padang-tua-pejat-siberut-sikakap (Bungus (Padang) ↔ Tua Pejat)',
    ports: {
      sipora: [{ cc: 'ID', place: 'Tuapejat' }],
      sumatra: [{ cc: 'ID', place: 'Bungus', near: [-1.0535, 100.3912] }]
    } },
  { key: 'pagai|sumatra', source: 'https://www.kliksaja.id/nasional/98316807441/info-mentawai-jadwal-kapal-kmp-gambolo-dan-kmp-ambu-ambu-bulan-maret-2026-rute-padang-tua-pejat-siberut-sikakap (Bungus (Padang) ↔ Sikakap)',
    ports: {
      pagai: [{ cc: 'ID', place: 'Sikakap' }],
      sumatra: [{ cc: 'ID', place: 'Bungus', near: [-1.0535, 100.3912] }]
    } },
  { key: 'bengkalis|sumatra', source: 'https://riaupos.co/riau/bengkalis/09/09/2026/218407/kapal-ro-ro-masuk-docking-pelayanan-penyeberangan-bengkalis-dikeluhkan-pengguna/ (Sungai Selari (Pakning) ↔ Air Putih (Bengkalis))',
    ports: {
      bengkalis: [{ cc: 'ID', place: 'Bengkalis' }],
      sumatra: [{ cc: 'ID', place: 'Sungai Selari', near: [1.3776, 102.148] }]
    } },
  { key: 'rupat|sumatra', source: 'https://www.siberriau.com/read-8189-2026-03-20-roro-dumairupat-mulai-beroperasi-pukul-1330-wib-pada-1-syawal.html (Dumai ↔ Tanjung Kapal (Rupat))',
    ports: {
      rupat: [{ cc: 'ID', place: 'Parit Satu', near: [1.7238, 101.4581] }],
      sumatra: [{ cc: 'ID', place: 'Dumai', near: [1.6933, 101.4161] }]
    } },
  { key: 'batam|bintan', source: 'https://metropolis.batampos.co.id/asdp-diskon-tarif-penyeberangan-batam-bintan-hingga-30-persen-periode-20-juni-5-juli-2026/ (Telaga Punggur ↔ Tanjung Uban)',
    ports: {
      batam: [{ cc: 'ID', place: 'Telagapunggo' }],
      bintan: [{ cc: 'ID', place: 'Tandjunguban' }]
    } },
  { key: 'bangka|belitung', source: 'https://bangka.tribunnews.com/lokal/1686511/tarif-penyeberangan-sadai-belitung-dipastikan-tetap-tiga-armada-siap-layani-penumpang ; https://hubdat.dephub.go.id/id/bptd/babel/satuan-pelayanan/pelabuhan-tanjung-ru/ (Sadai ↔ Tanjung Ru)',
    ports: {
      bangka: [{ cc: 'ID', place: 'Sadai', near: [-3.0051, 106.7397] }],
      belitung: [{ cc: 'ID', place: 'Pangkalandudat' }]
    } },
  { key: 'bali|nusaPenida', source: 'https://asdp.id/siaran-pers/asdp-terus-tingkatkan-pelayanan-lintas-padangbai-lembar-dan-padangbai-nusa-penida ; https://catperku.com/jadwal-kapal-ferry-roro-dari-padang-bai-ke-nusa-penida-terbaru/ (Padangbai ↔ Sampalan (Nusa Penida))',
    ports: {
      bali: [{ cc: 'ID', place: 'Padangbai', near: [-8.5311, 115.5061] }],
      nusaPenida: [{ cc: 'ID', place: 'Sampalan', near: [-8.6724, 115.5541] }]
    } },
  { key: 'borneo|java', source: 'https://www.metrotvnews.com/read/N6GCVp3G-jadwal-kapal-surabaya-banjarmasin-dua-kapal-beroperasi-bergantian ; https://tanjungpinang.pikiran-rakyat.com/travel-wisata/pr-36810267224/jadwal-kapal-surabaya-banjarmasin-juni-2026-padat-40-pelayaran-siap-layani-penumpang?page=all (Surabaya ↔ Banjarmasin)',
    ports: {
      borneo: [{ cc: 'ID', place: 'Banjarmasin', near: [-3.3314, 114.5581] }],
      java: [{ cc: 'ID', place: 'Surabaya', near: [-7.1964, 112.7331] }]
    } },
  { key: 'borneo|pulauLaut', source: 'https://kalsel.antaranews.com/berita/493081/asdp-batulicin-siapkan-delapan-kapal-untuk-kelancaran-nataru (Batulicin ↔ Tanjung Serdang (Pulau Laut))',
    ports: {
      borneo: [{ cc: 'ID', place: 'Batulicin' }],
      pulauLaut: [{ cc: 'ID', place: 'Tanjungserdang' }]
    } },
  { key: 'borneo|sulawesi', source: 'https://makassar.antaranews.com/berita/466812/asdp-batulicin-buka-rute-tujuan-pelabuhan-garongkong-sulsel ; https://www.threads.com/@djpl_ksopgarongkong/post/DY7avLMAVAf/ (Batulicin ↔ Garongkong (Barru))',
    ports: {
      borneo: [{ cc: 'ID', place: 'Batulicin' }],
      sulawesi: [{ cc: 'ID', place: 'Garongkong', near: [-4.3664, 119.6108] }]
    } },
  { key: 'borneo|tarakan', source: 'https://www.detik.com/kalimantan/bisnis/d-8426612/rincian-tarif-penyeberangan-kapal-feri-tarakan-sebawang-mulai-6-april (Sebawang ↔ Tarakan)',
    ports: {
      borneo: [{ cc: 'ID', place: 'Sebawang' }],
      tarakan: [{ cc: 'ID', place: 'Tarakan' }]
    } },
  { key: 'nunukan|tarakan', source: 'https://kalpress.id/2026/06/10/sambut-libur-sekolah-dan-cuti-bersama-asdp-rilis-jadwal-kmp-manta-ii-juni-2026-rute-tarakan-nunukan-sebatik-sei-menggaris-semakin-padat/ (Tarakan ↔ Nunukan)',
    ports: {
      nunukan: [{ cc: 'ID', place: 'Nunukan' }],
      tarakan: [{ cc: 'ID', place: 'Tarakan' }]
    } },
  { key: 'selayar|sulawesi', source: 'https://www.asdp.id/siaran-pers/penyeberangan-rute-bira-pamatata-semakin-cepat-dan-mudah-kmp-takabonerate-jadi-andalan-masyarakat-selayar ; https://www.detik.com/sulsel/berita/d-8559826/jadwal-kapal-feri-rute-bira-lintas-pulau-selayar-juli-2026-dan-harga-tiketnya (Bira ↔ Pamatata (Selayar))',
    ports: {
      selayar: [{ cc: 'ID', place: 'Pamatata' }],
      sulawesi: [{ cc: 'ID', place: 'Bira', near: [-5.6067, 120.4638] }]
    } },
  { key: 'muna|sulawesi', source: 'https://sultra.antaranews.com/berita/529574/pelabuhan-torobulu-konsel-siapkan-empat-kapal-feri-layani-mudik-2026 (Torobulu ↔ Tampo (Muna))',
    ports: {
      muna: [{ cc: 'ID', place: 'Tampo', near: [-4.6241, 122.71] }],
      sulawesi: [{ cc: 'ID', place: 'Pelabuhan', near: [-4.4468, 122.4568] }]
    } },
  { key: 'ambon|seram', source: 'https://www.asdp.id/siaran-pers/asdp-resmi-berlakukan-penyesuaian-tarif-di-lintasan-galala-namlea-dan-hunimua-waipirit-ambon ; https://www.asdp.id/siaran-pers/mulai-juni-penyeberangan-hunimua%E2%80%93waipirit-beroperasi-24-jam-tiap-akhir-pekan (Hunimua ↔ Waipirit)',
    ports: {
      ambon: [{ cc: 'ID', place: 'Liang', near: [-3.5102, 128.3456] }],
      seram: [{ cc: 'ID', place: 'Waipirit' }]
    } },
  { key: 'ambon|buru', source: 'https://www.asdp.id/siaran-pers/asdp-resmi-berlakukan-penyesuaian-tarif-di-lintasan-galala-namlea-dan-hunimua-waipirit-ambon (Galala ↔ Namlea)',
    ports: {
      ambon: [{ cc: 'ID', place: 'Galala', near: [-3.6621, 128.2049] }],
      buru: [{ cc: 'ID', place: 'Namlea', near: [-3.2684, 127.0869] }]
    } },
  { key: 'halmahera|morotai', source: 'https://halmaheraraya.id/kmp-maming-resmi-layani-rute-tobelo-daruba/ ; https://www.malutpost.com/2025/06/25/asdp-geser-feri-berkapasitas-besar-layani-rute-tobelo-daruba/ (Tobelo ↔ Daruba (Morotai))',
    ports: {
      halmahera: [{ cc: 'ID', place: 'Tobelo' }],
      morotai: [{ cc: 'ID', place: 'Daruba' }]
    } },
  { key: 'flores|timor', source: 'https://kupang.tribunnews.com/bisnis/979467/jadwal-kapal-fery-asdp-kupang-hari-ini-minggu-13-september-2026-kupang-laranuka-jam-1400-wita (Kupang (Bolok) ↔ Larantuka)',
    ports: {
      flores: [{ cc: 'ID', place: 'Larantuka', near: [-8.3433, 122.9889] }],
      timor: [{ cc: 'ID', place: 'Bolok', near: [-10.2174, 123.519] }]
    } },
  { key: 'alor|timor', source: 'https://kupang.tribunnews.com/bisnis/979338/jadwal-kapal-fery-asdp-kupang-hari-ini-sabtu-12-september-2026-kupang-kalabahi-jam-1800-wita (Kupang (Bolok) ↔ Kalabahi)',
    ports: {
      alor: [{ cc: 'ID', place: 'Kalabahi', near: [-8.2197, 124.5164] }],
      timor: [{ cc: 'ID', place: 'Bolok', near: [-10.2174, 123.519] }]
    } },
  { key: 'rote|timor', source: 'https://kupang.tribunnews.com/bisnis/979467/jadwal-kapal-fery-asdp-kupang-hari-ini-minggu-13-september-2026-kupang-laranuka-jam-1400-wita (Bolok (Kupang) ↔ Pantai Baru (Rote))',
    ports: {
      rote: [{ cc: 'ID', place: 'Danoka', near: [-10.6051, 123.2324] }],
      timor: [{ cc: 'ID', place: 'Bolok', near: [-10.2174, 123.519] }]
    } },
  { key: 'sabu|timor', source: 'https://kupang.tribunnews.com/bisnis/979467/jadwal-kapal-fery-asdp-kupang-hari-ini-minggu-13-september-2026-kupang-laranuka-jam-1400-wita (Kupang (Bolok) ↔ Seba (Sabu))',
    ports: {
      sabu: [{ cc: 'ID', place: 'Seba' }],
      timor: [{ cc: 'ID', place: 'Bolok', near: [-10.2174, 123.519] }]
    } },
  { key: 'sumba|sumbawa', source: 'https://sbdkab.go.id/2026/06/09/bupati-sbd-resmikan-pengoperasian-perdana-kmp-cakalang-lintasan-waikelo-sape/ (Sape ↔ Waikelo)',
    ports: {
      sumba: [{ cc: 'ID', place: 'Waikelo' }],
      sumbawa: [{ cc: 'ID', place: 'Muhajidin', near: [-8.5726, 119.0218] }]
    } },
  { key: 'borneo|labuan', source: 'https://ferirorolabuan.com/ ; https://labuanferry.com/ ; https://galaxyferry.com/ (Menumbok ↔ Labuan)',
    ports: {
      borneo: [{ cc: 'MY', place: 'Kampong Menumbok' }],
      labuan: [{ cc: 'MY', place: 'Labuan' }]
    } },
  { key: 'continental|kohChang', source: 'https://kohchangferries.com/ferry-koh-chang/ ; https://explorekohchang.com/koh-chang/how-to-get-to-koh-chang/koh-chang-ferries/ (Ao Thammachat ↔ Ao Sapparot (Ko Chang))',
    ports: {
      continental: [{ cc: 'TH', place: 'Ban Khlong Prong', near: [12.1871, 102.3014] }],
      kohChang: [{ cc: 'TH', place: 'Ban Ao Sapparot', near: [12.1416, 102.2804] }]
    } },
  { key: 'continental|lanta', source: 'https://www.phuketferry.com/ban-klong-mak-pier-koh-lanta.html ; https://www.phuketferry.com/ban-hua-hin-pier-koh-lanta.html (Ban Hua Hin ↔ Khlong Mak (Ko Lanta Noi))',
    ports: {
      continental: [{ cc: 'TH', place: 'Ban Hua Hin', near: [7.693, 99.0992] }],
      lanta: [{ cc: 'TH', place: 'Ban Khlong Mak', near: [7.665, 99.09] }]
    } },
  { key: 'continental|phuQuoc', source: 'https://thanhthoi.vn/ (Hà Tiên ↔ Bãi Vòng (Phú Quốc))',
    ports: {
      continental: [{ cc: 'VN', place: 'Hà Tiên' }],
      phuQuoc: [{ cc: 'VN', place: 'Hàm Ninh' }]
    } },
  { key: 'catBa|continental', source: 'https://mia.vn/cam-nang-du-lich/kinh-nghiem-di-pha-dong-bai-19237 ; https://catbaexpress.com/bang-gia-ve-pha-ben-got-cai-vieng.html (Đồng Bài (Cát Hải) ↔ Cái Viềng (Cát Bà))',
    ports: {
      catBa: [{ cc: 'VN', place: 'Thôn Nam', near: [20.8183, 106.9134] }],
      continental: [{ cc: 'VN', place: 'Đồng Bài', near: [20.8139, 106.8949] }]
    } },
  { key: 'bhola|continental', source: 'https://www.bssnews.net/special-stories/400040 ; https://en.wikipedia.org/wiki/Bhola_Bridge (Laharhat ↔ Veduria (Bhola))',
    ports: {
      bhola: [{ cc: 'BD', place: 'Pāngasia', near: [22.7047, 90.5647] }],
      continental: [{ cc: 'BD', place: 'Auliāpur', near: [22.6884, 90.4895] }]
    } },
  { key: 'continental|sandwip', source: 'https://www.tbsnews.net/bangladesh/ferry-kapataksha-reaches-banshberia-ghat-after-8-hour-stranding-sandwip-route-1532136 ; https://www.tbsnews.net/bangladesh/transport/long-awaited-chattogram-sandwip-ferry-service-begins-operating-1100546 (Banshbaria ↔ Guptachhara (Sandwip))',
    ports: {
      // near : une seconde « Banshbaria » existe dans la division de Khulna, 190 km à l'ouest ; celle-ci est sur la
      // côte de Chittagong, face à Sandwip.
      continental: [{ cc: 'BD', place: 'Banshbaria', near: [22.55, 91.68] }],
      sandwip: [{ cc: 'BD', place: 'Gupta Chara' }]
    } },
  { key: 'continental|ireland', source: 'https://www.stenaline.co.uk/routes/rosslare-cherbourg (Rosslare ↔ Cherbourg)',
    ports: {
      continental: [{ cc: 'FR', place: 'Cherbourg-en-Cotentin' }],
      ireland: [{ cc: 'IE', place: 'Kilrane' }]
    } },
  { key: 'greatBritain|guernsey', source: 'https://www.condorferries.co.uk/ferry-routes-ports/ferries-to-guernsey/ferries-to-guernsey-from-the-uk (Poole ↔ St Peter Port (Guernesey))',
    ports: {
      greatBritain: [{ cc: 'GB', place: 'Poole', near: [50.71, -1.98] }],
      guernsey: [{ cc: 'GG', place: 'Saint Peter Port' }]
    } },
  { key: 'greatBritain|jersey', source: 'https://www.condorferries.co.uk/ferry-routes-ports/ferries-to-jersey/ferries-to-jersey-from-poole (Poole ↔ St Helier (Jersey))',
    ports: {
      greatBritain: [{ cc: 'GB', place: 'Poole', near: [50.71, -1.98] }],
      jersey: [{ cc: 'JE', place: 'Saint Helier' }]
    } },
  { key: 'ireland|isleOfMan', source: 'https://www.steam-packet.com/routes-and-times/larne-isle-of-man (Larne ↔ Douglas)',
    ports: {
      ireland: [{ cc: 'GB', place: 'Larne' }],
      isleOfMan: [{ cc: 'IM', place: 'Douglas' }]
    } },
  { key: 'continental|faroe', source: 'https://www.icelandferries.com/hirtshals-torshavn/ (Hirtshals ↔ Tórshavn)',
    ports: {
      continental: [{ cc: 'DK', place: 'Hirtshals' }],
      faroe: [{ cc: 'FO', place: 'Tórshavn' }]
    } },
  { key: 'faroe|iceland', source: 'https://www.northferries.com/en/smyril-line/ (Tórshavn ↔ Seyðisfjörður)',
    ports: {
      faroe: [{ cc: 'FO', place: 'Tórshavn' }],
      iceland: [{ cc: 'IS', place: 'Seyðisfjörður' }]
    } },
  { key: 'corsica|sardinia', source: 'https://www.moby.it/rotte/traghetti-sardegna/santa-teresa-bonifacio-santa-teresa/ (Bonifacio ↔ Santa Teresa Gallura)',
    ports: {
      corsica: [{ cc: 'FR', place: 'Bonifacio' }],
      sardinia: [{ cc: 'IT', place: 'Santa Teresa Gallura' }]
    } },
  { key: 'sardinia|sicily', source: 'https://www.grimaldi-lines.com/en/route/cagliari-palermo/ (Cagliari ↔ Palermo)',
    ports: {
      sardinia: [{ cc: 'IT', place: 'Cagliari' }],
      sicily: [{ cc: 'IT', place: 'Palermo' }]
    } },
  { key: 'korcula|lastovo', source: 'https://www.jadrolinija.hr/hr/putovanje/split_-vela_luka_korcula_-_ubli_lastovo (Vela Luka ↔ Ubli (Lastovo))',
    ports: {
      korcula: [{ cc: 'HR', place: 'Vela Luka' }],
      lastovo: [{ cc: 'HR', place: 'Ubli' }]
    } },
  { key: 'continental|cyprus', source: 'https://www.feribotseferleri.com.tr/en/guides/tasucu-girne-arabali-feribot-ucret-evrak-2026 ; https://scandroholding.com/wp-content/uploads/2026/04/PRI (Taşucu ↔ Girne (Kyrenia))',
    ports: {
      continental: [{ cc: 'TR', place: 'Taşucu' }],
      cyprus: [{ cc: 'CY', place: 'Kyrenia' }]
    } },
  { key: 'crete|santorini', source: 'https://www.ferryhopper.com/en/ferry-routes/direct/heraklion-to-santorini (Heraklion ↔ Athinios (Santorin))',
    ports: {
      crete: [{ cc: 'GR', place: 'Irákleion' }],
      santorini: [{ cc: 'GR', place: 'Megalochóri', near: [36.3857, 25.4297] }]
    } },
  { key: 'crete|karpathos', source: 'https://www.directferries.com/sitia_karpathos_ferry.htm (Sitia ↔ Pigadia (Karpathos))',
    ports: {
      crete: [{ cc: 'GR', place: 'Sitia' }],
      karpathos: [{ cc: 'GR', place: 'Karpathos' }]
    } },
  { key: 'karpathos|rhodes', source: 'https://karpathosinfo.com/karpathos-ferries/ (Pigadia (Karpathos) ↔ Rhodes)',
    ports: {
      karpathos: [{ cc: 'GR', place: 'Karpathos' }],
      rhodes: [{ cc: 'GR', place: 'Ródos' }]
    } },
  { key: 'crete|kythira', source: 'https://www.kithera.gr/en/routes-kythira/ferry-itineraries-kythira/ (Kissamos ↔ Diakofti (Cythère))',
    ports: {
      crete: [{ cc: 'GR', place: 'Kíssamos' }],
      kythira: [{ cc: 'GR', place: 'Diakófti' }]
    } },
  { key: 'kos|rhodes', source: 'https://www.ferries.gr/bluestarferries/dodekanese/ (Kos ↔ Rhodes)',
    ports: {
      kos: [{ cc: 'GR', place: 'Kos' }],
      rhodes: [{ cc: 'GR', place: 'Ródos' }]
    } },
  { key: 'kalymnos|kos', source: 'https://www.ferryscanner.com/en/ferry-routes/ferry-mastihari-kos-kalymnos (Mastichari (Kos) ↔ Pothia (Kalymnos))',
    ports: {
      kalymnos: [{ cc: 'GR', place: 'Kálymnos' }],
      kos: [{ cc: 'GR', place: 'Mastichári' }]
    } },
  { key: 'kalymnos|leros', source: 'https://www.ferries.gr/en/ferry-companies/anekalymnou/route/kalymnos-leros-lipsi-patmos-arki/ (Pothia (Kalymnos) ↔ Lakki (Leros))',
    ports: {
      kalymnos: [{ cc: 'GR', place: 'Kálymnos' }],
      leros: [{ cc: 'GR', place: 'Lakkí' }]
    } },
  { key: 'leros|patmos', source: 'https://www.ferries.gr/bluestarferries/dodekanese/ (Lakki (Leros) ↔ Skala (Patmos))',
    ports: {
      leros: [{ cc: 'GR', place: 'Lakkí' }],
      patmos: [{ cc: 'GR', place: 'Skála', near: [37.33, 26.55] }]
    } },
  { key: 'patmos|samos', source: 'https://www.ferryscanner.com/en/ferry-companies/ane-kalymnou (Skala (Patmos) ↔ Pythagorio (Samos))',
    ports: {
      patmos: [{ cc: 'GR', place: 'Skála', near: [37.33, 26.55] }],
      samos: [{ cc: 'GR', place: 'Pythagóreio' }]
    } },
  { key: 'ikaria|samos', source: 'https://www.ferryhopper.com/en/ferry-routes/direct/ikaria-samos (Evdilos (Ikaria) ↔ Karlovasi (Samos))',
    ports: {
      ikaria: [{ cc: 'GR', place: 'Évdilos' }],
      samos: [{ cc: 'GR', place: 'Néon Karlovásion' }]
    } },
  { key: 'chios|samos', source: 'https://www.ferries.gr/en/ferry-companies/bluestar/route/piraeus-samos-chios-mytilene-lemnos-thessaloniki/ (Vathy (Samos) ↔ Chios)',
    ports: {
      chios: [{ cc: 'GR', place: 'Chios' }],
      samos: [{ cc: 'GR', place: 'Samos' }]
    } },
  { key: 'chios|lesvos', source: 'https://www.ferryhopper.com/en/ferry-routes/direct/lesvos-chios (Chios ↔ Mytilène (Lesbos))',
    ports: {
      chios: [{ cc: 'GR', place: 'Chios' }],
      lesvos: [{ cc: 'GR', place: 'Mytilíni' }]
    } },
  { key: 'lesvos|limnos', source: 'https://www.ferryscanner.com/en/ferry-routes/ferry-limnos-lesvos-mytilene-all-ports (Mytilène (Lesbos) ↔ Myrina (Lemnos))',
    ports: {
      lesvos: [{ cc: 'GR', place: 'Mytilíni' }],
      limnos: [{ cc: 'GR', place: 'Mýrina', near: [39.87, 25.06] }]
    } },
  { key: 'continental|limnos', source: 'https://www.ferryhopper.com/en/ferry-routes/direct/kavala-lemnos (Kavala ↔ Myrina (Lemnos))',
    ports: {
      continental: [{ cc: 'GR', place: 'Kavála' }],
      limnos: [{ cc: 'GR', place: 'Mýrina', near: [39.87, 25.06] }]
    } },
  { key: 'ikaria|mykonos', source: 'https://www.ferryscanner.com/en/ferry-vessels/imo9208679 (Evdilos (Ikaria) ↔ Mykonos)',
    ports: {
      ikaria: [{ cc: 'GR', place: 'Évdilos' }],
      mykonos: [{ cc: 'GR', place: 'Mykonos' }]
    } },
  { key: 'mykonos|syros', source: 'https://www.ferries.gr/en/ferry-companies/bluestar/route/piraeus-samos-chios-mytilene-lemnos-thessaloniki/ (Syros ↔ Mykonos)',
    ports: {
      mykonos: [{ cc: 'GR', place: 'Mykonos' }],
      syros: [{ cc: 'GR', place: 'Ermoúpolis' }]
    } },
  { key: 'mykonos|tinos', source: 'https://fastferries.com.gr/en/routes/ (Tinos ↔ Mykonos)',
    ports: {
      mykonos: [{ cc: 'GR', place: 'Mykonos' }],
      tinos: [{ cc: 'GR', place: 'Tínos' }]
    } },
  { key: 'andros|tinos', source: 'https://fastferries.com.gr/en/routes/ (Gavrio (Andros) ↔ Tinos)',
    ports: {
      andros: [{ cc: 'GR', place: 'Gávrio' }],
      tinos: [{ cc: 'GR', place: 'Tínos' }]
    } },
  { key: 'syros|tinos', source: 'https://www.ferries.gr/bluestarferries/cyclades/naxos/island/naxos-syros-tinos-ferries.htm (Syros ↔ Tinos)',
    ports: {
      syros: [{ cc: 'GR', place: 'Ermoúpolis' }],
      tinos: [{ cc: 'GR', place: 'Tínos' }]
    } },
  { key: 'paros|syros', source: 'https://www.ferries.gr/en/ferry-companies/bluestar/route/piraeus-syros-paros-naxos-ios-santorini-anafi/ (Syros ↔ Parikia (Paros))',
    ports: {
      paros: [{ cc: 'GR', place: 'Parikia' }],
      syros: [{ cc: 'GR', place: 'Ermoúpolis' }]
    } },
  { key: 'naxos|paros', source: 'https://www.ferries.gr/en/ferry-companies/bluestar/route/piraeus-syros-paros-naxos-ios-santorini-anafi/ (Parikia (Paros) ↔ Naxos)',
    ports: {
      naxos: [{ cc: 'GR', place: 'Náxos' }],
      paros: [{ cc: 'GR', place: 'Parikia' }]
    } },
  { key: 'ios|naxos', source: 'https://www.ferries.gr/en/ferry-companies/bluestar/route/piraeus-syros-paros-naxos-ios-santorini-anafi/ (Naxos ↔ Ios)',
    ports: {
      ios: [{ cc: 'GR', place: 'Íos' }],
      naxos: [{ cc: 'GR', place: 'Náxos' }]
    } },
  { key: 'ios|santorini', source: 'https://www.ferries.gr/en/ferry-companies/bluestar/route/piraeus-syros-paros-naxos-ios-santorini-anafi/ (Ios ↔ Athinios (Santorin))',
    ports: {
      ios: [{ cc: 'GR', place: 'Íos' }],
      santorini: [{ cc: 'GR', place: 'Megalochóri', near: [36.3857, 25.4297] }]
    } },
  { key: 'amorgos|naxos', source: 'https://en.netferry.com/ferries/from/naxos/katapola-amorgos (Naxos ↔ Katapola (Amorgos))',
    ports: {
      amorgos: [{ cc: 'GR', place: 'Katápola' }],
      naxos: [{ cc: 'GR', place: 'Náxos' }]
    } },
  { key: 'skiathos|skopelos', source: 'https://www.ferryhopper.com/en/ferries/greece/skopelos (Skiathos ↔ Skopelos)',
    ports: {
      skiathos: [{ cc: 'GR', place: 'Skiáthos' }],
      skopelos: [{ cc: 'GR', place: 'Skópelos' }]
    } },
  { key: 'alonissos|skopelos', source: 'https://www.greeka.com/sporades/alonissos/ferries/ (Skopelos ↔ Patitiri (Alonissos))',
    ports: {
      alonissos: [{ cc: 'GR', place: 'Patitírion' }],
      skopelos: [{ cc: 'GR', place: 'Skópelos' }]
    } },
  { key: 'aegina|poros', source: 'https://www.ferries.gr/en/ferry-companies/saronic-ferries/route/piraeus-aegina-agistri-methana-poros/ (Égine ↔ Póros)',
    ports: {
      aegina: [{ cc: 'GR', place: 'Aegina' }],
      poros: [{ cc: 'GR', place: 'Póros' }]
    } },
  { key: 'ithaca|kefalonia', source: 'https://ionionpelagos.com/en/ferry-schedules/kefaloni%CE%B1-ithaca-ferry-schedules/ (Sami (Céphalonie) ↔ Pisaetos (Ithaque))',
    ports: {
      ithaca: [{ cc: 'GR', place: 'Aetós', near: [38.348, 20.6846] }],
      kefalonia: [{ cc: 'GR', place: 'Sámi' }]
    } },
  { key: 'kefalonia|zakynthos', source: 'https://ionionpelagos.com/en/ferry-schedules/kefalonia-zakynthos/ (Pessada (Céphalonie) ↔ Agios Nikolaos (Zante))',
    ports: {
      kefalonia: [{ cc: 'GR', place: 'Pesáda' }],
      zakynthos: [{ cc: 'GR', place: 'Agios Nikolaos', near: [37.9074, 20.7056] }]
    } },
  { key: 'belleIle|continental', source: 'https://www.belle-ile.com/organiser/venir-en-bateau-une-ile-plusieurs-ports-de-depart/au-depart-de-quiberon/depart-pour-belle-ile-en-mer-toute-l-annee/ (Quiberon ↔ Le Palais (Belle-Île))',
    ports: {
      belleIle: [{ cc: 'FR', place: 'Le Palais' }],
      continental: [{ cc: 'FR', place: 'Quiberon' }]
    } },
  { key: 'continental|groix', source: 'https://www.lorientbretagnesudtourisme.fr/fr/immanquables/ile-de-groix/traversee-bateau/ (Lorient ↔ Port-Tudy (Groix))',
    ports: {
      continental: [{ cc: 'FR', place: 'Lorient' }],
      groix: [{ cc: 'FR', place: 'Groix' }]
    } },
  { key: 'australia|tasmania', source: 'https://spiritoftasmania.getanchor.io/sailing-fares/vehicles-and-bicycles.html (Geelong ↔ Devonport)',
    ports: {
      australia: [{ cc: 'AU', place: 'Geelong' }],
      tasmania: [{ cc: 'AU', place: 'Devonport' }]
    } },
  { key: 'australia|kangarooIsland', source: 'https://southaustralia.com/products/kangaroo-island/transport/kangaroo-island-sealink-ferry (Cape Jervis ↔ Penneshaw)',
    ports: {
      australia: [{ cc: 'AU', place: 'Cape Jervis' }],
      kangarooIsland: [{ cc: 'AU', place: 'Penneshaw' }]
    } },
  { key: 'bruny|tasmania', source: 'https://www.sealink.com.au/bruny-island/ferry-information/bruny-island-ferry-fares/ (Kettering ↔ Roberts Point (Bruny Island))',
    ports: {
      bruny: [{ cc: 'AU', place: 'North Bruny' }],
      tasmania: [{ cc: 'AU', place: 'Kettering' }]
    } },
  { key: 'australia|magneticIsland', source: 'https://magneticislandferries.com.au/ (Townsville ↔ Nelly Bay (Magnetic Island))',
    ports: {
      australia: [{ cc: 'AU', place: 'Townsville', near: [-19.26, 146.82] }],
      magneticIsland: [{ cc: 'AU', place: 'Arcadia' }]
    } },
  { key: 'australia|moreton', source: 'https://www.moretonislandadventures.com.au/frequently-asked-questions/ (Port of Brisbane (Lytton) ↔ Tangalooma Wrecks)',
    ports: {
      australia: [{ cc: 'AU', place: 'Meeandah' }],
      moreton: [{ cc: 'AU', place: 'Tangalooma' }]
    } },
  { key: 'australia|northStradbroke', source: 'https://www.sealink.com.au/north-stradbroke-island/ferry-information/north-stradbroke-island-ferry-fares/ (Cleveland ↔ Dunwich (North Stradbroke))',
    ports: {
      australia: [{ cc: 'AU', place: 'Raby Bay' }],
      northStradbroke: [{ cc: 'AU', place: 'Myora' }]
    } },
  { key: 'australia|kgari', source: 'https://mantarayfraserislandbarge.com.au/ (Inskip Point ↔ Hook Point (K\'gari))',
    ports: {
      australia: [{ cc: 'AU', place: 'Inskip' }],
      kgari: [{ cc: 'AU', place: 'Eurong' }]
    } },
  { key: 'australia|frenchIsland', source: 'https://www.figsfrenchisland.com.au/getting-here/ (Corinella ↔ French Island (barge))',
    ports: {
      australia: [{ cc: 'AU', place: 'Corinella' }],
      frenchIsland: [{ cc: 'AU', place: 'Tankerton' }]
    } },
  { key: 'flinders|tasmania', source: 'https://bassstraitfreight.com.au/services/ (Bridport ↔ Lady Barron (Flinders Island))',
    ports: {
      flinders: [{ cc: 'AU', place: 'Lady Barron' }],
      tasmania: [{ cc: 'AU', place: 'Bridport' }]
    } },
  { key: 'australia|curtisIsland', source: 'https://www.curtisferryservices.com.au/ferry-timetables/ (Gladstone Marina ↔ South End (Curtis Island))',
    ports: {
      australia: [{ cc: 'AU', place: 'Gladstone', near: [-23.84, 151.26] }],
      curtisIsland: [{ cc: 'AU', place: 'Southend', near: [-23.72, 151.29] }]
    } },
  { key: 'northIsland|southIsland', source: 'https://www.interislander.co.nz/book/cook-strait-ferry-fares-and-payment-options (Wellington ↔ Picton)',
    ports: {
      northIsland: [{ cc: 'NZ', place: 'Wellington' }],
      southIsland: [{ cc: 'NZ', place: 'Picton' }]
    } },
  { key: 'northIsland|waiheke', source: 'https://www.sealink.co.nz/timetables-fares/waiheke/waiheke-half-moon-bay (Half Moon Bay ↔ Kennedy Point (Waiheke))',
    ports: {
      northIsland: [{ cc: 'NZ', place: 'Pakuranga' }],
      waiheke: [{ cc: 'NZ', place: 'Ostend' }]
    } },
  { key: 'greatBarrier|northIsland', source: 'https://www.sealink.co.nz/travelling-with-us/terminals/tryphena-wharf (Auckland (Wynyard Quarter) ↔ Tryphena (Great Barrier))',
    ports: {
      greatBarrier: [{ cc: 'NZ', place: 'Tryphena' }],
      northIsland: [{ cc: 'NZ', place: 'Wynyard Quarter' }]
    } },
  { key: 'durville|southIsland', source: 'https://durvillecrossings.co.nz/durville-island-car-barge.php (French Pass ↔ Kapowai (D\'Urville Island))',
    ports: {
      durville: [{ cc: 'NZ', place: 'Kapowai' }],
      southIsland: [{ cc: 'NZ', place: 'Hamilton Bay', near: [-40.9269, 173.8431] }]
    } },
  { key: 'vanuaLevu|vitiLevu', source: 'https://fijipocketguide.com/the-guide-to-travelling-in-fiji-by-ferry/ (Natovi ↔ Nabouwalu)',
    ports: {
      vanuaLevu: [{ cc: 'FJ', place: 'Nabouwalu', near: [-16.99, 178.70] }],
      vitiLevu: [{ cc: 'FJ', place: 'Natovi' }]
    } },
  { key: 'ovalau|vitiLevu', source: 'https://fijipocketguide.com/how-to-take-the-ferry-to-the-lomaiviti-islands/ (Natovi ↔ Buresala (Ovalau))',
    ports: {
      ovalau: [{ cc: 'FJ', place: 'Buresala Settlement' }],
      vitiLevu: [{ cc: 'FJ', place: 'Natovi' }]
    } },
  { key: 'taveuni|vanuaLevu', source: 'https://fijipocketguide.com/how-to-take-the-ferry-to-taveuni/ (Natuvu (Buca Bay) ↔ Taveuni)',
    ports: {
      taveuni: [{ cc: 'FJ', place: 'Waiyevo' }],
      vanuaLevu: [{ cc: 'FJ', place: 'Natuvu', near: [-16.6739, 179.8432] }]
    } },
  { key: 'eua|tongatapu', source: 'https://tongapocketguide.com/the-guide-to-travelling-in-tonga-by-ferry (Nuku\'alofa ↔ \'Ohonua (\'Eua))',
    ports: {
      eua: [{ cc: 'TO', place: '\'Ohonua' }],
      tongatapu: [{ cc: 'TO', place: 'Nuku‘alofa' }]
    } },
  { key: 'lifukaFoa|tongatapu', source: 'https://en.wikipedia.org/wiki/MV_\'Otuanga\'ofa (Nuku\'alofa ↔ Pangai (Ha\'apai))',
    ports: {
      lifukaFoa: [{ cc: 'TO', place: 'Pangai', near: [-19.80, -174.35] }],
      tongatapu: [{ cc: 'TO', place: 'Nuku‘alofa' }]
    } },
  { key: 'lifukaFoa|vavau', source: 'https://tongapocketguide.com/the-guide-to-travelling-in-tonga-by-ferry (Pangai (Ha\'apai) ↔ Neiafu (Vava\'u))',
    ports: {
      lifukaFoa: [{ cc: 'TO', place: 'Pangai', near: [-19.80, -174.35] }],
      vavau: [{ cc: 'TO', place: 'Neiafu', near: [-18.65, -173.98] }]
    } },
  { key: 'grandeTerreNC|ileDesPins', source: 'https://www.betico.nc/tarifs (Nouméa ↔ Kuto (Île des Pins))',
    ports: {
      grandeTerreNC: [{ cc: 'FR', place: 'Nouméa' }],
      ileDesPins: [{ cc: 'FR', place: 'L\'Île-des-Pins' }]
    } },
  { key: 'grandeTerreNC|mare', source: 'https://www.betico.nc/tarifs (Nouméa ↔ Tadine (Maré))',
    ports: {
      grandeTerreNC: [{ cc: 'FR', place: 'Nouméa' }],
      mare: [{ cc: 'FR', place: 'Maré' }]
    } },
  { key: 'grandeTerreNC|lifou', source: 'https://www.betico.nc/tarifs (Nouméa ↔ Wé (Lifou))',
    ports: {
      grandeTerreNC: [{ cc: 'FR', place: 'Nouméa' }],
      lifou: [{ cc: 'FR', place: 'Lifou' }]
    } },
  { key: 'lifou|mare', source: 'https://www.betico.nc/tarifs (Tadine (Maré) ↔ Wé (Lifou))',
    ports: {
      lifou: [{ cc: 'FR', place: 'Lifou' }],
      mare: [{ cc: 'FR', place: 'Maré' }]
    } },
  { key: 'arran|greatBritain', source: 'https://assets.calmac.co.uk/media/3slhh51n/ardrossan-brodick-s26.pdf (Ardrossan ↔ Brodick)',
    ports: {
      arran: [{ cc: 'GB', place: 'Brodick' }],
      greatBritain: [{ cc: 'GB', place: 'Ardrossan' }]
    } },
  { key: 'bute|greatBritain', source: 'https://assets.calmac.co.uk/media/kh2hkdn3/wemyss-bay-rothesay-s26.pdf (Wemyss Bay ↔ Rothesay)',
    ports: {
      bute: [{ cc: 'GB', place: 'Rothesay' }],
      greatBritain: [{ cc: 'GB', place: 'Wemyss Bay' }]
    } },
  { key: 'cumbrae|greatBritain', source: 'https://assets.calmac.co.uk/media/h12d5r3v/largs-cumbrae-s26-v2.pdf (Largs ↔ Cumbrae Slip)',
    ports: {
      cumbrae: [{ cc: 'GB', place: 'Isle of Cumbrae' }],
      greatBritain: [{ cc: 'GB', place: 'Largs' }]
    } },
  { key: 'greatBritain|mull', source: 'https://assets.calmac.co.uk/media/2j2pmonp/oban-craignure-s26.pdf (Oban ↔ Craignure)',
    ports: {
      greatBritain: [{ cc: 'GB', place: 'Oban' }],
      mull: [{ cc: 'GB', place: 'Craignure' }]
    } },
  { key: 'greatBritain|islay', source: 'https://assets.calmac.co.uk/media/hubnmk3p/kennacraig-islay-s26.pdf (Kennacraig ↔ Port Askaig / Port Ellen)',
    ports: {
      greatBritain: [{ cc: 'GB', place: 'Kennacraig' }],
      islay: [{ cc: 'GB', place: 'Port Askaig' }, { cc: 'GB', place: 'Port Ellen' }]
    } },
  { key: 'islay|jura', source: 'https://juraferry.argyll-bute.gov.uk/car-driver (Port Askaig ↔ Feolin)',
    ports: {
      islay: [{ cc: 'GB', place: 'Port Askaig' }],
      jura: [{ cc: 'GB', place: 'Feolin Ferry' }]
    } },
  { key: 'colonsay|greatBritain', source: 'https://assets.calmac.co.uk/media/mn4bpd31/oban-colonsay-s26.pdf (Oban ↔ Colonsay)',
    ports: {
      colonsay: [{ cc: 'GB', place: 'Scalasaig' }],
      greatBritain: [{ cc: 'GB', place: 'Oban' }]
    } },
  { key: 'colonsay|islay', source: 'https://assets.calmac.co.uk/media/zmxb33qc/port-askaig-colonsay-s26.pdf (Port Askaig ↔ Colonsay)',
    ports: {
      colonsay: [{ cc: 'GB', place: 'Scalasaig' }],
      islay: [{ cc: 'GB', place: 'Port Askaig' }]
    } },
  { key: 'gigha|greatBritain', source: 'https://assets.calmac.co.uk/media/js3dhfqu/tayinloan-gigha-s26.pdf (Tayinloan ↔ Gigha)',
    ports: {
      gigha: [{ cc: 'GB', place: 'Ardminish' }],
      greatBritain: [{ cc: 'GB', place: 'Tayinloan' }]
    } },
  { key: 'coll|greatBritain', source: 'https://assets.calmac.co.uk/media/xhoc40kd/oban-coll-s26.pdf (Oban ↔ Coll)',
    ports: {
      coll: [{ cc: 'GB', place: 'Arinagour' }],
      greatBritain: [{ cc: 'GB', place: 'Oban' }]
    } },
  { key: 'greatBritain|tiree', source: 'https://assets.calmac.co.uk/media/1yldqd0r/oban-tiree-s26.pdf (Oban ↔ Tiree)',
    ports: {
      greatBritain: [{ cc: 'GB', place: 'Oban' }],
      tiree: [{ cc: 'GB', place: 'Scarinish' }]
    } },
  { key: 'coll|tiree', source: 'https://assets.calmac.co.uk/media/zbbfp5rw/coll-tiree-s26.pdf (Coll ↔ Tiree)',
    ports: {
      coll: [{ cc: 'GB', place: 'Arinagour' }],
      tiree: [{ cc: 'GB', place: 'Scarinish' }]
    } },
  { key: 'greatBritain|lismore', source: 'https://assets.calmac.co.uk/media/rtrjotaf/oban-lismore-s26.pdf (Oban ↔ Lismore)',
    ports: {
      greatBritain: [{ cc: 'GB', place: 'Oban' }],
      lismore: [{ cc: 'GB', place: 'Achnacroish' }]
    } },
  { key: 'greatBritain|luing', source: 'https://cuanferry.argyll-bute.gov.uk/cars-2 (Cuan ↔ Luing)',
    ports: {
      greatBritain: [{ cc: 'GB', place: 'Cuan' }],
      luing: [{ cc: 'GB', place: 'South Cuan' }]
    } },
  { key: 'greatBritain|raasay', source: 'https://assets.calmac.co.uk/media/b5ilfsq3/sconser-raasay-s26.pdf (Sconser ↔ Raasay)',
    ports: {
      greatBritain: [{ cc: 'GB', place: 'Sconser' }],
      raasay: [{ cc: 'GB', place: 'Inverarish' }]
    } },
];
