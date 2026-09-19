// Contrôles des données publiées (12e audit du 19/09/2026) — rapides, sans charger le moteur (sauf le dernier test,
// désactivé par défaut comme tests/generators.test.js) :
//   - aucun nom de lieu qui signifie « aucun nom » ni commentaire d'éditeur (scripts/communes-corrections.js : isJunkName,
//     PLACEHOLDER_NAMES, PLACEHOLDER_QUALIFIED_RE) dans public/data/communes*.txt ;
//   - aucune fiche corrigée (NAME_FIXES) ou écartée une à une (JUNK_IDS) encore publiée sous son ancien nom ;
//   - aucun alias orphelin (nom canonique absent des lieux publiés du pays), dans tous les pays ;
//   - aucun nom terminé par « _ » ni mêlant lettres latines et caractères chinois, japonais ou coréens ;
//   - vitesse implicite de chaque ferry (distanceKm / durationH) d'au plus 60 km/h, sauf train-auto ou exception
//     documentée ;
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

test('lieux : aucun nom terminé par « _ » ni mêlant latin et chinois, japonais ou coréen', () => {
  const CJK = /[぀-ヿ㐀-鿿豈-﫿가-힯]/, LATIN = /[A-Za-zÀ-ɏ]/;
  const bad = [];
  for(const { cc, file } of FILES){
    for(const n of published.get(cc)){
      if(isPending(cc, n)) continue;
      if(/_\s*$/.test(n)) bad.push(file + ' : ' + JSON.stringify(n) + ' (« _ » final)');
      else if(CJK.test(n) && LATIN.test(n)) bad.push(file + ' : ' + JSON.stringify(n) + ' (latin + CJK)');
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
