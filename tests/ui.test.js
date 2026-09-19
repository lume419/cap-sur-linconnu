// Fonctions d'affichage de public/js/app.js, sous Node sans navigateur (12e audit du 19/09/2026) : les fonctions
// utiles sont extraites du source d'app.js (déclarées au premier niveau de son IIFE, indentation de deux espaces) et
// exécutées dans un bac à sable avec le vrai i18n.js — aucun DOM, aucun moteur, aucun serveur.
//   - plages de dates localisées (écritures de droite à gauche comprises), en-tête du PDF ;
//   - « 21 jours max » et durée du séjour au bon nombre ;
//   - pauses recharge et traversées à tarif inconnu au bon pluriel ;
//   - total ferry sans train-auto ni traversées gratuites, tarif piéton « par personne » ;
//   - route inconnue sans séparateur orphelin ; aucune vignette à vélo ; numéro de jour du PDF (`badge`).
// 13e audit du 19/09/2026 :
//   - corps envoyé à /api/export-pdf (buildTripExportPayload) : numéro de JOUR de chaque étape, pas de texts.vignette à
//     vélo, transportKey et distanceUnit ;
//   - énumérations (Intl.ListFormat de la langue elle-même, style long), séparateurs japonais, pluriels sgs/lv/is/mk,
//     chiffres de la langue dans les traductions ;
//   - kilomètres / miles : conversions exactes, unité automatique, aucun « km » affiché quand l'unité est le mile.
// 14e audit du 19/09/2026 :
//   - champs de distance en miles : bornes valides dans les deux sens, valeur affichée = envoyée = citée, message de
//     bornes avec l'unité (161 langues), restauration des valeurs par le navigateur, pas de 5 mi ;
//   - durée et difficulté des randonnées Visorando traduites ; touroyo et adyguéen sans repli arabe ; duel arabe.
// 15e audit du 19/09/2026 :
//   - miles : valeur saisie juste hors bornes en km (19,96 km…) jamais affichée dans les bornes et refusée quand même ;
//   - bouton du mode de rayon déjà actif : saisie gardée ; habitants et lieux repérés au bon pluriel ;
//   - touroyo et adyguéen : durées et dates sans mot turc ou russe ; rayon du message « trop loin » au dixième ;
//   - traversée ESTIMÉE (paire de ports) : « environ », tarif inconnu, à l'écran et dans le PDF.
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

const FNS = ['isoDate', 'parseIsoDate', 'formatFrDate', 'formatDateRange', 'formatStayRange', 'formatNum', 'formatMoney',
  'approxMark', 'approxMoney', 'rangeDecimals', 'approxMoneyRange', 'formatList', 'tIfDefined', 'statsLabel', 'pluralPhrase', 'chargeStopsText',
  'nounFirstLang', 'stopKey', 'tripTotalKm', 'tripFerryKm', 'tollRange', 'tollRangeKind', 'ferryLabel', 'ferryFootFare', 'ferryPriceText',
  'withoutEmptyRoute', 'ferryText', 'ferryTotalLabel', 'formatDurationMin', 'fmtHours', 'tripStatsParts', 'vignetteCountriesOfGroup',
  'durationLabel', 'maxDaysSuffix', 'groupLegsByStay', 'dayBadgeText', 'tripLabelText',
  // Unité de distance (13e audit).
  'unitForLang',
  'distanceUnit', 'kmToDistanceUnit', 'distanceUnitToKm', 'formatDistanceValue', 'formatDistance', 'distanceUnitVars', 'hikeDistanceText',
  'unitFieldBounds', 'distanceFieldKm', 'setDistanceFieldKm',
  // Champs de distance, bornes, pas, randonnées, duel arabe (14e audit du 19/09/2026).
  'applyFieldBounds', 'distanceFieldSpec', 'distanceFieldText', 'defaultDistanceValue', 'setDefaultDistanceField', 'convertDistanceFields',
  'checkNumberRange', 'msg', 'stepNumberField', 'hikeDurationText', 'hikeDifficultyText', 'dualWithoutNumber', 'countPart',
  // Mode du rayon, pluriels de l'annonce, dates en chiffres (15e audit du 19/09/2026).
  'setMode', 'revealCountTexts', 'numericDatesLang', 'numericDateText', 'localeDateText',
  // Corps envoyé à /api/export-pdf et ses dépendances.
  'buildTripExportPayload', 'pdfLegBadges', 'transportHasToll', 'pdfLegTexts', 'legRouteText', 'legDuration', 'legMinutes', 'overMaxLegText',
  'noChargerText', 'tollText', 'tollSourceLabel', 'exportTension', 'exportLodgingLinks', 'singleLegLabel', 'formatCpBadge', 'optionLabel',
  'optionTypeLabel', 'poiTypeLabel', 'camelFromDash', 'transportLabel', 'budgetLabel', 'vignetteLabel', 'tripCurrencyNoRateText',
  'currencyLinkFallbackText', 'getPreferredCurrency', 'isKnownCurrency'];

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
    'var COUNTRIES = { CH: { name: "Suisse", vignette: { url: "https://www.via.admin.ch/shop/" } }, FR: { name: "France" } };',
    'var TOLL_SOURCE = { FR: "autoroutes françaises 2026" }, KNOWN_POI_TYPES = { museum: 1 }, CURRENCY_OPTIONS = ["EUR"];',
    'var sessionCurrency, currentTripData = null, currentTripLabel = "", fieldDistanceUnit = "km", radiusMode = "km";',
    // Champs factices (valeur texte, bornes min/max/step comme les attributs d'un <input type="number">).
    'var fakeInput = function(){ return { value: "", min: "", max: "", step: "", dispatchEvent: function(){} }; };',
    'var els = { packGrid: { querySelectorAll: function(){ return []; } }, radius: fakeInput(), minDistance: fakeInput(), maxDistance: fakeInput(), legDistance: fakeInput(),',
    '  modeKm: { setAttribute: function(){} }, modeH: { setAttribute: function(){} } };',
    // Effets de bord de setMode sans DOM : erreurs retirées comptées, étiquette d'unité ignorée.
    'var modeClears = 0; function clearRadiusError(){ modeClears++; } function clearMinDistanceError(){} function updateRadiusUnitLabel(){}',
    'var Event = function(){};',
    ['ROUTE_MARK', 'approxMarkCache', 'KM_PER_MILE', 'MILE_COUNTRIES', 'CURRENCY_STORAGE_KEY', 'CHARGER_NEAR_STOP_KM', 'RADIUS_KM_FIELD',
      'HIKE_DIFFICULTY_KEYS'].map(extractVar).join('\n'),
    APP.match(/^  var DISTANCE_KM_FIELDS = \[[\s\S]*?\n  \];/m)[0],
    FNS.map(extract).join('\n'),
    // Unité forcée par les tests (setUnit) : l'application la tire de la langue seule (unitForLang), sans réglage.
    'var UNIT_OVERRIDE = null, __distanceUnit = distanceUnit; distanceUnit = function(){ return UNIT_OVERRIDE || __distanceUnit(); };',
    'window.__app = {' + FNS.map(n => n + ': ' + n).join(', ') + ', setLang: function(l){ window.I18N.set(l); VISITOR_LANG = l; },' +
      ' setUnit: function(u){ UNIT_OVERRIDE = u; }, setFieldUnit: function(u){ fieldDistanceUnit = u; }, fieldUnit: function(){ return fieldDistanceUnit; },' +
      ' els: els, DISTANCE_KM_FIELDS: DISTANCE_KM_FIELDS, RADIUS_KM_FIELD: RADIUS_KM_FIELD, HIKE_DIFFICULTY_KEYS: HIKE_DIFFICULTY_KEYS,' +
      ' setTrip: function(trip){ currentTripData = trip; }, radiusMode: function(){ return radiusMode; }, modeClears: function(){ return modeClears; } };'
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

test('en-tête du PDF : dates localisées, plus de dates ISO ni de « date → date », flèche dans le sens de lecture', () => {
  const trip = { city: 'Lyon', legs: [{ stop: 'Annecy' }], days: 3, startIso: '2026-09-20', endIso: '2026-09-22' };
  for(const l of ['fr', 'ja', ...RTL]){
    A.setLang(l);
    const s = A.tripLabelText(trip);
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(s), l + ' : date ISO dans « ' + s + ' »');
    // Écriture de droite à gauche : « ← » (13e audit du 19/09/2026), sinon « → » ; une seule flèche (départ, étape).
    const [want, not] = RTL.includes(l) ? ['←', '→'] : ['→', '←'];
    assert.equal((s.match(new RegExp(want, 'g')) || []).length, 1, l + ' : une seule flèche ' + want + ' dans « ' + s + ' »');
    assert.ok(s.indexOf(not) < 0, l + ' : flèche ' + not + ' dans « ' + s + ' »');
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

test('liste des devises : Intl.ListFormat de la langue elle-même (style long), sinon virgule', () => {
  A.setLang('fr');
  assert.equal(A.formatList(['MAD', 'EUR']), 'MAD et EUR');
  A.setLang('ja');
  assert.ok(!/, /.test(A.formatList(['MAD', 'EUR'])), A.formatList(['MAD', 'EUR']));
  // Style long : « MAD en EUR », pas « MAD & EUR » (style court) en néerlandais.
  A.setLang('nl');
  assert.equal(A.formatList(['MAD', 'EUR']), 'MAD en EUR');
  // 13e audit du 19/09/2026 : la conjonction d'une AUTRE langue (locale de repli) n'est jamais utilisée — kabyle « et »
  // (français), oromo « እና » (amharique), amazighe « و » (arabe). Soit les règles de la langue elle-même, soit « , ».
  const bad = [];
  for(const [l, foreign] of [['kab', /\bet\b/], ['om', /እና|\bet\b/], ['zgh', /و|\bet\b/], ['rw', /\bet\b/], ['lij', /\bet\b/]]){
    A.setLang(l);
    const s = A.formatList(['MAD', 'EUR']);
    const tag = W.I18N.localeTag(l);
    const own = tag.split('-')[0] === l && Intl.ListFormat.supportedLocalesOf([tag], { localeMatcher: 'lookup' }).length;
    const want = own ? new Intl.ListFormat(tag, { style: 'long', type: 'conjunction' }).format(['MAD', 'EUR']) : 'MAD, EUR';
    if(s !== want || foreign.test(s)) bad.push(l + ' : « ' + s + ' » (attendu « ' + want + ' »)');
  }
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

test('route inconnue : séparateurs japonais « ― » et « ・ » retirés avec elle', () => {
  const M = '';
  assert.equal(A.withoutEmptyRoute(M + ' ― 2時間 ― ~75 €'), '2時間 ― ~75 €');
  assert.equal(A.withoutEmptyRoute('カートレイン・' + M), 'カートレイン');
  assert.equal(A.withoutEmptyRoute('フェリー ― ' + M + ' ― 2時間'), 'フェリー ― 2時間');
  assert.equal(A.withoutEmptyRoute('A・B'), 'A・B', 'sans repère : texte inchangé');
});

test('pluriels : samogitien (2), letton, islandais, macédonien (21) au bon nombre', () => {
  const bad = [];
  A.setLang('sgs');
  // Règles du lituanien imposées (PLURAL_LOCALE_FORCE) : 2 = « few ».
  if(A.statsLabel(2, 'stats.days') !== 'dienos') bad.push('sgs 2 jours : ' + A.statsLabel(2, 'stats.days'));
  if(!/^2 numatomos įkrovimo pertraukos/.test(A.chargeStopsText(false, 2, 30))) bad.push('sgs 2 pauses : ' + A.chargeStopsText(false, 2, 30));
  if(!/^21 įkrovimo pertrauka /.test(A.chargeStopsText(true, 21, 30, 'X'))) bad.push('sgs 21 pauses réelles : ' + A.chargeStopsText(true, 21, 30, 'X'));
  const want21 = { lv: ['21 aptuvena uzlādes pauze', null], ltg: ['21 aptuvena uzlādes pauze', '21 uzlādes pauze '],
    is: ['21 áætluð hleðslupása', '21 hleðslupása '], mk: ['21 проценета пауза', '21 пауза за полнење'] };
  for(const [l, [text, real]] of Object.entries(want21)){
    A.setLang(l);
    const s = A.chargeStopsText(false, 21, 30), r = A.chargeStopsText(true, 21, 30, 'X');
    if(s.indexOf(text) !== 0) bad.push(l + ' 21 : « ' + s + ' »');
    if(real && r.indexOf(real) !== 0) bad.push(l + ' 21 réel : « ' + r + ' »');
    // 5 (ou 11 en letton, catégorie « zero ») : pluriel inchangé.
    const five = A.chargeStopsText(false, l === 'lv' || l === 'ltg' ? 11 : 5, 30);
    if(five !== W.I18N.t('charge.textN', { n: A.formatNum(l === 'lv' || l === 'ltg' ? 11 : 5), min: '30' })) bad.push(l + ' pluriel : « ' + five + ' »');
  }
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

test('chiffres de la langue : aucun chiffre latin écrit en dur quand formatNum en produit d\'autres', () => {
  const bad = [];
  let checked = 0;
  for(const l of W.I18N.SUPPORTED){
    A.setLang(l);
    const one = A.formatNum(1);
    if(one === '1') continue;
    checked++;
    for(const [key, vars] of [['form.dates.oneDay'], ['form.dates.duration1', { days: A.formatNum(2), nights: one }], ['charge.text1', { min: A.formatNum(30) }],
      ['charge.real1', { min: A.formatNum(30), places: 'X' }], ['reveal.poi1'], ['error.minDistanceContextDay'], ['error.minDistanceContextNight'],
      ['form.budget.moyenDesc'], ['lodging.moyen']]){
      const s = W.I18N.t(key, vars);
      // Seule exception : un nombre à l'intérieur d'un texte en écriture latine (« otel 2-3★ » en touroyo, écrit en latin).
      if(/[0-9]/.test(s.replace(/[A-Za-zÀ-ɏ][  ]?[0-9][0-9–-]*/g, ''))) bad.push(l + ' ' + key + ' : « ' + s + ' »');
    }
    // Adresse, normes et textes latins intacts.
    if(W.I18N.t('footer.translationDisclaimer').indexOf('lume419') < 0) bad.push(l + ' : adresse de contact modifiée');
    if(W.I18N.tl('pack.voitureElectrique').some(x => /Type [^2]/.test(x))) bad.push(l + ' : « Type 2 » modifié');
  }
  A.setLang('fr');
  assert.ok(checked >= 8, 'langues à chiffres propres : ' + checked);
  assert.deepEqual(bad, []);
});

// ---- Kilomètres / miles (13e audit du 19/09/2026) ----
test('unité selon la langue choisie : miles pour les langues du Royaume-Uni et des États-Unis, km ailleurs', () => {
  for(const l of ['en', 'cy', 'gd', 'sco', 'kw', 'haw']) assert.equal(A.unitForLang(l), 'mi', l);
  for(const l of ['fr', 'de', 'es', 'ga', 'gv', 'nrf-je', 'nrf-gg', 'ar', 'ja', 'pt', 'ch']) assert.equal(A.unitForLang(l), 'km', l);
  // distanceUnit() suit la langue d'interface, sans aucun réglage.
  A.setLang('en'); assert.equal(A.distanceUnit(), 'mi');
  A.setLang('fr'); assert.equal(A.distanceUnit(), 'km');
});

test('conversions km ↔ mi exactes (1 mi = 1,609344 km)', () => {
  assert.equal(A.distanceUnitToKm(100, 'mi'), 160.9);
  assert.equal(A.distanceUnitToKm(305, 'km'), 305, 'en km : valeur saisie envoyée telle quelle');
  // Formulaire : 100 mi saisis -> 160,9 km envoyés au serveur.
  A.setFieldUnit('mi');
  assert.equal(A.distanceFieldKm({ value: '100' }), 160.9);
  assert.equal(A.distanceFieldKm({ value: '' }), null);
  // Valeur convertie par le site (300 km -> 186.4 mi, au dixième depuis le 14e audit) : la valeur exacte en km est
  // renvoyée tant qu'elle n'est pas retouchée.
  const input = { value: '300' };
  A.setDistanceFieldKm(input, 300, 'mi');
  assert.equal(input.value, '186.4');
  assert.equal(A.distanceFieldKm(input), 300);
  input.value = '100';
  assert.equal(A.distanceFieldKm(input), 160.9);
  A.setFieldUnit('km');
  assert.equal(A.distanceFieldKm({ value: '305' }), 305);
  // Bornes des champs arrondies au dixième vers l'extérieur (14e audit : voir le test des bornes), pas de 10 km -> 5 mi,
  // valeur par défaut arrondie au pas (300 km -> 185 mi).
  assert.deepEqual(JSON.parse(JSON.stringify(A.unitFieldBounds({ value: 300, min: 20, max: 1200, step: 10 }, 'mi'))), { value: 185, min: 12.4, max: 745.7, step: 5 });
  assert.deepEqual(JSON.parse(JSON.stringify(A.unitFieldBounds({ min: 10, max: 3000, step: 10 }, 'mi'))), { value: null, min: 6.2, max: 1864.2, step: 5 });
  // Affichage : 160,9 km -> 100 mi ; arrondi à l'entier comme les km.
  A.setLang('en');
  A.setUnit('mi');
  assert.equal(A.formatDistance(160.9), '100 mi');
  assert.equal(A.formatDistance(80), '50 mi');
  assert.equal(A.formatDistance(400), '249 mi');
  A.setUnit('km');
  assert.equal(A.formatDistance(160.9), '161 km');
  assert.equal(A.formatDistance(12.46, 1), '12.5 km');
  A.setUnit(null);
  A.setLang('fr');
  // Le formulaire envoie des kilomètres : distances lues par distanceFieldKm, jamais la valeur brute du champ.
  assert.match(APP, /var minDistanceKm = distanceFieldKm\(els\.minDistance\) \|\| 0;/);
  assert.match(APP, /var maxDistanceKm = distanceFieldKm\(els\.maxDistance\) \|\| 0;/);
  assert.match(APP, /var maxLegKm = distanceFieldKm\(els\.legDistance\) \|\| defaultLegKm\(\);/);
  assert.match(APP, /if\(radiusMode === 'km'\) return distanceFieldKm\(els\.radius\)/);
});

test('miles au bon nombre dans les langues où le mot s\'accorde (arabe, ukrainien, macédonien)', () => {
  A.setUnit('mi');
  const want = { ar: [[2 * 1.609344, 'ميلان'], [5 * 1.609344, 'أميال'], [21 * 1.609344, 'ميلًا']], uk: [[1.609344, 'миля'], [3 * 1.609344, 'милі'], [5 * 1.609344, 'миль']],
    mk: [[21 * 1.609344, 'милја'], [5 * 1.609344, 'милји']] };
  const bad = [];
  for(const [l, rows] of Object.entries(want)){
    A.setLang(l);
    for(const [km, word] of rows){ const s = A.formatDistance(km); if(s.indexOf(word) < 0) bad.push(l + ' : « ' + s + ' » (attendu « ' + word + ' »)'); }
  }
  A.setUnit(null);
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

// Voyage fictif : 3 nuits au même endroit, une étape avec traversée, recharge sans borne à l'arrivée, randonnée, retour.
function fakeTrip(transportKey){
  const hike = { hikeName: 'Tour du lac', hikeUrl: 'https://www.visorando.com/randonnee-x/', hikeDistance: '12,5 km', hikeDuration: '3h15', hikeSource: 'Visorando' };
  const legs = [
    leg('Annecy', { country: 'FR', distanceKm: 160.9, travelMin: 120, travelTime: '2h', labelKind: 'day', dayNum: 1, activities: [hike],
      overMaxLeg: { max: 80, min: 150 }, chargeInfo: { stops: 1, minutes: 30, noChargerNearArrival: true } }),
    leg('Bastia', { lat: 42.7, country: 'FR', distanceKm: 180, roadKm: 42, roadMin: 40, travelMin: 360, travelTime: '6h', labelKind: 'day', dayNum: 2,
      ferryInfo: { routeKey: 'ferry.route.corsica', amount: 120, durationH: 6, priceCovers: 'vehicleAndOccupants' } }),
    leg('Bastia', { lat: 42.7, country: 'FR', distanceKm: null, travelMin: null, labelKind: 'day', dayNum: 3 }),
    leg('Bastia', { lat: 42.7, country: 'FR', distanceKm: null, travelMin: null, labelKind: 'day', dayNum: 4 }),
    leg('Lyon', { lat: 45.76, country: 'FR', distanceKm: 300, travelMin: 200, travelTime: '3h20', isReturn: true, labelKind: 'dayReturn', dayNum: 5 })
  ];
  return { legs, city: 'Lyon', budgetKey: 'moyen', transportKey, cityCoord: { lat: 45.76, lon: 4.84, country: 'CH' }, days: 5, notices: [],
    departureTension: null, startIso: '2026-09-20', endIso: '2026-09-24' };
}
function payloadTexts(p){
  const out = [];
  const walk = v => { if(typeof v === 'string') out.push(v); else if(Array.isArray(v)) v.forEach(walk); else if(v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(p.texts); p.legs.forEach(l => { walk(l.texts); walk(l.activities.map(a => a.typeLabel)); });
  return out;
}

test('PDF : numéro du jour sur chaque étape d\'un séjour, retour « ⟲ », transportKey et distanceUnit', () => {
  for(const [l, want] of [['fr', ['1', '2', '3', '4', '⟲']], ['ar', ['١', '٢', '٣', '٤', '⟲']], ['mr', ['१', '२', '३', '४', '⟲']]]){
    A.setLang(l);
    A.setTrip(fakeTrip('voiture-thermique'));
    const p = A.buildTripExportPayload();
    assert.deepEqual(p.legs.map(x => x.badge), want, l);
    assert.equal(p.transportKey, 'voiture-thermique');
    assert.equal(p.distanceUnit, 'km');
  }
  // L'écran garde la plage du séjour.
  A.setLang('fr');
  assert.deepEqual(Array.from(A.groupLegsByStay(fakeTrip('velo').legs), g => A.dayBadgeText(g)), ['1', '2–4', '⟲']);
  A.setTrip(null);
});

test('PDF : aucun rappel de vignette à vélo (ni texte générique, ni par étape)', () => {
  A.setLang('fr');
  A.setTrip(fakeTrip('velo'));
  let p = A.buildTripExportPayload();
  assert.equal(p.texts.vignette, undefined, 'texts.vignette envoyé à vélo');
  assert.ok(p.legs.every(l => !l.texts.vignettes), 'rappel par étape à vélo');
  assert.equal(p.transportKey, 'velo');
  A.setTrip(fakeTrip('voiture-thermique'));
  p = A.buildTripExportPayload();
  assert.ok(p.texts.vignette && /vignette/i.test(p.texts.vignette), 'texte générique en voiture');
  assert.ok(p.legs[0].texts.vignettes && p.legs[0].texts.vignettes[0].country === 'CH', 'rappel nommé (pays de départ) en voiture');
  A.setTrip(null);
});

test('miles : aucun « km » affiché (écran, formulaire, PDF), dans plusieurs langues', () => {
  const bad = [];
  for(const l of W.I18N.SUPPORTED){
    A.setLang(l);
    A.setUnit('mi');
    const kmTok = W.I18N.t('unit.km'), miTok = W.I18N.t('unit.mi');
    const esc = kmTok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = /[㐀-鿿]/.test(kmTok) ? new RegExp(esc) : new RegExp('(^|[^\\p{L}\\p{M}])' + esc + '(?![\\p{L}\\p{M}])', 'u');
    A.setTrip(fakeTrip('voiture-electrique'));
    const p = A.buildTripExportPayload();
    assert.equal(p.distanceUnit, 'mi');
    const shown = payloadTexts(p)
      .concat(A.tripStatsParts(fakeTrip('voiture-electrique')).map(x => x.value + ' ' + x.label + ' ' + (x.extra || '')))
      .concat(['form.radius.modeKm', 'form.radius.unitKm', 'form.minDistance.unitMin', 'form.minDistance.unitMax', 'form.legDistance.unit']
        .map(k => W.I18N.t(k, A.distanceUnitVars())))
      .concat([W.I18N.t('form.legDistance.hint', { bike: A.formatDistance(80), other: A.formatDistance(400) }),
        W.I18N.t('error.minMaxDistance', { min: A.formatDistance(321.9, 1), max: A.formatDistance(160.9, 1) }),
        W.I18N.t('error.minDistanceTooFar', { context: W.I18N.t('error.minDistanceContextDay'), min: A.formatDistance(321.9, 1), radius: A.formatDistance(300) }),
        W.I18N.t('error.minDistanceNotFound', { min: A.formatDistance(321.9, 1) }), A.noChargerText(), A.hikeDistanceText('12,5 km')]);
    for(const s of shown){
      if(re.test(s)) bad.push(l + ' : « ' + s + ' »');
      // {date} et {sources} du pied de page du PDF sont remplis par le serveur.
      if(/\{(?!date\}|sources\})\w+\}/.test(s)) bad.push(l + ' : paramètre non remplacé « ' + s + ' »');
    }
    const all = shown.join(' | ');
    if(all.indexOf(miTok) < 0 && !W.I18N.plural('unit.miN', 100)) bad.push(l + ' : unité « ' + miTok + ' » jamais affichée');
    // Étapes : la route (100 mi = 160,9 km) et la randonnée (12,5 km = 7,8 mi) dans l'unité et la langue d'affichage.
    if(p.legs[0].texts.route.indexOf(A.formatDistanceValue(100, 'mi')) < 0) bad.push(l + ' route : « ' + p.legs[0].texts.route + ' »');
    if(p.legs[0].activities[0].typeLabel.indexOf(A.formatDistanceValue(7.8, 'mi', 1)) < 0) bad.push(l + ' rando : « ' + p.legs[0].activities[0].typeLabel + ' »');
  }
  A.setUnit(null);
  A.setTrip(null);
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

test('montant seul : même marque d\'approximation que les fourchettes (« ≈ » en japonais)', () => {
  A.setLang('ja');
  assert.ok(/^≈/.test(A.approxMoney(87, 'EUR')), A.approxMoney(87, 'EUR'));
  A.setLang('fr');
  assert.ok(/^~/.test(A.approxMoney(87, 'EUR')), A.approxMoney(87, 'EUR'));
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

// ---- 14e audit du 19/09/2026 : champs de distance en miles, randonnées, replis de locale, duel arabe ----
// Champs remis à zéro dans l'unité donnée (bornes appliquées comme au chargement de la page).
function resetFields(unit){
  A.setFieldUnit('km');
  const all = A.DISTANCE_KM_FIELDS.concat([Object.assign({ el: A.els.radius }, A.RADIUS_KM_FIELD)]);
  for(const f of all){
    f.el.value = ''; f.el.__km = null; f.el.__shown = null; f.el.__defaultKm = null;
    A.applyFieldBounds(f.el, A.unitFieldBounds(f, 'km'));
  }
  if(unit === 'mi') A.convertDistanceFields('mi');
  return all;
}
const typeIn = (input, text) => { input.value = String(text); };
const tenth = v => Math.round(v * 10) / 10;

test('miles : une valeur valide en km le reste en miles, et inversement (bornes de tous les champs de distance)', () => {
  const bad = [];
  const fields = resetFields('km');
  const names = ['distance min', 'distance max', 'étape', 'rayon'];
  fields.forEach((f, i) => {
    const name = names[i];
    // km -> mi : bornes du moteur et valeurs voisines (au dixième), saisies en km puis converties.
    const kmValues = [];
    for(let v = f.min; v <= f.min + 30; v = tenth(v + 0.1)) kmValues.push(v);
    for(let v = f.max - 30; v <= f.max; v = tenth(v + 0.1)) kmValues.push(v);
    for(let v = f.min; v <= f.max; v += 7) kmValues.push(v);
    for(const km of kmValues){
      resetFields('km');
      typeIn(f.el, km);
      if(A.checkNumberRange(f.el, true)) bad.push(name + ' ' + km + ' km refusé en km');
      A.convertDistanceFields('mi');
      if(A.checkNumberRange(f.el, true)) bad.push(name + ' ' + km + ' km -> « ' + f.el.value + ' » mi refusé (bornes ' + f.el.min + '–' + f.el.max + ')');
      if(A.distanceFieldKm(f.el) !== km) bad.push(name + ' ' + km + ' km -> ' + A.distanceFieldKm(f.el) + ' km envoyés');
    }
    // mi -> km : bornes affichées en miles et valeurs voisines, saisies en miles puis converties.
    resetFields('mi');
    const lo = parseFloat(f.el.min), hi = parseFloat(f.el.max);
    const miValues = [];
    for(let v = lo; v <= lo + 20; v = tenth(v + 0.1)) miValues.push(v);
    for(let v = tenth(hi - 20); v <= hi; v = tenth(v + 0.1)) miValues.push(v);
    for(const mi of miValues){
      resetFields('mi');
      typeIn(f.el, mi);
      if(A.checkNumberRange(f.el, true)){ bad.push(name + ' ' + mi + ' mi refusé en miles'); continue; }
      const km = A.distanceFieldKm(f.el);
      if(!(km >= f.min && km <= f.max)) bad.push(name + ' ' + mi + ' mi -> ' + km + ' km hors des bornes du moteur');
      A.convertDistanceFields('km');
      if(A.checkNumberRange(f.el, true)) bad.push(name + ' ' + mi + ' mi -> « ' + f.el.value + ' » km refusé');
    }
    // Hors bornes : refusé dans les deux unités.
    resetFields('mi');
    if(lo > 0){ typeIn(f.el, tenth(lo - 0.1)); if(!A.checkNumberRange(f.el, true)) bad.push(name + ' : ' + f.el.value + ' mi accepté'); }
    typeIn(f.el, tenth(hi + 0.1));
    if(!A.checkNumberRange(f.el, true)) bad.push(name + ' : ' + f.el.value + ' mi accepté');
    resetFields('km');
    typeIn(f.el, f.max + 0.1);
    if(!A.checkNumberRange(f.el, true)) bad.push(name + ' : ' + f.el.value + ' km accepté');
  });
  // Cas de l'audit : 20 km -> 12.4 mi, accepté (le minimum affiché était 13 mi et la valeur 12 : tirage refusé).
  resetFields('km'); typeIn(A.els.radius, 20); A.convertDistanceFields('mi');
  assert.equal(A.els.radius.value, '12.4');
  assert.equal(A.els.radius.min, 12.4);
  assert.equal(A.checkNumberRange(A.els.radius, false), null);
  resetFields('km');
  assert.deepEqual(bad.slice(0, 20), []);
});

test('miles : valeur affichée = valeur envoyée = valeur des messages, aller-retours de langue avec des valeurs non entières', () => {
  A.setLang('en');
  A.setUnit('mi');
  const bad = [];
  const shownKm = input => A.formatDistance(A.distanceFieldKm(input), 1);
  const shownField = (input, unit) => A.formatDistanceValue(parseFloat(input.value), unit, 1);
  // Saisie en km (non entière), passage en miles, retour en km : la saisie revient telle quelle.
  for(const km of [12.5, 305, 20.3, 0.5, 99.9, 1199.9, 2999.9, 186.4]){
    resetFields('km');
    typeIn(A.els.maxDistance, km);
    A.convertDistanceFields('mi');
    // Le message cite la distance envoyée au dixième, comme le champ l'affiche (« 189.5 mi » ; le champ disait « 190 »).
    if(shownKm(A.els.maxDistance) !== shownField(A.els.maxDistance, 'mi')) bad.push(km + ' km : champ « ' + A.els.maxDistance.value + ' », message « ' + shownKm(A.els.maxDistance) + ' »');
    if(A.distanceFieldKm(A.els.maxDistance) !== km) bad.push(km + ' km envoyé ' + A.distanceFieldKm(A.els.maxDistance));
    A.convertDistanceFields('km');
    if(A.els.maxDistance.value !== String(km)) bad.push(km + ' km -> mi -> km : « ' + A.els.maxDistance.value + ' »');
  }
  // Saisie en miles, passage en km puis retour : même texte, et la valeur envoyée ne change pas.
  for(const mi of [7.8, 7.5, 189.5, 100, 12.4, 0.3, 1864.1]){
    resetFields('mi');
    typeIn(A.els.minDistance, mi);
    const km = A.distanceFieldKm(A.els.minDistance);
    if(shownKm(A.els.minDistance) !== shownField(A.els.minDistance, 'mi')) bad.push(mi + ' mi : message « ' + shownKm(A.els.minDistance) + ' »');
    A.convertDistanceFields('km');
    if(A.distanceFieldKm(A.els.minDistance) !== km) bad.push(mi + ' mi : ' + km + ' km puis ' + A.distanceFieldKm(A.els.minDistance));
    A.convertDistanceFields('mi');
    if(A.els.minDistance.value !== String(mi)) bad.push(mi + ' mi -> km -> mi : « ' + A.els.minDistance.value + ' »');
  }
  // Cas de l'audit : 12,5 km affiché « 7.8 » (et non « 8 », puis « 13 » au retour en km).
  resetFields('km'); typeIn(A.els.legDistance, 12.5); A.convertDistanceFields('mi');
  assert.equal(A.els.legDistance.value, '7.8');
  A.convertDistanceFields('km');
  assert.equal(A.els.legDistance.value, '12.5');
  resetFields('km');
  A.setUnit(null);
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

test('message de bornes : avec l\'unité pour les champs de distance, dans les 161 langues', () => {
  const bad = [];
  for(const l of W.I18N.SUPPORTED){
    A.setLang(l);
    for(const unit of ['km', 'mi']){
      if(unit === 'mi' && A.unitForLang(l) !== 'mi') continue; // les miles ne s'affichent que dans les langues en miles
      resetFields(unit);
      typeIn(A.els.radius, 1);
      const p = A.checkNumberRange(A.els.radius, false);
      const s = p && p.message();
      const min = A.formatDistanceValue(parseFloat(A.els.radius.min), unit, 1), max = A.formatDistanceValue(parseFloat(A.els.radius.max), unit, 1);
      if(!s || s.indexOf(min) < 0 || s.indexOf(max) < 0) bad.push(l + ' : « ' + s + ' » (attendu ' + min + ' / ' + max + ')');
      if(s && (/\{\w+\}/.test(s) || /\.\./.test(s))) bad.push(l + ' : « ' + s + ' »');
    }
  }
  // Champ sans unité (jours par ville) : nombres seuls.
  A.setLang('fr');
  const days = { value: '30', min: '1', max: '20' };
  assert.equal(A.checkNumberRange(days, true).message(), W.I18N.t('form.error.range', { min: '1', max: '20' }));
  A.setLang('en');
  resetFields('mi'); typeIn(A.els.radius, 5);
  assert.equal(A.checkNumberRange(A.els.radius, false).message(), 'Enter a value between 12.4 mi and 745.7 mi.');
  resetFields('km');
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

test('valeurs restaurées par le navigateur : autocomplete="off" et champs remis à leurs valeurs en km avant la conversion', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  for(const id of ['radius', 'min-distance', 'max-distance', 'leg-distance']){
    const m = html.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>'));
    assert.ok(m && /autocomplete="off"/.test(m[0]), id + ' : autocomplete="off" absent');
  }
  const reset = APP.indexOf("DISTANCE_KM_FIELDS.forEach(function(f){ f.el.value = '';");
  const radius = APP.indexOf('setDefaultDistanceField(els.radius, RADIUS_KM_FIELD.value, fieldDistanceUnit);', reset);
  const sync = APP.indexOf('\n  syncDistanceUnit();');
  assert.ok(reset > 0 && radius > reset && sync > radius, 'remise à zéro des champs de distance avant syncDistanceUnit()');
});

test('pas de 5 mi : valeurs par défaut sur le pas, envoyées telles qu\'affichées ; boutons −/+ recalés sur la grille', () => {
  resetFields('km');
  A.setFieldUnit('mi');
  for(const [input, km, shown] of [[A.els.radius, 300, '185'], [A.els.legDistance, 400, '250'], [A.els.legDistance, 80, '50']]){
    A.setDefaultDistanceField(input, km, 'mi');
    assert.equal(input.value, shown, km + ' km');
    assert.equal(A.distanceFieldKm(input), A.distanceUnitToKm(Number(shown), 'mi'), km + ' km : valeur envoyée = valeur affichée');
  }
  // Aller-retour : valeur par défaut exacte en km tant qu'elle n'est pas retouchée.
  A.setFieldUnit('km');
  A.setDefaultDistanceField(A.els.radius, 300, 'km');
  A.setDefaultDistanceField(A.els.legDistance, 400, 'km');
  A.convertDistanceFields('mi');
  assert.equal(A.els.radius.value, '185');
  assert.equal(A.els.legDistance.value, '250');
  A.convertDistanceFields('km');
  assert.equal(A.els.radius.value, '300');
  assert.equal(A.els.legDistance.value, '400');
  // Valeur par défaut retouchée : convertie comme une saisie.
  A.convertDistanceFields('mi');
  typeIn(A.els.radius, 190);
  A.convertDistanceFields('km');
  assert.equal(A.els.radius.value, String(A.distanceUnitToKm(190, 'mi')));
  // Aide « 50 mi à vélo, 250 mi pour les autres modes » : la valeur du champ.
  assert.equal(A.defaultDistanceValue(400, 'mi'), 250);
  assert.equal(A.defaultDistanceValue(80, 'mi'), 50);
  assert.equal(A.defaultDistanceValue(400, 'km'), 400);
  // Boutons −/+ : recalés sur la grille du pas, dans les bornes.
  resetFields('mi');
  const r = A.els.radius;
  const step = (v, dir) => { r.value = String(v); A.stepNumberField(r, dir); return String(r.value); };
  assert.equal(step('186.4', 1), '190');
  assert.equal(step('186.4', -1), '185');
  assert.equal(step('185', 1), '190');
  assert.equal(step('249', 1), '250');
  assert.equal(step('12.4', -1), '12.4');
  assert.equal(step('12.4', 1), '15');
  assert.equal(step('745.7', 1), '745.7');
  assert.equal(step('745.7', -1), '745');
  resetFields('km');
  assert.equal(step('305', 1), '310');
  assert.equal(step('300', 1), '310');
  assert.equal(step('20', -1), '20');
  resetFields('km');
});

test('randonnées Visorando : durée et difficulté dans la langue d\'affichage (écran et PDF)', () => {
  // Valeurs réellement retenues par le serveur (server.js, fetchVisorandoHikes) : exactement celles associées à une clé.
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const m = server.match(/title="\((Facile\|[^)]+)\)"/);
  assert.ok(m, 'expression de la difficulté introuvable dans server.js');
  const values = m[1].split('|');
  assert.deepEqual(Object.keys(A.HIKE_DIFFICULTY_KEYS).sort(), values.slice().sort());
  const bad = [];
  for(const l of W.I18N.SUPPORTED){
    A.setLang(l);
    for(const raw of values){
      const s = A.hikeDifficultyText(raw);
      // Clé traduite (« Facile », « Difficile » s'écrivent aussi ainsi en italien) ; « Moyenne », forme française, jamais ailleurs.
      if(!s || /\{/.test(s) || s !== W.I18N.t(A.HIKE_DIFFICULTY_KEYS[raw]) || (l !== 'fr' && s === 'Moyenne')) bad.push(l + ' ' + raw + ' : « ' + s + ' »');
    }
    if(A.hikeDurationText('5h20') !== A.formatDurationMin(320)) bad.push(l + ' 5h20 : « ' + A.hikeDurationText('5h20') + ' »');
  }
  A.setLang('fr');
  assert.equal(A.hikeDurationText('45min'), A.formatDurationMin(45));
  assert.equal(A.hikeDurationText('3h'), A.formatDurationMin(180));
  assert.equal(A.hikeDurationText('5h 20'), A.formatDurationMin(320));
  assert.equal(A.hikeDurationText('2 jours'), '2 jours', 'valeur inconnue gardée telle quelle');
  assert.equal(A.hikeDifficultyText('Extrême'), 'Extrême', 'valeur inconnue gardée telle quelle');
  // PDF : ligne de la randonnée en anglais, sans mot français.
  A.setLang('en');
  const trip = fakeTrip('voiture-thermique');
  Object.assign(trip.legs[0].activities[0], { hikeDuration: '5h20', hikeDifficulty: 'Moyenne' });
  A.setTrip(trip);
  const label = A.buildTripExportPayload().legs[0].activities[0].typeLabel;
  assert.ok(label.indexOf(W.I18N.t('hike.difficulty.medium')) >= 0 && !/Moyenne/.test(label), label);
  assert.ok(label.indexOf(A.formatDurationMin(320)) >= 0, label);
  A.setTrip(null);
  A.setLang('fr');
  // Écran : même mise en forme dans la carte de la randonnée.
  assert.match(APP, /metaBits\.push\(escHtml\(hikeDurationText\(hike\.duration\)\)\)/);
  assert.match(APP, /metaBits\.push\(escHtml\(hikeDifficultyText\(hike\.difficulty\)\)\)/);
  assert.deepEqual(bad, []);
});

test('touroyo et adyguéen : dates et montants dans une locale de leur écriture, sans marque bidi', () => {
  const bad = [];
  for(const [l, script] of [['tru', /\p{Script=Latin}/u], ['ady', /\p{Script=Cyrillic}/u]]){
    A.setLang(l);
    // 15e audit du 19/09/2026 : dates en chiffres (plus de mois turcs ou russes, voir le test « touroyo et adyguéen :
    // durées et dates » plus bas) — l'écriture n'est plus contrôlée sur la plage, faute de lettres.
    const range = A.formatStayRange('2026-09-20', '2026-09-23');
    if(/[؀-ۿ]/.test(range) || (!script.test(range) && range !== '20.09–23.09')) bad.push(l + ' dates : « ' + range + ' »');
    for(const s of [A.formatMoney(12.5, 'EUR'), A.formatMoney(1234, 'EUR'), A.approxMoneyRange(5.2, 14.7, 'EUR')]){
      if(/[‎‏؜‪-‮⁦-⁩]/.test(s) || /[٠-٩]/.test(s)) bad.push(l + ' montant : ' + JSON.stringify(s));
    }
    if(/^ar/.test(W.I18N.localeTag(l))) bad.push(l + ' : locale ' + W.I18N.localeTag(l));
  }
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

test('arabe : duel sans nombre répété, signe « ٪ »', () => {
  A.setLang('ar');
  assert.ok(A.dualWithoutNumber(2) && !A.dualWithoutNumber(3));
  const dur = A.durationLabel(3, 2);
  assert.ok(/ليلتان/.test(dur) && !/٢\s*ليلتان/.test(dur), dur);
  assert.ok(!/٢\s*يومان/.test(A.durationLabel(2, 1)), A.durationLabel(2, 1));
  assert.deepEqual(JSON.parse(JSON.stringify(A.countPart(2, 'stats.cities', false))), { value: 'مدينتان', label: '', nounFirst: false });
  assert.equal(A.countPart(3, 'stats.cities', false).value, '٣');
  assert.equal(A.formatDistanceValue(2, 'mi'), 'ميلان');
  const two = A.pluralPhrase('charge.textN', 2, { n: '٢', min: '٣٠' });
  assert.ok(/^توقفا/.test(two), two);
  assert.ok(/^٥ /.test(A.pluralPhrase('charge.textN', 5, { n: '٥', min: '٣٠' })));
  const pack = W.I18N.tl('pack.voitureElectrique').join(' ');
  assert.ok(/٢٠٪/.test(pack) && !/%/.test(pack), pack);
  // Pastilles du journal de bord : jamais « ٢ مدينتان » ni « ٢ ليلتان ».
  const legs = [leg('A', { country: 'FR' }), leg('B', { lat: 46, country: 'FR' }), leg('Lyon', { lat: 47, isReturn: true, labelKind: 'dayReturn' })];
  const parts = A.tripStatsParts({ legs, days: 3, transportKey: 'voiture-thermique' });
  assert.ok(parts.every(p => !/٢\s*(مدينتان|ليلتان)/.test(p.value + ' ' + p.label)), JSON.stringify(parts));
  A.setLang('fr');
  assert.equal(A.durationLabel(3, 2), '3 jours (2 nuits)');
  assert.deepEqual(JSON.parse(JSON.stringify(A.countPart(2, 'stats.cities', false))), { value: '2', label: W.I18N.t('stats.cities'), nounFirst: false });
});

// ---- 15e audit du 19/09/2026 ----
test('miles : valeur saisie juste hors bornes en km -> jamais affichée dans les bornes et refusée quand même', () => {
  const bad = [];
  const names = ['distance min', 'distance max', 'étape', 'rayon'];
  // Cas de l'audit (19,96 et 1 200,05 km au rayon, −0,04 et 3 000,04 km aux distances, 9,97 km à l'étape) et voisins.
  const cases = [[3, 19.96], [3, 19.99], [3, 1200.05], [3, 1200.04], [0, -0.04], [1, -0.04], [1, 3000.04], [0, 3000.04], [2, 9.97], [2, 3000.04],
    [3, 5000], [3, 1], [1, 5000], [2, 2]];
  for(const [i, km] of cases){
    const f = resetFields('km')[i];
    typeIn(f.el, km);
    A.convertDistanceFields('mi');
    const shown = parseFloat(f.el.value), lo = parseFloat(f.el.min), hi = parseFloat(f.el.max);
    const inShownBounds = shown >= lo && shown <= hi;
    const problem = A.checkNumberRange(f.el, true);
    const sent = A.distanceFieldKm(f.el);
    // Affichée dans les bornes : acceptée, et la valeur envoyée tient dans celles du moteur ; sinon refusée.
    if(inShownBounds && problem) bad.push(names[i] + ' ' + km + ' km -> « ' + f.el.value + ' » mi refusé : ' + problem.message());
    if(inShownBounds && !(sent >= f.min && sent <= f.max)) bad.push(names[i] + ' ' + km + ' km -> ' + sent + ' km envoyés');
    if(!inShownBounds && !problem) bad.push(names[i] + ' ' + km + ' km -> « ' + f.el.value + ' » mi accepté hors bornes');
  }
  // Valeur valide : toujours exacte au retour en km (comportement du 14e audit inchangé).
  resetFields('km'); typeIn(A.els.radius, 20); A.convertDistanceFields('mi');
  assert.equal(A.distanceFieldKm(A.els.radius), 20);
  A.convertDistanceFields('km');
  assert.equal(A.els.radius.value, '20');
  resetFields('km');
  assert.deepEqual(bad, []);
});

test('mode du rayon : recliquer le bouton déjà actif garde la saisie et l\'erreur ; changement de mode inchangé', () => {
  resetFields('km');
  assert.equal(A.radiusMode(), 'km');
  typeIn(A.els.radius, 250);
  const clears0 = A.modeClears();
  A.setMode('km');
  assert.equal(A.els.radius.value, '250', 'saisie effacée en recliquant « km »');
  assert.equal(A.modeClears(), clears0, 'erreur retirée sans changement de mode');
  A.setMode('h');
  assert.equal(A.radiusMode(), 'h');
  assert.equal(String(A.els.radius.value), '4');
  assert.equal(A.modeClears(), clears0 + 1);
  typeIn(A.els.radius, 6.5);
  A.setMode('h');
  assert.equal(A.els.radius.value, '6.5', 'saisie effacée en recliquant « h »');
  A.setMode('km');
  assert.equal(A.radiusMode(), 'km');
  assert.equal(A.els.radius.value, '300');
  assert.equal(A.distanceFieldKm(A.els.radius), 300);
  resetFields('km');
});

test('annonce de la première étape : habitants et lieux repérés au bon pluriel (ru, uk, pl, cs, lt, ro, sl, ar…)', () => {
  const said = (l, pop, poi) => { A.setLang(l); return A.revealCountTexts({ pop, featuredCount: poi }); };
  const cases = [
    ['ru', 21, 2, ['21 житель', '2 настоящие интересные точки найдены']], ['ru', 22, 5, ['22 жителя', '5 настоящих интересных точек найдено']],
    ['ru', 25, 21, ['25 жителей', '21 настоящая интересная точка найдена']],
    ['uk', 21, 3, ['21 мешканець', '3 справжні цікаві точки знайдено']], ['uk', 1, 5, ['1 мешканець', '5 справжніх цікавих точок знайдено']],
    ['be', 23, 2, ['23 жыхары', '2 сапраўдныя цікавыя пункты знойдзены']],
    ['pl', 22, 2, ['22 mieszkańcy', '2 prawdziwe ciekawe miejsca znalezione']], ['pl', 21, 5, ['21 mieszkańców', '5 prawdziwych ciekawych miejsc znalezionych']],
    ['cs', 3, 2, ['3 obyvatelé', '2 skutečná zajímavá místa nalezena']], ['sk', 4, 3, ['4 obyvatelia', '3 skutočné zaujímavé miesta nájdené']],
    ['lt', 21, 2, ['21 gyventojas', 'rastos 2 tikros lankytinos vietos']], ['lt', 12, 10, ['12 gyventojų', 'rasta 10 tikrų lankytinų vietų']],
    ['lv', 21, 21, ['21 iedzīvotājs', 'atrasta 21 reāla apskates vieta']], ['is', 21, 31, ['21 íbúi', '31 raunverulegur áhugaverður staður fundinn']],
    ['sl', 102, 2, ['102 prebivalca', '2 pravi zanimivi točki najdeni']], ['hr', 21, 3, ['21 stanovnik', '3 prave zanimljive točke pronađene']],
    ['sr', 21, 2, ['21 становник', '2 праве занимљиве тачке пронађене']], ['mk', 21, 21, ['21 жител', '21 вистинска знаменитост пронајдена']],
    ['ro', 19, 20, ['19 locuitori', '20 de puncte de interes reale reperate']], ['ro', 25, 2, ['25 de locuitori', '2 puncte de interes reale reperate']],
    ['ar', 150, 2, ['عدد السكان: ١٥٠', 'تم العثور على معلمين حقيقيين']], ['ar', 150, 3, [null, 'تم العثور على ٣ معالم حقيقية']],
    ['ar', 150, 11, [null, 'تم العثور على ١١ معلمًا حقيقيًا']], ['fr', 1234, 2, ['1 234 habitants', '2 points d\'intérêt réels repérés']],
    ['fr', 50, 1, ['50 habitants', '1 point d\'intérêt réel repéré']]
  ];
  const bad = [];
  for(const [l, pop, poi, want] of cases){
    const got = said(l, pop, poi).map(s => s.replace(/[  ]/g, ' '));
    want.forEach((w, i) => { if(w !== null && got[i] !== w) bad.push(l + ' ' + [pop, poi][i] + ' : « ' + got[i] + ' » (attendu « ' + w + ' »)'); });
  }
  // Toutes les langues aux règles CLDR complexes (duel, few, singulier après 21) : forme par nombre, tournure
  // « Libellé : {n} », ou langue dont le nom reste invariable après un nombre (liste documentée dans i18n.js).
  const INVARIANT = ['br', 'ga', 'gv', 'cy', 'kw', 'ruo', 'gag', 'crh', 'ab', 'ady', 'myv', 'mdf', 'udm', 'fil'];
  for(const l of W.I18N.SUPPORTED){
    const pr = new Intl.PluralRules(W.I18N.localeTag(l)), cats = pr.resolvedOptions().pluralCategories;
    if(!(cats.includes('few') || cats.includes('two') || pr.select(21) === 'one') || INVARIANT.includes(l)) continue;
    A.setLang(l);
    for(const key of ['reveal.inhabitants', 'reveal.poiN']){
      const exact = W.I18N.plural(key, 2) && W.I18N.plural(key, 21) && W.I18N.plural(key, 5);
      const neutral = /[:：]\s*\{n\}\s*$/.test(W.I18N.t(key));
      if(!exact && !neutral) bad.push(l + ' ' + key + ' : ni forme par nombre, ni « Libellé : {n} » (« ' + W.I18N.t(key) + ' »)');
    }
  }
  // Jamais de {paramètre} restant, dans aucune langue.
  for(const l of W.I18N.SUPPORTED){
    for(const n of [1, 2, 3, 5, 11, 21, 22, 101, 102]){
      const s = said(l, n, n).join(' | ');
      if(/\{\w+\}/.test(s)) bad.push(l + ' ' + n + ' : « ' + s + ' »');
    }
  }
  // Duel arabe : jamais « ٢ » devant le nom.
  A.setLang('ar');
  assert.ok(!/٢\s*معل/.test(A.revealCountTexts({ featuredCount: 2 })[0]));
  // Écran : la phrase passe par revealCountTexts.
  assert.match(APP, /bits\.push\.apply\(bits, revealCountTexts\(firstStop\)\);/);
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

test('touroyo et adyguéen : durées et dates sans mot turc ou russe (format neutre)', () => {
  const bad = [];
  for(const l of ['tru', 'ady']){
    A.setLang(l);
    const texts = { durée: A.formatDurationMin(166), heures: A.formatDurationMin(120), minutes: A.formatDurationMin(45), rayon: A.formatDurationMin(270, true),
      plage: A.formatStayRange('2026-09-20', '2026-09-23'), nuit: A.formatStayRange('2026-09-05', '2026-09-06'),
      horloge: A.localeDateText(new Date(2026, 8, 19), { weekday: 'long', day: 'numeric', month: 'long' }),
      généré: A.localeDateText(new Date(2026, 8, 19), { day: 'numeric', month: 'long', year: 'numeric' }),
      pdf: A.formatDateRange(new Date(2026, 8, 28), new Date(2026, 9, 2), { day: 'numeric', month: 'short', year: 'numeric' }) };
    for(const [k, s] of Object.entries(texts)){
      // Aucune lettre (ni turque, ni cyrillique) hors symboles h / min.
      if(/[A-Za-zÀ-ɏЀ-ӿ]/.test(s.replace(/\bh\b|\bmin\b/g, ''))) bad.push(l + ' ' + k + ' : « ' + s + ' »');
    }
    assert.equal(texts.durée, '2 h 46 min');
    assert.equal(texts.minutes, '45 min');
    assert.equal(texts.plage, '20.09–23.09');
    assert.equal(texts.nuit, '05.09');
    assert.equal(texts.horloge, '19.09');
    assert.equal(texts.généré, '19.09.2026');
    assert.equal(texts.pdf, '28.09.2026–02.10.2026');
  }
  // Langues de repli elles-mêmes, et langues à données Intl : noms de mois inchangés.
  A.setLang('ru'); assert.match(A.formatStayRange('2026-09-20', '2026-09-23'), /сент/); assert.ok(!A.numericDatesLang());
  A.setLang('tr'); assert.match(A.formatStayRange('2026-09-20', '2026-09-23'), /Eyl/);
  A.setLang('fr'); assert.match(A.formatStayRange('2026-09-20', '2026-09-23'), /sept/);
  assert.deepEqual(bad, []);
});

test('message « trop loin » : rayon au dixième, comme la distance minimale', () => {
  // Les deux messages error.minDistanceTooFar (rayon du formulaire, limite de retour renvoyée par le serveur).
  const calls = APP.split("msg('error.minDistanceTooFar'").slice(1).map(s => s.slice(0, 400));
  assert.equal(calls.length, 2);
  for(const c of calls){
    const m = c.match(/radius: formatDistance\(([^)]*)\)/);
    assert.ok(m && /,\s*1$/.test(m[1]), 'rayon sans décimale : ' + (m && m[0]));
  }
  A.setLang('en'); A.setUnit('mi');
  assert.equal(A.formatDistance(20, 1).replace(/ /g, ' '), '12.4 mi');
  A.setUnit(null); A.setLang('fr');
});

test('traversée ESTIMÉE (paire de ports) : « environ », tarif inconnu, à l\'écran et dans le PDF', () => {
  const fi = { routeKey: 'ferry.route.corsica', amount: null, priceStatus: 'unknown', durationEstimated: true, durationH: 4.5, priceCovers: null };
  for(const l of ['fr', 'en', 'ru', 'ar']){
    A.setLang(l);
    const s = A.ferryText(fi, W.I18N.t('ferry.route.corsica'), false, 'voiture-thermique');
    const approx = W.I18N.t('ferry.durationApprox', { duration: A.formatDurationMin(270) });
    assert.ok(s.indexOf(approx) >= 0, l + ' : « ' + s + ' » sans « ' + approx + ' »');
    assert.ok(!/[0-9٠-٩]\s*€/.test(s), l + ' : prix affiché « ' + s + ' »');
    const trip = fakeTrip('voiture-thermique');
    trip.legs[1].ferryInfo = Object.assign({}, fi);
    A.setTrip(trip);
    const p = A.buildTripExportPayload();
    const ferry = p.legs[1].texts.ferry;
    assert.ok(ferry.indexOf(approx) >= 0 && ferry.indexOf(W.I18N.t('ferry.price.unknown')) >= 0, l + ' PDF : « ' + ferry + ' »');
    assert.equal(p.legs[1].ferryInfo.durationEstimated, true);
    assert.equal(p.legs[1].ferryInfo.amount, null);
    assert.equal(p.legs[1].ferryInfo.priceStatus, 'unknown');
    assert.equal(p.legs[1].ferryInfo.durationH, 4.5);
    // Statistiques : aucune pastille de total ferry en euros (seule traversée à tarif inconnu).
    const ferryTotal = W.I18N.t('stats.ferryTotal');
    assert.ok(!A.tripStatsParts(trip).some(x => x.label === ferryTotal), l + ' : total ferry affiché pour un tarif inconnu');
    A.setTrip(null);
  }
  A.setLang('fr');
});
