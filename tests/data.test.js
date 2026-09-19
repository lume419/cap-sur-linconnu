// Contrôles des données publiées (12e audit du 19/09/2026, complétés au 13e audit du 19/09/2026) — rapides, sans charger le moteur (sauf le dernier test,
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
  'continental|serifos': '2 h = durée des navires rapides (SEAJETS, Fast Ferries) selon Ferryhopper, véhicules acceptés',
  'continental|sifnos': 'SEAJETS (navires rapides prenant voitures et motos, voir Heraklion ↔ Santorin) parmi les exploitants',
  'lesvos|limnos': 'Seajets (navires rapides prenant les véhicules), ~2 h 50 publiées',
  'continental|sikinos': 'Fast Ferries, SEAJETS (navires rapides prenant les véhicules)',
  'koufonisia|naxos': 'SEAJETS (navires rapides prenant les véhicules) ; 35 min = durée la plus courte publiée',
  'greatBritain|guernsey': 'Condor Voyager, navire rapide transportant voitures, caravanes et camping-cars (note de la liaison)',
  'continental|guernsey': 'Condor Ferries (même flotte rapide que Poole ↔ Guernesey), distance orthodromique corrigée',
  'guernsey|jersey': 'Condor Ferries (même flotte rapide), distance orthodromique corrigée',
  'malta|sicily': 'Virtu Ferries Valletta–Pozzallo, 1 h 45 publiée',
  'bornholm|continental': 'Bornholmslinjen Ystad–Rønne, 1 h 20 publiée',
  'continental|gotland': 'Destination Gotland Nynäshamn–Visby, ~3 h 15 publiées',
  'continental|mykonos': 'Le Pirée–Mýkonos 2 h 40 à 5 h 50 publiées (Seajets / Blue Star), 3 h 30 retenu',
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
