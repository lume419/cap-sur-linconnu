// Groupe « france » : collectivités d'outre-mer, dépendances de la Guadeloupe et îles de métropole sans pont routier.
// Recherches et vérification contre public/data/communes.txt : 16 septembre 2026.
// Taux InforEuro septembre 2026 : 1 EUR = 119.355 XPF.
// `fallthrough: true` : un lieu qu'aucune règle ne range garde la logique actuelle du moteur (continental, corsica,
// guadeloupe = Basse-Terre + Grande-Terre reliées par ponts, martinique, guyane, reunion, mayotte…).
module.exports = {
  landmass: {
    FR: {
      fallthrough: true,
      rules: [
        // ---------- Saint-Pierre-et-Miquelon (975) : les deux communes partagent le code postal 97500 ----------
        { key: 'saintPierre', match: { near: [{ name: 'Saint-Pierre', lat: 46.788, lon: -56.1805, km: 6 }] },
          note: "Île de Saint-Pierre (l'Île-aux-Marins, rattachée, n'a pas de lieu propre)." },
        { key: 'miquelon', match: { near: [{ name: 'Miquelon-Langlade', lat: 46.9711, lon: -56.3405, km: 15 }] },
          note: "Miquelon et Langlade forment une seule masse : isthme sableux de la Dune de Langlade parcouru par une route (non revêtue). Commune Miquelon-Langlade, point au bourg de Miquelon." },
        // ---------- Saint-Barthélemy (977), Saint-Martin (978) ----------
        { key: 'saintBarthelemy', match: { cpPrefix: ['97133'] }, note: 'Île entière, sans liaison routière.' },
        { key: 'saintMartinFR', match: { cpPrefix: ['97150'] },
          note: "Partie française de Saint-Martin. Frontière routière ouverte avec Sint Maarten (Pays-Bas), mais aucun lieu de Sint Maarten dans communes-nl.txt : masse propre à la France." },
        // ---------- Wallis-et-Futuna (986) ----------
        { key: 'wallis', match: { cpPrefix: ['98600'] }, note: 'Uvea (Wallis), circonscription unique de l’île.' },
        { key: 'futuna', match: { cpPrefix: ['98610', '98620'] },
          note: "Futuna : royaumes d'Alo et de Sigave (points sur Futuna). Alofi, qui dépend d'Alo, est quasi inhabitée et sans lieu propre ; pas de pont Futuna–Alofi." },
        // ---------- Clipperton (989) ----------
        { key: 'clipperton', match: { cpPrefix: ['98799'] }, note: 'Atoll inhabité. Placée AVANT les règles de Polynésie : son code 98799 commence par 987.' },
        // ---------- Polynésie française (987) : chaque commune est un point ; beaucoup couvrent plusieurs îles/atolls ----------
        { key: 'tahiti', match: { box: [[-17.92, -17.45, -149.65, -149.10]] },
          note: "Tahiti Nui + Tahiti Iti (isthme de Taravao, route) : Papeete, Faaa, Punaauia, Paea, Papara, Teva I Uta, Taiarapu-Est (y c. Tautira), Taiarapu-Ouest, Hitiaa O Te Ra, Mahina, Pirae (11 lieux) ; Arue par la règle suivante." },
        { key: 'tahiti', match: { cpPrefix: ['98701'] },
          note: "Arue : commune de Tahiti (entre Papeete et Mahina) dont le point du fichier est erroné (-17.0496, -149.5463, en mer ~50 km au nord) ; rangée par son code postal 98701, propre à Arue." },
        { key: 'moorea', match: { box: [[-17.65, -17.42, -150.00, -149.72]] },
          note: "Commune Moorea-Maiao, point sur Moorea ; elle couvre aussi Maiao (île distincte sans liaison), non représentable séparément." },
        { key: 'raiatea', match: { box: [[-16.95, -16.70, -151.52, -151.33]] },
          note: 'Raiatea : Uturoa, Taputapuatea, Tumaraa. Tahaa, dans le même lagon, n’est reliée par aucune route.' },
        { key: 'tahaa', match: { near: [{ name: 'Tahaa', lat: -16.6197, lon: -151.4907, km: 8 }] }, note: 'Tahaa (île distincte de Raiatea).' },
        { key: 'huahine', match: { near: [{ name: 'Huahine', lat: -16.7517, lon: -150.996, km: 10 }] },
          note: 'Huahine Nui et Huahine Iti reliées par un pont routier (Maroe).' },
        { key: 'boraBora', match: { near: [{ name: 'Bora-Bora', lat: -16.4376, lon: -151.7585, km: 8 }] },
          note: 'Commune Bora-Bora (couvre aussi l’atoll de Tupai).' },
        { key: 'maupiti', match: { near: [{ name: 'Maupiti', lat: -16.78, lon: -153.9401, km: 8 }] },
          note: 'Commune Maupiti (couvre aussi Manuae/Scilly, Motu One/Bellingshausen).' },
        { key: '*', match: { cpPrefix: ['987'] },
          note: "Tous les autres lieux de Polynésie isolés, un par commune : Tuamotu (Anaa, Arutua, Fakarava, Fangatau, Hao, Hikueru, Makemo, Manihi, Napuka, Nukutavake, Pukapuka, Rangiroa, Reao, Takaroa, Tatakoto, Tureia — chacune regroupe plusieurs atolls), Marquises (Nuku-Hiva, Hiva-Oa, Ua-Pou, Ua-Huka, Tahuata, Fatu-Hiva — Nuku-Hiva couvre Eiao/Hatutu, Hiva-Oa Mohotani), Australes (Tubuai, Rurutu, Rimatara, Raivavae, Rapa), Gambier (Mangareva + atolls)." },
        // ---------- Nouvelle-Calédonie (988) ----------
        { key: 'lifou', match: { cpPrefix: ['98820'] }, note: 'Lifou (commune couvrant aussi Tiga).' },
        { key: 'mare', match: { cpPrefix: ['98828'] }, note: 'Maré.' },
        { key: 'ouvea', match: { cpPrefix: ['98814'] }, note: 'Ouvéa (commune couvrant aussi Beautemps-Beaupré).' },
        { key: 'ileDesPins', match: { cpPrefix: ['98832'] }, note: "L'Île-des-Pins." },
        { key: 'belep', match: { cpPrefix: ['98811'] }, note: 'Bélep, point sur l’île Art.' },
        { key: 'grandeTerreNC', match: { cpPrefix: ['988'] },
          note: "Tout le reste : 28 communes de la Grande Terre (Poum, Le Mont-Dore, Yaté… ont leur point sur la Grande Terre ; leurs îlots n'ont pas de lieu propre)." },
        // ---------- Dépendances de la Guadeloupe (971) ; Basse-Terre + Grande-Terre restent `guadeloupe` ----------
        { key: 'marieGalante', match: { cpPrefix: ['97112', '97140', '97134'] }, note: 'Grand-Bourg, Capesterre-de-Marie-Galante, Saint-Louis.' },
        { key: 'terreDeHaut', match: { cpPrefix: ['97137'] }, note: 'Les Saintes : Terre-de-Haut.' },
        { key: 'terreDeBas', match: { cpPrefix: ['97136'] }, note: 'Les Saintes : Terre-de-Bas (île distincte, sans pont).' },
        { key: 'laDesirade', match: { cpPrefix: ['97127'] }, note: 'La Désirade.' },
        // ---------- Îles de métropole sans pont routier (commune entièrement insulaire, mairie sur l'île) ----------
        { key: 'yeu', match: { cpPrefix: ['85350'] }, note: "L'Île-d'Yeu (Vendée)." },
        { key: 'ileDAix', match: { cpPrefix: ['17123'] }, note: "Île-d'Aix (Charente-Maritime)." },
        { key: 'belleIle', match: { cpPrefix: ['56360'] }, note: 'Belle-Île-en-Mer : Le Palais, Bangor, Sauzon, Locmaria (code 56360 propre aux 4 communes).' },
        { key: 'groix', match: { cpPrefix: ['56590'] }, note: 'Groix.' },
        { key: 'houat', match: { near: [{ name: "Île-d'Houat", lat: 47.3865, lon: -2.9762, km: 3 }] },
          note: "Île-d'Houat (code 56170 partagé avec Quiberon : règle par proximité)." },
        { key: 'hoedic', match: { near: [{ name: 'Hœdic', lat: 47.3364, lon: -2.862, km: 3 }] },
          note: 'Hœdic (code 56170 partagé avec Quiberon : règle par proximité).' },
        { key: 'ileAuxMoines', match: { cpPrefix: ['56780'] }, note: 'Île-aux-Moines (golfe du Morbihan).' },
        { key: 'ileDArz', match: { cpPrefix: ['56840'] }, note: "Île-d'Arz (golfe du Morbihan)." },
        { key: 'ouessant', match: { cpPrefix: ['29242'] }, note: 'Ouessant.' },
        { key: 'molene', match: { cpPrefix: ['29259'] }, note: 'Île-Molène.' },
        { key: 'sein', match: { cpPrefix: ['29990'] }, note: 'Île-de-Sein.' },
        { key: 'batz', match: { cpPrefix: ['29253'] }, note: 'Île-de-Batz.' },
        { key: 'brehat', match: { cpPrefix: ['22870'] }, note: 'Île-de-Bréhat (Côtes-d’Armor).' }
        // Restent `continental` (pont, chaussée ou point sur le continent) : Ré (Ars-en-Ré… pont de Ré), Oléron (pont),
        // Noirmoutier + Barbâtre (pont de Noirmoutier), Île-Tudy (presqu'île), Le Mont-Saint-Michel (pont-passerelle),
        // Hyères (Porquerolles, Port-Cros, Le Levant), Granville (Chausey), Cannes (Lérins), Marseille (Frioul),
        // Six-Fours (Le Grand Rouveau / Embiez), Saint-Vaast-la-Hougue (Tatihou), Fouesnant (Glénan), Carantec (Callot),
        // Arzon, Sarzeau, Larmor-Baden, Quiberon, Batz-sur-Mer : mairie et point sur le continent ou sur une presqu'île.
      ]
    }
  },
  ferries: [
    { a: 'saintPierre', b: 'miquelon', routeKey: 'saintPierreMiquelon', "priceCovers": "vehicle", "coversSource": "grille SPM Ferries « véhicule accompagné » : occupants payant leur billet", "durationEstimated": true, name: 'Saint-Pierre ↔ Miquelon',
      operator: 'SPM Ferries (Collectivité territoriale de Saint-Pierre-et-Miquelon)', durationH: 1.25, distanceKm: 45,
      priceByClass: { 1: 40, 2: 70, 5: 25, foot: 16 },
      currency: 'EUR', original: { car: 40, van: 70, moto: 25, foot: 16 },
      source: 'https://www.spm-ferries.fr/wp-content/uploads/2026/08/TARIFS-vehicules-au-26-MAI-2026-FR.pdf', date: '2026-09-16',
      note: "Grille « Tarifs véhicule accompagné » au 26 mai 2026, colonne MIQUELON : 4RA véhicule de tourisme/camionnette ≤3,5 t, ≤6 m = 40 € ; CCAR A autocaravane/camping-car ≤4,5 t, ≤6 m = 70 € ; 2RB moto >125 cm3 = 25 €. Tarif « accompagné » : les occupants paient leur billet passager, donc prix du véhicule seul. La grille n'indique pas aller simple/aller-retour ; lue comme prix par traversée (la grille passagers distingue AS/AR, la grille véhicules donne un prix unique). Frais de manutention de 7 € non ajoutés (chargement par l'équipage). Passager adulte aller simple 16 € (AR 24 €), page https://www.spm-ferries.fr/horaires-et-tarifs/tarifs-2019/. Durée et distance : ordres de grandeur, non publiés sur la grille." },
    { a: 'tahiti', b: 'moorea', routeKey: 'papeeteVaiare', "priceCovers": null, "coversSource": "grille Aremiti : inclusion du conducteur non précisée", "durationEstimated": true, name: 'Papeete ↔ Vaiare (Moorea)',
      operator: 'Aremiti', durationH: 0.6, distanceKm: 20,
      priceByClass: { 1: 49.77, 2: 64.85, 5: 12.40, foot: 19.69 },
      currency: 'XPF', original: { car: 5940, van: 7740, moto: 1480, foot: 2350 },
      source: 'https://www.aremitiexpress.com/', date: '2026-09-16',
      note: "« Principaux tarifs au 19 juillet 2026 », aller simple. Classe 1 = véhicule M (<4,70 m) 5 940 XPF ; classe 2 = XL (>5,41 m) 7 740 XPF ; moto/scooter 1 480 XPF ; passager adulte tarif touriste (13 ans et +) 2 350 XPF (résident 1 650). La page ne dit pas si le conducteur est inclus : supposé non inclus. Conversion 1 EUR = 119.355 XPF. Durée ~30-40 min et distance ~20 km : ordres de grandeur (sources secondaires)." },
    { a: 'continental', b: 'yeu', routeKey: 'fromentineYeu', "priceCovers": null, "coversSource": "recueil tarifaire Yeu Continent : inclusion du conducteur non précisée", name: "Fromentine ↔ Port-Joinville (Île d'Yeu)",
      operator: 'Compagnie Yeu Continent (Aléop, Région Pays de la Loire)', durationH: 1.17, distanceKm: 25,
      priceByClass: { 1: 344.15, 2: 777.35, 5: 84.50, foot: 20.00 },
      currency: 'EUR', original: { car: 344.15, van: 777.35, moto: 84.50, foot: 20.00 },
      source: 'https://www.yeu-continent.fr/wp-content/uploads/2025/12/RECUEIL-MARCHANDISE-2026_compressed.pdf', date: '2026-09-16',
      note: "Recueil tarifaire 2026, tarifs « Continentaux », prix TTC « aller ou retour » (par traversée) sur le navire mixte Insula Oya III (70 min), réservation obligatoire : véhicule de tourisme 4 m à 4,50 m = 344,15 € (page web : 688,30 € l'aller-retour, cohérent) ; camping-car 3,50 m à 6 m = 777,35 € (entrée des camping-cars soumise à l'autorisation d'accès au camping municipal) ; moto ≥250 cm3 = 84,50 € (page web : 169,00 € AR). Forfait réservation 2,60 € non ajouté. Passager adulte (26 ans et +) navire mixte 40,00 € toute l'année (https://www.yeu-continent.fr/traversee-ile-yeu/passagers-2026/, image tarifaire), lu comme aller-retour (le tableau voisin est titré « tarifs aller et retour 2026 ») -> 20,00 € par traversée. Les véhicules des non-résidents SONT acceptés (tarif « continentaux » publié). Distance ~25 km : ordre de grandeur." }
  ]
};
