// Ports de ferry du lot 4 (liaisons FERRY_ROUTES) — voir scripts/build-ferry-ports.js.
// place = localité des données de lieux du projet la plus proche du terminal (coordonnées jamais saisies).
module.exports = [
  { key: 'continental|uloya', source: 'https://autopassferje.no/en/free-ferries-from-july-1st-2022/ (Rotsund ↔ Havnnes (Uløya))',
    ports: {
      continental: [{ cc: 'NO', place: 'Rotsund' }],
      uloya: [{ cc: 'NO', place: 'Gárgu' }]
    } },
  { key: 'arnoyaSkjervoy|continental', source: 'https://autopassferje.no/en/free-ferries-from-july-1st-2022/ ; https://www.boreal.no/troms-ferge/storstein-nikkeby-lauksundskaret-article32234-1815.html (Storstein (Kågen) ↔ Lauksundskaret (Arnøya) ; Nikkeby est sur Laukøya)',
    ports: {
      arnoyaSkjervoy: [{ cc: 'NO', place: 'Lauksundskaret' }],
      continental: [{ cc: 'NO', place: 'Finneidet' }]
    } },
  { key: 'continental|laukoya', source: 'https://autopassferje.no/en/free-ferries-from-july-1st-2022/ ; https://www.boreal.no/troms-ferge/storstein-nikkeby-lauksundskaret-article32234-1815.html (Storstein (Kågen) ↔ Nikkeby (Laukøya) ; Lauksundskaret est sur Arnøya)',
    ports: {
      continental: [{ cc: 'NO', place: 'Finneidet' }],
      laukoya: [{ cc: 'NO', place: 'Nikkeby' }]
    } },
  { key: 'continental|soroya', source: 'https://autopassferje.no/en/free-ferries-from-july-1st-2022/ (Øksfjord ↔ Hasvik (Sørøya))',
    ports: {
      continental: [{ cc: 'NO', place: 'Øksfjord' }],
      soroya: [{ cc: 'NO', place: 'Hasvik' }]
    } },
  { key: 'faro|gotland', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Fårösund ↔ Fårö (Fårösundsleden))',
    ports: {
      faro: [{ cc: 'SE', place: 'Ödehoburga' }],
      gotland: [{ cc: 'SE', place: 'Fårösund' }]
    } },
  { key: 'continental|holmon', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Norrfjärden ↔ Holmön (Holmöleden))',
    ports: {
      continental: [{ cc: 'SE', place: 'Ivarsboda' }],
      holmon: [{ cc: 'SE', place: 'Holmön', near: [63.8, 20.87] }]
    } },
  { key: 'continental|ivo', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Barum ↔ Ivö (Ivöleden))',
    ports: {
      continental: [{ cc: 'SE', place: 'Barum' }],
      ivo: [{ cc: 'SE', place: 'Ivö' }]
    } },
  { key: 'continental|graso', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Öregrund ↔ Gräsö (Gräsöleden))',
    ports: {
      continental: [{ cc: 'SE', place: 'Öregrund' }],
      graso: [{ cc: 'SE', place: 'Gräsö', near: [60.35, 18.46] }]
    } },
  { key: 'continental|yxlan', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Furusund ↔ Yxlan (Furusundsleden))',
    ports: {
      continental: [{ cc: 'SE', place: 'Furusund' }],
      yxlan: [{ cc: 'SE', place: 'Köpmanholm' }]
    } },
  { key: 'blido|yxlan', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Yxlan ↔ Blidö (Blidöleden))',
    ports: {
      blido: [{ cc: 'SE', place: 'Stämmarsund' }],
      yxlan: [{ cc: 'SE', place: 'Kolsvik' }]
    } },
  { key: 'continental|ljustero', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Östanå ↔ Ljusterö (Ljusteröleden))',
    ports: {
      continental: [{ cc: 'SE', place: 'Östanå', near: [59.55, 18.58] }],
      ljustero: [{ cc: 'SE', place: 'Ljusterö' }]
    } },
  { key: 'continental|rindo', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Vaxholm ↔ Rindö (Vaxholmsleden))',
    ports: {
      continental: [{ cc: 'SE', place: 'Vaxholm' }],
      rindo: [{ cc: 'SE', place: 'Rindö' }]
    } },
  { key: 'arno|continental', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Oknön ↔ Arnö (Arnöleden))',
    ports: {
      arno: [{ cc: 'SE', place: 'Strandby' }],
      continental: [{ cc: 'SE', place: 'Dalby', near: [59.5, 17.11] }]
    } },
  { key: 'continental|ockero', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Lilla Varholmen ↔ Hönö (Hönöleden))',
    ports: {
      continental: [{ cc: 'SE', place: 'Hjuvik' }],
      ockero: [{ cc: 'SE', place: 'Hönö' }]
    } },
  { key: 'bjorkoOckero|continental', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Lilla Varholmen ↔ Björkö (Björköleden))',
    ports: {
      bjorkoOckero: [{ cc: 'SE', place: 'Björkö', near: [57.73, 11.68] }],
      continental: [{ cc: 'SE', place: 'Hjuvik' }]
    } },
  { key: 'nordo|ockero', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Burö ↔ Knippla/Rörö (Nordöleden))',
    ports: {
      nordo: [{ cc: 'SE', place: 'Källö-Knippla' }, { cc: 'SE', place: 'Rörö' }],
      ockero: [{ cc: 'SE', place: 'Hälsö' }]
    } },
  { key: 'continental|lyr', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Lyresten ↔ Lyr (Lyrleden))',
    ports: {
      continental: [{ cc: 'SE', place: 'Nösund', near: [58.09, 11.53] }],
      lyr: [{ cc: 'SE', place: 'Röd', near: [58.09, 11.53] }]
    } },
  { key: 'continental|hamburgo', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Hamburgsund ↔ Hamburgö (Hamburgsundsleden))',
    ports: {
      continental: [{ cc: 'SE', place: 'Hamburgsund' }],
      hamburgo: [{ cc: 'SE', place: 'Berga', near: [58.55, 11.27] }]
    } },
  { key: 'bohusMalmon|continental', source: 'https://www.trafikverket.se/resa-och-trafik/farjetrafik/ ; https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Tullboden ↔ Bohus-Malmön)',
    ports: {
      bohusMalmon: [{ cc: 'SE', place: 'Myren', near: [58.34, 11.32] }],
      continental: [{ cc: 'SE', place: 'Tullboden', near: [58.36, 11.34] }]
    } },
  { key: 'continental|visingso', source: 'https://www.jonkoping.se/trafik--stadsplanering/resa-och-kollektivtrafik/visingsotrafiken-farja-mellan-granna-och-visingso/prislista-farjan-mellan-granna-och-visingso (Gränna ↔ Visingsö (Visingsöleden))',
    ports: {
      continental: [{ cc: 'SE', place: 'Gränna' }],
      visingso: [{ cc: 'SE', place: 'Visingsö' }]
    } },
  { key: 'continental|orno', source: 'https://ornosjotrafik.se/prislista-biljetter/ (Dalarö ↔ Ornö (Hässelmara))',
    ports: {
      continental: [{ cc: 'SE', place: 'Dalarö' }],
      orno: [{ cc: 'SE', place: 'Skinnardal' }]
    } },
  { key: 'continental|hogmarso', source: 'https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_f%C3%A4rjeleder_i_Sverige (Svartnö ↔ Högmarsö)',
    ports: {
      continental: [{ cc: 'SE', place: 'Svartnö', near: [59.66, 18.85] }],
      hogmarso: [{ cc: 'SE', place: 'Högmarsö' }]
    } },
  { key: 'continental|nagu', source: 'https://www.finferries.fi/en/ (Lillmälö (Pargas) ↔ Prostvik (Nagu))',
    ports: {
      continental: [{ cc: 'FI', place: 'Lillmälö' }],
      nagu: [{ cc: 'FI', place: 'Nagu' }]
    } },
  { key: 'korpo|nagu', source: 'https://www.finferries.fi/en/ (Pärnäs (Nagu) ↔ Retais (Korpo))',
    ports: {
      korpo: [{ cc: 'FI', place: 'Österretais' }],
      nagu: [{ cc: 'FI', place: 'Pärnäs' }]
    } },
  { key: 'houtskar|korpo', source: 'https://www.finferries.fi/en/ (Galtby (Korpo) ↔ Kittuis (Houtskär))',
    ports: {
      houtskar: [{ cc: 'FI', place: 'Kittuis' }],
      korpo: [{ cc: 'FI', place: 'Galtby Brygga' }]
    } },
  { key: 'continental|inio', source: 'https://www.finferries.fi/en/ (Heponiemi (Kustavi) ↔ Kannvik (Iniö))',
    ports: {
      continental: [{ cc: 'FI', place: 'Luotsi' }],
      inio: [{ cc: 'FI', place: 'Skagen' }]
    } },
  { key: 'continental|velkua', source: 'https://www.finferries.fi/en/ (Palva ↔ Velkuanmaa)',
    ports: {
      continental: [{ cc: 'FI', place: 'Palva' }],
      velkua: [{ cc: 'FI', place: 'Pohjakylä' }]
    } },
  { key: 'houtskar|inio', source: 'https://elinvoimakeskus.fi/yhteysalusliikenne (Mossala (Houtskär) ↔ Dalen (Iniö))',
    ports: {
      houtskar: [{ cc: 'FI', place: 'Mossala' }],
      inio: [{ cc: 'FI', place: 'Dalen', near: [60.38, 21.37] }]
    } },
  { key: 'continental|hitis', source: 'https://elinvoimakeskus.fi/yhteysalusliikenne (Kasnäs ↔ Rosala/Hitis)',
    ports: {
      continental: [{ cc: 'FI', place: 'Kasnäs' }],
      hitis: [{ cc: 'FI', place: 'Rosala' }, { cc: 'FI', place: 'Hitis' }]
    } },
  { key: 'hispaniola|puertoRico', source: 'https://ferriesdelcaribe.com/tarifas.php ; https://www.ferryhopper.com/en/ferry-routes/direct/santo-domingo-san-juan (Santo Domingo ↔ San Juan)',
    ports: {
      hispaniola: [{ cc: 'DO', place: 'Santo Domingo' }],
      puertoRico: [{ cc: 'PR', place: 'San Juan' }]
    } },
  { key: 'tobago|trinidad', source: 'https://www.ttitferry.com/fares/ (Port of Spain ↔ Scarborough)',
    ports: {
      tobago: [{ cc: 'TT', place: 'Scarborough' }],
      trinidad: [{ cc: 'TT', place: 'Port of Spain' }]
    } },
  { key: 'saintJohnVI|saintThomasVI', source: 'https://www.lovecitycarferries.com/rates-fares.html (Red Hook ↔ Cruz Bay)',
    ports: {
      saintJohnVI: [{ cc: 'VI', place: 'Cruz Bay' }],
      saintThomasVI: [{ cc: 'VI', place: 'Nazareth' }]
    } },
  { key: 'nevis|stKitts', source: 'https://www.nevisisland.com/plan/ferry-services ; https://stkittscarrental.com/nevis-ferry-guide-how-to-get-from-st-kitts-to-nevis/ (Major\'s Bay ↔ Cades Bay)',
    ports: {
      nevis: [{ cc: 'KN', place: 'Westbury' }],
      stKitts: [{ cc: 'KN', place: 'Grape Tree Bottom' }]
    } },
  { key: 'carriacou|grenada', source: 'https://tyrrelbayexpress.com/ (St. George\'s ↔ Tyrrel Bay)',
    ports: {
      carriacou: [{ cc: 'GD', place: 'Hermitage', near: [12.45, -61.49] }],
      grenada: [{ cc: 'GD', place: 'Saint George\'s' }]
    } },
  { key: 'bequia|stVincent', source: 'https://bequiaexpress.com/fares/ (Kingstown ↔ Port Elizabeth)',
    ports: {
      bequia: [{ cc: 'VC', place: 'Port Elizabeth' }],
      stVincent: [{ cc: 'VC', place: 'Kingstown' }]
    } },
  { key: 'canouan|stVincent', source: 'https://bequiaexpress.com/fares/ (Kingstown ↔ Canouan)',
    ports: {
      canouan: [{ cc: 'VC', place: 'Charlestown', near: [12.7, -61.33] }],
      stVincent: [{ cc: 'VC', place: 'Kingstown' }]
    } },
  { key: 'canouan|mayreau', source: 'https://bequiaexpress.com/fares/ (Canouan ↔ Mayreau)',
    ports: {
      canouan: [{ cc: 'VC', place: 'Charlestown', near: [12.7, -61.33] }],
      mayreau: [{ cc: 'VC', place: 'Old Wall' }]
    } },
  { key: 'mayreau|unionIsland', source: 'https://bequiaexpress.com/fares/ (Mayreau ↔ Clifton (Union Island))',
    ports: {
      mayreau: [{ cc: 'VC', place: 'Old Wall' }],
      unionIsland: [{ cc: 'VC', place: 'Clifton' }]
    } },
  { key: 'stVincent|unionIsland', source: 'https://bequiaexpress.com/fares/ (Kingstown ↔ Clifton (Union Island))',
    ports: {
      stVincent: [{ cc: 'VC', place: 'Kingstown' }],
      unionIsland: [{ cc: 'VC', place: 'Clifton' }]
    } },
  { key: 'cuba|islaDeLaJuventud', source: 'https://www.granma.cu/cuba/2022-08-20/que-sabemos-del-nuevo-ferry-para-la-ruta-gerona-batabano ; https://www.cibercuba.com/noticias/2026-08-08-u1-e209363-s27061-nid337318-mientras-falta-transporte-publico-isla-juventud (Surgidero de Batabanó ↔ Nueva Gerona)',
    ports: {
      cuba: [{ cc: 'CU', place: 'Surgidero de Batabanó' }],
      islaDeLaJuventud: [{ cc: 'CU', place: 'Nueva Gerona' }]
    } },
  { key: 'cozumel|northAmerica', source: 'https://transcaribe.net/en/rates/ (Calica (Punta Venado) ↔ Cozumel)',
    ports: {
      cozumel: [{ cc: 'MX', place: 'Cozumel', near: [20.5, -86.94] }],
      northAmerica: [{ cc: 'MX', place: 'Xcaret' }]
    } },
  { key: 'islaMujeres|northAmerica', source: 'https://ultracarga.com/en/ruta-punta-sam-isla-mujeres/ (Punta Sam ↔ Isla Mujeres)',
    ports: {
      islaMujeres: [{ cc: 'MX', place: 'Isla Mujeres' }],
      northAmerica: [{ cc: 'MX', place: 'Punta Sam' }]
    } },
  { key: 'northAmerica|roatan', source: 'https://hondurasferry.com/ayuda-y-soporte/ (La Ceiba ↔ Roatán)',
    ports: {
      northAmerica: [{ cc: 'HN', place: 'La Ceiba', near: [15.77, -86.79] }],
      roatan: [{ cc: 'HN', place: 'Dixon Cove', near: [16.32, -86.51] }]
    } },
  { key: 'northAmerica|ometepe', source: 'https://ferryometepe.com/ (San Jorge ↔ Moyogalpa)',
    ports: {
      northAmerica: [{ cc: 'NI', place: 'San Jorge', near: [11.46, -85.8] }],
      ometepe: [{ cc: 'NI', place: 'Moyogalpa' }]
    } },
  { key: 'islaColon|northAmerica', source: 'https://ferrybocas.com/en/prices/ (Almirante ↔ Bocas del Toro (Isla Colón))',
    ports: {
      islaColon: [{ cc: 'PA', place: 'Bocas del Toro' }],
      northAmerica: [{ cc: 'PA', place: 'Almirante', near: [9.3, -82.4] }]
    } },
  { key: 'continental|kerkennah', source: 'https://www.sonotrak.com.tn (Sfax ↔ Sidi Youssef (Kerkennah))',
    ports: {
      continental: [{ cc: 'TN', place: 'Sfax' }],
      kerkennah: [{ cc: 'TN', place: 'Mellita', near: [34.65, 11.03] }]
    } },
  { key: 'continental|dalma', source: 'https://www.admaritime.ae (Jebel Al Dhanna ↔ Dalma)',
    ports: {
      continental: [{ cc: 'AE', place: 'Jebel Dhanna' }],
      dalma: [{ cc: 'AE', place: 'Dalma Island' }]
    } },
  { key: 'busuanga|luzon', source: 'https://travel.2go.com.ph (Manille ↔ Coron)',
    ports: {
      busuanga: [{ cc: 'PH', place: 'Coron' }],
      luzon: [{ cc: 'PH', place: 'Manila' }]
    } },
  { key: 'continental|olkhon', source: 'https://vsrp.ru/routes/paromnaya-pereprava-mrs-ostrov-olkhon-02/ ; https://www.magicbaikal.ru/rest/ferry-to-olkhon.htm (Sakhiurta (MRS) ↔ Olkhon)',
    ports: {
      continental: [{ cc: 'RU', place: 'Shida' }],
      olkhon: [{ cc: 'RU', place: 'Yelga' }]
    } },
  { key: 'kunashir|sakhalin', source: 'https://paluba.media/news/207890 ; https://sakhpasflot.ru/napravleniya/ ; https://rasp.yandex.ru/water/korsakov--ugno-kurilsk (Korsakov ↔ Ioujno-Kourilsk)',
    ports: {
      kunashir: [{ cc: 'RU', place: 'Yuzhno-Kurilsk' }],
      sakhalin: [{ cc: 'RU', place: 'Korsakov' }]
    } },
  { key: 'iturup|sakhalin', source: 'https://paluba.media/news/207890 ; https://sakhpasflot.ru/napravleniya/ (Korsakov ↔ Kourilsk (Itouroup))',
    ports: {
      iturup: [{ cc: 'RU', place: 'Kuril’sk' }],
      sakhalin: [{ cc: 'RU', place: 'Korsakov' }]
    } },
  { key: 'hokkaido|honshu', source: 'https://www.tsugarukaikyo.co.jp/service/fare/hakodate-aomori/ (Aomori ↔ Hakodate)',
    ports: {
      hokkaido: [{ cc: 'JP', place: 'Hakodate' }],
      honshu: [{ cc: 'JP', place: 'Aomori' }]
    } },
  { key: 'honshu|okinawa', source: 'https://www.aline-ferry.com/kagoshima/fare/car_price/ (Kagoshima ↔ Naha)',
    ports: {
      honshu: [{ cc: 'JP', place: 'Kagoshima' }],
      okinawa: [{ cc: 'JP', place: 'Naha' }]
    } },
  { key: 'amami|honshu', source: 'https://www.aline-ferry.com/kagoshima/fare/car_price/ (Kagoshima ↔ Naze (Amami-Ōshima))',
    ports: {
      amami: [{ cc: 'JP', place: 'Naze' }],
      honshu: [{ cc: 'JP', place: 'Kagoshima' }]
    } },
  { key: 'honshu|tokunoshima', source: 'https://www.aline-ferry.com/kagoshima/fare/car_price/ (Kagoshima ↔ Kametoku (Tokunoshima))',
    ports: {
      honshu: [{ cc: 'JP', place: 'Kagoshima' }],
      tokunoshima: [{ cc: 'JP', place: 'Kametoku' }]
    } },
  { key: 'honshu|okinoerabu', source: 'https://www.aline-ferry.com/kagoshima/fare/car_price/ (Kagoshima ↔ Wadomari (Okinoerabu))',
    ports: {
      honshu: [{ cc: 'JP', place: 'Kagoshima' }],
      okinoerabu: [{ cc: 'JP', place: 'Wadomari' }]
    } },
  { key: 'continental|honshu', source: 'https://www.kampuferry.co.jp/reserve/index.html#carbike_fare (Busan ↔ Shimonoseki)',
    ports: {
      continental: [{ cc: 'KR', place: 'Busan', near: [35.1, 129.03] }],
      honshu: [{ cc: 'JP', place: 'Shimonoseki', near: [33.96, 130.94] }]
    } },
  { key: 'penghu|taiwan', source: 'https://tnc-kao.com.tw/transport/information ; https://tnc-kao.com.tw/schedule/ticket (Kaohsiung ↔ Magong)',
    ports: {
      penghu: [{ cc: 'TW', place: 'Magong' }],
      taiwan: [{ cc: 'TW', place: 'Kaohsiung' }]
    } },
  { key: 'nangan|taiwan', source: 'https://client.matsu.idv.tw/apt/cargo.html ; https://client.matsu.idv.tw/apt/price.html ; https://client.matsu.idv.tw/apt/newtaima.html ; https://matsu-nsa.gov.tw/zh-TW/transport/ferry (Keelung ↔ Fu’ao (Nangan))',
    ports: {
      nangan: [{ cc: 'TW', place: 'Nangan' }],
      taiwan: [{ cc: 'TW', place: 'Keelung' }]
    } },
  { key: 'dongyin|taiwan', source: 'https://client.matsu.idv.tw/apt/cargo.html ; https://client.matsu.idv.tw/apt/price.html ; https://matsu-nsa.gov.tw/zh-TW/transport/ferry (Keelung ↔ Zhongzhu (Dongyin))',
    ports: {
      dongyin: [{ cc: 'TW', place: 'Lehuacun' }],
      taiwan: [{ cc: 'TW', place: 'Keelung' }]
    } },
  { key: 'dongyin|nangan', source: 'https://client.matsu.idv.tw/apt/cargo.html ; https://client.matsu.idv.tw/apt/price.html (Fu’ao (Nangan) ↔ Zhongzhu (Dongyin))',
    ports: {
      dongyin: [{ cc: 'TW', place: 'Lehuacun' }],
      nangan: [{ cc: 'TW', place: 'Nangan' }]
    } },
  { key: 'miquelon|saintPierre', source: 'https://www.spm-ferries.fr/wp-content/uploads/2026/08/TARIFS-vehicules-au-26-MAI-2026-FR.pdf (Saint-Pierre ↔ Miquelon)',
    ports: {
      miquelon: [{ cc: 'FR', place: 'Miquelon-Langlade' }],
      saintPierre: [{ cc: 'FR', place: 'Saint-Pierre', near: [46.78, -56.18] }]
    } },
  { key: 'moorea|tahiti', source: 'https://www.aremitiexpress.com/ (Papeete ↔ Vaiare (Moorea))',
    ports: {
      moorea: [{ cc: 'FR', place: 'Moorea-Maiao' }],
      tahiti: [{ cc: 'FR', place: 'Papeete' }]
    } },
  { key: 'continental|yeu', source: 'https://www.yeu-continent.fr/wp-content/uploads/2025/12/RECUEIL-MARCHANDISE-2026_compressed.pdf (Fromentine ↔ Port-Joinville (île d\'Yeu))',
    ports: {
      continental: [{ cc: 'FR', place: 'La Barre-de-Monts' }],
      yeu: [{ cc: 'FR', place: 'L\'Île-d\'Yeu' }]
    } },
  { key: 'java|sumatra', source: 'https://www.asdp.id/siaran-pers/tarif-baru-penyeberangan-pada-29-lintasan-di-seluruh-indonesia-resmi-berlaku ; https://finance.detik.com/infrastruktur/d-7705893/pengumuman-ini-daftar-tarif-penyeberangan-feri (Merak ↔ Bakauheni)',
    ports: {
      java: [{ cc: 'ID', place: 'Merak', near: [-5.93, 106] }],
      sumatra: [{ cc: 'ID', place: 'Bakauheni' }]
    } },
  { key: 'bali|java', source: 'https://www.detik.com/jatim/berita/d-8347506/tarif-penyeberangan-ketapang-gilimanuk-untuk-motor-hingga-truk ; https://www.detik.com/bali/berita/d-6842206/tarif-penyeberangan-ketapang-gilimanuk-naik-5-93-persen-ini-rinciannya (Ketapang ↔ Gilimanuk)',
    ports: {
      bali: [{ cc: 'ID', place: 'Gilimanuk' }],
      java: [{ cc: 'ID', place: 'Ketapang', near: [-8.14, 114.4] }]
    } },
  { key: 'bali|lombok', source: 'https://www.satpellembar.info/tarif/ (Padangbai ↔ Lembar)',
    ports: {
      bali: [{ cc: 'ID', place: 'Padangbai' }],
      lombok: [{ cc: 'ID', place: 'Lembar', near: [-8.73, 116.07] }]
    } },
  { key: 'lombok|sumbawa', source: 'https://insidelombok.id/berita-utama/tarif-penyeberangan-kayangan-poto-tano-naik-ini-biayanya/ ; https://suarantb.com/2026/03/17/mudik-lebaran-2026-asdp-kayangan-siapkan-24-kapal-dan-beri-diskon-tarif/ (Kayangan ↔ Poto Tano)',
    ports: {
      lombok: [{ cc: 'ID', place: 'Labuan Lombok' }],
      sumbawa: [{ cc: 'ID', place: 'Pototano', near: [-8.52, 116.83] }]
    } },
  { key: 'flores|sumbawa', source: 'https://www.detik.com/bali/nusra/d-8248945/hore-ada-diskon-tarif-kapal-sape-labuan-bajo-nataru-ini-daftar-harga-terbaru (Sape ↔ Labuan Bajo)',
    ports: {
      flores: [{ cc: 'ID', place: 'Labuan Bajo' }],
      sumbawa: [{ cc: 'ID', place: 'Muhajidin' }]
    } },
  { key: 'bangka|sumatra', source: 'https://sumsel.idntimes.com/news/sumatra-selatan/mau-ke-bangka-cek-tarif-dan-jadwal-terbaru-kapal-feri-juli-2026-00-pbgds-7lr6zp (Tanjung Api-Api ↔ Tanjung Kalian (Muntok))',
    ports: {
      bangka: [{ cc: 'ID', place: 'Muntok' }],
      sumatra: [{ cc: 'ID', place: 'Karanganyar', near: [-2.37, 104.8] }]
    } },
  { key: 'continental|langkawi', source: 'https://www.langkawiroro.com/fare.html (Kuala Perlis ↔ Langkawi (RoRo))',
    ports: {
      continental: [{ cc: 'MY', place: 'Kuala Perlis' }],
      langkawi: [{ cc: 'MY', place: 'Kuah' }]
    } },
  { key: 'continental|salamina', source: 'https://www.pireasnews.gr/salamina-perama-afxiseis-sta-eisitiria-para-tis-diavevaioseis-kikilia-oti-den-tha-yparxoun-nees-anatimiseis/ (Pérama ↔ Paloúkia (Salamine))',
    ports: {
      continental: [{ cc: 'GR', place: 'Pérama', near: [37.97, 23.57] }],
      salamina: [{ cc: 'GR', place: 'Paloúkia' }]
    } },
  { key: 'continental|thassos', source: 'https://anethferries.gr/en/fares/ (Keramotí ↔ Limenas (Thasos))',
    ports: {
      continental: [{ cc: 'GR', place: 'Keramotí' }],
      thassos: [{ cc: 'GR', place: 'Thásos' }]
    } },
  { key: 'continental|samothraki', source: 'https://www.insamothraki.com/samothraki-ferry.html (Alexandroúpoli ↔ Kamariótissa (Samothrace))',
    ports: {
      continental: [{ cc: 'GR', place: 'Alexandroúpoli' }],
      samothraki: [{ cc: 'GR', place: 'Kamariótissa' }]
    } },
  { key: 'agEfstratios|limnos', source: 'https://www.ferryhopper.com/en/ferries/greece/agios-efstratios (Mýrina (Lemnos) ↔ Ágios Efstrátios)',
    ports: {
      agEfstratios: [{ cc: 'GR', place: 'Ágios Efstrátios' }],
      limnos: [{ cc: 'GR', place: 'Mýrina' }]
    } },
  { key: 'chios|psara', source: 'https://www.ferryhopper.com/en/ferries/greece/psara (Chios ↔ Psara)',
    ports: {
      chios: [{ cc: 'GR', place: 'Chíos' }],
      psara: [{ cc: 'GR', place: 'Psará' }]
    } },
  { key: 'chios|oinousses', source: 'https://www.ferryhopper.com/en/ferries/greece/oinousses (Chios ↔ Oinousses)',
    ports: {
      chios: [{ cc: 'GR', place: 'Chíos' }],
      oinousses: [{ cc: 'GR', place: 'Oinoússes' }]
    } },
  { key: 'fourni|ikaria', source: 'https://www.ferryhopper.com/en/ferries/greece/fourni (Ágios Kírykos (Ikaria) ↔ Fourni)',
    ports: {
      fourni: [{ cc: 'GR', place: 'Foúrnoi' }],
      ikaria: [{ cc: 'GR', place: 'Ágios Kírykos' }]
    } },
  { key: 'kalymnos|lipsi', source: 'https://www.ferryhopper.com/en/ferries/greece/leipsoi (Pothiá (Kalymnos) ↔ Leipsoí)',
    ports: {
      kalymnos: [{ cc: 'GR', place: 'Kálymnos' }],
      lipsi: [{ cc: 'GR', place: 'Leipsoí' }]
    } },
  { key: 'agathonisi|samos', source: 'https://www.ferryhopper.com/en/ferries/greece/agathonisi (Pythagóreio (Samos) ↔ Agathonísi)',
    ports: {
      agathonisi: [{ cc: 'GR', place: 'Agios Georgios', near: [37.46, 26.97] }],
      samos: [{ cc: 'GR', place: 'Pythagóreio' }]
    } },
  { key: 'astypalaia|continental', source: 'https://www.ferryhopper.com/en/ferry-routes/direct/piraeus-astypalea (Le Pirée ↔ Astypálaia)',
    ports: {
      astypalaia: [{ cc: 'GR', place: 'Astypálaia' }],
      continental: [{ cc: 'GR', place: 'Peiraiás' }]
    } },
  { key: 'nisyros|tilos', source: 'https://www.ferryhopper.com/en/ferries/greece/tilos (Nisyros ↔ Tilos)',
    ports: {
      nisyros: [{ cc: 'GR', place: 'Mandráki' }],
      tilos: [{ cc: 'GR', place: 'Livádia' }]
    } },
  { key: 'rhodes|tilos', source: 'https://www.ferryhopper.com/en/ferries/greece/tilos (Rhodes ↔ Tilos)',
    ports: {
      rhodes: [{ cc: 'GR', place: 'Ródos' }],
      tilos: [{ cc: 'GR', place: 'Livádia' }]
    } },
  { key: 'rhodes|symi', source: 'https://www.ferryhopper.com/en/ferries/greece/symi (Rhodes ↔ Symi)',
    ports: {
      rhodes: [{ cc: 'GR', place: 'Ródos' }],
      symi: [{ cc: 'GR', place: 'Sými' }]
    } },
  { key: 'chalki|rhodes', source: 'https://www.ferryhopper.com/en/ferries/greece/halki (Rhodes ↔ Chálki)',
    ports: {
      chalki: [{ cc: 'GR', place: 'Chalki', near: [36.22, 27.61] }],
      rhodes: [{ cc: 'GR', place: 'Ródos' }]
    } },
  { key: 'kastellorizo|rhodes', source: 'https://www.ferryhopper.com/en/ferries/greece/kastellorizo (Rhodes ↔ Kastellorizo)',
    ports: {
      kastellorizo: [{ cc: 'GR', place: 'Megísti' }],
      rhodes: [{ cc: 'GR', place: 'Ródos' }]
    } },
  { key: 'karpathos|kasos', source: 'https://www.ferryhopper.com/en/ferries/greece/kasos (Pigádia (Karpathos) ↔ Kasos)',
    ports: {
      karpathos: [{ cc: 'GR', place: 'Kárpathos' }],
      kasos: [{ cc: 'GR', place: 'Fry' }]
    } },
  { key: 'continental|kea', source: 'https://www.ferryhopper.com/en/ferries/greece/kea (Lavrio ↔ Korissía (Kéa))',
    ports: {
      continental: [{ cc: 'GR', place: 'Lávrio' }],
      kea: [{ cc: 'GR', place: 'Korissía' }]
    } },
  { key: 'continental|kythnos', source: 'https://www.ferryhopper.com/en/ferries/greece/kythnos (Lavrio ↔ Mérichas (Kýthnos))',
    ports: {
      continental: [{ cc: 'GR', place: 'Lávrio' }],
      kythnos: [{ cc: 'GR', place: 'Mérichas' }]
    } },
  { key: 'continental|serifos', source: 'https://www.ferryhopper.com/en/ferries/greece/serifos (Le Pirée ↔ Livádi (Sérifos))',
    ports: {
      continental: [{ cc: 'GR', place: 'Peiraiás' }],
      serifos: [{ cc: 'GR', place: 'Livádion' }]
    } },
  { key: 'continental|sifnos', source: 'https://www.ferryhopper.com/en/ferries/greece/sifnos (Le Pirée ↔ Kamáres (Sífnos))',
    ports: {
      continental: [{ cc: 'GR', place: 'Peiraiás' }],
      sifnos: [{ cc: 'GR', place: 'Kamárai', near: [36.99, 24.68] }]
    } },
  { key: 'continental|folegandros', source: 'https://www.ferryhopper.com/en/ferries/greece/folegandros (Le Pirée ↔ Karavostásis (Folégandros))',
    ports: {
      continental: [{ cc: 'GR', place: 'Peiraiás' }],
      folegandros: [{ cc: 'GR', place: 'Karavostásis' }]
    } },
  { key: 'continental|sikinos', source: 'https://www.ferryhopper.com/en/ferries/greece/sikinos (Le Pirée ↔ Alopronoia (Síkinos))',
    ports: {
      continental: [{ cc: 'GR', place: 'Peiraiás' }],
      sikinos: [{ cc: 'GR', place: 'Aloprónoia' }]
    } },
  { key: 'anafi|santorini', source: 'https://www.ferryhopper.com/en/ferries/greece/anafi (Athiniós (Santorin) ↔ Anáfi)',
    ports: {
      anafi: [{ cc: 'GR', place: 'Anáfi' }],
      santorini: [{ cc: 'GR', place: 'Megalochóri', near: [36.38, 25.43] }]
    } },
  { key: 'donoussa|naxos', source: 'https://www.ferryhopper.com/en/ferries/greece/donousa (Naxos ↔ Donoúsa)',
    ports: {
      donoussa: [{ cc: 'GR', place: 'Donoúsa' }],
      naxos: [{ cc: 'GR', place: 'Náxos' }]
    } },
  { key: 'koufonisia|naxos', source: 'https://www.ferryhopper.com/en/ferries/greece/koufonisia (Naxos ↔ Koufonísia)',
    ports: {
      koufonisia: [{ cc: 'GR', place: 'Koufonísi' }],
      naxos: [{ cc: 'GR', place: 'Náxos' }]
    } },
  { key: 'naxos|schinoussa', source: 'https://www.ferryhopper.com/en/ferries/greece/schinoussa (Naxos ↔ Schoinoússa)',
    ports: {
      naxos: [{ cc: 'GR', place: 'Náxos' }],
      schinoussa: [{ cc: 'GR', place: 'Schoinoússa' }]
    } },
  { key: 'iraklia|naxos', source: 'https://www.ferryhopper.com/en/ferries/greece/iraklia (Naxos ↔ Irakleiá)',
    ports: {
      iraklia: [{ cc: 'GR', place: 'Ágios Geórgios', near: [36.85, 25.47] }],
      naxos: [{ cc: 'GR', place: 'Náxos' }]
    } },
  { key: 'antiparos|paros', source: 'https://www.ferryhopper.com/en/ferry-routes/direct/paros-antiparos (Poúnta (Paros) ↔ Antiparos)',
    ports: {
      antiparos: [{ cc: 'GR', place: 'Antíparos' }],
      paros: [{ cc: 'GR', place: 'Poúnta', near: [37.04, 25.1] }]
    } },
  { key: 'kimolos|milos', source: 'https://kimolos-link.gr/en/pricelist/ (Pollonia (Milos) ↔ Psathi (Kimolos))',
    ports: {
      kimolos: [{ cc: 'GR', place: 'Psáthi', near: [36.79, 24.58] }],
      milos: [{ cc: 'GR', place: 'Pollónia' }]
    } },
  { key: 'angistri|continental', source: 'https://www.ferryhopper.com/en/ferries/greece/agistri (Le Pirée ↔ Skála (Angistri))',
    ports: {
      angistri: [{ cc: 'GR', place: 'Skála', near: [37.71, 23.37] }],
      continental: [{ cc: 'GR', place: 'Peiraiás' }]
    } },
  { key: 'continental|paxos', source: 'https://www.ferryhopper.com/en/ferries/greece/paxoi (Igoumenítsa ↔ Gáios (Paxos))',
    ports: {
      continental: [{ cc: 'GR', place: 'Igoumenítsa' }],
      paxos: [{ cc: 'GR', place: 'Gáios' }]
    } },
  { key: 'corfu|ereikoussa', source: 'https://www.ferryhopper.com/en/ferries/greece/othonoi (Corfou ↔ Ereikoússa)',
    ports: {
      corfu: [{ cc: 'GR', place: 'Kérkyra' }],
      ereikoussa: [{ cc: 'GR', place: 'Ereikoússa' }]
    } },
  { key: 'ereikoussa|othonoi', source: 'https://www.ferryhopper.com/en/ferries/greece/othonoi (Ereikoússa ↔ Othonoí)',
    ports: {
      ereikoussa: [{ cc: 'GR', place: 'Ereikoússa' }],
      othonoi: [{ cc: 'GR', place: 'Othonoí' }]
    } },
  { key: 'mathraki|othonoi', source: 'https://www.ferryhopper.com/en/ferries/greece/mathraki (Othonoí ↔ Mathráki)',
    ports: {
      mathraki: [{ cc: 'GR', place: 'Mathráki' }],
      othonoi: [{ cc: 'GR', place: 'Othonoí' }]
    } },
  { key: 'continental|meganisi', source: 'https://www.ferryhopper.com/en/ferries/greece/meganisi (Nydrí (Lefkada) ↔ Spiliá (Meganísi))',
    ports: {
      continental: [{ cc: 'GR', place: 'Nydrí' }],
      meganisi: [{ cc: 'GR', place: 'Spartokhórion' }]
    } },
  { key: 'continental|elafonisos', source: 'https://elafonisosferry.gr/ (Poúda (Laconie) ↔ Elafónisos)',
    ports: {
      continental: [{ cc: 'GR', place: 'Poúnta', near: [36.52, 22.98] }],
      elafonisos: [{ cc: 'GR', place: 'Elafónisos' }]
    } },
  { key: 'ammouliani|continental', source: 'https://ammoulianilines.gr/en/ticket-prices/ (Tripití ↔ Ammoulianí)',
    ports: {
      ammouliani: [{ cc: 'GR', place: 'Ammouliani' }],
      continental: [{ cc: 'GR', place: 'Trypití', near: [40.36, 23.92] }]
    } },
  { key: 'santorini|thirasia', source: 'https://thirasia.eu/tickets/ (Athiniós (Santorin) ↔ Ríva (Thirasía))',
    ports: {
      santorini: [{ cc: 'GR', place: 'Megalochóri', near: [36.38, 25.43] }],
      thirasia: [{ cc: 'GR', place: 'Agía Eiríni', near: [36.45, 25.34] }]
    } },
  { key: 'kos|pserimos', source: 'https://www.ferryhopper.com/en/ferries/greece/pserimos (Mastichári (Kos) ↔ Psérimos)',
    ports: {
      kos: [{ cc: 'GR', place: 'Mastichári' }],
      pserimos: [{ cc: 'GR', place: 'Psérimos' }]
    } },
  { key: 'antikythira|crete', source: 'https://www.ferries.gr/en/ferry-companies/seajets/route/piraeus-kythera-kissamos-gythio/ (Kíssamos (Crète) ↔ Antikythira)',
    ports: {
      antikythira: [{ cc: 'GR', place: 'Potamós Antikythíron' }],
      crete: [{ cc: 'GR', place: 'Kíssamos' }]
    } },
  { key: 'continental|drvenikVeli', source: 'https://www.jadrolinija.hr/download/32b38ebc75f18571222f4689206f7cbd (Trogir (Soline) ↔ Drvenik Veli)',
    ports: {
      continental: [{ cc: 'HR', place: 'Trogir' }],
      drvenikVeli: [{ cc: 'HR', place: 'Veliki Drvenik' }]
    } },
  { key: 'continental|drvenikMali', source: 'https://www.jadrolinija.hr/download/32b38ebc75f18571222f4689206f7cbd (Trogir (Soline) ↔ Drvenik Mali)',
    ports: {
      continental: [{ cc: 'HR', place: 'Trogir' }],
      drvenikMali: [{ cc: 'HR', place: 'Mali Drvenik' }]
    } },
  { key: 'continental|ist', source: 'https://www.jadrolinija.hr/download/0ca141e5177fb3507ff5fef2e6839804 (Zadar (Gaženica) ↔ Ist)',
    ports: {
      continental: [{ cc: 'HR', place: 'Zadar' }],
      ist: [{ cc: 'HR', place: 'Ist' }]
    } },
  { key: 'continental|olib', source: 'https://www.jadrolinija.hr/download/0ca141e5177fb3507ff5fef2e6839804 (Zadar (Gaženica) ↔ Olib)',
    ports: {
      continental: [{ cc: 'HR', place: 'Zadar' }],
      olib: [{ cc: 'HR', place: 'Olib' }]
    } },
  { key: 'continental|premuda', source: 'https://www.jadrolinija.hr/download/0ca141e5177fb3507ff5fef2e6839804 (Zadar (Gaženica) ↔ Premuda (Krijal))',
    ports: {
      continental: [{ cc: 'HR', place: 'Zadar' }],
      premuda: [{ cc: 'HR', place: 'Premuda' }]
    } },
  { key: 'cres|premuda', source: 'https://www.jadrolinija.hr/download/0ca141e5177fb3507ff5fef2e6839804 (Mali Lošinj ↔ Premuda (Krijal))',
    ports: {
      cres: [{ cc: 'HR', place: 'Mali Lošinj' }],
      premuda: [{ cc: 'HR', place: 'Premuda' }]
    } },
];
