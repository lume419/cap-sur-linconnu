// Groupe « sud » (Amérique du Sud) : CO, VE, GY, SR, EC, PE, BO, BR, PY, UY, AR, CL, FK, GS + Guyane française (FR).
// Recherches et vérification contre public/data/communes-xx.txt : 16 septembre 2026.
// Boîtes : [latMin, latMax, lonMin, lonMax]. Règles évaluées dans l'ordre ; la première qui correspond donne la masse.
// Taux InforEuro septembre 2026 (1 EUR =) : BRL 6.0126, CLP 1078.60752, GBP/FKP 0.8572, USD 1.1643, GYD 243.79, SRD 44.0117.
//
// Constat structurant : le « bloc des Guyanes » N'EST PAS relié par la route au reste du continent.
//  - L'Amapá (Macapá, Oiapoque) n'a aucune route vers le reste du Brésil (Amazone sans pont) ; le pont de l'Oyapock
//    le relie à la Guyane française → Amapá + Guyane = masse `guyane` (clé existante du moteur), PAS `southAmerica`.
//  - Suriname : relié à la Guyane française seulement par le bac Albina ↔ Saint-Laurent, au Guyana seulement par le
//    bac Canawaima → masse `suriname`.
//  - Guyana côtier (Georgetown, Berbice, Linden) : relié au Brésil (Lethem–Bonfim) seulement via le ponton de
//    Kurupukari sur l'Essequibo (pont annoncé, pas construit en 2026) → masse `guyanaCoast`.
//  - Roraima, Manaus (BR-174 → Venezuela → Colombie) et la savane du Rupununi (Lethem) sont bien `southAmerica`.
const B = (key, box, note) => (note ? { key, match: { box }, note } : { key, match: { box } });
const R = (key, regions, note) => (note ? { key, match: { regions }, note } : { key, match: { regions } });
const N = (key, near, note) => (note ? { key, match: { near }, note } : { key, match: { near } });
const p = (name, lat, lon, km) => ({ name, lat, lon, km });

module.exports = {
  landmass: {
    // ============================ COLOMBIE ============================
    CO: {
      default: 'southAmerica',
      rules: [
        B('sanAndres', [[12.45, 12.65, -81.76, -81.65]], 'Île de San Andrés (aucun ferry véhicules depuis le continent, ~700 km)'),
        B('providencia', [[13.30, 13.42, -81.41, -81.33]], "Providencia (Santa Catalina n'a pas de lieu propre ; passerelle piétonne seulement)"),
        N('leticiaTabatinga', [p('Leticia', -4.2108, -69.9394, 12)],
          'Leticia : aucune route vers le reste de la Colombie ; agglomération continue avec Tabatinga (Brésil), même masse partagée'),
        R('*', ['Amazonas Department', 'Vaupés', 'Guainía Department'],
          "Amazonas (Puerto Nariño, Tarapacá, La Pedrera, La Chorrera…), Vaupés (Mitú) et Guainía (Inírida) : aucune route vers l'intérieur du pays"),
        B('*', [[-1.0, -0.05, -75.3, -73.0]], 'Bas Putumayo/Caquetá (Puerto Leguízamo, Tres Esquinas…) : accès fluvial seulement'),
        B('*', [[1.0, 2.6, -72.3, -69.5]], 'Guaviare oriental (Miraflores, Barranquillita) : sans route'),
        // Côte pacifique
        N('*', [p('Gorgona', 2.97, -78.18, 5)], 'Île Gorgona'),
        B('*', [[2.1, 3.4, -78.6, -77.25]], 'Côte pacifique du Cauca et du nord du Nariño (Guapi, Timbiquí, López de Micay, El Charco, La Tola, Mosquera, Iscuandé) : sans route'),
        N('*', [p('Salahonda', 2.0406, -78.6588, 12), p('Magüí Payán', 1.7665, -78.1833, 6), p('Roberto Payán', 1.6966, -78.2448, 6)],
          'Francisco Pizarro (Salahonda), Magüí et Roberto Payán : accès fluvial (Barbacoas, Tumaco restent reliés)'),
        B('*', [[3.0, 3.8, -77.65, -77.1]], 'Rivières au sud de Buenaventura (Naya, Yurumanguí, Cajambre, Raposo, Mayorquín) : accès par mer/fleuve seulement'),
        B('*', [[3.88, 4.0, -77.45, -77.28]], 'Juanchaco, Ladrilleros, La Barra (Bahía Málaga) : sans route'),
        // Chocó : seul l'axe Quibdó–Istmina–Tadó–Condoto et quelques antennes ont des routes
        B('southAmerica', [[4.85, 5.95, -76.80, -76.15]], 'Chocó central relié (Quibdó–Medellín, Quibdó–Pereira : Istmina, Tadó, Condoto, Nóvita, Cértegui, Lloró, Bagadó)'),
        N('southAmerica', [p('El Carmen de Atrato', 5.8878, -75.1642, 15), p('San José del Palmar', 4.8957, -76.2344, 10)], 'Chocó relié à Medellín / Cartago'),
        B('southAmerica', [[7.1, 7.6, -76.85, -76.55]], 'Chocó de l\'Urabá (Belén de Bajirá, Carmen del Darién) relié par Mutatá'),
        R('*', ['Chocó'], "Reste du Chocó : Bahía Solano, Nuquí, Juradó, Pizarro, Docordó, Riosucio, Bojayá, Unguía, Acandí, Capurganá — aucune route vers l'intérieur"),
        N('*', [p('Vigía del Fuerte', 6.5893, -76.896, 8), p('Murindó', 6.9806, -76.8212, 8)], 'Antioquia sur l\'Atrato, sans route'),
        // Îles de la Caraïbe colombienne
        B('*', [[10.315, 10.385, -75.61, -75.54]], "Tierra Bomba (Bocachica, Caño del Oro, Punta Arena) : pas de pont (Barú, reliée par le pont de Pasacaballos, reste continentale)"),
        B('*', [[10.14, 10.20, -75.83, -75.70]], 'Îles du Rosario'),
        B('*', [[9.70, 9.82, -75.93, -75.80]], 'Archipel de San Bernardo (Santa Cruz del Islote, Múcura, Tintipán)'),
        N('*', [p('Isla Fuerte', 9.39, -76.18, 3)], 'Isla Fuerte'),
        N('*', [p('Nueva Venecia', 10.8289, -74.575, 2), p('Buenavista', 10.842, -74.5088, 2)], 'Villages sur pilotis de la Ciénaga Grande de Santa Marta'),
      ]
    },

    // ============================ VENEZUELA ============================
    VE: {
      default: 'southAmerica',
      rules: [
        B('*', [[10.78, 10.84, -64.25, -64.14]], 'Cubagua'),
        B('coche', [[10.72, 10.83, -64.06, -63.84]], 'Isla de Coche (San Pedro de Coche, El Guamache, Güinima…)'),
        R('margarita', ['Nueva Esparta'], 'Isla Margarita (Macanao reliée par la route de La Restinga)'),
        R('*', ['Dependencias Federales'], 'Los Roques, La Tortuga'),
        B('*', [[-1.0, 5.25, -68.0, -62.0]], "Amazonas au sud de Puerto Ayacucho/Samariapo (San Fernando de Atabapo, San Carlos de Río Negro, La Esmeralda) et haut Caura/Paragua : sans route"),
        N('*', [p('Canaima', 6.24, -62.85, 15), p('Kamarata', 5.72, -62.33, 10), p('Urimán', 5.35, -62.72, 10)], 'Gran Sabana occidentale : accès aérien/fluvial'),
        B('*', [[8.3, 9.9, -62.0, -60.0]], "Delta Amacuro à l'est de Tucupita (Pedernales, Curiapo, villages warao) : accès fluvial"),
        N('*', [p('Isla de Toas', 10.955, -71.633, 3), p('Isla de San Carlos', 10.9861, -71.6122, 2)], 'Isla de Toas et Isla de San Carlos (golfe de Maracaibo) : pas de pont'),
      ]
    },

    // ============================ GUYANA ============================
    GY: {
      default: 'guyanaCoast',
      rules: [
        B('wakenaam', [[6.93, 7.08, -58.52, -58.425]], "Wakenaam (embouchure de l'Essequibo)"),
        B('leguan', [[6.885, 6.99, -58.455, -58.36]], 'Leguan'),
        B('*', [[6.86, 6.93, -58.56, -58.46]], 'Hog Island et îlots de l\'Essequibo'),
        B('essequiboCoast', [[7.07, 7.55, -58.70, -58.455]], "Côte d'Essequibo (Supenaam → Anna Regina → Charity) : aucun pont sur l'Essequibo"),
        N('bartica', [p('Bartica', 6.4054, -58.6233, 12), p('Mahdia', 5.2847, -59.1498, 15)],
          'Bartica et Mahdia (route Bartica–Potaro) : rive ouest de l\'Essequibo, sans pont'),
        B('southAmerica', [[1.8, 4.3, -60.2, -58.4]], 'Rupununi (Lethem, Annai, Aishalton) : relié au Brésil par le pont Lethem–Bonfim (Takutu)'),
        R('*', ['Upper Takutu-Upper Essequibo', 'Potaro-Siparuni', 'Cuyuni-Mazaruni', 'Barima-Waini'],
          'Intérieur sans route vers la côte (Mabaruma, Port Kaituma, Kamarang, Paramakatoi, villages wai-wai du sud…)'),
        B('*', [[6.0, 6.86, -58.65, -58.47]], "Villages riverains de l'Essequibo en amont de Parika (îles et rive ouest)"),
      ]
    },

    // ============================ SURINAME ============================
    SR: {
      default: 'suriname',
      rules: [
        N('suriname', [p('Pokigron / Atjoni', 4.4923, -55.3697, 10)], 'Fin de la route du fleuve Suriname (Atjoni)'),
        B('*', [[-90, 4.9, -180, 180]], 'Intérieur (Sipaliwini, haut Suriname, Tapanahony, Lawa…) : accès fluvial/aérien'),
        B('*', [[4.9, 5.36, -54.5, -54.2]], 'Villages du Marowijne en amont d\'Albina (Langatabbetje, Gonoe…)'),
        R('*', ['Sipaliwini District'], 'Reste du Sipaliwini (Apoera, Washabo, Kaaimanston…) : pas de route vérifiée'),
      ]
    },

    // ============================ ÉQUATEUR ============================
    EC: {
      default: 'southAmerica',
      rules: [
        B('santaCruzGalapagos', [[-0.80, -0.45, -90.55, -90.15]], 'Santa Cruz (Puerto Ayora, Bellavista, Santa Rosa) — Baltra séparée, sans lieu'),
        B('sanCristobalGalapagos', [[-0.97, -0.85, -89.65, -89.40]], 'San Cristóbal (Puerto Baquerizo Moreno, El Progreso)'),
        B('isabelaGalapagos', [[-1.0, -0.80, -91.10, -90.90]], 'Isabela (Puerto Villamil, Tomás de Berlanga)'),
        B('floreana', [[-1.40, -1.20, -90.55, -90.35]], 'Floreana (Puerto Velasco Ibarra)'),
        R('*', ['Galápagos'], 'Autres lieux des Galápagos'),
        B('*', [[-2.98, -2.72, -80.28, -79.88], [-2.72, -2.60, -80.05, -79.88]], 'Isla Puná et îles de mangrove du golfe de Guayaquil (aucun bac véhicules)'),
        B('*', [[-3.42, -3.32, -80.33, -80.10]], 'Archipel de Jambelí'),
        B('*', [[-3.0, -0.8, -77.55, -75.0]], 'Pastaza oriental (Sarayaku, Montalvo, Curaray…) et Morona au-delà de Taisha : sans route'),
        B('*', [[-1.0, -0.3, -75.7, -75.0]], 'Bas Napo (Nuevo Rocafuerte, Tiputini) : accès fluvial'),
      ]
    },

    // ============================ PÉROU ============================
    PE: {
      default: 'southAmerica',
      rules: [
        N('*', [p('Taquile', -15.7667, -69.6833, 3), p('Amantaní', -15.6572, -69.7182, 3)], 'Îles du Titicaca (Taquile, Amantaní)'),
        B('iquitos', [[-3.95, -3.55, -73.45, -73.10], [-4.55, -3.95, -73.65, -73.25]], "Iquitos et la route Iquitos–Nauta : non reliées au reste du pays"),
        N('southAmerica', [p('Yurimaguas', -5.9018, -76.1223, 20)], 'Yurimaguas : route vers Tarapoto'),
        R('*', ['Loreto'], 'Reste du Loreto (Requena, Contamana, Caballococha, Lagunas, Estrecho…) : fleuve seulement'),
        B('southAmerica', [[-9.3, -8.0, -75.9, -74.3]], 'Pucallpa et la route Federico Basadre (Aguaytía, Campo Verde, Nueva Requena)'),
        N('southAmerica', [p('Atalaya', -10.7307, -73.7587, 15), p('Oventeni', -10.7514, -74.22, 15)], 'Atalaya (route Puerto Ocopa–Atalaya) et Gran Pajonal'),
        R('*', ['Ucayali'], 'Reste de l\'Ucayali (Purús/Puerto Esperanza, Sepahua, Tahuanía…) : sans route'),
        B('*', [[-12.3, -11.0, -73.3, -72.3]], 'Bas Urubamba (Camisea, Kirigueti, Nuevo Mundo) : sans route'),
      ]
    },

    // ============================ BOLIVIE ============================
    BO: {
      default: 'southAmerica',
      rules: [
        B('*', [[-16.06, -15.97, -69.23, -69.135]], 'Isla del Sol (Yumani, Challapampa, Challa)'),
        N('*', [p('Suriqui', -16.3122, -68.7618, 2)], 'Isla Suriqui'),
      ]
    },

    // ============================ BRÉSIL ============================
    BR: {
      default: 'southAmerica',
      rules: [
        B('fernandoDeNoronha', [[-3.9, -3.8, -32.5, -32.35]], 'Fernando de Noronha (pas de ferry véhicules de visiteurs)'),
        B('ilhabela', [[-23.97, -23.72, -45.385, -45.20]], 'Ilhabela (île de São Sebastião)'),
        B('*', [[-23.25, -23.08, -44.40, -44.08]], 'Ilha Grande (sans voitures)'),
        B('*', [[-13.66, -13.36, -39.06, -38.85]], 'Tinharé, Boipeba, Cairu (Morro de São Paulo, Gamboa…) : pas de pont'),
        N('*', [p('Ilha dos Frades', -12.79, -38.63, 3), p('Ilha de Maré', -12.77, -38.525, 3)], 'Îles de la baie de Tous-les-Saints sans pont (Itaparica, reliée au continent par la Ponte do Funil, reste continentale)'),
        B('*', [[-25.60, -25.44, -48.38, -48.28]], 'Ilha do Mel, Ilha das Peças'),
        N('*', [p('Algodoal', -0.5888, -47.5748, 3)], 'Algodoal (sans voitures)'),
        // ---- Amapá : relié à la Guyane française (pont de l'Oyapock), pas au reste du Brésil ----
        R('guyane', ['Amapá'], "Amapá : BR-156/BR-210 reliés à la Guyane française par le pont de l'Oyapock ; aucune route vers le Pará"),
        // ---- Marajó ----
        B('soure', [[-0.735, -0.55, -48.75, -48.45]], 'Soure (rive nord du rio Paracauari)'),
        B('salvaterra', [[-1.0, -0.735, -48.75, -48.40]], 'Salvaterra, Joanes, port de Camará'),
        N('cachoeiraDoArari', [p('Cachoeira do Arari', -1.0114, -48.9633, 12)], 'Cachoeira do Arari (bac Henvil depuis le côté Salvaterra)'),
        N('southAmerica', [p('Abaetetuba', -1.7181, -48.8825, 10), p('Igarapé-Miri', -1.975, -48.9597, 8)], 'Abaetetuba et Igarapé-Miri (Alça Viária, PA-151)'),
        B('*', [[-1.2, 0.35, -51.1, -48.55], [-2.0, -1.2, -51.1, -48.8]],
          'Archipel de Marajó et rive sud sans route : Breves, Afuá, Chaves, Anajás, Ponta de Pedras, Santa Cruz do Arari, Muaná, Curralinho, São Sebastião da Boa Vista, Melgaço, Portel, Bagre, Limoeiro do Ajuru'),
        N('*', [p('Gurupá', -1.405, -51.64, 15), p('Porto de Moz', -1.7464, -52.2383, 15), p('Almeirim', -1.5233, -52.5817, 15),
          p('Monte Dourado', -0.87, -52.53, 10), p('Juruti', -2.1522, -56.0922, 15), p('Faro', -2.1714, -56.745, 12), p('Terra Santa', -2.1042, -56.4869, 12)],
          'Villes du bas Amazone sans route'),
        N('calhaNorte', [p('Prainha', -1.80, -53.48, 20), p('Monte Alegre', -2.0008, -54.081, 20), p('Alenquer', -1.9417, -54.7383, 20),
          p('Curuá', -1.8881, -55.1167, 15), p('Óbidos', -1.9175, -55.5181, 20), p('Oriximiná', -1.7656, -55.8661, 20)],
          "Calha Norte (rive gauche de l'Amazone) : PA-254/PA-439 relient Prainha–Monte Alegre–Alenquer–Óbidos–Oriximiná, sans pont vers Santarém"),
        // ---- Amazonas : réseau relié (BR-174 → Roraima/Venezuela ; BR-319 → Porto Velho ; BR-230 ; BR-317) ----
        N('southAmerica', [
          p('Manaus', -3.1019, -60.025, 35), p('Manacapuru', -3.2997, -60.6206, 20), p('Novo Airão', -2.6214, -60.9442, 15),
          p('Presidente Figueiredo', -2.0344, -60.025, 25), p('BR-174 Balbina', -1.45, -60.10, 30), p('BR-174 nord', -0.95, -60.40, 30),
          p('Rio Preto da Eva', -2.698, -59.7017, 20), p('Itacoatiara', -3.1431, -58.4442, 25), p('Silves', -2.8389, -58.2092, 10), p('Itapiranga', -2.7489, -58.0219, 10),
          p('Careiro da Várzea', -3.197, -59.8267, 20), p('Autazes', -3.5797, -59.1306, 20), p('Careiro', -3.7681, -60.3692, 20), p('Manaquiri', -3.4281, -60.4594, 20),
          p('BR-319 a', -4.3, -60.6, 25), p('BR-319 b', -4.9, -61.3, 25), p('BR-319 c', -5.5, -62.0, 25), p('BR-319 d', -6.1, -62.5, 25), p('BR-319 e', -6.8, -62.9, 25),
          p('Humaitá', -7.5165, -63.0311, 25), p('BR-230 a', -7.4, -62.2, 25), p('BR-230 b', -7.3, -61.3, 25), p('Apuí', -7.1972, -59.8914, 25),
          p('BR-230 Lábrea', -7.4, -64.0, 25), p('Lábrea', -7.2644, -64.7964, 20), p('Boca do Acre', -8.7522, -67.3978, 20), p('Guajará', -7.5458, -72.5836, 15)],
          'Amazonas relié par la route'),
        N('benjaminConstant', [p('Benjamin Constant', -4.3755, -70.0318, 10), p('Atalaia do Norte', -4.3665, -70.1919, 8)], 'Benjamin Constant – Atalaia do Norte (route locale, isolées du reste)'),
        N('leticiaTabatinga', [p('Tabatinga', -4.2312, -69.9386, 10)], 'Tabatinga : agglomération continue avec Leticia (Colombie)'),
        R('*', ['Amazonas'], "Reste de l'Amazonas (Parintins, Tefé, Coari, Maués, Manicoré, Borba, São Gabriel da Cachoeira, Eirunepé, Barcelos…) : fleuve seulement"),
        N('*', [p('Marechal Thaumaturgo', -8.9411, -72.7917, 15), p('Porto Walter', -8.2686, -72.7439, 15), p('Jordão', -9.4342, -71.8839, 15), p('Santa Rosa do Purus', -9.44, -70.49, 15)],
          'Acre : communes sans route'),
        B('*', [[0.0, 5.3, -64.9, -62.3]], 'Terre indigène yanomami (ouest du Roraima) : sans route'),
      ]
    },

    // ============================ PARAGUAY / URUGUAY ============================
    PY: { default: 'southAmerica', rules: [] },
    UY: { default: 'southAmerica', rules: [] },

    // ============================ ARGENTINE ============================
    AR: {
      default: 'southAmerica',
      rules: [
        B('*', [[-90, -56, -180, 180]], 'Bases antarctiques (y compris Orcadas) rangées dans la province de Terre de Feu'),
        R('tierraDelFuego', ['Tierra del Fuego'], 'Isla Grande de Tierra del Fuego, partie argentine (Ushuaia, Río Grande, Tolhuin)'),
        N('*', [p('Martín García', -34.1872, -58.2531, 4)], 'Isla Martín García (bateaux passagers seulement)'),
        B('*', [[-34.39, -34.14, -58.66, -58.40], [-34.30, -34.00, -58.85, -58.66], [-34.14, -33.95, -58.66, -58.40]],
          'Îles du delta du Paraná (Tigre, San Fernando, Campana, Islas del Ibicuy) sans route'),
        N('*', [p('Isla El Espinillo', -32.9166, -60.6534, 2), p('Isla El Pillo', -32.7675, -60.1117, 2), p('Isla Apipé Chico', -27.5722, -56.711, 1.5), p('San Antonio de Apipé', -27.51, -56.7398, 1.5)], 'Îles fluviales sans pont (Apipé : bac passagers/véhicules non documenté)'),
      ]
    },

    // ============================ CHILI ============================
    CL: {
      default: 'southAmerica',
      rules: [
        B('rapaNui', [[-27.25, -27.0, -109.5, -109.2]], 'Île de Pâques'),
        B('quinchao', [[-42.62, -42.40, -73.62, -73.25]], 'Isla Quinchao (Achao, Curaco de Vélez)'),
        N('lemuy', [p('Puqueldón', -42.6, -73.6746, 6)], 'Isla Lemuy (Puqueldón)'),
        B('chiloe', [[-43.5, -41.75, -74.5, -73.35]], 'Grande Île de Chiloé (Ancud, Castro, Dalcahue, Chonchi, Quellón, Quemchi, Queilén) ; Caicaén/Calbuco reliées au continent par pedraplén'),
        N('*', [p('Puluqui', -41.8302, -73.0122, 4), p('Llaicha', -41.8447, -73.0406, 2), p('Chidguapi', -41.8349, -73.0909, 1.5)], 'Îles Puluqui et Chidhuapi (Calbuco) sans pont'),
        B('hualaihue', [[-42.1, -41.72, -72.80, -72.40]], "Hualaihué (Contao, Hornopirén) : séparé de Puerto Montt par l'estuaire (bac La Arena–Puelche)"),
        B('villaOHiggins', [[-49.0, -47.93, -73.30, -72.30]], "Villa O'Higgins et Río Bravo : au sud du fjord Mitchell (bac Puerto Yungay–Río Bravo)"),
        N('*', [p('Quitralco', -45.7601, -73.4485, 5), p('Puerto Herradura', -45.6999, -73.3617, 5), p('Puerto Americano', -45.0234, -73.6958, 5)], 'Fjords d\'Aysén sans route'),
        N('tierraDelFuego', [p('Porvenir', -53.2960, -70.3663, 30), p('Timaukel', -53.7257, -69.9926, 30), p('Cámeron', -53.6399, -69.6469, 10), p('Clarencia', -52.9197, -70.0479, 15)],
          'Terre de Feu chilienne (Porvenir, Timaukel/Cameron, Primavera)'),
        N('navarino', [p('Puerto Williams', -54.9335, -67.6096, 20)], 'Isla Navarino'),
        N('*', [p('Kanasaka', -54.9409, -68.5662, 5)], 'Kanasaka (canal Beagle, île Hoste)'),
      ]
    },

    // ============================ MALOUINES / GÉORGIE DU SUD ============================
    FK: {
      default: 'eastFalkland',
      rules: [
        N('*', [p('Pebble Island', -51.3182, -59.6039, 5), p('Keppel', -51.3312, -59.9433, 5), p('Saunders', -51.3659, -60.0873, 4),
          p('Carcass', -51.2909, -60.557, 4), p('Westpoint', -51.3488, -60.6868, 3), p('New Island', -51.7256, -61.2988, 4),
          p('Weddell', -51.8923, -60.9049, 5), p('Beaver', -51.8532, -61.2538, 3), p('Speedwell', -52.2207, -59.6882, 5), p('Lively', -51.9941, -58.4566, 4)],
          'Îles au large sans liaison véhicules régulière'),
        B('westFalkland', [[-52.5, -51.0, -61.5, -59.45]], 'Falkland occidental (Port Howard, Fox Bay, Hill Cove, Chartres, Roy Cove, Port Stephens…)'),
      ]
    },
    GS: {
      default: '*',
      rules: [ N('southGeorgia', [p('King Edward Point', -54.283, -36.494, 3)], 'King Edward Point et Grytviken (Bird Island reste isolée)') ]
    },
  },

  // Guyane française : communes de l'intérieur sans route isolées, le reste rejoint la masse `guyane` (avec l'Amapá).
  landmassRules: {
    FR: [
      { key: '*', match: { cpPrefix: ['97314', '97330', '97340', '97312', '97380'] },
        note: "Guyane : Saül, Camopi, Grand-Santi, Saint-Élie, Ouanary — aucune route (fleuve/avion)" },
      { key: 'maripasoulaPapaichton', match: { cpPrefix: ['97370', '97316'] },
        note: 'Maripasoula et Papaïchton : reliées entre elles par piste, pas au littoral' },
      { key: 'guyane', match: { cpPrefix: ['973'] },
        note: "Littoral guyanais (RN1/RN2, Apatou par la route de 2010) : relié à l'Amapá par le pont de l'Oyapock — PAS au reste de l'Amérique du Sud (Amapá sans route vers le Pará)" },
    ]
  },

  ferries: [
    // ---------------- Chili ----------------
    { a: 'southAmerica', b: 'chiloe', routeKey: 'parguaChacao', name: 'Pargua ↔ Chacao',
      operator: 'Transmarchilay (aussi Naviera Cruz del Sur)', durationH: 0.5, distanceKm: 4,
      priceByClass: { 1: 19.01, 2: 42.65, 5: 13.91, foot: null },
      source: 'https://www.transmarchilay.cl/horarios-y-tarifas/', date: '2026-09-16',
      note: 'Tarifs généraux Transmarchilay au 01/01/2026 : sedán/hatchback 20 500 CLP (classe 1), motorhome/casa rodante 46 000 CLP (classe 2), moto 15 000 CLP. Passager piéton non affiché (gratuit chez Cruz del Sur). Cruz del Sur, moins chère (auto 15 500 CLP, https://navieracds.online/), n\'affiche pas de camping-car.' },
    { a: 'chiloe', b: 'quinchao', routeKey: 'dalcahueQuinchao', name: 'Dalcahue ↔ Isla Quinchao',
      operator: 'Mampuella, Lecar, Naviera Jerusalem', durationH: 0.25, distanceKm: 1,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://www.voyonovoy.com/informacion-barcazas-chiloe/', date: '2026-09-16',
      note: 'Barges véhicules en service continu ; aucune grille 2026 lisible (dernière trouvée : 2020).' },
    { a: 'chiloe', b: 'lemuy', routeKey: 'huichaChulchuy', name: 'Huicha ↔ Chulchuy',
      operator: 'Barcaza Isla Lemuy', durationH: 0.25, distanceKm: 1.5,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://www.voyonovoy.com/informacion-barcazas-chiloe/', date: '2026-09-16',
      note: 'Barge véhicules toutes les 15 min ; tarif 2026 non publié (2 200 CLP en 2020).' },
    { a: 'southAmerica', b: 'hualaihue', routeKey: 'laArenaPuelche', name: 'Caleta La Arena ↔ Caleta Puelche',
      operator: 'Transportes del Estuario', durationH: 0.5, distanceKm: 4,
      priceByClass: { 1: 10.67, 2: 14.10, 5: 7.68, foot: 0 },
      source: 'https://testuario.cl/tarifas/', date: '2026-09-16',
      note: 'Tarifs au 01/03/2026 TTC : autos/camionetas 11 510 CLP, furgón 15 210 CLP (classe 2), motos 8 280 CLP ; passagers gratuits.' },
    { a: 'southAmerica', b: 'villaOHiggins', routeKey: 'puertoYungayRioBravo', name: 'Puerto Yungay ↔ Río Bravo',
      operator: 'Naviera Transal (service subventionné)', durationH: 0.75, distanceKm: 10,
      priceByClass: { 1: 0, 2: 0, 5: 0, foot: 0 },
      source: 'https://carretera-austral.cl/transbordadores-y-barcazas/', date: '2026-09-16',
      note: 'Traversée du fjord Mitchell subventionnée et gratuite pour véhicules et passagers (page mise à jour septembre 2026) ; 2 départs/jour en basse saison, 5 en haute saison.' },
    { a: 'southAmerica', b: 'tierraDelFuego', routeKey: 'puntaDelgadaBahiaAzul', name: 'Punta Delgada ↔ Bahía Azul',
      operator: 'TABSA (Transbordadora Austral Broom)', durationH: 0.33, distanceKm: 5,
      priceByClass: { 1: 24.11, 2: 48.21, 5: null, foot: 0 },
      source: 'https://radiomagallanes.cl/tabsa-actualiza-tarifas-del-cruce-primera-angostura-desde-abril-de-2026/', date: '2026-09-16',
      note: 'Primera Angostura, tarifs au 09/04/2026 : autos et camionetas jusqu\'à 6 m 26 000 CLP ; minibus/motorhome 52 000 CLP ; passagers gratuits ; tarif moto non publié. Punta Arenas–Porvenir (même paire) non retenue : plus longue.' },
    { a: 'southAmerica', b: 'navarino', routeKey: 'puntaArenasPuertoWilliams', name: 'Punta Arenas ↔ Puerto Williams',
      operator: 'TABSA (Yaghan)', durationH: 30, distanceKm: 480,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://www.exploraislanavarino.com/en/como-llegar-a-puerto-williams-isla-navarino/', date: '2026-09-16',
      note: 'Ferry Yaghan hebdomadaire, transporte des véhicules ; tarif véhicules non publié (site TABSA en application JavaScript illisible). Passager adulte 151 110 CLP en siège de cabine (2026).' },
    // ---------------- Malouines ----------------
    { a: 'eastFalkland', b: 'westFalkland', routeKey: 'newHavenPortHoward', name: 'New Haven ↔ Port Howard',
      operator: 'Workboat Services Ltd (MV Concordia Bay)', durationH: 1.5, distanceKm: 22,
      priceByClass: { 1: 36.86, 2: 55.24, 5: 7.38, foot: 14.76 },
      source: 'https://workboat.co.fk/concordia-bay/ferry-fares', date: '2026-09-16',
      note: 'Grille au 01/07/2026 (aller simple = 50 % de l\'aller-retour) : véhicule domestique < 6 m 31,60 GBP (classe 1), > 6 m 47,35 GBP (classe 2), moto/quad 6,325 GBP, adulte 12,65 GBP ; seul le conducteur de véhicule commercial est gratuit, donc conducteur non inclus.' },
    // ---------------- Venezuela ----------------
    { a: 'southAmerica', b: 'margarita', routeKey: 'puertoLaCruzPuntaDePiedras', name: 'Puerto La Cruz ↔ Punta de Piedras',
      operator: 'Conferry', durationH: 4.5, distanceKm: 85,
      priceByClass: { 1: 111.66, 2: 154.60, 5: 68.71, foot: 25.77 },
      source: 'https://elaragueno.com.ve/conferry-publico-tarifas-de-boletos-para-viajes-entre-puerto-la-cruz-y-margarita/', date: '2026-09-16',
      note: 'Tarifs publiés par Conferry, mise à jour du 01/07/2026, en USD : véhicule 130, pick-up 180 (classe 2), moto 80, adulte 30. Conducteur supposé non inclus (billet passager séparé). Gran Cacique/Naviarca (Cumaná, Chacopata) non retenues : une liaison par paire.' },
    // ---------------- Guyanes ----------------
    { a: 'guyane', b: 'suriname', routeKey: 'saintLaurentAlbina', name: 'Saint-Laurent-du-Maroni ↔ Albina',
      operator: 'Bac international La Gabrielle (DGTM Guyane)', durationH: 0.5, distanceKm: 2,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://la1ere.franceinfo.fr/guyane/reprise-partielle-du-bac-la-gabrielle-entre-saint-laurent-du-maroni-et-albina-des-le-7-juillet-1717069.html', date: '2026-09-16',
      note: 'Reprise partielle le 07/07/2026, véhicules légers seulement, sur réservation, à marée haute. Dernière grille officielle trouvée : arrêté préfectoral de 2013 (voiture + conducteur 34,20 €), non confirmée pour 2026. Le Malani doit renforcer la ligne ; pas de pont.' },
    { a: 'guyanaCoast', b: 'suriname', routeKey: 'molesonCreekSouthDrain', name: 'Moleson Creek ↔ South Drain',
      operator: 'Canawaima Ferry Service (MV Canawaima)', durationH: 0.75, distanceKm: 3,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://kaieteurnewsonline.com/2026/08/29/canawaima-back-in-service-after-days-long-ban/', date: '2026-09-16',
      note: 'Un départ quotidien, 24 voitures ; service repris le 28/08/2026 après interdiction. Aucune grille véhicules officielle publiée (passager ~20 USD aller-retour selon agrégateur).' },
    { a: 'guyanaCoast', b: 'southAmerica', routeKey: 'kurupukariCrossing', name: 'Kurupukari ↔ Iwokrama',
      operator: 'Ponton gouvernemental (Essequibo)', durationH: 0.2, distanceKm: 1,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://592hub.com/blog/guyana-ferry-services.html', date: '2026-09-16',
      note: 'Ponton horaire 06:00–18:00 sur la route Linden–Lethem ; ~7 000 GYD par véhicule selon un agrégateur, sans grille officielle. Pont annoncé (juillet 2026), non construit.' },
    { a: 'guyanaCoast', b: 'essequiboCoast', routeKey: 'parikaSupenaam', name: 'Parika ↔ Supenaam',
      operator: 'Transport & Harbours Department (MV Kanawan, Konawaruk)', durationH: 0.7, distanceKm: 20,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://inewsguyana.com/parika-supenaam-online-ferry-pass-to-reduce-waiting-lines-complaints/', date: '2026-09-16',
      note: 'Ferry véhicules subventionné, réservation FerryPass ; aucune grille officielle lisible.' },
    { a: 'guyanaCoast', b: 'leguan', routeKey: 'parikaLeguan', name: 'Parika ↔ Leguan',
      operator: 'Transport & Harbours Department', durationH: 0.5, distanceKm: 8,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://dpi.gov.gy/ferrypass-to-be-launched-for-leguan-wakenaam-passengers/', date: '2026-09-16',
      note: 'FerryPass couvre passagers et véhicules des îles de l\'Essequibo ; tarif véhicules non publié.' },
    { a: 'guyanaCoast', b: 'wakenaam', routeKey: 'parikaWakenaam', name: 'Parika ↔ Wakenaam',
      operator: 'Transport & Harbours Department', durationH: 0.75, distanceKm: 18,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://dpi.gov.gy/ferrypass-to-be-launched-for-leguan-wakenaam-passengers/', date: '2026-09-16',
      note: 'Idem Leguan : ferry véhicules T&HD, tarif non publié.' },
    { a: 'guyanaCoast', b: 'bartica', routeKey: 'parikaBartica', name: 'Parika ↔ Bartica',
      operator: 'Transport & Harbours Department (MV Makouria, MV Malali)', durationH: 3.5, distanceKm: 60,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://592hub.com/blog/guyana-ferry-services.html', date: '2026-09-16',
      note: 'Ferry quotidien T&HD transportant des véhicules (source agrégateur, vérifiée septembre 2026) ; aucune grille officielle.' },
    // ---------------- Brésil ----------------
    { a: 'southAmerica', b: 'ilhabela', routeKey: 'saoSebastiaoIlhabela', name: 'São Sebastião ↔ Ilhabela',
      operator: 'DH/Semil — Travessias Litorâneas (État de São Paulo)', durationH: 0.5, distanceKm: 3,
      priceByClass: { 1: 3.16, 2: null, 5: 1.58, foot: 0 },
      source: 'https://semil.sp.gov.br/travessias/travessias-automoveis/sao-sebastiao-ilhabela/?lang=pb', date: '2026-09-16',
      note: 'Grille officielle en vigueur : automóveis e camionetas 19,00 BRL, motos 9,50 BRL en semaine (28,50 / 14,20 les week-ends et fériés) ; perçue une seule fois à l\'embarquement à São Sebastião, valable aller-retour ; piétons et vélos gratuits ; pas de ligne camping-car lisible. Taxe environnementale d\'Ilhabela (7,50 BRL) non incluse.' },
    { a: 'southAmerica', b: 'salvaterra', routeKey: 'icoaraciCamara', name: 'Icoaraci ↔ Camará',
      operator: 'Henvil Transportes', durationH: 3, distanceKm: 55,
      priceByClass: { 1: 24.12, 2: 28.27, 5: 5.65, foot: 4.99 },
      source: 'https://henvil.com.br/tarifas/', date: '2026-09-16',
      note: 'Grille Henvil (ligne Camará) : automóvel pequeno 175 BRL, utilitário pequeno 200 BRL, moto 64 BRL, passager classe économique 30 BRL ; le conducteur est dispensé du billet économique, donc 30 BRL déduits des véhicules. Date de la grille non affichée.' },
    { a: 'salvaterra', b: 'soure', routeKey: 'salvaterraSoure', name: 'Salvaterra ↔ Soure',
      operator: 'Henvil Transportes', durationH: 0.33, distanceKm: 1,
      priceByClass: { 1: 3.99, 2: 4.66, 5: 1.50, foot: 0 },
      source: 'https://henvil.com.br/tarifas/', date: '2026-09-16',
      note: 'Travessia Soure : automóvel pequeno 24 BRL, utilitário pequeno 28 BRL, moto 9 BRL ; passager isolé gratuit.' },
    { a: 'salvaterra', b: 'cachoeiraDoArari', routeKey: 'travessiaCachoeiraDoArari', name: 'Camará ↔ Cachoeira do Arari',
      operator: 'Henvil Transportes', durationH: 0.25, distanceKm: 1,
      priceByClass: { 1: 1.66, 2: 1.83, 5: 0.50, foot: 0 },
      source: 'https://henvil.com.br/tarifas/', date: '2026-09-16',
      note: 'Travessia Cachoeira do Arari : automóvel pequeno 10 BRL, utilitário pequeno 11 BRL, moto 3 BRL ; passager isolé gratuit. Emplacement exact du bac (rio Camará) non détaillé sur la page.' },
  ]
};
