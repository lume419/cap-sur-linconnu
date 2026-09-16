// Îles d'Europe du Sud — groupe « sud » (CONSIGNE-ILES-EUROPE.md) : Espagne, Portugal, Italie, Malte.
// Recherches et vérification contre public/data/communes-{es,pt,it,mt}.txt : 16 septembre 2026.
// Toutes les grilles sont en euros (aucune conversion InforEuro nécessaire).
//
// COMPATIBILITÉ DES CLÉS EXISTANTES (règle 1) :
// - `canary` = GRAN CANARIA : la ligne manuelle 'canary|continental' (app.js) décrit Cadix -> Las Palmas/Ténérife, Las Palmas
//   cité en premier ; Ténérife devient `tenerife` et reçoit sa propre ligne continentale (Huelva, Fred. Olsen).
// - `balearic` = MAJORQUE (ligne manuelle Barcelone/Valence -> Palma).
// - `azores` = SÃO MIGUEL, `madeira` = MADÈRE (aucune liaison existante ; île principale gardée sous la clé historique).
// - `sardinia` / `sicily` : grandes îles inchangées (les petites îles sont retirées par des règles évaluées AVANT les provinces).
// - MT : `malta` / `gozo` inchangées, seule Comino est retirée.
//
// DURÉES : « publiée » quand la source l'indique ; sinon « ordre de grandeur » = distance orthodromique entre ports / ~28 km/h
// (≈15 nœuds), signalé dans la note. DISTANCES : orthodromie entre les ports (calculée).
// PRIX : « basse saison » retenue quand la grille distingue les saisons (même convention que FERRY_ROUTES dans app.js) ;
// véhicule seul (conducteur NON inclus dans toutes les grilles retenues : billet passager séparé).

const N = { 1: null, 2: null, 5: null, foot: null };
const D = '2026-09-16';

module.exports = {
  landmass: {
    // ===================================================================== ESPAGNE
    ES: { fallthrough: true, rules: [
      // --- Canaries (750 lieux au total dans l'ancienne boîte `canary`, tous rangés, aucun reste) ---
      { key: 'laGraciosa', match: { box: [[29.225, 29.30, -13.56, -13.47]] },
        note: "La Graciosa (Caleta de Sebo, Pedro Barba — 2 lieux). Évaluée avant Lanzarote : Órzola (29,2209 N) reste à Lanzarote. Aucun véhicule privé autorisé (seuls résidents/4x4 autorisés) : isolée sans ferry." },
      { key: 'lanzarote', match: { box: [[28.80, 29.30, -14.00, -13.30]] }, note: 'Lanzarote — 59 lieux (Arrecife, Playa Blanca…). Limite sud 28,80 N entre Playa Blanca (28,86) et Corralejo (28,73).' },
      { key: 'fuerteventura', match: { box: [[27.95, 28.80, -14.60, -13.75]] }, note: 'Fuerteventura — 78 lieux (Puerto del Rosario, Corralejo, Morro Jable).' },
      { key: 'canary', match: { box: [[27.70, 28.25, -15.90, -15.30]] }, note: 'GRAN CANARIA sous la clé historique `canary` — 128 lieux (Las Palmas, Telde…).' },
      { key: 'tenerife', match: { box: [[27.95, 28.62, -16.95, -16.05]] }, note: 'Ténérife — 323 lieux.' },
      { key: 'laGomera', match: { box: [[27.95, 28.25, -17.40, -17.05]] }, note: 'La Gomera — 34 lieux.' },
      { key: 'laPalma', match: { box: [[28.40, 28.90, -18.05, -17.65]] }, note: 'La Palma — 90 lieux.' },
      { key: 'elHierro', match: { box: [[27.60, 27.90, -18.20, -17.85]] }, note: 'El Hierro — 36 lieux.' },
      // --- Baléares (289 lieux dans l'ancienne boîte `balearic`, tous rangés) ---
      { key: 'formentera', match: { box: [[38.60, 38.80, 1.30, 1.65]] }, note: 'Formentera — 12 lieux (Espalmador sans lieu). Ibiza commence à 38,84 N (Es Cubells 38,88).' },
      { key: 'ibiza', match: { box: [[38.80, 39.15, 1.10, 1.70]] }, note: 'Ibiza — 49 lieux.' },
      { key: 'menorca', match: { box: [[39.75, 40.15, 3.75, 4.40]] }, note: 'Minorque — 41 lieux.' },
      { key: 'balearic', match: { box: [[39.25, 40.00, 2.25, 3.55]] }, note: 'MAJORQUE sous la clé historique `balearic` — 187 lieux. Cabrera, Dragonera : aucun lieu dans le fichier.' },
      // --- Autres ---
      { key: '*', match: { near: [{ name: 'Isla Plana (Nueva Tabarca)', lat: 38.1664, lon: -0.4821, km: 1 }] },
        note: "Tabarca (Alicante), lieu « Isla Plana » : bateaux passagers seulement (Santa Pola/Alicante), pas de route. Isolée." }
      // Illa de Arousa : pont routier (1985) -> reste continental. « Ons » du fichier (A Coruña, 42,88 N -8,73) n'est pas l'île d'Ons.
    ] },

    // ===================================================================== PORTUGAL
    PT: { fallthrough: true, rules: [
      // --- Açores (508 lieux, tous rangés). Boîtes et non régions : « Lagoa » et « Calheta » existent aussi hors Açores,
      // et le fichier range Piedade (Pico, 38,43 N -28,06) dans la région « Velas » (São Jorge) : la coordonnée prime. ---
      { key: 'corvo', match: { box: [[39.64, 39.75, -31.16, -31.05]] }, note: 'Corvo — 1 lieu (Vila do Corvo).' },
      { key: 'floresAzores', match: { box: [[39.34, 39.56, -31.32, -31.10]] }, note: "Flores — 17 lieux. Clé suffixée : `flores` existe déjà (Indonésie)." },
      { key: 'faial', match: { box: [[38.49, 38.68, -28.86, -28.58]] }, note: 'Faial — 78 lieux (Horta…).' },
      { key: 'pico', match: { box: [[38.37, 38.58, -28.57, -28.00]] }, note: 'Pico — 70 lieux. Est de Pico ≤ -28,03 ; São Jorge à l’ouest de -28,00 toujours ≥ 38,60 N.' },
      { key: 'saoJorge', match: { box: [[38.53, 38.80, -28.35, -27.70]] }, note: 'São Jorge — 44 lieux (Velas, Calheta, Topo).' },
      { key: 'graciosaAzores', match: { box: [[38.98, 39.12, -28.10, -27.90]] }, note: 'Graciosa — 40 lieux.' },
      { key: 'terceira', match: { box: [[38.62, 38.84, -27.40, -27.00]] }, note: 'Terceira — 75 lieux (Angra, Praia da Vitória).' },
      { key: 'azores', match: { box: [[37.68, 37.93, -25.90, -25.10]] }, note: 'SÃO MIGUEL sous la clé historique `azores` — 127 lieux.' },
      { key: 'santaMaria', match: { box: [[36.90, 37.04, -25.22, -24.98]] }, note: 'Santa Maria — 56 lieux.' },
      // --- Madère ---
      { key: 'portoSanto', match: { box: [[32.98, 33.13, -16.45, -16.25]] }, note: 'Porto Santo — 10 lieux (= région « Porto Santo »). Les 137 autres lieux de Madère gardent `madeira`.' },
      // --- Ria Formosa ---
      { key: 'culatra', match: { box: [[36.96, 37.00, -7.88, -7.83]] },
        note: "Île-barrière de Culatra (Ilha da Culatra, Ilha do Farol — 2 lieux) : bateaux passagers depuis Olhão/Faro, pas de véhicules. Isolée." }
    ] },

    // ===================================================================== ITALIE
    IT: { fallthrough: true, rules: [
      // --- Archipel toscan (Livourne/Grosseto) ---
      { key: 'elba', match: { box: [[42.70, 42.88, 10.08, 10.45]] }, note: "Île d'Elbe — 95 lieux. Piombino (42,93) hors boîte." },
      { key: '*', match: { near: [{ name: 'Pianosa', lat: 42.5869, lon: 10.0970, km: 1.5 }] }, note: 'Pianosa (parc national, accès encadré, passagers seulement). Isolée.' },
      { key: 'capraia', match: { box: [[43.00, 43.08, 9.78, 9.87]] }, note: 'Capraia — 2 lieux (Porto, Capraia Isola).' },
      { key: 'giglio', match: { box: [[42.33, 42.40, 10.85, 10.94]] }, note: 'Giglio — 7 lieux. Monte Argentario (tombolos routiers) reste continental.' },
      // --- Golfe de Naples ---
      { key: 'ischia', match: { box: [[40.69, 40.76, 13.84, 13.97]] }, note: 'Ischia — 18 lieux.' },
      { key: 'procida', match: { box: [[40.745, 40.775, 13.99, 14.035]] }, note: 'Procida — 1 lieu (Vivara : passerelle piétonne). Monte di Procida (40,80) est sur le continent. Isolée : voir note ferries.' },
      { key: 'capri', match: { box: [[40.53, 40.57, 14.19, 14.27]] }, note: 'Capri — 3 lieux (Capri, Anacapri, Marina Grande). Isolée : voir note ferries.' },
      // --- Latium ---
      { key: 'ponza', match: { box: [[40.85, 40.96, 12.90, 13.00]] }, note: 'Ponza — 3 lieux. Ventotene, Palmarola, Zannone : aucun lieu dans le fichier.' },
      // --- Pouilles ---
      { key: 'tremiti', match: { box: [[42.10, 42.14, 15.47, 15.52]] },
        note: "Tremiti (San Domino, San Nicola — 3 lieux). Débarquement des véhicules de non-résidents interdit (avril-octobre, et pas de circulation privée hors résidents). Isolée sans ferry." },
      // --- Sicile : Éoliennes (province de Messine), Égades (Trapani). Ustica, Pantelleria, Lampedusa, Linosa, Marettimo,
      // Alicudi : AUCUN lieu dans communes-it.txt (vérifié par coordonnées et par nom). ---
      { key: 'vulcano', match: { box: [[38.36, 38.435, 14.92, 15.00]] }, note: 'Vulcano — 6 lieux.' },
      { key: 'lipari', match: { box: [[38.44, 38.53, 14.90, 14.99]] }, note: 'Lipari — 15 lieux.' },
      { key: 'salina', match: { box: [[38.53, 38.60, 14.78, 14.90]] }, note: 'Salina — 8 lieux (Santa Marina, Malfa, Leni, Rinella…).' },
      { key: 'filicudi', match: { box: [[38.54, 38.59, 14.52, 14.60]] }, note: 'Filicudi — 4 lieux.' },
      { key: 'panarea', match: { box: [[38.62, 38.65, 15.05, 15.10]] },
        note: "Panarea — 2 lieux. Interdiction absolue des véhicules à moteur 1er mai-31 octobre, île sans route carrossable : isolée sans ferry." },
      { key: 'stromboli', match: { box: [[38.77, 38.82, 15.18, 15.25]] },
        note: "Stromboli (Stromboli, Piscità, Ginostra — 3 lieux ; Ginostra n'est reliée au village que par sentier, rangée avec lui faute de mieux). Même interdiction absolue mai-octobre : isolée sans ferry." },
      { key: 'favignana', match: { box: [[37.89, 37.96, 12.25, 12.38]] }, note: 'Favignana — 7 lieux.' },
      { key: 'levanzo', match: { box: [[37.975, 38.00, 12.32, 12.36]] }, note: 'Levanzo — 1 lieu.' },
      // --- Sardaigne ---
      { key: 'laMaddalena', match: { box: [[41.195, 41.26, 9.37, 9.50]] },
        note: "La Maddalena + Caprera (reliées par la chaussée routière du Passo della Moneta) — 8 lieux. Palau (41,18) et Porto Rafael (lon 9,363) restent en Sardaigne." },
      { key: 'sanPietro', match: { box: [[39.10, 39.20, 8.20, 8.33]] },
        note: "Île San Pietro (Carloforte — 1 lieu). Sant'Antioco (Sant'Antioco, Calasetta, Cussorgia, Canai) est reliée à la Sardaigne par l'isthme routier et le pont de la SS126 : reste `sardinia`." },
      { key: 'asinara', match: { box: [[40.985, 41.12, 8.18, 8.35]] },
        note: "Asinara (commune de Porto Torres — 7 lieux, Stintino et La Pelosa ≤ 40,96 N exclus). Parc national, véhicules privés interdits, bateaux passagers : isolée." },
      { key: '*', match: { near: [{ name: 'Isola Molara', lat: 40.8680, lon: 9.7263, km: 0.8 }] }, note: 'Molara (près de Tavolara) : îlot sans liaison. Isolé.' },
      // --- Lagune de Venise (le centre historique est relié par le Ponte della Libertà : reste continental) ---
      { key: '*', match: { near: [{ name: 'San Clemente', lat: 45.4115, lon: 12.3363, km: 0.3 }, { name: 'Giudecca', lat: 45.4248, lon: 12.3291, km: 0.6 },
        { name: 'San Giorgio Maggiore', lat: 45.4277, lon: 12.3440, km: 0.3 }] },
        note: 'Îles lagunaires sans voitures (vaporetto seulement) : chaque lieu isolé. Évaluée avant la boîte du Lido.' },
      { key: 'lidoVenezia', match: { box: [[45.335, 45.422, 12.315, 12.39]] },
        note: 'Île du Lido (Lido, Malamocco, Alberoni, San Nicolò… — 7 lieux) : routes, reliée par ferry-boat ACTV.' },
      { key: 'pellestrina', match: { box: [[45.26, 45.334, 12.29, 12.33]] },
        note: 'Île de Pellestrina (Santa Maria del Mare, San Pietro in Volta, Pellestrina, San Vito… — 6 lieux). « Faro » (45,23 N, CP 30015) est à Chioggia/Sottomarina, exclu. Le lieu « Pellestrina » de la province de Rovigo (44,90 N) n’est pas concerné.' },
      { key: '*', match: { box: [[45.445, 45.50, 12.34, 12.42], [45.435, 45.445, 12.37, 12.39]] },
        note: "Îles du nord de la lagune (Murano, Burano, Mazzorbo, Torcello, Sant'Erasmo, Vignole, San Francesco del Deserto) : pas de voitures, chaque lieu isolé. Punta Sabbioni (12,425) et Cavallino-Treporti (reliés par la route) exclus." },
      // --- Îles lacustres sans voitures ---
      { key: 'monteIsola', match: { box: [[45.70, 45.73, 10.065, 10.10]] },
        note: "Monte Isola (lac d'Iseo — 8 lieux : Siviano, Carzano, Menzino, Senzano…). Voitures interdites hors résidents, bateaux passagers depuis Sulzano/Sale Marasino : isolée sans ferry. Sale Marasino (10,112) et Tavernola (10,045) exclus." },
      { key: '*', match: { near: [{ name: 'Isola Comacina (0,1 km : Sala Comacina, sur la rive, est à 280 m)', lat: 45.9667, lon: 9.1667, km: 0.1 }, { name: 'Isola Superiore', lat: 45.9006, lon: 8.5206, km: 0.2 },
        { name: 'Isola Bella', lat: 45.8954, lon: 8.5271, km: 0.2 }, { name: 'Isola Maggiore (Trasimène)', lat: 43.1768, lon: 12.0896, km: 0.4 },
        { name: 'Isola San Giulio', lat: 45.7962, lon: 8.3999, km: 0.15 }] },
        note: "Îles lacustres (Côme, Majeur, Trasimène, Orta) : bateaux passagers seulement. Chaque lieu isolé." }
    ] },

    // ===================================================================== MALTE
    MT: { fallthrough: true, rules: [
      { key: '*', match: { box: [[36.000, 36.022, 14.32, 14.35]] },
        note: "Comino (1 lieu) : bateaux passagers seulement (Mġarr/Ċirkewwa), aucune liaison véhicules. Isolée. Mġarr (36,025 N 14,295) et Qala (14,309) restent à Gozo." }
    ] }
  },

  ferries: [
    // ===================================================================== CANARIES (prix dynamiques : aucune grille fixe)
    { a: 'canary', b: 'tenerife', routeKey: 'agaeteSantaCruzTenerife', name: 'Agaete ↔ Santa Cruz de Tenerife',
      operator: 'Fred. Olsen Express (Bañaderos/Bajamar Express) ; aussi Las Palmas ↔ Santa Cruz (Baleària Canarias, ex-Armas)',
      durationH: 1.33, distanceKm: 67, priceStatus: 'variable', priceByClass: N,
      source: 'https://www.fredolsen.es/en/routes', date: D,
      note: "Fast-ferry véhicules ; 80 min publiées (Gran Canaria → Tenerife). Prix au moteur de réservation, aucune grille fixe publiée." },
    { a: 'tenerife', b: 'laGomera', routeKey: 'losCristianosSanSebastianGomera', name: 'Los Cristianos ↔ San Sebastián de La Gomera',
      operator: 'Fred. Olsen Express, Baleària Canarias (ex-Naviera Armas)', durationH: 0.83, distanceKm: 38,
      priceStatus: 'variable', priceByClass: N, source: 'https://www.fredolsen.es/en/routes', date: D,
      note: '50 min publiées (Fred. Olsen). Véhicules acceptés ; prix dynamiques.' },
    { a: 'tenerife', b: 'laPalma', routeKey: 'santaCruzTenerifeSantaCruzLaPalma', name: 'Santa Cruz de Tenerife ↔ Santa Cruz de La Palma',
      operator: 'Fred. Olsen Express ; Baleària Canarias (depuis Los Cristianos ou Santa Cruz)', durationH: 2.5, distanceKm: 150,
      priceStatus: 'variable', priceByClass: N, source: 'https://www.fredolsen.es/en/routes', date: D,
      note: "150 min publiées (Fred. Olsen, La Palma ↔ Tenerife). Prix dynamiques. Port de départ Fred. Olsen non précisé par la page : distance calculée depuis Santa Cruz de Tenerife." },
    { a: 'tenerife', b: 'elHierro', routeKey: 'losCristianosLaEstaca', name: 'Los Cristianos ↔ La Estaca (El Hierro)',
      operator: 'Fred. Olsen Express (Bentago Express), Baleària Canarias', durationH: 2.33, distanceKm: 120,
      priceStatus: 'variable', priceByClass: N,
      source: 'https://armastrasmediterranea.com/en/routes-timetables', date: D,
      note: "140 min publiées (Fred. Olsen, Tenerife ↔ El Hierro). Prix dynamiques." },
    { a: 'canary', b: 'fuerteventura', routeKey: 'lasPalmasMorroJable', name: 'Las Palmas ↔ Morro Jable',
      operator: 'Fred. Olsen Express (Betancuria Express), Baleària Canarias', durationH: 2, distanceKm: 104,
      priceStatus: 'variable', priceByClass: N, source: 'https://www.fredolsen.es/en/routes', date: D,
      note: '2 h publiées (Fuerteventura → Gran Canaria). Prix dynamiques.' },
    { a: 'lanzarote', b: 'fuerteventura', routeKey: 'playaBlancaCorralejo', name: 'Playa Blanca ↔ Corralejo',
      operator: 'Fred. Olsen Express (Bocayna Express), Baleària Canarias', durationH: 0.5, distanceKm: 14,
      priceStatus: 'variable', priceByClass: N, source: 'https://www.fredolsen.es/en/routes', date: D,
      note: '25 ou 35 min publiées. Prix dynamiques.' },
    { a: 'canary', b: 'lanzarote', routeKey: 'lasPalmasArrecife', name: 'Las Palmas ↔ Arrecife',
      operator: 'Baleària Canarias (ex-Grupo Armas Trasmediterránea, Volcán de Tamadaba, 300 véhicules)', durationH: 7.5, distanceKm: 206,
      priceStatus: 'variable', priceByClass: N,
      source: 'https://armastrasmediterranea.com/en/routes-timetables/ferry-gran-canaria-lanzarote-arrecife', date: D,
      note: "Ligne ro-pax (« 1.000 passengers and 300 vehicles ») ; seul un prix « à partir de » affiché. Durée non publiée sur la page : ORDRE DE GRANDEUR (206 km à ~28 km/h)." },
    { a: 'continental', b: 'tenerife', routeKey: 'huelvaSantaCruzTenerife', name: 'Huelva ↔ Santa Cruz de Tenerife',
      operator: 'Fred. Olsen Express (Buenavista Express)', durationH: 36, distanceKm: 1295,
      priceStatus: 'variable', priceByClass: N, source: 'https://www.fredolsen.es/en/routes', date: D,
      note: "33 ou 40 h publiées (valeur médiane retenue). Escale aussi à Gran Canaria. Naviera Armas a quitté Huelva le 19/04/2026 (lignes regroupées à Cadix). Prix dynamiques." },
    { a: 'continental', b: 'lanzarote', routeKey: 'cadizArrecife', name: 'Cadix ↔ Arrecife',
      operator: 'Baleària Canarias (ex-Armas Trasmediterránea : Ciudad de Valencia, Volcán de Tinamar)', durationH: 28, distanceKm: 1080,
      priceStatus: 'variable', priceByClass: N,
      source: 'https://armastrasmediterranea.com/en/routes-timetables/ferry-cadiz-lanzarote-arrecife', date: D,
      note: "Hebdomadaire, jusqu'à 300 véhicules. Durée non publiée par l'opérateur : ~28 h selon les comparateurs (ordre de grandeur). Cadix dessert aussi Las Palmas, Santa Cruz de Tenerife, Puerto del Rosario et Santa Cruz de La Palma (paires non ajoutées)." },
    // La Graciosa : Órzola ↔ Caleta de Sebo (Líneas Romero, Biosfera Express) = passagers ; véhicules privés interdits sauf résidents -> pas de ferry.

    // ===================================================================== BALÉARES (prix dynamiques)
    { a: 'balearic', b: 'menorca', routeKey: 'alcudiaCiutadella', name: 'Alcúdia ↔ Ciutadella',
      operator: 'Baleària (et Trasmed, intégrée à Baleària en 2026)', durationH: 1.25, distanceKm: 62,
      priceStatus: 'variable', priceByClass: N, source: 'https://www.balearia.com/es/rutas-horarios/ferry-menorca-mallorca', date: D,
      note: '~1 h 15 publiées. Véhicules acceptés ; prix au moteur de réservation.' },
    { a: 'balearic', b: 'ibiza', routeKey: 'palmaIbiza', name: 'Palma ↔ Ibiza',
      operator: 'Baleària, Trasmed', durationH: 2, distanceKm: 125,
      priceStatus: 'variable', priceByClass: N, source: 'https://www.balearia.com/en/routes-timetables/ferry-mallorca-ibiza', date: D,
      note: '~2 h publiées (rapide ; conventionnel plus long). Prix dynamiques.' },
    { a: 'ibiza', b: 'formentera', routeKey: 'ibizaLaSavina', name: 'Ibiza ↔ La Savina (Formentera)',
      operator: 'Baleària, Trasmapi', durationH: 0.5, distanceKm: 20,
      priceStatus: 'variable', priceByClass: N,
      source: 'https://helpcenter.balearia.com/hc/es/articles/6995166796049-Normativa-para-viajar-en-verano-con-tu-veh%C3%ADculo-a-Formentera', date: D,
      note: "Véhicules acceptés, MAIS du 1er juin au 30 septembre autorisation préalable obligatoire sur formentera.eco (quota 1 732 voitures et 122 motos/jour pour les visitants ; taxe non-résidents 6 €/jour voiture, minimum 30 €, 3 €/jour moto, minimum 15 €). Durée : ordre de grandeur (rapide ~30 min, conventionnel ~1 h)." },
    { a: 'continental', b: 'ibiza', routeKey: 'deniaIbiza', name: 'Dénia ↔ Ibiza',
      operator: 'Baleària', durationH: 2.5, distanceKm: 115,
      priceStatus: 'variable', priceByClass: N, source: 'https://www.balearia.com/es/rutas-horarios/regiones-baleares', date: D,
      note: '2 à 3 h. Prix dynamiques. Barcelone/Valence ↔ Ibiza existent aussi.' },
    { a: 'continental', b: 'menorca', routeKey: 'barcelonaCiutadella', name: 'Barcelone ↔ Ciutadella',
      operator: 'Baleària', durationH: 3.5, distanceKm: 206,
      priceStatus: 'variable', priceByClass: N, source: 'https://www.balearia.com/es/rutas-horarios/ferry-barcelona-menorca', date: D,
      note: 'Rapide dès 3 h 30, conventionnel 7 à 9 h. Prix dynamiques. Barcelone ↔ Maó existe aussi.' },
    { a: 'continental', b: 'formentera', routeKey: 'deniaFormentera', name: 'Dénia ↔ La Savina (Formentera)',
      operator: 'Baleària', durationH: 3, distanceKm: 113,
      priceStatus: 'variable', priceByClass: N, source: 'https://www.balearia.com/es/rutas-horarios/regiones-baleares', date: D,
      note: "2 h à 4 h 30 selon le navire (escale possible à Ibiza). Même régime formentera.eco (1er juin-30 septembre) que la ligne depuis Ibiza. Prix dynamiques." },

    // ===================================================================== MADÈRE / AÇORES
    { a: 'madeira', b: 'portoSanto', routeKey: 'funchalPortoSanto', name: 'Funchal ↔ Porto Santo',
      operator: 'Porto Santo Line (Lobo Marinho, 145 voitures)', durationH: 2.25, distanceKm: 72,
      priceByClass: { 1: 115.25, 2: 158.97, 5: 29.54, foot: 35.28 },
      source: 'https://www.portosantoline.pt/media/1955/tarifas-simples-pt.pdf', date: D,
      note: "Grille officielle « 2026 Tarifas Simples » (texte extrait du PDF, mise en page non visible : colonnes lues comme aller-retour avr.-sept. / A-R oct.-mars / aller simple avr.-sept. / aller simple oct.-mars). ALLER SIMPLE, basse saison (octobre-mars) : classe A « ligeiros de passageiros até 7 lugares » 115,25 € (avr.-sept. 149,43), classe B « pequenos furgões » 158,97 € (198,00) retenue pour la classe 2, classe E motos 29,54 € (41,05), passager adulte classe touristique sans subside de mobilité 35,28 € (43,35). Conducteur non inclus. « A estas tarifas acresce a sobretaxa de combustível, revista mensalmente » : surtaxe carburant en plus. Durée ~2 h 15 (FAQ portosantoline.pt)." },
    { a: 'faial', b: 'pico', routeKey: 'hortaMadalena', name: 'Horta ↔ Madalena',
      operator: 'Atlânticoline (ro-pax Gilberto Mariano / Mestre Jaime Feijó)', durationH: 0.5, distanceKm: 8,
      priceStatus: 'unknown', priceByClass: N, source: 'https://www.atlanticoline.pt/en/tarifas-outras/vehicles/', date: D,
      note: "Toute l'année, 30 min (intotheazores.com, mis à jour 16/06/2026). Véhicules uniquement sur les ro-pax (« Vehicle transport is only carried out on ro-pax ferries »), conducteur non inclus. Grille 2026 non lisible (calculateur en ligne ; seul le PDF 2024 est publié) : unknown." },
    { a: 'pico', b: 'saoJorge', routeKey: 'saoRoqueVelas', name: 'São Roque do Pico / Madalena ↔ Velas',
      operator: 'Atlânticoline', durationH: 0.83, distanceKm: 19,
      priceStatus: 'unknown', priceByClass: N, source: 'https://www.atlanticoline.pt/en/tarifas-outras/vehicles/', date: D,
      note: "Ligne Faial ↔ Pico ↔ São Jorge toute l'année ; São Jorge ↔ Pico direct 50 min de juin à septembre. Grille véhicules 2026 non lisible : unknown." },
    { a: 'saoJorge', b: 'terceira', routeKey: 'velasPraiaVitoria', name: 'Velas ↔ Praia da Vitória',
      operator: 'Atlânticoline (saisonnier)', durationH: 3.5, distanceKm: 101,
      priceStatus: 'unknown', priceByClass: N, source: 'https://www.atlanticoline.pt/en/timetable/', date: D,
      note: "SAISONNIER : juin-septembre seulement (mar./sam. Faial-Pico-São Jorge-Terceira ; lun./ven. via Graciosa). Durée : ordre de grandeur (101 km). Grille 2026 non lisible." },
    { a: 'graciosaAzores', b: 'terceira', routeKey: 'graciosaPraiaVitoria', name: 'Graciosa ↔ Praia da Vitória',
      operator: 'Atlânticoline (saisonnier)', durationH: 3, distanceKm: 87,
      priceStatus: 'unknown', priceByClass: N, source: 'https://www.atlanticoline.pt/en/timetable/', date: D,
      note: "SAISONNIER : juin-septembre, lun./ven. seulement. Durée : ordre de grandeur. Grille 2026 non lisible." },
    // São Miguel (`azores`) et Santa Maria : « there are no longer any ferries departing from São Miguel » (intotheazores.com, 06/2026) -> isolées.
    // Flores ↔ Corvo : bateau passagers (40 min), pas de véhicules ; aucune liaison Flores/Corvo ↔ groupe central -> isolées.

    // ===================================================================== ITALIE
    { a: 'continental', b: 'elba', routeKey: 'piombinoPortoferraio', name: 'Piombino ↔ Portoferraio',
      operator: 'Toremar, Moby, Blu Navy', durationH: 1, distanceKm: 21,
      priceStatus: 'variable', priceByClass: N, source: 'https://www.moby.it/rotte/traghetti-elba/piombino-portoferraio-piombino/', date: D,
      note: "Moins d'1 h. Tarifs non-résidents selon saison et disponibilité (moteurs de réservation). Rio Marina/Cavo desservis aussi." },
    { a: 'continental', b: 'capraia', routeKey: 'livornoCapraia', name: 'Livourne ↔ Capraia',
      operator: 'Toremar', durationH: 2.5, distanceKm: 67,
      priceStatus: 'unknown', priceByClass: N, source: 'https://www.toscana-notizie.it/-/adeguamento-tariffe-toremar-residenti-esclusi-dagli-aumenti-e-nuovi-investi', date: D,
      note: "Véhicules embarqués, mais circulation des non-résidents interdite l'été sans autorisation de la commune (ordonnance municipale ; ~800 m de route). Tarif Toremar réglementé par la Région (saison basse/moyenne/haute) mais aucune grille officielle 2026 lue : unknown. Durée : ordre de grandeur." },
    { a: 'continental', b: 'giglio', routeKey: 'portoSantoStefanoGiglio', name: 'Porto Santo Stefano ↔ Giglio Porto',
      operator: 'Maregiglio, Toremar', durationH: 1, distanceKm: 19,
      priceStatus: 'unknown', priceByClass: N, source: 'https://maregiglio.it/wp-content/uploads/2025/12/TARIFFE-MAREGIGLIO_2026.pdf', date: D,
      note: "Grille officielle 2026 publiée (passager aller 14,50 € + taxes basse saison, 16,00 € haute, selon maregiglio.it/tariffe), mais les tarifs véhicules du PDF sont en police chiffrée non extractible : unknown. Débarquement limité en août (résidents ou séjour hôtelier ≥ 5 jours). Durée : ordre de grandeur." },
    { a: 'continental', b: 'ischia', routeKey: 'pozzuoliIschia', name: 'Pozzuoli ↔ Ischia',
      operator: 'Caremar (aussi Medmar)', durationH: 1, distanceKm: 17,
      priceByClass: { 1: 36.10, 2: 48.20, 5: 18.00, foot: 11.20 },
      source: 'https://mobile.caremar.it/it/tariffe/', date: D,
      note: "Grille Caremar (traghetto) : auto ≤ 4 m 36,10 €, > 4 m 48,20 € (classe 2), moto ≤ 250 cc 18,00 € (> 250 cc 20,30), passager 11,20 €. Page sans date de validité. RESTRICTION : du 3 avril au 31 octobre 2026, afflux et circulation interdits aux véhicules des résidents de CAMPANIE non insulaires (décret du président de la Région) ; les véhicules immatriculés/possédés hors Campanie restent admis. ~60 min." },
    // Procida : mêmes grilles Caremar (Pozzuoli ↔ Procida auto ≤ 4 m 36,10 €, > 4 m 48,20 €, moto 18,00/20,30 €, passager 9,50 € ;
    //   Ischia ↔ Procida auto 36,10/48,20 €, passager 9,40 €) MAIS débarquement et circulation interdits à TOUS les véhicules de
    //   non-résidents du 30 mars au 15 octobre 2026 (délibération communale) -> isolée sans ferry (véhicules de résidents seulement en saison).
    // Capri : Caremar Napoli ↔ Capri (auto ≤ 4 m 47,30 €, > 4 m 67,60 €, moto 23,40/28,20 €, passager 14,80 €) MAIS décret régional
    //   n° 22 du 25/03/2026 : véhicules de non-résidents interdits du 30 mars au 2 novembre 2026 et du 28 décembre 2026 au 3 janvier 2027
    //   -> isolée sans ferry. Si la session principale veut les relier hors saison, les chiffres ci-dessus sont prêts.
    { a: 'continental', b: 'ponza', routeKey: 'formiaPonza', name: 'Formia ↔ Ponza',
      operator: 'Laziomar', durationH: 2.5, distanceKm: 67,
      priceByClass: { 1: 40.70, 2: 59.80, 5: 20.70, foot: 18.40 },
      source: 'https://laziomar.it/en/timetables/formia-ponza-and-vice-versa', date: D,
      note: "Grille publiée (navire, toute l'année) : auto ≤ 4 m 40,70 €, > 4 m 59,80 € (classe 2), moto ≤ 250 cc 20,70 € (> 250 cc 24,70), passager ordinaire 18,40 € (1er avril-31 octobre). Taxe de débarquement en plus (2,50/5,00 € selon comparateurs). Pas d'interdiction générale de débarquement (ordonnances estivales de circulation/stationnement seulement). Durée : ordre de grandeur. Camper/fourgons : billets au guichet seulement." },
    { a: 'sicily', b: 'vulcano', routeKey: 'milazzoVulcano', name: 'Milazzo ↔ Vulcano',
      operator: 'Siremar – Caronte & Tourist Isole Minori', durationH: 1.25, distanceKm: 33,
      priceByClass: { 1: 87.07, 2: null, 5: 34.46, foot: 16.65 },
      source: 'https://cdn.carontetourist.it/sites/default/files/2026-09/listino-prezzi-siremar-ordinaria-valida-dal-10-09-2026_1.pdf', date: D,
      note: "Liste officielle Siremar « ordinaria » valable dès le 10/09/2026, TVA incluse, hors taxes de débarquement : AUTO 87,07 €, MOTO 34,46 €, place pont basse saison (1/10-31/5) 16,65 € (haute 18,35). Classe 2 laissée null : le tableau « Camper/Rimorchio » (≤ 4,5 m 34,75 €, ≤ 5 m 64,18 €) est inférieur au tarif auto, sens non établi. RESTRICTION : l'été, non-résidents interdits sauf réservation d'hébergement ≥ 7 jours (camping-car : camping ≥ 7 jours). Durée : ordre de grandeur." },
    { a: 'sicily', b: 'lipari', routeKey: 'milazzoLipari', name: 'Milazzo ↔ Lipari',
      operator: 'Siremar – Caronte & Tourist Isole Minori', durationH: 1.5, distanceKm: 37,
      priceByClass: { 1: 87.07, 2: null, 5: 34.46, foot: 17.16 },
      source: 'https://cdn.carontetourist.it/sites/default/files/2026-09/listino-prezzi-siremar-ordinaria-valida-dal-10-09-2026_1.pdf', date: D,
      note: "Même liste (10/09/2026) : AUTO 87,07 €, MOTO 34,46 €, place pont basse saison 17,16 € (haute 18,86). Camper ≤ 5 m 64,18 € (classe 2 null, voir Vulcano). Même restriction estivale non-résidents (hébergement ≥ 7 jours). Durée : ordre de grandeur (escale fréquente à Vulcano)." },
    { a: 'lipari', b: 'vulcano', routeKey: 'lipariVulcano', name: 'Lipari ↔ Vulcano',
      operator: 'Siremar – Caronte & Tourist Isole Minori', durationH: 0.33, distanceKm: 5,
      priceByClass: { 1: 60.80, 2: null, 5: 29.46, foot: 7.99 },
      source: 'https://cdn.carontetourist.it/sites/default/files/2026-09/listino-prezzi-siremar-ordinaria-valida-dal-10-09-2026_1.pdf', date: D,
      note: "Même liste : AUTO 60,80 €, MOTO 29,46 €, place pont 7,99 € (les deux saisons). Restriction estivale des deux îles. Durée : ordre de grandeur." },
    { a: 'lipari', b: 'salina', routeKey: 'lipariSantaMarinaSalina', name: 'Lipari ↔ Santa Marina Salina',
      operator: 'Siremar – Caronte & Tourist Isole Minori', durationH: 0.5, distanceKm: 13,
      priceByClass: { 1: 63.91, 2: null, 5: 32.57, foot: 10.54 },
      source: 'https://cdn.carontetourist.it/sites/default/files/2026-09/listino-prezzi-siremar-ordinaria-valida-dal-10-09-2026_1.pdf', date: D,
      note: "Même liste : AUTO 63,91 €, MOTO 32,57 €, place pont basse saison 10,54 € (haute 11,38). Salina n'est pas citée parmi les îles à interdiction de débarquement. Milazzo ↔ Santa Marina Salina existe aussi (auto 118,23 €). Durée : ordre de grandeur." },
    { a: 'salina', b: 'filicudi', routeKey: 'rinellaFilicudi', name: 'Rinella (Salina) ↔ Filicudi',
      operator: 'Siremar – Caronte & Tourist Isole Minori', durationH: 0.8, distanceKm: 22,
      priceByClass: { 1: 63.91, 2: null, 5: 32.57, foot: 11.89 },
      source: 'https://cdn.carontetourist.it/sites/default/files/2026-09/listino-prezzi-siremar-ordinaria-valida-dal-10-09-2026_1.pdf', date: D,
      note: "Même liste : AUTO 63,91 €, MOTO 32,57 €, place pont basse saison 11,89 € (haute 12,74). Filicudi : non-résidents interdits l'été sauf hébergement ≥ 7 jours. Durée : ordre de grandeur." },
    { a: 'sicily', b: 'favignana', routeKey: 'trapaniFavignana', name: 'Trapani ↔ Favignana',
      operator: 'Siremar – Caronte & Tourist Isole Minori', durationH: 0.75, distanceKm: 18,
      priceByClass: { 1: 57.23, 2: 45.81, 5: 26.91, foot: 10.54 },
      source: 'https://cdn.carontetourist.it/sites/default/files/2026-09/listino-prezzi-siremar-ordinaria-valida-dal-10-09-2026_1.pdf', date: D,
      note: "Même liste (page Égades) : AUTO 57,23 €, MOTO 26,91 €, place pont basse saison 10,54 € (haute 11,38), CAMPER/RIMORCHIO ≤ 5 m 45,81 € (≤ 4,5 m 30,76) retenu en classe 2. Débarquement des non-résidents limité l'été (en général juillet-fin de saison), fixé chaque année. Durée : ordre de grandeur." },
    { a: 'sicily', b: 'levanzo', routeKey: 'trapaniLevanzo', name: 'Trapani ↔ Levanzo',
      operator: 'Siremar – Caronte & Tourist Isole Minori', durationH: 0.75, distanceKm: 15,
      priceByClass: { 1: 57.23, 2: 45.81, 5: 26.91, foot: 10.54 },
      source: 'https://cdn.carontetourist.it/sites/default/files/2026-09/listino-prezzi-siremar-ordinaria-valida-dal-10-09-2026_1.pdf', date: D,
      note: "Même liste : Trapani-Levanzo mêmes montants que Trapani-Favignana (AUTO 57,23 €, MOTO 26,91 €, camper ≤ 5 m 45,81 €, place pont 10,54 €). Île minuscule au réseau routier quasi inexistant. Durée : ordre de grandeur." },
    { a: 'sardinia', b: 'laMaddalena', routeKey: 'palauLaMaddalena', name: 'Palau ↔ La Maddalena',
      operator: 'Delcomar', durationH: 0.33, distanceKm: 4,
      priceByClass: { 1: 10.00, 2: 11.80, 5: 5.80, foot: 4.10 },
      source: 'https://delcomar.it/wp-content/uploads/2023/12/TARIFFE-in-vigore-dal-01-01-2024-La-Maddalena-Palau.pdf', date: D,
      note: "Tarifs ORDINAIRES (touristes), aller simple, hiver 1/10-31/5 : auto ≤ 4 m 10,00 € (été 10,20), > 4 m 11,80 € (12,20) en classe 2, moto ≤ 250 cc 5,80 € (> 250 cc 7,80), passager adulte 4,10 € (4,70). Édition 01/01/2024, toujours la grille liée par delcomar.it en septembre 2026 (montants inchangés depuis la hausse régionale du 02/05/2023). Contribution de débarquement communale en plus. Durée : ordre de grandeur." },
    { a: 'sardinia', b: 'sanPietro', routeKey: 'portovesmeCarloforte', name: 'Portovesme ↔ Carloforte',
      operator: 'Delcomar', durationH: 0.5, distanceKm: 9,
      priceByClass: { 1: 12.80, 2: 14.80, 5: 5.80, foot: 5.00 },
      source: 'https://delcomar.it/wp-content/uploads/2023/12/TARIFFE-in-vigore-dal-01-01-2024-Carloforte-Portovesme.pdf', date: D,
      note: "Tarifs ORDINAIRES, aller simple, hiver 1/10-31/5 : auto ≤ 4 m 12,80 € (été 13,20), > 4 m 14,80 € (15,30), moto ≤ 250 cc 5,80 € (> 250 cc 7,50), passager 5,00 € (5,40). Édition 01/01/2024 toujours en ligne. Contribution de débarquement de Carloforte (1,50 à 5,00 € selon mois) en plus. Calasetta ↔ Carloforte existe aussi (Delcomar). Durée : ordre de grandeur." },
    { a: 'continental', b: 'lidoVenezia', routeKey: 'tronchettoLido', name: 'Tronchetto ↔ Lido (ferry-boat ligne 17)',
      operator: 'ACTV (groupe AVM)', durationH: 0.6, distanceKm: 6,
      priceByClass: { 1: 13.00, 2: 26.00, 5: 3.00, foot: null },
      source: 'https://actv.avmspa.it/it/content/ferry-boat-tariffe', date: D,
      note: "Grille ACTV ligne 17 (Tronchetto-Lido ou Lido-Punta Sabbioni), aller simple : auto ≤ 4 m 13,00 € (≤ 4,50 m 21,00), > 4,50 m / camion ≤ 3,5 t 26,00 € (classe 2), moto 3,00 €. « Vehicle tickets do not include the driver » ; tarif passager non lu sur la page (billet ACTV ordinaire) : foot null. Durée : ordre de grandeur." },
    { a: 'lidoVenezia', b: 'pellestrina', routeKey: 'alberoniSantaMariaDelMare', name: 'Alberoni ↔ Santa Maria del Mare (ferry-boat ligne 11)',
      operator: 'ACTV (groupe AVM)', durationH: 0.17, distanceKm: 2,
      priceByClass: { 1: 8.00, 2: 13.00, 5: 3.00, foot: null },
      source: 'https://actv.avmspa.it/it/content/ferry-boat-tariffe', date: D,
      note: "Grille ACTV ligne 11 : auto ≤ 4 m 8,00 € (≤ 4,50 m 12,00), > 4,50 m 13,00 € (classe 2), moto 3,00 €. Conducteur non inclus ; passager non lu : foot null. Pellestrina ↔ Chioggia : passagers seulement. Durée : ordre de grandeur." }
  ]
};
