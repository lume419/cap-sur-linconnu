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

// Pays -> noms publiés en attente de régénération (build-country-communes.js : HR_postal.txt et ES_postal.txt absents).
const PENDING = {
  HR: ['Zorkovac_', 'Donja_Podgora', 'Gornje_Zagorje'],
  ES: ['XXX', 'Test']
};
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
test('alias de fusion : seulement quand le nom gardé est unique dans le pays', () => {
  const bad = [];
  // Nombre de lieux publiés portant chaque nom gardé (le fichier en compte plusieurs, published ne garde qu'un jeu de noms).
  const counts = new Map();
  for(const [cc, rows] of Object.entries(C.SAME_POINT_DUPLICATES).concat(Object.entries(C.LOCAL_SCRIPT_DUPLICATES))){
    const want = new Set(rows.map(r => r[3]));
    const m = new Map();
    eachLine(path.join(DATA, TripData.COUNTRIES[cc].file), l => { const n = nameOf(l); if(want.has(n)) m.set(n, (m.get(n) || 0) + 1); });
    counts.set(cc, m);
  }
  for(const [cc, rows] of Object.entries(C.SAME_POINT_DUPLICATES).concat(Object.entries(C.LOCAL_SCRIPT_DUPLICATES))){
    for(const [, name, , keptName] of rows){
      const n = counts.get(cc).get(keptName) || 0;
      // Le nom de la fiche écartée peut rester publié pour une AUTRE raison (une autre fiche homonyme le porte en nom
      // alternatif : « zh;东坑;Dongkeng »). Seuls les cas nommés ci-dessous, tous issus de la 15e passe, sont garantis.
      if(n > 1 && ['平泉', '蓮湖'].includes(name) && aliasSet(cc).has('ja;' + name + ';' + keptName))
        bad.push(cc + ' : « ' + name + ' » rattaché à « ' + keptName + ' » (' + n + ' homonymes)');
    }
  }
  for(const [cc, l] of [['CN', 'zh;雄鸡埭;Xiongjidai'], ['IR', 'fa;گوانی;Gavānī'], ['JP', 'ja;大馬木;Ō-maki']])
    if(!aliasSet(cc).has(l)) bad.push(cc + ' : alias de fusion attendu absent ' + JSON.stringify(l));
  for(const [cc, l] of [['JP', 'ja;平泉;Tateishi'], ['CN', 'zh;蓮湖;Lianhu']])
    if(aliasSet(cc).has(l)) bad.push(cc + ' : alias de fusion publié malgré les homonymes ' + JSON.stringify(l));
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
