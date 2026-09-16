// Groupe « ausnz » : Australie (AU) et Nouvelle-Zélande (NZ).
// Recherches et vérification contre public/data/communes-au.txt / communes-nz.txt : 16 septembre 2026.
// Taux InforEuro septembre 2026 : 1 EUR = 1.6183 AUD = 1.9585 NZD.
// NB : de nombreuses îles citées dans la consigne n'ont AUCUN lieu dans les fichiers (vérifié) : îles du détroit de
// Torres (Thursday, Horn, Badu, Saibai…), Lord Howe, Mornington (Gununa), Bathurst (Wurrumiyanga), Daydream, Keppel,
// Dunk, Palm, îles de la baie de Moreton du sud (Russell, Macleay, Lamb, Karragarra, Coochiemudlo), Dunwich/Point
// Lookout/Amity (Stradbroke Nord), Maria Island ; en NZ : Chatham/Pitt, Kermadec, Arapawa, Motutapu/Rangitoto, Ruapuke.
module.exports = {
  landmass: {
    AU: {
      default: 'australia',
      rules: [
        // --- Tasmanie et détroit de Bass ---
        { key: 'bruny', match: { box: [[-43.65, -43.29, 147.08, 147.50], [-43.29, -43.20, 147.28, 147.50], [-43.20, -43.05, 147.30, 147.50]] },
          note: "Bruny Island (North + South Bruny, reliées par l'isthme routier « The Neck ») : South Bruny, Lunawanna, Alonnah, Adventure Bay, Point Labillardiere, Simpsons Bay, Great Bay, Barnes Bay, North Bruny, Dennes Point. Aucun pont : ferry SeaLink Kettering–Roberts Point. Gordon, Middleton, Flowerpot, Kettering (rive continentale du canal D'Entrecasteaux) restent en Tasmanie." },
        { key: 'kingIsland', match: { box: [[-40.20, -39.50, 143.70, 144.30]] },
          note: 'King Island (Currie, Grassy, Naracoopa, Egg Lagoon…). Aucun ferry passagers/véhicules régulier (fret seulement).' },
        { key: 'flinders', match: { box: [[-40.30, -39.60, 147.60, 148.50]] },
          note: 'Flinders Island (Whitemark, Lady Barron, Loccota, Emita, Killiecrankie, Palana…). Cape Barren Island (au sud de 40,30° S) est une île distincte.' },
        { key: '*', match: { near: [{ name: 'Cape Barren Island', lat: -40.3734, lon: 148.0270, km: 6 }, { name: 'Three Hummock Island', lat: -40.4361, lon: 144.9065, km: 4 }] },
          note: 'Cape Barren Island et Three Hummock Island, sans lien routier : isolées.' },
        { key: 'tasmania', match: { regions: ['Tasmania'] }, note: "Île principale de Tasmanie (y compris la péninsule de Tasman, reliée par l'isthme d'Eaglehawk Neck)." },
        // --- Victoria ---
        { key: 'raymondIsland', match: { near: [{ name: 'Raymond Island', lat: -37.9167, lon: 147.7333, km: 0.6 }] },
          note: "Raymond Island (lacs Gippsland) : bac du comté d'East Gippsland depuis Paynesville (Paynesville est à 1,2 km, d'où le rayon de 0,6 km)." },
        { key: 'frenchIsland', match: { near: [{ name: 'Tankerton', lat: -38.3872, lon: 145.2915, km: 4 }] },
          note: "French Island (Western Port) : aucun pont. Phillip Island (pont San Remo–Newhaven) reste en 'australia'." },
        // --- Australie-Méridionale ---
        { key: 'kangarooIsland', match: { box: [[-36.20, -35.55, 136.50, 138.08]] },
          note: "Kangaroo Island (Kingscote, Penneshaw, American River, Antechamber Bay…). Cape Jervis (138,11° E) reste sur le continent. Hindmarsh Island (pont de 2001) et Mundoo Island (barrage routier) restent en 'australia', de même que Weeroona Island (chaussée)." },
        { key: '*', match: { near: [
          { name: 'Red Cliffs (Wardang Island)', lat: -34.4777, lon: 137.3657, km: 3 },
          { name: 'Boston Island', lat: -34.6906, lon: 135.9165, km: 2 },
          { name: 'Wedge Island', lat: -35.1546, lon: 136.4589, km: 3 }
        ] }, note: 'Petites îles sans lien routier (Wardang, Boston, Wedge) : chaque lieu isolé.' },
        // --- Australie-Occidentale ---
        { key: 'rottnest', match: { near: [{ name: 'Rottnest Island', lat: -31.9952, lon: 115.5404, km: 8 }] },
          note: "Rottnest Island (voitures particulières interdites). Garden Island est reliée par la chaussée routière de Point Peron (Rockingham) : reste en 'australia'." },
        // --- Territoire du Nord ---
        { key: 'melvilleIsland', match: { box: [[-11.80, -11.20, 130.00, 131.60]] },
          note: 'Îles Tiwi : lieux présents uniquement sur Melville (Milikapiti, Gribbles Settlement, Pirlangimpi, Pularumpi). Bathurst (séparée par le détroit d’Apsley, sans pont) : aucun lieu.' },
        { key: 'milingimbi', match: { near: [{ name: 'Milingimbi', lat: -12.1019, lon: 134.9190, km: 4 }] }, note: 'Milingimbi Island (Crocodile Islands), avec Bodia.' },
        { key: '*', match: { near: [{ name: 'Bayagida', lat: -12.0396, lon: 134.9296, km: 1 }] }, note: 'Bayagida (Crocodile Islands, île incertaine) : isolé.' },
        { key: 'elcho', match: { box: [[-12.12, -11.50, 135.40, 136.30]] }, note: 'Elcho Island (Galiwinku, Galawarra, Nikawu).' },
        { key: 'southGoulburn', match: { near: [{ name: 'Warruwi', lat: -11.6577, lon: 133.3782, km: 4 }] }, note: 'South Goulburn Island (Warruwi, Goulburn Island Mission).' },
        { key: 'croker', match: { near: [{ name: 'Minjilang', lat: -11.1490, lon: 132.5780, km: 5 }] }, note: 'Croker Island (Minjilang).' },
        { key: 'grooteEylandt', match: { box: [[-14.30, -13.60, 136.25, 136.95]] },
          note: 'Groote Eylandt (Alyangula, Angurugu, Anindilyakwa, Malkala, Bardalumba, Ngadumiyerrka). Marraya (135,80° E) est sur le continent.' },
        // --- Queensland ---
        { key: '*', match: { near: [
          { name: 'Njinjilki (Bentinck Island)', lat: -17.0909, lon: 139.5656, km: 3 },
          { name: 'Lizard Island', lat: -14.6641, lon: 145.4640, km: 3 },
          { name: 'Arcadia (Magnetic Island)', lat: -19.1488, lon: 146.8660, km: 3 },
          { name: 'Olden Island', lat: -20.0992, lon: 148.5717, km: 1.5 },
          { name: 'Hayman Island', lat: -20.0511, lon: 148.8849, km: 2 },
          { name: 'Hook Island', lat: -20.1093, lon: 148.9228, km: 3 },
          { name: 'Hamilton Island', lat: -20.3460, lon: 148.9519, km: 2.5 },
          { name: 'Lindeman Island', lat: -20.4483, lon: 149.0390, km: 2.5 },
          { name: 'Quoin Island', lat: -23.8047, lon: 151.2855, km: 0.8 },
          { name: 'Campaign Island', lat: -23.7829, lon: 151.2566, km: 0.8 },
          { name: 'St Helena Island', lat: -27.3869, lon: 153.2344, km: 1.2 },
          { name: 'Peel Island', lat: -27.4985, lon: 153.3553, km: 1.5 }
        ] }, note: "Îles sans lien routier et sans ferry tarifé retenu : chaque lieu isolé (Magnetic Island : seul lieu Arcadia ; Whitsundays : Hamilton, Hook, Hayman, Lindeman, Olden)." },
        { key: 'curtisIsland', match: { near: [{ name: 'Southend', lat: -23.7563, lon: 151.3105, km: 3 }] },
          note: 'Curtis Island (Southend, « Gladstone Harbour » 2,6 km au SE) : aucun pont.' },
        { key: 'kgari', match: { box: [[-25.65, -24.60, 153.00, 153.40]] },
          note: "K'gari / Fraser Island (Eurong, Kingfisher Bay, Happy Valley, Orchid Beach). Inskip et River Heads restent sur le continent." },
        { key: 'moreton', match: { box: [[-27.38, -27.00, 153.36, 153.50]] },
          note: 'Moreton Island (Kooringal, Tangalooma, Cowan Cowan, Bulwer, Cape Moreton…). Bribie Island (pont routier) reste en australia.' },
        { key: 'northStradbroke', match: { box: [[-27.75, -27.42, 153.395, 153.56]] },
          note: "North Stradbroke / Minjerribah (Myora, Wallen Wallen, Canalpin — Dunwich, Amity, Point Lookout absents du fichier). Moondarewa (153,43° E, 27,93° S, pointe de la Spit de Southport) et Paradise Island (canal, pont) restent en australia." },
        // --- Nouvelle-Galles du Sud ---
        { key: '*', match: { near: [{ name: 'Comerong Island', lat: -34.8654, lon: 150.7365, km: 1 }] },
          note: "Comerong Island : uniquement bac à câble du conseil de Shoalhaven (Numbaa). Les îles fluviales de la Clarence, de la Manning, etc. (Woodford, Chatsworth, Harwood, Palmers, Oxley, Mitchells…) sont reliées par des ponts routiers : australia." }
      ]
    },
    NZ: {
      default: 'northIsland',
      rules: [
        { key: 'rakiura', match: { box: [[-47.50, -46.70, 167.30, 168.40]] },
          note: "Stewart Island / Rakiura (Oban, Halfmoon Bay). Bluff (46,60° S) reste sur l'île du Sud. Ferry RealNZ Bluff–Oban : passagers seulement." },
        { key: 'durville', match: { near: [{ name: 'Kapowai', lat: -40.9000, lon: 173.8333, km: 2 }, { name: 'Greville Harbour', lat: -40.8167, lon: 173.8000, km: 3 }] },
          note: "D'Urville Island (Kapowai, Greville Harbour), séparée de French Pass par un chenal sans pont. Admiralty Bay et Hamilton Bay (continent) sont à plus de 5 km." },
        { key: 'southIsland', match: { box: [[-47.50, -40.40, 166.00, 174.45]] },
          note: "Île du Sud. Aucun lieu de l'île du Nord à l'ouest de 174,45° E et au sud de 40,40° S (Wellington/Makara ≥ 174,70° E). Arapawa : aucun lieu (Onapua, Te Weka, Whangakoko sont sur la rive sud du Tory Channel)." },
        { key: 'greatBarrier', match: { box: [[-36.35, -35.95, 175.25, 175.60]] },
          note: 'Great Barrier / Aotea (Tryphena, Medlands, Okupu, Whangaparapara, Port Fitzroy, Okiwi, Motairehe).' },
        { key: 'waiheke', match: { box: [[-36.84, -36.76, 174.98, 175.17]] },
          note: 'Waiheke (Oneroa, Blackpool, Surfdale, Ostend, Palm Beach, Onetangi, Putiki, Omiha, Awaroa, Cowes).' },
        { key: '*', match: { near: [{ name: 'Pakatoa', lat: -36.7970, lon: 175.1945, km: 1 }] }, note: 'Pakatoa Island, distincte de Waiheke.' },
        { key: 'kawau', match: { box: [[-36.44, -36.40, 174.81, 174.87]] },
          note: "Kawau Island (Mansion House, Kawau Island, North Cove). Tawharanui (174,80° E) et Mullet Point restent sur l'île du Nord." },
        { key: '*', match: { near: [{ name: 'Opunui Marae (Matakana Island)', lat: -37.6389, lon: 176.1119, km: 0.5 }, { name: 'Rangiwaea Marae', lat: -37.6375, lon: 176.1222, km: 0.5 }] },
          note: 'Matakana et Rangiwaea (port de Tauranga), sans pont : chaque lieu isolé.' }
        // Coutts Island, Rangitata Island, Mataura Island : localités fluviales/terrestres reliées par la route → southIsland.
      ]
    }
  },
  ferries: [
    { a: 'australia', b: 'raymondIsland', routeKey: 'paynesvilleRaymondIsland', name: 'Paynesville ↔ Raymond Island',
      operator: 'East Gippsland Shire Council', durationH: 0.07, distanceKm: 0.3,
      priceByClass: { 1: 5.56, 2: 5.56, 5: 2.78, foot: 0 },
      currency: 'AUD', original: { car: 9, van: 9, moto: 4.5, foot: 0 },
      source: 'https://www.eastgippsland.vic.gov.au/roads-transport-and-infrastructure/raymond-island-ferry', date: '2026-09-16',
      note: "Grille du conseil en vigueur au 1er juillet 2026, tarifs ALLER-RETOUR payés à l'embarquement : Car/Van/Ute 18 AUD, Motorcycle 9 AUD, piétons (vélos inclus) gratuits ; divisés par deux pour un aller simple (9 / 4,5). Occupants non facturés (tarif par véhicule). Classe 2 = catégorie « Car/Van/Ute » (un camping-car lourd relèverait de « Truck/Bus » 29 AUD A/R). Traversée « about four minutes » ; distance ≈ 0,3 km estimée, non publiée." }
  ]
};
