// RECHERCHE DE VILLE DE BOUT EN BOUT (17e audit du 20/09/2026) — le trou de couverture le plus grave relevé par
// l'audit : jusqu'ici AUCUN test ne vérifiait qu'une saisie retrouve le bon lieu. Les contrôles existants
// (tests/data.test.js) ne regardent que la FORME des fichiers publiés ; vider addAliasesToSearchIndex (donc retirer
// les 1,7 million de noms alternatifs de la recherche) ne faisait échouer aucun test, et c'est ce qui a laissé passer
// la régression de la 16e passe (3 416 alias persans et ourdous devenus introuvables parce que normalizeCityName
// s'était mis à retirer les caractères invisibles — dont le ZWNJ — sans que l'index sur disque soit reconstruit).
//
// Ce fichier teste l'API PUBLIQUE, par les DEUX chemins que le serveur peut emprunter :
//   - lib/search-index.js  : index précalculé sur disque (open / search), utilisé dès qu'il est à jour ;
//   - engine.searchCity    : recherche en mémoire du moteur, repli quand l'index est absent ou périmé.
// Les deux doivent rendre LE MÊME LIEU pour la même saisie ; toute divergence connue est listée et justifiée
// (KNOWN_DIVERGENCE), et une divergence réparée fait échouer le test pour que l'entrée soit retirée.
//
// Contenu :
//   1. « index réduit » — un index disque est CONSTRUIT dans un dossier temporaire à partir de huit petits pays
//      (aucune dépendance à cache/, qui n'est pas commité) : la construction, l'ouverture et la recherche de
//      lib/search-index.js sont donc toujours exercées, noms ET alias. On y vérifie aussi que l'index est REFUSÉ
//      quand le normalisateur change ou quand un fichier de données change (le cas exact de la 16e passe).
//   2. « saisies réelles » — table CASES : nom exact, nom sans accent, nom partiel, séparateurs, codes postaux (dont
//      formats à tiret), alias en persan (avec ET sans ZWNJ), arabe, cyrillique, grec, chinois, japonais, coréen,
//      hindi, thaï, géorgien, arménien, hébreu, amharique, ourdou ; langue d'interface ; pays prioritaire ;
//      homonymes classés par population. Chaque cas donne le lieu ATTENDU (pays + nom) et son rang.
//   3. « balayage aléatoire » — N alias tirés au hasard (reproductible) dans tous les fichiers : chacun doit
//      retrouver son lieu. Taux d'échec toléré : des homonymes repoussent légitimement quelques lieux au-delà des
//      20 premiers résultats (2,2 % mesuré sur 2 000 tirages le 20/09/2026) ; sans les alias, le taux monte à ~100 %.
//   TEST_SEARCH_SAMPLE  taille du balayage (1000 par défaut, 10000 avec TEST_FULL=1)
//
// Coût : le moteur en mémoire charge les 4,8 millions de lieux ET les 1,7 million d'alias (~30 s, ~4,4 Go) — c'est
// le seul moyen de tester searchCity avec ses alias ; l'index réduit et l'index de cache/ ne coûtent rien.
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'public', 'data');
const SI = require(path.join(ROOT, 'lib', 'search-index.js'));
const engine = require(path.join(ROOT, 'lib', 'trip-engine.js'));
const TripData = require(path.join(ROOT, 'public', 'js', 'trip-data.js'));
const { FULL, num } = require('./helpers/config.js');

const normalize = engine.internals.normalizeCityName;
const SAMPLE = num('TEST_SEARCH_SAMPLE', FULL ? 10000 : 1000);

// ---------------------------------------------------------------------------------------------------------
// Table des saisies réelles -> lieu attendu.
//   q     saisie telle que l'utilisateur la tape (jamais normalisée ici : c'est le code testé qui doit le faire)
//   place « pays|nom publié » attendu
//   rank  rang attendu dans les résultats (0 = premier) ; par défaut 0
//   lang  langue d'interface ; pref pays prioritaire
//   alias nom alternatif attendu entre parenthèses (matchedName) ; true = « un alias, texte non imposé »
// ---------------------------------------------------------------------------------------------------------
const CASES = [
  // --- noms ---
  { label: 'nom exact', q: 'Lyon', place: 'FR|Lyon' },
  { label: 'nom exact accentué', q: 'Orléans', place: 'FR|Orléans', rank: 1 },
  { label: 'nom sans accent (portugais)', q: 'Sao Paulo', place: 'BR|São Paulo' },
  { label: 'nom sans accent (tréma)', q: 'Zurich', place: 'CH|Zürich' },
  { label: 'nom sans accent (espagnol)', q: 'Malaga', place: 'ES|Málaga' },
  { label: 'tiret remplacé par une espace', q: 'saint denis', place: 'FR|Saint-Denis' },
  { label: 'apostrophe et tirets', q: "l'abergement-clemenciat", place: "FR|L'Abergement-Clémenciat" },
  { label: 'nom partiel', q: 'Marseil', place: 'FR|Marseille' },
  { label: 'nom partiel (Afrique)', q: 'Ouagadou', place: 'BF|Ouagadougou' },
  // --- codes postaux ---
  { label: 'code postal français', q: '69001', place: 'FR|Lyon' },
  { label: 'code postal japonais à tiret', q: '100-0002', place: 'JP|Marunouchi' },
  { label: 'code postal portugais à tiret', q: '3020-578', place: 'PT|São Paulo de Frades' },
  { label: 'code postal chinois à tiret', q: 'cn-22', place: 'CN|Beijing' },
  { label: 'code postal chinois, saisie en majuscules', q: 'CN-22', place: 'CN|Beijing' },
  // --- alias dans une autre écriture ---
  { label: 'arabe', q: 'القاهرة', place: 'EG|Al Qahirah', alias: 'القاهرة' },
  { label: 'cyrillique', q: 'Москва', place: 'RU|Moscow', alias: 'Москва' },
  { label: 'cyrillique partiel', q: 'Санкт-Петер', place: 'RU|Saint Petersburg', alias: 'Санкт-Петербург' },
  { label: 'grec', q: 'Αθήνα', place: 'GR|Athína', alias: 'Αθήνα' },
  { label: 'chinois (2 idéogrammes)', q: '北京', place: 'CN|Beijing', alias: '北京' },
  { label: 'japonais (2 idéogrammes)', q: '東京', place: 'JP|Tokyo', alias: '東京' },
  { label: 'japonais (2 idéogrammes) 2', q: '大阪', place: 'JP|Osaka', alias: '大阪' },
  { label: 'coréen (2 syllabes)', q: '서울', place: 'KR|Seoul', alias: '서울' },
  { label: 'hindi (devanagari)', q: 'दिल्ली', place: 'IN|Delhi', alias: 'दिल्ली' },
  { label: 'thaï', q: 'กรุงเทพมหานคร', place: 'TH|Bangkok', alias: 'กรุงเทพมหานคร' },
  { label: 'thaï 2', q: 'เชียงใหม่', place: 'TH|Chiang Mai', alias: 'เชียงใหม่' },
  { label: 'géorgien', q: 'თბილისი', place: 'GE|Tbilisi', alias: 'თბილისი' },
  { label: 'arménien', q: 'Երևան', place: 'AM|Yerevan', alias: 'Երևան' },
  { label: 'hébreu', q: 'ירושלים', place: 'IL|Yerushalayim' },
  { label: 'amharique (éthiopien)', q: 'አዲስ አበባ', place: 'ET|Addis Ababa', alias: 'አዲስ አበባ' },
  { label: 'persan', q: 'تهران', place: 'IR|Tehran', alias: 'تهران' },
  // ZWNJ (U+200C) : normalizeCityName le retire, la même saisie doit donc marcher avec ET sans. C'est exactement ce
  // qui a cassé à la 16e passe (index construit avant le changement de normalisation).
  { label: 'persan avec ZWNJ', q: 'علی‌آباد کشمر', place: 'IR|Aliabad-e Keshmar', alias: 'علی‌آباد کشمر' },
  { label: 'persan sans ZWNJ', q: 'علیآباد کشمر', place: 'IR|Aliabad-e Keshmar', alias: 'علی‌آباد کشمر' },
  { label: 'ourdou', q: 'کراچی', place: 'PK|Karachi', alias: 'کراچی' },
  { label: 'ourdou avec ZWNJ', q: 'إلٰه‌آباد', place: 'IN|Prayagraj', alias: 'إلٰه‌آباد' },
  { label: 'ourdou sans ZWNJ', q: 'إلٰهآباد', place: 'IN|Prayagraj', alias: 'إلٰه‌آباد' },
  // --- langue d'interface : choix du nom alternatif affiché entre parenthèses ---
  { label: 'langue d\'interface (allemand)', q: 'Sankt Petersburg', lang: 'de', place: 'RU|Saint Petersburg', alias: 'Sankt Petersburg' },
  { label: 'langue d\'interface (espagnol)', q: 'San Petersburgo', lang: 'es', place: 'RU|Saint Petersburg', alias: 'San Petersburgo' },
  { label: 'même saisie, catalan', q: 'munic', lang: 'ca', place: 'DE|München', alias: 'Munic' },
  { label: 'même saisie, espagnol', q: 'munic', lang: 'es', place: 'DE|München', alias: 'Múnich' },
  { label: 'même saisie, français', q: 'munic', lang: 'fr', place: 'DE|München', alias: 'Munich' },
  { label: 'même saisie, galicien', q: 'munic', lang: 'gl', place: 'DE|München', alias: 'Múnic' },
  // --- pays prioritaire (langue d'interface) et homonymes ---
  { label: 'pays prioritaire : Tolède passe devant', q: 'Toledo', pref: 'ES', place: 'ES|Toledo' },
  { label: 'sans pays prioritaire : le plus peuplé d\'abord', q: 'Toledo', place: 'US|Toledo' },
  { label: 'homonymes : Springfield le plus peuplé', q: 'Springfield', place: 'US|Springfield' },
  { label: 'homonymes : San Jose', q: 'San Jose', place: 'US|San Jose' }
];

// Histoire des quatre cas « code postal à tiret » ci-dessus : ils sont nés en échec. searchCommunes (lib/trip-engine.js)
// normalisait la saisie AVANT de chercher dans CP_INDEX — « cn-22 » devenait « cn 22 » alors que les codes sont rangés
// tels quels — et le repli sur la saisie brute ajouté au 10e audit n'existait que dans lib/search-index.js (index
// disque). Un déploiement neuf, tant que l'index n'était pas construit, ne trouvait donc AUCUN code postal à tiret
// (Chine, Japon, Portugal, Pakistan… ~1 million de codes). Le 17e audit (20/09/2026) a ajouté le même repli à
// searchCommunes : les deux chemins s'accordent, ces cas doivent donc réussir des DEUX côtés comme tous les autres.

const key = r => r.country + '|' + r.name;
const rankOf = (list, place) => list.findIndex(r => key(r) === place);
const show = list => list.length ? list.map(r => key(r) + (r.matchedName ? ' (' + r.matchedName + ')' : '')).join(' · ') : '(aucun résultat)';

// Vérifie un cas sur une liste de résultats ; renvoie un message d'erreur ou null.
function checkCase(c, list){
  const want = c.rank === undefined ? 0 : c.rank;
  const got = rankOf(list, c.place);
  if(got !== want) return c.label + ' : ' + JSON.stringify(c.q) + ' -> ' + c.place + ' attendu au rang ' + want + ', trouvé au rang ' + got + ' [' + show(list) + ']';
  if(c.alias){
    const m = list[got].matchedName;
    if(!m) return c.label + ' : ' + JSON.stringify(c.q) + ' -> aucun nom alternatif affiché (l\'alias n\'a pas servi)';
    if(c.alias !== true && m !== c.alias) return c.label + ' : ' + JSON.stringify(c.q) + ' -> nom alternatif « ' + m +' » au lieu de « ' + c.alias + ' »';
    if(!normalize(m).startsWith(normalize(c.q))) return c.label + ' : nom alternatif « ' + m + ' » sans rapport avec la saisie';
  }
  return null;
}

// Population décroissante : le classement de tous les résultats, pas seulement du premier.
function checkPopOrder(list){
  for(let i = 1; i < list.length; i++) if(list[i].pop > list[i - 1].pop) return 'rang ' + i + ' (' + key(list[i]) + ', ' + list[i].pop + ' hab.) devant ' + key(list[i - 1]) + ' (' + list[i - 1].pop + ')';
  return null;
}

// ---------------------------------------------------------------------------------------------------------
// 1. Index disque RÉDUIT construit dans un dossier temporaire : build / open / search de lib/search-index.js.
// ---------------------------------------------------------------------------------------------------------
const MINI_CC = ['ge', 'am', 'is', 'mt', 'cy', 'me', 'xk', 'sm'];
const MINI_DIR = path.join(os.tmpdir(), 'cap-sur-linconnu-tests', 'search-mini-' + process.pid);
// Saisie -> lieu attendu, dans les huit pays de l'index réduit (noms, alias, codes postaux).
const MINI_CASES = [
  { label: 'nom latin', q: 'Tbilisi', place: 'GE|Tbilisi' },
  { label: 'alias géorgien', q: 'თბილისი', place: 'GE|Tbilisi', alias: 'თბილისი' },
  { label: 'alias arménien', q: 'Երևան', place: 'AM|Yerevan', alias: 'Երևան' },
  { label: 'nom islandais partiel', q: 'Reykjav', place: 'IS|Reykjavík' },
  { label: 'alias cyrillique (Monténégro)', q: 'Подгорица', place: 'ME|Podgorica', alias: 'Подгорица' },
  { label: 'alias cyrillique (Kosovo)', q: 'Приштина', place: 'XK|Prishtinë', alias: 'Приштина' },
  { label: 'code postal géorgien', q: '0100', place: 'GE|Tbilisi' },
  { label: 'nom maltais', q: 'Valletta', place: 'MT|Valletta' }
];

function buildMini(){
  const dataDir = path.join(MINI_DIR, 'data'), idxDir = path.join(MINI_DIR, 'index');
  fs.rmSync(MINI_DIR, { recursive: true, force: true });
  fs.mkdirSync(dataDir, { recursive: true });
  for(const cc of MINI_CC){
    for(const f of ['communes-' + cc + '.txt', 'aliases-' + cc + '.txt']) fs.copyFileSync(path.join(DATA, f), path.join(dataDir, f));
  }
  const built = SI.build(dataDir, idxDir, engine.internals, () => {});
  return { dataDir, idxDir, built };
}
after(() => { try { fs.rmSync(MINI_DIR, { recursive: true, force: true }); } catch(e){} });

test('index disque réduit : construit, ouvert, et chaque saisie retrouve son lieu', () => {
  const { dataDir, idxDir, built } = buildMini();
  assert.ok(built.places > 3000 && built.entries > 15000, 'index réduit trop petit : ' + JSON.stringify(built));
  const idx = SI.open(idxDir, dataDir, engine.internals);
  assert.ok(idx, 'index réduit refusé à l\'ouverture');
  const bad = [];
  for(const c of MINI_CASES){
    const m = checkCase(c, idx.search(c.q, 8, c.pref || null, c.lang || null));
    if(m) bad.push(m);
  }
  assert.deepEqual(bad, []);
  // Les alias pèsent la majorité des entrées : un index qui n'en contiendrait plus serait beaucoup plus petit.
  const aliasLines = MINI_CC.reduce((n, cc) => n + fs.readFileSync(path.join(dataDir, 'aliases-' + cc + '.txt'), 'utf8').split('\n').filter(Boolean).length, 0);
  assert.ok(built.entries >= built.places + aliasLines * 0.8,
    built.entries + ' entrées pour ' + built.places + ' lieux et ' + aliasLines + ' alias : des alias manquent dans l\'index');
});

// La régression de la 16e passe EXACTEMENT : le normalisateur change, l'index sur disque reste celui d'avant, et
// 3 416 alias deviennent introuvables sans que rien ne le signale. open() doit refuser un tel index.
test('index disque réduit : refusé quand la normalisation ou les données changent', () => {
  const { dataDir, idxDir } = buildMini();
  assert.ok(SI.open(idxDir, dataDir, engine.internals), 'index réduit refusé alors qu\'il est à jour');
  // a) autre normalisateur (ici : les caractères invisibles ne sont plus retirés, comme AVANT la 16e passe).
  const oldNormalize = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[-'’]/g, ' ').replace(/\s+/g, ' ').trim();
  const oldInternals = Object.assign({}, engine.internals, { normalizeCityName: oldNormalize });
  assert.equal(SI.open(idxDir, dataDir, oldInternals), null, 'index accepté malgré un autre normalisateur : la 16e passe se reproduirait');
  // b) fichier de données modifié après la construction.
  fs.appendFileSync(path.join(dataDir, 'communes-sm.txt'), '0;12.4,43.9;47890;SM-01;Zzztest\n');
  assert.equal(SI.open(idxDir, dataDir, engine.internals), null, 'index accepté malgré un fichier de données modifié');
});

// ---------------------------------------------------------------------------------------------------------
// 2 et 3. Moteur en mémoire (toutes les données) et, s'il est à jour, index de cache/search-index.
// ---------------------------------------------------------------------------------------------------------
let diskIdx = null, diskWhy = '';
let loaded = false;

before(async () => {
  try { diskIdx = SI.open(path.join(ROOT, 'cache', 'search-index'), DATA, engine.internals); }
  catch(err){ diskWhy = err.message; }
  if(!diskIdx && !diskWhy) diskWhy = 'absent, d\'une autre version, périmé ou construit avec un autre normalisateur';
  if(!diskIdx) process.stderr.write('[tests] index de cache/search-index non utilisé (' + diskWhy + ') : seul le moteur en mémoire est vérifié.\n' +
    '        Pour couvrir aussi le chemin disque : npm run build-bundles\n');
  await engine.init(fs.readFileSync(path.join(DATA, 'communes-bundle.txt'), 'utf8'),
    fs.readFileSync(path.join(DATA, 'aliases-bundle.txt'), 'utf8'),
    fs.readFileSync(path.join(DATA, 'featured.txt'), 'utf8'), {});
  loaded = true;
});

test('saisies réelles : le moteur en mémoire (searchCity) retrouve le bon lieu', () => {
  assert.ok(loaded, 'moteur non chargé');
  const bad = [];
  for(const c of CASES){
    const list = engine.searchCity(c.q, 8, c.pref || null, c.lang || null);
    const m = checkCase(c, list);
    if(m) bad.push(m);
  }
  assert.deepEqual(bad, []);
  // Classement par population décroissante (homonymes), hors pays prioritaire qui réordonne volontairement.
  assert.equal(checkPopOrder(engine.searchCity('Springfield', 8)), null);
  assert.equal(checkPopOrder(engine.searchCity('San Jose', 8)), null);
  // Saisie trop courte : rien (et surtout pas les 4,8 millions de lieux).
  assert.deepEqual(engine.searchCity('Ly', 8), []);
  assert.ok(engine.searchCity('北京', 8).length > 0, 'deux idéogrammes doivent suffire');
});

test('saisies réelles : l\'index sur disque retrouve le bon lieu et donne le MÊME que la mémoire', (t) => {
  if(!diskIdx){ t.skip('index de cache/search-index indisponible (' + diskWhy + ')'); return; }
  const bad = [], diverge = [];
  for(const c of CASES){
    const list = diskIdx.search(c.q, 8, c.pref || null, c.lang || null);
    const m = checkCase(c, list);
    if(m) bad.push(m);
    const mem = engine.searchCity(c.q, 8, c.pref || null, c.lang || null);
    const a = list.length ? key(list[0]) : '', b = mem.length ? key(mem[0]) : '';
    if(a !== b) diverge.push(c.label + ' : ' + JSON.stringify(c.q) + ' -> disque « ' + (a || 'rien') + ' », mémoire « ' + (b || 'rien') + ' »');
  }
  assert.deepEqual(bad, []);
  assert.deepEqual(diverge, [], 'les deux chemins de recherche ne rendent pas le même lieu');
});

// Balayage : des alias tirés au hasard dans TOUS les fichiers, chacun doit retrouver son lieu. C'est le contrôle qui
// s'effondre si les alias disparaissent de l'index (taux d'échec ~100 %) ou s'ils sont rattachés au mauvais lieu.
function sampleAliases(n){
  let seed = 20260920;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const ccs = Object.keys(TripData.COUNTRIES).filter(cc => TripData.COUNTRIES[cc].aliasFile && fs.existsSync(path.join(DATA, TripData.COUNTRIES[cc].aliasFile)));
  const cache = new Map(), out = [];
  for(let i = 0; i < n; i++){
    const cc = ccs[Math.floor(rnd() * ccs.length)];
    if(!cache.has(cc)) cache.set(cc, fs.readFileSync(path.join(DATA, TripData.COUNTRIES[cc].aliasFile), 'utf8').split('\n').filter(Boolean));
    const lines = cache.get(cc);
    const p = lines[Math.floor(rnd() * lines.length)].split(';');
    if(p.length === 3) out.push({ cc, lang: p[0], text: p[1], name: p[2] });
  }
  return out;
}
// Marge : quelques alias très communs sont légitimement repoussés au-delà des 20 premiers résultats par des
// homonymes plus peuplés (2,2 % mesuré sur 2 000 tirages le 20/09/2026), et les noms de moins de 3 caractères dans
// une écriture non idéographique (amharique « ዋጅ ») ne sont pas cherchables — limite connue.
const MAX_MISS_RATE = 0.08;
test('balayage : ' + SAMPLE + ' alias tirés au hasard retrouvent leur lieu', () => {
  const picks = sampleAliases(SAMPLE);
  assert.ok(picks.length > SAMPLE * 0.9, 'échantillon incomplet (' + picks.length + ')');
  const miss = [];
  for(const a of picks){
    const r = engine.searchCity(a.text, 20, null, a.lang);
    if(!r.some(x => x.country === a.cc && x.name === a.name)) miss.push(a.cc + ' ' + a.lang + ';' + a.text + ';' + a.name);
  }
  const rate = miss.length / picks.length;
  assert.ok(rate <= MAX_MISS_RATE, miss.length + ' alias sur ' + picks.length + ' (' + (100 * rate).toFixed(2) + ' %) ne retrouvent pas leur lieu, maximum ' +
    (100 * MAX_MISS_RATE) + ' % :\n' + miss.slice(0, 20).map(x => '  - ' + x).join('\n'));
  // Contre-épreuve : le même balayage à travers l'index disque doit donner un taux comparable.
  if(diskIdx){
    let d = 0;
    for(const a of picks) if(!diskIdx.search(a.text, 20, null, a.lang).some(x => x.country === a.cc && x.name === a.name)) d++;
    assert.ok(Math.abs(d - miss.length) <= Math.max(5, picks.length * 0.01),
      'index disque : ' + d + ' échecs contre ' + miss.length + ' en mémoire — les deux chemins ne voient pas les mêmes alias');
  }
});
