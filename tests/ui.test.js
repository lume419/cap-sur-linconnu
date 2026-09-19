// Fonctions d'affichage de public/js/app.js, sous Node sans navigateur (12e audit du 19/09/2026) : les fonctions
// utiles sont extraites du source d'app.js (déclarées au premier niveau de son IIFE, indentation de deux espaces) et
// exécutées dans un bac à sable avec le vrai i18n.js — aucun DOM, aucun moteur, aucun serveur.
//   - plages de dates localisées (écritures de droite à gauche comprises), en-tête du PDF ;
//   - « 21 jours max » et durée du séjour au bon nombre ;
//   - pauses recharge et traversées à tarif inconnu au bon pluriel ;
//   - total ferry sans train-auto ni traversées gratuites, tarif piéton « par personne » ;
//   - route inconnue sans séparateur orphelin ; aucune vignette à vélo ; numéro de jour du PDF (`badge`).
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public', 'js');
const APP = fs.readFileSync(path.join(PUB, 'app.js'), 'utf8');

// Source d'une fonction de premier niveau d'app.js : de « function nom( » à la première ligne « } » de même retrait.
function extract(name){
  const lines = APP.split('\n');
  const i = lines.findIndex(l => l.startsWith('  function ' + name + '('));
  assert.ok(i >= 0, 'fonction ' + name + ' introuvable dans app.js');
  if(/\}\s*$/.test(lines[i]) && !/\{\s*$/.test(lines[i])) return lines[i];
  const j = lines.findIndex((l, k) => k > i && l === '  }');
  assert.ok(j > i, 'fin de ' + name + ' introuvable');
  return lines.slice(i, j + 1).join('\n');
}
function extractVar(name){
  const m = APP.match(new RegExp('^  var ' + name + ' = [^\\n]*;', 'm'));
  assert.ok(m, 'variable ' + name + ' introuvable dans app.js');
  return m[0];
}

const FNS = ['isoDate', 'parseIsoDate', 'formatFrDate', 'formatDateRange', 'formatStayRange', 'formatNum', 'formatKm', 'formatMoney',
  'approxMoney', 'rangeDecimals', 'approxMoneyRange', 'formatList', 'tIfDefined', 'statsLabel', 'pluralPhrase', 'chargeStopsText',
  'nounFirstLang', 'stopKey', 'tripTotalKm', 'tripFerryKm', 'tollRange', 'tollRangeKind', 'ferryLabel', 'ferryFootFare', 'ferryPriceText',
  'withoutEmptyRoute', 'ferryText', 'ferryTotalLabel', 'formatDurationMin', 'fmtHours', 'tripStatsParts', 'vignetteCountriesOfGroup',
  'durationLabel', 'maxDaysSuffix', 'groupLegsByStay', 'dayBadgeText', 'tripLabelText'];

function sandbox(){
  let src = fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8');
  const fakeEl = () => ({ setAttribute(){}, getAttribute(){ return null; }, classList: { add(){}, remove(){}, contains(){ return false; } },
    appendChild(){}, addEventListener(){}, querySelector(){ return fakeEl(); }, querySelectorAll(){ return []; }, style: {} });
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    document: { readyState: 'complete', documentElement: fakeEl(), querySelectorAll: () => [], getElementById: () => null, createElement: fakeEl, addEventListener(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  // Données réduites au strict nécessaire (trip-data.js n'est pas chargé) : mêmes champs que TRANSPORT/COUNTRIES.
  const glue = [
    'var t = window.I18N.t, localeTag = function(c){ return window.I18N.localeTag(c); };',
    'var VISITOR_LANG = "fr", MAX_TRIP_DAYS = 21;',
    'var TRANSPORT = { "voiture-thermique": { tollClass: 1, ferryClass: 1 }, "velo": { tollClass: null, ferryClass: "foot" } };',
    'var COUNTRIES = { CH: { vignette: { url: "https://www.via.admin.ch/shop/" } }, FR: {} };',
    extractVar('ROUTE_MARK'),
    FNS.map(extract).join('\n'),
    'window.__app = {' + FNS.map(n => n + ': ' + n).join(', ') + ', setLang: function(l){ window.I18N.set(l); VISITOR_LANG = l; } };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx.window;
}
const W = sandbox();
const A = W.__app;
const RTL = ['ar', 'fa', 'ckb', 'ur', 'dv'];

test('plages de dates : formatRange de la langue, jamais de flèche « → » (écritures de droite à gauche comprises)', () => {
  for(const l of ['fr', 'en', 'ja', ...RTL]){
    A.setLang(l);
    const s = A.formatStayRange('2026-09-20', '2026-09-23');
    assert.ok(s && !/→/.test(s), l + ' : « ' + s + ' »');
    const expected = new Intl.DateTimeFormat(W.I18N.localeTag(), { day: 'numeric', month: 'short' }).formatRange(new Date(2026, 8, 20), new Date(2026, 8, 23));
    assert.equal(s, expected, l);
    // Une seule nuit : une seule date.
    assert.equal(A.formatStayRange('2026-09-20', '2026-09-21'), A.formatFrDate('2026-09-20'));
  }
  A.setLang('fr');
});

test('en-tête du PDF : dates localisées, plus de dates ISO ni de « date → date »', () => {
  const trip = { city: 'Lyon', legs: [{ stop: 'Annecy' }], days: 3, startIso: '2026-09-20', endIso: '2026-09-22' };
  for(const l of ['fr', 'ar', 'fa', 'ja']){
    A.setLang(l);
    const s = A.tripLabelText(trip);
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(s), l + ' : date ISO dans « ' + s + ' »');
    assert.equal((s.match(/→/g) || []).length, 1, l + ' : une seule flèche (départ → étape) dans « ' + s + ' »');
  }
  A.setLang('fr');
  assert.match(A.tripLabelText(trip), /^Lyon → Annecy · 20.*22 sept\. 2026$/);
  assert.match(A.tripLabelText(Object.assign({}, trip, { days: 1, endIso: '2026-09-20' })), /^Lyon → Annecy · 20 sept\. 2026$/);
});

test('« — 21 jours max » et durée du séjour : forme exacte du nombre 21', () => {
  const expected = { ru: '21 день', uk: '21 день', rue: '21 день', be: '21 дзень', lt: '21 diena', sgs: '21 diena', lv: '21 diena',
    ltg: '21 dīna', hr: '21 dan', bs: '21 dan', cnr: '21 dan', sr: '21 дан', ro: '21 de zile', is: '21 dagur', mk: '21 ден',
    pl: '21 dni', cs: '21 dní', fr: '21 jours', en: '21 days' };
  const bad = [];
  for(const [l, want] of Object.entries(expected)){
    A.setLang(l);
    const s = A.maxDaysSuffix();
    if(s.indexOf(want) < 0) bad.push(l + ' : « ' + s + ' » (attendu « ' + want + ' »)');
  }
  A.setLang('ar');
  const ar = A.maxDaysSuffix();
  if(!/يومًا/.test(ar) || /أيام/.test(ar)) bad.push('ar : « ' + ar + ' »');
  // Durée du séjour : même forme que les statistiques (« 21 diena », pas « 21 dienas »).
  const dur = { lv: '21 diena (20 naktis)', ltg: '21 dīna (20 naktis)', is: '21 dagur (20 nætur)', mk: '21 ден (20 ноќи)', ru: '21 день (20 ночей)' };
  for(const [l, want] of Object.entries(dur)){
    A.setLang(l);
    const s = A.durationLabel(21, 20);
    if(s !== want) bad.push(l + ' durée : « ' + s + ' » (attendu « ' + want + ' »)');
  }
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

// Formes attendues pour 1, 2, 5, 21, 22 (sous-chaîne présente dans la phrase composée). Tchèque : 22 au génitif pluriel
// comme 5 (« few » CLDR = 2 à 4 seulement).
const COUNTERS = {
  ru: { 'stats.ferryUnpriced': ['переправа ', 'переправы ', 'переправ ', 'переправа ', 'переправы '],
    'charge.textN': ['ориентировочная остановка', 'ориентировочные остановки', 'ориентировочных остановок', 'ориентировочная остановка', 'ориентировочные остановки'],
    'charge.realN': [' остановка ', ' остановки ', ' остановок ', ' остановка ', ' остановки '] },
  uk: { 'stats.ferryUnpriced': ['переправа ', 'переправи ', 'переправ ', 'переправа ', 'переправи '],
    'charge.textN': ['орієнтовна зупинка', 'орієнтовні зупинки', 'орієнтовних зупинок', 'орієнтовна зупинка', 'орієнтовні зупинки'],
    'charge.realN': [' зупинка ', ' зупинки ', ' зупинок ', ' зупинка ', ' зупинки '] },
  pl: { 'stats.ferryUnpriced': ['przeprawa ', 'przeprawy ', 'przepraw ', 'przepraw ', 'przeprawy '],
    'charge.textN': ['szacowany postój', 'szacowane postoje', 'szacowanych postojów', 'szacowanych postojów', 'szacowane postoje'] },
  cs: { 'stats.ferryUnpriced': ['přejezd ', 'přejezdy ', 'přejezdů ', 'přejezdů ', 'přejezdů '],
    'charge.textN': ['odhadovaná zastávka', 'odhadované zastávky', 'odhadovaných zastávek', 'odhadovaných zastávek', 'odhadovaných zastávek'] },
  lt: { 'stats.ferryUnpriced': ['perplaukimas ', 'perplaukimai ', 'perplaukimai ', 'perplaukimas ', 'perplaukimai '],
    'charge.textN': ['numatoma įkrovimo pertrauka', 'numatomos įkrovimo pertraukos', 'numatomos įkrovimo pertraukos', 'numatoma įkrovimo pertrauka', 'numatomos įkrovimo pertraukos'] },
  ar: { 'stats.ferryUnpriced': ['عبور بسعر', 'عبوران', 'عبورات', 'عبورًا', 'عبورًا'],
    'charge.textN': ['توقف شحن تقديري', 'توقفا شحن', 'توقفات شحن', 'توقفًا تقديريًا', 'توقفًا تقديريًا'],
    'charge.realN': ['توقف شحن', 'توقفا شحن', 'توقفات شحن', 'توقفًا للشحن', 'توقفًا للشحن'] }
};
test('compteurs au bon pluriel pour 1, 2, 5, 21, 22 (ru, uk, pl, cs, lt, ar)', () => {
  const N = [1, 2, 5, 21, 22], bad = [];
  for(const [l, keys] of Object.entries(COUNTERS)){
    A.setLang(l);
    for(const [key, forms] of Object.entries(keys)){
      N.forEach((n, i) => {
        const s = key === 'stats.ferryUnpriced' ? A.statsLabel(n, key) : A.pluralPhrase(key, n, { n: A.formatNum(n), min: '40', places: 'X' });
        if(!s || s.indexOf(forms[i]) < 0 || /\{\w+\}/.test(s)) bad.push(l + ' ' + key + ' ' + n + ' : « ' + s + ' » (attendu « ' + forms[i] + ' »)');
      });
    }
    // charge.realN sans forme : tournure neutre « Libellé : {n} » de la langue.
    if(!keys['charge.realN'] && !/:\s*\{n\}/.test(W.I18N.t('charge.realN'))) bad.push(l + ' charge.realN : ni forme plurielle ni tournure neutre');
  }
  // Phrases complètes d'app.js : pause unique au singulier, 21 pauses au singulier russe.
  A.setLang('ru');
  if(!/^1 ориентировочная/.test(A.chargeStopsText(false, 1, 30))) bad.push('ru charge 1 : ' + A.chargeStopsText(false, 1, 30));
  if(!/^21 ориентировочная остановка/.test(A.chargeStopsText(false, 21, 30))) bad.push('ru charge 21 : ' + A.chargeStopsText(false, 21, 30));
  if(!/^5 остановок .*: Лион\.$/.test(A.chargeStopsText(true, 5, 30, 'Лион'))) bad.push('ru charge réel 5 : ' + A.chargeStopsText(true, 5, 30, 'Лион'));
  A.setLang('fr');
  if(A.chargeStopsText(false, 3, 90) !== W.I18N.t('charge.textN', { n: '3', min: '90' })) bad.push('fr : phrase traduite telle quelle attendue');
  assert.deepEqual(bad, []);
});

// Étapes factices (mêmes champs que le moteur).
const leg = (stop, extra) => Object.assign({ stop, lat: 45, lon: 5, labelKind: 'day', distanceKm: 100 }, extra || {});
function statsOf(legs, transportKey){
  return A.tripStatsParts({ legs, days: legs.length, transportKey }).map(p => ({ value: p.value, label: p.label }));
}
test('total ferry : sans train-auto ni traversée gratuite ; train-auto dans sa propre pastille', () => {
  A.setLang('fr');
  const train = leg('Westerland', { lat: 54.9, ferryInfo: { routeKey: 'ferry.route.sylt', amount: 75, durationH: 0.75, mode: 'train' } });
  const trainUnknown = leg('Westerland', { lat: 54.91, ferryInfo: { routeKey: 'ferry.route.sylt', amount: null, priceStatus: 'unknown', durationH: 0.75, mode: 'train' } });
  const free = leg('Bac', { lat: 60, ferryInfo: { routeKey: 'ferry.route.x', amount: 0, durationH: 0.3 } });
  const paidFerry = leg('Bastia', { lat: 42.7, ferryInfo: { routeKey: 'ferry.route.corsica', amount: 120, durationH: 6, priceCovers: 'vehicleAndOccupants' } });
  let s = statsOf([leg('A'), train, trainUnknown, free], 'voiture-thermique');
  const labels = s.map(p => p.label);
  assert.ok(!labels.includes(W.I18N.t('stats.ferryTotal')), 'aucun total « de ferry » (train seul + ferry gratuit) : ' + JSON.stringify(s));
  assert.ok(!labels.includes(W.I18N.t('stats.ferryUnpriced')), 'le train-auto sans tarif ne compte pas comme traversée : ' + JSON.stringify(s));
  const tr = s.find(p => p.label === W.I18N.t('stats.trainTotal'));
  assert.ok(tr && /75/.test(tr.value), 'pastille train-auto : ' + JSON.stringify(s));
  assert.ok(!s.some(p => /^~0\b|~0\s*€/.test(p.value)), '« ~0 € » affiché : ' + JSON.stringify(s));
  s = statsOf([leg('A'), paidFerry, free, train], 'voiture-thermique');
  const f = s.find(p => p.label === W.I18N.t('stats.ferryTotal'));
  assert.ok(f && /120/.test(f.value) && !/195/.test(f.value), 'total ferry = 120 € seulement : ' + JSON.stringify(s));
});

test('tarif piéton (vélo) : « par personne » à l\'écran, dans le PDF et dans le total', () => {
  A.setLang('fr');
  const fi = { routeKey: 'ferry.route.corsica', amount: 45, durationH: 6 };
  const txt = A.ferryText(fi, 'Continent ↔ Corse', false, 'velo');
  assert.match(txt, /par personne/);
  assert.doesNotMatch(A.ferryText(fi, 'Continent ↔ Corse', false, 'voiture-thermique'), /par personne/);
  const s = statsOf([leg('A'), leg('Bastia', { ferryInfo: fi })], 'velo');
  assert.ok(s.some(p => p.label === W.I18N.t('stats.ferryTotalPerPerson')), JSON.stringify(s));
});

test('route inconnue : aucun séparateur orphelin, dans toutes les langues', () => {
  const bad = [];
  const fis = [{ amount: 75, durationH: 0.75, mode: 'train' }, { amount: null, durationH: 2 }];
  for(const l of W.I18N.SUPPORTED){
    A.setLang(l);
    for(const fi of fis){
      const s = A.ferryText(fi, '', false, 'voiture-thermique');
      if(/\u0001/.test(s) || /^[\s—–·:،,-]/.test(s) || /[—–·:،,-]\s*$/.test(s) || /[—–·]\s*[—–·]/.test(s)) bad.push(l + ' : « ' + s + ' »');
    }
  }
  A.setLang('fr');
  assert.equal(A.ferryText(fis[0], '', false, 'voiture-thermique').indexOf('—'), -1);
  assert.deepEqual(bad, []);
});

test('vignettes : aucun rappel à vélo', () => {
  const l = leg('Lausanne', { country: 'CH' });
  assert.deepEqual(Array.from(A.vignetteCountriesOfGroup(l, 'FR', 'velo')), []);
  assert.deepEqual(Array.from(A.vignetteCountriesOfGroup(l, 'FR', 'voiture-thermique')), ['CH']);
});

test('fourchette de prix japonaise : pas de « ~ » collé à un séparateur « ～ »', () => {
  A.setLang('ja');
  const s = A.approxMoneyRange(5.2, 14.7, 'EUR');
  assert.ok(!/~.*[～〜]/.test(s), s);
  A.setLang('fr');
  assert.match(A.approxMoneyRange(5.2, 14.7, 'EUR'), /^~5,20/);
});

test('liste des devises : Intl.ListFormat de la langue', () => {
  A.setLang('fr');
  assert.equal(A.formatList(['MAD', 'EUR']), 'MAD et EUR');
  A.setLang('ja');
  assert.ok(!/, /.test(A.formatList(['MAD', 'EUR'])), A.formatList(['MAD', 'EUR']));
  A.setLang('fr');
});

test('numéro de jour (champ `badge` du PDF) : chiffres de la langue, plage, retour', () => {
  A.setLang('ar');
  const legs = [leg('A'), leg('B', { lat: 46 }), leg('B', { lat: 46 }), leg('B', { lat: 46 }), leg('Lyon', { lat: 47, isReturn: true })];
  const groups = A.groupLegsByStay(legs);
  assert.deepEqual(Array.from(groups, g => A.dayBadgeText(g)), ['١', '٢–٤', '⟲']);
  A.setLang('fr');
  assert.deepEqual(Array.from(A.groupLegsByStay(legs), g => A.dayBadgeText(g)), ['1', '2–4', '⟲']);
  // Chaque étape du corps envoyé à /api/export-pdf porte ce libellé (buildTripExportPayload, objet legs[i]).
  assert.match(APP, /badge: legBadges\[idx\] \|\| null,/);
});
