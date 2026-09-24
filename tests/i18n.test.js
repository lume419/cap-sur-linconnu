// Traductions (public/js/i18n.js) et pages HTML : rapide (quelques secondes), sans moteur ni serveur.
//   - 161 langues, chacune avec TOUTES les clés du français, les mêmes {paramètres}, ni HTML ni guillemet double ;
//   - clés utilisées par app.js et theme.js présentes en français ;
//   - listes (LISTS) complètes dans chaque langue ;
//   - aucune valeur restée en anglais (hors emprunts documentés), noms d'îles des liaisons en ferry traduits ;
//   - script inline des pages HTML : empreinte sha256 autorisée par la CSP de server.js, aucun gestionnaire on*.
//   - 13e audit du 19/09/2026 : noms de liaisons sans copie de l'arabe ou du russe, aucune unité écrite en dur dans les
//     phrases de distance (km / mi).
//   - 14e audit du 19/09/2026 : niveaux de difficulté des randonnées traduits.
//   - 15e audit du 19/09/2026 : espace avant « % » telle que CLDR la donne pour la langue.
//   - 16e audit du 20/09/2026 : message de coupure réseau (error.network) dans les 161 langues ; « % » placé AVANT le
//     nombre là où CLDR le place ainsi (kurde, basque…).
//   - 17e audit du 20/09/2026 : registre (tutoiement / vouvoiement) et ponctuation de error.network alignés sur ceux
//     que MESURE le dictionnaire lui-même ; pourcentages des six langues que les deux tests précédents sautaient
//     (bs, sr, uk sans espace CLDR ; cnr, gag, crh sans données Intl propres) ; sémantique ARIA du sélecteur de langue
//     (un seul motif bouton + listbox), navigation au clavier comprise.
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
  src = src.slice(0, i) + 'window.__S = STRINGS; window.__L = LISTS; window.__F = LOCALE_FALLBACK; window.__N = LANG_NAMES; window.__FL = LANG_FLAGS; ' + src.slice(i);
  const fakeEl = () => ({ setAttribute(){}, getAttribute(){ return null; }, classList: { add(){}, remove(){}, contains(){ return false; } }, appendChild(){}, addEventListener(){},
    querySelector(){ return fakeEl(); }, querySelectorAll(){ return []; }, style: {} });
  const ctx = { window: {}, navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    document: { readyState: 'complete', documentElement: fakeEl(), querySelectorAll: () => [], getElementById: () => null, createElement: fakeEl, addEventListener(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window.addEventListener = () => {}; ctx.window.dispatchEvent = () => {};
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { S: ctx.window.__S, L: ctx.window.__L, F: ctx.window.__F, N: ctx.window.__N, FL: ctx.window.__FL, langs: Array.from(ctx.window.I18N.SUPPORTED), I18N: ctx.window.I18N };
}
const { S, L, F: LOCALE_FALLBACK_T, N: LANG_NAMES_T, FL: LANG_FLAGS_T, langs, I18N } = loadI18n();
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

// 15e audit du 19/09/2026 : « Marge de 20% » en français. Pourcentages écrits avec l'espace (insécable) que CLDR met
// avant le signe dans la langue elle-même (Intl.NumberFormat(…, {style: 'percent'}), locale résolue de la même langue) ;
// sans objet pour les langues sans données CLDR propres, les pourcentages placés avant le nombre (« %20 » turc) et les
// suffixes collés (« 20%-im » groenlandais).
// 17e audit du 20/09/2026 : le test SAUTAIT les langues dont CLDR ne met AUCUNE espace (`!m[1]`), c'est-à-dire
// exactement celles qui écrivaient « 20 % » à tort (bosniaque, serbe, ukrainien). L'espace attendue peut être vide :
// seules les langues qui placent le signe AVANT le nombre sont laissées au test suivant.
test('pourcentages : espace insécable avant « % » dans les langues dont CLDR en met une', () => {
  const bad = [];
  let checked = 0;
  for(const l of langs){
    let nf;
    try { nf = new Intl.NumberFormat(I18N.localeTag(l), { style: 'percent' }); } catch(e){ continue; }
    if(nf.resolvedOptions().locale.split('-')[0] !== l.split('-')[0]) continue;
    const m = nf.format(0.2).match(/^\D*\p{Nd}+([\s  ]*)[%٪]/u);
    if(!m) continue; // signe placé AVANT le nombre : laissé au test suivant
    const values = [];
    Object.values(S[l]).forEach(v => values.push(v));
    Object.values(L[l]).forEach(list => list.forEach(v => values.push(v)));
    for(const v of values){
      const re = /\p{Nd}+([\s  ]?)[%٪](?!-)/gu;
      let x;
      while((x = re.exec(v))){ checked++; if(x[1] !== m[1]) bad.push(l + ' : « ' + v.slice(Math.max(0, x.index - 10), x.index + x[0].length + 10) + ' » (attendu ' + JSON.stringify(m[1]) + ')'); }
    }
  }
  assert.ok(checked >= 25, checked + ' pourcentages contrôlés seulement');
  assert.equal(bad.length, 0, report(bad));
  assert.ok(L.fr['pack.voitureElectrique'].some(v => /20 %/.test(v)), 'français : « 20 % » attendu');
});

// 16e audit du 20/09/2026 : message dédié à la COUPURE RÉSEAU du tirage (error.network). Un échec de fetch de
// /api/generate-trip affichait error.routeImpossible (« élargissez le rayon ») alors que la requête n'était jamais
// arrivée — conseil faux. Le message doit exister, être traduit et rester distinct dans les 161 langues.
test('coupure réseau : error.network présent, traduit et distinct de error.routeImpossible dans les 161 langues', () => {
  const bad = [];
  for(const l of langs){
    const v = S[l] && S[l]['error.network'];
    if(typeof v !== 'string' || !v.trim()){ bad.push(l + ' : clé absente ou vide'); continue; }
    if(v === S[l]['error.routeImpossible']) bad.push(l + ' : identique à error.routeImpossible');
    if(l !== 'fr' && v === S.fr['error.network']) bad.push(l + ' : resté en français');
    if(v === S[l]['error.serverBusy'] || v === S[l]['error.drawTimeout']) bad.push(l + ' : identique à un autre message d\'erreur');
  }
  assert.equal(bad.length, 0, report(bad));
  // Le message est bien celui que le navigateur affiche en cas d'échec réseau (voir le catch du tirage dans app.js).
  const app = fs.readFileSync(path.join(PUB, 'js', 'app.js'), 'utf8');
  assert.ok(app.includes("'error.network'"), 'app.js n\'utilise pas error.network');
});

// 16e audit du 20/09/2026 : la 15e passe ne contrôlait que les langues qui écrivent le « % » APRÈS le nombre. Là où
// CLDR le place AVANT (kurde « %20 », basque « % 20 », turc, gagaouze…), « 20% » à l'anglaise passait inaperçu.
test('pourcentages : signe avant le nombre là où CLDR le place ainsi, avec son espace', () => {
  const bad = [];
  let checked = 0;
  for(const l of langs){
    let nf;
    try { nf = new Intl.NumberFormat(I18N.localeTag(l), { style: 'percent' }); } catch(e){ continue; }
    if(nf.resolvedOptions().locale.split('-')[0] !== l.split('-')[0]) continue;
    const m = nf.format(0.2).match(/^([%٪])(\s*)\p{Nd}/u);
    if(!m) continue; // signe placé après le nombre : déjà contrôlé par le test précédent
    const values = [];
    Object.values(S[l]).forEach(v => values.push(v));
    Object.values(L[l]).forEach(list => list.forEach(v => values.push(v)));
    const around = (v, i, len) => v.slice(Math.max(0, i - 12), i + len + 12);
    for(const v of values){
      // Nombre suivi du signe : écriture de l'anglais, pas celle de cette langue.
      const after = /\p{Nd}\s?[%٪](?!-)/gu;
      let x;
      while((x = after.exec(v))) bad.push(l + ' : « ' + around(v, x.index, x[0].length) + ' » (attendu « ' + m[1] + m[2] + '20 »)');
      // Signe placé avant, mais sans l'espace (ou avec un autre) que CLDR donne pour la langue.
      const before = /([%٪])(\s*)(?=\p{Nd})/gu;
      while((x = before.exec(v))){ checked++; if(x[2] !== m[2]) bad.push(l + ' : « ' + around(v, x.index, x[0].length) + ' » (espace attendu ' + JSON.stringify(m[2]) + ')'); }
    }
  }
  assert.ok(checked >= 1, checked + ' pourcentage(s) contrôlé(s) : aucune langue à signe placé avant');
  assert.equal(bad.length, 0, report(bad));
  // Témoins : kurde sans espace, basque avec l'espace insécable de CLDR.
  assert.ok(L.ku['pack.voitureElectrique'].some(v => v.includes('%20')), 'kurde : « %20 » attendu');
  assert.ok(L.eu['pack.voitureElectrique'].some(v => v.includes('% 20')), 'basque : « % 20 » attendu');
});

// --------------------------------------------------------------------------------------------- 17e audit du 20/09/2026

// Registre (tutoiement / vouvoiement) DOMINANT de chaque dictionnaire, mesuré sur ses propres impératifs : pour chaque
// langue, les deux colonnes donnent le même verbe aux deux personnes, tel qu'il est réellement écrit ailleurs dans le
// dictionnaire. Le registre attendu de error.network n'est donc pas décrété ici : il est celui que la mesure donne.
// (La 16e passe avait ajouté error.network dans les 161 langues ; dans ces quatorze-là, la phrase tutoyait un
// dictionnaire qui vouvoie, ou l'inverse.)
const IMPERATIVES = {
  de:  { T: ['prüfe', 'versuche', 'gib', 'denk', 'verringere', 'vergrößere', 'verlängere', 'lockere', 'erkundige'],
         V: ['prüfen', 'versuchen', 'geben', 'verringern', 'vergrößern', 'verlängern', 'lockern', 'erkundigen'] },
  lb:  { T: ['kuck', 'probéier', 'kontrolléier', 'vergréisser', 'reduzéier', 'verlänger', 'iwwerpréif', 'informéier', 'gëff', 'denk', 'lacker'],
         V: ['kuckt', 'probéiert', 'kontrolléiert', 'vergréissert', 'reduzéiert', 'verlängert', 'iwwerpréift', 'informéiert', 'gitt', 'denkt', 'lackert'] },
  rm:  { T: ['controllescha', 'emprova', 'endatescha', 'indica', 'augmentescha', 'reducescha', 'engrondescha', 'allentescha'],
         V: ['controllai', 'empruvai', 'endatai', 'indichai', 'verifitgai', 'augmentai', 'reducai', 'engrondai'] },
  hsb: { T: ['přepruwuj', 'spytaj', 'zapodaj', 'podaj', 'pomjeńš', 'powjetši', 'podlěš', 'zmjechč', 'přeswědč'],
         V: ['přepruwujće', 'spytajće', 'zapodajće', 'podajće', 'pomjeńšće', 'powjetšće', 'informujće'] },
  csb: { T: ['sprawdzë', 'sprôwdzë', 'sprobùjë', 'spróbùjë', 'sprobùj', 'zwiãkszë', 'zmiészë', 'wpiszë', 'dowiédzë', 'złagòdzë', 'skrócë', 'rëmôj'],
         V: ['sprawdzëta', 'sprôwdzëta', 'sprôwdzëwôjta', 'sprobùjta', 'spróbùjta', 'zwiãkszëta', 'zmiészëta', 'wpiszta', 'dowiédzta', 'złagòdzëta', 'skrócta', 'rëmôjta'] },
  rue: { T: ['перевір', 'спробуй', 'впиши', 'збільш', 'зменш', 'памятай', 'провір'],
         V: ['перевірьте', 'спробуйте', 'впишіть', 'збільшіть', 'зменшіть', 'звідайте', 'продовжте', 'ослабте', 'провірьте'] },
  oc:  { T: ['verifica', 'ensaja', 'pica', 'aumenta', 'demesís', 'indica', 'pensa', 'assopla'],
         V: ['verificatz', 'ensajatz', 'picatz', 'aumentatz', 'demesissètz', 'indicatz', 'pensatz', 'tornatz'] },
  vro: { T: ['kaeq', 'pruuvi', 'kae', 'proovi', 'küsü', 'kirota'],
         V: ['kaegõq', 'kaegõ', 'proovigõq', 'proovige', 'küsügeq', 'kirotagõ', 'sisestage', 'kontrollige', 'suurendage', 'vähendage', 'ärge'] },
  gag: { T: ['bak', 'denä', 'dene', 'yaz', 'büyüt', 'azalt', 'unutma'],
         V: ['bakınız', 'deneyin', 'yazın', 'büyütün', 'azaltın', 'unutmayın', 'sorunuz'] },
  ab:  { T: ['гәаҭа', 'еиҭаҽанаҧш', 'хәаԥш'],
         V: ['ишәгәаҭа', 'иеиҭашәхәаԥш', 'шәрыхәаԥш', 'шәыҳаракыр', 'шәыҵыр', 'шәхәаԥш', 'шәгәыҵымыз', 'шәдыр'] },
  sah: { T: ['бэрэбиэркэлээ', 'боруобалаа', 'оҥор', 'киллэр', 'кэҥэт', 'аччат', 'уһат', 'чэпчэт', 'ыйыт', 'умнума'],
         V: ['бэрэбиэркэлээҥ', 'боруобалааҥ', 'оҥоруҥ', 'киллэриҥ', 'кэҥэтиҥ', 'аччатыҥ', 'уһатыҥ', 'чэпчэтиҥ', 'ыйытыҥ', 'умнумаҥ'] },
  myv: { T: ['варштык', 'теик', 'ванок', 'варчтак', 'кевкстек'],
         V: ['ваннодо', 'варчтадо', 'сёрмадодо', 'кевкстедэ', 'ванстодо', 'вишкалгавтодо', 'келейгавтодо', 'кувакалгавтодо', 'чавдолгавтодо'] },
  mdf: { T: ['ванк', 'тик', 'варчак', 'кизефтть'],
         V: ['ваннынк', 'ваныда', 'варчада', 'сёрматтада', 'кизефтьда', 'ванфтада', 'ёмлаптада', 'келеептада', 'кувакаптада', 'нюрьгемптеда'] },
  hu:  { T: ['ellenőrizd', 'próbáld', 'próbálj', 'csökkentsd', 'növeld', 'szélesítsd', 'lazíts', 'adj', 'add'],
         V: ['ellenőrizze', 'próbálja', 'próbáljon', 'csökkentse', 'növelje', 'szélesítse', 'tájékozódjon', 'adjon'] },
  // Jersiais et guernesiais : vouvoyés d'un bout à l'autre, error.network était leur seule phrase tutoyée.
  'nrf-je': { T: ['vérifyis', 'èrcommenche', 'êprouve'], V: ['vérifiez', 'êprouvez', 'pensez', 'êlarguissez'] },
  'nrf-gg': { T: ['vérifyis', 'r\'cominche', 'êprouve'], V: ['vérifiez', 'êprouviez', 'pensez', 'êlarguissiez'] }
};
const NO_LETTER_BEFORE = '(?<![\\p{L}\\p{M}])', NO_LETTER_AFTER = '(?![\\p{L}\\p{M}])';
function allValues(l){
  const out = [];
  Object.values(S[l]).forEach(v => out.push(v));
  Object.values(L[l]).forEach(list => list.forEach(v => out.push(v)));
  return out;
}
function countForms(values, words){
  const re = new RegExp(NO_LETTER_BEFORE + '(?:' + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')' + NO_LETTER_AFTER, 'giu');
  let n = 0;
  for(const v of values){ let m; re.lastIndex = 0; while((m = re.exec(v))) n++; }
  return n;
}
test('17e audit : error.network suit le registre dominant de son dictionnaire (mesuré sur ses impératifs)', () => {
  const bad = [];
  for(const [l, forms] of Object.entries(IMPERATIVES)){
    const values = allValues(l);
    const others = values.filter(v => v !== S[l]['error.network']);
    const t = countForms(others, forms.T), v = countForms(others, forms.V);
    if(t === v){ bad.push(l + ' : registre dominant indécis (T=' + t + ', V=' + v + ') — table à revoir'); continue; }
    const dominant = t > v ? 'T' : 'V';
    const net = S[l]['error.network'];
    const inNet = { T: countForms([net], forms.T), V: countForms([net], forms.V) };
    if(inNet.T + inNet.V === 0){ bad.push(l + ' : aucun impératif reconnu dans « ' + net + ' »'); continue; }
    if(inNet[dominant] === 0 || inNet[dominant === 'T' ? 'V' : 'T'] > 0){
      bad.push(l + ' : registre ' + (dominant === 'T' ? 'tutoiement' : 'vouvoiement') + ' attendu (T=' + t + ', V=' + v +
        ' ailleurs) — « ' + net + ' »');
    }
  }
  assert.equal(bad.length, 0, report(bad));
});

test('17e audit : ponctuation de error.network — espacement du deux-points et signes de l\'écriture', () => {
  const bad = [];
  // Jersiais et guernesiais suivent l'espacement FRANÇAIS (« mot : mot ») : 46 deux-points sur 47 le respectaient,
  // error.network était le seul collé (« serveux: »).
  for(const l of ['nrf-je', 'nrf-gg', 'fr']){
    const spaced = allValues(l).filter(v => /\S[  ] ?:(\s|$)/.test(v)).length;
    const stuck = allValues(l).filter(v => /\p{L}:(\s|$)/u.test(v));
    if(spaced < 10) bad.push(l + ' : espacement français non mesurable (' + spaced + ' deux-points espacés)');
    stuck.forEach(v => bad.push(l + ' : deux-points collé « ' + v.slice(0, 70) + ' »'));
  }
  // Yi du Sichuan : ponctuation pleine largeur partout (。、：，), error.network était la seule chaîne en ASCII.
  const yiFull = allValues('ii').filter(v => /[。、：，]/.test(v)).length;
  assert.ok(yiFull > 50, 'ii : ponctuation pleine largeur non dominante (' + yiFull + ')');
  const yiNet = S.ii['error.network'];
  if(/[:.]/.test(yiNet.replace(/[A-Za-z0-9]+\.[A-Za-z]/g, ''))) bad.push('ii : ponctuation ASCII dans « ' + yiNet + ' »');
  if(!/。$/.test(yiNet)) bad.push('ii : la phrase ne se termine pas par « 。 » — « ' + yiNet + ' »');
  if(yiNet.indexOf('：') < 0) bad.push('ii : deux-points pleine largeur attendu — « ' + yiNet + ' »');
  assert.equal(bad.length, 0, report(bad));
});

// 17e audit du 20/09/2026 : les deux tests de pourcentage ci-dessus laissaient passer six langues.
//   - bs, sr, uk : CLDR ne met AUCUNE espace (« 20% »), et le test précédent sautait justement les langues sans espace
//     (`if(!m || !m[1]) continue`) — il ne les saute plus (voir son commentaire) ;
//   - cnr, gag, crh : Intl ne résout pas leur étiquette dans leur propre langue, les deux tests les écartent donc.
//     Leur référence est nommée ici, avec sa justification, et reste calculée par Intl.NumberFormat.
const PERCENT_REFERENCE = {
  // Monténégrin : Intl résout cnr-ME en sr-ME, la locale CLDR du Monténégro — même convention, « 20% ».
  cnr: 'sr-ME',
  // Gagaouze et tatar de Crimée : langues turciques écrites ici en alphabet latin d'usage turc. Leur étiquette Intl
  // retombe sur le roumain de Moldavie et l'ukrainien, d'une autre tradition typographique ; la convention de leur
  // propre écriture est celle du turc, signe AVANT le nombre et collé (« %20 »).
  gag: 'tr', crh: 'tr'
};
test('17e audit : pourcentages des langues que les deux tests précédents sautaient (bs, sr, uk, cnr, gag, crh)', () => {
  const bad = [];
  let checked = 0;
  for(const [l, ref] of Object.entries(PERCENT_REFERENCE)){
    const nf = new Intl.NumberFormat(ref, { style: 'percent' });
    const model = nf.format(0.2); // « 20% » ou « %20 »
    const values = allValues(l).filter(v => /[%٪]/.test(v));
    assert.ok(values.length, l + ' : aucun pourcentage à contrôler');
    for(const v of values){
      checked++;
      const got = v.match(/(?:\p{Nd}+[\s  ]*[%٪]|[%٪][\s  ]*\p{Nd}+)/u);
      if(!got || got[0].replace(/\p{Nd}+/gu, '20') !== model) bad.push(l + ' : « ' + v + ' » (attendu « ' + model + ' », référence ' + ref + ')');
    }
  }
  // bs, sr, uk sont désormais couverts par le test « espace insécable avant % » : on vérifie juste ici qu'ils y sont
  // bien soumis (CLDR de leur propre langue, sans espace) et qu'ils l'écrivent comme lui.
  for(const l of ['bs', 'sr', 'uk']){
    const nf = new Intl.NumberFormat(I18N.localeTag(l), { style: 'percent' });
    assert.equal(nf.resolvedOptions().locale.split('-')[0], l, l + ' : Intl ne résout plus cette langue dans la sienne');
    const model = nf.format(0.2);
    for(const v of allValues(l).filter(x => /[%٪]/.test(x))){
      checked++;
      const got = v.match(/\p{Nd}+[\s  ]*[%٪]/u);
      if(!got || got[0].replace(/\p{Nd}+/gu, '20') !== model) bad.push(l + ' : « ' + v + ' » (attendu « ' + model + ' »)');
    }
  }
  assert.ok(checked >= 6, checked + ' pourcentages contrôlés seulement');
  assert.equal(bad.length, 0, report(bad));
  // Témoins : le turc, référence de gag/crh, colle bien le signe devant ; le français garde son espace insécable.
  assert.equal(new Intl.NumberFormat('tr', { style: 'percent' }).format(0.2), '%20');
  assert.ok(L.fr['pack.voitureElectrique'].some(v => /20 %|20 %/.test(v)), 'français : « 20 % » attendu');
});

// Sélecteur de langue : le composant est construit entièrement en JS (buildSwitcher dans i18n.js). Il est monté ici
// dans un DOM factice minimal — assez pour rejouer le clic d'ouverture et la navigation au clavier — afin de vérifier
// que les rôles ARIA annoncés forment UN SEUL motif cohérent (bouton -> listbox), et que rien du clavier n'a bougé.
function fakeDom(){
  const dom = { activeElement: null };
  function matches(e, sel){ return sel.charAt(0) === '.' && String(e.className || '').split(/\s+/).indexOf(sel.slice(1)) >= 0; }
  function findAll(e, sel, out){
    (e.children || []).forEach(function(c){ if(matches(c, sel)) out.push(c); findAll(c, sel, out); });
    return out;
  }
  function el(tag){
    const e = {
      tagName: tag, attrs: {}, children: [], handlers: {}, className: '', id: '', style: {}, textContent: '', hidden: false,
      setAttribute(k, v){ e.attrs[k] = String(v); },
      getAttribute(k){ return Object.prototype.hasOwnProperty.call(e.attrs, k) ? e.attrs[k] : null; },
      removeAttribute(k){ delete e.attrs[k]; },
      appendChild(c){ e.children.push(c); c.parent = e; return c; },
      addEventListener(t, fn){ (e.handlers[t] = e.handlers[t] || []).push(fn); },
      fire(t, ev){ (e.handlers[t] || []).forEach(fn => fn(Object.assign({ preventDefault(){}, target: e }, ev))); },
      focus(){ dom.activeElement = e; },
      contains(n){ for(let p = n; p; p = p.parent) if(p === e) return true; return false; },
      querySelector(sel){ return findAll(e, sel, [])[0] || null; },
      querySelectorAll(sel){ return findAll(e, sel, []); }
    };
    e.classList = { set: {}, add(c){ e.classList.set[c] = true; }, remove(c){ delete e.classList.set[c]; }, contains(c){ return !!e.classList.set[c]; } };
    Object.defineProperty(e, 'innerHTML', {
      get(){ return ''; },
      set(v){
        e.children = [];
        const m = String(v).match(/<(\w+)[^>]*class="([^"]+)"/);
        if(m){ const c = el(m[1]); c.className = m[2]; e.appendChild(c); }
      }
    });
    return e;
  }
  dom.el = el;
  return dom;
}
// opts.differer : les minuteurs ne partent plus tout seuls, ils s'empilent et on les déclenche à la main (flush).
// C'est le seul moyen d'observer une annonce PROGRAMMÉE mais pas encore écrite — donc la course que le 20e audit
// du 21/09/2026 a trouvée dans annoncer().
function loadSwitcher(opts){
  opts = opts || {};
  const src = fs.readFileSync(path.join(PUB, 'js', 'i18n.js'), 'utf8');
  const dom = fakeDom();
  const root = dom.el('div');
  root.id = 'lang-switcher';
  const minuteurs = new Map();
  let prochainId = 1;
  const ctx = {
    window: {}, navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    document: {
      readyState: 'complete', documentElement: dom.el('html'), querySelectorAll: () => [], addEventListener(){},
      getElementById: id => (id === 'lang-switcher' ? root : null), createElement: dom.el
    },
    CustomEvent: function(){}, Intl, console,
    setTimeout: fn => { if(!opts.differer){ fn(); return 0; } const id = prochainId++; minuteurs.set(id, fn); return id; },
    clearTimeout: id => { minuteurs.delete(id); }
  };
  Object.defineProperty(ctx.document, 'activeElement', { get: () => dom.activeElement });
  ctx.window.addEventListener = () => {};
  ctx.window.dispatchEvent = () => {};
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { root, button: root.children[0], panel: root.children[1], dom,
    enAttente: () => minuteurs.size,
    flush: () => { const l = [...minuteurs.values()]; minuteurs.clear(); l.forEach(fn => fn()); } };
}
test('17e audit : sélecteur de langue — un seul motif ARIA (bouton + listbox), clavier inchangé', () => {
  const { root, button, panel, dom } = loadSwitcher();
  assert.equal(root.children.length, 2, 'bouton + panneau attendus');
  // Recherche par CLASSE et non par indice (19e audit du 21/09/2026) : l ajout d une région vivante en fin de
  // panneau avait fait échouer ce test alors que la sémantique n avait pas bougé.
  const search = panel.children.find(c => c.className === 'lang-search');
  const list = panel.children.find(c => c.className === 'lang-option-list');
  // Le bouton annonce une listbox : l'élément qu'il désigne DOIT en être une.
  assert.equal(button.getAttribute('aria-haspopup'), 'listbox');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(button.getAttribute('aria-controls'), list.id, 'le bouton ne désigne pas la liste');
  assert.equal(list.getAttribute('role'), 'listbox');
  assert.ok(list.getAttribute('aria-label'), 'la listbox n\'a pas de nom accessible');
  // Plus de rôle concurrent : ni « dialogue » sur le panneau, ni « liste déroulante » sur le champ de recherche (le
  // focus clavier quitte réellement le champ pour se poser sur les options — ce n'est pas le motif combobox).
  assert.equal(panel.getAttribute('role'), null, 'le panneau porte encore un rôle');
  assert.equal(search.getAttribute('role'), null, 'le champ de recherche porte encore un rôle');
  assert.equal(search.getAttribute('aria-expanded'), null, 'aria-expanded sur le champ de recherche');
  assert.ok(search.getAttribute('aria-label'), 'le champ de recherche n\'a pas de nom accessible');
  assert.equal(search.getAttribute('aria-controls'), list.id, 'le champ de recherche ne désigne plus la liste qu\'il filtre');
  // Ouverture : la liste se remplit d'options, toutes enfants de la listbox.
  button.fire('click');
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.ok(panel.classList.contains('show'));
  const options = list.querySelectorAll('.lang-option');
  assert.ok(options.length >= 100, options.length + ' options');
  assert.ok(options.every(o => o.getAttribute('role') === 'option' && o.parent === list), 'options hors de la listbox');
  assert.equal(options.filter(o => o.getAttribute('aria-selected') === 'true').length, 1, 'une seule option sélectionnée attendue');
  assert.ok(options.every(o => o.getAttribute('tabindex') === '-1'), 'focus glissant : tabindex="-1" sur chaque option');
  // Clavier inchangé : flèche bas depuis la recherche -> première option ; bas/haut ; Fin/Début ; Échap referme.
  const is = (el, want, what) => assert.ok(el === want, what + ' : ' + (el && (el.className || el.tagName)));
  search.fire('keydown', { key: 'ArrowDown' });
  is(dom.activeElement, options[0], 'flèche bas depuis la recherche');
  list.fire('keydown', { key: 'ArrowDown' });
  is(dom.activeElement, options[1], 'flèche bas dans la liste');
  list.fire('keydown', { key: 'ArrowUp' });
  is(dom.activeElement, options[0], 'flèche haut dans la liste');
  list.fire('keydown', { key: 'End' });
  is(dom.activeElement, options[options.length - 1], 'touche Fin');
  list.fire('keydown', { key: 'Home' });
  is(dom.activeElement, options[0], 'touche Début');
  list.fire('keydown', { key: 'ArrowUp' });
  is(dom.activeElement, search, 'flèche haut depuis la première option revient à la recherche');
  search.fire('keydown', { key: 'Escape' });
  assert.equal(button.getAttribute('aria-expanded'), 'false', 'Échap ne referme plus le panneau');
  // Recherche : la liste est filtrée, les options restent des options de la même listbox.
  button.fire('click');
  search.value = 'deutsch';
  search.fire('input');
  const filtered = list.querySelectorAll('.lang-option');
  assert.ok(filtered.length >= 1 && filtered.length < 20, filtered.length + ' résultats pour « deutsch »');
  assert.ok(filtered.every(o => o.getAttribute('role') === 'option'));
});

test('20e audit : l\'annonce du sélecteur de langue ne parle pas après coup, et ne se répète pas à chaque frappe', () => {
  // La région vivante (aria-live="polite") ajoutée au 19e audit écrit son texte au TOUR SUIVANT, pour que le lecteur
  // d'écran reprononce un message identique. Deux défauts en découlaient :
  //   - effacer l'annonce n'annulait pas l'écriture déjà programmée : « Aucune langue trouvée » s'écrivait APRÈS que
  //     la frappe suivante eut rempli la liste — le lecteur d'écran annonçait l'inverse de ce qui était affiché ;
  //   - chaque lettre tapée dans une recherche déjà sans résultat reprononçait la même phrase.
  const { button, panel, flush, enAttente } = loadSwitcher({ differer: true });
  const live = panel.children.find(c => c.id === 'lang-search-live');
  assert.ok(live, 'région vivante absente du panneau');
  const search = panel.children.find(c => c.className === 'lang-search');
  const list = panel.children.find(c => c.className === 'lang-option-list');
  button.fire('click');
  flush();

  // 1. Saisie sans résultat : l'annonce est PROGRAMMÉE.
  search.value = 'zzzzzz';
  search.fire('input');
  assert.equal(list.querySelectorAll('.lang-option').length, 0, 'la saisie « zzzzzz » ne devait rien donner');
  assert.equal(enAttente(), 1, 'aucune annonce programmée pour une recherche sans résultat');

  // 2. Une lettre de plus, toujours sans résultat : RIEN de nouveau n'est programmé, le texte est déjà le bon.
  search.value = 'zzzzzzz';
  search.fire('input');
  assert.equal(enAttente(), 1, 'la même phrase est reprogrammée à chaque frappe (' + enAttente() + ' annonces en attente)');
  flush();
  const attendu = live.textContent;
  assert.ok(attendu, 'la région vivante est restée vide');

  // 3. Saisie qui redonne des résultats AVANT que l'annonce ne soit écrite : l'annonce doit être annulée.
  search.value = 'zzzzzzzz';
  search.fire('input');           // reprogramme ? non : même texte
  search.value = '';
  search.fire('input');           // la liste se remplit -> annoncer('')
  assert.ok(list.querySelectorAll('.lang-option').length > 100, 'la liste ne s\'est pas remplie');
  assert.equal(enAttente(), 0, 'une annonce reste programmée alors que la liste est pleine');
  flush();
  assert.equal(live.textContent, '', 'la région vivante annonce « ' + live.textContent + ' » alors que la liste est pleine');
});

test('20e audit : chaque langue se retrouve en tapant son nom SANS les signes qu\'aucun clavier ne donne', () => {
  // Le champ de recherche du sélecteur replie la casse et les accents, mais pas les apostrophes ni les lettres
  // modificatives : « kiche » ne trouvait pas « K'iche' », « olelo hawaii » ne trouvait pas « ʻŌlelo Hawaiʻi ».
  // Huit langues sur 161 étaient dans ce cas : uz, haw, gn, ch, mrq, yua, quc, kek.
  const SIGNES = /['ʻʼʽʾʿˈ‘’‛··՚ꞌ]/;
  const concernées = Object.keys(LANG_NAMES_T).filter(c => langs.indexOf(c) >= 0 && SIGNES.test(LANG_NAMES_T[c]));
  assert.ok(concernées.length >= 8, 'échantillon trop maigre (' + concernées.length + ' noms à signes)');
  const { button, panel } = loadSwitcher();
  const search = panel.children.find(c => c.className === 'lang-search');
  const list = panel.children.find(c => c.className === 'lang-option-list');
  button.fire('click');
  const perdues = [];
  for(const code of concernées){
    const saisie = LANG_NAMES_T[code].replace(new RegExp(SIGNES.source, 'g'), '');
    search.value = saisie;
    search.fire('input');
    const trouvé = list.querySelectorAll('.lang-option').some(o => o.getAttribute('data-lang') === code);
    if(!trouvé) perdues.push(code + ' « ' + LANG_NAMES_T[code] + ' » tapé « ' + saisie + ' »');
  }
  assert.deepEqual(perdues, []);
  // Contre-épreuve : les codes à tiret restent cherchables tels quels (le tiret ne doit PAS être replié).
  const àTiret = langs.filter(c => c.indexOf('-') >= 0);
  assert.ok(àTiret.length >= 4, 'aucun code à tiret : la contre-épreuve ne prouve rien');
  const tiretPerdus = [];
  for(const code of àTiret){
    search.value = code;
    search.fire('input');
    if(!list.querySelectorAll('.lang-option').some(o => o.getAttribute('data-lang') === code)) tiretPerdus.push(code);
  }
  assert.deepEqual(tiretPerdus, []);
});

test('20e audit : les polices embarquées s\'appliquent au nom de la langue dans le sélecteur, pas seulement à la page entière', () => {
  // Cinq écritures ne sont fournies par presque aucun système : tifinagh, guèze, tibétain, thâna, yi. Le projet
  // embarque leurs polices — mais les règles ne visaient que « html[lang="zgh"] body », c'est-à-dire la page
  // ENTIÈRE déjà dans cette langue. Or l'endroit où ces écritures apparaissent toujours, quelle que soit la langue
  // de la page, c'est le sélecteur de langue, où chaque nom porte son propre attribut lang. « ⵜⴰⵎⴰⵣⵉⵖⵜ », « አማርኛ »,
  // « རྫོང་ཁ », « ދިވެހި » et « ꆇꉙ » s'affichaient donc en carrés vides pour qui ne lisait pas déjà ces langues :
  // impossible de les choisir faute de les voir.
  const css = fs.readFileSync(path.join(PUB, 'css', 'style.css'), 'utf8');
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(m => m[1]);
  assert.ok(faces.length >= 5, faces.length + ' @font-face trouvés dans style.css');
  const polices = faces.map(bloc => {
    const nom = (bloc.match(/font-family:\s*"([^"]+)"/) || [])[1];
    const plages = [];
    const ur = (bloc.match(/unicode-range:\s*([^;]+);/) || [])[1] || '';
    ur.split(',').forEach(p => {
      const m = p.trim().match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/);
      if(m) plages.push([parseInt(m[1], 16), parseInt(m[2] || m[1], 16)]);
    });
    return { nom, plages };
  }).filter(p => p.nom && p.plages.length);
  assert.equal(polices.length, faces.length, 'une @font-face sans nom ou sans unicode-range');
  const manquantes = [];
  for(const code of langs){
    const nom = LANG_NAMES_T[code];
    if(!nom) continue;
    for(const p of polices){
      const concerné = [...nom].some(ch => { const cp = ch.codePointAt(0); return p.plages.some(([a, b]) => cp >= a && cp <= b); });
      if(!concerné) continue;
      // Une règle qui s'applique à N'IMPORTE QUEL élément portant lang="<code>" : le sélecteur ne doit pas être
      // limité à <html> (« html[lang="zgh"] body » ne touche pas une option du sélecteur dans une page française).
      const re = new RegExp('(^|[,\\s])\\[lang="' + code + '"\\][^{]*\\{[^}]*font-family:\\s*"' + p.nom + '"', 'm');
      if(!re.test(css)) manquantes.push(code + ' « ' + nom + ' » -> ' + p.nom);
    }
  }
  assert.deepEqual(manquantes, []);
});

// --------------------------------------------------------- 18e audit du 21/09/2026 : écriture des replis
// La 14e passe a corrigé le touroyo et l'adyguéen, dont la locale de repli imposait une écriture étrangère aux
// dates, aux nombres et aux noms de pays (« ٦ roj٣ bajar » en kurde). Elle n'a pas passé la règle sur les autres :
// le 18e audit a retrouvé le même défaut sur ku et so, et un balayage l'a retrouvé sur crh, rue, om, tk, mk et ne.
// Ce contrôle l'applique désormais aux 110 langues à repli d'un coup.
test('18e audit : locale de repli — jamais une écriture étrangère à celle de la langue', () => {
  const F = LOCALE_FALLBACK_T;
  assert.ok(F && Object.keys(F).length > 80, 'LOCALE_FALLBACK non exposée par i18n.js');
  const SCRIPTS = [['latin', /\p{Script=Latin}/u], ['cyrillique', /\p{Script=Cyrillic}/u], ['grec', /\p{Script=Greek}/u],
    ['arabe', /\p{Script=Arabic}/u], ['hébreu', /\p{Script=Hebrew}/u], ['guèze', /\p{Script=Ethiopic}/u],
    ['devanagari', /\p{Script=Devanagari}/u], ['bengali', /\p{Script=Bengali}/u], ['tamoul', /\p{Script=Tamil}/u],
    ['thaï', /\p{Script=Thai}/u], ['lao', /\p{Script=Lao}/u], ['khmer', /\p{Script=Khmer}/u], ['birman', /\p{Script=Myanmar}/u],
    ['tibétain', /\p{Script=Tibetan}/u], ['géorgien', /\p{Script=Georgian}/u], ['arménien', /\p{Script=Armenian}/u],
    ['thâna', /\p{Script=Thaana}/u], ['tifinagh', /\p{Script=Tifinagh}/u], ['yi', /\p{Script=Yi}/u],
    ['singhalais', /\p{Script=Sinhala}/u], ['han', /\p{Script=Han}/u], ['hangul', /\p{Script=Hangul}/u],
    ['kana', /\p{Script=Hiragana}|\p{Script=Katakana}/u], ['malayalam', /\p{Script=Malayalam}/u]];
  const écriture = t => { for(const [nom, re] of SCRIPTS) if(re.test(String(t || ''))) return nom; return '?'; };
  // Discordances ASSUMÉES : aucune locale n'existe dans l'écriture de la langue, ou la langue de contact est
  // réellement lue par ce public. Chacune doit rester nécessaire — une entrée devenue inutile fait échouer le test.
  const ASSUMÉES = {
    dv: 'thâna : aucune locale ICU dans cette écriture', dz: 'tibétain : idem', ka: 'géorgien : idem',
    km: 'khmer : idem', lo: 'lao : idem', my: 'birman : idem', si: 'singhalais : idem', ii: 'yi : idem',
    zgh: 'tifinagh : idem (l\'arabe du Maroc est la langue de contact)',
    za: 'le zhuang est écrit en latin mais ses locuteurs du Guangxi lisent le chinois, langue de contact réelle',
    hy: 'l\'arménien a sa propre écriture ; à défaut de locale ICU, le russe est la langue de contact en Arménie'
  };
  const noms = LANG_NAMES_T;
  // 20e audit du 21/09/2026 : « plus de 100 clés » ne pouvait pas échouer — la table en compte 161 depuis longtemps,
  // et une langue qui perdrait son nom passait inaperçue. La table doit correspondre EXACTEMENT à SUPPORTED.
  assert.ok(noms, 'LANG_NAMES non exposée par i18n.js');
  assert.deepEqual(langs.filter(c => !noms[c]), [], 'langue déclarée sans nom dans LANG_NAMES');
  assert.deepEqual(Object.keys(noms).filter(c => langs.indexOf(c) < 0), [], 'nom de langue sans langue correspondante dans SUPPORTED');
  assert.equal(Object.keys(noms).length, langs.length);
  const date = new Date(Date.UTC(2026, 8, 23));
  const bad = [], inutiles = [];
  for(const code of Object.keys(F)){
    let mois;
    try { mois = new Intl.DateTimeFormat(F[code], { month: 'long' }).format(date); } catch(e){ mois = ''; }
    const eLangue = écriture(noms[code] || code), eMois = écriture(mois);
    const accord = eLangue === eMois;
    if(!accord && !ASSUMÉES[code]) bad.push(code + ' (' + (noms[code] || '') + ') : écriture ' + eLangue +
      ', mais « ' + mois + ' » en ' + eMois + ' via ' + F[code]);
    if(accord && ASSUMÉES[code]) inutiles.push(code);
  }
  assert.deepEqual(bad, []);
  assert.deepEqual(inutiles, [], 'exception devenue inutile : la retirer de ASSUMÉES');
});

// DRAPEAUX DU SÉLECTEUR DE LANGUE (24/09/2026). LANG_FLAGS n'était couverte par AUCUN test, alors qu'elle
// décide bien plus que l'image : la région de la locale Intl (localeTag) et le pays dont les villes remontent
// dans les suggestions (langCountry). Un code fautif ne cassait rien de visible — langFlagSrc retombe sur
// « fr » — il affichait simplement le drapeau français à côté d'une langue qui n'a rien de français.
test('drapeaux : une entrée par langue, aucune orpheline, chaque fichier présent', () => {
  const manquantes = langs.filter(l => !LANG_FLAGS_T[l]);
  const orphelines = Object.keys(LANG_FLAGS_T).filter(l => langs.indexOf(l) < 0);
  assert.deepEqual(manquantes, [], 'langues sans drapeau (elles afficheraient le drapeau français)');
  assert.deepEqual(orphelines, [], 'entrées de drapeau sans langue');
  const sansFichier = [...new Set(Object.values(LANG_FLAGS_T))]
    .filter(f => !fs.existsSync(path.join(PUB, 'img', 'flags', f + '.svg')));
  assert.deepEqual(sansFichier, [], 'codes de drapeau sans fichier dans public/img/flags/');
});

// Un code qui n'est pas un code pays (« amazigh », « occitania », « arab-league ») ne se laisse pas découper
// en région par localeTag ni en pays par langCountry : sans entrée explicite dans les deux tables, la locale
// retombe sur la langue nue (les mois changent de forme) et la devise proposée retombe sur l'euro. C'est la
// garde qui manquait quand le drapeau de la Ligue arabe a remplacé celui de la Syrie pour l'arabe.
test('drapeaux : tout drapeau non étatique est déclaré dans les deux tables dérivées', () => {
  const nonEtat = [...new Set(Object.values(LANG_FLAGS_T))].filter(f => !/^[a-z]{2}(-|$)/.test(f));
  assert.ok(nonEtat.length > 0, 'aucun drapeau non étatique : ce test ne contrôle plus rien');
  const oubliés = [];
  for (const f of nonEtat) {
    const langue = langs.find(l => LANG_FLAGS_T[l] === f);
    if (!I18N.localeTag(langue) || I18N.localeTag(langue).indexOf('-') < 0)
      oubliés.push(f + ' : localeTag(' + langue + ') = ' + I18N.localeTag(langue) + ' (région perdue, LOCALE_FLAG_REGION)');
    if (!I18N.country(langue))
      oubliés.push(f + ' : country(' + langue + ') vide (devise et villes perdues, FLAG_COUNTRY)');
  }
  assert.deepEqual(oubliés, []);
});

// Un drapeau partagé par plusieurs langues n'est pas une faute en soi — c'est le repli assumé quand la langue
// n'a pas de drapeau propre (bas-allemand sur l'Allemagne, cachoube sur la Pologne). Mais chaque partage doit
// être VOULU : la liste ci-dessous est exhaustive, et le test échoue aussi bien si un partage apparaît que si
// l'un d'eux disparaît sans que la liste soit mise à jour.
const PARTAGES_ASSUMÉS = {
  za: ['af', 'zu', 'xh', 'nso', 'st', 'tn', 'nr', 've', 'ts'],   // onze langues officielles d'Afrique du Sud
  de: ['de', 'nds', 'hsb', 'frr'], in: ['hi', 'mr', 'ta', 'ml'],
  pl: ['pl', 'csb', 'rue'], cn: ['zh', 'za', 'ii'], gt: ['quc', 'cak', 'kek'],
  gb: ['en', 'kw'], 'gb-sct': ['gd', 'sco'], pt: ['pt', 'mwl'], hr: ['hr', 'ruo'],
  lv: ['lv', 'ltg'], lt: ['lt', 'sgs'], ee: ['et', 'vro'], ua: ['uk', 'crh'],
  ge: ['ka', 'ab'], id: ['id', 'jv'], tw: ['zh-Hant', 'hak'], pf: ['ty', 'mrq'],
  'ru-mo': ['myv', 'mdf'], amazigh: ['zgh', 'kab'],
  // 24/09/2026 : les deux dialectes kurdes partagent le drapeau kurde ; le touroyo rejoint la Turquie, où se
  // trouve le Tur Abdin. La Syrie, qui portait ar/ku/tru/ady, ne porte plus aucune langue.
  'iq-kr': ['ku', 'ckb'], tr: ['tr', 'tru'],
};
test('drapeaux : les partages entre langues sont tous assumés, et la liste est à jour', () => {
  const par = {};
  for (const l of langs) (par[LANG_FLAGS_T[l]] = par[LANG_FLAGS_T[l]] || []).push(l);
  const réels = {};
  for (const f of Object.keys(par)) if (par[f].length > 1) réels[f] = par[f].slice().sort();
  const attendus = {};
  for (const f of Object.keys(PARTAGES_ASSUMÉS)) attendus[f] = PARTAGES_ASSUMÉS[f].slice().sort();
  assert.deepEqual(réels, attendus, 'partages de drapeau : la réalité ne correspond plus à la liste assumée');
  // Et la Syrie, précisément, ne doit plus porter aucune langue : c'est l'objet du changement du 24/09/2026.
  const surLaSyrie = langs.filter(l => LANG_FLAGS_T[l] === 'sy');
  assert.deepEqual(surLaSyrie, [], 'des langues sont revenues sur le drapeau syrien');
});
