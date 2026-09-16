// Groupe « caraibes » : Grandes et Petites Antilles, Bahamas, Turks-et-Caïcos, Caïmans, îles ABC.
// Recherches et vérification contre public/data/communes-xx.txt : 16 septembre 2026.
// Taux InforEuro septembre 2026 : 1 EUR = 1.1643 USD = 3.15525 XCD = 7.9079 TTD.
// Distances : orthodromie entre les ports (ordre de grandeur) ; durées : horaires publiés quand disponibles, sinon
// estimation signalée dans la note.
module.exports = {
  landmass: {
    // ------------------------------------------------------------------ Grandes Antilles
    CU: { default: 'cuba', rules: [
      { key: 'islaDeLaJuventud', match: { box: [[21.40, 21.95, -83.20, -82.55]] },
        note: 'Île de la Jeunesse (Nueva Gerona, La Fe/Santa Fe, Cocodrilo…) : 163 lieux de la région « Isla de la Juventud ».' },
      { key: 'cayoLargo', match: { box: [[21.55, 21.70, -81.70, -81.35]] },
        note: 'Cayo Largo del Sur (municipalité spéciale Isla de la Juventud) : aucune liaison routière ni ferry véhicules ; île isolée.' }
      // Restent `cuba` : Cayo Coco, Cayo Guillermo (pedraplén de Jardines del Rey), Cayo Ensenachos/Santa María
      // (pedraplén de Caibarién), Cayo Sabinal, Cayo Romano/Paredón Grande (pedraplenes). De nombreux « Cayo … »
      // du fichier sont des hameaux de l'île principale.
    ] },
    JM: { default: 'jamaica', rules: [] },
    HT: { default: 'hispaniola', rules: [
      { key: 'gonave', match: { box: [[18.68, 18.90, -73.32, -72.795]] },
        note: "Île de la Gonâve (Anse-à-Galets, Pointe-à-Raquette…). Lon max -72.795 : exclut « Giromond » (région Centre, point en mer, laissé sur Hispaniola) ; Délugé et Pinard (Artibonite, lat 18.97) sont sur le continent." },
      { key: 'ileTortue', match: { box: [[19.985, 20.10, -72.95, -72.60]] }, note: 'Île de la Tortue (Palmiste, Basse-Terre, Cayonne…).' },
      { key: 'ileAVache', match: { box: [[18.03, 18.12, -73.72, -73.55]] }, note: 'Île-à-Vache (La Hatte, Trou Milieu, Pointe des Baleines…).' },
      { key: 'grandeCayemite', match: { box: [[18.595, 18.65, -73.80, -73.66]] },
        note: "Grande et Petite Cayemite (Pointe Sable, Anse du Nord, Mare Citron, Plaine Ananas, Zétrois, Baboquette, Cacajou, Décidou). Points à ±1 km : limite nord de la côte de Pestel incertaine." }
    ] },
    DO: { default: 'hispaniola', rules: [
      { key: 'saona', match: { box: [[18.10, 18.20, -68.80, -68.55]] },
        note: "Isla Saona (Mano Juan : Adamanay, Boca Chica ; Catuano, pointe ouest). El Algibe (18.211) laissé sur le continent. Catalina et Beata : aucun lieu dans le fichier." }
    ] },
    PR: { default: 'puertoRico', rules: [
      { key: 'culebra', match: { box: [[18.28, 18.35, -65.35, -65.20]] },
        note: "Culebra (5 lieux). Vieques n'a aucun lieu dans communes-pr.txt. Ferry cargo Ceiba ↔ Culebra : véhicules des seuls résidents → île isolée." }
    ] },
    // ------------------------------------------------------------------ Îles Vierges
    VI: { default: 'saintCroix', rules: [
      { key: 'saintThomasVI', match: { box: [[18.28, 18.40, -65.10, -64.83]] }, note: 'Saint Thomas.' },
      { key: 'saintJohnVI', match: { box: [[18.28, 18.38, -64.80, -64.65]] }, note: 'Saint John.' }
    ] },
    VG: { default: 'tortola', rules: [
      { key: 'anegada', match: { box: [[18.65, 18.80, -64.45, -64.20]] }, note: 'Anegada (The Settlement).' },
      { key: 'virginGorda', match: { box: [[18.40, 18.52, -64.46, -64.35]] }, note: 'Virgin Gorda (Spanish Town, North Sound…).' },
      { key: 'jostVanDyke', match: { box: [[18.43, 18.47, -64.77, -64.715]] }, note: 'Jost Van Dyke (Great Harbour/Cotton Ground, Little Harbour, Belle Vue…).' }
      // Reste `tortola` : Tortola + Beef Island (pont Queen Elizabeth II, « The Mill ») + Frenchman's Cay (pont).
    ] },
    // ------------------------------------------------------------------ Bahamas
    BS: { default: '*', rules: [
      { key: '*', match: { box: [[27.10, 27.35, -78.50, -78.20]] }, note: 'Grand Cay, Walker Cay (îles distinctes, sans route vers Abaco).' },
      { key: '*', match: { near: [{ name: 'Water Cay', lat: 26.750, lon: -78.500, km: 3 }, { name: 'Sweeting Cay', lat: 26.613, lon: -77.869, km: 3 }] },
        note: 'Water Cay et Sweetings Cay : cayes au large de Grand Bahama, aucun pont routier vérifié.' },
      { key: 'grandBahama', match: { box: [[26.40, 26.80, -79.05, -77.95]] }, note: 'Grand Bahama (Freeport, Lucaya, West End, High Rock, McLean’s Town ; « Freetown » région North Abaco mais point sur Grand Bahama).' },
      { key: '*', match: { near: [
        { name: 'Hope Town (Elbow Cay)', lat: 26.539, lon: -76.957, km: 3 },
        { name: 'Man-O-War Cay', lat: 26.595, lon: -77.001, km: 2 },
        { name: 'Great Guana Cay', lat: 26.667, lon: -77.108, km: 2 },
        { name: 'Green Turtle Cay', lat: 26.758, lon: -77.325, km: 2 } ] },
        note: "Cayes d'Abaco sans pont (Elbow, Man-O-War, Great Guana, Green Turtle)." },
      { key: 'mooresIsland', match: { box: [[26.25, 26.36, -77.62, -77.50]] }, note: "Moore's Island (The Bight, Hard Bargain)." },
      { key: 'abaco', match: { box: [[25.80, 27.00, -77.95, -76.95]] }, note: 'Great Abaco + Little Abaco (chaussée) : Marsh Harbour, Treasure Cay, Cooper’s Town, Crown Haven, Sandy Point…' },
      { key: 'northBimini', match: { box: [[25.715, 25.80, -79.35, -79.25]] }, note: 'North Bimini (Alice Town, Bailey Town, Bluff).' },
      { key: 'currentIsland', match: { near: [{ name: 'Current Island', lat: 25.340, lon: -76.825, km: 3 }] }, note: 'Current Island (Current Island Settlement, Little Bay).' },
      { key: '*', match: { near: [{ name: 'Harbour Island', lat: 25.502, lon: -76.636, km: 2.5 }, { name: 'Spanish Wells', lat: 25.547, lon: -76.764, km: 2.5 }] },
        note: 'Harbour Island (Dunmore Town) et Spanish Wells : îles distinctes, Bo Hengy III passagers seulement.' },
      { key: 'eleuthera', match: { box: [[24.60, 25.52, -76.80, -76.10]] },
        note: "Eleuthera (Glass Window Bridge ouvert) : Governor's Harbour, Rock Sound/Tarpum Bay, Gregory Town, The Bluff, Current ; Bannerman Town, Millars, John Millars, Wemyss Bight rangés en région « New Providence » mais situés au sud d'Eleuthera." },
      { key: 'newProvidence', match: { box: [[24.95, 25.12, -77.60, -76.95]] }, note: 'New Providence (Nassau ; Paradise Island reliée par ponts, sans lieu propre). « Pinewood Gardens Estate » (-77.0, point décalé en mer) y est rangé.' },
      { key: 'mangroveCay', match: { box: [[24.212, 24.31, -77.70, -77.60]] }, note: 'Mangrove Cay (Lisbon Creek, Moxey Town) : île distincte d’Andros Nord et Sud.' },
      { key: 'southAndros', match: { box: [[23.80, 24.212, -77.65, -77.45]] }, note: 'South Andros (Driggs Hill, Congo Town, Kemps Bay, Mars Bay ; « Black Point » 23.983 -77.55, point décalé).' },
      { key: 'northAndros', match: { box: [[24.40, 25.25, -78.25, -77.65]] }, note: 'North + Central Andros (route Nicholls Town – Fresh Creek – Behring Point).' },
      { key: '*', match: { box: [[23.90, 24.20, -76.50, -76.20]] }, note: 'Cayes des Exumas (Little Farmer’s Cay, Black Point/Great Guana Cay).' },
      { key: 'greatExuma', match: { box: [[23.38, 23.75, -76.10, -75.50]] }, note: 'Great Exuma + Little Exuma (pont de The Ferry).' },
      { key: 'catIsland', match: { box: [[24.05, 24.70, -75.75, -75.25]] }, note: 'Cat Island.' },
      { key: 'longIsland', match: { box: [[22.80, 23.70, -75.35, -74.82]] }, note: 'Long Island.' },
      { key: 'rumCay', match: { box: [[23.62, 23.72, -74.90, -74.78]] }, note: 'Rum Cay (Port Nelson, Port Boyd).' },
      { key: 'sanSalvador', match: { box: [[23.60, 24.15, -74.58, -74.40]] }, note: 'San Salvador (Cockburn Town…; « Sugar Loaf » 23.65, point décalé).' },
      { key: 'crookedIsland', match: { box: [[22.66, 22.90, -74.34, -74.03]] }, note: 'Crooked Island (Colonel Hill, Landrail Point, French Wells…).' },
      { key: 'acklins', match: { box: [[22.00, 22.72, -74.30, -73.80]] }, note: 'Acklins (Spring Point, Snug Corner, Lovely Bay…) : le bac Lovely Bay ↔ Cove Point (Crooked) est une petite navette passagers.' },
      { key: 'mayaguana', match: { box: [[22.30, 22.50, -73.20, -72.90]] }, note: "Mayaguana (Abraham's Bay, Betsy Bay, Pirates Well)." }
      // default '*' : Inagua (Matthew Town), Ragged Island (Duncan Town), Long Cay (Albert Town), South Bimini
      // (Port Royal), Cat Cays/Gun Cay/Louis Town, Berry Islands (Chub Cay, Bullocks Harbour).
    ] },
    // ------------------------------------------------------------------ Turks-et-Caïcos, Caïmans
    TC: { default: '*', rules: [
      { key: 'providenciales', match: { box: [[21.70, 21.85, -72.35, -72.15]] }, note: 'Providenciales.' },
      { key: 'northMiddleCaicos', match: { box: [[21.78, 22.00, -72.10, -71.60]] }, note: 'North Caicos + Middle Caicos, reliées par la chaussée (causeway) routière.' },
      { key: 'southCaicos', match: { box: [[21.45, 21.55, -71.60, -71.45]] }, note: 'South Caicos (Cockburn Harbour).' },
      { key: 'saltCay', match: { box: [[21.30, 21.35, -71.25, -71.18]] }, note: 'Salt Cay (Balfour Town).' },
      { key: 'grandTurk', match: { box: [[21.40, 21.52, -71.18, -71.10]] }, note: 'Grand Turk (Cockburn Town).' }
    ] },
    KY: { default: 'grandCayman', rules: [
      { key: 'littleCayman', match: { box: [[19.60, 19.75, -80.15, -79.93]] }, note: 'Little Cayman (Blossom Village/South Town, Head of Bay, Callabash Spot).' },
      { key: 'caymanBrac', match: { box: [[19.65, 19.80, -79.93, -79.70]] }, note: 'Cayman Brac.' }
    ] },
    // ------------------------------------------------------------------ Petites Antilles
    KN: { default: 'stKitts', rules: [
      { key: 'nevis', match: { box: [[17.08, 17.23, -62.66, -62.50]] }, note: 'Nevis (Charlestown, Gingerland, Newcastle…).' }
    ] },
    AG: { default: 'antigua', rules: [
      { key: 'barbuda', match: { box: [[17.50, 17.80, -61.95, -61.70]] }, note: 'Barbuda (Codrington…).' }
    ] },
    AI: { default: 'anguilla', rules: [] },
    MS: { default: 'montserrat', rules: [] },
    SX: { default: 'saintMartinFR', rules: [] },
    BQ: { default: 'bonaire', rules: [
      { key: 'saba', match: { box: [[17.58, 17.68, -63.27, -63.20]] }, note: 'Saba.' },
      { key: 'sintEustatius', match: { box: [[17.44, 17.52, -63.00, -62.93]] }, note: 'Saint-Eustache (Oranjestad).' }
      // Reste `bonaire` ; Klein Bonaire n'a aucun lieu.
    ] },
    AW: { default: 'aruba', rules: [] },
    CW: { default: 'curacao', rules: [] },
    DM: { default: 'dominica', rules: [] },
    LC: { default: 'saintLucia', rules: [] },
    BB: { default: 'barbados', rules: [] },
    VC: { default: 'stVincent', rules: [
      { key: 'bequia', match: { box: [[12.97, 13.03, -61.30, -61.20]] }, note: 'Bequia (Port Elizabeth, Paget Farm…).' },
      { key: 'mustique', match: { box: [[12.85, 12.92, -61.21, -61.16]] }, note: 'Mustique (Lovell Village, Dovers, Cheltenham, Royston Park).' },
      { key: 'canouan', match: { box: [[12.68, 12.74, -61.36, -61.30]] }, note: 'Canouan (Charlestown).' },
      { key: 'mayreau', match: { box: [[12.62, 12.66, -61.41, -61.37]] }, note: 'Mayreau (Old Wall).' },
      { key: 'unionIsland', match: { box: [[12.57, 12.615, -61.45, -61.40]] }, note: 'Union Island (Clifton, Ashton…).' }
    ] },
    GD: { default: 'grenada', rules: [
      { key: 'petiteMartinique', match: { box: [[12.50, 12.54, -61.40, -61.37]] }, note: 'Petite Martinique (Madame Pierre, Sanchez, Paradise…).' },
      { key: 'carriacou', match: { box: [[12.40, 12.54, -61.50, -61.41]] }, note: 'Carriacou (Hillsborough, Windward, L’Esterre…).' }
    ] },
    TT: { default: 'trinidad', rules: [
      { key: 'tobago', match: { box: [[11.10, 11.40, -60.95, -60.45]] }, note: 'Tobago (89 lieux région « Tobago » + Crown Point, Golden Grove, Signal Hill, Orange Hill, Batteaux Bay sans région).' }
    ] }
  },

  ferries: [
    { a: 'hispaniola', b: 'puertoRico', routeKey: 'santoDomingoSanJuan', name: 'Santo Domingo ↔ San Juan',
      operator: 'Ferries del Caribe', durationH: 14, distanceKm: 398,
      priceByClass: { 1: 257.67, 2: 343.55, 5: 206.13, foot: null },
      currency: 'USD', original: { car: 300, van: 400, moto: 240, foot: null },
      source: 'https://ferriesdelcaribe.com/tarifas.php ; https://www.ferryhopper.com/en/ferry-routes/direct/santo-domingo-san-juan',
      date: '2026-09-16',
      note: "Grille véhicules publiée par l'opérateur (aller simple) : catégorie A berline 300 USD, van 400 USD (classe 2 ; SUV/pick-up 340 USD), moto 240 USD ; camping-cars facturés 23,50 USD le pied linéaire. Passager : « derecho de embarque » non publié (varie selon la date) → foot null. Formalités lourdes (titre, douane IVF, 30 jours max en RD). Durée ~14 h (Ferryhopper), 3 traversées/semaine. Distance : orthodromie." },
    { a: 'trinidad', b: 'tobago', routeKey: 'portOfSpainScarborough', name: 'Port of Spain ↔ Scarborough',
      operator: 'Trinidad and Tobago Inter-Island Transportation Company (TTIT)', durationH: 3, distanceKm: 104,
      priceByClass: { 1: 18.55, 2: null, 5: null, foot: 9.48 },
      currency: 'TTD', original: { car: 146.73, van: null, moto: null, foot: 75 },
      source: 'https://www.ttitferry.com/fares/',
      date: '2026-09-16',
      note: "Grille officielle : Car/SUV (véhicule léger privé, location ou taxi) 146,73 TTD aller, conducteur exclu ; passager adulte classe économique 75 TTD. Vans « T » facturés au poids (fret) et motos non listées → null. Durée ~3 h (ordre de grandeur des fast ferries, non affichée sur la page tarifs). Distance : orthodromie entre les ports." },
    { a: 'saintThomasVI', b: 'saintJohnVI', routeKey: 'redHookCruzBay', name: 'Red Hook ↔ Cruz Bay',
      operator: 'Love City Car Ferries', durationH: 0.5, distanceKm: 5.4,
      priceByClass: { 1: 55.83, 2: null, 5: null, foot: null },
      currency: 'USD', original: { car: 65, van: null, moto: null, foot: null },
      source: 'https://www.lovecitycarferries.com/rates-fares.html',
      date: '2026-09-16',
      note: "Barge véhicules : 65 USD aller (80 USD aller-retour) pour voiture, SUV ou petit camion, passagers du véhicule gratuits. Véhicules commerciaux/surdimensionnés sur devis → classe 2 null ; motos non publiées. Taxe portuaire de Red Hook (3 USD voiture) en sus. Piétons : ferries passagers distincts → foot null. Durée : estimation (~30 min), non publiée par l'opérateur. Autres barges (Boyson, Global Marine) sur la même paire." },
    { a: 'stKitts', b: 'nevis', routeKey: 'majorsBayCadesBay', name: "Major's Bay ↔ Cades Bay",
      operator: 'Sea Bridge', durationH: 0.4, distanceKm: 6.3,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://www.nevisisland.com/plan/ferry-services ; https://stkittscarrental.com/nevis-ferry-guide-how-to-get-from-st-kitts-to-nevis/',
      date: '2026-09-16',
      note: "Ferry véhicules existant (office du tourisme de Nevis). Aucune grille officielle publiée : seuls des guides tiers indiquent « environ 150 XCD aller-retour voiture + conducteur, 50 XCD par passager » → non retenu. Durée 20–25 min (guides)." },
    { a: 'grenada', b: 'carriacou', routeKey: 'stGeorgesTyrrelBay', name: "St. George's ↔ Tyrrel Bay",
      operator: 'Tyrrel Bay Express (Pyxis Shipping)', durationH: 4, distanceKm: 54,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://tyrrelbayexpress.com/',
      date: '2026-09-16',
      note: "Navire passagers + véhicules (voitures, motos, camions), mardi/jeudi/samedi (départ Carriacou 5 h, Grenade 17 h). Tarifs uniquement dans le module de réservation (booking.pyxisshipping.com), non lisibles. Durée : estimation pour un navire mixte lent (non publiée). Osprey Lines (passagers seulement) ; Dolly C hors service depuis mars 2025." },
    { a: 'stVincent', b: 'bequia', routeKey: 'kingstownPortElizabeth', name: 'Kingstown ↔ Port Elizabeth',
      operator: 'Bequia Express', durationH: 1, distanceKm: 16,
      priceByClass: { 1: 11.09, 2: 17.43, 5: 0, foot: 7.92 },
      currency: 'XCD', original: { car: 60, van: 80, moto: 25, foot: 25 },
      source: 'https://bequiaexpress.com/fares/',
      date: '2026-09-16',
      note: "Grille officielle aller simple, « vehicle fare includes driver » : voiture 60, minibus 80 (classe 2), moto 25 XCD, adulte 25 XCD ; véhicule seul = tarif − 25 (moto : 0). Admiral Ferries prend aussi des véhicules (tarif sur demande). Durée : ~1 h (estimation usuelle)." },
    { a: 'stVincent', b: 'canouan', routeKey: 'kingstownCanouan', name: 'Kingstown ↔ Canouan',
      operator: 'Bequia Express', durationH: 3, distanceKm: 52,
      priceByClass: { 1: 44.37, 2: 60.22, 5: null, foot: 19.02 },
      currency: 'XCD', original: { car: 200, van: 250, moto: 50, foot: 60 },
      source: 'https://bequiaexpress.com/fares/',
      date: '2026-09-16',
      note: "Grille officielle, conducteur inclus : voiture 200, minibus 250, moto 50 XCD ; adulte 60 XCD. Véhicule seul = tarif − 60 ; moto (50 < 60) incohérente → null. Service Kingstown → Canouan → Mayreau → Union lun/mer/jeu, retour mar/ven. Durée : estimation." },
    { a: 'canouan', b: 'mayreau', routeKey: 'canouanMayreau', name: 'Canouan ↔ Mayreau',
      operator: 'Bequia Express', durationH: 0.75, distanceKm: 10,
      priceByClass: { 1: 23.77, 2: 30.11, 5: 7.92, foot: 7.92 },
      currency: 'XCD', original: { car: 100, van: 120, moto: 50, foot: 25 },
      source: 'https://bequiaexpress.com/fares/',
      date: '2026-09-16',
      note: 'Grille officielle, conducteur inclus : voiture 100, minibus 120, moto 50 XCD ; adulte 25 XCD ; véhicule seul = tarif − 25. Durée : estimation.' },
    { a: 'mayreau', b: 'unionIsland', routeKey: 'mayreauUnionIsland', name: 'Mayreau ↔ Clifton (Union Island)',
      operator: 'Bequia Express', durationH: 0.5, distanceKm: 5.2,
      priceByClass: { 1: 9.51, 2: 6.34, 5: 3.17, foot: 6.34 },
      currency: 'XCD', original: { car: 50, van: 40, moto: 30, foot: 20 },
      source: 'https://bequiaexpress.com/fares/',
      date: '2026-09-16',
      note: 'Grille officielle, conducteur inclus : voiture 50, minibus 40, moto 30 XCD ; adulte 20 XCD ; véhicule seul = tarif − 20. Durée : estimation.' },
    { a: 'stVincent', b: 'unionIsland', routeKey: 'kingstownUnionIsland', name: 'Kingstown ↔ Clifton (Union Island)',
      operator: 'Bequia Express', durationH: 4.5, distanceKm: 65,
      priceByClass: { 1: 53.88, 2: 69.73, 5: null, foot: 25.35 },
      currency: 'XCD', original: { car: 250, van: 300, moto: 70, foot: 80 },
      source: 'https://bequiaexpress.com/fares/',
      date: '2026-09-16',
      note: "Grille officielle (tarif direct, même navire via Canouan et Mayreau), conducteur inclus : voiture 250, minibus 300, moto 70 XCD ; adulte 80 XCD ; véhicule seul = tarif − 80 ; moto (70 < 80) → null. Durée : estimation." },
    { a: 'cuba', b: 'islaDeLaJuventud', routeKey: 'batabanoNuevaGerona', name: 'Surgidero de Batabanó ↔ Nueva Gerona',
      operator: 'Naviera Cubana Caribeña (ferry Perseverancia)', durationH: 5, distanceKm: 107,
      priceStatus: 'unknown', priceByClass: { 1: null, 2: null, 5: null, foot: null },
      source: 'https://www.granma.cu/cuba/2022-08-20/que-sabemos-del-nuevo-ferry-para-la-ruta-gerona-batabano ; https://www.cibercuba.com/noticias/2026-08-08-u1-e209363-s27061-nid337318-mientras-falta-transporte-publico-isla-juventud',
      date: '2026-09-16',
      note: "Ferry Perseverancia : ~400 passagers + véhicules et fret roulant, ~5 h (Granma). Service très irrégulier : appel à pièces pour réparer le moteur (mai 2026), réduit à UN aller-retour hebdomadaire depuis le 20 juin 2026 (carburant). Aucun tarif véhicules publié. À retirer si la ligne est déclarée suspendue." }
  ]
};
