// Ports de ferry du lot 6 (Colombie-Britannique, Samoa, Philippines, Amérique du Sud, Canaries, Baléares, Açores,
// Italie, Thaïlande, Andaman, Féroé, Turquie, Cap-Vert, Russie, îles Wadden, Ceuta/Melilla).
// Coordonnées : jamais saisies, prises dans public/data par scripts/build-ferry-ports.js.
// Quand le terminal n'existe pas comme lieu, la localité la plus proche sur la bonne rive est retenue (commentée).
const BCF = 'https://www.bcferries.com/web_image/h90/h4b/9089486028830.pdf';
const SIREMAR = 'https://cdn.carontetourist.it/sites/default/files/2026-09/listino-prezzi-siremar-ordinaria-valida-dal-10-09-2026_1.pdf';
const FRED = 'https://www.fredolsen.es/en/routes';
const TRANSASIA = 'https://transasiashipping.com/rolling-cargo-rates-freighters/ ; https://transasiashipping.com/passage-fare-vismin/';
const INTERILHAS = 'https://www.cvinterilhas.cv/tariffs ; https://enapor.cv/en_US/page/porto-do-tarrafal ; https://enapor.cv/en_US/page/porto-da-palmeira';
const GUYANA_THD = 'https://dpi.gov.gy/ferrypass-to-be-launched-for-leguan-wakenaam-passengers/';

module.exports = [
  // Tsawwassen → Beach Grove (quartier de Tsawwassen, Delta)
  { key: 'galianoIsland|northAmerica', source: BCF + ' (Route 9, Tsawwassen ↔ Sturdies Bay)',
    ports: { galianoIsland: [{ cc: 'CA', place: 'Sturdies Bay' }], northAmerica: [{ cc: 'CA', place: 'Beach Grove' }] } },
  // Otter Bay → Port Washington (Pender Island)
  { key: 'penderIsland|vancouverIsland', source: BCF + ' (Route 5, Swartz Bay ↔ Otter Bay)',
    ports: { penderIsland: [{ cc: 'CA', place: 'Port Washington' }], vancouverIsland: [{ cc: 'CA', place: 'Swartz Bay' }] } },
  // Village Bay → Mayne
  { key: 'mayneIsland|vancouverIsland', source: BCF + ' (Route 5, Swartz Bay ↔ Village Bay)',
    ports: { mayneIsland: [{ cc: 'CA', place: 'Mayne' }], vancouverIsland: [{ cc: 'CA', place: 'Swartz Bay' }] } },
  { key: 'galianoIsland|vancouverIsland', source: BCF + ' (Route 5, Swartz Bay ↔ Sturdies Bay)',
    ports: { galianoIsland: [{ cc: 'CA', place: 'Sturdies Bay' }], vancouverIsland: [{ cc: 'CA', place: 'Swartz Bay' }] } },
  // Lyall Harbour → Saturna
  { key: 'saturnaIsland|vancouverIsland', source: BCF + ' (Route 5, Swartz Bay ↔ Lyall Harbour)',
    ports: { saturnaIsland: [{ cc: 'CA', place: 'Saturna' }], vancouverIsland: [{ cc: 'CA', place: 'Swartz Bay' }] } },
  { key: 'thetisIsland|vancouverIsland', source: BCF + ' (Route 20, Chemainus ↔ Thetis Island)',
    ports: { thetisIsland: [{ cc: 'CA', place: 'Thetis Island' }], vancouverIsland: [{ cc: 'CA', place: 'Chemainus' }] } },
  // Descanso Bay → Gabriola
  { key: 'gabriolaIsland|vancouverIsland', source: BCF + ' (Route 19, Nanaimo Harbour ↔ Descanso Bay)',
    ports: { gabriolaIsland: [{ cc: 'CA', place: 'Gabriola' }], vancouverIsland: [{ cc: 'CA', place: 'Nanaimo' }] } },
  // Buckley Bay → Fanny Bay (~5 km)
  { key: 'denmanIsland|vancouverIsland', source: BCF + ' (Route 21, Buckley Bay ↔ Denman Island)',
    ports: { denmanIsland: [{ cc: 'CA', place: 'Denman Island' }], vancouverIsland: [{ cc: 'CA', place: 'Fanny Bay' }] } },
  // Gravelly Bay → Denman Island ; Shingle Spit → Hornby Island
  { key: 'denmanIsland|hornbyIsland', source: BCF + ' (Route 22, Gravelly Bay ↔ Shingle Spit)',
    ports: { denmanIsland: [{ cc: 'CA', place: 'Denman Island' }], hornbyIsland: [{ cc: 'CA', place: 'Hornby Island' }] } },
  { key: 'quadraIsland|vancouverIsland', source: BCF + ' (Route 23, Campbell River ↔ Quathiaski Cove)',
    ports: { quadraIsland: [{ cc: 'CA', place: 'Quathiaski Cove' }], vancouverIsland: [{ cc: 'CA', place: 'Campbell River' }] } },
  { key: 'cortesIsland|quadraIsland', source: BCF + ' (Route 24, Heriot Bay ↔ Whaletown)',
    ports: { cortesIsland: [{ cc: 'CA', place: 'Whaletown' }], quadraIsland: [{ cc: 'CA', place: 'Heriot Bay' }] } },
  { key: 'malcolmIsland|vancouverIsland', source: BCF + ' (Route 25, Port McNeill ↔ Sointula)',
    ports: { malcolmIsland: [{ cc: 'CA', place: 'Sointula' }], vancouverIsland: [{ cc: 'CA', place: 'Port McNeill' }] } },
  { key: 'cormorantIsland|vancouverIsland', source: BCF + ' (Route 25, Port McNeill ↔ Alert Bay)',
    ports: { cormorantIsland: [{ cc: 'CA', place: 'Alert Bay' }], vancouverIsland: [{ cc: 'CA', place: 'Port McNeill' }] } },
  { key: 'grahamIsland|northAmerica', source: BCF + ' (Route 11, Prince Rupert ↔ Skidegate)',
    ports: { grahamIsland: [{ cc: 'CA', place: 'Skidegate' }], northAmerica: [{ cc: 'CA', place: 'Prince Rupert' }] } },
  { key: 'grahamIsland|moresbyIsland', source: BCF + ' (Route 26, Skidegate ↔ Alliford Bay)',
    ports: { grahamIsland: [{ cc: 'CA', place: 'Skidegate' }], moresbyIsland: [{ cc: 'CA', place: 'Alliford Bay' }] } },
  // McLoughlin Bay → Bella Bella
  { key: 'bellaBella|vancouverIsland', source: BCF + ' (Route 10, Port Hardy ↔ Bella Bella/McLoughlin Bay)',
    ports: { bellaBella: [{ cc: 'CA', place: 'Bella Bella' }], vancouverIsland: [{ cc: 'CA', place: 'Port Hardy' }] } },
  { key: 'bellaBella|northAmerica', source: BCF + ' (Bella Coola – Central Coast Ports : Bella Coola ↔ Bella Bella)',
    ports: { bellaBella: [{ cc: 'CA', place: 'Bella Bella' }], northAmerica: [{ cc: 'CA', place: 'Bella Coola' }] } },
  { key: 'northAmerica|shearwater', source: BCF + ' (Bella Coola – Central Coast Ports : Bella Coola ↔ Shearwater)',
    ports: { northAmerica: [{ cc: 'CA', place: 'Bella Coola' }], shearwater: [{ cc: 'CA', place: 'Shearwater' }] } },
  { key: 'klemtu|northAmerica', source: BCF + ' (Bella Coola – Central Coast Ports : Bella Coola ↔ Klemtu)',
    ports: { klemtu: [{ cc: 'CA', place: 'Klemtu' }], northAmerica: [{ cc: 'CA', place: 'Bella Coola' }] } },
  { key: 'northAmerica|oceanFalls', source: BCF + ' (Bella Coola – Central Coast Ports : Bella Coola ↔ Ocean Falls)',
    ports: { northAmerica: [{ cc: 'CA', place: 'Bella Coola' }], oceanFalls: [{ cc: 'CA', place: 'Ocean Falls' }] } },
  { key: 'bellaBella|shearwater', source: BCF + ' (Bella Bella – Shearwater Only)',
    ports: { bellaBella: [{ cc: 'CA', place: 'Bella Bella' }], shearwater: [{ cc: 'CA', place: 'Shearwater' }] } },

  { key: 'savaii|upolu', source: 'https://www.ssc.ws/timetable-fares-domestic/ (Mulifanua ↔ Salelologa)',
    ports: { savaii: [{ cc: 'WS', place: 'Salelologa' }], upolu: [{ cc: 'WS', place: 'Mulifanua' }] } },
  { key: 'tau|tutuila', source: 'https://portadministration.as.gov/services/water-transportation-wtd (MV Manuʻatele, Pago Pago ↔ Faleāsao)',
    ports: { tau: [{ cc: 'AS', place: 'Faleāsao' }], tutuila: [{ cc: 'AS', place: 'Pago Pago' }] } },
  { key: 'ofuOlosega|tutuila', source: 'https://portadministration.as.gov/services/water-transportation-wtd (MV Manuʻatele, Pago Pago ↔ Ofu)',
    ports: { ofuOlosega: [{ cc: 'AS', place: 'Ofu' }], tutuila: [{ cc: 'AS', place: 'Pago Pago' }] } },

  { key: 'luzon|mindoro', source: 'https://starliteferries.com/schedule-and-rates-2025-batangas-routes/ (Batangas ↔ Calapan)',
    ports: { luzon: [{ cc: 'PH', place: 'Batangas', near: [13.76, 121.06] }], mindoro: [{ cc: 'PH', place: 'Calapan' }] } },
  { key: 'mindoro|panay', source: 'https://starliteferries.com/schedule-and-rates-2025-roxas-mindoro-routes/ (Roxas, Mindoro ↔ Caticlan)',
    ports: { mindoro: [{ cc: 'PH', place: 'Roxas' }], panay: [{ cc: 'PH', place: 'Caticlan' }] } },
  { key: 'luzon|panay', source: 'https://starliteferries.com/schedule-and-rates-2025-batangas-routes/ (Batangas ↔ Caticlan)',
    ports: { luzon: [{ cc: 'PH', place: 'Batangas', near: [13.76, 121.06] }], panay: [{ cc: 'PH', place: 'Caticlan' }] } },
  { key: 'luzon|romblon', source: 'https://starliteferries.com/schedule-and-rates-2025-romblon-routes/ (Romblon ↔ Batangas)',
    ports: { luzon: [{ cc: 'PH', place: 'Batangas', near: [13.76, 121.06] }], romblon: [{ cc: 'PH', place: 'Romblon' }] } },
  { key: 'romblon|sibuyan', source: 'https://starliteferries.com/schedule-and-rates-2025-sibuyan-routes/ (Sibuyan/Magdiwang ↔ Romblon)',
    ports: { romblon: [{ cc: 'PH', place: 'Romblon' }], sibuyan: [{ cc: 'PH', place: 'Magdiwang' }] } },
  { key: 'panay|romblon', source: 'https://starliteferries.com/schedule-and-rates-2025-romblon-routes/ (Romblon ↔ Roxas City, Capiz)',
    ports: { panay: [{ cc: 'PH', place: 'Roxas City' }], romblon: [{ cc: 'PH', place: 'Romblon' }] } },
  { key: 'luzon|sibuyan', source: 'https://starliteferries.com/schedule-and-rates-2025-sibuyan-routes/ (Sibuyan/Magdiwang ↔ Batangas)',
    ports: { luzon: [{ cc: 'PH', place: 'Batangas', near: [13.76, 121.06] }], sibuyan: [{ cc: 'PH', place: 'Magdiwang' }] } },
  { key: 'bohol|cebu', source: TRANSASIA + ' (Cebu ↔ Tagbilaran)',
    ports: { bohol: [{ cc: 'PH', place: 'Tagbilaran City' }], cebu: [{ cc: 'PH', place: 'Cebu City' }] } },
  { key: 'cebu|masbate', source: TRANSASIA + ' (Cebu ↔ Masbate City)',
    ports: { cebu: [{ cc: 'PH', place: 'Cebu City' }], masbate: [{ cc: 'PH', place: 'Masbate' }] } },
  { key: 'cebu|panay', source: TRANSASIA + ' (Cebu ↔ Iloilo)',
    ports: { cebu: [{ cc: 'PH', place: 'Cebu City' }], panay: [{ cc: 'PH', place: 'Iloilo' }] } },
  { key: 'cebu|mindanao', source: TRANSASIA + ' (Cebu ↔ Cagayan de Oro)',
    ports: { cebu: [{ cc: 'PH', place: 'Cebu City' }], mindanao: [{ cc: 'PH', place: 'Cagayan de Oro' }] } },
  { key: 'bohol|mindanao', source: TRANSASIA + ' (Tagbilaran ↔ Cagayan de Oro)',
    ports: { bohol: [{ cc: 'PH', place: 'Tagbilaran City' }], mindanao: [{ cc: 'PH', place: 'Cagayan de Oro' }] } },
  // Port de Benoni → Mahinog (commune du port, ~2 km)
  { key: 'camiguin|mindanao', source: 'http://www.pmocdo.ppa.com.ph/fare-rates-for-rolling-cargo-port-of-balingoan-to-benoni-and-vice-versa/ ; http://www.pmocdo.ppa.com.ph/port-profile/terminal-management-office-of-camiguin/port-of-benoni/ (Balingoan ↔ Benoni, Mahinog)',
    ports: { camiguin: [{ cc: 'PH', place: 'Mahinog' }], mindanao: [{ cc: 'PH', place: 'Balingoan' }] } },

  // Pargua → Guayún (~18 km) ; Chacao → Ancud (~25 km) : aucun lieu plus proche dans les données
  { key: 'chiloe|southAmerica', source: 'https://www.transmarchilay.cl/horarios-y-tarifas/ (Pargua ↔ Chacao)',
    ports: { chiloe: [{ cc: 'CL', place: 'Ancud' }], southAmerica: [{ cc: 'CL', place: 'Guayún' }] } },
  // Isla Quinchao → Curaco de Vélez
  { key: 'chiloe|quinchao', source: 'https://www.voyonovoy.com/informacion-barcazas-chiloe/ (Dalcahue ↔ Isla Quinchao)',
    ports: { chiloe: [{ cc: 'CL', place: 'Dalcahue' }], quinchao: [{ cc: 'CL', place: 'Curaco de Vélez' }] } },
  // Huicha → Chonchi ; Chulchuy → Puqueldón
  { key: 'chiloe|lemuy', source: 'https://www.voyonovoy.com/informacion-barcazas-chiloe/ (Huicha ↔ Chulchuy)',
    ports: { chiloe: [{ cc: 'CL', place: 'Chonchi' }], lemuy: [{ cc: 'CL', place: 'Puqueldón' }] } },
  // Caleta La Arena → Cajon (~9 km) ; Caleta Puelche → Pata Mai (~20 km)
  { key: 'hualaihue|southAmerica', source: 'https://testuario.cl/tarifas/ (Caleta La Arena ↔ Caleta Puelche)',
    ports: { hualaihue: [{ cc: 'CL', place: 'Pata Mai' }], southAmerica: [{ cc: 'CL', place: 'Cajon' }] } },
  // Puerto Yungay → Rápido Bórquez (~19 km)
  { key: 'southAmerica|villaOHiggins', source: 'https://carretera-austral.cl/transbordadores-y-barcazas/ (Puerto Yungay ↔ Río Bravo)',
    ports: { southAmerica: [{ cc: 'CL', place: 'Rápido Bórquez' }], villaOHiggins: [{ cc: 'CL', place: 'Río Bravo' }] } },
  // Punta Delgada → Monte Aymond (AR, ~40 km) ; Bahía Azul → Clarencia (~50 km) : aucun lieu plus proche
  { key: 'southAmerica|tierraDelFuego', source: 'https://radiomagallanes.cl/tabsa-actualiza-tarifas-del-cruce-primera-angostura-desde-abril-de-2026/ (Primera Angostura, Punta Delgada ↔ Bahía Azul)',
    ports: { southAmerica: [{ cc: 'AR', place: 'Monte Aymond' }], tierraDelFuego: [{ cc: 'CL', place: 'Clarencia' }] } },
  { key: 'navarino|southAmerica', source: 'https://www.exploraislanavarino.com/en/como-llegar-a-puerto-williams-isla-navarino/ (Yaghan, Punta Arenas ↔ Puerto Williams)',
    ports: { navarino: [{ cc: 'CL', place: 'Puerto Williams' }], southAmerica: [{ cc: 'CL', place: 'Punta Arenas' }] } },
  // New Haven → Dos Lomas (~6 km)
  { key: 'eastFalkland|westFalkland', source: 'https://workboat.co.fk/concordia-bay/ferry-fares (New Haven ↔ Port Howard)',
    ports: { eastFalkland: [{ cc: 'FK', place: 'Dos Lomas' }], westFalkland: [{ cc: 'FK', place: 'Port Howard' }] } },
  { key: 'margarita|southAmerica', source: 'https://elaragueno.com.ve/conferry-publico-tarifas-de-boletos-para-viajes-entre-puerto-la-cruz-y-margarita/ (Puerto La Cruz ↔ Punta de Piedras)',
    ports: { margarita: [{ cc: 'VE', place: 'Punta de Piedras' }], southAmerica: [{ cc: 'VE', place: 'Puerto La Cruz', near: [10.21, -64.63] }] } },
  { key: 'guyane|suriname', source: 'https://la1ere.franceinfo.fr/guyane/reprise-partielle-du-bac-la-gabrielle-entre-saint-laurent-du-maroni-et-albina-des-le-7-juillet-1717069.html (bac La Gabrielle, Saint-Laurent-du-Maroni ↔ Albina)',
    ports: { guyane: [{ cc: 'FR', place: 'Saint-Laurent-du-Maroni' }], suriname: [{ cc: 'SR', place: 'Albina' }] } },
  // Moleson Creek → Crabwood Creek (~7 km) ; South Drain → Van Pettenpolder (~25 km)
  { key: 'guyanaCoast|suriname', source: 'https://kaieteurnewsonline.com/2026/08/29/canawaima-back-in-service-after-days-long-ban/ ; https://en.wikipedia.org/wiki/Moleson_Creek ; https://en.wikipedia.org/wiki/South_Drain,_Suriname (Moleson Creek ↔ South Drain)',
    ports: { guyanaCoast: [{ cc: 'GY', place: 'Crabwood Creek' }], suriname: [{ cc: 'SR', place: 'Van Pettenpolder' }] } },
  // Kurupukari (rive nord) → Attai Village (~50 km) ; Iwokrama (rive sud) → Surumatra (~70 km) : aucun lieu plus proche
  { key: 'guyanaCoast|southAmerica', source: 'https://592hub.com/blog/guyana-ferry-services.html (ponton de Kurupukari, route Linden–Lethem)',
    ports: { guyanaCoast: [{ cc: 'GY', place: 'Attai Village' }], southAmerica: [{ cc: 'GY', place: 'Surumatra' }] } },
  // Supenaam → Adventure (~2 km)
  { key: 'essequiboCoast|guyanaCoast', source: 'https://inewsguyana.com/parika-supenaam-online-ferry-pass-to-reduce-waiting-lines-complaints/ (Parika ↔ Supenaam)',
    ports: { essequiboCoast: [{ cc: 'GY', place: 'Adventure', near: [7.08, -58.49] }], guyanaCoast: [{ cc: 'GY', place: 'Parika' }] } },
  // Débarcadère de Leguan → Anna Maria (pointe sud de l'île, face à Parika)
  { key: 'guyanaCoast|leguan', source: GUYANA_THD + ' (Parika ↔ Leguan)',
    ports: { guyanaCoast: [{ cc: 'GY', place: 'Parika' }], leguan: [{ cc: 'GY', place: 'Anna Maria' }] } },
  // Débarcadère de Wakenaam → Noitgedacht (pointe sud de l'île)
  { key: 'guyanaCoast|wakenaam', source: GUYANA_THD + ' ; https://en.wikipedia.org/wiki/Noitgedacht (Parika ↔ Wakenaam)',
    ports: { guyanaCoast: [{ cc: 'GY', place: 'Parika' }], wakenaam: [{ cc: 'GY', place: 'Noitgedacht' }] } },
  { key: 'bartica|guyanaCoast', source: 'https://592hub.com/blog/guyana-ferry-services.html (Parika ↔ Bartica)',
    ports: { bartica: [{ cc: 'GY', place: 'Bartica' }], guyanaCoast: [{ cc: 'GY', place: 'Parika' }] } },

  { key: 'ilhabela|southAmerica', source: 'https://semil.sp.gov.br/travessias/travessias-automoveis/sao-sebastiao-ilhabela/?lang=pb (São Sebastião ↔ Ilhabela)',
    ports: { ilhabela: [{ cc: 'BR', place: 'Ilhabela' }], southAmerica: [{ cc: 'BR', place: 'São Sebastião', near: [-23.76, -45.41] }] } },
  // Icoaraci → Icoraci (graphie des données) ; Camará → Camará do Marajó
  { key: 'salvaterra|southAmerica', source: 'https://henvil.com.br/tarifas/ (Icoaraci ↔ Camará)',
    ports: { salvaterra: [{ cc: 'BR', place: 'Camará do Marajó' }], southAmerica: [{ cc: 'BR', place: 'Icoraci' }] } },
  { key: 'salvaterra|soure', source: 'https://henvil.com.br/tarifas/ (travessia Salvaterra ↔ Soure)',
    ports: { salvaterra: [{ cc: 'BR', place: 'Salvaterra' }], soure: [{ cc: 'BR', place: 'Soure' }] } },
  // Emplacement exact du bac non documenté : Camará do Marajó (rive Salvaterra) et Cachoeira do Arari (ville desservie)
  { key: 'cachoeiraDoArari|salvaterra', source: 'https://henvil.com.br/tarifas/ (travessia Camará ↔ Cachoeira do Arari)',
    ports: { cachoeiraDoArari: [{ cc: 'BR', place: 'Cachoeira do Arari' }], salvaterra: [{ cc: 'BR', place: 'Camará do Marajó' }] } },

  { key: 'canary|tenerife', source: FRED + ' (Agaete ↔ Santa Cruz de Tenerife ; Las Palmas ↔ Santa Cruz, Baleària Canarias)',
    ports: { canary: [{ cc: 'ES', place: 'Agaete' }, { cc: 'ES', place: 'Las Palmas de Gran Canaria' }], tenerife: [{ cc: 'ES', place: 'Santa Cruz de Tenerife' }] } },
  { key: 'laGomera|tenerife', source: FRED + ' (Los Cristianos ↔ San Sebastián de La Gomera)',
    ports: { laGomera: [{ cc: 'ES', place: 'San Sebastián de la Gomera' }], tenerife: [{ cc: 'ES', place: 'Los Cristianos' }] } },
  { key: 'laPalma|tenerife', source: FRED + ' (Santa Cruz de Tenerife ↔ Santa Cruz de La Palma ; Baleària Canarias aussi depuis Los Cristianos)',
    ports: { laPalma: [{ cc: 'ES', place: 'Santa Cruz de la Palma' }], tenerife: [{ cc: 'ES', place: 'Santa Cruz de Tenerife' }, { cc: 'ES', place: 'Los Cristianos' }] } },
  { key: 'elHierro|tenerife', source: 'https://armastrasmediterranea.com/en/routes-timetables ; ' + FRED + ' (Los Cristianos ↔ La Estaca)',
    ports: { elHierro: [{ cc: 'ES', place: 'Puerto de la Estaca' }], tenerife: [{ cc: 'ES', place: 'Los Cristianos' }] } },
  // Morro Jable → Morro del Jable (graphie des données)
  { key: 'canary|fuerteventura', source: FRED + ' (Las Palmas ↔ Morro Jable)',
    ports: { canary: [{ cc: 'ES', place: 'Las Palmas de Gran Canaria' }], fuerteventura: [{ cc: 'ES', place: 'Morro del Jable' }] } },
  { key: 'fuerteventura|lanzarote', source: FRED + ' (Playa Blanca ↔ Corralejo)',
    ports: { fuerteventura: [{ cc: 'ES', place: 'Corralejo' }], lanzarote: [{ cc: 'ES', place: 'Playa Blanca' }] } },
  { key: 'canary|lanzarote', source: 'https://armastrasmediterranea.com/en/routes-timetables/ferry-gran-canaria-lanzarote-arrecife (Las Palmas ↔ Arrecife)',
    ports: { canary: [{ cc: 'ES', place: 'Las Palmas de Gran Canaria' }], lanzarote: [{ cc: 'ES', place: 'Arrecife' }] } },
  { key: 'continental|tenerife', source: FRED + ' (Huelva ↔ Santa Cruz de Tenerife)',
    ports: { continental: [{ cc: 'ES', place: 'Huelva' }], tenerife: [{ cc: 'ES', place: 'Santa Cruz de Tenerife' }] } },
  { key: 'continental|lanzarote', source: 'https://armastrasmediterranea.com/en/routes-timetables/ferry-cadiz-lanzarote-arrecife (Cadix ↔ Arrecife)',
    ports: { continental: [{ cc: 'ES', place: 'Cadiz' }], lanzarote: [{ cc: 'ES', place: 'Arrecife' }] } },
  { key: 'balearic|menorca', source: 'https://www.balearia.com/es/rutas-horarios/ferry-menorca-mallorca (Alcúdia ↔ Ciutadella)',
    ports: { balearic: [{ cc: 'ES', place: 'Alcúdia' }], menorca: [{ cc: 'ES', place: 'Ciutadella' }] } },
  { key: 'balearic|ibiza', source: 'https://www.balearia.com/en/routes-timetables/ferry-mallorca-ibiza (Palma ↔ Ibiza)',
    ports: { balearic: [{ cc: 'ES', place: 'Palma' }], ibiza: [{ cc: 'ES', place: 'Ibiza' }] } },
  { key: 'formentera|ibiza', source: 'https://helpcenter.balearia.com/hc/es/articles/6995166796049-Normativa-para-viajar-en-verano-con-tu-veh%C3%ADculo-a-Formentera (Ibiza ↔ La Savina)',
    ports: { formentera: [{ cc: 'ES', place: 'La Savina' }], ibiza: [{ cc: 'ES', place: 'Ibiza' }] } },
  { key: 'continental|ibiza', source: 'https://www.balearia.com/es/rutas-horarios/regiones-baleares (Dénia ↔ Ibiza ; Barcelone et Valence ↔ Ibiza)',
    ports: { continental: [{ cc: 'ES', place: 'Denia' }, { cc: 'ES', place: 'Barcelona' }, { cc: 'ES', place: 'Valencia', near: [39.47, -0.38] }], ibiza: [{ cc: 'ES', place: 'Ibiza' }] } },
  { key: 'continental|menorca', source: 'https://www.balearia.com/es/rutas-horarios/ferry-barcelona-menorca (Barcelone ↔ Ciutadella ; Barcelone ↔ Maó)',
    ports: { continental: [{ cc: 'ES', place: 'Barcelona' }], menorca: [{ cc: 'ES', place: 'Ciutadella' }, { cc: 'ES', place: 'Maó' }] } },
  { key: 'continental|formentera', source: 'https://www.balearia.com/es/rutas-horarios/regiones-baleares (Dénia ↔ La Savina)',
    ports: { continental: [{ cc: 'ES', place: 'Denia' }], formentera: [{ cc: 'ES', place: 'La Savina' }] } },

  // Porto Santo → Vila Baleira
  { key: 'madeira|portoSanto', source: 'https://www.portosantoline.pt/media/1955/tarifas-simples-pt.pdf (Lobo Marinho, Funchal ↔ Porto Santo)',
    ports: { madeira: [{ cc: 'PT', place: 'Funchal' }], portoSanto: [{ cc: 'PT', place: 'Vila Baleira' }] } },
  { key: 'faial|pico', source: 'https://www.atlanticoline.pt/en/tarifas-outras/vehicles/ (Horta ↔ Madalena)',
    ports: { faial: [{ cc: 'PT', place: 'Horta' }], pico: [{ cc: 'PT', place: 'Madalena' }] } },
  { key: 'pico|saoJorge', source: 'https://www.atlanticoline.pt/en/tarifas-outras/vehicles/ (São Roque do Pico / Madalena ↔ Velas)',
    ports: { pico: [{ cc: 'PT', place: 'São Roque do Pico' }, { cc: 'PT', place: 'Madalena' }], saoJorge: [{ cc: 'PT', place: 'Velas' }] } },
  { key: 'saoJorge|terceira', source: 'https://www.atlanticoline.pt/en/timetable/ (Velas ↔ Praia da Vitória)',
    ports: { saoJorge: [{ cc: 'PT', place: 'Velas' }], terceira: [{ cc: 'PT', place: 'Praia da Vitória' }] } },
  // Graciosa (port de Praia) → Santa Cruz da Graciosa (chef-lieu, ~5 km)
  { key: 'graciosaAzores|terceira', source: 'https://www.atlanticoline.pt/en/timetable/ (Graciosa ↔ Praia da Vitória)',
    ports: { graciosaAzores: [{ cc: 'PT', place: 'Santa Cruz da Graciosa' }], terceira: [{ cc: 'PT', place: 'Praia da Vitória' }] } },

  { key: 'continental|elba', source: 'https://www.moby.it/rotte/traghetti-elba/piombino-portoferraio-piombino/ (Piombino ↔ Portoferraio)',
    ports: { continental: [{ cc: 'IT', place: 'Piombino', near: [42.93, 10.53] }], elba: [{ cc: 'IT', place: 'Portoferraio' }] } },
  { key: 'capraia|continental', source: 'https://www.toscana-notizie.it/-/adeguamento-tariffe-toremar-residenti-esclusi-dagli-aumenti-e-nuovi-investi (Toremar, Livourne ↔ Capraia)',
    ports: { capraia: [{ cc: 'IT', place: 'Capraia Isola' }], continental: [{ cc: 'IT', place: 'Livorno' }] } },
  { key: 'continental|giglio', source: 'https://maregiglio.it/wp-content/uploads/2025/12/TARIFFE-MAREGIGLIO_2026.pdf (Porto Santo Stefano ↔ Giglio Porto)',
    ports: { continental: [{ cc: 'IT', place: 'Porto Santo Stefano' }], giglio: [{ cc: 'IT', place: 'Giglio Porto' }] } },
  { key: 'continental|ischia', source: 'https://mobile.caremar.it/it/tariffe/ (Caremar, Pozzuoli ↔ Ischia)',
    ports: { continental: [{ cc: 'IT', place: 'Pozzuoli' }], ischia: [{ cc: 'IT', place: 'Ischia' }] } },
  { key: 'continental|ponza', source: 'https://laziomar.it/en/timetables/formia-ponza-and-vice-versa (Formia ↔ Ponza)',
    ports: { continental: [{ cc: 'IT', place: 'Formia' }], ponza: [{ cc: 'IT', place: 'Ponza' }] } },
  { key: 'sicily|vulcano', source: SIREMAR + ' (Milazzo ↔ Vulcano)',
    ports: { sicily: [{ cc: 'IT', place: 'Milazzo' }], vulcano: [{ cc: 'IT', place: 'Vulcano Porto' }] } },
  { key: 'lipari|sicily', source: SIREMAR + ' (Milazzo ↔ Lipari)',
    ports: { lipari: [{ cc: 'IT', place: 'Lipari' }], sicily: [{ cc: 'IT', place: 'Milazzo' }] } },
  { key: 'lipari|vulcano', source: SIREMAR + ' (Lipari ↔ Vulcano)',
    ports: { lipari: [{ cc: 'IT', place: 'Lipari' }], vulcano: [{ cc: 'IT', place: 'Vulcano Porto' }] } },
  { key: 'lipari|salina', source: SIREMAR + ' (Lipari ↔ Santa Marina Salina)',
    ports: { lipari: [{ cc: 'IT', place: 'Lipari' }], salina: [{ cc: 'IT', place: 'Santa Marina Salina' }] } },
  { key: 'filicudi|salina', source: SIREMAR + ' (Rinella ↔ Filicudi)',
    ports: { filicudi: [{ cc: 'IT', place: 'Filicudi Porto' }], salina: [{ cc: 'IT', place: 'Rinella' }] } },
  { key: 'favignana|sicily', source: SIREMAR + ' (Trapani ↔ Favignana)',
    ports: { favignana: [{ cc: 'IT', place: 'Favignana' }], sicily: [{ cc: 'IT', place: 'Trapani' }] } },
  { key: 'levanzo|sicily', source: SIREMAR + ' (Trapani ↔ Levanzo)',
    ports: { levanzo: [{ cc: 'IT', place: 'Levanzo' }], sicily: [{ cc: 'IT', place: 'Trapani' }] } },
  { key: 'laMaddalena|sardinia', source: 'https://delcomar.it/wp-content/uploads/2023/12/TARIFFE-in-vigore-dal-01-01-2024-La-Maddalena-Palau.pdf (Palau ↔ La Maddalena)',
    ports: { laMaddalena: [{ cc: 'IT', place: 'La Maddalena' }], sardinia: [{ cc: 'IT', place: 'Palau' }] } },
  // Portovesme → Portoscuso (commune du port)
  { key: 'sanPietro|sardinia', source: 'https://delcomar.it/wp-content/uploads/2023/12/TARIFFE-in-vigore-dal-01-01-2024-Carloforte-Portovesme.pdf (Portovesme ↔ Carloforte)',
    ports: { sanPietro: [{ cc: 'IT', place: 'Carloforte' }], sardinia: [{ cc: 'IT', place: 'Portoscuso' }] } },
  // Tronchetto → Venezia
  { key: 'continental|lidoVenezia', source: 'https://actv.avmspa.it/it/content/ferry-boat-tariffe (ligne 17, Tronchetto ↔ Lido)',
    ports: { continental: [{ cc: 'IT', place: 'Venezia', near: [45.44, 12.33] }], lidoVenezia: [{ cc: 'IT', place: 'Lido' }] } },
  { key: 'lidoVenezia|pellestrina', source: 'https://actv.avmspa.it/it/content/ferry-boat-tariffe (ligne 11, Alberoni ↔ Santa Maria del Mare)',
    ports: { lidoVenezia: [{ cc: 'IT', place: 'Alberoni' }], pellestrina: [{ cc: 'IT', place: 'Santa Maria del Mare' }] } },

  { key: 'continental|samui', source: 'https://www.rajaferryport.com/fare (Don Sak ↔ Ko Samui/Lipa Noi)',
    ports: { continental: [{ cc: 'TH', place: 'Don Sak' }], samui: [{ cc: 'TH', place: 'Lipa Noi' }] } },
  // Thong Sala → Ban Thong Sala
  { key: 'continental|phangan', source: 'https://www.rajaferryport.com/fare (Don Sak ↔ Ko Pha Ngan/Thong Sala)',
    ports: { continental: [{ cc: 'TH', place: 'Don Sak' }], phangan: [{ cc: 'TH', place: 'Ban Thong Sala' }] } },
  { key: 'continental|kohPhaluai', source: 'https://www.rajaferryport.com/fare?route=Donsak-Phaluai ; https://www.rajaferryport.com/sailing-schedule?route=sailing-schedule-koh-Phaluai (Don Sak ↔ Ko Phaluai)',
    ports: { continental: [{ cc: 'TH', place: 'Don Sak' }], kohPhaluai: [{ cc: 'TH', place: 'Ban Ko Phaluai' }] } },
  // Nilambur (Baratang) → Kanchangarh (~5 km) ; Middle Strait (Andaman du Sud) → Wrightmyo (~40 km) : aucun lieu plus proche
  { key: 'middleNorthAndaman|southAndaman', source: 'https://dss.andamannicobar.gov.in/docs/press/DSS_Passenger_Fares_2026-27.pdf (annexe 8, Middle Strait ↔ Nilambur)',
    ports: { middleNorthAndaman: [{ cc: 'IN', place: 'Kanchangarh' }], southAndaman: [{ cc: 'IN', place: 'Wrightmyo' }] } },
  // Terminal de Krambatangi → Tvøroyri
  { key: 'faroe|suduroy', source: 'https://www.ssl.fo/en/prices/prices-ferries (Strandfaraskip Landsins, ligne 7 Tórshavn ↔ Tvøroyri/Krambatangi)',
    ports: { faroe: [{ cc: 'FO', place: 'Tórshavn' }], suduroy: [{ cc: 'FO', place: 'Tvøroyri' }] } },
  { key: 'bozcaada|continental', source: 'https://www.feribotseferleri.com.tr/en/geyikli-bozcaada ; https://gdu.com.tr/sefer-tarifeleri (GESTAŞ, Geyikli ↔ Bozcaada)',
    ports: { bozcaada: [{ cc: 'TR', place: 'Bozcaada' }], continental: [{ cc: 'TR', place: 'Geyikli', near: [39.80, 26.21] }] } },
  // Port de Kuzu Limanı → Gökçeada (chef-lieu)
  { key: 'continental|gokceada', source: 'https://gdu.com.tr/sefer-tarifeleri ; https://www.gokceada.bel.tr/feribot-saatleri/ (GESTAŞ, Kabatepe ↔ Gökçeada)',
    ports: { continental: [{ cc: 'TR', place: 'Kabatepe Limani' }], gokceada: [{ cc: 'TR', place: 'Gökçeada' }] } },

  { key: 'santoAntao|saoVicente', source: INTERILHAS + ' (CV Interilhas, Porto Novo ↔ Mindelo)',
    ports: { santoAntao: [{ cc: 'CV', place: 'Porto Novo' }], saoVicente: [{ cc: 'CV', place: 'Mindelo' }] } },
  { key: 'saoNicolau|saoVicente', source: INTERILHAS + ' (CV Interilhas, Mindelo ↔ Tarrafal de São Nicolau)',
    ports: { saoNicolau: [{ cc: 'CV', place: 'Tarrafal de São Nicolau' }], saoVicente: [{ cc: 'CV', place: 'Mindelo' }] } },
  { key: 'sal|saoNicolau', source: INTERILHAS + ' (CV Interilhas, Tarrafal de São Nicolau ↔ Palmeira)',
    ports: { sal: [{ cc: 'CV', place: 'Palmeira' }], saoNicolau: [{ cc: 'CV', place: 'Tarrafal de São Nicolau' }] } },
  { key: 'boaVista|sal', source: INTERILHAS + ' (CV Interilhas, Palmeira ↔ Sal Rei)',
    ports: { boaVista: [{ cc: 'CV', place: 'Sal Rei' }], sal: [{ cc: 'CV', place: 'Palmeira' }] } },
  { key: 'boaVista|santiago', source: INTERILHAS + ' (CV Interilhas, Sal Rei ↔ Praia)',
    ports: { boaVista: [{ cc: 'CV', place: 'Sal Rei' }], santiago: [{ cc: 'CV', place: 'Praia' }] } },
  // Porto Inglês → Vila do Maio
  { key: 'maio|santiago', source: INTERILHAS + ' (CV Interilhas, Praia ↔ Porto Inglês/Vila do Maio)',
    ports: { maio: [{ cc: 'CV', place: 'Vila do Maio' }], santiago: [{ cc: 'CV', place: 'Praia' }] } },
  { key: 'continental|sakhalin', source: 'https://www.sasco.ru/service/ferry/ (SASCO, Vanino ↔ Kholmsk)',
    ports: { continental: [{ cc: 'RU', place: 'Vanino', near: [49.09, 140.25] }], sakhalin: [{ cc: 'RU', place: 'Kholmsk' }] } },
  // Port de Vale de Cavaleiros → São Filipe (~3 km)
  { key: 'fogo|santiago', source: INTERILHAS + ' ; https://en.wikipedia.org/wiki/Vale_de_Cavaleiros (CV Interilhas, Praia ↔ Vale de Cavaleiros/São Filipe)',
    ports: { fogo: [{ cc: 'CV', place: 'São Filipe' }], santiago: [{ cc: 'CV', place: 'Praia' }] } },
  { key: 'brava|fogo', source: INTERILHAS + ' ; https://en.wikipedia.org/wiki/Vale_de_Cavaleiros (CV Interilhas, Vale de Cavaleiros/São Filipe ↔ Furna)',
    ports: { brava: [{ cc: 'CV', place: 'Furna' }], fogo: [{ cc: 'CV', place: 'São Filipe' }] } },

  { key: 'continental|wadden-texel', source: 'https://www.teso.nl (TESO, Den Helder ↔ Texel/\'t Horntje)',
    ports: { continental: [{ cc: 'NL', place: 'Den Helder' }], 'wadden-texel': [{ cc: 'NL', place: 't Horntje' }] } },
  { key: 'continental|wadden-vlieland', source: 'https://www.rederij-doeksen.nl (Rederij Doeksen, Harlingen ↔ Vlieland)',
    ports: { continental: [{ cc: 'NL', place: 'Harlingen' }], 'wadden-vlieland': [{ cc: 'NL', place: 'Oost-Vlieland' }] } },
  { key: 'continental|wadden-terschelling', source: 'https://www.rederij-doeksen.nl (Rederij Doeksen, Harlingen ↔ West-Terschelling)',
    ports: { continental: [{ cc: 'NL', place: 'Harlingen' }], 'wadden-terschelling': [{ cc: 'NL', place: 'West-Terschelling' }] } },
  // Holwerd → Holwert (nom frison des données)
  { key: 'continental|wadden-ameland', source: 'https://www.wpd.nl (Wagenborg Passagiersdiensten, Holwerd ↔ Nes/Ameland)',
    ports: { continental: [{ cc: 'NL', place: 'Holwert' }], 'wadden-ameland': [{ cc: 'NL', place: 'Nes' }] } },
  { key: 'continental|wadden-schiermonnikoog', source: 'https://www.wpd.nl (Wagenborg Passagiersdiensten, Lauwersoog ↔ Schiermonnikoog)',
    ports: { continental: [{ cc: 'NL', place: 'Lauwersoog' }], 'wadden-schiermonnikoog': [{ cc: 'NL', place: 'Schiermonnikoog' }] } },

  { key: 'RU|RU-KGD', source: 'https://obl.ru/services/sea/parom/ (Oboronlogistika, Oust-Louga ↔ Baltiïsk)',
    ports: { RU: [{ cc: 'RU', place: 'Ust’-Luga' }], 'RU-KGD': [{ cc: 'RU', place: 'Baltiysk' }] } },
  { key: 'ES|ES-CE', source: 'https://www.balearia.com/es/rutas-horarios/ferry-algeciras-ceuta (Algeciras ↔ Ceuta)',
    ports: { ES: [{ cc: 'ES', place: 'Algeciras' }], 'ES-CE': [{ cc: 'ES', place: 'Ceuta' }] } },
  { key: 'ES|ES-ML', source: 'https://www.balearia.com/es/rutas-horarios/regiones-melilla ; https://www.balearia.com/es/rutas-horarios/ferry-malaga-melilla ; https://www.balearia.com/es/rutas-horarios/ferry-melilla-almeria ; https://www.balearia.com/es/rutas-horarios/ferry-melilla-motril (Málaga, Almería, Motril ↔ Melilla)',
    ports: { ES: [{ cc: 'ES', place: 'Málaga' }, { cc: 'ES', place: 'Almería' }, { cc: 'ES', place: 'Motril' }], 'ES-ML': [{ cc: 'ES', place: 'Melilla' }] } }
];
