// Traductions (public/js/i18n.js) et pages HTML : rapide (quelques secondes), sans moteur ni serveur.
//   - 161 langues, chacune avec TOUTES les clés du français, les mêmes {paramètres}, ni HTML ni guillemet double ;
//   - clés utilisées par app.js et theme.js présentes en français ;
//   - listes (LISTS) complètes dans chaque langue ;
//   - aucune valeur restée en anglais (hors emprunts documentés), noms d'îles des liaisons en ferry traduits ;
//   - script inline des pages HTML : empreinte sha256 autorisée par la CSP de server.js, aucun gestionnaire on*.
//   - 13e audit du 19/09/2026 : noms de liaisons sans copie de l'arabe ou du russe, aucune unité écrite en dur dans les
//     phrases de distance (km / mi).
//   - 14e audit du 19/09/2026 : niveaux de difficulté des randonnées traduits.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PUB = path.join(ROOT, 'public');

// Chargement de i18n.js dans un bac à sable (DOM factice), avec accès aux tables STRINGS et LISTS.
function loadI18n(){
  let src = fs.readFileSync(path.join(PUB, 'js', 'i18n.js'), 'utf8');
  const i = src.lastIndexOf('window.I18N = {');
  assert.ok(i > 0, 'window.I18N introuvable dans i18n.js');
  src = src.slice(0, i) + 'window.__S = STRINGS; window.__L = LISTS; ' + src.slice(i);
  const fakeEl = () => ({ setAttribute(){}, getAttribute(){ return null; }, classList: { add(){}, remove(){}, contains(){ return false; } }, appendChild(){}, addEventListener(){},
    querySelector(){ return fakeEl(); }, querySelectorAll(){ return []; }, style: {} });
  const ctx = { window: {}, navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    document: { readyState: 'complete', documentElement: fakeEl(), querySelectorAll: () => [], getElementById: () => null, createElement: fakeEl, addEventListener(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window.addEventListener = () => {}; ctx.window.dispatchEvent = () => {};
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { S: ctx.window.__S, L: ctx.window.__L, langs: Array.from(ctx.window.I18N.SUPPORTED) };
}
const { S, L, langs } = loadI18n();
const frKeys = Object.keys(S.fr);
const placeholders = s => (String(s).match(/\{(\w+)\}/g) || []).sort().join(',');
const report = (list, max) => list.length + ' problème(s) :\n  ' + list.slice(0, max || 25).join('\n  ') + (list.length > (max || 25) ? '\n  …' : '');

test('161 langues déclarées, chacune avec ses tables', () => {
  assert.equal(langs.length, 161);
  const missing = langs.filter(l => !S[l] || !L[l]);
  assert.deepEqual(missing, []);
});

test('toutes les clés du français présentes dans chaque langue, et aucune clé en plus', () => {
  const bad = [];
  for(const l of langs){
    const d = S[l] || {};
    const miss = frKeys.filter(k => d[k] === undefined);
    if(miss.length) bad.push(l + ' : ' + miss.length + ' clé(s) absente(s) (' + miss.slice(0, 5).join(', ') + ')');
    const extra = Object.keys(d).filter(k => S.fr[k] === undefined);
    if(extra.length) bad.push(l + ' : clé(s) hors français ' + extra.slice(0, 5).join(', '));
  }
  assert.equal(bad.length, 0, report(bad));
});

test('mêmes {paramètres} que le français, valeurs non vides', () => {
  const bad = [];
  for(const l of langs){
    for(const [k, v] of Object.entries(S[l] || {})){
      if(typeof v !== 'string'){ bad.push(l + ' ' + k + ' : valeur non textuelle'); continue; }
      if(!v.trim()) bad.push(l + ' ' + k + ' : valeur vide');
      if(S.fr[k] !== undefined && placeholders(v) !== placeholders(S.fr[k])) bad.push(l + ' ' + k + ' : paramètres [' + placeholders(v) + '] au lieu de [' + placeholders(S.fr[k]) + ']');
    }
  }
  assert.equal(bad.length, 0, report(bad));
});

test('ni HTML ni entité ni guillemet double dans les traductions', () => {
  const bad = [];
  for(const l of langs){
    for(const [k, v] of Object.entries(S[l] || {})){
      if(typeof v !== 'string') continue;
      if(/[<>]/.test(v) || /&[#a-z0-9]+;/i.test(v)) bad.push(l + ' ' + k + ' : HTML « ' + v.slice(0, 60) + ' »');
      if(/"/.test(v)) bad.push(l + ' ' + k + ' : guillemet double « ' + v.slice(0, 60) + ' »');
    }
  }
  assert.equal(bad.length, 0, report(bad));
});

test('listes (LISTS) complètes et valides dans chaque langue', () => {
  const bad = [];
  for(const l of langs){
    const dl = L[l] || {};
    for(const k of Object.keys(L.fr)){
      if(!Array.isArray(dl[k]) || !dl[k].length) bad.push(l + ' : liste absente ' + k);
      else if(dl[k].some(x => typeof x !== 'string' || !x.trim() || /[<>"]/.test(x))) bad.push(l + ' : élément invalide dans ' + k);
    }
  }
  assert.equal(bad.length, 0, report(bad));
});

test('clés utilisées par app.js et theme.js présentes en français', () => {
  const app = fs.readFileSync(path.join(PUB, 'js', 'app.js'), 'utf8');
  const theme = fs.readFileSync(path.join(PUB, 'js', 'theme.js'), 'utf8');
  const used = new Set();
  for(const m of app.matchAll(/\b(?:t|msg)\(\s*'([a-zA-Z]+\.[a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
  for(const m of app.matchAll(/'((?:error|reveal|export|photo|map|theme)\.[a-zA-Z0-9.]+)'/g)) used.add(m[1]);
  for(const m of theme.matchAll(/'(theme\.[a-zA-Z]+)'/g)) used.add(m[1]);
  assert.ok(used.size > 50, 'extraction des clés utilisées : ' + used.size + ' seulement');
  // Préfixe dynamique (« t('form.budget.' + clé) ») : au moins une clé française doit commencer ainsi.
  const missing = [...used].filter(k => k.endsWith('.') ? !frKeys.some(f => f.startsWith(k)) : S.fr[k] === undefined);
  assert.deepEqual(missing, []);
  assert.ok(!/\beval\(|new Function\(/.test(app), 'eval ou new Function dans app.js');
});

test('pages HTML : script inline autorisé par son empreinte dans la CSP de server.js, aucun gestionnaire on*', () => {
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const allowed = new Set([...server.matchAll(/'sha256-([A-Za-z0-9+/=]+)'/g)].map(m => m[1]));
  assert.ok(allowed.size >= 1, 'aucune empreinte sha256 dans la CSP de server.js');
  const bad = [];
  for(const f of fs.readdirSync(PUB).filter(f => f.endsWith('.html'))){
    const h = fs.readFileSync(path.join(PUB, f), 'utf8');
    for(const m of h.matchAll(/<script>([\s\S]*?)<\/script>/g)){
      const hash = crypto.createHash('sha256').update(m[1], 'utf8').digest('base64');
      if(!allowed.has(hash)) bad.push(f + ' : script inline d\'empreinte sha256-' + hash + ' absente de la CSP');
    }
    // Scripts inline avec attributs (hors données JSON-LD) : jamais autorisés par la CSP.
    for(const m of h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
      if(m[1].trim() && !/\bsrc=/.test(m[1]) && !/application\/ld\+json/.test(m[1]) && m[2].trim()) bad.push(f + ' : script inline <script' + m[1] + '>');
    }
    if(/\son[a-z]+\s*=/i.test(h.replace(/<script[\s\S]*?<\/script>/g, ''))) bad.push(f + ' : gestionnaire d\'événement on* inline');
  }
  assert.deepEqual(bad, []);
});

// Valeurs identiques à l'anglais alors que le français diffère (12e audit du 19/09/2026 : « 本土 ↔ Balearic Islands »,
// « Bara ↔ Canary Islands »…) : omissions, sauf les emprunts légitimes ci-dessous. 'latin' : toute langue à écriture
// latine (nom propre écrit de la même façon), sinon liste des langues.
const SAME_AS_EN_LANGS = {
  // Écossais : orthographe très proche de l'anglais (castle, beach, day, Mainland…) ; ses mots propres sont traduits.
  sco: 'Scots'
};
const SAME_AS_EN = {
  // Noms de lieux identiques en écriture latine (le français seul dit Algésiras, Malte, Guernesey, Malaga, Oust-Louga).
  'ferry.route.ceuta': 'latin', 'ferry.route.gozo': 'latin', 'ferry.route.channelIslands': 'latin', 'ferry.route.melilla': 'latin',
  'ferry.route.kaliningrad': 'latin',
  // « Île » en majuscule en jersiais/guernesiais, comme en anglais (le français écrit « île »).
  'ferry.route.fromentineYeu': ['nrf-je', 'nrf-gg'],
  // Malais : « Great Britain » est la forme en usage.
  'ferry.route.holyheadDublin': ['ms'],
  // Nom de marque, écrit Wikipedia dans l'édition de ces langues (le français écrit Wikipédia).
  'wiki.link': 'latin',
  // Initiale et mot réels de la langue (Salida, Start, Start…).
  'map.departShort': ['es', 'de', 'lb', 'nds', 'hsb', 'frr', 'csb', 'cs', 'pl', 'sl', 'hr', 'bs', 'da', 'no', 'sv', 'cnr', 'gag', 'pap-AW', 'pap-CW'],
  'map.departFallback': ['de', 'lb', 'nds', 'hsb', 'frr', 'cs', 'pl', 'sl', 'hr', 'bs', 'da', 'no', 'sv', 'cnr', 'gag'],
  // Mots identiques dans la langue.
  'poiType.memorial': ['es', 'pt', 'rm', 'lld', 'ruo', 'ca', 'gl', 'oc', 'mwl', 'ro', 'pap-AW', 'pap-CW'],
  'poiType.museum': ['nl', 'rm', 'frr', 'lld', 'da', 'no', 'sv', 'af', 'id', 'jv'],
  'poiType.citadel': ['nl', 'da'],
  'poiType.chapel': ['br', 'kw'],
  'stats.totalKm': ['mt', 'nrf-je', 'nrf-gg', 'ruo', 'sq', 'ro', 'id'],
  'stats.ferryTotal': ['crs', 'fil'],
  'form.budget.confortableDesc': ['qu', 'qu-EC', 'ay'],
  'form.budget.economique': ['nl'], 'form.budget.confortable': ['nl'],
  'transport.voitureThermique.label': ['cy'],
  'ferry.price.perPerson': ['no', 'sv']
};
const isLatin = s => /^[\p{Script=Latin}\p{M}\s↔().,'’\-–—{}0-9★]*$/u.test(s.replace(/↗/g, ''));
test('aucune valeur identique à l\'anglais hors emprunts documentés', () => {
  const bad = [];
  for(const l of langs){
    if(l === 'en' || SAME_AS_EN_LANGS[l]) continue;
    for(const k of Object.keys(S.en)){
      if(S.fr[k] === S.en[k] || S[l][k] !== S.en[k]) continue;
      const ex = SAME_AS_EN[k];
      if(ex === 'latin' ? isLatin(S[l][k]) : (Array.isArray(ex) && ex.includes(l))) continue;
      bad.push(l + ' ' + k + ' : « ' + S[l][k] + ' »');
    }
  }
  assert.equal(bad.length, 0, report(bad, 40));
});

// Noms d'îles des liaisons « Continent ↔ île » (12e audit) : le nom de l'île n'est jamais resté en anglais, sauf dans les
// langues où il s'écrit réellement ainsi.
const ISLAND_SAME = {
  'ferry.route.corsica': ['nl', 'it', 'rm', 'lij', 'ruo', 'co', 'cy', 'ro', 'ms', 'fil', 'mi', 'pap-AW', 'pau', 'mh'],
  'ferry.route.sardinia': ['ruo', 'eu', 'br', 'cy', 'kw', 'no', 'fi', 'ro', 'fo', 'sw', 'mg', 'id', 'ms', 'jv', 'mi', 'pau', 'mh'],
  'ferry.route.doverCalais': ['ms'],
  'ferry.route.guernsey': 'latin'
};
test('noms d\'îles des liaisons en ferry traduits (pas de « Balearic Islands » en japonais)', () => {
  const bad = [];
  const keys = ['corsica', 'balearic', 'canary', 'wadden', 'sardinia', 'sicily', 'crete', 'doverCalais', 'guernsey'].map(k => 'ferry.route.' + k);
  for(const k of keys){
    const enIsland = S.en[k].split(' ↔ ')[1];
    for(const l of langs){
      if(l === 'en' || SAME_AS_EN_LANGS[l]) continue;
      const island = String(S[l][k]).split(' ↔ ')[1];
      if(island !== enIsland) continue;
      const ex = ISLAND_SAME[k];
      if(ex === 'latin' ? isLatin(island) : (Array.isArray(ex) && ex.includes(l))) continue;
      bad.push(l + ' ' + k + ' : « ' + S[l][k] + ' »');
    }
  }
  assert.equal(bad.length, 0, report(bad, 40));
});

// 13e audit du 19/09/2026 : noms de liaisons recopiés d'une autre langue — persan et sorani copiés de l'arabe (« جزر
// البليار », lettres arabes ك/ي), langues de Russie restées en russe (« Балеарские острова »), mer des Wadden (« Ваддензе »)
// au lieu des îles, « واردن » (R en trop).
test('noms de liaisons : pas de copie de l\'arabe en persan/sorani ni du russe dans les langues de Russie', () => {
  const bad = [];
  const keys = frKeys.filter(k => k.startsWith('ferry.route.'));
  for(const l of ['fa', 'ckb']){
    for(const k of keys){
      const v = S[l][k];
      if(/[كيىة]/.test(v)) bad.push(l + ' ' + k + ' : lettre arabe « ' + v + ' »');
      if(/[؀-ۿ]/.test(S.ar[k]) && v === S.ar[k]) bad.push(l + ' ' + k + ' : copie de l\'arabe « ' + v + ' »');
    }
  }
  for(const l of ['tt', 'ba', 'sah', 'ce', 'myv', 'mdf', 'udm']){
    for(const k of keys){
      // Groupe d'îles, île, détroit : toujours dans la syntaxe de la langue (un nom propre seul peut être identique).
      if(/остров|Ваддензе/.test(S.ru[k]) && S[l][k] === S.ru[k]) bad.push(l + ' ' + k + ' : copie du russe « ' + S[l][k] + ' »');
    }
  }
  for(const l of langs){
    const w = S[l]['ferry.route.wadden'];
    if(/Ваддензе|واردن/.test(w)) bad.push(l + ' ferry.route.wadden : « ' + w + ' »');
  }
  assert.equal(bad.length, 0, report(bad, 40));
});

// 13e audit du 19/09/2026 : les phrases qui citaient « km » reçoivent l'unité ({unit}) ou une distance déjà mise en
// forme ({dist}, {min}…) ; aucun jeton km ne doit y rester, dans aucune langue, et chaque langue a ses modèles
// « nombre + unité » pour les kilomètres et les miles.
test('distances : aucune unité écrite en dur dans les phrases, modèles unit.kmN / unit.miN dans chaque langue', () => {
  const KEYS = ['form.radius.modeKm', 'form.radius.unitKm', 'form.minDistance.unitMin', 'form.minDistance.unitMax', 'form.legDistance.unit',
    'form.legDistance.hint', 'day.routeTime', 'day.crossingTime', 'leg.overMaxLeg', 'charge.noChargerNearArrival', 'error.minMaxDistance',
    'error.minDistanceTooFar', 'error.minDistanceNotFound'];
  const bad = [];
  for(const l of langs){
    const km = S[l]['unit.km'], esc = km.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Écritures sans espaces (chinois, tibétain) : jeton cherché tel quel ; ailleurs, mot entier.
    const re = /[㐀-鿿ༀ-࿿]/.test(km) ? new RegExp(esc) : new RegExp('(^|[^\\p{L}\\p{M}])' + esc + '(?![\\p{L}\\p{M}])', 'u');
    for(const k of KEYS) if(re.test(S[l][k].replace(/\{\w+\}/g, ' '))) bad.push(l + ' ' + k + ' : « ' + S[l][k] + ' »');
    for(const k of ['unit.kmN', 'unit.miN']) if(placeholders(S[l][k]) !== '{n}') bad.push(l + ' ' + k + ' : « ' + S[l][k] + ' »');
    if(!S[l]['unit.mi'] || S[l]['unit.mi'] === km) bad.push(l + ' unit.mi : « ' + S[l]['unit.mi'] + ' »');
    // Jamais le « mil » scandinave (10 km) seul pour le mile anglo-saxon.
    if(['da', 'no', 'sv', 'fi', 'is', 'fo'].includes(l) && /^mil$/i.test(S[l]['unit.mi'])) bad.push(l + ' unit.mi : mil scandinave');
  }
  assert.equal(bad.length, 0, report(bad, 40));
});

// 14e audit du 19/09/2026 : niveaux de difficulté des randonnées Visorando (« Facile », « Moyenne », « Difficile »,
// « Très difficile ») traduits dans chaque langue — quatre libellés distincts, jamais les formes françaises propres.
test('randonnées : quatre niveaux de difficulté distincts et traduits dans chaque langue', () => {
  const keys = ['easy', 'medium', 'hard', 'veryHard'].map(k => 'hike.difficulty.' + k);
  const bad = [];
  for(const l of langs){
    const v = keys.map(k => S[l][k]);
    if(new Set(v).size !== 4) bad.push(l + ' : libellés non distincts ' + JSON.stringify(v));
    if(l !== 'fr' && (v[1] === 'Moyenne' || v[3] === 'Très difficile')) bad.push(l + ' : forme française ' + JSON.stringify(v));
  }
  assert.equal(bad.length, 0, report(bad));
});
