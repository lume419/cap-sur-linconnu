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
const Module = require('module');

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

// Copie de lib/trip-engine.js compilée avec un normalisateur MODIFIÉ : c'est le seul moyen d'éprouver ce que
// l'empreinte doit attraper, puisqu'un simple objet « internals » bricolé ne prouverait que ce qu'on y met.
function engineAvecNormDrop(remplacement){
  const fichier = path.join(ROOT, 'lib', 'trip-engine.js');
  const src0 = fs.readFileSync(fichier, 'utf8');
  const ancien = 'const NORM_DROP_RE = /[\\u00B7\\u2027\\u0640\\u064B-\\u0652\\u0670]/g;';
  assert.ok(src0.includes(ancien), 'NORM_DROP_RE introuvable dans lib/trip-engine.js');
  const m = new Module(fichier, module);
  m.filename = fichier;
  m.paths = Module._nodeModulePaths(path.dirname(fichier));
  m._compile(src0.replace(ancien, remplacement), fichier);
  return m.exports;
}

test('20e audit : l\'index sur disque est refusé aussi quand le normalisateur AJOUTE un caractère', () => {
  // L'empreinte du normalisateur ne comparait que la sortie d'une liste d'échantillons. Elle voyait donc qu'un
  // caractère cessait d'être traité, jamais qu'un caractère NOUVEAU se mettait à l'être : aucun échantillon ne le
  // contient. L'index déjà construit restait accepté avec ses anciennes clés — la régression de la 16e passe,
  // 3 416 alias devenus introuvables sans la moindre erreur visible.
  const { dataDir, idxDir } = buildMini();
  assert.ok(SI.open(idxDir, dataDir, engine.internals), 'index réduit refusé alors qu\'il est à jour');
  // Un caractère de PLUS dans le jeu retiré (ici la lettre syriaque U+0711, absente de tous les échantillons).
  const plus = engineAvecNormDrop('const NORM_DROP_RE = /[\\u00B7\\u2027\\u0640\\u064B-\\u0652\\u0670\\u0711]/g;');
  assert.equal(plus.internals.normalizeCityName('aܑb'), 'ab', 'le normalisateur modifié ne retire pas U+0711');
  assert.equal(engine.internals.normalizeCityName('aܑb'), 'aܑb', 'le normalisateur réel retire déjà U+0711 : choisir un autre caractère');
  // Contre-épreuve du DÉFAUT : sur les échantillons seuls, les deux normalisateurs rendent la même chose.
  const NORM_PROBE_SORTIE = f => ['سوم‌دره', 'Œuf-d\'Ange', 'Sainte-Foy', 'ÉLAN  élan', 'İzmir', '北京', 'cn-15']
    .map(x => f(x)).join('|');
  assert.equal(NORM_PROBE_SORTIE(plus.internals.normalizeCityName), NORM_PROBE_SORTIE(engine.internals.normalizeCityName),
    'les échantillons suffisaient à voir la différence : la contre-épreuve ne prouve rien');
  assert.equal(SI.open(idxDir, dataDir, plus.internals), null,
    'index accepté alors que le normalisateur retire un caractère de plus : la 16e passe se reproduirait');
  // Et une copie NON modifiée reste acceptée (l'empreinte ne dépend pas du hasard de la compilation).
  const pareil = engineAvecNormDrop('const NORM_DROP_RE = /[\\u00B7\\u2027\\u0640\\u064B-\\u0652\\u0670]/g;');
  assert.ok(SI.open(idxDir, dataDir, pareil.internals), 'index refusé alors que le normalisateur est identique');
});

// ---------------------------------------------------------------------------------------------------------
// 2 et 3. Moteur en mémoire (toutes les données) et, s'il est à jour, index de cache/search-index.
// ---------------------------------------------------------------------------------------------------------
let diskIdx = null, diskWhy = '', indexPresentMaisRefuse = false;
let loaded = false;

before(async () => {
  try { diskIdx = SI.open(path.join(ROOT, 'cache', 'search-index'), DATA, engine.internals); }
  catch(err){ diskWhy = err.message; }
  if(!diskIdx && !diskWhy) diskWhy = 'absent, d\'une autre version, périmé ou construit avec un autre normalisateur';
  if(!diskIdx) process.stderr.write('[tests] index de cache/search-index non utilisé (' + diskWhy + ') : seul le moteur en mémoire est vérifié.\n' +
    '        Pour couvrir aussi le chemin disque : npm run build-bundles\n');
  // Index PRÉSENT mais REFUSÉ : ce n'est pas une absence, c'est un index périmé ou incohérent — et c'est aussi ce que
  // le serveur trouverait au démarrage. Le laisser passer en silence a caché une mutation du champ « commune » côté
  // disque (23/09/2026) : trois tests restaient verts en ne contrôlant qu'une voie sur deux.
  indexPresentMaisRefuse = !diskIdx && fs.existsSync(path.join(ROOT, 'cache', 'search-index', 'meta.json'));
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

// Groupes « pays|nom normalisé|code postal » partagés par PLUSIEURS lieux publiés. La recherche n'en rend qu'un
// (limite mesurée et documentée dans lib/trip-engine.js : 634 832 lieux, 13,2 %, sont ainsi masqués) — mais celui
// qu'elle rend doit être LE PLUS PEUPLÉ, et le même par les deux chemins. Jusqu'au 20e audit du 21/09/2026, la
// recherche en mémoire gardait le PREMIER rencontré dans l'ordre des fichiers : sur dix saisies éprouvées, sept
// donnaient un lieu différent de l'index sur disque, et Robīt (Éthiopie, 39 600 habitants) n'apparaissait pas du
// tout en mémoire, effacé par un homonyme de 20 679 habitants.
const GROUPES_PARTAGES = (() => {
  const out = [];
  const vus = new Set();
  for(const cc of Object.keys(TripData.COUNTRIES).sort()){
    const f = TripData.COUNTRIES[cc].file;
    if(!f || vus.has(f)) continue;
    vus.add(f);
    const p = path.join(DATA, f);
    if(!fs.existsSync(p)) continue;
    const groupes = new Map();
    for(const l of fs.readFileSync(p, 'utf8').split('\n')){
      if(!l) continue;
      const ch = l.split(';');
      const nom = ch[4];
      const cp = (ch[2] || '').split(',')[0];
      const k = engine.internals.normalizeCityName(nom) + '|' + cp;
      const e = { nom, pop: parseInt(ch[0], 10) || 0, cp, norm: engine.internals.normalizeCityName(nom) };
      const g = groupes.get(k);
      if(g) g.push(e); else groupes.set(k, [e]);
    }
    for(const [, g] of groupes){
      if(g.length < 2) continue;
      const pops = g.map(x => x.pop);
      const max = Math.max.apply(null, pops);
      // Seulement les groupes où le choix SE VOIT : populations distinctes, et une vraie ville en jeu.
      if(max <= 10000 || pops.filter(x => x === max).length !== 1) continue;
      const gagnant = g.find(x => x.pop === max);
      if(gagnant.norm.length < 3) continue;
      out.push({ cc, q: gagnant.nom, norm: gagnant.norm, cp: gagnant.cp, pop: max });
    }
  }
  return out;
})();

test('homonymes de même code postal : les deux chemins rendent le lieu LE PLUS PEUPLÉ', (t) => {
  assert.ok(GROUPES_PARTAGES.length >= 50, 'échantillon trop maigre (' + GROUPES_PARTAGES.length + ' groupes)');
  const bad = [];
  for(const g of GROUPES_PARTAGES){
    const mem = engine.searchCity(g.q, 40, g.cc, null) || [];
    const vu = mem.find(x => x.country === g.cc && engine.internals.normalizeCityName(x.name) === g.norm && x.cp === g.cp);
    if(vu && vu.pop !== g.pop) bad.push('mémoire ' + g.cc + ' ' + JSON.stringify(g.q) + ' cp ' + g.cp + ' : ' + vu.pop + ' hab. rendu au lieu de ' + g.pop);
    if(diskIdx){
      const dsk = diskIdx.search(g.q, 40, g.cc, null) || [];
      const vd = dsk.find(x => x.country === g.cc && engine.internals.normalizeCityName(x.name) === g.norm && x.cp === g.cp);
      if(vd && vd.pop !== g.pop) bad.push('disque ' + g.cc + ' ' + JSON.stringify(g.q) + ' cp ' + g.cp + ' : ' + vd.pop + ' hab. rendu au lieu de ' + g.pop);
      if(!!vu !== !!vd) bad.push('divergence ' + g.cc + ' ' + JSON.stringify(g.q) + ' : ' + (vu ? 'mémoire seule' : 'disque seul'));
    }
  }
  if(!diskIdx) t.diagnostic('index de cache/search-index indisponible (' + diskWhy + ') : seul le chemin en mémoire est vérifié');
  assert.deepEqual(bad.slice(0, 20), []);
  assert.equal(bad.length, 0);
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
test('balayage : ' + SAMPLE + ' alias tirés au hasard retrouvent leur lieu', (t) => {
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
  if(!diskIdx) t.diagnostic('contre-épreuve disque NON exécutée (' + diskWhy + ')');
  if(diskIdx){
    let d = 0;
    for(const a of picks) if(!diskIdx.search(a.text, 20, null, a.lang).some(x => x.country === a.cc && x.name === a.name)) d++;
    assert.ok(Math.abs(d - miss.length) <= Math.max(5, picks.length * 0.01),
      'index disque : ' + d + ' échecs contre ' + miss.length + ' en mémoire — les deux chemins ne voient pas les mêmes alias');
  }
});

// 23/09/2026 — RATTACHEMENT DES LIEUX-DITS FRANÇAIS. « Les lieux-dits sont généralement rattachés à des villes
// environnantes » (utilisateur). Un lieu-dit publié avec un 6e champ porte le nom de sa commune, et les codes postaux
// de cette commune : les DEUX chemins de recherche doivent rendre l'un et l'autre, sinon la suggestion ne dit pas où
// est le lieu. Le test lit le fichier publié, tire les lieux rattachés au hasard (reproductible) et les cherche.
test('lieux-dits français : la commune de rattachement et son code postal suivent le lieu, par les deux chemins', () => {
  const lignes = fs.readFileSync(path.join(DATA, 'communes.txt'), 'utf8').split('\n');
  const rattachés = [];
  // La recherche se fait par PRÉFIXE : « Fontaine » est publié 18 fois, et « Fresne » est chassé des 20 premiers
  // résultats par « Fresnes », « Fresnes-sur-Escaut », « Fresney-le-Puceux »… qui commencent tous par lui et sont
  // plus peuplés. Un tel nom ne peut pas servir ici : sa fiche sortirait de la liste pour une raison étrangère au
  // rattachement. L'échantillon est donc tiré parmi les noms qui sont le préfixe d'UN SEUL lieu publié — le critère
  // qui modèle vraiment la recherche, là où compter les noms exactement identiques ne suffisait pas.
  const noms = [];
  for(const l of lignes){ if(l) noms.push(engine.internals.normalizeCityName(l.split(';')[4])); }
  noms.sort();
  const combien = new Map();
  for(const n of noms){
    if(combien.has(n)) continue;
    // noms est trié : les noms commençant par n sont contigus à partir de la première occurrence.
    let i = noms.indexOf(n), k = 0;
    while(i + k < noms.length && noms[i + k].startsWith(n)) k++;
    combien.set(n, k);
  }
  for(const l of lignes){
    if(!l) continue;
    const ch = l.split(';');
    if(ch.length < 6 || !ch[5]) continue;
    rattachés.push({ nom: ch[4], commune: ch[5], cps: ch[2].split(','),
      unique: combien.get(engine.internals.normalizeCityName(ch[4])) === 1 });
  }
  assert.ok(rattachés.length > 30000, 'trop peu de lieux rattachés publiés (' + rattachés.length + ')');
  // Un lieu rattaché porte forcément les codes postaux de sa commune : la colonne ne doit jamais être vide.
  const sansCode = rattachés.filter(r => !r.cps[0]);
  assert.equal(sansCode.length, 0, sansCode.length + ' lieux rattachés sans code postal, ex. ' +
    sansCode.slice(0, 3).map(r => r.nom + ' -> ' + r.commune).join(', '));

  let graine = 20260923;
  const suivant = () => (graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648;
  const tirés = [];
  for(let i = 0; i < 200; i++){
    const r = rattachés[Math.floor(suivant() * rattachés.length)];
    // Un nom trop court ou ambigu ne se cherche pas : on veut éprouver le rattachement, pas la recherche.
    if(r.unique && r.nom.length >= 6 && r.commune !== r.nom) tirés.push(r);
  }
  assert.ok(tirés.length >= 40, 'échantillon trop maigre (' + tirés.length + ')');
  const manques = [];
  for(const r of tirés){
    for(const [voie, liste] of [['mémoire', engine.searchCity(r.nom, 20, 'FR', null)],
                                ['disque', diskIdx ? diskIdx.search(r.nom, 20, 'FR', null) : null]]){
      if(!liste){ t.diagnostic('chemin disque NON contrôlé (' + diskWhy + ')'); continue; }
      const trouvé = liste.find(x => x.country === 'FR' && x.name === r.nom && x.commune === r.commune);
      if(!trouvé){ manques.push(voie + ' : ' + r.nom + ' (commune attendue ' + r.commune + ')'); continue; }
      if(r.cps.indexOf(trouvé.cp) === -1) manques.push(voie + ' : ' + r.nom + ' rendu avec le code ' + trouvé.cp + ', attendu l\'un de ' + r.cps.join(','));
    }
  }
  assert.equal(manques.length, 0, manques.length + ' rattachements perdus :\n' + manques.slice(0, 10).map(x => '  - ' + x).join('\n'));
});

// 23/09/2026 — LES DEUX CHEMINS RENDENT EXACTEMENT LA MÊME CHOSE. Le contrôle voisin (« homonymes de même code
// postal ») ne regarde que les groupes dont une fiche dépasse 10 000 habitants, et seulement la PRÉSENCE d'une fiche
// attendue : il était aveugle à la divergence mesurée ce jour-là. Le regroupement à 10 km était glouton et non
// transitif, et les deux chemins ne parcouraient pas leurs candidats dans le même ordre — « Cuitaca » (Mexique)
// rendait 1 résultat en mémoire et 2 sur disque, soit un résultat différent selon que l'index était construit ou non.
// Ce test compare les LISTES ENTIÈRES, identité des lieux comprise.
const DIVERGENCES_CONNUES = ['Cuitaca', 'Vërri', 'Dolovi', 'Ad Darb', 'Al Kawlah', 'As Sarw', 'Al Ḩişn', 'Ad Daḩlah'];
test('les deux chemins de recherche rendent la MÊME liste, dans le même ordre', (t) => {
  if(!diskIdx){ t.skip('index de cache/search-index indisponible (' + diskWhy + ')'); return; }
  // Les huit cas historiques, plus un balayage à graine dans les noms publiés : une divergence nouvelle tombe aussi.
  let graine = 20260923;
  const suivant = () => (graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648;
  const saisies = DIVERGENCES_CONNUES.slice();
  for(const cc of Object.keys(TripData.COUNTRIES)){
    const f = TripData.COUNTRIES[cc].file;
    if(!f) continue;
    const p = path.join(DATA, f);
    if(!fs.existsSync(p)) continue;
    const L = fs.readFileSync(p, 'utf8').split('\n');
    for(let i = 0; i < 2 && L.length > 10; i++){
      const l = L[Math.floor(suivant() * L.length)];
      if(l) saisies.push(l.split(';')[4]);
    }
  }
  assert.ok(saisies.length >= 200, 'échantillon trop maigre (' + saisies.length + ')');

  const cle = r => r.country + '|' + r.name + '|' + (r.cp || '') + '|' + r.lat.toFixed(4) + ',' + r.lon.toFixed(4);
  const écarts = [];
  for(const q of saisies){
    if(!q) continue;
    const mem = engine.searchCity(q, 20, null, null) || [];
    const dsk = diskIdx.search(q, 20, null, null) || [];
    const a = mem.map(cle), b = dsk.map(cle);
    if(a.join(' ; ') !== b.join(' ; ')){
      écarts.push(JSON.stringify(q) + ' : mémoire ' + a.length + ' résultat(s), disque ' + b.length +
        (a.length === b.length ? ' (même nombre, contenu ou ordre différent)' : ''));
    }
  }
  assert.deepEqual(écarts.slice(0, 15), [], écarts.length + ' saisie(s) sur ' + saisies.length +
    ' ne rendent pas la même liste selon le chemin :\n' + écarts.slice(0, 15).map(x => '  - ' + x).join('\n'));
});
