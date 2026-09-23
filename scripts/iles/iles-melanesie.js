// Groupe « melanesie » : Papouasie-Nouvelle-Guinée (PG), Îles Salomon (SB), Vanuatu (VU), Fidji (FJ).
// Boîtes : [latMin, latMax, lonMin, lonMax]. Règles évaluées dans l'ordre ; clé '*' = chaque lieu isolé ; default '*'.
// Règles vérifiées contre public/data/communes-{pg,sb,vu,fj}.txt (comptages + cartes de contrôle), 16/09/2026.
// Les règles « near » à 0,3 km visent des villages précis situés sur des îlots côtiers (coordonnées du fichier de lieux).
// Ponts/chaussées routiers pris en compte : Manus–Los Negros (pont de Loniu) ; Viti Levu–Denarau et Viti Levu–Yanuca
// (Shangri-La). Aucun pont : Buka–Bougainville (Buka Passage), Malaita–Maramasike, Nggela Sule–Pile, Taveuni, etc.
// FERRIES : aucune liaison retenue — aucune grille officielle publiée (véhicule ET passager) n'a été trouvée
// (Fidji : l'autorisation FCCC du 01/08/2023 fixe des tarifs passagers mais facture les véhicules au fret à la tonne ;
// sites Patterson/Goundar inaccessibles ; PNG, Salomon, Vanuatu : pas de grille véhicule publiée).
module.exports = {
  landmass: {
    PG: {
      default: '*',
      rules: [
        {key: "*", match: {box: [[-4.6, -4.3, 154, 154.35], [-5.3, -5.15, 154.45, 154.55], [-5.46, -5.437, 154.64, 154.67]]}, note: "Nissan (Green Is.), Pinipel, Pororan, Sohano"},
        {key: "buka", match: {box: [[-5.437, -4.95, 154.5, 154.8]]}, note: "Buka : Buka Passage sans pont routier (bateaux-taxis)"},
        {key: "*", match: {near: [{name: "Iaun Number One", lat: -5.7019, lon: 155.1293, km: 0.3}]}, note: "îlots Toruta/Torabuta"},
        {key: "bougainville", match: {box: [[-7, -5.437, 154.55, 156.2]]}, note: "île Bougainville"},
        {key: "*", match: {box: [[-4.3, -4.05, 152.36, 152.6]]}, note: "îles du Duc d'York"},
        {key: "*", match: {box: [[-4.14, -4.08, 152.03, 152.1]]}, note: "Watom"},
        {key: "*", match: {near: [{name: "Kerawara", lat: -4.2383, lon: 152.4144, km: 0.3}, {name: "Palipal", lat: -4.1167, lon: 152.4167, km: 0.3}]}, note: "Watom, Kerawara, Makada"},
        {key: "*", match: {box: [[-4.95, -4.4, 148.9, 149.7]]}, note: "îles Witu / Vitu (Garove, Unea)"},
        {key: "newBritain", match: {box: [[-4.45, -4, 151, 152.4]]}, note: "Gazelle : 2 lieux étiquetés New Ireland mais situés en Nouvelle-Bretagne"},
        {key: "*", match: {near: [{name: "Sosson", lat: -2.4113, lon: 150.0311, km: 0.3}, {name: "Ungalabu", lat: -2.4003, lon: 150.0475, km: 0.3}, {name: "Kung", lat: -2.3795, lon: 150.1079, km: 0.3}, {name: "Dunung", lat: -2.3667, lon: 150.1167, km: 0.3}, {name: "Neitab", lat: -2.3472, lon: 150.1511, km: 0.3}, {name: "Ungalik", lat: -2.3727, lon: 150.2466, km: 0.3}, {name: "Unusa", lat: -2.4167, lon: 150.3333, km: 0.3}, {name: "Neingang", lat: -2.4333, lon: 150.3333, km: 0.3}, {name: "Nuslik", lat: -2.3875, lon: 150.3363, km: 0.3}, {name: "Lukus", lat: -2.3658, lon: 150.3505, km: 0.3}, {name: "Mosuang", lat: -2.4491, lon: 150.3503, km: 0.3}, {name: "Tsoilik", lat: -2.4136, lon: 150.4203, km: 0.3}, {name: "Mamion", lat: -2.4214, lon: 150.4375, km: 0.3}, {name: "Kulibang", lat: -2.4421, lon: 150.4625, km: 0.3}, {name: "Pasan", lat: -2.4667, lon: 150.4833, km: 0.3}, {name: "Kawulikiau", lat: -2.5, lon: 150.5333, km: 0.3}, {name: "Kawulikiau", lat: -2.5, lon: 150.5167, km: 0.3}, {name: "Utokol", lat: -2.657, lon: 150.5203, km: 0.3}, {name: "Upuos", lat: -2.664, lon: 150.5184, km: 0.3}, {name: "Kulaunus", lat: -2.6499, lon: 150.5277, km: 0.3}, {name: "Patimaian", lat: -2.6795, lon: 150.5252, km: 0.3}, {name: "Palawee", lat: -2.675, lon: 150.5417, km: 0.3}, {name: "Matamei", lat: -2.6806, lon: 150.55, km: 0.3}, {name: "Kiton", lat: -2.6718, lon: 150.6245, km: 0.3}, {name: "Nonowaul", lat: -2.6773, lon: 150.6463, km: 0.3}, {name: "Enuk", lat: -2.6492, lon: 150.7333, km: 0.3}, {name: "Nusailas", lat: -2.679, lon: 150.7371, km: 0.3}, {name: "Tingwon", lat: -2.612, lon: 149.7125, km: 0.3}, {name: "Nusamani", lat: -2.6024, lon: 149.7067, km: 0.3}]}, note: "îlots autour de la Nouvelle-Hanovre et de Kavieng"},
        {key: "newHanover", match: {box: [[-2.8, -2.25, 149.85, 150.6]]}, note: "Nouvelle-Hanovre (Lavongai)"},
        {key: "mussau", match: {box: [[-1.75, -1.25, 149.4, 149.85]]}, note: "Mussau (îles St-Matthias)"},
        {key: "*", match: {box: [[-2.97, -2.7, 152.55, 152.75]]}, note: "Mahur, Masahet"},
        {key: "*", match: {near: [{name: "Kuelam", lat: -2.7871, lon: 152.6553, km: 0.3}, {name: "Ton", lat: -2.95, lon: 152.65, km: 0.3}, {name: "Bilami", lat: -2.9579, lon: 152.653, km: 0.3}, {name: "Penapedik", lat: -3.0295, lon: 152.6833, km: 0.3}]}, note: "îlots de Lihir (Mahur, Masahet, Mali)"},
        {key: "lihir", match: {box: [[-3.3, -2.98, 152.5, 152.72]]}, note: "île Lihir (Londolovit, mine)"},
        {key: "*", match: {box: [[-1.75, -1.55, 149.85, 150.15], [-3.05, -2.88, 150.7, 151.02], [-3.1, -2.55, 151.8, 152.15], [-3.65, -3.3, 153.1, 153.4], [-4.2, -3.9, 153.5, 153.8]]}, note: "Emirau, Djaul, îles Tabar, Tanga, Feni (Anir)"},
        {key: "newIreland", match: {near: [{name: "Kaewieng", lat: -2.5563, lon: 150.7962, km: 0.3}, {name: "Kapasalio", lat: -4.4106, lon: 152.676, km: 0.3}, {name: "Sena", lat: -3.8828, lon: 152.805, km: 0.3}]}, note: "lieux sans région en Nouvelle-Irlande"},
        {key: "newIreland", match: {regions: ["New Ireland"]}, note: "Nouvelle-Irlande (île principale)"},
        {key: "*", match: {near: [{name: "Kumbun", lat: -6.1538, lon: 149.006, km: 0.3}, {name: "Winguru", lat: -6.1833, lon: 149.0333, km: 0.3}, {name: "Paligmete", lat: -6.1685, lon: 149.0432, km: 0.3}, {name: "Nutanuvua", lat: -5.5572, lon: 149.295, km: 0.3}, {name: "Muliagani", lat: -5.55, lon: 149.4, km: 0.3}, {name: "Nukakau", lat: -5.5129, lon: 149.4535, km: 0.3}, {name: "Sumalani", lat: -5.5015, lon: 149.5004, km: 0.3}, {name: "Apugi", lat: -6.2333, lon: 149.55, km: 0.3}, {name: "Poi-Makati", lat: -5.4816, lon: 149.626, km: 0.3}, {name: "Vessi", lat: -5.4667, lon: 149.7063, km: 0.3}, {name: "Nusasi", lat: -5.4667, lon: 149.7, km: 0.3}, {name: "Kalapiai", lat: -5.4747, lon: 149.6974, km: 0.3}, {name: "Ambungi", lat: -6.3, lon: 149.8167, km: 0.3}, {name: "Malenglo", lat: -6.3, lon: 149.9, km: 0.3}, {name: "Aivet", lat: -6.3, lon: 149.9667, km: 0.3}, {name: "Ablingi", lat: -6.3003, lon: 150.0696, km: 0.3}, {name: "Anato", lat: -6.2786, lon: 150.2729, km: 0.3}, {name: "Akur", lat: -6.2862, lon: 150.2807, km: 0.3}, {name: "Awirin", lat: -6.2863, lon: 150.3221, km: 0.3}, {name: "Avihain", lat: -6.2676, lon: 150.3633, km: 0.3}, {name: "Akiwok", lat: -6.2724, lon: 150.4023, km: 0.3}, {name: "Lulakevi", lat: -6.2503, lon: 150.4373, km: 0.3}, {name: "Kaskas", lat: -6.1254, lon: 150.7091, km: 0.3}]}, note: "îlots des côtes de Nouvelle-Bretagne occidentale (Arawe, Kandrian, Bali-Witu…)"},
        {key: "newBritain", match: {near: [{name: "Gilau", lat: -5.5019, lon: 149.0367, km: 0.3}, {name: "Malalia Mission", lat: -5.4549, lon: 150.5238, km: 0.3}, {name: "Kualakesi", lat: -5.5282, lon: 150.3164, km: 0.3}]}, note: "lieux sans région en Nouvelle-Bretagne"},
        {key: "newBritain", match: {regions: ["East New Britain Province", "West New Britain Province"]}, note: "Nouvelle-Bretagne (Rabaul, Kokopo, Kimbe)"},
        {key: "*", match: {near: [{name: "Harengan", lat: -1.9584, lon: 146.5805, km: 0.3}, {name: "Mara Yiri", lat: -1.9691, lon: 146.8023, km: 0.3}, {name: "Ponam", lat: -1.9092, lon: 146.8784, km: 0.3}, {name: "Hus", lat: -1.9333, lon: 147.1, km: 0.3}, {name: "Labahan", lat: -1.9851, lon: 147.1288, km: 0.3}, {name: "Selalou", lat: -2.2046, lon: 147.1869, km: 0.3}, {name: "Peri", lat: -2.2021, lon: 147.1727, km: 0.3}, {name: "Lauis", lat: -2.1, lon: 147.2833, km: 0.3}, {name: "Hauwei", lat: -1.9602, lon: 147.2859, km: 0.3}, {name: "Ndrilo", lat: -1.9667, lon: 147.3286, km: 0.3}, {name: "Koruniat", lat: -1.9762, lon: 147.3511, km: 0.3}, {name: "Kogo", lat: -2.1333, lon: 146.6833, km: 0.3}, {name: "Salapi", lat: -2.1084, lon: 146.4046, km: 0.3}, {name: "Matahei", lat: -2.1036, lon: 146.3985, km: 0.3}, {name: "Masso", lat: -2.1018, lon: 146.3953, km: 0.3}]}, note: "îlots autour de Manus"},
        {key: "manus", match: {box: [[-2.25, -1.93, 146.3, 147.47]]}, note: "Manus + Los Negros (pont routier de Loniu)"},
        {key: "kiriwina", match: {box: [[-8.75, -8.35, 150.95, 151.2]]}, note: "Kiriwina (Trobriand, Losuia)"},
        {key: "*", match: {box: [[-8.95, -8.3, 150.2, 151.5], [-9.4, -8.3, 151.5, 152.3]]}, note: "autres Trobriand (Kaileuna, Kitava, Vakuta…), Marshall Bennett"},
        {key: "woodlark", match: {box: [[-9.35, -8.9, 152.35, 153.3]]}, note: "Woodlark (Muyua)"},
        {key: "goodenough", match: {box: [[-9.6, -9.1, 149.95, 150.4]]}, note: "Goodenough"},
        {key: "*", match: {near: [{name: "Naikwala", lat: -9.75, lon: 150.8667, km: 0.3}, {name: "Asatupi", lat: -9.75, lon: 150.8667, km: 0.3}]}, note: "Dobu"},
        {key: "fergusson", match: {box: [[-9.85, -9.2, 150.4, 150.95]]}, note: "Fergusson"},
        {key: "normanby", match: {box: [[-10.2, -9.83, 150.87, 151.35]]}, note: "Normanby"},
        {key: "misima", match: {box: [[-10.75, -10.55, 152.5, 152.9]]}, note: "Misima (Bwagaoia)"},
        {key: "sudest", match: {box: [[-11.7, -11.25, 153.2, 153.85]]}, note: "Tagula (Sudest)"},
        {key: "rossel", match: {box: [[-11.5, -11.2, 153.95, 154.35]]}, note: "Rossel (Yela)"},
        {key: "*", match: {box: [[-10.7, -10.54, 150.675, 150.9]]}, note: "Sariba, Sideia"},
        {key: "*", match: {box: [[-11.8, -9.55, 150.9, 155]]}, note: "autres îles de Milne Bay (Sanaroa, Nuakata, Basilaki, Sideia, Engineer, Conflict, Calvados, Louisiades…)"},
        {key: "*", match: {near: [{name: "Brummer Island", lat: -10.707, lon: 150.2571, km: 0.3}]}, note: "Brummer Island"},
        {key: "*", match: {near: [{name: "Delina", lat: -10.6, lon: 150.0167, km: 0.3}, {name: "Suau", lat: -10.6977, lon: 150.2556, km: 0.3}, {name: "Suau", lat: -10.6237, lon: 150.0167, km: 0.3}, {name: "Baibesika", lat: -10.7333, lon: 150.3, km: 0.3}, {name: "Lele", lat: -10.6667, lon: 150.3167, km: 0.3}, {name: "Elewa", lat: -10.6609, lon: 150.3143, km: 0.3}, {name: "Baiawai Dau", lat: -10.6578, lon: 150.3552, km: 0.3}, {name: "Bonarua", lat: -10.7529, lon: 150.3848, km: 0.3}, {name: "Iloilo", lat: -10.6886, lon: 150.4269, km: 0.3}, {name: "Gadogadoa", lat: -10.6195, lon: 150.5653, km: 0.3}, {name: "Kwato", lat: -10.615, lon: 150.6318, km: 0.3}, {name: "Kumikuku", lat: -10.6179, lon: 150.6347, km: 0.3}, {name: "Kasabanalua", lat: -10.6189, lon: 150.6306, km: 0.3}, {name: "Dabali", lat: -10.6333, lon: 150.65, km: 0.3}, {name: "Samarai", lat: -10.6104, lon: 150.6621, km: 0.3}, {name: "Dagadaga", lat: -10.5997, lon: 150.6839, km: 0.3}, {name: "Sabuiona", lat: -10.5833, lon: 150.7167, km: 0.3}, {name: "Upa-Upasina", lat: -9.8, lon: 150.7833, km: 0.3}]}, note: "îlots de la côte sud de Milne Bay (Samarai, Kwato, Logea, Suau, Roux…)"},
        {key: "*", match: {near: [{name: "Tumleo", lat: -3.1272, lon: 142.3971, km: 0.3}, {name: "Ali", lat: -3.1278, lon: 142.457, km: 0.3}, {name: "Seleo", lat: -3.1415, lon: 142.4753, km: 0.3}, {name: "Angel", lat: -3.1444, lon: 142.4784, km: 0.3}]}, note: "Tumleo, Ali, Seleo, Angel (Aitape)"},
        {key: "kairiru", match: {box: [[-3.42, -3.3, 143.45, 143.62]]}, note: "Kairiru (îles Schouten)"},
        {key: "*", match: {box: [[-3.47, -3.39, 143.55, 143.66], [-3.7, -3.1, 143.9, 145], [-3.28, -3.15, 143.2, 143.35]]}, note: "Muschu, Vokeo, Koil, Wei, Blup Blup, Kadovar, Bam, Tarawai, Walis"},
        {key: "*", match: {near: [{name: "Yuo", lat: -3.4071, lon: 143.4894, km: 0.3}]}, note: "Yuo"},
        {key: "manam", match: {near: [{name: "Manam", lat: -4.08, lon: 145.04, km: 9}]}, note: "Manam"},
        {key: "karkar", match: {near: [{name: "Karkar", lat: -4.635, lon: 145.965, km: 14}]}, note: "Karkar"},
        {key: "bagabag", match: {near: [{name: "Bagabag", lat: -4.8, lon: 146.22, km: 7}]}, note: "Bagabag"},
        // Clé suffixée : « longIsland » servait aussi à Long Island des Bahamas (iles-caraibes.js).
        {key: "longIslandPG", match: {near: [{name: "Long Island", lat: -5.33, lon: 147.08, km: 17}]}, note: "Long Island"},
        {key: "*", match: {box: [[-5.45, -5.05, 146.9, 147], [-5.4, -5.2, 147.5, 147.72], [-5.5, -5.35, 147.95, 148.2]]}, note: "Crown, Tolokiwa, Sakar"},
        {key: "*", match: {near: [{name: "Kranket", lat: -5.1995, lon: 145.8144, km: 0.3}, {name: "Malamal", lat: -5.1266, lon: 145.8064, km: 0.3}, {name: "Kananam", lat: -5.0998, lon: 145.8013, km: 0.3}]}, note: "îlots du lagon de Madang (Kranket, Malamal, Kananam)"},
        {key: "umboi", match: {box: [[-5.95, -5.45, 147.7, 148.15]]}, note: "Umboi (Siassi)"},
        {key: "*", match: {near: [{name: "Kalal", lat: -6.7576, lon: 147.9206, km: 0.3}, {name: "Wanam", lat: -6.7612, lon: 147.9288, km: 0.3}]}, note: "îles Tami"},
        {key: "*", match: {near: [{name: "Parama", lat: -8.9971, lon: 143.4237, km: 0.3}, {name: "Mibu", lat: -8.7333, lon: 143.45, km: 0.3}, {name: "Auti", lat: -8.4667, lon: 143.2167, km: 0.3}]}, note: "îles Parama, Mibu, Magabu (Fly)"},
        {key: "daru", match: {box: [[-9.12, -9.04, 143.16, 143.24]]}, note: "Daru"},
        {key: "kiwai", match: {box: [[-8.95, -8.35, 143.3, 143.65]]}, note: "Kiwai (estuaire du Fly)"},
        {key: "*", match: {near: [{name: "Tsiria", lat: -8.8209, lon: 146.5239, km: 0.3}, {name: "Kairuku", lat: -8.8374, lon: 146.5372, km: 0.3}, {name: "Mailu", lat: -10.3857, lon: 149.3576, km: 0.3}, {name: "Laluoro", lat: -10.3462, lon: 149.3461, km: 0.3}, {name: "Eunuoro", lat: -10.4, lon: 149.45, km: 0.3}, {name: "Abau", lat: -10.1827, lon: 148.7024, km: 0.3}]}, note: "Yule, Mailu, Laluoro, Emhoro, Abau"},
        {key: "newGuinea", match: {box: [[-10.8, -9.5, 149, 150.9]]}, note: "partie continentale de Milne Bay (Alotau)"},
        {key: "newBritain", match: {box: [[-6.5, -4, 148.2, 152.5]]}, note: "pointe ouest de la Nouvelle-Bretagne (villages rattachés à Morobe)"},
        {key: "*", match: {regions: ["Manus Province", "Milne Bay Province", "Bougainville", "New Ireland"]}, note: "autres îles de ces provinces"},
        {key: "newGuinea", match: {regions: ["Sandaun Province", "East Sepik Province", "Madang Province", "Morobe Province", "Oro Province", "Central Province", "National Capital", "Gulf Province", "Western Province", "Southern Highlands Province", "Enga Province", "Western Highlands Province", "Chimbu Province", "Eastern Highlands Province", "Hela Province", "Jiwaka Province"]}, note: "Nouvelle-Guinée (même île que la Papouasie indonésienne)"},
        {key: "newGuinea", match: {box: [[-10.5, -2.5, 140.8, 150]]}, note: "lieux sans région sur le continent"}
      ]
    },
    SB: {
      default: '*',
      rules: [
        {key: "*", match: {near: [{name: "Taro", lat: -6.7111, lon: 156.3972, km: 0.3}]}, note: "Taro (îlot, chef-lieu de Choiseul)"},
        {key: "choiseul", match: {box: [[-7.45, -6.55, 156.35, 157.6]]}, note: "Choiseul (Lauru)"},
        {key: "vellaLavella", match: {box: [[-7.945, -7.5, 156.45, 156.8]]}, note: "Vella Lavella"},
        {key: "ranongga", match: {box: [[-8.2, -7.945, 156.48, 156.66]]}, note: "Ranongga"},
        {key: "*", match: {near: [{name: "Logha", lat: -8.0927, lon: 156.8425, km: 0.3}, {name: "Nusambaruku", lat: -8.0981, lon: 156.8378, km: 0.3}]}, note: "îlot de Logha (Gizo)"},
        {key: "gizo", match: {box: [[-8.13, -8.03, 156.75, 156.88]]}, note: "Ghizo (Gizo)"},
        {key: "*", match: {box: [[-8.4, -8.19, 157.05, 157.18]]}, note: "îlots de Vonavona / Kohinggo"},
        {key: "*", match: {near: [{name: "Nusa Roviana", lat: -8.3466, lon: 157.3101, km: 0.3}, {name: "Mbanga", lat: -8.3, lon: 157.3333, km: 0.3}, {name: "Sasavele", lat: -8.3116, lon: 157.3447, km: 0.3}]}, note: "îlots du lagon de Roviana"},
        {key: "newGeorgia", match: {box: [[-8.45, -8.19, 157.18, 157.97], [-8.19, -7.95, 157.24, 157.97], [-8.62, -8.45, 157.45, 157.97]]}, note: "Nouvelle-Géorgie (Munda, Noro, Seghe)"},
        {key: "kolombangara", match: {box: [[-8.19, -7.75, 156.88, 157.24]]}, note: "Kolombangara"},
        {key: "rendova", match: {box: [[-8.75, -8.45, 157.18, 157.45]]}, note: "Rendova"},
        {key: "*", match: {box: [[-8.585, -8.45, 157.97, 158.25]]}, note: "îles-barrières du lagon de Marovo"},
        {key: "vangunu", match: {box: [[-8.79, -8.585, 157.97, 158.18]]}, note: "Vangunu"},
        {key: "*", match: {near: [{name: "Furona", lat: -8.1273, lon: 159.096, km: 0.3}, {name: "Kirighi", lat: -8.4625, lon: 159.6618, km: 0.3}, {name: "Sigana", lat: -8.5108, lon: 159.8641, km: 0.3}, {name: "Naruo", lat: -7.6333, lon: 158.35, km: 0.3}]}, note: "îlots de Santa Isabel (Furona, San Jorge/Kirighi, Sigana, Keto)"},
        {key: "isabel", match: {box: [[-8.62, -7.3, 158.25, 159.95]]}, note: "Santa Isabel (Buala)"},
        {key: "savo", match: {box: [[-9.2, -9.05, 159.74, 159.88]]}, note: "Savo"},
        {key: "guadalcanal", match: {box: [[-10, -9.2, 159.5, 160.9]]}, note: "Guadalcanal (Honiara)"},
        {key: "*", match: {near: [{name: "Rokera", lat: -9.6545, lon: 161.4393, km: 0.3}, {name: "Parasi", lat: -9.6472, lon: 161.4273, km: 0.3}, {name: "Sihomwaniwala", lat: -9.6571, lon: 161.438, km: 0.3}, {name: "Kokosurisau", lat: -9.658, lon: 161.4371, km: 0.3}]}, note: "îles Marau (au large de Maramasike)"},
        {key: "*", match: {near: [{name: "Laulasi", lat: -8.8761, lon: 160.7377, km: 0.3}, {name: "Busu", lat: -8.8833, lon: 160.7333, km: 0.3}, {name: "Kwai", lat: -8.7723, lon: 160.9476, km: 0.3}, {name: "Ngongosila", lat: -8.777, lon: 160.9411, km: 0.3}]}, note: "îles artificielles du lagon de Langa Langa et îlots de la côte est"},
        {key: "maramasike", match: {box: [[-9.5, -9.33, 161.36, 161.7], [-9.8, -9.5, 161.33, 161.7]]}, note: "Maramasike (Small Malaita) : passage de Maramasike sans pont"},
        {key: "malaita", match: {box: [[-9.33, -8.25, 160.5, 161.36], [-9.6, -9.33, 161, 161.36]]}, note: "Malaita (Auki)"},
        {key: "*", match: {box: [[-10.36, -10.2, 161.66, 161.8]]}, note: "Ugi (Uki ni Masi)"},
        {key: "makira", match: {box: [[-10.95, -10.15, 161.2, 162.42]]}, note: "Makira (Kirakira)"},
        {key: "rennell", match: {box: [[-11.9, -11.45, 159.9, 160.75]]}, note: "Rennell (Mugaba)"},
        {key: "nendo", match: {box: [[-10.95, -10.55, 165.65, 166.2]]}, note: "Nendo / Santa Cruz (Lata)"}
      ]
    },
    VU: {
      default: '*',
      rules: [
        {key: "vanuaLava", match: {box: [[-14, -13.65, 167.33, 167.585]]}, note: "Vanua Lava (Sola)"},
        {key: "gaua", match: {box: [[-14.42, -14.12, 167.36, 167.64]]}, note: "Gaua"},
        {key: "malo", match: {box: [[-15.8, -15.625, 167.05, 167.3]]}, note: "Malo"},
        {key: "*", match: {box: [[-15.625, -15.545, 167.08, 167.24]]}, note: "Aore"},
        {key: "*", match: {near: [{name: "Natanopéta", lat: -15.6333, lon: 166.95, km: 0.3}, {name: "Sope", lat: -15.6285, lon: 166.9572, km: 0.3}]}, note: "Araki"},
        {key: "santo", match: {box: [[-15.625, -14.55, 166.5, 167.32], [-15.67, -15.625, 166.5, 166.92]]}, note: "Espiritu Santo (Luganville)"},
        {key: "ambae", match: {box: [[-15.55, -15.18, 167.55, 168.02]]}, note: "Ambae"},
        {key: "maewo", match: {box: [[-15.33, -14.88, 168.02, 168.25]]}, note: "Maewo"},
        {key: "pentecost", match: {box: [[-16.05, -15.38, 168.05, 168.35]]}, note: "Pentecôte"},
        {key: "*", match: {near: [{name: "Vao", lat: -15.9012, lon: 167.3062, km: 0.3}]}, note: "Vao (îlot au nord de Malekula)"},
        {key: "*", match: {box: [[-16.62, -16.47, 167.74, 167.95]]}, note: "îles Maskelyne"},
        {key: "malekula", match: {box: [[-16.65, -15.82, 167.08, 167.88]]}, note: "Malekula (Lakatoro, Norsup)"},
        {key: "paama", match: {box: [[-16.56, -16.365, 168.17, 168.3]]}, note: "Paama"},
        {key: "*", match: {box: [[-16.36, -16.18, 168.3, 168.43]]}, note: "Lopevi"},
        {key: "ambrym", match: {box: [[-16.365, -16.05, 167.85, 168.3]]}, note: "Ambrym (Craig Cove)"},
        {key: "epi", match: {box: [[-16.9, -16.55, 168.08, 168.46]]}, note: "Epi"},
        {key: "*", match: {box: [[-17.625, -17.58, 168.17, 168.235], [-17.565, -17.515, 168.22, 168.31]]}, note: "Lelepa, Moso"},
        {key: "efate", match: {box: [[-17.86, -17.515, 168.1, 168.66]]}, note: "Efate (Port-Vila)"},
        {key: "erromango", match: {box: [[-19, -18.55, 168.95, 169.35]]}, note: "Erromango"},
        {key: "tanna", match: {box: [[-19.72, -19.3, 169.18, 169.55]]}, note: "Tanna (Lenakel, Isangel)"},
        {key: "aneityum", match: {box: [[-20.32, -20.05, 169.62, 169.97]]}, note: "Aneityum"}
      ]
    },
    FJ: {
      default: '*',
      rules: [
        {key: "rotuma", match: {box: [[-12.6, -12.4, 176.95, 177.2]]}, note: "Rotuma"},
        {key: "*", match: {near: [{name: "Lasakau", lat: -17.9733, lon: 178.6159, km: 0.3}, {name: "Soso", lat: -17.9706, lon: 178.615, km: 0.3}, {name: "Bau", lat: -17.9722, lon: 178.6148, km: 0.3}, {name: "Viwa", lat: -17.9397, lon: 178.6159, km: 0.3}, {name: "Naigani", lat: -17.5832, lon: 178.6721, km: 0.3}]}, note: "Bau, Viwa, Naigani, Malake (au large de Viti Levu)"},
        {key: "*", match: {near: [{name: "Malake", lat: -17.3238, lon: 178.1506, km: 0.3}, {name: "Lomalake Settlement", lat: -17.3174, lon: 178.1415, km: 0.3}, {name: "Serua", lat: -18.2752, lon: 177.924, km: 0.3}]}, note: "Malake, Serua"},
        {key: "*", match: {near: [{name: "Nasesara", lat: -17.7566, lon: 178.7488, km: 0.3}, {name: "Varisi Settlement", lat: -17.7709, lon: 178.7405, km: 0.3}]}, note: "Moturiki"},
        {key: "*", match: {near: [{name: "Yaqaga", lat: -16.5958, lon: 178.5951, km: 0.3}, {name: "Galoa", lat: -16.6154, lon: 178.6805, km: 0.3}, {name: "Tavea", lat: -16.6254, lon: 178.7266, km: 0.3}, {name: "Kavewa", lat: -16.1932, lon: 179.5723, km: 0.3}, {name: "Lingau", lat: -16.2333, lon: 179.0833, km: 0.3}, {name: "Ligaulevu", lat: -16.3439, lon: 179.3498, km: 0.3}, {name: "Lidiasiga", lat: -16.3532, lon: 179.35, km: 0.3}]}, note: "îlots au large de Vanua Levu (Yaqaga, Galoa, Tavea, Kavewa, Kia, Mali)"},
        {key: "*", match: {box: [[-17.33, -17.26, 178.2, 178.27]]}, note: "Nananu-i-Ra"},
        {key: "vitiLevu", match: {box: [[-18.32, -17.28, 177.24, 178.715]]}, note: "Viti Levu (Suva, Nadi, Lautoka) ; Denarau et Yanuca (Shangri-La) reliées par chaussée/pont routier"},
        {key: "ovalau", match: {box: [[-17.8, -17.6, 178.715, 178.87]]}, note: "Ovalau (Levuka)"},
        {key: "koro", match: {box: [[-17.45, -17.2, 179.33, 179.5]]}, note: "Koro"},
        {key: "gau", match: {box: [[-18.15, -17.9, 179.2, 179.38]]}, note: "Gau"},
        {key: "*", match: {near: [{name: "Galoa", lat: -19.0793, lon: 178.1814, km: 0.3}, {name: "Matanuku", lat: -19.1655, lon: 178.1009, km: 0.3}]}, note: "Galoa, Matanuku (îlots de Kadavu)"},
        {key: "kadavu", match: {box: [[-19.2, -18.925, 177.9, 178.49]]}, note: "Kadavu (Vunisea)"},
        {key: "beqa", match: {box: [[-18.46, -18.35, 178.05, 178.2]]}, note: "Beqa"},
        {key: "taveuni", match: {box: [[-16.8, -16.66, -180, -179.83], [-16.8, -16.72, 179.98, 180], [-16.92, -16.8, 179.88, 180], [-16.92, -16.8, -180, -179.84], [-17.08, -16.92, 179.83, 180], [-17.08, -16.92, -180, -179.95]]}, note: "Taveuni (à cheval sur le 180e méridien)"},
        {key: "rabi", match: {box: [[-16.58, -16.4, -180, -179.86], [-16.58, -16.4, 179.975, 180]]}, note: "Rabi"},
        {key: "vanuaLevu", match: {box: [[-17.1, -16.1, 178.4, 179.975], [-16.4, -16.1, 179.975, 180], [-16.22, -16.1, -180, -179.95]]}, note: "Vanua Levu (Labasa, Savusavu, Nabouwalu) jusqu’à Udu Point"},
        {key: "vanuaBalavu", match: {box: [[-17.42, -17.1, -179.1, -178.88]]}, note: "Vanua Balavu"},
        {key: "lakeba", match: {box: [[-18.3, -18.13, -178.87, -178.73]]}, note: "Lakeba"}
      ]
    },
  },
  ferries: [
    // Vanuatu : seul lien maritime régulier entre les deux principales îles. Navire de PASSAGERS de 33 m,
    // qui emporte aussi du fret vers les marchés ; aucun tarif n'est publié, l'armateur n'ayant pas de site.
    { a: 'efate', b: 'santo', routeKey: 'portVilaLuganville', passengerOnly: true, "priceCovers": null,
      "coversSource": "l'office du tourisme décrit « a 33 metre passenger vessel » : aucun tarif ni pont véhicule publié",
      "durationEstimated": true, name: 'Port-Vila ↔ Luganville (Espiritu Santo)',
      operator: 'Big Sista', durationH: 24, distanceKm: 276,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://www.vanuatu.travel/en/big-sista', date: '2026-09-23',
      note: "Office du tourisme de Vanuatu : « a 33 metre passenger vessel operating between Port Vila and Luganville Santo, stopping at Epi and Malekula along the way », départ le lundi soir, retour le jeudi. Durée : la traversée est « often advertised as a 24 hour journey » (guide Triton Explorers, départ 8 h, arrivée « usually around noon the following day ») — 24 h retenues, marquées estimées. Aucun prix n'est écrit : l'armateur n'a pas de site, seulement une page Facebook et deux guichets, et le seul montant trouvé (10 000 VUV l'aller, plus 1 000 VUV par bagage et 100 VUV de taxe de départ) vient d'un guide tiers. Distance mesurée entre les deux lieux publiés." }
  ]
};
