// Contrôles des données publiées (12e audit du 19/09/2026, complétés aux 13e et 14e audits du 19/09/2026) — rapides, sans charger le moteur (sauf le dernier test,
// désactivé par défaut comme tests/generators.test.js) :
//   - aucun nom de lieu qui signifie « aucun nom » ni commentaire d'éditeur (scripts/communes-corrections.js : isJunkName,
//     PLACEHOLDER_NAMES, PLACEHOLDER_QUALIFIED_RE) dans public/data/communes*.txt ;
//   - aucune fiche corrigée (NAME_FIXES) ou écartée une à une (JUNK_IDS) encore publiée sous son ancien nom ;
//   - aucun alias orphelin (nom canonique absent des lieux publiés du pays), dans tous les pays ;
//   - aucun nom contenant « _ » (13e audit du 19/09/2026 : tout « _ », plus seulement en fin de nom) ni mêlant lettres
//     latines et caractères chinois, japonais ou coréens ;
//   - (13e audit du 19/09/2026) aucune parenthèse non appariée, aucun nom réduit à un nombre, aucune fête népalaise
//     « Fair (…) » ni bloc administratif indien « (community development block) » ;
//   - vitesse implicite de chaque ferry (distanceKm / durationH) d'au plus 60 km/h, sauf train-auto ou exception
//     documentée ; pour les durées ESTIMÉES (durationEstimated), 35 km/h jusqu'à 45 km et 45 km/h au-delà (13e audit) ;
//   - (14e audit du 19/09/2026) distance de chaque ferry cohérente avec l'orthodromie entre ses ports, ports proches
//     l'un de l'autre, aucune paire de ports beaucoup plus courte que la liaison ; aucun alias refusé par isJunkName ;
//     doublons en écriture locale écartés avec leur double romanisé publié ;
//   - (15e audit du 19/09/2026) alias réparés (« _ », parenthèse orpheline) publiés, lignes mal rattachées toujours
//     écartées ; aucune espace double dans les alias et les noms ; doublons au même point écartés, nom écarté trouvable
//     comme alias ; paires de ports non documentées absentes ; mentions légales OpenStreetMap et Natural Earth ;
//   - (17e audit du 20/09/2026) BORNES DE DONNÉES, jusque-là absentes : latitude et longitude dans les bornes du
//     globe, population plausible, aucune ligne de lieu dupliquée, code postal bien formé et rattaché au bon pays,
//     aucun lieu isolé de son pays (coordonnées hors du pays déclaré), alias jamais identique au nom publié, code de
//     langue d'alias pris dans une liste fermée ; ferries : vitesse pas TROP BASSE (seule la borne haute existait),
//     prix voiture plafonné et cohérent avec sa classe de distance, ordre des classes ; péages : fourchette par pays
//     (seule la France était ancrée). Chaque borne est démontrée par mutation (voir le rapport de la 17e passe).
//   - scripts/build-ferry-ports.js reproduit lib/ferry-ports.js à l'octet près (TEST_GENERATORS=1 ou test:full).
// Exceptions « en attente » : lignes des pays que leur générateur ne peut pas régénérer hors ligne (fichiers postaux
// GeoNames absents de scripts/postal/) ; la correction est en place dans communes-corrections.js et s'appliquera à la
// prochaine régénération. Le test vérifie que chaque exception est bien couverte par une correction ET toujours
// d'actualité (une exception devenue inutile fait échouer le test, pour qu'elle soit retirée).
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'public', 'data');
const C = require(path.join(ROOT, 'scripts', 'communes-corrections.js'));
const TripData = require(path.join(ROOT, 'public', 'js', 'trip-data.js'));

// Pays -> noms publiés en attente de régénération (build-country-communes.js : fichier postal absent du dépôt).
// VIDE depuis le 19e audit du 21/09/2026 : les cinq dernières (« Zorkovac_ », « Donja_Podgora », « Gornje_Zagorje »
// en Croatie, « XXX » et « Test » en Espagne) attendaient depuis la 12e passe, soit sept passes d'audit. Elles ont
// été appliquées directement aux fichiers publiés, exactement comme le générateur le ferait — un visiteur qui tapait
// « Test » trouvait une localité en Andalousie. Le test qui suit reste : il refuse toute exception qui traînerait.
const PENDING = {};
// Ferries plus rapides que 60 km/h, vérifiés un à un : clé -> motif.
const FAST_FERRY_OK = {
  'balearic|ibiza': 'Palma ↔ Ibiza, ~2 h publiées par Baleària pour le navire rapide (≈ 62 km/h, 34 nœuds)'
};
const MAX_FERRY_KMH = 60;
// 13e audit du 19/09/2026 — durées ESTIMÉES (durationEstimated : durée non publiée par l'exploitant) : un bac ou un ferry
// conventionnel ne tient pas plus de ~35 km/h de moyenne sur une traversée courte (manœuvres de port comprises), ni plus
// de ~45 km/h (≈ 24 nœuds) sur une longue ; au-delà, c'est la durée d'un navire rapide. Dyrøy ↔ Sørburøy (54 km/h)
// passait sous le seul seuil de 60 km/h. Exceptions : liaisons où un navire RAPIDE PRENANT LES VÉHICULES, ou une durée
// publiée, est documenté (note de la liaison ou commentaire de trip-data.js), vérifiées une à une.
const MAX_EST_SHORT_KM = 45, MAX_EST_SHORT_KMH = 35, MAX_EST_KMH = 45;
const FAST_ESTIMATED_OK = {
  'crete|santorini': 'Seajets : voitures et motos sur les navires rapides (note de la liaison), 1 h 30 à 4 h 30',
  // 14e audit du 19/09/2026 : « Fast Ferries » est le nom d'une compagnie de ferries conventionnels, pas un motif ; seul
  // SEAJETS (navires rapides prenant voitures et motos, note de Héraklion ↔ Santorin) justifie Sérifos et Síkinos.
  'continental|serifos': '2 h = durée des navires rapides selon la note ; SEAJETS (rapides prenant les véhicules, voir crete|santorini) parmi les exploitants cités par Ferryhopper',
  'continental|sifnos': 'SEAJETS (navires rapides prenant voitures et motos, voir Heraklion ↔ Santorin) parmi les exploitants',
  'lesvos|limnos': 'Seajets (navires rapides prenant les véhicules), ~2 h 50 publiées',
  'continental|sikinos': 'SEAJETS, seul exploitant rapide cité par Ferryhopper, prend les véhicules (voir crete|santorini) ; origine des 4 h 05 non précisée par la note',
  'greatBritain|guernsey': 'Condor Voyager, navire rapide transportant voitures, caravanes et camping-cars (note de la liaison)',
  'continental|guernsey': 'Condor Ferries (même flotte rapide que Poole ↔ Guernesey), distance orthodromique corrigée',
  'guernsey|jersey': 'Condor Ferries (même flotte rapide), distance orthodromique corrigée',
  'malta|sicily': 'Virtu Ferries Valletta–Pozzallo, 1 h 45 publiée',
  'bornholm|continental': 'Bornholmslinjen Ystad–Rønne, 1 h 20 publiée',
  'continental|gotland': 'Destination Gotland Nynäshamn–Visby, ~3 h 15 publiées',
  'syros|tinos': '~35 min cités par la source pour le ro-pax Blue Star Naxos (22 km)',
  'miquelon|saintPierre': '36 km/h, à peine au-dessus du seuil ; horaire SPM Ferries absent du dépôt : durée laissée telle quelle, à vérifier'
};

// Fichier de lieux de chaque pays (France : communes.txt), d'après COUNTRIES.
const FILES = Object.keys(TripData.COUNTRIES).map(cc => ({ cc, file: TripData.COUNTRIES[cc].file, alias: TripData.COUNTRIES[cc].aliasFile }))
  .filter(x => fs.existsSync(path.join(DATA, x.file)));
function eachLine(file, fn){
  const raw = fs.readFileSync(file, 'utf8');
  let pos = 0, n = 0;
  while(pos < raw.length){
    let nl = raw.indexOf('\n', pos); if(nl < 0) nl = raw.length;
    n++;
    if(nl > pos) fn(raw.slice(pos, nl), n);
    pos = nl + 1;
  }
}
const nameOf = line => line.split(';').slice(4).join(';');
const isPending = (cc, name) => (PENDING[cc] || []).includes(name);

// Noms publiés par pays (chargés une fois : ~4,8 millions de lieux, quelques secondes).
const published = new Map();
for(const { cc, file } of FILES){
  const set = new Set();
  eachLine(path.join(DATA, file), l => set.add(nameOf(l)));
  published.set(cc, set);
}

test('lieux : aucune marque d\'absence de nom ni commentaire d\'éditeur', () => {
  const bad = [];
  for(const { cc, file } of FILES){
    for(const n of published.get(cc)){
      if((C.isJunkName(n) || C.HISTORICAL_NAME_RE.test(n)) && !isPending(cc, n)) bad.push(file + ' : ' + JSON.stringify(n));
    }
  }
  assert.deepEqual(bad, []);
  // Garde-fous du filtre lui-même : les formes relevées par le 12e audit sont reconnues, les vrais noms voisins non.
  for(const n of ['Ninguno', 'Ninguno [CERESO]', 'Ninguno (Ejido Villa Hermosa)', 'Sin Nombre', 'NONE', 'Unknown', 'Kumoh_student']) assert.ok(C.isJunkName(n), n);
  for(const n of ['El Ninguno', 'None', 'No Name', 'Nameless', 'Bezimenne', 'Name']) assert.ok(!C.isJunkName(n), n);
  // 13e audit du 19/09/2026 : parenthèses non appariées et soulignés.
  for(const n of ['Yasnyy))', 'ADK (Complexe', 'Baindada Market(Friday', 'Bada Dashai)', 'Fair(Chaitra Dashai&', ')(', 'Ke_Gaun', 'Orile_Imo']) assert.ok(C.isJunkName(n), n);
  for(const n of ['Shushica e Vogël', 'El Molino [Ranchería]', 'Rāyāt [2]', 'Ar Rab‘ah', 'Fair (Kartik)', 'Neturia', 'Santa Cruz (Lagos (Norte))']) assert.ok(!C.isJunkName(n), n);
});

test('lieux : fiches corrigées ou écartées une à une absentes sous leur ancien nom', () => {
  const bad = [];
  const check = (cc, oldName, what) => {
    const set = published.get(cc);
    if(set && set.has(oldName) && !isPending(cc, oldName)) bad.push(cc + ' : ' + JSON.stringify(oldName) + ' encore publié (' + what + ')');
  };
  for(const [id, e] of Object.entries(C.NAME_FIXES)) check(e[0], e[1], 'NAME_FIXES ' + id);
  for(const [id, e] of Object.entries(C.JUNK_IDS)) check(e[0], e[1], 'JUNK_IDS ' + id);
  assert.deepEqual(bad, []);
});

test('lieux : exceptions « en attente » couvertes par une correction et toujours d\'actualité', () => {
  const fixed = new Set(Object.values(C.NAME_FIXES).map(e => e[0] + '|' + e[1]).concat(Object.values(C.JUNK_IDS).map(e => e[0] + '|' + e[1])));
  const bad = [];
  for(const [cc, names] of Object.entries(PENDING)){
    for(const n of names){
      if(!fixed.has(cc + '|' + n) && !C.isJunkName(n)) bad.push(cc + ' ' + JSON.stringify(n) + ' : aucune correction dans communes-corrections.js');
      if(!published.get(cc) || !published.get(cc).has(n)) bad.push(cc + ' ' + JSON.stringify(n) + ' : plus publié, retirer l\'exception');
    }
  }
  assert.deepEqual(bad, []);
});

// Vrais noms de lieux contenant « _ » (pays -> noms), vérifiés un à un : aucun à ce jour (13e audit du 19/09/2026 — les
// 9 noms publiés relevés étaient tous des erreurs de saisie, voir communes-corrections.js, section 5).
const UNDERSCORE_OK = {};
test('lieux : aucun « _ » dans un nom, aucun nom mêlant latin et chinois, japonais ou coréen', () => {
  const CJK = /[぀-ヿ㐀-鿿豈-﫿가-힯]/, LATIN = /[A-Za-zÀ-ɏ]/;
  const bad = [];
  for(const { cc, file } of FILES){
    for(const n of published.get(cc)){
      if(isPending(cc, n)) continue;
      if(n.includes('_') && !(UNDERSCORE_OK[cc] || []).includes(n)) bad.push(file + ' : ' + JSON.stringify(n) + ' (« _ »)');
      else if(CJK.test(n) && LATIN.test(n)) bad.push(file + ' : ' + JSON.stringify(n) + ' (latin + CJK)');
    }
  }
  assert.deepEqual(bad, []);
});

// 13e audit du 19/09/2026.
test('lieux : parenthèses appariées, aucun nom réduit à un nombre, ni fête (NP) ni bloc administratif (IN)', () => {
  const bad = [];
  for(const { cc, file } of FILES){
    for(const n of published.get(cc)){
      if(isPending(cc, n)) continue;
      if(C.hasUnbalancedParen(n)) bad.push(file + ' : ' + JSON.stringify(n) + ' (parenthèse non appariée)');
      else if(/^\d+$/.test(n)) bad.push(file + ' : ' + JSON.stringify(n) + ' (nombre seul)');
      else if(cc === 'NP' && /^(?:Annual )?Fair\b/i.test(n)) bad.push(file + ' : ' + JSON.stringify(n) + ' (fête, pas un lieu)');
      else if(cc === 'IN' && /community development block/i.test(n)) bad.push(file + ' : ' + JSON.stringify(n) + ' (bloc administratif)');
    }
  }
  assert.deepEqual(bad, []);
});

test('alias : aucun alias orphelin (nom canonique publié dans le fichier de lieux du pays)', () => {
  const bad = [];
  let total = 0;
  for(const { cc, alias } of FILES){
    if(!alias || !fs.existsSync(path.join(DATA, alias))) continue;
    const names = published.get(cc);
    let n = 0;
    eachLine(path.join(DATA, alias), (l, i) => {
      total++;
      const p = l.split(';');
      if(p.length !== 3 || !names.has(p[2])){ n++; if(n <= 5) bad.push(alias + ':' + i + ' ' + JSON.stringify(l)); }
    });
    if(n > 5) bad.push(alias + ' : ' + n + ' lignes orphelines au total');
  }
  assert.ok(total > 1000000, 'fichiers d\'alias introuvables (' + total + ' lignes)');
  assert.deepEqual(bad, []);
});

test('ferries : vitesse implicite (distance / durée) d\'au plus ' + MAX_FERRY_KMH + ' km/h', () => {
  const bad = [], seen = new Set();
  const all = Object.assign({}, TripData.FERRY_ROUTES, TripData.SEA_CROSSINGS);
  for(const [k, r] of Object.entries(all)){
    assert.ok(r.durationH > 0 && r.distanceKm > 0, k + ' : durée ou distance absente');
    const v = r.distanceKm / r.durationH;
    if(v > MAX_FERRY_KMH && r.mode !== 'train'){
      if(FAST_FERRY_OK[k]) seen.add(k);
      else bad.push(k + ' : ' + r.distanceKm + ' km en ' + r.durationH + ' h = ' + v.toFixed(1) + ' km/h');
    }
  }
  assert.deepEqual(bad, []);
  assert.deepEqual(Object.keys(FAST_FERRY_OK).filter(k => !seen.has(k)), [], 'exception devenue inutile : la retirer de FAST_FERRY_OK');
});

// 13e audit du 19/09/2026 (voir FAST_ESTIMATED_OK).
test('ferries : durées estimées d\'au plus ' + MAX_EST_SHORT_KMH + ' km/h jusqu\'à ' + MAX_EST_SHORT_KM + ' km, ' + MAX_EST_KMH + ' km/h au-delà', () => {
  const bad = [], seen = new Set();
  const all = Object.assign({}, TripData.FERRY_ROUTES, TripData.SEA_CROSSINGS);
  for(const [k, r] of Object.entries(all)){
    if(!r.durationEstimated || r.mode === 'train') continue;
    const v = r.distanceKm / r.durationH, max = r.distanceKm <= MAX_EST_SHORT_KM ? MAX_EST_SHORT_KMH : MAX_EST_KMH;
    if(v <= max) continue;
    if(FAST_ESTIMATED_OK[k]) seen.add(k);
    else bad.push(k + ' : ' + r.distanceKm + ' km en ' + r.durationH + ' h (estimée) = ' + v.toFixed(1) + ' km/h > ' + max);
  }
  assert.deepEqual(bad, []);
  assert.deepEqual(Object.keys(FAST_ESTIMATED_OK).filter(k => !seen.has(k)), [], 'exception devenue inutile : la retirer de FAST_ESTIMATED_OK');
});

// 14e audit du 19/09/2026 — distances des ferries comparées aux ports de lib/ferry-ports.js (orthodromie entre les ports
// réellement appariés : pairs, sinon toutes les combinaisons). Quatre contrôles :
//   A. distance > 1,5 × la plus longue orthodromie ET plus de 5 km au-dessus : distance sans rapport avec les ports
//      (Le Pirée ↔ Póros 105 km pour 52, Anticosti 150 pour 71…) ; exceptions = route maritime plus longue que la ligne
//      droite (terres à contourner), vérifiées une à une, notées dans la liaison (DISTANCE_DETOUR_OK) ;
//   B. note de liaison (scripts/iles) qui dit « distance orthodromique » ou « Distance : orthodromie » : écart d'au plus
//      15 % (1 km au moins) avec l'orthodromie entre les ports (Bangka ↔ Belitung 159 km « orthodromiques » pour 88) ;
//   C. ports trop loin l'un de l'autre pour la traversée (plus proche paire > 1,5 × distance + 5 km) : port placé au
//      centre d'une commune étendue, loin de son quai (Saint-Laurent-du-Maroni à 61 km d'Albina pour un bac de 2 km) ;
//      exceptions = quai absent du dépôt, listées (PORTS_FAR_OK) jusqu'à ce qu'un quai OpenStreetMap soit relevé
//      (scripts/ferry-ports/corrections.js, quays). Méthode retenue après essai d'une distance à la côte sur la grille
//      lib/land-grid.bin : rejetée (maille ~10 km : Moorea invisible, ports de fjord et de fleuve faussement signalés) ;
//   D. paire de ports desservie beaucoup plus courte que la liaison (moins du quart et plus de 20 km de moins) : un bac
//      voisin recevait la durée et le prix de la grande ligne (Galatás ↔ Póros, 0,5 km, avec 2 h 30 et 35 € du Pirée ;
//      Vasilikí ↔ Fiskárdo / Fríkes avec la ligne de Patras).
// Chaque exception doit rester nécessaire (sinon le test échoue, pour qu'elle soit retirée).
const FERRY_PORTS = require(path.join(ROOT, 'lib', 'ferry-ports.js'));
const DISTANCE_DETOUR_OK = {
  'continental|dugiOtok': 'Zadar ↔ Brbinj : la ligne droite traverse Ugljan (commentaire de trip-data.js)',
  'ovalau|vitiLevu': 'route non mesurable hors ligne (îlots, ports au centre des localités), ordre de grandeur signalé dans la note',
  'continental|stott': 'idem',
  'guyanaCoast|wakenaam': 'idem',
  // Terres traversées par la ligne droite entre les ports (grille lib/land-grid.bin, 6 km retirés à chaque extrémité) :
  // route maritime plus longue que l'orthodromie, distance non publiée gardée comme ordre de grandeur (note de la liaison).
  'bellaBella|vancouverIsland': '~80 km de terres sur la ligne droite',
  'klemtu|northAmerica': '~110 km de terres sur la ligne droite',
  'juneau|sitka': '~120 km de terres sur la ligne droite',
  'angoon|juneau': '~85 km de terres sur la ligne droite',
  'juneau|tenakee': '~45 km de terres sur la ligne droite',
  'juneau|pelican': '~75 km de terres sur la ligne droite',
  'coldBay|falsePass': '~35 km de terres sur la ligne droite',
  'makkovik|rigolet': '~100 km de terres sur la ligne droite',
  'makkovik|postville': '~30 km de terres sur la ligne droite',
  'cebu|panay': 'route maritime par le sud de Negros (note de la liaison) ; ~110 km de terres sur la ligne droite',
  'navarino|southAmerica': '~200 km de terres sur la ligne droite'
};
const ORTHO_CLAIM_OK = {
  'corsica|sardinia': 'orthodromie vérifiée depuis le bourg de Bonifacio (GeoNames 3031801) : 16,7 km ; le port du fichier est le centre de la commune (5,1 km plus au nord-est)'
};
const PORTS_FAR_OK = {
  'guyane|suriname': 'Saint-Laurent-du-Maroni = centre de la commune (61 km du quai du bac) ; aucun quai dans le dépôt',
  'guyanaCoast|southAmerica': 'Kurupukari : Attai Village et Surumatra (ports-lot6.js ; quai à ~70 km selon corrections.js) ; aucun quai dans le dépôt',
  'moorea|tahiti': 'Moorea = centre de la commune « Moorea-Maiao » (côte ouest ; quai de Vaiare sur la côte est) ; aucun quai dans le dépôt',
  'northAmerica|ocracoke': 'Ocracoke = « Widgen Woods » (ports-lot5.js) ; quai du bac absent du dépôt',
  'longIslandNL|newfoundland': 'Lushes Bight-Beaumont = localité agrégée ; quai absent du dépôt',
  'guyanaCoast|suriname': 'Moleson Creek ↔ South Drain : Crabwood Creek et Van Pettenpolder, localités voisines ; quais absents du dépôt',
  'australia|frenchIsland': 'Tankerton = centre de la localité ; « Tankerton Jetty » (GeoNames 8220499, 2 km) non reprise : build-ferry-ports.js n\'accepte que des quais OpenStreetMap',
  'denmanIsland|hornbyIsland': 'centres des îles Denman et Hornby ; terminaux Gravelly Bay / Shingle Spit absents du dépôt (OpenStreetMap)',
  'northAmerica|sugarIsland': 'Sault Ste. Marie (ville) et « Baie de Wasai » ; quais du bac absents du dépôt',
  'simcoeIsland|wolfeIsland': 'centre de Simcoe Island et Marysville ; quais absents du dépôt',
  'chiloe|quinchao': 'Dalcahue et Curaco de Vélez (centres des localités) ; quais absents du dépôt',
  'chiloe|lemuy': 'Chonchi et Puqueldón (centres des localités ; bac Huicha ↔ Chulchuy) ; quais absents du dépôt',
  'continental|venoe': 'Bremdal et Venø By (centres des localités ; bac Kleppen ↔ Venø) ; quais absents du dépôt'
};
const PAIR_SHORT_OK = {};
test('ferries : distance cohérente avec les ports de la liaison (orthodromie, ports éloignés, paires courtes)', () => {
  const hv = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  const notes = {};
  for(const f of fs.readdirSync(path.join(ROOT, 'scripts', 'iles')).filter(f => f.endsWith('.js'))){
    (require(path.join(ROOT, 'scripts', 'iles', f)).ferries || []).forEach(x => { notes[[x.a, x.b].sort().join('|')] = x.note || ''; });
  }
  const CLAIM = /\b[Dd]istance (?:orthodromique|: orthodromie)/;
  const bad = [], seen = { A: new Set(), B: new Set(), C: new Set(), D: new Set() };
  const all = Object.assign({}, TripData.FERRY_ROUTES, TripData.SEA_CROSSINGS);
  for(const [k, r] of Object.entries(all)){
    const p = FERRY_PORTS[k]; if(!p) continue;
    const [a, b] = k.split('|');
    const prs = p.pairs || p[a].flatMap((_, i) => p[b].map((_, j) => [i, j]));
    const ds = prs.map(([i, j]) => hv(p[a][i][0], p[a][i][1], p[b][j][0], p[b][j][1]));
    const mn = Math.min(...ds), mx = Math.max(...ds), d = r.distanceKm;
    if(d > 1.5 * mx && d - mx > 5){
      if(DISTANCE_DETOUR_OK[k]) seen.A.add(k); else bad.push('A ' + k + ' : ' + d + ' km pour ' + mx.toFixed(1) + ' km d\'orthodromie entre les ports');
    }
    if(notes[k] !== undefined && CLAIM.test(notes[k])){
      const near = d < mn ? mn : d > mx ? mx : d;
      if(Math.abs(d - near) > Math.max(1, 0.15 * near)){
        if(ORTHO_CLAIM_OK[k]) seen.B.add(k); else bad.push('B ' + k + ' : ' + d + ' km dits orthodromiques, ' + mn.toFixed(1) + '-' + mx.toFixed(1) + ' km entre les ports');
      }
    }
    if(mn > 1.5 * d + 5){
      if(PORTS_FAR_OK[k]) seen.C.add(k); else bad.push('C ' + k + ' : ports à ' + mn.toFixed(1) + ' km l\'un de l\'autre pour une traversée de ' + d + ' km');
    }
    ds.forEach((x, n) => {
      if(x < d / 4 && d - x > 20){
        if(PAIR_SHORT_OK[k]) seen.D.add(k); else bad.push('D ' + k + ' : paire ' + JSON.stringify(prs[n]) + ' à ' + x.toFixed(1) + ' km pour une liaison de ' + d + ' km');
      }
    });
  }
  assert.deepEqual(bad, []);
  const stale = [['A', DISTANCE_DETOUR_OK], ['B', ORTHO_CLAIM_OK], ['C', PORTS_FAR_OK], ['D', PAIR_SHORT_OK]]
    .flatMap(([t, o]) => Object.keys(o).filter(k => !seen[t].has(k)).map(k => t + ' ' + k));
  assert.deepEqual(stale, [], 'exception devenue inutile : la retirer');
  // Le Pirée ↔ Póros : Galatás (bac vers Póros) jamais apparié à la ligne du Pirée ; distance recalculée (58 km).
  const poros = FERRY_PORTS['continental|poros'];
  assert.ok(poros.pairs && poros.pairs.every(([i]) => hv(poros.continental[i][0], poros.continental[i][1], poros.poros[0][0], poros.poros[0][1]) > 40), 'Galatás apparié à Le Pirée ↔ Póros');
  assert.equal(TripData.FERRY_ROUTES['continental|poros'].distanceKm, 58);
});

// 14e audit du 19/09/2026 : alias refusés par isJunkName (« _ », parenthèse ou crochet non appariés, « * »…), comme les
// noms de lieux ; build-all-aliases.js les écarte (cleanAliasText).
test('alias : aucun alias refusé par isJunkName (« _ », parenthèse ou crochet non appariés…)', () => {
  const bad = [];
  for(const { alias } of FILES){
    if(!alias || !fs.existsSync(path.join(DATA, alias))) continue;
    eachLine(path.join(DATA, alias), (l, i) => { const p = l.split(';'); if(C.isJunkName(p[1])) bad.push(alias + ':' + i + ' ' + JSON.stringify(l)); });
  }
  assert.deepEqual(bad, []);
  for(const n of ['Ист_Лансинг', 'Rakvere_vald', 'zzLapurdi-) Jatsu', '(佐敷町', '[چانهاسن، مینه‌سوتا', 'Arroyo*']) assert.ok(C.isJunkName(n), n);
  for(const n of ['Ист-Лансинг', 'Rakvere vald', 'Larpea #1', '景島', 'Santa Cruz (Lagos (Norte))']) assert.ok(!C.isJunkName(n), n);
});

// 15e audit du 19/09/2026 : réparation typographique des alias AVANT le refus (communes-corrections.js,
// repairAliasTypography) ; les lignes mal rattachées ou incertaines (ALIAS_REPAIR_REJECT) restent écartées, réparées ou non.
// 16e audit du 20/09/2026 : le commentaire disait « les 82 lignes retirées par la 14e passe sans forme propre ailleurs
// sont revenues sous leur forme réparée », ce qui mélangeait deux comptes. Les vrais chiffres, recomptés sur les
// 115 lignes que la 14e passe avait retirées (diff fdd68aa → f624b64) :
//   - 82 n'avaient, dans le fichier d'alias de leur pays AVANT la 14e passe, aucune autre ligne au même texte normalisé
//     (toutes langues et tous lieux confondus) ; 86 en s'en tenant au même lieu, 89 au même lieu ET à la même langue ;
//   - la 15e passe en a effectivement REMIS 74 (forme réparée absente avant, présente après) ; 26 de plus étaient déjà
//     trouvables sous une autre ligne (rien d'ajouté) et 15 restent écartées.
// La 16e passe en retire 3 de plus (St_Georges_D_Oleron, Клајо Алабама), Михальчина_слобода : voir ALIAS_REPAIR_REJECT).
const aliasLines = new Map();
function aliasSet(cc){
  if(!aliasLines.has(cc)){
    const f = TripData.COUNTRIES[cc].aliasFile;
    aliasLines.set(cc, new Set(f && fs.existsSync(path.join(DATA, f)) ? fs.readFileSync(path.join(DATA, f), 'utf8').split('\n').filter(Boolean) : []));
  }
  return aliasLines.get(cc);
}
test('alias : formes réparées publiées (« _ », parenthèse orpheline), formes mal rattachées toujours écartées', () => {
  const R = C.repairAliasTypography;
  for(const [raw, fixed] of [['伏尔加斯基_', '伏尔加斯基'], ['Иван_Вазово', 'Иван Вазово'], ['Юхары_шильян', 'Юхары шильян'],
    ['(佐敷町', '佐敷町'], ['Hueschtert)', 'Hueschtert'], ['[چانهاسن، مینه‌سوتا', 'چانهاسن، مینه‌سوتا']]){
    assert.equal(R(raw), fixed, raw);
    assert.ok(!C.isJunkName(R(raw)), raw);
  }
  // 16e audit du 20/09/2026 : repairAliasLoose donne la forme que la 15e passe avait publiée pour une ligne désormais
  // refusée — c'est elle que build-all-aliases.js retire des fichiers déjà écrits.
  for(const [raw, loose] of [['St_Georges_D_Oleron', 'St Georges D Oleron'], ['Клајо Алабама)', 'Клајо Алабама'],
    ['Михальчина_слобода', 'Михальчина слобода'], ['Ист_Лансинг', 'Ист Лансинг']]){
    assert.equal(C.repairAliasLoose(raw), loose, raw);
    assert.equal(R(raw), raw, raw);
  }
  // Non réparables : parenthèse au milieu ou deuxième parenthèse non appariée, « * », lignes de ALIAS_REPAIR_REJECT.
  for(const raw of ['zzLapurdi-) Jatsu', '(پنڈی ہاشم (باڑہ', 'حدود الربعة _ الربعة', '景島（Isla Vista)社群', 'CZ*ECO Nelson', ...C.ALIAS_REPAIR_REJECT.keys()]) assert.ok(C.isJunkName(R(raw)), raw);
  const bad = [];
  for(const l of ['ru;Юхары шильян;Yuxarı Şilyan', 'ru;Асрик джырдахан;Asrikdzhyrdakhan', 'bg;Иван Вазово;Ivan-Vazovo', 'zh;伏尔加斯基;Volzhskiy',
    'zh;比拉;Bira', 'ru;Кривая руда;Kryva Ruda', 'zh;约克镇;Yorktown', 'ky;Беркли;Berkeley', 'ja;佐敷町;Sashiki', 'ja;鰍沢町;Kajikazawa',
    'fa;چانهاسن، مینه‌سوتا;Chanhassen', 'lb;Hueschtert;Hostert', 'ga;Baile an Tirialaigh;Tyrrelstown', 'bn;দক্ষিনেশ্বর;Dakshineswar',
    'zh;索爾茲伯里;Salisbury', 'zh;蒂沃利;Tivoli', 'fa;وادی الدواسر;Wadi ad-Dawasir']){
    const cc = { 'Yuxarı Şilyan': 'AZ', Asrikdzhyrdakhan: 'AZ', 'Ivan-Vazovo': 'BG', Volzhskiy: 'RU', Bira: 'RU', 'Kryva Ruda': 'UA', Yorktown: 'US',
      Berkeley: 'US', Sashiki: 'JP', Kajikazawa: 'JP', Chanhassen: 'US', Hostert: 'LU', Tyrrelstown: 'IE', Dakshineswar: 'IN', Salisbury: 'DM',
      Tivoli: 'GD', 'Wadi ad-Dawasir': 'SA' }[l.split(';')[2]];
    if(!aliasSet(cc).has(l)) bad.push(cc + ' : ligne réparée absente ' + JSON.stringify(l));
  }
  // (« nl;Khwaeng Savannakhet;Savannakhet », écrit avec une espace dans GeoNames, était déjà publié avant la 14e passe :
  // non visé ici, voir le README.)
  // 16e audit du 20/09/2026 : trois formes réparées de plus sont refusées ET retirées des fichiers déjà publiés
  // (« sr;Ист Лансинг;East Lansing », fiche 4991640, reste publiée : c'est la bonne ville, pas une réparation).
  for(const [cc, l] of [['EE', 'et;Rakvere vald;Rakvere'], ['US', 'ky;Ист Лансинг;East Tawas'],
    ['MY', 'ms;Mukim Penyabong;Penyabong'], ['YE', 'ar;حدود الربعة الربعة;Ar Rab‘ah'], ['TR', 'ru;Килитташ ке;Kilittaşı'], ['AQ', 'en;CZECO Nelson;Eco-Nelson'],
    ['FR', 'fr;St Georges D Oleron;Saint-Georges-d\'Oléron'], ['US', 'sr;Клајо Алабама;Clio'], ['UA', 'ru;Михальчина слобода;Yasna Poliana']]){
    if(aliasSet(cc).has(l)) bad.push(cc + ' : ligne mal rattachée ou incertaine publiée ' + JSON.stringify(l));
  }
  if(!aliasSet('US').has('sr;Ист Лансинг;East Lansing')) bad.push('US : « sr;Ист Лансинг;East Lansing » retirée à tort');
  if(!aliasSet('UA').has('uk;Михальчина Слобода;Mykhalchyna Sloboda')) bad.push('UA : « uk;Михальчина Слобода;Mykhalchyna Sloboda » retirée à tort');
  assert.deepEqual(bad, []);
});

// 16e audit du 20/09/2026 — CARACTÈRES INVISIBLES DANS LES ALIAS. Espace sans chasse U+200B, trait d'union conditionnel
// U+00AD, gluon de mots U+2060, séparateur mongol U+180E, BOM U+FEFF, marques de direction : aucun clavier ne les tape et
// normalizeCityName ne les retire pas, donc l'alias qui en porte un est introuvable. 19 lignes publiées en portaient un
// (12 avec U+200B, 7 avec U+00AD) ; build-all-aliases.js les retire partout (ALIAS_CONTROL_RE). ZWNJ et ZWJ
// (U+200C/U+200D) sont au contraire GARDÉS : orthographe persane, ourdoue et indienne, réellement saisie.
test('alias : aucun caractère invisible (U+200B, U+00AD, U+FEFF…), ZWNJ et ZWJ gardés', () => {
  const INVISIBLE = /[­؜᠎​‎‏‪-‮⁠⁦-⁩﻿]/;
  const bad = [];
  let zwnj = 0;
  for(const { alias } of FILES){
    if(!alias || !fs.existsSync(path.join(DATA, alias))) continue;
    eachLine(path.join(DATA, alias), (l, i) => {
      if(INVISIBLE.test(l)) bad.push(alias + ':' + i + ' ' + JSON.stringify(l));
      if(/[‌‍]/.test(l)) zwnj++;
    });
  }
  assert.deepEqual(bad, []);
  assert.ok(zwnj > 100, 'les ZWNJ/ZWJ doivent rester (' + zwnj + ' lignes)');
});

// 16e audit du 20/09/2026 — LANGUE CONTREDITE PAR L'ÉCRITURE. Lao, khmer, birman et thaï ont chacun leur écriture,
// qu'aucune des trois autres n'emploie : un alias écrit entièrement dans l'une et déclaré dans une autre de ces quatre
// langues est une étiquette fausse de GeoNames (« km;ເຢຣູຊາເລັມ;Yerushalayim », lao, écarté ; la fiche 281184 porte la
// même chaîne sous « lo », qui reste publiée).
test('alias : lao / khmer / birman / thaï jamais déclarés dans une autre de ces quatre langues', () => {
  const R = { lo: [0x0E80, 0x0EFF], km: [0x1780, 0x17FF], my: [0x1000, 0x109F], th: [0x0E00, 0x0E7F] };
  const LANGS = Object.keys(R);
  const IGNORE = /[\s.,;:()\[\]'’\-‐-—\/0-9]/;
  const bad = [];
  for(const { alias } of FILES){
    if(!alias || !fs.existsSync(path.join(DATA, alias))) continue;
    eachLine(path.join(DATA, alias), (l, i) => {
      const p = l.split(';');
      if(p.length !== 3 || !LANGS.includes(p[0])) return;
      const seen = new Set();
      for(const ch of p[1]){
        if(IGNORE.test(ch)) continue;
        const c = ch.codePointAt(0);
        let s = null;
        for(const g of LANGS) if(c >= R[g][0] && c <= R[g][1]) s = g;
        seen.add(s);
      }
      const only = seen.size === 1 ? [...seen][0] : null;
      if(only && only !== p[0]) bad.push(alias + ':' + i + ' ' + JSON.stringify(l) + ' (écriture ' + only + ')');
    });
  }
  assert.deepEqual(bad, []);
  assert.ok(aliasSet('IL').has('lo;ເຢຣູຊາເລັມ;Yerushalayim'), 'la ligne lao de Jérusalem doit rester');
});

// 16e audit du 20/09/2026 — FUSIONS DE FICHES : un alias ne désigne son lieu que par son NOM. Le nom de la fiche écartée
// (LOCAL_SCRIPT_DUPLICATES, SAME_POINT_DUPLICATES) n'est donc rattaché au nom gardé que si ce nom est UNIQUE parmi les
// lieux publiés du pays ; sinon l'alias vaudrait pour tous les homonymes (« 平泉 » renvoyait les 15 Tateishi du Japon,
// « 蓮湖 » les 16 Lianhu de Chine, sans le bon lieu dans les dix premiers résultats).
test('alias de fusion : publié pour CHAQUE fiche écartée, homonymes compris', () => {
  // 22/09/2026, demande de l'utilisateur : « renvoyer tous les homonymes pour l'inclusion est meilleur ».
  // Le 16e audit avait posé la règle inverse — l'alias d'une fiche écartée n'était rattaché au nom gardé que si ce nom
  // était UNIQUE dans le pays, parce qu'un alias désigne son lieu par son NOM et ramène donc tous ses homonymes
  // (« 平泉 » rendait les 15 Tateishi du Japon). Deux noms étaient ainsi devenus introuvables. La règle est inversée :
  // mieux vaut quinze propositions dont la bonne qu'aucune. Ce test vérifie donc l'inverse de ce qu'il vérifiait :
  // CHAQUE fiche écartée dont le nom gardé est publié doit avoir son alias, qu'il y ait des homonymes ou non.
  const bad = [];
  const publiés = new Map(); // pays -> noms publiés
  const wanted = new Map();
  for(const [cc, rows] of Object.entries(C.SAME_POINT_DUPLICATES).concat(Object.entries(C.LOCAL_SCRIPT_DUPLICATES))){
    if(!wanted.has(cc)) wanted.set(cc, new Set());
    for(const r of rows) wanted.get(cc).add(r[3]);
  }
  for(const [cc, want] of wanted){
    const m = new Map();
    eachLine(path.join(DATA, TripData.COUNTRIES[cc].file), l => { const n = nameOf(l); if(want.has(n)) m.set(n, (m.get(n) || 0) + 1); });
    publiés.set(cc, m);
  }
  let avecHomonymes = 0, total = 0;
  for(const [cc, rows] of Object.entries(C.SAME_POINT_DUPLICATES).concat(Object.entries(C.LOCAL_SCRIPT_DUPLICATES))){
    for(const [, name, , keptName] of rows){
      const n = publiés.get(cc).get(keptName) || 0;
      if(n === 0) continue; // nom gardé absent des lieux publiés : l'alias serait orphelin, un autre test le couvre
      total++;
      if(n > 1) avecHomonymes++;
      const lines = [...aliasSet(cc)].filter(l => { const p = l.split(';'); return p[1] === name && p[2] === keptName; });
      // Une seule exception, vérifiée : le nom de la fiche écartée n'est alias de RIEN dans le pays, la source
      // GeoNames ne le porte sous aucune langue d'interface — il n'y a donc rien à rattacher. Si un autre cas
      // apparaît, il faut le regarder plutôt que l'ignorer : la liste est fermée.
      const RIEN_A_RATTACHER = new Set(['JP|Yanagidamen|Ō-maki']);
      const jamaisAlias = ![...aliasSet(cc)].some(l => l.split(';')[1] === name);
      if(!lines.length && !(jamaisAlias && RIEN_A_RATTACHER.has(cc + '|' + name + '|' + keptName)))
        bad.push(cc + ' : « ' + name + ' » -> « ' + keptName + ' » (' + n + ' lieu(x) de ce nom) : aucun alias publié');
      if(lines.length && RIEN_A_RATTACHER.has(cc + '|' + name + '|' + keptName))
        bad.push(cc + ' : « ' + name + ' » a désormais un alias : le retirer de RIEN_A_RATTACHER');
    }
  }
  assert.ok(avecHomonymes >= 80, 'seulement ' + avecHomonymes + ' lignes de fusion à homonymes : la boucle ne teste plus rien');
  assert.ok(total >= 140, 'seulement ' + total + ' lignes de fusion contrôlées');
  // Les deux lignes que la 16e passe avait RETIRÉES doivent être revenues : c'est le cœur du changement.
  for(const [cc, l] of [['JP', 'ja;平泉;Tateishi'], ['CN', 'zh;蓮湖;Lianhu']])
    if(!aliasSet(cc).has(l)) bad.push(cc + ' : alias de fusion à homonymes toujours absent ' + JSON.stringify(l));
  // Et celles qui n'ont jamais posé de problème sont toujours là.
  for(const [cc, l] of [['CN', 'zh;雄鸡埭;Xiongjidai'], ['IR', 'fa;گوانی;Gavānī'], ['JP', 'ja;大馬木;Ō-maki']])
    if(!aliasSet(cc).has(l)) bad.push(cc + ' : alias de fusion attendu absent ' + JSON.stringify(l));
  assert.deepEqual(bad, []);
});

// 15e audit du 19/09/2026 : espaces multiples (« la  Bisbal », « Orange  (State of New South Wales) », espace + espace
// insécable) ou espace en tête / en fin, dans les alias comme dans les noms publiés.
test('alias et lieux : aucune espace double, ni en tête ni en fin', () => {
  const bad = [];
  const BAD_SPACE = /\s{2,}|^\s|\s$/;
  for(const { cc, alias } of FILES){
    for(const n of published.get(cc)) if(BAD_SPACE.test(n)) bad.push(cc + ' lieu ' + JSON.stringify(n));
    if(!alias || !fs.existsSync(path.join(DATA, alias))) continue;
    eachLine(path.join(DATA, alias), (l, i) => { const p = l.split(';'); if(BAD_SPACE.test(p[1] || '') || BAD_SPACE.test(p[2] || '')) bad.push(alias + ':' + i + ' ' + JSON.stringify(l)); });
  }
  assert.deepEqual(bad, []);
  assert.ok(aliasSet('ES').has('ca;la Bisbal;la Bisbal d\'Empordà') && aliasSet('AU').has('de;Orange (State of New South Wales);Orange'), 'forme à une espace absente');
});

// 14e audit du 19/09/2026 : doublons en écriture locale seule (JP, KR, KP, CN, IR) — chaque fiche écartée a bien son
// double romanisé publié (sinon l'écarter ferait disparaître le lieu). 15e audit du 19/09/2026 : idem pour les doublons au
// même point (SAME_POINT_DUPLICATES), et le nom écarté reste trouvable comme alias du lieu gardé (build-all-aliases.js).
// 16e audit du 20/09/2026 : ce dernier contrôle ne vaut QUE si le nom gardé est unique parmi les lieux publiés du pays.
// Sinon l'alias vaudrait pour tous les homonymes (« 平泉 » -> les 15 Tateishi du Japon) et il n'est plus écrit : le nom
// de la fiche écartée n'est alors plus cherchable, limite assumée faute d'un format d'alias désignant un geonameid.
test('lieux : doublons en écriture locale écartés, lieu romanisé correspondant toujours publié', () => {
  const bad = [];
  for(const table of [C.LOCAL_SCRIPT_DUPLICATES, C.SAME_POINT_DUPLICATES]){
    for(const [cc, rows] of Object.entries(table)){
      const texts = new Set([...aliasSet(cc)].filter(l => l.split(';')[2] !== undefined).map(l => { const p = l.split(';'); return p[1] + '|' + p[2]; }));
      const want = new Set(rows.map(r => r[3]));
      const homonyms = new Map();
      eachLine(path.join(DATA, TripData.COUNTRIES[cc].file), l => { const n = nameOf(l); if(want.has(n)) homonyms.set(n, (homonyms.get(n) || 0) + 1); });
      for(const [id, n, keptId, keptName] of rows){
        if(!C.JUNK_IDS[id] || C.JUNK_IDS[id][0] !== cc) bad.push(cc + ' ' + id + ' ' + n + ' : absent de JUNK_IDS');
        if(!published.get(cc) || !published.get(cc).has(keptName)) bad.push(cc + ' ' + keptId + ' ' + keptName + ' : doublon gardé non publié');
        if(published.get(cc) && published.get(cc).has(n)) bad.push(cc + ' ' + id + ' ' + n + ' : doublon encore publié');
        // « Yanagidamen » (JP 1848564) : aucun nom rattaché à une langue sur sa fiche, ne peut pas devenir un alias.
        if(/[A-Za-z]/.test(n)) continue;
        // Nom gardé porté par plusieurs lieux publiés : aucun alias attendu (16e audit).
        if((homonyms.get(keptName) || 0) > 1) continue;
        if(!texts.has(n + '|' + keptName) && !texts.has(n.replace(/市$/, '') + '|' + keptName)) bad.push(cc + ' ' + n + ' : introuvable, aucun alias de ' + keptName);
      }
    }
  }
  assert.deepEqual(bad, []);
  // 大馬木 (JP 1854180, publié « Ō-maki » par NAME_FIXES) : trouvable par son nom en kanji.
  assert.ok(aliasSet('JP').has('ja;大馬木;Ō-maki'), 'ja;大馬木;Ō-maki absent');
});

// 15e audit du 19/09/2026 : paires de ports sans ligne réelle documentée retirées (scripts/ferry-ports/corrections.js) —
// Astakós ↔ Fríkes (la source ne donne que « Astakos ↔ Pisaetos ; Vasiliki ↔ Frikes ») et Kyllíni ↔ Sámi (source :
// « Kyllini ↔ Poros »).
test('ferries : paires de ports non documentées absentes', () => {
  const hv = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  // [liaison, rive 1, point du port 1, rive 2, point du port 2] : points à moins de 3 km des localités concernées.
  for(const [key, s0, p0, s1, p1, label] of [
    ['continental|ithaca', 'continental', [38.5356, 21.0814], 'ithaca', [38.4584, 20.6639], 'Astakós ↔ Fríkes'],
    ['continental|kefalonia', 'continental', [37.9354, 21.145], 'kefalonia', [38.2508, 20.6469], 'Kyllíni ↔ Sámi']
  ]){
    const p = FERRY_PORTS[key];
    assert.ok(p && p.pairs, key + ' : paires absentes');
    const i0 = p[s0].findIndex(q => hv(q[0], q[1], p0[0], p0[1]) < 3), i1 = p[s1].findIndex(q => hv(q[0], q[1], p1[0], p1[1]) < 3);
    assert.ok(i0 >= 0 && i1 >= 0, key + ' : port introuvable');
    assert.ok(!p.pairs.some(([a, b]) => a === i0 && b === i1), key + ' : paire ' + label + ' encore desservie');
  }
  const C2 = require(path.join(ROOT, 'scripts', 'ferry-ports', 'corrections.js'));
  assert.ok(C2.pairs['continental|ithaca'].pairs.some(pr => pr.join('|') === 'Astakós|Aetós'), 'Astakós ↔ Aetós (Pisaetos) doit rester');
});

// 15e audit du 19/09/2026 : attributions des mentions légales pour les données réellement utilisées — quais de ferry et
// contours d'îles OpenStreetMap (ODbL), grille terre / eau Natural Earth (lib/land-grid.bin, domaine public).
test('mentions légales : OpenStreetMap (quais, contours d\'îles) et Natural Earth cités', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public', 'mentions-legales.html'), 'utf8');
  const item = html.split('<li>').find(x => /Ports de ferry et îles/.test(x)) || '';
  for(const w of ['ferry_terminal', 'Olkhon', 'K’gari', 'Chiloé', 'OpenStreetMap', 'ODbL']) assert.ok(item.includes(w), 'mentions légales, ports et îles : « ' + w + ' » absent');
  // Chaque relation OSM citée par un contour d'île doit être couverte par la mention (Olkhon, K'gari, Chiloé).
  const rel = new Set();
  for(const f of fs.readdirSync(path.join(ROOT, 'scripts', 'iles'))) (fs.readFileSync(path.join(ROOT, 'scripts', 'iles', f), 'utf8').match(/relation\/\d+/g) || []).forEach(r => rel.add(r));
  assert.deepEqual([...rel].sort(), ['relation/2711509', 'relation/2734482', 'relation/6661024'], 'nouveau contour OSM : le citer dans les mentions légales');
  if(fs.existsSync(path.join(ROOT, 'lib', 'land-grid.bin'))) assert.ok(/Natural Earth[\s\S]{0,200}domaine public/.test(html), 'Natural Earth (lib/land-grid.bin) non cité');
});

// =========================================================================================================
// 17e audit du 20/09/2026 — BORNES DE DONNÉES. Jusqu'ici, les contrôles portaient sur les NOMS (marques
// d'absence de nom, typographie, alias orphelins) : une coordonnée, une population, un code postal, un prix ou
// une vitesse aberrants passaient tous. Chaque borne ci-dessous a été vérifiée par mutation (une valeur cassée
// dans les données fait bien échouer le test) et calibrée sur les données du 20/09/2026, avec de la marge :
// il s'agit d'attraper l'absurde, pas de figer les chiffres.
// =========================================================================================================

// Un SEUL parcours des fichiers de lieux (~4,8 millions de lignes, quelques secondes) : chaque test ci-dessous
// n'a plus qu'à lire son tableau. Les violations sont conservées, pas les lignes.
const POP_MAX = 40000000;     // Shanghai, le plus peuplé publié, en compte 24,9 millions
const CP_RE = /^[0-9A-Z]+(?:[ -][0-9A-Z]+)*$/;  // ni minuscule, ni séparateur en tête / en fin / doublé
const CP_LEN = [2, 11];
// Pays dont les lieux sont, par nature, des points isolés à des milliers de kilomètres les uns des autres
// (stations polaires, confettis d'archipels) : le contrôle d'isolement n'y a pas de sens.
// 18e audit du 21/09/2026 : cette liste en comptait 16, dont 11 qui ne servaient à rien (BV, HM, GS, IO, PN, NF,
// CX, CC, TK, NU — aucun de leurs lieux n'était signalé) et une, WF, qui ne correspond à AUCUN pays du projet
// (Wallis-et-Futuna est publié sous FR, région 986). Une exception inutile n'est pas neutre : elle soustrait tout
// un pays au contrôle des coordonnées fausses. Les cinq qui restent sont vérifiées ci-dessous, comme toutes les
// autres listes de ce fichier — une entrée devenue inutile fait échouer le test.
const SCATTERED = new Set(['AQ', 'TF', 'UM', 'SH', 'SJ']);
const ISOLATED_KM = 400, ISOLATED_MAX_PLACES = 3;
// Lieux légitimement isolés de tous les autres lieux de leur pays, vérifiés un à un : atolls, stations polaires,
// dépendances lointaines. Ce contrôle a aussi trouvé trois VRAIES erreurs de coordonnées héritées de GeoNames
// (PG Katingan, BH Magsha, GT Todos Santos Cuchumantan, placées à Bornéo, en Arabie saoudite et dans le Pacifique) :
// elles ne sont pas listées ici, elles ont été écartées à la source (scripts/communes-corrections.js, JUNK_IDS,
// section « coordonnées fausses ») et les trois fichiers de pays régénérés. Une exception qui ne sert plus fait
// échouer le test : c'est ce qui force à les retirer d'ici quand la donnée est réparée.
const ISOLATED_OK = {
  'FR|Île de Clipperton': 'atoll inhabité du Pacifique oriental, français, à 3 900 km de la Polynésie',
  'FR|Miquelon-Langlade': 'Saint-Pierre-et-Miquelon, au large de Terre-Neuve',
  'FR|Saint-Pierre': 'Saint-Pierre-et-Miquelon, au large de Terre-Neuve',
  'FR|Rapa': 'Rapa Iti, Australes, 1 100 km au sud de Tahiti',
  'ZA|Fairbairn Settlement': 'île Marion (îles du Prince-Édouard), sud-africaine, 1 900 km au sud-est du Cap',
  'KI|Kanton Village': 'Kanton, îles Phœnix, 1 800 km des Gilbert',
  'KI|Antereen Village': 'Banaba (Ocean Island), 400 km à l\'ouest des Gilbert',
  'KI|Tabewa Village': 'Banaba (Ocean Island), 400 km à l\'ouest des Gilbert',
  'KI|Umwa Village': 'Banaba (Ocean Island), 400 km à l\'ouest des Gilbert',
  'MU|Port Sainte Rita': 'Agaléga, dépendance mauricienne à 1 100 km de Maurice',
  'MU|Vingt Cinq': 'Agaléga, dépendance mauricienne à 1 100 km de Maurice',
  'SC|Aldabra': 'Aldabra, Seychelles extérieures, 1 100 km de Mahé',
  'SC|Assumption': 'Assomption, Seychelles extérieures, voisine d\'Aldabra',
  'SC|Farquhar': 'Farquhar, Seychelles extérieures, 700 km de Mahé',
  // DZ|Tindouf et MR|Chegga ont quitté cette liste le 21/09/2026 : en publiant les lieux sans code postal,
  // l'Algérie a gagné 356 lieux et la Mauritanie 54, et ces deux-là ne sont plus seuls dans leur coin de désert.
  'GL|Summit Camp': 'station scientifique au centre de la calotte groenlandaise',
  'CA|Mould Bay': 'ancienne station météo de l\'île du Prince-Patrick, Arctique canadien',
  'CK|Motu Koe': 'Penrhyn (Tongareva), îles Cook du Nord',
  'CK|Moto Kavata': 'Penrhyn (Tongareva), îles Cook du Nord',
  'CK|Palmerston': 'Palmerston, île isolée des Cook',
  'MH|Enewetak': 'Enewetak, extrémité ouest des Marshall',
  'BR|Vila dos Remédios': 'Fernando de Noronha, 350 km au large du Pernambouc',
  'BR|Fernando de Noronha (Distrito Estadual)': 'Fernando de Noronha, 350 km au large du Pernambouc',
  // 21/09/2026 — trois territoires réellement isolés, publiés pour la première fois en rendant le code postal
  // facultatif : aucun n'avait de point postal à moins de 15 km, le filtre postal les écartait avec le reste.
  'AU|Lord Howe Island': 'île Lord Howe, 570 km au large de la Nouvelle-Galles du Sud, 464 habitants',
  'NZ|Lumina': 'îles Auckland, subantarctique néo-zélandais, 450 km au sud de la Nouvelle-Zélande',
  'MX|Isla Socorro': 'île Socorro, archipel Revillagigedo, 450 km au large de Colima'
};

const BOUNDS = (() => {
  const badCoord = [], badPop = [], dupLine = [], badCp = [], isolated = [], bouchon = [], idCommeCp = [];
  const hv = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  for(const { cc, file } of FILES){
    const seen = new Map(), cells = new Map();
    eachLine(path.join(DATA, file), (line, i) => {
      const where = file + ':' + i;
      if(seen.has(line)) dupLine.push(where + ' identique à la ligne ' + seen.get(line) + ' : ' + JSON.stringify(line.slice(0, 90)));
      else seen.set(line, i);
      const p = line.split(';');
      if(p.length < 5){ badCoord.push(where + ' : ' + p.length + ' champs'); return; }
      // Population : entier décimal, jamais négatif, jamais au-delà de la plus grande ville publiée.
      if(!/^\d+$/.test(p[0])) badPop.push(where + ' : population ' + JSON.stringify(p[0]) + ' (entier attendu)');
      else if(+p[0] > POP_MAX) badPop.push(where + ' : ' + (+p[0]) + ' habitants (plus de ' + POP_MAX + ')');
      // Coordonnées « longitude,latitude », décimales, dans les bornes du globe.
      const ll = p[1].split(',');
      const lon = Number(ll[0]), lat = Number(ll[1]);
      if(ll.length !== 2 || !/^-?\d+(\.\d+)?$/.test(ll[0]) || !/^-?\d+(\.\d+)?$/.test(ll[1])) badCoord.push(where + ' : coordonnées ' + JSON.stringify(p[1]));
      else if(!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) badCoord.push(where + ' : latitude ' + lat + ', longitude ' + lon + ' hors bornes');
      // Coordonnée à deux entiers exacts (18e audit du 21/09/2026, règle révisée au 19e) : admise seulement si une
      // autre source du dépôt corrobore la position — voir le test plus bas et PLACEHOLDER_COORD_OK.
      else if(Number.isInteger(lat) && Number.isInteger(lon)) bouchon.push({ cle: cc + '|' + nameOf(line) + '|' + lat + '|' + lon, ou: where });
      else {
        const k = Math.floor(lat) + '|' + Math.floor(lon);
        let e = cells.get(k);
        if(!e){ e = { lat: Math.floor(lat) + 0.5, lon: Math.floor(lon) + 0.5, names: [] }; cells.set(k, e); }
        e.names.push(nameOf(line));
      }
      // Codes postaux : forme, longueur, pas de doublon dans la même ligne, et préfixe de pays cohérent quand le
      // code est un repli « XX-… » (un « CN-… » dans un fichier autre que la Chine = ligne rattachée au mauvais pays).
      // Champ VIDE = aucun code postal connu pour ce lieu (21/09/2026 : le code est une aide à la recherche, pas une
      // condition de publication — un lieu réel n'est plus écarté faute de code). Rien à contrôler dans ce cas.
      const cps = p[2] === '' ? [] : p[2].split(',');
      if(new Set(cps).size !== cps.length) badCp.push(where + ' : code postal répété ' + JSON.stringify(p[2]));
      for(const cp of cps){
        if(!CP_RE.test(cp) || cp.length < CP_LEN[0] || cp.length > CP_LEN[1]){ badCp.push(where + ' : code postal ' + JSON.stringify(cp)); continue; }
        if(/^0+$/.test(cp)) badCp.push(where + ' : code postal ' + JSON.stringify(cp) + ' (que des zéros)');
        const m = /^([A-Z]{2})-/.exec(cp);
        if(m && m[1] !== cc) badCp.push(where + ' : code postal ' + cp + ' dans le fichier de ' + cc);
        // « XX-<6 chiffres et plus » : identifiant interne GeoNames pris pour un code (18e audit du 21/09/2026).
        if(/^[A-Z]{2}-\d{5,}$/.test(cp)) idCommeCp.push(where + ' : ' + cp + ' (' + nameOf(line) + ')');
      }
    });
    // Lieu isolé : sa case de 1° ne contient que quelques lieux ET la case occupée la plus proche du MÊME pays est
    // à plus de 400 km. Un lieu déplacé en pleine mer ou dans un autre pays se retrouve seul, très loin des autres.
    if(SCATTERED.has(cc)) continue;
    const arr = [...cells.values()];
    if(arr.length < 2) continue;
    for(const c of arr){
      if(c.names.length > ISOLATED_MAX_PLACES) continue;
      let best = Infinity;
      for(const o of arr){ if(o !== c) best = Math.min(best, hv(c.lat, c.lon, o.lat, o.lon)); }
      if(best > ISOLATED_KM) for(const n of c.names) isolated.push({ cc, name: n, km: Math.round(best), at: c.lat + ',' + c.lon });
    }
  }
  return { badCoord, badPop, dupLine, badCp, isolated, bouchon, idCommeCp };
})();

test('lieux : latitude et longitude bien formées et dans les bornes du globe', () => {
  assert.deepEqual(BOUNDS.badCoord.slice(0, 20), []);
  assert.equal(BOUNDS.badCoord.length, 0);
});

// Coordonnées à deux entiers ADMISES parce que corroborées (19e audit du 21/09/2026, liste REFAITE au 20e — voir
// PLACEHOLDER_COORD_OK dans scripts/communes-corrections.js) : « PAYS|nom|latitude|longitude ». Toute autre fiche à
// deux entiers fait échouer le test, et une entrée qui disparaît des données aussi — une exception devenue inutile
// doit être retirée.
const ENTIERS_CORROBORES = [
  'BO|Prado|-11|-66',
  'CN|Qucain|29|90',
  'ID|Boti|-3|130',
  'LK|Jayanthipura|8|81',
  'MG|Ambatolahy|-21|47',
  'MG|Beanana|-22|48',
  'MM|Nyaungbintha|20|95',
  'NO|Flattum|60|10',
  'NO|Mo|63|9',
  'RO|Troianul|44|25',
  'SE|Grude|58|13',
  'UG|Kikorongo|0|30',
  'VE|Hato Bartolomé|9|-68'
];

test('lieux : coordonnée à deux entiers seulement quand une autre source la corrobore', () => {
  // 18e audit du 21/09/2026, RÉVISÉ au 19e, CORRIGÉ au 20e. Le 18e écartait TOUTE coordonnée à deux entiers, sur
  // l'argument que « GeoNames publie 5 décimales, donc la probabilité d'un vrai lieu est de 1 sur 10 milliards ».
  // Mesure refaite sur les dumps : 0,13 % des fiches ont une latitude entière, l'attendu par hasard est de NEUF, pas
  // de zéro, et la règle avait effacé des lieux réels — dont Troianul (Roumanie, 3 502 habitants, chef-lieu de
  // commune), corroboré par une station paragrêle homonyme à 1,9 km dans le même dump.
  // Le 19e acceptait une seconde corroboration, « le générateur a joint un vrai code postal » : elle était
  // TAUTOLOGIQUE (dans un pays doté d'un fichier postal, aucun lieu n'est publié SANS code postal) et elle a restitué
  // 50 fiches à tort, dont deux quasi-doublons d'un lieu homonyme déjà publié. Seule subsiste la corroboration par
  // une fiche du même nom à coordonnée fine à moins de 5 km, qui n'est pas un lieu déjà publié et dont le point est
  // sur la terre ferme : 13 fiches sur les 139 écartées au 18e audit, listées ci-dessus ; 126 restent écartées.
  const vus = BOUNDS.bouchon.map(x => x.cle).sort();
  const attendus = ENTIERS_CORROBORES.slice().sort();
  const enTrop = vus.filter(x => !attendus.includes(x));
  const disparus = attendus.filter(x => !vus.includes(x));
  assert.deepEqual(enTrop.slice(0, 20), [], 'coordonnée à deux entiers non corroborée : la fiche doit être écartée, ou ajoutée à PLACEHOLDER_COORD_OK avec sa preuve');
  assert.deepEqual(disparus.slice(0, 20), [], 'exception devenue inutile : la retirer de PLACEHOLDER_COORD_OK et de ENTIERS_CORROBORES');
  assert.equal(vus.length, ENTIERS_CORROBORES.length);
});

// Un lieu réel n'est JAMAIS écarté faute de code (21/09/2026, demande de l'utilisateur : « les codes postaux sont
// optionnels, une aide pour retrouver sa ville ; il ne faut pas de ville écartée »). Jusqu'à cette date, six
// générateurs jetaient tout lieu sans point postal à moins de 15 km, et quatre autres tout lieu dont le nom ne
// figurait pas dans une liste de codes tierce : 106 334 lieux réels manquaient, dont 20 965 des 21 339 communes de
// Bosnie-Herzégovine. Ce contrôle relit les dumps GeoNames et vérifie qu'aucun lieu éligible n'est resté dehors.
// Il ne tourne que si scripts/dump/ est présent (non commité, comme scripts/postal/).
const SANS_CODE_ECHANTILLON = ['AT', 'BG', 'LK', 'PE', 'AU', 'DZ', 'TG', 'BA', 'ME', 'XK', 'AM', 'NZ', 'HT', 'SI'];
// Exclusions LÉGITIMES, sans rapport avec un code : la France publie la liste officielle des communes (IGN), pas les
// hameaux GeoNames ; sept pays du Levant appliquent un seuil de population assumé ; la Géorgie exige un nom en
// écriture géorgienne. Aucun de ces pays n'est dans l'échantillon ci-dessus, et c'est écrit plutôt que sous-entendu.
const SANS_CODE_HORS_SUJET = { FR: 'communes officielles IGN, pas les hameaux GeoNames', EG: 'seuil de population',
  IL: 'seuil de population', JO: 'seuil de population', LB: 'seuil de population', LY: 'seuil de population',
  PS: 'seuil de population', SY: 'seuil de population', GE: 'nom en écriture géorgienne exigé' };

test('lieux : aucun lieu réel écarté faute de code postal (échantillon de ' + SANS_CODE_ECHANTILLON.length + ' pays)', (t) => {
  const dumpDir = path.join(ROOT, 'scripts', 'dump');
  if(!fs.existsSync(dumpDir)){ t.skip('scripts/dump/ absent (non commité)'); return; }
  assert.deepEqual(SANS_CODE_ECHANTILLON.filter(cc => SANS_CODE_HORS_SUJET[cc]), [],
    'un pays de l\'échantillon est aussi déclaré hors sujet : choisir l\'un ou l\'autre');
  const C = require(path.join(ROOT, 'scripts', 'communes-corrections.js'));
  const norm = require(path.join(ROOT, 'lib', 'trip-engine.js')).internals.normalizeCityName;
  const KEEP = new Set(['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLA5', 'PPLC', 'PPLF', 'PPLG', 'PPLL', 'PPLS']);
  const hv = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  const manquants = [], sautés = [];
  for(const cc of SANS_CODE_ECHANTILLON){
    const dp = path.join(dumpDir, cc + '_dump.txt');
    const fichier = (TripData.COUNTRIES[cc] || {}).file;
    const pp = fichier && path.join(DATA, fichier);
    if(!fs.existsSync(dp) || !pp || !fs.existsSync(pp)){ sautés.push(cc); continue; }
    const points = new Set(), parNom = new Map();
    eachLine(pp, line => {
      const ch = line.split(';'), ll = ch[1].split(',');
      const lat = +ll[1], lon = +ll[0];
      points.add(lat.toFixed(4) + ',' + lon.toFixed(4));
      const k = norm(ch.slice(4).join(';'));
      let g = parNom.get(k); if(!g) parNom.set(k, g = []);
      g.push([lat, lon]);
    });
    let absents = 0;
    const exemples = [];
    for(const l of fs.readFileSync(dp, 'utf8').split('\n')){
      if(!l) continue;
      const c = l.split('\t');
      if(!KEEP.has(c[7])) continue;
      const lat = parseFloat(c[4]), lon = parseFloat(c[5]);
      if(!isFinite(lat) || !isFinite(lon)) continue;
      let nom;
      try { nom = C.preparePlaceName(cc, c[0], c[1]); } catch(e){ nom = c[1]; }
      if(!nom) continue;
      if(C.excludePlace(cc, c[0], nom, lat, lon)) continue;
      if(points.has(lat.toFixed(4) + ',' + lon.toFixed(4))) continue;
      const proches = parNom.get(norm(nom));
      if(proches && proches.some(q => hv(lat, lon, q[0], q[1]) <= 2)) continue;
      absents++;
      if(exemples.length < 3) exemples.push(nom + ' (' + c[0] + ', ' + lat + ',' + lon + ')');
    }
    if(absents) manquants.push(cc + ' : ' + absents + ' lieu(x) du dump non publiés — ' + exemples.join(', '));
  }
  assert.deepEqual(sautés, [], 'dump ou fichier publié manquant pour ces pays');
  assert.deepEqual(manquants, []);
});

test('lieux : aucun « code postal » qui soit un identifiant interne GeoNames', () => {
  // 18e audit du 21/09/2026 : 1 592 lieux affichaient « KZ-12510143 » (10,6 % du Kazakhstan, plus GL, ML, CK, KY,
  // MV, MO, SC) — l'identifiant de la division, pas un code. Le nom lisible était déjà dans la colonne voisine.
  // L'étiquette retombe désormais sur le code pays seul (voir regionLabel dans scripts/communes-corrections.js) ;
  // les vrais codes admin1 numériques courts (IR-42, BH-16, PG-15) ne sont pas touchés.
  assert.deepEqual(BOUNDS.idCommeCp.slice(0, 20), []);
  assert.equal(BOUNDS.idCommeCp.length, 0);
});

test('lieux : population plausible (entier, au plus ' + POP_MAX + ')', () => {
  assert.deepEqual(BOUNDS.badPop.slice(0, 20), []);
  assert.equal(BOUNDS.badPop.length, 0);
});

test('lieux : aucune ligne de lieu dupliquée', () => {
  assert.deepEqual(BOUNDS.dupLine.slice(0, 20), []);
  assert.equal(BOUNDS.dupLine.length, 0);
});

test('lieux : code postal bien formé et rattaché au bon pays', () => {
  assert.deepEqual(BOUNDS.badCp.slice(0, 20), []);
  assert.equal(BOUNDS.badCp.length, 0);
  // Garde-fous du filtre : les formes réellement publiées passent, les formes absurdes non.
  for(const cp of ['69001', 'CN-22', '3020-578', '100-0002', 'EC4N', 'K1A 0B1']) assert.ok(CP_RE.test(cp) && cp.length >= CP_LEN[0] && cp.length <= CP_LEN[1], cp);
  for(const cp of ['-69001', '69001-', '69 001 ', 'cn-22', '6', '69001#', '69001--2']) assert.ok(!(CP_RE.test(cp) && cp.length >= CP_LEN[0] && cp.length <= CP_LEN[1]), cp);
});

test('lieux : les pays soustraits au contrôle d\'isolement en ont tous besoin', () => {
  // Rejoue l'algorithme d'isolement sur les seuls pays de SCATTERED : chacun doit produire au moins un lieu que le
  // contrôle signalerait, sinon l'exception ne sert plus qu'à cacher d'éventuelles coordonnées fausses.
  const hv = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  const inutiles = [], inexistants = [];
  for(const cc of SCATTERED){
    const f = FILES.find(x => x.cc === cc);
    if(!f){ inexistants.push(cc); continue; }
    const cells = new Map();
    eachLine(path.join(DATA, f.file), line => {
      const p = line.split(';');
      const ll = (p[1] || '').split(',');
      const lon = Number(ll[0]), lat = Number(ll[1]);
      if(!isFinite(lat) || !isFinite(lon)) return;
      const k = Math.floor(lat) + '|' + Math.floor(lon);
      if(!cells.has(k)) cells.set(k, { lat: Math.floor(lat) + 0.5, lon: Math.floor(lon) + 0.5, n: 0 });
      cells.get(k).n++;
    });
    const arr = [...cells.values()];
    let signalé = false;
    if(arr.length >= 2){
      for(const c of arr){
        if(c.n > ISOLATED_MAX_PLACES) continue;
        let best = Infinity;
        for(const o of arr) if(o !== c) best = Math.min(best, hv(c.lat, c.lon, o.lat, o.lon));
        if(best > ISOLATED_KM){ signalé = true; break; }
      }
    }
    if(!signalé) inutiles.push(cc);
  }
  assert.deepEqual(inexistants, [], 'pays absent des fichiers publiés : le retirer de SCATTERED');
  assert.deepEqual(inutiles, [], 'exception devenue inutile : la retirer de SCATTERED (le contrôle d\'isolement n\'y signale rien)');
});

test('lieux : aucun lieu isolé de son pays (coordonnées hors du pays déclaré)', () => {
  const bad = [], seen = new Set();
  for(const x of BOUNDS.isolated){
    const k = x.cc + '|' + x.name;
    if(ISOLATED_OK[k]){ seen.add(k); continue; }
    bad.push(k + ' : ' + x.km + ' km du lieu le plus proche du pays (case ' + x.at + ')');
  }
  assert.deepEqual(bad, []);
  assert.deepEqual(Object.keys(ISOLATED_OK).filter(k => !seen.has(k)), [], 'exception devenue inutile : la retirer de ISOLATED_OK');
});

// ------------------------------------------------------------------------------------------ alias : lieu et langue
// Un alias identique au nom publié n'apporte rien et trahit souvent une ligne mal construite ; un code de langue
// vide ou inconnu empêche aliasLangRank (lib/search-index.js) de choisir le nom affiché dans la langue d'interface.
// La liste des codes est FERMÉE : tout nouveau code doit être ajouté ici sciemment (celui de GeoNames est un
// champ libre où traînent des étiquettes fausses — voir le contrôle lao / khmer / birman / thaï plus haut).
// « alias dont le lieu cible n'existe pas » est déjà couvert par « aucun alias orphelin ».
const ALIAS_LANGS = new Set([
  'aa', 'ab', 'ady', 'af', 'ak', 'alt', 'am', 'ar', 'arn', 'arz', 'as', 'ast', 'av', 'ay', 'az', 'ba', 'bal', 'be',
  'ber', 'bg', 'bi', 'bm', 'bn', 'bo', 'br', 'bs', 'bxr', 'ca', 'ce', 'ceb', 'ch', 'chk', 'chr', 'ckb', 'co', 'cr',
  'crh', 'cs', 'csb', 'cv', 'cy', 'da', 'de', 'dv', 'dz', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'ff', 'fi',
  'fil', 'fj', 'fo', 'fr', 'frr', 'fur', 'ga', 'gag', 'gd', 'gl', 'glk', 'gn', 'gu', 'guc', 'gv', 'ha', 'hak', 'haw',
  'hbs', 'he', 'hi', 'hif', 'ho', 'hr', 'hsb', 'ht', 'hu', 'hy', 'id', 'ig', 'ii', 'inh', 'is', 'it', 'iu', 'ja',
  'jam', 'jv', 'ka', 'kaa', 'kab', 'kbd', 'kg', 'ki', 'kjh', 'kk', 'kl', 'km', 'kmr', 'kn', 'ko', 'koi', 'kos', 'kr',
  'krc', 'krl', 'ku', 'kv', 'kw', 'ky', 'la', 'lb', 'lez', 'lg', 'lij', 'lld', 'ln', 'lo', 'lrc', 'lt', 'ltg', 'lv',
  'man', 'mdf', 'mg', 'mh', 'mhr', 'mi', 'min', 'mk', 'ml', 'mn', 'mr', 'mrj', 'ms', 'mt', 'mwl', 'my', 'myv', 'mzn',
  'na', 'nah', 'nb', 'nd', 'nds', 'ndu', 'ne', 'niu', 'nl', 'nn', 'no', 'nrf-je', 'nso', 'nv', 'ny', 'oc', 'om', 'or',
  'os', 'pa', 'pap', 'pap-AW', 'pau', 'pih', 'pis', 'pl', 'pnb', 'prs', 'ps', 'pt', 'pt-BR', 'qu', 'qug', 'rar', 'rm',
  'rn', 'ro', 'ru', 'rue', 'rw', 'sah', 'sc', 'sco', 'sd', 'se', 'sg', 'sgs', 'shn', 'si', 'sk', 'sl', 'sm', 'sn',
  'so', 'sq', 'sr', 'srn', 'ss', 'st', 'su', 'sv', 'sw', 'syr', 'ta', 'te', 'tet', 'tg', 'th', 'ti', 'tk', 'tl', 'tn',
  'to', 'tpi', 'tr', 'ts', 'tt', 'tum', 'tw', 'ty', 'tyv', 'udm', 'ug', 'uk', 'ur', 'uz', 've', 'vep', 'vi', 'vro',
  'wo', 'xal', 'xh', 'xmf', 'yo', 'yue', 'za', 'zgh', 'zh', 'zh-CN', 'zh-HK', 'zh-Hans', 'zh-Hant', 'zh-TW',
  'zu'
]);
const ALIAS_BOUNDS = (() => {
  const sameAsName = [], unknownLang = [], badShape = [];
  for(const { alias } of FILES){
    if(!alias || !fs.existsSync(path.join(DATA, alias))) continue;
    eachLine(path.join(DATA, alias), (l, i) => {
      const p = l.split(';');
      if(p.length !== 3){ badShape.push(alias + ':' + i + ' ' + JSON.stringify(l.slice(0, 80))); return; }
      if(p[1] === p[2]) sameAsName.push(alias + ':' + i + ' ' + JSON.stringify(l));
      if(!ALIAS_LANGS.has(p[0])) unknownLang.push(alias + ':' + i + ' langue ' + JSON.stringify(p[0]));
    });
  }
  return { sameAsName, unknownLang, badShape };
})();

test('alias : jamais identique au nom publié du lieu', () => {
  assert.deepEqual(ALIAS_BOUNDS.badShape.slice(0, 10), []);
  assert.deepEqual(ALIAS_BOUNDS.sameAsName.slice(0, 20), []);
  assert.equal(ALIAS_BOUNDS.sameAsName.length, 0);
});

test('alias : code de langue non vide et connu (' + ALIAS_LANGS.size + ' codes)', () => {
  assert.deepEqual(ALIAS_BOUNDS.unknownLang.slice(0, 20), []);
  assert.equal(ALIAS_BOUNDS.unknownLang.length, 0);
  // Un code présent dans la liste mais plus employé par aucune ligne resterait invisible : la liste est le reflet
  // exact des fichiers, elle doit donc être entièrement utilisée.
  const used = new Set();
  for(const { alias } of FILES){
    if(!alias || !fs.existsSync(path.join(DATA, alias))) continue;
    eachLine(path.join(DATA, alias), l => used.add(l.split(';')[0]));
  }
  assert.deepEqual([...ALIAS_LANGS].filter(x => !used.has(x)), [], 'code de langue sans aucune ligne : le retirer de ALIAS_LANGS');
});

// ------------------------------------------------------------------------------------------ ferries : vitesse basse
// Le contrôle existant n'a qu'une borne HAUTE (60 km/h) : une durée multipliée par dix ou une distance divisée
// passait sans bruit. Un ferry qui traverse vraiment (plus de 20 km) ne descend pas sous ~10 km/h (5,4 nœuds) ;
// en dessous de 20 km, les manœuvres de port dominent (un bac de 200 m « fait » 4 km/h) et seule l'absurdité est
// contrôlée. Le plus lent publié le 20/09/2026 : 11,3 km/h (Muna ↔ Sulawesi, 34 km) et 3,0 km/h (Salvaterra ↔ Soure, 1 km).
const MIN_FERRY_KMH = 10, MIN_FERRY_KMH_SHORT = 2.5, SHORT_CROSSING_KM = 20;
test('ferries : vitesse implicite d\'au moins ' + MIN_FERRY_KMH + ' km/h au-delà de ' + SHORT_CROSSING_KM + ' km', () => {
  const bad = [];
  const all = Object.assign({}, TripData.FERRY_ROUTES, TripData.SEA_CROSSINGS);
  for(const [k, r] of Object.entries(all)){
    if(r.mode === 'train') continue;
    const v = r.distanceKm / r.durationH, min = r.distanceKm > SHORT_CROSSING_KM ? MIN_FERRY_KMH : MIN_FERRY_KMH_SHORT;
    if(v < min) bad.push(k + ' : ' + r.distanceKm + ' km en ' + r.durationH + ' h = ' + v.toFixed(1) + ' km/h < ' + min);
  }
  assert.deepEqual(bad, []);
});

// ------------------------------------------------------------------------------------------ ferries : prix
// Aucune borne n'existait sur les prix : un tarif multiplié par dix (virgule décalée, monnaie non convertie) était
// facturé tel quel dans le budget du voyage. Trois garde-fous : un plafond absolu pour la voiture, un prix au
// kilomètre rapporté à la médiane de sa classe de distance (médianes le 20/09/2026 : 2,75 €/km sous 10 km, 1,36 de
// 10 à 30, 1,13 de 30 à 80, 0,93 de 80 à 200, 0,65 au-delà ; le rapport le plus élevé réellement publié est 10,1,
// l'île d'Yeu — le seuil de 15 laisse donc 50 % de marge), et l'ordre des classes (camping-car ≥ voiture ≥ moto).
// Le rapport à la médiane n'attrape que les tarifs franchement absurdes : la médiane est recalculée sur les données
// du moment, un prix faux la déplace un peu, et un ×10 sur une liaison déjà chère reste dans la fourchette. C'est
// le plafond absolu et l'ordre des classes qui font le gros du travail.
const FERRY_CAR_MAX_EUR = 500, FERRY_RATE_FACTOR = 15;
const FERRY_PRICE_OK = {
  'grandeTerreNC|mare': 'Betico 2 (Nouvelle-Calédonie), Nouméa ↔ Tadine : 636,76 € voiture, tarif insulaire converti du XPF',
  'grandeTerreNC|lifou': 'Betico 2 (Nouvelle-Calédonie), Nouméa ↔ Wé : 636,76 € voiture, tarif insulaire converti du XPF',
  'grandeTerreNC|ileDesPins': 'Betico 2 (Nouvelle-Calédonie), Nouméa ↔ Île des Pins : 527,84 € voiture, converti du XPF',
  'lifou|mare': 'Betico 2 (Nouvelle-Calédonie), Wé ↔ Tadine : 527,84 € voiture, converti du XPF'
};
// Classe 2 (camping-car, fourgon) moins chère que la classe 1 (voiture) : incohérent, une seule liaison publiée
// dans ce cas, à vérifier auprès de l'exploitant.
const FERRY_CLASS_ORDER_OK = {
  'mayreau|unionIsland': 'Saint-Vincent-et-les-Grenadines : 9,51 € voiture pour 6,34 € camping-car — tarifs relevés ' +
    'sur une liaison sans grille publiée, à revoir (Canouan ↔ Mayreau, la liaison voisine, donne 23,77 / 30,11)'
};
test('ferries : prix voiture d\'au plus ' + FERRY_CAR_MAX_EUR + ' € et au plus ' + FERRY_RATE_FACTOR + ' × la médiane de sa classe de distance', () => {
  const all = Object.assign({}, TripData.FERRY_ROUTES, TripData.SEA_CROSSINGS);
  const CLASSES = [[0, 10], [10, 30], [30, 80], [80, 200], [200, Infinity]];
  const perKm = CLASSES.map(() => []);
  const priced = [];
  for(const [k, r] of Object.entries(all)){
    const p = r.priceByClass || {};
    for(const c of ['1', '2', '5', 'foot']){
      if(p[c] === null || p[c] === undefined) continue;
      assert.ok(typeof p[c] === 'number' && isFinite(p[c]) && p[c] >= 0, k + ' : prix classe ' + c + ' = ' + JSON.stringify(p[c]));
    }
    if(!(p['1'] > 0)) continue;
    const i = CLASSES.findIndex(c => r.distanceKm >= c[0] && r.distanceKm < c[1]);
    perKm[i].push(p['1'] / r.distanceKm);
    priced.push({ k, i, r, p });
  }
  const median = perKm.map(a => { a.sort((x, y) => x - y); return a[a.length >> 1]; });
  const bad = [], seenMax = new Set(), seenOrder = new Set();
  for(const { k, i, r, p } of priced){
    if(p['1'] > FERRY_CAR_MAX_EUR){
      if(FERRY_PRICE_OK[k]) seenMax.add(k);
      else bad.push(k + ' : ' + p['1'] + ' € pour une voiture (plus de ' + FERRY_CAR_MAX_EUR + ' €)');
    }
    const rate = p['1'] / r.distanceKm;
    if(rate > FERRY_RATE_FACTOR * median[i]) bad.push(k + ' : ' + rate.toFixed(2) + ' €/km, plus de ' + FERRY_RATE_FACTOR + ' × la médiane (' + median[i].toFixed(3) + ') de sa classe de distance');
    // Ordre des classes : un camping-car ne coûte jamais moins qu'une voiture, une moto jamais plus.
    if(p['2'] != null && p['1'] != null && p['2'] < p['1']){
      if(FERRY_CLASS_ORDER_OK[k]) seenOrder.add(k);
      else bad.push(k + ' : classe 2 (' + p['2'] + ' €) moins chère que la classe 1 (' + p['1'] + ' €)');
    }
    if(p['5'] != null && p['1'] != null && p['5'] > p['1']) bad.push(k + ' : moto (' + p['5'] + ' €) plus chère qu\'une voiture (' + p['1'] + ' €)');
  }
  assert.deepEqual(bad, []);
  assert.ok(median.every(m => m > 0), 'médianes de prix au kilomètre non calculées : ' + JSON.stringify(median));
  assert.deepEqual(Object.keys(FERRY_PRICE_OK).filter(k => !seenMax.has(k)), [], 'exception devenue inutile : la retirer de FERRY_PRICE_OK');
  assert.deepEqual(Object.keys(FERRY_CLASS_ORDER_OK).filter(k => !seenOrder.has(k)), [], 'exception devenue inutile : la retirer de FERRY_CLASS_ORDER_OK');
});

test('ferries : chaque classe de distance garde au moins 5 durées publiées (sinon la vitesse médiane bascule en silence)', () => {
  // La durée d'une traversée ESTIMÉE vaut distance ÷ vitesse médiane des liaisons PUBLIÉES de même longueur
  // (ferryMedianSpeed, lib/trip-engine.js). Sous CINQ liaisons dans une classe, le moteur retombe sans rien dire sur la
  // médiane de toutes les distances confondues — une traversée de 1 000 km serait alors estimée à la vitesse d'un bac
  // de 10 km. Ce contrôle rend le seuil visible : la classe la plus longue ne tient aujourd'hui qu'à SEPT liaisons
  // (18e audit du 21/09/2026), deux de moins et l'estimation des traversées de 300 km et plus changerait en silence.
  const CLASSES = [15, 45, 100, 300, Infinity];
  const SEUIL = 5; // même seuil que ferryMedianSpeed
  const parClasse = CLASSES.map(() => []);
  for(const r of Object.values(TripData.FERRY_ROUTES)){
    if(!r || r.durationEstimated || r.mode === 'train' || !(r.distanceKm > 0) || !(r.durationH > 0)) continue;
    let c = 0; while(r.distanceKm >= CLASSES[c]) c++;
    parClasse[c].push(r.distanceKm / r.durationH);
  }
  const nom = i => i === 0 ? 'moins de 15 km' : CLASSES[i] === Infinity ? '300 km et plus' : CLASSES[i - 1] + ' à ' + CLASSES[i] + ' km';
  const maigres = parClasse.map((a, i) => ({ i, n: a.length })).filter(x => x.n < SEUIL);
  assert.deepEqual(maigres.map(x => nom(x.i) + ' : ' + x.n + ' liaison(s)'), [],
    'classe sous le seuil de ' + SEUIL + ' : la vitesse médiane y retombe sur celle de toutes les distances. Effectifs : ' +
    parClasse.map((a, i) => nom(i) + '=' + a.length).join(', '));
});

test('bundles : communes-bundle.txt et aliases-bundle.txt reflètent les fichiers de pays', () => {
  // Le serveur charge le moteur DEPUIS les bundles, et tests/search.test.js aussi : un fichier de pays modifié sans
  // reconstruction laissait les deux lire l'ancienne donnée sans que rien ne le signale (18e audit du 21/09/2026).
  // Les bundles ne sont pas commités (ils sont reconstruits par postinstall) : le test ne s'applique que s'ils sont
  // présents, et dit alors comment les régénérer.
  for(const [bundle, champ] of [['communes-bundle.txt', 'file'], ['aliases-bundle.txt', 'aliasFile']]){
    const p = path.join(DATA, bundle);
    if(!fs.existsSync(p)){ console.log('[tests] ' + bundle + ' absent : contrôle ignoré (npm run build-bundles)'); continue; }
    const parts = fs.readFileSync(p, 'utf8').split(/###([A-Z]{2})###\n/);
    const vu = new Map();
    for(let i = 1; i < parts.length; i += 2) vu.set(parts[i], parts[i + 1]);
    const écarts = [];
    for(const cc of Object.keys(TripData.COUNTRIES)){
      const f = TripData.COUNTRIES[cc][champ];
      const chemin = f && path.join(DATA, f);
      const attendu = chemin && fs.existsSync(chemin) ? fs.readFileSync(chemin, 'utf8') : null;
      const dans = vu.get(cc);
      vu.delete(cc);
      if(attendu === null){ if(dans !== undefined) écarts.push(cc + ' : présent dans le bundle, aucun fichier'); continue; }
      if(dans === undefined){ écarts.push(cc + ' : absent du bundle'); continue; }
      if(dans.replace(/\n+$/, '') !== attendu.replace(/\n+$/, '')) écarts.push(cc + ' : contenu différent du fichier');
    }
    for(const cc of vu.keys()) écarts.push(cc + ' : section inconnue dans le bundle');
    assert.deepEqual(écarts, [], bundle + ' périmé — relancer « npm run build-bundles »');
  }
});

test('lieux : les quasi-doublons connus ne se multiplient pas (populations contradictoires, suggestions en double)', () => {
  // Le dédoublonnage des générateurs compare le nom BRUT et le point arrondi à 0,01° ; le moteur compare le nom
  // NORMALISÉ. L'écart laisse passer des paires de lieux à quelques dizaines de mètres qui ne diffèrent que par un
  // accent ou un trait d'union. La clé du dédoublonnage est passée au nom normalisé au 19e audit du 21/09/2026 et
  // 572 doublons ont disparu (voir la note 9 bis de communes-corrections.js) ; il en reste, à cheval sur deux cases
  // de 0,01°, que ce dédoublonnage-là ne peut pas voir. Ce contrôle fige ce qui reste.
  // 20e audit du 21/09/2026 : ces deux nombres étaient des PLAFONDS (« <= »), donc des contrôles à sens unique — une
  // amélioration les laissait intacts et personne n'était forcé de les resserrer, si bien qu'ils auraient pu finir
  // très au-dessus du réel sans qu'aucun test ne bronche. Ce sont désormais les valeurs EXACTES relevées sur l'état
  // publié : une aggravation comme une amélioration font échouer le test, et c'est le chiffre qu'on met à jour.
  const CONTRADICTIONS = 6;  // paires à moins de 300 m publiant deux populations non nulles différentes (12 avant la 19e passe)
  const SUGGESTIONS = 29;    // paires à moins de 300 m avec deux codes postaux, donc deux suggestions (34 avant la 19e passe ; 28 avant que les lieux sans code postal ne soient publiés, 21/09/2026)
  const hv = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  // Même normalisation que le moteur : c est l écart entre elle et la clé du dédoublonnage qu on mesure ici.
  const norm = require(path.join(ROOT, 'lib', 'trip-engine.js')).internals.normalizeCityName;
  let contradictions = 0, suggestions = 0;
  const exemples = [];
  for(const { cc, file } of FILES){
    const par = new Map();
    eachLine(path.join(DATA, file), line => {
      const c = line.split(';'); const ll = (c[1] || '').split(',');
      const o = { pop: parseInt(c[0], 10) || 0, lat: +ll[1], lon: +ll[0], cp: c[2], nom: c.slice(4).join(';') };
      const k = norm(o.nom);
      let g = par.get(k); if(!g) par.set(k, g = []);
      g.push(o);
    });
    for(const g of par.values()){
      if(g.length < 2) continue;
      for(let i = 0; i < g.length; i++) for(let j = i + 1; j < g.length; j++){
        if(hv(g[i].lat, g[i].lon, g[j].lat, g[j].lon) > 0.3) continue;
        if(g[i].pop > 0 && g[j].pop > 0 && g[i].pop !== g[j].pop){
          contradictions++;
          if(exemples.length < 6) exemples.push(cc + ' ' + g[i].nom + ' ' + g[i].pop + ' / ' + g[j].nom + ' ' + g[j].pop);
        }
        if(g[i].cp !== g[j].cp) suggestions++;
      }
    }
  }
  assert.equal(contradictions, CONTRADICTIONS,
    contradictions + ' paires publient deux populations contradictoires au lieu de ' + CONTRADICTIONS +
    (contradictions < CONTRADICTIONS ? ' — c\'est une amélioration : abaisser le chiffre figé.' : ' : ') + exemples.join(' | '));
  assert.equal(suggestions, SUGGESTIONS,
    suggestions + ' paires produisent deux suggestions distinctes au lieu de ' + SUGGESTIONS +
    (suggestions < SUGGESTIONS ? ' — c\'est une amélioration : abaisser le chiffre figé.' : ''));
});

test('ferries : la traversée annoncée n\'est pas plus courte que la ligne droite entre ses ports (écarts connus figés)', () => {
  // Un navire ne peut pas parcourir moins que l'orthodromie entre ses deux quais. Or les ports sont, pour la plupart,
  // le CENTRE de la localité et non le quai (lib/ferry-ports.js le dit en tête) : l'écart est donc réel et connu, mais
  // il n'avait jamais été chiffré (19e audit du 21/09/2026). Mesure sur les 702 liaisons, paires déclarées comprises :
  // 365 annoncent une distance inférieure à cette ligne droite, 194 de plus d'un kilomètre, 42 de plus de cinq,
  // 12 de plus de dix (« 188 » au 19e audit : relevé avant le dédoublonnage du même commit, remesuré au 20e). Les pires sont déjà documentés comme non recalés faute de quai relevé (Saint-Laurent-du-Maroni
  // et le bac de Guyane, Moorea). Conséquence pour le visiteur : la partie routière d'une étape avec traversée mène au
  // centre de la localité, pas au terminal, et la route et la traversée ne se recollent pas exactement.
  // Ce contrôle ne corrige rien : il empêche ces écarts de grandir, et un quai relevé les fera baisser.
  // Valeurs EXACTES et non plafonds, pour la même raison que les deux nombres ci-dessus (20e audit du 21/09/2026).
  const AU_DELA_DE_1_KM = 194;
  const AU_DELA_DE_5_KM = 42;
  const AU_DELA_DE_10_KM = 12;
  const FP = require(path.join(ROOT, 'lib', 'ferry-ports.js'));
  const hv = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  const toutes = Object.assign({}, TripData.FERRY_ROUTES, TripData.SEA_CROSSINGS);
  const écarts = [];
  for(const clé of Object.keys(toutes)){
    const r = toutes[clé], p = FP[clé];
    if(!r || !p || !(r.distanceKm > 0)) continue;
    const rives = clé.split('|'), a = p[rives[0]], b = p[rives[1]];
    if(!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) continue;
    let mini = Infinity;
    if(p.pairs && p.pairs.length){
      for(const pr of p.pairs) if(a[pr[0]] && b[pr[1]]) mini = Math.min(mini, hv(a[pr[0]][0], a[pr[0]][1], b[pr[1]][0], b[pr[1]][1]));
    } else {
      for(const x of a) for(const y of b) mini = Math.min(mini, hv(x[0], x[1], y[0], y[1]));
    }
    if(!isFinite(mini)) continue;
    const écart = mini - r.distanceKm;
    if(écart > 0) écarts.push({ clé, écart });
  }
  écarts.sort((x, y) => y.écart - x.écart);
  const un = écarts.filter(e => e.écart > 1).length;
  const cinq = écarts.filter(e => e.écart > 5).length;
  const dix = écarts.filter(e => e.écart > 10).length;
  const pires = écarts.slice(0, 5).map(e => e.clé + ' ' + e.écart.toFixed(1) + ' km').join(', ');
  assert.equal(un, AU_DELA_DE_1_KM, un + ' liaisons annoncent plus d\'un kilomètre de moins que la ligne droite au lieu de ' + AU_DELA_DE_1_KM + ' : ' + pires);
  assert.equal(cinq, AU_DELA_DE_5_KM, cinq + ' liaisons au-delà de 5 km au lieu de ' + AU_DELA_DE_5_KM + ' : ' + pires);
  assert.equal(dix, AU_DELA_DE_10_KM, dix + ' liaisons au-delà de 10 km au lieu de ' + AU_DELA_DE_10_KM + ' : ' + pires);
});

// ------------------------------------------------------------------------------------------ péages : barème par pays
// Seule la France était ancrée (38 liaisons de référence, tests/toll.test.js) : les seize autres barèmes pouvaient
// être multipliés ou divisés par dix sans qu'aucun test ne bouge. Fourchette par classe, large mais dimensionnée :
//   - classe 1 (voiture) : de 0,005 €/km (Tunisie, 0,0081, autoroutes subventionnées) à 0,30 €/km — le plus cher
//     publié est l'Espagne à 0,145 ; aucun réseau au monde n'atteint 0,30 €/km au tarif de base ;
//   - classe 2 (camping-car, fourgon) : jamais moins que la classe 1, au plus le double du plafond de la classe 1 ;
//   - classe 5 (moto) : jamais plus que la classe 1 ; zéro autorisé (Taïwan : motos exonérées).
// Chaque pays doit porter les trois classes, et n'être présent que s'il est déclaré à péage (hasToll).
const TOLL_RANGE = { 1: [0.005, 0.30], 2: [0.005, 0.60], 5: [0, 0.30] };
test('péages : barème de chaque pays dans une fourchette plausible', () => {
  const bad = [];
  const byCountry = TripData.TOLL_RATE_BY_COUNTRY;
  for(const [cc, rates] of Object.entries(byCountry)){
    if(!TripData.COUNTRIES[cc] || !TripData.COUNTRIES[cc].hasToll) bad.push(cc + ' : barème publié mais le pays n\'est pas déclaré à péage');
    if(!TripData.TOLL_SOURCE[cc]) bad.push(cc + ' : barème sans source (TOLL_SOURCE)');
    for(const cl of ['1', '2', '5']){
      const v = rates[cl];
      if(typeof v !== 'number' || !isFinite(v)){ bad.push(cc + ' classe ' + cl + ' : ' + JSON.stringify(v)); continue; }
      const [lo, hi] = TOLL_RANGE[cl];
      if(v < lo || v > hi) bad.push(cc + ' classe ' + cl + ' : ' + v + ' €/km hors de [' + lo + ' ; ' + hi + ']');
    }
    if(rates['2'] < rates['1']) bad.push(cc + ' : camping-car (' + rates['2'] + ') moins cher que voiture (' + rates['1'] + ')');
    if(rates['5'] > rates['1']) bad.push(cc + ' : moto (' + rates['5'] + ') plus chère que voiture (' + rates['1'] + ')');
  }
  // Tout pays déclaré à péage doit avoir un barème (sinon aucun péage ne lui est jamais facturé, en silence).
  for(const [cc, c] of Object.entries(TripData.COUNTRIES)) if(c.hasToll && !byCountry[cc]) bad.push(cc + ' : déclaré à péage mais sans barème');
  assert.deepEqual(bad, []);
  // La France reste l'ancre : son barème par classe est celui de TOLL_RATE_BY_CLASS (valeur par défaut du moteur).
  assert.deepEqual(byCountry.FR, TripData.TOLL_RATE_BY_CLASS);
  assert.ok(Object.keys(byCountry).length >= 17, 'seulement ' + Object.keys(byCountry).length + ' barèmes de péage');
});

// build-ferry-ports.js charge le moteur et écrit en dur dans ../lib/ferry-ports.js : exécuté dans une COPIE temporaire
// (même méthode que tests/generators.test.js), le dépôt n'est jamais modifié.
const GEN_ENABLED = process.env.TEST_GENERATORS === '1' || process.env.TEST_FULL === '1';
test('générateur build-ferry-ports.js : lib/ferry-ports.js reproduit à l\'octet près',
  { skip: GEN_ENABLED ? false : 'désactivé par défaut : TEST_GENERATORS=1 ou npm run test:full', timeout: 15 * 60000 }, t => {
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-ferry-ports-'));
  const junctions = [];
  try {
    fs.mkdirSync(path.join(TMP, 'scripts'));
    fs.mkdirSync(path.join(TMP, 'public', 'js'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts', 'build-ferry-ports.js'), path.join(TMP, 'scripts', 'build-ferry-ports.js'));
    fs.cpSync(path.join(ROOT, 'scripts', 'ferry-ports'), path.join(TMP, 'scripts', 'ferry-ports'), { recursive: true });
    fs.cpSync(path.join(ROOT, 'lib'), path.join(TMP, 'lib'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'public', 'js', 'trip-data.js'), path.join(TMP, 'public', 'js', 'trip-data.js'));
    for(const [src, dst] of [[path.join(ROOT, 'public', 'data'), path.join(TMP, 'public', 'data')], [path.join(ROOT, 'data'), path.join(TMP, 'data')],
      [path.join(ROOT, 'node_modules'), path.join(TMP, 'node_modules')]]){
      if(!fs.existsSync(src)) continue;
      fs.symlinkSync(src, dst, 'junction'); junctions.push(dst);
    }
    const ref = fs.readFileSync(path.join(ROOT, 'lib', 'ferry-ports.js'));
    const t0 = Date.now();
    const r = spawnSync(process.execPath, ['--max-old-space-size=8192', path.join(TMP, 'scripts', 'build-ferry-ports.js')], { cwd: TMP, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    t.diagnostic('build-ferry-ports.js : ' + Math.round((Date.now() - t0) / 1000) + ' s, code ' + r.status);
    assert.equal(r.status, 0, 'build-ferry-ports.js a échoué :\n' + String(r.stderr || '').slice(-2000));
    const out = fs.readFileSync(path.join(TMP, 'lib', 'ferry-ports.js'));
    if(Buffer.compare(ref, out) !== 0){
      let i = 0; while(i < ref.length && i < out.length && ref[i] === out[i]) i++;
      assert.fail('lib/ferry-ports.js non reproduit : premier écart à l\'octet ' + i + ' (ligne ' + ref.slice(0, i).toString('utf8').split('\n').length +
        ', tailles ' + ref.length + ' / ' + out.length + ')');
    }
  } finally {
    // Jonctions retirées AVANT la suppression récursive (sinon rmSync pourrait descendre dans les dossiers réels).
    for(const j of junctions) try { fs.unlinkSync(j); } catch(e){ try { fs.rmdirSync(j); } catch(e2){} }
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch(e){}
  }
});

test('20e audit : la politique de confidentialité décrit les requêtes que le site fait vraiment', () => {
  // Elle annonçait « GET /api/search-city » alors que le navigateur poste depuis la 17e passe (une URL contenant de
  // l'écriture arabe se faisait renvoyer un 404 par l'hébergeur avant d'atteindre le serveur). La page reste servie
  // telle quelle à un visiteur qui veut savoir ce qui part de son navigateur : elle doit dire vrai.
  const page = fs.readFileSync(path.join(ROOT, 'public', 'politique-confidentialite.html'), 'utf8');
  const app = fs.readFileSync(path.join(ROOT, 'public', 'js', 'app.js'), 'utf8');
  const serveur = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const annoncées = [...page.matchAll(/<code>(GET|POST)\s+(\/api\/[a-z-]+)<\/code>/g)].map(m => ({ m: m[1], r: m[2] }));
  assert.ok(annoncées.length >= 2, 'aucune requête d\'API citée dans la politique de confidentialité');
  const mauvaises = [];
  for(const { m, r } of annoncées){
    // 1. La route existe bien, avec cette méthode, dans server.js.
    const déclarée = new RegExp('app\\.' + m.toLowerCase() + "\\('" + r.replace(/\//g, '\\/') + "'").test(serveur);
    if(!déclarée) mauvaises.push(m + ' ' + r + ' : aucune route de ce nom et de cette méthode dans server.js');
    // 2. C'est bien CETTE méthode que le navigateur emploie pour cette route.
    const i = app.indexOf("fetch('" + r + "'");
    if(i < 0){ mauvaises.push(m + ' ' + r + ' : app.js n\'appelle jamais cette route'); continue; }
    const extrait = app.slice(i, i + 300);
    const employée = /method:\s*'POST'/.test(extrait) ? 'POST' : 'GET';
    if(employée !== m) mauvaises.push(r + ' : la page annonce ' + m + ', app.js emploie ' + employée);
  }
  assert.deepEqual(mauvaises, []);
});

test('mentions légales : les polices incorporées dans les PDF sont citées avec leur licence', () => {
  // 18e audit du 21/09/2026 : la page citait les 5 polices d'AFFICHAGE du site (public/fonts/) et pas une seule des
  // 24 de pdf-fonts/, pourtant INCORPORÉES dans chaque PDF téléchargé — dont Noto Sans CJK © Adobe, absent des cinq.
  // L'OFL exige que sa notice accompagne la redistribution, et incorporer une police dans un document diffusé en est
  // une. Le mot « PDF » n'apparaissait pas une seule fois sur la page.
  const page = fs.readFileSync(path.join(ROOT, 'public', 'mentions-legales.html'), 'utf8');
  assert.ok(/Polices incorporées dans les PDF/i.test(page), 'les polices du PDF ne sont pas citées');
  assert.ok(/Open Font License/i.test(page), 'licence des polices absente');
  assert.ok(/Adobe/.test(page), 'Noto Sans CJK © Adobe non cité');
  // Et le compte annoncé doit correspondre au dossier : 23 familles pour 24 fichiers (NotoSans a une variante grasse).
  const fichiers = fs.readdirSync(path.join(ROOT, 'pdf-fonts')).filter(f => /\.(ttf|otf)$/i.test(f));
  const familles = new Set(fichiers.map(f => f.replace(/-(Regular|Bold)\.(ttf|otf)$/i, '')));
  assert.equal(fichiers.length, 24, 'nombre de fichiers de police changé : mettre la page à jour');
  assert.ok(new RegExp('les ' + familles.size + ' familles').test(page),
    'la page annonce un nombre de familles différent des ' + familles.size + ' de pdf-fonts/');
});
