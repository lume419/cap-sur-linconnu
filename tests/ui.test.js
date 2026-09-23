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
// 16e audit du 20/09/2026 :
//   - annonce du tirage aux lecteurs d'écran entièrement dans la nouvelle langue après un changement de langue ;
//   - noms de pays jamais en turc ni en russe pour le touroyo et l'adyguéen (suggestions, moto, vignette) ;
//   - plage de dates à cheval sur deux années : année écrite ; coupure réseau du tirage : message dédié ;
//   - traversée estimée : test réécrit pour pouvoir échouer (voir le commentaire devant ce test).
// 17e audit du 20/09/2026 :
//   - en-tête et nom du PDF : ORDRE VISUEL (bidi-js) de « départ → étape » avec des noms latins ET des noms arabes,
//     dans les deux sens d'écriture — isolats FSI…PDI ;
//   - noms de pays du touroyo et de l'adyguéen : le repli de leur propre écriture, jamais le nom français des données ;
//   - export refusé faute de place (413) : message dédié traduit dans les 161 langues ;
//   - corps envoyé à /api/export-pdf : plus aucun champ facultatif vide, sans rien retirer de ce qu'imprime le PDF ;
//   - tirage échoué : boutons rendus (le lancement de la roulette n'est plus hors try/catch) et annonce de l'ancien
//     voyage vidée dès le début du tirage ;
//   - sémantique ARIA du sélecteur de DEVISE (un seul motif bouton + listbox, comme celle du sélecteur de langue),
//     navigation au clavier comprise.
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
  'setMode', 'revealCountTexts', 'setRevealClue', 'numericDatesLang', 'numericDateText', 'localeDateText',
  // Annonce aux lecteurs d'écran et noms de pays (16e audit du 20/09/2026).
  'announceReveal', 'setRevealLabel', 'updateRevealTexts', 'retranslateReveal', 'escHtml', 'safeUrl', 'icon', 'tData', 'restrictionRowHtml',
  // Corps envoyé à /api/export-pdf et ses dépendances.
  'buildTripExportPayload', 'pdfLegBadges', 'transportHasToll', 'pdfLegTexts', 'legRouteText', 'legDuration', 'legMinutes', 'overMaxLegText',
  'noChargerText', 'tollText', 'tollSourceLabel', 'exportTension', 'exportLodgingLinks', 'singleLegLabel', 'formatCpBadge', 'optionLabel',
  'optionTypeLabel', 'poiTypeLabel', 'camelFromDash', 'transportLabel', 'budgetLabel', 'vignetteLabel', 'tripCurrencyNoRateText',
  'currencyLinkFallbackText', 'getPreferredCurrency', 'isKnownCurrency',
  // 17e audit du 20/09/2026 : isolats bidi de l'en-tête/nom du PDF, nom de pays commun aux quatre emplois, corps
  // d'export allégé, début et fin ratée d'un tirage.
  'isolate', 'compact', 'countryDisplayName', 'pdfFilename', 'pdfTimestamp', 'hideDisplayedTrip', 'setDrawButtonsDisabled',
  'beginDraw', 'endFailedDraw'];

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
    // Éléments de la roulette et région annoncée (16e audit du 20/09/2026) : seul leur TEXTE compte ici.
    'var fakeNode = function(){ return { textContent: "", hidden: false, classList: { add: function(){}, remove: function(){} } }; };',
    'var revealLive = fakeNode();',
    'document.getElementById = function(id){ return id === "reveal-announce" ? revealLive : null; };',
    'var ICONS = { warn: "" };',
    // Nœuds sans texte (hideDisplayedTrip ne fait que retirer des classes dessus) et boutons de tirage (17e audit).
    'var fakeBox = function(){ return { textContent: "", innerHTML: "", classList: { add: function(){}, remove: function(){} } }; };',
    'var els = { packGrid: { querySelectorAll: function(){ return []; } }, radius: fakeInput(), minDistance: fakeInput(), maxDistance: fakeInput(), legDistance: fakeInput(),',
    '  modeKm: { setAttribute: function(){} }, modeH: { setAttribute: function(){} },',
    '  rouletteLabel: fakeNode(), rouletteClue: fakeNode(), revealRegion: fakeNode(), stamp: fakeNode(),',
    '  mapCard: fakeBox(), timeline: fakeBox(), exportRow: fakeBox(), packCard: fakeBox(), againRow: fakeBox(), days: fakeBox(),',
    '  timelineStats: fakeBox(), revealReal: fakeBox(), compass: fakeBox(), rouletteName: fakeBox(),',
    '  launchBtn: { disabled: false }, againBtn: { disabled: false } };',
    // Effets de bord de setMode sans DOM : erreurs retirées comptées, étiquette d'unité ignorée.
    'var modeClears = 0; function clearRadiusError(){ modeClears++; } function clearMinDistanceError(){} function updateRadiusUnitLabel(){}',
    'var Event = function(){};',
    'var tripGeneration = 0, rouletteTimer = null;',
    ['ROUTE_MARK', 'approxMarkCache', 'KM_PER_MILE', 'MILE_COUNTRIES', 'CURRENCY_STORAGE_KEY', 'CHARGER_NEAR_STOP_KM', 'RADIUS_KM_FIELD',
      'HIKE_DIFFICULTY_KEYS', 'revealLabelKey', 'revealClueKey', 'revealInProgress', 'BIDI_FSI'].map(extractVar).join('\n'),
    APP.match(/^  var DISTANCE_KM_FIELDS = \[[\s\S]*?\n  \];/m)[0],
    FNS.map(extract).join('\n'),
    // Unité forcée par les tests (setUnit) : l'application la tire de la langue seule (unitForLang), sans réglage.
    'var UNIT_OVERRIDE = null, __distanceUnit = distanceUnit; distanceUnit = function(){ return UNIT_OVERRIDE || __distanceUnit(); };',
    'window.__app = {' + FNS.map(n => n + ': ' + n).join(', ') + ', setLang: function(l){ window.I18N.set(l); VISITOR_LANG = l; },' +
      ' setUnit: function(u){ UNIT_OVERRIDE = u; }, setFieldUnit: function(u){ fieldDistanceUnit = u; }, fieldUnit: function(){ return fieldDistanceUnit; },' +
      ' els: els, DISTANCE_KM_FIELDS: DISTANCE_KM_FIELDS, RADIUS_KM_FIELD: RADIUS_KM_FIELD, HIKE_DIFFICULTY_KEYS: HIKE_DIFFICULTY_KEYS,' +
      ' setTrip: function(trip){ currentTripData = trip; }, radiusMode: function(){ return radiusMode; }, modeClears: function(){ return modeClears; },' +
      ' announce: function(){ return revealLive.textContent; } };'
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
  // 17e audit du 20/09/2026 : chaque nom est désormais entouré d'isolats bidi (FSI … PDI), invisibles et de largeur
  // nulle — ils sont retirés ici pour comparer le texte lisible (leur rôle est vérifié par le test du 17e audit).
  const plain = s => s.replace(/[\u2068\u2069]/g, '');
  assert.match(plain(A.tripLabelText(trip)), /^Lyon → Annecy · 20.*22 sept\. 2026$/);
  assert.match(plain(A.tripLabelText(Object.assign({}, trip, { days: 1, endIso: '2026-09-20' }))), /^Lyon → Annecy · 20 sept\. 2026$/);
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

// 16e audit du 20/09/2026 : ce test ne pouvait pas échouer. La fixture portait « priceCovers: null » — jamais produit
// pour une traversée estimée — ce qui faisait basculer l'étiquette du total vers stats.ferryTotalVehicles (voir
// ferryTotalLabel) : la dernière assertion (« aucune pastille stats.ferryTotal ») ne pouvait donc jamais se déclencher.
// Et le contrôle du prix cherchait « chiffre + € », une écriture que l'anglais (« ~€55 ») ou le japonais n'emploient
// pas. Chaque texte est désormais comparé à celui que la langue doit produire, et l'absence de prix est contrôlée sur
// le montant que la langue écrirait réellement.
test('traversée ESTIMÉE (paire de ports) : « environ », tarif inconnu, à l\'écran et dans le PDF', () => {
  const fi = { routeKey: 'ferry.route.corsica', amount: null, priceStatus: 'unknown', durationEstimated: true, durationH: 4.5 };
  const MONEY_SIGNS = /[€$£¥₽₺₩﷼]/;
  for(const l of ['fr', 'en', 'ru', 'ar', 'ja']){
    A.setLang(l);
    const route = W.I18N.t('ferry.route.corsica');
    const approx = W.I18N.t('ferry.durationApprox', { duration: A.formatDurationMin(270) });
    const s = A.ferryText(fi, route, false, 'voiture-thermique');
    // Texte EXACT de la langue : durée « environ … » et pas la moindre trace de prix.
    assert.equal(s, A.withoutEmptyRoute(W.I18N.t('ferry.textNoPrice', { route: route, duration: approx })), l + ' écran');
    assert.ok(s.indexOf(approx) >= 0, l + ' : « ' + s + ' » sans « ' + approx + ' »');
    assert.ok(!MONEY_SIGNS.test(s), l + ' : symbole monétaire dans « ' + s + ' »');
    // Montant tel que CETTE langue l'écrirait (« ~55 € », « ~€55 », « ~￥55 ») : absent, où qu'il soit placé.
    assert.ok(s.indexOf(A.approxMoney(55, 'EUR')) < 0, l + ' : montant affiché « ' + s + ' »');

    const trip = fakeTrip('voiture-thermique');
    trip.legs[1].ferryInfo = Object.assign({}, fi);
    A.setTrip(trip);
    const p = A.buildTripExportPayload();
    const ferry = p.legs[1].texts.ferry;
    assert.equal(ferry, A.ferryLabel(fi) + ' — ' + s + ' ' + W.I18N.t('ferry.price.unknown'), l + ' PDF');
    assert.ok(!MONEY_SIGNS.test(ferry), l + ' PDF : symbole monétaire dans « ' + ferry + ' »');
    assert.equal(p.legs[1].ferryInfo.durationEstimated, true);
    assert.equal(p.legs[1].ferryInfo.amount, null);
    assert.equal(p.legs[1].ferryInfo.priceStatus, 'unknown');
    assert.equal(p.legs[1].ferryInfo.durationH, 4.5);
    // Statistiques : AUCUNE pastille de total en argent, quelle que soit l'étiquette choisie par ferryTotalLabel
    // (ferryTotal / ferryTotalVehicles / ferryTotalPerPerson), mais bien le décompte des traversées sans tarif.
    const parts = A.tripStatsParts(trip);
    const moneyLabels = ['stats.ferryTotal', 'stats.ferryTotalVehicles', 'stats.ferryTotalPerPerson', 'stats.trainTotal'].map(k => W.I18N.t(k));
    const money = parts.filter(x => moneyLabels.indexOf(x.label) >= 0);
    assert.equal(money.length, 0, l + ' : total en argent affiché pour un tarif inconnu : ' + JSON.stringify(parts));
    assert.ok(!parts.some(x => MONEY_SIGNS.test(x.value)), l + ' : montant dans les statistiques : ' + JSON.stringify(parts));
    const unpriced = A.statsLabel(1, 'stats.ferryUnpriced');
    assert.ok(parts.some(x => x.label === unpriced || x.value === unpriced), l + ' : traversée sans tarif non comptée : ' + JSON.stringify(parts));
    A.setTrip(null);
  }
  A.setLang('fr');
});

// --------------------------------------------------------------------------------------------- 16e audit du 20/09/2026

test('16e audit : annonce du tirage aux lecteurs d\'écran entièrement dans la NOUVELLE langue', () => {
  // L'écouteur 'i18n:langchange' appelle retranslateReveal AVANT rerenderCurrentTrip : l'annonce était reconstruite à
  // partir du texte encore affiché dans l'ANCIENNE langue, avec un préfixe déjà traduit — deux langues mêlées.
  const firstStop = { name: 'Lyon', cp: '69001', pop: 21, featuredCount: 2 };
  A.setTrip({ firstStop: firstStop, legs: [], transportKey: 'voiture-thermique' });
  const bad = [];
  for(const l of ['ru', 'ja', 'ar', 'lt', 'tru']){
    // État après un tirage fait en français : la région affichée est en français.
    A.setLang('fr');
    A.updateRevealTexts(firstStop);
    A.announceReveal(W.I18N.t('reveal.confirmed') + ' — ' + A.els.revealRegion.textContent);
    const frRegion = A.els.revealRegion.textContent;
    const frCounts = A.revealCountTexts(firstStop);
    // Changement de langue.
    A.setLang(l);
    A.retranslateReveal();
    const expected = W.I18N.t('reveal.confirmed') + ' — ' +
      [firstStop.name + ' (' + A.formatCpBadge(firstStop) + ')'].concat(A.revealCountTexts(firstStop)).join(' · ');
    const got = A.announce();
    if(got !== expected) bad.push(l + ' : « ' + got + ' » au lieu de « ' + expected + ' »');
    // Aucun reste du français dans l'annonce (ni dans la région affichée).
    frCounts.forEach(function(txt){
      if(got.indexOf(txt) >= 0) bad.push(l + ' : morceau français « ' + txt + ' » dans « ' + got + ' »');
    });
    if(A.els.revealRegion.textContent === frRegion && l !== 'fr') bad.push(l + ' : région affichée restée en français');
  }
  A.setTrip(null);
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

// Le test « noms de pays jamais en turc ni en russe pour le touroyo et l'adyguéen » de la 16e passe est REMPLACÉ par
// celui du 17e audit plus bas : il exigeait le nom FRANÇAIS des données (« Suisse », « France ») dans ces deux
// interfaces, ce qui était pire que le repli — le russe et le turc sont leurs langues de contact, dans leur propre
// écriture. Le nouveau test vérifie le repli aux quatre emplacements et garde les mêmes témoins (en, ru).

test('16e audit : plage de dates à cheval sur deux années (touroyo, adyguéen) — année écrite', () => {
  const bad = [];
  for(const l of ['tru', 'ady']){
    A.setLang(l);
    const across = A.formatStayRange('2026-12-31', '2027-01-02');
    if(across !== '31.12.2026–02.01.2027') bad.push(l + ' : « ' + across + ' » au lieu de « 31.12.2026–02.01.2027 »');
    // Même année : l'année reste omise (inchangé depuis la 15e passe).
    const same = A.formatStayRange('2026-09-20', '2026-09-23');
    if(same !== '20.09–23.09') bad.push(l + ' : « ' + same + ' » au lieu de « 20.09–23.09 »');
    // Année demandée par l'appelant (en-tête du PDF) : toujours écrite.
    const pdf = A.formatDateRange(new Date(2026, 8, 28), new Date(2026, 9, 2), { day: 'numeric', month: 'short', year: 'numeric' });
    if(pdf !== '28.09.2026–02.10.2026') bad.push(l + ' PDF : « ' + pdf + ' »');
    // Aucune lettre d'une langue tierce.
    if(/[A-Za-zÀ-ɏЀ-ӿ]/.test(across)) bad.push(l + ' : lettre dans « ' + across + ' »');
  }
  // Langues à données Intl : Intl écrit déjà les deux années lui-même.
  A.setLang('fr');
  assert.match(A.formatStayRange('2026-12-31', '2027-01-02'), /2026[\s\S]*2027/);
  assert.deepEqual(bad, []);
});

test('16e audit : coupure réseau du tirage — message dédié, jamais « élargissez le rayon »', () => {
  // fetch ne rejette que sur un échec RÉSEAU (serveur injoignable, connexion perdue) ou un abandon volontaire : le
  // tirage n'a alors pas eu lieu, et « réessayez, ou élargissez le rayon » envoyait sur une fausse piste.
  const i = APP.indexOf("await fetch('/api/generate-trip'");
  assert.ok(i > 0, 'appel de /api/generate-trip introuvable dans app.js');
  const m = APP.slice(i).match(/\n\s*\}\s*catch\s*\(err\)\s*\{([\s\S]*?)\n\s*\}\s*finally\s*\{/);
  assert.ok(m, 'bloc catch du tirage introuvable');
  const body = m[1].split('\n').filter(x => !/^\s*\/\//.test(x)).join('\n'); // commentaires retirés
  assert.ok(body.includes('error.network'), 'message de coupure réseau absent du catch : ' + body);
  assert.ok(!body.includes('error.routeImpossible'), 'error.routeImpossible encore affiché sur un échec réseau : ' + body);
  assert.ok(body.includes('error.drawTimeout'), 'abandon volontaire (AbortError) : message de délai attendu');
  // Message réellement traduit et distinct, dans toutes les langues (voir aussi tests/i18n.test.js).
  const bad = [];
  for(const l of Array.from(W.I18N.SUPPORTED)){
    A.setLang(l);
    const s = A.msg('error.network')();
    if(!s || s === 'error.network') bad.push(l + ' : non traduit');
    else if(s === A.msg('error.routeImpossible')()) bad.push(l + ' : identique à error.routeImpossible');
  }
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

// --------------------------------------------------------------------------------------------- 17e audit du 20/09/2026

// Sens de lecture de la flèche « départ → étape » : c'est l'ORDRE VISUEL rendu par l'algorithme bidirectionnel
// (bidi-js, la bibliothèque même dont se sert le PDF, voir lib/pdf-text.js) qui est vérifié ici, pas la chaîne logique.
const bidi = require('bidi-js')();
function visual(s, dir){ return bidi.getReorderedString(s, bidi.getEmbeddingLevels(s, dir)); }
// « le départ est-il bien à l'origine de la flèche ? » : dans l'ordre visuel, en écriture de droite à gauche le départ
// est à DROITE de « ← » (donc après lui dans la chaîne visuelle), sinon à gauche de « → ».
function arrowReadsForward(label, city, stop, rtl){
  const dir = rtl ? 'rtl' : 'ltr';
  const v = visual(label, dir);
  const i = v.indexOf(visual(city, dir)), j = v.indexOf(visual(stop, dir)), a = v.search(/[←→]/);
  assert.ok(i >= 0 && j >= 0 && a >= 0, 'ordre visuel illisible : ' + JSON.stringify(v));
  return rtl ? (j < a && a < i) : (i < a && a < j);
}
test('17e audit : en-tête du PDF — la flèche pointe du départ vers l\'étape, noms latins ET noms arabes', () => {
  // Sans isolat, « Lyon ← Moffans » (noms LATINS, le cas courant) forme une seule séquence de gauche à droite en
  // arabe : la flèche désignait le DÉPART. Symétriquement « ليون → موفان » se lisait à rebours en français.
  const NAMES = [['Lyon', 'Moffans'], ['ليون', 'موفان'], ['Lyon', 'موفان']];
  const bad = [];
  for(const l of ['fr', 'ja', ...RTL]){
    A.setLang(l);
    const rtl = RTL.includes(l);
    for(const [city, stop] of NAMES){
      const label = A.tripLabelText({ city: city, legs: [{ stop: stop }], days: 3, startIso: '2026-09-20', endIso: '2026-09-22' });
      // Chaque nom est isolé (FSI … PDI) : c'est ce qui rend la flèche indépendante de l'écriture des noms.
      if(label.indexOf('\u2068' + city + '\u2069') < 0 || label.indexOf('\u2068' + stop + '\u2069') < 0) bad.push(l + ' : nom non isolé dans ' + JSON.stringify(label));
      if(!arrowReadsForward(label, city, stop, rtl)) bad.push(l + ' « ' + city + ' vers ' + stop + ' » : flèche à rebours, ordre visuel ' + JSON.stringify(visual(label, rtl ? 'rtl' : 'ltr')));
      // Une seule flèche, dans le sens de l'écriture de l'interface.
      const [want, not] = rtl ? ['←', '→'] : ['→', '←'];
      if((label.match(new RegExp(want, 'g')) || []).length !== 1 || label.indexOf(not) >= 0) bad.push(l + ' : flèches dans ' + JSON.stringify(label));
      // Nom de fichier : toujours lu de gauche à droite, le départ doit y rester en tête dans les deux écritures.
      const file = A.pdfFilename(label);
      if(file.indexOf('←') >= 0) bad.push(l + ' nom de fichier : « ← » conservé dans « ' + file + ' »');
      if(!arrowReadsForward(file, city, stop, false)) bad.push(l + ' nom de fichier : départ pas en tête, ordre visuel ' + JSON.stringify(visual(file, 'ltr')));
      if(!/\.pdf$/.test(file)) bad.push(l + ' nom de fichier : « ' + file + ' »');
    }
  }
  A.setLang('fr');
  // Les isolats sont invisibles et de largeur nulle : le texte lisible est inchangé.
  const plain = A.tripLabelText({ city: 'Lyon', legs: [{ stop: 'Annecy' }], days: 3, startIso: '2026-09-20', endIso: '2026-09-22' })
    .replace(/[\u2068\u2069]/g, '');
  assert.match(plain, /^Lyon → Annecy · 20.*22 sept\. 2026$/);
  assert.deepEqual(bad, []);
});

test('17e audit : noms de pays du touroyo et de l\'adyguéen — le repli lisible de leur écriture, jamais le français', () => {
  // La 16e passe coupait Intl.DisplayNames pour ces deux langues et laissait le nom FRANÇAIS de COUNTRIES
  // (« Suisse », « France ») dans une interface cyrillique ou latine : un mot d'une troisième langue, moins lisible que
  // le repli (russe pour ady, turc pour tru — langue de contact DANS LA MÊME ÉCRITURE, voir LOCALE_FALLBACK).
  const bad = [];
  const restriction = { kind: 'moto', type: 'noMotorway', country: 'FR', name: 'France', source: 'https://example.test/a' };
  for(const l of ['tru', 'ady']){
    A.setLang(l);
    const tag = W.I18N.localeTag(l);
    const fallbackFr = new Intl.DisplayNames([tag], { type: 'region' }).of('FR');
    const fallbackCh = new Intl.DisplayNames([tag], { type: 'region' }).of('CH');
    // Le repli est écrit dans la même écriture que l'interface (latin pour tru, cyrillique pour ady) : c'est ce qui le
    // rend plus lisible que le nom français des données.
    const script = l === 'ady' ? /^[\p{Script=Cyrillic}\s.'-]+$/u : /^[\p{Script=Latin}\p{M}\s.'-]+$/u;
    if(!script.test(fallbackCh)) bad.push(l + ' : repli hors de l\'écriture de la langue (« ' + fallbackCh + ' »)');
    if(fallbackCh === 'Suisse' || fallbackFr === 'France') bad.push(l + ' : repli identique au français, test sans objet');
    const html = A.restrictionRowHtml(restriction);
    if(html.indexOf(fallbackFr) < 0) bad.push(l + ' moto : « ' + fallbackFr + ' » attendu dans « ' + html + ' »');
    const vign = A.vignetteLabel('CH');
    if(vign.indexOf(fallbackCh) < 0) bad.push(l + ' vignette : « ' + fallbackCh + ' » attendu dans « ' + vign + ' »');
    if(vign.indexOf('Suisse') >= 0) bad.push(l + ' vignette : nom FRANÇAIS resté dans « ' + vign + ' »');
    // Infobulle des suggestions : même nom qu'à l'écran.
    if(A.countryDisplayName('CH', 'Suisse') !== fallbackCh) bad.push(l + ' infobulle : « ' + A.countryDisplayName('CH', 'Suisse') + ' »');
    // Corps du PDF : même nom que l'avertissement moto de l'écran.
    const pdfName = A.pdfLegTexts({ stop: 'X', restrictions: [restriction] }).restrictions[0];
    if(pdfName.indexOf(fallbackFr) < 0) bad.push(l + ' PDF : « ' + fallbackFr + ' » attendu dans « ' + pdfName + ' »');
  }
  // Témoins inchangés : les langues à données Intl gardent leur nom traduit, jamais celui des données.
  A.setLang('en');
  if(A.vignetteLabel('CH').indexOf('Switzerland') < 0) bad.push('en : « Switzerland » attendu dans « ' + A.vignetteLabel('CH') + ' »');
  A.setLang('ru');
  if(A.vignetteLabel('CH').indexOf('Швейцария') < 0) bad.push('ru : « Швейцария » attendu dans « ' + A.vignetteLabel('CH') + ' »');
  if(A.restrictionRowHtml(restriction).indexOf('Франция') < 0) bad.push('ru : « Франция » attendu');
  // Pays inconnu (code vide) : le nom des données reste le repli.
  A.setLang('fr');
  if(A.countryDisplayName('', 'Suisse') !== 'Suisse') bad.push('sans code pays : repli perdu');
  assert.deepEqual(bad, []);
});

test('17e audit : export refusé faute de place (413) — message dédié, jamais « réessayez dans un instant »', () => {
  // Le catch de l'export ne distinguait que 429 et 503 : un corps refusé par le serveur (413) tombait sur export.error
  // (« réessayez dans un instant »), conseil faux puisque réessayer à l'identique redonnera 413.
  const i = APP.indexOf("fetch('/api/export-pdf'");
  assert.ok(i > 0, 'appel de /api/export-pdf introuvable dans app.js');
  const slice = APP.slice(i, i + 3000);
  const body = slice.split('\n').filter(x => !/^\s*\/\//.test(x)).join('\n');
  const line = body.match(/els\.exportHint\.textContent = [\s\S]*?;/);
  assert.ok(line, 'choix du message d\'erreur de l\'export introuvable');
  assert.ok(/status === 413/.test(line[0]), 'le code 413 n\'est pas distingué : ' + line[0]);
  assert.ok(/export\.tooLarge/.test(line[0]), 'export.tooLarge non utilisé pour le 413 : ' + line[0]);
  // Le code HTTP de la réponse est bien transmis au catch.
  assert.ok(/httpErr\.status = r\.status/.test(slice), 'le code HTTP n\'est pas transmis au catch');
  // Message traduit, distinct des autres, dans les 161 langues.
  const bad = [];
  for(const l of Array.from(W.I18N.SUPPORTED)){
    A.setLang(l);
    const s = W.I18N.t('export.tooLarge');
    if(!s || s === 'export.tooLarge') bad.push(l + ' : non traduit');
    else if(s === W.I18N.t('export.error')) bad.push(l + ' : identique à export.error');
    else if(s === W.I18N.t('error.serverBusy') || s === W.I18N.t('error.tooManyRequests')) bad.push(l + ' : identique à un autre message');
  }
  A.setLang('fr');
  assert.deepEqual(bad, []);
});

test('17e audit : corps de l\'export allégé — aucun champ facultatif vide, information du PDF intacte', () => {
  A.setLang('fr');
  A.setTrip(fakeTrip('voiture-thermique'));
  const p = A.buildTripExportPayload();
  // Aucune clé à null/undefined nulle part, SAUF ferryInfo.amount (null = « traversée réelle sans tarif publié », que
  // le serveur et le texte de secours du PDF lisent comme tel).
  const nulls = [];
  (function walk(v, path){
    if(Array.isArray(v)) return v.forEach((x, i) => walk(x, path + '[' + i + ']'));
    if(!v || typeof v !== 'object') return;
    Object.keys(v).forEach(function(k){
      if(v[k] === null || v[k] === undefined){ if(k !== 'amount') nulls.push(path + '.' + k); }
      else walk(v[k], path + '.' + k);
    });
  })(p, '');
  assert.deepEqual(nulls, [], 'champs vides encore envoyés');
  // Rien de ce qui est imprimé n'a disparu : textes, pastilles, étapes, liens.
  assert.equal(p.legs.length, 5);
  assert.ok(p.texts.vignette && p.texts.subtitle && p.texts.packTitle && p.texts.generated);
  assert.deepEqual(p.legs.map(x => x.badge), ['1', '2', '3', '4', '⟲']);
  assert.ok(p.legs[0].texts.stop && p.legs[0].label && p.legs[0].stop === 'Annecy');
  assert.ok(p.legs[0].texts.overMaxLeg && p.legs[0].overMaxLeg.max === 80);
  assert.equal(p.legs[1].ferryInfo.amount, 120);
  assert.ok(p.legs[0].activities[0].hikeUrl && p.legs[0].activities[0].sourceLabel);
  // Le serveur déduit le retour de !!leg.isReturn : la clé absente y vaut false, comme avant.
  assert.equal(p.legs[4].isReturn, true);
  assert.equal(!!p.legs[0].isReturn, false);
  // Les liens d'hébergement ne partent plus sans la plage de dates (le serveur les ignore alors, voir buildTripPdf).
  p.legs.forEach(function(l, i){ assert.ok(!l.lodgingLinks || l.checkInLabel, 'étape ' + i + ' : liens de logement sans plage de dates'); });
  A.setTrip(null);
});

test('17e audit : un tirage qui échoue rend les boutons et vide l\'annonce de l\'ancien voyage', () => {
  // (a) Tout ce qui suit la requête (prefetchLegAssets, scrollIntoView, runReveal) était hors de tout try/catch : une
  //     exception y laissait « Lancer » et « Retirer une autre destination » désactivés définitivement.
  const g = APP.indexOf('  async function generate(){');
  assert.ok(g > 0, 'generate() introuvable');
  const gen = APP.slice(g, APP.indexOf('\n  function hideDisplayedTrip(', g));
  const tail = gen.slice(gen.indexOf('} finally {'));
  const code = tail.slice(0, tail.indexOf('function showDrawnTrip(')).split('\n').filter(x => !/^\s*\/\//.test(x)).join('\n');
  assert.ok(/\n\s*try \{/.test(code), 'le lancement de la roulette est encore hors try/catch');
  assert.ok(/prefetchLegAssets/.test(code) && /runReveal\(/.test(code), 'le try ne couvre pas prefetchLegAssets/runReveal');
  const rescue = code.slice(code.lastIndexOf('} catch(err){'));
  assert.ok(/endFailedDraw\(\)/.test(rescue), 'les boutons ne sont pas rendus en cas d\'exception : ' + rescue);
  assert.ok(/showFormError/.test(rescue), 'aucun message affiché en cas d\'exception');
  // (b) L'annonce aux lecteurs d'écran est vidée dès le DÉBUT du tirage, pas seulement au début de la roulette.
  assert.ok(/beginDraw\(\);/.test(gen.slice(0, gen.indexOf("await fetch('/api/generate-trip'"))), 'beginDraw() n\'est pas appelé avant la requête');
  // Comportement : une ancienne annonce est présente, un tirage commence -> annonce vidée, boutons désactivés ; il
  // échoue -> boutons rendus, annonce toujours vide, voyage précédent oublié.
  A.setLang('fr');
  A.announceReveal('Destination confirmée — Lyon · 21 habitants');
  assert.notEqual(A.announce(), '');
  A.beginDraw();
  assert.equal(A.announce(), '', 'annonce de l\'ancien voyage gardée pendant le tirage');
  assert.equal(A.els.launchBtn.disabled, true);
  assert.equal(A.els.againBtn.disabled, true);
  A.setTrip(fakeTrip('voiture-thermique'));
  A.endFailedDraw();
  assert.equal(A.els.launchBtn.disabled, false, 'bouton « Lancer » resté désactivé');
  assert.equal(A.els.againBtn.disabled, false);
  assert.equal(A.announce(), '');
  assert.equal(A.buildTripExportPayload(), null, 'le voyage précédent est resté en mémoire');
});

// --------------------------------------------------------------------------------------------- 17e audit du 20/09/2026
// Sélecteur de DEVISE (buildCurrencySwitcher dans app.js) : même contrôle que celui posé au 17e audit sur le sélecteur
// de LANGUE (voir tests/i18n.test.js, « 17e audit : sélecteur de langue — un seul motif ARIA »). Le composant est monté
// ici dans un DOM factice minimal — assez pour rejouer le clic d'ouverture et la navigation au clavier — afin de
// vérifier que les rôles annoncés forment UN SEUL motif cohérent (bouton -> listbox) et que rien du clavier n'a bougé.
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
// Le sélecteur de devise vit dans app.js (fichier trop gros et trop dépendant du réseau pour être exécuté en entier) :
// ses fonctions sont extraites comme le reste du fichier (extract/extractVar), avec juste assez de colle pour que
// buildCurrencySwitcher tourne — le vrai i18n.js, quelques devises, aucun moteur.
function loadLangSwitcher(){
  const src = fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8');
  const dom = fakeDom();
  const root = dom.el('div');
  root.id = 'lang-switcher';
  const docHandlers = {};
  const ctx = {
    navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
    document: {
      readyState: 'complete', documentElement: dom.el('html'), querySelectorAll: () => [],
      getElementById: id => (id === 'lang-switcher' ? root : null), createElement: dom.el,
      addEventListener(t, fn){ (docHandlers[t] = docHandlers[t] || []).push(fn); }
    },
    CustomEvent: function(){}, Intl, console, setTimeout: fn => fn()
  };
  Object.defineProperty(ctx.document, 'activeElement', { get: () => dom.activeElement });
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { root, button: root.children[0], panel: root.children[1], dom,
    fireDoc: (type, ev) => (docHandlers[type] || []).forEach(fn => fn(Object.assign({ preventDefault(){}, target: dom.el('div') }, ev))) };
}

function loadCurrencySwitcher(devises){
  const src = fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8');
  const dom = fakeDom();
  const root = dom.el('div');
  root.id = 'currency-switcher';
  const docHandlers = {};
  const ctx = {
    navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
    document: {
      readyState: 'complete', documentElement: dom.el('html'), querySelectorAll: () => [],
      getElementById: id => (id === 'currency-switcher' ? root : null), createElement: dom.el,
      addEventListener(t, fn){ (docHandlers[t] = docHandlers[t] || []).push(fn); }
    },
    CustomEvent: function(){}, Intl, console, setTimeout: fn => fn()
  };
  Object.defineProperty(ctx.document, 'activeElement', { get: () => dom.activeElement });
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const glue = [
    'var t = window.I18N.t;',
    // Devises et pays réduits au nécessaire : CURRENCY_OPTIONS est normalement calculé depuis TripData (non chargé ici).
    'var CURRENCY_OPTIONS = ' + JSON.stringify(devises || ['CHF', 'EUR', 'GBP', 'JPY', 'USD']) + ';',
    'var COUNTRIES = { FR: { currency: "EUR" }, JP: { currency: "JPY" } };',
    'function updateBudgetHint(){}',
    'function rerenderCurrentTrip(){}',
    'var sessionCurrency;',
    ['CURRENCY_GLYPH', 'CURRENCY_STORAGE_KEY', 'currencySwitcherRoot', 'currencyTypeBuf'].map(extractVar).join('\n'),
    ['isKnownCurrency', 'getPreferredCurrency', 'setPreferredCurrency', 'languageCurrency', 'renderCurrencyButton',
      'closeCurrencyPanel', 'currencyOptions', 'focusCurrencyOption', 'openCurrencyPanel', 'chooseCurrency',
      'renderCurrencyList', 'buildCurrencySwitcher', 'applyCurrencyPanelTexts', 'currencyTypeAheadIndex'].map(extract).join('\n'),
    'buildCurrencySwitcher(); applyCurrencyPanelTexts();',
    'window.__cur = { chosen: function(){ return getPreferredCurrency(); } };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return { root, button: root.children[0], panel: root.children[1], dom, cur: ctx.window.__cur,
    fireDoc: (type, ev) => (docHandlers[type] || []).forEach(fn => fn(Object.assign({ preventDefault(){}, target: dom.el('div') }, ev))) };
}
test('17e audit : sélecteur de devise — un seul motif ARIA (bouton + listbox), clavier inchangé', () => {
  const { root, button, panel, dom, cur, fireDoc } = loadCurrencySwitcher();
  assert.equal(root.children.length, 2, 'bouton + panneau attendus');
  const list = panel.children[0];
  // Le bouton annonce une listbox : l'élément qu'il désigne DOIT en être une.
  assert.equal(button.getAttribute('aria-haspopup'), 'listbox');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.ok(button.getAttribute('aria-label'), 'le bouton n\'a pas de nom accessible');
  assert.equal(button.getAttribute('aria-controls'), list.id, 'le bouton ne désigne pas la liste');
  assert.equal(list.getAttribute('role'), 'listbox');
  assert.ok(list.getAttribute('aria-label'), 'la listbox n\'a pas de nom accessible');
  // Plus de rôle concurrent : le panneau n'est qu'un conteneur de mise en page (caché par CSS quand il est fermé), et
  // un aria-label sur un <div> sans rôle n'est annoncé par personne.
  assert.equal(panel.getAttribute('role'), null, 'le panneau porte encore un rôle');
  assert.equal(panel.getAttribute('aria-label'), null, 'aria-label sur le panneau sans rôle');
  // Ouverture au clic : la liste se remplit d'options, toutes enfants de la listbox.
  button.fire('click');
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.ok(panel.classList.contains('show'));
  const options = list.querySelectorAll('.currency-option');
  assert.equal(options.length, 6, options.length + ' options (« automatique » + 5 devises)');
  assert.ok(options.every(o => o.getAttribute('role') === 'option' && o.parent === list), 'options hors de la listbox');
  assert.equal(options.filter(o => o.getAttribute('aria-selected') === 'true').length, 1, 'une seule option sélectionnée attendue');
  assert.ok(options.every(o => o.getAttribute('tabindex') === '-1'), 'focus glissant : tabindex="-1" sur chaque option');
  // Clavier inchangé : le focus part sur l'option active, puis bas/haut, Fin/Début ; Échap referme et rend le focus.
  const is = (el, want, what) => assert.ok(el === want, what + ' : ' + (el && (el.className || el.tagName)));
  is(dom.activeElement, options[0], 'focus à l\'ouverture (option active = « automatique »)');
  list.fire('keydown', { key: 'ArrowDown' });
  is(dom.activeElement, options[1], 'flèche bas dans la liste');
  list.fire('keydown', { key: 'End' });
  is(dom.activeElement, options[options.length - 1], 'touche Fin');
  list.fire('keydown', { key: 'ArrowUp' });
  is(dom.activeElement, options[options.length - 2], 'flèche haut dans la liste');
  list.fire('keydown', { key: 'Home' });
  is(dom.activeElement, options[0], 'touche Début');
  fireDoc('keydown', { key: 'Escape' });
  assert.equal(button.getAttribute('aria-expanded'), 'false', 'Échap ne referme plus le panneau');
  is(dom.activeElement, button, 'Échap ne rend plus le focus au bouton');
  // Flèche bas sur le bouton fermé : ouvre la liste. Entrée sur une option : choisit la devise et referme.
  button.fire('keydown', { key: 'ArrowDown' });
  assert.equal(button.getAttribute('aria-expanded'), 'true', 'flèche bas sur le bouton n\'ouvre plus la liste');
  const opts2 = list.querySelectorAll('.currency-option');
  // Ordre de la liste : « automatique », puis la devise du pays de la langue d'interface (fr -> FR -> EUR), puis les autres.
  opts2[1].fire('keydown', { key: 'Enter' });
  assert.equal(cur.chosen(), 'EUR', 'Entrée sur une option ne choisit plus la devise');
  assert.equal(button.getAttribute('aria-expanded'), 'false', 'le panneau reste ouvert après un choix');
  // Le choix se reflète dans la liste et dans le nom accessible du bouton, sans changer les rôles.
  button.fire('click');
  const opts3 = list.querySelectorAll('.currency-option');
  assert.equal(opts3.filter(o => o.getAttribute('aria-selected') === 'true').length, 1);
  assert.ok(opts3.every(o => o.getAttribute('role') === 'option'));
  assert.equal(list.getAttribute('role'), 'listbox');
  assert.equal(panel.getAttribute('role'), null, 'le panneau a retrouvé un rôle');
  assert.ok(/EUR/.test(button.getAttribute('aria-label')), 'devise choisie absente du nom du bouton : ' + button.getAttribute('aria-label'));
});

test('20e audit : le BOUTON de devise porte aussi son sens d\'écriture (pas seulement les options)', () => {
  // Le 19e audit avait posé dir="ltr" sur les options de la liste, parce que « ARS AR$ » s'affiche « $ARS AR » dans
  // une page en arabe, en hébreu ou en persan (le symbole final est neutre, il prend la direction du paragraphe).
  // Le BOUTON, qui affiche la devise choisie en permanence, était resté sans attribut. Mesuré sur les 152 devises
  // des pays couverts : 84 étiquettes se réordonnent en page de droite à gauche.
  const { button, panel, dom } = loadCurrencySwitcher(['ARS', 'AUD', 'EUR', 'JPY']);
  void dom;
  const code = button.querySelector('.currency-toggle-code');
  assert.ok(code, 'le bouton n\'a pas de zone de texte .currency-toggle-code');
  // Au départ : « Auto », qui est traduit — il doit suivre la page, donc AUCUN dir imposé.
  assert.equal(code.getAttribute('dir'), null, '« Auto » est traduit : il ne doit pas être forcé en ltr');
  // Devise choisie : le code et son symbole sont du texte à sens fixe.
  button.fire('click');
  const options = panel.children[0].querySelectorAll('.currency-option');
  const ars = options.find(o => /ARS/.test(o.textContent));
  assert.ok(ars, 'option ARS absente : ' + options.map(o => o.textContent).join(' / '));
  ars.fire('click');
  assert.equal(code.getAttribute('dir'), 'ltr', 'devise choisie sans dir="ltr" sur le bouton');
  // Contre-épreuve : sans cet attribut, l'étiquette SE RÉORDONNE vraiment (le test ne serait pas vide de sens).
  const visuelRtl = visual(code.textContent, 'rtl');
  assert.notEqual(visuelRtl, code.textContent, 'étiquette « ' + code.textContent + ' » insensible au sens : choisir une devise qui l\'est');
  // Et retour à « Auto » : l'attribut est retiré, pas laissé en place.
  button.fire('click');
  const auto = panel.children[0].querySelectorAll('.currency-option')[0];
  auto.fire('click');
  assert.equal(code.getAttribute('dir'), null, 'dir="ltr" laissé sur « Auto »');
});

// ------------------------------------------------------------- 18e audit du 21/09/2026 : la page elle-même
// Trou trouvé par l'audit : coller une erreur de syntaxe à la fin de public/js/app.js laissait les 63 tests
// d'interface au vert. Ils n'exécutent que des fonctions EXTRAITES par leur texte (voir extract ci-dessus) et ne
// chargent jamais le fichier entier ; server.test.js, lui, se contente de vérifier que GET /js/app.js répond 200.
// Le script principal du site pouvait donc être inchargeable sans que rien ne bronche.

test('18e audit : les scripts du navigateur s\'analysent (aucune erreur de syntaxe)', () => {
  const mauvais = [];
  for(const f of ['app.js', 'i18n.js', 'theme.js', 'trip-data.js']){
    const src = fs.readFileSync(path.join(PUB, f), 'utf8');
    try { new vm.Script(src, { filename: f }); } catch(err){ mauvais.push(f + ' : ' + err.message); }
  }
  assert.deepEqual(mauvais, []);
});

test('18e audit : index.html charge bien les scripts, et tous les éléments lus par app.js existent', () => {
  const HTML = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  // 1. Les scripts de la page. Sans app.js, le site s'affiche et ne fait plus rien ; sans i18n.js, aucun texte.
  const manquants = ['js/i18n.js', 'js/theme.js', 'js/trip-data.js', 'js/app.js']
    .filter(src => HTML.indexOf('src="' + src) < 0 && HTML.indexOf("src='" + src) < 0);
  assert.deepEqual(manquants, [], 'script(s) absent(s) de index.html');

  // 2. Les identifiants d'éléments. app.js les lit par document.getElementById ; un identifiant renommé d'un seul
  // côté donne « null » au chargement et casse la page sans le moindre message.
  const idsHtml = new Set();
  for(const m of HTML.matchAll(/\bid=["']([^"']+)["']/g)) idsHtml.add(m[1]);
  const lus = new Set();
  for(const m of APP.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) lus.add(m[1]);
  assert.ok(lus.size > 50, 'trop peu d\'identifiants relevés dans app.js (' + lus.size + ') : le relevé ne marche plus');
  const absents = [...lus].filter(id => !idsHtml.has(id)).sort();
  assert.deepEqual(absents, [], 'identifiant(s) lus par app.js et absents de index.html');
});

test('18e audit : une suggestion de ville nomme son pays, pas seulement son drapeau', () => {
  // Le drapeau est une image décorative (alt="", aria-hidden) et le nom du pays n'était que dans « title » —
  // c'est-à-dire une DESCRIPTION, que les lecteurs d'écran ne lisent pas par défaut dans une liste et qui n'existe
  // pas au toucher. Une saisie « Lyon » annonçait cinq « Lyons » suivis d'un code postal, sans dire lequel est en
  // France, alors que le drapeau avait justement été ajouté pour distinguer les homonymes (18e audit du 21/09/2026).
  // renderSuggestions est exécutée pour de vrai dans un DOM factice : c'est le NOM ACCESSIBLE calculé qu'on lit,
  // c'est-à-dire le texte de l'option, pas la présence d'un attribut.
  const dom = fakeDom();
  const suggest = dom.el('ul'), city = dom.el('input');
  const ctx = {
    document: { createElement: dom.el },
    els: { citySuggest: suggest, city: city },
    currentSuggestions: null, activeSuggestIndex: -1,
    COUNTRIES: { FR: { name: 'France' }, US: { name: 'États-Unis' } },
    countryDisplayName: (cc, repli) => repli,          // pas d'Intl ici : le nom des données suffit
    formatCpBadge: r => r.cp,
    selectCommune: () => {}
  };
  ctx.window = { I18N: { country: () => 'FR', current: () => 'fr' } };
  const src = extract('renderSuggestions');
  vm.createContext(ctx);
  vm.runInContext('(' + src.trim().replace(/^function/, 'function') + ')', ctx); // contrôle de syntaxe
  vm.runInContext(src.trim() + '\nthis.renderSuggestions = renderSuggestions;', ctx);
  ctx.renderSuggestions([
    { name: 'Lyon', cp: '69001', allCps: ['69001'], country: 'FR', dept: '69', lat: 45.75, lon: 4.85, pop: 519127 },
    { name: 'Lyons', cp: '60534', allCps: ['60534'], country: 'US', dept: 'Illinois', lat: 41.81, lon: -87.81, pop: 10722 }
  ]);
  const texte = e => {
    let t = e.textContent || '';
    (e.children || []).forEach(c => { t += ' ' + texte(c); });
    return t.replace(/\s+/g, ' ').trim();
  };
  const options = suggest.children;
  assert.equal(options.length, 2, 'suggestions non construites');
  assert.ok(/France/.test(texte(options[0])), 'pays absent du nom de la première option : ' + JSON.stringify(texte(options[0])));
  assert.ok(/États-Unis/.test(texte(options[1])), 'pays absent du nom de la seconde option : ' + JSON.stringify(texte(options[1])));
  // Hors écran : le pays ne doit pas s'ajouter au texte VISIBLE.
  const cachés = options[0].querySelectorAll('.visually-hidden');
  assert.equal(cachés.length, 1, 'le nom du pays doit être dans un élément hors écran');
  assert.equal((cachés[0].textContent || '').trim(), 'France');
});

test('18e audit : la liste des devises se parcourt en tapant le code (153 options, aucun champ de recherche)', () => {
  // Le sélecteur de LANGUE a un champ de recherche pour ses 161 options ; celui des DEVISES en aligne 153 et n'avait
  // que les flèches — atteindre « ZAR » demandait environ 150 appuis sur Flèche bas. currencyTypeAheadIndex est la
  // fonction pure derrière la recherche au clavier : elle est exécutée telle qu'elle est écrite dans app.js.
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(extract('currencyTypeAheadIndex').replace(/^  /gm, '') + '\nthis.f = currencyTypeAheadIndex;', ctx);
  const f = ctx.f;
  // Liste réaliste : « Automatique » en tête, puis les codes suivis de leur symbole.
  const l = ['Automatique', 'EUR €', 'AUD $', 'CAD $', 'CHF CHF', 'CNY ¥', 'EGP £', 'EUR €', 'USD $', 'ZAR R'];
  assert.equal(f(l, 0, 'z'), 9, 'une lettre doit mener directement à ZAR');
  assert.equal(f(l, 0, 'ch'), 4, 'deux lettres : CHF');
  assert.equal(f(l, 0, 'c'), 3, 'une lettre depuis l\'option 0 : la PREMIÈRE option suivante en C (CAD)');
  assert.equal(f(l, 3, 'c'), 4, 'même lettre répétée : on passe à la suivante (CHF)');
  assert.equal(f(l, 4, 'c'), 5, 'puis CNY');
  assert.equal(f(l, 5, 'c'), 3, 'après la dernière, la recherche reboucle au début (CAD)');
  assert.equal(f(l, 4, 'chf'), 4, 'plusieurs lettres : on reste sur l\'option que la frappe désigne déjà');
  assert.equal(f(l, 0, 'xyz'), -1, 'aucune correspondance : aucun déplacement');
  assert.equal(f(l, 0, ''), -1, 'tampon vide : aucun déplacement');
  assert.equal(f(l, 0, 'Z'), 9, 'la casse est ignorée');
  assert.equal(f(l, 0, 'a'), 2, 'AUD, et non « Automatique » : la recherche part de l\'option SUIVANTE');
  assert.equal(f(l, 2, 'a'), 0, 'depuis AUD, la lettre a ramène à « Automatique »');
});

test('19e audit : la recherche au clavier des devises est BRANCHÉE, et une lettre répétée défile', () => {
  // Le test du 18e audit n'éprouvait que la fonction pure, avec un tampon déjà remis à zéro — un état que l'appelant
  // ne produit jamais. Démontré au 19e : débrancher la recherche (cible = -1) laissait les 48 tests d'interface au
  // vert, et la lettre répétée ne défilait pas puisque le tampon était concaténé (« cc » ne préfixe rien). Ici, ce
  // sont de VRAIS événements clavier sur la liste montée par buildCurrencySwitcher.
  const { button, panel, dom } = loadCurrencySwitcher(['CAD', 'CHF', 'CNY', 'EUR', 'JPY']);
  const list = panel.children[0];
  button.fire('click');
  const nom = () => (dom.activeElement && dom.activeElement.textContent) || '';
  const codes = list.querySelectorAll('.currency-option').slice(1).map(o => o.textContent.split(' ')[0]);
  assert.deepEqual(codes, ['EUR', 'CAD', 'CHF', 'CNY', 'JPY'], 'ordre attendu : devise de la langue puis alphabétique');
  list.fire('keydown', { key: 'j' });
  assert.ok(/^JPY/.test(nom()), 'une lettre ne mène pas à la devise : ' + nom());
  // Lettre RÉPÉTÉE : on défile parmi les trois devises en C, sans attendre une seconde entre deux frappes.
  list.fire('keydown', { key: 'c' });
  assert.ok(/^CAD/.test(nom()), 'c -> CAD, obtenu ' + nom());
  list.fire('keydown', { key: 'c' });
  assert.ok(/^CHF/.test(nom()), 'c répété -> CHF (c\'est le défaut corrigé au 19e audit), obtenu ' + nom());
  list.fire('keydown', { key: 'c' });
  assert.ok(/^CNY/.test(nom()), 'c répété -> CNY, obtenu ' + nom());
  list.fire('keydown', { key: 'c' });
  assert.ok(/^CAD/.test(nom()), 'après la dernière, la recherche reboucle, obtenu ' + nom());
  // Deux lettres enchaînées forment bien un préfixe (comportement usuel d'une listbox).
  list.fire('keydown', { key: 'c' });
  list.fire('keydown', { key: 'n' });
  assert.ok(/^CNY/.test(nom()), 'cn -> CNY, obtenu ' + nom());
  // Une lettre sans correspondance ne déplace rien.
  const avant = nom();
  list.fire('keydown', { key: 'z' });
  assert.equal(nom(), avant, 'une lettre sans correspondance ne doit pas déplacer le focus');
});

test('19e audit : chaque nom de langue porte sa langue et son sens d\'écriture', () => {
  // La page porte la langue du VISITEUR : sans lang sur chaque nom, un lecteur d'écran prononce « 日本語 » et
  // « ქართული » avec la voix française. Et sans dir, « K'iche' » s'affiche « 'K'iche » dans une page en arabe.
  const { button, panel } = loadLangSwitcher();
  button.fire('click');
  const list = panel.children.find(c => c.className === 'lang-option-list');
  assert.ok(list, 'liste des langues introuvable dans le panneau');
  const options = list.querySelectorAll('.lang-option');
  assert.ok(options.length > 100, 'liste des langues non montée (' + options.length + ')');
  const sansLang = [], sansDir = [], mauvaisDir = [];
  const RTL = ['ar', 'fa', 'ckb', 'ur', 'dv'];
  options.forEach(o => {
    const nom = (o.querySelectorAll('.lang-option-name') || [])[0];
    if(!nom) return;
    const code = o.getAttribute('data-lang');
    if(nom.getAttribute('lang') !== code) sansLang.push(code);
    const dir = nom.getAttribute('dir');
    if(!dir) sansDir.push(code);
    else if(dir !== (RTL.indexOf(code) >= 0 ? 'rtl' : 'ltr')) mauvaisDir.push(code + '=' + dir);
  });
  assert.deepEqual(sansLang.slice(0, 8), [], 'nom de langue sans attribut lang');
  assert.deepEqual(sansDir.slice(0, 8), [], 'nom de langue sans attribut dir');
  assert.deepEqual(mauvaisDir.slice(0, 8), [], 'sens d\'écriture faux');
});

test('23/09/2026 : un lieu-dit affiche la commune qui le porte, et ne se répète pas', () => {
  // « Belzaises » ne dit pas où il est ; « Belzaises · Saint-Sulpice-sur-Risle » si. Les trois fiches ci-dessous sont
  // prises dans les données réellement publiées (Orne et Corse-du-Sud), et non inventées. Le rattachement n'a
  // d'intérêt que s'il ARRIVE À L'ÉCRAN : renderSuggestions est donc exécutée pour de vrai, comme au 18e audit, et
  // c'est le texte de l'option qu'on lit. Trois cas dans le même rendu : un lieu-dit rattaché (la commune s'affiche),
  // une commune (aucune commune de rattachement, rien ne s'ajoute), et un lieu dont la commune porte SON nom — se
  // répéter « Alata · Alata » n'apprendrait rien, donc rien ne s'affiche.
  const dom = fakeDom();
  const suggest = dom.el('ul'), city = dom.el('input');
  const ctx = {
    document: { createElement: dom.el },
    els: { citySuggest: suggest, city: city },
    currentSuggestions: null, activeSuggestIndex: -1,
    COUNTRIES: { FR: { name: 'France' } },
    countryDisplayName: (cc, repli) => repli,
    formatCpBadge: r => r.cp,
    selectCommune: () => {}
  };
  ctx.window = { I18N: { country: () => 'FR', current: () => 'fr' } };
  const src = extract('renderSuggestions');
  vm.createContext(ctx);
  vm.runInContext(src.trim() + '\nthis.renderSuggestions = renderSuggestions;', ctx);
  ctx.renderSuggestions([
    { name: 'Belzaises', cp: '61300', allCps: ['61300'], country: 'FR', dept: '61', lat: 48.7710, lon: 0.6714, pop: 0, commune: 'Saint-Sulpice-sur-Risle' },
    { name: 'Saint-Sulpice-sur-Risle', cp: '61300', allCps: ['61300'], country: 'FR', dept: '61', lat: 48.7594, lon: 0.6386, pop: 1755, commune: null },
    { name: 'Alata', cp: '20167', allCps: ['20167'], country: 'FR', dept: '2A', lat: 42.0, lon: 8.76, pop: 800, commune: 'Alata' }
  ]);
  const visible = e => {
    let t = (e.className === 'visually-hidden') ? '' : (e.textContent || '');
    (e.children || []).forEach(c => { t += (visible(c) ? ' ' + visible(c) : ''); });
    return t.replace(/\s+/g, ' ').trim();
  };
  const options = suggest.children;
  assert.equal(options.length, 3, 'suggestions non construites');
  assert.ok(/Belzaises.*·.*Saint-Sulpice-sur-Risle/.test(visible(options[0])),
    'commune de rattachement absente : ' + JSON.stringify(visible(options[0])));
  assert.ok(!/·/.test(visible(options[1])), 'une commune ne se rattache à rien : ' + JSON.stringify(visible(options[1])));
  assert.ok(!/·/.test(visible(options[2])), 'un lieu dont la commune porte son nom ne doit pas se répéter : ' + JSON.stringify(visible(options[2])));
});
